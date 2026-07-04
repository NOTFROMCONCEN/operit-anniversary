"use strict";
// 静态 Web UI 结构自测：验证实时 bridge、mock fallback 与轮询入口存在。
// 用法: node simple_web_ui/_selftest.js

var fs = require("fs");
var path = require("path");

var htmlPath = path.join(__dirname, "simple_index.html");
var html = fs.readFileSync(htmlPath, "utf8");

function assertIncludes(pattern, label) {
    if (html.indexOf(pattern) === -1) {
        console.error("FAIL: " + label + "\n  missing: " + pattern);
        process.exitCode = 1;
    } else {
        console.log("PASS: " + label);
    }
}

function assertMatch(regex, label) {
    if (!regex.test(html)) {
        console.error("FAIL: " + label + "\n  missing pattern: " + regex);
        process.exitCode = 1;
    } else {
        console.log("PASS: " + label);
    }
}

console.log("\n--- Web UI 结构自测 ---");
assertIncludes("window.AnniversaryBridge", "支持宿主 AnniversaryBridge");
assertIncludes("window.OperitAnniversaryBridge", "支持 OperitAnniversaryBridge 别名");
assertIncludes("const MockBridge", "包含浏览器 MockBridge");
assertIncludes("list_snapshot", "使用 list_snapshot 快照接口");
assertIncludes("toggle_context", "使用 toggle_context 接口");
assertIncludes("expectedVersion", "提交变更带 expectedVersion");
assertIncludes("setInterval", "包含实时轮询");
assertIncludes("document.visibilityState", "页面隐藏时控制轮询");
assertIncludes("window.AnniversaryWebUI", "暴露调试刷新入口");
assertMatch(/POLL_MS\s*=\s*2000/, "轮询间隔为 2000ms");

if (process.exitCode === 1) {
    console.error("存在 FAIL 用例！");
} else {
    console.log("全部通过");
}
