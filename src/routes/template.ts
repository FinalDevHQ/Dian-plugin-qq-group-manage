import type { PluginSetupContext } from "@myfinal/plugin-runtime";
import { templateService } from "../services/template.js";

export function registerTemplateRoutes(ctx: PluginSetupContext): void {
  ctx.route("GET", "/templates", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await templateService.init(store as any);
    try {
      const templates = await templateService.getAll();
      reply.send({ ok: true, templates });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `获取失败: ${err}` });
    }
  });

  ctx.route("GET", "/templates/:id", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await templateService.init(store as any);
    const params = req.params as { id?: string };
    if (!params.id) { reply.status(400).send({ ok: false }); return; }
    try {
      const tpl = await templateService.get(params.id);
      if (tpl) {
        reply.send({ ok: true, template: tpl });
      } else {
        reply.status(404).send({ ok: false, message: "模板不存在" });
      }
    } catch (err) {
      reply.status(500).send({ ok: false, message: `获取失败: ${err}` });
    }
  });

  ctx.route("POST", "/templates", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await templateService.init(store as any);
    const body = req.body as { id?: string; name?: string; type?: string; html?: string };
    if (!body.id || !body.name || !body.type || !body.html) {
      reply.status(400).send({ ok: false, message: "缺少必要字段" });
      return;
    }
    try {
      await templateService.save(body.id, body.name, body.type, body.html);
      reply.send({ ok: true, message: `模板 ${body.name} 已保存` });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `保存失败: ${err}` });
    }
  });

  ctx.route("DELETE", "/templates/:id", async (req, reply) => {
    const store = (req as unknown as Record<string, unknown>).pluginStore;
    if (store) await templateService.init(store as any);
    const params = req.params as { id?: string };
    if (!params.id) { reply.status(400).send({ ok: false }); return; }
    try {
      const deleted = await templateService.delete(params.id);
      if (deleted > 0) {
        reply.send({ ok: true, message: "已删除" });
      } else {
        reply.status(400).send({ ok: false, message: "内置模板不能删除" });
      }
    } catch (err) {
      reply.status(500).send({ ok: false, message: `删除失败: ${err}` });
    }
  });

  ctx.route("GET", "/templates/vars/info", async (_req, reply) => {
    try {
      const vars = templateService.getBuiltinTemplateVars();
      reply.send({ ok: true, vars });
    } catch (err) {
      reply.status(500).send({ ok: false, message: `获取失败: ${err}` });
    }
  });
}
