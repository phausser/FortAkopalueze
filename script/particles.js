import { PARTICLE_COUNT, PARTICLE_SPEED, PARTICLE_LIFETIME } from './constants.js';

export const particles = [];

export function spawnImpactParticles(x, y) {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    particles.push({ x, y, vx: Math.cos(angle) * PARTICLE_SPEED, vy: Math.sin(angle) * PARTICLE_SPEED, life: PARTICLE_LIFETIME });
  }
}

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function drawParticles(ctx) {
  for (const p of particles) {
    ctx.globalAlpha = p.life / (p.maxLife ?? PARTICLE_LIFETIME);
    ctx.fillStyle = p.color ?? '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
