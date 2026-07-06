// ============================================================
// Copyright (c) 2026 奶油话梅糖 <nyanon@vip.qq.com> (MIT)
// DaysMatter Web UI Bridge
// 为 web 界面提供与纪念日系统（anniversary_api.js）一致的调用接口。
// 在 Operit 宿主中优先使用 window.OperitBridge.anniversaryInvoke(action, params)；
// 独立浏览器预览时回退到 localStorage 模拟存储。
// ============================================================

const BRIDGE_VERSION = "1.2.0";
const STORE_KEY = "operit-daysmatter-web-data";
const BACKUP_KEY = "operit-daysmatter-web-data-backup";

function generateId() {
  return "dm-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function nowIso() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}+08:00`;
}

function getTodayYMD() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function pad2(n) {
  return n < 10 ? "0" + n : "" + n;
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

function parseYMD(date) {
  const parts = String(date).split("-");
  return { y: Number(parts[0]), m: Number(parts[1]), d: Number(parts[2]) };
}

function anniversaryDateInYear(base, year) {
  if (base.m === 2 && base.d === 29 && !isLeapYear(year)) {
    return year + "-02-28";
  }
  return year + "-" + pad2(base.m) + "-" + pad2(base.d);
}

function diffDays(fromDate, toDate) {
  const from = new Date(parseYMD(fromDate).y, parseYMD(fromDate).m - 1, parseYMD(fromDate).d);
  const to = new Date(parseYMD(toDate).y, parseYMD(toDate).m - 1, parseYMD(toDate).d);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function nextOccurrence(baseDate, today) {
  const b = parseYMD(baseDate);
  const t = parseYMD(today);
  const thisYearAnniv = anniversaryDateInYear(b, t.y);
  if (diffDays(thisYearAnniv, today) <= 0) {
    return thisYearAnniv;
  }
  return anniversaryDateInYear(b, t.y + 1);
}

function getAnniversaryStatus(baseDate, today) {
  const daysSince = diffDays(baseDate, today);
  const nextDate = nextOccurrence(baseDate, today);
  const daysUntilNext = diffDays(today, nextDate);
  return { daysSince, nextDate, daysUntilNext, isToday: nextDate === today };
}

function toSnapshotItem(item, todayYMD) {
  const status = getAnniversaryStatus(item.date, todayYMD);
  return {
    id: item.id,
    title: item.title,
    date: item.date,
    calendarType: item.calendarType || "solar",
    mode: item.mode || "both",
    owner: item.owner || "user",
    description: item.description || "",
    sendToContext: item.sendToContext === true,
    repeat: item.repeat || "yearly",
    pinned: item.pinned === true,
    deleted: item.deleted === true,
    deletedAt: item.deletedAt || "",
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
    status
  };
}

let memoryStore = [];

function migrateData(parsed) {
  // 旧格式：直接是数组
  if (Array.isArray(parsed)) {
    return { version: "1.0.0", items: parsed };
  }
  // 无 version 字段的老对象格式
  if (parsed && Array.isArray(parsed.items) && !parsed.version) {
    return { version: "1.0.0", items: parsed.items };
  }
  // 当前格式直接返回
  if (parsed && Array.isArray(parsed.items)) {
    return parsed;
  }
  return { version: BRIDGE_VERSION, items: [] };
}

function loadLocalData() {
  try {
    if (typeof localStorage === "undefined") return memoryStore;
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const migrated = migrateData(parsed);
    return Array.isArray(migrated.items) ? migrated.items : [];
  } catch (e) {
    console.error("[Bridge] 加载数据失败:", e);
    return [];
  }
}

function saveLocalData(items) {
  try {
    memoryStore = items;
    if (typeof localStorage === "undefined") return;
    const payload = JSON.stringify({ version: BRIDGE_VERSION, items });
    // 先写备份
    try { localStorage.setItem(BACKUP_KEY, payload); } catch (e) {}
    localStorage.setItem(STORE_KEY, payload);
  } catch (e) {
    console.error("[Bridge] 保存数据失败:", e);
    if (e.name === "QuotaExceededError") {
      throw new Error("localStorage 存储空间已满，请导出备份后清理数据");
    }
  }
}

function validateItem(item) {
  if (!item || typeof item !== "object") return { valid: false, error: "无效对象" };
  if (!item.title || !String(item.title).trim()) return { valid: false, error: "名称不能为空" };
  if (!item.date || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return { valid: false, error: "日期格式无效" };
  return { valid: true };
}

const localBackend = {
  async listSnapshot(params = {}) {
    const todayYMD = params.today || getTodayYMD();
    const items = loadLocalData();
    const visible = items.filter((it) => !it.deleted);
    visible.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return {
      success: true,
      today: todayYMD,
      version: "local:" + items.length,
      count: visible.length,
      items: visible.map((it) => toSnapshotItem(it, todayYMD))
    };
  },

  async create(params = {}) {
    const todayYMD = params.today || getTodayYMD();
    const title = String(params.title || "").trim();
    const date = String(params.date || "").trim();
    if (!title) throw new Error("名称不能为空");
    if (!date) throw new Error("日期不能为空");

    const item = {
      id: generateId(),
      title,
      date,
      calendarType: "solar",
      mode: ["count_up", "count_down", "both"].includes(params.mode) ? params.mode : "both",
      owner: ["user", "assistant", "shared"].includes(params.owner) ? params.owner : "user",
      description: String(params.description || ""),
      sendToContext: params.sendToContext === true,
      repeat: ["yearly", "monthly", "once"].includes(params.repeat) ? params.repeat : "yearly",
      pinned: params.pinned === true,
      deleted: false,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    const items = loadLocalData();
    items.push(item);
    saveLocalData(items);

    return {
      success: true,
      item: toSnapshotItem(item, todayYMD),
      snapshot: await this.listSnapshot({ today: todayYMD })
    };
  },

  async update(params = {}) {
    const todayYMD = params.today || getTodayYMD();
    const id = String(params.id || "").trim();
    if (!id) throw new Error("id 不能为空");

    const items = loadLocalData();
    const index = items.findIndex((it) => it.id === id && !it.deleted);
    if (index === -1) throw new Error("未找到对应的纪念日");

    const item = items[index];
    if (params.title != null) {
      const t = String(params.title).trim();
      if (!t) throw new Error("名称不能为空");
      item.title = t;
    }
    if (params.date != null) item.date = params.date;
    if (params.description != null) item.description = String(params.description);
    if (params.mode != null) item.mode = params.mode;
    if (params.owner != null) item.owner = params.owner;
    if (typeof params.sendToContext === "boolean") item.sendToContext = params.sendToContext;
    if (params.repeat != null && ["yearly", "monthly", "once"].includes(params.repeat)) {
      item.repeat = params.repeat;
    }
    if (typeof params.pinned === "boolean") item.pinned = params.pinned;

    item.updatedAt = nowIso();
    saveLocalData(items);

    return {
      success: true,
      item: toSnapshotItem(item, todayYMD),
      snapshot: await this.listSnapshot({ today: todayYMD })
    };
  },

  async delete(params = {}) {
    const todayYMD = params.today || getTodayYMD();
    const id = String(params.id || "").trim();
    if (!id) throw new Error("id 不能为空");

    const items = loadLocalData();
    const item = items.find((it) => it.id === id && !it.deleted);
    if (!item) throw new Error("未找到对应的纪念日");

    item.deleted = true;
    item.deletedAt = nowIso();
    item.updatedAt = nowIso();
    saveLocalData(items);

    return {
      success: true,
      id,
      snapshot: await this.listSnapshot({ today: todayYMD })
    };
  },

  async batchDelete(params = {}) {
    const todayYMD = params.today || getTodayYMD();
    const ids = Array.isArray(params.ids) ? params.ids : [];
    if (!ids.length) throw new Error("ids 不能为空数组");

    const items = loadLocalData();
    let deletedCount = 0;
    ids.forEach((id) => {
      const item = items.find((it) => it.id === id && !it.deleted);
      if (item) {
        item.deleted = true;
        item.deletedAt = nowIso();
        item.updatedAt = nowIso();
        deletedCount++;
      }
    });
    saveLocalData(items);

    return {
      success: true,
      deletedCount,
      snapshot: await this.listSnapshot({ today: todayYMD })
    };
  },

  async togglePin(params = {}) {
    const todayYMD = params.today || getTodayYMD();
    const id = String(params.id || "").trim();
    if (!id) throw new Error("id 不能为空");

    const items = loadLocalData();
    const item = items.find((it) => it.id === id && !it.deleted);
    if (!item) throw new Error("未找到对应的纪念日");

    item.pinned = !item.pinned;
    item.updatedAt = nowIso();
    saveLocalData(items);

    return {
      success: true,
      id,
      pinned: item.pinned,
      item: toSnapshotItem(item, todayYMD),
      snapshot: await this.listSnapshot({ today: todayYMD })
    };
  },

  async toggleContext(params = {}) {
    const todayYMD = params.today || getTodayYMD();
    const id = String(params.id || "").trim();
    if (!id) throw new Error("id 不能为空");
    if (typeof params.enabled !== "boolean") throw new Error("enabled 必须为布尔值");

    const items = loadLocalData();
    const item = items.find((it) => it.id === id && !it.deleted);
    if (!item) throw new Error("未找到对应的纪念日");

    item.sendToContext = params.enabled;
    item.updatedAt = nowIso();
    saveLocalData(items);

    return {
      success: true,
      id,
      sendToContext: item.sendToContext,
      item: toSnapshotItem(item, todayYMD),
      snapshot: await this.listSnapshot({ today: todayYMD })
    };
  },

  async exportData(params = {}) {
    const items = loadLocalData().filter((it) => !it.deleted);
    const payload = {
      version: BRIDGE_VERSION,
      exportedAt: nowIso(),
      count: items.length,
      items
    };
    return {
      success: true,
      data: JSON.stringify(payload, null, 2),
      count: items.length
    };
  },

  async importData(params = {}) {
    const todayYMD = params.today || getTodayYMD();
    const raw = String(params.data || "").trim();
    if (!raw) throw new Error("导入数据不能为空");

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error("导入数据不是有效的 JSON");
    }

    const incoming = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.items) ? parsed.items : []);
    if (!incoming.length) throw new Error("导入数据中没有找到有效记录");

    const items = loadLocalData();
    let imported = 0;
    let skipped = 0;

    incoming.forEach((it) => {
      const v = validateItem(it);
      if (!v.valid) { skipped++; return; }
      // 去重：同 title + date 视为重复
      const exists = items.some((ex) => !ex.deleted && ex.title === it.title && ex.date === it.date);
      if (exists) { skipped++; return; }

      items.push({
        id: it.id || generateId(),
        title: it.title,
        date: it.date,
        calendarType: it.calendarType || "solar",
        mode: ["count_up", "count_down", "both"].includes(it.mode) ? it.mode : "both",
        owner: ["user", "assistant", "shared"].includes(it.owner) ? it.owner : "user",
        description: String(it.description || ""),
        sendToContext: it.sendToContext === true,
        repeat: ["yearly", "monthly", "once"].includes(it.repeat) ? it.repeat : "yearly",
        deleted: false,
        createdAt: it.createdAt || nowIso(),
        updatedAt: nowIso()
      });
      imported++;
    });

    saveLocalData(items);

    return {
      success: true,
      imported,
      skipped,
      snapshot: await this.listSnapshot({ today: todayYMD })
    };
  }
};

function getHostBridge() {
  if (typeof window !== "undefined" && window.OperitBridge) {
    return window.OperitBridge;
  }
  return null;
}

async function invokeHost(action, params) {
  const bridge = getHostBridge();
  if (!bridge) return null;
  if (typeof bridge.anniversaryInvoke === "function") {
    const result = await bridge.anniversaryInvoke(action, JSON.stringify(params || {}));
    return typeof result === "string" ? JSON.parse(result) : result;
  }
  if (typeof bridge.invoke === "function") {
    const result = await bridge.invoke("anniversary", action, JSON.stringify(params || {}));
    return typeof result === "string" ? JSON.parse(result) : result;
  }
  return null;
}

export async function anniversaryInvoke(action, params) {
  try {
    const hostResult = await invokeHost(action, params);
    if (hostResult) return hostResult;
  } catch (e) {
    console.warn("[Bridge] 宿主调用失败，降级到 localStorage:", e);
  }

  try {
    switch (action) {
      case "list_snapshot":
        return await localBackend.listSnapshot(params);
      case "create":
        return await localBackend.create(params);
      case "update":
        return await localBackend.update(params);
      case "delete":
        return await localBackend.delete(params);
      case "batch_delete":
        return await localBackend.batchDelete(params);
      case "toggle_pin":
        return await localBackend.togglePin(params);
      case "toggle_context":
        return await localBackend.toggleContext(params);
      case "export_data":
        return await localBackend.exportData(params);
      case "import_data":
        return await localBackend.importData(params);
      default:
        return { success: false, error: { code: "INVALID_ACTION", message: "未知操作: " + action } };
    }
  } catch (e) {
    console.error("[Bridge] localBackend 错误:", e);
    return {
      success: false,
      error: { code: "UNKNOWN_ERROR", message: e.message || "操作失败" }
    };
  }
}

export function isHostAvailable() {
  const bridge = getHostBridge();
  return !!bridge && (typeof bridge.anniversaryInvoke === "function" || typeof bridge.invoke === "function");
}
