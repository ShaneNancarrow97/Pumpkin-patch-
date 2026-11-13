// Small, inhabited places link the Green's homes to Moonclock Square. They are
// drawn on the spread design grid, so the view only applies PLAN_SCALE once.
import { Voxels, seeded, vary } from "./voxels.js";
import { C, shade, frame, flower, hedge, lantern, parkBench, pumpkin, mothRelief } from "./village-models.js";
import { groundHeight } from "./village-terrain.js";

const pick = (a, r) => a[(r() * a.length) | 0];
const MOON = [0xe9dfdb, 0xc3b5d7, 0xa28ac2, 0xf2e6b8];
const HERBS = [0x6f9360, 0x7d9b65, 0x567d56, 0x94a777];
const PATH = [0x9b8a6b, 0xa49372, 0x93846b, 0xaf9e7e];
const seedFor = (id) => [...String(id)].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 1641);
const lift = (f, y) => ({ block(x, by, z, w, h, d, c, g) { f.block(x, by + y, z, w, h, d, c, g); return this; } });
const ground = (v) => ({ block(x, y, z, w, h, d, c, g) { v.block(x, y + groundHeight(x, z), -z, w, h, d, c, g); return this; } });

// Gravel tiles follow the ground, with one tile per cell even where paths meet.
// Their fine gaps keep all differently coloured top faces clear of each other.
function footpath(f, path, r, tiles) {
  const points = path.points ?? [], width = path.width ?? 1.5, step = .8, radius = Math.max(.3, width / 2 - .2);
  for (let j = 1; j < points.length; j++) {
    const [ax, az] = points[j - 1], [bx, bz] = points[j], dx = bx - ax, dz = bz - az, length2 = dx * dx + dz * dz;
    for (let ix = Math.floor((Math.min(ax, bx) - radius) / step); ix <= Math.ceil((Math.max(ax, bx) + radius) / step); ix++) for (let iz = Math.floor((Math.min(az, bz) - radius) / step); iz <= Math.ceil((Math.max(az, bz) + radius) / step); iz++) {
      const x = (ix + .5) * step, z = (iz + .5) * step, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (length2 || 1))), key = `${ix},${iz}`;
      if (tiles.has(key) || Math.hypot(x - ax - dx * t, z - az - dz * t) > radius) continue;
      tiles.add(key);
      f.block(x, .018, z, .79, .025, .79, pick(PATH, r));
      if (((ix * 3 + iz * 7) % 13 + 13) % 13 === 0) f.block(x, .045, z, .49, .025, .39, vary(C.stone[1], .1, r));
    }
  }
}

// A timber crate has slats, corner uprights and a dark open top; produce and
// supplies sit inside instead of balancing on a single coloured cube.
function crate(f, x, y, z, r, goods = "apples") {
  f.block(x, y, z, .7, .08, .58, C.wood);
  f.block(x, y + .08, z, .61, .27, .48, C.beam);
  for (const side of [-1, 1]) {
    for (const h of [.12, .29]) { f.block(x, y + h, z + side * .28, .7, .1, .055, vary(C.woodLight, .1, r)); f.block(x + side * .33, y + h, z, .055, .1, .52, C.wood); }
    for (const dz of [-.25, .25]) f.block(x + side * .31, y, z + dz, .065, .46, .065, C.woodLight);
  }
  for (let i = 0; i < 6; i++) {
    const px = x + (r() - .5) * .45, pz = z + (r() - .5) * .34;
    f.block(px, y + .27 + r() * .08, pz, .15, .15, .15, goods === "apples" ? pick(C.crimson, r) : goods === "herbs" ? pick(HERBS, r) : C.cream);
  }
}

// A galvanised watering can with a handle, long spout and perforated rose.
function wateringCan(f, x, y, z) {
  const metal = 0x7e9b99;
  f.block(x, y, z, .36, .35, .3, metal); f.block(x, y + .34, z, .31, .06, .27, 0xa8bbb0);
  f.block(x, y + .4, z, .18, .015, .14, C.iron);
  for (const dz of [-.19, .19]) f.block(x - .23, y + .1, z + dz * .6, .07, .3, .06, metal);
  f.block(x - .25, y + .37, z, .07, .06, .28, metal);
  f.block(x + .27, y + .16, z, .3, .09, .085, metal); f.block(x + .45, y + .24, z, .12, .14, .09, metal);
  f.block(x + .52, y + .34, z, .13, .06, .19, 0xa8bbb0);
}

// Low pots repeat the village's terracotta, with a rolled lip and a herb crown.
function herbPot(f, x, y, z, r, k = 1) {
  f.block(x, y, z, .32 * k, .08 * k, .32 * k, C.terracotta[2]);
  f.block(x, y + .07 * k, z, .39 * k, .29 * k, .39 * k, pick(C.terracotta, r));
  f.block(x, y + .33 * k, z, .46 * k, .09 * k, .46 * k, C.terracotta[1]);
  f.block(x, y + .4 * k, z, .34 * k, .025 * k, .34 * k, 0x4a3426);
  for (let i = 0; i < 5; i++) f.block(x + (r() - .5) * .3 * k, y + .42 * k, z + (r() - .5) * .3 * k, .16 * k, (.2 + r() * .2) * k, .16 * k, pick(HERBS, r));
}

// A garden bed has individual stone edging, mixed herbs and moonflowers, and a
// tiny written plant marker. The main cross between the beds stays open.
function plantedBed(f, x, z, w, d, r, moon, produce) {
  f.block(x, .035, z, w - .12, .12, d - .12, 0x4a392d);
  for (const side of [-1, 1]) {
    const nx = Math.ceil(w / .62), nz = Math.ceil(d / .62);
    for (let i = 0; i < nx; i++) f.block(x - w / 2 + (i + .5) * w / nx, 0, z + side * d / 2, w / nx - .035, .22, .23, vary(pick(C.stone, r), .07, r));
    for (let i = 0; i < nz; i++) f.block(x + side * w / 2, 0, z - d / 2 + (i + .5) * d / nz, .23, .22, d / nz - .035, vary(pick(C.stone, r), .07, r));
  }
  if (produce === "pumpkins") {
    for (let i = 0; i < 3; i++) {
      const px = x + (i - 1) * w * .28, pz = z + (i % 2 ? .15 : -.16) * d;
      pumpkin(lift(f, .15), px, pz, .64 + r() * .16, r, i === 2 ? "white" : "orange");
      f.block(px + .34, .17, pz, .7, .035, .065, HERBS[2]); f.block(px + .3, .19, pz + .15, .3, .045, .25, HERBS[1]);
    }
  }
  const count = produce === "pumpkins" ? 0 : Math.min(24, Math.round(w * d * 2));
  for (let i = 0; i < count; i++) {
    const px = x + (r() - .5) * (w - .6), pz = z + (r() - .5) * (d - .6);
    if (moon) flower(lift(f, .15), px, pz, pick(MOON, r), r, .9 + r() * .3);
    else {
      const h = .22 + r() * .3, c = pick(HERBS, r);
      f.block(px, .15, pz, .07, h, .07, 0x456344); f.block(px - .1, .2 + h * .4, pz, .22, .1, .12, c); f.block(px + .07, .25 + h * .6, pz, .13, .12, .23, shade(c, 1.12));
      if (i % 3 === 0) f.block(px, .15 + h, pz, .1, .14, .1, pick(MOON, r));
    }
  }
  f.block(x - w * .28, .15, z - d * .28, .035, .32, .035, C.woodLight); f.block(x - w * .28, .4, z - d * .28, .25, .13, .04, C.cream);
}

function garden(f, p, r) {
  const w = p.w ?? 10, d = p.d ?? 8, bw = (w - 2.6) / 2, bd = (d - 2.4) / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) plantedBed(f, sx * (bw / 2 + .6), sz * (bd / 2 + .55), bw, bd, r, sx === sz, sx !== sz ? p.produce : null);
  for (let i = -2; i <= 2; i++) f.block(0, .025, i * d / 5, .68, .06, .58, vary(C.stone[1], .06, r));
  // A working corner: spare terracotta, a seed tray, watering can and twine.
  herbPot(f, w / 2 - .55, 0, 0, r, .85); wateringCan(f, -w / 2 + .55, 0, .05);
  f.block(w / 2 - .6, 0, -.65, .52, .12, .4, C.wood); f.block(w / 2 - .6, .12, -.65, .42, .035, .3, 0x49382d);
  for (let i = 0; i < 4; i++) f.block(w / 2 - .75 + i * .1, .15, -.65, .05, .13, .09, HERBS[i]);
}

// Compact fruit trees keep their branches legible and their crowns below the
// landmark roofs. Layered lobes leave air between neighbouring trees.
function fruitTree(f, x, z, r, k = 1) {
  const wood = 0x63452e, palette = r() < .55 ? C.golden : C.leaves, h = 1.65 * k;
  f.block(x, 0, z, .36 * k, h, .36 * k, wood);
  for (const s of [-1, 1]) { f.block(x + s * .3 * k, h * .68, z, .62 * k, .16 * k, .18 * k, wood); f.block(x, h * .82, z + s * .3 * k, .16 * k, .16 * k, .65 * k, wood); }
  const lobes = [[0, .3, 0, 1.05], [-.68, 0, .1, .76], [.62, .07, -.12, .8], [.1, .05, .64, .73], [-.08, .1, -.61, .72]];
  for (const [dx, dy, dz, size] of lobes) for (const [level, width] of [[0, .65], [.33, 1], [.66, .86], [.92, .52]]) {
    const y = h + (dy + level * size) * k, s = size * width * k, c = vary(shade(pick(palette, r), .84 + level * .22), .08, r);
    f.block(x + dx * k, y, z + dz * k, s * 1.4, .37 * k, s, c);
    f.block(x + dx * k, y, z + dz * k, s, .37 * k, s * 1.4, shade(c, .96));
  }
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, px = x + Math.cos(a) * .92 * k, pz = z + Math.sin(a) * .92 * k;
    f.block(px, h + (.12 + r() * .6) * k, pz, .17 * k, .19 * k, .17 * k, pick(C.crimson, r));
    if (i % 2 === 0) f.block(px, .025, pz, .16, .11, .16, pick(C.crimson, r));
  }
  for (let i = 0; i < 8; i++) f.block(x + (r() - .5) * 2.5 * k, .012, z + (r() - .5) * 2.5 * k, .17 + r() * .12, .025, .15, pick(palette, r));
}

function orchard(f, p, r, G) {
  const w = p.w ?? 12, d = p.d ?? 9;
  const trees = p.trees ?? [{ x: -w * .3, z: -d * .24 }, { x: w * .3, z: -d * .24 }, { x: -w * .3, z: d * .24 }, { x: w * .3, z: d * .24 }];
  for (const t of trees) {
    if (p.trees) fruitTree(G, t.x, t.z, r, t.size ?? .9 + r() * .16);
    else fruitTree(f, t.x, t.z, r, t.size ?? .9 + r() * .16);
  }
  if (p.props === false) return;
  crate(f, -.4, 0, -d / 2 + .6, r); crate(f, .45, 0, -d / 2 + .65, r);
  // A wooden picking ladder rests on the ground between the trunks.
  for (const side of [-1, 1]) f.block(w / 2 - .6 + side * .25, .02, 0, .075, .08, 2.3, C.woodLight);
  for (let i = 0; i < 6; i++) f.block(w / 2 - .6, .04, -.95 + i * .38, .58, .07, .08, C.wood);
}

// Plank benches, a long shared table, cups and a bowl of pumpkins make the
// commons feel ready for supper. Both ends of the table remain open.
function picnicTable(f, x, z, r, length = 4.1) {
  for (const sx of [-1, 1]) {
    f.block(x + sx * (length / 2 - .45), 0, z, .14, .85, 1.8, C.beam);
    f.block(x + sx * (length / 2 - .45), .46, z, .18, .12, 2.65, C.wood);
  }
  for (const dz of [-.42, -.14, .14, .42]) f.block(x, .88, z + dz, length, .1, .25, vary(C.woodLight, .08, r));
  for (const side of [-1, 1]) for (const dz of [-.1, .1]) f.block(x, .48, z + side * 1.08 + dz, length + .15, .09, .18, vary(C.wood, .08, r));
  f.block(x, .99, z, 1.2, .025, 1.08, C.plumDeep); f.block(x, 1.02, z, .66, .06, .5, C.terracotta[1]);
  pumpkin(f, x - .15, z, .29, r, "gold", 1.08); pumpkin(f, x + .18, z + .04, .25, r, "white", 1.08);
  for (const [dx, dz] of [[-1.25, .15], [1.25, -.22]]) { f.block(x + dx, .99, z + dz, .19, .15, .19, C.cream); f.block(x + dx + .12, 1.03, z + dz, .1, .07, .09, C.cream); }
}

function pergola(f, p, r) {
  const w = Math.min(p.w ?? 10, 10), d = Math.min(p.d ?? 8, 8), px = w / 2 - .7, pz = d / 2 - .65, h = 3.15;
  if (p.roof === false) {
    picnicTable(f, 0, -.1, r, Math.min(4.6, w - 3));
    for (const side of [-1, 1]) herbPot(f, side * (w / 2 - .7), 0, -d / 2 + .7, r, 1.1);
    return;
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * px, z = sz * pz;
    f.block(x, 0, z, .52, .24, .52, C.stone[2]); f.block(x, .24, z, .24, h - .24, .24, C.timber); f.block(x, h - .2, z, .36, .22, .36, C.woodLight);
    f.block(x - sx * .2, h - .52, z, .55, .16, .2, C.wood); f.block(x, h - .52, z - sz * .2, .2, .16, .55, C.wood);
  }
  for (const sz of [-1, 1]) f.block(0, h, sz * pz, w, .23, .25, C.beam);
  for (let x = -px - .2; x <= px + .2; x += .68) { f.block(x, h + .23, 0, .16, .17, d, vary(C.woodLight, .05, r)); f.block(x, h + .19, -d / 2 + .125, .24, .12, .25, C.wood); f.block(x, h + .19, d / 2 - .125, .24, .12, .25, C.wood); }
  // A narrow cloth shade and trained vines leave the roof airy from above.
  f.block(0, h + .4, 0, w * .43, .045, d * .85, C.plumDeep);
  for (const x of [-w * .2, w * .2]) f.block(x, h + .43, 0, .055, .025, d * .85, C.gold);
  for (const sx of [-1, 1]) {
    for (let j = 0; j < 6; j++) f.block(sx * px, .55 + j * .35, -pz, .06, .4, .07, C.beam);
    for (let i = 0; i < 12; i++) {
      const x = sx * (px - r() * 1.4), z = -pz + (r() - .5) * .6, y = h + .3 + r() * .15;
      f.block(x, y, z, .38 + r() * .22, .13, .3 + r() * .25, pick(C.hedge, r));
      if (i % 4 === 0) f.block(x, y + .14, z, .16, .1, .15, pick(MOON, r));
    }
    lantern(f, sx * px, h - .8, pz, .85); f.block(sx * px, h - .26, pz, .04, .27, .04, C.iron);
    herbPot(f, sx * (px - .65), 0, -pz + .4, r, 1.05);
  }
  picnicTable(f, 0, -.1, r, Math.min(4.6, w - 3));
  // A moth-carved harvest board is held clear of the east and west approaches.
  f.block(0, h - .62, -pz, 1.5, .44, .08, C.plumDeep); mothRelief(f, 0, h - .66, -pz + .055, .42);
}

// A workbench, stocked log rack and wheelbarrow give Rowan's approach a useful
// outdoor yard, without adding a second building beside his workshop.
function workyard(f, p, r) {
  const w = p.w ?? 10, d = p.d ?? 7, back = -d / 2 + .65;
  for (const x of [-1.15, 1.15]) for (const z of [back - .35, back + .35]) f.block(x, 0, z, .13, 1.05, .13, C.beam);
  for (let i = 0; i < 4; i++) f.block(0, 1.05, back - .42 + i * .28, 2.9, .14, .25, vary(C.woodLight, .07, r));
  f.block(0, .28, back, 2.6, .09, .75, C.wood); crate(f, -.6, .37, back, r, "supplies");
  for (const x of [-1.35, 1.35]) f.block(x, 1.18, back - .5, .08, 1.0, .08, C.wood);
  for (let i = 0; i < 4; i++) f.block(0, 1.25 + i * .23, back - .52, 2.8, .14, .07, C.wood);
  for (const [x, head] of [[-.85, .32], [-.3, .22], [.3, .4], [.85, .26]]) {
    f.block(x, 1.38, back - .43, .055, .6, .06, C.woodLight); f.block(x + .06, 1.9, back - .42, head, .13, .1, 0xa3a4a0);
  }
  // Vice, timber offcut and curls of pale shavings.
  f.block(1.04, 1.19, back + .25, .3, .19, .3, C.iron); f.block(1.14, 1.19, back + .5, .12, .28, .12, 0x7b7c7c); f.block(1.14, 1.3, back + .57, .36, .045, .045, C.iron);
  f.block(-.3, 1.2, back, .9, .12, .25, C.cream);
  for (let i = 0; i < 8; i++) f.block((r() - .5) * 2, .025, back + .6 + r() * .75, .14, .035, .05, C.woodLight);
  const rx = -w / 2 + 1.25;
  for (const x of [rx - .85, rx + .85]) { f.block(x, 0, .25, .14, 1.4, .14, C.beam); f.block(x, .2, .25, .18, .14, 1.12, C.wood); }
  for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - (row === 2 ? 1 : 0); i++) {
    const x = rx - .62 + i * .59 + (row === 2 ? .3 : 0), y = .18 + row * .37;
    f.block(x, y, .25, .45, .33, 1.5, vary(C.timber, .09, r)); f.block(x, y + .04, 1.015, .34, .24, .025, 0xc49b68); f.block(x, y + .09, 1.035, .15, .12, .02, 0x916b43);
  }
  f.block(rx, 1.45, .25, 2.2, .14, 1.8, C.slate[0]);
  // The wheel is a square iron rim with a pale wooden hub, at voxel scale.
  const wx = w / 2 - 1.25, wz = .7;
  for (const dz of [-.23, .23]) f.block(wx + .6, .12 + (dz > 0 ? 0 : .46), wz, .48, .06, .13, C.iron);
  for (const dx of [-.23, .23]) f.block(wx + .6 + dx, .15, wz, .06, .46, .13, C.iron);
  f.block(wx + .6, .32, wz, .12, .12, .18, C.woodLight); f.block(wx, .53, wz, 1.25, .15, .8, 0x7c8b76);
  for (const side of [-1, 1]) { f.block(wx, .68, wz + side * .38, 1.15, .3, .07, 0x98a48a); f.block(wx - .85, .58, wz + side * .29, .85, .07, .07, C.wood); f.block(wx - .32, .1, wz + side * .28, .07, .45, .07, C.iron); }
  f.block(wx - .55, .68, wz, .07, .3, .7, 0x98a48a); f.block(wx + .55, .68, wz, .07, .3, .7, 0x98a48a);
  for (let i = 0; i < 4; i++) f.block(wx + (r() - .5) * .8, .69, wz + (r() - .5) * .5, .26, .15, .2, C.stoneDark[i % 3]);
  pumpkin(f, 1.2, 1, .48, r, "white"); lantern(f, 1.45, 0, 1.3, .75);
}

// Elowen's open-air book cupboard, a cushioned seat and potting shelf make a
// reading court that shares the conservatory's colours without another house.
function reading(f, p, r) {
  const w = p.w ?? 9, d = p.d ?? 7, z = -d / 2 + .65;
  parkBench(f, 0, .5, r);
  f.block(-.55, .56, .35, .7, .11, .48, C.plum); f.block(.43, .56, .35, .65, .11, .48, 0x80739b);
  f.block(-.2, .68, .52, .58, .035, .36, C.cream); f.block(-.2, .72, .52, .025, .025, .36, C.wood);
  // Roofed, front-open book cupboard with individual spines and brass labels.
  const bx = -w / 2 + 1;
  f.block(bx, 0, z, 1.5, .22, .82, C.stone[1]); f.block(bx, .22, z - .3, 1.35, 1.82, .1, C.wood);
  for (const s of [-1, 1]) f.block(bx + s * .65, .22, z, .1, 1.9, .7, C.woodLight);
  for (const y of [.3, .86, 1.43, 2.02]) f.block(bx, y, z, 1.4, .09, .75, C.woodLight);
  for (let shelf = 0; shelf < 3; shelf++) for (let i = 0; i < 7; i++) {
    const x = bx - .5 + i * .165, y = .39 + shelf * .56, h = .31 + r() * .14, c = pick([C.plum, C.teal[0], C.crimson[0], C.slate[1], C.woodLight], r);
    f.block(x, y, z + .11, .13, h, .35, c); f.block(x, y + .11, z + .292, .09, .035, .015, C.gold);
  }
  for (let i = 0; i < 3; i++) f.block(bx, 2.1 + i * .11, z, 1.72 - i * .25, .12, .95 - i * .18, C.slatePlum[i % 3]);
  // A compact potting shelf carries seed trays and labelled bottles.
  const tx = w / 2 - 1.25;
  for (const sx of [-1, 1]) f.block(tx + sx * .75, 0, z, .1, .9, .1, C.beam);
  f.block(tx, .86, z, 1.9, .12, .8, C.woodLight); f.block(tx, .27, z, 1.65, .1, .66, C.wood);
  for (const dx of [-.58, 0, .58]) herbPot(f, tx + dx, .98, z, r, .7);
  wateringCan(f, tx, .37, z); crate(f, tx - .35, 0, 1.8, r, "herbs");
  f.block(1.95, 0, .7, .64, .57, .64, C.stone[1]); f.block(1.95, .57, .7, .86, .1, .86, C.stone[3]); lantern(f, 1.95, .67, .7, .85);
}

// Meadow islands are low: seed heads, lilac flowers, pale mushrooms and leaves
// give the lawn a tended edge without replacing its walkable open ground.
function meadow(f, p, r) {
  const w = p.w ?? (p.r ?? 3) * 2, d = p.d ?? (p.r ?? 3) * 2, count = p.count ?? Math.min(70, Math.round(w * d * .6));
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2, radius = Math.sqrt(r()), x = Math.cos(a) * radius * w * .44, z = Math.sin(a) * radius * d * .44;
    if (i % 7 === 0) {
      f.block(x, 0, z, .06, .19, .06, C.cream); f.block(x, .18, z, .24, .075, .24, i % 2 ? 0xb9a9cd : 0xe2cfa5); f.block(x, .255, z, .15, .045, .15, C.cream);
    } else if (i % 3 === 0) {
      const h = .35 + r() * .36; f.block(x, 0, z, .045, h, .045, 0x87946a); f.block(x, h - .08, z, .12, .16, .1, 0xc8b98a);
      f.block(x - .1, h * .45, z, .2, .045, .09, HERBS[2]);
    } else flower(f, x, z, pick([C.violet[1], C.cream, C.golden[1], 0xb7a8cb], r), r, .7 + r() * .4);
  }
  for (let i = 0; i < 6; i++) f.block((r() - .5) * w * .8, .014, (r() - .5) * d * .8, .2, .025, .13, pick(C.leaves, r));
}

const BUILDERS = { garden, orchard, pergola, workyard, reading, meadow, path() {} };

// The view supplies only clusters clear of saved player decorations. Combining
// them here bounds the entire neighbourhood layer to three instanced draws.
export function buildVillageNeighbourhoods(selectedClusters = []) {
  const clusters = Array.isArray(selectedClusters) ? selectedClusters : selectedClusters.clusters ?? [], v = new Voxels(), G = ground(v), featureBoxes = {}, paths = [], pathTiles = new Set();
  for (let i = 0; i < clusters.length; i++) {
    const p = clusters[i], builder = BUILDERS[p.kind];
    if (!builder) continue;
    const r = seeded(p.seed ?? seedFor(p.id ?? p.kind)), before = v.solid.length + v.glow.length, x = p.x ?? 0, z = p.z ?? 0, f = frame(v, x, z, p.facing ?? "south", groundHeight(x, z));
    for (const path of p.paths ?? []) { footpath(G, path, r, pathTiles); paths.push(path); }
    builder(f, p, r, G);
    for (const h of p.hedges ?? []) hedge(G, h.x, h.z, h.w, h.d, h.h ?? .68, r);
    for (const l of p.lanterns ?? []) {
      G.block(l.x, 0, l.z, .45, .18, .45, C.stone[1]); G.block(l.x, .18, l.z, .1, 1.55, .1, C.iron); G.block(l.x, 1.55, l.z, .23, .08, .23, C.gold); lantern(G, l.x, 1.73, l.z, .88);
    }
    featureBoxes[p.id ?? `${p.kind}-${i}`] = v.solid.length + v.glow.length - before;
  }
  const group = v.build({ detailShadows: false, small: .3, glow: 1.6 }), boxes = v.solid.length + v.glow.length;
  group.name = "village neighbourhoods";
  group.userData.spread = "native";
  group.userData.activeIDs = clusters.filter(p => BUILDERS[p.kind]).map(p => p.id);
  group.userData.paths = paths;
  group.userData.obstacles = clusters.flatMap(p => p.solids ?? []);
  group.userData.featureBoxes = featureBoxes;
  group.userData.visualBudget = { boxes, meshes: group.children.length, addedLights: 0 };
  // All Voxels share their cube geometry; only these instances and materials
  // belong to this layer when the view rebuilds it around saved decorations.
  let disposed = false;
  group.userData.dispose = () => {
    if (disposed) return;
    disposed = true;
    const materials = new Set();
    group.traverse(mesh => {
      if (!mesh.isInstancedMesh) return;
      mesh.dispose();
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
    });
    for (const material of materials) material.dispose();
    group.clear();
  };
  return group;
}
