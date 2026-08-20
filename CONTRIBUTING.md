# Contributing to dsh-calendar

Thanks for taking the time to contribute! 🎉 This project is a DeepSeek Harness plugin — a usage calendar built on the harness's session-projection seam.

## Development setup

```sh
pnpm install
pnpm typecheck   # strict TypeScript
pnpm test        # unit tests (fold semantics, task segments, bounds, schedules)
pnpm build       # host ESM + browser module-loader bundle
pnpm demo:build  # standalone demo page (docs/demo.html)
pnpm verify:sessions  # fold your real ~/.dsh/sessions logs into a terminal report
```

## Repository layout

```
src/
  index.ts / activity.ts / schedules.ts / projection.ts / warmup.ts / config.ts / types.ts
  client/
    index.ts            # browser plugin: settings page + main-UI cards + stylesheet
    CalendarSection.tsx # settings page shell
    CardOverlay.tsx     # main-UI floating cards (shell.overlay)
    YearView / WeekView / MonthView / DayView
    useCalendarData.ts  # aggregation + task-segment merge
    decrypt.tsx         # decrypt-reveal text animation
    calendar.css.ts     # theme-token stylesheet (colors resolve via --dsw-alias-*)
    demo.tsx            # mock-data demo page
```

## Conventions

- **Colors follow the DSH theme** — never hardcode hex/rgba in components; add a token to `calendar.css.ts` mapping a `--dsw-alias-*` variable with a dark fallback.
- **Views are pure props** — `YearView`/`WeekView`/`MonthView`/`DayView` receive `rows`/`days`/`cursor`; keep them free of slot/global dependencies so the demo page can reuse them.
- **Pure folds live host-side** — event → state logic goes in `activity.ts`/`schedules.ts` with unit tests in `tests/`.
- **Client imports use `/types` subpaths** (`@deepseek-ai/dsh-session/types`) to keep host type merges out of the browser bundle.

## Submitting changes

1. Open an issue or pick one from the backlog.
2. Fork, branch (`fix/…`, `feat/…`), commit with clear messages.
3. Open a PR against `main` using the PR template; the CI workflow runs typecheck/test/build automatically.
4. For UI changes, include a screenshot (use `docs/showcase.html` or the demo page).

## Releasing

Maintainers: tag `vX.Y.Z` on `main`; the Release workflow publishes to npm (`secrets.NPM_TOKEN`) and creates a GitHub Release with auto-generated notes.
