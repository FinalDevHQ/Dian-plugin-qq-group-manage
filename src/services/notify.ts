import type { PluginStore } from "@myfinal/plugin-runtime";

export interface NotifyConfig {
  groupId: string;
  welcomeEnabled: boolean;
  welcomeMsg: string;
  leaveEnabled: boolean;
  leaveMsg: string;
  muteOnJoin: boolean;
  muteDuration: number;
  custom: boolean;
}

export interface NotifyVars {
  username: string;
  groupName: string;
  memberCount: string;
  botName: string;
}

const TABLES = {
  GLOBAL: "qgm_notify_global",
  GROUP: "qgm_notify_group",
};

const GLOBAL_KEY = "default";

const DEFAULT_CONFIG: Omit<NotifyConfig, "groupId" | "custom"> = {
  welcomeEnabled: true,
  welcomeMsg: "{at} 欢迎加入 {group_name}！当前群成员 {member_count} 人",
  leaveEnabled: true,
  leaveMsg: "{username} 离开了我们，当前剩余 {member_count} 人",
  muteOnJoin: false,
  muteDuration: 0,
};

export class NotifyService {
  private db: PluginStore | null = null;
  private initialized = false;

  async init(store: PluginStore): Promise<void> {
    if (this.initialized) return;
    this.db = store;

    await this.db.createTable(TABLES.GLOBAL, [
      "key TEXT NOT NULL",
      "welcome_enabled INTEGER NOT NULL DEFAULT 1",
      "welcome_msg TEXT NOT NULL DEFAULT ''",
      "leave_enabled INTEGER NOT NULL DEFAULT 1",
      "leave_msg TEXT NOT NULL DEFAULT ''",
      "mute_on_join INTEGER NOT NULL DEFAULT 0",
      "mute_duration INTEGER NOT NULL DEFAULT 0",
    ]);

    await this.db.createTable(TABLES.GROUP, [
      "group_id TEXT NOT NULL",
      "welcome_enabled INTEGER NOT NULL DEFAULT 1",
      "welcome_msg TEXT NOT NULL DEFAULT ''",
      "leave_enabled INTEGER NOT NULL DEFAULT 1",
      "leave_msg TEXT NOT NULL DEFAULT ''",
      "mute_on_join INTEGER NOT NULL DEFAULT 0",
      "mute_duration INTEGER NOT NULL DEFAULT 0",
      "custom INTEGER NOT NULL DEFAULT 0",
    ]);

    this.initialized = true;
  }

  private getDb(): PluginStore {
    if (!this.db) throw new Error("Notify database not initialized");
    return this.db;
  }

  // ===== Global Config =====
  async getGlobalConfig(): Promise<NotifyConfig> {
    const db = this.getDb();
    const rows = await db.query(TABLES.GLOBAL, { key: GLOBAL_KEY });

    if (rows.length === 0) {
      return { groupId: "global", ...DEFAULT_CONFIG, custom: false };
    }

    const row = rows[0];
    return {
      groupId: "global",
      welcomeEnabled: Boolean(row.welcome_enabled),
      welcomeMsg: (row.welcome_msg as string) || DEFAULT_CONFIG.welcomeMsg,
      leaveEnabled: Boolean(row.leave_enabled),
      leaveMsg: (row.leave_msg as string) || DEFAULT_CONFIG.leaveMsg,
      muteOnJoin: Boolean(row.mute_on_join),
      muteDuration: (row.mute_duration as number) || 0,
      custom: false,
    };
  }

  async updateGlobalConfig(updates: Partial<Omit<NotifyConfig, "groupId" | "custom">>): Promise<void> {
    const db = this.getDb();
    const current = await this.getGlobalConfig();
    const merged = { ...current, ...updates };

    await db.delete(TABLES.GLOBAL, { key: GLOBAL_KEY });
    await db.insert(TABLES.GLOBAL, {
      key: GLOBAL_KEY,
      welcome_enabled: merged.welcomeEnabled ? 1 : 0,
      welcome_msg: merged.welcomeMsg,
      leave_enabled: merged.leaveEnabled ? 1 : 0,
      leave_msg: merged.leaveMsg,
      mute_on_join: merged.muteOnJoin ? 1 : 0,
      mute_duration: merged.muteDuration,
    });
  }

  // ===== Group Config =====
  async getGroupConfig(groupId: string): Promise<NotifyConfig> {
    const db = this.getDb();
    const rows = await db.query(TABLES.GROUP, { group_id: groupId });

    if (rows.length === 0) {
      return { groupId, ...DEFAULT_CONFIG, custom: false };
    }

    const row = rows[0];
    return {
      groupId,
      welcomeEnabled: Boolean(row.welcome_enabled),
      welcomeMsg: (row.welcome_msg as string) || DEFAULT_CONFIG.welcomeMsg,
      leaveEnabled: Boolean(row.leave_enabled),
      leaveMsg: (row.leave_msg as string) || DEFAULT_CONFIG.leaveMsg,
      muteOnJoin: Boolean(row.mute_on_join),
      muteDuration: (row.mute_duration as number) || 0,
      custom: Boolean(row.custom),
    };
  }

  async updateGroupConfig(groupId: string, updates: Partial<Omit<NotifyConfig, "groupId" | "custom">>): Promise<void> {
    const db = this.getDb();
    const current = await this.getGroupConfig(groupId);
    const merged = { ...current, ...updates, custom: true };

    await db.delete(TABLES.GROUP, { group_id: groupId });
    await db.insert(TABLES.GROUP, {
      group_id: groupId,
      welcome_enabled: merged.welcomeEnabled ? 1 : 0,
      welcome_msg: merged.welcomeMsg,
      leave_enabled: merged.leaveEnabled ? 1 : 0,
      leave_msg: merged.leaveMsg,
      mute_on_join: merged.muteOnJoin ? 1 : 0,
      mute_duration: merged.muteDuration,
      custom: 1,
    });
  }

  async resetGroupConfig(groupId: string): Promise<void> {
    const db = this.getDb();
    await db.delete(TABLES.GROUP, { group_id: groupId });
  }

  // ===== Effective Config (group overrides global) =====
  async getEffectiveConfig(groupId: string): Promise<NotifyConfig> {
    const groupConfig = await this.getGroupConfig(groupId);

    if (groupConfig.custom) {
      return groupConfig;
    }

    const globalConfig = await this.getGlobalConfig();
    return {
      groupId,
      welcomeEnabled: globalConfig.welcomeEnabled,
      welcomeMsg: globalConfig.welcomeMsg,
      leaveEnabled: globalConfig.leaveEnabled,
      leaveMsg: globalConfig.leaveMsg,
      muteOnJoin: globalConfig.muteOnJoin,
      muteDuration: globalConfig.muteDuration,
      custom: false,
    };
  }

  // ===== Variable Replacement =====
  replaceVars(template: string, vars: Partial<NotifyVars>): string {
    let result = template;
    if (vars.username) result = result.replace(/\{username\}/g, vars.username);
    if (vars.groupName) result = result.replace(/\{group_name\}/g, vars.groupName);
    if (vars.memberCount) result = result.replace(/\{member_count\}/g, vars.memberCount);
    if (vars.botName) result = result.replace(/\{bot_name\}/g, vars.botName);
    return result;
  }

  // ===== Helpers for WebUI =====
  async getAllGroupConfigs(): Promise<NotifyConfig[]> {
    const db = this.getDb();
    const rows = await db.query(TABLES.GROUP);
    return rows.map((r) => ({
      groupId: r.group_id as string,
      welcomeEnabled: Boolean(r.welcome_enabled),
      welcomeMsg: (r.welcome_msg as string) || DEFAULT_CONFIG.welcomeMsg,
      leaveEnabled: Boolean(r.leave_enabled),
      leaveMsg: (r.leave_msg as string) || DEFAULT_CONFIG.leaveMsg,
      muteOnJoin: Boolean(r.mute_on_join),
      muteDuration: (r.mute_duration as number) || 0,
      custom: Boolean(r.custom),
    }));
  }
}

export const notifyService = new NotifyService();
