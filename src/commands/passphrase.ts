import type { EventContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { PermissionLevel } from "../services/permission.js";
import { requirePermission } from "./permission.js";
import { replyAuto } from "../services/render.js";

const PASSPHRASE_PATTERN = /^GM-[A-Z2-9]{6}$/i;

export function getPassphraseCommands(permService: PermissionService) {
  return {
    name: "口令",
    aliases: ["passphrase", "绑定口令"],
    pattern: /^(生成口令|口令列表|撤销口令|清空口令|GM-[A-Z2-9]{6})/i,
    description: "口令绑定小主人",
    order: 15,
    handler: async (c: EventContext) => {
      await replyAuto(c,
        `🔑 口令绑定\n` +
        `────────────────\n` +
        `生成口令 - 生成绑定口令（主人）\n` +
        `生成口令 [数量] - 生成多个口令\n` +
        `生成口令 全局 [数量] - 生成全局口令\n` +
        `口令列表 - 查看所有口令（主人）\n` +
        `撤销口令 [ID或口令码] - 撤销口令\n` +
        `清空口令 - 清空当前群未使用口令\n` +
        `清空口令 全部 - 清空所有未使用口令（含全局）\n` +
        `GM-XXXXXX - 使用口令绑定超管`,
        permService,
      );
    },
    children: [
      // ===== 生成口令 (主人) =====
      {
        name: "生成口令",
        aliases: ["gen-pass"],
        pattern: /^生成口令/,
        description: "生成绑定口令",
        order: 1,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          const text = c.event.payload.text || "";

          const globalMatch = text.match(/生成口令\s*全局\s*(\d+)?/);
          if (globalMatch) {
            const count = globalMatch[1] ? Math.min(parseInt(globalMatch[1], 10), 20) : 1;
            const pps = await permService.createPassphrases("*", count);
            await c.reply(`已生成 ${count} 个全局口令（一次性）：\n${pps.join("\n")}`);
            return;
          }

          const countMatch = text.match(/生成口令\s*(\d+)/);
          if (countMatch) {
            const count = Math.min(parseInt(countMatch[1], 10), 20);
            const pps = await permService.createPassphrases(ctx.groupId, count);
            await c.reply(`已生成 ${count} 个口令（一次性）：\n${pps.join("\n")}`);
            return;
          }

          const pps = await permService.createPassphrases(ctx.groupId, 1);
          await c.reply(`已生成口令（一次性）：${pps[0]}`);
        },
      },

      // ===== 口令列表 (主人) =====
      {
        name: "口令列表",
        aliases: ["pass-list"],
        pattern: /^口令列表/,
        description: "查看口令列表",
        order: 2,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;

          const allPps = await permService.getPassphrases();
          if (allPps.length === 0) {
            await c.reply("暂无口令");
            return;
          }

          const lines = allPps.map((p, i) => {
            const groupLabel = p.groupId === "*" ? "全局" : p.groupId;
            if (p.status === "active") return `${i + 1}. ${p.passphrase} [${groupLabel}] 🟢 未使用`;
            if (p.status === "used") return `${i + 1}. ${p.passphrase} [${groupLabel}] ✅ 已使用 by ${p.usedBy}`;
            return `${i + 1}. ${p.passphrase} [${groupLabel}] ❌ 已撤销`;
          });

          const active = allPps.filter(p => p.status === "active").length;
          const used = allPps.filter(p => p.status === "used").length;
          const revoked = allPps.filter(p => p.status === "revoked").length;

          await replyAuto(c,
            `📋 口令列表\n` +
            `────────────────\n` +
            lines.join("\n") +
            `\n────────────────\n` +
            `共 ${allPps.length} 个 | 未使用: ${active} | 已使用: ${used} | 已撤销: ${revoked}`,
            permService,
          );
        },
      },

      // ===== 撤销口令 (主人) =====
      {
        name: "撤销口令",
        aliases: ["revoke-pass"],
        pattern: /^撤销口令/,
        description: "撤销指定口令",
        order: 3,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/撤销口令\s*(\d+|GM-[A-Z2-9]{6})/i);
          if (!match) {
            await c.reply("格式: 撤销口令 [口令ID或口令码]\n查看口令列表获取ID");
            return;
          }

          const target = match[1];
          let id: number | null = null;

          if (/^\d+$/.test(target)) {
            id = parseInt(target, 10);
          } else {
            const pps = await permService.getPassphrases();
            const found = pps.find(p => p.passphrase.toUpperCase() === target.toUpperCase());
            if (found) id = found.id;
          }

          if (id === null) {
            await c.reply("未找到该口令");
            return;
          }

          const ok = await permService.revokePassphrase(id);
          await c.reply(ok ? "已撤销该口令" : "撤销失败");
        },
      },

      // ===== 清空口令 (主人) =====
      {
        name: "清空口令",
        aliases: ["clear-pass"],
        pattern: /^清空口令/,
        description: "清空所有未使用的口令",
        order: 4,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          const text = c.event.payload.text || "";

          // 如果用户指定"全部"，则清空所有口令（包括全局）
          if (text.includes("全部")) {
            const countAll = await permService.clearPassphrases("*");
            const countGroup = await permService.clearPassphrases(ctx.groupId);
            const totalCount = countAll + countGroup;
            await c.reply(`已清空 ${totalCount} 个未使用的口令（包括全局 ${countAll} 个，本群 ${countGroup} 个）`);
          } else {
            const count = await permService.clearPassphrases(ctx.groupId);
            await c.reply(`已清空 ${count} 个未使用的口令`);
          }
        },
      },

      // ===== 输入口令绑定 (任意用户) =====
      {
        name: "绑定",
        aliases: ["bind-pass"],
        pattern: /^GM-[A-Z2-9]{6}/i,
        description: "输入口令绑定小主人",
        order: 0,
        handler: async (c: EventContext) => {
          const text = c.event.payload.text || "";
          const match = text.match(/^(GM-[A-Z2-9]{6})/i);
          if (!match) return;
          const passphrase = match[1].toUpperCase();

          const groupId = c.event.payload.groupId;
          const userId = c.event.payload.userId;

          // Private chat: need group ID
          if (!groupId) {
            const groupMatch = text.match(/GM-[A-Z2-9]{6}\s+(\d+)/i);
            if (!groupMatch) {
              await c.reply("私聊绑定请在口令后加群号\n格式: GM-xxxxxx 群号");
              return;
            }
            const targetGroup = groupMatch[1];
            const result = await permService.usePassphrase(passphrase, targetGroup, userId!);
            if (result.ok) {
              await c.reply(`已绑定为群 ${targetGroup} 的小主人`);
            } else {
              await c.reply(result.reason || "绑定失败");
            }
            return;
          }

          // Group chat: bind to current group
          const result = await permService.usePassphrase(passphrase, groupId, userId);
          if (result.ok) {
            await c.reply("口令验证成功，已绑定为本群小主人");
          } else {
            await c.reply(result.reason || "绑定失败");
          }
        },
      },
    ],
  };
}
