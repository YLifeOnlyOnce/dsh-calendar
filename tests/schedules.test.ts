/**
 * Schedule fold unit tests: create/delete/dispatch transitions and the
 * fixed-rate advancement rule.
 */

import { describe, expect, it } from 'vitest'
import { applyScheduleEvent, createScheduleState, scheduleView } from '../src/schedules'
import type { CalendarScheduleRecord } from '../src/types'
import { scheduleChange, todoWrite } from './events'

const MIN = 60_000
const HOUR = 60 * MIN

/** `schedule/change` create for a record. */
function create(seq: number, time: number, record: CalendarScheduleRecord) {
  return scheduleChange(seq, time, { version: 1, operation: 'create', schedule: record })
}

/** `schedule/change` dispatch for a record id. */
function dispatch(seq: number, time: number, id: string, acceptedAt?: string) {
  return scheduleChange(seq, time, { version: 1, operation: 'dispatch', id, acceptedAt })
}

describe('create / delete', () => {
  it('tracks an after record', () => {
    let state = createScheduleState()
    state = applyScheduleEvent(state, create(0, Date.UTC(2026, 0, 10, 10, 0, 0), {
      id: 'a1', kind: 'after', prompt: 'ping', scheduledAt: '2026-01-10T10:05:00.000Z', afterSeconds: 300,
    }))
    const view = scheduleView(state)
    expect(view.schedules).toHaveLength(1)
    expect(view.schedules[0]).toMatchObject({ id: 'a1', kind: 'after', afterSeconds: 300 })
    expect(view.scheduleHistory).toHaveLength(0)
  })

  it('removes a deleted record', () => {
    let state = createScheduleState()
    state = applyScheduleEvent(state, create(0, 0, { id: 'a1', kind: 'at', prompt: 'p', scheduledAt: '2026-01-10T10:00:00.000Z' }))
    state = applyScheduleEvent(state, scheduleChange(1, 0, { version: 1, operation: 'delete', id: 'a1' }))
    expect(scheduleView(state).schedules).toHaveLength(0)
  })

  it('returns the same reference for non-schedule events', () => {
    const state = createScheduleState()
    expect(applyScheduleEvent(state, todoWrite(0, 0))).toBe(state)
  })
})

describe('dispatch', () => {
  it('terminates a one-shot on dispatch and records history', () => {
    const created = Date.UTC(2026, 0, 10, 10, 0, 0)
    let state = createScheduleState()
    state = applyScheduleEvent(state, create(0, created, { id: 'a1', kind: 'at', prompt: 'p', scheduledAt: '2026-01-10T10:05:00.000Z' }))
    const fired = Date.UTC(2026, 0, 10, 10, 5, 0)
    state = applyScheduleEvent(state, dispatch(1, fired, 'a1'))
    const view = scheduleView(state)
    expect(view.schedules).toHaveLength(0)
    expect(view.scheduleHistory).toEqual([{ id: 'a1', kind: 'at', firedAt: new Date(fired).toISOString() }])
  })

  it('advances an every record to the next anchor-aligned target', () => {
    const anchor = Date.UTC(2026, 0, 10, 10, 0, 0) // scheduledAt = anchor
    let state = createScheduleState()
    state = applyScheduleEvent(state, create(0, anchor, {
      id: 'e1', kind: 'every', prompt: 'poll', scheduledAt: new Date(anchor).toISOString(), everySeconds: 3600,
    }))
    // Decision at 11:10 → next aligned target after it: 12:00.
    const decision = Date.UTC(2026, 0, 10, 11, 10, 0)
    state = applyScheduleEvent(state, dispatch(1, decision, 'e1', new Date(decision).toISOString()))
    const view = scheduleView(state)
    expect(view.schedules).toHaveLength(1)
    expect(view.schedules[0]).toMatchObject({ id: 'e1', scheduledAt: new Date(Date.UTC(2026, 0, 10, 12, 0, 0)).toISOString() })
    expect(view.schedules[0]?.lastFiredAt).toBe(new Date(decision).toISOString())
    expect(view.scheduleHistory).toHaveLength(1)
  })

  it('keeps every advancement on the same lattice across multiple dispatches', () => {
    const anchor = Date.UTC(2026, 0, 10, 10, 0, 0)
    let state = createScheduleState()
    state = applyScheduleEvent(state, create(0, anchor, {
      id: 'e1', kind: 'every', prompt: 'p', scheduledAt: new Date(anchor).toISOString(), everySeconds: 3600,
    }))
    state = applyScheduleEvent(state, dispatch(1, Date.UTC(2026, 0, 10, 11, 10, 0), 'e1', '2026-01-10T11:10:00.000Z'))
    // Second dispatch at 13:45 → next aligned: 14:00 (13:00 is already past).
    state = applyScheduleEvent(state, dispatch(2, Date.UTC(2026, 0, 10, 13, 45, 0), 'e1', '2026-01-10T13:45:00.000Z'))
    const view = scheduleView(state)
    expect(view.schedules[0]?.scheduledAt).toBe(new Date(Date.UTC(2026, 0, 10, 14, 0, 0)).toISOString())
  })

  it('terminates an every record whose next target leaves the four-digit year', () => {
    const anchor = Date.UTC(9999, 11, 31, 23, 0, 0)
    let state = createScheduleState()
    state = applyScheduleEvent(state, create(0, anchor, {
      id: 'e1', kind: 'every', prompt: 'p', scheduledAt: new Date(anchor).toISOString(), everySeconds: 3600,
    }))
    state = applyScheduleEvent(state, dispatch(1, anchor + HOUR, 'e1', new Date(anchor + HOUR).toISOString()))
    expect(scheduleView(state).schedules).toHaveLength(0)
  })

  it('caps the dispatch history', () => {
    let state = createScheduleState()
    for (let i = 0; i < 60; i++) {
      const id = `a${i}`
      const created = Date.UTC(2026, 0, 10) + i * HOUR
      state = applyScheduleEvent(state, create(0, created, { id, kind: 'at', prompt: 'p', scheduledAt: new Date(created).toISOString() }))
      state = applyScheduleEvent(state, dispatch(1, created, id))
    }
    const view = scheduleView(state)
    expect(view.scheduleHistory).toHaveLength(50)
    expect(view.scheduleHistory[0]).toMatchObject({ id: 'a10' })
  })
})
