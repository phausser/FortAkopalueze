let ctx = null;
let noiseBuffer = null;

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function buildNoiseBuffer() {
  if (noiseBuffer) return noiseBuffer;
  const c = getCtx();
  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

function noiseSource(loop = false) {
  const c = getCtx();
  const src = c.createBufferSource();
  src.buffer = buildNoiseBuffer();
  src.loop = loop;
  return src;
}

function noise({ freq = 1000, q = 1, type = 'bandpass', peak = 0.5, duration = 0.2, freqEnd = null }) {
  const c = getCtx();
  const now = c.currentTime;
  const src = noiseSource();
  const filt = c.createBiquadFilter();
  filt.type = type;
  filt.frequency.value = freq;
  filt.Q.value = q;
  if (freqEnd !== null) {
    filt.frequency.setValueAtTime(freq, now);
    filt.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 10), now + duration);
  }
  const gain = c.createGain();
  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  src.connect(filt);
  filt.connect(gain);
  gain.connect(c.destination);
  src.start(now);
  src.stop(now + duration + 0.05);
}

function tone({ freq = 440, wave = 'sine', peak = 0.3, duration = 0.2, freqEnd = null }) {
  const c = getCtx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = wave;
  osc.frequency.value = freq;
  if (freqEnd !== null) {
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 10), now + duration);
  }
  const gain = c.createGain();
  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

// ─── One-shot sounds ──────────────────────────────────────────────────────────

export function playShoot() {
  noise({ freq: 4000, q: 0.8, type: 'highpass', peak: 0.22, duration: 0.045 });
}

export function playEnemyShoot() {
  noise({ freq: 700, q: 1.5, peak: 0.16, duration: 0.08 });
}

export function playHit() {
  tone({ freq: 700, wave: 'sine', peak: 0.35, freqEnd: 200, duration: 0.18 });
  noise({ freq: 800, q: 0.5, type: 'lowpass', peak: 0.18, duration: 0.08 });
}

export function playWallCollision() {
  noise({ freq: 180, q: 0.4, type: 'lowpass', peak: 0.3, duration: 0.1 });
}

export function playDeath() {
  noise({ freq: 900, q: 3, peak: 0.7, freqEnd: 40, duration: 1.5 });
  tone({ freq: 260, wave: 'sawtooth', peak: 0.25, freqEnd: 25, duration: 1.3 });
}

export function playEnemyDeath() {
  noise({ freq: 600, q: 0.5, type: 'lowpass', peak: 0.45, freqEnd: 60, duration: 0.4 });
  tone({ freq: 120, wave: 'sine', peak: 0.18, freqEnd: 30, duration: 0.35 });
}

export function playMissileSpawn() {
  noise({ freq: 300, q: 1.5, peak: 0.22, freqEnd: 1200, duration: 0.22 });
}

export function playMissileExplode() {
  noise({ freq: 400, q: 0.3, type: 'lowpass', peak: 0.8, freqEnd: 30, duration: 0.8 });
  tone({ freq: 80, wave: 'sine', peak: 0.4, freqEnd: 20, duration: 0.6 });
}

export function playMineAlert() {
  tone({ freq: 800, wave: 'square', peak: 0.2, freqEnd: 1400, duration: 0.18 });
}

export function playMineExplode() {
  noise({ freq: 280, q: 0.2, type: 'lowpass', peak: 1.0, freqEnd: 20, duration: 1.1 });
  tone({ freq: 55, wave: 'sine', peak: 0.5, freqEnd: 12, duration: 0.9 });
  noise({ freq: 2000, q: 1, peak: 0.4, freqEnd: 100, duration: 0.3 });
}

export function playLaserEmitterDestroyed() {
  noise({ freq: 2500, q: 4, peak: 0.4, freqEnd: 150, duration: 0.25 });
  tone({ freq: 400, wave: 'sawtooth', peak: 0.14, freqEnd: 80, duration: 0.2 });
}

export function playReactorHit() {
  noise({ freq: 180, q: 0.4, type: 'lowpass', peak: 0.55, duration: 0.35 });
  tone({ freq: 140, wave: 'sine', peak: 0.38, freqEnd: 60, duration: 0.55 });
}

export function playReactorExplode() {
  noise({ freq: 180, q: 0.2, type: 'lowpass', peak: 1.0, freqEnd: 15, duration: 2.5 });
  tone({ freq: 55, wave: 'sawtooth', peak: 0.5, freqEnd: 8, duration: 2.0 });
  noise({ freq: 2500, q: 1, peak: 0.7, freqEnd: 80, duration: 0.6 });
}

const PICKUP_FREQS = { energy: 660, shield: 880, ammo: 520 };
export function playPickup(kind) {
  const freq = PICKUP_FREQS[kind] ?? 660;
  tone({ freq, wave: 'sine', peak: 0.32, freqEnd: freq * 1.5, duration: 0.25 });
}

export function playWin() {
  const c = getCtx();
  [523, 659, 784, 1047].forEach((f, i) => {
    const start = c.currentTime + i * 0.13;
    const osc = c.createOscillator();
    osc.frequency.value = f;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.28, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.55);
  });
}

export function playGameOver() {
  tone({ freq: 380, wave: 'sawtooth', peak: 0.32, freqEnd: 60, duration: 1.4 });
  noise({ freq: 500, q: 0.5, peak: 0.28, freqEnd: 30, duration: 1.2 });
}

// ─── Looping sounds ───────────────────────────────────────────────────────────

const loops = {};

function startLoop(key, buildFn) {
  if (loops[key]) return;
  loops[key] = buildFn();
}

function stopLoop(key, fadeTime = 0.06) {
  const entry = loops[key];
  if (!entry) return;
  delete loops[key];
  const c = getCtx();
  const now = c.currentTime;
  const g = entry.gainNode.gain;
  g.cancelScheduledValues(now);
  g.setValueAtTime(Math.max(g.value, 0.001), now);
  g.exponentialRampToValueAtTime(0.0001, now + fadeTime);
  entry.source.stop(now + fadeTime + 0.02);
}

export function startThrust() {
  startLoop('thrust', () => {
    const c = getCtx();
    const source = noiseSource(true);
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 280;
    const gainNode = c.createGain();
    gainNode.gain.value = 0.11;
    source.connect(filt);
    filt.connect(gainNode);
    gainNode.connect(c.destination);
    source.start();
    return { source, gainNode };
  });
}

export function stopThrust() { stopLoop('thrust'); }

export function startLaserContact() {
  startLoop('laser', () => {
    const c = getCtx();
    const source = noiseSource(true);
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 3500;
    filt.Q.value = 0.5;
    const gainNode = c.createGain();
    gainNode.gain.value = 0.32;
    source.connect(filt);
    filt.connect(gainNode);
    gainNode.connect(c.destination);
    source.start();
    return { source, gainNode };
  });
}

export function stopLaserContact() { stopLoop('laser'); }

export function stopAllLoops() {
  stopLoop('thrust', 0.03);
  stopLoop('laser', 0.03);
}
