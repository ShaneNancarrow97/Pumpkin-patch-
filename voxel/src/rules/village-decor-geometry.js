// A single measured footprint for placement, walking and the decoration ghost.
import { VILLAGE_DECOR_BY_ID } from "../content/village-decor.js";

export function villageDecorBounds(id, x, z, rotation = 0) {
  const d = VILLAGE_DECOR_BY_ID[id]; if (!d || ![x, z, rotation].every(Number.isFinite)) return null;
  const a = rotation * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const w = Math.abs(c) * d.w + Math.abs(s) * d.d, h = Math.abs(s) * d.w + Math.abs(c) * d.d;
  return { x0: x - w / 2, x1: x + w / 2, z0: z - h / 2, z1: z + h / 2 };
}
// Closest point on the turned rectangle, including a walker's circular radius.
export function villageDecorContains(id, x, z, rotation, pointX, pointZ, radius = 0) {
  const d = VILLAGE_DECOR_BY_ID[id]; if (!d || ![x, z, rotation, pointX, pointZ, radius].every(Number.isFinite) || radius < 0) return false;
  const a = rotation * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), dx = pointX - x, dz = pointZ - z;
  const u = Math.abs(dx * c - dz * s) - d.w / 2, v = Math.abs(dx * s + dz * c) - d.d / 2;
  return u <= 0 && v <= 0 || Math.hypot(Math.max(0, u), Math.max(0, v)) < radius;
}
