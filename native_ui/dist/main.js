"use strict";
// ============================================================
// 纪念日插件 - 原生 UI 增强版入口
// Copyright (c) 2026 AnniversaryPluginContributors (MIT)
// 参考 worldbook main.ts: registerToolPkg() 注册 UI 路由、导航入口、系统提示词钩子
// 本文件含作者水印哨兵 _G_S::anniv::orig::2，删除后校验失败。
// ============================================================
// _G_S::anniv::orig::2 — 来源水印哨兵

var anniversaryManagerModule = require("./ui/anniversary_manager/index.ui.js");
var anniversaryManagerScreen = anniversaryManagerModule.default || anniversaryManagerModule;
var service = require("./shared/anniversary_service.js");
var storage = require("./shared/anniversary_storage.js");

var ANNIVERSARY_ROUTE = "toolpkg:com.operit.anniversary:ui:anniversary_manager";

// 声明宿主提供的全局对象（TypeScript 中为 declare，JS 中直接使用）
// ToolPkg: registerUiRoute / registerNavigationEntry / registerSystemPromptComposeHook
// Icons: 图标枚举

// 系统提示词钩子（与单文件基础版逻辑一致，复用 service 层）
var systemPromptHook = service.systemPromptHook;

function registerToolPkg() {
    // 确保存储目录与数据文件存在
    void storage.ensureDataFile().catch(function () { });
    var navigationIcon = (typeof Icons !== "undefined" && Icons.Calendar) ? Icons.Calendar : "calendar";

    // 注册 UI 路由：compose_dsl 运行时
    ToolPkg.registerUiRoute({
        id: "anniversary_manager",
        route: ANNIVERSARY_ROUTE,
        runtime: "compose_dsl",
        screen: anniversaryManagerScreen,
        params: {},
        title: {
            zh: "纪念日管理",
            en: "Anniversary Manager"
        }
    });

    // 注册工具箱导航入口（在 Operit 工具箱中显示入口图标）
    ToolPkg.registerNavigationEntry({
        id: "anniversary_manager_toolbox",
        route: ANNIVERSARY_ROUTE,
        surface: "toolbox",
        title: {
            zh: "纪念日管理",
            en: "Anniversary Manager"
        },
        icon: navigationIcon,
        order: 220
    });

    // 注册系统提示词组装钩子：让 AI 在对话中自动看到纪念日状态
    ToolPkg.registerSystemPromptComposeHook({
        id: "anniversary_context_inject",
        function: systemPromptHook
    });

    return true;
}

exports.registerToolPkg = registerToolPkg;
exports.systemPromptHook = systemPromptHook;
