/**
 * Decrypt-reveal text animation, in the spirit of canvas-ui's
 * DecryptReveal component: the text materializes out of a scrambling glyph
 * field, each character locking in from left to right with a small stagger.
 * A tiny self-contained implementation (~40 lines) — no WebGL, no dependency
 * — so the calendar's headline numbers feel alive without shipping a library.
 *
 * @module dsh-calendar/client/decrypt
 */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/** Glyphs drawn while a position is still scrambling. */
const GLYPHS = '!<>-_\\/[]{}—=+*^?#@$%&01'

/** Lock every character over ~600ms with a positional stagger. */
const FRAMES_PER_CHAR = 9
const FRAME_MS = 16

function randomGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '#'
}

/**
 * Render `text` with a one-shot decrypt-reveal animation when `active` is
 * true; renders the final text instantly otherwise (and after completion).
 * @param props - target text, animation trigger, and optional styling.
 * @returns the animated text node.
 */
export function DecryptText({ text, active, className }: {
  text: string
  active: boolean
  className?: string
}): ReactNode {
  const [display, setDisplay] = useState(text)
  const done = useRef(false)

  useEffect(() => {
    if (!active || done.current) return
    if (text.length === 0) { done.current = true; return }
    const totalFrames = text.length * FRAMES_PER_CHAR
    let frame = 0
    const interval = setInterval(() => {
      frame += 1
      const decoded = Math.floor(frame / FRAMES_PER_CHAR)
      if (decoded >= text.length) {
        clearInterval(interval)
        done.current = true
        setDisplay(text)
        return
      }
      // Locked prefix + scrambling suffix; the last few chars keep
      // re-rolling so the reveal reads as "decoding", not "typing".
      let out = text.slice(0, decoded)
      for (let i = decoded; i < text.length; i++) out += randomGlyph()
      setDisplay(out)
    }, FRAME_MS)
    return () => clearInterval(interval)
  }, [active, text])

  return <span className={className}>{display}</span>
}
