import { useState, useEffect, useCallback } from "react"
import { API, apiFetch } from "../api"
import { Card, CardHeader, CardContent, Input, Button } from "../components"

interface Owner {
  qqId: string
}

export default function OwnerManagement() {
  const [owners, setOwners] = useState<string[]>([])
  const [newQQ, setNewQQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchOwners = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/owners`)
      const data = await res.json()
      if (data.ok) {
        setOwners(data.owners)
      }
    } catch (err) {
      console.error("Failed to fetch owners:", err)
    }
  }, [])

  useEffect(() => {
    fetchOwners()
  }, [fetchOwners])

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleAdd = async () => {
    if (!newQQ.trim()) {
      showMessage("error", "请输入QQ号")
      return
    }

    setLoading(true)
    try {
      const res = await apiFetch(`${API}/owners`, {
        method: "POST",
        body: JSON.stringify({ qqId: newQQ.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setOwners(data.owners)
        setNewQQ("")
        showMessage("success", data.message)
      } else {
        showMessage("error", data.message)
      }
    } catch (err) {
      showMessage("error", `添加失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (qqId: string) => {
    if (!confirm(`确定要删除主人 ${qqId} 吗？`)) return

    setLoading(true)
    try {
      const res = await apiFetch(`${API}/owners/${qqId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.ok) {
        setOwners(data.owners)
        showMessage("success", data.message)
      } else {
        showMessage("error", data.message)
      }
    } catch (err) {
      showMessage("error", `删除失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAdd()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">主人管理</h1>
        <p className="text-sm text-slate-500 mt-1">管理超级管理员（主人），拥有最高权限</p>
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

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">添加主人</h2>
          <p className="text-xs text-slate-500">输入QQ号添加为超级管理员</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="输入QQ号"
              value={newQQ}
              onChange={(e) => setNewQQ(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <Button onClick={handleAdd} disabled={loading}>
              {loading ? "添加中..." : "添加"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">主人列表</h2>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
              {owners.length} 人
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {owners.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-slate-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-sm">暂无主人，请先添加</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {owners.map((qqId) => (
                <div
                  key={qqId}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 hover:bg-slate-100/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white text-xs font-bold shadow-sm">
                      👑
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900 font-mono">{qqId}</div>
                      <div className="text-[11px] text-slate-400">超级管理员</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleRemove(qqId)}
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

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">权限说明</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">
                L5
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">主人</div>
                <div className="text-xs text-slate-500">最高权限，可管理所有群，可添加/删除小主人</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 text-xs font-bold">
                L4
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">小主人</div>
                <div className="text-xs text-slate-500">全局管理权限，可管理超管和群管理员</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">
                L3
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">超管</div>
                <div className="text-xs text-slate-500">按群设置的管理权限</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-green-100 text-green-700 text-xs font-bold">
                L2
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">群管理</div>
                <div className="text-xs text-slate-500">QQ群管理员（通过同步管理权限获取）</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                L1
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">普通</div>
                <div className="text-xs text-slate-500">普通群成员</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
