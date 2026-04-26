import { CANVAS_WIDTH, CANVAS_HEIGHT, SHIP_RADIUS, SHIP_THRUST, SHIP_STRAFE, SHIP_ROTATION_SPEED, SHIP_DAMPING, ENERGY_DRAIN, State } from './constants.js';
import { input } from './input.js';
import { resources } from './resources.js';
import { particles, updateParticles, drawParticles } from './particles.js';
import { generateLevel } from './level.js';
import { spawnEnemiesForRoom } from './enemies.js';
import { spawnLasersForRoom, updateLasers, drawLasersForRoom } from './laser.js';
import { ship, resetShip, resolveCollisions, drawShip } from './ship.js';
import { missiles, updateMissiles, drawMissiles } from './missiles.js';
import { enemyProjectiles, updateEnemies, updateEnemyProjectiles, drawEnemies, drawEnemyProjectiles } from './enemies.js';
import { projectiles, shoot, updateProjectiles, drawProjectiles } from './projectiles.js';
import { spawnPickupsForRoom, updatePickups, drawPickups } from './pickups.js';
import { spawnReactor, updateReactor, drawReactor, isReactorDestroyed, screenShake } from './reactor.js';
import { score, resetScore } from './score.js';

// ─── Spielstand ───────────────────────────────────────────────────────────────

const game = {
  state: State.MENU,
  previousTime: 0,
  rooms: [],
  currentRoomIndex: 0,
  camX: 0,
  camY: 0,
  seed: 0,

  setState(newState) { this.state = newState; },
};

// ─── Update-Logik pro Zustand ─────────────────────────────────────────────────

function updateMenu() {
  if (input.isJustPressed('Enter') || input.isJustPressed('Space')) {
    game.seed = Date.now();
    game.rooms = generateLevel(game.seed, (room, rng) => {
      spawnEnemiesForRoom(room, rng);
      spawnLasersForRoom(room, rng);
      spawnPickupsForRoom(room, rng);
    });
    game.rooms.at(-1).pickups = [];
    spawnReactor(game.rooms[0]);
    game.currentRoomIndex = 0;
    game.camX = 0;
    game.camY = 0;
    projectiles.length = 0;
    particles.length = 0;
    enemyProjectiles.length = 0;
    missiles.length = 0;
    resetShip(game.rooms[0]);
    resetScore();
    game.setState(State.PLAYING);
  }
}

function handleRoomTransition(room) {
  if (!room) return;
  if (ship.x - SHIP_RADIUS > room.width) {
    const next = game.currentRoomIndex + 1;
    if (next < game.rooms.length) {
      game.currentRoomIndex = next;
      ship.x = SHIP_RADIUS + 1;
      ship.y = game.rooms[next].entranceY;
      game.camX = 0;
      game.camY = 0;
      enemyProjectiles.length = 0;
      missiles.length = 0;
    }
  } else if (ship.x + SHIP_RADIUS < 0) {
    const prev = game.currentRoomIndex - 1;
    if (prev >= 0) {
      game.currentRoomIndex = prev;
      const prevRoom = game.rooms[prev];
      ship.x = prevRoom.width - SHIP_RADIUS - 1;
      ship.y = prevRoom.exitY;
      game.camX = Math.max(0, prevRoom.width - CANVAS_WIDTH);
      game.camY = 0;
      enemyProjectiles.length = 0;
      missiles.length = 0;
    }
  }
}

function updatePlaying(dt) {
  const shift = input.isHeld('ShiftLeft') || input.isHeld('ShiftRight');
  if (!shift && input.isHeld('ArrowLeft')) ship.angle -= SHIP_ROTATION_SPEED * dt;
  if (!shift && input.isHeld('ArrowRight')) ship.angle += SHIP_ROTATION_SPEED * dt;
  if (shift && input.isHeld('ArrowLeft')) {
    ship.vx += Math.sin(ship.angle) * SHIP_STRAFE * dt;
    ship.vy -= Math.cos(ship.angle) * SHIP_STRAFE * dt;
  }
  if (shift && input.isHeld('ArrowRight')) {
    ship.vx -= Math.sin(ship.angle) * SHIP_STRAFE * dt;
    ship.vy += Math.cos(ship.angle) * SHIP_STRAFE * dt;
  }

  if (input.isHeld('ArrowUp')) {
    ship.vx += Math.cos(ship.angle) * SHIP_THRUST * dt;
    ship.vy += Math.sin(ship.angle) * SHIP_THRUST * dt;
    resources.energy = Math.max(0, resources.energy - ENERGY_DRAIN * dt);
  }
  if (input.isHeld('ArrowDown')) {
    ship.vx -= Math.cos(ship.angle) * SHIP_THRUST * dt;
    ship.vy -= Math.sin(ship.angle) * SHIP_THRUST * dt;
    resources.energy = Math.max(0, resources.energy - ENERGY_DRAIN * dt);
  }

  const d = Math.pow(SHIP_DAMPING, dt * 60);
  ship.vx *= d;
  ship.vy *= d;
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  if (ship.invincibleTimer > 0) ship.invincibleTimer -= dt;
  if (ship.fireCooldown > 0) ship.fireCooldown -= dt;

  if (input.isHeld('Space')) shoot();

  const room = game.rooms[game.currentRoomIndex];
  if (room) {
    resolveCollisions(room);
    updateEnemies(room, dt);
    updateProjectiles(room, dt);
    updateEnemyProjectiles(room, dt);
    updateMissiles(room, dt);
    updateLasers(room, dt);
    updatePickups(room, dt);
    updateReactor(room, dt);
  }
  updateParticles(dt);
  handleRoomTransition(room);

  // Kamera
  if (room) {
    game.camX = Math.max(0, Math.min(ship.x - CANVAS_WIDTH / 2, Math.max(0, room.width - CANVAS_WIDTH)));
    game.camY = Math.max(0, Math.min(ship.y - CANVAS_HEIGHT / 2, Math.max(0, room.height - CANVAS_HEIGHT)));
  }

  if (resources.energy <= 0) { game.setState(State.DEAD); return; }

  if (isReactorDestroyed(game.rooms[0])) { game.setState(State.WIN); return; }

  if (input.isJustPressed('Escape')) game.setState(State.MENU);
}

function updateDead() {
  if (input.isJustPressed('Enter') || input.isJustPressed('Space')) game.setState(State.MENU);
}

function updateEscape() { }

function updateWin() {
  if (input.isJustPressed('Enter') || input.isJustPressed('Space')) game.setState(State.MENU);
}

const stateUpdaters = {
  [State.MENU]: updateMenu,
  [State.PLAYING]: updatePlaying,
  [State.DEAD]: updateDead,
  [State.ESCAPE]: updateEscape,
  [State.WIN]: updateWin,
};

// ─── Render-Hilfsfunktionen ───────────────────────────────────────────────────

function drawRoom(ctx, room) {
  ctx.fillStyle = '#000000';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 5;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(room.width, 0);
  for (let i = room.ceilingPoints.length - 1; i >= 0; i--) {
    ctx.lineTo(room.ceilingPoints[i].x, room.ceilingPoints[i].y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, room.height);
  ctx.lineTo(room.width, room.height);
  for (let i = room.floorPoints.length - 1; i >= 0; i--) {
    ctx.lineTo(room.floorPoints[i].x, room.floorPoints[i].y);
  }
  ctx.closePath();
  ctx.fill();

  for (const obs of room.obstacles) {
    ctx.beginPath();
    if (obs.kind === 'stalactite') {
      ctx.moveTo(obs.x - obs.w / 2, obs.baseY);
      ctx.lineTo(obs.x + obs.w / 2, obs.baseY);
      ctx.lineTo(obs.x, obs.baseY + obs.len);
    } else {
      ctx.moveTo(obs.x - obs.w / 2, obs.baseY);
      ctx.lineTo(obs.x + obs.w / 2, obs.baseY);
      ctx.lineTo(obs.x, obs.baseY - obs.len);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function drawHUD(ctx) {
  const BAR_W = 50;
  const BAR_H = 5;
  const GAP = 3;
  const MARGIN = 8;

  const bars = [
    { value: resources.energy, color: '#4488ff' },
    { value: resources.shield, color: '#44ff88' },
    { value: resources.ammo, color: '#ffdd44' },
  ];

  bars.forEach((bar, i) => {
    const x = MARGIN;
    const y = MARGIN + i * (BAR_H + GAP);
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, BAR_W, BAR_H);
    ctx.fillStyle = bar.color;
    ctx.fillRect(x, y, Math.round(BAR_W * Math.max(0, bar.value)), BAR_H);
  });

  const totalBarsH = bars.length * BAR_H + (bars.length - 1) * GAP;
  const scoreY = MARGIN + totalBarsH / 2;
  ctx.font = '11px "Michroma", monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(score.value).padStart(6, '0'), CANVAS_WIDTH - MARGIN, scoreY + 4);
}

// ─── Render-Logik pro Zustand ─────────────────────────────────────────────────

function renderMenu(ctx) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px "Michroma", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FORT AKOPALUEZE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
  ctx.font = '16px "Michroma", sans-serif';
  ctx.fillText('ENTER oder LEERTASTE zum Starten', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
}

function renderPlaying(ctx) {
  const room = game.rooms[game.currentRoomIndex];
  if (!room) return;

  ctx.fillStyle = room.bgColor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
  const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;

  ctx.save();
  ctx.translate(-game.camX + shakeX, -game.camY + shakeY);
  drawRoom(ctx, room);
  drawReactor(ctx, room);
  drawPickups(ctx, room);
  drawEnemies(ctx, room);
  drawLasersForRoom(ctx, room);
  drawEnemyProjectiles(ctx);
  drawMissiles(ctx);
  drawProjectiles(ctx);
  drawParticles(ctx);
  drawShip(ctx);
  ctx.restore();

  drawHUD(ctx);
}

function renderDead(ctx) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px "Michroma", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
  ctx.font = '18px "Michroma", sans-serif';
  ctx.fillText('ENTER zum Neustart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
}

function renderWin(ctx) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px "Michroma", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('REAKTOR VERNICHTET', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
  ctx.font = '18px "Michroma", sans-serif';
  ctx.fillText('ENTER zum Neustart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
}

const stateRenderers = {
  [State.MENU]: renderMenu,
  [State.PLAYING]: renderPlaying,
  [State.DEAD]: renderDead,
  [State.ESCAPE]: renderPlaying,
  [State.WIN]: renderWin,
};

// ─── Game Loop ────────────────────────────────────────────────────────────────

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

function loop(timestamp) {
  const deltaTime = (timestamp - game.previousTime) / 1000;
  game.previousTime = timestamp;
  const clampedDelta = Math.min(deltaTime, 0.1);

  stateUpdaters[game.state]?.(clampedDelta);
  stateRenderers[game.state]?.(ctx);

  input.clearFrameState();
  requestAnimationFrame(loop);
}

requestAnimationFrame((timestamp) => {
  game.previousTime = timestamp;
  loop(timestamp);
});
