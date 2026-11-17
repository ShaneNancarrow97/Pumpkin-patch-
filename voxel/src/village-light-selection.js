// The lamp pool needs only its nearest few points, not a newly sorted copy of
// every lantern. Sources are immutable position lists; invalidate after editing
// a point in place. Camera turns alone do not change which lamps are nearest.
export function createVillageLightSelection(limit = 8) {
  const capacity = Math.max(1, Math.floor(limit)), selected = [], distances = new Float64Array(capacity);
  const stats = { selections: 0, cacheHits: 0, distanceChecks: 0, candidates: 0 };
  let source = null, length = -1, x = NaN, y = NaN, z = NaN, horizontal = false;
  return {
    select(points, target, flat = false) {
      const ty = flat ? 0 : target.y;
      if (source === points && length === points.length && x === target.x && y === ty && z === target.z && horizontal === flat) {
        stats.cacheHits++; return selected;
      }
      source = points; length = points.length; x = target.x; y = ty; z = target.z; horizontal = flat;
      selected.length = 0; stats.selections++; stats.candidates = length;
      for (const point of points) {
        const dx = point.x - x, dz = point.z - z, dy = flat ? 0 : point.y - y;
        const distance = dx * dx + dy * dy + dz * dz; stats.distanceChecks++;
        if (!Number.isFinite(distance)) continue;
        let at = selected.length;
        if (at === capacity) { if (distance >= distances[at - 1]) continue; at--; }
        // Strict comparison retains the original order for equal distances,
        // just like the previous stable Array.sort selection.
        while (at > 0 && distance < distances[at - 1]) {
          selected[at] = selected[at - 1]; distances[at] = distances[at - 1]; at--;
        }
        selected[at] = point; distances[at] = distance;
      }
      return selected;
    },
    invalidate() { source = null; },
    stats,
  };
}
