import { useState, useEffect, useCallback } from "react"
import { API, apiFetch } from "../api"
import { Card, CardHeader, CardContent, Input, Button } from "../components"

interface CardSettings {
  groupId: string
  enabled: boolean
  renameNotify: boolean
  lockCard: boolean
  prefix: string
}

interface GroupInfo {
  groupId: string
  groupName: string
  memberCount: number
}

export default function CardManagement() {
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [settings, setSettings] = useState<CardSettings | null>(null)
  const [prefix, setPrefix] = useState("")
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
      }
    } catch (err) {
      showMessage("error", `获取失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSettings = useCallback(async (groupId: string) => {
    try {
      const res = await apiFetch(`${API}/card/settings/${groupId}`)
      const data = await res.json()
      if (data.code === 0) {
        setSettings(data.data)
        setPrefix(data.data.prefix || "")
      }
    } catch (err) {
      showMessage("error", `获取设置失败: ${err}`)
    }
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])
  useEffect(() => { if (selectedGroup) fetchSettings(selectedGroup) }, [selectedGroup, fetchSettings])

  const handleToggle = async (field: keyof CardSettings, value: boolean) => {
    if (!selectedGroup) return
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/card/settings/${selectedGroup}`, {
        method: "PUT",
        body: JSON.stringify({ [field]: value }),
      })
      const data = await res.json()
      if (data.code === 0) {
        setSettings(data.data)
        showMessage("success", "已更新")
      }
    } catch (err) {
      showMessage("error", `更新失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSetPrefix = async () => {
    if (!selectedGroup || !prefix.trim()) { showMessage("error", "请输入前缀"); return }
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/card/settings/${selectedGroup}`, {
        method: "PUT",
        body: JSON.stringify({ prefix: prefix.trim() }),
      })
      const data = await res.json()
      if (data.code === 0) {
        setSettings(data.data)
        showMessage("success", `马甲前缀已设为：${prefix.trim()}`)
      }
    } catch (err) {
      showMessage("error", `设置失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClearPrefix = async () => {
    if (!selectedGroup) return
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/card/settings/${selectedGroup}`, {
        method: "PUT",
        body: JSON.stringify({ prefix: "" }),
      })
      const data = await res.json()
      if (data.code === 0) {
        setSettings(data.data)
        setPrefix("")
        showMessage("success", "马甲前缀已清除")
      }
    } catch (err) {
      showMessage("error", `清除失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const selectedGroupInfo = groups.find(g => g.groupId === selectedGroup)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">名片系统</h1>
        <p className="text-sm text-slate-500 mt-1">管理群成员名片、马甲前缀</p>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>{message.text}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">群列表</h2>
              <Button variant="ghost" onClick={fetchGroups} disabled={loading}>刷新</Button>
            </div>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
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
                    <div className="text-sm font-medium truncate max-w-[180px]">{group.groupName || "未知群名"}</div>
                    <div className={`text-xs mt-1 ${selectedGroup === group.groupId ? "text-slate-300" : "text-slate-400"}`}>
                      {group.groupId} · {group.memberCount}人
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 flex flex-col gap-6">
          {!selectedGroup ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">请从左侧选择一个群</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900">{selectedGroupInfo?.groupName || "名片设置"}</h2>
                <p className="text-xs text-slate-500">群号: {selectedGroup}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">名片系统</div>
                      <div className="text-xs text-slate-500">{settings?.enabled ? "已开启" : "已关闭"}</div>
                    </div>
                    <Button variant={settings?.enabled ? "default" : "secondary"} onClick={() => handleToggle("enabled", !settings?.enabled)} disabled={loading}>
                      {settings?.enabled ? "关闭" : "开启"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">改名提示</div>
                      <div className="text-xs text-slate-500">{settings?.renameNotify ? "成员修改名片时自动提示" : "关闭"}</div>
                    </div>
                    <Button variant={settings?.renameNotify ? "default" : "secondary"} onClick={() => handleToggle("renameNotify", !settings?.renameNotify)} disabled={loading || !settings?.enabled}>
                      {settings?.renameNotify ? "关闭" : "开启"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">锁定名片</div>
                      <div className="text-xs text-slate-500">{settings?.lockCard ? "禁止修改，违者自动恢复" : "关闭"}</div>
                    </div>
                    <Button variant={settings?.lockCard ? "default" : "secondary"} onClick={() => handleToggle("lockCard", !settings?.lockCard)} disabled={loading || !settings?.enabled}>
                      {settings?.lockCard ? "关闭" : "开启"}
                    </Button>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                    <div className="text-sm font-medium text-slate-900 mb-2">马甲前缀</div>
                    <div className="text-xs text-slate-500 mb-3">新成员入群自动添加前缀</div>
                    <div className="flex gap-3">
                      <Input placeholder="如：萌宝●" value={prefix} onChange={(e) => setPrefix(e.target.value)} disabled={loading || !settings?.enabled} />
                      <Button onClick={handleSetPrefix} disabled={loading || !settings?.enabled}>设置</Button>
                      <Button variant="ghost" onClick={handleClearPrefix} disabled={loading || !settings?.enabled || !settings?.prefix}>清除</Button>
                    </div>
                    {settings?.prefix && (
                      <div className="text-xs text-slate-400 mt-2">当前前缀：{settings.prefix}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
