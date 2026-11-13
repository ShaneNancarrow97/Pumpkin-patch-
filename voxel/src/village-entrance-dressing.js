// The original Green entrance, dressed on the native design grid. Nothing here
// spreads or scales its coordinates: buildGreen supplies its ground writer and
// the scene applies PLAN_SCALE once. Low masonry stays inside the old piers;
// planting is soft detail outside the six-unit arrival road.
import { seeded, vary } from "./voxels.js";
import { C, shade, canopyTree, lantern, mothRelief } from "./village-models.js";

export const VILLAGE_ENTRANCE_BUDGET = Object.freeze({ boxes: 1500, lights: 0, textureBytes: 0 });
export const VILLAGE_FORECOURT_BUDGET = Object.freeze({ boxes: 700, lights: 0, maxHeight: .7 });
export const VILLAGE_ENTRANCE_PLANTING = Object.freeze([
  Object.freeze({ x0: 50.8, z0: 2.7, x1: 53.5, z1: 5.8 }),
  Object.freeze({ x0: 62.5, z0: 2.7, x1: 65.1, z1: 5.8 }),
]);
export const VILLAGE_FORECOURT_AREAS = Object.freeze([
  Object.freeze({ x0: 49.4, z0: -14, x1: 54.8, z1: 0 }),
  Object.freeze({ x0: 61.2, z0: -14, x1: 66.8, z1: 0 }),
]);

function banner(f, x, z, side) {
  const face = z + side * .574;
  // Four narrow folds, gold selvedges and a notched hem, rather than one slab.
  for (let i = 0; i < 4; i++) f.block(x - .3 + i * .2, 1.05 + (i % 2) * .045, face, .2, 1.76, .035, [0x32182e, 0x482039, 0x562741, 0x3b1b33][i]);
  for (const s of [-1, 1]) f.block(x + s * .4, 1.1, face + side * .023, .026, 1.7, .025, C.gold);
  f.block(x, 2.82, face, .94, .045, .07, C.brass);
  for (let i = 0; i < 5; i++) f.block(x - .32 + i * .16, 1.035 + (i % 2) * .045, face + side * .025, .13, .035, .025, C.gold);
  // mothRelief has a local front; mirror its shallow relief onto either face.
  mothRelief({ block(bx, y, bz, w, h, d, c, g) { f.block(bx, y, face - side * bz, w, h, d, c, g); } }, x, 1.58, -.04, .48, C.gold);
}

function pier(f, x, z, r) {
  f.block(x, 0, z, 1.4, .22, 1.4, C.stone[2]);
  f.block(x, .22, z, 1.28, .10, 1.28, C.stone[3]);
  f.block(x, .32, z, 1.04, 2.84, 1.04, 0x9c9285);
  // Shallow individually coloured ashlar faces retain the original 1.12 shaft.
  for (let row = 0; row < 6; row++) for (const side of [-1, 1]) {
    const y = .34 + row * .47;
    for (let col = 0; col < 3; col++) f.block(x - .365 + col * .365, y, z + side * .545, .35, .44, .03, vary(C.stone[(row + col) % 4], .035, r));
    for (let col = 0; col < 2; col++) f.block(x + side * .545, y, z - .27 + col * .54, .03, .44, .52, vary(C.stone[(row + col + 1) % 4], .035, r));
  }
  for (const [y, w, h, c] of [[3.16, 1.18, .09, C.stone[1]], [3.25, 1.36, .13, C.stone[3]], [3.38, 1.14, .1, C.stone[0]]]) f.block(x, y, z, w, h, w, c);
  for (const side of [-1, 1]) for (const dx of [-.42, -.14, .14, .42]) f.block(x + dx, 3.12, z + side * .575, .12, .12, .13, C.stone[3]);
  // A stone riser actually carries the arch's spring; its brass moth stays in
  // the old crest envelope and reads against the warm crown.
  f.block(x, 3.48, z, .94, .88, .9, C.stone[1]);
  f.block(x, 4.36, z, 1.16, .1, 1.12, C.stone[3]);
  mothRelief(f, x, 3.48, z - .47, 1.05, C.brass);
  for (const side of [-1, 1]) banner(f, x, z, side);
  // Same front lantern anchor as the former pillar; the existing lamp pool is
  // still authoritative. These are small emissive panes, never new lights.
  f.block(x, 2.67, z - .68, .09, .08, .3, C.iron);
  lantern(f, x, 2.45, z - .7, .9);
  f.block(x, 2.53, z - .832, .02, .24, .025, C.brass);
  f.block(x, 2.65, z - .833, .21, .025, .025, C.brass);
  // Ivy climbs only the outside edge of each existing pier.
  const outside = x < 58 ? -1 : 1;
  for (let i = 0; i < 11; i++) {
    const y = .25 + i * .17, dx = outside * (.52 + Math.sin(i * 1.4) * .025);
    f.block(x + dx, y, z - .56, .025, .21, .025, 0x4e5735);
    f.block(x + dx + outside * (i % 2 ? .05 : -.035), y + .035, z - .584, .12, .095, .025, [0x465c36, 0x627345, 0x78814e][i % 3]);
  }
  for (let i = 0; i < 5; i++) f.block(x - .48 + i * .22, .23, z - .65, .18, .025, .1, [0x64724a, 0x7a8055][i % 2]);
}

function arch(f, r) {
  // Same spring line and span as the old iron arch. All stone is overhead;
  // short native segments cannot stretch across a spread-piece boundary.
  for (let i = 0; i <= 32; i++) {
    const a = i / 32 * Math.PI, x = 58 + Math.cos(a) * 4, y = 4.4 + Math.sin(a) * 1.1;
    f.block(x, y, .6, .45, .27, .4, vary(C.stone[i % 4], .025, r));
    f.block(x, y + .275, .6, .46, .065, .46, C.stone[3]);
    f.block(x, y + .04, .378, .43, .035, .025, C.brass);
  }
  // A plum cartouche and inset moth replace the former flat gold rectangle.
  f.block(58, 5.17, .33, 1.12, .54, .12, C.stone[3]);
  f.block(58, 5.22, .255, .97, .44, .035, C.plumDeep);
  for (const s of [-1, 1]) f.block(58 + s * .475, 5.22, .227, .025, .44, .025, C.gold);
  mothRelief(f, 58, 5.25, .21, .43, C.gold);
}

function fineFlower(f, x, z, kind, r) {
  const h = .18 + r() * .26, green = 0x667548;
  f.block(x, .015, z, .025, h, .025, green);
  f.block(x - .055, h * .4, z, .105, .035, .045, green);
  if (kind === 0) {
    // Ivory asters, a fine ochre eye and slender crossed petals.
    f.block(x, h, z, .22, .035, .065, 0xe8dcb9);
    f.block(x, h, z, .065, .035, .22, 0xf4e6c5);
    f.block(x, h + .035, z, .07, .035, .07, 0xc49a45);
  } else if (kind === 1) {
    // Tall dusty lavender spires among the warm trees.
    for (let i = 0; i < 3; i++) f.block(x + (i % 2) * .035, h + i * .065, z, .11 - i * .02, .06, .1 - i * .02, [0x806b8b, 0x9c80a1, 0xb29aac][i]);
  } else {
    f.block(x, h, z, .19, .065, .17, 0xbd6c32);
    f.block(x, h + .065, z, .13, .035, .12, 0xdda34b);
    f.block(x, h + .1, z, .055, .025, .05, 0x77532c);
  }
}

export function villageEntrance(f) {
  const r = seeded(75401);
  pier(f, 54, .6, r); pier(f, 62, .6, r); arch(f, r);
  for (const area of VILLAGE_ENTRANCE_PLANTING) {
    for (let i = 0; i < 23; i++) {
      const x = area.x0 + .15 + r() * (area.x1 - area.x0 - .3), z = area.z0 + .15 + r() * (area.z1 - area.z0 - .3);
      if (Math.hypot(x - (x < 58 ? 52.2 : 63.8), z - 4) < .6) continue;
      fineFlower(f, x, z, i % 3, r);
    }
    // Tiny flat fallen leaves, never a broad new terrain or paving surface.
    for (let i = 0; i < 27; i++) {
      const x = area.x0 + .15 + r() * (area.x1 - area.x0 - .3), z = area.z0 + .15 + r() * (area.z1 - area.z0 - .3), wide = i % 2 === 0;
      f.block(x, .012, z, wide ? .17 : .075, .018, wide ? .075 : .17, [0xa85c32, 0xc48a3c, 0x774137, 0xd3a454][i % 4]);
    }
  }
  villageForecourt(f);
}

// Soft, irregular islands fill the nearfield seen on the approach. The forage
// cross-path at z=-11 remains open across both sides; nothing here becomes a
// new hedge, raised bed or collision surface. A separate seed keeps the gate
// and every existing village random draw unchanged.
export function villageForecourt(f) {
  const r = seeded(75402), moss = [0x536348, 0x6c7951, 0x455944, 0x78845a];
  const clusters = [
    [52.6, -13.2, 1.5, .3], [51.8, -8, 1.65, .9], [53, -4.65, 1.25, 1.7], [52.4, -1.15, 1.6, .75],
    [63.7, -13.2, 1.5, .3], [64.5, -8, 1.65, .9], [62.9, -4.65, 1.15, 1.7], [64, -1.15, 1.65, .75],
  ];
  const point = (x, z, rx, rz, i, n, inset = .7) => {
    const a = i * 2.399963 + r() * .35, d = Math.sqrt((i + .35) / n) * inset;
    return [x + Math.cos(a) * rx * d, z + Math.sin(a) * rz * d];
  };
  for (const [x, z, rx, rz] of clusters) {
    const pads = [];
    // Overlapping low, uneven moss cushions leave broken earth edges, with no
    // rectangular bed outline. Each is small and confined to this flat meadow.
    for (let i = 0; i < 13; i++) {
      const [px, pz] = point(x, z, rx, rz, i, 13);
      const w = .7 + r() * .45, h = .035 + r() * .025, d = .45 + r() * .4;
      pads.push({ x: px, z: pz, w, d, top: .008 + h });
      f.block(px, .008, pz, w, h, d, vary(moss[i % 4], .06, r));
    }
    for (let i = 0; i < 8; i++) {
      const [px, pz] = point(x, z, rx, rz, i, 8), green = moss[(i + 1) % 4];
      // Small sage/thyme rosettes spread sideways, below a walking boot.
      f.block(px, .06, pz, .4, .05, .13, green);
      f.block(px, .08, pz, .13, .05, .38, shade(green, 1.1));
      f.block(px + .12, .12, pz + .09, .19, .045, .16, shade(green, 1.17));
      f.block(px - .1, .11, pz - .07, .18, .04, .14, shade(green, .9));
    }
    for (let i = 0; i < 4; i++) {
      const [px, pz] = point(x, z, rx, rz, i, 4, .65);
      fineFlower(f, px, pz, i % 3, r);
    }
    for (let i = 0; i < 9; i++) {
      const [px, pz] = point(x, z, rx, rz, i, 9, .9);
      const top = pads.reduce((height, p) => Math.abs(px - p.x) < p.w / 2 && Math.abs(pz - p.z) < p.d / 2 ? Math.max(height, p.top) : height, 0);
      f.block(px, top + .008, pz, i % 2 ? .18 : .08, .018, i % 2 ? .08 : .18, [0xb37b3d, 0xd3a250, 0x89523b][i % 3]);
    }
    for (let i = 0; i < 2; i++) {
      const [px, pz] = point(x, z, rx, rz, i, 2, .55);
      f.block(px, .015, pz, .3, .08, .24, C.stoneDark[i]);
      f.block(px - .04, .095, pz - .035, .17, .025, .13, moss[i]);
      f.block(px + .08, .09, pz + .05, .08, .025, .07, moss[i + 1]);
    }
  }
}

// Preserve every original leaf/trunk box and every random draw. Position-based
// colour gives the two existing crowns copper/gold tips and deep wine hollows
// without changing their silhouette, clearance or the following world's seed.
export function entranceAutumnTree(f, x, z, size, r) {
  const cell = .3 * size;
  canopyTree({ block(bx, y, bz, w, h, d, c, g) {
    if (Math.abs(w - cell * 1.02) < 1e-9 && Math.abs(h - cell * .92) < 1e-9 && Math.abs(d - w) < 1e-9) {
      const fleck = Math.abs(Math.sin(bx * 19.71 + y * 37.17 + bz * 11.13)), high = y > 4.05 * size;
      const base = high ? (fleck > .38 ? 0xd9a34a : 0xb87b35) : y > 2.65 * size ? (fleck > .42 ? 0xbd6231 : 0x9e4932) : (fleck > .35 ? 0x823c36 : 0x66303b);
      c = shade(base, .86 + fleck * .22 + (x - bx) * .025);
    }
    f.block(bx, y, bz, w, h, d, c, g);
  } }, x, z, size, r, C.crimson, { cell: .3 });
}
