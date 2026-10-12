// Renderer, post-processing and the frame loop. Same shape as Inkbound's
// engine (bloom → output → vignette/grain), with one difference that matters
// more here than in a game: this page sits open for hours, so it is frugal.
//
//  - capped at 30 fps while the timer runs, 20 when idle, ~5 under reduced motion
//  - stops entirely while the tab is hidden
//  - "auto" quality steps down on its own if frames stay slow
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export type QualityMode = 'auto' | 'high' | 'medium' | 'low';
export const QUALITY_MODES: QualityMode[] = ['auto', 'high', 'medium', 'low'];

const levelOf = (m: QualityMode) => (m === 'low' ? 0 : m === 'medium' ? 1 : 2);

/** What each level gets. 2 high, 1 medium, 0 low. */
const Q = {
  pixelRatio: (lv: number) => Math.min(window.devicePixelRatio || 1, [1, 1.25, 1.75][lv]),
  samples: (lv: number) => [0, 2, 4][lv],
  post: (lv: number) => lv > 0,
  shadows: (lv: number) => lv > 0,
};

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      // A soft, warm vignette: the corners go amber rather than grey.
      float v = smoothstep(0.95, 0.25, length(d * vec2(1.0, 0.9)));
      c.rgb *= mix(vec3(0.80, 0.72, 0.70), vec3(1.0), v);
      c.rgb += (hash(vUv * 700.0) - 0.5) * 0.018;
      gl_FragColor = c;
    }
  `,
};

export interface Frame { dt: number; time: number }

export class Engine {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, 1, 0.5, 2000);
  mode: QualityMode;
  level: number;
  /** Frames per second to aim for; the caller moves it with the timer state. */
  fps = 30;
  onResize: (w: number, h: number) => void = () => {};
  onQualityChange: (level: number) => void = () => {};

  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private final: ShaderPass | null = null;
  private last = 0;
  private acc = 0;
  private time = 0;
  private raf = 0;
  private perf = { t: 0, frames: 0, slow: 0, warm: 0 };

  constructor(private canvas: HTMLCanvasElement, mode: QualityMode, private update: (f: Frame) => void) {
    this.mode = mode;
    this.level = levelOf(mode);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power', alpha: false });
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.applyLevel();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(this.raf);
      else { this.last = 0; this.raf = requestAnimationFrame(this.loop); }
    });
  }

  setQuality(mode: QualityMode) {
    this.mode = mode;
    this.level = levelOf(mode);
    this.applyLevel();
  }

  private applyLevel() {
    const lv = this.level;
    this.renderer.setPixelRatio(Q.pixelRatio(lv));
    this.renderer.shadowMap.enabled = Q.shadows(lv);
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.needsUpdate = true;
    });
    this.composer?.dispose();
    this.composer = null;
    if (Q.post(lv)) {
      const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
      const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: Q.samples(lv) });
      this.composer = new EffectComposer(this.renderer, rt);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(size, 0.3, 0.6, 0.96);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
      this.final = new ShaderPass(FinalShader);
      this.composer.addPass(this.final);
    }
    this.resize();
    this.onQualityChange(lv);
  }

  setBloom(strength: number) { if (this.bloom) this.bloom.strength = strength; }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.onResize(w, h);
  }

  start() { this.raf = requestAnimationFrame(this.loop); }

  /** Draw one frame now, whatever the cap says. */
  renderNow() { this.draw(0); }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.last) { this.last = now; return; }
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    const step = 1 / this.fps;
    if (this.acc < step * 0.95) return;
    const frameDt = Math.min(0.25, this.acc);
    this.acc = 0;
    this.draw(frameDt);
    this.watchPerf(now, frameDt);
  };

  private draw(dt: number) {
    this.time += dt;
    this.update({ dt, time: this.time });
    if (this.composer) {
      if (this.final) this.final.uniforms.uTime.value = this.time % 100;
      this.composer.render(dt);
    } else this.renderer.render(this.scene, this.camera);
  }

  /** In auto mode, step down a level after a few seconds well under the target. */
  private watchPerf(now: number, dt: number) {
    if (this.mode !== 'auto' || this.level === 0) return;
    const p = this.perf;
    if (!p.t) p.t = now;
    p.frames++;
    if (dt > 1.4 / this.fps) p.slow++;
    if (now - p.t < 3000) return;
    if (p.warm++ > 0 && p.slow / p.frames > 0.45) { this.level -= 1; this.applyLevel(); }
    p.t = now; p.frames = 0; p.slow = 0;
  }
}
