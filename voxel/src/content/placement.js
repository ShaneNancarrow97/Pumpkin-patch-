// Standing pieces on other pieces: which are small enough to go on a table or a
// shelf, and the flat tops that take them. The tops are measured from the models
// (decor-sizes.js, written by tools/measure-decor.mjs), so they follow the art;
// the blank shelves list their own boards in shelf-catalog.js.
//
// A surface is { x, z, w, d, y, h? } in room units, in its host's own unturned
// frame: x across the host's footprint from its left edge, z from its back edge
// (a wall piece: out from the wall), y the top above the host's base (a wall
// piece: above its bottom edge), h the room above it where something overhangs.
import { DECOR_SIZES } from "./decor-sizes.js";

// Lamps, candles and little curios: small enough to stand on a table top.
export const SMALL_PIECES = Object.freeze(["d01", "d03", "d05", "d06", "d07", "d08", "d12", "d15"]);
// How much of a small piece must be over its surface: its base, not the spread
// of a shade, a handle or a bouquet. The rest may reach out over the edge.
export const BASE = 0.55;
// A shelf board's thickness, taken off the room between one tier and the next.
export const BOARD = 0.1;

// Pieces with a flat top worth standing things on. Their tops are the measured
// flat places at least 0.4 up, open above and big enough to hold something, so
// the shelves inside bookcases (for books), seats, beds and the cauldron's brew
// stay out. The looking-glass vanity's top is crowded with keepsakes and has no
// clear place big enough.
const HOSTS = ["f07", "f08", "f09", "f10", "f13", "f14", "copper-range", "copper-sink-island", "preserves-dresser", "gothic-spice-cabinet"];
const OPEN = 1, LOW = 0.4, AREA = 0.1;

// A host's measured tops in its own frame, given its footprint (w × d) and whether it hangs on a wall.
export function measuredSurfaces(id, w, d, wall) {
  if (!HOSTS.includes(id)) return [];
  return (DECOR_SIZES[id]?.tops ?? [])
    .filter(([y, x0, x1, z0, z1, room]) => y >= LOW && room >= OPEN && (x1 - x0) * (z1 - z0) >= AREA)
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .map(([y, x0, x1, z0, z1, room]) => Object.freeze({ x: +(x0 + w / 2).toFixed(3), z: +(z0 + (wall ? 0 : d / 2)).toFixed(3), w: +(x1 - x0).toFixed(3), d: +(z1 - z0).toFixed(3), y, ...(room < 9 ? { h: room } : {}) }));
}
