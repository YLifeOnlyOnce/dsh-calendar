/**
 * dsh-calendar — a beautiful usage calendar for DeepSeek Harness.
 *
 * Host half: registers the `calendar` session-projection unit, which folds
 * each session's durable log into compact usage facts (daily buckets, recent
 * activity intervals, a 24-hour profile, and recurring-reminder plan/history)
 * served through the session-projection seam. The browser half (see
 * `src/client`) renders the day/month/year calendar page from the aggregated
 * `useSessions()` rows.
 *
 * The plugin owns only the fold; delivery is the seam's.
 *
 * @module dsh-calendar
 */

import type { Context } from '@deepseek-ai/cordis'
import { Config as ConfigSchema, type Config } from './config.ts'
import { createCalendarProjectionDefinition } from './projection.ts'
import { warmColdSessions } from './warmup.ts'

export type * from './types.ts'

/** Cordis plugin name. */
export const name = 'dsh-calendar'
/** The projection registry is the plugin's whole purpose; without it the fiber stays pending. */
export const inject = ['sessionProjections']

export { ConfigSchema as Config }

/**
 * Register the `calendar` unit and warm the projection cache for persisted
 * sessions; both are effects on this plugin's fiber, so unloading removes
 * the key and aborts the warm-up.
 * @param ctx - registrant context carrying the projection registry.
 * @param config - fold bounds from the composition (cordis.patch.yml).
 */
export function apply(ctx: Context, config: Config): void {
  ctx.sessionProjections.register(createCalendarProjectionDefinition(config))
  warmColdSessions(ctx)
}
