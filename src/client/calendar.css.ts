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

/* ---- day view (Gantt timeline) ---- */
.dsh-cal-day { overflow-x: auto; }
.dsh-cal-daycontent { position: relative; min-width: 960px; }
.dsh-cal-axis { position: relative; height: 20px; margin-bottom: 2px; }
.dsh-cal-axis .tick { position: absolute; font-size: 10px; color: var(--dsh-cal-muted); transform: translateX(-50%); top: 0; }
.dsh-cal-axis .tick::after { content: ''; position: absolute; left: 50%; top: 11px; height: 5px; width: 1px; background: var(--dsh-cal-border); }
.dsh-cal-wsgroup { margin-bottom: 12px; }
.dsh-cal-wsname { font-size: 12px; font-weight: 700; color: var(--dsh-cal-text); margin-bottom: 5px; display: flex; align-items: center; gap: 6px; }
.dsh-cal-wsname::before { content: ''; width: 3px; height: 12px; border-radius: 2px; background: var(--dsh-cal-accent); }
.dsh-cal-sessrow { display: flex; align-items: center; margin-bottom: 3px; }
.dsh-cal-sessname { width: 150px; flex-shrink: 0; font-size: 11px; color: var(--dsh-cal-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 10px; }
.dsh-cal-sessname .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; vertical-align: 1px; }
.dsh-cal-track { position: relative; height: 14px; background: rgba(255, 255, 255, 0.025); border-radius: 4px; flex: 1; }
.dsh-cal-bar { position: absolute; top: 2px; bottom: 2px; border-radius: 3px; background: linear-gradient(90deg, #4d7cfe, #6d8bff); opacity: 0.88; transform-origin: left; }
.dsh-cal-bar.running { animation: dsh-cal-pulse 2s ease-in-out infinite; }
.dsh-cal-bar.prompt { background: var(--dsh-cal-green); width: 4px; border-radius: 50%; }
.dsh-cal-nowline { position: absolute; top: -3px; bottom: -4px; width: 2px; background: var(--dsh-cal-red); z-index: 5; pointer-events: none; }
.dsh-cal-nowline::before { content: ''; position: absolute; top: -3px; left: -3px; width: 8px; height: 8px; border-radius: 50%; background: var(--dsh-cal-red); box-shadow: 0 0 8px var(--dsh-cal-red); }

/* ---- week view (7 columns) ---- */
.dsh-cal-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; min-width: 640px; overflow-x: auto; }
.dsh-cal-wcol { display: flex; flex-direction: column; gap: 4px; }
.dsh-cal-wday { text-align: center; font-size: 11px; font-weight: 600; color: var(--dsh-cal-text); }
.dsh-cal-wday .sub { font-size: 10px; color: var(--dsh-cal-muted); font-weight: 400; }
.dsh-cal-wday.today { color: var(--dsh-cal-green); }
.dsh-cal-wtrack { position: relative; border: 1px solid var(--dsh-cal-border); border-radius: 8px; background: var(--dsh-cal-card); overflow: hidden; }
.dsh-cal-whour { position: absolute; left: 0; right: 0; border-top: 1px dashed rgba(255, 255, 255, 0.06); }
.dsh-cal-wbar { position: absolute; border-radius: 3px; min-width: 6px; opacity: 0.85; transform-origin: top; cursor: pointer; }
.dsh-cal-wbar:hover { opacity: 1; box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.35); z-index: 3; }
.dsh-cal-whourlabel { position: absolute; left: 3px; font-size: 9px; color: var(--dsh-cal-muted); pointer-events: none; }

.dsh-cal-empty { color: var(--dsh-cal-muted); font-size: 13px; text-align: center; padding: 40px 0; }

/* ---- widget dashboard ---- */
.dsh-cal-widgets { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
.dsh-cal-widget {
  background: var(--dsh-cal-card); border: 1px solid var(--dsh-cal-border); border-radius: 14px;
  padding: 10px 12px 12px; transition: box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease;
}
.dsh-cal-widget.dropmode { box-shadow: 0 0 0 1.5px var(--dsh-cal-accent); }
.dsh-cal-widget.dragging { opacity: 0.45; transform: scale(0.98); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); }
.dsh-cal-widgethead { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.dsh-cal-widgethandle {
  cursor: grab; color: var(--dsh-cal-muted); font-size: 13px; padding: 2px 4px; border-radius: 6px;
  user-select: none; touch-action: none; transition: color 0.15s ease, background 0.15s ease;
}
.dsh-cal-widgethandle:hover { color: var(--dsh-cal-accent); background: rgba(77, 124, 254, 0.1); }
.dsh-cal-widgethandle:active { cursor: grabbing; }
.dsh-cal-widgettitle { font-size: 13px; font-weight: 700; color: var(--dsh-cal-text); }
.dsh-cal-widgetnav { margin-left: auto; display: flex; gap: 4px; align-items: center; }
.dsh-cal-widgetnav .dsh-cal-navbtn { padding: 2px 8px; font-size: 11px; }
.dsh-cal-dragghost {
  position: fixed; z-index: 9998; pointer-events: none; background: var(--dsh-cal-card);
  border: 1px solid var(--dsh-cal-accent); border-radius: 10px; padding: 8px 14px; font-size: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55); transform: translate(-50%, -140%);
}
.dsh-cal-layoutbtn {
  background: transparent; color: var(--dsh-cal-muted); border: 1px solid var(--dsh-cal-border);
  border-radius: 8px; padding: 5px 10px; font-size: 12px; cursor: pointer; transition: all 0.15s ease;
}
.dsh-cal-layoutbtn:hover { color: var(--dsh-cal-text); border-color: var(--dsh-cal-accent); }
.dsh-cal-overlay {
  position: fixed; inset: 0; z-index: 9997; background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center;
}
.dsh-cal-dialog {
  background: #1c2129; border: 1px solid var(--dsh-cal-border); border-radius: 14px;
  padding: 18px 20px; min-width: 280px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}
.dsh-cal-dialog h3 { margin: 0 0 6px; font-size: 15px; }
.dsh-cal-dialog .tip { font-size: 11px; color: var(--dsh-cal-muted); margin-bottom: 12px; }
.dsh-cal-dialog .row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; cursor: pointer; }
.dsh-cal-dialog .row input { accent-color: var(--dsh-cal-accent); }
.dsh-cal-dialog .actions { display: flex; gap: 8px; margin-top: 14px; }

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
