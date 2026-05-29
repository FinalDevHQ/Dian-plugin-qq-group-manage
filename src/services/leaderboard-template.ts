export function renderLeaderboardHtml(data: {
  title: string;
  rangeLabel: string;
  date: string;
  entries: Array<{
    userId: string;
    nickname: string;
    avatar: string;
    count: number;
    percentage: number;
  }>;
  totalMessages: number;
}): string {
  const rows = data.entries.map((e, i) => {
    const name = e.nickname || e.userId;
    const barWidth = Math.max(e.percentage, 2);
    const medals = ["", "", ""];
    const medal = i < 3 ? medals[i] : "";
    const rowBg = i === 0 ? "background:linear-gradient(90deg,#fef3c7,#fde68a);" : i < 3 ? "background:#f8fafc;" : "";

    return `
    <div class="row" style="${rowBg}">
      <div class="rank">${medal || (i + 1)}</div>
      <img class="avatar" src="${e.avatar}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%23e2e8f0%22 width=%2240%22 height=%2240%22/><text x=%2220%22 y=%2226%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22 font-size=%2216%22>${name.charAt(0)}</text></svg>'" />
      <div class="info">
        <div class="name">${escapeHtml(name)}</div>
        <div class="bar-wrap">
          <div class="bar" style="width:${barWidth}%;"></div>
        </div>
      </div>
      <div class="count">${e.count} <span class="pct">(${e.percentage}%)</span></div>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Microsoft YaHei','PingFang SC','Helvetica Neue',sans-serif; background:#f0f2f5; padding:24px; }
  .card { background:#fff; border-radius:16px; padding:24px; max-width:480px; margin:0 auto; box-shadow:0 2px 12px rgba(0,0,0,.08); }
  .header { text-align:center; margin-bottom:20px; }
  .header .date { font-size:13px; color:#94a3b8; margin-bottom:4px; }
  .header .title { font-size:20px; font-weight:700; color:#1e293b; }
  .header .sub { font-size:12px; color:#94a3b8; margin-top:4px; }
  .row { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:10px; margin-bottom:4px; }
  .row:hover { background:#f8fafc; }
  .rank { width:28px; text-align:center; font-size:14px; font-weight:700; color:#64748b; flex-shrink:0; }
  .avatar { width:36px; height:36px; border-radius:50%; object-fit:cover; flex-shrink:0; border:1.5px solid #e2e8f0; }
  .info { flex:1; min-width:0; }
  .name { font-size:13px; font-weight:600; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px; }
  .bar-wrap { height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden; }
  .bar { height:100%; background:linear-gradient(90deg,#6366f1,#8b5cf6); border-radius:3px; transition:width .3s; }
  .count { font-size:14px; font-weight:700; color:#1e293b; white-space:nowrap; text-align:right; min-width:60px; }
  .pct { font-size:11px; font-weight:400; color:#94a3b8; }
  .footer { margin-top:16px; text-align:center; font-size:11px; color:#cbd5e1; }
</style></head><body>
<div class="card">
  <div class="header">
    <div class="date">${escapeHtml(data.date)}</div>
    <div class="title">${escapeHtml(data.title)}</div>
    <div class="sub">${escapeHtml(data.rangeLabel)} · 共 ${data.totalMessages} 条消息</div>
  </div>
  ${rows || '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;">暂无数据</div>'}
  <div class="footer">Powered by Dian QQ Group Manage</div>
</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
