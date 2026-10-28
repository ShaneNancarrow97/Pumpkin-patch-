// Use the actual canvas width: a Fold's navigation rail can make its unfolded
// canvas fractionally taller than wide. Aspect alone must never select a crop.
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function cameraLayout(width) {
  const t = clamp((width - 420) / 320, 0, 1), overview = t * t * (3 - 2 * t);
  // maxZoom lets the farm come close enough to read a face: about the sprites'
  // own resolution on a phone.
  return { overview, farmSpan: 20 + 26 * overview, minZoom: 0.5, maxZoom: 4.5, roomMinZoom: 0.6 };
}

// Direct play needs room around the owner; every zoom path shares this limit.
export function controlledRoomFraming(width, zoom = 1) {
  const safeZoom = Number.isFinite(zoom) ? zoom : 1;
  return { distance: 15 + cameraLayout(width).overview * 1.5, zoom: clamp(safeZoom, .6, 1.15) };
}

// Keep roofs and the front fence visible when they fit. When zoomed in, allow
// panning between them instead of pinning a tall viewport to the front fence.
export function farmVerticalLimits(halfHeight, pitch, depth) {
  const safe = halfHeight * 0.86, sin = Math.sin(pitch), roof = 14 * Math.cos(pitch);
  const front = depth - safe / sin, back = (safe - roof) / sin;
  if (front <= back) return { min: Math.max(3, Math.min(18, front)), max: Math.min(18, Math.max(3, back)) };
  return { min: back, max: front };
}
