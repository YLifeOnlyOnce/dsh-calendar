/**
 * Day view: a 24-hour Gantt timeline of one day's activity. Sessions group
 * under their workspace; each session row shows its recorded turn spans and
 * prompt points positioned on the hour axis. A pulsing "now" line marks the
 * current time on today's view; bars slide in on entry; hovering a bar shows
 * the exact window.
 *
 * @module dsh-calendar/client/DayView
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { animate, stagger } from 'animejs'
import type { Translator } from './locales.ts'
import { dateKey, fmtDuration, sessionHue, workspaceTitleOf, type SessionRow } from './useCalendarData.ts'
import type { CalendarInterval } from '../types'

export interface DayViewProps {
  rows: readonly SessionRow[]
  date: string
  active: boolean
  t: Translator
}

/** Horizontal pixels per hour. */
const HOUR_W = 40
/** Total axis width for 24 hours. */
const DAY_W = 24 * HOUR_W

/** Minutes-since-midnight of an epoch-ms value. */
function minutesOf(ms: number): number {
  const d = new Date(ms)
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

function hhmm(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}

interface SessionDay {
  id: string
  title: string
  running: boolean
  intervals: CalendarInterval[]
  activeMs: number
  turns: number
  tools: number
}

interface WorkspaceGroup {
  name: string
  sessions: SessionDay[]
}

export function DayView({ rows, date, active, t }: DayViewProps): ReactNode {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)

  const groups = useMemo<WorkspaceGroup[]>(() => {
    const map = new Map<string, SessionDay[]>()
    for (const row of rows) {
      const value = row.value
      if (value === undefined) continue
      const bucket = value.days.find(d => d.date === date)
      if (bucket === undefined || bucket.activeMs === 0) continue
      const intervals = value.recentIntervals.filter(iv => dateKey(new Date(iv.start)) === date)
      const ws = workspaceTitleOf(row.cwd) || '未分组'
      const session: SessionDay = {
        id: row.id,
        title: row.title,
        running: row.running,
        intervals,
        activeMs: bucket.activeMs,
        turns: bucket.turns,
        tools: bucket.tools,
      }
      const arr = map.get(ws)
      if (arr === undefined) map.set(ws, [session])
      else arr.push(session)
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, sessions]) => ({ name, sessions }))
  }, [rows, date])

  const isToday = date === dateKey(new Date())

  // Entry animation: bars slide in from the left (scaleX), staggered.
  useEffect(() => {
    if (!active) return
    const bars = rootRef.current?.querySelectorAll<HTMLElement>('.dsh-cal-bar')
    if (bars === undefined || bars.length === 0) return
    const animation = animate(bars, {
      scaleX: [0, 1],
      opacity: [0, 0.9],
      delay: stagger(24, { start: 0 }),
      duration: 420,
      ease: 'outCubic',
    })
    return () => { animation.cancel() }
  }, [active])

  const showTip = (text: string, x: number, y: number): void => {
    setTip({ text, x: Math.min(x + 12, window.innerWidth - 220), y: Math.min(y + 12, window.innerHeight - 90) })
  }

  const nowMs = Date.now()

  return (
    <div ref={rootRef} className="dsh-cal-day">
      <div className="dsh-cal-daycontent">
        <div className="dsh-cal-axis" style={{ width: DAY_W }}>
          {Array.from({ length: 25 }, (_, h) => (
            <span key={h} className="tick" style={{ left: h * HOUR_W }}>{h === 24 ? '24:00' : `${h}:00`}</span>
          ))}
        </div>

        {groups.map(group => (
          <div key={group.name} className="dsh-cal-wsgroup">
            <div className="dsh-cal-wsname">
              {group.name}
              <span style={{ fontSize: 11, color: 'var(--dsh-cal-muted)', fontWeight: 400 }}>
                {t('tooltip.sessions', { count: group.sessions.length })} · {fmtDuration(group.sessions.reduce((a, s) => a + s.activeMs, 0))}
              </span>
            </div>
            {group.sessions.map(session => (
              <div key={session.id} className="dsh-cal-sessrow">
                <div className="dsh-cal-sessname" title={session.title}>
                  <span className="dot" style={{ background: `hsl(${sessionHue(session.id)} 70% 62%)` }} />
                  {session.title}
                  {session.running && <span style={{ color: 'var(--dsh-cal-green)', marginLeft: 4 }}>●</span>}
                </div>
                <div className="dsh-cal-track" style={{ width: DAY_W }}>
                  {session.intervals.map((iv, i) => {
                    const startMin = minutesOf(iv.start)
                    const endMin = Math.min(minutesOf(iv.end), 24 * 60)
                    const width = Math.max(iv.kind === 'prompt' ? 4 : 3, ((endMin - startMin) / 1440) * DAY_W)
                    const text = iv.kind === 'prompt'
                      ? `${hhmm(iv.start)} ${t('stats.prompts')}`
                      : `${hhmm(iv.start)} – ${hhmm(iv.end)} · ${fmtDuration(iv.end - iv.start)}`
                    return (
                      <div
                        key={i}
                        className={`dsh-cal-bar${iv.kind === 'prompt' ? ' prompt' : ''}${session.running && i === session.intervals.length - 1 ? ' running' : ''}`}
                        style={{ left: (startMin / 1440) * DAY_W, width }}
                        onMouseEnter={e => showTip(text, e.clientX, e.clientY)}
                        onMouseLeave={() => setTip(null)}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}

        {isToday && (
          <div className="dsh-cal-nowline" style={{ left: (minutesOf(nowMs) / 1440) * DAY_W }} />
        )}
      </div>

      {tip !== null && (
        <div className="dsh-cal-tip show" style={{ left: tip.x, top: tip.y }}>
          <div className="line">{tip.text}</div>
        </div>
      )}
    </div>
  )
}
