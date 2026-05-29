import type { EventContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { PermissionLevel } from "../services/permission.js";
import { requirePermission } from "./permission.js";

export function getSystemCommands(permService: PermissionService) {
  return {
    name: "系统",
    aliases: ["sys"],
    description: "系统设置",
    order: 30,
    handler: async (c: EventContext) => {
      await c.reply(
        `⚙️ 系统设置\n` +
        `────────────────\n` +
        `群管 系统 开机 / 开机 - 启用机器人\n` +
        `群管 系统 关机 / 关机 - 停用机器人\n` +
        `群管 系统 闭嘴 / 闭嘴 - 停止发言\n` +
        `群管 系统 说话 / 说话 - 恢复发言\n` +
        `群管 系统 专属模式 开启/关闭 - 专属模式\n` +
        `群管 系统 状态 / 查群状态 - 查看状态`
      );
    },
    children: [
      {
        name: "帮助",
        aliases: ["help"],
        pattern: /^群管\s+系统\s*(帮助|help)$/,
        description: "查看系统帮助",
        order: 0,
        handler: async (c: EventContext) => {
          await c.reply(
            `⚙️ 系统设置\n` +
            `────────────────\n` +
            `群管 系统 开机 / 开机 - 启用机器人\n` +
            `群管 系统 关机 / 关机 - 停用机器人\n` +
            `群管 系统 闭嘴 / 闭嘴 - 停止发言\n` +
            `群管 系统 说话 / 说话 - 恢复发言\n` +
            `群管 系统 专属模式 开启/关闭 - 专属模式\n` +
            `群管 系统 状态 / 查群状态 - 查看状态`
          );
        },
      },
      {
        name: "开机",
        aliases: ["启用", "enable"],
        pattern: /^(群管\s+系统\s+开机|开机)$/,
        description: "开启机器人功能",
        order: 1,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          await permService.updateGroupSettings(ctx.groupId, { enabled: true });
          await c.reply("已开机，机器人功能已启用");
        },
      },
      {
        name: "关机",
        aliases: ["禁用", "disable"],
        pattern: /^(群管\s+系统\s+关机|关机)$/,
        description: "关闭机器人功能",
        order: 2,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          await permService.updateGroupSettings(ctx.groupId, { enabled: false });
          await c.reply("已关机，机器人功能已停用");
        },
      },
      {
        name: "闭嘴",
        aliases: ["mute"],
        pattern: /^(群管\s+系统\s+闭嘴|闭嘴)$/,
        description: "停止机器人发言",
        order: 3,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          await permService.updateGroupSettings(ctx.groupId, { muted: true });
          await c.reply("已闭嘴，机器人将停止发言");
        },
      },
      {
        name: "说话",
        aliases: ["unmute"],
        pattern: /^(群管\s+系统\s+说话|说话)$/,
        description: "恢复机器人发言",
        order: 4,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          await permService.updateGroupSettings(ctx.groupId, { muted: false });
          await c.reply("已说话，机器人已恢复发言");
        },
      },
      {
        name: "专属模式",
        aliases: ["exclusive"],
        description: "专属模式管理",
        order: 5,
        children: [
          {
            name: "开启",
            aliases: ["开"],
            pattern: /^(群管\s+系统\s+专属模式\s+开启|开启专属模式)$/,
            description: "开启专属模式",
            order: 1,
            handler: async (c: EventContext) => {
              const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
              if (!ctx) return;
              await permService.updateGroupSettings(ctx.groupId, { exclusiveMode: true });
              await c.reply("已开启专属模式，机器人仅响应主人的指令");
            },
          },
          {
            name: "关闭",
            aliases: ["关"],
            pattern: /^(群管\s+系统\s+专属模式\s+关闭|关闭专属模式)$/,
            description: "关闭专属模式",
            order: 2,
            handler: async (c: EventContext) => {
              const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
              if (!ctx) return;
              await permService.updateGroupSettings(ctx.groupId, { exclusiveMode: false });
              await c.reply("已关闭专属模式");
            },
          },
        ],
      },
      {
        name: "状态",
        aliases: ["查群状态", "群状态"],
        pattern: /^(群管\s+系统\s+状态|查群状态|群状态)$/,
        description: "查看群配置和运行情况",
        order: 10,
        handler: async (c: EventContext) => {
          const qqId = c.event.payload.userId;
          const groupId = c.event.payload.groupId;
          if (!qqId || !groupId) {
            await c.reply("此指令只能在群聊中使用");
            return;
          }
          const [settings, userLevel, owners, admins, superAdmins] = await Promise.all([
            permService.getGroupSettings(groupId),
            permService.getLevel(qqId, groupId),
            permService.getOwners(),
            permService.getAdmins(),
            permService.getSuperAdmins(groupId),
          ]);
          const levelName = await permService.getPermissionName(userLevel);
          const status = `📊 群状态 (群号: ${groupId})\n` +
            `────────────────\n` +
            `机器人: ${settings.enabled ? '✅ 已启用' : '❌ 已停用'}\n` +
            `发言: ${settings.muted ? '🔇 已闭嘴' : '🔊 正常'}\n` +
            `专属: ${settings.exclusiveMode ? '🔒 开启' : '🔓 关闭'}\n` +
            `退群拉黑: ${settings.autoBlacklistOnLeave ? '✅ 开启' : '❌ 关闭'}\n` +
            `────────────────\n` +
            `你的身份: ${levelName}\n` +
            `主人: ${owners.length} | 小主人: ${admins.length} | 超管: ${superAdmins.length}`;
          await c.reply(status);
        },
      },
    ],
  };
}
