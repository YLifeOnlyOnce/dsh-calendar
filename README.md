# dsh-calendar

> A beautiful usage calendar for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — see at a glance when and what DeepSeek did, in day / month / year views, with recurring-task scheduling.

English | [中文](README.zh.md)

**Status: M1 (data layer).** The `calendar` session-projection unit is implemented and tested; the Web calendar page (day/month/year views + animations) lands in M2.

## What it shows

- **When** each project (Workspace) and task (Session) was active — activity intervals folded from the durable session log (`turn/start` → `turn/end` spans, tool calls, human prompts).
- **How much** — per-day active time, turn/tool counts, model wall time, failures.
- **Recurring tasks** — the schedule subsystem's reminders (`after` / `at` / `every`), their next targets, and dispatch history.

## Enable

```sh
dsh web --patch dsh-calendar/cordis.patch.yml
```

Then open **Settings → 📅 日程表**.

## Data model

One `calendar` projection value per session (see [`src/types.ts`](src/types.ts)):

| Field | Meaning |
|---|---|
| `days` | Per-local-day buckets (activeMs, turns, tools, llmMs, prompts, failedTurns), bounded by `keepDays` |
| `recentIntervals` | Most recent turn spans / prompt points, bounded by `intervalCap` |
| `hourProfile` | 24-hour activity intensity over the last `hourProfileDays` |
| `schedules` / `scheduleHistory` | Active recurring reminders + dispatch history |
| `firstActivityAt` / `lastActivityAt` / `totalActiveMs` | Whole-log extremes and total |

Active time = wall-clock spans of closed turns, attributed to local calendar days (host machine timezone). The fold counts the complete session log (whole-log scope, matching `dsh-session-stats`), so a fork child shows its inherited parent history.

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## License

MIT
