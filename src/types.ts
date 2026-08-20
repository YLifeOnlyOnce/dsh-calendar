/**
 * Pure types of the dsh-calendar domain: the ONE home of the `calendar`
 * projection-key declaration and the `schedule/change` event-merge, free of
 * this package's host-side value imports (cordis context, zod, fold state).
 * Both declaration merges land here so host and client aggregates share one
 * table with zero content duplication.
 *
 * @module dsh-calendar/types
 */

// Marks this file a module so the declarations below AUGMENT the session and
// projection tables instead of declaring ambient modules.
export {}

// ---------------------------------------------------------------------------
// schedule/change event merge
// ---------------------------------------------------------------------------
// Structural mirror of `@deepseek-ai/dsh-schedule`'s durable `ScheduleChange`
// union (see the schedule subsystem docs). The calendar only READS these
// events to render recurring-task plans and dispatch history; the schedule
// plugin remains the sole writer and validation authority.

/** Durable reminder record as folded from `schedule/change` create events. */
export interface CalendarScheduleRecord {
  /** Session-local stable identity. */
  readonly id: string
  /** Rule discriminator: delayed one-shot, absolute one-shot, or fixed-rate. */
  readonly kind: 'after' | 'at' | 'every'
  /** Trimmed reminder content supplied at creation. */
  readonly prompt: string
  /** Four-digit-year RFC 3339 UTC target. */
  readonly scheduledAt: string
  /** Positive delay retained by an `after` record. */
  readonly afterSeconds?: number
  /** Fixed safe-integer interval retained by an `every` record. */
  readonly everySeconds?: number
}

/** The version-1 durable Schedule mutation union, mirrored for the fold. */
export type CalendarScheduleChange =
  | { readonly version: 1; readonly operation: 'create'; readonly schedule: CalendarScheduleRecord }
  | { readonly version: 1; readonly operation: 'delete'; readonly id: string }
  | { readonly version: 1; readonly operation: 'dispatch'; readonly id: string; readonly acceptedAt?: string }

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /** Versioned Schedule mutation; the calendar folds it into plan/history views. */
    'schedule/change': CalendarScheduleChange
  }
}

// ---------------------------------------------------------------------------
// calendar projection value (the wire shape) + key merge
// ---------------------------------------------------------------------------

/** One day of activity for one session, keyed by local calendar date. */
export interface CalendarDayBucket {
  /** Local calendar date, `YYYY-MM-DD` (host machine timezone). */
  readonly date: string
  /** Wall-clock milliseconds the session was active that day (turn spans). */
  readonly activeMs: number
  /** Turns closed that day (`turn/end` events). */
  readonly turns: number
  /** Tool calls dispatched that day (`tool/call` events). */
  readonly tools: number
  /** Summed model wall time (`step/start` → `assistant/message`) that day. */
  readonly llmMs: number
  /** Human-origin user messages that day (`user/message` with source kind `user`). */
  readonly prompts: number
  /** Turns that ended in `error` or `interrupted` that day. */
  readonly failedTurns: number
}

/** One activity interval or point on a session's timeline. */
export interface CalendarInterval {
  /** Unix epoch milliseconds. */
  readonly start: number
  /** Unix epoch milliseconds; equals `start` for point events. */
  readonly end: number
  /** A closed turn span, or a human prompt point. */
  readonly kind: 'turn' | 'prompt'
}

/** One active recurring reminder of a session. */
export interface CalendarSchedule {
  /** Session-local stable identity. */
  readonly id: string
  /** Rule discriminator. */
  readonly kind: 'after' | 'at' | 'every'
  /** Reminder content. */
  readonly prompt: string
  /** Next (or only) UTC target; the client derives scheduled/overdue from its clock. */
  readonly scheduledAt: string
  /** Positive delay retained by an `after` record. */
  readonly afterSeconds?: number
  /** Fixed interval retained by an `every` record. */
  readonly everySeconds?: number
  /** RFC 3339 UTC time of the most recent dispatch, when one happened. */
  readonly lastFiredAt?: string
}

/** One recorded schedule dispatch on the session timeline. */
export interface CalendarDispatch {
  /** The dispatched record's identity. */
  readonly id: string
  /** Rule discriminator at dispatch time. */
  readonly kind: 'after' | 'at' | 'every'
  /** RFC 3339 UTC dispatch time (the `schedule/change` event time). */
  readonly firedAt: string
}

/**
 * The `calendar` projection wire value: compact per-session usage facts that
 * the Web calendar page aggregates across `useSessions()` rows without
 * opening any session or pulling full logs.
 */
export interface CalendarValue {
  /** Time of the first recorded activity, epoch ms. */
  readonly firstActivityAt?: number
  /** Time of the most recent recorded activity, epoch ms. */
  readonly lastActivityAt?: number
  /** Total active wall time across all recorded turn spans, ms. */
  readonly totalActiveMs: number
  /** Per-day buckets, ascending by date, bounded by `keepDays`. */
  readonly days: CalendarDayBucket[]
  /** Most recent activity intervals, bounded by `intervalCap`. */
  readonly recentIntervals: CalendarInterval[]
  /** 24 hourly activity intensities (0..1, normalized by the hottest hour) over the last `hourProfileDays`. */
  readonly hourProfile: number[]
  /** Active recurring reminders (client derives scheduled/overdue). */
  readonly schedules: CalendarSchedule[]
  /** Recent dispatch history, bounded. */
  readonly scheduleHistory: CalendarDispatch[]
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Per-session usage calendar facts; see {@link CalendarValue}. */
    calendar: CalendarValue
  }
}
