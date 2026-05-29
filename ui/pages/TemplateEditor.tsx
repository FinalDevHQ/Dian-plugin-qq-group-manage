import { useState, useEffect, useCallback } from "react"
import { API, apiFetch } from "../api"
import { Card, CardHeader, CardContent, Input, Button, ConfirmModal } from "../components"

interface Template {
  id: string
  name: string
  type: string
  html: string
  builtin: boolean
}

export default function TemplateEditor() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editType, setEditType] = useState("help")
  const [editHtml, setEditHtml] = useState("")
  const [isNew, setIsNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [modal, setModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
    open: false, title: "", message: "", onConfirm: () => {},
  })

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/templates`)
      const data = await res.json()
      if (data.ok) setTemplates(data.templates || [])
    } catch (err) {
      showMessage("error", `获取失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const handleSelect = (id: string) => {
    const tpl = templates.find((t) => t.id === id)
    if (!tpl) return
    setSelected(id)
    setEditName(tpl.name)
    setEditType(tpl.type)
    setEditHtml(tpl.html)
    setIsNew(false)
  }

  const handleNew = () => {
    setSelected(null)
    setEditName("")
    setEditType("help")
    setEditHtml("<!DOCTYPE html>\n<html><head><meta charset=\"utf-8\">\n<style>\n</style></head><body>\n\n</body></html>")
    setIsNew(true)
  }

  const handleSave = async () => {
    const id = isNew ? editName.replace(/\s+/g, "_").toLowerCase() || `tpl_${Date.now()}` : selected
    if (!id) { showMessage("error", "请选择或创建模板"); return }
    if (!editName.trim()) { showMessage("error", "请输入模板名称"); return }
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/templates`, {
        method: "POST",
        body: JSON.stringify({ id, name: editName, type: editType, html: editHtml }),
      })
      const data = await res.json()
      if (data.ok) {
        showMessage("success", data.message)
        await fetchTemplates()
        setSelected(id)
        setIsNew(false)
      } else {
        showMessage("error", data.message || "保存失败")
      }
    } catch (err) {
      showMessage("error", `保存失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string) => {
    const tpl = templates.find((t) => t.id === id)
    if (!tpl) return
    setModal({
      open: true,
      title: "删除模板",
      message: `确定要删除模板「${tpl.name}」吗？`,
      onConfirm: async () => {
        setLoading(true)
        try {
          const res = await apiFetch(`${API}/templates/${id}`, { method: "DELETE" })
          const data = await res.json()
          if (data.ok) {
            showMessage("success", "已删除")
            if (selected === id) { setSelected(null); setEditHtml("") }
            await fetchTemplates()
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

  const grouped: Record<string, Template[]> = {}
  for (const tpl of templates) {
    if (!grouped[tpl.type]) grouped[tpl.type] = []
    grouped[tpl.type].push(tpl)
  }

  const typeLabels: Record<string, string> = { help: "📖 帮助", status: "📊 状态", list: "📋 列表" }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">模板编辑</h1>
          <p className="text-sm text-slate-500">自定义图片回复的 HTML 模板</p>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
          message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：模板列表 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">模板列表</h2>
                <Button variant="ghost" className="text-xs" onClick={handleNew}>新建</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {Object.entries(grouped).map(([type, tpls]) => (
                  <div key={type}>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      {typeLabels[type] || type}
                    </div>
                    <div className="flex flex-col gap-1">
                      {tpls.map((tpl) => (
                        <button
                          key={tpl.id}
                          className={`group flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            selected === tpl.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                          }`}
                          onClick={() => handleSelect(tpl.id)}
                        >
                          <span className="truncate">{tpl.name}</span>
                          {!tpl.builtin && (
                            <button
                              className={`ml-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                                selected === tpl.id ? "text-white/60 hover:text-white" : "text-slate-300 hover:text-red-500"
                              }`}
                              onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id) }}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：编辑器 */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {!selected && !isNew ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                  <p className="text-sm text-slate-400">选择左侧模板进行编辑</p>
                  <p className="text-xs text-slate-300 mt-1">或点击「新建」创建自定义模板</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-slate-900">{isNew ? "新建模板" : `编辑: ${editName}`}</h2>
                  {selected && templates.find((t) => t.id === selected)?.builtin && (
                    <p className="text-xs text-amber-500">内置模板仅可查看，不能修改</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-slate-500">模板名称</label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} disabled={loading} className="mt-1" />
                    </div>
                    <div className="w-32">
                      <label className="text-xs font-medium text-slate-500">类型</label>
                      <select
                        className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                      >
                        <option value="help">帮助</option>
                        <option value="status">状态</option>
                        <option value="list">列表</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">HTML 模板（支持 {"{{变量}}"} 语法）</label>
                    <textarea
                      className="mt-1 w-full h-80 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-mono outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 resize-y"
                      value={editHtml}
                      onChange={(e) => setEditHtml(e.target.value)}
                      disabled={loading || (templates.find((t) => t.id === selected)?.builtin ?? false)}
                      spellCheck={false}
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" onClick={() => { setSelected(null); setIsNew(false) }}>取消</Button>
                    <Button onClick={handleSave} disabled={loading || (templates.find((t) => t.id === selected)?.builtin ?? false)}>
                      保存
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-slate-900">可用变量</h2>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(editType === "help" ? ["time", "content"] :
                      editType === "status" ? ["groupId", "enabledText", "mutedText", "exclusiveText", "adKillerText", "userLevel", "autoBlacklistText", "replyModeText", "ownerCount", "adminCount", "superAdminCount", "time"] :
                      ["count", "listHtml", "time"]
                    ).map((v) => (
                      <button
                        key={v}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-mono text-slate-600 hover:bg-slate-200 transition-colors"
                        onClick={() => {
                          const ta = document.querySelector("textarea")
                          if (ta) {
                            const pos = ta.selectionStart
                            setEditHtml(editHtml.slice(0, pos) + `{{${v}}}` + editHtml.slice(pos))
                          }
                        }}
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        danger
        confirmText="删除"
        onConfirm={modal.onConfirm}
        onCancel={() => setModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}
