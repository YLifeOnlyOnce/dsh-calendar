/** `calendar` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'calendar'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'nav': '📅 日程表',
  'layout.title': '布局设置',
  'layout.tip': '拖动卡片左上角 ⠿ 调整位置',
  'layout.reset': '恢复默认布局',
  'layout.done': '完成',
  'widget.stats': '统计概览',
  'widget.year': '年度热力图',
  'widget.week': '7天时间线',
  'widget.day': '日视图时间轴',
  'widget.month': '月历',
  'view.year': '年',
  'view.month': '月',
  'view.week': '7天',
  'view.day': '日',
  'today': '今天',
  'stats.active': '总活跃',
  'stats.sessions': '活跃会话',
  'stats.turns': '轮次',
  'stats.tools': '工具调用',
  'stats.prompts': '输入',
  'stats.failed': '失败',
  'stat.thisYear': '今年',
  'stat.thisMonth': '本月',
  'stat.today': '今天',
  'stat.allTime': '累计',
  'day.noActivity': '这一天没有记录到 DeepSeek 活动',
  'month.noActivity': '这个月没有活动记录',
  'year.noActivity': '这一年没有活动记录',
  'heat.less': '较少',
  'heat.more': '较多',
  'heat.activeDays': '{count} 个活跃日',
  'heat.totalActive': '总活跃 {duration}',
  'tooltip.turns': '{count} 轮',
  'tooltip.tools': '{count} 次工具',
  'tooltip.prompts': '{count} 次输入',
  'tooltip.sessions': '{count} 个会话',
  'duration.minutes': '{minutes} 分钟',
  'duration.hours': '{hours} 小时 {minutes} 分',
  'session.running': '运行中',
  'day.timeline': '当日时间线',
  'empty.title': '还没有活动数据',
  'empty.desc': '当 DeepSeek 开始执行任务后，这里会显示它的使用日程',
} as const

/** English dictionary, key-identical to the Chinese source of truth. */
export const en: Record<CalendarKey, string> = {
  'nav': '📅 Calendar',
  'layout.title': 'Layout',
  'layout.tip': 'Drag the ⠿ handle on a card to rearrange',
  'layout.reset': 'Reset layout',
  'layout.done': 'Done',
  'widget.stats': 'Stats',
  'widget.year': 'Year heatmap',
  'widget.week': '7-day timeline',
  'widget.day': 'Day timeline',
  'widget.month': 'Month grid',
  'view.year': 'Year',
  'view.month': 'Month',
  'view.week': '7d',
  'view.day': 'Day',
  'today': 'Today',
  'stats.active': 'Active',
  'stats.sessions': 'Sessions',
  'stats.turns': 'Turns',
  'stats.tools': 'Tools',
  'stats.prompts': 'Prompts',
  'stats.failed': 'Failed',
  'stat.thisYear': 'this year',
  'stat.thisMonth': 'this month',
  'stat.today': 'today',
  'stat.allTime': 'all time',
  'day.noActivity': 'No DeepSeek activity recorded on this day',
  'month.noActivity': 'No activity recorded this month',
  'year.noActivity': 'No activity recorded this year',
  'heat.less': 'Less',
  'heat.more': 'More',
  'heat.activeDays': '{count} active days',
  'heat.totalActive': '{total} active',
  'tooltip.turns': '{count} turns',
  'tooltip.tools': '{count} tool calls',
  'tooltip.prompts': '{count} prompts',
  'tooltip.sessions': '{count} sessions',
  'duration.minutes': '{minutes} min',
  'duration.hours': '{hours} h {minutes} min',
  'session.running': 'running',
  'day.timeline': 'Timeline',
  'empty.title': 'No activity yet',
  'empty.desc': 'Once DeepSeek starts working, its usage calendar appears here',
}

/** Key set of the calendar dictionaries. */
export type CalendarKey = keyof typeof zh

/** Translator signature with `{name}` interpolation params. */
export type Translator = (key: CalendarKey, params?: Record<string, string | number>) => string

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Usage-calendar copy. */
    'calendar': CalendarKey
  }
}
