/**
 * Top sessions view: per-session usage totals within the cursor's month,
 * ranked by active time. Clicking a row drills into the conversation. The
 * aggregation reads only the `calendar` projection value — no session is
 * opened and no log is pulled.
 *
 * @module dsh-calendar/client/TopSessionsView
 */

import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Translator } from './locales.ts'
import { fmtDuration, sessionHue, sumSessionsInRange, type SessionRow } from './useCalendarData.ts'

export interface TopSessionsViewProps {
  rows: readonly SessionRow[]
  /** Local `YYYY-MM` of the ranked month. */
  monthKey: string
  active: boolean
  /** Open a session (drill into the conversation). */
  onOpenSession?: (sessionId: string) => void
  t: Translator
}

/** Rank badges for the podium; plain numbers after. */
const PODIUM = ['🥇', '🥈', '🥉']

export function TopSessionsView({ rows, monthKey, active, onOpenSession, t }: TopSessionsViewProps): ReactNode {
  const fromKey = `${monthKey}-01`
  const toKey = `${monthKey}-31`
  const sums = useMemo(() => sumSessionsInRange(rows, fromKey, toKey), [rows, fromKey, toKey])
  const top = sums.slice(0, 10)

  if (top.length === 0) {
    return (
      <div className="dsh-cal-empty">
        <div style={{ fontSize: 26, marginBottom: 8 }}>🏆</div>
        <div>{t('top.empty')}</div>
      </div>
    )
  }

  const maxActive = top[0]?.activeMs ?? 1

  return (
    <div className="dsh-cal-top">
      <div className="dsh-cal-tophead">
        <span>{t('top.title')}</span>
        <span className="sub">{t('top.subtitle', { range: `${monthKey.slice(0, 4)}年${Number(monthKey.slice(5, 7))}月` })}</span>
      </div>
      <div className="dsh-cal-toprows">
        {top.map((sum, i) => (
          <div
            key={sum.id}
            className={`dsh-cal-toprow${onOpenSession !== undefined ? ' clickable' : ''}`}
            onClick={onOpenSession !== undefined ? () => onOpenSession(sum.id) : undefined}
          >
            <span className="rank">{PODIUM[i] ?? `${i + 1}`}</span>
            <span className="dot" style={{ background: `hsl(${sessionHue(sum.id)} 70% 62%)` }} />
            <span className="name" title={sum.title}>
              {sum.title}
              {sum.running && <span className="run">●</span>}
            </span>
            <span className="barwrap"><span className="bar" style={{ width: `${Math.max(4, (sum.activeMs / maxActive) * 100)}%` }} /></span>
            <span className="nums">
              <b>{fmtDuration(sum.activeMs)}</b>
              <span className="meta">{t('top.turns', { count: sum.turns })} · {t('top.tools', { count: sum.tools })}</span>
            </span>
          </div>
        ))}
      </div>
      {sums.length > 10 && (
        <div className="dsh-cal-topmore">{t('top.rank', { n: sums.length })}</div>
      )}
    </div>
  )
}
