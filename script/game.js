// ─── Konfiguration ────────────────────────────────────────────────────────────

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

const SHIP_ROTATION_SPEED = 3.0;   // rad/s
const SHIP_THRUST = 250;   // px/s²
const SHIP_DAMPING = 0.99;  // Geschwindigkeits-Faktor pro Frame @ 60 fps

// ─── Spielzustände ────────────────────────────────────────────────────────────

const State = {
  MENU: 'menu',
  PLAYING: 'playing',
  DEAD: 'dead',
  ESCAPE: 'escape',
  WIN: 'win',
};

// ─── Ressourcen ───────────────────────────────────────────────────────────────

const resources = {
  energy: 1.0,
  shield: 1.0,
  ammo:   1.0,
};

function resetResources() {
  resources.energy = 1.0;
  resources.shield = 1.0;
  resources.ammo   = 1.0;
}

// ─── Schiff ───────────────────────────────────────────────────────────────────

const ship = {
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT / 2,
  angle: -Math.PI / 2,   // zeigt nach oben
  vx: 0,
  vy: 0,
};

function resetShip() {
  ship.x = CANVAS_WIDTH / 2;
  ship.y = CANVAS_HEIGHT / 2;
  ship.angle = -Math.PI / 2;
  ship.vx = 0;
  ship.vy = 0;
  resetResources();
}

// ─── Eingabe ──────────────────────────────────────────────────────────────────

const input = {
  held: new Set(),
  justPressed: new Set(),

  isHeld(key) { return this.held.has(key); },
  isJustPressed(key) { return this.justPressed.has(key); },

  clearFrameState() { this.justPressed.clear(); },
};

window.addEventListener('keydown', (event) => {
  if (!input.held.has(event.code)) {
    input.justPressed.add(event.code);
  }
  input.held.add(event.code);
});

window.addEventListener('keyup', (event) => {
  input.held.delete(event.code);
});

// ─── Spielstand ───────────────────────────────────────────────────────────────

const game = {
  state: State.MENU,
  previousTime: 0,

  setState(newState) {
    this.state = newState;
  },
};

// ─── Update-Logik pro Zustand ─────────────────────────────────────────────────

function updateMenu() {
  if (input.isJustPressed('Enter') || input.isJustPressed('Space')) {
    resetShip();
    game.setState(State.PLAYING);
  }
}

function updatePlaying(dt) {
  // Rotation
  if (input.isHeld('ArrowLeft')) ship.angle -= SHIP_ROTATION_SPEED * dt;
  if (input.isHeld('ArrowRight')) ship.angle += SHIP_ROTATION_SPEED * dt;

  // Schub
  if (input.isHeld('ArrowUp')) {
    ship.vx += Math.cos(ship.angle) * SHIP_THRUST * dt;
    ship.vy += Math.sin(ship.angle) * SHIP_THRUST * dt;
  }
  if (input.isHeld('ArrowDown')) {
    ship.vx -= Math.cos(ship.angle) * SHIP_THRUST * dt;
    ship.vy -= Math.sin(ship.angle) * SHIP_THRUST * dt;
  }

  // Dämpfung (frame-rate-unabhängig)
  const d = Math.pow(SHIP_DAMPING, dt * 60);
  ship.vx *= d;
  ship.vy *= d;

  // Position
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  // Menü
  if (input.isJustPressed('Escape')) {
    game.setState(State.MENU);
  }
}

function updateDead() {
  if (input.isJustPressed('Enter') || input.isJustPressed('Space')) {
    game.setState(State.MENU);
  }
}

function updateEscape() {
  // Platzhalter – wird in späteren Phasen befüllt
}

function updateWin() {
  if (input.isJustPressed('Enter') || input.isJustPressed('Space')) {
    game.setState(State.MENU);
  }
}

const stateUpdaters = {
  [State.MENU]: updateMenu,
  [State.PLAYING]: updatePlaying,
  [State.DEAD]: updateDead,
  [State.ESCAPE]: updateEscape,
  [State.WIN]: updateWin,
};

// ─── Render-Hilfsfunktionen ───────────────────────────────────────────────────

function drawHUD(ctx) {
  const BAR_W   = 25;
  const BAR_H   = 5;
  const GAP     = 3;
  const MARGIN  = 8;

  const bars = [
    { value: resources.energy, color: '#4488ff' },
    { value: resources.shield, color: '#44ff88' },
    { value: resources.ammo,   color: '#ffdd44' },
  ];

  bars.forEach((bar, i) => {
    const x = MARGIN;
    const y = MARGIN + i * (BAR_H + GAP);
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y, BAR_W, BAR_H);
    ctx.fillStyle = bar.color;
    ctx.fillRect(x, y, Math.round(BAR_W * Math.max(0, bar.value)), BAR_H);
  });
}

function drawShip(ctx) {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  ctx.beginPath();
  ctx.moveTo(16, 0);   // Nase – spitze Ecke vorne
  ctx.lineTo(-11, 13);   // hinten links
  ctx.lineTo(-11, -13);   // hinten rechts
  ctx.closePath();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'miter';
  ctx.stroke();

  ctx.restore();
}

// ─── Render-Logik pro Zustand ─────────────────────────────────────────────────

function renderMenu(ctx) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FORT AKOPALUEZE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

  ctx.fillStyle = '#ffffff';
  ctx.font = '20px Roboto, sans-serif';
  ctx.fillText('ENTER oder LEERTASTE zum Starten', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
}

function renderPlaying(ctx) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawShip(ctx);
  drawHUD(ctx);
}

function renderDead(ctx) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.fillStyle = '#ffffff';
  ctx.font = '18px Roboto, sans-serif';
  ctx.fillText('ENTER zum Neustart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
}

function renderWin(ctx) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ENTKOMMEN!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.fillStyle = '#ffffff';
  ctx.font = '18px Roboto, sans-serif';
  ctx.fillText('ENTER zum Neustart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
}

const stateRenderers = {
  [State.MENU]: renderMenu,
  [State.PLAYING]: renderPlaying,
  [State.DEAD]: renderDead,
  [State.ESCAPE]: renderPlaying, // Escape nutzt vorerst denselben Renderer
  [State.WIN]: renderWin,
};

// ─── Game Loop ────────────────────────────────────────────────────────────────

function loop(timestamp) {
  const deltaTime = (timestamp - game.previousTime) / 1000;
  game.previousTime = timestamp;

  const clampedDelta = Math.min(deltaTime, 0.1); // max 100 ms verhindert Sprünge nach Tab-Wechsel

  stateUpdaters[game.state]?.(clampedDelta);
  stateRenderers[game.state]?.(ctx);

  input.clearFrameState();

  requestAnimationFrame(loop);
}

// ─── Start ────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

requestAnimationFrame((timestamp) => {
  game.previousTime = timestamp;
  loop(timestamp);
});
