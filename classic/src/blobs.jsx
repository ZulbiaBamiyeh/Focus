import React, { useEffect, useRef } from "react";

/* ────────────────────────────────────────────────────────────
   Meadow — soft blobs rolling on hills, in the spirit of
   LocoRoco. Flat shapes, few of them, no fine detail, which is
   the whole point: a busy backdrop fights a timer.

   Each blob is a pressure soft body — a ring of verlet points,
   springs along the perimeter, and an outward force from the
   area shortfall that keeps it inflated. That is what gives the
   squash on landing rather than a tweened wobble.
   ──────────────────────────────────────────────────────────── */

const N = 14;                  // points per blob
const GRAV = 820;              // px/s^2 — gentle, or the pressure loses
const DAMP = 0.985;
const ITER = 6;                // constraint passes per step
const PRESS = 1.15;            // area restoring force

/* Rolling ground: a couple of sines, sampled rather than solved. */
const groundAt = (x, w, h) =>
  h * 0.83
  + Math.sin(x * 0.0042) * h * 0.045
  + Math.sin(x * 0.0113 + 1.3) * h * 0.022
  + Math.sin(x * 0.0007 - 0.6) * h * 0.032;

function makeBlob(x, y, r) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    pts.push({ x: px, y: py, ox: px, oy: py });
  }
  return {
    pts, r,
    rest: (2 * Math.PI * r) / N,
    area: Math.PI * r * r,
    hop: 1 + Math.random() * 3,
    blink: 2 + Math.random() * 5,
    blinking: 0,
    alt: false,
  };
}

const area2 = (pts) => {
  let a = 0;
  for (let i = 0; i < N; i++) {
    const p = pts[i], q = pts[(i + 1) % N];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
};

const centre = (pts) => {
  let x = 0, y = 0;
  for (const p of pts) { x += p.x; y += p.y; }
  return [x / N, y / N];
};

function step(b, dt, w, h, bouncy) {
  const { pts } = b;

  for (const p of pts) {
    const vx = (p.x - p.ox) * DAMP, vy = (p.y - p.oy) * DAMP;
    p.ox = p.x; p.oy = p.y;
    p.x += vx;
    p.y += vy + GRAV * dt * dt;
  }

  for (let k = 0; k < ITER; k++) {
    // Perimeter springs hold the outline together.
    for (let i = 0; i < N; i++) {
      const p = pts[i], q = pts[(i + 1) % N];
      const dx = q.x - p.x, dy = q.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const f = ((d - b.rest) / d) * 0.5;
      const ox = dx * f, oy = dy * f;
      p.x += ox; p.y += oy; q.x -= ox; q.y -= oy;
    }

    /* Pressure: the area shortfall pushes every edge outward along its
       normal. Without it the springs would collapse the ring into a puddle
       under its own weight. */
    const a = area2(pts) || 1;
    const push = (b.area / a - 1) * PRESS;
    if (push > 0) {
      for (let i = 0; i < N; i++) {
        const p = pts[i], q = pts[(i + 1) % N];
        const dx = q.x - p.x, dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const nx = (dy / d) * push * b.rest * 0.5;
        const ny = (-dx / d) * push * b.rest * 0.5;
        p.x += nx; p.y += ny; q.x += nx; q.y += ny;
      }
    }

    // Ground and walls.
    for (const p of pts) {
      const g = groundAt(p.x, w, h);
      if (p.y > g) {
        p.y = g;
        // Friction: drag the previous position toward the current one.
        p.ox += (p.x - p.ox) * (bouncy ? 0.12 : 0.3);
      }
      if (p.x < 0) { p.x = 0; p.ox = p.x - (p.ox - p.x) * 0.4; }
      if (p.x > w) { p.x = w; p.ox = p.x - (p.ox - p.x) * 0.4; }
    }
  }
}

/* Keep blobs out of each other. Resolving centre-to-centre and shifting
   whole bodies is coarse next to per-point contact, but at this size the
   difference is invisible and it costs nothing for a handful of them. */
function reseat(b, w, h) {
  for (const p of b.pts) {
    const g = groundAt(p.x, w, h);
    if (p.y > g) p.y = g;
    if (p.x < 0) p.x = 0;
    if (p.x > w) p.x = w;
  }
}

function separate(B, w, h) {
  for (let i = 0; i < B.length; i++) {
    for (let j = i + 1; j < B.length; j++) {
      const a = B[i], b = B[j];
      const [ax, ay] = centre(a.pts), [bx, by] = centre(b.pts);
      let dx = bx - ax, dy = by - ay;
      let d = Math.hypot(dx, dy);
      const min = (a.r + b.r) * 0.92;
      if (d >= min) continue;
      if (d < 0.001) { dx = 1; dy = 0; d = 1; }
      const push = (min - d) / 2;
      const nx = (dx / d) * push, ny = (dy / d) * push;
      for (const p of a.pts) { p.x -= nx; p.y -= ny; }
      for (const p of b.pts) { p.x += nx; p.y += ny; }
      reseat(a, w, h); reseat(b, w, h);
    }
  }
}

export default function Meadow({ count = 3, bouncy = false, palette, dim = 1 }) {
  const wrap = useRef(null);
  const cv = useRef(null);
  const blobs = useRef([]);
  const raf = useRef(0);
  const want = useRef(count);
  want.current = count;
  const mood = useRef(bouncy);
  mood.current = bouncy;
  const pal = useRef(palette);
  pal.current = palette;

  useEffect(() => {
    const canvas = cv.current, box = wrap.current;
    if (!canvas || !box) return;
    const g = canvas.getContext("2d");
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1;

    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = box.clientWidth; h = box.clientHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    };
    size();

    const spawn = () => {
      const r = Math.min(w, h) * (0.052 + Math.random() * 0.028);
      const n = blobs.current.length;
      // Stagger across the width so a fresh meadow does not pile up.
      const x = w * (0.08 + ((n * 0.37) % 1) * 0.84);
      const nb = makeBlob(x, -r * 2 - Math.random() * h * 0.3, r);
      nb.alt = n % 3 === 1;
      blobs.current.push(nb);
    };
    for (let i = 0; i < Math.max(1, count); i++) spawn();
    // Settle the opening arrangement so nothing is mid-fall on first paint.
    for (let i = 0; i < 300; i++) {
      blobs.current.forEach((b) => step(b, 1/60, w, h, false));
      separate(blobs.current, w, h);
    }

    let last = performance.now();
    const frame = (t) => {
      raf.current = requestAnimationFrame(frame);
      const dt = Math.min(0.033, (t - last) / 1000); last = t;
      if (document.hidden) return;

      const B = blobs.current;
      while (B.length < want.current) spawn();
      while (B.length > want.current) B.shift();

      if (!still) {
        for (const b of B) {
          step(b, dt, w, h, mood.current);

          /* A nudge now and then, livelier on a break than mid-focus. The
             hop is an impulse on the previous positions, which is how you
             add velocity in a verlet integrator. */
          b.hop -= dt;
          if (b.hop <= 0) {
            b.hop = mood.current ? 0.9 + Math.random() * 1.8 : 4 + Math.random() * 7;
            const lift = (mood.current ? 9 : 3.6) * (0.7 + Math.random() * 0.6);
            const lean = (Math.random() - 0.5) * (mood.current ? 5 : 2);
            for (const p of b.pts) { p.oy += lift; p.ox -= lean; }
          }
          b.blink -= dt;
          if (b.blink <= 0) { b.blink = 3 + Math.random() * 6; b.blinking = 0.14; }
          if (b.blinking > 0) b.blinking -= dt;
        }
        separate(B, w, h);
      }
      draw(g, B, w, h, dpr, pal.current);
    };
    raf.current = requestAnimationFrame(frame);

    const onResize = () => { size(); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", onResize); };
  }, []); // eslint-disable-line

  return (
    <div className="fx-live" ref={wrap} style={{ opacity: dim }} aria-hidden="true">
      <canvas ref={cv} />
    </div>
  );
}

/* `shift` slides the sine sampling sideways so the far ridge is a different
   skyline rather than a parallel copy of the one in front of it. */
function hills(g, w, h, y0, fill, shift = 0) {
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) g.lineTo(x, groundAt(x + shift, w, h) + y0);
  g.lineTo(w, h);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

function draw(g, B, w, h, dpr, pal) {
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  /* Two layers of ground. The far one is offset upward — a positive offset
     put it below the near hill, where it never showed. */
  hills(g, w, h, -h * 0.055, pal.far, 420);
  hills(g, w, h, 0, pal.near);

  for (const b of B) {
    const { pts } = b;
    g.beginPath();
    let mx = (pts[N-1].x + pts[0].x) / 2, my = (pts[N-1].y + pts[0].y) / 2;
    g.moveTo(mx, my);
    for (let i = 0; i < N; i++) {
      const c = pts[i], n = pts[(i + 1) % N];
      g.quadraticCurveTo(c.x, c.y, (c.x + n.x) / 2, (c.y + n.y) / 2);
    }
    g.closePath();
    g.fillStyle = b.alt ? pal.blobAlt : pal.blob;
    g.fill();
    g.strokeStyle = pal.edge;
    g.lineWidth = Math.max(1.5, b.r * 0.07);
    g.stroke();

    /* The face is what sells it. Two dots and a mouth, leaning with the
       blob's own motion so it reads as alive rather than printed on. */
    const [cx, cy] = centre(pts);
    const vx = cx - (pts.reduce((a, p) => a + p.ox, 0) / N);
    const eye = Math.max(1.6, b.r * 0.115);
    const gap = b.r * 0.34, up = b.r * 0.16;
    const lean = Math.max(-3, Math.min(3, vx * 1.6));
    g.fillStyle = pal.ink;
    const lid = b.blinking > 0 ? 0.16 : 1;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(cx + s * gap + lean, cy - up, eye, eye * lid, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    g.ellipse(cx + lean * 1.1, cy + b.r * 0.3, b.r * 0.2, b.r * 0.12, 0, 0, Math.PI * 2);
    g.fill();
  }
}
