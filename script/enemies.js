import { SHIP_RADIUS, ENEMY_DMG } from './constants.js';
import { ship, applyDamage } from './ship.js';
import { interpolateWall } from './level.js';
import { spawnImpactParticles } from './particles.js';
import { spawnHelicopter, updateHelicopter, drawHelicopter } from './helicopter.js';
import { spawnTurret, updateTurret, drawTurret } from './turret.js';
import { spawnMine, updateMine, drawMine } from './mine.js';

export const enemyProjectiles = [];

export { segmentsIntersect, hasLineOfSight } from './geometry.js';

export function spawnEnemiesForRoom(room, rng) {
  room.enemies = [];
  if (room.type === 'treasury') return;

  const count = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    const roll = rng();
    const enemy = roll < 0.2  ? spawnMine(room, rng)
                : roll < 0.55 ? spawnTurret(room, rng)
                :               spawnHelicopter(room, rng);
    if (enemy) room.enemies.push(enemy);
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
    if (e.kind === 'turret')         updateTurret(e, room, dt);
    else if (e.kind === 'mine')      updateMine(e, dt);
    else                             updateHelicopter(e, room, dt, enemyProjectiles);
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
  for (const e of room.enemies) {
    if (e.state === 'dying' && Math.floor(e.dyingTimer * 14) % 2 === 0) continue;
    if (e.kind === 'turret')         drawTurret(ctx, e);
    else if (e.kind === 'mine')      drawMine(ctx, e);
    else                             drawHelicopter(ctx, e);
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
