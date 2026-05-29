import type { PluginSetupContext } from "@myfinal/plugin-runtime";
import { notifyService } from "../services/notify.js";

export function registerNotifyRoutes(ctx: PluginSetupContext): void {
  // GET /notify/global — 获取全局配置
  ctx.route("GET", "/notify/global", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await notifyService.init(store as any);

    try {
      const config = await notifyService.getGlobalConfig();
      reply.send({ ok: true, config });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `获取失败: ${err}` });
    }
  });

  // PUT /notify/global — 更新全局配置
  ctx.route("PUT", "/notify/global", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await notifyService.init(store as any);

    const body = req.body as Record<string, unknown>;
    try {
      const updates: Record<string, unknown> = {};
      if (typeof body.welcomeEnabled === "boolean") updates.welcomeEnabled = body.welcomeEnabled;
      if (typeof body.welcomeMsg === "string") updates.welcomeMsg = body.welcomeMsg;
      if (typeof body.leaveEnabled === "boolean") updates.leaveEnabled = body.leaveEnabled;
      if (typeof body.leaveMsg === "string") updates.leaveMsg = body.leaveMsg;
      if (typeof body.muteOnJoin === "boolean") updates.muteOnJoin = body.muteOnJoin;
      if (typeof body.muteDuration === "number" && body.muteDuration >= 0) updates.muteDuration = body.muteDuration;

      if (Object.keys(updates).length === 0) {
        reply.status(400).send({ ok: false, message: "没有有效的更新字段" });
        return;
      }

      await notifyService.updateGlobalConfig(updates as any);
      const config = await notifyService.getGlobalConfig();
      reply.send({ ok: true, config, message: "全局配置已更新" });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `更新失败: ${err}` });
    }
  });

  // GET /notify/group/:groupId — 获取群配置
  ctx.route("GET", "/notify/group/:groupId", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await notifyService.init(store as any);

    const params = req.params as { groupId?: string };
    if (!params.groupId) {
      reply.status(400).send({ ok: false, message: "缺少 groupId" });
      return;
    }

    try {
      const config = await notifyService.getGroupConfig(params.groupId);
      const effective = await notifyService.getEffectiveConfig(params.groupId);
      reply.send({ ok: true, config, effective });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `获取失败: ${err}` });
    }
  });

  // PUT /notify/group/:groupId — 更新群配置
  ctx.route("PUT", "/notify/group/:groupId", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await notifyService.init(store as any);

    const params = req.params as { groupId?: string };
    if (!params.groupId) {
      reply.status(400).send({ ok: false, message: "缺少 groupId" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    try {
      const updates: Record<string, unknown> = {};
      if (typeof body.welcomeEnabled === "boolean") updates.welcomeEnabled = body.welcomeEnabled;
      if (typeof body.welcomeMsg === "string") updates.welcomeMsg = body.welcomeMsg;
      if (typeof body.leaveEnabled === "boolean") updates.leaveEnabled = body.leaveEnabled;
      if (typeof body.leaveMsg === "string") updates.leaveMsg = body.leaveMsg;
      if (typeof body.muteOnJoin === "boolean") updates.muteOnJoin = body.muteOnJoin;
      if (typeof body.muteDuration === "number" && body.muteDuration >= 0) updates.muteDuration = body.muteDuration;

      if (Object.keys(updates).length === 0) {
        reply.status(400).send({ ok: false, message: "没有有效的更新字段" });
        return;
      }

      await notifyService.updateGroupConfig(params.groupId, updates as any);
      const config = await notifyService.getGroupConfig(params.groupId);
      reply.send({ ok: true, config, message: "群配置已更新" });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `更新失败: ${err}` });
    }
  });

  // DELETE /notify/group/:groupId — 重置群配置
  ctx.route("DELETE", "/notify/group/:groupId", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await notifyService.init(store as any);

    const params = req.params as { groupId?: string };
    if (!params.groupId) {
      reply.status(400).send({ ok: false, message: "缺少 groupId" });
      return;
    }

    try {
      await notifyService.resetGroupConfig(params.groupId);
      reply.send({ ok: true, message: "已重置为全局默认" });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `重置失败: ${err}` });
    }
  });

  // GET /notify/all — 获取所有群配置
  ctx.route("GET", "/notify/all", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await notifyService.init(store as any);

    try {
      const configs = await notifyService.getAllGroupConfigs();
      reply.send({ ok: true, configs });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `获取失败: ${err}` });
    }
  });
}
