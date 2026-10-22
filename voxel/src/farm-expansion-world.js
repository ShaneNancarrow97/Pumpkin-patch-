import { Voxels, seeded, vary } from "./voxels.js";
import { COL, MAP, yardGround, fenceRun, lanternPost, tree } from "./world.js";
import { MEADOW, pathDistance } from "./content/festival-meadow.js";
import { farmExpansionTier, fieldDepth, farmPathEnd, DROP, patchShape } from "./content/farm-layout.js";
import { pumpkinBlock } from "./pumpkins.js";

// Purchased rows grow the existing field into a long, rounded patch. Two voxel
// batches provide the new rim, boundary and planting; the ground stays one mesh.
export function buildFarmAnnex(state) {
  const tier = farmExpansionTier(state), depth = fieldDepth(state), end = farmPathEnd(state);
  const v = new Voxels(), r = seeded(9107 + tier), front = depth - 1.4;
  if (!tier) return v.build();
  const gate = x => x > 31.2 && x < 34.8 || x > -4.4 && x < -1.6;
  fenceRun(v, r, -7.6, front, 39.6, front, gate);
  for (const x of [-7.6, 39.6]) fenceRun(v, r, x, 24.6 + DROP, x, front);
  for (const x of [-4.5, -1.5]) lanternPost(v, x, front, [], false);
  for (const x of [4, 10, 16, 24, 30.6, 35.4]) lanternPost(v, x, front + .5, [], false);
  // The ends of both lanes reach the new visible farm boundary. Pickets and
  // plantings leave those lanes clear so guests never walk through a fence.
  for (const [x, z] of [[-5.2, end - .6], [.1, end - .6], [30.6, end - .7], [35.4, end - .7]]) {
    v.block(x, 0, z, .22, .7, .22, COL.woodDark);
    v.block(x, .7, z, .34, .1, .34, COL.woodLight);
  }
  const p = patchShape(state.upgrades.plots), bottom = p.front;
  const stone = (x, z) => {
    const h = .14 + r() * .08, c = vary(0xa89cb0, .12, r);
    v.block(x, 0, z, .26, h, .26, c); v.block(x, h, z, .18, .05, .18, vary(c, .06, r));
  };
  for (let a = 0; a < Math.PI; a += .05) {
    stone(p.x + Math.cos(a) * (p.rx + .3), bottom + Math.sin(a) * (p.rz + .3));
    stone(p.x + Math.cos(a + Math.PI) * (p.rx + .3), p.back + Math.sin(a + Math.PI) * (p.rz + .3));
  }
  for (const x of [p.x - p.rx - .3, p.x + p.rx + .3]) for (let z = p.back + .35; z < bottom - .1; z += .35) stone(x, z);
  // Familiar autumn materials continue beyond the old hedge; no boxed annex
  // texture, overlapping ground plane or extra point lights.
  for (let x = 1; x < 31; x += .65) {
    const z = front + 1.2 + r() * .8;
    v.block(x + r() * .3, .04, z, .38, .24 + r() * .32, .38, vary(COL.leaves[(r() * COL.leaves.length) | 0], .12, r));
  }
  for (const [x, z, size, kind] of [[-8.4, depth + .5, .9, 2], [3.8, depth + 1.4, .85, 0], [37.8, depth + 1.2, .9, 1]]) tree(v, r, x, z, size, kind);
  for (const [x, z, colour] of [[8.6, front - .65, 0xf0821e], [10.2, front - .7, 0xd9d2ff], [28.7, front - .8, 0x9d55e6]]) pumpkinBlock(v, x, 0, z, .55, colour, r);
  for (const x of [5.4, 6.4]) {
    v.block(x, 0, front - 1.3, .85, .55, .65, COL.woodLight);
    for (const y of [.15, .4]) v.block(x, y, front -.96, .85, .06, .03, COL.woodDark);
    for (const dx of [-.2, .2]) pumpkinBlock(v, x + dx, .55, front - 1.3, .25, 0xf0821e, r);
  }
  const group = v.build();
  group.name = "Purchased south field";
  group.userData = { tier, depth, pathEnd: end, plots: tier === 2 ? 24 : 18 };
  return group;
}

// Voxel cubes are shared globally, while each instance buffer and material is
// owned here. Disposing their shared cube would corrupt the rest of the farm.
function disposeAnnex(group) {
  group.traverse(mesh => {
    if (mesh.isInstancedMesh) mesh.dispose();
    else mesh.geometry?.dispose();
    if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => m.dispose());
  });
}

// Call sync after the meadow controller, which can also replace world.ground.
// This preserves both purchases in either order without layering terrain.
export function createFarmExpansion(scene, state, world) {
  let key = "", ground = null, annex = null;
  const lamps = [];
  scene.traverse(object => {
    if (object.isPointLight && Math.abs(object.position.z - (25.1 + DROP)) < .02 && Math.abs(object.position.y - 2.2) < .02 && [4, 16, 30.6, 35.4].some(x => Math.abs(x - object.position.x) < .02)) lamps.push(object);
  });
  function sync() {
    const tier = farmExpansionTier(state), width = state.festival?.meadow ? MEADOW.width : MAP.w;
    const next = `${tier}:${width}`;
    if (key === next && ground === world.ground) return;
    const previousTier = key ? Number(key.split(":")[0]) : 0;
    key = next;
    world.frontBoundary.visible = world.patchBoundary.visible = !tier;
    if (annex) { world.group.remove(annex); disposeAnnex(annex); annex = null; }
    if (tier || previousTier) {
      const terrain = yardGround({ width, depth: fieldDepth(state), plotsTier: state.upgrades.plots, pathEnd: farmPathEnd(state), extraPath: (x, z) => !!state.festival?.meadow && pathDistance(x, z) < .95 });
      world.group.remove(world.ground); world.ground.geometry.dispose(); world.ground.material.dispose();
      world.ground = terrain; world.group.add(terrain);
    }
    if (tier) { annex = buildFarmAnnex(state); world.group.add(annex); }
    lamps.forEach(light => light.position.z = tier ? fieldDepth(state) - .9 : 25.1 + DROP);
    ground = world.ground;
  }
  sync();
  return { sync, get status() { return { tier: farmExpansionTier(state), depth: fieldDepth(state), pathEnd: farmPathEnd(state), plots: annex?.userData.plots ?? 12 }; } };
}
