// Copyright (c) 2026 奶油话梅糖 <nyanon@vip.qq.com> (MIT)
// 纯 Node.js 自测脚本：mock Operit 宿主环境，验证日期计算与工具逻辑
// 用法: node _selftest.js
var Tools = { Files: {} };
var fileStore = {};
Tools.Files.mkdir = async function (p, r) { fileStore[p] = fileStore[p] || ""; };
Tools.Files.exists = async function (p) { return { exists: p in fileStore }; };
Tools.Files.read = async function (p) { return { content: fileStore[p] || "" }; };
Tools.Files.write = async function (p, c, a) { fileStore[p] = c; };
Tools.Files.deleteFile = async function (p, r) { delete fileStore[p]; };
var ToolPkg = { getConfigDir: function () { return "/test/mock_config_dir"; } };
var complete = function (r) { /* no-op in test */ };
global.Tools = Tools; global.ToolPkg = ToolPkg; global.complete = complete;

// 加载插件（require 返回 module.exports）
var P = require("./AnniversaryPlugin.js");

function assertEq(actual, expected, label) {
    var a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a !== e) { console.error("FAIL: " + label + "\n  expected: " + e + "\n  actual:   " + a); process.exitCode = 1; }
    else { console.log("PASS: " + label); }
}

async function main() {
    // 清空存储
    fileStore = {};

    // 用例1: 添加 2026-07-03 认识纪念日
    var add = await P.add_anniversary({ title: "认识纪念日", date: "2026-07-03" });
    assertEq(add.success, true, "用例1 添加成功");
    assertEq(add.item.title, "认识纪念日", "用例1 标题");
    assertEq(add.item.date, "2026-07-03", "用例1 日期");
    var annivId = add.item.id;

    // 验证默认值
    var list = await P.list_anniversaries({});
    assertEq(list.count, 1, "用例1 列表数量");
    assertEq(list.items[0].sendToContext, false, "默认 sendToContext=false");
    assertEq(list.items[0].owner, "user", "默认 owner=user");
    assertEq(list.items[0].deleted, false, "默认 deleted=false");

    // 用例2: today=2026-07-03 → daysSince=0, daysUntilNext=0, isToday=true
    var s2 = await P.get_anniversary_status({ id: annivId, today: "2026-07-03" });
    assertEq(s2.success, true, "用例2 success");
    assertEq(s2.item.daysSince, 0, "用例2 daysSince=0");
    assertEq(s2.item.nextDate, "2026-07-03", "用例2 nextDate");
    assertEq(s2.item.daysUntilNext, 0, "用例2 daysUntilNext=0");
    assertEq(s2.item.isToday, true, "用例2 isToday=true");

    // 用例3: today=2026-07-04 → daysSince=1, nextDate=2027-07-03, daysUntilNext=364
    var s3 = await P.get_anniversary_status({ id: annivId, today: "2026-07-04" });
    assertEq(s3.item.daysSince, 1, "用例3 daysSince=1");
    assertEq(s3.item.nextDate, "2027-07-03", "用例3 nextDate=2027-07-03");
    assertEq(s3.item.daysUntilNext, 364, "用例3 daysUntilNext=364");
    assertEq(s3.item.isToday, false, "用例3 isToday=false");

    // 用例4: today=2026-07-02 → daysSince=-1, daysUntilNext=1
    var s4 = await P.get_anniversary_status({ id: annivId, today: "2026-07-02" });
    assertEq(s4.item.daysSince, -1, "用例4 daysSince=-1");
    assertEq(s4.item.daysUntilNext, 1, "用例4 daysUntilNext=1");
    assertEq(s4.item.isToday, false, "用例4 isToday=false");

    // 用例5: 添加非法日期 2026-02-30 → INVALID_DATE
    var s5 = await P.add_anniversary({ title: "非法", date: "2026-02-30" });
    assertEq(s5.success, false, "用例5 失败");
    assertEq(s5.error.code, "INVALID_DATE", "用例5 INVALID_DATE");

    // 用例6: 添加平年 2026-02-29 → INVALID_DATE（平年无 2-29，非法真实日历日期）
    // 注：功能迭代后支持闰年 2-29，但平年 2-29 仍为非法日历日期
    var s6 = await P.add_anniversary({ title: "平年闰日", date: "2026-02-29" });
    assertEq(s6.success, false, "用例6 平年2-29失败");
    assertEq(s6.error.code, "INVALID_DATE", "用例6 平年2-29 INVALID_DATE");

    // 用例7: 开启 sendToContext 后 get_context 能返回
    var tog = await P.toggle_anniversary_context({ id: annivId, enabled: true });
    assertEq(tog.success, true, "用例7 toggle成功");
    assertEq(tog.sendToContext, true, "用例7 已开启");
    var ctx7 = await P.get_context_anniversaries({ today: "2026-07-03" });
    assertEq(ctx7.count, 1, "用例7 context数量=1");
    assertEq(ctx7.items[0].title, "认识纪念日", "用例7 context标题");
    assertEq(ctx7.items[0].isToday, true, "用例7 context isToday");

    // 用例8: 关闭 sendToContext 后 get_context 不返回
    await P.toggle_anniversary_context({ id: annivId, enabled: false });
    var ctx8 = await P.get_context_anniversaries({ today: "2026-07-03" });
    assertEq(ctx8.count, 0, "用例8 context数量=0");

    // 用例9: 删除后 list 默认不返回
    var del = await P.delete_anniversary({ id: annivId });
    assertEq(del.success, true, "用例9 删除成功");
    var list9 = await P.list_anniversaries({});
    assertEq(list9.count, 0, "用例9 list数量=0");

    // 用例10: includeDeleted=true 可见 deleted=true
    var list10 = await P.list_anniversaries({ includeDeleted: true });
    assertEq(list10.count, 1, "用例10 list数量=1");
    assertEq(list10.items[0].deleted, true, "用例10 deleted=true");

    // 用例11: JSON 损坏不静默覆盖
    fileStore["/test/mock_config_dir/anniversaries.json"] = "{not valid json}";
    var list11 = await P.list_anniversaries({});
    assertEq(list11.success, false, "用例11 失败");
    assertEq(list11.error.code, "STORAGE_READ_FAILED", "用例11 STORAGE_READ_FAILED");
    assertEq(fileStore["/test/mock_config_dir/anniversaries.json"], "{not valid json}", "用例11 文件未被覆盖");

    // 用例12: 重复 title → MULTIPLE_MATCHES
    fileStore = {};
    var a1 = await P.add_anniversary({ title: "同名", date: "2026-07-03" });
    var a2 = await P.add_anniversary({ title: "同名", date: "2027-07-03" });
    var s12 = await P.get_anniversary_status({ title: "同名", today: "2026-07-03" });
    assertEq(s12.success, false, "用例12 失败");
    assertEq(s12.error.code, "MULTIPLE_MATCHES", "用例12 MULTIPLE_MATCHES");
    assertEq(s12.error.matches.length, 2, "用例12 matches=2");

    // 用例13: id/title 均空 → INVALID_ARGUMENT
    var s13 = await P.get_anniversary_status({ today: "2026-07-03" });
    assertEq(s13.success, false, "用例13 失败");
    assertEq(s13.error.code, "INVALID_ARGUMENT", "用例13 INVALID_ARGUMENT");

    // 用例14: 持久化 —— 新增后重新读取（模拟重启）
    fileStore = {};
    await P.add_anniversary({ title: "持久测试", date: "2026-07-03" });
    // 清空 require 缓存模拟新实例：直接再读 list 验证数据来自文件
    var list14 = await P.list_anniversaries({});
    assertEq(list14.count, 1, "用例14 list数量=1");
    assertEq(list14.items[0].title, "持久测试", "用例14 标题");

    // 边界: 非法格式 2026/07/03, 07-03-2026, 2026-13-01
    var f1 = await P.add_anniversary({ title: "斜杠", date: "2026/07/03" });
    assertEq(f1.error.code, "INVALID_DATE", "边界 2026/07/03 拒绝");
    var f2 = await P.add_anniversary({ title: "倒序", date: "07-03-2026" });
    assertEq(f2.error.code, "INVALID_DATE", "边界 07-03-2026 拒绝");
    var f3 = await P.add_anniversary({ title: "13月", date: "2026-13-01" });
    assertEq(f3.error.code, "INVALID_DATE", "边界 2026-13-01 拒绝");

    // NOT_FOUND
    var nf = await P.get_anniversary_status({ id: "no_such_id", today: "2026-07-03" });
    assertEq(nf.error.code, "NOT_FOUND", "NOT_FOUND");

    // ===== 闰日周年计算专项（功能迭代：支持 2 月 29 日）=====
    // 独立存储作用域，避免污染主流程
    fileStore = {};

    // 闰日纪念日 base=2024-02-29，平年回退到 2-28（业界通行做法）
    var leap = await P.add_anniversary({ title: "闰日", date: "2024-02-29", sendToContext: true });
    assertEq(leap.success, true, "闰日添加成功");
    assertEq(leap.item.date, "2024-02-29", "闰日日期正确");
    var leapId2 = leap.item.id;

    // today=2024-02-29（闰年当天）→ isToday=true, daysSince=0, nextDate=2024-02-29
    var lp1 = await P.get_anniversary_status({ id: leapId2, today: "2024-02-29" });
    assertEq(lp1.item.isToday, true, "闰日 当天 isToday=true");
    assertEq(lp1.item.daysSince, 0, "闰日 当天 daysSince=0");
    assertEq(lp1.item.nextDate, "2024-02-29", "闰日 当天 nextDate=2024-02-29");
    assertEq(lp1.item.daysUntilNext, 0, "闰日 当天 daysUntilNext=0");

    // today=2025-02-28（平年，闰日回退到2-28庆祝）→ nextDate=2025-02-28, isToday=true
    var lp2 = await P.get_anniversary_status({ id: leapId2, today: "2025-02-28" });
    assertEq(lp2.item.nextDate, "2025-02-28", "平年闰日 nextDate回退2025-02-28");
    assertEq(lp2.item.isToday, true, "平年闰日 isToday=true");
    // 2024-02-29 → 2025-02-28：2024闰年366天，2-29到年底306天 + 2025年到2-28共59天 = 365
    assertEq(lp2.item.daysSince, 365, "平年闰日 daysSince=365");

    // today=2025-03-01（平年，已过2-28）→ nextDate=次年2026-02-28（平年仍回退）
    // 设计语义：平年里闰日纪念日在2-28庆祝，逐年回退到2-28，到闰年才是2-29
    var lp3 = await P.get_anniversary_status({ id: leapId2, today: "2025-03-01" });
    assertEq(lp3.item.nextDate, "2026-02-28", "平年3月 nextDate=2026-02-28(次年回退)");
    assertEq(lp3.item.isToday, false, "平年3月 isToday=false");

    // today=2028-02-29（闰年当天）→ isToday=true, nextDate=2028-02-29
    var lp4 = await P.get_anniversary_status({ id: leapId2, today: "2028-02-29" });
    assertEq(lp4.item.isToday, true, "闰年2028当天 isToday=true");
    assertEq(lp4.item.nextDate, "2028-02-29", "闰年2028 nextDate=2028-02-29");

    // 闰日记录加入 context 后能被 get_context 返回（平年用回退日期计算状态）
    var lpCtx = await P.get_context_anniversaries({ today: "2025-02-28" });
    assertEq(lpCtx.count, 1, "闰日 context数量=1");
    assertEq(lpCtx.items[0].isToday, true, "闰日 context isToday(平年回退日)");

    // ===== v3 自动注入对话上下文（systemPromptHook）专项 =====
    // 独立存储作用域
    fileStore = {};

    // --- formatContextSummary 纯函数（需从插件内部读取，通过导出测试辅助）---
    // 插件未直接导出 formatContextSummary，用 get_context_anniversaries 间接验证文本拼接
    // 先构造场景：今天=2026-07-03，有一条"认识纪念日"base=2026-07-03，both 模式
    var injAdd = await P.add_anniversary({ title: "认识纪念日", date: "2026-07-03", sendToContext: true, mode: "both" });
    var injId = injAdd.item.id;

    // 场景A: today=纪念日当天 → isToday=true，both 模式应提示"今天是"
    //        daysSince=0 不输出"已过去"，daysUntilNext=0 不输出"还有"
    var ctxA = await P.get_context_anniversaries({ today: "2026-07-03" });
    assertEq(ctxA.count, 1, "注入A context数量=1");
    assertEq(ctxA.items[0].isToday, true, "注入A isToday=true");
    assertEq(ctxA.items[0].daysSince, 0, "注入A daysSince=0");
    assertEq(ctxA.items[0].daysUntilNext, 0, "注入A daysUntilNext=0");

    // 场景B: today=2026-07-04（次日）→ both 模式：已过去1天 + 距下次364天
    var ctxB = await P.get_context_anniversaries({ today: "2026-07-04" });
    assertEq(ctxB.items[0].daysSince, 1, "注入B daysSince=1");
    assertEq(ctxB.items[0].daysUntilNext, 364, "注入B daysUntilNext=364");

    // 场景C: count_up 模式 —— 只关心已过去天数
    fileStore = {};
    var upAdd = await P.add_anniversary({ title: "相识", date: "2024-01-01", sendToContext: true, mode: "count_up" });
    var ctxC = await P.get_context_anniversaries({ today: "2026-01-01" });
    assertEq(ctxC.count, 1, "注入C count_up数量=1");
    assertEq(ctxC.items[0].isToday, true, "注入C isToday=true");
    // 2024-01-01 → 2026-01-01：2024闰年366天 + 2025平年365天 = 731天
    assertEq(ctxC.items[0].daysSince, 731, "注入C daysSince=731(2024闰年366+2025平年365)");

    // 场景D: count_down 模式 —— 只关心距下次天数
    fileStore = {};
    await P.add_anniversary({ title: "生日", date: "2026-12-25", sendToContext: true, mode: "count_down" });
    var ctxD = await P.get_context_anniversaries({ today: "2026-12-20" });
    assertEq(ctxD.count, 1, "注入D count_down数量=1");
    assertEq(ctxD.items[0].daysUntilNext, 5, "注入D daysUntilNext=5");
    assertEq(ctxD.items[0].isToday, false, "注入D isToday=false");

    // --- buildContextInjection 控制流（通过 systemPromptHook 间接验证）---
    // 因为 systemPromptHook 内部用 getTodayYMDInShanghai() 取当天，无法注入 today
    // 改为直接测试钩子的阶段过滤与异常容错

    // 钩子1: 非 after_compose_system_prompt 阶段 → 返回 null（不修改）
    var hook1 = await P.systemPromptHook({ eventName: "some_other_stage", eventPayload: { systemPrompt: "你是助手" } });
    assertEq(hook1, null, "钩子1 非目标阶段返回null");

    // 钩子2: after_compose_system_prompt 阶段但无开启项 → 返回 null
    fileStore = {};
    var hook2 = await P.systemPromptHook({ eventName: "after_compose_system_prompt", eventPayload: { systemPrompt: "你是助手" } });
    assertEq(hook2, null, "钩子2 无开启项返回null");

    // 钩子3: 阶段正确且有开启项 → 返回 {systemPrompt} 含注入文本（追加到原提示词）
    fileStore = {};
    await P.add_anniversary({ title: "测试纪念日", date: "2026-07-03", sendToContext: true, mode: "both" });
    var hook3 = await P.systemPromptHook({ eventName: "after_compose_system_prompt", eventPayload: { systemPrompt: "你是一个助手。" } });
    assertEq(hook3 !== null, true, "钩子3 有开启项返回非null");
    assertEq(typeof hook3.systemPrompt, "string", "钩子3 返回systemPrompt字符串");
    assertEq(hook3.systemPrompt.indexOf("你是一个助手。") === 0, true, "钩子3 保留原提示词前缀");
    assertEq(hook3.systemPrompt.indexOf("【纪念日提醒】") !== -1, true, "钩子3 含注入标记");
    assertEq(hook3.systemPrompt.indexOf("测试纪念日") !== -1, true, "钩子3 含纪念日名称");

    // 钩子4: event 用 event 字段（兼容）+ 无 systemPayload → 应仍能注入（空前缀）
    var hook4 = await P.systemPromptHook({ event: "after_compose_system_prompt" });
    assertEq(hook4 !== null, true, "钩子4 event字段兼容返回非null");
    assertEq(hook4.systemPrompt.indexOf("【纪念日提醒】") !== -1, true, "钩子4 含注入标记");

    // 钩子5: 数据文件损坏 → 静默返回 null（不阻断对话）
    fileStore = {};
    fileStore["/test/mock_config_dir/anniversaries.json"] = "{broken json";
    var hook5 = await P.systemPromptHook({ eventName: "after_compose_system_prompt", eventPayload: { systemPrompt: "你是助手" } });
    assertEq(hook5, null, "钩子5 数据损坏静默返回null");

    // ============================================================
    // 防剽窃防护测试
    // ============================================================
    console.log("\n--- 防剽窃防护测试 ---");
    fileStore = {};

    // 水印自检：正常状态应通过
    var gi1 = P.verifyIntegrity(null);
    assertEq(gi1.ok, true, "防护1 完整性校验通过");

    // 水印自检：篡改 _W.author 后应失败
    var origAuthor = P._W.author;
    P._W.author = "PLAGIARIST";
    var gi2 = P.verifyIntegrity(null);
    assertEq(gi2.ok, false, "防护2 篡改author后校验失败");
    assertEq(gi2.reason, "WATERMARK_TAMPERED", "防护2 失败原因");
    P._W.author = origAuthor; // 恢复

    // 水印自检：篡改 _W.salt 后应失败
    var origSalt = P._W.salt;
    P._W.salt = "stolen-salt";
    var gi3 = P.verifyIntegrity(null);
    assertEq(gi3.ok, false, "防护3 篡改salt后校验失败");
    P._W.salt = origSalt; // 恢复

    // 哨兵检测：提供完整哨兵映射应通过
    var sentinelMap = {};
    sentinelMap[P._SENTINEL_AUTH] = true;
    sentinelMap[P._SENTINEL_ORIG] = true;
    sentinelMap[P._SENTINEL_FP] = true;
    var gi4 = P.verifyIntegrity(sentinelMap);
    assertEq(gi4.ok, true, "防护4 哨兵完整校验通过");

    // 哨兵检测：缺失哨兵应失败
    var sentinelMapBad = {};
    sentinelMapBad[P._SENTINEL_AUTH] = true;
    sentinelMapBad[P._SENTINEL_ORIG] = true;
    // 缺少 _SENTINEL_FP
    var gi5 = P.verifyIntegrity(sentinelMapBad);
    assertEq(gi5.ok, false, "防护5 哨兵缺失校验失败");
    assertEq(gi5.reason, "SENTINEL_MISSING", "防护5 失败原因");

    // 数据指纹盖章：createAnniversary 后记录应携带 _afp
    var addG = await P.add_anniversary({ title: "指纹测试", date: "2026-07-03", sendToContext: true });
    assertEq(addG.success, true, "防护6 添加成功");
    var rawJson = fileStore["/test/mock_config_dir/anniversaries.json"];
    var parsedG = JSON.parse(rawJson);
    assertEq(parsedG.length > 0, true, "防护6 存储有记录");
    assertEq(parsedG[0]._afp !== undefined, true, "防护6 记录含_afp指纹");
    assertEq(typeof parsedG[0]._afp, "number", "防护6 _afp为数值");

    // 破坏性降级：篡改水印后调用工具应返回版权警告
    P._W.author = "THIEF";
    var addDeg = await P.add_anniversary({ title: "降级测试", date: "2026-07-03" });
    assertEq(addDeg.success, false, "防护7 篡改后工具降级");
    assertEq(addDeg.error.code, "INTEGRITY_VIOLATION", "防护7 降级错误码");
    assertEq(addDeg.error.message.indexOf("完整性校验失败") !== -1, true, "防护7 含版权警告");
    P._W.author = origAuthor; // 恢复

    // 破坏性降级：篡改后 list 工具也应降级
    P._W.salt = "thief-salt";
    var listDeg = await P.list_anniversaries({});
    assertEq(listDeg.success, false, "防护8 list工具降级");
    assertEq(listDeg.error.code, "INTEGRITY_VIOLATION", "防护8 降级错误码");
    P._W.salt = origSalt; // 恢复

    // 恢复后工具应正常工作
    var listOk = await P.list_anniversaries({});
    assertEq(listOk.success, true, "防护9 恢复后工具正常");

    // systemPromptHook 篡改后应静默返回 null
    P._W.author = "THIEF";
    var hookDeg = await P.systemPromptHook({ eventName: "after_compose_system_prompt", eventPayload: { systemPrompt: "你是助手" } });
    assertEq(hookDeg, null, "防护10 篡改后钩子静默降级");
    P._W.author = origAuthor; // 恢复

    console.log("\n=== 自测完成 ===");
}

main().catch(function (e) { console.error("自测异常:", e); process.exitCode = 1; });
