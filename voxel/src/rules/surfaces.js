// Small pieces standing on tables and shelves: the shapes, without the house.
// A piece on another (a rider) keeps `on`, its host's instance, and `top`, which
// of the host's flat tops it stands on. Its x and z are then its centre in the
// host's own unturned frame (content/placement.js), so it moves, turns and
// mirrors with its host. rules/house.js does the rest.
import { SMALL_PIECES, BASE, BOARD, measuredSurfaces } from "../content/placement.js";
import { DECOR_SIZES } from "../content/decor-sizes.js";
import { SHELF_CATALOG, SHELF_FINISHES } from "../content/shelf-catalog.js";

const SHELVES = Object.fromEntries(SHELF_CATALOG.map((item) => [item.id, item]));
export const canRide = (id) => SMALL_PIECES.includes(id);
export const isShelf = (id) => !!SHELVES[id];
export const validFinish = (id, finish) => !!SHELVES[id]?.finishes.some((f) => f.id === finish);
export const nextFinish = (id, finish) => {
  const list = SHELVES[id]?.finishes ?? SHELF_FINISHES, i = list.findIndex((f) => f.id === finish);
  return list[(Math.max(0, i) + 1) % list.length].id;
};

// A shelf's boards, each with the room up to the board above it.
function shelfTops(item) {
  return item.surfaces.map((t) => {
    const above = item.surfaces.filter((u) => u.y > t.y && u.x < t.x + t.w && t.x < u.x + u.w).map((u) => +(u.y - BOARD - t.y).toFixed(3));
    return above.length ? { ...t, h: Math.min(...above) } : t;
  });
}

// A host's tops in its own frame, given its unturned footprint (w × d), mirrored with it.
export function surfacesOf(id, w, d, wall, flip = false) {
  const tops = SHELVES[id] ? shelfTops(SHELVES[id]) : measuredSurfaces(id, w, d, wall);
  return flip ? tops.map((t) => ({ ...t, x: +(w - t.x - t.w).toFixed(3) })) : tops;
}

// A rider's measured size: across, deep and tall.
export function riderSize(id) {
  const b = DECOR_SIZES[id]?.box ?? [-0.4, 0.4, -0.4, 0.4, 1];
  return { w: b[1] - b[0], d: b[3] - b[2], h: b[4] };
}
// The box round a w × d rectangle centred on (x, z) and turned by rotation degrees.
function box(x, z, w, d, rotation = 0) {
  const a = (rotation * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)), hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2;
  return { x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd };
}
// Whether a rider centred on (x, z) stands on top t: its base on the top (a shade
// or a bouquet may reach over the edge) and its height under anything above.
export function standsOn(t, id, x, z, rotation) {
  const r = riderSize(id), b = box(x, z, r.w * BASE, r.d * BASE, rotation), e = 1e-6;
  return b.x0 >= t.x - e && b.x1 <= t.x + t.w + e && b.z0 >= t.z - e && b.z1 <= t.z + t.d + e && (t.h === undefined || r.h <= t.h + e);
}
// Riders on one top keep apart by most of their size, so shades and leaves can touch.
const SPACE = 0.75;
export function ridersClash(a, b) {
  const ra = riderSize(a.id), rb = riderSize(b.id), e = 1e-6;
  const A = box(a.x, a.z, ra.w * SPACE, ra.d * SPACE, a.rotation), B = box(b.x, b.z, rb.w * SPACE, rb.d * SPACE, b.rotation);
  return A.x0 < B.x1 - e && B.x0 < A.x1 - e && A.z0 < B.z1 - e && B.z0 < A.z1 - e;
}

// A step in the room (dx across, dz towards the front) in the frame of a host
// turned by yaw degrees (a mirrored host's tops are already mirrored): for
// nudging a rider the way the arrow points.
export function intoHostFrame(dx, dz, yaw) {
  const a = (yaw * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return { x: +(dx * c - dz * s).toFixed(6), z: +(dx * s + dz * c).toFixed(6) };
}
