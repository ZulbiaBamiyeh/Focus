/* Shared constants, persistence and small helpers. */

export const STORE_KEY = "ember:v4";

export const DEFAULTS = {
  mode: "pomodoro",             // pomodoro | flowtime
  focusMin: 25, breakMin: 5, longMin: 10, longEvery: 4,
  flowDivisor: 5,
  autoNext: true, chime: true, notify: false, duck: true,
  showStreak: true, showProgress: true, showQuote: true, showSeconds: true,
  timerStyle: "digits",         // digits | ring | bar
  theme: "midnight",
  bgImage: "", bgVideo: "", bgOverlay: 35,
};

/* Timer bounds, kept next to the fields they guard. */
export const LIMITS = {
  focusMin: [1, 180], breakMin: [1, 60], longMin: [1, 90],
  longEvery: [2, 12], flowDivisor: [2, 12],
};

export const LAYERS = [
  { id: "rain", name: "Rain" }, { id: "ocean", name: "Ocean" },
  { id: "fire", name: "Fire" }, { id: "drone", name: "Drone" },
];

/* Curated stations: long game-OST mixes. */
export const STATIONS = [
  { id:"ueRHznBxN8M", title:"MapleStory Nostalgia",         by:"1 hr · early GMS tunes" },
  { id:"y2M18LXBXPs", title:"MapleStory for Studying",      by:"2 hr · hand-picked" },
  { id:"3DEkF2uvPoc", title:"MapleStory 2006 GMS",          by:"2 hr · ripped from v0.22" },
  { id:"c_X2JARomKM", title:"More MapleStory for Studying", by:"2 hr" },
  { id:"9k9p_ykZiSU", title:"MapleStory 2",                 by:"1 hr" },
  { id:"AJu_6mtkTe0", title:"OSRS Focus Mix",               by:"1 hr · Garden, Doorways, Forest" },
  { id:"KBZnLqeYhgc", title:"Relaxing OSRS",                by:"3 hr · study & sleep" },
  { id:"33aluIL_K3U", title:"Classic OSRS",                 by:"2 hr" },
  { id:"5Vzc-KIawBI", title:"OSRS Lofi",                    by:"1 hr · chill remixes" },
  { id:"84dPx9sP2Mg", title:"OSRSBeatz Lofi",               by:"lofi hip hop mix" },
  { id:"wv-7hILtUI4", title:"RuneScape OST Classics",       by:"full album" },
];

/* Gradient scenes. Each is a full-bleed painted sky built from layered
   gradients, so nothing downloads and they scale to any viewport.
   `live` marks a scene that draws itself on a canvas instead. */
export const SCENES = {
  midnight: { name:"Midnight", dark:true,
    paper:"#E9EDF9", muted:"#8A93B4", accent:"#7C6BFF", chip:"#7C6BFF",
    sky:`radial-gradient(85% 60% at 50% 100%, #2B4778 0%, rgba(43,71,120,0) 62%),
         radial-gradient(60% 45% at 74% 14%, #3D3A7A 0%, rgba(61,58,122,0) 66%),
         linear-gradient(180deg, #070A18 0%, #0E1430 50%, #16224A 100%)` },
  ember: { name:"Ember", dark:true,
    paper:"#F6EFE6", muted:"#B0A79C", accent:"#F2A24A", chip:"#F2A24A",
    sky:`radial-gradient(120% 85% at 50% 108%, #F2A24A 0%, rgba(242,162,74,0) 55%),
         radial-gradient(90% 60% at 78% 8%, #4A3A63 0%, rgba(74,58,99,0) 60%),
         linear-gradient(178deg, #14172A 0%, #23203A 46%, #43304A 78%, #6B4442 100%)` },
  dawn: { name:"Dawn", dark:true,
    paper:"#FCEFF0", muted:"#C3A9AE", accent:"#FF8FA6", chip:"#FF9EAF",
    sky:`radial-gradient(110% 80% at 22% 105%, #FFB99C 0%, rgba(255,185,156,0) 58%),
         radial-gradient(80% 55% at 82% 12%, #6E5A8C 0%, rgba(110,90,140,0) 62%),
         linear-gradient(176deg, #221A33 0%, #453353 44%, #8A5A6B 76%, #D98E84 100%)` },
  grove: { name:"Grove", dark:true,
    paper:"#E8F2E9", muted:"#8EA79A", accent:"#5FD3A6", chip:"#86D8B4",
    sky:`radial-gradient(100% 70% at 32% 104%, #2E6B55 0%, rgba(46,107,85,0) 60%),
         radial-gradient(70% 50% at 80% 10%, #2A4F58 0%, rgba(42,79,88,0) 64%),
         linear-gradient(178deg, #0A1614 0%, #12241F 48%, #1D3A2E 100%)` },
  orchid: { name:"Orchid", dark:true,
    paper:"#EFE9FA", muted:"#A199BE", accent:"#B79BFF", chip:"#B79BFF",
    sky:`radial-gradient(100% 72% at 68% 104%, #6E4BA8 0%, rgba(110,75,168,0) 60%),
         radial-gradient(70% 50% at 20% 10%, #3E4796 0%, rgba(62,71,150,0) 64%),
         linear-gradient(178deg, #0D0B1E 0%, #1B1638 50%, #33245C 100%)` },
  slate: { name:"Slate", dark:true,
    paper:"#E7E9EE", muted:"#8E939E", accent:"#7C6BFF", chip:"#59606E",
    sky:`radial-gradient(90% 60% at 50% 100%, #23262E 0%, rgba(35,38,46,0) 62%),
         linear-gradient(180deg, #0A0B0E 0%, #121419 55%, #1A1D24 100%)` },
  /* Drawn on a canvas rather than painted in CSS. The sky below still shows
     through — the scene only draws hills and blobs over it. */
  meadow: { name:"Meadow", dark:true, live:"blobs",
    paper:"#FFF6E4", muted:"#C2AE8E", accent:"#FFC53D", chip:"#8FD14F",
    sky:`radial-gradient(90% 62% at 50% 92%, #3E7A58 0%, rgba(62,122,88,0) 60%),
         linear-gradient(180deg, #0E2231 0%, #16405A 44%, #2E7390 100%)`,
    pal: { far:"#2F6B52", near:"#1F4E3C", blob:"#FFD34E", blobAlt:"#FF9BB3",
           edge:"rgba(20,40,30,.5)", ink:"#23372C" } },
};

export const QUOTES = [
  "Start where you are. Use what you have.",
  "Almost everything works better if you unplug it for a bit.",
  "The work will teach you how to do it.",
  "Slow is smooth, and smooth is fast.",
  "You don't have to finish. You have to begin.",
  "Attention is the rarest form of generosity.",
  "A little done daily beats a lot done rarely.",
  "Done is a decision, not a feeling.",
];

/* Persistence. Uses the host's storage when present, otherwise
   localStorage, otherwise memory. Same shape either way. */
export const store = (() => {
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

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const pad = (n) => String(n).padStart(2, "0");

/* Local date key, not UTC — an 8pm session in UTC-5 belongs to today. */
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const today = () => dayKey();

export const fmt = (ms, seconds = true) => {
  const t = Math.max(0, Math.round(ms/1000));
  const h = Math.floor(t/3600), m = Math.floor((t%3600)/60), s = t%60;
  if (!seconds) return h ? `${h}:${pad(m)}` : `${m}`;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/* Pull an 11-char video id out of whatever was pasted — watch links,
   youtu.be, /embed/, /shorts/, or a bare id. */
export const parseVideoId = (raw) => {
  const s = (raw || "").trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return s;
  let u;
  try { u = new URL(s.includes("://") ? s : `https://${s}`); } catch { return null; }
  if (!/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/.test(u.hostname)) return null;
  if (u.hostname.endsWith("youtu.be")) {
    const id = u.pathname.slice(1);
    return /^[\w-]{11}$/.test(id) ? id : null;
  }
  const v = u.searchParams.get("v");
  if (v && /^[\w-]{11}$/.test(v)) return v;
  const m = u.pathname.match(/\/(embed|shorts|live|v)\/([\w-]{11})/);
  return m ? m[2] : null;
};

/* Keys for the last n days, oldest first. */
export const lastDays = (n) => {
  const out = [], d = new Date();
  for (let i = n-1; i >= 0; i--) {
    const x = new Date(d); x.setDate(d.getDate()-i);
    out.push({ key: dayKey(x), label: x.toLocaleDateString([], { weekday:"narrow" }) });
  }
  return out;
};
