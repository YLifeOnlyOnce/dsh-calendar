/**
 * The schedule fold: `schedule/change` events → the session's active
 * recurring reminders and dispatch history. The calendar is a READ-ONLY
 * consumer of the schedule subsystem's durable log; `dsh-schedule` remains
 * the sole writer and validation authority, so this fold trusts the event
 * stream's already-validated shape (strict decoder upstream).
 *
 * ## Fixed-rate advancement
 *
 * An `every` dispatch advances the record to the first creation-anchor-aligned
 * target after the dispatch decision time — the schedule subsystem's own rule
 * (`next = anchor + k·everySeconds` for the smallest integer `k` with
 * `next > acceptedAt`). The creation anchor is the record's first
 * `scheduledAt`. If the advanced target leaves the four-digit UTC year, the
 * record terminates (matching the subsystem's final-dispatch rule).
 *
 * @module dsh-calendar/schedules
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { CalendarDispatch, CalendarSchedule } from './types.ts'

/** Dispatch-history cap (bounded wire value). */
const HISTORY_CAP = 50

/** Plain-JSON fold state. */
export interface ScheduleState {
  /** id → active record (deleted or dispatched one-shots are removed). */
  records: Record<string, CalendarSchedule>
  /** Recent dispatches, newest last, bounded. */
  history: CalendarDispatch[]
}

/** Fresh schedule fold state. */
export function createScheduleState(): ScheduleState {
  return { records: {}, history: [] }
}

/** RFC 3339 UTC string from an epoch-ms value. */
function iso(time: number): string {
  return new Date(time).toISOString()
}

/** Parse an RFC 3339 string to epoch ms; NaN for malformed input. */
function parseIso(value: string): number {
  return Date.parse(value)
}

/**
 * The first creation-anchor-aligned target strictly after `decisionMs`, or
 * null when it cannot fit in a four-digit UTC year.
 */
function nextEveryTarget(anchorMs: number, everySeconds: number, decisionMs: number): number | null {
  const everyMs = everySeconds * 1000
  if (!Number.isFinite(everyMs) || everyMs <= 0) return null
  const k = Math.floor((decisionMs - anchorMs) / everyMs) + 1
  const next = anchorMs + Math.max(1, k) * everyMs
  return next > Date.UTC(9999, 11, 31, 23, 59, 59, 999) ? null : next
}

/**
 * Fold one committed `schedule/change` event. Returns the SAME reference for
 * events that are not schedule mutations.
 */
export function applyScheduleEvent(state: ScheduleState, event: SessionEvent): ScheduleState {
  if (event.type !== 'schedule/change') return state
  const change = event.data

  switch (change.operation) {
    case 'create': {
      const record = change.schedule
      const next: CalendarSchedule = {
        id: record.id,
        kind: record.kind,
        prompt: record.prompt,
        scheduledAt: record.scheduledAt,
        ...(record.afterSeconds !== undefined ? { afterSeconds: record.afterSeconds } : {}),
        ...(record.everySeconds !== undefined ? { everySeconds: record.everySeconds } : {}),
      }
      return { ...state, records: { ...state.records, [record.id]: next } }
    }

    case 'delete': {
      if (!Object.hasOwn(state.records, change.id)) return state
      const records = { ...state.records }
      delete records[change.id]
      return { ...state, records }
    }

    case 'dispatch': {
      const record = state.records[change.id]
      if (record === undefined) return state
      const firedAt = iso(event.time)
      const history = [...state.history, { id: change.id, kind: record.kind, firedAt }]
      const bounded = history.length > HISTORY_CAP ? history.slice(history.length - HISTORY_CAP) : history

      if (record.kind === 'every' && record.everySeconds !== undefined) {
        const anchorMs = parseIso(record.scheduledAt)
        const decisionMs = change.acceptedAt !== undefined ? parseIso(change.acceptedAt) : event.time
        if (!Number.isNaN(anchorMs) && !Number.isNaN(decisionMs)) {
          const target = nextEveryTarget(anchorMs, record.everySeconds, decisionMs)
          if (target !== null) {
            return {
              ...state,
              records: {
                ...state.records,
                [change.id]: { ...record, scheduledAt: iso(target), lastFiredAt: firedAt },
              },
              history: bounded,
            }
          }
        }
        // Un-advanceable every record: terminate (final dispatch).
        const records = { ...state.records }
        delete records[change.id]
        return { ...state, records, history: bounded }
      }

      // One-shot dispatch is terminal.
      const records = { ...state.records }
      delete records[change.id]
      return { ...state, records, history: bounded }
    }

    default:
      return state
  }
}

/** The schedule slice of the `calendar` wire value. */
export interface ScheduleViewValue {
  schedules: CalendarSchedule[]
  scheduleHistory: CalendarDispatch[]
}

/** The wire-safe schedule view of the fold state. */
export function scheduleView(state: ScheduleState): ScheduleViewValue {
  return {
    schedules: Object.values(state.records),
    scheduleHistory: state.history,
  }
}
