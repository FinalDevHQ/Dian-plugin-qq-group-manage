import { useState, useEffect, useCallback } from "react"
import { API, apiFetch } from "../api"
import { Card, CardHeader, CardContent, Input, Button } from "../components"

interface LeaderboardEntry {
  userId: string
  nickname: string
  avatar: string
  count: number
  percentage: number
}

interface GroupStats {
  totalToday: number
  totalWeek: number
  totalMonth: number
  totalAll: number
  uniqueToday: number
  uniqueAll: number
}

interface GroupInfo {
  groupId: string
  groupName: string
  memberCount: number
}

interface StatisticsSettings {
  groupId: string
  displayCount: number
  title: string
}

type TimeRange = "today" | "week" | "month" | "all"

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "today", label: "今日" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
  { value: "all", label: "全部" },
]

const MEDALS = ["🥇", "🥈", "🥉"]

export default function StatisticsManagement() {
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [selectedGroup, setSelectedGroup] = useState("")
  const [range, setRange] = useState<TimeRange>("today")
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<GroupStats | null>(null)
  const [settings, setSettings] = useState<StatisticsSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const fetchGroups = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/groups`)
      const data = await res.json()
      if (data.ok && data.groups) setGroups(data.groups)
    } catch {}
  }, [])

  const fetchLeaderboard = useCallback(async () => {
    if (!selectedGroup) { setEntries([]); return }
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/statistics/leaderboard?groupId=${selectedGroup}&range=${range}`)
      const data = await res.json()
      if (data.ok) setEntries(data.entries || [])
    } catch {} finally { setLoading(false) }
  }, [selectedGroup, range])

  const fetchStats = useCallback(async () => {
    if (!selectedGroup) { setStats(null); return }
    try {
      const res = await apiFetch(`${API}/statistics/stats?groupId=${selectedGroup}`)
      const data = await res.json()
      if (data.ok) setStats(data.stats)
    } catch {}
  }, [selectedGroup])

  const fetchSettings = useCallback(async () => {
    if (!selectedGroup) { setSettings(null); return }
    try {
      const res = await apiFetch(`${API}/statistics/settings?groupId=${selectedGroup}`)
      const data = await res.json()
      if (data.ok) setSettings(data.settings)
    } catch {}
  }, [selectedGroup])

  useEffect(() => { fetchGroups() }, [fetchGroups])
  useEffect(() => { fetchLeaderboard(); fetchStats(); fetchSettings() }, [fetchLeaderboard, fetchStats, fetchSettings])

  const handleUpdateSettings = async (updates: Record<string, unknown>) => {
    if (!selectedGroup) return
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/statistics/settings`, {
        method: "PUT",
        body: JSON.stringify({ groupId: selectedGroup, ...updates }),
      })
      const data = await res.json()
      if (data.ok) {
        setSettings(data.settings)
        showMessage("success", data.message || "已更新")
      } else {
        showMessage("error", data.message || "更新失败")
      }
    } catch (err) {
      showMessage("error", `更新失败: ${err}`)
    } finally { setLoading(false) }
  }

  const maxCount = entries.length > 0 ? entries[0].count : 1

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">发言统计</h1>
          <p className="text-sm text-slate-500">群内发言排行榜和数据分析</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
          message.type === "success"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.type === "success" ? (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          {message.text}
        </div>
      )}

      {/* Group Selector */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-4 flex-wrap">
            <select
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 min-w-[200px]"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="">选择群聊</option>
              {groups.map((g) => (
                <option key={g.groupId} value={g.groupId}>
                  {g.groupName || g.groupId} ({g.memberCount}人)
                </option>
              ))}
            </select>
            <div className="flex gap-1.5">
              {RANGE_OPTIONS.map((r) => (
                <Button
                  key={r.value}
                  variant={range === r.value ? "default" : "secondary"}
                  onClick={() => setRange(r.value)}
                  disabled={!selectedGroup}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedGroup && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Leaderboard */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{settings?.title || "本群发言排行榜"}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {RANGE_OPTIONS.find(r => r.value === range)?.label} · {entries.length} 人上榜
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {entries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                    <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-sm text-slate-400">暂无数据</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {entries.map((e, i) => (
                      <div
                        key={e.userId}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                          i === 0 ? "bg-amber-50" : i < 3 ? "bg-slate-50" : "hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="w-7 text-center text-sm font-bold text-slate-500">
                          {i < 3 ? MEDALS[i] : i + 1}
                        </div>
                        <img
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          src={e.avatar}
                          alt=""
                          onError={(ev) => {
                            (ev.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23e2e8f0" width="40" height="40"/><text x="20" y="26" text-anchor="middle" fill="%2394a3b8" font-size="16">${(e.nickname || e.userId).charAt(0)}</text></svg>`
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{e.nickname || e.userId}</div>
                          <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.max((e.count / maxCount) * 100, 2)}%`,
                                background: i === 0 ? "linear-gradient(90deg,#f59e0b,#f97316)" : i < 3 ? "linear-gradient(90deg,#6366f1,#8b5cf6)" : "linear-gradient(90deg,#94a3b8,#64748b)",
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold text-slate-800">{e.count}</span>
                          <span className="text-xs text-slate-400 ml-1">({e.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Stats + Settings */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            {/* Stats */}
            {stats && (
              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-slate-900">数据概览</h2>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "今日消息", value: stats.totalToday, sub: `${stats.uniqueToday}人` },
                      { label: "本周消息", value: stats.totalWeek, sub: "" },
                      { label: "本月消息", value: stats.totalMonth, sub: "" },
                      { label: "总计消息", value: stats.totalAll, sub: `${stats.uniqueAll}人` },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <div className="text-[11px] text-slate-400 uppercase tracking-wider">{s.label}</div>
                        <div className="text-xl font-bold text-slate-800 mt-1 tabular-nums">{s.value}</div>
                        {s.sub && <div className="text-[11px] text-slate-400 mt-0.5">{s.sub}</div>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Settings */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-900">排行榜设置</h2>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500">标题</label>
                    <Input
                      value={settings?.title || ""}
                      onChange={(e) => handleUpdateSettings({ title: e.target.value })}
                      disabled={loading}
                      className="mt-1.5"
                      placeholder="本群发言排行榜"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">显示人数</label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {[5, 10, 15, 20, 30, 50].map((n) => (
                        <button
                          key={n}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            settings?.displayCount === n
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                          onClick={() => handleUpdateSettings({ displayCount: n })}
                          disabled={loading}
                        >
                          {n}人
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
