import { useState, useEffect, useCallback } from "react"
import { API, apiFetch } from "../api"
import { Card, CardHeader, CardContent, Input, Button } from "../components"

interface NotifyConfig {
  groupId: string
  welcomeEnabled: boolean
  welcomeMsg: string
  leaveEnabled: boolean
  leaveMsg: string
  muteOnJoin: boolean
  muteDuration: number
  custom: boolean
}

interface GroupInfo {
  groupId: string
  groupName: string
  memberCount: number
}

const VAR_HELP = [
  { var: "{at}", desc: "@新成员" },
  { var: "{username}", desc: "昵称" },
  { var: "{group_name}", desc: "群名" },
  { var: "{member_count}", desc: "当前人数" },
  { var: "{bot_name}", desc: "机器人名" },
]

const MUTE_PRESETS = [
  { label: "关闭", value: 0 },
  { label: "1分钟", value: 60 },
  { label: "5分钟", value: 300 },
  { label: "10分钟", value: 600 },
  { label: "30分钟", value: 1800 },
]

export default function NotifyManagement() {
  const [globalConfig, setGlobalConfig] = useState<NotifyConfig | null>(null)
  const [groupConfig, setGroupConfig] = useState<NotifyConfig | null>(null)
  const [effectiveConfig, setEffectiveConfig] = useState<NotifyConfig | null>(null)
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [selectedGroup, setSelectedGroup] = useState("")
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

  const fetchGlobalConfig = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/notify/global`)
      const data = await res.json()
      if (data.ok) setGlobalConfig(data.config)
    } catch {}
  }, [])

  const fetchGroupConfig = useCallback(async () => {
    if (!selectedGroup) {
      setGroupConfig(null)
      setEffectiveConfig(null)
      return
    }
    try {
      const res = await apiFetch(`${API}/notify/group/${selectedGroup}`)
      const data = await res.json()
      if (data.ok) {
        setGroupConfig(data.config)
        setEffectiveConfig(data.effective)
      }
    } catch {}
  }, [selectedGroup])

  useEffect(() => { fetchGroups(); fetchGlobalConfig() }, [fetchGroups, fetchGlobalConfig])
  useEffect(() => { fetchGroupConfig() }, [fetchGroupConfig])

  const handleUpdateGlobal = async (updates: Record<string, unknown>) => {
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/notify/global`, { method: "PUT", body: JSON.stringify(updates) })
      const data = await res.json()
      if (data.ok) {
        setGlobalConfig(data.config)
        showMessage("success", data.message || "已更新")
      } else {
        showMessage("error", data.message || "更新失败")
      }
    } catch (err) {
      showMessage("error", `更新失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateGroup = async (updates: Record<string, unknown>) => {
    if (!selectedGroup) return
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/notify/group/${selectedGroup}`, { method: "PUT", body: JSON.stringify(updates) })
      const data = await res.json()
      if (data.ok) {
        setGroupConfig(data.config)
        showMessage("success", data.message || "已更新")
        fetchGroupConfig()
      } else {
        showMessage("error", data.message || "更新失败")
      }
    } catch (err) {
      showMessage("error", `更新失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleResetGroup = async () => {
    if (!selectedGroup) return
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/notify/group/${selectedGroup}`, { method: "DELETE" })
      const data = await res.json()
      if (data.ok) {
        showMessage("success", "已重置为全局默认")
        fetchGroupConfig()
      }
    } catch (err) {
      showMessage("error", `重置失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const config = effectiveConfig || globalConfig

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">群内提示</h1>
          <p className="text-sm text-slate-500">配置欢迎语和退群通知，支持分群自定义</p>
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
            <div className="flex gap-2">
              <Button variant={!selectedGroup ? "default" : "secondary"} onClick={() => setSelectedGroup("")}>
                全局默认
              </Button>
              <Button variant={selectedGroup ? "default" : "secondary"} onClick={() => { if (groups.length > 0 && !selectedGroup) setSelectedGroup(groups[0].groupId) }}>
                分群配置
              </Button>
            </div>
            {selectedGroup && (
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 min-w-[200px]"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                {groups.map((g) => (
                  <option key={g.groupId} value={g.groupId}>
                    {g.groupName || g.groupId} ({g.memberCount}人)
                  </option>
                ))}
              </select>
            )}
            {selectedGroup && groupConfig?.custom && (
              <Button variant="ghost" className="text-xs text-red-500 hover:text-red-600" onClick={handleResetGroup} disabled={loading}>
                重置为全局
              </Button>
            )}
            {selectedGroup && !groupConfig?.custom && (
              <span className="text-xs text-slate-400">当前使用全局默认</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Settings */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Welcome Message */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">欢迎语</h2>
                  <p className="text-xs text-slate-400 mt-0.5">新成员入群时自动发送</p>
                </div>
                <button
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config?.welcomeEnabled ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  onClick={() => {
                    const updates = { welcomeEnabled: !config?.welcomeEnabled }
                    selectedGroup ? handleUpdateGroup(updates) : handleUpdateGlobal(updates)
                  }}
                  disabled={loading}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    config?.welcomeEnabled ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 min-h-[80px] resize-y disabled:opacity-50"
                value={config?.welcomeMsg || ""}
                onChange={(e) => {
                  const updates = { welcomeMsg: e.target.value }
                  selectedGroup ? handleUpdateGroup(updates) : handleUpdateGlobal(updates)
                }}
                disabled={loading}
                placeholder="输入欢迎语内容..."
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {VAR_HELP.map((v) => (
                  <button
                    key={v.var}
                    className="px-2 py-1 rounded-md bg-slate-100 text-[11px] text-slate-600 hover:bg-slate-200 transition-colors font-mono"
                    onClick={() => {
                      const current = config?.welcomeMsg || ""
                      const updates = { welcomeMsg: current + v.var }
                      selectedGroup ? handleUpdateGroup(updates) : handleUpdateGlobal(updates)
                    }}
                    title={v.desc}
                  >
                    {v.var}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Leave Message */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">退群通知</h2>
                  <p className="text-xs text-slate-400 mt-0.5">成员退群时自动发送</p>
                </div>
                <button
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config?.leaveEnabled ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  onClick={() => {
                    const updates = { leaveEnabled: !config?.leaveEnabled }
                    selectedGroup ? handleUpdateGroup(updates) : handleUpdateGlobal(updates)
                  }}
                  disabled={loading}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    config?.leaveEnabled ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 min-h-[80px] resize-y disabled:opacity-50"
                value={config?.leaveMsg || ""}
                onChange={(e) => {
                  const updates = { leaveMsg: e.target.value }
                  selectedGroup ? handleUpdateGroup(updates) : handleUpdateGlobal(updates)
                }}
                disabled={loading}
                placeholder="输入退群通知内容..."
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {VAR_HELP.map((v) => (
                  <button
                    key={v.var}
                    className="px-2 py-1 rounded-md bg-slate-100 text-[11px] text-slate-600 hover:bg-slate-200 transition-colors font-mono"
                    onClick={() => {
                      const current = config?.leaveMsg || ""
                      const updates = { leaveMsg: current + v.var }
                      selectedGroup ? handleUpdateGroup(updates) : handleUpdateGlobal(updates)
                    }}
                    title={v.desc}
                  >
                    {v.var}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Mute on Join */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">入群禁言</h2>
              <p className="text-xs text-slate-400 mt-0.5">新成员入群后自动禁言，防止广告</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {MUTE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      config?.muteDuration === p.value && (p.value === 0 ? !config?.muteOnJoin : config?.muteOnJoin)
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    onClick={() => {
                      const updates = p.value === 0
                        ? { muteOnJoin: false, muteDuration: 0 }
                        : { muteOnJoin: true, muteDuration: p.value }
                      selectedGroup ? handleUpdateGroup(updates) : handleUpdateGlobal(updates)
                    }}
                    disabled={loading}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={config?.muteDuration ?? 0}
                  onChange={(e) => {
                    const sec = parseInt(e.target.value) || 0
                    const updates = sec === 0
                      ? { muteOnJoin: false, muteDuration: 0 }
                      : { muteOnJoin: true, muteDuration: sec }
                    selectedGroup ? handleUpdateGroup(updates) : handleUpdateGlobal(updates)
                  }}
                  disabled={loading}
                  className="w-28"
                  placeholder="秒"
                />
                <span className="text-xs text-slate-400">秒（0 = 关闭）</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview + Variables */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          {/* Preview */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">预览效果</h2>
              <p className="text-xs text-slate-400 mt-0.5">变量替换后的示例</p>
            </CardHeader>
            <CardContent>
              {config?.welcomeEnabled && (
                <div className="mb-4">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">欢迎语</div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-sm text-slate-700 whitespace-pre-wrap break-all">
                    {config.welcomeMsg
                      .replace(/\{at\}/g, "@小明")
                      .replace(/\{username\}/g, "小明")
                      .replace(/\{group_name\}/g, "测试群")
                      .replace(/\{member_count\}/g, "128")
                      .replace(/\{bot_name\}/g, "点点")}
                  </div>
                </div>
              )}
              {config?.leaveEnabled && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">退群通知</div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-sm text-slate-700 whitespace-pre-wrap break-all">
                    {config.leaveMsg
                      .replace(/\{at\}/g, "@小明")
                      .replace(/\{username\}/g, "小明")
                      .replace(/\{group_name\}/g, "测试群")
                      .replace(/\{member_count\}/g, "127")
                      .replace(/\{bot_name\}/g, "点点")}
                  </div>
                </div>
              )}
              {!config?.welcomeEnabled && !config?.leaveEnabled && (
                <div className="py-8 text-center text-sm text-slate-400">所有通知已关闭</div>
              )}
            </CardContent>
          </Card>

          {/* Variables Reference */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">可用变量</h2>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {VAR_HELP.map((v) => (
                  <div key={v.var} className="flex items-center justify-between">
                    <code className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{v.var}</code>
                    <span className="text-xs text-slate-500">{v.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Source Info */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-slate-900">配置来源</h2>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${!selectedGroup ? "bg-blue-500" : groupConfig?.custom ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {!selectedGroup ? "编辑全局默认配置" : groupConfig?.custom ? "当前群已自定义" : "当前使用全局默认"}
                </div>
                {selectedGroup && !groupConfig?.custom && (
                  <p className="text-[11px] text-slate-400">修改后将覆盖全局配置，可通过「重置为全局」恢复</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
