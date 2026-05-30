import { useState, useEffect, useCallback } from "react"
import { Card, CardHeader, CardContent, StatCard } from "../components"
import { API, apiFetch } from "../api"

interface SystemInfo {
  cpu: { usage: number; cores: number }
  memory: { used: number; total: number; percent: number }
  os: { platform: string; arch: string }
  node: { version: string; pid: number }
  plugin: { version: string; uptime: number }
  messages: { received: number; sent: number }
  groups: { count: number }
  time: { current: string; startTime: string }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(1)}${units[i]}`
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}天`)
  if (hours > 0) parts.push(`${hours}小时`)
  if (minutes > 0) parts.push(`${minutes}分`)
  parts.push(`${secs}秒`)

  return parts.join("")
}

export default function Dashboard() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uptime, setUptime] = useState("—")

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/system-info`)
      const data = await res.json()
      if (data.code === 0) {
        setSystemInfo(data.data)
        setError(null)
      } else {
        setError("获取系统信息失败")
      }
    } catch {
      setError("无法连接到插件 API")
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!systemInfo?.plugin.uptime) return
    const uptimeSec = systemInfo.plugin.uptime
    setUptime(formatUptime(uptimeSec))
    const t = setInterval(() => {
      setUptime(formatUptime(uptimeSec + Math.floor((Date.now() - Date.now()) / 1000)))
    }, 1000)
    return () => clearInterval(t)
  }, [systemInfo?.plugin.uptime])

  return (
    <div className="flex flex-col gap-6">
      {/* 页头 */}
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white text-2xl shadow-md">
          👥
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900">QQ群组管理</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
              error ? "bg-red-50 text-red-600 ring-red-500/20" : "bg-emerald-50 text-emerald-600 ring-emerald-500/20"
            }`}>
              {error ? "连接失败" : systemInfo ? "运行中" : "加载中"}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            {error || (systemInfo ? `v${systemInfo.plugin.version} · Node ${systemInfo.node.version}` : "—")}
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="运行时长"
          value={uptime}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 15,15"/></svg>}
        />
        <StatCard
          label="管理群数"
          value={systemInfo?.groups.count ?? "—"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>}
        />
        <StatCard
          label="收到消息"
          value={systemInfo?.messages.received ?? "—"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
        />
        <StatCard
          label="发出消息"
          value={systemInfo?.messages.sent ?? "—"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>}
        />
      </div>

      {/* 系统信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">系统信息</h2>
          </CardHeader>
          <CardContent>
            {systemInfo ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">CPU</span>
                  <span className="text-sm font-medium text-slate-900">{systemInfo.cpu.usage}% ({systemInfo.cpu.cores}核)</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">内存</span>
                  <span className="text-sm font-medium text-slate-900">{formatBytes(systemInfo.memory.used)}/{formatBytes(systemInfo.memory.total)} ({systemInfo.memory.percent}%)</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">系统</span>
                  <span className="text-sm font-medium text-slate-900">{systemInfo.os.platform} {systemInfo.os.arch}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Node.js</span>
                  <span className="text-sm font-medium text-slate-900">{systemInfo.node.version}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">进程PID</span>
                  <span className="text-sm font-medium text-slate-900">{systemInfo.node.pid}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">加载中...</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">快速入门</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-sm font-semibold text-slate-900 mb-1">查看帮助</div>
                <code className="text-xs bg-slate-100 px-2 py-1 rounded">群管 帮助</code>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-sm font-semibold text-slate-900 mb-1">开启机器人</div>
                <code className="text-xs bg-slate-100 px-2 py-1 rounded">开机</code>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-sm font-semibold text-slate-900 mb-1">查看运行状态</div>
                <code className="text-xs bg-slate-100 px-2 py-1 rounded">运行状态</code>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-sm font-semibold text-slate-900 mb-1">查看群状态</div>
                <code className="text-xs bg-slate-100 px-2 py-1 rounded">查群状态</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 功能模块 */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">功能模块</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { icon: "👑", name: "权限管理", desc: "5级权限体系" },
              { icon: "👥", name: "成员管理", desc: "踢人禁言" },
              { icon: "📋", name: "黑白名单", desc: "拉黑拉白" },
              { icon: "🚫", name: "广告杀手", desc: "自动检测" },
              { icon: "🔔", name: "群内提示", desc: "欢迎退群" },
              { icon: "📊", name: "发言统计", desc: "排行榜" },
              { icon: "📛", name: "名片系统", desc: "马甲前缀" },
              { icon: "⏰", name: "定时任务", desc: "定时执行" },
              { icon: "🖼️", name: "图片模式", desc: "图片回复" },
              { icon: "📖", name: "使用文档", desc: "指令帮助" },
            ].map((item) => (
              <div key={item.name} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
                <span className="text-2xl">{item.icon}</span>
                <div className="text-sm font-medium text-slate-900">{item.name}</div>
                <div className="text-xs text-slate-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
