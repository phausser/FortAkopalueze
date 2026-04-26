import { interpolateWall, lerp, makePRNG } from './level.js';
import { ship } from './ship.js';
import { addScore } from './score.js';
import { spawnImpactParticles } from './particles.js';

const COLLECT_DIST = 35;
const HEAD_R = 5;
const BODY_W = 14;
const BODY_H = Math.round(BODY_W * Math.sqrt(3) / 2);

export function spawnSurvivorsForLevel(rooms, seed, count) {
  for (const room of rooms) room.survivors = [];
  const rng = makePRNG(seed ^ 0xFACE);
  const eligible = rooms.slice(0, -1);
  if (eligible.length === 0) return;

  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const room = eligible[Math.floor(rng() * eligible.length)];
      const x = room.width * lerp(0.1, 0.9, rng());
      const floorY = interpolateWall(room.floorPoints, x);
      const ceilY = interpolateWall(room.ceilingPoints, x);
      if (floorY - ceilY < HEAD_R * 2 + BODY_H + 40) continue;
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
      addScore(500);
      spawnImpactParticles(s.x, s.floorY);
      room.survivors.splice(i, 1);
    }
  }
}

export function drawSurvivors(ctx, room) {
  if (!room.survivors) return;
  const t = performance.now() / 1000;
  ctx.fillStyle = '#ffffff';
  for (const s of room.survivors) {
    const { x, floorY } = s;
    const tipY    = floorY - 2;
    const bodyTopY = tipY - BODY_H;
    const headCY  = bodyTopY - HEAD_R - 1;

    // Body: inverted triangle
    ctx.beginPath();
    ctx.moveTo(x - BODY_W / 2, bodyTopY);
    ctx.lineTo(x + BODY_W / 2, bodyTopY);
    ctx.lineTo(x, tipY);
    ctx.closePath();
    ctx.fill();

    // Head: circle
    ctx.beginPath();
    ctx.arc(x, headCY, HEAD_R, 0, Math.PI * 2);
    ctx.fill();

    // Waving hand: 60° arc around left shoulder; top end ~3px from head
    const shoulderX = x - BODY_W / 2;
    const shoulderY = bodyTopY;
    const armLen = 9;
    const angle = -Math.PI * 2 / 3 + Math.sin(t * 8 + s.x) * (Math.PI / 6);
    const handX = shoulderX + Math.cos(angle) * armLen;
    const handY = shoulderY + Math.sin(angle) * armLen;
    ctx.fillRect(handX - 1, handY - 1, 3, 3);
  }
}
