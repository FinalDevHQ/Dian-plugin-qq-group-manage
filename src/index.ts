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
import { adKillerService, AdPunishment } from "./services/ad-killer.js";
import { messageLogService } from "./services/message-log.js";
import { pluginState } from "./services/state.js";
import { registerAllCommands } from "./commands/index.js";
import { registerOwnerRoutes } from "./routes/owner.js";
import { registerGroupRoutes } from "./routes/group.js";
import { registerAdKillerRoutes } from "./routes/ad-killer.js";

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
      await adKillerService.init(ctx.store);
      await messageLogService.init(ctx.store);
      this.dbInitialized = true;
    }

    if (!pluginState.available) {
      pluginState.sendAction = ctx.sendAction;
    }

    // Handle group leave/kick events for auto blacklist
    if (ctx.event.type === "notice") {
      const subtype = ctx.event.subtype;
      const groupId = ctx.event.payload.groupId;
      const userId = ctx.event.payload.userId;

      if (groupId && userId && (subtype === "group_decrease" || subtype === "leave" || subtype === "kick")) {
        const shouldAutoBlacklist = await permService.isAutoBlacklistOnLeave(groupId);
        if (shouldAutoBlacklist) {
          const isAlreadyBlacklisted = await permService.isBlacklisted(groupId, userId);
          if (!isAlreadyBlacklisted) {
            await permService.addToBlacklist(groupId, userId, "退群自动拉黑");
            console.log(`[qq-group-manage] Auto blacklisted ${userId} in group ${groupId}`);
          }
        }
      }
    }

    if (ctx.event.type === "message") {
      const groupId = ctx.event.payload.groupId;
      const text = ctx.event.payload.text || "";
      const userId = ctx.event.payload.userId;
      const messageId = ctx.event.payload.messageId;

      if (!groupId) return;

      // Log every group message
      if (userId && messageId) {
        await messageLogService.log(groupId, userId, messageId, text);
      }

      // Check if user is blacklisted
      if (userId) {
        const isBlacklisted = await permService.isBlacklisted(groupId, userId);
        if (isBlacklisted) {
          ctx.stopPropagation();
          return;
        }
      }

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

        // Ad killer check
        const adEnabled = await adKillerService.isEnabled(groupId);
        if (adEnabled && userId) {
          const userLevel = await permService.getLevel(userId, groupId);
          const isWhitelisted = await permService.isWhitelisted(groupId, userId);
          if (userLevel < PermissionLevel.ADMIN && !isWhitelisted) {
            const result = await adKillerService.checkMessage(groupId, text);
            if (result.hit) {
              // Recall the message
              if (messageId) {
                try {
                  await ctx.sendAction("delete_msg", { message_id: Number(messageId) });
                } catch (_) {}
              }

              const punishment = result.punishment || AdPunishment.RECALL;

              if (punishment === AdPunishment.RECALL_MUTE || punishment === AdPunishment.RECALL_KICK) {
                try {
                  await ctx.sendAction("set_group_ban", {
                    group_id: Number(groupId),
                    user_id: Number(userId),
                    duration: result.muteDuration || 600,
                  });
                } catch (_) {}
              }

              if (punishment === AdPunishment.RECALL_KICK) {
                try {
                  await ctx.sendAction("set_group_kick", {
                    group_id: Number(groupId),
                    user_id: Number(userId),
                    reject_add_request: false,
                  });
                } catch (_) {}
              }

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
    registerAdKillerRoutes(ctx);

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
