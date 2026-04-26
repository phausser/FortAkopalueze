export function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1x = bx - ax, d1y = by - ay;
  const d2x = dx - cx, d2y = dy - cy;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 0.0001) return false;
  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / cross;
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / cross;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function hasLineOfSight(room, x1, y1, x2, y2) {
  for (let i = 0; i < room.ceilingPoints.length - 1; i++) {
    const a = room.ceilingPoints[i], b = room.ceilingPoints[i + 1];
    if (segmentsIntersect(x1, y1, x2, y2, a.x, a.y, b.x, b.y)) return false;
  }
  for (let i = 0; i < room.floorPoints.length - 1; i++) {
    const a = room.floorPoints[i], b = room.floorPoints[i + 1];
    if (segmentsIntersect(x1, y1, x2, y2, a.x, a.y, b.x, b.y)) return false;
  }
  for (const obs of room.obstacles) {
    const tipY = obs.kind === 'stalactite' ? obs.baseY + obs.len : obs.baseY - obs.len;
    if (segmentsIntersect(x1, y1, x2, y2, obs.x - obs.w / 2, obs.baseY, obs.x, tipY)) return false;
    if (segmentsIntersect(x1, y1, x2, y2, obs.x + obs.w / 2, obs.baseY, obs.x, tipY)) return false;
  }
  return true;
}

export function wrapAngle(a) {
  return a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
}
