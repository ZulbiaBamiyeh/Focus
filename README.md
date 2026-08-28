# Focus

A focus dashboard where the dial *is* the settings page. Drag the gauge to change the length of whatever block you're currently in — there is no settings route.

**Live:** https://zulbiabamiyeh.github.io/Focus/

## What's in it

- **Four modes** — Pomodoro, Flowtime, Countdown, Stopwatch. Flowtime counts up and hands you a break sized as a fraction of what you actually worked (clamped 3–20 min), logging real minutes rather than a nominal 25.
- **Direct-manipulation settings** — drag the ring to set the current block. Break length, long-break length, and the long-break interval are steppers sitting under the cycle pips.
- **Ambience** — rain, ocean, fire, drone. All synthesised with the Web Audio API. No audio assets, no network. Fire has scheduled crackles; drone is four detuned oscillators through a lowpass.
- **Station** — eleven long MapleStory / OSRS mixes via the YouTube IFrame API, plus any URL you paste in. The player element is 1×1 and offscreen; the visible control is a spinning disc. Ducks to 25% during breaks.
- **Skip fx** — a short square-wave chirp, synthesised. Pitch-down on skip, pitch-up on next track.
- **Themes** — five palettes, applied as CSS custom properties on the root.
- **Tasks + daily stats + a seven-day history + streak**, persisted.

## Running it

```bash
npm install
npm run dev
```

Only runtime dependency is `react`. Styles are a plain `<style>` block inside the component — no Tailwind, no CSS modules.

`npm run build` emits to `dist/`. The Vite `base` defaults to `/Focus/` for GitHub Pages; set `BASE_PATH=/` for a custom domain or local static serving.

## Deploying

`.github/workflows/pages.yml` builds and publishes to GitHub Pages on every push. It authenticates with OIDC, so there are no secrets to configure.

**One manual step, once:** set **Settings → Pages → Source** to **GitHub Actions**. Until that's done every run fails at `configure-pages` with *"Get Pages site failed"*. The action's `enablement: true` input can't do it for you — creating a Pages site needs admin rights that `GITHUB_TOKEN` doesn't carry. After flipping it, re-run the workflow from the Actions tab.

The workflow passes the repo name as `BASE_PATH`, writes `.nojekyll` (Pages otherwise strips underscore-prefixed files), and copies `index.html` to `404.html` so deep links resolve.

## Notes for whoever picks this up

**Storage.** `store` near the top is an adapter. It uses `window.storage` if the host provides it, else `localStorage`, else memory. In a normal web app it'll take the localStorage path. Key is `ember:v3`; bump it if you change the persisted shape.

**Dates are local, not UTC.** `dayKey()` formats off local getters rather than `toISOString()`, so an 8pm session in UTC-5 files under the day the user calls today. The stats log, streak, and week view all key off it.

**The YouTube player may be blocked.** Behind an ad blocker or a restrictive extension the embed won't load, and the Station card says so instead of sitting dead. `useStation` has a 9-second timeout that flips `failed` if the API script never arrives. The synthesised ambience is unaffected.

**Timer accuracy.** The tick interval is 200ms but it never accumulates — countdowns read off `endAt.current` (a wall-clock timestamp) and count-ups off `runFrom.current`. Backgrounded tabs throttle the interval but don't drift. Both refs are persisted, so a block survives a reload; a countdown that expired while the tab was closed lands on zero paused rather than firing a stale chime.

**Persistence throughput.** The save effect deliberately excludes `remaining` and `elapsed` from its deps — they change five times a second. It reads them from a ref at write time instead, and the timestamp refs are the real source of truth for anything running.

**Known gaps, roughly in priority order:**

1. Stats history is seven days in the UI; `log` holds every day it has ever recorded, so a month view is a rendering job.
2. Task reordering is up/down buttons, not drag-and-drop.
3. Custom stations are stored as bare video IDs with a placeholder title — fetching real titles would need the Data API and a key.
4. No picture-in-picture, though the block now shows in the tab title.

**Accessibility already handled** — the dial is a `role="slider"` operable with arrow keys, focus rings are visible throughout, task row actions are labelled with the task they act on, the week chart carries a text alternative, and `prefers-reduced-motion` kills the drift and breathe animations and slows the disc. Row actions stay visible on touch, where there's no hover. Please don't regress these.

## On the Pomodoro question

The 25/5 split is arbitrary and the evidence is mixed — a 2025 Maastricht study found Pomodoro breaks increased fatigue faster than self-regulated ones, with no difference in productivity or flow. What Pomodoro reliably provides is an *external* cue to stop, which matters because self-interrupted tasks get completed more slowly than externally interrupted ones. Flowtime mode exists to keep that cue without the arbitrary interruption. Worth keeping both rather than picking a winner.
