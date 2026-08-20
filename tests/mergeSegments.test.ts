/**
 * Task-segment merge tests: user prompts open a segment, following turns join
 * while gaps stay under the threshold, and prompts/turns count correctly.
 */

import { describe, expect, it } from 'vitest'
import { mergeSegments, SEGMENT_GAP_MS } from '../src/client/useCalendarData'
import type { CalendarInterval } from '../src/types'

const MIN = 60_000

function turn(start: number, end: number): CalendarInterval {
  return { start, end, kind: 'turn' }
}
function prompt(at: number): CalendarInterval {
  return { start: at, end: at, kind: 'prompt' }
}

describe('mergeSegments', () => {
  it('merges turns closer than the gap into one task segment', () => {
    const t0 = 1_700_000_000_000
    const segments = mergeSegments([
      turn(t0, t0 + 2 * MIN),
      turn(t0 + 3 * MIN, t0 + 5 * MIN),   // gap 1 min < 5 min → same segment
    ])
    expect(segments).toEqual([{ start: t0, end: t0 + 5 * MIN, turns: 2, prompts: 0 }])
  })

  it('splits turns separated by more than the gap', () => {
    const t0 = 1_700_000_000_000
    const segments = mergeSegments([
      turn(t0, t0 + 2 * MIN),
      turn(t0 + 10 * MIN, t0 + 12 * MIN), // gap 8 min > 5 min → new segment
    ])
    expect(segments).toHaveLength(2)
    expect(segments[0]).toMatchObject({ end: t0 + 2 * MIN, turns: 1 })
    expect(segments[1]).toMatchObject({ start: t0 + 10 * MIN, turns: 1 })
  })

  it('opens a new segment at every prompt and folds a following turn into it', () => {
    const t0 = 1_700_000_000_000
    const segments = mergeSegments([
      turn(t0, t0 + 2 * MIN),
      prompt(t0 + 10 * MIN),
      turn(t0 + 10 * MIN + 30_000, t0 + 12 * MIN), // tight after the prompt → same segment
    ])
    expect(segments).toHaveLength(2)
    expect(segments[0]).toMatchObject({ start: t0, end: t0 + 2 * MIN, turns: 1, prompts: 0 })
    expect(segments[1]).toMatchObject({ start: t0 + 10 * MIN, end: t0 + 12 * MIN, turns: 1, prompts: 1 })
  })

  it('keeps a prompt-only segment when no work follows', () => {
    const t0 = 1_700_000_000_000
    const segments = mergeSegments([prompt(t0)])
    expect(segments).toEqual([{ start: t0, end: t0, turns: 0, prompts: 1 }])
  })

  it('sorts unsorted input by start', () => {
    const t0 = 1_700_000_000_000
    const segments = mergeSegments([
      turn(t0 + 5 * MIN, t0 + 6 * MIN),
      turn(t0, t0 + 2 * MIN),
    ])
    expect(segments).toHaveLength(1)
    expect(segments[0]).toMatchObject({ start: t0, end: t0 + 6 * MIN, turns: 2 })
  })

  it('respects a custom gap threshold', () => {
    const t0 = 1_700_000_000_000
    const gap = SEGMENT_GAP_MS
    // 4-minute gap: merged at the default 5-min threshold...
    expect(mergeSegments([turn(t0, t0 + MIN), turn(t0 + 5 * MIN, t0 + 6 * MIN)], gap)).toHaveLength(1)
    // ...but split with a 3-minute threshold.
    expect(mergeSegments([turn(t0, t0 + MIN), turn(t0 + 5 * MIN, t0 + 6 * MIN)], 3 * MIN)).toHaveLength(2)
  })
})
