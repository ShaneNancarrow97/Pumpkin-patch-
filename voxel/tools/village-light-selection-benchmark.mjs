// CPU-only selection evidence using the shipped village lamp positions. This
// does not render a frame or measure a phone/TV frame rate.
import assert from "node:assert/strict";
import { LAMPS } from "../src/village-world.js";
import { TOWN_LAMPS } from "../src/content/village-town-square.js";
import { villageNeighbourhoodClusters } from "../src/content/village-neighbourhoods.js";
import { PLAN_SCALE as K } from "../src/content/village.js";
import { spread } from "../src/rules/village-spread.js";
import { createVillageLightSelection } from "../src/village-light-selection.js";

const lamps = [...LAMPS.map(l => { const [x, z] = spread(l.x, l.z); return { ...l, x, z }; }), ...TOWN_LAMPS,
  ...villageNeighbourhoodClusters().flatMap(c => (c.lanterns ?? []).map(l => ({ ...l, y: 2.25 })))];
const points = lamps.map(l => ({ x: l.x * K, y: (l.y - .2) * K, z: -l.z * K })), frames = 600;
const scenarios = {};
for (const moving of [false, true]) {
  const selection = createVillageLightSelection(), before = [], after = []; let beforeDistances = 0;
  for (let i = 0; i < frames; i++) {
    const t = { x: 87 + (moving ? Math.sin(i * .025) * 100 : 0), y: 2, z: -30 + (moving ? Math.cos(i * .018) * 60 : 0) };
    let start = performance.now();
    const previous = [...points].sort((a, b) => { beforeDistances += 2; return Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z); }).slice(0, 8);
    before.push(performance.now() - start); start = performance.now();
    const current = selection.select(points, t, true); after.push(performance.now() - start);
    assert.deepEqual(current, previous);
  }
  const median = list => +list.sort((a, b) => a - b)[Math.floor(list.length / 2)].toFixed(4);
  scenarios[moving ? "moving" : "stationary"] = { frames, sameSelectionEveryFrame: true,
    before: { distanceCalculations: beforeDistances, medianMs: median(before) },
    after: { ...selection.stats, medianMs: median(after) } };
}
console.log(JSON.stringify({ scope: "Synthetic CPU lamp selection only, not GPU or device FPS", lampCount: points.length, poolSize: 8, scenarios }, null, 2));
