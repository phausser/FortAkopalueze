export const score = { value: 0 };

export function resetScore() { score.value = 0; }

export function addScore(amount) { score.value += amount; }
