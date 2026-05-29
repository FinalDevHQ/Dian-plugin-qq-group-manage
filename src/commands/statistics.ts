import type { EventContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { PermissionLevel } from "../services/permission.js";
import { extractMentionedQQ, requirePermission } from "./permission.js";
import { statisticsService, type TimeRange, type LeaderboardEntry } from "../services/statistics.js";
import { renderLeaderboardHtml } from "../services/leaderboard-template.js";
import { isPuppeteerAvailable, renderHtmlToImage } from "../services/render.js";
import { pluginState } from "../services/state.js";

const RANGE_LABELS: Record<TimeRange, string> = {
  today: "今日",
  week: "本周",
  month: "本月",
  year: "本年",
  all: "全部",
};

async function resolveNicknames(entries: LeaderboardEntry[]): Promise<LeaderboardEntry[]> {
  if (!pluginState.available || entries.length === 0) return entries;

  const results = await Promise.allSettled(
    entries.map((e) =>
      pluginState.sendAction("get_stranger_info", { user_id: Number(e.userId) }).then((res) => ({
        userId: e.userId,
        nickname: (res.data as Record<string, unknown>)?.nickname as string || "",
      }))
    )
  );

  const nameMap: Record<string, string> = {};
  for (const r of results) {
    if (r.status === "fulfilled") {
      nameMap[r.value.userId] = r.value.nickname;
    }
  }

  return entries.map((e) => ({
    ...e,
    nickname: nameMap[e.userId] || e.nickname || e.userId,
  }));
}

async function getNickname(userId: string): Promise<string> {
  if (!pluginState.available) return userId;
  try {
    const res = await pluginState.sendAction("get_stranger_info", { user_id: Number(userId) });
    return (res.data as Record<string, unknown>)?.nickname as string || userId;
  } catch {
    return userId;
  }
}

function formatTextLeaderboard(entries: Array<{ userId: string; nickname: string; count: number; percentage: number }>, title: string, rangeLabel: string): string {
  const lines: string[] = [];
  lines.push(`${title} (${rangeLabel})`);
  lines.push("────────────────");
  entries.forEach((e, i) => {
    const name = e.nickname || e.userId;
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : ` ${i + 1}.`;
    lines.push(`${medal} ${name} — ${e.count}条 (${e.percentage}%)`);
  });
  if (entries.length === 0) lines.push("暂无数据");
  return lines.join("\n");
}

const HELP_TEXT =
  `📊 发言统计\n` +
  `────────────────\n` +
  `发言统计 - 查看帮助\n` +
  `我的发言 - 查看我的发言\n` +
  `今日发言 - 今日排行\n` +
  `本周发言 - 本周排行\n` +
  `本月发言 - 本月排行\n` +
  `本年发言 - 本年排行\n` +
  `查发言 @某人 - 查看某人发言\n` +
  `排行 图片 - 今日排行图片\n` +
  `排行 设置显示 N - 显示人数`;

export function getStatisticsCommands(permService: PermissionService) {
  return {
    name: "发言统计",
    aliases: ["rank", "统计", "排行榜", "排行"],
    pattern: /^(发言统计|群管\s+排行|排行|统计|排行榜)$/,
    description: "发言统计排行榜",
    order: 36,
    handler: async (c: EventContext) => {
      const groupId = c.event.payload.groupId;
      if (!groupId) { await c.reply(HELP_TEXT); return; }
      await c.reply(HELP_TEXT);
    },
    children: [
      {
        name: "帮助",
        aliases: ["help"],
        pattern: /^(发言统计\s+帮助|群管\s+排行\s+帮助|排行\s+帮助)$/,
        description: "查看发言统计帮助",
        order: 0,
        handler: async (c: EventContext) => {
          await c.reply(HELP_TEXT);
        },
      },
      {
        name: "我的发言",
        aliases: ["my-stats"],
        pattern: /^(发言统计\s+我的发言|我的发言|排行\s+我的发言)$/,
        description: "查看我的发言统计",
        order: 1,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          const userId = c.event.payload.userId;
          if (!groupId || !userId) { await c.reply("无法获取用户信息"); return; }
          const stats = await statisticsService.getUserStats(groupId, userId);
          const nickname = await getNickname(userId);
          await c.reply(
            `📊 ${nickname} 的发言统计\n` +
            `────────────────\n` +
            `今日: ${stats.today}条\n` +
            `本周: ${stats.week}条\n` +
            `本月: ${stats.month}条\n` +
            `本年: ${stats.year}条\n` +
            `总计: ${stats.all}条\n` +
            `排名: 第${stats.rank}名`
          );
        },
      },
      {
        name: "今日发言",
        aliases: ["today-stats"],
        pattern: /^(发言统计\s+今日发言|今日发言|排行\s+今日发言)$/,
        description: "今日发言排行",
        order: 2,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) return;
          const settings = await statisticsService.getSettings(groupId);
          const rawEntries = await statisticsService.getLeaderboard(groupId, "today");
          const entries = await resolveNicknames(rawEntries);
          await c.reply(formatTextLeaderboard(entries, settings.title, "今日"));
        },
      },
      {
        name: "本周发言",
        aliases: ["week-stats"],
        pattern: /^(发言统计\s+本周发言|本周发言|排行\s+本周发言)$/,
        description: "本周发言排行",
        order: 3,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) return;
          const settings = await statisticsService.getSettings(groupId);
          const rawEntries = await statisticsService.getLeaderboard(groupId, "week");
          const entries = await resolveNicknames(rawEntries);
          await c.reply(formatTextLeaderboard(entries, settings.title, "本周"));
        },
      },
      {
        name: "本月发言",
        aliases: ["month-stats"],
        pattern: /^(发言统计\s+本月发言|本月发言|排行\s+本月发言)$/,
        description: "本月发言排行",
        order: 4,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) return;
          const settings = await statisticsService.getSettings(groupId);
          const rawEntries = await statisticsService.getLeaderboard(groupId, "month");
          const entries = await resolveNicknames(rawEntries);
          await c.reply(formatTextLeaderboard(entries, settings.title, "本月"));
        },
      },
      {
        name: "本年发言",
        aliases: ["year-stats"],
        pattern: /^(发言统计\s+本年发言|本年发言|排行\s+本年发言)$/,
        description: "本年发言排行",
        order: 5,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) return;
          const settings = await statisticsService.getSettings(groupId);
          const rawEntries = await statisticsService.getLeaderboard(groupId, "year");
          const entries = await resolveNicknames(rawEntries);
          await c.reply(formatTextLeaderboard(entries, settings.title, "本年"));
        },
      },
      {
        name: "查发言",
        aliases: ["check-stats"],
        pattern: /^(发言统计\s+查发言|查发言|排行\s+查发言)\s*\[CQ:at/,
        description: "查看某人发言统计",
        order: 6,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) return;
          const text = c.event.payload.text || "";
          const targetQQ = extractMentionedQQ(text);
          if (!targetQQ) { await c.reply("格式: 查发言 @某人"); return; }
          const stats = await statisticsService.getUserStats(groupId, targetQQ);
          const nickname = await getNickname(targetQQ);
          await c.reply(
            `📊 ${nickname} 的发言统计\n` +
            `────────────────\n` +
            `今日: ${stats.today}条\n` +
            `本周: ${stats.week}条\n` +
            `本月: ${stats.month}条\n` +
            `本年: ${stats.year}条\n` +
            `总计: ${stats.all}条\n` +
            `排名: 第${stats.rank}名`
          );
        },
      },
      {
        name: "今日",
        aliases: ["today"],
        pattern: /^(群管\s+排行\s+今日|排行\s+今日)$/,
        description: "今日排行",
        order: 10,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) return;
          const settings = await statisticsService.getSettings(groupId);
          const rawEntries = await statisticsService.getLeaderboard(groupId, "today");
          const entries = await resolveNicknames(rawEntries);
          await c.reply(formatTextLeaderboard(entries, settings.title, "今日"));
        },
      },
      {
        name: "本周",
        aliases: ["week"],
        pattern: /^(群管\s+排行\s+本周|排行\s+本周)$/,
        description: "本周排行",
        order: 11,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) return;
          const settings = await statisticsService.getSettings(groupId);
          const rawEntries = await statisticsService.getLeaderboard(groupId, "week");
          const entries = await resolveNicknames(rawEntries);
          await c.reply(formatTextLeaderboard(entries, settings.title, "本周"));
        },
      },
      {
        name: "本月",
        aliases: ["month"],
        pattern: /^(群管\s+排行\s+本月|排行\s+本月)$/,
        description: "本月排行",
        order: 12,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) return;
          const settings = await statisticsService.getSettings(groupId);
          const rawEntries = await statisticsService.getLeaderboard(groupId, "month");
          const entries = await resolveNicknames(rawEntries);
          await c.reply(formatTextLeaderboard(entries, settings.title, "本月"));
        },
      },
      {
        name: "全部",
        aliases: ["all", "总排行"],
        pattern: /^(群管\s+排行\s+全部|排行\s+全部|排行\s+总排行)$/,
        description: "全部排行",
        order: 13,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) return;
          const settings = await statisticsService.getSettings(groupId);
          const rawEntries = await statisticsService.getLeaderboard(groupId, "all");
          const entries = await resolveNicknames(rawEntries);
          await c.reply(formatTextLeaderboard(entries, settings.title, "全部"));
        },
      },
      {
        name: "图片",
        aliases: ["img", "图"],
        pattern: /^(发言统计\s+图片|群管\s+排行\s+图片|排行\s+图片|排行\s+图)$/,
        description: "今日排行图片",
        order: 14,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) return;
          await sendLeaderboardImage(c, groupId, "today");
        },
      },
      {
        name: "本周图片",
        aliases: ["week-img"],
        pattern: /^(发言统计\s+本周图片|群管\s+排行\s+本周图片|排行\s+本周图片)$/,
        description: "本周排行图片",
        order: 15,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) return;
          await sendLeaderboardImage(c, groupId, "week");
        },
      },
      {
        name: "本月图片",
        aliases: ["month-img"],
        pattern: /^(发言统计\s+本月图片|群管\s+排行\s+本月图片|排行\s+本月图片)$/,
        description: "本月排行图片",
        order: 16,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) return;
          await sendLeaderboardImage(c, groupId, "month");
        },
      },
      {
        name: "统计",
        aliases: ["stats"],
        pattern: /^(发言统计\s+统计|群管\s+排行\s+统计|排行\s+统计)$/,
        description: "详细统计数据",
        order: 17,
        handler: async (c: EventContext) => {
          const groupId = c.event.payload.groupId;
          if (!groupId) return;
          const stats = await statisticsService.getGroupStats(groupId);
          await c.reply(
            `📊 本群发言统计\n` +
            `────────────────\n` +
            `今日: ${stats.totalToday}条 (${stats.uniqueToday}人)\n` +
            `本周: ${stats.totalWeek}条\n` +
            `本月: ${stats.totalMonth}条\n` +
            `本年: ${stats.totalYear}条\n` +
            `总计: ${stats.totalAll}条 (${stats.uniqueAll}人)`
          );
        },
      },
      {
        name: "设置显示",
        aliases: ["set-limit"],
        pattern: /^(群管\s+排行\s+设置显示|排行\s+设置显示|发言统计\s+设置显示)\s*\d+/,
        description: "设置排行榜显示人数",
        order: 18,
        handler: async (c: EventContext) => {
          const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
          if (!ctx) return;
          const text = c.event.payload.text || "";
          const match = text.match(/(?:群管\s+排行\s+|发言统计\s+|排行\s+)?设置显示\s*(\d+)/);
          if (!match) { await c.reply("格式: 排行 设置显示 N"); return; }
          const num = parseInt(match[1], 10);
          if (num < 1 || num > 50) { await c.reply("范围: 1-50"); return; }
          await statisticsService.updateSettings(ctx.groupId, { displayCount: num });
          await c.reply(`排行榜显示人数已设为: ${num}`);
        },
      },
    ],
  };
}

async function sendLeaderboardImage(c: EventContext, groupId: string, range: TimeRange): Promise<void> {
  const available = await isPuppeteerAvailable();
  if (!available) {
    const settings = await statisticsService.getSettings(groupId);
    const rawEntries = await statisticsService.getLeaderboard(groupId, range);
    const entries = await resolveNicknames(rawEntries);
    await c.reply(formatTextLeaderboard(entries, settings.title, RANGE_LABELS[range]));
    return;
  }

  const settings = await statisticsService.getSettings(groupId);
  const rawEntries = await statisticsService.getLeaderboard(groupId, range);
  const entries = await resolveNicknames(rawEntries);
  const stats = await statisticsService.getGroupStats(groupId);

  const totalMap: Record<TimeRange, number> = {
    today: stats.totalToday, week: stats.totalWeek, month: stats.totalMonth, year: stats.totalYear, all: stats.totalAll,
  };

  const html = renderLeaderboardHtml({
    title: settings.title,
    rangeLabel: RANGE_LABELS[range],
    date: new Date().toLocaleString("zh-CN"),
    entries,
    totalMessages: totalMap[range],
  });

  const base64 = await renderHtmlToImage(html);
  if (base64) {
    try {
      const message = [{ type: "image" as const, data: { file: `base64://${base64}` } }];
      await c.sendAction("send_group_msg", { group_id: Number(groupId), message });
      return;
    } catch (err) {
      console.log(`[statistics] send image error:`, err);
    }
  }

  await c.reply(formatTextLeaderboard(entries, settings.title, RANGE_LABELS[range]));
}
