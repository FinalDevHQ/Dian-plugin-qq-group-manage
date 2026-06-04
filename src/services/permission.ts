import type { PluginStore } from "@myfinal/plugin-runtime";

export enum PermissionLevel {
  NORMAL = 1,
  MODERATOR = 2,
  SUPER_ADMIN = 3,
  ADMIN = 4,
  OWNER = 5,
}

const TABLES = {
  OWNERS: "qgm_owners",
  ADMINS: "qgm_admins",
  SUPER_ADMINS: "qgm_super_admins",
  GROUP_MODERATORS: "qgm_group_moderators",
  GROUP_SETTINGS: "qgm_group_settings",
  REPLY_MODE: "qgm_reply_mode",
  QUOTE_REPLY: "qgm_quote_reply",
  BLACKLIST: "qgm_blacklist",
  WHITELIST: "qgm_whitelist",
  ADMIN_PASSPHRASE: "qgm_admin_passphrase",
};

export interface GroupSettings {
  groupId: string;
  enabled: boolean;
  muted: boolean;
  exclusiveMode: boolean;
  autoBlacklistOnLeave: boolean;
  replyMode: string;
  quoteReply: boolean;
}

export interface BlacklistEntry {
  groupId: string;
  qqId: string;
  reason: string;
  createdAt: number;
}

export interface WhitelistEntry {
  groupId: string;
  qqId: string;
  reason: string;
  createdAt: number;
}

const DEFAULT_SETTINGS: Omit<GroupSettings, "groupId"> = {
  enabled: true,
  muted: false,
  exclusiveMode: false,
  autoBlacklistOnLeave: false,
  replyMode: "text",
  quoteReply: false,
};

export class PermissionService {
  private db: PluginStore | null = null;
  private initialized = false;

  async init(store: PluginStore): Promise<void> {
    if (this.initialized) return;
    this.db = store;

    await this.db.createTable(TABLES.OWNERS, ["qq_id TEXT NOT NULL"]);
    await this.db.createTable(TABLES.ADMINS, ["qq_id TEXT NOT NULL", "nickname TEXT DEFAULT ''"]);
    await this.db.createTable(TABLES.SUPER_ADMINS, ["group_id TEXT NOT NULL", "qq_id TEXT NOT NULL"]);
    await this.db.createTable(TABLES.GROUP_MODERATORS, ["group_id TEXT NOT NULL", "qq_id TEXT NOT NULL", "role TEXT NOT NULL", "synced_at INTEGER NOT NULL"]);
    await this.db.createTable(TABLES.GROUP_SETTINGS, [
      "group_id TEXT NOT NULL",
      "enabled INTEGER NOT NULL DEFAULT 1",
      "muted INTEGER NOT NULL DEFAULT 0",
      "exclusive_mode INTEGER NOT NULL DEFAULT 0",
      "auto_blacklist_on_leave INTEGER NOT NULL DEFAULT 0",
    ]);
    await this.db.createTable(TABLES.REPLY_MODE, [
      "group_id TEXT NOT NULL",
      "mode TEXT NOT NULL DEFAULT 'text'",
    ]);
    await this.db.createTable(TABLES.QUOTE_REPLY, [
      "group_id TEXT NOT NULL",
      "enabled INTEGER NOT NULL DEFAULT 0",
    ]);
    await this.db.createTable(TABLES.BLACKLIST, [
      "group_id TEXT NOT NULL",
      "qq_id TEXT NOT NULL",
      "reason TEXT DEFAULT ''",
    ]);
    await this.db.createTable(TABLES.WHITELIST, [
      "group_id TEXT NOT NULL",
      "qq_id TEXT NOT NULL",
      "reason TEXT DEFAULT ''",
    ]);
    try {
      await this.db.createTable(TABLES.ADMIN_PASSPHRASE, [
        "id INTEGER PRIMARY KEY AUTOINCREMENT",
        "group_id TEXT NOT NULL",
        "passphrase TEXT NOT NULL",
        "status TEXT NOT NULL DEFAULT 'active'",
        "used_by TEXT DEFAULT ''",
        "used_at INTEGER DEFAULT 0",
        "created_at INTEGER NOT NULL",
      ]);
    } catch {}

    this.initialized = true;
  }

  private getDb(): PluginStore {
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }

  async getLevel(qqId: string, groupId?: string): Promise<number> {
    const db = this.getDb();

    const owners = await db.query(TABLES.OWNERS, { qq_id: qqId });
    if (owners.length > 0) return PermissionLevel.OWNER;

    const admins = await db.query(TABLES.ADMINS, { qq_id: qqId });
    if (admins.length > 0) return PermissionLevel.ADMIN;

    if (groupId) {
      const superAdmins = await db.query(TABLES.SUPER_ADMINS, { group_id: groupId, qq_id: qqId });
      if (superAdmins.length > 0) return PermissionLevel.SUPER_ADMIN;

      const moderators = await db.query(TABLES.GROUP_MODERATORS, { group_id: groupId, qq_id: qqId });
      if (moderators.length > 0) return PermissionLevel.MODERATOR;
    }

    return PermissionLevel.NORMAL;
  }

  async check(qqId: string, groupId: string, requiredLevel: number): Promise<boolean> {
    const level = await this.getLevel(qqId, groupId);
    return level >= requiredLevel;
  }

  async getPermissionName(level: number): Promise<string> {
    switch (level) {
      case PermissionLevel.OWNER: return "主人";
      case PermissionLevel.ADMIN: return "小主人";
      case PermissionLevel.SUPER_ADMIN: return "超管";
      case PermissionLevel.MODERATOR: return "群管理";
      default: return "普通";
    }
  }

  async addOwner(qqId: string): Promise<void> {
    await this.getDb().insert(TABLES.OWNERS, { qq_id: qqId });
  }

  async removeOwner(qqId: string): Promise<number> {
    return await this.getDb().delete(TABLES.OWNERS, { qq_id: qqId });
  }

  async getOwners(): Promise<string[]> {
    const rows = await this.getDb().query(TABLES.OWNERS);
    return rows.map((r) => r.qq_id as string);
  }

  async addAdmin(qqId: string, nickname?: string): Promise<void> {
    await this.getDb().insert(TABLES.ADMINS, { qq_id: qqId, nickname: nickname || "" });
  }

  async removeAdmin(qqId: string): Promise<number> {
    return await this.getDb().delete(TABLES.ADMINS, { qq_id: qqId });
  }

  async getAdmins(): Promise<Array<{ qqId: string; nickname: string }>> {
    const rows = await this.getDb().query(TABLES.ADMINS);
    return rows.map((r) => ({ qqId: r.qq_id as string, nickname: r.nickname as string }));
  }

  async addSuperAdmin(groupId: string, qqId: string): Promise<void> {
    await this.getDb().insert(TABLES.SUPER_ADMINS, { group_id: groupId, qq_id: qqId });
  }

  async removeSuperAdmin(groupId: string, qqId: string): Promise<number> {
    return await this.getDb().delete(TABLES.SUPER_ADMINS, { group_id: groupId, qq_id: qqId });
  }

  async getSuperAdmins(groupId: string): Promise<string[]> {
    const rows = await this.getDb().query(TABLES.SUPER_ADMINS, { group_id: groupId });
    return rows.map((r) => r.qq_id as string);
  }

  async syncGroupModerators(groupId: string, members: Array<{ userId: string; role: string }>): Promise<number> {
    const db = this.getDb();

    await db.delete(TABLES.GROUP_MODERATORS, { group_id: groupId });

    let count = 0;
    for (const member of members) {
      if (member.role === "admin" || member.role === "owner") {
        await db.insert(TABLES.GROUP_MODERATORS, {
          group_id: groupId,
          qq_id: member.userId,
          role: member.role,
          synced_at: Date.now(),
        });
        count++;
      }
    }
    return count;
  }

  async getGroupSettings(groupId: string): Promise<GroupSettings> {
    const db = this.getDb();
    try {
      const rows = await db.query(TABLES.GROUP_SETTINGS, { group_id: groupId });

      // Read reply_mode from dedicated table
      let replyMode = "text";
      try {
        const modeRows = await db.query(TABLES.REPLY_MODE, { group_id: groupId });
        if (modeRows.length > 0) replyMode = (modeRows[0].mode as string) || "text";
      } catch {}

      // Read quote_reply from dedicated table
      let quoteReply = false;
      try {
        const quoteRows = await db.query(TABLES.QUOTE_REPLY, { group_id: groupId });
        if (quoteRows.length > 0) quoteReply = Boolean(quoteRows[0].enabled);
      } catch {}

      if (rows.length === 0) {
        return { groupId, ...DEFAULT_SETTINGS, replyMode, quoteReply };
      }

      const row = rows[0];
      return {
        groupId,
        enabled: Boolean(row.enabled),
        muted: Boolean(row.muted),
        exclusiveMode: Boolean(row.exclusive_mode),
        autoBlacklistOnLeave: Boolean(row.auto_blacklist_on_leave),
        replyMode,
        quoteReply,
      };
    } catch {
      return { groupId, ...DEFAULT_SETTINGS };
    }
  }

  async updateGroupSettings(groupId: string, settings: Partial<Omit<GroupSettings, "groupId">>): Promise<void> {
    const db = this.getDb();

    // Handle replyMode separately in dedicated table
    if (settings.replyMode !== undefined) {
      try {
        await db.delete(TABLES.REPLY_MODE, { group_id: groupId });
        await db.insert(TABLES.REPLY_MODE, { group_id: groupId, mode: settings.replyMode });
        console.log(`[updateGroupSettings] reply_mode saved: ${settings.replyMode} for group ${groupId}`);
      } catch (err) {
        console.log(`[updateGroupSettings] reply_mode save error:`, err);
      }
    }

    // Handle quoteReply separately in dedicated table
    if (settings.quoteReply !== undefined) {
      try {
        await db.delete(TABLES.QUOTE_REPLY, { group_id: groupId });
        await db.insert(TABLES.QUOTE_REPLY, { group_id: groupId, enabled: settings.quoteReply ? 1 : 0 });
        console.log(`[updateGroupSettings] quote_reply saved: ${settings.quoteReply} for group ${groupId}`);
      } catch (err) {
        console.log(`[updateGroupSettings] quote_reply save error:`, err);
      }
    }

    // Only update qgm_group_settings if non-replyMode/quoteReply fields are being changed
    const otherKeys = Object.keys(settings).filter(k => k !== "replyMode" && k !== "quoteReply");
    if (otherKeys.length === 0) return;

    let currentSettings = { ...DEFAULT_SETTINGS };
    try {
      const existing = await db.query(TABLES.GROUP_SETTINGS, { group_id: groupId });
      if (existing.length > 0) {
        const row = existing[0];
        currentSettings = {
          enabled: Boolean(row.enabled),
          muted: Boolean(row.muted),
          exclusiveMode: Boolean(row.exclusive_mode),
          autoBlacklistOnLeave: row.auto_blacklist_on_leave !== undefined ? Boolean(row.auto_blacklist_on_leave) : false,
          replyMode: "text",
          quoteReply: false,
        };
        await db.delete(TABLES.GROUP_SETTINGS, { group_id: groupId });
      }
    } catch {
      try { await db.delete(TABLES.GROUP_SETTINGS, { group_id: groupId }); } catch {}
    }

    const newSettings = { ...currentSettings, ...settings };

    await db.insert(TABLES.GROUP_SETTINGS, {
      group_id: groupId,
      enabled: newSettings.enabled ? 1 : 0,
      muted: newSettings.muted ? 1 : 0,
      exclusive_mode: newSettings.exclusiveMode ? 1 : 0,
      auto_blacklist_on_leave: newSettings.autoBlacklistOnLeave ? 1 : 0,
    });
  }

  async isGroupEnabled(groupId: string): Promise<boolean> {
    const settings = await this.getGroupSettings(groupId);
    return settings.enabled;
  }

  async isGroupMuted(groupId: string): Promise<boolean> {
    const settings = await this.getGroupSettings(groupId);
    return settings.muted;
  }

  async isExclusiveMode(groupId: string): Promise<boolean> {
    const settings = await this.getGroupSettings(groupId);
    return settings.exclusiveMode;
  }

  async isAutoBlacklistOnLeave(groupId: string): Promise<boolean> {
    const settings = await this.getGroupSettings(groupId);
    return settings.autoBlacklistOnLeave;
  }

  // Blacklist operations
  async addToBlacklist(groupId: string, qqId: string, reason?: string): Promise<void> {
    await this.getDb().insert(TABLES.BLACKLIST, { group_id: groupId, qq_id: qqId, reason: reason || "" });
  }

  async removeFromBlacklist(groupId: string, qqId: string): Promise<number> {
    return await this.getDb().delete(TABLES.BLACKLIST, { group_id: groupId, qq_id: qqId });
  }

  async isBlacklisted(groupId: string, qqId: string): Promise<boolean> {
    const rows = await this.getDb().query(TABLES.BLACKLIST, { group_id: groupId, qq_id: qqId });
    return rows.length > 0;
  }

  async getBlacklist(groupId: string): Promise<BlacklistEntry[]> {
    const rows = await this.getDb().query(TABLES.BLACKLIST, { group_id: groupId });
    return rows.map((r) => ({
      groupId: r.group_id as string,
      qqId: r.qq_id as string,
      reason: r.reason as string,
      createdAt: 0,
    }));
  }

  // Whitelist operations
  async addToWhitelist(groupId: string, qqId: string, reason?: string): Promise<void> {
    await this.getDb().insert(TABLES.WHITELIST, { group_id: groupId, qq_id: qqId, reason: reason || "" });
  }

  async removeFromWhitelist(groupId: string, qqId: string): Promise<number> {
    return await this.getDb().delete(TABLES.WHITELIST, { group_id: groupId, qq_id: qqId });
  }

  async isWhitelisted(groupId: string, qqId: string): Promise<boolean> {
    const rows = await this.getDb().query(TABLES.WHITELIST, { group_id: groupId, qq_id: qqId });
    return rows.length > 0;
  }

  async getWhitelist(groupId: string): Promise<WhitelistEntry[]> {
    const rows = await this.getDb().query(TABLES.WHITELIST, { group_id: groupId });
    return rows.map((r) => ({
      groupId: r.group_id as string,
      qqId: r.qq_id as string,
      reason: r.reason as string,
      createdAt: 0,
    }));
  }

  // Passphrase operations
  private generatePassphrase(): string {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return `GM-${code}`;
  }

  async createPassphrases(groupId: string, count: number): Promise<string[]> {
    const db = this.getDb();
    const passphrases: string[] = [];
    for (let i = 0; i < count; i++) {
      let pp = this.generatePassphrase();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await db.query(TABLES.ADMIN_PASSPHRASE, { passphrase: pp });
        if (existing.length === 0) break;
        pp = this.generatePassphrase();
        attempts++;
      }
      await db.insert(TABLES.ADMIN_PASSPHRASE, {
        group_id: groupId,
        passphrase: pp,
        status: "active",
        used_by: "",
        used_at: 0,
        created_at: Date.now(),
      });
      passphrases.push(pp);
    }
    return passphrases;
  }

  async usePassphrase(passphrase: string, groupId: string, userId: string): Promise<{ ok: boolean; reason?: string }> {
    const db = this.getDb();
    const rows = await db.query(TABLES.ADMIN_PASSPHRASE, { passphrase: passphrase.toUpperCase() });
    if (rows.length === 0) return { ok: false, reason: "口令不存在" };

    const row = rows[0];
    if (row.status === "used") return { ok: false, reason: "该口令已被使用" };
    if (row.status === "revoked") return { ok: false, reason: "该口令已失效" };

    const targetGroupId = row.group_id as string;
    const effectiveGroupId = targetGroupId === "*" ? groupId : targetGroupId;

    await db.delete(TABLES.ADMIN_PASSPHRASE, { id: row.id });
    await db.insert(TABLES.ADMIN_PASSPHRASE, {
      ...row,
      status: "used",
      used_by: userId,
      used_at: Date.now(),
      group_id: targetGroupId,
    });

    await this.addSuperAdmin(effectiveGroupId, userId);
    return { ok: true };
  }

  async getPassphrases(groupId?: string): Promise<Array<{ id: number; groupId: string; passphrase: string; status: string; usedBy: string; usedAt: number; createdAt: number }>> {
    const db = this.getDb();
    const rows = groupId
      ? await db.query(TABLES.ADMIN_PASSPHRASE, { group_id: groupId })
      : await db.query(TABLES.ADMIN_PASSPHRASE);
    return rows.map((r) => ({
      id: r.id as number,
      groupId: r.group_id as string,
      passphrase: r.passphrase as string,
      status: r.status as string,
      usedBy: r.used_by as string,
      usedAt: r.used_at as number,
      createdAt: r.created_at as number,
    }));
  }

  async revokePassphrase(id: number): Promise<boolean> {
    const db = this.getDb();
    const rows = await db.query(TABLES.ADMIN_PASSPHRASE, { id });
    if (rows.length === 0) return false;
    await db.delete(TABLES.ADMIN_PASSPHRASE, { id });
    await db.insert(TABLES.ADMIN_PASSPHRASE, { ...rows[0], status: "revoked" });
    return true;
  }

  async clearPassphrases(groupId: string): Promise<number> {
    const db = this.getDb();
    const rows = await db.query(TABLES.ADMIN_PASSPHRASE, { group_id: groupId, status: "active" });
    let count = 0;
    for (const row of rows) {
      await db.delete(TABLES.ADMIN_PASSPHRASE, { id: row.id });
      count++;
    }
    return count;
  }
}

export const permService = new PermissionService();
