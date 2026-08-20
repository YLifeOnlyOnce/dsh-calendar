/**
 * Projection unit tests: definition shape, wire-schema validation, and
 * reference gating at the combined level.
 */

import { describe, expect, it } from 'vitest'
import { calendarValueSchema, createCalendarProjectionDefinition } from '../src/projection'
import { createCalendarState } from '../src/projection'
import type { Config } from '../src/config'
import {
  assistantMessage, scheduleChange, stepEnd, stepStart, todoWrite, toolCall,
  toolResult, turnEnd, turnStart,
} from './events'

const config: Config = { keepDays: 400, intervalCap: 300, hourProfileDays: 30 }
const definition = createCalendarProjectionDefinition(config)

describe('definition', () => {
  it('declares the calendar key and a stable state version', () => {
    expect(definition.key).toBe('calendar')
    expect(definition.stateVersion).toBe(1)
  })

  it('produces an empty view that passes the wire schema', () => {
    const state = definition.init()
    const value = definition.view(state)
    expect(calendarValueSchema.safeParse(value).success).toBe(true)
    expect(value).toMatchObject({ totalActiveMs: 0, days: [], recentIntervals: [], schedules: [], scheduleHistory: [] })
    expect(value.hourProfile).toHaveLength(24)
  })

  it('returns the same top-level reference when no sub-fold changed', () => {
    const state = createCalendarState()
    expect(definition.apply(state, todoWrite(0, 0))).toBe(state)
  })

  it('folds a realistic event stream into a schema-valid view', () => {
    const t0 = Date.UTC(2026, 0, 10, 10, 0, 0)
    const events = [
      turnStart(0, t0, 0),
      stepStart(1, t0, 0, 0),
      assistantMessage(2, t0 + 60_000, 0, 0),
      toolCall(3, t0 + 60_000, 0, 0, 'c1'),
      toolResult(4, t0 + 120_000, 'c1'),
      stepEnd(5, t0 + 120_000, 0, 0),
      turnEnd(6, t0 + 180_000, 0),
      scheduleChange(7, t0 + 180_000, {
        version: 1, operation: 'create',
        schedule: { id: 'e1', kind: 'every', prompt: 'poll', scheduledAt: '2026-01-10T10:10:00.000Z', everySeconds: 3600 },
      }),
    ]
    const state = events.reduce((s, e) => definition.apply(s, e), definition.init())
    const value = definition.view(state)
    expect(calendarValueSchema.parse(value)).toEqual(value)
    expect(value.totalActiveMs).toBe(180_000)
    expect(value.days).toHaveLength(1)
    expect(value.days[0]).toMatchObject({ turns: 1, tools: 1, llmMs: 60_000, activeMs: 180_000 })
    expect(value.schedules).toHaveLength(1)
  })
})
