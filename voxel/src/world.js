import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { hollowPathDistance } from "./content/hollow-house.js";
import { pumpkinBlock } from "./pumpkins.js";
import { buildGround, grounds } from "./ground.js";
import { Face } from "./face.js";
import { PLOT_POSITIONS, inFarmPatch, DROP, GATE_Z, patchShape } from "./content/farm-layout.js";

// World units: 1 = one ground tile. x runs west to east (0-40), z north to
// south (0-29, the camera sits to the south), y is up. Everything from the
// patch forward sits DROP (content/farm-layout.js) further south than the first
// farm, leaving the lantern walk between the buildings and the patch. Layout follows
// docs/GAME-BIBLE.md §3: cottage top left, big pumpkin left, the patch in the
// centre, Skyla's shop top right, the stone path up the right, fence along the
// bottom, and an arch at the back opening onto the lake.
export const MAP = { w: 40, d: 26 + DROP };
// Camera tilt: low enough to show the sides of the cottage, the shop, fences and
// trees, and the far shore over the back fence; steep enough to see over the
// patch's front rows and under the shop awning to Skyla on the counter.
export const PITCH = THREE.MathUtils.degToRad(36);
// The cast are flat sprites (or sprite-deep voxel figures) that lean back
// towards the camera, the way sprite games tilt them, stretched by 1 / cos of the
// angle left between them and the camera so the art keeps its drawn proportions.
// The angle stays as it was at the old, steeper camera, so they stand straighter.
export const LEAN = PITCH - THREE.MathUtils.degToRad(27.4), STRETCH = 1 / Math.cos(PITCH - LEAN);
// The first twelve IDs retain their positions; purchased south-field rows follow.
export const PLOTS = PLOT_POSITIONS;
export const BIG_PUMPKIN = { x: 7, z: 15.5 + DROP };
export const COTTAGE = { x: 7, z: 6.4 };
export const SHOP = { x: 32, z: 5.6, counterZ: 8.6 };
export const HOMES = { natalie: { x: 13.2, z: 13.6 + DROP }, shane: { x: 27, z: 13.6 + DROP } };
// Visitors walk in from the south edge, up the path to the fork, along the
// spur to Skyla's counter, then back to the fork and out to the north-east.
export const ROUTE_IN = [[33, 28.5], [33, 24], [32.4, 21.6], [30.4, 18.6], [30.2, 15.6], [31.6, 12.6]].map(([x, z]) => [x, z + DROP]).concat([[31.8, 10.2]]);
export const ROUTE_OUT = [[31.8, 10.2], [31.6, 12.6], [35, 10.6], [38, 8.6], [42.5, 6.6]];
const PATH = [[33, 27 + DROP], ...ROUTE_IN.slice(1, 6), [31.7, 11.4], [35, 10.6], [38, 8.6], [41, 7]];

export const COL = {
  grass: [0x2e3020, 0x36321f, 0x2a2a1e, 0x3a3222],
  yard: [0x5c4b48, 0x524245, 0x67544f, 0x584749, 0x4c3e40],
  soil: 0x4e3020, furrow: 0x3a2216,
  stone: [0x8c8094, 0x7a6f84, 0x9a8d9e, 0x6c6276],
  wood: 0x5a3a26, woodDark: 0x3b2618, woodLight: 0x7a5236,
  plaster: 0xe2d2b4, timber: 0x3b2618, roof: [0x4a2e2a, 0x553430, 0x3f2724],
  stoneWall: [0x6e6470, 0x5e5662, 0x7c7180],
  leaves: [0x8a2f1e, 0xc2552a, 0xe08a2e, 0x6a2a3a, 0xa8402a, 0x5a2a4a],
  trunk: 0x2e1f1a, iron: 0x1c1418, fence: 0x4a2e1c, fenceLight: 0x6a4428, lantern: 0xffc46a, window: 0xffb85a,
  awning: [0xd9782a, 0x5b2a4a], flowers: [0x9d55e6, 0xe8862e, 0xc2552a, 0x7a3fb0, 0xc89cff],
  hay: 0xd9b45a, produce: [0xf0821e, 0xc2352a, 0x9d55e6, 0xe8b23a, 0xd9d2ff],
};
// Canopy palettes, dark (underside) to light (sunlit top): red, orange and plum trees.
export const CANOPY = [
  [0x5a1820, 0x8a2422, 0xb8361e, 0xdc5a22, 0xf28a34],
  [0x7a2c16, 0xb0461a, 0xd8701e, 0xf29a30, 0xffc252],
  [0x3e1634, 0x60204a, 0x88305a, 0xb24862, 0xdc7458],
];

// The stone path out through the arch at the back, down to the lake.
const ARCH = { x: 20, z: 3 };
const nearArchPath = (x, z) => Math.abs(x - ARCH.x) < 1.15 && z < 10.4;

const nearPath = (x, z, width) => {
  let best = Infinity;
  for (let i = 1; i < PATH.length; i++) {
    const [ax, az] = PATH[i - 1], [bx, bz] = PATH[i], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best < width;
};
const edge = (x, z, width = MAP.w, depth = MAP.d) => x < -6.4 || x > width - 1.6 || z > depth - 1.6 || (z < 2.8 && !nearArchPath(x, z));

function cobbles(v, r, x, z, T, colors, amount) {
  v.box(x, -0.5, z, T, 0.5, T, 0x2a2430);                                                // grout
  for (const [ox, oz] of [[0, 0], [0.25, 0], [0, 0.25], [0.25, 0.25]])                   // four cobbles per tile
    v.box(x + ox + 0.02, 0, z + oz + 0.02, 0.21, 0.04 + r() * 0.04, 0.21, vary(colors[(r() * colors.length) | 0], amount, r));
}

// The yard's ground, as a dense height field (ground.js): stone paths, the
// cobbled yard, grass and leaves round the edges, and the tilled patch with a
// raised bed under each plot.
export function yardGround({ width = MAP.w, depth = MAP.d, plotsTier = 0, pathEnd = GATE_Z, extraPath = () => false } = {}) {
  const pad = (x, z) => x > 31 && x < 32.6 && z > 8.6 && z < 10.6;
  const beds = PLOTS.slice(0, plotsTier >= 4 ? 24 : plotsTier >= 3 ? 18 : 12);
  return buildGround({ x0: -8, x1: width, z0: -1, z1: depth + 5 }, (x, z) => {
    if (nearPath(x, z, 0.95) || nearArchPath(x, z) || pad(x, z) || hollowPathDistance(x, z) < .85 || plotsTier >= 3 && z >= 24 + DROP && z <= pathEnd + .8 && (Math.abs(x - 33) < .95 || Math.abs(x + 3) < .85) || extraPath(x, z)) return grounds.cobble(x, z, COL.stone, 0.42, 1, 0x2a2430);
    if (inFarmPatch(x, z, plotsTier)) {
      for (const p of beds) { const b = grounds.bed(x, z, p); if (b) return b; }
      return grounds.soil(x, z);
    }
    if (edge(x, z, z > MAP.d ? MAP.w : width, x > MAP.w ? MAP.d : depth)) return grounds.grass(x, z);
    return grounds.cobble(x, z, COL.yard, 0.3, 2, 0x2a2430);
  }, { farmView: true });
}
// Rough grass beyond the map's edges, for when the view is zoomed out.
function ground(v, r) {
  for (let x = -16; x < MAP.w + 16; x += .6) for (let z = -1; z < MAP.d + 12; z += .6) {
    if (x >= -8 && x < MAP.w && z < MAP.d + 5) continue;
    v.box(x, -0.5, z, .6, .5, .6, vary(COL.grass[(r() * 4) | 0], .06, r));
  }
}

// Autumn trees: a trunk and a hollow, lumpy canopy shaded dark underneath and
// bright on top, so each reads as a round voxel crown from above.
export function tree(v, r, x, z, size, kind = (r() * 3) | 0) {
  const pal = CANOPY[kind], s = 0.42, R = 1.9 * size, cy = 3.6 * size;
  v.block(x, 0, z, 0.5 * size, cy, 0.5 * size, COL.trunk);
  v.block(x + 0.3 * size, cy * 0.55, z, 0.9 * size, 0.22, 0.22, COL.trunk);
  for (let i = -R; i <= R; i += s) for (let j = -R; j <= R; j += s) for (let k = -R; k <= R; k += s) {
    const d = Math.hypot(i, j * 1.15, k) / R;
    if (d > 1 - r() * 0.14 || d < 0.72) continue;
    const shade = Math.round((j / R * 0.5 + 0.5) * 3 + (k / R) * 0.7 + (r() - 0.5) * 1.1);
    v.box(x + i, cy + j, z + k, s, s, s, vary(pal[Math.max(0, Math.min(4, shade))], 0.07, r));
  }
}

function lantern(v, x, y, z, lights, light = true) {
  v.block(x, y, z, 0.42, 0.08, 0.42, COL.iron);
  v.block(x, y + 0.08, z, 0.32, 0.4, 0.32, COL.lantern, true);
  v.block(x, y + 0.48, z, 0.42, 0.1, 0.42, COL.iron);
  v.block(x, y + 0.58, z, 0.12, 0.12, 0.12, COL.iron);
  if (light) lights.push({ x, y: y + 0.3, z });
}

export function lanternPost(v, x, z, lights, light = true) {
  v.block(x, 0, z, 0.24, 1.8, 0.24, COL.fence);
  v.block(x, 1.8, z, 0.34, 0.1, 0.34, COL.fenceLight);
  lantern(v, x, 1.9, z, lights, light);
}

// A jack-o'-lantern: a ribbed pumpkin with a glowing carved face.
function jackOLantern(v, r, x, z, s, lights) {
  pumpkinBlock(v, x, 0, z, s, 0xf0821e, r);
  const cx = x + s * 0.11, front = z + s * 0.66;
  for (const ex of [-0.22, 0.2]) v.box(cx + ex * s - s * 0.08, s * 0.42, front, s * 0.16, s * 0.14, 0.03, 0xffb13a, true);
  v.box(cx - s * 0.26, s * 0.18, front, s * 0.52, s * 0.1, 0.03, 0xffb13a, true);
  if (lights) lights.push({ x, y: 0.5, z: z + 0.6 });
}

function crate(v, r, x, z, w = 1.1) {
  v.block(x, 0, z, w, 0.62, 0.72, vary(COL.woodLight, 0.08, r));
  for (const y of [0.12, 0.42]) v.block(x, y, z + 0.37, w, 0.08, 0.02, COL.woodDark);   // slats
  for (let i = 0; i < Math.round(w / 0.24); i++) for (const dz of [-0.16, 0.12])
    v.block(x - w / 2 + 0.14 + i * 0.24, 0.62, z + dz + (r() - 0.5) * 0.05, 0.22, 0.2, 0.22, vary(COL.produce[(r() * 5) | 0], 0.08, r));
}

function barrel(v, r, x, z) {
  v.block(x, 0, z, 0.62, 0.9, 0.62, 0x6a4028);
  v.block(x, 0.12, z, 0.72, 0.66, 0.72, 0x7a4a2e);
  for (const y of [0.18, 0.66]) v.block(x, y, z, 0.74, 0.06, 0.74, 0x2a2020);
  for (let i = 0; i < 4; i++) v.block(x - 0.15 + (i % 2) * 0.3, 0.9, z - 0.15 + (i >> 1) * 0.3, 0.26, 0.2, 0.26, vary(COL.produce[(r() * 3) | 0], 0.08, r));
}

function hay(v, r, x, z, w = 1.4) {
  for (let i = 0; i < w; i += 0.2) for (let j = 0; j < 0.7; j += 0.175) v.box(x - w / 2 + i, j, z - 0.45, 0.2, 0.175, 0.9, vary(COL.hay, 0.08, r));
  for (const dx of [-w / 4, w / 4]) v.block(x + dx, 0, z, 0.06, 0.72, 0.92, 0x8a6a2a);  // twine
}

function bench(v, x, z) {
  for (const dx of [-0.65, 0.65]) v.block(x + dx, 0, z, 0.12, 0.45, 0.4, COL.woodDark);
  v.block(x, 0.45, z, 1.7, 0.1, 0.48, COL.woodLight);
  for (const dx of [-0.65, 0.65]) v.block(x + dx, 0.45, z - 0.2, 0.1, 0.6, 0.08, COL.woodDark);
  v.block(x, 0.82, z - 0.2, 1.7, 0.18, 0.06, COL.woodLight);
}

function flowers(v, r, x, z, n = 6) {
  for (let i = 0; i < n; i++) {
    const fx = x + (r() - 0.5) * 0.9, fz = z + (r() - 0.5) * 0.7;
    v.box(fx, 0, fz, 0.05, 0.22, 0.05, 0x3d5a2a);
    v.box(fx - 0.06, 0.22, fz - 0.06, 0.17, 0.12, 0.17, COL.flowers[(r() * 5) | 0]);
  }
}

// The cottage and the shop are built finer than the rest of the farm, at the
// ground's grain (B): fronts painted cell by cell (face.js) and merged into
// few boxes, roofs of staggered shingles, and little iron lanterns. cottage.js
// builds the house from the same kit.
export const B = 0.1;
export const hash = (i, j, k = 0) => {
  let h = (i * 374761393 + j * 668265263 + k * 1274126177) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
// Smooth value noise, for weathered plaster and patches of moss.
export function noise(x, y, k = 0) {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, w = y - j, su = u * u * (3 - 2 * u), sw = w * w * (3 - 2 * w);
  const a = hash(i, j, k), b = hash(i + 1, j, k), c = hash(i, j + 1, k), d = hash(i + 1, j + 1, k);
  return a + (b - a) * su + (c - a) * sw + (a - b - c + d) * su * sw;
}
// Colours mixed channel by channel in sRGB, as a painter would mix them.
export const mix = (a, b, t) => {
  const ch = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
export const shade = (c, t) => mix(c, 0x000000, t), tint = (c, t) => mix(c, 0xffffff, t);
// How many cells out from a shape a cell lies, up to n: 1 is next door, 0 further.
export function ring(inside, i, j, n) {
  for (let k = 1; k <= n; k++) for (let a = -k; a <= k; a++) for (let b = -k; b <= k; b++) if ((Math.abs(a) === k || Math.abs(b) === k) && inside(i + a, j + b)) return k;
  return 0;
}
// Puts a painted front's merged runs into v, standing in the plane z from
// (x0, y0): each run a box from `back` behind the plane to its relief in front.
export const facing = (v, x0, y0, z, back = 0.1) => (u, y, w, h, out, c, glow) => v.box(x0 + u, y0 + y, z - back, w, h, back + out, c, glow);
// [a, b] with the spans in `gaps` taken out.
export const without = (a, b, gaps) => gaps.reduce((spans, [g0, g1]) => spans.flatMap(([s, e]) => (g1 <= s || g0 >= e ? [[s, e]] : [[s, g0], [g1, e]].filter(([p, q]) => q - p > 0.04))), [[a, b]]);

// A roof slope facing the camera, in courses of shingles from the eaves at
// (y, z) up to the ridge: each course rises `rise` and steps back `run`, and
// every shingle runs back to the ridge so the roof is solid for shadows. The
// shingles take tones at random (neighbours of a tone merge into one box), moss
// gathers in patches, `lean` shifts each course sideways for a crooked roof,
// and gaps(z, y) gives the spans to leave out there, where a tower stands.
export function shingles(v, r, { x0, x1, y, z, n, rise, run, tones, moss, lean = 0, gaps = () => [] }) {
  const ridge = z - n * run;
  for (let k = 0; k < n; k++) {
    const zk = z - k * run, yk = y + k * rise;
    for (const [s, e] of without(x0 + lean * k, x1 + lean * k, gaps(zk, yk))) {
      let x = s, from = s, c0 = -1;
      const flush = (to) => { if (c0 >= 0) v.box(from, yk, ridge, to - from, rise, zk - ridge, c0); };
      while (x < e - 0.01) {
        const mossy = moss && noise(x * 0.9, k * 0.32, 7) > 0.68 && r() < 0.85;
        const c = mossy ? moss[(r() * moss.length) | 0] : tones[(r() * tones.length) | 0];
        if (c !== c0) { flush(x); from = x; c0 = c; }
        x = Math.min(e, x + (k % 2 && x === s ? 0.15 : 0.2 + ((r() * 3) | 0) * 0.1));
      }
      flush(e);
    }
  }
  return ridge;
}

// A little iron lantern on a bracket from a wall or post whose face is at z,
// glowing between its corner bars under a stepped cap.
export function wallLantern(v, x, y, z) {
  const iron = COL.iron;
  v.box(x - 0.03, y + 0.54, z, 0.06, 0.05, 0.26, iron);
  v.box(x - 0.025, y + 0.36, z, 0.05, 0.18, 0.05, iron);
  v.box(x - 0.15, y + 0.42, z + 0.07, 0.3, 0.06, 0.3, iron);
  v.box(x - 0.09, y + 0.48, z + 0.13, 0.18, 0.06, 0.18, iron);
  v.box(x - 0.11, y + 0.06, z + 0.11, 0.22, 0.36, 0.22, COL.lantern, true);
  for (const dx of [-0.135, 0.095]) v.box(x + dx, y + 0.06, z + 0.3, 0.04, 0.36, 0.04, iron);
  v.box(x - 0.14, y, z + 0.08, 0.28, 0.06, 0.28, iron);
}

// A little pumpkin, ribbed in a few boxes: the middle lobe catches the light,
// creases either side, and the lobes round away into shade at the sides, under
// a stem that curls over at the tip.
export function gourd(v, x, y, z, s, colour) {
  v.box(x - s / 2, y + s * 0.12, z - s * 0.3, s, s * 0.4, s * 0.6, shade(colour, 0.26));
  v.box(x - s * 0.42, y + s * 0.04, z - s * 0.42, s * 0.84, s * 0.56, s * 0.84, shade(colour, 0.08));
  v.box(x - s * 0.3, y, z - s / 2, s * 0.6, s * 0.62, s, colour);
  v.box(x - s * 0.13, y + s * 0.04, z + s / 2, s * 0.26, s * 0.54, 0.006, tint(colour, 0.14));
  for (const dx of [-0.3, 0.25]) v.box(x + dx * s, y + s * 0.1, z + s / 2, s * 0.05, s * 0.44, 0.006, shade(colour, 0.38));
  v.box(x - s * 0.05, y + s * 0.56, z - s * 0.05, s * 0.1, s * 0.22, s * 0.1, 0x5e5a26);
  v.box(x - s * 0.01, y + s * 0.72, z - s * 0.05, s * 0.14, s * 0.06, s * 0.1, 0x7a7430);
}

// The yard in front of the cottage: stone steps up to the door with pumpkins
// on them, a jack-o'-lantern, the signpost, a crate of pumpkins and a cask, the
// last two as the shop's. The house itself is rebuilt as it grows (cottage.js).
function cottageYard(v, r, lights) {
  const { x, z } = COTTAGE, front = z + 2.5, x0 = x - 3.5;
  // Three steps of stone slabs up to the threshold, each worn pale along its nose.
  for (let k = 0; k < 3; k++) {
    const y = k * 0.233, deep = 1.05 - k * 0.35, half = 1.15 - k * 0.12;
    for (let s = x - half, n = 0; s < x + half - 0.05; n++) {
      const len = Math.min(x + half - s, 0.55 + r() * 0.4), c = vary(COL.stoneWall[(r() * 3) | 0], 0.08, r);
      v.box(s, y, front - 0.1, len - 0.025, 0.2, deep + 0.1, c);
      v.box(s, y + 0.2, front - 0.1, len - 0.025, 0.033, deep + 0.1, tint(c, 0.12));
      if (r() < 0.5) v.box(s + len - 0.06, y + 0.2, front + deep - 0.1, 0.07, 0.05, 0.08, 0x4a5a2a);   // moss in the joint
      s += len;
    }
  }
  gourd(v, x - 0.95, 0.467, front + 0.42, 0.26, 0xf0821e); gourd(v, x + 0.95, 0.233, front + 0.78, 0.22, 0xd9d2ff);
  lights.push({ x: x - 1.2, y: 2, z: front + 0.12 });
  jackOLantern(v, r, x - 1.7, front + 0.5, 0.55, null);
  pumpkinBlock(v, x + 1.6, 0, front + 0.6, 0.45, 0xf0821e, r);
  pumpkinBlock(v, x + 1.5, 0.35, front + 0.1, 0.32, 0xd9d2ff, r);
  // The signpost: a post with an arm, and a board of two planks hung on rings.
  const sx = x0 - 0.6, sz = front + 1.6;
  v.box(sx - 0.09, 0, sz - 0.09, 0.18, 1.9, 0.18, COL.fence); v.box(sx - 0.05, 0, sz + 0.09, 0.1, 1.85, 0.01, COL.fenceLight);
  v.box(sx - 0.09, 1.72, sz - 0.05, 1.3, 0.1, 0.1, COL.fence);
  for (const dx of [0.2, 0.95]) v.box(sx + dx, 1.5, sz + 0.02, 0.03, 0.22, 0.03, COL.iron);
  for (const [dy, c] of [[0.98, COL.woodLight], [1.24, vary(COL.woodLight, 0.1, r)]]) v.box(sx + 0.05, dy, sz - 0.03, 1.05, 0.26, 0.08, c);
  v.box(sx + 0.05, 1.22, sz + 0.05, 1.05, 0.02, 0.01, COL.woodDark);
  v.box(sx + 0.16, 1.08, sz + 0.05, 0.24, 0.2, 0.03, 0xe8862e); v.box(sx + 0.25, 1.28, sz + 0.05, 0.05, 0.06, 0.03, 0x5e5a26); // a painted pumpkin
  for (let k = 0; k < 3; k++) v.box(sx + 0.5, 1.3 - k * 0.09, sz + 0.05, 0.5 - k * 0.12, 0.03, 0.01, 0xe8dcc0);   // and a few words under it
  produceCrate(v, r, x + 3.6, front + 0.6); cask(v, r, x + 4.7, front + 0.4);
  return { door: { x, z: front + 1.2 } };
}

function bigPumpkinStage(v, r) {
  const { x, z } = BIG_PUMPKIN;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) for (let rr = 0; rr < 2.6; rr += 0.5)
    v.block(x + Math.cos(a) * rr, 0, z + Math.sin(a) * rr * 0.9, 0.55, 0.5, 0.55, rr > 2.2 ? 0x4a1e1a : vary(0x6a2a20, 0.1, r)); // round wine-red dais
  for (let a = 0.3; a < Math.PI * 2; a += Math.PI / 6) {
    const cx = x + Math.cos(a) * 2.9, cz = z + Math.sin(a) * 2.6, h = 0.22 + ((a * 7) % 3) * 0.08;
    v.block(cx, 0, cz, 0.14, h, 0.14, 0xe8dcc8);                                       // candles
    v.block(cx, h, cz, 0.07, 0.12, 0.07, 0xffd36a, true);
  }
  flowers(v, r, x - 3.2, z + 2.2, 5); flowers(v, r, x + 3, z - 2.4, 4);
}

// Pale stones edging the patch, each a little rounded and set at its own height.
function patchBorder(v, r) {
  const p = patchShape(0);
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    const x = p.x + Math.cos(a) * (p.rx + 0.3), z = p.back + Math.sin(a) * (p.rz + 0.3), h = 0.14 + r() * 0.08, c = vary(0xa89cb0, 0.12, r);
    if (nearPath(x, z, 1.2)) continue;
    v.block(x, 0, z, 0.26, h, 0.26, c);
    v.block(x, h, z, 0.18, 0.05, 0.18, vary(c, 0.06, r));
  }
}

// Little pictures painted cell by cell (rows top down, one character an ink)
// and built standing in the plane z from (x, y): chalk drawings, a banner's
// emblem, the haven's ghosts and bats.
export function pixelArt(v, art, inks, x, y, z, size = B, back = 0.1) {
  const f = new Face(art[0].length, art.length, size);
  art.forEach((row, k) => [...row].forEach((ch, i) => f.set(i, art.length - 1 - k, inks[ch])));
  f.build(facing(v, x, y, z, back));
}

// A little pumpkin carved and lit, its face on the front.
function jackGourd(v, x, y, z, s) {
  gourd(v, x, y, z, s, 0xe8862e);
  const f = z + s / 2 + 0.004;
  for (const dx of [-0.27, 0.09]) v.box(x + dx * s, y + s * 0.34, f, s * 0.17, s * 0.13, 0.014, 0xffc46a, true);
  v.box(x - s * 0.22, y + s * 0.13, f, s * 0.44, s * 0.09, 0.014, 0xffc46a, true);
}

// A jar on the shop's rack, after the kitchen's (fixtures.js) in a few boxes:
// its contents (glowing, or dark jams and pickles) seen through the glass up to
// a level, pale glass above and down its sides with a glint, stepping in at the
// shoulder to a neck and a cork, a gingham cap tied with twine, or a glass
// stopper. A bottle runs up into a long neck. Sometimes a paper label.
const JAR = { jar: [[0.8, 1], [0.9, 0.72], [1, 0.76]], squat: [[0.78, 1], [0.9, 0.84], [1, 0.84]], stopper: [[0.72, 1], [0.84, 0.62], [1, 0.58]], bottle: [[0.5, 1], [0.6, 0.66], [0.68, 0.4], [1, 0.36]] };
const CORK = 0xa8784a, TWINE = 0xb89a68, PAPER = 0xe8dcc0, INK = 0x4a3020;
function jar(v, r, x, y, z, w, h, colour, lit, kind = "jar") {
  const prof = JAR[kind], d = w * 0.9, glass = mix(colour, 0xb8b0d0, 0.5), body = h * prof[0][0], g = Math.min(0.02, w * 0.1);
  const tier = (y0, y1, f, c, out = 0) => v.box(x + (w * (1 - f)) / 2 - out, y0, z - (d * f) / 2 - out, w * f + 2 * out, y1 - y0, d * f + 2 * out, c);
  tier(y, y + body, 1, glass);
  v.box(x + g, y + 0.012, z - d / 2 + g, w - 2 * g, body * (kind === "bottle" ? 0.9 : 0.7 + r() * 0.22), d - g + 0.008, colour, lit);
  prof.slice(1).forEach(([t, f], k) => tier(y + h * prof[k][0], y + h * t, f, glass));
  v.box(x + g + 0.01, y + body * 0.3, z + d / 2, 0.015, body * 0.6, 0.012, 0xfff4e8);
  const neck = prof[prof.length - 1][1], top = y + h;
  if (kind === "squat") {
    const cap = [0xa83a2a, 0x3a5a8a, 0x5a7a3a][(r() * 3) | 0];
    tier(top - 0.04, top + 0.025, neck, cap, 0.015); tier(top + 0.025, top + 0.035, neck * 0.8, tint(cap, 0.5));
    tier(top - 0.03, top - 0.015, neck, TWINE, 0.022);
  } else if (kind === "stopper") {
    tier(top, top + 0.02, neck * 1.1, tint(glass, 0.2)); tier(top + 0.02, top + 0.08, neck * 1.25, tint(glass, 0.3)); tier(top + 0.08, top + 0.1, neck * 0.7, tint(glass, 0.5));
  } else {
    tier(top, top + 0.05, neck * 0.9, CORK); tier(top + 0.05, top + 0.06, neck * 0.7, tint(CORK, 0.18));
  }
  if (r() < 0.45) {
    v.box(x + w * 0.14, y + body * 0.24, z + d / 2, w * 0.72, body * 0.34, 0.016, PAPER);
    v.box(x + w * 0.26, y + body * 0.38, z + d / 2 + 0.016, w * 0.48, 0.014, 0.004, INK);
  }
}

// A bale of straw, its face in short streaks of straw, bound with two twines,
// a few wisps loose on top.
function bale(v, r, x, z, w = 1.2) {
  const H = 0.6, D = 0.8, x0 = x - w / 2, f = new Face(Math.round(w / 0.05), Math.round(H / 0.05), 0.05), tones = [0xd9b45a, 0xc8a04a, 0xe8c870, 0xb08a3a];
  f.paint(0, 0, f.cols, f.rows, (i, j) => {
    if ([0.25, 0.75].some((t) => Math.abs(i + 0.5 - f.cols * t) < 0.6)) return [0x6a4a26, 0.02];
    const n = hash(Math.floor((i + hash(j, 3, 51) * 6) / 4), j, 52);
    return [tones[(n * 4) | 0], (n * 4) % 1 < 0.3 ? 0.012 : 0];
  });
  f.shade((i, j) => (j < 2 ? 0.2 : 0));
  f.build(facing(v, x0, 0, z + D / 2, D));
  v.box(x0, H, z - D / 2, w, 0.015, D, tones[0]);
  for (const t of [0.25, 0.75]) v.box(x0 + w * t - 0.03, H, z - D / 2, 0.06, 0.03, D, 0x6a4a26);
  for (let k = 0; k < 7; k++) v.box(x0 + 0.1 + r() * (w - 0.3), H + 0.015, z - D / 2 + 0.1 + r() * (D - 0.2), 0.12 + r() * 0.1, 0.02, 0.03, tones[(r() * 4) | 0]);
}

// A slatted crate of little pumpkins on a bed of straw.
function produceCrate(v, r, x, z, w = 1.1) {
  const d = 0.7, x0 = x - w / 2, z0 = z - d / 2;
  v.box(x0 + 0.04, 0.02, z0 + 0.04, w - 0.08, 0.42, d - 0.08, COL.hay);
  for (const [y, h] of [[0, 0.14], [0.18, 0.13], [0.35, 0.13]]) for (const sz of [z0, z0 + d - 0.04]) v.box(x0, y, sz, w, h, 0.04, vary(COL.woodLight, 0.08, r));
  for (const sx of [x0, x0 + w - 0.06]) v.box(sx, 0, z0 + d - 0.06, 0.06, 0.5, 0.07, COL.woodDark);
  v.box(x - 0.13, 0.2, z0 + d, 0.26, 0.08, 0.005, 0x3a2418);                          // the farm's stencilled mark
  // Two rows of little pumpkins with a gap between each, so they read as pumpkins rather than a heap.
  const n = Math.max(2, Math.round((w - 0.1) / 0.27));
  for (let i = 0; i < n; i++) for (const dz of [-0.15, 0.13]) gourd(v, x0 + 0.05 + (i + 0.5) * (w - 0.1) / n + (r() - 0.5) * 0.03, 0.42 + (dz < 0 ? 0.04 : 0), z + dz, 0.19 + r() * 0.05, vary(COL.produce[(r() * 5) | 0], 0.06, r));
}

// A cask bellied in five tiers, two iron hoops, and pumpkins on its lid.
function cask(v, r, x, z) {
  [0.56, 0.64, 0.68, 0.64, 0.56].forEach((w, k) => v.block(x, k * 0.17, z, w, 0.17, w, vary(0x6e4228, 0.05, r)));
  for (const y of [0.15, 0.66]) v.block(x, y, z, 0.67, 0.045, 0.67, 0x2a2020);
  v.block(x, 0.85, z, 0.5, 0.03, 0.5, 0x5a3420);
  gourd(v, x - 0.12, 0.88, z - 0.06, 0.26, 0xf0821e); gourd(v, x + 0.13, 0.88, z + 0.08, 0.2, 0xd9d2ff);
}

// The chalkboard on its easel: a pumpkin drawn in chalk, the day's list and a price.
const CHALKBOARD = [
  "................", "........g.......", ".....oo.g.oo....", "....o..ooo..o...", "...o...o.o...o..", "...o...o.o...o..",
  "....o..o.o..o...", ".....ooooooo....", "................", "..wwwww.www.ww..", "................", "..www.wwwwww.w..",
  "................", "..wwww.ww.www....", "................", "....ww...www....", "...w.......w....", "..www....www....",
  "...w.......w....", "..wwww...www....",
];
function chalkboard(v, x, z) {
  const W = 0.8, H = 1.0, y0 = 0.42, wood = COL.woodLight;
  pixelArt(v, CHALKBOARD, { ".": [0x1e1e24, 0], w: [0xe8e2d8, 0.004], o: [0xf0a060, 0.004], g: [0x9ac070, 0.004] }, x - W / 2, y0, z, B / 2, 0.04);
  for (const [bx, by, bw, bh] of [[-W / 2 - 0.06, y0 - 0.06, W + 0.12, 0.06], [-W / 2 - 0.06, y0 + H, W + 0.12, 0.06], [-W / 2 - 0.06, y0, 0.06, H], [W / 2, y0, 0.06, H]]) v.box(x + bx, by, z - 0.05, bw, bh, 0.08, wood);
  for (const dx of [-W / 2 - 0.05, W / 2 + 0.01]) v.box(x + dx, 0, z - 0.04, 0.04, y0 + H + 0.1, 0.05, COL.woodDark);
  for (let k = 0; k < 5; k++) v.box(x - 0.03, k * 0.28, z - 0.12 - (4 - k) * 0.09, 0.06, 0.28, 0.06, COL.woodDark);   // the back leg, raked
  v.box(x - W / 2, y0 - 0.12, z - 0.02, W, 0.04, 0.06, COL.woodDark);                    // the chalk ledge
  v.box(x + 0.1, y0 - 0.08, z + 0.01, 0.12, 0.025, 0.025, 0xf4f0e8);
}

// Skyla's banner on an iron pole: plum cloth with a gold border and a
// swallowtail, a pumpkin under a crescent moon.
const BANNER = [
  "yyyyyyyyyyy", "ypppppppppy", "ypppyyppppy", "yppyypppppy", "yppyypppppy", "ypppyyppppy", "ypppppppppy", "yppppgppppy",
  "ypppooopppy", "yppooooOppy", "yppooooOppy", "ypppooopppy", "ypppppppppy", "ypppppppppy", "ypppy.ypppy", "yppy...yppy", "yyy.....yyy",
];
// The banner hangs west from its pole, towards the shop, so the meadow's
// opening to the east (festival-meadow-world.js) never cuts it in half.
function banner(v, x, z) {
  v.box(x - 0.06, 0, z - 0.06, 0.12, 3.8, 0.12, COL.iron);
  v.box(x - 0.1, 3.8, z - 0.1, 0.2, 0.08, 0.2, COL.iron); v.box(x - 0.03, 3.88, z - 0.03, 0.06, 0.24, 0.06, COL.iron);
  v.box(x - 1.26, 3.62, z - 0.03, 1.26, 0.05, 0.06, COL.iron); v.box(x - 1.28, 3.55, z - 0.04, 0.08, 0.08, 0.08, COL.iron);
  pixelArt(v, BANNER, { p: [0x5b2a4a, 0], y: [0xd9a84a, 0.01], o: [0xe8862e, 0.02], O: [0xb85a1e, 0.02], g: [0x5e7a2a, 0.02] }, x - 0.08 - BANNER[0].length * B, 3.6 - BANNER.length * B, z + 0.02, B, 0.04);
}

// The Honest Pumpkin, Skyla's stall, built at the ground's grain like the
// cottage. A gable over the back wall carries the sign (scene.js hangs it) on
// a carved fascia, with moon windows either side, fairy lights up its edges and
// a lit pumpkin on top. A shingled roof with a stovepipe runs out to a striped
// canvas awning on the front posts, with a scalloped valance. Under it, seen
// over the panelled counter where Skyla sits, a rack of jars and little
// pumpkins; and out front, crates, a cask, straw, a chalkboard and a banner.
const PUMPKIN5 = ["..g..", ".ooo.", "ooooo", "ooooo", ".ooo."], MOON5 = [".yy..", "yy...", "y....", "yy...", ".yy.."];
function shop(v, r, lights) {
  const { x, z, counterZ } = SHOP, w = 9, d = 5, x0 = x - w / 2, x1 = x0 + w, z0 = z - d / 2;
  const carve = { o: [0xd9782a, 0.09], g: [0x5e7a2a, 0.09], y: [0xe8c070, 0.09] };
  // The shell: back and side walls, mostly hidden under the awning but solid for shadows.
  v.box(x0, 0, z0, w, 4.6, 0.4, COL.woodDark);
  for (const sx of [x0, x1 - 0.4]) v.box(sx, 0, z0, 0.4, 3.6, d, COL.wood);
  // The gable: boards and battens inside carved bargeboards, a fascia under
  // the sign carved with pumpkins and moons, and moon windows lit from within.
  const G = new Face(96, 24, B), edge = (i, j) => 48 - (j + 0.5) * 1.07 - Math.abs(i + 0.5 - 48);
  G.paint(0, 0, 96, 24, (i, j) => {
    const e = edge(i, j);
    if (e < 0) return null;
    if (e < 2.5) return [hash(i, j, 41) < 0.15 ? tint(COL.timber, 0.1) : COL.timber, 0.14];
    if (e < 3.5) return (i + 2 * j) % 4 === 0 ? [COL.timber, 0.11] : [shade(COL.wood, 0.3), 0.01];
    if (j < 3) return [j === 2 ? tint(COL.timber, 0.12) : COL.timber, 0.1];
    if (j < 8) {
      const k = Math.floor((i - 6) / 12), ch = (k % 2 ? MOON5 : PUMPKIN5)[7 - j][i - 6 - k * 12 - 4];
      return carve[ch] ?? [hash(Math.floor(i / 7), j, 42) < 0.3 ? shade(COL.woodLight, 0.08) : COL.woodLight, 0.06];
    }
    if (j === 8 || j > 21) return [COL.timber, 0.09];
    const wx = i < 48 ? 22 : 74, dm = Math.hypot(i + 0.5 - wx, j + 0.5 - 12);
    if (dm < 3) return Math.hypot(i + 0.5 - wx + (i < 48 ? -1.3 : 1.3), j - 12) > 2.3 ? [COL.lantern, -0.04, true] : [shade(COL.wood, 0.15), 0.05];
    if (dm < 3.9) return [COL.timber, 0.09];
    return i % 5 === 0 ? [shade(COL.wood, 0.25), 0.05] : [hash(i, Math.floor(j / 4), 43) < 0.2 ? tint(COL.wood, 0.08) : COL.wood, 0.02];
  });
  G.build(facing(v, x0 - 0.3, 4.6, z0 + 0.4, 0.5));
  v.box(x - 2.45, 7.0, z0, 4.9, 0.08, 0.58, COL.timber); v.box(x - 2.55, 7.08, z0 - 0.04, 5.1, 0.07, 0.66, tint(COL.timber, 0.1));
  jackGourd(v, x, 7.15, z0 + 0.26, 0.48);
  for (const dx of [-2.35, 2.35]) { v.box(x + dx - 0.03, 7.15, z0 + 0.22, 0.06, 0.3, 0.06, COL.iron); v.box(x + dx - 0.06, 7.38, z0 + 0.19, 0.12, 0.12, 0.12, COL.iron); }
  // Fairy lights up both bargeboards, each bulb on a little cap, so the gable shows its outline at night.
  for (let j = 1, k = 0; j < 23; j += 3) for (const side of [-1, 1]) {
    const bx = x + side * ((48 - 1.07 * (j + 0.5)) * B - 0.13), by = 4.6 + j * B;
    v.box(bx - 0.02, by + 0.05, z0 + 0.52, 0.04, 0.04, 0.05, COL.iron);
    v.box(bx - 0.045, by - 0.05, z0 + 0.55, 0.09, 0.1, 0.08, [0xffc46a, 0xffd894, 0xff9a4a, 0xc89cff][k++ % 4], true);
  }
  // A roof of small shingles from under the gable out to mid-stall, with
  // moss in patches and an iron stovepipe under a coolie hat.
  const aw0 = x - 4.95, eave = z0 + 3.1, ye = 4.45;
  shingles(v, r, { x0: aw0, x1: aw0 + 9.9, y: ye, z: eave, n: 11, rise: 0.4 / 11, run: (eave - z0 - 0.5) / 11, tones: [0x6a4430, 0x7a4e36, 0x5a3a28, 0x84583a], moss: [0x5e5a32, 0x525430] });
  // The shadow under each course's butt edge, which so low a pitch would otherwise lose.
  for (let k = 1, run = (eave - z0 - 0.5) / 11; k < 11; k++) v.box(aw0, ye + k * 0.4 / 11 - 0.01, eave - k * run, 9.9, 0.015, 0.05, 0x2e1c16);
  v.box(aw0 - 0.02, ye - 0.14, eave - 0.06, 9.94, 0.16, 0.1, COL.timber);
  const cx = x + 3.6, cz = z0 + 1.5;
  v.block(cx, 4.62, cz, 0.34, 0.08, 0.34, 0x4a4450);
  v.block(cx, 4.62, cz, 0.18, 1.3, 0.18, 0x2a2226);
  for (const y of [5.05, 5.5]) v.block(cx, y, cz, 0.22, 0.05, 0.22, 0x3a3238);
  v.block(cx, 5.92, cz, 0.1, 0.08, 0.1, 0x1a1214);
  v.block(cx, 6.0, cz, 0.38, 0.05, 0.38, 0x2a2226); v.block(cx, 6.05, cz, 0.22, 0.06, 0.22, 0x2a2226);
  // The awning: canvas in fine orange and plum stripes from a roller under
  // the eaves down to the beam, sagging between its ribs and along its run.
  const zb = eave + 0.05, zf = counterZ - 0.1, yb = ye - 0.12, yf = 4.0, n = 8;
  v.box(aw0, yb - 0.2, eave - 0.2, 9.9, 0.22, 0.26, shade(COL.awning[1], 0.25));
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, y = yb + (yf - yb) * t - 0.04 * Math.sin(Math.PI * t), za = zb + (zf - zb) * k / n;
    for (let s = 0; s < 22; s++) {
      const sag = 0.035 * Math.sin(Math.PI * (((s + 0.5) * 4 / 22) % 1));
      v.box(aw0 + s * 0.45, y - 0.04 - sag, za, 0.45, 0.08, (zf - zb) / n + 0.01, shade(COL.awning[s % 2], sag * 3 + (k % 2) * 0.03));
    }
  }
  // Its valance, scalloped stripe by stripe under a gold braid, with a tassel on each scallop.
  const val = new Face(198, 7, B / 2);
  val.paint(0, 0, 198, 7, (i, j) => {
    const s = Math.floor(i / 9), u = i % 9, c = COL.awning[s % 2];
    if (j === 6) return [0xd9a84a, 0.015];
    if ((j === 0 && (u < 3 || u > 5)) || (j === 1 && (u < 1 || u > 7))) return null;
    return [u === 0 && j > 1 ? shade(c, 0.22) : c, 0];
  });
  val.build(facing(v, aw0, yf - 0.31, zf + 0.04, 0.05));
  for (let s = 0; s < 22; s++) v.box(aw0 + s * 0.45 + 0.2, yf - 0.37, zf - 0.01, 0.05, 0.06, 0.04, 0xd9a84a);
  // The front posts on stone footings, chamfered and collared, braced to the
  // beam, each with a lantern on a bracket.
  v.box(x0 - 0.05, yf - 0.32, counterZ - 0.5, w + 0.1, 0.3, 0.32, COL.timber);
  for (const px of [x0 + 0.175, x1 - 0.175]) {
    const pz = counterZ - 0.35, dir = px < x ? 1 : -1, h = yf - 0.5;
    v.block(px, 0, pz, 0.46, 0.22, 0.46, COL.stoneWall[1]);
    v.block(px, 0.22, pz, 0.35, h, 0.25, COL.woodDark); v.block(px, 0.22, pz, 0.25, h, 0.35, COL.woodDark);
    v.box(px - 0.04, 0.4, pz + 0.175, 0.08, h - 0.4, 0.01, shade(COL.woodDark, 0.3));
    for (const y of [0.5, 3.25]) v.block(px, y, pz, 0.41, 0.08, 0.41, COL.woodLight);
    for (let k = 0; k < 4; k++) v.block(px + dir * (0.24 + k * 0.1), yf - 0.72 + k * 0.1, pz, 0.12, 0.12, 0.16, COL.woodDark);
    wallLantern(v, px, 2.37, pz + 0.175);
    lights.push({ x: px, y: 2.6, z: counterZ + 0.05 });
  }
  // The rack behind the counter: a boarded back, three shelves of jars and
  // little pumpkins, in three bays.
  const rx0 = x0 + 0.7, rx1 = x1 - 0.7, rz = counterZ - 1.6, LIT = [0xffb85a, 0xf0821e, 0xb774ff, 0xd9d2ff, 0xf5c84a], DARK = [0x7a2432, 0x5e6a26, 0x4a2e6a, 0x8a4a22];
  for (let bx = rx0, k = 0; bx < rx1 - 0.01; bx += 0.2, k++) v.box(bx, 0, rz - 0.7, Math.min(0.2, rx1 - bx), 2.85, 0.1, k % 2 ? COL.woodDark : shade(COL.woodDark, 0.12));
  for (let b = 0; b <= 3; b++) v.box(rx0 + b * (rx1 - rx0 - 0.1) / 3, 0, rz - 0.62, 0.1, 2.85, 0.64, COL.wood);
  v.box(rx0 - 0.1, 2.85, rz - 0.72, rx1 - rx0 + 0.2, 0.1, 0.8, COL.woodLight);
  for (const y of [0.95, 1.55, 2.15]) {
    v.box(rx0, y, rz - 0.62, rx1 - rx0, 0.06, 0.62, COL.woodLight);
    v.box(rx0, y + 0.06, rz - 0.03, rx1 - rx0, 0.04, 0.03, COL.woodDark);
    for (let b = 0; b < 3; b++) {
      const e = rx0 + (b + 1) * (rx1 - rx0 - 0.1) / 3;
      for (let px = rx0 + b * (rx1 - rx0 - 0.1) / 3 + 0.16; px < e - 0.3;) {
        if (r() < 0.18) { gourd(v, px + 0.15, y + 0.06, rz - 0.3, 0.28, COL.produce[(r() * 4) | 0]); px += 0.38; continue; }
        const kind = ["jar", "jar", "squat", "stopper", "bottle"][(r() * 5) | 0], lit = r() < 0.6;
        const jw = kind === "bottle" ? 0.16 : kind === "squat" ? 0.26 : 0.2 + ((r() * 2) | 0) * 0.04, h = kind === "squat" ? 0.2 + r() * 0.04 : kind === "bottle" ? 0.34 + r() * 0.08 : 0.24 + r() * 0.1;
        jar(v, r, px, y + 0.06, rz - 0.28, jw, h, lit ? LIT[(r() * 5) | 0] : DARK[(r() * 4) | 0], lit, kind);
        px += jw + 0.06 + r() * 0.05;
      }
    }
  }
  // The counter: a panelled front, each panel carved with a pumpkin or a moon, under a thick top.
  v.box(x0 + 0.6, 0, counterZ - 0.9, w - 1.2, 1.15, 0.85, COL.wood);
  const C = new Face(78, 11, B);
  C.paint(0, 0, 78, 11, (i, j) => {
    const s = i % 15, ch = (Math.floor(i / 15) % 2 ? MOON5 : PUMPKIN5)[7 - j]?.[s - 6];
    if (j < 2) return [shade(COL.woodDark, 0.15), 0.04];
    if (s < 3 || j === 2 || j > 8) return [hash(i, Math.floor(j / 3) + (s < 3 ? 0 : i >> 3), 31) < 0.2 ? tint(COL.wood, 0.08) : COL.wood, 0.03];
    if (s === 3 || s === 14 || j === 3 || j === 8) return [shade(COL.wood, 0.28), 0.015];
    return carve[ch] ? [carve[ch][0], 0.06] : [tint(COL.wood, 0.1), 0.045];
  });
  C.build(facing(v, x0 + 0.6, 0, counterZ, 0.05));
  v.box(x0 + 0.55, 1.08, counterZ - 0.05, w - 1.1, 0.07, 0.1, COL.timber);
  // Its top: four boards, each butt-jointed once, seams between them and a pale worn nosing along the front.
  for (let k = 0; k < 4; k++) {
    const bz = counterZ - 1.0 + k * 0.275, joint = x0 + 0.5 + (0.2 + r() * 0.6) * (w - 1);
    for (const [a, b] of [[x0 + 0.5, joint], [joint, x1 - 0.5]]) v.box(a, 1.15, bz, b - a - 0.012, 0.15, 0.275, vary(COL.woodLight, 0.05, r));
    v.box(joint - 0.012, 1.15, bz, 0.012, 0.152, 0.275, shade(COL.woodLight, 0.35));
    if (k) v.box(x0 + 0.5, 1.15, bz - 0.006, w - 1, 0.152, 0.012, shade(COL.woodLight, 0.3));
  }
  v.box(x0 + 0.5, 1.276, counterZ + 0.06, w - 1, 0.028, 0.05, tint(COL.woodLight, 0.12));
  v.box(x0 + 0.5, 1.15, counterZ + 0.1, w - 1, 0.04, 0.01, shade(COL.woodLight, 0.25));
  for (let i = 0; i < 5; i++) jackOLantern(v, r, x0 + 1.4 + i * 1.6, counterZ + 0.25, 0.42, null);   // a row of lit pumpkins at its foot
  // On the counter: the brass till (a drawer, stepped rows of keys, the
  // window for the sum with its flag up, a crank), a ledger, a candle, a
  // basket of little pumpkins, and the bell Skyla rings.
  const tx = x - 2.3, tz = counterZ - 0.5, BRASS = 0xd9a35a, DEEP = 0x8a5a26;
  v.box(tx - 0.32, 1.3, tz - 0.22, 0.64, 0.12, 0.46, DEEP);
  v.box(tx - 0.1, 1.33, tz + 0.24, 0.2, 0.05, 0.01, BRASS);
  for (let k = 0; k < 3; k++) {
    v.box(tx - 0.3, 1.42 + k * 0.07, tz - 0.22, 0.6, 0.07, 0.44 - k * 0.12, BRASS);
    for (let i = 0; i < 5; i++) v.box(tx - 0.26 + i * 0.11, 1.49 + k * 0.07, tz + 0.14 - k * 0.12, 0.07, 0.02, 0.06, 0xf0e6d0);
  }
  v.box(tx - 0.22, 1.63, tz - 0.22, 0.44, 0.2, 0.14, BRASS); v.box(tx - 0.16, 1.68, tz - 0.08, 0.32, 0.1, 0.01, 0x2a1a12);
  v.box(tx - 0.1, 1.71, tz - 0.07, 0.2, 0.04, 0.01, 0xf0e6d0);
  v.box(tx - 0.05, 1.83, tz - 0.17, 0.1, 0.1, 0.02, 0xe8dcc0); v.box(tx - 0.25, 1.83, tz - 0.2, 0.5, 0.03, 0.12, DEEP);
  v.box(tx + 0.3, 1.5, tz - 0.04, 0.08, 0.06, 0.06, DEEP); v.box(tx + 0.36, 1.5, tz - 0.03, 0.03, 0.2, 0.03, DEEP);
  for (const [dx, c] of [[-0.14, 0xefe4cc], [0.01, 0xe8dcc0]]) v.box(x - 1.2 + dx, 1.3, counterZ - 0.4, 0.15, 0.025, 0.24, c);
  for (let k = 0; k < 3; k++) v.box(x - 1.32, 1.326, counterZ - 0.32 + k * 0.06, 0.1, 0.003, 0.012, 0x6a5a4a);
  v.box(x - 3.6, 1.3, counterZ - 0.4, 0.16, 0.03, 0.16, BRASS); v.box(x - 3.56, 1.33, counterZ - 0.36, 0.08, 0.2, 0.08, 0xe8dcc8);
  v.box(x - 3.54, 1.53, counterZ - 0.34, 0.04, 0.07, 0.04, 0xffd36a, true);
  v.box(x + 3.2, 1.3, counterZ - 0.5, 0.56, 0.16, 0.36, 0x9a6a3a); v.box(x + 3.2, 1.46, counterZ - 0.5, 0.56, 0.03, 0.36, 0x7a4a26);
  gourd(v, x + 3.35, 1.42, counterZ - 0.33, 0.22, 0xf0821e); gourd(v, x + 3.6, 1.42, counterZ - 0.3, 0.2, 0xe8b23a);
  const bx = x + 2.52, bz = counterZ - 0.48;
  [[0.26, 0.03, 0x6a4a2a], [0.2, 0.05, BRASS], [0.15, 0.04, BRASS], [0.09, 0.03, tint(BRASS, 0.2)], [0.03, 0.05, DEEP]].reduce((y, [s, h, c]) => (v.block(bx, y, bz, s, h, s, c), y + h), 1.3);
  // Out front: crates of pumpkins, a cask, hay, the chalkboard and the banner.
  produceCrate(v, r, x0 - 1.1, counterZ + 0.3); produceCrate(v, r, x0 - 0.8, counterZ + 1.3, 0.9);
  produceCrate(v, r, x1 + 0.7, counterZ - 0.6); cask(v, r, x1 + 0.8, counterZ + 0.6);
  bale(v, r, x1 + 0.6, counterZ + 1.8, 1.2);
  chalkboard(v, x + 4.2, counterZ + 1.66);
  banner(v, x1 + 1.5, counterZ - 1.4);
  return { lights: [{ x: x - 2, y: 3, z: counterZ - 1.5 }, { x: x + 2.4, y: 3, z: counterZ - 1.5 }] };
}

// Shared picket detail for the original boundary and purchased land.
export function fenceRun(v, r, ax, az, bx, bz, skip = () => false) {
  const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.4), ux = (bx - ax) / len, uz = (bz - az) / len;
  for (let i = 0; i <= n; i++) {
    const x = ax + ux * i * 0.4, z = az + uz * i * 0.4;
    if (skip(x, z)) continue;
    if (i % 4 === 0) { v.block(x, 0, z, 0.24, 1.25, 0.24, COL.fence); v.block(x, 1.25, z, 0.3, 0.08, 0.3, COL.fenceLight); }
    else v.block(x, 0, z, ux ? 0.16 : 0.08, 0.95 + (i % 2) * 0.06, uz ? 0.16 : 0.08, vary(COL.fenceLight, 0.12, r));
    if (i < n && !skip(x + ux * 0.4, z + uz * 0.4)) for (const y of [0.3, 0.75]) v.box(Math.min(x, x + ux * 0.4), y, Math.min(z, z + uz * 0.4), Math.abs(ux) * 0.4 + 0.08, 0.1, Math.abs(uz) * 0.4 + 0.08, COL.fence);
  }
}


// Wooden picket fences: round the front and sides, and across the back to the arch.
function fence(v, r, lights, front = v) {
  const run = (...args) => fenceRun(v, r, ...args);
  const f = 24.6 + DROP;
  fenceRun(front, r, -7.6, f, MAP.w - 0.4, f, (x) => x > 31.2 && x < 34.8 || x > -4.4 && x < -1.6);
  run(-7.6, 2.9, -7.6, f);
  run(-7.6, 2.9, 1, 2.9);
  for (const x of [-4.5, -1.5]) lanternPost(front, x, f, lights, false);
  run(39.6, 12.4, 39.6, f, (x, z) => nearPath(x, z, 1.2));
  run(11.2, 2.9, 27.4, 2.9, (x) => x > ARCH.x - 1.6 && x < ARCH.x + 1.6);
  for (const x of [4, 10, 16, 24, 30.6, 35.4]) lanternPost(front, x, f + 0.5, lights, x !== 10 && x !== 24);
  for (const z of [14, 20]) lanternPost(v, -6.9, z + DROP, lights, z === 20);
  for (const z of [16, 21.6]) lanternPost(v, 39.1, z + DROP, lights, false);
}

// The leafy arch over the back gate, with lanterns on its posts.
function arch(v, r, lights) {
  const { x, z } = ARCH;
  for (const dx of [-1.5, 1.5]) { v.block(x + dx, 0, z, 0.32, 2.9, 0.32, COL.fence); lantern(v, x + dx, 2.9, z + 0.3, lights, dx < 0); }
  for (let a = 0; a <= Math.PI; a += 0.07) for (let rr = 1.35; rr < 2.3; rr += 0.32) for (let dz = -0.45; dz < 0.5; dz += 0.32) {
    if (r() < 0.25) continue;
    v.block(x + Math.cos(a) * rr * 1.05, 2.4 + Math.sin(a) * rr * 0.95, z + dz, 0.34, 0.34, 0.34, vary(CANOPY[(r() * 2) | 0][1 + ((r() * 4) | 0)], 0.08, r));
  }
}

// String lights draped along the back fence either side of the arch.
function stringLights(v) {
  for (const [ax, bx] of [[11.2, 18.4], [21.6, 27.4]]) for (let x = ax; x < bx; x += 1.6) {
    for (let t = 0.05; t < 1; t += 0.12) {
      const px = x + t * 1.6, y = 1.55 - Math.sin(t * Math.PI) * 0.35;
      if (px > bx) break;
      v.block(px, y + 0.14, 2.9, 0.06, 0.04, 0.06, COL.iron);
      v.block(px, y, 2.9, 0.13, 0.15, 0.13, [0xffc46a, 0xffd894, 0xff9a4a, 0xc89cff][Math.round(px * 3) % 4], true);
    }
  }
}

// The far shore, painted as pixel art on a backdrop that leans back to face the
// camera: night sky, crescent moon, mountains, the castle on its hill, a lakeside
// village and its reflections. One pixel is an eighth of a world unit, the same
// grain as the finest voxels, so it reads as part of the voxel world.
export function buildBackdrop(pitch) {
  // The far shore sits just above the back row of trees (about 6 tall, a unit in
  // front of it) as the camera sees them, so the lake and the village lights show
  // over them at any tilt. The sky runs on up, darkest, for a zoomed-out tall phone.
  const shore = 6 * Math.cos(pitch) - 1.6 * Math.sin(pitch) + 0.4;
  // Wide enough to sit behind the wilds' hills on both sides (wilds.js).
  const U = 8, X0 = -70, W = 170 * U, H = 42 * U, horizon = H - Math.round(shore * U), top = horizon - 27.5 * U;
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d"), r = seeded(77), high = seeded(78);
  // A second canvas marks what twinkles, texel by texel, for the shader below:
  // lamps and lit windows, their reflections in the lake, and stars. Every paint
  // marks its texels, so whatever is painted over a light stops twinkling.
  const marks = document.createElement("canvas"); marks.width = W; marks.height = H;
  const mg = marks.getContext("2d"), LAMP = 255, GLINT = 160, STAR = 80;
  const hex = (c) => "#" + c.toString(16).padStart(6, "0");
  const px = (x, y, c, w = 1, h = 1, k = 0) => { g.fillStyle = hex(c); g.fillRect(x, y, w, h); mg.fillStyle = `rgb(${k},0,0)`; mg.fillRect(x, y, w, h); };
  const X = (wx) => Math.round((wx - X0) * U);
  const mix = (a, b, t) => { const ca = new THREE.Color(a), cb = new THREE.Color(b); return ca.lerp(cb, t).getHex(); };
  // Sky in pixel bands, lighter towards the horizon, with stars and clouds.
  for (let y = 0; y < horizon; y += 3) { const t = Math.max(0, (y - top) / (horizon - top)); px(0, y, t < 0.5 ? mix(0x120a28, 0x2a1858, t * 2) : mix(0x2a1858, 0x5a3a8c, t * 2 - 1), W, 3); }
  for (let i = 0; i < 500; i++) px((r() * W) | 0, top + ((r() * (horizon - top) * 0.95) | 0), r() < 0.7 ? 0xfff2c8 : 0xc8b8ff, 1, 1, STAR);
  for (let i = 0; i < top * 2.3; i++) px((high() * W) | 0, (high() * top) | 0, high() < 0.7 ? 0xfff2c8 : 0xc8b8ff, 1, 1, STAR);
  for (const [cx, up, len] of [[80, 34, 70], [300, 40, 50], [460, 28, 80], [180, 22, 56], [540, 20, 40], [20, 24, 48], [380, 58, 60], [120, 70, 44]]) {
    const cy = horizon - up;
    for (let k = 0; k < 4; k++) px(cx + k * 5, cy - k * 2, 0x4a3484, len - k * 10, 2);
    px(cx - 6, cy + 2, 0x3a2870, len + 12, 3);
  }
  // Crescent moon with a soft dithered halo.
  const mx = X(32.5), my = horizon - 27;
  for (let y = -20; y <= 20; y++) for (let x = -20; x <= 20; x++) {
    const d = Math.hypot(x, y);
    if (d <= 10 && Math.hypot(x - 5, y + 3.5) > 8.5) px(mx + x, my + y, d > 9 ? 0xffc870 : 0xffe6a8);
    else if (d > 11 && d < 19 && (x + y) % 2 === 0 && r() < (19 - d) / 9) px(mx + x, my + y, 0x6a4aa8);
  }
  // Mountains, then nearer hills.
  for (let x = 0; x < W; x++) {
    const h1 = 22 + Math.sin(x / 37) * 7 + Math.sin(x / 13) * 3 + Math.abs(Math.sin(x / 61)) * 8;
    px(x, horizon - h1, 0x3a2a6a, 1, h1);
    px(x, horizon - h1, 0x4e3a86, 1, 2);
    const h2 = 10 + Math.sin(x / 23 + 2) * 3 + Math.sin(x / 9.1) * 1.5;
    px(x, horizon - h2, 0x2a1e4e, 1, h2);
  }
  // The castle on its hill, to the right.
  const cx = X(38.5);
  for (let x = -60; x < 60; x++) { const h = 22 - (x * x) / 170; if (h > 0) px(cx + x, horizon - h, 0x24183e, 1, h); }
  const castle = 0x160f26, towers = [[-11, 10, 3], [-5, 16, 4], [2, 12, 3], [8, 8, 3]];
  px(cx - 12, horizon - 22, castle, 23, 7);
  for (const [dx, h, w] of towers) {
    px(cx + dx, horizon - 16 - h, castle, w, h);
    for (let k = 0; k < w; k++) px(cx + dx + k, horizon - 16 - h - Math.min(k, w - 1 - k) - 2, castle, 1, 2 + Math.min(k, w - 1 - k));
    px(cx + dx + 1, horizon - 16 - h + 3, 0xffc46a, 1, 1, LAMP); if (h > 11) px(cx + dx + 1, horizon - 16 - h + 8, 0xffb85a, 1, 1, LAMP);
  }
  for (let i = 0; i < 6; i++) px(cx - 10 + i * 4, horizon - 19, 0xffb85a, 1, 1, LAMP);
  for (let i = 0; i < 14; i++) px(cx - 26 + ((r() * 52) | 0), horizon - 2 - ((r() * 11) | 0), 0xffb85a, 1, 1, LAMP);
  // The village on the far shore, with lit windows, and dark pines between.
  const lit = [];
  for (let x = 2; x < W; x += 3 + ((r() * 5) | 0)) {
    const t = r(), h = 3 + ((r() * 4) | 0);
    if (t < 0.55) { for (let k = 0; k < h; k++) px(x - (k >> 1), horizon - k, 0x161a32, 1 + 2 * (k >> 1) - k % 2 + 1, 1); }
    else {
      const w = 4 + ((r() * 3) | 0), hh = 3 + ((r() * 2) | 0);
      px(x, horizon - hh, 0x2a1c34, w, hh);
      for (let k = 0; k < 3; k++) px(x - 1 + k, horizon - hh - 1 - k, 0x3a2030, w + 2 - k * 2, 1);
      for (let k = 1; k < w - 1; k += 2) { px(x + k, horizon - hh + 1, 0xffb85a, 1, 1, LAMP); lit.push(x + k); }
    }
  }
  // The lake: still water with shimmer lines and the lights reflected in it.
  for (let y = horizon; y < H - U; y++) px(0, y, mix(0x3a2c7a, 0x1e1848, (y - horizon) / (H - U - horizon)), W, 1);
  for (let i = 0; i < 50; i++) px((r() * W) | 0, horizon + 2 + ((r() * (H - U - horizon - 3)) | 0), 0x5a48a0, 2 + ((r() * 6) | 0), 1);
  for (const x of lit) for (let y = horizon + 1; y < H - U - 1; y += 2) if (r() > (y - horizon) / (H - U - horizon)) px(x + (((y >> 1) % 2) ? 1 : 0), y, 0xd88a3e, 1 + (r() < 0.4), 1, GLINT);   // fading towards us
  for (let y = horizon + 1; y < H - U - 1; y += 2) px(mx - 3 + ((r() * 3) | 0), y, 0xe8c890, 3 + ((r() * 4) | 0), 1, GLINT);
  px(0, H - U, 0x1c1626, W, U);                                                       // near shore
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter; texture.generateMipmaps = false;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(W / U, H / U), new THREE.MeshBasicMaterial({ map: texture, fog: false, toneMapped: false }));
  plane.geometry.translate(X0 + W / U / 2, H / U / 2, 0);
  plane.position.set(0, 0, -0.6);
  plane.rotation.x = -pitch;                                                          // lean back to face the camera
  // For ambience.js: which texels twinkle, and the lake's rows (top to bottom of the canvas).
  const lights = new THREE.CanvasTexture(marks);
  lights.colorSpace = THREE.NoColorSpace;
  lights.magFilter = THREE.NearestFilter; lights.minFilter = THREE.NearestFilter; lights.generateMipmaps = false;
  plane.userData = { marks: lights, size: [W, H], lake: [horizon, H - U] };
  return plane;
}

// Builds every static voxel and returns the scene group plus the light points
// the renderer turns into warm lamps.
export function buildWorld() {
  const r = seeded(20261017), v = new Voxels(), front = new Voxels(), patch = new Voxels(), lights = [];
  ground(v, r);
  // Trees crowd every edge, leaving the arch open onto the lake.
  for (const [x, z, s, k] of [
    [-8.5, 1.2, 1.2, 0], [3.2, 0.2, 1.1, 1], [10.6, 0.8, 1.15, 0], [13.6, 1.2, 1.0, 2], [16.4, 0.6, 0.9, 1],
    [23.8, 0.6, 0.95, 0], [26.6, 1.0, 1.05, 2], [29.4, 0.4, 0.9, 1], [36.2, 0.2, 1.15, 0], [40, 1.6, 1.2, 1],
    [-8.4, 6.8, 1.1, 1], [-8.2, 11.5 + DROP, 0.9, 0], [-8.6, 16.4 + DROP, 1.1, 2], [-8.4, 21.8 + DROP, 0.9, 1], [-8.2, 26 + DROP, 1.2, 0], [4.4, 27.2 + DROP, 1.1, 2],
    [37.6, 27 + DROP, 1.1, 1], [41.4, 24 + DROP, 1.2, 0],
    [40.4, 18.6 + DROP, 1.0, 2], [41, 13.2 + DROP, 1.1, 0], [40.6, 8, 1.0, 1], [6.8, 1.2, 0.8, 2],
    [-8.3, 9.4, 0.8, 2],                                                                   // filling the west edge the yard grew into
  ]) tree(v, r, x, z, s, k);
  const home = { door: { x: 6.5, y: 1.3, z: 9.5 } };
  bigPumpkinStage(v, r);
  patchBorder(patch, r);
  const stall = shop(v, r, lights);
  fence(v, r, lights, front);
  arch(v, r, lights);
  stringLights(v);
  // A hedge-lined private entrance, deliberately distinct from the maze gate.
  for (const x of [18.2, 21.8]) for (let z = 4.1; z < 8.4; z += .35) {
    v.block(x, .05, z, .7, .8 + r() * .15, .34, vary(0x394333, .14, r));
    v.block(x, .85, z, .75, .25, .36, vary(0x515a3d, .1, r));
  }
  for (const [x, z] of [[29.2, 18.2 + DROP], [33.4, 13.2 + DROP], [36.6, 11.6], [10.8, 9.4]]) lanternPost(v, x, z, lights);
  // Lamps along the lantern walk, between the buildings and the patch.
  for (const x of [16, 25]) lanternPost(v, x, 9.7, lights, x === 16);
  // Props round the yard: crates along the back fence, hay and a bench by the front, pumpkins everywhere.
  for (const x of [13, 15.6, 24.6]) crate(v, r, x, 3.7);
  barrel(v, r, 17.2, 3.7); barrel(v, r, 26.2, 3.8);
  hay(v, r, 5, 22.6 + DROP); hay(v, r, 36.4, 23.2 + DROP); hay(v, r, 36.6, 22.4 + DROP, 1.0);
  bench(front, 26.6, 23.6 + DROP); crate(v, r, 37.2, 18.8 + DROP); crate(v, r, 2.6, 23.2 + DROP, 0.9);
  for (const [x, z] of [[2.4, 17.6], [37.6, 14.8], [11.6, 23.4], [21.2, 23.6]].map(([x, z]) => [x, z + DROP])) jackOLantern(z > 23 + DROP ? front : v, r, x, z, 0.6, null);
  for (const [x, z, c] of [[3.4, 18.4 + DROP, 0xd9d2ff], [27.8, 22.5 + DROP, 0x9d55e6], [36.8, 21.4 + DROP, 0xf0821e], [26.8, 5.5, 0xf0821e], [8.6, 21.8 + DROP, 0xf0821e]]) pumpkinBlock(v, x, 0, z, 0.55, c, r);
  for (const [x, z] of [[2.2, 12.4 + DROP], [12.4, 23.8 + DROP], [19, 23.8 + DROP], [30, 21 + DROP], [38, 16.6 + DROP], [11.8, 4.2], [28, 4.4], [3.2, 9.4]]) flowers(z > 23 + DROP ? front : v, r, x, z);
  for (let x = 8; x < 32; x += 1.3) for (let k = 0; k < 7; k++)                           // low autumn hedging beyond the front fence
    front.block(x + (r() - 0.5) * 1.2, (r() * 0.5), 25.9 + DROP + r() * 1.4, 0.42, 0.42, 0.42, vary(CANOPY[(r() * 3) | 0][1 + ((r() * 3) | 0)], 0.08, r));
  const group = v.build(), frontBoundary = front.build(), patchBoundary = patch.build(); frontBoundary.name = "Original farm front"; patchBoundary.name = "Original patch rim"; group.add(frontBoundary, patchBoundary);
  const terrain = yardGround(); group.add(terrain);
  return { group, ground: terrain, frontBoundary, patchBoundary, lights: [...lights, ...stall.lights], door: home.door };
}

// Signs carry their lettering on a canvas texture, in the game's display font.
export function signBoard(text, sub, width) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 320;
  const c = canvas.getContext("2d");
  c.fillStyle = "#32231f"; c.fillRect(0, 0, 1024, 320);
  c.strokeStyle = "#bc8b51"; c.lineWidth = 8; c.strokeRect(13, 13, 998, 294);
  c.strokeStyle = "#17131c"; c.lineWidth = 5; c.strokeRect(25, 25, 974, 270);
  c.textAlign = "center"; c.textBaseline = "middle";
  const lettering = (value, y, maxSize, colour) => {
    let size = maxSize;
    do { c.font = `700 ${size}px Georgia, serif`; if (c.measureText(value).width <= 920) break; size -= 2; } while (size > 28);
    c.lineWidth = 5; c.strokeStyle = "#17101b"; c.strokeText(value, 512, y); c.fillStyle = colour; c.fillText(value, 512, y);
  };
  lettering(text, sub ? 122 : 160, 118, "#fff1ce");
  if (sub) lettering(sub.toUpperCase(), 238, 52, "#f4d39e");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.BoxGeometry(width, width * 160 / 512, 0.12), [
    new THREE.MeshStandardMaterial({ color: 0x3b2618 }), new THREE.MeshStandardMaterial({ color: 0x3b2618 }),
    new THREE.MeshStandardMaterial({ color: 0x3b2618 }), new THREE.MeshStandardMaterial({ color: 0x3b2618 }),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: 0x3b2618 }),
  ]);
  board.castShadow = true;
  return board;
}
