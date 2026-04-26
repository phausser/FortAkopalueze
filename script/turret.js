import {
  TURRET_HP, TURRET_FIRE_RATE, TURRET_ROT_SPEED, TURRET_RANGE,
  TURRET_BODY_R, TURRET_BARREL_L,
} from './constants.js';
import { ship } from './ship.js';
import { interpolateWall, lerp } from './level.js';
import { spawnMissile } from './missiles.js';
import { hasLineOfSight, wrapAngle } from './geometry.js';

export function spawnTurret(room, rng) {
  const x = room.width * lerp(0.15, 0.85, rng());
  const onFloor = rng() < 0.5;
  const wallY = onFloor
    ? interpolateWall(room.floorPoints, x)
    : interpolateWall(room.ceilingPoints, x);
  return {
    kind: 'turret',
    x,
    y: wallY,
    mount: onFloor ? 'floor' : 'ceiling',
    angle: onFloor ? -Math.PI / 2 : Math.PI / 2,
    hp: TURRET_HP,
    state: 'idle',
    fireCooldown: rng() * TURRET_FIRE_RATE,
    dyingTimer: 0,
  };
}

export function updateTurret(e, room, dt) {
  const dx = ship.x - e.x;
  const dy = ship.y - e.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > TURRET_RANGE) { e.state = 'idle'; return; }
  e.state = 'tracking';

  const diff = wrapAngle(Math.atan2(dy, dx) - e.angle);
  const step = TURRET_ROT_SPEED * dt;
  e.angle += Math.abs(diff) < step ? diff : Math.sign(diff) * step;

  if (e.mount === 'floor') e.angle = Math.max(-Math.PI, Math.min(0, e.angle));
  if (e.mount === 'ceiling') e.angle = Math.max(0, Math.min(Math.PI, e.angle));

  e.fireCooldown -= dt;
  if (e.fireCooldown <= 0) {
    e.fireCooldown = TURRET_FIRE_RATE;
    const apexY = e.y + (e.mount === 'floor' ? -TURRET_BODY_R : TURRET_BODY_R);
    const tipX = e.x + Math.cos(e.angle) * TURRET_BARREL_L;
    const tipY = apexY + Math.sin(e.angle) * TURRET_BARREL_L;
    if (hasLineOfSight(room, tipX, tipY, ship.x, ship.y)) {
      spawnMissile(tipX, tipY);
    }
  }
}

export function drawTurret(ctx, e) {
  const { x, y } = e;
  const apexOffset = e.mount === 'floor' ? -TURRET_BODY_R + 1 : TURRET_BODY_R - 1;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  if (e.mount === 'floor') {
    ctx.arc(x, y, TURRET_BODY_R, Math.PI, 0);
  } else {
    ctx.arc(x, y, TURRET_BODY_R, 0, Math.PI);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + apexOffset);
  ctx.lineTo(x + Math.cos(e.angle) * TURRET_BARREL_L, y + apexOffset + Math.sin(e.angle) * TURRET_BARREL_L);
  ctx.stroke();
}
