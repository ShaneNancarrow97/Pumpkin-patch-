import test from 'node:test';
import assert from 'node:assert/strict';
import { OUTSIDE_VIEW, outsideLookLift } from '../src/village-camera.js';
import { villageCameraBlockers, villageCameraReach } from '../src/rules/village-navigation.js';
import { createFollowCameraRig, followCameraPose } from '../src/follow-camera.js';
import { PLAN_SCALE as K } from '../src/content/village.js';
import { spreadWith } from '../src/rules/village-spread.js';

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
  // Rowan's workshop stands east of the square (its door drawn at 66.6, 20, and now further back from the tree:
  // probes are drawn beside it and moved with it). Owner on its doorstep, arm into the house.
  const rowan = (x, z) => { const [a, b] = spreadWith(x, z, 66, 20); return { x: a * K, z: b * K }; };
  const door = rowan(66, 20), through = villageCameraReach(door, rowan(73, 20), blockers);
  assert.ok(through < .2, `the arm shortens to the wall (${through.toFixed(2)})`);
  assert.equal(villageCameraReach(door, rowan(59, 20), blockers), 1, 'out over the square it is clear');
  // An owner brushing a wall does not lose the arm along it.
  assert.ok(villageCameraReach(rowan(65.9, 20), rowan(65.9, 26), blockers) > .9);
  // A blocker further along the arm clips only its far part.
  const far = villageCameraReach(rowan(58, 20), rowan(70, 20), blockers);
  assert.ok(far > .3 && far < .8, `part of the arm survives (${far.toFixed(2)})`);
});
