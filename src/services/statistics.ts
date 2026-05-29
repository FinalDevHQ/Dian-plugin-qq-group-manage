import type { PluginStore } from "@myfinal/plugin-runtime";

export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  avatar: string;
  count: number;
  percentage: number;
}

export interface StatisticsSettings {
  groupId: string;
  displayCount: number;
  title: string;
}

const TABLE_NAME = "qgm_statistics_settings";
const MESSAGE_LOG = "qgm_message_log";
const DEFAULT_DISPLAY_COUNT = 15;

const DEFAULT_SETTINGS: Omit<StatisticsSettings, "groupId"> = {
  displayCount: DEFAULT_DISPLAY_COUNT,
  title: "本群发言排行榜",
};

function getStartOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getStartOfWeek(ts: number): number {
  const d = new Date(ts);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getStartOfMonth(ts: number): number {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getStartOfYear(ts: number): number {
  const d = new Date(ts);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type TimeRange = "today" | "week" | "month" | "year" | "all";

function getRangeStart(range: TimeRange, now: number): number {
  switch (range) {
    case "today": return getStartOfDay(now);
    case "week": return getStartOfWeek(now);
    case "month": return getStartOfMonth(now);
    case "year": return getStartOfYear(now);
    case "all": return 0;
  }
}

export class StatisticsService {
  private db: PluginStore | null = null;
  private initialized = false;

  async init(store: PluginStore): Promise<void> {
    if (this.initialized) return;
    this.db = store;

    await this.db.createTable(TABLE_NAME, [
      "group_id TEXT NOT NULL",
      "display_count INTEGER NOT NULL DEFAULT 15",
      "title TEXT NOT NULL DEFAULT ''",
    ]);

    this.initialized = true;
  }

  private getDb(): PluginStore {
    if (!this.db) throw new Error("Statistics database not initialized");
    return this.db;
  }

  // ===== Settings =====
  async getSettings(groupId: string): Promise<StatisticsSettings> {
    const rows = await this.getDb().query(TABLE_NAME, { group_id: groupId });
    if (rows.length === 0) {
      return { groupId, ...DEFAULT_SETTINGS };
    }
    const row = rows[0];
    return {
      groupId,
      displayCount: (row.display_count as number) || DEFAULT_DISPLAY_COUNT,
      title: (row.title as string) || DEFAULT_SETTINGS.title,
    };
  }

  async updateSettings(groupId: string, updates: Partial<Omit<StatisticsSettings, "groupId">>): Promise<void> {
    const db = this.getDb();
    const current = await this.getSettings(groupId);
    const merged = { ...current, ...updates };

    await db.delete(TABLE_NAME, { group_id: groupId });
    await db.insert(TABLE_NAME, {
      group_id: groupId,
      display_count: merged.displayCount,
      title: merged.title || DEFAULT_SETTINGS.title,
    });
  }

  // ===== Statistics =====
  async getLeaderboard(groupId: string, range: TimeRange = "today", limit?: number): Promise<LeaderboardEntry[]> {
    const db = this.getDb();
    const settings = await this.getSettings(groupId);
    const maxEntries = limit ?? settings.displayCount;

    const allRows = await db.query(MESSAGE_LOG, { group_id: groupId });
    const cutoff = getRangeStart(range, Date.now());

    const countMap: Record<string, number> = {};
    for (const row of allRows) {
      const ts = row.timestamp as number;
      if (ts < cutoff) continue;
      const uid = row.user_id as string;
      countMap[uid] = (countMap[uid] || 0) + 1;
    }

    const sorted = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxEntries);

    const totalCount = sorted.reduce((sum, [, c]) => sum + c, 0);

    return sorted.map(([userId, count]) => ({
      userId,
      nickname: "",
      avatar: `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=640`,
      count,
      percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
    }));
  }

  async getGroupStats(groupId: string): Promise<{ totalToday: number; totalWeek: number; totalMonth: number; totalYear: number; totalAll: number; uniqueToday: number; uniqueAll: number }> {
    const db = this.getDb();
    const now = Date.now();
    const allRows = await db.query(MESSAGE_LOG, { group_id: groupId });

    let totalToday = 0, totalWeek = 0, totalMonth = 0, totalYear = 0, totalAll = allRows.length;
    const todayUsers = new Set<string>();
    const allUsers = new Set<string>();

    for (const row of allRows) {
      const ts = row.timestamp as number;
      const uid = row.user_id as string;
      allUsers.add(uid);
      if (ts >= getStartOfDay(now)) { totalToday++; todayUsers.add(uid); }
      if (ts >= getStartOfWeek(now)) totalWeek++;
      if (ts >= getStartOfMonth(now)) totalMonth++;
      if (ts >= getStartOfYear(now)) totalYear++;
    }

    return {
      totalToday, totalWeek, totalMonth, totalYear, totalAll,
      uniqueToday: todayUsers.size, uniqueAll: allUsers.size,
    };
  }

  async getAllGroupsSettings(): Promise<StatisticsSettings[]> {
    const db = this.getDb();
    const rows = await db.query(TABLE_NAME);
    return rows.map((r) => ({
      groupId: r.group_id as string,
      displayCount: (r.display_count as number) || DEFAULT_DISPLAY_COUNT,
      title: (r.title as string) || DEFAULT_SETTINGS.title,
    }));
  }

  async getUserStats(groupId: string, userId: string): Promise<{ today: number; week: number; month: number; year: number; all: number; rank: number }> {
    const db = this.getDb();
    const now = Date.now();
    const allRows = await db.query(MESSAGE_LOG, { group_id: groupId, user_id: userId });

    let today = 0, week = 0, month = 0, year = 0, all = allRows.length;
    for (const row of allRows) {
      const ts = row.timestamp as number;
      if (ts >= getStartOfDay(now)) today++;
      if (ts >= getStartOfWeek(now)) week++;
      if (ts >= getStartOfMonth(now)) month++;
      if (ts >= getStartOfYear(now)) year++;
    }

    // Calculate rank by all-time count
    const groupRows = await db.query(MESSAGE_LOG, { group_id: groupId });
    const countMap: Record<string, number> = {};
    for (const row of groupRows) {
      const uid = row.user_id as string;
      countMap[uid] = (countMap[uid] || 0) + 1;
    }
    const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]);
    const rank = sorted.findIndex(([uid]) => uid === userId) + 1;

    return { today, week, month, year, all, rank };
  }
}

export const statisticsService = new StatisticsService();
