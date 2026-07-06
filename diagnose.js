// ============================================================
// 页面诊断工具 - 在浏览器控制台运行
// 用法：F12 打开控制台，粘贴运行
// ============================================================
(function diagnose() {
  const issues = [];
  const checks = {
    "ESM 可用": () => typeof import === "function",
    "browser": () => typeof window !== "undefined",
    "localStorage": () => typeof localStorage !== "undefined",
    "app.js 加载": () => !!document.querySelector('script[src*="app.js"]'),
    "sheet.js 已注册": () => window._sheetInitialized !== undefined || true,
    "theme.js 已注册": () => document.documentElement.style.getPropertyValue("--base-hue") !== "",
  };

  const elements = {
    "#app": "主容器",
    "#drawer": "侧边抽屉",
    "#calendar": "日历区域",
    "#days": "日历日期容器",
    "#today": "当日纪念区域",
    "#todayList": "当日纪念列表",
    "#upcoming": "即将到来区域",
    "#upcomingList": "即将到来列表",
    "#anniversarySheet": "底部表单弹窗",
  };

  console.log("=== DaysMatter 页面诊断 ===");

  for (const [name, check] of Object.entries(checks)) {
    try { console.log(`  ${name}: ${check() ? "✅" : "❌"}`); }
    catch(e) { console.log(`  ${name}: ❌ ${e.message}`); }
  }

  console.log("=== DOM 元素检查 ===");
  for (const [sel, label] of Object.entries(elements)) {
    const el = document.querySelector(sel);
    console.log(`  ${label} (${sel}): ${el ? "✅ 存在" : "❌ 缺失"}`);
    if (!el) issues.push(`${label} 缺失`);
  }

  console.log("=== JS 模块检查 ===");
  console.log(`  script[type="module"]: ${document.querySelectorAll('script[type="module"]').length} 个`);
  console.log(`  当前协议: ${location.protocol}`);
  if (location.protocol === "file:") {
    console.log("  ⚠️ 警告：通过 file:// 协议打开，ES Modules 可能无法加载！");
    console.log("  请使用 HTTP 服务器访问：http://localhost:8080/simple_web_ui_2/operit-daysmatter-shell/");
    issues.push("file:// 协议导致 ES Modules 加载失败");
  }

  if (issues.length) {
    console.log(`=== 发现 ${issues.length} 个问题 ===`);
    issues.forEach(i => console.log(`  ❌ ${i}`));
  } else {
    console.log("=== 未发现问题 ✅ ===");
  }
})();
