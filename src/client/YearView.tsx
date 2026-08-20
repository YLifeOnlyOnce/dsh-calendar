/**
 * Year view: a GitHub-style 52×7 contribution heatmap of the selected year,
 * one cell per local day colored by total active time across sessions. Cells
 * animate in column-by-column (anime.js) on mount; hovering shows a rich
 * tooltip; clicking drills into the day view.
 *
 * @module dsh-calendar/client/YearView
 */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { animate, stagger } from 'animejs'
import type { CalendarKey, Translator } from './locales.ts'
import { dayQuantiles, fmtDuration, heatLevel, parseDateKey, type DayAgg } from './useCalendarData.ts'

/** One week column; null cells are days outside the year. */
type Week = Array<Date | null>

/** Build the year's week columns (Sunday-first, GitHub layout). */
function yearCells(year: number): Week[] {
  const first = new Date(year, 0, 1)
  const start = new Date(year, 0, 1 - first.getDay())
  const last = new Date(year, 11, 31)
  const end = new Date(year, 11, 31 + (6 - last.getDay()))
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  const weeks: Week[] = []
  const cursor = new Date(start)
  for (let col = 0; col * 7 < totalDays; col++) {
    const week: Week = []
    for (let dow = 0; dow < 7; dow++) {
      const d = new Date(cursor)
      week.push(d.getFullYear() === year ? d : null)
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

/** Month labels under the grid: mark a column when its month changes. */
function monthLabels(weeks: Week[], year: number): string[] {
  const labels: string[] = []
  let lastMonth = -1
  for (const week of weeks) {
    const anchor = week.find(d => d !== null) ?? week[3]
    const month = anchor !== null && anchor !== undefined ? anchor.getMonth() : -1
    labels.push(month !== lastMonth && month !== -1 ? (monthNames[month] ?? '') : '')
    if (month !== -1) lastMonth = month
  }
  return labels
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const LEVEL_CLASS = ['l0', 'l1', 'l2', 'l3', 'l4'] as const

export interface YearViewProps {
  days: Map<string, DayAgg>
  year: number
  /** One-shot animation trigger (re-run on view entry). */
  active: boolean
  onPickDay: (date: string) => void
  t: Translator
}

interface TipState {
  x: number
  y: number
  date: string
}

export function YearView({ days, year, active, onPickDay, t }: YearViewProps): ReactNode {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [tip, setTip] = useState<TipState | null>(null)
  const [tipKey, setTipKey] = useState(0)

  const weeks = useRef(yearCells(year)).current
  const quantiles = dayQuantiles([...days.values()])
  const todayKey = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()

  // Entry animation: cells grow in column by column. The grid's DOM order is
  // row-major, so the per-cell delay uses stagger's grid form (7 rows × the
  // week count) along the x axis.
  useEffect(() => {
    if (!active) return
    const cells = gridRef.current?.querySelectorAll<HTMLElement>('.dsh-cal-cell[data-col]')
    if (cells === undefined || cells.length === 0) return
    const animation = animate(cells, {
      opacity: [0, 1],
      scale: [0.25, 1],
      delay: stagger(14, { grid: [7, weeks.length], axis: 'x', from: 'first' }),
      duration: 380,
      ease: 'outBack',
    })
    return () => { animation.cancel() }
  }, [active, weeks.length])

  const showTip = (date: string, x: number, y: number): void => {
    setTip({ x: Math.min(x + 14, window.innerWidth - 190), y: Math.min(y + 14, window.innerHeight - 120), date })
    setTipKey(k => k + 1)
  }

  const aggFor = (d: Date | null): DayAgg | undefined => {
    if (d === null) return undefined
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return days.get(key)
  }

  let cells: ReactNode[] = []
  for (let col = 0; col < weeks.length; col++) {
    for (let dow = 0; dow < 7; dow++) {
      const d = weeks[col]?.[dow] ?? null
      const key = d === null ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const agg = key === null ? undefined : days.get(key)
      const isToday = key === todayKey
      const isFuture = key !== null && key > todayKey
      const level = agg === undefined ? 0 : heatLevel(agg.activeMs, quantiles)
      const cls = isFuture ? 'dsh-cal-cell future' : `dsh-cal-cell ${LEVEL_CLASS[level]}${isToday ? ' today' : ''}`
      const colIdx = col
      cells.push(
        <button
          key={`${col}-${dow}`}
          type="button"
          data-col={colIdx}
          data-date={key ?? undefined}
          className={cls}
          aria-label={key ?? undefined}
          disabled={isFuture || key === null}
          style={{ gridRow: dow + 1, gridColumn: col + 1 }}
          onMouseEnter={e => { if (key !== null && !isFuture) showTip(key, e.clientX, e.clientY) }}
          onMouseLeave={() => setTip(null)}
          onClick={() => { if (key !== null && !isFuture) onPickDay(key) }}
        />,
      )
    }
  }

  return (
    <div>
      <div className="dsh-cal-year">
        <div className="dsh-cal-weekdays">
          {weekdayNames.map((name, i) => <span key={name} style={{ gridRow: i + 1 }}>{name}</span>)}
        </div>
        <div className="dsh-cal-gridwrap">
          <div className="dsh-cal-months">
            {monthLabels(weeks, year).map((m, i) => <span key={i}>{m}</span>)}
          </div>
          <div ref={gridRef} className="dsh-cal-grid" style={{ gridTemplateColumns: `repeat(${weeks.length}, 11px)` }}>
            {cells}
          </div>
        </div>
      </div>
      <div className="dsh-cal-legend">
        <span>{t('heat.less')}</span>
        {[0, 1, 2, 3, 4].map(l => <span key={l} className={`dsh-cal-cell ${LEVEL_CLASS[l]}`} style={{ width: 10, height: 10 }} />)}
        <span>{t('heat.more')}</span>
        <span style={{ marginLeft: 'auto' }}>{t('heat.totalActive', { total: fmtDuration([...days.values()].reduce((a, d) => a + d.activeMs, 0)) })}</span>
      </div>

      {tip !== null && (
        <div key={tipKey} className={`dsh-cal-tip show`} style={{ left: tip.x, top: tip.y }}>
          <div className="date">{tip.date} · {parseDateKey(tip.date).toLocaleDateString(undefined, { weekday: 'long' })}</div>
          {(() => {
            const agg = days.get(tip.date)
            if (agg === undefined) return <div className="line">{t('day.noActivity')}</div>
            return (
              <>
                <div className="line"><b>{fmtDuration(agg.activeMs)}</b>&nbsp;{t('stats.active')}</div>
                <div className="line">{t('tooltip.turns', { count: agg.turns })} · {t('tooltip.tools', { count: agg.tools })} · {t('tooltip.prompts', { count: agg.prompts })}</div>
                <div className="line">{t('tooltip.sessions', { count: agg.sessions.size })}</div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
