// Mothlight Village in voxels (handover 73): the painted ground and its cobbled
// roads, the Green with its square (the Moth Fountain, the well, the stall, the
// noticeboard), the avenue's knot gardens, homes and gathering spots, the four
// districts beyond it (seen on the grand tour, their gates shut until they
// open), and the woods, mountains and evening sky round it all. Static parts are
// built once in a few batches; the parts that change (the stall, the bench, the
// homes, the gathering spots) are rebuilt from their own keys by village-view.js.
// Realm (x east, z north) → three (x, -z).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Voxels, ChunkedVoxels, seeded, vary } from "./voxels.js";
import * as LAYOUT from "./content/village.js";
import { terrainHeight as H, TERRACES, RAMPS, WATERS, REALM, isWater, rampAt, terraceAt, MARSH_ISLANDS } from "./village-terrain.js";
const SHIFT = LAYOUT.DISTRICT_SHIFT;
import {
  C, shade, frame, realm, lampPost, studio, tavern, bigTent, caravan, manor, stiltHut, canopyTree, pine, twistedTree, deadTree, glowShroom, stoneWall, picketFence, mothPillar, carriage, fountain, well, noticeboard, stall, bench,
  workshop, conservatory, node, bush, flower, grassTuft, lantern, cottage, townhouse, hedge, topiary, brickPier, railing, parkBench, flowerBed, roundPlanter,
  pumpkin, jackOLantern, hayBale, cornSheaf, scarecrow, festoon, gravestone, spookyTree, crow, cauldron, mothTree, velvetBat,
} from "./village-models.js";
// Writers that stand things on the terraced ground: onGround puts each block's foot
// on the ground beneath it; at() stands a whole model at the height of its origin.
const onGround = (v) => ({ block(x, y, z, w, h, d, c, g) { v.block(x, y + H(x, z), -z, w, h, d, c, g); return this; }, mark(k, x, y, z) { v.mark(k, x, y + H(x, z), -z); return this; } });
const at = (v, x, z, facing = "south") => frame(v, x, z, facing, H(x, z));
// How much brighter than painted the glowing voxels are drawn, so the bloom catches lamps, windows and faces.
const GLOW = 1.6;
// Everything here is drawn on the design grid; the view scales the whole village by
// PLAN_SCALE into world units, where the owners are 2.3 units tall. So the layout
// (in world units) is read back onto the grid.
export const PLAN_SCALE = LAYOUT.PLAN_SCALE;
const dv = (n) => n / PLAN_SCALE;
const ROADS = LAYOUT.ROADS.map((r) => ({ ...r, width: dv(r.width), points: r.points.map(([x, z]) => [dv(x), dv(z)]) }));
const PLOTS = LAYOUT.PLOTS.map((p) => ({ ...p, x0: dv(p.x0), z0: dv(p.z0), x1: dv(p.x1), z1: dv(p.z1), door: p.door.map(dv) }));
const NODES = LAYOUT.NODES.map((n) => ({ ...n, x: dv(n.x), z: dv(n.z) }));
const GATES = LAYOUT.GATES.map((g) => ({ ...g, x: dv(g.x), z: dv(g.z) }));
const FIXTURES = Object.fromEntries(Object.entries(LAYOUT.FIXTURES).map(([k, f]) => [k, { ...f, x: dv(f.x), z: dv(f.z), ...(f.w ? { w: dv(f.w), d: dv(f.d) } : {}), ...(f.r ? { r: dv(f.r) } : {}) }]));
// The fairy lights' cables: each string a smooth tube along its sag, all of a build's in one mesh.
// Points are on the design grid relative to the ground (as onGround writes them).
function cableMesh(list) {
  if (!list.length) return null;
  const parts = list.map(({ ax, ay, az, bx, by, bz, sag }) => {
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ay + (by - ay) * t - Math.sin(t * Math.PI) * sag; pts.push(new THREE.Vector3(x, y + H(x, z), -z)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .022, 4, false);
  });
  const mesh = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: 0x1e1a24, roughness: .55, metalness: .2 }));
  parts.forEach((g) => g.dispose()); mesh.castShadow = false; return mesh;
}
// The knot gardens' two small fountains (the life layer sets their water falling).
const FOUNTAINS = [{ x: 51.5, z: 11.8, r: 1.05 }, { x: 64, z: 11.8, r: .85 }];

// The ground's extent: the realm and a margin of woods all round.
export const GROUND = Object.freeze({ x0: -80, x1: 210, z0: -40, z1: 176, scale: 4, step: 1.5 });
// The round square, set in rings round the Moth Tree, reaching both doors and the roads.
export const SQUARE = Object.freeze({ x0: 49.2, z0: 15.8, x1: 66.8, z1: 33.4, cx: FIXTURES.tree.x, cz: FIXTURES.tree.z, r: 8.8 });
// Where the waterfalls tumble off the Quarry's island into the moat (design grid: x, z, top, foot, facing x).
const FALLS = [{ x: 82.3, z: 51 + SHIFT.quarry[1], top: 5, foot: -1.6, dir: 1 }, { x: 43.7, z: 62 + SHIFT.quarry[1], top: 5, foot: -1.6, dir: -1 }];
const pick = (list, r) => list[(r() * list.length) | 0];

// ---- Ground ----------------------------------------------------------------------
// The ground's colours, painted once: lawns, the districts' own soils and plants, the ravine and the marsh's pools.
function groundTexture() {
  const g = GROUND, W = (g.x1 - g.x0) * g.scale, H = (g.z1 - g.z0) * g.scale, canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d"), r = seeded(73);
  const P = (x, z) => [(x - g.x0) * g.scale, (g.z1 - z) * g.scale];
  const rect = (x0, z0, x1, z1, colour) => { const [a, b] = P(x0, z1), [c, d] = P(x1, z0); ctx.fillStyle = colour; ctx.fillRect(a, b, c - a, d - b); };
  const speckle = (x0, z0, x1, z1, colours, n, size = 1.2) => { for (let i = 0; i < n; i++) { const [px, py] = P(x0 + r() * (x1 - x0), z0 + r() * (z1 - z0)); ctx.fillStyle = colours[(r() * colours.length) | 0]; ctx.fillRect(px, py, size * g.scale * (.4 + r() * .8), size * g.scale * (.3 + r() * .5)); } };
  const blob = (x, z, rx, rz, colour) => { const [px, py] = P(x, z); ctx.fillStyle = colour; ctx.beginPath(); ctx.ellipse(px, py, rx * g.scale, rz * g.scale, 0, 0, Math.PI * 2); ctx.fill(); };
  // The woods round the realm.
  rect(g.x0, g.z0, g.x1, g.z1, "#355a36"); speckle(g.x0, g.z0, g.x1, g.z1, ["#3d6639", "#2f5032", "#46703e", "#2a4a30"], 9000, 2);
  // The Green: lawns in soft mown bands, clover and daisies, leaves under the trees.
  rect(0, 0, 120, 36, "#558a3a");
  for (let x = 0; x < 120; x += 2.4) rect(x, 0, x + 1.2, 36, "rgba(255,255,230,.03)");
  speckle(0, 0, 120, 36, ["#5d9440", "#4e8036", "#649a44", "#4b7c34"], 16000, .55);
  speckle(0, 0, 120, 36, ["#f6f2e8", "#f5d04a", "#f2a0c0", "#ffffff"], 2600, .16);
  for (let i = 0; i < 70; i++) blob(r() * 120, r() * 36, .8 + r() * 1.6, .6 + r() * 1.2, "rgba(40,80,30,.18)");
  speckle(0, 0, 120, 4, ["#b3352a", "#d0532c", "#e8873a", "#cf8f2c"], 900, .3); speckle(0, 31, 120, 36, ["#b3352a", "#d0532c", "#e8873a", "#cf8f2c"], 700, .3); speckle(0, 0, 4, 36, ["#b3352a", "#e8873a"], 400, .3);
  // The districts, each where it now stands (drawn in its own place, then moved).
  const at = (d, x0, z0, x1, z1) => [x0 + SHIFT[d][0], z0 + SHIFT[d][1], x1 + SHIFT[d][0], z1 + SHIFT[d][1]];
  // The woods between the districts: a dark leafy floor.
  rect(REALM.x0, 36, REALM.x1, REALM.z1, "#2f4a32"); speckle(REALM.x0, 36, REALM.x1, REALM.z1, ["#355236", "#2a422c", "#3c5a38", "#4a3a2a", "#6a3a26"], 14000, .7);
  for (let i = 0; i < 90; i++) blob(REALM.x0 + r() * (REALM.x1 - REALM.x0), 36 + r() * 98, 1.5 + r() * 3, 1.5 + r() * 3, "rgba(20,30,20,.25)");
  { const [a, b, c, d] = at("copse", -2, 40, 39, 98); rect(a, b, c, d, "#3a6250"); speckle(a, b, c, d, ["#416c58", "#335a48", "#47735c", "#2f5442"], 9000, .6); speckle(a, b, c, d, ["#a77ad8", "#d6a6ff", "#7fe8d0"], 900, .25); }
  { const [a, b, c, d] = at("quarry", 39, 37, 87, 76); rect(a, b, c, d, "#2a3036"); speckle(a, b, c, d, ["#323840", "#24292e", "#3a4048"], 3000, .7); }
  { const [a, b, c, d] = at("quarry", 44, 43, 82, 71); rect(a, b, c, d, "#b5ac9c"); speckle(a, b, c, d, ["#c0b7a6", "#a89f90", "#cbc2b0", "#9d9484"], 9000, .5); }
  { const [a, b, c, d] = at("quarry", 46, 58, 80, 71); rect(a, b, c, d, "#c2b9a8"); speckle(a, b, c, d, ["#cdc4b2", "#b4ab9a"], 4000, .5); }
  { const [a, b, c, d] = at("moor", 82.5, 12, 122, 76); rect(a, b, c, d, "#5a4868"); speckle(a, b, c, d, ["#634f72", "#523f60", "#6b5878", "#4c3c5a"], 10000, .55); speckle(a, b, c, d, ["#8a7a4a", "#9a8a58", "#a07ab8"], 2400, .3); }
  { const [a, b, c, d] = at("marsh", 38, 76, 122, 98); rect(a, b, c, d, "#355e52"); speckle(a, b, c, d, ["#3c6a5c", "#2f5448", "#4a7458"], 9000, .6); }
  // Bare earth under where the paving meets the grass, so a gap never shows green.
  for (const road of ROADS.filter((x) => x.kind !== "future-spur")) {
    const h = road.width / 2 + .25;
    for (let i = 1; i < road.points.length; i++) { const [ax, az] = road.points[i - 1], [bx, bz] = road.points[i]; rect(Math.min(ax, bx) - h, Math.min(az, bz) - h, Math.max(ax, bx) + h, Math.max(az, bz) + h, "#6d6150"); }
  }
  rect(SQUARE.x0 - .25, SQUARE.z0 - .25, SQUARE.x1 + .25, SQUARE.z1 + .25, "#6d6150");
  { const p = FIXTURES.pond; blob(p.x, p.z, p.w / 2 + 1.1, p.d / 2 + 1.1, "#4c6a3a"); }
  // The future spur to your plot: a worn track for now.
  for (const road of ROADS.filter((x) => x.kind === "future-spur" && x.plot === "R1")) for (let i = 1; i < road.points.length; i++) { const [ax, az] = road.points[i - 1], [bx, bz] = road.points[i]; speckle(Math.min(ax, bx) - .8, Math.min(az, bz) - .8, Math.max(ax, bx) + .8, Math.max(az, bz) + .8, ["#8a7a5a", "#7a6a4c", "#6a8a44"], Math.abs(bx - ax + bz - az) * 22, .5); }
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function buildGround() {
  const g = GROUND, st = g.step, nx = Math.round((g.x1 - g.x0) / st), nz = Math.round((g.z1 - g.z0) / st), pos = new Float32Array((nx + 1) * (nz + 1) * 3), uv = new Float32Array((nx + 1) * (nz + 1) * 2), idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = g.x0 + i * st, z = g.z0 + j * st, k = j * (nx + 1) + i; pos.set([x, H(x, z), -z], k * 3); uv.set([i / nx, j / nz], k * 2); }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1, metalness: 0 }));
  mesh.receiveShadow = true; mesh.name = "village-ground"; return mesh;
}

// ---- Paving -----------------------------------------------------------------------
// Granite setts in courses, one tile that repeats every TILE units: each sett with a lit top edge and a shadowed foot.
const TILE = 3.2;
function settTexture() {
  const S = 512, canvas = document.createElement("canvas"); canvas.width = canvas.height = S; const ctx = canvas.getContext("2d"), r = seeded(811);
  ctx.fillStyle = "#5e5a63"; ctx.fillRect(0, 0, S, S);
  const rows = 8, rh = S / rows, tones = ["#9a96a0", "#a8a4ad", "#8c8893", "#b3aeb5", "#9d958e", "#a39c98"];
  for (let row = 0; row < rows; row++) {
    let x = -r() * 60; const y = row * rh;
    while (x < S) {
      const w = 46 + r() * 44, c = tones[(r() * tones.length) | 0];
      for (const ox of [0, -S, S]) settAt(ctx, x + ox, y, w, rh, c, r);
      x += w;
    }
  }
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function settAt(ctx, x, y, w, h, colour, r) {
  const g = 3, x0 = x + g, y0 = y + g, ww = w - g * 2, hh = h - g * 2;
  ctx.fillStyle = colour; ctx.beginPath(); ctx.roundRect(x0, y0, ww, hh, 6); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.16)"; ctx.fillRect(x0 + 3, y0 + 2, ww - 6, 4); ctx.fillRect(x0 + 2, y0 + 3, 3, hh - 8);
  ctx.fillStyle = "rgba(20,15,30,.22)"; ctx.fillRect(x0 + 3, y0 + hh - 5, ww - 5, 4); ctx.fillRect(x0 + ww - 4, y0 + 4, 3, hh - 7);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = r() < .5 ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.08)"; ctx.fillRect(x0 + r() * ww, y0 + r() * hh, 3 + r() * 4, 2 + r() * 3); }
}
// The square: setts laid in rings round the fountain, with two bands of rose granite.
function squareTexture() {
  const K = 56, sq = SQUARE, W = Math.round((sq.x1 - sq.x0) * K), H = Math.round((sq.z1 - sq.z0) * K), canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d"), r = seeded(823), cx = (sq.cx - sq.x0) * K, cy = (sq.z1 - sq.cz) * K;
  ctx.fillStyle = "#5e5a63"; ctx.fillRect(0, 0, W, H);
  const tones = ["#a29e9a", "#aeaaa4", "#94908c", "#b8b3ac", "#a09890"], rose = ["#b8958a", "#c4a092", "#ad8a80"], reach = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) / K + .5;
  let ring = 0;
  for (let rad = 2.72; rad < reach; rad += .33, ring++) {
    const n = Math.max(8, Math.round(Math.PI * 2 * rad / .36)), band = ring === 2 || ring === 13, start = r();
    for (let i = 0; i < n; i++) {
      const a = (i + start) / n * Math.PI * 2, px = cx + Math.cos(a) * rad * K, py = cy + Math.sin(a) * rad * K;
      if (px < -30 || px > W + 30 || py < -30 || py > H + 30) continue;
      ctx.save(); ctx.translate(px, py); ctx.rotate(a + Math.PI / 2); settAt(ctx, -Math.PI * rad / n * K - 1, -.165 * K, Math.PI * 2 * rad / n * K + 2, .33 * K, band ? rose[(r() * 3) | 0] : tones[(r() * tones.length) | 0], r); ctx.restore();
    }
  }
  // A border of long kerb-stones round the square's edge.
  ctx.fillStyle = "#c9c1b5"; for (const [x, y, w, h] of [[0, 0, W, 10], [0, H - 10, W, 10], [0, 0, 10, H], [W - 10, 0, 10, H]]) ctx.fillRect(x, y, w, h);
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// Every road's paving as one mesh (courses laid across the way you walk), and the square on top.
// The paving writes no depth and draws after the ground, so overlapping quads never flicker.
export function buildPaving() {
  const group = new THREE.Group(), pos = [], uv = [], idx = [], quads = [];
  for (const road of ROADS.filter((x) => x.kind !== "future-spur")) {
    const h = road.width / 2;
    for (let i = 1; i < road.points.length; i++) { const [ax, az] = road.points[i - 1], [bx, bz] = road.points[i]; quads.push({ x0: Math.min(ax, bx) - h, z0: Math.min(az, bz) - h, x1: Math.max(ax, bx) + h, z1: Math.max(az, bz) + h, ns: Math.abs(bz - az) > Math.abs(bx - ax) }); }
  }
  quads.push({ x0: 55, z0: -16, x1: 61, z1: 0, ns: true });
  const stairs = (x, z) => { const r = rampAt(x, z); return r && !r.bridge && r.id !== "moor-ramp"; };
  // Each road in short strips along its length, each strip at the ground's height there.
  for (const q of quads) {
    const len = q.ns ? q.z1 - q.z0 : q.x1 - q.x0, n = Math.max(1, Math.ceil(len / .5));
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n, a = (q.ns ? q.z0 : q.x0) + len * t0, b = (q.ns ? q.z0 : q.x0) + len * t1, m = (a + b) / 2, cx = (q.x0 + q.x1) / 2, cz = (q.z0 + q.z1) / 2;
      if (q.ns ? stairs(cx, m) : stairs(m, cz)) continue;
      if (q.ns ? isWater(cx, m) && !rampAt(cx, m) : isWater(m, cz) && !rampAt(m, cz)) continue;
      const base = pos.length / 3;
      const corners = q.ns ? [[q.x0, a], [q.x1, a], [q.x1, b], [q.x0, b]] : [[a, q.z0], [b, q.z0], [b, q.z1], [a, q.z1]];
      for (const [x, z] of corners) { const y = H(q.ns ? cx : x, q.ns ? z : cz) + .03; pos.push(x, y, -z); uv.push(q.ns ? x / TILE : z / TILE, q.ns ? z / TILE : x / TILE); }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const material = (map) => new THREE.MeshStandardMaterial({ map, roughness: .9, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const roads = new THREE.Mesh(geo, material(settTexture())); roads.receiveShadow = true; roads.renderOrder = 1; group.add(roads);
  // The round square: a disc of setts in rings, its texture laid flat on the Green.
  const sq = SQUARE, disc = new THREE.CircleGeometry(sq.r, 64), du = disc.attributes.uv, dp = disc.attributes.position;
  for (let i = 0; i < du.count; i++) { const x = sq.cx + dp.getX(i), z = sq.cz + dp.getY(i); du.setXY(i, (x - sq.x0) / (sq.x1 - sq.x0), (z - sq.z0) / (sq.z1 - sq.z0)); }
  const plaza = new THREE.Mesh(disc, material(squareTexture())); plaza.rotation.x = -Math.PI / 2; plaza.position.set(sq.cx, .045, -sq.cz); plaza.receiveShadow = true; plaza.renderOrder = 2; group.add(plaza);
  // Kerb-stones along every paved edge that meets the grass, and a ring of them round the square.
  const v = new Voxels(), R = onGround(v), r = seeded(829), inside = (x, z) => quads.some((q) => x > q.x0 + .05 && x < q.x1 - .05 && z > q.z0 + .05 && z < q.z1 - .05) || Math.hypot(x - sq.cx, z - sq.cz) < sq.r - .05;
  for (const q of quads) for (const [ax, az, bx, bz, nx, nz] of [[q.x0, q.z0, q.x1, q.z0, 0, -1], [q.x0, q.z1, q.x1, q.z1, 0, 1], [q.x0, q.z0, q.x0, q.z1, -1, 0], [q.x1, q.z0, q.x1, q.z1, 1, 0]]) {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / .56)), along = Math.abs(bx - ax) > .01;
    for (let i = 0; i < n; i++) {
      const t = (i + .5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      if (inside(x + nx * .3, z + nz * .3) || stairs(x, z) || isWater(x, z) || rampAt(x, z)?.bridge) continue;
      R.block(x - nx * .1, 0, z - nz * .1, along ? len / n - .04 : .26, .12, along ? .26 : len / n - .04, vary(pick(C.stone, r), .05, r));
    }
  }
  for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2, x = sq.cx + Math.cos(a) * (sq.r - .1), z = sq.cz + Math.sin(a) * (sq.r - .1); if (quads.some((q) => x > q.x0 - .2 && x < q.x1 + .2 && z > q.z0 - .2 && z < q.z1 + .2)) continue; R.block(x, 0, z, .3, .14, .3, vary(pick(C.stone, r), .05, r)); }
  group.add(v.build({ detailShadows: false }));
  return group;
}

// Glossy water: the moat round the Quarry's island, the Marsh's pools, the pond, the well and the knot gardens' fountains.
export function buildWater() {
  const group = new THREE.Group(), material = new THREE.MeshPhongMaterial({ color: 0x2f6f9c, emissive: 0x0b2236, specular: 0xc8d0ff, shininess: 90, transparent: true, opacity: .92 });
  const marsh = new THREE.MeshPhongMaterial({ color: 0x1f5a60, emissive: 0x0a2a2e, specular: 0xb0ffe8, shininess: 70, transparent: true, opacity: .9 });
  const disc = (x, z, rx, rz, y, m = material) => { const geo = new THREE.CircleGeometry(1, 40); geo.scale(rx, rz, 1); const mesh = new THREE.Mesh(geo, m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, -z); mesh.receiveShadow = true; group.add(mesh); };
  const sheet = (x0, z0, x1, z1, y, m = material) => { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), m); mesh.rotation.x = -Math.PI / 2; mesh.position.set((x0 + x1) / 2, y, -(z0 + z1) / 2); mesh.receiveShadow = true; group.add(mesh); };
  for (const w of WATERS) {
    if (w.kind === "ring") { const i = w.inner; sheet(w.x0, w.z0, w.x1, i.z0, w.y); sheet(w.x0, i.z1, w.x1, w.z1, w.y); sheet(w.x0, i.z0, i.x0, i.z1, w.y); sheet(i.x1, i.z0, w.x1, i.z1, w.y); }
    else sheet(w.x0, w.z0, w.x1, w.z1, w.y, marsh);
  }
  const p = FIXTURES.pond, wl = FIXTURES.well;
  disc(p.x, p.z, p.w / 2, p.d / 2, .06); disc(wl.x, wl.z, .8, .8, .5);
  for (const f of FOUNTAINS) { disc(f.x, f.z, f.r - .18, f.r - .18, .38); disc(f.x, f.z, .38, .38, 1.12); }
  return group;
}

// Where grass grows (and which grass), on the design grid: lawns, the Copse's moss and the Moor's heather,
// never on paving, stairs, water, gardens, under buildings or on the Quarry's stone.
const NO_GRASS = [
  [40, 16.2, 47.8, 29.8], [66.2, 15.6, 75.4, 24.6], [48.6, 8, 54.4, 15.6], [61.6, 8, 66.4, 15.6], [48.8, 16.1, 54.2, 16.9], [61.8, 16.1, 66.2, 16.9],
  [67.6, 2.4, 81.4, 8.4], [29.6, 5.6, 46.6, 9.4], [85.5, 1.5, 94.5, 10.5], [74.8, 14.5, 81.4, 20], [91.4, 11.6, 111.8, 30], [52.4, -6, 63.6, 1.4], [96, 1.6, 108.6, 10.4],
  // The Copse's cottages and gardens, drawn in its own place and moved with it.
  ...[[17, 43.6, 24.4, 52.4], [16.6, 63.6, 24.4, 76.2], [8, 42.6, 20.4, 46.4], [8, 62.4, 21, 72.4]].map(([a, b, c, d]) => [a + SHIFT.copse[0], b + SHIFT.copse[1], c + SHIFT.copse[0], d + SHIFT.copse[1]]),
];
// The Moor's big top, tents, wheel and caravan stand on bare ground (in the Moor's own place, moved with it).
const MOOR_CLEAR = [[97, 42, 5.2], [94, 31.5, 4], [114, 16, 3.4], [115.5, 50, 2.4], [101.6, 48.4, 2.4]].map(([a, b, rr]) => [a + SHIFT.moor[0], b + SHIFT.moor[1], rr]);
const GRASS = {
  lawn: { h: .46, flowers: true, colours: [0x4f8a36, 0x5b9a3e, 0x67a644, 0x46802f, 0x76ad4a, 0x84b04e, 0x9aa848] },
  moss: { h: .36, flowers: true, colours: [0x3a6a52, 0x467a5c, 0x52866a, 0x356048, 0x5a7a5a] },
  heather: { h: .4, flowers: true, colours: [0x6a4a7a, 0x7d5a8a, 0x8a6a9a, 0x9a8a50, 0x5a4a6a, 0xa88ab8] },
};
export function grassAt(x, z) {
  if (x < REALM.x0 + .5 || x > REALM.x1 - .5 || z < .5 || z > REALM.z1 - .5 || isWater(x, z) || rampAt(x, z)) return null;
  if (Math.hypot(x - SQUARE.cx, z - SQUARE.cz) < SQUARE.r + .3) return null;
  if (ROADS.some((rd) => rd.points.some((p, i) => i && Math.abs(x - (p[0] + rd.points[i - 1][0]) / 2) < Math.abs(p[0] - rd.points[i - 1][0]) / 2 + rd.width / 2 + .25 && Math.abs(z - (p[1] + rd.points[i - 1][1]) / 2) < Math.abs(p[1] - rd.points[i - 1][1]) / 2 + rd.width / 2 + .25))) return null;
  if (NO_GRASS.some(([a, b, c, d]) => x > a && x < c && z > b && z < d)) return null;
  const t = terraceAt(x, z)?.id;
  if (t === "quarry" || t === "quarry-top" || t === "manor" || t === "observatory" || t === "moat") return null;
  if (t === "marsh") return MARSH_ISLANDS.some((I) => ((x - I.x) / I.rx) ** 2 + ((z - I.z) / I.rz) ** 2 < .8) ? GRASS.moss : null;
  if (t === "moor") return MOOR_CLEAR.some(([a, b, rr]) => Math.hypot(x - a, z - b) < rr) ? null : GRASS.heather;
  if (t === "copse") return GRASS.moss;
  // Lawn on the Green; the woods between the districts grow moss.
  return x > -1 && x < 121 && z < 37.5 ? GRASS.lawn : GRASS.moss;
}

// What the life layer animates, on the design grid.
export const LAYOUT_DESIGN = Object.freeze({ tree: FIXTURES.tree, fountains: FOUNTAINS, falls: FALLS, height: H });

// ---- The Green ------------------------------------------------------------------
// Lamp heads (realm x, z and height): where the view's pooled lights go.
export const LAMPS = Object.freeze([
  [54.5, 21.1, 3.4], [61.5, 21.1, 3.4], [54.5, 28.1, 3.4], [61.5, 28.1, 3.4],
  [55.3, 9.0, 3.6], [60.7, 9.0, 3.6], [55.3, 14.6, 3.6], [60.7, 14.6, 3.6], [54, 1.3, 3], [62, 1.3, 3],
  [46, 30.6, 3.6], [38, 30.6, 3.6], [70, 30.6, 3.6], [78, 30.6, 3.6], [54.4, 36.6, 3.6], [61.6, 36.6, 3.6],
  [54.4, 63, 3.4], [61.6, 63, 3.4], [52.6, 74, 7.4], [64.8, 70, 7.4], [-5, 62, 5.4], [-5, 82, 5.4], [148, 46, 5.4], [148, 68, 9.5], [86, 114, 2.6],
  [10, 30.6, 3.6], [22, 30.6, 3.6], [94, 30.6, 3.6], [106, 30.6, 3.6], [118, 30.6, 3.6], [3.4, 44, 3.6], [61.4, 46, 3.6], [61.4, 52, 3.6], [148.6, 92, 3.6], [61.4, 104, 3.6], [148.6, 100, 3.6], [88, 109.4, 3.6], [118, 109.4, 3.6], [3.4, 70, 6.6],
  // The Velvet Bat: its door lanterns, and the lit piers along its terrace.
  [102, 25.4, 2.8], [96.8, 29.6, 2.4], [107.2, 29.6, 2.4], [97.6, 27.4, 5.8], [106.4, 27.4, 5.8],
].map(([x, z, y]) => Object.freeze({ x, z, y })));
// A knot garden behind railings: a hedge border, a ring with four arms, flowers
// in each quarter, a cone of topiary at its heart and balls at its corners.
function knotGarden(v, x0, z0, x1, z1, roadSide, r, scheme, fountainR = 1) {
  const R = onGround(v), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, t = .4, h = .6;
  R.block(cx, 0, cz, w, .05, d, 0x5b923e);
  const rail = roadSide === "east" ? x1 : x0, other = roadSide === "east" ? x0 : x1;
  // Brick piers with railings on the road side; a hedge on the other three.
  for (const z of [z0, cz, z1]) brickPier(R, rail, z, 1.45, r, z === cz ? "ball" : "lamp");
  railing(R, rail, z0 + .4, rail, cz - .4, 1.0); railing(R, rail, cz + .4, rail, z1 - .4, 1.0);
  hedge(R, other + (roadSide === "east" ? t / 2 : -t / 2), cz, t, d, .95, r); hedge(R, cx + (roadSide === "east" ? -.3 : .3), z0 + t / 2, w - .6, t, .95, r); hedge(R, cx + (roadSide === "east" ? -.3 : .3), z1 - t / 2, w - .6, t, .95, r);
  // The knot: an inner border, a ring and four arms.
  const ix0 = x0 + .75, ix1 = x1 - .75, iz0 = z0 + .75, iz1 = z1 - .75, iw = ix1 - ix0, id = iz1 - iz0;
  hedge(R, cx, iz0, iw, t, h, r); hedge(R, cx, iz1, iw, t, h, r); hedge(R, ix0, cz, t, id, h, r); hedge(R, ix1, cz, t, id, h, r);
  const ring = Math.max(fountainR + .35, Math.min(iw, id) * .26);
  for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; R.block(cx + Math.cos(a) * ring, 0, cz + Math.sin(a) * ring, .42, h * .9, .42, vary(pick(C.hedge, r), .05, r)); R.block(cx + Math.cos(a) * ring, h * .9 - .1, cz + Math.sin(a) * ring, .46, .14, .46, vary(pick(C.hedgeTop, r), .05, r)); }
  hedge(R, cx, (iz0 + cz - ring) / 2, t, cz - ring - iz0 - .2, h, r); hedge(R, cx, (iz1 + cz + ring) / 2, t, iz1 - cz - ring - .2, h, r);
  hedge(R, (ix0 + cx - ring) / 2, cz, cx - ring - ix0 - .2, t, h, r); hedge(R, (ix1 + cx + ring) / 2, cz, ix1 - cx - ring - .2, t, h, r);
  // Flowers in the quarters, each its own colour; lavender inside the ring.
  const quarters = [[ix0, iz0, cx, cz], [cx, iz0, ix1, cz], [ix0, cz, cx, iz1], [cx, cz, ix1, iz1]];
  quarters.forEach(([a, b, c, e], q) => { for (let i = 0; i < (c - a) * (e - b) * 7; i++) { const x = a + .35 + r() * (c - a - .7), z = b + .35 + r() * (e - b - .7); if (Math.hypot(x - cx, z - cz) < ring + .45) continue; flower(R, x, z, scheme[q % scheme.length], r, 1.05); } });
  fountain(R, cx, cz, fountainR, r);
  for (const [x, z] of [[ix0, iz0], [ix1, iz0], [ix0, iz1], [ix1, iz1]]) topiary(R, x, z, .55, r);
}
export function buildGreen() {
  const v = new ChunkedVoxels(24), R = onGround(v), r = seeded(101), fr = (x, z, facing) => at(v, x, z, facing), cables = [];
  // The south wall with the moth gate, and the carriage waiting inside it.
  stoneWall(R, 0, .6, 53.3, .6, 1.2, r); stoneWall(R, 62.7, .6, 120, .6, 1.2, r);
  stoneWall(R, .6, 0, .6, 30, 1.2, r); stoneWall(R, 119.4, 0, 119.4, 30, 1.2, r);
  mothPillar(fr(54, .6, "south"), 0, 0, r); mothPillar(fr(62, .6, "south"), 0, 0, r);
  for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI; R.block(58 + Math.cos(a) * 4, 4.4 + Math.sin(a) * 1.1, .6, .5, .22, .3, C.iron); }
  R.block(58, 5.2, .6, 1.2, .5, .1, C.plum); R.block(58, 5.3, .65, .8, .3, .05, C.gold);
  { const c = FIXTURES.carriage; carriage(fr(c.x - 2.2, c.z, c.facing), 0, 0, r); }
  // The square: the Moth Tree at its heart, its lamps, the well, planters, flowers round the edges.
  const F = FIXTURES.tree; mothTree(R, F.x, F.z, r);
  for (const l of LAMPS.slice(0, 4)) lampPost(R, l.x, l.z, 3.4, r, 2);
  const W2 = FIXTURES.well; well(R, W2.x, W2.z, r);
  roundPlanter(R, 49.2, 30.3, .7, r, [0xf08a3a, 0xf6f0f5, 0x9a6ae0], "none"); roundPlanter(R, 65.8, 30.3, .7, r, [0xf5d04a, 0xf08a3a, 0x9a6ae0], "none");
  jackOLantern(fr(49.2, 30.3, "south"), 0, 0, .62, r, 0, .46); jackOLantern(fr(65.8, 30.3, "south"), 0, 0, .62, r, 2, .46);
  noticeboard(fr(FIXTURES.noticeboard.x, FIXTURES.noticeboard.z, "south"), 0, 0, r);
  // The avenue: knot gardens behind railings, lamps and benches facing the road.
  knotGarden(v, 48.6, 8, 54.4, 15.6, "east", r, [0xd6407a, 0xf5d04a, 0xf6f0f5, 0xf08a3a], FOUNTAINS[0].r);
  knotGarden(v, 61.6, 8, 66.4, 15.6, "west", r, [0xf5d04a, 0xd6407a, 0xf08a3a, 0xf6f0f5], FOUNTAINS[1].r);
  for (const l of LAMPS.slice(4, 8)) lampPost(R, l.x, l.z, 3.2, r, 1);
  parkBench(fr(55.6, 11.5, "east"), 0, 0, r); parkBench(fr(60.4, 11.5, "west"), 0, 0, r);
  // Crimson maples flanking the gate, the old oak, and a feature maple in Rowan's garden.
  canopyTree(R, 50.2, 4, 1.25, r, C.crimson, { cell: .3 }); canopyTree(R, 65.8, 4, 1.25, r, C.crimson, { cell: .3 });
  for (const [x, z] of [[55.3, 3.2], [60.7, 3.2]]) lampPost(R, x, z, 3.2, r, 1);
  flowerBed(R, 48.8, 16.1, 54.2, 16.9, r, [0xf28fb5, 0xf6f0f5, 0x9a6ae0], 6); flowerBed(R, 61.8, 16.1, 66.2, 16.9, r, [0xf5d04a, 0xf08a3a, 0xf6f0f5], 6);
  canopyTree(R, FIXTURES.oak.x, FIXTURES.oak.z, 1.75, r, [0x4c8c3c, 0x5b9f45, 0x6db250, 0xd9a441], { cell: .34 });
  // Lamps along the cross road and at the ravine's edge.
  for (const l of LAMPS.slice(10, 16)) lampPost(R, l.x, l.z, 3.4, r, 1);
  // Trees round the Green's edges, kept off roads, plots, nodes, the square, the gardens and your plot.
  const roadClear = (x, z, pad) => ROADS.some((rd) => rd.points.some((p, i) => i && Math.abs(x - (p[0] + rd.points[i - 1][0]) / 2) < Math.abs(p[0] - rd.points[i - 1][0]) / 2 + rd.width / 2 + pad && Math.abs(z - (p[1] + rd.points[i - 1][1]) / 2) < Math.abs(p[1] - rd.points[i - 1][1]) / 2 + rd.width / 2 + pad));
  const pondClear = (x, z) => Math.abs(x - FIXTURES.pond.x) < FIXTURES.pond.w / 2 + 1.6 && Math.abs(z - FIXTURES.pond.z) < FIXTURES.pond.d / 2 + 1.6;
  const keepClear = (x, z, pad = 2.2) => roadClear(x, z, pad) || PLOTS.some((p) => p.kind === "resident" && x > p.x0 - 1 && x < p.x1 + 1 && z > p.z0 - 1 && z < p.z1 + 1) || NODES.some((n) => Math.hypot(n.x - x, n.z - z) < 2.2)
    || x > SQUARE.x0 - 1.5 && x < SQUARE.x1 + 1.5 && z > 2 && z < SQUARE.z1 + 1 || x > 3 && x < 23 && z > 7 && z < 27 || pondClear(x, z) || Math.hypot(x - FIXTURES.oak.x, z - FIXTURES.oak.z) < 4
    || x > 89.6 - pad && x < 113.6 + pad && z > 10.4 - pad && z < 31;
  const palettes = [C.crimson, C.golden, C.green, C.leaves, C.violet];
  let planted = 0;
  for (let i = 0; i < 3000 && planted < 125; i++) {
    const band = i % 5, x = band === 0 ? 1.5 + r() * 2.5 : band === 1 ? 84 + r() * 34 : band === 2 ? 2 + r() * 116 : band === 3 ? 23 + r() * 4.5 : 84 + r() * 34;
    const z = band === 0 ? 2 + r() * 33 : band === 1 ? 1.5 + r() * 9.5 : band === 2 ? 1.6 + r() * 1.8 : band === 3 ? 3 + r() * 28 : 12 + r() * 18;
    if (keepClear(x, z)) continue;
    planted++; const kind = r(); kind < .7 ? canopyTree(R, x, z, .85 + r() * .5, r, pick(palettes, r), { cell: .56 }) : kind < .86 ? spookyTree(R, x, z, .8 + r() * .5, r) : pine(R, x, z, .7 + r() * .4, r);
  }
  for (let i = 0; i < 1300; i++) { const x = 1 + r() * 118, z = 1 + r() * 34; if (keepClear(x, z, .6)) continue; r() < .3 ? bush(R, x, z, .9, r) : flower(R, x, z, pick(C.flowers, r), r); }
  // A hedgerow inside the south wall, and wild flowers along it.
  for (let x = 2; x < 118; x += .9) { if (Math.abs(x - 58) < 7.5 || pondClear(x, 2)) continue; bush(R, x, 1.7, .9, r, C.hedge); if (r() < .5) flower(R, x + .4, 2.6, pick(C.flowers, r), r); }
  // The pond: a stone rim, reeds, lily pads and a little arched footbridge.
  const P2 = FIXTURES.pond;
  for (let i = 0; i < 44; i++) { const a = i / 44 * Math.PI * 2; R.block(P2.x + Math.cos(a) * (P2.w / 2 + .3), 0, P2.z + Math.sin(a) * (P2.d / 2 + .3), .7, .26 + r() * .2, .7, vary(pick(C.stone, r), .06, r)); }
  for (let i = 0; i < 30; i++) { const a = r() * Math.PI * 2, k = .8 + r() * .18; R.block(P2.x + Math.cos(a) * P2.w / 2 * k, 0, P2.z + Math.sin(a) * P2.d / 2 * k, .07, .8 + r() * .7, .07, vary(0x6a8a3a, .1, r)); if (r() < .4) R.block(P2.x + Math.cos(a) * P2.w / 2 * k, .9 + r() * .4, P2.z + Math.sin(a) * P2.d / 2 * k, .09, .22, .09, 0x6a4a2a); }
  for (let i = 0; i < 12; i++) { const x = P2.x + (r() - .5) * P2.w * .6, z = P2.z + (r() - .5) * P2.d * .5; R.block(x, .07, z, .55, .03, .55, 0x4f8a3a); if (i % 3 === 0) R.block(x + .1, .1, z, .18, .12, .18, 0xf6c8e0); }
  for (let i = 0; i < 9; i++) { const t = i / 8, y = .35 + Math.sin(t * Math.PI) * .7; R.block(P2.x - 1.4 + t * 2.8, y, P2.z + .2, .4, .14, 1.6, vary(C.wood, .06, r)); }
  for (const s of [-1, 1]) { R.block(P2.x, .95, P2.z + .2 + s * .78, 2.8, .08, .08, C.timber); for (const t of [0, .5, 1]) R.block(P2.x - 1.4 + t * 2.8, .4, P2.z + .2 + s * .78, .08, .6 + Math.sin(t * Math.PI) * .7, .08, C.timber); }
  // Your plot: a white picket fence with a gate gap, a painted sign and a meadow waiting to be filled.
  picketFence(R, 4, 8, 22, 8, r); picketFence(R, 4, 26, 22, 26, r); picketFence(R, 4, 8, 4, 26, r); picketFence(R, 22, 8, 22, 15.6, r); picketFence(R, 22, 18.4, 22, 26, r);
  for (const z of [15.6, 18.4]) brickPier(R, 22, z, 1.1, r, "lamp");
  const sign = fr(23.2, 19.4, "east"); sign.block(0, 0, 0, .14, 1.8, .14, C.timber); sign.block(0, 1.3, .12, 1.4, .6, .1, C.woodLight); sign.block(0, 1.36, .18, 1.1, .34, .03, C.cream); sign.block(0, 1.42, .2, .5, .14, .02, C.plum);
  for (let i = 0; i < 60; i++) flower(R, 5 + r() * 16, 9 + r() * 16, pick([0xf6f0f5, 0xf5d04a, 0x9a6ae0], r), r, .8);
  scarecrow(fr(19.5, 23, "east"), 0, 0, r, 2); for (let i = 0; i < 7; i++) pumpkin(R, 17 + r() * 3.5, 20 + r() * 2.5, .34 + r() * .2, r, pick(["orange", "orange", "gold", "white"], r));
  // The Moor's corner and the roads north are shut by gates for now.
  // ---- Lantern Night on the Green: pumpkins everywhere, lights strung across the square and the avenue.
  let face = 0;
  for (const z of [1.9, 4.6, 6.2, 7.7, 13.2, 15.6]) { jackOLantern(fr(55.45, z, "east"), 0, 0, .46 + r() * .16, r, face++); jackOLantern(fr(60.55, z, "west"), 0, 0, .46 + r() * .16, r, face++); }
  for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * Math.PI * 2, x = F.x + Math.cos(a) * 2.7, z = F.z + Math.sin(a) * 2.7, facing = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? "east" : "west") : (Math.sin(a) > 0 ? "north" : "south"); jackOLantern(fr(x, z, facing), 0, 0, .5, r, face++, .6); }
  const ring = LAMPS.slice(0, 4), head = (l) => [l.x, l.y + .25, l.z];
  for (const [a, b] of [[0, 1], [1, 3], [3, 2], [2, 0]]) { const [ax, ay, az] = head(ring[a]), [bx, by, bz] = head(ring[b]); festoon(R, ax, ay, az, bx, by, bz, 14, .55, undefined, cables); }
  for (const l of ring) { const dx = l.x - F.x, dz = l.z - F.z, d = Math.hypot(dx, dz); festoon(R, l.x, l.y + .25, l.z, F.x + dx / d * 1.8, 5.6, F.z + dz / d * 1.8, 9, .3, undefined, cables); }
  for (const z of [3.2, 9, 14.6]) festoon(R, 55.3, z === 3.2 ? 3.3 : 3.5, z, 60.7, z === 3.2 ? 3.3 : 3.5, z, 12, .6, undefined, cables);
  for (const [x, z] of [[55.3, 3.2], [60.7, 3.2], [55.3, 9], [60.7, 9], [55.3, 14.6], [60.7, 14.6]]) cornSheaf(R, x + (x < 58 ? -.28 : .28), z + .3, 1.7, r);
  for (const [x, s] of [[52.6, -1], [63.4, 1]]) { hayBale(R, x, 2.3, r, false); hayBale(R, x + s * .9, 2.3, r, false); hayBale(R, x + s * .45, 2.3, r, false, .55); jackOLantern(fr(x + s * .45, 2.1, "north"), 0, 0, .55, r, face++, 1.1); pumpkin(R, x - s * .8, 3.2, .5, r, "white"); pumpkin(R, x - s * .2, 3.5, .62, r); pumpkin(R, x + s * .5, 3.4, .42, r, "green"); cornSheaf(R, x + s * 1.6, 2.2, 1.9, r); }
  for (const [x0, z0, x1, z1] of [[48.6, 8, 54.4, 15.6], [61.6, 8, 66.4, 15.6]]) for (let i = 0; i < 7; i++) { const x = x0 + 1.2 + r() * (x1 - x0 - 2.4), z = z0 + 1.2 + r() * (z1 - z0 - 2.4); if (Math.hypot(x - (x0 + x1) / 2, z - (z0 + z1) / 2) < 1.6) continue; pumpkin(R, x, z, .32 + r() * .14, r, pick(["orange", "orange", "white", "gold"], r)); }
  pumpkin(R, W2.x + 1.3, W2.z - 1.5, .55, r); pumpkin(R, W2.x + 1.8, W2.z - 1.1, .38, r, "white"); crow(R, W2.x + .4, W2.z, 3.05, r);
  for (const [dx, k] of [[-.7, .5], [-.1, .38], [.5, .46]]) pumpkin(R, FIXTURES.noticeboard.x + dx, FIXTURES.noticeboard.z - .8, k, r, dx > 0 ? "gold" : "orange");
  for (let i = 0; i < 8; i++) crow(R, 10 + i * 13.7 + r() * 3, .7, 1.32, r);
  // The Green's own pumpkin patch, east of the avenue: vines in rows, pumpkins of every size, a scarecrow and a barrow.
  for (let row = 0; row < 4; row++) {
    const z = 3.2 + row * 1.5;
    R.block(74.5, 0, z, 13.2, .1, 1.1, 0x4a3828);
    for (let x = 68.2; x < 81; x += .42) { R.block(x, .1, z + Math.sin(x * 2.1 + row) * .25, .44, .1, .22, vary(0x3f6a2f, .12, r)); if (r() < .45) R.block(x + (r() - .5) * .3, .12, z + (r() - .5) * .7, .3, .14, .3, vary(pick([0x4f7a35, 0x5a8a3c, 0x3f6a2f], r), .1, r)); }
    for (let i = 0; i < 8; i++) { const x = 68.6 + i * 1.6 + r() * .8; r() < .18 ? jackOLantern(fr(x, z, "south"), 0, 0, .5 + r() * .25, r, face++, .1) : pumpkin(R, x, z + (r() - .5) * .3, .32 + r() * .45, r, pick(["orange", "orange", "orange", "gold", "white", "green"], r), .1); }
  }
  scarecrow(fr(80.6, 5.4, "south"), 0, 0, r, 1); crow(R, 80.1, 5.4, 2.66, r); crow(R, 81.3, 5.4, 2.6, r);
  { const b = fr(67.2, 5, "east"); b.block(0, .35, 0, 1.1, .4, .75, 0x4a6a8a); b.block(.65, .15, 0, .3, .3, .1, 0x2a2228); for (const s of [-1, 1]) b.block(-.7, .35, s * .28, .7, .06, .06, C.timber); pumpkin(b, -.15, -.1, .38, r, "orange", .75); pumpkin(b, .2, .15, .3, r, "white", .75); }
  // Rows of dry corn west of the avenue, rustling in the dark, with a scarecrow keeping watch.
  for (const z of [6.2, 7.6, 9.0]) for (let x = 30.2; x < 46.2; x += .48) { if (r() < .12) continue; const h = 1.7 + r() * .7; R.block(x, 0, z, .08, h, .08, vary(0xc0a060, .1, r)); R.block(x + .12, h * .55, z, .3, .05, .06, vary(0xb09050, .1, r)); R.block(x - .1, h * .75, z + .05, .26, .05, .06, vary(0xb09050, .1, r)); if (r() < .25) R.block(x + .08, h * .5, z + .08, .1, .26, .1, 0xd8b050); }
  scarecrow(fr(38, 7.6, "south"), 0, 0, r, 0); crow(R, 37.4, 7.6, 2.66, r);
  for (let i = 0; i < 5; i++) pumpkin(R, 31 + i * 3.4 + r(), 5.5 + r() * .3, .3 + r() * .2, r, pick(["orange", "gold"], r));
  // The Velvet Bat: an old gothic tavern for bats and night folk, facing the Moor road, its host at the door.
  // Flagstones from its terrace gate to the road, crooked trees round it, crows on the ridge and roses at its feet.
  velvetBat(fr(102, 24.4, "north"), r);
  for (let z = 29.8; z < 31.2; z += .46) for (const dx of [-.8, 0, .8]) R.block(102 + dx + (r() - .5) * .1, 0, z, .74, .06, .42, vary(pick(C.stone, r), .05, r));
  for (const [x, z, k] of [[92.6, 28.6, 1.15], [111.4, 27.8, 1.05], [112.4, 20.8, 1.2], [91.4, 14.4, .95], [112.2, 12.8, .9]]) spookyTree(R, x, z, k, r);
  for (const dx of [-3.6, 1.2, 4.6]) crow(R, 102 + dx, 18.4, 12.3, r);
  for (let i = 0; i < 26; i++) { const side = i % 2 ? 1 : -1, x = 102 + side * (2.3 + r() * 3.2), z = 24.9 + r() * .5; flower(R, x, z, pick([0xb01a32, 0x7a1028, 0x2a1a2a, 0xd84060], r), r, .7); }
  for (const s of [-1, 1]) jackOLantern(fr(102 + s * 1.15, 30.1, "north"), 0, 0, .5, r, 7 + s, 0);
  // The old moth-yard in the south-east corner: leaning stones, candles, a crooked railing and a lamp.
  const MY = { x0: 85.5, z0: 1.5, x1: 94.5, z1: 10.5 };
  for (const [a, b, c, d] of [[MY.x0, MY.z0, MY.x1, MY.z0], [MY.x0, MY.z1, MY.x1, MY.z1], [MY.x0, MY.z0, MY.x0, MY.z1]]) railing(R, a, b, c, d, .95);
  railing(R, MY.x1, MY.z0, MY.x1, 5, .95); railing(R, MY.x1, 7, MY.x1, MY.z1, .95); for (const [x, z] of [[MY.x0, MY.z0], [MY.x1, MY.z0], [MY.x0, MY.z1], [MY.x1, MY.z1], [MY.x1, 5], [MY.x1, 7]]) brickPier(R, x, z, 1.25, r, "lamp");
  for (let i = 0; i < 12; i++) { const gx = MY.x0 + 1.4 + (i % 4) * 2, gz = MY.z0 + 1.8 + (i >> 2) * 2.6; gravestone(fr(gx + (r() - .5) * .4, gz, "east"), 0, 0, r, i); }
  spookyTree(R, 87.2, 9, 1.15, r); spookyTree(R, 93, 2.8, .9, r);
  lampPost(R, 95.4, 6, 3.2, r, 1);
  const group = v.build({ detailShadows: false, glow: GLOW }), wire = cableMesh(cables); if (wire) group.add(wire);
  return group;
}

// ---- The terraces' walls, stairs, the moat's bridge and the waterfalls -------------
const WALL_STYLE = { "quarry": "cliff", "quarry-top": "cliff", manor: "crag", observatory: "crag", copse: "wall", moor: "wall", moat: "bank", marsh: "bank" };
export function buildTerrainWorks() {
  const v = new ChunkedVoxels(30), r = seeded(613), R = onGround(v);
  const pale = [0xd8d0c0, 0xcbc2b2, 0xe2dacb, 0xbfb6a6], dark = [0x4a4250, 0x3e3846, 0x564c5c], stone = C.stone;
  // Walls along every terrace edge that drops to lower ground: pale cliffs on the Quarry's island,
  // dark crags under the manor and the observatory, dressed retaining walls round the Copse and the Moor.
  for (const T of TERRACES) {
    for (const [ax, az, bx, bz, nx, nz] of [[T.x0, T.z0, T.x1, T.z0, 0, -1], [T.x0, T.z1, T.x1, T.z1, 0, 1], [T.x0, T.z0, T.x0, T.z1, -1, 0], [T.x1, T.z0, T.x1, T.z1, 1, 0]]) {
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / .8)), along = Math.abs(bx - ax) > .01;
      for (let i = 0; i < n; i++) {
        const t = (i + .5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        const inY = H(x - nx * .4, z - nz * .4), outY = H(x + nx * .6, z + nz * .6), outT = terraceAt(x + nx * .6, z + nz * .6);
        if (Math.abs(inY - T.y) > .05 || rampAt(x + nx * .6, z + nz * .6) || rampAt(x - nx * .4, z - nz * .4)) continue;
        const hi = Math.max(inY, outY), lo = Math.min(inY, outY);
        if (hi - lo < .3 || (inY < outY && outT)) continue;
        const style = inY > outY ? WALL_STYLE[T.id] : WALL_STYLE[outT?.id] ?? "bank", seg = len / n;
        const put = (dx, y0, y1, w, d, c) => v.block(x + dx * nx, y0, -(z + dx * nz), along ? w : d, y1 - y0, along ? d : w, c);
        if (style === "cliff" || style === "crag") {
          // Rough cliff: stacked blocks that jut and recess, with ledges, ivy and the odd lantern.
          const pal = style === "cliff" ? pale : dark;
          for (let y = lo - .6; y < hi; y += .7) { const j = (r() - .5) * .3, top = Math.min(hi, y + .7); put(j * .5 - .1, y, top + (top >= hi ? 0 : .02), seg + .08, 1.15 + j, vary(pick(pal, r), .06, r)); }
          if (style === "cliff" && r() < .08) { const c = frame(v, x + nx * .75, z + nz * .75, nx ? (nx > 0 ? "east" : "west") : (nz > 0 ? "north" : "south"), hi - 1.4); lantern(c, 0, 0, 0, .8); }
          put(-.1, hi - .02, hi + .14, seg + .1, 1.2, vary(style === "cliff" ? 0xc8bfae : 0x3a3442, .05, r));
        } else if (style === "wall") {
          // Dressed retaining wall in courses, a coping on top, moss and ivy, lanterns now and then.
          for (let y = lo - .4, k = 0; y < hi; y += .45, k++) put(-.05 + (k % 2) * .04, y, Math.min(hi, y + .45) - .02, seg - .03, 1.0, vary(pick(stone, r), .06, r));
          put(0, hi, hi + .22, seg + .04, 1.15, C.stone[3]);
          if (i % 9 === 4) { const c = frame(v, x + nx * .2, z + nz * .2, "south", hi + .22); c.block(0, 0, 0, .34, .5, .34, C.stone[1]); lantern(c, 0, .5, 0, .9); }
          if (T.id === "moor" && inY > outY) for (let k = 0; k < 3; k++) put(-.25, hi + .22, hi + 1.1, .04, .04, C.iron);
        } else {
          // A stone bank down to the water.
          for (let y = lo - .6; y < hi; y += .5) put(-.1, y, Math.min(hi, y + .5), seg + .04, 1.1, vary(pick(C.stoneDark, r), .06, r));
          put(0, hi - .02, hi + .14, seg + .06, 1.2, C.stone[2]);
        }
      }
    }
  }
  // Stairs: steps in stone across every slope but the Moor's ramp, with balustrades and a lamp at each end.
  for (const S of RAMPS) {
    if (S.bridge || S.id === "moor-ramp") continue;
    const along = S.axis === "z", len = along ? S.z1 - S.z0 : S.x1 - S.x0, wid = along ? S.x1 - S.x0 : S.z1 - S.z0, steps = Math.max(2, Math.round(Math.abs(S.to - S.from) / .28)), base = Math.min(S.from, S.to) - 2.4;
    const pal = S.id.startsWith("quarry") || S.id.startsWith("marsh-stairs") ? pale : stone;
    for (let k = 0; k < steps; k++) {
      const t0 = k / steps, t1 = (k + 1) / steps, a = (along ? S.z0 : S.x0) + len * t0, b = (along ? S.z0 : S.x0) + len * t1, y = S.from + (S.to - S.from) * ((t0 + t1) / 2) + Math.abs(S.to - S.from) / steps / 2, m = (a + b) / 2;
      const cx = along ? (S.x0 + S.x1) / 2 : m, cz = along ? m : (S.z0 + S.z1) / 2;
      v.block(cx, base, -cz, along ? wid - .1 : b - a + .02, y - base, along ? b - a + .02 : wid - .1, vary(pick(pal, r), .04, r));
      v.block(cx, y - .04, -cz, along ? wid - .1 : b - a + .02, .06, along ? b - a + .02 : wid - .1, vary(pick(pal, r), .03, r));
    }
    for (const side of [-1, 1]) {
      for (let k = 0; k <= Math.round(len / .7); k++) { const t = k / Math.round(len / .7), y = S.from + (S.to - S.from) * t, x = along ? (side < 0 ? S.x0 : S.x1) : S.x0 + len * t, z = along ? S.z0 + len * t : (side < 0 ? S.z0 : S.z1); v.block(x, base, -z, .5, y + .9 - base, .5, vary(pick(pal, r), .05, r)); v.block(x, y + .9, -z, .58, .1, .58, C.stone[3]); }
      for (const t of [0, 1]) { const y = t ? S.to : S.from, x = along ? (side < 0 ? S.x0 : S.x1) : (t ? S.x1 : S.x0), z = along ? (t ? S.z1 : S.z0) : (side < 0 ? S.z0 : S.z1); lampPost(frame(v, x, z, "south", y + 1), 0, 0, 2.4, r, 1); }
    }
  }
  // The moat's bridge: a stone deck on two arches, parapets, and an iron gate at the island's end.
  { const B = RAMPS.find((x) => x.bridge), cx = (B.x0 + B.x1) / 2, w = B.x1 - B.x0;
    for (let z = B.z0; z < B.z1; z += .5) v.block(cx, -.55, -(z + .25), w + .3, .55, .5, vary(pick(pale, r), .04, r));
    for (const side of [-1, 1]) for (let z = B.z0; z < B.z1; z += .5) { v.block(cx + side * (w / 2 + .1), 0, -(z + .25), .4, .85, .5, vary(pick(pale, r), .05, r)); v.block(cx + side * (w / 2 + .1), .85, -(z + .25), .5, .1, .52, C.stone[3]); }
    for (const pz of [B.z0 + 1.6, B.z1 - 1.6]) for (const side of [-1, 0, 1]) v.block(cx + side * 2.2, -2.4, -pz, 1.2, 1.9, 1.2, vary(pick(pale, r), .04, r));
    for (let a = 0; a <= 8; a++) { const t = a / 8, z = B.z0 + .6 + t * (B.z1 - B.z0 - 1.2), y = -.55 - Math.sin(t * Math.PI) * 0 - (1 - Math.sin(t * Math.PI)) * 1.4; v.block(cx, y - .4, -z, w + .2, .4, .8, vary(pick(pale, r), .05, r)); }
    for (const side of [-1, 1]) { const p = frame(v, cx + side * 3.3, B.z1 - .3, "south", H(cx, B.z1 + .5)); for (let k = 0; k < 6; k++) p.block(0, k * .5, 0, .95, .5, .95, vary(pick(pale, r), .04, r)); p.block(0, 3, 0, 1.15, .16, 1.15, C.stone[3]); lantern(p, 0, 3.16, 0, .9); }
    for (let i = 0; i < 15; i++) { const x = cx - 2.8 + i * .4, top = 2.3 + Math.sin(i / 14 * Math.PI) * .5; v.block(x, H(cx, B.z1) + .1, -(B.z1 - .3), .05, top, .05, C.iron); if (i % 2) v.block(x, H(cx, B.z1) + .1 + top, -(B.z1 - .3), .08, .12, .08, C.gold); }
    for (const y of [.5, 1.4, 2.2]) v.block(cx, H(cx, B.z1) + .1 + y, -(B.z1 - .3), 5.8, .05, .05, C.iron); }
  // The moat's railing along the Green's side of the water, gapped for the bridge.
  { const mz = 37.25 + SHIFT.quarry[1]; for (const [a, b] of [[39.5, 54.6], [61.4, 86.4]]) { railing(R, a, mz, b, mz, 1.0); for (let x = a; x <= b; x += 5) brickPier(R, x, mz, 1.3, r, "lamp"); } }
  // The waterfalls' rocks and foam where they land.
  for (const f of FALLS) { for (let i = 0; i < 14; i++) v.block(f.x + f.dir * (.6 + r() * 1.6), f.foot - .4, -(f.z + (r() - .5) * 3), .5 + r() * .5, .3 + r() * .4, .5 + r() * .5, vary(pick(pale, r), .06, r)); for (let i = 0; i < 10; i++) v.block(f.x + f.dir * (.4 + r() * 1.2), f.foot + .02, -(f.z + (r() - .5) * 2.4), .3, .06, .3, 0xe8f6ff, true); }
  return v.build({ detailShadows: false, glow: GLOW });
}

// The parts that change: Rowan's stall, the bench, the two homes, the gathering spots.
export function buildStall(open) {
  const v = new Voxels(), s = FIXTURES.stall, f = at(v, s.x, s.z, s.facing), r = seeded(223); stall(f, 0, 0, open);
  // Pumpkins by the stall: a display when it's open, a few waiting when it isn't.
  if (open) { for (const [x, z, k, kind] of [[-1.3, 2, .5, "orange"], [-.7, 2.2, .38, "white"], [1.3, 2.1, .46, "gold"], [.8, 2.3, .34, "green"]]) pumpkin(f, x, z, k, r, kind); jackOLantern(f, -1.3, 2, .4, r, 1, .5); }
  else for (const [x, z, k] of [[-1.4, 1.8, .45], [1.2, 1.6, .36]]) pumpkin(f, x, z, k, r);
  return v.build({ glow: GLOW });
}
export function buildBench(mended) { const v = new Voxels(), b = FIXTURES.bench; bench(at(v, b.x, b.z, b.facing), 0, 0, mended); return v.build(); }
export function buildHomes(built) {
  const v = new Voxels(), r = seeded(211), R = onGround(v);
  // Rowan's plot (02: x 66-82, z 8-28, door at x 66 facing west); Elowen's (01: x 28-48, door at x 48 facing east).
  workshop(at(v, 66.6, 20, "west"), !!built["rowan-workshop"], r);
  conservatory(at(v, 47.4, 20, "east"), !!built["elowen-conservatory"], r);
  for (const [x0, z0, x1, z1] of [[67, 9, 81.5, 9], [67, 27, 81.5, 27], [81.5, 9, 81.5, 27]]) picketFence(R, x0, z0, x1, z1, r);
  for (const [x0, z0, x1, z1] of [[28.5, 11, 46.5, 11], [28.5, 29, 46.5, 29], [28.5, 11, 28.5, 29]]) picketFence(R, x0, z0, x1, z1, r);
  // Borders along the fences, and each garden's trees.
  flowerBed(R, 67.6, 9.6, 81, 10.6, r, [0xf08a3a, 0xf5d04a, 0xe0403a]); flowerBed(R, 75, 25.4, 81, 26.4, r, [0xf08a3a, 0xf5d04a]);
  flowerBed(R, 29.2, 11.6, 39, 12.6, r, [0x9a6ae0, 0xf28fb5, 0xf6f0f5]); flowerBed(R, 29.2, 27.4, 38.5, 28.4, r, [0x9a6ae0, 0x6a8ef0, 0xf6f0f5]);
  canopyTree(R, 70.6, 25.4, 1.5, r, C.crimson, { cell: .32 }); canopyTree(R, 79, 21, 1.1, r, C.golden); canopyTree(R, 78.6, 13.4, 1, r, C.green);
  canopyTree(R, 31, 25.5, 1.25, r, C.golden); canopyTree(R, 31.5, 14.5, 1, r, C.crimson); canopyTree(R, 35.5, 20, .9, r, C.green);
  // A vegetable patch behind the workshop; a herb bed by the library.
  for (let i = 0; i < 4; i++) { R.block(76 + i * 1.3, 0, 17, .9, .18, 5, 0x5a3e2a); for (let k = 0; k < 6; k++) R.block(76 + i * 1.3, .18, 15 + k * .8, .4, .3, .4, i % 2 ? 0x6aa84f : 0x4f8a3a); }
  for (let k = 0; k < 8; k++) flower(R, 34 + (k % 4) * .6, 16 + (k >> 2) * .6, 0x9a6ae0, r, 1.2);
  // Doorstep lanterns, and a scarecrow in Rowan's vegetables.
  jackOLantern(at(v, 48.6, 17.6, "east"), 0, 0, .5, r, 0); jackOLantern(at(v, 48.7, 22.2, "east"), 0, 0, .42, r, 2); pumpkin(R, 48.9, 22.9, .34, r, "white");
  jackOLantern(at(v, 65.4, 18.4, "west"), 0, 0, .5, r, 1); jackOLantern(at(v, 65.4, 21.6, "west"), 0, 0, .44, r, 0); pumpkin(R, 65.1, 17.7, .36, r, "gold");
  scarecrow(at(v, 80.6, 17.5, "west"), 0, 0, r, 0);
  return v.build({ glow: GLOW });
}
export function buildNodes(ready) {
  const v = new Voxels(), r = seeded(307);
  for (const n of NODES.filter((n) => n.district === "green")) node(at(v, n.x, n.z, ["south", "east", "north", "west"][Math.round(n.x + n.z) % 4]), n.material, ready(n.id), r);
  return v.build({ glow: GLOW });
}

// ---- Beyond the Green: the four districts, after the concept atlas -----------------
export function buildBeyond() {
  const v = new ChunkedVoxels(28), r = seeded(401), base = onGround(v), cables = [];
  // Each district is drawn in its own place on the grid and moved to where it now stands (SHIFT).
  const district = (d) => { const [dx, dz] = SHIFT[d]; return { R: { block: (x, y, z, w, h, dd, c, g) => { base.block(x + dx, y, z + dz, w, h, dd, c, g); }, mark: (k, x, y, z) => base.mark(k, x + dx, y, z + dz) }, fr: (x, z, facing) => at(v, x + dx, z + dz, facing), road: (x, z, pad) => onRoad(x + dx, z + dz, pad), dx, dz }; };
  const near = (x, z, list, d) => list.some(([a, b]) => Math.hypot(x - a, z - b) < d);
  const onRoad = (x, z, pad = 1.2) => ROADS.some((rd) => rd.points.some((p, i) => i && Math.abs(x - (p[0] + rd.points[i - 1][0]) / 2) < Math.abs(p[0] - rd.points[i - 1][0]) / 2 + rd.width / 2 + pad && Math.abs(z - (p[1] + rd.points[i - 1][1]) / 2) < Math.abs(p[1] - rd.points[i - 1][1]) / 2 + rd.width / 2 + pad));

  {
  const { R, fr, road } = district("copse");
  // ---- Moonroot Copse (west, on its shelf): a deep wood of moonroots, autumn crowns and dark pines,
  // glowing toadstools, Mabel's haberdashery and Tansy's herb cottage in fenced gardens, a moonstone circle.
  const copseKeep = (x, z) => road(x, z, 1.4) || (x > 4 && x < 27.5 && (z > 40.5 && z < 57 || z > 59 && z < 79.5)) || x > 3 && x < 23 && z > 79 && z < 93 || Math.hypot(x - 32, z - 90) < 4.5 || x > 37.4 || z < 41;
  for (let i = 0, n = 0; i < 1600 && n < 95; i++) { const x = 0 + r() * 38.5, z = 41 + r() * 56; if (copseKeep(x, z)) continue; n++; const k = r(); k < .45 ? twistedTree(R, x, z, 1 + r() * .7, r) : k < .68 ? canopyTree(R, x, z, 1 + r() * .5, r, pick([C.crimson, C.golden, C.violet], r), { cell: .5 }) : k < .86 ? pine(R, x, z, 1 + r() * .5, r) : spookyTree(R, x, z, .9 + r() * .4, r); }
  for (let i = 0; i < 160; i++) { const x = r() * 38, z = 41 + r() * 56; if (road(x, z, .6)) continue; r() < .55 ? glowShroom(R, x, z, r, r() < .5 ? 0x7fe8d0 : 0xd59cff) : r() < .6 ? bush(R, x, z, .9, r, [0x3f5a4a, 0x4a6a52, 0x5a3a5a]) : flower(R, x, z, pick([0x9a6ae0, 0xd6a6ff, 0xf6f0f5], r), r); }
  cottage(fr(24, 48, "east"), { w: 8, d: 7, h: 3.2, roof: C.slatePlum, plaster: C.plasterRose, r, doorColour: 0x6a2f58, shutter: 0x8a4a6a, sign: C.plum, ridge: "z" });
  { const aw = fr(24, 48, "east"); for (let i = 0; i < 9; i++) for (let k = 0; k < 3; k++) aw.block(-3.6 + i * .44 + .22, 2.6 - k * .14, .5 + k * .4, .44, .1, .42, i % 2 ? C.cream : 0x6a2f58);
    for (const dx of [-2.4, 2.4]) { aw.block(dx, 0, 1.4, .5, 1.6, .5, 0xf0e6d8); aw.block(dx, 1.6, 1.4, .3, .3, .3, 0xd8c8b0); aw.block(dx, .5, 1.4, .7, .9, .5, pick([0x6a2f58, 0x3d4a7a, 0xa8172c], r)); } }
  for (const [x0, z0, x1, z1] of [[6, 41, 23, 41], [6, 56, 23, 56], [6, 41, 6, 56], [6, 60, 23, 60], [6, 78, 23, 78], [6, 60, 6, 78]]) picketFence(R, x0, z0, x1, z1, r);
  for (let i = 0; i < 4; i++) flowerBed(R, 8 + i * 3.4, 43, 10.4 + i * 3.4, 46, r, [[0xd6407a, 0xf6f0f5], [0x9a6ae0, 0xf5d04a], [0xf28fb5, 0xd6407a], [0xf08a3a, 0x9a6ae0]][i], 6);
  cottage(fr(24, 68, "east"), { w: 8, d: 7, h: 3, roof: C.roofMoss, plaster: C.plasterSage, r, doorColour: 0x4a6a3a, shutter: 0x4a6a3a });
  { const gh = fr(20, 74.5, "east"); for (let i = 0; i < 6; i++) { gh.block(-2.5 + i, 0, 0, .08, 2.2, .08, C.iron); gh.block(-2.5 + i + .5, .1, .02, .9, 2, .04, 0xd8f0d8, true); } gh.block(0, 2.2, -1, 6, .1, 2.2, 0xc8e8c8, true); gh.block(0, 2.2, -1, 6.1, .06, .1, C.iron); }
  for (let i = 0; i < 6; i++) { const x = 9 + (i % 3) * 4, z = 63 + (i >> 1 & 1) * 0 + Math.floor(i / 3) * 5; R.block(x, 0, z, 3, .45, 1.6, C.wood); for (let k = 0; k < 9; k++) flower(onGround({ block: (bx, by, bz, w, h, d, c, g) => v.block(bx, by + .45, bz, w, h, d, c, g) }), x - 1.2 + (k % 3) * 1.2, z - .5 + (k / 3 | 0) * .5, pick([0x6aa84f, 0x9a6ae0, 0x5d9440, 0xf6f0f5], r), r, 1.3); }
  for (let k = 0; k < 9; k++) { const a = k / 8 * Math.PI; R.block(17 + Math.cos(a) * 1.4, Math.sin(a) * 2.6, 61, .3, .3, .3, k % 2 ? 0xf6f0f5 : C.hedge[1]); }
  cauldron(R, 27.4, 65.4, r); for (const [x, z] of [[26.6, 50.4], [26.4, 45.4], [26.4, 70.4], [26.6, 65.8]]) jackOLantern(fr(x, z, "east"), 0, 0, .46, r, (x * 3) | 0);
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; R.block(32 + Math.cos(a) * 3.2, 0, 90 + Math.sin(a) * 3.2, .8, 2.2 + (i % 3) * .5, .6, vary(0x9a9aac, .08, r)); R.block(32 + Math.cos(a) * 3.2, 1.2, 90 + Math.sin(a) * 3.2 + .32, .3, .3, .03, 0x9ff8e8, true); }
  for (let i = 0; i < 10; i++) gravestone(fr(8 + (i % 5) * 2.6, 84 + (i / 5 | 0) * 3, "east"), 0, 0, r, i);
  // The bramble arch at the top of the Copse stairs.
  for (let i = 0; i < 17; i++) { const a = i / 16 * Math.PI; R.block(30 + Math.cos(a) * 3.4, Math.sin(a) * 3.8, 40.6, .8, .8, .8, vary(0x3f5a3a, .12, r)); if (i % 2) R.block(30 + Math.cos(a) * 3.4, Math.sin(a) * 3.8 + .5, 40.2, .2, .2, .2, 0x7a2a6a); }
  for (let i = 0; i < 40; i++) R.block(27 + r() * 6, r() * 2.4, 40.2 + r() * .8, .3, .3, .3, pick([0x3f5a3a, 0x2f4a32, 0x7a2a6a, 0x5a2a4a], r));

  }
  {
  const { R, fr, road } = district("quarry");
  // ---- Lantern Quarry (its island): Opal's studio and Cinder's restaurant on the lower tier,
  // the cut terraces, a crane, block stacks, a mine cart and the Lantern Spire on the upper.
  studio(fr(51.6, 54, "east"), r);
  tavern(fr(66.6, 50, "west"), r);
  for (const [x, z, k] of [[47.6, 46, 1], [76.6, 46, .9], [79, 56, 1.1], [46.6, 67, .9], [75.4, 69.4, 1]]) canopyTree(R, x, z, k, r, pick([C.crimson, C.golden], r), { cell: .4 });
  for (let k = 0; k < 4; k++) for (let i = 0; i < 6 - k; i++) R.block(48 + i * 1.6 + k * .8, k * .9, 66 + k * 1.2, 1.6, .9, 1.6, vary(pick([0xd8d0c0, 0xcbc2b2, 0xe2dacb], r), .05, r));
  for (let i = 0; i < 14; i++) { const x = 70 + (i % 4) * 1.1, z = 60.5 + (i / 4 | 0) * 1.1; for (let k = 0; k < 1 + (i % 3); k++) R.block(x, k * .8, z, 1, .8, 1, vary(pick([0xd8d0c0, 0xcbc2b2], r), .05, r)); }
  { const crane = fr(77.5, 65.5, "west"); for (let k = 0; k < 16; k++) crane.block(0, k * .6, 0, .4, .6, .4, C.timber); for (let k = 0; k < 8; k++) crane.block(-.6 - k * .7, 9.4 + k * .06, 0, .7, .3, .3, C.timber); crane.block(-5.6, 7.6, 0, .05, 2, .05, C.iron); crane.block(-5.6, 7.2, 0, .9, .6, .9, 0xd8d0c0); crane.block(0, 0, 0, 1.4, .4, 1.4, C.stone[2]); for (const s of [-1, 1]) crane.block(s * .5, 3, 0, .1, 6, .1, C.timber); }
  for (let x = 47; x < 70; x += .6) { R.block(x, .02, 62.6, .5, .04, .1, C.iron); R.block(x, .02, 63.6, .5, .04, .1, C.iron); R.block(x, 0, 63.1, .16, .06, 1.3, C.timber); }
  { const cart = fr(56, 63.1, "east"); cart.block(0, .4, 0, 1, .6, 1.6, 0x5a4a3a); cart.block(0, 1, 0, .9, .3, 1.4, 0xd8d0c0); for (const s of [-1, 1]) for (const t of [-.5, .5]) cart.block(s * .55, .1, t, .1, .4, .4, C.iron); }
  for (let i = 0; i < 4; i++) { const t = fr(61.6 + (i % 2) * 1.8, 46.6 + (i >> 1) * 5.6); t.block(0, 0, 0, .9, .7, .9, C.wood); t.block(0, .7, 0, 1.1, .08, 1.1, C.cream); lantern(t, 0, .78, 0, .55); }
  for (const [x, z] of [[61.4, 44.6], [61.4, 52], [54.6, 51], [54.6, 57.4], [61.4, 59.6], [54.6, 64]]) jackOLantern(fr(x, z, x > 58 ? "west" : "east"), 0, 0, .5, r, (z * 7) | 0);
  { const sp = fr(64, 66.5); // The Lantern Spire.
    for (let k = 0; k < 16; k++) { const w = 4.2 - k * .1; sp.block(0, k * 1.1, 0, w, 1.1, w, vary(pick([0xd8d0c0, 0xcbc2b2, 0xe2dacb], r), .04, r)); if (k % 3 === 1) for (const [dx, dz] of [[0, w / 2], [0, -w / 2], [w / 2, 0], [-w / 2, 0]]) sp.block(dx, k * 1.1 + .15, dz, dx ? .06 : .6, .8, dz ? .06 : .6, C.window, true); }
    for (const [dx, dz] of [[2.2, 2.2], [-2.2, 2.2], [2.2, -2.2], [-2.2, -2.2]]) for (let k = 0; k < 6; k++) sp.block(dx * (1 - k * .06), k * 1.6, dz * (1 - k * .06), .7, 1.6, .7, vary(pick([0xd8d0c0, 0xcbc2b2], r), .04, r));
    sp.block(0, 17.6, 0, 3.6, .3, 3.6, C.stone[3]); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; sp.block(Math.cos(a) * 1.7, 17.9, Math.sin(a) * 1.7, .1, .6, .1, C.iron); }
    sp.block(0, 17.9, 0, 2.2, 2.4, 2.2, 0xffc060, true); for (const [dx, dz] of [[1.1, 1.1], [-1.1, 1.1], [1.1, -1.1], [-1.1, -1.1]]) sp.block(dx, 17.9, dz, .2, 2.4, .2, C.iron);
    for (let k = 0; k < 5; k++) sp.block(0, 20.3 + k * .4, 0, 2.8 - k * .55, .4, 2.8 - k * .55, vary(pick(C.slatePlum, r), .04, r));
    sp.block(0, 22.3, 0, .14, 1.2, .14, C.brass); for (const s of [-1, 1]) sp.block(s * .4, 23.1, 0, .6, .5, .08, C.brass); }
  for (let i = 0; i < 30; i++) { const x = 45 + r() * 36, z = 44 + r() * 26; if (road(x, z, .8) || (x > 44 && x < 53 && z > 49 && z < 59) || (x > 60 && x < 76 && z > 44 && z < 56) || Math.hypot(x - 64, z - 66.5) < 3.5) continue; bush(R, x, z, .8, r, C.green); }

  }
  {
  const { R, fr, road, dx, dz } = district("moor");
  // ---- Carnival Moor (east, raised): Corvus's big top, booths and pennants, his caravan,
  // and the Baron's velvet manor on its own crag behind iron railings.
  bigTent(R, 97, 42, 4.6, 7.4, 0x7d4fa3, 0xf0c252, r);
  bigTent(R, 94, 31.5, 3.4, 5.6, 0xa8172c, 0xf3e6c8, r);
  bigTent(R, 114, 16, 2.8, 4.8, 0x4b3a8a, 0xf3e6c8, r);
  caravan(fr(101.6, 48.4, "west"), r);
  for (let i = 0; i < 5; i++) { const b = fr(88 + i * 3.2, 15.5, "north"); b.block(0, 0, 0, 2.4, 1, 1.4, i % 2 ? 0xa8172c : 0x4b3a8a); b.block(0, 1, .6, 2.5, .08, .3, C.cream); for (const s of [-1, 1]) b.block(s * 1.15, 1, 0, .1, 1.5, .1, C.timber); for (let k = 0; k < 5; k++) b.block(-1 + k * .5, 2.5, .2, .5, .12, 1.6, k % 2 ? C.cream : i % 2 ? 0xa8172c : 0x4b3a8a); lantern(b, 0, 2.62, .1, .6); }
  for (const [ax, az, bx, bz] of [[86, 40, 90, 52], [88, 26, 88, 22], [90, 20, 106, 20], [100, 26, 106, 36]]) { if (road(ax, az, .4) || road(bx, bz, .4)) continue; for (const [x, z] of [[ax, az], [bx, bz]]) R.block(x, 0, z, .16, 3.6, .16, C.timber); festoon(R, ax + dx, 3.5 + H(ax + dx, az + dz) - H(ax + dx, az + dz), az + dz, bx + dx, 3.5, bz + dz, 18, .7, undefined, cables); }
  { const mirror = fr(91, 50, "east"); mirror.block(0, 0, 0, 1.2, .3, .8, C.stone[1]); mirror.block(0, .3, 0, 1, 2.2, .14, C.gold); mirror.block(0, .45, .08, .8, 1.9, .03, 0xb8d0ff, true); mirror.block(0, 2.5, 0, .5, .3, .14, C.gold); }
  for (let i = 0; i < 46; i++) { const x = 86 + r() * 34, z = 13 + r() * 40; if (road(x, z, 1) || Math.hypot(x - 97, z - 42) < 6 || Math.hypot(x - 94, z - 31.5) < 4.6 || Math.hypot(x - 114, z - 16) < 4 || (z < 18 && x < 104)) continue; const k = r(); k < .35 ? bush(R, x, z, .9, r, [0x6a4a7a, 0x7d5a8a, 0x5a4a3a]) : k < .55 ? pumpkin(R, x, z, .35 + r() * .3, r, pick(["orange", "gold", "white"], r)) : k < .7 ? jackOLantern(fr(x, z, "west"), 0, 0, .45, r, i) : k < .85 ? spookyTree(R, x, z, .9 + r() * .4, r) : canopyTree(R, x, z, 1 + r() * .4, r, pick([C.crimson, C.golden, C.violet], r), { cell: .42 }); }
  manor(fr(97, 64, "east"), r);
  for (const [x0, z0, x1, z1] of [[90, 56, 104.6, 56], [90, 72, 104.6, 72], [104.6, 56, 104.6, 61.4], [104.6, 66.6, 104.6, 72]]) { railing(R, x0, z0, x1, z1, 1.4); for (const [x, z] of [[x0, z0], [x1, z1]]) brickPier(R, x, z, 1.8, r, "lamp"); }
  for (const [x, z] of [[101, 58], [101, 70], [92, 58.5], [92, 70]]) topiary(R, x, z, 1.1, r, true);
  fountain(R, 101.5, 64, .9, r); for (let i = 0; i < 16; i++) { const a = r() * Math.PI * 2, d = 2 + r() * 1.4; bush(R, 101.5 + Math.cos(a) * d * .6, 64 + Math.sin(a) * d, .7, r, [0x7a1a2a, 0x8a2236, 0x3f5a35]); }

  }
  {
  const { R: Rl, fr, dx, dz } = district("marsh");
  // ---- Mirror Marsh (low, behind it all): islands of reeds and dead trees, glowing wisps,
  // stilt huts, boardwalks, a ruined arch, and the observatory's tower on its own island.
  for (const I of MARSH_ISLANDS) { const R = base; if (Math.hypot(I.x - 85, I.z - 88.5) < 2) continue; for (let i = 0; i < I.rx * I.rz * 1.4; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()), x = I.x + Math.cos(a) * I.rx * d * .9, z = I.z + Math.sin(a) * I.rz * d * .9, k = r(); k < .12 ? deadTree(R, x, z, .9 + r() * .7, r) : k < .2 ? spookyTree(R, x, z, .8 + r() * .5, r) : k < .65 ? R.block(x, 0, z, .1, .9 + r() * .9, .1, vary(0x6a8a4a, .1, r)) : k < .8 ? bush(R, x, z, .8, r, [0x3f5a4a, 0x4a6a52]) : glowShroom(R, x, z, r, 0x7fe8d0); } }
  for (let i = 0; i < 90; i++) { const x = 40 + r() * 80, z = 77 + r() * 20; Rl.block(x, .4 + r() * 2.2, z, .16, .16, .16, 0x9ff8e8, true); }
  for (let i = 0; i < 60; i++) { const x = 40 + r() * 80 + dx, z = 77 + r() * 20 + dz; if (!isWater(x, z)) continue; v.block(x, -1.02, -z, .5, .03, .5, 0x3f7a4a); if (i % 4 === 0) v.block(x + .1, -.98, -z, .16, .1, .16, 0xf0d0f0); }
  stiltHut(fr(52, 86, "south"), r); stiltHut(fr(100, 86, "south"), r); stiltHut(fr(112, 92, "west"), r);
  
  for (let z = 112; z < 117.4; z += .5) v.block(85, H(85, z) - .1, -z, 3.6, .12, .45, vary(C.wood, .1, r));
  for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI; Rl.block(70 + Math.cos(a) * 2.6, 0, 92 + Math.sin(a) * 0, .9, Math.sin(a) * 3.6 + 1, .9, vary(pick(C.stoneDark, r), .06, r)); }
  { const R = Rl, ox = 85, oz = 88.5; // The observatory: a round stone tower with a broken dome and a brass telescope.
    for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2; for (let k = 0; k < 5; k++) R.block(ox + Math.cos(t) * 4.2, k * 1.1, oz + Math.sin(t) * 4.2, 1.3, 1.1, 1.3, vary(pick(C.stone, r), .05, r)); if (i % 4 === 0) R.block(ox + Math.cos(t) * 4.85, 2, oz + Math.sin(t) * 4.85, .1, 1.1, .6, C.window, true); }
    for (let k = 0; k < 5; k++) for (let i = 0; i < 18 - k * 2; i++) { if (i % 5 === 2) continue; const t = i / (18 - k * 2) * Math.PI * 2, rr = 4.2 * Math.cos(k / 5 * Math.PI / 2); R.block(ox + Math.cos(t) * rr, 5.5 + Math.sin(k / 5 * Math.PI / 2) * 3.4, oz + Math.sin(t) * rr, .9, .5, .9, k % 2 ? 0x8fa6c8 : 0xa8bcd8); }
    R.block(ox + .6, 6, oz, 1, .8, 3.4, C.brass); R.block(ox + .6, 5.4, oz - 1.2, .4, .8, .4, C.brass); }
  }
  // The districts' gates, shut for now: lantern-topped pillars.
  for (const g of GATES) if (g.id !== "copse-gate" && g.id !== "quarry-bridge") for (const s of [-1, 1]) { const moor = g.id.startsWith("moor"), p = at(v, g.x + (moor ? 0 : s * 3.6), g.z + (moor ? s * 3.6 : 0)); for (let k = 0; k < 5; k++) p.block(0, k * .6, 0, .9, .6, .9, C.stone[k % 4]); p.block(0, 3, 0, 1.1, .14, 1.1, C.stone[3]); lantern(p, 0, 3.14, 0, .8); }
  const group = v.build({ glow: GLOW }), wire = cableMesh(cables); if (wire) group.add(wire);
  return group;
}

// ---- The horizon: woods, mountains and the night sky --------------------------------
// Lantern Night: a deep indigo sky with a plum glow low down, stars and a big moon over the woods.
export const SKY = Object.freeze({ top: 0x03030c, middle: 0x0b0a24, horizon: 0x241838, low: 0x180f22, fog: 0x150f26 });
// ---- The woods between the districts ----------------------------------------------
// Open ground inside the valley that isn't the Green, a district, a road or water grows
// woods: autumn crowns in patches of one colour (violet, magenta, gold, crimson, teal), as
// in the concept painting, pines thickening towards the hills, bushes and glowing toadstools
// underneath, lamps along the roads through them and a signpost where the roads part.
const nearRoad = (x, z, pad) => ROADS.some((rd) => rd.points.some((p, i) => i && Math.abs(x - (p[0] + rd.points[i - 1][0]) / 2) < Math.abs(p[0] - rd.points[i - 1][0]) / 2 + rd.width / 2 + pad && Math.abs(z - (p[1] + rd.points[i - 1][1]) / 2) < Math.abs(p[1] - rd.points[i - 1][1]) / 2 + rd.width / 2 + pad));
export function buildWoods() {
  const v = new ChunkedVoxels(30), R = onGround(v), r = seeded(611);
  const clear = (x, z) => !terraceAt(x, z) && !rampAt(x, z) && !isWater(x, z) && !(x > -1 && x < 121 && z < 37.5);
  const open = (x, z, pad) => clear(x, z) && !nearRoad(x, z, pad) && !GATES.some((g) => Math.hypot(g.x - x, g.z - z) < 7) && [[pad, 0], [-pad, 0], [0, pad], [0, -pad]].every(([a, b]) => clear(x + a, z + b));
  const crowns = [C.violet, C.magenta, C.golden, C.crimson, C.teal, C.leaves, C.violet, C.golden];
  const patch = (x, z) => crowns[Math.floor((Math.sin(x * .085 + z * .047) + Math.sin(z * .103 - x * .041 + 1.3) + 2) * 2) % crowns.length];
  let trees = 0;
  for (let gx = REALM.x0 + 1.5; gx < REALM.x1 - 1; gx += 4.2) for (let gz = REALM.z0 + 1.5; gz < REALM.z1 - 1; gz += 4.2) {
    const x = gx + (r() - .5) * 3.4, z = gz + (r() - .5) * 3.4;
    if (!open(x, z, 2.8)) continue;
    const edge = Math.min(x - REALM.x0, REALM.x1 - x, z - REALM.z0, REALM.z1 - z), k = r();
    if (k < (edge < 14 ? .5 : .2)) pine(R, x, z, .95 + r() * .7, r);
    else if (k < .93) canopyTree(R, x, z, 1 + r() * .65, r, r() < .82 ? patch(x, z) : pick(crowns, r), { cell: .8, litter: false });
    else spookyTree(R, x, z, 1 + r() * .5, r);
    trees++;
    if (r() < .45) { const a = r() * 6.28, d = 1.4 + r(); if (clear(x + Math.cos(a) * d, z + Math.sin(a) * d)) bush(R, x + Math.cos(a) * d, z + Math.sin(a) * d, .8 + r() * .5, r); }
    if (r() < .05) glowShroom(R, x + 1, z + .6, r);
  }
  // Lamps along the roads through the woods and the Green's cross road (LAMPS 25 to 38).
  for (const l of LAMPS.slice(25, 39)) lampPost(R, l.x, l.z, 3.4, r, 1);
  // A signpost where the roads part north of the Green: the Quarry ahead, the Copse west, the Moor east.
  { const x = 62.6, z = 38.4; R.block(x, 0, z, .18, 2.7, .18, C.timber); R.block(x, 2.7, z, .26, .12, .26, C.iron);
    for (const [y, dx, dz, col] of [[2.3, 0, .55, 0xc9a25f], [1.9, -.6, 0, 0x5a8a5a], [1.5, .6, 0, 0x9a3a5a]]) { R.block(x + dx, y, z + dz, dx ? 1.1 : .14, .26, dz ? 1.1 : .14, col); R.block(x + dx * 1.55, y + .04, z + dz * 1.55, dx ? .2 : .1, .18, dz ? .2 : .1, col); } }
  const group = v.build({ detailShadows: false }); group.userData.trees = trees; return group;
}

export function buildHorizon() {
  const group = new THREE.Group(), v = new ChunkedVoxels(70), r = seeded(503), R = onGround(v);
  // A ring of woods round the realm: dark pines, autumn crowns and bare trees.
  for (let i = 0; i < 360; i++) {
    const side = i % 4, x = side === 0 ? REALM.x0 - 46 + r() * 44 : side === 1 ? REALM.x1 + 2 + r() * 44 : REALM.x0 - 46 + r() * (REALM.x1 - REALM.x0 + 92);
    const z = side === 2 ? REALM.z0 - 40 + r() * 38 : side === 3 ? REALM.z1 + 2 + r() * 40 : REALM.z0 - 40 + r() * (REALM.z1 - REALM.z0 + 80);
    if (Math.abs(x - 58) < 7 && z > -20 && z < 1) continue;
    const k = r(); k < .55 ? pine(R, x, z, 1.1 + r() * 1.3, r) : k < .8 ? canopyTree(R, x, z, 1 + r() * .6, r, pick([C.crimson, C.golden, C.violet], r), { cell: .8, litter: false }) : spookyTree(R, x, z, 1.2 + r() * .8, r);
  }
  // Mountains to the north and the sides, dark in the night, their snow catching the moon.
  for (let i = 0; i < 30; i++) {
    const x = -70 + i * 9 + r() * 6, z = 158 + r() * 30, h = 16 + r() * 30, w = 16 + r() * 18, steps = 14;
    let ox = 0, oz = 0;
    for (let k = 0; k < steps; k++) {
      const t = k / steps, ww = w * (1 - t) ** 1.15, snow = t > .72 && h > 26;
      ox += (r() - .5) * ww * .12; oz += (r() - .5) * ww * .08;
      R.block(x + ox, t * h, z + oz, ww, h / steps + .1, ww * (.55 + r() * .15), vary(snow ? 0x9aa4d0 : shade(0x24243e, .85 + t * .5), .06, r));
      if (r() < .5 && ww > 3) R.block(x + ox + (r() - .5) * ww * .6, t * h, z + oz - ww * .2, ww * .35, h / steps * 1.6, ww * .3, vary(shade(0x24243e, .8 + t * .5), .06, r));
    }
  }
  group.add(v.build({ shadows: false }));
  // The sky: a dome shaded from near-black overhead to plum at the horizon, with stars in it.
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(SKY.top) }, middle: { value: new THREE.Color(SKY.middle) }, horizon: { value: new THREE.Color(SKY.horizon) }, low: { value: new THREE.Color(SKY.low) }, moon: { value: new THREE.Vector3(.36, .42, -.83).normalize() } },
    vertexShader: "varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: [
      "uniform vec3 top, middle, horizon, low, moon; varying vec3 vDir;",
      "float hash(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }",
      "void main() { vec3 d = normalize(vDir); float y = d.y;",
      "  vec3 c = y > .3 ? mix(middle, top, smoothstep(.3, .95, y)) : y > 0. ? mix(horizon, middle, smoothstep(0., .3, y)) : mix(horizon, low, smoothstep(0., -.2, y));",
      "  float m = max(dot(d, moon), 0.); c += vec3(.55, .5, .85) * (pow(m, 18.) * .35 + pow(m, 90.) * .4);",
      "  vec3 cell = floor(d * 170.); float h = hash(cell); if (h > .993 && y > .04) { vec3 f = fract(d * 170.) - .5; float s = 1. - smoothstep(.08, .42, length(f)); c += vec3(.92, .9, 1.) * s * (.35 + (h - .993) * 140.) * smoothstep(.04, .3, y); }",
      "  gl_FragColor = vec4(c, 1.); }",
    ].join("\n"),
  }));
  sky.renderOrder = -1; sky.frustumCulled = false; group.add(sky); group.userData.sky = sky;
  // The moon: a pale disc with grey seas, and a soft halo.
  const mc = document.createElement("canvas"); mc.width = mc.height = 128; const m = mc.getContext("2d"), mr = seeded(509);
  m.fillStyle = "#fff4e2"; m.beginPath(); m.arc(64, 64, 62, 0, Math.PI * 2); m.fill();
  for (let i = 0; i < 14; i++) { m.fillStyle = `rgba(150,140,170,${.12 + mr() * .18})`; m.beginPath(); m.arc(30 + mr() * 70, 30 + mr() * 70, 6 + mr() * 16, 0, Math.PI * 2); m.fill(); }
  const moonTex = new THREE.CanvasTexture(mc); moonTex.colorSpace = THREE.SRGBColorSpace;
  const moon = new THREE.Mesh(new THREE.CircleGeometry(16, 48), new THREE.MeshBasicMaterial({ map: moonTex, toneMapped: false, fog: false, color: new THREE.Color(1.5, 1.5, 1.5) }));
  const dir = new THREE.Vector3(.36, .42, -.83).normalize(); moon.position.copy(dir).multiplyScalar(420).add(new THREE.Vector3(60, 0, -40)); moon.lookAt(60, 0, -40); group.add(moon);
  const hc = document.createElement("canvas"); hc.width = hc.height = 128; const h2 = hc.getContext("2d"), grad = h2.createRadialGradient(64, 64, 10, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,240,220,.5)"); grad.addColorStop(.35, "rgba(190,170,255,.16)"); grad.addColorStop(1, "rgba(90,70,160,0)"); h2.fillStyle = grad; h2.fillRect(0, 0, 128, 128);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(hc), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(150, 150, 1); halo.position.copy(moon.position).addScaledVector(dir, -2); group.add(halo);
  return group;
}
// Low mist drifting over the ravine, the marsh, the Copse and the Green's edges (the view drifts it).
export function buildMist() {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, "rgba(220,210,255,.55)"); grad.addColorStop(.6, "rgba(190,180,240,.18)"); grad.addColorStop(1, "rgba(160,150,220,0)"); g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c), material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: .5, color: 0xb8b0e0 });
  const group = new THREE.Group(), r = seeded(557);
  const spots = [[48, 38, 14], [62, 38, 12], [76, 38, 12], [56, 84, 18], [80, 88, 18], [104, 84, 16], [12, 50, 14], [16, 74, 16], [30, 88, 14], [6, 18, 12], [110, 20, 14], [92, 6, 10], [40, 2, 12], [100, 60, 16]];
  for (const [x, z, size] of spots) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * .7), material); m.rotation.x = -Math.PI / 2; m.position.set(x, .35 + r() * .5, -z); m.userData = { x, z, phase: r() * 6 }; m.renderOrder = 3; group.add(m); }
  return group;
}
