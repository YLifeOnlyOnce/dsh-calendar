# 📅 dsh-calendar

> **See at a glance what DeepSeek did, and when.** A beautiful usage calendar for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — every project and task's execution time, in **day / 7-day / month / year** views, with recurring reminders, animations, and full theme awareness.

English | [中文](README.zh.md)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Why

You use DeepSeek Harness every day — dozens of sessions, background jobs, scheduled reminders. But there was no way to *see* the work: when each project ran, for how long, how much tool activity happened, or when the next recurring task fires.

`dsh-calendar` folds the harness's **durable session logs** into a beautiful, theme-aware calendar. Open **Settings → 📅 Calendar** and your entire usage history is there — no configuration, no extra data store, nothing to maintain.

## Features

| | |
|---|---|
| 🗓️ **Year heatmap** | GitHub-style 52×7 contribution map of active time, cells growing in column by column |
| 📅 **7-day timeline** | Seven columns, one day each — a vertical 24-hour timeline with color-coded session bars (each session keeps its color across days) |
| ⏱️ **Day timeline** | A 24-hour Gantt axis grouped by workspace → session, with turn spans, prompt points, and a pulsing red **now** line |
| 🗂️ **Month grid** | Classic calendar with per-day heat bars and totals |
| 📊 **Stats strip** | Range-scoped active time / sessions / turns / tool calls, with decrypt-reveal and count-up animations |
| 🎨 **Theme-aware** | Every color resolves through the harness ui-theme tokens — follows light *and* dark mode automatically |
| ✨ **Animations** | [anime.js](https://animejs.com) entry effects + a hand-rolled decrypt-reveal headline, in the spirit of [canvas-ui's DecryptReveal](https://github.com/DavidHDev/canvas-ui) |
| 🕐 **Historical data, out of the box** | Cold persisted sessions are folded and cached on startup — last month's activity is visible without opening a single session |

## Install & Enable

Requires DeepSeek Harness with the Web profile (any release aligned with `0.1.0-rc.7`).

```sh
# from a local checkout
dsh plugin --profile web add /path/to/dsh-calendar

# or once published
dsh plugin --profile web add dsh-calendar
```

Restart `dsh web`, then open **Settings → 📅 Calendar**.

> The plugin is a **bundle layer**: it joins the web profile's `dsh.profile.bundles`, applies its `cordis.patch.yml` overlay, and its browser half is discovered automatically via the `dsh.client` manifest — no manual wiring.

## Usage

- **Views** — switch between Day / 7-day / Month / Year with the segmented control.
- **Navigation** — `‹ ›` steps by the view's unit; **Today** jumps back to now; clicking a heatmap cell or month cell drills into that day.
- **Stats** — the strip always reflects the *selected range* (this year / month / today).
- **Hover** — any cell or timeline bar shows the exact window, duration, and session.
- **Live** — the running session's bars pulse, and today's day view draws a live now-line.

## How it works

Zero new infrastructure: the plugin reuses the harness's **session-projection seam** (the same mechanism that powers the official `session-stats`).

```
Session event logs (turn/start→end, tool/call→result, user/message, schedule/change, …)
        │  session/event
        ▼
Host plugin · calendar projection unit (pure fold, plain-JSON state)
        │  sessionProjections → session/projection frames + list rows
        ▼
Browser plugin · aggregates `useSessions()` rows → day buckets, intervals, heatmaps
```

- **Active time** = wall-clock spans of closed turns, attributed to local calendar days with midnight splits (DST-safe). Tools run inside turns, so summing them separately would double-count.
- **Per-session wire value** is compact and bounded: ≤ 400 daily buckets, ≤ 1000 recent intervals, a 24-hour activity profile, and the active recurring-reminder plan + dispatch history.
- **Cold warm-up**: on startup the plugin folds every persisted session via the projection cache's `coldSnapshot` and writes checkpoints back, so the calendar shows history immediately.
- **Recurring reminders** are folded from the `schedule/change` event stream (the schedule subsystem's own records) — the calendar displays the next targets and fired history.
- **Whole-log scope** matches `session-stats`: a fork child includes its inherited parent history (documented boundary).

## Configuration

Override in your own profile's `cordis.patch.yml`:

```yaml
- id: calendar
  config:
    keepDays: 400        # per-session day buckets retained (year view needs ~400)
    intervalCap: 1000    # recent activity intervals per session (day/week view precision)
    hourProfileDays: 30  # days feeding the 24-hour activity profile
```

## Development

```sh
pnpm install
pnpm typecheck          # strict TypeScript
pnpm test               # 27 unit tests (fold semantics, bounds, schedules)
pnpm build              # host ESM + browser module-loader bundle
pnpm verify:sessions    # fold your real ~/.dsh/sessions logs into a terminal report
```

```
packages layout:
  src/
    index.ts        # host plugin: registers the projection unit + cold warm-up
    activity.ts     # event → daily buckets / intervals / hourly profile fold
    schedules.ts    # schedule/change → reminders plan + dispatch history fold
    projection.ts   # the `calendar` ProjectionDefinition (zod-validated wire value)
    warmup.ts       # cold-session projection warm-up via the cache's coldSnapshot
    config.ts       # schemastery Config
    types.ts        # shared wire types + event/projection declaration merges
    client/
      index.ts          # browser plugin: settings page + stylesheet + locale
      CalendarSection.tsx  # page shell: view switcher, nav, stats
      YearView / WeekView / MonthView / DayView
      useCalendarData.ts  # useSessions aggregation, quantiles, durations
      decrypt.tsx        # decrypt-reveal text animation
      calendar.css.ts    # theme-token stylesheet
```

## Roadmap

- **Recurring-reminder panel** (upcoming / overdue / fired history) and schedule markers on the day/week timelines
- Workspace filtering and session search inside the calendar
- Screenshots in this README (see `docs/screenshots/`)
- PNG/WebM export for sharing a week's activity

## License

[MIT](LICENSE)
