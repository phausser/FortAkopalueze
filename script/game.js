// ─── Konfiguration ────────────────────────────────────────────────────────────

const CANVAS_WIDTH  = 960;
const CANVAS_HEIGHT = 540;

// ─── Spielzustände ────────────────────────────────────────────────────────────

const State = {
  MENU:    'menu',
  PLAYING: 'playing',
  DEAD:    'dead',
  ESCAPE:  'escape',
  WIN:     'win',
};

// ─── Eingabe ──────────────────────────────────────────────────────────────────

const input = {
  held: new Set(),
  justPressed: new Set(),

  isHeld(key)        { return this.held.has(key); },
  isJustPressed(key) { return this.justPressed.has(key); },

  clearFrameState()  { this.justPressed.clear(); },
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
  state:       State.MENU,
  previousTime: 0,

  setState(newState) {
    this.state = newState;
  },
};

// ─── Update-Logik pro Zustand ─────────────────────────────────────────────────

function updateMenu() {
  if (input.isJustPressed('Enter') || input.isJustPressed('Space')) {
    game.setState(State.PLAYING);
  }
}

function updatePlaying() {
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
  [State.MENU]:    updateMenu,
  [State.PLAYING]: updatePlaying,
  [State.DEAD]:    updateDead,
  [State.ESCAPE]:  updateEscape,
  [State.WIN]:     updateWin,
};

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

  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Spiel läuft – ESC für Menü', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
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
  [State.MENU]:    renderMenu,
  [State.PLAYING]: renderPlaying,
  [State.DEAD]:    renderDead,
  [State.ESCAPE]:  renderPlaying, // Escape nutzt vorerst denselben Renderer
  [State.WIN]:     renderWin,
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
const ctx    = canvas.getContext('2d');

canvas.width  = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

requestAnimationFrame((timestamp) => {
  game.previousTime = timestamp;
  loop(timestamp);
});
