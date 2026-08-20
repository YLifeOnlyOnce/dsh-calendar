/**
 * Main-UI calendar cards: the `shell.overlay` occupant that floats small
 * draggable cards over the DSH main interface (stats, year heatmap, 7-day,
 * day, month — each a compact view of "today"). Cards are free-positioned by
 * dragging their ⠿ handle (clamped to the viewport), collapsible to a title
 * bar, and closable; which cards appear is chosen in the Settings page
 * (toggleVisible). All state persists via `useCardLayout`.
 *
 * @module dsh-calendar/client/CardOverlay
 */

import { useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { Translator } from './locales.ts'
import { aggregateDays, countUp, dateKey, fmtDuration, sessionHue, workspaceTitleOf, type SessionRow } from './useCalendarData.ts'
import { useCardLayout, type CardId, type CardPosition } from './useCardLayout.ts'
import { YearView } from './YearView.tsx'
import { MonthView } from './MonthView.tsx'
import { WeekView } from './WeekView.tsx'
import { DayView } from './DayView.tsx'

/** Props delivered by the shell.overlay outlet. */
export interface CardOverlayProps {
  useSessions: SnapshotSelectorHook<SessionListState>
  /** Injected sessions service (drill into a conversation). */
  sessions?: { open: (id: string) => void }
  t: Translator
}

/** Drag a card by its handle: free movement, clamped to the viewport. */
function useDragHandle(onMove: (x: number, y: number) => void) {
  const drag = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
  const onHandleDown = (e: React.PointerEvent, origin: CardPosition): void => {
    if (e.button !== 0) return
    e.preventDefault()
    drag.current = { startX: e.clientX, startY: e.clientY, originX: origin.x, originY: origin.y }
    const move = (ev: PointerEvent): void => {
      const d = drag.current
      if (d === null) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const x = Math.min(Math.max(0, d.originX + ev.clientX - d.startX), vw - 48)
      const y = Math.min(Math.max(0, d.originY + ev.clientY - d.startY), vh - 48)
      onMove(x, y)
    }
    const up = (): void => {
      drag.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  return onHandleDown
}

function DraggableCard({ id, title, pos, collapsed, onMove, onToggleCollapsed, onClose, children }: {
  id: string
  title: string
  pos: CardPosition
  collapsed: boolean
  onMove: (x: number, y: number) => void
  onToggleCollapsed: () => void
  onClose: () => void
  children: ReactNode
}): ReactNode {
  const handleDown = useDragHandle(onMove)
  return (
    <div className="dsh-cal-card" style={{ left: pos.x, top: pos.y }} data-card-id={id}>
      <div className="dsh-cal-cardhead">
        <span className="dsh-cal-cardhandle" role="button" aria-label="drag" onPointerDown={e => handleDown(e, pos)}>⠿</span>
        <span className="dsh-cal-cardtitle">{title}</span>
        <span className="dsh-cal-cardbtns">
          <button type="button" className="dsh-cal-cardbtn" onClick={onToggleCollapsed} aria-label="collapse">
            {collapsed ? '▸' : '▾'}
          </button>
          <button type="button" className="dsh-cal-cardbtn" onClick={onClose} aria-label="close">×</button>
        </span>
      </div>
      {!collapsed && <div className="dsh-cal-cardbody">{children}</div>}
    </div>
  )
}

/** The overlay layer: renders every visible card at its stored position. */
export function CardOverlay(props: CardOverlayProps): ReactNode {
  const { useSessions, sessions: sessionsService, t } = props
  const sessionList = useSessions(s => s)
  const layout = useCardLayout()

  const rows = useMemo<SessionRow[]>(() => {
    const out: SessionRow[] = []
    for (const id of sessionList.ids) {
      const row = sessionList.byId[id]
      if (row === undefined) continue
      out.push({
        id,
        title: row.displayTitle,
        cwd: row.cwd ?? '',
        value: row.projectionValues?.['calendar'],
        running: row.running,
      })
    }
    return out
  }, [sessionList])
  const days = useMemo(() => aggregateDays(rows), [rows])
  const hasData = useMemo(() => rows.some(r => r.value !== undefined), [rows])
  const today = new Date()
  const todayKey = dateKey(today)

  const titles: Record<CardId, string> = {
    stats: t('card.stats'),
    year: t('card.year'),
    week: t('card.week'),
    day: t('card.day'),
    month: t('card.month'),
  }

  const cardBody = (id: CardId): ReactNode => {
    switch (id) {
      case 'stats': {
        let activeMs = 0
        let turns = 0
        let tools = 0
        for (const agg of days.values()) {
          activeMs += agg.activeMs
          turns += agg.turns
          tools += agg.tools
        }
        return (
          <div className="dsh-cal-cardstats">
            <div className="cell"><span className="label">{t('stats.active')}</span><b>{fmtDuration(activeMs)}</b></div>
            <div className="cell"><span className="label">{t('stats.turns')}</span><b>{turns}</b></div>
            <div className="cell"><span className="label">{t('stats.tools')}</span><b>{tools}</b></div>
          </div>
        )
      }
      case 'year':
        return <YearView days={days} year={today.getFullYear()} active={false} onPickDay={() => {}} t={t} />
      case 'month':
        return <MonthView days={days} month={today} active={false} onPickDay={() => {}} t={t} />
      case 'week':
        return <WeekView rows={rows} weekStart={new Date(today.getTime() - 6 * 86_400_000)} active={false} compact onOpenSession={sessionsService !== undefined ? id => sessionsService.open(id) : undefined} t={t} />
      case 'day':
        return <DayView rows={rows} date={todayKey} active={false} compact onOpenSession={sessionsService !== undefined ? id => sessionsService.open(id) : undefined} t={t} />
    }
  }

  if (!hasData || layout.visible.length === 0) return null

  return (
    <div className="dsh-cal-cardlayer" data-card-layer>
      {layout.visible.map(id => (
        <DraggableCard
          key={id}
          id={id}
          title={titles[id]}
          pos={layout.position(id)}
          collapsed={layout.collapsed.includes(id)}
          onMove={(x, y) => layout.setPosition(id, x, y)}
          onToggleCollapsed={() => layout.toggleCollapsed(id)}
          onClose={() => layout.toggleVisible(id)}
        >
          {cardBody(id)}
        </DraggableCard>
      ))}
    </div>
  )
}
