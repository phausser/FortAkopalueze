export const input = {
  held: new Set(),
  justPressed: new Set(),
  isHeld(key) { return this.held.has(key); },
  isJustPressed(key) { return this.justPressed.has(key); },
  clearFrameState() { this.justPressed.clear(); },
};

window.addEventListener('keydown', (event) => {
  if (!input.held.has(event.code)) input.justPressed.add(event.code);
  input.held.add(event.code);
});
window.addEventListener('keyup', (event) => {
  input.held.delete(event.code);
});
