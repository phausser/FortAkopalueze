import {
  MINE_RADIUS, MINE_HP, MINE_ALERT_DIST, MINE_TRIGGER_DIST,
  MINE_EXPLOSION_RADIUS, MINE_DAMAGE_MAX,
} from './constants.js';
import { ship, applyDamage } from './ship.js';
import { particles, spawnImpactParticles } from './particles.js';
import { interpolateWall, lerp } from './level.js';
import { playMineAlert, playMineExplode } from './sound.js';

export function spawnMine(room, rng) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const x = room.width * lerp(0.2, 0.8, rng());
    const ceilY = interpolateWall(room.ceilingPoints, x);
    const floorY = interpolateWall(room.floorPoints, x);
    if (floorY - ceilY < MINE_RADIUS * 2 + 40) continue;
    const y = lerp(ceilY + MINE_RADIUS + 10, floorY - MINE_RADIUS - 10, rng());
    return {
      kind: 'mine',
      x, y,
      hp: MINE_HP,
      state: 'idle',
      pulseTimer: 0,
      dyingTimer: 0,
    };
  }
  return null;
}

function explodeMine(e) {
  playMineExplode();
  spawnImpactParticles(e.x, e.y);
  for (let i = 0; i < 200; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 60 + Math.random() * 200;
    particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 0.6, maxLife: 0.6 });
  }
  const dx = ship.x - e.x, dy = ship.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < MINE_EXPLOSION_RADIUS) {
    applyDamage(MINE_DAMAGE_MAX * (1 - dist / MINE_EXPLOSION_RADIUS));
  }
  e.state = 'dying';
  e.dyingTimer = 0.001;
}

export function updateMine(e, dt) {
  e.pulseTimer += dt;
  const dx = ship.x - e.x, dy = ship.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < MINE_TRIGGER_DIST) {
    explodeMine(e);
  } else {
    const nextState = dist < MINE_ALERT_DIST ? 'alert' : 'idle';
    if (nextState === 'alert' && e.state === 'idle') playMineAlert();
    e.state = nextState;
  }
}

export function drawMine(ctx, e) {
  const pulse = e.state === 'alert'
    ? MINE_RADIUS + Math.sin(e.pulseTimer * 8) * 3
    : MINE_RADIUS;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(e.x, e.y, pulse, 0, Math.PI * 2);
  ctx.fill();
}
