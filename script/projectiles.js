import { SHIP_RADIUS, PROJECTILE_SPEED, PROJECTILE_LENGTH, FIRE_COOLDOWN, LAUNCHER_RADIUS, ENEMY_HALF } from './constants.js';
import { ship, applyDamage } from './ship.js';
import { resources } from './resources.js';
import { interpolateWall } from './level.js';
import { spawnImpactParticles } from './particles.js';
import { ENEMY_DMG } from './constants.js';

export const projectiles = [];

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}

export function shoot() {
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

export function updateProjectiles(room, dt) {
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

    if (!hit) {
      for (const e of room.enemies) {
        if (e.state === 'dying') continue;
        const hitRadius = e.kind === 'turret' ? 10 : e.kind === 'launcher' ? LAUNCHER_RADIUS : ENEMY_HALF;
        const edx = p.x - e.x, edy = p.y - e.y;
        if (edx * edx + edy * edy < hitRadius * hitRadius) {
          e.hp--;
          if (e.hp <= 0) { e.state = 'dying'; e.dyingTimer = 0.5; }
          spawnImpactParticles(p.x, p.y);
          hit = true;
          break;
        }
      }
    }

    if (hit) {
      spawnImpactParticles(p.x, p.y);
      projectiles.splice(i, 1);
    }
  }
}

export function drawProjectiles(ctx) {
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
