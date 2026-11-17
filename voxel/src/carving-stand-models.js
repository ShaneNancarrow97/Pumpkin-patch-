// The carving stand's voxel models (rules/carving-stand.js): the lanterns
// guests carve, at each stage and in each design, and the stand itself, a
// timber pavilion with a lantern wall, a long carving bench and its dressing.
// No DOM here except chalkboard(), which paints a canvas when called, so the
// farm (carving-stand-world.js) and the menu's art (ui/stand-art.js) can share
// every model.
import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { pumpkinBlock } from "./pumpkins.js";

// Each design's face, cut into the pumpkin's front: 13 columns by 9 rows,
// top row first; X is cut through. The menu shows these same lanterns.
export const LANTERN_FACES = Object.freeze({
  classic: ["..X.......X..", ".XXX.....XXX.", "XXXXX...XXXXX", ".............", "......X......", ".....XXX.....", "X...........X", "XXX.XXXXX.XXX", ".XXXX...XXXX."],
  spooky: ["XXX.......XXX", ".XXX.....XXX.", "..XX.....XX..", ".............", ".....X.X.....", ".............", "X.X.X.X.X.X.X", "XXXXXXXXXXXXX", ".X.X.X.X.X.X."],
  cat: ["..X.X........", "..XXX........", "..XXX.....X..", "...XXXX....X.", "...XXXXXX..X.", "...XXXXXXXXX.", "...XXXXXXX...", "...X.X..X.X..", "............."],
  bat: [".............", "X....X.X....X", "XX...XXX...XX", "XXX.XXXXX.XXX", "XXXXXXXXXXXXX", ".XXXXXXXXXXX.", "..X..XXX..X..", "......X......", "............."],
  ghost: [".....XXX.....", "....XXXXX....", "...XXXXXXX...", "...XX.X.XX...", "...XXXXXXX...", "...XXX.XXX...", "...XXXXXXX...", "...XXXXXXX...", "...X.X.X.X..."],
  castle: ["..........XX.", "......X...XX.", ".....XXX.....", "X.X..XXX..X.X", "XXX..XXX..XXX", "XXXXXXXXXXXXX", "XXXXX...XXXXX", "XXXXX...XXXXX", "XXXXXXXXXXXXX"],
});
const SKIN = 0xe2701e, GROOVE = 0xb4521a, FLESH = 0xf0b04c, DARK = 0x2a1408, STEM = 0x6a6428;
export const GLOW = Object.freeze({ candle: 0xffd36b, paint: 0x9dffb8 });

// Adds a lantern to `v` standing on (x, y, z), its face to the front (+z).
// stage: "whole" (uncut), "open" (lid off beside it, flesh showing), "carved"
// (face cut, dark), "lit" (face glowing). Columns of one colour merge into one
// box, so a lantern is a few hundred boxes.
export function addLantern(v, x, y, z, { design = "classic", stage = "lit", scale = 1, glow = GLOW.candle, seed = 1 } = {}) {
  const s = 0.04 * scale, RX = 8, RY = 6.2, RZ = 7.2, r = seeded(seed * 97 + 13), face = LANTERN_FACES[design] ?? LANTERN_FACES.classic;
  const cells = new Map(), key = (i, j, k) => `${i},${j},${k}`;
  const lobe = (a) => 1 - 0.08 * (1 - Math.cos(a * 8)) / 2;
  const lidOff = stage === "open" || stage === "carved";
  const KZ = Math.ceil(RZ), KY = Math.ceil(RY);
  for (let i = -RX; i < RX; i++) for (let k = -KZ; k < KZ; k++) {
    const xc = i + .5, zc = k + .5, a = Math.atan2(xc, zc), f = lobe(a), groove = (1 - Math.cos(a * 8)) / 2 > .78;
    const tint = vary(groove ? GROOVE : SKIN, .05, r);
    for (let j = -KY; j <= KY; j++) {
      const yc = j + .5, rr = Math.hypot(xc, zc);
      if ((xc / (RX * f)) ** 2 + (yc / RY) ** 2 + (zc / (RZ * f)) ** 2 > 1) continue;
      if (yc > RY * .8 && rr < 1.6) continue;                                             // the dimple round the stem
      if (lidOff && yc > RY * .6 && rr < RX * .55) continue;                             // the lid, lifted off
      cells.set(key(i, j, k), { c: lidOff && yc > RY * .42 && rr < RX * .55 ? FLESH : tint, glow: false });
    }
  }
  // The face: each cut cell goes two deep from the front, with the candle's
  // glow (or the dark inside) behind it, and the cut's own walls lit warm
  // (or darkened), so the face reads even small and without bloom.
  if (stage === "carved" || stage === "lit") {
    const lit = stage === "lit", paint = glow === GLOW.paint, cuts = new Map();
    face.forEach((row, rIx) => [...row].forEach((ch, cIx) => {
      if (ch !== "X") return;
      const i = cIx - 6, j = 3 - rIx;
      let front = null; for (let k = KZ; k >= -KZ; k--) if (cells.has(key(i, j, k))) { front = k; break; }
      if (front === null) return;
      cuts.set(`${i},${j}`, front);
      cells.delete(key(i, j, front)); cells.delete(key(i, j, front - 1));
      cells.set(key(i, j, front - 2), lit ? { c: paint ? 0xd8ffe4 : 0xfff0b4, glow: true } : { c: DARK, glow: false });
    }));
    for (const [ij, front] of cuts) {
      const [i, j] = ij.split(",").map(Number);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (cuts.has(`${i + di},${j + dj}`)) continue;
        for (const k of [front - 1, front]) { const wall = key(i + di, j + dj, k); if (cells.has(wall)) cells.set(wall, lit ? { c: paint ? 0x3fd47a : 0xff8f2e, glow: true } : { c: 0x6a3410, glow: false }); }
      }
    }
  }
  // Emit each column as runs of one colour.
  const cols = new Map();
  for (const [k3, cell] of cells) { const [i, j, k] = k3.split(",").map(Number), ck = `${i},${k}`; (cols.get(ck) ?? cols.set(ck, []).get(ck)).push([j, cell]); }
  // The lowest cell sits on y; the top is where the stem goes.
  let minJ = Infinity, maxJ = -Infinity; for (const k3 of cells.keys()) { const j = +k3.split(",")[1]; minJ = Math.min(minJ, j); maxJ = Math.max(maxJ, j); }
  const base = -minJ;
  for (const [ck, list] of cols) {
    const [i, k] = ck.split(",").map(Number); list.sort((p, q) => p[0] - q[0]);
    for (let n = 0; n < list.length;) {
      let m = n + 1; const [j0, c0] = list[n];
      while (m < list.length && list[m][0] === list[m - 1][0] + 1 && list[m][1].c === c0.c && list[m][1].glow === c0.glow) m++;
      v.box(x + i * s, y + (j0 + base) * s, z + k * s, s, (m - n) * s, s, c0.c, c0.glow);
      n = m;
    }
  }
  // Stem and leaf; with the lid off, the lid (with its stem) rests beside the pumpkin.
  const top = y + (maxJ + 1 + base) * s;
  const stem = (sx, sy, sz) => { v.box(sx - s, sy, sz - s, s * 2, s * 2.6, s * 2, STEM); v.box(sx, sy + s * 2.2, sz - s, s * 2, s * 1.2, s * 1.6, 0x8a843a); v.box(sx + s, sy + s * .6, sz, s * 3, s * .6, s * 2, 0x557a2e); };
  if (!lidOff) stem(x, top - s * 1.2, z);
  else {
    const lx = x + RX * s + s * 4, lz = z + s * 2;
    for (let i = -4; i < 4; i++) for (let k = -4; k < 4; k++) if (Math.hypot(i + .5, k + .5) < 4.2) v.box(lx + i * s, y, lz + k * s, s, s * 1.4, s, (i + k) % 3 ? SKIN : GROOVE);
    stem(lx, y + s * 1.4, lz);
    if (stage === "open") for (let n = 0; n < 7; n++) v.box(x - RX * s - s * 3 + r() * s * 4, y, z + s * 3 + r() * s * 5, s * 1.3, s * 1.1, s * 1.3, n % 3 ? FLESH : 0xf3e6c4);   // pulp and seeds
  }
  return v;
}
// Height of a lantern at a scale, for stacking things on it.
export const lanternHeight = (scale = 1) => 0.04 * scale * 12;

// A witch's hat to sit on a lantern, its brim on y.
export function addHat(v, x, y, z, scale = 1) {
  const u = 0.04 * scale;
  v.box(x - 5 * u, y, z - 5 * u, 10 * u, u, 10 * u, 0x2a1f38);
  v.box(x - 5 * u, y + u, z - 5 * u, 10 * u, u * .6, 10 * u, 0x8a4fd0);
  for (let n = 0; n < 6; n++) { const w = (6 - n) * 1.4 * u; v.box(x - w / 2 + n * u * .25, y + u * (1.6 + n * 1.7), z - w / 2, w, u * 1.7, w, n === 1 ? 0x6b3fa8 : 0x2f2440); }
  v.box(x + 1.2 * u, y + u * 11.6, z - u * .5, u * 1.4, u * 1.4, u, 0x2f2440);
}
// A wrought-iron stand a lantern sits on; returns its height.
export function addWroughtStand(v, x, y, z, scale = 1) {
  const u = 0.04 * scale, h = 7 * u, IRON = 0x1d1a22;
  for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) v.box(x + dx * u - u / 2, y, z + dz * u - u / 2, u, h, u, IRON);
  v.box(x - 5 * u, y + h - u, z - 5 * u, 10 * u, u, 10 * u, IRON);
  for (const dx of [-4, 4]) v.box(x + dx * u - u, y + h - 2.5 * u, z - u, u * 2, u * 2, u * 2, 0x3a3340);
  return h;
}
// A pillar candle with its flame.
function addCandle(v, x, y, z, h = .16) {
  v.box(x - .03, y, z - .03, .06, h, .06, 0xf1e6cf);
  v.box(x - .012, y + h, z - .012, .024, .05, .024, 0xffc35a, true);
}
// A pot of glow paint with its brush.
function addPaintPot(v, x, y, z) {
  v.box(x - .07, y, z - .07, .14, .13, .14, 0x4a5a64); v.box(x - .06, y + .12, z - .06, .12, .02, .12, GLOW.paint, true);
  v.box(x + .02, y + .1, z - .01, .02, .2, .02, 0x8a5a34); v.box(x + .015, y + .29, z - .015, .03, .04, .03, 0xd8c8a0);
}

// What the stand shows on its shelves, its bench and its front: everything but
// the guests and the lanterns being carved, which change by the second.
// Local coordinates: origin on the ground at the stand's middle, +z to the front.
export const STAND_SIZE = Object.freeze({ w: 7.2, d: 4.4 });
export function benchPlaces(n) { return Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * 1.02, seat: -0.56, table: 0.24 })); }
export function buildStandBody({ benches = 1, designs = ["classic"], extras = [], allDesigns = Object.keys(LANTERN_FACES), seed = 4471 } = {}) {
  const v = new Voxels(), r = seeded(seed), W = STAND_SIZE.w / 2;
  const WOOD = 0x6b4428, WOOD_DARK = 0x3a2618, TIMBER = 0x4a3020, TRIM = 0x8a5a34, IRON = 0x1d1a22;
  // The deck: planks with staggered joints, a fascia and a step at the front.
  for (let z = -2.15, row = 0; z < 1.7; z += .3, row++) {
    let x = -W + .1, len = .9 + (row % 3) * .55;
    while (x < W - .1) { const l = Math.min(len, W - .1 - x); v.box(x, 0, z, l - .025, .1, .28, vary(row % 2 ? 0x6e4a2c : 0x664226, .06, r)); x += l; len = 1.7 + r() * .9; }
  }
  v.box(-W + .1, 0, 1.69, 2 * W - .2, .1, .06, WOOD_DARK);
  v.box(-1.1, 0, 1.75, 2.2, .055, .32, vary(0x6e4a2c, .05, r));
  // The lantern wall: posts, boards, three shelves on brackets.
  for (const x of [-3.45, -1.15, 1.15, 3.45]) v.box(x - .09, 0, -2.22, .18, 3.25, .18, WOOD_DARK);
  for (let x = -3.36, n = 0; x < 3.36; x += .2, n++) v.box(x, .1, -2.2, .19, 3.05, .1, n % 2 ? TIMBER : 0x553624);
  for (const y of [.62, 1.28, 1.94]) {
    v.box(-3.3, y, -2.1, 6.6, .07, .5, WOOD); v.box(-3.3, y - .02, -1.62, 6.6, .05, .04, WOOD_DARK);
    for (const x of [-2.3, 0, 2.3]) v.box(x - .04, y - .2, -2.1, .08, .2, .3, WOOD_DARK);
  }
  // The shelves' lanterns: every design, lit once it's on the menu, an uncut pumpkin until then.
  allDesigns.forEach((id, n) => {
    const x = [-2.25, 0, 2.25][n % 3], y = n < 3 ? 1.35 : 2.01, on = designs.includes(id), paint = extras.includes("paint") && n === 2;
    addLantern(v, x, y, -1.88, { design: id, stage: on ? "lit" : "whole", scale: .95, glow: paint ? GLOW.paint : GLOW.candle, seed: n + 3 });
    if (on && extras.includes("hat") && n === 1) addHat(v, x, y + lanternHeight(.95) - .02, -1.88, .95);
  });
  // The bottom shelf: uncut stock, tools, and what the stocked extras need.
  for (let n = 0; n < 6; n++) pumpkinBlock(v, -3.0 + n * .42 + r() * .08, .69, -1.98, .3, [0xf0821e, 0xe8e0d0, 0xd06a1a, 0xb2342b][n % 4], r);
  if (extras.includes("candle")) for (let n = 0; n < 5; n++) addCandle(v, .5 + n * .2, .69, -1.86, .12 + (n % 2) * .06);
  if (extras.includes("paint")) for (const x of [1.75, 2.05]) addPaintPot(v, x, .69, -1.86);
  if (extras.includes("stand")) addWroughtStand(v, 2.75, .69, -1.86, .8);
  for (let n = 0; n < 3; n++) { v.box(-.55 + n * .14, .71, -1.85, .025, .03, .16, 0xc8ccd6); v.box(-.55 + n * .14, .71, -1.7, .03, .03, .08, 0x5a3a24); }   // knives laid out
  // A striped awning over the lantern wall, scalloped along its front with a
  // bulb under every scallop, and a gable carrying the sign and a great lantern.
  const STRIPES = [0xd8742a, 0x4a2a5c];
  for (let row = 0; row < 4; row++) for (let n = 0; n < 20; n++) {
    const x = -3.6 + n * .36, y = 3.22 - row * .08, z = -2.25 + row * .25;
    v.box(x, y, z, .36, .08, .26, vary(STRIPES[n % 2], .04, r));
  }
  for (let n = 0; n < 20; n++) {
    const x = -3.6 + n * .36, c = vary(STRIPES[n % 2], .04, r), z = -1.24;
    v.box(x, 2.98, z, .36, .22, .04, c); v.box(x + .05, 2.92, z, .26, .06, .04, c); v.box(x + .11, 2.88, z, .14, .04, .04, c);
    v.box(x + .14, 2.8, z + .02, .08, .08, .08, [0xffc46a, 0xffd894, 0xff9a4a, 0xc89cff][n % 4], true);
  }
  v.box(-3.6, 3.2, -1.3, 7.2, .04, .06, TRIM);
  for (let y = 3.3, k = 0; y < 4.4; y += .1, k++) { const hw = 1.65 * (1 - (y - 3.3) / 1.1); if (hw <= .05) break; v.box(-hw, y, -2.3, hw * 2, .1, .12, k % 2 ? TIMBER : 0x433026); v.box(-hw - .05, y, -2.18, .12, .1, .05, TRIM); v.box(hw - .07, y, -2.18, .12, .1, .05, TRIM); }
  v.box(-1.7, 3.26, -2.3, 3.4, .08, .18, TRIM);
  addLantern(v, 0, 4.3, -2.24, { design: "classic", stage: "lit", scale: 1.45, seed: 99 });
  for (const x of [-1.62, 1.62]) { v.box(x - .03, 3.3, -2.25, .06, .45, .06, IRON); v.box(x - .05, 3.73, -2.27, .1, .1, .1, 0x2a2430); }
  // The carving bench: a long trestle table with a burlap runner, stools behind it and tools at each place.
  v.box(-3.1, .74, -.15, 6.2, .08, .72, vary(0x8a5a34, .04, r)); v.box(-3.1, .72, .55, 6.2, .04, .04, WOOD_DARK);
  v.box(-3.0, .82, .02, 6.0, .012, .4, 0xb89a6a); for (let x = -2.9; x < 3; x += .6) v.box(x, .832, .02, .3, .004, .4, 0xa88a5a);
  for (const x of [-2.85, 0, 2.85]) { for (const dz of [-.08, .44]) v.box(x - .05, 0, dz, .1, .74, .08, WOOD_DARK); v.box(x - .05, .3, -.08, .1, .07, .6, WOOD_DARK); }
  for (const p of benchPlaces(benches)) {
    v.box(p.x - .19, .4, p.seat - .19, .38, .06, .38, vary(TRIM, .06, r)); for (const [dx, dz] of [[-.14, -.14], [.1, -.14], [-.14, .1], [.1, .1]]) v.box(p.x + dx, 0, p.seat + dz, .05, .4, .05, WOOD_DARK);
    v.box(p.x - .44, .83, .36, .03, .015, .17, 0xc8ccd6); v.box(p.x - .44, .83, .5, .035, .02, .08, 0x5a3a24);          // a knife
    v.box(p.x - .36, .83, .36, .05, .02, .05, 0xb0b4bc); v.box(p.x - .345, .83, .41, .02, .015, .14, 0x5a3a24);          // a scoop
    for (let n = 0; n < 4; n++) v.box(p.x + .55 + r() * .12, .83, .02 + r() * .3, .05, .03, .05, n % 2 ? FLESH : 0xf3e6c4);   // pulp and seeds
  }
  // The front: crates of uncut pumpkins, a showpiece on a hay bale, a pulp bucket, lamp posts and festoons.
  v.box(-3.35, .1, .75, 1.0, .5, .62, vary(0x8a6a44, .05, r)); for (const y of [.22, .44]) v.box(-3.35, y, 1.36, 1.0, .06, .02, WOOD_DARK);
  for (let n = 0; n < 4; n++) pumpkinBlock(v, -3.18 + (n % 2) * .44, .6, .86 + (n >> 1) * .26, .34, [0xf0821e, 0xe8e0d0, 0xd06a1a, 0x8fa07a][n], r);
  for (const [x, z, c] of [[-2.2, 1.25, 0xf0821e], [-1.82, 1.42, 0xe8e0d0], [-2.05, .98, 0xd06a1a]]) pumpkinBlock(v, x, .1, z, .4, c, r);
  v.box(2.0, .1, .95, 1.1, .5, .62, vary(0xc9a85a, .06, r)); for (let n = 0; n < 6; n++) v.box(2.0 + r() * 1.0, .6, .95 + r() * .55, .12, .03, .02, 0xe2c27a);
  addLantern(v, 2.55, .6, 1.25, { design: designs[designs.length - 1] ?? "classic", stage: "lit", scale: 1.05, glow: extras.includes("paint") ? GLOW.paint : GLOW.candle, seed: 7 });
  if (extras.includes("hat")) addHat(v, 2.55, .6 + lanternHeight(1.05) - .02, 1.25, 1.05);
  v.box(-1.36, .1, 1.0, .32, .34, .32, 0x8a8f9a); v.box(-1.34, .44, 1.02, .28, .03, .28, FLESH); v.box(-1.38, .1, .98, .36, .04, .36, 0x6a6f7a);
  for (const side of [-1, 1]) {
    const x = side * 3.45, z = 1.95;
    v.box(x - .06, 0, z - .06, .12, 2.55, .12, IRON); v.box(x - .1, 2.55, z - .1, .2, .06, .2, IRON);
    v.box(x - side * .3 - .02, 2.3, z - .02, side * .3 + .04, .04, .04, IRON);
    v.box(x - side * .3 - .09, 1.98, z - .09, .18, .26, .18, 0x2a2430); v.box(x - side * .3 - .06, 2.0, z - .06, .12, .2, .12, 0xffb85a, true);
  }
  // Festoon lights in a sag between the lamp posts, with bunting between the bulbs.
  const bulbs = [0xffc46a, 0xff9a4a, 0xc89cff, 0xffd894], flags = [0xd8742a, 0x6b3fa8, 0x5f8a3a, 0xf1e6cf];
  for (let i = 0, n = 40; i <= n; i++) {
    const t = i / n, x = -3.45 + 6.9 * t, y = 2.55 - Math.sin(t * Math.PI) * .38, z = 1.95;
    v.box(x - .03, y + .05, z - .03, .06, .025, .06, IRON);
    if (i % 4 === 0) v.box(x - .045, y - .06, z - .045, .09, .1, .09, bulbs[i / 4 % 4], true);
    else if (i % 4 === 2) { const c = flags[(i >> 2) % 4]; v.box(x - .1, y - .04, z - .01, .2, .06, .02, c); v.box(x - .065, y - .1, z - .01, .13, .06, .02, c); v.box(x - .03, y - .16, z - .01, .06, .06, .02, c); }
  }
  // Leaves blown onto the deck.
  for (let n = 0; n < 26; n++) v.box(-W + .3 + r() * (2 * W - .6), .1, -1.4 + r() * 3.0, .08, .012, .06, [0xc8501e, 0xe08a2a, 0x9a3a1a, 0xb8862a][n % 4]);
  return {
    voxels: v, places: benchPlaces(benches),
    sign: { x: 0, y: 3.74, z: -2.17, width: 2.6 },
    chalk: { x: 1.45, y: .1, z: 1.62 },
    lamps: [{ x: -2.6, y: 2.2, z: 1.2 }, { x: 2.6, y: 2.2, z: 1.2 }],
  };
}

// The A-frame chalkboard that lists tonight's designs and extras with prices.
export function chalkboard(lines, w = .78, h = 1.0) {
  const canvas = document.createElement("canvas"); canvas.width = 384; canvas.height = 500;
  const c = canvas.getContext("2d");
  c.fillStyle = "#24312b"; c.fillRect(0, 0, 384, 500);
  for (let n = 0; n < 900; n++) { c.fillStyle = `rgba(255,255,255,${Math.random() * .035})`; c.fillRect(Math.random() * 384, Math.random() * 500, 2, 2); }
  c.fillStyle = "#f4efe2"; c.textAlign = "center"; c.font = "700 46px Georgia, serif"; c.fillText("Carve your own", 192, 66);
  c.strokeStyle = "#f4efe288"; c.lineWidth = 2; c.beginPath(); c.moveTo(40, 88); c.lineTo(344, 88); c.stroke();
  c.textAlign = "left"; c.font = "500 30px Georgia, serif";
  lines.slice(0, 9).forEach(([name, price, hue], n) => { const y = 136 + n * 40; c.fillStyle = hue ?? "#f4efe2"; c.fillText(name, 30, y); c.textAlign = "right"; c.fillStyle = "#ffd36b"; c.fillText(price, 354, y); c.textAlign = "left"; });
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const group = new THREE.Group(), board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: .95 }));
  board.position.set(0, h / 2 + .2, 0); board.rotation.x = -.18; group.add(board);
  const frame = new Voxels(); frame.box(-w / 2 - .05, 0, -.12, .05, h + .28, .05, 0x6b4428); frame.box(w / 2, 0, -.12, .05, h + .28, .05, 0x6b4428); frame.box(-w / 2 - .05, h + .22, -.12, w + .1, .06, .06, 0x6b4428); frame.box(-.04, 0, -.42, .08, h + .1, .05, 0x5a3a22);
  group.add(frame.build({ detailShadows: false }));
  group.userData.texture = texture;
  return group;
}

// A model for each extra and each upgrade, for the menu's pictures.
export function extraModel(id) {
  const v = new Voxels();
  if (id === "candle") { addLantern(v, -.12, 0, 0, { design: "classic", stage: "lit" }); for (const [x, h] of [[.36, .22], [.5, .15], [.43, .3]]) addCandle(v, x, 0, .2, h); }
  else if (id === "paint") { addLantern(v, -.1, 0, 0, { design: "spooky", stage: "lit", glow: GLOW.paint }); addPaintPot(v, .45, 0, .22); }
  else if (id === "hat") { addLantern(v, 0, 0, 0, { design: "classic", stage: "lit" }); addHat(v, 0, lanternHeight() - .02, 0); }
  else { const h = addWroughtStand(v, 0, 0, 0, 1.2); addLantern(v, 0, h, 0, { design: "ghost", stage: "lit" }); }
  return v.build({ detailShadows: false });
}
export function upgradeModel(id) {
  const v = new Voxels(), r = seeded(5);
  if (id === "benches") {
    v.box(-.5, .4, -.2, 1.0, .06, .4, 0x8a5a34); for (const x of [-.45, .4]) for (const z of [-.15, .1]) v.box(x, 0, z, .06, .4, .06, 0x3a2618);
    addLantern(v, -.18, .46, 0, { design: "classic", stage: "carved", scale: .8 }); addLantern(v, .26, .46, 0, { design: "spooky", stage: "whole", scale: .7 });
  } else if (id === "tools") {
    v.box(-.4, 0, -.3, .8, .04, .6, 0x8a5a34);
    v.box(-.28, .04, -.04, .5, .03, .06, 0xc8ccd6); v.box(.22, .04, -.05, .18, .05, .08, 0x5a3a24);
    v.box(-.25, .04, .14, .1, .04, .1, 0xb0b4bc); v.box(-.15, .04, .16, .45, .03, .05, 0x5a3a24);
    for (let n = 0; n < 6; n++) v.box(-.3 + r() * .6, .04, -.25 + r() * .1, .05, .03, .05, n % 2 ? FLESH : 0xf3e6c4);
  } else {
    for (const x of [-.32, .32]) v.box(x - .03, 0, -.03, .06, .9, .06, 0x3a2618);
    v.box(-.42, .5, -.04, .84, .36, .06, 0x3a2618); v.box(-.36, .55, .02, .72, .26, .01, 0xd8742a); v.box(-.36, .64, .025, .72, .06, .01, 0x4a2a5c);
    addLantern(v, 0, .9, 0, { design: "classic", stage: "lit", scale: .55 });
  }
  return v.build({ detailShadows: false });
}
export function lanternModel(design, stage = "lit", glow = GLOW.candle, hat = false, stand = false) {
  const v = new Voxels(), h = stand ? addWroughtStand(v, 0, 0, 0) : 0;
  addLantern(v, 0, h, 0, { design, stage, glow });
  if (hat && stage === "lit") addHat(v, 0, h + lanternHeight() - .02, 0);
  return v.build({ detailShadows: false });
}
