// ============================================================
// Copyright (c) 2026 奶油话梅糖 <nyanon@vip.qq.com> (MIT)
// 纪念日插件 - UI 渲染公共库 (shared/ui-utils.js)
// 供 Web UI 层调用
// ============================================================

import { MODE_LABEL, OWNER_LABEL, MILESTONE_DAYS, getNextMilestone, isMilestoneToday } from "./constants.js";
import { getAnniversaryStatus } from "./date-utils.js";

export { OWNER_LABEL as ownerLabel, MODE_LABEL as modeLabel } from "./constants.js";

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

// --- 构建纪念日状态文案 ---
export function buildStatusText(item, status) {
  const text = [];
  if (status.isToday) text.push("今天是纪念日！");
  if (item.mode === "both" || item.mode === "count_up") {
    text.push(`已过去 ${status.daysSince} 天`);
  }
  if ((item.mode === "both" || item.mode === "count_down") && !status.isToday) {
    text.push(`距下次 ${status.daysUntilNext} 天（${status.nextDate}）`);
  } else if (item.mode === "count_down" && status.isToday) {
    text.push("就是今天");
  }
  return text.join(" · ");
}

// --- 构建大数字显示（返回 { value, label, color }）---
export function buildMetricDisplay(item, status) {
  // 今天到期的纪念日
  if (status.isToday) {
    return {
      value: "今",
      label: "纪念日",
      theme: "error"   // 用红色高亮
    };
  }

  // 倒计模式
  if (item.mode === "count_down" && status.daysUntilNext > 0) {
    return {
      value: status.daysUntilNext,
      label: "天后",
      urgency: status.daysUntilNext <= 3 ? "high" : status.daysUntilNext <= 7 ? "medium" : "low"
    };
  }

  // 正向模式
  if (item.mode === "count_up" && status.daysSince > 0) {
    return {
      value: status.daysSince,
      label: "天已过",
      urgency: "done"
    };
  }

  // 双向模式：优先显示 countdown，如果很近
  if (item.mode === "both") {
    if (status.daysUntilNext <= 30) {
      return {
        value: status.daysUntilNext,
        label: "天后",
        urgency: status.daysUntilNext <= 3 ? "high" : status.daysUntilNext <= 7 ? "medium" : "low"
      };
    }
    return {
      value: status.daysSince,
      label: "天已过",
      urgency: "done"
    };
  }

  return { value: "—", label: "", urgency: "low" };
}

// --- 获取 CSS 颜色类名（供 Web UI 使用）---
export function getUrgencyColor(urgency) {
  const map = {
    high: "hsl(0, 90%, 60%)",      // 红：3天内
    medium: "hsl(30, 90%, 55%)",   // 橙：7天内
    low: "hsl(217, 90%, 60%)",     // 蓝：其他
    done: "hsl(150, 75%, 55%)",    // 绿：正计数
    error: "hsl(340, 85%, 65%)"     // 粉红：今天
  };
  return map[urgency] || map.low;
}

// --- DOM 创建辅助 ---
export function createElement(tag, className, attrs = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

// --- Toast 组件（支持队列、类型、自定义时长）---
export function showToast(message, options = {}) {
  const {
    container = document.querySelector("#app"),
    duration = 2400,
    type = "default" // default | success | error | warning
  } = options;
  if (!container) return;

  // 清理旧 toast
  const old = container.querySelector(".toast");
  if (old) old.remove();

  const node = document.createElement("div");
  node.className = `toast toast-${type}`;
  node.textContent = message;
  container.appendChild(node);

  // 强制重绘后触发动画
  requestAnimationFrame(() => {
    requestAnimationFrame(() => node.classList.add("show"));
  });

  const remove = () => {
    node.classList.remove("show");
    setTimeout(() => node.remove(), 300);
  };

  const timer = setTimeout(remove, duration);

  // 点击提前关闭
  node.addEventListener("click", () => {
    clearTimeout(timer);
    remove();
  });

  return node;
}

// --- 里程碑提示文案 ---
export function buildMilestoneHint(daysSince) {
  if (isMilestoneToday(daysSince)) {
    return { hint: `🎉 今天是第 ${daysSince} 天里程碑！`, important: true };
  }
  const next = getNextMilestone(daysSince);
  if (next && next.remaining <= 7) {
    return { hint: `还有 ${next.remaining} 天到达第 ${next.milestone} 天`, important: true };
  }
  if (next) {
    return { hint: `距离第 ${next.milestone} 天还有 ${next.remaining} 天`, important: false };
  }
  return null;
}

// --- 纪念日信息复制到剪贴板 ---
export async function copyAnniversaryInfo(item, status) {
  const text = [
    `📅 ${item.title}`,
    `日期：${item.date}`,
    status ? (status.isToday ? "今天是纪念日！" : `已过去 ${status.daysSince} 天 · 距下次 ${status.daysUntilNext} 天`) : "",
    item.description ? `备注：${item.description}` : ""
  ].filter(Boolean).join("\n");

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // 降级方案
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    console.error("[UI] 复制失败:", e);
    return false;
  }
}

// --- 统一构建纪念日卡片 ---
export function buildAnniversaryCard(item, options = {}) {
  const {
    todayYMD,
    onClick,
    onPin,
    onShare,
    showTags = true,
    showDescription = true,
    showActions = true
  } = options;

  const status = item.status || (todayYMD ? getAnniversaryStatus(item.date, todayYMD) : null);
  const metric = status ? buildMetricDisplay(item, status) : { value: "—", label: "", urgency: "low" };
  const color = getUrgencyColor(metric.urgency || metric.theme || "low");
  const milestone = status ? buildMilestoneHint(status.daysSince) : null;

  const card = document.createElement("article");
  card.className = "anniversary-card" + (item.pinned ? " is-pinned" : "");

  const isToday = status?.isToday
    ? `<div class="metric-today">今</div>`
    : `<div class="metric-circle" style="background:${color}; box-shadow:0 0 20px ${color}50">
        <span class="metric-value">${metric.value}</span>
        <span class="metric-label">${metric.label}</span>
       </div>`;

  const pinIcon = item.pinned
    ? `<span class="pin-badge" title="已置顶">📌</span>`
    : "";

  const tags = showTags ? `
    <div class="meta">
      <span class="tag">${escapeHtml(item.date)}</span>
      <span class="tag">${escapeHtml(OWNER_LABEL[item.owner] || item.owner)}</span>
      <span class="tag">${escapeHtml(MODE_LABEL[item.mode] || item.mode)}</span>
      ${item.sendToContext ? '<span class="tag active">已发送上下文</span>' : ""}
      ${item.repeat && item.repeat !== "yearly" ? `<span class="tag">${escapeHtml(item.repeat === "monthly" ? "每月" : "单次")}</span>` : ""}
    </div>
  ` : "";

  const desc = showDescription && item.description ? `<div class="description">${escapeHtml(item.description)}</div>` : "";
  const milestoneHtml = milestone ? `<div class="milestone-hint ${milestone.important ? "important" : ""}">${escapeHtml(milestone.hint)}</div>` : "";

  const actions = showActions ? `
    <div class="card-actions">
      <button type="button" class="icon-btn pin-btn" title="${item.pinned ? "取消置顶" : "置顶"}">${item.pinned ? "📌" : "📍"}</button>
      <button type="button" class="icon-btn share-btn" title="复制信息">🔗</button>
    </div>
  ` : "";

  card.innerHTML = `
    <div class="card-content">
      <header>
        <h3>${escapeHtml(item.title)} ${pinIcon}</h3>
      </header>
      ${tags}
      <div class="status">${status ? buildStatusText(item, status) : ""}</div>
      ${milestoneHtml}
      ${desc}
      ${actions}
    </div>
    <div class="card-metric">
      ${isToday}
    </div>
  `;

  if (typeof onClick === "function") {
    card.addEventListener("click", (e) => {
      // 如果点击的是操作按钮，不触发卡片点击
      if (e.target.closest(".card-actions, .icon-btn")) return;
      onClick(e);
    });
  }

  const pinBtn = card.querySelector(".pin-btn");
  if (pinBtn && typeof onPin === "function") {
    pinBtn.addEventListener("click", (e) => { e.stopPropagation(); onPin(item); });
  }

  const shareBtn = card.querySelector(".share-btn");
  if (shareBtn && typeof onShare === "function") {
    shareBtn.addEventListener("click", (e) => { e.stopPropagation(); onShare(item); });
  }

  return card;
}
