import type { PluginSetupContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { getPermissionCommands } from "./permission.js";
import { getModeratorCommands } from "./moderator.js";
import { getSystemCommands } from "./system.js";
import { getMemberCommands } from "./member.js";
import { getBlacklistCommands } from "./blacklist.js";
import { getAdKillerCommands } from "./ad-killer.js";
import { getImageModeCommands } from "./image-mode.js";
import { getNotifyCommands, getGlobalNotifyCommands } from "./notify.js";
import { getStatisticsCommands } from "./statistics.js";
import { getCardCommands } from "./card.js";
import { getScheduleCommands } from "./schedule.js";
import type { EventContext } from "@myfinal/plugin-runtime";
import { smartReply } from "../services/render.js";

export { extractMentionedQQ, requirePermission } from "./permission.js";

export function registerAllCommands(ctx: PluginSetupContext, permService: PermissionService): void {
  const permissionCmd = getPermissionCommands(permService);
  const moderatorCmd = getModeratorCommands(permService);
  const memberCmd = getMemberCommands(permService);
  const blacklistCmd = getBlacklistCommands(permService);
  const systemCmd = getSystemCommands(permService);
  const adKillerCmd = getAdKillerCommands(permService);
  const imageModeCmd = getImageModeCommands(permService);
  const notifyCmd = getNotifyCommands(permService);
  const globalNotifyCmd = getGlobalNotifyCommands(permService);
  const statisticsCmd = getStatisticsCommands(permService);
  const cardCmd = getCardCommands(permService);
  const scheduleCmd = getScheduleCommands(permService);

  ctx.command({
    name: "群管",
    aliases: ["qg", "群管理", "群组管理"],
    pattern: /^群管(?:\s+帮助)?$/,
    description: "群组管理插件",
    category: "群组管理",
    order: 5,
    handler: async (c: EventContext) => {
      await showMainHelp(c, permService);
    },
    children: [
      {
        name: "帮助",
        aliases: ["help", "菜单"],
        pattern: /^群管\s*(帮助|help|菜单)$/,
        description: "查看群管指令",
        order: 1,
        handler: async (c: EventContext) => {
          await showMainHelp(c, permService);
        },
      },
      permissionCmd,
      moderatorCmd,
      memberCmd,
      blacklistCmd,
      adKillerCmd,
      imageModeCmd,
      notifyCmd,
      globalNotifyCmd,
      statisticsCmd,
      cardCmd,
      scheduleCmd,
      systemCmd,
    ],
  });
}

async function showMainHelp(c: EventContext, permService: PermissionService): Promise<void> {
  const groupId = c.event.payload.groupId;
  const text =
    `===小点管家===\n` +
    `权限管理  管理员操作\n` +
    `成员管理  黑白名单\n` +
    `广告杀手  群内提示\n` +
    `发言统计  定时任务\n` +
    `名片系统  运行状态\n` +
    `图片模式  系统设置\n` +
    `===========\n` +
    `直接输入关键词即可使用\n` +
    `例: 成员管理 帮助`;

  if (groupId) {
    await smartReply(c, text, groupId, permService, { templateId: "help_main", templateType: "help" });
  } else {
    await c.reply(text);
  }
}
