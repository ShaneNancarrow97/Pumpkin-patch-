import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { foyerLayout } from "./rules/hollow-house.js";
import { FOYER_FINISH_BY_ID } from "./content/hollow-house.js";

const WOOD = [0x59402f, 0x76563a, 0x3d2d2b], STONE = [0x6c6370, 0x938493, 0x46424f], PLUM = [0x4e3049, 0x71475f, 0x302436], GOLD = 0xc7a36a, IRON = 0x292530, CREAM = 0xe1cda2;
const masonry = (v, r, x, y, z, w, h, d) => v.block(x, y, z, w, h, d, vary(STONE[(r() * 3) | 0], .08, r));

function lantern(v, x, y, z, size = 1) {
  v.block(x, y, z, .37 * size, .07 * size, .37 * size, IRON);
  v.block(x, y + .08 * size, z, .24 * size, .33 * size, .24 * size, 0xffb75c, true);
  for (const dx of [-.14, .14]) for (const dz of [-.14, .14]) v.block(x + dx * size, y + .05 * size, z + dz * size, .035 * size, .4 * size, .035 * size, IRON);
  v.block(x, y + .42 * size, z, .42 * size, .08 * size, .42 * size, IRON); v.block(x, y + .5 * size, z, .24 * size, .08 * size, .24 * size, GOLD);
}
function candle(v, x, y, z, size = 1, wax = 0xe2c8a2) {
  v.block(x, y, z, .19 * size, .05 * size, .19 * size, GOLD); v.block(x, y + .05 * size, z, .095 * size, .35 * size, .095 * size, wax);
  v.block(x, y + .4 * size, z, .07 * size, .14 * size, .07 * size, 0xffc56c, true); v.block(x, y + .54 * size, z, .035 * size, .07 * size, .035 * size, 0xffe1a0, true);
}
function pumpkin(v, x, y, z, radius = .3, seed = 0) {
  const r = seeded(seed + 16), unit = radius / 2;
  for (let yy = 0; yy < 5; yy++) for (let xx = -2; xx <= 2; xx++) for (let zz = -2; zz <= 2; zz++) if ((xx / 2.4) ** 2 + ((yy - 2) / 2.6) ** 2 + (zz / 2.4) ** 2 < 1) v.block(x + xx * unit, y + yy * unit * .75, z + zz * unit, unit * .98, unit * .75, unit * .98, vary(xx % 2 ? 0xe77a28 : 0xb65326, .08, r));
  v.block(x, y + radius * 1.65, z, radius * .2, radius * .32, radius * .2, 0x59613c);
  for (const dx of [-.25, .25]) v.block(x + dx * radius, y + radius * .8, z + radius * .92, radius * .18, radius * .2, radius * .1, 0xffc478, true);
  v.block(x, y + radius * .45, z + radius * .95, radius * .55, radius * .1, radius * .1, 0xffc478, true);
}
function skull(v, x, y, z, scale = 1) {
  v.block(x, y, z, .42 * scale, .36 * scale, .36 * scale, 0xd5c7a6); v.block(x, y + .33 * scale, z, .34 * scale, .1 * scale, .3 * scale, CREAM);
  for (const side of [-1, 1]) v.block(x + side * .11 * scale, y + .17 * scale, z + .19 * scale, .105 * scale, .12 * scale, .03 * scale, IRON);
  v.block(x, y + .09 * scale, z + .2 * scale, .05 * scale, .07 * scale, .035 * scale, IRON);
  for (let i = -1; i <= 1; i++) v.block(x + i * .09 * scale, y - .04 * scale, z + .1 * scale, .06 * scale, .09 * scale, .14 * scale, CREAM);
}
function book(v, x, y, z, w = .44, d = .3, colour = WINE) {
  v.block(x, y, z, w, .055, d, colour); v.block(x + .02, y + .055, z, w - .055, .12, d - .04, 0xd1bd96); v.block(x, y + .175, z, w, .045, d, colour); v.block(x - w / 2 + .025, y + .04, z, .05, .16, d, colour);
}
const WINE = 0x6f3346;
// Candle and lantern flames: the only glows a lighting finish recolours, so
// moonlit windows, the fire and the maze door keep their own light.
const FLAME = new Set([0xffb75c, 0xffc56c, 0xffe1a0]);
// Pixel letters for the maze door's sign, five rows each.
const LETTERS = { M: ["10001", "11011", "10101", "10001", "10001"], A: ["0110", "1001", "1111", "1001", "1001"], Z: ["1111", "0001", "0110", "1000", "1111"], E: ["1111", "1000", "1110", "1000", "1111"] };

// The actual farm attraction starts boarded up. Its footprint stays within the
// prepared meadow pitch throughout restoration and all five reception tiers.
export function buildHollowExterior(status = "derelict", tier = 1) {
  status = typeof status === "object" ? status.status ?? "derelict" : status;
  tier = Math.max(1, Math.min(5, Math.trunc(tier) || 1));
  const restored = ["ready", "open", "closed", "restored"].includes(status), working = status === "restoring", v = new Voxels(), r = seeded(918 + tier), w = 7.1, d = 4.1, h = 4.35 + (tier > 2 ? .35 : 0), roof = restored ? 0x3b2948 : 0x302a36;
  v.block(0, -.04, 0, 7.8, .18, 4.9, STONE[2]);
  for (const face of ["front", "back", "left", "right"]) {
    const side = face === "left" || face === "right", length = side ? d : w;
    const block = (u, y, out, ww, hh, dd, colour, glow = false) => side ? v.block(face === "left" ? -w / 2 - out : w / 2 + out, y, u, dd, hh, ww, colour, glow) : v.block(u, y, face === "front" ? d / 2 + out : -d / 2 - out, ww, hh, dd, colour, glow);
    // Back the decorative joints; an exterior should never reveal the far side.
    block(0, .06, -.08, length, h, .14, restored ? PLUM[2] : 0x342f38);
    for (let y = .15, row = 0; y < h; y += .24, row++) for (let x = -length / 2 + .18 + row % 2 * .19; x < length / 2; x += .4) {
      if (Math.abs(x) > length / 2 - .07 || face === "front" && Math.abs(x) < .73 && y < 2.6) continue;
      block(x, y, 0, .38, .225, .2, vary(restored ? PLUM[row % 3] : [0x4e454b, 0x62525a, 0x342f38][row % 3], .07, r));
    }
    for (const y of [.55, 3.07, h - .13]) block(0, y, .1, length + .1, .12, .17, restored ? GOLD : WOOD[2]);
    for (const x of [-length / 2 + .08, length / 2 - .08]) block(x, .15, .12, .18, h - .15, .25, WOOD[2]);
    const windows = side ? [0] : [-2.28, 2.28];
    for (const x of windows) {
      block(x, 1.35, .12, 1.24, 1.65, .16, IRON); block(x, 1.49, .23, .94, 1.32, .06, restored ? 0xffad68 : 0x302f3d, restored);
      for (const edge of [-.57, .57]) block(x + edge, 1.38, .3, .11, 1.56, .14, restored ? GOLD : WOOD[1]);
      block(x, 1.43, .31, .07, 1.45, .08, WOOD[2]); block(x, 2.04, .32, 1.05, .07, .08, WOOD[2]);
      for (let step = 0; step < 4; step++) block(x, 2.93 + step * .12, .18, 1.25 - step * .26, .12, .2, restored ? STONE[1] : STONE[2]);
      if (!restored) for (let plank = 0; plank < 3; plank++) block(x, 1.5 + plank * .4, .39, 1.28, .16, .09, vary(WOOD[1], .14, r));
    }
  }
  v.block(0, .15, 2.16, 1.48, 2.5, .15, IRON); v.block(0, .2, 2.27, 1.22, 2.32, .12, restored ? WINE : WOOD[2]);
  v.block(.42, 1.26, 2.36, .09, .15, .05, GOLD);
  if (!restored) for (let i = 0; i < 4; i++) v.block(0, .5 + i * .48, 2.39, 1.48, .17, .1, WOOD[i % 3]);
  for (let i = 0; i < 3; i++) v.block(0, i * .09, 2.36 + (2 - i) * .15, 1.9 - i * .15, .1, .42, STONE[1]);
  // A sealed roof beneath the worn slates, with gables at both ends.
  for (let z = -2.4; z < 2.5; z += .24) v.block(0, h + (2.5 - Math.abs(z)) * .8 - .23, z, 7.65, .37, .27, roof);
  for (const side of [-1, 1]) for (let y = h; y < h + 2; y += .16) v.block(side * w / 2, y, 0, .18, .18, Math.max(.06, 5 - (y - h) * 2.5), roof);
  for (let z = -2.4; z < 2.5; z += .24) for (let x = -3.8; x < 3.9; x += .3) {
    if (!restored && ((Math.round(x * 7) + Math.round(z * 8)) % 13 === 0 || x < -2.5 && z < -1.5)) continue;
    v.block(x, h + (2.5 - Math.abs(z)) * .8, z, .295, .14, .25, vary(roof, .12, r));
  }
  for (let x = -3.8; x <= 3.8; x += .26) v.block(x, h + 2.12, 0, .25, .14, .3, restored ? GOLD : WOOD[2]);
  // Two pointed turrets give the restored property a recognisable silhouette.
  for (const side of [-1, 1]) {
    for (let y = .1; y < h + .6; y += .3) v.block(side * 3.15, y, -1.44, .87, .28, .95, vary(STONE[(Math.floor(y * 10) + tier) % 3], .05, r));
    for (let i = 0; i < 8; i++) v.block(side * 3.15, h + .6 + i * .19, -1.44, 1.19 - i * .135, .2, 1.24 - i * .14, roof);
    v.block(side * 3.15, h + 2.16, -1.44, .06, .42, .06, GOLD);
    if (restored) lantern(v, side * .98, 1.92, 2.25, .72);
  }
  if (working) {
    for (const x of [-3.7, 0, 3.7]) { v.block(x, 0, 2.4, .08, 4.7, .08, WOOD[1]); v.block(x, 0, -2.3, .08, 4.7, .08, WOOD[1]); }
    for (const y of [1.5, 3, 4.5]) { v.block(0, y, 2.4, 7.6, .1, .08, WOOD[1]); for (let x = -3.6; x < 3.6; x += .32) v.block(x, y, 2.24, .3, .07, .5, WOOD[2]); }
  }
  if (restored) {
    for (const side of [-1, 1]) {
      v.block(side * 1.2, 3.25, 2.22, .54, 1.1 + tier * .06, .09, tier > 3 ? 0x9b6c42 : WINE); v.block(side * 1.2, 3.2, 2.29, .13, .5, .025, GOLD);
      pumpkin(v, side * 2.4, .1, 2.12, .26 + tier * .014, side + 98);
    }
    if (tier >= 3) for (const side of [-1, 1]) { v.block(side * 1.75, h + .23, .8, 1.05, 1.02, .75, PLUM[1]); v.block(side * 1.75, h + .4, 1.2, .58, .55, .045, 0xffb26e, true); }
    // Crooked grave markers and thorny ivy remain inside the building pitch.
    for (const side of [-1, 1]) {
      v.block(side * 3.28, .08, 2.06, .43, .63, .2, STONE[2]);
      v.block(side * 3.28, .71, 2.06, .29, .12, .2, STONE[1]);
      v.block(side * 3.28, .3, 2.18, .035, .25, .025, STONE[0]);
      v.block(side * 3.28, .46, 2.18, .18, .035, .025, STONE[0]);
      for (let i = 0; i < 11; i++) {
        const x = side * (3.48 + Math.sin(i * 1.4) * .12), y = .3 + i * .31;
        v.block(x, y, 2.19, .075, .34, .07, 0x282c34);
        if (i % 2) v.block(x - side * .11, y + .1, 2.22, .18, .08, .06, 0x4a404d);
      }
      if (tier >= 3) {
        v.block(side * 1.75, h + .46, 1.24, .46, .42, .035, 0x211c2b);
        for (const dx of [-.1, .1]) v.block(side * 1.75 + dx, h + .68, 1.27, .065, .055, .025, 0xcab4e0, true);
      }
    }
    if (tier >= 4) { v.block(0, 2.96, 2.27, 1.75, .12, .34, GOLD); skull(v, 0, 3.08, 2.27, .64); }
    if (tier >= 5) for (const side of [-1, 1]) v.block(side * 3.7, .1, 1.58, .24, 2.2, .24, GOLD);
  }
  const group = v.build(); group.userData = { status, tier, door: { x: 0, y: 1.3, z: 2.4 }, sign: { x: 0, y: 4.25, z: 2.33 }, footprint: { w: 8, d: 5 } }; return group;
}

// A gothic arch as a smooth band of stones, from each springing to a pointed
// apex; `put` lays one stone and its gold underside.
function archBand(put, cx, y0, span, rise, n = 7) {
  for (const side of [-1, 1]) for (let i = 0; i < n; i++) { const x = span * (1 - i / n); put(cx + side * x, y0 + rise * (1 - (x / span) ** 1.5), i); }
}
function gothicWindow(v, x, y, z, width, height, side = false) {
  const block = (u, yy, out, w, h, d, c, glow = false) => side ? v.block(x + out, yy, z + u, d, h, w, c, glow) : v.block(x + u, yy, z + out, w, h, d, c, glow);
  block(0, y - .12, .06, width + .26, height + .2, .17, IRON);
  block(0, y, .17, width, height, .08, 0x4d648a, true);
  for (const u of [-width / 2 - .08, width / 2 + .08]) block(u, y - .06, .27, .14, height + .12, .17, STONE[1]);
  for (let i = 0; i < 5; i++) block(0, y + height + i * .13, .18, Math.max(.08, width + .26 - i * .25), .14, .19, STONE[1]);
  block(0, y - .1, .32, .06, height + .16, .06, GOLD);
  block(0, y + height * .48, .32, width + .05, .07, .06, GOLD); block(0, y - .18, .3, width + .5, .14, .3, STONE[1]);
}
function painting(v, x, y, z, w = 1, h = 1.4, variant = 0) {
  v.block(x, y, z, w, h, .13, GOLD); v.block(x, y + .1, z + .09, w - .17, h - .2, .06, [0x352c43, 0x3c3942, 0x482d3c][variant % 3]);
  const mid = y + h * .42; v.block(x, mid - .2, z + .14, w * .42, h * .31, .035, PLUM[1]); v.block(x, mid + .21, z + .15, w * .25, h * .23, .045, variant % 2 ? 0xadb49b : 0xbca88b);
  for (const dx of [-.07, .07]) v.block(x + dx * w, mid + .35, z + .18, .035, .025, .025, 0xf5c174, true);
  for (const edge of [-.5, .5]) for (let yy = y + .12; yy < y + h; yy += .18) v.block(x + edge * w, yy, z + .08, .07, .07, .055, 0xe0c794);
}

// A real cutaway hall, with architectural fixtures separate from saved props.
// The front and near halves of side walls are lowered so decorating remains
// legible from the default camera. Coordinates match the pure foyer layout.
export function buildHollowFoyer(s) {
  const L = foyerLayout(s), h = s.hollowHouse, tier = h.tier, f = h.foyer?.finishes ?? {}, v = new Voxels(), r = seeded(730 + tier), W = L.w / 2, D = L.d / 2, ceiling = 4.7 + tier * .16;
  const floor = String(f.floor ?? "wood"), wall = String(f.walls ?? "wallpaper"), reception = String(f.reception ?? "wood"), entrance = String(f.entrance ?? "gothic"), effects = String(f.effects ?? "none");
  v.block(0, -.22, 0, L.w + .5, .22, L.d + .5, STONE[2]);
  // Individual floorboards, diamond tile inlays, stone runs or a woven carpet.
  if (/tile/.test(floor)) {
    for (let x = -W; x < W; x += .5) for (let z = -D; z < D; z += .5) { const ix = Math.round((x + W) * 2), iz = Math.round((z + D) * 2); v.block(x + .25, 0, z + .25, .485, .055, .485, (ix + iz) % 2 ? 0x403943 : 0x95858a); v.block(x + .25, .058, z + .25, .07, .01, .07, GOLD); }
  } else if (/stone/.test(floor)) {
    for (let z = -D; z < D; z += .42) for (let x = -W; x < W; x += .8) masonry(v, r, x + .4, 0, z + .21, .78, .055, .4);
  } else {
    for (let z = -D; z < D; z += .24) for (let x = -W; x < W; x += .9) { v.block(x + .45, 0, z + .12, .884, .055, .226, vary(WOOD[(Math.floor(x * 5 + z * 7) + 1000) % 3], .12, r)); for (const dx of [-.35, .35]) v.block(x + .45 + dx, .058, z + .12, .02, .008, .02, IRON); }
    if (/carpet/.test(floor)) for (let x = -W + .65; x < W - .65; x += .35) for (let z = -D + .65; z < D - .65; z += .35) { const edge = Math.min(x + W, W - x, z + D, D - z) < 1.08; v.block(x + .16, .065, z + .16, .34, .025, .34, edge ? GOLD : Math.abs(Math.round(x * 3) + Math.round(z * 3)) % 3 ? 0x5f354d : 0x8f5a60); }
  }
  // A runner carries guests from the front door to a medallion under the
  // chandelier, then on to the maze door. It lies in the reserved routes, so
  // placed pieces never sit on it.
  const hub = { x: .15, z: .3 }, maze = L.mazeDoor;
  if (!/carpet/.test(floor)) {
    const wide = .9, runner = (x0, z0, x1, z1) => {
      const alongZ = x0 === x1, len = Math.abs(alongZ ? z1 - z0 : x1 - x0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const slab = (u, w, h, c) => alongZ ? v.block(cx + u, .056, cz, w, h, len, c) : v.block(cx, .056, cz + u, len, h, w, c);
      slab(0, wide, .016, 0x5c2435); for (const u of [-wide / 2 + .05, wide / 2 - .05]) slab(u, .06, .02, GOLD);
      for (let t = -len / 2 + .4; t < len / 2 - .25; t += .75) { const x = alongZ ? cx : cx + t, z = alongZ ? cz + t : cz; v.block(x, .056, z, .2, .019, .06, 0xb98a5c); v.block(x, .056, z, .06, .019, .2, 0xb98a5c); }
    };
    runner(hub.x, D - .05, hub.x, hub.z + .78);
    runner(hub.x + .78, hub.z, maze.x - wide / 2, hub.z);
    runner(maze.x, hub.z - wide / 2, maze.x, -D + .62);
    v.block(maze.x, .056, hub.z, wide, .016, wide, 0x5c2435); v.block(maze.x + wide / 2 - .05, .056, hub.z, .06, .02, wide, GOLD); v.block(maze.x, .056, hub.z + wide / 2 - .05, wide, .02, .06, GOLD);
    for (let x = -.84; x <= .84; x += .12) for (let z = -.84; z <= .84; z += .12) {
      const d = Math.hypot(x, z); if (d > .86) continue;
      const star = Math.abs(Math.cos(Math.atan2(z, x) * 4)) * .46 + .1 > d;
      v.block(hub.x + x, .056, hub.z + z, .12, d > .72 ? .021 : .017, .12, d > .72 ? GOLD : star ? 0xb98a5c : d > .6 ? PLUM[2] : WINE);
    }
  }
  const wallColour = /brick/.test(wall) ? 0x694750 : /stone/.test(wall) ? 0x6f6979 : /wood/.test(wall) ? 0x624535 : 0x503849;
  // Raised panelling/trim must sit in front of masonry. Coplanar faces
  // shimmered into gold stripes at the sharp Fold viewing angle.
  const wallPanel = (face, u, y, w, hh, c, relief = 0) => face === "back" ? v.block(u, y, -D + relief, w, hh, .2, c) : v.block(face === "left" ? -W + relief : W - relief, y, u, .2, hh, w, c);
  for (const face of ["back", "left", "right"]) {
    const len = face === "back" ? L.w : L.d;
    for (let u = -len / 2 + .2; u < len / 2; u += .4) {
      const height = face !== "back" && u > D * .1 ? 1.1 : ceiling;
      for (let y = .12; y < height; y += .3) wallPanel(face, u, y, .39, Math.min(.285, height - y), vary(wallColour, /brick|stone/.test(wall) ? .14 : .04, r));
      wallPanel(face, u, .1, .4, 1.1, WOOD[2], .035);
      for (const y of [.25, 1.1]) wallPanel(face, u, y, .4, .07, GOLD, .065);
      if (/wallpaper/.test(wall) && height > 2) for (let y = 1.45; y < ceiling - .3; y += .55) wallPanel(face, u, y, .055, .17, 0x906d82, .025);
    }
    for (let u = -len / 2; u <= len / 2; u += 1.35) wallPanel(face, u, .15, .1, face !== "back" && u > D * .1 ? .96 : ceiling - .2, WOOD[2], .075);
    wallPanel(face, 0, .05, len, .12, STONE[1], .085);
    if (face === "back") { wallPanel(face, 0, ceiling - .15, len + .2, .14, GOLD, .065); wallPanel(face, 0, ceiling + .02, len + .3, .12, WOOD[1], .075); }
  }
  // Low front parapets frame a true doorway back onto the farm.
  for (const side of [-1, 1]) { v.block(side * (W + 1) / 2, .05, D, W - 1, .7, .22, wallColour); v.block(side * (W + 1) / 2, .75, D, W - 1, .08, .3, WOOD[1]); }
  // The front doorway: dark oak posts on stone plinths under a low pointed
  // arch, with a lit pumpkin for a keystone. It stays low so it frames the
  // hall without hiding it, even from a phone's closer camera.
  for (const side of [-1, 1]) {
    masonry(v, r, side * 1.1, .05, D, .42, .42, .44);
    v.block(side * 1.1, .47, D, .26, 1.5, .3, WOOD[2]); v.block(side * .96, .5, D, .04, 1.45, .33, GOLD);
    v.block(side * 1.1, 1.97, D, .38, .1, .38, GOLD);
  }
  archBand((x, y) => { v.block(x, y, D, .27, .22, .32, vary(WOOD[2], .06, r)); v.block(x, y - .03, D, .22, .04, .34, GOLD); }, 0, 2.07, 1.1, .5);
  v.block(0, 2.5, D, .3, .26, .36, WOOD[2]); pumpkin(v, 0, 2.76, D + .02, .15, 21);
  v.block(0, .05, D + .14, 2.6, .05, .5, STONE[2]);
  // Windows, fireplace and portraits are architecturally mounted; movable
  // portraits, candles and webs are separate catalogue props.
  gothicWindow(v, -1.4, 1.65, -D + .1, 1.2, 1.6);
  gothicWindow(v, -W + .12, 1.7, -1.1, 1.16, 1.55, true);
  gothicWindow(v, W - .12, 1.7, -1.1, 1.16, 1.55, true);
  const fireplaceX = .1;
  v.block(fireplaceX, .05, -D + .58, 2.3, .18, .95, STONE[2]); v.block(fireplaceX, .23, -D + .35, 2, 1.65, .4, STONE[1]); v.block(fireplaceX, .3, -D + .6, 1.32, 1.2, .14, 0x221b24);
  for (const side of [-1, 1]) for (let y = .23; y < 1.65; y += .2) v.block(fireplaceX + side * .88, y, -D + .65, .22, .19, .32, STONE[(Math.floor(y * 5) + tier) % 3]);
  v.block(fireplaceX, 1.83, -D + .55, 2.45, .2, .85, WOOD[1]);
  for (let i = -2; i <= 2; i++) { v.block(fireplaceX + i * .2, .37, -D + .53, .2, .11, .45, WOOD[2]); v.block(fireplaceX + i * .18, .49, -D + .53, .13, .26 + Math.sin(i * 2 + tier) * .12, .12, i % 2 ? 0xffb75f : 0xe57d43, true); }
  painting(v, fireplaceX, 2.2, -D + .17, 1.2, 1.65, 1); candle(v, -1, 2.04, -D + .5, .8); candle(v, 1.1, 2.04, -D + .5, .65);
  // Deep stairs climb into a dark landing. Their full footprint is reserved.
  const stair = L.stairs ?? { x: -W + 1.2, z: -D + 1.4, w: 1.8, d: 2.6 };
  for (let i = 0; i < 10; i++) {
    const z = stair.z + stair.d / 2 - i * stair.d / 10, y = i * .27;
    v.block(stair.x, y, z, stair.w, .16, stair.d / 10 + .02, WOOD[1]); v.block(stair.x, y - .1, z, stair.w, .1, .08, GOLD);
    for (const side of [-1, 1]) { v.block(stair.x + side * stair.w / 2, y, z, .065, .75, .065, WOOD[2]); v.block(stair.x + side * stair.w / 2, y + .75, z, .1, .1, stair.d / 10 + .07, GOLD); }
  }
  v.block(stair.x, 2.55, -D + .16, stair.w + .22, 1.65, .18, 0x17151f); for (const side of [-1, 1]) v.block(stair.x + side * (stair.w / 2 + .1), 2.55, -D + .3, .16, 1.7, .25, WOOD[1]);
  // Service counter: fixed utility with a paid visual reception finish.
  const counter = L.counter, desk = FOYER_FINISH_BY_ID[reception]?.palette ?? WOOD;
  v.block(counter.x, .08, counter.z, 2.9, 1.13, 1.08, desk[0]);
  for (const x of [-.92, 0, .92]) { v.block(counter.x + x, .22, counter.z + .55, .76, .76, .05, desk[2]); v.block(counter.x + x, .29, counter.z + .59, .63, .6, .035, desk[1]); v.block(counter.x + x, .92, counter.z + .63, .12, .06, .04, GOLD); }
  v.block(counter.x, 1.21, counter.z, 3.16, .14, 1.3, desk[1]); v.block(counter.x, 1.35, counter.z, 3.2, .055, 1.33, GOLD);
  v.block(counter.x + .62, 1.41, counter.z + .1, .46, .32, .38, IRON); v.block(counter.x + .62, 1.73, counter.z + .1, .42, .08, .34, GOLD); v.block(counter.x + .62, 1.52, counter.z + .31, .29, .12, .03, 0x84977e, true);
  for (let i = 0; i < 4; i++) v.block(counter.x + .52 + i * .07, 1.42, counter.z + .35, .045, .045, .035, CREAM);
  book(v, counter.x - .35, 1.41, counter.z + .1, .55, .43, WINE); candle(v, counter.x - 1.13, 1.41, counter.z, .7);
  for (let i = 0; i < 4; i++) v.block(counter.x - .7, 1.4 + i * .015, counter.z + .36, .3, .013, .18, CREAM);
  // The maze door: a pointed arch over a parted curtain, light leaking from
  // the corridor behind, a lit sign and a pumpkin either side.
  const gateTone = /curtain/.test(entrance) ? WINE : /grand|gold/.test(entrance) ? GOLD : STONE[1], gate = (x, y, z, w, h, d) => gateTone === STONE[1] ? masonry(v, r, x, y, z, w, h, d) : v.block(x, y, z, w, h, d, vary(gateTone, .06, r));
  v.block(maze.x, .05, -D + .09, 1.55, 3.05, .21, 0x15131d);
  for (const side of [-1, 1]) {
    for (let y = .08; y < 2.5; y += .4) gate(maze.x + side * .9, y, -D + .34, .3, .4, .32);
    for (const y of [.5, 1.4, 2.3]) v.block(maze.x + side * .9, y, -D + .51, .32, .06, .03, GOLD);
  }
  archBand((x, y) => { gate(x, y, -D + .36, .28, .26, .34); v.block(x, y - .03, -D + .37, .22, .04, .34, GOLD); }, maze.x, 2.48, .9, .72);
  gate(maze.x, 3.12, -D + .36, .32, .34, .36);
  // The corridor's light: brightest at the floor, fading up the gap.
  for (const [y, h, c] of [[.08, .7, 0x9a6ad8], [.78, .8, 0x5e3d94], [1.58, .9, 0x302048]]) v.block(maze.x, y, -D + .2, .3, h, .03, c, true);
  v.block(maze.x, .056, -D + .33, 1.2, .02, .1, 0x7a52b8, true);
  for (const side of [-1, 1]) for (let k = 0; k < 4; k++) { const x = side * (.17 + k * .15); v.block(maze.x + x, .12 + k * .05, -D + .26, .15, 2.55 - k * .12, .05, k % 2 ? PLUM[0] : WINE); }
  v.block(maze.x, 2.62, -D + .27, 1.3, .14, .08, GOLD);
  // The sign, hung above the arch.
  v.block(maze.x, 3.58, -D + .3, 1.42, .5, .08, 0x1c1620); v.block(maze.x, 3.55, -D + .28, 1.52, .56, .05, GOLD);
  let col = -10;
  for (const ch of "MAZE") { const rows = LETTERS[ch]; rows.forEach((row, y) => [...row].forEach((bit, x) => bit === "1" && v.block(maze.x + (col + x + .5) * .055, 3.94 - y * .062, -D + .35, .05, .056, .03, 0xf0c27a, true))); col += rows[0].length + 1; }
  skull(v, maze.x, 4.1, -D + .32, .5);
  lantern(v, maze.x - 1.15, 1.85, -D + .4, .72); lantern(v, maze.x + 1.15, 1.85, -D + .4, .72);
  pumpkin(v, maze.x - 1.12, .06, -D + .66, .24, 30); pumpkin(v, maze.x + 1.12, .06, -D + .66, .2, 31);
  if (entrance === "briar-arch") for (const side of [-1, 1]) for (let i = 0; i < 9; i++) { const x = maze.x + side * (.87 + Math.sin(i * 1.8) * .1), y = .35 + i * .28; v.block(x, y, -D + .56, .13, .26, .1, i % 2 ? 0x536d43 : 0x82915d); if (i % 3 === 0) v.block(x + side * .1, y + .1, -D + .6, .17, .14, .13, WINE); }
  // Beams run along the walls only, so nothing crosses the view of the back
  // wall and the maze door's sign.
  for (const x of [-W + .2, W - .2]) v.block(x, ceiling, -D * .3, .17, .18, L.d * .65, WOOD[2]);
  v.block(0, ceiling, -D + .2, L.w, .18, .17, WOOD[2]);
  // The chandelier hangs over the medallion; the lighting finish decides how
  // grand it is: an iron ring, a silver one with crystals, or two brass tiers.
  const lighting = String(f.lighting ?? "candle-glow"), grand = /amber/.test(lighting), moon = /moon/.test(lighting), metal = moon ? 0x9d97ad : grand ? GOLD : 0x8a6a3e, ringY = ceiling - 1.4;
  v.block(hub.x, ringY + .9, hub.z, .05, ceiling - ringY - .9, .05, metal); v.block(hub.x, ceiling, hub.z, .34, .07, .34, WOOD[1]); v.block(hub.x, ringY - .14, hub.z, .18, .2, .18, metal);
  for (const [R, lift, n] of grand ? [[1.05, 0, 12], [.58, .42, 7]] : [[.92, 0, 8]]) {
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; v.block(hub.x + Math.cos(a) * R, ringY + lift, hub.z + Math.sin(a) * R, .21, .06, .21, metal); }
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + .5; for (let k = 1; k < 6; k++) { const t = k / 6; v.block(hub.x + Math.cos(a) * R * (1 - t), ringY + lift + t * (.9 - lift), hub.z + Math.sin(a) * R * (1 - t), .03, .18, .03, metal); } }
    for (let i = 0; i < n; i++) { const a = (i + .5) / n * Math.PI * 2, x = hub.x + Math.cos(a) * R, z = hub.z + Math.sin(a) * R; candle(v, x, ringY + lift + .05, z, .62); if (moon || grand) v.block(x, ringY + lift - .2, z, .06, .14, .06, moon ? 0xd9c8f2 : 0xffd9a0, true); }
  }
  pumpkin(v, W - 1.1, .06, D - 1, .33, 18); pumpkin(v, W - 1.7, .06, D - .85, .23, 19);
  for (const [x, z] of [[-W + .55, D - .65], [W - .55, D - .65]]) { v.block(x, .06, z, .34, 1.3, .34, STONE[2]); lantern(v, x, 1.36, z, .72); }
  // Fine cobweb spokes in a rear corner, never across a visitor route.
  for (let i = 0; i < 6; i++) { const len = 1.2 - i * .18; v.block(-W + len / 2, ceiling - 1.1 + i * .18, -D + .15, len, .022, .025, 0xaea7bd); v.block(-W + .12 + i * .18, ceiling - 1.15 + len / 2, -D + .16, .022, len, .025, 0xaea7bd); }
  const tone = lighting !== "candle-glow" ? FOYER_FINISH_BY_ID[lighting]?.color : null;
  if (tone) for (const box of v.glow) if (FLAME.has(box[6])) box[6] = tone;
  const group = v.build(); group.userData = { ...L, ceiling, hub, chandelierY: ringY, lightTone: tone ?? 0xffb766, attendant: { ...L.attendant, y: .06 }, effects, animation: "foyer" }; return group;
}

// All catalogue pieces are actual voxel objects with their own silhouettes,
// kept separate from the hall so the player can move, store and rotate them.
export function buildFoyerDecor(id) {
  const v = new Voxels(), r = seeded(124 + [...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0));
  if (id === "velvet-bench" || id === "spectral-sofa") {
    const sofa = id === "spectral-sofa", w = sofa ? 2.1 : 1.8;
    for (const x of [-w / 2 + .14, w / 2 - .14]) for (const z of [-.3, .3]) v.block(x, 0, z, .11, .42, .11, WOOD[2]);
    v.block(0, .35, 0, w, .16, .8, WOOD[1]); v.block(0, .51, -.26, w, .7, .15, sofa ? PLUM[1] : WINE); v.block(0, .51, .05, w - .12, .19, .65, sofa ? 0x665b79 : 0x8c4d60);
    if (sofa) for (const side of [-1, 1]) v.block(side * (w / 2 - .08), .5, .03, .17, .43, .77, PLUM[0]);
    for (let i = -2; i <= 2; i++) v.block(i * .3, .88, -.17, .035, .035, .025, GOLD);
  } else if (id === "parlour-table") {
    for (const x of [-.4, .4]) for (const z of [-.3, .3]) v.block(x, .05, z, .1, .72, .1, WOOD[2]); v.block(0, .76, 0, 1.15, .12, .95, WOOD[1]); v.block(0, .89, 0, .68, .012, .7, WINE); book(v, -.15, .91, 0, .35, .3, PLUM[1]);
  } else if (id === "gothic-cabinet") {
    v.block(0, .08, 0, 1.2, 1.8, .6, WOOD[2]);
    for (const side of [-1, 1]) { v.block(side * .29, .2, .33, .5, 1.55, .07, PLUM[0]); v.block(side * .29, .3, .38, .37, 1.31, .025, 0x6a6278); v.block(side * .08, .95, .41, .05, .09, .03, GOLD); }
    for (let i = 0; i < 4; i++) v.block(0, 1.9 + i * .12, 0, 1.35 - i * .24, .12, .74, WOOD[1]);
  } else if (id === "skull-plinth") {
    masonry(v, r, 0, 0, 0, .7, .12, .7); masonry(v, r, 0, .12, 0, .42, .87, .42); masonry(v, r, 0, .99, 0, .72, .12, .72); skull(v, 0, 1.15, .04, 1.03);
  } else if (id === "pumpkin-cluster") {
    pumpkin(v, -.27, .05, .07, .3, 3); pumpkin(v, .31, .03, .12, .25, 4); pumpkin(v, .04, .04, -.28, .19, 5);
  } else if (id === "book-stack") {
    for (let i = 0; i < 4; i++) book(v, i % 2 * .05 - .025, i * .19, 0, .65 - i * .035, .48, [WINE, PLUM[1], 0x425b4c, WOOD[1]][i]);
    v.block(.12, .78, 0, .11, .12, .11, GOLD);
  } else if (id === "standing-lantern") {
    v.block(0, 0, 0, .5, .1, .5, IRON); v.block(0, .1, 0, .11, 1.48, .11, IRON); v.block(0, 1.58, 0, .5, .08, .5, GOLD); lantern(v, 0, 1.66, 0, 1);
  } else if (id === "candle-cluster") {
    v.block(0, 0, 0, .65, .055, .55, IRON); candle(v, -.18, .06, .1, 1.1); candle(v, .17, .06, .08, .8); candle(v, 0, .06, -.15, 1.3);
  } else if (id === "haunted-portrait") {
    painting(v, 0, 0, 0, 1.2, 1.55, 2);
  } else if (id === "cobweb") {
    for (let i = 0; i < 7; i++) { const len = 1.2 - i * .15; v.block(-.6 + len / 2, i * .15, 0, len, .023, .035, 0xc1b7cc); v.block(-.6 + i * .15, len / 2, 0, .023, len, .035, 0xc1b7cc); }
    for (let i = 0; i < 6; i++) v.block(-.6 + i * .18, i * .18, 0, .045, .045, .035, CREAM);
    v.block(.08, .43, .04, .09, .12, .08, IRON);
  } else if (id === "ghost-orb") {
    for (let y = 0; y < 6; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (x*x + z*z + (y-2.5)**2*.5 < 6) v.block(x*.12, y*.12, z*.12, .119, .12, .119, 0xb4d6c2, true);
    for (const x of [-.12, .12]) v.block(x, .42, .26, .06, .09, .025, 0x373846); v.block(0, .26, .26, .1, .09, .03, 0x373846);
  } else if (id === "fog-cauldron") {
    for (let y = .15; y < .7; y += .13) for (let x = -.4; x <= .4; x += .14) for (let z = -.4; z <= .4; z += .14) if (x*x+z*z < .19 && (x*x+z*z > .08 || y < .3)) v.block(x, y, z, .14, .13, .14, IRON);
    for (const side of [-1, 1]) { v.block(side * .46, .4, 0, .13, .17, .1, GOLD); v.block(side * .22, 0, .15, .1, .18, .1, IRON); }
    v.block(0, .62, 0, .57, .035, .57, 0x917ab6, true);
  } else if (id === "grand-chandelier") {
    v.block(0, .63, 0, .045, .6, .045, GOLD); v.block(0, .39, 0, .22, .24, .22, GOLD);
    for (const [x,z] of [[-.65,0],[.65,0],[0,-.65],[0,.65]]) { v.block(x/2, .24, z/2, Math.abs(x)+.07, .08, Math.abs(z)+.07, IRON); candle(v,x,.27,z,.75); v.block(x,.05,z,.07,.15,.07,0xd1c2df,true); }
  } else if (id === "curtain-arch") {
    for (const side of [-1,1]) { v.block(side*.77,0,0,.15,2.6,.32,WOOD[2]); for(let x=0;x<3;x++)v.block(side*(.28+x*.16),.08,0,.15,2.45-x*.12,.15,PLUM[x%3]); }
    for(let i=0;i<4;i++)v.block(0,2.6+i*.13,0,1.78-i*.38,.14,.36,GOLD); v.block(0,2.52,.2,1.6,.16,.05,WINE);
  } else if (id === "ticket-sign") {
    v.block(0,0,0,.65,.08,.55,WOOD[2]); v.block(0,.08,0,.09,1.3,.09,GOLD); v.block(0,1.08,0,.96,.61,.12,WOOD[1]); v.block(0,1.15,.08,.8,.45,.035,IRON);
    for(let i=0;i<3;i++)v.block(0,1.23+i*.1,.11,.59-(i%2)*.12,.035,.015,CREAM);
  }
  const group = v.build(); group.userData = { decorId: id, animation: id === "ghost-orb" ? "ghost" : id === "fog-cauldron" ? "fog" : id === "grand-chandelier" ? "chandelier" : null };
  if(id === "fog-cauldron") {
    const positions = new Float32Array(24), geo = new THREE.BufferGeometry(); geo.setAttribute("position",new THREE.BufferAttribute(positions,3));
    const smoke = new THREE.Points(geo,new THREE.PointsMaterial({color:0xb59bce,size:.18,transparent:true,opacity:.32,depthWrite:false,toneMapped:false})); smoke.userData.foyerFog=true; group.add(smoke);
  }
  return group;
}

// Only decorative motion lives here. Tickets, queues and occupancy remain pure rules.
export function animateFoyerDecor(group, time) {
  if(group.userData.animation === "ghost") { group.position.y = (group.userData.mountY ?? .45) + Math.sin(time * 1.35 + group.position.x) * .12; group.rotation.y = Math.sin(time * .7) * .18; }
  if(group.userData.animation === "chandelier") group.rotation.z = Math.sin(time * .7) * .012;
  if(group.userData.animation === "fog") group.traverse(m=>{if(!m.userData.foyerFog)return;const p=m.geometry.attributes.position;for(let i=0;i<8;i++){const t=(time*.24+i/8)%1;p.array[i*3]=Math.sin(i*2+time*.5)*(.1+t*.35);p.array[i*3+1]=.75+t*.8;p.array[i*3+2]=Math.cos(i+time*.4)*(.1+t*.2);}p.needsUpdate=true;});
}

// Voxel boxes share one cube globally. Release instance buffers and owned
// materials, never that shared geometry (the attic fix depends on this too).
export function disposeHollowObject(object) {
  object.traverse(m => {
    if(m.isInstancedMesh) m.dispose(); else if(m.geometry) m.geometry.dispose();
    for(const material of Array.isArray(m.material)?m.material:m.material?[m.material]:[]) { material.map?.dispose(); material.dispose(); }
  });
}
