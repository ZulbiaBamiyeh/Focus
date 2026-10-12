// The HUD over the island. Plain DOM: one template, then small targeted
// updates, so re-rendering never steals focus from the button you pressed.
import { fmt, fmtDuration, clamp, dayKey, parseVideoId as parseId } from './util';
import { LIMITS, type Mode, type Phase, type Timer, type TimerCfg } from './timer';
import type { Station } from './station';
import { KIND_INFO, kindAt, nextMilestone, todayCount, Layout, type GardenData } from './garden';
import { QUALITY_MODES, type QualityMode } from './world/engine';

export interface Prefs {
  chime: boolean; notify: boolean; duck: boolean; showSeconds: boolean;
  quality: QualityMode; calm: boolean;
}

export interface App {
  timer: Timer; station: Station; garden: GardenData; prefs: Prefs; layout: Layout;
  setLength(field: keyof Omit<TimerCfg, 'autoNext'>, v: number): void;
  setAutoNext(on: boolean): void;
  setPref<K extends keyof Prefs>(k: K, v: Prefs[K]): void;
  resetGarden(): void;
  changed(): void;
}

const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><rect x="6.5" y="5" width="4" height="14" rx="1.3"/><rect x="13.5" y="5" width="4" height="14" rx="1.3"/></svg>',
  reset: '<svg viewBox="0 0 24 24"><path d="M4 5v5h5"/><path d="M4.6 13a7.6 7.6 0 1 0 1.9-6.2L4 10"/></svg>',
  skip: '<svg viewBox="0 0 24 24"><path d="M6 5.5l9 6.5-9 6.5z"/><path d="M18 5.5v13"/></svg>',
  done: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.5 7.5 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.5A7.5 7.5 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.5 7.5 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4.9 2-3.4z"/></svg>',
  full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  exit: '<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
  sprout: '<svg viewBox="0 0 24 24"><path d="M12 21v-8"/><path d="M12 13c0-4 3-7 8-7 0 4-3 7-8 7z" fill="currentColor" fill-opacity=".25"/><path d="M12 15c0-3-2.5-5.5-7-5.5 0 3 2.5 5.5 7 5.5z" fill="currentColor" fill-opacity=".25"/></svg>',
  island: '<svg viewBox="0 0 24 24"><path d="M3 12h18l-4 4-5 5-5-5z"/><path d="M12 12V6"/><path d="M12 6c-1.5-2-4-2.5-6-1.5M12 6c1.5-2 4-2.5 6-1.5M12 6c-1 1.5-1 3.5 0 4"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M18 6l-8 6 8 6z"/><path d="M6 6v12"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M6 6l8 6-8 6z"/><path d="M18 6v12"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h7"/><circle cx="4.5" cy="6" r=".8"/><circle cx="4.5" cy="12" r=".8"/><circle cx="4.5" cy="18" r=".8"/></svg>',
  wave: '<svg viewBox="0 0 24 24"><path d="M4 10v4M8 7v10M12 9v6M16 5v14M20 10v4"/></svg>',
};

const MODE_LABEL: Record<Mode, string> = { pomodoro: 'Pomodoro', flowtime: 'Flowtime', countdown: 'Countdown', stopwatch: 'Stopwatch' };
const PHASE_LABEL: Record<Phase, string> = { focus: 'Focus', break: 'Short break', long: 'Long break' };

const STEPS: { field: keyof Omit<TimerCfg, 'autoNext'>; label: string; hint?: string; modes: Mode[]; unit: string }[] = [
  { field: 'focusMin', label: 'Focus', modes: ['pomodoro'], unit: 'min' },
  { field: 'breakMin', label: 'Short break', modes: ['pomodoro'], unit: 'min' },
  { field: 'longMin', label: 'Long break', modes: ['pomodoro'], unit: 'min' },
  { field: 'longEvery', label: 'Long break every', modes: ['pomodoro'], unit: '' },
  { field: 'flowDivisor', label: 'Break divisor', hint: 'Break = focus time ÷ this, 3–20 min', modes: ['flowtime'], unit: '÷' },
  { field: 'countdownMin', label: 'Countdown length', modes: ['countdown'], unit: 'min' },
];

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export class Hud {
  private root: HTMLElement;
  private el: Record<string, HTMLElement> = {};
  private editing = false;
  private toastTimer = 0;
  private lastFocus: HTMLElement | null = null;

  constructor(host: HTMLElement, private app: App) {
    this.root = host;
    host.innerHTML = this.template();
    for (const n of host.querySelectorAll<HTMLElement>('[data-el]')) this.el[n.dataset.el!] = n;
    this.bind();
    this.renderSettings();
    this.render();
  }

  private template() {
    return `
      <header class="top">
        <div class="left">
        <div class="brand">${ICON.island}<span>Focus</span></div>
        <nav class="modes glass" role="tablist" aria-label="Timer mode" data-el="modes">
          ${(Object.keys(MODE_LABEL) as Mode[]).map((m) => `<button role="tab" data-mode="${m}">${MODE_LABEL[m]}</button>`).join('')}
        </nav>
        </div>
        <button class="chip glass" data-el="chip" data-act="journal" aria-haspopup="dialog" aria-expanded="false" aria-controls="p-journal" title="Island journal (J)">
          ${ICON.sprout}<b data-el="chipN">0</b><span>planted</span>
        </button>
      </header>

      <main class="clock">
        <div class="phases" data-el="phases"></div>
        <button class="time" data-el="time" aria-live="off"></button>
        <input class="time-edit" data-el="timeEdit" type="number" inputmode="numeric" hidden aria-label="Minutes" />
        <div class="time-hint" data-el="hint"></div>
        <div class="growing" data-el="growing"><span data-el="growText"></span><span class="bar" data-el="barWrap"><i data-el="bar"></i></span></div>
        <div class="pips" data-el="pips" aria-hidden="true"></div>
        <div class="sr" aria-live="polite" data-el="live"></div>
      </main>

      <footer class="dock">
        <div class="station glass" data-el="station">
          <button class="disc" data-el="disc" title="Play / pause music (M)" aria-label="Play music"></button>
          <div class="meta"><b data-el="stTitle"></b><small data-el="stBy"></small></div>
          <button class="mini" data-act="st-next" aria-label="Next station">${ICON.next}</button>
          <button class="mini" data-act="st-list" aria-label="All stations" aria-haspopup="dialog" aria-expanded="false" aria-controls="p-station" data-el="stListBtn">${ICON.list}</button>
        </div>
        <div class="controls">
          <button class="round glass" data-act="reset" aria-label="Reset (R)" title="Reset (R)">${ICON.reset}</button>
          <button class="play" data-el="play" data-act="toggle" aria-label="Start (Space)"></button>
          <button class="round glass" data-el="skip" data-act="skip"></button>
        </div>
        <div class="tools">
          <button class="round glass only-narrow" data-act="journal" aria-label="Island journal (J)" aria-haspopup="dialog" aria-controls="p-journal">${ICON.sprout}</button>
          <button class="round glass" data-act="settings" data-el="setBtn" aria-label="Settings (,)" title="Settings (,)" aria-haspopup="dialog" aria-expanded="false" aria-controls="p-settings">${ICON.gear}</button>
          <button class="round glass" data-act="full" data-el="fullBtn" aria-label="Fullscreen (F)" title="Fullscreen (F)">${ICON.full}</button>
        </div>
      </footer>

      <section class="panel" id="p-settings" data-at="br" role="dialog" aria-label="Settings" data-el="pSettings"></section>
      <section class="panel" id="p-station" data-at="bl" role="dialog" aria-label="Music station" data-el="pStation"></section>
      <section class="panel" id="p-journal" data-at="tr" role="dialog" aria-label="Island journal" data-el="pJournal"></section>
      <div class="toast" data-el="toast" role="status"></div>
    `;
  }

  // ── events ──────────────────────────────────────────────
  private bind() {
    const a = this.app;
    this.root.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-mode],[data-phase]');
      if (!t) return;
      if (t.dataset.mode) { a.timer.setMode(t.dataset.mode as Mode); this.renderSettings(); a.changed(); return; }
      if (t.dataset.phase) { a.timer.goPhase(t.dataset.phase as Phase); a.changed(); return; }
      this.act(t.dataset.act!, t);
    });

    this.el.disc.addEventListener('click', () => { a.station.toggle(); });

    this.el.time.addEventListener('click', () => this.startEdit());
    const te = this.el.timeEdit as HTMLInputElement;
    te.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.commitEdit(true);
      if (e.key === 'Escape') { e.stopPropagation(); this.commitEdit(false); }
    });
    te.addEventListener('blur', () => this.commitEdit(true));

    // Esc and outside clicks close panels.
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closePanels(); });
    document.addEventListener('pointerdown', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('.panel') || t.closest('[aria-haspopup]')) return;
      this.closePanels(false);
    });
  }

  act(act: string, t?: HTMLElement) {
    const a = this.app;
    switch (act) {
      case 'toggle': a.timer.toggle(); break;
      case 'reset': a.timer.reset(); break;
      case 'skip': a.timer.skip(); break;
      case 'full':
        if (document.fullscreenElement) void document.exitFullscreen?.();
        else void document.documentElement.requestFullscreen?.().catch(() => {});
        break;
      case 'settings': this.togglePanel('pSettings', this.el.setBtn); break;
      case 'journal': this.togglePanel('pJournal', t ?? this.el.chip); break;
      case 'st-list': this.togglePanel('pStation', this.el.stListBtn); break;
      case 'st-next': a.station.load(a.station.idx + 1, a.station.playing); break;
      case 'st-prev': a.station.load(a.station.idx - 1, a.station.playing); break;
      case 'close': this.closePanels(); break;
      default: {
        if (act.startsWith('step:') && t) {
          const [, field, dir] = act.split(':');
          const f = field as keyof Omit<TimerCfg, 'autoNext'>;
          a.setLength(f, a.timer.cfg[f] + Number(dir));
          this.syncSettings();
        } else if (act.startsWith('pref:')) {
          const k = act.slice(5) as keyof Prefs;
          if (k === 'quality' && t) a.setPref('quality', t.dataset.v as QualityMode);
          else a.setPref(k, !a.prefs[k] as never);
          this.syncSettings();
        } else if (act === 'autoNext') {
          a.setAutoNext(!a.timer.cfg.autoNext);
          this.syncSettings();
        } else if (act === 'reset-garden') {
          if (t?.dataset.armed) { a.resetGarden(); t.removeAttribute('data-armed'); t.textContent = 'Start a new island'; }
          else { t!.dataset.armed = '1'; t!.textContent = 'Tap again: this clears your island'; }
        } else if (act.startsWith('st:') ) {
          a.station.load(Number(act.slice(3)), true);
        } else if (act.startsWith('st-rm:')) {
          a.station.remove(act.slice(6));
        } else if (act === 'st-add') {
          this.addStation();
        } else if (act === 'st-duck') {
          a.setPref('duck', !a.prefs.duck);
        }
      }
    }
    a.changed();
  }

  /** Keyboard shortcuts. Ignored while typing or with a modifier held. */
  key(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const el = e.target as HTMLElement;
    const tag = (el.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || el.isContentEditable) return;
    const k = e.key.toLowerCase();
    const t = this.app.timer;
    const map: Record<string, () => void> = {
      ' ': () => this.act('toggle'), r: () => this.act('reset'), s: () => this.act('skip'),
      f: () => this.act('full'), ',': () => this.act('settings'), j: () => this.act('journal'),
      m: () => this.app.station.toggle(),
      '1': () => { t.goPhase('focus'); this.app.changed(); },
      '2': () => { t.goPhase('break'); this.app.changed(); },
      '3': () => { t.goPhase('long'); this.app.changed(); },
    };
    if (e.code === 'Space' && el.tagName === 'BUTTON') return; // let the focused button take it
    const fn = map[e.code === 'Space' ? ' ' : k];
    if (fn) { e.preventDefault(); fn(); }
  }

  // ── panels ──────────────────────────────────────────────
  private togglePanel(name: string, opener: HTMLElement) {
    const p = this.el[name];
    const open = !p.classList.contains('open');
    this.closePanels(false);
    if (!open) return;
    if (name === 'pJournal') this.renderJournal();
    if (name === 'pStation') this.renderStation();
    if (name === 'pSettings') this.syncSettings();
    p.classList.add('open');
    opener.setAttribute('aria-expanded', 'true');
    this.lastFocus = opener;
    requestAnimationFrame(() => p.querySelector<HTMLElement>('button, input')?.focus({ preventScroll: true }));
  }

  private closePanels(restore = true) {
    let had = false;
    for (const n of ['pSettings', 'pStation', 'pJournal']) {
      if (this.el[n].classList.contains('open')) had = true;
      this.el[n].classList.remove('open');
    }
    for (const b of this.root.querySelectorAll<HTMLElement>('[aria-haspopup]')) b.setAttribute('aria-expanded', 'false');
    for (const b of this.root.querySelectorAll<HTMLElement>('[data-armed]')) { b.removeAttribute('data-armed'); b.textContent = 'Start a new island'; }
    if (had && restore) this.lastFocus?.focus({ preventScroll: true });
  }

  private head(title: string) {
    return `<h2>${title}<button class="x" data-act="close" aria-label="Close">${ICON.x}</button></h2>`;
  }

  private renderSettings() {
    const a = this.app, mode = a.timer.mode;
    const steps = STEPS.filter((s) => s.modes.includes(mode));
    const toggle = (act: string, label: string, hint = '') =>
      `<div class="row"><span>${label}${hint ? `<small>${hint}</small>` : ''}</span><button class="toggle" role="switch" data-act="${act}" data-sync="${act}" aria-label="${label}"></button></div>`;
    this.el.pSettings.innerHTML = `
      ${this.head('Settings')}
      ${steps.length ? `<h3>${MODE_LABEL[mode]}</h3>` : ''}
      ${steps.map((s) => `
        <div class="row"><span>${s.label}${s.hint ? `<small>${s.hint}</small>` : ''}</span>
          <span class="stepper">
            <button data-act="step:${s.field}:-1" aria-label="Less ${s.label}">−</button>
            <output data-out="${s.field}"></output>
            <button data-act="step:${s.field}:1" aria-label="More ${s.label}">+</button>
          </span></div>`).join('')}
      ${mode === 'stopwatch' ? `<p class="note">Stopwatch counts up until you press finish. Five minutes or more plants something.</p>` : ''}
      <h3>Flow</h3>
      ${mode === 'pomodoro' || mode === 'flowtime' ? toggle('autoNext', 'Start the next block by itself') : ''}
      ${toggle('pref:chime', 'Chime at the end of a block')}
      ${toggle('pref:notify', 'Notify when a block ends', 'Only while this tab is in the background')}
      ${toggle('pref:showSeconds', 'Show seconds')}
      <h3>Island</h3>
      <div class="row"><span>Graphics</span><span class="seg">${QUALITY_MODES.map((q) => `<button data-act="pref:quality" data-v="${q}">${q[0].toUpperCase() + q.slice(1)}</button>`).join('')}</span></div>
      ${toggle('pref:calm', 'Calm motion', 'Stills the camera and clouds, and draws far fewer frames')}
      <button class="danger" data-act="reset-garden">Start a new island</button>
      <h3>Keys</h3>
      <div class="keys"><kbd>Space</kbd> start/pause · <kbd>R</kbd> reset · <kbd>S</kbd> skip · <kbd>M</kbd> music · <kbd>J</kbd> journal · <kbd>F</kbd> fullscreen · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> phases</div>
      <p class="note">Looking for the old dashboard? <a class="linkish" href="./classic/">Focus Classic →</a></p>
    `;
    this.syncSettings();
  }

  private syncSettings() {
    const a = this.app, p = this.el.pSettings;
    for (const o of p.querySelectorAll<HTMLElement>('[data-out]')) {
      const f = o.dataset.out as keyof TimerCfg;
      const v = a.timer.cfg[f] as number;
      o.textContent = f === 'longEvery' ? `${v}th` : f === 'flowDivisor' ? `÷${v}` : `${v}m`;
    }
    for (const b of p.querySelectorAll<HTMLElement>('[data-sync]')) {
      const k = b.dataset.sync!;
      const on = k === 'autoNext' ? a.timer.cfg.autoNext : !!a.prefs[k.slice(5) as keyof Prefs];
      b.setAttribute('aria-checked', String(on));
    }
    for (const b of p.querySelectorAll<HTMLElement>('[data-act="pref:quality"]')) {
      b.setAttribute('aria-pressed', String(b.dataset.v === a.prefs.quality));
    }
  }

  renderStation() {
    const s = this.app.station;
    const p = this.el.pStation;
    const keepInput = (p.querySelector('input[type="url"]') as HTMLInputElement | null)?.value ?? '';
    const focused = p.contains(document.activeElement) ? document.activeElement?.getAttribute('data-act') : null;
    p.innerHTML = `
      ${this.head('Station')}
      ${s.failed ? `<p class="note">The YouTube player couldn't load. An ad blocker or strict privacy setting is the usual cause.</p>` : ''}
      <div class="list">
        ${s.list.map((st, i) => `
          <div class="st-row">
            <button class="st" data-act="st:${i}" aria-current="${i === s.idx}">
              <span><b>${esc(st.title)}</b><small>${esc(st.by)}</small></span>
              ${i === s.idx && s.playing ? `<span class="eq">${ICON.wave}</span>` : ''}
            </button>
            ${st.custom ? `<button class="x" data-act="st-rm:${st.id}" aria-label="Remove ${esc(st.title)}">${ICON.x}</button>` : ''}
          </div>`).join('')}
      </div>
      <div class="add"><input type="url" placeholder="Paste a YouTube link" aria-label="YouTube link" /><button data-act="st-add">Add</button></div>
      <div class="err" data-el="stErr"></div>
      <div class="row"><span>Volume</span><input type="range" min="0" max="100" value="${s.vol}" aria-label="Volume" /></div>
      <div class="row"><span>Quieter on breaks</span><button class="toggle" role="switch" data-act="st-duck" aria-label="Quieter on breaks" aria-checked="${this.app.prefs.duck}"></button></div>
    `;
    const inp = p.querySelector('input[type="url"]') as HTMLInputElement;
    inp.value = keepInput;
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.addStation(); });
    p.querySelector('input[type="range"]')!.addEventListener('input', (e) => s.setVolume(Number((e.target as HTMLInputElement).value)));
    if (focused) p.querySelector<HTMLElement>(`[data-act="${focused}"]`)?.focus({ preventScroll: true });
  }

  get stationOpen() { return this.el.pStation.classList.contains('open'); }

  private addStation() {
    const p = this.el.pStation;
    const inp = p.querySelector('input[type="url"]') as HTMLInputElement;
    const err = p.querySelector('.err') as HTMLElement;
    const id = parseId(inp.value);
    if (!id) { err.textContent = "That doesn't look like a YouTube link."; return; }
    const msg = this.app.station.add(id);
    if (msg) { err.textContent = msg; return; }
    inp.value = '';
    this.renderStation();
    this.app.changed();
  }

  renderJournal() {
    const g = this.app.garden, n = g.items.length;
    const nm = nextMilestone(n);
    const recent = g.items.slice(-6).reverse().map((it, k) => {
      const i = n - 1 - k;
      const kind = KIND_INFO[this.app.layout.get(i).kind].name;
      return `<div><b>${kind}</b><span>${it.d === dayKey() ? 'today' : it.d} · ${it.m}m</span></div>`;
    }).join('');
    const miles: string[] = [];
    for (let i = 0, seen = 0; i < 90 && seen < 11; i++) {
      const k = kindAt(i, 0);
      if (!KIND_INFO[k].structure) continue;
      seen++;
      miles.push(`<span class="${i < n ? 'got' : ''}" title="Session ${i + 1}">${KIND_INFO[k].name}</span>`);
    }
    this.el.pJournal.innerHTML = `
      ${this.head('Island journal')}
      <div class="stats">
        <div><b>${n}</b><small>planted</small></div>
        <div><b>${todayCount(g)}</b><small>today</small></div>
        <div><b>${fmtDuration(g.minutes)}</b><small>focused</small></div>
      </div>
      ${nm ? `<div class="next">Next landmark: <b>${KIND_INFO[nm.kind].name}</b>, ${nm.in === 1 ? 'on your next block' : `in ${nm.in} blocks`}.</div>` : ''}
      <h3>Landmarks</h3>
      <div class="miles">${miles.join('')}</div>
      ${recent ? `<h3>Recently planted</h3><div class="recent">${recent}</div>` : `<p class="note">Finish a focus block and something will take root. Each block grows exactly what you see growing.</p>`}
      <p class="note">Drag the island to look around; scroll or pinch to zoom. It drifts back on its own.</p>
    `;
  }

  // ── clock editing ───────────────────────────────────────
  private editField(): keyof Omit<TimerCfg, 'autoNext'> | null {
    const t = this.app.timer;
    if (t.running || t.countUp) return null;
    if (t.phase === 'focus') return t.mode === 'countdown' ? 'countdownMin' : 'focusMin';
    return t.phase === 'break' ? (t.mode === 'pomodoro' ? 'breakMin' : null) : 'longMin';
  }

  private startEdit() {
    const f = this.editField();
    if (!f) { this.act('toggle'); return; }
    const te = this.el.timeEdit as HTMLInputElement;
    this.editing = true;
    te.value = String(this.app.timer.cfg[f]);
    const [lo, hi] = LIMITS[f];
    te.min = String(lo); te.max = String(hi);
    te.hidden = false;
    this.el.time.hidden = true;
    te.focus(); te.select();
  }

  private commitEdit(apply: boolean) {
    if (!this.editing) return;
    this.editing = false;
    const te = this.el.timeEdit as HTMLInputElement;
    const f = this.editField();
    const n = parseInt(te.value, 10);
    te.hidden = true;
    this.el.time.hidden = false;
    if (apply && f && Number.isFinite(n)) this.app.setLength(f, n);
    this.el.time.focus({ preventScroll: true });
    this.app.changed();
  }

  // ── per-tick render ─────────────────────────────────────
  render() {
    const a = this.app, t = a.timer, e = this.el;
    for (const b of e.modes.querySelectorAll<HTMLElement>('button')) b.setAttribute('aria-selected', String(b.dataset.mode === t.mode));

    const phases: Phase[] = t.mode === 'pomodoro' ? ['focus', 'break', 'long'] : t.mode === 'flowtime' ? ['focus', 'break'] : [];
    const ph = phases.length
      ? phases.map((p) => `<button data-phase="${p}" aria-pressed="${p === t.phase}">${p === 'break' && t.mode === 'flowtime' ? 'Break' : PHASE_LABEL[p]}</button>`).join('')
      : `<span>${MODE_LABEL[t.mode]}</span>`;
    if (e.phases.dataset.key !== ph) { e.phases.innerHTML = ph; e.phases.dataset.key = ph; }

    const clock = fmt(t.display(), a.prefs.showSeconds);
    if (e.time.textContent !== clock) e.time.textContent = clock;
    const editable = !!this.editField();
    e.time.dataset.editable = String(editable);
    e.time.setAttribute('aria-label', `${clock}. ${editable ? 'Click to change the length.' : t.running ? 'Running.' : 'Paused.'}`);
    e.hint.textContent = editable && t.isFresh ? 'tap the time to change it' : '';

    // What's growing.
    const n = a.garden.items.length;
    const next = a.layout.get(n);
    const info = KIND_INFO[next.kind];
    let text: string, pct: number | null = null;
    if (t.phase === 'focus') {
      const p = t.progress();
      if (p > 0 || t.running) {
        pct = p;
        text = `${info.structure ? 'Building' : 'Growing'} ${article(info.name)} · ${Math.floor(p * 100)}%`;
      } else text = `Next up: ${article(info.name)}`;
      if (t.mode === 'stopwatch' || t.mode === 'flowtime') {
        if (t.elapsed > 0 && t.focusedMs() < 5 * 60_000) text += ' · 5 min to plant';
      }
    } else {
      text = t.phase === 'long' ? 'Long break · the stars are out' : 'Break · the island rests';
    }
    if (e.growText.textContent !== text) e.growText.textContent = text;
    e.barWrap.hidden = pct === null;
    if (pct !== null) e.bar.style.width = `${clamp(pct, 0, 1) * 100}%`;

    if (t.mode === 'pomodoro') {
      const every = t.cfg.longEvery, done = t.doneCount % every;
      const pips = Array.from({ length: every }, (_, i) => `<i class="${i < done ? 'on' : ''}"></i>`).join('');
      if (e.pips.dataset.key !== pips) { e.pips.innerHTML = pips; e.pips.dataset.key = pips; }
    } else if (e.pips.innerHTML) { e.pips.innerHTML = ''; e.pips.dataset.key = ''; }

    const playHtml = t.running ? ICON.pause : ICON.play;
    if (e.play.dataset.key !== playHtml) { e.play.innerHTML = playHtml; e.play.dataset.key = playHtml; }
    e.play.setAttribute('aria-label', t.running ? 'Pause (Space)' : 'Start (Space)');
    const finish = t.countUp;
    const skipHtml = finish ? ICON.done : ICON.skip;
    if (e.skip.dataset.key !== skipHtml) { e.skip.innerHTML = skipHtml; e.skip.dataset.key = skipHtml; }
    const skipLabel = finish ? 'Finish block (S)' : 'Skip (S)';
    e.skip.setAttribute('aria-label', skipLabel);
    e.skip.title = skipLabel;
    (e.skip as HTMLButtonElement).disabled = t.mode === 'stopwatch' && t.elapsed === 0;

    e.chipN.textContent = String(n);

    const s = a.station;
    e.stTitle.textContent = s.failed ? 'Music unavailable' : s.current.title;
    e.stBy.textContent = s.failed ? 'the player was blocked' : s.playing ? s.current.by : `${s.current.by}`;
    e.disc.classList.toggle('spin', s.playing);
    e.disc.setAttribute('aria-label', s.playing ? 'Pause music (M)' : 'Play music (M)');

    const full = !!document.fullscreenElement;
    const fullHtml = full ? ICON.exit : ICON.full;
    if (e.fullBtn.dataset.key !== fullHtml) { e.fullBtn.innerHTML = fullHtml; e.fullBtn.dataset.key = fullHtml; }

    document.title = t.running ? `${clock} · ${t.phase === 'focus' ? (info.structure ? 'Building' : 'Growing') : 'Break'}` : 'Focus';
  }

  announce(msg: string) { this.el.live.textContent = msg; }

  toast(msg: string) {
    const el = this.el.toast;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.classList.remove('show'), 4200);
    this.announce(msg);
  }

  setNight(night: number) {
    document.documentElement.dataset.night = night > 0.45 ? '1' : '0';
  }
}

const article = (name: string) => (/^[AEIOU]/i.test(name) ? `an ${name.toLowerCase()}` : name.endsWith('s') ? name.toLowerCase() : `a ${name.toLowerCase()}`);
