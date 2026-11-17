import test from "node:test";
import assert from "node:assert/strict";
import { createResolutionGovernor, RESOLUTION_STEPS } from "../src/dynamic-resolution.js";
import { renderSizing, RENDER_QUALITIES, validRenderQuality } from "../src/render-quality.js";

// Play `seconds` of frames: `fps` reach the screen, `cpuMs` of game work each, at the given cap.
function play(g, clock, seconds, { fps, cap = 60, cpuMs = 2, ignore = false, every = 1000 / 60 }) {
  const changes = [];
  for (let t = 0; t < seconds * 1000; t += every) {
    clock.now += every; clock.shown += fps * every / 1000;
    const next = g.sample(clock.now, Math.floor(clock.shown), { capFps: cap, cpuMs, ignore });
    if (next !== null) changes.push(next);
  }
  return changes;
}

test("Automatic lowers detail a step at a time while frames fall behind the cap, and stops at its floor", () => {
  const g = createResolutionGovernor(), clock = { now: 0, shown: 0 };
  assert.equal(g.scale, 1);
  const changes = play(g, clock, 2.5, { fps: 38 });
  assert.deepEqual(changes, [RESOLUTION_STEPS[1]], "two slow seconds bring the first step");
  play(g, clock, 2, { fps: 38 });
  assert.equal(g.scale, RESOLUTION_STEPS[1], "and it waits a while before the next");
  play(g, clock, 60, { fps: 20 });
  assert.equal(g.scale, RESOLUTION_STEPS.at(-1), "never below the last step");
});

test("it raises detail again once the cap is held, and waits longer after a raise that didn't last", () => {
  const g = createResolutionGovernor(), clock = { now: 0, shown: 0 };
  play(g, clock, 12, { fps: 30 });
  const low = g.step; assert.ok(low >= 2);
  const up = play(g, clock, 8, { fps: 60 });
  assert.ok(up.length >= 1 && g.step < low, "steady frames bring detail back");
  const patience = g.patience;
  play(g, clock, 4, { fps: 30 });
  assert.ok(g.patience > patience, "falling straight back after a raise makes it more patient");
});

test("a late frame from the game's own work, a menu or a hidden tab never lowers detail", () => {
  const g = createResolutionGovernor(), clock = { now: 0, shown: 0 };
  assert.deepEqual(play(g, clock, 10, { fps: 30, cpuMs: 15 }), [], "busy main thread: fewer pixels wouldn't help");
  assert.deepEqual(play(g, clock, 10, { fps: 10, ignore: true }), [], "ignored while a menu is open");
  clock.now += 20000; // a hidden tab
  assert.equal(g.sample(clock.now, clock.shown, { capFps: 60 }), null);
  assert.equal(g.scale, 1);
});

test("a steady 30 cap is judged against 30, not 60", () => {
  const g = createResolutionGovernor(), clock = { now: 0, shown: 0 };
  assert.deepEqual(play(g, clock, 10, { fps: 30, cap: 30, every: 1000 / 30 }), []);
  assert.equal(g.scale, 1);
  assert.ok(play(g, clock, 6, { fps: 20, cap: 30, every: 1000 / 30 }).length >= 1);
});

test("restarting goes back to full detail and normal patience", () => {
  const g = createResolutionGovernor(), clock = { now: 0, shown: 0 };
  play(g, clock, 12, { fps: 25 }); assert.ok(g.step > 0);
  g.restart(); assert.equal(g.scale, 1); assert.equal(g.patience, 3);
});

test("Automatic draws like Sharp until it scales, never below half, and a cast never below a pixel a CSS pixel", () => {
  assert.ok(RENDER_QUALITIES.some(q => q.id === "auto")); assert.equal(validRenderQuality("auto"), "auto");
  const sharp = renderSizing(874, 787, 2.6, "sharp"), auto = renderSizing(874, 787, 2.6, "auto");
  assert.equal(auto.pixelRatio, sharp.pixelRatio);
  assert.ok(Math.abs(renderSizing(874, 787, 2.6, "auto", false, false, .7).pixelRatio - sharp.pixelRatio * .7) < 1e-9);
  assert.equal(renderSizing(874, 787, 2.6, "auto", false, false, .1).pixelRatio, sharp.pixelRatio * .5);
  assert.equal(renderSizing(874, 787, 2.6, "sharp", false, false, .5).pixelRatio, sharp.pixelRatio, "only Automatic scales");
  for (const [w, h, d] of [[882, 344, 2.625], [832, 750, 2.625], [1920, 1080, 1]]) {
    const tv = renderSizing(w, h, d, "auto", false, true, .5);
    assert.ok(tv.pixelRatio >= Math.min(1, renderSizing(w, h, d, "auto", false, true).pixelRatio) - 1e-9, `${w}x${h}`);
  }
});
