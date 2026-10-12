import React, { useEffect, useRef, useState } from "react";
import { Card, Toggle, NumField, Select, Field, TextInput, Button } from "./ui.jsx";
import { SCENES, LIMITS, LAYERS, QUOTES, lastDays, today, parseVideoId } from "./lib.js";

const ICONS = {
  background: <><path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/><path d="M3 16l5-4 4 3 3-3 6 5"/><circle cx="8.5" cy="8.5" r="1.5"/></>,
  clock:      <><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></>,
  timer:      <><path d="M9.5 2.5h5"/><circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.5 1.5"/></>,
  sounds:     <><path d="M4 9v6h3l5 4V5L7 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></>,
  tasks:      <><path d="M9 6h11M9 12h11M9 18h7"/><path d="M4 6l1.2 1.2L7.5 4.8"/><path d="M4 12l1.2 1.2L7.5 10.8"/></>,
  stats:      <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  quotes:     <><path d="M9.5 7C7 8 5.5 10 5.5 13v4h5v-5H8c0-2 .6-3.3 2.2-4z"/><path d="M18 7c-2.5 1-4 3-4 6v4h5v-5h-2.5c0-2 .6-3.3 2.2-4z"/></>,
  keys:       <><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8"/></>,
};

const NAV = [
  { group:"Appearance", items:[
    { id:"background", label:"Background" },
    { id:"clock",      label:"Clock" },
  ]},
  { group:"Session", items:[
    { id:"timer",  label:"Focus Timer" },
    { id:"sounds", label:"Sounds" },
  ]},
  { group:"Your work", items:[
    { id:"tasks",  label:"Tasks" },
    { id:"stats",  label:"Stats" },
    { id:"quotes", label:"Quotes" },
    { id:"keys",   label:"Shortcuts" },
  ]},
];

const TITLES = {
  background:["Background", "Pick a scene, or bring your own image or video."],
  clock:     ["Clock", "How the time remaining is displayed."],
  timer:     ["Focus Timer", "Customise your timer to match your workflow."],
  sounds:    ["Sounds", "Layerable ambience, synthesised live, plus a music station."],
  tasks:     ["Tasks", "One list. Pick the one thing you want in view while you work."],
  stats:     ["Stats", "What you have actually done, kept in this browser."],
  quotes:    ["Quotes", "A line under the clock, changing once a day."],
  keys:      ["Shortcuts", "Everything the timer does, without the mouse."],
};

const STYLES = [
  { id:"digits", name:"Digits" },
  { id:"ring",   name:"Ring" },
  { id:"bar",    name:"Bar" },
];

const KEYS = [
  ["Start or pause", "Space"],
  ["Reset the segment", "R"],
  ["Skip ahead", "S"],
  ["Focus / break / long break", "1  2  3"],
  ["Full screen", "F"],
  ["Settings", "," ],
  ["Close settings", "Esc"],
];

export default function Settings({ open, onClose, cfg, set, api, startTab }) {
  const [tab, setTab] = useState("background");
  const [vidDraft, setVidDraft] = useState(cfg.bgVideo || "");
  const [imgDraft, setImgDraft] = useState("");
  const [err, setErr] = useState("");
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  // Jumping between sections should start at the top of the new one.
  useEffect(() => { panel.current?.scrollTo(0, 0); }, [tab]);

  /* The tool buttons open straight to their own section, but only on the
     way in — otherwise reopening would drag you off the last tab. */
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current && startTab) setTab(startTab);
    wasOpen.current = open;
  }, [open, startTab]);

  if (!open) return null;

  const pickFile = async (file) => {
    setErr("");
    if (!file) return;
    if (!/^image\//.test(file.type)) { setErr("That is not an image."); return; }
    /* Uploads live in localStorage as data URLs, and the whole origin only
       gets a few megabytes. Anything larger has to be linked instead. */
    if (file.size > 1.5 * 1024 * 1024) {
      setErr("Images over 1.5 MB have to be linked by URL rather than uploaded.");
      return;
    }
    const url = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
    }).catch(() => null);
    if (!url) { setErr("That image could not be read."); return; }
    const ok = await api.saveImage(url);
    if (!ok) setErr("There was not enough room to store that image. Try a smaller one, or link it.");
  };

  return (
    <div className="fx-modal" role="dialog" aria-modal="true" aria-label="Settings">
      <button className="fx-scrim" aria-label="Close settings" onClick={onClose} />
      <div className="fx-sheet">
        <nav className="fx-nav">
          <button className="fx-close" onClick={onClose} aria-label="Close settings">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
          {NAV.map((g) => (
            <div className="fx-navgroup" key={g.group}>
              <p className="fx-navlabel">{g.group}</p>
              {g.items.map((it) => (
                <button key={it.id} className={`fx-navitem${tab === it.id ? " on" : ""}`}
                  aria-current={tab === it.id ? "page" : undefined}
                  onClick={() => setTab(it.id)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[it.id]}</svg>
                  {it.label}
                </button>
              ))}
            </div>
          ))}
          <div className="fx-navfoot">
            <p>Everything stays in this browser. No account, no sync, nothing leaves.</p>
          </div>
        </nav>

        <div className="fx-panel" ref={panel}>
          <header className="fx-panelhead">
            <h2>{TITLES[tab][0]}</h2>
            <p>{TITLES[tab][1]}</p>
          </header>

          {tab === "background" && (
            <>
              <Card title="Your own background"
                hint="An image or a YouTube video, layered under the timer.">
                <Field label="Image">
                  <div className="fx-drop"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}>
                    <p>Drop an image here, or <label className="fx-link">
                      browse
                      <input type="file" accept="image/*" hidden
                        onChange={(e) => pickFile(e.target.files?.[0])} />
                    </label></p>
                    <small>JPG, PNG, WEBP or GIF · up to 1.5 MB</small>
                  </div>
                </Field>

                <Field label="…or paste an image link">
                  <div className="fx-inline">
                    <TextInput value={imgDraft} placeholder="https://…"
                      aria-label="Image URL"
                      onChange={(v) => { setImgDraft(v); setErr(""); }} />
                    <Button kind="primary" onClick={async () => {
                      const v = imgDraft.trim();
                      if (!v) return;
                      const ok = await api.saveImage(v);
                      if (ok) setImgDraft(""); else setErr("That link could not be stored.");
                    }}>Use</Button>
                  </div>
                </Field>

                <Field label="Video (YouTube)"
                  hint="Plays muted on loop behind everything. The music station is separate.">
                  <div className="fx-inline">
                    <TextInput value={vidDraft} placeholder="Paste a YouTube URL"
                      aria-label="YouTube background URL"
                      onChange={(v) => { setVidDraft(v); setErr(""); }} />
                    <Button kind="primary" onClick={() => {
                      const v = vidDraft.trim();
                      if (!v) { set("bgVideo")(""); return; }
                      const id = parseVideoId(v);
                      if (!id) { setErr("That does not look like a YouTube link."); return; }
                      set("bgVideo")(id); setErr("");
                    }}>Save</Button>
                  </div>
                </Field>

                {(cfg.bgImage || cfg.bgVideo) && (
                  <>
                    <Field label={`Dim · ${cfg.bgOverlay}%`}
                      hint="Darkens whatever is behind the timer so it stays readable.">
                      <input className="fx-range" type="range" min="0" max="85"
                        value={cfg.bgOverlay} aria-label="Background dim"
                        onChange={(e) => set("bgOverlay")(+e.target.value)} />
                    </Field>
                    <div className="fx-actions">
                      <Button kind="danger" onClick={() => {
                        api.saveImage(""); set("bgVideo")(""); setVidDraft(""); setErr("");
                      }}>Remove background</Button>
                    </div>
                  </>
                )}
                {err && <p className="fx-err" role="alert">{err}</p>}
              </Card>

              <Card title="Scenes"
                hint="Drawn in CSS, so nothing downloads. Used whenever no image or video is set.">
                <div className="fx-scenes">
                  {Object.entries(SCENES).map(([k, s]) => (
                    <button key={k} className={`fx-scene${cfg.theme === k ? " on" : ""}`}
                      aria-pressed={cfg.theme === k} onClick={() => set("theme")(k)}>
                      <span className="fx-scenesky" style={{ background:s.sky }}>
                        {/* A gradient swatch would not say "this one moves". */}
                        {s.live && <SceneBlobs pal={s.pal} />}
                      </span>
                      <em>{s.name}{s.live ? " · live" : ""}</em>
                    </button>
                  ))}
                </div>
              </Card>
            </>
          )}

          {tab === "clock" && (
            <>
              <Card title="Timer style">
                <div className="fx-styles">
                  {STYLES.map((s) => (
                    <button key={s.id} className={`fx-style${cfg.timerStyle === s.id ? " on" : ""}`}
                      aria-pressed={cfg.timerStyle === s.id} onClick={() => set("timerStyle")(s.id)}>
                      <span className="fx-stylepreview">
                        {s.id === "digits" && <b>25:00</b>}
                        {s.id === "ring" && (
                          <svg viewBox="0 0 40 40" aria-hidden="true">
                            <circle cx="20" cy="20" r="15" className="track" />
                            <circle cx="20" cy="20" r="15" className="fill" pathLength="1"
                              strokeDasharray="0.68 0.32" transform="rotate(-90 20 20)" />
                          </svg>
                        )}
                        {s.id === "bar" && (
                          <span className="fx-stylebar"><i style={{ width:"68%" }} /></span>
                        )}
                      </span>
                      <em>{s.name}</em>
                    </button>
                  ))}
                </div>
              </Card>
              <Card>
                <Toggle on={cfg.showSeconds} set={set("showSeconds")} label="Show seconds"
                  hint="Off shows only minutes remaining, which is calmer to glance at." />
                <Toggle on={cfg.showStreak} set={set("showStreak")} label="Show streak counter" />
                <Toggle on={cfg.showQuote} set={set("showQuote")} label="Show a quote" />
              </Card>
            </>
          )}

          {tab === "timer" && (
            <>
              <Card>
                <Select label="Timer mode" value={cfg.mode} onChange={set("mode")}
                  options={[
                    { value:"pomodoro", label:"Pomodoro — fixed blocks and breaks" },
                    { value:"flowtime", label:"Flowtime — work until you stop" },
                  ]}
                  hint={cfg.mode === "pomodoro"
                    ? "Blocks of a set length, with a long break every few rounds."
                    : "Counts up while you work. Your break is sized from what you actually did."} />
              </Card>

              {cfg.mode === "pomodoro" ? (
                <Card title="Lengths">
                  <div className="fx-nums">
                    <NumField label="Focus" value={cfg.focusMin} onChange={set("focusMin")} lim={LIMITS.focusMin} />
                    <NumField label="Short break" value={cfg.breakMin} onChange={set("breakMin")} lim={LIMITS.breakMin} />
                    <NumField label="Long break" value={cfg.longMin} onChange={set("longMin")} lim={LIMITS.longMin} />
                    <NumField label="Long break every" value={cfg.longEvery} onChange={set("longEvery")}
                      lim={LIMITS.longEvery} suffix="blocks" />
                  </div>
                </Card>
              ) : (
                <Card title="Earned break">
                  <div className="fx-nums">
                    <NumField label="Break is one part in" value={cfg.flowDivisor}
                      onChange={set("flowDivisor")} lim={LIMITS.flowDivisor} suffix="" />
                  </div>
                  <p className="fx-hint">
                    Work for 50 minutes and you earn {Math.round(50/cfg.flowDivisor)}.
                    Always kept between 3 and 20.
                  </p>
                </Card>
              )}

              <Card>
                <Toggle on={cfg.autoNext} set={set("autoNext")} label="Start the next segment automatically"
                  hint="Runs the whole sequence without waiting for you." />
                <Toggle on={cfg.chime} set={set("chime")} label="Chime when a segment ends" />
                <Toggle on={cfg.notify} set={api.askNotify} label="Browser notification when a segment ends"
                  hint="Needs permission, which is asked for the moment you turn this on." />
                <Toggle on={cfg.showProgress} set={set("showProgress")} label="Show progress under the timer" />
              </Card>
            </>
          )}

          {tab === "sounds" && (
            <>
              <Card title="Ambience" hint="Generated live with the Web Audio API. Nothing downloads.">
                {LAYERS.map((l) => (
                  <div className="fx-slider" key={l.id}>
                    <span className={api.levels[l.id] > 0 ? "on" : ""}>{l.name}</span>
                    <input className="fx-range" type="range" min="0" max="100"
                      value={api.levels[l.id]} aria-label={`${l.name} volume`}
                      onChange={(e) => api.setLevel(l.id, +e.target.value)} />
                  </div>
                ))}
              </Card>

              <Card title="Station" hint="Long game-OST and lofi mixes, played through YouTube.">
                {api.station.failed ? (
                  <p className="fx-hint">
                    The YouTube player could not load — usually a blocker or an extension
                    cutting off the embed. Ambience above works regardless.
                  </p>
                ) : (
                  <>
                    <Field>
                      <Select label="Now playing" value={String(api.station.idx)}
                        onChange={(v) => api.station.load(+v, api.station.playing)}
                        options={api.stations.map((s, i) => ({ value:String(i), label:`${s.title} — ${s.by}` }))} />
                    </Field>
                    <div className="fx-slider">
                      <span>Volume</span>
                      <input className="fx-range" type="range" min="0" max="100"
                        value={api.station.vol} aria-label="Music volume"
                        onChange={(e) => api.station.setVolume(+e.target.value)} />
                    </div>
                    <Field label="Add your own">
                      <div className="fx-inline">
                        <TextInput value={api.urlDraft} placeholder="Paste a YouTube URL"
                          aria-label="Add a station by URL" onChange={api.setUrlDraft} />
                        <Button kind="primary" onClick={api.addStation}>Add</Button>
                      </div>
                      {api.urlError && <p className="fx-err" role="alert">{api.urlError}</p>}
                    </Field>
                    <Toggle on={cfg.duck} set={set("duck")} label="Lower the music during breaks" />
                  </>
                )}
              </Card>
            </>
          )}

          {tab === "tasks" && (
            <Card>
              <TextInput value={api.draft} placeholder="Add a task, press enter"
                aria-label="New task" onChange={api.setDraft} onKeyDown={api.addTask} />
              {api.tasks.length === 0 ? (
                <p className="fx-hint">Nothing here yet. Add the one thing you want finished today.</p>
              ) : (
                <ul className="fx-tasks">
                  {api.tasks.map((t, i) => (
                    <li key={t.id} className="fx-taskrow">
                      <button className={`fx-check${t.done ? " on" : ""}`}
                        aria-label={t.done ? `Mark "${t.text}" unfinished` : `Mark "${t.text}" finished`}
                        onClick={() => api.toggleTask(t.id)}>
                        <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
                      </button>
                      <button className={`fx-tasktext${t.done ? " done" : ""}${api.currentId === t.id && !t.done ? " on" : ""}`}
                        onClick={() => api.pickTask(t)}>{t.text}</button>
                      <button className="fx-iconbtn" aria-label={`Move "${t.text}" up`}
                        disabled={i === 0} onClick={() => api.moveTask(t.id, -1)}>
                        <svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>
                      </button>
                      <button className="fx-iconbtn" aria-label={`Move "${t.text}" down`}
                        disabled={i === api.tasks.length - 1} onClick={() => api.moveTask(t.id, 1)}>
                        <svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>
                      </button>
                      <button className="fx-iconbtn" aria-label={`Remove "${t.text}"`}
                        onClick={() => api.removeTask(t.id)}>
                        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {tab === "stats" && <StatsPanel log={api.log} streak={api.streak} />}

          {tab === "quotes" && (
            <Card>
              <Toggle on={cfg.showQuote} set={set("showQuote")} label="Show a quote under the clock" />
              <ul className="fx-quotes">{QUOTES.map((q) => <li key={q}>{q}</li>)}</ul>
            </Card>
          )}

          {tab === "keys" && (
            <Card>
              <ul className="fx-keys">
                {KEYS.map(([what, key]) => (
                  <li key={what}><span>{what}</span><kbd>{key}</kbd></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* A still of the meadow for the scene picker — same shapes, no physics. */
const SceneBlobs = ({ pal }) => (
  <svg viewBox="0 0 120 74" preserveAspectRatio="none" aria-hidden="true"
    style={{ display:"block", width:"100%", height:"100%" }}>
    <path d="M0 48 Q30 40 60 46 T120 42 L120 74 L0 74Z" fill={pal.far} />
    <path d="M0 56 Q34 48 68 55 T120 52 L120 74 L0 74Z" fill={pal.near} />
    <g stroke={pal.edge} strokeWidth="1.2">
      <ellipse cx="38" cy="48" rx="9" ry="8.4" fill={pal.blob} />
      <ellipse cx="72" cy="50" rx="7" ry="6.6" fill={pal.blobAlt} />
    </g>
    <g fill={pal.ink}>
      <circle cx="35" cy="46" r="1.3" /><circle cx="41" cy="46" r="1.3" />
      <circle cx="69.6" cy="48.4" r="1.1" /><circle cx="74.4" cy="48.4" r="1.1" />
    </g>
  </svg>
);

function StatsPanel({ log, streak }) {
  const days = lastDays(14);
  const rows = days.map((d) => ({ ...d, ...(log[d.key] || { sessions:0, minutes:0 }) }));
  const peak = Math.max(30, ...rows.map((r) => r.minutes));
  const k = today();
  const stat = log[k] || { sessions:0, minutes:0 };
  const total = rows.reduce((a, r) => a + r.minutes, 0);
  const allTime = Object.values(log).reduce((a, d) => a + (d.minutes || 0), 0);

  return (
    <>
      <Card>
        <div className="fx-stats">
          <div><b>{stat.sessions}</b><small>Blocks today</small></div>
          <div><b>{stat.minutes}</b><small>Minutes today</small></div>
          <div><b>{streak}</b><small>Day streak</small></div>
          <div><b>{allTime}</b><small>Minutes all time</small></div>
        </div>
      </Card>
      <Card title="Last two weeks" hint={`${total} minutes across the fortnight.`}>
        <div className="fx-chart" role="img"
          aria-label={`Focus minutes per day: ${rows.map((r) => `${r.label} ${r.minutes}`).join(", ")}`}>
          {rows.map((r) => (
            <div className="fx-bar" key={r.key} title={`${r.key} — ${r.minutes} min`}>
              <span style={{ height:`${Math.round((r.minutes/peak)*100)}%` }}
                className={r.key === k ? "on" : ""} />
              <small className={r.key === k ? "on" : ""}>{r.label}</small>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
