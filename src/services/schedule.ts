import type { PluginStore } from "@myfinal/plugin-runtime";
import { pluginState } from "./state.js";

const TABLES = {
  SETTINGS: "qgm_schedule_settings",
  TASKS: "qgm_schedule_tasks",
};

export type TaskType = "boot" | "shutdown" | "mute" | "unmute" | "loop" | "timed";

export interface ScheduleTask {
  id: number;
  groupId: string;
  taskType: TaskType;
  timeSpec: string;
  content: string;
  enabled: boolean;
}

interface ScheduleSettings {
  groupId: string;
  enabled: boolean;
}

export class ScheduleService {
  private db: PluginStore | null = null;
  private initialized = false;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private permServiceCallback: ((groupId: string, settings: Record<string, unknown>) => Promise<void>) | null = null;
  private executingTasks: Set<string> = new Set();

  async init(store: PluginStore): Promise<void> {
    if (this.initialized) return;
    this.db = store;

    await this.db.createTable(TABLES.SETTINGS, [
      "group_id TEXT NOT NULL",
      "enabled INTEGER NOT NULL DEFAULT 0",
    ]);
    await this.db.createTable(TABLES.TASKS, [
      "group_id TEXT NOT NULL",
      "task_type TEXT NOT NULL",
      "time_spec TEXT NOT NULL",
      "content TEXT DEFAULT ''",
      "enabled INTEGER NOT NULL DEFAULT 1",
    ]);

    this.initialized = true;
    this.startChecker();

    // 在进程退出时清理定时器
    process.on('exit', () => {
      this.stopAll();
      console.log('[schedule] All timers cleaned up');
    });
  }

  private getDb(): PluginStore {
    if (!this.db) throw new Error("Database not initialized");
    return this.db;
  }

  setPermServiceCallback(callback: (groupId: string, settings: Record<string, unknown>) => Promise<void>): void {
    this.permServiceCallback = callback;
  }

  async isEnabled(groupId: string): Promise<boolean> {
    try {
      const rows = await this.getDb().query(TABLES.SETTINGS, { group_id: groupId });
      if (rows.length === 0) return false;
      return Boolean(rows[0].enabled);
    } catch {
      return false;
    }
  }

  async setEnabled(groupId: string, enabled: boolean): Promise<void> {
    const db = this.getDb();
    try {
      await db.delete(TABLES.SETTINGS, { group_id: groupId });
    } catch {}
    await db.insert(TABLES.SETTINGS, { group_id: groupId, enabled: enabled ? 1 : 0 });
  }

  async addTask(groupId: string, taskType: TaskType, timeSpec: string, content: string = ""): Promise<void> {
    await this.getDb().insert(TABLES.TASKS, {
      group_id: groupId,
      task_type: taskType,
      time_spec: timeSpec,
      content,
      enabled: 1,
    });
  }

  async removeTask(groupId: string, taskId: number): Promise<boolean> {
    try {
      const rows = await this.getDb().query(TABLES.TASKS, { group_id: groupId });
      const task = rows.find((r: Record<string, unknown>) => (r as { id: number }).id === taskId);
      if (!task) return false;
      await this.getDb().delete(TABLES.TASKS, { id: taskId });
      return true;
    } catch {
      return false;
    }
  }

  async getTasks(groupId: string): Promise<ScheduleTask[]> {
    try {
      const rows = await this.getDb().query(TABLES.TASKS, { group_id: groupId });
      return rows.map((r: Record<string, unknown>) => ({
        id: r.id as number,
        groupId: r.group_id as string,
        taskType: r.task_type as TaskType,
        timeSpec: r.time_spec as string,
        content: (r.content as string) || "",
        enabled: Boolean(r.enabled),
      }));
    } catch {
      return [];
    }
  }

  async getAllTasks(): Promise<ScheduleTask[]> {
    try {
      const rows = await this.getDb().query(TABLES.TASKS);
      return rows.map((r: Record<string, unknown>) => ({
        id: r.id as number,
        groupId: r.group_id as string,
        taskType: r.task_type as TaskType,
        timeSpec: r.time_spec as string,
        content: (r.content as string) || "",
        enabled: Boolean(r.enabled),
      }));
    } catch {
      return [];
    }
  }

  private startChecker(): void {
    console.log("[schedule] Starting checker...");
    
    // Run immediately on startup
    this.checkAndExecute().catch(err => {
      console.log("[schedule] Initial check error:", err);
    });

    // Check every minute
    this.checkInterval = setInterval(() => {
      console.log("[schedule] Checking tasks...");
      this.checkAndExecute().catch(err => {
        console.log("[schedule] Check error:", err);
      });
    }, 60000);

    // Start loop tasks
    this.startLoopTasks();
  }

  private async startLoopTasks(): Promise<void> {
    try {
      const tasks = await this.getAllTasks();
      for (const task of tasks) {
        if (task.taskType === "loop" && task.enabled) {
          this.startLoopTask(task);
        }
      }
    } catch (err) {
      console.log("[schedule] Failed to start loop tasks:", err);
    }
  }

  private startLoopTask(task: ScheduleTask): void {
    const key = `${task.groupId}:${task.id}`;
    if (this.intervals.has(key)) return;

    const minutes = parseInt(task.timeSpec, 10);
    if (isNaN(minutes) || minutes <= 0) return;

    const interval = setInterval(async () => {
      try {
        await pluginState.sendAction("send_group_msg", {
          group_id: Number(task.groupId),
          message: task.content,
        });
      } catch (err) {
        console.log(`[schedule] Loop task error for ${task.groupId}:`, err);
      }
    }, minutes * 60000);

    this.intervals.set(key, interval);
  }

  private async checkAndExecute(): Promise<void> {
    try {
      const tasks = await this.getAllTasks();
      const now = new Date();
      const currentTime = this.formatTime(now);

      console.log(`[schedule] Checking ${tasks.length} tasks at ${currentTime}`);

      for (const task of tasks) {
        if (!task.enabled || task.taskType === "loop") continue;

        const matches = this.matchesTime(task.timeSpec, currentTime, now);
        console.log(`[schedule] Task ${task.id}: ${task.timeSpec} vs ${currentTime} = ${matches}`);

        if (matches) {
          console.log(`[schedule] Executing task ${task.id} for group ${task.groupId}`);
          await this.executeTask(task);
        }
      }
    } catch (err) {
      console.log("[schedule] Check error:", err);
    }
  }

  private formatTime(date: Date): string {
    const h = date.getHours();
    const m = date.getMinutes();
    return `${h}时${m}分`;
  }

  private matchesTime(timeSpec: string, currentTime: string, now: Date): boolean {
    // Handle "每天8时0分" format
    if (timeSpec.startsWith("每天")) {
      const specTime = timeSpec.replace("每天", "");
      return specTime === currentTime;
    }

    // Handle "星期一8时0分" format
    const weekDays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    for (let i = 0; i < weekDays.length; i++) {
      if (timeSpec.startsWith(weekDays[i])) {
        if (now.getDay() !== i) return false;
        const specTime = timeSpec.replace(weekDays[i], "");
        return specTime === currentTime;
      }
    }

    // Handle plain "8时30分" format (every day)
    return timeSpec === currentTime;
  }

  private async executeTask(task: ScheduleTask): Promise<void> {
    const taskKey = `${task.groupId}:${task.id}:${task.taskType}`;
    if (this.executingTasks.has(taskKey)) {
      console.log(`[schedule] Task ${task.id} already executing, skipping`);
      return;
    }

    this.executingTasks.add(taskKey);
    try {
      console.log(`[schedule] Executing task type=${task.taskType} for group ${task.groupId}`);

      switch (task.taskType) {
        case "boot":
          await this.updateGroupSettings(task.groupId, { enabled: true });
          await this.sendMessage(task.groupId, "⏰ 定时开机已执行");
          break;
        case "shutdown":
          await this.updateGroupSettings(task.groupId, { enabled: false });
          await this.sendMessage(task.groupId, "⏰ 定时关机已执行");
          break;
        case "mute":
          console.log(`[schedule] Sending set_group_whole_ban for group ${task.groupId}`);
          await pluginState.sendAction("set_group_whole_ban", {
            group_id: Number(task.groupId),
            enable: true,
          });
          await this.sendMessage(task.groupId, "⏰ 定时全体禁言已执行");
          break;
        case "unmute":
          await pluginState.sendAction("set_group_whole_ban", {
            group_id: Number(task.groupId),
            enable: false,
          });
          await this.sendMessage(task.groupId, "⏰ 定时全体解禁已执行");
          break;
        case "timed":
          await this.sendMessage(task.groupId, task.content);
          break;
      }
      console.log(`[schedule] Task ${task.id} executed successfully`);
    } catch (err) {
      console.log(`[schedule] Execute task error for ${task.groupId}:`, err);
    } finally {
      this.executingTasks.delete(taskKey);
    }
  }

  private async updateGroupSettings(groupId: string, settings: Record<string, unknown>): Promise<void> {
    if (this.permServiceCallback) {
      await this.permServiceCallback(groupId, settings);
    } else {
      console.error(`[schedule] PermService callback not set for group ${groupId}`);
    }
  }

  private async sendMessage(groupId: string, message: string): Promise<void> {
    try {
      await pluginState.sendAction("send_group_msg", {
        group_id: Number(groupId),
        message,
      });
    } catch (err) {
      console.log(`[schedule] Send message error for ${groupId}:`, err);
    }
  }

  stopAll(): void {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const scheduleService = new ScheduleService();
