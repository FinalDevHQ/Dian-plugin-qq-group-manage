import { useState, useEffect, useCallback } from "react"
import { API, apiFetch } from "../api"
import { Card, CardHeader, CardContent, Input, Button } from "../components"

interface ScheduleTask {
  id: number
  groupId: string
  taskType: string
  timeSpec: string
  content: string
  enabled: boolean
}

interface GroupInfo {
  groupId: string
  groupName: string
  memberCount: number
}

const TASK_TYPE_LABELS: Record<string, string> = {
  boot: "定时开机",
  shutdown: "定时关机",
  mute: "定时禁言",
  unmute: "定时解禁",
  loop: "循环消息",
  timed: "定时消息",
}

const TASK_TYPE_COLORS: Record<string, string> = {
  boot: "bg-emerald-100 text-emerald-700",
  shutdown: "bg-red-100 text-red-700",
  mute: "bg-yellow-100 text-yellow-700",
  unmute: "bg-blue-100 text-blue-700",
  loop: "bg-purple-100 text-purple-700",
  timed: "bg-cyan-100 text-cyan-700",
}

export default function ScheduleManagement() {
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Add task form
  const [taskType, setTaskType] = useState<string>("mute")
  const [timeSpec, setTimeSpec] = useState("")
  const [content, setContent] = useState("")

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

  const fetchScheduleData = useCallback(async (groupId: string) => {
    try {
      const [settingsRes, tasksRes] = await Promise.all([
        apiFetch(`${API}/schedule/settings/${groupId}`),
        apiFetch(`${API}/schedule/tasks/${groupId}`),
      ])
      const settingsData = await settingsRes.json()
      const tasksData = await tasksRes.json()

      if (settingsData.code === 0) {
        setEnabled(settingsData.data.enabled)
      }
      if (tasksData.code === 0) {
        setTasks(tasksData.data || [])
      }
    } catch (err) {
      showMessage("error", `获取设置失败: ${err}`)
    }
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])
  useEffect(() => { if (selectedGroup) fetchScheduleData(selectedGroup) }, [selectedGroup, fetchScheduleData])

  const handleToggle = async () => {
    if (!selectedGroup) return
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/schedule/settings/${selectedGroup}`, {
        method: "PUT",
        body: JSON.stringify({ enabled: !enabled }),
      })
      const data = await res.json()
      if (data.code === 0) {
        setEnabled(data.data.enabled)
        showMessage("success", data.data.enabled ? "定时任务已开启" : "定时任务已关闭")
      }
    } catch (err) {
      showMessage("error", `更新失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTask = async () => {
    if (!selectedGroup || !timeSpec.trim()) {
      showMessage("error", "请填写时间规格")
      return
    }

    setLoading(true)
    try {
      const res = await apiFetch(`${API}/schedule/tasks/${selectedGroup}`, {
        method: "POST",
        body: JSON.stringify({ taskType, timeSpec: timeSpec.trim(), content: content.trim() }),
      })
      const data = await res.json()
      if (data.code === 0) {
        setTasks(data.data || [])
        setTimeSpec("")
        setContent("")
        showMessage("success", "任务已添加")
      } else {
        showMessage("error", data.message || "添加失败")
      }
    } catch (err) {
      showMessage("error", `添加失败: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!selectedGroup) return
    if (!confirm("确定要删除这个任务吗？")) return

    setLoading(true)
    try {
      const res = await apiFetch(`${API}/schedule/tasks/${selectedGroup}/${taskId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.code === 0) {
        setTasks(data.data || [])
        showMessage("success", "任务已删除")
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
        <h1 className="text-2xl font-bold text-slate-900">定时任务</h1>
        <p className="text-sm text-slate-500 mt-1">管理定时开关机、禁言、循环消息等</p>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>{message.text}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 群列表 */}
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

        {/* 右侧内容 */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!selectedGroup ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">请从左侧选择一个群</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 开关 */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-slate-900">{selectedGroupInfo?.groupName || "定时任务"}</h2>
                  <p className="text-xs text-slate-500">群号: {selectedGroup}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900">定时任务</div>
                      <div className="text-xs text-slate-500">{enabled ? "已开启" : "已关闭"}</div>
                    </div>
                    <Button variant={enabled ? "default" : "secondary"} onClick={handleToggle} disabled={loading}>
                      {enabled ? "关闭" : "开启"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 添加任务 */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-slate-900">添加任务</h2>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">任务类型</label>
                      <select
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={taskType}
                        onChange={(e) => setTaskType(e.target.value)}
                      >
                        <option value="boot">定时开机</option>
                        <option value="shutdown">定时关机</option>
                        <option value="mute">定时禁言</option>
                        <option value="unmute">定时解禁</option>
                        <option value="loop">循环消息</option>
                        <option value="timed">定时消息</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">
                        {taskType === "loop" ? "间隔（分钟）" : "时间"}
                      </label>
                      <Input
                        placeholder={taskType === "loop" ? "30" : "8时30分 / 每天8时0分 / 星期一8时0分"}
                        value={timeSpec}
                        onChange={(e) => setTimeSpec(e.target.value)}
                      />
                      <div className="text-xs text-slate-400 mt-1">
                        {taskType === "loop"
                          ? "输入分钟数，如 30 表示每30分钟"
                          : "支持格式：8时30分、每天8时0分、星期一8时0分"}
                      </div>
                    </div>

                    {(taskType === "loop" || taskType === "timed") && (
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">消息内容</label>
                        <Input
                          placeholder="输入要发送的消息"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                        />
                      </div>
                    )}

                    <Button onClick={handleAddTask} disabled={loading}>
                      添加任务
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 任务列表 */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-slate-900">任务列表</h2>
                  <p className="text-xs text-slate-500">共 {tasks.length} 个任务</p>
                </CardHeader>
                <CardContent>
                  {tasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">暂无任务</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${TASK_TYPE_COLORS[task.taskType] || "bg-slate-100 text-slate-700"}`}>
                              {TASK_TYPE_LABELS[task.taskType] || task.taskType}
                            </span>
                            <div>
                              <div className="text-sm font-medium text-slate-900">{task.timeSpec}</div>
                              {task.content && (
                                <div className="text-xs text-slate-500 truncate max-w-[200px]">{task.content}</div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDeleteTask(task.id)}
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
