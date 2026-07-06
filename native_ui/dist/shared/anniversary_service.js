"use strict";
// ============================================================
// 纪念日插件 - Service 层
// Copyright (c) 2026 奶油话梅糖 <nyanon@vip.qq.com> (MIT)
// 包含日期计算（含闰年 2-29 支持）和 CRUD 操作。
// 逻辑与单文件基础版 AnniversaryPlugin.js 完全一致，
// 确保两个版本行为一致、数据兼容。
// 本文件含作者水印哨兵 _G_S::anniv::*，删除后完整性校验失败。
// ============================================================
// _G_S::anniv::auth::1 — 作者水印哨兵
// _G_S::anniv::orig::2 — 来源水印哨兵
// _G_S::anniv::fingerprint::3 — 指纹水印哨兵

var storage = require("./anniversary_storage.js");
var guard = require("./_guard.js");
var loadAnniversaries = storage.loadAnniversaries;
var saveAnniversaries = storage.saveAnniversaries;
var getTodayYMDInShanghai = storage.getTodayYMDInShanghai;
var nowIsoShanghai = storage.nowIsoShanghai;
var genId = storage.genId;

// ============================================================
// 错误码与错误构造
// ============================================================
var ErrorCode = {
    INVALID_DATE: "INVALID_DATE",
    INVALID_TITLE: "INVALID_TITLE",
    NOT_FOUND: "NOT_FOUND",
    DUPLICATE_TITLE: "DUPLICATE_TITLE",
    STORAGE_READ_FAILED: "STORAGE_READ_FAILED",
    STORAGE_WRITE_FAILED: "STORAGE_WRITE_FAILED",
    UNSUPPORTED_LEAP_DAY: "UNSUPPORTED_LEAP_DAY",
    INVALID_ARGUMENT: "INVALID_ARGUMENT",
    MULTIPLE_MATCHES: "MULTIPLE_MATCHES",
    UNKNOWN_ERROR: "UNKNOWN_ERROR"
};

function bizError(code, message, extra) {
    var err = new Error(message);
    err.code = code;
    if (extra) {
        if (extra.matches) err.matches = extra.matches;
        if (extra.details) err.details = extra.details;
    }
    return err;
}

// ============================================================
// 日期计算辅助
// ============================================================
function pad2(n) {
    return (n < 10 ? "0" : "") + n;
}

function isLeapYear(y) {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

function parseYMD(date) {
    var parts = String(date).split("-");
    return { y: Number(parts[0]), m: Number(parts[1]), d: Number(parts[2]) };
}

// 校验纪念日日期：返回 { valid }
// 支持闰年 2 月 29 日；平年 2 月 29 日为非法日期（非真实日历日期）
function isValidYMD(date) {
    if (typeof date !== "string") return { valid: false };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { valid: false };
    var p = parseYMD(date);
    var y = p.y, m = p.m, d = p.d;
    if (isNaN(y) || isNaN(m) || isNaN(d)) return { valid: false };
    if (m < 1 || m > 12) return { valid: false };
    var daysInMonth = [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (d < 1 || d > daysInMonth[m - 1]) return { valid: false };
    return { valid: true };
}

// 校验真实日历日期（允许闰年 2-29），用于 today 参数
function isValidCalendarDate(date) {
    if (typeof date !== "string") return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    var p = parseYMD(date);
    var y = p.y, m = p.m, d = p.d;
    if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
    if (m < 1 || m > 12) return false;
    var daysInMonth = [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (d < 1 || d > daysInMonth[m - 1]) return false;
    return true;
}

// 本地午夜 Date，避免 UTC 偏移
function toLocalDate(date) {
    var p = parseYMD(date);
    return new Date(p.y, p.m - 1, p.d, 0, 0, 0, 0);
}

// 天数差：diffDays(from, to) = to - from（以天为单位）
function diffDays(fromDate, toDate) {
    var from = toLocalDate(fromDate);
    var to = toLocalDate(toDate);
    return Math.round((to.getTime() - from.getTime()) / 86400000);
}

// 构造纪念日 baseDate 在指定年份 year 的周年日期字符串
// 闰日（2-29）纪念日在平年回退到 2-28（避免 JS Date 自动溢出到 3-01）
function anniversaryDateInYear(base, year) {
    if (base.m === 2 && base.d === 29 && !isLeapYear(year)) {
        return year + "-02-28";
    }
    return year + "-" + pad2(base.m) + "-" + pad2(base.d);
}

// 下一次周年纪念日日期
// 规则：若 today <= 今年纪念日 → 当年纪念日；否则 → 明年纪念日
function nextOccurrence(baseDate, today) {
    var b = parseYMD(baseDate);
    var t = parseYMD(today);
    var thisYearAnniv = anniversaryDateInYear(b, t.y);
    if (diffDays(thisYearAnniv, today) <= 0) {
        return thisYearAnniv;
    }
    return anniversaryDateInYear(b, t.y + 1);
}

// 纪念日状态计算
function getAnniversaryStatus(baseDate, today) {
    var daysSince = diffDays(baseDate, today);
    var nextDate = nextOccurrence(baseDate, today);
    var daysUntilNext = diffDays(today, nextDate);
    var isToday = (nextDate === today);
    return { daysSince: daysSince, nextDate: nextDate, daysUntilNext: daysUntilNext, isToday: isToday };
}

// ============================================================
// 校验辅助
// ============================================================
var VALID_OWNERS = ["user", "assistant", "shared"];
var VALID_MODES = ["count_up", "count_down", "both"];

function validateAnniversaryDate(date) {
    var check = isValidYMD(date);
    if (!check.valid) {
        throw bizError(ErrorCode.INVALID_DATE, "日期格式无效，请使用 YYYY-MM-DD");
    }
}

function validateToday(date) {
    if (!isValidCalendarDate(date)) {
        throw bizError(ErrorCode.INVALID_DATE, "today 日期格式无效，请使用 YYYY-MM-DD");
    }
}

function resolveToday(today) {
    if (today) {
        validateToday(today);
        return today;
    }
    return getTodayYMDInShanghai();
}

// ============================================================
// CRUD 操作
// ============================================================

// 创建纪念日
async function createAnniversary(params) {
    var title = params && params.title;
    var date = params && params.date;

    if (!title || typeof title !== "string" || !title.trim()) {
        throw bizError(ErrorCode.INVALID_TITLE, "title 必填且不能为空");
    }
    title = title.trim();

    if (!date) {
        throw bizError(ErrorCode.INVALID_DATE, "date 必填，格式 YYYY-MM-DD");
    }
    validateAnniversaryDate(date);

    var owner = (params.owner && VALID_OWNERS.indexOf(params.owner) !== -1) ? params.owner : "user";
    var mode = (params.mode && VALID_MODES.indexOf(params.mode) !== -1) ? params.mode : "both";
    var sendToContext = (typeof params.sendToContext === "boolean") ? params.sendToContext : false;
    var description = (params.description != null) ? String(params.description) : "";

    var now = nowIsoShanghai();
    var item = {
        id: genId(),
        title: title,
        date: date,
        calendarType: "solar",
        mode: mode,
        owner: owner,
        description: description,
        sendToContext: sendToContext,
        reminderEnabled: false,
        reminderDaysBefore: [],
        deleted: false,
        createdAt: now,
        updatedAt: now
    };
    // _G_S::anniv::fingerprint::3 — 盖作者数据指纹（取证证据）
    guard.stampAuthorFingerprint(item);

    var items = await loadAnniversaries();
    items.push(item);
    await saveAnniversaries(items);

    return item;
}

// 更新纪念日（部分更新，仅更新传入的字段）
async function updateAnniversary(params) {
    var id = params && params.id;
    if (!id || !String(id).trim()) {
        throw bizError(ErrorCode.INVALID_ARGUMENT, "id 必填");
    }
    var idTrim = String(id).trim();

    var items = await loadAnniversaries();
    var index = -1;
    for (var i = 0; i < items.length; i++) {
        if (items[i].id === idTrim && !items[i].deleted) {
            index = i;
            break;
        }
    }
    if (index === -1) {
        throw bizError(ErrorCode.NOT_FOUND, "未找到对应的纪念日");
    }

    var item = items[index];
    if (params.title != null) {
        var titleTrim = String(params.title).trim();
        if (!titleTrim) {
            throw bizError(ErrorCode.INVALID_TITLE, "title 不能为空");
        }
        item.title = titleTrim;
    }
    if (params.date != null) {
        validateAnniversaryDate(params.date);
        item.date = params.date;
    }
    if (params.owner != null && VALID_OWNERS.indexOf(params.owner) !== -1) {
        item.owner = params.owner;
    }
    if (params.mode != null && VALID_MODES.indexOf(params.mode) !== -1) {
        item.mode = params.mode;
    }
    if (params.description != null) {
        item.description = String(params.description);
    }
    if (typeof params.sendToContext === "boolean") {
        item.sendToContext = params.sendToContext;
    }

    item.updatedAt = nowIsoShanghai();
    items[index] = item;
    await saveAnniversaries(items);
    return item;
}

// 列出纪念日
async function listAnniversaries(params) {
    var includeDeleted = (params && typeof params.includeDeleted === "boolean") ? params.includeDeleted : false;
    var items = await loadAnniversaries();
    var visible = includeDeleted ? items : items.filter(function (it) { return !it.deleted; });
    return visible;
}

// 获取单个纪念日详情
async function getAnniversary(id) {
    var idTrim = String(id || "").trim();
    if (!idTrim) {
        throw bizError(ErrorCode.INVALID_ARGUMENT, "id 必填");
    }
    var items = await loadAnniversaries();
    for (var i = 0; i < items.length; i++) {
        if (items[i].id === idTrim && !items[i].deleted) {
            return items[i];
        }
    }
    throw bizError(ErrorCode.NOT_FOUND, "未找到对应的纪念日");
}

// 切换上下文发送开关
async function toggleContext(id, enabled) {
    var idTrim = String(id || "").trim();
    if (!idTrim) {
        throw bizError(ErrorCode.INVALID_ARGUMENT, "id 必填");
    }
    if (typeof enabled !== "boolean") {
        throw bizError(ErrorCode.INVALID_ARGUMENT, "enabled 必须为布尔值");
    }

    var items = await loadAnniversaries();
    var found = false;
    var updatedItem = null;
    for (var i = 0; i < items.length; i++) {
        if (items[i].id === idTrim && !items[i].deleted) {
            items[i].sendToContext = enabled;
            items[i].updatedAt = nowIsoShanghai();
            found = true;
            updatedItem = items[i];
            break;
        }
    }
    if (!found) {
        throw bizError(ErrorCode.NOT_FOUND, "未找到对应的纪念日");
    }
    await saveAnniversaries(items);
    return updatedItem;
}

// 软删除纪念日
async function deleteAnniversary(id) {
    var idTrim = String(id || "").trim();
    if (!idTrim) {
        throw bizError(ErrorCode.INVALID_ARGUMENT, "id 必填");
    }
    var items = await loadAnniversaries();
    var found = false;
    var removed = null;
    var now = nowIsoShanghai();
    for (var i = 0; i < items.length; i++) {
        if (items[i].id === idTrim && !items[i].deleted) {
            items[i].deleted = true;
            items[i].deletedAt = now;
            items[i].updatedAt = now;
            found = true;
            removed = items[i];
            break;
        }
    }
    if (!found) {
        throw bizError(ErrorCode.NOT_FOUND, "未找到对应的纪念日");
    }
    await saveAnniversaries(items);
    return removed;
}

// 查询纪念日状态（供 UI 和工具共用）
async function getStatusById(id, today) {
    var idTrim = String(id || "").trim();
    if (!idTrim) {
        throw bizError(ErrorCode.INVALID_ARGUMENT, "id 必填");
    }
    var todayYMD = resolveToday(today);
    var item = await getAnniversary(idTrim);
    var status = getAnniversaryStatus(item.date, todayYMD);
    return { item: item, status: status, todayYMD: todayYMD };
}

// ============================================================
// 上下文自动注入
// ============================================================

// 纯函数：根据 item.mode 与 status 生成自然语言摘要片段数组
function formatContextSummary(item, status) {
    var title = item.title;
    var mode = item.mode || "both";
    var parts = [];

    if (status.isToday) {
        parts.push("今天是「" + title + "」的纪念日");
    }
    if ((mode === "count_up" || mode === "both") && status.daysSince > 0) {
        parts.push("「" + title + "」已过去 " + status.daysSince + " 天");
    }
    if ((mode === "count_down" || mode === "both") && status.daysUntilNext > 0) {
        parts.push("距离下一次「" + title + "」(" + status.nextDate + ") 还有 " + status.daysUntilNext + " 天");
    }
    return parts;
}

// 读取全部「发送开关已开启」的纪念日，拼接成注入文本
async function buildContextInjection(todayYMD) {
    var items = await loadAnniversaries();
    var contextItems = items.filter(function (it) {
        return !it.deleted && it.sendToContext === true;
    });
    if (contextItems.length === 0) {
        return "";
    }
    var allParts = [];
    for (var i = 0; i < contextItems.length; i++) {
        var it = contextItems[i];
        var status = getAnniversaryStatus(it.date, todayYMD);
        var parts = formatContextSummary(it, status);
        for (var j = 0; j < parts.length; j++) {
            allParts.push(parts[j]);
        }
    }
    if (allParts.length === 0) {
        return "";
    }
    return "【纪念日提醒】今天是 " + todayYMD + "。" + allParts.join("；") + "。";
}

// Operit 系统提示词组装钩子
// _G_S::anniv::orig::2 — 钩子含完整性校验
async function systemPromptHook(event) {
    var stage = (event && (event.eventName || event.event)) || "";
    if (stage !== "after_compose_system_prompt") {
        return null;
    }
    // 完整性校验：水印被篡改则不注入（静默降级，不阻断对话）
    var guardCheck = guard.verifyIntegrity(null);
    if (!guardCheck.ok) {
        return null;
    }
    try {
        var todayYMD = getTodayYMDInShanghai();
        var injection = await buildContextInjection(todayYMD);
        if (!injection) {
            return null;
        }
        var currentPrompt = (event && event.eventPayload && event.eventPayload.systemPrompt) || "";
        return { systemPrompt: currentPrompt + "\n\n" + injection };
    } catch (e) {
        return null;
    }
}

// 完整性防护导出
exports.guard = guard;

exports.ErrorCode = ErrorCode;
exports.bizError = bizError;
exports.isLeapYear = isLeapYear;
exports.isValidYMD = isValidYMD;
exports.isValidCalendarDate = isValidCalendarDate;
exports.getAnniversaryStatus = getAnniversaryStatus;
exports.formatContextSummary = formatContextSummary;
exports.buildContextInjection = buildContextInjection;
exports.systemPromptHook = systemPromptHook;
exports.resolveToday = resolveToday;
exports.createAnniversary = createAnniversary;
exports.updateAnniversary = updateAnniversary;
exports.listAnniversaries = listAnniversaries;
exports.getAnniversary = getAnniversary;
exports.toggleContext = toggleContext;
exports.deleteAnniversary = deleteAnniversary;
exports.getStatusById = getStatusById;
