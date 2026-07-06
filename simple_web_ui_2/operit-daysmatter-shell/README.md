# DaysMatter · 纪念日 Web UI

Operit 纪念日插件的响应式 Web 管理界面，作为主入口提供纪念日日历、增删改查与上下文开关管理。

## 运行

建议从项目根目录启动静态服务器后访问：

```bash
python -m http.server 4173 -b 127.0.0.1
```

然后打开：

```text
http://127.0.0.1:4173/simple_web_ui_2/operit-daysmatter-shell/index.html
```

独立运行时使用 `localStorage` 模拟数据。发布用的 `operit-daysmatter-shell.zip` 保留了 `simple_web_ui_2/operit-daysmatter-shell` 与 `shared` 的项目目录结构，解压后同样建议从解压根目录启动静态服务器访问。

也可以放进任意 WebView / 静态服务器中运行；在 Operit 宿主中运行时优先通过 `window.OperitBridge` 调用真实纪念日 API。

## 页面结构

### 首页 `index.html`
- 顶部导航：抽屉菜单入口 + 品牌名 DaysMatter
- Hero：品牌标题、图例说明、操作提示
- 日历卡片：月份切换、日期网格，红点/蓝点标记纪念日与临近日期
- 当日纪念：选中日期对应的纪念日
- 全部纪念入口：跳转至 `all.html`
- 底部表单：添加/编辑纪念日（名称、日期、备注、归属、计数模式、上下文开关）

### 全部纪念页 `all.html`
- 顶部返回按钮回到首页
- 搜索栏：按名称/备注/日期实时过滤
- 纪念日列表：按临近程度排序，点击编辑
- 右下角悬浮按钮：添加新纪念日

## 公共模块

- `bridge.js`：与 Operit 宿主或 localStorage 模拟层通信
- `utils.js`：日期计算、纪念日状态、卡片渲染等共享工具
- `theme.js`：主题色（HSL）持久化与应用

## 与 Operit 插件系统对接

`bridge.js` 中预留了 `window.OperitBridge` 桥接层：

```js
window.OperitBridge = {
  async anniversaryInvoke(action, paramsJsonString) {
    // action: "list_snapshot" | "create" | "update" | "delete" | "toggle_context"
    // params: JSON 字符串，字段与 anniversary_api.js 一致
    return JSON.stringify(result);
  }
}
```

Android WebView / Compose WebView 可把原生接口注入为 `OperitBridge.anniversaryInvoke`。

当前没有真实桥接时，会自动回退到 localStorage 模拟存储，数据结构与真实 API 保持一致。
