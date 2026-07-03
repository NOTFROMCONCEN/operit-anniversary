// 纯 Node.js 自测脚本：验证 native_ui 版的 service 层与工具子包
// mock Operit 宿主环境，验证日期计算、CRUD、systemPromptHook 逻辑
// 用法: node native_ui/_selftest.js
var path = require("path");
var baseDir = path.resolve(__dirname);

// ---- mock 宿主环境 ----
var Tools = { Files: {} };
var fileStore = {};
Tools.Files.mkdir = async function (p, r) { fileStore[p] = fileStore[p] || ""; };
Tools.Files.exists = async function (p) { return { exists: p in fileStore }; };
Tools.Files.read = async function (p) { return { content: fileStore[p] || "" }; };
Tools.Files.write = async function (p, c, a) { fileStore[p] = c; };
Tools.Files.deleteFile = async function (p, r) { delete fileStore[p]; };
var ToolPkg = { getConfigDir: function () { return "/test/mock_config_dir"; } };
var complete = function (r) { /* no-op in test */ };
global.Tools = Tools;
global.ToolPkg = ToolPkg;
global.complete = complete;

function assertEq(actual, expected, label) {
    var a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a !== e) { console.error("FAIL: " + label + "\n  expected: " + e + "\n  actual:   " + a); process.exitCode = 1; }
    else { console.log("PASS: " + label); }
}

async function main() {
    // 清空存储
    fileStore = {};

    // 加载 service 层
    var service = require("./dist/shared/anniversary_service.js");

    // 加载工具子包
    var tools = require("./dist/packages/anniversary_tools.js");

    // ============================================================
    // 日期计算测试
    // ============================================================
    console.log("\n--- 日期计算测试 ---");

    // 闰年判断
    assertEq(service.isLeapYear(2024), true, "闰年 2024");
    assertEq(service.isLeapYear(2023), false, "平年 2023");
    assertEq(service.isLeapYear(2000), true, "世纪闰年 2000");
    assertEq(service.isLeapYear(1900), false, "世纪平年 1900");

    // 日期校验
    assertEq(service.isValidYMD("2024-02-29").valid, true, "闰日 2024-02-29 有效");
    assertEq(service.isValidYMD("2023-02-29").valid, false, "平年 2023-02-29 无效");
    assertEq(service.isValidYMD("2024-13-01").valid, false, "非法月份 13");
    assertEq(service.isValidYMD("invalid").valid, false, "非法格式");

    // getAnniversaryStatus: 当天
    var st0 = service.getAnniversaryStatus("2026-07-03", "2026-07-03");
    assertEq(st0.daysSince, 0, "当天 daysSince=0");
    assertEq(st0.nextDate, "2026-07-03", "当天 nextDate");
    assertEq(st0.daysUntilNext, 0, "当天 daysUntilNext=0");
    assertEq(st0.isToday, true, "当天 isToday=true");

    // getAnniversaryStatus: 1天后
    var st1 = service.getAnniversaryStatus("2026-07-03", "2026-07-04");
    assertEq(st1.daysSince, 1, "1天后 daysSince=1");
    assertEq(st1.nextDate, "2027-07-03", "1天后 nextDate=2027-07-03");
    assertEq(st1.daysUntilNext, 364, "1天后 daysUntilNext=364");
    assertEq(st1.isToday, false, "1天后 isToday=false");

    // getAnniversaryStatus: 1天前
    var st2 = service.getAnniversaryStatus("2026-07-03", "2026-07-02");
    assertEq(st2.daysSince, -1, "1天前 daysSince=-1");
    assertEq(st2.daysUntilNext, 1, "1天前 daysUntilNext=1");

    // 闰日纪念日：2-29 在平年回退到 2-28
    var leapStatus = service.getAnniversaryStatus("2024-02-29", "2025-03-01");
    assertEq(leapStatus.daysSince, 366, "闰日 2024-02-29 到 2025-03-01 daysSince=366");
    assertEq(leapStatus.nextDate, "2026-02-28", "闰日平年回退 nextDate=2026-02-28");
    assertEq(leapStatus.isToday, false, "闰日 isToday=false");

    // 闰日纪念日：2024-02-29 当天
    var leapToday = service.getAnniversaryStatus("2024-02-29", "2024-02-29");
    assertEq(leapToday.isToday, true, "闰日当天 isToday=true");

    // ============================================================
    // CRUD 测试（通过 service 层）
    // ============================================================
    console.log("\n--- CRUD 测试 (service) ---");

    // 创建
    var created = await service.createAnniversary({ title: "测试纪念日", date: "2026-07-03", owner: "shared", mode: "count_up" });
    assertEq(!!created.id, true, "创建返回 id");
    assertEq(created.title, "测试纪念日", "创建 title");
    assertEq(created.date, "2026-07-03", "创建 date");
    assertEq(created.owner, "shared", "创建 owner=shared");
    assertEq(created.mode, "count_up", "创建 mode=count_up");
    assertEq(created.sendToContext, false, "创建默认 sendToContext=false");
    assertEq(created.deleted, false, "创建默认 deleted=false");
    var testId = created.id;

    // 列表
    var items = await service.listAnniversaries({ includeDeleted: false });
    assertEq(items.length, 1, "列表数量=1");

    // 获取单个
    var got = await service.getAnniversary(testId);
    assertEq(got.title, "测试纪念日", "获取 title");

    // 更新
    var updated = await service.updateAnniversary({ id: testId, title: "更新后", sendToContext: true });
    assertEq(updated.title, "更新后", "更新 title");
    assertEq(updated.sendToContext, true, "更新 sendToContext=true");

    // 切换上下文
    var toggled = await service.toggleContext(testId, false);
    assertEq(toggled.sendToContext, false, "切换 sendToContext=false");

    // 删除（软删除）
    var removed = await service.deleteAnniversary(testId);
    assertEq(removed.id, testId, "删除返回 id");

    // 删除后列表为空
    var itemsAfterDelete = await service.listAnniversaries({ includeDeleted: false });
    assertEq(itemsAfterDelete.length, 0, "删除后列表数量=0");

    // 删除后包含已删除的列表
    var itemsWithDeleted = await service.listAnniversaries({ includeDeleted: true });
    assertEq(itemsWithDeleted.length, 1, "包含已删除列表数量=1");

    // ============================================================
    // 工具子包测试（通过 tools 导出）
    // ============================================================
    console.log("\n--- 工具子包测试 ---");
    fileStore = {}; // 清空

    // add_anniversary
    var addResult = await tools.add_anniversary({ title: "认识纪念日", date: "2026-07-03", sendToContext: true });
    assertEq(addResult.success, true, "工具 add_anniversary success");
    assertEq(addResult.item.title, "认识纪念日", "工具 add item.title");
    var annivId = addResult.item.id;

    // list_anniversaries
    var listResult = await tools.list_anniversaries({});
    assertEq(listResult.success, true, "工具 list success");
    assertEq(listResult.count, 1, "工具 list count=1");

    // get_anniversary_status: 当天
    var statusResult = await tools.get_anniversary_status({ id: annivId, today: "2026-07-03" });
    assertEq(statusResult.success, true, "工具 status success");
    assertEq(statusResult.item.daysSince, 0, "工具 status daysSince=0");
    assertEq(statusResult.item.isToday, true, "工具 status isToday=true");

    // get_anniversary_status: 1年后
    var statusNext = await tools.get_anniversary_status({ id: annivId, today: "2027-07-03" });
    assertEq(statusNext.item.daysSince, 365, "工具 status 1年后 daysSince=365");
    assertEq(statusNext.item.isToday, true, "工具 status 1年后 isToday=true");

    // toggle_anniversary_context
    var toggleResult = await tools.toggle_anniversary_context({ id: annivId, enabled: false });
    assertEq(toggleResult.success, true, "工具 toggle success");
    assertEq(toggleResult.sendToContext, false, "工具 toggle sendToContext=false");

    // get_context_anniversaries: 关闭后应为空
    var ctxResult = await tools.get_context_anniversaries({ today: "2026-07-03" });
    assertEq(ctxResult.success, true, "工具 get_context success");
    assertEq(ctxResult.count, 0, "工具 get_context count=0（已关闭）");

    // 重新开启
    await tools.toggle_anniversary_context({ id: annivId, enabled: true });
    var ctxResult2 = await tools.get_context_anniversaries({ today: "2026-07-03" });
    assertEq(ctxResult2.count, 1, "工具 get_context count=1（已开启）");
    assertEq(ctxResult2.items[0].isToday, true, "工具 get_context items[0].isToday=true");

    // delete_anniversary
    var deleteResult = await tools.delete_anniversary({ id: annivId });
    assertEq(deleteResult.success, true, "工具 delete success");

    // 删除后 list 应为空
    var listAfterDelete = await tools.list_anniversaries({});
    assertEq(listAfterDelete.count, 0, "工具 delete 后 list count=0");

    // ============================================================
    // formatContextSummary 测试
    // ============================================================
    console.log("\n--- formatContextSummary 测试 ---");

    // both 模式：当天
    var summaryToday = service.formatContextSummary({ title: "测试", mode: "both" }, { isToday: true, daysSince: 0, daysUntilNext: 0, nextDate: "2026-07-03" });
    assertEq(summaryToday.length, 1, "both 当天 只输出1条");
    assertEq(summaryToday[0], "今天是「测试」的纪念日", "both 当天 文案");

    // both 模式：已过
    var summaryBoth = service.formatContextSummary({ title: "认识", mode: "both" }, { isToday: false, daysSince: 100, daysUntilNext: 265, nextDate: "2027-07-03" });
    assertEq(summaryBoth.length, 2, "both 已过 输出2条");
    assertEq(summaryBoth[0], "「认识」已过去 100 天", "both 已过去 文案");
    assertEq(summaryBoth[1], "距离下一次「认识」(2027-07-03) 还有 265 天", "both 倒计 文案");

    // count_up 模式：只输出已过
    var summaryUp = service.formatContextSummary({ title: "认识", mode: "count_up" }, { isToday: false, daysSince: 100, daysUntilNext: 265, nextDate: "2027-07-03" });
    assertEq(summaryUp.length, 1, "count_up 只输出1条");
    assertEq(summaryUp[0], "「认识」已过去 100 天", "count_up 文案");

    // count_down 模式：只输出倒计
    var summaryDown = service.formatContextSummary({ title: "认识", mode: "count_down" }, { isToday: false, daysSince: 100, daysUntilNext: 265, nextDate: "2027-07-03" });
    assertEq(summaryDown.length, 1, "count_down 只输出1条");
    assertEq(summaryDown[0], "距离下一次「认识」(2027-07-03) 还有 265 天", "count_down 文案");

    // ============================================================
    // systemPromptHook 测试
    // ============================================================
    console.log("\n--- systemPromptHook 测试 ---");

    // 非目标阶段 → null
    var hookNull = await service.systemPromptHook({ eventName: "other_stage" });
    assertEq(hookNull, null, "非目标阶段返回 null");

    // 无开启项目 → null
    fileStore = {};
    var hookEmpty = await service.systemPromptHook({ eventName: "after_compose_system_prompt", eventPayload: { systemPrompt: "原始提示词" } });
    assertEq(hookEmpty, null, "无开启项目返回 null");

    // 有开启项目 → 注入
    fileStore = {};
    await service.createAnniversary({ title: "认识纪念日", date: "2026-07-03", sendToContext: true });
    var hookInject = await service.systemPromptHook({ eventName: "after_compose_system_prompt", eventPayload: { systemPrompt: "原始提示词" } });
    assertEq(!!hookInject, true, "有开启项目返回非null");
    assertEq(hookInject.systemPrompt.indexOf("原始提示词") !== -1, true, "注入保留原始提示词");
    assertEq(hookInject.systemPrompt.indexOf("【纪念日提醒】") !== -1, true, "注入包含【纪念日提醒】");

    // event 字段兼容（event 而非 eventName）
    var hookEventField = await service.systemPromptHook({ event: "after_compose_system_prompt", eventPayload: { systemPrompt: "test" } });
    assertEq(!!hookEventField, true, "event 字段兼容");

    // ============================================================
    // 数据兼容性测试：基础版与 native_ui 版共享同一存储格式
    // ============================================================
    console.log("\n--- 数据兼容性测试 ---");
    fileStore = {};
    // 用 native_ui 版创建
    var compatItem = await service.createAnniversary({ title: "兼容测试", date: "2024-02-29", sendToContext: true });
    // 直接读取 JSON 验证字段结构
    var dataFile = ToolPkg.getConfigDir() + "/anniversaries.json";
    var rawData = fileStore[dataFile];
    var parsed = JSON.parse(rawData);
    assertEq(Array.isArray(parsed), true, "存储格式为数组");
    assertEq(parsed.length, 1, "存储数量=1");
    assertEq(parsed[0].title, "兼容测试", "存储字段 title");
    assertEq(parsed[0].date, "2024-02-29", "存储字段 date（闰日）");
    assertEq(parsed[0].sendToContext, true, "存储字段 sendToContext");
    assertEq(parsed[0].calendarType, "solar", "存储字段 calendarType=solar");
    assertEq(parsed[0].deleted, false, "存储字段 deleted=false");
    assertEq(!!parsed[0].createdAt, true, "存储字段 createdAt 存在");
    assertEq(!!parsed[0].updatedAt, true, "存储字段 updatedAt 存在");
    assertEq(!!parsed[0].id, true, "存储字段 id 存在");

    // ============================================================
    // 防剽窃防护测试
    // ============================================================
    console.log("\n--- 防剽窃防护测试 ---");
    fileStore = {};
    var guard = service.guard;

    // 水印自检：正常状态应通过
    var gi1 = guard.verifyIntegrity(null);
    assertEq(gi1.ok, true, "防护1 完整性校验通过");

    // 水印自检：篡改 _W.author 后应失败
    var origAuthor = guard._W.author;
    guard._W.author = "PLAGIARIST";
    var gi2 = guard.verifyIntegrity(null);
    assertEq(gi2.ok, false, "防护2 篡改author后校验失败");
    assertEq(gi2.reason, "WATERMARK_TAMPERED", "防护2 失败原因");
    guard._W.author = origAuthor; // 恢复

    // 水印自检：篡改 _W.salt 后应失败
    var origSalt = guard._W.salt;
    guard._W.salt = "stolen-salt";
    var gi3 = guard.verifyIntegrity(null);
    assertEq(gi3.ok, false, "防护3 篡改salt后校验失败");
    guard._W.salt = origSalt; // 恢复

    // 数据指纹盖章：createAnniversary 后记录应携带 _afp
    var createdG = await service.createAnniversary({ title: "指纹测试", date: "2026-07-03", sendToContext: true });
    assertEq(createdG._afp !== undefined, true, "防护4 创建记录含_afp指纹");
    assertEq(typeof createdG._afp, "number", "防护4 _afp为数值");

    // 验证磁盘上的记录也携带 _afp
    var dataFileG = ToolPkg.getConfigDir() + "/anniversaries.json";
    var rawG = fileStore[dataFileG];
    var parsedG = JSON.parse(rawG);
    assertEq(parsedG[0]._afp !== undefined, true, "防护5 磁盘记录含_afp");

    // 指纹校验：verifyDataFingerprint 对有效记录返回 true
    var fpOk = guard.verifyDataFingerprint(parsedG[0]);
    assertEq(fpOk, true, "防护6 指纹校验有效");

    // 指纹校验：篡改 _afp 后返回 false
    var tamperedItem = JSON.parse(JSON.stringify(parsedG[0]));
    tamperedItem._afp = 99999;
    var fpBad = guard.verifyDataFingerprint(tamperedItem);
    assertEq(fpBad, false, "防护7 篡改指纹校验失败");

    // 无指纹记录返回 false
    var noFp = guard.verifyDataFingerprint({ id: "x", createdAt: "y" });
    assertEq(noFp, false, "防护8 无指纹记录校验失败");

    // countValidFingerprints 统计
    var count = guard.countValidFingerprints(parsedG);
    assertEq(count, 1, "防护9 有效指纹计数=1");

    // 破坏性降级：篡改水印后调用工具应返回版权警告
    guard._W.author = "THIEF";
    var addDeg = await tools.add_anniversary({ title: "降级测试", date: "2026-07-03" });
    assertEq(addDeg.success, false, "防护10 篡改后工具降级");
    assertEq(addDeg.error.code, "INTEGRITY_VIOLATION", "防护10 降级错误码");
    assertEq(addDeg.error.message.indexOf("完整性校验失败") !== -1, true, "防护10 含版权警告");
    guard._W.author = origAuthor; // 恢复

    // 破坏性降级：list 工具也应降级
    guard._W.salt = "thief-salt";
    var listDeg = await tools.list_anniversaries({});
    assertEq(listDeg.success, false, "防护11 list工具降级");
    assertEq(listDeg.error.code, "INTEGRITY_VIOLATION", "防护11 降级错误码");
    guard._W.salt = origSalt; // 恢复

    // 恢复后工具应正常工作
    var listOk = await tools.list_anniversaries({});
    assertEq(listOk.success, true, "防护12 恢复后工具正常");

    // systemPromptHook 篡改后应静默返回 null
    guard._W.author = "THIEF";
    var hookDeg = await service.systemPromptHook({ eventName: "after_compose_system_prompt", eventPayload: { systemPrompt: "你是助手" } });
    assertEq(hookDeg, null, "防护13 篡改后钩子静默降级");
    guard._W.author = origAuthor; // 恢复

    // 哨兵检测：完整哨兵映射应通过
    var sentinelMap = {};
    var sentinels = guard._SENTINELS;
    for (var si = 0; si < sentinels.length; si++) { sentinelMap[sentinels[si]] = true; }
    var giS = guard.verifyIntegrity(sentinelMap);
    assertEq(giS.ok, true, "防护14 哨兵完整校验通过");

    // 哨兵检测：缺失哨兵应失败
    var sentinelMapBad = {};
    sentinelMapBad[sentinels[0]] = true;
    sentinelMapBad[sentinels[1]] = true;
    // 缺少第三个
    var giS2 = guard.verifyIntegrity(sentinelMapBad);
    assertEq(giS2.ok, false, "防护15 哨兵缺失校验失败");
    assertEq(giS2.reason, "SENTINEL_MISSING", "防护15 失败原因");

    // ============================================================
    // 汇总
    // ============================================================
    console.log("\n--- 测试完成 ---");
    if (process.exitCode === 1) {
        console.error("存在 FAIL 用例！");
    } else {
        console.log("全部通过 ✅");
    }
}

main().catch(function (e) {
    console.error("测试执行异常:", e);
    process.exitCode = 1;
});
