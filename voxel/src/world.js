import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { pumpkinBlock } from "./pumpkins.js";

// World units: 1 = one ground tile. x runs west to east (0-40), z north to
// south (0-26, the camera sits to the south), y is up. Layout follows
// docs/GAME-BIBLE.md §3: cottage top left, big pumpkin left, the patch in the
// centre, Skyla's shop top right, the stone path up the right, fence along the
// bottom, and an arch at the back opening onto the lake.
export const MAP = { w: 40, d: 26 };
// Camera tilt: low enough to show the sides of the cottage, the shop, fences and
// trees, and the far shore over the back fence; steep enough to see over the
// patch's front rows and under the shop awning to Skyla on the counter.
export const PITCH = THREE.MathUtils.degToRad(36);
// The cast are flat sprites (or sprite-deep voxel figures) that lean back
// towards the camera, the way sprite games tilt them, stretched by 1 / cos of the
// angle left between them and the camera so the art keeps its drawn proportions.
// The angle stays as it was at the old, steeper camera, so they stand straighter.
export const LEAN = PITCH - THREE.MathUtils.degToRad(27.4), STRETCH = 1 / Math.cos(PITCH - LEAN);
// Twelve plots, three across and four rows deep; the first six are open at the start.
export const PLOTS = [11.2, 13.8, 16.4, 19.0].flatMap((z) => [16.5, 20, 23.5].map((x) => ({ x, z })));
export const BIG_PUMPKIN = { x: 7, z: 15.5 };
export const COTTAGE = { x: 7, z: 6.4 };
export const SHOP = { x: 32, z: 5.6, counterZ: 8.6 };
export const HOMES = { natalie: { x: 13.2, z: 13.6 }, shane: { x: 27, z: 13.6 } };
// Visitors walk in from the south edge, up the path to the fork, along the
// spur to Skyla's counter, then back to the fork and out to the north-east.
export const ROUTE_IN = [[33, 28.5], [33, 24], [32.4, 21.6], [30.4, 18.6], [30.2, 15.6], [31.6, 12.6], [31.8, 10.2]];
export const ROUTE_OUT = [[31.8, 10.2], [31.6, 12.6], [35, 10.6], [38, 8.6], [42.5, 6.6]];
const PATH = [[33, 27], ...ROUTE_IN.slice(1, 6), [35, 10.6], [38, 8.6], [41, 7]];

const COL = {
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
const CANOPY = [
  [0x5a1820, 0x8a2422, 0xb8361e, 0xdc5a22, 0xf28a34],
  [0x7a2c16, 0xb0461a, 0xd8701e, 0xf29a30, 0xffc252],
  [0x3e1634, 0x60204a, 0x88305a, 0xb24862, 0xdc7458],
];

// The stone path out through the arch at the back, down to the lake.
const ARCH = { x: 20, z: 3 };
const nearArchPath = (x, z) => Math.abs(x - ARCH.x) < 1.15 && z < 9.1;

const nearPath = (x, z, width) => {
  let best = Infinity;
  for (let i = 1; i < PATH.length; i++) {
    const [ax, az] = PATH[i - 1], [bx, bz] = PATH[i], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best < width;
};
const inPatch = (x, z) => ((x - 20) / 7.6) ** 2 + ((z - 15.1) / 5.6) ** 2 < 1;
const edge = (x, z) => x < 1.6 || x > 38.4 || z > 24.4 || (z < 2.8 && !nearArchPath(x, z));

function cobbles(v, r, x, z, T, colors, amount) {
  v.box(x, -0.5, z, T, 0.5, T, 0x2a2430);                                                // grout
  for (const [ox, oz] of [[0, 0], [0.25, 0], [0, 0.25], [0.25, 0.25]])                   // four cobbles per tile
    v.box(x + ox + 0.02, 0, z + oz + 0.02, 0.21, 0.04 + r() * 0.04, 0.21, vary(colors[(r() * colors.length) | 0], amount, r));
}

function ground(v, r) {
  const T = 0.5;
  for (let x = 0; x < MAP.w; x += T) for (let z = -1; z < MAP.d + 3; z += T) {
    const cx = x + T / 2, cz = z + T / 2;
    if (nearPath(cx, cz, 0.95) || nearArchPath(cx, cz) || (cx > 31 && cx < 32.6 && cz > 8.6 && cz < 10.6)) cobbles(v, r, x, z, T, COL.stone, 0.1);
    else if (inPatch(cx, cz)) {
      const row = Math.round(cz * 2) % 2;
      v.box(x, -0.5, z, T, 0.5 + (row ? 0.05 : 0), T, row ? COL.soil : COL.furrow);        // tilled rows
    } else if (edge(cx, cz)) {
      v.box(x, -0.5, z, T, 0.5 + r() * 0.06, T, vary(COL.grass[(r() * 4) | 0], 0.08, r));
      if (r() < 0.3) v.box(x + r() * 0.3, 0.06, z + r() * 0.3, 0.16, 0.03, 0.16, COL.leaves[(r() * 6) | 0]); // a carpet of leaves
      else if (r() < 0.06) v.box(x + 0.2, 0.05, z + 0.2, 0.12, 0.24, 0.12, COL.flowers[(r() * 5) | 0]);
    } else {
      cobbles(v, r, x, z, T, COL.yard, 0.08);                                            // the cobbled yard
      if (r() < 0.07) v.box(x + r() * 0.3, 0.09, z + r() * 0.3, 0.16, 0.03, 0.16, COL.leaves[(r() * 6) | 0]);
    }
  }
  // Rough grass beyond the map's edges, for when the view is zoomed out.
  for (let x = -16; x < MAP.w + 16; x += 2) for (let z = -1; z < MAP.d + 12; z += 2) {
    if (x >= 0 && x < MAP.w && z < MAP.d + 3) continue;
    v.box(x, -0.5, z, 2, 0.5, 2, vary(COL.grass[(r() * 4) | 0], 0.1, r));
  }
}

// Autumn trees: a trunk and a hollow, lumpy canopy shaded dark underneath and
// bright on top, so each reads as a round voxel crown from above.
function tree(v, r, x, z, size, kind = (r() * 3) | 0) {
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

function lanternPost(v, x, z, lights, light = true) {
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

// The yard in front of the cottage: lanterns, pumpkins, the signpost and crates.
// The house itself is rebuilt as it grows (buildCottage).
function cottageYard(v, r, lights) {
  const { x, z } = COTTAGE, z0 = z - 2.5, front = z0 + 5, x0 = x - 3.5;
  v.box(x - 1.1, 0, front, 2.2, 0.35, 0.6, COL.stoneWall[2]); v.box(x - 0.9, 0, front + 0.6, 1.8, 0.18, 0.5, COL.stoneWall[0]);
  lights.push({ x: x - 1.2, y: 2, z: front + 0.12 });
  jackOLantern(v, r, x - 1.7, front + 0.5, 0.55, null);
  pumpkinBlock(v, x + 1.6, 0, front + 0.6, 0.45, 0xf0821e, r);
  pumpkinBlock(v, x + 1.5, 0.35, front + 0.1, 0.32, 0xd9d2ff, r);
  v.block(x0 - 0.6, 0, front + 1.6, 0.18, 1.6, 0.18, COL.fence);                       // signpost
  v.block(x0 - 0.6, 1.0, front + 1.7, 1.2, 0.6, 0.08, COL.woodLight);
  crate(v, r, x + 3.6, front + 0.6); barrel(v, r, x + 4.7, front + 0.4);
  return { door: { x, z: front + 1.2 } };
}

// The house through its four levels, after the main game's exteriors: the
// little cottage, the crooked cottage (taller, with a leaning slate roof), the
// midnight manor (two storeys and a turret) and the haunted haven (a second
// spire, violet windows, ghost lights and bats). The front wall stays put.
const HOUSE_COLOURS = [
  { wall: 0xe2d2b4, roof: [0x4a2e2a, 0x553430, 0x3f2724], glow: 0xffb85a },
  { wall: 0xd8c4a2, roof: [0x3c3448, 0x463c54, 0x332c3e], glow: 0xffb85a },
  { wall: 0xcbb6a0, roof: [0x2e2a3c, 0x383248, 0x26222f], glow: 0xffb85a },
  { wall: 0xb9a8a6, roof: [0x2a2036, 0x342840, 0x221a2c], glow: 0xc49bff },
];
export function buildCottage(level) {
  const v = new Voxels(), r = seeded(77 + level), c = HOUSE_COLOURS[level];
  const { x } = COTTAGE, front = COTTAGE.z + 2.5;
  const w = level >= 2 ? 8.5 : 7, d = 5, x0 = level >= 2 ? x - 5 : x - 3.5, z0 = front - d;
  const wallH = [3.3, 4.3, 5.8, 5.8][level], top = 0.7 + wallH;
  for (let i = 0; i < w; i += 0.5) for (const zz of [z0, front - 0.5]) v.box(x0 + i, 0, zz, 0.5, 0.7, 0.5, vary(COL.stoneWall[(r() * 3) | 0], 0.06, r)); // stone footing
  v.box(x0, 0, z0, 0.5, 0.7, d, COL.stoneWall[1]); v.box(x0 + w - 0.5, 0, z0, 0.5, 0.7, d, COL.stoneWall[1]);
  if (level >= 2) for (let i = 0; i < w; i += 0.5) for (let j = 0.7; j < 2.9; j += 0.45) v.box(x0 + i + 0.02, j, front - 0.12, 0.48, 0.45, 0.14, vary(COL.stoneWall[(r() * 3) | 0], 0.08, r)); // stone ground floor
  v.box(x0 + 0.05, 0.7, z0 + 0.05, w - 0.1, wallH, d - 0.1, c.wall);                   // plaster walls
  for (let k = 0; k <= 3; k++) v.box(x0 + (w - 0.25) * k / 3, level >= 2 ? 2.9 : 0.7, front - 0.1, 0.25, level >= 2 ? wallH - 2.2 : wallH, 0.15, COL.timber); // timber frame
  for (const y of level >= 2 ? [2.9, 4.4, top - 0.2] : [2.4, top - 0.2]) v.box(x0, y, front - 0.1, w, 0.22, 0.15, COL.timber);
  // Round-topped door under a little porch roof.
  v.box(x - 0.6, 0.7, front - 0.12, 1.2, 1.9, 0.2, COL.woodLight);
  for (let i = 0; i < 4; i++) v.box(x - 0.55 + i * 0.3, 0.75, front + 0.08, 0.04, 1.8, 0.04, COL.woodDark);
  v.box(x - 0.45, 2.6, front - 0.12, 0.9, 0.2, 0.2, COL.woodLight);
  v.box(x + 0.35, 1.5, front + 0.06, 0.12, 0.12, 0.08, 0xd9a35a);
  for (let k = 0; k < 3; k++) v.box(x - 1.3 + k * 0.1, 3.0 - k * 0.12, front + k * 0.3, 2.6 - k * 0.2, 0.14, 0.32, vary(c.roof[k], 0.05, r));
  lantern(v, x - 1.2, 1.7, front + 0.12, []); lantern(v, x + 1.2, 1.7, front + 0.12, []);
  // Glowing windows with mullions and flower boxes; one row per storey.
  const rows = level >= 2 ? [1.3, 3.4] : level === 1 ? [1.6, 3.0] : [1.6];
  for (const [n, wy] of rows.entries()) for (const wx of n === 0 ? [x0 + 1.1, x0 + w - 2.1] : [x0 + 1.1, x - 0.5, x0 + w - 2.1]) {
    const glow = level === 3 && (wx + wy) % 3 < 1.2 ? 0xc49bff : c.glow;
    v.box(wx, wy, front - 0.08, 1, 1.1, 0.12, glow, true);
    v.box(wx + 0.45, wy, front + 0.02, 0.1, 1.1, 0.06, COL.timber);
    v.box(wx, wy + 0.5, front + 0.02, 1, 0.1, 0.06, COL.timber);
    v.box(wx - 0.1, wy - 0.3, front - 0.05, 1.2, 0.3, 0.35, COL.woodDark);
    if (n === 0) for (let i = 0; i < 5; i++) v.box(wx - 0.05 + i * 0.24, wy, front + 0.05, 0.16, 0.14, 0.16, COL.flowers[(i * 3) % 5]);
  }
  // Steep stepped roof. From the crooked cottage on, it leans and grows dormers.
  const lean = level === 1 ? 0.12 : level === 3 ? 0.05 : 0;
  for (let i = 0; i < 9; i++) {
    const inset = i * 0.38, y = top + i * 0.42, shift = lean * i;
    for (let k = 0; k < w + 1.2; k += 0.6) v.box(x0 - 0.6 + k + shift, y, z0 - 0.5 + inset, 0.6, 0.42, d + 1 - inset * 2, vary(c.roof[(r() * 3) | 0], 0.1, r));
  }
  for (let k = 0; k < w + 1.2; k += 0.6) for (let i = 0; i < 9; i += 2) v.box(x0 - 0.6 + k + lean * i, top + 0.38 + i * 0.42, front + 0.44 - i * 0.38, 0.6, 0.05, 0.06, 0x1e1418); // shingle lines
  for (const dx of level === 0 ? [3] : [1.6, w - 2.6]) {                            // dormers
    v.box(x0 + dx - 0.2, top + 0.3, front - 0.9, 1.3, 1.2, 0.9, c.wall);
    v.box(x0 + dx, top + 0.45, front - 0.02, 0.9, 0.75, 0.12, c.glow, true);
    for (let k = 0; k < 3; k++) v.box(x0 + dx - 0.35 + k * 0.1, top + 1.5 + k * 0.25, front - 1 + k * 0.05, 1.6 - k * 0.2, 0.18, 1.1, c.roof[k]);
  }
  const chimneyH = [4.4, 5.2, 5.5, 5.8][level];
  v.box(x0 + w - 1.8, top + 0.5, z0 + 1, 0.9, chimneyH, 0.9, COL.stoneWall[1]);       // chimney
  v.box(x0 + w - 1.9, top + 0.5 + chimneyH, z0 + 0.9, 1.1, 0.25, 1.1, COL.stoneWall[2]);
  // The manor's turret, and the haven's second spire.
  const tower = (tx, tz, tw, th, spire) => {
    for (let y = 0; y < th; y += 0.5) v.box(tx, y, tz, tw, 0.5, tw, vary(y < 0.7 ? COL.stoneWall[1] : c.wall, 0.04, r));
    for (let y = 1.6; y < th - 0.6; y += 1.8) v.box(tx + tw / 2 - 0.3, y, tz + tw - 0.02, 0.6, 0.9, 0.1, c.glow, true);
    for (let i = 0; i * 0.3 < spire; i++) {
      const s = Math.max(0.2, tw + 0.6 - i * ((tw + 0.6) / (spire / 0.3)));
      v.box(tx + tw / 2 - s / 2, th + i * 0.3, tz + tw / 2 - s / 2, s, 0.3, s, c.roof[i % 3]);
    }
  };
  if (level >= 2) tower(x0 - 0.8, z0 + 0.3, 2.2, top + 1.8, 3.6);
  if (level >= 3) tower(x0 + w - 1.2, z0 - 0.4, 1.5, top + 3.2, 3);
  // Ivy, red creeper, and in the haven, ghost lights and bats.
  for (let i = 0; i < 22 + level * 8; i++) v.box(x0 + r() * 0.5, 0.6 + r() * (wallH - 0.2), front - 0.05, 0.25, 0.25, 0.12, vary(0x3d5a2a, 0.2, r));
  for (let i = 0; i < 16 + level * 6; i++) v.box(x0 + w - 0.4 + r() * 0.4, 0.6 + r() * (wallH - 0.2), front - 0.02, 0.24, 0.24, 0.12, vary(CANOPY[0][2 + (i % 3)], 0.1, r));
  if (level >= 3) {
    for (const [gx, gy, gz] of [[x0 - 1.6, 3.4, front + 0.4], [x0 + w + 0.6, 4.6, front - 1], [x0 + 3, top + 4.2, front - 2.5]]) {
      v.box(gx, gy, gz, 0.3, 0.3, 0.3, 0xd8c4ff, true); v.box(gx + 0.08, gy + 0.3, gz + 0.08, 0.14, 0.14, 0.14, 0xb48cff, true);
    }
    for (const [bx, by] of [[x0 + 1.5, top + 4.5], [x0 + 4.2, top + 5.4], [x0 + 6.5, top + 4.8]]) {
      v.box(bx, by, front - 2, 0.3, 0.2, 0.2, 0x120c14); v.box(bx - 0.4, by + 0.1, front - 2, 0.4, 0.08, 0.15, 0x120c14); v.box(bx + 0.3, by + 0.1, front - 2, 0.4, 0.08, 0.15, 0x120c14);
    }
  }
  return v.build();
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

function patchBorder(v, r) {
  for (let a = 0; a < Math.PI * 2; a += 0.085) {
    const x = 20 + Math.cos(a) * 7.9, z = 15.1 + Math.sin(a) * 5.9;
    if (nearPath(x, z, 1.2)) continue;
    v.block(x, 0, z, 0.4, 0.26 + r() * 0.1, 0.4, vary(0xa89cb0, 0.1, r));            // pale stone edging
  }
}

function shop(v, r, lights) {
  const { x, z, counterZ } = SHOP, w = 9, d = 5, x0 = x - w / 2, z0 = z - d / 2;
  for (let i = 0; i < d; i += 0.5) { v.box(x0, 0, z0 + i, 0.4, 3.6, 0.5, vary(COL.wood, 0.1, r)); v.box(x0 + w - 0.4, 0, z0 + i, 0.4, 3.6, 0.5, vary(COL.wood, 0.1, r)); }
  for (let i = 0; i < w; i += 0.5) v.box(x0 + i, 0, z0, 0.5, 4.6, 0.4, vary(COL.woodDark, 0.12, r)); // back wall planks
  // A gable above the back wall carrying the sign and a carved pumpkin.
  for (let i = 0; i < 8; i++) v.box(x0 - 0.3 + i * 0.32, 4.6 + i * 0.3, z0 - 0.1, w + 0.6 - i * 0.64, 0.3, 0.55, vary(COL.roof[i % 3], 0.06, r));
  v.box(x - 0.3, 7.0, z0 + 0.5, 0.6, 0.2, 0.2, 0x5a4a1e);
  v.box(x0 + 0.4, 0, z0 + 0.4, w - 0.8, 0.12, d - 0.4, COL.woodDark);
  // Shelves of glowing jars and little pumpkins along the back wall.
  for (const y of [1.3, 2.3, 3.3]) {
    v.box(x0 + 0.6, y, z0 + 0.4, w - 1.2, 0.12, 0.6, COL.woodLight);
    for (let i = 0; i < 12; i++) {
      const c = [0xffb85a, 0xf0821e, 0xb774ff, 0xd9d2ff, 0xf5c84a][(i + y * 3) % 5 | 0];
      v.box(x0 + 0.9 + i * 0.62, y + 0.12, z0 + 0.55, 0.32, 0.36 + (i % 2) * 0.1, 0.32, c, i % 2 === 0);
    }
  }
  // Counter across the front.
  v.box(x0 + 0.6, 0, counterZ - 0.9, w - 1.2, 1.15, 0.9, COL.wood);
  v.box(x0 + 0.5, 1.15, counterZ - 1.0, w - 1, 0.15, 1.1, COL.woodLight);
  for (let i = 0; i < w - 1.2; i += 0.6) v.box(x0 + 0.6 + i, 0.1, counterZ - 0.02, 0.06, 0.95, 0.04, COL.woodDark);
  for (let i = 0; i < 5; i++) jackOLantern(v, r, x0 + 1.4 + i * 1.6, counterZ + 0.25, 0.42, null);   // a row of lit pumpkins at its foot
  v.box(x - 2.6, 1.3, counterZ - 0.7, 0.6, 0.35, 0.4, 0xd9a35a);                        // brass till
  v.box(x + 2.4, 1.3, counterZ - 0.6, 0.25, 0.25, 0.25, 0xd9a35a);                       // the bell Skyla rings
  // Corner posts with lanterns, and the striped awning sloping forward. It sits
  // high so Skyla on the counter shows beneath it.
  for (const px of [x0, x0 + w - 0.35]) { v.box(px, 0, counterZ - 0.35, 0.35, 4.5, 0.35, COL.woodDark); lantern(v, px + 0.17, 2.3, counterZ + 0.05, lights); }
  for (let i = 0; i < w + 0.8; i += 0.9) for (let k = 0; k < 4; k++)
    v.box(x0 - 0.4 + i, 4.9 - k * 0.24, z0 + 1.4 + k * 0.62, 0.9, 0.16, 0.62, COL.awning[Math.round(i / 0.9) % 2]);
  for (let i = 0; i < w + 0.8; i += 0.45) v.box(x0 - 0.4 + i, 3.88 - (Math.round(i / 0.45) % 2) * 0.12, z0 + 3.86, 0.45, 0.22, 0.1, COL.awning[Math.round(i / 0.9) % 2]); // scalloped edge
  // Crates of pumpkins, a hay bale, a chalkboard and a banner out front.
  crate(v, r, x0 - 1.1, counterZ + 0.3); crate(v, r, x0 - 0.8, counterZ + 1.3, 0.9);
  crate(v, r, x0 + w + 0.7, counterZ - 0.6); barrel(v, r, x0 + w + 0.8, counterZ + 0.6);
  hay(v, r, x0 + w + 0.6, counterZ + 1.8, 1.2);
  v.block(x + 4.2, 0, counterZ + 1.6, 0.9, 1.2, 0.12, COL.woodLight);                    // chalkboard
  v.block(x + 4.2, 0.2, counterZ + 1.67, 0.72, 0.85, 0.02, 0x1e1e24);
  for (let i = 0; i < 4; i++) v.block(x + 4.1 + (i % 2) * 0.1, 0.36 + i * 0.17, counterZ + 1.69, 0.42 - (i % 2) * 0.14, 0.04, 0.01, 0xe8e2d8);
  v.block(x0 + w + 1.7, 0, counterZ - 1.4, 0.12, 3.8, 0.12, COL.iron);                   // banner pole
  v.box(x0 + w + 1.76, 2.0, counterZ - 1.42, 1.1, 1.6, 0.06, 0x5b2a4a);
  v.box(x0 + w + 2.06, 2.5, counterZ - 1.38, 0.5, 0.5, 0.04, 0xf0821e);
  return { lights: [{ x: x - 2, y: 3, z: counterZ - 1.5 }, { x: x + 2.4, y: 3, z: counterZ - 1.5 }] };
}

// Wooden picket fences: round the front and sides, and across the back to the arch.
function fence(v, r, lights) {
  const run = (ax, az, bx, bz, skip = () => false) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.4), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let i = 0; i <= n; i++) {
      const x = ax + ux * i * 0.4, z = az + uz * i * 0.4;
      if (skip(x, z)) continue;
      if (i % 4 === 0) { v.block(x, 0, z, 0.24, 1.25, 0.24, COL.fence); v.block(x, 1.25, z, 0.3, 0.08, 0.3, COL.fenceLight); }
      else v.block(x, 0, z, ux ? 0.16 : 0.08, 0.95 + (i % 2) * 0.06, uz ? 0.16 : 0.08, vary(COL.fenceLight, 0.12, r));
      if (i < n && !skip(x + ux * 0.4, z + uz * 0.4)) for (const y of [0.3, 0.75]) v.box(Math.min(x, x + ux * 0.4), y, Math.min(z, z + uz * 0.4), Math.abs(ux) * 0.4 + 0.08, 0.1, Math.abs(uz) * 0.4 + 0.08, COL.fence);
    }
  };
  run(0.4, 24.6, MAP.w - 0.4, 24.6, (x) => x > 31.2 && x < 34.8);
  run(0.4, 10, 0.4, 24.6);
  run(39.6, 12.4, 39.6, 24.6, (x, z) => nearPath(x, z, 1.2));
  run(11.2, 2.9, 27.4, 2.9, (x) => x > ARCH.x - 1.6 && x < ARCH.x + 1.6);
  for (const x of [4, 10, 16, 24, 30.6, 35.4]) lanternPost(v, x, 25.1, lights, x !== 10 && x !== 24);
  for (const z of [14, 20]) lanternPost(v, 0.9, z, lights, z === 20);
  for (const z of [16, 21.6]) lanternPost(v, 39.1, z, lights, false);
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
  const U = 8, X0 = -18, W = 76 * U, H = 42 * U, horizon = H - Math.round(shore * U), top = horizon - 27.5 * U;
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d"), r = seeded(77), high = seeded(78);
  const hex = (c) => "#" + c.toString(16).padStart(6, "0");
  const px = (x, y, c, w = 1, h = 1) => { g.fillStyle = hex(c); g.fillRect(x, y, w, h); };
  const X = (wx) => Math.round((wx - X0) * U);
  const mix = (a, b, t) => { const ca = new THREE.Color(a), cb = new THREE.Color(b); return ca.lerp(cb, t).getHex(); };
  // Sky in pixel bands, lighter towards the horizon, with stars and clouds.
  for (let y = 0; y < horizon; y += 3) { const t = Math.max(0, (y - top) / (horizon - top)); px(0, y, t < 0.5 ? mix(0x120a28, 0x2a1858, t * 2) : mix(0x2a1858, 0x5a3a8c, t * 2 - 1), W, 3); }
  for (let i = 0; i < 500; i++) px((r() * W) | 0, top + ((r() * (horizon - top) * 0.95) | 0), r() < 0.7 ? 0xfff2c8 : 0xc8b8ff);
  for (let i = 0; i < top * 2.3; i++) px((high() * W) | 0, (high() * top) | 0, high() < 0.7 ? 0xfff2c8 : 0xc8b8ff);
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
    px(cx + dx + 1, horizon - 16 - h + 3, 0xffc46a); if (h > 11) px(cx + dx + 1, horizon - 16 - h + 8, 0xffb85a);
  }
  for (let i = 0; i < 6; i++) px(cx - 10 + i * 4, horizon - 19, 0xffb85a);
  for (let i = 0; i < 14; i++) px(cx - 26 + ((r() * 52) | 0), horizon - 2 - ((r() * 11) | 0), 0xffb85a);
  // The village on the far shore, with lit windows, and dark pines between.
  const lit = [];
  for (let x = 2; x < W; x += 3 + ((r() * 5) | 0)) {
    const t = r(), h = 3 + ((r() * 4) | 0);
    if (t < 0.55) { for (let k = 0; k < h; k++) px(x - (k >> 1), horizon - k, 0x161a32, 1 + 2 * (k >> 1) - k % 2 + 1, 1); }
    else {
      const w = 4 + ((r() * 3) | 0), hh = 3 + ((r() * 2) | 0);
      px(x, horizon - hh, 0x2a1c34, w, hh);
      for (let k = 0; k < 3; k++) px(x - 1 + k, horizon - hh - 1 - k, 0x3a2030, w + 2 - k * 2, 1);
      for (let k = 1; k < w - 1; k += 2) { px(x + k, horizon - hh + 1, 0xffb85a, 1, 1); lit.push(x + k); }
    }
  }
  // The lake: still water with shimmer lines and the lights reflected in it.
  for (let y = horizon; y < H - U; y++) px(0, y, mix(0x3a2c7a, 0x1e1848, (y - horizon) / (H - U - horizon)), W, 1);
  for (let i = 0; i < 50; i++) px((r() * W) | 0, horizon + 2 + ((r() * (H - U - horizon - 3)) | 0), 0x5a48a0, 2 + ((r() * 6) | 0), 1);
  for (const x of lit) for (let y = horizon + 1; y < H - U - 1; y += 2) if (r() > (y - horizon) / (H - U - horizon)) px(x + (((y >> 1) % 2) ? 1 : 0), y, 0xd88a3e, 1 + (r() < 0.4), 1);   // fading towards us
  for (let y = horizon + 1; y < H - U - 1; y += 2) px(mx - 3 + ((r() * 3) | 0), y, 0xe8c890, 3 + ((r() * 4) | 0), 1);
  px(0, H - U, 0x1c1626, W, U);                                                       // near shore
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter; texture.generateMipmaps = false;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(W / U, H / U), new THREE.MeshBasicMaterial({ map: texture, fog: false, toneMapped: false }));
  plane.geometry.translate(X0 + W / U / 2, H / U / 2, 0);
  plane.position.set(0, 0, -0.6);
  plane.rotation.x = -pitch;                                                          // lean back to face the camera
  return plane;
}

// Builds every static voxel and returns the scene group plus the light points
// the renderer turns into warm lamps.
export function buildWorld() {
  const r = seeded(20261017), v = new Voxels(), lights = [];
  ground(v, r);
  // Trees crowd every edge, leaving the arch open onto the lake.
  for (const [x, z, s, k] of [
    [-0.5, 1.2, 1.2, 0], [3.2, 0.2, 1.1, 1], [10.6, 0.8, 1.15, 0], [13.6, 1.2, 1.0, 2], [16.4, 0.6, 0.9, 1],
    [23.8, 0.6, 0.95, 0], [26.6, 1.0, 1.05, 2], [29.4, 0.4, 0.9, 1], [36.2, 0.2, 1.15, 0], [40, 1.6, 1.2, 1],
    [-0.4, 6.8, 1.1, 1], [0.2, 11.5, 0.9, 0], [-0.6, 16.4, 1.1, 2], [0.4, 21.8, 0.9, 1], [-0.2, 26, 1.2, 0], [4.4, 27.2, 1.1, 2],
    [37.6, 27, 1.1, 1], [41.4, 24, 1.2, 0],
    [40.4, 18.6, 1.0, 2], [41, 13.2, 1.1, 0], [40.6, 8, 1.0, 1], [6.8, 1.2, 0.8, 2],
  ]) tree(v, r, x, z, s, k);
  const home = cottageYard(v, r, lights);
  bigPumpkinStage(v, r);
  patchBorder(v, r);
  const stall = shop(v, r, lights);
  fence(v, r, lights);
  arch(v, r, lights);
  stringLights(v);
  for (const [x, z] of [[29.2, 18.2], [33.4, 13.2], [36.6, 11.6], [10.8, 9.4]]) lanternPost(v, x, z, lights);
  // Props round the yard: crates along the back fence, hay and a bench by the front, pumpkins everywhere.
  for (const x of [13, 15.6, 24.6]) crate(v, r, x, 3.7);
  barrel(v, r, 17.2, 3.7); barrel(v, r, 26.2, 3.8);
  hay(v, r, 5, 22.6); hay(v, r, 36.4, 23.2); hay(v, r, 36.6, 22.4, 1.0);
  bench(v, 26.6, 23.6); crate(v, r, 37.2, 18.8); crate(v, r, 2.6, 23.2, 0.9);
  for (const [x, z] of [[2.4, 17.6], [37.6, 14.8], [11.6, 23.4], [21.2, 23.6]]) jackOLantern(v, r, x, z, 0.6, null);
  for (const [x, z, c] of [[3.4, 18.4, 0xd9d2ff], [27.8, 22.5, 0x9d55e6], [36.8, 21.4, 0xf0821e], [26.8, 5.5, 0xf0821e], [8.6, 21.8, 0xf0821e]]) pumpkinBlock(v, x, 0, z, 0.55, c, r);
  for (const [x, z] of [[2.2, 12.4], [12.4, 23.8], [19, 23.8], [30, 21], [38, 16.6], [11.8, 4.2], [28, 4.4], [3.2, 9.6]]) flowers(v, r, x, z);
  for (let x = 8; x < 32; x += 1.3) for (let k = 0; k < 7; k++)                           // low autumn hedging beyond the front fence
    v.block(x + (r() - 0.5) * 1.2, (r() * 0.5), 25.9 + r() * 1.4, 0.42, 0.42, 0.42, vary(CANOPY[(r() * 3) | 0][1 + ((r() * 3) | 0)], 0.08, r));
  const group = v.build();
  return { group, lights: [...lights, ...stall.lights], door: home.door };
}

// Signs carry their lettering on a canvas texture, in the game's display font.
export function signBoard(text, sub, width) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 160;
  const c = canvas.getContext("2d");
  c.fillStyle = "#4a3020"; c.fillRect(0, 0, 512, 160);
  c.strokeStyle = "#2a1a12"; c.lineWidth = 10; c.strokeRect(5, 5, 502, 150);
  for (let y = 40; y < 160; y += 40) { c.fillStyle = "rgba(0,0,0,0.18)"; c.fillRect(0, y, 512, 3); }
  c.fillStyle = "#ffe0a8"; c.textAlign = "center";
  c.font = "600 54px Fraunces, Georgia, serif"; c.fillText(text, 256, 78);
  c.fillStyle = "#e7b46e"; c.font = "600 26px 'DM Sans', sans-serif"; c.fillText(sub.toUpperCase(), 256, 122);
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
