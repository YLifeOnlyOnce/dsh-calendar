/**
 * The Calendar settings section: a dashboard of draggable widgets. Each
 * calendar view — stats, year heatmap, 7-day timeline, day timeline, month
 * grid — is an independent card the user can reorder by dragging the ⠿
 * handle, hide/show from the ⚙ layout dialog, and navigate with its own mini
 * controls around a shared focus day. Layout preferences persist to
 * localStorage; data comes from the standard `useSessions` global hook.
 *
 * @module dsh-calendar/client/CalendarSection
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { CalendarKey, Translator } from './locales.ts'
import { aggregateDays, countUp, dateKey, fmtDuration, parseDateKey, type SessionRow } from './useCalendarData.ts'
import { DecryptText } from './decrypt.tsx'
import { YearView } from './YearView.tsx'
import { MonthView } from './MonthView.tsx'
import { WeekView } from './WeekView.tsx'
import { DayView } from './DayView.tsx'
import { Widget } from './Widget.tsx'
import { useWidgetLayout, WIDGET_IDS, type WidgetId } from './useWidgetLayout.ts'

/** Props delivered by the slot outlet: standard hooks + the locale seat. */
export interface CalendarSectionProps {
  useSessions: SnapshotSelectorHook<SessionListState>
  t: Translator
}

/** First day of the 7-day window ending on `d`. */
function weekStartOf(d: Date): Date {
  const out = new Date(d)
  out.setDate(d.getDate() - 6)
  return out
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

  // Shared focus day (all widgets navigate around it; year/month clicks drill into it).
  const [focusDay, setFocusDay] = useState(() => dateKey(new Date()))
  const focus = parseDateKey(focusDay)

  // Widget layout (order + visibility), persisted to localStorage.
  const layout = useWidgetLayout()
  const [layoutOpen, setLayoutOpen] = useState(false)

  // Drag lifecycle: window-level pointer tracking while a drag is active.
  useEffect(() => {
    if (!layout.dragging) return
    const move = (e: PointerEvent): void => layout.moveDrag(e.clientX, e.clientY)
    const up = (): void => layout.endDrag()
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [layout.dragging])

  const goToday = (): void => setFocusDay(dateKey(new Date()))
  const shiftDays = (n: number): void => {
    const d = parseDateKey(focusDay)
    d.setDate(d.getDate() + n)
    setFocusDay(dateKey(d))
  }
  const shiftMonths = (n: number): void => {
    const d = parseDateKey(focusDay)
    d.setMonth(d.getMonth() + n)
    setFocusDay(dateKey(d))
  }
  const shiftYears = (n: number): void => {
    const d = parseDateKey(focusDay)
    d.setFullYear(d.getFullYear() + n)
    setFocusDay(dateKey(d))
  }

  // All-time totals for the stats widget.
  const totals = useMemo(() => {
    let activeMs = 0
    let turns = 0
    let tools = 0
    const sessionSet = new Set<string>()
    for (const agg of days.values()) {
      activeMs += agg.activeMs
      turns += agg.turns
      tools += agg.tools
      for (const s of agg.sessions) sessionSet.add(s)
    }
    return { activeMs, sessions: sessionSet.size, turns, tools }
  }, [days])

  const nav = (onPrev: () => void, onNext: () => void): ReactNode => (
    <>
      <button type="button" className="dsh-cal-navbtn" onClick={onPrev}>‹</button>
      <button type="button" className="dsh-cal-navbtn" onClick={onNext}>›</button>
      <button type="button" className="dsh-cal-navbtn" onClick={goToday}>{t('today')}</button>
    </>
  )

  const titles: Record<WidgetId, string> = {
    stats: t('widget.stats'),
    year: t('widget.year'),
    week: t('widget.week'),
    day: t('widget.day'),
    month: t('widget.month'),
  }

  const widgetBody = (id: WidgetId): ReactNode => {
    switch (id) {
      case 'stats':
        return (
          <div className="dsh-cal-stats" style={{ marginBottom: 0 }}>
            <div className="dsh-cal-stat">
              <div className="label">{t('stats.active')}</div>
              <div className="value mono"><DecryptText text={fmtDuration(totals.activeMs)} active /></div>
            </div>
            <div className="dsh-cal-stat">
              <div className="label">{t('stats.sessions')}</div>
              <CountUpNumber value={totals.sessions} active />
            </div>
            <div className="dsh-cal-stat">
              <div className="label">{t('stats.turns')}</div>
              <CountUpNumber value={totals.turns} active />
            </div>
            <div className="dsh-cal-stat">
              <div className="label">{t('stats.tools')}</div>
              <CountUpNumber value={totals.tools} active />
            </div>
          </div>
        )
      case 'year':
        return <YearView days={days} year={focus.getFullYear()} active onPickDay={setFocusDay} t={t} />
      case 'month':
        return <MonthView days={days} month={focus} active onPickDay={setFocusDay} t={t} />
      case 'week':
        return <WeekView rows={rows} weekStart={weekStartOf(focus)} active t={t} />
      case 'day':
        return <DayView rows={rows} date={focusDay} active t={t} />
    }
  }

  const widgetNav: Record<WidgetId, ReactNode | undefined> = {
    stats: undefined,
    year: nav(() => shiftYears(-1), () => shiftYears(1)),
    month: nav(() => shiftMonths(-1), () => shiftMonths(1)),
    week: nav(() => shiftDays(-7), () => shiftDays(7)),
    day: nav(() => shiftDays(-1), () => shiftDays(1)),
  }

  return (
    <div className="dsh-cal-root">
      <div className="dsh-cal-header">
        <h2 className="dsh-cal-title">
          <DecryptText text={t('nav')} active />
          <span style={{ color: 'var(--dsh-cal-muted)', fontSize: 12, marginLeft: 8 }}>{t('stat.today')}</span>
        </h2>
        <button type="button" className="dsh-cal-layoutbtn" onClick={() => setLayoutOpen(true)}>⚙ {t('layout.title')}</button>
      </div>

      {hasData ? (
        <div className="dsh-cal-widgets">
          {layout.order.map((id, index) => (
            <Widget
              key={id}
              id={id}
              index={index}
              title={titles[id]}
              nav={widgetNav[id]}
              gridDragging={layout.dragging}
              isDragging={layout.dragId === id}
              onHandlePointerDown={layout.startDrag}
            >
              {widgetBody(id)}
            </Widget>
          ))}
        </div>
      ) : (
        <div className="dsh-cal-empty">
          <div style={{ fontSize: 26, marginBottom: 8 }}>🗓️</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('empty.title')}</div>
          <div>{t('empty.desc')}</div>
        </div>
      )}

      {layout.dragging && layout.dragPos !== null && (
        <div className="dsh-cal-dragghost" style={{ left: layout.dragPos.x, top: layout.dragPos.y }}>
          {layout.dragId !== null ? titles[layout.dragId] : ''}
        </div>
      )}

      {layoutOpen && (
        <div className="dsh-cal-overlay" onClick={() => setLayoutOpen(false)}>
          <div className="dsh-cal-dialog" onClick={e => e.stopPropagation()}>
            <h3>{t('layout.title')}</h3>
            <div className="tip">{t('layout.tip')}</div>
            {WIDGET_IDS.map(id => (
              <label key={id} className="row">
                <input
                  type="checkbox"
                  checked={!layout.hidden.includes(id)}
                  onChange={() => layout.toggle(id)}
                />
                {titles[id]}
              </label>
            ))}
            <div className="actions">
              <button type="button" className="dsh-cal-navbtn" onClick={layout.reset}>{t('layout.reset')}</button>
              <button type="button" className="dsh-cal-navbtn primary" onClick={() => setLayoutOpen(false)}>{t('layout.done')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
