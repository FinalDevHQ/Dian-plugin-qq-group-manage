import type { EventContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { PermissionLevel } from "../services/permission.js";
import { requirePermission } from "./permission.js";

export function getQuoteReplyCommands(permService: PermissionService) {
  return {
    name: "引用回复",
    aliases: ["quote-reply"],
    pattern: /^(开启引用回复|关闭引用回复|引用回复状态|引用回复\s*(开启|关闭|状态|开|关)?)$/,
    description: "引用回复设置",
    order: 36,
    handler: async (c: EventContext) => {
      const ctx = await requirePermission(c, permService, PermissionLevel.ADMIN);
      if (!ctx) return;
      const text = c.event.payload.text || "";

      if (/^开启引用回复$/.test(text)) {
        await permService.updateGroupSettings(ctx.groupId, { quoteReply: true });
        await c.reply("已开启引用回复，bot 回复将引用你的消息");
        return;
      }
      if (/^关闭引用回复$/.test(text)) {
        await permService.updateGroupSettings(ctx.groupId, { quoteReply: false });
        await c.reply("已关闭引用回复");
        return;
      }

      const match = text.match(/引用回复\s*(开启|关闭|状态|开|关)?/);
      const action = match?.[1];

      if (!action || action === "状态") {
        const settings = await permService.getGroupSettings(ctx.groupId);
        const status = settings.quoteReply ? "开启" : "关闭";
        await c.reply(
          `📊 引用回复状态\n` +
          `────────────────\n` +
          `当前状态: ${status}\n` +
          `────────────────\n` +
          `开启引用回复 - 开启\n` +
          `关闭引用回复 - 关闭`
        );
        return;
      }

      if (action === "开启" || action === "开") {
        await permService.updateGroupSettings(ctx.groupId, { quoteReply: true });
        await c.reply("已开启引用回复，bot 回复将引用你的消息");
      } else {
        await permService.updateGroupSettings(ctx.groupId, { quoteReply: false });
        await c.reply("已关闭引用回复");
      }
    },
  };
}
