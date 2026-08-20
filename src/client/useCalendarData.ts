/**
 * Calendar data aggregation: fold the runtime session list mirror into the
 * view model the year/month/day views render. Reads only `projectionValues`
 * carried by each session row — no session is opened, no log is pulled.
 *
 * @module dsh-calendar/client/useCalendarData
 */

import { useMemo } from 'react'
import { animate } from 'animejs'
import type { CalendarInterval, CalendarValue } from '../types'

/** One session row's calendar-relevant facts. */
export interface SessionRow {
  id: string
  title: string
  cwd: string
  /** The session's `calendar` projection value, absent until the host folds one. */
  value?: CalendarValue
  running: boolean
}

/** Per-local-day aggregate across sessions. */
export interface DayAgg {
  date: string
  activeMs: number
  turns: number
  tools: number
  llmMs: number
  prompts: number
  failedTurns: number
  sessions: Set<string>
}

/** Local `YYYY-MM-DD` key of a Date. */
export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Local midnight Date of a `YYYY-MM-DD` key. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

/** Display name of a workspace from its cwd path (last non-empty segment). */
export function workspaceTitleOf(cwd: string): string {
  const parts = cwd.split(/[/\\]/).filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

/** Stable hue (0..360) for a session id — the same session keeps its color across days. */
export function sessionHue(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % 360
}

/**
 * One merged task segment on a session's timeline: a user prompt opens it,
 * and the following turns join it while their gaps stay under the merge
 * threshold. `turns`/`prompts` count the merged intervals.
 */
export interface ActivitySegment {
  start: number
  end: number
  turns: number
  prompts: number
}

/** Default merge threshold: a gap between turns below this stays one task. */
export const SEGMENT_GAP_MS = 5 * 60_000

/**
 * Merge a session's activity intervals into task segments. Rules:
 * - A `prompt` point opens a new segment (each user input starts a task).
 * - A `turn` joins the current segment when it starts within `gapMs` of the
 *   segment's end (model turnaround gaps are part of the same task).
 * - Anything else opens a new segment.
 * Intervals are sorted by start first; prompt points have zero duration.
 */
export function mergeSegments(intervals: readonly CalendarInterval[], gapMs: number = SEGMENT_GAP_MS): ActivitySegment[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const segments: ActivitySegment[] = []
  for (const iv of sorted) {
    const last = segments[segments.length - 1]
    if (last === undefined) {
      segments.push({
        start: iv.start,
        end: iv.end,
        turns: iv.kind === 'turn' ? 1 : 0,
        prompts: iv.kind === 'prompt' ? 1 : 0,
      })
      continue
    }
    if (iv.kind === 'prompt') {
      segments.push({ start: iv.start, end: iv.end, turns: 0, prompts: 1 })
      continue
    }
    if (iv.start - last.end <= gapMs) {
      last.end = Math.max(last.end, iv.end)
      last.turns += 1
      continue
    }
    segments.push({ start: iv.start, end: iv.end, turns: 1, prompts: 0 })
  }
  return segments
}

/** Aggregate session rows into a day map (empty map when no rows carry values). */
export function aggregateDays(rows: readonly SessionRow[]): Map<string, DayAgg> {
  const out = new Map<string, DayAgg>()
  for (const row of rows) {
    const value = row.value
    if (value === undefined) continue
    for (const day of value.days) {
      let agg = out.get(day.date)
      if (agg === undefined) {
        agg = { date: day.date, activeMs: 0, turns: 0, tools: 0, llmMs: 0, prompts: 0, failedTurns: 0, sessions: new Set() }
        out.set(day.date, agg)
      }
      agg.activeMs += day.activeMs
      agg.turns += day.turns
      agg.tools += day.tools
      agg.llmMs += day.llmMs
      agg.prompts += day.prompts
      agg.failedTurns += day.failedTurns
      agg.sessions.add(row.id)
    }
  }
  return out
}

/** Human duration string, e.g. "1h 23m" / "45m" / "12s". */
export function fmtDuration(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`
  const h = Math.floor(ms / 3_600_000)
  const m = Math.round((ms % 3_600_000) / 60_000)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Quantile heat level 0..4 for one day's active time within a year. */
export function heatLevel(activeMs: number, quantiles: readonly [number, number, number]): 0 | 1 | 2 | 3 | 4 {
  if (activeMs <= 0) return 0
  if (activeMs <= quantiles[0]) return 1
  if (activeMs <= quantiles[1]) return 2
  if (activeMs <= quantiles[2]) return 3
  return 4
}

/**
 * Quantile cut points over the positive day values (GitHub-style: the color
 * scale distributes across the busiest quarter of days).
 */
export function dayQuantiles(days: readonly DayAgg[]): [number, number, number] {
  const values = days.map(d => d.activeMs).filter(v => v > 0).sort((a, b) => a - b)
  if (values.length === 0) return [0, 0, 0]
  const at = (p: number): number => values[Math.min(values.length - 1, Math.floor(values.length * p))] ?? 0
  return [at(0.25), at(0.5), at(0.75)]
}

/**
 * Drive a count-up animation on a target element's textContent.
 * @param el - the element to write into.
 * @param from - starting value.
 * @param to - target value.
 * @param format - value formatter (duration text, integer, …).
 * @param duration - animation length in ms.
 * @returns a cancel function.
 */
export function countUp(el: HTMLElement, from: number, to: number, format: (v: number) => string, duration = 700): () => void {
  const state = { v: from }
  const animation = animate(state, {
    v: [from, to],
    duration,
    ease: 'outCubic',
    onUpdate: () => { el.textContent = format(state.v) },
  })
  return () => animation.cancel()
}
