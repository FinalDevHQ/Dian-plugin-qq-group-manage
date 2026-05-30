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
import { templateService } from "./services/template.js";
import { notifyService } from "./services/notify.js";
import { statisticsService } from "./services/statistics.js";
import { pluginState } from "./services/state.js";
import { cardService } from "./services/card.js";
import { systemInfoService } from "./services/system-info.js";
import { scheduleService } from "./services/schedule.js";
import { registerAllCommands } from "./commands/index.js";
import { registerOwnerRoutes } from "./routes/owner.js";
import { registerGroupRoutes } from "./routes/group.js";
import { registerAdKillerRoutes } from "./routes/ad-killer.js";
import { registerTemplateRoutes } from "./routes/template.js";
import { registerNotifyRoutes } from "./routes/notify.js";
import { registerStatisticsRoutes } from "./routes/statistics.js";
import { registerCardRoutes } from "./routes/card.js";

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
      await templateService.init(ctx.store);
      await notifyService.init(ctx.store);
      await statisticsService.init(ctx.store);
      await cardService.init(ctx.store);
      await scheduleService.init(ctx.store);
      this.dbInitialized = true;
    }

    if (!pluginState.available) {
      pluginState.sendAction = ctx.sendAction;
    }

    // Handle group leave/kick events for auto blacklist + notify
    if (ctx.event.type === "notice") {
      const subtype = ctx.event.subtype;
      const groupId = ctx.event.payload.groupId;
      const userId = ctx.event.payload.userId;

      if (groupId && userId && subtype === "notice.group_decrease") {
        const shouldAutoBlacklist = await permService.isAutoBlacklistOnLeave(groupId);
        if (shouldAutoBlacklist) {
          const isAlreadyBlacklisted = await permService.isBlacklisted(groupId, userId);
          if (!isAlreadyBlacklisted) {
            await permService.addToBlacklist(groupId, userId, "退群自动拉黑");
            console.log(`[qq-group-manage] Auto blacklisted ${userId} in group ${groupId}`);
          }
        }

        // Leave notification
        try {
          const notifyConfig = await notifyService.getEffectiveConfig(groupId);
          if (notifyConfig.leaveEnabled && notifyConfig.leaveMsg) {
            const groupInfo = await ctx.sendAction("get_group_info", { group_id: Number(groupId) });
            const groupName = (groupInfo.data as Record<string, unknown>)?.group_name as string || "";
            const memberCount = String((groupInfo.data as Record<string, unknown>)?.member_count ?? "");

            let username = String(userId);
            try {
              const strangerInfo = await ctx.sendAction("get_stranger_info", { user_id: Number(userId) });
              const nickname = (strangerInfo.data as Record<string, unknown>)?.nickname as string || "";
              const card = (strangerInfo.data as Record<string, unknown>)?.card as string || "";
              username = card || nickname || String(userId);
            } catch (_) {}

            const vars = { username, groupName, memberCount, botName: ctx.event.botId || "" };
            const msg = notifyService.replaceVars(notifyConfig.leaveMsg, vars);
            await ctx.sendAction("send_group_msg", {
              group_id: Number(groupId),
              message: msg,
            });
          }
        } catch (err) {
          console.log(`[qq-group-manage] Leave notify error:`, err);
        }
      }

      // Welcome notification + mute on join
      if (groupId && userId && subtype === "notice.group_increase") {
        try {
          const notifyConfig = await notifyService.getEffectiveConfig(groupId);

          // Mute on join
          if (notifyConfig.muteOnJoin && notifyConfig.muteDuration > 0) {
            try {
              await ctx.sendAction("set_group_ban", {
                group_id: Number(groupId),
                user_id: Number(userId),
                duration: notifyConfig.muteDuration,
              });
            } catch (_) {}
          }

          // Welcome message
          if (notifyConfig.welcomeEnabled && notifyConfig.welcomeMsg) {
            const groupInfo = await ctx.sendAction("get_group_info", { group_id: Number(groupId) });
            const groupName = (groupInfo.data as Record<string, unknown>)?.group_name as string || "";
            const memberCount = String((groupInfo.data as Record<string, unknown>)?.member_count ?? "");

            let username = String(userId);
            try {
              const memberInfo = await ctx.sendAction("get_group_member_info", { group_id: Number(groupId), user_id: Number(userId) });
              const nickname = (memberInfo.data as Record<string, unknown>)?.nickname as string || "";
              const card = (memberInfo.data as Record<string, unknown>)?.card as string || "";
              username = card || nickname || String(userId);
            } catch (_) {}

            const vars = { username, groupName, memberCount, botName: ctx.event.botId || "" };
            let msg = notifyService.replaceVars(notifyConfig.welcomeMsg, vars);
            msg = msg.replace(/\{at\}/g, `[CQ:at,qq=${userId}]`);
            await ctx.sendAction("send_group_msg", {
              group_id: Number(groupId),
              message: msg,
            });
          }
        } catch (err) {
          console.log(`[qq-group-manage] Welcome notify error:`, err);
        }
      }
    }

    // Card system: rename notification + lock card
    if (ctx.event.type === "notice" && ctx.event.subtype === "notice.group_card") {
      const groupId = ctx.event.payload.groupId;
      const userId = ctx.event.payload.userId;
      const card = ctx.event.payload.card as string || "";

      if (groupId && userId) {
        const isCardEnabled = await cardService.isEnabled(groupId);
        if (!isCardEnabled) return;

        // Lock card: restore original
        const isLocked = await cardService.isLockCard(groupId);
        if (isLocked) {
          const original = await cardService.getOriginalCard(groupId, userId);
          if (original !== null) {
            await cardService.setCard(groupId, userId, original);
            console.log(`[qq-group-manage] Card locked, restored for ${userId} in ${groupId}`);
            return;
          }
        }

        // Rename notification
        const notifyEnabled = await cardService.isRenameNotify(groupId);
        if (notifyEnabled) {
          try {
            const memberInfo = await ctx.sendAction("get_group_member_info", { group_id: Number(groupId), user_id: Number(userId) });
            const nickname = (memberInfo.data as Record<string, unknown>)?.nickname as string || String(userId);
            await ctx.sendAction("send_group_msg", {
              group_id: Number(groupId),
              message: `⚠️ ${nickname}(${userId}) 修改了名片为：${card || "（空）"}`,
            });
          } catch (_) {}
        }
      }
    }

    // Card system: auto apply prefix on join
    if (ctx.event.type === "notice" && ctx.event.subtype === "notice.group_increase") {
      const groupId = ctx.event.payload.groupId;
      const userId = ctx.event.payload.userId;
      if (groupId && userId) {
        const isCardEnabled = await cardService.isEnabled(groupId);
        if (isCardEnabled) {
          const prefix = await cardService.getPrefix(groupId);
          if (prefix) {
            try {
              const memberInfo = await ctx.sendAction("get_group_member_info", { group_id: Number(groupId), user_id: Number(userId) });
              const card = (memberInfo.data as Record<string, unknown>)?.card as string || "";
              const nickname = (memberInfo.data as Record<string, unknown>)?.nickname as string || "";
              const currentCard = card || nickname || "";
              await cardService.saveOriginalCard(groupId, userId, currentCard);
              await cardService.setCard(groupId, userId, prefix + currentCard);
              console.log(`[qq-group-manage] Applied prefix "${prefix}" to ${userId} in ${groupId}`);
            } catch (err) {
              console.log(`[qq-group-manage] Auto prefix error:`, err);
            }
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

      // Increment received message counter for system info
      systemInfoService.incrementReceived();

      // Log every group message
      if (userId && messageId) {
        await messageLogService.log(groupId, userId, messageId, text);
      }

      // Increment message counter for statistics
      if (userId) {
        await statisticsService.incrementCounter(groupId, userId);
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
    registerTemplateRoutes(ctx);
    registerNotifyRoutes(ctx);
    registerStatisticsRoutes(ctx);
    registerCardRoutes(ctx);

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
