import { anniversaryInvoke } from "./bridge.js";
import {
  formatDateKey,
  getAnniversaryStatus,
  buildAnniversaryCard,
  showToast,
  copyAnniversaryInfo
} from "./utils.js";
import { initTheme } from "./theme.js";
import { initSheet, openSheet } from "./sheet.js";

const AUTHOR_WATERMARK = Object.freeze({
  author: "奶油话梅糖",
  contact: "nyanon@vip.qq.com",
  origin: "daysmatter-web-ui",
  year: 2026
});
document.documentElement.dataset.originFingerprint = `${AUTHOR_WATERMARK.origin}:${AUTHOR_WATERMARK.contact}:${AUTHOR_WATERMARK.year}`;

const SORT_LABELS = { proximity: "按临近排序", name: "按名称排序", date: "按日期排序" };

let snapshot = { items: [], today: formatDateKey(new Date()), version: "" };
let editingId = "";
let searchQuery = "";
let sortMode = "proximity";
let batchMode = false;
let selectedIds = new Set();
let filterOwner = "";
let filterRepeat = "";
let filterPinned = "";
let searchDebounceTimer = null;

const $ = (selector) => document.querySelector(selector);

async function loadSnapshot() {
  try {
    const result = await anniversaryInvoke("list_snapshot", {});
    if (!result.success) {
      showToast(result.error?.message || "加载失败", { type: "error" });
      return;
    }
    snapshot = result.snapshot || result;
    render();
  } catch (e) {
    console.error("[All] 加载失败:", e);
    showToast("数据加载失败", { type: "error" });
  }
}

function getFilteredAndSorted() {
  const todayYMD = snapshot.today || formatDateKey(new Date());
  let items = [...(snapshot.items || [])];

  // 文本搜索
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    items = items.filter((it) =>
      it.title.toLowerCase().includes(q) ||
      (it.description || "").toLowerCase().includes(q) ||
      it.date.includes(q)
    );
  }

  // 归属筛选
  if (filterOwner) {
    items = items.filter((it) => it.owner === filterOwner);
  }

  // 重复筛选
  if (filterRepeat) {
    items = items.filter((it) => (it.repeat || "yearly") === filterRepeat);
  }

  // 置顶筛选
  if (filterPinned === "pinned") {
    items = items.filter((it) => it.pinned === true);
  }

  // 排序：置顶永远在最前，然后按当前排序模式
  const sortFn = (a, b) => {
    const pa = a.pinned === true ? 1 : 0;
    const pb = b.pinned === true ? 1 : 0;
    if (pa !== pb) return pb - pa;

    if (sortMode === "proximity") {
      const sa = getAnniversaryStatus(a.date, todayYMD);
      const sb = getAnniversaryStatus(b.date, todayYMD);
      return sa.daysUntilNext - sb.daysUntilNext;
    } else if (sortMode === "name") {
      return a.title.localeCompare(b.title, "zh");
    } else if (sortMode === "date") {
      return a.date.localeCompare(b.date);
    }
    return 0;
  };

  items.sort(sortFn);
  return items;
}

function render() {
  const list = $("#allList");
  const items = getFilteredAndSorted();

  const total = (snapshot.items || []).length;
  const filtered = items.length;
  const isSearching = searchQuery.trim().length > 0;
  $("#countSummary").textContent = isSearching
    ? `找到 ${filtered} 条，共 ${total} 条`
    : total ? `共保存 ${total} 条纪念` : "还没有纪念记录";

  list.innerHTML = "";

  if (batchMode) {
    list.classList.add("batch-mode");
    $("#batchBar").style.display = "flex";
  } else {
    list.classList.remove("batch-mode");
    $("#batchBar").style.display = "none";
  }

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <p style="color:var(--text-muted);margin-bottom:8px;">${isSearching ? "没有找到匹配记录。" : "还没有保存任何纪念。"}</p>
      ${isSearching ? "" : '<p style="color:var(--text-dim);font-size:13px;">点击右下角按钮，记录第一个重要日子。</p>'}
    `;
    list.append(empty);
    return;
  }

  const todayYMD = snapshot.today || formatDateKey(new Date());

  items.forEach((item) => {
    const onClick = batchMode
      ? () => toggleBatchSelect(item.id)
      : () => openSheet(item);

    const onPin = async () => {
      try {
        const result = await anniversaryInvoke("toggle_pin", { id: item.id });
        if (!result.success) {
          showToast(result.error?.message || "操作失败", { type: "error" });
          return;
        }
        snapshot = result.snapshot;
        render();
        showToast(result.pinned ? "已置顶" : "已取消置顶", { type: "success" });
      } catch (e) {
        console.error("[All] 置顶失败:", e);
        showToast("操作失败", { type: "error" });
      }
    };

    const onShare = async () => {
      const status = getAnniversaryStatus(item.date, todayYMD);
      const ok = await copyAnniversaryInfo(item, status);
      showToast(ok ? "已复制到剪贴板" : "复制失败", { type: ok ? "success" : "error" });
    };

    const card = buildAnniversaryCard(item, {
      todayYMD,
      onClick,
      onPin,
      onShare,
      showTags: true,
      showDescription: true,
      showActions: !batchMode
    });

    if (batchMode) {
      const checkWrapper = document.createElement("div");
      checkWrapper.className = "batch-check";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selectedIds.has(item.id);
      checkbox.dataset.id = item.id;
      checkbox.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleBatchSelect(item.id);
      });
      checkWrapper.appendChild(checkbox);
      card.insertBefore(checkWrapper, card.firstChild);
      if (selectedIds.has(item.id)) {
        card.style.borderColor = "var(--primary)";
        card.style.boxShadow = "0 0 18px var(--primary-glow)";
      }
    }

    list.append(card);
  });
}

function toggleBatchSelect(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  render();
}

async function batchDelete() {
  if (!selectedIds.size) return;
  if (!confirm(`确定删除选中的 ${selectedIds.size} 条纪念吗？此操作不可恢复。`)) return;

  try {
    const result = await anniversaryInvoke("batch_delete", { ids: Array.from(selectedIds) });
    if (!result.success) {
      showToast(result.error?.message || "批量删除失败", { type: "error" });
      return;
    }
    snapshot = result.snapshot;
    selectedIds.clear();
    batchMode = false;
    render();
    showToast(`已删除 ${result.deletedCount} 条纪念`, { type: "success" });
  } catch (e) {
    console.error("[All] 批量删除失败:", e);
    showToast("批量删除失败", { type: "error" });
  }
}

/* ---------- 键盘 ---------- */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const sheet = $("#anniversarySheet");
    if (sheet && sheet.open) { sheet.close(); return; }
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "n") {
    e.preventDefault();
    openSheet();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "/") {
    e.preventDefault();
    $("#searchInput")?.focus();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
    e.preventDefault();
    batchMode = !batchMode;
    if (!batchMode) selectedIds.clear();
    render();
    showToast(batchMode ? "已进入批量管理模式" : "已退出批量管理模式");
    return;
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
    const sheet = $("#anniversarySheet");
    if (deltaX < -60 && sheet && sheet.open) { sheet.close(); }
  }
}, { passive: true });

/* ---------- 网络状态 ---------- */
window.addEventListener("online", () => {
  showToast("网络已恢复", { type: "success" });
  loadSnapshot();
});
window.addEventListener("offline", () => {
  showToast("网络已断开，切换到本地模式", { type: "warning", duration: 4000 });
});

/* ---------- 错误边界 ---------- */
window.addEventListener("error", (e) => {
  console.error("[All] 全局错误:", e.error);
  showToast("发生未知错误，请刷新页面重试", { type: "error", duration: 4000 });
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("[All] 未处理的 Promise 拒绝:", e.reason);
  showToast("异步操作失败，请检查网络或刷新", { type: "error", duration: 4000 });
});

/* ---------- 事件 ---------- */
$("#addAnniversary").addEventListener("click", () => openSheet());

$("#searchInput").addEventListener("input", (event) => {
  searchQuery = event.target.value;
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => render(), 180);
});

$("#filterOwner")?.addEventListener("change", (e) => {
  filterOwner = e.target.value;
  render();
});

$("#filterRepeat")?.addEventListener("change", (e) => {
  filterRepeat = e.target.value;
  render();
});

$("#filterPinned")?.addEventListener("change", (e) => {
  filterPinned = e.target.value;
  render();
});

$("#sortBtn").addEventListener("click", () => {
  const modes = ["proximity", "name", "date"];
  const idx = modes.indexOf(sortMode);
  sortMode = modes[(idx + 1) % modes.length];
  $("#sortBtn").textContent = sortMode === "proximity" ? "⇅" : sortMode === "name" ? "↓" : "📅";
  render();
  showToast(SORT_LABELS[sortMode]);
});

$("#batchDeleteBtn")?.addEventListener("click", batchDelete);
$("#batchCancelBtn")?.addEventListener("click", () => {
  batchMode = false;
  selectedIds.clear();
  render();
});

$("#batchToggleBtn")?.addEventListener("click", () => {
  batchMode = !batchMode;
  if (!batchMode) selectedIds.clear();
  render();
  showToast(batchMode ? "已进入批量管理模式" : "已退出批量管理模式");
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") loadSnapshot();
});

/* ---------- 初始化 ---------- */
initSheet(
  (newSnapshot) => { snapshot = newSnapshot; render(); },
  (newSnapshot) => { snapshot = newSnapshot; render(); }
);

initTheme();
try { loadSnapshot(); } catch (e) {
  console.error("数据加载失败", e);
  showToast("数据加载失败", { type: "error" });
}
