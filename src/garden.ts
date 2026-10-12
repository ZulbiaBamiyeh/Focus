// What grows on the island, and where. Pure data: the 3D side reads this.
//
// Every earned focus block plants one thing. Most are plants drawn from a
// weighted bag; certain counts are milestones that put up a structure. The
// island's radius grows with the count, so there is always room.
//
// The layout is deterministic in (seed, index): reloading never moves a tree,
// and the thing growing during a block is exactly what will be planted.
import { mulberry32, dayKey } from './util';

export type Kind =
  | 'tree' | 'cherry' | 'autumn' | 'pine' | 'bush' | 'flowers' | 'mushrooms' | 'rock'
  | 'cottage' | 'lantern' | 'well' | 'windmill' | 'pond' | 'bench' | 'beehive' | 'tower';

export const KIND_INFO: Record<Kind, { name: string; r: number; structure?: boolean }> = {
  tree:      { name: 'Oak',          r: 0.85 },
  cherry:    { name: 'Cherry tree',  r: 0.85 },
  autumn:    { name: 'Maple',        r: 0.85 },
  pine:      { name: 'Pine',         r: 0.65 },
  bush:      { name: 'Bush',         r: 0.55 },
  flowers:   { name: 'Flowers',      r: 0.45 },
  mushrooms: { name: 'Mushrooms',    r: 0.4 },
  rock:      { name: 'Mossy rock',   r: 0.5 },
  cottage:   { name: 'Cottage',      r: 1.75, structure: true },
  lantern:   { name: 'Lantern',      r: 0.35, structure: true },
  well:      { name: 'Well',         r: 0.85, structure: true },
  windmill:  { name: 'Windmill',     r: 1.5,  structure: true },
  pond:      { name: 'Pond',         r: 1.7,  structure: true },
  bench:     { name: 'Bench',        r: 0.75, structure: true },
  beehive:   { name: 'Beehives',     r: 0.6,  structure: true },
  tower:     { name: 'Lookout tower', r: 1.2, structure: true },
};

/** Session index (0-based) → structure. */
const MILESTONES: Record<number, Kind> = {
  2: 'cottage', 5: 'lantern', 9: 'well', 14: 'windmill', 20: 'pond',
  27: 'bench', 35: 'beehive', 44: 'lantern', 54: 'tower', 66: 'bench', 80: 'lantern',
};

const BAG: [Kind, number][] = [
  ['tree', 3], ['flowers', 3], ['bush', 2], ['pine', 2], ['cherry', 1.3],
  ['autumn', 1.3], ['mushrooms', 1], ['rock', 0.8],
];

export interface Placed {
  i: number; kind: Kind;
  x: number; z: number; rot: number; scale: number; variant: number;
}

export interface PlantRecord { d: string; m: number }

export interface GardenData {
  seed: number;
  /** One entry per planting: the day and the minutes it took. */
  items: PlantRecord[];
  /** Every focused minute, earned or not. */
  minutes: number;
}

export const newGarden = (): GardenData => ({
  seed: (Math.random() * 2 ** 31) | 0, items: [], minutes: 0,
});

/** Island radius after n plantings. */
export const islandRadius = (n: number) => Math.min(17, 4.4 + 1.0 * Math.sqrt(n));

export function kindAt(i: number, seed: number): Kind {
  if (MILESTONES[i]) return MILESTONES[i];
  if (i > 80 && i % 15 === 0) return i % 30 === 0 ? 'bench' : 'lantern';
  if (i === 0) return 'tree';
  if (i === 1) return 'flowers';
  const rng = mulberry32(seed ^ (i * 2654435761));
  const total = BAG.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of BAG) { if ((r -= w) <= 0) return k; }
  return 'tree';
}

/** Lays items out one after another, each avoiding the ones before it. Cached and extended incrementally. */
export class Layout {
  private placed: Placed[] = [];
  constructor(private seed: number) {}

  get(i: number): Placed {
    while (this.placed.length <= i) this.placed.push(this.place(this.placed.length));
    return this.placed[i];
  }

  private place(i: number): Placed {
    const kind = kindAt(i, this.seed);
    const info = KIND_INFO[kind];
    const rng = mulberry32((this.seed * 31 + i * 7919) | 0);
    // Placed inside the island as it is *before* this item grows it.
    const R = islandRadius(i) * 0.86;
    // Structures keep to the middle; the first tree sits near the centre.
    const maxR = Math.max(0.5, info.structure ? Math.min(R - info.r, R * 0.7) : R - info.r);
    let best = { x: 0, z: 0 }, bestGap = -Infinity;
    for (let t = 0; t < 70; t++) {
      const a = rng() * Math.PI * 2;
      const rr = i === 0 ? rng() * 0.8 : Math.sqrt(rng()) * maxR;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      let gap = Infinity;
      for (const p of this.placed) {
        const d = Math.hypot(p.x - x, p.z - z) - KIND_INFO[p.kind].r - info.r;
        if (d < gap) gap = d;
      }
      if (gap > bestGap) { bestGap = gap; best = { x, z }; }
      if (gap > 0.15) break;
    }
    // A crowded island squeezes small things in smaller rather than not at all.
    const squeeze = bestGap < 0 && !info.structure ? Math.max(0.55, 1 + bestGap / info.r) : 1;
    return {
      i, kind, x: best.x, z: best.z,
      // Buildings turn roughly toward the camera, so doors and windows face you.
      rot: info.structure ? (rng() - 0.5) * 1.1 : rng() * Math.PI * 2,
      scale: (0.85 + rng() * 0.3) * squeeze,
      variant: Math.floor(rng() * 1000),
    };
  }
}

/** The next structure ahead of n plantings, and how many sessions until it. */
export function nextMilestone(n: number): { kind: Kind; in: number } | null {
  for (let i = n; i < n + 200; i++) {
    const k = kindAt(i, 0);
    if (KIND_INFO[k].structure) return { kind: k, in: i - n + 1 };
  }
  return null;
}

export function plant(g: GardenData, minutes: number) {
  g.items.push({ d: dayKey(), m: Math.round(minutes) });
}

export function todayCount(g: GardenData) {
  const k = dayKey();
  return g.items.filter((it) => it.d === k).length;
}
