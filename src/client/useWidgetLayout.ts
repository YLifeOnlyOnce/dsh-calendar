/**
 * Widget layout state: which widgets are visible and in what order, persisted
 * to localStorage (browser-local viewing preference, like the shell's panel
 * geometry). Dragging uses pointer events over the 2-column grid: the dragged
 * cell follows the pointer (ghost layer), hovering another cell swaps them
 * live, and the final order is persisted on drop.
 *
 * @module dsh-calendar/client/useWidgetLayout
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/** Stable widget ids (the layout key; labels live in the locale dictionary). */
export type WidgetId = 'stats' | 'year' | 'week' | 'day' | 'month'

export const WIDGET_IDS: readonly WidgetId[] = ['stats', 'year', 'week', 'day', 'month']

const STORAGE_KEY = 'dsh-calendar.layout.v1'

interface StoredLayout {
  order: WidgetId[]
  hidden: WidgetId[]
}

const DEFAULT_LAYOUT: StoredLayout = { order: [...WIDGET_IDS], hidden: [] }

function readLayout(): StoredLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return DEFAULT_LAYOUT
    const parsed = JSON.parse(raw) as Partial<StoredLayout>
    const order = (parsed.order ?? []).filter((id): id is WidgetId => WIDGET_IDS.includes(id as WidgetId))
    const hidden = (parsed.hidden ?? []).filter((id): id is WidgetId => WIDGET_IDS.includes(id as WidgetId))
    // Merge any newly added widget ids into the order.
    for (const id of WIDGET_IDS) {
      if (!order.includes(id)) order.push(id)
    }
    return { order, hidden: hidden.filter(id => !hidden.includes(id) && WIDGET_IDS.includes(id)) }
  } catch {
    return DEFAULT_LAYOUT
  }
}

export interface WidgetLayout {
  /** Visible widgets in display order. */
  order: WidgetId[]
  /** Widgets the user switched off. */
  hidden: WidgetId[]
  /** Whether a drag is in progress (the grid shows drop affordances). */
  dragging: boolean
  /** The widget being dragged, when any. */
  dragId: WidgetId | null
  /** Pointer position of the active drag (for the ghost layer). */
  dragPos: { x: number; y: number } | null
  toggle: (id: WidgetId) => void
  reset: () => void
  /** Start a drag from a widget's handle. */
  startDrag: (id: WidgetId, index: number, x: number, y: number) => void
  /** Move the drag; swaps the hovered cell live. */
  moveDrag: (x: number, y: number) => void
  endDrag: () => void
}

/**
 * Widget layout controller backed by localStorage. The drag model keeps the
 * dragged widget's id and current index; pointer moves compute the hovered
 * cell (2-column grid) and swap live; drop persists.
 */
export function useWidgetLayout(): WidgetLayout {
  const [layout, setLayout] = useState<StoredLayout>(readLayout)
  const [drag, setDrag] = useState<{ id: WidgetId; index: number } | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const dragRef = useRef<{ id: WidgetId; index: number } | null>(null)

  // Persist on every committed layout change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
    } catch {
      // Quota/private-mode failures are harmless: the layout stays in memory.
    }
  }, [layout])

  const toggle = useCallback((id: WidgetId) => {
    setLayout(prev => {
      const hidden = prev.hidden.includes(id)
        ? prev.hidden.filter(h => h !== id)
        : [...prev.hidden, id]
      return { ...prev, hidden }
    })
  }, [])

  const reset = useCallback(() => {
    setLayout(DEFAULT_LAYOUT)
  }, [])

  const startDrag = useCallback((id: WidgetId, index: number, x: number, y: number) => {
    pointer.current = { x, y }
    dragRef.current = { id, index }
    setDragPos({ x, y })
    setDrag({ id, index })
  }, [])

  // Stable across swaps: reads the drag from a ref so the window pointer
  // listeners never capture a stale index.
  const moveDrag = useCallback((x: number, y: number) => {
    pointer.current = { x, y }
    setDragPos({ x, y })
    const current = dragRef.current
    if (current === null) return
    // Locate the hovered cell by geometry: grid cells are evenly split across
    // the container width; row height is the dragged widget's own height.
    const container = document.querySelector('.dsh-cal-widgets')
    if (container === null) return
    const rect = container.getBoundingClientRect()
    const cells = container.children
    if (cells.length === 0) return
    const col = Math.min(1, Math.max(0, Math.floor((x - rect.left) / (rect.width / 2))))
    const cellH = cells[current.index]?.getBoundingClientRect().height ?? 0
    const row = Math.floor((y - rect.top) / Math.max(1, cellH + 12))
    const target = row * 2 + col
    if (target < 0 || target >= cells.length || target === current.index) return
    // Live swap in the visible order (hidden widgets stay out of the grid).
    setLayout(prev => {
      const visible = prev.order.filter(id => !prev.hidden.includes(id))
      const from = visible.indexOf(current.id)
      const idAtTarget = visible[target]
      if (from === -1 || idAtTarget === undefined) return prev
      const next = [...visible]
      next[from] = idAtTarget
      next[target] = current.id
      // Rebuild full order preserving hidden positions as trailing entries.
      const hidden = prev.order.filter(id => prev.hidden.includes(id))
      return { order: [...next, ...hidden], hidden: prev.hidden }
    })
    dragRef.current = { id: current.id, index: target }
    setDrag(dragRef.current)
  }, [])

  const endDrag = useCallback(() => {
    dragRef.current = null
    setDrag(null)
    setDragPos(null)
  }, [])

  return {
    order: layout.order.filter(id => !layout.hidden.includes(id)),
    hidden: layout.hidden,
    dragging: drag !== null,
    dragId: drag?.id ?? null,
    dragPos,
    toggle,
    reset,
    startDrag,
    moveDrag,
    endDrag,
  }
}
