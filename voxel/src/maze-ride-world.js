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
  return {
    v, s, X, Z, clear,
    // A box centred on (u, w), standing on y; su is its size across the room.
    b(u, y, w, su, sy, sw, colour, glow = false) { v.block(X(u), y, Z(w), su, sy, sw, colour, glow); },
    // On a side wall (u = ±4) facing into the room: depth out from the wall, width along it.
    wall(side, w, y, out, width, h, depth, colour, glow = false) { v.block(X(side * (4 - out - depth / 2)), y, Z(w), depth, h, width, colour, glow); },
  };
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
    DRESS[zone.index](frame(v, zone, recesses), v, zone, config, lamps, active, moving);
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
