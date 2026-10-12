# Focus

A focus timer with a floating island that grows one thing for every block you finish.

**Live:** https://zulbiabamiyeh.github.io/Focus/ · the original dashboard lives on at [/classic/](https://zulbiabamiyeh.github.io/Focus/classic/)

## How it works

- **Each focus block is one day on the island.** The sun rises when you start, crosses a dotted arc over the clock, and reaches golden hour as the block ends. The dots still ahead of it are the time left.
- **Breaks are the evening.** The moon takes the same arc: a short break goes through dusk, a long one all the way to a starry night with the windows and lanterns lit. Pre-dawn hands back to the next morning.
- **Something grows while you work.** The thing the next block will plant is visible at its real spot from the moment you start: a sapling filling out, or a building rising from its footings. Finish the block and it pops into place; reset or skip early and it sinks back into the ground.
- **Landmarks** arrive at set counts: cottage (3rd block), lantern, well, windmill, pond, bench, beehives, lookout tower and more. In between it's oaks, cherries, maples, pines, bushes, flowers, mushrooms and mossy rocks. The island's radius grows with the count so there's always room.
- Drag to look around, scroll or pinch to zoom. The camera drifts back on its own.

### Modes

| Mode | Focus | Break | Plants when |
|---|---|---|---|
| Pomodoro | fixed length | short, every Nth long | the block runs out (or is skipped at ≥ 90%) |
| Flowtime | counts up | focus ÷ divisor, 3–20 min | you finish it after ≥ 5 min |
| Countdown | one fixed block | none | the block runs out (or ≥ 90%) |
| Stopwatch | counts up | none | you finish it after ≥ 5 min |

Count-up blocks have no end, so their sun approaches golden hour without ever reaching it, and the sprout is fully grown at 25 minutes.

### Station

Eleven long MapleStory / OSRS mixes through the YouTube IFrame API, plus any link you paste. The player is a 1×1 element offscreen; the visible control is the spinning disc. It gets quieter during breaks (toggle in the station panel). The API script isn't requested until you first press play. Behind an ad blocker it never arrives, and after nine seconds the station says so.

### Keys

<kbd>Space</kbd> start/pause · <kbd>R</kbd> reset · <kbd>S</kbd> skip / finish · <kbd>M</kbd> music · <kbd>J</kbd> journal · <kbd>,</kbd> settings · <kbd>F</kbd> fullscreen · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> phases · <kbd>Esc</kbd> close panels

## Running it

```bash
npm install
npm run dev        # http://localhost:5173/Focus/
npm run build      # typecheck + static build in dist/ (both pages)
npm run typecheck
```

`npm run build` emits both pages to `dist/`. The Vite `base` defaults to `/Focus/` for GitHub Pages; set `BASE_PATH=/` for a custom domain or local static serving.

## Layout

```
index.html            the island (TypeScript + three.js, no framework)
src/
  main.ts             wiring and persistence
  timer.ts            four modes over focus / break / long, wall-clock based
  garden.ts           what grows, where, and when (pure data, deterministic)
  station.ts          YouTube station
  sfx.ts              synthesised chimes
  ui.ts, styles.css   the HUD
  world/
    engine.ts         renderer, bloom → vignette/grain post chain, frame pacing, auto quality
    world.ts          the scene: lights, camera, drag/zoom, palette crossfades
    sky.ts            day/dusk/night palettes; sun, moon and arc drawn in screen space
    terrain.ts        the island: stitched polar rings, flat shaded, grows with its radius
    models.ts         every plant and building, built from primitives at runtime
    gardenView.ts     sprout, pop animation, sparkles, baking settled items
    ambient.ts        cloud sea, drifting clouds, floating rocks, smoke, pollen/fireflies
classic/              the v1 React dashboard, untouched apart from its path
```

## Notes for whoever picks this up

**Nothing downloads.** Every model is a few primitives merged into one vertex-coloured, flat-shaded geometry at runtime; colours carry the look. Inkbound's `engine.ts` was the template for the renderer and post-processing.

**It's frugal on purpose.** A focus tab sits open for hours, so the loop is capped at 30 fps while running, 24 idle, 8 in calm motion, and stops entirely when the tab is hidden. Settled garden items are merged ("baked") into one solid and one glow mesh, so a garden of 300 things is two draw calls plus any windmill sails. "Auto" graphics drops a level by itself if frames stay slow; low turns off post-processing and shadows.

**The sky is half screen-space.** The camera looks down at the island, so the real sky is mostly above the viewport. The sun, moon and their arc are drawn on an arch over the clock in screen coordinates (`archFor` in `sky.ts`); the light falling on the island follows the same progress from in front, so the faces you see are lit.

**The layout is deterministic** in `(seed, index)`. The thing growing during a block is exactly what will be planted, and reloads never move a tree. Each item is placed inside the island as it was *before* that item grew it, avoiding everything placed earlier. Structures keep to the middle and turn roughly toward the camera.

**Timer accuracy.** Countdowns read off `endAt`, count-ups off `runFrom`; both are persisted, so a block survives a reload and a throttled background tab never drifts. A countdown that ran out while the page was closed lands on zero, paused, and completes (and plants) the moment you press start. State is saved on discrete changes (phase, mode, run state, settings), not per tick.

**Storage** is `localStorage` key `isle:v1`, falling back to memory. The classic app keeps its own `ember:v4` on the same origin; neither reads the other.

**Accessibility.** Panels are dialogs with `aria-expanded` openers and close on Esc or an outside click, returning focus. Ink colour flips with the sky (`data-night` on `<html>`) so text stays legible from noon to midnight. `prefers-reduced-motion` turns on Calm motion by default: no camera sway, still clouds and motes, and far fewer frames. Phase ends and plantings are announced through a polite live region.

## Deploying

`.github/workflows/pages.yml` builds and publishes to GitHub Pages on pushes to its listed branches. It authenticates with OIDC, so there are no secrets to configure. One manual step, once: **Settings → Pages → Source → GitHub Actions**.

## On the Pomodoro question

The 25/5 split is arbitrary and the evidence is mixed. A 2025 Maastricht study found Pomodoro breaks increased fatigue faster than self-regulated ones, with no difference in productivity or flow. What Pomodoro reliably provides is an *external* cue to stop. Flowtime keeps that cue without the arbitrary interruption. Both stay.
