import type { PluginSetupContext } from "@myfinal/plugin-runtime";
import { scheduleService } from "../services/schedule.js";

export function registerScheduleRoutes(ctx: PluginSetupContext): void {
  ctx.route("GET", "/schedule/settings/:groupId", async (req, reply) => {
    const { groupId } = req.params as { groupId: string };
    const enabled = await scheduleService.isEnabled(groupId);
    reply.send({ code: 0, data: { enabled } });
  });

  ctx.route("PUT", "/schedule/settings/:groupId", async (req, reply) => {
    const { groupId } = req.params as { groupId: string };
    const body = req.body as Record<string, unknown>;
    if (typeof body.enabled === "boolean") {
      await scheduleService.setEnabled(groupId, body.enabled);
    }
    const enabled = await scheduleService.isEnabled(groupId);
    reply.send({ code: 0, data: { enabled } });
  });

  ctx.route("GET", "/schedule/tasks/:groupId", async (req, reply) => {
    const { groupId } = req.params as { groupId: string };
    const tasks = await scheduleService.getTasks(groupId);
    reply.send({ code: 0, data: tasks });
  });

  ctx.route("POST", "/schedule/tasks/:groupId", async (req, reply) => {
    const { groupId } = req.params as { groupId: string };
    const body = req.body as Record<string, unknown>;
    const taskType = body.taskType as string;
    const timeSpec = body.timeSpec as string;
    const content = (body.content as string) || "";

    if (!taskType || !timeSpec) {
      reply.send({ code: 1, message: "缺少参数" });
      return;
    }

    const validTypes = ["boot", "shutdown", "mute", "unmute", "loop", "timed"];
    if (!validTypes.includes(taskType)) {
      reply.send({ code: 1, message: "无效的任务类型" });
      return;
    }

    await scheduleService.addTask(groupId, taskType as "boot" | "shutdown" | "mute" | "unmute" | "loop" | "timed", timeSpec, content);
    const tasks = await scheduleService.getTasks(groupId);
    reply.send({ code: 0, data: tasks, message: "任务已添加" });
  });

  ctx.route("DELETE", "/schedule/tasks/:groupId/:taskId", async (req, reply) => {
    const { groupId, taskId } = req.params as { groupId: string; taskId: string };
    const success = await scheduleService.removeTask(groupId, parseInt(taskId, 10));
    if (success) {
      const tasks = await scheduleService.getTasks(groupId);
      reply.send({ code: 0, data: tasks, message: "任务已删除" });
    } else {
      reply.send({ code: 1, message: "任务不存在" });
    }
  });
}
