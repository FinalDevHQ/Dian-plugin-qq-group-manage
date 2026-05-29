import type { PluginStore } from "@myfinal/plugin-runtime";

export enum AdPunishment {
  RECALL = "recall",
  RECALL_MUTE = "recall_mute",
  RECALL_KICK = "recall_kick",
}

export interface AdKeyword {
  groupId: string;
  keyword: string;
  punishment: AdPunishment;
  createdAt: number;
}

export interface AdSettings {
  groupId: string;
  enabled: boolean;
  maxLines: number;
  maxChars: number;
  defaultPunishment: AdPunishment;
  muteDuration: number;
}

export interface AdCheckResult {
  hit: boolean;
  keyword?: string;
  punishment?: AdPunishment;
  muteDuration?: number;
}

const TABLES = {
  KEYWORDS: "qgm_ad_keywords",
  SETTINGS: "qgm_ad_settings",
};

const GLOBAL_GROUP_ID = "global";

const DEFAULT_AD_SETTINGS: Omit<AdSettings, "groupId"> = {
  enabled: false,
  maxLines: 0,
  maxChars: 0,
  defaultPunishment: AdPunishment.RECALL,
  muteDuration: 600,
};

export class AdKillerService {
  private db: PluginStore | null = null;
  private initialized = false;

  async init(store: PluginStore): Promise<void> {
    if (this.initialized) return;
    this.db = store;

    await this.db.createTable(TABLES.KEYWORDS, [
      "group_id TEXT NOT NULL",
      "keyword TEXT NOT NULL",
      "punishment TEXT NOT NULL DEFAULT 'recall'",
    ]);
    await this.db.createTable(TABLES.SETTINGS, [
      "group_id TEXT NOT NULL",
      "enabled INTEGER NOT NULL DEFAULT 0",
      "max_lines INTEGER NOT NULL DEFAULT 0",
      "max_chars INTEGER NOT NULL DEFAULT 0",
      "default_punishment TEXT NOT NULL DEFAULT 'recall'",
      "mute_duration INTEGER NOT NULL DEFAULT 600",
    ]);

    this.initialized = true;
  }

  private getDb(): PluginStore {
    if (!this.db) throw new Error("AdKiller database not initialized");
    return this.db;
  }

  // ===== Settings =====
  async getSettings(groupId: string): Promise<AdSettings> {
    const db = this.getDb();
    const rows = await db.query(TABLES.SETTINGS, { group_id: groupId });

    if (rows.length === 0) {
      return { groupId, ...DEFAULT_AD_SETTINGS };
    }

    const row = rows[0];
    return {
      groupId,
      enabled: Boolean(row.enabled),
      maxLines: (row.max_lines as number) ?? 0,
      maxChars: (row.max_chars as number) ?? 0,
      defaultPunishment: ((row.default_punishment as string) || "recall") as AdPunishment,
      muteDuration: (row.mute_duration as number) || 600,
    };
  }

  async updateSettings(groupId: string, settings: Partial<Omit<AdSettings, "groupId">>): Promise<void> {
    const db = this.getDb();

    let current = { ...DEFAULT_AD_SETTINGS };
    try {
      const existing = await db.query(TABLES.SETTINGS, { group_id: groupId });
      if (existing.length > 0) {
        const row = existing[0];
        current = {
          enabled: Boolean(row.enabled),
          maxLines: (row.max_lines as number) ?? 0,
          maxChars: (row.max_chars as number) ?? 0,
          defaultPunishment: ((row.default_punishment as string) || "recall") as AdPunishment,
          muteDuration: (row.mute_duration as number) || 600,
        };
        await db.delete(TABLES.SETTINGS, { group_id: groupId });
      }
    } catch {
      // Table might have old schema without mute_duration, delete and recreate
      try {
        await db.delete(TABLES.SETTINGS, { group_id: groupId });
      } catch {}
    }

    const merged = { ...current, ...settings };

    await db.insert(TABLES.SETTINGS, {
      group_id: groupId,
      enabled: merged.enabled ? 1 : 0,
      max_lines: merged.maxLines,
      max_chars: merged.maxChars,
      default_punishment: merged.defaultPunishment,
      mute_duration: merged.muteDuration,
    });
  }

  async isEnabled(groupId: string): Promise<boolean> {
    const settings = await this.getSettings(groupId);
    return settings.enabled;
  }

  // ===== Keywords (group-specific) =====
  async addKeyword(groupId: string, keyword: string, punishment: AdPunishment): Promise<void> {
    await this.getDb().insert(TABLES.KEYWORDS, {
      group_id: groupId,
      keyword,
      punishment,
    });
  }

  async removeKeyword(groupId: string, keyword: string): Promise<number> {
    return await this.getDb().delete(TABLES.KEYWORDS, { group_id: groupId, keyword });
  }

  async clearKeywords(groupId: string): Promise<number> {
    return await this.getDb().delete(TABLES.KEYWORDS, { group_id: groupId });
  }

  async getKeywords(groupId: string): Promise<AdKeyword[]> {
    const rows = await this.getDb().query(TABLES.KEYWORDS, { group_id: groupId });
    return rows.map((r) => ({
      groupId: r.group_id as string,
      keyword: r.keyword as string,
      punishment: (r.punishment as string) as AdPunishment,
      createdAt: 0,
    }));
  }

  // ===== Global Keywords =====
  async addGlobalKeyword(keyword: string, punishment: AdPunishment): Promise<void> {
    await this.addKeyword(GLOBAL_GROUP_ID, keyword, punishment);
  }

  async removeGlobalKeyword(keyword: string): Promise<number> {
    return await this.removeKeyword(GLOBAL_GROUP_ID, keyword);
  }

  async clearGlobalKeywords(): Promise<number> {
    return await this.clearKeywords(GLOBAL_GROUP_ID);
  }

  async getGlobalKeywords(): Promise<AdKeyword[]> {
    return this.getKeywords(GLOBAL_GROUP_ID);
  }

  // ===== Global Settings =====
  async getGlobalSettings(): Promise<AdSettings> {
    return this.getSettings(GLOBAL_GROUP_ID);
  }

  async updateGlobalSettings(settings: Partial<Omit<AdSettings, "groupId">>): Promise<void> {
    return this.updateSettings(GLOBAL_GROUP_ID, settings);
  }

  // ===== Check Message (merges global + group keywords) =====
  async checkMessage(groupId: string, text: string): Promise<AdCheckResult> {
    const settings = await this.getSettings(groupId);
    const globalSettings = await this.getGlobalSettings();

    // Check max lines (group setting takes priority)
    const maxLines = settings.maxLines || globalSettings.maxLines;
    if (maxLines > 0) {
      const lineCount = text.split(/\r?\n/).length;
      if (lineCount > maxLines) {
        return { hit: true, keyword: `超过${maxLines}行`, punishment: settings.defaultPunishment || globalSettings.defaultPunishment, muteDuration: settings.muteDuration || globalSettings.muteDuration };
      }
    }

    // Check max chars (group setting takes priority)
    const maxChars = settings.maxChars || globalSettings.maxChars;
    if (maxChars > 0) {
      if (text.length > maxChars) {
        return { hit: true, keyword: `超过${maxChars}字`, punishment: settings.defaultPunishment || globalSettings.defaultPunishment, muteDuration: settings.muteDuration || globalSettings.muteDuration };
      }
    }

    // Check group keywords first, then global keywords
    const groupKeywords = await this.getKeywords(groupId);
    const globalKeywords = await this.getGlobalKeywords();
    const allKeywords = [...groupKeywords, ...globalKeywords];

    for (const kw of allKeywords) {
      if (text.includes(kw.keyword)) {
        return { hit: true, keyword: kw.keyword, punishment: kw.punishment, muteDuration: settings.muteDuration || globalSettings.muteDuration };
      }
    }

    return { hit: false };
  }

  // ===== WebUI helpers =====
  async getAllGroupsSettings(): Promise<AdSettings[]> {
    const db = this.getDb();
    const rows = await db.query(TABLES.SETTINGS);
    return rows.map((r) => ({
      groupId: r.group_id as string,
      enabled: Boolean(r.enabled),
      maxLines: r.max_lines as number,
      maxChars: r.max_chars as number,
      defaultPunishment: (r.default_punishment as string) as AdPunishment,
      muteDuration: (r.mute_duration as number) || 600,
    }));
  }

  async getAllKeywords(): Promise<AdKeyword[]> {
    const db = this.getDb();
    const rows = await db.query(TABLES.KEYWORDS);
    return rows.map((r) => ({
      groupId: r.group_id as string,
      keyword: r.keyword as string,
      punishment: (r.punishment as string) as AdPunishment,
      createdAt: 0,
    }));
  }
}

export const adKillerService = new AdKillerService();
