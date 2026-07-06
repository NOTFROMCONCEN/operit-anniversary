import { anniversaryInvoke } from "./bridge.js";
import {
  formatDateKey,
  getAnniversaryStatus,
  hasAnniversaryOnDate,
  pad2
} from "../../shared/date-utils.js";
import { buildAnniversaryCard, showToast, copyAnniversaryInfo } from "../../shared/ui-utils.js";
import { initTheme } from "./theme.js";
import { initSheet, openSheet } from "./sheet.js";

const AUTHOR_WATERMARK = Object.freeze({
  author: "奶油话梅糖",
  contact: "nyanon@vip.qq.com",
  origin: "daysmatter-web-ui",
  year: 2026
});
document.documentElement.dataset.originFingerprint = `${AUTHOR_WATERMARK.origin}:${AUTHOR_WATERMARK.contact}:${AUTHOR_WATERMARK.year}`;

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

let view = new Date();
let selected = formatDateKey(view);
let snapshot = { items: [], today: formatDateKey(new Date()), version: "" };

const $ = (selector) => document.querySelector(selector);

async function loadSnapshot() {
  try {
    const result = await anniversaryInvoke("list_snapshot", {});
    if (!result.success) {
      showToast(result.error?.message || "加载失败", { type: "error" });
      render();
      return;
    }
    snapshot = result.snapshot || result;
    render();
  } catch (e) {
    console.error("[App] 加载快照失败:", e);
    showToast("数据加载失败，已切换到离线模式", { type: "warning", duration: 4000 });
    render();
  }
}

/* ---------- 日历 ---------- */
function renderCalendar() {
  const year = view.getFullYear();
  const month = view.getMonth();
  $("#monthTitle").textContent = `${monthNames[month]}, ${year}`;

  const days = $("#days");
  days.innerHTML = "";

  const weekStart = document.documentElement.dataset.weekStart === "monday" ? 1 : 0;
  const firstWeekdayRaw = new Date(year, month, 1).getDay();
  const firstWeekday = (firstWeekdayRaw - weekStart + 7) % 7;
  const lastDate = new Date(year, month + 1, 0).getDate();

  // 星期标题
  const weekLabels = weekStart === 1
    ? ["一", "二", "三", "四", "五", "六", "日"]
    : ["日", "一", "二", "三", "四", "五", "六"];
  const weekRow = $(".week");
  if (weekRow) {
    weekRow.innerHTML = "";
    weekLabels.forEach((label) => {
      const span = document.createElement("span");
      span.textContent = label;
      weekRow.append(span);
    });
  }

  for (let i = 0; i < firstWeekday; i++) {
    const blank = document.createElement("div");
    blank.className = "day blank";
    days.append(blank);
  }

  const todayYMD = snapshot.today || formatDateKey(new Date());

  for (let day = 1; day <= lastDate; day++) {
    const key = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    const cell = document.createElement("button");
    cell.className = "day";
    cell.textContent = day;
    cell.type = "button";

    if (key === selected) cell.classList.add("selected");

    const items = snapshot.items || [];

    // 检测纪念日落在此日（支持 repeat 真实语义）
    const hasAnniv = items.some((it) => {
      return hasAnniversaryOnDate(it, key, todayYMD);
    });

    // 检测临近（仅 yearly 与 monthly 参与 upcoming；once 不参与跨年/跨月倒计时）
    const hasUpcoming = items.some((it) => {
      if (it.deleted) return false;
      const repeat = it.repeat || "yearly";
      if (repeat === "once") return false;
      const status = getAnniversaryStatus(it.date, todayYMD);
      return status.nextDate === key && status.daysUntilNext <= 7 && status.daysUntilNext >= 0;
    });

    if (hasAnniv) cell.classList.add("has-task");
    if (hasUpcoming) cell.classList.add("has-note");

    cell.addEventListener("click", () => {
      selected = key;
      render();
      $("#today").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    days.append(cell);
  }
}

/* ---------- 当日纪念 ---------- */
function renderToday() {
  const list = $("#todayList");
  const todayYMD = snapshot.today || formatDateKey(new Date());
  const items = (snapshot.items || []).filter((it) => {
    return hasAnniversaryOnDate(it, selected, todayYMD);
  });
  list.innerHTML = "";

  const todayTitle = $("#today .section-title");
  if (todayTitle) {
    const isToday = selected === todayYMD;
    const [y, m, d] = selected.split("-");
    if (isToday) {
      todayTitle.innerHTML = `<i class="dot blue"></i>今日纪念 <span style="color:var(--text-muted);font-size:0.7em">(${selected})</span>`;
    } else {
      todayTitle.innerHTML = `<i class="dot blue"></i>${m}月${d}日 <span style="color:var(--text-muted);font-size:0.7em">(${selected})</span>`;
    }
  }

  if (!items.length) {
    const p = document.createElement("div");
    p.className = "empty-state";
    p.innerHTML = `
      <p style="color:var(--text-muted);margin-bottom:12px;">${selected === todayYMD
        ? "今天还没有纪念提醒。"
        : "这一天还没有记录。"}</p>
      <button class="soft-btn" onclick="document.getElementById('addAnniversary').click()">＋ 为这天新建</button>
    `;
    list.append(p);
    return;
  }

  items.forEach((item) => {
    const onPin = async () => {
      try {
        const result = await anniversaryInvoke("toggle_pin", { id: item.id });
        if (!result.success) {
        showToast(result.error?.message || "置顶失败", { type: "error" });
          return;
        }
        snapshot = result.snapshot;
        render();
        showToast(result.pinned ? "已置顶到列表前方" : "已取消置顶", { type: "success" });
      } catch (e) {
        console.error("[App] 置顶失败:", e);
        showToast("置顶失败，请重试", { type: "error" });
      }
    };

    const onShare = async () => {
      const status = getAnniversaryStatus(item.date, todayYMD);
      const ok = await copyAnniversaryInfo(item, status);
      showToast(ok ? "纪念信息已复制" : "复制失败，请重试", { type: ok ? "success" : "error" });
    };

    const card = buildAnniversaryCard(item, {
      todayYMD,
      onClick: () => openSheet(item, selected),
      onPin,
      onShare,
      showActions: true
    });
    list.append(card);
  });
}

/* ---------- 即将到来 ---------- */
function renderUpcoming() {
  const container = $("#upcomingList");
  const section = $("#upcoming");
  if (!container || !section) return;

  // 尊重用户布局设置
  if (document.documentElement.dataset.upcoming === "hidden") {
    section.style.display = "none";
    return;
  }
  section.style.display = "";

  container.innerHTML = "";

  const todayYMD = snapshot.today || formatDateKey(new Date());
  const items = (snapshot.items || []).filter((it) => {
    if (it.deleted) return false;
    const repeat = it.repeat || "yearly";
    if (repeat === "once") return false;
    const status = getAnniversaryStatus(it.date, todayYMD);
    return status.daysUntilNext >= 0 && status.daysUntilNext <= 7;
  }).sort((a, b) => {
    const sa = getAnniversaryStatus(a.date, todayYMD);
    const sb = getAnniversaryStatus(b.date, todayYMD);
    return sa.daysUntilNext - sb.daysUntilNext;
  });

  container.classList.toggle("has-items", items.length > 0);

  if (!items.length) {
    container.innerHTML = `
      <div class="upcoming-empty">
        <span class="upcoming-empty-label">未来 7 天</span>
        <strong>没有临近纪念</strong>
        <span>这一周暂时很安静。你可以先从日历里选一天，或者新建一条记录。</span>
      </div>
    `;
    return;
  }

  items.forEach((item) => {
    const status = getAnniversaryStatus(item.date, todayYMD);
    const el = document.createElement("div");
    el.className = "upcoming-chip";
    const urgent = status.daysUntilNext <= 1;
    el.innerHTML = `
      <span class="upcoming-dot ${urgent ? "urgent" : ""}"></span>
      <span class="upcoming-title">${item.title}</span>
      <span class="upcoming-meta">${status.isToday ? "今天" : `${status.daysUntilNext} 天后`} · ${status.nextDate}</span>
    `;
    el.addEventListener("click", () => {
      selected = status.nextDate;
      render();
      $("#today").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    container.append(el);
  });
}

/* ---------- 总渲染 ---------- */
function render() {
  renderCalendar();
  renderToday();
  renderUpcoming();

  const todayYMD = snapshot.today || formatDateKey(new Date());
  const hasAny = (snapshot.items || []).length;
  const hasSelected = (snapshot.items || []).some((it) => {
    return hasAnniversaryOnDate(it, selected, todayYMD);
  });

  $("#emptyTip").textContent = hasSelected
    ? `你正在看 ${selected}。`
    : hasAny
      ? "这一天暂无记录，但其他日期仍有纪念。"
      : "选中日期后显示当天记录。";
}

/* ---------- 导入导出 ---------- */
async function exportData() {
  try {
    const result = await anniversaryInvoke("export_data", {});
    if (!result.success) {
      showToast(result.error?.message || "导出失败", { type: "error" });
      return;
    }
    const blob = new Blob([result.data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daysmatter-backup-${formatDateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已导出 ${result.count} 条记录`, { type: "success" });
  } catch (e) {
    console.error("[App] 导出失败:", e);
    showToast("导出失败", { type: "error" });
  }
}

async function importData(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const result = await anniversaryInvoke("import_data", { data: text });
    if (!result.success) {
      showToast(result.error?.message || "导入失败", { type: "error" });
      return;
    }
    snapshot = result.snapshot;
    render();
    showToast(`导入完成：${result.imported} 条成功，${result.skipped} 条跳过`, { type: "success", duration: 3000 });
  } catch (e) {
    console.error("[App] 导入失败:", e);
    showToast("导入失败，请检查文件格式", { type: "error" });
  }
}

/* ---------- 键盘 ---------- */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const sheet = $("#anniversarySheet");
    if (sheet && sheet.open) { sheet.close(); return; }
    const drawer = $("#drawer");
    if (drawer && drawer.classList.contains("open")) {
      drawer.classList.remove("open");
      $("#drawerMask").classList.remove("open");
      return;
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "n") {
    e.preventDefault();
    openSheet(null, selected);
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "/") {
    const searchInput = $("#searchInput");
    if (searchInput) { e.preventDefault(); searchInput.focus(); }
  }

  if (e.key === "ArrowLeft" && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const active = document.activeElement;
    if (!active || (active.tagName !== "INPUT" && active.tagName !== "TEXTAREA")) {
      view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
      renderCalendar();
    }
  }
  if (e.key === "ArrowRight" && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const active = document.activeElement;
    if (!active || (active.tagName !== "INPUT" && active.tagName !== "TEXTAREA")) {
      view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
      renderCalendar();
    }
  }
});

/* ---------- 触控 ---------- */
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener("touchend", (e) => {
  const endX = e.changedTouches[0].screenX;
  const endY = e.changedTouches[0].screenY;
  const deltaX = endX - touchStartX;
  const deltaY = endY - touchStartY;

  if (Math.abs(deltaX) > 80 && Math.abs(deltaY) < 60) {
    const drawer = $("#drawer");
    const sheet = $("#anniversarySheet");

    if (deltaX > 0 && touchStartX < 40 && drawer && !drawer.classList.contains("open")) {
      drawer.classList.add("open");
      $("#drawerMask").classList.add("open");
      return;
    }
    if (deltaX < 0 && drawer && drawer.classList.contains("open")) {
      drawer.classList.remove("open");
      $("#drawerMask").classList.remove("open");
      return;
    }
    if (deltaX < -60 && sheet && sheet.open) { sheet.close(); return; }

    const calendar = $("#calendar");
    if (calendar && calendar.contains(e.target)) {
      if (deltaX > 60) {
        view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
        renderCalendar();
      } else if (deltaX < -60) {
        view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
        renderCalendar();
      }
    }
  }
}, { passive: true });

/* ---------- 网络状态 ---------- */
function updateOnlineStatus() {
  const offline = !navigator.onLine;
  if (offline) {
    showToast("当前处于离线状态，数据仅保存在本地", { type: "warning", duration: 4000 });
  }
  document.body.classList.toggle("is-offline", offline);
}
window.addEventListener("online", () => {
  showToast("网络已恢复", { type: "success" });
  loadSnapshot();
});
window.addEventListener("offline", () => {
  showToast("网络已断开，切换到本地模式", { type: "warning", duration: 4000 });
});
updateOnlineStatus();

/* ---------- 错误边界 ---------- */
window.addEventListener("error", (e) => {
  console.error("[App] 全局错误:", e.error);
  showToast("发生未知错误，请刷新页面重试", { type: "error", duration: 4000 });
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("[App] 未处理的 Promise 拒绝:", e.reason);
  showToast("异步操作失败，请检查网络或刷新", { type: "error", duration: 4000 });
});

/* ---------- 事件绑定 ---------- */
$("#prevMonth").addEventListener("click", () => {
  view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
  renderCalendar();
});

$("#nextMonth").addEventListener("click", () => {
  view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
  renderCalendar();
});

$("#todayBtn").addEventListener("click", () => {
  const today = new Date();
  view = new Date(today.getFullYear(), today.getMonth(), 1);
  selected = formatDateKey(today);
  render();
});

$("#addAnniversary").addEventListener("click", () => openSheet(null, selected));

$("#menuBtn").addEventListener("click", () => {
  $("#drawer").classList.add("open");
  $("#drawerMask").classList.add("open");
});

$("#drawerMask").addEventListener("click", () => {
  $("#drawer").classList.remove("open");
  $("#drawerMask").classList.remove("open");
});

document.querySelectorAll(".drawer a").forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href") || "";
    if (href.startsWith("#")) {
      event.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: "smooth" });
      $("#drawer").classList.remove("open");
      $("#drawerMask").classList.remove("open");
    }
  });
});

$("#exportDataBtn")?.addEventListener("click", exportData);
$("#importDataBtn")?.addEventListener("click", () => $("#importFileInput")?.click());
$("#importFileInput")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) importData(file);
  e.target.value = "";
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") loadSnapshot();
});

/* ---------- 初始化 ---------- */
initSheet(
  (newSnapshot) => { snapshot = newSnapshot; render(); },
  (newSnapshot) => { snapshot = newSnapshot; render(); }
);

try { initTheme(); } catch (e) { console.error("主题初始化失败", e); }
try { loadSnapshot(); } catch (e) { console.error("数据加载失败", e); showToast("数据加载失败", { type: "error" }); }
