// The pieces of daily life between Mothlight's landmarks. These positions are ALREADY SPREAD on the
// design grid (x east, z north), like TOWN in village-town-square.js. Do not pass them through spread().
// Only this module's rule-facing helpers multiply by PLAN_SCALE; the voxel builder uses the grid directly.
// Low beds, flowers and gravel remain walkable. Trunks and actual pieces of furniture have measured solids.
import { PLAN_SCALE as K } from './village.js';
import { villageDecorBounds } from '../rules/village-decor-geometry.js';

const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
};
const box = (x, z, w, d) => ({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 });
const merge = bounds => ({ x0: Math.min(...bounds.map(b => b.x0)), z0: Math.min(...bounds.map(b => b.z0)), x1: Math.max(...bounds.map(b => b.x1)), z1: Math.max(...bounds.map(b => b.z1)) });
const overlaps = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
// The builder's frame: local +z is the front, south in the default orientation.
function localBox(c, x, z, w, d) {
  const [co, si] = { south: [1, 0], east: [0, 1], north: [-1, 0], west: [0, -1] }[c.facing ?? 'south'];
  return box(c.x + x * co + z * si, c.z + x * si - z * co, Math.abs(co) * w + Math.abs(si) * d, Math.abs(si) * w + Math.abs(co) * d);
}
function furniture(c) {
  const out = [];
  if (c.kind === 'pergola') {
    const w = Math.min(10, c.w), d = Math.min(8, c.d), length = Math.min(4.6, w - 3);
    if (c.roof !== false) for (const x of [-1, 1]) for (const z of [-1, 1]) out.push(localBox(c, x * (w / 2 - .7), z * (d / 2 - .65), .52, .52));
    out.push(localBox(c, 0, -.1, length, 1.12));
    for (const side of [-1, 1]) out.push(localBox(c, 0, -.1 + side * 1.08, length + .15, .49));
  }
  if (c.kind === 'reading') {
    out.push(localBox(c, 0, .65, 2.28, 1.2));
    out.push(localBox(c, -c.w / 2 + 1, -c.d / 2 + .65, 1.72, .95));
    out.push(localBox(c, c.w / 2 - 1.25, -c.d / 2 + .65, 1.9, .8));
    out.push(localBox(c, 1.95, .7, .86, .86));
    out.push(localBox(c, c.w / 2 - 1.6, 1.8, .7, .58));
  }
  if (c.kind === 'workyard') {
    out.push(localBox(c, 0, -c.d / 2 + .65, 2.9, 1.2));
    out.push(localBox(c, -c.w / 2 + 1.25, .25, 2.2, 1.8));
    out.push(localBox(c, c.w / 2 - 1.4375, .7, 2.175, .9));
  }
  return out;
}
function cluster(c) {
  const bases = c.kind === 'orchard' ? c.trees.map(t => box(t.x, t.z, 6.4, 6.4)) : c.kind === 'path' ? [] : [box(c.x, c.z, c.w + 1, c.d + 1)];
  for (const path of c.paths ?? []) for (const [x, z] of path.points) bases.push(box(x, z, path.width + .6, path.width + .6));
  for (const h of c.hedges ?? []) bases.push(box(h.x, h.z, h.w + .06, h.d + .06));
  for (const l of c.lanterns ?? []) bases.push(box(l.x, l.z, 1, 1));
  const solids = [
    ...furniture(c),
    ...(c.trees ?? []).map(t => ({ x: t.x, z: t.z, r: .45 })),
    ...(c.hedges ?? []).map(h => box(h.x, h.z, h.w, h.d)),
    ...(c.lanterns ?? []).map(l => box(l.x, l.z, .45, .45)),
  ];
  return freeze({ facing: 'south', ...(c.kind === 'orchard' ? { props: false } : {}), ...c, bounds: merge(bases), solids });
}

export const VILLAGE_NEIGHBOURHOODS = freeze([
  // A working orchard fills the western approach; the open lanes run between the trees and gathering sockets.
  cluster({ id: 'cider-orchard-south', kind: 'orchard', x: -6, z: 51, w: 25, d: 24, seed: 7801,
    trees: [{ x: -16, z: 44 }, { x: -7, z: 43 }, { x: 4, z: 46 }, { x: -16, z: 57 }, { x: -3, z: 60 }, { x: -11, z: 56 }, { x: 7, z: 56 }] }),
  cluster({ id: 'cider-orchard-north', kind: 'orchard', x: -5, z: 71, w: 21, d: 8, seed: 7802,
    trees: [{ x: -12, z: 71 }, { x: 2, z: 72 }, { x: -5, z: 68 }] }),
  cluster({ id: 'market-orchard', kind: 'orchard', x: 27, z: 52, w: 19, d: 24, seed: 7803,
    trees: [{ x: 20, z: 44 }, { x: 32, z: 44 }, { x: 33, z: 61 }, { x: 13, z: 42 }, { x: 25, z: 47 }, { x: 37, z: 42 }, { x: 19, z: 56 }, { x: 37, z: 74 }] }),
  cluster({ id: 'community-pumpkin-garden', kind: 'garden', x: 26, z: 71, w: 12, d: 8, produce: 'pumpkins', seed: 7804,
    hedges: [{ x: 26, z: 75.5, w: 14, d: .55, h: .65 }, { x: 33, z: 71.5, w: .55, d: 8, h: .65 }] }),
  cluster({ id: 'community-herb-garden', kind: 'garden', x: 12, z: 65, w: 12, d: 8, seed: 7805,
    hedges: [{ x: 12, z: 69.5, w: 13, d: .55, h: .65 }] }),
  cluster({ id: 'orchard-moonflower-border', kind: 'meadow', x: -8, z: 65, w: 19, d: 12, soil: true, count: 20, seed: 7807 }),
  cluster({ id: 'market-moonflower-border', kind: 'meadow', x: 22, z: 58, w: 22, d: 10, soil: true, count: 22, seed: 7808 }),
  cluster({ id: 'orchard-walk', kind: 'path', x: 0, z: 0, w: 0, d: 0, seed: 7806,
    paths: [
      { points: [[-21, 51], [0, 51], [23, 51], [35, 54], [39, 58]], width: 2.6 },
      { points: [[0, 51], [0, 68], [1, 70], [11, 72], [19, 72]], width: 2.2 },
    ], lanterns: [{ x: -20, z: 53 }, { x: -1, z: 70 }, { x: 34, z: 51 }] }),
  cluster({ id: 'orchard-loop', kind: 'path', x: 0, z: 0, w: 0, d: 0, seed: 7809,
    paths: [{ points: [[-21, 51], [-18, 51], [-18, 56], [-21, 61], [-21, 66], [-12, 76], [11, 76], [17, 76], [17, 72], [19, 72]], width: 2.4 }] }),
  // The east is a lantern common: supper under a vine pergola, an open picnic and a florist's seasonal beds.
  cluster({ id: 'lantern-pergola', kind: 'pergola', x: 124, z: 64, w: 10, d: 8, seed: 7811,
    hedges: [{ x: 124, z: 70, w: 14, d: .55, h: .65 }, { x: 131, z: 66, w: .55, d: 8, h: .65 }] }),
  cluster({ id: 'lantern-picnic', kind: 'pergola', x: 95, z: 66, w: 8, d: 6, roof: false, seed: 7812 }),
  cluster({ id: 'lantern-flower-garden', kind: 'garden', x: 105, z: 51, w: 8, d: 6, seed: 7813 }),
  cluster({ id: 'lantern-meadow', kind: 'meadow', x: 128, z: 44, w: 24, d: 11, soil: true, count: 22, seed: 7814 }),
  cluster({ id: 'lantern-south-border', kind: 'meadow', x: 91, z: 45, w: 19, d: 12, soil: true, count: 24, seed: 7817 }),
  cluster({ id: 'lantern-north-border', kind: 'meadow', x: 109, z: 74, w: 20, d: 6, soil: true, count: 22, seed: 7818 }),
  cluster({ id: 'lantern-grove', kind: 'orchard', x: 134, z: 60, w: 14, d: 36, seed: 7816,
    trees: [{ x: 132, z: 44 }, { x: 138, z: 64 }, { x: 130, z: 73 }, { x: 88, z: 42 }, { x: 100, z: 42 }, { x: 112, z: 47 }, { x: 124, z: 47 }, { x: 88, z: 63 }, { x: 106, z: 63 }, { x: 112, z: 69 }] }),
  cluster({ id: 'lantern-walk', kind: 'path', x: 0, z: 0, w: 0, d: 0, seed: 7815,
    paths: [
      { points: [[77, 58], [100, 58], [124, 58], [141, 49], [141, 37]], width: 2.6 },
      { points: [[95, 58], [95, 62]], width: 2.2 },
      { points: [[124, 58], [124, 59.5]], width: 2.2 },
    ], lanterns: [{ x: 82, z: 61 }, { x: 110, z: 60 }, { x: 136, z: 54 }] }),
  cluster({ id: 'lantern-loop', kind: 'path', x: 0, z: 0, w: 0, d: 0, seed: 7819,
    // The northern bow and eastern bend keep existing fruit-tree trunks at (130,73) and (138,64)
    // outside the paving, including its full walkable width, while keeping existing resource sites in place.
    paths: [{ points: [[78, 58], [83, 72], [106, 74], [124, 74], [128, 76], [134, 76], [139, 72], [141, 67], [141, 61], [139, 56], [139, 53], [139, 50]], width: 2.4 }] }),
  // Small courts extend the residents' trades into the Green, clear of the door spurs and all chapter anchors.
  cluster({ id: 'library-reading-court', kind: 'reading', x: 33, z: 27, w: 8, d: 6, seed: 7821,
    paths: [{ points: [[33, 22.2], [33, 24]], width: 2.2 }], lanterns: [{ x: 37.4, z: 29.2 }] }),
  cluster({ id: 'rowan-workyard', kind: 'workyard', x: 82, z: 12, w: 8, d: 7, seed: 7822,
    paths: [{ points: [[82, 16], [82, 17.5]], width: 2.2 }], lanterns: [{ x: 86.5, z: 9 }] }),
  // Flowers and low brush turn the bare arrival strips into a transition from tended gardens to forage clearings.
  cluster({ id: 'flax-edge-meadow', kind: 'meadow', x: 47, z: -16, w: 8, d: 7, soil: true, count: 22, seed: 7823 }),
  cluster({ id: 'moonflower-edge-meadow', kind: 'meadow', x: 78, z: -15, w: 12, d: 8, soil: true, count: 24, seed: 7824 }),
]);

// A player's existing saved decoration always wins. Hide a complete authored cluster so no half-table or
// disconnected hedge remains, and use the same selection for rendering, walking and future placements.
export function villageNeighbourhoodClusters(state = null) {
  const placed = state?.village?.decor?.placed ?? [];
  if (!placed.length) return VILLAGE_NEIGHBOURHOODS;
  const owned = placed.map(p => villageDecorBounds(p.id, p.x, p.z, p.rotation ?? 0)).filter(Boolean)
    .map(b => ({ x0: b.x0 / K, z0: b.z0 / K, x1: b.x1 / K, z1: b.z1 / K }));
  return VILLAGE_NEIGHBOURHOODS.filter(c => !owned.some(b => overlaps(c.bounds, b)));
}
export function villageNeighbourhoodObstacles(state = null) {
  return villageNeighbourhoodClusters(state).flatMap(c => c.solids.map(b => b.r !== undefined
    ? { x: b.x * K, z: b.z * K, r: b.r * K, neighbourhood: c.id }
    : { x0: b.x0 * K, z0: b.z0 * K, x1: b.x1 * K, z1: b.z1 * K, neighbourhood: c.id }));
}
export const villageNeighbourhoodPaths = (state = null) => villageNeighbourhoodClusters(state).flatMap(c => c.paths ?? []);
const onPath = (x, z, path) => path.points.slice(1).some(([bx, bz], i) => {
  const [ax, az] = path.points[i], dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t) < path.width / 2 + .32;
});
// Ground/grass queries stay in the spread DESIGN grid. The static default is intentional: a hidden cluster
// leaves quiet tended ground below the player's decoration and never adds a per-tuft state dependency.
export function inVillageNeighbourhood(x, z, clusters = VILLAGE_NEIGHBOURHOODS) {
  return clusters.some(c => (c.paths ?? []).some(p => onPath(x, z, p))
    || ((['garden', 'pergola', 'reading', 'workyard'].includes(c.kind) || c.soil) && Math.abs(x - c.x) < c.w / 2 + .18 && Math.abs(z - c.z) < c.d / 2 + .18)
    || c.solids.some(b => b.r !== undefined ? Math.hypot(x - b.x, z - b.z) < b.r + .12 : x > b.x0 - .08 && x < b.x1 + .08 && z > b.z0 - .08 && z < b.z1 + .08));
}
export const visibleNeighbourhoods = villageNeighbourhoodClusters;
export const neighbourhoodClearsGrass = inVillageNeighbourhood;
