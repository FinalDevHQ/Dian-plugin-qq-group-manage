import { useState } from "react"
import { Card, CardHeader, CardContent } from "../components"

interface CommandDoc {
  category: string
  icon: string
  commands: {
    name: string
    description: string
    example: string
    note?: string
  }[]
}

const docs: CommandDoc[] = [
  {
    category: "权限管理",
    icon: "👑",
    commands: [
      { name: "加主人 @QQ", description: "添加主人权限", example: "加主人 123456" },
      { name: "删主人 @QQ", description: "删除主人权限", example: "删主人 123456" },
      { name: "加小主人 @QQ", description: "添加小主人权限", example: "加小主人 123456" },
      { name: "删小主人 @QQ", description: "删除小主人权限", example: "删小主人 123456" },
      { name: "加超管 @QQ", description: "添加本群超管", example: "加超管 123456" },
      { name: "删超管 @QQ", description: "删除本群超管", example: "删超管 123456" },
      { name: "我的身份", description: "查看当前权限等级", example: "我的身份" },
      { name: "查看权限列表", description: "查看所有权限配置", example: "查看权限列表" },
    ],
  },
  {
    category: "管理员操作",
    icon: "🛡️",
    commands: [
      { name: "设置 @QQ", description: "设置群管理员", example: "设置 @张三", note: "需要机器人为群主" },
      { name: "取消 @QQ", description: "取消群管理员", example: "取消 @张三" },
      { name: "同步", description: "同步群管理员权限", example: "同步" },
    ],
  },
  {
    category: "成员管理",
    icon: "👥",
    commands: [
      { name: "踢 @QQ", description: "踢出群成员", example: "踢 @违规者" },
      { name: "踢黑 @QQ", description: "踢出并拉黑", example: "踢黑 @广告号" },
      { name: "禁言 @QQ", description: "禁言指定成员", example: "禁言 @某人 10", note: "单位：分钟" },
      { name: "解禁 @QQ", description: "解除禁言", example: "解禁 @某人" },
      { name: "全体禁言", description: "开启全体禁言", example: "全体禁言" },
      { name: "全体解禁", description: "关闭全体禁言", example: "全体解禁" },
      { name: "批量撤回 @QQ", description: "撤回指定成员最近消息", example: "批量撤回 @某人 10" },
    ],
  },
  {
    category: "黑白名单",
    icon: "📋",
    commands: [
      { name: "拉黑 @QQ", description: "拉黑并踢出", example: "拉黑 不靠谱#123456" },
      { name: "删黑 @QQ", description: "从黑名单移除", example: "删黑 123456" },
      { name: "拉白 @QQ", description: "加入白名单", example: "拉白 靠谱#123456" },
      { name: "删白 @QQ", description: "从白名单移除", example: "删白 123456" },
      { name: "查黑 @QQ", description: "查询黑名单", example: "查黑 @某人" },
      { name: "查白 @QQ", description: "查询白名单", example: "查白 @某人" },
      { name: "查看黑名单", description: "查看所有黑名单", example: "查看黑名单" },
      { name: "查看白名单", description: "查看所有白名单", example: "查看白名单" },
    ],
  },
  {
    category: "广告杀手",
    icon: "🚫",
    commands: [
      { name: "开启广告杀手", description: "开启广告检测", example: "开启广告杀手" },
      { name: "关闭广告杀手", description: "关闭广告检测", example: "关闭广告杀手" },
      { name: "添加禁言关键词", description: "触发禁言的关键词", example: "添加禁言关键词 充值,加群" },
      { name: "添加撤回关键词", description: "触发撤回的关键词", example: "添加撤回关键词 广告" },
      { name: "添加踢人关键词", description: "触发踢人的关键词", example: "添加踢人关键词 代发" },
      { name: "查看广告设置", description: "查看当前配置", example: "查看广告设置" },
      { name: "删除关键词", description: "删除指定关键词", example: "删除关键词 充值" },
    ],
  },
  {
    category: "群内提示",
    icon: "🔔",
    commands: [
      { name: "设置新人欢迎", description: "设置欢迎消息", example: "设置新人欢迎 欢迎{at}进群！", note: "支持 {at} {username} {group_name} 变量" },
      { name: "设置退群提示", description: "设置退群消息", example: "设置退群提示 {username} 离开了我们" },
      { name: "开启欢迎", description: "开启欢迎消息", example: "开启欢迎" },
      { name: "关闭欢迎", description: "关闭欢迎消息", example: "关闭欢迎" },
      { name: "开启退群提示", description: "开启退群消息", example: "开启退群提示" },
      { name: "关闭退群提示", description: "关闭退群消息", example: "关闭退群提示" },
      { name: "查看群内提示", description: "查看当前配置", example: "查看群内提示" },
    ],
  },
  {
    category: "发言统计",
    icon: "📊",
    commands: [
      { name: "我的发言", description: "查看个人发言统计", example: "我的发言" },
      { name: "今日发言", description: "查看今日排行榜", example: "今日发言" },
      { name: "本周发言", description: "查看本周排行榜", example: "本周发言" },
      { name: "本月发言", description: "查看本月排行榜", example: "本月发言" },
      { name: "发言排行", description: "查看总排行榜", example: "发言排行" },
    ],
  },
  {
    category: "名片系统",
    icon: "📛",
    commands: [
      { name: "开启名片系统", description: "开启名片管理", example: "开启名片系统" },
      { name: "关闭名片系统", description: "关闭名片管理", example: "关闭名片系统" },
      { name: "开改名提示", description: "名片修改时通知", example: "开改名提示" },
      { name: "关改名提示", description: "关闭改名通知", example: "关改名提示" },
      { name: "全员加马甲", description: "给所有人加前缀", example: "全员加马甲 萌宝●" },
      { name: "移除马甲", description: "清除所有前缀", example: "移除马甲" },
      { name: "开启锁定名片", description: "禁止修改名片", example: "开启锁定名片" },
      { name: "关闭锁定名片", description: "允许修改名片", example: "关闭锁定名片" },
    ],
  },
  {
    category: "定时任务",
    icon: "⏰",
    commands: [
      { name: "开定时任务", description: "开启定时任务", example: "开定时任务" },
      { name: "关定时任务", description: "关闭定时任务", example: "关定时任务" },
      { name: "设置定时开机", description: "定时开启机器人", example: "设置定时开机 8时30分" },
      { name: "设置定时关机", description: "定时关闭机器人", example: "设置定时关机 23时0分" },
      { name: "设置全体禁言", description: "定时全体禁言", example: "设置全体禁言 23时0分" },
      { name: "设置全体解禁", description: "定时全体解禁", example: "设置全体解禁 8时0分" },
      { name: "加循环消息", description: "定时循环发送", example: "加循环消息 30[=]记得喝水" },
      { name: "加定时消息", description: "定时发送消息", example: "加定时消息 星期一8时0分[=]周一好" },
      { name: "查看定时任务", description: "查看所有任务", example: "查看定时任务" },
      { name: "删除定时任务", description: "删除指定任务", example: "删除定时任务 1" },
    ],
  },
  {
    category: "系统设置",
    icon: "⚙️",
    commands: [
      { name: "开机", description: "启用机器人", example: "开机" },
      { name: "关机", description: "停用机器人", example: "关机" },
      { name: "闭嘴", description: "停止发言", example: "闭嘴" },
      { name: "说话", description: "恢复发言", example: "说话" },
      { name: "开启专属模式", description: "仅响应主人指令", example: "开启专属模式" },
      { name: "关闭专属模式", description: "响应所有人", example: "关闭专属模式" },
      { name: "查群状态", description: "查看群配置", example: "查群状态" },
      { name: "运行状态", description: "查看系统运行状态", example: "运行状态" },
    ],
  },
  {
    category: "图片模式",
    icon: "🖼️",
    commands: [
      { name: "图片模式 开启", description: "回复以图片形式发送", example: "图片模式 开启" },
      { name: "图片模式 关闭", description: "回复以文字形式发送", example: "图片模式 关闭" },
    ],
  },
]

export default function HelpDocumentation() {
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const filteredDocs = docs.map(category => ({
    ...category,
    commands: category.commands.filter(cmd =>
      cmd.name.includes(searchTerm) ||
      cmd.description.includes(searchTerm) ||
      cmd.example.includes(searchTerm)
    )
  })).filter(category => category.commands.length > 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">使用文档</h1>
        <p className="text-sm text-slate-500 mt-1">查看所有指令和使用方法</p>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="搜索指令..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 快速提示 */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-slate-900">快速入门</h3>
            <div className="text-sm text-slate-600 space-y-1">
              <p>1. 大多数指令需要管理员权限，使用 <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">我的身份</code> 查看你的权限</p>
              <p>2. 指令格式：<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">指令 @QQ 参数</code>，如 <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">禁言 @某人 10</code></p>
              <p>3. 定时任务时间格式：<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">8时30分</code>、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">每天8时0分</code>、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">星期一8时0分</code></p>
              <p>4. 循环消息格式：<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">加循环消息 30[=]内容</code>，每30分钟发送一次</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 指令列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredDocs.map((category) => (
          <Card key={category.category}>
            <CardHeader>
              <button
                className="flex items-center justify-between w-full"
                onClick={() => setExpandedCategory(expandedCategory === category.category ? null : category.category)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{category.icon}</span>
                  <h2 className="text-lg font-semibold text-slate-900">{category.category}</h2>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {category.commands.length} 个指令
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform ${expandedCategory === category.category ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </CardHeader>
            {(expandedCategory === category.category || searchTerm) && (
              <CardContent>
                <div className="flex flex-col gap-3">
                  {category.commands.map((cmd, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <code className="text-sm font-mono font-semibold text-slate-900">{cmd.name}</code>
                          <p className="text-xs text-slate-500 mt-1">{cmd.description}</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-xs text-slate-400 mb-1">示例：</div>
                        <code className="text-xs bg-white px-2 py-1 rounded border border-slate-200 text-emerald-700">
                          {cmd.example}
                        </code>
                      </div>
                      {cmd.note && (
                        <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          {cmd.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* 变量说明 */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">支持的变量</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-900 mb-2">群内提示变量</div>
              <div className="space-y-1 text-xs text-slate-600">
                <p><code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{at}'}</code> — @新成员</p>
                <p><code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{username}'}</code> — 成员昵称</p>
                <p><code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{group_name}'}</code> — 群名称</p>
                <p><code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{member_count}'}</code> — 群人数</p>
                <p><code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{bot_name}'}</code> — 机器人名称</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-900 mb-2">时间格式</div>
              <div className="space-y-1 text-xs text-slate-600">
                <p><code className="bg-slate-100 px-1.5 py-0.5 rounded">8时30分</code> — 每天执行</p>
                <p><code className="bg-slate-100 px-1.5 py-0.5 rounded">每天8时0分</code> — 每天执行</p>
                <p><code className="bg-slate-100 px-1.5 py-0.5 rounded">星期一8时0分</code> — 每周一执行</p>
                <p><code className="bg-slate-100 px-1.5 py-0.5 rounded">30</code> — 循环间隔（分钟）</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
