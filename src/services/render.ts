import type { EventContext } from "@myfinal/plugin-runtime";
import type { PermissionService } from "./permission.js";
import { templateService } from "./template.js";

const PUPPETEER_BASE = "http://127.0.0.1:3000";
const PUPPETEER_API = `${PUPPETEER_BASE}/plugins/puppeteer/api`;

let puppeteerAvailable: boolean | null = null;
let lastCheckTime = 0;
const CHECK_INTERVAL = 30_000;

export async function isPuppeteerAvailable(): Promise<boolean> {
  const now = Date.now();
  if (puppeteerAvailable !== null && now - lastCheckTime < CHECK_INTERVAL) {
    return puppeteerAvailable;
  }
  try {
    const res = await fetch(`${PUPPETEER_API}/status`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json() as { code?: number; data?: { browser?: { connected?: boolean } } };
      puppeteerAvailable = data.code === 0 && data.data?.browser?.connected === true;
    } else {
      puppeteerAvailable = false;
    }
  } catch {
    puppeteerAvailable = false;
  }
  lastCheckTime = now;
  return puppeteerAvailable;
}

export async function renderHtmlToImage(html: string): Promise<string | null> {
  try {
    const res = await fetch(`${PUPPETEER_API}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html, selector: "body", type: "png", encoding: "base64" }),
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const data = await res.json() as { code: number; data?: string };
      if (data.code === 0 && data.data) return data.data;
    }
  } catch {}
  return null;
}

export type TemplateType = "help" | "status" | "list";

export interface SmartReplyOptions {
  templateId?: string;
  templateType?: TemplateType;
  vars?: Record<string, string>;
}

export async function smartReply(
  ctx: EventContext,
  text: string,
  groupId: string,
  permService: PermissionService,
  options?: SmartReplyOptions,
): Promise<void> {
  const settings = await permService.getGroupSettings(groupId);
  const replyMode = settings.replyMode || "text";
  console.log(`[smartReply] groupId=${groupId} replyMode=${replyMode}`);

  if (replyMode === "image") {
    const available = await isPuppeteerAvailable();
    console.log(`[smartReply] puppeteer available=${available}`);
    if (available) {
      const templateId = options?.templateId;
      let html: string | null = null;

      if (templateId) {
        html = await templateService.render(templateId, {
          ...options?.vars,
          content: text,
          time: new Date().toLocaleString("zh-CN"),
        });
        console.log(`[smartReply] template rendered html=${html ? html.length : 0} chars`);
      }

      if (!html) {
        html = templateService.textToHtml(text, options?.templateType);
        console.log(`[smartReply] fallback textToHtml html=${html.length} chars`);
      }

      const base64 = await renderHtmlToImage(html);
      console.log(`[smartReply] render result base64=${base64 ? base64.length : 0} chars`);
      if (base64) {
        try {
          const message = [{ type: "image", data: { file: `base64://${base64}` } }];
          await ctx.sendAction("send_group_msg", { group_id: Number(groupId), message });
          return;
        } catch (err) {
          console.log(`[smartReply] send error:`, err);
        }
      }
    }
  }

  await ctx.reply(text);
}

/**
 * 通用自动回复：c.reply 的增强版。
 * 自动检测 groupId，图片模式下把文字渲染成通用卡片图片，否则发文字。
 * 可以直接替代 c.reply() 用于所有需要美化的回复。
 */
export async function replyAuto(
  ctx: EventContext,
  text: string,
  permService: PermissionService,
  type?: TemplateType,
): Promise<void> {
  const groupId = ctx.event.payload?.groupId;
  if (!groupId) {
    await ctx.reply(text);
    return;
  }
  await smartReply(ctx, text, groupId, permService, { templateType: type });
}

export function textToHtml(text: string, type?: TemplateType): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  const title = type === "help" ? "📖 帮助" : type === "status" ? "📊 状态" : "📋 列表";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Microsoft YaHei','Segoe UI',sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px;display:flex;justify-content:center}
  .card{background:#fff;border-radius:12px;padding:24px;max-width:420px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,.15)}
  .title{font-size:16px;font-weight:700;color:#1e293b;margin-bottom:12px;padding-bottom:12px;border-bottom:2px solid #e2e8f0}
  .content{font-size:13px;color:#475569;line-height:1.8;white-space:pre-wrap;word-break:break-all}
  .footer{margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:right}
</style></head><body>
<div class="card">
  <div class="title">${title}</div>
  <div class="content">${escaped}</div>
  <div class="footer">${new Date().toLocaleString("zh-CN")}</div>
</div></body></html>`;
}
