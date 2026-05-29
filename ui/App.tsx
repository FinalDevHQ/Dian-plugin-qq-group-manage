import { useState } from "react"
import Dashboard from "./pages/Dashboard"
import OwnerManagement from "./pages/OwnerManagement"
import GroupManagement from "./pages/GroupManagement"
import AdKillerManagement from "./pages/AdKillerManagement"
import TemplateEditor from "./pages/TemplateEditor"
import NotifyManagement from "./pages/NotifyManagement"
import StatisticsManagement from "./pages/StatisticsManagement"

type Page = "dashboard" | "owners" | "groups" | "ad-killer" | "templates" | "notify" | "statistics"

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard")

  const renderPage = () => {
    switch (currentPage) {
      case "owners":
        return <OwnerManagement />
      case "groups":
        return <GroupManagement />
      case "ad-killer":
        return <AdKillerManagement />
      case "templates":
        return <TemplateEditor />
      case "notify":
        return <NotifyManagement />
      case "statistics":
        return <StatisticsManagement />
      default:
        return <Dashboard />
    }
  }

  const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
    { page: "dashboard", label: "仪表盘", icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></> },
    { page: "owners", label: "主人管理", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { page: "groups", label: "群组管理", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
    { page: "ad-killer", label: "广告杀手", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> },
    { page: "templates", label: "模板编辑", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /> },
    { page: "notify", label: "群内提示", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /> },
    { page: "statistics", label: "发言统计", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
  ]

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white text-sm shadow-sm">
              👥
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">群组管理</div>
              <div className="text-[10px] text-slate-400">QQ Group Manage</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.page}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-colors ${
                currentPage === item.page
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
              onClick={() => setCurrentPage(item.page)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                {item.icon}
              </svg>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="text-[10px] text-slate-400 text-center">Dian Plugin System</div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="px-10 py-6">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}
