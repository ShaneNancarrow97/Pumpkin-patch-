import * as THREE from "three";
import { chunkedVoxels, seeded, vary } from "./voxels.js";
import { HAYRIDE_RIDE_BOUNDS, HAYRIDE_ROUTE_LENGTH, HAYRIDE_STOPS, hayrideRouteSample, hayrideRouteDistance, hayrideRouteProfile } from "./content/hayride-layout.js";

// The woodland belongs only to the off-map POV scene. All its trunks and low
// plants leave a real vehicle corridor; the high canopy encloses the sky.
const LANE = 2.35, OVERHEAD = 5.35;
const C = { bark: 0x302c31, barkLight: 0x51414a, barkDark: 0x211f28, dead: 0x68636a,
  leaf: 0x263632, leafCold: 0x2c3842, moss: 0x424637, fern: 0x394338, soil: 0x332d34 };
const stops = HAYRIDE_STOPS.map(stop => {
  const p = hayrideRouteSample(stop.at * HAYRIDE_ROUTE_LENGTH);
  const offset = stop.id === "spiders" ? 0 : stop.id === "bride" ? 6.1 : stop.id === "bus" ? 5.4 : 4.1;
  return { x: p.x + p.dz * offset, z: p.z - p.dx * offset, radius: stop.id === "bride" ? 5.25 : stop.id === "bus" ? 5.6 : stop.id === "spiders" ? 4.1 : 4.45 };
});
const clearSet = (x, z, margin = 0) => !stops.some(p => Math.hypot(x - p.x, z - p.z) < p.radius + margin);
const station = (x, z, margin = 0) => x > -23.1 - margin && x < -8.8 + margin && z > 23.5 - margin && z < 39 + margin;
export function hayrideForestClearance(x, z, w = 0, d = 0, routeLevel = 0) {
  return hayrideRouteDistance(x, z, routeLevel) - Math.hypot(w, d) / 2;
}

export function createHayrideForest({routeLevel=0}={}) {
  const profile=hayrideRouteProfile(routeLevel),HAYRIDE_ROUTE_LENGTH=profile.length,HAYRIDE_RIDE_BOUNDS=profile.bounds;
  const routeSample=distance=>hayrideRouteSample(distance,routeLevel),routeDistance=(x,z)=>hayrideRouteDistance(x,z,routeLevel);
  const localStops=profile.stops.map(stop=>{const p=routeSample(stop.at*profile.length),offset=stop.offset??(stop.id==="spiders"?0:stop.id==="bride"?6.1:stop.id==="bus"?5.4:4.1);return{x:p.x+p.dz*offset,z:p.z-p.dx*offset,radius:stop.id==="bride"?5.25:stop.id==="bus"?5.6:stop.id==="spiders"?4.1:["graveyard","thicket"].includes(stop.id)?4.8:4.45};});
  const clearSet=(x,z,margin=0)=>!localStops.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+margin);
  const routeClearance=(x,z,w=0,d=0)=>hayrideForestClearance(x,z,w,d,routeLevel);
  const r = seeded(260823), v = chunkedVoxels(16), group = new THREE.Group(), bases = [];
  group.name = "Hollow Hayride — off-map old-growth forest";
  let foliage = 0, branches = 0, logs = 0, eyes = 0;
  const box = (x, y, z, w, h, d, colour, { clearance = true, set = true, glow = false } = {}) => {
    if (y < OVERHEAD && clearance && routeClearance(x, z, w, d) < LANE) return false;
    if (y < 6.4 && set && !clearSet(x, z, Math.min(.35, Math.hypot(w, d) / 2))) return false;
    v.at(x, z).block(x, y, z, w, h, d, colour, glow); return true;
  };
  const limb = (a, b, width, colour, skipSet = false) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / .26));
    for (let i = 0; i <= n; i++) {
      const t = i / n, s = width * (1 - t * .62);
      if (box(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t, s, s, s, colour, { set: !skipSet })) branches++;
    }
  };
  const canopy = (x, y, z, radius, colour) => {
    const step = .57;
    for (let dx = -radius; dx <= radius; dx += step) for (let dz = -radius; dz <= radius; dz += step) {
      const radial = (dx * dx + dz * dz) / (radius * radius);
      if (radial > .96 || r() < .16) continue;
      const crown = (1 - radial) * .9;
      for (let layer = 0; layer < 2; layer++) {
        const h = .24 + r() * .15;
        if (box(x + dx, y + crown + layer * .31, z + dz, .5 + r() * .16, h, .5 + r() * .16, vary(colour, .18, r))) foliage++;
      }
    }
  };
  const tree = (x, z, scale = 1) => {
    if (station(x, z, 1) || !clearSet(x, z, .75) || routeClearance(x, z, .95 * scale, .95 * scale) < LANE || bases.some(p => Math.hypot(p.x - x, p.z - z) < 2.15)) return;
    const height = (8.2 + r() * 4.4) * scale, width = (.42 + r() * .25) * scale;
    const leanX = (r() - .5) * .65, leanZ = (r() - .5) * .65, dead = r() < .22;
    bases.push({ x, z, height });
    for (let k = 0, y = .02; y < height; k++, y += .42) {
      const t = y / height, taper = width * (1 - t * .47), px = x + leanX * t, pz = z + leanZ * t;
      box(px, y, pz, taper, .43, taper * .88, vary(C.bark, .19, r));
      // Uneven silver bark catches a lightning flash without a bright trunk.
      if (k % 2 === 0) for (const side of [-1, 1]) box(px + side * taper * .5, y + .03, pz + (r() - .5) * taper * .7, .055, .21 + r() * .11, .09, k % 4 ? C.barkDark : C.barkLight);
    }
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * .4 + r() * .3, reach = .7 + r() * .65;
      limb({ x, y: .3, z }, { x: x + Math.cos(a) * reach, y: .04, z: z + Math.sin(a) * reach }, .18, C.barkDark);
    }
    const boughs = dead ? 5 : 4;
    for (let i = 0; i < boughs; i++) {
      const a = (i / boughs) * Math.PI * 2 + r() * .7, y = Math.max(5.6, height * (.48 + r() * .32)), reach = 1.4 + r() * 1.3;
      const end = { x: x + Math.cos(a) * reach, y: y + .7 + r() * 1.0, z: z + Math.sin(a) * reach };
      limb({ x: x + leanX * .5, y, z: z + leanZ * .5 }, end, .18 + r() * .08, dead ? C.dead : C.bark);
      const tip = { x: end.x + Math.cos(a + .5) * .7, y: end.y + .75, z: end.z + Math.sin(a + .5) * .7 };
      limb(end, tip, .09, dead ? C.dead : C.barkDark);
      if (!dead && i < 3) canopy(end.x, end.y + .1, end.z, 1.05 + r() * .6, i % 2 ? C.leafCold : C.leaf);
    }
    if (!dead) canopy(x + leanX, height - .45, z + leanZ, 1.25 + r() * .6, C.leaf);
  };

  // Irregular rows frame both sides of the lane, with deeper trees closing the
  // gaps. Avoid the attraction's display windows rather than hiding its scares.
  for (let distance = 6; distance < HAYRIDE_ROUTE_LENGTH - 5; distance += 2.65) {
    const p = routeSample(distance);
    for (const side of [-1, 1]) {
      const offset = 3.1 + r() * .9;
      tree(p.x + p.dz * offset * side, p.z - p.dx * offset * side, .93 + r() * .14);
    }
  }
  const bounds = HAYRIDE_RIDE_BOUNDS;
  for (let x = bounds.x0 - 5; x < bounds.x1 + 4; x += 3.6) for (let z = bounds.z0 - 5; z < bounds.z1 + 4; z += 3.6) {
    const px = x + (r() - .5) * 2.0, pz = z + (r() - .5) * 2.0;
    // Beyond 14 units of lane the fog hides them, so the wood stops there.
    if (r() > .23 && routeDistance(px, pz) > 4.0 && routeDistance(px, pz) < 14) tree(px, pz, .9 + r() * .19);
  }

  // Ferns have stepped fronds, not single green blocks. Sparse dry grasses,
  // moss and leaf litter give a close camera a readable, untidy forest floor.
  for (let i = 0; i < 2600; i++) {
    const x = bounds.x0 - 2 + r() * (bounds.x1 - bounds.x0 + 4), z = bounds.z0 - 2 + r() * (bounds.z1 - bounds.z0 + 4);
    if (station(x, z) || !clearSet(x, z, .35) || routeClearance(x, z, 1, 1) < LANE || routeDistance(x, z) > 16) continue;
    const h = .2 + r() * .7;
    if (i % 3 === 0) {
      box(x, .03, z, .045, h, .045, C.fern);
      for (const side of [-1, 1]) for (let j = 1; j < 4; j++) {
        const t = j / 4;
        box(x + side * t * .4, .08 + h * (1 - t) * .8, z, .14 + t * .1, .065, .09 + (1 - t) * .13, vary(C.fern, .2, r));
        box(x, .08 + h * (1 - t) * .8, z + side * t * .32, .1, .055, .16, C.moss);
      }
    } else if (i % 3 === 1) {
      for (let j = 0; j < 3; j++) box(x + (r() - .5) * .3, .03, z + (r() - .5) * .3, .035, h * (.55 + r() * .45), .035, vary(0x65564e, .2, r));
    } else box(x, .035, z, .2 + r() * .3, .07, .2 + r() * .3, vary(C.moss, .18, r));
    for (let j = 0; j < 2; j++) box(x + (r() - .5) * .5, .04, z + (r() - .5) * .5, .1 + r() * .14, .035, .1 + r() * .12, [0x594236, 0x5b4147, 0x4c4543][i % 3]);
  }

  for (let distance = 8; distance < HAYRIDE_ROUTE_LENGTH - 10; distance += 9.7) {
    const p = routeSample(distance), side = r() < .5 ? -1 : 1, x = p.x + p.dz * side * 4.6, z = p.z - p.dx * side * 4.6;
    if (station(x, z) || !clearSet(x, z, 1.2)) continue;
    for (let i = 0; i < 9; i++) {
      const px = x + p.dx * (i - 4) * .3, pz = z + p.dz * (i - 4) * .3;
      if (box(px, .03, pz, .42, .4, .42, i % 3 ? C.barkDark : C.barkLight)) logs++;
      box(px, .42, pz, .29, .07, .32, C.moss);
    }
  }
  // Eyes in the dark between the trees: a pair now and then, well back from the
  // lane, yellow, red or green, at a height that could be anything.
  for (let distance = 14; distance < HAYRIDE_ROUTE_LENGTH - 10; distance += 6.5) {
    if (r() < .45) continue;
    const p = routeSample(distance), side = r() < .5 ? -1 : 1, back = 7 + r() * 5, x = p.x + p.dz * side * back, z = p.z - p.dx * side * back, y = .9 + r() * 1.5;
    if (station(x, z) || !clearSet(x, z, 1)) continue;
    const colour = [0xffe25a, 0xff4a30, 0xb6ff6a][Math.floor(r() * 3)], across = .08;
    // Set across the lane's direction, so the pair faces the wagon.
    for (const k of [-1, 1]) box(x + p.dx * k * across, y, z + p.dz * k * across, .07, .05, .07, colour, { glow: true });
    eyes++;
  }
  v.build(group);
  const diagnostics = Object.freeze({ trees: bases.length, boxes: v.boxes, chunks: v.count, foliage, branches, logs, eyes,
    minLowClearance: LANE, overheadHeight: OVERHEAD, treeBases: Object.freeze(bases.map(p => Object.freeze(p))) });
  group.userData.hayrideForest = { trees: bases.length, boxes: v.boxes, offMap: true };
  return { group, diagnostics,
    tick() {},
    dispose() {
      group.removeFromParent();
      group.traverse(object => {
        // BoxGeometry is shared by Voxels across the whole game; dispose only
        // this forest's instance buffers and own materials, never that geometry.
        if (object.isInstancedMesh) object.dispose();
        for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) material.dispose();
      });
    },
  };
}
