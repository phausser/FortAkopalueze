import { CANVAS_HEIGHT, SHIP_RADIUS, RESTITUTION, COLLISION_DAMAGE, INVINCIBLE_TIME, ENERGY_DRAIN } from './constants.js';
import { resources, resetResources } from './resources.js';
import { playHit, playWallCollision } from './sound.js';

export const ship = {
  x: 0,
  y: 0,
  angle: 0,
  vx: 0,
  vy: 0,
  invincibleTimer: 0,
  fireCooldown: 0,
};

export function resetShip(firstRoom) {
  ship.x = 100;
  ship.y = firstRoom ? firstRoom.entranceY : CANVAS_HEIGHT / 2;
  ship.angle = 0;
  ship.vx = 0;
  ship.vy = 0;
  ship.invincibleTimer = 0;
  ship.fireCooldown = 0;
  resetResources();
}

export function applyDamage(amount) {
  if (ship.invincibleTimer > 0) return;
  playHit();
  if (resources.shield <= 0) {
    resources.energy = 0;
    return;
  }
  resources.shield -= amount;
  if (resources.shield < 0) resources.shield = 0;
  ship.invincibleTimer = INVINCIBLE_TIME;
}

export function applyCollisionDamage() { playWallCollision(); applyDamage(COLLISION_DAMAGE); }

function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.0001) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return { x: ax + t * dx, y: ay + t * dy };
}

function resolveVsSegment(ax, ay, bx, by) {
  const cp = closestPointOnSegment(ship.x, ship.y, ax, ay, bx, by);
  const dx = ship.x - cp.x;
  const dy = ship.y - cp.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= SHIP_RADIUS || dist < 0.0001) return false;

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = SHIP_RADIUS - dist;
  ship.x += nx * overlap;
  ship.y += ny * overlap;

  const vDotN = ship.vx * nx + ship.vy * ny;
  if (vDotN < 0) {
    ship.vx -= (1 + RESTITUTION) * vDotN * nx;
    ship.vy -= (1 + RESTITUTION) * vDotN * ny;
  }
  return true;
}

export function resolveCollisions(room) {
  const tEntrTop = room.entranceY - room.tunnelH / 2;
  const tEntrBot = room.entranceY + room.tunnelH / 2;
  const tExitTop = room.exitY - room.tunnelH / 2;
  const tExitBot = room.exitY + room.tunnelH / 2;

  for (let i = 0; i < room.ceilingPoints.length - 1; i++) {
    const a = room.ceilingPoints[i], b = room.ceilingPoints[i + 1];
    if (ship.x + SHIP_RADIUS < a.x || ship.x - SHIP_RADIUS > b.x) continue;
    if (resolveVsSegment(a.x, a.y, b.x, b.y)) applyCollisionDamage();
  }

  for (let i = 0; i < room.floorPoints.length - 1; i++) {
    const a = room.floorPoints[i], b = room.floorPoints[i + 1];
    if (ship.x + SHIP_RADIUS < a.x || ship.x - SHIP_RADIUS > b.x) continue;
    if (resolveVsSegment(a.x, a.y, b.x, b.y)) applyCollisionDamage();
  }

  if (ship.x - SHIP_RADIUS < 0) {
    if (resolveVsSegment(0, 0, 0, tEntrTop)) applyCollisionDamage();
    if (resolveVsSegment(0, tEntrBot, 0, room.height)) applyCollisionDamage();
  }

  if (ship.x + SHIP_RADIUS > room.width) {
    if (resolveVsSegment(room.width, 0, room.width, tExitTop)) applyCollisionDamage();
    if (resolveVsSegment(room.width, tExitBot, room.width, room.height)) applyCollisionDamage();
  }

  for (const obs of room.obstacles) {
    const tipY = obs.kind === 'stalactite' ? obs.baseY + obs.len : obs.baseY - obs.len;
    if (resolveVsSegment(obs.x - obs.w / 2, obs.baseY, obs.x, tipY)) applyCollisionDamage();
    if (resolveVsSegment(obs.x + obs.w / 2, obs.baseY, obs.x, tipY)) applyCollisionDamage();
  }
}

export function drawShip(ctx) {
  if (ship.invincibleTimer > 0 && Math.floor(ship.invincibleTimer / 0.08) % 2 === 0) return;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-11, 13);
  ctx.lineTo(-11, -13);
  ctx.closePath();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'miter';
  ctx.stroke();

  ctx.restore();
}
