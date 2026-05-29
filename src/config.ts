import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, "config.json");

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
