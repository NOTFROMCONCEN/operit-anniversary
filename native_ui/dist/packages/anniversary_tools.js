/* METADATA
{
  "name": "anniversary_tools",
  "display_name": {
    "zh": "纪念日工具",
    "en": "Anniversary Tools"
  },
  "description": {
    "zh": "纪念日的增删查改与状态计算工具，供 AI 在对话中调用。",
    "en": "CRUD and status calculation tools for anniversaries, callable by AI in conversation."
  },
  "category": "Utility",
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
"use strict";
// ============================================================
// 纪念日插件 - 工具子包
// 供 AI 在对话中调用的工具接口，通过 service 层操作数据。
// 逻辑与单文件基础版 AnniversaryPlugin.js 的工具导出一致。
// ============================================================

var service = require("../shared/anniversary_service.js");
var storage = require("../shared/anniversary_storage.js");
var guard = require("../shared/_guard.js");

var ErrorCode = service.ErrorCode;
var verifyIntegrity = guard.verifyIntegrity;
var makeDegradedResponse = guard.makeDegradedResponse;
// _G_S::anniv::auth::1 — 作者水印哨兵
// _G_S::anniv::orig::2 — 来源水印哨兵
// _G_S::anniv::fingerprint::3 — 指纹水印哨兵
var createAnniversary = service.createAnniversary;
var updateAnniversary = service.updateAnniversary;
var listAnniversaries = service.listAnniversaries;
var getAnniversary = service.getAnniversary;
var toggleContext = service.toggleContext;
var deleteAnniversary = service.deleteAnniversary;
var getStatusById = service.getStatusById;
var getAnniversaryStatus = service.getAnniversaryStatus;
var resolveToday = service.resolveToday;
var loadAnniversaries = storage.loadAnniversaries;

// ============================================================
// wrap 包装器：兼容 complete 机制与 return 机制
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
// 工具实现
// ============================================================

// 1. add_anniversary
async function addAnniversary(params) {
    var item = await createAnniversary(params);
    return {
        success: true,
        item: { id: item.id, title: item.title, date: item.date },
        message: "纪念日已添加"
    };
}

// 2. list_anniversaries
async function listAnniversariesTool(params) {
    var includeDeleted = (params && typeof params.includeDeleted === "boolean") ? params.includeDeleted : false;
    var visible = await listAnniversaries({ includeDeleted: includeDeleted });
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
        throw service.bizError(ErrorCode.INVALID_ARGUMENT, "必须提供 id 或 title 之一");
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
        throw service.bizError(ErrorCode.NOT_FOUND, "未找到对应的纪念日");
    }

    if (matched.length > 1 && !hasId) {
        var matches = matched.map(function (it) {
            return { id: it.id, title: it.title, date: it.date };
        });
        throw service.bizError(ErrorCode.MULTIPLE_MATCHES, "找到多个同名纪念日，请使用 id 指定", { matches: matches });
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
        throw service.bizError(ErrorCode.INVALID_ARGUMENT, "id 必填");
    }
    if (typeof enabled !== "boolean") {
        throw service.bizError(ErrorCode.INVALID_ARGUMENT, "enabled 必须为布尔值");
    }

    var item = await toggleContext(id, enabled);
    return {
        success: true,
        id: item.id,
        sendToContext: item.sendToContext,
        message: enabled ? "已开启上下文发送" : "已关闭上下文发送"
    };
}

// 5. get_context_anniversaries
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
async function deleteAnniversaryTool(params) {
    var id = params && params.id;
    if (!id || !String(id).trim()) {
        throw service.bizError(ErrorCode.INVALID_ARGUMENT, "id 必填");
    }
    var removed = await deleteAnniversary(id);
    return { success: true, id: removed.id, message: "纪念日已删除" };
}

// ============================================================
// 工具导出
// ============================================================
exports.add_anniversary = function (params) { return wrap(addAnniversary, params); };
exports.list_anniversaries = function (params) { return wrap(listAnniversariesTool, params); };
exports.get_anniversary_status = function (params) { return wrap(getAnniversaryStatusTool, params); };
exports.toggle_anniversary_context = function (params) { return wrap(toggleAnniversaryContext, params); };
exports.get_context_anniversaries = function (params) { return wrap(getContextAnniversaries, params); };
exports.delete_anniversary = function (params) { return wrap(deleteAnniversaryTool, params); };

// 确保存储初始化
void storage.ensureDataFile().catch(function () { });
