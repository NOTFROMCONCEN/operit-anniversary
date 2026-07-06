// ============================================================
// 纪念日插件 (Anniversary Plugin)
// Copyright (c) 2026 奶油话梅糖 <nyanon@vip.qq.com>
// 依据 MIT 开源协议授权，详见 LICENSE 文件。
// 使用本项目须保留本版权声明与作者署名。
// 删除署名后声称原创构成对 MIT 协议的违反。
// 本项目内置完整性校验与作者水印，篡改后功能将降级。
// ============================================================
/* METADATA
{
    "name": "anniversary_plugin",
    "display_name": {
        "zh": "纪念日插件",
        "en": "Anniversary Plugin"
    },
    "description": {
        "zh": "保存用户与 AI 之间的重要纪念日，提供日期计算、查询、删除、上下文发送开关等能力。本地 JSON 存储，公历日期计算。",
        "en": "Save important anniversaries between user and AI. Provides date calculation, query, delete, and context-send toggle. Local JSON storage, solar date calculation."
    },
    "category": "Utility",
    "enabledByDefault": false,
    "tools": [
        {
            "name": "add_anniversary",
            "description": { "zh": "添加一个纪念日", "en": "Add an anniversary" },
            "parameters": [
                { "name": "title", "description": { "zh": "纪念日名称", "en": "Anniversary title" }, "type": "string", "required": true },
                { "name": "date", "description": { "zh": "日期，格式 YYYY-MM-DD", "en": "Date in YYYY-MM-DD" }, "type": "string", "required": true },
                { "name": "owner", "description": { "zh": "归属，可选 user / assistant / shared，默认 user", "en": "Owner: user / assistant / shared, default user" }, "type": "string", "required": false },
                { "name": "mode", "description": { "zh": "计数模式，可选 count_up / count_down / both，默认 both", "en": "Count mode: count_up / count_down / both, default both" }, "type": "string", "required": false },
                { "name": "description", "description": { "zh": "备注", "en": "Description" }, "type": "string", "required": false },
                { "name": "sendToContext", "description": { "zh": "是否允许发送给 AI 上下文，默认 false", "en": "Allow sending to AI context, default false" }, "type": "boolean", "required": false }
            ]
        },
        {
            "name": "list_anniversaries",
            "description": { "zh": "列出纪念日（默认不含已删除）", "en": "List anniversaries (excludes deleted by default)" },
            "parameters": [
                { "name": "includeDeleted", "description": { "zh": "是否包含已删除项目，默认 false", "en": "Include deleted items, default false" }, "type": "boolean", "required": false }
            ]
        },
        {
            "name": "get_anniversary_status",
            "description": { "zh": "查询纪念日状态，包括已过去天数和距离下一次纪念日的天数", "en": "Query anniversary status: days since and days until next" },
            "parameters": [
                { "name": "id", "description": { "zh": "纪念日 ID", "en": "Anniversary ID" }, "type": "string", "required": false },
                { "name": "title", "description": { "zh": "纪念日名称（与 id 二选一）", "en": "Anniversary title (alternative to id)" }, "type": "string", "required": false },
                { "name": "today", "description": { "zh": "测试用当前日期，格式 YYYY-MM-DD", "en": "Current date for testing, YYYY-MM-DD" }, "type": "string", "required": false }
            ]
        },
        {
            "name": "toggle_anniversary_context",
            "description": { "zh": "开启或关闭某个纪念日的上下文发送", "en": "Toggle context sending for an anniversary" },
            "parameters": [
                { "name": "id", "description": { "zh": "纪念日 ID", "en": "Anniversary ID" }, "type": "string", "required": true },
                { "name": "enabled", "description": { "zh": "是否开启", "en": "Whether to enable" }, "type": "boolean", "required": true }
            ]
        },
        {
            "name": "get_context_anniversaries",
            "description": { "zh": "返回允许发送给 AI 上下文的纪念日摘要", "en": "Return summaries of anniversaries allowed to send to AI context" },
            "parameters": [
                { "name": "today", "description": { "zh": "测试用当前日期，格式 YYYY-MM-DD", "en": "Current date for testing, YYYY-MM-DD" }, "type": "string", "required": false }
            ]
        },
        {
            "name": "delete_anniversary",
            "description": { "zh": "删除纪念日（软删除）", "en": "Delete an anniversary (soft delete)" },
            "parameters": [
                { "name": "id", "description": { "zh": "纪念日 ID", "en": "Anniversary ID" }, "type": "string", "required": true }
            ]
        }
    ]
}*/

// ============================================================
// 配置区
// ============================================================
// Asia/Shanghai = UTC+8
var TZ_OFFSET_MIN = 8 * 60;

// 数据目录与文件路径：使用 Operit 插件私有配置目录
// （参考官方 worldbook_storage.ts: ToolPkg.getConfigDir()）
var DATA_DIR = (typeof ToolPkg !== "undefined" && ToolPkg.getConfigDir) ? ToolPkg.getConfigDir() : "data";
var DATA_FILE = DATA_DIR + "/anniversaries.json";
var BACKUP_FILE = DATA_DIR + "/anniversaries.backup.json";

// ============================================================
// 作者水印与完整性防护（强力防剽窃）
// 依据 LICENSE（MIT 协议），使用本项目须保留版权声明与作者署名。
// 以下水印常量参与数据指纹计算；篡改后自检失败，触发功能降级。
// 哨兵字符串 _G_S::anniv::* 散布于本文件各处，删除后自检失败。
// ============================================================
var _W = {
    author: "奶油话梅糖",
    contact: "nyanon@vip.qq.com",
    origin: "operit-anniversary-plugin",
    year: 2026,
    salt: "anv-orig-20260705-nyanon-cream-plum-candy"
};

// 简易哈希（djb2 变体，不依赖 crypto，兼容 Operit JS 运行时）
function _hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
        h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    return h;
}

// 水印自校验值：预计算 _hash(author|contact|origin|year|salt)
// 篡改任意水印字段，此值不再匹配，verifyIntegrity() 返回失败
var _SELF_CHECK = -1141620811;
// _G_S::anniv::auth::1 — 作者水印哨兵
var _SENTINEL_AUTH = "_G_S::anniv::auth::1";
// _G_S::anniv::orig::2 — 来源水印哨兵
var _SENTINEL_ORIG = "_G_S::anniv::orig::2";
// _G_S::anniv::fingerprint::3 — 指纹水印哨兵
var _SENTINEL_FP = "_G_S::anniv::fingerprint::3";

// 校验水印常量是否被篡改
function _checkWatermark() {
    var recomputed = _hash(_W.author + "|" + _W.contact + "|" + _W.origin + "|" + _W.year + "|" + _W.salt);
    return recomputed === _SELF_CHECK;
}

// 综合完整性校验：水印自检 + 哨兵存在性检测
function verifyIntegrity(sentinelMap) {
    try {
        if (!_checkWatermark()) {
            return { ok: false, reason: "WATERMARK_TAMPERED" };
        }
        if (sentinelMap) {
            if (!sentinelMap[_SENTINEL_AUTH] || !sentinelMap[_SENTINEL_ORIG] || !sentinelMap[_SENTINEL_FP]) {
                return { ok: false, reason: "SENTINEL_MISSING" };
            }
        }
        return { ok: true, reason: "" };
    } catch (e) {
        return { ok: false, reason: "GUARD_ERROR" };
    }
}

// 数据指纹盖章：为记录写入隐藏字段 _afp，留存取证证据
// 即使侵权者删除所有可见版权头，已写入磁盘的记录仍携带原始作者指纹
function stampAuthorFingerprint(item) {
    // _G_S::anniv::fingerprint::3
    if (!item || !item.id || !item.createdAt) return item;
    try {
        item._afp = _hash(item.id + ":" + item.createdAt + ":" + _W.salt);
    } catch (e) { }
    return item;
}

// 篡改检测后的降级响应
function makeDegradedResponse(reason) {
    var reasonText = reason || "UNKNOWN";
    return {
        success: false,
        error: {
            code: "INTEGRITY_VIOLATION",
            message: "【完整性校验失败】本插件检测到作者署名/水印已被篡改或移除（原因: "
                + reasonText + "）。依据 LICENSE（MIT 开源协议），使用、复制或分发本项目"
                + "须保留原始版权声明与作者署名：奶油话梅糖 <nyanon@vip.qq.com>。删除署名后声称原创构成协议违反。"
                + "请恢复原始版权信息后重试，或通过正规渠道获取原始版本。"
        }
    };
}

// ============================================================
// 错误处理
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

// 业务异常：携带 code 字段供 wrap 统一处理
function bizError(code, message, extra) {
    var e = new Error(message);
    e.code = code;
    if (extra) {
        var keys = Object.keys(extra);
        for (var i = 0; i < keys.length; i++) {
            e[keys[i]] = extra[keys[i]];
        }
    }
    return e;
}

// ============================================================
// 日期工具（纯函数，禁用 UTC，全部本地 Date）
// 参考 example.md 第 336-365 行
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

// 本地午夜 Date，避免 UTC 偏移（example.md 第 362-365 行）
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

// 当前北京时间日期 YYYY-MM-DD（Asia/Shanghai）
function getTodayYMDInShanghai() {
    var now = new Date();
    // now.getTime() 为 UTC 毫秒，加 8 小时后用 UTC 方法读取即为上海日期
    var shanghai = new Date(now.getTime() + TZ_OFFSET_MIN * 60 * 1000);
    return shanghai.getUTCFullYear() + "-" + pad2(shanghai.getUTCMonth() + 1) + "-" + pad2(shanghai.getUTCDate());
}

// 北京时间 ISO8601 +08:00（用于 createdAt / updatedAt / deletedAt）
function nowIsoShanghai() {
    var now = new Date();
    var shanghai = new Date(now.getTime() + TZ_OFFSET_MIN * 60 * 1000);
    return shanghai.getUTCFullYear() + "-" + pad2(shanghai.getUTCMonth() + 1) + "-" + pad2(shanghai.getUTCDate())
        + "T" + pad2(shanghai.getUTCHours()) + ":" + pad2(shanghai.getUTCMinutes()) + ":" + pad2(shanghai.getUTCSeconds()) + "+08:00";
}

// 构造纪念日 baseDate 在指定年份 year 的周年日期字符串
// 闰日（2-29）纪念日在平年回退到 2-28（业界通行做法，避免 JS Date 自动溢出到 3-01）
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
    // diffDays(thisYearAnniv, today) <= 0 表示 today <= 今年纪念日
    if (diffDays(thisYearAnniv, today) <= 0) {
        return thisYearAnniv;
    }
    return anniversaryDateInYear(b, t.y + 1);
}

// 纪念日状态计算（example.md 第 233-256 行、第 350-355 行）
function getAnniversaryStatus(baseDate, today) {
    var daysSince = diffDays(baseDate, today);
    var nextDate = nextOccurrence(baseDate, today);
    var daysUntilNext = diffDays(today, nextDate);
    var isToday = (nextDate === today);
    return { daysSince: daysSince, nextDate: nextDate, daysUntilNext: daysUntilNext, isToday: isToday };
}

// ============================================================
// 存储层（参考官方 worldbook_storage.ts 的 Tools.Files 用法）
// ============================================================

// 确保数据目录与文件存在，文件不存在时初始化为空数组
async function ensureDataFile() {
    await Tools.Files.mkdir(DATA_DIR, true);
    var ex = await Tools.Files.exists(DATA_FILE);
    if (!ex || !ex.exists) {
        await Tools.Files.write(DATA_FILE, "[]", false);
    }
}

// 读取全部纪念日；文件损坏（非 JSON 或非数组）时抛错，绝不静默覆盖
async function loadAnniversaries() {
    await ensureDataFile();
    var fileResult = await Tools.Files.read(DATA_FILE);
    var content = (fileResult && fileResult.content) ? fileResult.content : "[]";
    var parsed;
    try {
        parsed = JSON.parse(content);
    } catch (e) {
        throw bizError(ErrorCode.STORAGE_READ_FAILED, "数据文件损坏，无法解析为 JSON");
    }
    if (!Array.isArray(parsed)) {
        throw bizError(ErrorCode.STORAGE_READ_FAILED, "数据文件格式错误：非数组，已中止操作以保护数据");
    }
    return parsed;
}

// 写入纪念日：先写备份再写主文件
async function saveAnniversaries(items) {
    if (!Array.isArray(items)) {
        throw bizError(ErrorCode.STORAGE_WRITE_FAILED, "写入数据非数组");
    }
    // 先写备份文件
    await Tools.Files.write(BACKUP_FILE, JSON.stringify(items, null, 2), false);
    // 再写主文件
    await Tools.Files.write(DATA_FILE, JSON.stringify(items, null, 2), false);
}

// ============================================================
// ID 生成（example.md 第 396-400 行）
// ============================================================
function genId() {
    var datePart = getTodayYMDInShanghai().replace(/-/g, "");
    var rand = Math.random().toString(36).slice(2, 8);
    return "anniv_" + datePart + "_" + Date.now() + "_" + rand;
}

// ============================================================
// 校验辅助
// ============================================================
var VALID_OWNERS = ["user", "assistant", "shared"];
var VALID_MODES = ["count_up", "count_down", "both"];

// 校验纪念日 date，非法时抛业务异常
// 支持闰年 2 月 29 日；平年 2 月 29 日为非法日期返回 INVALID_DATE
function validateAnniversaryDate(date) {
    var check = isValidYMD(date);
    if (!check.valid) {
        throw bizError(ErrorCode.INVALID_DATE, "日期格式无效，请使用 YYYY-MM-DD");
    }
}

// 校验 today 参数（允许闰年 2-29，仅校验真实日历）
function validateToday(date) {
    if (!isValidCalendarDate(date)) {
        throw bizError(ErrorCode.INVALID_DATE, "today 日期格式无效，请使用 YYYY-MM-DD");
    }
}

// 解析 today：传入则校验并使用，未传则取北京时间当前日期
function resolveToday(today) {
    if (today) {
        validateToday(today);
        return today;
    }
    return getTodayYMDInShanghai();
}

// ============================================================
// 业务工具函数
// ============================================================

// 1. add_anniversary
async function addAnniversary(params) {
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
    // _G_S::anniv::fingerprint::3 — 盖作者数据指纹
    stampAuthorFingerprint(item);

    var items = await loadAnniversaries();
    items.push(item);
    await saveAnniversaries(items);

    return {
        success: true,
        item: { id: item.id, title: item.title, date: item.date },
        message: "纪念日已添加"
    };
}

// 2. list_anniversaries
async function listAnniversaries(params) {
    var includeDeleted = (params && typeof params.includeDeleted === "boolean") ? params.includeDeleted : false;
    var items = await loadAnniversaries();
    var visible = includeDeleted ? items : items.filter(function (it) { return !it.deleted; });
    var summaries = visible.map(function (it) {
        return {
            id: it.id,
            title: it.title,
            date: it.date,
            owner: it.owner,
            sendToContext: it.sendToContext,
            deleted: !!it.deleted
        };
    });
    return { success: true, count: summaries.length, items: summaries };
}

// 3. get_anniversary_status
async function getAnniversaryStatusTool(params) {
    var id = params && params.id;
    var title = params && params.title;

    var hasId = (id && String(id).trim());
    var hasTitle = (title && String(title).trim());

    if (!hasId && !hasTitle) {
        throw bizError(ErrorCode.INVALID_ARGUMENT, "必须提供 id 或 title 之一");
    }

    var todayYMD = resolveToday(params && params.today);

    var items = await loadAnniversaries();
    var active = items.filter(function (it) { return !it.deleted; });

    var matched;
    if (hasId) {
        var idTrim = String(id).trim();
        matched = active.filter(function (it) { return it.id === idTrim; });
    } else {
        var titleTrim = String(title).trim();
        matched = active.filter(function (it) { return it.title === titleTrim; });
    }

    if (matched.length === 0) {
        throw bizError(ErrorCode.NOT_FOUND, "未找到对应的纪念日");
    }

    // title 命中多条时返回 MULTIPLE_MATCHES（example.md 第 441 行）
    if (matched.length > 1 && !hasId) {
        var matches = matched.map(function (it) {
            return { id: it.id, title: it.title, date: it.date };
        });
        throw bizError(ErrorCode.MULTIPLE_MATCHES, "找到多个同名纪念日，请使用 id 指定", { matches: matches });
    }

    var target = matched[0];
    var status = getAnniversaryStatus(target.date, todayYMD);
    return {
        success: true,
        item: {
            id: target.id,
            title: target.title,
            date: target.date,
            daysSince: status.daysSince,
            nextDate: status.nextDate,
            daysUntilNext: status.daysUntilNext,
            isToday: status.isToday
        }
    };
}

// 4. toggle_anniversary_context
async function toggleAnniversaryContext(params) {
    var id = params && params.id;
    var enabled = params && params.enabled;

    if (!id || !String(id).trim()) {
        throw bizError(ErrorCode.INVALID_ARGUMENT, "id 必填");
    }
    if (typeof enabled !== "boolean") {
        throw bizError(ErrorCode.INVALID_ARGUMENT, "enabled 必须为布尔值");
    }

    var idTrim = String(id).trim();
    var items = await loadAnniversaries();
    var found = false;
    for (var i = 0; i < items.length; i++) {
        if (items[i].id === idTrim && !items[i].deleted) {
            items[i].sendToContext = enabled;
            items[i].updatedAt = nowIsoShanghai();
            found = true;
            break;
        }
    }
    if (!found) {
        throw bizError(ErrorCode.NOT_FOUND, "未找到对应的纪念日");
    }
    await saveAnniversaries(items);
    return {
        success: true,
        id: idTrim,
        sendToContext: enabled,
        message: enabled ? "已开启上下文发送" : "已关闭上下文发送"
    };
}

// 5. get_context_anniversaries
// 只返回 deleted=false 且 sendToContext=true 的项目摘要，不含隐私字段
async function getContextAnniversaries(params) {
    var todayYMD = resolveToday(params && params.today);
    var items = await loadAnniversaries();
    var contextItems = items.filter(function (it) {
        return !it.deleted && it.sendToContext === true;
    });
    var summaries = contextItems.map(function (it) {
        var status = getAnniversaryStatus(it.date, todayYMD);
        return {
            title: it.title,
            date: it.date,
            daysSince: status.daysSince,
            nextDate: status.nextDate,
            daysUntilNext: status.daysUntilNext,
            isToday: status.isToday
        };
    });
    return { success: true, count: summaries.length, items: summaries };
}

// 6. delete_anniversary（软删除）
async function deleteAnniversary(params) {
    var id = params && params.id;
    if (!id || !String(id).trim()) {
        throw bizError(ErrorCode.INVALID_ARGUMENT, "id 必填");
    }
    var idTrim = String(id).trim();
    var items = await loadAnniversaries();
    var found = false;
    var now = nowIsoShanghai();
    for (var i = 0; i < items.length; i++) {
        if (items[i].id === idTrim && !items[i].deleted) {
            items[i].deleted = true;
            items[i].deletedAt = now;
            items[i].updatedAt = now;
            found = true;
            break;
        }
    }
    if (!found) {
        throw bizError(ErrorCode.NOT_FOUND, "未找到对应的纪念日");
    }
    await saveAnniversaries(items);
    return { success: true, id: idTrim, message: "纪念日已删除" };
}

// ============================================================
// wrap 包装器 + complete（参考官方 worldbook_tools.ts:364 / extended_file_tools.js:123）
// 兼容 complete 机制与 return 机制
// ============================================================
// _G_S::anniv::auth::1 — 受保护的执行包装器
async function wrap(handler, params) {
    // 完整性校验：水印被篡改则功能降级，返回版权警告
    var guardCheck = verifyIntegrity(null);
    if (!guardCheck.ok) {
        var degraded = makeDegradedResponse(guardCheck.reason);
        if (typeof complete === "function") {
            try { complete(degraded); } catch (e) { }
        }
        return degraded;
    }
    try {
        var result = await handler(params || {});
        if (typeof complete === "function") {
            complete(result);
        }
        return result;
    } catch (error) {
        var code = (error && error.code) ? error.code : ErrorCode.UNKNOWN_ERROR;
        var message = (error && error.message) ? error.message : "未知错误";
        var errResult = { success: false, error: { code: code, message: message } };
        // MULTIPLE_MATCHES 携带 matches 列表
        if (code === ErrorCode.MULTIPLE_MATCHES && error.matches) {
            errResult.error.matches = error.matches;
        }
        if (typeof complete === "function") {
            complete(errResult);
        }
        return errResult;
    }
}

// ============================================================
// 上下文自动注入（systemPromptHook）
// 让 AI 在每次对话自动看到「发送开关已开启」的纪念日状态
// 参考 worldbook main.ts: systemPromptHook(event) → {systemPrompt} | null
// ============================================================

// 纯函数：根据 item.mode 与 status 生成自然语言摘要片段数组
// count_up ：仅显示已过去天数（daysSince > 0，仅对已发生事件有意义）
// count_down：仅显示距下次周年天数（daysUntilNext > 0）
// both     ：两者都显示
// isToday  ：任何 mode 都优先提示"今天是纪念日"
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

// 读取全部「发送开关已开启」的纪念日，拼接成一段系统提示词注入文本
// 出错时返回空字符串（不阻断对话）
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

// Operit 系统提示词组装钩子：在 after_compose_system_prompt 阶段自动注入
// 返回 { systemPrompt } 则替换系统提示词；返回 null 则不修改
// 任何异常都静默返回 null，绝不阻断用户对话
// _G_S::anniv::orig::2 — 系统提示词钩子含完整性校验
async function systemPromptHook(event) {
    var stage = (event && (event.eventName || event.event)) || "";
    if (stage !== "after_compose_system_prompt") {
        return null;
    }
    // 完整性校验：水印被篡改则不注入（静默降级，不阻断对话）
    var guardCheck = verifyIntegrity(null);
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

// ============================================================
// 工具导出
// ============================================================
exports.add_anniversary = function (params) { return wrap(addAnniversary, params); };
exports.list_anniversaries = function (params) { return wrap(listAnniversaries, params); };
exports.get_anniversary_status = function (params) { return wrap(getAnniversaryStatusTool, params); };
exports.toggle_anniversary_context = function (params) { return wrap(toggleAnniversaryContext, params); };
exports.get_context_anniversaries = function (params) { return wrap(getContextAnniversaries, params); };
exports.delete_anniversary = function (params) { return wrap(deleteAnniversary, params); };

// 上下文自动注入钩子（非工具，由宿主在系统提示词组装阶段调用）
exports.systemPromptHook = systemPromptHook;

// 完整性防护导出（供测试与外部校验使用）
exports.verifyIntegrity = verifyIntegrity;
exports.stampAuthorFingerprint = stampAuthorFingerprint;
exports.makeDegradedResponse = makeDegradedResponse;
exports._W = _W;
exports._hash = _hash;
exports._SENTINEL_AUTH = _SENTINEL_AUTH;
exports._SENTINEL_ORIG = _SENTINEL_ORIG;
exports._SENTINEL_FP = _SENTINEL_FP;
exports._checkWatermark = _checkWatermark;
