import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { buildGround, grounds } from "./ground.js";
import { cocoaProp, takeawayCup } from "./cocoa-props.js";
import { yardGround, fenceRun, tree, lanternPost } from "./world.js";
import { MEADOW, MEADOW_PATHS, CHAT_SPOTS, pathDistance } from "./content/festival-meadow.js";
import { hollowPathDistance } from "./content/hollow-house.js";
import { createMoth } from "./moth.js";
import { DROP } from "./content/farm-layout.js";

// A proper little timber kiosk, grown into a lantern pavilion at later tiers.
// Everything uses the existing voxel palette and two material batches.
export function cocoaKiosk(level) {
  const v = new Voxels(), r = seeded(716 + level), wood = 0x68402b, dark = 0x30212b, brass = 0xc39b61;
  const w = level >= 5 ? 7.2 : level >= 4 ? 6.6 : level >= 3 ? 5.8 : 4.8, left = -w / 2, right = w / 2;
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
  if (level >= 3) for (const x of [left - .1, right + .1]) { v.block(x, .2, -1.2, .34, 4.2, .34, dark); v.block(x, 4.4, -1.2, .6, .14, .6, brass); }
  if (level >= 4) {
    for (const x of [left + .45, right - .45]) {
      v.block(x, 2.86, -.25, .48, .6, .1, 0x413246);v.block(x, 2.94, -.18, .33, .4, .035, 0xd3aa63);
      v.block(x, 3.05, -.155, .18, .18, .02, 0x8e6a9f);v.block(x, 3.12, -.14, .1, .045, .015, 0xf5d5a1, true);
    }
    for (let i = 0; i < 5; i++) v.block(-.6+i*.3, 3.64+(.6-Math.abs(-.6+i*.3))*.3, 1.98, .13, .18, .09, i%2 ? 0xd7ba78 : 0x6a4974);
  }
  if (level >= 5) {
    for (let x=left+.2;x<right;x+=.32) {v.block(x,.85,1.515,.13,.36,.025,0xc79b56);v.block(x,1.18,1.53,.09,.06,.015,0x6d4f37);}
    for (const x of [left+.38,right-.38]) {v.block(x,2.0,-.78,.38,.64,.36,0x443147);v.block(x,2.1,-.57,.27,.36,.025,0xf0cd85,true);v.block(x,2.64,-.78,.48,.1,.46,brass);}
  }
  return v.build();
}

// A hired helper floats behind the counter, with no extra point light.
function ghostBarista() {
  const v = new Voxels();
  for (let i=0;i<4;i++) v.block(0,.08+i*.16,0,.23+i*.075,.18,.29,0xa3b5aa);
  v.block(0,.74,0,.38,.38,.32,0xc2d0ba);v.block(0,1.12,0,.46,.1,.39,0x583e68);
  v.block(0,1.22,0,.32,.19,.31,0x7f6691);v.block(0,1.22,.17,.32,.04,.015,0xc59a5f);
  for(const x of [-.09,.09])v.block(x,.95,.17,.045,.055,.025,0xe3c78b,true);
  for(const x of [-.34,.34])v.block(x,.59,.04,.19,.13,.32,0xa3b5aa);
  v.block(0,.38,.17,.3,.34,.035,0xe3d9b9);v.block(0,.7,.18,.29,.07,.035,0x67506b);
  return v.build();
}
function courierCrate() {
  const v=new Voxels();v.block(0,0,0,.68,.46,.56,0x755435);
  for(const y of [.08,.34])v.block(0,y,.29,.72,.055,.045,0xa27b4b);
  for(const x of [-.28,.28])v.block(x,.02,.3,.055,.42,.045,0x4c3627);
  v.block(0,.46,0,.72,.07,.6,0x967144);v.block(0,.16,.315,.27,.19,.018,0xe1d1ae);
  for(const x of [-.055,.055])v.block(x,.26,.329,.035,.035,.012,0x58436a);
  return v.build();
}

// Where guests stop to chat (rules/meadow-chat.js), dressed as each cocoa tier
// opens it: a standing table by the benches, a lantern with hay bales to perch
// on, and an iron brazier. Then the comforts bought for the meadow
// (MEADOW_COMFORTS): bunting round the edge, blankets on the benches and bales,
// souvenir mugs under the awning, a dance floor with a gramophone, and Sandy's
// trolley. The brazier's flames and the gramophone's notes are returned to animate.
const TARTAN = [0x7a2a3a, 0x3a5a4a, 0xc9a24e], BRASS_RAIL = 0xc39b61;
function blanket(v, x, y, z, w, d, hang = 0) {
  v.block(x, y, z, w, .03, d, TARTAN[0]);
  for (const k of [-.3, .3]) { v.block(x + k * w, y + .005, z, .05, .03, d + .01, TARTAN[1]); v.block(x, y + .006, z + k * d, w + .01, .03, .04, TARTAN[2]); }
  if (hang) v.block(x, y - hang, z + d / 2, w, hang, .03, TARTAN[0]);
}
export function chatDressing(level, comforts = []) {
  const v = new Voxels(), r = seeded(733), iron = 0x2b2630, oak = 0x6a442e, has = (id) => comforts.includes(id);
  const [benches, lantern, brazier, floor] = CHAT_SPOTS.map((p) => [p.x, p.z]);
  if (level >= 1) {
    const [x, z] = benches;
    for (const [dx, dz] of [[-.22, 0], [.22, 0], [0, -.22], [0, .22]]) v.block(x + dx, 0, z + dz, dx ? .34 : .08, .05, dz ? .34 : .08, iron);
    v.block(x, .05, z, .1, .95, .1, iron); v.block(x, 1, z, .62, .06, .5, oak); v.block(x, 1, z, .5, .06, .62, oak); v.block(x, 1.06, z, .56, .02, .56, 0x8a5e3c);
    v.block(x - .12, 1.08, z + .06, .12, .14, .12, 0xd8c6a0); v.block(x - .12, 1.22, z + .06, .04, .05, .04, 0xffc56e, true);
    v.block(x + .14, 1.08, z - .08, .11, .12, .11, 0x7a3a2c); v.block(x + .14, 1.2, z - .08, .09, .015, .09, 0x4a2a1e);
  }
  const bales = level >= 2 ? [[lantern[0] + 1.4, lantern[1], .45, .8], [lantern[0] - 1.6, lantern[1] - 2, .8, .45]] : [];
  if (level >= 2) {
    lanternPost(v, ...lantern, [], false);
    // Hay bales to perch on, clear of every walk to and from the ring.
    for (const [bx, bz, w, d] of bales) { v.block(bx, 0, bz, w, .38, d, vary(0xc9a24e, .08, r)); for (let i = -1; i <= 1; i++) v.block(bx + (w > d ? i * .26 : 0), .38, bz + (w > d ? 0 : i * .26), w > d ? .06 : w + .02, .02, w > d ? d + .02 : .06, 0x8a6a2a); }
  }
  const flames = new Voxels();
  if (level >= 3) {
    const [x, z] = brazier;
    for (const a of [0, 2.1, 4.2]) v.block(x + Math.cos(a) * .26, 0, z + Math.sin(a) * .26, .07, .62, .07, iron);
    v.block(x, .6, z, .5, .12, .5, iron); v.block(x, .72, z, .62, .2, .62, iron); v.block(x, .74, z, .5, .2, .5, 0x1a1418);
    for (let i = 0; i < 7; i++) v.block(x + (r() - .5) * .38, .9, z + (r() - .5) * .38, .1, .06, .1, [0xff7a2a, 0xffb84a, 0xc8401e][i % 3], true);
    for (const [dx, dz, h, c] of [[0, 0, .42, 0xffb44a], [-.1, .06, .3, 0xff8a2e], [.1, -.05, .34, 0xff9a3a], [.02, -.1, .24, 0xffe08a]]) flames.block(dx, 0, dz, .12, h, .12, c, true);
  }
  if (has("bunting")) {
    // Strung between the lantern posts round the meadow's edge (see buildLand), sagging a little.
    const f = 24.6 + DROP + .5;
    for (const [a, b] of [[[41, f], [47, f]], [[47, f], [53.4, f]], [[43, 3.2], [49, 3.2]], [[49, 3.2], [53.1, 9]], [[53.1, 9], [53.1, 16]]]) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), steps = Math.round(len / .14);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, y = 2.2 - Math.sin(Math.PI * t) * .45;
        v.block(x, y, z, .03, .03, .03, 0x2a2228);
        if (i % 4 === 2) v.block(x, y - .1, z, .09, .1, .09, [0xffd28b, 0xcba2ed, 0xff9a5a, 0x9fe0c0][(i / 4 | 0) % 4], true);
      }
    }
  }
  if (has("blankets")) {
    for (const x of [42, 44]) { blanket(v, x + .15, .67, 21.62, .8, .56, .32); v.block(x - .55, .67, 21.65, .3, .12, .3, 0xd8b46a); }
    for (const [bx, bz, w, d] of bales) blanket(v, bx, .4, bz, w - .05, d - .1);
  }
  if (has("mugs") && level >= 1) {
    // Hung under the front of the awning, at the end of the counter away from Sandy.
    const front = MEADOW.stand[1] + 1.95, x0 = MEADOW.stand[0] - (level >= 3 ? 2.6 : 2.1);
    for (let i = 0; i < 5; i++) {
      const x = x0 + i * .26, y = 2.78 - (i % 2) * .08;
      v.block(x, y + .14, front, .012, 3.22 - y - .14, .012, 0x3a3030);
      v.block(x, y, front, .13, .14, .13, [0xe8dcc4, 0x7a3a5a, 0x3a5a6a, 0xd88a3a, 0x5a3a7a][i]); v.block(x + .085, y + .03, front, .04, .08, .03, [0xe8dcc4, 0x7a3a5a, 0x3a5a6a, 0xd88a3a, 0x5a3a7a][i]);
      for (const d of [-.025, .025]) v.block(x + d, y + .08, front + .066, .02, .02, .005, 0x1e1a22);
    }
  }
  const notes = [];
  if (has("dancefloor")) {
    const [x, z] = floor;
    for (let dz = -1.45; dz <= 1.45; dz += .29) { const half = Math.sqrt(Math.max(0, 1.5 ** 2 - dz ** 2)); v.block(x, .015, z + dz, half * 2, .025, .27, vary(0x8a5e3c, .1, r)); }
    // The gramophone on its stand by the fence, its horn turned to the floor.
    const gx = x + .8, gz = z - 1.39;
    for (const [dx, dz] of [[-.16, -.16], [.16, -.16], [-.16, .16], [.16, .16]]) v.block(gx + dx, 0, gz + dz, .05, .7, .05, 0x3b2620);
    v.block(gx, .7, gz, .44, .05, .44, 0x553829); v.block(gx, .75, gz, .28, .14, .28, 0x4a2e1c); v.block(gx, .89, gz, .24, .02, .24, 0x141014);
    for (let i = 0; i < 6; i++) { const size = .05 + i * .05; v.block(gx - .03 - i * .07, .92 + i * .08, gz, size * .6, size, size, i === 5 ? 0xd8b06a : 0xc39b61); }
    for (let i = 0; i < 3; i++) { const n = new Voxels(); n.block(0, 0, 0, .1, .08, .03, 0xffe0a0, true); n.block(.04, .04, 0, .02, .16, .02, 0xffe0a0, true); const g = n.build(); g.userData.base = [gx - .45, 1.35, gz]; g.userData.phase = i / 3; notes.push(g); }
  }
  if (has("trolley")) {
    const x = 45.3, z = 24.4;
    for (const dx of [-.32, .32]) for (const dz of [-.26, .26]) v.block(x + dx, 0, z + dz, .2, .2, .05, 0x1e1a22);
    v.block(x, .14, z, .9, .1, .5, oak); v.block(x, .24, z, .86, .3, .46, 0x553829); v.block(x, .54, z, .92, .05, .52, 0x8a5e3c);
    v.block(x + .5, .5, z, .06, .4, .4, BRASS_RAIL);
    v.block(x - .15, .59, z, .3, .38, .3, 0xb67745); v.block(x - .15, .97, z, .22, .05, .22, 0xc39b61); v.block(x - .15, .64, z + .16, .05, .05, .05, 0xc39b61);
    for (let i = 0; i < 3; i++) v.block(x + .15 + i * .09 - .09, .59, z + .1 - (i % 2) * .16, .08, .1, .08, 0xe8dcc4);
  }
  const group = v.build(), fire = flames.build();
  if (level >= 3) { fire.position.set(brazier[0], .92, brazier[1]); group.add(fire); }
  for (const n of notes) group.add(n);
  return { group, flames: level >= 3 ? fire : null, notes };
}
// Open a connection through the old fence/trees without changing world.js.
// Compact positive, nonzero instances in place; keep the shared geometry alive.
const clearRegions = [[38, 10.7, 57, 34 + DROP], [38.4, 5.8, 43.4, 10.7], [35.3, 24.7 + DROP, 40.3, 29.7 + DROP], [34, 22.6 + DROP, 42, 25.3 + DROP]];
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
  let builtLand = false, tier = -1, booth = null, cups = [], specials = [], pickables = [], marker = null, courier = null, sandy = null, barista = null, crate = null, chatProps = null, dressed = "";
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
    const f = 24.6 + DROP;                                                       // the farm's front fence line
    fenceRun(v, r, 35.6, f, 53.6, f);
    fenceRun(v, r, 53.6, 2.9, 53.6, f, (x, z) => z > 5.1 && z < 8.1);
    fenceRun(v, r, 40, 2.9, 53.6, 2.9);
    // Same pickets, post caps, lanterns, tree crowns and leaf colours as the farm.
    for (const [x, z] of [[41, f + .5], [47, f + .5], [53.4, f + .5], [53.1, 16], [53.1, 9], [43, 3.2], [49, 3.2]]) lanternPost(v, x, z, [], false);
    for (const [x, z, size, kind] of [[44.4, .6, 1, 2], [49, .8, 1.1, 0], [53.8, 1, 1.1, 1], [55.6, 8, 1, 2], [55.6, 14, 1.05, 0], [55.6, 21.8 + DROP, 1, 1]]) tree(v, r, x, z, size, kind);
    for (const z of [5.1, 8.1]) { v.block(53.6, 0, z, .3, 2.8, .3, 0x4a2e1c); v.block(53.6, 2.8, z, .45, .12, .45, 0x6a4428); lanternPost(v, 54.1, z, [], false); }
    v.block(53.6, 2.9, 6.6, .35, .16, 3.4, 0x6a4428);
    // Planted drifts soften the border instead of outlining a new rectangle.
    for (let x = 36; x < 54; x += .55) for (let k = 0; k < 3; k++) {
      const z = f + .9 + r() * 1.2;
      v.block(x + r() * .4, r() * .18, z, .32, .22 + r() * .2, .32, [0x8a2f1e, 0xc2552a, 0x6a2a3a][Math.floor(r() * 3)]);
    }
    for (const [x, z] of [[43, 8], [52, 25 + DROP]]) {
      v.block(x, 0, z, 1.05, .4, .75, 0x6b4330); v.block(x, .4, z, 1.15, .1, .85, 0xa0784b);
      for (let i = 0; i < 9; i++) { const xx = x + (r() - .5) * .9, zz = z + (r() - .5) * .6; v.block(xx, .5, zz, .07, .3 + r() * .3, .07, 0x476545); v.block(xx, .9, zz, .2, .12, .2, i % 2 ? 0xb58ac9 : 0xc67636); }
    }
    for (const x of [42, 44]) { for (const dx of [-.6, .6]) v.block(x + dx, 0, 21.6, .13, .55, .5, 0x392b27); v.block(x, .55, 21.6, 1.8, .12, .6, 0x795039); v.block(x, .85, 21.35, 1.8, .38, .1, 0x795039); }
    root.add(v.build());
    const exitPath = buildGround({ x0: 54, x1: 58, z0: 5.5, z1: 7.7 }, (x, z) => grounds.cobble(x, z, [0x8c8094, 0x7a6f84, 0x9a8d9e, 0x6c6276], .42, 1, 0x2a2430), { farmView: true }); root.add(exitPath);
    const exitSign = signBoard("Village →", "homeward path", 3.6); exitSign.position.set(53, 3.4, 6.5); root.add(exitSign);
    const welcome = signBoard("Moonbrew Meadow", "cocoa & treats", 5); welcome.position.set(46.8, 1.6, 7); welcome.userData = { type: "meadow-land" }; root.add(welcome); pickables.push(welcome);
    makeHit(47, 1.4, 17.9, 5.5, 3, 4, "cocoa-stand");
  }
  function sync() {
    if (state.festival.meadow && !builtLand) buildLand();
    if (!builtLand) return;
    if (state.festival.cocoa.barista && !barista) { barista=ghostBarista();barista.position.set(46.8,1.55,17.45);root.add(barista); }
    if (state.festival.cocoa.bulkCourier && !crate) { crate=courierCrate();crate.position.set(43.7,0,20.1);root.add(crate); }
    if(barista)barista.visible=!!state.festival.cocoa.barista;
    if(crate)crate.visible=!!state.festival.cocoa.bulkCourier;
    const comforts = state.festival.comforts ?? [], key = state.festival.cocoa.level + ":" + comforts.join(",");
    if (key !== dressed) {
      dressed = key;
      if (chatProps) { root.remove(chatProps.group); disposeObject(chatProps.group); }
      chatProps = chatDressing(state.festival.cocoa.level, comforts); root.add(chatProps.group);
    }
    if (tier === state.festival.cocoa.level) return;
    tier = state.festival.cocoa.level;
    if (booth) { pickables = pickables.filter(p => !p.userData.festivalRoof); root.remove(booth); disposeObject(booth); }
    booth = tier ? cocoaKiosk(tier) : new THREE.Group(); cups = []; specials = [];
    if (!tier) {
      const stake = new Voxels(); for (const x of [-2, 2]) stake.block(x, 0, 0, .14, .6, .14, 0x7a5236); booth.add(stake.build());
      const sign = signBoard("Cocoa stand", "build a warm welcome here", 3); sign.position.set(0, 1.3, .5); booth.add(sign);
    } else {
      const label = signBoard("Haunted Cocoa", "Sandy’s cocoa & s’mores", 4.6); label.position.set(0, 4.45, 1.65); label.userData = { type: "cocoa-stand", festivalRoof: true }; booth.add(label); pickables.push(label);
      for (let i = 0; i < 3; i++) {
        const cup = takeawayCup("cocoa"); cup.position.set(-2.05 + i * .24, 1.55, 1.05); booth.add(cup); cups.push(cup);
      }
    }
    if (tier && !sandy && createCashier) { sandy = createCashier(); sandy.group.position.set(48.1, 1.55, 19.35); root.add(sandy.group); }
    for (const [id, needed, x, z=1.16] of [["flake", 2, -.65], ["deluxe", 2, -1.15], ["midnight", 3, -.15], ["smores", 3, .45], ["ghost-wafer", 4, -2.7], ["caramel-flake", 4, 2.75], ["smores-platter", 5, 2.6,.45]]) if (tier >= needed) {
      const prop = cocoaProp(id); prop.position.set(x, 1.55, z); booth.add(prop); specials.push({ prop, id });
    }
    booth.position.set(...[MEADOW.stand[0], 0, MEADOW.stand[1]]); root.add(booth);
  }
  const steamGeo = new THREE.BufferGeometry(), steam = new Float32Array(8 * 3);
  steamGeo.setAttribute("position", new THREE.BufferAttribute(steam, 3));
  const wisps = new THREE.Points(steamGeo, new THREE.PointsMaterial({ color: 0xe9d8c7, size: .1, transparent: true, opacity: .38, depthWrite: false, toneMapped: false })); root.add(wisps);
  sync();
  return { get pickables() { return pickables; }, get status() { return { cashier: !!sandy, ready: sandy?.ready ?? false, frame: sandy?.group.userData.frame ?? null, tier, barista: !!barista?.visible, bulkCrate: !!crate?.visible, displayed: specials.filter(p => p.prop.visible).map(p => p.id) }; }, sync,
    tick(time) {
      // The courier is a moth (moth.js): it flutters about the booth and rests on the free end of Sandy's counter.
      if (state.festival.cocoa.courier && !courier) {
        const [x, z] = MEADOW.stand;
        courier = createMoth({ home: [x, 3.4, z + 2.1], perch: [x + 2.25, 1.65, z + 1.15] }); root.add(courier.group);
      }
      courier?.tick(time);
      sync(); const c = state.festival.cocoa;
      if (sandy) { sandy.group.visible = c.level > 0; sandy.tick(time, c.level, state.visitors.some(v => v.festival?.phase === "serving" || v.social?.phase === "cocoa-serving") || state.time - c.lastSaleAt < 1.1); }
      for (const n of chatProps?.notes ?? []) { const t = (time * .45 + n.userData.phase) % 1, [x, y, z] = n.userData.base; n.position.set(x - t * .5 + Math.sin(t * 9) * .08, y + t * 1.1, z); n.scale.setScalar(Math.sin(t * Math.PI) * 1.2 + .01); }
      if (barista) {barista.position.y=1.55+Math.sin(time*2)*.05;barista.rotation.y=Math.sin(time*.8)*.1;}
      if (chatProps?.flames) { const f = chatProps.flames; f.scale.set(1 + Math.sin(time * 9) * .08, .85 + Math.abs(Math.sin(time * 7.3)) * .35 + Math.sin(time * 13) * .05, 1 + Math.cos(time * 8) * .08); f.rotation.y = time * .7; } cups.forEach((m, i) => m.visible = c.stock > i); specials.forEach(({ prop, id }) => prop.visible = c.extras[id].stock > 0); wisps.visible = !!c.level && c.open && (c.stock > 0 || ["flake", "deluxe", "midnight", "ghost-wafer", "caramel-flake"].some(id => c.extras[id].stock > 0));
      for (let i = 0; i < 8; i++) { const t = (time * .35 + i / 8) % 1; steam[i * 3] = 45.9 + Math.sin(t * 7 + i) * .14; steam[i * 3 + 1] = 2.7 + t * 1.4; steam[i * 3 + 2] = 18.6 + Math.cos(t * 6 + i) * .12; }
      steamGeo.attributes.position.needsUpdate = true;
    },
  };
}
