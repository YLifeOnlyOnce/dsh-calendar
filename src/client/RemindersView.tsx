/**
 * Reminders view: every active recurring reminder across sessions, split by
 * status — upcoming (target in the future), overdue (target passed, awaiting
 * dispatch), and the fired dispatch history. Rows are sorted by target time
 * and clicking one drills into the owning session. The schedule subsystem is
 * the sole writer; this view only renders the folded `calendar` wire value.
 *
 * @module dsh-calendar/client/RemindersView
 */

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Translator } from './locales.ts'
import type { CalendarSchedule } from '../types'
import { collectReminders, sessionHue, type SessionRow } from './useCalendarData.ts'

export interface RemindersViewProps {
  rows: readonly SessionRow[]
  active: boolean
  /** Open a session (drill into the conversation). */
  onOpenSession?: (sessionId: string) => void
  t: Translator
}

/** RFC 3339 UTC → a compact local display string. */
function fmtTime(isoValue: string): string {
  const d = new Date(isoValue)
  if (Number.isNaN(d.getTime())) return isoValue
  return d.toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Kind badge + interval text, e.g. "周期 · 每 1天". */
function kindLabel(schedule: CalendarSchedule, t: Translator): string {
  const kind = t(`reminders.kind.${schedule.kind}` as never)
  if (schedule.kind === 'every' && schedule.everySeconds !== undefined) {
    const s = schedule.everySeconds
    const interval = s % 86_400 === 0 ? `${s / 86_400}天` : s % 3600 === 0 ? `${s / 3600}小时` : `${s}秒`
    return `${kind} · ${t('reminders.everyEvery', { interval })}`
  }
  if (schedule.kind === 'after' && schedule.afterSeconds !== undefined) {
    const s = schedule.afterSeconds
    const interval = s % 60 === 0 ? `${s / 60}分钟` : `${s}秒`
    return `${kind} · ${interval}后`
  }
  return kind
}

export function RemindersView({ rows, active, onOpenSession, t }: RemindersViewProps): ReactNode {
  const nowMs = useMemo(() => Date.now(), [active])
  const model = useMemo(() => collectReminders(rows, nowMs), [rows, nowMs])
  const [openId, setOpenId] = useState<string | null>(null)

  const total = model.upcoming.length + model.overdue.length + model.fired.length
  if (total === 0) {
    return (
      <div className="dsh-cal-empty">
        <div style={{ fontSize: 26, marginBottom: 8 }}>⏰</div>
        <div>{t('reminders.empty')}</div>
      </div>
    )
  }

  const rowEl = (sessionId: string, sessionTitle: string, title: string, sub: string, kind: string, hue: number, overdue: boolean, key: string): ReactNode => (
    <div
      key={key}
      className={`dsh-cal-remrow${overdue ? ' overdue' : ''}${onOpenSession !== undefined ? ' clickable' : ''}`}
      onClick={onOpenSession !== undefined ? () => onOpenSession(sessionId) : undefined}
      onMouseEnter={() => setOpenId(sessionId)}
      onMouseLeave={() => setOpenId(null)}
    >
      <span className="dot" style={{ background: `hsl(${hue} 70% 62%)` }} />
      <span className="body">
        <span className="title">{title}</span>
        <span className="sub">
          {kind} · {sub}
          {overdue && <span className="overdue-hint"> · {t('reminders.overdueHint')}</span>}
        </span>
      </span>
      <span className="meta">
        <span className="session" title={sessionTitle}>{sessionTitle}</span>
        {openId === sessionId && <span className="arrow">→</span>}
      </span>
    </div>
  )

  return (
    <div className="dsh-cal-reminders">
      <div className="dsh-cal-remgroup">
        <h4><span className="emoji">⏳</span>{t('reminders.upcoming')}<span className="count">{model.upcoming.length}</span></h4>
        {model.upcoming.length === 0 ? (
          <div className="dsh-cal-remempty">{t('reminders.emptyUpcoming')}</div>
        ) : (
          model.upcoming.map(item => rowEl(
            item.sessionId, item.sessionTitle, item.schedule.prompt,
            t('reminders.fires', { time: fmtTime(item.schedule.scheduledAt) }),
            kindLabel(item.schedule, t), sessionHue(item.sessionId), false, `u-${item.sessionId}-${item.schedule.id}`,
          ))
        )}
      </div>

      <div className="dsh-cal-remgroup">
        <h4><span className="emoji">⚠️</span>{t('reminders.overdue')}<span className="count">{model.overdue.length}</span></h4>
        {model.overdue.length === 0 ? (
          <div className="dsh-cal-remempty">{t('reminders.emptyUpcoming')}</div>
        ) : (
          model.overdue.map(item => rowEl(
            item.sessionId, item.sessionTitle, item.schedule.prompt,
            t('reminders.fires', { time: fmtTime(item.schedule.scheduledAt) }),
            kindLabel(item.schedule, t), sessionHue(item.sessionId), true, `o-${item.sessionId}-${item.schedule.id}`,
          ))
        )}
      </div>

      <div className="dsh-cal-remgroup">
        <h4><span className="emoji">✅</span>{t('reminders.fired')}<span className="count">{model.fired.length}</span></h4>
        {model.fired.length === 0 ? (
          <div className="dsh-cal-remempty">{t('reminders.emptyFired')}</div>
        ) : (
          model.fired.map((item, i) => rowEl(
            item.sessionId, item.sessionTitle, t('reminders.firedAt', { time: fmtTime(item.dispatch.firedAt) }),
            t(`reminders.kind.${item.dispatch.kind}` as never),
            t(`reminders.kind.${item.dispatch.kind}` as never), sessionHue(item.sessionId), false, `f-${item.sessionId}-${i}`,
          ))
        )}
      </div>
    </div>
  )
}
