/**
 * Demo mode: renders the calendar views with a rich synthetic dataset so the
 * project can be screenshotted and previewed without a live harness. Built as
 * a standalone IIFE bundle (`pnpm demo:build`) and opened from `docs/demo.html`
 * — the same components and stylesheet the plugin ships.
 *
 * @module dsh-calendar/client/demo
 */

import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import { animate } from 'animejs'
import { zh, type CalendarKey } from './locales.ts'
import { CALENDAR_CSS } from './calendar.css.ts'
import { YearView } from './YearView.tsx'
import { MonthView } from './MonthView.tsx'
import { WeekView } from './WeekView.tsx'
import { DayView } from './DayView.tsx'
import { RemindersView } from './RemindersView.tsx'
import { TopSessionsView } from './TopSessionsView.tsx'
import { DecryptText } from './decrypt.tsx'
import {
  aggregateDays, dateKey, fmtTokens, sessionHue,
  type SessionRow,
} from './useCalendarData.ts'
import type { CalendarInterval, CalendarSchedule, CalendarValue } from '../types'

// Inject the plugin stylesheet (the demo page owns the theme variables).
{
  const styleTag = document.createElement('style')
  styleTag.textContent = CALENDAR_CSS
  document.head.appendChild(styleTag)
}

// ---------------------------------------------------------------------------
// Deterministic mock data (seeded LCG so screenshots are stable)
// ---------------------------------------------------------------------------

function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

const WORKSPACES = [
  'deepseek harness',
  'learning-space',
  'dsh-companion-concept',
  'nuxt-app',
  'side-project',
]

const SESSION_NAMES = [
  '重构插件打包链路', '修复热力图渲染', '实现周期任务面板', '优化时间轴性能',
  '编写单元测试', '梳理依赖图', '设计 widget 布局', '排查冷会话预热',
  '调试主题适配', '更新文档', '调研 DSH 插件生态', '打磨动画细节',
  '搭建演示页', '整理发布清单', 'Review PR', '写周报',
]

function iso(d: Date): string {
  return d.toISOString()
}

/** One session's activity over the past year + recent intervals. */
function makeValue(id: string, seed: number, end: Date): CalendarValue {
  const rng = makeRng(seed)
  const days: CalendarValue['days'] = []
  const hour = Array.from({ length: 24 }, () => 0)
  let totalActiveMs = 0
  let firstActivityAt: number | undefined
  let lastActivityAt: number | undefined

  // Per-session "personality": how busy and when.
  const busy = 0.4 + rng() * 0.5
  const peakStart = 8 + Math.floor(rng() * 5) // 8–12
  const peakEnd = peakStart + 7 + Math.floor(rng() * 4) // ~15–19

  for (let back = 364; back >= 0; back--) {
    const d = new Date(end)
    d.setDate(d.getDate() - back)
    const dow = d.getDay()
    const isWeekend = dow === 0 || dow === 6
    const recentBoost = back < 30 ? 1.6 : 1
    const p = (isWeekend ? 0.14 : busy) * recentBoost * (0.7 + rng() * 0.6)
    if (rng() > p) continue
    const minutes = Math.round((25 + rng() * 120) * recentBoost)
    const activeMs = minutes * 60_000
    const hourIdx = peakStart + Math.floor(rng() * (peakEnd - peakStart))
    hour[hourIdx] = (hour[hourIdx] ?? 0) + activeMs
    totalActiveMs += activeMs
    if (firstActivityAt === undefined) firstActivityAt = d.getTime()
    lastActivityAt = d.getTime() + activeMs
    days.push({
      date: dateKey(d),
      activeMs,
      turns: Math.max(1, Math.round(minutes / 6)),
      tools: Math.round(minutes * 2.4),
      llmMs: Math.round(activeMs * 0.75),
      prompts: rng() < 0.8 ? Math.max(1, Math.round(minutes / 18)) : 0,
      failedTurns: rng() < 0.3 ? Math.floor(rng() * 2) : 0,
      tokensIn: Math.round(minutes * 320 + rng() * 4000),
      tokensOut: Math.round(minutes * 140 + rng() * 1500),
    })
  }
  days.sort((a, b) => a.date.localeCompare(b.date))

  // Recent intervals: a few task segments per day for the last 4 days.
  const recent: CalendarInterval[] = []
  for (let back = 3; back >= 0; back--) {
    const d = new Date(end)
    d.setDate(d.getDate() - back)
    d.setHours(0, 0, 0, 0)
    const segments = 1 + Math.floor(rng() * 3)
    for (let s = 0; s < segments; s++) {
      const start = d.getTime() + (9 + rng() * 13) * 3_600_000 + Math.floor(rng() * 40) * 60_000
      recent.push({ start, end: start, kind: 'prompt' })
      const turnsInTask = 1 + Math.floor(rng() * 4)
      for (let t = 0; t < turnsInTask; t++) {
        const ts = start + t * (8 + rng() * 14) * 60_000
        const dur = (2 + rng() * 9) * 60_000
        recent.push({ start: ts, end: ts + dur, kind: 'turn' })
      }
    }
  }
  recent.sort((a, b) => a.start - b.start)

  // Recurring reminders.
  const schedules: CalendarSchedule[] = []
  const scheduleHistory: CalendarValue['scheduleHistory'] = []
  const kinds: Array<CalendarSchedule['kind']> = ['at', 'every', 'after']
  const prompts = ['早上好，帮我梳理今天的关键任务', '检查一下依赖升级的影响', '汇总本周进展', '整理代码审查意见']
  for (let i = 0; i < Math.floor(rng() * 3); i++) {
    const kind = kinds[Math.floor(rng() * kinds.length)] ?? 'every'
    const sched: CalendarSchedule = {
      id: `s${id}-${i}`,
      kind,
      prompt: prompts[Math.floor(rng() * prompts.length)] ?? '提醒',
      scheduledAt: iso(new Date(end.getTime() + (1 + rng() * 5) * 86_400_000)),
      ...(kind === 'every' ? { everySeconds: 86_400 } : {}),
    }
    schedules.push(sched)
  }
  // One reminder fired today, so the day timeline shows a ⏰ marker.
  if (rng() < 0.7) {
    const fired = new Date(end)
    fired.setHours(9 + Math.floor(rng() * 8), Math.floor(rng() * 60), 0, 0)
    schedules.push({
      id: `s${id}-today`,
      kind: 'every',
      prompt: '整理今日进展',
      scheduledAt: iso(fired),
      everySeconds: 86_400,
      lastFiredAt: iso(fired),
    })
    scheduleHistory.push({ id: `s${id}-today`, kind: 'every', firedAt: iso(fired) })
  }
  // A couple of past dispatches for the history panel.
  for (let i = 0; i < Math.floor(rng() * 2); i++) {
    const past = new Date(end)
    past.setDate(past.getDate() - (1 + i))
    past.setHours(10, 0, 0, 0)
    scheduleHistory.push({ id: `s${id}-p${i}`, kind: 'every', firedAt: iso(past) })
  }

  const value: CalendarValue = {
    totalActiveMs,
    days,
    recentIntervals: recent,
    hourProfile: (() => {
      const max = Math.max(...hour, 1)
      return hour.map(v => v / max)
    })(),
    schedules,
    scheduleHistory,
    ...(firstActivityAt !== undefined ? { firstActivityAt } : {}),
    ...(lastActivityAt !== undefined ? { lastActivityAt } : {}),
  }
  return value
}

function makeRows(): SessionRow[] {
  const end = new Date()
  const rows: SessionRow[] = []
  let seed = 42
  for (let w = 0; w < WORKSPACES.length; w++) {
    const count = 5 + Math.floor(((seed * 7) % 5)) // 5–9 sessions per workspace
    for (let i = 0; i < count; i++) {
      seed = (seed * 31 + w * 17 + i * 13) >>> 0
      const id = `session-demo-${w}-${i}-${seed.toString(16)}`
      rows.push({
        id,
        title: `${SESSION_NAMES[(seed + i) % SESSION_NAMES.length]}`,
        cwd: `/Users/you/${WORKSPACES[w]}`,
        value: makeValue(id, seed, end),
        running: w === 0 && i === 0,
      })
    }
  }
  return rows
}

// ---------------------------------------------------------------------------
// Translator over the zh dictionary (no locale service in demo mode)
// ---------------------------------------------------------------------------

function t(key: CalendarKey, params?: Record<string, string | number>): string {
  const template = zh[key] ?? key
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? ''))
}

// ---------------------------------------------------------------------------
// Demo app
// ---------------------------------------------------------------------------

function DemoApp() {
  const rows = makeRows()
  const days = aggregateDays(rows)
  const today = new Date()
  const todayKey = dateKey(today)
  const [light, setLight] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('dsh-cal-demo-light', light)
  }, [light])

  useEffect(() => {
    // Headline decrypt + count-up.
    const values = [...days.values()]
    const total = values.reduce((a, d) => a + d.activeMs, 0)
    const totalTokens = values.reduce((a, d) => a + d.tokensIn + d.tokensOut, 0)
    const sessions = new Set<string>()
    for (const d of values) for (const s of d.sessions) sessions.add(s)
    const stats = [
      { el: document.querySelector('#demo-active'), to: total / 3_600_000, format: (v: number) => `${v.toFixed(0)} h` },
      { el: document.querySelector('#demo-sessions'), to: sessions.size, format: (v: number) => String(Math.round(v)) },
      { el: document.querySelector('#demo-turns'), to: values.reduce((a, d) => a + d.turns, 0), format: (v: number) => String(Math.round(v)) },
      { el: document.querySelector('#demo-tools'), to: values.reduce((a, d) => a + d.tools, 0), format: (v: number) => String(Math.round(v)) },
      { el: document.querySelector('#demo-tokens'), to: totalTokens, format: (v: number) => fmtTokens(v) },
    ]
    for (const { el, to, format } of stats) {
      if (el === null) continue
      const state = { v: 0 }
      animate(state, {
        v: [0, to],
        duration: 900,
        ease: 'outCubic',
        onUpdate: () => { el.textContent = format(state.v) },
      })
    }
  }, [])

  return (
    <div className="dsh-cal-root dsh-cal-demo">
      <header className="dsh-cal-demohead">
        <div>
          <h1 className="dsh-cal-demo-title"><DecryptText text="DeepSeek 使用日程表" active /></h1>
          <p className="dsh-cal-demosub">一眼看清 DeepSeek 在什么时间、做了什么、做了多久 · 演示数据</p>
        </div>
        <button type="button" className="dsh-cal-navbtn" onClick={() => setLight(v => !v)}>
          {light ? '🌙 暗色' : '☀️ 亮色'}
        </button>
      </header>

      <section className="dsh-cal-stats">
        <div className="dsh-cal-stat"><div className="label">{t('stats.active')}</div><div className="value mono"><span id="demo-active">0</span></div></div>
        <div className="dsh-cal-stat"><div className="label">{t('stats.sessions')}</div><div className="value mono"><span id="demo-sessions">0</span></div></div>
        <div className="dsh-cal-stat"><div className="label">{t('stats.turns')}</div><div className="value mono"><span id="demo-turns">0</span></div></div>
        <div className="dsh-cal-stat"><div className="label">{t('stats.tools')}</div><div className="value mono"><span id="demo-tools">0</span></div></div>
        <div className="dsh-cal-stat"><div className="label">{t('stats.tokens')}</div><div className="value mono"><span id="demo-tokens">0</span></div></div>
      </section>

      <section className="dsh-cal-demogrid">
        <div className="dsh-cal-democard demo-year">
          <h3>🗓️ {t('card.year')} <span className="tag">{today.getFullYear()}</span></h3>
          <YearView days={days} year={today.getFullYear()} active onPickDay={() => {}} t={t} />
        </div>
        <div className="dsh-cal-democard demo-week">
          <h3>📅 {t('card.week')}</h3>
          <WeekView rows={rows} weekStart={new Date(today.getTime() - 6 * 86_400_000)} active t={t} />
        </div>
        <div className="dsh-cal-democard demo-day">
          <h3>⏱️ {t('card.day')} · {todayKey}</h3>
          <DayView rows={rows} date={todayKey} active t={t} />
        </div>
        <div className="dsh-cal-democard demo-daycard">
          <h3>🃏 {t('card.day')} · 小组件样式 <span className="tag">compact</span></h3>
          <DayView rows={rows} date={todayKey} active compact t={t} />
        </div>
        <div className="dsh-cal-democard demo-month">
          <h3>🗂️ {t('card.month')}</h3>
          <MonthView days={days} month={today} active onPickDay={() => {}} t={t} />
        </div>
        <div className="dsh-cal-democard demo-reminders">
          <h3>⏰ {t('view.reminders')}</h3>
          <RemindersView rows={rows} active t={t} />
        </div>
        <div className="dsh-cal-democard demo-top">
          <h3>🏆 {t('view.top')}</h3>
          <TopSessionsView rows={rows} monthKey={todayKey.slice(0, 7)} active t={t} />
        </div>
      </section>

      <footer className="dsh-cal-demofoot">
        <span className="dot" style={{ background: `hsl(${sessionHue('session-demo-0-0-0')} 70% 62%)` }} /> 会话专属色 ·
        <span className="swatch" style={{ background: 'var(--dsh-cal-green)' }} /> 用户输入 ·
        <span className="swatch" style={{ background: 'var(--dsh-cal-accent)' }} /> 任务区间 ·
        <span className="swatch" style={{ background: 'var(--dsh-cal-red)' }} /> 现在
      </footer>
    </div>
  )
}

// Standalone entry: render into #root when this bundle is loaded directly.
const root = document.getElementById('root')
if (root !== null) createRoot(root).render(<DemoApp />)
