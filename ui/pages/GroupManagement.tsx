import { useState, useEffect, useCallback } from "react"
import { API, apiFetch } from "../api"
import { Card, CardHeader, CardContent, Input, Button } from "../components"

interface GroupInfo {
  groupId: string
  groupName: string
  memberCount: number
  enabled: boolean
  muted: boolean
  exclusiveMode: boolean
  replyMode: string
}

interface GroupSettings {
  groupId: string
  enabled: boolean
  muted: boolean
  exclusiveMode: boolean
  replyMode: string
}

export default function GroupManagement() {
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [settings, setSettings] = useState<GroupSettings | null>(null)
  const [superAdmins, setSuperAdmins] = useState<string[]>([])
  const [newSuperAdmin, setNewSuperAdmin] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/groups`)
      const data = await res.json()
      if (data.ok) {
        setGroups(data.groups || [])
      } else {
        showMessage("error", data.message || "获取群列表失败")
      }
    } catch (err) {
      showMessage("error", `获取失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchGroupSettings = useCallback(async (groupId: string) => {
    try {
      const res = await apiFetch(`${API}/groups/${groupId}/settings`)
      const data = await res.json()
      if (data.ok) {
        setSettings(data.settings)
        setSuperAdmins(data.superAdmins || [])
      }
    } catch (err) {
      showMessage("error", `获取群设置失败: ${err}`)
    }
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupSettings(selectedGroup)
    }
  }, [selectedGroup, fetchGroupSettings])

  const handleToggle = async (field: string, value: boolean | string) => {
    if (!selectedGroup || !settings) return
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/groups/${selectedGroup}/settings`, {
        method: "PUT",
        body: JSON.stringify({ [field]: value }),
      })
      const data = await res.json()
      if (data.ok) {
        setSettings(data.settings)
        setGroups(prev => prev.map(g => 
          g.groupId === selectedGroup ? { ...g, [field]: value } : g
        ))
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

  const handleAddSuperAdmin = async () => {
    if (!selectedGroup || !newSuperAdmin.trim()) {
      showMessage("error", "请输入QQ号")
      return
    }
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/groups/${selectedGroup}/super-admins`, {
        method: "POST",
        body: JSON.stringify({ qqId: newSuperAdmin.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setSuperAdmins(data.superAdmins)
        setNewSuperAdmin("")
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

  const handleRemoveSuperAdmin = async (qqId: string) => {
    if (!selectedGroup) return
    if (!confirm(`确定要删除超管 ${qqId} 吗？`)) return
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/groups/${selectedGroup}/super-admins/${qqId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.ok) {
        setSuperAdmins(data.superAdmins)
        showMessage("success", data.message)
      } else {
        showMessage("error", data.message || "删除失败")
      }
    } catch (err) {
      showMessage("error", `删除失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const selectedGroupInfo = groups.find(g => g.groupId === selectedGroup)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">群组管理</h1>
        <p className="text-sm text-slate-500 mt-1">管理各个群聊的机器人设置</p>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 群列表 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">群列表</h2>
              <Button variant="ghost" onClick={fetchGroups} disabled={loading}>
                刷新
              </Button>
            </div>
            <p className="text-xs text-slate-500">共 {groups.length} 个群</p>
          </CardHeader>
          <CardContent>
            {loading && groups.length === 0 ? (
              <div className="text-center py-8 text-slate-400">加载中...</div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 text-slate-400">暂无群数据</div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
                {groups.map((group) => (
                  <button
                    key={group.groupId}
                    className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors ${
                      selectedGroup === group.groupId
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                    onClick={() => setSelectedGroup(group.groupId)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="text-sm font-medium truncate max-w-[180px]">
                        {group.groupName || "未知群名"}
                      </div>
                      <div className="flex gap-1">
                        {!group.enabled && (
                          <span className="inline-flex items-center rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                            停用
                          </span>
                        )}
                        {group.muted && (
                          <span className="inline-flex items-center rounded-md bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">
                            闭嘴
                          </span>
                        )}
                        {group.exclusiveMode && (
                          <span className="inline-flex items-center rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                            专属
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`text-xs mt-1 ${selectedGroup === group.groupId ? "text-slate-300" : "text-slate-400"}`}>
                      {group.groupId} · {group.memberCount}人
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 群设置详情 */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!selectedGroup ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="text-sm">请从左侧选择一个群</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {selectedGroupInfo?.groupName || "群设置"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    群号: {selectedGroup} · {selectedGroupInfo?.memberCount || 0}人
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">机器人状态</div>
                        <div className="text-xs text-slate-500">{settings?.enabled ? "已启用" : "已停用"}</div>
                      </div>
                      <Button
                        variant={settings?.enabled ? "default" : "secondary"}
                        onClick={() => handleToggle("enabled", !settings?.enabled)}
                        disabled={loading}
                      >
                        {settings?.enabled ? "关机" : "开机"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">发言状态</div>
                        <div className="text-xs text-slate-500">{settings?.muted ? "已闭嘴" : "正常发言"}</div>
                      </div>
                      <Button
                        variant={settings?.muted ? "secondary" : "default"}
                        onClick={() => handleToggle("muted", !settings?.muted)}
                        disabled={loading}
                      >
                        {settings?.muted ? "说话" : "闭嘴"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">专属模式</div>
                        <div className="text-xs text-slate-500">
                          {settings?.exclusiveMode ? "仅响应主人指令" : "响应所有人"}
                        </div>
                      </div>
                      <Button
                        variant={settings?.exclusiveMode ? "default" : "secondary"}
                        onClick={() => handleToggle("exclusiveMode", !settings?.exclusiveMode)}
                        disabled={loading}
                      >
                        {settings?.exclusiveMode ? "关闭" : "开启"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">图片模式</div>
                        <div className="text-xs text-slate-500">
                          {settings?.replyMode === "image" ? "回复以图片形式发送" : "回复以文字形式发送"}
                        </div>
                      </div>
                      <Button
                        variant={settings?.replyMode === "image" ? "default" : "secondary"}
                        onClick={() => handleToggle("replyMode", settings?.replyMode === "image" ? "text" : "image")}
                        disabled={loading}
                      >
                        {settings?.replyMode === "image" ? "切换文字" : "切换图片"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-slate-900">本群超管</h2>
                  <p className="text-xs text-slate-500">按群设置的管理权限</p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 mb-4">
                    <Input
                      placeholder="输入QQ号"
                      value={newSuperAdmin}
                      onChange={(e) => setNewSuperAdmin(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddSuperAdmin()}
                      disabled={loading}
                    />
                    <Button onClick={handleAddSuperAdmin} disabled={loading}>
                      添加
                    </Button>
                  </div>

                  {superAdmins.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-sm">暂无超管</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {superAdmins.map((qqId) => (
                        <div
                          key={qqId}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">
                              L3
                            </div>
                            <div className="text-sm font-medium text-slate-900 font-mono">{qqId}</div>
                          </div>
                          <Button
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleRemoveSuperAdmin(qqId)}
                            disabled={loading}
                          >
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
