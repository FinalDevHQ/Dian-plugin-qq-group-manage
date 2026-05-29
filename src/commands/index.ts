import type { PluginSetupContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { getPermissionCommands } from "./permission.js";
import { getModeratorCommands } from "./moderator.js";
import { getSystemCommands } from "./system.js";
import { getMemberCommands } from "./member.js";
import { getBlacklistCommands } from "./blacklist.js";
import { getAdKillerCommands } from "./ad-killer.js";
import type { EventContext } from "@myfinal/plugin-runtime";

export { extractMentionedQQ, requirePermission } from "./permission.js";

export function registerAllCommands(ctx: PluginSetupContext, permService: PermissionService): void {
  const permissionCmd = getPermissionCommands(permService);
  const moderatorCmd = getModeratorCommands(permService);
  const memberCmd = getMemberCommands(permService);
  const blacklistCmd = getBlacklistCommands(permService);
  const systemCmd = getSystemCommands(permService);
  const adKillerCmd = getAdKillerCommands(permService);

  ctx.command({
    name: "群管",
    aliases: ["qg", "群管理", "群组管理"],
    pattern: /^群管(?:\s+帮助)?$/,
    description: "群组管理插件",
    category: "群组管理",
    order: 5,
    handler: async (c: EventContext) => {
      await showMainHelp(c);
    },
    children: [
      {
        name: "帮助",
        aliases: ["help", "菜单"],
        pattern: /^群管\s*(帮助|help|菜单)$/,
        description: "查看群管指令",
        order: 1,
        handler: async (c: EventContext) => {
          await showMainHelp(c);
        },
      },
      permissionCmd,
      moderatorCmd,
      memberCmd,
      blacklistCmd,
      adKillerCmd,
      systemCmd,
    ],
  });
}

async function showMainHelp(c: EventContext): Promise<void> {
  await c.reply(
    `👥 群组管理指令\n` +
    `────────────────\n` +
    `群管 权限 - 权限管理\n` +
    `群管 管理员 - 管理员操作\n` +
    `群管 成员 - 成员管理\n` +
    `群管 名单 - 黑白名单\n` +
    `群管 广告 - 广告杀手\n` +
    `群管 系统 - 系统设置\n` +
    `────────────────\n` +
    `输入 群管 <分类> 帮助 查看详情`
  );
}
