// ============================================================
// Copyright (c) 2026 奶油话梅糖 <nyanon@vip.qq.com> (MIT)
// 纪念日插件 - 日期计算公共库 (shared/date-utils.js)
// 纯函数，无副作用，兼容浏览器 + QuickJS 环境
// ============================================================

const TZ_OFFSET_MIN = 8 * 60; // Asia/Shanghai = UTC+8
const MS_PER_DAY = 86400000;

// --- 基础工具 ---
export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

export function parseYMD(date) {
  const parts = String(date).split("-");
  return { y: Number(parts[0]), m: Number(parts[1]), d: Number(parts[2]) };
}

export function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// --- 日期校验 ---
export function isValidYMD(date) {
  if (typeof date !== "string") return { valid: false };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { valid: false };
  const p = parseYMD(date);
  const y = p.y, m = p.m, d = p.d;
  if (isNaN(y) || isNaN(m) || isNaN(d)) return { valid: false };
  if (m < 1 || m > 12) return { valid: false };
  const daysInMonth = [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (d < 1 || d > daysInMonth[m - 1]) return { valid: false };
  return { valid: true };
}

export function isValidCalendarDate(date) {
  if (typeof date !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const p = parseYMD(date);
  const y = p.y, m = p.m, d = p.d;
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  if (m < 1 || m > 12) return false;
  const daysInMonth = [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (d < 1 || d > daysInMonth[m - 1]) return false;
  return true;
}

// --- 本地午夜 Date（避免 UTC） ---
export function toLocalDate(date) {
  const p = parseYMD(date);
  return new Date(p.y, p.m - 1, p.d, 0, 0, 0, 0);
}

// --- 天数差 ---
export function diffDays(fromDate, toDate) {
  const from = toLocalDate(fromDate);
  const to = toLocalDate(toDate);
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

// --- 北京时间当前日期 ---
export function getTodayYMDInShanghai() {
  const now = new Date();
  const shanghai = new Date(now.getTime() + TZ_OFFSET_MIN * 60 * 1000);
  return shanghai.getUTCFullYear() + "-" + pad2(shanghai.getUTCMonth() + 1) + "-" + pad2(shanghai.getUTCDate());
}

// --- 北京时间 ISO8601 ---
export function nowIsoShanghai() {
  const now = new Date();
  const shanghai = new Date(now.getTime() + TZ_OFFSET_MIN * 60 * 1000);
  return shanghai.getUTCFullYear() + "-" + pad2(shanghai.getUTCMonth() + 1) + "-" + pad2(shanghai.getUTCDate())
    + "T" + pad2(shanghai.getUTCHours()) + ":" + pad2(shanghai.getUTCMinutes()) + ":" + pad2(shanghai.getUTCSeconds()) + "+08:00";
}

// --- 周年纪念日在指定年份的日期 ---
export function anniversaryDateInYear(base, year) {
  if (base.m === 2 && base.d === 29 && !isLeapYear(year)) {
    return `${year}-02-28`;
  }
  return `${year}-${pad2(base.m)}-${pad2(base.d)}`;
}

// --- 下一次周年纪念日 ---
export function nextOccurrence(baseDate, today) {
  const b = parseYMD(baseDate);
  const t = parseYMD(today);
  const thisYearAnniv = anniversaryDateInYear(b, t.y);
  if (diffDays(thisYearAnniv, today) <= 0) return thisYearAnniv;
  return anniversaryDateInYear(b, t.y + 1);
}

// --- 纪念日完整状态 ---
export function getAnniversaryStatus(baseDate, today) {
  const daysSince = diffDays(baseDate, today);
  const nextDate = nextOccurrence(baseDate, today);
  const daysUntilNext = diffDays(today, nextDate);
  return {
    daysSince,
    nextDate,
    daysUntilNext,
    isToday: nextDate === today
  };
}

// --- 是否临近（7天内）---
export function isUpcoming(item, todayYMD) {
  const status = getAnniversaryStatus(item.date, todayYMD);
  return status.daysUntilNext >= 0 && status.daysUntilNext <= 7;
}

// --- 是否在某日期 ---
export function hasAnniversaryOnDate(item, date, todayYMD) {
  if (!item || item.deleted) return false;
  if (!isValidCalendarDate(item.date) || !isValidCalendarDate(date)) return false;

  const repeat = item.repeat || "yearly";
  if (repeat === "once") return item.date === date;

  // Do not render recurring occurrences before the original recorded date.
  if (diffDays(item.date, date) < 0) return false;

  const base = parseYMD(item.date);
  const target = parseYMD(date);

  if (repeat === "monthly") {
    return base.d === target.d;
  }

  const yearlyDate = anniversaryDateInYear(base, target.y);
  return yearlyDate === date;
}

// --- 生成 ID ---
export function genId() {
  const datePart = getTodayYMDInShanghai().replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 8);
  return `anniv_${datePart}_${Date.now()}_${rand}`;
}
