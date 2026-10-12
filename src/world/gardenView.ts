// Draws the garden: everything planted so far, plus the one thing growing
// during the current focus block.
//
// The growing item is the exact item the next earned block will plant, at
// its real spot: a sapling that fills out, or a building that rises from its
// footings. Abandon the block and it shrinks back into the ground. Finish it
// and it pops into place with a burst of sparkles.
//
// Settled items are merged ("baked") into one solid mesh and one glow mesh,
// so a garden of three hundred things is two draw calls, not six hundred.
import * as THREE from 'three';
import { KIND_INFO, Layout, type Placed } from '../garden';
import { buildModel, type BuiltModel } from './models';
import type { Terrain } from './terrain';
import { clamp, easeOutBack } from '../util';

interface Item {
  placed: Placed;
  model: BuiltModel;
  group: THREE.Group;
  solid: THREE.Mesh | null;
  glow: THREE.Mesh | null;
  spin: THREE.Mesh | null;
  smoke: THREE.Vector3 | null;
}

const POP_S = 0.9;

export class GardenView {
  group = new THREE.Group();
  /** Smoke emitters in world space; the ambience reads these. */
  smoke: THREE.Vector3[] = [];

  private layout: Layout;
  private items: Item[] = [];
  private bakedSolid: THREE.Mesh;
  private bakedGlow: THREE.Mesh;
  private baked = 0;
  private spinners: THREE.Mesh[] = [];
  private popping: { item: Item; t: number; from: number }[] = [];
  private sprout: Item | null = null;
  private sproutScale = 0;
  private ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private bursts: { pts: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>; t: number }[] = [];
  private bakeTimer = 0;

  constructor(seed: number, private terrain: Terrain, private solidMat: THREE.Material, private glowMat: THREE.Material) {
    this.layout = new Layout(seed);
    this.bakedSolid = new THREE.Mesh(new THREE.BufferGeometry(), solidMat);
    this.bakedSolid.castShadow = this.bakedSolid.receiveShadow = true;
    this.bakedGlow = new THREE.Mesh(new THREE.BufferGeometry(), glowMat);
    this.group.add(this.bakedSolid, this.bakedGlow);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 0.9, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#FFF4D6', transparent: true, opacity: 0, depthWrite: false }),
    );
    this.group.add(this.ring);
  }

  get count() { return this.items.length; }

  /** Up to the next item without animation (page load). */
  setCount(n: number) {
    while (this.items.length > n) this.removeLast();
    while (this.items.length < n) this.items.push(this.make(this.items.length, true));
    this.bake();
  }

  /** The sprout becomes a planted item, with a pop. */
  plantNext() {
    const i = this.items.length;
    let item = this.sprout;
    const from = item ? this.sproutScale : 0;
    if (!item || item.placed.i !== i) item = this.make(i, false);
    this.sprout = null;
    this.sproutScale = 0;
    this.items.push(item);
    this.popping.push({ item, t: 0, from });
    this.burst(item.group.position);
    this.registerExtras(item);
  }

  /** Where the next item will stand (the camera likes to know). */
  nextPlaced(): Placed { return this.layout.get(this.items.length); }

  private make(i: number, settled: boolean): Item {
    const placed = this.layout.get(i);
    const model = buildModel(placed.kind, placed.variant);
    const group = new THREE.Group();
    group.position.set(placed.x, this.terrain.heightAt(placed.x, placed.z) - 0.04, placed.z);
    group.rotation.y = placed.rot;
    group.scale.setScalar(placed.scale);
    const solid = model.solid ? new THREE.Mesh(model.solid, this.solidMat) : null;
    const glow = model.glow ? new THREE.Mesh(model.glow, this.glowMat) : null;
    if (solid) { solid.castShadow = true; group.add(solid); }
    if (glow) group.add(glow);
    let spin: THREE.Mesh | null = null;
    if (model.extras.spin) {
      spin = new THREE.Mesh(model.extras.spin.geo, this.solidMat);
      spin.position.set(...model.extras.spin.at);
      spin.castShadow = true;
      group.add(spin);
    }
    const item: Item = { placed, model, group, solid, glow, spin, smoke: null };
    if (settled) this.registerExtras(item);
    return item;
  }

  private registerExtras(item: Item) {
    item.group.updateMatrixWorld(true);
    if (item.spin && !this.spinners.includes(item.spin)) this.spinners.push(item.spin);
    if (item.model.extras.smoke && !item.smoke) {
      item.smoke = new THREE.Vector3(...item.model.extras.smoke).applyMatrix4(item.group.matrixWorld);
      this.smoke.push(item.smoke);
    }
  }

  private removeLast() {
    const it = this.items.pop()!;
    this.group.remove(it.group);
    it.model.solid?.dispose(); it.model.glow?.dispose();
    if (it.spin) this.spinners = this.spinners.filter((s) => s !== it.spin);
    if (it.smoke) this.smoke = this.smoke.filter((s) => s !== it.smoke);
    this.baked = Math.min(this.baked, this.items.length);
  }

  /** Merge every settled item into the two baked meshes; only spinning parts stay separate. */
  private bake() {
    const live = new Set(this.popping.map((p) => p.item));
    const solids: THREE.BufferGeometry[] = [], glows: THREE.BufferGeometry[] = [];
    for (const it of this.items) {
      if (live.has(it)) continue;
      it.group.updateMatrixWorld(true);
      if (it.solid) solids.push(it.model.solid!.clone().applyMatrix4(it.group.matrixWorld));
      if (it.glow) glows.push(it.model.glow!.clone().applyMatrix4(it.group.matrixWorld));
      // Keep spinning parts as live children; the rest of the group comes off the scene.
      if (it.group.parent) this.group.remove(it.group);
      if (it.spin && it.spin.parent !== this.group) {
        it.spin.removeFromParent();
        it.spin.position.set(...it.model.extras.spin!.at).applyMatrix4(it.group.matrixWorld);
        it.spin.quaternion.copy(it.group.quaternion);
        it.spin.scale.copy(it.group.scale);
        this.group.add(it.spin);
      }
    }
    const merge = (list: THREE.BufferGeometry[]) => {
      if (!list.length) return new THREE.BufferGeometry();
      const total = list.reduce((s, g) => s + g.getAttribute('position').count, 0);
      const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
      let o = 0;
      for (const g of list) {
        const n = g.getAttribute('position').count;
        pos.set((g.getAttribute('position') as THREE.BufferAttribute).array as Float32Array, o * 3);
        nor.set((g.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array, o * 3);
        col.set((g.getAttribute('color') as THREE.BufferAttribute).array as Float32Array, o * 3);
        o += n;
        g.dispose();
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      out.setAttribute('color', new THREE.BufferAttribute(col, 3));
      out.computeBoundingSphere();
      return out;
    };
    this.bakedSolid.geometry.dispose();
    this.bakedSolid.geometry = merge(solids);
    this.bakedGlow.geometry.dispose();
    this.bakedGlow.geometry = merge(glows);
    this.baked = this.items.length;
  }

  /** Called every frame. `grow` is 0..1 progress of the current focus block, or null outside one. */
  update(dt: number, time: number, grow: number | null, running: boolean) {
    // The sprout: created lazily once a block is under way.
    const target = grow === null ? 0 : grow > 0 || running ? 0.08 + 0.92 * grow : 0;
    if (target > 0 && !this.sprout) {
      this.sprout = this.make(this.items.length, false);
      this.group.add(this.sprout.group);
      this.sproutScale = 0;
    }
    if (this.sprout) {
      this.sproutScale += (target - this.sproutScale) * clamp(dt * 2.2, 0, 1);
      this.applyGrowth(this.sprout, this.sproutScale);
      const p = this.sprout.group.position;
      const r = KIND_INFO[this.sprout.placed.kind].r * 1.15;
      this.ring.position.set(p.x, p.y + 0.06, p.z);
      this.ring.scale.setScalar(r * (1 + Math.sin(time * 2) * 0.04));
      this.ring.material.opacity = clamp(target * 3, 0, 1) * (0.32 + Math.sin(time * 2) * 0.08);
      if (target === 0 && this.sproutScale < 0.01) {
        this.group.remove(this.sprout.group);
        this.sprout.model.solid?.dispose(); this.sprout.model.glow?.dispose();
        this.sprout = null;
      }
    } else this.ring.material.opacity = 0;

    // Pops.
    for (const p of this.popping) {
      if (!p.item.group.parent) this.group.add(p.item.group);
      p.t += dt / POP_S;
      const t = clamp(p.t, 0, 1);
      this.applyGrowth(p.item, p.from + (1 - p.from) * easeOutBack(t));
    }
    if (this.popping.some((p) => p.t >= 1)) {
      this.popping = this.popping.filter((p) => p.t < 1);
      this.bakeTimer = 0.4;
    }
    if (this.bakeTimer > 0 && (this.bakeTimer -= dt) <= 0 && !this.popping.length) this.bake();

    for (const s of this.spinners) s.rotateZ(dt * 0.6);

    for (const b of this.bursts) {
      b.t += dt;
      b.pts.material.uniforms.uT.value = b.t;
    }
    const dead = this.bursts.filter((b) => b.t > 1.6);
    for (const b of dead) { this.group.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); }
    if (dead.length) this.bursts = this.bursts.filter((b) => b.t <= 1.6);
  }

  /** Plants grow uniformly; structures rise from their footings. */
  private applyGrowth(item: Item, f: number) {
    const s = item.placed.scale;
    const g = item.group;
    if (KIND_INFO[item.placed.kind].structure) g.scale.set(s * Math.min(1, 0.85 + f * 0.15), s * Math.max(0.001, f), s * Math.min(1, 0.85 + f * 0.15));
    else g.scale.setScalar(s * Math.max(0.001, f));
  }

  private burst(at: THREE.Vector3) {
    const n = 46, dir = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, up = 0.6 + Math.random() * 1.2, out = 0.6 + Math.random() * 1.4;
      dir.set([Math.cos(a) * out, up * 2.2, Math.sin(a) * out], i * 3);
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(dir, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const pts = new THREE.Points(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uOrigin: { value: at.clone().add(new THREE.Vector3(0, 0.5, 0)) }, uPx: { value: window.devicePixelRatio || 1 } },
      vertexShader: /* glsl */`
        attribute float seed; uniform float uT, uPx; uniform vec3 uOrigin; varying float vA; varying float vS;
        void main() {
          float t = uT * (0.8 + seed * 0.4);
          vec3 p = uOrigin + position * (1.0 - exp(-t * 2.5)) * 0.9 + vec3(0.0, -t * t * 0.9, 0.0);
          vA = clamp(1.0 - t / 1.4, 0.0, 1.0);
          vS = seed;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (5.0 + seed * 6.0) * uPx * (12.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        varying float vA; varying float vS;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          // A four-point twinkle rather than a dot.
          float s = max(1.0 - abs(c.x) * 9.0 - abs(c.y) * 2.2, 1.0 - abs(c.y) * 9.0 - abs(c.x) * 2.2);
          s = max(s, smoothstep(0.22, 0.0, length(c)));
          vec3 col = mix(vec3(1.0, 0.85, 0.45), vec3(1.0, 0.7, 0.8), vS);
          gl_FragColor = vec4(col * 1.8, clamp(s, 0.0, 1.0) * vA);
        }
      `,
    }));
    pts.frustumCulled = false;
    this.group.add(pts);
    this.bursts.push({ pts, t: 0 });
  }
}
