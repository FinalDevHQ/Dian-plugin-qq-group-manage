import type { PluginStore } from "@myfinal/plugin-runtime";

export interface Template {
  id: string;
  name: string;
  type: string;
  html: string;
  builtin: boolean;
}

const TABLE_NAME = "qgm_templates";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function applyTemplate(html: string, vars: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

const BUILTIN_TEMPLATES: Record<string, Template> = {
  help_main: {
    id: "help_main", name: "主帮助", type: "help", builtin: true,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Microsoft YaHei',sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:24px;display:flex;justify-content:center}
.card{background:#fff;border-radius:16px;padding:28px;width:400px;box-shadow:0 8px 32px rgba(0,0,0,.12)}
.title{font-size:20px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:8px;margin-bottom:6px}
.sub{font-size:12px;color:#94a3b8;margin-bottom:20px}
.section{margin-bottom:16px}
.section-title{font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
.row{display:flex;align-items:center;padding:8px 12px;border-radius:8px;margin-bottom:3px;background:#f8fafc}
.cmd{font-size:13px;font-weight:600;color:#7c3aed;font-family:Consolas,monospace;width:160px;flex-shrink:0}
.desc{font-size:12px;color:#64748b}
.footer{margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:right}
</style></head><body><div class="card">
<div class="title">👥 群组管理指令</div>
<div class="sub">输入 群管 &lt;分类&gt; 帮助 查看详情</div>
<div class="section"><div class="section-title">功能分类</div>
<div class="row"><span class="cmd">群管 权限</span><span class="desc">权限管理</span></div>
<div class="row"><span class="cmd">群管 管理员</span><span class="desc">管理员操作</span></div>
<div class="row"><span class="cmd">群管 成员</span><span class="desc">成员管理</span></div>
<div class="row"><span class="cmd">群管 名单</span><span class="desc">黑白名单</span></div>
<div class="row"><span class="cmd">群管 广告</span><span class="desc">广告杀手</span></div>
<div class="row"><span class="cmd">群管 提示</span><span class="desc">群内提示</span></div>
<div class="row"><span class="cmd">发言统计</span><span class="desc">发言排行/我的发言</span></div>
<div class="row"><span class="cmd">群管 系统</span><span class="desc">系统设置</span></div>
<div class="row"><span class="cmd">图片模式</span><span class="desc">切换图片/文字回复</span></div>
</div>
<div class="footer">{{time}}</div>
</div></body></html>`,
  },
  help_permission: {
    id: "help_permission", name: "权限帮助", type: "help", builtin: true,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Microsoft YaHei',sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:24px;display:flex;justify-content:center}
.card{background:#fff;border-radius:16px;padding:28px;width:400px;box-shadow:0 8px 32px rgba(0,0,0,.12)}
.title{font-size:18px;font-weight:700;color:#1e293b;margin-bottom:16px}
.row{display:flex;padding:7px 12px;border-radius:8px;margin-bottom:3px;background:#f8fafc}
.cmd{font-size:13px;font-weight:600;color:#7c3aed;font-family:Consolas,monospace;width:170px;flex-shrink:0}
.desc{font-size:12px;color:#64748b}
.footer{margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:right}
</style></head><body><div class="card">
<div class="title">🔐 权限管理</div>
<div class="row"><span class="cmd">我的身份</span><span class="desc">查询当前身份</span></div>
<div class="row"><span class="cmd">加小主人 @QQ</span><span class="desc">添加小主人</span></div>
<div class="row"><span class="cmd">删小主人 @QQ</span><span class="desc">删除小主人</span></div>
<div class="row"><span class="cmd">加超管 @QQ</span><span class="desc">添加本群超管</span></div>
<div class="row"><span class="cmd">删超管 @QQ</span><span class="desc">删除本群超管</span></div>
<div class="row"><span class="cmd">同步管理权限</span><span class="desc">同步群管理列表</span></div>
<div class="footer">{{time}}</div>
</div></body></html>`,
  },
  help_member: {
    id: "help_member", name: "成员帮助", type: "help", builtin: true,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Microsoft YaHei',sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:24px;display:flex;justify-content:center}
.card{background:#fff;border-radius:16px;padding:28px;width:400px;box-shadow:0 8px 32px rgba(0,0,0,.12)}
.title{font-size:18px;font-weight:700;color:#1e293b;margin-bottom:16px}
.row{display:flex;padding:7px 12px;border-radius:8px;margin-bottom:3px;background:#f8fafc}
.cmd{font-size:13px;font-weight:600;color:#7c3aed;font-family:Consolas,monospace;width:170px;flex-shrink:0}
.desc{font-size:12px;color:#64748b}
.footer{margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:right}
</style></head><body><div class="card">
<div class="title">👥 成员管理</div>
<div class="row"><span class="cmd">踢 @QQ</span><span class="desc">踢出成员</span></div>
<div class="row"><span class="cmd">踢黑 @QQ</span><span class="desc">踢出并拉黑</span></div>
<div class="row"><span class="cmd">禁言 @QQ [分钟]</span><span class="desc">禁言成员</span></div>
<div class="row"><span class="cmd">解禁 @QQ</span><span class="desc">解除禁言</span></div>
<div class="row"><span class="cmd">全体禁言</span><span class="desc">开启全体禁言</span></div>
<div class="row"><span class="cmd">全体解禁</span><span class="desc">关闭全体禁言</span></div>
<div class="row"><span class="cmd">撤回 N / @QQ</span><span class="desc">批量撤回消息</span></div>
<div class="footer">{{time}}</div>
</div></body></html>`,
  },
  help_system: {
    id: "help_system", name: "系统帮助", type: "help", builtin: true,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Microsoft YaHei',sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:24px;display:flex;justify-content:center}
.card{background:#fff;border-radius:16px;padding:28px;width:400px;box-shadow:0 8px 32px rgba(0,0,0,.12)}
.title{font-size:18px;font-weight:700;color:#1e293b;margin-bottom:16px}
.row{display:flex;padding:7px 12px;border-radius:8px;margin-bottom:3px;background:#f8fafc}
.cmd{font-size:13px;font-weight:600;color:#7c3aed;font-family:Consolas,monospace;width:170px;flex-shrink:0}
.desc{font-size:12px;color:#64748b}
.footer{margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:right}
</style></head><body><div class="card">
<div class="title">⚙️ 系统设置</div>
<div class="row"><span class="cmd">开机</span><span class="desc">启用机器人</span></div>
<div class="row"><span class="cmd">关机</span><span class="desc">停用机器人</span></div>
<div class="row"><span class="cmd">闭嘴</span><span class="desc">停止发言</span></div>
<div class="row"><span class="cmd">说话</span><span class="desc">恢复发言</span></div>
<div class="row"><span class="cmd">专属模式 开启/关闭</span><span class="desc">专属模式</span></div>
<div class="row"><span class="cmd">状态</span><span class="desc">查看状态</span></div>
<div class="footer">{{time}}</div>
</div></body></html>`,
  },
  help_blacklist: {
    id: "help_blacklist", name: "名单帮助", type: "help", builtin: true,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Microsoft YaHei',sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:24px;display:flex;justify-content:center}
.card{background:#fff;border-radius:16px;padding:28px;width:400px;box-shadow:0 8px 32px rgba(0,0,0,.12)}
.title{font-size:18px;font-weight:700;color:#1e293b;margin-bottom:16px}
.row{display:flex;padding:7px 12px;border-radius:8px;margin-bottom:3px;background:#f8fafc}
.cmd{font-size:13px;font-weight:600;color:#7c3aed;font-family:Consolas,monospace;width:170px;flex-shrink:0}
.desc{font-size:12px;color:#64748b}
.footer{margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:right}
</style></head><body><div class="card">
<div class="title">📋 黑白名单</div>
<div class="row"><span class="cmd">拉黑 @QQ</span><span class="desc">拉黑并踢出</span></div>
<div class="row"><span class="cmd">删黑 @QQ</span><span class="desc">移除黑名单</span></div>
<div class="row"><span class="cmd">查黑 @QQ</span><span class="desc">查询黑名单</span></div>
<div class="row"><span class="cmd">黑名单</span><span class="desc">黑名单列表</span></div>
<div class="row"><span class="cmd">拉白 @QQ</span><span class="desc">拉白</span></div>
<div class="row"><span class="cmd">删白 @QQ</span><span class="desc">移除白名单</span></div>
<div class="row"><span class="cmd">白名单</span><span class="desc">白名单列表</span></div>
<div class="row"><span class="cmd">退群拉黑 开启/关闭</span><span class="desc">退群自动拉黑</span></div>
<div class="footer">{{time}}</div>
</div></body></html>`,
  },
  help_ad: {
    id: "help_ad", name: "广告帮助", type: "help", builtin: true,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Microsoft YaHei',sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:24px;display:flex;justify-content:center}
.card{background:#fff;border-radius:16px;padding:28px;width:400px;box-shadow:0 8px 32px rgba(0,0,0,.12)}
.title{font-size:18px;font-weight:700;color:#1e293b;margin-bottom:16px}
.row{display:flex;padding:7px 12px;border-radius:8px;margin-bottom:3px;background:#f8fafc}
.cmd{font-size:13px;font-weight:600;color:#7c3aed;font-family:Consolas,monospace;width:200px;flex-shrink:0}
.desc{font-size:12px;color:#64748b}
.footer{margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:right}
</style></head><body><div class="card">
<div class="title">🛡️ 广告杀手</div>
<div class="row"><span class="cmd">开启/关闭广告杀手</span><span class="desc">总开关</span></div>
<div class="row"><span class="cmd">添加撤回关键词 XX</span><span class="desc">添加撤回关键词</span></div>
<div class="row"><span class="cmd">添加禁言关键词 XX</span><span class="desc">添加禁言关键词</span></div>
<div class="row"><span class="cmd">添加踢人关键词 XX</span><span class="desc">添加踢人关键词</span></div>
<div class="row"><span class="cmd">删除关键词 XX</span><span class="desc">删除关键词</span></div>
<div class="row"><span class="cmd">关键词列表</span><span class="desc">查看所有关键词</span></div>
<div class="row"><span class="cmd">设置最大行数/字数 N</span><span class="desc">消息限制</span></div>
<div class="row"><span class="cmd">设置禁言时长 N秒</span><span class="desc">禁言时长</span></div>
<div class="row"><span class="cmd">设置发言违规 类型</span><span class="desc">默认处罚方式</span></div>
<div class="footer">{{time}}</div>
</div></body></html>`,
  },
  status: {
    id: "status", name: "群状态", type: "status", builtin: true,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Microsoft YaHei',sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:24px;display:flex;justify-content:center}
.card{background:#fff;border-radius:16px;padding:28px;width:400px;box-shadow:0 8px 32px rgba(0,0,0,.12)}
.title{font-size:18px;font-weight:700;color:#1e293b;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.stat{background:#f8fafc;padding:12px;border-radius:10px;text-align:center}
.stat-value{font-size:18px;font-weight:700;color:#1e293b}
.stat-label{font-size:11px;color:#94a3b8;margin-top:2px}
.badge{display:inline-flex;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;margin:2px}
.badge-on{background:#dcfce7;color:#16a34a}.badge-off{background:#fee2e2;color:#dc2626}
.section{margin-top:12px;padding-top:12px;border-top:1px solid #e2e8f0}
.section-title{font-size:11px;font-weight:700;color:#7c3aed;margin-bottom:8px}
.row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
.row-label{color:#64748b}.row-value{color:#1e293b;font-weight:600}
.footer{margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:right}
</style></head><body><div class="card">
<div class="title">📊 群状态</div>
<div class="stats">
<div class="stat"><div class="stat-value">{{enabledText}}</div><div class="stat-label">机器人</div></div>
<div class="stat"><div class="stat-value">{{mutedText}}</div><div class="stat-label">发言</div></div>
<div class="stat"><div class="stat-value">{{exclusiveText}}</div><div class="stat-label">专属模式</div></div>
<div class="stat"><div class="stat-value">{{adKillerText}}</div><div class="stat-label">广告杀手</div></div>
</div>
<div class="section"><div class="section-title">详细信息</div>
<div class="row"><span class="row-label">你的身份</span><span class="row-value">{{userLevel}}</span></div>
<div class="row"><span class="row-label">退群拉黑</span><span class="row-value">{{autoBlacklistText}}</span></div>
<div class="row"><span class="row-label">图片模式</span><span class="row-value">{{replyModeText}}</span></div>
<div class="row"><span class="row-label">主人</span><span class="row-value">{{ownerCount}} 人</span></div>
<div class="row"><span class="row-label">小主人</span><span class="row-value">{{adminCount}} 人</span></div>
<div class="row"><span class="row-label">本群超管</span><span class="row-value">{{superAdminCount}} 人</span></div>
</div>
<div class="footer">群号 {{groupId}} · {{time}}</div>
</div></body></html>`,
  },
};

export class TemplateService {
  private db: PluginStore | null = null;
  private initialized = false;

  async init(store: PluginStore): Promise<void> {
    if (this.initialized) return;
    this.db = store;
    await this.db.createTable(TABLE_NAME, [
      "name TEXT NOT NULL",
      "type TEXT NOT NULL",
      "html TEXT NOT NULL",
      "builtin INTEGER NOT NULL DEFAULT 0",
    ]);
    this.initialized = true;
  }

  private getDb(): PluginStore {
    if (!this.db) throw new Error("Template database not initialized");
    return this.db;
  }

  async get(id: string): Promise<Template | null> {
    if (BUILTIN_TEMPLATES[id]) return BUILTIN_TEMPLATES[id];
    if (!this.db) return null;
    const rows = await this.db.query(TABLE_NAME, { id });
    if (rows.length === 0) return null;
    const r = rows[0];
    return { id, name: r.name as string, type: r.type as string, html: r.html as string, builtin: false };
  }

  async getAll(): Promise<Template[]> {
    const list: Template[] = Object.values(BUILTIN_TEMPLATES);
    if (this.db) {
      const rows = await this.db.query(TABLE_NAME);
      for (const r of rows) {
        if (!BUILTIN_TEMPLATES[r.id as string]) {
          list.push({ id: r.id as string, name: r.name as string, type: r.type as string, html: r.html as string, builtin: false });
        }
      }
    }
    return list;
  }

  async save(id: string, name: string, type: string, html: string): Promise<void> {
    const db = this.getDb();
    const existing = await db.query(TABLE_NAME, { id });
    if (existing.length > 0) await db.delete(TABLE_NAME, { id });
    await db.insert(TABLE_NAME, { id, name, type, html, builtin: 0 });
  }

  async delete(id: string): Promise<number> {
    if (BUILTIN_TEMPLATES[id]) return 0;
    return this.getDb() ? await this.getDb().delete(TABLE_NAME, { id }) : 0;
  }

  async render(id: string, vars: Record<string, string>): Promise<string | null> {
    const tpl = await this.get(id);
    if (!tpl) return null;
    return applyTemplate(tpl.html, vars);
  }

  textToHtml(text: string, type?: string): string {
    const escaped = escapeHtml(text).replace(/\n/g, "<br>");
    const title = type === "help" ? "📖 帮助" : type === "status" ? "📊 状态" : "📋 信息";
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Microsoft YaHei',sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px;display:flex;justify-content:center}
.card{background:#fff;border-radius:12px;padding:24px;max-width:420px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,.15)}
.title{font-size:16px;font-weight:700;color:#1e293b;margin-bottom:12px;padding-bottom:12px;border-bottom:2px solid #e2e8f0}
.content{font-size:13px;color:#475569;line-height:1.8;white-space:pre-wrap;word-break:break-all}
.footer{margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:right}
</style></head><body><div class="card">
<div class="title">${title}</div>
<div class="content">${escaped}</div>
<div class="footer">${new Date().toLocaleString("zh-CN")}</div>
</div></body></html>`;
  }

  getBuiltinTemplateVars(): Record<string, { name: string; desc: string }[]> {
    return {
      help: [{ name: "time", desc: "当前时间" }, { name: "content", desc: "文本内容" }],
      status: [
        { name: "groupId", desc: "群号" }, { name: "enabledText", desc: "机器人状态" },
        { name: "mutedText", desc: "发言状态" }, { name: "exclusiveText", desc: "专属模式" },
        { name: "adKillerText", desc: "广告杀手" }, { name: "userLevel", desc: "用户身份" },
        { name: "autoBlacklistText", desc: "退群拉黑" }, { name: "replyModeText", desc: "回复模式" },
        { name: "ownerCount", desc: "主人数" }, { name: "adminCount", desc: "小主人数" },
        { name: "superAdminCount", desc: "超管数" }, { name: "time", desc: "时间" },
      ],
      list: [{ name: "count", desc: "数量" }, { name: "listHtml", desc: "列表HTML" }, { name: "time", desc: "时间" }],
    };
  }
}

export const templateService = new TemplateService();
