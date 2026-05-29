import type { PluginSetupContext } from "@myfinal/plugin-runtime";
import { adKillerService, AdPunishment } from "../services/ad-killer.js";

export function registerAdKillerRoutes(ctx: PluginSetupContext): void {
  // GET /ad-killer/keywords?groupId=xxx — 获取关键词（支持全局和分群）
  ctx.route("GET", "/ad-killer/keywords", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await adKillerService.init(store as any);

    const query = req.query as { groupId?: string };
    try {
      if (query.groupId) {
        const keywords = await adKillerService.getKeywords(query.groupId);
        reply.send({ ok: true, keywords, scope: "group" });
      } else {
        const keywords = await adKillerService.getGlobalKeywords();
        reply.send({ ok: true, keywords, scope: "global" });
      }
    } catch (err) {
      reply.status(500).send({ ok: false, message: `获取失败: ${err}` });
    }
  });

  // GET /ad-killer/all-keywords — 获取所有关键词（全局+所有群）
  ctx.route("GET", "/ad-killer/all-keywords", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await adKillerService.init(store as any);

    try {
      const keywords = await adKillerService.getAllKeywords();
      reply.send({ ok: true, keywords });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `获取失败: ${err}` });
    }
  });

  // POST /ad-killer/keywords — 添加关键词
  ctx.route("POST", "/ad-killer/keywords", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await adKillerService.init(store as any);

    const body = req.body as { groupId?: string; keyword?: string; punishment?: string };
    if (!body.keyword || !body.keyword.trim()) {
      reply.status(400).send({ ok: false, message: "请提供关键词" });
      return;
    }

    const validPunishments = ["recall", "recall_mute", "recall_kick"];
    const punishment = validPunishments.includes(body.punishment || "") ? body.punishment as AdPunishment : AdPunishment.RECALL;

    try {
      const groupId = body.groupId || "global";
      await adKillerService.addKeyword(groupId, body.keyword.trim(), punishment);
      const keywords = groupId === "global"
        ? await adKillerService.getGlobalKeywords()
        : await adKillerService.getKeywords(groupId);
      reply.send({ ok: true, keywords, message: `已添加关键词: ${body.keyword}` });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `添加失败: ${err}` });
    }
  });

  // DELETE /ad-killer/keywords — 删除关键词
  ctx.route("DELETE", "/ad-killer/keywords", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await adKillerService.init(store as any);

    const body = req.body as { groupId?: string; keyword?: string };
    if (!body.keyword) {
      reply.status(400).send({ ok: false, message: "请提供关键词" });
      return;
    }

    try {
      const groupId = body.groupId || "global";
      const deleted = await adKillerService.removeKeyword(groupId, body.keyword);
      if (deleted > 0) {
        const keywords = groupId === "global"
          ? await adKillerService.getGlobalKeywords()
          : await adKillerService.getKeywords(groupId);
        reply.send({ ok: true, keywords, message: `已删除关键词: ${body.keyword}` });
      } else {
        reply.status(404).send({ ok: false, message: `未找到关键词: ${body.keyword}` });
      }
    } catch (err) {
      reply.status(500).send({ ok: false, message: `删除失败: ${err}` });
    }
  });

  // DELETE /ad-killer/keywords/clear — 清空关键词
  ctx.route("DELETE", "/ad-killer/keywords/clear", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await adKillerService.init(store as any);

    const body = req.body as { groupId?: string };
    try {
      const groupId = body.groupId || "global";
      await adKillerService.clearKeywords(groupId);
      reply.send({ ok: true, message: `已清空关键词` });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `清空失败: ${err}` });
    }
  });

  // GET /ad-killer/settings?groupId=xxx — 获取设置
  ctx.route("GET", "/ad-killer/settings", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await adKillerService.init(store as any);

    const query = req.query as { groupId?: string };
    try {
      const settings = query.groupId
        ? await adKillerService.getSettings(query.groupId)
        : await adKillerService.getGlobalSettings();
      reply.send({ ok: true, settings });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `获取失败: ${err}` });
    }
  });

  // PUT /ad-killer/settings — 更新设置
  ctx.route("PUT", "/ad-killer/settings", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await adKillerService.init(store as any);

    const body = req.body as { groupId?: string; enabled?: boolean; maxLines?: number; maxChars?: number; defaultPunishment?: string; muteDuration?: number };
    try {
      const groupId = body.groupId || "global";
      const updates: Record<string, unknown> = {};
      if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
      if (typeof body.maxLines === "number") updates.maxLines = body.maxLines;
      if (typeof body.maxChars === "number") updates.maxChars = body.maxChars;
      if (body.defaultPunishment && ["recall", "recall_mute", "recall_kick"].includes(body.defaultPunishment)) {
        updates.defaultPunishment = body.defaultPunishment;
      }
      if (typeof body.muteDuration === "number" && body.muteDuration >= 0) updates.muteDuration = body.muteDuration;

      if (Object.keys(updates).length === 0) {
        reply.status(400).send({ ok: false, message: "没有有效的更新字段" });
        return;
      }

      await adKillerService.updateSettings(groupId, updates as any);
      const settings = groupId === "global"
        ? await adKillerService.getGlobalSettings()
        : await adKillerService.getSettings(groupId);
      reply.send({ ok: true, settings, message: "设置已更新" });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `更新失败: ${err}` });
    }
  });
}
