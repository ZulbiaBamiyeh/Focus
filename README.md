# Focus

A focus dashboard where the dial *is* the settings page. Drag the gauge to change the length of whatever block you're currently in — there is no settings route.

Single file, no build config assumed: `ember-focus.jsx` exports a default React component with no required props.

## What's in it

- **Four modes** — Pomodoro, Flowtime, Countdown, Stopwatch. Flowtime counts up and hands you a break sized at one fifth of what you actually worked (clamped 3–20 min), logging real minutes rather than a nominal 25.
- **Direct-manipulation settings** — drag the ring to set the current block. Break length, long-break length, and the long-break interval are steppers sitting under the cycle pips.
- **Ambience** — rain, ocean, fire, drone. All synthesised with the Web Audio API. No audio assets, no network. Fire has scheduled crackles; drone is four detuned oscillators through a lowpass.
- **Station** — eleven long MapleStory / OSRS mixes via the YouTube IFrame API. The player element is 1×1 and offscreen; the visible control is a spinning disc. Ducks to 25% during breaks.
- **Skip fx** — a short square-wave chirp, synthesised. Pitch-down on skip, pitch-up on next track.
- **Themes** — five palettes, applied as CSS custom properties on the root.
- **Tasks + daily stats + streak**, persisted.

## Setup

```bash
npm create vite@latest . -- --template react
npm install
# drop ember-focus.jsx into src/, then in src/main.jsx:
#   import App from './ember-focus.jsx'
npm run dev
```

Only dependency is `react`. Styles are a plain `<style>` block inside the component — no Tailwind, no CSS modules.

## Notes for whoever picks this up

**Storage.** `store` near the top is an adapter. It uses `window.storage` if the host provides it (that's the Claude artifact runtime), else `localStorage`, else memory. In a normal web app it'll take the localStorage path. Key is `ember:v2`; bump it if you change the persisted shape.

**The YouTube player may be blocked.** In a sandboxed iframe the embed often won't load, and the Station card shows a message saying so instead of sitting dead. On a real origin it works. `useStation` has a 9-second timeout that flips `failed` if the API script never arrives.

**Timer accuracy.** The tick interval is 200ms but it never accumulates — countdowns read off `endAt.current` (a wall-clock timestamp) and count-ups off `runFrom.current`. Backgrounded tabs throttle the interval but don't drift. If you want the timer to survive a page reload mid-block, persist those two refs; currently they aren't.

**Known gaps, roughly in priority order:**

1. No stats history beyond today — `log` is keyed by `YYYY-MM-DD` and holds every day, but only today is displayed. A week/month view is mostly a rendering job.
2. No task reordering. Tasks are a flat array with `{id, text, done}`.
3. No "paste your own YouTube URL" — `STATIONS` is a hardcoded array of video IDs.
4. No picture-in-picture or document-title countdown, so the timer is invisible in other tabs.
5. Flowtime break length is hardcoded at `elapsed/5`; worth making configurable.
6. `Step` and `Toggle` are defined inside the render body. Fine as-is (they're button-only, no input state to lose) but they should be lifted out if either gains a text field.

**Accessibility already handled** — the dial is a `role="slider"` operable with arrow keys, focus rings are visible throughout, `prefers-reduced-motion` kills the drift and breathe animations and slows the disc. Please don't regress these.

## On the Pomodoro question

The 25/5 split is arbitrary and the evidence is mixed — a 2025 Maastricht study found Pomodoro breaks increased fatigue faster than self-regulated ones, with no difference in productivity or flow. What Pomodoro reliably provides is an *external* cue to stop, which matters because self-interrupted tasks get completed more slowly than externally interrupted ones. Flowtime mode exists to keep that cue without the arbitrary interruption. Worth keeping both rather than picking a winner.
