import {
  SHIP_RADIUS,
  ENEMY_HALF, ENEMY_PATROL_SPD, ENEMY_CHASE_SPD, ENEMY_CHASE_DIST,
  ENEMY_FLEE_DIST, ENEMY_MIN_DIST, ENEMY_FIRE_RATE, ENEMY_PROJ_SPEED, ENEMY_DMG,
  TURRET_HP, TURRET_FIRE_RATE, TURRET_ROT_SPEED, TURRET_RANGE,
  LAUNCHER_RADIUS, LAUNCHER_HP, LAUNCHER_ALERT_DIST, LAUNCHER_FIRE_DIST, LAUNCHER_COOLDOWN,
} from './constants.js';
import { ship, applyDamage } from './ship.js';
import { interpolateWall, lerp } from './level.js';
import { spawnMissile } from './missiles.js';
import { spawnImpactParticles } from './particles.js';

export const enemyProjectiles = [];

export function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1x = bx - ax, d1y = by - ay;
  const d2x = dx - cx, d2y = dy - cy;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 0.0001) return false;
  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / cross;
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / cross;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function hasLineOfSight(room, x1, y1, x2, y2) {
  for (let i = 0; i < room.ceilingPoints.length - 1; i++) {
    const a = room.ceilingPoints[i], b = room.ceilingPoints[i + 1];
    if (segmentsIntersect(x1, y1, x2, y2, a.x, a.y, b.x, b.y)) return false;
  }
  for (let i = 0; i < room.floorPoints.length - 1; i++) {
    const a = room.floorPoints[i], b = room.floorPoints[i + 1];
    if (segmentsIntersect(x1, y1, x2, y2, a.x, a.y, b.x, b.y)) return false;
  }
  for (const obs of room.obstacles) {
    const tipY = obs.kind === 'stalactite' ? obs.baseY + obs.len : obs.baseY - obs.len;
    if (segmentsIntersect(x1, y1, x2, y2, obs.x - obs.w / 2, obs.baseY, obs.x, tipY)) return false;
    if (segmentsIntersect(x1, y1, x2, y2, obs.x + obs.w / 2, obs.baseY, obs.x, tipY)) return false;
  }
  return true;
}

export function spawnEnemiesForRoom(room, rng) {
  room.enemies = [];
  if (room.type === 'treasury') return;

  const count = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    const roll = rng();
    if (roll < 0.2) {
      // Launcher
      for (let attempt = 0; attempt < 12; attempt++) {
        const x = room.width * lerp(0.2, 0.8, rng());
        const ceilY = interpolateWall(room.ceilingPoints, x);
        const floorY = interpolateWall(room.floorPoints, x);
        if (floorY - ceilY < LAUNCHER_RADIUS * 2 + 40) continue;
        const y = lerp(ceilY + LAUNCHER_RADIUS + 10, floorY - LAUNCHER_RADIUS - 10, rng());
        room.enemies.push({
          kind: 'launcher',
          x, y,
          hp: LAUNCHER_HP,
          state: 'idle',
          cooldownTimer: 0,
          blinkPhase: 0,
          pulseTimer: 0,
          dyingTimer: 0,
        });
        break;
      }
    } else if (roll < 0.55) {
      // Turret
      const x = room.width * lerp(0.15, 0.85, rng());
      const onFloor = rng() < 0.5;
      const wallY = onFloor
        ? interpolateWall(room.floorPoints, x)
        : interpolateWall(room.ceilingPoints, x);
      room.enemies.push({
        kind: 'turret',
        x,
        y: wallY,
        mount: onFloor ? 'floor' : 'ceiling',
        angle: onFloor ? -Math.PI / 2 : Math.PI / 2,
        hp: TURRET_HP,
        state: 'idle',
        fireCooldown: rng() * TURRET_FIRE_RATE,
        dyingTimer: 0,
      });
    } else {
      // Helicopter
      for (let attempt = 0; attempt < 12; attempt++) {
        const x = room.width * lerp(0.2, 0.8, rng());
        const ceilY = interpolateWall(room.ceilingPoints, x);
        const floorY = interpolateWall(room.floorPoints, x);
        if (floorY - ceilY < ENEMY_HALF * 2 + 40) continue;
        const y = lerp(ceilY + ENEMY_HALF + 10, floorY - ENEMY_HALF - 10, rng());
        room.enemies.push({
          kind: 'helicopter',
          x, y,
          vx: (rng() < 0.5 ? 1 : -1) * ENEMY_PATROL_SPD,
          vy: 0,
          hp: 2,
          state: 'patrol',
          fireCooldown: rng() * ENEMY_FIRE_RATE,
          dyingTimer: 0,
        });
        break;
      }
    }
  }
}

function updateHelicopter(e, room, dt) {
  const dx = ship.x - e.x;
  const dy = ship.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (e.state === 'patrol' && dist < ENEMY_CHASE_DIST) e.state = 'chase';
  if (e.state === 'chase' && dist > ENEMY_FLEE_DIST) e.state = 'patrol';

  if (e.state === 'patrol') {
    e.x += e.vx * dt;
    if (e.x < ENEMY_HALF + 20 || e.x > room.width - ENEMY_HALF - 20) e.vx = -e.vx;
  } else {
    if (dist > ENEMY_MIN_DIST) {
      e.x += (dx / dist) * ENEMY_CHASE_SPD * dt;
      e.y += (dy / dist) * ENEMY_CHASE_SPD * dt;
    }
    e.fireCooldown -= dt;
    if (e.fireCooldown <= 0) {
      e.fireCooldown = ENEMY_FIRE_RATE;
      const angle = Math.atan2(dy, dx);
      enemyProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(angle) * ENEMY_PROJ_SPEED, vy: Math.sin(angle) * ENEMY_PROJ_SPEED });
    }
  }

  const cx = Math.max(0, Math.min(room.width, e.x));
  e.y = Math.max(interpolateWall(room.ceilingPoints, cx) + ENEMY_HALF + 2,
    Math.min(interpolateWall(room.floorPoints, cx) - ENEMY_HALF - 2, e.y));

  if (dist < SHIP_RADIUS + ENEMY_HALF) applyDamage(ENEMY_DMG);
}

function updateTurret(e, room, dt) {
  const dx = ship.x - e.x;
  const dy = ship.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > TURRET_RANGE) { e.state = 'idle'; return; }

  e.state = 'tracking';

  const targetAngle = Math.atan2(dy, dx);
  let diff = targetAngle - e.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const step = TURRET_ROT_SPEED * dt;
  e.angle += Math.abs(diff) < step ? diff : Math.sign(diff) * step;

  if (e.mount === 'floor')    e.angle = Math.max(-Math.PI, Math.min(0, e.angle));
  if (e.mount === 'ceiling')  e.angle = Math.max(0, Math.min(Math.PI, e.angle));

  e.fireCooldown -= dt;
  if (e.fireCooldown <= 0) {
    e.fireCooldown = TURRET_FIRE_RATE;
    const offsetY = e.mount === 'floor' ? -4 : 4;
    if (hasLineOfSight(room, e.x, e.y + offsetY, ship.x, ship.y)) {
      enemyProjectiles.push({
        x: e.x, y: e.y,
        vx: Math.cos(e.angle) * ENEMY_PROJ_SPEED,
        vy: Math.sin(e.angle) * ENEMY_PROJ_SPEED,
      });
    }
  }
}

function updateLauncher(e, dt) {
  e.pulseTimer += dt;

  if (e.state === 'cooldown') {
    e.cooldownTimer -= dt;
    if (e.cooldownTimer <= 0) {
      e.state = 'idle';
    } else {
      const t = 1 - (e.cooldownTimer / LAUNCHER_COOLDOWN);
      e.blinkPhase += (2 + t * 8) * dt;
    }
    return;
  }
  e.blinkPhase = 0;

  const dx = ship.x - e.x, dy = ship.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < LAUNCHER_FIRE_DIST) {
    spawnMissile(e.x, e.y);
    e.state = 'cooldown';
    e.cooldownTimer = LAUNCHER_COOLDOWN;
  } else if (dist < LAUNCHER_ALERT_DIST) {
    e.state = 'alert';
  } else {
    e.state = 'idle';
  }
}

export function updateEnemies(room, dt) {
  for (let i = room.enemies.length - 1; i >= 0; i--) {
    const e = room.enemies[i];

    if (e.state === 'dying') {
      e.dyingTimer -= dt;
      if (e.dyingTimer <= 0) room.enemies.splice(i, 1);
      continue;
    }

    if (e.kind === 'turret') {
      updateTurret(e, room, dt);
    } else if (e.kind === 'launcher') {
      updateLauncher(e, dt);
    } else {
      updateHelicopter(e, room, dt);
    }
  }
}

export function updateEnemyProjectiles(room, dt) {
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const p = enemyProjectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    let hit = p.x < 0 || p.x > room.width;
    if (!hit) {
      const cy = interpolateWall(room.ceilingPoints, p.x);
      const fy = interpolateWall(room.floorPoints, p.x);
      if (p.y < cy || p.y > fy) hit = true;
    }

    if (!hit) {
      const dx = p.x - ship.x, dy = p.y - ship.y;
      if (dx * dx + dy * dy < (SHIP_RADIUS + 3) * (SHIP_RADIUS + 3)) {
        applyDamage(ENEMY_DMG);
        hit = true;
      }
    }

    if (hit) {
      spawnImpactParticles(p.x, p.y);
      enemyProjectiles.splice(i, 1);
    }
  }
}

export function drawEnemies(ctx, room) {
  const S = ENEMY_HALF * 2;
  for (const e of room.enemies) {
    if (e.state === 'dying' && Math.floor(e.dyingTimer * 14) % 2 === 0) continue;
    if (e.kind === 'launcher' && e.state === 'cooldown') {
      if (Math.sin(e.blinkPhase * Math.PI * 2) <= 0) continue;
    }
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';

    if (e.kind === 'turret') {
      ctx.beginPath();
      ctx.arc(e.x, e.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(e.angle) * 20, e.y + Math.sin(e.angle) * 20);
      ctx.stroke();
    } else if (e.kind === 'launcher') {
      const pulse = e.state === 'alert'
        ? LAUNCHER_RADIUS + Math.sin(e.pulseTimer * 8) * 3
        : LAUNCHER_RADIUS;
      ctx.beginPath();
      ctx.arc(e.x, e.y, pulse, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(e.x - ENEMY_HALF, e.y - ENEMY_HALF, S, S);
    }
  }
}

export function drawEnemyProjectiles(ctx) {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  for (const p of enemyProjectiles) {
    const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const nx = p.vx / spd, ny = p.vy / spd;
    ctx.beginPath();
    ctx.moveTo(p.x - nx * 5, p.y - ny * 5);
    ctx.lineTo(p.x + nx * 5, p.y + ny * 5);
    ctx.stroke();
  }
}
