import test from "node:test";
import assert from "node:assert/strict";
import { ownerWalkMotion, animateAutonomousOwner } from "../src/owner-walk-motion.js";
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test("autonomous owner footsteps follow actual distance and retain phase through camera turns and waits", () => {
  const first = ownerWalkMotion(null, { moving: true, dx: 0, dz: .9 });
  near(first.phase, .5); near(first.angle, 0); assert.equal(first.facing, "front");
  const turned = ownerWalkMotion(first, { moving: true, dx: .45, dz: 0 });
  near(turned.phase, .75); near(turned.angle, Math.PI / 2); assert.equal(turned.facing, "side");
  const stopped = ownerWalkMotion(turned, { moving: false, dx: 4, dz: 4, towardCamera: { x: 1, z: 0 } });
  near(stopped.distance, 1.35); near(stopped.phase, .75); near(stopped.angle, 0);
  assert.equal(stopped.moving, false); assert.deepEqual(stopped.heading, turned.heading);
  const secondStep = ownerWalkMotion(stopped, { moving: true, dx: 0, dz: -.45 });
  near(secondStep.phase, 0); near(secondStep.angle, Math.PI); assert.equal(secondStep.facing, "back");
  for (const travel of [{ dx: 0, dz: 0 }, { dx: NaN, dz: 1 }, { dx: 1, dz: Infinity }]) {
    const blocked = ownerWalkMotion(turned, { moving: true, ...travel });
    near(blocked.phase, turned.phase); assert.equal(blocked.moving, false);
  }
});

test("only owners invoke directional artwork and their atlas releases once when they stop", () => {
  const calls = [], owner = { kind: "person", playerAnimate: options => calls.push(options) };
  assert.equal(animateAutonomousOwner(owner, { time: 8 }), false);
  assert.equal(calls.length, 0, "initial idle is left alone");
  assert.equal(animateAutonomousOwner(owner, { moving: true, dx: 0, dz: .9, time: 9 }), true);
  near(calls[0].phase, .5); near(calls[0].angle, 0); assert.equal(calls[0].walking, true);
  animateAutonomousOwner(owner, { moving: false, time: 10 });
  assert.equal(calls[1].release, true); assert.equal(calls[1].walking, false);
  animateAutonomousOwner(owner, { moving: false, time: 11 });
  assert.equal(calls.length, 2, "a subsequent home pose will not be repainted");
  animateAutonomousOwner(owner, { moving: true, dx: .225, dz: 0, time: 12 });
  near(calls[2].phase, .625); near(calls[2].angle, Math.PI / 2);
  for (const kind of ["visitor", "skyla", undefined]) assert.equal(animateAutonomousOwner({ kind, playerAnimate: () => assert.fail("not an owner") }, { moving: true, dx: 1 }), false);
  assert.equal(animateAutonomousOwner({ kind: "person" }, { moving: true, dx: 1 }), false);
});
