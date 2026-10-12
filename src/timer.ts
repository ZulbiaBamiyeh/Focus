// The timer. Four modes over three phases, all read off the wall clock.
//
//   pomodoro   focus → break, every Nth break long
//   flowtime   focus counts up; the break is a fraction of what you worked
//   countdown  one focus block, no breaks
//   stopwatch  counts up until you finish it, no breaks
//
// Nothing accumulates: a countdown reads `endAt`, a count-up reads `runFrom`,
// so a throttled background tab never drifts. Both are persisted, so a block
// survives a reload; a countdown that ran out while the page was closed lands
// on zero, paused, and completes the moment you press start.
import { clamp } from './util';

export type Mode = 'pomodoro' | 'flowtime' | 'countdown' | 'stopwatch';
export type Phase = 'focus' | 'break' | 'long';
export const MODES: Mode[] = ['pomodoro', 'flowtime', 'countdown', 'stopwatch'];

export interface TimerCfg {
  focusMin: number; breakMin: number; longMin: number; longEvery: number;
  flowDivisor: number; countdownMin: number; autoNext: boolean;
}

export const LIMITS: Record<keyof Omit<TimerCfg, 'autoNext'>, [number, number]> = {
  focusMin: [1, 180], breakMin: [1, 60], longMin: [1, 90], longEvery: [2, 12],
  flowDivisor: [2, 12], countdownMin: [1, 300],
};

/** Count-up focus has no length, so the sprout grows against this instead. */
export const GROW_TARGET_MS = 25 * 60_000;
/** A count-up block shorter than this plants nothing. */
export const MIN_EARN_MS = 5 * 60_000;

export interface TimerSnap {
  mode: Mode; phase: Phase; running: boolean;
  remaining: number; elapsed: number; doneCount: number;
  endAt: number; runFrom: number;
}

export interface FocusEnd {
  focusedMs: number;
  /** Ran to its end rather than being skipped or finished early. */
  natural: boolean;
  /** Counts toward the island. */
  earned: boolean;
}

export class Timer {
  mode: Mode = 'pomodoro';
  phase: Phase = 'focus';
  running = false;
  remaining: number;
  elapsed = 0;
  doneCount = 0;
  private endAt = 0;
  private runFrom = 0;
  /** Sitting at the top of a phase, never started. Only then does a length edit move the clock. */
  private fresh = true;

  onFocusEnd: (r: FocusEnd) => void = () => {};
  onPhaseEnd: (phase: Phase, natural: boolean) => void = () => {};
  onChange: () => void = () => {};

  constructor(public cfg: TimerCfg) {
    this.remaining = this.length('focus');
  }

  get countUp() {
    return this.mode === 'stopwatch' || (this.mode === 'flowtime' && this.phase === 'focus');
  }

  length(p: Phase = this.phase): number {
    const c = this.cfg;
    if (p === 'focus') return (this.mode === 'countdown' ? c.countdownMin : c.focusMin) * 60_000;
    if (p === 'break') return c.breakMin * 60_000;
    return c.longMin * 60_000;
  }

  /** How far through the current phase, 0..1. Count-up focus measures against GROW_TARGET_MS. */
  progress(): number {
    if (this.countUp) return clamp(this.elapsed / GROW_TARGET_MS, 0, 1);
    const len = this.length();
    return len > 0 ? clamp(1 - this.remaining / len, 0, 1) : 0;
  }

  /** Focus time spent in the current block so far. */
  focusedMs(): number {
    if (this.phase !== 'focus') return 0;
    return this.countUp ? this.elapsed : Math.max(0, this.length() - this.remaining);
  }

  /** At the top of the phase, never started. */
  get isFresh() { return this.fresh; }

  /** The number on the clock. */
  display(): number { return this.countUp ? this.elapsed : this.remaining; }

  tick(now = Date.now()) {
    if (!this.running) return;
    if (this.countUp) { this.elapsed = now - this.runFrom; this.onChange(); return; }
    const left = this.endAt - now;
    if (left <= 0) { this.remaining = 0; this.advance(true); }
    else this.remaining = left;
    this.onChange();
  }

  start() {
    if (this.running) return;
    const now = Date.now();
    if (this.countUp) this.runFrom = now - this.elapsed;
    else this.endAt = now + this.remaining;
    this.running = true;
    this.fresh = false;
    this.tick(now);
    this.onChange();
  }

  pause() {
    if (!this.running) return;
    this.tick();
    this.running = false;
    this.onChange();
  }

  toggle() { if (this.running) this.pause(); else this.start(); }

  /** Back to the top of the current phase. A focus block reset is abandoned, not ended. */
  reset() {
    this.running = false;
    this.fresh = true;
    this.elapsed = 0;
    this.remaining = this.length();
    this.onChange();
  }

  /** Skip in a countdown phase; "finish" in a count-up one. Either way the phase ends now. */
  skip() {
    if (this.running) this.tick();
    if (this.phase === 'focus' && this.focusedMs() === 0 && this.mode === 'stopwatch') return;
    this.running = false;
    this.advance(false);
  }

  goPhase(p: Phase) {
    if (this.mode === 'countdown' || this.mode === 'stopwatch') p = 'focus';
    if (p === 'long' && this.mode !== 'pomodoro') p = 'break';
    this.running = false;
    this.fresh = true;
    this.phase = p;
    this.elapsed = 0;
    this.remaining = this.length(p);
    this.onChange();
  }

  setMode(m: Mode) {
    if (m === this.mode) return;
    this.mode = m;
    this.doneCount = 0;
    this.goPhase('focus');
  }

  /** Lengths changed in settings. Only an idle, untouched phase picks it up,
   *  so editing a length never yanks the clock out from under a paused block. */
  lengthsChanged() {
    if (this.running || this.countUp) return;
    const len = this.length();
    if (this.fresh || this.remaining > len) this.remaining = len;
    this.onChange();
  }

  private advance(natural: boolean) {
    const was = this.phase;
    this.fresh = true;
    this.onPhaseEnd(was, natural);

    if (was === 'focus') {
      const focusedMs = this.focusedMs();
      const len = this.length('focus');
      const earned = this.countUp
        ? focusedMs >= MIN_EARN_MS
        : natural || focusedMs >= len * 0.9;
      this.onFocusEnd({ focusedMs, natural, earned });

      if (this.mode === 'countdown' || this.mode === 'stopwatch') {
        this.elapsed = 0;
        this.remaining = this.length('focus');
        this.running = false;
        this.onChange();
        return;
      }
      let next: Phase = 'break', brk: number;
      if (this.mode === 'flowtime') {
        brk = clamp(Math.round(focusedMs / 60_000 / this.cfg.flowDivisor), 3, 20) * 60_000;
      } else {
        this.doneCount += 1;
        next = this.doneCount % this.cfg.longEvery === 0 ? 'long' : 'break';
        brk = this.length(next);
      }
      this.phase = next;
      this.elapsed = 0;
      this.remaining = brk;
      this.running = false;
      if (this.cfg.autoNext) { this.endAt = Date.now() + brk; this.running = true; this.fresh = false; }
    } else {
      this.phase = 'focus';
      this.elapsed = 0;
      this.remaining = this.length('focus');
      this.running = false;
      // Flowtime's focus has no end to look forward to, so it never starts itself.
      if (this.cfg.autoNext && this.mode === 'pomodoro') {
        this.endAt = Date.now() + this.remaining; this.running = true; this.fresh = false;
      }
    }
    this.onChange();
  }

  snapshot(): TimerSnap {
    return {
      mode: this.mode, phase: this.phase, running: this.running,
      remaining: this.remaining, elapsed: this.elapsed, doneCount: this.doneCount,
      endAt: this.endAt, runFrom: this.runFrom,
    };
  }

  restore(s: Partial<TimerSnap>) {
    if (s.mode) this.mode = s.mode;
    if (s.phase) this.phase = s.phase;
    this.doneCount = s.doneCount || 0;
    const now = Date.now();
    if (this.countUp) {
      const el = s.running ? now - (s.runFrom || now) : (s.elapsed || 0);
      this.elapsed = Math.max(0, el);
      this.runFrom = now - this.elapsed;
      this.running = !!s.running;
    } else if (s.running) {
      const left = (s.endAt || 0) - now;
      if (left > 0) { this.endAt = s.endAt!; this.remaining = left; this.running = true; }
      else this.remaining = 0;
    } else if ((s.remaining ?? 0) > 0) {
      this.remaining = Math.min(s.remaining!, this.length());
    } else {
      this.remaining = s.remaining === 0 ? 0 : this.length();
    }
    this.fresh = !this.running && (this.countUp ? this.elapsed === 0 : this.remaining === this.length());
  }
}
