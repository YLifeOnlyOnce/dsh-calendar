/**
 * Activity fold unit tests. Local-date expectations use UTC (the vitest
 * config pins `TZ=UTC`), so `toISOString().slice(0, 10)` is the local date.
 */

import { describe, expect, it } from 'vitest'
import { applyActivityEvent, activityView, createActivityState } from '../src/activity'
import type { Config } from '../src/config'
import {
  assistantMessage, assistantMessageWithUsage, endSeed, stepEnd, stepStart, todoWrite, toolCall, toolResult,
  turnEnd, turnStart, userMessage,
} from './events'

const MIN = 60_000

const config: Config = { keepDays: 400, intervalCap: 300, hourProfileDays: 30 }

/** Fold a stream of events into a fresh state. */
function fold(events: ReturnType<typeof turnStart>[], cfg: Config = config) {
  return events.reduce((state, event) => applyActivityEvent(state, event, cfg), createActivityState())
}

/** ISO date of an epoch-ms value (UTC === local under the pinned TZ). */
function dateOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

describe('turn spans', () => {
  it('adds a closed turn to totals, the day bucket, and the recent ring', () => {
    const t0 = Date.UTC(2026, 0, 10, 10, 0, 0)
    const state = fold([
      turnStart(0, t0, 0),
      turnEnd(1, t0 + 5 * MIN, 0),
    ])
    const view = activityView(state)
    expect(view.totalActiveMs).toBe(5 * MIN)
    expect(view.firstActivityAt).toBe(t0)
    expect(view.lastActivityAt).toBe(t0 + 5 * MIN)
    expect(view.days).toHaveLength(1)
    expect(view.days[0]).toMatchObject({ date: dateOf(t0), activeMs: 5 * MIN, turns: 1 })
    expect(view.recentIntervals).toEqual([{ start: t0, end: t0 + 5 * MIN, kind: 'turn' }])
  })

  it('counts zero-duration turns without corrupting totals', () => {
    const t0 = Date.UTC(2026, 0, 10, 12, 0, 0)
    const state = fold([turnStart(0, t0, 0), turnEnd(1, t0, 0)])
    const view = activityView(state)
    expect(view.totalActiveMs).toBe(0)
    expect(view.days[0]).toMatchObject({ activeMs: 0, turns: 1 })
  })

  it('splits a turn crossing local midnight across two day buckets', () => {
    const start = Date.UTC(2026, 0, 10, 23, 30, 0)
    const end = Date.UTC(2026, 0, 11, 0, 30, 0)
    const state = fold([turnStart(0, start, 0), turnEnd(1, end, 0)])
    const view = activityView(state)
    expect(view.totalActiveMs).toBe(60 * MIN)
    expect(view.days).toHaveLength(2)
    expect(view.days[0]).toMatchObject({ date: '2026-01-10', activeMs: 30 * MIN })
    expect(view.days[1]).toMatchObject({ date: '2026-01-11', activeMs: 30 * MIN })
  })

  it('tracks the open turn only while unclosed and drops stale opens', () => {
    const t0 = Date.UTC(2026, 0, 10, 9, 0, 0)
    // A turn that never closes contributes nothing; the next turn starts fresh.
    const state = fold([
      turnStart(0, t0, 0),
      turnStart(1, t0 + 60 * MIN, 1),
      turnEnd(2, t0 + 61 * MIN, 1),
    ])
    const view = activityView(state)
    expect(view.totalActiveMs).toBe(1 * MIN)
    expect(view.days[0]).toMatchObject({ turns: 1 })
  })
})

describe('counts', () => {
  it('counts tool calls on their day without adding duration', () => {
    const t0 = Date.UTC(2026, 0, 10, 14, 0, 0)
    const state = fold([
      turnStart(0, t0, 0),
      toolCall(1, t0, 0, 0, 'call-1'),
      toolResult(2, t0 + 2 * MIN, 'call-1'),
      toolCall(3, t0 + 3 * MIN, 0, 0, 'call-2'),
      turnEnd(4, t0 + 4 * MIN, 0),
    ])
    const view = activityView(state)
    expect(view.days[0]).toMatchObject({ tools: 2, activeMs: 4 * MIN })
  })

  it('spans llmMs from step/start to assistant/message on the event day', () => {
    const t0 = Date.UTC(2026, 0, 10, 16, 0, 0)
    const state = fold([
      turnStart(0, t0, 0),
      stepStart(1, t0, 0, 0),
      assistantMessage(2, t0 + 2 * MIN, 0, 0),
      stepEnd(3, t0 + 2 * MIN, 0, 0),
      turnEnd(4, t0 + 2 * MIN, 0),
    ])
    expect(activityView(state).days[0]).toMatchObject({ llmMs: 2 * MIN })
  })

  it('folds token usage with billed-input semantics and skips absent usage', () => {
    const t0 = Date.UTC(2026, 0, 10, 16, 0, 0)
    const state = fold([
      turnStart(0, t0, 0),
      stepStart(1, t0, 0, 0),
      // 100 uncached + 40 cache-read + 10 cache-write → billed in = 150; out = 80
      assistantMessageWithUsage(2, t0 + MIN, 0, 0, { input: 100, output: 80, cacheRead: 40, cacheWrite: 10 }),
      stepEnd(3, t0 + MIN, 0, 0),
      turnEnd(4, t0 + MIN, 0),
      // Second turn: no usage reported → tokens stay 0 for that step.
      turnStart(5, t0 + 2 * MIN, 1),
      stepStart(6, t0 + 2 * MIN, 1, 0),
      assistantMessage(7, t0 + 3 * MIN, 1, 0),
      stepEnd(8, t0 + 3 * MIN, 1, 0),
      turnEnd(9, t0 + 3 * MIN, 1),
    ])
    const bucket = activityView(state).days[0]
    expect(bucket).toBeDefined()
    expect(bucket).toMatchObject({ tokensIn: 150, tokensOut: 80 })
    expect((bucket?.tokensIn ?? 0) + (bucket?.tokensOut ?? 0)).toBe(230)
  })

  it('counts human prompts as points and ignores synthetic ones', () => {
    const t0 = Date.UTC(2026, 0, 10, 18, 0, 0)
    const state = fold([
      userMessage(0, t0, 'user'),
      userMessage(1, t0 + MIN, 'plugin'),
      turnStart(2, t0 + 2 * MIN, 0),
      turnEnd(3, t0 + 3 * MIN, 0),
    ])
    const view = activityView(state)
    expect(view.days[0]).toMatchObject({ prompts: 1 })
    expect(view.recentIntervals).toContainEqual({ start: t0, end: t0, kind: 'prompt' })
    expect(view.recentIntervals).toHaveLength(2)
  })

  it('counts failed turns only for error and interrupted reasons', () => {
    const t0 = Date.UTC(2026, 0, 10, 8, 0, 0)
    const state = fold([
      turnStart(0, t0, 0), turnEnd(1, t0 + MIN, 0, 'error'),
      turnStart(2, t0 + 2 * MIN, 1), turnEnd(3, t0 + 3 * MIN, 1, 'interrupted'),
      turnStart(4, t0 + 4 * MIN, 2), turnEnd(5, t0 + 5 * MIN, 2, 'aborted'),
      turnStart(6, t0 + 6 * MIN, 3), turnEnd(7, t0 + 7 * MIN, 3, 'completed'),
    ])
    expect(activityView(state).days[0]).toMatchObject({ turns: 4, failedTurns: 2 })
  })

  it('folds the whole log, seed history included (whole-log scope)', () => {
    const t0 = Date.UTC(2026, 0, 10, 7, 0, 0)
    const state = fold([
      turnStart(0, t0, 0), turnEnd(1, t0 + MIN, 0),
      endSeed(2, t0 + MIN),
      turnStart(3, t0 + 2 * MIN, 1), turnEnd(4, t0 + 3 * MIN, 1),
    ])
    expect(activityView(state).days[0]).toMatchObject({ turns: 2, activeMs: 2 * MIN })
  })
})

describe('bounds', () => {
  it('caps the recent ring at intervalCap', () => {
    const small: Config = { ...config, intervalCap: 3 }
    const t0 = Date.UTC(2026, 0, 10, 0, 0, 0)
    const events = Array.from({ length: 5 }, (_, i) => [
      turnStart(i * 2, t0 + i * MIN, i),
      turnEnd(i * 2 + 1, t0 + (i + 1) * MIN, i),
    ]).flat()
    const view = activityView(fold(events, small))
    expect(view.recentIntervals).toHaveLength(3)
    expect(view.recentIntervals[0]).toMatchObject({ start: t0 + 2 * MIN })
    expect(view.totalActiveMs).toBe(5 * MIN)
  })

  it('evicts day buckets beyond keepDays but keeps totals', () => {
    const small: Config = { ...config, keepDays: 2 }
    const t0 = Date.UTC(2026, 0, 10, 0, 0, 0)
    const events = Array.from({ length: 4 }, (_, i) => [
      turnStart(i * 2, t0 + i * 86400_000, i),
      turnEnd(i * 2 + 1, t0 + i * 86400_000 + MIN, i),
    ]).flat()
    const view = activityView(fold(events, small))
    expect(view.days).toHaveLength(2)
    expect(view.days[0]).toMatchObject({ date: dateOf(t0 + 2 * 86400_000) })
    expect(view.totalActiveMs).toBe(4 * MIN)
  })

  it('bounds the hourly profile to hourProfileDays', () => {
    const small: Config = { ...config, hourProfileDays: 2, keepDays: 5 }
    const t0 = Date.UTC(2026, 0, 10, 0, 0, 0)
    const events = Array.from({ length: 3 }, (_, i) => [
      turnStart(i * 2, t0 + i * 86400_000, i),
      turnEnd(i * 2 + 1, t0 + i * 86400_000 + MIN, i),
    ]).flat()
    const view = activityView(fold(events, small))
    // Only the last two days feed the profile; all spans sit in hour 0.
    expect(view.hourProfile[0]).toBe(1)
    const others = view.hourProfile.slice(1)
    expect(others.every(v => v === 0)).toBe(true)
  })

  it('normalizes the hourly profile by the hottest hour', () => {
    const t0 = Date.UTC(2026, 0, 10, 9, 0, 0)
    const state = fold([
      turnStart(0, t0, 0), turnEnd(1, t0 + 60 * MIN, 0),        // hour 9, 60 min
      turnStart(2, t0 + 24 * 3600_000, 1), turnEnd(3, t0 + 24 * 3600_000 + 30 * MIN, 1), // hour 9 again
      turnStart(4, t0 + 3600_000, 2), turnEnd(5, t0 + 3600_000 + 15 * MIN, 2), // hour 10, 15 min
    ])
    const view = activityView(state)
    expect(view.hourProfile[9]).toBe(1)
    expect(view.hourProfile[10]).toBeCloseTo(15 / 90, 6)
  })
})

describe('reference stability', () => {
  it('returns the same state reference for uninteresting events', () => {
    const state = createActivityState()
    const next = applyActivityEvent(state, todoWrite(0, Date.UTC(2026, 0, 10)), config)
    expect(next).toBe(state)
  })

  it('returns a new reference only when something changed', () => {
    const state = createActivityState()
    const touched = applyActivityEvent(state, turnStart(0, Date.UTC(2026, 0, 10), 0), config)
    expect(touched).not.toBe(state)
    const again = applyActivityEvent(touched, turnStart(1, Date.UTC(2026, 0, 10, 1), 1), config)
    expect(again).not.toBe(touched)
  })
})
