// The island world: terrain, garden, sky and ambience under one camera.
//
// The page tells it four things each frame: which phase, how far through it,
// whether the clock is running, and how grown the current sprout is. Everything
// visual follows from those.
import * as THREE from 'three';
import { Engine, type QualityMode } from './engine';
import { Sky, paletteFor, bodyDir, type Palette } from './sky';
import { Terrain } from './terrain';
import { GardenView } from './gardenView';
import { Ambient } from './ambient';
import { islandRadius } from '../garden';
import type { Phase } from '../timer';
import { clamp, lerp } from '../util';

export interface WorldState {
  phase: Phase;
  /** Progress through the phase, 0..1. */
  u: number;
  running: boolean;
  /** Growth of the current focus block's sprout, 0..1, or null when there is none. */
  grow: number | null;
}

const CROSSFADE_S = 2.4;

export class World {
  engine: Engine;
  private sky = new Sky();
  private terrain: Terrain;
  private garden: GardenView;
  private ambient: Ambient;
  private hemi = new THREE.HemisphereLight('#ffffff', '#8a6a4a', 1);
  private sun = new THREE.DirectionalLight('#ffffff', 2);
  private solidMat: THREE.MeshStandardMaterial;
  private glowMat: THREE.MeshStandardMaterial;

  private state: WorldState = { phase: 'focus', u: 0, running: false, grow: null };
  private shownU = 0;
  private shownPhase: Phase = 'focus';
  private fadeFrom: Palette | null = null;
  private fade = 1;
  private R: number;
  private shownR: number;
  private depth = 0;
  private builtR = 0;
  private reduced: boolean;
  private nightShown = 0;
  onNight: (night: number) => void = () => {};

  // Camera: a slow sway around home, plus whatever the user drags in. Drags ease back after a while.
  private cam = { az: 0, el: 0, zoom: 1, idle: 99 };
  private drag: { id: number; x: number; y: number }[] = [];
  private pinch0 = 0;

  constructor(canvas: HTMLCanvasElement, seed: number, planted: number, quality: QualityMode, reduced: boolean) {
    this.reduced = reduced;
    this.engine = new Engine(canvas, quality, (f) => this.frame(f.dt, f.time));
    const scene = this.engine.scene;
    scene.fog = new THREE.Fog('#ffffff', 40, 200);

    this.solidMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.88, metalness: 0 });
    this.glowMat = new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: true, roughness: 0.6,
      emissive: new THREE.Color('#FFB85C'), emissiveIntensity: 0.2,
    });

    this.terrain = new Terrain(seed, this.solidMat);
    this.R = this.shownR = islandRadius(planted);
    this.rebuildTerrain();
    this.garden = new GardenView(seed, this.terrain, this.solidMat, this.glowMat);
    this.garden.setCount(planted);
    this.ambient = new Ambient(seed, this.solidMat);

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.sky.group, this.terrain.mesh, this.garden.group, this.ambient.group, this.hemi, this.sun, this.sun.target);

    this.engine.onResize = () => this.pixelRatioChanged();
    this.engine.onQualityChange = (lv) => {
      this.sun.shadow.mapSize.setScalar(lv >= 2 ? 2048 : 1024);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
      this.pixelRatioChanged();
    };
    this.pixelRatioChanged();
    this.bindPointer(canvas);
    this.engine.renderNow();
    this.engine.start();
  }

  private pixelRatioChanged() {
    const px = this.engine.renderer.getPixelRatio();
    this.sky.setViewport(window.innerWidth, window.innerHeight, px);
    this.ambient?.setPixelRatio(px);
  }

  private primed = false;
  setState(s: WorldState) {
    this.state = s;
    // The first state lands as-is: a reload mid-break opens on the evening sky, not a fade from dawn.
    if (!this.primed) { this.primed = true; this.shownPhase = s.phase; this.shownU = s.u; }
  }
  setReduced(on: boolean) { this.reduced = on; }
  setQuality(q: QualityMode) { this.engine.setQuality(q); }

  /** A block was earned: the sprout becomes permanent and the island grows. */
  plant() {
    this.garden.plantNext();
    this.R = islandRadius(this.garden.count);
  }

  /** Wipe the garden (settings → start over). */
  resetGarden(planted: number) {
    this.garden.setCount(planted);
    this.R = this.shownR = islandRadius(planted);
    this.rebuildTerrain();
  }

  private rebuildTerrain() {
    this.depth = this.terrain.build(this.shownR);
    this.builtR = this.shownR;
  }

  private frame(dt: number, time: number) {
    const s = this.state;

    // Phase changes crossfade the whole palette rather than cutting.
    if (s.phase !== this.shownPhase) {
      this.fadeFrom = paletteFor(this.shownPhase, this.shownU);
      this.fade = 0;
      this.shownPhase = s.phase;
      this.shownU = s.u;
    }
    // Ease the arc position so a skip or reset glides instead of jumping.
    this.shownU += (s.u - this.shownU) * clamp(dt * 3, 0, 1);
    let pal = paletteFor(this.shownPhase, this.shownU);
    if (this.fadeFrom && this.fade < 1) {
      this.fade = Math.min(1, this.fade + dt / CROSSFADE_S);
      const t = this.fade * this.fade * (3 - 2 * this.fade);
      pal = mixPalette(this.fadeFrom, pal, t);
    }

    // Grow the island toward its new radius.
    if (Math.abs(this.R - this.shownR) > 0.001) {
      this.shownR += (this.R - this.shownR) * clamp(dt * 1.5, 0, 1);
      if (Math.abs(this.R - this.shownR) < 0.01) this.shownR = this.R;
      if (Math.abs(this.shownR - this.builtR) > 0.04 || this.shownR === this.R) this.rebuildTerrain();
    }

    // Lighting. The visible sun is behind the island; the key light comes from
    // in front of it, following the sun left to right, so the faces you look at
    // are lit and shadows fall away from you.
    const body = bodyDir(this.shownU, new THREE.Vector3());
    const lightDir = new THREE.Vector3(body.x * 0.8, Math.max(0.8, body.y + 0.55), 0.6).normalize();
    const R = this.shownR;
    this.sun.position.copy(lightDir).multiplyScalar(R + 30);
    this.sun.color.copy(pal.light);
    this.sun.intensity = pal.intensity;
    const sc = this.sun.shadow.camera;
    const ext = R + 4;
    if (sc.right !== ext) {
      sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = R * 2 + 70;
      sc.updateProjectionMatrix();
    }
    this.hemi.color.copy(pal.hemiSky);
    this.hemi.groundColor.copy(pal.hemiGround);
    this.hemi.intensity = pal.hemi;
    this.glowMat.emissiveIntensity = lerp(0.05, 2.4, clamp((pal.night - 0.1) / 0.6, 0, 1));
    this.engine.setBloom(0.14 + pal.night * 0.5);

    const fog = this.engine.scene.fog as THREE.Fog;
    fog.color.copy(pal.horizon).lerp(pal.below, 0.55);

    this.placeCamera(dt, time);
    const camDist = this.engine.camera.position.length();
    fog.near = camDist * 1.1;
    fog.far = camDist * 4.2 + 60;

    const moon = this.shownPhase !== 'focus';
    this.sky.update(pal, this.shownU, moon, time, this.engine.camera.position);
    this.sky.showArc(this.state.running || this.state.u > 0);

    const cloudTint = new THREE.Color('#FFFFFF').lerp(pal.horizon, 0.35).lerp(pal.top, pal.night * 0.35);
    this.garden.update(dt, time, s.grow, s.running);
    this.ambient.update(dt, time, R, this.depth, pal.night, cloudTint, this.garden.smoke, this.reduced);

    if (Math.abs(pal.night - this.nightShown) > 0.02) {
      this.nightShown = pal.night;
      this.onNight(pal.night);
    }
  }

  private placeCamera(dt: number, time: number) {
    const cam = this.engine.camera;
    const c = this.cam;
    c.idle += dt;
    // After eight seconds alone, drift back to the home view.
    if (c.idle > 8 && !this.drag.length) {
      const k = clamp(dt * 0.6, 0, 1);
      c.az += (0 - c.az) * k; c.el += (0 - c.el) * k; c.zoom += (1 - c.zoom) * k;
    }
    const sway = this.reduced ? 0 : Math.sin(time * 0.045) * 0.2;
    const az = sway + c.az;
    const el = clamp(0.36 + c.el + (this.reduced ? 0 : Math.sin(time * 0.06) * 0.025), 0.08, 1.2);

    // Fit the island: width across the screen, height (top plus underside) down it.
    const R = this.shownR;
    const vfov = THREE.MathUtils.degToRad(cam.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * cam.aspect);
    // Portrait screens can let the island run nearly edge to edge.
    const wide = (R * (cam.aspect < 0.8 ? 1.15 : 1.5) + 2) / Math.tan(hfov / 2);
    const tall = (R * 0.5 + this.depth * 0.4 + 2.6) / Math.tan(vfov / 2);
    const dist = Math.max(wide, tall, 14) * c.zoom;

    // Aim above the island so it sits in the lower part of the screen, under the clock.
    const aim = new THREE.Vector3(0, R * 0.22 + 1.6 - this.depth * 0.08, 0);
    cam.position.set(Math.sin(az) * Math.cos(el) * dist, aim.y + Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    cam.lookAt(aim);
    cam.far = dist * 6 + 1200;
    cam.updateProjectionMatrix();
  }

  private bindPointer(el: HTMLCanvasElement) {
    el.style.touchAction = 'none';
    const pts = this.drag;
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      pts.push({ id: e.pointerId, x: e.clientX, y: e.clientY });
      if (pts.length === 2) this.pinch0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      this.cam.idle = 0;
      this.engine.fps = 60;
    });
    el.addEventListener('pointermove', (e) => {
      const p = pts.find((q) => q.id === e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      this.cam.idle = 0;
      if (pts.length === 1) {
        this.cam.az -= dx * 0.006;
        this.cam.el = clamp(this.cam.el + dy * 0.004, -0.3, 0.75);
      } else if (pts.length === 2) {
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (this.pinch0 > 0) this.cam.zoom = clamp(this.cam.zoom * (this.pinch0 / d), 0.45, 1.6);
        this.pinch0 = d;
      }
    });
    const up = (e: PointerEvent) => {
      const i = pts.findIndex((q) => q.id === e.pointerId);
      if (i >= 0) pts.splice(i, 1);
      this.pinch0 = 0;
      if (!pts.length) this.engine.fps = this.idleFps;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cam.zoom = clamp(this.cam.zoom * Math.exp(e.deltaY * 0.0012), 0.45, 1.6);
      this.cam.idle = 0;
    }, { passive: false });
  }

  /** The cap the page wants when nobody is dragging. */
  idleFps = 30;
  setFps(fps: number) {
    this.idleFps = fps;
    if (!this.drag.length) this.engine.fps = fps;
  }
}

function mixPalette(a: Palette, b: Palette, t: number): Palette {
  const c = (x: THREE.Color, y: THREE.Color) => x.clone().lerp(y, t);
  return {
    top: c(a.top, b.top), horizon: c(a.horizon, b.horizon), below: c(a.below, b.below),
    light: c(a.light, b.light), intensity: lerp(a.intensity, b.intensity, t),
    hemiSky: c(a.hemiSky, b.hemiSky), hemiGround: c(a.hemiGround, b.hemiGround), hemi: lerp(a.hemi, b.hemi, t),
    night: lerp(a.night, b.night, t),
  };
}
