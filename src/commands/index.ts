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
      systemCmd,
    ],
  });
}

async function showMainHelp(c: EventContext, permService: PermissionService): Promise<void> {
  const groupId = c.event.payload.groupId;
  const text =
    `👥 群组管理指令\n` +
    `────────────────\n` +
    `群管 权限 - 权限管理\n` +
    `群管 管理员 - 管理员操作\n` +
    `群管 成员 - 成员管理\n` +
    `群管 名单 - 黑白名单\n` +
    `群管 广告 - 广告杀手\n` +
    `群管 提示 - 群内提示\n` +
    `群管 系统 - 系统设置\n` +
    `图片模式 - 图片/文字切换\n` +
    `────────────────\n` +
    `输入 群管 <分类> 帮助 查看详情`;

  if (groupId) {
    await smartReply(c, text, groupId, permService, { templateId: "help_main", templateType: "help" });
  } else {
    await c.reply(text);
  }
}
