/**
 * Day view: a zoomable 24-hour Gantt timeline of one day's activity.
 *
 * Layout: one two-way scroll container with a fixed left label column
 * (`grid-template-columns: 168px 1fr`) — workspace/session labels stay
 * pinned (sticky + solid background) while the timeline scrolls
 * horizontally, and the hour axis stays pinned to the top. Hour gridlines
 * draw on a shared layer behind all rows, rows alternate lane tint, and a
 * pulsing now-line spans the full height on today's view.
 *
 * Zoom: fits the container by default; toolbar buttons or Ctrl/⌘ + wheel
 * zoom anchored to the pointer; "Fit" snaps back. Tick labels thin out at
 * small scales so they never overlap.
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

/** Fixed label-column width (px). */
const LABEL_W = 168
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

  /** Label-column width: the CSS `--dsh-cal-label-w` (168 full view, 190 card). */
  const labelW = compact ? 190 : LABEL_W

  /** Timeline track width for 24 hours. */
  const trackW = 24 * hourW
  /** Full content width including the label column. */
  const contentW = labelW + trackW

  const clamp = (v: number): number => Math.min(MAX_HOUR_W, Math.max(MIN_HOUR_W, v))

  /** Fit the day into the visible timeline width. Cards fit the ACTIVE window
   * (first → last activity, padded) so Q&A bars stay visible at card size;
   * the full view fits all 24h (user zooms from there). */
  const fit = (): void => {
    const el = rootRef.current
    if (el === null) return
    const w = el.clientWidth - labelW
    if (w <= 0) return
    if (compact) {
      let firstMin = Number.POSITIVE_INFINITY
      let lastMin = Number.NEGATIVE_INFINITY
      for (const group of groups) {
        for (const s of group.sessions) {
          for (const iv of s.intervals) {
            const m = minutesOf(iv.start)
            if (m < firstMin) firstMin = m
            const e = minutesOf(iv.end)
            if (e > lastMin) lastMin = e
          }
        }
      }
      if (Number.isFinite(firstMin) && lastMin - firstMin >= 30) {
        const windowHours = Math.max(2, (lastMin - firstMin) / 60)
        const next = clamp(w / windowHours)
        setHourW(next)
        // Scroll so the active window starts near the left (with a small pad).
        el.scrollLeft = (firstMin / 1440) * 24 * next - 30
        return
      }
    }
    setHourW(clamp(w / 24))
    el.scrollLeft = 0
  }

  /** Zoom around a client X so the time under the pointer stays put. */
  const zoomAt = (clientX: number, factor: number): void => {
    const el = rootRef.current
    if (el === null) return
    const rect = el.getBoundingClientRect()
    const anchorHours = (clientX - rect.left + el.scrollLeft - labelW) / hourWRef.current
    const next = clamp(hourWRef.current * factor)
    setHourW(next)
    requestAnimationFrame(() => {
      if (rootRef.current !== null) {
        rootRef.current.scrollLeft = anchorHours * next - (clientX - rect.left) + labelW
      }
    })
  }

  // Default fit after mount — cards too, so a full day fits the card width.
  useEffect(() => {
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
        <div className="dsh-cal-daycontent" style={{ width: contentW }}>
          {/* Shared hour gridlines behind every row. */}
          <div className="dsh-cal-gridlines" aria-hidden="true">
            {hourTicks.map(h => (
              <span key={h} style={{ left: h * hourW }} />
            ))}
          </div>

          {/* Sticky hour axis. */}
          <div className="dsh-cal-axis">
            <div className="dsh-cal-axislabel">{t('day.timeline')}</div>
            <div className="dsh-cal-axistrack" style={{ width: trackW }}>
              {hourTicks.map(h => (
                <span key={h} className="tick" style={{ left: h * hourW }}>{h === 24 ? '24:00' : `${h}:00`}</span>
              ))}
            </div>
          </div>

          {groups.map(group => {
            const groupActive = group.sessions.reduce((a, s) => a + s.activeMs, 0)
            return (
              <div key={group.name} className="dsh-cal-wsrow">
                {/* Workspace header row: spans the full width (may extend past
                    the label column), so the name shows fully with stats. */}
                <div className="dsh-cal-wslabel">
                  <span className="wsbar" />
                  <span className="wsname">{group.name}</span>
                  <span className="wscount">
                    {t('tooltip.sessions', { count: group.sessions.length })} · {fmtDuration(groupActive)}
                  </span>
                </div>

                {group.sessions.map(session => (
                  <div key={session.id} className="dsh-cal-sessrow">
                    {/* Sticky session label. */}
                    <div className="dsh-cal-sesslabel" title={session.title}>
                      <span className="dot" style={{ background: `hsl(${sessionHue(session.id)} 70% 62%)` }} />
                      <span className="sessname">{session.title}</span>
                      {session.running && <span className="run">●</span>}
                    </div>
                    <div className="dsh-cal-track" style={{ width: trackW }}>
                      {(() => {
                        // One bar per Q&A turn: a user prompt opens a segment
                        // and the following turns join it (see mergeSegments).
                        const segments = mergeSegments(session.intervals)
                        return segments.map((seg, i) => {
                          const startMin = minutesOf(seg.start)
                          const endMin = Math.min(minutesOf(seg.end), 24 * 60)
                          const width = Math.max(4, ((endMin - startMin) / 1440) * trackW)
                          const text = seg.turns === 0
                            ? `${hhmm(seg.start)} ${t('stats.prompts')}`
                            : `${hhmm(seg.start)} – ${hhmm(seg.end)} · ${fmtDuration(seg.end - seg.start)} · ${t('tooltip.turns', { count: seg.turns })}`
                          return (
                            <div
                              key={i}
                              className={`dsh-cal-bar${session.running && i === segments.length - 1 ? ' running' : ''}`}
                              style={{ left: (startMin / 1440) * trackW, width }}
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
          )
          })}

          {isToday && (
            <div className="dsh-cal-nowline" style={{ left: labelW + (minutesOf(nowMs) / 1440) * trackW }} />
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
