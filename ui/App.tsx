import { useState } from "react"
import Dashboard from "./pages/Dashboard"

export default function App() {
  return (
    <div className="flex h-screen bg-[#f8fafc]">
      {/* 侧边栏 */}
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white text-sm shadow-sm">
              🔌
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">My Plugin</div>
              <div className="text-[10px] text-slate-400">插件模板</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          <button className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium bg-slate-900 text-white shadow-sm text-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
            <span>仪表盘</span>
          </button>
        </nav>
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="text-[10px] text-slate-400 text-center">Dian Plugin System</div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-10 py-6">
          <Dashboard />
        </div>
      </main>
    </div>
  )
}
