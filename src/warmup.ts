/**
 * Cold-session warm-up: fold the `calendar` projection for every persisted
 * session that has never been live under this deployment, so the calendar
 * page shows historical activity without the user opening each session.
 *
 * The session-projection cache serves list rows from its stored checkpoints
 * (zero I/O); a session that never went live has no checkpoint and therefore
 * no projection value. `coldSnapshot(id)` is the cache's cold-read ladder:
 * it reads the persisted log from the restore floor (a full read for an
 * uncached session), refolds every registered unit — including `calendar` —
 * and writes the checkpoint back (fail-soft), so the next listing row is
 * served from the cache. Warm-up simply walks that ladder once per persisted
 * session at plugin start.
 *
 * Both services are optional: without them (headless assemblies, or a
 * composition without the projection cache) this does nothing.
 *
 * @module dsh-calendar/warmup
 */

import type { Context } from '@deepseek-ai/cordis'

/** Structural face of the projection-cache cold read (avoids a hard dep). */
interface ProjectionCacheFace {
  coldSnapshot(id: string, signal?: AbortSignal): Promise<unknown>
}

/** Structural face of the session query listing (avoids a hard dep). */
interface SessionQueryFace {
  listSessions(signal?: AbortSignal): Promise<Array<{ live: boolean; header: { id: string } }>>
}

/**
 * Warm the projection cache for persisted-but-cold sessions. Runs in the
 * background on this plugin's fiber; abortable on unload.
 * @param ctx - registrant context.
 */
export function warmColdSessions(ctx: Context): void {
  const cache = ctx.get('sessionProjectionCache') as ProjectionCacheFace | undefined
  const query = ctx.get('sessionQuery') as SessionQueryFace | undefined
  if (cache === undefined || query === undefined) return

  ctx.effect(() => {
    const controller = new AbortController()
    void (async () => {
      let sessions: Array<{ live: boolean; header: { id: string } }>
      try {
        sessions = await query.listSessions(controller.signal)
      } catch (error) {
        if (!controller.signal.aborted) console.warn('[dsh-calendar] cold warm-up listing failed:', error)
        return
      }
      let folded = 0
      for (const record of sessions) {
        if (controller.signal.aborted) return
        if (record.live) continue // live sessions are checkpointed by write-behind
        try {
          await cache.coldSnapshot(record.header.id, controller.signal)
          folded++
        } catch (error) {
          // One bad artifact must not block the rest (fail-soft, like the cache).
          if (!controller.signal.aborted) console.warn(`[dsh-calendar] cold warm-up skipped ${record.header.id}:`, error)
        }
      }
      if (folded > 0) console.info(`[dsh-calendar] warm-up folded ${folded} cold session(s)`)
    })()
    return () => controller.abort()
  }, 'dsh-calendar: cold warm-up')
}
