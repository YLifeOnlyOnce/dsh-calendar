/**
 * Month view: a classic calendar grid (Sunday-first, matching the year heat
 * map) with one cell per day. Cell background intensity and a bottom heat bar
 * show active time; hovering reveals a tooltip; clicking drills into the day
 * view. Cells animate in with a light rise on entry.
 *
 * @module dsh-calendar/client/MonthView
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { animate, stagger } from 'animejs'
import type { CalendarKey, Translator } from './locales.ts'
import { dateKey, dayQuantiles, fmtDuration, heatLevel, type DayAgg } from './useCalendarData.ts'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const LEVEL_CLASS = ['l0', 'l1', 'l2', 'l3', 'l4'] as const

export interface MonthViewProps {
  days: Map<string, DayAgg>
  /** Any Date inside the displayed month. */
  month: Date
  active: boolean
  onPickDay: (date: string) => void
  t: Translator
}

interface TipState {
  x: number
  y: number
  date: string
}

export function MonthView({ days, month, active, onPickDay, t }: MonthViewProps): ReactNode {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [tip, setTip] = useState<TipState | null>(null)
  const [tipKey, setTipKey] = useState(0)

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const today = dateKey(new Date())

  // Build the 6×7 grid (leading/trailing days from adjacent months, dimmed).
  const cells = useMemo(() => {
    const first = new Date(year, monthIndex, 1)
    const start = new Date(year, monthIndex, 1 - first.getDay())
    const out: Array<{ date: Date; key: string; inMonth: boolean }> = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      out.push({ date: d, key: dateKey(d), inMonth: d.getMonth() === monthIndex })
    }
    return out
  }, [year, monthIndex])

  const quantiles = dayQuantiles([...days.values()])

  useEffect(() => {
    if (!active) return
    const els = gridRef.current?.querySelectorAll<HTMLElement>('.dsh-cal-monthcell')
    if (els === undefined || els.length === 0) return
    const animation = animate(els, {
      opacity: [0, 1],
      translateY: [8, 0],
      delay: stagger(24, { grid: [7, 6], axis: 'y', from: 'first' }),
      duration: 360,
      ease: 'outCubic',
    })
    return () => { animation.cancel() }
  }, [active])

  const showTip = (date: string, x: number, y: number): void => {
    setTip({ x: Math.min(x + 14, window.innerWidth - 190), y: Math.min(y + 14, window.innerHeight - 120), date })
    setTipKey(k => k + 1)
  }

  return (
    <div>
      <div ref={gridRef} className="dsh-cal-month">
        {WEEKDAYS.map(name => <div key={name} className="dow">{name}</div>)}
        {cells.map((cell, i) => {
          const agg = days.get(cell.key)
          const level = agg === undefined ? 0 : heatLevel(agg.activeMs, quantiles)
          const isToday = cell.key === today
          return (
            <div
              key={cell.key}
              data-idx={i}
              className={`dsh-cal-monthcell${cell.inMonth ? '' : ' other'}${isToday ? ' today' : ''}`}
              onMouseEnter={e => { if (cell.inMonth) showTip(cell.key, e.clientX, e.clientY) }}
              onMouseLeave={() => setTip(null)}
              onClick={() => { if (cell.inMonth) onPickDay(cell.key) }}
            >
              <div className="daynum">{cell.date.getDate()}</div>
              {agg !== undefined && agg.activeMs > 0 && (
                <>
                  <div className="amt">{fmtDuration(agg.activeMs)}</div>
                  <div className="sub">{t('tooltip.turns', { count: agg.turns })}</div>
                  <div className="heatbar" style={{ opacity: 0.15 + level * 0.18 }} />
                </>
              )}
            </div>
          )
        })}
      </div>

      {tip !== null && (
        <div key={tipKey} className="dsh-cal-tip show" style={{ left: tip.x, top: tip.y }}>
          <div className="date">{tip.date} · {new Date(tip.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' })}</div>
          {(() => {
            const agg = days.get(tip.date)
            if (agg === undefined) return <div className="line">{t('day.noActivity')}</div>
            return (
              <>
                <div className="line"><b>{fmtDuration(agg.activeMs)}</b>&nbsp;{t('stats.active')}</div>
                <div className="line">{t('tooltip.turns', { count: agg.turns })} · {t('tooltip.tools', { count: agg.tools })}</div>
                <div className="line">{t('tooltip.sessions', { count: agg.sessions.size })}</div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}
