/**
 * Day view (M2 baseline): the selected day's activity as a per-session
 * timeline list. Each session row shows its recorded turn spans / prompt
 * points (from `recentIntervals`) plus the day's totals; running sessions
 * pulse. The full 24-hour Gantt axis, recurring-reminder markers, and the
 * live "now" line land in M3.
 *
 * @module dsh-calendar/client/DayView
 */

import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Translator } from './locales.ts'
import { dateKey, fmtDuration, type SessionRow } from './useCalendarData.ts'
import type { CalendarInterval } from '../types'

export interface DayViewProps {
  rows: readonly SessionRow[]
  date: string
  t: Translator
}

function hhmm(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** A session row with its intervals and day bucket for the selected date. */
interface DayRow {
  id: string
  title: string
  running: boolean
  activeMs: number
  turns: number
  tools: number
  prompts: number
  failedTurns: number
  intervals: CalendarInterval[]
}

export function DayView({ rows, date, t }: DayViewProps): ReactNode {
  const dayRows = useMemo<DayRow[]>(() => {
    const out: DayRow[] = []
    for (const row of rows) {
      const value = row.value
      if (value === undefined) continue
      const bucket = value.days.find(d => d.date === date)
      if (bucket === undefined || bucket.activeMs === 0) continue
      const intervals = value.recentIntervals.filter(iv => dateKey(new Date(iv.start)) === date)
      out.push({
        id: row.id,
        title: row.title,
        running: row.running,
        activeMs: bucket.activeMs,
        turns: bucket.turns,
        tools: bucket.tools,
        prompts: bucket.prompts,
        failedTurns: bucket.failedTurns,
        intervals,
      })
    }
    // Sessions with precise intervals first, then by start time.
    out.sort((a, b) => {
      const aStart = a.intervals[0]?.start ?? Number.MAX_SAFE_INTEGER
      const bStart = b.intervals[0]?.start ?? Number.MAX_SAFE_INTEGER
      return aStart - bStart
    })
    return out
  }, [rows, date])

  if (dayRows.length === 0) {
    return <div className="dsh-cal-empty">{t('day.noActivity')}</div>
  }

  return (
    <div className="dsh-cal-day">
      {dayRows.map(row => (
        <div key={row.id} className="dsh-cal-dayrow">
          <div className="time">
            {row.intervals.length > 0
              ? `${hhmm(row.intervals[0]?.start ?? 0)} – ${hhmm(row.intervals[row.intervals.length - 1]?.end ?? 0)}`
              : '—'}
          </div>
          <div className="title">
            {row.title}
            {row.running && <span className="running"> · {t('session.running')}</span>}
          </div>
          <div className="meta">
            {fmtDuration(row.activeMs)} · {t('tooltip.turns', { count: row.turns })} · {t('tooltip.tools', { count: row.tools })}
            {row.failedTurns > 0 ? ` · ${row.failedTurns} ✗` : ''}
          </div>
        </div>
      ))}
    </div>
  )
}
