import type { PluginSetupContext } from "@myfinal/plugin-runtime";
import { statisticsService, type TimeRange, type LeaderboardEntry } from "../services/statistics.js";
import { pluginState } from "../services/state.js";

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

export function registerStatisticsRoutes(ctx: PluginSetupContext): void {
  // GET /statistics/settings?groupId=xxx
  ctx.route("GET", "/statistics/settings", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await statisticsService.init(store as any);
    const query = req.query as { groupId?: string };
    try {
      const settings = await statisticsService.getSettings(query.groupId || "global");
      reply.send({ ok: true, settings });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `获取失败: ${err}` });
    }
  });

  // PUT /statistics/settings
  ctx.route("PUT", "/statistics/settings", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await statisticsService.init(store as any);
    const body = req.body as { groupId?: string; displayCount?: number; title?: string };
    try {
      const groupId = body.groupId || "global";
      const updates: Record<string, unknown> = {};
      if (typeof body.displayCount === "number" && body.displayCount > 0) updates.displayCount = body.displayCount;
      if (typeof body.title === "string") updates.title = body.title;
      if (Object.keys(updates).length === 0) {
        reply.status(400).send({ ok: false, message: "没有有效的更新字段" });
        return;
      }
      await statisticsService.updateSettings(groupId, updates as any);
      const settings = await statisticsService.getSettings(groupId);
      reply.send({ ok: true, settings, message: "设置已更新" });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `更新失败: ${err}` });
    }
  });

  // GET /statistics/leaderboard?groupId=xxx&range=today&limit=15
  ctx.route("GET", "/statistics/leaderboard", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await statisticsService.init(store as any);
    const query = req.query as { groupId?: string; range?: string; limit?: string };
    try {
      const groupId = query.groupId || "global";
      const range = (query.range || "today") as TimeRange;
      const limit = query.limit ? parseInt(query.limit) : undefined;
      const entries = await statisticsService.getLeaderboard(groupId, range, limit);
      const enriched = await resolveNicknames(entries);
      reply.send({ ok: true, entries: enriched });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `获取失败: ${err}` });
    }
  });

  // GET /statistics/stats?groupId=xxx
  ctx.route("GET", "/statistics/stats", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await statisticsService.init(store as any);
    const query = req.query as { groupId?: string };
    try {
      const stats = await statisticsService.getGroupStats(query.groupId || "global");
      reply.send({ ok: true, stats });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `获取失败: ${err}` });
    }
  });

  // GET /statistics/all-settings
  ctx.route("GET", "/statistics/all-settings", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await statisticsService.init(store as any);
    try {
      const settings = await statisticsService.getAllGroupsSettings();
      reply.send({ ok: true, settings });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `获取失败: ${err}` });
    }
  });
}
