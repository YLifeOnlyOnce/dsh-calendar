/**
 * Widget card shell: the draggable container each calendar view lives in.
 * The header carries the drag handle, the widget title, and optional mini
 * navigation; the body renders the view. Drag lifecycle is owned by the
 * layout controller (pointer events on the handle bubble to the section).
 *
 * @module dsh-calendar/client/Widget
 */

import type { ReactNode } from 'react'
import type { WidgetId } from './useWidgetLayout.ts'

export interface WidgetProps {
  id: WidgetId
  title: ReactNode
  /** Optional mini navigation rendered in the header (‹ › today …). */
  nav?: ReactNode
  /** Whether any drag is in progress (the grid enters drop mode). */
  gridDragging: boolean
  /** Whether THIS widget is being dragged. */
  isDragging: boolean
  index: number
  onHandlePointerDown: (id: WidgetId, index: number, x: number, y: number) => void
  children: ReactNode
}

/** One widget card. */
export function Widget({ id, title, nav, gridDragging, isDragging, index, onHandlePointerDown, children }: WidgetProps): ReactNode {
  return (
    <div
      className={`dsh-cal-widget${isDragging ? ' dragging' : ''}${gridDragging ? ' dropmode' : ''}`}
      data-widget-id={id}
      style={{ gridRow: Math.floor(index / 2) + 1, gridColumn: (index % 2) + 1 }}
    >
      <div className="dsh-cal-widgethead">
        <span
          className="dsh-cal-widgethandle"
          role="button"
          aria-label="drag"
          onPointerDown={e => {
            if (e.button !== 0) return
            e.preventDefault()
            onHandlePointerDown(id, index, e.clientX, e.clientY)
          }}
        >
          ⠿
        </span>
        <span className="dsh-cal-widgettitle">{title}</span>
        {nav !== undefined && <span className="dsh-cal-widgetnav">{nav}</span>}
      </div>
      <div className="dsh-cal-widgetbody">{children}</div>
    </div>
  )
}
