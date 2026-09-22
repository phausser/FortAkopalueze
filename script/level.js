import { BG_COLORS, MIN_TUNNEL_H, EXIT_TUNNEL_W, MAIN_PATH_MIN, MAIN_PATH_MAX } from './constants.js';

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

// ─── Raum-Graph (Grid-basiert, Baum: garantierter Hauptpfad + Sackgassen) ─────

export const SIDES = ['left', 'right', 'top', 'bottom'];
export const OPPOSITE_SIDE = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
const DIR_VEC = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };

function shuffledSides(rng) {
  const a = SIDES.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildGraph(rng, roomCount) {
  const cells = new Map();
  const order = [];
  const keyOf = (x, y) => `${x},${y}`;

  function createCell(gx, gy, depth) {
    const node = { id: order.length, gx, gy, depth, connections: {}, isReactor: false };
    cells.set(keyOf(gx, gy), node);
    order.push(node);
    return node;
  }
  function connect(a, b, side) {
    a.connections[side] = b;
    b.connections[OPPOSITE_SIDE[side]] = a;
  }

  const start = createCell(0, 0, 0);

  // Der Hauptpfad liefert auch die "Elternräume" für Sackgassen (bis zu 2-3 freie
  // Seiten pro Pfadraum). Bei großen Raumzahlen muss er mitwachsen, sonst gehen
  // die Sackgassen-Slots aus, bevor roomCount erreicht ist.
  const pathMax = Math.max(MAIN_PATH_MAX, Math.ceil(roomCount * 0.6));
  const mainLen = roomCount <= 1 ? 0
    : Math.max(1, Math.min(roomCount - 1, Math.round(lerp(MAIN_PATH_MIN, pathMax, rng()))));
  let cur = start;
  let lastSide = null;
  const mainPath = [start];
  for (let i = 0; i < mainLen; i++) {
    let placed = false;
    for (const side of shuffledSides(rng)) {
      if (lastSide && side === OPPOSITE_SIDE[lastSide]) continue;
      const [dx, dy] = DIR_VEC[side];
      const ngx = cur.gx + dx, ngy = cur.gy + dy;
      if (cells.has(keyOf(ngx, ngy))) continue;
      const next = createCell(ngx, ngy, cur.depth + 1);
      connect(cur, next, side);
      mainPath.push(next);
      cur = next;
      lastSide = side;
      placed = true;
      break;
    }
    if (!placed) break;
  }
  cur.isReactor = true;

  // Sackgassen: einzelne Zusatzräume von Hauptpfad-Räumen (außer dem Reaktor-Raum)
  const branchParents = mainPath.slice(0, -1);
  let guard = 0;
  while (order.length < roomCount && guard < roomCount * 8) {
    guard++;
    const parent = branchParents[Math.floor(rng() * branchParents.length)];
    for (const side of shuffledSides(rng)) {
      if (parent.connections[side]) continue;
      const [dx, dy] = DIR_VEC[side];
      const ngx = parent.gx + dx, ngy = parent.gy + dy;
      if (cells.has(keyOf(ngx, ngy))) continue;
      const next = createCell(ngx, ngy, parent.depth + 1);
      connect(parent, next, side);
      break;
    }
  }

  return { order, start, reactorNode: cur };
}

// ─── Raumgeometrie ─────────────────────────────────────────────────────────────

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

// Schneidet an [x0,x1] eine Kerbe in die Kurve, damit dort ein hindernisfreier
// Schacht zum Nachbarraum entsteht. Die Kerbe öffnet sich über eine schräge
// Rampe (wie die Mündung der Links/Rechts-Tunnel), statt mit einer geraden
// Wand abzubrechen — für eine natürlichere, zur Höhle passende Optik.
function insertNotch(points, x0, x1, roomHeight, isCeiling, rng) {
  const rampW0 = Math.round(lerp(70, 130, rng()));
  const rampW1 = Math.round(lerp(70, 130, rng()));
  const fx0 = Math.max(0, x0 - rampW0);
  const fx1 = Math.min(points[points.length - 1].x, x1 + rampW1);
  const fy0 = interpolateWall(points, fx0);
  const fy1 = interpolateWall(points, fx1);
  const openY = isCeiling ? 0 : roomHeight;

  const before = points.filter(p => p.x < fx0);
  const after = points.filter(p => p.x > fx1);
  return [
    ...before,
    { x: fx0, y: Math.round(fy0) },
    { x: x0, y: openY },
    { x: x1, y: openY },
    { x: fx1, y: Math.round(fy1) },
    ...after,
  ];
}

// Freihaltezonen vor jedem Ausgang (in Raumkoordinaten), damit dort nie
// Hindernisse/Deko im Weg hängen.
export function getExitClearZones(exits, width, height) {
  const zones = [];
  const EDGE = 160, MARGIN = 40, RAMP_MARGIN = 140; // RAMP_MARGIN deckt die Oben/Unten-Rampe ab (max. 130px)
  if (exits.left) {
    const { pos, tunnelH } = exits.left;
    zones.push({ x0: 0, x1: EDGE, y0: pos - tunnelH / 2 - MARGIN, y1: pos + tunnelH / 2 + MARGIN });
  }
  if (exits.right) {
    const { pos, tunnelH } = exits.right;
    zones.push({ x0: width - EDGE, x1: width, y0: pos - tunnelH / 2 - MARGIN, y1: pos + tunnelH / 2 + MARGIN });
  }
  if (exits.top) {
    zones.push({ x0: exits.top.x0 - RAMP_MARGIN, x1: exits.top.x1 + RAMP_MARGIN, y0: 0, y1: EDGE });
  }
  if (exits.bottom) {
    zones.push({ x0: exits.bottom.x0 - RAMP_MARGIN, x1: exits.bottom.x1 + RAMP_MARGIN, y0: height - EDGE, y1: height });
  }
  return zones;
}

export function overlapsExitZonesX(zones, x, w) {
  const x0 = x - w / 2, x1 = x + w / 2;
  return zones.some(z => x1 > z.x0 && x0 < z.x1);
}

function generateRoom(node, rng, spawnEnemiesForRoom, maxDepth) {
  const type = node.isReactor ? 'reactor' : pickType(rng);
  const p = ROOM_PARAMS[type];

  const width  = Math.round(lerp(p.wMin, p.wMax, rng()));
  const height = Math.round(lerp(p.hMin, p.hMax, rng()));
  const tunnelSize = Math.round(MIN_TUNNEL_H + rng() * (type === 'narrow' ? 40 : 80));

  const numPts = p.pts + 2;
  const maxCeilY = height / 2 - p.minPass / 2;
  const minFloorY = height / 2 + p.minPass / 2;

  const hasLeft = !!node.connections.left;
  const hasRight = !!node.connections.right;
  const leftY = hasLeft ? Math.round(height * lerp(0.35, 0.65, rng())) : Math.round(height / 2);
  const rightY = hasRight ? Math.round(height * lerp(0.35, 0.65, rng())) : Math.round(height / 2);

  const ceilingPoints = [];
  const floorPoints = [];

  for (let i = 0; i < numPts; i++) {
    const t = i / (numPts - 1);
    const x = Math.round(t * width);
    let cy, fy;
    if (i === 0) {
      cy = hasLeft ? leftY - tunnelSize / 2 : leftY;
      fy = hasLeft ? leftY + tunnelSize / 2 : leftY;
    } else if (i === numPts - 1) {
      cy = hasRight ? rightY - tunnelSize / 2 : rightY;
      fy = hasRight ? rightY + tunnelSize / 2 : rightY;
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

  const exits = { left: null, right: null, top: null, bottom: null };
  if (hasLeft) exits.left = { pos: leftY, tunnelH: tunnelSize, toRoomId: node.connections.left.id };
  if (hasRight) exits.right = { pos: rightY, tunnelH: tunnelSize, toRoomId: node.connections.right.id };

  let ceilPts = ceilingPoints, floorPts = floorPoints;

  const NOTCH_MARGIN = 150; // Platz für die Rampe zwischen Kerbe und Raumkante
  if (node.connections.top) {
    const cx = Math.round(width * lerp(0.3, 0.7, rng()));
    const x0 = Math.max(NOTCH_MARGIN, cx - EXIT_TUNNEL_W / 2);
    const x1 = Math.min(width - NOTCH_MARGIN, cx + EXIT_TUNNEL_W / 2);
    ceilPts = insertNotch(ceilPts, x0, x1, height, true, rng);
    exits.top = { pos: cx, tunnelW: x1 - x0, x0, x1, toRoomId: node.connections.top.id };
  }
  if (node.connections.bottom) {
    const cx = Math.round(width * lerp(0.3, 0.7, rng()));
    const x0 = Math.max(NOTCH_MARGIN, cx - EXIT_TUNNEL_W / 2);
    const x1 = Math.min(width - NOTCH_MARGIN, cx + EXIT_TUNNEL_W / 2);
    floorPts = insertNotch(floorPts, x0, x1, height, false, rng);
    exits.bottom = { pos: cx, tunnelW: x1 - x0, x0, x1, toRoomId: node.connections.bottom.id };
  }

  const zones = getExitClearZones(exits, width, height);
  const obstacles = [];
  const numObs = Math.floor(rng() * (p.maxObs + 1));
  for (let i = 0; i < numObs; i++) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const isStalactite = rng() < 0.5;
      const ox = Math.round(width * lerp(0.2, 0.8, rng()));
      const ow = Math.round(20 + rng() * 40);
      if (overlapsExitZonesX(zones, ox, ow)) continue;
      const passage = interpolateWall(floorPts, ox) - interpolateWall(ceilPts, ox);
      const maxLen = Math.floor(passage * 0.35);
      if (maxLen < 21) continue;
      const ol = Math.round(lerp(20, Math.max(21, maxLen), rng()));
      if (isStalactite) {
        obstacles.push({ kind: 'stalactite', x: ox, baseY: interpolateWall(ceilPts, ox) - 25, w: ow, len: ol });
      } else {
        obstacles.push({ kind: 'stalagmite', x: ox, baseY: interpolateWall(floorPts, ox) + 25, w: ow, len: ol });
      }
      break;
    }
  }

  const bgColor = BG_COLORS[Math.floor(rng() * BG_COLORS.length)];
  const room = {
    id: node.id, gx: node.gx, gy: node.gy, depth: node.depth,
    type, width, height, bgColor,
    ceilingPoints: ceilPts, floorPoints: floorPts,
    obstacles, exits, discovered: false,
  };
  spawnEnemiesForRoom(room, rng, node.depth, maxDepth);
  return room;
}

export function generateLevel(seed, spawnEnemiesForRoom, roomCount) {
  const rng = makePRNG(seed);
  const graph = buildGraph(rng, roomCount);
  const maxDepth = Math.max(1, graph.reactorNode.depth);
  return graph.order.map(node => generateRoom(node, rng, spawnEnemiesForRoom, maxDepth));
}
