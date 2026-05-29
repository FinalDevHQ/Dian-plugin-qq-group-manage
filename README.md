# Dian 插件开发手册

> 适用版本：Dian `0.1.x` · plugin-runtime `0.2.x`

Dian 插件系统基于 TypeScript 装饰器，支持**消息处理、HTTP 路由、Command Registry、Web UI**四大能力。插件以 ZIP 包形式安装，事件 Handler 和命令注册支持热加载。

---

## 目录

1. [环境准备](#1-环境准备)
2. [项目结构](#2-项目结构)
3. [插件声明 @Plugin](#3-插件声明-plugin)
4. [消息 Handler @Handler](#4-消息-handler-handler)
5. [拦截器 @Interceptor](#5-拦截器-interceptor)
6. [onSetup — 高级注册](#6-onsetup--高级注册)
   - [6.1 HTTP API 路由](#61-http-api-路由)
   - [6.2 命令式指令](#62-命令式指令)
   - [6.3 Web UI](#63-web-ui)
7. [EventContext API](#7-eventcontext-api)
   - [7.1 sendAction — 调用底层 Bot API](#71-sendaction--调用底层-bot-api)
   - [7.2 PluginStore — 插件专属数据库](#72-pluginstore--插件专属数据库)
8. [BotEvent 数据结构](#8-botevent-数据结构)
9. [构建 & 打包](#9-构建--打包)
10. [发布到插件市场](#10-发布到插件市场)

---

## 1. 环境准备

```bash
# 在 Dian 项目根目录先执行一次全量构建
npm run build

# 进入模板目录安装依赖
cd Dian-plugin-template
npm install
```

修改以下两处，设置你的插件 ID（全局唯一）：

**`package.json`**
```json
{ "name": "my-plugin" }
```

**`src/index.ts`** 中的 `@Plugin`
```ts
@Plugin({ name: "my-plugin", ... })
```

> **注意**：`package.json` 的 `name` 与 `@Plugin` 的 `name` 必须一致，否则打包和 URL 路由会对不上。

---

## 2. 项目结构

```
Dian-plugin-template/
├── src/
│   ├── index.ts          ← 插件主入口（装饰器、拦截器、指令注册）
│   ├── config.ts         ← 配置读写
│   └── version.ts        ← 版本号（从 package.json 读取）
├── ui/
│   ├── App.tsx           ← React 主应用（侧边栏导航）
│   ├── main.tsx          ← 入口
│   ├── index.html        ← HTML 入口
│   ├── index.css         ← 全局样式（Slate 色系）
│   ├── vite.config.ts    ← Vite 构建配置
│   ├── api.ts            ← API 请求工具（带 token 鉴权）
│   ├── components.tsx    ← 通用组件（Card, Button, Badge 等）
│   └── pages/
│       └── Dashboard.tsx  ← 仪表盘（统计 + 已注册信息）
├── scripts/
│   ├── pack.mjs          ← 打包脚本
│   └── index-entry.mjs   ← 索引条目生成脚本
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

---

## 3. 插件声明 @Plugin

每个插件的**默认导出类**必须标注 `@Plugin`，提供插件元信息。

```ts
import "reflect-metadata";
import { Plugin } from "@myfinal/plugin-runtime";

@Plugin({
  name: "my-plugin",          // 必填，全局唯一 ID
  description: "插件描述",    // 可选，显示在管理界面
  version: "1.0.0",           // 可选，建议从 version.ts 读取
  author: "your-name",        // 可选
  icon: "🔌",                 // 可选，emoji 或图片 URL
})
export default class MyPlugin {
  // ...
}
```

---

## 4. 消息 Handler @Handler

`@Handler` 标注的方法会在消息文本匹配时被调用，支持**精确字符串**或**正则表达式**匹配。

```ts
import { Handler, type EventContext } from "@myfinal/plugin-runtime";

// 精确匹配 "!ping"（区分大小写）
@Handler("!ping")
async onPing(ctx: EventContext): Promise<void> {
  console.log("收到 ping，发送者：", ctx.event.payload.senderName);
}

// 正则匹配，支持捕获组
@Handler(/^!echo\s+(.+)$/)
async onEcho(ctx: EventContext): Promise<void> {
  const text = ctx.event.payload.text ?? "";
  const [, content] = text.match(/^!echo\s+(.+)$/) ?? [];
  console.log("echo:", content);
}
```

**匹配规则**：
- 字符串 → 与 `event.payload.text` 完全相等
- 正则 → `regex.test(event.payload.text ?? "")`
- 多个 `@Handler` 可以标注在同一个类的不同方法上
- 若拦截器调用了 `ctx.stopPropagation()`，本 Handler 将不被执行

---

## 5. 拦截器 @Interceptor

拦截器在所有 Handler **之前**执行，可用于日志、鉴权、消息过滤等。

```ts
import { Interceptor, type EventContext } from "@myfinal/plugin-runtime";

@Interceptor(50)   // 数字为优先级，越小越先执行，默认 100
async filter(ctx: EventContext): Promise<void> {
  // 屏蔽特定群的所有消息
  if (ctx.event.payload.groupId === "blocked_group_id") {
    ctx.stopPropagation();   // 阻止后续所有 Handler
    return;
  }

  // 日志记录（不阻止，继续执行后续 Handler）
  console.log(`[${ctx.event.botId}] ${ctx.event.payload.text}`);
}
```

---

## 6. onSetup — 高级注册

在类中定义 `onSetup(ctx: PluginSetupContext)` 方法，Dian 在加载插件时会调用它，用于注册 HTTP 路由、指令和 UI。

```ts
import { type PluginSetupContext } from "@myfinal/plugin-runtime";

onSetup(ctx: PluginSetupContext): void {
  // 见下文各小节
}
```

### 6.1 HTTP API 路由

```ts
ctx.route(method, path, handler);
```

- **访问地址**：`/plugins/<name>/api<path>`
- `method`：`"GET"` `"POST"` `"PUT"` `"DELETE"` `"PATCH"`
- `handler`：Fastify 路由处理函数 `(request, reply) => void`

```ts
// GET /plugins/my-plugin/api/status
ctx.route("GET", "/status", (_req, reply) => {
  reply.send({ ok: true, ts: Date.now() });
});

// POST /plugins/my-plugin/api/config
ctx.route("POST", "/config", (req, reply) => {
  const body = req.body as { key: string; value: string };
  // ... 保存配置
  reply.send({ saved: true });
});
```

> **注意**：HTTP 路由在**服务器启动时**注册，安装后需**重启 Dian 服务**才能生效。事件 Handler 和指令支持热加载，无需重启。

### 6.2 Command Registry 指令

`ctx.command()` 用于向框架的 **Command Registry** 注册命令树。

```ts
ctx.command({
  name: "hello",
  segment: "hello",
  aliases: ["!hello", "hi"],
  pattern: "!hello",
  description: "回复 Hello World",
  usage: "!hello",
  examples: ["!hello"],
  category: "工具",
  async handler(c: EventContext) {
    await c.reply("Hello!");
  },
});
```

字段说明：
- `name`：展示名
- `segment`：稳定路径片段，不填则使用 `name`
- `aliases`：别名列表
- `pattern`：匹配模式（字符串、正则或函数）
- `usage`：用法说明
- `examples`：示例列表
- `category`：分类
- `children`：子命令

> `pattern` 也可以传**函数** `() => this.config.command`，每次匹配时实时求值，实现"配置即改即生效"。

### 6.3 Web UI

将静态文件放到 `ui/` 目录，构建后会输出到 `dist/public/`：

```ts
ctx.ui({
  staticDir: "./public",   // 相对于 dist/index.js 的目录
  entry: "index.html",     // 入口文件，默认 index.html
});
```

- **访问地址**：`/plugins/<name>/ui/`
- 页面内调用插件 API 时必须携带主控制台登录 token。模板已内置 `ui/api.ts`：

```ts
import { API, apiFetch } from "../api"

const data = await apiFetch(`${API}/status`).then((r) => r.json())
```

---

## 7. EventContext API

```ts
interface EventContext {
  /** 当前事件 */
  readonly event: BotEvent;

  /** 阻止当前事件继续向后续 Handler 传递 */
  stopPropagation(): void;

  /** 向事件来源（群/私聊）发送文本回复 */
  reply(text: string): Promise<void>;

  /** 调用底层平台 API（OneBot/飞书等） */
  sendAction(action: string, params?: Record<string, unknown>): Promise<ActionResult>;

  /** 插件存储接口，用于创建和操作插件专属的 SQLite 表 */
  store?: PluginStore;
}
```

### 7.1 sendAction — 调用底层 Bot API

`sendAction` 让你的插件可以直接调用 Bot 协议 API（如 OneBot），实现**禁言、踢人、取群成员列表**等高级操作。

```ts
@Handler("!mute")
async onMute(ctx: EventContext): Promise<void> {
  if (!ctx.event.payload.groupId) {
    await ctx.reply("此指令只能在群聊中使用");
    return;
  }

  const result = await ctx.sendAction("set_group_ban", {
    group_id: Number(ctx.event.payload.groupId),
    user_id:  123456789,
    duration: 60,
  });

  if (result.ok) {
    await ctx.reply("已禁言 60 秒");
  } else {
    await ctx.reply(`操作失败: ${result.message ?? "未知错误"}`);
  }
}
```

### 7.2 PluginStore — 插件专属数据库

`PluginStore` 提供简单的 SQLite 操作接口。所有插件共享同一个 SQLite 数据库文件，但通过 `_plugin_tables` 元数据表跟踪每个插件拥有的表，卸载时可一键清理。

```ts
interface PluginStore {
  createTable(tableName: string, columns: string[], pluginName?: string): Promise<void>;
  insert(tableName: string, data: Record<string, unknown>): Promise<void>;
  query(tableName: string, params?: Record<string, unknown>, options?: {
    limit?: number;
    orderBy?: string;
    order?: "ASC" | "DESC";
  }): Promise<Record<string, unknown>[]>;
  delete(tableName: string, params?: Record<string, unknown>): Promise<number>;
}
```

**重要**：调用 `createTable` 时务必传入第三个参数 `pluginName`（即 `@Plugin` 的 `name`），这样框架会自动在 `_plugin_tables` 中注册该表。卸载插件时，管理界面会列出所有关联表供用户选择是否删除。

表名建议遵循 `插件名_功能名` 命名规范（如 `my-plugin_notes`），避免与其他插件冲突。

#### 事件处理器中使用

在 `@Handler` / `@Interceptor` / `ctx.command()` 的 handler 中，通过 `c.store` 访问：

```ts
ctx.command({
  name: "note",
  pattern: "!note",
  description: "保存一条笔记到数据库",
  handler: async (c: EventContext) => {
    if (!c.store) return;

    await c.store.createTable("my_notes", [
      "content TEXT",
      "user_id TEXT",
      "created_at INTEGER",
    ], "my-plugin");

    await c.store.insert("my_notes", {
      content: "Hello",
      user_id: c.event.payload.userId ?? "",
      created_at: Date.now(),
    });

    await c.reply("已保存！");
  },
});
```

#### HTTP 路由中使用

在 `ctx.route()` 注册的路由中，通过 `req.pluginStore` 访问：

```ts
ctx.route("GET", "/notes", async (req, reply) => {
  const store = (req as unknown as Record<string, unknown>).pluginStore as PluginStore | undefined;
  if (!store) {
    reply.send({ ok: true, notes: [] });
    return;
  }
  const rows = await store.query("my_notes", {}, { limit: 20, orderBy: "id", order: "DESC" });
  reply.send({ ok: true, notes: rows });
});
```

---

## 8. BotEvent 数据结构

```ts
interface BotEvent {
  eventId:   string;
  botId:     string;
  platform:  "onebot";
  type:      "message" | "message_sent" | "notice" | "request" | "meta_event";
  subtype:   string;
  timestamp: number;
  payload: EventPayload;
  raw: unknown;
}
```

### EventPayload

```ts
interface EventPayload {
  text?:        string;
  userId?:      string;
  groupId?:     string;
  channelId?:   string;
  messageId?:   string;
  senderName?:  string;
  [key: string]: unknown;
}
```

---

## 9. 构建 & 打包

```bash
# 前端开发模式
npm run dev:ui

# 后端开发模式（监听变动）
npm run dev:plugin

# 全量构建（后端 tsup + 前端 vite）
npm run build

# 构建 + 打包为 ZIP
npm run pack
```

`npm run pack` 生成 `<name>.zip`，ZIP 内容即为 `dist/` 目录：

```
my-plugin.zip/
├── index.js
└── public/
    ├── index.html
    └── assets/
        ├── index.js
        └── index.css
```

---

## 10. 发布到插件市场

### 10.1 准备

1. 推代码到 GitHub 仓库
2. 修改 `package.json` 的 `name` / `version` / `description`
3. 创建 Release，上传 `npm run pack` 生成的 ZIP

### 10.2 生成索引条目

```bash
npm run index-entry                    # 输出 JSON 到终端
npm run index-entry -- --changelog "新增 xxx 功能"  # 带更新说明
```

### 10.3 提交 PR

1. Fork [`FinalDevHQ/Dian-plugins`](https://github.com/FinalDevHQ/Dian-plugins)
2. 将生成的条目添加到 `index.json`
3. 提 PR，CI 会自动校验

### 10.4 FinalDevHQ 官方插件

FinalDevHQ 组织下的插件仓库有 CI 自动同步：push main → 自动发布 Release → 自动提 PR 到索引库 → 校验通过后自动合并。
