// Everything that grows on the island, built from primitives at runtime.
// No model files: each item is a few boxes, cones and jittered icosahedrons
// merged into one vertex-coloured geometry, flat shaded.
//
// Parts go in one of two buckets. `solid` is lit normally; `glow` is windows
// and lamps, whose emissive strength follows the sky (dark by day, warm at
// night). A windmill's sails are built separately so they can turn.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../util';
import type { Kind } from '../garden';

type V3 = [number, number, number];
interface PartOpts {
  p?: V3; r?: V3; s?: number | V3;
  /** Random vertex displacement, consistent across shared vertices so nothing cracks. */
  jitter?: number;
  /** ± lightness variation per face. */
  vary?: number;
  glow?: boolean;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color();

export class Builder {
  solid: THREE.BufferGeometry[] = [];
  glow: THREE.BufferGeometry[] = [];
  constructor(public rng: () => number) {}

  add(geo: THREE.BufferGeometry, color: string | THREE.Color, o: PartOpts = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    if (o.jitter) {
      const seen = new Map<string, V3>();
      for (let i = 0; i < pos.count; i++) {
        const k = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
        let d = seen.get(k);
        if (!d) { d = [(this.rng() - 0.5) * o.jitter, (this.rng() - 0.5) * o.jitter, (this.rng() - 0.5) * o.jitter]; seen.set(k, d); }
        pos.setXYZ(i, pos.getX(i) + d[0], pos.getY(i) + d[1], pos.getZ(i) + d[2]);
      }
    }
    const s = o.s ?? 1;
    _e.set(...(o.r ?? [0, 0, 0]));
    _q.setFromEuler(_e);
    _m.compose(new THREE.Vector3(...(o.p ?? [0, 0, 0])), _q, typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s));
    g.applyMatrix4(_m);
    const base = new THREE.Color(color);
    const cols = new Float32Array(pos.count * 3);
    for (let f = 0; f < pos.count; f += 3) {
      _c.copy(base);
      if (o.vary) _c.offsetHSL(0, 0, (this.rng() - 0.5) * o.vary);
      for (let k = 0; k < 3; k++) cols.set([_c.r, _c.g, _c.b], (f + k) * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    (o.glow ? this.glow : this.solid).push(g);
    return this;
  }

  static merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
    if (!list.length) return null;
    const g = mergeGeometries(list, false);
    list.forEach((x) => x.dispose());
    if (!g) return null;
    g.computeVertexNormals();
    return g;
  }
}

// Primitive shorthands.
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 7) => new THREE.CylinderGeometry(rt, rb, h, seg);
const cone = (r: number, h: number, seg = 7) => new THREE.ConeGeometry(r, h, seg);
const ico = (r: number, detail = 0) => new THREE.IcosahedronGeometry(r, detail);
const dode = (r: number) => new THREE.DodecahedronGeometry(r, 0);
/** A gable roof: triangular prism, ridge along x, apex up. */
const gable = (len: number, width: number, height: number) => {
  const g = new THREE.CylinderGeometry(1, 1, len, 3, 1, false, Math.PI / 2);
  g.rotateZ(Math.PI / 2);
  g.scale(1, height / 1.5, width / 1.732);
  g.translate(0, height / 3, 0);
  return g;
};

const pick = <T,>(rng: () => number, xs: T[]) => xs[Math.floor(rng() * xs.length)];

const WOOD = ['#8A5A3C', '#7A4E34', '#946444'];
const LEAF = ['#6FAE4F', '#7DBB57', '#5E9E46', '#86C25E'];
const CHERRY = ['#F6B6C8', '#F3A4BC', '#FFC9D6', '#F7BFD0'];
const AUTUMN = ['#F0A04B', '#E8823A', '#F5B657', '#E46F3A'];
const PINE = ['#4E8C5A', '#5A9A63', '#47815A'];
const PETALS = ['#FF8FA3', '#FFD166', '#FFFFFF', '#C7A6FF', '#FF9F6B', '#8EC5FF'];
const ROOF = ['#D96B4A', '#C9654A', '#B85C5C', '#6D8FC9'];
const STONE = '#B8B0A6';
const GLOW = '#FFD27A';

export interface ModelExtras {
  /** Sails or anything else that turns about local z, with its pivot. */
  spin?: { geo: THREE.BufferGeometry; at: V3 };
  /** Where smoke comes out, in item space. */
  smoke?: V3;
}

type ModelFn = (b: Builder) => ModelExtras | void;

function roundTree(b: Builder, leaves: string[], height: number) {
  const r = b.rng;
  const trunkH = height * 0.45;
  b.add(cyl(0.11, 0.17, trunkH, 6), pick(r, WOOD), { p: [0, trunkH / 2, 0], jitter: 0.03 });
  // A branch stub breaks up the silhouette.
  b.add(cyl(0.05, 0.07, 0.4, 5), pick(r, WOOD), { p: [0.12, trunkH * 0.7, 0], r: [0, 0, -0.9] });
  const blobs = 3 + Math.floor(r() * 2);
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + r();
    const rr = i === 0 ? 0 : 0.32;
    const s = i === 0 ? 0.62 : 0.42 + r() * 0.12;
    b.add(ico(s, 1), pick(r, leaves), {
      p: [Math.cos(a) * rr, trunkH + 0.35 + (i === 0 ? 0.25 : r() * 0.25), Math.sin(a) * rr],
      jitter: 0.12, vary: 0.08,
    });
  }
}

const MODELS: Record<Kind, ModelFn> = {
  tree: (b) => roundTree(b, LEAF, 2.1 + b.rng() * 0.4),
  cherry: (b) => {
    roundTree(b, CHERRY, 2.0 + b.rng() * 0.3);
    // A few fallen petals on the grass.
    for (let i = 0; i < 6; i++) {
      const a = b.rng() * 6.28, d = 0.4 + b.rng() * 0.5;
      b.add(new THREE.CircleGeometry(0.06, 5).rotateX(-Math.PI / 2), pick(b.rng, CHERRY), { p: [Math.cos(a) * d, 0.02, Math.sin(a) * d] });
    }
  },
  autumn: (b) => roundTree(b, AUTUMN, 2.0 + b.rng() * 0.4),

  pine: (b) => {
    const r = b.rng, h = 2.2 + r() * 0.6;
    b.add(cyl(0.08, 0.13, 0.5, 5), pick(r, WOOD), { p: [0, 0.25, 0] });
    const tiers = 3;
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers;
      const rad = 0.62 * (1 - t * 0.55), th = h * 0.42;
      b.add(cone(rad, th, 7), pick(r, PINE), { p: [0, 0.45 + t * h * 0.55 + th / 2, 0], jitter: 0.05, vary: 0.06 });
    }
  },

  bush: (b) => {
    const r = b.rng, n = 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      b.add(ico(0.32 + r() * 0.12, 1), pick(r, LEAF), { p: [(r() - 0.5) * 0.4, 0.25, (r() - 0.5) * 0.4], s: [1, 0.8, 1], jitter: 0.08, vary: 0.08 });
    }
    if (r() < 0.5) {
      const berry = pick(r, ['#E05A5A', '#7A6BD8', '#F2C14E']);
      for (let i = 0; i < 6; i++) {
        const a = r() * 6.28;
        b.add(ico(0.045), berry, { p: [Math.cos(a) * 0.36, 0.2 + r() * 0.25, Math.sin(a) * 0.36] });
      }
    }
  },

  flowers: (b) => {
    const r = b.rng, n = 4 + Math.floor(r() * 4);
    const palette = [pick(r, PETALS), pick(r, PETALS)];
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, d = r() * 0.32, h = 0.25 + r() * 0.2;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      b.add(cyl(0.015, 0.02, h, 4), '#5E9E46', { p: [x, h / 2, z] });
      const pc = pick(r, palette);
      for (let k = 0; k < 5; k++) {
        const pa = (k / 5) * 6.28;
        b.add(ico(0.05), pc, { p: [x + Math.cos(pa) * 0.06, h, z + Math.sin(pa) * 0.06], s: [1, 0.5, 1] });
      }
      b.add(ico(0.035), '#FFD166', { p: [x, h + 0.02, z] });
    }
    b.add(ico(0.18, 0), '#7DBB57', { p: [0, 0.05, 0], s: [1.6, 0.4, 1.6], jitter: 0.05 });
  },

  mushrooms: (b) => {
    const r = b.rng, n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, d = i === 0 ? 0 : 0.18 + r() * 0.12, s = i === 0 ? 1 : 0.55 + r() * 0.3;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      b.add(cyl(0.05 * s, 0.065 * s, 0.22 * s, 6), '#F4E9D8', { p: [x, 0.11 * s, z] });
      b.add(new THREE.SphereGeometry(0.16 * s, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), '#E2554A', { p: [x, 0.2 * s, z], vary: 0.05 });
      for (let k = 0; k < 3; k++) {
        const da = r() * 6.28;
        b.add(ico(0.022 * s), '#FFF8EE', { p: [x + Math.cos(da) * 0.09 * s, 0.31 * s, z + Math.sin(da) * 0.09 * s] });
      }
    }
  },

  rock: (b) => {
    const r = b.rng;
    b.add(dode(0.42), '#A8A29A', { p: [0, 0.18, 0], s: [1.1, 0.7, 0.9], jitter: 0.12, vary: 0.08 });
    if (r() < 0.7) b.add(dode(0.22), '#9C968E', { p: [0.38, 0.08, 0.1], s: [1, 0.6, 1], jitter: 0.08 });
    b.add(ico(0.3, 0), '#7DAE5A', { p: [-0.05, 0.4, 0], s: [1.1, 0.25, 0.9], jitter: 0.06 });
  },

  cottage: (b) => {
    const r = b.rng, roof = pick(r, ROOF);
    const W = 2.0, D = 1.5, H = 1.15;
    b.add(box(W + 0.2, 0.18, D + 0.2), STONE, { p: [0, 0.09, 0], vary: 0.05 });
    b.add(box(W, H, D), '#F3E3C8', { p: [0, 0.18 + H / 2, 0] });
    // Timber corners.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.add(box(0.12, H, 0.12), '#8A5A3C', { p: [sx * W / 2, 0.18 + H / 2, sz * D / 2] });
    }
    b.add(gable(W + 0.4, D + 0.5, 0.95), roof, { p: [0, 0.18 + H, 0], vary: 0.04 });
    b.add(box(0.36, 0.62, 0.06), '#7A4E34', { p: [0.35, 0.18 + 0.31, D / 2 + 0.01] });
    b.add(ico(0.03), '#E8C35A', { p: [0.47, 0.5, D / 2 + 0.05] });
    // Windows, front and sides: lit from inside after dusk.
    b.add(box(0.36, 0.32, 0.05), GLOW, { p: [-0.45, 0.18 + 0.66, D / 2 + 0.01], glow: true });
    b.add(box(0.05, 0.32, 0.36), GLOW, { p: [W / 2 + 0.01, 0.18 + 0.66, 0], glow: true });
    b.add(box(0.05, 0.32, 0.36), GLOW, { p: [-W / 2 - 0.01, 0.18 + 0.66, 0], glow: true });
    b.add(box(0.46, 0.06, 0.12), '#8A5A3C', { p: [-0.45, 0.18 + 0.47, D / 2 + 0.05] });
    // Flower box under the front window.
    for (let i = 0; i < 4; i++) b.add(ico(0.05), pick(r, PETALS), { p: [-0.6 + i * 0.1, 0.18 + 0.53, D / 2 + 0.08] });
    b.add(box(0.28, 0.75, 0.28), '#A8A29A', { p: [-0.55, 0.18 + H + 0.55, -0.25], vary: 0.06 });
    // Path stones out the front door.
    for (let i = 0; i < 3; i++) b.add(dode(0.12), '#CFC6B8', { p: [0.35 + (r() - 0.5) * 0.1, 0.03, D / 2 + 0.35 + i * 0.32], s: [1, 0.25, 1] });
    return { smoke: [-0.55, 0.18 + H + 0.95, -0.25] };
  },

  lantern: (b) => {
    b.add(cyl(0.05, 0.07, 1.4, 6), '#5C4433', { p: [0, 0.7, 0] });
    b.add(box(0.2, 0.06, 0.2), '#3F3A3A', { p: [0, 1.42, 0] });
    b.add(box(0.15, 0.2, 0.15), GLOW, { p: [0, 1.55, 0], glow: true });
    b.add(cone(0.16, 0.16, 4), '#3F3A3A', { p: [0, 1.73, 0], r: [0, Math.PI / 4, 0] });
    b.add(ico(0.12), '#7DBB57', { p: [0, 0.06, 0], s: [1.5, 0.4, 1.5] });
  },

  well: (b) => {
    const r = b.rng;
    b.add(cyl(0.5, 0.55, 0.5, 9), STONE, { p: [0, 0.25, 0], jitter: 0.03, vary: 0.08 });
    b.add(cyl(0.38, 0.38, 0.02, 9), '#4E8FB0', { p: [0, 0.46, 0] });
    for (const sx of [-1, 1]) b.add(box(0.08, 0.95, 0.08), pick(r, WOOD), { p: [sx * 0.45, 0.85, 0] });
    b.add(gable(1.2, 0.8, 0.4), pick(r, ROOF), { p: [0, 1.3, 0] });
    b.add(cyl(0.04, 0.04, 0.9, 5), '#7A4E34', { p: [0, 1.15, 0], r: [0, 0, Math.PI / 2] });
    b.add(cyl(0.1, 0.08, 0.15, 6), '#8A5A3C', { p: [0.1, 0.85, 0] });
  },

  windmill: (b) => {
    const r = b.rng;
    b.add(cyl(0.55, 0.85, 2.6, 8), '#EADBC4', { p: [0, 1.3, 0], vary: 0.03 });
    b.add(cone(0.72, 0.8, 8), pick(r, ROOF), { p: [0, 2.98, 0] });
    b.add(box(0.36, 0.6, 0.06), '#7A4E34', { p: [0, 0.3, 0.84], r: [-0.1, 0, 0] });
    b.add(box(0.26, 0.26, 0.05), GLOW, { p: [0, 1.6, 0.66], r: [-0.12, 0, 0], glow: true });
    b.add(cyl(0.12, 0.12, 0.4, 6), '#8A5A3C', { p: [0, 2.5, 0.72], r: [Math.PI / 2, 0, 0] });
    // Sails, built about their own hub.
    const sb = new Builder(r);
    sb.add(cyl(0.1, 0.1, 0.12, 6), '#7A4E34', { r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const dx = Math.cos(a), dy = Math.sin(a);
      sb.add(box(0.06, 1.5, 0.04), '#7A4E34', { p: [dx * 0.75, dy * 0.75, 0], r: [0, 0, a - Math.PI / 2] });
      sb.add(box(0.32, 1.15, 0.02), '#F4EADB', { p: [dx * 0.85 - dy * 0.18, dy * 0.85 + dx * 0.18, 0.02], r: [0, 0, a - Math.PI / 2], vary: 0.04 });
    }
    return { spin: { geo: Builder.merge(sb.solid)!, at: [0, 2.5, 0.95] } };
  },

  pond: (b) => {
    const r = b.rng;
    b.add(cyl(1.25, 1.25, 0.06, 12), '#7CC6D6', { p: [0, 0.04, 0], s: [1, 1, 0.8], jitter: 0.08 });
    b.add(cyl(0.9, 0.9, 0.07, 10), '#93D3DF', { p: [0.1, 0.05, 0], s: [1, 1, 0.75], jitter: 0.06 });
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * Math.PI * 2;
      b.add(dode(0.18 + r() * 0.08), pick(r, ['#B8B0A6', '#A8A29A', '#CFC6B8']), { p: [Math.cos(a) * 1.32, 0.06, Math.sin(a) * 1.05], s: [1, 0.55, 1], jitter: 0.05 });
    }
    for (let i = 0; i < 3; i++) {
      const a = r() * 6.28, d = 0.3 + r() * 0.5;
      b.add(new THREE.CircleGeometry(0.16, 7, 0.4, Math.PI * 1.8).rotateX(-Math.PI / 2), '#6FAE4F', { p: [Math.cos(a) * d, 0.09, Math.sin(a) * d * 0.8] });
      if (i === 0) b.add(ico(0.06), '#FFB3C7', { p: [Math.cos(a) * d, 0.13, Math.sin(a) * d * 0.8] });
    }
    for (let i = 0; i < 4; i++) {
      const a = 2.2 + i * 0.25;
      b.add(cyl(0.02, 0.025, 0.6, 4), '#6D9A4A', { p: [Math.cos(a) * 1.25, 0.3, Math.sin(a) * 1.0] });
      b.add(cyl(0.04, 0.04, 0.16, 5), '#7A4E34', { p: [Math.cos(a) * 1.25, 0.6, Math.sin(a) * 1.0] });
    }
  },

  bench: (b) => {
    const r = b.rng, wood = pick(r, WOOD);
    b.add(box(1.1, 0.07, 0.36), wood, { p: [0, 0.42, 0] });
    b.add(box(1.1, 0.3, 0.06), wood, { p: [0, 0.68, -0.17], r: [-0.15, 0, 0] });
    for (const sx of [-1, 1]) {
      b.add(box(0.06, 0.42, 0.32), '#4A4040', { p: [sx * 0.46, 0.21, 0] });
      b.add(box(0.06, 0.4, 0.06), '#4A4040', { p: [sx * 0.46, 0.6, -0.17] });
    }
  },

  beehive: (b) => {
    const r = b.rng, n = 2 + Math.floor(r() * 2);
    for (let h = 0; h < n; h++) {
      const x = (h - (n - 1) / 2) * 0.55;
      b.add(box(0.36, 0.18, 0.36), '#8A5A3C', { p: [x, 0.09, 0] });
      for (let i = 0; i < 4; i++) {
        b.add(new THREE.TorusGeometry(0.17 - i * 0.03, 0.06, 5, 9), i % 2 ? '#E8B84A' : '#F2CC6A', { p: [x, 0.24 + i * 0.1, 0], r: [Math.PI / 2, 0, 0] });
      }
      b.add(ico(0.06), '#E8B84A', { p: [x, 0.62, 0] });
      b.add(box(0.07, 0.05, 0.02), '#5C4433', { p: [x, 0.25, 0.2] });
    }
  },

  tower: (b) => {
    const r = b.rng;
    b.add(cyl(0.7, 0.85, 3.2, 9), '#CFC6B8', { p: [0, 1.6, 0], vary: 0.08, jitter: 0.04 });
    b.add(cyl(0.9, 0.8, 0.25, 9), '#B8B0A6', { p: [0, 3.3, 0] });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      b.add(box(0.22, 0.25, 0.22), '#B8B0A6', { p: [Math.cos(a) * 0.8, 3.55, Math.sin(a) * 0.8], r: [0, -a, 0] });
    }
    b.add(box(0.3, 0.42, 0.05), GLOW, { p: [0, 2.2, 0.8], r: [-0.08, 0, 0], glow: true });
    b.add(box(0.26, 0.4, 0.05), GLOW, { p: [0, 1.1, 0.83], r: [-0.08, 0, 0], glow: true });
    b.add(box(0.4, 0.7, 0.06), '#7A4E34', { p: [0, 0.35, 0.86], r: [-0.08, 0, 0] });
    b.add(cyl(0.025, 0.025, 1.0, 4), '#5C4433', { p: [0, 3.95, 0] });
    b.add(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -0.35, 0, 0.6, -0.17, 0, 0, 0, 0, 0.6, -0.17, 0, 0, -0.35, 0], 3)), pick(r, ['#E05A5A', '#F2C14E', '#6D8FC9']), { p: [0.02, 4.42, 0] });
  },
};

export interface BuiltModel {
  solid: THREE.BufferGeometry | null;
  glow: THREE.BufferGeometry | null;
  extras: ModelExtras;
}

export function buildModel(kind: Kind, variant: number): BuiltModel {
  const b = new Builder(mulberry32(variant * 9973 + kind.length * 131));
  const extras = MODELS[kind](b) || {};
  return { solid: Builder.merge(b.solid), glow: Builder.merge(b.glow), extras };
}
