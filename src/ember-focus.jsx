import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { CSS } from "./styles.js";
import Settings from "./settings.jsx";
import { useAudio, useStation } from "./audio.js";
import {
  STORE_KEY, DEFAULTS, SCENES, QUOTES, STATIONS,
  store, clamp, dayKey, today, fmt, parseVideoId,
} from "./lib.js";

/* ────────────────────────────────────────────────────────────
   Focus — a Pomodoro and Flowtime timer.
   Synthesised ambience, a hidden-video music station, and
   whatever background you care to bring.
   ──────────────────────────────────────────────────────────── */

const IMG_KEY = STORE_KEY + ":img";

const I = {
  reset: <><path d="M4 5v5h5" /><path d="M4.6 13a7.6 7.6 0 1 0 1.9-6.2L4 10" /></>,
  skip:  <><path d="M6 5.5l9 6.5-9 6.5z" /><path d="M18 5.5v13" /></>,
  music: <><circle cx="7" cy="17.5" r="2.8" /><path d="M9.8 17.5V5l10-2v11" /><circle cx="17" cy="15.5" r="2.8" /></>,
  wave:  <><path d="M4 9v6M8 6v12M12 10v4M16 5v14M20 9v6" /></>,
  list:  <><path d="M9 6h11M9 12h11M9 18h7" /><path d="M4 6l1.2 1.2L7.5 4.8" /><path d="M4 12l1.2 1.2L7.5 10.8" /></>,
  /* A toothed cog rather than a circle with spokes, which reads as a sun. */
  gear:  <><circle cx="12" cy="12" r="3.2" /><path d="M19.1 14.2a1.6 1.6 0 0 0 .32 1.77l.06.06a1.94 1.94 0 1 1-2.74 2.74l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.46v.17a1.94 1.94 0 1 1-3.88 0v-.09a1.6 1.6 0 0 0-1.03-1.45 1.6 1.6 0 0 0-1.77.32l-.06.06a1.94 1.94 0 1 1-2.74-2.74l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.46-.97H3.2a1.94 1.94 0 1 1 0-3.88h.09a1.6 1.6 0 0 0 1.45-1.03 1.6 1.6 0 0 0-.32-1.77l-.06-.06A1.94 1.94 0 1 1 7.1 4.66l.6.06a1.6 1.6 0 0 0 1.77.32h.08a1.6 1.6 0 0 0 .97-1.46V3.2a1.94 1.94 0 1 1 3.88 0v.09a1.6 1.6 0 0 0 .97 1.46 1.6 1.6 0 0 0 1.77-.32l.06-.06a1.94 1.94 0 1 1 2.74 2.74l-.06.06a1.6 1.6 0 0 0-.32 1.77v.08a1.6 1.6 0 0 0 1.46.97h.17a1.94 1.94 0 1 1 0 3.88h-.09a1.6 1.6 0 0 0-1.46.97z" /></>,
  full:  <><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></>,
  exit:  <><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></>,
  pencil:<><path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4 16z" /></>,
};

const Icon = ({ d }) => <svg viewBox="0 0 24 24" aria-hidden="true">{d}</svg>;

export default function Focus() {
  const [cfg, setCfg] = useState(DEFAULTS);
  const [tasks, setTasks] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [log, setLog] = useState({});
  const [levels, setLevels] = useState({ rain:0, ocean:0, fire:0, drone:0 });
  const [custom, setCustom] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [phase, setPhase] = useState("focus");     // focus | break | long
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(DEFAULTS.focusMin*60000);
  const [elapsed, setElapsed] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [now, setNow] = useState(Date.now());

  const [settingsOn, setSettingsOn] = useState(false);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(null);     // inline task text, or null
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState("");
  const [full, setFull] = useState(false);
  const [bgData, setBgData] = useState("");

  const endAt = useRef(0), runFrom = useRef(0);
  const editRef = useRef(null);
  const { setLevel: setAudioLevel, chime, blip } = useAudio();
  const allStations = useMemo(() => [...STATIONS, ...custom], [custom]);
  const station = useStation(allStations);

  const th = SCENES[cfg.theme] || SCENES.midnight;
  const vars = {
    "--sky": th.sky, "--paper": th.paper, "--muted": th.muted,
    "--accent": th.accent, "--onAccent": "#0B0C14",
    color: th.paper,
  };

  const mode = cfg.mode;
  const countUp = mode === "flowtime" && phase === "focus";

  /* ── load / save ─────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await store.get(STORE_KEY);
        const d = r ? JSON.parse(r.value) : null;
        if (alive && d) {
          if (d.cfg) { setCfg({ ...DEFAULTS, ...d.cfg }); setRemaining((d.cfg.focusMin ?? 25)*60000); }
          if (d.tasks) setTasks(d.tasks);
          if (d.log) setLog(d.log);
          if (d.custom) setCustom(d.custom);
          if (d.currentId !== undefined) setCurrentId(d.currentId);

          /* Resume a segment that was running when the page went away. The
             deadline is wall-clock, so time that passed while the tab was
             closed still counts against it. */
          const t = d.timer;
          if (t) {
            if (t.phase) setPhase(t.phase);
            setDoneCount(t.doneCount || 0);
            const up = (d.cfg?.mode ?? DEFAULTS.mode) === "flowtime" && t.phase === "focus";
            if (up) {
              const el = t.running ? Date.now() - t.runFrom : (t.elapsed || 0);
              runFrom.current = Date.now() - el;
              setElapsed(el); setRunning(!!t.running);
            } else if (t.running) {
              const left = t.endAt - Date.now();
              /* Expired while away: land on zero, paused, rather than
                 chiming for something that ended hours ago. */
              if (left > 0) { endAt.current = t.endAt; setRemaining(left); setRunning(true); }
              else setRemaining(0);
            } else if (t.remaining > 0) setRemaining(t.remaining);
          }
        }
      } catch { /* nothing saved yet */ }
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  /* Uploaded images live under their own key: they are far larger than the
     rest of the settings, and a quota failure there must not take
     everything else down with it. */
  useEffect(() => {
    store.get(IMG_KEY).then((r) => r && setBgData(r.value)).catch(() => {});
  }, []);

  const saveImage = useCallback(async (val) => {
    try {
      await store.set(IMG_KEY, val || "");
      setBgData(val || "");
      setCfg((c) => ({ ...c, bgImage: val ? "on" : "" }));
      return true;
    } catch { return false; }
  }, []);

  const snap = useRef({ elapsed:0, remaining:0 });
  snap.current = { elapsed, remaining };

  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => {
      const timer = {
        phase, running, doneCount,
        elapsed: snap.current.elapsed, remaining: snap.current.remaining,
        endAt: endAt.current, runFrom: runFrom.current,
      };
      store.set(STORE_KEY, JSON.stringify({ cfg, tasks, log, currentId, custom, timer }))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(id);
  }, [cfg, tasks, log, currentId, custom, loaded, phase, running, doneCount]);

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  /* ── timer ───────────────────────────────────────────── */
  const phaseLen = useCallback((p) => {
    if (p === "focus") return cfg.focusMin*60000;
    if (p === "break") return cfg.breakMin*60000;
    return cfg.longMin*60000;
  }, [cfg]);

  useEffect(() => {
    if (!running && !countUp) setRemaining(phaseLen(phase));
  }, [cfg.focusMin, cfg.breakMin, cfg.longMin, phase, running, countUp, phaseLen]);

  useEffect(() => {
    if (cfg.duck) station.duck(phase !== "focus" && running);
    else station.duck(false);
  }, [phase, running, cfg.duck]); // eslint-disable-line

  const record = useCallback((mins) => {
    if (mins < 1) return;
    const k = today();
    setLog((L) => ({ ...L, [k]: {
      sessions:(L[k]?.sessions||0)+1, minutes:(L[k]?.minutes||0)+Math.round(mins) } }));
  }, []);

  const notify = useCallback((body) => {
    if (!cfg.notify || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    try { new Notification("Focus", { body, tag:"fx" }); } catch { /* blocked */ }
  }, [cfg.notify]);

  const advance = useCallback(() => {
    if (cfg.chime) chime(phase !== "focus");
    notify(phase === "focus" ? "Segment finished — take a break." : "Break over — back to it.");

    if (mode === "flowtime") {
      if (phase === "focus") {
        const mins = elapsed/60000;
        record(mins);
        const br = clamp(Math.round(mins/cfg.flowDivisor), 3, 20);
        setPhase("break"); setRemaining(br*60000); setElapsed(0);
        if (cfg.autoNext) { endAt.current = Date.now()+br*60000; setRunning(true); }
        else setRunning(false);
      } else {
        setPhase("focus"); setElapsed(0); setRunning(false);
      }
      return;
    }

    if (phase === "focus") {
      record(cfg.focusMin);
      const n = doneCount+1; setDoneCount(n);
      const next = n % cfg.longEvery === 0 ? "long" : "break";
      setPhase(next);
      const len = phaseLen(next);
      setRemaining(len);
      if (cfg.autoNext) { endAt.current = Date.now()+len; setRunning(true); } else setRunning(false);
    } else {
      setPhase("focus"); setRemaining(cfg.focusMin*60000);
      if (cfg.autoNext) { endAt.current = Date.now()+cfg.focusMin*60000; setRunning(true); }
      else setRunning(false);
    }
  }, [cfg, chime, notify, doneCount, mode, phase, phaseLen, record, elapsed]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (countUp) { setElapsed(Date.now()-runFrom.current); return; }
      const left = endAt.current - Date.now();
      if (left <= 0) { setRemaining(0); advance(); } else setRemaining(left);
    }, 200);
    return () => clearInterval(id);
  }, [running, countUp, advance]);

  const toggle = useCallback(() => {
    setRunning((wasRunning) => {
      if (wasRunning) { if (countUp) runFrom.current = Date.now()-elapsed; return false; }
      if (countUp) runFrom.current = Date.now()-elapsed;
      else endAt.current = Date.now()+remaining;
      return true;
    });
  }, [countUp, elapsed, remaining]);

  const reset = useCallback(() => {
    setRunning(false);
    if (countUp) setElapsed(0); else setRemaining(phaseLen(phase));
  }, [countUp, phase, phaseLen]);

  const skip = useCallback(() => { blip(true); setRunning(false); advance(); }, [advance, blip]);

  const goPhase = useCallback((p) => {
    setRunning(false); setPhase(p); setElapsed(0); setRemaining(phaseLen(p));
  }, [phaseLen]);

  const goFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  /* Keyboard. Skipped entirely while a field has focus or the sheet is open,
     so typing a task never trips a shortcut. */
  useEffect(() => {
    const h = (e) => {
      if (settingsOn || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target;
      const tag = (el.tagName||"").toLowerCase();
      if (["input","textarea","select"].includes(tag) || el.isContentEditable) return;
      const k = e.key.toLowerCase();
      if (e.code === "Space") { e.preventDefault(); toggle(); return; }
      if (k === "r") { e.preventDefault(); reset(); return; }
      if (k === "s") { e.preventDefault(); skip(); return; }
      if (k === "f") { e.preventDefault(); goFull(); return; }
      if (k === ",") { e.preventDefault(); setSettingsOn(true); return; }
      if (k === "1") { e.preventDefault(); goPhase("focus"); return; }
      if (k === "2") { e.preventDefault(); goPhase("break"); return; }
      if (k === "3" && mode === "pomodoro") { e.preventDefault(); goPhase("long"); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [settingsOn, toggle, reset, skip, goFull, goPhase, mode]);

  const clock = fmt(countUp ? elapsed : remaining, cfg.showSeconds);

  useEffect(() => {
    if (!running) { document.title = "Focus"; return; }
    document.title = `${clock} · ${phase === "focus" ? "Focus" : "Break"}`;
    return () => { document.title = "Focus"; };
  }, [running, clock, phase]);

  useEffect(() => {
    const h = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  useEffect(() => { if (editing !== null) editRef.current?.focus(); }, [editing]);

  /* ── derived ─────────────────────────────────────────── */
  const current = tasks.find((t) => t.id === currentId && !t.done);
  const streak = useMemo(() => {
    let n = 0; const d = new Date();
    for (;;) {
      const k = dayKey(d);
      if ((log[k]?.sessions||0) > 0) { n++; d.setDate(d.getDate()-1); }
      else if (n === 0 && k === today()) { d.setDate(d.getDate()-1); }
      else break;
      if (n > 400) break;
    }
    return n;
  }, [log]);

  const dayk = dayKey(new Date(now));
  const quote = useMemo(() => {
    let h = 0;
    for (let i = 0; i < dayk.length; i++) h = (h*31 + dayk.charCodeAt(i)) | 0;
    return QUOTES[Math.abs(h) % QUOTES.length];
  }, [dayk]);

  const total = phaseLen(phase);
  const progress = countUp
    ? ((elapsed/60000) % 60) / 60
    : total > 0 ? 1 - remaining/total : 0;
  const pct = clamp(progress, 0, 1);

  /* ── tasks ───────────────────────────────────────────── */
  const addTask = (e) => {
    if (e.key !== "Enter" || !draft.trim()) return;
    const t = { id: Date.now(), text: draft.trim(), done: false };
    setTasks((L) => [...L, t]);
    if (!current) setCurrentId(t.id);
    setDraft("");
  };
  const moveTask = (id, dir) => setTasks((L) => {
    const i = L.findIndex((t) => t.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= L.length) return L;
    const n = [...L]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const toggleTask = (id) => {
    const t = tasks.find((x) => x.id === id);
    blip(!t?.done);
    setTasks((L) => L.map((x) => x.id === id ? { ...x, done: !x.done } : x));
    if (currentId === id) setCurrentId(null);
  };
  const removeTask = (id) => {
    setTasks((L) => L.filter((x) => x.id !== id));
    if (currentId === id) setCurrentId(null);
  };

  /* Inline edit on the hero line: renames the current task, or creates one
     if there is none, so the common case never needs the settings sheet. */
  const commitEdit = () => {
    const text = (editing || "").trim();
    setEditing(null);
    if (!text) return;
    if (current) setTasks((L) => L.map((x) => x.id === current.id ? { ...x, text } : x));
    else {
      const t = { id: Date.now(), text, done: false };
      setTasks((L) => [...L, t]); setCurrentId(t.id);
    }
  };

  /* ── stations ────────────────────────────────────────── */
  const selectAfterAdd = useRef(false);
  useEffect(() => {
    if (!selectAfterAdd.current) return;
    selectAfterAdd.current = false;
    station.load(allStations.length - 1, station.playing);
  }, [allStations.length]); // eslint-disable-line

  const addStation = () => {
    const id = parseVideoId(urlDraft);
    if (!id) { setUrlError("That does not look like a YouTube link."); return; }
    if (allStations.some((s) => s.id === id)) { setUrlError("Already in the list."); return; }
    selectAfterAdd.current = true;
    setCustom((L) => [...L, { id, title:"Your station", by:"added by you" }]);
    setUrlDraft(""); setUrlError("");
  };

  const set = useCallback((k) => (v) => setCfg((c) => ({ ...c, [k]: v })), []);

  const askNotify = useCallback((want) => {
    if (!want || typeof Notification === "undefined") { setCfg((c) => ({ ...c, notify:false })); return; }
    if (Notification.permission === "granted") { setCfg((c) => ({ ...c, notify:true })); return; }
    if (Notification.permission === "denied") return;
    Notification.requestPermission().then((p) => setCfg((c) => ({ ...c, notify: p === "granted" })));
  }, []);

  const setLevel = (id, v) => { setLevels((L) => ({ ...L, [id]: v })); setAudioLevel(id, v/100); };

  const phases = mode === "pomodoro"
    ? [["focus","Focus"], ["break","Short Break"], ["long","Long Break"]]
    : [["focus","Flow"], ["break","Break"]];

  const anySound = Object.values(levels).some((v) => v > 0);
  const bg = cfg.bgImage === "on" ? bgData : cfg.bgImage;
  const showBar = cfg.timerStyle !== "ring" && (cfg.timerStyle === "bar" || cfg.showProgress);

  return (
    <div className="fx" style={vars}>
      <style>{CSS}</style>

      <div className="fx-sky" />
      {bg && <div className="fx-img" style={{ backgroundImage:`url("${bg}")` }} />}
      {cfg.bgVideo && (
        <div className="fx-video">
          <iframe title="Background video" allow="autoplay" tabIndex={-1}
            src={`https://www.youtube-nocookie.com/embed/${cfg.bgVideo}?autoplay=1&mute=1&loop=1&playlist=${cfg.bgVideo}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&playsinline=1`} />
        </div>
      )}
      {(bg || cfg.bgVideo) && <div className="fx-tint" style={{ opacity: cfg.bgOverlay/100 }} />}
      <div className="fx-dim" />
      <div className="fx-yt"><div id="em-yt-host" /></div>

      <div className="fx-stage">
        <header className="fx-top">
          <div className="fx-brand">Focus</div>
          <div>
            {cfg.showQuote && <p className="fx-quote">“{quote}”</p>}
            {cfg.showStreak && (
              <p className="fx-streak">{streak > 0 ? `${streak} day streak` : "no streak yet"}</p>
            )}
          </div>
        </header>

        <main className="fx-mid">
          <div className="fx-task">
            {editing !== null ? (
              <input ref={editRef} className="fx-taskinput" value={editing}
                aria-label="Task name" placeholder="What are you working on?"
                size={Math.max(18, editing.length + 2)}
                onChange={(e) => setEditing(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") setEditing(null);
                }} />
            ) : (
              <>
                {current ? <b>{current.text}</b> : <span>What are you working on?</span>}
                <button className="fx-taskedit" aria-label={current ? "Rename task" : "Set a task"}
                  onClick={() => setEditing(current?.text || "")}><Icon d={I.pencil} /></button>
              </>
            )}
          </div>

          <div className="fx-pills" role="group" aria-label="Segment">
            {phases.map(([p, label]) => (
              <button key={p} className="fx-pill" aria-pressed={phase === p}
                onClick={() => goPhase(p)}>{label}</button>
            ))}
          </div>

          {mode === "pomodoro" && (
            <div className="fx-pips"
              aria-label={`${doneCount % cfg.longEvery} of ${cfg.longEvery} blocks before the long break`}>
              {Array.from({ length: cfg.longEvery }).map((_, i) => (
                <span key={i} className={`fx-pip${i < (doneCount % cfg.longEvery) ? " on" : ""}`} />
              ))}
            </div>
          )}

          <div className="fx-clockwrap">
            {cfg.timerStyle === "ring" && (
              <svg className="fx-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <circle cx="50" cy="50" r="46" className="track" vectorEffect="non-scaling-stroke"
                  strokeWidth="2.4" />
                <circle cx="50" cy="50" r="46" className="fill" pathLength="1" strokeWidth="3"
                  vectorEffect="non-scaling-stroke" transform="rotate(-90 50 50)"
                  strokeDasharray={`${pct} ${1-pct}`} />
              </svg>
            )}
            <div className={`fx-time${cfg.timerStyle === "ring" ? " sm" : ""}`}>{clock}</div>
          </div>

          {showBar && (
            <div className="fx-progress" role="img"
              aria-label={`${Math.round(pct*100)} percent through this segment`}>
              <i style={{ width:`${Math.round(pct*100)}%` }} />
            </div>
          )}

          <div className="fx-controls">
            <button className="fx-go" onClick={toggle}>
              {running ? "Pause" : (countUp && elapsed > 0) ? "Resume" : "Start"}
            </button>
            <button className="fx-round" onClick={reset} aria-label="Reset segment">
              <Icon d={I.reset} />
            </button>
            <button className="fx-round" onClick={skip}
              aria-label={countUp ? "Take my break" : "Skip segment"}
              disabled={countUp && elapsed < 60000}>
              <Icon d={I.skip} />
            </button>
          </div>
        </main>

        <footer className="fx-bottom">
          <div className="fx-cluster">
            <button className="fx-tool" aria-label="Play or pause the station"
              onClick={() => { blip(false); station.toggle(); }}>
              <Icon d={I.music} />{station.playing && <i />}
            </button>
            <button className="fx-tool" aria-label="Ambience"
              onClick={() => setSettingsOn("sounds")}>
              <Icon d={I.wave} />{anySound && <i />}
            </button>
          </div>
          <div className="fx-cluster">
            <button className="fx-tool fx-hidesm" aria-label="Tasks"
              onClick={() => setSettingsOn("tasks")}>
              <Icon d={I.list} />{tasks.some((t) => !t.done) && <i />}
            </button>
            <button className="fx-tool" aria-label="Settings"
              onClick={() => setSettingsOn(true)}><Icon d={I.gear} /></button>
            <button className="fx-tool fx-hidesm" aria-label={full ? "Exit full screen" : "Full screen"}
              onClick={goFull}><Icon d={full ? I.exit : I.full} /></button>
          </div>
        </footer>
      </div>

      <Settings open={!!settingsOn} onClose={() => setSettingsOn(false)}
        cfg={cfg} set={set}
        startTab={typeof settingsOn === "string" ? settingsOn : null}
        api={{
          levels, setLevel, station, stations: allStations,
          urlDraft, setUrlDraft, urlError, addStation,
          tasks, draft, setDraft, addTask, moveTask, toggleTask, removeTask,
          currentId, pickTask: (t) => setCurrentId(t.done ? null : t.id),
          log, streak, askNotify, saveImage,
        }} />
    </div>
  );
}
