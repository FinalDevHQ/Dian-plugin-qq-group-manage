import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface DiskInfo {
  drive: string;
  total: number;
  used: number;
  percent: number;
}

interface SystemInfo {
  cpu: { usage: number; cores: number; model: string };
  memory: { used: number; total: number; percent: number };
  disk: DiskInfo[];
  os: { platform: string; arch: string; release: string };
  node: { version: string; pid: number };
  plugin: { version: string; uptime: number };
  messages: { received: number; sent: number };
  groups: { count: number };
  time: { current: string; startTime: string };
}

export class SystemInfoService {
  private msgReceived = 0;
  private msgSent = 0;
  private startTime = Date.now();
  private groupCount = 0;
  private pluginVersion: string = "unknown";

  incrementReceived(): void {
    this.msgReceived++;
  }

  incrementSent(): void {
    this.msgSent++;
  }

  setGroupCount(count: number): void {
    this.groupCount = count;
  }

  setPluginVersion(version: string): void {
    this.pluginVersion = version;
  }

  private getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      for (const cpu of cpus) {
        for (const type of Object.keys(cpu.times) as Array<keyof typeof cpu.times>) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      }

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = Math.round((1 - idle / total) * 100);
      resolve(usage);
    });
  }

  private async getDiskInfo(): Promise<DiskInfo[]> {
    const platform = os.platform();

    try {
      if (platform === "win32") {
        return await this.getDiskInfoWindows();
      } else {
        return await this.getDiskInfoLinux();
      }
    } catch (err) {
      console.log("[system-info] Failed to get disk info:", err);
      return [];
    }
  }

  private async getDiskInfoWindows(): Promise<DiskInfo[]> {
    try {
      // 尝试使用 PowerShell（Windows 10/11 可用）
      const { stdout } = await execAsync(
        'powershell -Command "Get-PSDrive -PSProvider FileSystem | Select-Object Name,Used,Free | ConvertTo-Json"',
        { timeout: 5000 }
      );

      const drives = JSON.parse(stdout);
      const disks: DiskInfo[] = [];

      // PowerShell 可能返回单个对象或数组
      const driveArray = Array.isArray(drives) ? drives : [drives];

      for (const drive of driveArray) {
        if (drive.Name && drive.Used != null && drive.Free != null) {
          const total = drive.Used + drive.Free;
          if (total > 0) {
            const percent = Math.round((drive.Used / total) * 100);
            disks.push({
              drive: drive.Name + ":",
              total,
              used: drive.Used,
              percent,
            });
          }
        }
      }

      return disks;
    } catch (err) {
      console.log("[system-info] PowerShell disk info failed, trying wmic:", err);

      // 回退到 wmic（旧版 Windows）
      try {
        const { stdout } = await execAsync(
          "wmic logicaldisk get caption,size,freespace /format:csv",
          { timeout: 5000 }
        );

        const lines = stdout.trim().split("\n").filter((line) => line.trim());
        const disks: DiskInfo[] = [];

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",").map((p) => p.trim());
          if (parts.length >= 4) {
            const drive = parts[1];
            const freeSpace = parseInt(parts[2], 10);
            const totalSize = parseInt(parts[3], 10);

            if (drive && !isNaN(freeSpace) && !isNaN(totalSize) && totalSize > 0) {
              const used = totalSize - freeSpace;
              const percent = Math.round((used / totalSize) * 100);
              disks.push({ drive, total: totalSize, used, percent });
            }
          }
        }

        return disks;
      } catch (wmicErr) {
        console.log("[system-info] wmic disk info also failed:", wmicErr);
        return [];
      }
    }
  }

  private async getDiskInfoLinux(): Promise<DiskInfo[]> {
    try {
      const { stdout } = await execAsync("df -B1 / | tail -1", { timeout: 5000 });
      const parts = stdout.trim().split(/\s+/);

      if (parts.length >= 5) {
        const total = parseInt(parts[1], 10);
        const used = parseInt(parts[2], 10);
        const percent = parseInt(parts[4], 10);

        if (!isNaN(total) && !isNaN(used) && !isNaN(percent)) {
          return [{ drive: "/", total, used, percent }];
        }
      }

      return [];
    } catch (err) {
      console.log("[system-info] Linux disk info error:", err);
      return [];
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(1)}${units[i]}`;
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分`);
    parts.push(`${secs}秒`);

    return parts.join("");
  }

  private formatTime(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return `${y}/${m}/${d} ${h}:${min}:${s}`;
  }

  async getSystemInfo(): Promise<SystemInfo> {
    const cpuUsage = await this.getCpuUsage();
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Math.round((usedMem / totalMem) * 100);
    const disks = await this.getDiskInfo();
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        model: cpus[0]?.model || "Unknown",
      },
      memory: {
        used: usedMem,
        total: totalMem,
        percent: memPercent,
      },
      disk: disks,
      os: {
        platform: os.platform() === "win32" ? "Windows" : os.platform(),
        arch: os.arch(),
        release: os.release(),
      },
      node: {
        version: process.version,
        pid: process.pid,
      },
      plugin: {
        version: this.pluginVersion,
        uptime: uptimeSeconds,
      },
      messages: {
        received: this.msgReceived,
        sent: this.msgSent,
      },
      groups: {
        count: this.groupCount,
      },
      time: {
        current: this.formatTime(new Date()),
        startTime: this.formatTime(new Date(this.startTime)),
      },
    };
  }

  async getFormattedStatus(): Promise<string> {
    const info = await this.getSystemInfo();

    const lines = [
      "===运行状态===",
      `● CPU: ${info.cpu.usage}% (${info.cpu.cores}核)`,
      `● 内存: ${this.formatBytes(info.memory.used)}/${this.formatBytes(info.memory.total)} (${info.memory.percent}%)`,
    ];

    for (const disk of info.disk) {
      lines.push(`● 磁盘${disk.drive}: ${this.formatBytes(disk.used)}/${this.formatBytes(disk.total)} (${disk.percent}%)`);
    }

    lines.push(
      `● 系统: ${info.os.platform} ${info.os.arch}`,
      `● Node.js: ${info.node.version}`,
      `● 进程PID: ${info.node.pid}`,
      "",
      "===插件信息===",
      `● 插件版本: ${info.plugin.version}`,
      `● 运行时间: ${this.formatUptime(info.plugin.uptime)}`,
      `● 消息收发: 收到${info.messages.received}条 / 发出${info.messages.sent}条`,
      `● 管理群数: ${info.groups.count}个`,
      `● 启动时间: ${info.time.startTime}`,
      `● 当前时间: ${info.time.current}`,
    );

    return lines.join("\n");
  }
}

export const systemInfoService = new SystemInfoService();
