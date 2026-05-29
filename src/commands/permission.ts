import type { EventContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { PermissionLevel } from "../services/permission.js";

export function extractMentionedQQ(text: string): string | null {
  const match = text.match(/\[CQ:at,qq=(\d+)\]/);
  return match ? match[1] : null;
}

export async function requirePermission(
  c: EventContext,
  permService: PermissionService,
  requiredLevel: number
): Promise<{ qqId: string; groupId: string } | null> {
  const qqId = c.event.payload.userId;
  const groupId = c.event.payload.groupId;
  if (!qqId || !groupId) {
    await c.reply("此指令只能在群聊中使用");
    return null;
  }
  const hasPerm = await permService.check(qqId, groupId, requiredLevel);
  if (!hasPerm) {
    const levelName = await permService.getPermissionName(requiredLevel);
    await c.reply(`权限不足，需要${levelName}及以上权限`);
    return null;
  }
  return { qqId, groupId };
}

export function getPermissionCommands(permService: PermissionService) {
  return {
    name: "权限",
    aliases: ["perm"],
    description: "权限管理",
    order: 10,
    children: [
      {
        name: "身份",
        aliases: ["我的身份"],
        pattern: /^(群管\s+权限\s+身份|我的身份)$/,
        description: "查看当前权限等级",
        order: 1,
        handler: async (c: EventContext) => {
          const qqId = c.event.payload.userId;
          const groupId = c.event.payload.groupId;
          if (!qqId || !groupId) {
            await c.reply("此指令只能在群聊中使用");
            return;
          }
          const level = await permService.getLevel(qqId, groupId);
          const name = await permService.getPermissionName(level);
          await c.reply(`你的身份是：${name} (等级${level})`);
        },
      },
      {
        name: "小主人",
        aliases: ["admin"],
        description: "小主人管理",
        order: 2,
        children: [
          {
            name: "添加",
            aliases: ["加小主人"],
            pattern: /^(群管\s+权限\s+小主人\s+添加|加小主人)\s*.+/,
            description: "添加小主人",
            order: 1,
            handler: async (c: EventContext) => {
              const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
              if (!ctx) return;
              const text = c.event.payload.text || "";
              const targetQQ = extractMentionedQQ(text);
              if (!targetQQ) {
                await c.reply("请@要添加的用户");
                return;
              }
              try {
                await permService.addAdmin(targetQQ);
                await c.reply(`已添加 ${targetQQ} 为小主人`);
              } catch (e: unknown) {
                await c.reply(`添加失败: ${e instanceof Error ? e.message : String(e)}`);
              }
            },
          },
          {
            name: "删除",
            aliases: ["删小主人"],
            pattern: /^(群管\s+权限\s+小主人\s+删除|删小主人)\s*.+/,
            description: "删除小主人",
            order: 2,
            handler: async (c: EventContext) => {
              const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
              if (!ctx) return;
              const text = c.event.payload.text || "";
              const targetQQ = extractMentionedQQ(text);
              if (!targetQQ) {
                await c.reply("请@要删除的用户");
                return;
              }
              const deleted = await permService.removeAdmin(targetQQ);
              if (deleted > 0) {
                await c.reply(`已删除小主人 ${targetQQ}`);
              } else {
                await c.reply(`${targetQQ} 不是小主人`);
              }
            },
          },
          {
            name: "列表",
            aliases: ["查小主人"],
            pattern: /^(群管\s+权限\s+小主人\s*(列表|查)?|查小主人)$/,
            description: "查看小主人列表",
            order: 3,
            handler: async (c: EventContext) => {
              const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
              if (!ctx) return;
              const admins = await permService.getAdmins();
              if (admins.length === 0) {
                await c.reply("暂无小主人");
                return;
              }
              const list = admins.map((a, i) => `${i + 1}. ${a.qqId}${a.nickname ? ` (${a.nickname})` : ""}`).join("\n");
              await c.reply(`小主人列表：\n${list}`);
            },
          },
        ],
      },
      {
        name: "超管",
        aliases: ["superadmin"],
        description: "超管管理（按群设置）",
        order: 3,
        children: [
          {
            name: "添加",
            aliases: ["加超管"],
            pattern: /^(群管\s+权限\s+超管\s+添加|加超管)\s*.+/,
            description: "添加本群超管",
            order: 1,
            handler: async (c: EventContext) => {
              const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
              if (!ctx) return;
              const text = c.event.payload.text || "";
              const targetQQ = extractMentionedQQ(text);
              if (!targetQQ) {
                await c.reply("请@要添加的用户");
                return;
              }
              try {
                await permService.addSuperAdmin(ctx.groupId, targetQQ);
                await c.reply(`已添加 ${targetQQ} 为本群超管`);
              } catch (e: unknown) {
                await c.reply(`添加失败: ${e instanceof Error ? e.message : String(e)}`);
              }
            },
          },
          {
            name: "删除",
            aliases: ["删超管"],
            pattern: /^(群管\s+权限\s+超管\s+删除|删超管)\s*.+/,
            description: "删除本群超管",
            order: 2,
            handler: async (c: EventContext) => {
              const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
              if (!ctx) return;
              const text = c.event.payload.text || "";
              const targetQQ = extractMentionedQQ(text);
              if (!targetQQ) {
                await c.reply("请@要删除的用户");
                return;
              }
              const deleted = await permService.removeSuperAdmin(ctx.groupId, targetQQ);
              if (deleted > 0) {
                await c.reply(`已删除本群超管 ${targetQQ}`);
              } else {
                await c.reply(`${targetQQ} 不是本群超管`);
              }
            },
          },
          {
            name: "列表",
            aliases: ["查超管"],
            pattern: /^(群管\s+权限\s+超管\s*(列表|查)?|查超管)$/,
            description: "查看本群超管列表",
            order: 3,
            handler: async (c: EventContext) => {
              const ctx = await requirePermission(c, permService, PermissionLevel.SUPER_ADMIN);
              if (!ctx) return;
              const superAdmins = await permService.getSuperAdmins(ctx.groupId);
              if (superAdmins.length === 0) {
                await c.reply("本群暂无超管");
                return;
              }
              const list = superAdmins.map((id, i) => `${i + 1}. ${id}`).join("\n");
              await c.reply(`本群超管列表：\n${list}`);
            },
          },
        ],
      },
    ],
  };
}
