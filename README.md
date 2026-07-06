# AnniversaryPlugin / 纪念日插件

> Operit AI 脚本插件 —— 本地 JSON 存储，保存用户与 AI 之间的重要纪念日，提供日期计算、查询、删除、**上下文发送开关**与**对话自动注入**等能力。开启发送开关的纪念日会通过 `systemPromptHook` 自动出现在 AI 的系统提示词中，让 AI 在对话里看到「过了多少天 / 还差多少天」。

提供两个版本：
- **单文件基础版** [`AnniversaryPlugin.js`](AnniversaryPlugin.js:1)：最大兼容性，任何支持脚本工具包的 Operit 版本均可使用
- **原生 UI 增强版** [`native_ui/`](native_ui/manifest.json:1)：多文件包结构 + `compose_dsl` 应用内原生管理界面（详见第十章）

两个版本共享同一份数据文件，逻辑完全一致。

依据任务书 [`docs/example.md`](docs/example.md:1) 实现，API 经 Operit 官方仓库示例校准。

项目文档已收拢到 [`docs/`](docs/README.md:1)：包含部署教程、任务书与开发计划。

---

## 一、安装与加载

将 [`AnniversaryPlugin.js`](AnniversaryPlugin.js:1) 作为脚本工具包导入 Operit 即可被识别为工具集合。插件加载后会自动创建数据文件，无需手动初始化。

- **技术形态**：单文件 JavaScript 脚本插件（顶部 `/* METADATA ... */` 注释块 + `exports` 工具导出）
- **运行环境**：Operit QuickJS 脚本引擎，宿主注入 `Tools` / `ToolPkg` / `complete` 等全局对象

---

## 二、数据存储

| 项         | 说明                                                               |
| ---------- | ------------------------------------------------------------------ |
| 数据目录   | `ToolPkg.getConfigDir()` 返回的插件私有配置目录                    |
| 主数据文件 | `<configDir>/anniversaries.json`                                   |
| 备份文件   | `<configDir>/anniversaries.backup.json`（每次写入前先备份）        |
| 损坏保护   | 文件非 JSON 或非数组时返回 `STORAGE_READ_FAILED`，**绝不静默覆盖** |
| 持久化     | 重启 Operit 后数据仍在                                             |

> ⚠️ 任务书原建议相对路径 `data/anniversaries.json`，已改为官方推荐的 `ToolPkg.getConfigDir()` 可写目录，避免相对路径不可用问题。

---

## 三、数据模型

每条纪念日结构（详见 [`docs/example.md` 第 99-124 行`](docs/example.md:99)）：

| 字段                 | 类型                               | 说明                                           |
| -------------------- | ---------------------------------- | ---------------------------------------------- |
| `id`                 | string                             | 唯一 ID，格式 `anniv_<日期>_<时间戳>_<随机串>` |
| `title`              | string                             | 纪念日名称，可重复                             |
| `date`               | string                             | `YYYY-MM-DD` 公历日期                          |
| `calendarType`       | "solar"                            | 固定公历                                       |
| `mode`               | "count_up" / "count_down" / "both" | 计数模式，默认 both                            |
| `owner`              | "user" / "assistant" / "shared"    | 归属，默认 user                                |
| `description`        | string                             | 备注                                           |
| `sendToContext`      | boolean                            | 是否允许发送给 AI 上下文，默认 false           |
| `reminderEnabled`    | boolean                            | 提醒开关，默认 false（MVP 不实现提醒）         |
| `reminderDaysBefore` | number[]                           | 提醒天数，默认 []                              |
| `deleted`            | boolean                            | 软删除标记                                     |
| `deletedAt`          | string                             | 删除时间                                       |
| `createdAt`          | string                             | 创建时间（北京时间 ISO8601）                   |
| `updatedAt`          | string                             | 更新时间（北京时间 ISO8601）                   |

---

## 四、工具接口

### 1. add_anniversary — 添加纪念日

**参数**

| 参数          | 类型    | 必填 | 说明                                    |
| ------------- | ------- | ---- | --------------------------------------- |
| title         | string  | 是   | 纪念日名称                              |
| date          | string  | 是   | `YYYY-MM-DD`                            |
| owner         | string  | 否   | user / assistant / shared，默认 user    |
| mode          | string  | 否   | count_up / count_down / both，默认 both |
| description   | string  | 否   | 备注                                    |
| sendToContext | boolean | 否   | 默认 false                              |

**示例调用**

```json
{ "title": "认识纪念日", "date": "2026-07-03", "owner": "shared", "sendToContext": true }
```

**示例返回**

```json
{
  "success": true,
  "item": { "id": "anniv_20260703_..._ab12cd", "title": "认识纪念日", "date": "2026-07-03" },
  "message": "纪念日已添加"
}
```

### 2. list_anniversaries — 列出纪念日

**参数**

| 参数           | 类型    | 必填 | 说明                           |
| -------------- | ------- | ---- | ------------------------------ |
| includeDeleted | boolean | 否   | 是否包含已删除项目，默认 false |

**示例返回**

```json
{
  "success": true,
  "count": 1,
  "items": [
    { "id": "anniv_...", "title": "认识纪念日", "date": "2026-07-03", "owner": "shared", "sendToContext": true, "deleted": false }
  ]
}
```

### 3. get_anniversary_status — 查询纪念日状态

**参数**

| 参数  | 类型   | 必填 | 说明                                                  |
| ----- | ------ | ---- | ----------------------------------------------------- |
| id    | string | 否   | 纪念日 ID（与 title 二选一）                          |
| title | string | 否   | 纪念日名称（与 id 二选一）                            |
| today | string | 否   | 测试用当前日期 `YYYY-MM-DD`，未传则用北京时间当前日期 |

**计算规则**（见 [`docs/example.md` 第 233-256 行`](docs/example.md:233)）

| 场景             | daysSince | nextDate   | daysUntilNext | isToday |
| ---------------- | --------- | ---------- | ------------- | ------- |
| 今天 = 纪念日    | 0         | 当年纪念日 | 0             | true    |
| 今天在纪念日之后 | 正数      | 次年纪念日 | 正数          | false   |
| 今天在纪念日之前 | 负数      | 当年纪念日 | 正数          | false   |

**示例返回**

```json
{
  "success": true,
  "item": {
    "id": "anniv_...", "title": "认识纪念日", "date": "2026-07-03",
    "daysSince": 0, "nextDate": "2026-07-03", "daysUntilNext": 0, "isToday": true
  }
}
```

### 4. toggle_anniversary_context — 开关上下文发送

**参数**

| 参数    | 类型    | 必填 | 说明      |
| ------- | ------- | ---- | --------- |
| id      | string  | 是   | 纪念日 ID |
| enabled | boolean | 是   | 是否开启  |

**示例返回**

```json
{ "success": true, "id": "anniv_...", "sendToContext": true, "message": "已开启上下文发送" }
```

### 5. get_context_anniversaries — 返回可发送给 AI 上下文的纪念日摘要

只返回 `deleted=false` 且 `sendToContext=true` 的项目，**不含** description、deletedAt 等隐私/内部字段。

**参数**

| 参数  | 类型   | 必填 | 说明           |
| ----- | ------ | ---- | -------------- |
| today | string | 否   | 测试用当前日期 |

**示例返回**

```json
{
  "success": true,
  "count": 1,
  "items": [
    { "title": "认识纪念日", "date": "2026-07-03", "daysSince": 0, "nextDate": "2026-07-03", "daysUntilNext": 0, "isToday": true }
  ]
}
```

> 该工具供 AI 主动调用获取上下文。此外，插件已实现 `systemPromptHook`，会在每次对话组装系统提示词时**自动**把发送开关已开启的纪念日状态注入其中，AI 无需主动调工具即可看到「过了多少天 / 还差多少天」（见 [对话自动注入](#对话自动注入systemprompthook)）。

### 6. delete_anniversary — 删除纪念日（软删除）

**参数**

| 参数 | 类型   | 必填 | 说明      |
| ---- | ------ | ---- | --------- |
| id   | string | 是   | 纪念日 ID |

**示例返回**

```json
{ "success": true, "id": "anniv_...", "message": "纪念日已删除" }
```

删除后 `deleted=true`、设置 `deletedAt` 与 `updatedAt`，数据保留可恢复。

---

## 五、错误返回格式

所有工具统一格式（遵循任务书 [`docs/example.md` 第 405-432 行`](docs/example.md:405)）：

```json
{ "success": false, "error": { "code": "INVALID_DATE", "message": "日期格式无效，请使用 YYYY-MM-DD" } }
```

**错误码**

| 错误码               | 说明                                                    |
| -------------------- | ------------------------------------------------------- |
| INVALID_DATE         | 日期格式无效或非真实日历日期（含平年 2 月 29 日）       |
| INVALID_TITLE        | title 为空                                              |
| NOT_FOUND            | 未找到对应纪念日                                        |
| DUPLICATE_TITLE      | （预留）重复标题                                        |
| STORAGE_READ_FAILED  | 数据文件读取失败/损坏                                   |
| STORAGE_WRITE_FAILED | 数据写入失败                                            |
| INVALID_ARGUMENT     | 参数缺失或非法                                          |
| MULTIPLE_MATCHES     | 同名命中多条，需用 id 指定（附带 `error.matches` 列表） |
| UNKNOWN_ERROR        | 未知错误                                                |

> v2 迭代后已支持闰年 2 月 29 日，`UNSUPPORTED_LEAP_DAY` 错误码不再触发（平年 2-29 归入 `INVALID_DATE`）。错误码常量保留以兼容旧调用方。

**MULTIPLE_MATCHES 示例**

```json
{
  "success": false,
  "error": {
    "code": "MULTIPLE_MATCHES",
    "message": "找到多个同名纪念日，请使用 id 指定",
    "matches": [ { "id": "anniv_1", "title": "认识纪念日", "date": "2026-07-03" } ]
  }
}
```

---

## 六、日期规则

1. 全部按 Asia/Shanghai（北京时间）理解
2. 存储格式固定 `YYYY-MM-DD`，**不转 UTC**
3. 计算粒度：天
4. **支持闰年 2 月 29 日纪念日**（v2 迭代）：平年 2 月 29 日为非法日历日期 → `INVALID_DATE`；闰年 2 月 29 日合法可添加
5. 校验真实日历日期（如 `2026-02-30`、平年 `2026-02-29` 非法 → `INVALID_DATE`）
6. 拒绝非 `YYYY-MM-DD` 格式（`2026/07/03`、`07-03-2026` 等）

### 闰日（2-29）纪念日周年计算规则

闰日纪念日在平年采用**回退到 2 月 28 日**庆祝（业界通行做法，避免 JS Date 自动溢出到 3 月 1 日）：

| 查询日 today                 | 纪念日 base=2024-02-29 的结果                    |
| ---------------------------- | ------------------------------------------------ |
| 2024-02-29（闰年当天）       | nextDate=2024-02-29, isToday=true, daysSince=0   |
| 2025-02-28（平年回退日）     | nextDate=2025-02-28, isToday=true, daysSince=365 |
| 2025-03-01（平年已过回退日） | nextDate=2026-02-28（次年仍平年，继续回退）      |
| 2028-02-29（下一个闰年当天） | nextDate=2028-02-29, isToday=true                |

即：平年里闰日纪念日在 2-28 庆祝，逐年回退到 2-28，直到遇到闰年才在 2-29 庆祝。

---

## 七、对话自动注入（systemPromptHook）

插件实现 `systemPromptHook` 钩子，在每次对话组装系统提示词时**自动**把「发送开关（`sendToContext`）已开启」的纪念日状态注入其中。AI 无需主动调用 `get_context_anniversaries`，即可在对话里看到「过了多少天 / 还差多少天」。

### 工作流程

1. 宿主在 `after_compose_system_prompt` 阶段调用 `systemPromptHook(event)`
2. 钩子读取 `anniversaries.json`，筛选 `deleted=false` 且 `sendToContext=true` 的记录
3. 逐条计算状态（`getAnniversaryStatus`），按 `mode` 生成自然语言摘要
4. 拼接成 `【纪念日提醒】今天是 YYYY-MM-DD。…。` 追加到原系统提示词末尾
5. 返回 `{ systemPrompt }`；若无开启项或出错，返回 `null`（不修改提示词）

### 摘要文案规则（formatContextSummary）

按 `mode` 决定输出内容，`isToday` 任何模式都优先提示：

| 条件                                            | 输出                                       |
| ----------------------------------------------- | ------------------------------------------ |
| `isToday=true`                                  | `今天是「名称」的纪念日`                   |
| `mode=count_up` / `both` 且 `daysSince>0`       | `「名称」已过去 N 天`                      |
| `mode=count_down` / `both` 且 `daysUntilNext>0` | `距离下一次「名称」(YYYY-MM-DD) 还有 N 天` |

> `daysSince=0` 或 `daysUntilNext=0` 时对应片段不输出（当天只提示「今天是纪念日」），避免冗余。

### 注入示例

假设今天 2026-07-04，有一条 `mode=both` 的「认识纪念日」(base=2026-07-03)，发送开关已开启。AI 系统提示词末尾会自动追加：

```
【纪念日提醒】今天是 2026-07-04。「认识纪念日」已过去 1 天；距离下一次「认识纪念日」(2027-07-03) 还有 364 天。
```

### 容错保证

- 非目标阶段（`event` 非 `after_compose_system_prompt`）→ 返回 `null`
- 无开启项 → 返回 `null`
- 数据文件损坏 / 读取异常 → **静默返回 `null`**，绝不抛错阻断对话

---

## 八、实现说明（兼容调整）

基于 Operit 官方仓库示例（[AAswordman/Operit](https://github.com/AAswordman/Operit)）对任务书草案做的调整：

1. **METADATA 格式**：`description` / `display_name` 采用官方 `{ "zh": "...", "en": "..." }` 对象格式，而非任务书草案的纯字符串。
2. **数据路径**：使用 `ToolPkg.getConfigDir()` 获取插件可写目录（官方 [`worldbook_storage.ts`](../_operit_ref/examples/worldbook/src/shared/worldbook_storage.ts:4) 模式），替代任务书的相对路径 `data/anniversaries.json`。
3. **错误返回格式**：遵循任务书嵌套 `{ success:false, error:{code,message} }`；官方示例为扁平 `{ success:false, code, message }`，以任务书为准。
4. **结果返回机制**：工具函数通过全局 `complete(result)` 把结果交还宿主（官方 [`worldbook_tools.ts:367`](../_operit_ref/examples/worldbook/src/packages/worldbook_tools.ts:367) 机制），任务书未提及但为 Operit 脚本环境必需。`wrap` 函数同时 `return` 结果，兼容有/无 `complete` 的环境。
5. **`systemPromptHook` 自动注入**：任务书仅设计了 `get_context_anniversaries` 工具调用形式（已实现）。在此基础上新增 `systemPromptHook`，在 `after_compose_system_prompt` 阶段把发送开关已开启的纪念日状态自动拼入系统提示词，让 AI 在对话里直接看到「过了多少天 / 还差多少天」（参考 [`worldbook main.ts:250`](../_operit_ref/examples/worldbook/src/main.ts:250)）。钩子对任何异常都静默返回 `null`，绝不阻断用户对话。

---

## 九、自测

项目包含 [`_selftest.js`](_selftest.js:1)，可在 Node.js 环境运行（mock 宿主对象）验证逻辑：

```bash
node _selftest.js
```

覆盖任务书全部 10 条测试用例 + 4 条补充用例 + 4 个非法格式边界 + NOT_FOUND + v2 闰日周年计算专项 + v3 自动注入控制流专项，共 84 项断言全部通过。

详细的测试用例清单见 [`tests/测试用例清单.md`](tests/测试用例清单.md:1)。

---

## 十、原生 UI 增强版（v4）

在单文件基础版之上，另提供一个**原生 UI 增强版**（[`native_ui/`](native_ui/manifest.json:1) 目录），采用 Operit 多文件包结构 + `compose_dsl` 声明式 UI，在应用内提供图形化的纪念日管理界面。

### 两个版本的关系

| 维度     | 单文件基础版 ([`AnniversaryPlugin.js`](AnniversaryPlugin.js:1)) | 原生 UI 增强版 ([`native_ui/`](native_ui/manifest.json:1))                    |
| -------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 技术形态 | 单文件 JS + `/* METADATA */` + `exports`                        | 多文件包：`manifest.json` + `dist/` 目录 + `registerToolPkg()`                |
| 兼容性   | 最大兼容，任何支持脚本工具包的 Operit 版本均可使用              | 需要支持 `ToolPkg.registerUiRoute` / `compose_dsl` 的较新版本                 |
| 用户界面 | 无 UI，纯 AI 对话工具调用                                       | Operit 应用内原生 UI 页面（列表 / 表单 / 开关），支持侧边栏入口并保留工具箱入口 |
| 数据共享 | —                                                               | **与基础版共享同一份数据文件**（`ToolPkg.getConfigDir()/anniversaries.json`） |
| AI 工具  | 6 个工具（add / list / status / toggle / context / delete）     | 相同 6 个工具（子包 `anniversary_tools`）                                     |
| 自动注入 | `exports.systemPromptHook`                                      | `ToolPkg.registerSystemPromptComposeHook`                                     |
| 适用场景 | 发给任意已装 Operit 的用户                                      | 自己使用或发给支持原生 UI 的用户                                              |

### 包目录结构

```
native_ui/
├── manifest.json                          # 包清单（toolpkg_id, main, subpackages）
├── _selftest.js                           # 独立自测脚本（59 项断言）
└── dist/
    ├── main.js                            # 入口：registerToolPkg() 注册 UI 路由 + 导航 + 钩子
    ├── shared/
    │   ├── anniversary_storage.js         # 存储层（与基础版逻辑一致）
    │   └── anniversary_service.js         # Service 层（日期计算 + CRUD + systemPromptHook）
    ├── packages/
    │   └── anniversary_tools.js           # 工具子包（6 个工具导出，供 AI 调用）
    └── ui/
        └── anniversary_manager/
            └── index.ui.js                # compose_dsl UI 页面（Screen 函数）
```

### 架构分层

```
┌─────────────────────────────────────────────────┐
│  main.js (registerToolPkg)                      │
│  ├── registerUiRoute → index.ui.js (compose_dsl)│
│  ├── registerNavigationEntry → 侧边栏入口 + 工具箱入口 │
│  └── registerSystemPromptComposeHook → 钩子      │
├─────────────────────────────────────────────────┤
│  packages/anniversary_tools.js (AI 工具)         │
│  └── add / list / status / toggle / context / delete │
├─────────────────────────────────────────────────┤
│  shared/anniversary_service.js (核心逻辑)        │
│  ├── 日期计算（闰年/闰日/周年/状态）              │
│  ├── CRUD（create/update/list/get/toggle/delete）│
│  ├── formatContextSummary / buildContextInjection│
│  └── systemPromptHook                           │
├─────────────────────────────────────────────────┤
│  shared/anniversary_storage.js (存储层)          │
│  ├── ToolPkg.getConfigDir() + Tools.Files.*     │
│  ├── ensureDataFile / loadAnniversaries         │
│  └── saveAnniversaries（备份优先）               │
└─────────────────────────────────────────────────┘
```

### UI 功能

原生 UI 页面（[`index.ui.js`](native_ui/dist/ui/anniversary_manager/index.ui.js:1)）提供以下功能：

1. **纪念日列表**：卡片式展示所有纪念日，显示名称、日期、归属、模式、上下文开关状态、实时天数计算
2. **添加纪念日**：表单填写名称、日期、备注、归属（用户/AI/共同）、计数模式（双向/已过/倒计）、上下文发送开关
3. **编辑纪念日**：点击卡片或编辑按钮进入编辑表单，支持部分更新
4. **删除纪念日**：确认对话框 → 软删除
5. **上下文开关**：列表卡片上的 Switch 直接切换，实时生效
6. **空状态**：无纪念日时显示引导创建
7. **中英双语**：跟随宿主 `getLang()` 自动切换

### 安装方式

将整个 [`native_ui/`](native_ui/manifest.json:1) 目录作为工具包导入 Operit（支持 `manifest.json` 多文件包格式的版本）。导入后，支持 `sidebar` 导航面的 Operit 版本会在侧边栏出现「纪念日」入口；旧版本仍会在工具箱中显示「纪念日管理」入口，点击即可打开原生管理界面。

### 自测

```bash
node native_ui/_selftest.js
```

覆盖日期计算（闰年/闰日/周年）、CRUD 全流程、工具子包、formatContextSummary（三种模式）、systemPromptHook 控制流、数据兼容性、防剽窃防护（完整性校验/数据指纹/篡改降级/哨兵检测），共 100 项断言全部通过。

---

## 十一、Web UI 实时更新方案

项目新增一个可独立打开的 Web UI：[`simple_web_ui/simple_index.html`](simple_web_ui/simple_index.html:1)。它与 [`simple_web_ui/les_jours_mock.html`](simple_web_ui/les_jours_mock.html:1) 的定位不同：

| 文件 | 定位 |
| ---- | ---- |
| `simple_index.html` | 真实纪念日管理 Web UI，支持 bridge、实时轮询、CRUD、上下文开关 |
| `les_jours_mock.html` | 视觉原型 / 日历氛围参考，仍使用浏览器本地 demo 数据 |

### 共享 API 层

Web UI 不直接读写 `anniversaries.json`，而是通过 [`native_ui/dist/shared/anniversary_api.js`](native_ui/dist/shared/anniversary_api.js:1) 统一调用现有 service 层：

| API action | 说明 |
| ---------- | ---- |
| `list_snapshot` | 返回 `{ success, today, version, count, items }`，每个 item 带实时 `status` |
| `create` | 新建纪念日并返回最新 snapshot |
| `update` | 更新纪念日并返回最新 snapshot |
| `delete` | 软删除纪念日并返回最新 snapshot |
| `toggle_context` | 切换 `sendToContext` 并返回最新 snapshot |
| `get_status` | 查询单条纪念日状态 |

`version` 由现有数据字段计算，不改变 `anniversaries.json` 的数组结构。Web UI 在编辑、删除、切换时会提交 `expectedVersion`；如果数据已经被 AI 工具或其他页面改动，API 返回 `DATA_CHANGED`，避免旧页面覆盖新数据。

### 运行模式

1. **Operit 原生 UI 模式**：当前正式内置入口仍是 `compose_dsl`，由 `ToolPkg.registerUiRoute({ runtime: "compose_dsl" })` 注册。
2. **普通浏览器预览模式**：直接打开 `simple_web_ui/simple_index.html`，页面会自动使用 `MockBridge` 和 `localStorage`，不写入真实插件数据。
3. **宿主 WebView bridge 模式**：如果 Operit 后续支持 HTML/WebView 路由，宿主只需要注入以下对象之一：

```js
window.AnniversaryBridge = {
  async invoke(action, params) {
    // action: list_snapshot / create / update / delete / toggle_context / get_status
    // params: 普通 JSON 对象
    // return: anniversary_api.invoke(action, params) 的结果
  }
};
```

页面也兼容 `window.OperitAnniversaryBridge.invoke(action, params)` 别名。bridge 返回对象或 JSON 字符串均可。

### 实时刷新

Web UI 默认每 2 秒调用一次 `list_snapshot`。只有 `version` 变化时才重新渲染；页面隐藏时暂停主动轮询，重新可见时立即刷新。用户本地保存、删除、切换成功后会直接使用返回的 snapshot 更新页面，不等待下一轮轮询。

### 自测

```bash
node simple_web_ui/_selftest.js
```

该脚本验证 Web UI 中的 bridge、mock fallback、`list_snapshot`、`expectedVersion` 与轮询入口仍存在。

---

## 十二、防剽窃与作者权益保护

本项目采用 **强力分层防护** 策略，防止项目被剽窃、作者信息被删除后声称原创。防护机制编织进功能性代码，即使侵权者删除可见版权头，残留指纹仍可作为原创归属的取证证据。

### 防护层级

| 层级       | 机制                   | 说明                                                                      |
| ---------- | ---------------------- | ------------------------------------------------------------------------- |
| 法律层     | [`LICENSE`](LICENSE:1) | MIT 协议全文 + 防剽窃声明，明确删除署名构成协议违反                       |
| 文件头     | 版权声明               | 所有源文件顶部含 `Copyright (c) 2026 奶油话梅糖 <nyanon@vip.qq.com> (MIT)` |
| 功能性水印 | `_W` 常量              | `author` / `origin` / `year` / `salt` 参与数据指纹计算，篡改即改变行为    |
| 自校验     | `_SELF_CHECK`          | 预计算水印哈希值，运行时重算比对，不匹配即判定篡改                        |
| 散布式哨兵 | `_G_S::anniv::*`       | 哨兵字符串散布于各源文件，删除后哨兵检测失败                              |
| 数据指纹   | `_afp` 字段            | 每条纪念日记录写入隐藏作者指纹，留存磁盘取证证据                          |
| 破坏性降级 | `verifyIntegrity()`    | 检测到篡改后工具返回版权警告（`INTEGRITY_VIOLATION`），功能降级           |

### 核心模块

- **基础版**：防护逻辑内嵌于 [`AnniversaryPlugin.js`](AnniversaryPlugin.js:1)（`_W` 常量、`verifyIntegrity()`、`stampAuthorFingerprint()`、`makeDegradedResponse()`）
- **原生 UI 版**：防护逻辑集中在 [`_guard.js`](native_ui/dist/shared/_guard.js:1)，被 service 层和 tools 层引用

### 篡改后的行为

| 篡改行为                     | 检测结果             | 降级响应                                |
| ---------------------------- | -------------------- | --------------------------------------- |
| 删除文件头版权声明           | 哨兵检测失败         | 工具返回 `INTEGRITY_VIOLATION` 版权警告 |
| 篡改 `_W.author` / `_W.salt` | 水印自检失败         | 工具功能降级，返回版权警告              |
| 删除 `_guard.js` 模块        | 引用断裂             | 模块加载失败                            |
| 洗代码（变量重命名）         | 水印常量被改         | 自校验值不匹配，功能降级                |
| 复制代码移除防护             | 新记录无 `_afp` 指纹 | 与原始记录形成差异，可证明代码来源      |

### 取证说明

即使侵权者删除了所有可见的版权头和注释，已写入用户磁盘的纪念日记录仍携带 `_afp` 作者指纹字段。该字段由 `_hash(id + createdAt + salt)` 计算，与原始项目的 `_W.salt` 绑定。侵权者复制代码后若移除防护模块，新创建的记录将缺失 `_afp` 字段，与原始记录形成可检测的差异，作为代码来源归属的技术证据。
