# 📅 dsh-calendar

> **See at a glance what DeepSeek did, and when.** A beautiful, theme-aware usage calendar for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — every project and task's execution time, in **day / 7-day / month / year** views.

English | [中文](README.zh.md)

[![npm version](https://img.shields.io/npm/v/dsh-usage-calendar)](https://www.npmjs.com/package/dsh-usage-calendar) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

![dsh-calendar banner](docs/screenshots/banner.png)

---

## Screenshots

Four time perspectives of your DeepSeek usage — **year / month / 7-day / day** — light and dark both follow DSH.

**🗓️ Year** — GitHub-style contribution heatmap of a whole year's activity:

![Year view — contribution heatmap](docs/screenshots/logs-year.png)

**🗂️ Month** — per-day heat bars and totals:

![Month view — calendar grid](docs/screenshots/logs-month.png)

**📅 7-day** — seven columns, one day each, a vertical 24-hour timeline; each session keeps its own color:

![7-day view — vertical timeline](docs/screenshots/logs-7days.png)

**⏱️ Day** — a 24-hour Gantt axis grouped by workspace → session, with task segments and the live now-line:

![Day view — Gantt timeline](docs/screenshots/logs-day.png)

**🃏 Main-UI cards** — small draggable cards floating over the main interface (choose which ones show in Settings):

![Main-UI card — 7-day](docs/screenshots/card-7days.png) ![Main-UI card — day](docs/screenshots/card-day.png)

---

## Why

You use DeepSeek Harness every day — dozens of sessions, background jobs, scheduled reminders. But there was never a way to *see* the work: when each project ran, for how long, how much tool activity happened, or when the next recurring task fires.

`dsh-calendar` turns your existing usage history into a beautiful calendar — **zero configuration, no extra data store, nothing to maintain.** Install, restart, open **Settings → 📅 Calendar**, and your entire history is there.

## Features

| | |
|---|---|
| 🗓️ **Year heatmap** | GitHub-style 52×7 contribution map — spot your busiest seasons at a glance |
| 📅 **7-day timeline** | Seven columns, one day each, a vertical 24-hour timeline. Every session keeps its own color, so you can trace one task across days |
| ⏱️ **Day timeline** | 24-hour Gantt axis by workspace → session. Turns merge into **task segments** — one user prompt opens a task, the work that follows joins it, one bar per task |
| 🗂️ **Month grid** | Classic calendar with per-day heat bars and totals |
| 🃏 **Main-UI cards** | Draggable mini cards (stats / year / 7-day / day / month) float over the main interface — move, collapse, or close them; pick which ones show in Settings |
| 🖱️ **Drill through** | Click any timeline bar to **open the actual conversation** |
| 📊 **Stats strip** | Active time / sessions / turns / tool calls for the selected range, with count-up numbers |
| 🎨 **Theme-aware** | Follows the harness theme — light and dark, automatically |
| ✨ **Animations** | Gentle entry effects and a decrypt-reveal headline — nothing janky, nothing in the way |
| 🕐 **History, out of the box** | Past sessions are folded and cached at startup — last month's activity is visible without opening anything |

## Install

```sh
dsh plugin --profile web add dsh-usage-calendar
```

Restart `dsh web`, then open **Settings → 📅 Calendar**.

## Usage

- **Views** — switch Day / 7-day / Month / Year with one click; `‹ ›` steps, **Today** jumps back.
- **Drill through** — click a heatmap cell, a month cell, or a timeline bar to jump into that day or conversation.
- **Main-UI cards** — drag the ⠿ handle anywhere, collapse `▾`, close `×`; re-enable in Settings → Calendar → Main-UI cards.
- **Hover** — any cell or bar shows the exact window, duration, and turn count.
- **Live** — running sessions pulse, and today's day view draws a live now-line.

## Demo preview

No live harness needed to preview the visuals — the repo ships a demo page with rich sample data (dark/light switchable):

```sh
pnpm demo:build && open docs/demo.html
```

## Roadmap

- **Recurring-reminder panel** (upcoming / overdue / fired history) with ⏰ markers on the timelines
- **Yearly `Wrapped` report** + shareable PNG export
- Workspace filtering and session search
- iCal export of DeepSeek's active windows

## License

[MIT](LICENSE)
