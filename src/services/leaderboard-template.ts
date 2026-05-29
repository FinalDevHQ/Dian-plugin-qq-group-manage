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

export function renderPersonalStatsHtml(data: {
  nickname: string;
  avatar: string;
  rank: number;
  totalRanked: number;
  stats: { today: number; week: number; month: number; year: number; all: number };
  date: string;
}): string {
  const items = [
    { label: "今日", value: data.stats.today, color: "#6366f1" },
    { label: "本周", value: data.stats.week, color: "#8b5cf6" },
    { label: "本月", value: data.stats.month, color: "#a78bfa" },
    { label: "本年", value: data.stats.year, color: "#c4b5fd" },
    { label: "总计", value: data.stats.all, color: "#7c3aed" },
  ];
  const maxVal = Math.max(...items.map(i => i.value), 1);

  const statsHtml = items.map((item) => {
    const pct = Math.round((item.value / maxVal) * 100);
    return `
    <div class="stat-row">
      <div class="stat-label">${item.label}</div>
      <div class="stat-bar-wrap">
        <div class="stat-bar" style="width:${Math.max(pct, 3)}%;background:${item.color};"></div>
      </div>
      <div class="stat-value">${item.value}</div>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Microsoft YaHei','PingFang SC','Helvetica Neue',sans-serif; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); padding:24px; }
  .card { background:#fff; border-radius:16px; padding:28px; width:380px; margin:0 auto; box-shadow:0 8px 32px rgba(0,0,0,.12); }
  .profile { display:flex; align-items:center; gap:14px; margin-bottom:24px; }
  .avatar { width:56px; height:56px; border-radius:50%; object-fit:cover; border:2.5px solid #e2e8f0; }
  .profile-info { flex:1; }
  .nickname { font-size:18px; font-weight:700; color:#1e293b; }
  .rank-badge { display:inline-flex; align-items:center; gap:4px; margin-top:4px; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600; background:linear-gradient(135deg,#f59e0b,#f97316); color:#fff; }
  .stats { margin-bottom:16px; }
  .stat-row { display:flex; align-items:center; gap:10px; padding:6px 0; }
  .stat-label { width:36px; font-size:12px; font-weight:600; color:#64748b; text-align:right; flex-shrink:0; }
  .stat-bar-wrap { flex:1; height:10px; background:#f1f5f9; border-radius:5px; overflow:hidden; }
  .stat-bar { height:100%; border-radius:5px; transition:width .3s; }
  .stat-value { width:40px; font-size:14px; font-weight:700; color:#1e293b; text-align:right; flex-shrink:0; }
  .footer { margin-top:12px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; text-align:right; }
</style></head><body>
<div class="card">
  <div class="profile">
    <img class="avatar" src="${data.avatar}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 56 56%22><rect fill=%22%23e2e8f0%22 width=%2256%22 height=%2256%22/><text x=%2228%22 y=%2236%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22 font-size=%2222%22>${escapeHtml(data.nickname).charAt(0)}</text></svg>'" />
    <div class="profile-info">
      <div class="nickname">${escapeHtml(data.nickname)}</div>
      <div class="rank-badge">🏆 第 ${data.rank} 名 / ${data.totalRanked} 人</div>
    </div>
  </div>
  <div class="stats">
    ${statsHtml}
  </div>
  <div class="footer">${escapeHtml(data.date)}</div>
</div></body></html>`;
}

export function renderGroupStatsHtml(data: {
  groupName: string;
  stats: { totalToday: number; totalWeek: number; totalMonth: number; totalYear: number; totalAll: number; uniqueToday: number; uniqueAll: number };
  date: string;
}): string {
  const cards = [
    { label: "今日", value: data.stats.totalToday, sub: `${data.stats.uniqueToday}人`, color: "#6366f1" },
    { label: "本周", value: data.stats.totalWeek, sub: "", color: "#8b5cf6" },
    { label: "本月", value: data.stats.totalMonth, sub: "", color: "#a78bfa" },
    { label: "本年", value: data.stats.totalYear, sub: "", color: "#c4b5fd" },
    { label: "总计", value: data.stats.totalAll, sub: `${data.stats.uniqueAll}人`, color: "#7c3aed" },
  ];

  const cardsHtml = cards.map((c) => `
    <div class="stat-card" style="border-left:3px solid ${c.color};">
      <div class="stat-card-value">${c.value}</div>
      <div class="stat-card-label">${c.label}</div>
      ${c.sub ? `<div class="stat-card-sub">${c.sub}</div>` : ""}
    </div>`).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Microsoft YaHei','PingFang SC','Helvetica Neue',sans-serif; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); padding:24px; }
  .card { background:#fff; border-radius:16px; padding:28px; width:400px; margin:0 auto; box-shadow:0 8px 32px rgba(0,0,0,.12); }
  .header { text-align:center; margin-bottom:20px; }
  .header .title { font-size:20px; font-weight:700; color:#1e293b; }
  .header .sub { font-size:12px; color:#94a3b8; margin-top:4px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px; }
  .stat-card { background:#f8fafc; border-radius:10px; padding:14px; }
  .stat-card-value { font-size:22px; font-weight:700; color:#1e293b; }
  .stat-card-label { font-size:11px; color:#94a3b8; margin-top:2px; }
  .stat-card-sub { font-size:11px; color:#a78bfa; margin-top:1px; }
  .footer { margin-top:12px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; text-align:right; }
</style></head><body>
<div class="card">
  <div class="header">
    <div class="title">📊 ${escapeHtml(data.groupName)}</div>
    <div class="sub">发言数据概览</div>
  </div>
  <div class="grid">
    ${cardsHtml}
  </div>
  <div class="footer">${escapeHtml(data.date)}</div>
</div></body></html>`;
}
