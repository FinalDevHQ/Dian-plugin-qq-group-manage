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

interface CounterState {
  groupId: string;
  lastResetDaily: string;
  lastResetWeekly: string;
  lastResetMonthly: string;
  lastResetYearly: string;
}

const TABLE_SETTINGS = "qgm_statistics_settings";
const TABLE_COUNTER = "qgm_msg_counter";
const TABLE_STATE = "qgm_counter_state";
const DEFAULT_DISPLAY_COUNT = 15;

const DEFAULT_SETTINGS: Omit<StatisticsSettings, "groupId"> = {
  displayCount: DEFAULT_DISPLAY_COUNT,
  title: "本群发言排行榜",
};

// ===== Date Helpers =====

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function mondayStr(): string {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function firstOfMonthStr(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function firstOfYearStr(): string {
  const d = new Date();
  d.setMonth(0, 1);
  return d.toISOString().slice(0, 10);
}

// ===== Service =====

export type TimeRange = "today" | "week" | "month" | "year" | "all";

export class StatisticsService {
  private db: PluginStore | null = null;
  private initialized = false;
  private counterLocks: Map<string, Promise<void>> = new Map();

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
    ]);

    await this.db.createTable(TABLE_STATE, [
      "group_id TEXT NOT NULL",
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

  // ===== Group-Level Reset State =====

  private async getState(groupId: string): Promise<CounterState> {
    const rows = await this.getDb().query(TABLE_STATE, { group_id: groupId });
    if (rows.length === 0) {
      return { groupId, lastResetDaily: "", lastResetWeekly: "", lastResetMonthly: "", lastResetYearly: "" };
    }
    const r = rows[0];
    return {
      groupId,
      lastResetDaily: (r.last_reset_daily as string) || "",
      lastResetWeekly: (r.last_reset_weekly as string) || "",
      lastResetMonthly: (r.last_reset_monthly as string) || "",
      lastResetYearly: (r.last_reset_yearly as string) || "",
    };
  }

  private async saveState(state: CounterState): Promise<void> {
    const db = this.getDb();
    await db.delete(TABLE_STATE, { group_id: state.groupId });
    await db.insert(TABLE_STATE, {
      group_id: state.groupId,
      last_reset_daily: state.lastResetDaily,
      last_reset_weekly: state.lastResetWeekly,
      last_reset_monthly: state.lastResetMonthly,
      last_reset_yearly: state.lastResetYearly,
    });
  }

  /**
   * Check if counters need resetting, and batch-reset all rows if so.
   * Uses group-level state to ensure reset happens only once per period.
   */
  private async resetIfNeeded(groupId: string): Promise<void> {
    const db = this.getDb();
    const state = await this.getState(groupId);
    const today = todayStr();
    const monday = mondayStr();
    const firstMonth = firstOfMonthStr();
    const firstYear = firstOfYearStr();

    let needDaily = state.lastResetDaily !== today;
    let needWeekly = state.lastResetWeekly !== monday;
    let needMonthly = state.lastResetMonthly !== firstMonth;
    let needYearly = state.lastResetYearly !== firstYear;

    if (!needDaily && !needWeekly && !needMonthly && !needYearly) return;

    const allRows = await db.query(TABLE_COUNTER, { group_id: groupId });

    for (const row of allRows) {
      let todayCount = (row.today as number) || 0;
      let weekCount = (row.week as number) || 0;
      let monthCount = (row.month as number) || 0;
      let yearCount = (row.year as number) || 0;
      let yesterday = (row.yesterday as number) || 0;

      if (needDaily) {
        yesterday = todayCount;
        todayCount = 0;
      }
      if (needWeekly) weekCount = 0;
      if (needMonthly) monthCount = 0;
      if (needYearly) yearCount = 0;

      await db.delete(TABLE_COUNTER, { group_id: groupId, user_id: row.user_id as string });
      await db.insert(TABLE_COUNTER, {
        group_id: groupId,
        user_id: row.user_id as string,
        username: row.username || "",
        avatar: row.avatar || "",
        today: todayCount,
        week: weekCount,
        month: monthCount,
        year: yearCount,
        total: (row.total as number) || 0,
        yesterday,
      });
    }

    // Update group state
    await this.saveState({
      groupId,
      lastResetDaily: needDaily ? today : state.lastResetDaily,
      lastResetWeekly: needWeekly ? monday : state.lastResetWeekly,
      lastResetMonthly: needMonthly ? firstMonth : state.lastResetMonthly,
      lastResetYearly: needYearly ? firstYear : state.lastResetYearly,
    });
  }

  // ===== Counter: Increment =====

  async incrementCounter(groupId: string, userId: string): Promise<void> {
    const db = this.getDb();
    const lockKey = `${groupId}:${userId}`;

    // 等待之前的锁完成
    const previousLock = this.counterLocks.get(lockKey);
    if (previousLock) {
      await previousLock;
    }

    // 创建新的锁
    let resolveLock: () => void;
    const newLock = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.counterLocks.set(lockKey, newLock);

    try {
      // Ensure counters are reset if needed before incrementing
      await this.resetIfNeeded(groupId);

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
        });
        return;
      }

      const row = rows[0];
      await db.delete(TABLE_COUNTER, { group_id: groupId, user_id: userId });
      await db.insert(TABLE_COUNTER, {
        group_id: groupId,
        user_id: userId,
        username: row.username || "",
        avatar: row.avatar || `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=640`,
        today: ((row.today as number) || 0) + 1,
        week: ((row.week as number) || 0) + 1,
        month: ((row.month as number) || 0) + 1,
        year: ((row.year as number) || 0) + 1,
        total: ((row.total as number) || 0) + 1,
        yesterday: (row.yesterday as number) || 0,
      });
    } finally {
      resolveLock!();
      this.counterLocks.delete(lockKey);
    }
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

  // ===== Leaderboard =====

  async getLeaderboard(groupId: string, range: TimeRange = "today", limit?: number): Promise<LeaderboardEntry[]> {
    const db = this.getDb();
    const settings = await this.getSettings(groupId);
    const maxEntries = limit ?? settings.displayCount;

    await this.resetIfNeeded(groupId);

    const allRows = await db.query(TABLE_COUNTER, { group_id: groupId });
    const sortField = range === "all" ? "total" : range;

    // 先计算所有用户的总量（用于百分比）
    const allEntries = allRows
      .map((r) => ({
        userId: r.user_id as string,
        nickname: (r.username as string) || "",
        avatar: (r.avatar as string) || `https://q1.qlogo.cn/g?b=qq&nk=${r.user_id}&s=640`,
        count: (r[sortField] as number) || 0,
        percentage: 0,
      }))
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count);

    // 计算全局总数
    const totalCount = allEntries.reduce((sum, e) => sum + e.count, 0);

    // 取前 N 名显示
    const entries = allEntries.slice(0, maxEntries);

    // 使用全局总数计算百分比
    for (const e of entries) {
      e.percentage = totalCount > 0 ? Math.round((e.count / totalCount) * 100) : 0;
    }

    return entries;
  }

  // ===== Group Stats =====

  async getGroupStats(groupId: string): Promise<{ totalToday: number; totalWeek: number; totalMonth: number; totalYear: number; totalAll: number; uniqueToday: number; uniqueAll: number }> {
    const db = this.getDb();
    await this.resetIfNeeded(groupId);

    const allRows = await db.query(TABLE_COUNTER, { group_id: groupId });

    let totalToday = 0, totalWeek = 0, totalMonth = 0, totalYear = 0, totalAll = 0;
    let uniqueToday = 0, uniqueAll = allRows.length;

    for (const row of allRows) {
      const t = (row.today as number) || 0;
      totalToday += t;
      totalWeek += (row.week as number) || 0;
      totalMonth += (row.month as number) || 0;
      totalYear += (row.year as number) || 0;
      totalAll += (row.total as number) || 0;
      if (t > 0) uniqueToday++;
    }

    return { totalToday, totalWeek, totalMonth, totalYear, totalAll, uniqueToday, uniqueAll };
  }

  // ===== User Stats =====

  async getUserStats(groupId: string, userId: string): Promise<{ today: number; week: number; month: number; year: number; all: number; rank: number; yesterday: number }> {
    const db = this.getDb();
    await this.resetIfNeeded(groupId);

    const rows = await db.query(TABLE_COUNTER, { group_id: groupId, user_id: userId });

    if (rows.length === 0) {
      return { today: 0, week: 0, month: 0, year: 0, all: 0, rank: 0, yesterday: 0 };
    }

    const row = rows[0];
    const total = (row.total as number) || 0;

    // Rank: count users with higher total + 1
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
}

export const statisticsService = new StatisticsService();
