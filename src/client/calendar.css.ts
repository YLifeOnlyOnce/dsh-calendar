/**
 * dsh-calendar browser styles, injected as one `<style data-plugin>` tag by
 * the client plugin body. Class names are hand-scoped with a `dsh-cal-`
 * prefix (this standalone project does not use the repository's CSS-modules
 * build preset).
 *
 * Colors follow the DSH Web theme: every value resolves through the harness
 * ui-theme alias tokens (`--dsw-alias-*`, light/dark aware, set on the page
 * body), with a dark fallback palette for compositions without the theme
 * plugin. The heat scale derives from the brand accent via `color-mix`, so
 * it stays legible under either scheme.
 */

export const CALENDAR_CSS = `
.dsh-cal-root {
  --dsh-cal-card: var(--dsw-alias-bg-layer-3, #16191e);
  --dsh-cal-card-raised: var(--dsw-alias-bg-overlay, #1c2129);
  --dsh-cal-border: var(--dsw-alias-border-l2, #262b33);
  --dsh-cal-text: var(--dsw-alias-label-primary, #e6e9ee);
  --dsh-cal-muted: var(--dsw-alias-label-secondary, #8b93a1);
  --dsh-cal-accent: var(--dsw-alias-brand-primary, #4d7cfe);
  --dsh-cal-green: var(--dsw-alias-state-success-primary, #6ee7b7);
  --dsh-cal-red: var(--dsw-alias-state-error-primary, #f87171);
  --dsh-cal-amber: var(--dsw-alias-state-warn-primary, #fbbf24);
  --dsh-cal-hover: var(--dsw-alias-interactive-bg-hover, rgba(255, 255, 255, 0.06));
  --dsh-cal-shadow: var(--dsw-shadow-lv3, 0 8px 30px rgba(0, 0, 0, 0.5));
  --dsh-cal-gap: 3px;
  color: var(--dsh-cal-text);
  font-family: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
  min-width: 0;
  max-width: 100%;
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
.dsh-cal-navbtn:hover { border-color: var(--dsh-cal-accent); color: var(--dsh-cal-accent); background: var(--dsh-cal-hover); }
.dsh-cal-navbtn:disabled { opacity: 0.4; cursor: default; }
.dsh-cal-navbtn.primary { background: var(--dsh-cal-accent); border-color: var(--dsh-cal-accent); color: var(--dsw-alias-label-primary-inverted, #fff); }
.dsh-cal-range { font-size: 13px; color: var(--dsh-cal-text); font-weight: 600; min-width: 96px; text-align: center; }

/* ---- view switcher ---- */
.dsh-cal-views { display: inline-flex; background: var(--dsh-cal-card); border: 1px solid var(--dsh-cal-border); border-radius: 10px; padding: 3px; gap: 2px; }
.dsh-cal-viewbtn {
  border: none; background: transparent; color: var(--dsh-cal-muted); border-radius: 7px;
  padding: 4px 14px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;
}
.dsh-cal-viewbtn:hover { color: var(--dsh-cal-text); }
.dsh-cal-viewbtn.active { background: var(--dsh-cal-accent); color: var(--dsw-alias-label-primary-inverted, #fff); box-shadow: 0 2px 8px color-mix(in srgb, var(--dsh-cal-accent) 35%, transparent); }

/* ---- stats ---- */
.dsh-cal-stats { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.dsh-cal-stat {
  background: var(--dsh-cal-card); border: 1px solid var(--dsh-cal-border); border-radius: 12px;
  padding: 10px 16px; min-width: 110px; flex: 1;
}
.dsh-cal-stat .label { font-size: 11px; color: var(--dsh-cal-muted); margin-bottom: 4px; }
.dsh-cal-stat .value { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
.dsh-cal-stat .value.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

/* ---- heat palette (theme accent, color-mix for alpha) ---- */
.dsh-cal-cell { border-radius: 3px; border: none; padding: 0; cursor: pointer; position: relative; transition: transform 0.12s ease, box-shadow 0.12s ease; }
.dsh-cal-cell:hover { transform: scale(1.35); box-shadow: var(--dsh-cal-shadow); z-index: 2; }
.dsh-cal-l0 { background: color-mix(in srgb, var(--dsh-cal-accent) 12%, transparent); }
.dsh-cal-l1 { background: color-mix(in srgb, var(--dsh-cal-accent) 38%, transparent); }
.dsh-cal-l2 { background: color-mix(in srgb, var(--dsh-cal-accent) 62%, transparent); }
.dsh-cal-l3 { background: color-mix(in srgb, var(--dsh-cal-accent) 85%, transparent); }
.dsh-cal-l4 {
  background: var(--dsh-cal-accent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #ffffff 32%, transparent);
}
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

/* ---- day view (Gantt timeline, two-column: sticky labels + scrolling track) ---- */
.dsh-cal-viewport { min-width: 0; max-width: 100%; }
.dsh-cal-daybox { min-width: 0; max-width: 100%; --dsh-cal-label-w: 168px; }
.dsh-cal-daytools { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.dsh-cal-scale { font-size: 11px; color: var(--dsh-cal-muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin-left: 4px; }
.dsh-cal-day { overflow: auto; max-width: 100%; position: relative; }
.dsh-cal-daycontent { position: relative; min-width: 0; }

/* shared hour gridlines behind every row (left of the label column) */
.dsh-cal-gridlines { position: absolute; top: 20px; bottom: 0; left: var(--dsh-cal-label-w); pointer-events: none; z-index: 0; }
.dsh-cal-gridlines span { position: absolute; top: 0; bottom: 0; width: 1px; background: color-mix(in srgb, var(--dsh-cal-text) 7%, transparent); }

/* sticky hour axis */
.dsh-cal-axis {
  position: sticky; top: 0; z-index: 7;
  display: grid; grid-template-columns: var(--dsh-cal-label-w) 1fr;
  background: var(--dsw-alias-bg-layer-2, #12151a);
  border-bottom: 1px solid var(--dsh-cal-border);
}
.dsh-cal-axislabel { font-size: 10px; color: var(--dsh-cal-muted); padding: 4px 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-cal-axistrack { position: relative; height: 20px; }
.dsh-cal-axis .tick { position: absolute; font-size: 10px; color: var(--dsh-cal-muted); transform: translateX(-50%); top: 3px; }
.dsh-cal-axis .tick::after { content: ''; position: absolute; left: 50%; top: 11px; height: 5px; width: 1px; background: var(--dsh-cal-border); }

/* workspace row: label column + empty track spacer */
.dsh-cal-wsrow { border-top: 1px solid color-mix(in srgb, var(--dsh-cal-text) 9%, transparent); }
.dsh-cal-wslabel {
  position: sticky; left: 0; z-index: 6;
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px;
  background: var(--dsw-alias-bg-layer-2, #12151a);
  border-right: 1px solid color-mix(in srgb, var(--dsh-cal-text) 9%, transparent);
}
.dsh-cal-wslabel .wsname { font-size: 12px; font-weight: 700; color: var(--dsh-cal-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-cal-wslabel .wscount { font-size: 10px; color: var(--dsh-cal-muted); white-space: nowrap; }
.dsh-cal-wstrack { position: relative; height: 0; }

/* session row: sticky label + track */
.dsh-cal-sessrow { display: grid; grid-template-columns: var(--dsh-cal-label-w) 1fr; }
.dsh-cal-sesslabel {
  position: sticky; left: 0; z-index: 5;
  display: flex; align-items: center; gap: 6px;
  padding: 2px 8px;
  background: var(--dsw-alias-bg-layer-2, #12151a);
  border-right: 1px solid color-mix(in srgb, var(--dsh-cal-text) 9%, transparent);
}
.dsh-cal-sesslabel .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.dsh-cal-sesslabel .sessname { flex: 1; font-size: 11px; color: var(--dsh-cal-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-cal-sesslabel .run { color: var(--dsh-cal-green); font-size: 9px; animation: dsh-cal-pulse 1.6s ease-in-out infinite; }
.dsh-cal-track { position: relative; height: 14px; margin: 2px 0; background: color-mix(in srgb, var(--dsh-cal-text) 4%, transparent); }
.dsh-cal-sessrow + .dsh-cal-sessrow .dsh-cal-track { background: color-mix(in srgb, var(--dsh-cal-text) 7%, transparent); }
.dsh-cal-bar { position: absolute; top: 1px; bottom: 1px; border-radius: 3px; background: linear-gradient(90deg, var(--dsh-cal-accent), color-mix(in srgb, var(--dsh-cal-accent) 75%, white)); opacity: 0.9; transform-origin: left; cursor: pointer; }
.dsh-cal-bar.running { animation: dsh-cal-pulse 2s ease-in-out infinite; }
.dsh-cal-segprompt { position: absolute; left: 1px; top: 1px; bottom: 1px; width: 2px; border-radius: 2px; background: var(--dsh-cal-green); }
.dsh-cal-nowline { position: absolute; top: 20px; bottom: 0; width: 2px; background: var(--dsh-cal-red); z-index: 5; pointer-events: none; }
.dsh-cal-nowline::before { content: ''; position: absolute; top: -3px; left: -3px; width: 8px; height: 8px; border-radius: 50%; background: var(--dsh-cal-red); box-shadow: 0 0 8px var(--dsh-cal-red); }

/* ---- week view (7 columns) ---- */
.dsh-cal-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; min-width: 640px; overflow-x: auto; max-width: 100%; }
.dsh-cal-wcol { display: flex; flex-direction: column; gap: 4px; }
.dsh-cal-wday { text-align: center; font-size: 11px; font-weight: 600; color: var(--dsh-cal-text); }
.dsh-cal-wday .sub { font-size: 10px; color: var(--dsh-cal-muted); font-weight: 400; }
.dsh-cal-wday.today { color: var(--dsh-cal-green); }
.dsh-cal-wtrack { position: relative; border: 1px solid var(--dsh-cal-border); border-radius: 8px; background: var(--dsh-cal-card); overflow: hidden; }
.dsh-cal-whour { position: absolute; left: 0; right: 0; border-top: 1px dashed color-mix(in srgb, var(--dsh-cal-text) 10%, transparent); }
.dsh-cal-wbar { position: absolute; border-radius: 3px; min-width: 6px; opacity: 0.85; transform-origin: top; cursor: pointer; }
.dsh-cal-wbar:hover { opacity: 1; box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--dsh-cal-text) 35%, transparent); z-index: 3; }
.dsh-cal-whourlabel { position: absolute; left: 3px; font-size: 9px; color: var(--dsh-cal-muted); pointer-events: none; }

.dsh-cal-empty { color: var(--dsh-cal-muted); font-size: 13px; text-align: center; padding: 40px 0; }

/* ---- main-UI floating cards (shell.overlay) ---- */
.dsh-cal-cardlayer { position: fixed; inset: 0; pointer-events: none; z-index: 500; }
.dsh-cal-card {
  position: absolute; pointer-events: auto; background: var(--dsh-cal-card-raised);
  border: 1px solid var(--dsh-cal-border); border-radius: 12px; box-shadow: var(--dsh-cal-shadow);
  max-width: 420px; padding: 8px 10px 10px; display: flex; flex-direction: column; gap: 6px;
}
.dsh-cal-cardhead { display: flex; align-items: center; gap: 6px; }
.dsh-cal-cardhandle {
  cursor: grab; color: var(--dsh-cal-muted); font-size: 12px; padding: 2px 4px; border-radius: 6px;
  user-select: none; touch-action: none; transition: color 0.15s ease, background 0.15s ease;
}
.dsh-cal-cardhandle:hover { color: var(--dsh-cal-accent); background: var(--dsh-cal-hover); }
.dsh-cal-cardhandle:active { cursor: grabbing; }
.dsh-cal-cardtitle { font-size: 12px; font-weight: 700; color: var(--dsh-cal-text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-cal-cardbtns { display: flex; gap: 2px; }
.dsh-cal-cardbtn {
  background: transparent; border: none; color: var(--dsh-cal-muted); cursor: pointer;
  font-size: 12px; padding: 1px 6px; border-radius: 6px; transition: all 0.15s ease;
}
.dsh-cal-cardbtn:hover { color: var(--dsh-cal-text); background: var(--dsh-cal-hover); }
.dsh-cal-cardbody { overflow: auto; max-height: 340px; }
.dsh-cal-cardstats { display: flex; gap: 8px; }
.dsh-cal-cardstats .cell {
  flex: 1; display: flex; flex-direction: column; gap: 2px; background: var(--dsh-cal-card);
  border: 1px solid var(--dsh-cal-border); border-radius: 8px; padding: 6px 8px;
}
.dsh-cal-cardstats .label { font-size: 10px; color: var(--dsh-cal-muted); }
.dsh-cal-cardstats b { font-size: 14px; font-variant-numeric: tabular-nums; }

/* compact content sizing inside cards */
.dsh-cal-card .dsh-cal-cell { width: 6px; height: 6px; }
.dsh-cal-card .dsh-cal-grid { gap: 1px; }
.dsh-cal-card .dsh-cal-months { gap: 1px; margin-bottom: 2px; }
.dsh-cal-card .dsh-cal-months span { font-size: 7px; width: 6px; }
.dsh-cal-card .dsh-cal-weekdays span { font-size: 8px; height: 6px; line-height: 6px; }
.dsh-cal-card .dsh-cal-legend { font-size: 9px; margin-top: 4px; }
.dsh-cal-card .dsh-cal-week { min-width: 0; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.dsh-cal-card .dsh-cal-wcol { gap: 2px; }
.dsh-cal-card .dsh-cal-wtrack { border-radius: 6px; }
.dsh-cal-card .dsh-cal-wday { font-size: 9px; }
.dsh-cal-card .dsh-cal-month { gap: 3px; }
.dsh-cal-card .dsh-cal-monthcell { min-height: 34px; padding: 3px 5px; border-radius: 7px; }
.dsh-cal-card .dsh-cal-monthcell .amt { font-size: 9px; margin-top: 1px; }
.dsh-cal-card .dsh-cal-monthcell .sub { display: none; }
.dsh-cal-card .dsh-cal-day { max-width: 400px; }
.dsh-cal-card .dsh-cal-daycontent { min-width: 0; }
.dsh-cal-card .dsh-cal-daybox { --dsh-cal-label-w: 110px; }
.dsh-cal-card .dsh-cal-sesslabel .sessname { font-size: 10px; }
.dsh-cal-card .dsh-cal-wslabel .wsname { font-size: 11px; }
.dsh-cal-card .dsh-cal-wslabel, .dsh-cal-card .dsh-cal-sesslabel { padding: 2px 6px; }
.dsh-cal-card .dsh-cal-axis .tick { font-size: 8px; }
.dsh-cal-card .dsh-cal-stat { padding: 6px 10px; min-width: 80px; }
.dsh-cal-card .dsh-cal-stat .value { font-size: 15px; }

/* ---- settings: main-UI card selection ---- */
.dsh-cal-cardsel { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--dsh-cal-border); }
.dsh-cal-cardsel h3 { font-size: 13px; font-weight: 700; margin: 0 0 4px; }
.dsh-cal-cardsel .tip { font-size: 11px; color: var(--dsh-cal-muted); margin-bottom: 8px; }
.dsh-cal-cardsel .row { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 13px; cursor: pointer; }
.dsh-cal-cardsel .row input { accent-color: var(--dsh-cal-accent); }

/* ---- tooltip ---- */
.dsh-cal-tip {
  position: fixed; z-index: 9999; background: var(--dsh-cal-card-raised); border: 1px solid var(--dsh-cal-border);
  border-radius: 10px; padding: 8px 12px; font-size: 12px; pointer-events: none;
  box-shadow: var(--dsh-cal-shadow); opacity: 0; transform: translateY(4px); transition: opacity 0.15s ease, transform 0.15s ease;
}
.dsh-cal-tip.show { opacity: 1; transform: translateY(0); }
.dsh-cal-tip .date { color: var(--dsh-cal-muted); font-size: 11px; margin-bottom: 3px; }
.dsh-cal-tip .line { display: flex; gap: 6px; align-items: baseline; }

@keyframes dsh-cal-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
`
