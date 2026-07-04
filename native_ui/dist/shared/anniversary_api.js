"use strict";
// ============================================================
// 纪念日插件 - 共享 API 层
// Copyright (c) 2026 AnniversaryPluginContributors (MIT)
// 为原生 UI、Web UI bridge 与测试提供统一的数据快照与变更入口。
// 不改变 anniversaries.json 的数组存储格式。
// ============================================================

var service = require("./anniversary_service.js");

function hashText(text) {
    var h = 5381;
    var str = String(text || "");
    for (var i = 0; i < str.length; i++) {
        h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    return h;
}

function itemStamp(item) {
    if (!item) return "";
    return [
        item.id || "",
        item.title || "",
        item.date || "",
        item.owner || "",
        item.mode || "",
        item.sendToContext === true ? "1" : "0",
        item.deleted === true ? "1" : "0",
        item.createdAt || "",
        item.updatedAt || "",
        item.deletedAt || ""
    ].join("|");
}

function buildDataVersion(items) {
    var list = Array.isArray(items) ? items : [];
    var maxStamp = "";
    var activeCount = 0;
    var fingerprint = 0;
    for (var i = 0; i < list.length; i++) {
        var item = list[i] || {};
        if (!item.deleted) activeCount++;
        var stamp = item.updatedAt || item.deletedAt || item.createdAt || "";
        if (String(stamp) > maxStamp) maxStamp = String(stamp);
        fingerprint = (fingerprint + hashText(itemStamp(item))) | 0;
    }
    return "v1:" + list.length + ":" + activeCount + ":" + maxStamp + ":" + fingerprint;
}

async function assertExpectedVersion(params) {
    params = params || {};
    if (!params.expectedVersion) return;
    var allItems = await service.listAnniversaries({ includeDeleted: true });
    var currentVersion = buildDataVersion(allItems);
    if (String(params.expectedVersion) !== currentVersion) {
        var error = new Error("数据已在其他入口发生变化，请刷新后重试");
        error.code = "DATA_CHANGED";
        error.currentVersion = currentVersion;
        throw error;
    }
}

function toSnapshotItem(item, todayYMD) {
    var status = service.getAnniversaryStatus(item.date, todayYMD);
    return {
        id: item.id,
        title: item.title,
        date: item.date,
        calendarType: item.calendarType || "solar",
        mode: item.mode || "both",
        owner: item.owner || "user",
        description: item.description || "",
        sendToContext: item.sendToContext === true,
        reminderEnabled: item.reminderEnabled === true,
        reminderDaysBefore: Array.isArray(item.reminderDaysBefore) ? item.reminderDaysBefore.slice() : [],
        deleted: item.deleted === true,
        deletedAt: item.deletedAt || "",
        createdAt: item.createdAt || "",
        updatedAt: item.updatedAt || "",
        status: {
            daysSince: status.daysSince,
            nextDate: status.nextDate,
            daysUntilNext: status.daysUntilNext,
            isToday: status.isToday
        }
    };
}

async function listSnapshot(params) {
    params = params || {};
    var includeDeleted = params.includeDeleted === true;
    var todayYMD = service.resolveToday(params.today);
    var allItems = await service.listAnniversaries({ includeDeleted: true });
    var visibleItems = includeDeleted ? allItems : allItems.filter(function (item) { return !item.deleted; });
    visibleItems.sort(function (a, b) {
        var byDate = String(a.date || "").localeCompare(String(b.date || ""));
        if (byDate !== 0) return byDate;
        return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
    return {
        success: true,
        today: todayYMD,
        version: buildDataVersion(allItems),
        count: visibleItems.length,
        items: visibleItems.map(function (item) { return toSnapshotItem(item, todayYMD); })
    };
}

async function createAnniversary(params) {
    params = params || {};
    var todayYMD = service.resolveToday(params.today);
    var item = await service.createAnniversary(params);
    return {
        success: true,
        item: toSnapshotItem(item, todayYMD),
        snapshot: await listSnapshot(params)
    };
}

async function updateAnniversary(params) {
    params = params || {};
    var todayYMD = service.resolveToday(params.today);
    await assertExpectedVersion(params);
    var item = await service.updateAnniversary(params);
    return {
        success: true,
        item: toSnapshotItem(item, todayYMD),
        snapshot: await listSnapshot(params)
    };
}

async function deleteAnniversary(params) {
    params = params || {};
    service.resolveToday(params.today);
    await assertExpectedVersion(params);
    var item = await service.deleteAnniversary(params.id);
    return {
        success: true,
        id: item.id,
        snapshot: await listSnapshot(params)
    };
}

async function toggleContext(params) {
    params = params || {};
    var todayYMD = service.resolveToday(params.today);
    await assertExpectedVersion(params);
    var item = await service.toggleContext(params.id, params.enabled);
    return {
        success: true,
        id: item.id,
        sendToContext: item.sendToContext === true,
        item: toSnapshotItem(item, todayYMD),
        snapshot: await listSnapshot(params)
    };
}

async function getStatus(params) {
    params = params || {};
    var result = await service.getStatusById(params.id, params.today);
    return {
        success: true,
        today: result.todayYMD,
        item: toSnapshotItem(result.item, result.todayYMD)
    };
}

async function invoke(action, params) {
    try {
        switch (action) {
            case "list_snapshot":
                return await listSnapshot(params);
            case "create":
                return await createAnniversary(params);
            case "update":
                return await updateAnniversary(params);
            case "delete":
                return await deleteAnniversary(params);
            case "toggle_context":
                return await toggleContext(params);
            case "get_status":
                return await getStatus(params);
            default:
                return {
                    success: false,
                    error: { code: "INVALID_ACTION", message: "未知 API 动作: " + String(action || "") }
                };
        }
    } catch (error) {
        var errResult = {
            success: false,
            error: {
                code: error && error.code ? error.code : service.ErrorCode.UNKNOWN_ERROR,
                message: error && error.message ? error.message : "未知错误"
            }
        };
        if (error && error.matches) {
            errResult.error.matches = error.matches;
        }
        return errResult;
    }
}

exports.buildDataVersion = buildDataVersion;
exports.assertExpectedVersion = assertExpectedVersion;
exports.toSnapshotItem = toSnapshotItem;
exports.listSnapshot = listSnapshot;
exports.createAnniversary = createAnniversary;
exports.updateAnniversary = updateAnniversary;
exports.deleteAnniversary = deleteAnniversary;
exports.toggleContext = toggleContext;
exports.getStatus = getStatus;
exports.invoke = invoke;
