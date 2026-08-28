import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Museum, { hallsFor, hallAt, threshold } from "./museum.jsx";

/* ────────────────────────────────────────────────────────────
   Ember — a focus dashboard where the dial is the setting.
   Pomodoro · Countdown · Stopwatch · Flowtime
   Synthesised ambience + a hidden-video game-OST player.
   ──────────────────────────────────────────────────────────── */

/* ── scenes ───────────────────────────────────────────────────
   Each is a full-bleed painted sky rather than a flat fill: a base
   gradient for the atmosphere, then soft radial blooms for light. All
   CSS, so nothing downloads and they scale to any viewport. `chip` is
   the little preview dot in the top bar.
   ───────────────────────────────────────────────────────────── */
const SCENES = {
  /* Default. Deep and even top to bottom, which keeps light text legible
     everywhere on the page — the warmer scenes brighten toward the bottom. */
  midnight: {
    name:"Midnight", dark:true,
    paper:"#E9EDF9", muted:"#8A93B4", accent:"#8AB4FF", rest:"#9FE0D4", chip:"#8AB4FF",
    sky:`radial-gradient(85% 60% at 50% 100%, #2B4778 0%, rgba(43,71,120,0) 62%),
         radial-gradient(60% 45% at 74% 14%, #3D3A7A 0%, rgba(61,58,122,0) 66%),
         linear-gradient(180deg, #070A18 0%, #0E1430 50%, #16224A 100%)`,
  },
  ember: {
    name:"Ember", dark:true,
    paper:"#F6EFE6", muted:"#B0A79C", accent:"#F2A24A", rest:"#8FD3B6", chip:"#F2A24A",
    sky:`radial-gradient(120% 85% at 50% 108%, #F2A24A 0%, rgba(242,162,74,0) 55%),
         radial-gradient(90% 60% at 78% 8%, #4A3A63 0%, rgba(74,58,99,0) 60%),
         linear-gradient(178deg, #14172A 0%, #23203A 46%, #43304A 78%, #6B4442 100%)`,
  },
  dawn: {
    name:"Dawn", dark:true,
    paper:"#FCEFF0", muted:"#C3A9AE", accent:"#FF9EAF", rest:"#FFD79B", chip:"#FF9EAF",
    sky:`radial-gradient(110% 80% at 22% 105%, #FFB99C 0%, rgba(255,185,156,0) 58%),
         radial-gradient(80% 55% at 82% 12%, #6E5A8C 0%, rgba(110,90,140,0) 62%),
         linear-gradient(176deg, #221A33 0%, #453353 44%, #8A5A6B 76%, #D98E84 100%)`,
  },
  grove: {
    name:"Grove", dark:true,
    paper:"#E8F2E9", muted:"#8EA79A", accent:"#86D8B4", rest:"#DCCB86", chip:"#86D8B4",
    sky:`radial-gradient(100% 70% at 32% 104%, #2E6B55 0%, rgba(46,107,85,0) 60%),
         radial-gradient(70% 50% at 80% 10%, #2A4F58 0%, rgba(42,79,88,0) 64%),
         linear-gradient(178deg, #0A1614 0%, #12241F 48%, #1D3A2E 100%)`,
  },
  orchid: {
    name:"Orchid", dark:true,
    paper:"#EFE9FA", muted:"#A199BE", accent:"#B79BFF", rest:"#8FD9E6", chip:"#B79BFF",
    sky:`radial-gradient(100% 72% at 68% 104%, #6E4BA8 0%, rgba(110,75,168,0) 60%),
         radial-gradient(70% 50% at 20% 10%, #3E4796 0%, rgba(62,71,150,0) 64%),
         linear-gradient(178deg, #0D0B1E 0%, #1B1638 50%, #33245C 100%)`,
  },
  vellum: {
    name:"Vellum", dark:false,
    paper:"#2E332C", muted:"#6F7568", accent:"#B0552F", rest:"#3F6B5A", chip:"#E9E3D5",
    sky:`radial-gradient(90% 65% at 26% 100%, #E3D2B4 0%, rgba(227,210,180,0) 62%),
         radial-gradient(70% 50% at 82% 8%, #F7F2E6 0%, rgba(247,242,230,0) 60%),
         linear-gradient(176deg, #F2EDE1 0%, #E8E0CE 55%, #DCD0B8 100%)`,
  },
  /* Last in the row, and the odd one out. `art` swaps the painted sky for
     the museum canvas; the gradient here is only what shows past its walls. */
  museum: {
    name:"Museum", dark:true, art:true,
    paper:"#EAECF4", muted:"#8E93A6", accent:"#F0B15C", rest:"#8FD3B6", chip:"#C9A882",
    sky:`radial-gradient(90% 65% at 50% 100%, #2A2E42 0%, rgba(42,46,66,0) 62%),
         linear-gradient(180deg, #0B0D16 0%, #14172A 55%, #1E2236 100%)`,
  },
};

/* Shown under the clock. Kept short so they never wrap past two lines. */
const QUOTES = [
  "Start where you are. Use what you have.",
  "Almost everything works better if you unplug it for a bit.",
  "The work will teach you how to do it.",
  "Slow is smooth, and smooth is fast.",
  "You don't have to finish. You have to begin.",
  "Attention is the rarest form of generosity.",
  "A little done daily beats a lot done rarely.",
  "Done is a decision, not a feeling.",
];

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
  position:fixed; inset:0; overflow:hidden; color:var(--paper);
  font-family:var(--sans); -webkit-font-smoothing:antialiased;
}
.em-root *{box-sizing:border-box;}

/* ── the painted sky ─────────────────────────────────────── */
.em-sky{position:absolute; inset:0; background:var(--sky); background-size:cover;
  transition:opacity 1.1s ease;}
.em-photo{position:absolute; inset:0; background-size:cover; background-position:center;}

/* The museum sits over the sky and under everything else. Nearest-neighbour
   everywhere so the 16px art stays crisp when scaled up. */
.em-museum{position:absolute; inset:0; pointer-events:none; transition:opacity .5s ease;}
.em-museum canvas{display:block; width:100%; height:100%;
  image-rendering:pixelated; image-rendering:crisp-edges;}

.em-toast{flex:0 0 auto; align-self:center; margin:8px 0 2px;
  display:flex; flex-direction:column; gap:3px;
  align-items:center; text-align:center; padding:10px 20px; border-radius:14px;
  background:var(--panel); border:1px solid var(--glassEdge);
  backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4);
  box-shadow:0 14px 40px -18px rgba(0,0,0,.7);
  /* Not em-rise: that carries a translateX(-50%) for the centred panel,
     which would drag an in-flow element off to the left. */
  animation:em-pop .32s cubic-bezier(.22,1,.36,1);}
@keyframes em-pop{from{opacity:0; transform:translateY(10px) scale(.97);}
                  to{opacity:1; transform:none;}}
.em-toast .em-mono{opacity:.55;}
.em-toast b{font-weight:500; font-size:15px;}
@media (prefers-reduced-motion:reduce){ .em-toast{animation:none;} }

.em-museumrow{display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:16px;}
.em-bar{height:4px; border-radius:4px; background:var(--glass); overflow:hidden; margin-top:9px;}
.em-bar span{display:block; height:100%; border-radius:4px; background:var(--accent);
  transition:width .5s ease;}
@media (prefers-reduced-motion:reduce){ .em-bar span{transition:none;} }
/* Blooms drift very slowly so the scene feels alive but never draws the eye. */
.em-bloom{position:absolute; inset:-25%; pointer-events:none; opacity:.5; filter:blur(90px);
  background:
    radial-gradient(32% 32% at 24% 30%, var(--accent) 0%, transparent 64%),
    radial-gradient(28% 28% at 76% 68%, var(--rest) 0%, transparent 62%);
  animation:em-drift 46s ease-in-out infinite alternate;}
@keyframes em-drift{from{transform:translate3d(-3%,-2%,0) scale(1);}to{transform:translate3d(4%,3%,0) scale(1.16);}}
/* Warm scenes brighten toward the bottom, which is exactly where the dock and
   quote sit. The top-and-tail scrim keeps light text on a dark ground in every
   scene rather than only the evenly-lit ones. */
.em-vignette{position:absolute; inset:0; pointer-events:none;
  background:
    linear-gradient(to top, rgba(0,0,0,.42) 0%, rgba(0,0,0,0) 24%),
    linear-gradient(to bottom, rgba(0,0,0,.26) 0%, rgba(0,0,0,0) 14%),
    radial-gradient(130% 100% at 50% 42%, transparent 44%, rgba(0,0,0,.42) 100%);}
/* Light scenes carry dark text, so the tails lighten instead of darken. */
.em-root.light .em-vignette{background:
    linear-gradient(to top, rgba(255,255,255,.5) 0%, rgba(255,255,255,0) 24%),
    linear-gradient(to bottom, rgba(255,255,255,.34) 0%, rgba(255,255,255,0) 14%),
    radial-gradient(130% 100% at 50% 42%, transparent 48%, rgba(90,80,60,.18) 100%);}
.em-grain{position:absolute; inset:0; pointer-events:none; opacity:.13; mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23n)' opacity='0.5'/></svg>");}
@media (prefers-reduced-motion:reduce){ .em-bloom{animation:none;} }

/* ── shell ───────────────────────────────────────────────── */
.em-shell{position:relative; z-index:1; height:100%; display:flex; flex-direction:column;
  padding:22px 26px 18px; overflow-y:auto; overflow-x:hidden;}

.em-mono{font-family:var(--mono); font-size:10px; letter-spacing:.24em; text-transform:uppercase;}

.em-topbar{display:flex; justify-content:space-between; align-items:center; gap:16px; flex:0 0 auto;}
.em-streak{color:var(--paper); opacity:.72;}
.em-scenes{display:flex; gap:8px; align-items:center;}
.em-chip{width:17px; height:17px; border-radius:50%; cursor:pointer; padding:0;
  border:1px solid rgba(255,255,255,.4); transition:transform .16s;}
.em-chip:hover{transform:scale(1.14);}
.em-chip[aria-pressed="true"]{box-shadow:0 0 0 2px var(--glassEdge), 0 0 0 3.5px var(--paper);}
.em-chip:focus-visible{outline:2px solid var(--paper); outline-offset:3px;}

/* ── hero ────────────────────────────────────────────────── */
.em-hero{flex:1 1 auto; display:flex; flex-direction:column; align-items:center;
  justify-content:center; gap:4px; padding:10px 0 4px; min-height:0;}
.em-greet{font-size:15px; letter-spacing:.01em; opacity:.8; text-align:center;}
.em-greet b{font-weight:500;}

.em-modes{display:flex; gap:2px; padding:3px; margin:14px 0 10px; border-radius:999px;
  background:var(--glass); border:1px solid var(--glassEdge);
  backdrop-filter:blur(20px) saturate(1.3); -webkit-backdrop-filter:blur(20px) saturate(1.3);}
.em-mode{font-family:var(--mono); font-size:9.5px; letter-spacing:.18em; text-transform:uppercase;
  background:transparent; border:0; color:var(--paper); opacity:.55; padding:8px 15px;
  cursor:pointer; border-radius:999px; transition:opacity .16s, background .16s;}
.em-mode:hover{opacity:.85;}
.em-mode[aria-pressed="true"]{background:var(--glassUp); opacity:1;}
.em-mode:focus-visible{outline:2px solid var(--paper); outline-offset:1px;}

/* The 300-degree arc leaves the bottom of the square empty, so claw that
   back rather than letting it read as a gap above the task line. */
/* One source of truth for the dial's size: the readout scales off the same
   value, so the digits can never outgrow the ring the way a vh-based font
   does on a narrow screen. */
.em-hero{--dial:min(92vw, 56vh, 520px);}
/* The 300-degree arc leaves the bottom of the square empty, so claw some of
   it back — but the arc's arms end inside the controls' width, so the tuck
   has to stay shallow enough that they clear on short viewports too. */
.em-dialwrap{position:relative; width:var(--dial); aspect-ratio:1;
  touch-action:none; margin-bottom:-3%;}
.em-dial{display:block; width:100%; height:100%; cursor:grab; overflow:visible;}
.em-dial.locked{cursor:default;} .em-dial.dragging{cursor:grabbing;}
.em-readout{position:absolute; inset:0; display:flex; flex-direction:column;
  align-items:center; justify-content:center; pointer-events:none; text-align:center; padding:0 12%;}
.em-time{font-variant-numeric:tabular-nums; font-size:calc(var(--dial) * .205); font-weight:200;
  letter-spacing:-.045em; line-height:1; text-shadow:0 2px 34px rgba(0,0,0,.32);}
/* Past an hour the readout gains "H:" and needs to come down a step. */
.em-time.long{font-size:calc(var(--dial) * .145);}
.em-root.light .em-time{text-shadow:0 2px 26px rgba(255,255,255,.5);}
.em-phase{margin-top:12px; font-family:var(--mono); font-size:9.5px; letter-spacing:.3em;
  text-transform:uppercase; opacity:.62;}
.em-hint{margin-top:8px; font-size:11px; opacity:.5; line-height:1.5; max-width:210px;}

/* Sits in the ring's bottom opening, so it has to stay narrower than the gap
   or a long title runs under the arc. */
.em-task{margin-top:14px; text-align:center; padding:0 16px;
  max-width:330px; overflow-wrap:anywhere;}
.em-task b{font-weight:400; font-size:17px; letter-spacing:-.01em;}
.em-task span{opacity:.5; font-size:13.5px;}

.em-controls{display:flex; gap:9px; margin-top:18px; align-items:center; flex-wrap:wrap; justify-content:center;}
.em-btn{font-family:var(--mono); font-size:10px; letter-spacing:.16em; text-transform:uppercase;
  background:var(--glass); color:var(--paper); border:1px solid var(--glassEdge); border-radius:999px;
  padding:11px 18px; cursor:pointer; transition:background .16s, transform .1s, border-color .16s;
  backdrop-filter:blur(20px) saturate(1.3); -webkit-backdrop-filter:blur(20px) saturate(1.3);}
.em-btn:hover{background:var(--glassUp);}
.em-btn:active{transform:translateY(1px);}
.em-btn:focus-visible{outline:2px solid var(--paper); outline-offset:2px;}
.em-btn[disabled]{opacity:.35; cursor:not-allowed;}
.em-btn.primary{background:var(--accent); border-color:transparent; color:var(--onAccent);
  font-weight:700; padding:12px 38px; box-shadow:0 6px 26px -8px var(--accent);}
.em-btn.primary.rest{background:var(--rest); box-shadow:0 6px 26px -8px var(--rest);}
.em-btn.primary:hover{filter:brightness(1.07);}

.em-cycle{display:flex; align-items:center; gap:11px; margin-top:16px; flex-wrap:wrap; justify-content:center;}
.em-pips{display:flex; gap:6px; align-items:center;}
.em-pip{width:8px; height:8px; border-radius:50%; border:1px solid var(--glassEdge2); background:transparent;}
.em-pip.on{background:var(--accent); border-color:var(--accent); box-shadow:0 0 10px var(--accent);}
.em-pip.long{width:10px; height:10px;}
.em-pip.long.on{background:var(--rest); border-color:var(--rest); box-shadow:0 0 10px var(--rest);}

.em-step{display:flex; align-items:center; gap:6px; border:1px solid var(--glassEdge); border-radius:999px;
  padding:5px 9px; background:var(--glass);
  backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);}
.em-step label{font-family:var(--mono); font-size:8.5px; letter-spacing:.16em; text-transform:uppercase; opacity:.6;}
.em-step b{font-family:var(--mono); font-size:12.5px; font-weight:500; min-width:28px; text-align:center;
  font-variant-numeric:tabular-nums;}
.em-nudge{background:transparent; border:0; color:var(--paper); opacity:.55; cursor:pointer;
  font-size:14px; line-height:1; padding:2px 5px; border-radius:4px;}
.em-nudge:hover{opacity:1;}
.em-nudge:focus-visible{outline:2px solid var(--paper); outline-offset:1px;}

.em-quote{flex:0 0 auto; text-align:center; font-size:12.5px; opacity:.42; padding:12px 20px 4px;
  line-height:1.6; font-style:italic;}

/* ── dock ────────────────────────────────────────────────── */
.em-dock{flex:0 0 auto; display:flex; justify-content:center; gap:5px; padding:8px 0 2px;}
.em-dockinner{display:flex; gap:3px; padding:5px; border-radius:999px;
  background:var(--glass); border:1px solid var(--glassEdge);
  backdrop-filter:blur(24px) saturate(1.4); -webkit-backdrop-filter:blur(24px) saturate(1.4);
  box-shadow:0 10px 34px -14px rgba(0,0,0,.55);}
.em-dockbtn{display:flex; flex-direction:column; align-items:center; gap:3px; min-width:62px;
  background:transparent; border:0; color:var(--paper); opacity:.6; cursor:pointer;
  padding:8px 10px 7px; border-radius:999px; transition:opacity .16s, background .16s;}
.em-dockbtn:hover{opacity:.95; background:var(--glassUp);}
.em-dockbtn[aria-expanded="true"]{opacity:1; background:var(--glassUp);}
.em-dockbtn:focus-visible{outline:2px solid var(--paper); outline-offset:1px;}
.em-dockbtn svg{width:17px; height:17px; stroke:currentColor; stroke-width:1.6; fill:none;
  stroke-linecap:round; stroke-linejoin:round;}
.em-dockbtn span{font-family:var(--mono); font-size:8px; letter-spacing:.14em; text-transform:uppercase;}
.em-dot{position:absolute; top:6px; right:12px; width:5px; height:5px; border-radius:50%; background:var(--accent);}
.em-dockbtn{position:relative;}
@media (max-width:560px){ .em-dockbtn{min-width:auto;} .em-dockbtn span{display:none;} }

/* ── floating panel ──────────────────────────────────────── */
.em-scrim{position:fixed; inset:0; z-index:5; background:rgba(0,0,0,.18); border:0; padding:0;
  animation:em-fade .2s ease;}
@keyframes em-fade{from{opacity:0;}to{opacity:1;}}
.em-panel{position:fixed; z-index:6; left:50%; transform:translateX(-50%);
  bottom:86px; width:min(92vw, 380px); max-height:min(66vh, 560px); overflow-y:auto;
  border-radius:20px; padding:18px 18px 16px;
  background:var(--panel); border:1px solid var(--glassEdge);
  backdrop-filter:blur(30px) saturate(1.5); -webkit-backdrop-filter:blur(30px) saturate(1.5);
  box-shadow:0 24px 60px -20px rgba(0,0,0,.6);
  animation:em-rise .22s cubic-bezier(.22,1,.36,1);}
@keyframes em-rise{from{opacity:0; transform:translateX(-50%) translateY(12px);}
                   to{opacity:1; transform:translateX(-50%) translateY(0);}}
@media (prefers-reduced-motion:reduce){ .em-panel,.em-scrim{animation:none;} }
.em-panelhead{display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;}
.em-panelhead h3{margin:0; font-family:var(--mono); font-size:9.5px; letter-spacing:.24em;
  text-transform:uppercase; opacity:.6; font-weight:400;}
.em-close{background:transparent; border:0; color:var(--paper); opacity:.55; cursor:pointer;
  font-size:17px; line-height:1; padding:3px 6px; border-radius:5px;}
.em-close:hover{opacity:1;}
.em-close:focus-visible{outline:2px solid var(--paper); outline-offset:1px;}

.em-input{width:100%; background:transparent; border:0; border-bottom:1px solid var(--glassEdge2);
  color:var(--paper); font-family:var(--sans); font-size:14px; padding:9px 0; outline:none;}
.em-input::placeholder{color:var(--paper); opacity:.42;}
.em-input:focus{border-bottom-color:var(--accent);}

.em-tasks{list-style:none; margin:8px 0 0; padding:0;}
.em-taskrow{display:flex; align-items:center; gap:9px; padding:8px 0; border-bottom:1px solid var(--glassEdge);}
.em-check{width:15px; height:15px; flex:0 0 auto; border:1px solid var(--glassEdge2); border-radius:50%;
  background:transparent; cursor:pointer; padding:0;}
.em-check:hover{border-color:var(--accent);}
.em-check.done{background:var(--rest); border-color:var(--rest);}
.em-check:focus-visible{outline:2px solid var(--paper); outline-offset:2px;}
.em-tasktext{flex:1; text-align:left; background:transparent; border:0; color:var(--paper);
  font-family:var(--sans); font-size:14px; cursor:pointer; padding:0; line-height:1.4;}
.em-tasktext:hover{color:var(--accent);}
.em-tasktext.done{opacity:.45; text-decoration:line-through;}
.em-tasktext.current{color:var(--accent);}
.em-tasktext:focus-visible{outline:2px solid var(--paper); outline-offset:2px;}
.em-x{background:transparent; border:0; color:var(--paper); opacity:0; cursor:pointer; font-size:14px;
  padding:2px 4px; border-radius:4px; flex:0 0 auto; transition:opacity .14s;}
.em-taskrow:hover .em-x, .em-x:focus-visible{opacity:.7;}
.em-x:hover:not([disabled]){opacity:1; color:var(--accent);}
.em-x:focus-visible{outline:2px solid var(--paper); outline-offset:1px;}
.em-x[disabled]{opacity:0 !important; cursor:default; pointer-events:none;}
/* Touch has no hover, so row actions must stay visible. */
@media (hover:none){ .em-x{opacity:.55;} }
.em-note{opacity:.5; font-size:12px; line-height:1.6; margin:10px 0 0;}

.em-sound{display:flex; align-items:center; gap:12px; margin-bottom:13px;}
.em-sound span{font-size:13px; width:66px; flex:0 0 auto; opacity:.55;}
.em-sound span.live{opacity:1;}
.em-slider{flex:1; -webkit-appearance:none; appearance:none; height:3px; border-radius:3px;
  background:var(--glassEdge2); outline:none;}
.em-slider::-webkit-slider-thumb{-webkit-appearance:none; width:14px; height:14px; border-radius:50%;
  background:var(--paper); cursor:pointer; box-shadow:0 1px 5px rgba(0,0,0,.35);}
.em-slider::-moz-range-thumb{width:14px; height:14px; border:0; border-radius:50%; background:var(--paper);
  cursor:pointer; box-shadow:0 1px 5px rgba(0,0,0,.35);}
.em-slider:focus-visible{outline:2px solid var(--paper); outline-offset:4px;}

.em-player{display:flex; align-items:center; gap:13px;}
.em-disc{width:50px; height:50px; border-radius:50%; flex:0 0 auto; position:relative;
  background:conic-gradient(from 0deg, rgba(255,255,255,.1), var(--accent) 22%, rgba(255,255,255,.1) 46%, var(--rest) 70%, rgba(255,255,255,.1));
  box-shadow:inset 0 0 0 1px var(--glassEdge2), 0 4px 16px -6px rgba(0,0,0,.5);}
.em-disc::after{content:""; position:absolute; inset:41%; border-radius:50%; background:var(--discHole);
  box-shadow:0 0 0 1px var(--glassEdge2);}
.em-disc.spin{animation:em-spin 7s linear infinite;}
@keyframes em-spin{to{transform:rotate(360deg);}}
@media (prefers-reduced-motion:reduce){ .em-disc.spin{animation-duration:40s;} }
.em-nowtitle{font-size:13.5px; line-height:1.35; margin-bottom:2px;}
.em-nowby{font-family:var(--mono); font-size:9.5px; letter-spacing:.1em; opacity:.55;}
.em-tr{display:flex; gap:6px; margin-top:12px; align-items:center;}
.em-tbtn{flex:0 0 auto; width:34px; height:34px; border-radius:50%; border:1px solid var(--glassEdge2);
  background:transparent; color:var(--paper); cursor:pointer; font-size:11px;
  display:flex; align-items:center; justify-content:center;}
.em-tbtn:hover{border-color:var(--accent);}
.em-tbtn:focus-visible{outline:2px solid var(--paper); outline-offset:2px;}
.em-tbtn.play{background:var(--accent); border-color:transparent; color:var(--onAccent);}
.em-select{width:100%; margin-top:11px; background:var(--selectBg); color:var(--paper);
  border:1px solid var(--glassEdge2); border-radius:10px; padding:9px 10px;
  font-family:var(--sans); font-size:12.5px; outline:none;}
.em-select:focus{border-color:var(--accent);}
.em-yt{position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; left:-9999px;}

.em-stats{display:flex; gap:22px;}
.em-stat b{display:block; font-family:var(--mono); font-size:26px; font-weight:200;
  font-variant-numeric:tabular-nums; letter-spacing:-.03em;}
.em-stat small{font-family:var(--mono); font-size:8.5px; letter-spacing:.18em; text-transform:uppercase; opacity:.55;}

.em-week{display:flex; gap:6px; align-items:flex-end; margin-top:18px;}
.em-weekcol{flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; min-width:0;}
.em-weekbar{width:100%; height:46px; display:flex; align-items:flex-end; border-radius:4px; background:var(--glass);}
.em-weekbar span{display:block; width:100%; min-height:2px; border-radius:4px; background:var(--paper);
  opacity:.3; transition:height .35s ease;}
.em-weekbar span.on{background:var(--accent); opacity:1;}
.em-weekcol small{font-family:var(--mono); font-size:8.5px; letter-spacing:.1em; opacity:.5;}
.em-weekcol small.on{color:var(--accent); opacity:1;}
@media (prefers-reduced-motion:reduce){ .em-weekbar span{transition:none;} }

.em-pref{display:flex; align-items:center; justify-content:space-between; gap:10px;
  font-size:13px; opacity:.85; margin-bottom:12px;}
.em-toggle{width:34px; height:18px; border-radius:9px; border:1px solid var(--glassEdge2);
  background:transparent; cursor:pointer; padding:2px; flex:0 0 auto;}
.em-toggle:focus-visible{outline:2px solid var(--paper); outline-offset:2px;}
.em-knob{display:block; width:12px; height:12px; border-radius:50%; background:var(--paper); opacity:.5;
  transition:transform .16s, background .16s, opacity .16s;}
.em-toggle[aria-pressed="true"]{border-color:var(--accent);}
.em-toggle[aria-pressed="true"] .em-knob{transform:translateX(16px); background:var(--accent); opacity:1;}

@keyframes em-breathe{0%,100%{opacity:.45;}50%{opacity:1;}}
.em-glow{animation:em-breathe 5.5s ease-in-out infinite;}
@media (prefers-reduced-motion:reduce){ .em-glow{animation:none; opacity:.8;} }

@media (max-width:600px){
  .em-shell{padding:16px 14px 12px;}
  .em-quote{display:none;}
}
/* Short viewports: drop the softer furniture before the timer has to shrink. */
@media (max-height:620px){
  .em-quote{display:none;}
  .em-greet{display:none;}
}
`;

/* ── constants ───────────────────────────────────────────── */
const SWEEP = 300, START = -150;
const LIMITS = { focus:[5,90], break:[1,30], long:[5,45], countdown:[1,120], flow:[2,12] };
const STORE_KEY = "ember:v3";
const DEFAULTS = {
  focusMin:25, breakMin:5, longMin:15, longEvery:4, countdownMin:10,
  autoBreak:true, autoFocus:false, chime:true, duck:true, notify:false,
  theme:"midnight", flowDivisor:5, photo:"", museumDim:60,
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
const pad = (n) => String(n).padStart(2,"0");
/* Local date key, not UTC — an 8pm session in UTC-5 belongs to today, not tomorrow. */
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today = () => dayKey();
const fmt = (ms) => {
  const t = Math.max(0, Math.round(ms/1000));
  const h = Math.floor(t/3600), m = Math.floor((t%3600)/60), s = t%60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/* Pull an 11-char video id out of whatever the user pasted — watch links,
   youtu.be, /embed/, /shorts/, or a bare id. */
const parseVideoId = (raw) => {
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

const polar = (cx,cy,r,deg) => { const a = deg*Math.PI/180; return [cx + r*Math.sin(a), cy - r*Math.cos(a)]; };
const arcPath = (cx,cy,r,a0,a1) => {
  const [x0,y0] = polar(cx,cy,r,a0), [x1,y1] = polar(cx,cy,r,a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${Math.abs(a1-a0) > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

/* Keys for the last n days, oldest first. Built off local dates so the
   week view lines up with what the user actually calls "today". */
const lastDays = (n) => {
  const out = [];
  const d = new Date();
  for (let i = n-1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate()-i);
    out.push({ key: dayKey(x), label: x.toLocaleDateString([], { weekday:"narrow" }) });
  }
  return out;
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
function useStation(list) {
  const player = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);
  const [vol, setVol] = useState(45);
  const pending = useRef(null);
  /* The list grows when the user pastes a URL; keep a ref so the callbacks
     below don't close over a stale copy. */
  const stations = useRef(list);
  stations.current = list;

  useEffect(() => {
    let dead = false;
    const build = () => {
      if (dead || !window.YT || !window.YT.Player) return;
      player.current = new window.YT.Player("em-yt-host", {
        height: "1", width: "1", videoId: stations.current[0].id,
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
    const L = stations.current;
    const n = ((i % L.length) + L.length) % L.length;
    setIdx(n);
    const go = () => {
      if (autoplay) player.current.loadVideoById(L[n].id);
      else player.current.cueVideoById(L[n].id);
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

  /* Short ticks hugging the ring. Long ones read as debris against a
     painted sky, so minors are barely more than a hairline. */
  const ticks = [];
  for (let i=0;i<=50;i++){
    const a = START + SWEEP*i/50, major = i%5===0;
    const [x1,y1] = polar(C,C,R+9,a), [x2,y2] = polar(C,C,R+(major?18:13),a);
    ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeLinecap="round"
      stroke={a <= setAngle ? tone : "currentColor"} strokeWidth={major?1.5:1}
      opacity={a <= setAngle ? (major?0.75:0.34) : (major?0.16:0.09)} />);
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
      <circle cx={C} cy={C} r={128} fill="url(#em-core)" className={running?"em-glow":""} opacity={running?1:0.28} />
      {ticks}
      <path d={arcPath(C,C,R,START,START+SWEEP)} fill="none" stroke="currentColor" strokeOpacity="0.13" strokeWidth="2.5" strokeLinecap="round" />
      <path d={arcPath(C,C,R,START,setAngle)} fill="none" stroke={tone} strokeWidth="2.5" strokeOpacity="0.26" strokeLinecap="round" />
      {progress > 0.001 && (
        <path d={arcPath(C,C,R,START,progAngle)} fill="none" stroke={tone} strokeWidth="5" strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 9px ${tone})` }} />
      )}
      {editable && (<g style={{ filter:`drop-shadow(0 2px 7px rgba(0,0,0,.4))` }}>
        <circle cx={kx} cy={ky} r="11" fill={tone} fillOpacity="0.22" stroke={tone} strokeWidth="2" />
        <circle cx={kx} cy={ky} r="3.5" fill={tone} />
      </g>)}
    </svg>
  );
}

/* ── small controls (kept out of the render body so they keep identity) ── */
function Step({ label, value, onChange, lim, suffix = "m" }) {
  return (
    <div className="em-step">
      <label>{label}</label>
      <button className="em-nudge" aria-label={`Decrease ${label}`}
        onClick={() => onChange(clamp(value-1, lim[0], lim[1]))}>−</button>
      <b>{value}{suffix}</b>
      <button className="em-nudge" aria-label={`Increase ${label}`}
        onClick={() => onChange(clamp(value+1, lim[0], lim[1]))}>+</button>
    </div>
  );
}

function Toggle({ on, set, children }) {
  return (
    <div className="em-pref">
      <span>{children}</span>
      <button className="em-toggle" aria-pressed={on} onClick={() => set(!on)}>
        <span className="em-knob" />
      </button>
    </div>
  );
}

/* Last seven days of focus minutes. Bars are relative to the best day,
   so the shape reads even when the absolute numbers are small. */
function WeekBars({ log }) {
  const days = useMemo(() => lastDays(7), []);
  const rows = days.map((d) => ({ ...d, minutes: log[d.key]?.minutes || 0 }));
  const peak = Math.max(30, ...rows.map((r) => r.minutes));
  const total = rows.reduce((a,r) => a + r.minutes, 0);
  const k = today();

  return (
    <>
      <div className="em-week" role="img"
        aria-label={`Focus minutes for the last seven days: ${rows.map((r) => `${r.label} ${r.minutes}`).join(", ")}`}>
        {rows.map((r) => (
          <div className="em-weekcol" key={r.key} title={`${r.key} — ${r.minutes} min`}>
            <div className="em-weekbar">
              <span style={{ height:`${Math.round((r.minutes/peak)*100)}%` }}
                className={r.key === k ? "on" : ""} />
            </div>
            <small className={r.key === k ? "on" : ""}>{r.label}</small>
          </div>
        ))}
      </div>
      <p className="em-note">{total} minutes across the week.</p>
    </>
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
  const [custom, setCustom] = useState([]);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState("");
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState(null);

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
  const allStations = useMemo(() => [...STATIONS, ...custom], [custom]);
  const station = useStation(allStations);

  const th = SCENES[cfg.theme] || SCENES.midnight;
  const dark = th.dark;
  /* Glass reads as a light film over a dark sky and a white film over a
     light one, so every tint flips with the scene rather than the theme name. */
  const vars = {
    "--sky": th.sky,
    "--paper": th.paper, "--muted": th.muted, "--accent": th.accent, "--rest": th.rest,
    "--onAccent": dark ? "#14172A" : "#FBF7EE",
    "--glass":      dark ? "rgba(255,255,255,0.08)"  : "rgba(255,255,255,0.42)",
    "--glassUp":    dark ? "rgba(255,255,255,0.16)"  : "rgba(255,255,255,0.72)",
    "--glassEdge":  dark ? "rgba(255,255,255,0.14)"  : "rgba(70,64,52,0.14)",
    "--glassEdge2": dark ? "rgba(255,255,255,0.28)"  : "rgba(70,64,52,0.26)",
    "--panel":      dark ? "rgba(28,30,46,0.62)"     : "rgba(252,249,242,0.72)",
    "--selectBg":   dark ? "rgba(30,32,48,0.9)"      : "rgba(252,249,242,0.95)",
    "--discHole":   dark ? "#171A2B"                 : "#EDE6D8",
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
          if (d.custom) setCustom(d.custom);
          if (d.currentId !== undefined) setCurrentId(d.currentId);

          /* Resume a block that was running when the page went away. The
             wall-clock deadline is what was saved, so time that passed while
             the tab was closed still counts against it. */
          const t = d.timer;
          if (t && t.mode) {
            setMode(t.mode); setPhase(t.phase); setDoneCount(t.doneCount || 0);
            const up = t.mode === "stopwatch" || (t.mode === "flowtime" && t.phase === "focus");
            if (up) {
              const el = t.running ? Date.now() - t.runFrom : (t.elapsed || 0);
              runFrom.current = Date.now() - el;
              setElapsed(el);
              setRunning(!!t.running);
            } else if (t.running) {
              const left = t.endAt - Date.now();
              /* Expired while away: land on zero, paused, rather than
                 firing a chime for a block that ended hours ago. */
              if (left > 0) { endAt.current = t.endAt; setRemaining(left); setRunning(true); }
              else setRemaining(0);
            } else if (t.remaining > 0) setRemaining(t.remaining);
          }
        }
      } catch (e) { /* nothing saved yet */ }
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  /* Live tick values, mirrored into a ref so the save effect can read them
     without re-running five times a second. endAt/runFrom are the real
     source of truth for a running block; these only matter when paused. */
  const snap = useRef({ elapsed:0, remaining:0 });
  snap.current = { elapsed, remaining };

  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(() => {
      const timer = {
        mode, phase, running, doneCount,
        elapsed: snap.current.elapsed, remaining: snap.current.remaining,
        endAt: endAt.current, runFrom: runFrom.current,
      };
      store.set(STORE_KEY, JSON.stringify({ cfg, tasks, log, currentId, custom, timer })).catch(() => {});
    }, 400);
    return () => clearTimeout(id);
  }, [cfg, tasks, log, currentId, custom, loaded, mode, phase, running, doneCount]);

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);


  /* Put the block in the tab title so the timer is readable from another tab. */
  useEffect(() => {
    const base = "Focus";
    const up = mode === "stopwatch" || (mode === "flowtime" && phase === "focus");
    if (!running) { document.title = base; return; }
    document.title = `${fmt(up ? elapsed : remaining)} · ${phase === "focus" ? "Focus" : "Break"}`;
    return () => { document.title = base; };
  }, [running, mode, elapsed, remaining, phase]);

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

  const notify = useCallback((body) => {
    if (!cfg.notify || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    try { new Notification("Focus", { body, tag:"em-block" }); } catch { /* denied or unsupported */ }
  }, [cfg.notify]);

  const advance = useCallback(() => {
    if (cfg.chime) chime(phase !== "focus");
    notify(phase === "focus" ? "Block finished — take a break." : "Break over — back to it.");
    if (mode === "countdown" || mode === "stopwatch") { setRunning(false); setRemaining(phaseLen(phase)); return; }

    if (mode === "flowtime") {
      if (phase === "focus") {
        const mins = elapsed/60000;
        record(mins);
        const br = clamp(Math.round(mins/cfg.flowDivisor), 3, 20);
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
  }, [cfg, chime, notify, doneCount, mode, phase, phaseLen, record, elapsed]);

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
      const k = dayKey(d);
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

  const moveTask = (id, dir) => setTasks((L) => {
    const i = L.findIndex((t) => t.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= L.length) return L;
    const next = [...L];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  /* Selecting the new station has to wait until the merged list has actually
     re-rendered — load() reads the list from a ref, which is a render behind. */
  const selectAfterAdd = useRef(false);
  useEffect(() => {
    if (!selectAfterAdd.current) return;
    selectAfterAdd.current = false;
    station.load(allStations.length - 1, station.playing);
  }, [allStations.length]); // eslint-disable-line

  const addStation = (e) => {
    if (e.key !== "Enter") return;
    const id = parseVideoId(urlDraft);
    if (!id) { setUrlError("That doesn't look like a YouTube link."); return; }
    if (allStations.some((s) => s.id === id)) { setUrlError("Already in the list."); return; }
    selectAfterAdd.current = true;
    setCustom((L) => [...L, { id, title:"Your station", by:"added by you", mine:true }]);
    setUrlDraft(""); setUrlError("");
  };

  const label = mode === "stopwatch" ? "Counting up"
    : mode === "countdown" ? "Countdown"
    : mode === "flowtime" ? (phase === "focus" ? "Flowing" : "Earned break")
    : phase === "focus" ? "Focus" : phase === "break" ? "Short break" : "Long break";

  const setField = useCallback((field) => (v) => setCfg((c) => ({ ...c, [field]: v })), []);

  const hour = new Date(now).getHours();
  const greeting = hour < 5 ? "Still up" : hour < 12 ? "Good morning"
    : hour < 18 ? "Good afternoon" : "Good evening";
  /* One quote per day, keyed on the date so it holds steady across ticks
     and rolls over at midnight. */
  const dayk = dayKey(new Date(now));
  const quote = useMemo(() => {
    let h = 0;
    for (let i = 0; i < dayk.length; i++) h = (h*31 + dayk.charCodeAt(i)) | 0;
    return QUOTES[Math.abs(h) % QUOTES.length];
  }, [dayk]);

  /* Esc closes whatever panel is open. */
  useEffect(() => {
    if (!panel) return;
    const h = (e) => { if (e.key === "Escape") setPanel(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [panel]);

  /* Turning notifications on has to ask the browser first — and the ask only
     works inside a user gesture, which this click is. */
  const askNotify = useCallback((want) => {
    if (!want || typeof Notification === "undefined") { setCfg((c) => ({ ...c, notify:false })); return; }
    if (Notification.permission === "granted") { setCfg((c) => ({ ...c, notify:true })); return; }
    if (Notification.permission === "denied") return;
    Notification.requestPermission().then((p) => setCfg((c) => ({ ...c, notify: p === "granted" })));
  }, []);

  const st = allStations[station.idx] || allStations[0];
  const clock = fmt(countUp ? elapsed : remaining);

  /* Everything the museum has ever been paid in. */
  const lifetime = useMemo(
    () => Object.values(log).reduce((a, d) => a + (d.minutes || 0), 0), [log]);
  const halls = hallsFor(lifetime);
  const nextAt = threshold(halls);

  /* Announce a new hall for a few seconds, then let it go. */
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);


  /* Dock icons, drawn inline so nothing loads. */
  const ICONS = {
    tasks:  <><path d="M4 6h10M4 11h10M4 16h6"/><path d="M17 5l2 2 3-3.5"/></>,
    sounds: <><path d="M4 9v6h3l5 4V5L7 9H4z"/><path d="M16 8a5 5 0 0 1 0 8"/></>,
    music:  <><circle cx="7" cy="17" r="3"/><path d="M10 17V5l10-2v12"/><circle cx="17" cy="15" r="3"/></>,
    stats:  <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    prefs:  <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></>,
  };

  const DockBtn = ({ id, label, dot }) => (
    <button className="em-dockbtn" aria-expanded={panel === id} aria-label={label}
      onClick={() => setPanel((p) => (p === id ? null : id))}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[id]}</svg>
      <span>{label}</span>
      {dot && <i className="em-dot" />}
    </button>
  );

  const titles = { tasks:"Tasks", sounds:"Ambience", music:"Station", stats:"Focus", prefs:"Preferences" };
  const anySound = Object.values(levels).some((v) => v > 0);

  return (
    <div className={`em-root${dark ? "" : " light"}`} style={vars}>
      <style>{CSS}</style>

      <div className="em-sky" />
      {cfg.photo && <div className="em-photo" style={{ backgroundImage:`url("${cfg.photo}")` }} />}
      {th.art && <Museum minutes={lifetime} dim={cfg.museumDim/100} onOpen={setToast} />}
      <div className="em-bloom" /><div className="em-vignette" /><div className="em-grain" />
      <div className="em-yt"><div id="em-yt-host" /></div>

      <div className="em-shell">
        <div className="em-topbar">
          <div className="em-mono em-streak">
            {new Date(now).toLocaleTimeString([], { hour:"numeric", minute:"2-digit" })}
            <span style={{ opacity:.6, marginLeft:12 }}>
              {streak > 0 ? `${streak} day streak` : "no streak yet"}
            </span>
          </div>
          <div className="em-scenes" role="group" aria-label="Scene">
            {Object.entries(SCENES).map(([k,s]) => (
              <button key={k} className="em-chip" aria-pressed={cfg.theme===k} aria-label={s.name}
                title={s.name} style={{ background:s.chip }}
                onClick={() => setCfg((c) => ({ ...c, theme:k }))} />
            ))}
          </div>
        </div>

        <div className="em-hero">
          <p className="em-greet">
            <b>{greeting}.</b>{" "}
            <span style={{ opacity:.72 }}>
              {current ? "One thing at a time." : "What deserves your attention?"}
            </span>
          </p>

          <div className="em-modes" role="group" aria-label="Timer mode">
            {["pomodoro","flowtime","countdown","stopwatch"].map((m) => (
              <button key={m} className="em-mode" aria-pressed={mode===m}
                onClick={() => switchMode(m)}>{m}</button>
            ))}
          </div>

          <div className="em-dialwrap">
            <Dial value={cfg[dialField]} min={dMin} max={dMax} progress={progress}
              editable={editable} tone={tone} running={running}
              onChange={(v) => setCfg((c) => ({ ...c, [dialField]: v }))} />
            <div className="em-readout">
              <div className={`em-time${clock.length > 5 ? " long" : ""}`}>{clock}</div>
              <div className="em-phase">{label}</div>
              {editable && <div className="em-hint">Drag the ring to change this block</div>}
              {mode === "flowtime" && phase === "focus" && (
                <div className="em-hint">Stop when you want. Your break scales to what you did.</div>
              )}
            </div>
          </div>

          {/* Only present when a task is actually picked — most sessions
              never touch tasks, and an empty placeholder just steals room
              from the timer. */}
          {current && <div className="em-task"><b>{current.text}</b></div>}

          <div className="em-controls">
            <button className={`em-btn primary${phase !== "focus" ? " rest" : ""}`} onClick={toggle}>
              {running ? "Pause" : (countUp && elapsed > 0) ? "Resume" : "Start"}
            </button>
            <button className="em-btn" onClick={reset}>Reset</button>
            {mode === "pomodoro" && <button className="em-btn" onClick={() => { blip(true); skip(); }}>Skip</button>}
            {mode === "flowtime" && phase === "focus" && (
              <button className="em-btn" disabled={elapsed < 60000}
                onClick={() => { blip(true); skip(); }}>Take my break</button>
            )}
          </div>

          {mode === "flowtime" && (
            <div className="em-cycle">
              <Step label="Break is 1 /" value={cfg.flowDivisor} onChange={setField("flowDivisor")}
                lim={LIMITS.flow} suffix="" />
              <span className="em-note" style={{ margin:0 }}>of what you worked</span>
            </div>
          )}

          {mode === "pomodoro" && (
            <div className="em-cycle">
              <div className="em-pips"
                aria-label={`${doneCount % cfg.longEvery} of ${cfg.longEvery} blocks before the long break`}>
                {Array.from({ length: cfg.longEvery }).map((_,i) => (
                  <span key={i} className={`em-pip${i < (doneCount % cfg.longEvery) || (doneCount>0 && doneCount%cfg.longEvery===0) ? " on":""}`} />
                ))}
                <span style={{ opacity:.45, fontSize:11, margin:"0 2px" }}>→</span>
                <span className={`em-pip long${phase==="long" ? " on":""}`} />
              </div>
              <Step label="Break" value={cfg.breakMin} onChange={setField("breakMin")} lim={LIMITS.break} />
              <Step label="Long" value={cfg.longMin} onChange={setField("longMin")} lim={LIMITS.long} />
              <Step label="Every" value={cfg.longEvery} onChange={setField("longEvery")} lim={[2,8]} suffix="" />
            </div>
          )}
        </div>

        {/* The announcement takes the quote's slot rather than floating over
            the page, which is the one place guaranteed to be clear. */}
        {toast ? (
          <div className="em-toast" role="status">
            <span className="em-mono">A new wing opens</span>
            <b>{toast}</b>
          </div>
        ) : (
          <p className="em-quote">{quote}</p>
        )}

        <div className="em-dock">
          <div className="em-dockinner">
            <DockBtn id="tasks"  label="Tasks"  dot={tasks.some((t) => !t.done)} />
            <DockBtn id="sounds" label="Sounds" dot={anySound} />
            <DockBtn id="music"  label="Music"  dot={station.playing} />
            <DockBtn id="stats"  label="Focus" />
            <DockBtn id="prefs"  label="Settings" />
          </div>
        </div>
      </div>

      {panel && (
        <>
          <button className="em-scrim" aria-label="Close panel" onClick={() => setPanel(null)} />
          <div className="em-panel" role="dialog" aria-modal="false" aria-label={titles[panel]}>
            <div className="em-panelhead">
              <h3>{titles[panel]}</h3>
              <button className="em-close" aria-label="Close" onClick={() => setPanel(null)}>✕</button>
            </div>

            {panel === "tasks" && (
              <>
                <input className="em-input" value={draft} placeholder="Add a task, press enter"
                  aria-label="New task"
                  onChange={(e) => setDraft(e.target.value)} onKeyDown={addTask} />
                {tasks.length === 0 ? (
                  <p className="em-note">Nothing here yet. Add the one thing you want finished today.</p>
                ) : (
                  <ul className="em-tasks">
                    {tasks.map((t,i) => (
                      <li key={t.id} className="em-taskrow">
                        <button className={`em-check${t.done?" done":""}`}
                          aria-label={t.done?`Mark "${t.text}" unfinished`:`Mark "${t.text}" finished`}
                          onClick={() => { blip(!t.done); setTasks((L) => L.map((x) => x.id===t.id ? { ...x, done:!x.done } : x)); if (currentId===t.id) setCurrentId(null); }} />
                        <button className={`em-tasktext${t.done?" done":""}${currentId===t.id && !t.done ? " current":""}`}
                          onClick={() => setCurrentId(t.done ? null : t.id)}>{t.text}</button>
                        <button className="em-x" aria-label={`Move "${t.text}" up`} disabled={i === 0}
                          onClick={() => moveTask(t.id, -1)}>↑</button>
                        <button className="em-x" aria-label={`Move "${t.text}" down`} disabled={i === tasks.length-1}
                          onClick={() => moveTask(t.id, 1)}>↓</button>
                        <button className="em-x" aria-label={`Remove "${t.text}"`}
                          onClick={() => { setTasks((L) => L.filter((x) => x.id!==t.id)); if (currentId===t.id) setCurrentId(null); }}>✕</button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {panel === "sounds" && (
              <>
                {LAYERS.map((l) => (
                  <div className="em-sound" key={l.id}>
                    <span className={levels[l.id] > 0 ? "live" : ""}>{l.name}</span>
                    <input className="em-slider" type="range" min="0" max="100" value={levels[l.id]}
                      aria-label={`${l.name} volume`}
                      onChange={(e) => { const v = +e.target.value; setLevels((L) => ({ ...L, [l.id]:v })); setLevel(l.id, v/100); }} />
                  </div>
                ))}
                <p className="em-note">Layer these under the music. All generated live, so nothing loads.</p>
              </>
            )}

            {panel === "music" && (
              station.failed ? (
                <p className="em-note" style={{ marginTop:0 }}>
                  The YouTube player couldn't load — usually a blocker or an extension cutting off
                  the embed. The ambience panel is synthesised locally and works regardless.
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
                  <select className="em-select" value={station.idx} aria-label="Choose a station"
                    onChange={(e) => station.load(+e.target.value, station.playing)}>
                    {allStations.map((s,i) => <option key={s.id} value={i}>{s.title} — {s.by}</option>)}
                  </select>
                  <input className="em-input" value={urlDraft} placeholder="Paste a YouTube URL, press enter"
                    aria-label="Add your own station by URL"
                    aria-invalid={urlError ? "true" : undefined}
                    onChange={(e) => { setUrlDraft(e.target.value); setUrlError(""); }}
                    onKeyDown={addStation} />
                  {urlError && <p className="em-note" role="alert" style={{ color:"var(--accent)", opacity:1 }}>{urlError}</p>}
                  {st.mine && (
                    <button className="em-btn" style={{ marginTop:12, padding:"8px 14px" }}
                      onClick={() => { setCustom((L) => L.filter((s) => s.id !== st.id)); station.load(0, false); }}>
                      Remove this station
                    </button>
                  )}
                  {!station.ready && <p className="em-note">Loading the player…</p>}
                </>
              )
            )}

            {panel === "stats" && (
              <>
                <div className="em-stats">
                  <div className="em-stat"><b>{stat.sessions}</b><small>Blocks</small></div>
                  <div className="em-stat"><b>{stat.minutes}</b><small>Minutes</small></div>
                  <div className="em-stat"><b>{streak}</b><small>Day streak</small></div>
                </div>
                <WeekBars log={log} />
                <div className="em-museumrow">
                  <div>
                    <div className="em-nowtitle">{hallAt(halls-1).name}</div>
                    <div className="em-nowby">{halls} of 28 halls · {lifetime} min all time</div>
                  </div>
                </div>
                <div className="em-bar" role="img"
                  aria-label={`${nextAt - lifetime} minutes until the next hall opens`}>
                  <span style={{ width:`${Math.round(
                    ((lifetime - threshold(halls-1)) / (nextAt - threshold(halls-1))) * 100)}%` }} />
                </div>
                <p className="em-note">
                  {halls >= 28 ? "The museum is complete."
                    : `${nextAt - lifetime} more minutes opens the next wing.`}
                </p>
              </>
            )}

            {panel === "prefs" && (
              <>
                <Toggle on={cfg.autoBreak} set={setField("autoBreak")}>Start breaks automatically</Toggle>
                <Toggle on={cfg.autoFocus} set={setField("autoFocus")}>Start the next block automatically</Toggle>
                <Toggle on={cfg.chime} set={setField("chime")}>Chime when a block ends</Toggle>
                <Toggle on={cfg.duck} set={setField("duck")}>Lower the music on breaks</Toggle>
                <Toggle on={cfg.notify} set={askNotify}>Notify me when a block ends</Toggle>
                {/* Only meaningful on the Museum scene, so it appears with it. */}
                {th.art && (
                  <div className="em-sound">
                    <span>Museum</span>
                    <input className="em-slider" type="range" min="15" max="100"
                      value={cfg.museumDim} aria-label="Museum brightness"
                      onChange={(e) => setCfg((c) => ({ ...c, museumDim:+e.target.value }))} />
                  </div>
                )}
                <input className="em-input" defaultValue={cfg.photo || ""}
                  placeholder="Background image URL (optional)" aria-label="Background image URL"
                  onKeyDown={(e) => { if (e.key === "Enter") setCfg((c) => ({ ...c, photo: e.target.value.trim() })); }} />
                <p className="em-note">
                  Press space to start or pause, Esc to close a panel. Your timer, tasks and
                  stats stay in this browser.
                </p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
