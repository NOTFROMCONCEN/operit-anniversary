纪念日插件开发任务书
项目名称
AnniversaryPlugin / 纪念日插件
项目目标

开发一个 Operit AI 脚本插件，用于保存用户与 AI 之间的重要日期，并提供日期计算、查询、删除、上下文发送开关等能力

插件第一版只做 本地 JSON 存储 + 公历日期计算 + 工具调用接口

不要做 APK，不要做 UI，不要做农历，不要做系统通知，不要做云同步

一、核心功能范围
MVP 必须实现
1. 添加纪念日
2. 查询纪念日列表
3. 查询某个纪念日状态
4. 计算已经过去多少天
5. 计算距离下一次纪念日还有多少天
6. 开启或关闭“发送给 AI 上下文”
7. 删除纪念日
8. 返回允许发送给 AI 上下文的纪念日摘要
9. 本地 JSON 文件持久化
10. 非法日期校验
MVP 暂不实现
1. 农历纪念日
2. 系统通知提醒
3. 安卓 Calendar 同步
4. 图片附件
5. 云同步
6. 复杂 UI
7. 语音播报
8. 多设备同步
9. 加密存储
10. 2 月 29 日复杂规则
二、插件设计原则
1. 数据只存在本地 JSON

建议文件路径：

data/anniversaries.json

如果 Operit 插件环境不支持相对目录，则由编程 Agent 根据官方示例选择可写目录

需要实现读取、写入、初始化

如果文件不存在，自动创建空数组

2. 默认时区

全部日期按中国用户使用场景处理

默认时区：Asia/Shanghai
计算粒度：天
日期格式：YYYY-MM-DD

不要把纪念日转换成 UTC 的 YYYY-MM-DDT00:00:00Z

避免跨时区导致日期偏移

3. 只处理公历日期

第一版只接受：

YYYY-MM-DD

例如：

2026-07-03

非法输入需要拒绝

例如：

2026-13-01
2026-02-30
2026/07/03
07-03-2026

第一版遇到 02-29 可以直接拒绝，并提示暂不支持 2 月 29 日纪念日

4. 隐私开关

每条纪念日必须有：

sendToContext: boolean

含义：

true：允许通过 get_context_anniversaries 返回给 AI 上下文
false：普通查询可以查到，但不会主动发送给 AI 上下文

默认值建议：

sendToContext = false

只有用户明确说“以后你可以看到这个纪念日”“发送给上下文”“对话里记得提醒我”时，才开启

三、数据模型
TypeScript 类型
type AnniversaryOwner = "user" | "assistant" | "shared"

type AnniversaryMode = "count_up" | "count_down" | "both"

type Anniversary = {
  id: string
  title: string
  date: string

  calendarType: "solar"
  mode: AnniversaryMode
  owner: AnniversaryOwner

  description?: string

  sendToContext: boolean
  reminderEnabled: boolean
  reminderDaysBefore: number[]

  deleted: boolean
  deletedAt?: string

  createdAt: string
  updatedAt: string
}
JSON 示例
[
  {
    "id": "anniv_20260703_001_ab12cd",
    "title": "认识纪念日",
    "date": "2026-07-03",
    "calendarType": "solar",
    "mode": "both",
    "owner": "shared",
    "description": "用户和机共同保存的纪念日",
    "sendToContext": true,
    "reminderEnabled": false,
    "reminderDaysBefore": [],
    "deleted": false,
    "createdAt": "2026-07-03T21:30:00+08:00",
    "updatedAt": "2026-07-03T21:30:00+08:00"
  }
]
四、工具接口设计
1. add_anniversary
功能

添加一个纪念日

参数
{
  title: string
  date: string
  owner?: "user" | "assistant" | "shared"
  mode?: "count_up" | "count_down" | "both"
  description?: string
  sendToContext?: boolean
}
规则
title 必填
date 必须是 YYYY-MM-DD
owner 默认 user
mode 默认 both
sendToContext 默认 false
calendarType 固定 solar
reminderEnabled 默认 false
reminderDaysBefore 默认 []
deleted 默认 false
返回
{
  "success": true,
  "item": {
    "id": "anniv_...",
    "title": "认识纪念日",
    "date": "2026-07-03"
  },
  "message": "纪念日已添加"
}
2. list_anniversaries
功能

列出所有未删除纪念日

参数
{
  includeDeleted?: boolean
}
返回
{
  "success": true,
  "count": 1,
  "items": [
    {
      "id": "anniv_20260703_001_ab12cd",
      "title": "认识纪念日",
      "date": "2026-07-03",
      "owner": "shared",
      "sendToContext": true
    }
  ]
}
3. get_anniversary_status
功能

查询某个纪念日的当前状态

参数

允许通过 id 或 title 查询

{
  id?: string
  title?: string
  today?: string
}

today 主要用于测试

正式运行时如果未传入 today，则自动使用当前北京时间日期

返回
{
  "success": true,
  "item": {
    "id": "anniv_20260703_001_ab12cd",
    "title": "认识纪念日",
    "date": "2026-07-03",
    "daysSince": 0,
    "nextDate": "2026-07-03",
    "daysUntilNext": 0,
    "isToday": true
  }
}
计算规则

假设纪念日是 2026-07-03

如果今天是 2026-07-03

daysSince = 0
nextDate = 2026-07-03
daysUntilNext = 0
isToday = true

如果今天是 2026-07-04

daysSince = 1
nextDate = 2027-07-03
daysUntilNext = 364
isToday = false

如果今天是 2026-07-02

daysSince = -1
nextDate = 2026-07-03
daysUntilNext = 1
isToday = false
4. toggle_anniversary_context
功能

开启或关闭某个纪念日的上下文发送

参数
{
  id: string
  enabled: boolean
}
返回
{
  "success": true,
  "id": "anniv_20260703_001_ab12cd",
  "sendToContext": true,
  "message": "已开启上下文发送"
}
5. get_context_anniversaries
功能

返回允许发送给 AI 上下文的纪念日摘要

这是给 AI 自动读取上下文用的，不应该返回所有隐私字段

参数
{
  today?: string
}
返回
{
  "success": true,
  "count": 1,
  "items": [
    {
      "title": "认识纪念日",
      "date": "2026-07-03",
      "daysSince": 0,
      "nextDate": "2026-07-03",
      "daysUntilNext": 0,
      "isToday": true
    }
  ]
}
注意

只返回：

deleted = false
sendToContext = true

的项目

6. delete_anniversary
功能

删除纪念日

建议做软删除，不要物理删除

参数
{
  id: string
}
实现
deleted = true
deletedAt = 当前时间
updatedAt = 当前时间
返回
{
  "success": true,
  "id": "anniv_20260703_001_ab12cd",
  "message": "纪念日已删除"
}
五、日期工具函数要求

必须单独封装日期工具，不要散落在业务函数里

建议实现：

function isValidYMD(date: string): boolean

function parseYMD(date: string): {
  y: number
  m: number
  d: number
}

function getTodayYMDInShanghai(): string

function diffDays(fromDate: string, toDate: string): number

function nextOccurrence(baseDate: string, today: string): string

function getAnniversaryStatus(baseDate: string, today: string): {
  daysSince: number
  nextDate: string
  daysUntilNext: number
  isToday: boolean
}
日期计算不要直接用字符串比较

可以用本地 Date，但要避免 UTC

推荐：

function toLocalDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}
六、存储层要求

必须单独封装存储函数

async function loadAnniversaries(): Promise<Anniversary[]>

async function saveAnniversaries(items: Anniversary[]): Promise<void>

async function ensureDataFile(): Promise<void>
写入规则

写入前先读旧数据

写入前校验数组格式

写入时建议先写备份

anniversaries.backup.json
anniversaries.json

如果 anniversaries.json 损坏，插件应该返回明确错误，不要静默覆盖

七、ID 生成规则

不要只用 title

不要只用时间戳

建议：

function genId(): string {
  const datePart = getTodayYMDInShanghai().replace(/-/g, "")
  const rand = Math.random().toString(36).slice(2, 8)
  return `anniv_${datePart}_${Date.now()}_${rand}`
}
八、错误返回格式

所有工具必须统一返回格式

成功：

{
  "success": true,
  "data": {}
}

失败：

{
  "success": false,
  "error": {
    "code": "INVALID_DATE",
    "message": "日期格式无效，请使用 YYYY-MM-DD"
  }
}

建议错误码：

INVALID_DATE
INVALID_TITLE
NOT_FOUND
DUPLICATE_TITLE
STORAGE_READ_FAILED
STORAGE_WRITE_FAILED
UNSUPPORTED_LEAP_DAY
INVALID_ARGUMENT
UNKNOWN_ERROR
九、重复纪念日处理

第一版允许不同日期同名，但同名查询时可能歧义

规则建议：

1. id 永远唯一
2. title 可以重复
3. get_anniversary_status 如果 title 命中多条，返回 MULTIPLE_MATCHES，让 AI 提示用户选择
4. 修改、删除、上下文开关必须优先使用 id

重复 title 返回示例：

{
  "success": false,
  "error": {
    "code": "MULTIPLE_MATCHES",
    "message": "找到多个同名纪念日，请使用 id 指定",
    "matches": [
      {
        "id": "anniv_1",
        "title": "认识纪念日",
        "date": "2026-07-03"
      },
      {
        "id": "anniv_2",
        "title": "认识纪念日",
        "date": "2027-07-03"
      }
    ]
  }
}
十、METADATA 草案

编程 Agent 需要根据 Operit 当前版本的官方示例微调字段格式

/*
METADATA
{
  "name": "AnniversaryPlugin",
  "display_name": {
    "zh": "纪念日插件",
    "en": "Anniversary Plugin"
  },
  "description": "保存纪念日，计算已过去天数和距离下一次纪念日的天数，并支持上下文发送开关",
  "category": "Utility",
  "tools": [
    {
      "name": "add_anniversary",
      "description": "添加一个纪念日",
      "parameters": [
        { "name": "title", "description": "纪念日名称", "type": "string", "required": true },
        { "name": "date", "description": "日期，格式 YYYY-MM-DD", "type": "string", "required": true },
        { "name": "owner", "description": "归属，可选 user assistant shared", "type": "string", "required": false },
        { "name": "mode", "description": "计数模式，可选 count_up count_down both", "type": "string", "required": false },
        { "name": "description", "description": "备注", "type": "string", "required": false },
        { "name": "sendToContext", "description": "是否允许发送给 AI 上下文", "type": "boolean", "required": false }
      ]
    },
    {
      "name": "list_anniversaries",
      "description": "列出纪念日",
      "parameters": [
        { "name": "includeDeleted", "description": "是否包含已删除项目", "type": "boolean", "required": false }
      ]
    },
    {
      "name": "get_anniversary_status",
      "description": "查询纪念日状态，包括已过去天数和距离下一次纪念日的天数",
      "parameters": [
        { "name": "id", "description": "纪念日 ID", "type": "string", "required": false },
        { "name": "title", "description": "纪念日名称", "type": "string", "required": false },
        { "name": "today", "description": "测试用当前日期，格式 YYYY-MM-DD", "type": "string", "required": false }
      ]
    },
    {
      "name": "toggle_anniversary_context",
      "description": "开启或关闭某个纪念日的上下文发送",
      "parameters": [
        { "name": "id", "description": "纪念日 ID", "type": "string", "required": true },
        { "name": "enabled", "description": "是否开启", "type": "boolean", "required": true }
      ]
    },
    {
      "name": "get_context_anniversaries",
      "description": "返回允许发送给 AI 上下文的纪念日摘要",
      "parameters": [
        { "name": "today", "description": "测试用当前日期，格式 YYYY-MM-DD", "type": "string", "required": false }
      ]
    },
    {
      "name": "delete_anniversary",
      "description": "删除纪念日",
      "parameters": [
        { "name": "id", "description": "纪念日 ID", "type": "string", "required": true }
      ]
    }
  ]
}
*/
十一、编程 Agent 执行提示词

下面这一整段可以直接丢给编程 Agent

你是一个负责实现 Operit AI 脚本插件的编程 Agent

请实现一个名为 AnniversaryPlugin 的 Operit AI 纪念日插件

目标：
开发一个本地 JSON 存储的纪念日插件，支持添加、查询、计算天数、上下文发送开关、删除等功能

技术约束：
1. 优先使用 TypeScript，如果当前 Operit 脚本环境更适合 JavaScript，则使用 JavaScript
2. 脚本文件开头必须包含 Operit 可识别的 METADATA 注释块
3. 根据当前项目中的官方示例确认 METADATA、exports、Tools.Files 的准确调用方式，不要凭空假设 API 签名
4. 使用 Operit 内置文件工具读写本地 JSON 文件
5. 所有 Tools 调用都必须 await
6. 不实现 UI，不实现 APK，不实现系统通知，不实现农历，不实现云同步

数据文件：
data/anniversaries.json
如果路径不可用，请根据 Operit 示例选择脚本可写目录，并在代码顶部集中配置 DATA_FILE_PATH

数据结构：
每条纪念日包含：
id: string
title: string
date: string，格式 YYYY-MM-DD
calendarType: "solar"
mode: "count_up" | "count_down" | "both"
owner: "user" | "assistant" | "shared"
description?: string
sendToContext: boolean
reminderEnabled: boolean
reminderDaysBefore: number[]
deleted: boolean
deletedAt?: string
createdAt: string
updatedAt: string

必须实现的工具：
1. add_anniversary
2. list_anniversaries
3. get_anniversary_status
4. toggle_anniversary_context
5. get_context_anniversaries
6. delete_anniversary

工具行为：
add_anniversary:
- title 必填
- date 必须为 YYYY-MM-DD
- owner 默认 user
- mode 默认 both
- sendToContext 默认 false
- calendarType 固定 solar
- reminderEnabled 默认 false
- reminderDaysBefore 默认 []
- deleted 默认 false

list_anniversaries:
- 默认只返回 deleted = false 的项目
- includeDeleted = true 时返回全部

get_anniversary_status:
- 支持 id 或 title 查询
- 如果 id 和 title 都没传，返回 INVALID_ARGUMENT
- 如果 title 匹配多条，返回 MULTIPLE_MATCHES
- 返回 daysSince、nextDate、daysUntilNext、isToday
- 支持 today 参数用于测试
- today 不传时使用北京时间当前日期

toggle_anniversary_context:
- 根据 id 修改 sendToContext
- 更新 updatedAt

get_context_anniversaries:
- 只返回 deleted = false 且 sendToContext = true 的项目
- 返回摘要，不返回 description、deletedAt 等隐私或内部字段
- 返回 title、date、daysSince、nextDate、daysUntilNext、isToday

delete_anniversary:
- 做软删除
- 设置 deleted = true
- 设置 deletedAt 和 updatedAt

日期规则：
1. 全部按 Asia/Shanghai / 北京时间理解
2. 日期存储格式固定 YYYY-MM-DD
3. 计算粒度是天
4. 不要把日期存成 UTC 的 YYYY-MM-DDT00:00:00Z
5. 第一版拒绝 2 月 29 日，返回 UNSUPPORTED_LEAP_DAY
6. 必须校验真实日期，例如 2026-02-30 是非法日期

错误返回格式：
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "中文错误说明"
  }
}

成功返回格式：
{
  "success": true,
  "data": ...
}

错误码至少包括：
INVALID_DATE
INVALID_TITLE
NOT_FOUND
MULTIPLE_MATCHES
STORAGE_READ_FAILED
STORAGE_WRITE_FAILED
UNSUPPORTED_LEAP_DAY
INVALID_ARGUMENT
UNKNOWN_ERROR

存储要求：
1. 文件不存在时初始化为空数组
2. 读取到非数组时返回错误，不要覆盖
3. 写入前先写 backup 文件
4. ID 不要只用时间戳，需要加入随机字符串
5. 所有写操作完成后返回新对象或结果摘要

请同时提供：
1. 完整插件源码
2. 简单 README
3. 测试用例清单
4. 示例调用参数和示例返回
5. 如果 Operit 当前 API 与预期不同，请在实现说明中写清楚你做了哪些兼容调整

测试用例：
1. 添加 2026-07-03 认识纪念日
2. today = 2026-07-03 时查询，daysSince = 0，daysUntilNext = 0，isToday = true
3. today = 2026-07-04 时查询，daysSince = 1，nextDate = 2027-07-03
4. today = 2026-07-02 时查询，daysSince = -1，daysUntilNext = 1
5. 添加非法日期 2026-02-30，必须失败
6. 添加 2026-02-29，第一版必须返回 UNSUPPORTED_LEAP_DAY
7. 开启 sendToContext 后，get_context_anniversaries 能返回该项目
8. 关闭 sendToContext 后，get_context_anniversaries 不返回该项目
9. 删除后 list_anniversaries 默认不返回
10. includeDeleted = true 时可以看到 deleted = true 的项目
十二、第一版验收标准

做到下面这些就可以算 MVP 完成

能在 Operit 里被识别成工具
能正常添加纪念日
能保存到 JSON
重启后数据还在
能查询已过去天数
能查询距离下一次纪念日天数
能打开和关闭上下文发送
get_context_anniversaries 只返回允许发送的项目
非法日期不会写入文件
删除是软删除
JSON 损坏时不会静默覆盖数据