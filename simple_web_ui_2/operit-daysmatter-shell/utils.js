// ============================================================
// Copyright (c) 2026 奶油话梅糖 <nyanon@vip.qq.com> (MIT)
// operit-daysmatter-shell/utils.js
// 向后兼容：re-export from shared/ 公共库
// 旧代码 import from "./utils.js" 仍可正常工作
// ============================================================

export {
  formatDateKey, pad2, isLeapYear, parseYMD,
  anniversaryDateInYear, diffDays, nextOccurrence,
  getAnniversaryStatus, hasAnniversaryOnDate
} from "../../shared/date-utils.js";

export { escapeHtml, buildStatusText, buildMetricDisplay, getUrgencyColor, showToast, buildAnniversaryCard, copyAnniversaryInfo } from "../../shared/ui-utils.js";

// 兼容旧导入：ownerLabel, modeLabel
export { OWNER_LABEL as ownerLabel, MODE_LABEL as modeLabel } from "../../shared/constants.js";
