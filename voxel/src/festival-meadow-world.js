import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { buildGround, grounds } from "./ground.js";
import { cocoaProp } from "./cocoa-props.js";
import { yardGround, fenceRun, tree, lanternPost } from "./world.js";
import { MEADOW, MEADOW_PATHS, pathDistance } from "./content/festival-meadow.js";
import { hollowPathDistance } from "./content/hollow-house.js";

// A proper little timber kiosk, grown into a lantern pavilion at later tiers.
// Everything uses the existing voxel palette and two material batches.
export function cocoaKiosk(level) {
  const v = new Voxels(), r = seeded(716 + level), wood = 0x68402b, dark = 0x30212b, brass = 0xc39b61;
  const w = level === 3 ? 5.8 : 4.8, left = -w / 2, right = w / 2;
  v.box(left - .2, 0, -1.5, w + .4, .18, 3.4, 0x625161);
  for (let x = left; x < right; x += .24) v.box(x, .18, -1.45, .22, .1, 3.25, vary(wood, .08, r));
  // Rear cupboard, raised panels and glass-fronted cocoa jars.
  v.box(left, .28, -1.4, w, 2.55, .18, dark);
  for (let x = left + .12; x < right; x += .36) v.box(x, .34, -1.18, .31, 2.28, .08, vary(wood, .1, r));
  for (const y of [1.65, 2.4]) {
    v.box(left + .2, y, -1.12, w - .4, .1, .55, dark);
    for (let i = 0; i < (level + 3); i++) {
      const x = left + .5 + i * (w - 1) / (level + 2);
      v.block(x, y + .1, -.9, .28, .33 + (i % 2) * .1, .26, [0x754531, 0xd6b98a, 0xbba48b, 0x6c4839][i % 4]);
      v.block(x, y + .43 + (i % 2) * .1, -.9, .31, .06, .29, brass);
      v.block(x, y + .2, -.755, .18, .1, .015, 0xe8d6b4);
    }
  }
  // Counter with turned feet, individual doors and a warm copper urn.
  for (const x of [left + .22, right - .22]) for (const z of [.45, 1.35]) {
    v.block(x, .2, z, .18, 1.05, .18, dark); v.block(x, .2, z, .28, .12, .28, brass);
  }
  v.box(left, .5, .42, w, .83, 1.02, wood);
  for (let x = left + .13; x < right; x += .58) {
    v.box(x, .62, 1.45, .46, .58, .05, dark); v.box(x + .055, .67, 1.5, .35, .48, .025, wood);
    v.block(x + .24, .92, 1.54, .065, .06, .04, brass);
  }
  v.box(left - .12, 1.33, .32, w + .24, .18, 1.22, 0x9a6845);
  v.box(left - .12, 1.51, .32, w + .24, .035, 1.22, 0xc08e60);
  for (const [width, height, y] of [[.68, .1, 1.55], [.58, .8, 1.65], [.72, .12, 2.45]]) v.block(-1.1, y, .72, width, height, width, 0xb67745);
  v.block(-1.1, 2.58, .72, .3, .1, .3, brass); v.block(-1.1, 1.82, 1.08, .12, .1, .3, brass);
  // Menu board, cups and a tray of star-shaped biscuits.
  v.block(.7, 1.56, .5, .86, .62, .09, dark); v.block(.7, 1.65, .56, .7, .43, .035, 0x1e2026);
  for (let i = 0; i < 3; i++) v.block(.7, 1.72 + i * .1, .59, .5 - (i % 2) * .12, .025, .01, 0xe9d9b5);
  v.block(1.6, 1.55, .9, .56, .05, .4, brass);
  for (let i = 0; i < 3; i++) { v.block(1.43 + i * .17, 1.6, .9, .13, .045, .13, 0xdca85d); v.block(1.43 + i * .17, 1.65, .9, .03, .02, .03, 0x68412c); }
  for (const x of [left + .14, right - .14]) {
    v.block(x, .28, .15, .2, 3.3, .2, dark);
    for (const y of [.5, 2.85]) v.block(x, y, .15, .28, .13, .28, brass);
    v.block(x, 2.3, .38, .33, .08, .33, 0x211b22); v.block(x, 2.38, .38, .25, .35, .25, 0xffbf6b, true); v.block(x, 2.73, .38, .35, .1, .35, dark);
  }
  // Striped pitched roof and scalloped plum/copper awning.
  for (let x = left - .4, i = 0; x < right + .4; x += .3, i++) for (let z = -1.7; z < 1.85; z += .26) {
    const y = 3.5 + (1.7 - Math.abs(z)) * .25;
    v.box(x, y, z, .3, .14, .26, vary(i % 3 === 0 ? 0xb76833 : 0x583245, .06, r));
  }
  for (let x = left - .4; x < right + .4; x += .3) v.box(x, 3.22, 1.86, .3, .35 + (Math.round(x * 10) % 2) * .08, .1, 0x583245);
  if (level >= 2) {
    v.box(-1.9, 3.9, -1.1, .5, .95, .5, 0x564451); v.box(-2, 4.8, -1.2, .7, .14, .7, brass);
    for (let i = 0; i < 9; i++) v.block(left + i * w / 8, 3.19 - Math.sin(i / 8 * Math.PI) * .14, 1.98, .08, .11, .08, i % 2 ? 0xcba2ed : 0xffd28b, true);
  }
  if (level === 3) for (const x of [left - .1, right + .1]) { v.block(x, .2, -1.2, .34, 4.2, .34, dark); v.block(x, 4.4, -1.2, .6, .14, .6, brass); }
  return v.build();
}

// Open a connection through the old fence/trees without changing world.js.
// Compact positive, nonzero instances in place; keep the shared geometry alive.
const clearRegions = [[38, 10.7, 57, 34], [38.4, 5.8, 43.4, 10.7], [35.3, 24.7, 40.3, 29.7], [34, 22.6, 42, 25.3]];
export function openMeadowEdge(world) {
  const matrix = new THREE.Matrix4(), colour = new THREE.Color(); let removed = 0;
  const batches = []; world.traverse(m => { if (m.isInstancedMesh) batches.push(m); });
  for (const source of batches) {
    let write = 0; const original = source.count;
    for (let i = 0; i < original; i++) {
      source.getMatrixAt(i, matrix); const a = matrix.elements, x = a[12], z = a[14], w = Math.abs(a[0]), d = Math.abs(a[10]), top = a[13] + Math.abs(a[5]) / 2;
      const clear = top > 0 && clearRegions.some(([x0, z0, x1, z1]) => x + w / 2 > x0 && x - w / 2 < x1 && z + d / 2 > z0 && z - d / 2 < z1);
      if (clear) { removed++; continue; }
      source.getColorAt(i, colour); source.setMatrixAt(write, matrix); source.setColorAt(write, colour); write++;
    }
    source.count = write; source.instanceMatrix.needsUpdate = true;
    if (source.instanceColor) source.instanceColor.needsUpdate = true;
    source.computeBoundingBox(); source.computeBoundingSphere();
  }
  return removed;
}

// Signs use six face materials, whereas voxel batches use a single material.
// Dispose owned buffers/materials, retaining the global shared voxel cube.
function disposeObject(object) {
  object.traverse((m) => {
    if (m.geometry && !m.isInstancedMesh) m.geometry.dispose();
    if (m.isInstancedMesh) m.dispose();
    for (const material of Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) {
      if (material.userData.sharedCocoa) continue;
      if (material.map?.isTexture) material.map.dispose();
      material.dispose();
    }
  });
}

export function createFestivalWorld({ scene, state, world, signBoard, createCashier }) {
  const root = new THREE.Group(); scene.add(root);
  let builtLand = false, tier = -1, booth = null, cups = [], specials = [], pickables = [], marker = null, courier = null, sandy = null;
  const makeHit = (x, y, z, w, h, d, type) => { const hit = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(x, y, z); hit.userData = { type }; root.add(hit); pickables.push(hit); };
  const preview = new Voxels();
  preview.block(37, 0, 20, .14, 1.8, .14, 0x423020); preview.block(37, 1.1, 20, 1.4, .75, .12, 0x68452f);
  marker = preview.build(); const forSale = signBoard("Moonbrew Meadow", "room for a little more magic", 2.5); forSale.position.set(37, 1.55, 20.1); root.add(marker, forSale);
  makeHit(37, 1.2, 20, 2.8, 2.4, .6, "meadow-land");
  function buildLand() {
    builtLand = true; openMeadowEdge(world.group); root.remove(marker, forSale); disposeObject(marker); disposeObject(forSale);
    pickables.forEach((h) => { root.remove(h); h.geometry.dispose(); h.material.dispose(); }); pickables = [];
    // Rebuild once from the original farm generator: one palette, height and
    // cobble seed across the old boundary. No overlaid connector or seam.
    const ground = yardGround({ width: MEADOW.width, extraPath: (x, z) => pathDistance(x, z) < .95 || hollowPathDistance(x, z) < .8 });
    world.group.remove(world.ground); world.ground.geometry.dispose(); world.ground.material.dispose();
    world.ground = ground; world.group.add(ground);
    const v = new Voxels(), r = seeded(819);
    fenceRun(v, r, 35.6, 24.6, 53.6, 24.6);
    fenceRun(v, r, 53.6, 2.9, 53.6, 24.6, (x, z) => z > 5.1 && z < 8.1);
    fenceRun(v, r, 40, 2.9, 53.6, 2.9);
    // Same pickets, post caps, lanterns, tree crowns and leaf colours as the farm.
    for (const [x, z] of [[41, 25.1], [47, 25.1], [53.4, 25.1], [53.1, 16], [53.1, 9], [43, 3.2], [49, 3.2]]) lanternPost(v, x, z, [], false);
    for (const [x, z, size, kind] of [[44.4, .6, 1, 2], [49, .8, 1.1, 0], [53.8, 1, 1.1, 1], [55.6, 8, 1, 2], [55.6, 14, 1.05, 0], [55.6, 21.8, 1, 1]]) tree(v, r, x, z, size, kind);
    for (const z of [5.1, 8.1]) { v.block(53.6, 0, z, .3, 2.8, .3, 0x4a2e1c); v.block(53.6, 2.8, z, .45, .12, .45, 0x6a4428); lanternPost(v, 54.1, z, [], false); }
    v.block(53.6, 2.9, 6.6, .35, .16, 3.4, 0x6a4428);
    // Planted drifts soften the border instead of outlining a new rectangle.
    for (let x = 36; x < 54; x += .55) for (let k = 0; k < 3; k++) {
      const z = 25.5 + r() * 1.2;
      v.block(x + r() * .4, r() * .18, z, .32, .22 + r() * .2, .32, [0x8a2f1e, 0xc2552a, 0x6a2a3a][Math.floor(r() * 3)]);
    }
    for (const [x, z] of [[43, 8], [52, 25]]) {
      v.block(x, 0, z, 1.05, .4, .75, 0x6b4330); v.block(x, .4, z, 1.15, .1, .85, 0xa0784b);
      for (let i = 0; i < 9; i++) { const xx = x + (r() - .5) * .9, zz = z + (r() - .5) * .6; v.block(xx, .5, zz, .07, .3 + r() * .3, .07, 0x476545); v.block(xx, .9, zz, .2, .12, .2, i % 2 ? 0xb58ac9 : 0xc67636); }
    }
    for (const x of [42, 44]) { for (const dx of [-.6, .6]) v.block(x + dx, 0, 21.6, .13, .55, .5, 0x392b27); v.block(x, .55, 21.6, 1.8, .12, .6, 0x795039); v.block(x, .85, 21.35, 1.8, .38, .1, 0x795039); }
    root.add(v.build());
    const exitPath = buildGround({ x0: 54, x1: 58, z0: 5.5, z1: 7.7 }, (x, z) => grounds.cobble(x, z, [0x8c8094, 0x7a6f84, 0x9a8d9e, 0x6c6276], .42, 1, 0x2a2430)); root.add(exitPath);
    const exitSign = signBoard("Village →", "homeward path", 3.6); exitSign.position.set(53, 3.4, 6.5); root.add(exitSign);
    const welcome = signBoard("Moonbrew Meadow", "cocoa & treats", 5); welcome.position.set(46.8, 1.6, 7); welcome.userData = { type: "meadow-land" }; root.add(welcome); pickables.push(welcome);
    makeHit(47, 1.4, 17.9, 5.5, 3, 4, "cocoa-stand");
  }
  function sync() {
    if (state.festival.meadow && !builtLand) buildLand();
    if (!builtLand || tier === state.festival.cocoa.level) return;
    tier = state.festival.cocoa.level;
    if (booth) { pickables = pickables.filter(p => !p.userData.festivalRoof); root.remove(booth); disposeObject(booth); }
    booth = tier ? cocoaKiosk(tier) : new THREE.Group(); cups = []; specials = [];
    if (!tier) {
      const stake = new Voxels(); for (const x of [-2, 2]) stake.block(x, 0, 0, .14, .6, .14, 0x7a5236); booth.add(stake.build());
      const sign = signBoard("Cocoa stand", "build a warm welcome here", 3); sign.position.set(0, 1.3, .5); booth.add(sign);
    } else {
      const label = signBoard("Haunted Cocoa", "Sandy’s cocoa & s’mores", 4.6); label.position.set(0, 4.45, 1.65); label.userData = { type: "cocoa-stand", festivalRoof: true }; booth.add(label); pickables.push(label);
      for (let i = 0; i < 3; i++) {
        const cup = cocoaProp("cocoa"); cup.scale.setScalar(.65); cup.position.set(-2.05 + i * .24, 1.55, 1.05); booth.add(cup); cups.push(cup);
      }
    }
    if (tier && !sandy && createCashier) { sandy = createCashier(); sandy.group.position.set(48.1, 1.55, 19.35); root.add(sandy.group); }
    for (const [id, needed, x] of [["flake", 2, -.65], ["deluxe", 2, -1.15], ["midnight", 3, -.15], ["smores", 3, .45]]) if (tier >= needed) {
      const prop = cocoaProp(id); prop.position.set(x, 1.55, 1.16); booth.add(prop); specials.push({ prop, id });
    }
    booth.position.set(...[MEADOW.stand[0], 0, MEADOW.stand[1]]); root.add(booth);
  }
  const steamGeo = new THREE.BufferGeometry(), steam = new Float32Array(8 * 3);
  steamGeo.setAttribute("position", new THREE.BufferAttribute(steam, 3));
  const wisps = new THREE.Points(steamGeo, new THREE.PointsMaterial({ color: 0xe9d8c7, size: .1, transparent: true, opacity: .38, depthWrite: false, toneMapped: false })); root.add(wisps);
  sync();
  return { get pickables() { return pickables; }, get status() { return { cashier: !!sandy, ready: sandy?.ready ?? false, frame: sandy?.group.userData.frame ?? null, tier, displayed: specials.filter(p => p.prop.visible).map(p => p.id) }; }, sync,
    tick(time) {
      if (state.festival.cocoa.courier && !courier) {
        courier = new THREE.Group(); const body = new Voxels(); body.block(0, 0, 0, .1, .25, .13, 0x513a39); body.block(0, .2, 0, .13, .12, .13, 0xd9b982); courier.add(body.build());
        const wings = [];
        for (const side of [-1, 1]) {
          const wing = new Voxels(); wing.box(side < 0 ? -.48 : .03, .02, -.045, .45, .27, .09, 0xc89f78); wing.block(side * .28, .12, .012, .11, .1, .06, 0x5d3a55); wing.block(side * .15, .22, .012, .08, .055, .06, 0xecd4a5);
          const g = wing.build(); courier.add(g); wings.push(g);
        }
        courier.userData.wings = wings; root.add(courier);
      }
      if (courier) {
        courier.position.set(47 + Math.sin(time * .6) * 1.5, 3.4 + Math.sin(time * 1.2) * .15, 20 + Math.cos(time * .6) * .5);
        courier.userData.wings.forEach((wing, i) => wing.rotation.y = Math.sin(time * 12) * (i ? -.6 : .6));
      }
      sync(); const c = state.festival.cocoa;
      if (sandy) { sandy.group.visible = c.level > 0; sandy.tick(time, c.level, state.visitors.some(v => v.festival?.phase === "serving") || state.time - c.lastSaleAt < 1.1); } cups.forEach((m, i) => m.visible = c.stock > i); specials.forEach(({ prop, id }) => prop.visible = c.extras[id].stock > 0); wisps.visible = !!c.level && c.open && (c.stock > 0 || ["flake", "deluxe", "midnight"].some(id => c.extras[id].stock > 0));
      for (let i = 0; i < 8; i++) { const t = (time * .35 + i / 8) % 1; steam[i * 3] = 45.9 + Math.sin(t * 7 + i) * .14; steam[i * 3 + 1] = 2.7 + t * 1.4; steam[i * 3 + 2] = 18.6 + Math.cos(t * 6 + i) * .12; }
      steamGeo.attributes.position.needsUpdate = true;
    },
  };
}
