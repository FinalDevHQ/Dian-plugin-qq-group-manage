import type { PluginSetupContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { registerPermissionCommands } from "./permission.js";
import { registerModeratorCommands } from "./moderator.js";
import { registerSystemCommands } from "./system.js";
import type { EventContext } from "@myfinal/plugin-runtime";

export { extractMentionedQQ, requirePermission } from "./permission.js";

export function registerAllCommands(ctx: PluginSetupContext, permService: PermissionService): void {
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
    ],
  });

  registerPermissionCommands(ctx, permService);
  registerModeratorCommands(ctx, permService);
  registerSystemCommands(ctx, permService);
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
