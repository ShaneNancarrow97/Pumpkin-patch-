// Mothlight's ground (handover 73), after the concept atlas and the building
// footprint: a terraced valley. The Green lies at 0 round its round square; each
// district sits away from it across its own stretch of woods (DISTRICT_SHIFT):
// the Copse on a wooded shelf to the north-west, the Quarry on a pale stone
// island inside a moat to the north, its cliffs climbing in two tiers with
// waterfalls, the Moor raised to the east with the Baron's manor on its crag,
// and the Marsh low and wet beyond the Quarry. Hills close round it all.
// Heights are on the design grid (the view scales by PLAN_SCALE). Pure: no
// three.js, so play mode and the tests can ask how high the ground is anywhere.
import { DISTRICT_SHIFT } from "./content/village.js";

const shift = (district, r) => { const [dx, dz] = DISTRICT_SHIFT[district]; return Object.freeze({ ...r, x0: r.x0 + dx, x1: r.x1 + dx, z0: r.z0 + dz, z1: r.z1 + dz, ...(r.inner ? { inner: Object.freeze({ x0: r.inner.x0 + dx, x1: r.inner.x1 + dx, z0: r.inner.z0 + dz, z1: r.inner.z1 + dz }) } : {}) }); };
// Flat shelves, highest priority first (each drawn up in its district's own place, then moved); anywhere else is ground at 0.
export const TERRACES = Object.freeze([
  shift("marsh", { id: "observatory", x0: 78, z0: 83, x1: 92, z1: 94, y: 1.6 }),
  shift("moor", { id: "manor", x0: 89, z0: 55, x1: 105, z1: 73, y: 6.5 }),
  shift("quarry", { id: "quarry-top", x0: 46, z0: 58, x1: 80, z1: 71, y: 8 }),
  shift("quarry", { id: "quarry", x0: 44, z0: 43, x1: 82, z1: 71, y: 5 }),
  shift("quarry", { id: "moat", x0: 39, z0: 37, x1: 87, z1: 76, y: -2.2 }),
  shift("marsh", { id: "marsh", x0: 38, z0: 76, x1: 122, z1: 98, y: -1.4 }),
  shift("moor", { id: "moor", x0: 82.5, z0: 12, x1: 122, z1: 76, y: 3 }),
  shift("copse", { id: "copse", x0: -2, z0: 40, x1: 39, z1: 98, y: 3 }),
]);
// Slopes between them, drawn as stone stairs: the height runs from `from` at the
// rect's low edge to `to` at its high edge along `axis` (x or z). Rects are on the grid as placed.
export const RAMPS = Object.freeze([
  { id: "copse-stairs", x0: -3, z0: 49.5, x1: 3, z1: 54, axis: "z", from: 0, to: 3 },
  { id: "quarry-bridge", x0: 55, z0: 57, x1: 61, z1: 63, axis: "z", from: 0, to: 0, bridge: true },
  { id: "quarry-stairs", x0: 55, z0: 63, x1: 61, z1: 68, axis: "z", from: 0, to: 5 },
  { id: "quarry-top-stairs", x0: 55, z0: 74, x1: 61, z1: 78, axis: "z", from: 5, to: 8 },
  { id: "marsh-stairs", x0: 55, z0: 91, x1: 61, z1: 100, axis: "z", from: 8, to: 0 },
  { id: "marsh-west-edge", x0: 55, z0: 106, x1: 61, z1: 110, axis: "z", from: 0, to: -.45 },
  { id: "moor-ramp", x0: 120.5, z0: 31, x1: 126.5, z1: 37, axis: "x", from: 0, to: 3 },
  { id: "manor-stairs", x0: 149, z0: 65, x1: 153, z1: 71, axis: "x", from: 6.5, to: 3 },
  { id: "moor-north", x0: 149, z0: 80, x1: 155, z1: 86, axis: "z", from: 3, to: 0 },
  { id: "marsh-east-edge", x0: 149, z0: 106, x1: 155, z1: 110, axis: "z", from: 0, to: -.45 },
  { id: "observatory-path", x0: 83, z0: 112, x1: 87, z1: 117, axis: "z", from: -.45, to: 1.6 },
].map(Object.freeze));
// Open water: the moat round the Quarry's island and the Marsh's pools.
export const WATERS = Object.freeze([
  shift("quarry", { id: "moat", kind: "ring", x0: 39, z0: 37, x1: 87, z1: 76, inner: { x0: 44, z0: 43, x1: 82, z1: 71 }, y: -1.6 }),
  shift("marsh", { id: "marsh", kind: "rect", x0: 38, z0: 76, x1: 122, z1: 98, y: -1.05 }),
]);
// The valley: the realm runs from the Copse's far side to the Moor's, and from the gate to the Marsh; beyond it the hills rise into the woods.
export const REALM = Object.freeze({ x0: -34, z0: -22, x1: 168, z1: 134 });
const smooth = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const inside = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
// Low rolling rises in the woods between the districts, kept off roads.
const ROLLS = [[22, 46, 9, 2.2], [92, 48, 10, 2.6], [104, 92, 9, 2], [26, 108, 10, 2.4], [130, 96, 9, 2.2], [-20, 30, 10, 1.8], [-24, 122, 10, 2.4]];

// How high the ground is at (x, z) on the design grid.
export function terrainHeight(x, z) {
  for (const r of RAMPS) if (inside(r, x, z)) {
    if (r.bridge) return 0;
    const t = r.axis === "z" ? (z - r.z0) / (r.z1 - r.z0) : (x - r.x0) / (r.x1 - r.x0);
    return r.from + (r.to - r.from) * Math.min(1, Math.max(0, t));
  }
  for (const t of TERRACES) if (inside(t, x, z)) return t.id === "marsh" && islandAt(x, z) ? -.45 : t.y;
  const out = Math.max(REALM.x0 - x, x - REALM.x1, REALM.z0 - z, z - REALM.z1, 0);
  if (out > 0) return smooth(out / 26) * 14 + Math.sin(x * .13) * Math.cos(z * .11) * 1.4 * smooth(out / 10);
  if (z < 36.5 && x > 0 && x < 120) return 0;
  let h = 0; for (const [rx, rz, rr, rh] of ROLLS) { const d = Math.hypot(x - rx, z - rz) / rr; if (d < 1) h = Math.max(h, rh * smooth(1 - d)); }
  return h;
}
// The terrace a point stands on (or null on open ground and slopes), for walls and planting.
export const terraceAt = (x, z) => TERRACES.find((t) => inside(t, x, z)) ?? null;
export const rampAt = (x, z) => RAMPS.find((r) => inside(r, x, z)) ?? null;
// Whether a point is open water (nothing grows or stands there).
export function isWater(x, z) {
  for (const w of WATERS) if (inside(w, x, z) && !(w.inner && inside(w.inner, x, z)) && !rampAt(x, z)) return w.kind === "ring" || !islandAt(x, z);
  return false;
}
// The Marsh's islands and banks: where reeds, trees and huts stand clear of its pools.
const [mx, mz] = DISTRICT_SHIFT.marsh;
const ISLANDS = [[52, 86, 6, 4], [66, 90, 5, 3.4], [100, 86, 7, 4], [112, 92, 5, 3], [46, 93, 4, 2.6], [85, 88.5, 8, 6.5], [72, 81, 3.6, 2.4], [92, 79, 4, 2.4]].map(([x, z, rx, rz]) => [x + mx, z + mz, rx, rz]);
export const MARSH_ISLANDS = Object.freeze(ISLANDS.map(([x, z, rx, rz]) => Object.freeze({ x, z, rx, rz })));
export function islandAt(x, z) { return ISLANDS.some(([ix, iz, rx, rz]) => ((x - ix) / rx) ** 2 + ((z - iz) / rz) ** 2 <= 1) || (z > 109 && z < 115 && x > 55 && x < 155) || z > 128.5 || x > 118.5 + mx || x < 39.5 + mx; }
