import React, { useEffect, useRef, useState } from "react";
import interiorsUrl from "./assets/interiors.png";
import roomsUrl from "./assets/rooms.png";
import adamUrl from "./assets/adam.png";
import alexUrl from "./assets/alex.png";
import ameliaUrl from "./assets/amelia.png";
import bobUrl from "./assets/bob.png";

/* ────────────────────────────────────────────────────────────
   The museum. A top-down pixel gallery that grows with the
   lifetime focus minutes behind it, drawn to a canvas from the
   Modern Interiors tilesets (see src/assets/LICENSE.txt).

   Two layers: a static one holding floor, walls, rugs and
   exhibits, redrawn only when a new hall opens; and the visitor
   pass on top, which is the only thing running per frame.
   ──────────────────────────────────────────────────────────── */

const T = 16;              // source tile size
const BAY_W = 9, BAY_H = 8; // one hall, in tiles
const GRID_W = 7, GRID_H = 4;

/* Tile rects in interiors.png, all verified against the sheet. */
const P = {
  artDark:[0,14,2,2], artGreen:[0,22,2,2], artSea:[0,24,2,2], artCat:[2,24,2,2],
  artBlue:[13,23,2,2], portraitA:[10,26,1,2], portraitB:[11,26,1,2],
  artRed:[0,70,1,2], artNight:[1,70,1,2], artPale:[2,70,1,2],
  artWarm:[0,74,1,2], artFig:[0,76,1,2], worldMap:[10,66,2,2],

  rugRed:[8,15,3,3], rugGreen:[0,42,3,2],
  rugSmA:[11,18,2,1], rugSmB:[11,20,2,1], rugSmC:[13,21,2,1],

  urnA:[0,68,1,2], urnB:[1,68,1,2], urnC:[2,68,1,2],
  globe:[12,66,1,2], bones:[11,60,1,2], relic:[10,62,1,2],
  vitrineWide:[12,59,2,2], vitrineTallA:[14,59,1,2], vitrineTallB:[15,59,1,2],
  caseLow:[14,62,2,2], pedestal:[12,57,1,1],

  bench:[7,13,3,2], benchRed:[8,18,2,2], chair:[12,62,1,1],
  shelf:[5,14,2,2], shelfBooks:[4,18,2,3], counter:[0,10,3,3],
  table:[3,53,2,2], roundTable:[6,12,1,2],

  plantSm:[10,45,1,2], bush:[12,45,1,2], palm:[13,44,2,2],
  lamp:[14,51,1,2], lampTable:[14,57,1,1],
};

/* Room builder: walls are two tiles tall, floors a single tile. Blue-grey
   reads as institutional stone and sits under every scene palette without
   fighting it; terracotta arrives once the museum is large enough to carry
   a warmer wing. */
const WALL = { top:[1,17], bottom:[1,18] };
const WALL_ALT = { top:[1,5], bottom:[1,6] };
const FLOOR = { stone:[14,5], tile:[11,9], herring:[11,13], cream:[11,7] };

/* Halls open outward from the entrance at the bottom centre. */
const ORDER = [
  [3,3],[2,3],[4,3],[3,2],[1,3],[5,3],[2,2],[4,2],[3,1],[0,3],[6,3],
  [1,2],[5,2],[2,1],[4,1],[3,0],[0,2],[6,2],[1,1],[5,1],[2,0],[4,0],
  [0,1],[6,1],[1,0],[5,0],[0,0],[6,0],
];

/* Minutes needed for hall i. First lands after a single pomodoro. */
export const threshold = (i) => (i === 0 ? 0 : 10*i*i + 15*i);

const KINDS = [
  { key:"gallery",  name:"Painting Gallery" },
  { key:"antiquity",name:"Hall of Antiquities" },
  { key:"geography",name:"Map Room" },
  { key:"library",  name:"Reading Room" },
  { key:"sculpture",name:"Sculpture Court" },
];

export function hallAt(i) {
  if (i === 0) return { key:"entrance", name:"Entrance Hall" };
  return KINDS[(i - 1) % KINDS.length];
}

export const hallsFor = (mins) => {
  let n = 0;
  while (n < ORDER.length && mins >= threshold(n)) n++;
  return Math.max(1, n);
};

/* Deterministic per-hall jitter, so every hall is laid out the same way
   on every load but no two halls look identical. */
const rnd = (seed) => {
  let s = seed * 9301 + 49297;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
};

/* Every hall has a two-tile back wall across rows 0-1, so art hangs on
   something instead of lying on the floor. Rows 2-7 are walkable, and the
   doorway at columns 4-5 keeps art clear of the gap. */
const WALL_ROWS = 2, DOOR_X = 4, DOOR_W = 2;

/* Build the prop list for one hall. Coordinates are hall-relative tiles;
   `view` marks a spot a visitor will walk up to and look at. */
function furnish(i, bx, by) {
  const kind = hallAt(i).key;
  const r = rnd(i + 7);
  const out = [];
  const put = (p, x, y, view) => out.push({ p, x:bx+x, y:by+y, view });

  const wallArt = ["artDark","artGreen","artSea","artCat","artBlue","artRed",
                   "artNight","artPale","artWarm","artFig"];
  const pickArt = () => wallArt[Math.floor(r()*wallArt.length)];

  if (kind === "entrance") {
    put(pickArt(), 1, 0, true); put(pickArt(), 7, 0, true);
    put("counter", 3, 2);
    put("plantSm", 1, 3); put("palm", 7, 4);
    put("rugRed", 3, 5);
    put("bench", 1, 6, true);
    return out;
  }
  if (kind === "gallery") {
    put(pickArt(), 1, 0, true); put(pickArt(), 3, 0, true); put(pickArt(), 7, 0, true);
    put(r() > 0.5 ? "rugRed" : "rugGreen", 3, 4);
    put("bench", 2, 6, true); put("lamp", 0, 3); put("lamp", 8, 3);
    put("bush", 7, 6);
    return out;
  }
  if (kind === "antiquity") {
    put("vitrineWide", 1, 2, true); put("vitrineTallA", 6, 2, true);
    put("vitrineTallB", 8, 2, true);
    put("pedestal", 2, 5); put("urnA", 2, 4, true);
    put("pedestal", 4, 5); put("urnB", 4, 4, true);
    put("pedestal", 6, 5); put("urnC", 6, 4, true);
    put("rugSmB", 1, 7); put("benchRed", 6, 6, true);
    return out;
  }
  if (kind === "geography") {
    put("worldMap", 1, 0, true); put(pickArt(), 7, 0, true);
    put("globe", 2, 4, true); put("globe", 6, 4, true);
    put("table", 4, 5); put("bench", 1, 6, true); put("palm", 7, 5);
    return out;
  }
  if (kind === "library") {
    put("shelfBooks", 1, 2, true); put("shelfBooks", 6, 2, true);
    put("roundTable", 3, 5); put("chair", 2, 5); put("chair", 5, 5);
    put("rugGreen", 5, 6); put("plantSm", 0, 6); put(pickArt(), 3, 0, true);
    return out;
  }
  // sculpture court
  put(pickArt(), 1, 0, true); put(pickArt(), 7, 0, true);
  put("pedestal", 2, 3); put("bones", 2, 2, true);
  put("pedestal", 6, 3); put("relic", 6, 2, true);
  put("caseLow", 4, 5, true);
  put("rugSmC", 1, 7); put("bench", 6, 6, true); put("bush", 0, 5);
  return out;
}

const CHARS = [adamUrl, alexUrl, ameliaUrl, bobUrl];
/* Row 1 of the character sheet is the walk cycle: 6 frames per direction,
   ordered right, up, left, down. */
const DIR = { right:0, up:6, left:12, down:18 };

function load(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
}

export default function Museum({ minutes, dim = 0.55, paused = false, chamberPx = 0,
                                 onOpen, onChamber }) {
  const wrap = useRef(null);
  const cv = useRef(null);
  const art = useRef(null);      // loaded images
  const stat = useRef(null);     // offscreen static layer
  const people = useRef([]);
  const raf = useRef(0);
  const fit = useRef(0);
  const [ready, setReady] = useState(false);
  const halls = hallsFor(minutes);
  const prev = useRef(halls);

  /* Load every sheet once. */
  useEffect(() => {
    let dead = false;
    Promise.all([interiorsUrl, roomsUrl, ...CHARS].map(load))
      .then(([int, rooms, ...chars]) => {
        if (dead) return;
        art.current = { int, rooms, chars };
        setReady(true);
      })
      .catch(() => {});
    return () => { dead = true; };
  }, []);

  /* Announce a newly opened hall. */
  useEffect(() => {
    if (halls > prev.current) {
      const h = hallAt(halls - 1);
      onOpen?.(h.name);
    }
    prev.current = halls;
  }, [halls]); // eslint-disable-line

  /* Rebuild the static layer whenever the museum grows. */
  useEffect(() => {
    if (!ready) return;
    const { int, rooms } = art.current;
    const open = ORDER.slice(0, halls);
    const bxs = open.map(([x]) => x), bys = open.map(([, y]) => y);
    let x0 = Math.min(...bxs), x1 = Math.max(...bxs);
    let y0 = Math.min(...bys), y1 = Math.max(...bys);

    /* Always draw at least a 3x2 block of halls. A single furnished room
       would have to be scaled ~9x to cover a desktop viewport, which turns
       one visitor into the whole screen; the extra empty halls give the
       building a shape to grow into from the first minute. */
    const MIN_W = 3, MIN_H = 2;
    while (x1 - x0 + 1 < MIN_W) {
      if (x0 > 0) x0--; else if (x1 < GRID_W-1) x1++; else break;
    }
    while (y1 - y0 + 1 < MIN_H) {
      if (y1 < GRID_H-1) y1++; else if (y0 > 0) y0--; else break;
    }

    const tilesW = (x1 - x0 + 1) * BAY_W, tilesH = (y1 - y0 + 1) * BAY_H;
    const padL = 1, padR = 1, padT = 2, padB = 1;
    const W = (tilesW + padL + padR) * T, H = (tilesH + padT + padB) * T;

    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;

    const tile = (src, [sx, sy], dx, dy, w = 1, h = 1) =>
      g.drawImage(src, sx*T, sy*T, w*T, h*T, Math.round(dx), Math.round(dy), w*T, h*T);

    const wall = halls > 12 ? WALL_ALT : WALL;
    const openKey = new Set(open.map(([x, y]) => `${x},${y}`));
    const bayOrigin = (bx, by) => [(bx - x0)*BAY_W + padL, (by - y0)*BAY_H + padT];

    /* Every bay inside the footprint gets floor and a back wall, opened or
       not. The empty ones read as galleries waiting to be filled, which
       shows where the museum is going rather than leaving holes in it. */
    for (let by = y0; by <= y1; by++) {
      for (let bx = x0; bx <= x1; bx++) {
        const [ox, oy] = bayOrigin(bx, by);
        const i = ORDER.findIndex(([a, b]) => a === bx && b === by);
        const isOpen = openKey.has(`${bx},${by}`);
        const kind = isOpen ? hallAt(i).key : null;
        const f = !isOpen ? FLOOR.stone
          : kind === "entrance" ? FLOOR.cream
          : kind === "library" ? FLOOR.herring
          : kind === "sculpture" ? FLOOR.cream : FLOOR.stone;

        for (let y = WALL_ROWS; y < BAY_H; y++)
          for (let x = 0; x < BAY_W; x++)
            tile(rooms, f, (ox+x)*T, (oy+y)*T);

        // Back wall, with a doorway so the halls read as connected.
        for (let x = 0; x < BAY_W; x++) {
          if (x >= DOOR_X && x < DOOR_X + DOOR_W) {
            tile(rooms, f, (ox+x)*T, oy*T);
            tile(rooms, f, (ox+x)*T, (oy+1)*T);
          } else {
            tile(rooms, wall.top, (ox+x)*T, oy*T);
            tile(rooms, wall.bottom, (ox+x)*T, (oy+1)*T);
          }
        }
      }
    }

    // Perimeter: side walls and a near lip. The far side is already walled
    // by the top row of bays.
    for (let y = 0; y < tilesH + padT + padB; y++) {
      tile(rooms, wall.bottom, 0, y*T);
      tile(rooms, wall.bottom, (tilesW + padL)*T, y*T);
    }
    for (let x = 0; x < tilesW + padL + padR; x++) {
      tile(rooms, wall.top, x*T, 0);
      tile(rooms, wall.bottom, x*T, (tilesH + padT)*T);
    }

    // Exhibits, back to front so overlaps stack correctly.
    const byHall = open.map(([bx, by], i) => {
      const [ox, oy] = bayOrigin(bx, by);
      return furnish(i, ox, oy);
    });
    const props = byHall.flat().sort((a, b) => a.y - b.y);
    props.forEach(({ p, x, y }) => {
      const [sx, sy, w, h] = P[p];
      tile(int, [sx, sy], x*T, y*T, w, h);
    });

    stat.current = c;

    /* Each visitor belongs to one hall and only walks between that hall's
       exhibits. Without collision that is what keeps them from strolling
       through the gallery walls, and it spreads the crowd out. */
    const routes = byHall.map((list, i) => {
      const [ox, oy] = bayOrigin(...open[i]);
      const spots = list.filter((p) => p.view).map((p) => ({
        x: (p.x + P[p.p][2]/2) * T,
        y: (p.y + P[p.p][3] + 1) * T,
      }));
      return spots.length ? spots
        : [{ x: (ox + BAY_W/2)*T, y: (oy + BAY_H/2)*T }];
    });

    const want = Math.min(halls + Math.floor(halls/3), 18);
    const now = people.current;
    people.current = Array.from({ length: want }, (_, i) => {
      const wp = routes[i % routes.length];
      const seed = wp[i % wp.length];
      const p = now[i] || {
        tx: seed.x, ty: seed.y, dir:"down", frame:0,
        wait: Math.random()*5, ch: i % CHARS.length, speed: 14 + Math.random()*9,
        x: seed.x, y: seed.y,
      };
      // Re-home on every rebuild: hall count changed, so routes shifted.
      p.wp = wp;
      if (!now[i]) { p.x = seed.x; p.y = seed.y; }
      p.x = Math.max(T, Math.min(p.x, W - T));
      p.y = Math.max(T*2, Math.min(p.y, H - T));
      return p;
    });

    // Redraw immediately so growth shows even while paused.
    draw();
  }, [ready, halls]); // eslint-disable-line

  /* Fit the built museum into the viewport and paint a frame. */
  const draw = () => {
    const canvas = cv.current, s = stat.current, box = wrap.current;
    if (!canvas || !s || !box) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = box.clientWidth, vh = box.clientHeight;
    if (!vw || !vh) return;
    if (canvas.width !== Math.floor(vw*dpr) || canvas.height !== Math.floor(vh*dpr)) {
      canvas.width = Math.floor(vw*dpr); canvas.height = Math.floor(vh*dpr);
    }
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, vw, vh);

    /* Cover the viewport once the museum is big enough to; before then
       show it as large as fits, which reads as starting zoomed-in on a
       single room and pulling back as wings open. */
    const scale = Math.max(1, Math.min(5, Math.max(vw/s.width, vh/s.height)));
    const w = s.width*scale, h = s.height*scale;
    const ox = Math.round((vw - w)/2), oy = Math.round((vh - h)/2);

    g.drawImage(s, ox, oy, w, h);

    // Visitors on top of the halls, but under the clock chamber — walking
    // behind that room is what keeps them from tramping across the timer.
    const { chars, rooms } = art.current;
    people.current.forEach((p) => {
      const col = DIR[p.dir] + (Math.floor(p.frame) % 6);
      g.drawImage(chars[p.ch], col*T, 1*32, T, 32,
        Math.round(ox + (p.x - T/2)*scale), Math.round(oy + (p.y - 32)*scale),
        Math.round(T*scale), Math.round(32*scale));
    });

    /* The clock chamber: a walled room the timer sits inside. Drawn in
       screen space at the size the dial was given, snapped to whole tiles
       of the current scale so its masonry lines up with the halls. */
    if (chamberPx > 2) {
      const px = T * scale;                       // one tile, on screen
      const cols = Math.max(6, Math.round(chamberPx / px));
      const rowsN = cols;
      /* A two-tile wall looks right on a large room and swallows a small
         one, so a tight chamber gets a single course. */
      const wr = cols >= 8 ? 2 : 1;
      const cw = cols*px, ch = rowsN*px;
      const cxo = Math.round((vw - cw)/2), cyo = Math.round((vh - ch)/2);
      const wall = halls > 12 ? WALL_ALT : WALL;

      /* Snapping to whole tiles means the room is never exactly the size it
         was asked for. Report what it actually came out as, so the dial can
         trace these walls instead of hovering outside them. */
      if (Math.abs(fit.current - cw) > 0.5) { fit.current = cw; onChamber?.(cw); }

      const put = ([sx, sy], dx, dy) =>
        g.drawImage(rooms, sx*T, sy*T, T, T, Math.round(dx), Math.round(dy),
          Math.ceil(px), Math.ceil(px));

      for (let y = 0; y < rowsN; y++)
        for (let x = 0; x < cols; x++)
          put(FLOOR.herring, cxo + x*px, cyo + y*px);

      for (let x = 0; x < cols; x++) {
        put(wall.top, cxo + x*px, cyo);
        if (wr > 1) put(wall.bottom, cxo + x*px, cyo + px);
        put(wall.bottom, cxo + x*px, cyo + (rowsN-1)*px);
      }
      for (let y = 1; y < rowsN; y++) {
        put(wall.bottom, cxo, cyo + y*px);
        put(wall.bottom, cxo + (cols-1)*px, cyo + y*px);
      }

      // Sink the middle so a 100px readout has something to sit on.
      const grad = g.createRadialGradient(vw/2, vh/2, 0, vw/2, vh/2, cw*0.62);
      grad.addColorStop(0, "rgba(0,0,0,.6)");
      grad.addColorStop(0.55, "rgba(0,0,0,.4)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(cxo, cyo, cw, ch);
    }
  };

  /* Visitor movement. Axis-aligned, which keeps the four-direction sprite
     honest and reads as deliberate gallery wandering. */
  const step = (dt) => {
    people.current.forEach((p) => {
      if (p.wait > 0) { p.wait -= dt; p.frame = 0; return; }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
        const t = p.wp[Math.floor(Math.random()*p.wp.length)];
        p.tx = t.x + (Math.random()*2-1)*T; p.ty = t.y + Math.random()*T;
        p.wait = 2.5 + Math.random()*6;
        return;
      }
      // Close the larger axis first, so paths look like corridors.
      if (Math.abs(dx) > 2) {
        p.dir = dx > 0 ? "right" : "left";
        p.x += Math.sign(dx) * Math.min(Math.abs(dx), p.speed*dt);
      } else {
        p.dir = dy > 0 ? "down" : "up";
        p.y += Math.sign(dy) * Math.min(Math.abs(dy), p.speed*dt);
      }
      p.frame += dt * 7;
    });
  };

  /* One loop, stopped whenever it cannot be seen or is not wanted. */
  useEffect(() => {
    if (!ready) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last)/1000); last = now;
      if (!paused && !still && !document.hidden) step(dt);
      draw();
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf.current); window.removeEventListener("resize", onResize); };
  }, [ready, paused, chamberPx]); // eslint-disable-line

  return (
    <div className="em-museum" ref={wrap} style={{ opacity: dim }} aria-hidden="true">
      <canvas ref={cv} />
    </div>
  );
}
