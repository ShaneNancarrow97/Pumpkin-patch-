// Isolate resident prompt clearance on the saved, measured walking route.
// node tools/village-resident-proximity-perf.mjs --out /tmp/resident-proximity.json
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf(name); return at < 0 ? fallback : args[at + 1]; };
const input = path.resolve(option("--fixture", path.join(root, "docs/contractor-patches/village-clarity/verification/perf-final.json")));
const output = path.resolve(option("--out", path.join(os.tmpdir(), "village-resident-proximity-perf.json")));
const sha = value => createHash("sha256").update(value).digest("hex"), fixture = JSON.parse(await fs.readFile(input, "utf8"));
const sweepSignature = "export function residentSegmentFree(state, from, to, obstacles = villageWalkObstacles(state)) {";
const bundle = await esbuild.build({ stdin: { resolveDir: root, contents: `
  export {residentSpot,HOSTS as SURFACE_HOSTS} from './src/village-folk.js';
  export {INSIDES,DOOR_NORMAL} from './src/village-view.js';
  export * from './src/village-resident-interaction.js';
  export {createResidentRoutine,advanceResidentRoutine,residentTalkPoint,residentRoute} from './src/rules/village-resident-life.js';
  export {villageWalkObstacles} from './src/rules/village-navigation.js';
  export {FOLK_BY_ID,HOST_BY_ID} from './src/content/village-folk.js';
  export {RESIDENT_BY_ID} from './src/content/village.js';
  export {districtOpen} from './src/rules/village.js';` }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent", plugins: [{ name: "count-clearance", setup(build) {
    build.onLoad({ filter: /\/src\/rules\/village-resident-life\.js$/ }, async ({ path: file }) => {
      const source = await fs.readFile(file, "utf8");
      if (!source.includes(sweepSignature)) throw Error("Clearance counter signature changed");
      return { contents: source.replace(sweepSignature, sweepSignature + "\nglobalThis.__villageResidentPerf.sweeps++;"), loader: "js" };
    });
    build.onLoad({ filter: /\.(webp|png|mp3)$/ }, () => ({ contents: 'export default "headless-art"', loader: "js" }));
  } }] });
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "resident-proximity-perf-")), modulePath = path.join(temp, "resident.mjs");
await fs.writeFile(modulePath, bundle.outputFiles[0].text);
const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
globalThis.__villageResidentPerf = { sweeps: 0 };
Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => ({ getContext: () => ({}) }) } });
let api;
try { api = await import(pathToFileURL(modulePath)); } finally {
  oldDocument ? Object.defineProperty(globalThis, "document", oldDocument) : delete globalThis.document;
  await fs.rm(temp, { recursive: true, force: true });
}
const state = fixture.fixture, obstacles = api.villageWalkObstacles(state);
const ids = [...new Set([...Object.keys(state.village.friends), ...Object.keys(api.HOST_BY_ID)])].filter(id => api.FOLK_BY_ID[id] || api.HOST_BY_ID[id]);
const visible = new Set(["elowen", "rowan", "mabel", "tansy", "opal", "cinder", "corvus", "baron", "granny"].filter(id => api.districtOpen(state, id === "granny" ? "acre" : api.RESIDENT_BY_ID[id].district)).concat(Object.keys(api.SURFACE_HOSTS)));
const routines = Object.fromEntries(ids.map(id => [id, api.createResidentRoutine(state, id)])), samples = [];
for (const pass of fixture.passes) for (const row of pass.rows) for (let step = 0; step < fixture.contract.simulation.stepsPerDraw; step++) {
  const poses = Object.fromEntries(ids.map(id => {
    const routine = routines[id]; if (routine) api.advanceResidentRoutine(state, routine, .1, { obstacles });
    return [id, { ...(routine ?? api.residentSpot(state, id)) }];
  }));
  samples.push({ kind: "route", state, obstacles, position: row.position, poses });
}
const routeSamples = samples.length, poses = samples[0].poses;
for (const id of visible) {
  const point = api.residentTalkPoint(state, poses[id], obstacles);
  for (const distance of [3 - 1e-7, 3, 3 + 5e-7, 3 + 2e-6]) samples.push({ kind: "near-boundary", state, obstacles, poses, position: { x: point.x + distance, z: point.z } });
}
const counterState = structuredClone(state); if (!counterState.village.unlocks.includes("stall")) counterState.village.unlocks.push("stall");
const counterObstacles = api.villageWalkObstacles(counterState), counterPoses = { ...poses, rowan: { ...api.residentRoute(counterState, "rowan").stops[0] } };
const counter = api.residentTalkPoint(counterState, counterPoses.rowan, counterObstacles);
for (const distance of [3 - 1e-7, 3, 3 + 5e-7, 3 + 2e-6]) samples.push({ kind: "counter-boundary", state: counterState, obstacles: counterObstacles, poses: counterPoses, position: { x: counter.x - distance, z: counter.z } });

let current, talkCalls = 0, talkMilliseconds = 0;
const view = { inside: null, activeExpansionArea: null, expansionTargets: [], groundAt: () => 0, folk: {
  people: new Map(ids.map(id => [id, { root: { visible: visible.has(id) } }])), spotOf: id => current.poses[id],
  talkSpot: id => { talkCalls++; const start = performance.now(); const point = api.residentTalkPoint(current.state, current.poses[id], current.obstacles); talkMilliseconds += performance.now() - start; return point; },
} };
function run(resolve) {
  talkCalls = talkMilliseconds = globalThis.__villageResidentPerf.sweeps = 0;
  const digest = createHash("sha256"), nearbyByKind = {}, start = performance.now();
  for (current of samples) for (const id of ids) {
    const resident = resolve({ id, state: current.state, view, position: current.position, insides: api.INSIDES, doorNormal: api.DOOR_NORMAL });
    if (resident?.nearby) { nearbyByKind[current.kind] = (nearbyByKind[current.kind] ?? 0) + 1; digest.update(JSON.stringify(resident)); }
  }
  return { milliseconds: performance.now() - start, talkCalls, sweepCalls: globalThis.__villageResidentPerf.sweeps, talkMilliseconds, nearbyByKind, nearbySha256: digest.digest("hex") };
}
const full = api.resolveVillageResidentInteraction, nearby = api.resolveNearbyVillageResidentInteraction;
run(full); run(nearby);
const baseline = [], optimized = [];
for (let trial = 0; trial < 5; trial++) { baseline.push(run(full)); optimized.push(run(nearby)); }
const parity = [...baseline, ...optimized].every(trial => trial.nearbySha256 === baseline[0].nearbySha256);
const report = { schema: 1, createdAt: new Date().toISOString(), fixture: path.relative(root, input), fixtureSha256: fixture.fixtureSha256, harnessSha256: sha(await fs.readFile(fileURLToPath(import.meta.url))), nodeVersion: process.version,
  routeSamples, extraBoundarySamples: samples.length - routeSamples, residentIds: ids, renderedIds: [...visible], obstacleCount: obstacles.length,
  method: "Pure Node live resident resolver workload: exact saved fixture and captured owner positions from both measured route passes, with 18 transient 0.1-second resident routine steps per row. Adds ordinary and actual Rowan counter boundary samples. Uses real residentSpot, hall plans, gates, obstacles and residentTalkPoint. Counts swept clearances through a test-bundle-only increment. One warmup per path, five interleaved full/nearby trials; identical immutable samples. talkMilliseconds includes actual talkSpot clearance work. Excludes controller, scene and rendering costs; these timings do not measure normal game CPU, hardware FPS or whole-game speedup.",
  parity, baseline, optimized };
await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
delete globalThis.__villageResidentPerf;
console.log(JSON.stringify({ output, parity, routeSamples, extraBoundarySamples: report.extraBoundarySamples, baseline, optimized }, null, 2));
if (!parity) process.exitCode = 1;
