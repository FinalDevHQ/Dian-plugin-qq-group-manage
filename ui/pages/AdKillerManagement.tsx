import { useState, useEffect, useCallback } from "react"
import { API, apiFetch } from "../api"
import { Card, CardHeader, CardContent, Input, Button, ConfirmModal } from "../components"

interface AdKeyword {
  groupId: string
  keyword: string
  punishment: string
}

interface AdSettings {
  groupId: string
  enabled: boolean
  maxLines: number
  maxChars: number
  defaultPunishment: string
  muteDuration: number
}

interface GroupInfo {
  groupId: string
  groupName: string
  memberCount: number
}

type Scope = "global" | "group"

const PUNISHMENT_MAP: Record<string, { label: string; color: string; bg: string }> = {
  recall: { label: "撤回", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  recall_mute: { label: "撤回并禁言", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  recall_kick: { label: "撤回并踢出", color: "text-red-700", bg: "bg-red-50 border-red-200" },
}

const DURATION_PRESETS = [
  { label: "1分钟", value: 60 },
  { label: "10分钟", value: 600 },
  { label: "30分钟", value: 1800 },
  { label: "1小时", value: 3600 },
  { label: "12小时", value: 43200 },
  { label: "24小时", value: 86400 },
]

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时`
  return `${Math.floor(seconds / 86400)}天`
}

export default function AdKillerManagement() {
  const [scope, setScope] = useState<Scope>("global")
  const [groupId, setGroupId] = useState("")
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [keywords, setKeywords] = useState<AdKeyword[]>([])
  const [settings, setSettings] = useState<AdSettings | null>(null)
  const [newKeyword, setNewKeyword] = useState("")
  const [newPunishment, setNewPunishment] = useState("recall")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [modal, setModal] = useState<{ open: boolean; title: string; message: string; danger: boolean; confirmText: string; onConfirm: () => void }>({
    open: false, title: "", message: "", danger: false, confirmText: "确认", onConfirm: () => {},
  })

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const fetchGroups = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/groups`)
      const data = await res.json()
      if (data.ok && data.groups) {
        setGroups(data.groups)
      }
    } catch {}
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const fetchKeywords = useCallback(async () => {
    if (scope === "group" && !groupId) { setKeywords([]); return }
    setLoading(true)
    try {
      const url = scope === "global"
        ? `${API}/ad-killer/keywords`
        : `${API}/ad-killer/keywords?groupId=${groupId}`
      const res = await apiFetch(url)
      const data = await res.json()
      if (data.ok) {
        setKeywords(data.keywords || [])
      } else {
        showMessage("error", data.message || "获取关键词失败")
      }
    } catch (err) {
      showMessage("error", `获取失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [scope, groupId])

  const fetchSettings = useCallback(async () => {
    if (scope === "group" && !groupId) { setSettings(null); return }
    try {
      const url = scope === "global"
        ? `${API}/ad-killer/settings`
        : `${API}/ad-killer/settings?groupId=${groupId}`
      const res = await apiFetch(url)
      const data = await res.json()
      if (data.ok) {
        setSettings(data.settings)
      }
    } catch (err) {
      showMessage("error", `获取设置失败: ${err}`)
    }
  }, [scope, groupId])

  useEffect(() => {
    fetchKeywords()
    fetchSettings()
  }, [fetchKeywords, fetchSettings])

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) {
      showMessage("error", "请输入关键词")
      return
    }
    setLoading(true)
    try {
      const body: Record<string, string> = {
        keyword: newKeyword.trim(),
        punishment: newPunishment,
      }
      if (scope === "group" && groupId) body.groupId = groupId

      const res = await apiFetch(`${API}/ad-killer/keywords`, {
        method: "POST",
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.ok) {
        setKeywords(data.keywords)
        setNewKeyword("")
        showMessage("success", data.message)
      } else {
        showMessage("error", data.message || "添加失败")
      }
    } catch (err) {
      showMessage("error", `添加失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteKeyword = (keyword: string) => {
    setModal({
      open: true,
      title: "删除关键词",
      message: `确定要删除「${keyword}」吗？此操作不可撤销。`,
      danger: true,
      confirmText: "删除",
      onConfirm: async () => {
        setLoading(true)
        try {
          const body: Record<string, string> = { keyword }
          if (scope === "group" && groupId) body.groupId = groupId
          const res = await apiFetch(`${API}/ad-killer/keywords`, { method: "DELETE", body: JSON.stringify(body) })
          const data = await res.json()
          if (data.ok) {
            setKeywords(data.keywords)
            showMessage("success", data.message)
          } else {
            showMessage("error", data.message || "删除失败")
          }
        } catch (err) {
          showMessage("error", `删除失败: ${err}`)
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleClearKeywords = () => {
    setModal({
      open: true,
      title: "清空关键词",
      message: `确定要清空所有关键词吗？此操作不可撤销。`,
      danger: true,
      confirmText: "清空",
      onConfirm: async () => {
        setLoading(true)
        try {
          const body: Record<string, string> = {}
          if (scope === "group" && groupId) body.groupId = groupId
          const res = await apiFetch(`${API}/ad-killer/keywords/clear`, { method: "DELETE", body: JSON.stringify(body) })
          const data = await res.json()
          if (data.ok) {
            setKeywords([])
            showMessage("success", "已清空所有关键词")
          } else {
            showMessage("error", data.message || "清空失败")
          }
        } catch (err) {
          showMessage("error", `清空失败: ${err}`)
        } finally {
          setLoading(false)
        }
      },
    })
  }

  const handleToggleEnabled = async () => {
    if (!settings) return
    setLoading(true)
    try {
      const body: Record<string, unknown> = { enabled: !settings.enabled }
      if (scope === "group" && groupId) body.groupId = groupId
      const res = await apiFetch(`${API}/ad-killer/settings`, { method: "PUT", body: JSON.stringify(body) })
      const data = await res.json()
      if (data.ok) {
        setSettings(data.settings)
        showMessage("success", data.message)
      } else {
        showMessage("error", data.message || "更新失败")
      }
    } catch (err) {
      showMessage("error", `更新失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSetting = async (updates: Record<string, unknown>) => {
    setLoading(true)
    try {
      if (scope === "group" && groupId) updates.groupId = groupId
      const res = await apiFetch(`${API}/ad-killer/settings`, { method: "PUT", body: JSON.stringify(updates) })
      const data = await res.json()
      if (data.ok) setSettings(data.settings)
    } catch (err) {
      showMessage("error", `更新失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // Group keywords by punishment
  const groupedKeywords: Record<string, AdKeyword[]> = {}
  for (const kw of keywords) {
    const key = kw.punishment || "recall"
    if (!groupedKeywords[key]) groupedKeywords[key] = []
    groupedKeywords[key].push(kw)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">广告杀手</h1>
          <p className="text-sm text-slate-500">管理关键词拦截和自动处罚规则</p>
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

      {/* Scope */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-2">
              <Button variant={scope === "global" ? "default" : "secondary"} onClick={() => { setScope("global"); setGroupId("") }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                全局关键词
              </Button>
              <Button variant={scope === "group" ? "default" : "secondary"} onClick={() => setScope("group")}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                分群关键词
              </Button>
            </div>
            {scope === "group" && (
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 min-w-[200px]"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                <option value="">选择群聊</option>
                {groups.map((g) => (
                  <option key={g.groupId} value={g.groupId}>
                    {g.groupName || g.groupId} ({g.memberCount}人)
                  </option>
                ))}
              </select>
            )}
            {scope === "global" && (
              <span className="text-xs text-slate-400">对所有群生效</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          {/* 开关 */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">开关</h2>
              <p className="text-xs text-slate-400">{scope === "global" ? "全局" : groupId || "未选择"}</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${settings?.enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className="text-sm text-slate-700">{settings?.enabled ? "已开启" : "已关闭"}</span>
                </div>
                <Button variant={settings?.enabled ? "default" : "secondary"} onClick={handleToggleEnabled} disabled={loading}>
                  {settings?.enabled ? "关闭" : "开启"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 消息限制 */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">消息限制</h2>
              <p className="text-xs text-slate-400">超过限制将触发默认处罚</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500">最大行数</label>
                  <Input type="number" min={0} value={settings?.maxLines ?? 0} onChange={(e) => handleUpdateSetting({ maxLines: parseInt(e.target.value) || 0 })} disabled={loading} className="mt-1.5" placeholder="0 = 不限" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">最大字数</label>
                  <Input type="number" min={0} value={settings?.maxChars ?? 0} onChange={(e) => handleUpdateSetting({ maxChars: parseInt(e.target.value) || 0 })} disabled={loading} className="mt-1.5" placeholder="0 = 不限" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 处罚设置 */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">处罚设置</h2>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500">默认处罚方式</label>
                  <select
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    value={settings?.defaultPunishment || "recall"}
                    onChange={(e) => handleUpdateSetting({ defaultPunishment: e.target.value })}
                    disabled={loading}
                  >
                    <option value="recall">撤回消息</option>
                    <option value="recall_mute">撤回 + 禁言</option>
                    <option value="recall_kick">撤回 + 踢出</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">禁言时长</label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {DURATION_PRESETS.map((d) => (
                      <button
                        key={d.value}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          settings?.muteDuration === d.value
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        onClick={() => handleUpdateSetting({ muteDuration: d.value })}
                        disabled={loading}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={settings?.muteDuration ?? 600}
                      onChange={(e) => handleUpdateSetting({ muteDuration: parseInt(e.target.value) || 60 })}
                      disabled={loading}
                      className="w-24"
                    />
                    <span className="text-xs text-slate-400">秒 ({formatDuration(settings?.muteDuration ?? 600)})</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：关键词 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">关键词列表</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{scope === "global" ? "全局" : groupId || "未选择"} · {keywords.length} 个关键词</p>
                </div>
                {keywords.length > 0 && (
                  <Button variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600 text-xs" onClick={handleClearKeywords} disabled={loading}>
                    清空全部
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* 添加 */}
              <div className="flex gap-2.5 mb-5">
                <Input
                  placeholder="输入关键词，多个用逗号隔开"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                  disabled={loading}
                />
                <select
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                  value={newPunishment}
                  onChange={(e) => setNewPunishment(e.target.value)}
                >
                  <option value="recall">撤回</option>
                  <option value="recall_mute">撤回并禁言</option>
                  <option value="recall_kick">撤回并踢出</option>
                </select>
                <Button onClick={handleAddKeyword} disabled={loading} className="shrink-0">
                  添加
                </Button>
              </div>

              {/* 列表 */}
              {keywords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                  <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm text-slate-400">暂无关键词</p>
                  <p className="text-xs text-slate-300 mt-1">添加关键词后将自动拦截包含该词的消息</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {Object.entries(groupedKeywords).map(([punishment, kws]) => {
                    const info = PUNISHMENT_MAP[punishment] || PUNISHMENT_MAP.recall
                    return (
                      <div key={punishment}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${info.bg} ${info.color}`}>
                            {info.label}
                          </span>
                          <span className="text-[11px] text-slate-300">{kws.length} 个</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {kws.map((kw) => (
                            <div
                              key={kw.keyword}
                              className="group flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-sm shadow-sm hover:border-slate-300 hover:shadow transition-all"
                            >
                              <span className="text-slate-700">{kw.keyword}</span>
                              <button
                                className="ml-1 text-slate-300 hover:text-red-500 transition-colors"
                                onClick={() => handleDeleteKeyword(kw.keyword)}
                                disabled={loading}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        danger={modal.danger}
        confirmText={modal.confirmText}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal(prev => ({ ...prev, open: false }))}
      />
    </div>
  )
}
