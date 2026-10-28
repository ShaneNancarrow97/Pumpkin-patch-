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
const EARTH = [0x5e4733, 0x67503a, 0x56432f, 0x6e563d], RUT = [0x3b2b20, 0x433024, 0x34261c], CROWN = [0x4a5a32, 0x3f4f2c, 0x55653a];
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

// Two old trees lean together over the track, a canopy of autumn leaves between
// them, and a veil of hanging moss and leaves where the lane goes on into the
// wood: the wagon passes out of sight behind it. The arch nearest the camera is
// kept low (under four units), so it never hides the station behind it.
function treeArch(v, r, z, west, east, sign, low = false) {
  const mid = (west + east) / 2, half = (east - west) / 2, H = low ? 2.4 : 3.3, y0 = low ? 1.95 : 2.5, y1 = low ? 3.5 : 5.2;
  const cy = (y0 + y1) / 2, ry = (y1 - y0) / 2, step = 0.42;
  for (const [x, lean] of [[west, 1], [east, -1]]) {
    for (let i = 0; i < 4; i++) block(v, x + (r() - 0.5) * 0.8 - lean * 0.2, 0, z + (r() - 0.5) * 0.9, 0.5 + r() * 0.3, 0.22, 0.4, BARK[i % 3]);
    const n = Math.round(H / 0.3);
    for (let k = 0; k < n; k++) block(v, x + lean * k * 0.045, k * 0.3, z, 0.78 - k * 0.022, 0.32, 0.72 - k * 0.02, vary(BARK[k % 3], 0.05, r));
    for (let k = 0; k < 8; k++) block(v, x + lean * (0.5 + k * half / 8), H + Math.sin(k / 8 * Math.PI) * (low ? 0.2 : 0.35), z + (r() - 0.5) * 0.3, half / 8 + 0.12, 0.24, 0.3, BARK[k % 3]);
  }
  for (let i = west - 1.2; i <= east + 1.2; i += step) for (let y = y0; y <= y1 - step; y += step) for (let dz = -1.2; dz <= 1.2; dz += step) {
    const d = Math.hypot((i - mid) / (half + 1.4), (y + step / 2 - cy) / ry, dz / 1.25);
    if (d > 1 - r() * 0.12 || d < 0.6 || (y < H && Math.abs(i - mid) < half - 0.8)) continue;
    const top = (y - y0) / (y1 - y0);
    v.box(i, y, z + dz, step, step, step, vary(LEAVES[Math.min(LEAVES.length - 1, Math.floor(r() * 3 + top * 3))], 0.07, r));
  }
  // The veil: strands of moss and leaves, ragged at the hem, darkest in the middle.
  for (let x = west + 0.35; x < east - 0.3; x += 0.24) for (const dz of [-0.12, 0.12]) {
    const centre = 1 - Math.abs(x - mid) / half, hem = Math.max(0, 0.15 + (1 - centre) * 0.9 * r());
    for (let y = hem; y < H; y += 0.3) {
      const leaf = r() < 0.16, c = leaf ? LEAVES[Math.floor(r() * LEAVES.length)] : vary(centre > 0.55 ? 0x141a14 : [0x1f2a1e, 0x26321f, 0x2e3a26][Math.floor(r() * 3)], 0.06, r);
      block(v, x + (r() - 0.5) * 0.06, y, z + dz, 0.2, Math.min(0.32, H - y), 0.12, c);
    }
  }
  const lamp = H - 0.6;                                                                 // a lantern hung from the boughs
  block(v, mid, lamp + 0.38, z + 0.5, 0.06, H - lamp - 0.38, 0.06, IRON);
  block(v, mid, lamp, z + 0.5, 0.3, 0.06, 0.3, IRON); block(v, mid, lamp + 0.06, z + 0.5, 0.22, 0.3, 0.22, LANTERN, true); block(v, mid, lamp + 0.36, z + 0.5, 0.3, 0.05, 0.3, IRON);
  if (sign) { sign.position.set(mid, H - 0.25, z + 1.55); for (const dx of [-0.75, 0.75]) block(v, mid + dx, H, z + 1.5, 0.04, 0.75, 0.04, IRON); }
}

export function buildHayrideStation(signBoard, fleet = false) {
  const v = new Voxels(), r = seeded(8813), b = SITE.bounds, root = new THREE.Group();
  const lanes = fleet ? [SITE.station.x, HAYRIDE_FLEET_BAY.station.x] : [SITE.station.x], west = fleet ? -23.9 : -19.9, east = -14.1;
  // Packed earth, straw and fallen leaves; a two-rut track with a grassy crown
  // down each lane; the farm's lilac cobbles where guests walk.
  for (let x = b.x0; x < b.x1; x += 0.5) for (let z = b.z0; z < b.z1; z += 0.5) {
    if ((x < b.x0 + 1 || x > b.x1 - 1) && (z < b.z0 + 1 || z > b.z1 - 1)) continue;
    v.box(x, -0.45, z, 0.5, 0.46, 0.5, 0x3f3027);
    for (const [ox, oz] of [[0, 0], [0.25, 0], [0, 0.25], [0.25, 0.25]]) {
      const cx = x + ox + 0.125, cz = z + oz + 0.125, lane = Math.min(...lanes.map((l) => Math.abs(cx - l)));
      const crossing = cz > 36.9 && cz < 38.8 && cx > -20.2, path = cx > -10.15 || crossing || (cx < -18.8 && cz > 34.5 && lane > 1.55);
      const edge = Math.min(cx - b.x0, cz - b.z0, b.z1 - cz) < 1.4 && !path;
      const palette = path ? STONE : lane < 0.42 ? CROWN : lane < 1.0 ? RUT : edge ? GRASS : EARTH;
      const h = 0.025 + r() * 0.009;
      v.box(x + ox + 0.003, 0.01, z + oz + 0.003, 0.244, h, 0.244, vary(palette[Math.floor(r() * palette.length)], path ? 0.12 : 0.1, r));
      if (path || (lane < 1.0 && lane >= 0.42)) continue;
      const fleck = r();
      if (fleck < 0.16) v.box(x + ox + 0.04, 0.01 + h, z + oz + 0.06, 0.16, 0.02, 0.05, STRAW[Math.floor(r() * 3)]);
      else if (fleck < 0.18 && lane > 1.6) v.box(x + ox + 0.06, 0.01 + h, z + oz + 0.05, 0.1, 0.025, 0.13, LEAVES[Math.floor(r() * LEAVES.length)]);
      else if (edge && fleck < 0.3) v.box(x + ox + 0.08, 0.01 + h, z + oz + 0.08, 0.06, 0.09, 0.06, 0x56683a);
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
  const into = signBoard("Into the Hollow", "", 2.1);
  treeArch(v, r, SITE.departurePortal.z, west, east, into);
  treeArch(v, r, SITE.returnPortal.z, west, east, null, true);
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
