// ============================================================
// Copyright (c) 2026 奶油话梅糖 <nyanon@vip.qq.com> (MIT)
// operit-daysmatter-shell/sheet.js
// 纪念日 Sheet（底部弹窗表单）公共模块
// 供 app.js 与 all.js 共享，消除重复代码 + 防重复提交
// ============================================================

import { anniversaryInvoke } from "./bridge.js";
import { formatDateKey } from "../../shared/date-utils.js";
import { showToast } from "../../shared/ui-utils.js";

let editingId = "";
let isSaving = false;
let isInitialized = false;
const DRAFT_KEY = "operit-daysmatter-sheet-draft";

export function getEditingId() { return editingId; }

function loadDraft() {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function saveDraft() {
  try {
    if (typeof localStorage === "undefined") return;
    const draft = {
      title: document.querySelector("#inputTitle")?.value || "",
      date: document.querySelector("#inputDate")?.value || "",
      description: document.querySelector("#inputDescription")?.value || "",
      owner: document.querySelector("#inputOwner")?.value || "user",
      mode: document.querySelector("#inputMode")?.value || "both",
      repeat: document.querySelector("#inputRepeat")?.value || "yearly",
      sendToContext: document.querySelector("#inputSendToContext")?.checked || false
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (e) {}
}

function clearDraft() {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(DRAFT_KEY);
  } catch (e) {}
}

export function openSheet(item = null, defaultDate = null) {
  const sheet = document.querySelector("#anniversarySheet");
  const isEdit = !!item;
  editingId = isEdit ? item.id : "";

  document.querySelector("#sheetType").textContent = isEdit ? "编辑纪念" : "新建纪念";
  document.querySelector("#sheetTitle").textContent = isEdit ? item.title : "记录一个日子";
  document.querySelector("#inputTitle").value = isEdit ? item.title : "";
  document.querySelector("#inputDate").value = isEdit ? item.date : (defaultDate || formatDateKey(new Date()));
  document.querySelector("#inputDescription").value = isEdit ? item.description || "" : "";
  document.querySelector("#inputOwner").value = isEdit ? item.owner || "user" : "user";
  document.querySelector("#inputMode").value = isEdit ? item.mode || "both" : "both";
  const repeatInput = document.querySelector("#inputRepeat");
  if (repeatInput) repeatInput.value = isEdit ? item.repeat || "yearly" : "yearly";
  document.querySelector("#inputSendToContext").checked = isEdit ? item.sendToContext === true : false;

  // 新建时尝试恢复草稿
  if (!isEdit) {
    const draft = loadDraft();
    if (draft) {
      if (draft.title) document.querySelector("#inputTitle").value = draft.title;
      if (draft.date) document.querySelector("#inputDate").value = draft.date;
      if (draft.description) document.querySelector("#inputDescription").value = draft.description;
      if (draft.owner) document.querySelector("#inputOwner").value = draft.owner;
      if (draft.mode) document.querySelector("#inputMode").value = draft.mode;
      if (draft.repeat && repeatInput) repeatInput.value = draft.repeat;
      document.querySelector("#inputSendToContext").checked = draft.sendToContext === true;
    }
  }

  const delBtn = document.querySelector("#deleteAnniversary");
  if (delBtn) delBtn.hidden = !isEdit;

  // 重置保存锁
  isSaving = false;
  sheet.showModal();
}

export async function saveAnniversary(onSuccess) {
  if (isSaving) return;

  const title = document.querySelector("#inputTitle").value.trim();
  const date = document.querySelector("#inputDate").value;
  if (!title) return showToast("先给这个日子起个名字", { type: "warning" });
  if (!date) return showToast("请选择日期", { type: "warning" });

  const payload = {
    title,
    date,
    description: document.querySelector("#inputDescription").value.trim(),
    owner: document.querySelector("#inputOwner").value,
    mode: document.querySelector("#inputMode").value,
    sendToContext: document.querySelector("#inputSendToContext").checked
  };

  const repeatInput = document.querySelector("#inputRepeat");
  if (repeatInput) payload.repeat = repeatInput.value;

  if (editingId) payload.id = editingId;

  const action = editingId ? "update" : "create";
  isSaving = true;
  try {
    const result = await anniversaryInvoke(action, payload);
    if (!result.success) {
      showToast(result.error?.message || "保存失败，请稍后再试", { type: "error" });
      return;
    }
    clearDraft();
    document.querySelector("#anniversarySheet").close();
    if (typeof onSuccess === "function") onSuccess(result.snapshot);
    showToast(editingId ? "纪念已更新" : "纪念已保存", { type: "success" });
  } catch (e) {
    console.error("[Sheet] 保存失败:", e);
    showToast("保存失败，请重试", { type: "error" });
  } finally {
    isSaving = false;
  }
}

export async function deleteCurrentAnniversary(onSuccess) {
  if (!editingId) return;
  if (!confirm("确定删除这条纪念吗？此操作不可恢复。")) return;

  try {
    const result = await anniversaryInvoke("delete", { id: editingId });
    if (!result.success) {
      showToast(result.error?.message || "删除失败，请稍后再试", { type: "error" });
      return;
    }
    document.querySelector("#anniversarySheet").close();
    if (typeof onSuccess === "function") onSuccess(result.snapshot);
    showToast("纪念已删除", { type: "success" });
  } catch (e) {
    console.error("[Sheet] 删除失败:", e);
    showToast("删除失败，请重试", { type: "error" });
  }
}

export function initSheet(onSaveSuccess, onDeleteSuccess) {
  const sheet = document.querySelector("#anniversarySheet");
  if (!sheet || isInitialized) return;
  isInitialized = true;

  sheet.addEventListener("close", () => {
    if (sheet.returnValue === "default") {
      saveAnniversary(onSaveSuccess);
    }
  });

  const delBtn = document.querySelector("#deleteAnniversary");
  if (delBtn) {
    delBtn.addEventListener("click", () => deleteCurrentAnniversary(onDeleteSuccess));
  }

  // 草稿自动保存：任何输入变化都写入 localStorage
  const fields = ["#inputTitle", "#inputDate", "#inputDescription", "#inputOwner", "#inputMode", "#inputRepeat"];
  fields.forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.addEventListener("input", saveDraft);
  });
  const check = document.querySelector("#inputSendToContext");
  if (check) check.addEventListener("change", saveDraft);
}
