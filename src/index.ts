import "reflect-metadata";
import {
  Plugin,
  Interceptor,
  type EventContext,
  type PluginSetupContext,
} from "@myfinal/plugin-runtime";

import { PKG_VERSION } from "./version.js";
import { type Config, loadConfig, saveConfig } from "./config.js";
import { permService, PermissionLevel } from "./services/permission.js";
import { pluginState } from "./services/state.js";
import { registerAllCommands } from "./commands/index.js";
import { registerOwnerRoutes } from "./routes/owner.js";
import { registerGroupRoutes } from "./routes/group.js";

@Plugin({
  name: "qq-group-manage",
  description: "QQ群组管理插件",
  version: PKG_VERSION,
  author: "Dian",
  icon: "👥",
})
export default class QQGroupManagePlugin {
  private readonly startTime = Date.now();
  private config = loadConfig();
  private dbInitialized = false;

  @Interceptor(10)
  async logInterceptor(ctx: EventContext): Promise<void> {
    if (ctx.event.type === "message") {
      console.log(
        `[qq-group-manage] <${ctx.event.platform}> ${ctx.event.payload.senderName ?? "?"}: ${ctx.event.payload.text ?? ""}`
      );
    }

    if (!this.dbInitialized && ctx.store) {
      await permService.init(ctx.store);
      this.dbInitialized = true;
    }

    if (!pluginState.available) {
      pluginState.sendAction = ctx.sendAction;
    }

    if (ctx.event.type === "message") {
      const groupId = ctx.event.payload.groupId;
      const text = ctx.event.payload.text || "";

      if (!groupId) return;

      const isSystemCommand = /^(开机|关机|闭嘴|说话|查群状态|群管\s+系统|开启专属模式|关闭专属模式)/.test(text);

      if (!isSystemCommand) {
        const isEnabled = await permService.isGroupEnabled(groupId);
        if (!isEnabled) {
          ctx.stopPropagation();
          return;
        }

        const isMuted = await permService.isGroupMuted(groupId);
        if (isMuted) {
          ctx.stopPropagation();
          return;
        }

        const isExclusive = await permService.isExclusiveMode(groupId);
        if (isExclusive) {
          const qqId = ctx.event.payload.userId;
          if (qqId) {
            const level = await permService.getLevel(qqId, groupId);
            if (level < PermissionLevel.ADMIN) {
              ctx.stopPropagation();
              return;
            }
          }
        }
      }
    }
  }

  onSetup(ctx: PluginSetupContext): void {
    registerAllCommands(ctx, permService);
    registerOwnerRoutes(ctx, permService);
    registerGroupRoutes(ctx, permService);

    ctx.route("GET", "/status", (_req, reply) => {
      reply.send({
        startTime: this.startTime,
        uptime: Date.now() - this.startTime,
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

    ctx.ui({ staticDir: "./public", entry: "index.html" });
  }
}
