// Mothlight's voxel models (handover 73): buildings, the square's fixtures and
// gardens, trees and lamps, and the village's own decor pieces. Most are written
// straight into a district's shared batch through a frame (frame(v, x, z,
// facing)), so the whole Green is a few draws; decor pieces, which move, are
// built on their own (buildVillageDecor). Realm coordinates (x east, z north)
// become three's x and -z; a model's local +z is its front. The look is an
// autumn evening: limestone, brick and black iron, lush clipped greens, crimson
// and gold trees, and every lamp and window already lit.
import { Voxels, seeded, vary } from "./voxels.js";

export const C = Object.freeze({
  stone: [0xc2baae, 0xd0c8bc, 0xb1a99d, 0xdcd5ca], stoneDark: [0x8f887f, 0x9c958b, 0x7f786f], cobble: [0x8d8995, 0x9b97a2, 0x7f7b87, 0xa8a4ad],
  brick: [0xa04a33, 0xad5a40, 0x8e402d, 0xb8664a], mortar: 0xd9cbbb, timber: 0x5a3a2a, beam: 0x3e2a20, wood: 0x8c5c3b, woodLight: 0xb07c50,
  plaster: 0xf3e5ca, plasterWarm: 0xecd3ae, plasterLilac: 0xdfd0ea, plasterRose: 0xf0d3c6, plasterSage: 0xd9e0c6,
  slate: [0x4c5079, 0x575b87, 0x444870], slatePlum: [0x5f4879, 0x6b5387, 0x533e6b], terracotta: [0xb5583a, 0xc46a48, 0xa24c32], roofMoss: [0x5a6b4a, 0x667a52],
  iron: 0x27242d, gold: 0xdcab4c, brass: 0xc9973f, glow: 0xff9632, glowSoft: 0xffb45a, window: 0xffb860, glass: 0xd8c4ff,
  leaves: [0xb3352a, 0xd0532c, 0xe8873a, 0x9c2a2a, 0xc8432e], crimson: [0xa8172c, 0xbe2135, 0x8f1226, 0xd2364b], golden: [0xe2a83a, 0xf0c252, 0xcf8f2c, 0xf6d56b],
  green: [0x4c8c3c, 0x5b9f45, 0x417a34, 0x6db250], pine: [0x2f5d46, 0x386c51, 0x29503e], violet: [0x7d4fa3, 0x9461bb, 0x6a4190, 0xa979cf], magenta: [0xb0306a, 0xc8407a, 0x9a2a5e, 0xd85a8a], teal: [0x2a7a6a, 0x3a8a7a, 0x226a5a, 0x4a9a88],
  hedge: [0x3b7733, 0x45853a, 0x336a2d], hedgeTop: [0x5c9f44, 0x68ab4b, 0x52923f], grass: [0x5e9440, 0x6aa047, 0x548838],
  flowers: [0xf28fb5, 0xd6407a, 0xf5d04a, 0xf08a3a, 0x9a6ae0, 0x6a8ef0, 0xf6f0f5, 0xe0403a],
  plum: 0x6a2f58, plumDeep: 0x4a1f3f, cream: 0xf3e6c8, moth: 0xe6d6b0, water: 0x4aa3d8,
});
const pick = (list, r) => list[(r() * list.length) | 0];
// A colour lightened or darkened in place (sRGB channels), for shading by height and side.
export const shade = (hex, k) => ((Math.min(255, ((hex >> 16) & 255) * k) | 0) << 16) | ((Math.min(255, ((hex >> 8) & 255) * k) | 0) << 8) | (Math.min(255, (hex & 255) * k) | 0);

// A frame: a model's local coordinates (x right, z towards its front) placed at
// realm (x, z) facing south, east, north or west, writing into a shared batch.
const FACING = { south: 0, east: 90, north: 180, west: 270 };
export function frame(v, rx, rz, facing = "south", base = 0) {
  const deg = typeof facing === "number" ? facing : FACING[facing] ?? 0, a = deg * Math.PI / 180, c = Math.round(Math.cos(a) * 1e6) / 1e6, s = Math.round(Math.sin(a) * 1e6) / 1e6, X0 = rx, Z0 = -rz, swap = Math.abs(s) > .5;
  return {
    block(x, y, z, w, h, d, colour, glow = false) { v.block(X0 + x * c + z * s, y + base, Z0 - x * s + z * c, swap ? d : w, h, swap ? w : d, colour, glow); return this; },
    at(x, z) { return { x: X0 + x * c + z * s, z: Z0 - x * s + z * c }; },
    mark(kind, x, y, z) { v.mark?.(kind, X0 + x * c + z * s, y + base, Z0 - x * s + z * c); return this; },
  };
}
// Writes in realm coordinates directly (x east, z north), for things laid out on the map.
export const realm = (v) => ({ block(x, y, z, w, h, d, colour, glow = false) { v.block(x, y, -z, w, h, d, colour, glow); return this; }, mark(kind, x, y, z) { v.mark?.(kind, x, y, -z); return this; } });

// ---- Small things -----------------------------------------------------------
export function lantern(f, x, y, z, size = 1, lit = true) {
  const k = size;
  f.block(x, y, z, .34 * k, .07 * k, .34 * k, C.iron);
  f.block(x, y + .07 * k, z, .26 * k, .32 * k, .26 * k, lit ? C.glow : 0x4a3f3a, lit);
  for (const dx of [-.14, .14]) for (const dz of [-.14, .14]) f.block(x + dx * k, y + .05 * k, z + dz * k, .04 * k, .36 * k, .04 * k, C.iron);
  f.block(x, y + .4 * k, z, .38 * k, .07 * k, .38 * k, C.iron); f.block(x, y + .47 * k, z, .22 * k, .08 * k, .22 * k, C.iron); f.block(x, y + .55 * k, z, .06 * k, .1 * k, .06 * k, C.gold);
}
// A glass globe on an iron collar, lit.
function globe(f, x, y, z, k = 1) {
  f.block(x, y, z, .2 * k, .08 * k, .2 * k, C.iron);
  f.block(x, y + .08 * k, z, .2 * k, .42 * k, .2 * k, C.glowSoft, true); f.block(x, y + .14 * k, z, .3 * k, .3 * k, .3 * k, C.glow, true); f.block(x, y + .2 * k, z, .34 * k, .18 * k, .34 * k, C.glow, true);
  for (const [dx, dz] of [[.17, 0], [-.17, 0], [0, .17], [0, -.17]]) f.block(x + dx * k, y + .08 * k, z + dz * k, (dx ? .03 : .05) * k, .42 * k, (dz ? .03 : .05) * k, C.iron);
  f.block(x, y + .5 * k, z, .34 * k, .06 * k, .34 * k, C.iron); f.block(x, y + .56 * k, z, .14 * k, .1 * k, .14 * k, C.iron); f.block(x, y + .66 * k, z, .05 * k, .12 * k, .05 * k, C.gold);
}
// The village's lamp post: a stone foot, a fluted iron post with gilt rings and one or two globes on scrolled arms.
export function lampPost(f, x, z, h = 3.2, r = seeded(1), heads = 2) {
  f.block(x, 0, z, .64, .2, .64, C.stone[1]); f.block(x, .2, z, .46, .46, .46, C.iron); f.block(x, .66, z, .34, .1, .34, C.iron);
  f.block(x, .76, z, .15, h - .76, .15, C.iron); for (const y of [1.1, h * .62]) f.block(x, y, z, .24, .08, .24, C.gold);
  if (heads === 1) { f.block(x, h, z, .22, .1, .22, C.iron); globe(f, x, h + .1, z, 1.15); return; }
  f.block(x, h - .1, z, 1.36, .08, .08, C.iron);
  for (const s of [-1, 1]) { f.block(x + s * .36, h - .32, z, .08, .24, .08, C.iron); f.block(x + s * .52, h - .4, z, .3, .08, .08, C.iron); globe(f, x + s * .64, h - .02, z, 1); }
  f.block(x, h - .02, z, .16, .5, .16, C.iron); f.block(x, h + .48, z, .3, .08, .1, C.gold); f.block(x, h + .56, z, .06, .14, .06, C.gold);
}
export function flower(f, x, z, shade_, r, scale = 1) {
  const k = scale, tall = r() < .3;
  f.block(x, 0, z, .05 * k, (tall ? .5 : .3) * k, .05 * k, 0x3f7a35);
  if (tall) for (let i = 0; i < 3; i++) f.block(x, (.28 + i * .1) * k, z, (.14 - i * .025) * k, .1 * k, (.14 - i * .025) * k, i ? shade(shade_, 1 + i * .08) : shade_);
  else { f.block(x, .28 * k, z, .17 * k, .1 * k, .17 * k, shade_); f.block(x, .34 * k, z, .07 * k, .05 * k, .07 * k, 0xf6dc8a); }
}
export function bush(f, x, z, size, r, palette = C.green) {
  for (let i = 0; i < 6; i++) { const s = size * (.45 + r() * .4), y = s * .25; f.block(x + (r() - .5) * size * .8, y, z + (r() - .5) * size * .8, s, s * .8, s, vary(shade(pick(palette, r), .8 + y * .5), .06, r)); }
}
export function grassTuft(f, x, z, r) { for (let i = 0; i < 3; i++) f.block(x + (r() - .5) * .3, 0, z + (r() - .5) * .3, .06, .2 + r() * .25, .06, vary(pick(C.grass, r), .15, r)); }

// A clipped hedge: dark sides, a sunlit top, and leafy knobs so it isn't a plain box.
export function hedge(f, x, z, w, d, h = .7, r = seeded(5)) {
  f.block(x, 0, z, w, h - .12, d, vary(pick(C.hedge, r), .05, r));
  f.block(x, h - .14, z, w + .05, .16, d + .05, vary(pick(C.hedgeTop, r), .05, r));
  const n = Math.round((w + d) * 1.2);
  for (let i = 0; i < n; i++) f.block(x + (r() - .5) * (w - .25), h - .02, z + (r() - .5) * (d - .25), .2, .04, .2, vary(pick(C.hedgeTop, r), .08, r));
}
// A topiary ball (or cone) in a stone pot.
export function topiary(f, x, z, size = 1, r = seeded(7), cone = false) {
  const k = size;
  f.block(x, 0, z, .62 * k, .12 * k, .62 * k, C.stone[2]); f.block(x, .12 * k, z, .5 * k, .42 * k, .5 * k, C.stone[1]); f.block(x, .54 * k, z, .62 * k, .1 * k, .62 * k, C.stone[3]);
  f.block(x, .64 * k, z, .1 * k, .3 * k, .1 * k, C.timber);
  if (cone) { for (let i = 0; i < 6; i++) { const w = (.9 - i * .14) * k; f.block(x, (.8 + i * .24) * k, z, w, .26 * k, w, vary(shade(pick(C.hedge, r), .9 + i * .06), .05, r)); } return; }
  for (const [w, y] of [[.6, .8], [.9, .95], [1, 1.15], [.9, 1.38], [.56, 1.58]]) f.block(x, y * k, z, w * k, .24 * k, w * k, vary(shade(pick(C.hedge, r), .85 + y * .2), .05, r));
}
// A brick pier with mortar courses, a stone cap and a ball on top.
export function brickPier(f, x, z, h = 1.5, r = seeded(9), top = "ball") {
  const rows = Math.round((h - .3) / .17);
  f.block(x, 0, z, .78, .18, .78, C.stone[0]);
  for (let k = 0; k < rows; k++) { f.block(x, .18 + k * .17, z, .62, .15, .62, vary(pick(C.brick, r), .06, r)); f.block(x, .33 + k * .17, z, .6, .02, .6, C.mortar); }
  const y = .18 + rows * .17; f.block(x, y, z, .8, .1, .8, C.stone[3]); f.block(x, y + .1, z, .66, .08, .66, C.stone[1]);
  if (top === "ball") { f.block(x, y + .18, z, .2, .1, .2, C.stone[2]); f.block(x, y + .28, z, .3, .26, .3, C.stone[3]); f.block(x, y + .34, z, .36, .14, .36, C.stone[3]); }
  else if (top === "lamp") lantern(f, x, y + .18, z, 1);
}
// Black iron railings between two points (along x or z): bars with gilt spear tips, two rails and a band of rings.
export function railing(f, x0, z0, x1, z1, h = 1.05) {
  const along = Math.abs(x1 - x0) >= Math.abs(z1 - z0), len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / .17)), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  for (const y of [.12, h - .14]) f.block(cx, y, cz, along ? len : .05, .05, along ? .05 : len, C.iron);
  f.block(cx, h * .55, cz, along ? len : .04, .04, along ? .04 : len, C.iron);
  for (let i = 1; i < n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    f.block(x, 0, z, .04, h, .04, C.iron);
    if (i % 2) f.block(x, h, z, .07, .1, .07, C.gold); else f.block(x, h * .55 + .03, z, along ? .1 : .03, .1, along ? .03 : .1, C.iron);
  }
}
// A park bench: slatted seat and back on cast iron ends. Local front is +z.
export function parkBench(f, x, z, r = seeded(11)) {
  for (const s of [-1, 1]) {
    const ex = x + s * 1.02;
    f.block(ex, 0, z + .3, .1, .46, .1, C.iron); f.block(ex, 0, z - .28, .1, .46, .1, C.iron); f.block(ex, .44, z, .1, .06, .72, C.iron);
    f.block(ex, .46, z - .36, .1, .62, .08, C.iron); f.block(ex, .66, z + .22, .1, .06, .38, C.iron); f.block(ex, .6, z + .38, .1, .08, .08, C.iron);
  }
  for (const dz of [-.22, 0, .22]) f.block(x, .48, z + dz, 2.2, .07, .18, vary(C.woodLight, .07, r));
  for (const dy of [.66, .84, 1.0]) f.block(x, dy, z - .38, 2.2, .12, .05, vary(C.woodLight, .07, r));
}
// A planted bed with a low stone kerb, dark soil and close-set flowers.
export function flowerBed(f, x0, z0, x1, z1, r = seeded(13), palette = C.flowers, density = 5) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
  f.block(cx, 0, cz, w - .1, .14, d - .1, 0x4a3426);
  for (const [ax, az, bx, bz] of [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]]) {
    const along = Math.abs(bx - ax) > .01, len = along ? bx - ax : bz - az, n = Math.max(1, Math.round(len / .55));
    for (let i = 0; i < n; i++) { const t = (i + .5) / n; f.block(ax + (bx - ax) * t, 0, az + (bz - az) * t, along ? len / n - .03 : .22, .22, along ? .22 : len / n - .03, vary(pick(C.stone, r), .05, r)); }
  }
  const count = Math.round(w * d * density), group = palette.length > 2 ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const x = x0 + .25 + r() * (w - .5), z = z0 + .25 + r() * (d - .5), band = Math.floor(((x - x0) / w) * 3 + ((z - z0) / d) * 2) % palette.length;
    flower(f, x, z + 0, palette[(band + (r() < .25 ? group : 0)) % palette.length], r, .9 + r() * .4);
  }
}
// A raised round planter of stone, brimming with flowers, a topiary at its heart.
export function roundPlanter(f, x, z, R = 1, r = seeded(15), palette = C.flowers, heart = "topiary") {
  const n = Math.max(10, Math.round(R * 14));
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; f.block(x + Math.cos(a) * R, 0, z + Math.sin(a) * R, .44, .5, .44, vary(pick(C.stone, r), .05, r)); f.block(x + Math.cos(a) * R, .5, z + Math.sin(a) * R, .5, .08, .5, C.stone[3]); }
  f.block(x, 0, z, R * 1.6, .46, R * 1.6, 0x4a3426);
  for (let i = 0; i < R * R * 14; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (R - .3); flower({ block: (bx, by, bz, w, h, dd, c, g) => f.block(bx, by + .46, bz, w, h, dd, c, g) }, x + Math.cos(a) * d, z + Math.sin(a) * d, pick(palette, r), r, 1.05); }
  if (heart === "topiary") topiary({ block: (bx, by, bz, w, h, dd, c, g) => f.block(bx, by + .46, bz, w, h, dd, c, g) }, x, z, R * .7, r);
}

// ---- Trees ------------------------------------------------------------------
// A broadleaf with a full, lumpy crown: overlapping blobs of leaf cells, shaded
// darker underneath and brighter on top and on the sunny (west) side.
export function canopyTree(f, x, z, size = 1, r = seeded(17), palette = C.green, opts = {}) {
  const k = size, h = (opts.trunk ?? 2.2) * k, cell = (opts.cell ?? .44) * k, R = 1.45 * k;
  f.block(x, 0, z, .62 * k, .22 * k, .62 * k, 0x4a3426);
  f.block(x, 0, z, .44 * k, h * .55, .44 * k, vary(0x5a4030, .06, r)); f.block(x, h * .5, z, .36 * k, h * .6, .36 * k, vary(0x5a4030, .06, r));
  for (const [dx, dz] of [[.32, 0], [-.3, .08], [0, .32]]) f.block(x + dx * k, 0, z + dz * k, .18 * k, .3 * k, .18 * k, 0x4f3828);
  for (const [dx, dz, by] of [[1, .3, .78], [-.9, -.4, .86], [.2, -1, .92]]) f.block(x + dx * k * .45, h * by, z + dz * k * .45, Math.abs(dx) > .5 ? .9 * k : .16 * k, .16 * k, Math.abs(dx) > .5 ? .16 * k : .9 * k, 0x5a4030);
  const blobs = [[0, h + R * .55, 0, R]], nb = 3 + ((r() * 3) | 0);
  for (let i = 0; i < nb; i++) { const a = i / nb * Math.PI * 2 + r(), d = R * (.55 + r() * .3); blobs.push([Math.cos(a) * d, h + R * (.2 + r() * .55), Math.sin(a) * d, R * (.6 + r() * .25)]); }
  const top = h + R * 1.6, bottom = h - R * .2, seen = new Set(), base = pick(palette, r), second = pick(palette, r);
  for (const [bx, by, bz, br] of blobs) {
    const n = Math.ceil(br / cell);
    for (let ix = -n; ix <= n; ix++) for (let iy = -n; iy <= n; iy++) for (let iz = -n; iz <= n; iz++) {
      const px = Math.round((bx + ix * cell) / cell), py = Math.round((by + iy * cell * .9) / (cell * .9)), pz = Math.round((bz + iz * cell) / cell), key = (px + 500) * 1e6 + (py + 500) * 1e3 + pz + 500;
      if (seen.has(key)) continue;
      const cx = px * cell, cy = py * cell * .9, cz = pz * cell, q = ((cx - bx) ** 2 + (cy - by) ** 2 * 1.15 + (cz - bz) ** 2) / (br * br);
      if (q > 1 + (r() - .5) * .3 || q < .42) continue; seen.add(key);
      const up = (cy - bottom) / (top - bottom), sun = (-cx / (R * 2)) * .14 - (cz / (R * 2)) * .06;
      const c = shade(r() < .22 ? second : base, .66 + up * .5 + sun + (r() - .5) * .1);
      f.block(x + cx, cy, z + cz, cell * 1.02, cell * .92, cell * 1.02, c);
    }
  }
  if (opts.litter === true) for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = .9 + r() * 1.8 * k; f.block(x + Math.cos(a) * d, .01, z + Math.sin(a) * d, .22, .03, .22, pick(palette, r)); }
}
// The old autumn tree used across the realm: a crown in reds, oranges and gold.
export function autumnTree(f, x, z, size = 1, r = seeded(7), palette = C.leaves) { canopyTree(f, x, z, size, r, palette); }
export function pine(f, x, z, size = 1, r = seeded(9)) {
  const k = size; f.block(x, 0, z, .32 * k, 1.2 * k, .32 * k, 0x4a3426);
  for (let i = 0; i < 7; i++) { const w = (2.5 - i * .33) * k, y = (.8 + i * .62) * k, c = shade(pick(C.pine, r), .8 + i * .06); f.block(x, y, z, w, .5 * k, w * .62, c); f.block(x, y, z, w * .62, .5 * k, w, c); f.block(x, y + .22 * k, z, w * .78, .3 * k, w * .78, shade(c, 1.12)); }
  f.block(x, 5.1 * k, z, .26 * k, .45 * k, .26 * k, C.pine[1]);
}
// The Copse's moonroot tree: a twisting trunk and a crown in plum, violet and teal.
export function twistedTree(f, x, z, size = 1, r = seeded(11)) {
  let px = x, pz = z, y = 0; const k = size;
  for (let i = 0; i < 6; i++) { const nx = px + (r() - .5) * .45 * k, nz = pz + (r() - .5) * .45 * k; f.block(nx, y, nz, .42 * k, .6 * k, .42 * k, vary(0x4e3a44, .08, r)); px = nx; pz = nz; y += .52 * k; }
  canopyTree({ block: (bx, by, bz, w, hh, d, c, g) => f.block(bx, by, bz, w, hh, d, c, g) }, px, pz, k * .85, r, r() < .6 ? C.violet : [0x2f7a72, 0x3a8e84, 0x276660, 0x4aa396], { trunk: y / (k * .85) - .6, litter: false, cell: .5 });
}
export function deadTree(f, x, z, size = 1, r = seeded(13)) {
  const k = size; f.block(x, 0, z, .34 * k, 3 * k, .34 * k, 0x4a4450);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + r(), y = (1.2 + r() * 1.6) * k, l = (.6 + r() * .6) * k; f.block(x + Math.cos(a) * l / 2, y, z + Math.sin(a) * l / 2, Math.abs(Math.cos(a)) > .7 ? l : .12 * k, .12 * k, Math.abs(Math.cos(a)) > .7 ? .12 * k : l, 0x4a4450); }
}
export function glowShroom(f, x, z, r, colour = 0x7fe8d0) {
  const s = .8 + r() * .7; f.block(x, 0, z, .09 * s, .26 * s, .09 * s, 0xe8e0d0); f.block(x, .26 * s, z, .3 * s, .1 * s, .3 * s, colour, true); f.block(x, .36 * s, z, .16 * s, .06 * s, .16 * s, colour, true);
}

// ---- Walls, fences and the gate ---------------------------------------------
export function stoneWall(f, x0, z0, x1, z1, h = 1.1, r = seeded(17)) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / .7)), along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    for (let k = 0; k < 3; k++) { const o = (k % 2) * .18; f.block(x + (along ? o : 0), k * h / 3, z + (along ? 0 : o), along ? .7 : .52, h / 3 - .02, along ? .52 : .7, vary(pick(C.stone, r), .07, r)); }
    f.block(x, h, z, along ? .74 : .62, .1, along ? .62 : .74, C.stone[3]);
    if (r() < .3) f.block(x + (r() - .5) * .5, h + .1, z + (r() - .5) * .3, .3, .12, .3, vary(C.hedgeTop[0], .1, r));
  }
}
export function picketFence(f, x0, z0, x1, z1, r = seeded(19)) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / .3));
  for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; f.block(x, 0, z, .1, .8, .1, vary(0xf0e8dc, .03, r)); f.block(x, .8, z, .06, .06, .06, 0xf0e8dc); }
  for (const y of [.25, .6]) { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, along = Math.abs(x1 - x0) > Math.abs(z1 - z0); f.block(cx, y, cz, along ? len : .05, .07, along ? .05 : len, 0xe2d8c8); }
}
// A gate pillar of dressed stone with a stone moth on top, a plum banner and a lantern.
export function mothPillar(f, x, z, r = seeded(21)) {
  f.block(x, 0, z, 1.4, .3, 1.4, C.stone[2]);
  for (let k = 0; k < 6; k++) f.block(x, .3 + k * .48, z, 1.12, .46, 1.12, vary(pick(C.stone, r), .04, r));
  f.block(x, 3.18, z, 1.36, .18, 1.36, C.stone[3]); f.block(x, 3.36, z, 1.1, .12, 1.1, C.stone[1]);
  f.block(x, 3.48, z, .3, .7, .3, C.brass);
  for (const s of [-1, 1]) { f.block(x + s * .42, 3.9, z, .62, .6, .1, C.brass); f.block(x + s * .64, 3.62, z, .34, .34, .08, shade(C.brass, .9)); f.block(x + s * .44, 4.02, z + .06, .16, .16, .02, C.glow, true); }
  f.block(x - .07, 4.18, z, .04, .3, .04, C.brass); f.block(x + .07, 4.18, z, .04, .3, .04, C.brass);
  f.block(x, 1.1, z + .58, .86, 1.9, .05, C.plum); f.block(x, 1.05, z + .6, .86, .12, .05, C.gold); f.block(x, 1.7, z + .62, .34, .34, .03, C.gold);
  lantern(f, x, 2.45, z + .7, .9);
}

// The carriage: a black lacquered coach with gold trim and lamps, drawn by a pale ghost horse.
export function carriage(f, x, z, r = seeded(23)) {
  const body = 0x2a2030, trim = C.gold;
  for (const s of [-1, 1]) for (const t of [-1, 1]) { f.block(x + s * 1.18, .05, z + t * 1.05, .14, 1.1, 1.1, 0x6a4a34); f.block(x + s * 1.18, .5, z + t * 1.05, .18, .2, .2, trim); for (let i = 0; i < 4; i++) f.block(x + s * 1.18, .55, z + t * 1.05, .1, .04, .9, 0x4a3426); }
  f.block(x, .75, z, 2.0, .3, 3.1, body); f.block(x, 1.05, z, 2.1, 1.5, 2.7, body); f.block(x, 2.55, z, 2.3, .16, 3.0, 0x1e1724); f.block(x, 2.71, z, 1.8, .2, 2.5, body);
  for (const s of [-1, 1]) { f.block(x + s * 1.06, 1.35, z, .04, .9, 1.4, C.window, true); f.block(x + s * 1.07, 1.35, z, .04, .9, .08, trim); f.block(x + s * 1.07, 1.78, z, .04, .06, 1.5, trim); f.block(x + s * 1.07, 1.04, z, .04, .06, 2.6, trim); }
  for (const s of [-1, 1]) lantern(f, x + s * 1.2, 2.0, z + 1.45, .8);
  f.block(x, 1.5, z + 1.95, 1.2, .14, 1, body); f.block(x, 1.64, z + 2.05, 1, .5, .55, 0x5a2a48);
  for (const s of [-.45, .45]) f.block(x + s, .95, z + 3, .08, .08, 2.4, 0x4a3530);
  const hz = z + 4.4, horse = 0xd8e8ff, mane = 0x9fd0ff;
  f.block(x, 1.15, hz, .9, .85, 2.1, horse); f.block(x, 1.3, hz - .9, .8, .7, .5, shade(horse, .95));
  for (let i = 0; i < 4; i++) f.block(x, 1.8 + i * .22, hz + .8 + i * .16, .5, .32, .5, horse);
  f.block(x, 2.55, hz + 1.55, .46, .4, .9, horse); f.block(x, 2.42, hz + 1.95, .4, .3, .4, shade(horse, .92));
  for (const s of [-1, 1]) { f.block(x + s * .16, 2.98, hz + 1.3, .1, .2, .1, horse); f.block(x + s * .24, 2.72, hz + 1.7, .03, .08, .08, 0x7fe0ff, true); }
  for (let i = 0; i < 5; i++) f.block(x, 2.1 + i * .2, hz + .62 + i * .17, .14, .28, .2, mane, true);
  for (let i = 0; i < 4; i++) f.block(x, 1.6 - i * .22, hz - 1.15 - i * .12, .16, .3, .16, mane, true);
  for (const s of [-1, 1]) for (const t of [-1, 1]) { f.block(x + s * .3, 0, hz + t * .72, .2, 1.2, .2, horse); f.block(x + s * .3, 0, hz + t * .72, .24, .14, .26, 0x9fb6d8); }
  f.block(x, 1.5, hz + .2, 1, .12, .5, 0x5a2a48); f.block(x, 1.62, hz + .2, .2, .2, .2, trim);
}

// ---- The square's fixtures ---------------------------------------------------
// The Moth Fountain: a ring basin, a pedestal and an upper bowl, a brass moth on
// top and falling water in glowing beads. Its two pools are glossy discs added by the world (fountainWater).
export function fountain(f, x, z, R = 2.4, r = seeded(29)) {
  const k = R / 2.4, n = Math.max(14, Math.round(30 * k)), q = (dx, y, dz, w, h, d, c, g) => f.block(x + dx * k, y * k, z + dz * k, w * k, h * k, d * k, c, g);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; q(Math.cos(a) * 2.4, 0, Math.sin(a) * 2.4, .66, .5, .66, vary(pick(C.stone, r), .04, r)); q(Math.cos(a) * 2.4, .5, Math.sin(a) * 2.4, .74, .1, .74, C.stone[3]); }
  f.block(x, 0, z, R * 1.5, .3 * k, R * 1.5, 0x3d5a66);
  q(0, 0, 0, 1.1, .5, 1.1, C.stone[2]); q(0, .5, 0, .8, .7, .8, C.stone[1]); q(0, 1.2, 0, .56, .3, .56, C.stone[3]);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; q(Math.cos(a) * .95, 1.42, Math.sin(a) * .95, .4, .22, .4, C.stone[3]); q(Math.cos(a) * .7, 1.32, Math.sin(a) * .7, .4, .14, .4, C.stone[1]); }
  q(0, 1.5, 0, .36, .6, .36, C.stone[1]); q(0, 2.1, 0, .5, .1, .5, C.stone[3]);
  q(0, 2.2, 0, .18, .62, .18, C.brass); q(0, 2.82, 0, .14, .14, .14, shade(C.brass, 1.1));
  for (const s of [-1, 1]) { q(s * .38, 2.52, 0, .56, .5, .06, C.brass); q(s * .62, 2.7, 0, .2, .28, .05, shade(C.brass, 1.08)); q(s * .3, 2.26, 0, .36, .34, .05, shade(C.brass, .88)); q(s * .42, 2.72, .04, .14, .14, .02, C.glowSoft, true); }
}
export function well(f, x, z, r = seeded(31)) {
  const n = 18, R = 1.15;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; for (let k = 0; k < 2; k++) f.block(x + Math.cos(a) * R, k * .38, z + Math.sin(a) * R, .5, .38, .5, vary(pick(C.stone, r), .06, r)); f.block(x + Math.cos(a) * R, .76, z + Math.sin(a) * R, .56, .08, .56, C.stone[3]); }
  f.block(x, 0, z, 1.7, .5, 1.7, 0x2a3640);
  for (const s of [-1, 1]) { f.block(x + s * 1.1, .4, z, .2, 2.1, .2, C.timber); f.block(x + s * 1.1, .4, z, .3, .3, .3, C.timber); }
  for (let i = 0; i < 7; i++) { const t = i / 6, y = 2.45 + Math.sin(t * Math.PI) * .55; f.block(x - 1.4 + t * 2.8, y, z, .44, .14, 2.1, vary(pick(C.terracotta, r), .05, r)); }
  f.block(x, 3.02, z, .16, .14, 2.2, C.beam); f.block(x, 2.15, z, 2.2, .1, .1, C.timber); f.block(x + 1.25, 2.15, z, .08, .3, .08, C.iron); f.block(x + 1.25, 2.0, z + .2, .08, .08, .3, C.iron);
  f.block(x, 1.45, z, .32, .36, .32, C.wood); f.block(x, 1.81, z, .04, .34, .04, 0x9a8a7a); f.block(x, 1.45, z, .36, .04, .36, C.iron);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + .3; flower(f, x + Math.cos(a) * 1.65, z + Math.sin(a) * 1.65, pick(C.flowers, r), r, 1); }
  lantern(f, x - 1.1, 2.5, z + .2, .7);
}
export function noticeboard(f, x, z, r = seeded(33)) {
  for (const s of [-1, 1]) { f.block(x + s * .95, 0, z, .18, 2.5, .18, C.timber); f.block(x + s * .95, 0, z, .3, .2, .3, C.stone[2]); }
  f.block(x, .95, z, 2.1, 1.35, .12, C.wood); f.block(x, .95, z + .02, 2.2, .1, .14, C.beam); f.block(x, 2.25, z + .02, 2.2, .1, .14, C.beam);
  for (let i = 0; i < 5; i++) f.block(x - 1.2 + i * .6, 2.45, z, .62, .14, .8, vary(pick(C.slatePlum, r), .05, r)); f.block(x, 2.6, z, 2.6, .12, .3, C.slatePlum[0]);
  for (const [dx, dy, w, h, c] of [[-.6, 1.5, .5, .5, C.cream], [.02, 1.62, .46, .52, 0xe6d6f2], [.6, 1.3, .44, .54, C.cream], [-.18, 1.08, .56, .34, 0xf2d79a], [.55, 1.92, .3, .22, 0xf6c0c8]]) { f.block(x + dx, dy, z + .08, w, h, .03, c); f.block(x + dx, dy + h - .08, z + .1, .06, .06, .03, 0xd23a3a); }
  lantern(f, x + 1.1, 2.0, z + .28, .7);
}
// Rowan's stall, local front +z: a heap of boards until it's mended, then a market stall with a striped awning.
export function stall(f, x, z, open, r = seeded(35)) {
  if (!open) {
    for (const sx of [-1.55, 1.55]) for (const sz of [-1.2, 1.2]) f.block(x + sx, 0, z + sz, .16, 2.2, .16, C.timber);
    f.block(x, 0, z + 1.05, 3.1, .95, .5, C.wood); f.block(x, .95, z + 1.05, 3.3, .1, .62, C.woodLight);
    for (let i = 0; i < 6; i++) f.block(x - 1.4 + i * .56, 1.05, z + .1, .56, 1.1 - (i % 2) * .08, 2.6, i % 2 ? 0x7a3550 : 0x8a3f5e);
    for (const sz of [-.6, .6]) f.block(x, 1.4, z + sz, 3.2, .04, .04, 0xc9b88a);
    for (const [dx, dy, dz] of [[-1, 0, -1.7], [-.3, 0, -1.7], [-.65, .5, -1.7]]) { f.block(x + dx, dy, z + dz, .62, .5, .62, C.wood); f.block(x + dx, dy + .5, z + dz, .64, .04, .64, C.woodLight); }
    f.block(x + 1.4, 0, z + 1.7, .1, 1.1, .7, C.timber); f.block(x + 1.4, .4, z + 1.7, .12, .7, .6, 0x2a2a2e); f.block(x + 1.4, .7, z + 1.7, .13, .05, .4, C.cream);
    return;
  }
  for (const sx of [-1.55, 1.55]) for (const sz of [-1.2, 1.2]) f.block(x + sx, 0, z + sz, .16, 2.7 + (sz < 0 ? .4 : 0), .16, C.timber);
  f.block(x, 0, z + 1.05, 3.1, .95, .5, C.wood); f.block(x, .95, z + 1.05, 3.3, .1, .62, C.woodLight); for (let i = 0; i < 6; i++) f.block(x - 1.3 + i * .52, .1, z + 1.31, .04, .8, .02, C.beam);
  for (const [dx, c] of [[-1.1, 0xe2702a], [-.38, 0xd23a2a], [.38, 0x8ab04a], [1.1, 0xf0c050]]) { f.block(x + dx, 1.05, z + 1.05, .62, .22, .5, C.wood); for (let i = 0; i < 6; i++) f.block(x + dx - .18 + (i % 3) * .18, 1.27 + (i >> 1 & 1) * .06, z + .9 + (i % 2) * .26, .16, .16, .16, vary(c, .1, r)); }
  f.block(x, 0, z - .9, 3.1, 1.6, .4, C.wood); for (let k = 0; k < 3; k++) for (let i = 0; i < 7; i++) f.block(x - 1.3 + i * .43, .2 + k * .5, z - .66, .3, .3, .2, vary(pick([0xe2702a, 0xf0c050, 0x7d4fa3, 0xd6407a, 0x8ab04a], r), .08, r));
  for (let i = 0; i < 8; i++) { const sx = x - 1.65 + i * .47 + .235, c = i % 2 ? 0xf3e6c8 : C.plum; for (let k = 0; k < 4; k++) f.block(sx, 3.02 - k * .16, z - 1.0 + k * .78, .47, .1, .84, c); f.block(sx, 2.44, z + 1.62, .47, .26, .05, c); f.block(sx, 2.36, z + 1.62, .2, .08, .05, c); }
  for (let i = 0; i < 9; i++) f.block(x - 1.6 + i * .4, 2.12 - Math.sin(i / 8 * Math.PI) * .2, z + 1.7, .2, .2, .03, [C.gold, 0xd6407a, 0x6a8ef0][i % 3]);
  f.block(x, 3.18, z - 1.2, 1.8, .44, .1, C.beam); f.block(x, 3.24, z - 1.14, 1.5, .3, .04, C.gold);
  lantern(f, x + 1.55, 2.0, z + 1.45, .75); lantern(f, x - 1.55, 2.0, z + 1.45, .75);
}
// The bench by the well (local front +z): broken boards until it's mended, then a park bench.
export function bench(f, x, z, mended, r = seeded(37)) {
  if (!mended) {
    for (const s of [-1, 1]) { f.block(x + s * 1.02, 0, z + .3, .1, .46, .1, C.iron); f.block(x + s * 1.02, 0, z - .28, .1, .46, .1, C.iron); f.block(x + s * 1.02, .44, z, .1, .06, .72, C.iron); f.block(x + s * 1.02, .46, z - .36, .1, .62, .08, C.iron); }
    f.block(x - .55, .48, z - .22, 1.1, .07, .18, 0x7a6a5a); f.block(x + .55, .44, z - .22, 1.05, .07, .18, 0x6a5a4a); f.block(x, .48, z, 2.2, .07, .18, 0x7a6a5a); f.block(x, .48, z + .22, 2.2, .07, .18, 0x6e5e4e);
    f.block(x, .84, z - .38, 2.2, .12, .05, 0x6e5e4e); f.block(x + .3, .02, z - .7, 1.6, .08, .12, 0x6a5a4a); return;
  }
  parkBench(f, x, z, r);
}

// ---- Homes ---------------------------------------------------------------------
// A cottage: a stone footing, plaster walls between dark beams, mullioned windows
// lit warm with shutters and window boxes, a steep tiled roof with bargeboards and
// a brick chimney. Its local origin is the front wall's middle; it runs back to
// z = -d. ridge "x" turns its eaves to the front (with a dormer), "z" its gable.
export function cottage(f, opts = {}) {
  const { w = 8, d = 7, h = 3.2, roof = C.slate, r = seeded(41), chimney = 1, door = 0, doorColour = C.plum, dormer = true, sign = null, ridge = "x", rose = true, shabby = false } = opts;
  // A shabby home is whole but run down: dark boarded windows, faded walls, a patched roof and ivy.
  const lit = shabby ? false : opts.lit ?? true, boxes = shabby ? false : opts.boxes ?? true, plaster = shabby ? shade(opts.plaster ?? C.plaster, .78) : opts.plaster ?? C.plaster, shutter = shabby ? 0x4a4048 : opts.shutter ?? 0x4f6a8a;
  const hw = w / 2, top = .44 + h, win = lit ? C.window : 0x3a3346;
  // Footing: dressed stones round the base.
  for (const [x0, z0, x1, z1] of [[-hw - .2, .2, hw + .2, .2], [-hw - .2, -d - .2, hw + .2, -d - .2], [-hw - .2, .2, -hw - .2, -d - .2], [hw + .2, .2, hw + .2, -d - .2]]) {
    const along = Math.abs(x1 - x0) > .1, len = Math.abs(along ? x1 - x0 : z1 - z0), n = Math.max(2, Math.round(len / .62));
    for (let i = 0; i < n; i++) { const t = (i + .5) / n; f.block(x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t, along ? len / n - .04 : .42, .44, along ? .42 : len / n - .04, vary(pick(C.stone, r), .06, r)); }
  }
  f.block(0, 0, -d / 2, w, .44, d, C.stone[2]);
  // Walls in vertical panels, each a touch different, so the plaster isn't one flat sheet.
  const panels = Math.max(2, Math.round(w / 1.1)), pw = w / panels;
  for (let i = 0; i < panels; i++) f.block(-hw + pw * (i + .5), .44, -d / 2, pw, h, d, vary(plaster, .025, r));
  // Openings, so beams stand clear of the door and windows.
  const front = [-hw * .6, hw * .6].filter((x) => Math.abs(x - door) >= 1), back = [-hw * .5, hw * .5];
  const clear = (x, list, half) => list.every((o) => Math.abs(x - o) > half);
  for (const t of [-1, -.25, .25, 1]) {
    const x = t * hw, corner = Math.abs(t) === 1;
    if (corner || (clear(x, front, 1.0) && Math.abs(x - door) > .78)) f.block(x, .44, .03, .2, h, .1, C.beam);
    if (corner || clear(x, back, .95)) f.block(x, .44, -d - .03, .2, h, .1, C.beam);
  }
  for (const z of [0, -d * .22, -d * .78, -d]) { f.block(-hw - .03, .44, z, .1, h, .2, C.beam); f.block(hw + .03, .44, z, .1, h, .2, C.beam); }
  for (const sx of [-1, 1]) for (const zz of [0, -d]) for (let y = .44, k = 0; y < .44 + h - .2; y += .42, k++) f.block(sx * (hw - (k % 2 ? .18 : .26)), y, zz + (zz ? -.02 : .02), k % 2 ? .4 : .56, .4, .26, vary(pick(C.stone, r), .05, r));
  for (const sx of [-1, 1]) { f.block(sx * (hw + .05), .44 + h * .52, -d / 2, .08, .14, d, C.beam); for (const zz of [-d * .5]) f.block(sx * (hw + .05), .44, zz, .08, h, .18, C.beam); }
  for (const y of [.44, top - .16]) { f.block(0, y, .04, w + .12, .18, .1, C.beam); f.block(0, y, -d - .04, w + .12, .18, .1, C.beam); f.block(-hw - .04, y, -d / 2, .1, .18, d + .12, C.beam); f.block(hw + .04, y, -d / 2, .1, .18, d + .12, C.beam); }
  // Windows: a frame, four lit panes, a sill, shutters and (in front) a box of flowers.
  const window = (x, y, z, face = 1, wide = 1.05, tall = 1.2, withBox = false) => {
    const zz = z + face * .07;
    f.block(x, y, zz, wide + .16, tall + .16, .06, C.cream); f.block(x, y + .08, zz + face * .02, wide, tall, .05, win, lit);
    f.block(x, y + .08, zz + face * .05, .06, tall, .04, C.cream); f.block(x, y + .08 + tall / 2, zz + face * .05, wide, .06, .04, C.cream);
    f.block(x, y - .08, zz + face * .1, wide + .3, .1, .2, C.stone[3]);
    for (const s of [-1, 1]) f.block(x + s * (wide / 2 + .28), y, zz, .32, tall + .1, .05, shutter);
    if (withBox && boxes) { f.block(x, y - .36, zz + face * .22, wide + .1, .28, .3, C.wood); for (let i = 0; i < 6; i++) f.block(x - wide / 2 + .1 + i * (wide - .2) / 5, y - .1, zz + face * (.2 + (i % 2) * .08), .16, .2, .16, pick(C.flowers, r)); for (let i = 0; i < 3; i++) f.block(x - .3 + i * .3, y - .26, zz + face * .4, .12, .26, .06, C.hedge[0]); }
  };
  const wy = .44 + h * .3;
  for (const x of front) window(x, wy, 0, 1, 1.05, 1.2, true);
  if (shabby) for (const x of front) for (let i = 0; i < 5; i++) { f.block(x - .45 + i * .22, wy + .15 + i * .2, .16, .3, .12, .04, vary(C.woodLight, .12, r)); f.block(x + .45 - i * .22, wy + .15 + i * .2, .17, .3, .12, .04, vary(C.wood, .12, r)); }
  for (const x of back) window(x, wy, -d, -1, 1, 1.1);
  for (const side of [-1, 1]) for (const zz of [-d * .27, -d * .73]) {
    f.block(side * (hw + .07), wy, zz, .06, 1.2, 1.05, C.cream); f.block(side * (hw + .1), wy + .08, zz, .05, 1.05, .9, win, lit); f.block(side * (hw + .12), wy + .08, zz, .04, 1.05, .06, C.cream); f.block(side * (hw + .12), wy + .6, zz, .04, .06, .9, C.cream);
    f.block(side * (hw + .18), wy - .1, zz, .2, .1, 1.2, C.stone[3]); for (const k of [-1, 1]) f.block(side * (hw + .09), wy, zz + k * .68, .05, 1.15, .3, shutter);
    if (shabby) for (let i = 0; i < 4; i++) f.block(side * (hw + .15), wy + .15 + i * .26, zz - .3 + i * .2, .04, .12, .34, vary(C.woodLight, .1, r));
    else if (boxes) { f.block(side * (hw + .26), wy - .34, zz, .3, .26, 1.1, C.wood); for (let i = 0; i < 5; i++) f.block(side * (hw + .3), wy - .1, zz - .4 + i * .2, .16, .2, .16, pick(C.flowers, r)); }
  }
  // The door: planks in a stone surround, a fanlight, a step, a knocker and a lamp beside it.
  f.block(door, .44, .06, 1.24, 2.15, .1, C.stone[3]); f.block(door, .44, .1, 1.04, 1.95, .08, doorColour);
  for (let i = 0; i < 3; i++) f.block(door - .34 + i * .34, .5, .15, .04, 1.8, .03, shade(doorColour, .8));
  f.block(door + .32, 1.3, .17, .08, .08, .05, C.gold); f.block(door, 2.02, .16, .62, .2, .03, win, lit); f.block(door, 2.62, .14, 1.4, .1, .24, C.stone[3]);
  f.block(door, 0, .6, 1.7, .22, .7, C.stone[1]); f.block(door, 0, 1.0, 1.3, .1, .3, C.stone[0]);
  lantern(f, door + .95, 1.95, .26, .75, !shabby);
  // A little tiled porch on two brackets over the door.
  for (const sx of [-1, 1]) { f.block(door + sx * .78, 2.3, .4, .1, .1, .7, C.beam); f.block(door + sx * .78, 2.05, .2, .1, .3, .1, C.beam); }
  for (let i = 0; i < 4; i++) f.block(door, 2.62 + i * .14, .5 - i * .2, 2, .12, .5, vary(pick(roof, r), .05, r));
  for (let i = 0; i < 6; i++) f.block(hw + .6, i < 3 ? 0 : .32, -d * .5 - .9 + (i % 3) * .62, .5, .3, .58, vary(0x6a4a34, .1, r)); for (let i = 0; i < 6; i++) f.block(hw + .45, .05 + (i % 3) * .3, -d * .5 + .5 + (i / 3 | 0) * .45, .36, .28, .36, vary(0x8a6040, .1, r));
  f.block(-hw - .45, 0, -1, .55, .75, .55, 0x6a4a34); for (const y of [.15, .55]) f.block(-hw - .45, y, -1, .6, .06, .6, C.iron);
  if (shabby) {
    for (const y of [.8, 1.6]) f.block(door, y, .24, 1.3, .16, .05, vary(C.woodLight, .1, r));
    for (const sx of [-1, 1]) for (let i = 0; i < 10; i++) { const y = .5 + i * (h - .3) / 10, spread = Math.sin(i / 9 * Math.PI) * .3; f.block(sx * (hw - .1 - spread / 2), y, .12, .3 + spread, (h - .3) / 10 + .02, .08, vary(C.hedge[i % 2], .1, r)); }
    for (const sx of [-1, 1]) bush(f, sx * (hw - .4), .9, .8, r, C.hedge);
  }
  if (sign) { const sx = door + (door > 0 ? -1.6 : 1.6); f.block(sx, 2.6, .5, .08, .08, .9, C.iron); f.block(sx, 1.95, .9, .1, .64, .84, sign); f.block(sx, 2.07, .9, .12, .4, .6, C.gold); }
  const steps = 12, eave = .55;
  // A course of tiles: the long side split into tiles with hairline gaps, each its own shade.
  const tileRow = (cx, y, cz, wx, hh, dz, alongX) => {
    const len = alongX ? wx : dz, n = Math.max(1, Math.round(len / .5)), seg = len / n;
    for (let i = 0; i < n; i++) { const t = -len / 2 + seg * (i + .5), c = vary(pick(roof, r), .08, r); if (alongX) f.block(cx + t, y, cz, seg - .05, hh, dz, c); else f.block(cx, y, cz + t, wx, hh, seg - .05, c); }
  };
  for (const x of front) { for (let i = 0; i < 3; i++) f.block(x, wy + 1.38 + i * .08, .28 - i * .08, 1.5 - i * .3, .08, .4, vary(pick(roof, r), .06, r)); for (const sx of [-1, 1]) f.block(x + sx * .66, wy + 1.24, .3, .08, .16, .3, C.beam); }
  if (ridge === "z") {
    // Gable to the front: tile courses step in along x.
    const rise = w * .5;
    for (let i = 0; i < steps; i++) {
      const t = i / steps, y = top + t * rise, x0 = (1 - t) * (hw + eave), x1 = (1 - (i + 1) / steps) * (hw + eave);
      for (const side of [-1, 1]) { const c = vary(pick(roof, r), .05, r); f.block(side * (x0 + x1) / 2, y - .02, -d / 2, x0 - x1 + .06, rise / steps, d + eave * 2, shade(c, .55)); tileRow(side * (x0 + x1) / 2, y + .02, -d / 2, x0 - x1 + .1, rise / steps + .03, d + eave * 2, false); }
      for (const zz of [eave + .04, -d - eave - .04]) for (const side of [-1, 1]) f.block(side * (x0 - .04), y, zz, .16, rise / steps + .06, .08, C.cream);
    }
    f.block(0, top + rise, -d / 2, .4, .22, d + eave * 2 + .1, shade(roof[0], .8));
    for (const zz of [eave + .08, -d - eave - .08]) { f.block(0, top + rise + .1, zz, .14, .6, .14, C.beam); f.block(0, top + rise + .7, zz, .22, .14, .22, C.gold); for (let i = 1; i < steps; i += 2) { const t = i / steps; for (const side of [-1, 1]) f.block(side * (1 - t) * (hw + eave), top + t * rise - .22, zz, .08, .22, .06, C.cream); } }
    for (const zz of [0, -d]) { const o = zz > -1 ? 1 : -1; for (let i = 0; i < steps; i++) { const t = i / steps, half = (1 - t) * hw; if (half < .1) break; f.block(0, top + t * rise, zz, half * 2, rise / steps + .02, .1, plaster); } f.block(0, top + .2 + rise * .3, zz + o * .06, .74, .74, .05, C.cream); f.block(0, top + .26 + rise * .3, zz + o * .09, .56, .6, .04, win, lit); f.block(0, top + .55 + rise * .3, zz + o * .11, .56, .05, .03, C.cream); }
    if (chimney) chimneyStack(f, hw * .5, top + rise * .35, -d * .65, r);
  } else {
    // Eaves to the front: tile courses step back along z, gables on the sides, a dormer in front.
    const rise = d * .55, hd = d / 2;
    for (let i = 0; i < steps; i++) {
      const t = i / steps, y = top + t * rise, z0 = (1 - t) * (hd + eave), z1 = (1 - (i + 1) / steps) * (hd + eave);
      for (const side of [-1, 1]) { const c = vary(pick(roof, r), .05, r); f.block(0, y - .02, -hd + side * (z0 + z1) / 2, w + eave * 2, rise / steps, z0 - z1 + .06, shade(c, .55)); tileRow(0, y + .02, -hd + side * (z0 + z1) / 2, w + eave * 2, rise / steps + .03, z0 - z1 + .1, true); }
      for (const xx of [hw + eave + .04, -hw - eave - .04]) for (const side of [-1, 1]) f.block(xx, y, -hd + side * (z0 - .04), .08, rise / steps + .06, .16, C.cream);
    }
    f.block(0, top + rise, -hd, w + eave * 2 + .1, .22, .4, shade(roof[0], .8));
    for (const xx of [-hw, hw]) { const o = xx > 0 ? 1 : -1; for (let i = 0; i < steps; i++) { const t = i / steps, half = (1 - t) * hd; if (half < .1) break; f.block(xx, top + t * rise, -hd, .1, rise / steps + .02, half * 2, plaster); } f.block(xx + o * .06, top + .15 + rise * .25, -hd, .05, .7, .7, C.cream); f.block(xx + o * .09, top + .21 + rise * .25, -hd, .04, .56, .52, win, lit); }
    if (dormer) {
      const dx = door > 0 ? -hw * .45 : hw * .45, base = top + .05, dz = -.9;
      f.block(dx, base, dz, 1.5, 1.25, 1.4, plaster); f.block(dx, base + .2, dz + .71, .84, .78, .05, win, lit); f.block(dx, base + .2, dz + .74, .06, .78, .04, C.cream); f.block(dx, base + .58, dz + .74, .84, .06, .04, C.cream); f.block(dx, base + .12, dz + .76, 1.04, .08, .14, C.cream);
      for (let i = 0; i < 5; i++) for (const side of [-1, 1]) f.block(dx + side * (.84 - i * .17), base + 1.22 + i * .15, dz - .05, .34, .15, 1.6, vary(pick(roof, r), .05, r));
      f.block(dx, base + 1.97, dz - .05, .2, .12, 1.65, shade(roof[0], .8));
    }
    if (chimney) chimneyStack(f, -hw * .55 * (door > 0 ? -1 : 1), top + rise * .45, -hd - .6, r);
  }

  if (rose) for (let i = 0; i < 9; i++) { f.block(-hw - .1 + (i % 2) * .12, .5 + i * (h - .4) / 9, .14, .26, .3, .1, vary(C.hedge[1], .1, r)); if (i % 2) f.block(-hw - .05, .6 + i * (h - .4) / 9, .2, .1, .1, .06, 0xe85a8a); }
}
function chimneyStack(f, x, y, z, r) {
  for (let k = 0; k < 8; k++) { f.block(x, y + k * .3, z, .8, .28, .8, vary(pick(C.brick, r), .06, r)); f.block(x, y + k * .3 + .28, z, .78, .02, .78, C.mortar); }
  f.block(x, y + 2.4, z, .96, .14, .96, C.stone[3]); for (const s of [-1, 1]) f.block(x + s * .18, y + 2.54, z, .22, .3, .22, 0xa0583a);
  f.mark?.("smoke", x, y + 2.84, z);
}
// A narrow three-storey townhouse with a shopfront, for the backdrop beyond the Green.
export function townhouse(f, opts = {}) {
  const { w = 6, d = 6, storeys = 3, h = 2.4, plaster = C.plasterWarm, roof = C.slatePlum, awning = [C.plum, C.cream], r = seeded(45), shop = true, lit = true } = opts;
  const hw = w / 2, top = .4 + storeys * h, win = lit ? C.window : 0x3a3346;
  f.block(0, 0, -d / 2, w + .2, .4, d + .2, C.stone[2]);
  for (let s = 0; s < storeys; s++) f.block(0, .4 + s * h, -d / 2, w, h, d, vary(s ? plaster : C.stone[0], .02, r));
  for (let s = 1; s <= storeys; s++) f.block(0, .4 + s * h - .12, -d / 2, w + .2, .14, d + .2, C.stone[3]);
  for (const x of [-hw, hw]) f.block(x, .4, .02, .3, storeys * h, .14, C.stone[3]);
  if (shop) {
    f.block(0, .5, .06, w - .8, 1.9, .06, win, lit); for (let i = 0; i < 5; i++) f.block(-hw + .4 + i * (w - .8) / 4, .5, .1, .08, 1.9, .05, C.iron);
    for (let i = 0; i < 8; i++) for (let k = 0; k < 3; k++) f.block(-hw + .35 + i * (w - .7) / 7, 2.5 - k * .12, .4 + k * .36, (w - .7) / 7, .1, .38, i % 2 ? awning[1] : awning[0]);
    f.block(0, 2.55, .06, w - .4, .4, .08, C.beam); f.block(0, 2.6, .1, w * .55, .3, .04, C.gold);
  }
  for (let s = shop ? 1 : 0; s < storeys; s++) for (let i = 0; i < 3; i++) {
    const x = -hw + w * (i + .5) / 3, y = .4 + s * h + .45;
    f.block(x, y - .08, .05, 1, 1.45, .06, C.cream); f.block(x, y, .08, .8, 1.3, .05, win, lit); f.block(x, y + .6, .11, .8, .05, .03, C.cream); f.block(x, y, .11, .05, 1.3, .03, C.cream);
    f.block(x, y - .2, .2, 1.1, .1, .3, C.iron); if (s === 1) for (let k = 0; k < 4; k++) f.block(x - .4 + k * .27, y - .1, .3, .14, .16, .14, pick(C.flowers, r));
  }
  for (let s = 0; s < storeys; s++) for (const side of [-1, 1]) for (let i = 0; i < 2; i++) {
    const z = -d * (i + .5) / 2, y = .4 + s * h + .45, x = side * (hw + .05);
    f.block(x, y - .08, z, .06, 1.45, 1, C.cream); f.block(x + side * .03, y, z, .05, 1.3, .8, s === 0 && !shop ? win : win, lit); f.block(x + side * .06, y, z, .03, 1.3, .05, C.cream); f.block(x + side * .06, y + .6, z, .03, .05, .8, C.cream);
    f.block(x + side * .12, y - .16, z, .2, .1, 1.1, C.stone[3]); for (const k of [-1, 1]) f.block(x + side * .03, y - .04, z + k * .62, .05, 1.38, .28, 0x4f5a7a);
  }
  for (let s = 0; s < storeys; s++) for (let i = 0; i < 3; i++) { const x = -hw + w * (i + .5) / 3, y = .4 + s * h + .45; f.block(x, y - .08, -d - .05, 1, 1.45, .06, C.cream); f.block(x, y, -d - .08, .8, 1.3, .05, win, lit); }
  for (let i = 0; i < 6; i++) { const t = i / 6; f.block(0, top + i * .32, -d / 2, w + .5 - t * 3, .32, d + .5 - t * 3, vary(pick(roof, r), .04, r)); }
  for (const x of [-hw * .5, hw * .5]) { f.block(x, top + .2, .08, .9, 1.2, .5, plaster); f.block(x, top + .35, .34, .55, .7, .04, win, lit); f.block(x, top + 1.4, .08, 1.1, .16, .7, pick(roof, r)); }
  f.block(hw * .7, top + 1.6, -d * .6, .7, 1.2, .7, pick(C.brick, r)); f.block(hw * .7, top + 2.8, -d * .6, .84, .12, .84, C.stone[3]);
}
// Rowan's workshop cottage: built, or a half-raised frame under a tarp with timber piled ready.
export function workshop(f, built, r = seeded(43)) {
  cottage(f, { w: 8, d: 7, h: 3.2, roof: C.terracotta, plaster: C.plasterWarm, r, chimney: 1, doorColour: 0x4a6a3a, shutter: 0x4a6a3a, sign: 0x5a3a2a, shabby: !built });
  if (built) {
    f.block(4.9, 0, -2.2, 1.8, 1.0, 3.6, C.wood); for (let i = 0; i < 9; i++) f.block(4.9 + ((i % 3) - 1) * .5, 1 + (i / 3 | 0) * .32, -2.2, .34, .34, 3.2, vary(0x8a6040, .1, r)); for (const z of [-.6, -3.8]) f.block(5.8, 0, z, .14, 2.3, .14, C.timber); f.block(5.3, 2.3, -2.2, 1.4, .1, 3.8, pick(C.terracotta, r));
    f.block(-2.6, 0, 1.7, 2.2, 1.0, .9, C.wood); f.block(-2.6, 1.0, 1.7, 2.3, .1, 1, C.woodLight); f.block(-3.1, 1.1, 1.7, .5, .3, .3, 0x9a9aa2); f.block(-2.2, 1.1, 1.6, .7, .08, .2, 0xc9c9cf);
    return;
  }
  // Not yet his own: the lean-to fallen in, timber stacked ready under a tarp, a sawhorse and a sign asking for help.
  for (let i = 0; i < 8; i++) f.block(5, .05 + (i >> 1) * .14, -1.4 - (i % 2) * .34, 2.2, .12, .3, vary(C.woodLight, .08, r));
  f.block(4.8, 0, -4.4, 1.6, .9, 2.2, C.woodLight); for (let i = 0; i < 3; i++) f.block(4.8 + (i - 1) * .55, .9, -4.4, .56, .4 - i * .06, 2.4, 0x3f6aa8);
  for (const s2 of [-1, 1]) f.block(-2.6 + s2 * .6, 0, 2.2, .12, .8, .12, C.timber); f.block(-2.6, .8, 2.2, 1.6, .1, .36, C.wood); f.block(-2.6, .9, 2.2, 2.4, .1, .28, C.woodLight);
  f.block(1.8, 0, 1.6, .12, 1.4, .12, C.timber); f.block(1.8, 1.1, 1.66, .9, .6, .05, C.cream); f.block(1.8, 1.2, 1.7, .6, .1, .02, 0x8a3a2a);
}
export function conservatory(f, built, r = seeded(47)) {
  cottage(f, { w: 7, d: 7, h: 3.3, roof: C.slatePlum, plaster: C.plasterLilac, r, chimney: 1, door: -1.4, doorColour: 0x3d4a7a, shutter: 0x6a4a8a, sign: 0x3d4a7a, shabby: !built });
  // The glasshouse: a stone base, iron ribs, glass walls and a dome; lit gold when restored, dark, cracked and ivied before.
  const cx = 6.2, cz = -3.5, R = 3;
  f.block(cx, 0, cz, 6.8, .44, 6.8, C.stone[1]);
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
    f.block(x, .44, z, .12, 3, .12, C.iron);
    if (built || i % 4) f.block(cx + Math.cos(a + .16) * R, .5, cz + Math.sin(a + .16) * R, .5, 2.9, .5, built ? (i % 2 ? 0xffe2a8 : 0xf6d8a0) : (i % 3 ? 0x3a3a52 : 0x2c2c40), built);
  }
  for (let k = 0; k < 7; k++) { const rr = R * Math.cos(k / 7 * Math.PI / 2), y = 3.44 + Math.sin(k / 7 * Math.PI / 2) * 2.3; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; if (built || (i + k) % 5) f.block(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr, .5, .3, .5, built ? (k % 2 ? 0xfff0c8 : 0xffe2a8) : (k % 2 ? 0x3a3a52 : 0x30304a), built); if (i % 2 === 0) f.block(cx + Math.cos(a) * rr * 1.03, y, cz + Math.sin(a) * rr * 1.03, .1, .32, .1, C.iron); } }
  f.block(cx, 5.8, cz, .3, .6, .3, C.gold); for (const s of [-1, 1]) f.block(cx + s * .36, 6.2, cz, .52, .38, .08, C.brass);
  if (built) { for (let i = 0; i < 8; i++) bush(f, cx - 3.6 + (i % 4) * 2.4, cz + (i < 4 ? 3.7 : -3.7), .8, r, C.green); for (let i = 0; i < 5; i++) f.block(cx - 1.5 + i * .7, .44, cz + 1, .5, 1.6 + (i % 2) * .5, .3, pick([0x7a3d4a, 0x3d4a6a, 0x5a4a2a, 0x6a4a7a], r)); }
  else { for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, y = .5 + r() * 4.5, rr = R * Math.cos(Math.max(0, y - 3.44) / 2.3 * Math.PI / 2) + .15; f.block(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr, .3, .3, .3, vary(C.hedge[r() < .5 ? 0 : 1], .14, r)); } for (let i = 0; i < 12; i++) bush(f, cx - 3.4 + r() * 6.8, cz - 3.6 + r() * 7.2, .8, r, C.hedge); for (let i = 0; i < 14; i++) f.block(cx + (r() - .5) * 5, .45, cz + 3 + r() * 1.2, .2, .04, .16, 0x5a5a7a); }
}

// ---- Gathering spots: full, then spent until they grow back --------------------
export function node(f, material, ready, r = seeded(51)) {
  if (material === "logs") {
    if (!ready) { f.block(0, 0, 0, .7, .35, .7, 0x6a4a34); f.block(0, .35, 0, .6, .04, .6, 0xd8b88a); for (let i = 0; i < 4; i++) f.block((r() - .5) * .9, 0, (r() - .5) * .9, .12, .05, .2, 0xd8b88a); return; }
    for (const [dx, dy, dz] of [[-.2, 0, 0], [.25, 0, .05], [0, .32, .02]]) { f.block(dx, dy, dz, .32, .32, 1.5, vary(0x7a5236, .08, r)); f.block(dx, dy, dz + .76, .26, .26, .02, 0xd8b88a); }
    f.block(.5, 0, -.5, .6, .12, .12, 0x5a3d2a); f.block(.55, .05, -.45, .06, .25, .06, 0x6a9a4a);
  } else if (material === "stone") {
    if (!ready) { for (let i = 0; i < 5; i++) f.block((r() - .5) * .8, 0, (r() - .5) * .8, .15, .1, .15, pick(C.stone, r)); return; }
    f.block(0, 0, 0, 1, .6, .9, vary(C.stoneDark[0], .05, r)); f.block(.2, .5, -.1, .6, .45, .5, C.stoneDark[1]); f.block(-.35, 0, .35, .45, .35, .4, C.stone[1]);
    f.block(.1, .95, 0, .2, .08, .2, 0xa9d4ff, true);
  } else if (material === "fibre") {
    if (!ready) { for (let i = 0; i < 6; i++) f.block((r() - .5) * .7, 0, (r() - .5) * .7, .05, .1, .05, 0x9a8a4a); return; }
    for (let i = 0; i < 14; i++) f.block((r() - .5) * .8, 0, (r() - .5) * .8, .06, .8 + r() * .6, .06, vary(0xd2be6a, .1, r));
    f.block(0, .5, 0, .5, .08, .5, 0x8a5a3a);
  } else if (material === "herbs") {
    if (!ready) { for (let i = 0; i < 3; i++) f.block((r() - .5) * .5, 0, (r() - .5) * .5, .1, .12, .1, 0x5a8a45); return; }
    for (let i = 0; i < 9; i++) { const x = (r() - .5) * .7, z = (r() - .5) * .7; f.block(x, 0, z, .14, .3 + r() * .2, .14, vary(0x6aa84f, .1, r)); }
    for (let i = 0; i < 5; i++) f.block((r() - .5) * .6, .45, (r() - .5) * .6, .1, .1, .1, pick([0xb77ad8, 0xf6e6a0, 0xf28fb5], r));
  }
}

// A page of Elowen's letter, lying where the wind left it (the view flutters it).
export function letterPage() {
  const v = new Voxels(), f = frame(v, 0, 0);
  f.block(0, .05, 0, .5, .02, .66, C.cream); for (let i = 0; i < 5; i++) f.block(-.02, .07, -.22 + i * .11, .36 - (i % 2) * .1, .01, .03, 0x5a3d6a);
  f.block(.18, .1, .25, .14, .05, .08, C.moth); f.block(.18, .13, .25, .05, .05, .14, 0x8a6a4a);
  f.block(0, .09, 0, .1, .01, .1, 0xfff0c0, true);
  return v.build({ shadows: false });
}

// ---- Mothlight's own decor pieces (each its own group, as they move) -----------
export function buildVillageDecor(id) {
  const v = new Voxels(), f = frame(v, 0, 0), r = seeded(id.length * 97 + 13);
  if (id === "moth-lamp") { f.block(0, 0, 0, .5, .25, .5, C.iron); f.block(0, .25, 0, .16, 2.3, .16, C.iron); f.block(0, 2.5, 0, .3, .6, .3, C.glow, true); for (const s of [-1, 1]) { f.block(s * .35, 2.55, 0, .45, .5, .06, 0xe8d6ff, true); f.block(s * .55, 2.4, 0, .25, .25, .05, 0xd8c6ff, true); } f.block(0, 3.1, 0, .12, .2, .12, C.gold); }
  else if (id === "lantern-post") { lampPost(f, 0, 0, 2.6, r, 1); }
  else if (id === "toadstool-lamp") { f.block(0, 0, 0, .26, .6, .26, 0xe8dcc8); f.block(0, .6, 0, .8, .22, .8, 0xc0394a); f.block(0, .82, 0, .5, .14, .5, 0xc0394a); for (const [x, z] of [[-.2, .2], [.25, -.1], [0, -.28]]) f.block(x, .84, z, .1, .06, .1, 0xfff2d8); f.block(0, .45, 0, .32, .12, .32, C.glow, true); }
  else if (id === "moth-lantern-string") { for (const s of [-1, 1]) f.block(s * 1.6, 0, 0, .14, 2.5, .14, C.timber); f.block(0, 2.3, 0, 3.2, .04, .04, 0x2b2630); for (let i = 0; i < 6; i++) { const x = -1.25 + i * .5, y = 2.1 - Math.sin(i / 5 * Math.PI) * .25; f.block(x, y, 0, .26, .26, .26, i % 2 ? 0xffc06a : 0xe8b0ff, true); f.block(x, y + .1, 0, .4, .12, .05, C.moth); } }
  else if (id === "signpost") { f.block(0, 0, 0, .16, 2.3, .16, C.timber); for (const [y, dir, len] of [[1.9, 1, 1], [1.55, -1, .9], [1.2, 1, .8]]) { f.block(dir * len / 2, y, 0, len, .22, .08, C.woodLight); f.block(dir * (len + .05), y, 0, .14, .14, .08, C.woodLight); } lantern(f, 0, 2.3, 0, .6); }
  else if (id === "market-crates") { for (const [x, y, z] of [[-.4, 0, 0], [.4, 0, 0], [0, .5, 0]]) { f.block(x, y, z, .7, .5, .9, C.wood); f.block(x, y + .5, z, .62, .08, .82, pick([0xd8763a, 0xb83a2a, 0x8a9a4a, 0xe8c25a], r)); } f.block(.4, 1, .1, .25, .25, .25, 0xe08a3c); }
  else if (id === "reading-stand") { f.block(0, 0, 0, .5, .1, .4, C.timber); f.block(0, .1, 0, .12, 1, .12, C.timber); f.block(0, 1.05, 0, .7, .08, .5, C.wood); f.block(0, 1.13, 0, .62, .05, .42, C.cream); f.block(0, 1.14, 0, .04, .06, .42, 0x8a6a4a); for (let i = 0; i < 4; i++) f.block(.4, i * .12, .1, .3, .12, .42, pick([0x7a3d4a, 0x3d4a6a, 0x5a4a2a, 0x6a4a7a], r)); }
  else if (id === "book-cart") { f.block(0, .35, 0, 1.3, .1, .8, C.timber); for (const s of [-1, 1]) { f.block(s * .55, 0, .3, .1, .4, .4, 0x2b2630); } f.block(-.6, .35, -.35, .06, .7, .06, C.timber); for (let i = 0; i < 8; i++) f.block(-.5 + i * .14, .45, 0, .12, .45 + (i % 3) * .08, .55, pick([0x7a3d4a, 0x3d4a6a, 0x5a4a2a, 0x6a4a7a, 0x8a5a3a], r)); }
  else if (id === "stool") { for (const [x, z] of [[-.2, -.2], [.22, -.15], [0, .24]]) f.block(x, 0, z, .08, .62, .08, C.timber); f.block(0, .62, 0, .62, .1, .62, C.woodLight); }
  else if (id === "timber-gate") { for (const s of [-1, 1]) { f.block(s * 1.1, 0, 0, .22, 1.6, .22, C.timber); f.block(s * 1.1, 1.6, 0, .3, .1, .3, C.timber); } for (let i = 0; i < 6; i++) f.block(-.75 + i * .3, .1, 0, .14, 1.1 + Math.sin(i / 5 * Math.PI) * .2, .08, C.woodLight); for (const y of [.35, .9]) f.block(0, y, .02, 1.9, .1, .06, C.wood); }
  else if (id === "flower-barrow") { f.block(0, .35, 0, 1.2, .4, .8, C.wood); f.block(.75, .15, 0, .3, .3, .1, 0x3a2a25); for (const s of [-1, 1]) f.block(-.75, .35, s * .3, .7, .06, .06, C.timber); for (let i = 0; i < 12; i++) f.block((r() - .5) * 1, .78, (r() - .5) * .6, .16, .16, .16, pick(C.flowers, r)); }
  else if (id === "sundial") { f.block(0, 0, 0, .9, .3, .9, C.stone[1]); f.block(0, .3, 0, .4, .5, .4, C.stone[0]); f.block(0, .8, 0, .8, .1, .8, C.stone[3]); f.block(0, .9, 0, .06, .25, .5, C.gold); f.block(0, .9, -.2, .3, .02, .02, 0xd8c6ff, true); }
  else if (id === "bunting-posts") { for (const s of [-1, 1]) f.block(s * 1.6, 0, 0, .14, 2.5, .14, C.timber); for (let i = 0; i < 9; i++) { const x = -1.4 + i * .35, y = 2.25 - Math.sin(i / 8 * Math.PI) * .3; f.block(x, y - .2, 0, .22, .25, .03, i % 2 ? 0xe08a3c : C.plum); } }
  else if (id === "workbench") { for (const [x, z] of [[-.85, -.35], [.85, -.35], [-.85, .35], [.85, .35]]) f.block(x, 0, z, .14, .95, .14, C.timber); f.block(0, .95, 0, 2, .14, 1, C.woodLight); f.block(.7, 1.09, .3, .3, .2, .3, 0x6a6a72); f.block(-.5, 1.09, 0, .5, .12, .2, 0x9a9aa2); f.block(-.1, 1.09, -.25, .2, .2, .2, 0xd8b06a); }
  else if (id === "wheelbarrow") { f.block(0, .35, 0, 1.1, .4, .75, 0x4a7a4a); f.block(.65, .15, 0, .3, .3, .1, 0x3a2a25); for (const s of [-1, 1]) f.block(-.7, .35, s * .28, .7, .06, .06, C.timber); for (const [x, z] of [[-.2, -.15], [.2, .15], [0, -.05]]) f.block(x, .75, z, .38, .32, .38, 0xe0782c); }
  else if (id === "moth-statue") { f.block(0, 0, 0, 1.1, .5, 1.1, C.stone[0]); f.block(0, .5, 0, .7, .7, .7, C.stone[1]); f.block(0, 1.2, 0, .25, .7, .25, C.stone[3]); for (const s of [-1, 1]) { f.block(s * .4, 1.3, 0, .6, .7, .12, C.stone[3]); f.block(s * .45, 1.05, 0, .4, .4, .1, C.stone[1]); } f.block(-.08, 1.95, .1, .05, .25, .05, C.stone[3]); f.block(.08, 1.95, .1, .05, .25, .05, C.stone[3]); }
  else if (id === "scarecrow-statue") { f.block(0, 0, 0, .14, 2, .14, C.timber); f.block(0, 1.5, 0, 1.4, .12, .12, C.timber); f.block(0, .9, 0, .6, .8, .35, 0x6a5a3a); f.block(0, 1.75, 0, .45, .45, .4, 0xc9a86a); f.block(0, 2.2, 0, .8, .08, .8, 0x5a4232); f.block(0, 2.28, 0, .4, .3, .4, 0x5a4232); for (const s of [-1, 1]) f.block(s * .1, 1.9, .21, .06, .06, .02, 0x2a1d1b); f.block(0, 1.78, .21, .2, .03, .02, 0x2a1d1b); f.block(.75, 1.4, 0, .2, .35, .12, 0xd8b06a); }
  else if (id === "pumpkin-arch") { for (let i = 0; i < 11; i++) { const a = i / 10 * Math.PI, x = Math.cos(a) * 1.25, y = Math.sin(a) * 2.3; f.block(x, y, 0, .55, .5, .55, i % 2 ? 0xe0782c : 0xc95f24); if (i % 3 === 0) f.block(x, y + .1, .28, .2, .12, .04, C.glow, true); } for (const s of [-1, 1]) f.block(s * 1.25, 0, 0, .6, .5, .6, 0xd8682a); }
  else if (id === "moon-gate") { for (let i = 0; i < 18; i++) { const a = i / 17 * Math.PI, x = Math.cos(a) * 1.1, y = 1.4 + Math.sin(a) * 1.5; f.block(x, y, 0, .38, .38, .4, C.stone[3]); } for (const s of [-1, 1]) f.block(s * 1.1, 0, 0, .4, 1.5, .4, C.stone[3]); f.block(0, 3, .2, .5, .5, .05, 0xe8e0ff, true); }
  else if (id === "garden-bench") { parkBench(f, 0, 0, r); }
  else if (id === "round-planter") { roundPlanter(f, 0, 0, .8, r); }
  return v.build();
}

// ---- Pumpkins and the Halloween dressing ------------------------------------------
const PUMPKIN = { orange: [0xe8771f, 0xf08a2a, 0xd9661a], white: [0xece4d4, 0xf4ecdc, 0xddd3c2], green: [0x5f7a3a, 0x6f8a44, 0x4f6a30], gold: [0xd9962a, 0xe6a83a, 0xc9861f] };
// A ribbed pumpkin: a core and two crossed lobes, a dimple and a stem.
export function pumpkin(f, x, z, size = .6, r = seeded(61), kind = "orange", y = 0) {
  const k = size, cols = PUMPKIN[kind] ?? PUMPKIN.orange, c = pick(cols, r);
  f.block(x, y, z, .9 * k, .72 * k, .9 * k, c);
  f.block(x, y + .07 * k, z, 1.04 * k, .58 * k, .7 * k, shade(c, .93)); f.block(x, y + .07 * k, z, .7 * k, .58 * k, 1.04 * k, shade(c, .93));
  f.block(x, y + .72 * k, z, .46 * k, .05 * k, .46 * k, shade(c, .82)); f.block(x, y + .74 * k, z, .1 * k, .2 * k, .1 * k, 0x5a4a2a);
  if (r() < .5) f.block(x + .08 * k, y + .88 * k, z, .16 * k, .05 * k, .05 * k, 0x5a7a3a);
}
// A jack-o'-lantern, its face carved on its front (local +z) and lit from inside.
export function jackOLantern(f, x, z, size = .7, r = seeded(63), face = 0, y = 0) {
  pumpkin(f, x, z, size, r, "orange", y);
  const k = size, zz = z + .53 * k, g = 0xffa83a, G = (dx, dy, w, h) => f.block(x + dx * k, y + dy * k, zz, w * k, h * k, .03, g, true);
  if (face % 3 === 0) { for (const s of [-1, 1]) { G(s * .2, .42, .16, .1); G(s * .2, .5, .08, .07); } G(0, .34, .07, .07); G(0, .18, .44, .08); for (const s of [-1, 1]) G(s * .26, .23, .08, .08); }
  else if (face % 3 === 1) { for (const s of [-1, 1]) G(s * .19, .42, .14, .14); G(0, .17, .34, .1); G(-.1, .14, .08, .05); G(.12, .14, .08, .05); }
  else { for (const s of [-1, 1]) { G(s * .2, .44, .18, .07); G(s * .17, .38, .1, .07); } G(0, .2, .46, .06); G(-.13, .25, .07, .06); G(.13, .25, .07, .06); G(0, .14, .07, .06); }
}
// A bale of hay with twine, straw poking out.
export function hayBale(f, x, z, r = seeded(65), along = true, y = 0) {
  const w = along ? 1.1 : .6, d = along ? .6 : 1.1;
  f.block(x, y, z, w, .55, d, vary(0xd8b25a, .05, r)); f.block(x, y + .52, z, w - .06, .06, d - .06, vary(0xe6c66e, .05, r));
  for (const t of [-.25, .25]) f.block(x + (along ? t * w : 0), y, z + (along ? 0 : t * d), along ? .04 : d + .02, .57, along ? d + .02 : .04, 0x8a6a3a);
  for (let i = 0; i < 5; i++) f.block(x + (r() - .5) * w, y + .45 + r() * .14, z + (r() - .5) * d, .05, .14, .05, 0xf0d488);
}
// A sheaf of dried corn stalks tied round the middle.
export function cornSheaf(f, x, z, h = 1.8, r = seeded(67)) {
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, d = .12 + r() * .1, lean = .1; f.block(x + Math.cos(a) * d, 0, z + Math.sin(a) * d, .07, h * (.8 + r() * .3), .07, vary(0xc9a868, .08, r)); f.block(x + Math.cos(a) * (d + lean * 2), h * (.55 + r() * .3), z + Math.sin(a) * (d + lean * 2), .05, .4, .05, vary(0xb89858, .08, r)); }
  f.block(x, h * .4, z, .42, .1, .42, 0x8a5a2a); f.block(x, h * .72, z, .5, .06, .5, 0xd9b870);
}
// A scarecrow on its post: a plaid shirt, straw cuffs, a jack-o'-lantern head and a pointed hat.
export function scarecrow(f, x, z, r = seeded(69), face = 1) {
  f.block(x, 0, z, .14, 2.3, .14, C.timber); f.block(x, 1.55, z, 1.6, .12, .12, C.timber);
  f.block(x, 1.0, z, .62, .7, .34, 0x8a3a2a); for (let i = 0; i < 3; i++) f.block(x, 1.05 + i * .22, z + .18, .64, .04, .02, 0x3a2a4a); f.block(x, 1.0, z + .18, .04, .7, .02, 0x3a2a4a);
  for (const s of [-1, 1]) { f.block(x + s * .55, 1.42, z, .5, .3, .3, 0x8a3a2a); f.block(x + s * .86, 1.36, z, .14, .3, .14, 0xe6c66e); }
  f.block(x, .78, z, .5, .24, .3, 0x4a3a6a); for (const s of [-1, 1]) f.block(x + s * .14, .5, z, .12, .3, .12, 0xe6c66e);
  jackOLantern(f, x, z, .62, r, face, 1.7);
  f.block(x, 2.26, z, .9, .06, .9, 0x2a2238); for (let i = 0; i < 5; i++) f.block(x + i * .03, 2.32 + i * .14, z, .5 - i * .09, .14, .5 - i * .09, 0x2a2238); f.block(x, 2.3, z, .54, .08, .54, 0x7d4fa3);
}
// A string of lights between two points (with a sag), in pumpkin orange, violet and warm white.
export function festoon(f, ax, ay, az, bx, by, bz, n = 12, sag = .5, colours = [0xff9a30, 0xffb84a, 0xd86a2a], cables = null) {
  const at = (t) => [ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * Math.PI) * sag, az + (bz - az) * t];
  // The wire itself is a smooth cable built by the world (cables); without a list, a fine dotted line stands in.
  if (cables) cables.push({ ax, ay, az, bx, by, bz, sag });
  else { const len = Math.hypot(bx - ax, by - ay, bz - az), steps = Math.max(n * 2, Math.round(len / .1)); for (let i = 0; i < steps; i++) { const [x, y, z] = at((i + .5) / steps); f.block(x, y + .02, z, .03, .03, .03, 0x1e1a24); } }
  for (let i = 1; i < n; i++) { const [x, y, z] = at(i / n); f.block(x, y - .05, z, .02, .05, .02, 0x1e1a24); f.block(x, y - .14, z, .08, .1, .08, colours[i % colours.length], true); f.block(x, y - .06, z, .05, .03, .05, 0x2a2430); }
}
// The Velvet Bat's hall, inside. Front +z is the door, and the front wall is cut away to a low sill so the camera
// sees in, as the farm's rooms are. Oak boards and a red runner lead from the door to a long bar with a gothic
// mirror and shelves of bottles. Velvet booths stand along one wall, a hearth with wing chairs along the other,
// with a candle chandelier overhead and bats roosting in the rafters. Pointed windows, sconces, banners,
// portraits, an upright coffin and the crypt's trapdoor complete it. Its lights are marked "lamp" for the
// light pool. The floor is 14 by 12, from x -7 to 7 and z 0 back to -12.
export const VELVET_HALL = Object.freeze({ w: 14, d: 12, host: [0, -10.5], spawn: [0, -1.8],
  // Where a walker can't go (x0, z0, x1, z1): the bar, the hearth, the chairs, the booths, the coffin, the trapdoor.
  blocks: Object.freeze([[-4.85, -12, 4.85, -8.75], [-7, -7.7, -5.4, -4.3], [-4.9, -7.8, -3.5, -4.2], [5, -8.3, 7, -1.5], [-6.7, -2, -5.2, -.6], [4.5, -2, 6.2, -.4]]) });
export function velvetBatHall(f, r = seeded(173)) {
  const W = 14, D = 12, hw = W / 2, H = 6.4;
  const stone = [0x3a3444, 0x433c4e, 0x352f40, 0x4a4256], trim = [0x6a6276, 0x5e566a], oak = [0x3a2418, 0x45291b, 0x2f1d14, 0x50301f];
  const velvet = 0x7a1424, plush = 0x951c30, dark = 0x22140e, iron = 0x1a1418, glass = 0x3a3070;
  const candle = (x, y, z, lamp = false) => { f.block(x, y, z, .1, .26, .1, 0xf0e6d8); f.block(x, y + .26, z, .06, .1, .06, 0xffb347, true); if (lamp) f.mark?.("lamp", x, y + .5, z); };
  // Floor: oak boards in staggered rows; a red runner with gold edges from the door to the bar; the door's step.
  for (let k = 0, z = -D + .25; z < 0; z += .5, k++) for (let x = -hw - (k % 2); x < hw; x += 2) { const x0 = Math.max(-hw, x), x1 = Math.min(hw, x + 2); if (x1 - x0 > .05) f.block((x0 + x1) / 2, 0, z, x1 - x0 - .03, .12, .47, vary(pick(oak, r), .05, r)); }
  f.block(0, .12, -4.4, 1.7, .02, 8.6, velvet); for (const s of [-1, 1]) f.block(s * .82, .13, -4.4, .07, .02, 8.6, C.gold);
  f.block(0, 0, .35, 2.4, .1, .7, trim[0]);
  // Walls in courses of dark stone; the front only a sill with stone posts at the doorway.
  for (let y = 0, k = 0; y < H; y += .42, k++) {
    for (let x = -hw + (k % 2) * .45; x < hw - .05; x += .9) { const w = Math.min(.9, hw - x); f.block(x + w / 2, y, -D, w - .03, .4, .3, vary(pick(stone, r), .06, r)); }
    for (const sx of [-1, 1]) for (let z = -(k % 2) * .45; z > -D + .05; z -= .9) { const d = Math.min(.9, z + D); f.block(sx * hw, y, z - d / 2, .3, .4, d - .03, vary(pick(stone, r), .06, r)); }
  }
  for (const sx of [-1, 1]) { for (let x = 1.35; x < hw; x += .9) f.block(sx * Math.min(hw - .45, x + .45), 0, 0, .87, .8, .3, vary(pick(stone, r), .06, r)); f.block(sx * (1.35 + (hw - 1.35) / 2), .8, 0, hw - 1.35, .1, .4, trim[0]); for (let y = 0; y < 1.6; y += .4) f.block(sx * 1.4, y, 0, .5, .38, .4, vary(pick(trim, r), .05, r)); f.block(sx * 1.4, 1.6, 0, .6, .1, .5, trim[0]); lantern(f, sx * 1.4, 1.7, 0, .7); f.mark?.("lamp", sx * 1.4, 2.3, .2); }
  for (const z of [0, -D]) f.block(0, 0, z + (z ? .2 : -.2), W, .2, .1, trim[1]);
  // Pointed windows on the side walls: moonlit glass in lead, a stone frame and a sill.
  const win = (sx, z) => { const x = sx * (hw - .17); for (let i = 0; i < 12; i++) { const t = i / 12, half = t < .6 ? .55 : .55 * Math.cos((t - .6) / .4 * Math.PI / 2); if (half < .05) break; f.block(x, 2 + i * .2, z, .04, .2, half * 2, i % 3 === 2 ? iron : glass, i % 3 !== 2); f.block(x - sx * .03, 2 + i * .2, z - half - .07, .08, .2, .12, trim[0]); f.block(x - sx * .03, 2 + i * .2, z + half + .07, .08, .2, .12, trim[0]); } f.block(x - sx * .1, 1.88, z, .26, .12, 1.4, trim[1]); f.block(x - sx * .02, 2, z, .03, 1.7, .04, iron); };
  for (const [sx, z] of [[-1, -2.4], [-1, -9.6], [1, -3.2], [1, -6.8], [1, -10.2]]) win(sx, z);
  // Sconces between the windows: an iron bracket and a candle.
  for (const [sx, z] of [[-1, -1.2], [-1, -10.9], [1, -1.4], [1, -5], [1, -8.6]]) { const x = sx * (hw - .3); f.block(x, 2.7, z, .3, .06, .06, iron); f.block(x - sx * .1, 2.62, z, .16, .08, .16, iron); candle(x - sx * .1, 2.7, z, true); }
  // The bar: dark oak with velvet panels and a brass rail, a polished top, stools, glasses, a bell and two lamps.
  f.block(0, 0, -9.4, 9.2, 1.1, .9, dark); for (let i = 0; i < 8; i++) { f.block(-4 + i * 1.143, .22, -8.93, .86, .66, .03, velvet); f.block(-4 + i * 1.143, .88, -8.93, .9, .04, .04, C.gold); }
  f.block(0, 1.1, -9.4, 9.5, .1, 1.12, 0x1a0e08); f.block(0, 1.08, -8.83, 9.5, .06, .06, C.brass); f.block(0, .24, -8.68, 9, .06, .06, C.brass); for (let x = -4.4; x <= 4.4; x += 2.2) f.block(x, 0, -8.7, .06, .26, .06, C.brass);
  for (const x of [-3.6, -1.8, 0, 1.8, 3.6]) { f.block(x, 0, -8.1, .36, .05, .36, iron); f.block(x, 0, -8.1, .08, .78, .08, C.brass); f.block(x, .78, -8.1, .48, .14, .48, plush); f.block(x, .5, -8.1, .3, .04, .3, C.brass); }
  for (const x of [-2.6, -2.3, 1.2, 1.5, 3.9]) { f.block(x, 1.2, -9.3, .12, .2, .12, 0xd8dce8); f.block(x, 1.24, -9.3, .08, .1, .08, pick([0x7a1424, 0xa8203a, 0x3a1a4a], r)); }
  f.block(-.6, 1.2, -9.5, .2, .12, .2, C.gold); f.block(-.6, 1.32, -9.5, .04, .08, .04, C.gold);
  for (const x of [-3.4, 3.4]) { f.block(x, 1.2, -9.5, .26, .08, .26, C.brass); f.block(x, 1.28, -9.5, .16, .3, .16, 0xffc06a, true); f.block(x, 1.58, -9.5, .2, .06, .2, C.brass); f.mark?.("lamp", x, 2, -9.3); }
  // Behind it: shelves of bottles either side of a tall gothic mirror, a gilded bat above, banners and barrels.
  for (const sx of [-1, 1]) for (const y of [1.6, 2.45, 3.3]) { f.block(sx * 3.55, y, -11.6, 3.9, .08, .5, oak[2]); for (let x = 1.75; x < 5.4; x += .3) { if (r() < .18) continue; const h = .32 + r() * .22, c = pick([0x7a1424, 0x2a5a3a, 0x4a2a6a, 0xb07a2a, 0x1a3a5a, 0xa8203a], r), lit = r() < .3; f.block(sx * x, y + .08, -11.6 + (r() - .5) * .2, .14, h, .14, c, lit); f.block(sx * x, y + .08 + h, -11.6, .06, .1, .06, 0x2a1a14); } }
  for (let i = 0; i < 17; i++) { const t = i / 16, half = t < .7 ? 1.1 : 1.1 * Math.cos((t - .7) / .3 * Math.PI / 2); if (half < .05) break; f.block(0, 1.5 + i * .2, -11.8, half * 2, .2, .04, 0x8a90b8); f.block(-half - .1, 1.5 + i * .2, -11.75, .16, .2, .08, C.gold); f.block(half + .1, 1.5 + i * .2, -11.75, .16, .2, .08, C.gold); }
  f.block(0, 1.4, -11.7, 2.6, .14, .14, C.gold);
  { const y = 5.1, z = -11.78; f.block(0, y, z, .4, .5, .06, C.gold); for (const s of [-1, 1]) { f.block(s * .55, y + .15, z, .7, .3, .05, C.gold); f.block(s * .95, y + .05, z, .3, .2, .05, C.gold); f.block(s * .1, y + .5, z, .08, .14, .05, C.gold); } f.block(-.07, y + .32, z + .03, .05, .05, .02, 0xff3a2a, true); f.block(.07, y + .32, z + .03, .05, .05, .02, 0xff3a2a, true); }
  for (const sx of [-1, 1]) { f.block(sx * 6.2, 2.4, -11.78, .9, 2.8, .05, velvet); for (let k = 0; k < 3; k++) f.block(sx * 6.2 + (k - 1) * .3, 2.4 - .14 * (1 - Math.abs(k - 1)), -11.76, .3, .16, .04, velvet); f.block(sx * 6.2, 4.5, -11.75, 1.1, .1, .1, C.gold); f.block(sx * 6.2, 3.6, -11.74, .3, .2, .02, C.gold); for (const s of [-1, 1]) f.block(sx * 6.2 + s * .22, 3.66, -11.74, .2, .1, .02, C.gold); }
  for (const sx of [-1, 1]) { const x = sx * 5.7; f.block(x, 0, -10.7, .2, .5, .2, dark); f.block(x, .5, -10.7, 1, .9, .9, 0x5a3a24); for (const y of [.62, 1.2]) f.block(x, y, -10.7, 1.04, .06, .94, iron); f.block(x - sx * .52, .9, -10.7, .1, .12, .1, C.brass); }
  // The hearth on the left wall: a chimney breast, a dark mouth with logs and flames, a mantel with candles, a skull
  // and a clock, a portrait above, and two wing chairs on a rug before it with a little table between.
  const hx = -hw + .65;
  f.block(hx, 0, -6, 1, H, 3.2, stone[3]); for (let y = 0, k = 0; y < H; y += .42, k++) f.block(hx + .5, y, -6, .04, .4, 3.2, vary(pick(stone, r), .06, r));
  f.block(hx + .53, .2, -6, .04, 1.7, 2.1, 0x0a0608); f.block(hx + .9, 0, -6, .8, .14, 3.2, trim[0]);
  for (const dz of [-.35, .35]) f.block(hx + .6, .3, -6 + dz, .5, .2, .7, 0x3a2418);
  for (const [dz, h, c] of [[-.4, .6, 0xff8a2a], [0, .85, 0xffc04a], [.38, .55, 0xff6a1a], [-.15, .45, 0xffe08a], [.2, .7, 0xff9a3a]]) f.block(hx + .6, .48, -6 + dz, .14, h, .22, c, true);
  f.mark?.("lamp", hx + 1.4, 1.1, -6);
  f.block(hx + .7, 2.15, -6, .5, .2, 3.6, dark); candle(hx + .75, 2.35, -7.4); candle(hx + .75, 2.35, -4.6);
  f.block(hx + .75, 2.35, -6.5, .26, .24, .26, 0xe8e0cc); f.block(hx + .89, 2.45, -6.56, .02, .06, .06, 0x1a1418); f.block(hx + .89, 2.45, -6.44, .02, .06, .06, 0x1a1418);
  f.block(hx + .72, 2.35, -5.5, .2, .5, .3, 0x3a2418); f.block(hx + .83, 2.55, -5.5, .02, .2, .2, 0xe8dcc0);
  f.block(hx + .54, 3.1, -6, .06, 1.9, 1.5, C.gold); f.block(hx + .57, 3.25, -6, .04, 1.6, 1.2, 0x2a1820); f.block(hx + .59, 3.95, -6, .03, .4, .32, 0xe0d8e0); f.block(hx + .6, 3.6, -6, .03, .5, .5, 0x1a1418);
  f.block(hx + .6, 4.05, -6.08, .02, .05, .05, 0xff3a2a, true); f.block(hx + .6, 4.05, -5.92, .02, .05, .05, 0xff3a2a, true);
  f.block(-4.4, .12, -6, 2.6, .02, 3.4, 0x5a1020); for (const s of [-1, 1]) { f.block(-4.4, .13, -6 + s * 1.62, 2.6, .02, .08, C.gold); f.block(-4.4 + s * 1.26, .13, -6, .08, .02, 3.4, C.gold); }
  for (const z of [-4.9, -7.1]) { f.block(-4.2, 0, z, .7, .45, .7, dark); f.block(-4.25, .45, z, .7, .16, .7, plush); f.block(-3.85, .45, z, .16, 1.4, .8, plush); f.block(-3.8, 1.85, z, .2, .2, .9, plush); for (const s of [-1, 1]) f.block(-4.25, .6, z + s * .36, .7, .32, .12, plush); }
  f.block(-4.2, 0, -6, .08, .6, .08, dark); f.block(-4.2, .6, -6, .5, .06, .5, dark); candle(-4.2, .66, -6.1, true); f.block(-4.1, .66, -5.9, .26, .06, .2, 0x4a2a5a);
  // Booths along the right wall: high-backed velvet benches either side of a candlelit table.
  for (const zc of [-3.2, -6.7]) { const x = hw - 1.5;
    f.block(x, 0, zc, .12, .74, .12, iron); f.block(x, .74, zc, 1.5, .08, 1, dark); f.block(x, .82, zc, 1.1, .01, .7, 0xa8122a); candle(x, .83, zc, true);
    for (const s of [-1, 1]) { const z = zc + s * 1.15; f.block(x + .15, 0, z, 1.8, .42, .5, dark); f.block(x + .15, .42, z, 1.8, .14, .5, plush); f.block(x + .15, .42, z + s * .28, 1.8, 1.7, .14, dark); f.block(x + .15, .6, z + s * .2, 1.6, 1.2, .04, plush); f.block(x + .15, 2.12, z + s * .28, .5, .3, .14, dark); f.block(x + .15, 2.42, z + s * .28, .2, .2, .14, C.gold); } }
  // The chandelier: an iron ring of candles hung on chains from the rafters.
  { const y = 4.6, z = -5.6; for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; f.block(Math.cos(t) * 1.3, y, z + Math.sin(t) * 1.3, .32, .08, .32, iron); if (i % 2 === 0) candle(Math.cos(t) * 1.3, y + .08, z + Math.sin(t) * 1.3); }
    for (let i = 0; i < 4; i++) { const t = i / 4 * Math.PI * 2 + .4; for (let k = 0; k < 6; k++) { const u = k / 6; f.block(Math.cos(t) * 1.3 * (1 - u), y + .1 + u * 1.6, z + Math.sin(t) * 1.3 * (1 - u), .05, .26, .05, iron); } }
    f.block(0, y + 1.7, z, .08, H - y - 1.7, .08, iron); f.block(0, y - .2, z, .3, .3, .3, iron); f.mark?.("lamp", 0, y - .3, z); }
  // Rafters, with bats roosting upside down along them.
  for (const z of [-1.6, -4.4, -7.2, -10]) { f.block(0, H, z, W, .28, .28, dark); for (const sx of [-1, 1]) f.block(sx * (hw - .3), H - 1, z, .24, 1, .24, dark); }
  f.block(0, H + .28, -D / 2, .3, .3, D, dark);
  for (let i = 0; i < 10; i++) { const z = [-1.6, -4.4, -7.2, -10][i % 4], x = -5.5 + i * 1.2 + (r() - .5) * .4, y = H - .3; f.block(x, y, z, .12, .26, .1, 0x15121a); for (const s of [-1, 1]) f.block(x + s * .09, y + .02, z, .06, .22, .08, 0x221a2a); f.block(x - .03, y + .02, z + .05, .03, .03, .01, 0xff3a2a, true); f.block(x + .03, y + .02, z + .05, .03, .03, .01, 0xff3a2a, true); }
  // A portrait on the right wall by the bar, and an upright coffin and the crypt's trapdoor by the door.
  { const x = hw - .2, z = -10.4; f.block(x, 2.5, z, .06, 2, 1.5, C.gold); f.block(x - .03, 2.65, z, .04, 1.7, 1.2, 0x2a1820); f.block(x - .05, 3.6, z, .03, .4, .32, 0xe0d8e0); f.block(x - .05, 3.1, z, .03, .5, .6, 0x1a1418); f.block(x - .06, 3.72, z - .07, .02, .05, .05, 0xff3a2a, true); f.block(x - .06, 3.72, z + .07, .02, .05, .05, 0xff3a2a, true); }
  { const x = -5.95, z = -1.3; for (let i = 0; i < 12; i++) { const t = i / 11, w = t < .25 ? .5 + t * 1.6 : .9 - (t - .25) * .6; f.block(x, i * .2, z, .5, .2, w, 0x2a1810); } f.block(x + .27, .6, z, .02, 1.4, .06, C.brass); f.block(x + .27, 1.6, z, .02, .06, .4, C.brass); f.block(x, 2.4, z, .5, .1, .7, 0x15121a); f.block(x, 2.5, z, .36, .36, .4, 0x15121a); }
  { const x = 5.35, z = -1.2; f.block(x, .12, z, 1.3, .02, 1.3, 0x050306); for (let k = -2; k <= 2; k++) { f.block(x + k * .26, .14, z, .05, .05, 1.3, iron); f.block(x, .14, z + k * .26, 1.3, .05, .05, iron); } for (const s of [-1, 1]) candle(x + s * .85, .12, z + .8, true); f.block(x, .14, z - .78, 1.4, .3, .1, iron); }
}

// The shell of a front-open hall (front +z is the door): boards in staggered rows, plaster walls in a timber frame,
// beams overhead, and the front cut to a sill with lanterns on posts either side of the doorway. Halls are a little
// roomier than the cottages outside them, as game rooms are.
function hallShell(f, r, { w, d, h = 4.8, boards, wall, beam = C.beam, doorLamps = false }) {
  const hw = w / 2;
  for (let k = 0, z = -d + .25; z < 0; z += .5, k++) for (let x = -hw - (k % 2); x < hw; x += 2) { const x0 = Math.max(-hw, x), x1 = Math.min(hw, x + 2); if (x1 - x0 > .05) f.block((x0 + x1) / 2, 0, z, x1 - x0 - .03, .12, .47, vary(pick(boards, r), .05, r)); }
  f.block(0, 0, -d, w, h, .26, wall); for (const sx of [-1, 1]) f.block(sx * hw, 0, -d / 2, .26, h, d, wall);
  for (let x = -hw; x <= hw + .01; x += 2.2) f.block(Math.max(-hw + .1, Math.min(hw - .1, x)), 0, -d + .16, .22, h, .1, beam);
  for (const sx of [-1, 1]) for (let z = -d; z <= .01; z += 2.25) f.block(sx * (hw - .16), 0, Math.min(-.12, z), .1, h, .22, beam);
  for (const y of [.9, h - .16]) { f.block(0, y, -d + .17, w, .16, .08, beam); for (const sx of [-1, 1]) f.block(sx * (hw - .17), y, -d / 2, .08, .16, d, beam); }
  for (let z = -1.3; z > -d; z -= 2.2) f.block(0, h, z, w, .24, .26, beam);
  for (const sx of [-1, 1]) { const len = hw - 1.15; f.block(sx * (1.15 + len / 2), 0, 0, len, .7, .26, wall); f.block(sx * (1.15 + len / 2), .7, 0, len + .1, .08, .34, beam); f.block(sx * 1.2, 0, 0, .3, 1.3, .3, beam); lantern(f, sx * 1.2, 1.3, 0, .6); if (doorLamps) f.mark?.("lamp", sx * 1.2, 1.9, .3); }
  f.block(0, 0, .3, 2.2, .1, .6, C.stone[1]);
}
// Books packed along a shelf from x0 to x1 at height y, their spines facing +z (or leaning now and then).
function bookRow(f, r, x0, x1, y, z, depth = .3) {
  const spines = [0x6a2f58, 0x2a5a6a, 0xc8a03a, 0x8a1a2a, 0x2a3a6a, 0x5a6a2a, 0x6a4028, 0x3a2a4a, 0xa85a2a];
  for (let x = x0; x < x1 - .06;) { const t = .08 + r() * .07, h = .3 + r() * .2; if (r() < .06) { x += .12; continue; } f.block(x + t / 2, y, z, t - .01, h, depth, vary(pick(spines, r), .08, r)); if (r() < .3) f.block(x + t / 2, y + h * .7, z + depth / 2 + .005, t - .03, .03, .01, C.gold); x += t; }
}
// Elowen's library, inside: shelves of books to the ceiling with a rolling ladder, a window seat under a round
// moon window with a telescope by it, her writing desk with the almanac open under candles, a bookbinding bench
// with its press, a stove with a kettle, herbs drying from the beams, a jar of glowing moths and a round rug.
export const ELOWEN_HALL = Object.freeze({ w: 11, d: 9, host: [.9, -5.4], spawn: [0, -1.4], light: .38, exposure: 1,
  blocks: Object.freeze([[-5.5, -9, 5.5, -8.1], [-2.3, -5.2, .3, -3.6], [3.9, -4.6, 5.5, -1.6], [3.9, -7.6, 5.5, -5.8], [-5.5, -5.8, -4.2, -3.2], [-5.5, -7.4, -4, -6.2], [-1.1, -7, .5, -6.2]]) });
export function elowenLibrary(f, r = seeded(177)) {
  const W = 11, D = 9, hw = W / 2, H = 4.8, dark = 0x3a2418, plum = C.plum;
  hallShell(f, r, { w: W, d: D, h: H, boards: [0x4a3020, 0x553826, 0x3e281a], wall: 0x9a86a8 });
  // Shelves to the ceiling across the back wall, packed with books, and a rolling ladder.
  for (let x = -hw + .3; x <= hw - .3; x += 2.08) f.block(x, 0, -D + .5, .1, H - .2, .6, dark);
  for (const y of [.05, .9, 1.75, 2.6, 3.45]) { f.block(0, y, -D + .5, W - .4, .07, .62, dark); bookRow(f, r, -hw + .4, hw - .4, y + .07, -D + .5); }
  for (const sx of [-1, 1]) f.block(2.6 + sx * .3, 0, -D + 1.05, .06, 4.2, .06, C.wood); for (let y = .4; y < 4.1; y += .4) f.block(2.6, y, -D + 1.05, .6, .05, .06, C.wood); f.block(2.6, 4.15, -D + .9, .7, .06, .3, C.brass);
  // A round moon window on the left wall with a cushioned seat beneath, a telescope and a star chart.
  { const x = -hw + .15, z = -4.5; for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2; f.block(x + .02, 2.5 + Math.sin(t) * 1.05, z + Math.cos(t) * 1.05, .12, .26, .26, C.beam); } for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { if (Math.hypot(i, j) > 4.2) continue; f.block(x, 2.5 + j * .22, z + i * .22, .04, .22, .22, (i + j) % 2 ? 0x4a4a9a : 0x5a5ab0, true); }
    f.block(x + .03, 2.5, z, .05, 2, .05, C.beam); f.block(x + .03, 2.5, z, .05, .05, 2, C.beam);
    f.block(x + .6, 0, z, 1.1, .5, 2.4, dark); f.block(x + .6, .5, z, 1.1, .18, 2.4, plum); for (const dz of [-.8, .1, .9]) f.block(x + .45, .68, z + dz, .4, .32, .5, pick([0x8a5a9a, 0xc8a03a, 0x5a3a6a], r)); }
  { const x = -hw + 1, z = -6.8; for (const [a, b] of [[-.25, -.2], [.25, -.2], [0, .3]]) f.block(x + a, 0, z + b, .05, 1.3, .05, C.brass); f.block(x, 1.3, z, .16, .16, .16, C.brass); for (let k = 0; k < 6; k++) f.block(x + .1 + k * .1, 1.4 + k * .09, z, .14 - k * .01, .14 - k * .01, .14 - k * .01, k ? C.brass : 0x2a2a3a); }
  { const x = -hw + .15, z = -7.6; f.block(x + .02, 1.6, z, .04, 1.4, 1.1, 0x1a1a3a); for (let i = 0; i < 14; i++) f.block(x + .05, 1.7 + r() * 1.2, z - .5 + r(), .02, .05, .05, 0xf0e8c0, r() < .5); f.block(x + .04, 1.55, z, .05, .08, 1.2, C.gold); f.block(x + .04, 3.02, z, .05, .08, 1.2, C.gold); }
  // The writing desk: the almanac open under two candles, a quill and ink, a globe, and books stacked about.
  { const x = -1, z = -4.4; f.block(x, 0, z, 2.2, .78, 1.1, dark); f.block(x, .78, z, 2.4, .08, 1.2, 0x2a1810); for (const sx of [-1, 1]) f.block(x + sx * .9, 0, z, .3, .78, 1, 0x2a1810);
    f.block(x, .86, z + .1, .9, .05, .6, 0xe8dcc0, true); f.block(x, .88, z + .1, .04, .04, .62, 0x6a2f58); for (let i = 0; i < 4; i++) f.block(x - .3 + (i % 2) * .6, .9, z - .05 + (i >> 1) * .25, .3, .01, .02, 0x6a5a7a);
    for (const dx of [-.95, .95]) { f.block(x + dx, .86, z - .3, .1, .3, .1, 0xf0e6d8); f.block(x + dx, 1.16, z - .3, .06, .1, .06, 0xffb347, true); }
    f.mark?.("lamp", x, 1.6, z); f.block(x + .7, .86, z + .3, .12, .14, .12, 0x1a1a2a); f.block(x + .78, .95, z + .28, .02, .4, .02, 0xe8e0d0);
    f.block(x - .75, .86, z + .25, .08, .3, .08, C.brass); f.block(x - .75, 1.16, z + .25, .36, .36, .36, 0x3a6a8a); f.block(x - .75, 1.2, z + .25, .3, .28, .38, 0x6a8a4a);
    for (const [dx, dz, n] of [[1.6, .4, 5], [-1.9, .7, 3], [1.4, -.6, 4]]) for (let k = 0; k < n; k++) f.block(x + dx + (r() - .5) * .08, k * .12, z + dz, .5, .11, .38, vary(pick([0x6a2f58, 0x2a5a6a, 0xc8a03a, 0x8a1a2a], r), .08, r)); }
  f.block(-1, .12, -4.4, 3.6, .02, 3.2, 0x4a2a5a); for (const s of [-1, 1]) { f.block(-1, .13, -4.4 + s * 1.55, 3.6, .02, .08, C.gold); f.block(-1 + s * 1.75, .13, -4.4, .08, .02, 3.2, C.gold); } for (const s of [-1, 1]) f.block(-1 + s * .3, .14, -2.2, .5, .01, .3, C.moth); f.block(-1, .14, -2.2, .12, .01, .4, 0x8a6a4a);
  // The bookbinding bench on the right wall: a screw press, leather, spools of thread and a stack of loose pages.
  { const x = hw - .8, z = -3.1; f.block(x, 0, z, 1.2, .82, 2.8, dark); f.block(x, .82, z, 1.3, .08, 3, 0x2a1810);
    f.block(x, .9, z - .8, .6, .5, .6, C.iron); f.block(x, 1.4, z - .8, .1, .5, .1, C.iron); f.block(x, 1.9, z - .8, .8, .08, .08, C.iron); f.block(x, .9, z + .3, .7, .02, .6, 0x8a4a2a); f.block(x, .92, z + .3, .5, .02, .4, 0x6a3a1a);
    for (const [dz, c] of [[.9, 0xc8302a], [1.1, 0x2a5a8a], [1.25, 0xd8b03a]]) f.block(x - .3, .9, z + dz, .14, .16, .14, c); for (let k = 0; k < 6; k++) f.block(x + .25, .9 + k * .03, z + 1, .4, .03, .5, 0xf0e8d4); }
  // A little iron stove with a kettle and its pipe, and herbs and dried flowers hung from the beam above it.
  { const x = hw - .9, z = -6.7; f.block(x, 0, z, .9, .9, .9, C.iron); f.block(x - .46, .3, z, .02, .3, .4, 0xff8a3a, true); f.block(x, .9, z, 1, .08, 1, 0x1a1a22); f.block(x + .2, .98, z, .14, H - 1, .14, C.iron); f.block(x - .2, .98, z, .3, .24, .3, 0x6a6a7a); f.block(x - .38, 1.1, z, .14, .04, .04, 0x6a6a7a); f.mark?.("lamp", x - .6, .8, z); }
  for (let i = 0; i < 9; i++) { const x = hw - 2.6 + i * .28, z = -6.1, len = .5 + r() * .5; f.block(x, H - len - .05, z, .02, len, .02, 0x5a4a3a); f.block(x, H - len - .35, z, .16, .32, .12, pick([0x5a7a3a, 0x8a6a9a, 0xb89a4a, 0x7a3a4a], r)); }
  // The moth jar: a glass lantern hung from a beam with moths glowing in it, and moths resting on the walls.
  { const x = 1.6, z = -3.4, y = 3.2; f.block(x, y + .6, z, .03, H - y - .6, .03, C.iron); f.block(x, y + .5, z, .5, .1, .5, C.brass); f.block(x, y, z, .44, .5, .44, 0x9a9ad0); for (let i = 0; i < 6; i++) f.block(x + (r() - .5) * .3, y + .08 + r() * .34, z + (r() - .5) * .3, .08, .04, .06, 0xfff0b0, true); f.mark?.("lamp", x, y, z); }
  for (let i = 0; i < 16; i++) { const left = i % 2, x = left ? -hw + .15 : hw - .15, z = -1 - r() * 7, y = 1.2 + r() * 3; f.block(x, y, z, .02, .06, .1, C.moth); f.block(x, y, z - .07, .02, .1, .07, C.moth); f.block(x, y, z + .07, .02, .1, .07, C.moth); }
  // Ferns in pots by the door.
  for (const sx of [-1, 1]) { const x = sx * (hw - .7), z = -.8; f.block(x, 0, z, .5, .45, .5, 0xa05a3a); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; f.block(x + Math.cos(a) * .25, .45 + (i % 3) * .1, z + Math.sin(a) * .25, .28, .1, .1, vary(0x4a7a3a, .1, r)); } }
}
// Rowan's workshop, inside: a heavy workbench with a vice, a plank and shavings, a pegboard of tools, a lathe,
// stacked timber, sawhorses, a door on trestles and a chair waiting for its seat, a potbelly stove, his straw
// bed with a patched quilt, a nail barrel, a broom, and crows watching from the beam.
export const ROWAN_HALL = Object.freeze({ w: 11, d: 9, host: [-.4, -5.1], spawn: [0, -1.4], light: .5, exposure: 1.05,
  blocks: Object.freeze([[-2.6, -7, 2.6, -5.5], [-5.5, -7.6, -3.8, -5.2], [-5.5, -4.6, -4.5, -.8], [3.8, -9, 5.5, -7], [3.2, -3.8, 5.5, -.6], [-3.8, -2.8, -1.6, -1.5], [1, -5, 3.2, -3.6], [-5.5, -9, 5.5, -8.4]]) });
export function rowanWorkshop(f, r = seeded(179)) {
  const W = 11, D = 9, hw = W / 2, H = 4.6, pine = [0x9a7a52, 0xa8885e, 0x8c6c46], dark = 0x4a3020, steel = 0x8a8a96, shaving = 0xe8c890;
  hallShell(f, r, { w: W, d: D, h: H, boards: pine, wall: 0x6a4a32, beam: 0x3a2618 });
  for (let i = 0; i < 26; i++) f.block((r() - .5) * 9, .12, -1 - r() * 7, .3 + r() * .4, .015, .2 + r() * .3, 0xd8b884);
  // The pegboard of tools across the back wall: saws, hammers, chisels, a mallet, a square and clamps.
  f.block(0, 1.2, -D + .2, 7, 2.2, .06, 0xc8a878); for (let x = -3.3; x <= 3.3; x += .3) for (let y = 1.35; y < 3.3; y += .3) f.block(x, y, -D + .24, .03, .03, .02, 0x6a5038);
  for (const x of [-2.9, -1.6]) { f.block(x, 1.6, -D + .27, .9, .5, .02, steel); f.block(x + .5, 1.65, -D + .28, .25, .4, .04, C.wood); }
  for (const x of [-.6, -.25, .1]) { f.block(x, 2.2, -D + .28, .06, .6, .04, C.wood); f.block(x, 2.75, -D + .28, .22, .1, .06, steel); }
  for (const x of [.6, .8, 1, 1.2]) { f.block(x, 1.5, -D + .28, .04, .4, .03, C.woodLight); f.block(x, 1.38, -D + .28, .03, .14, .02, steel); }
  f.block(1.9, 2.4, -D + .28, .1, .5, .04, C.wood); f.block(1.9, 2.9, -D + .28, .36, .26, .2, 0x8a6a46); f.block(2.7, 1.6, -D + .28, .08, .7, .03, steel); f.block(2.94, 2.26, -D + .28, .5, .06, .03, steel);
  for (const x of [-.5, 2.4]) { f.block(x, 3.0, -D + .28, .5, .06, .06, 0x8a2a2a); f.block(x - .22, 2.8, -D + .28, .06, .26, .06, steel); }
  // The workbench: a thick top on stout legs, a vice, a plank with curls of shavings, a plane, a square and a lantern.
  { const z = -6.25; f.block(0, 0, z, 4.8, .9, 1.4, dark); f.block(0, .9, z, 5, .16, 1.5, 0x6a4a2e); for (const sx of [-1, 1]) f.block(sx * 2.2, 0, z, .3, .9, 1.3, 0x3a2418); f.block(0, .3, z, 4.2, .08, 1.1, 0x5a3a24);
    f.block(2.2, 1.06, z + .55, .5, .3, .3, steel); f.block(2.2, 1.2, z + .82, .06, .06, .4, steel);
    f.block(-.4, 1.06, z, 2.6, .08, .5, C.woodLight); for (let i = 0; i < 12; i++) f.block(-1.6 + r() * 3.2, 1.06 + (r() < .5 ? .08 : 0), z - .4 + r() * .8, .12, .06, .08, shaving);
    f.block(.6, 1.14, z + .05, .4, .1, .14, C.wood); f.block(.6, 1.24, z + .05, .1, .08, .1, steel); f.block(-1.9, 1.06, z + .4, .5, .02, .08, steel); f.block(-1.66, 1.06, z + .2, .02, .02, .4, steel);
    lantern(f, -2.1, 1.06, z - .3, .7); f.mark?.("lamp", -2.1, 1.8, z); }
  // A lathe on the left, a spindle half turned in it, and timber stacked on a rack along the wall.
  { const x = -hw + .9, z = -6.4; f.block(x, 0, z, .8, .8, 2.2, dark); f.block(x, .8, z, .5, .3, 2.2, C.iron); for (const dz of [-.9, .9]) f.block(x, 1.1, z + dz, .4, .4, .3, C.iron); f.block(x, 1.26, z, .14, .14, 1.5, C.woodLight); for (let k = -3; k <= 3; k++) f.block(x, 1.26, z + k * .2, .2 - Math.abs(k) * .02, .2 - Math.abs(k) * .02, .1, C.woodLight); }
  for (const y of [.2, 1.2, 2.2]) { f.block(-hw + .25, y, -2.7, .4, .06, 3.8, C.iron); for (let k = 0; k < 4; k++) f.block(-hw + .5, y + .06 + (k % 2) * .1, -2.7, .2 + k * .05, .1, 3.6 - k * .2, vary(pick(pine, r), .06, r)); }
  // Sawhorses with a plank across them, a door on trestles, and a chair waiting for its seat.
  for (const x of [-3.4, -2]) { for (const s of [-1, 1]) f.block(x, 0, -2.15 + s * .3, .08, .72, .08, C.wood); f.block(x, .7, -2.15, .12, .08, .8, C.wood); } f.block(-2.7, .78, -2.15, 2.2, .1, .5, C.woodLight);
  for (const x of [1.3, 2.9]) { for (const s of [-1, 1]) f.block(x, 0, -4.3 + s * .4, .08, .76, .08, C.wood); f.block(x, .76, -4.3, .12, .06, 1, C.wood); } f.block(2.1, .82, -4.3, 2, .1, 1.1, 0x5a7a5a); for (const dx of [-.5, .5]) f.block(2.1 + dx, .92, -4.3, .7, .02, .8, 0x4a6a4a); f.block(2.9, .94, -4.1, .12, .04, .12, C.brass);
  { const x = .2, z = -2.6; for (const [a, b] of [[-.25, -.25], [.25, -.25], [-.25, .25], [.25, .25]]) f.block(x + a, 0, z + b, .07, .5, .07, C.woodLight); f.block(x, .5, z + .25, .56, .06, .06, C.woodLight); f.block(x, .5, z - .25, .56, .06, .06, C.woodLight); for (const a of [-.25, .25]) f.block(x + a, .5, z - .25, .07, .8, .07, C.woodLight); f.block(x, 1.2, z - .25, .56, .1, .06, C.woodLight); }
  // The potbelly stove in the back corner, its door aglow, a kettle on top and the pipe up through the roof.
  { const x = hw - .9, z = -7.9; f.block(x, 0, z, .7, .3, .7, C.iron); f.block(x, .3, z, .9, .8, .9, C.iron); f.block(x - .46, .5, z, .02, .35, .35, 0xff7a2a, true); f.block(x, 1.1, z, .7, .12, .7, C.iron); f.block(x, 1.22, z, .18, H - 1.2, .18, C.iron); f.block(x - .1, 1.22, z + .2, .28, .22, .28, 0x6a6a7a); f.mark?.("lamp", x - .7, .7, z); }
  // His bed: a straw-stuffed frame with a patched quilt, a pumpkin for a pillow, and his boots beside it.
  { const x = hw - 1.1, z = -2.2; f.block(x, 0, z, 1.6, .5, 2.6, 0x6a4a2e); f.block(x, .5, z, 1.5, .18, 2.5, 0xd8b85a); for (let i = 0; i < 12; i++) f.block(x - .6 + (i % 3) * .6, .68, z - 1.05 + Math.floor(i / 3) * .5, .58, .05, .48, pick([0x8a3a4a, 0x3a6a8a, 0xc8a03a, 0x5a7a3a, 0x8a6a9a], r)); f.block(x, .73, z - .9, .5, .34, .44, 0xe8771f); f.block(x, 1.07, z - .9, .06, .1, .06, 0x5a7a3a);
    for (const dz of [.6, .85]) f.block(x - 1, 0, z + dz, .2, .3, .14, 0x3a2a1a); }
  // A nail barrel, a broom against the wall, a pile of sawdust, and crows on the beam watching him work.
  f.block(-hw + .9, 0, -.9, .6, .7, .6, 0x6a4a2e); for (const y of [.12, .55]) f.block(-hw + .9, y, -.9, .64, .05, .64, C.iron); for (let i = 0; i < 8; i++) f.block(-hw + .9 + (r() - .5) * .4, .7, -.9 + (r() - .5) * .4, .02, .14, .02, steel);
  f.block(hw - .3, 0, -5, .06, 1.8, .06, C.wood); f.block(hw - .3, 0, -5, .3, .4, .14, 0xc8a048); f.block(-1, .12, -7.6, .9, .14, .5, 0xd8b884);
  for (const [x, z] of [[-2.5, -3.5], [-1.9, -3.5], [3.1, -5.7]]) { const y = H + .24; f.block(x, y, z, .26, .22, .16, 0x17141d); f.block(x + .13, y + .16, z, .14, .14, .14, 0x17141d); f.block(x + .22, y + .17, z, .1, .04, .05, 0x3a3a3a); f.block(x + .14, y + .22, z + .07, .03, .03, .02, 0xffd060, true); f.block(x - .15, y + .06, z, .12, .08, .12, 0x17141d); }
}

// A fair's market stall (front +z): a timber counter with a striped skirt under a striped awning
// with a scalloped edge, goods on the counter and shelf, a lantern under the awning and a sign.
export function marketStall(f, a, b, goods = "pumpkins", r = seeded(171)) {
  const w = 3.2, d = 1.8, n = 7, sw = (w + .3) / n;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.block(sx * (w / 2 - .1), 0, sz * (d / 2 - .1), .14, sz > 0 ? 2.45 : 2.95, .14, C.timber);
  f.block(0, 0, .45, w, .95, .62, C.wood); f.block(0, .95, .45, w + .12, .08, .74, C.woodLight); f.block(0, 1.55, -.62, w - .2, .08, .4, C.woodLight);
  for (let i = 0; i < 6; i++) f.block(-w / 2 + .27 + i * .53, .18, .77, .5, .62, .02, i % 2 ? a : b);
  // The awning slopes from the back posts down over the counter; its front edge hangs in scallops.
  for (let i = 0; i < n; i++) { const x = -w / 2 - .15 + (i + .5) * sw; for (let k = 0; k < 4; k++) f.block(x, 2.98 - k * .15, -d / 2 - .1 + k * .66, sw, .1, .68, i % 2 ? a : b); f.block(x, 2.3, d / 2 + .52, sw - .03, .2, .05, i % 2 ? a : b); f.block(x, 2.2, d / 2 + .52, sw * .5, .1, .05, i % 2 ? a : b); }
  // Goods on the counter and the shelf behind.
  const lay = (y, z, k) => { for (let i = 0; i < k; i++) { const x = -w / 2 + .4 + i * (w - .8) / (k - 1); if (goods === "pumpkins") { const p = pick([0xe8771f, 0xf08a2a, 0xd9962a, 0xece4d4], r), sz = .26 + r() * .14; f.block(x, y, z, sz, sz * .8, sz, p); f.block(x, y + sz * .8, z, .05, .08, .05, 0x5a7a3a); } else if (goods === "apples") { f.block(x, y, z, .36, .16, .3, C.wood); for (const o of [-.08, .08]) f.block(x + o, y + .16, z, .12, .12, .12, pick([0xc8302a, 0xa8202a, 0xd8b03a], r)); } else if (goods === "sweets") { f.block(x, y, z, .16, .3, .16, 0xd8e4f0); f.block(x, y + .3, z, .18, .05, .18, C.gold); f.block(x, y + .05, z, .12, .18, .12, pick([0xe85a9a, 0x8ad86a, 0xf0c252, 0x9a6ae0], r), true); } else { f.block(x, y, z, .14, .3, .14, pick([0x3a8a5a, 0x7a3aa0, 0xa8203a], r), true); f.block(x, y + .3, z, .06, .1, .06, 0x5a3a2a); } } };
  lay(1.03, .4, 6); lay(1.63, -.62, 5);
  lantern(f, 0, 2.05, .75, .6);
  f.block(0, 3.08, -.95, 1.5, .48, .08, C.woodLight); f.block(0, 3.16, -.9, 1.2, .3, .02, a); f.block(0, 3.22, -.88, .6, .14, .01, C.cream);
}

// A leaning gravestone with moss, sometimes a candle at its foot.
export function gravestone(f, x, z, r = seeded(71), kind = 0) {
  const c = vary(pick(C.stoneDark, r), .06, r);
  if (kind % 3 === 0) { f.block(x, 0, z, .7, .9, .18, c); f.block(x, .9, z, .5, .12, .18, c); f.block(x, 1.02, z, .3, .08, .18, c); }
  else if (kind % 3 === 1) { f.block(x, 0, z, .16, 1.2, .16, c); f.block(x, .78, z, .6, .16, .16, c); }
  else { f.block(x, 0, z, .8, .6, .22, c); f.block(x, .6, z, .6, .14, .22, c); }
  f.block(x - .16, .02, z + .1, .3, .12, .06, 0x4f7a3a); f.block(x, 0, z + .5, .6, .04, .7, 0x3f5a35);
  if (r() < .45) { f.block(x + .28, 0, z + .3, .08, .2, .08, 0xf0e6d0); f.block(x + .28, .2, z + .3, .05, .07, .05, 0xffb347, true); }
}
// A twisted bare tree: crooked limbs reaching out, black against the moon.
export function spookyTree(f, x, z, size = 1, r = seeded(73)) {
  const k = size, bark = 0x2e2630;
  f.block(x, 0, z, .7 * k, .3 * k, .7 * k, bark);
  let px = x, pz = z, y = 0;
  for (let i = 0; i < 6; i++) { const nx = px + (r() - .5) * .3 * k, nz = pz + (r() - .5) * .3 * k; f.block(nx, y, nz, (.46 - i * .04) * k, .62 * k, (.46 - i * .04) * k, vary(bark, .08, r)); px = nx; pz = nz; y += .58 * k; }
  for (let b = 0; b < 6; b++) {
    let a = b / 6 * Math.PI * 2 + r() * .6, bx = px, bz = pz, by = y * (.55 + b * .08);
    for (let s = 0; s < 5; s++) { a += (r() - .5) * .8; bx += Math.cos(a) * .32 * k; bz += Math.sin(a) * .32 * k; by += (.1 + r() * .16) * k; f.block(bx, by, bz, (.16 - s * .02) * k, .14 * k, (.16 - s * .02) * k, bark); }
    if (r() < .4) f.block(bx, by - .3 * k, bz, .05, .3 * k, .05, 0x1e1a24);
  }
  if (r() < .5) { const s2 = r() < .5 ? -1 : 1; f.block(px + s2 * .4 * k, y * .7, pz, .22, .2, .22, 0x1a1620); f.block(px + s2 * .4 * k, y * .7 + .02, pz + .12, .05, .05, .03, 0xffd060, true); }
}
// A crow perched on something, y its height.
export function crow(f, x, z, y = 0, r = seeded(75)) { const c = 0x1a1820; f.block(x, y, z, .14, .16, .3, c); f.block(x, y + .12, z + .14, .12, .12, .12, c); f.block(x, y + .14, z + .23, .04, .04, .08, 0xd9a43a); f.block(x, y + .04, z - .2, .1, .04, .14, c); f.block(x - .05, y + .16, z + .19, .03, .03, .02, 0xffd060, true); }
// A witch's cauldron on three legs, its brew glowing green.
export function cauldron(f, x, z, r = seeded(77)) {
  for (const [dx, dz] of [[-.3, -.2], [.3, -.2], [0, .32]]) f.block(x + dx, 0, z + dz, .08, .3, .08, 0x1e1a24);
  f.block(x, .2, z, .8, .5, .8, 0x26222c); f.block(x, .14, z, .6, .1, .6, 0x26222c); f.block(x, .7, z, .9, .08, .9, 0x2e2a34);
  f.block(x, .72, z, .66, .04, .66, 0x7af06a, true); for (let i = 0; i < 4; i++) f.block(x + (r() - .5) * .4, .78 + i * .12, z + (r() - .5) * .4, .1, .1, .1, 0xa8ff9a, true);
  for (let i = 0; i < 5; i++) f.block(x + (r() - .5) * .5, 0, z + (r() - .5) * .5 + .5, .14, .1, .1, 0xffa83a, true);
}

// The Moth Tree at the heart of the square: a vast old tree on a round stone bed.
// A gnarled trunk in grooved bark twists up from roots that spill over the bed's rim,
// thick limbs fork outwards, and its crown is a cloud of separate clumps of leaves,
// each jittered so it never reads as a grid, deep crimson beneath and lit orange and
// gold on top, with lanterns hung through it.
export function mothTree(f, x, z, r = seeded(81)) {
  const R = 2.7;
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; f.block(x + Math.cos(a) * R, 0, z + Math.sin(a) * R, .52, .56, .52, vary(pick(C.stone, r), .06, r)); f.block(x + Math.cos(a) * R, .56, z + Math.sin(a) * R, .6, .1, .6, vary(C.stone[3], .03, r)); if (i % 5 === 0) f.block(x + Math.cos(a) * (R + .05), .2, z + Math.sin(a) * (R + .05), .2, .2, .2, vary(C.hedge[1], .1, r)); }
  for (let i = 0; i < 40; i++) { const a = (i + .5) / 40 * Math.PI * 2; f.block(x + Math.cos(a) * (R + .55), 0, z + Math.sin(a) * (R + .55), .46, .2, .46, C.stone[2]); }
  f.block(x, 0, z, R * 1.75, .5, R * 1.75, 0x3a2a1e);
  for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, d = 1.3 + r() * 1.15; flower({ block: (bx, by, bz, w, h, dd, c, g) => f.block(bx, by + .5, bz, w, h, dd, c, g) }, x + Math.cos(a) * d, z + Math.sin(a) * d, pick([0xf08a3a, 0x9a6ae0, 0xf5d04a, 0xf6f0f5, 0xd6407a], r), r, 1.1); }
  const bark = (ang, y) => { const groove = Math.sin(ang * 7 + y * 1.3) > .55, knot = Math.sin(ang * 3 + y * 2.1) > .97; return shade(knot ? 0x3a2618 : groove ? 0x47301f : pick([0x5c4030, 0x664834, 0x543a2a], r), .92 + Math.min(.25, y * .03)); };
  // Roots: they leave the trunk's foot, arch over the rim and dive into the ground beyond.
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + r() * .3;
    for (let k = 0; k < 9; k++) { const t = k / 8, d = .7 + t * 2.6, y = .5 + Math.sin(t * Math.PI) * .45 - t * .5, w = .62 - t * .4; f.block(x + Math.cos(a) * d, y, z + Math.sin(a) * d, w, .34, w, bark(a, y)); }
  }
  // The trunk: rings of bark round a twisting centre, thinning as it climbs.
  let tx = x, tz = z;
  const top = 4.6;
  for (let y = .5; y < top; y += .3) {
    const t = (y - .5) / (top - .5), rad = 1.05 - t * .35 + (y < 1.2 ? (1.2 - y) * .5 : 0), cx = tx + Math.sin(y * .9) * .22, cz = tz + Math.cos(y * .7) * .18, n = Math.round(rad * 12);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; f.block(cx + Math.cos(a) * rad, y, cz + Math.sin(a) * rad, .42, .32, .42, bark(a, y)); }
    f.block(cx, y, cz, rad * 1.5, .32, rad * 1.5, 0x3a2618);
  }
  // A hollow at the trunk's foot with a moth lantern glowing inside.
  f.block(x + .9, 1.1, z + .5, .3, .7, .5, 0x1e140e); f.block(x + .82, 1.25, z + .5, .12, .32, .24, C.glow, true);
  // Limbs: thick boughs that rise and fork, ending where the crown's clumps hang.
  const ends = [];
  for (let b = 0; b < 7; b++) {
    const a0 = b / 7 * Math.PI * 2 + r() * .4, rise = .35 + r() * .25;
    let bx = x + Math.cos(a0) * .4, bz = z + Math.sin(a0) * .4, by = top - .6 + r() * .6, a = a0, w = .62;
    for (let k = 0; k < 8; k++) { a += (r() - .5) * .25; bx += Math.cos(a) * .42; bz += Math.sin(a) * .42; by += rise * .42; w = Math.max(.2, w - .05); f.block(bx, by, bz, w, w * .9, w, bark(a, by)); }
    ends.push([bx, by, bz, 1.6 + r() * .5]);
    for (const s2 of [-1, 1]) { let fx = bx, fz = bz, fy = by, fa = a + s2 * (.5 + r() * .3); for (let k = 0; k < 5; k++) { fx += Math.cos(fa) * .4; fz += Math.sin(fa) * .4; fy += .2 + r() * .1; f.block(fx, fy, fz, .22, .2, .22, bark(fa, fy)); } ends.push([fx, fy, fz, 1.2 + r() * .4]); }
  }
  ends.push([x, top + 3.1, z, 2.4]);
  // The crown: a clump of leaves at every bough's end, each leaf jittered and shaded by its height and side.
  const leafs = [0x6a0f1c, 0x8a1424, 0xa8172c, 0xbf2232, 0xd0402a, 0xe0602e, 0xe8873a, 0xf0a442];
  const seen = new Set(), cell = .3, lowY = top - .2, highY = top + 5.6;
  for (const [cx, cy, cz, cr] of ends) {
    const n = Math.ceil(cr / cell);
    for (let ix = -n; ix <= n; ix++) for (let iy = -n; iy <= n; iy++) for (let iz = -n; iz <= n; iz++) {
      const px = Math.round((cx + ix * cell - x) / cell), py = Math.round((cy + iy * cell * .85) / (cell * .85)), pz = Math.round((cz + iz * cell - z) / cell), key = (px + 500) * 1e6 + (py + 500) * 1e3 + pz + 500;
      if (seen.has(key)) continue;
      const lx = x + px * cell, ly = py * cell * .85, lz = z + pz * cell, q = ((lx - cx) ** 2 + ((ly - cy) * 1.25) ** 2 + (lz - cz) ** 2) / (cr * cr);
      if (q > 1 + (r() - .5) * .35 || q < .5) continue; seen.add(key);
      const up = Math.min(1, Math.max(0, (ly - lowY) / (highY - lowY))), sun = ((lx - x) * -.04 + (lz - z) * -.02), shadeIdx = Math.max(0, Math.min(leafs.length - 1, Math.round(up * 5.2 + sun * 3 + (q > .82 ? 1.4 : 0) + (r() - .5) * 2)));
      const c = r() < .012 && up > .5 ? 0xf6c45a : leafs[shadeIdx], sz = cell * (.86 + r() * .32);
      f.block(lx + (r() - .5) * .08, ly + (r() - .5) * .06, lz + (r() - .5) * .08, sz, sz * .8, sz, vary(c, .05, r));
    }
  }
  // Lanterns hung from the boughs, moths of brass among them.
  for (let i = 0; i < 14; i++) { const e = ends[(i * 3) % ends.length], len = .25 + r() * .5, lx = e[0] + (r() - .5) * 1.4, lz = e[2] + (r() - .5) * 1.4, ly = e[1] - e[3] * .5; f.block(lx, ly - len, lz, .03, len, .03, 0x2a2228); lantern(f, lx, ly - len - .62, lz, .9); }

}

// ---- The districts' venues (after the concept sheets) ---------------------------------
// Opal's quarry studio: pale dressed stone, two tall arched windows of stained glass,
// a crenellated parapet, a carving yard with statues, and a bell on a timber jib.
export function studio(f, r = seeded(91)) {
  const pale = [0xd8d0c0, 0xcbc2b2, 0xe2dacb], w = 7.4, d = 7, h = 5.2, hw = w / 2;
  for (let y = 0; y < h; y += .5) for (let x = -hw; x < hw - .01; x += .9) { f.block(x + .45 + (y * 2 % 2) * .2 - .1, y, -.02, .9, .5, .2, vary(pick(pale, r), .05, r)); f.block(x + .45, y, -d + .02, .9, .5, .2, vary(pick(pale, r), .05, r)); }
  f.block(0, 0, -d / 2, w - .1, h, d - .1, pale[0]);
  for (const side of [-1, 1]) for (let y = 0; y < h; y += .5) f.block(side * hw, y, -d / 2, .22, .5, d, vary(pick(pale, r), .05, r));
  for (let i = 0; i < 9; i++) if (i % 2 === 0) for (const z of [0, -d]) f.block(-hw + .4 + i * .82, h, z, .62, .55, .3, vary(pick(pale, r), .05, r)); else for (const z of [0, -d]) f.block(-hw + .4 + i * .82, h, z, .62, .18, .3, pale[1]);
  f.block(0, h, -d / 2, w - .3, .18, d - .3, 0x8a8478);
  const glass = [0xd84a6a, 0x4a8ad8, 0xe8c25a, 0x6ad89a, 0xb77ad8, 0x4ad8c8];
  for (const wx of [-1.9, 1.9]) {
    for (let k = 0; k < 9; k++) { const y = .9 + k * .38, half = k < 6 ? .62 : .62 * Math.cos((k - 5) / 4 * Math.PI / 2); for (let i = -2; i <= 2; i++) { const x = wx + i * half / 2.2; if (Math.abs(i) * half / 2.2 > half) continue; f.block(x, y, .13, half / 2.2 - .02, .36, .04, glass[(k + i + 5) % glass.length], true); } }
    f.block(wx, .8, .15, 1.5, .12, .14, C.stone[3]); for (let k = 0; k < 10; k++) { const t = k / 9, a = t * Math.PI; f.block(wx + Math.cos(a) * .72, 3.2 + Math.sin(a) * .62, .16, .16, .16, .14, C.stone[3]); }
    f.block(wx, .9, .16, .06, 3.2, .06, 0x27242d); f.block(wx, 2.3, .16, 1.24, .05, .06, 0x27242d);
  }
  f.block(0, 0, .14, 1.4, 2.6, .12, C.stone[3]); f.block(0, 0, .2, 1.1, 2.3, .08, 0x5a3a4a); for (let k = 0; k < 7; k++) { const a = k / 6 * Math.PI; f.block(Math.cos(a) * .55, 2.3 + Math.sin(a) * .4, .2, .2, .2, .08, C.stone[2]); } lantern(f, .95, 1.9, .3, .7);
  for (let k = 0; k < 4; k++) f.block(0, k * .18 - .7, .7 + k * .32, 2.2 - k * .1, .18, .4, vary(pick(pale, r), .04, r));
  f.block(hw + .9, 0, -1.5, .3, 3.6, .3, C.timber); f.block(hw + .9, 3.4, -.4, .2, .2, 2.4, C.timber); f.block(hw + .9, 2.4, .7, .03, 1, .03, 0x27242d); f.block(hw + .9, 1.9, .7, .5, .55, .5, C.brass); f.block(hw + .9, 1.82, .7, .62, .1, .62, C.brass);
  for (const [x, z, k] of [[-2.2, 2.4, 1], [2.4, 2.6, .8], [-3.4, 1.4, .7]]) { f.block(x, 0, z, .8 * k, .5 * k, .8 * k, C.stone[2]); f.block(x, .5 * k, z, .4 * k, 1.1 * k, .34 * k, C.stone[3]); f.block(x, 1.6 * k, z, .3 * k, .32 * k, .3 * k, C.stone[3]); for (const s of [-1, 1]) f.block(x + s * .32 * k, 1.1 * k, z - .05, .3 * k, .8 * k, .08, C.stone[1]); }
  for (let i = 0; i < 2; i++) { const t = frame({ block: (x, y, z, w2, h2, d2, c, g) => f.block(x, y, z, w2, h2, d2, c, g) }, 0, 0); t.block(-1.2 + i * 2.6, 0, 3.6, 1.6, .8, .7, C.wood); t.block(-1.2 + i * 2.6, .8, 3.6, 1.7, .08, .8, C.woodLight); t.block(-1.4 + i * 2.6, .88, 3.6, .4, .5, .3, C.stone[3]); }
  f.block(-hw - .6, 0, -2, 1.2, 2.4, .1, 0x3d5a8a); f.block(-hw - .6, 2.4, -2, 1.4, .1, .12, C.gold); f.block(-hw - .6, 1.2, -1.94, .5, .5, .03, C.cream);
  for (let i = 0; i < 10; i++) f.block(-hw + r() * w, r() * h, .14, .14, .3 + r() * .6, .1, vary(C.hedge[1], .1, r));
}
// Cinder's restaurant: a two-storey timber inn, stone below and jettied plaster above,
// a steep dark roof with dormers and two chimneys, a red awning, a sign and tables outside.
export function tavern(f, r = seeded(93)) {
  const w = 9, d = 7, hw = w / 2, g = 2.7, u = 2.5, slate = [0x2e2c3a, 0x363444, 0x2a2834], win = C.window;
  for (let y = 0; y < g; y += .45) for (let x = -hw; x < hw - .01; x += .8) { f.block(x + .4, y, -.02, .8, .45, .2, vary(pick(C.stone, r), .06, r)); f.block(x + .4, y, -d + .02, .8, .45, .2, vary(pick(C.stone, r), .06, r)); }
  f.block(0, 0, -d / 2, w - .1, g, d - .1, C.stone[1]); for (const s of [-1, 1]) for (let y = 0; y < g; y += .45) f.block(s * hw, y, -d / 2, .22, .45, d, vary(pick(C.stone, r), .06, r));
  f.block(0, g, -d / 2 + .3, w + .6, u, d + .2, vary(C.plasterWarm, .02, r));
  for (const x of [-hw - .3, -hw / 2, 0, hw / 2, hw + .3]) f.block(x, g, .45, .2, u, .1, C.beam); for (const y of [g, g + u - .14]) f.block(0, y, .46, w + .7, .16, .12, C.beam);
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) f.block(s * (hw * .75 - i * .3), g + .2 + i * .42, .47, .24, .4, .08, C.beam);
  for (const x of [-3.2, -1.1, 1.1, 3.2]) { f.block(x, .5, .1, 1, 1.4, .06, C.cream); f.block(x, .58, .13, .84, 1.24, .05, win, true); f.block(x, 1.18, .16, .84, .05, .03, C.cream); f.block(x, .58, .16, .05, 1.24, .03, C.cream); }
  for (const x of [-2.6, 0, 2.6]) { f.block(x, g + .55, .52, 1, 1.25, .06, C.cream); f.block(x, g + .62, .55, .84, 1.1, .05, win, true); f.block(x, g + .4, .66, 1.1, .1, .3, C.wood); for (let i = 0; i < 4; i++) f.block(x - .36 + i * .24, g + .5, .72, .14, .16, .14, pick([0xe0403a, 0xf08a3a, 0xf5d04a], r)); }
  f.block(-hw + 1.6, 0, .12, 1.4, 2.3, .1, C.stone[3]); f.block(-hw + 1.6, 0, .17, 1.15, 2.1, .08, 0x7a2a28); f.block(-hw + 1.9, 1.1, .22, .08, .08, .04, C.gold);
  for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) f.block(-hw + .7 + i * .38, 2.45 - k * .12, .5 + k * .34, .38, .1, .36, i % 2 ? C.cream : 0xa8172c);
  f.block(-hw + 1.6, 3.0, .9, .08, .08, 1.2, C.iron); f.block(-hw + 1.6, 2.3, 1.45, .1, .62, .7, 0x3a2a24); f.block(-hw + 1.6, 2.42, 1.45, .12, .38, .44, C.gold);
  const top = g + u, rise = 3.6, steps = 12;
  for (let i = 0; i < steps; i++) { const t = i / steps, y = top + t * rise, z0 = (1 - t) * (d / 2 + .9), z1 = (1 - (i + 1) / steps) * (d / 2 + .9); for (const side of [-1, 1]) { const c = vary(pick(slate, r), .05, r); f.block(0, y, -d / 2 + .3 + side * (z0 + z1) / 2, w + 1.2, rise / steps + .04, z0 - z1 + .1, c); f.block(0, y - .04, -d / 2 + .3 + side * (z0 - (z0 - z1) * .2), w + 1.22, .05, (z0 - z1) * .4, shade(c, .7)); } }
  for (const side of [-1, 1]) for (let i = 0; i < steps; i++) { const t = i / steps, half = (1 - t) * (d / 2 + .2); if (half < .1) break; f.block(side * (hw + .3), top + t * rise, -d / 2 + .3, .1, rise / steps + .02, half * 2, C.plasterWarm); }
  for (const dx of [-2.4, 0, 2.4]) { const b = top + .3; f.block(dx, b, .1, 1.3, 1.2, 1.3, C.plasterWarm); f.block(dx, b + .2, .76, .7, .7, .05, win, true); for (let i = 0; i < 5; i++) for (const s of [-1, 1]) f.block(dx + s * (.75 - i * .15), b + 1.15 + i * .14, .1, .3, .14, 1.5, vary(pick(slate, r), .05, r)); }
  for (const cx of [-hw + 1, hw - 1.2]) { for (let k = 0; k < 9; k++) { f.block(cx, top + 1 + k * .32, -d * .6, .9, .3, .9, vary(pick(C.brick, r), .06, r)); } f.block(cx, top + 3.9, -d * .6, 1.05, .14, 1.05, C.stone[3]); for (const s of [-1, 1]) f.block(cx + s * .2, top + 4.04, -d * .6, .24, .32, .24, 0xa0583a); f.mark?.("smoke", cx, top + 4.36, -d * .6); }
  for (const s of [-1, 1]) lantern(f, s * (hw - .3), 2.0, .4, .8);
  for (let i = 0; i < 4; i++) { const x = -2.6 + (i % 2) * 3.4, z = 2.2 + (i >> 1) * 1.9; f.block(x, 0, z, .14, .7, .14, C.timber); f.block(x, .7, z, 1.1, .08, 1.1, 0xf0e6d8); f.block(x, .78, z, .12, .2, .12, 0xf6f0e0); f.block(x, .98, z, .06, .08, .06, 0xffb347, true); for (const s of [-1, 1]) { f.block(x + s * .8, 0, z, .4, .42, .4, C.wood); f.block(x + s * .97, .42, z, .06, .5, .4, C.wood); } }
  f.block(hw + .4, 0, -1.2, 1.4, 1.6, 2.4, 0x6a4a34); f.block(hw + .4, 1.6, -1.2, 1.7, .14, 2.7, pick(slate, r));
  f.block(-hw - .4, 0, 1.2, .5, 1.3, .1, 0x2a2228); f.block(-hw - .4, .35, 1.26, .38, .8, .02, 0xf0e8d8);
}
// A big striped circus tent with a raised walled skirt, a peaked crown, pennants and a lit doorway.
export function bigTent(f, x, z, R = 4.2, H = 6.8, a = 0xa8172c, b = 0xf3e6c8, r = seeded(95)) {
  const n = 28, wall = 2;
  for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2, c = (i >> 1) % 2 ? a : b; f.block(x + Math.cos(t) * R, 0, z + Math.sin(t) * R, R * .26, wall, R * .26, c); f.block(x + Math.cos(t) * (R + .05), wall - .2, z + Math.sin(t) * (R + .05), R * .27, .22, R * .27, C.gold); }
  f.block(x, 0, z, R * 1.7, wall - .05, R * 1.7, shade(a, .5));
  for (let k = 0; k < 10; k++) { const rr = R * (1 - (k / 10) ** 1.2) + .2, y = wall + k * (H - wall) / 10; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2, c = (i >> 1) % 2 ? a : b; f.block(x + Math.cos(t) * rr, y, z + Math.sin(t) * rr, R * .27 * (1 - k / 13), (H - wall) / 10 + .03, R * .27 * (1 - k / 13), shade(c, .82 + k * .03)); } }
  f.block(x, H, z, .16, 1.6, .16, C.iron); f.block(x + .4, H + 1.15, z, .7, .42, .04, b); f.block(x, H + 1.6, z, .3, .3, .3, C.gold);
  for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; f.block(x + Math.cos(t) * R * .55, wall + (H - wall) * .5, z + Math.sin(t) * R * .55, .1, 1.2, .1, C.iron); f.block(x + Math.cos(t) * R * .55 + .25, wall + (H - wall) * .5 + .9, z + Math.sin(t) * R * .55, .5, .3, .03, [0xf0c252, 0xd6407a, 0x6a8ef0][i % 3]); }
  f.block(x, 0, z + R + .02, 1.8, 2.6, .1, 0xffc070, true); for (const s of [-1, 1]) f.block(x + s * 1.05, 0, z + R + .1, .4, 2.8, .2, a);
  for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; if (i % 2) f.block(x + Math.cos(t) * (R + .3), wall + .2, z + Math.sin(t) * (R + .3), .12, .12, .12, [0xffc06a, 0xe8b0ff][i % 4 > 1 ? 1 : 0], true); }
}
// Corvus's living wagon: a painted caravan on spoked wheels with a lit window and a little chimney.
export function caravan(f, r = seeded(97)) {
  f.block(0, .9, 0, 2.2, 1.9, 4, 0x4b3a8a); for (let i = 0; i < 6; i++) f.block(1.12, .95 + i * .3, 0, .04, .05, 3.9, C.gold);
  for (let k = 0; k < 5; k++) { const t = k / 4, half = Math.cos(t * Math.PI / 2) * 1.25; f.block(0, 2.8 + t * .7, 0, half * 2, .16, 4.2, k % 2 ? 0xa8172c : 0x8a1426); }
  for (const s of [-1, 1]) { f.block(s * 1.12, 1.4, -.6, .04, .8, .9, C.window, true); f.block(s * 1.13, 1.4, -.6, .04, .8, .06, C.gold); f.block(s * 1.13, 1.8, -.6, .04, .06, .9, C.gold); }
  for (const s of [-1, 1]) for (const t of [-1.3, 1.3]) { f.block(s * 1.18, .1, t, .14, 1.1, 1.1, 0xd9a441); f.block(s * 1.18, .55, t, .16, .2, .2, C.iron); for (let i = 0; i < 4; i++) f.block(s * 1.2, .55, t, .08, .06, 1, 0x8a6a3a); }
  f.block(0, .9, 2.1, 1.2, 1.6, .1, 0xd9a441); f.block(0, .9, 2.15, .8, 1.3, .06, 0x6a2a4a); for (let k = 0; k < 4; k++) f.block(0, .7 - k * .2, 2.4 + k * .3, 1, .1, .3, C.wood);
  f.block(-.6, 3.4, -1.2, .3, .9, .3, C.iron); f.block(-.6, 4.3, -1.2, .4, .1, .4, C.iron); f.mark?.("smoke", -.6, 4.4, -1.2); lantern(f, .9, 2.0, 2.2, .7);
}
// The Baron's velvet manor: dark stone and plum slate, two spired towers, a dome with a
// telescope, iron cresting, rows of red-lit windows, a red carpet up its front steps.
export function manor(f, r = seeded(99)) {
  const w = 12, d = 8, hw = w / 2, wall = [0x3d2a4a, 0x46324f, 0x352540], slate = C.slatePlum, red = 0xff7a5a;
  for (let k = 0; k < 3; k++) f.block(0, k * 3, -d / 2, w - k * .2, 3, d - k * .2, vary(pick(wall, r), .03, r));
  for (let k = 1; k < 3; k++) f.block(0, k * 3 - .1, -d / 2, w + .2, .2, d + .2, 0x5a4a62);
  for (let k = 0; k < 3; k++) for (let i = 0; i < 7; i++) { const x = -hw + 1 + i * (w - 2) / 6, y = .7 + k * 3, lit = (i + k) % 4 !== 1; if (k === 0 && i === 3) continue; for (const [z, s] of [[0, 1], [-d, -1]]) { f.block(x, y, z + s * .05, .9, 1.7, .06, C.stone[2]); f.block(x, y + .08, z + s * .08, .7, 1.5, .05, lit ? red : 0x2a1a24, lit); f.block(x, y + .82, z + s * .1, .7, .05, .03, C.stone[2]); f.block(x, y + 1.7, z + s * .08, .5, .3, .05, C.stone[2]); } }
  for (let k = 0; k < 3; k++) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const z = -1.4 - i * 2.6, y = .7 + k * 3; f.block(s * (hw + .05), y, z, .06, 1.7, .9, C.stone[2]); f.block(s * (hw + .08), y + .08, z, .05, 1.5, .7, (i + k) % 3 ? red : 0x2a1a24, (i + k) % 3 > 0); }
  f.block(0, 0, .08, 1.6, 2.6, .12, C.stone[2]); f.block(0, 0, .12, 1.3, 2.4, .1, 0x5a1a28); f.block(0, 2.4, .1, 2.2, .5, .5, C.stone[2]);
  for (let k = 0; k < 6; k++) { f.block(0, -k * .22 - .05, .6 + k * .4, 3.4 + k * .3, .22, .4, C.stone[1]); f.block(0, -k * .22 + .17, .6 + k * .4, 1.4, .03, .4, 0xa8172c); }
  for (let i = 0; i < 8; i++) { const t = i / 8, half = (1 - t) * (d / 2 + .5); f.block(0, 9 + i * .5, -d / 2, w + .6 - t * 2, .5, half * 2, vary(pick(slate, r), .04, r)); }
  for (let i = 0; i < 24; i++) f.block(-hw + .5 + i * .5, 13, -d / 2, .06, .4, .06, C.iron);
  for (const s of [-1, 1]) {
    const tx = s * (hw + .4);
    for (let k = 0; k < 16; k++) f.block(tx, k * .8, -d / 2, 2.6, .8, 2.6, vary(pick(wall, r), .03, r));
    for (let k = 0; k < 4; k++) for (const [dx, dz, ww, dd] of [[1.32, 0, .06, .7], [-1.32, 0, .06, .7], [0, 1.32, .7, .06]]) f.block(tx + dx, 1.4 + k * 3, -d / 2 + dz, ww, 1.3, dd, k % 2 ? red : 0xffb06a, true);
    for (let k = 0; k < 9; k++) f.block(tx, 12.8 + k * .6, -d / 2, 2.8 - k * .3, .6, 2.8 - k * .3, vary(pick(slate, r), .04, r));
    f.block(tx, 18.2, -d / 2, .12, 1.2, .12, C.iron); f.block(tx + .3, 19, -d / 2, .5, .3, .04, 0xa8172c);
  }
  for (let k = 0; k < 6; k++) { const rr = 2 * Math.cos(k / 6 * Math.PI / 2), y = 9.2 + Math.sin(k / 6 * Math.PI / 2) * 1.8; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; f.block(-2 + Math.cos(a) * rr, y, -d * .7 + Math.sin(a) * rr, .5, .32, .5, k % 2 ? C.brass : 0xa87a3a); } }
  f.block(-2 + .9, 10.6, -d * .7 + .6, 1.6, .3, .3, C.brass);
  for (const cx of [-1, 3.5]) { for (let k = 0; k < 7; k++) f.block(cx, 9.6 + k * .4, -d * .3, .9, .4, .9, vary(pick(C.brick, r), .05, r)); f.block(cx, 12.4, -d * .3, 1.05, .14, 1.05, 0x5a4a62); f.mark?.("smoke", cx, 12.54, -d * .3); }
}
// A marsh hut on stilts with a lit window, a ladder and a lantern on a pole.
export function stiltHut(f, r = seeded(101)) {
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) f.block(x, -1.4, z, .18, 2.6, .18, C.timber);
  f.block(0, 1.2, 0, 2.6, .14, 2.6, C.wood); f.block(0, 1.34, 0, 2, 1.7, 2, 0x6a5444); for (let k = 0; k < 5; k++) f.block(0, 3 + k * .26, 0, 2.6 - k * .5, .26, 2.6 - k * .5, vary(0x4a5a3a, .08, r));
  f.block(0, 1.7, 1.02, .6, .6, .05, C.window, true); f.block(-.5, 1.34, 1.02, .5, 1.1, .05, 0x3a2a24);
  for (let k = 0; k < 6; k++) f.block(1.5, -.2 + k * .25, 1.4, .5, .05, .1, C.wood); for (const s of [-1, 1]) f.block(1.5 + s * .22, -.3, 1.4, .05, 1.6, .05, C.wood);
  f.block(-1.6, -1, -1.2, .1, 3.8, .1, C.timber); lantern(f, -1.6, 2.8, -1.2, .7);
}

// The Velvet Bat: an old gothic tavern kept by a vampire. Dark stone in courses
// with stepped buttresses, tall pointed windows and a rose window glowing red,
// a steep slate roof with iron cresting and gargoyles, a belfry tower with a
// spire and a bat for a weathervane, a bat sign on an iron bracket, a candlelit
// terrace behind railings and a crypt stair at its side. Its front is local +z.
export function velvetBat(f, r = seeded(131)) {
  const W = 14, D = 12, hw = W / 2, g = 3.4, u = 3, top = .5 + g + u;
  const stone = [0x3a3444, 0x433c4e, 0x352f40, 0x4a4256], trim = [0x6a6276, 0x5e566a], slate = [0x24202e, 0x2a2536, 0x201c28], red = 0xa8122a, red2 = 0xd84a26;
  // Plinth and walls in courses of dark stone, each course offset from the last.
  for (const [z, face] of [[0, 1], [-D, -1]]) for (let x = -hw; x < hw; x += .7) f.block(x + .35, 0, z + face * .05, .7, .5, .3, vary(pick(trim, r), .05, r));
  for (let y = .5, k = 0; y < top; y += .42, k++) for (let x = -hw + (k % 2) * .45; x < hw - .05; x += .9) { const w = Math.min(.9, hw - x); for (const z of [0, -D]) f.block(x + w / 2, y, z, w - .03, .4, .22, vary(pick(stone, r), .06, r)); }
  for (const sx of [-1, 1]) for (let y = .5, k = 0; y < top; y += .42, k++) for (let z = -(k % 2) * .45; z > -D + .05; z -= .9) { const d = Math.min(.9, z + D); f.block(sx * hw, y, z - d / 2, .22, .4, d - .03, vary(pick(stone, r), .06, r)); }
  f.block(0, .5, -D / 2, W - .3, top - .5, D - .3, 0x2a2532);
  for (const y of [.5 + g, top]) { f.block(0, y - .12, .1, W + .2, .2, .2, pick(trim, r)); f.block(0, y - .12, -D - .1, W + .2, .2, .2, pick(trim, r)); for (const sx of [-1, 1]) f.block(sx * (hw + .1), y - .12, -D / 2, .2, .2, D + .2, pick(trim, r)); }
  // Stepped buttresses beside the door and at the corners.
  for (const bx of [-hw, -1.7, 1.7, hw]) for (let k = 0; k < 4; k++) { const depth = .9 - k * .2; f.block(bx, k * 1.6, .1 + depth / 2, .7 - k * .05, 1.6, depth, vary(pick(trim, r), .05, r)); f.block(bx, k * 1.6 + 1.5, .1 + depth / 2, .76 - k * .05, .12, depth + .06, trim[0]); }
  // A pointed window: stepped glass narrowing to a point, lead lines, a stone frame and sill.
  const pointed = (x, y, z, w, h, face = 1) => {
    const rows = Math.round(h / .2);
    for (let i = 0; i < rows; i++) { const t = i / rows, half = t < .62 ? w / 2 : w / 2 * Math.cos((t - .62) / .38 * Math.PI / 2); if (half < .05) break; f.block(x, y + i * .2, z + face * .13, half * 2, .2, .05, i % 4 === 3 ? 0x2a1a20 : (i + Math.round(x)) % 3 ? red : red2, i % 4 !== 3); f.block(x - half - .08, y + i * .2, z + face * .15, .14, .2, .08, trim[0]); f.block(x + half + .08, y + i * .2, z + face * .15, .14, .2, .08, trim[0]); }
    f.block(x, y, z + face * .17, .05, h * .7, .04, 0x1a1418); f.block(x, y - .12, z + face * .2, w + .4, .12, .26, trim[1]);
    f.block(x, y + h + .02, z + face * .16, .16, .16, .08, trim[0]);
  };
  for (const x of [-4.4, 4.4]) { pointed(x, 1.1, 0, 1.5, 2.4); pointed(x, .5 + g + .5, 0, 1.2, 1.9); }
  for (const z of [-3, -6.5, -10]) for (const sx of [-1, 1]) { f.block(sx * (hw + .13), 1.2, z, .05, 2.2, 1.1, red, true); f.block(sx * (hw + .16), 1.2, z, .04, 2.2, .06, 0x1a1418); f.block(sx * (hw + .13), .5 + g + .5, z, .05, 1.7, .9, red2, true); f.block(sx * (hw + .16), 1.05, z, .2, .12, 1.3, trim[1]); for (const y of [1.2, .5 + g + .5]) for (const e of [-1, 1]) f.block(sx * (hw + .15), y, z + e * .6, .08, y < 2 ? 2.2 : 1.7, .12, trim[0]); }
  // The great door: a pointed arch of stone, two leaves of oxblood oak strapped with iron, a glow at the crack, steps and lanterns.
  for (let i = 0; i < 18; i++) { const t = i / 17, half = t < .6 ? 1.15 : 1.15 * Math.cos((t - .6) / .4 * Math.PI / 2); f.block(0, .5 + i * .19, .12, half * 2, .19, .06, 0x4a1420); f.block(-half - .12, .5 + i * .19, .16, .24, .19, .14, trim[0]); f.block(half + .12, .5 + i * .19, .16, .24, .19, .14, trim[0]); }
  f.block(0, .5, .16, .05, 3.2, .05, 0xff8a4a, true); for (const y of [1, 1.9, 2.7]) for (const s of [-1, 1]) f.block(s * .55, .5 + y, .17, .9, .08, .03, 0x1a1418); for (const s of [-1, 1]) f.block(s * .35, 1.9, .2, .1, .1, .05, C.gold);
  for (let k = 0; k < 3; k++) f.block(0, k * .17, .6 + (2 - k) * .3, 3.4 - k * .3, .17, .32, vary(pick(trim, r), .04, r));
  for (const s of [-1, 1]) lantern(f, s * 1.45, 2.4, .5, 1);
  // The front gable with its rose window, rising above the door.
  for (let i = 0; i < 16; i++) { const t = i / 16, half = (1 - t) * 3; f.block(0, top + i * .32, 0, half * 2, .32, .3, vary(pick(stone, r), .06, r)); }
  for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; f.block(Math.cos(a) * .95, top + 1.6 + Math.sin(a) * .95, .17, .26, .26, .06, trim[0]); }
  for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) { const x = (i - 4) * .2, y = (j - 4) * .2, d = Math.hypot(x, y); if (d > .82) continue; f.block(x, top + 1.6 + y, .15, .19, .19, .04, d < .2 ? 0xffb84a : (Math.round(Math.atan2(y, x) * 2.6) % 2 ? red : 0x8a3ab0), true); }
  // The roof: steep courses of dark slate, iron cresting on the ridge, dormers and gargoyles.
  const rise = 5.2, steps = 14, eave = .5;
  for (let i = 0; i < steps; i++) { const t = i / steps, y = top + t * rise, z0 = (1 - t) * (D / 2 + eave), z1 = (1 - (i + 1) / steps) * (D / 2 + eave); for (const side of [-1, 1]) { const zc = -D / 2 + side * (z0 + z1) / 2; f.block(0, y - .02, zc, W + eave * 2, rise / steps, z0 - z1 + .06, 0x15121a); const n = Math.round((W + eave * 2) / .5); for (let k = 0; k < n; k++) f.block(-hw - eave + (k + .5) * (W + eave * 2) / n, y + .02, zc, (W + eave * 2) / n - .05, rise / steps + .03, z0 - z1 + .1, vary(pick(slate, r), .07, r)); } }
  for (const sx of [-1, 1]) for (let i = 0; i < steps; i++) { const t = i / steps, half = (1 - t) * (D / 2); if (half < .1) break; f.block(sx * hw, top + t * rise, -D / 2, .24, rise / steps + .02, half * 2, vary(pick(stone, r), .05, r)); }
  f.block(0, top + rise, -D / 2, W + 1, .2, .3, 0x1a1418); for (let i = 0; i <= 28; i++) { const x = -hw - .3 + i * (W + .6) / 28; f.block(x, top + rise + .2, -D / 2, .05, .4 + (i % 2) * .2, .05, 0x1a1418); if (i % 4 === 0) f.block(x, top + rise + .62, -D / 2, .12, .12, .12, C.gold); }
  for (const sx of [-1, 1]) { f.block(sx * (hw + .2), top + rise - .2, -D / 2, .3, 2.2, .3, 0x1a1418); f.block(sx * (hw + .2), top + rise + 2, -D / 2, .16, .5, .16, C.gold); }
  for (const dx of [-4.4, 4.4]) { const b = top + 1.4, dz = -1.6; f.block(dx, b, dz, 1.4, 1.6, 1.2, vary(pick(stone, r), .05, r)); pointed(dx, b + .3, dz + .6, .56, 1.0); for (let i = 0; i < 6; i++) for (const s of [-1, 1]) f.block(dx + s * (.8 - i * .14), b + 1.6 + i * .2, dz, .3, .2, 1.4, vary(pick(slate, r), .06, r)); f.block(dx, b + 2.8, dz, .06, .5, .06, 0x1a1418); }
  const gargoyle = (x, y, z, face) => { f.block(x, y, z, .5, .4, .7, trim[1]); f.block(x, y + .3, z + face * .4, .32, .3, .3, trim[0]); for (const s of [-1, 1]) f.block(x + s * .32, y + .3, z - face * .05, .3, .4, .1, trim[1]); f.block(x - .07, y + .45, z + face * .56, .05, .05, .02, 0xff3a2a, true); f.block(x + .07, y + .45, z + face * .56, .05, .05, .02, 0xff3a2a, true); };
  for (const sx of [-1, 1]) { gargoyle(sx * (hw + .1), top - .1, .5, 1); gargoyle(sx * (hw + .1), top - .1, -D - .5, -1); }
  // Tall chimneys of dark brick with clay pots.
  for (const cx of [-hw + 1.6, hw - 3.6]) { for (let k = 0; k < 14; k++) f.block(cx, top + 1 + k * .32, -D * .62, .9, .3, .9, vary(pick([0x4a2a2a, 0x3e2424, 0x552e2e], r), .06, r)); f.block(cx, top + 5.5, -D * .62, 1.1, .16, 1.1, trim[0]); for (const s of [-1, 1]) f.block(cx + s * .2, top + 5.66, -D * .62, .24, .4, .24, 0x8a4a3a); f.mark?.("smoke", cx, top + 6.06, -D * .62); }
  // The belfry tower at the front right: windows like slits, open arches with a bell, an eight-sided spire and a bat on top.
  const tx = hw + 1.4, tz = -2.2, th = 12;
  for (let y = 0, k = 0; y < th; y += .45, k++) for (const [dx, dz, w, d] of [[0, 1.6, 3.2, .24], [0, -1.6, 3.2, .24], [1.6, 0, .24, 3.2], [-1.6, 0, .24, 3.2]]) f.block(tx + dx, y, tz + dz, w + (k % 2) * .06, .43, d + (k % 2) * .06, vary(pick(stone, r), .06, r));
  f.block(tx, 0, tz, 3, th, 3, 0x2a2532);
  for (const y of [2.6, 5.6]) for (const [dx, dz, w, d] of [[0, 1.66, .3, .05], [1.66, 0, .05, .3]]) f.block(tx + dx, y, tz + dz, w, 1.2, d, red, true);
  for (const [dx, dz, w, d] of [[0, 1.68, 1.4, .06], [0, -1.68, 1.4, .06], [1.68, 0, .06, 1.4], [-1.68, 0, .06, 1.4]]) { f.block(tx + dx, th - 2.4, tz + dz, w, 1.8, d, 0x0e0c12); }
  f.block(tx, th - 2.2, tz, .9, .9, .9, C.brass); f.block(tx, th - 1.3, tz, .14, .4, .14, 0x1a1418);
  f.block(tx, th, tz, 3.6, .3, 3.6, trim[0]); for (const [dx, dz] of [[1.6, 1.6], [-1.6, 1.6], [1.6, -1.6], [-1.6, -1.6]]) { f.block(tx + dx, th + .3, tz + dz, .4, .9, .4, trim[1]); f.block(tx + dx, th + 1.2, tz + dz, .14, .5, .14, trim[0]); }
  for (let k = 0; k < 12; k++) { const w = 3 - k * .24; f.block(tx, th + .3 + k * .45, tz, w, .45, w * .72, vary(pick(slate, r), .05, r)); f.block(tx, th + .3 + k * .45, tz, w * .72, .45, w, vary(pick(slate, r), .05, r)); }
  f.block(tx, th + 5.7, tz, .1, 1.2, .1, 0x1a1418); for (const s of [-1, 1]) { f.block(tx + s * .35, th + 6.7, tz, .55, .3, .05, 0x1a1418); f.block(tx + s * .62, th + 6.55, tz, .25, .2, .05, 0x1a1418); }
  for (const s of [-1, 1]) lantern(f, s * hw, 2.9, 1.15, .85);
  lantern(f, tx, 2.6, tz + 1.85, .8);
  // The bat sign on its iron bracket, gilded at the edge, red-eyed.
  f.block(-2.6, 3.3, .7, .08, .08, 1.3, 0x1a1418); f.block(-2.6, 2.95, .2, .06, .4, .06, 0x1a1418);
  { const sx = -2.6, sy = 2.35, sz = 1.25; f.block(sx, sy, sz, .1, .7, .3, 0x15121a); for (const s of [-1, 1]) { f.block(sx, sy + .2, sz + s * .45, .08, .45, .6, 0x15121a); f.block(sx, sy + .05, sz + s * .8, .08, .3, .3, 0x15121a); f.block(sx, sy + .65, sz + s * .3, .1, .05, .5, C.gold); } f.block(sx, sy + .5, sz + .07, .11, .06, .05, 0xff3a2a, true); f.block(sx, sy + .5, sz - .07, .11, .06, .05, 0xff3a2a, true); for (const s of [-1, 1]) f.block(sx, sy + .74, sz + s * .1, .06, .12, .05, 0x15121a); }
  // Little bats roosting over the ground-floor windows.
  for (const x of [-4.4, 4.4]) { const y = 3.95; f.block(x, y, .3, .14, .14, .1, 0x15121a); for (const s of [-1, 1]) f.block(x + s * .18, y + .02, .3, .22, .1, .05, 0x15121a); }
  // Ivy up the left side.
  for (let i = 0; i < 26; i++) f.block(-hw - .1, .5 + (i % 13) * .48, -1 - (i / 13 | 0) * 4 - r() * 2, .12, .45, .5 + r() * .4, vary(C.hedge[i % 2], .12, r));
  // The terrace: railings and lit piers along the front, tables with red cloths and candles, a red carpet, barrels and a coffin bench.
  for (const s of [-1, 1]) { railing(f, s * 1.6, 5.2, s * 7, 5.2, 1.1); brickPier(f, s * 7, 5.2, 1.5, r, "lamp"); brickPier(f, s * 1.6, 5.2, 1.6, r, "lamp"); }
  for (let z = .9; z < 5.2; z += .4) f.block(0, .02, z, 1.6, .03, .4, 0x7a1424);
  for (const [x, z] of [[-4.6, 2.2], [-4.6, 4], [4.6, 2.2], [4.6, 4]]) { f.block(x, 0, z, .14, .72, .14, 0x1a1418); f.block(x, .72, z, 1.3, .06, 1, 0x2a1a20); f.block(x, .66, z, 1.36, .06, 1.06, 0x8a1428); f.block(x, .78, z, .1, .3, .1, 0xf0e6d8); f.block(x, 1.08, z, .05, .08, .05, 0xffb347, true); for (const s of [-1, 1]) { f.block(x + s * .85, 0, z, .44, .45, .44, 0x2a1a20); f.block(x + s * 1.02, .45, z, .08, .62, .44, 0x2a1a20); } }
  for (const [x, z] of [[-6.4, .8], [-5.8, .8], [6.4, .8]]) { f.block(x, 0, z, .62, .8, .62, 0x5a3a2a); for (const y of [.15, .6]) f.block(x, y, z, .66, .06, .66, 0x1a1418); }
  f.block(-2.6, 0, 4.2, 1.8, .5, .7, 0x2a1a20); f.block(-2.6, .5, 4.2, 1.9, .08, .76, 0x3a2430); f.block(-2.6, .2, 4.56, .3, .3, .02, C.gold);
  // The crypt stair at the left side: steps down behind an iron gate, candles either side.
  for (let k = 0; k < 4; k++) f.block(-hw - 1.4, -k * .28, -7 - k * .5, 1.6, .2, .5, vary(pick(trim, r), .05, r));
  for (const s of [-1, 1]) { f.block(-hw - 1.4 + s * .95, 0, -7.6, .3, 1.4, 2.4, vary(pick(stone, r), .05, r)); f.block(-hw - 1.4 + s * .95, 1.4, -6.6, .1, .2, .1, 0xf0e6d8); f.block(-hw - 1.4 + s * .95, 1.6, -6.6, .06, .1, .06, 0xffb347, true); }
  for (let i = 0; i < 6; i++) f.block(-hw - 2 + i * .24, 0, -6.4, .04, 1.3, .04, 0x1a1418);
}
