import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ────────────────────────────────────────────────────────────
   Ember — a focus dashboard where the dial is the setting.
   Pomodoro · Countdown · Stopwatch · Flowtime
   Synthesised ambience + a hidden-video game-OST player.
   ──────────────────────────────────────────────────────────── */

/* ── themes ──────────────────────────────────────────────── */
const THEMES = {
  ember:   { name: "Ember",   bg:"#1C2130", bg2:"#141824", surface:"#2F3648", paper:"#E7E3DA", muted:"#8C93A6", accent:"#F0A03C", rest:"#8FD3B6" },
  henesys: { name: "Henesys", bg:"#2B1E21", bg2:"#1D1416", surface:"#3D2C2F", paper:"#F3E7DE", muted:"#A8908C", accent:"#FF9E7D", rest:"#FFD79B" },
  ellinia: { name: "Ellinia", bg:"#16211F", bg2:"#0E1717", surface:"#243330", paper:"#E2EDE4", muted:"#84A096", accent:"#7FD4C1", rest:"#DCCB86" },
  varrock: { name: "Varrock", bg:"#1A1830", bg2:"#111024", surface:"#292545", paper:"#E4E1F2", muted:"#8F8AB4", accent:"#A98BFA", rest:"#7FD4C1" },
  vellum:  { name: "Vellum",  bg:"#E9E3D5", bg2:"#DDD5C3", surface:"#F3EEE3", paper:"#2C332E", muted:"#7C8279", accent:"#B0552F", rest:"#3F6B5A" },
};

/* ── curated stations (verified, long game-OST mixes) ────── */
const STATIONS = [
  { id:"ueRHznBxN8M", title:"MapleStory Nostalgia",        by:"1 hr · early GMS tunes" },
  { id:"y2M18LXBXPs", title:"MapleStory for Studying",     by:"2 hr · hand-picked" },
  { id:"3DEkF2uvPoc", title:"MapleStory 2006 GMS",         by:"2 hr · ripped from v0.22" },
  { id:"c_X2JARomKM", title:"More MapleStory for Studying",by:"2 hr" },
  { id:"9k9p_ykZiSU", title:"MapleStory 2",                by:"1 hr" },
  { id:"AJu_6mtkTe0", title:"OSRS Focus Mix",              by:"1 hr · Garden, Doorways, Forest" },
  { id:"KBZnLqeYhgc", title:"Relaxing OSRS",               by:"3 hr · study & sleep" },
  { id:"33aluIL_K3U", title:"Classic OSRS",                by:"2 hr" },
  { id:"5Vzc-KIawBI", title:"OSRS Lofi",                   by:"1 hr · chill remixes" },
  { id:"84dPx9sP2Mg", title:"OSRSBeatz Lofi",              by:"lofi hip hop mix" },
  { id:"wv-7hILtUI4", title:"RuneScape OST Classics",      by:"full album" },
];

const CSS = `
.em-root{
  --mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;
  --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  position:relative; color:var(--paper); font-family:var(--sans);
  min-height:100%; width:100%; padding:26px 24px 44px; box-sizing:border-box;
  -webkit-font-smoothing:antialiased; overflow:hidden;
  transition:background .8s ease, color .8s ease;
}
.em-root *{box-sizing:border-box;}
.em-wash{position:absolute; inset:-30%; pointer-events:none; opacity:.55; filter:blur(70px);
  background:
    radial-gradient(38% 38% at 22% 26%, var(--accent) 0%, transparent 62%),
    radial-gradient(34% 34% at 78% 72%, var(--rest) 0%, transparent 60%);
  animation:em-drift 34s ease-in-out infinite alternate;}
@keyframes em-drift{from{transform:translate3d(-3%,-2%,0) scale(1);}to{transform:translate3d(4%,3%,0) scale(1.14);}}
.em-grain{position:absolute; inset:0; pointer-events:none; opacity:.16; mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='0.5'/></svg>");}
@media (prefers-reduced-motion:reduce){ .em-wash{animation:none;} }
.em-layer{position:relative; z-index:1;}

.em-grid{display:grid; grid-template-columns:1fr 322px; gap:36px; max-width:1090px; margin:0 auto;}
@media (max-width:860px){ .em-grid{grid-template-columns:1fr; gap:28px;} .em-root{padding:18px 15px 36px;} }

.em-eyebrow{font-family:var(--mono); font-size:10px; letter-spacing:.24em; text-transform:uppercase; color:var(--muted);}
.em-top{display:flex; justify-content:space-between; align-items:center; gap:14px; max-width:1090px; margin:0 auto 24px; flex-wrap:wrap;}
.em-clock{font-family:var(--mono); font-size:13px; letter-spacing:.14em; opacity:.8;}
.em-swatches{display:flex; gap:7px;}
.em-sw{width:15px; height:15px; border-radius:50%; border:1px solid rgba(128,128,128,.35); cursor:pointer; padding:0;}
.em-sw[aria-pressed="true"]{box-shadow:0 0 0 2px var(--bg), 0 0 0 3px var(--accent);}
.em-sw:focus-visible{outline:2px solid var(--accent); outline-offset:3px;}

.em-card{background:var(--glass); border:1px solid var(--line); border-radius:14px; padding:18px 18px 16px; margin-bottom:16px;
  backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);}
.em-card h3{font-family:var(--mono); font-size:10px; letter-spacing:.24em; text-transform:uppercase; color:var(--muted); margin:0 0 14px; font-weight:400;}

.em-stage{display:flex; flex-direction:column; align-items:center;}
.em-dialwrap{position:relative; width:100%; max-width:392px; touch-action:none;}
.em-dial{display:block; width:100%; height:auto; cursor:grab;}
.em-dial.locked{cursor:default;} .em-dial.dragging{cursor:grabbing;}
.em-readout{position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none;}
.em-time{font-family:var(--mono); font-variant-numeric:tabular-nums; font-size:64px; font-weight:200; letter-spacing:-.045em; line-height:1;}
@media (max-width:860px){ .em-time{font-size:52px;} }
.em-phase{margin-top:13px; font-family:var(--mono); font-size:10px; letter-spacing:.3em; text-transform:uppercase; color:var(--muted);}
.em-hint{margin-top:7px; font-size:11px; color:var(--muted); opacity:.75; max-width:190px; text-align:center; line-height:1.5;}

.em-task{margin-top:20px; text-align:center; min-height:26px;}
.em-task b{font-weight:500; font-size:17px; letter-spacing:-.01em;}
.em-task span{color:var(--muted); font-size:14px;}

.em-controls{display:flex; gap:10px; margin-top:20px; align-items:center; flex-wrap:wrap; justify-content:center;}
.em-btn{font-family:var(--mono); font-size:11px; letter-spacing:.16em; text-transform:uppercase;
  background:transparent; color:var(--paper); border:1px solid var(--line2); border-radius:999px;
  padding:11px 17px; cursor:pointer; transition:border-color .16s, background .16s, transform .1s;}
.em-btn:hover{border-color:var(--accent);}
.em-btn:active{transform:translateY(1px);}
.em-btn:focus-visible{outline:2px solid var(--accent); outline-offset:2px;}
.em-btn.primary{background:var(--accent); border-color:var(--accent); color:var(--bg2); font-weight:700; padding:11px 32px;}
.em-btn.primary.rest{background:var(--rest); border-color:var(--rest);}
.em-btn[disabled]{opacity:.35; cursor:not-allowed;}

.em-modes{display:flex; gap:2px; margin-bottom:24px; border:1px solid var(--line); border-radius:999px; padding:3px; background:var(--glass);}
.em-mode{font-family:var(--mono); font-size:10px; letter-spacing:.18em; text-transform:uppercase; background:transparent;
  border:0; color:var(--muted); padding:8px 15px; cursor:pointer; border-radius:999px;}
.em-mode[aria-pressed="true"]{background:var(--surface); color:var(--paper);}
.em-mode:focus-visible{outline:2px solid var(--accent); outline-offset:1px;}

.em-cycle{display:flex; align-items:center; gap:13px; margin-top:24px; flex-wrap:wrap; justify-content:center;}
.em-pips{display:flex; gap:7px; align-items:center;}
.em-pip{width:9px; height:9px; border-radius:50%; border:1px solid var(--line2); background:transparent;}
.em-pip.on{background:var(--accent); border-color:var(--accent); box-shadow:0 0 10px var(--accent);}
.em-pip.long{width:11px; height:11px;}
.em-pip.long.on{background:var(--rest); border-color:var(--rest); box-shadow:0 0 10px var(--rest);}

.em-step{display:flex; align-items:center; gap:7px; border:1px solid var(--line); border-radius:999px; padding:5px 9px; background:var(--glass);}
.em-step label{font-family:var(--mono); font-size:9px; letter-spacing:.16em; text-transform:uppercase; color:var(--muted);}
.em-step b{font-family:var(--mono); font-size:13px; font-weight:500; min-width:30px; text-align:center; font-variant-numeric:tabular-nums;}
.em-nudge{background:transparent; border:0; color:var(--muted); cursor:pointer; font-size:15px; line-height:1; padding:2px 5px; border-radius:3px;}
.em-nudge:hover{color:var(--paper);}
.em-nudge:focus-visible{outline:2px solid var(--accent); outline-offset:1px;}

.em-input{width:100%; background:transparent; border:0; border-bottom:1px solid var(--line2); color:var(--paper);
  font-family:var(--sans); font-size:14px; padding:9px 0; outline:none;}
.em-input::placeholder{color:var(--muted); opacity:.7;}
.em-input:focus{border-bottom-color:var(--accent);}

.em-tasks{list-style:none; margin:10px 0 0; padding:0;}
.em-taskrow{display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--line);}
.em-check{width:15px; height:15px; flex:0 0 auto; border:1px solid var(--line2); border-radius:50%; background:transparent; cursor:pointer; padding:0;}
.em-check:hover{border-color:var(--accent);}
.em-check.done{background:var(--rest); border-color:var(--rest);}
.em-check:focus-visible{outline:2px solid var(--accent); outline-offset:2px;}
.em-tasktext{flex:1; text-align:left; background:transparent; border:0; color:var(--paper); font-family:var(--sans);
  font-size:14px; cursor:pointer; padding:0; line-height:1.4;}
.em-tasktext:hover{color:var(--accent);}
.em-tasktext.done{color:var(--muted); text-decoration:line-through;}
.em-tasktext.current{color:var(--accent);}
.em-tasktext:focus-visible{outline:2px solid var(--accent); outline-offset:2px;}
.em-x{background:transparent; border:0; color:var(--muted); opacity:0; cursor:pointer; font-size:15px; padding:2px 4px;}
.em-taskrow:hover .em-x, .em-x:focus-visible{opacity:.85;}
.em-note{color:var(--muted); font-size:12px; line-height:1.6; margin:10px 0 0;}

.em-sound{display:flex; align-items:center; gap:12px; margin-bottom:12px;}
.em-sound span{font-size:13px; width:76px; flex:0 0 auto; color:var(--muted);}
.em-sound span.live{color:var(--paper);}
.em-slider{flex:1; -webkit-appearance:none; appearance:none; height:2px; background:var(--line2); border-radius:2px; outline:none;}
.em-slider::-webkit-slider-thumb{-webkit-appearance:none; width:13px; height:13px; border-radius:50%; background:var(--paper); cursor:pointer;}
.em-slider::-moz-range-thumb{width:13px; height:13px; border:0; border-radius:50%; background:var(--paper); cursor:pointer;}
.em-slider:focus-visible{outline:2px solid var(--accent); outline-offset:4px;}

.em-player{display:flex; align-items:center; gap:13px;}
.em-disc{width:52px; height:52px; border-radius:50%; flex:0 0 auto; position:relative;
  background:conic-gradient(from 0deg, var(--surface), var(--accent) 22%, var(--surface) 46%, var(--rest) 70%, var(--surface));
  box-shadow:inset 0 0 0 1px var(--line2);}
.em-disc::after{content:""; position:absolute; inset:41%; border-radius:50%; background:var(--bg); box-shadow:0 0 0 1px var(--line2);}
.em-disc.spin{animation:em-spin 7s linear infinite;}
@keyframes em-spin{to{transform:rotate(360deg);}}
@media (prefers-reduced-motion:reduce){ .em-disc.spin{animation-duration:40s;} }
.em-nowtitle{font-size:13.5px; line-height:1.35; margin-bottom:2px;}
.em-nowby{font-family:var(--mono); font-size:10px; letter-spacing:.1em; color:var(--muted);}
.em-tr{display:flex; gap:6px; margin-top:11px;}
.em-tbtn{flex:0 0 auto; width:34px; height:34px; border-radius:50%; border:1px solid var(--line2); background:transparent;
  color:var(--paper); cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center;}
.em-tbtn:hover{border-color:var(--accent);}
.em-tbtn:focus-visible{outline:2px solid var(--accent); outline-offset:2px;}
.em-tbtn.play{background:var(--accent); border-color:var(--accent); color:var(--bg2);}
.em-select{width:100%; margin-top:11px; background:var(--surface); color:var(--paper); border:1px solid var(--line2);
  border-radius:8px; padding:8px 9px; font-family:var(--sans); font-size:12.5px; outline:none;}
.em-select:focus{border-color:var(--accent);}
.em-yt{position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; left:-9999px;}

.em-stats{display:flex; gap:24px;}
.em-stat b{display:block; font-family:var(--mono); font-size:27px; font-weight:200; font-variant-numeric:tabular-nums; letter-spacing:-.03em;}
.em-stat small{font-family:var(--mono); font-size:9px; letter-spacing:.18em; text-transform:uppercase; color:var(--muted);}

.em-pref{display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:13px; color:var(--muted); margin-bottom:11px;}
.em-toggle{width:34px; height:18px; border-radius:9px; border:1px solid var(--line2); background:transparent; cursor:pointer; padding:2px; flex:0 0 auto;}
.em-toggle:focus-visible{outline:2px solid var(--accent); outline-offset:2px;}
.em-knob{display:block; width:12px; height:12px; border-radius:50%; background:var(--muted); transition:transform .16s, background .16s;}
.em-toggle[aria-pressed="true"]{border-color:var(--accent);}
.em-toggle[aria-pressed="true"] .em-knob{transform:translateX(16px); background:var(--accent);}

@keyframes em-breathe{0%,100%{opacity:.5;}50%{opacity:1;}}
.em-glow{animation:em-breathe 5s ease-in-out infinite;}
@media (prefers-reduced-motion:reduce){ .em-glow{animation:none; opacity:.8;} }
`;

/* ── constants ───────────────────────────────────────────── */
const SWEEP = 300, START = -150;
const LIMITS = { focus:[5,90], break:[1,30], long:[5,45], countdown:[1,120] };
const STORE_KEY = "ember:v2";
const DEFAULTS = {
  focusMin:25, breakMin:5, longMin:15, longEvery:4, countdownMin:10,
  autoBreak:true, autoFocus:false, chime:true, duck:true, theme:"ember",
};
const LAYERS = [
  { id:"rain", name:"Rain" }, { id:"ocean", name:"Ocean" },
  { id:"fire", name:"Fire" }, { id:"drone", name:"Drone" },
];

/* Persistence. Uses the artifact host's storage when present, otherwise
   localStorage, otherwise memory. Same shape either way: get -> {value} | null. */
const store = (() => {
  const host = typeof window !== "undefined" ? window.storage : null;
  if (host && typeof host.get === "function") return host;
  const mem = new Map();
  const ls = () => { try { return window.localStorage; } catch { return null; } };
  return {
    async get(k) {
      const v = ls() ? ls().getItem(k) : mem.get(k);
      return v == null ? null : { key:k, value:v };
    },
    async set(k, value) {
      if (ls()) ls().setItem(k, value); else mem.set(k, value);
      return { key:k, value };
    },
  };
})();

const clamp = (v,lo,hi) => Math.min(hi, Math.max(lo, v));
const today = () => new Date().toISOString().slice(0,10);
const pad = (n) => String(n).padStart(2,"0");
const fmt = (ms) => {
  const t = Math.max(0, Math.round(ms/1000));
  const h = Math.floor(t/3600), m = Math.floor((t%3600)/60), s = t%60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};
const polar = (cx,cy,r,deg) => { const a = deg*Math.PI/180; return [cx + r*Math.sin(a), cy - r*Math.cos(a)]; };
const arcPath = (cx,cy,r,a0,a1) => {
  const [x0,y0] = polar(cx,cy,r,a0), [x1,y1] = polar(cx,cy,r,a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${Math.abs(a1-a0) > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

/* ── ambience + effects: all synthesised, nothing downloads ─ */
function useAudio() {
  const ref = useRef(null);

  const boot = useCallback(() => {
    if (ref.current) return ref.current;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);

    const noise = (brown) => {
      const len = ctx.sampleRate*3, buf = ctx.createBuffer(1,len,ctx.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i=0;i<len;i++){ const w = Math.random()*2-1;
        if (brown){ last = (last + 0.02*w)/1.02; d[i] = last*3.2; } else d[i] = w; }
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s;
    };
    const gains = {};
    const mk = (id) => { const g = ctx.createGain(); g.gain.value = 0; g.connect(master); gains[id]=g; return g; };

    { const g = mk("rain");
      const hp = ctx.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=700;
      const lp = ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=6500;
      const lfo = ctx.createOscillator(); lfo.frequency.value=0.13;
      const amt = ctx.createGain(); amt.gain.value=1400;
      lfo.connect(amt); amt.connect(lp.frequency); lfo.start();
      noise(false).connect(hp); hp.connect(lp); lp.connect(g); }

    { const g = mk("ocean");
      const lp = ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=460; lp.Q.value=1.1;
      const swell = ctx.createGain(); swell.gain.value=0.55;
      const lfo = ctx.createOscillator(); lfo.frequency.value=0.075;
      const amt = ctx.createGain(); amt.gain.value=0.45;
      lfo.connect(amt); amt.connect(swell.gain); lfo.start();
      noise(true).connect(lp); lp.connect(swell); swell.connect(g); }

    { const g = mk("fire");
      const lp = ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=1000;
      noise(true).connect(lp); lp.connect(g);
      const cl = Math.floor(ctx.sampleRate*0.12);
      const cb = ctx.createBuffer(1,cl,ctx.sampleRate), cd = cb.getChannelData(0);
      for (let i=0;i<cl;i++) cd[i] = (Math.random()*2-1)*(1-i/cl);
      setInterval(() => {
        if (ctx.state !== "running" || gains.fire.gain.value < 0.02 || Math.random() > 0.75) return;
        const t = ctx.currentTime;
        const b = ctx.createBufferSource(); b.buffer = cb; b.playbackRate.value = 0.6+Math.random();
        const cg = ctx.createGain();
        cg.gain.setValueAtTime(0.9*Math.random(), t);
        cg.gain.exponentialRampToValueAtTime(0.0001, t+0.09);
        const bp = ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value = 900+Math.random()*2600;
        b.connect(bp); bp.connect(cg); cg.connect(g); b.start(t); b.stop(t+0.12);
      }, 180); }

    { const g = mk("drone");
      const lp = ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=700; lp.connect(g);
      [98,147,196.5,293.7].forEach((f,i) => {
        const o = ctx.createOscillator(); o.type = i>1 ? "sine" : "triangle";
        o.frequency.value = f*(1+(Math.random()-0.5)*0.004);
        const og = ctx.createGain(); og.gain.value = 0.16/(i+1);
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05+i*0.017;
        const amt = ctx.createGain(); amt.gain.value = 0.07/(i+1);
        lfo.connect(amt); amt.connect(og.gain); lfo.start();
        o.connect(og); og.connect(lp); o.start();
      }); }

    ref.current = { ctx, master, gains };
    return ref.current;
  }, []);

  const setLevel = useCallback((id,v) => {
    const a = boot(); if (!a) return;
    if (a.ctx.state === "suspended") a.ctx.resume();
    a.gains[id]?.gain.setTargetAtTime(v*v*0.5, a.ctx.currentTime, 0.15);
  }, [boot]);

  const chime = useCallback((rest) => {
    const a = boot(); if (!a) return;
    if (a.ctx.state === "suspended") a.ctx.resume();
    const { ctx, master } = a;
    (rest ? [523.25,659.25,783.99] : [392,587.33,783.99]).forEach((f,i) => {
      const t = ctx.currentTime + i*0.14;
      const o = ctx.createOscillator(); o.type="sine"; o.frequency.value=f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001,t);
      g.gain.exponentialRampToValueAtTime(0.22,t+0.015);
      g.gain.exponentialRampToValueAtTime(0.0001,t+1.9);
      o.connect(g); g.connect(master); o.start(t); o.stop(t+2);
    });
  }, [boot]);

  /* the skip blip — a short square-wave chirp, ~2004 menu-select energy */
  const blip = useCallback((down) => {
    const a = boot(); if (!a) return;
    if (a.ctx.state === "suspended") a.ctx.resume();
    const { ctx, master } = a, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "square";
    o.frequency.setValueAtTime(down ? 880 : 660, t);
    o.frequency.exponentialRampToValueAtTime(down ? 494 : 1320, t+0.075);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(0.12,t+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.13);
    const lp = ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=3200;
    o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t+0.15);
  }, [boot]);

  return { setLevel, chime, blip };
}

/* ── YouTube audio (video element stays hidden) ───────────── */
function useStation() {
  const player = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);
  const [vol, setVol] = useState(45);
  const pending = useRef(null);

  useEffect(() => {
    let dead = false;
    const build = () => {
      if (dead || !window.YT || !window.YT.Player) return;
      player.current = new window.YT.Player("em-yt-host", {
        height: "1", width: "1", videoId: STATIONS[0].id,
        playerVars: { autoplay:0, controls:0, playsinline:1, rel:0, modestbranding:1 },
        events: {
          onReady: (e) => { e.target.setVolume(vol); setReady(true); if (pending.current) { pending.current(); pending.current = null; } },
          onStateChange: (e) => setPlaying(e.data === 1),
          onError: () => setFailed(true),
        },
      });
    };
    if (window.YT && window.YT.Player) build();
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); build(); };
      if (!document.getElementById("em-yt-api")) {
        const s = document.createElement("script");
        s.id = "em-yt-api"; s.src = "https://www.youtube.com/iframe_api";
        s.onerror = () => setFailed(true);
        document.head.appendChild(s);
      }
      setTimeout(() => { if (!dead && !player.current) setFailed(true); }, 9000);
    }
    return () => { dead = true; };
  }, []); // eslint-disable-line

  const load = useCallback((i, autoplay) => {
    const n = (i + STATIONS.length) % STATIONS.length;
    setIdx(n);
    const go = () => {
      if (autoplay) player.current.loadVideoById(STATIONS[n].id);
      else player.current.cueVideoById(STATIONS[n].id);
    };
    if (player.current && ready) go(); else pending.current = go;
  }, [ready]);

  const toggle = useCallback(() => {
    if (!player.current || !ready) return;
    if (playing) player.current.pauseVideo(); else player.current.playVideo();
  }, [playing, ready]);

  const setVolume = useCallback((v) => {
    setVol(v);
    if (player.current && ready) player.current.setVolume(v);
  }, [ready]);

  const duck = useCallback((on) => {
    if (player.current && ready) player.current.setVolume(on ? Math.round(vol*0.25) : vol);
  }, [ready, vol]);

  return { ready, failed, playing, idx, vol, load, toggle, setVolume, duck };
}

/* ── the gauge ───────────────────────────────────────────── */
function Dial({ value, min, max, progress, editable, tone, running, onChange }) {
  const svg = useRef(null);
  const [drag, setDrag] = useState(false);
  const C = 200, R = 158;
  const t = clamp((value-min)/(max-min), 0, 1);
  const setAngle = START + SWEEP*t;
  const progAngle = START + SWEEP*clamp(progress,0,1);

  const move = (e) => {
    if (!editable || !svg.current) return;
    const r = svg.current.getBoundingClientRect();
    const px = ((e.clientX-r.left)/r.width)*400 - C;
    const py = ((e.clientY-r.top)/r.height)*400 - C;
    let deg = clamp(Math.atan2(px,-py)*180/Math.PI, START, START+SWEEP);
    onChange(Math.round(min + ((deg-START)/SWEEP)*(max-min)));
  };

  const ticks = [];
  for (let i=0;i<=50;i++){
    const a = START + SWEEP*i/50, major = i%5===0;
    const [x1,y1] = polar(C,C,R+11,a), [x2,y2] = polar(C,C,R+(major?24:18),a);
    ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={a <= setAngle ? tone : "currentColor"} strokeWidth={major?1.6:1}
      opacity={a <= setAngle ? (major?0.9:0.5) : 0.16} />);
  }
  const [kx,ky] = polar(C,C,R,setAngle);

  return (
    <svg ref={svg} viewBox="0 0 400 400" className={`em-dial${editable?"":" locked"}${drag?" dragging":""}`}
      role="slider" tabIndex={editable?0:-1} aria-label="Block length in minutes"
      aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
      onPointerDown={(e) => { if (!editable) return; e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); move(e); }}
      onPointerMove={(e) => drag && move(e)}
      onPointerUp={() => setDrag(false)} onPointerCancel={() => setDrag(false)}
      onKeyDown={(e) => {
        if (!editable) return;
        if (e.key==="ArrowRight"||e.key==="ArrowUp"){ e.preventDefault(); onChange(clamp(value+1,min,max)); }
        if (e.key==="ArrowLeft"||e.key==="ArrowDown"){ e.preventDefault(); onChange(clamp(value-1,min,max)); }
      }}>
      <defs>
        <radialGradient id="em-core">
          <stop offset="0%" stopColor={tone} stopOpacity="0.32" />
          <stop offset="65%" stopColor={tone} stopOpacity="0.05" />
          <stop offset="100%" stopColor={tone} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={124} fill="url(#em-core)" className={running?"em-glow":""} opacity={running?1:0.3} />
      {ticks}
      <path d={arcPath(C,C,R,START,START+SWEEP)} fill="none" stroke="currentColor" strokeOpacity="0.09" strokeWidth="2" />
      <path d={arcPath(C,C,R,START,setAngle)} fill="none" stroke={tone} strokeWidth="2" strokeOpacity="0.24" strokeLinecap="round" />
      {progress > 0.001 && <path d={arcPath(C,C,R,START,progAngle)} fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round" />}
      {editable && (<g>
        <circle cx={kx} cy={ky} r="11" fill="var(--bg)" stroke={tone} strokeWidth="2" />
        <circle cx={kx} cy={ky} r="3.5" fill={tone} />
      </g>)}
    </svg>
  );
}

/* ── app ─────────────────────────────────────────────────── */
export default function Ember() {
  const [cfg, setCfg] = useState(DEFAULTS);
  const [tasks, setTasks] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [log, setLog] = useState({});
  const [levels, setLevels] = useState({ rain:0, ocean:0, fire:0, drone:0 });
  const [loaded, setLoaded] = useState(false);

  const [mode, setMode] = useState("pomodoro");
  const [phase, setPhase] = useState("focus");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(DEFAULTS.focusMin*60000);
  const [elapsed, setElapsed] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(Date.now());

  const endAt = useRef(0), runFrom = useRef(0);
  const { setLevel, chime, blip } = useAudio();
  const station = useStation();

  const th = THEMES[cfg.theme] || THEMES.ember;
  const dark = cfg.theme !== "vellum";
  const vars = {
    "--bg": th.bg, "--bg2": th.bg2, "--surface": th.surface, "--paper": th.paper,
    "--muted": th.muted, "--accent": th.accent, "--rest": th.rest,
    "--line": dark ? "rgba(255,255,255,0.09)" : "rgba(44,51,46,0.12)",
    "--line2": dark ? "rgba(255,255,255,0.2)" : "rgba(44,51,46,0.24)",
    "--glass": dark ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.4)",
    background: `linear-gradient(165deg, ${th.bg} 0%, ${th.bg2} 100%)`,
    color: th.paper,
  };

  /* load / save */
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
          if (d.currentId !== undefined) setCurrentId(d.currentId);
        }
      } catch (e) { /* nothing saved yet */ }
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => {
      store.set(STORE_KEY, JSON.stringify({ cfg, tasks, log, currentId })).catch(() => {});
    }, 400);
    return () => clearTimeout(id);
  }, [cfg, tasks, log, currentId, loaded]);

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const phaseLen = useCallback((p) => {
    if (mode === "countdown") return cfg.countdownMin*60000;
    if (p === "focus") return cfg.focusMin*60000;
    if (p === "break") return cfg.breakMin*60000;
    return cfg.longMin*60000;
  }, [cfg, mode]);

  useEffect(() => {
    if (!running && mode !== "stopwatch" && !(mode === "flowtime" && phase === "focus")) setRemaining(phaseLen(phase));
  }, [cfg.focusMin, cfg.breakMin, cfg.longMin, cfg.countdownMin, phase, mode, running, phaseLen]);

  /* duck the station during breaks */
  useEffect(() => {
    if (cfg.duck) station.duck(phase !== "focus" && running);
    else station.duck(false);
  }, [phase, running, cfg.duck]); // eslint-disable-line

  const record = useCallback((mins) => {
    if (mins < 1) return;
    const k = today();
    setLog((L) => ({ ...L, [k]: { sessions:(L[k]?.sessions||0)+1, minutes:(L[k]?.minutes||0)+Math.round(mins) } }));
  }, []);

  const advance = useCallback(() => {
    if (cfg.chime) chime(phase !== "focus");
    if (mode === "countdown" || mode === "stopwatch") { setRunning(false); setRemaining(phaseLen(phase)); return; }

    if (mode === "flowtime") {
      if (phase === "focus") {
        const mins = elapsed/60000;
        record(mins);
        const br = clamp(Math.round(mins/5), 3, 20);
        setPhase("break"); setRemaining(br*60000); setElapsed(0);
        if (cfg.autoBreak) { endAt.current = Date.now()+br*60000; setRunning(true); } else setRunning(false);
      } else {
        setPhase("focus"); setElapsed(0); setRunning(false);
      }
      return;
    }

    if (phase === "focus") {
      record(cfg.focusMin);
      const n = doneCount+1; setDoneCount(n);
      const long = n % cfg.longEvery === 0;
      setPhase(long ? "long" : "break");
      const len = (long ? cfg.longMin : cfg.breakMin)*60000;
      setRemaining(len);
      if (cfg.autoBreak) { endAt.current = Date.now()+len; setRunning(true); } else setRunning(false);
    } else {
      setPhase("focus"); setRemaining(cfg.focusMin*60000);
      if (cfg.autoFocus) { endAt.current = Date.now()+cfg.focusMin*60000; setRunning(true); } else setRunning(false);
    }
  }, [cfg, chime, doneCount, mode, phase, phaseLen, record, elapsed]);

  useEffect(() => {
    if (!running) return;
    const countUp = mode === "stopwatch" || (mode === "flowtime" && phase === "focus");
    const id = setInterval(() => {
      if (countUp) { setElapsed(Date.now()-runFrom.current); return; }
      const left = endAt.current - Date.now();
      if (left <= 0) { setRemaining(0); advance(); } else setRemaining(left);
    }, 200);
    return () => clearInterval(id);
  }, [running, mode, phase, advance]);

  const countUp = mode === "stopwatch" || (mode === "flowtime" && phase === "focus");

  const toggle = () => {
    if (running) { setRunning(false); if (countUp) runFrom.current = Date.now()-elapsed; }
    else {
      if (countUp) runFrom.current = Date.now()-elapsed;
      else endAt.current = Date.now()+remaining;
      setRunning(true);
    }
  };
  const reset = () => { setRunning(false); if (countUp) setElapsed(0); else setRemaining(phaseLen(phase)); };
  const skip = () => { setRunning(false); advance(); };
  const switchMode = (m) => {
    setRunning(false); setMode(m); setPhase("focus"); setElapsed(0);
    setRemaining(m === "countdown" ? cfg.countdownMin*60000 : cfg.focusMin*60000);
  };

  useEffect(() => {
    const h = (e) => {
      if (e.code !== "Space") return;
      const tag = (e.target.tagName||"").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "button" || tag === "select") return;
      e.preventDefault(); toggle();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const dialKey = mode === "countdown" ? "countdown" : phase;
  const dialField = { focus:"focusMin", break:"breakMin", long:"longMin", countdown:"countdownMin" }[dialKey];
  const [dMin,dMax] = LIMITS[dialKey];
  const editable = !running && !countUp;
  const tone = phase === "focus" ? th.accent : th.rest;
  const total = phaseLen(phase);
  const progress = countUp ? ((elapsed/60000)%60)/60 : total>0 ? remaining/total : 0;

  const current = tasks.find((t) => t.id === currentId && !t.done);
  const stat = log[today()] || { sessions:0, minutes:0 };

  const streak = useMemo(() => {
    let n = 0; const d = new Date();
    for (;;) {
      const k = d.toISOString().slice(0,10);
      if ((log[k]?.sessions||0) > 0) { n++; d.setDate(d.getDate()-1); }
      else if (n === 0 && k === today()) { d.setDate(d.getDate()-1); }
      else break;
      if (n > 400) break;
    }
    return n;
  }, [log]);

  const addTask = (e) => {
    if (e.key !== "Enter" || !draft.trim()) return;
    const t = { id: Date.now(), text: draft.trim(), done: false };
    setTasks((L) => [...L, t]);
    if (!current) setCurrentId(t.id);
    setDraft("");
  };

  const label = mode === "stopwatch" ? "Counting up"
    : mode === "countdown" ? "Countdown"
    : mode === "flowtime" ? (phase === "focus" ? "Flowing" : "Earned break")
    : phase === "focus" ? "Focus" : phase === "break" ? "Short break" : "Long break";

  const Step = ({ label:l, field, lim, suffix = "m" }) => (
    <div className="em-step">
      <label>{l}</label>
      <button className="em-nudge" aria-label={`Decrease ${l}`}
        onClick={() => setCfg((c) => ({ ...c, [field]: clamp(c[field]-1, lim[0], lim[1]) }))}>−</button>
      <b>{cfg[field]}{suffix}</b>
      <button className="em-nudge" aria-label={`Increase ${l}`}
        onClick={() => setCfg((c) => ({ ...c, [field]: clamp(c[field]+1, lim[0], lim[1]) }))}>+</button>
    </div>
  );

  const Toggle = ({ on, set, children }) => (
    <div className="em-pref">
      <span>{children}</span>
      <button className="em-toggle" aria-pressed={on} onClick={() => set(!on)}><span className="em-knob" /></button>
    </div>
  );

  const st = STATIONS[station.idx];

  return (
    <div className="em-root" style={vars}>
      <style>{CSS}</style>
      <div className="em-wash" /><div className="em-grain" />
      <div className="em-yt"><div id="em-yt-host" /></div>

      <div className="em-layer">
        <div className="em-top">
          <div className="em-clock">
            {new Date(now).toLocaleTimeString([], { hour:"numeric", minute:"2-digit" })}
            <span style={{ color:"var(--muted)", marginLeft:14 }}>
              {new Date(now).toLocaleDateString([], { weekday:"long", day:"numeric", month:"long" })}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <span className="em-eyebrow">{streak > 0 ? `${streak} day streak` : "No streak yet"}</span>
            <div className="em-swatches">
              {Object.entries(THEMES).map(([k,t]) => (
                <button key={k} className="em-sw" aria-pressed={cfg.theme===k} aria-label={t.name}
                  title={t.name} style={{ background:`linear-gradient(135deg, ${t.bg} 45%, ${t.accent} 100%)` }}
                  onClick={() => setCfg((c) => ({ ...c, theme:k }))} />
              ))}
            </div>
          </div>
        </div>

        <div className="em-grid">
          {/* stage */}
          <div className="em-stage">
            <div className="em-modes">
              {["pomodoro","flowtime","countdown","stopwatch"].map((m) => (
                <button key={m} className="em-mode" aria-pressed={mode===m} onClick={() => switchMode(m)}>{m}</button>
              ))}
            </div>

            <div className="em-dialwrap">
              <Dial value={cfg[dialField]} min={dMin} max={dMax} progress={progress}
                editable={editable} tone={tone} running={running}
                onChange={(v) => setCfg((c) => ({ ...c, [dialField]: v }))} />
              <div className="em-readout">
                <div className="em-time">{fmt(countUp ? elapsed : remaining)}</div>
                <div className="em-phase">{label}</div>
                {editable && <div className="em-hint">Drag the ring to change this block</div>}
                {mode === "flowtime" && phase === "focus" && (
                  <div className="em-hint">Stop when you want. Your break scales to what you did.</div>
                )}
              </div>
            </div>

            <div className="em-task">
              {current ? <b>{current.text}</b> : <span>Pick a task on the right to keep it in view</span>}
            </div>

            <div className="em-controls">
              <button className={`em-btn primary${phase !== "focus" ? " rest" : ""}`} onClick={toggle}>
                {running ? "Pause" : (countUp && elapsed > 0) ? "Resume" : "Start"}
              </button>
              <button className="em-btn" onClick={reset}>Reset</button>
              {mode === "pomodoro" && <button className="em-btn" onClick={() => { blip(true); skip(); }}>Skip block</button>}
              {mode === "flowtime" && phase === "focus" && (
                <button className="em-btn" disabled={elapsed < 60000} onClick={() => { blip(true); skip(); }}>Take my break</button>
              )}
            </div>

            {mode === "pomodoro" && (
              <div className="em-cycle">
                <div className="em-pips" aria-label={`${doneCount % cfg.longEvery} of ${cfg.longEvery} blocks before the long break`}>
                  {Array.from({ length: cfg.longEvery }).map((_,i) => (
                    <span key={i} className={`em-pip${i < (doneCount % cfg.longEvery) || (doneCount>0 && doneCount%cfg.longEvery===0) ? " on":""}`} />
                  ))}
                  <span style={{ color:"var(--muted)", fontSize:11, margin:"0 3px" }}>→</span>
                  <span className={`em-pip long${phase==="long" ? " on":""}`} />
                </div>
                <Step label="Break" field="breakMin" lim={LIMITS.break} />
                <Step label="Long" field="longMin" lim={LIMITS.long} />
                <div className="em-step">
                  <label>Every</label>
                  <button className="em-nudge" aria-label="Fewer blocks before a long break"
                    onClick={() => setCfg((c) => ({ ...c, longEvery: clamp(c.longEvery-1,2,8) }))}>−</button>
                  <b>{cfg.longEvery}</b>
                  <button className="em-nudge" aria-label="More blocks before a long break"
                    onClick={() => setCfg((c) => ({ ...c, longEvery: clamp(c.longEvery+1,2,8) }))}>+</button>
                </div>
              </div>
            )}
          </div>

          {/* rail */}
          <div>
            <div className="em-card">
              <h3>Today</h3>
              <div className="em-stats">
                <div className="em-stat"><b>{stat.sessions}</b><small>Blocks</small></div>
                <div className="em-stat"><b>{stat.minutes}</b><small>Minutes</small></div>
                <div className="em-stat"><b>{streak}</b><small>Day streak</small></div>
              </div>
            </div>

            <div className="em-card">
              <h3>Station</h3>
              {station.failed ? (
                <p className="em-note" style={{ marginTop:0 }}>
                  YouTube is blocked in this frame, so the station can't load. Open the artifact in its own
                  window, or run the file locally, and it will play. The ambience below works either way.
                </p>
              ) : (
                <>
                  <div className="em-player">
                    <div className={`em-disc${station.playing ? " spin" : ""}`} />
                    <div style={{ minWidth:0 }}>
                      <div className="em-nowtitle">{st.title}</div>
                      <div className="em-nowby">{st.by}</div>
                    </div>
                  </div>
                  <div className="em-tr">
                    <button className="em-tbtn" aria-label="Previous station"
                      onClick={() => { blip(true); station.load(station.idx-1, station.playing); }}>◀◀</button>
                    <button className="em-tbtn play" aria-label={station.playing ? "Pause" : "Play"}
                      onClick={() => { blip(false); station.toggle(); }}>{station.playing ? "❚❚" : "▶"}</button>
                    <button className="em-tbtn" aria-label="Next station"
                      onClick={() => { blip(false); station.load(station.idx+1, station.playing); }}>▶▶</button>
                    <input className="em-slider" style={{ marginLeft:8 }} type="range" min="0" max="100"
                      value={station.vol} aria-label="Music volume"
                      onChange={(e) => station.setVolume(+e.target.value)} />
                  </div>
                  <select className="em-select" value={station.idx}
                    onChange={(e) => station.load(+e.target.value, station.playing)}>
                    {STATIONS.map((s,i) => <option key={s.id} value={i}>{s.title} — {s.by}</option>)}
                  </select>
                  {!station.ready && <p className="em-note">Loading the player…</p>}
                </>
              )}
            </div>

            <div className="em-card">
              <h3>Tasks</h3>
              <input className="em-input" value={draft} placeholder="Add a task, press enter"
                onChange={(e) => setDraft(e.target.value)} onKeyDown={addTask} />
              {tasks.length === 0 ? (
                <p className="em-note">Nothing here yet. Add the one thing you want finished today.</p>
              ) : (
                <ul className="em-tasks">
                  {tasks.map((t) => (
                    <li key={t.id} className="em-taskrow">
                      <button className={`em-check${t.done?" done":""}`} aria-label={t.done?"Mark unfinished":"Mark finished"}
                        onClick={() => { blip(!t.done); setTasks((L) => L.map((x) => x.id===t.id ? { ...x, done:!x.done } : x)); if (currentId===t.id) setCurrentId(null); }} />
                      <button className={`em-tasktext${t.done?" done":""}${currentId===t.id && !t.done ? " current":""}`}
                        onClick={() => setCurrentId(t.done ? null : t.id)}>{t.text}</button>
                      <button className="em-x" aria-label="Remove task"
                        onClick={() => { setTasks((L) => L.filter((x) => x.id!==t.id)); if (currentId===t.id) setCurrentId(null); }}>×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="em-card">
              <h3>Ambience</h3>
              {LAYERS.map((l) => (
                <div className="em-sound" key={l.id}>
                  <span className={levels[l.id] > 0 ? "live" : ""}>{l.name}</span>
                  <input className="em-slider" type="range" min="0" max="100" value={levels[l.id]}
                    aria-label={`${l.name} volume`}
                    onChange={(e) => { const v = +e.target.value; setLevels((L) => ({ ...L, [l.id]:v })); setLevel(l.id, v/100); }} />
                </div>
              ))}
              <p className="em-note">Layer these under the music. All generated live, so nothing loads.</p>
            </div>

            <div className="em-card">
              <h3>Preferences</h3>
              <Toggle on={cfg.autoBreak} set={(v) => setCfg((c) => ({ ...c, autoBreak:v }))}>Start breaks automatically</Toggle>
              <Toggle on={cfg.autoFocus} set={(v) => setCfg((c) => ({ ...c, autoFocus:v }))}>Start the next block automatically</Toggle>
              <Toggle on={cfg.chime} set={(v) => setCfg((c) => ({ ...c, chime:v }))}>Chime when a block ends</Toggle>
              <Toggle on={cfg.duck} set={(v) => setCfg((c) => ({ ...c, duck:v }))}>Lower the music on breaks</Toggle>
              <p className="em-note">Press space to start or pause.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
