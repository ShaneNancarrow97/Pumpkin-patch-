// Public places in the native gardens. The plan below is ALREADY SPREAD:
// apply K once for walking, never spread() or spreadVillage(). These describe
// places, not a resident's whereabouts or a new saved activity.
import { PLAN_SCALE as K } from './village.js';
import { VILLAGE_NEIGHBOURHOODS, villageNeighbourhoodClusters } from './village-neighbourhoods.js';

const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
export const VILLAGE_PLACES = freeze([
  { id: 'cider-orchard', name: 'Cider Orchard', art: 'market-crates', anchor: [0, 51], bounds: [-23, 40, 40, 79],
    clusters: ['cider-orchard-south', 'cider-orchard-north'], paths: ['orchard-walk', 'orchard-loop'],
    sub: 'Fruit trees and moonflowers along the western garden walk', publicSub: 'The public garden walk west of Moonclock Square' },
  { id: 'lantern-commons', name: 'Lantern Commons', art: 'moth-lamp', anchor: [124, 59.5], bounds: [77, 36, 143, 79],
    clusters: ['lantern-pergola', 'lantern-picnic'], paths: ['lantern-walk', 'lantern-loop'],
    sub: 'The pavilion, picnic tables and looping lantern walk', publicSub: 'The public garden walk east of Moonclock Square' },
  { id: 'community-beds', name: 'Community Beds', art: 'pumpkin-pile', anchor: [19, 72], bounds: [5, 61, 34, 77],
    clusters: ['community-pumpkin-garden', 'community-herb-garden'], paths: ['orchard-walk', 'orchard-loop'],
    sub: 'Pumpkin and herb beds on the orchard’s northern loop', publicSub: 'The public gardens on the orchard’s northern loop' },
  { id: 'reading-court', name: 'Reading Court', art: 'almanac', anchor: [33, 24], bounds: [28, 21.5, 38, 31],
    clusters: ['library-reading-court'], paths: ['library-reading-court'],
    sub: 'A quiet outdoor court beside Elowen’s library', publicSub: 'The public garden beside Elowen’s library' },
  { id: 'rowan-workyard', name: 'Rowan’s Workyard', art: 'workbench', anchor: [82, 17.5], bounds: [77, 7, 87, 18.5],
    clusters: ['rowan-workyard'], paths: ['rowan-workyard'],
    sub: 'Timber and tools in the yard beside Rowan’s workshop', publicSub: 'The public yard beside Rowan’s workshop' },
]);

// Reuse the actual path centre lines, including the small courts' door spurs.
// Half-unit samples give a blocked destination a nearby clear approach without
// sending the owner into a table, tree, hedge or their own saved decoration.
const approaches = new Map(VILLAGE_PLACES.map(place => {
  const [x, z] = place.anchor, samples = [];
  for (const id of place.paths) for (const path of VILLAGE_NEIGHBOURHOODS.find(c => c.id === id)?.paths ?? []) {
    for (let i = 1; i < path.points.length; i++) {
      const [ax, az] = path.points[i - 1], [bx, bz] = path.points[i], steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) * K / .5));
      for (let j = 0; j <= steps; j++) {
        const px = ax + (bx - ax) * j / steps, pz = az + (bz - az) * j / steps, distance = Math.hypot(px - x, pz - z);
        if (distance <= 12) samples.push({ x: px * K, z: pz * K, path: id, distance });
      }
    }
  }
  return [place.id, samples.sort((a, b) => a.distance - b.distance)];
}));

export function villagePlaces(state = null) {
  const visible = new Set(villageNeighbourhoodClusters(state).map(c => c.id));
  return VILLAGE_PLACES.map(place => ({ ...place, sub: place.clusters.some(id => visible.has(id)) ? place.sub : place.publicSub }));
}

const localPlaces = [...VILLAGE_PLACES].reverse();
export function villagePlaceAt(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  // Beds are a smaller place within the orchard and take precedence there.
  return localPlaces.find(({ bounds: [x0, z0, x1, z1] }) => x >= x0 * K && x <= x1 * K && z >= z0 * K && z <= z1 * K) ?? null;
}

export function resolveVillagePlaceDestination(state, id, isFree) {
  const place = VILLAGE_PLACES.find(place => place.id === id);
  if (!place || typeof isFree !== 'function') return null;
  const visible = new Set(villageNeighbourhoodClusters(state).map(c => c.id)), candidates = approaches.get(id);
  // Prefer still-visible paving. If owned decor replaced an entire court/path,
  // its public approach remains a valid place; check every point live anyway.
  const point = candidates.find(p => visible.has(p.path) && isFree(p.x, p.z)) ?? candidates.find(p => isFree(p.x, p.z));
  return point ? { x: point.x, z: point.z, placeId: id, name: place.name, area: 'green', realm: 'surface' } : null;
}
