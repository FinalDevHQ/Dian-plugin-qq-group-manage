import type { PluginStore } from "@myfinal/plugin-runtime";

export interface MessageLogEntry {
  msgId: string;
  groupId: string;
  userId: string;
  content: string;
  timestamp: number;
}

const TABLE_NAME = "qgm_message_log";
const MAX_LOG_PER_GROUP = 500;

export class MessageLogService {
  private db: PluginStore | null = null;
  private initialized = false;

  async init(store: PluginStore): Promise<void> {
    if (this.initialized) return;
    this.db = store;

    await this.db.createTable(TABLE_NAME, [
      "group_id TEXT NOT NULL",
      "user_id TEXT NOT NULL",
      "msg_id TEXT NOT NULL",
      "content TEXT DEFAULT ''",
      "timestamp INTEGER NOT NULL",
    ]);

    this.initialized = true;
  }

  private getDb(): PluginStore {
    if (!this.db) throw new Error("MessageLog database not initialized");
    return this.db;
  }

  async log(groupId: string, userId: string, msgId: string, content: string): Promise<void> {
    const db = this.getDb();
    await db.insert(TABLE_NAME, {
      group_id: groupId,
      user_id: userId,
      msg_id: msgId,
      content,
      timestamp: Date.now(),
    });

    // Cleanup old entries for this group (keep last MAX_LOG_PER_GROUP)
    const all = await db.query(TABLE_NAME, { group_id: groupId });
    if (all.length > MAX_LOG_PER_GROUP) {
      const toDelete = all
        .sort((a, b) => (a.timestamp as number) - (b.timestamp as number))
        .slice(0, all.length - MAX_LOG_PER_GROUP);
      for (const entry of toDelete) {
        await db.delete(TABLE_NAME, { group_id: entry.group_id, msg_id: entry.msg_id });
      }
    }
  }

  async getRecent(groupId: string, count: number): Promise<MessageLogEntry[]> {
    const rows = await this.getDb().query(TABLE_NAME, { group_id: groupId });
    return rows
      .map((r) => ({
        msgId: r.msg_id as string,
        groupId: r.group_id as string,
        userId: r.user_id as string,
        content: (r.content as string) || "",
        timestamp: r.timestamp as number,
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  async getRecentByUser(groupId: string, userId: string, count: number): Promise<MessageLogEntry[]> {
    const rows = await this.getDb().query(TABLE_NAME, { group_id: groupId, user_id: userId });
    return rows
      .map((r) => ({
        msgId: r.msg_id as string,
        groupId: r.group_id as string,
        userId: r.user_id as string,
        content: (r.content as string) || "",
        timestamp: r.timestamp as number,
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  async deleteByMsgId(groupId: string, msgId: string): Promise<number> {
    return await this.getDb().delete(TABLE_NAME, { group_id: groupId, msg_id: msgId });
  }
}

export const messageLogService = new MessageLogService();
