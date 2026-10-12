// Synthesised cues: nothing downloads. A soft three-note bell at the end of a
// block, a brighter one when something is planted, and a tick for buttons.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function boot(): AudioContext | null {
  if (ctx) { if (ctx.state === 'suspended') void ctx.resume(); return ctx; }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  return ctx;
}

/** Call from any user gesture so a chime later is allowed to sound. */
export function unlockAudio() { boot(); }

function bell(freq: number, at: number, dur: number, vol: number) {
  const c = ctx!, t = c.currentTime + at;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(master!);
  // A sine and a quiet inharmonic partial: closer to a glockenspiel than a beep.
  for (const [mul, amp] of [[1, 1], [2.76, 0.18], [5.4, 0.05]] as const) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * mul;
    const pg = c.createGain();
    pg.gain.value = amp;
    o.connect(pg); pg.connect(g);
    o.start(t); o.stop(t + dur + 0.05);
  }
}

/** End of a phase. Focus ending descends; a break ending rises. */
export function chime(breakEnded: boolean) {
  if (!boot()) return;
  const notes = breakEnded ? [523.25, 659.25, 783.99] : [783.99, 659.25, 523.25];
  notes.forEach((f, i) => bell(f, i * 0.16, 1.6, 0.22));
}

export function plantChime() {
  if (!boot()) return;
  [659.25, 880, 1174.66, 1318.5].forEach((f, i) => bell(f, i * 0.07, 0.9, 0.12));
}

export function tick(up = true) {
  if (!boot()) return;
  bell(up ? 1046.5 : 784, 0, 0.18, 0.06);
}
