import { CANVAS_WIDTH, CANVAS_HEIGHT, SHIP_RADIUS, SHIP_THRUST, SHIP_STRAFE, SHIP_ROTATION_SPEED, SHIP_DAMPING, ENERGY_DRAIN, State, BEAM_IN_DURATION, ESCAPE_TIME } from './constants.js';
import { input } from './input.js';
import { resources, resetResources } from './resources.js';
import { particles, updateParticles, drawParticles } from './particles.js';
import { generateLevel } from './level.js';
import { spawnEnemiesForRoom } from './enemies.js';
import { spawnLasersForRoom, updateLasers, drawLasersForRoom } from './laser.js';
import { ship, resetShip, resolveCollisions, drawShip } from './ship.js';
import { missiles, updateMissiles, drawMissiles } from './missiles.js';
import { enemyProjectiles, updateEnemies, updateEnemyProjectiles, drawEnemies, drawEnemyProjectiles } from './enemies.js';
import { projectiles, shoot, updateProjectiles, drawProjectiles } from './projectiles.js';
import { spawnPickupsForRoom, updatePickups, drawPickups } from './pickups.js';
import { spawnSurvivorsForLevel, updateSurvivors, drawSurvivors } from './survivors.js';
import { spawnReactor, updateReactor, drawReactor, isReactorDestroyed, screenShake } from './reactor.js';
import { score, resetScore } from './score.js';
import { startThrust, stopThrust, stopAllLoops, playDeath, playGameOver, playWin, startMusic } from './sound.js';

// ─── Spielstand ───────────────────────────────────────────────────────────────

const game = {
  state: State.MENU,
  previousTime: 0,
  rooms: [],
  currentRoomIndex: 0,
  camX: 0,
  camY: 0,
  seed: 0,
  level: 1,
  levelIntroTimer: 0,

  setState(newState) { this.state = newState; },
};

let thrustTrailTimer = 0;
let beamInTimer = 0;
let escapeTimer = -1;

// ─── Level-Initialisierung ────────────────────────────────────────────────────

function initLevel(level) {
  game.seed = Date.now();
  game.rooms = generateLevel(game.seed, (room, rng) => {
    spawnEnemiesForRoom(room, rng);
    spawnLasersForRoom(room, rng);
    spawnPickupsForRoom(room, rng);
  }, level + 1);
  game.rooms.at(-1).pickups = [];
  spawnReactor(game.rooms.at(-1));
  spawnSurvivorsForLevel(game.rooms, game.seed, level);
  game.currentRoomIndex = 0;
  game.camX = 0;
  game.camY = 0;
  projectiles.length = 0;
  particles.length = 0;
  enemyProjectiles.length = 0;
  missiles.length = 0;
  resetShip(game.rooms[0]);
  resetResources();
  escapeTimer = -1;
  startMusic();
}

// ─── Update-Logik pro Zustand ─────────────────────────────────────────────────

function updateMenu() {
  if (input.isJustPressed('Enter') || input.isJustPressed('Space')) {
    game.level = 1;
    resetScore();
    initLevel(game.level);
    game.levelIntroTimer = 2.5;
    game.setState(State.LEVEL_INTRO);
  }
}

function updateLevelIntro(dt) {
  game.levelIntroTimer -= dt;
  if (game.levelIntroTimer <= 0 || input.isJustPressed('Enter') || input.isJustPressed('Space')) {
    beamInTimer = BEAM_IN_DURATION;
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

function spawnBeamParticle() {
  const hue = 170 + Math.random() * 40;
  particles.push({
    x: ship.x + (Math.random() - 0.5) * 28,
    y: ship.y + (Math.random() - 0.5) * 44,
    vx: (Math.random() - 0.5) * 50,
    vy: (Math.random() - 0.5) * 50,
    life: 0.15 + Math.random() * 0.35,
    maxLife: 0.5,
    color: `hsl(${hue}, 100%, ${65 + Math.random() * 30}%)`,
  });
}

function updatePlaying(dt) {
  if (beamInTimer > 0) {
    beamInTimer = Math.max(0, beamInTimer - dt);
    for (let i = 0; i < 3; i++) spawnBeamParticle();
  }

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

  const thrusting = input.isHeld('ArrowUp') || input.isHeld('ArrowDown');
  if (thrusting) startThrust(); else stopThrust();

  if (input.isHeld('ArrowUp')) {
    ship.vx += Math.cos(ship.angle) * SHIP_THRUST * dt;
    ship.vy += Math.sin(ship.angle) * SHIP_THRUST * dt;
    resources.energy = Math.max(0, resources.energy - ENERGY_DRAIN * dt);

    thrustTrailTimer -= dt;
    if (thrustTrailTimer <= 0) {
      thrustTrailTimer = 0.04;
      const backX = ship.x - Math.cos(ship.angle) * SHIP_RADIUS;
      const backY = ship.y - Math.sin(ship.angle) * SHIP_RADIUS;
      for (let i = 0; i < 3; i++) {
        const spread = (Math.random() - 0.5) * 0.8;
        const a = ship.angle + Math.PI + spread;
        particles.push({
          x: backX, y: backY,
          vx: Math.cos(a) * (60 + Math.random() * 60),
          vy: Math.sin(a) * (60 + Math.random() * 60),
          life: 0.2, maxLife: 0.2,
        });
      }
    }
  } else {
    thrustTrailTimer = 0;
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

  resources.ammo = Math.min(1, resources.ammo + dt / 120);

  if (input.isHeld('Space')) shoot();

  const room = game.rooms[game.currentRoomIndex];
  if (room) {
    resolveCollisions(room);
    if (game.currentRoomIndex === game.rooms.length - 1 && escapeTimer < 0) {
      const tExitTop = room.exitY - room.tunnelH / 2;
      const tExitBot = room.exitY + room.tunnelH / 2;
      if (ship.y + SHIP_RADIUS > tExitTop && ship.y - SHIP_RADIUS < tExitBot &&
          ship.x + SHIP_RADIUS > room.width - 8) {
        ship.x = room.width - 8 - SHIP_RADIUS;
        if (ship.vx > 0) ship.vx = 0;
      }
    }
    updateEnemies(room, dt);
    updateProjectiles(room, dt);
    updateEnemyProjectiles(room, dt);
    updateMissiles(room, dt);
    updateLasers(room, dt);
    updatePickups(room, dt);
    updateSurvivors(room);
    updateReactor(room, dt);
  }
  updateParticles(dt);
  handleRoomTransition(room);

  // Kamera
  if (room) {
    game.camX = Math.max(0, Math.min(ship.x - CANVAS_WIDTH / 2, Math.max(0, room.width - CANVAS_WIDTH)));
    game.camY = Math.max(0, Math.min(ship.y - CANVAS_HEIGHT / 2, Math.max(0, room.height - CANVAS_HEIGHT)));
  }

  if (resources.energy <= 0) { stopAllLoops(); playDeath(); playGameOver(); game.setState(State.DEAD); return; }

  if (isReactorDestroyed(game.rooms.at(-1))) {
    if (escapeTimer < 0) escapeTimer = ESCAPE_TIME;
    escapeTimer -= dt;
    if (escapeTimer <= 0) { stopAllLoops(); playDeath(); playGameOver(); game.setState(State.DEAD); return; }
    if (game.currentRoomIndex === game.rooms.length - 1 && ship.x - SHIP_RADIUS > game.rooms.at(-1).width) {
      stopAllLoops(); playWin(); game.setState(State.WIN); return;
    }
  }

  if (input.isJustPressed('Escape')) game.setState(State.MENU);
}

function updateDead() {
  if (input.isJustPressed('Enter') || input.isJustPressed('Space')) game.setState(State.MENU);
}

function updateEscape() { }

function updateWin() {
  if (input.isJustPressed('Enter') || input.isJustPressed('Space')) {
    game.level++;
    initLevel(game.level);
    game.levelIntroTimer = 2.5;
    game.setState(State.LEVEL_INTRO);
  }
}

const stateUpdaters = {
  [State.MENU]: updateMenu,
  [State.LEVEL_INTRO]: updateLevelIntro,
  [State.PLAYING]: updatePlaying,
  [State.DEAD]: updateDead,
  [State.ESCAPE]: updateEscape,
  [State.WIN]: updateWin,
};

// ─── Render-Hilfsfunktionen ───────────────────────────────────────────────────

function drawParallaxLayer(ctx, room, inset, color) {
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(room.width, 0);
  for (let i = room.ceilingPoints.length - 1; i >= 0; i--) {
    ctx.lineTo(room.ceilingPoints[i].x, room.ceilingPoints[i].y + inset);
  }
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, room.height);
  ctx.lineTo(room.width, room.height);
  for (let i = room.floorPoints.length - 1; i >= 0; i--) {
    ctx.lineTo(room.floorPoints[i].x, room.floorPoints[i].y - inset);
  }
  ctx.closePath();
  ctx.fill();
}

function drawRoom(ctx, room) {
  ctx.fillStyle = '#000000';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';

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

function drawExitBarrier(ctx, room) {
  const top = room.exitY - room.tunnelH / 2;
  const bot = room.exitY + room.tunnelH / 2;
  const stripeH = 8;
  for (let y = top; y < bot; y += stripeH) {
    const i = Math.floor((y - top) / stripeH);
    ctx.fillStyle = i % 2 === 0 ? '#cc1111' : '#ffffff';
    ctx.fillRect(room.width - 8, y, 8, Math.min(stripeH, bot - y));
  }
}

function renderPlaying(ctx) {
  const room = game.rooms[game.currentRoomIndex];
  if (!room) return;

  ctx.fillStyle = room.bgColor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
  const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;

  ctx.save();
  ctx.filter = 'blur(30px)';
  ctx.translate(-game.camX * 0.3 + shakeX, -game.camY * 0.3 + shakeY);
  drawParallaxLayer(ctx, room, 30, 'rgba(0,0,0,0.35)');
  ctx.restore();

  ctx.save();
  ctx.filter = 'blur(70px)';
  ctx.translate(-game.camX * 0.6 + shakeX, -game.camY * 0.6 + shakeY);
  drawParallaxLayer(ctx, room, 60, 'rgba(0,0,0,0.5)');
  ctx.restore();

  ctx.save();
  ctx.translate(-game.camX + shakeX, -game.camY + shakeY);
  drawRoom(ctx, room);
  if (game.currentRoomIndex === game.rooms.length - 1 && escapeTimer < 0) drawExitBarrier(ctx, room);
  drawReactor(ctx, room);
  drawPickups(ctx, room);
  drawSurvivors(ctx, room);
  drawEnemies(ctx, room);
  drawLasersForRoom(ctx, room);
  drawEnemyProjectiles(ctx);
  drawMissiles(ctx);
  drawProjectiles(ctx);
  drawParticles(ctx);
  if (beamInTimer > 0) ctx.globalAlpha = 1 - beamInTimer / BEAM_IN_DURATION;
  drawShip(ctx);
  ctx.globalAlpha = 1;
  ctx.restore();

  drawHUD(ctx);

  if (escapeTimer >= 0) {
    const secs = Math.ceil(escapeTimer);
    ctx.textAlign = 'center';
    ctx.font = 'bold 72px "Michroma", sans-serif';
    ctx.fillStyle = escapeTimer <= 3 ? '#ff3333' : '#ffffff';
    ctx.fillText(String(secs), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
    ctx.font = '16px "Michroma", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('AUSGANG ERREICHEN', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
  }
}

function renderLevelIntro(ctx) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px "Michroma", sans-serif';
  ctx.fillText(`Level ${game.level}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
  ctx.font = '20px "Michroma", sans-serif';
  ctx.fillText('Zerstöre den Reaktor', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
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
  ctx.fillText('Reaktor zerstört', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
  ctx.font = '18px "Michroma", sans-serif';
  ctx.fillText(`Mit ENTER oder LEERTASTE zum Level ${game.level + 1}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
}

const stateRenderers = {
  [State.MENU]: renderMenu,
  [State.LEVEL_INTRO]: renderLevelIntro,
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
