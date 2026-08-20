/**
 * Day view: a zoomable 24-hour Gantt timeline of one day's activity. Sessions
 * group under their workspace; each session row shows its task segments and
 * prompt points positioned on the hour axis. The timeline fits the container
 * by default; zoom in/out with the toolbar buttons or Ctrl/⌘ + wheel (anchored
 * to the pointer), and "Fit" snaps back. A pulsing red now-line marks the
 * current time on today's view.
 *
 * @module dsh-calendar/client/DayView
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { animate, stagger } from 'animejs'
import type { Translator } from './locales.ts'
import { dateKey, fmtDuration, mergeSegments, sessionHue, workspaceTitleOf, type SessionRow } from './useCalendarData.ts'
import type { CalendarInterval } from '../types'

export interface DayViewProps {
  rows: readonly SessionRow[]
  date: string
  active: boolean
  /** Compact card sizing (main-UI cards); default is the full settings view. */
  compact?: boolean
  /** Open a session (drill into the conversation). */
  onOpenSession?: (sessionId: string) => void
  t: Translator
}

/** Fallback pixels per hour before the first fit measurement. */
const HOUR_W_FALLBACK = 40
/** Compact pixels per hour (main-UI card — fixed, no zoom there). */
const HOUR_W_COMPACT = 24
/** Zoom bounds in pixels per hour. */
const MIN_HOUR_W = 8
const MAX_HOUR_W = 160
/** Zoom step per wheel tick. */
const ZOOM_STEP = 1.2

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

export function DayView({ rows, date, active, compact = false, onOpenSession, t }: DayViewProps): ReactNode {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [hourW, setHourW] = useState(compact ? HOUR_W_COMPACT : HOUR_W_FALLBACK)
  const hourWRef = useRef(hourW)
  hourWRef.current = hourW

  const dayW = 24 * hourW

  const clamp = (v: number): number => Math.min(MAX_HOUR_W, Math.max(MIN_HOUR_W, v))

  /** Fit the full 24h into the visible container width. */
  const fit = (): void => {
    const el = rootRef.current
    if (el === null) return
    const w = el.clientWidth
    if (w > 0) setHourW(clamp(w / 24))
    el.scrollLeft = 0
  }

  /** Zoom around a client X so the time under the pointer stays put. */
  const zoomAt = (clientX: number, factor: number): void => {
    const el = rootRef.current
    if (el === null) return
    const rect = el.getBoundingClientRect()
    const anchorHours = (clientX - rect.left + el.scrollLeft) / hourWRef.current
    const next = clamp(hourWRef.current * factor)
    setHourW(next)
    requestAnimationFrame(() => {
      if (rootRef.current !== null) {
        rootRef.current.scrollLeft = anchorHours * next - (clientX - rect.left)
      }
    })
  }

  // Default fit: measure after mount.
  useEffect(() => {
    if (compact) return
    fit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact])

  // Ctrl/⌘ + wheel zoom (native listener so preventDefault works).
  useEffect(() => {
    const el = rootRef.current
    if (el === null || compact) return
    const onWheel = (e: WheelEvent): void => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      zoomAt(e.clientX, e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact])

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
  const zoomCenter = (): number => {
    const el = rootRef.current
    if (el === null) return 0
    return el.getBoundingClientRect().left + el.clientWidth / 2
  }

  // Tick density: labels thin out as the scale shrinks so they never overlap.
  const tickStep = hourW >= 60 ? 1 : hourW >= 32 ? 2 : hourW >= 20 ? 3 : hourW >= 12 ? 6 : 12
  const hourTicks: number[] = []
  for (let h = 0; h <= 24; h += tickStep) hourTicks.push(h)

  return (
    <div className="dsh-cal-daybox">
      {!compact && (
        <div className="dsh-cal-daytools">
          <button type="button" className="dsh-cal-navbtn" onClick={() => zoomAt(zoomCenter(), 1 / ZOOM_STEP)} title={t('day.zoomOut')}>−</button>
          <button type="button" className="dsh-cal-navbtn" onClick={fit}>{t('day.fit')}</button>
          <button type="button" className="dsh-cal-navbtn" onClick={() => zoomAt(zoomCenter(), ZOOM_STEP)} title={t('day.zoomIn')}>＋</button>
          <span className="dsh-cal-scale">{hourW.toFixed(0)} px/h</span>
        </div>
      )}
      <div ref={rootRef} className="dsh-cal-day">
        <div className="dsh-cal-daycontent">
          <div className="dsh-cal-axis" style={{ width: dayW }}>
            {hourTicks.map(h => (
              <span key={h} className="tick" style={{ left: h * hourW }}>{h === 24 ? '24:00' : `${h}:00`}</span>
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
                  <div className="dsh-cal-track" style={{ width: dayW }}>
                    <div className="dsh-cal-trackgrid" aria-hidden="true">
                      {hourTicks.map(h => (
                        <span key={h} style={{ left: h * hourW }} />
                      ))}
                    </div>
                    {(() => {
                      const segments = mergeSegments(session.intervals)
                      return segments.map((seg, i) => {
                        const startMin = minutesOf(seg.start)
                        const endMin = Math.min(minutesOf(seg.end), 24 * 60)
                        const width = Math.max(3, ((endMin - startMin) / 1440) * dayW)
                        const text = seg.turns === 0
                          ? `${hhmm(seg.start)} ${t('stats.prompts')}`
                          : `${hhmm(seg.start)} – ${hhmm(seg.end)} · ${fmtDuration(seg.end - seg.start)} · ${t('tooltip.turns', { count: seg.turns })}`
                        return (
                          <div
                            key={i}
                            className={`dsh-cal-bar${session.running && i === segments.length - 1 ? ' running' : ''}`}
                            style={{ left: (startMin / 1440) * dayW, width }}
                            onMouseEnter={e => showTip(text, e.clientX, e.clientY)}
                            onMouseLeave={() => setTip(null)}
                            onClick={onOpenSession !== undefined ? () => onOpenSession(session.id) : undefined}
                          >
                            {seg.prompts > 0 && <span className="dsh-cal-segprompt" />}
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {isToday && (
            <div className="dsh-cal-nowline" style={{ left: (minutesOf(nowMs) / 1440) * dayW }} />
          )}
        </div>
      </div>

      {tip !== null && (
        <div className="dsh-cal-tip show" style={{ left: tip.x, top: tip.y }}>
          <div className="line">{tip.text}</div>
        </div>
      )}
    </div>
  )
}
