// Mothlight's ground (handover 73), after the concept atlas and the building
// footprint: a terraced valley. The Green lies at 0 round its round square; the
// Copse rises on a wooded shelf to the west; the Quarry stands on a pale stone
// island inside a moat, its cliffs climbing in two tiers with a waterfall; the
// Moor sits raised to the east with the Baron's manor on its own crag; the Marsh
// lies low and wet behind it all; and the hills close round the valley. Heights
// are on the design grid (the view scales by PLAN_SCALE). Pure: no three.js, so
// play mode and the tests can ask how high the ground is anywhere.

// Flat shelves, highest priority first; anywhere else is the Green at 0 (or the hills beyond).
export const TERRACES = Object.freeze([
  { id: "observatory", x0: 78, z0: 83, x1: 92, z1: 94, y: 1.6 },
  { id: "manor", x0: 89, z0: 55, x1: 105, z1: 73, y: 6.5 },
  { id: "quarry-top", x0: 46, z0: 58, x1: 80, z1: 71, y: 8 },
  { id: "quarry", x0: 44, z0: 43, x1: 82, z1: 71, y: 5 },
  { id: "moat", x0: 39, z0: 37, x1: 87, z1: 76, y: -2.2 },
  { id: "marsh", x0: 38, z0: 76, x1: 122, z1: 98, y: -1.4 },
  { id: "moor", x0: 82.5, z0: 12, x1: 122, z1: 76, y: 3 },
  { id: "copse", x0: -2, z0: 40, x1: 39, z1: 98, y: 3 },
].map(Object.freeze));
// Slopes between them, drawn as stone stairs: the height runs from `from` at the
// rect's low edge to `to` at its high edge along `axis` (x or z).
export const RAMPS = Object.freeze([
  { id: "copse-stairs", x0: 27, z0: 35.5, x1: 33, z1: 40, axis: "z", from: 0, to: 3 },
  { id: "quarry-bridge", x0: 55, z0: 37, x1: 61, z1: 43, axis: "z", from: 0, to: 0, bridge: true },
  { id: "quarry-stairs", x0: 55, z0: 43, x1: 61, z1: 48, axis: "z", from: 0, to: 5 },
  { id: "quarry-top-stairs", x0: 55, z0: 54, x1: 61, z1: 58, axis: "z", from: 5, to: 8 },
  { id: "marsh-stairs", x0: 55, z0: 71, x1: 61, z1: 80, axis: "z", from: 8, to: -.45 },
  { id: "moor-ramp", x0: 76.5, z0: 31, x1: 82.5, z1: 37, axis: "x", from: 0, to: 3 },
  { id: "manor-stairs", x0: 105, z0: 61, x1: 109, z1: 67, axis: "x", from: 6.5, to: 3 },
  { id: "marsh-east", x0: 105, z0: 72, x1: 111, z1: 80, axis: "z", from: 3, to: -.45 },
  { id: "observatory-path", x0: 83, z0: 78, x1: 87, z1: 83, axis: "z", from: -1.4, to: 1.6 },
].map(Object.freeze));
// Open water: the moat round the Quarry's island, the Marsh's pools, the pond and the West Meadow's tarn.
export const WATERS = Object.freeze([
  { id: "moat", kind: "ring", x0: 39, z0: 37, x1: 87, z1: 76, inner: { x0: 44, z0: 43, x1: 82, z1: 71 }, y: -1.6 },
  { id: "marsh", kind: "rect", x0: 38, z0: 76, x1: 122, z1: 98, y: -1.05 },
].map(Object.freeze));
// The valley: the realm is 120 by 96; beyond it the hills rise into the woods.
const REALM = { x0: 0, z0: 0, x1: 120, z1: 96 };
const smooth = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const inside = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

// How high the ground is at (x, z) on the design grid.
export function terrainHeight(x, z) {
  for (const r of RAMPS) if (inside(r, x, z)) {
    if (r.bridge) return 0;
    const t = r.axis === "z" ? (z - r.z0) / (r.z1 - r.z0) : (x - r.x0) / (r.x1 - r.x0);
    return r.from + (r.to - r.from) * Math.min(1, Math.max(0, t));
  }
  for (const t of TERRACES) if (inside(t, x, z)) return t.id === "marsh" && islandAt(x, z) ? -.45 : t.y;
  const out = Math.max(REALM.x0 - x, x - REALM.x1, REALM.z0 - z, z - REALM.z1, 0);
  return out > 0 ? smooth(out / 26) * 14 + Math.sin(x * .13) * Math.cos(z * .11) * 1.4 * smooth(out / 10) : 0;
}
// The terrace a point stands on (or null on the Green and slopes), for walls and planting.
export const terraceAt = (x, z) => TERRACES.find((t) => inside(t, x, z)) ?? null;
export const rampAt = (x, z) => RAMPS.find((r) => inside(r, x, z)) ?? null;
// Whether a point is open water (nothing grows or stands there).
export function isWater(x, z) {
  for (const w of WATERS) if (inside(w, x, z) && !(w.inner && inside(w.inner, x, z)) && !rampAt(x, z)) return w.kind === "ring" || !islandAt(x, z);
  return false;
}
// The Marsh's islands and banks: where reeds, trees and huts stand clear of its pools.
const ISLANDS = [[52, 86, 6, 4], [66, 90, 5, 3.4], [100, 86, 7, 4], [112, 92, 5, 3], [46, 93, 4, 2.6], [85, 88.5, 8, 6.5], [72, 81, 3.6, 2.4], [92, 79, 4, 2.4]];
export const MARSH_ISLANDS = Object.freeze(ISLANDS.map(([x, z, rx, rz]) => Object.freeze({ x, z, rx, rz })));
export function islandAt(x, z) { return ISLANDS.some(([ix, iz, rx, rz]) => ((x - ix) / rx) ** 2 + ((z - iz) / rz) ** 2 <= 1) || (z > 75 && z < 81 && x > 55 && x < 111) || z > 94.5 || x > 118.5 || x < 39.5; }
