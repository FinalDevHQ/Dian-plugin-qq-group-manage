import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import os from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 尝试多个可能的配置文件路径
const possiblePaths = [
  resolve(__dirname, "config.json"),
  resolve(__dirname, "..", "config.json"),
  resolve(__dirname, "..", "..", "config.json"),
  // 备用：用户主目录下的配置目录
  resolve(os.homedir(), ".qq-group-manage", "config.json"),
];

let CONFIG_PATH = possiblePaths[0];

// 找到第一个可写的路径
for (const path of possiblePaths) {
  try {
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    CONFIG_PATH = path;
    break;
  } catch { /* 继续尝试 */ }
}

export interface Config {
  command: string;
  reply: string;
}

export const DEFAULTS: Config = {
  command: "!hello",
  reply: "Hello World!",
};

export function loadConfig(): Config {
  try {
    if (existsSync(CONFIG_PATH)) {
      return { ...DEFAULTS, ...JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as Config };
    }
  } catch { /* 读取失败时使用默认值 */ }
  return { ...DEFAULTS };
}

export function saveConfig(cfg: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}
