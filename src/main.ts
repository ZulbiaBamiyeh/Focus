// Focus: a timer with an island that grows one thing per focus block.
//
// Wiring only. The timer keeps time, the garden records what was earned,
// the world draws it, the HUD shows it, and this file saves all of it.
import './styles.css';
import { Timer, type TimerCfg, type TimerSnap, LIMITS } from './timer';
import { Station } from './station';
import { newGarden, plant, Layout, KIND_INFO, nextMilestone, type GardenData } from './garden';
import { World } from './world/world';
import { Hud, type App, type Prefs } from './ui';
import { load, save } from './store';
import { clamp, prefersReducedMotion } from './util';
import { chime, plantChime, tick as tickSound, unlockAudio } from './sfx';
import type { StationInfo } from './station';

interface Saved {
  cfg: TimerCfg;
  timer: TimerSnap;
  garden: GardenData;
  prefs: Prefs;
  station: { idx: number; vol: number; custom: StationInfo[] };
}

const DEFAULT_CFG: TimerCfg = {
  focusMin: 25, breakMin: 5, longMin: 15, longEvery: 4, flowDivisor: 5, countdownMin: 45, autoNext: true,
};
const DEFAULT_PREFS: Prefs = {
  chime: true, notify: false, duck: true, showSeconds: true, quality: 'auto', calm: prefersReducedMotion(),
};

const saved = load<Saved>() ?? {};
const cfg: TimerCfg = { ...DEFAULT_CFG, ...saved.cfg };
const prefs: Prefs = { ...DEFAULT_PREFS, ...saved.prefs };
const garden: GardenData = saved.garden?.items ? { ...newGarden(), ...saved.garden } : newGarden();

const timer = new Timer(cfg);
if (saved.timer) timer.restore(saved.timer);

const station = new Station();
station.custom = saved.station?.custom ?? [];
station.vol = saved.station?.vol ?? 45;
station.idx = clamp(saved.station?.idx ?? 0, 0, station.list.length - 1);

let layout = new Layout(garden.seed);

const world = new World(
  document.getElementById('world') as HTMLCanvasElement,
  garden.seed, garden.items.length, prefs.quality, prefs.calm,
);

let saveTimer = 0;
function persist(now = false) {
  const write = () => save({
    cfg, prefs, garden, timer: timer.snapshot(),
    station: { idx: station.idx, vol: station.vol, custom: station.custom },
  } satisfies Saved);
  clearTimeout(saveTimer);
  if (now) write(); else saveTimer = window.setTimeout(write, 400);
}

const app: App = {
  timer, station, garden, prefs, get layout() { return layout; },
  setLength(field, v) {
    const [lo, hi] = LIMITS[field];
    cfg[field] = clamp(Math.round(v), lo, hi);
    timer.lengthsChanged();
  },
  setAutoNext(on) { cfg.autoNext = on; },
  setPref(k, v) {
    if (k === 'notify' && v) {
      if (typeof Notification === 'undefined') { hud.toast('This browser has no notifications.'); return; }
      void Notification.requestPermission().then((p) => {
        prefs.notify = p === 'granted';
        if (!prefs.notify) hud.toast('Notifications are blocked for this site.');
        sync();
      });
      return;
    }
    prefs[k] = v;
    if (k === 'quality') world.setQuality(prefs.quality);
    if (k === 'calm') world.setReduced(prefs.calm);
  },
  resetGarden() {
    garden.items = [];
    garden.minutes = 0;
    garden.seed = newGarden().seed;
    layout = new Layout(garden.seed);
    // A new seed means a new shape: the world is rebuilt from scratch.
    persist(true);
    location.reload();
  },
  changed: () => { sync(); persist(); },
};

const hud = new Hud(document.getElementById('hud')!, app);
world.onNight = (n) => hud.setNight(n);
station.onChange = () => { hud.render(); if (hud.stationOpen) hud.renderStation(); persist(); };

function notify(body: string) {
  if (!prefs.notify || !document.hidden || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try { new Notification('Focus', { body, tag: 'focus' }); } catch { /* blocked */ }
}

timer.onPhaseEnd = (phase, natural) => {
  if (natural && prefs.chime) chime(phase !== 'focus');
  if (!natural) tickSound(false);
  if (natural) {
    const msg = phase === 'focus' ? 'Block done. Take a break.' : 'Break over. Back to it.';
    hud.announce(msg);
    notify(msg);
  }
};

timer.onFocusEnd = ({ focusedMs, earned }) => {
  const mins = focusedMs / 60_000;
  garden.minutes += mins;
  if (earned) {
    const i = garden.items.length;
    const kind = layout.get(i).kind;
    plant(garden, mins);
    world.plant();
    plantChime();
    const info = KIND_INFO[kind];
    const nm = nextMilestone(i + 1);
    const tail = nm && nm.in <= 3 ? ` ${KIND_INFO[nm.kind].name} in ${nm.in}.` : '';
    hud.toast(`${info.structure ? `The ${info.name.toLowerCase()} is built` : `${info.name} took root`}.${tail}`);
    persist(true);
  } else if (mins >= 1) {
    hud.toast('Ended early, so the sprout went back to sleep.');
  }
};

// Running blocks are saved as timestamps, so nothing needs writing per tick:
// only when the phase, mode or run state moves.
let lastKey = '';
function sync() {
  timer.tick();
  hud.render();
  const focus = timer.phase === 'focus';
  // Count-up has no end, so its sun approaches golden hour without reaching it.
  const u = timer.countUp ? 1 - Math.exp(-timer.elapsed / (30 * 60_000)) : timer.progress();
  world.setState({ phase: timer.phase, u, running: timer.running, grow: focus ? timer.progress() : null });
  world.setFps(prefs.calm ? 8 : timer.running ? 30 : 24);
  station.duck(prefs.duck && !focus && timer.running);
  const key = `${timer.mode}|${timer.phase}|${timer.running}|${timer.doneCount}`;
  if (key !== lastKey) { lastKey = key; persist(); }
}

setInterval(sync, 250);
sync();

document.addEventListener('keydown', (e) => hud.key(e));
// Audio contexts need a gesture; the first one anywhere unlocks the chime.
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
document.addEventListener('fullscreenchange', () => hud.render());
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(true); else sync(); });
window.addEventListener('pagehide', () => persist(true));
