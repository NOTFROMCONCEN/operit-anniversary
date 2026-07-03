"use strict";
// ============================================================
// 纪念日管理 - compose_dsl UI 页面
// Copyright (c) 2026 AnniversaryPluginContributors (MIT)
// 参考 worldbook index.ui.ts 的 Screen 函数模式与组件用法
// 提供图形化的纪念日增删改查、上下文发送开关管理
// 本文件含作者水印哨兵 _G_S::anniv::fingerprint::3，删除后校验失败。
// ============================================================
// _G_S::anniv::fingerprint::3 — 指纹水印哨兵

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};

var service = __importDefault(require("../../shared/anniversary_service.js")).default;
var storage = require("../../shared/anniversary_storage.js");

// ============================================================
// 文案（中英双语，跟随宿主语言）
// ============================================================
function resolveText() {
    var rawLocale = "";
    try { rawLocale = getLang(); } catch (e) { rawLocale = ""; }
    var locale = String(rawLocale || "").trim().toLowerCase();
    var isEn = locale.startsWith("en");

    return isEn ? {
        appTitle: "Anniversary Manager",
        appSubtitle: "Manage anniversaries between you and AI",
        buttonBack: "Back",
        buttonCreate: "Create",
        buttonEdit: "Edit",
        buttonDelete: "Delete",
        buttonSave: "Save",
        buttonCancel: "Cancel",
        buttonAdd: "Add Anniversary",
        emptyTitle: "No Anniversaries",
        emptyDesc: "Create your first anniversary to start tracking important dates",
        emptyAction: "Create Anniversary",
        listLoading: "Loading...",
        searchEmptyTitle: "No Results",
        searchEmptyDesc: "No anniversaries match your search",
        sectionBasicInfo: "Basic Info",
        sectionBasicInfoDesc: "Title, date and description of the anniversary",
        fieldTitle: "Title",
        fieldTitlePlaceholder: "e.g. First Meeting",
        fieldDate: "Date (YYYY-MM-DD)",
        fieldDatePlaceholder: "e.g. 2024-02-29",
        fieldDescription: "Description",
        fieldDescriptionPlaceholder: "Optional notes",
        sectionSettings: "Settings",
        sectionSettingsDesc: "Owner, count mode and context injection",
        ownerTitle: "Owner",
        ownerHint: "Who this anniversary belongs to",
        ownerUser: "User",
        ownerAssistant: "AI",
        ownerShared: "Shared",
        modeTitle: "Count Mode",
        modeHint: "How to count days",
        modeBoth: "Both",
        modeCountUp: "Days Since",
        modeCountDown: "Days Until",
        settingContextTitle: "Send to AI Context",
        settingContextDesc: "Allow AI to see this anniversary status in conversations",
        statusDaysSince: "days since",
        statusDaysUntil: "days until",
        statusIsToday: "Today is the anniversary!",
        statusNextDate: "Next: ",
        dayUnit: "days",
        nextDateSep: " (",
        nextDateEnd: ")",
        toastLoadFailed: "Failed to load: ",
        toastNameRequired: "Title is required",
        toastDateRequired: "Date is required",
        toastSaved: "Anniversary saved",
        toastSaveFailed: "Save failed: ",
        toastDeleted: "Anniversary deleted",
        toastDeleteFailed: "Delete failed: ",
        toastToggled: "Context setting updated",
        toastToggleFailed: "Toggle failed: ",
        tagUser: "User",
        tagAssistant: "AI",
        tagShared: "Shared",
        tagContextOn: "Context ON",
        tagContextOff: "Context OFF",
        tagToday: "Today!",
        tagModeBoth: "Both",
        tagModeUp: "Since",
        tagModeDown: "Until",
        deleteConfirmTitle: "Delete Anniversary",
        deleteConfirmDesc: "Are you sure you want to delete",
        deleteConfirmHint: "This is a soft delete and can be recovered",
        titleEdit: "Edit Anniversary",
        titleCreate: "Create Anniversary"
    } : {
        appTitle: "纪念日管理",
        appSubtitle: "管理你与 AI 之间的重要纪念日",
        buttonBack: "返回",
        buttonCreate: "新建",
        buttonEdit: "编辑",
        buttonDelete: "删除",
        buttonSave: "保存",
        buttonCancel: "取消",
        buttonAdd: "添加纪念日",
        emptyTitle: "暂无纪念日",
        emptyDesc: "创建你的第一个纪念日，开始记录重要日期",
        emptyAction: "创建纪念日",
        listLoading: "加载中...",
        searchEmptyTitle: "无搜索结果",
        searchEmptyDesc: "没有匹配的纪念日",
        sectionBasicInfo: "基本信息",
        sectionBasicInfoDesc: "纪念日的名称、日期和备注",
        fieldTitle: "名称",
        fieldTitlePlaceholder: "例如：初次见面",
        fieldDate: "日期（YYYY-MM-DD）",
        fieldDatePlaceholder: "例如：2024-02-29",
        fieldDescription: "备注",
        fieldDescriptionPlaceholder: "可选的备注信息",
        sectionSettings: "设置",
        sectionSettingsDesc: "归属、计数模式与上下文发送",
        ownerTitle: "归属",
        ownerHint: "这个纪念日属于谁",
        ownerUser: "用户",
        ownerAssistant: "AI",
        ownerShared: "共同",
        modeTitle: "计数模式",
        modeHint: "如何计算天数",
        modeBoth: "双向",
        modeCountUp: "已过天数",
        modeCountDown: "倒计天数",
        settingContextTitle: "发送给 AI 上下文",
        settingContextDesc: "允许 AI 在对话中看到此纪念日的状态",
        statusDaysSince: "已过",
        statusDaysUntil: "距下次",
        statusIsToday: "今天是纪念日！",
        statusNextDate: "下次日期：",
        dayUnit: "天",
        nextDateSep: "（",
        nextDateEnd: "）",
        toastLoadFailed: "加载失败：",
        toastNameRequired: "请填写名称",
        toastDateRequired: "请填写日期",
        toastSaved: "纪念日已保存",
        toastSaveFailed: "保存失败：",
        toastDeleted: "纪念日已删除",
        toastDeleteFailed: "删除失败：",
        toastToggled: "上下文设置已更新",
        toastToggleFailed: "切换失败：",
        tagUser: "用户",
        tagAssistant: "AI",
        tagShared: "共同",
        tagContextOn: "已发送",
        tagContextOff: "未发送",
        tagToday: "今天！",
        tagModeBoth: "双向",
        tagModeUp: "已过",
        tagModeDown: "倒计",
        deleteConfirmTitle: "删除纪念日",
        deleteConfirmDesc: "确定要删除",
        deleteConfirmHint: "这是软删除，可以恢复",
        titleEdit: "编辑纪念日",
        titleCreate: "创建纪念日"
    };
}

// ============================================================
// Screen 主函数
// ============================================================
function Screen(ctx) {
    var t = resolveText();
    var colors = ctx.MaterialTheme.colorScheme;
    var UI = ctx.UI;

    function useCompatState(name, initialValue) {
        var raw = ctx.useState(name, initialValue);
        if (Array.isArray(raw)) {
            return {
                get value() { return raw[0]; },
                set: function (value) { return raw[1](value); }
            };
        }
        return {
            get value() { return raw.value; },
            set: function (value) { return raw.set(value); }
        };
    }

    // 状态管理
    var entries = useCompatState("entries", []);
    var loading = useCompatState("loading", false);
    var hasLoadedOnce = useCompatState("hasLoadedOnce", false);
    var initialLoadInFlight = useCompatState("initialLoadInFlight", false);
    var view = useCompatState("view", "list"); // list | create | edit
    var editId = useCompatState("editId", "");
    var deletingEntryId = useCompatState("deletingEntryId", "");
    var togglingEntryId = useCompatState("togglingEntryId", "");
    var showDeleteConfirm = useCompatState("showDeleteConfirm", false);
    var pendingDeleteId = useCompatState("pendingDeleteId", "");
    var pendingDeleteTitle = useCompatState("pendingDeleteTitle", "");

    // 表单状态
    var formTitle = useCompatState("formTitle", "");
    var formDate = useCompatState("formDate", "");
    var formDescription = useCompatState("formDescription", "");
    var formOwner = useCompatState("formOwner", "user");
    var formMode = useCompatState("formMode", "both");
    var formSendToContext = useCompatState("formSendToContext", false);

    // ============================================================
    // 数据加载
    // ============================================================
    async function loadEntries(force) {
        if (loading.value || (hasLoadedOnce.value && !force)) {
            return;
        }
        loading.set(true);
        try {
            var items = await service.listAnniversaries({ includeDeleted: false });
            // 按日期排序（升序）
            items.sort(function (a, b) {
                return String(a.date).localeCompare(String(b.date));
            });
            entries.set(items);
        } catch (error) {
            ctx.showToast(t.toastLoadFailed + (error.message || ""));
        } finally {
            loading.set(false);
            hasLoadedOnce.set(true);
        }
    }

    // ============================================================
    // 表单操作
    // ============================================================
    function resetForm() {
        editId.set("");
        formTitle.set("");
        formDate.set("");
        formDescription.set("");
        formOwner.set("user");
        formMode.set("both");
        formSendToContext.set(false);
    }

    function doCreate() {
        resetForm();
        view.set("create");
    }

    async function doEdit(id) {
        try {
            var item = await service.getAnniversary(id);
            editId.set(item.id);
            formTitle.set(item.title || "");
            formDate.set(item.date || "");
            formDescription.set(item.description || "");
            formOwner.set(item.owner || "user");
            formMode.set(item.mode || "both");
            formSendToContext.set(!!item.sendToContext);
            view.set("edit");
        } catch (error) {
            ctx.showToast(t.toastLoadFailed + (error.message || ""));
        }
    }

    async function doSave() {
        var titleVal = String(formTitle.value || "").trim();
        var dateVal = String(formDate.value || "").trim();

        if (!titleVal) {
            ctx.showToast(t.toastNameRequired);
            return;
        }
        if (!dateVal) {
            ctx.showToast(t.toastDateRequired);
            return;
        }

        var isEdit = view.value === "edit" && editId.value;
        var payload = {
            title: titleVal,
            date: dateVal,
            description: String(formDescription.value || ""),
            owner: formOwner.value,
            mode: formMode.value,
            sendToContext: formSendToContext.value
        };

        if (isEdit) {
            payload.id = editId.value;
        }

        try {
            if (isEdit) {
                await service.updateAnniversary(payload);
            } else {
                await service.createAnniversary(payload);
            }
            ctx.showToast(t.toastSaved);
            view.set("list");
            resetForm();
            await loadEntries(true);
        } catch (error) {
            ctx.showToast(t.toastSaveFailed + (error.message || ""));
        }
    }

    function doCancel() {
        view.set("list");
        resetForm();
    }

    // ============================================================
    // 删除操作
    // ============================================================
    function requestDelete(id, title) {
        pendingDeleteId.set(id);
        pendingDeleteTitle.set(title);
        showDeleteConfirm.set(true);
    }

    async function doDelete() {
        var id = pendingDeleteId.value;
        if (!id) {
            showDeleteConfirm.set(false);
            return;
        }
        deletingEntryId.set(id);
        showDeleteConfirm.set(false);
        try {
            await service.deleteAnniversary(id);
            ctx.showToast(t.toastDeleted);
            await loadEntries(true);
        } catch (error) {
            ctx.showToast(t.toastDeleteFailed + (error.message || ""));
        } finally {
            deletingEntryId.set("");
            pendingDeleteId.set("");
            pendingDeleteTitle.set("");
        }
    }

    // ============================================================
    // 上下文开关切换
    // ============================================================
    async function doToggleContext(id, currentEnabled) {
        if (togglingEntryId.value === id) {
            return;
        }
        togglingEntryId.set(id);
        try {
            await service.toggleContext(id, !currentEnabled);
            ctx.showToast(t.toastToggled);
            await loadEntries(true);
        } catch (error) {
            ctx.showToast(t.toastToggleFailed + (error.message || ""));
        } finally {
            togglingEntryId.set("");
        }
    }

    // ============================================================
    // 渲染辅助函数
    // ============================================================

    // 标签药丸（参考 worldbook renderTag）
    function renderTag(label, backgroundColor, textColor) {
        return UI.Box(
            {
                modifier: ctx.Modifier.clip({ cornerRadius: 8 }).background(backgroundColor)
            },
            [
                UI.Text({
                    text: label,
                    style: "labelSmall",
                    color: textColor,
                    fontSize: 9,
                    maxLines: 1,
                    padding: { horizontal: 6, vertical: 2 }
                })
            ]
        );
    }

    // 头部标签（参考 worldbook renderHeaderTag）
    function renderHeaderTag(label, backgroundColor, textColor) {
        return UI.Surface(
            {
                shape: { cornerRadius: 8 },
                containerColor: backgroundColor
            },
            [
                UI.Text({
                    text: label,
                    style: "labelSmall",
                    color: textColor,
                    fontSize: 9,
                    padding: { horizontal: 6, vertical: 2 }
                })
            ]
        );
    }

    // 选项芯片（参考 worldbook renderChoiceChip）
    function renderChoiceChip(label, selected, onClick, enabled) {
        if (enabled === undefined) enabled = true;
        var chipShape = { type: "pill" };
        var borderColor = !enabled
            ? colors.outlineVariant.copy({ alpha: 0.55 })
            : selected
                ? colors.primary.copy({ alpha: 0.22 })
                : colors.outlineVariant;
        var backgroundColor = selected ? colors.primaryContainer.copy({ alpha: 0.38 }) : colors.surface;
        var textColor = !enabled
            ? colors.onSurfaceVariant.copy({ alpha: 0.6 })
            : selected
                ? colors.primary
                : colors.onSurface;
        var chipModifier = enabled
            ? ctx.Modifier.clip(chipShape).background(backgroundColor).border(1, borderColor, chipShape).clickable(onClick)
            : ctx.Modifier.clip(chipShape).background(backgroundColor).border(1, borderColor, chipShape);

        return UI.Box(
            { modifier: chipModifier.padding({ horizontal: 14, vertical: 9 }) },
            [
                UI.Row(
                    { spacing: selected ? 6 : 0, verticalAlignment: "center" },
                    [
                        selected ? UI.Icon({ name: "check", size: 16, tint: textColor }) : null,
                        UI.Text({ text: label, fontWeight: selected ? "bold" : "medium", color: textColor })
                    ].filter(Boolean)
                )
            ]
        );
    }

    // 设置行（参考 worldbook renderSettingRow）
    function renderSettingRow(title, description, checked, onCheckedChange) {
        return UI.Row(
            { fillMaxWidth: true, horizontalArrangement: "spaceBetween", verticalAlignment: "center" },
            [
                UI.Column(
                    { weight: 1, spacing: 2 },
                    [
                        UI.Text({ text: title, color: colors.onSurface, fontWeight: "bold" }),
                        UI.Text({ text: description, style: "bodySmall", color: colors.onSurfaceVariant })
                    ]
                ),
                UI.Spacer({ width: 12 }),
                UI.Switch({ checked: checked, onCheckedChange: onCheckedChange })
            ]
        );
    }

    // 获取归属标签文案
    function getOwnerTag(owner) {
        if (owner === "assistant") return t.tagAssistant;
        if (owner === "shared") return t.tagShared;
        return t.tagUser;
    }

    // 获取模式标签文案
    function getModeTag(mode) {
        if (mode === "count_up") return t.tagModeUp;
        if (mode === "count_down") return t.tagModeDown;
        return t.tagModeBoth;
    }

    // ============================================================
    // 渲染纪念日卡片
    // ============================================================
    function renderCard(entry) {
        var isDeleting = deletingEntryId.value === entry.id;
        var isToggling = togglingEntryId.value === entry.id;
        var isEntryBusy = isDeleting || isToggling;

        // 计算状态
        var todayYMD = "";
        try { todayYMD = storage.getTodayYMDInShanghai(); } catch (e) { todayYMD = ""; }
        var status = null;
        try { status = service.getAnniversaryStatus(entry.date, todayYMD); } catch (e) { status = null; }

        var infoPills = [
            renderTag(entry.date, colors.secondaryContainer.copy({ alpha: 0.6 }), colors.onSecondaryContainer),
            renderTag(getOwnerTag(entry.owner), colors.tertiaryContainer.copy({ alpha: 0.7 }), colors.onTertiaryContainer),
            renderTag(getModeTag(entry.mode), colors.tertiaryContainer.copy({ alpha: 0.55 }), colors.onTertiaryContainer),
            renderTag(
                entry.sendToContext ? t.tagContextOn : t.tagContextOff,
                entry.sendToContext ? colors.primaryContainer.copy({ alpha: 0.7 }) : colors.surfaceVariant.copy({ alpha: 0.6 }),
                entry.sendToContext ? colors.onPrimaryContainer : colors.onSurfaceVariant
            ),
            (status && status.isToday) ? renderTag(t.tagToday, colors.error.copy({ alpha: 0.15 }), colors.error) : null
        ].filter(Boolean);

        return UI.Card(
            {
                key: entry.id,
                containerColor: colors.surface,
                elevation: 1,
                modifier: ctx.Modifier.fillMaxWidth().clickable(function () {
                    if (!isEntryBusy) {
                        return doEdit(entry.id);
                    }
                    return undefined;
                })
            },
            [
                UI.Column(
                    { padding: 12, fillMaxWidth: true },
                    [
                        // 第一行：图标 + 标题 + 上下文开关
                        UI.Row(
                            { fillMaxWidth: true, verticalAlignment: "center" },
                            [
                                UI.Box(
                                    {
                                        width: 28,
                                        height: 28,
                                        contentAlignment: "center",
                                        modifier: ctx.Modifier.clip({ cornerRadius: 6 }).background(colors.primaryContainer)
                                    },
                                    [
                                        UI.Icon({ name: "event", tint: colors.onPrimaryContainer, size: 16 })
                                    ]
                                ),
                                UI.Spacer({ width: 10 }),
                                UI.Column(
                                    { weight: 1 },
                                    [
                                        UI.Row(
                                            { verticalAlignment: "center" },
                                            [
                                                UI.Text({
                                                    text: entry.title,
                                                    style: "bodyMedium",
                                                    fontWeight: "medium",
                                                    maxLines: 1,
                                                    overflow: "ellipsis",
                                                    weight: 1,
                                                    weightFill: false
                                                }),
                                                (status && status.isToday) ? UI.Spacer({ width: 6 }) : null,
                                                (status && status.isToday)
                                                    ? renderHeaderTag(t.tagToday, colors.error.copy({ alpha: 0.1 }), colors.error)
                                                    : null
                                            ].filter(Boolean)
                                        )
                                    ].filter(Boolean)
                                ),
                                UI.Switch({
                                    checked: entry.sendToContext,
                                    onCheckedChange: function (_checked) { return doToggleContext(entry.id, entry.sendToContext); },
                                    enabled: !isEntryBusy,
                                    checkedThumbColor: colors.primary,
                                    checkedTrackColor: colors.primaryContainer,
                                    uncheckedThumbColor: colors.outline,
                                    uncheckedTrackColor: colors.surfaceVariant,
                                    modifier: ctx.Modifier.scale(0.8)
                                })
                            ]
                        ),
                        // 状态信息行
                        (status && (status.daysSince > 0 || status.daysUntilNext > 0))
                            ? UI.Column(
                                { fillMaxWidth: true, spacing: 2 },
                                [
                                    UI.Spacer({ height: 8 }),
                                    (status.isToday)
                                        ? UI.Text({ text: t.statusIsToday, style: "bodySmall", fontWeight: "bold", color: colors.error })
                                        : null,
                                    (status.daysSince > 0)
                                        ? UI.Text({ text: t.statusDaysSince + " " + status.daysSince + " " + t.dayUnit, style: "bodySmall", color: colors.onSurfaceVariant })
                                        : null,
                                    (status.daysUntilNext > 0)
                                        ? UI.Text({ text: t.statusDaysUntil + " " + status.daysUntilNext + " " + t.dayUnit + t.nextDateSep + t.statusNextDate + status.nextDate + t.nextDateEnd, style: "bodySmall", color: colors.onSurfaceVariant })
                                        : null
                                ].filter(Boolean)
                            )
                            : null,
                        UI.Spacer({ height: 8 }),
                        // 标签行
                        UI.Box(
                            {
                                modifier: ctx.Modifier.fillMaxWidth().clip({ cornerRadius: 12 }).background(colors.surfaceVariant.copy({ alpha: 0.18 })).padding({ horizontal: 8, vertical: 6 })
                            },
                            [
                                UI.Row(
                                    { fillMaxWidth: true, verticalAlignment: "center" },
                                    [
                                        UI.LazyRow({ weight: 1, spacing: 4 }, infoPills),
                                        UI.Spacer({ width: 6 }),
                                        UI.Icon({ name: "arrowForward", size: 14, tint: colors.onSurfaceVariant.copy({ alpha: 0.7 }) })
                                    ]
                                )
                            ]
                        ),
                        UI.Spacer({ height: 8 }),
                        // 备注行（如果有）
                        (entry.description && String(entry.description).trim())
                            ? UI.Column(
                                { fillMaxWidth: true, spacing: 4 },
                                [
                                    UI.Text({ text: entry.description, style: "bodySmall", color: colors.onSurfaceVariant, maxLines: 2, overflow: "ellipsis" }),
                                    UI.Spacer({ height: 4 })
                                ]
                            )
                            : null,
                        // 操作按钮行
                        UI.Row(
                            { fillMaxWidth: true, spacing: 8 },
                            [
                                UI.OutlinedButton(
                                    {
                                        onClick: function () { return doEdit(entry.id); },
                                        enabled: !isEntryBusy,
                                        weight: 1,
                                        height: 32,
                                        contentPadding: { horizontal: 12 }
                                    },
                                    [UI.Text({ text: t.buttonEdit, style: "labelMedium", fontSize: 12 })]
                                ),
                                UI.OutlinedButton(
                                    {
                                        onClick: function () { requestDelete(entry.id, entry.title); },
                                        enabled: !isEntryBusy,
                                        weight: 1,
                                        height: 32,
                                        contentPadding: { horizontal: 12 }
                                    },
                                    [UI.Text({ text: t.buttonDelete, style: "labelMedium", fontSize: 12 })]
                                )
                            ]
                        )
                    ].filter(Boolean)
                )
            ]
        );
    }

    // ============================================================
    // 渲染表单（创建/编辑）
    // ============================================================
    function renderForm() {
        var isEdit = view.value === "edit";

        return UI.Column(
            { padding: 12, spacing: 12, fillMaxWidth: true },
            [
                // 返回按钮
                UI.Row(
                    { fillMaxWidth: true },
                    [
                        UI.OutlinedButton(
                            { onClick: doCancel, shape: { cornerRadius: 12 } },
                            [
                                UI.Row(
                                    { spacing: 6, verticalAlignment: "center" },
                                    [
                                        UI.Icon({ name: "arrowBack", size: 16, tint: colors.onSurface }),
                                        UI.Text({ text: t.buttonBack, color: colors.onSurface, fontWeight: "bold" })
                                    ]
                                )
                            ]
                        )
                    ]
                ),
                // 标题
                UI.Text({ text: isEdit ? t.titleEdit : t.titleCreate, style: "titleLarge", fontWeight: "bold", color: colors.onSurface }),
                // 基本信息卡片
                UI.Card(
                    { containerColor: colors.surface, shape: { cornerRadius: 18 }, fillMaxWidth: true },
                    [
                        UI.Column(
                            { padding: 16, spacing: 12, fillMaxWidth: true },
                            [
                                UI.Text({ text: t.sectionBasicInfo, style: "titleMedium", fontWeight: "bold", color: colors.onSurface }),
                                UI.Text({ text: t.sectionBasicInfoDesc, style: "bodySmall", color: colors.onSurfaceVariant }),
                                UI.TextField({
                                    label: t.fieldTitle,
                                    placeholder: t.fieldTitlePlaceholder,
                                    value: formTitle.value,
                                    onValueChange: formTitle.set,
                                    singleLine: true,
                                    fillMaxWidth: true
                                }),
                                UI.TextField({
                                    label: t.fieldDate,
                                    placeholder: t.fieldDatePlaceholder,
                                    value: formDate.value,
                                    onValueChange: formDate.set,
                                    singleLine: true,
                                    fillMaxWidth: true
                                }),
                                UI.TextField({
                                    label: t.fieldDescription,
                                    placeholder: t.fieldDescriptionPlaceholder,
                                    value: formDescription.value,
                                    onValueChange: formDescription.set,
                                    singleLine: false,
                                    minLines: 2,
                                    fillMaxWidth: true
                                })
                            ]
                        )
                    ]
                ),
                // 设置卡片
                UI.Card(
                    { containerColor: colors.surface, shape: { cornerRadius: 18 }, fillMaxWidth: true },
                    [
                        UI.Column(
                            { padding: 16, spacing: 12, fillMaxWidth: true },
                            [
                                UI.Text({ text: t.sectionSettings, style: "titleMedium", fontWeight: "bold", color: colors.onSurface }),
                                UI.Text({ text: t.sectionSettingsDesc, style: "bodySmall", color: colors.onSurfaceVariant }),
                                // 归属选择
                                UI.Text({ text: t.ownerTitle, style: "labelMedium", fontWeight: "bold", color: colors.onSurface }),
                                UI.Text({ text: t.ownerHint, style: "bodySmall", color: colors.onSurfaceVariant }),
                                UI.LazyRow(
                                    { fillMaxWidth: true, spacing: 8 },
                                    [
                                        renderChoiceChip(t.ownerUser, formOwner.value === "user", function () { formOwner.set("user"); }),
                                        renderChoiceChip(t.ownerAssistant, formOwner.value === "assistant", function () { formOwner.set("assistant"); }),
                                        renderChoiceChip(t.ownerShared, formOwner.value === "shared", function () { formOwner.set("shared"); })
                                    ]
                                ),
                                UI.HorizontalDivider({ color: colors.outlineVariant, thickness: 1 }),
                                // 计数模式选择
                                UI.Text({ text: t.modeTitle, style: "labelMedium", fontWeight: "bold", color: colors.onSurface }),
                                UI.Text({ text: t.modeHint, style: "bodySmall", color: colors.onSurfaceVariant }),
                                UI.LazyRow(
                                    { fillMaxWidth: true, spacing: 8 },
                                    [
                                        renderChoiceChip(t.modeBoth, formMode.value === "both", function () { formMode.set("both"); }),
                                        renderChoiceChip(t.modeCountUp, formMode.value === "count_up", function () { formMode.set("count_up"); }),
                                        renderChoiceChip(t.modeCountDown, formMode.value === "count_down", function () { formMode.set("count_down"); })
                                    ]
                                ),
                                UI.HorizontalDivider({ color: colors.outlineVariant, thickness: 1 }),
                                // 上下文发送开关
                                renderSettingRow(t.settingContextTitle, t.settingContextDesc, formSendToContext.value, formSendToContext.set)
                            ]
                        )
                    ]
                ),
                // 保存按钮
                UI.Button({
                    text: isEdit ? t.buttonSave : t.buttonCreate,
                    onClick: function () { return doSave(); },
                    fillMaxWidth: true,
                    shape: { cornerRadius: 14 }
                })
            ]
        );
    }

    // ============================================================
    // 渲染删除确认对话框
    // ============================================================
    function renderDeleteConfirm() {
        return UI.Box(
            { fillMaxSize: true, contentAlignment: "center" },
            [
                UI.Surface(
                    {
                        shape: { cornerRadius: 18 },
                        containerColor: colors.surface,
                        modifier: ctx.Modifier.fillMaxWidth().padding({ horizontal: 24 })
                    },
                    [
                        UI.Column(
                            { padding: 24, spacing: 12, fillMaxWidth: true },
                            [
                                UI.Text({ text: t.deleteConfirmTitle, style: "titleMedium", fontWeight: "bold", color: colors.onSurface }),
                                UI.Text({ text: t.deleteConfirmDesc + "「" + pendingDeleteTitle.value + "」？", style: "bodyMedium", color: colors.onSurfaceVariant }),
                                UI.Text({ text: t.deleteConfirmHint, style: "bodySmall", color: colors.onSurfaceVariant }),
                                UI.Spacer({ height: 8 }),
                                UI.Row(
                                    { fillMaxWidth: true, spacing: 12 },
                                    [
                                        UI.OutlinedButton(
                                            { onClick: function () { showDeleteConfirm.set(false); }, weight: 1, shape: { cornerRadius: 12 } },
                                            [UI.Text({ text: t.buttonCancel, color: colors.onSurface })]
                                        ),
                                        UI.Button(
                                            { text: t.buttonDelete, onClick: doDelete, weight: 1, shape: { cornerRadius: 12 } }
                                        )
                                    ]
                                )
                            ]
                        )
                    ]
                )
            ]
        );
    }

    // ============================================================
    // 主渲染逻辑
    // ============================================================
    var items = [
        // 顶部标题栏
        UI.Card(
            {
                key: "header",
                containerColor: colors.primaryContainer,
                elevation: 0,
                fillMaxWidth: true
            },
            [
                UI.Column(
                    { padding: 16, fillMaxWidth: true, spacing: 4 },
                    [
                        UI.Row(
                            { fillMaxWidth: true, horizontalArrangement: "spaceBetween", verticalAlignment: "center" },
                            [
                                UI.Column(
                                    { weight: 1 },
                                    [
                                        UI.Text({ text: t.appTitle, style: "titleLarge", fontWeight: "bold", color: colors.onPrimaryContainer }),
                                        UI.Text({ text: t.appSubtitle, style: "bodySmall", color: colors.onPrimaryContainer.copy({ alpha: 0.8 }) })
                                    ]
                                ),
                                UI.Box(
                                    {
                                        width: 40,
                                        height: 40,
                                        contentAlignment: "center",
                                        modifier: ctx.Modifier.clip({ type: "circle" }).background(colors.primary).clickable(doCreate)
                                    },
                                    [
                                        UI.Icon({ name: "add", size: 22, tint: colors.onPrimary })
                                    ]
                                )
                            ]
                        )
                    ]
                )
            ]
        )
    ];

    // 编辑/创建视图
    if (view.value === "edit" || view.value === "create") {
        return UI.Box(
            { fillMaxSize: true },
            [
                UI.LazyColumn(
                    { fillMaxSize: true, spacing: 12, padding: { horizontal: 12, vertical: 8 } },
                    [renderForm()]
                )
            ]
        );
    }

    // 列表视图
    if (loading.value || !hasLoadedOnce.value) {
        items.push(
            UI.Column(
                { key: "loading", fillMaxWidth: true, horizontalAlignment: "center", padding: 32 },
                [
                    UI.CircularProgressIndicator({}),
                    UI.Spacer({ height: 8 }),
                    UI.Text({ text: t.listLoading, color: colors.onSurfaceVariant })
                ]
            )
        );
    } else if (entries.value.length === 0) {
        items.push(
            UI.Card(
                { key: "empty", fillMaxWidth: true, containerColor: colors.surfaceVariant, elevation: 0 },
                [
                    UI.Column(
                        { fillMaxWidth: true, horizontalAlignment: "center", padding: 24, spacing: 8 },
                        [
                            UI.Icon({ name: "eventAvailable", size: 48, tint: colors.onSurfaceVariant.copy({ alpha: 0.5 }) }),
                            UI.Text({ text: t.emptyTitle, style: "titleMedium", color: colors.onSurface }),
                            UI.Text({ text: t.emptyDesc, style: "bodySmall", color: colors.onSurfaceVariant }),
                            UI.FilledTonalButton(
                                { onClick: doCreate, height: 36 },
                                [UI.Text({ text: t.emptyAction, color: colors.onSecondaryContainer, fontWeight: "bold" })]
                            )
                        ]
                    )
                ]
            )
        );
    } else {
        for (var i = 0; i < entries.value.length; i++) {
            items.push(renderCard(entries.value[i]));
        }
    }

    return UI.Box(
        { fillMaxSize: true },
        [
            UI.LazyColumn(
                {
                    spacing: 10,
                    padding: { horizontal: 12, vertical: 8 },
                    fillMaxSize: true,
                    onLoad: async function () {
                        if (hasLoadedOnce.value || initialLoadInFlight.value) {
                            return;
                        }
                        initialLoadInFlight.set(true);
                        try {
                            await loadEntries(true);
                        } finally {
                            initialLoadInFlight.set(false);
                        }
                    }
                },
                items
            ),
            showDeleteConfirm.value ? renderDeleteConfirm() : null
        ].filter(Boolean)
    );
}

exports.default = Screen;
