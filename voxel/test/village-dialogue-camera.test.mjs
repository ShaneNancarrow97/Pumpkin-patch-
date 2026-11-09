import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { villageDialoguePose, createVillageDialogueCamera } from "../src/village-dialogue-camera.js";

const close = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const vectorClose = (a, b, epsilon = 1e-8) => { close(a.x, b.x, epsilon); close(a.y, b.y, epsilon); close(a.z, b.z, epsilon); };
function harness({ aspect = 864 / 756, enabled = true, reducedMotion = () => false } = {}) {
  const camera = new THREE.PerspectiveCamera(aspect < .9 ? 58 : 48, aspect, .2, 900);
  camera.position.set(8, 4.6, 12); const controls = { target: new THREE.Vector3(2, 1.3, 3), enabled };
  camera.lookAt(controls.target); camera.updateMatrixWorld();
  const original = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), target: controls.target.clone(), enabled };
  const rig = createVillageDialogueCamera({ camera, controls, reducedMotion });
  return { camera, controls, original, rig };
}
const finish = rig => { for (let i = 0; i < 40; i++) rig.tick(1 / 60); };

test("phone, Fold, landscape and TV two-shots keep both heads and feet above the dialogue", () => {
  for (const aspect of [390 / 844, 864 / 756, 844 / 390, 1920 / 1080]) for (const pair of [
    [{ x: 0, y: 0, z: 0 }, { x: 2, y: .2, z: .3 }],
    [{ x: 64, y: 1, z: -48 }, { x: 67.4, y: 1.25, z: -46 }],
    [{ x: 4003, y: 0, z: 3 }, { x: 4001, y: 0, z: 1 }],
  ]) {
    const fov = aspect < .9 ? 58 : 48;
    const pose = villageDialoguePose({ player: pair[0], npc: pair[1], aspect, fov, cameraPosition: { x: 8, y: 5, z: 12 }, cameraTarget: { x: 2, y: 1, z: 3 } });
    assert.ok(pose?.fitted); assert.ok(pose.distance >= 6.1 && pose.distance <= 18);
    const camera = new THREE.PerspectiveCamera(fov, aspect, .05, 1000);
    camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
    const direction = pose.position.clone().sub(pose.target); direction.y = 0; direction.normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
    for (const p of pair) for (const height of [0, 2.35]) for (const width of [-.43, .43]) {
      const projected = new THREE.Vector3(p.x, p.y + height, p.z).addScaledVector(right, width).project(camera);
      assert.ok(projected.x >= (aspect >= .9 ? -.900001 : -.760001) && projected.x <= (aspect >= .9 ? .080001 : .760001), "both body edges stay clear of the sides and the right reply column");
      assert.ok(projected.y >= -.240001 && projected.y <= .830001, "heads and feet stay in the uncovered upper world");
      assert.ok(projected.z > -1 && projected.z < 1);
    }
  }
});

test("the actual Fold greeting pair clears the measured tall reply column and lower speech ribbon", () => {
  const player = { x: 80.40899315967098, y: .04, z: -43.39127295325474 };
  const npc = { x: 80.4, y: .04, z: -45.3 }; // actual Elowen feet, not her approach waypoint
  const pose = villageDialoguePose({ player, npc, cameraPosition: { x: 80.55407484461541, y: 4.320923798165726, z: -37.16232841793724 }, cameraTarget: { x: player.x, y: 1.34, z: player.z }, aspect: 864 / 756, fov: 48 });
  assert.ok(pose?.fitted);
  const camera = new THREE.PerspectiveCamera(48, 864 / 756, .05, 1000); camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  for (const subject of [player, npc]) for (const height of [0, 2.35]) for (const side of [-.43, .43]) {
    const p = new THREE.Vector3(subject.x, subject.y + height, subject.z).addScaledVector(right, side).project(camera);
    const x = (p.x + 1) * 864 / 2, y = (1 - p.y) * 756 / 2;
    assert.ok(x < 490.921875 - 12, "full body stays left of the actual first reply pill");
    assert.ok(y < 494.875 - 12, "full body stays above the actual speech nameplate");
  }
});

test("dialogue eases in, owns controls, and restores the exact exploration pose on close", () => {
  const h = harness(); assert.equal(h.rig.begin({ x: 1, y: 0, z: 2 }, { x: 3, y: 0, z: 2 }), true);
  assert.equal(h.rig.active, true); assert.equal(h.controls.enabled, false);
  h.rig.tick(.1); assert.ok(h.camera.position.distanceTo(h.original.position) > .01); assert.equal(h.rig.status.mode, "entering");
  finish(h.rig); assert.equal(h.rig.status.mode, "focused");
  const focus = h.camera.position.clone(); h.rig.end(); h.rig.tick(.1);
  assert.equal(h.rig.status.mode, "returning"); assert.ok(h.camera.position.distanceTo(focus) > .01); assert.equal(h.controls.enabled, false);
  finish(h.rig); assert.equal(h.rig.active, false); assert.equal(h.controls.enabled, true);
  vectorClose(h.camera.position, h.original.position); vectorClose(h.controls.target, h.original.target);
  close(h.camera.quaternion.angleTo(h.original.quaternion), 0, 1e-7);
});

test("a greeting replaced by chat or a quest retains the first exploration snapshot", () => {
  const h = harness({ enabled: false });
  h.rig.begin({ x: 1, y: 0, z: 2 }, { x: 3, y: 0, z: 2 }); finish(h.rig);
  h.rig.end(); h.rig.tick(.08);
  h.rig.begin({ x: 1, y: 0, z: 2 }, { x: 3.5, y: 0, z: 2.1 }); finish(h.rig);
  h.rig.end(); finish(h.rig);
  vectorClose(h.camera.position, h.original.position); vectorClose(h.controls.target, h.original.target);
  assert.equal(h.controls.enabled, false, "an original follow rig stays in control when exploration returns");
});

test("frame timing does not change the finished shot and resizing reframes without losing return", () => {
  const a = harness(), b = harness();
  for (const h of [a, b]) h.rig.begin({ x: 1, y: 0, z: 2 }, { x: 4.8, y: .4, z: 2.2 });
  for (let i = 0; i < 30; i++) a.rig.tick(1 / 60); b.rig.tick(.5);
  vectorClose(a.camera.position, b.camera.position); vectorClose(a.controls.target, b.controls.target);
  a.camera.aspect = 390 / 844; a.camera.fov = 58; a.camera.updateProjectionMatrix();
  assert.equal(a.rig.resize(), true); finish(a.rig); assert.equal(a.rig.status.fitted, true);
  a.rig.end({ immediate: true }); vectorClose(a.camera.position, a.original.position);
  close(a.camera.aspect, 390 / 844); close(a.camera.fov, 58, 1e-8);
});

test("reduced motion snaps, invalid targets do not hijack the camera, and disposal is safe", () => {
  const h = harness({ reducedMotion: () => true });
  assert.equal(h.rig.begin({ x: NaN, z: 1 }, { x: 2, z: 1 }), false);
  assert.equal(h.rig.begin({ x: 0, z: 0 }, { x: 100, z: 0 }), false);
  assert.equal(h.rig.active, false); vectorClose(h.camera.position, h.original.position); assert.equal(h.controls.enabled, true);
  assert.equal(h.rig.begin({ x: 1, z: 2 }, { x: 1, z: 2 }), true); assert.equal(h.rig.status.mode, "focused");
  assert.equal(h.rig.begin({ x: Infinity, z: 0 }, { x: 0, z: 0 }), false); assert.equal(h.rig.status.mode, "focused");
  h.rig.tick(NaN); h.rig.tick(-1); assert.ok(h.camera.matrixWorld.elements.every(Number.isFinite));
  h.rig.end(); assert.equal(h.rig.active, false); vectorClose(h.camera.position, h.original.position);
  h.rig.dispose(); h.rig.dispose(); assert.equal(h.controls.enabled, true);
});

test("terrain clearance is sampled only while planning and camera updates allocate no ground probes", () => {
  const h = harness(); let probes = 0;
  const rig = createVillageDialogueCamera({ camera: h.camera, controls: h.controls, groundAt: () => { probes++; return 1; } });
  assert.equal(rig.begin({ x: 1, y: 1, z: 2 }, { x: 3, y: 1, z: 2 }), true);
  const planned = probes; assert.ok(planned > 0); finish(rig);
  assert.equal(probes, planned); assert.ok(h.camera.position.y >= 1.8);
  rig.end({ immediate: true });
});
