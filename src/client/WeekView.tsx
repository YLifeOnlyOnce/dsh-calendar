/**
 * Week view: seven consecutive days as columns, each a vertical 24-hour
 * timeline. Session activity renders as color-coded bars (one hue per
 * session, so the same session stays traceable across days); the column's
 * hour grid and the "now" line on today's column anchor the timeline. Bars
 * grow in on entry; hovering shows the session and exact window.
 *
 * @module dsh-calendar/client/WeekView
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { animate, stagger } from 'animejs'
import type { Translator } from './locales.ts'
import { dateKey, fmtDuration, mergeSegments, sessionHue, type SessionRow } from './useCalendarData.ts'
import type { CalendarInterval } from '../types'

export interface WeekViewProps {
  rows: readonly SessionRow[]
  /** First day of the 7-day window. */
  weekStart: Date
  active: boolean
  /** Compact card sizing (main-UI cards); default is the full settings view. */
  compact?: boolean
  /** Open a session (drill into the conversation). */
  onOpenSession?: (sessionId: string) => void
  t: Translator
}

/** Vertical pixels per hour (full view). */
const HOUR_H = 14
/** Compact pixels per hour (main-UI card). */
const HOUR_H_COMPACT = 5
/** Lane width per concurrent session within a column. */
const LANE_W = 10

function minutesOf(ms: number): number {
  const d = new Date(ms)
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

function hhmm(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** One column's session bars (lane-assigned so overlaps never collide). */
interface LaneBar {
  top: number
  height: number
  hue: number
  title: string
  text: string
  sessionId: string
  running: boolean
}

interface WeekColumn {
  date: string
  dowLabel: string
  dayLabel: string
  isToday: boolean
  bars: LaneBar[]
  activeMs: number
}

export function WeekView({ rows, weekStart, active, compact = false, onOpenSession, t }: WeekViewProps): ReactNode {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)
  const hourH = compact ? HOUR_H_COMPACT : HOUR_H
  const dayH = 24 * hourH

  const today = dateKey(new Date())
  const columns = useMemo<WeekColumn[]>(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return d
    })
    return days.map(day => {
      const key = dateKey(day)
      const perSession = new Map<string, { title: string; intervals: CalendarInterval[]; activeMs: number; running: boolean }>()
      for (const row of rows) {
        const value = row.value
        if (value === undefined) continue
        const intervals = value.recentIntervals.filter(iv => dateKey(new Date(iv.start)) === key)
        if (intervals.length === 0) continue
        const existing = perSession.get(row.id)
        if (existing === undefined) {
          perSession.set(row.id, { title: row.title, intervals, activeMs: 0, running: row.running })
        } else {
          existing.intervals.push(...intervals)
        }
      }
      // Lane assignment: sessions in order of their first interval that day.
      const ordered = [...perSession.entries()].sort((a, b) => (a[1].intervals[0]?.start ?? 0) - (b[1].intervals[0]?.start ?? 0))
      const bars: LaneBar[] = []
      let activeMs = 0
      ordered.forEach(([id, session], lane) => {
        activeMs += session.intervals.reduce((a, iv) => a + Math.max(0, iv.end - iv.start), 0)
        for (const seg of mergeSegments(session.intervals)) {
          const startMin = minutesOf(seg.start)
          const endMin = Math.min(minutesOf(seg.end), 24 * 60)
          bars.push({
            top: (startMin / 1440) * dayH,
            height: Math.max(seg.turns === 0 ? 3 : 2, ((endMin - startMin) / 1440) * dayH),
            hue: sessionHue(id),
            title: session.title,
            text: seg.turns === 0
              ? `${session.title} · ${hhmm(seg.start)}`
              : `${session.title} · ${hhmm(seg.start)} – ${hhmm(seg.end)} · ${fmtDuration(seg.end - seg.start)} · ${seg.turns}t`,
            sessionId: id,
            running: session.running,
          })
        }
      })
      return {
        date: key,
        dowLabel: day.toLocaleDateString(undefined, { weekday: 'short' }),
        dayLabel: `${day.getMonth() + 1}/${day.getDate()}`,
        isToday: key === today,
        bars,
        activeMs,
      }
    })
  }, [rows, weekStart, today])

  // Entry animation: bars grow downward (scaleY), staggered.
  useEffect(() => {
    if (!active) return
    const bars = rootRef.current?.querySelectorAll<HTMLElement>('.dsh-cal-wbar')
    if (bars === undefined || bars.length === 0) return
    const animation = animate(bars, {
      scaleY: [0, 1],
      opacity: [0, 0.85],
      delay: stagger(18, { start: 0 }),
      duration: 380,
      ease: 'outCubic',
    })
    return () => { animation.cancel() }
  }, [active])

  const showTip = (text: string, x: number, y: number): void => {
    setTip({ text, x: Math.min(x + 12, window.innerWidth - 260), y: Math.min(y + 12, window.innerHeight - 90) })
  }

  const nowMs = Date.now()

  return (
    <div>
      <div ref={rootRef} className="dsh-cal-week">
        {columns.map(col => (
          <div key={col.date} className="dsh-cal-wcol">
            <div className={`dsh-cal-wday${col.isToday ? ' today' : ''}`}>
              {col.dowLabel}
              <span className="sub"> {col.dayLabel}</span>
            </div>
            <div className="dsh-cal-wtrack" style={{ height: dayH }}>
              {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
                <div key={h} className="dsh-cal-whour" style={{ top: (h / 24) * dayH }}>
                  {!compact && <span className="dsh-cal-whourlabel">{h}:00</span>}
                </div>
              ))}
              {col.bars.map((bar, i) => (
                <div
                  key={i}
                  className={`dsh-cal-wbar${bar.running ? ' running' : ''}`}
                  style={{
                    left: 22 + (i % 8) * (compact ? 4 : LANE_W),
                    top: bar.top,
                    height: bar.height,
                    background: `hsl(${bar.hue} 70% 62%)`,
                  }}
                  onMouseEnter={e => showTip(bar.text, e.clientX, e.clientY)}
                  onMouseLeave={() => setTip(null)}
                  onClick={onOpenSession !== undefined ? () => onOpenSession(bar.sessionId) : undefined}
                />
              ))}
              {col.isToday && (
                <div className="dsh-cal-nowline" style={{ top: (minutesOf(nowMs) / 1440) * dayH, left: 0, right: 0, bottom: 'auto', height: 2 }} />
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--dsh-cal-muted)', textAlign: 'center' }}>
              {col.activeMs > 0 ? fmtDuration(col.activeMs) : '—'}
            </div>
          </div>
        ))}
      </div>

      {tip !== null && (
        <div className="dsh-cal-tip show" style={{ left: tip.x, top: tip.y }}>
          <div className="line">{tip.text}</div>
        </div>
      )}
    </div>
  )
}
