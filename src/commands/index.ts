import type { PluginSetupContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { getPermissionCommands } from "./permission.js";
import { getModeratorCommands } from "./moderator.js";
import { getSystemCommands } from "./system.js";
import { getMemberCommands } from "./member.js";
import { getBlacklistCommands } from "./blacklist.js";
import type { EventContext } from "@myfinal/plugin-runtime";

export { extractMentionedQQ, requirePermission } from "./permission.js";

export function registerAllCommands(ctx: PluginSetupContext, permService: PermissionService): void {
  const permissionCmd = getPermissionCommands(permService);
  const moderatorCmd = getModeratorCommands(permService);
  const memberCmd = getMemberCommands(permService);
  const blacklistCmd = getBlacklistCommands(permService);
  const systemCmd = getSystemCommands(permService);

  ctx.command({
    name: "群管",
    aliases: ["qg", "群管理", "群组管理"],
    pattern: /^群管(?:\s+帮助)?$/,
    description: "群组管理插件",
    category: "群组管理",
    order: 5,
    handler: async (c: EventContext) => {
      await showHelp(c);
    },
    children: [
      {
        name: "帮助",
        aliases: ["help", "菜单"],
        pattern: /^群管\s*(帮助|help|菜单)$/,
        description: "查看群管指令",
        order: 1,
        handler: async (c: EventContext) => {
          await showHelp(c);
        },
      },
      permissionCmd,
      moderatorCmd,
      memberCmd,
      blacklistCmd,
      systemCmd,
    ],
  });
}

async function showHelp(c: EventContext): Promise<void> {
  await c.reply(
    `👥 群组管理指令：\n` +
    `群管 帮助 - 查看帮助\n\n` +
    `【权限管理】\n` +
    `群管 权限 身份 / 我的身份 - 查看当前权限\n` +
    `群管 权限 小主人 添加 @QQ / 加小主人 @QQ - 添加小主人\n` +
    `群管 权限 小主人 删除 @QQ / 删小主人 @QQ - 删除小主人\n` +
    `群管 权限 小主人 列表 / 查小主人 - 查看小主人列表\n` +
    `群管 权限 超管 添加 @QQ / 加超管 @QQ - 添加本群超管\n` +
    `群管 权限 超管 删除 @QQ / 删超管 @QQ - 删除本群超管\n` +
    `群管 权限 超管 列表 / 查超管 - 查看本群超管\n\n` +
    `【管理员】\n` +
    `群管 管理员 设置 @QQ / 设管 @QQ - 设置群管理员\n` +
    `群管 管理员 取消 @QQ / 取管 @QQ - 取消群管理员\n` +
    `群管 管理员 同步 / 同步管理权限 - 同步群管理员到数据库\n\n` +
    `【成员管理】\n` +
    `群管 成员 踢 @QQ / 踢 @QQ - 踢出成员\n` +
    `群管 成员 踢黑 @QQ / 踢黑 @QQ - 踢出并拉黑\n` +
    `群管 成员 禁言 @QQ [分钟] / 禁言 @QQ [分钟] - 禁言成员\n` +
    `群管 成员 解禁 @QQ / 解禁 @QQ - 解除禁言\n` +
    `群管 成员 全体禁言 / 全体禁言 - 开启全体禁言\n` +
    `群管 成员 全体解禁 / 全体解禁 - 关闭全体禁言\n\n` +
    `【黑白名单】\n` +
    `群管 名单 拉黑 @QQ [理由] / 拉黑 @QQ - 拉黑并踢出\n` +
    `群管 名单 删黑 @QQ / 删黑 @QQ - 从黑名单移除\n` +
    `群管 名单 查黑 @QQ / 查黑 @QQ - 查询黑名单\n` +
    `群管 名单 黑名单 / 黑名单 - 查看黑名单列表\n` +
    `群管 名单 拉白 @QQ [理由] / 拉白 @QQ - 拉白（免疫广告杀手）\n` +
    `群管 名单 删白 @QQ / 删白 @QQ - 从白名单移除\n` +
    `群管 名单 查白 @QQ / 查白 @QQ - 查询白名单\n` +
    `群管 名单 白名单 / 白名单 - 查看白名单列表\n` +
    `群管 名单 退群拉黑 开启 / 开启退群拉黑 - 退群自动拉黑\n` +
    `群管 名单 退群拉黑 关闭 / 关闭退群拉黑 - 关闭退群自动拉黑\n\n` +
    `【系统设置】\n` +
    `群管 系统 开机 / 开机 - 启用机器人\n` +
    `群管 系统 关机 / 关机 - 停用机器人\n` +
    `群管 系统 闭嘴 / 闭嘴 - 停止发言\n` +
    `群管 系统 说话 / 说话 - 恢复发言\n` +
    `群管 系统 专属模式 开启 / 开启专属模式 - 仅响应主人\n` +
    `群管 系统 专属模式 关闭 / 关闭专属模式 - 恢复正常\n` +
    `群管 系统 状态 / 查群状态 - 查看群配置`
  );
}
