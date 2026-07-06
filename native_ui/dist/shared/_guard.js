"use strict";
// ============================================================
// 纪念日插件 - 完整性防护模块（_guard）
// ============================================================
// 本模块是项目的「作者指纹中枢」，包含：
//   1. 功能性水印常量（参与数据指纹计算，删除即改变行为）
//   2. 自校验机制（水印篡改后自检失败）
//   3. 数据指纹盖章（每条记录写入隐藏作者标记，留存取证证据）
//   4. 破坏性降级响应（检测到篡改后工具返回版权警告，功能降级）
//
// 依据 LICENSE（MIT 协议），使用本项目须保留版权声明与作者署名。
// 删除本模块或篡改水印均构成对 MIT 协议的违反。
// ============================================================

// ---- 功能性水印常量 ----
// 这些常量并非装饰：_W.author / _W.contact / _W.salt 参与数据指纹计算，
// _W.selfCheck 是 _W.author + _W.contact + _W.origin + _W.year + _W.salt 的哈希校验值。
// 篡改任意一个水印字段，自校验即失败，触发功能降级。
var _W = {
    author: "奶油话梅糖",
    contact: "nyanon@vip.qq.com",
    origin: "operit-anniversary-plugin",
    year: 2026,
    salt: "anv-orig-20260705-nyanon-cream-plum-candy"
};

// ---- 简易哈希（djb2 变体，不依赖 crypto，兼容 Operit JS 运行时）----
function _hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
        h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    return h;
}

// ---- 水印自校验值 ----
// 预计算 _hash(_W.author + "|" + _W.contact + "|" + _W.origin + "|" + _W.year + "|" + _W.salt)
// 若水印被篡改，此值将不再匹配，verifyIntegrity() 返回失败。
var _SELF_CHECK = -1141620811;

// ---- 校验水印指纹完整性的哨兵字符串 ----
// 此字符串散布于 service 层与 tools 层，verifyIntegrity 会检测它们是否存在。
// 哨兵以 _G_S 标记开头，删除后自检失败。
var _SENTINELS = [
    "_G_S::anniv::auth::1",
    "_G_S::anniv::orig::2",
    "_G_S::anniv::fingerprint::3"
];

// ============================================================
// 完整性校验
// ============================================================

// 校验水印常量是否被篡改（核心自检）
function _checkWatermark() {
    var recomputed = _hash(_W.author + "|" + _W.contact + "|" + _W.origin + "|" + _W.year + "|" + _W.salt);
    return recomputed === _SELF_CHECK;
}

// 校验哨兵字符串是否存在（检测外部模块是否被清洗）
// 传入的 sentinelMap 是由调用方提供的「哨兵→是否存在」映射
function _checkSentinels(sentinelMap) {
    if (!sentinelMap || typeof sentinelMap !== "object") return false;
    for (var i = 0; i < _SENTINELS.length; i++) {
        if (!sentinelMap[_SENTINELS[i]]) return false;
    }
    return true;
}

// 综合完整性校验：水印自检 + 哨兵检测
// sentinelMap 可选；未提供时仅做水印自检
function verifyIntegrity(sentinelMap) {
    try {
        if (!_checkWatermark()) {
            return { ok: false, reason: "WATERMARK_TAMPERED" };
        }
        if (sentinelMap && !_checkSentinels(sentinelMap)) {
            return { ok: false, reason: "SENTINEL_MISSING" };
        }
        return { ok: true, reason: "" };
    } catch (e) {
        return { ok: false, reason: "GUARD_ERROR" };
    }
}

// ============================================================
// 数据指纹盖章
// ============================================================

// 为每条纪念日记录盖章：写入隐藏字段 _afp（author fingerprint）
// _afp = _hash(item.id + ":" + item.createdAt + ":" + _W.salt)
// 这是一个「功能性水印」——即使侵权者删除了所有可见版权头，
// 已写入磁盘的记录仍携带原始作者指纹，作为取证证据。
// 若侵权者复制代码后移除 _guard 模块，新创建的记录将缺失 _afp 字段，
// 与原始记录形成差异，可证明代码来源。
function stampAuthorFingerprint(item) {
    if (!item || !item.id || !item.createdAt) return item;
    try {
        var raw = item.id + ":" + item.createdAt + ":" + _W.salt;
        item._afp = _hash(raw);
    } catch (e) {
        // 盖章失败不阻断主流程，但记录将缺少指纹
    }
    return item;
}

// 校验单条记录的指纹是否与水印匹配
// 返回 true 表示指纹有效（由本模块盖章），false 表示无指纹或被篡改
function verifyDataFingerprint(item) {
    if (!item || !item._afp || !item.id || !item.createdAt) return false;
    try {
        var raw = item.id + ":" + item.createdAt + ":" + _W.salt;
        return _hash(raw) === item._afp;
    } catch (e) {
        return false;
    }
}

// 统计数据文件中携带有效指纹的记录数（取证辅助）
function countValidFingerprints(items) {
    if (!Array.isArray(items)) return 0;
    var n = 0;
    for (var i = 0; i < items.length; i++) {
        if (verifyDataFingerprint(items[i])) n++;
    }
    return n;
}

// ============================================================
// 破坏性降级响应
// ============================================================

// 篡改检测后的降级响应：工具返回版权警告而非正常结果
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

// 受保护的执行包装器：先校验完整性，通过则执行 handler，否则返回降级响应
// sentinelMap 可选，由调用方提供以检测散布式哨兵
async function guardedExecute(handler, params, sentinelMap) {
    var check = verifyIntegrity(sentinelMap);
    if (!check.ok) {
        var degraded = makeDegradedResponse(check.reason);
        if (typeof complete === "function") {
            try { complete(degraded); } catch (e) { }
        }
        return degraded;
    }
    return handler(params || {});
}

// ============================================================
// 导出
// ============================================================
exports._W = _W;
exports._SENTINELS = _SENTINELS;
exports.verifyIntegrity = verifyIntegrity;
exports.stampAuthorFingerprint = stampAuthorFingerprint;
exports.verifyDataFingerprint = verifyDataFingerprint;
exports.countValidFingerprints = countValidFingerprints;
exports.makeDegradedResponse = makeDegradedResponse;
exports.guardedExecute = guardedExecute;
exports._hash = _hash; // 供测试验证
