import type { EventContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { PermissionLevel } from "../services/permission.js";
import { cardService } from "../services/card.js";
import { replyAuto } from "../services/render.js";

export function getCardCommands(permService: PermissionService) {
  return {
    name: "名片系统",
    aliases: ["名片", "card", "名片管理"],
    pattern: /^(群管\s+名片系统|名片系统|名片|名片管理)$/,
    description: "名片系统管理",
    order: 80,
    handler: async (c: EventContext) => {
      const groupId = c.event.payload.groupId;
      if (!groupId) { await c.reply("请在群内使用"); return; }

      const settings = await cardService.getSettings(groupId);
      const lines = [
        "👥 名片系统",
        `总开关: ${settings.enabled ? "✅ 开启" : "❌ 关闭"}`,
        `改名提示: ${settings.renameNotify ? "✅ 开启" : "❌ 关闭"}`,
        `锁定名片: ${settings.lockCard ? "✅ 开启" : "❌ 关闭"}`,
        `马甲前缀: ${settings.prefix || "无"}`,
        "",
        "===小点管家===",
        "名片 开/关 — 开启或关闭名片系统",
        "改名提示 开/关 — 名片修改自动提示",
        "锁定名片 开/关 — 禁止修改名片",
        "全员加马甲 [前缀] — 全员加前缀",
        "移除马甲 — 清除所有前缀",
        "查看原始名片 @群友 — 查看原始名片",
      ];
      await replyAuto(c, lines.join("\n"), permService);
    },
    children: [
      {
        name: "帮助",
        aliases: ["help"],
        pattern: /^群管\s+名片系统\s*(帮助|help)$/,
        description: "查看名片系统帮助",
        order: 0,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) { await c.reply("请在群内使用"); return; }
          const settings = await cardService.getSettings(groupId);
          await replyAuto(c,
            `👥 名片系统\n` +
            `────────────────\n` +
            `名片 开/关 — 开启或关闭\n` +
            `改名提示 开/关 — 监控名片修改\n` +
            `锁定名片 开/关 — 禁止修改名片\n` +
            `全员加马甲 [前缀] — 自动加前缀\n` +
            `移除马甲 — 清除所有前缀\n` +
            `查看原始名片 @群友 — 查看原始名片\n` +
            `────────────────\n` +
            `当前状态: ${settings.enabled ? "开启" : "关闭"}\n` +
            `马甲前缀: ${settings.prefix || "无"}`,
            permService,
          );
        },
      },
      {
        name: "开启",
        aliases: ["开", "on"],
        pattern: /^群管\s+名片系统\s*(开启|开|on)$/,
        description: "开启名片系统",
        order: 1,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          await cardService.updateSettings(groupId, { enabled: true });
          await replyAuto(c, "✅ 名片系统已开启", permService);
        },
      },
      {
        name: "关闭",
        aliases: ["关", "off"],
        pattern: /^群管\s+名片系统\s*(关闭|关|off)$/,
        description: "关闭名片系统",
        order: 2,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          await cardService.updateSettings(groupId, { enabled: false });
          await replyAuto(c, "❌ 名片系统已关闭", permService);
        },
      },
      {
        name: "改名提示",
        aliases: ["改名"],
        pattern: /^群管\s+名片系统\s*改名提示$/,
        description: "开启或关闭改名提示",
        order: 3,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          const settings = await cardService.getSettings(groupId);
          await cardService.updateSettings(groupId, { renameNotify: !settings.renameNotify });
          await replyAuto(c, settings.renameNotify ? "❌ 改名提示已关闭" : "✅ 改名提示已开启", permService);
        },
      },
      {
        name: "锁定名片",
        aliases: ["锁定"],
        pattern: /^群管\s+名片系统\s*锁定名片$/,
        description: "开启或关闭锁定名片",
        order: 4,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          const settings = await cardService.getSettings(groupId);
          await cardService.updateSettings(groupId, { lockCard: !settings.lockCard });
          await replyAuto(c, settings.lockCard ? "❌ 锁定名片已关闭" : "✅ 锁定名片已开启，成员修改名片将被恢复", permService);
        },
      },
      {
        name: "全员加马甲",
        aliases: ["加马甲"],
        pattern: /^群管\s+名片系统\s*全员加马甲\s+(.+)/,
        description: "为全员添加名片前缀",
        order: 5,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          const text = c.event.payload.text || "";
          const match = text.match(/全员加马甲\s+(.+)/);
          const prefix = match?.[1]?.trim();
          if (!prefix) { await c.reply("请指定前缀，如：全员加马甲 萌宝●"); return; }
          await cardService.updateSettings(groupId, { prefix });
          await replyAuto(c, `✅ 马甲前缀已设为：${prefix}\n新成员入群将自动添加前缀`, permService);
        },
      },
      {
        name: "移除马甲",
        aliases: ["清马甲"],
        pattern: /^群管\s+名片系统\s*移除马甲$/,
        description: "清除所有马甲前缀",
        order: 6,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          await cardService.updateSettings(groupId, { prefix: "" });
          await replyAuto(c, "✅ 马甲前缀已清除", permService);
        },
      },
      {
        name: "查看原始名片",
        aliases: ["原始名片"],
        pattern: /^群管\s+名片系统\s*查看原始名片$/,
        description: "查看成员的原始名片",
        order: 7,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          const atQQ = c.event.payload.atUserIds?.[0];
          if (!atQQ) { await c.reply("请 @要查看的成员"); return; }
          const original = await cardService.getOriginalCard(groupId, atQQ);
          if (original === null) {
            await replyAuto(c, `成员 ${atQQ} 暂无原始名片记录`, permService);
          } else {
            await replyAuto(c, `成员 ${atQQ} 的原始名片：${original || "（空）"}`, permService);
          }
        },
      },
    ],
  };
}
