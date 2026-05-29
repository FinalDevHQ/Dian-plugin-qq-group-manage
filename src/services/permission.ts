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
};

export interface GroupSettings {
  groupId: string;
  enabled: boolean;
  muted: boolean;
  exclusiveMode: boolean;
}

const DEFAULT_SETTINGS: Omit<GroupSettings, "groupId"> = {
  enabled: true,
  muted: false,
  exclusiveMode: false,
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
    ]);

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
    const rows = await db.query(TABLES.GROUP_SETTINGS, { group_id: groupId });

    if (rows.length === 0) {
      return { groupId, ...DEFAULT_SETTINGS };
    }

    const row = rows[0];
    return {
      groupId,
      enabled: Boolean(row.enabled),
      muted: Boolean(row.muted),
      exclusiveMode: Boolean(row.exclusive_mode),
    };
  }

  async updateGroupSettings(groupId: string, settings: Partial<Omit<GroupSettings, "groupId">>): Promise<void> {
    const db = this.getDb();
    const existing = await db.query(TABLES.GROUP_SETTINGS, { group_id: groupId });

    if (existing.length === 0) {
      await db.insert(TABLES.GROUP_SETTINGS, {
        group_id: groupId,
        enabled: settings.enabled !== undefined ? (settings.enabled ? 1 : 0) : DEFAULT_SETTINGS.enabled ? 1 : 0,
        muted: settings.muted !== undefined ? (settings.muted ? 1 : 0) : DEFAULT_SETTINGS.muted ? 1 : 0,
        exclusive_mode: settings.exclusiveMode !== undefined ? (settings.exclusiveMode ? 1 : 0) : DEFAULT_SETTINGS.exclusiveMode ? 1 : 0,
      });
    } else {
      const updateData: Record<string, unknown> = {};
      if (settings.enabled !== undefined) updateData.enabled = settings.enabled ? 1 : 0;
      if (settings.muted !== undefined) updateData.muted = settings.muted ? 1 : 0;
      if (settings.exclusiveMode !== undefined) updateData.exclusive_mode = settings.exclusiveMode ? 1 : 0;

      if (Object.keys(updateData).length > 0) {
        await db.delete(TABLES.GROUP_SETTINGS, { group_id: groupId });
        await db.insert(TABLES.GROUP_SETTINGS, {
          group_id: groupId,
          enabled: (settings.enabled !== undefined ? settings.enabled : existing[0].enabled) ? 1 : 0,
          muted: (settings.muted !== undefined ? settings.muted : existing[0].muted) ? 1 : 0,
          exclusive_mode: (settings.exclusiveMode !== undefined ? settings.exclusiveMode : existing[0].exclusive_mode) ? 1 : 0,
        });
      }
    }
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
}

export const permService = new PermissionService();
