# 如何部署 Web UI

本文说明如何部署 `DaysMatter` 纪念日 Web UI，以及它和 Operit 原生 UI 的关系。

## 1. 先看结论

本项目目前有两个 UI 入口：

- **Operit 原生 UI**：推荐在 Operit 内正式使用，来自 `com.operit.anniversary-1.1.0.toolpkg`。
- **Web UI**：位于 `simple_web_ui_2/operit-daysmatter-shell/`，适合浏览器预览、WebView 集成或后续接入 Operit WebView。

如果只是用浏览器打开 Web UI，它会使用 `localStorage` 模拟数据，不会读写真正的 Operit 插件数据。

如果要让 Web UI 在 Operit 内读写真正纪念日数据，需要 Operit WebView 注入 `window.OperitBridge`。

## 2. 文件结构

Web UI 依赖两个目录：

```text
simple_web_ui_2/operit-daysmatter-shell/
shared/
```

不要只复制 `index.html`。页面里的模块导入依赖相对路径：

```js
../../shared/date-utils.js
../../shared/ui-utils.js
../../shared/constants.js
```

因此部署时需要保留项目目录结构。

## 3. 本地浏览器预览

在项目根目录运行：

```bash
python -m http.server 4173 -b 127.0.0.1
```

然后访问：

```text
http://127.0.0.1:4173/simple_web_ui_2/operit-daysmatter-shell/index.html
```

也可以打开全部纪念页：

```text
http://127.0.0.1:4173/simple_web_ui_2/operit-daysmatter-shell/all.html
```

浏览器预览模式下，数据保存在当前浏览器的 `localStorage` 中，key 是：

```text
operit-daysmatter-web-data
```

这只适合预览和调试。

## 4. 使用发布 zip

发布包是：

```text
simple_web_ui_2/operit-daysmatter-shell.zip
```

解压后应能看到：

```text
shared/
simple_web_ui_2/
  operit-daysmatter-shell/
    index.html
    all.html
    app.js
    bridge.js
    sheet.js
    theme.js
    styles.css
```

在解压后的根目录启动静态服务：

```bash
python -m http.server 4173 -b 127.0.0.1
```

访问：

```text
http://127.0.0.1:4173/simple_web_ui_2/operit-daysmatter-shell/index.html
```

## 5. 接入 Operit WebView

如果 Operit 支持加载本地 WebView 页面，需要同时满足两点：

1. WebView 能加载 `simple_web_ui_2/operit-daysmatter-shell/index.html` 及其依赖的 JS/CSS 文件。
2. WebView 注入 `window.OperitBridge.anniversaryInvoke`，让 Web UI 调用真实纪念日 API。

桥接对象格式如下：

```js
window.OperitBridge = {
  async anniversaryInvoke(action, paramsJsonString) {
    // action: list_snapshot / create / update / delete / toggle_context / toggle_pin / batch_delete / export_data / import_data
    // paramsJsonString: JSON 字符串
    // return: JSON 字符串
    return JSON.stringify(result);
  }
};
```

Web UI 会优先调用 `window.OperitBridge`。如果没有这个对象，就自动回退到 `localStorage` 模拟数据。

## 6. Web UI 需要的 action

当前 Web UI 主要使用这些 action：

```text
list_snapshot
create
update
delete
toggle_context
toggle_pin
batch_delete
export_data
import_data
```

返回值建议统一为：

```json
{
  "success": true,
  "snapshot": {
    "today": "2026-07-06",
    "version": "local:1",
    "count": 1,
    "items": []
  }
}
```

失败时返回：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误说明"
  }
}
```

## 7. 和 Operit 原生 UI 的区别

### 原生 UI

文件：

```text
com.operit.anniversary-1.1.0.toolpkg
```

特点：

- 更适合 Operit 内正式使用。
- 使用 `native_ui/dist/main.js` 注册原生入口。
- 支持 `sidebar` 导航面的 Operit 版本会在侧边栏显示「纪念日」入口；旧版本仍保留工具箱里的「纪念日管理」入口。
- 支持 `ToolPkg.registerUiRoute` 和 `compose_dsl` 的 Operit 版本可直接打开。

### Web UI

文件：

```text
simple_web_ui_2/operit-daysmatter-shell.zip
```

特点：

- 适合浏览器预览、WebView 集成、独立页面调试。
- 没有 `OperitBridge` 时只使用浏览器本地模拟数据。
- 要接入真实 Operit 数据，必须由宿主 WebView 注入桥接对象。

## 8. 常见问题

### 直接双击 index.html 为什么打不开？

Web UI 使用 ES Modules，浏览器通过 `file://` 打开时容易因为模块加载和相对路径限制失败。

请使用静态服务器访问。

### 为什么浏览器里添加的数据在 Operit 里看不到？

因为浏览器预览模式使用的是 `localStorage` 模拟数据。

只有注入 `window.OperitBridge` 后，Web UI 才会调用真实 Operit 插件数据。

### 为什么必须保留 shared 目录？

Web UI 的日期计算、卡片渲染、常量定义都在 `shared/` 中。缺少这个目录会导致模块加载失败。

### 发布前需要检查什么？

建议至少执行：

```bash
node _selftest.js
node native_ui/_selftest.js
node simple_web_ui/_selftest.js
```

并确认发布包已重新生成：

```text
com.operit.anniversary-1.1.0.toolpkg
simple_web_ui_2/operit-daysmatter-shell.zip
```
