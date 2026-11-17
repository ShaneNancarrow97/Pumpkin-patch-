import test from "node:test";
import assert from "node:assert/strict";
import { VILLAGE_NEIGHBOURHOODS, inVillageNeighbourhood } from "../src/content/village-neighbourhoods.js";

// The scan the grass used before its cells, kept here as the reference.
const onPath = (x, z, path) => path.points.slice(1).some(([bx, bz], i) => {
  const [ax, az] = path.points[i], dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t) < path.width / 2 + .32;
});
const reference = (x, z, clusters = VILLAGE_NEIGHBOURHOODS) => clusters.some(c => (c.paths ?? []).some(p => onPath(x, z, p))
  || ((['garden', 'pergola', 'reading', 'workyard'].includes(c.kind) || c.soil) && Math.abs(x - c.x) < c.w / 2 + .18 && Math.abs(z - c.z) < c.d / 2 + .18)
  || c.solids.some(b => b.r !== undefined ? Math.hypot(x - b.x, z - b.z) < b.r + .12 : x > b.x0 - .08 && x < b.x1 + .08 && z > b.z0 - .08 && z < b.z1 + .08));

test("the grass's neighbourhood cells answer exactly as the full scan, everywhere", () => {
  let inside = 0, checked = 0;
  for (let x = -160; x <= 250; x += .37) for (let z = -50; z <= 230; z += .41) {
    const a = inVillageNeighbourhood(x, z), b = reference(x, z); checked++; if (b) inside++;
    if (a !== b) assert.fail(`${x.toFixed(2)},${z.toFixed(2)}: cells say ${a}, the scan ${b}`);
  }
  assert.ok(inside > 1000 && checked > 700000, `${inside} of ${checked} points are tended ground`);
  for (const bad of [NaN, Infinity, -Infinity]) assert.equal(inVillageNeighbourhood(bad, 3), reference(bad, 3));
  const loose = VILLAGE_NEIGHBOURHOODS.slice(0, 3);
  for (let x = 0; x < 120; x += 1.3) for (let z = -10; z < 60; z += 1.7) assert.equal(inVillageNeighbourhood(x, z, loose), reference(x, z, loose), "an unfrozen list is scanned as before");
});

test("and much faster for a lawn's worth of tufts", () => {
  const time = fn => { const t = performance.now(); let n = 0; for (let x = -120; x < 220; x += .9) for (let z = -40; z < 210; z += .9) if (fn(x, z)) n++; return [performance.now() - t, n]; };
  time(inVillageNeighbourhood); time(reference);
  const [fast, a] = time(inVillageNeighbourhood), [slow, b] = time(reference);
  assert.equal(a, b);
  assert.ok(fast * 3 < slow, `cells ${fast.toFixed(1)} ms against the scan's ${slow.toFixed(1)} ms`);
});
