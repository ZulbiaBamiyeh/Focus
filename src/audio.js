import { useRef, useState, useEffect, useCallback } from "react";
import { STATIONS } from "./lib.js";

/* ── ambience + effects: all synthesised, nothing downloads ─ */
export function useAudio() {
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
export function useStation(list) {
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

