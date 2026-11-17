import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHayrideWorld } from "../src/hayride-world.js";
import { HAYRIDE_SITE } from "../src/content/hayride-layout.js";
import { freshHayride } from "../src/rules/hayride.js";

test("the station supports its connecting walks and keeps portal silhouettes below four metres", () => {
  const scene = new THREE.Scene(), state = { hayride: { ...freshHayride(), purchased: true }, visitors: [], upgrades: { plots: 0 } };
  const controller = createHayrideWorld({ scene, state, world: { group: new THREE.Group() }, signBoard: () => new THREE.Group() });
  try {
    const station = controller.root.children.find(group => group.name === "The Hollow Hayride farm station"), boxes = [];
    assert.ok(station); station.updateMatrixWorld(true);
    const local = new THREE.Matrix4(), matrix = new THREE.Matrix4();
    station.traverse(object => {
      if (!object.isInstancedMesh) return;
      for (let i = 0; i < object.count; i++) {
        object.getMatrixAt(i, local); matrix.multiplyMatrices(object.matrixWorld, local);
        boxes.push(new THREE.Box3(new THREE.Vector3(-.5, -.5, -.5), new THREE.Vector3(.5, .5, .5)).applyMatrix4(matrix));
      }
    });
    for (const [x,z] of [[-9.1,20],[-9.1,23],[-9.1,36],[-14.7,38],[-19.5,36],[-17,17],[-17,40]]) {
      assert.ok(boxes.some(box => box.min.x <= x && box.max.x >= x && box.min.z <= z && box.max.z >= z && box.min.y < -.3 && box.max.y >= 0), `unsupported walk or vehicle lane at ${x},${z}`);
    }
    // The return arch is in the foreground (south, towards the camera), so it
    // stays low; the departure arch stands behind the station, against the wood.
    for (const [portal, limit] of [[HAYRIDE_SITE.returnPortal, 4], [HAYRIDE_SITE.departurePortal, 5.6]]) {
      const near = boxes.filter(box => box.max.x > portal.x-3.3 && box.min.x < portal.x+3.3 && box.max.z > portal.z-.7 && box.min.z < portal.z+.7);
      assert.ok(near.length > 10);
      assert.ok(Math.max(...near.map(box => box.max.y)) < limit, "a foreground portal must not become a giant canopy over the station");
    }
  } finally { controller.dispose(); }
});
