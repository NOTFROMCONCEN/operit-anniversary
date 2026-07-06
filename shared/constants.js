// ============================================================
// Copyright (c) 2026 奶油话梅糖 <nyanon@vip.qq.com> (MIT)
// 纪念日插件 - 常量与错误码 (shared/constants.js)
// ============================================================

export const ErrorCode = {
  INVALID_DATE: "INVALID_DATE",
  INVALID_TITLE: "INVALID_TITLE",
  NOT_FOUND: "NOT_FOUND",
  DUPLICATE_TITLE: "DUPLICATE_TITLE",
  STORAGE_READ_FAILED: "STORAGE_READ_FAILED",
  STORAGE_WRITE_FAILED: "STORAGE_WRITE_FAILED",
  UNSUPPORTED_LEAP_DAY: "UNSUPPORTED_LEAP_DAY",
  INVALID_ARGUMENT: "INVALID_ARGUMENT",
  MULTIPLE_MATCHES: "MULTIPLE_MATCHES",
  UNKNOWN_ERROR: "UNKNOWN_ERROR"
};

export const VALID_OWNERS = ["user", "assistant", "shared"];
export const VALID_MODES = ["count_up", "count_down", "both"];

export const OWNER_LABEL = {
  user: "用户",
  assistant: "AI",
  shared: "共同"
};

export const MODE_LABEL = {
  both: "双向",
  count_up: "已过",
  count_down: "倒计"
};

// 里程碑天数（用于检测重要节点）
export const MILESTONE_DAYS = [
  1, 7, 30, 100, 365, 520, 730, 1000, 1314, 2000, 3000
];

// 返回下一个即将到来的里程碑
export function getNextMilestone(daysSince) {
  for (const milestone of MILESTONE_DAYS) {
    if (milestone > daysSince) {
      return { milestone, remaining: milestone - daysSince };
    }
  }
  return null;
}

// 检测今天是否刚好是某个里程碑
export function isMilestoneToday(daysSince) {
  return MILESTONE_DAYS.includes(daysSince);
}
