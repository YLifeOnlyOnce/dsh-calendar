/**
 * The Calendar settings section: the dsh-calendar page shell. Owns the view
 * switcher (day / 7-day / month / year), the date cursor and navigation, the
 * range-scoped stats cards (decrypt-reveal headline, count-up numbers), and
 * mounts the active view with a remount key so each view's entry animation
 * replays on switch. Data comes from the standard `useSessions` global hook
 * (framework-injected for every root-scope slot).
 *
 * @module dsh-calendar/client/CalendarSection
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { CalendarKey, Translator } from './locales.ts'
import {
  aggregateDays, countUp, dateKey, fmtDuration, parseDateKey,
  type SessionRow,
} from './useCalendarData.ts'
import { DecryptText } from './decrypt.tsx'
import { YearView } from './YearView.tsx'
import { MonthView } from './MonthView.tsx'
import { WeekView } from './WeekView.tsx'
import { DayView } from './DayView.tsx'

type View = 'year' | 'month' | 'week' | 'day'

/** Props delivered by the slot outlet: standard hooks + the locale seat. */
export interface CalendarSectionProps {
  useSessions: SnapshotSelectorHook<SessionListState>
  t: Translator
}

function monthLabel(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

function dayLabel(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** First day of the 7-day window ending on `d`. */
function weekStartOf(d: Date): Date {
  const out = new Date(d)
  out.setDate(d.getDate() - 6)
  return out
}

function weekLabel(d: Date): string {
  const start = weekStartOf(d)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `${start.getMonth() + 1}/${start.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`
}

/** Range text of the cursor under the active view. */
function rangeText(view: View, cursor: Date): string {
  if (view === 'year') return String(cursor.getFullYear())
  if (view === 'month') return monthLabel(cursor)
  if (view === 'week') return weekLabel(cursor)
  return dayLabel(cursor)
}

/** Shift the cursor by one unit of the active view. */
function shiftCursor(view: View, cursor: Date, delta: number): Date {
  const d = new Date(cursor)
  if (view === 'year') d.setFullYear(d.getFullYear() + delta)
  else if (view === 'month') d.setMonth(d.getMonth() + delta)
  else if (view === 'week') d.setDate(d.getDate() + delta * 7)
  else d.setDate(d.getDate() + delta)
  return d
}

/** Count-up integer card. */
function CountUpNumber({ value, active }: { value: number; active: boolean }): ReactNode {
  const ref = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    if (!active || ref.current === null) return
    const cancel = countUp(ref.current, 0, value, v => String(Math.round(v)))
    return cancel
  }, [active, value])
  return <span ref={ref} className="value mono">{value}</span>
}

export function CalendarSection(props: CalendarSectionProps): ReactNode {
  const { useSessions, t } = props
  const sessions = useSessions(s => s)

  const rows = useMemo<SessionRow[]>(() => {
    const out: SessionRow[] = []
    for (const id of sessions.ids) {
      const row = sessions.byId[id]
      if (row === undefined) continue
      out.push({
        id,
        title: row.displayTitle,
        cwd: row.cwd ?? '',
        value: row.projectionValues?.['calendar'],
        running: row.running,
      })
    }
    return out
  }, [sessions])
  const days = useMemo(() => aggregateDays(rows), [rows])
  const hasData = useMemo(() => rows.some(r => r.value !== undefined), [rows])

  const [view, setView] = useState<View>('year')
  const [cursor, setCursor] = useState(() => new Date())

  // Range-scoped stats for the stats cards.
  const stats = useMemo(() => {
    const prefix = view === 'year' ? String(cursor.getFullYear())
      : view === 'month' ? dateKey(cursor).slice(0, 7)
        : view === 'week' ? weekStartOf(cursor)
          : undefined
    let activeMs = 0
    let turns = 0
    let tools = 0
    const sessionSet = new Set<string>()
    for (const [key, agg] of days) {
      let matches: boolean
      if (view === 'year' || view === 'month') matches = key.startsWith(prefix as string)
      else if (view === 'week') {
        const wkStart = prefix as Date
        const wkEnd = new Date(wkStart)
        wkEnd.setDate(wkStart.getDate() + 6)
        matches = key >= dateKey(wkStart) && key <= dateKey(wkEnd)
      } else matches = key === dateKey(cursor)
      if (!matches) continue
      activeMs += agg.activeMs
      turns += agg.turns
      tools += agg.tools
      for (const s of agg.sessions) sessionSet.add(s)
    }
    return { activeMs, sessions: sessionSet.size, turns, tools }
  }, [days, view, cursor])

  const rangeStatKey: CalendarKey = view === 'year' ? 'stat.thisYear' : view === 'month' ? 'stat.thisMonth' : 'stat.today'
  const rangeKey = `${view}:${rangeText(view, cursor)}`

  return (
    <div className="dsh-cal-root">
      <div className="dsh-cal-header">
        <h2 className="dsh-cal-title">
          <DecryptText text={rangeText(view, cursor)} active />
          <span style={{ color: 'var(--dsh-cal-muted)', fontSize: 12, marginLeft: 8 }}>{t(rangeStatKey)}</span>
        </h2>
        <div className="dsh-cal-views">
          {(['day', 'week', 'month', 'year'] as const).map(v => (
            <button key={v} type="button" className={`dsh-cal-viewbtn${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
              {t(`view.${v}` as CalendarKey)}
            </button>
          ))}
        </div>
        <div className="dsh-cal-nav">
          <button type="button" className="dsh-cal-navbtn" onClick={() => setCursor(c => shiftCursor(view, c, -1))}>‹</button>
          <span className="dsh-cal-range">{rangeText(view, cursor)}</span>
          <button type="button" className="dsh-cal-navbtn" onClick={() => setCursor(c => shiftCursor(view, c, 1))}>›</button>
          <button type="button" className="dsh-cal-navbtn primary" onClick={() => setCursor(new Date())}>{t('today')}</button>
        </div>
      </div>

      <div className="dsh-cal-stats">
        <div className="dsh-cal-stat">
          <div className="label">{t('stats.active')} · {t(rangeStatKey)}</div>
          <div className="value mono">
            <DecryptText text={fmtDuration(stats.activeMs)} active />
          </div>
        </div>
        <div className="dsh-cal-stat">
          <div className="label">{t('stats.sessions')}</div>
          <CountUpNumber value={stats.sessions} active />
        </div>
        <div className="dsh-cal-stat">
          <div className="label">{t('stats.turns')}</div>
          <CountUpNumber value={stats.turns} active />
        </div>
        <div className="dsh-cal-stat">
          <div className="label">{t('stats.tools')}</div>
          <CountUpNumber value={stats.tools} active />
        </div>
      </div>

      {hasData ? (
        <div key={rangeKey} className="dsh-cal-viewport">
          {view === 'year' && (
            <YearView days={days} year={cursor.getFullYear()} active onPickDay={date => { setCursor(parseDateKey(date)); setView('day') }} t={t} />
          )}
          {view === 'month' && (
            <MonthView days={days} month={cursor} active onPickDay={date => { setCursor(parseDateKey(date)); setView('day') }} t={t} />
          )}
          {view === 'week' && (
            <WeekView rows={rows} weekStart={weekStartOf(cursor)} active t={t} />
          )}
          {view === 'day' && <DayView rows={rows} date={dateKey(cursor)} active t={t} />}
        </div>
      ) : (
        <div className="dsh-cal-empty">
          <div style={{ fontSize: 26, marginBottom: 8 }}>🗓️</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('empty.title')}</div>
          <div>{t('empty.desc')}</div>
        </div>
      )}
    </div>
  )
}
