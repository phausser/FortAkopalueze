import {
  SHIP_RADIUS,
  ENEMY_HALF, ENEMY_PATROL_SPD, ENEMY_CHASE_SPD, ENEMY_CHASE_DIST,
  ENEMY_FLEE_DIST, ENEMY_MIN_DIST, ENEMY_FIRE_RATE, ENEMY_PROJ_SPEED, ENEMY_DMG,
} from './constants.js';
import { ship, applyDamage } from './ship.js';
import { interpolateWall, lerp } from './level.js';

export function spawnHelicopter(room, rng) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const x = room.width * lerp(0.2, 0.8, rng());
    const ceilY = interpolateWall(room.ceilingPoints, x);
    const floorY = interpolateWall(room.floorPoints, x);
    if (floorY - ceilY < ENEMY_HALF * 2 + 40) continue;
    const y = lerp(ceilY + ENEMY_HALF + 10, floorY - ENEMY_HALF - 10, rng());
    return {
      kind: 'helicopter',
      x, y,
      vx: (rng() < 0.5 ? 1 : -1) * ENEMY_PATROL_SPD,
      vy: 0,
      hp: 2,
      state: 'patrol',
      fireCooldown: rng() * ENEMY_FIRE_RATE,
      dyingTimer: 0,
    };
  }
  return null;
}

export function updateHelicopter(e, room, dt, enemyProjectiles) {
  const dx = ship.x - e.x;
  const dy = ship.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (e.state === 'patrol' && dist < ENEMY_CHASE_DIST) e.state = 'chase';
  if (e.state === 'chase'  && dist > ENEMY_FLEE_DIST)  e.state = 'patrol';

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
      enemyProjectiles.push({
        x: e.x, y: e.y,
        vx: Math.cos(angle) * ENEMY_PROJ_SPEED,
        vy: Math.sin(angle) * ENEMY_PROJ_SPEED,
      });
    }
  }

  const cx = Math.max(0, Math.min(room.width, e.x));
  e.y = Math.max(
    interpolateWall(room.ceilingPoints, cx) + ENEMY_HALF + 2,
    Math.min(interpolateWall(room.floorPoints, cx) - ENEMY_HALF - 2, e.y),
  );

  if (dist < SHIP_RADIUS + ENEMY_HALF) applyDamage(ENEMY_DMG);
}

export function drawHelicopter(ctx, e) {
  const S = ENEMY_HALF * 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(e.x - ENEMY_HALF, e.y - ENEMY_HALF, S, S);
}
