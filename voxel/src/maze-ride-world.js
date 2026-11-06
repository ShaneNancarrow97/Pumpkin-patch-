import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { sampleMazeRail, mazeProgressAt, mazeRideRegions, MAZE_RIDE_ROOM } from "./content/maze-ride.js";
export { mazeRideRegions } from "./content/maze-ride.js";

// The Hollow House walkthrough as native voxels. The shell (floors, walls and
// ceilings) is laid on half-unit cells from the floor rectangles; each chamber
// then gets its own finish and set dressing, built in a local frame where u
// runs across the room towards the side the rail swings to (the near wall is
// u = 4, the far wall u = -4) and w runs back towards the entrance. The rail
// keeps to u = 2 in a room, so props keep to the walls and the far side, where
// each chamber's centrepiece stands. A few pieces move (doors, the clock's
// pendulum, the spider, the séance's floating cups, the coils' arcs, the
// sarcophagus lid); everything else is two instanced batches.
const CELL = .5, HEIGHT = 3.65, IRON = 0x211e2b, GOLD = 0xb08a56, BRASS = 0xc9a15e, BONE = 0xd3c6ab;
const within = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
// Each chamber's finish: floor, the wall in rows, trim, and its fog and light colours.
const FINISH = [
  { name: "passage", floor: [0x4a3530, 0x55403a], base: 0x2b1d1c, panel: 0x4b3329, rail: GOLD, paper: [0x4a2e43, 0x573650], crown: 0x2f2124, ceiling: 0x241b22, fog: 0x120c14, tint: 0x8a6f86 },
  { name: "cellar", floor: [0x48484a, 0x3d4140], base: 0x2a2a2c, panel: 0x4d4b4a, rail: 0x3b3a36, paper: [0x55524c, 0x4a4a46], crown: 0x2f2d2b, ceiling: 0x232220, fog: 0x0d100f, tint: 0x7d8a86 },
  { name: "parlour", floor: [0x553220, 0x5f3926], base: 0x2a1515, panel: 0x4a2121, rail: BRASS, paper: [0x5c1b26, 0x6d2430], crown: 0x2f1a1a, ceiling: 0x2a1c1f, fog: 0x140a0e, tint: 0x9a6b78 },
  { name: "laboratory", floor: [0x262b2b, 0x5d6763], base: 0x1f2524, panel: 0x7e8e86, rail: 0x3c4846, paper: [0x3a3433, 0x443c3a], crown: 0x2a2f2f, ceiling: 0x1e2222, fog: 0x0a1111, tint: 0x76a39c },
  { name: "crypt", floor: [0x4b4450, 0x403a45], base: 0x2a2530, panel: 0x4d4552, rail: 0x5c5262, paper: [0x433b48, 0x3b3440], crown: 0x2b2531, ceiling: 0x221e27, fog: 0x0e0a12, tint: 0x8b7a9b },
];
export const MAZE_RIDE_FINISH = FINISH;

// A clearance circle samples the union, including the overlapping turn volumes.
export function isMazeRideWalkable(config, x, z, clearance = 0) {
  if (![x, z, clearance].every(Number.isFinite) || clearance < 0) return false;
  const regions = mazeRideRegions(config), contains = (xx, zz) => regions.some(r => within(r, xx, zz));
  if (!contains(x, z)) return false;
  if (!clearance) return true;
  return Array.from({ length: 16 }, (_, i) => i * Math.PI / 8).every(a => contains(x + Math.cos(a) * clearance, z + Math.sin(a) * clearance));
}

// Each reveal has an actual side recess cut into the same sealed shell.
export function mazeEncounterStage(config, encounter, regions = mazeRideRegions(config)) {
  const progress = mazeProgressAt(config, encounter.at + encounter.duration * .45);
  const viewer = sampleMazeRail(config, progress), ahead = sampleMazeRail(config, Math.min(1, progress + .007));
  let dx = ahead.x - viewer.x, dz = ahead.z - viewer.z, length = Math.hypot(dx, dz);
  if (length < .01) { dx = viewer.dx; dz = viewer.dz; length = Math.hypot(dx, dz); }
  dx /= length || 1; dz /= length || 1;
  // A reveal remains ahead of the viewer even when the route turns just beyond it.
  let forwardDistance = .3;
  while (forwardDistance < 3.2 && isMazeRideWalkable(config, viewer.x + dx * forwardDistance, viewer.z + dz * forwardDistance, .4)) forwardDistance += .1;
  forwardDistance -= .1;
  const p = { x: viewer.x + dx * forwardDistance, y: viewer.y, z: viewer.z + dz * forwardDistance, dx, dy: 0, dz };
  const sign = encounter.side === "left" || encounter.side < 0 ? 1 : -1, sideX = dz * sign, sideZ = -dx * sign;
  const walls = [];
  for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const alignment = nx * sideX + nz * sideZ; if (alignment < -.2) continue;
    let distance = .1;
    while (distance < 9 && regions.some(r => within(r, p.x + nx * distance, p.z + nz * distance))) distance += .1;
    distance -= .1; walls.push({ nx, nz, distance, score: distance / (.45 + Math.max(0, alignment) * 1.5) });
  }
  walls.sort((a, b) => a.score - b.score);
  const { nx, nz, distance } = walls[0];
  const home = { x: p.x + nx * (distance + .45), z: p.z + nz * (distance + .45) };
  const hx = Math.abs(nx) > .65 ? .85 : 1.05, hz = Math.abs(nz) > .65 ? .85 : 1.05;
  const mouth = { x: p.x + nx * (distance - .2), z: p.z + nz * (distance - .2) };
  const recess = { x0: Math.min(home.x - hx, mouth.x - .65), x1: Math.max(home.x + hx, mouth.x + .65), z0: Math.min(home.z - hz, mouth.z - .65), z1: Math.max(home.z + hz, mouth.z + .65), zone: Math.max(0, config.zones.findIndex(z => z.id === encounter.zone)), kind: "recess" };
  return { id: encounter.id, home, mouth, rail: p, nx, nz, distance, forwardDistance, recess };
}

// ---- Small pieces, in world coordinates ----------------------------------
function candle(v, x, y, z, scale = 1, wax = 0xd5c6a8) {
  v.block(x, y, z, .2 * scale, .05 * scale, .2 * scale, BRASS);
  v.block(x, y + .05 * scale, z, .09 * scale, .34 * scale, .09 * scale, wax);
  v.block(x, y + .39 * scale, z, .06 * scale, .12 * scale, .06 * scale, 0xffb45e, true);
  v.block(x, y + .5 * scale, z, .028 * scale, .06 * scale, .028 * scale, 0xffe3a0, true);
}
function candelabra(v, x, y, z, scale = 1) {
  v.block(x, y, z, .34 * scale, .06 * scale, .34 * scale, BRASS); v.block(x, y + .06 * scale, z, .06 * scale, .62 * scale, .06 * scale, BRASS);
  v.block(x, y + .66 * scale, z, .62 * scale, .05 * scale, .07 * scale, BRASS);
  for (const dx of [-.28, 0, .28]) candle(v, x + dx * scale, y + .71 * scale, z, .62 * scale);
}
function lantern(v, x, y, z) {
  v.block(x, y, z, .35, .06, .35, IRON); v.block(x, y + .07, z, .23, .34, .23, 0xffbd6e, true);
  for (const dx of [-.15, .15]) for (const dz of [-.15, .15]) v.block(x + dx, y + .04, z + dz, .035, .42, .035, IRON);
  v.block(x, y + .44, z, .4, .08, .4, GOLD); v.block(x, y + .52, z, .07, .2, .07, IRON);
}
function skull(v, x, y, z, scale = 1, facing = 1) {
  v.block(x, y, z, .34 * scale, .29 * scale, .3 * scale, 0xc5bba8); v.block(x, y + .25 * scale, z, .27 * scale, .08 * scale, .25 * scale, BONE);
  for (const d of [-.09, .09]) v.block(x + d * scale, y + .13 * scale, z + .16 * scale * facing, .085 * scale, .09 * scale, .025 * scale, IRON);
  v.block(x, y + .04 * scale, z + .17 * scale * facing, .12 * scale, .055 * scale, .03 * scale, IRON);
}
function web(v, x, y, z, side, large = false, alongZ = false) {
  const span = large ? 1.7 : 1, put = (a, yy, w, h) => alongZ ? v.block(x, yy, z + a, .025, h, w, 0xaaa3b5) : v.block(x + a, yy, z, w, h, .025, 0xaaa3b5);
  for (let i = 0; i < 7; i++) {
    const length = span * (1 - i / 8), yy = y + i * span / 8;
    put(side * length / 2, yy, length, .018);
    put(side * i * span / 8, y + length / 2 - length / 2, .018, length);
  }
}

// A chamber's local frame. u runs across towards the rail's side, w back towards
// the entrance. Pieces that would block a scare's recess are left out.
function frame(v, zone, recesses) {
  const s = zone.side, cx = zone.center.x, cz = zone.center.z;
  const X = u => cx + s * u, Z = w => cz + w;
  const clear = (u, w, hu, hw) => {
    const x0 = Math.min(X(u - hu), X(u + hu)), x1 = Math.max(X(u - hu), X(u + hu)), z0 = Z(w - hw), z1 = Z(w + hw);
    return !recesses.some(r => x1 > r.x0 - .3 && x0 < r.x1 + .3 && z1 > r.z0 - .3 && z0 < r.z1 + .3);
  };
  // Clear of a recess, the walls, and the walking line with room to pass.
  const free = (u, w, hu, hw, gap = .55) => clear(u, w, hu, hw) && Math.abs(u) + hu < 3.9 && Math.abs(w) + hw < 4.95 && railGap(u, w) > Math.hypot(hu, hw) + gap;
  return {
    v, s, X, Z, clear, free,
    // A box centred on (u, w), standing on y; su is its size across the room.
    b(u, y, w, su, sy, sw, colour, glow = false) { v.block(X(u), y, Z(w), su, sy, sw, colour, glow); },
    // On a side wall (u = ±4) facing into the room: depth out from the wall, width along it.
    wall(side, w, y, out, width, h, depth, colour, glow = false) { v.block(X(side * (4 - out - depth / 2)), y, Z(w), depth, h, width, colour, glow); },
  };
}

// The walk through a room in its local frame: in at w = 5 on the centre line,
// round the near side at u = 2, and out at w = -5.
const RAIL_LOCAL = [[0, 6], [0, 5], [2, 2.4], [2, -2.4], [0, -5], [0, -6]];
function railGap(u, w) {
  let best = Infinity;
  for (let i = 1; i < RAIL_LOCAL.length; i++) {
    const [au, aw] = RAIL_LOCAL[i - 1], [bu, bw] = RAIL_LOCAL[i], du = bu - au, dw = bw - aw, t = Math.max(0, Math.min(1, ((u - au) * du + (w - aw) * dw) / (du * du + dw * dw)));
    best = Math.min(best, Math.hypot(u - au - du * t, w - aw - dw * t));
  }
  return best;
}

// ---- Set dressing kits (cobwebs, clutter, furniture) -------------------------
const SILK = 0xa8a2b4, DUST = 0x8d8794;
// A line of small blocks: silk strands, drapes, chains.
function strand(v, a, b, colour = SILK, size = .02, step = .075) {
  // Each piece stretches to meet the next, so a diagonal reads as one thread.
  const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / step)), sx = (b[0] - a[0]) / n, sy = (b[1] - a[1]) / n, sz = (b[2] - a[2]) / n;
  for (let i = 0; i < n; i++) v.block(a[0] + sx * (i + .5), a[1] + sy * i + Math.min(0, sy), a[2] + sz * (i + .5), Math.abs(sx) + size, Math.abs(sy) + size, Math.abs(sz) + size, colour);
}
// A web strung across a corner: spokes from the corner point and sagging rings,
// in the plane that cuts the corner diagonally. (ix, iz) step into the room.
function cornerWeb(v, x, y, z, ix, iz, size = 1.2) {
  const hx = ix * Math.SQRT1_2, hz = iz * Math.SQRT1_2, at = (a, rho) => [x + hx * rho * Math.cos(a), y - rho * Math.sin(a), z + hz * rho * Math.cos(a)];
  const spokes = [0, .32, .64, .96, 1.28, Math.PI / 2];
  for (const a of spokes) strand(v, at(a, .06), at(a, size));
  for (const k of [.28, .48, .68, .86, 1]) for (let i = 1; i < spokes.length; i++) strand(v, at(spokes[i - 1], size * k * (i % 2 ? 1 : .93)), at(spokes[i], size * k * (i % 2 ? .93 : 1)), SILK, .024, .085);
  const [dx, dy, dz] = at(.8, size * .7); strand(v, [dx, dy, dz], [dx, dy - .5 - size * .3, dz], SILK, .02);
}
// Silk draped from a piece of furniture to the floor or a wall.
function drape(v, from, to, sag = .25) {
  const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 - sag, (from[2] + to[2]) / 2];
  strand(v, from, mid, SILK, .022); strand(v, mid, to, SILK, .022);
}
function books(F, u, y, w, n, seed, flat = true) {
  const r = seeded(seed), colours = [0x5a2a2e, 0x2e3a4a, 0x3d4a2e, 0x6a4a2a, 0x4a2e4a, 0x7a6a4a];
  for (let i = 0; i < n; i++) {
    const c = colours[Math.floor(r() * colours.length)], h = .06 + r() * .04;
    if (flat) { F.b(u + (r() - .5) * .06, y + i * .075, w + (r() - .5) * .06, .34 - r() * .08, h, .26 - r() * .05, c); F.b(u + .01, y + i * .075 + .01, w, .3, h * .7, .22, 0xd6ccb0); }
    else F.b(u, y, w - n * .045 + i * .09, .22, .26 + r() * .1, .07, c);
  }
}
function bottles(F, u, y, w, n, seed) {
  const r = seeded(seed), glass = [0x2f5a3a, 0x5a3a1e, 0x6f8a86, 0x3a2a4a];
  for (let i = 0; i < n; i++) { const du = (r() - .5) * .34, dw = (r() - .5) * .34, h = .18 + r() * .2, c = glass[i % glass.length]; F.b(u + du, y, w + dw, .085, h, .085, c); F.b(u + du, y + h, w + dw, .04, .07, .04, c); F.b(u + du, y + h + .07, w + dw, .045, .03, .045, 0x8a6a4a); }
}
function crate(F, u, w, size = .6, y = 0, colour = 0x6b5238) {
  F.b(u, y, w, size, size, size, colour);
  for (const k of [-.36, 0, .36]) F.b(u, y + size / 2 + k * size, w, size + .02, .05, size + .02, vary(colour, .12, seeded(Math.round(u * 13 + w * 7 + k * 10))));
  for (const du of [-1, 1]) for (const dw of [-1, 1]) F.b(u + du * size / 2, y, w + dw * size / 2, .06, size, .06, 0x4c3a28);
}
function chair(F, u, w, facing = 1, colour = 0x3a2620, tipped = false) {
  if (tipped) { F.b(u, 0, w, .5, .08, .5, colour); F.b(u + facing * .3, .05, w, .1, .5, .5, colour); for (const dw of [-.2, .2]) F.b(u - facing * .05, .08, w + dw, .45, .06, .06, colour); return; }
  for (const du of [-.2, .2]) for (const dw of [-.2, .2]) F.b(u + du, 0, w + dw, .06, .45, .06, colour);
  F.b(u, .45, w, .5, .07, .5, colour); F.b(u - facing * .22, .52, w, .07, .7, .5, colour); F.b(u - facing * .22, 1.1, w, .09, .08, .54, colour);
}
function sheeted(F, u, w, su, sw, h, seed) {
  const r = seeded(seed);
  F.b(u, 0, w, su, h * .8, sw, 0x8d8892); F.b(u, h * .8, w, su * .92, h * .2, sw * .92, 0x9a959e);
  for (let i = 0; i < 4; i++) F.b(u + (r() - .5) * su * .5, h * (.85 + r() * .25), w + (r() - .5) * sw * .5, .3 + r() * .25, .16, .3 + r() * .25, 0xa29da6);
  for (const k of [-1, 1]) F.b(u + k * (su / 2 + .02), 0, w, .04, h * .78, sw * .96, 0x7f7a85);
}
function trunk(F, u, w, along = true) {
  const su = along ? .55 : 1, sw = along ? 1 : .55;
  F.b(u, 0, w, su, .45, sw, 0x4a2f22); F.b(u, .45, w, su + .04, .14, sw + .04, 0x5a3a28);
  for (const k of [-.4, .4]) F.b(u + (along ? 0 : k * su), .02, w + (along ? k * sw : 0), along ? su + .05 : .06, .56, along ? .06 : sw + .05, BRASS);
  F.b(u + (along ? su / 2 + .02 : 0), .36, w + (along ? 0 : sw / 2 + .02), .04, .12, .1, BRASS);
}
// Frames leaning against a wall on the floor, faces turned to the room.
function leaningFrames(F, side, w, seed) {
  const r = seeded(seed);
  for (let i = 0; i < 3; i++) { const h = .6 + r() * .5, wide = .45 + r() * .3, ww = w + (i - 1) * .32; F.wall(side, ww, 0, .08 + i * .07, wide, h, .06, GOLD); F.wall(side, ww, .06, .14 + i * .07, wide - .1, h - .12, .02, [0x2a2232, 0x3a2a24, 0x24303a][i]); }
}
function doll(F, u, y, w, facing = 1) {
  F.b(u, y, w, .2, .26, .16, 0x6a3a4a); F.b(u, y + .26, w, .15, .15, .14, 0xd9cbb8); F.b(u, y + .4, w, .17, .05, .15, 0x2a1a14);
  for (const k of [-1, 1]) { F.b(u + k * .03, y + .33, w + facing * .075, .025, .025, .01, 0x0e0b10); F.b(u + k * .13, y + .1, w, .05, .14, .05, 0xd9cbb8); F.b(u + k * .05, y - .08, w + facing * .08, .06, .06, .16, 0x6a3a4a); }
}
function dustAndPapers(F, seed, n = 18) {
  const r = seeded(seed);
  for (let i = 0; i < n; i++) { const u = -3.6 + r() * 2.4, w = -4.6 + r() * 9.2; if (!F.free(u, w, .15, .15, .2)) continue; F.b(u, .038, w, .12 + r() * .14, .008, .1 + r() * .12, r() < .5 ? 0xcfc4a8 : DUST); }
}
// Webs in all four ceiling corners, strands from the beams, and webs over pieces.
function webs(F, seed, drapes = []) {
  const v = F.v, r = seeded(seed), y = HEIGHT - .02;
  for (const cu of [-1, 1]) for (const cw of [-1, 1]) { const ix = -cu * F.s, iz = -cw; cornerWeb(v, F.X(cu * 3.98), y, F.Z(cw * 4.97), ix, iz, 1 + r() * .7); }
  for (let i = 0; i < 9; i++) { const u = -3.6 + r() * 2.2, w = -4.3 + r() * 8.6, len = .4 + r() * .9; F.b(u, y - len, w, .016, len, .016, SILK); if (r() < .4) F.b(u, y - len - .05, w, .07, .06, .07, 0x1e1a22); }
  for (const [a, b] of drapes) drape(v, a, b);
}
function clutterPassage(F, v, zone, active) {
  const X = F.X, Z = F.Z;
  if (F.free(-3.3, 4.1, .5, .3)) { trunk(F, -3.3, 4.1, false); books(F, -3.3, .6, 4.1, 3, 31); }
  if (F.free(-3.55, 1.6, .3, .6)) { F.b(-3.55, 0, 1.6, .5, .85, 1.1, 0x3b2620); F.b(-3.55, .85, 1.6, .56, .05, 1.16, 0x553829); bottles(F, -3.5, .9, 1.35, 4, 32); books(F, -3.55, .9, 1.95, 4, 33, false); candle(v, X(-3.5), .9, Z(2.15), .7); }
  if (F.free(-2.4, -3.9, .4, .4)) chair(F, -2.4, -3.9, 1, 0x3a2620, true);
  if (F.free(3.62, .4, .3, .5)) leaningFrames(F, 1, .4, 34);
  if (F.free(3.45, 2.9, .2, .2)) { F.b(3.45, 0, 2.9, .28, .6, .28, 0x2c2633); for (const d of [-.06, .06]) F.b(3.45 + d, .6, 2.9 + d, .04, .5, .04, 0x1e1a24); }
  if (F.free(-2.6, -4.4, .3, .3)) { chair(F, -2.6, -4.4, 1, 0x4a2f2a); doll(F, -2.55, .52, -4.4, 1); }
  dustAndPapers(F, 35);
  webs(F, 36, [[[X(-1), .9, Z(-2.8)], [X(-1.5), 0, Z(-3.4)]], [[X(-3.6), 2.5, Z(-2.9)], [X(-3.9), 3.3, Z(-3.6)]], [[X(-3.55), .9, Z(1.05)], [X(-3.9), 1.6, Z(.6)]]]);
}
function clutterCellar(F, v, zone, active) {
  const X = F.X, Z = F.Z;
  if (F.free(-2.7, .1, .6, .6)) for (const [du, dw, y] of [[0, 0, 0], [.35, .3, 0], [-.3, .35, 0], [.05, .15, .38]]) { F.b(-2.7 + du, y, .1 + dw, .5, .42, .42, 0xa08a62); F.b(-2.7 + du, y + .42, .1 + dw, .3, .08, .26, 0x8a7452); }
  if (F.free(3.65, .1, .25, .7)) { for (const y of [.5, 1.1, 1.7]) { F.wall(1, .1, y, 0, 1.3, .05, .3, 0x4a3a2a); for (let i = 0; i < 5; i++) F.wall(1, -.4 + i * .25, y + .05, .05, .13, .2, .13, [0x8a3a2a, 0x6a7a3a, 0xb08a3a][i % 3]); } F.wall(1, -.55, 0, 0, .06, 1.95, .06, 0x3a2a1e); F.wall(1, .75, 0, 0, .06, 1.95, .06, 0x3a2a1e); }
  if (F.free(-3.1, 4.25, .6, .5)) for (let i = 0; i < 14; i++) F.b(-3.1 + Math.sin(i * 2.1) * .4, Math.floor(i / 5) * .14, 4.25 + Math.cos(i * 1.7) * .3, .2, .14, .18, 0x1a1a1d);
  if (F.free(-3.2, -4.35, .6, .35)) { F.b(-3.2, 0, -4.35, 1.2, .8, .6, 0x4a3a2a); F.b(-3.2, .8, -4.35, 1.3, .06, .66, 0x5a4632); for (const [du, c] of [[-.4, 0x8a8a8a], [-.1, 0x6a4a2a], [.3, 0x9a9a92]]) F.b(-3.2 + du, .86, -4.35, .08, .05, .4, c); bottles(F, -2.85, .86, -4.3, 3, 41); }
  if (F.free(-1.9, .9, .2, .2)) { F.b(-1.9, 0, .9, .12, .08, .22, 0x55505a); F.b(-1.9, .02, 1.05, .02, .02, .16, 0x7a6a6e); F.b(-1.9, .06, .78, .03, .02, .02, 0xff5a5a, true); }
  if (F.free(-2.1, 3.5, .3, .3)) { F.b(-2.1, 2.1, 3.5, .5, .04, .5, IRON); for (const du of [-.24, -.08, .08, .24]) F.b(-2.1 + du, 2.14, 3.5, .02, .7, .5, IRON); F.b(-2.1, 2.84, 3.5, .5, .04, .5, IRON); F.b(-2.1, 2.88, 3.5, .03, HEIGHT - 2.88, .03, IRON); skull(v, X(-2.1), 2.15, Z(3.5), .5); }
  dustAndPapers(F, 42, 12);
  webs(F, 43, [[[X(-1.1), 2.5, Z(-1.4)], [X(-1.8), 3.4, Z(-2.3)]], [[X(-3.6), 2.2, Z(-2.3)], [X(-3.95), 3.2, Z(-3.2)]], [[X(-2.7), .8, Z(.1)], [X(-3.2), 0, Z(.6)]]]);
}
function clutterParlour(F, v, zone, active) {
  const X = F.X, Z = F.Z;
  if (F.free(-2.95, 2.3, .4, .8)) sheeted(F, -2.95, 2.3, .75, 1.6, .85, 51);
  if (F.free(-1.25, 3.7, .45, .45)) sheeted(F, -1.25, 3.7, .8, .8, 1, 52);
  if (F.free(3.4, .6, .3, .3)) { F.b(3.4, 0, .6, .5, .7, .5, 0x3a1a20); F.b(3.4, .7, .6, .3, .14, .3, 0x2a1a14); F.b(3.4, .84, .6, .04, .3, .04, BRASS); for (let i = 0; i < 4; i++) F.b(3.4 - i * .07, 1.12 + i * .07, .6, .14 + i * .1, .1 + i * .08, .14 + i * .1, BRASS); }
  if (F.free(3.65, 4.05, .25, .6)) { F.wall(1, 4.05, 0, 0, 1.2, 2.4, .4, 0x3a1a20); for (const y of [.15, .7, 1.25, 1.8]) { F.wall(1, 4.05, y, .05, 1.1, .04, .32, 0x2a1214); for (let i = 0; i < 9; i++) F.wall(1, 3.6 + i * .11, y + .04, .08, .09, .32 + (i % 3) * .06, .22, [0x5a2a2e, 0x2e3a4a, 0x6a4a2a][i % 3]); } }
  if (F.free(-2.55, -3.8, .35, .35)) { F.b(-2.55, 0, -3.8, .6, .62, .6, 0x3a1a20); F.b(-2.55, .62, -3.8, .66, .04, .66, 0x6a2c3a); for (const [du, dw] of [[-.15, -.1], [.12, .14]]) { F.b(-2.55 + du, .66, -3.8 + dw, .12, .09, .12, 0xe2dacb); F.b(-2.55 + du + .07, .7, -3.8 + dw, .04, .04, .03, 0xe2dacb); } F.b(-2.55, .66, -3.8, .16, .16, .16, 0xe2dacb); F.b(-2.55, .82, -3.8, .06, .04, .06, 0xe2dacb); }
  for (const [u, w] of [[-3.6, -1.75], [-3.6, -1.05]]) { F.b(u, 1.41, w, .12, .2, .12, 0x2a3a3a); for (let i = 0; i < 3; i++) F.b(u + (i - 1) * .05, 1.61, w, .015, .25 + i * .05, .015, 0x4a3a2a); }
  dustAndPapers(F, 53, 14);
  webs(F, 54, [[[X(-1), 2.9, Z(-1.4)], [X(-1.6), 3.6, Z(-2)]], [[X(-1), 2.9, Z(-1.4)], [X(-.4), 3.6, Z(-.8)]], [[X(-2.95), .85, Z(1.5)], [X(-3.6), 1.3, Z(1.1)]]]);
}
function clutterLaboratory(F, v, zone, active) {
  const X = F.X, Z = F.Z;
  if (F.free(-2.3, 1.9, .3, .3)) {
    F.b(-2.3, 0, 1.9, .3, .05, .3, IRON); F.b(-2.3, .05, 1.9, .04, 1.95, .04, IRON);
    F.b(-2.3, 1.62, 1.9, .2, .22, .18, BONE); for (const k of [-1, 1]) F.b(-2.3 + k * .04, 1.7, 1.9 + .09, .05, .05, .02, IRON);
    for (let i = 0; i < 6; i++) { F.b(-2.3, 1.2 - i * .08, 1.9, .36 - Math.abs(i - 2) * .03, .03, .2, BONE); } F.b(-2.3, .62, 1.9, .05, .95, .05, BONE);
    F.b(-2.3, .55, 1.9, .3, .1, .16, BONE); for (const k of [-1, 1]) { F.b(-2.3 + k * .1, .02, 1.9, .05, .55, .05, BONE); F.b(-2.3 + k * .22, .9, 1.9, .04, .5, .04, BONE); }
  }
  if (F.free(-1.1, 3.6, .4, .4)) { F.b(-1.1, 0, 3.6, .75, .05, .75, IRON); F.b(-1.1, .85, 3.6, .75, .05, .75, IRON); for (const du of [-.36, -.12, .12, .36]) for (const dw of [-.36, .36]) F.b(-1.1 + du, .05, 3.6 + dw, .025, .8, .025, IRON); for (const dw of [-.12, .12]) F.b(-1.1 + dw, .05, 3.6 - .36, .025, .8, .025, IRON); for (const k of [-1, 1]) F.b(-1.1 + k * .06, .45, 3.6, .04, .03, .02, 0xff4a3a, true); }
  if (F.free(-3.2, -4.3, .55, .35)) for (let i = 0; i < 5; i++) { const du = -.4 + i * .2, c = [0x6cf0b0, 0xc3f06a, 0x8fd0ff, 0xe07ad0, 0x6cf0b0][i]; F.b(-3.2 + du, 0, -4.3 + (i % 2) * .2, .16, .34, .16, 0x8aa0a0); F.b(-3.2 + du, .03, -4.3 + (i % 2) * .2, .12, .24, .12, c, true); F.b(-3.2 + du, .34, -4.3 + (i % 2) * .2, .1, .04, .1, 0x5a5a52); }
  if (F.free(3.72, -3.5, .2, .7)) { F.wall(1, -3.5, 1.1, 0, 1.4, 1, .06, 0x3a2a1e); F.wall(1, -3.5, 1.16, .06, 1.28, .88, .02, 0x1f2a26); for (let i = 0; i < 5; i++) F.wall(1, -3.95 + i * .2, 1.4 + (i % 3) * .2, .08, .14 + (i % 2) * .1, .025, .01, 0xc8e8d8); }
  for (const [du, dw] of [[.35, -.6], [.38, -.2]]) { F.b(-1 + du, 1.15, -1.4 + dw, .08, .14, .08, 0x9fc8c0); F.b(-1 + du, 1.17, -1.4 + dw, .06, .07, .06, 0x6cf0b0, true); }
  dustAndPapers(F, 61, 22);
  webs(F, 62, [[[X(-2.8), 2.1, Z(3.2)], [X(-3.6), 3.25, Z(3.8)]], [[X(-1), 2.62, Z(-1.4)], [X(-1.5), 3.6, Z(-.9)]]]);
}
function clutterCrypt(F, v, zone, active) {
  const X = F.X, Z = F.Z, r = seeded(71);
  for (let i = 0; i < 26; i++) { const u = -3.3 + r() * 1.8, w = -4.4 + r() * 8.8; if (!F.free(u, w, .2, .2, .35)) continue; const long = r() < .5; F.b(u, .04, w, long ? .32 : .06, .05, long ? .06 : .32, BONE); if (r() < .3) F.b(u + .1, .04, w, .08, .07, .08, BONE); }
  for (const w of [3.3, -3.0]) if (F.free(-3.0, w, .25, .25)) { F.b(-3.0, 0, w, .3, .1, .3, 0x4a4052); F.b(-3.0, .1, w, .4, .45, .4, 0x5a5262); F.b(-3.0, .55, w, .26, .1, .26, 0x4a4052); F.b(-3.0, .65, w, .34, .05, .34, 0x5a5262); }
  if (F.free(-2.6, -3.9, .2, .6)) { F.b(-2.6, 0, -3.9, .12, 1.9, .7, 0x3d2a24); F.b(-2.55, .1, -3.9, .02, 1.7, .55, 0x2a1d1a); F.b(-2.52, .8, -3.9, .02, .12, .4, BRASS); F.b(-2.52, .62, -3.9, .02, .5, .1, BRASS); }
  if (F.free(-2.8, 1.4, .35, .35)) for (const [du, dw, h] of [[0, 0, .5], [.15, .12, .3], [-.12, .1, .38], [.1, -.15, .22], [-.15, -.12, .44]]) candle(v, X(-2.8 + du), 0, Z(1.4 + dw), h * 1.6);
  for (let i = 0; i < 4; i++) { const w = -3.45 + i * 2.3; strand(v, [X(-3.7), 3.3, Z(w)], [X(-3.7), 2.6, Z(w + .6)], SILK, .022); strand(v, [X(-3.7), 2.6, Z(w + .6)], [X(-3.7), 3.3, Z(w + 1.15)], SILK, .022); }
  dustAndPapers(F, 72, 10);
  webs(F, 73, [[[X(-1.1), .9, Z(.1)], [X(-1.6), 0, Z(.6)]], [[X(-1.1), .9, Z(-2.3)], [X(-.6), 0, Z(-2.8)]]]);
}
const CLUTTER = [clutterPassage, clutterCellar, clutterParlour, clutterLaboratory, clutterCrypt];

// The set you walk past: a run of cases and shelves along the near wall, at
// eye level beside the walking line, filled per chamber.
function shelfUnit(F, w, width, height, colour, fill, seed) {
  const r = seeded(seed);
  // Open shelves: a back, two sides and boards, so what stands on them shows.
  F.wall(1, w, 0, 0, width, height, .05, vary(colour, .15, r)); for (const k of [-1, 1]) F.wall(1, w + k * (width / 2 - .025), 0, 0, .05, height, .42, colour);
  F.wall(1, w, 0, 0, width, .06, .42, colour); F.wall(1, w, height, 0, width + .08, .07, .48, vary(colour, .1, r));
  const rows = Math.max(2, Math.floor(height / .5));
  for (let i = 1; i < rows; i++) { const y = i * height / rows; F.wall(1, w, y, .02, width - .06, .04, .4, vary(colour, .12, r)); }
  for (let i = 0; i < rows; i++) { const y = i * height / rows + .04; let at = w - width / 2 + .12; while (at < w + width / 2 - .12) { const item = fill(r, y, at); at += item; } }
}
function nearRun(F, v, zone, seed, fills) {
  const r = seeded(seed);
  for (let w = -4.3; w <= 4.3; w += .1) {
    const width = .9 + r() * .7, centre = w + width / 2, height = 1.6 + r() * .8;
    if (centre + width / 2 > 4.6) break;
    if (!F.free(3.62, centre, .24, width / 2, .45) || r() < .18) continue;
    fills[Math.floor(r() * fills.length)](F, centre, width, height, seed + Math.round(w * 10));
    w += width + .15;
  }
}
const jarFill = colours => (F, w, width, height, seed) => shelfUnit(F, w, width, height, 0x3a2a20, (r, y, at) => { const h = .14 + r() * .18; F.wall(1, at, y, .1, .1, h, .12, colours[Math.floor(r() * colours.length)]); if (r() < .3) F.wall(1, at, y + h, .12, .06, .03, .06, 0x8a6a4a); return .13 + r() * .1; }, seed);
const bookFill = (F, w, width, height, seed) => shelfUnit(F, w, width, height, 0x2e1c18, (r, y, at) => { const h = .2 + r() * .14, t = .05 + r() * .05; if (r() < .12) { skullOn(F, at + .05, y); return .26; } F.wall(1, at, y, .06, t, h, .28, [0x5a2a2e, 0x2e3a4a, 0x3d4a2e, 0x6a4a2a, 0x4a2e4a][Math.floor(r() * 5)]); return t + .01; }, seed);
const crateFill = (F, w, width, height, seed) => { const r = seeded(seed); for (let y = 0, s = .55; y + s < height + .2; y += s, s *= .9) { const ww = w + (r() - .5) * .2; F.wall(1, ww, y, .05, s, s, s, vary(0x6b5238, .1, r)); F.wall(1, ww, y + s / 2, .04, s + .02, .05, s + .02, 0x4c3a28); } };
function skullOn(F, w, y) { F.wall(1, w, y, .1, .2, .17, .18, 0xc5bba8); for (const d of [-.05, .05]) F.wall(1, w + d, y + .07, .19, .05, .05, .02, IRON); }
// Hanging over the walk, always above head height.
function overhead(F, v, seed, hang) {
  const r = seeded(seed);
  for (let w = -4; w <= 4; w += 1.6 + r() * .6) { const u = 2 + (r() < .5 ? -1 : 1) * (.8 + r() * .4); if (!F.clear(u, w, .3, .3)) continue; const drop = .5 + r() * .6, y = HEIGHT - drop; F.b(u, y, w, .02, drop, .02, 0x2a2622); hang(F, v, u, y, w, r); }
}
const cage = (F, v, u, y, w, r) => { F.b(u, y - .5, w, .42, .03, .42, IRON); for (const [a, c] of [[-.2, -.2], [-.2, .2], [.2, -.2], [.2, .2], [0, -.2], [0, .2], [-.2, 0], [.2, 0]]) F.b(u + a, y - .5, w + c, .025, .5, .025, IRON); F.b(u, y - .03, w, .34, .04, .34, IRON); if (r() < .6) skull(v, F.X(u), y - .47, F.Z(w), .55); };
const herbs = (F, v, u, y, w, r) => { for (let i = 0; i < 5; i++) { const du = (i - 2) * .07; F.b(u + du, y - .45 - (i % 2) * .06, w, .06, .45 + (i % 2) * .06, .06, [0x4a5a2a, 0x6a5a2a, 0x5a3a2a][i % 3]); } F.b(u, y - .04, w, .4, .05, .06, 0x5a4a3a); };
const sack = (F, v, u, y, w, r) => { F.b(u, y - .65, w, .36, .55, .3, 0x8a7452); F.b(u, y - .12, w, .18, .1, .16, 0x7a6442); F.b(u, y - .78, w, .26, .14, .22, 0x6a5a3a); };
const chains = (F, v, u, y, w, r) => { for (let i = 0; i < 6; i++) F.b(u, y - .12 - i * .12, w, i % 2 ? .04 : .1, .12, i % 2 ? .1 : .04, IRON); F.b(u, y - .86, w, .14, .05, .05, IRON); F.b(u + .05, y - .92, w, .04, .1, .04, IRON); };
const puppet = (F, v, u, y, w, r) => { F.b(u, y - .7, w, .16, .32, .1, [0x6a2a3a, 0x2a3a5a][Math.floor(r() * 2)]); F.b(u, y - .36, w, .13, .13, .12, 0xdccbb6); for (const k of [-1, 1]) { F.b(u + k * .03, y - .3, w + .065, .025, .025, .01, 0x0e0b10); F.b(u + k * .11, y - .62, w, .04, .26, .04, 0xdccbb6); F.b(u + k * .05, y - .98, w, .05, .28, .05, 0x2a2026); F.b(u + k * .15, y - .1, w, .01, .6, .01, 0xcfc8d8); } };
const bulb = (F, v, u, y, w, r) => { F.b(u, y - .16, w, .2, .12, .2, 0x3a4644); F.b(u, y - .26, w, .1, .1, .1, 0xcff5ea, true); };
const censer = (F, v, u, y, w, r) => { F.b(u, y - .5, w, .24, .2, .24, BRASS); F.b(u, y - .3, w, .16, .08, .16, GOLD); F.b(u, y - .44, w, .12, .06, .12, 0xb497ff, true); for (const k of [-1, 1]) F.b(u + k * .1, y - .3, w, .01, .3, .01, BRASS); };
const bats = (F, v, u, y, w, r) => { for (let i = 0; i < 2; i++) { const du = (i - .5) * .3; F.b(u + du, y - .12, w, .08, .12, .06, 0x15111a); for (const k of [-1, 1]) F.b(u + du + k * .1, y - .08, w, .12, .03, .05, 0x15111a); } };
const SETS = [
  { fills: [bookFill, jarFill([0x3a5a3a, 0x6a4a2a, 0x8aa0a0])], hang: [herbs, cage, bats] },
  { fills: [crateFill, jarFill([0x8a3a2a, 0x6a7a3a, 0xb08a3a, 0x5a3a2a])], hang: [sack, chains, herbs] },
  { fills: [bookFill, jarFill([0x7a2a3a, 0xc9b28a, 0x5a2a4a])], hang: [puppet, bats, cage] },
  { fills: [jarFill([0x6cf0b0, 0x8fd0ff, 0xc3f06a, 0x8aa0a0]), crateFill], hang: [bulb, chains, cage] },
  { fills: [jarFill([0x5a5262, 0x4a4052, 0xb6a98e]), bookFill], hang: [censer, chains, bats] },
];
// ---- House furniture for walls: paintings, tables, clocks, busts, mirrors ----
// `put(a, y, o, along, h, depth, colour, glow)` lays a box centred a along a
// wall and o out from it, so the same pieces dress rooms and corridors.
const FRAMES = [GOLD, 0x3b2620, 0x8a6a3a, 0x2a1d1a];
// An oil painting in mid-tones, so it reads in the gloom: a portrait, a
// moonlit house, a still life with a skull, or a storm at sea. `lamp` adds a
// brass picture light along the top.
function painting(put, a, y, wide, high, motif, frame = GOLD, eyes = false, lamp = false) {
  put(a, y, .04, wide + .14, high + .14, .08, frame); put(a, y + .05, .09, wide + .02, high + .04, .02, vary(frame, .15, seeded(Math.round(a * 17 + y * 5))));
  const b = y + .07, at = (u, v, w, h, colour, o = .11, glow = false) => put(a + u * wide, b + v * high, o, w * wide, h * high, .02, colour, glow);
  if (motif === 0) {
    at(0, 0, 1, 1, 0x5a4a34, .1); at(0, .6, 1, .4, 0x6a5a3e, .105);
    at(0, 0, .74, .36, 0x2c2230); at(0, .3, .5, .08, 0xd8ccb4, .115);
    at(0, .36, .3, .3, 0xcbb497); at(0, .64, .36, .12, 0x3a2418, .115); at(-.16, .44, .06, .26, 0x3a2418, .115); at(.16, .44, .06, .26, 0x3a2418, .115);
    for (const d of [-.07, .07]) at(d, .52, .06, .035, eyes ? 0xffd9a6 : 0x2a2230, .12, eyes);
    at(0, .43, .1, .03, 0x8a4a40, .12);
  } else if (motif === 1) {
    at(0, 0, 1, 1, 0x34405e, .1); at(0, 0, 1, .55, 0x4a5876, .105); at(0, .2, 1, .2, 0x5e6a84, .107);
    at(.26, .72, .16, .16 * wide / high, 0xeae2c2, .115, true);
    at(0, 0, 1, .26, 0x1c2620, .112); at(-.18, .26, .3, .2, 0x1a1c22, .114); at(-.24, .46, .1, .1, 0x1a1c22, .114); at(-.18, .3, .06, .06, 0xffc070, .118, true);
    at(.3, .26, .04, .22, 0x14181a, .114); at(.3, .42, .16, .12, 0x161c1a, .116);
  } else if (motif === 2) {
    at(0, 0, 1, 1, 0x4a3a2c, .1); at(0, .7, 1, .3, 0x3a2e24, .105);
    at(0, 0, 1, .22, 0x6a4428, .11); at(0, .22, 1, .03, 0x8a5e36, .112);
    at(-.18, .25, .24, .2, 0xd6cbb2, .115); for (const d of [-.05, .05]) at(-.18 + d, .34, .05, .04, 0x2a2230, .12);
    at(.2, .25, .12, .34, 0x6a2a2a, .115); at(.2, .59, .06, .05, 0x6a2a2a, .115);
    at(-.38, .25, .05, .26, 0xd5c6a8, .115); at(-.38, .51, .03, .05, 0xffc070, .118, true);
  } else {
    at(0, 0, 1, 1, 0x4a5262, .1); at(0, .6, 1, .4, 0x3a4050, .105); at(-.2, .82, .5, .1, 0x5a6272, .107);
    at(0, 0, 1, .36, 0x2a4a58, .11); for (let i = 0; i < 4; i++) at((i - 1.5) * .24, .3 + (i % 2) * .05, .16, .05, 0x8aa4ae, .113);
    at(.1, .34, .24, .08, 0x241a16, .115); at(.1, .42, .02, .3, 0x241a16, .115); at(.14, .5, .14, .16, 0xc8c0aa, .117);
  }
  if (lamp) { put(a, y + high + .14, .14, wide * .5, .04, .05, BRASS); put(a, y + high + .1, .19, wide * .44, .02, .03, 0xffd59a, true); for (const k of [-1, 1]) put(a + k * wide * .2, y + high + .12, .1, .02, .06, .08, BRASS); }
}
function consoleTable(put, a, r, lit) {
  for (const k of [-1, 1]) for (const o of [.08, .42]) put(a + k * .5, 0, o, .06, .82, .06, 0x2a1a17);
  put(a, .72, .25, 1.12, .1, .44, 0x3b2620); put(a, .82, .25, 1.2, .06, .5, 0x553829);
  const item = Math.floor(r() * 4);
  if (item === 0) { put(a - .3, .88, .25, .16, .3, .16, 0x5b4a6d); for (let i = 0; i < 4; i++) put(a - .33 + (i % 2) * .06, 1.18 + i * .05, .25 + (i % 3 - 1) * .04, .04, .18, .04, [0x4a2b32, 0x3a3227][i % 2]); }
  else if (item === 1) { put(a - .2, .88, .22, .36, .08, .26, 0x5a2a2e); put(a - .2, .96, .22, .32, .07, .24, 0x2e3a4a); put(a - .18, 1.03, .22, .3, .06, .22, 0x6a4a2a); }
  else if (item === 2) { put(a - .25, .88, .25, .26, .22, .24, 0xc5bba8); for (const d of [-.07, .07]) put(a - .25 + d, .97, .38, .06, .06, .02, 0x15111a); }
  else { put(a - .25, .88, .22, .3, .38, .2, 0x3a2a20); put(a - .25, 1.06, .33, .2, .2, .02, 0xd8cfb4); }
  put(a + .3, .88, .25, .14, .04, .14, BRASS); put(a + .3, .92, .25, .06, .2, .06, 0xd5c6a8); put(a + .3, 1.12, .25, .04, .07, .04, 0xffb45e, lit);
}
function sideChair(put, a, colour = 0x3a2620) {
  for (const k of [-1, 1]) for (const o of [.12, .5]) put(a + k * .2, 0, o, .05, .45, .05, colour);
  put(a, .45, .31, .5, .07, .5, colour); put(a, .52, .1, .5, .75, .07, colour); put(a, .5, .31, .44, .05, .44, 0x5a2030);
}
function grandClock(put, a) {
  put(a, 0, .25, .6, 2.3, .45, 0x3d2620); put(a, 2.3, .25, .68, .28, .5, 0x2c1b17); put(a, 1.6, .49, .42, .42, .03, 0xd8cfb4);
  put(a, 1.8, .51, .025, .14, .01, IRON); put(a + .04, 1.8, .51, .1, .025, .01, IRON); put(a, .35, .48, .3, 1, .02, 0x15111a); put(a, .55, .5, .1, .1, .02, BRASS);
}
function bust(put, a) {
  const STONE = 0xc2b9aa, SHADE = 0x8c8476;
  put(a, 0, .25, .42, .1, .42, 0x4a4052); put(a, .1, .25, .3, 1.0, .3, 0x5a5262); put(a, 1.1, .25, .42, .08, .42, 0x4a4052);
  put(a, 1.18, .25, .38, .14, .22, 0xb6ad9e); put(a, 1.3, .25, .24, .06, .16, 0xb6ad9e); put(a, 1.36, .25, .1, .1, .1, 0xb6ad9e);
  put(a, 1.46, .25, .2, .3, .22, STONE); put(a, 1.7, .23, .24, .1, .26, 0xa89f90); put(a, 1.56, .14, .24, .2, .06, 0xa89f90);
  for (const d of [-.05, .05]) put(a + d, 1.62, .36, .05, .03, .01, SHADE); put(a, 1.54, .37, .04, .08, .03, STONE); put(a, 1.5, .365, .08, .015, .01, SHADE);
}
function mirror(put, a, r) {
  put(a, .4, .04, .8, 2, .08, GOLD); put(a, .48, .09, .64, 1.84, .02, 0x52606e); put(a, .9, .1, .36, 1, .01, 0x7e92a0, true);
  for (let i = 0; i < 5; i++) put(a - .2 + i * .09, 1.4 - i * .12, .105, .08, .02, .005, 0x2a3036);
}
function shallowCase(put, a, r) {
  put(a, 0, .18, 1, 2.2, .04, 0x2e1c18); for (const k of [-1, 1]) put(a + k * .48, 0, .18, .05, 2.2, .36, 0x2e1c18);
  for (const y of [0, .55, 1.1, 1.65, 2.2]) put(a, y, .18, 1, .05, .36, 0x3a2420);
  for (const y of [.05, .6, 1.15, 1.7]) { let at = a - .42; while (at < a + .4) { const t = .05 + r() * .05; put(at, y, .2, t, .3 + r() * .14, .26, [0x5a2a2e, 0x2e3a4a, 0x3d4a2e, 0x6a4a2a][Math.floor(r() * 4)]); at += t + .012; } }
}
function coatRack(put, a) { put(a, 0, .3, .34, .05, .34, 0x2a1a17); put(a, .05, .3, .06, 1.8, .06, 0x3b2620); put(a, 1.2, .3, .38, .75, .24, 0x2c2633); put(a, 1.85, .3, .3, .12, .3, 0x1e1a24); }
function deadPlant(put, a) { put(a, 0, .25, .3, .9, .3, 0x2a1a17); put(a, .9, .25, .32, .26, .32, 0x6a4a3a); for (let i = 0; i < 5; i++) put(a + (i - 2) * .06, 1.16, .25 + (i % 2) * .06, .025, .3 + (i % 3) * .2, .025, 0x3a2a1e); }
function fallenFrames(put, a, r) { for (let i = 0; i < 2; i++) { const h = .7 + r() * .4; put(a + (i - .5) * .45, 0, .1 + i * .08, .6, h, .05, FRAMES[i]); put(a + (i - .5) * .45, .06, .14 + i * .08, .5, h - .12, .02, 0x241b2c); } }
// A corridor wall: `long` says whether the corridor runs along x.
function wallPut(v, long, at, normal) {
  return (a, y, o, along, h, depth, colour, glow = false) => long ? v.block(a, y, at + normal * o, along, h, depth, colour, glow) : v.block(at + normal * o, y, a, depth, h, along, colour, glow);
}
function dressCorridors(v, config, regions, allRegions, stages, lamps) {
  const rooms = regions.filter(q => q.kind === "room"), inside = (q, x, z, m = 0) => x >= q.x0 - m && x <= q.x1 + m && z >= q.z0 - m && z <= q.z1 + m;
  const near = (x, z, d) => config.rail.some(p => Math.hypot(p.x - x, p.z - z) < d);
  let n = 0;
  for (const [k, region] of regions.entries()) {
    if (region.kind === "room") continue;
    const long = region.x1 - region.x0 > region.z1 - region.z0, r = seeded(700 + k);
    const a0 = long ? region.x0 : region.z0, a1 = long ? region.x1 : region.z1;
    for (const [at, normal] of long ? [[region.z0, 1], [region.z1, -1]] : [[region.x0, 1], [region.x1, -1]]) {
      const put = wallPut(v, long, at, normal);
      for (let a = a0 + .9; a < a1 - .9; a += 1.3 + r() * .5) {
        const xIn = long ? a : at + normal * .35, zIn = long ? at + normal * .35 : a, xOut = long ? a : at - normal * .3, zOut = long ? at - normal * .3 : a;
        if (rooms.some(q => inside(q, xIn, zIn, .6)) || allRegions.some(q => inside(q, xOut, zOut)) || stages.some(s => Math.hypot(s.home.x - xIn, s.home.z - zIn) < 1.7)) continue;
        if (lamps.some(l => Math.hypot(l.x - xIn, l.z - zIn) < .8)) continue;
        const kind = n++ % 9, roomy = !near(xIn, zIn, 1.35);
        // A painting above almost every spot, and furniture below where there's room.
        if (kind !== 3 && kind !== 6) painting(put, a, 1.35 + r() * .35, .55 + r() * .4, .7 + r() * .4, Math.floor(r() * 4), FRAMES[Math.floor(r() * FRAMES.length)], r() < .2, r() < .45);
        if (!roomy) continue;
        if (kind === 0) consoleTable(put, a, r, true);
        else if (kind === 5) coatRack(put, a);
        else if (kind === 1) sideChair(put, a);
        else if (kind === 2) bust(put, a);
        else if (kind === 3) grandClock(put, a);
        else if (kind === 4) deadPlant(put, a);
        else if (kind === 6) mirror(put, a, r);
        else if (kind === 7) fallenFrames(put, a, r);
        else shallowCase(put, a, r);
      }
    }
    // A worn runner down the middle, clear of the rooms.
    const mid = long ? (region.z0 + region.z1) / 2 : (region.x0 + region.x1) / 2;
    for (let a = a0 + .25; a < a1; a += .5) { const x = long ? a : mid, z = long ? mid : a; if (rooms.some(q => inside(q, x, z, .2))) continue; v.block(x, .036, z, long ? .5 : 1.3, .014, long ? 1.3 : .5, (Math.round(a * 2) % 3 ? 0x4a2430 : 0x5a2c38)); v.block(x, .037, z, long ? .5 : 1.42, .012, long ? 1.42 : .5, 0x8a6a3a); }
  }
}
// Paintings and side tables on a room's end walls (either side of each door),
// the walls you face as you walk.
function endWalls(F, v, zone, seed) {
  const r = seeded(seed);
  for (const end of [-1, 1]) for (const k of [-1, 1]) {
    const u = k * 2.95; if (!F.clear(u, end * 4.6, .7, .4)) continue;
    const put = (a, y, o, along, h, depth, colour, glow = false) => v.block(F.X(u + a), y, F.Z(end * (5 - o)), along, h, depth, colour, glow);
    painting(put, 0, 1.45 + r() * .3, .7 + r() * .3, .85 + r() * .3, Math.floor(r() * 4), FRAMES[Math.floor(r() * FRAMES.length)], r() < .25, true);
    if (F.free(u, end * 4.65, .6, .3, .45)) (r() < .5 ? consoleTable : (p, a, rr) => sideChair(p, a))(put, 0, r, true);
  }
}
function setPiece(F, v, zone) {
  endWalls(F, v, zone, 980 + zone.index * 13);
  const set = SETS[zone.index] ?? SETS[0];
  nearRun(F, v, zone, 900 + zone.index * 37, set.fills);
  overhead(F, v, 950 + zone.index * 41, (F2, v2, u, y, w, r) => set.hang[Math.floor(r() * set.hang.length)](F2, v2, u, y, w, r));
}

// ---- The five chambers ------------------------------------------------------
function portrait(F, side, w, y, size, face, eyes) {
  F.wall(side, w, y, 0, size + .16, size * 1.3 + .16, .1, GOLD);
  F.wall(side, w, y + .08, .1, size, size * 1.3, .04, 0x241b2c);
  F.wall(side, w, y + size * .25, .14, size * .5, size * .55, .03, face);
  F.wall(side, w, y + size * .78, .14, size * .36, size * .38, .03, 0xbcae96);
  for (const d of [-.08, .08]) F.wall(side, w + d * size * 2, y + size * .95, .17, .05, .04, .02, eyes ? 0xffd9a6 : 0x6f6668, eyes);
}
function sconce(F, side, w, y, lamps, colour = 0xffb464) {
  F.wall(side, w, y, 0, .14, .3, .08, BRASS); F.wall(side, w, y + .14, .08, .3, .05, .22, BRASS);
  const x = F.X(side * 3.62), z = F.Z(w); candle(F.v, x, y + .19, z, .7);
  lamps.push({ x, y: y + .7, z, colour, kind: "flame", power: .8 });
}
function dressPassage(F, v, zone, config, lamps, active, moving) {
  // The long hall table, its candelabra, a cloche and a vase of dead roses.
  const tw = -1.4;
  F.b(-1, 0, tw, .9, .82, 2.6, 0x3b2620); F.b(-1, .82, tw, 1.05, .08, 2.8, 0x553829);
  for (const w of [-1.15, 1.15]) for (const u of [-1.38, -.62]) F.b(u, 0, tw + w, .1, .82, .1, 0x2a1a17);
  candelabra(v, F.X(-1), .9, F.Z(tw + .6)); lamps.push({ x: F.X(-1), y: 1.9, z: F.Z(tw + .6), colour: 0xffb46a, kind: "flame", power: 1.2 });
  F.b(-1, .9, tw - .7, .34, .05, .34, BRASS); F.b(-1, .95, tw - .7, .3, .36, .3, 0x9fb2b8); skull(v, F.X(-1), .98, F.Z(tw - .7), .6);
  F.b(-.95, .9, tw - 1.15, .18, .42, .18, 0x5b4a6d); for (let i = 0; i < 5; i++) F.b(-1.05 + (i % 3) * .07, 1.32 + i * .05, tw - 1.17 + (i % 2) * .08, .06, .16, .06, i % 2 ? 0x4a2b32 : 0x3a3227);
  // A chair under a dust sheet, as if someone sat down and never rose.
  if (F.clear(-2.75, 2.4, .5, .5)) { F.b(-2.75, 0, 2.4, .62, .5, .62, 0x7e7a80); F.b(-2.75, .5, 2.15, .62, .8, .14, 0x8a858c); F.b(-2.75, .02, 2.4, .72, .1, .72, 0x908b92); }
  // The far wall: a grandfather clock (its pendulum swings), portraits and sconces.
  if (F.clear(-3.6, -2.6, .4, .4)) {
    F.wall(-1, -2.6, 0, 0, .7, 2.5, .5, 0x3d2620); F.wall(-1, -2.6, 2.5, 0, .76, .3, .55, 0x2c1b17);
    F.wall(-1, -2.6, 1.75, .5, .44, .44, .02, 0xd8cfb4); F.wall(-1, -2.6, 1.96, .52, .03, .16, .01, IRON); F.wall(-1, -2.6 + .05, 1.96, .52, .12, .03, .01, IRON);
    F.wall(-1, -2.6, .45, .5, .36, 1.1, .02, 0x15111a);
    moving.push({ kind: "pendulum", x: F.X(-3.47), y: 1.5, z: F.Z(-2.6), s: F.s });
  }
  portrait(F, -1, .8, 1.25, .62, 0x4a3a52, active.has("whispering-portraits"));
  portrait(F, -1, 2.6, 1.4, .5, 0x3d4a3e, active.has("whispering-portraits"));
  for (const w of [-4.1, 4.1]) sconce(F, -1, w, 1.6, lamps);
  // The rail's side: a tall mirror that holds a faint glow, a coat stand, sconces.
  if (F.clear(3.7, -1.2, .3, .6)) { F.wall(1, -1.2, .3, 0, .9, 2.2, .1, GOLD); F.wall(1, -1.2, .4, .1, .72, 1.95, .03, 0x52606e); F.wall(1, -1.2, .7, .13, .5, 1.3, .01, 0x8ea2b0, true); }
  for (const w of [1.8, -3.6]) sconce(F, 1, w, 1.6, lamps);
  if (F.clear(3.4, 3.7, .4, .4)) { F.b(3.4, 0, 3.7, .36, .06, .36, 0x2a1a17); F.b(3.4, .06, 3.7, .07, 1.8, .07, 0x3b2620); F.b(3.4, 1.2, 3.7, .38, .7, .25, 0x2c2633); F.b(3.4, 1.86, 3.7, .3, .12, .3, 0x1e1a24); }
  // A threadbare runner along the rail, and cobwebs in the high corners.
  for (let w = -4.2; w <= 4.2; w += .5) F.b(2, .035, w, 1.1, .02, .5, (Math.round(w * 2) % 2 ? 0x5a2e3a : 0x6a3845));
  web(v, F.X(-3.9), 2.7, F.Z(-4.9), -F.s, active.has("cobweb-canopy")); web(v, F.X(3.9), 2.7, F.Z(4.9), F.s, false);
}
function dressCellar(F, v, zone, config, lamps, active, moving) {
  const barrel = (u, y, w, r = .36) => {
    for (let i = 0; i < 5; i++) { const wide = r * (i === 0 || i === 4 ? .86 : 1); F.b(u, y + i * .16, w, wide * 2, .16, wide * 2, vary(0x5e4130, .08, seeded(Math.round(u * 31 + w * 17 + i)))); }
    for (const yy of [.12, .64]) F.b(u, y + yy, w, r * 2 + .04, .05, r * 2 + .04, IRON);
    F.b(u, y + .8, w, r * 1.6, .03, r * 1.6, 0x4a3226);
  };
  // A pyramid of barrels with a lantern on top, and crates about it.
  const bw = -1.4;
  for (const w of [-.9, 0, .9]) barrel(-1.1, 0, bw + w);
  for (const w of [-.45, .45]) barrel(-1.1, .83, bw + w);
  barrel(-1.1, 1.66, bw, .32); lantern(v, F.X(-1.1), 2.5, F.Z(bw)); lamps.push({ x: F.X(-1.1), y: 2.75, z: F.Z(bw), colour: 0xffb062, kind: "flame", power: 1.2 });
  for (const [u, w, h] of [[-.2, 1.9, .6], [-.4, 2.6, .5], [-2.5, -2.2, .7], [-2.4, -1.4, .45]]) if (F.clear(u, w, .35, .35)) { F.b(u, 0, w, .62, h, .62, 0x6b5238); F.b(u, h - .03, w, .66, .05, .66, 0x7c6142); F.b(u, h / 2, w, .64, .06, .64, 0x4c3a28); }
  // Wine racks along the far wall, bottles catching the lamplight.
  for (const w0 of [-3.2, 1.3]) if (F.clear(-3.6, w0 + .9, .4, 1)) {
    F.wall(-1, w0 + .9, 0, 0, 2, 2.3, .5, 0x3d2b20);
    for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) F.wall(-1, w0 + .15 + col * .3, .2 + row * .34, .48, .1, .1, .06, (row + col) % 3 ? 0x1e3324 : 0x3b1d2a);
  }
  // Roots hang from the vault away from the rail; chains and a hook on the rail's side.
  const r = seeded(77 + zone.index);
  for (let i = 0; i < 14; i++) { const u = -3.6 + r() * 2.6, w = -4.4 + r() * 8.8, len = .3 + r() * .9; F.b(u, HEIGHT - len, w, .05, len, .05, 0x3e3226); }
  for (const w of [-2, 2.2]) if (F.clear(3.6, w, .3, .3)) { for (let i = 0; i < 9; i++) F.b(3.55, 3.5 - i * .14, w, i % 2 ? .05 : .12, .12, i % 2 ? .12 : .05, IRON); F.b(3.55, 2.15, w, .2, .05, .05, IRON); }
  for (const w of [-4, 3.9]) { lantern(v, F.X(3.55), 1.4, F.Z(w)); lamps.push({ x: F.X(3.55), y: 1.7, z: F.Z(w), colour: 0xffa95a, kind: "flame", power: .8 }); }
  // Puddles, and giant webs across the corners; the spider drops on its thread.
  for (const [u, w] of [[0, -3.4], [1.6, 3.6], [-2, 3.8]]) F.b(u, .036, w, .9, .01, .7, 0x1a2228);
  const big = active.has("cobweb-canopy");
  web(v, F.X(-3.9), 2.4, F.Z(-4.9), -F.s, true); web(v, F.X(3.9), 2.4, F.Z(-4.9), F.s, big); web(v, F.X(-3.9), 2.4, F.Z(4.9), -F.s, big);
  moving.push({ kind: "spider", x: F.X(-2.8), z: F.Z(-3.4), top: HEIGHT - .05, low: 1.45 });
  if (big) moving.push({ kind: "spider", x: F.X(-.3), z: F.Z(3.6), top: HEIGHT - .05, low: 2.2, phase: 2.1 });
}
function dressParlour(F, v, zone, config, lamps, active, moving) {
  // The séance table: a round cloth, chairs about it, a crystal ball and candles.
  const cu = -1, cw = -1.4;
  for (let i = 0; i < 4; i++) { const r = .95 - i * .06; F.b(cu, .02 + i * .2, cw, r * 2, .2, r * 1.6, 0x4a1f2e); F.b(cu, .02 + i * .2, cw, r * 1.6, .2, r * 2, 0x4a1f2e); }
  F.b(cu, .82, cw, 1.9, .06, 1.5, 0x5b2838); F.b(cu, .82, cw, 1.5, .06, 1.9, 0x5b2838);
  F.b(cu, .88, cw, .9, .015, .62, 0x9b7c58); for (let i = 0; i < 9; i++) F.b(cu - .32 + i * .08, .896, cw + .18, .04, .01, .04, 0x3a2a24);
  F.b(cu, .88, cw - .1, .18, .05, .14, 0xc9b28a);
  for (const [du, dw] of [[.75, .55], [-.75, .55], [.75, -.55], [-.75, -.55], [0, .8]]) candle(v, F.X(cu + du * .8), .88, F.Z(cw + dw * .8), .6);
  for (const [du, dw, side] of [[0, 1.2, 1], [0, -1.2, -1], [-1.3, 0, 0]]) {
    const u = cu + du, w = cw + dw;
    F.b(u, 0, w, .5, .45, .5, 0x3a1a20); F.b(u, .45, w, .56, .08, .56, 0x6a2c3a);
    if (side) F.b(u, .53, w + side * .25, .5, 1.1, .08, 0x3a1a20); else F.b(u - .25, .53, w, .08, 1.1, .5, 0x3a1a20);
  }
  moving.push({ kind: "crystal", x: F.X(cu), y: .9, z: F.Z(cw) });
  lamps.push({ x: F.X(cu), y: 1.35, z: F.Z(cw), colour: 0xb07ee0, kind: "glass", power: 1.1 });
  moving.push({ kind: "floating", x: F.X(cu), y: 1.75, z: F.Z(cw), s: F.s });
  // A chandelier over the table, well clear of the rail.
  const chy = 2.95; F.b(cu, chy, cw, .05, HEIGHT - chy, .05, BRASS); F.b(cu, chy - .06, cw, 1.1, .06, .08, BRASS); F.b(cu, chy - .06, cw, .08, .06, 1.1, BRASS);
  for (const [du, dw] of [[-.5, 0], [.5, 0], [0, -.5], [0, .5]]) candle(v, F.X(cu + du), chy, F.Z(cw + dw), .5);
  lamps.push({ x: F.X(cu), y: chy - .1, z: F.Z(cw), colour: 0xffb26c, kind: "flame", power: 1.1 });
  // Velvet curtains and an upright piano on the far wall; a fireplace on the rail's side.
  for (const w of [-3.9, 3.5]) if (F.clear(-3.8, w, .25, .5)) for (let i = 0; i < 6; i++) F.wall(-1, w - .45 + i * .18, .05, .05, .17, 3.4 - (i % 2) * .08, .16 - (i % 2) * .05, i % 2 ? 0x5d1626 : 0x721d30);
  if (F.clear(-3.5, -1.4, .5, 1)) {
    F.wall(-1, -1.4, 0, 0, 1.7, 1.35, .6, 0x241417); F.wall(-1, -1.4, .7, .6, 1.6, .06, .3, 0xe8dfcc); for (let i = 0; i < 12; i++) F.wall(-1, -2.1 + i * .13, .76, .62, .05, .03, .14, 0x16100f);
    F.wall(-1, -1.4, 1.35, 0, 1.7, .06, .62, 0x2e1a1f); candelabra(v, F.X(-3.6), 1.41, F.Z(-1.9), .7);
    lamps.push({ x: F.X(-3.6), y: 2.1, z: F.Z(-1.9), colour: 0xffb26c, kind: "flame", power: .7 });
  }
  portrait(F, -1, 1.4, 1.5, .6, 0x5a3443, active.has("whispering-portraits"));
  if (F.clear(3.6, -1.6, .4, 1)) {
    F.wall(1, -1.6, 0, 0, 1.9, 1.5, .5, 0x3f3540); F.wall(1, -1.6, .15, .25, 1.1, .85, .3, 0x140d10);
    for (let i = -2; i <= 2; i++) F.wall(1, -1.6 + i * .18, .2, .3, .12, .18 + (i % 2 ? .12 : .22), .12, i % 2 ? 0xff9a4a : 0xe2662c, true);
    F.wall(1, -1.6, 1.5, 0, 2.1, .12, .62, 0x2b2226); candle(v, F.X(3.65), 1.62, F.Z(-2.3), .6); candle(v, F.X(3.65), 1.62, F.Z(-.9), .6);
    lamps.push({ x: F.X(3.3), y: .7, z: F.Z(-1.6), colour: 0xff8c42, kind: "flame", power: 1.3 });
  }
  for (const w of [2.6]) sconce(F, 1, w, 1.6, lamps);
  // A round rug under the table.
  for (let i = 0; i < 3; i++) { const r = 1.7 - i * .45; F.b(cu, .03 + i * .004, cw, r * 2, .01, r * 1.4, i % 2 ? 0x7a3a3a : 0x5a2430); F.b(cu, .03 + i * .004, cw, r * 1.4, .01, r * 2, i % 2 ? 0x7a3a3a : 0x5a2430); }
}
function dressLaboratory(F, v, zone, config, lamps, active, moving) {
  // An operating table with a sheet over something that should be still.
  const cu = -1, cw = -1.4;
  for (const w of [-1, 1]) for (const u of [-.35, .35]) F.b(cu + u, 0, cw + w * .9, .08, .85, .08, IRON);
  F.b(cu, .85, cw, .95, .08, 2.2, 0x6b7672); F.b(cu, .93, cw, .8, .22, 1.9, 0xd2d0c4); F.b(cu, 1.12, cw + .75, .42, .2, .34, 0xdad8cc); F.b(cu, 1.15, cw - .35, .5, .12, .7, 0xcfcdc0);
  F.b(cu + .44, .7, cw - .85, .05, .3, .05, 0x5f5a50); F.b(cu + .46, .6, cw - .85, .07, .1, .14, 0x8d887a);
  // The lamp overhead, on its arm.
  F.b(cu, 2.75, cw, .06, HEIGHT - 2.75, .06, IRON); F.b(cu, 2.62, cw, .6, .14, .6, 0x404a48); F.b(cu, 2.58, cw, .42, .04, .42, 0xe6f5ee, true);
  lamps.push({ x: F.X(cu), y: 2.45, z: F.Z(cw), colour: 0xcff5ea, kind: "glass", power: 1.2 });
  // Two coils with copper rings; their arcs crackle when the storm wakes.
  for (const w of [3.2, -3.4]) if (F.clear(-2.8, w, .5, .5)) {
    F.b(-2.8, 0, w, .8, .25, .8, 0x2a3030); F.b(-2.8, .25, w, .24, 1.6, .24, 0x8d8a80);
    for (let i = 0; i < 7; i++) F.b(-2.8, .35 + i * .2, w, .44, .07, .44, i % 2 ? 0xb06a3a : 0xc8844a);
    F.b(-2.8, 1.85, w, .62, .26, .62, 0x9fa6a4); F.b(-2.8, 2.11, w, .22, .14, .22, 0xb8e9e0, true);
    lamps.push({ x: F.X(-2.8), y: 2.3, z: F.Z(w), colour: 0x8fe3d8, kind: "arc", power: active.has("thunder-chamber") ? 1.6 : 1 });
    moving.push({ kind: "coil", x: F.X(-2.8), y: 2.2, z: F.Z(w), storm: active.has("thunder-chamber") });
  }
  // The bench of jars along the far wall, shelves above, and the great switch.
  if (F.clear(-3.6, -.2, .4, 1.6)) {
    F.wall(-1, -.2, 0, 0, 3.2, .95, .7, 0x3a3532); F.wall(-1, -.2, .95, 0, 3.3, .06, .74, 0x5a524c);
    const jars = [0x6cf0b0, 0x8fd0ff, 0xc3f06a, 0x6cf0b0, 0xe07ad0];
    for (let i = 0; i < 5; i++) { const w = -1.5 + i * .65; F.wall(-1, w, 1.01, .15, .24, .42, .24, 0x8aa0a0); F.wall(-1, w, 1.05, .18, .18, .32, .18, jars[i], true); }
    lamps.push({ x: F.X(-3.3), y: 1.4, z: F.Z(-.2), colour: 0x7ff0b8, kind: "glass", power: .9 });
    for (const y of [2, 2.6]) { F.wall(-1, -.2, y, 0, 3, .05, .3, 0x4a3a30); for (let i = 0; i < 9; i++) F.wall(-1, -1.5 + i * .32, y + .05, .05, .12, .18 + (i % 3) * .06, .12, [0x3e6a52, 0x5a3a6a, 0x7a6a3a][i % 3]); }
  }
  if (F.clear(3.7, 2.6, .3, .5)) { F.wall(1, 2.6, .9, 0, .9, 1.1, .12, 0x3a3f3e); F.wall(1, 2.6, 1.15, .12, .1, .6, .1, IRON); F.wall(1, 2.4, 1.35, .2, .06, .06, .5, 0x9a9a92); F.wall(1, 2.6, 1.2, .14, .5, .06, .04, 0xffd36a, true); }
  // A control panel with dials on the rail's side, and a window the lightning shows.
  if (F.clear(3.7, -1.4, .3, .8)) {
    F.wall(1, -1.4, 0, 0, 1.4, 1.3, .45, 0x3c4644); F.wall(1, -1.4, 1.3, 0, 1.4, .1, .55, 0x2c3433);
    for (let i = 0; i < 6; i++) F.wall(1, -1.95 + i * .22, .95, .45, .12, .12, .03, i % 2 ? 0xffb85a : 0x7ff0c8, true);
  }
  if (F.clear(3.8, 1, .3, .8)) { F.wall(1, 1, 1.5, 0, 1.3, 1.5, .1, IRON); F.wall(1, 1, 1.58, .08, 1.1, 1.3, .03, 0x26334a); F.wall(1, 1, 2.2, .1, 1.1, .04, .03, IRON); moving.push({ kind: "window", x: F.X(3.85), y: 2.25, z: F.Z(1) }); }
  // Cables on the floor and pipes along the ceiling's edges.
  for (let w = -4; w <= 3.5; w += .5) F.b(-1.9 + Math.sin(w) * .15, .04, w, .08, .05, .52, 0x1a1a1a);
  for (const u of [-3.7, 3.7]) F.b(u, 3.25, 0, .14, .14, 10, 0x6a5a48);
  if (active.has("thunder-chamber")) for (const [u, w] of [[-1, 2.6], [-1, -2.6], [.4, 0]]) for (const [a, c, sa, sc] of [[0, .4, .9, .07], [0, -.4, .9, .07], [.4, 0, .07, .9], [-.4, 0, .07, .9], [0, 0, .3, .3]]) F.b(u + a, .036, w + c, sa, .01, sc, 0x5fd8c4, true);
}
function dressCrypt(F, v, zone, config, lamps, active, moving) {
  // A carved sarcophagus, its lid moving, candelabras at its corners.
  const cu = -1.1, cw = -1.1;
  F.b(cu, 0, cw, 1.2, .2, 2.4, 0x3b3542); F.b(cu, .2, cw, 1.05, .7, 2.2, 0x5a5262);
  for (let i = 0; i < 5; i++) F.b(cu + .53, .3, cw - .8 + i * .4, .03, .5, .22, 0x6c6474);
  for (const [du, dw] of [[.75, 1.25], [-.75, 1.25], [.75, -1.25], [-.75, -1.25]]) { candelabra(v, F.X(cu + du), 0, F.Z(cw + dw), .95); }
  lamps.push({ x: F.X(cu), y: 1.3, z: F.Z(cw + 1.4), colour: 0xffa85e, kind: "flame", power: 1.1 }, { x: F.X(cu), y: 1.3, z: F.Z(cw - 1.4), colour: 0xffa85e, kind: "flame", power: 1 });
  moving.push({ kind: "lid", x: F.X(cu), y: .9, z: F.Z(cw), s: F.s });
  // Upright coffins in the far wall's bays between velvet drapes.
  for (const w of [-2.6, 0, 2.6]) if (F.clear(-3.6, w, .4, .5)) {
    F.wall(-1, w, 0, 0, .78, 2.2, .45, 0x2a1d1a); F.wall(-1, w, .1, .45, .66, 2, .05, 0x3d2a24);
    F.wall(-1, w, 1.25, .5, .12, .5, .02, BRASS); F.wall(-1, w, 1.4, .5, .4, .1, .02, BRASS);
  }
  for (const w of [-1.3, 1.3, -3.9, 3.9]) for (let i = 0; i < 5; i++) F.wall(-1, w - .36 + i * .18, .05, .05, .17, 3.45 - (i % 2) * .1, .14 - (i % 2) * .05, i % 2 ? 0x4a1430 : 0x5e1a3c);
  // Skull piles and candles along the rail's side.
  for (const w of [-3.4, 1.4]) if (F.clear(3.4, w, .5, .5)) {
    for (const [du, dw, y] of [[0, 0, 0], [.3, .2, 0], [-.25, .25, 0], [.05, .1, .27]]) skull(v, F.X(3.4 + du), y, F.Z(w + dw), .9, -F.s);
    candle(v, F.X(3.75), 0, F.Z(w + .55), 1.1); lamps.push({ x: F.X(3.6), y: .9, z: F.Z(w + .5), colour: 0xffa05a, kind: "flame", power: .7 });
  }
  for (let w = -4.6; w <= 4.6; w += 1.15) { F.b(3.85, 0, w, .3, HEIGHT, .3, 0x3a3440); F.b(-3.85, 0, w, .3, HEIGHT, .3, 0x3a3440); }
  if (active.has("phantom-finale")) for (const w of [-3.6, 3.6]) { F.b(-2.2, 0, w, .32, 2.9, .4, GOLD); skull(v, F.X(-2.2), 2.9, F.Z(w)); lamps.push({ x: F.X(-2.2), y: 2.6, z: F.Z(w), colour: 0xb497ff, kind: "glass", power: .8 }); }
}
const DRESS = [dressPassage, dressCellar, dressParlour, dressLaboratory, dressCrypt];

// ---- Shell -------------------------------------------------------------
// One wall slice at a cell's open edge, in the chamber's finish.
function wallSlice(v, x, z, dx, dz, F, r) {
  const at = (y, h, colour, out = 0) => v.block(x - dx * out, y, z - dz * out, dx ? .22 : CELL, h, dz ? .22 : CELL, colour);
  at(0, HEIGHT, 0x1d171f, -.08);
  if (F.name === "cellar" || F.name === "crypt") {
    for (let y = 0, row = 0; y < HEIGHT; y += .42, row++) at(y + .02, Math.min(.4, HEIGHT - y - .02), vary(row % 2 ? F.paper[0] : F.paper[1], .14, r));
    if (F.name === "cellar") at(0, .5, vary(0x3a4a3a, .2, r), .02);
    return;
  }
  at(0, .16, F.base, .03);
  if (F.name === "laboratory") { for (let y = .16; y < 1.5; y += .25) at(y + .01, .23, vary((Math.round(y * 4) + Math.round((x + z) * 4)) % 2 ? F.panel : 0x95a49c, .04, r)); }
  else at(.16, .9, vary(F.panel, .05, r), .02);
  const top = F.name === "laboratory" ? 1.5 : 1.06, slot = Math.round((x + z) * 2) & 1;
  at(top, .07, F.rail, .05);
  for (let y = top + .07; y < 3.3; y += .44) at(y, Math.min(.44, 3.3 - y), vary(F.paper[0], F.name === "laboratory" ? .1 : .035, r));
  // A small repeating motif on the paper (brick courses in the laboratory).
  if (F.name === "laboratory") for (let y = top + .5; y < 3.2; y += .44) at(y, .03, 0x2a2524, .01);
  else for (let y = top + .38 + slot * .45; y < 3.1; y += .9) { const w = .14; v.block(x - dx * .02, y, z - dz * .02, dx ? .2 : w * .5, w * 1.6, dz ? .2 : w * .5, F.paper[1]); v.block(x - dx * .02, y + w * .5, z - dz * .02, dx ? .2 : w, w * .6, dz ? .2 : w, F.paper[1]); v.block(x - dx * .025, y + w * .6, z - dz * .025, dx ? .2 : w * .3, w * .3, dz ? .2 : w * .3, F.rail); }
  at(3.3, HEIGHT - 3.3, F.crown, .04);
  const along = Math.round(dx ? z * 2 : x * 2);
  if (((along % 5) + 5) % 5 === 0) {
    if (F.name === "laboratory") v.block(x - dx * .12, 0, z - dz * .12, dx ? .1 : .1, HEIGHT, dz ? .1 : .1, 0x6a5a48);
    else { v.block(x - dx * .09, 0, z - dz * .09, dx ? .14 : .26, HEIGHT - .05, dz ? .14 : .26, F.crown); v.block(x - dx * .12, 2.95, z - dz * .12, dx ? .2 : .34, .18, dz ? .2 : .34, F.rail); }
  }
}

// Native voxel shell and dressing, assembled once per snapshot.
export function buildMazeRideWorld(config) {
  const regions = mazeRideRegions(config), stages = (config.encounters ?? []).map(e => mazeEncounterStage(config, e, regions));
  const allRegions = [...regions, ...stages.map(s => s.recess)], cells = new Map(), v = new Voxels(), r = seeded(913 + config.tier), lamps = [], moving = [];
  const active = new Set(config.activePrefabs ?? []), recesses = stages.map(s => s.recess);
  const minX = Math.min(...allRegions.map(b => b.x0)), maxX = Math.max(...allRegions.map(b => b.x1)), minZ = Math.min(...allRegions.map(b => b.z0)), maxZ = Math.max(...allRegions.map(b => b.z1));
  for (let ix = Math.floor(minX / CELL); ix < Math.ceil(maxX / CELL); ix++) for (let iz = Math.floor(minZ / CELL); iz < Math.ceil(maxZ / CELL); iz++) {
    const x = (ix + .5) * CELL, z = (iz + .5) * CELL, region = allRegions.find(b => within(b, x, z));
    if (region) cells.set(`${ix},${iz}`, { ix, iz, x, z, zone: region.zone, kind: region.kind });
  }
  for (const c of cells.values()) {
    const { ix, iz, x, z } = c, F = FINISH[c.zone] ?? FINISH[0], dim = c.kind === "room" ? 1 : .85;
    v.block(x, -.18, z, CELL, .18, CELL, 0x17131b);
    const pattern = F.name === "laboratory" ? (ix + iz) & 1 : F.name === "parlour" ? (ix + (iz >> 1)) & 1 : F.name === "passage" ? ix & 1 : r() < .5 ? 0 : 1;
    const floor = vary(F.floor[pattern], .08, r);
    v.block(x, 0, z, .49, .035 + (F.name === "cellar" ? r() * .012 : 0), .49, dim === 1 ? floor : new THREE.Color(floor).multiplyScalar(dim).getHex());
    v.block(x, HEIGHT, z, CELL, .2, CELL, F.ceiling);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!cells.has(`${ix + dx},${iz + dz}`)) wallSlice(v, x + dx * .25, z + dz * .25, dx, dz, F, r);
  }
  // Ceiling beams across every room, and lanterns down the passages and halls.
  for (const zone of config.zones) {
    const F = FINISH[zone.index], { x, z } = zone.center;
    for (const dz of [-4, -1.3, 1.3, 4]) v.block(x, HEIGHT - .24, z + dz, 8, .24, .26, F.crown);
    const room = frame(v, zone, recesses);
    DRESS[zone.index](room, v, zone, config, lamps, active, moving);
    CLUTTER[zone.index](room, v, zone, active);
    setPiece(room, v, zone);
  }
  for (const region of regions) if (region.kind !== "room") {
    const cx = (region.x0 + region.x1) / 2, cz = (region.z0 + region.z1) / 2, long = region.x1 - region.x0 > region.z1 - region.z0;
    const span = long ? region.x1 - region.x0 : region.z1 - region.z0;
    for (let t = -span / 2 + 1.5; t < span / 2 - .5; t += 3.2) {
      const x = long ? cx + t : region.x0 + .22, z = long ? region.z0 + .22 : cz + t;
      if (stages.some(s => Math.hypot(s.home.x - x, s.home.z - z) < 1.6) || config.rail.some(p => Math.hypot(p.x - x, p.z - z) < 1.1) || regions.some(q => q.kind === "room" && within({ x0: q.x0 - .6, x1: q.x1 + .6, z0: q.z0 - .6, z1: q.z1 + .6 }, x, z))) continue;
      v.block(x, 2.42, z, .16, .16, .16, IRON); lantern(v, long ? x : x + .2, 2.45, long ? z + .2 : z);
      lamps.push({ x: long ? x : x + .25, y: 2.7, z: long ? z + .25 : z, colour: 0xffae64, kind: "flame", power: .6 });
    }
  }
  dressCorridors(v, config, regions, allRegions, stages, lamps);
  // In the passages and halls: webs along the ceiling edges and the odd crate,
  // candle stub or bones against the walls, never near the walking line.
  for (const [k, region] of regions.entries()) if (region.kind !== "room") {
    const long = region.x1 - region.x0 > region.z1 - region.z0, span = long ? region.x1 - region.x0 : region.z1 - region.z0, rr = seeded(500 + k);
    for (let t = .8; t < span - .8; t += 1.4) for (const edge of [0, 1]) {
      const x = long ? region.x0 + t : edge ? region.x1 - .08 : region.x0 + .08, z = long ? (edge ? region.z1 - .08 : region.z0 + .08) : region.z0 + t;
      if (config.rail.some(p => Math.hypot(p.x - x, p.z - z) < 1.05) || stages.some(s => Math.hypot(s.home.x - x, s.home.z - z) < 1.4)) continue;
      const ix = long ? 0 : edge ? -1 : 1, iz = long ? (edge ? -1 : 1) : 0, along = long ? [1, 0] : [0, 1];
      if (rr() < .6) cornerWeb(v, x, HEIGHT - .02, z, ix, iz, .55 + rr() * .45);
      const kind = rr(), px = x + ix * .25, pz = z + iz * .25;
      if (config.rail.some(p => Math.hypot(p.x - px, p.z - pz) < 1.2)) continue;
      if (kind < .22) { v.block(px, 0, pz, .4, .4, .4, 0x6b5238); v.block(px, .38, pz, .44, .05, .44, 0x7c6142); }
      else if (kind < .38) { candle(v, px, 0, pz, .9); candle(v, px + along[0] * .18, 0, pz + along[1] * .18, .6); }
      else if (kind < .5) { skull(v, px, 0, pz, .7, iz || 1); v.block(px + along[0] * .2, .03, pz + along[1] * .2, along[0] ? .3 : .06, .05, along[1] ? .3 : .06, BONE); }
    }
  }
  for (const stage of stages) {
    const { home, rail } = stage;
    v.block(home.x, .04, home.z, .9, .08, .9, 0x17141e);
    v.block(home.x, 2.75, home.z, 1.15, .12, 1.15, 0x2b1d1c);
    for (const direction of [-1, 1]) v.block(home.x + rail.dx * direction * .57, .08, home.z + rail.dz * direction * .57, .1, 2.7, .1, GOLD);
  }
  // Door frames at both ends; the doors themselves move (below).
  const first = config.zones[0].center, last = config.zones.at(-1).center, hall = MAZE_RIDE_ROOM.hall;
  const doors = [{ x: first.x, z: first.z + 5 + hall - 1.8, open: "start" }, { x: last.x, z: last.z - 5 - hall + .7, open: "end" }];
  for (const d of doors) {
    for (const side of [-1, 1]) v.block(d.x + side * 1.32, 0, d.z, .24, 2.9, .3, 0x3b2620);
    v.block(d.x, 2.78, d.z, 2.9, .3, .32, 0x3b2620); skull(v, d.x, 3.08, d.z + (d.open === "start" ? .1 : -.1), .6, d.open === "start" ? 1 : -1);
    for (const side of [-1, 1]) { lantern(v, d.x + side * 1.55, 1.65, d.z + (d.open === "start" ? .3 : -.3)); lamps.push({ x: d.x + side * 1.55, y: 1.95, z: d.z, colour: 0xffb064, kind: "flame", power: .7 }); }
  }
  // The foyer's candlelight beyond the exit doors.
  const beyond = doors[1];
  // Light pouring through the doorway: brighter towards the middle.
  for (const [i, colour] of [0x6a3a1c, 0x9a5a2a, 0xc98642, 0xf0b56a, 0xffe0aa].entries()) v.block(beyond.x, .25 * i, beyond.z - .45 + i * .03, 2.4 - i * .45, 2.8 - i * .45, .04, colour, true);
  lamps.push({ x: beyond.x, y: 1.6, z: beyond.z - .2, colour: 0xffc98a, kind: "door", power: 0 });
  const group = v.build({ shadows: false }); group.name = "Hollow House ride shell";
  const animated = buildMoving(moving, doors, r); group.add(animated.group);
  const fogCount = Math.min(110, 18 * config.tier + 20), coords = new Float32Array(fogCount * 3), floorCells = [...cells.values()];
  for (let i = 0; i < fogCount; i++) { const c = floorCells[Math.floor(r() * floorCells.length)]; coords.set([c.x, .14 + r() * .45, c.z], i * 3); }
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) pixels.set([255, 255, 255, Math.round(Math.max(0, 1 - Math.hypot(x - 15.5, y - 15.5) / 15.5) ** 2 * 255)], (y * 32 + x) * 4);
  const map = new THREE.DataTexture(pixels, 32, 32); map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearFilter; map.needsUpdate = true;
  const mistGeometry = new THREE.BufferGeometry(); mistGeometry.setAttribute("position", new THREE.BufferAttribute(coords, 3));
  const mist = new THREE.Points(mistGeometry, new THREE.PointsMaterial({ map, color: 0x8c78a5, size: 2.7, transparent: true, opacity: .16, depthWrite: false, toneMapped: false }));
  mist.name = "Low violet haze"; group.add(mist);
  // Spectral wisps drift through the parlour and the laboratory when the parade is installed.
  let wisps = null;
  if (active.has("spectral-parade")) {
    const count = 26, pos = new Float32Array(count * 3), rooms = config.zones.filter(z => z.index === 2 || z.index === 3);
    const seeds = Array.from({ length: count }, (_, i) => ({ room: rooms[i % Math.max(1, rooms.length)]?.center ?? config.zones[0].center, a: r() * Math.PI * 2, rad: 1.6 + r() * 1.6, h: 1.9 + r() * 1.1, speed: .15 + r() * .2 }));
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    wisps = new THREE.Points(g, new THREE.PointsMaterial({ map, color: 0x9fe7e0, size: .38, transparent: true, opacity: .6, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    wisps.userData.seeds = seeds; wisps.name = "Spectral wisps"; group.add(wisps);
  }
  let disposed = false;
  const world = {
    group, stages, lamps, regions: allRegions, boxes: [...v.solid, ...v.glow], cells: floorCells, moving: animated.parts,
    diagnostics: { boxes: v.solid.length + v.glow.length, floorCells: cells.size, batches: group.children.length, sharedCube: true, tier: config.tier, moving: animated.parts.length },
    // time: the walk's clock; doors: 0..1 open for the entrance and exit.
    tick(time, gentle = false, ride = {}) {
      mist.material.opacity = .14 + (gentle ? 0 : Math.sin(time * .2) * .012);
      animated.tick(time, gentle, ride);
      if (wisps) {
        const p = wisps.geometry.attributes.position;
        wisps.userData.seeds.forEach((s, i) => { const a = s.a + time * s.speed * (gentle ? .5 : 1); p.setXYZ(i, s.room.x + Math.cos(a) * s.rad, s.h + Math.sin(time * .7 + i) * .15, s.room.z + Math.sin(a) * s.rad * 1.3); });
        p.needsUpdate = true;
      }
    },
    dispose() {
      if (disposed) return; disposed = true;
      group.traverse(m => { if (m.isInstancedMesh) m.dispose(); else if (m.geometry && !m.userData.sharedGeometry) m.geometry.dispose(); for (const material of Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) { material.map?.dispose(); material.dispose(); } });
      group.removeFromParent();
    },
  };
  group.userData.mazeRide = world.diagnostics;
  return world;
}

// ---- The pieces that move ------------------------------------------------
function buildMoving(list, doors, r) {
  const group = new THREE.Group(), parts = [];
  group.name = "Hollow House moving pieces";
  const solid = (colour, opts = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: .9, metalness: 0, ...opts });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const add = (parent, x, y, z, w, h, d, material) => { const m = new THREE.Mesh(box, material); m.position.set(x, y, z); m.scale.set(w, h, d); m.userData.sharedGeometry = true; parent.add(m); return m; };
  const wood = solid(0x3d2620), dark = solid(0x1b1418), brass = solid(BRASS, { metalness: .4, roughness: .5 }), sheet = solid(0x6a6a72);
  // The entrance and exit doors: two leaves each, hinged at the frame.
  for (const d of doors) {
    const leaves = [-1, 1].map(side => {
      const hinge = new THREE.Group(); hinge.position.set(d.x + side * 1.2, 0, d.z); group.add(hinge);
      add(hinge, -side * .6, 1.35, 0, 1.18, 2.7, .1, wood);
      for (const y of [.6, 1.5, 2.3]) add(hinge, -side * .6, y, d.open === "start" ? .07 : -.07, .95, .5, .03, dark);
      add(hinge, -side * 1.05, 1.3, d.open === "start" ? .1 : -.1, .06, .2, .05, brass);
      return { hinge, side };
    });
    parts.push({ kind: "door", open: d.open, leaves });
  }
  for (const m of list) {
    if (m.kind === "pendulum") {
      const pivot = new THREE.Group(); pivot.position.set(m.x, m.y + .45, m.z); group.add(pivot);
      add(pivot, 0, -.45, 0, .03, .8, .03, brass); add(pivot, 0, -.88, 0, .02, .16, .16, brass);
      pivot.rotation.order = "YXZ"; parts.push({ kind: m.kind, pivot });
    } else if (m.kind === "spider") {
      const body = new THREE.Group(), legs = solid(0x15121a), thread = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0x8c8696 }));
      thread.userData.sharedGeometry = true; group.add(thread);
      add(body, 0, 0, 0, .22, .16, .26, legs); add(body, 0, .02, .18, .14, .12, .14, legs);
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) add(body, side * .2, -.02, -.1 + i * .08, .24, .025, .025, legs);
      for (const side of [-1, 1]) add(body, side * .04, .05, .25, .03, .03, .02, solid(0xff5040, { emissive: 0xff3020, emissiveIntensity: 1 }));
      body.position.set(m.x, m.top, m.z); group.add(body); parts.push({ kind: m.kind, body, thread, ...m });
    } else if (m.kind === "crystal") {
      const material = new THREE.MeshBasicMaterial({ color: 0xc89cff, toneMapped: false, transparent: true, opacity: .85 });
      const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(.17, 1), material); ball.position.set(m.x, m.y + .2, m.z);
      add(group, m.x, m.y, m.z, .22, .06, .22, brass); group.add(ball); parts.push({ kind: m.kind, ball, material });
    } else if (m.kind === "floating") {
      const ring = new THREE.Group(); ring.position.set(m.x, m.y, m.z); group.add(ring);
      const china = solid(0xd8d0c6), book = solid(0x5a2a3a);
      const items = Array.from({ length: 6 }, (_, i) => { const o = new THREE.Group(); ring.add(o); if (i % 3 === 2) add(o, 0, 0, 0, .28, .06, .2, book); else { add(o, 0, 0, 0, .12, .1, .12, china); add(o, 0, -.06, 0, .2, .02, .2, china); } return o; });
      parts.push({ kind: m.kind, ring, items });
    } else if (m.kind === "coil") {
      const material = new THREE.LineBasicMaterial({ color: 0xbdf6ff, transparent: true, opacity: 1, toneMapped: false });
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * 2 * 12), 3));
      const arcs = new THREE.LineSegments(geometry, material); group.add(arcs); parts.push({ kind: m.kind, arcs, material, ...m, seed: r() * 100 });
    } else if (m.kind === "window") {
      const material = new THREE.MeshBasicMaterial({ color: 0xdfe8ff, toneMapped: false, transparent: true, opacity: 0 });
      const pane = add(group, m.x, m.y, m.z, .02, 1.15, 1.25, material); parts.push({ kind: m.kind, pane, material });
    } else if (m.kind === "lid") {
      const lid = new THREE.Group(); lid.position.set(m.x, m.y, m.z); group.add(lid);
      add(lid, 0, .06, 0, 1.18, .12, 2.36, solid(0x6a6274)); add(lid, 0, .14, 0, .6, .06, 1.6, solid(0x7a7284));
      parts.push({ kind: m.kind, lid, s: m.s, x: m.x });
    }
  }
  const ease = t => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
  return {
    group, parts,
    tick(time, gentle, ride) {
      const elapsed = ride.elapsed ?? time, duration = ride.duration ?? Infinity;
      for (const p of parts) {
        if (p.kind === "door") {
          const t = p.open === "start" ? ease((elapsed - .25) / .9) : ease((elapsed - (duration - 1.3)) / 1.1);
          for (const { hinge, side } of p.leaves) hinge.rotation.y = side * t * (p.open === "start" ? -1.75 : 1.75);
        } else if (p.kind === "pendulum") p.pivot.rotation.z = Math.sin(time * 2.4) * (gentle ? .12 : .26);
        else if (p.kind === "spider") {
          const k = gentle ? .5 : .5 + .5 * Math.sin(time * .9 + (p.phase ?? 0)), y = p.top - (p.top - p.low) * k;
          p.body.position.y = y; p.body.rotation.y = Math.sin(time * .6) * .5;
          p.thread.position.set(p.x, (p.top + y) / 2 + .1, p.z); p.thread.scale.set(.012, Math.max(.02, p.top - y), .012);
        } else if (p.kind === "crystal") { const k = .6 + .4 * Math.sin(time * 2.2); p.material.color.setRGB(.6 + .2 * k, .45 + .2 * k, 1); p.ball.rotation.y = time * .4; }
        else if (p.kind === "floating") {
          p.ring.rotation.y = time * (gentle ? .15 : .3);
          p.items.forEach((o, i) => { const a = i / p.items.length * Math.PI * 2; o.position.set(Math.cos(a) * .85, Math.sin(time * 1.1 + i) * (gentle ? .04 : .12), Math.sin(a) * .7); o.rotation.set(Math.sin(time + i) * .3, time * .5 + i, 0); });
        } else if (p.kind === "coil") {
          const rate = p.storm ? 1 : .55, live = (Math.sin(time * 3.1 + p.seed) + Math.sin(time * 7.7 + p.seed * 2)) > (gentle ? 1.6 : 1.1 - rate * .6);
          const pos = p.arcs.geometry.attributes.position; p.arcs.visible = live;
          if (live) {
            let x = p.x, y = p.y, z = p.z; const n = 12, dir = Math.sin(time * 13 + p.seed) * Math.PI;
            for (let i = 0; i < n; i++) {
              const nx = p.x + Math.cos(dir) * (i + 1) * .09 + (Math.sin(time * 41 + i * 7 + p.seed) * .08), ny = p.y + Math.sin((i + 1) / n * 2.4) * .5 + Math.sin(time * 37 + i) * .05, nz = p.z + Math.sin(dir) * (i + 1) * .09 + Math.cos(time * 43 + i * 5) * .08;
              pos.setXYZ(i * 2, x, y, z); pos.setXYZ(i * 2 + 1, nx, ny, nz); x = nx; y = ny; z = nz;
            }
            pos.needsUpdate = true;
          }
        } else if (p.kind === "window") {
          const flash = Math.max(0, Math.sin(time * .9) - .985) * 60 + Math.max(0, Math.sin(time * .9 + .25) - .99) * 40;
          p.material.opacity = Math.min(gentle ? .35 : .95, flash);
        } else if (p.kind === "lid") { const k = gentle ? .1 : .1 + .1 * (.5 + .5 * Math.sin(time * .35)); p.lid.position.x = p.x - p.s * k; p.lid.rotation.y = k * .25; }
      }
    },
  };
}

export const createMazeRideWorld = buildMazeRideWorld;
