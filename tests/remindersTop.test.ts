/**
 * Reminders & top-sessions view-model tests: status splitting, fired-history
 * ordering, per-day ⏰ markers, and per-session range sums.
 */

import { describe, expect, it } from 'vitest'
import { collectReminders, schedulesOn, sumSessionsInRange, type SessionRow } from '../src/client/useCalendarData'
import type { CalendarValue } from '../src/types'
import type { CalendarSchedule } from '../src/types'

const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

/** RFC 3339 UTC string of an epoch-ms value. */
function iso(ms: number): string {
  return new Date(ms).toISOString()
}

function row(id: string, value: Partial<CalendarValue>): SessionRow {
  return { id, title: `session ${id}`, cwd: `/ws/${id}`, running: false, value: { totalActiveMs: 0, days: [], recentIntervals: [], hourProfile: [], schedules: [], scheduleHistory: [], ...value } }
}

function schedule(id: string, atMs: number, kind: CalendarSchedule['kind'] = 'every'): CalendarSchedule {
  return { id, kind, prompt: `prompt ${id}`, scheduledAt: iso(atMs), ...(kind === 'every' ? { everySeconds: DAY } : {}) }
}

describe('collectReminders', () => {
  const now = 1_800_000_000_000
  it('splits upcoming vs overdue by the reference clock', () => {
    const rows = [
      row('a', { schedules: [schedule('a1', now - 60_000), schedule('a2', now + HOUR)] }),
      row('b', { schedules: [schedule('b1', now + 2 * HOUR)] }),
    ]
    const model = collectReminders(rows, now)
    expect(model.upcoming.map(r => r.schedule.id)).toEqual(['a2', 'b1'])
    expect(model.overdue.map(r => r.schedule.id)).toEqual(['a1'])
  })

  it('sorts upcoming by target time and fired history newest first', () => {
    const rows = [
      row('a', {
        schedules: [schedule('a1', now + DAY)],
        scheduleHistory: [
          { id: 'h1', kind: 'every', firedAt: iso(now - DAY) },
          { id: 'h2', kind: 'every', firedAt: iso(now - 2 * DAY) },
        ],
      }),
    ]
    const model = collectReminders(rows, now)
    expect(model.upcoming.map(r => r.schedule.id)).toEqual(['a1'])
    expect(model.fired.map(r => r.dispatch.id)).toEqual(['h1', 'h2'])
  })

  it('ignores rows without a projection value', () => {
    const model = collectReminders([{ id: 'x', title: 'x', cwd: '', running: false }], now)
    expect(model.upcoming).toEqual([])
    expect(model.overdue).toEqual([])
    expect(model.fired).toEqual([])
  })
})

describe('schedulesOn', () => {
  it('returns only schedules whose LOCAL date matches the day', () => {
    // 2027-01-02T10:00:00Z — in UTC this is the 2nd; assert against a local
    // key so the test is timezone-independent.
    const at = Date.UTC(2027, 0, 2, 10, 0, 0)
    const rows = [
      row('a', { schedules: [schedule('s1', at), schedule('s2', at + DAY)] }),
    ]
    const key = new Date(at).toLocaleDateString('en-CA') // YYYY-MM-DD in local tz
    const marks = schedulesOn(rows, key)
    expect(marks.map(m => m.schedule.id)).toEqual(['s1'])
  })
})

describe('sumSessionsInRange', () => {
  it('sums per-session usage over an inclusive local range, sorted by active time', () => {
    const rows = [
      row('a', {
        days: [
          { date: '2027-01-01', activeMs: 2 * HOUR, turns: 10, tools: 20, llmMs: 0, prompts: 2, failedTurns: 0, tokensIn: 0, tokensOut: 0 },
          { date: '2027-01-03', activeMs: HOUR, turns: 5, tools: 9, llmMs: 0, prompts: 1, failedTurns: 0, tokensIn: 0, tokensOut: 0 },
          { date: '2027-02-01', activeMs: 5 * HOUR, turns: 30, tools: 60, llmMs: 0, prompts: 4, failedTurns: 0, tokensIn: 0, tokensOut: 0 },
        ],
      }),
      row('b', {
        days: [
          { date: '2027-01-02', activeMs: 3 * HOUR, turns: 15, tools: 12, llmMs: 0, prompts: 3, failedTurns: 0, tokensIn: 0, tokensOut: 0 },
        ],
      }),
      row('c', { days: [{ date: '2026-12-31', activeMs: 9 * HOUR, turns: 40, tools: 80, llmMs: 0, prompts: 5, failedTurns: 0, tokensIn: 0, tokensOut: 0 }] }),
    ]
    const sums = sumSessionsInRange(rows, '2027-01-01', '2027-01-31')
    // Stable sort: both sessions total 3h in range, insertion order (a, b) holds.
    expect(sums.map(s => [s.id, s.activeMs])).toEqual([
      ['a', 3 * HOUR],
      ['b', 3 * HOUR],
    ])
    expect(sums[0]?.turns).toBe(15)
    expect(sums.some(s => s.id === 'c')).toBe(false)
  })

  it('drops sessions with no activity in range', () => {
    const rows = [
      row('a', { days: [{ date: '2027-01-01', activeMs: HOUR, turns: 1, tools: 0, llmMs: 0, prompts: 0, failedTurns: 0, tokensIn: 0, tokensOut: 0 }] }),
    ]
    const sums = sumSessionsInRange(rows, '2027-02-01', '2027-02-28')
    expect(sums).toEqual([])
  })
})
