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

interface CounterRow {
  groupId: string;
  userId: string;
  username: string;
  avatar: string;
  today: number;
  week: number;
  month: number;
  year: number;
  total: number;
  yesterday: number;
  lastResetDaily: string;
  lastResetWeekly: string;
  lastResetMonthly: string;
  lastResetYearly: string;
}

const TABLE_SETTINGS = "qgm_statistics_settings";
const TABLE_COUNTER = "qgm_msg_counter";
const DEFAULT_DISPLAY_COUNT = 15;

const DEFAULT_SETTINGS: Omit<StatisticsSettings, "groupId"> = {
  displayCount: DEFAULT_DISPLAY_COUNT,
  title: "本群发言排行榜",
};

// ===== Date Helpers =====

function dateStr(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function getMonday(ts: number): string {
  const d = new Date(ts);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return dateStr(d.getTime());
}

function getFirstOfMonth(ts: number): string {
  const d = new Date(ts);
  d.setDate(1);
  return dateStr(d.getTime());
}

function getFirstOfYear(ts: number): string {
  const d = new Date(ts);
  d.setMonth(0, 1);
  return dateStr(d.getTime());
}

// ===== Service =====

export type TimeRange = "today" | "week" | "month" | "year" | "all";

export class StatisticsService {
  private db: PluginStore | null = null;
  private initialized = false;

  async init(store: PluginStore): Promise<void> {
    if (this.initialized) return;
    this.db = store;

    await this.db.createTable(TABLE_SETTINGS, [
      "group_id TEXT NOT NULL",
      "display_count INTEGER NOT NULL DEFAULT 15",
      "title TEXT NOT NULL DEFAULT ''",
    ]);

    await this.db.createTable(TABLE_COUNTER, [
      "group_id TEXT NOT NULL",
      "user_id TEXT NOT NULL",
      "username TEXT NOT NULL DEFAULT ''",
      "avatar TEXT NOT NULL DEFAULT ''",
      "today INTEGER NOT NULL DEFAULT 0",
      "week INTEGER NOT NULL DEFAULT 0",
      "month INTEGER NOT NULL DEFAULT 0",
      "year INTEGER NOT NULL DEFAULT 0",
      "total INTEGER NOT NULL DEFAULT 0",
      "yesterday INTEGER NOT NULL DEFAULT 0",
      "last_reset_daily TEXT NOT NULL DEFAULT ''",
      "last_reset_weekly TEXT NOT NULL DEFAULT ''",
      "last_reset_monthly TEXT NOT NULL DEFAULT ''",
      "last_reset_yearly TEXT NOT NULL DEFAULT ''",
    ]);

    this.initialized = true;
  }

  private getDb(): PluginStore {
    if (!this.db) throw new Error("Statistics database not initialized");
    return this.db;
  }

  // ===== Settings =====

  async getSettings(groupId: string): Promise<StatisticsSettings> {
    const rows = await this.getDb().query(TABLE_SETTINGS, { group_id: groupId });
    if (rows.length === 0) return { groupId, ...DEFAULT_SETTINGS };
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
    await db.delete(TABLE_SETTINGS, { group_id: groupId });
    await db.insert(TABLE_SETTINGS, {
      group_id: groupId,
      display_count: merged.displayCount,
      title: merged.title || DEFAULT_SETTINGS.title,
    });
  }

  async getAllGroupsSettings(): Promise<StatisticsSettings[]> {
    const rows = await this.getDb().query(TABLE_SETTINGS);
    return rows.map((r) => ({
      groupId: r.group_id as string,
      displayCount: (r.display_count as number) || DEFAULT_DISPLAY_COUNT,
      title: (r.title as string) || DEFAULT_SETTINGS.title,
    }));
  }

  // ===== Counter: Increment =====

  async incrementCounter(groupId: string, userId: string): Promise<void> {
    const db = this.getDb();
    const rows = await db.query(TABLE_COUNTER, { group_id: groupId, user_id: userId });

    if (rows.length === 0) {
      await db.insert(TABLE_COUNTER, {
        group_id: groupId,
        user_id: userId,
        username: "",
        avatar: `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=640`,
        today: 1,
        week: 1,
        month: 1,
        year: 1,
        total: 1,
        yesterday: 0,
        last_reset_daily: dateStr(Date.now()),
        last_reset_weekly: getMonday(Date.now()),
        last_reset_monthly: getFirstOfMonth(Date.now()),
        last_reset_yearly: getFirstOfYear(Date.now()),
      });
      return;
    }

    const row = rows[0];
    const now = Date.now();
    const today = dateStr(now);
    const monday = getMonday(now);
    const firstOfMonth = getFirstOfMonth(now);
    const firstOfYear = getFirstOfYear(now);

    let todayCount = (row.today as number) || 0;
    let weekCount = (row.week as number) || 0;
    let monthCount = (row.month as number) || 0;
    let yearCount = (row.year as number) || 0;
    let yesterday = (row.yesterday as number) || 0;

    // Daily reset
    if ((row.last_reset_daily as string) !== today) {
      yesterday = todayCount;
      todayCount = 0;
    }

    // Weekly reset
    if ((row.last_reset_weekly as string) !== monday) {
      weekCount = 0;
    }

    // Monthly reset
    if ((row.last_reset_monthly as string) !== firstOfMonth) {
      monthCount = 0;
    }

    // Yearly reset
    if ((row.last_reset_yearly as string) !== firstOfYear) {
      yearCount = 0;
    }

    todayCount++;
    weekCount++;
    monthCount++;
    yearCount++;
    const totalCount = (row.total as number) + 1;

    await db.delete(TABLE_COUNTER, { group_id: groupId, user_id: userId });
    await db.insert(TABLE_COUNTER, {
      group_id: groupId,
      user_id: userId,
      username: row.username || "",
      avatar: row.avatar || `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=640`,
      today: todayCount,
      week: weekCount,
      month: monthCount,
      year: yearCount,
      total: totalCount,
      yesterday,
      last_reset_daily: today,
      last_reset_weekly: monday,
      last_reset_monthly: firstOfMonth,
      last_reset_yearly: firstOfYear,
    });
  }

  // ===== Counter: Update Username Cache =====

  async updateUsername(groupId: string, userId: string, username: string): Promise<void> {
    const db = this.getDb();
    const rows = await db.query(TABLE_COUNTER, { group_id: groupId, user_id: userId });
    if (rows.length === 0) return;
    const row = rows[0];
    if ((row.username as string) !== username) {
      await db.delete(TABLE_COUNTER, { group_id: groupId, user_id: userId });
      await db.insert(TABLE_COUNTER, { ...row, username });
    }
  }

  // ===== Leaderboard (reads from counter table) =====

  async getLeaderboard(groupId: string, range: TimeRange = "today", limit?: number): Promise<LeaderboardEntry[]> {
    const db = this.getDb();
    const settings = await this.getSettings(groupId);
    const maxEntries = limit ?? settings.displayCount;

    // Reset stale counters before reading
    await this.resetStaleCounters(groupId);

    const allRows = await db.query(TABLE_COUNTER, { group_id: groupId });

    const sortField = range === "all" ? "total" : range;
    const entries = allRows
      .map((r) => ({
        userId: r.user_id as string,
        nickname: (r.username as string) || "",
        avatar: (r.avatar as string) || `https://q1.qlogo.cn/g?b=qq&nk=${r.user_id}&s=640`,
        count: (r[sortField] as number) || 0,
        percentage: 0,
      }))
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, maxEntries);

    const totalCount = entries.reduce((sum, e) => sum + e.count, 0);
    for (const e of entries) {
      e.percentage = totalCount > 0 ? Math.round((e.count / totalCount) * 100) : 0;
    }

    return entries;
  }

  // ===== Group Stats (reads from counter table) =====

  async getGroupStats(groupId: string): Promise<{ totalToday: number; totalWeek: number; totalMonth: number; totalYear: number; totalAll: number; uniqueToday: number; uniqueAll: number }> {
    const db = this.getDb();
    await this.resetStaleCounters(groupId);

    const allRows = await db.query(TABLE_COUNTER, { group_id: groupId });

    let totalToday = 0, totalWeek = 0, totalMonth = 0, totalYear = 0, totalAll = 0;
    let uniqueToday = 0, uniqueAll = allRows.length;

    for (const row of allRows) {
      const t = (row.today as number) || 0;
      const w = (row.week as number) || 0;
      const m = (row.month as number) || 0;
      const y = (row.year as number) || 0;
      const a = (row.total as number) || 0;
      totalToday += t;
      totalWeek += w;
      totalMonth += m;
      totalYear += y;
      totalAll += a;
      if (t > 0) uniqueToday++;
    }

    return { totalToday, totalWeek, totalMonth, totalYear, totalAll, uniqueToday, uniqueAll };
  }

  // ===== User Stats (reads from counter table) =====

  async getUserStats(groupId: string, userId: string): Promise<{ today: number; week: number; month: number; year: number; all: number; rank: number; yesterday: number }> {
    const db = this.getDb();
    await this.resetStaleCounters(groupId);

    const rows = await db.query(TABLE_COUNTER, { group_id: groupId, user_id: userId });

    if (rows.length === 0) {
      return { today: 0, week: 0, month: 0, year: 0, all: 0, rank: 0, yesterday: 0 };
    }

    const row = rows[0];
    const total = (row.total as number) || 0;

    // Calculate rank: count how many users have higher total
    const allRows = await db.query(TABLE_COUNTER, { group_id: groupId });
    let rank = 1;
    for (const r of allRows) {
      if ((r.total as number) > total) rank++;
    }

    return {
      today: (row.today as number) || 0,
      week: (row.week as number) || 0,
      month: (row.month as number) || 0,
      year: (row.year as number) || 0,
      all: total,
      rank,
      yesterday: (row.yesterday as number) || 0,
    };
  }

  // ===== Reset Stale Counters =====

  private async resetStaleCounters(groupId: string): Promise<void> {
    const db = this.getDb();
    const now = Date.now();
    const today = dateStr(now);
    const monday = getMonday(now);
    const firstOfMonth = getFirstOfMonth(now);
    const firstOfYear = getFirstOfYear(now);

    const allRows = await db.query(TABLE_COUNTER, { group_id: groupId });

    for (const row of allRows) {
      let todayCount = (row.today as number) || 0;
      let weekCount = (row.week as number) || 0;
      let monthCount = (row.month as number) || 0;
      let yearCount = (row.year as number) || 0;
      let yesterday = (row.yesterday as number) || 0;
      let changed = false;

      if ((row.last_reset_daily as string) !== today) {
        yesterday = todayCount;
        todayCount = 0;
        changed = true;
      }
      if ((row.last_reset_weekly as string) !== monday) {
        weekCount = 0;
        changed = true;
      }
      if ((row.last_reset_monthly as string) !== firstOfMonth) {
        monthCount = 0;
        changed = true;
      }
      if ((row.last_reset_yearly as string) !== firstOfYear) {
        yearCount = 0;
        changed = true;
      }

      if (changed) {
        await db.delete(TABLE_COUNTER, { group_id: groupId, user_id: row.user_id as string });
        await db.insert(TABLE_COUNTER, {
          ...row,
          today: todayCount,
          week: weekCount,
          month: monthCount,
          year: yearCount,
          yesterday,
          last_reset_daily: today,
          last_reset_weekly: monday,
          last_reset_monthly: firstOfMonth,
          last_reset_yearly: firstOfYear,
        });
      }
    }
  }
}

export const statisticsService = new StatisticsService();
