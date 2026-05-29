import type { EventContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { PermissionLevel } from "../services/permission.js";
import { requirePermission } from "./permission.js";
import { isPuppeteerAvailable } from "../services/render.js";

export function getImageModeCommands(permService: PermissionService) {
  return {
    name: "图片模式",
    aliases: ["imgmode", "image-mode"],
    pattern: /^(图片模式|切换为图片回复|切换为文字回复)/,
    description: "图片/文字回复切换",
    order: 35,
    handler: async (c: EventContext) => {
      const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
      if (!ctx) return;
      const text = c.event.payload.text || "";

      // 切换为图片回复 / 切换为文字回复
      if (/切换为图片回复/.test(text)) {
        const available = await isPuppeteerAvailable();
        if (!available) {
          await c.reply("Puppeteer 未连接，请先启动 Puppeteer 插件");
          return;
        }
        await permService.updateGroupSettings(ctx.groupId, { replyMode: "image" });
        await c.reply("已开启图片模式，后续回复将以图片形式发送");
        return;
      }
      if (/切换为文字回复/.test(text)) {
        await permService.updateGroupSettings(ctx.groupId, { replyMode: "text" });
        await c.reply("已关闭图片模式，后续回复将以文字形式发送");
        return;
      }

      const match = text.match(/图片模式\s*(开启|关闭|状态|开|关)?/);
      const action = match?.[1];

      if (!action || action === "状态") {
        const settings = await permService.getGroupSettings(ctx.groupId);
        const mode = settings.replyMode === "image" ? "图片" : "文字";
        const puppeteerOk = await isPuppeteerAvailable();
        const puppeteerText = puppeteerOk ? "✅ 已连接" : "❌ 未连接";
        await c.reply(
          `📊 图片模式状态\n` +
          `────────────────\n` +
          `当前模式: ${mode}\n` +
          `Puppeteer: ${puppeteerText}\n` +
          `────────────────\n` +
          `切换为图片回复 - 开启图片模式\n` +
          `切换为文字回复 - 关闭图片模式\n` +
          `图片模式 开启 - 同上\n` +
          `图片模式 关闭 - 同上`
        );
        return;
      }

      if (action === "开启" || action === "开") {
        const available = await isPuppeteerAvailable();
        if (!available) {
          await c.reply("Puppeteer 未连接，请先启动 Puppeteer 插件");
          return;
        }
        await permService.updateGroupSettings(ctx.groupId, { replyMode: "image" });
        await c.reply("已开启图片模式，后续回复将以图片形式发送");
      } else {
        await permService.updateGroupSettings(ctx.groupId, { replyMode: "text" });
        await c.reply("已关闭图片模式，后续回复将以文字形式发送");
      }
    },
  };
}
