/**
 * Browser half of dsh-calendar: registers the 📅 Calendar settings section
 * (full day / 7-day / month / year views) and the main-UI card overlay
 * (`shell.overlay`) — small draggable cards that float over the main
 * interface, whose visibility is chosen in the settings page. The plugin
 * aggregates each session's `calendar` projection value from the runtime
 * list mirror; no session is opened, no log is pulled.
 *
 * @module dsh-calendar/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the settings slot declaration (`settings.section`) into
// the SlotMap merge this registration depends on.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the `shell.overlay` frame overlay declaration.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { CalendarSection } from './CalendarSection.tsx'
import { CardOverlay } from './CardOverlay.tsx'
import { CALENDAR_CSS } from './calendar.css.ts'
import { en, NS, zh } from './locales.ts'

/** Required services: slots, locale, and the session opener used by calendar cards. */
export const inject = ['slots', 'locale', 'sessions']

/**
 * Client plugin body: inject the stylesheet, register the dictionaries, and
 * contribute the Calendar settings page plus the main-UI card overlay.
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

  // The host-side dsh-session type merge shadows `ctx.sessions` in this mixed
  // program; at runtime the client sessions service exposes `open()`.
  const sessions = ctx.sessions as unknown as { open: (id: string) => void }

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'calendar',
    // After Models (10); the page is a read-only dashboard, no ordering conflicts.
    order: 40,
    label: () => t('nav'),
    locale: NS,
    inject: () => ({ sessions }),
  }, CalendarSection))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'dsh-calendar-cards',
    // After the built-in overlay entries; the layer is additive.
    order: 100,
    locale: NS,
    inject: () => ({ sessions }),
  }, CardOverlay))
}
