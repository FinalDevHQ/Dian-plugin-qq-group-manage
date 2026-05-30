import type { PluginStore } from "@myfinal/plugin-runtime";
import { pluginState } from "./state.js";

const TABLES = {
  SETTINGS: "qgm_card_settings",
  ORIGINAL: "qgm_card_original",
};

export interface CardSettings {
  groupId: string;
  enabled: boolean;
  renameNotify: boolean;
  lockCard: boolean;
  prefix: string;
}

const DEFAULT_SETTINGS: Omit<CardSettings, "groupId"> = {
  enabled: false,
  renameNotify: false,
  lockCard: false,
  prefix: "",
};

export class CardService {
  private db: PluginStore | null = null;
  private initialized = false;

  async init(store: PluginStore): Promise<void> {
    if (this.initialized) return;
    this.db = store;

    await this.db.createTable(TABLES.SETTINGS, [
      "group_id TEXT NOT NULL",
      "enabled INTEGER NOT NULL DEFAULT 0",
      "rename_notify INTEGER NOT NULL DEFAULT 0",
      "lock_card INTEGER NOT NULL DEFAULT 0",
      "prefix TEXT DEFAULT ''",
    ]);
    await this.db.createTable(TABLES.ORIGINAL, [
      "group_id TEXT NOT NULL",
      "qq_id TEXT NOT NULL",
      "original_card TEXT DEFAULT ''",
    ]);

    this.initialized = true;
  }

  private getDb(): PluginStore {
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }

  async getSettings(groupId: string): Promise<CardSettings> {
    try {
      const rows = await this.getDb().query(TABLES.SETTINGS, { group_id: groupId });
      if (rows.length === 0) return { groupId, ...DEFAULT_SETTINGS };
      const row = rows[0];
      return {
        groupId,
        enabled: Boolean(row.enabled),
        renameNotify: Boolean(row.rename_notify),
        lockCard: Boolean(row.lock_card),
        prefix: (row.prefix as string) || "",
      };
    } catch {
      return { groupId, ...DEFAULT_SETTINGS };
    }
  }

  async updateSettings(groupId: string, settings: Partial<Omit<CardSettings, "groupId">>): Promise<void> {
    const db = this.getDb();
    let current = await this.getSettings(groupId);
    await db.delete(TABLES.SETTINGS, { group_id: groupId });
    current = { ...current, ...settings };
    await db.insert(TABLES.SETTINGS, {
      group_id: groupId,
      enabled: current.enabled ? 1 : 0,
      rename_notify: current.renameNotify ? 1 : 0,
      lock_card: current.lockCard ? 1 : 0,
      prefix: current.prefix,
    });
  }

  async isEnabled(groupId: string): Promise<boolean> {
    const s = await this.getSettings(groupId);
    return s.enabled;
  }

  async isRenameNotify(groupId: string): Promise<boolean> {
    const s = await this.getSettings(groupId);
    return s.enabled && s.renameNotify;
  }

  async isLockCard(groupId: string): Promise<boolean> {
    const s = await this.getSettings(groupId);
    return s.enabled && s.lockCard;
  }

  async getPrefix(groupId: string): Promise<string> {
    const s = await this.getSettings(groupId);
    return s.prefix;
  }

  async saveOriginalCard(groupId: string, qqId: string, card: string): Promise<void> {
    const db = this.getDb();
    try {
      await db.delete(TABLES.ORIGINAL, { group_id: groupId, qq_id: qqId });
    } catch {}
    await db.insert(TABLES.ORIGINAL, {
      group_id: groupId,
      qq_id: qqId,
      original_card: card,
    });
  }

  async getOriginalCard(groupId: string, qqId: string): Promise<string | null> {
    try {
      const rows = await this.getDb().query(TABLES.ORIGINAL, { group_id: groupId, qq_id: qqId });
      if (rows.length === 0) return null;
      return (rows[0].original_card as string) || null;
    } catch {
      return null;
    }
  }

  async removeOriginalCard(groupId: string, qqId: string): Promise<void> {
    try {
      await this.getDb().delete(TABLES.ORIGINAL, { group_id: groupId, qq_id: qqId });
    } catch {}
  }

  async restoreCard(groupId: string, qqId: string): Promise<boolean> {
    const original = await this.getOriginalCard(groupId, qqId);
    if (original === null) return false;
    try {
      await pluginState.sendAction("set_group_card", {
        group_id: Number(groupId),
        user_id: Number(qqId),
        card: original,
      });
      return true;
    } catch {
      return false;
    }
  }

  async applyPrefix(groupId: string, qqId: string, currentCard: string, prefix: string): Promise<string> {
    const newCard = prefix + currentCard;
    try {
      await pluginState.sendAction("set_group_card", {
        group_id: Number(groupId),
        user_id: Number(qqId),
        card: newCard,
      });
      await this.saveOriginalCard(groupId, qqId, currentCard);
      return newCard;
    } catch {
      return currentCard;
    }
  }

  async setCard(groupId: string, qqId: string, card: string): Promise<boolean> {
    try {
      await pluginState.sendAction("set_group_card", {
        group_id: Number(groupId),
        user_id: Number(qqId),
        card,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const cardService = new CardService();
