/**
 * The activity fold: session events → daily buckets, recent activity
 * intervals, and the 24-hour activity profile. A pure, synchronous fold over
 * the durable session log (the same substrate `dsh-session-stats` folds), so
 * paging and compaction cannot change the result.
 *
 * ## Active-time semantics
 *
 * `activeMs` is the wall-clock span of every closed turn (`turn/start` →
 * `turn/end`), attributed to local calendar days with midnight splits. Tools
 * and model calls run inside turns, so their wall time is already covered;
 * summing them would double-count. A turn whose `turn/end` never landed
 * (crash before reload recovery appends its synthetic `turn/end`) contributes
 * nothing until it closes. Human prompts (`user/message` with source kind
 * `user`) are point events: they count into the prompt bucket and enter the
 * recent-interval ring, but carry zero duration.
 *
 * ## Scope boundary (whole log)
 *
 * The fold counts the session's COMPLETE log, including seed history
 * inherited by a fork child — the same whole-log convention as
 * `dsh-session-stats`. A fork child therefore shows its inherited parent
 * history, and cross-session aggregation counts inherited history once per
 * owning session. Day boundaries follow the host machine's local timezone
 * (the common case: `dsh web` runs on the user's machine).
 *
 * @module dsh-calendar/activity
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import type { CalendarDayBucket, CalendarInterval } from './types.ts'
import type { Config } from './config.ts'

// ---------------------------------------------------------------------------
// Local-time helpers (DST-safe: boundaries computed on Date, never +24h math)
// ---------------------------------------------------------------------------

/** Local calendar date key, `YYYY-MM-DD`. */
function localDateKey(ms: number): string {
  const d = new Date(ms)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Local midnight of `ms`. */
function nextLocalDayStart(ms: number): number {
  const d = new Date(ms)
  d.setHours(24, 0, 0, 0)
  return d.getTime()
}

/** Local hour index (0..23) of `ms`. */
function localHourIndex(ms: number): number {
  return new Date(ms).getHours()
}

/** The next local hour boundary at or after `ms`. */
function nextLocalHourStart(ms: number): number {
  const d = new Date(ms)
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d.getTime()
}

/**
 * Walk `[start, end)` split at local midnight boundaries, invoking `cb` with
 * the chunk's start, exclusive end, and local date key.
 */
function forEachLocalDay(start: number, end: number, cb: (chunkStart: number, chunkEnd: number, dateKey: string) => void): void {
  let cursor = start
  while (cursor < end) {
    const chunkEnd = Math.min(end, nextLocalDayStart(cursor))
    cb(cursor, chunkEnd, localDateKey(cursor))
    cursor = chunkEnd
  }
}

// ---------------------------------------------------------------------------
// Fold state (plain JSON per the projection-unit contract)
// ---------------------------------------------------------------------------

/** One day's counters for one session (the wire bucket minus its date key). */
export interface DayBucketState {
  activeMs: number
  turns: number
  tools: number
  llmMs: number
  prompts: number
  failedTurns: number
}

/** The open turn interval; committed to buckets/ring on its `turn/end`. */
interface OpenTurn {
  start: number
  turn: number
}

/** Plain-JSON fold state; every field is serializable and cache-safe. */
export interface ActivityState {
  firstActivityAt: number | null
  lastActivityAt: number | null
  totalActiveMs: number
  /** date key → bucket, bounded by `keepDays`. */
  days: Record<string, DayBucketState>
  /** Insertion order of `days` keys, oldest first. */
  dayOrder: string[]
  /** Recent intervals, bounded by `intervalCap`. */
  recent: CalendarInterval[]
  /** date key → 24 hourly raw ms, bounded by `hourProfileDays`. */
  hourByDay: Record<string, number[]>
  /** Insertion order of `hourByDay` keys, oldest first. */
  hourDayOrder: string[]
  /** The open turn (one at a time; turns are serial per session). */
  current: OpenTurn | null
  /** `turn:step` → start time, for llmMs on the step's `assistant/message`. */
  openSteps: Record<string, number>
  /** callId → dispatch facts, for open tool calls. */
  openCalls: Record<string, { start: number; turn: number }>
}

/** Fresh fold state for a new session. */
export function createActivityState(): ActivityState {
  return {
    firstActivityAt: null,
    lastActivityAt: null,
    totalActiveMs: 0,
    days: {},
    dayOrder: [],
    recent: [],
    hourByDay: {},
    hourDayOrder: [],
    current: null,
    openSteps: {},
    openCalls: {},
  }
}

// ---------------------------------------------------------------------------
// Fold helpers
// ---------------------------------------------------------------------------

/** Merge a delta into one day's bucket; creates the bucket on first touch. */
function addToDay(state: ActivityState, dateKey: string, delta: Partial<DayBucketState>, config: Config): ActivityState {
  const existing = state.days[dateKey]
  const bucket: DayBucketState = existing ?? { activeMs: 0, turns: 0, tools: 0, llmMs: 0, prompts: 0, failedTurns: 0 }
  const next: DayBucketState = {
    activeMs: bucket.activeMs + (delta.activeMs ?? 0),
    turns: bucket.turns + (delta.turns ?? 0),
    tools: bucket.tools + (delta.tools ?? 0),
    llmMs: bucket.llmMs + (delta.llmMs ?? 0),
    prompts: bucket.prompts + (delta.prompts ?? 0),
    failedTurns: bucket.failedTurns + (delta.failedTurns ?? 0),
  }
  let days = state.days
  let dayOrder = state.dayOrder
  if (existing === undefined) {
    days = { ...days, [dateKey]: next }
    dayOrder = [...dayOrder, dateKey]
    while (dayOrder.length > config.keepDays) {
      const oldest = dayOrder[0]
      if (oldest !== undefined) {
        days = { ...days }
        delete days[oldest]
      }
      dayOrder = dayOrder.slice(1)
    }
  } else {
    days = { ...days, [dateKey]: next }
  }
  return { ...state, days, dayOrder }
}

/** Record a span in the hourly profile, split at local hour boundaries. */
function addHourSpan(state: ActivityState, start: number, end: number, config: Config): ActivityState {
  let next = state
  let cursor = start
  while (cursor < end) {
    const chunkEnd = Math.min(end, nextLocalHourStart(cursor))
    const dateKey = localDateKey(cursor)
    const hours = next.hourByDay[dateKey]
    let hourByDay = next.hourByDay
    let hourDayOrder = next.hourDayOrder
    if (hours === undefined) {
      hourByDay = { ...hourByDay, [dateKey]: new Array<number>(24).fill(0) }
      hourDayOrder = [...hourDayOrder, dateKey]
      while (hourDayOrder.length > config.hourProfileDays) {
        const oldest = hourDayOrder[0]
        if (oldest !== undefined) {
          hourByDay = { ...hourByDay }
          delete hourByDay[oldest]
        }
        hourDayOrder = hourDayOrder.slice(1)
      }
    }
    const arr = hourByDay[dateKey] ?? new Array<number>(24).fill(0)
    const index = localHourIndex(cursor)
    const updated = arr.slice()
    updated[index] = (updated[index] ?? 0) + (chunkEnd - cursor)
    next = { ...next, hourByDay: { ...hourByDay, [dateKey]: updated }, hourDayOrder }
    cursor = chunkEnd
  }
  return next
}

/** Push an interval into the recent ring, dropping the oldest past the cap. */
function pushRecent(state: ActivityState, interval: CalendarInterval, config: Config): ActivityState {
  const recent = state.recent.length >= config.intervalCap
    ? [...state.recent.slice(state.recent.length - config.intervalCap + 1), interval]
    : [...state.recent, interval]
  return { ...state, recent }
}

/** Widen first/last activity; same reference when unchanged. */
function touch(state: ActivityState, t: number): ActivityState {
  const first = state.firstActivityAt === null ? t : Math.min(state.firstActivityAt, t)
  const last = state.lastActivityAt === null ? t : Math.max(state.lastActivityAt, t)
  if (first === state.firstActivityAt && last === state.lastActivityAt) return state
  return { ...state, firstActivityAt: first, lastActivityAt: last }
}

/** Add a turn span to totals, day buckets (midnight-split), profile, and ring. */
function addTurnSpan(state: ActivityState, start: number, end: number, config: Config): ActivityState {
  const duration = Math.max(0, end - start)
  if (duration === 0) return state
  let next: ActivityState = { ...state, totalActiveMs: state.totalActiveMs + duration }
  forEachLocalDay(start, end, (chunkStart, chunkEnd, dateKey) => {
    next = addToDay(next, dateKey, { activeMs: chunkEnd - chunkStart }, config)
  })
  next = addHourSpan(next, start, end, config)
  return pushRecent(next, { start, end, kind: 'turn' }, config)
}

/** Close the open turn at `endTime` (if it is the given turn) and commit it. */
function commitTurn(state: ActivityState, endTime: number, turn: number, config: Config): ActivityState {
  const current = state.current
  if (current === null || current.turn !== turn) return state
  const next = addTurnSpan(state, current.start, Math.max(current.start, endTime), config)
  return { ...next, current: null }
}

/** Open a turn interval; a stale unclosed turn is dropped (it committed nothing). */
function openTurn(state: ActivityState, t: number, turn: number): ActivityState {
  const touched = touch(state, t)
  if (touched.current !== null && touched.current.turn === turn) return touched
  return { ...touched, current: { start: t, turn } }
}

// ---------------------------------------------------------------------------
// The fold
// ---------------------------------------------------------------------------

/**
 * Fold one committed session event. Returns the SAME state reference for
 * events that do not concern the calendar (the projection registry gates its
 * change feed on `Object.is`).
 */
export function applyActivityEvent(state: ActivityState, event: SessionEvent, config: Config): ActivityState {
  switch (event.type) {
    case 'turn/start':
      return openTurn(state, event.time, event.data.turn)

    case 'turn/end': {
      const touched = touch(state, event.time)
      const committed = commitTurn(touched, event.time, event.data.turn, config)
      const counted = addToDay(committed, localDateKey(event.time), { turns: 1 }, config)
      const reason = event.data.reason
      if (reason.kind === 'error' || reason.kind === 'interrupted') {
        return addToDay(counted, localDateKey(event.time), { failedTurns: 1 }, config)
      }
      return counted
    }

    case 'step/start': {
      const touched = touch(state, event.time)
      const key = `${event.data.turn}:${event.data.step}`
      if (Object.hasOwn(touched.openSteps, key)) return touched
      return { ...touched, openSteps: { ...touched.openSteps, [key]: event.time } }
    }

    case 'assistant/message': {
      const touched = touch(state, event.time)
      const key = `${event.data.turn}:${event.data.step}`
      const start = touched.openSteps[key]
      if (start === undefined) return touched
      const openSteps = { ...touched.openSteps }
      delete openSteps[key]
      const llmMs = Math.max(0, event.time - start)
      return addToDay({ ...touched, openSteps }, localDateKey(event.time), { llmMs }, config)
    }

    case 'step/end': {
      const touched = touch(state, event.time)
      const key = `${event.data.turn}:${event.data.step}`
      if (!Object.hasOwn(touched.openSteps, key)) return touched
      const openSteps = { ...touched.openSteps }
      delete openSteps[key]
      return { ...touched, openSteps }
    }

    case 'tool/call': {
      const touched = touch(state, event.time)
      const counted = addToDay(touched, localDateKey(event.time), { tools: 1 }, config)
      const callId = event.data.callId
      if (Object.hasOwn(counted.openCalls, callId)) return counted
      return {
        ...counted,
        openCalls: { ...counted.openCalls, [callId]: { start: event.time, turn: event.data.turn } },
      }
    }

    case 'tool/result': {
      const touched = touch(state, event.time)
      const callId = event.data.message.source.callId
      if (!Object.hasOwn(touched.openCalls, callId)) return touched
      const openCalls = { ...touched.openCalls }
      delete openCalls[callId]
      return { ...touched, openCalls }
    }

    case 'user/message': {
      const touched = touch(state, event.time)
      // Only human-origin prompts are user interactions; inject/cron/goal
      // rounds are automated and already covered by their turn spans.
      if (event.data.source.kind !== 'user') return touched
      const counted = addToDay(touched, localDateKey(event.time), { prompts: 1 }, config)
      return pushRecent(counted, { start: event.time, end: event.time, kind: 'prompt' }, config)
    }

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

/** The activity slice of the `calendar` wire value. */
export interface ActivityViewValue {
  firstActivityAt?: number
  lastActivityAt?: number
  totalActiveMs: number
  days: CalendarDayBucket[]
  recentIntervals: CalendarInterval[]
  hourProfile: number[]
}

/** Normalize the 24-hour profile to 0..1 by the hottest hour. */
function computeHourProfile(state: ActivityState): number[] {
  const raw = new Array<number>(24).fill(0)
  for (const date of state.hourDayOrder) {
    const arr = state.hourByDay[date]
    if (arr === undefined) continue
    for (let h = 0; h < 24; h++) raw[h] = (raw[h] ?? 0) + (arr[h] ?? 0)
  }
  const max = Math.max(...raw)
  if (max <= 0) return new Array<number>(24).fill(0)
  return raw.map(v => v / max)
}

/** The wire-safe activity view of the fold state. */
export function activityView(state: ActivityState): ActivityViewValue {
  const days: CalendarDayBucket[] = []
  for (const date of state.dayOrder) {
    const bucket = state.days[date]
    if (bucket !== undefined) days.push({ date, ...bucket })
  }
  const value: ActivityViewValue = {
    totalActiveMs: state.totalActiveMs,
    days,
    recentIntervals: state.recent,
    hourProfile: computeHourProfile(state),
  }
  if (state.firstActivityAt !== null) value.firstActivityAt = state.firstActivityAt
  if (state.lastActivityAt !== null) value.lastActivityAt = state.lastActivityAt
  return value
}
