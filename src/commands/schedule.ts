import type { EventContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { PermissionLevel } from "../services/permission.js";
import { scheduleService } from "../services/schedule.js";
import { replyAuto } from "../services/render.js";

export function getScheduleCommands(permService: PermissionService) {
  return {
    name: "定时任务",
    aliases: ["定时", "schedule", "定时管理"],
    pattern: /^(群管\s+定时任务|定时任务|定时|定时管理)$/,
    description: "定时任务管理",
    order: 40,
    handler: async (c: EventContext) => {
      const groupId = c.event.payload.groupId;
      if (!groupId) { await c.reply("请在群内使用"); return; }

      const [settings, tasks] = await Promise.all([
        scheduleService.isEnabled(groupId),
        scheduleService.getTasks(groupId),
      ]);

      const lines = [
        "⏰ 定时任务",
        `状态: ${settings ? "✅ 开启" : "❌ 关闭"}`,
        `任务数: ${tasks.length}个`,
        "",
        "===小点管家===",
        "开定时任务 — 开启定时任务",
        "关定时任务 — 关闭定时任务",
        "设置定时开机 8时30分 — 定时开机",
        "设置定时关机 23时0分 — 定时关机",
        "设置全体禁言 23时0分 — 定时禁言",
        "设置全体解禁 8时0分 — 定时解禁",
        "加循环消息 30[=]内容 — 循环消息",
        "加定时消息 星期一8时0分[=]内容 — 定时消息",
        "查看定时任务 — 查看所有任务",
        "删除定时任务 ID — 删除任务",
      ];
      await replyAuto(c, lines.join("\n"), permService);
    },
    children: [
      {
        name: "帮助",
        aliases: ["help"],
        pattern: /^群管\s+定时任务\s*(帮助|help)$/,
        description: "查看定时任务帮助",
        order: 0,
        handler: async (c: EventContext) => {
          await replyAuto(c,
            `⏰ 定时任务\n` +
            `────────────────\n` +
            `开定时任务 — 开启定时任务\n` +
            `关定时任务 — 关闭定时任务\n` +
            `设置定时开机 8时30分 — 定时开机\n` +
            `设置定时关机 23时0分 — 定时关机\n` +
            `设置全体禁言 23时0分 — 定时禁言\n` +
            `设置全体解禁 8时0分 — 定时解禁\n` +
            `加循环消息 30[=]内容 — 循环消息\n` +
            `加定时消息 星期一8时0分[=]内容 — 定时消息\n` +
            `查看定时任务 — 查看所有任务\n` +
            `删除定时任务 ID — 删除任务`,
            permService,
          );
        },
      },
      {
        name: "开启",
        aliases: ["开", "on", "开定时任务"],
        pattern: /^(群管\s+定时任务\s*(开启|开|on)|开定时任务)$/,
        description: "开启定时任务",
        order: 1,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          await scheduleService.setEnabled(groupId, true);
          await replyAuto(c, "✅ 定时任务已开启", permService);
        },
      },
      {
        name: "关闭",
        aliases: ["关", "off", "关定时任务"],
        pattern: /^(群管\s+定时任务\s*(关闭|关|off)|关定时任务)$/,
        description: "关闭定时任务",
        order: 2,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          await scheduleService.setEnabled(groupId, false);
          await replyAuto(c, "❌ 定时任务已关闭", permService);
        },
      },
      {
        name: "设置定时开机",
        aliases: ["定时开机"],
        pattern: /^(群管\s+定时任务\s*设置定时开机|设置定时开机)\s+(.+)/,
        description: "设置定时开机时间",
        order: 3,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          const text = c.event.payload.text || "";
          const match = text.match(/设置定时开机\s+(.+)/);
          const timeSpec = match?.[1]?.trim();
          if (!timeSpec) { await c.reply("请指定时间，如：设置定时开机 8时30分"); return; }
          await scheduleService.addTask(groupId, "boot", timeSpec);
          await replyAuto(c, `✅ 定时开机已设置：${timeSpec}`, permService);
        },
      },
      {
        name: "设置定时关机",
        aliases: ["定时关机"],
        pattern: /^(群管\s+定时任务\s*设置定时关机|设置定时关机)\s+(.+)/,
        description: "设置定时关机时间",
        order: 4,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          const text = c.event.payload.text || "";
          const match = text.match(/设置定时关机\s+(.+)/);
          const timeSpec = match?.[1]?.trim();
          if (!timeSpec) { await c.reply("请指定时间，如：设置定时关机 23时0分"); return; }
          await scheduleService.addTask(groupId, "shutdown", timeSpec);
          await replyAuto(c, `✅ 定时关机已设置：${timeSpec}`, permService);
        },
      },
      {
        name: "设置全体禁言",
        aliases: ["定时禁言"],
        pattern: /^(群管\s+定时任务\s*设置全体禁言|设置全体禁言)\s+(.+)/,
        description: "设置定时全体禁言",
        order: 5,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          const text = c.event.payload.text || "";
          const match = text.match(/设置全体禁言\s+(.+)/);
          const timeSpec = match?.[1]?.trim();
          if (!timeSpec) { await c.reply("请指定时间，如：设置全体禁言 23时0分"); return; }
          await scheduleService.addTask(groupId, "mute", timeSpec);
          await replyAuto(c, `✅ 定时全体禁言已设置：${timeSpec}`, permService);
        },
      },
      {
        name: "设置全体解禁",
        aliases: ["定时解禁"],
        pattern: /^(群管\s+定时任务\s*设置全体解禁|设置全体解禁)\s+(.+)/,
        description: "设置定时全体解禁",
        order: 6,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          const text = c.event.payload.text || "";
          const match = text.match(/设置全体解禁\s+(.+)/);
          const timeSpec = match?.[1]?.trim();
          if (!timeSpec) { await c.reply("请指定时间，如：设置全体解禁 8时0分"); return; }
          await scheduleService.addTask(groupId, "unmute", timeSpec);
          await replyAuto(c, `✅ 定时全体解禁已设置：${timeSpec}`, permService);
        },
      },
      {
        name: "加循环消息",
        aliases: ["循环消息"],
        pattern: /^(群管\s+定时任务\s*加循环消息|加循环消息)\s+(.+)\[=\](.+)/,
        description: "添加循环消息",
        order: 7,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          const text = c.event.payload.text || "";
          const match = text.match(/加循环消息\s+(.+)\[=\](.+)/);
          if (!match) { await c.reply("格式错误，如：加循环消息 30[=]记得喝水"); return; }
          const minutes = match[1].trim();
          const content = match[2].trim();
          if (isNaN(parseInt(minutes, 10)) || parseInt(minutes, 10) <= 0) { await c.reply("时间间隔必须是正整数（分钟）"); return; }
          await scheduleService.addTask(groupId, "loop", minutes, content);
          await replyAuto(c, `✅ 循环消息已设置：每${minutes}分钟发送`, permService);
        },
      },
      {
        name: "加定时消息",
        aliases: ["定时消息"],
        pattern: /^(群管\s+定时任务\s*加定时消息|加定时消息)\s+(.+)\[=\](.+)/,
        description: "添加定时消息",
        order: 8,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          const text = c.event.payload.text || "";
          const match = text.match(/加定时消息\s+(.+)\[=\](.+)/);
          if (!match) { await c.reply("格式错误，如：加定时消息 星期一8时0分[=]周一好"); return; }
          const timeSpec = match[1].trim();
          const content = match[2].trim();
          await scheduleService.addTask(groupId, "timed", timeSpec, content);
          await replyAuto(c, `✅ 定时消息已设置：${timeSpec}`, permService);
        },
      },
      {
        name: "查看定时任务",
        aliases: ["查看任务", "任务列表"],
        pattern: /^(群管\s+定时任务\s*查看定时任务|查看定时任务)$/,
        description: "查看所有定时任务",
        order: 9,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) { await c.reply("请在群内使用"); return; }
          const tasks = await scheduleService.getTasks(groupId);
          if (tasks.length === 0) {
            await replyAuto(c, "📋 当前没有定时任务", permService);
            return;
          }
          const lines = tasks.map((t, i) => {
            const typeMap: Record<string, string> = {
              boot: "开机",
              shutdown: "关机",
              mute: "禁言",
              unmute: "解禁",
              loop: "循环",
              timed: "定时",
            };
            return `${i + 1}. [${typeMap[t.taskType] || t.taskType}] ${t.timeSpec}${t.content ? ` → ${t.content}` : ""}`;
          });
          await replyAuto(c, `📋 定时任务列表\n${lines.join("\n")}`, permService);
        },
      },
      {
        name: "删除定时任务",
        aliases: ["删除任务"],
        pattern: /^群管\s+定时任务\s*删除定时任务\s+(\d+)/,
        description: "删除定时任务",
        order: 10,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const qqId = c.event.payload.userId;
          if (!groupId || !qqId) { await c.reply("请在群内使用"); return; }
          if (!(await permService.check(qqId, groupId, PermissionLevel.ADMIN))) { await c.reply("需要管理员权限"); return; }
          const text = c.event.payload.text || "";
          const match = text.match(/删除定时任务\s+(\d+)/);
          const taskId = match ? parseInt(match[1], 10) : 0;
          if (!taskId) { await c.reply("请指定任务ID，如：删除定时任务 1"); return; }
          const success = await scheduleService.removeTask(groupId, taskId);
          await replyAuto(c, success ? `✅ 任务 ${taskId} 已删除` : `❌ 任务 ${taskId} 不存在`, permService);
        },
      },
    ],
  };
}
