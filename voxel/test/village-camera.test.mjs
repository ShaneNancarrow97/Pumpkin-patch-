import test from 'node:test';
import assert from 'node:assert/strict';
import { OUTSIDE_VIEW, outsideLookLift } from '../src/village-camera.js';
import { villageCameraBlockers, villageCameraReach } from '../src/rules/village-navigation.js';
import { createFollowCameraRig, followCameraPose } from '../src/follow-camera.js';
import { PLAN_SCALE as K } from '../src/content/village.js';

const deg = (r) => r * 180 / Math.PI;

test('the outdoor view shows the street and the sky, and can look up at the rooftops', () => {
  const rig = createFollowCameraRig({ pitch: OUTSIDE_VIEW.pitch, distance: OUTSIDE_VIEW.distance, minPitch: OUTSIDE_VIEW.minPitch, maxPitch: OUTSIDE_VIEW.maxPitch });
  const pose = followCameraPose(rig.reset({ x: 0, y: 0, z: 0 }, { heading: { x: 0, z: -1 } }));
  // The lens looks at a point above the owner's head: how far below the horizon that line runs.
  const down = deg(Math.atan2(pose.position.y - (pose.target.y + outsideLookLift(OUTSIDE_VIEW.pitch)), Math.hypot(pose.position.x - pose.target.x, pose.position.z - pose.target.z)));
  const top = 24 - down; // half of the 48 degree landscape view, above the line of sight
  assert.ok(top > 14, `at least 14 degrees of the picture sit above the horizon (${top.toFixed(1)})`);
  assert.ok(down > 0 && down < 12, 'and the owner still stands on visible ground');
  assert.ok(deg(OUTSIDE_VIEW.minPitch) < 0, 'the look stick tilts above the horizon');
  assert.equal(outsideLookLift(OUTSIDE_VIEW.maxPitch), 0, 'looking down from above keeps the owner centred');
});

test('the camera arm stops at a building instead of passing through it', () => {
  const blockers = villageCameraBlockers();
  assert.ok(blockers.length >= 10, 'every measured building body blocks the arm');
  // Rowan's workshop stands east of the square (its door at design 66.6, 20). Owner on its doorstep, arm into the house.
  const door = { x: 66 * K, z: 20 * K }, through = villageCameraReach(door, { x: 73 * K, z: 20 * K }, blockers);
  assert.ok(through < .2, `the arm shortens to the wall (${through.toFixed(2)})`);
  assert.equal(villageCameraReach(door, { x: 59 * K, z: 20 * K }, blockers), 1, 'out over the square it is clear');
  // An owner brushing a wall does not lose the arm along it.
  assert.ok(villageCameraReach({ x: 65.9 * K, z: 20 * K }, { x: 65.9 * K, z: 26 * K }, blockers) > .9);
  // A blocker further along the arm clips only its far part.
  const far = villageCameraReach({ x: 58 * K, z: 20 * K }, { x: 70 * K, z: 20 * K }, blockers);
  assert.ok(far > .3 && far < .8, `part of the arm survives (${far.toFixed(2)})`);
});
