import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { sampleMazeRail } from "./content/maze-ride.js";

const CELL = .5, HEIGHT = 3.65, WOOD = 0x35232f, GOLD = 0xb08a56, IRON = 0x211e2b;
const STONE = [0x514656, 0x605064, 0x443b4e, 0x65545f, 0x554453];
const within = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

// Rooms and wide overlapping elbows share a floor; no doorway wall crosses it.
export function mazeRideRegions(config) {
  const zones = config?.zones ?? [], regions = zones.map(z => ({ ...z.bounds, zone: z.index, kind: "room" }));
  for (let i = 1; i < zones.length; i++) {
    const a = zones[i - 1].center, b = zones[i].center, bend = (a.z + b.z) / 2;
    regions.push({ x0: a.x - 1.8, x1: a.x + 1.8, z0: bend - 1.8, z1: a.z, zone: i - 1, kind: "passage" });
    regions.push({ x0: Math.min(a.x, b.x) - 1.8, x1: Math.max(a.x, b.x) + 1.8, z0: bend - 1.8, z1: bend + 1.8, zone: i - 1, kind: "passage" });
    regions.push({ x0: b.x - 1.8, x1: b.x + 1.8, z0: b.z, z1: bend + 1.8, zone: i, kind: "passage" });
  }
  return regions;
}

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
  const progress = Math.min(1, (encounter.at + encounter.duration * .45) / Math.max(1, config.duration));
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

// Small architectural details remain boxes and join the two shared batches.
function candle(v, x, y, z, scale = 1) {
  v.block(x, y, z, .22 * scale, .06 * scale, .22 * scale, GOLD);
  v.block(x, y + .06 * scale, z, .1 * scale, .36 * scale, .1 * scale, 0xd5c6a8);
  v.block(x, y + .42 * scale, z, .065 * scale, .14 * scale, .065 * scale, 0xffbd69, true);
  v.block(x, y + .54 * scale, z, .03 * scale, .06 * scale, .03 * scale, 0xffe6a1, true);
}
function lantern(v, x, y, z) {
  v.block(x, y, z, .35, .06, .35, IRON); v.block(x, y + .07, z, .23, .34, .23, 0xffbd6e, true);
  for (const dx of [-.15, .15]) for (const dz of [-.15, .15]) v.block(x + dx, y + .04, z + dz, .035, .42, .035, IRON);
  v.block(x, y + .44, z, .4, .08, .4, GOLD); v.block(x, y + .52, z, .07, .2, .07, IRON);
}
function skull(v, x, y, z) {
  v.block(x, y, z, .34, .29, .3, 0xc5bba8); v.block(x, y + .25, z, .27, .08, .25, 0xd8cbb3);
  for (const dx of [-.09, .09]) v.block(x + dx, y + .13, z + .16, .085, .09, .025, IRON);
  v.block(x, y + .04, z + .17, .12, .055, .03, IRON);
}
function web(v, x, y, z, side, large = false) {
  const span = large ? 1.7 : 1;
  for (let i = 0; i < 7; i++) {
    const length = span * (1 - i / 8), yy = y + i * span / 8;
    v.block(x + side * length / 2, yy, z, length, .018, .025, 0xaaa3b5);
    v.block(x + side * i * span / 8, y + length / 2, z, .018, length, .025, 0xaaa3b5);
  }
}
function roomDetails(v, zone, config, lamps) {
  const { x, z } = zone.center, kind = zone.index, active = new Set(config.activePrefabs ?? []);
  // Side-mounted windows and portraits face across the clear central route.
  const sideBlock = (side, u, y, inset, w, h, d, colour, glow = false) => v.block(x + side * (3.95 - inset), y, z + u, d, h, w, colour, glow);
  for (const side of [-1, 1]) {
    for (const u of [-3.65, -1.7, .3, 2.4, 4.2]) {
      sideBlock(side, u, .05, .12, .16, HEIGHT - .05, .22, WOOD);
      sideBlock(side, u, 2.75, .16, .24, .16, .3, GOLD);
    }
    for (const u of [-2.75, 2.75]) {
      sideBlock(side, u, 1.1, .1, 1.24, 1.62, .22, IRON);
      sideBlock(side, u, 1.22, .24, 1.02, 1.4, .055, kind >= 3 ? 0x3d797e : 0x4d536e, true);
      sideBlock(side, u, 1.2, .28, .055, 1.45, .06, WOOD);
      sideBlock(side, u, 1.86, .28, 1.08, .07, .06, WOOD);
      for (let i = 0; i < 4; i++) sideBlock(side, u, 2.75 + i * .12, .13, 1.34 - i * .28, .13, .25, STONE[kind]);
      sideBlock(side, u, 1.04, .28, 1.45, .12, .35, STONE[kind]);
    }
    const px = x + side * 3.35;
    v.block(px, .05, z - .8, .6, 1.04, .65, WOOD); v.block(px, 1.09, z - .8, .85, .12, .84, GOLD);
    candle(v, px, 1.21, z - .8, .9); skull(v, px, 1.2, z - .39);
    lamps.push({ x: px, y: 2.05, z: z - .8, colour: kind === 3 ? 0x7cd6c8 : 0xffb464 });
    lantern(v, x + side * 3.45, 2.42, z + 3.7);
  }
  // Timber ribs and a low vaulted silhouette keep the ceiling tangible.
  for (const zz of [-4.4, 0, 4.4]) {
    v.block(x, 3.36, z + zz, 7.8, .22, .23, WOOD);
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) v.block(x + side * (3.25 - i * .22), 2.82 + i * .14, z + zz, .4, .15, .33, kind >= 4 ? STONE[4] : WOOD);
  }
  if (kind >= 1) {
    for (const side of [-1, 1]) {
      const xx = x + side * 3.15;
      v.block(xx, .12, z + 1.2, .75, 1.86, 1, 0x2d222b);
      v.block(xx, .2, z + 1.74, .62, 1.6, .11, 0x593e41);
      v.block(xx, 1.83, z + 1.2, .68, .2, .86, 0x664949);
      v.block(xx, .83, z + 1.81, .06, .64, .035, GOLD); v.block(xx, 1.16, z + 1.82, .32, .06, .035, GOLD);
      web(v, x + side * 3.7, 2.55, z - 3.6, -side, active.has("cobweb-canopy"));
    }
  }
  if (kind >= 2 || active.has("whispering-portraits")) for (const side of [-1, 1]) for (const u of [-.4, 1.2]) {
    sideBlock(side, u, 1.42, .24, 1, 1.35, .15, GOLD); sideBlock(side, u, 1.51, .34, .82, 1.17, .055, 0x251d30);
    sideBlock(side, u, 1.67, .38, .5, .46, .03, 0x644356); sideBlock(side, u, 2.12, .4, .27, .35, .04, 0xb3a88d);
    for (const eye of [-.075, .075]) sideBlock(side, u + eye, 2.34, .44, .045, .035, .026, active.has("whispering-portraits") ? 0xd6bea4 : 0x857f81, active.has("whispering-portraits"));
  }
  if (kind === 2) {
    for (const side of [-1, 1]) { v.block(x + side * 2.8, .09, z - 2, 1.35, .12, 1.35, WOOD); v.block(x + side * 2.8, .2, z - 2, .16, .7, .16, WOOD); v.block(x + side * 2.8, .9, z - 2, 1.4, .1, 1.4, 0x67404f); candle(v, x + side * 2.8, 1, z - 2, .7); }
  }
  if (kind === 3) for (const side of [-1, 1]) {
    const xx = x + side * 2.9;
    v.block(xx, .05, z - 1.8, 1.25, .2, 1.4, IRON); v.block(xx, .25, z - 1.8, .7, 1.7, .75, 0x59615d);
    for (let yy = .4; yy < 2.4; yy += .24) v.block(xx, yy, z - 1.8, 1.12, .08, 1.03, GOLD);
    v.block(xx, 2.1, z - 1.8, .18, .7, .18, 0x77b6b0, true);
    v.block(xx, 1.05, z - 1.17, .46, .33, .03, 0x70c7b1, true);
    for (let i = 0; i < 4; i++) v.block(xx - .3 + i * .2, .7, z - 1.15, .08, .08, .07, i % 2 ? GOLD : 0xa96364);
  }
  if (kind === 4) for (const side of [-1, 1]) {
    const xx = x + side * 3;
    v.block(xx, .06, z - 1.4, 1.3, .2, 2.6, STONE[4]); v.block(xx, .26, z - 1.4, 1.08, .72, 2.34, 0x4b3b50); v.block(xx, .98, z - 1.4, 1.25, .18, 2.5, 0x887386);
    for (const zz of [-2.2, -.6]) candle(v, xx, 1.17, z + zz, .8);
    for (let i = 0; i < 6; i++) sideBlock(side, -3.7 + i * .2, .1, .3, .19, 2.75 - i * .05, .12, i % 2 ? 0x4a293e : 0x5c344b);
  }
  if (active.has("cobweb-canopy")) for (const side of [-1, 1]) web(v, x + side * 3.5, 2.65, z + 1.5, -side, true);
  if (active.has("spectral-parade") && kind >= 2) for (let i = 0; i < 3; i++) {
    const xx = x + (i % 2 ? -2.75 : 2.75), zz = z + 2.4 - i * 2;
    v.block(xx, 2.2, zz, .4, .58, .18, 0x95b2b6, true); v.block(xx, 2.75, zz, .3, .22, .15, 0xc3d3c8, true);
    for (const dx of [-.075, .075]) v.block(xx + dx, 2.82, zz + .09, .045, .055, .02, IRON);
  }
  if (active.has("thunder-chamber") && kind === 3) for (let i = 0; i < 9; i++) v.block(x - 1.6 + i * .4, 3.08 + Math.sin(i * 1.7) * .1, z - 3.6, .4, .055, .055, 0x7bbdb5, true);
  if (active.has("phantom-finale") && kind === 4) for (const side of [-1, 1]) { v.block(x + side * 2.4, .1, z - 3.6, .3, 2.9, .4, GOLD); skull(v, x + side * 2.4, 3, z - 3.6); }
}

// Native voxel shell, assembled once per snapshot, with only two voxel draws.
export function buildMazeRideWorld(config) {
  const regions = mazeRideRegions(config), stages = (config.encounters ?? []).map(e => mazeEncounterStage(config, e, regions));
  const allRegions = [...regions, ...stages.map(s => s.recess)], cells = new Map(), v = new Voxels(), r = seeded(913 + config.tier), lamps = [];
  const minX = Math.min(...allRegions.map(b => b.x0)), maxX = Math.max(...allRegions.map(b => b.x1)), minZ = Math.min(...allRegions.map(b => b.z0)), maxZ = Math.max(...allRegions.map(b => b.z1));
  for (let ix = Math.floor(minX / CELL); ix < Math.ceil(maxX / CELL); ix++) for (let iz = Math.floor(minZ / CELL); iz < Math.ceil(maxZ / CELL); iz++) {
    const x = (ix + .5) * CELL, z = (iz + .5) * CELL, region = allRegions.find(b => within(b, x, z));
    if (region) cells.set(`${ix},${iz}`, { ix, iz, x, z, zone: region.zone, kind: region.kind });
  }
  for (const c of cells.values()) {
    const { ix, iz, x, z } = c, colour = STONE[c.zone] ?? STONE[0];
    v.block(x, -.18, z, CELL, .18, CELL, 0x241e2a);
    v.block(x, 0, z, .488, .035, .488, vary(c.kind === "room" && c.zone === 0 ? (ix % 2 ? 0x554046 : 0x4c3840) : c.zone === 4 ? 0x4e4057 : 0x49414e, .1, r));
    v.block(x, HEIGHT, z, CELL, .2, CELL, 0x292330);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!cells.has(`${ix + dx},${iz + dz}`)) {
      const xx = x + dx * .25, zz = z + dz * .25, w = dx ? .22 : CELL, d = dz ? .22 : CELL;
      v.block(xx + dx * .08, 0, zz + dz * .08, w, HEIGHT, d, 0x28212f);
      for (let row = 0; row < 9; row++) v.block(xx, .05 + row * .4, zz, dx ? .24 : .486, .382, dz ? .24 : .486, vary(row < 3 && c.zone === 0 ? WOOD : colour, .12, r));
      for (const yy of [.08, 1.12, 3.43]) v.block(xx - dx * .055, yy, zz - dz * .055, dx ? .3 : CELL, .09, dz ? .3 : CELL, yy === 1.12 ? GOLD : WOOD);
    }
  }
  config.zones.forEach(zone => roomDetails(v, zone, config, lamps));
  for (const stage of stages) {
    const { home, rail } = stage;
    v.block(home.x, .04, home.z, .9, .08, .9, 0x17141e);
    // The recess opens into the corridor; its backing remains deep and dark.
    v.block(home.x, 2.75, home.z, 1.15, .12, 1.15, WOOD);
    for (const direction of [-1, 1]) v.block(home.x + rail.dx * direction * .57, .08, home.z + rail.dz * direction * .57, .1, 2.7, .1, GOLD);
  }
  const finish = sampleMazeRail(config, 1), first = sampleMazeRail(config, 0);
  for (const p of [first, finish]) for (const side of [-1, 1]) {
    const xx = p.x + side * 1.35;
    v.block(xx, .03, p.z, .22, 2.85, .24, GOLD); lantern(v, xx + side * .5, 1.7, p.z - .15);
  }
  // Warm slats at the far end give the route a readable final destination.
  v.block(finish.x, .06, finish.z - .64, 2.2, 2.65, .08, 0x6a4643);
  for (let i = -3; i <= 3; i++) v.block(finish.x + i * .28, .1, finish.z - .58, .035, 2.55, .035, 0xbb8658);
  for (const side of [-1, 1]) candle(v, finish.x + side * .85, .1, finish.z - .4, 1.15);
  const group = v.build({ shadows: false }); group.name = "Hollow House ride shell";
  const fogCount = Math.min(90, 16 * config.tier + 12), coords = new Float32Array(fogCount * 3), floorCells = [...cells.values()];
  for (let i = 0; i < fogCount; i++) { const c = floorCells[Math.floor(r() * floorCells.length)]; coords.set([c.x, .14 + r() * .45, c.z], i * 3); }
  const pixels = new Uint8Array(16 * 16 * 4);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) pixels.set([255, 255, 255, Math.round(Math.max(0, 1 - Math.hypot(x - 7.5, y - 7.5) / 7.5) ** 2 * 255)], (y * 16 + x) * 4);
  const map = new THREE.DataTexture(pixels, 16, 16); map.needsUpdate = true;
  const mistGeometry = new THREE.BufferGeometry(); mistGeometry.setAttribute("position", new THREE.BufferAttribute(coords, 3));
  const mist = new THREE.Points(mistGeometry, new THREE.PointsMaterial({ map, color: 0x8c78a5, size: 2.7, transparent: true, opacity: .16, depthWrite: false, toneMapped: false }));
  mist.name = "Low violet haze"; group.add(mist);
  let disposed = false;
  const world = {
    group, stages, lamps, regions: allRegions, boxes: [...v.solid, ...v.glow], cells: floorCells,
    diagnostics: { boxes: v.solid.length + v.glow.length, floorCells: cells.size, batches: group.children.length, sharedCube: true, tier: config.tier },
    tick(time, gentle = false) { mist.material.opacity = .14 + (gentle ? 0 : Math.sin(time * .2) * .012); },
    dispose() {
      if (disposed) return; disposed = true;
      group.traverse(m => { if (m.isInstancedMesh) m.dispose(); else m.geometry?.dispose(); for (const material of Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) { material.map?.dispose(); material.dispose(); } });
      group.removeFromParent();
    },
  };
  group.userData.mazeRide = world.diagnostics;
  return world;
}

export const createMazeRideWorld = buildMazeRideWorld;
