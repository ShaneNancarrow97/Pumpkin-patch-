// Presentation budgets in world metres. Ground, buildings, gathering nodes and
// gameplay never use these thresholds: only grass blades and tiny ambient life.
export const VILLAGE_DETAIL_DISTANCE = Object.freeze({
  grassNearFrom: 28, grassNearTo: 52,
  grassMiddleFrom: 52, grassMiddleTo: 78,
  grassFarFrom: 65, grassFarTo: 105,
  switchMargin: 2,
  lifeFrom: 35, lifeTo: 65,
});
const smooth = (a, b, value) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t); };

export function villageDetailFade(distance, from, to) {
  return Number.isFinite(distance) ? 1 - smooth(from, to, Math.max(0, distance)) : 1;
}

// nearestDistance includes the whole patch's bounding radius. Drop vertices
// only beyond their completely invisible shader band; upgrade two metres
// before that band. A hovering camera cannot alternate geometry every frame.
export function villageGrassDetailLevel(nearestDistance, previous = 5) {
  const D = VILLAGE_DETAIL_DISTANCE, d = Math.max(0, nearestDistance);
  if (!Number.isFinite(d)) return 5;
  if (d < D.grassNearTo) return 5;
  if (previous === 5 && d <= D.grassNearTo + D.switchMargin) return 5;
  if (d < D.grassMiddleTo) return 3;
  if (previous !== 1 && d <= D.grassMiddleTo + D.switchMargin) return 3;
  return 1;
}

export function villageGrassBladeFade(distance, detail = 0) {
  const D = VILLAGE_DETAIL_DISTANCE;
  const detailFade = detail > 1.5 ? villageDetailFade(distance, D.grassNearFrom, D.grassNearTo)
    : detail > .5 ? villageDetailFade(distance, D.grassMiddleFrom, D.grassMiddleTo) : 1;
  return detailFade * villageDetailFade(distance, D.grassFarFrom, D.grassFarTo);
}
