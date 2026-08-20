/**
 * Browser half of dsh-calendar (M1 placeholder). The full day/month/year
 * calendar page lands in M2: it will register a `settings.section` page that
 * aggregates each session's `calendar` projection value from the runtime list
 * mirror and renders the three views with CSS animations. The empty apply
 * exists so the browser bundle ships a valid `window.__ModuleLoader__`
 * factory and the package's `dsh.client` manifest resolves.
 *
 * @module dsh-calendar/client
 */

/** Required services (grown in M2: sessions, workspaces, locale, slots). */
export const inject: string[] = []

/** Client plugin body — placeholder until the calendar page lands. */
export function apply(): void {}
