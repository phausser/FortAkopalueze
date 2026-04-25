// ─── Konfiguration ────────────────────────────────────────────────────────────

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

const SHIP_ROTATION_SPEED = 3.0;
const SHIP_THRUST = 250;
const SHIP_DAMPING = 0.99;

const ROOM_COUNT_MIN = 8;
const ROOM_COUNT_MAX = 12;
const MIN_TUNNEL_H = 120;
const BG_COLORS = ['#3a1111', '#113511', '#3d1111', '#11113a', '#3a3d11'];

// ─── Spielzustände ────────────────────────────────────────────────────────────

const State = {
  MENU: 'menu',
  PLAYING: 'playing',
  DEAD: 'dead',
  ESCAPE: 'escape',
  WIN: 'win',
};

// ─── Ressourcen ───────────────────────────────────────────────────────────────

const resources = {
  energy: 1.0,
  shield: 1.0,
  ammo: 1.0,
};

function resetResources() {
  resources.energy = 1.0;
  resources.shield = 1.0;
  resources.ammo = 1.0;
}

// ─── Schiff ───────────────────────────────────────────────────────────────────

const SHIP_RADIUS = 12;
const RESTITUTION = 0.25;
const COLLISION_DAMAGE = 0.05;
const INVINCIBLE_TIME = 0.5;

const PROJECTILE_SPEED = 600;
const PROJECTILE_LENGTH = 8;
const FIRE_COOLDOWN = 0.2;
const PARTICLE_SPEED = 120;
const PARTICLE_LIFETIME = 0.42;
const PARTICLE_COUNT = 12;

const ship = {
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT / 2,
  angle: 0,
  vx: 0,
  vy: 0,
  invincibleTimer: 0,
  fireCooldown: 0,
};

function resetShip() {
  const room = game.rooms[0];
  ship.x = 100;
  ship.y = room ? room.entranceY : CANVAS_HEIGHT / 2;
  ship.angle = 0;
  ship.vx = 0;
  ship.vy = 0;
  ship.invincibleTimer = 0;
  ship.fireCooldown = 0;
  resetResources();
}

function applyCollisionDamage() {
  if (ship.invincibleTimer > 0) return;
  resources.energy -= COLLISION_DAMAGE;
  ship.invincibleTimer = INVINCIBLE_TIME;
}

function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.0001) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return { x: ax + t * dx, y: ay + t * dy };
}

function resolveVsSegment(ax, ay, bx, by) {
  const cp = closestPointOnSegment(ship.x, ship.y, ax, ay, bx, by);
  const dx = ship.x - cp.x;
  const dy = ship.y - cp.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= SHIP_RADIUS || dist < 0.0001) return false;

  const nx = dx / dist;
  const ny = dy / dist;

  // Push out of wall
  const overlap = SHIP_RADIUS - dist;
  ship.x += nx * overlap;
  ship.y += ny * overlap;

  // Reflect velocity across surface normal (only if moving into wall)
  const vDotN = ship.vx * nx + ship.vy * ny;
  if (vDotN < 0) {
    ship.vx -= (1 + RESTITUTION) * vDotN * nx;
    ship.vy -= (1 + RESTITUTION) * vDotN * ny;
  }
  return true;
}

function resolveCollisions(room) {
  const tEntrTop = room.entranceY - room.tunnelH / 2;
  const tEntrBot = room.entranceY + room.tunnelH / 2;
  const tExitTop = room.exitY - room.tunnelH / 2;
  const tExitBot = room.exitY + room.tunnelH / 2;

  // Ceiling segments
  for (let i = 0; i < room.ceilingPoints.length - 1; i++) {
    const a = room.ceilingPoints[i], b = room.ceilingPoints[i + 1];
    if (ship.x + SHIP_RADIUS < a.x || ship.x - SHIP_RADIUS > b.x) continue;
    if (resolveVsSegment(a.x, a.y, b.x, b.y)) applyCollisionDamage();
  }

  // Floor segments
  for (let i = 0; i < room.floorPoints.length - 1; i++) {
    const a = room.floorPoints[i], b = room.floorPoints[i + 1];
    if (ship.x + SHIP_RADIUS < a.x || ship.x - SHIP_RADIUS > b.x) continue;
    if (resolveVsSegment(a.x, a.y, b.x, b.y)) applyCollisionDamage();
  }

  // Left wall (zwei Segmente um Tunnel-Öffnung herum)
  if (ship.x - SHIP_RADIUS < 0) {
    if (resolveVsSegment(0, 0, 0, tEntrTop)) applyCollisionDamage();
    if (resolveVsSegment(0, tEntrBot, 0, room.height)) applyCollisionDamage();
  }

  // Right wall
  if (ship.x + SHIP_RADIUS > room.width) {
    if (resolveVsSegment(room.width, 0, room.width, tExitTop)) applyCollisionDamage();
    if (resolveVsSegment(room.width, tExitBot, room.width, room.height)) applyCollisionDamage();
  }

  // Hindernisse: beide Dreiecksseiten (Basis ist in der Wand versenkt)
  for (const obs of room.obstacles) {
    const tipY = obs.kind === 'stalactite' ? obs.baseY + obs.len : obs.baseY - obs.len;
    if (resolveVsSegment(obs.x - obs.w / 2, obs.baseY, obs.x, tipY)) applyCollisionDamage();
    if (resolveVsSegment(obs.x + obs.w / 2, obs.baseY, obs.x, tipY)) applyCollisionDamage();
  }
}

// ─── Projektile & Partikel ────────────────────────────────────────────────────

const projectiles = [];
const particles = [];

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}

function spawnImpactParticles(x, y) {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    particles.push({ x, y, vx: Math.cos(angle) * PARTICLE_SPEED, vy: Math.sin(angle) * PARTICLE_SPEED, life: PARTICLE_LIFETIME });
  }
}

function shoot() {
  if (ship.fireCooldown > 0) return;
  resources.ammo -= 1 / 80;
  projectiles.push({
    x: ship.x + Math.cos(ship.angle) * 16,
    y: ship.y + Math.sin(ship.angle) * 16,
    vx: Math.cos(ship.angle) * PROJECTILE_SPEED,
    vy: Math.sin(ship.angle) * PROJECTILE_SPEED,
  });
  ship.fireCooldown = FIRE_COOLDOWN;
}

function updateProjectiles(room, dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    let hit = p.x < 0 || p.x > room.width;

    if (!hit) {
      const ceilY = interpolateWall(room.ceilingPoints, p.x);
      const floorY = interpolateWall(room.floorPoints, p.x);
      if (p.y < ceilY || p.y > floorY) hit = true;
    }

    if (!hit) {
      for (const obs of room.obstacles) {
        const tipY = obs.kind === 'stalactite' ? obs.baseY + obs.len : obs.baseY - obs.len;
        if (pointInTriangle(p.x, p.y, obs.x - obs.w / 2, obs.baseY, obs.x + obs.w / 2, obs.baseY, obs.x, tipY)) {
          hit = true; break;
        }
      }
    }

    if (hit) {
      spawnImpactParticles(p.x, p.y);
      projectiles.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

// ─── Eingabe ──────────────────────────────────────────────────────────────────

const input = {
  held: new Set(),
  justPressed: new Set(),
  isHeld(key) { return this.held.has(key); },
  isJustPressed(key) { return this.justPressed.has(key); },
  clearFrameState() { this.justPressed.clear(); },
};

window.addEventListener('keydown', (event) => {
  if (!input.held.has(event.code)) input.justPressed.add(event.code);
  input.held.add(event.code);
});
window.addEventListener('keyup', (event) => {
  input.held.delete(event.code);
});

// ─── Spielstand ───────────────────────────────────────────────────────────────

const game = {
  state: State.MENU,
  previousTime: 0,
  rooms: [],
  currentRoomIndex: 0,
  camX: 0,
  camY: 0,
  seed: 0,

  setState(newState) { this.state = newState; },
};

// ─── Level-Generierung ────────────────────────────────────────────────────────

function makePRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }

function interpolateWall(points, x) {
  for (let i = 0; i < points.length - 1; i++) {
    if (x >= points[i].x && x <= points[i + 1].x) {
      const t = (x - points[i].x) / (points[i + 1].x - points[i].x);
      return lerp(points[i].y, points[i + 1].y, t);
    }
  }
  return points[points.length - 1].y;
}

const ROOM_PARAMS = {
  standard: { wMin: 1400, wMax: 2000, hMin: 580, hMax: 700, ceilAmp: 100, floorAmp: 100, minPass: 150, pts: 7, maxObs: 2 },
  narrow: { wMin: 1200, wMax: 1600, hMin: 560, hMax: 640, ceilAmp: 150, floorAmp: 150, minPass: 120, pts: 9, maxObs: 4 },
  open: { wMin: 1800, wMax: 2400, hMin: 640, hMax: 800, ceilAmp: 50, floorAmp: 50, minPass: 200, pts: 5, maxObs: 1 },
  treasury: { wMin: 1200, wMax: 1600, hMin: 560, hMax: 700, ceilAmp: 80, floorAmp: 80, minPass: 180, pts: 6, maxObs: 0 },
  reactor: { wMin: 1600, wMax: 2000, hMin: 600, hMax: 750, ceilAmp: 60, floorAmp: 60, minPass: 200, pts: 6, maxObs: 1 },
};

function pickType(rng) {
  const pool = [
    { type: 'standard', w: 50 },
    { type: 'narrow', w: 20 },
    { type: 'open', w: 15 },
    { type: 'treasury', w: 10 },
  ];
  let r = rng() * pool.reduce((s, e) => s + e.w, 0);
  for (const e of pool) { r -= e.w; if (r <= 0) return e.type; }
  return 'standard';
}

function generateRoom(index, totalRooms, rng) {
  const isLast = index === totalRooms - 1;
  const type = isLast ? 'reactor' : pickType(rng);
  const p = ROOM_PARAMS[type];

  const width = Math.round(lerp(p.wMin, p.wMax, rng()));
  const height = Math.round(lerp(p.hMin, p.hMax, rng()));

  const tunnelH = Math.round(MIN_TUNNEL_H + rng() * (type === 'narrow' ? 40 : 80));
  const entranceY = Math.round(height * lerp(0.35, 0.65, rng()));
  const exitY = Math.round(height * lerp(0.35, 0.65, rng()));

  // Ceiling and floor points — index 0 = left wall, last = right wall
  const numPts = p.pts + 2; // includes both wall endpoints
  const maxCeilY = height / 2 - p.minPass / 2;
  const minFloorY = height / 2 + p.minPass / 2;

  const ceilingPoints = [];
  const floorPoints = [];

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
      // Enforce minimum passage
      if (fy - cy < p.minPass) {
        const mid = (cy + fy) / 2;
        cy = Math.round(mid - p.minPass / 2);
        fy = Math.round(mid + p.minPass / 2);
      }
    }
    ceilingPoints.push({ x, y: Math.round(cy) });
    floorPoints.push({ x, y: Math.round(fy) });
  }

  // Obstacles (stalactites / stalagmites)
  const obstacles = [];
  const numObs = Math.floor(rng() * (p.maxObs + 1));
  for (let i = 0; i < numObs; i++) {
    const isStalactite = rng() < 0.5;
    const ox = Math.round(width * lerp(0.2, 0.8, rng()));
    const ow = Math.round(20 + rng() * 40);
    const passage = interpolateWall(floorPoints, ox) - interpolateWall(ceilingPoints, ox);
    const maxLen = Math.floor(passage * 0.35);
    const ol = Math.round(lerp(20, Math.max(21, maxLen), rng()));

    if (isStalactite) {
      obstacles.push({ kind: 'stalactite', x: ox, baseY: interpolateWall(ceilingPoints, ox) - 25, w: ow, len: ol });
    } else {
      obstacles.push({ kind: 'stalagmite', x: ox, baseY: interpolateWall(floorPoints, ox) + 25, w: ow, len: ol });
    }
  }

  const bgColor = BG_COLORS[Math.floor(rng() * BG_COLORS.length)];

  return { type, width, height, bgColor, ceilingPoints, floorPoints, obstacles, entranceY, exitY, tunnelH };
}

function generateLevel(seed) {
  const rng = makePRNG(seed);
  const totalRooms = ROOM_COUNT_MIN + Math.floor(rng() * (ROOM_COUNT_MAX - ROOM_COUNT_MIN + 1));
  return Array.from({ length: totalRooms }, (_, i) => generateRoom(i, totalRooms, rng));
}

// ─── Update-Logik pro Zustand ─────────────────────────────────────────────────

function updateMenu() {
  if (input.isJustPressed('Enter') || input.isJustPressed('Space')) {
    game.seed = Date.now();
    game.rooms = generateLevel(game.seed);
    game.currentRoomIndex = 0;
    game.camX = 0;
    game.camY = 0;
    projectiles.length = 0;
    particles.length = 0;
    resetShip();
    game.setState(State.PLAYING);
  }
}

function updatePlaying(dt) {
  if (input.isHeld('ArrowLeft')) ship.angle -= SHIP_ROTATION_SPEED * dt;
  if (input.isHeld('ArrowRight')) ship.angle += SHIP_ROTATION_SPEED * dt;

  if (input.isHeld('ArrowUp')) {
    ship.vx += Math.cos(ship.angle) * SHIP_THRUST * dt;
    ship.vy += Math.sin(ship.angle) * SHIP_THRUST * dt;
  }
  if (input.isHeld('ArrowDown')) {
    ship.vx -= Math.cos(ship.angle) * SHIP_THRUST * dt;
    ship.vy -= Math.sin(ship.angle) * SHIP_THRUST * dt;
  }

  const d = Math.pow(SHIP_DAMPING, dt * 60);
  ship.vx *= d;
  ship.vy *= d;

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  if (ship.invincibleTimer > 0) ship.invincibleTimer -= dt;
  if (ship.fireCooldown > 0) ship.fireCooldown -= dt;

  if (input.isHeld('Space')) shoot();

  const room = game.rooms[game.currentRoomIndex];
  if (room) {
    resolveCollisions(room);
    updateProjectiles(room, dt);
  }
  updateParticles(dt);

  // Raumwechsel rechts
  if (room && ship.x - SHIP_RADIUS > room.width) {
    const next = game.currentRoomIndex + 1;
    if (next < game.rooms.length) {
      game.currentRoomIndex = next;
      const nextRoom = game.rooms[next];
      ship.x = SHIP_RADIUS + 1;
      ship.y = nextRoom.entranceY;
      game.camX = 0;
      game.camY = 0;
    }
  }

  // Raumwechsel links
  if (room && ship.x + SHIP_RADIUS < 0) {
    const prev = game.currentRoomIndex - 1;
    if (prev >= 0) {
      game.currentRoomIndex = prev;
      const prevRoom = game.rooms[prev];
      ship.x = prevRoom.width - SHIP_RADIUS - 1;
      ship.y = prevRoom.exitY;
      game.camX = Math.max(0, prevRoom.width - CANVAS_WIDTH);
      game.camY = 0;
    }
  }

  // Camera
  if (room) {
    game.camX = Math.max(0, Math.min(ship.x - CANVAS_WIDTH / 2, Math.max(0, room.width - CANVAS_WIDTH)));
    game.camY = Math.max(0, Math.min(ship.y - CANVAS_HEIGHT / 2, Math.max(0, room.height - CANVAS_HEIGHT)));
  }

  if (input.isJustPressed('Escape')) game.setState(State.MENU);
}

function updateDead() {
  if (input.isJustPressed('Enter') || input.isJustPressed('Space')) game.setState(State.MENU);
}

function updateEscape() { }

function updateWin() {
  if (input.isJustPressed('Enter') || input.isJustPressed('Space')) game.setState(State.MENU);
}

const stateUpdaters = {
  [State.MENU]: updateMenu,
  [State.PLAYING]: updatePlaying,
  [State.DEAD]: updateDead,
  [State.ESCAPE]: updateEscape,
  [State.WIN]: updateWin,
};

// ─── Render-Hilfsfunktionen ───────────────────────────────────────────────────

function drawRoom(ctx, room) {
  ctx.fillStyle = '#000000';

  // Ceiling polygon: top strip down to the ceiling line
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(room.width, 0);
  for (let i = room.ceilingPoints.length - 1; i >= 0; i--) {
    ctx.lineTo(room.ceilingPoints[i].x, room.ceilingPoints[i].y);
  }
  ctx.closePath();
  ctx.fill();

  // Floor polygon: bottom strip up to the floor line
  ctx.beginPath();
  ctx.moveTo(0, room.height);
  ctx.lineTo(room.width, room.height);
  for (let i = room.floorPoints.length - 1; i >= 0; i--) {
    ctx.lineTo(room.floorPoints[i].x, room.floorPoints[i].y);
  }
  ctx.closePath();
  ctx.fill();

  // Obstacles
  for (const obs of room.obstacles) {
    ctx.beginPath();
    if (obs.kind === 'stalactite') {
      ctx.moveTo(obs.x - obs.w / 2, obs.baseY);
      ctx.lineTo(obs.x + obs.w / 2, obs.baseY);
      ctx.lineTo(obs.x, obs.baseY + obs.len);
    } else {
      ctx.moveTo(obs.x - obs.w / 2, obs.baseY);
      ctx.lineTo(obs.x + obs.w / 2, obs.baseY);
      ctx.lineTo(obs.x, obs.baseY - obs.len);
    }
    ctx.closePath();
    ctx.fill();
  }
}

function drawProjectiles(ctx) {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const p of projectiles) {
    const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const nx = p.vx / spd;
    const ny = p.vy / spd;
    ctx.beginPath();
    ctx.moveTo(p.x - nx * PROJECTILE_LENGTH / 2, p.y - ny * PROJECTILE_LENGTH / 2);
    ctx.lineTo(p.x + nx * PROJECTILE_LENGTH / 2, p.y + ny * PROJECTILE_LENGTH / 2);
    ctx.stroke();
  }
}

function drawParticles(ctx) {
  for (const p of particles) {
    ctx.globalAlpha = p.life / PARTICLE_LIFETIME;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawHUD(ctx) {
  const BAR_W = 25;
  const BAR_H = 5;
  const GAP = 3;
  const MARGIN = 8;

  const bars = [
    { value: resources.energy, color: '#4488ff' },
    { value: resources.shield, color: '#44ff88' },
    { value: resources.ammo, color: '#ffdd44' },
  ];

  bars.forEach((bar, i) => {
    const x = MARGIN;
    const y = MARGIN + i * (BAR_H + GAP);
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, BAR_W, BAR_H);
    ctx.fillStyle = bar.color;
    ctx.fillRect(x, y, Math.round(BAR_W * Math.max(0, bar.value)), BAR_H);
  });
}

function drawShip(ctx) {
  if (ship.invincibleTimer > 0 && Math.floor(ship.invincibleTimer / 0.08) % 2 === 0) return;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-11, 13);
  ctx.lineTo(-11, -13);
  ctx.closePath();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'miter';
  ctx.stroke();

  ctx.restore();
}

// ─── Render-Logik pro Zustand ─────────────────────────────────────────────────

function renderMenu(ctx) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px "Michroma", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FORT AKOPALUEZE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

  ctx.font = '16px "Michroma", sans-serif';
  ctx.fillText('ENTER oder LEERTASTE zum Starten', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
}

function renderPlaying(ctx) {
  const room = game.rooms[game.currentRoomIndex];
  if (!room) return;

  // Background (screen space — fills visible area with room color)
  ctx.fillStyle = room.bgColor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // World space
  ctx.save();
  ctx.translate(-game.camX, -game.camY);
  drawRoom(ctx, room);
  drawProjectiles(ctx);
  drawParticles(ctx);
  drawShip(ctx);
  ctx.restore();

  // HUD overlay (screen space)
  drawHUD(ctx);
}

function renderDead(ctx) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px "Michroma", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.font = '18px "Michroma", sans-serif';
  ctx.fillText('ENTER zum Neustart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
}

function renderWin(ctx) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px "Michroma", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ENTKOMMEN!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.font = '18px "Michroma", sans-serif';
  ctx.fillText('ENTER zum Neustart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
}

const stateRenderers = {
  [State.MENU]: renderMenu,
  [State.PLAYING]: renderPlaying,
  [State.DEAD]: renderDead,
  [State.ESCAPE]: renderPlaying,
  [State.WIN]: renderWin,
};

// ─── Game Loop ────────────────────────────────────────────────────────────────

function loop(timestamp) {
  const deltaTime = (timestamp - game.previousTime) / 1000;
  game.previousTime = timestamp;
  const clampedDelta = Math.min(deltaTime, 0.1);

  stateUpdaters[game.state]?.(clampedDelta);
  stateRenderers[game.state]?.(ctx);

  input.clearFrameState();
  requestAnimationFrame(loop);
}

// ─── Start ────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

requestAnimationFrame((timestamp) => {
  game.previousTime = timestamp;
  loop(timestamp);
});
