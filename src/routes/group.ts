import type { PluginSetupContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";
import { pluginState } from "../services/state.js";

export function registerGroupRoutes(ctx: PluginSetupContext, permService: PermissionService): void {
  ctx.route("GET", "/groups", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) {
      await permService.init(store as any);
    }

    if (!pluginState.available) {
      reply.send({ ok: true, groups: [], message: "机器人未就绪" });
      return;
    }

    try {
      const result = await pluginState.sendAction("get_group_list");
      if (!result.ok || !result.data) {
        reply.send({ ok: true, groups: [], message: "获取群列表失败" });
        return;
      }

      const groups = result.data as Array<{ group_id: number; group_name: string; member_count: number }>;
      const groupsWithSettings = await Promise.all(
        groups.map(async (g) => {
          const settings = await permService.getGroupSettings(String(g.group_id));
          return {
            groupId: String(g.group_id),
            groupName: g.group_name,
            memberCount: g.member_count,
            ...settings,
          };
        })
      );

      reply.send({ ok: true, groups: groupsWithSettings });
    } catch (err) {
      reply.send({ ok: true, groups: [], message: `获取失败: ${err}` });
    }
  });

  ctx.route("GET", "/groups/:groupId/settings", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) {
      await permService.init(store as any);
    }

    const params = req.params as { groupId?: string };
    if (!params.groupId) {
      reply.status(400).send({ ok: false, message: "请提供群号" });
      return;
    }

    const settings = await permService.getGroupSettings(params.groupId);
    const superAdmins = await permService.getSuperAdmins(params.groupId);

    reply.send({
      ok: true,
      settings,
      superAdmins,
    });
  });

  ctx.route("PUT", "/groups/:groupId/settings", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) {
      await permService.init(store as any);
    }

    const params = req.params as { groupId?: string };
    if (!params.groupId) {
      reply.status(400).send({ ok: false, message: "请提供群号" });
      return;
    }

    const body = req.body as { enabled?: boolean; muted?: boolean; exclusiveMode?: boolean };
    const updates: Record<string, boolean> = {};

    if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
    if (typeof body.muted === "boolean") updates.muted = body.muted;
    if (typeof body.exclusiveMode === "boolean") updates.exclusiveMode = body.exclusiveMode;

    if (Object.keys(updates).length === 0) {
      reply.status(400).send({ ok: false, message: "没有有效的更新字段" });
      return;
    }

    await permService.updateGroupSettings(params.groupId, updates);
    const settings = await permService.getGroupSettings(params.groupId);

    reply.send({
      ok: true,
      settings,
      message: "设置已更新",
    });
  });

  ctx.route("GET", "/groups/:groupId/super-admins", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) {
      await permService.init(store as any);
    }

    const params = req.params as { groupId?: string };
    if (!params.groupId) {
      reply.status(400).send({ ok: false, message: "请提供群号" });
      return;
    }

    const superAdmins = await permService.getSuperAdmins(params.groupId);

    reply.send({
      ok: true,
      superAdmins,
    });
  });

  ctx.route("POST", "/groups/:groupId/super-admins", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) {
      await permService.init(store as any);
    }

    const params = req.params as { groupId?: string };
    if (!params.groupId) {
      reply.status(400).send({ ok: false, message: "请提供群号" });
      return;
    }

    const body = req.body as { qqId?: string };
    if (!body.qqId || !body.qqId.trim()) {
      reply.status(400).send({ ok: false, message: "请提供QQ号" });
      return;
    }

    try {
      await permService.addSuperAdmin(params.groupId, body.qqId.trim());
      const superAdmins = await permService.getSuperAdmins(params.groupId);
      reply.send({ ok: true, superAdmins, message: `已添加超管 ${body.qqId}` });
    } catch (e: unknown) {
      reply.status(500).send({ ok: false, message: `添加失败: ${e instanceof Error ? e.message : String(e)}` });
    }
  });

  ctx.route("DELETE", "/groups/:groupId/super-admins/:qqId", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) {
      await permService.init(store as any);
    }

    const params = req.params as { groupId?: string; qqId?: string };
    if (!params.groupId || !params.qqId) {
      reply.status(400).send({ ok: false, message: "请提供群号和QQ号" });
      return;
    }

    const deleted = await permService.removeSuperAdmin(params.groupId, params.qqId);
    if (deleted > 0) {
      const superAdmins = await permService.getSuperAdmins(params.groupId);
      reply.send({ ok: true, superAdmins, message: `已删除超管 ${params.qqId}` });
    } else {
      reply.status(404).send({ ok: false, message: `${params.qqId} 不是本群超管` });
    }
  });
}
