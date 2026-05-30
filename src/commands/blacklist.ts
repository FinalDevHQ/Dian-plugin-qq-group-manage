import type { EventContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { PermissionLevel } from "../services/permission.js";
import { extractMentionedQQ, requirePermission } from "./permission.js";
import { replyAuto } from "../services/render.js";

function parseReasonAndQQ(text: string): { reason: string; qqId: string | null } {
  const qqId = extractMentionedQQ(text);
  let reason = "";
  
  const reasonMatch = text.match(/^(?:拉黑|拉白|删黑|删白)\s+(.+?)(?:#|@\d)/);
  if (reasonMatch) {
    reason = reasonMatch[1].trim();
  }
  
  return { reason, qqId };
}

export function getBlacklistCommands(permService: PermissionService) {
  return {
    name: "名单",
    aliases: ["list", "黑白名单"],
    pattern: /^(群管\s+名单|名单|黑白名单)$/,
    description: "黑白名单管理",
    order: 28,
    handler: async (c: EventContext) => {
      await replyAuto(c,
        `📋 黑白名单\n` +
        `────────────────\n` +
        `拉黑 @QQ - 拉黑并踢出\n` +
        `删黑 @QQ - 移除黑名单\n` +
        `查黑 @QQ - 查询黑名单\n` +
        `黑名单 - 黑名单列表\n` +
        `拉白 @QQ - 拉白\n` +
        `删白 @QQ - 移除白名单\n` +
        `查白 @QQ - 查询白名单\n` +
        `白名单 - 白名单列表\n` +
        `退群拉黑 开启/关闭 - 退群自动拉黑`,
        permService,
      );
    },
    children: [
      {
        name: "帮助",
        aliases: ["help"],
        pattern: /^群管\s+名单\s*(帮助|help)$/,
        description: "查看名单帮助",
        order: 0,
        handler: async (c: EventContext) => {
          await replyAuto(c,
            `📋 黑白名单\n` +
            `────────────────\n` +
            `拉黑 @QQ - 拉黑并踢出\n` +
            `删黑 @QQ - 移除黑名单\n` +
            `查黑 @QQ - 查询黑名单\n` +
            `黑名单 - 黑名单列表\n` +
            `拉白 @QQ - 拉白\n` +
            `删白 @QQ - 移除白名单\n` +
            `查白 @QQ - 查询白名单\n` +
            `白名单 - 白名单列表\n` +
            `退群拉黑 开启/关闭 - 退群自动拉黑`,
            permService,
          );
        },
      },
      {
        name: "拉黑",
        aliases: ["blacklist"],
        pattern: /^(群管\s+名单\s+拉黑|拉黑)\s*.+/,
        description: "拉黑并踢出（支持理由）",
        order: 1,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const { reason, qqId } = parseReasonAndQQ(text);
          
          if (!qqId) {
            await c.reply("请@要拉黑的用户");
            return;
          }

          try {
            await permService.addToBlacklist(ctx.groupId, qqId, reason);
            
            await c.sendAction("set_group_kick", {
              group_id: Number(ctx.groupId),
              user_id: Number(qqId),
              reject_add_request: true,
            });

            const reasonText = reason ? `，理由: ${reason}` : "";
            await c.reply(`已拉黑 ${qqId}${reasonText}`);
          } catch (e: unknown) {
            await c.reply(`拉黑失败: ${e instanceof Error ? e.message : String(e)}`);
          }
        },
      },
      {
        name: "删黑",
        aliases: ["unblacklist"],
        pattern: /^(群管\s+名单\s+删黑|删黑)\s*.+/,
        description: "从黑名单移除",
        order: 2,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const qqId = extractMentionedQQ(text);
          
          if (!qqId) {
            await c.reply("请@要移除的用户");
            return;
          }

          const deleted = await permService.removeFromBlacklist(ctx.groupId, qqId);
          if (deleted > 0) {
            await c.reply(`已将 ${qqId} 从黑名单移除`);
          } else {
            await c.reply(`${qqId} 不在黑名单中`);
          }
        },
      },
      {
        name: "查黑",
        aliases: ["checkblack"],
        pattern: /^(群管\s+名单\s+查黑|查黑)\s*.+/,
        description: "查询是否在黑名单中",
        order: 3,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const qqId = extractMentionedQQ(text);
          
          if (!qqId) {
            await c.reply("请@要查询的用户");
            return;
          }

          const isBlacklisted = await permService.isBlacklisted(ctx.groupId, qqId);
          if (isBlacklisted) {
            const blacklist = await permService.getBlacklist(ctx.groupId);
            const entry = blacklist.find((b) => b.qqId === qqId);
            const reasonText = entry?.reason ? `，理由: ${entry.reason}` : "";
            await c.reply(`${qqId} 在黑名单中${reasonText}`);
          } else {
            await c.reply(`${qqId} 不在黑名单中`);
          }
        },
      },
      {
        name: "黑名单",
        aliases: ["blacklist-list"],
        pattern: /^(群管\s+名单\s+黑名单|黑名单)$/,
        description: "查看黑名单列表",
        order: 4,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;

          const blacklist = await permService.getBlacklist(ctx.groupId);
          if (blacklist.length === 0) {
            await c.reply("黑名单为空");
            return;
          }

          const list = blacklist.map((entry, i) => {
            const reasonText = entry.reason ? ` (${entry.reason})` : "";
            return `${i + 1}. ${entry.qqId}${reasonText}`;
          }).join("\n");
          
          await c.reply(`黑名单 (${blacklist.length}人):\n${list}`);
        },
      },
      {
        name: "拉白",
        aliases: ["whitelist"],
        pattern: /^(群管\s+名单\s+拉白|拉白)\s*.+/,
        description: "拉白（免疫广告杀手）",
        order: 5,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const { reason, qqId } = parseReasonAndQQ(text);
          
          if (!qqId) {
            await c.reply("请@要拉白的用户");
            return;
          }

          try {
            await permService.addToWhitelist(ctx.groupId, qqId, reason);
            const reasonText = reason ? `，理由: ${reason}` : "";
            await c.reply(`已拉白 ${qqId}${reasonText}`);
          } catch (e: unknown) {
            await c.reply(`拉白失败: ${e instanceof Error ? e.message : String(e)}`);
          }
        },
      },
      {
        name: "删白",
        aliases: ["unwhitelist"],
        pattern: /^(群管\s+名单\s+删白|删白)\s*.+/,
        description: "从白名单移除",
        order: 6,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const qqId = extractMentionedQQ(text);
          
          if (!qqId) {
            await c.reply("请@要移除的用户");
            return;
          }

          const deleted = await permService.removeFromWhitelist(ctx.groupId, qqId);
          if (deleted > 0) {
            await c.reply(`已将 ${qqId} 从白名单移除`);
          } else {
            await c.reply(`${qqId} 不在白名单中`);
          }
        },
      },
      {
        name: "查白",
        aliases: ["checkwhite"],
        pattern: /^(群管\s+名单\s+查白|查白)\s*.+/,
        description: "查询是否在白名单中",
        order: 7,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const qqId = extractMentionedQQ(text);
          
          if (!qqId) {
            await c.reply("请@要查询的用户");
            return;
          }

          const isWhitelisted = await permService.isWhitelisted(ctx.groupId, qqId);
          if (isWhitelisted) {
            const whitelist = await permService.getWhitelist(ctx.groupId);
            const entry = whitelist.find((w) => w.qqId === qqId);
            const reasonText = entry?.reason ? `，理由: ${entry.reason}` : "";
            await c.reply(`${qqId} 在白名单中${reasonText}`);
          } else {
            await c.reply(`${qqId} 不在白名单中`);
          }
        },
      },
      {
        name: "白名单",
        aliases: ["whitelist-list"],
        pattern: /^(群管\s+名单\s+白名单|白名单)$/,
        description: "查看白名单列表",
        order: 8,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;

          const whitelist = await permService.getWhitelist(ctx.groupId);
          if (whitelist.length === 0) {
            await c.reply("白名单为空");
            return;
          }

          const list = whitelist.map((entry, i) => {
            const reasonText = entry.reason ? ` (${entry.reason})` : "";
            return `${i + 1}. ${entry.qqId}${reasonText}`;
          }).join("\n");
          
          await c.reply(`白名单 (${whitelist.length}人):\n${list}`);
        },
      },
      {
        name: "退群拉黑",
        aliases: ["auto-blacklist"],
        description: "退群自动拉黑设置",
        order: 9,
        children: [
          {
            name: "开启",
            aliases: ["开"],
            pattern: /^(群管\s+名单\s+退群拉黑\s+开启|开启退群拉黑)$/,
            description: "开启退群自动拉黑",
            order: 1,
            handler: async (c: EventContext) => {
              const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
              if (!ctx) return;
              await permService.updateGroupSettings(ctx.groupId, { autoBlacklistOnLeave: true });
              await c.reply("已开启退群自动拉黑");
            },
          },
          {
            name: "关闭",
            aliases: ["关"],
            pattern: /^(群管\s+名单\s+退群拉黑\s+关闭|关闭退群拉黑)$/,
            description: "关闭退群自动拉黑",
            order: 2,
            handler: async (c: EventContext) => {
              const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
              if (!ctx) return;
              await permService.updateGroupSettings(ctx.groupId, { autoBlacklistOnLeave: false });
              await c.reply("已关闭退群自动拉黑");
            },
          },
        ],
      },
    ],
  };
}
