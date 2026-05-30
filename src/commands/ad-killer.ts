import type { EventContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { PermissionLevel } from "../services/permission.js";
import { requirePermission } from "./permission.js";
import { adKillerService, AdPunishment } from "../services/ad-killer.js";
import { replyAuto } from "../services/render.js";

function punishmentLabel(p: AdPunishment): string {
  switch (p) {
    case AdPunishment.RECALL: return "撤回";
    case AdPunishment.RECALL_MUTE: return "撤回并禁言";
    case AdPunishment.RECALL_KICK: return "撤回并踢出";
    default: return "撤回";
  }
}

function parsePunishment(text: string): AdPunishment | null {
  if (/禁言/.test(text)) return AdPunishment.RECALL_MUTE;
  if (/踢出|踢/.test(text)) return AdPunishment.RECALL_KICK;
  if (/撤回/.test(text)) return AdPunishment.RECALL;
  return null;
}

export function getAdKillerCommands(permService: PermissionService) {
  return {
    name: "广告",
    aliases: ["ad", "广告杀手"],
    pattern: /^(群管\s+广告|广告|广告杀手)$/,
    description: "广告杀手管理",
    order: 29,
    handler: async (c: EventContext) => {
      await replyAuto(c,
        `🛡️ 广告杀手\n` +
        `────────────────\n` +
        `开启广告杀手 - 开启\n` +
        `关闭广告杀手 - 关闭\n` +
        `添加撤回关键词 XX,XX\n` +
        `添加禁言关键词 XX,XX\n` +
        `添加踢人关键词 XX,XX\n` +
        `删除关键词 XX\n` +
        `清空关键词 - 清空本群\n` +
        `关键词列表 - 查看本群\n` +
        `设置最大行数 N - 0=不限\n` +
        `设置最大字数 N - 0=不限\n` +
        `设置禁言时长 N秒 - 默认600\n` +
        `设置发言违规 撤回/禁言/踢出\n` +
        `────────────────\n` +
        `全局关键词 (对所有群生效):\n` +
        `全局添加撤回关键词 XX\n` +
        `全局添加禁言关键词 XX\n` +
        `全局添加踢人关键词 XX\n` +
        `全局删除关键词 XX\n` +
        `全局清空关键词\n` +
        `全局关键词列表`,
        permService,
      );
    },
    children: [
      {
        name: "帮助",
        aliases: ["help"],
        pattern: /^群管\s+广告\s*(帮助|help)$/,
        description: "查看广告杀手帮助",
        order: 0,
        handler: async (c: EventContext) => {
          await replyAuto(c,
            `🛡️ 广告杀手\n` +
            `────────────────\n` +
            `开启广告杀手 - 开启\n` +
            `关闭广告杀手 - 关闭\n` +
            `添加撤回关键词 XX,XX\n` +
            `添加禁言关键词 XX,XX\n` +
            `添加踢人关键词 XX,XX\n` +
            `删除关键词 XX\n` +
            `清空关键词 - 清空本群\n` +
            `关键词列表 - 查看本群\n` +
            `设置最大行数 N - 0=不限\n` +
            `设置最大字数 N - 0=不限\n` +
            `设置禁言时长 N秒 - 默认600\n` +
            `设置发言违规 撤回/禁言/踢出\n` +
            `────────────────\n` +
            `全局关键词 (对所有群生效):\n` +
            `全局添加撤回关键词 XX\n` +
            `全局添加禁言关键词 XX\n` +
            `全局添加踢人关键词 XX\n` +
            `全局删除关键词 XX\n` +
            `全局清空关键词\n` +
            `全局关键词列表`,
            permService,
          );
        },
      },
      {
        name: "开启",
        aliases: ["开"],
        pattern: /^(群管\s+广告\s+开启广告杀手|开启广告杀手)$/,
        description: "开启广告杀手",
        order: 1,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          await adKillerService.updateSettings(ctx.groupId, { enabled: true });
          await c.reply("已开启广告杀手");
        },
      },
      {
        name: "关闭",
        aliases: ["关"],
        pattern: /^(群管\s+广告\s+关闭广告杀手|关闭广告杀手)$/,
        description: "关闭广告杀手",
        order: 2,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          await adKillerService.updateSettings(ctx.groupId, { enabled: false });
          await c.reply("已关闭广告杀手");
        },
      },
      // ===== 本群关键词 =====
      {
        name: "添加撤回关键词",
        aliases: ["add-recall"],
        pattern: /^(群管\s+广告\s+添加撤回关键词|添加撤回关键词)\s+.+/,
        description: "添加撤回关键词",
        order: 3,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+广告\s+)?添加撤回关键词\s+(.+)/);
          if (!match) { await c.reply("格式: 添加撤回关键词 XX,XX"); return; }
          const keywords = match[1].split(/[,，]/).map((s) => s.trim()).filter(Boolean);
          if (keywords.length === 0) { await c.reply("请输入关键词"); return; }
          for (const kw of keywords) {
            await adKillerService.addKeyword(ctx.groupId, kw, AdPunishment.RECALL);
          }
          await c.reply(`已添加 ${keywords.length} 个撤回关键词: ${keywords.join(", ")}`);
        },
      },
      {
        name: "添加禁言关键词",
        aliases: ["add-mute"],
        pattern: /^(群管\s+广告\s+添加禁言关键词|添加禁言关键词)\s+.+/,
        description: "添加禁言关键词",
        order: 4,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+广告\s+)?添加禁言关键词\s+(.+)/);
          if (!match) { await c.reply("格式: 添加禁言关键词 XX,XX"); return; }
          const keywords = match[1].split(/[,，]/).map((s) => s.trim()).filter(Boolean);
          if (keywords.length === 0) { await c.reply("请输入关键词"); return; }
          for (const kw of keywords) {
            await adKillerService.addKeyword(ctx.groupId, kw, AdPunishment.RECALL_MUTE);
          }
          await c.reply(`已添加 ${keywords.length} 个禁言关键词: ${keywords.join(", ")}`);
        },
      },
      {
        name: "添加踢人关键词",
        aliases: ["add-kick"],
        pattern: /^(群管\s+广告\s+添加踢人关键词|添加踢人关键词)\s+.+/,
        description: "添加踢人关键词",
        order: 5,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+广告\s+)?添加踢人关键词\s+(.+)/);
          if (!match) { await c.reply("格式: 添加踢人关键词 XX,XX"); return; }
          const keywords = match[1].split(/[,，]/).map((s) => s.trim()).filter(Boolean);
          if (keywords.length === 0) { await c.reply("请输入关键词"); return; }
          for (const kw of keywords) {
            await adKillerService.addKeyword(ctx.groupId, kw, AdPunishment.RECALL_KICK);
          }
          await c.reply(`已添加 ${keywords.length} 个踢人关键词: ${keywords.join(", ")}`);
        },
      },
      {
        name: "删除关键词",
        aliases: ["del-keyword", "remove-keyword"],
        pattern: /^(群管\s+广告\s+删除关键词|删除关键词)\s+.+/,
        description: "删除关键词",
        order: 6,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+广告\s+)?删除关键词\s+(.+)/);
          if (!match) { await c.reply("格式: 删除关键词 XX"); return; }
          const keyword = match[1].trim();
          const deleted = await adKillerService.removeKeyword(ctx.groupId, keyword);
          if (deleted > 0) {
            await c.reply(`已删除关键词: ${keyword}`);
          } else {
            await c.reply(`未找到关键词: ${keyword}`);
          }
        },
      },
      {
        name: "清空关键词",
        aliases: ["clear-keywords"],
        pattern: /^(群管\s+广告\s+清空关键词|清空关键词)$/,
        description: "清空本群关键词",
        order: 7,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          await adKillerService.clearKeywords(ctx.groupId);
          await c.reply("已清空本群所有关键词");
        },
      },
      {
        name: "关键词列表",
        aliases: ["list-keywords", "查看关键词"],
        pattern: /^(群管\s+广告\s+关键词列表|关键词列表|查看关键词)$/,
        description: "查看本群关键词",
        order: 8,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const keywords = await adKillerService.getKeywords(ctx.groupId);
          if (keywords.length === 0) {
            await c.reply("本群暂无关键词");
            return;
          }
          const grouped: Record<string, string[]> = {};
          for (const kw of keywords) {
            const label = punishmentLabel(kw.punishment);
            if (!grouped[label]) grouped[label] = [];
            grouped[label].push(kw.keyword);
          }
          let msg = `本群关键词 (${keywords.length}个):\n`;
          for (const [label, kws] of Object.entries(grouped)) {
            msg += `\n[${label}]\n${kws.join(", ")}`;
          }
          await replyAuto(c, msg, permService);
        },
      },
      // ===== 全局关键词 =====
      {
        name: "全局添加撤回关键词",
        aliases: ["global-add-recall"],
        pattern: /^(群管\s+广告\s+全局添加撤回关键词|全局添加撤回关键词)\s+.+/,
        description: "全局添加撤回关键词",
        order: 13,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+广告\s+)?全局添加撤回关键词\s+(.+)/);
          if (!match) { await c.reply("格式: 全局添加撤回关键词 XX,XX"); return; }
          const keywords = match[1].split(/[,，]/).map((s) => s.trim()).filter(Boolean);
          if (keywords.length === 0) { await c.reply("请输入关键词"); return; }
          for (const kw of keywords) {
            await adKillerService.addGlobalKeyword(kw, AdPunishment.RECALL);
          }
          await c.reply(`已添加 ${keywords.length} 个全局撤回关键词: ${keywords.join(", ")}`);
        },
      },
      {
        name: "全局添加禁言关键词",
        aliases: ["global-add-mute"],
        pattern: /^(群管\s+广告\s+全局添加禁言关键词|全局添加禁言关键词)\s+.+/,
        description: "全局添加禁言关键词",
        order: 14,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+广告\s+)?全局添加禁言关键词\s+(.+)/);
          if (!match) { await c.reply("格式: 全局添加禁言关键词 XX,XX"); return; }
          const keywords = match[1].split(/[,，]/).map((s) => s.trim()).filter(Boolean);
          if (keywords.length === 0) { await c.reply("请输入关键词"); return; }
          for (const kw of keywords) {
            await adKillerService.addGlobalKeyword(kw, AdPunishment.RECALL_MUTE);
          }
          await c.reply(`已添加 ${keywords.length} 个全局禁言关键词: ${keywords.join(", ")}`);
        },
      },
      {
        name: "全局添加踢人关键词",
        aliases: ["global-add-kick"],
        pattern: /^(群管\s+广告\s+全局添加踢人关键词|全局添加踢人关键词)\s+.+/,
        description: "全局添加踢人关键词",
        order: 15,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+广告\s+)?全局添加踢人关键词\s+(.+)/);
          if (!match) { await c.reply("格式: 全局添加踢人关键词 XX,XX"); return; }
          const keywords = match[1].split(/[,，]/).map((s) => s.trim()).filter(Boolean);
          if (keywords.length === 0) { await c.reply("请输入关键词"); return; }
          for (const kw of keywords) {
            await adKillerService.addGlobalKeyword(kw, AdPunishment.RECALL_KICK);
          }
          await c.reply(`已添加 ${keywords.length} 个全局踢人关键词: ${keywords.join(", ")}`);
        },
      },
      {
        name: "全局删除关键词",
        aliases: ["global-del-keyword"],
        pattern: /^(群管\s+广告\s+全局删除关键词|全局删除关键词)\s+.+/,
        description: "全局删除关键词",
        order: 16,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+广告\s+)?全局删除关键词\s+(.+)/);
          if (!match) { await c.reply("格式: 全局删除关键词 XX"); return; }
          const keyword = match[1].trim();
          const deleted = await adKillerService.removeGlobalKeyword(keyword);
          if (deleted > 0) {
            await c.reply(`已删除全局关键词: ${keyword}`);
          } else {
            await c.reply(`未找到全局关键词: ${keyword}`);
          }
        },
      },
      {
        name: "全局清空关键词",
        aliases: ["global-clear-keywords"],
        pattern: /^(群管\s+广告\s+全局清空关键词|全局清空关键词)$/,
        description: "清空所有全局关键词",
        order: 17,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          await adKillerService.clearGlobalKeywords();
          await c.reply("已清空所有全局关键词");
        },
      },
      {
        name: "全局关键词列表",
        aliases: ["global-list-keywords"],
        pattern: /^(群管\s+广告\s+全局关键词列表|全局关键词列表)$/,
        description: "查看全局关键词",
        order: 18,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.OWNER);
          if (!ctx) return;
          const keywords = await adKillerService.getGlobalKeywords();
          if (keywords.length === 0) {
            await c.reply("暂无全局关键词");
            return;
          }
          const grouped: Record<string, string[]> = {};
          for (const kw of keywords) {
            const label = punishmentLabel(kw.punishment);
            if (!grouped[label]) grouped[label] = [];
            grouped[label].push(kw.keyword);
          }
          let msg = `全局关键词 (${keywords.length}个):\n`;
          for (const [label, kws] of Object.entries(grouped)) {
            msg += `\n[${label}]\n${kws.join(", ")}`;
          }
          await c.reply(msg);
        },
      },
      // ===== 设置 =====
      {
        name: "设置最大行数",
        aliases: ["max-lines"],
        pattern: /^(群管\s+广告\s+设置最大行数|设置最大行数)\s*\d+/,
        description: "设置最大行数限制",
        order: 9,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+广告\s+)?设置最大行数\s*(\d+)/);
          if (!match) { await c.reply("格式: 设置最大行数 N (0=不限)"); return; }
          const num = parseInt(match[1], 10);
          await adKillerService.updateSettings(ctx.groupId, { maxLines: num });
          await c.reply(num > 0 ? `已设置最大行数: ${num}行` : "已取消行数限制");
        },
      },
      {
        name: "设置最大字数",
        aliases: ["max-chars"],
        pattern: /^(群管\s+广告\s+设置最大字数|设置最大字数)\s*\d+/,
        description: "设置最大字数限制",
        order: 10,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+广告\s+)?设置最大字数\s*(\d+)/);
          if (!match) { await c.reply("格式: 设置最大字数 N (0=不限)"); return; }
          const num = parseInt(match[1], 10);
          await adKillerService.updateSettings(ctx.groupId, { maxChars: num });
          await c.reply(num > 0 ? `已设置最大字数: ${num}字` : "已取消字数限制");
        },
      },
      {
        name: "设置发言违规",
        aliases: ["default-punishment"],
        pattern: /^(群管\s+广告\s+设置发言违规|设置发言违规)\s*.+/,
        description: "设置默认违规处罚",
        order: 11,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+广告\s+)?设置发言违规\s*(.+)/);
          if (!match) { await c.reply("格式: 设置发言违规 撤回/禁言/踢出"); return; }
          const punishment = parsePunishment(match[1]);
          if (!punishment) { await c.reply("可选: 撤回、禁言、踢出"); return; }
          await adKillerService.updateSettings(ctx.groupId, { defaultPunishment: punishment });
          await c.reply(`已设置默认违规处罚: ${punishmentLabel(punishment)}`);
        },
      },
      {
        name: "设置禁言时长",
        aliases: ["mute-duration"],
        pattern: /^(群管\s+广告\s+设置禁言时长|设置禁言时长)\s*\d+/,
        description: "设置禁言时长（秒）",
        order: 12,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+广告\s+)?设置禁言时长\s*(\d+)/);
          if (!match) { await c.reply("格式: 设置禁言时长 N (秒)\n例: 设置禁言时长 600 = 10分钟"); return; }
          const seconds = parseInt(match[1], 10);
          await adKillerService.updateSettings(ctx.groupId, { muteDuration: seconds });
          const label = seconds < 60 ? `${seconds}秒` : seconds < 3600 ? `${Math.floor(seconds / 60)}分钟` : `${Math.floor(seconds / 3600)}小时`;
          await c.reply(`已设置禁言时长: ${label} (${seconds}秒)`);
        },
      },
    ],
  };
}
