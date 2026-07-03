"use strict";
// ============================================================
// 纪念日插件 - 存储层
// Copyright (c) 2026 AnniversaryPluginContributors (MIT)
// 与单文件基础版 AnniversaryPlugin.js 共享同一份数据文件，
// 使用 ToolPkg.getConfigDir() 获取插件私有配置目录。
// 本文件含作者水印哨兵 _G_S::anniv::auth::1，删除后校验失败。
// ============================================================
// _G_S::anniv::auth::1 — 作者水印哨兵

var TZ_OFFSET_MIN = 8 * 60; // Asia/Shanghai = UTC+8

// 数据目录与文件路径：使用 Operit 插件私有配置目录
var DATA_DIR = (typeof ToolPkg !== "undefined" && ToolPkg.getConfigDir) ? ToolPkg.getConfigDir() : "data";
var DATA_FILE = DATA_DIR + "/anniversaries.json";
var BACKUP_FILE = DATA_DIR + "/anniversaries.backup.json";

function pad2(n) {
    return (n < 10 ? "0" : "") + n;
}

// 当前北京时间日期 YYYY-MM-DD（Asia/Shanghai）
function getTodayYMDInShanghai() {
    var now = new Date();
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
        var err = new Error("数据文件损坏，无法解析为 JSON");
        err.code = "STORAGE_READ_FAILED";
        throw err;
    }
    if (!Array.isArray(parsed)) {
        var err2 = new Error("数据文件格式错误：非数组，已中止操作以保护数据");
        err2.code = "STORAGE_READ_FAILED";
        throw err2;
    }
    return parsed;
}

// 写入纪念日：先写备份再写主文件
async function saveAnniversaries(items) {
    if (!Array.isArray(items)) {
        var err = new Error("写入数据非数组");
        err.code = "STORAGE_WRITE_FAILED";
        throw err;
    }
    // 先写备份文件
    await Tools.Files.write(BACKUP_FILE, JSON.stringify(items, null, 2), false);
    // 再写主文件
    await Tools.Files.write(DATA_FILE, JSON.stringify(items, null, 2), false);
}

// ID 生成
function genId() {
    var datePart = getTodayYMDInShanghai().replace(/-/g, "");
    var rand = Math.random().toString(36).slice(2, 8);
    return "anniv_" + datePart + "_" + Date.now() + "_" + rand;
}

exports.DATA_DIR = DATA_DIR;
exports.DATA_FILE = DATA_FILE;
exports.BACKUP_FILE = BACKUP_FILE;
exports.getTodayYMDInShanghai = getTodayYMDInShanghai;
exports.nowIsoShanghai = nowIsoShanghai;
exports.ensureDataFile = ensureDataFile;
exports.loadAnniversaries = loadAnniversaries;
exports.saveAnniversaries = saveAnniversaries;
exports.genId = genId;
