/**
 * dsh-calendar browser styles, injected as one `<style data-plugin>` tag by
 * the client plugin body. Class names are hand-scoped with a `dsh-cal-`
 * prefix (this standalone project does not use the repository's CSS-modules
 * build preset). Colors follow the DSH Web dark surface.
 */

export const CALENDAR_CSS = `
.dsh-cal-root {
  --dsh-cal-bg: #12151a;
  --dsh-cal-card: #16191e;
  --dsh-cal-border: #262b33;
  --dsh-cal-text: #e6e9ee;
  --dsh-cal-muted: #8b93a1;
  --dsh-cal-accent: #4d7cfe;
  --dsh-cal-green: #6ee7b7;
  --dsh-cal-amber: #fbbf24;
  --dsh-cal-red: #f87171;
  --dsh-cal-gap: 3px;
  color: var(--dsh-cal-text);
  font-family: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
}
.dsh-cal-root * { box-sizing: border-box; }

/* ---- header ---- */
.dsh-cal-header { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
.dsh-cal-title { font-size: 17px; font-weight: 700; letter-spacing: 0.2px; margin: 0; min-width: 180px; }
.dsh-cal-title .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.dsh-cal-nav { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.dsh-cal-navbtn {
  background: var(--dsh-cal-card); color: var(--dsh-cal-text); border: 1px solid var(--dsh-cal-border);
  border-radius: 8px; padding: 5px 10px; font-size: 12px; cursor: pointer; transition: all 0.15s ease;
}
.dsh-cal-navbtn:hover { border-color: var(--dsh-cal-accent); color: var(--dsh-cal-accent); }
.dsh-cal-navbtn:disabled { opacity: 0.4; cursor: default; }
.dsh-cal-navbtn.primary { background: var(--dsh-cal-accent); border-color: var(--dsh-cal-accent); color: #fff; }
.dsh-cal-range { font-size: 13px; color: var(--dsh-cal-text); font-weight: 600; min-width: 96px; text-align: center; }

/* ---- view switcher ---- */
.dsh-cal-views { display: inline-flex; background: var(--dsh-cal-card); border: 1px solid var(--dsh-cal-border); border-radius: 10px; padding: 3px; gap: 2px; }
.dsh-cal-viewbtn {
  border: none; background: transparent; color: var(--dsh-cal-muted); border-radius: 7px;
  padding: 4px 14px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;
}
.dsh-cal-viewbtn:hover { color: var(--dsh-cal-text); }
.dsh-cal-viewbtn.active { background: var(--dsh-cal-accent); color: #fff; box-shadow: 0 2px 8px rgba(77, 124, 254, 0.35); }

/* ---- stats ---- */
.dsh-cal-stats { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.dsh-cal-stat {
  background: var(--dsh-cal-card); border: 1px solid var(--dsh-cal-border); border-radius: 12px;
  padding: 10px 16px; min-width: 110px; flex: 1;
}
.dsh-cal-stat .label { font-size: 11px; color: var(--dsh-cal-muted); margin-bottom: 4px; }
.dsh-cal-stat .value { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
.dsh-cal-stat .value.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

/* ---- heat palette (dark) ---- */
.dsh-cal-cell { border-radius: 3px; border: none; padding: 0; cursor: pointer; position: relative; transition: transform 0.12s ease, box-shadow 0.12s ease; }
.dsh-cal-cell:hover { transform: scale(1.35); box-shadow: 0 2px 10px rgba(0,0,0,0.5); z-index: 2; }
.dsh-cal-l0 { background: rgba(77,124,254,0.07); }
.dsh-cal-l1 { background: rgba(77,124,254,0.22); }
.dsh-cal-l2 { background: rgba(77,124,254,0.45); }
.dsh-cal-l3 { background: rgba(77,124,254,0.7); }
.dsh-cal-l4 { background: #6d8bff; }
.dsh-cal-cell.today { outline: 1.5px solid var(--dsh-cal-green); outline-offset: 1px; }
.dsh-cal-cell.future { background: transparent; cursor: default; }
.dsh-cal-cell.future:hover { transform: none; box-shadow: none; }

/* ---- year view ---- */
.dsh-cal-year { display: flex; gap: 12px; align-items: flex-start; }
.dsh-cal-weekdays { display: grid; grid-template-rows: repeat(7, 1fr); gap: var(--dsh-cal-gap); margin-right: 6px; }
.dsh-cal-weekdays span { font-size: 10px; color: var(--dsh-cal-muted); height: 11px; line-height: 11px; }
.dsh-cal-gridwrap { overflow-x: auto; }
.dsh-cal-grid { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 1fr); gap: var(--dsh-cal-gap); }
.dsh-cal-cell { width: 11px; height: 11px; }
.dsh-cal-months { display: grid; grid-auto-flow: column; gap: var(--dsh-cal-gap); margin-bottom: 4px; }
.dsh-cal-months span { font-size: 9px; color: var(--dsh-cal-muted); width: 11px; }
.dsh-cal-legend { display: flex; align-items: center; gap: 5px; margin-top: 10px; font-size: 10px; color: var(--dsh-cal-muted); }
.dsh-cal-legend .cell { width: 10px; height: 10px; border-radius: 2px; }

/* ---- month view ---- */
.dsh-cal-month { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.dsh-cal-month .dow { font-size: 11px; color: var(--dsh-cal-muted); text-align: center; padding: 2px 0; }
.dsh-cal-monthcell {
  border: 1px solid var(--dsh-cal-border); border-radius: 10px; background: var(--dsh-cal-card);
  min-height: 64px; padding: 6px 8px; cursor: pointer; text-align: left; transition: all 0.15s ease; position: relative; overflow: hidden;
}
.dsh-cal-monthcell:hover { border-color: var(--dsh-cal-accent); transform: translateY(-2px); }
.dsh-cal-monthcell.other { opacity: 0.35; }
.dsh-cal-monthcell .daynum { font-size: 12px; font-weight: 600; color: var(--dsh-cal-muted); }
.dsh-cal-monthcell.today .daynum { color: var(--dsh-cal-green); }
.dsh-cal-monthcell .amt { font-size: 11px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }
.dsh-cal-monthcell .sub { font-size: 10px; color: var(--dsh-cal-muted); margin-top: 2px; }
.dsh-cal-monthcell .heatbar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--dsh-cal-accent); opacity: 0.7; }

/* ---- day view ---- */
.dsh-cal-day { display: flex; flex-direction: column; gap: 8px; }
.dsh-cal-dayrow {
  background: var(--dsh-cal-card); border: 1px solid var(--dsh-cal-border); border-radius: 10px;
  padding: 10px 12px; display: flex; align-items: center; gap: 12px;
}
.dsh-cal-dayrow .time { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--dsh-cal-accent); white-space: nowrap; min-width: 108px; }
.dsh-cal-dayrow .title { font-size: 13px; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-cal-dayrow .meta { font-size: 11px; color: var(--dsh-cal-muted); white-space: nowrap; }
.dsh-cal-dayrow .running { color: var(--dsh-cal-green); animation: dsh-cal-pulse 1.6s ease-in-out infinite; }
.dsh-cal-empty { color: var(--dsh-cal-muted); font-size: 13px; text-align: center; padding: 40px 0; }

/* ---- tooltip ---- */
.dsh-cal-tip {
  position: fixed; z-index: 9999; background: #1c2129; border: 1px solid var(--dsh-cal-border);
  border-radius: 10px; padding: 8px 12px; font-size: 12px; pointer-events: none;
  box-shadow: 0 8px 30px rgba(0,0,0,0.5); opacity: 0; transform: translateY(4px); transition: opacity 0.15s ease, transform 0.15s ease;
}
.dsh-cal-tip.show { opacity: 1; transform: translateY(0); }
.dsh-cal-tip .date { color: var(--dsh-cal-muted); font-size: 11px; margin-bottom: 3px; }
.dsh-cal-tip .line { display: flex; gap: 6px; align-items: baseline; }

@keyframes dsh-cal-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
`
