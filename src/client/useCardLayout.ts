/**
 * Main-UI card layout: which small calendar cards float over the DSH main
 * interface (rendered in the `shell.overlay` seat), where each one sits, and
 * whether it is collapsed. Positions are free-form (absolute pixels, clamped
 * to the viewport); visibility is toggled from the Settings page. Everything
 * persists to localStorage so reloads restore the exact arrangement.
 *
 * @module dsh-calendar/client/useCardLayout
 */

import { useCallback, useEffect, useState } from 'react'

/** Stable card ids (the settings checkboxes and the overlay share this set). */
export type CardId = 'stats' | 'year' | 'week' | 'day' | 'month'

export const CARD_IDS: readonly CardId[] = ['stats', 'year', 'week', 'day', 'month']

const STORAGE_KEY = 'dsh-calendar.cards.v1'

/** Cards shown by default (small, unobtrusive, don't block the conversation). */
const DEFAULT_VISIBLE: readonly CardId[] = ['stats', 'year']

export interface CardPosition {
  x: number
  y: number
}

interface StoredCards {
  positions: Record<CardId, CardPosition>
  visible: CardId[]
  collapsed: CardId[]
}

/** Default stacked positions in the lower-right, away from the conversation. */
function defaultPositions(): Record<CardId, CardPosition> {
  const vw = typeof window === 'undefined' ? 1440 : window.innerWidth
  const vh = typeof window === 'undefined' ? 900 : window.innerHeight
  return {
    stats: { x: vw - 320, y: vh - 260 },
    year: { x: vw - 560, y: vh - 240 },
    week: { x: vw - 320, y: vh - 420 },
    day: { x: vw - 420, y: vh - 380 },
    month: { x: vw - 320, y: vh - 420 },
  }
}

function readCards(): StoredCards {
  const positions = defaultPositions()
  const visible = [...DEFAULT_VISIBLE]
  const collapsed: CardId[] = []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<StoredCards>
      if (parsed.positions !== undefined) {
        for (const id of CARD_IDS) {
          const p = parsed.positions[id]
          if (p !== undefined && Number.isFinite(p.x) && Number.isFinite(p.y)) positions[id] = p
        }
      }
      if (Array.isArray(parsed.visible)) {
        const merged = [...DEFAULT_VISIBLE]
        for (const id of parsed.visible) {
          if (CARD_IDS.includes(id as CardId) && !merged.includes(id as CardId)) merged.push(id as CardId)
        }
        return { positions, visible: merged, collapsed: Array.isArray(parsed.collapsed) ? parsed.collapsed.filter((c): c is CardId => CARD_IDS.includes(c as CardId)) : [] }
      }
    }
  } catch {
    // Storage unavailable — defaults hold.
  }
  return { positions, visible, collapsed }
}

export interface CardLayout {
  visible: CardId[]
  collapsed: CardId[]
  position: (id: CardId) => CardPosition
  setPosition: (id: CardId, x: number, y: number) => void
  toggleVisible: (id: CardId) => void
  toggleCollapsed: (id: CardId) => void
  reset: () => void
}

/** Layout-changed broadcast: the Settings page and the main-UI overlay are
 * separate React trees, so every mutation notifies peers to re-read storage. */
const CHANGED_EVENT = 'dsh-calendar:cards-changed'

function broadcast(): void {
  try {
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT))
  } catch {
    // Non-browser context: nothing to notify.
  }
}

/** Card layout controller (positions + visibility), persisted to localStorage. */
export function useCardLayout(): CardLayout {
  const [cards, setCards] = useState<StoredCards>(readCards)

  // Peers (the Settings page and the overlay) re-read storage on change.
  useEffect(() => {
    const onChanged = (): void => setCards(readCards())
    window.addEventListener(CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(CHANGED_EVENT, onChanged)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
    } catch {
      // Quota/private-mode: keep in memory.
    }
  }, [cards])

  const setPosition = useCallback((id: CardId, x: number, y: number) => {
    setCards(prev => ({
      ...prev,
      positions: { ...prev.positions, [id]: { x, y } },
    }))
    broadcast()
  }, [])

  const toggleVisible = useCallback((id: CardId) => {
    setCards(prev => {
      const visible = prev.visible.includes(id)
        ? prev.visible.filter(v => v !== id)
        : [...prev.visible, id]
      return { ...prev, visible }
    })
    broadcast()
  }, [])

  const toggleCollapsed = useCallback((id: CardId) => {
    setCards(prev => {
      const collapsed = prev.collapsed.includes(id)
        ? prev.collapsed.filter(c => c !== id)
        : [...prev.collapsed, id]
      return { ...prev, collapsed }
    })
    broadcast()
  }, [])

  const reset = useCallback(() => {
    setCards({ positions: defaultPositions(), visible: [...DEFAULT_VISIBLE], collapsed: [] })
    broadcast()
  }, [])

  return {
    visible: cards.visible,
    collapsed: cards.collapsed,
    position: id => cards.positions[id] ?? defaultPositions()[id] ?? { x: 0, y: 0 },
    setPosition,
    toggleVisible,
    toggleCollapsed,
    reset,
  }
}
