import test from "node:test";
import assert from "node:assert/strict";
import { behindHeading, createFollowCameraRig, followCameraPose, followTargetStep, wrapFollowAngle } from "../src/follow-camera.js";

const close = (a, b, epsilon = 1e-9) => assert.ok(Math.abs(a - b) < epsilon, `${a} should equal ${b}`);
test("the walking follow has the same trailing distance at 30, 60 and 120Hz", () => {
  function walk(hz) {
    const rig = createFollowCameraRig(); rig.reset({ x: 0, y: 0, z: 0 });
    for (let i = 1; i <= hz * 2; i++) rig.step({ x: i / hz * 3.3, y: 0, z: 0 }, 1 / hz, { moving: true, heading: { x: 1, z: 0 } });
    return rig.state;
  }
  const a = walk(30), b = walk(60), c = walk(120);
  close(a.target.x, b.target.x); close(c.target.x, b.target.x);
  close(6.6 - b.target.x, 3.3 / 12, 1e-8);
  close(a.yaw, 0); close(b.yaw, 0); close(c.yaw, 0);
});

test("holding a camera-relative strafe does not cause automatic orbit feedback", () => {
  const rig = createFollowCameraRig(); rig.reset({ x: 0, y: 0, z: 0 }); rig.look(1, 0, .25);
  for (let i = 0; i < 600; i++) {
    const yaw = rig.state.yaw, right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    rig.step({ x: right.x * i / 60, y: 0, z: right.z * i / 60 }, 1 / 60, { moving: true, heading: right });
  }
  close(rig.state.yaw, .25 * 1.65, 1e-8);
  close(rig.state.wantedYaw, .25 * 1.65);
});

test("an orbit crossing north wraps by the short angle and stays centred", () => {
  const rig = createFollowCameraRig(), pos = { x: 40, y: 2, z: -25 };
  rig.reset(pos, { yaw: Math.PI - .06 }); rig.orbit(.12, 0);
  const first = rig.step(pos, .02);
  assert.ok(first.yaw > Math.PI - .06 || first.yaw < -Math.PI + .06);
  for (let i = 0; i < 60; i++) rig.step(pos, 1 / 60);
  close(wrapFollowAngle(rig.state.yaw - (-Math.PI + .06)), 0, 1e-7);
  const pose = followCameraPose(rig.state);
  close(Math.hypot(pose.position.x - pose.target.x, pose.position.y - pose.target.y, pose.position.z - pose.target.z), 6.8);
  assert.deepEqual(pose.target, { x: 40, y: 3.3, z: -25 });
});

test("recentring chooses behind the owner and retains the selected distance", () => {
  const rig = createFollowCameraRig(); rig.reset({ x: 0, z: 0 }); rig.zoom(.8);
  for (let i = 0; i < 60; i++) rig.step({ x: 0, z: 0 }, 1 / 60);
  rig.recenter({ x: 1, z: 0 });
  for (let i = 0; i < 120; i++) rig.step({ x: 0, z: 0 }, 1 / 60);
  close(rig.state.yaw, -Math.PI / 2, 1e-8); close(rig.state.distance, 8.5, 1e-8);
  close(behindHeading({ x: 0, z: -1 }), 0); close(Math.abs(behindHeading({ x: 0, z: 1 })), Math.PI);
});

test("manual orbit wins over a world-directed walk until its grace period ends", () => {
  const rig = createFollowCameraRig(); rig.reset({ x: 0, z: 0 }); rig.look(1, 0, .2);
  const motion = { heading: { x: 1, z: 0 }, moving: true, worldDirected: true };
  rig.step({ x: .1, z: 0 }, .2, motion); close(rig.state.wantedYaw, .33);
  for (let i = 0; i < 100; i++) rig.step({ x: .1 + i / 60, z: 0 }, 1 / 60, motion);
  close(rig.state.wantedYaw, -Math.PI / 2); assert.ok(rig.state.yaw < -1.4);
});

test("a teleport or invalid frame cannot drag the camera across places", () => {
  const rig = createFollowCameraRig(); rig.reset({ x: 1, z: 2 });
  const before = rig.state;
  for (const dt of [NaN, -1, Infinity]) rig.step({ x: 1, z: 2 }, dt);
  assert.deepEqual(rig.state, before);
  rig.step({ x: 4000, y: 0, z: -12 }, 0);
  assert.deepEqual(rig.state.target, { x: 4000, y: 1.3, z: -12 });
  const bounded = followTargetStep({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, .1, 0);
  assert.ok(Object.values(bounded).every(Number.isFinite));
  assert.ok(Number.isFinite(behindHeading({ x: NaN, z: 1 })));
});

test("room orbits and close zoom stop before the cutaway and giant sprite view", () => {
  const rig = createFollowCameraRig({ yawLimit: .8, minDistance: 9, maxDistance: 17, distance: 11 });
  rig.reset({ x: 0, z: 0 }); rig.orbit(30, 30); rig.zoom(100);
  for (let i = 0; i < 120; i++) rig.step({ x: 0, z: 0 }, 1 / 60);
  close(rig.state.yaw, .8, 1e-8); close(rig.state.distance, 9, 1e-8);
  assert.ok(rig.state.pitch < Math.PI / 2);
});

test("the player frames its new position before choosing the turned sprite view", async () => {
  const THREE = await import("three"), { createPlayerControl } = await import("../src/player-control.js"), { freshState } = await import("../src/model.js");
  const original = globalThis.document; globalThis.document = { body: { classList: { contains: () => false } } };
  try {
    const state = freshState(), scene = new THREE.Scene(), actor = new THREE.Group(), frames = [], motion = [], resets = [];
    actor.add(new THREE.Group()); actor.position.set(15, 0, 16); actor.userData.playerAnimate = value => frames.push(value);
    const camera = new THREE.PerspectiveCamera(45, 1, .1, 100); camera.position.set(15, 25, 40); camera.lookAt(15, 0, 16); camera.updateMatrixWorld();
    const player = createPlayerControl({ scene, state, actors: () => ({ natalie: { model: actor } }),
      places: { setControlled() {}, playerActor() { return null; }, clearPlayerRest() {} }, getPlace: () => null, getCamera: () => camera, animate() {},
      follow(pos, dt, inside, options) { motion.push({ pos: pos.clone(), ...options }); camera.position.set(15, 25, -8); camera.lookAt(15, 0, 16); camera.updateMatrixWorld(); },
      cameraReset(pos, inside, heading) { resets.push({ pos, inside, heading }); },
    });
    player.setEnabled(true, "natalie"); player.input(1, 0); player.update(.05, .05);
    assert.ok(motion.at(-1).pos.x > 15, "follow receives the new foot position");
    assert.ok(motion.at(-1).heading.x > .99); assert.equal(motion.at(-1).worldDirected, false);
    assert.ok(frames.at(-1).dx < -.99, "sprite sees the camera after its same-frame turn");
    player.recenter(); assert.ok(resets.at(-1).heading.x > .99, "recentring receives the actual world heading");
  } finally { if (original === undefined) delete globalThis.document; else globalThis.document = original; }
});

test("camera inspection can pan/zoom without moving its owner, then resume gently", () => {
  const rig=createFollowCameraRig(),owner={x:10,y:0,z:12};rig.reset(owner);
  rig.panTarget(8,-3);rig.zoom(1.2);
  for(let i=0;i<60;i++)rig.step(owner,1/60,{holdTarget:true});
  assert.deepEqual(rig.state.target,{x:18,y:1.3,z:9});close(rig.state.distance,6.8/1.2,1e-6);
  rig.step(owner,1/60);assert.ok(rig.state.target.x>16&&rig.state.target.x<18,"follow resumes without a snap");
  for(let i=0;i<120;i++)rig.step(owner,1/60);close(rig.state.target.x,10,1e-8);close(rig.state.target.z,12,1e-8);
  assert.deepEqual(owner,{x:10,y:0,z:12});
});
