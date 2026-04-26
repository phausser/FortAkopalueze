import {
  SHIP_RADIUS,
  LASER_ON_MIN, LASER_ON_MAX, LASER_OFF_MIN, LASER_OFF_MAX,
  LASER_DAMAGE, LASER_EMITTER_HP, LASER_EMITTER_R, LASER_COLOR,
  MISSILE_EXPLODE_TIME,
} from './constants.js';
import { ship } from './ship.js';
import { resources } from './resources.js';
import { spawnImpactParticles } from './particles.js';
import { interpolateWall, lerp } from './level.js';
import { enemyProjectiles } from './enemies.js';
import { missiles } from './missiles.js';
import { projectiles } from './projectiles.js';

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.0001) {
    const ex = px - ax, ey = py - ay;
    return Math.sqrt(ex * ex + ey * ey);
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx - px, cy = ay + t * dy - py;
  return Math.sqrt(cx * cx + cy * cy);
}

export function spawnLasersForRoom(room, rng) {
  room.lasers = [];
  if (room.type === 'treasury' || room.type === 'reactor') return;

  const count = Math.floor(rng() * 3); // 0, 1 oder 2
  for (let i = 0; i < count; i++) {
    const ax = room.width * lerp(0.2, 0.8, rng());
    const ay = interpolateWall(room.ceilingPoints, ax);

    // Diagonale: Boden-Emitter bis ±250px versetzt
    const offset = (rng() - 0.5) * 500;
    const bx = Math.max(50, Math.min(room.width - 50, ax + offset));
    const by = interpolateWall(room.floorPoints, bx);

    room.lasers.push({
      ax, ay, bx, by,
      hpA: LASER_EMITTER_HP,
      hpB: LASER_EMITTER_HP,
      state: rng() < 0.5 ? 'on' : 'off',
      timer: rng() < 0.5
        ? LASER_ON_MIN  + rng() * (LASER_ON_MAX  - LASER_ON_MIN)
        : LASER_OFF_MIN + rng() * (LASER_OFF_MAX - LASER_OFF_MIN),
      dyingA: 0,
      dyingB: 0,
    });
  }
}

export function updateLasers(room, dt) {
  for (const L of room.lasers) {
    if (L.state === 'disabled') continue;

    if (L.dyingA > 0) L.dyingA -= dt;
    if (L.dyingB > 0) L.dyingB -= dt;

    // Zyklus an/aus
    L.timer -= dt;
    if (L.timer <= 0) {
      L.state = L.state === 'on' ? 'off' : 'on';
      L.timer = L.state === 'on'
        ? LASER_ON_MIN  + Math.random() * (LASER_ON_MAX  - LASER_ON_MIN)
        : LASER_OFF_MIN + Math.random() * (LASER_OFF_MAX - LASER_OFF_MIN);
    }

    // Spieler-Projektile treffen Emitter
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      let hitEmitter = false;
      if (L.hpA > 0) {
        const dx = p.x - L.ax, dy = p.y - L.ay;
        if (dx * dx + dy * dy < LASER_EMITTER_R * LASER_EMITTER_R) {
          L.hpA--;
          if (L.hpA <= 0) { L.dyingA = 0.5; L.state = 'disabled'; }
          spawnImpactParticles(p.x, p.y);
          hitEmitter = true;
        }
      }
      if (!hitEmitter && L.hpB > 0) {
        const dx = p.x - L.bx, dy = p.y - L.by;
        if (dx * dx + dy * dy < LASER_EMITTER_R * LASER_EMITTER_R) {
          L.hpB--;
          if (L.hpB <= 0) { L.dyingB = 0.5; L.state = 'disabled'; }
          spawnImpactParticles(p.x, p.y);
          hitEmitter = true;
        }
      }
      if (hitEmitter) { projectiles.splice(i, 1); continue; }

      // Strahl zerstört Spieler-Projektile
      if (L.state === 'on' && distToSegment(p.x, p.y, L.ax, L.ay, L.bx, L.by) < 3) {
        spawnImpactParticles(p.x, p.y);
        projectiles.splice(i, 1);
      }
    }

    if (L.state !== 'on') continue;

    // Spieler-Schaden (umgeht Shield + Unverwundbarkeit)
    if (distToSegment(ship.x, ship.y, L.ax, L.ay, L.bx, L.by) < SHIP_RADIUS) {
      resources.energy = Math.max(0, resources.energy - LASER_DAMAGE * dt);
    }

    // Gegner-Projektile
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const p = enemyProjectiles[i];
      if (distToSegment(p.x, p.y, L.ax, L.ay, L.bx, L.by) < 3) {
        spawnImpactParticles(p.x, p.y);
        enemyProjectiles.splice(i, 1);
      }
    }

    // Raketen
    for (let i = missiles.length - 1; i >= 0; i--) {
      const m = missiles[i];
      if (m.state === 'exploding') continue;
      if (distToSegment(m.x, m.y, L.ax, L.ay, L.bx, L.by) < 6) {
        m.state = 'exploding';
        m.explodeTimer = MISSILE_EXPLODE_TIME;
        spawnImpactParticles(m.x, m.y);
      }
    }
  }
}

export function drawLasers(ctx) {
  // Wird pro Raum aufgerufen — room wird als Argument übergeben
}

export function drawLasersForRoom(ctx, room) {
  for (const L of room.lasers) {
    const aAlive = L.hpA > 0 && L.dyingA <= 0;
    const bAlive = L.hpB > 0 && L.dyingB <= 0;

    // Emitter A
    if (L.hpA > 0 || L.dyingA > 0) {
      const blink = L.dyingA > 0 && Math.floor(L.dyingA * 14) % 2 === 0;
      if (!blink) {
        ctx.fillStyle = LASER_COLOR;
        ctx.fillRect(L.ax - 4, L.ay - 4, 8, 8);
      }
    }

    // Emitter B
    if (L.hpB > 0 || L.dyingB > 0) {
      const blink = L.dyingB > 0 && Math.floor(L.dyingB * 14) % 2 === 0;
      if (!blink) {
        ctx.fillStyle = LASER_COLOR;
        ctx.fillRect(L.bx - 4, L.by - 4, 8, 8);
      }
    }

    // Laserstrahl
    if (L.state === 'on' && aAlive && bAlive) {
      ctx.save();
      ctx.strokeStyle = LASER_COLOR;
      ctx.lineWidth = 2;
      ctx.shadowColor = LASER_COLOR;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(L.ax, L.ay);
      ctx.lineTo(L.bx, L.by);
      ctx.stroke();
      ctx.restore();
    }
  }
}
