import test from "node:test";
import assert from "node:assert/strict";
import { createVillageRenderer, villageRendererPreference } from "../src/rendering/village-renderer.js";

const settle = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  const nodes = [], calls = [], canvas = { getBoundingClientRect: () => ({ left: 4, top: 6, width: 800, height: 600 }), insertAdjacentElement: (_, node) => nodes.push(node) };
  const pipeline = { resize: (...a) => calls.push(["resize", ...a]), firstFrame: async () => calls.push(["first"]), render: () => calls.push(["draw"]), dispose: () => calls.push(["dispose"]), stats: () => ({ actualBackend: "webgpu" }) };
  return { nodes, calls, canvas, pipeline, load: async () => ({ createVillageWebGpuPipeline: async () => pipeline }), gpu: { requestAdapter: async () => ({}) } };
}
function dom() {
  const original = globalThis.document;
  globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, hidden: true, remove() { this.removed = true; } }) };
  return () => { if (original === undefined) delete globalThis.document; else globalThis.document = original; };
}
test("WebGPU is capability-selected and never required for the fallback game", async () => {
  assert.equal(villageRendererPreference("?villageRenderer=webgl"), "webgl");
  let loads = 0;
  const service = createVillageRenderer({ gpu: null, load: () => { loads++; } });
  assert.equal(service.draw({}, {}), false); await settle();
  assert.equal(service.status.backend, "webgl"); assert.equal(service.status.stage, "fallback"); assert.equal(loads, 0);
  const explicit = createVillageRenderer({ preference: "webgl", gpu: { requestAdapter() { throw Error("should not request a device"); } } });
  assert.equal(explicit.draw({}, {}), false); assert.equal(explicit.status.stage, "disabled");
});
test("one asynchronous initialization reveals only a successfully drawn current village frame", async () => {
  const restore = dom(), f = fixture(); let complete;
  f.pipeline.firstFrame = () => new Promise(resolve => { complete = resolve; });
  try {
    const service = createVillageRenderer(f); service.resize(800, 600, 1.5);
    assert.equal(service.draw({}, {}), false); assert.equal(service.draw({}, {}), false); await settle();
    assert.equal(f.nodes.length, 1); assert.equal(f.nodes[0].hidden, true); assert.equal(service.status.stage, "initializing");
    service.hide(); complete(); await settle();
    assert.equal(f.nodes[0].hidden, true, "finishing in the background must not cover the farm");
    assert.equal(service.draw({}, {}), true); assert.equal(f.nodes[0].hidden, false); assert.equal(service.status.backend, "webgpu");
    service.hide(); assert.equal(f.nodes[0].hidden, true); service.dispose();
    assert.equal(f.calls.filter(c => c[0] === "dispose").length, 1); assert.equal(f.nodes[0].removed, true);
  } finally { restore(); }
});
test("device or material draw failure returns to the original input canvas without retry loops", async () => {
  const restore = dom(), f = fixture();
  try {
    const service = createVillageRenderer(f); service.draw({}, {}); await settle();
    assert.equal(service.draw({}, {}), true);
    f.pipeline.render = () => { throw Error("unported material"); };
    assert.equal(service.draw({}, {}), false); assert.equal(service.status.backend, "webgl");
    assert.equal(service.status.reason, "unported material"); assert.equal(f.nodes[0].hidden, true);
    assert.equal(service.draw({}, {}), false); assert.equal(f.calls.filter(c => c[0] === "dispose").length, 1);
    assert.equal("removed" in f.canvas, false, "the original input/render canvas is never removed");
  } finally { restore(); }
});
test("retiring during initialization disposes a late presentation exactly once", async () => {
  const restore = dom(), f = fixture(); let resolvePipeline;
  f.load = async () => ({ createVillageWebGpuPipeline: () => new Promise(resolve => { resolvePipeline = resolve; }) });
  try {
    const service = createVillageRenderer(f); service.draw({}, {}); await settle(); service.dispose();
    resolvePipeline(f.pipeline); await settle();
    assert.equal(service.status.stage, "disposed"); assert.equal(service.draw({}, {}), false);
    assert.equal(f.calls.filter(c => c[0] === "dispose").length, 1); assert.equal(f.nodes[0].hidden, true);
  } finally { restore(); }
});

test("a busy GPU keeps its current picture without counting or revealing an old queued frame", async () => {
  const restore = dom(), f = fixture();
  try {
    const service = createVillageRenderer(f); service.draw({}, {}); await settle();
    service.draw({}, {}); assert.equal(service.status.frames, 1);
    f.pipeline.render = () => false;
    assert.equal(service.draw({}, {}), true); assert.equal(service.status.frames, 1); assert.equal(f.nodes[0].hidden, false);
    service.hide(); assert.equal(service.draw({}, {}), false); assert.equal(f.nodes[0].hidden, true);
    f.pipeline.render = () => true; assert.equal(service.draw({}, {}), true); assert.equal(service.status.frames, 2);
    service.dispose();
  } finally { restore(); }
});
