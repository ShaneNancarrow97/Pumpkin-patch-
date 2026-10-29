import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { fenceRun, lanternPost, gourd, wallLantern, COL } from "./world.js";
import { HAYRIDE_SITE as SITE, HAYRIDE_FLEET_BAY } from "./content/hayride-layout.js";

// The hayride's depot on the farm: a lantern-lit yard of packed earth at the
// edge of the woods. A rutted track runs through it between two tree arches,
// a little oxblood ticket barn stands by the queue, and hay, pumpkins and a
// scarecrow dress the corners. Every walking surface stays below the guests'
// feet (hayrideGuestPose), and nothing stands in the lanes, the queue or the
// walkway along x = -9.1.
const block = (v, x, y, z, w, h, d, c, glow = false) => v.block(x, y, z, w, h, d, c, glow);
const EARTH = [0x5e4733, 0x67503a, 0x56432f, 0x6e563d, 0x625041], RUT = [0x3b2b20, 0x433024, 0x34261c], CROWN = [0x4a5a32, 0x3f4f2c, 0x55653a], PUDDLE = [0x2b3140, 0x323a4c, 0x283040];
const GRASS = [0x3d4a2b, 0x46552f, 0x36432a], STRAW = [0xc9a44f, 0xb88f3c, 0xd8b862], LEAVES = COL.leaves, STONE = COL.stone;
const BARN = [0x6e2420, 0x7a2a24, 0x652024], TRIM = 0xd6c6a2, SHINGLE = [0x3f2229, 0x4a2730, 0x56303a], BARK = [0x3b2b26, 0x33251f, 0x45332b];
const IRON = COL.iron, WOOD = COL.wood, LANTERN = COL.lantern;

// A bale of hay, bound twice, with a lighter cut top.
function bale(v, r, x, y, z, turn = false) {
  const [w, d] = turn ? [0.62, 1.05] : [1.05, 0.62];
  block(v, x, y, z, w, 0.5, d, vary(0xc9a24a, 0.06, r));
  block(v, x, y + 0.5, z, w - 0.06, 0.04, d - 0.06, vary(0xddbd68, 0.05, r));
  for (const t of [-0.25, 0.25]) block(v, x + (turn ? 0 : t * w), y + 0.02, z + (turn ? t * d : 0), turn ? w + 0.02 : 0.05, 0.47, turn ? 0.05 : d + 0.02, 0x8a6a2c);
}
// A jack-o'-lantern with a glowing face towards the camera (+z).
function jack(v, x, y, z, s) {
  gourd(v, x, y, z, s, 0xd8701e);
  for (const dx of [-0.16, 0.16]) block(v, x + dx * s, y + s * 0.38, z + s * 0.43, s * 0.12, s * 0.1, 0.03, 0xffb84a, true);
  block(v, x, y + s * 0.17, z + s * 0.43, s * 0.34, s * 0.07, 0.03, 0xffb84a, true);
}
// An iron shepherd's hook with a lantern hanging out over `dir` (±1 in x).
function hookLantern(v, x, z, dir) {
  block(v, x, 0, z, 0.14, 2.45, 0.14, IRON);
  block(v, x + dir * 0.25, 2.38, z, 0.56, 0.08, 0.08, IRON);
  block(v, x + dir * 0.5, 2.18, z, 0.04, 0.2, 0.04, IRON);
  block(v, x + dir * 0.5, 1.84, z, 0.3, 0.06, 0.3, IRON);
  block(v, x + dir * 0.5, 1.9, z, 0.22, 0.28, 0.22, LANTERN, true);
  block(v, x + dir * 0.5, 2.18, z, 0.3, 0.05, 0.3, IRON);
}
// A scarecrow in a plum coat with a pumpkin head and a battered hat.
function scarecrow(v, r, x, z) {
  block(v, x, 0, z, 0.14, 2.3, 0.14, WOOD);
  block(v, x, 1.62, z, 1.6, 0.12, 0.12, WOOD);
  block(v, x, 0.95, z, 0.66, 0.85, 0.36, 0x5a3146);
  for (const dx of [-0.55, 0.55]) { block(v, x + dx, 1.5, z, 0.42, 0.3, 0.3, 0x5a3146); block(v, x + dx * 1.42, 1.48, z, 0.16, 0.24, 0.16, STRAW[1]); }
  for (let i = 0; i < 5; i++) block(v, x - 0.24 + i * 0.12, 0.82 - (i % 2) * 0.08, z + 0.1, 0.06, 0.16, 0.06, STRAW[i % 3]);
  jack(v, x, 1.82, z, 0.62);
  block(v, x, 2.36, z, 0.82, 0.06, 0.66, 0x24181e); block(v, x, 2.42, z, 0.46, 0.3, 0.42, 0x2c1e26);
  block(v, x + 0.36, 2.7, z, 0.18, 0.12, 0.3, 0x111014);                             // a crow on the brim
}
// A bundle of dry corn stalks tied in a teepee.
function cornShock(v, r, x, z) {
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, h = 1.7 + r() * 0.5;
    for (let k = 0; k < 6; k++) { const t = k / 6, spread = (1 - t) * 0.32; block(v, x + Math.cos(a) * spread, k * h / 6, z + Math.sin(a) * spread, 0.09, h / 6 + 0.02, 0.09, vary(t > 0.7 ? 0xd8bf74 : 0xb79a55, 0.08, r)); }
  }
  block(v, x, 1.0, z, 0.36, 0.08, 0.36, 0x7a3b22);
}
// A hand cart heaped with pumpkins.
function pumpkinCart(v, r, x, z) {
  block(v, x, 0.42, z, 1.7, 0.12, 1.0, WOOD);
  for (const dz of [-0.48, 0.48]) block(v, x, 0.54, z + dz, 1.7, 0.3, 0.06, COL.woodLight);
  for (const dx of [-0.82, 0.82]) block(v, x + dx, 0.54, z, 0.06, 0.3, 1.0, COL.woodLight);
  for (const dz of [-0.56, 0.56]) { block(v, x - 0.25, 0.08, z + dz, 0.7, 0.7, 0.08, COL.woodDark); block(v, x - 0.25, 0.32, z + dz, 0.16, 0.16, 0.12, IRON); }
  block(v, x + 1.1, 0.5, z - 0.3, 0.7, 0.08, 0.08, WOOD); block(v, x + 1.1, 0.5, z + 0.3, 0.7, 0.08, 0.08, WOOD);
  for (let i = 0; i < 6; i++) gourd(v, x - 0.55 + (i % 3) * 0.55, 0.62 + Math.floor(i / 3) * 0.2, z - 0.2 + Math.floor(i / 3) * 0.4 + (r() - 0.5) * 0.1, 0.46 + r() * 0.1, [0xd8701e, 0xe08a2e, 0x9d55e6, 0xf0821e][i % 4]);
}

// The ticket barn: oxblood boards with bone trim, a lit hatch onto the queue's
// gate, and a shingled gable that carries the hayride's sign.
const BX = -12, BZ = 20.65, BW = 3.0, BD = 2.4, WALL = 2.15;
function ticketBarn(v, r) {
  const x0 = BX - BW / 2, x1 = BX + BW / 2, z0 = BZ - BD / 2, z1 = BZ + BD / 2;
  v.box(x0 - 0.15, 0, z0 - 0.15, BW + 0.3, 0.12, BD + 0.3, 0x4a3d3f);
  // Vertical boards, each a slightly different red, with the hatch cut in front.
  for (let x = x0; x < x1 - 0.01; x += 0.2) {
    const c = () => vary(BARN[Math.floor(r() * 3)], 0.05, r);
    v.box(x, 0.12, z0, 0.2, WALL - 0.12, 0.12, c());
    if (x + 0.2 <= BX - 0.7 || x >= BX + 0.7) v.box(x, 0.12, z1 - 0.12, 0.2, WALL - 0.12, 0.12, c());
    else { v.box(x, 0.12, z1 - 0.12, 0.2, 0.82, 0.12, c()); v.box(x, 1.78, z1 - 0.12, 0.2, WALL - 1.78, 0.12, c()); }
  }
  for (let z = z0; z < z1 - 0.01; z += 0.2) for (const x of [x0, x1 - 0.12]) v.box(x, 0.12, z, 0.12, WALL - 0.12, 0.2, vary(BARN[Math.floor(r() * 3)], 0.05, r));
  for (const x of [x0 - 0.04, x1 - 0.12]) for (const z of [z0 - 0.04, z1 - 0.12]) v.box(x, 0.12, z, 0.16, WALL - 0.08, 0.16, TRIM);
  v.box(x0 - 0.04, WALL - 0.1, z1 - 0.08, BW + 0.08, 0.1, 0.1, TRIM);
  // The hatch: warm light inside, a bone frame, a ledge and two open shutters.
  v.box(BX - 0.7, 0.94, z1 - 0.3, 1.4, 0.84, 0.06, 0xffb867, true);
  v.box(BX - 0.78, 0.86, z1 - 0.1, 1.56, 0.08, 0.12, TRIM); v.box(BX - 0.78, 1.78, z1 - 0.1, 1.56, 0.08, 0.12, TRIM);
  for (const x of [BX - 0.78, BX + 0.7]) v.box(x, 0.86, z1 - 0.1, 0.08, 1.0, 0.12, TRIM);
  v.box(BX - 0.9, 0.84, z1, 1.8, 0.07, 0.3, WOOD);
  for (const [x, w] of [[BX - 1.42, 0.62], [BX + 0.8, 0.62]]) { v.box(x, 0.94, z1 - 0.02, w, 0.82, 0.06, vary(BARN[0], 0.06, r)); v.box(x + 0.05, 1.3, z1 + 0.04, w - 0.1, 0.06, 0.03, TRIM); }
  block(v, BX + 0.3, 0.91, z1 + 0.12, 0.28, 0.2, 0.2, 0xe8dcc0);                     // a roll of tickets
  for (const x of [x0 + 0.25, x1 - 0.25]) wallLantern(v, x, 1.2, z1);
  // A shingled gable roof with its ridge running north and south.
  const rows = 8;
  for (let k = 0; k < rows; k++) {
    const y = WALL + k * 0.2, hw = BW / 2 + 0.32 - k * (BW / 2 + 0.1) / rows;
    for (const side of [-1, 1]) {
      let z = z0 - 0.32;
      while (z < z1 + 0.3) { const len = Math.min(z1 + 0.32 - z, 0.4 + Math.floor(r() * 3) * 0.2); v.box(side < 0 ? BX - hw : BX + hw - 0.34, y, z, 0.34, 0.2, len, vary(SHINGLE[Math.floor(r() * 3)], 0.06, r)); z += len; }
    }
    for (const z of [z0, z1 - 0.12]) v.box(BX - hw + 0.34, y, z, Math.max(0.1, 2 * hw - 0.68), 0.2, 0.12, z > BZ ? vary(BARN[1], 0.05, r) : BARN[2]);
  }
  v.box(BX - 0.24, WALL + rows * 0.2, z0 - 0.34, 0.48, 0.14, BD + 0.68, 0x2b1a20);
  for (let k = 0; k < rows; k++) { const hw = BW / 2 + 0.32 - k * (BW / 2 + 0.1) / rows; for (const side of [-1, 1]) v.box(side < 0 ? BX - hw - 0.04 : BX + hw - 0.06, WALL + k * 0.2 - 0.02, z1 + 0.3, 0.1, 0.22, 0.06, TRIM); }
  block(v, BX, WALL + rows * 0.2 + 0.14, z1 + 0.2, 0.08, 0.5, 0.08, IRON);           // a weathervane: a black cat
  block(v, BX, WALL + rows * 0.2 + 0.64, z1 + 0.2, 0.5, 0.18, 0.06, IRON); block(v, BX + 0.22, WALL + rows * 0.2 + 0.8, z1 + 0.2, 0.14, 0.16, 0.06, IRON);
  // Dressing by the door: corn stalks, a hay bale, pumpkins.
  cornShock(v, r, x0 - 0.35, z1 + 0.25); cornShock(v, r, x1 + 0.35, z1 + 0.25);
  bale(v, r, x0 + 0.3, 0.02, z1 + 0.85); jack(v, x0 + 0.1, 0.54, z1 + 0.9, 0.42);
  for (let i = 0; i < 4; i++) gourd(v, x1 - 0.2 - (i % 2) * 0.42, 0.02 + Math.floor(i / 2) * 0.3, z1 + 0.75 + (i % 2) * 0.1, 0.42 + r() * 0.1, [0xd8701e, 0xe08a2e, 0xc2552a, 0xf0821e][i]);
}

// The track leaves and returns through raised ground: a wooded hill with stone
// tunnel mouths behind the station, and a low grassy bank with an underpass at
// the foreground edge. Each bore is a dark lined passage deep enough that the
// tractor and wagon are inside the hill before the farm stops drawing them.
const ROCK = [0x4f4250, 0x5a4b57, 0x463a45, 0x625363], SOIL = [0x4a3527, 0x553d2c, 0x3f2d22], MOSS = [0x34452a, 0x3d4f2e, 0x2e3d26, 0x46552f];
const LITTER = [0x5a2a26, 0x6a3a24, 0x4a3a2a, 0x3d3324, 0x6e3020, 0x553a2a];
const BORE = { half: 1.6, height: 3.0 }, INK = 0x0b080d;
const inBore = (x, lanes) => lanes.some((l) => Math.abs(x + 0.25 - l) < BORE.half);
// A stone arch round a bore's mouth on the face at z, facing +z (dir 1) or -z.
function tunnelMouth(v, r, x, z, dir, crown = true) {
  const half = BORE.half, H = BORE.height, out = dir * 0.18;
  for (let i = 0; i <= 12; i++) {                                                    // voussoirs on a round-topped arch
    const a = Math.PI * i / 12, ax = x - Math.cos(a) * (half + 0.12), ay = H - half * 0.55 + Math.sin(a) * half * 0.62;
    block(v, ax, ay - 0.2, z + out, 0.46, 0.46, 0.34, vary(i === 6 ? 0x8a7d8c : ROCK[i % 4], 0.08, r));
  }
  for (const side of [-1, 1]) for (let y = 0; y < H - half * 0.6; y += 0.42) block(v, x + side * (half + 0.12), y, z + out, 0.46, 0.4, 0.34, vary(ROCK[Math.floor(r() * 4)], 0.08, r));
  if (crown) {                                                                       // a carved skull for a keystone, and lanterns either side
    const ky = H + half * 0.1;
    block(v, x, ky, z + out + dir * 0.18, 0.34, 0.3, 0.06, 0xd9cdb8); for (const dx of [-0.08, 0.08]) block(v, x + dx, ky + 0.15, z + out + dir * 0.22, 0.07, 0.07, 0.03, INK);
    for (const side of [-1, 1]) { const lx = x + side * (half + 0.55); block(v, lx, 1.7, z + out, 0.08, 0.5, 0.08, IRON); block(v, lx, 1.42, z + out + dir * 0.06, 0.26, 0.3, 0.26, LANTERN, true); block(v, lx, 1.36, z + out + dir * 0.06, 0.32, 0.06, 0.32, IRON); }
  }
  // Roots and moss trailing over the lip, and cobwebs in the corners.
  for (let k = 0; k < 9; k++) { const rx = x - half + 0.2 + k * (half * 2 - 0.4) / 8, len = 0.2 + r() * 0.6; block(v, rx, H + 0.2 - len, z + out + dir * 0.05, 0.05, len, 0.05, r() < 0.5 ? 0x2a1d17 : MOSS[k % 4]); }
  for (const side of [-1, 1]) for (let k = 0; k < 4; k++) block(v, x + side * (half - 0.25 - k * 0.12), H - 0.55 - k * 0.12 + 0.3, z + dir * 0.08, 0.3 - k * 0.05, 0.015, 0.015, 0xcfc8d6);
}
// A dark lined passage running from the face at z back by depth (dir is the
// way the mouth faces): walls, a ceiling, a damp floor and an inky end.
function bore(v, r, x, z, dir, depth) {
  const half = BORE.half, H = BORE.height, z0 = dir > 0 ? z - depth : z;
  v.box(x - half, 0.01, z0, half * 2, 0.012, depth, 0x231a18);
  for (const side of [-1, 1]) v.box(side < 0 ? x - half - 0.3 : x + half, 0, z0, 0.3, H, depth, 0x17111a);
  v.box(x - half - 0.3, H - 0.25, z0, half * 2 + 0.6, 0.3, depth, 0x120d14);
  v.box(x - half, 0, dir > 0 ? z0 : z0 + depth - 0.2, half * 2, H, 0.2, INK);
  for (let k = 0; k < depth; k += 1.6) v.box(x - half + 0.15, 0.02, z0 + k, half * 2 - 0.3, 0.02, 0.18, 0x3a2c24);  // old sleepers
}
// A heightfield hill of soil, rock strata and mossy top, with bores cut for the lanes.
function hill(v, r, { x0, x1, z0, z1, peak, face, dir, lanes }) {
  for (let x = x0; x < x1; x += 0.5) for (let z = z0; z < z1; z += 0.5) {
    const sx = Math.min(x - x0, x1 - 0.5 - x), back = dir > 0 ? z - z0 : z1 - 0.5 - z, front = dir > 0 ? z1 - 0.5 - z : z - z0;
    let h = peak * Math.min(1, 0.35 + sx / 3.2) * Math.min(1, 0.5 + back / 2.5) + Math.sin(x * 1.3 + z * 0.7) * 0.25 + (r() - 0.5) * 0.2;
    h = Math.max(0.6, Math.round(h * 4) / 4);
    if (front < 0.5) h = Math.min(h, face);                                            // the face steps down to the mouth
    const lane = inBore(x, lanes) && front < 7.5, near = front < 7.5 && lanes.some((l) => Math.abs(x + 0.25 - l) < BORE.half + 0.8);
    const bottom = lane ? BORE.height + 0.05 : 0;
    if (near) h = Math.max(h, BORE.height + 0.45);                                     // the bore's lining never shows through the top
    const strata = (y) => (Math.floor(y * 2.2 + x * 0.15) % 3 === 0 ? ROCK : SOIL);
    for (let y = bottom; y < h - 0.3; y += 0.5) v.box(x, y, z, 0.5, Math.min(0.5, h - 0.3 - y), 0.5, vary(strata(y)[Math.floor(r() * 3)], 0.08, r));
    // A top of moss and leaf litter, quartered so it reads as ground, not a slab.
    for (const [ox, oz] of [[0, 0], [0.25, 0], [0, 0.25], [0.25, 0.25]]) v.box(x + ox, h - 0.3, z + oz, 0.25, 0.3 + r() * 0.05, 0.25, vary(r() < 0.5 ? MOSS[Math.floor(r() * 4)] : LITTER[Math.floor(r() * LITTER.length)], 0.1, r));
    const fleck = r();
    if (fleck < 0.22) block(v, x + 0.25, h + 0.04, z + 0.25, 0.2, 0.04, 0.22, LEAVES[Math.floor(r() * LEAVES.length)]);
    else if (fleck < 0.3) { const s = 0.3 + r() * 0.25; block(v, x + 0.25, h, z + 0.25, s, s * 0.8, s, vary(0x3a3324, 0.16, r)); for (let k = 0; k < 3; k++) block(v, x + 0.25 + (r() - 0.5) * s, h + s * 0.6, z + 0.25 + (r() - 0.5) * s, 0.16, 0.14, 0.16, LEAVES[Math.floor(r() * LEAVES.length)]); }
    else if (fleck < 0.34) block(v, x + 0.25, h, z + 0.25, 0.22 + r() * 0.2, 0.14, 0.2, vary(ROCK[Math.floor(r() * 4)], 0.1, r));
  }
}
// A bare, crooked dead tree for the hilltop.
function deadTree(v, r, x, y, z, s) {
  let px = x, pz = z, py = y;
  for (let k = 0; k < 9; k++) { block(v, px, py, pz, 0.32 * s - k * 0.02, 0.4 * s, 0.32 * s - k * 0.02, BARK[k % 3]); py += 0.38 * s; px += (r() - 0.5) * 0.12; }
  for (let b = 0; b < 4; b++) { const a = r() * Math.PI * 2, len = 3 + Math.floor(r() * 3); let bx = px, by = py - b * 0.5 * s, bz = pz; for (let k = 0; k < len; k++) { bx += Math.cos(a) * 0.22 * s; bz += Math.sin(a) * 0.12 * s; by += 0.14 * s; block(v, bx, by, bz, 0.12, 0.12, 0.12, 0x2e221d); } }
}

export function buildHayrideStation(signBoard, fleet = false) {
  const v = new Voxels(), r = seeded(8813), b = SITE.bounds, root = new THREE.Group();
  const lanes = fleet ? [SITE.station.x, HAYRIDE_FLEET_BAY.station.x] : [SITE.station.x], west = fleet ? -23.9 : -19.9, east = -14.1;
  // Packed earth, straw and fallen leaves; a two-rut track with a raised grassy
  // crown down each lane; the farm's lilac cobbles where guests walk. Tiles meet
  // edge to edge (gaps showed the dark base as a grid of lines), and their
  // heights vary: wet ruts sit low, the crown and the verges stand proud.
  for (let x = b.x0; x < b.x1; x += 0.5) for (let z = b.z0; z < b.z1; z += 0.5) {
    if ((x < b.x0 + 1 || x > b.x1 - 1) && (z < b.z0 + 1 || z > b.z1 - 1)) continue;
    v.box(x, -0.45, z, 0.5, 0.46, 0.5, 0x3f3027);
    for (const [ox, oz] of [[0, 0], [0.25, 0], [0, 0.25], [0.25, 0.25]]) {
      const cx = x + ox + 0.125, cz = z + oz + 0.125, lane = Math.min(...lanes.map((l) => Math.abs(cx - l)));
      const crossing = cz > 36.9 && cz < 38.8 && cx > -20.2, path = cx > -10.15 || crossing || (cx < -18.8 && cz > 34.5 && lane > 1.55);
      const edge = Math.min(cx - b.x0, cz - b.z0, b.z1 - cz) < 1.4 && !path, rut = !path && lane >= 0.42 && lane < 1.0, crown = !path && lane < 0.42;
      const puddle = rut && Math.sin(cz * 0.9 + cx) > 0.82;
      const palette = path ? STONE : crown ? CROWN : rut ? (puddle ? PUDDLE : RUT) : edge ? GRASS : EARTH;
      const h = path ? 0.03 + r() * 0.012 : rut ? 0.012 + r() * 0.006 : crown ? 0.05 + r() * 0.02 : 0.026 + r() * 0.02;
      v.box(x + ox, 0.01, z + oz, 0.25, h, 0.25, vary(palette[Math.floor(r() * palette.length)], path ? 0.12 : 0.1, r));
      if (path) continue;
      if (rut) { if (!puddle && Math.abs((cz * 4) % 2 - 1) < 0.25) v.box(x + ox, 0.01 + h, z + oz + 0.1, 0.25, 0.006, 0.05, 0x2c2018); continue; }  // tread marks
      const fleck = r(), top = 0.01 + h;
      if (fleck < 0.14) v.box(x + ox + 0.04, top, z + oz + 0.06, 0.16, 0.02, 0.05, STRAW[Math.floor(r() * 3)]);
      else if (fleck < 0.22 && lane > 1.6) v.box(x + ox + 0.05 + r() * 0.08, top, z + oz + 0.05, 0.1, 0.022, 0.13, LEAVES[Math.floor(r() * LEAVES.length)]);
      else if (fleck < 0.27 && !crown) v.box(x + ox + 0.06 + r() * 0.1, top, z + oz + 0.07, 0.07 + r() * 0.05, 0.05, 0.07, vary(0x7d7468, 0.12, r));   // a pebble
      else if ((edge || crown) && fleck < 0.42) for (let k = 0; k < 3; k++) v.box(x + ox + 0.04 + k * 0.07, top, z + oz + 0.06 + r() * 0.1, 0.035, 0.08 + r() * 0.12, 0.035, vary(k ? 0x5a6e3c : 0x7c8a48, 0.1, r));  // a tuft
    }
  }
  // Autumn shrubs along the outer edges, clear of the gate.
  for (let z = 13; z < 42; z += 0.7) for (const x of [b.x0 + 0.35, b.x1 - 0.35]) {
    if (x > b.x1 - 1 && z > 15.4 && z < 18.6) continue;
    const h = 0.3 + r() * 0.35; block(v, x, 0.02, z, 0.55, h, 0.6, vary(0x3a3324, 0.16, r));
    for (let j = 0; j < 4; j++) block(v, x + (r() - 0.5) * 0.5, h * 0.55 + r() * 0.2, z + (r() - 0.5) * 0.5, 0.18, 0.14, 0.2, LEAVES[Math.floor(r() * LEAVES.length)]);
  }
  // The boardwalk in from the farm's west gate, under a lantern-posted arch.
  for (let x = -9.25; x < -2.8; x += 0.35) { v.box(x, 0.1, 15.95, 0.33, 0.13, 2.1, vary(WOOD, 0.06, r)); for (const z of [16, 18]) block(v, x + 0.16, 0.05, z, 0.08, 0.08, 0.08, COL.woodDark); }
  for (const z of [15.6, 18.4]) { block(v, -7.6, 0, z, 0.24, 2.75, 0.24, COL.woodDark); block(v, -7.6, 2.75, z, 0.4, 0.12, 0.4, TRIM); jack(v, -7.6, 2.87, z, 0.4); }
  block(v, -7.6, 2.55, 17, 0.2, 0.16, 3.2, COL.woodDark);
  for (let i = 0; i < 9; i++) block(v, -7.6, 2.3 - Math.sin(i / 8 * Math.PI) * 0.28, 15.9 + i * 0.35, 0.1, 0.12, 0.1, [0xffc46a, 0xff9a4a, 0xc89cff][i % 3], true);
  // Small kerbstones keep the walk to the queue legible.
  for (let z = 18.3; z < 24.5; z += 0.5) for (const x of [-9.95, -8.25]) block(v, x, 0.04, z, 0.13, 0.09, 0.36, vary(0x7a6f84, 0.12, r));
  // Passenger platform, queue pen and its fences.
  for (let x = fleet ? -23.15 : -19.0; x < -13.7; x += 0.3) v.box(x, 0.05, 31.9, 0.28, 0.13, 3.65, vary(WOOD, 0.07, r));
  for (let z = 25; z < 33.8; z += 0.3) v.box(-13.7, 0.045, z, 3.65, 0.07, 0.28, vary(0x564333, 0.06, r));
  fenceRun(v, r, -14, 24.7, -9.9, 24.7, (x) => x > -11.9 && x < -10.4);
  fenceRun(v, r, -14, 24.7, -14, 33.8, (_, z) => z > 31.9); fenceRun(v, r, -9.9, 24.7, -9.9, 33.8, (_, z) => z < 26.5); fenceRun(v, r, -14, 33.8, -9.9, 33.8);
  for (const [x, z] of [[-14, 24.7], [-9.9, 33.8]]) jack(v, x, 1.33, z, 0.36);
  for (const [x, z] of [[-13.5, 34.2], [-10, 24], [-10, 18]]) lanternPost(v, x, z, [], false);
  // Shepherd's-hook lanterns along the track, and at the platform's ends.
  for (const z of [14.5, 19.5, 24.5, 29.4, 40.6]) hookLantern(v, west + 0.15, z, 1);
  for (const z of [14.5, 19.5]) hookLantern(v, east - 0.15, z, -1);
  hookLantern(v, east - 0.15, 40.6, -1);
  // The ticket barn by the queue's gate, and the depot's dressing.
  ticketBarn(v, r);
  scarecrow(v, r, -13.0, 14.6);
  bale(v, r, -11.6, 0.02, 13.6); bale(v, r, -11.6, 0.02, 14.3); bale(v, r, -11.6, 0.52, 13.95, true);
  for (let i = 0; i < 3; i++) jack(v, -12.3 + i * 0.55, 0.02, 15.7 + (i % 2) * 0.2, 0.4 + (i % 2) * 0.1);
  if (!fleet) {
    pumpkinCart(v, r, -21.6, 21.8);
    for (const [dx, dz, y, t] of [[0, 0, 0.02, false], [1.1, 0, 0.02, false], [0.55, 0, 0.52, false], [0.2, 1.2, 0.02, true]]) bale(v, r, -22.3 + dx, y, 15.6 + dz, t);
    scarecrow(v, r, -21.4, 28.6);
    for (let i = 0; i < 5; i++) gourd(v, -22.6 + i * 0.5, 0.02, 35.2 + (i % 2) * 0.3, 0.42 + r() * 0.12, [0xd8701e, 0x9d55e6, 0xe08a2e][i % 3]);
  } else for (let i = 0; i < 4; i++) jack(v, -24.1, 0.02, 30.2 + i * 0.9, 0.36);
  // The tree arches where the track meets the woods.
  // The way out: a wooded hill behind the station, the track running into it.
  const into = signBoard("Into the Hollow", "", 2.1), dz = SITE.departurePortal.z, rz = SITE.returnPortal.z;
  hill(v, r, { x0: west - 2.2, x1: east + 2.6, z0: dz - 8.5, z1: dz + 0.5, peak: 4.8, face: 4.2, dir: 1, lanes });
  for (const l of lanes) { bore(v, r, l, dz + 0.5, 1, 7.5); tunnelMouth(v, r, l, dz + 0.5, 1); }
  into.position.set(lanes[0], 4.0, dz + 0.95);
  for (const [x, s] of [[west - 0.6, 1.1], [east + 1.2, 0.9], [(west + east) / 2 + 1.5, 1.2]]) deadTree(v, r, x, 4.4, dz - 5.5 - r() * 1.5, s);
  for (const [x, z, tilt] of [[west + 0.6, dz - 2.2, 0.08], [west + 1.5, dz - 2.6, -0.06], [east + 0.4, dz - 2.4, 0.1]]) {   // an old burial ground on the hill
    block(v, x, 4.45, z, 0.5, 0.62, 0.14, vary(0x6e6878, 0.08, r)); block(v, x + tilt, 5.0, z, 0.36, 0.16, 0.14, vary(0x77708a, 0.08, r)); block(v, x, 4.45, z + 0.35, 0.5, 0.06, 0.5, vary(0x2e3a26, 0.1, r));
  }
  block(v, west + 0.6, 5.2, dz - 2.2, 0.16, 0.12, 0.26, 0x111014);
  // The way home: a low grassy bank across the foreground, the track passing under it.
  hill(v, r, { x0: west - 1.6, x1: east + 2.0, z0: rz + 0.2, z1: rz + 5, peak: 3.1, face: 3.4, dir: -1, lanes });
  for (const l of lanes) { bore(v, r, l, rz + 0.2, -1, 4.8); tunnelMouth(v, r, l, rz + 0.2, -1, false); }
  for (let x = west - 1.2; x < east + 1.6; x += 0.5) if (!inBore(x, lanes)) block(v, x + 0.25, 3.35, rz + 0.45, 0.5, 0.3 + (Math.floor(x * 2) % 2) * 0.1, 0.3, vary(ROCK[Math.floor(r() * 4)], 0.08, r));  // a parapet along the lip
  for (const l of lanes) for (const side of [-1, 1]) { const px = l + side * (BORE.half + 0.4); block(v, px, 3.35, rz + 0.45, 0.12, 0.3, 0.12, IRON); block(v, px, 3.62, rz + 0.45, 0.22, 0.26, 0.22, LANTERN, true); }
  root.add(v.build(), into); root.name = "The Hollow Hayride farm station";
  // The hayride's sign across the ticket barn's gable, facing the camera.
  const sign = signBoard("The Hollow Hayride", "tickets · woodland scares", 2.8);
  sign.position.set(BX, 2.68, BZ + BD / 2 + 0.36); sign.userData = { type: "hayride", hayrideLabel: true }; root.add(sign);
  const exit = signBoard("Farm →", "this way out", 1.7); exit.position.set(-11.2, 1.55, 36.95); exit.userData.hayrideLabel = true; root.add(exit);
  const post = new Voxels(); block(post, -11.2, 0, 36.85, 0.16, 1.3, 0.16, COL.woodDark); root.add(post.build());
  if (fleet) {
    const bay = signBoard("Tractor II", "second boarding bay", 2.2); bay.position.set(HAYRIDE_FLEET_BAY.station.x, 1.75, 36.2); bay.userData = { type: "hayride", hayrideLabel: true }; root.add(bay);
    const posts = new Voxels(); for (const dx of [-0.95, 0.95]) block(posts, HAYRIDE_FLEET_BAY.station.x + dx, 0, 36.1, 0.14, 1.75, 0.14, COL.woodDark); root.add(posts.build());
  }
  return { root, sign };
}
// Where the station's warm lamp hangs: over the ticket barn's hatch.
export const HAYRIDE_STATION_LAMP = Object.freeze({ x: BX, y: 1.9, z: BZ + BD / 2 + 0.9 });
