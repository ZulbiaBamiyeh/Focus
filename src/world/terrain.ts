// The island itself: a grassy top with gentle rolls, a dirt lip, and a
// jagged rock underside tapering to a point. Built from polar rings so its
// radius can grow smoothly; flat-shaded with a colour per face.
import * as THREE from 'three';
import { mulberry32 } from '../util';

/** Smooth 2D value noise, world-space, so every rebuild agrees on heights. */
function makeNoise(seed: number) {
  const rng = mulberry32(seed);
  const P = 128, g = new Float32Array(P * P);
  for (let i = 0; i < g.length; i++) g[i] = rng();
  const at = (x: number, y: number) => g[((y & (P - 1)) * P) + (x & (P - 1))];
  const sm = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

export class Terrain {
  mesh: THREE.Mesh;
  private noise: (x: number, y: number) => number;
  private phases: number[];
  private seed: number;
  radius = 0;

  constructor(seed: number, material: THREE.Material) {
    this.seed = seed;
    this.noise = makeNoise(seed);
    const rng = mulberry32(seed ^ 0x5bd1e995);
    this.phases = [rng() * 6.28, rng() * 6.28, rng() * 6.28];
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
  }

  /** Grass height at a world point. Gentle: items sit on it, the camera barely notices it. */
  heightAt(x: number, z: number): number {
    const n = this.noise(x * 0.22 + 50, z * 0.22 + 50) * 0.55 + this.noise(x * 0.6 + 9, z * 0.6 + 9) * 0.12;
    // A low hill in the middle. Independent of the radius, so an item keeps
    // its height as the island grows around it.
    return n + 0.45 * Math.exp(-(x * x + z * z) / 30);
  }

  /** The rim isn't a circle: a few low-frequency wobbles. */
  edge(theta: number, R: number) {
    const [a, b, c] = this.phases;
    return R * (1 + 0.06 * Math.sin(3 * theta + a) + 0.04 * Math.sin(5 * theta + b) + 0.025 * Math.sin(9 * theta + c));
  }

  build(R: number) {
    this.radius = R;
    const S = Math.round(Math.max(40, Math.min(110, R * 6)));   // segments round
    const J = Math.max(4, Math.ceil(R / 0.85));                 // rings across the top
    const K = 7;                                                // rings down the underside
    const depth = R * 0.95 + 1.6;
    const rng = mulberry32(this.seed ^ 0x1234567);

    const pos: number[] = [], col: number[] = [];
    const grass = ['#A9DB79', '#9FD46F', '#B4E184', '#97CC69', '#BCE38A'].map((c) => new THREE.Color(c));
    const dryGrass = new THREE.Color('#D8DE88');
    const dirt = [new THREE.Color('#B07A4E'), new THREE.Color('#A06D45'), new THREE.Color('#BC875A')];
    const rockTop = new THREE.Color('#9A7A63'), rockDeep = new THREE.Color('#6C5448');
    const c = new THREE.Color();

    const tri = (a: number[], b: number[], d: number[], color: THREE.Color) => {
      pos.push(...a, ...b, ...d);
      for (let k = 0; k < 3; k++) col.push(color.r, color.g, color.b);
    };

    // The top: rings whose vertex count grows with their radius, stitched
    // together by angle. Even-sized triangles everywhere, no star at the middle.
    const rings: { pts: number[][]; off: number }[] = [];
    for (let j = 0; j <= J; j++) {
      const n = j === 0 ? 1 : j === J ? S : Math.max(6, Math.round((S * j) / J));
      const off = j === 0 || j === J ? 0 : (j % 2) * 0.5;
      const pts: number[][] = [];
      for (let k = 0; k < n; k++) {
        if (j === 0) { pts.push([0, this.heightAt(0, 0), 0]); continue; }
        let th = ((k + off) / n) * Math.PI * 2;
        let r = (this.edge(th, R) * j) / J;
        if (j < J) {
          th += (this.noise(j * 7.1 + k * 0.37, k * 1.3) - 0.5) * (2.4 / n);
          r += (this.noise(k * 1.7, j * 5.3 + 11) - 0.5) * 0.45;
        }
        const x = Math.cos(th) * r, z = Math.sin(th) * r;
        pts.push([x, this.heightAt(x, z), z]);
      }
      rings.push({ pts, off });
    }
    const pickGrass = () => {
      c.copy(grass[Math.floor(rng() * grass.length)]);
      if (rng() < 0.08) c.lerp(dryGrass, 0.6);
      return c.clone();
    };
    for (let j = 0; j < J; j++) {
      const A = rings[j], B = rings[j + 1];
      const n1 = A.pts.length, n2 = B.pts.length;
      let i = 0, k = 0;
      while (i < n1 || k < n2) {
        const aNext = (i + 1 + A.off) / n1, bNext = (k + 1 + B.off) / n2;
        if (k < n2 && (i >= n1 || n1 === 1 || bNext <= aNext)) {
          tri(A.pts[i % n1], B.pts[(k + 1) % n2], B.pts[k % n2], pickGrass());
          k++;
        } else {
          tri(A.pts[i % n1], A.pts[(i + 1) % n1], B.pts[k % n2], pickGrass());
          i++;
        }
      }
    }

    // Lip and underside. Ring 0 is the grass rim; each ring below pulls in and drops.
    const under = (k: number, s: number): number[] => {
      const th = (s / S) * Math.PI * 2;
      const rim = this.edge(th, R);
      if (k === 0) { const x = Math.cos(th) * rim, z = Math.sin(th) * rim; return [x, this.heightAt(x, z), z]; }
      if (k === 1) { const r = rim * 0.995; return [Math.cos(th) * r, -0.35 + (this.noise(s * 0.9, 3) - 0.5) * 0.15, Math.sin(th) * r]; }
      if (k === K) return [0, -depth, 0];
      const f = (k - 1) / (K - 1);
      const jag = 0.8 + this.noise(s * 0.55 + k * 13, k * 3.3) * 0.4;
      const r = rim * Math.pow(1 - f, 0.9) * jag;
      const y = -0.35 - f * depth * (0.9 + this.noise(s * 0.3, k * 5.7) * 0.2);
      return [Math.cos(th) * r, y, Math.sin(th) * r];
    };
    for (let k = 0; k < K; k++) {
      for (let s = 0; s < S; s++) {
        const s1 = (s + 1) % S;
        const a = under(k, s), b = under(k, s1), d = under(k + 1, s), e = under(k + 1, s1);
        let color: THREE.Color;
        if (k === 0) color = dirt[Math.floor(rng() * dirt.length)];
        else {
          const f = k / K;
          color = c.copy(rockTop).lerp(rockDeep, f).clone();
          color.offsetHSL(0, 0, (rng() - 0.5) * 0.06);
          if (k === 1 && rng() < 0.25) color = dirt[1];
        }
        tri(a, b, d, color);
        if (k < K - 1) tri(b, e, d, color);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    this.mesh.geometry.dispose();
    this.mesh.geometry = g;
    return depth;
  }
}
