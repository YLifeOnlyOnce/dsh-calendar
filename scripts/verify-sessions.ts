/**
 * Local verification: fold the REAL session logs under the local Harness home
 * (~/.dsh/sessions) with the dsh-calendar activity + schedule folds, and
 * print a calendar summary. Run with Node 24+ (native TS type stripping):
 *
 *   node scripts/verify-sessions.ts
 *
 * This exercises the exact fold code the projection unit uses, against real
 * durable data, without booting a cordis runtime.
 *
 * @module dsh-calendar/scripts
 */

import { readdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { applyActivityEvent, activityView, createActivityState } from '../src/activity.ts'
import { applyScheduleEvent, scheduleView, createScheduleState } from '../src/schedules.ts'
import type { Config } from '../src/config.ts'
import type { SessionEvent } from '@deepseek-ai/dsh-session'

const config: Config = { keepDays: 400, intervalCap: 300, hourProfileDays: 30 }
const sessionsRoot = join(homedir(), '.dsh', 'sessions')

interface SessionSummary {
  id: string
  cwd: string
  title: string
  createdAt: number
  firstActivityAt?: number
  lastActivityAt?: number
  totalActiveMs: number
  days: Array<{ date: string; activeMs: number; turns: number; tools: number; llmMs: number; prompts: number; failedTurns: number }>
  recentCount: number
  scheduleCount: number
  dispatchCount: number
}

/** Decompress one zstd session log and parse header + events. */
function readSessionLog(path: string): { createdAt: number; cwd: string; events: SessionEvent[] } {
  const out = spawnSync('zstd', ['-d', '-c', path], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  if (out.status !== 0 || out.stdout === undefined) throw new Error(`zstd failed for ${path}`)
  const lines = out.stdout.split('\n').filter(l => l.trim().length > 0)
  let createdAt = 0
  let cwd = ''
  const events: SessionEvent[] = []
  for (const line of lines) {
    let record: Record<string, unknown>
    try { record = JSON.parse(line) } catch { continue }
    if (record.type === 'session' && !('seq' in record)) {
      createdAt = typeof record.createdAt === 'number' ? record.createdAt : 0
      cwd = typeof record.cwd === 'string' ? record.cwd : ''
      continue
    }
    events.push(record as unknown as SessionEvent)
  }
  return { createdAt, cwd, events }
}

function fmtDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}min`
  return `${(ms / 3_600_000).toFixed(2)}h`
}

/** A tiny bar for terminal output (25 cells). */
function bar(ratio: number): string {
  const cells = Math.max(0, Math.min(25, Math.round(ratio * 25)))
  return '█'.repeat(cells).padEnd(25, '░')
}

function main(): void {
  if (!existsSync(sessionsRoot)) {
    console.error(`no sessions dir at ${sessionsRoot}`)
    process.exit(1)
  }
  const summaries: SessionSummary[] = []
  for (const workspaceDir of readdirSync(sessionsRoot)) {
    const wsPath = join(sessionsRoot, workspaceDir)
    for (const sessionDir of readdirSync(wsPath)) {
      const logPath = join(wsPath, sessionDir, 'session.jsonl.zstd')
      if (!existsSync(logPath)) continue
      try {
        const { createdAt, cwd, events } = readSessionLog(logPath)
        let state = createActivityState()
        let scheduleState = createScheduleState()
        let title = ''
        for (const event of events) {
          state = applyActivityEvent(state, event, config)
          scheduleState = applyScheduleEvent(scheduleState, event)
          if (event.type === 'session/title' && typeof event.data.title === 'string') title = event.data.title
        }
        const view = activityView(state)
        const sched = scheduleView(scheduleState)
        summaries.push({
          id: sessionDir,
          cwd,
          title,
          createdAt,
          firstActivityAt: view.firstActivityAt,
          lastActivityAt: view.lastActivityAt,
          totalActiveMs: view.totalActiveMs,
          days: view.days,
          recentCount: view.recentIntervals.length,
          scheduleCount: sched.schedules.length,
          dispatchCount: sched.scheduleHistory.length,
        })
      } catch (error) {
        console.error(`  ! skipped ${sessionDir}: ${(error as Error).message}`)
      }
    }
  }

  summaries.sort((a, b) => (b.lastActivityAt ?? b.createdAt) - (a.lastActivityAt ?? a.createdAt))

  console.log(`\n=== dsh-calendar 本地验证 ===`)
  console.log(`数据目录: ${sessionsRoot} · 会话数: ${summaries.length}\n`)

  for (const s of summaries) {
    const span = s.firstActivityAt !== undefined && s.lastActivityAt !== undefined
      ? `${new Date(s.firstActivityAt).toLocaleString('zh-CN', { hour12: false })} → ${new Date(s.lastActivityAt).toLocaleString('zh-CN', { hour12: false })}`
      : '（无活跃事件）'
    const name = s.title || s.cwd.split('/').pop() || s.id
    console.log(`[${s.cwd.split('/').pop() ?? '?'}] ${name}`)
    console.log(`    会话 ${s.id.slice(9, 17)}… · 创建 ${new Date(s.createdAt).toLocaleDateString('zh-CN')}`)
    console.log(`    活跃 ${span} · 总活跃 ${fmtDuration(s.totalActiveMs)} · 近期区间 ${s.recentCount} · 周期任务 ${s.scheduleCount}（触发 ${s.dispatchCount} 次）`)
    const recent = s.days.slice(-7)
    if (recent.length > 0) {
      const max = Math.max(...recent.map(d => d.activeMs), 1)
      for (const d of recent) {
        console.log(`    ${d.date}  ${fmtDuration(d.activeMs).padEnd(8)} ${bar(d.activeMs / max)}  turns ${d.turns} · tools ${d.tools} · llm ${fmtDuration(d.llmMs)} · prompts ${d.prompts} · failed ${d.failedTurns}`)
      }
    }
    console.log('')
  }

  // Global daily rollup (the "usage calendar" essence).
  const rollup = new Map<string, { activeMs: number; turns: number; tools: number; prompts: number; sessions: Set<string> }>()
  for (const s of summaries) {
    for (const d of s.days) {
      const r = rollup.get(d.date) ?? { activeMs: 0, turns: 0, tools: 0, prompts: 0, sessions: new Set<string>() }
      r.activeMs += d.activeMs
      r.turns += d.turns
      r.tools += d.tools
      r.prompts += d.prompts
      r.sessions.add(s.id)
      rollup.set(d.date, r)
    }
  }
  const days = [...rollup.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-14)
  console.log(`=== 全局每日汇总（最近 ${days.length} 天）===`)
  if (days.length === 0) {
    console.log('（无数据）')
    return
  }
  const max = Math.max(...days.map(([, r]) => r.activeMs), 1)
  for (const [date, r] of days) {
    console.log(`${date}  ${fmtDuration(r.activeMs).padEnd(8)} ${bar(r.activeMs / max)}  会话 ${r.sessions.size} · turns ${r.turns} · tools ${r.tools} · prompts ${r.prompts}`)
  }
  console.log('')
}

main()
