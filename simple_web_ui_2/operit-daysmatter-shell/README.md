# Operit DaysMatter 风格前端壳子

这是一个无依赖静态原型，用于给 Operit 插件系统提供用户交互、插件管理、定时任务和日志查看页面

## 运行

直接打开 `index.html` 即可预览

也可以放进任意 WebView / Android Asset / 静态服务器中运行

## 页面结构

- 首页：类似倒数日的卡片列表，用状态徽章展示插件运行情况
- 插件中心：搜索、启用开关、配置入口
- 任务页：用日期卡片表达定时任务和触发器
- 日志页：展示插件调用、失败和权限事件
- 底部导航：四个核心模块切换

## 与 Operit 插件系统对接

`app.js` 中预留了 `window.OperitBridge` 桥接层

```js
window.OperitBridge = {
  async listPlugins() {},
  async updatePlugin(id, jsonPatch) {},
  async testPlugin(id) {}
}
```

Android WebView / Compose WebView 可把原生接口注入为 `OperitBridge`

当前没有真实桥接时，会使用本地 Mock 数据运行

## 可继续扩展的接口

```ts
type Plugin = {
  id: string
  icon: string
  name: string
  type: "Skill" | "MCP" | "Tool" | "Agent" | "Workflow"
  desc: string
  enabled: boolean
  status: string
  tone: "success" | "warning" | "danger" | "muted" | "blue"
  calls: number
  endpoint: string
}
```

## 设计方向

参考倒数日的核心视觉语言：蓝色顶栏、日历图标、白色卡片、列表化状态、底部导航

没有复制倒数日品牌素材、图标或具体界面资产，实际商用时建议替换为 Operit 自有 Logo 和视觉规范
