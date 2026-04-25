import { BG_COLORS, ROOM_COUNT_MIN, ROOM_COUNT_MAX, MIN_TUNNEL_H } from './constants.js';

export function makePRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

export function lerp(a, b, t) { return a + (b - a) * t; }

export function interpolateWall(points, x) {
  for (let i = 0; i < points.length - 1; i++) {
    if (x >= points[i].x && x <= points[i + 1].x) {
      const t = (x - points[i].x) / (points[i + 1].x - points[i].x);
      return lerp(points[i].y, points[i + 1].y, t);
    }
  }
  return points[points.length - 1].y;
}

const ROOM_PARAMS = {
  standard: { wMin: 1500, wMax: 2100, hMin: 820, hMax: 980,  ceilAmp: 120, floorAmp: 120, minPass: 180, pts: 7, maxObs: 2 },
  narrow:   { wMin: 1280, wMax: 1700, hMin: 800, hMax: 900,  ceilAmp: 180, floorAmp: 180, minPass: 150, pts: 9, maxObs: 4 },
  open:     { wMin: 1900, wMax: 2600, hMin: 900, hMax: 1100, ceilAmp: 60,  floorAmp: 60,  minPass: 260, pts: 5, maxObs: 1 },
  treasury: { wMin: 1280, wMax: 1700, hMin: 800, hMax: 950,  ceilAmp: 100, floorAmp: 100, minPass: 220, pts: 6, maxObs: 0 },
  reactor:  { wMin: 1700, wMax: 2100, hMin: 850, hMax: 1050, ceilAmp: 80,  floorAmp: 80,  minPass: 260, pts: 6, maxObs: 1 },
};

function pickType(rng) {
  const pool = [
    { type: 'standard', w: 50 },
    { type: 'narrow',   w: 20 },
    { type: 'open',     w: 15 },
    { type: 'treasury', w: 10 },
  ];
  let r = rng() * pool.reduce((s, e) => s + e.w, 0);
  for (const e of pool) { r -= e.w; if (r <= 0) return e.type; }
  return 'standard';
}

function generateRoom(index, totalRooms, rng, spawnEnemiesForRoom) {
  const isLast = index === totalRooms - 1;
  const type = isLast ? 'reactor' : pickType(rng);
  const p = ROOM_PARAMS[type];

  const width  = Math.round(lerp(p.wMin, p.wMax, rng()));
  const height = Math.round(lerp(p.hMin, p.hMax, rng()));

  const tunnelH   = Math.round(MIN_TUNNEL_H + rng() * (type === 'narrow' ? 40 : 80));
  const entranceY = Math.round(height * lerp(0.35, 0.65, rng()));
  const exitY     = Math.round(height * lerp(0.35, 0.65, rng()));

  const numPts    = p.pts + 2;
  const maxCeilY  = height / 2 - p.minPass / 2;
  const minFloorY = height / 2 + p.minPass / 2;

  const ceilingPoints = [];
  const floorPoints   = [];

  for (let i = 0; i < numPts; i++) {
    const t = i / (numPts - 1);
    const x = Math.round(t * width);
    let cy, fy;
    if (i === 0) {
      cy = entranceY - tunnelH / 2;
      fy = entranceY + tunnelH / 2;
    } else if (i === numPts - 1) {
      cy = exitY - tunnelH / 2;
      fy = exitY + tunnelH / 2;
    } else {
      cy = Math.round(20 + rng() * Math.min(p.ceilAmp, maxCeilY - 20));
      fy = Math.round(minFloorY + rng() * Math.min(p.floorAmp, height - minFloorY - 20));
      if (fy - cy < p.minPass) {
        const mid = (cy + fy) / 2;
        cy = Math.round(mid - p.minPass / 2);
        fy = Math.round(mid + p.minPass / 2);
      }
    }
    ceilingPoints.push({ x, y: Math.round(cy) });
    floorPoints.push({ x, y: Math.round(fy) });
  }

  const obstacles = [];
  const numObs = Math.floor(rng() * (p.maxObs + 1));
  for (let i = 0; i < numObs; i++) {
    const isStalactite = rng() < 0.5;
    const ox = Math.round(width * lerp(0.2, 0.8, rng()));
    const ow = Math.round(20 + rng() * 40);
    const passage = interpolateWall(floorPoints, ox) - interpolateWall(ceilingPoints, ox);
    const maxLen  = Math.floor(passage * 0.35);
    const ol      = Math.round(lerp(20, Math.max(21, maxLen), rng()));
    if (isStalactite) {
      obstacles.push({ kind: 'stalactite', x: ox, baseY: interpolateWall(ceilingPoints, ox) - 25, w: ow, len: ol });
    } else {
      obstacles.push({ kind: 'stalagmite', x: ox, baseY: interpolateWall(floorPoints, ox) + 25, w: ow, len: ol });
    }
  }

  const bgColor = BG_COLORS[Math.floor(rng() * BG_COLORS.length)];
  const room = { type, width, height, bgColor, ceilingPoints, floorPoints, obstacles, entranceY, exitY, tunnelH };
  spawnEnemiesForRoom(room, rng);
  return room;
}

export function generateLevel(seed, spawnEnemiesForRoom) {
  const rng = makePRNG(seed);
  const totalRooms = ROOM_COUNT_MIN + Math.floor(rng() * (ROOM_COUNT_MAX - ROOM_COUNT_MIN + 1));
  return Array.from({ length: totalRooms }, (_, i) => generateRoom(i, totalRooms, rng, spawnEnemiesForRoom));
}
