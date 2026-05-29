import type { EventContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { PermissionLevel } from "../services/permission.js";
import { extractMentionedQQ, requirePermission } from "./permission.js";
import { messageLogService } from "../services/message-log.js";

export function getMemberCommands(permService: PermissionService) {
  return {
    name: "成员",
    aliases: ["member", "成员管理"],
    pattern: /^(群管\s+成员|成员|成员管理)$/,
    description: "成员管理",
    order: 25,
    handler: async (c: EventContext) => {
      await c.reply(
        `👥 成员管理\n` +
        `────────────────\n` +
        `踢 @QQ - 踢出成员\n` +
        `踢黑 @QQ - 踢出并拉黑\n` +
        `禁言 @QQ [分钟] - 禁言\n` +
        `解禁 @QQ - 解除禁言\n` +
        `全体禁言 - 开启全体禁言\n` +
        `全体解禁 - 关闭全体禁言\n` +
        `撤回 N - 撤回最近N条消息\n` +
        `撤回 @QQ - 撤回该用户最近消息\n` +
        `撤回 @QQ N - 撤回该用户最近N条`
      );
    },
    children: [
      {
        name: "帮助",
        aliases: ["help"],
        pattern: /^群管\s+成员\s*(帮助|help)$/,
        description: "查看成员管理帮助",
        order: 0,
        handler: async (c: EventContext) => {
          await c.reply(
            `👥 成员管理\n` +
            `────────────────\n` +
            `群管 成员 踢 @QQ / 踢 @QQ - 踢出\n` +
            `群管 成员 踢黑 @QQ / 踢黑 @QQ - 踢出并拉黑\n` +
            `群管 成员 禁言 @QQ [分钟] / 禁言 - 禁言\n` +
            `群管 成员 解禁 @QQ / 解禁 @QQ - 解禁\n` +
            `群管 成员 全体禁言 / 全体禁言 - 全体禁言\n` +
            `群管 成员 全体解禁 / 全体解禁 - 全体解禁`
          );
        },
      },
      {
        name: "踢",
        aliases: ["踢人"],
        pattern: /^(群管\s+成员\s+踢|踢)\s*.+/,
        description: "踢出成员",
        order: 1,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const targetQQ = extractMentionedQQ(text);
          if (!targetQQ) {
            await c.reply("请@要踢出的用户");
            return;
          }

          const isWhitelisted = await permService.isWhitelisted(ctx.groupId, targetQQ);
          if (isWhitelisted) {
            await c.reply(`${targetQQ} 在白名单中，无法踢出`);
            return;
          }

          const kickResult = await c.sendAction("set_group_kick", {
            group_id: Number(ctx.groupId),
            user_id: Number(targetQQ),
            reject_add_request: false,
          });

          if (kickResult.ok) {
            await c.reply(`已踢出 ${targetQQ}`);
          } else {
            await c.reply(`踢出失败: ${kickResult.message || "权限不足"}`);
          }
        },
      },
      {
        name: "踢黑",
        aliases: ["踢出并拉黑"],
        pattern: /^(群管\s+成员\s+踢黑|踢黑)\s*.+/,
        description: "踢出成员并拒绝再次加群",
        order: 2,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const targetQQ = extractMentionedQQ(text);
          if (!targetQQ) {
            await c.reply("请@要踢出的用户");
            return;
          }

          const isWhitelisted = await permService.isWhitelisted(ctx.groupId, targetQQ);
          if (isWhitelisted) {
            await c.reply(`${targetQQ} 在白名单中，无法踢出`);
            return;
          }

          const kickResult = await c.sendAction("set_group_kick", {
            group_id: Number(ctx.groupId),
            user_id: Number(targetQQ),
            reject_add_request: true,
          });

          if (kickResult.ok) {
            await c.reply(`已踢出并拉黑 ${targetQQ}`);
          } else {
            await c.reply(`操作失败: ${kickResult.message || "权限不足"}`);
          }
        },
      },
      {
        name: "禁言",
        aliases: ["mute"],
        pattern: /^(群管\s+成员\s+禁言|禁言)\s*.+/,
        description: "禁言成员（单位：分钟，默认10分钟）",
        order: 3,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const targetQQ = extractMentionedQQ(text);
          if (!targetQQ) {
            await c.reply("请@要禁言的用户");
            return;
          }

          const isWhitelisted = await permService.isWhitelisted(ctx.groupId, targetQQ);
          if (isWhitelisted) {
            await c.reply(`${targetQQ} 在白名单中，无法禁言`);
            return;
          }

          const timeMatch = text.match(/(\d+)\s*(?:分钟|min|m)?$/);
          const minutes = timeMatch ? parseInt(timeMatch[1]) : 10;
          const duration = minutes * 60;

          const result = await c.sendAction("set_group_ban", {
            group_id: Number(ctx.groupId),
            user_id: Number(targetQQ),
            duration: duration,
          });

          if (result.ok) {
            await c.reply(`已禁言 ${targetQQ} ${minutes} 分钟`);
          } else {
            await c.reply(`禁言失败: ${result.message || "权限不足"}`);
          }
        },
      },
      {
        name: "解禁",
        aliases: ["unmute"],
        pattern: /^(群管\s+成员\s+解禁|解禁)\s*.+/,
        description: "解除成员禁言",
        order: 4,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const targetQQ = extractMentionedQQ(text);
          if (!targetQQ) {
            await c.reply("请@要解禁的用户");
            return;
          }

          const result = await c.sendAction("set_group_ban", {
            group_id: Number(ctx.groupId),
            user_id: Number(targetQQ),
            duration: 0,
          });

          if (result.ok) {
            await c.reply(`已解禁 ${targetQQ}`);
          } else {
            await c.reply(`解禁失败: ${result.message || "权限不足"}`);
          }
        },
      },
      {
        name: "全体禁言",
        aliases: ["全禁"],
        pattern: /^(群管\s+成员\s+全体禁言|全体禁言)$/,
        description: "开启全体禁言",
        order: 5,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;

          const result = await c.sendAction("set_group_whole_ban", {
            group_id: Number(ctx.groupId),
            enable: true,
          });

          if (result.ok) {
            await c.reply("已开启全体禁言");
          } else {
            await c.reply(`操作失败: ${result.message || "权限不足"}`);
          }
        },
      },
      {
        name: "全体解禁",
        aliases: ["全解"],
        pattern: /^(群管\s+成员\s+全体解禁|全体解禁)$/,
        description: "关闭全体禁言",
        order: 6,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;

          const result = await c.sendAction("set_group_whole_ban", {
            group_id: Number(ctx.groupId),
            enable: false,
          });

          if (result.ok) {
            await c.reply("已关闭全体禁言");
          } else {
            await c.reply(`操作失败: ${result.message || "权限不足"}`);
          }
        },
      },
      {
        name: "撤回",
        aliases: ["recall", "批量撤回"],
        pattern: /^(群管\s+成员\s+撤回|撤回)\s*.+/,
        description: "撤回消息（支持按数量或按用户）",
        order: 7,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const targetQQ = extractMentionedQQ(text);

          // Parse count: "撤回 @QQ 10" or "撤回 10"
          const countMatch = text.match(/(\d+)\s*(?:条|条消息)?$/);
          const count = countMatch ? Math.min(parseInt(countMatch[1], 10), 50) : 10;

          let logs;
          if (targetQQ) {
            logs = await messageLogService.getRecentByUser(ctx.groupId, targetQQ, count);
          } else {
            logs = await messageLogService.getRecent(ctx.groupId, count);
          }

          if (logs.length === 0) {
            await c.reply("没有找到可撤回的消息记录");
            return;
          }

          let success = 0;
          let failed = 0;
          for (const log of logs) {
            try {
              const result = await c.sendAction("delete_msg", { message_id: Number(log.msgId) });
              if (result.ok) {
                success++;
                await messageLogService.deleteByMsgId(ctx.groupId, log.msgId);
              } else {
                failed++;
              }
            } catch {
              failed++;
            }
          }

          const targetText = targetQQ ? `用户 ${targetQQ} 的` : "";
          await c.reply(`已撤回 ${targetText}${success} 条消息${failed > 0 ? `，${failed} 条失败` : ""}`);
        },
      },
    ],
  };
}
