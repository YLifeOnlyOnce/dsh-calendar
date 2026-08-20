/**
 * The `calendar` projection unit: combines the activity fold (daily buckets,
 * recent intervals, hourly profile) and the schedule fold (active reminders,
 * dispatch history) into one wire value served through the session-projection
 * seam, so the Web calendar page aggregates `useSessions()` rows without
 * opening sessions or pulling logs. The unit is a factory over the plugin
 * config: the bounds (keepDays, intervalCap, hourProfileDays) are closures,
 * never part of the persisted state.
 *
 * @module dsh-calendar/projection
 */

import { z } from 'zod'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import type { CalendarValue } from './types.ts'
import type { Config } from './config.ts'
import {
  activityView,
  applyActivityEvent,
  createActivityState,
  type ActivityState,
} from './activity.ts'
import {
  applyScheduleEvent,
  createScheduleState,
  scheduleView,
  type ScheduleState,
} from './schedules.ts'

/** Combined plain-JSON fold state. */
export interface CalendarState {
  activity: ActivityState
  schedules: ScheduleState
}

/** Fresh combined state. */
export function createCalendarState(): CalendarState {
  return { activity: createActivityState(), schedules: createScheduleState() }
}

const dayBucketSchema = z.object({
  date: z.string(),
  activeMs: z.number().nonnegative(),
  turns: z.number().int().nonnegative(),
  tools: z.number().int().nonnegative(),
  llmMs: z.number().nonnegative(),
  prompts: z.number().int().nonnegative(),
  failedTurns: z.number().int().nonnegative(),
}).strict()

const intervalSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  kind: z.enum(['turn', 'prompt']),
}).strict()

const scheduleSchema = z.object({
  id: z.string(),
  kind: z.enum(['after', 'at', 'every']),
  prompt: z.string(),
  scheduledAt: z.string(),
  afterSeconds: z.number().int().positive().optional(),
  everySeconds: z.number().int().positive().optional(),
  lastFiredAt: z.string().optional(),
}).strict()

const dispatchSchema = z.object({
  id: z.string(),
  kind: z.enum(['after', 'at', 'every']),
  firedAt: z.string(),
}).strict()

/** Wire schema of the `calendar` value (validated at every projection read). */
export const calendarValueSchema = z.object({
  firstActivityAt: z.number().nonnegative().optional(),
  lastActivityAt: z.number().nonnegative().optional(),
  totalActiveMs: z.number().nonnegative(),
  days: z.array(dayBucketSchema),
  recentIntervals: z.array(intervalSchema),
  hourProfile: z.array(z.number().min(0).max(1)).length(24),
  schedules: z.array(scheduleSchema),
  scheduleHistory: z.array(dispatchSchema),
}).strict()

/**
 * Build the `calendar` unit for a plugin config. Registering the returned
 * definition is an effect on the calling fiber; unloading removes the key.
 */
export function createCalendarProjectionDefinition(config: Config): ProjectionDefinition<'calendar', CalendarState> {
  return {
    key: 'calendar',
    schema: calendarValueSchema,
    init: createCalendarState,
    apply: (state, event: SessionEvent) => {
      const activity = applyActivityEvent(state.activity, event, config)
      const schedules = applyScheduleEvent(state.schedules, event)
      if (activity === state.activity && schedules === state.schedules) return state
      return { activity, schedules }
    },
    view: state => ({
      ...activityView(state.activity),
      ...scheduleView(state.schedules),
    }),
    stateVersion: 1,
  }
}

export type { CalendarValue }
