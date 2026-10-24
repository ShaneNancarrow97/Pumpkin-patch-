import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";

const bundle = await build({ entryPoints: [new URL("../src/hayride-scares.js", import.meta.url).pathname], bundle: true, platform: "node", format: "cjs", loader: { ".webp": "dataurl" }, write: false });
const sandbox = { module: { exports: {} }, console };
vm.runInNewContext(bundle.outputFiles[0].text, sandbox);
const { createHayrideScares, hayrideScarePose } = sandbox.module.exports;

test("foreground scares remain outside the lane and gentle mode removes the lunge", () => {
  for (const offset of [4.1, 5.4, 6.1]) for (const upgraded of [false, true]) {
    for (let i = 0; i <= 200; i++) {
      const progress = .4 + i / 1000, pose = hayrideScarePose({ at: .5, offset }, progress, upgraded);
      assert.ok(pose.offset >= 2.6 && pose.offset <= offset);
      assert.ok(pose.lunge >= 0 && pose.lunge <= 1);
      assert.ok(pose.reveal >= 0 && pose.reveal <= 1);
      const gentle = hayrideScarePose({ at: .5, offset }, progress, upgraded, true);
      assert.equal(gentle.lunge, 0); assert.equal(gentle.offset, offset);
    }
  }
  assert.equal(hayrideScarePose({ at: .5, offset: 6.1 }, .1).visible, false);
});

test("off-map cast reads ownership without changing state and disposes only its instances", () => {
  const state = { coins: 34, hayride: { tier: 3, income: 16, ticketsSold: 2, haunts: { owned: ["bride-procession"], active: ["bride-procession"] } } };
  // .47 is just past the bride's set (at .46), where she lunges.
  const before = JSON.stringify(state), cast = createHayrideScares({ state });
  cast.tick({ progress: .47, time: 30, camera: { x: -32, y: 2, z: 15 } });
  assert.equal(cast.diagnostics.actors, 4); assert.equal(cast.diagnostics.visible, 1);
  const bride = cast.diagnostics.cast.find(entry => entry.stop === "bride");
  assert.equal(bride.actor, "haunted-girl"); assert.ok(bride.lunge > .9); assert.ok(bride.offset < 3);
  assert.ok(cast.focusTarget(.47).toArray().every(Number.isFinite));
  cast.group.traverse(node => assert.ok(node.matrixWorld.elements.every(Number.isFinite)));
  cast.tick({ progress: .47, gentle: true });
  assert.equal(cast.diagnostics.cast.find(entry => entry.stop === "bride").lunge, 0);
  cast.tick({ progress: 0 }); assert.equal(cast.diagnostics.visible, 0); assert.equal(cast.focusTarget(0), null);
  assert.equal(JSON.stringify(state), before);
  cast.dispose(); cast.dispose(); assert.equal(cast.group.children.length, 0); assert.equal(cast.diagnostics.disposed, true);
  const replay = createHayrideScares({ state }); replay.tick({ progress: .47 });
  assert.equal(replay.diagnostics.visible, 1); replay.dispose();
});
