// Choosing a piece of furniture on a pad (ui/pad-arrange.js, handover 72):
// where the pieces stand on screen, the one a push of the stick or D-pad
// points to next, the one nearest a point, and the next in reading order for
// the bumpers. Pure: spots are { id, x, y } in screen pixels, y down.

// The piece a push towards (dx, dy) lands on: within about 70° of the push,
// nearer and straighter first, so a push goes where the eye expects.
export function pieceInDirection(spots, from, dx, dy) {
  const n = Math.hypot(dx, dy); if (!n || !from) return null;
  const ux = dx / n, uy = dy / n;
  let best = null, score = Infinity;
  for (const s of spots) {
    if (s.id === from.id) continue;
    const vx = s.x - from.x, vy = s.y - from.y, d = Math.hypot(vx, vy);
    if (d < 1) continue;
    const straight = (vx * ux + vy * uy) / d;
    if (straight < .34) continue;
    const sc = d * (2.2 - straight) ** 3;
    if (sc < score) { score = sc; best = s; }
  }
  return best;
}
// The piece nearest a point (the middle of the screen, when the ring first shows).
export function nearestSpot(spots, x, y) {
  let best = null, d = Infinity;
  for (const s of spots) { const e = Math.hypot(s.x - x, s.y - y); if (e < d) { d = e; best = s; } }
  return best;
}
// The next piece in reading order, left to right in rows: for L1 / R1.
export function cycleSpot(spots, id, step = 1) {
  if (!spots.length) return null;
  const row = 60, order = [...spots].sort((a, b) => Math.round(a.y / row) - Math.round(b.y / row) || a.x - b.x);
  const i = order.findIndex((s) => s.id === id);
  return order[((i < 0 ? (step > 0 ? -1 : 0) : i) + step + order.length) % order.length];
}
