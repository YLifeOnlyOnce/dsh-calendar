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
  aggregateDays, countUp, dateKey, fmtDuration, fmtTokens, parseDateKey,
  type SessionRow,
} from './useCalendarData.ts'
import { DecryptText } from './decrypt.tsx'
import { YearView } from './YearView.tsx'
import { MonthView } from './MonthView.tsx'
import { WeekView } from './WeekView.tsx'
import { DayView } from './DayView.tsx'
import { RemindersView } from './RemindersView.tsx'
import { TopSessionsView } from './TopSessionsView.tsx'
import { useCardLayout, CARD_IDS } from './useCardLayout.ts'

type View = 'year' | 'month' | 'week' | 'day' | 'reminders' | 'top'

/** Props delivered by the slot outlet: standard hooks + the locale seat. */
export interface CalendarSectionProps {
  useSessions: SnapshotSelectorHook<SessionListState>
  /** Injected sessions service (drill into a conversation). */
  sessions?: { open: (id: string) => void }
  /** Close the settings panel (owner share). */
  close?: () => void
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
function rangeText(view: View, cursor: Date, t: Translator): string {
  if (view === 'year') return String(cursor.getFullYear())
  if (view === 'month') return monthLabel(cursor)
  if (view === 'week') return weekLabel(cursor)
  if (view === 'reminders') return t('view.reminders')
  if (view === 'top') return `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`
  return dayLabel(cursor)
}

/** Shift the cursor by one unit of the active view. */
function shiftCursor(view: View, cursor: Date, delta: number): Date {
  const d = new Date(cursor)
  if (view === 'year') d.setFullYear(d.getFullYear() + delta)
  else if (view === 'month' || view === 'top') d.setMonth(d.getMonth() + delta)
  else if (view === 'week') d.setDate(d.getDate() + delta * 7)
  else if (view === 'day') d.setDate(d.getDate() + delta)
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
  const { useSessions, sessions: sessionsService, close, t } = props
  const sessionList = useSessions(s => s)

  const rows = useMemo<SessionRow[]>(() => {
    const out: SessionRow[] = []
    for (const id of sessionList.ids) {
      const row = sessionList.byId[id]
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
  }, [sessionList])
  const days = useMemo(() => aggregateDays(rows), [rows])
  const hasData = useMemo(() => rows.some(r => r.value !== undefined), [rows])

  const [view, setView] = useState<View>('year')
  const [cursor, setCursor] = useState(() => new Date())
  // Main-UI floating cards (shared with the shell.overlay overlay).
  const cards = useCardLayout()

  // Range-scoped stats for the stats cards.
  const stats = useMemo(() => {
    const monthKey = dateKey(cursor).slice(0, 7)
    let activeMs = 0
    let turns = 0
    let tools = 0
    let tokensIn = 0
    let tokensOut = 0
    const sessionSet = new Set<string>()
    for (const [key, agg] of days) {
      let matches: boolean
      if (view === 'year') matches = key.startsWith(String(cursor.getFullYear()))
      else if (view === 'month' || view === 'top') matches = key.startsWith(monthKey)
      else if (view === 'week') {
        const wkStart = weekStartOf(cursor)
        const wkEnd = new Date(wkStart)
        wkEnd.setDate(wkStart.getDate() + 6)
        matches = key >= dateKey(wkStart) && key <= dateKey(wkEnd)
      } else if (view === 'reminders') matches = true
      else matches = key === dateKey(cursor)
      if (!matches) continue
      activeMs += agg.activeMs
      turns += agg.turns
      tools += agg.tools
      tokensIn += agg.tokensIn
      tokensOut += agg.tokensOut
      for (const s of agg.sessions) sessionSet.add(s)
    }
    return { activeMs, sessions: sessionSet.size, turns, tools, tokensIn, tokensOut }
  }, [days, view, cursor])

  const rangeStatKey: CalendarKey = view === 'year' ? 'stat.thisYear' : view === 'month' || view === 'top' ? 'stat.thisMonth' : view === 'reminders' ? 'stat.allTime' : 'stat.today'
  const rangeKey = `${view}:${rangeText(view, cursor, t)}`

  /** Drill into a conversation: close the settings modal, then open the session. */
  const openSession = (id: string): void => {
    close?.()
    sessionsService?.open(id)
  }

  return (
    <div className="dsh-cal-root">
      <div className="dsh-cal-header">
        <h2 className="dsh-cal-title">
          <DecryptText text={rangeText(view, cursor, t)} active />
          <span style={{ color: 'var(--dsh-cal-muted)', fontSize: 12, marginLeft: 8 }}>{t(rangeStatKey)}</span>
        </h2>
        <div className="dsh-cal-views">
          {(['day', 'week', 'month', 'year', 'reminders', 'top'] as const).map(v => (
            <button key={v} type="button" className={`dsh-cal-viewbtn${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
              {t(`view.${v}` as CalendarKey)}
            </button>
          ))}
        </div>
        <div className="dsh-cal-nav">
          <button type="button" className="dsh-cal-navbtn" onClick={() => setCursor(c => shiftCursor(view, c, -1))}>‹</button>
          <span className="dsh-cal-range">{rangeText(view, cursor, t)}</span>
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
        <div className="dsh-cal-stat">
          <div className="label">{t('stats.tokens')}</div>
          <div className="value mono">
            <DecryptText text={fmtTokens(stats.tokensIn + stats.tokensOut)} active />
          </div>
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
            <WeekView rows={rows} weekStart={weekStartOf(cursor)} active onOpenSession={openSession} t={t} />
          )}
          {view === 'day' && <DayView rows={rows} date={dateKey(cursor)} active onOpenSession={openSession} t={t} />}
          {view === 'reminders' && <RemindersView rows={rows} active onOpenSession={openSession} t={t} />}
          {view === 'top' && <TopSessionsView rows={rows} monthKey={dateKey(cursor).slice(0, 7)} active onOpenSession={openSession} t={t} />}
        </div>
      ) : (
        <div className="dsh-cal-empty">
          <div style={{ fontSize: 26, marginBottom: 8 }}>🗓️</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('empty.title')}</div>
          <div>{t('empty.desc')}</div>
        </div>
      )}

      {/* Main-UI card selection: which small cards float over the main interface. */}
      <div className="dsh-cal-cardsel">
        <h3>{t('cards.title')}</h3>
        <div className="tip">{t('cards.tip')}</div>
        {CARD_IDS.map(id => (
          <label key={id} className="row">
            <input
              type="checkbox"
              checked={cards.visible.includes(id)}
              onChange={() => cards.toggleVisible(id)}
            />
            {t(`card.${id}` as CalendarKey)}
          </label>
        ))}
      </div>
    </div>
  )
}
