import { PICKUP_RADIUS, PICKUP_COLLECT_DIST, PICKUP_AMOUNT } from './constants.js';
import { resources } from './resources.js';
import { ship } from './ship.js';
import { spawnImpactParticles } from './particles.js';
import { interpolateWall, lerp } from './level.js';

const KINDS = ['energy', 'shield', 'ammo'];

const COLORS = {
  energy: { base: '#4488ff', shadow: '#1144aa' },
  shield: { base: '#44ff88', shadow: '#11aa44' },
  ammo: { base: '#ffdd44', shadow: '#aa8811' },
};

export function spawnPickupsForRoom(room, rng) {
  room.pickups = [];
  const count = Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const x = room.width * lerp(0.15, 0.85, rng());
      const ceilY = interpolateWall(room.ceilingPoints, x);
      const floorY = interpolateWall(room.floorPoints, x);
      const margin = PICKUP_RADIUS + 20;
      if (floorY - ceilY < margin * 2 + 20) continue;
      const y = ceilY + margin + rng() * (floorY - ceilY - margin * 2);
      room.pickups.push({ x, y, kind: KINDS[Math.floor(rng() * 3)] });
      break;
    }
  }
}

export function updatePickups(room, dt) {
  for (let i = room.pickups.length - 1; i >= 0; i--) {
    const p = room.pickups[i];
    const dx = ship.x - p.x;
    const dy = ship.y - p.y;
    if (dx * dx + dy * dy < PICKUP_COLLECT_DIST * PICKUP_COLLECT_DIST) {
      resources[p.kind] = Math.min(1.0, resources[p.kind] + PICKUP_AMOUNT);
      spawnImpactParticles(p.x, p.y);
      room.pickups.splice(i, 1);
    }
  }
}

export function drawPickups(ctx, room) {
  for (const p of room.pickups) {
    const { base, shadow } = COLORS[p.kind];
    const { x, y } = p;

    // Schattenfarbe als Basis
    ctx.beginPath();
    ctx.arc(x, y, PICKUP_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = shadow;
    ctx.fill();

    // Heller Kreis nach oben-links versetzt (geclippt) — lässt Banane unten-rechts stehen
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, PICKUP_RADIUS, 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(x - PICKUP_RADIUS * 0.35, y - PICKUP_RADIUS * 0.35,
      PICKUP_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = base;
    ctx.fill();
    ctx.restore();
  }
}
