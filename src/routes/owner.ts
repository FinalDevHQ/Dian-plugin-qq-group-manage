import type { PluginSetupContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "../services/permission.js";

export function registerOwnerRoutes(ctx: PluginSetupContext, permService: PermissionService): void {
  ctx.route("GET", "/owners", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) {
      await permService.init(store as any);
    }

    const owners = await permService.getOwners();
    reply.send({ ok: true, owners });
  });

  ctx.route("POST", "/owners", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) {
      await permService.init(store as any);
    }

    const body = req.body as { qqId?: string };
    if (!body.qqId || !body.qqId.trim()) {
      reply.status(400).send({ ok: false, message: "请提供QQ号" });
      return;
    }

    const qqId = body.qqId.trim();
    try {
      await permService.addOwner(qqId);
      const owners = await permService.getOwners();
      reply.send({ ok: true, owners, message: `已添加主人 ${qqId}` });
    } catch (e: unknown) {
      reply.status(500).send({ ok: false, message: `添加失败: ${e instanceof Error ? e.message : String(e)}` });
    }
  });

  ctx.route("DELETE", "/owners/:qqId", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) {
      await permService.init(store as any);
    }

    const params = req.params as { qqId?: string };
    if (!params.qqId) {
      reply.status(400).send({ ok: false, message: "请提供QQ号" });
      return;
    }

    const deleted = await permService.removeOwner(params.qqId);
    if (deleted > 0) {
      const owners = await permService.getOwners();
      reply.send({ ok: true, owners, message: `已删除主人 ${params.qqId}` });
    } else {
      reply.status(404).send({ ok: false, message: `${params.qqId} 不是主人` });
    }
  });
}
