import test from "node:test";
import assert from "node:assert/strict";
import { createVillageRenderer, villageRendererPreference } from "../src/rendering/village-renderer.js";

const settle = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function rig(t, overrides = {}) {
  const previous = globalThis.document, nodes = [], pipelines = [], callbacks = [], fallbacks = [];
  globalThis.document = { createElement: () => ({ style: {}, hidden: true, setAttribute() {}, remove() { this.removed = true; } }) };
  const canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }), insertAdjacentElement: (_, node) => nodes.push(node) };
  function makePipeline() {
    const p = { disposed: 0, frames: 0, resize() {}, firstFrame: async () => {}, render() { this.frames++; return true; }, stats: () => ({ actualBackend: "webgpu" }), dispose() { this.disposed++; } };
    pipelines.push(p); return p;
  }
  const options = { canvas, gpu: { requestAdapter: async () => ({}) }, onFallback: reason => fallbacks.push(reason),
    load: async () => ({ createVillageWebGpuPipeline: async ({ onFailure }) => { callbacks.push(onFailure); return makePipeline(); } }), ...overrides };
  const service = createVillageRenderer(options);
  t.after(() => { service.dispose(); if (previous === undefined) delete globalThis.document; else globalThis.document = previous; });
  return { service, nodes, pipelines, callbacks, fallbacks, makePipeline, liveNodes: () => nodes.filter(n => !n.removed) };
}
async function ready(service) { service.draw({}, {}); await settle(); assert.equal(service.status.stage, "ready"); assert.equal(service.draw({}, {}), true); }

test("saved and URL renderer choices validate explicitly without making WebGPU mandatory", async t => {
  assert.equal(villageRendererPreference("?villageRenderer=webgpu"), "webgpu");
  assert.equal(villageRendererPreference("?villageRenderer=webgl"), "webgl");
  for (const value of ["", "?villageRenderer=invalid", "?villageRenderer=__proto__"]) assert.equal(villageRendererPreference(value), "auto");
  const { service } = rig(t, { preference: "webgpu", gpu: null });
  assert.equal(service.draw({}, {}), false); assert.equal(service.status.requested, "webgpu");
  assert.equal(service.status.backend, "webgl"); assert.equal(service.status.stage, "fallback");
  assert.equal(service.setPreference("webgl"), "webgl"); assert.equal(service.status.stage, "disabled");
  assert.equal(service.setPreference("nonsense"), "auto"); assert.equal(service.status.stage, "idle");
});

test("live WebGL selection retires only its GPU and returning to GPU creates one fresh canvas", async t => {
  const r = rig(t); await ready(r.service);
  assert.equal(r.service.setPreference("webgl"), "webgl");
  assert.equal(r.service.status.backend, "webgl"); assert.equal(r.service.status.stage, "disabled");
  assert.equal(r.pipelines[0].disposed, 1); assert.equal(r.liveNodes().length, 0);
  assert.equal(r.service.draw({}, {}), false); assert.equal(r.pipelines.length, 1);
  assert.deepEqual(r.fallbacks, [null], "source shadow refresh runs when returning to WebGL");
  r.service.setPreference("webgpu"); await ready(r.service);
  assert.equal(r.pipelines.length, 2); assert.equal(r.liveNodes().length, 1);
  assert.equal(r.pipelines[1].disposed, 0); assert.equal(r.nodes[1].hidden, false);
});

test("Auto and explicit WebGPU share an already healthy presentation", async t => {
  const r = rig(t); await ready(r.service);
  for (const value of ["webgpu", "auto", "webgpu", "webgpu"]) {
    assert.equal(r.service.setPreference(value), value);
    assert.equal(r.service.status.stage, "ready"); assert.equal(r.service.draw({}, {}), true);
  }
  assert.equal(r.pipelines.length, 1); assert.equal(r.pipelines[0].disposed, 0); assert.equal(r.liveNodes().length, 1);
});

test("cancelling a delayed adapter cannot overwrite the newly chosen mode with a stale failure", async t => {
  const gate = deferred(); const r = rig(t, { gpu: { requestAdapter: () => gate.promise } });
  r.service.draw({}, {}); assert.equal(r.service.status.stage, "initializing");
  r.service.setPreference("webgl"); gate.reject(Error("old adapter failed")); await settle();
  assert.equal(r.service.status.stage, "disabled"); assert.equal(r.service.status.reason, null);
  assert.equal(r.service.status.requested, "webgl"); assert.equal(r.nodes.length, 0); assert.deepEqual(r.fallbacks, []);
});

test("cancelled factories drain before a new GPU graph and late errors cannot retire its successor", async t => {
  const factory = deferred(); let first = true, oldFailure; const r = rig(t);
  // A separate service shares only the test canvas and deterministic factory.
  r.service.dispose();
  const service = createVillageRenderer({ canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }), insertAdjacentElement: (_, n) => r.nodes.push(n) }, gpu: { requestAdapter: async () => ({}) },
    load: async () => ({ createVillageWebGpuPipeline: async ({ onFailure }) => { if (first) { first = false; oldFailure = onFailure; return factory.promise; } return r.makePipeline(); } }) });
  t.after(() => service.dispose()); service.draw({}, {}); await settle();
  assert.equal(r.liveNodes().length, 1); service.setPreference("webgl"); service.setPreference("auto");
  service.draw({}, {}); await settle(); assert.equal(r.liveNodes().length, 0, "a stale creation cannot overlap a new post graph");
  const old = r.makePipeline(); factory.resolve(old); await settle(); assert.equal(old.disposed, 1);
  await ready(service); const latest = r.pipelines.at(-1);
  oldFailure(Error("late device loss")); assert.equal(service.status.stage, "ready"); assert.equal(latest.disposed, 0);
  assert.equal(old.disposed, 1); assert.equal(r.liveNodes().length, 1); assert.equal(service.draw({}, {}), true);
});

test("cancelling during the first frame never reveals it or disposes its resources twice", async t => {
  const first = deferred(); const r = rig(t); r.service.dispose(); let count = 0;
  const service = createVillageRenderer({ canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 300 }), insertAdjacentElement: (_, n) => r.nodes.push(n) }, gpu: { requestAdapter: async () => ({}) }, load: async () => ({ createVillageWebGpuPipeline: async () => { const p = r.makePipeline(); if (!count++) p.firstFrame = () => first.promise; return p; } }) });
  t.after(() => service.dispose()); service.draw({}, {}); await settle();
  service.setPreference("webgl"); assert.equal(r.pipelines[0].disposed, 1); assert.equal(r.liveNodes().length, 0);
  service.setPreference("webgpu"); first.reject(Error("cancelled depth target")); await settle();
  assert.equal(service.status.stage, "idle"); await ready(service);
  assert.equal(r.pipelines[0].disposed, 1); assert.equal(r.pipelines[1].disposed, 0); assert.equal(r.liveNodes().length, 1);
});

test("reapplying a failed preference never causes a per-frame retry storm", async t => {
  let requests = 0; const r = rig(t, { gpu: { requestAdapter: async () => { requests++; throw Error("unavailable"); } } });
  r.service.draw({}, {}); await settle();
  for (let i = 0; i < 30; i++) { r.service.setPreference("auto"); r.service.draw({}, {}); }
  await settle(); assert.equal(requests, 1); assert.equal(r.service.status.stage, "fallback");
  r.service.setPreference("webgpu"); r.service.draw({}, {}); await settle(); assert.equal(requests, 2);
  assert.equal(r.service.status.requested, "webgpu"); assert.equal(r.service.status.backend, "webgl");
});

test("dispose during a delayed factory removes its canvas immediately and retires the late device", async t => {
  const factory = deferred(); const r = rig(t, { load: async () => ({ createVillageWebGpuPipeline: () => factory.promise }) });
  r.service.draw({}, {}); await settle(); r.service.dispose();
  assert.equal(r.liveNodes().length, 0); assert.equal(r.service.status.stage, "disposed");
  const p = r.makePipeline(); factory.resolve(p); await settle();
  assert.equal(p.disposed, 1); assert.equal(r.service.setPreference("webgpu"), "auto"); assert.equal(r.service.draw({}, {}), false);
});
