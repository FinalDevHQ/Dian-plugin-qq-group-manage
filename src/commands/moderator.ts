import type { EventContext, PluginSetupContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { PermissionLevel } from "../services/permission.js";
import { extractMentionedQQ, requirePermission } from "./permission.js";

export function registerModeratorCommands(ctx: PluginSetupContext, permService: PermissionService): void {
  ctx.command({
    name: "管理员",
    aliases: ["mod"],
    description: "QQ群管理员操作",
    order: 20,
    children: [
      {
        name: "设置",
        aliases: ["设管"],
        pattern: /^(群管\s+管理员\s+设置|设管)\s*.+/,
        description: "设置群管理员",
        order: 1,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const targetQQ = extractMentionedQQ(text);
          if (!targetQQ) {
            await c.reply("请@要设置的用户");
            return;
          }
          const result = await c.sendAction("set_group_admin", {
            group_id: Number(ctx.groupId),
            user_id: Number(targetQQ),
            enable: true,
          });
          if (result.ok) {
            await c.reply(`已将 ${targetQQ} 设为群管理员`);
          } else {
            await c.reply(`设置失败: ${result.message || "机器人可能不是群主，无法操作"}`);
          }
        },
      },
      {
        name: "取消",
        aliases: ["取管"],
        pattern: /^(群管\s+管理员\s+取消|取管)\s*.+/,
        description: "取消群管理员",
        order: 2,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const targetQQ = extractMentionedQQ(text);
          if (!targetQQ) {
            await c.reply("请@要取消的用户");
            return;
          }
          const result = await c.sendAction("set_group_admin", {
            group_id: Number(ctx.groupId),
            user_id: Number(targetQQ),
            enable: false,
          });
          if (result.ok) {
            await c.reply(`已取消 ${targetQQ} 的群管理员`);
          } else {
            await c.reply(`取消失败: ${result.message || "机器人可能不是群主，无法操作"}`);
          }
        },
      },
      {
        name: "同步",
        aliases: ["同步管理权限"],
        pattern: /^(群管\s+管理员\s+同步|同步管理权限)$/,
        description: "同步本群管理员列表到数据库",
        order: 3,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const result = await c.sendAction("get_group_member_list", {
            group_id: Number(ctx.groupId),
          });
          if (!result.ok || !result.data) {
            await c.reply(`同步失败: ${result.message || "无法获取群成员列表"}`);
            return;
          }
          const members = result.data as Array<{ user_id: number; role: string }>;
          const syncData = members.map((m) => ({ userId: String(m.user_id), role: m.role }));
          const count = await permService.syncGroupModerators(ctx.groupId, syncData);
          await c.reply(`同步完成，已记录 ${count} 名群管理员`);
        },
      },
    ],
  });
}
