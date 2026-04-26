import {
  REACTOR_CORE_R, REACTOR_HP, REACTOR_ORBIT_R, REACTOR_EXPLODE_TIME,
  REACTOR_SHAKE_HIT, REACTOR_SHAKE_EXPLODE, REACTOR_ELECTRON_R, SCORE_REACTOR,
  SHIP_RADIUS, REACTOR_CONTACT_DAMAGE,
} from './constants.js';
import { particles, spawnImpactParticles } from './particles.js';
import { projectiles } from './projectiles.js';
import { addScore } from './score.js';
import { ship } from './ship.js';
import { resources } from './resources.js';
import { playReactorHit, playReactorExplode } from './sound.js';

// Drei elliptische Orbitebenen wie beim klassischen Atom-Symbol
const ORBIT_TILTS = [0, Math.PI / 3, -Math.PI / 3];
const ORBIT_SPEEDS = [5.0, 3.5, 2.2];
const ORBIT_COUNTS = [2, 3, 2];
const ORBIT_FLATTEN = 0.32; // Ellipsen-Stauchung

export let screenShake = 0;

export function spawnReactor(room) {
  const electrons = [];
  ORBIT_TILTS.forEach((tilt, oi) => {
    const count = ORBIT_COUNTS[oi];
    for (let i = 0; i < count; i++) {
      electrons.push({
        tilt,
        speed: ORBIT_SPEEDS[oi] * 2,
        angle: (Math.PI * 2 * i) / count + oi * 0.9,
      });
    }
  });

  room.reactor = {
    x: room.width / 2,
    y: room.height / 2,
    hp: REACTOR_HP,
    state: 'intact',
    electrons,
    explodeTimer: 0,
    hitFlash: 0,
  };
}

function electronPos(reactor, e) {
  const lx = Math.cos(e.angle) * REACTOR_ORBIT_R;
  const ly = Math.sin(e.angle) * REACTOR_ORBIT_R * ORBIT_FLATTEN;
  return {
    x: reactor.x + lx * Math.cos(e.tilt) - ly * Math.sin(e.tilt),
    y: reactor.y + lx * Math.sin(e.tilt) + ly * Math.cos(e.tilt),
  };
}

export function updateReactor(room, dt) {
  const r = room.reactor;
  if (!r) return;

  if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 18);
  if (r.hitFlash > 0) r.hitFlash = Math.max(0, r.hitFlash - dt * 6);

  if (r.state === 'exploding') {
    r.explodeTimer -= dt;
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 320;
      const spread = (Math.random() - 0.5) * 60;
      particles.push({
        x: r.x + (Math.random() - 0.5) * 50,
        y: r.y + (Math.random() - 0.5) * 50,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.9, maxLife: 0.9,
      });
    }
    return;
  }

  for (const e of r.electrons) e.angle += e.speed * dt;

  // Kontakt-Schaden (umgeht Shield + Unverwundbarkeit)
  const contactDist = REACTOR_CORE_R + SHIP_RADIUS;
  const sdx = ship.x - r.x, sdy = ship.y - r.y;
  if (sdx * sdx + sdy * sdy < contactDist * contactDist) {
    resources.energy = Math.max(0, resources.energy - REACTOR_CONTACT_DAMAGE * dt);
  }

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const dx = p.x - r.x, dy = p.y - r.y;
    if (dx * dx + dy * dy < REACTOR_CORE_R * REACTOR_CORE_R) {
      projectiles.splice(i, 1);
      spawnImpactParticles(r.x, r.y);
      r.hp--;
      r.hitFlash = 1.0;
      screenShake = REACTOR_SHAKE_HIT;

      playReactorHit();
      if (r.hp <= 0) {
        playReactorExplode();
        r.state = 'exploding';
        r.explodeTimer = REACTOR_EXPLODE_TIME;
        screenShake = REACTOR_SHAKE_EXPLODE;
        addScore(SCORE_REACTOR);
        for (let j = 0; j < 250; j++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 60 + Math.random() * 500;
          particles.push({
            x: r.x, y: r.y,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            life: 1.4, maxLife: 1.4,
          });
        }
      }
    }
  }
}

export function isReactorDestroyed(room) {
  return room.reactor?.state === 'exploding' && room.reactor.explodeTimer <= 0;
}

export function drawReactor(ctx, room) {
  const r = room.reactor;
  if (!r) return;

  if (r.state === 'exploding') {
    if (r.explodeTimer <= 0) return;
    const progress = 1 - r.explodeTimer / REACTOR_EXPLODE_TIME;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress * 1.4);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r.x, r.y, REACTOR_CORE_R * (1 + progress * 4), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Orbitale (elliptisch, 3 Ebenen)
  ctx.lineWidth = 1;
  ORBIT_TILTS.forEach(tilt => {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(tilt);
    ctx.scale(1, ORBIT_FLATTEN);
    ctx.beginPath();
    ctx.arc(0, 0, REACTOR_ORBIT_R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.stroke();
    ctx.restore();
  });

  // Elektronen
  ctx.fillStyle = '#ffffff';
  for (const e of r.electrons) {
    const { x, y } = electronPos(r, e);
    ctx.beginPath();
    ctx.arc(x, y, REACTOR_ELECTRON_R, 0, Math.PI * 2);
    ctx.fill();
  }

  // Kern – dunkle Basis
  ctx.beginPath();
  ctx.arc(r.x, r.y, REACTOR_CORE_R, 0, Math.PI * 2);
  ctx.fillStyle = '#660000';
  ctx.fill();

  // Kern – heller Overlay nach oben-links (Kugeleffekt)
  ctx.save();
  ctx.beginPath();
  ctx.arc(r.x, r.y, REACTOR_CORE_R, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(r.x - REACTOR_CORE_R * 0.35, r.y - REACTOR_CORE_R * 0.35, REACTOR_CORE_R, 0, Math.PI * 2);
  ctx.fillStyle = r.hitFlash > 0
    ? `rgba(255, ${Math.round(r.hitFlash * 80)}, 0, 1)`
    : '#cc0000';
  ctx.fill();
  ctx.restore();

  // Treffer-Flash Overlay
  if (r.hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = r.hitFlash * 0.35;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r.x, r.y, REACTOR_CORE_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
