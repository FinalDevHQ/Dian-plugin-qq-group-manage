import type { PluginSetupContext } from "@myfinal/plugin-runtime";
import { cardService } from "../services/card.js";

export function registerCardRoutes(ctx: PluginSetupContext): void {
  ctx.route("GET", "/card/settings/:groupId", async (req, reply) => {
    const { groupId } = req.params as { groupId: string };
    const settings = await cardService.getSettings(groupId);
    reply.send({ code: 0, data: settings });
  });

  ctx.route("PUT", "/card/settings/:groupId", async (req, reply) => {
    const { groupId } = req.params as { groupId: string };
    const body = req.body as Record<string, unknown>;
    await cardService.updateSettings(groupId, body);
    const settings = await cardService.getSettings(groupId);
    reply.send({ code: 0, data: settings });
  });

  ctx.route("GET", "/card/original/:groupId/:qqId", async (req, reply) => {
    const { groupId, qqId } = req.params as { groupId: string; qqId: string };
    const original = await cardService.getOriginalCard(groupId, qqId);
    reply.send({ code: 0, data: { original } });
  });
}
