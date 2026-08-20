/**
 * Browser half of dsh-calendar: registers the 📅 Calendar settings section
 * and injects the plugin stylesheet. The page aggregates each session's
 * `calendar` projection value from the runtime list mirror and renders the
 * year / month / day views with anime.js animations and decrypt-reveal
 * headlines.
 *
 * @module dsh-calendar/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the settings slot declaration (`settings.section`) into
// the SlotMap merge this registration depends on.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { CalendarSection } from './CalendarSection.tsx'
import { CALENDAR_CSS } from './calendar.css.ts'
import { en, NS, zh } from './locales.ts'

/** Required services: the slots registry (page registration) and the locale service. */
export const inject = ['slots', 'locale']

/**
 * Client plugin body: inject the stylesheet, register the dictionaries, and
 * contribute the Calendar page to the settings section seat.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-calendar'
    tag.dataset.pluginCss = 'dsh-calendar/calendar.css'
    tag.textContent = CALENDAR_CSS
    document.head.appendChild(tag)
    return () => tag.remove()
  }, 'dsh-calendar: styles')

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-calendar: dictionaries')

  const t = ctx.locale.bind(NS)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'calendar',
    // After Models (10); the page is a read-only dashboard, no ordering conflicts.
    order: 40,
    label: () => t('nav'),
    locale: NS,
  }, CalendarSection))
}
