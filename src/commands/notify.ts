import type { EventContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { PermissionLevel } from "../services/permission.js";
import { requirePermission } from "./permission.js";
import { notifyService } from "../services/notify.js";
import { replyAuto } from "../services/render.js";

export function getNotifyCommands(permService: PermissionService) {
  return {
    name: "提示",
    aliases: ["notify", "群内提示"],
    pattern: /^(群管\s+提示|群内提示)$/,
    description: "群内提示管理",
    order: 30,
    handler: async (c: EventContext) => {
      const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
      if (!ctx) return;
      const config = await notifyService.getEffectiveConfig(ctx.groupId);
      const source = config.custom ? "本群自定义" : "全局默认";
      await replyAuto(c,
        `📢 群内提示状态 (${source})\n` +
        `────────────────\n` +
        `欢迎语: ${config.welcomeEnabled ? "✅ 开启" : "❌ 关闭"}\n` +
        `欢迎内容: ${config.welcomeMsg}\n` +
        `退群通知: ${config.leaveEnabled ? "✅ 开启" : "❌ 关闭"}\n` +
        `退群内容: ${config.leaveMsg}\n` +
        `入群禁言: ${config.muteOnJoin ? `✅ ${config.muteDuration}秒` : "❌ 关闭"}\n` +
        `────────────────\n` +
        `提示 开启/关闭 - 欢迎语开关\n` +
        `提示 退群 开启/关闭 - 退群通知\n` +
        `提示 欢迎 <内容> - 设置欢迎语\n` +
        `提示 退群 <内容> - 设置退群语\n` +
        `提示 入群禁言 <秒> - 入群禁言(0=关)\n` +
        `提示 重置 - 回退全局默认\n` +
        `────────────────\n` +
        `变量: {at} {username} {group_name} {member_count} {bot_name}`,
        permService,
      );
    },
    children: [
      {
        name: "帮助",
        aliases: ["help"],
        pattern: /^群管\s+提示\s*(帮助|help)$/,
        description: "查看提示帮助",
        order: 0,
        handler: async (c: EventContext) => {
          await replyAuto(c,
            `📢 群内提示帮助\n` +
            `────────────────\n` +
            `提示 开启/关闭 - 欢迎语开关\n` +
            `提示 退群 开启/关闭 - 退群通知\n` +
            `提示 欢迎 <内容> - 设置欢迎语\n` +
            `提示 退群 <内容> - 设置退群语\n` +
            `提示 入群禁言 <秒> - 入群禁言(0=关)\n` +
            `提示 重置 - 回退全局默认\n` +
            `────────────────\n` +
            `变量: {at} {username} {group_name} {member_count} {bot_name}`,
            permService,
          );
        },
      },
      {
        name: "开启",
        aliases: ["开"],
        pattern: /^(群管\s+提示\s+开启|群内提示\s+开启|提示\s+开启)$/,
        description: "开启欢迎语",
        order: 1,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          await notifyService.updateGroupConfig(ctx.groupId, { welcomeEnabled: true });
          await c.reply("已开启欢迎语");
        },
      },
      {
        name: "关闭",
        aliases: ["关"],
        pattern: /^(群管\s+提示\s+关闭|群内提示\s+关闭|提示\s+关闭)$/,
        description: "关闭欢迎语",
        order: 2,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          await notifyService.updateGroupConfig(ctx.groupId, { welcomeEnabled: false });
          await c.reply("已关闭欢迎语");
        },
      },
      {
        name: "退群开启",
        aliases: ["leave-on"],
        pattern: /^(群管\s+提示\s+退群\s*开启|群内提示\s+退群\s*开启|提示\s+退群\s*开启)$/,
        description: "开启退群通知",
        order: 3,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          await notifyService.updateGroupConfig(ctx.groupId, { leaveEnabled: true });
          await c.reply("已开启退群通知");
        },
      },
      {
        name: "退群关闭",
        aliases: ["leave-off"],
        pattern: /^(群管\s+提示\s+退群\s*关闭|群内提示\s+退群\s*关闭|提示\s+退群\s*关闭)$/,
        description: "关闭退群通知",
        order: 4,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          await notifyService.updateGroupConfig(ctx.groupId, { leaveEnabled: false });
          await c.reply("已关闭退群通知");
        },
      },
      {
        name: "设置欢迎语",
        aliases: ["set-welcome"],
        pattern: /^(群管\s+提示\s+欢迎|群内提示\s+欢迎|提示\s+欢迎)\s+.+/,
        description: "设置欢迎语内容",
        order: 5,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+提示\s+|群内提示\s+|提示\s+)欢迎\s+(.+)/);
          if (!match) { await c.reply("格式: 提示 欢迎 <内容>"); return; }
          const msg = match[1].trim();
          await notifyService.updateGroupConfig(ctx.groupId, { welcomeMsg: msg });
          await c.reply(`已设置欢迎语:\n${msg}`);
        },
      },
      {
        name: "设置退群语",
        aliases: ["set-leave"],
        pattern: /^(群管\s+提示\s+退群|群内提示\s+退群|提示\s+退群)\s+[^开关闭].+/,
        description: "设置退群通知内容",
        order: 6,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+提示\s+|群内提示\s+|提示\s+)退群\s+(.+)/);
          if (!match) { await c.reply("格式: 提示 退群 <内容>"); return; }
          const msg = match[1].trim();
          await notifyService.updateGroupConfig(ctx.groupId, { leaveMsg: msg });
          await c.reply(`已设置退群通知:\n${msg}`);
        },
      },
      {
        name: "入群禁言",
        aliases: ["mute-on-join"],
        pattern: /^(群管\s+提示\s+入群禁言|群内提示\s+入群禁言|提示\s+入群禁言)\s*\d+/,
        description: "设置入群禁言时长",
        order: 7,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+提示\s+|群内提示\s+|提示\s+)入群禁言\s*(\d+)/);
          if (!match) { await c.reply("格式: 提示 入群禁言 <秒>\n例: 提示 入群禁言 300"); return; }
          const seconds = parseInt(match[1], 10);
          if (seconds === 0) {
            await notifyService.updateGroupConfig(ctx.groupId, { muteOnJoin: false, muteDuration: 0 });
            await c.reply("已关闭入群禁言");
          } else {
            await notifyService.updateGroupConfig(ctx.groupId, { muteOnJoin: true, muteDuration: seconds });
            const label = seconds < 60 ? `${seconds}秒` : seconds < 3600 ? `${Math.floor(seconds / 60)}分钟` : `${Math.floor(seconds / 3600)}小时`;
            await c.reply(`已设置入群禁言: ${label}`);
          }
        },
      },
      {
        name: "重置",
        aliases: ["reset"],
        pattern: /^(群管\s+提示\s+重置|群内提示\s+重置|提示\s+重置)$/,
        description: "重置为全局默认",
        order: 8,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          await notifyService.resetGroupConfig(ctx.groupId);
          await c.reply("已重置为全局默认配置");
        },
      },
    ],
  };
}

export function getGlobalNotifyCommands(permService: PermissionService) {
  return {
    name: "全局提示",
    aliases: ["global-notify"],
    pattern: /^全局提示$/,
    description: "全局提示管理(OWNER)",
    order: 40,
    handler: async (c: EventContext) => {
      const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
      if (!ctx) return;
      const config = await notifyService.getGlobalConfig();
      await replyAuto(c,
        `📢 全局提示配置\n` +
        `────────────────\n` +
        `欢迎语: ${config.welcomeEnabled ? "✅ 开启" : "❌ 关闭"}\n` +
        `欢迎内容: ${config.welcomeMsg}\n` +
        `退群通知: ${config.leaveEnabled ? "✅ 开启" : "❌ 关闭"}\n` +
        `退群内容: ${config.leaveMsg}\n` +
        `入群禁言: ${config.muteOnJoin ? `✅ ${config.muteDuration}秒` : "❌ 关闭"}\n` +
        `────────────────\n` +
        `全局提示 开启/关闭 - 全局欢迎语\n` +
        `全局提示 退群 开启/关闭\n` +
        `全局提示 欢迎 <内容>\n` +
        `全局提示 退群 <内容>\n` +
        `全局提示 入群禁言 <秒>`,
        permService
      );
    },
    children: [
      {
        name: "开启",
        aliases: ["on"],
        pattern: /^全局提示\s+开启$/,
        description: "开启全局欢迎语",
        order: 1,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          await notifyService.updateGlobalConfig({ welcomeEnabled: true });
          await c.reply("已开启全局欢迎语");
        },
      },
      {
        name: "关闭",
        aliases: ["off"],
        pattern: /^全局提示\s+关闭$/,
        description: "关闭全局欢迎语",
        order: 2,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          await notifyService.updateGlobalConfig({ welcomeEnabled: false });
          await c.reply("已关闭全局欢迎语");
        },
      },
      {
        name: "退群开启",
        aliases: ["leave-on"],
        pattern: /^全局提示\s+退群\s*开启$/,
        description: "开启全局退群通知",
        order: 3,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          await notifyService.updateGlobalConfig({ leaveEnabled: true });
          await c.reply("已开启全局退群通知");
        },
      },
      {
        name: "退群关闭",
        aliases: ["leave-off"],
        pattern: /^全局提示\s+退群\s*关闭$/,
        description: "关闭全局退群通知",
        order: 4,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          await notifyService.updateGlobalConfig({ leaveEnabled: false });
          await c.reply("已关闭全局退群通知");
        },
      },
      {
        name: "设置欢迎语",
        aliases: ["set-welcome"],
        pattern: /^全局提示\s+欢迎\s+.+/,
        description: "设置全局欢迎语",
        order: 5,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/全局提示\s+欢迎\s+(.+)/);
          if (!match) { await c.reply("格式: 全局提示 欢迎 <内容>"); return; }
          const msg = match[1].trim();
          await notifyService.updateGlobalConfig({ welcomeMsg: msg });
          await c.reply(`已设置全局欢迎语:\n${msg}`);
        },
      },
      {
        name: "设置退群语",
        aliases: ["set-leave"],
        pattern: /^全局提示\s+退群\s+[^开关闭].+/,
        description: "设置全局退群通知",
        order: 6,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/全局提示\s+退群\s+(.+)/);
          if (!match) { await c.reply("格式: 全局提示 退群 <内容>"); return; }
          const msg = match[1].trim();
          await notifyService.updateGlobalConfig({ leaveMsg: msg });
          await c.reply(`已设置全局退群通知:\n${msg}`);
        },
      },
      {
        name: "入群禁言",
        aliases: ["mute-on-join"],
        pattern: /^全局提示\s+入群禁言\s*\d+/,
        description: "设置全局入群禁言",
        order: 7,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/全局提示\s+入群禁言\s*(\d+)/);
          if (!match) { await c.reply("格式: 全局提示 入群禁言 <秒>"); return; }
          const seconds = parseInt(match[1], 10);
          if (seconds === 0) {
            await notifyService.updateGlobalConfig({ muteOnJoin: false, muteDuration: 0 });
            await c.reply("已关闭全局入群禁言");
          } else {
            await notifyService.updateGlobalConfig({ muteOnJoin: true, muteDuration: seconds });
            const label = seconds < 60 ? `${seconds}秒` : seconds < 3600 ? `${Math.floor(seconds / 60)}分钟` : `${Math.floor(seconds / 3600)}小时`;
            await c.reply(`已设置全局入群禁言: ${label}`);
          }
        },
      },
    ],
  };
}
