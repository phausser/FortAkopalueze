import { interpolateWall, lerp, makePRNG, getExitClearZones, overlapsExitZonesX, overlapsRoomObjects } from './level.js';
import { ship } from './ship.js';
import { spawnImpactParticles } from './particles.js';
import { playRescue } from './sound.js';
import { MIN_OBJECT_DIST } from './constants.js';

const COLLECT_DIST = 35;
const HEAD_R = 5;
const BODY_W = 14;
const BODY_H = Math.round(BODY_W * Math.sqrt(3) / 2);

// Score für gerettete Überlebende wird nicht sofort vergeben, sondern erst als
// animierte Bonus-Tally auf dem Win-Screen (siehe game.js) — hier wird nur
// gezählt, wie viele in diesem Level gerettet wurden.
export const survivorState = { rescuedCount: 0 };

export function resetRescuedCount() { survivorState.rescuedCount = 0; }

export function spawnSurvivorsForLevel(rooms, seed, count) {
  for (const room of rooms) room.survivors = [];
  const rng = makePRNG(seed ^ 0xFACE);
  const eligible = rooms.filter(r => r.type !== 'reactor');
  if (eligible.length === 0) return;

  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const room = eligible[Math.floor(rng() * eligible.length)];
      const x = room.width * lerp(0.1, 0.9, rng());
      const zones = getExitClearZones(room.exits, room.width, room.height);
      if (overlapsExitZonesX(zones, x, BODY_W)) continue;
      const floorY = interpolateWall(room.floorPoints, x);
      const ceilY = interpolateWall(room.ceilingPoints, x);
      if (floorY - ceilY < HEAD_R * 2 + BODY_H + 40) continue;
      if (overlapsRoomObjects(room, x, floorY, MIN_OBJECT_DIST)) continue;
      room.survivors.push({ x, floorY });
      break;
    }
  }
}

export function updateSurvivors(room) {
  if (!room.survivors) return;
  for (let i = room.survivors.length - 1; i >= 0; i--) {
    const s = room.survivors[i];
    const dx = ship.x - s.x;
    const dy = ship.y - s.floorY;
    if (dx * dx + dy * dy < COLLECT_DIST * COLLECT_DIST) {
      survivorState.rescuedCount++;
      spawnImpactParticles(s.x, s.floorY);
      playRescue();
      room.survivors.splice(i, 1);
    }
  }
}

// Wiederverwendbares Sprite: Körper (invertiertes Dreieck) + Kopf (Kreis) +
// winkender Arm. `floorY` ist die Standfläche, `scale` erlaubt eine größere
// Darstellung außerhalb des Spiels (z.B. auf dem Win-Screen).
export function drawSurvivorIcon(ctx, x, floorY, t, scale = 1) {
  const tipY = floorY - 2 * scale;
  const bodyTopY = tipY - BODY_H * scale;
  const headCY = bodyTopY - HEAD_R * scale - 1 * scale;

  ctx.beginPath();
  ctx.moveTo(x - BODY_W * scale / 2, bodyTopY);
  ctx.lineTo(x + BODY_W * scale / 2, bodyTopY);
  ctx.lineTo(x, tipY);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, headCY, HEAD_R * scale, 0, Math.PI * 2);
  ctx.fill();

  const shoulderX = x - BODY_W * scale / 2;
  const shoulderY = bodyTopY;
  const armLen = 9 * scale;
  const angle = -Math.PI * 2 / 3 + Math.sin(t * 8 + x) * (Math.PI / 6);
  const handX = shoulderX + Math.cos(angle) * armLen;
  const handY = shoulderY + Math.sin(angle) * armLen;
  ctx.fillRect(handX - 1.5 * scale, handY - 1.5 * scale, 3 * scale, 3 * scale);
}

export function drawSurvivors(ctx, room) {
  if (!room.survivors) return;
  const t = performance.now() / 1000;
  ctx.fillStyle = '#ffffff';
  for (const s of room.survivors) {
    drawSurvivorIcon(ctx, s.x, s.floorY, t);
  }
}
