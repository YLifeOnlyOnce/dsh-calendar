/**
 * Test fixtures: minimal `SessionEvent` builders for the fold unit tests.
 * Events are cast through `unknown` because the real union carries branded
 * ids and plugin-merged variants; the fold only reads the fields below.
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import type { CalendarScheduleChange } from '../src/types'

function ev(type: string, seq: number, time: number, data: unknown): SessionEvent {
  return { type, seq, time, data } as unknown as SessionEvent
}

/** `turn/start` for turn `turn` at `time`. */
export function turnStart(seq: number, time: number, turn: number): SessionEvent {
  return ev('turn/start', seq, time, { turn })
}

/** `turn/end` for turn `turn` at `time` with the given reason kind. */
export function turnEnd(seq: number, time: number, turn: number, kind: 'completed' | 'error' | 'interrupted' | 'aborted' = 'completed'): SessionEvent {
  const reason = kind === 'error'
    ? { kind, error: { message: 'boom', code: 'UNKNOWN' } }
    : kind === 'aborted'
      ? { kind, reason: { kind: 'user' } }
      : { kind }
  return ev('turn/end', seq, time, { turn, reason })
}

/** `step/start` for turn `turn` step `step` at `time`. */
export function stepStart(seq: number, time: number, turn: number, step: number): SessionEvent {
  return ev('step/start', seq, time, { turn, step })
}

/** `step/end` for turn `turn` step `step` at `time`. */
export function stepEnd(seq: number, time: number, turn: number, step: number): SessionEvent {
  return ev('step/end', seq, time, { turn, step })
}

/** `assistant/message` for turn `turn` step `step` at `time`. */
export function assistantMessage(seq: number, time: number, turn: number, step: number): SessionEvent {
  return ev('assistant/message', seq, time, { turn, step, message: { id: 'm', role: 'assistant', content: [], source: { kind: 'model', model: 'test' } } })
}

/** `assistant/message` carrying token usage (input/output/cache). */
export function assistantMessageWithUsage(seq: number, time: number, turn: number, step: number, usage: { input: number; output: number; cacheRead?: number; cacheWrite?: number }): SessionEvent {
  return ev('assistant/message', seq, time, {
    turn,
    step,
    message: { id: 'm', role: 'assistant', content: [], source: { kind: 'model', model: 'test' } },
    usage: {
      inputTokens: usage.input,
      outputTokens: usage.output,
      ...(usage.cacheRead !== undefined ? { cacheReadTokens: usage.cacheRead } : {}),
      ...(usage.cacheWrite !== undefined ? { cacheWriteTokens: usage.cacheWrite } : {}),
    },
  })
}

/** `tool/call` with `callId` at `time` (turn `turn`, step `step`). */
export function toolCall(seq: number, time: number, turn: number, step: number, callId: string): SessionEvent {
  return ev('tool/call', seq, time, { turn, step, callId, name: 'bash', arguments: '{}' })
}

/** `tool/result` for `callId` at `time`. */
export function toolResult(seq: number, time: number, callId: string): SessionEvent {
  return ev('tool/result', seq, time, { turn: 0, step: 0, message: { id: 'r', role: 'user', content: [], source: { kind: 'tool', callId } } })
}

/** `user/message` at `time` with the given source kind (human by default). */
export function userMessage(seq: number, time: number, sourceKind: 'user' | 'plugin' = 'user'): SessionEvent {
  const source = sourceKind === 'user' ? { kind: 'user' as const } : { kind: 'plugin' as const, plugin: 'test' }
  return ev('user/message', seq, time, { id: 'u', role: 'user', content: [{ type: 'text', text: 'hi' }], source })
}

/** `session/end-seed` boundary at `time` (whole-log scope marker). */
export function endSeed(seq: number, time: number): SessionEvent {
  return ev('session/end-seed', seq, time, {})
}

/** `todo/write` — an event the calendar fold ignores entirely. */
export function todoWrite(seq: number, time: number): SessionEvent {
  return ev('todo/write', seq, time, { todos: [] })
}

/** `schedule/change` with the given mutation at `time`. */
export function scheduleChange(seq: number, time: number, change: CalendarScheduleChange): SessionEvent {
  return ev('schedule/change', seq, time, change)
}
