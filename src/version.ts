import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let PKG_VERSION = "0.0.0";

// 尝试多个可能的 package.json 路径
const possiblePaths = [
  resolve(__dirname, "..", "package.json"),  // dist/../package.json
  resolve(__dirname, "package.json"),         // dist/package.json
  resolve(__dirname, "..", "..", "package.json"), // 上两级目录
  resolve(__dirname, "..", "dist", "package.json"), // 同级 dist 目录
];

for (const pkgPath of possiblePaths) {
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (pkg.version) {
        PKG_VERSION = pkg.version;
        break;
      }
    } catch { /* 继续尝试 */ }
  }
}

export { PKG_VERSION };
