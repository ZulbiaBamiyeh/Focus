// The sky is the clock face. Each focus block is one day: the sun rises at
// the start, crosses a faint dotted arc, and reaches golden hour as the block
// ends. Breaks are the evening: the moon takes the same arc through dusk (a
// long break goes all the way to a starry night) and pre-dawn hands back to
// the next morning.
//
// The camera looks down at the island, so the true sky is mostly above the
// screen. The sun, moon and arc are therefore drawn in screen space, on an
// arch over the clock; the light falling on the island still follows them.
import * as THREE from 'three';
import { clamp } from '../util';
import type { Phase } from '../timer';

export interface Palette {
  top: THREE.Color; horizon: THREE.Color; below: THREE.Color;
  light: THREE.Color; intensity: number;
  hemiSky: THREE.Color; hemiGround: THREE.Color; hemi: number;
  /** 0 day … 1 full night: stars, fireflies, lit windows. */
  night: number;
}

type Key = [u: number, top: string, horizon: string, below: string, light: string, intensity: number, night: number];

const DAY: Key[] = [
  [0.00, '#A9B6DE', '#FFC9A3', '#F6CFC0', '#FFC49A', 1.5, 0.12],
  [0.14, '#8DBBE8', '#FFE2C2', '#FBE6DA', '#FFD7AA', 2.3, 0.0],
  [0.50, '#7AB4EA', '#EAF2EC', '#F3F2EC', '#FFF3DF', 2.8, 0.0],
  [0.84, '#86AADD', '#FFE0B6', '#FAE3CF', '#FFD39B', 2.4, 0.0],
  [1.00, '#9B93CC', '#FFB685', '#F6CBB0', '#FFA56A', 1.6, 0.06],
];
const DUSK: Key[] = [
  [0.00, '#8C84C2', '#FFA888', '#E8B6AE', '#FF9C70', 1.0, 0.28],
  [0.50, '#626BAA', '#E99DA2', '#B6A3C2', '#D9B5E6', 0.75, 0.55],
  [1.00, '#7F8CC6', '#FFC1A6', '#E3C2C4', '#FFB894', 0.95, 0.32],
];
const NIGHT: Key[] = [
  [0.00, '#8C84C2', '#FFA888', '#E8B6AE', '#FF9C70', 1.0, 0.28],
  [0.22, '#3A4278', '#7C6E9E', '#5C5E8C', '#B9C6FF', 0.55, 0.9],
  [0.50, '#2A3266', '#5A5A90', '#474F7E', '#BFD0FF', 0.5, 1.0],
  [0.80, '#3A4278', '#8A779E', '#5E5F8C', '#C7C6F2', 0.55, 0.85],
  [1.00, '#7F8CC6', '#FFC1A6', '#E3C2C4', '#FFB894', 0.95, 0.32],
];

const tmpA = new THREE.Color(), tmpB = new THREE.Color();
function sample(keys: Key[], u: number): Palette {
  let i = 0;
  while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1];
  const t = clamp((u - a[0]) / (b[0] - a[0]), 0, 1);
  const mix = (ia: string, ib: string) => new THREE.Color(ia).lerp(tmpB.set(ib), t);
  const top = mix(a[1], b[1]), horizon = mix(a[2], b[2]), below = mix(a[3], b[3]);
  const night = a[6] + (b[6] - a[6]) * t;
  return {
    top, horizon, below,
    light: mix(a[4], b[4]),
    intensity: a[5] + (b[5] - a[5]) * t,
    hemiSky: top.clone().lerp(tmpA.set('#ffffff'), 0.35),
    hemiGround: tmpA.set('#8a6a4a').clone().lerp(horizon, 0.3),
    hemi: 1.6 - night * 0.6,
    night,
  };
}

export function paletteFor(phase: Phase, u: number): Palette {
  return sample(phase === 'focus' ? DAY : phase === 'long' ? NIGHT : DUSK, u);
}

/** Where the sun (or moon) sits on its arc at progress u. Rises left, sets right, behind the island. */
export function bodyDir(u: number, out = new THREE.Vector3()) {
  const a = Math.PI * (0.06 + 0.88 * u);
  return out.set(-Math.cos(a), Math.sin(a) * 0.62 + 0.04, -0.78).normalize();
}

const DOME_R = 900;

/** The arch in screen terms: centre and radii as fractions of the viewport, y down. */
export interface Arch { cx: number; cy: number; rx: number; ry: number }
export const archFor = (aspect: number): Arch =>
  aspect < 0.8 ? { cx: 0.5, cy: 0.5, rx: 0.42, ry: 0.42 } : { cx: 0.5, cy: 0.6, rx: 0.44, ry: 0.55 };

export class Sky {
  group = new THREE.Group();
  private dome: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private stars: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private arc: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;

  constructor() {
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(DOME_R, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: {
          uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uBelow: { value: new THREE.Color() },
          uBody: { value: new THREE.Vector3(0, 1, 0) }, uBodyCol: { value: new THREE.Color() },
          uMoon: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uSun: { value: new THREE.Vector2(0.5, 0.5) },
        },
        vertexShader: /* glsl */`
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }
        `,
        fragmentShader: /* glsl */`
          uniform vec3 uTop, uHorizon, uBelow, uBody, uBodyCol; uniform float uMoon;
          uniform vec2 uRes, uSun;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h * 1.6, 0.0, 1.0), 0.7))
                               : mix(uHorizon, uBelow, pow(clamp(-h * 3.0, 0.0, 1.0), 0.6));
            // Screen-space gradient on top, so the upper screen always reads as sky.
            vec2 sc = gl_FragCoord.xy / uRes;
            col = mix(col, mix(uHorizon, uTop, 0.75), smoothstep(0.35, 1.0, sc.y) * 0.85);
            // Distance to the body in units of screen height.
            vec2 sp = vec2(uSun.x, 1.0 - uSun.y) * uRes;
            float dist = length(gl_FragCoord.xy - sp) / uRes.y;
            // Glow around it, wider and warmer for the sun.
            col += uBodyCol * exp(-dist * mix(7.0, 16.0, uMoon)) * mix(0.42, 0.2, uMoon);
            // The disc, pushed past 1 so bloom catches it.
            float r = mix(0.034, 0.026, uMoon);
            float px = 1.5 / uRes.y;
            float disc = smoothstep(r + px, r - px, dist);
            vec3 discCol = mix(vec3(1.0, 0.93, 0.8) * 2.0, vec3(1.0, 0.97, 0.9) * 1.5, uMoon);
            // A crescent: the moon is shaded by an offset disc.
            if (uMoon > 0.5) {
              float d2 = length(gl_FragCoord.xy - sp - vec2(r * 0.55, r * 0.25) * uRes.y) / uRes.y;
              disc *= 1.0 - smoothstep(r * 0.92 + px, r * 0.92 - px, d2) * 0.88;
            }
            col = mix(col, discCol, disc);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    );
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    this.group.add(this.dome);

    // Stars: scattered over the upper dome, faded in by `night`.
    const n = 700, pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const y = Math.random() * 0.95 + 0.05, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * r * DOME_R * 0.9, y * DOME_R * 0.9, Math.sin(a) * r * DOME_R * 0.9], i * 3);
      seed[i] = Math.random();
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.stars = new THREE.Points(sg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
      uniforms: { uNight: { value: 0 }, uTime: { value: 0 }, uPx: { value: 1 } },
      vertexShader: /* glsl */`
        attribute float seed; uniform float uTime, uPx; varying float vA;
        void main() {
          vA = 0.55 + 0.45 * sin(uTime * (0.6 + seed * 1.6) + seed * 40.0);
          gl_PointSize = (1.2 + seed * 1.8) * uPx;
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uNight; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vec3(1.0, 0.95, 0.85), smoothstep(0.5, 0.1, d) * vA * uNight);
        }
      `,
    }));
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -9;
    this.group.add(this.stars);

    // The arc: dots marking the path ahead. Dots already passed fade out, so
    // the remaining stretch of dots *is* the time left.
    const m = 56, apos = new Float32Array(m * 3), at = new Float32Array(m);
    for (let i = 0; i < m; i++) at[i] = i / (m - 1);
    const ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.BufferAttribute(apos, 3));
    ag.setAttribute('at', new THREE.BufferAttribute(at, 1));
    this.arc = new THREE.Points(ag, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false,
      uniforms: { uU: { value: 0 }, uCol: { value: new THREE.Color() }, uPx: { value: 1 }, uShow: { value: 1 }, uArch: { value: new THREE.Vector4(0.5, 0.6, 0.44, 0.55) } },
      vertexShader: /* glsl */`
        attribute float at; uniform float uU, uPx; uniform vec4 uArch; varying float vA;
        void main() {
          float a = 3.14159265 * (0.04 + 0.92 * at);
          vec2 sc = vec2(uArch.x - cos(a) * uArch.z, uArch.y - sin(a) * uArch.w);
          vA = at < uU ? 0.2 : 0.85;
          gl_PointSize = (at < uU ? 3.0 : 5.0) * uPx;
          gl_Position = vec4(sc.x * 2.0 - 1.0, 1.0 - sc.y * 2.0, 1.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uCol; uniform float uShow; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(uCol, smoothstep(0.5, 0.2, d) * vA * uShow);
        }
      `,
    }));
    this.arc.frustumCulled = false;
    this.arc.renderOrder = -8;
    this.group.add(this.arc);
  }

  private arch: Arch = archFor(1.6);

  setViewport(w: number, h: number, px: number) {
    this.arch = archFor(w / h);
    const a = this.arch;
    this.arc.material.uniforms.uArch.value.set(a.cx, a.cy, a.rx, a.ry);
    this.dome.material.uniforms.uRes.value.set(w * px, h * px);
    this.setPixelRatio(px);
  }

  /** Where the body sits on screen at progress u, as viewport fractions (y down). */
  bodyScreen(u: number, out = new THREE.Vector2()) {
    const a = Math.PI * (0.04 + 0.92 * u), A = this.arch;
    return out.set(A.cx - Math.cos(a) * A.rx, A.cy - Math.sin(a) * A.ry);
  }

  setPixelRatio(px: number) {
    this.stars.material.uniforms.uPx.value = px;
    this.arc.material.uniforms.uPx.value = px;
  }

  showArc(on: boolean) { this.arc.material.uniforms.uShow.value = on ? 1 : 0; }

  update(p: Palette, u: number, moon: boolean, time: number, camPos: THREE.Vector3) {
    this.group.position.copy(camPos);
    const d = this.dome.material.uniforms;
    d.uTop.value.copy(p.top);
    d.uHorizon.value.copy(p.horizon);
    d.uBelow.value.copy(p.below);
    bodyDir(u, d.uBody.value);
    this.bodyScreen(u, d.uSun.value);
    d.uBodyCol.value.copy(p.light);
    d.uMoon.value = moon ? 1 : 0;
    this.stars.material.uniforms.uNight.value = clamp((p.night - 0.25) / 0.6, 0, 1);
    this.stars.material.uniforms.uTime.value = time;
    const a = this.arc.material.uniforms;
    a.uU.value = u;
    a.uCol.value.copy(p.night > 0.5 ? tmpA.set('#FFF3DA') : tmpA.set('#FFFFFF'));
  }
}
