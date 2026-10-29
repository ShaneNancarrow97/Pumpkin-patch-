import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createSpider, poseSpider, createBrood } from "../src/hayride-spiders.js";
import { createHayrideWorld } from "../src/hayride-world.js";
import { freshHayride } from "../src/rules/hayride.js";
import { hayrideRouteDistance, hayrideRouteSample, HAYRIDE_STOPS, HAYRIDE_ROUTE_LENGTH } from "../src/content/hayride-layout.js";

test("a spider is a jointed rig: eight three-jointed legs that move when it walks", () => {
  const sp = createSpider(0.5);
  assert.equal(sp.legs.length, 8);
  const before = sp.legs.map((l) => l.hip.rotation.y);
  poseSpider(sp, 1, { gait: 1 }); for (let i = 0; i < 20; i++) poseSpider(sp, 1 + i * 0.05, { gait: 1 });
  assert.ok(sp.legs.some((l, i) => Math.abs(l.hip.rotation.y - before[i]) > 0.01), "walking swings the legs");
  poseSpider(sp, 2, { rear: 1 });
  assert.ok(sp.legs[0].lift.rotation.z > sp.legs[2].lift.rotation.z, "rearing raises the front legs");
});

test("a brood draws every spider in two instanced meshes", () => {
  const spiders = [createSpider(1.2), createSpider(0.4), createSpider(0.3)], brood = createBrood(spiders);
  const meshes = brood.group.children.filter((m) => m.isInstancedMesh);
  assert.equal(meshes.length, 2);
  assert.equal(meshes.reduce((n, m) => n + m.count, 0), spiders.reduce((n, s) => n + s.shapes.length, 0));
  brood.sync(); brood.dispose();
});

test("the ride's spider cave carries its brood and silk without touching the lane", () => {
  const scene = new THREE.Scene(), state = { hayride: { ...freshHayride(), purchased: true }, visitors: [], upgrades: { plots: 0 } };
  const controller = createHayrideWorld({ scene, state, world: { group: new THREE.Group() }, signBoard: () => new THREE.Group() });
  try {
    const woodland = controller.rideScene.getObjectByName("The Hollow Hayride off-map woodland");
    assert.ok(woodland.getObjectByName("Hollow Hayride spiders"));
    assert.ok(woodland.getObjectByName("Spider silk"));
    // In the cave nothing static stands within 1.5 of the lane's centre between
    // the floor and the riders' heads (the wagon is about 2.2 wide).
    const cave = hayrideRouteSample(HAYRIDE_STOPS.find((s) => s.id === "spiders").at * HAYRIDE_ROUTE_LENGTH);
    const local = new THREE.Matrix4(), matrix = new THREE.Matrix4(), box = new THREE.Box3(); woodland.updateMatrixWorld(true);
    woodland.traverse((m) => {
      if (!m.isInstancedMesh || m.parent?.name === "Hollow Hayride spiders") return;
      for (let i = 0; i < m.count; i++) {
        m.getMatrixAt(i, local); matrix.multiplyMatrices(m.matrixWorld, local);
        box.set(new THREE.Vector3(-.5, -.5, -.5), new THREE.Vector3(.5, .5, .5)).applyMatrix4(matrix);
        if (box.max.y < 0.25 || box.min.y > 2.9) continue;                              // ground clutter and roots the wheels ride over
        const c = box.getCenter(new THREE.Vector3());
        if (Math.hypot(c.x - cave.x, c.z - cave.z) > 7.5) continue;
        const half = Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
        assert.ok(hayrideRouteDistance(c.x, c.z) - half > 1.5, `a box at ${c.x.toFixed(1)},${c.y.toFixed(1)},${c.z.toFixed(1)} crowds the lane`);
      }
    });
  } finally { controller.dispose(); }
});

test("the detailed roadside sets each build their actors and a brood", async () => {
  const { buildRoadsideSet } = await import("../src/hayride-sets.js"), { Voxels, seeded } = await import("../src/voxels.js");
  for (const [id, n] of [["scarecrows", 4], ["bride", 1], ["pursuit", 1], ["bus", 3]]) {
    const v = new Voxels(), group = new THREE.Group(), set = buildRoadsideSet(id, v, group, seeded(5));
    assert.equal(set.actors.length, n, id);
    assert.ok(v.solid.length + v.glow.length > 100, `${id} is dressed`);
    for (const a of set.actors) a.animate({ time: 1, near: true, ramp: 1, wave: 1, on: true, camera: new THREE.Vector3(0, 2.7, 6), forward: new THREE.Vector3(1, 0, 0), set: { group } });
    set.brood?.sync(); set.brood?.dispose();
  }
  assert.equal(buildRoadsideSet("graveyard", new Voxels(), new THREE.Group(), seeded(5)), null);
});
