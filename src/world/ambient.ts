// Life around the island: a sea of clouds below it, a few clouds drifting
// past at its height, pebbles floating under its rim, chimney smoke, and
// motes in the air that are pollen by day and fireflies after dusk.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../util';

function cloudGeo(rng: () => number, puffs: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < puffs; i++) {
    const r = 0.6 + rng() * 0.7;
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.deleteAttribute('uv');
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    // Flatten the underside so clouds sit on something.
    for (let k = 0; k < pos.count; k++) pos.setY(k, Math.max(pos.getY(k), -r * 0.35));
    g.translate((i - puffs / 2) * 0.85 + (rng() - 0.5) * 0.4, (rng() - 0.3) * 0.35, (rng() - 0.5) * 0.7);
    parts.push(g);
  }
  const m = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  m.computeVertexNormals();
  return m;
}

export class Ambient {
  group = new THREE.Group();
  private sea = new THREE.Group();
  private drifters: { mesh: THREE.Mesh; r: number; a: number; y: number; speed: number }[] = [];
  private rocks: { mesh: THREE.Mesh; r: number; a: number; y: number; ph: number }[] = [];
  private smoke: THREE.InstancedMesh;
  private motes: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private cloudMat: THREE.MeshLambertMaterial;
  private _m = new THREE.Matrix4();
  private _v = new THREE.Vector3();
  private _s = new THREE.Vector3();
  private _q = new THREE.Quaternion();

  constructor(seed: number, rockMat: THREE.Material) {
    const rng = mulberry32(seed ^ 0xc10d);
    this.cloudMat = new THREE.MeshLambertMaterial({ color: '#FFFFFF', flatShading: true });

    // The sea: big clouds in rings under the island, fading into the fog.
    const seaParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 46; i++) {
      const a = rng() * Math.PI * 2, d = 4 + Math.pow(rng(), 0.8) * 170;
      const g = cloudGeo(rng, 3 + Math.floor(rng() * 4));
      const s = 1.8 + rng() * 2.2 + d * 0.025;
      g.scale(s, s * 0.6, s);
      g.rotateY(rng() * 6.28);
      g.translate(Math.cos(a) * d, (rng() - 0.5) * 4, Math.sin(a) * d);
      seaParts.push(g);
    }
    const seaGeo = mergeGeometries(seaParts, false)!;
    seaParts.forEach((p) => p.dispose());
    this.sea.add(new THREE.Mesh(seaGeo, this.cloudMat));
    this.group.add(this.sea);

    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(cloudGeo(rng, 3 + Math.floor(rng() * 3)), this.cloudMat);
      const s = 0.7 + rng() * 0.8;
      mesh.scale.set(s, s * 0.75, s);
      this.drifters.push({ mesh, r: 8 + rng() * 26, a: rng() * Math.PI * 2, y: -6 + rng() * 5, speed: 0.008 + rng() * 0.012 });
      this.group.add(mesh);
    }

    for (let i = 0; i < 9; i++) {
      const g = new THREE.DodecahedronGeometry(0.25 + rng() * 0.45, 0);
      const pos = g.getAttribute('position') as THREE.BufferAttribute;
      for (let k = 0; k < pos.count; k++) pos.setXYZ(k, pos.getX(k) * (0.9 + rng() * 0.2), pos.getY(k) * 0.8, pos.getZ(k));
      g.deleteAttribute('uv');
      const cols = new Float32Array(pos.count * 3);
      const c = new THREE.Color('#9A7A63').offsetHSL(0, 0, (rng() - 0.5) * 0.08);
      for (let k = 0; k < pos.count; k++) cols.set([c.r, c.g, c.b], k * 3);
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      const mesh = new THREE.Mesh(g, rockMat);
      mesh.castShadow = true;
      this.rocks.push({ mesh, r: 0.75 + rng() * 0.5, a: rng() * Math.PI * 2, y: -1 - rng() * 3, ph: rng() * 6.28 });
      this.group.add(mesh);
    }

    this.smoke = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.2, 0),
      new THREE.MeshLambertMaterial({ color: '#F6F0EA', flatShading: true, transparent: true, opacity: 0.85 }),
      64,
    );
    this.smoke.count = 0;
    this.smoke.frustumCulled = false;
    this.group.add(this.smoke);

    const n = 70, pos = new Float32Array(n * 3), sd = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, d = Math.sqrt(rng());
      pos.set([Math.cos(a) * d, 0.3 + rng() * 2.6, Math.sin(a) * d], i * 3);
      sd[i] = rng();
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    mg.setAttribute('seed', new THREE.BufferAttribute(sd, 1));
    this.motes = new THREE.Points(mg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uR: { value: 5 }, uNight: { value: 0 }, uPx: { value: 1 } },
      vertexShader: /* glsl */`
        attribute float seed; uniform float uT, uR, uPx, uNight; varying float vA; varying float vSeed;
        void main() {
          float t = uT * (0.15 + seed * 0.2) + seed * 50.0;
          vec3 p = vec3(position.x * uR * 0.85, position.y, position.z * uR * 0.85);
          p += vec3(sin(t * 1.3 + seed * 7.0), sin(t * 0.9 + seed * 3.0) * 0.4, cos(t * 1.1 + seed * 5.0)) * 0.7;
          // Fireflies blink; pollen just drifts.
          float blink = smoothstep(0.2, 1.0, sin(uT * (1.2 + seed * 1.5) + seed * 30.0));
          vA = mix(0.35, blink, uNight);
          vSeed = seed;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = mix(3.0, 7.0, uNight) * (0.7 + seed * 0.6) * uPx * (14.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uNight; varying float vA; varying float vSeed;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          vec3 day = vec3(1.0, 0.97, 0.85);
          vec3 night = vec3(1.0, 0.85, 0.4) * 2.0;
          gl_FragColor = vec4(mix(day, night, uNight), a * vA * mix(0.5, 1.0, uNight));
        }
      `,
    }));
    this.motes.frustumCulled = false;
    this.group.add(this.motes);
  }

  setPixelRatio(px: number) { this.motes.material.uniforms.uPx.value = px; }

  update(dt: number, time: number, R: number, depth: number, night: number, cloudTint: THREE.Color, emitters: THREE.Vector3[], still: boolean) {
    const speed = still ? 0 : 1;
    this.cloudMat.color.copy(cloudTint);
    this.cloudMat.emissive.copy(cloudTint).multiplyScalar(0.35);
    this.sea.position.y = -depth - 16;
    this.sea.rotation.y += dt * 0.004 * speed;

    for (const d of this.drifters) {
      d.a += dt * d.speed * speed;
      const r = R + d.r;
      d.mesh.position.set(Math.cos(d.a) * r, d.y, Math.sin(d.a) * r);
    }
    for (const k of this.rocks) {
      k.a += dt * 0.03 * speed;
      const r = R * k.r;
      k.mesh.position.set(Math.cos(k.a) * r, k.y - depth * 0.15 + Math.sin(time * 0.5 + k.ph) * 0.25 * speed, Math.sin(k.a) * r);
      k.mesh.rotation.y += dt * 0.1 * speed;
    }

    // Smoke: six puffs per chimney, cycling up and out.
    let n = 0;
    for (const e of emitters) {
      for (let i = 0; i < 6 && n < 64; i++, n++) {
        const age = ((time * 0.22 + i / 6) % 1);
        this._v.set(e.x + Math.sin(age * 3 + i) * 0.15 + age * 0.4, e.y + age * 1.8, e.z + age * 0.2);
        const s = Math.sin(age * Math.PI) * (0.6 + age * 1.1);
        this._s.setScalar(Math.max(0.001, s));
        this._m.compose(this._v, this._q, this._s);
        this.smoke.setMatrixAt(n, this._m);
      }
    }
    this.smoke.count = n;
    this.smoke.instanceMatrix.needsUpdate = true;

    const u = this.motes.material.uniforms;
    u.uT.value = still ? 0 : time;
    u.uR.value = R;
    u.uNight.value = night;
  }
}
