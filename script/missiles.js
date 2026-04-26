import {
  SHIP_RADIUS,
  MISSILE_SPEED, MISSILE_TURN_SPEED, MISSILE_SPLASH_RADIUS,
  MISSILE_SPLASH_DAMAGE, MISSILE_EXPLODE_TIME, MISSILE_TRAIL_INTERVAL,
} from './constants.js';
import { ship, applyDamage } from './ship.js';
import { particles, spawnImpactParticles } from './particles.js';
import { interpolateWall } from './level.js';
import { wrapAngle } from './geometry.js';

export const missiles = [];

export function spawnMissile(x, y) {
  const angle = Math.atan2(ship.y - y, ship.x - x);
  missiles.push({
    x, y,
    angle,
    vx: Math.cos(angle) * MISSILE_SPEED,
    vy: Math.sin(angle) * MISSILE_SPEED,
    state: 'homing',
    explodeTimer: 0,
    trailTimer: 0,
    lifeTimer: 5,
  });
}

export function updateMissiles(room, dt) {
  for (let i = missiles.length - 1; i >= 0; i--) {
    const m = missiles[i];

    if (m.state === 'exploding') {
      m.explodeTimer -= dt;
      if (m.explodeTimer <= 0) missiles.splice(i, 1);
      continue;
    }

    // Trail-Partikel
    m.trailTimer -= dt;
    if (m.trailTimer <= 0) {
      m.trailTimer = MISSILE_TRAIL_INTERVAL;
      for (let t = 0; t < 3; t++) {
        const spread = (Math.random() - 0.5) * 0.6;
        const trailAngle = m.angle + Math.PI + spread;
        particles.push({
          x: m.x, y: m.y,
          vx: Math.cos(trailAngle) * 60 * Math.random(),
          vy: Math.sin(trailAngle) * 60 * Math.random(),
          life: 0.3,
          maxLife: 0.3,
        });
      }
    }

    // Kurskorrektur
    const diff = wrapAngle(Math.atan2(ship.y - m.y, ship.x - m.x) - m.angle);
    const step = MISSILE_TURN_SPEED * dt * 60;
    m.angle += Math.abs(diff) < step ? diff : Math.sign(diff) * step;
    m.vx = Math.cos(m.angle) * MISSILE_SPEED;
    m.vy = Math.sin(m.angle) * MISSILE_SPEED;

    m.x += m.vx * dt;
    m.y += m.vy * dt;

    m.lifeTimer -= dt;
    let explode = m.lifeTimer <= 0;
    if (m.x < 0 || m.x > room.width) {
      explode = true;
    } else {
      const cy = interpolateWall(room.ceilingPoints, m.x);
      const fy = interpolateWall(room.floorPoints, m.x);
      if (m.y < cy || m.y > fy) explode = true;
    }

    const dx = m.x - ship.x, dy = m.y - ship.y;
    if (dx * dx + dy * dy < (SHIP_RADIUS + 6) * (SHIP_RADIUS + 6)) explode = true;

    if (explode) {
      spawnImpactParticles(m.x, m.y);
      for (let j = 0; j < 20; j++) {
        const a = Math.random() * Math.PI * 2;
        particles.push({ x: m.x, y: m.y, vx: Math.cos(a) * 180 * Math.random(), vy: Math.sin(a) * 180 * Math.random(), life: 0.5, maxLife: 0.5 });
      }
      const sdx = m.x - ship.x, sdy = m.y - ship.y;
      if (sdx * sdx + sdy * sdy < MISSILE_SPLASH_RADIUS * MISSILE_SPLASH_RADIUS) {
        applyDamage(MISSILE_SPLASH_DAMAGE);
      }
      m.state = 'exploding';
      m.explodeTimer = MISSILE_EXPLODE_TIME;
    }
  }
}

export function drawMissiles(ctx) {
  for (const m of missiles) {
    if (m.state === 'exploding') continue;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-2, 4);
    ctx.lineTo(-2, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
