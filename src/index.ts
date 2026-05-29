import "reflect-metadata";
import {
  Plugin,
  Handler,
  Interceptor,
  type EventContext,
  type PluginSetupContext,
} from "@myfinal/plugin-runtime";

import { PKG_VERSION } from "./version.js";
import { type Config, loadConfig, saveConfig } from "./config.js";

@Plugin({
  name: "my-plugin",
  description: "My Dian Plugin",
  version: PKG_VERSION,
  author: "your-name",
  icon: "🔌",
})
export default class MyPlugin {
  private readonly startTime = Date.now();
  private config = loadConfig();

  // ── 拦截器示例（最先执行，可用于日志、鉴权、过滤） ─────────────────────
  @Interceptor(10)
  async logInterceptor(ctx: EventContext): Promise<void> {
    if (ctx.event.type === "message") {
      console.log(
        `[my-plugin] <${ctx.event.platform}> ${ctx.event.payload.senderName ?? "?"}: ${ctx.event.payload.text ?? ""}`
      );
    }
  }

  onSetup(ctx: PluginSetupContext): void {
    // ── 注册指令 ─────────────────────────────────────────────────────────
    ctx.command({
      name: "hello",
      segment: "hello",
      aliases: [this.config.command, "hello", "hi"],
      pattern: () => this.config.command,
      description: `回复 "${this.config.reply}"`,
      usage: `${this.config.command}`,
      examples: [this.config.command],
      category: "工具",
      handler: async (c: EventContext) => {
        await c.reply(this.config.reply);
      },
    });

    // ── HTTP API 路由 ────────────────────────────────────────────────────
    ctx.route("GET", "/status", (_req, reply) => {
      reply.send({
        startTime: this.startTime,
        config: this.config,
      });
    });

    ctx.route("POST", "/config", (req, reply) => {
      const body = req.body as Partial<Config>;
      if (typeof body.command === "string" && body.command.trim()) {
        this.config.command = body.command.trim();
      }
      if (typeof body.reply === "string" && body.reply.trim()) {
        this.config.reply = body.reply.trim();
      }
      saveConfig(this.config);
      reply.send({ ok: true, config: this.config });
    });

    // ── Web UI ───────────────────────────────────────────────────────────
    ctx.ui({ staticDir: "./public", entry: "index.html" });
  }
}
