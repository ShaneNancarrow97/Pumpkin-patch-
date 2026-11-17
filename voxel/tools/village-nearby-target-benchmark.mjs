// Reproduce controller-only work counts; this is not a rendered FPS benchmark.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import * as M from '../src/model.js';
import { NODES } from '../src/content/village.js';
import { villageNodePosition, villageNodeCandidates } from '../src/content/village-node-sites.js';
import { nearbyVillageResourceTargets } from '../src/village-nearby-targets.js';
import { PROXIMITY_REACH, PROXIMITY_RING_LIMIT } from '../src/village-proximity.js';

const s = M.freshState(); s.village.invited = true; s.earned = M.LEVELS[19].at;
s.progression.claimed = M.LEVELS.map(l => l.level); s.progression.homeLegacyThrough = 20;
s.village.expansion.effects = [...new Set(M.EXPANSION_CHAPTERS.flatMap(c => [c.id, ...(c.reward?.effects ?? [])]))];
const positions = [{ x: 87, z: -16.5 }, { x: 130.8, z: 30 }, ...NODES.filter(n => n.district === 'green').slice(0, 20).map(n => villageNodePosition(s, n))];
const rounds = 6, report = { scope: 'Pure controller target selection using shipped nodes and existing nodeReady rules. Work counts and synthetic CPU timings only, not physical-device FPS.', nodes: NODES.length, authoredSites: NODES.flatMap(villageNodeCandidates).length, positions: positions.length, rounds, cases: [] };
let readyChecks = 0, decorationBoundsChecks = 0, countBounds = false;
const ready = id => { readyChecks++; return M.nodeReady(s, id); };
const before = () => NODES.filter(n => ready(n.id)).map(n => ({ type: 'village-node', id: n.id, ...villageNodePosition(s, n) }));
const after = p => nearbyVillageResourceTargets(NODES, p, n => villageNodePosition(s, n), ready, PROXIMITY_REACH);
const ringIDs = (targets, p) => targets.map(t => ({ id: t.id, distance: Math.hypot(t.x - p.x, t.z - p.z) })).filter(t => t.distance < PROXIMITY_REACH).sort((a, b) => a.distance - b.distance).slice(0, PROXIMITY_RING_LIMIT).map(t => t.id);
for (const decorCount of [0, 120]) {
  s.village.decor.placed = Array.from({ length: decorCount }, (_, i) => ({ id: 'moth-lamp', instance: i + 1, get x() { if (countBounds) decorationBoundsChecks++; return 40 + i % 12 * 3; }, z: 40 + Math.floor(i / 12) * 3, rotation: 0 }));
  for (const p of positions) assert.deepEqual(ringIDs(after(p), p), ringIDs(before(p), p));
  const modes = [];
  for (const select of [before, after]) {
    const timings = []; readyChecks = decorationBoundsChecks = 0; let targetRecords = 0;
    for (let round = 0; round < rounds; round++) {
      const start = performance.now();
      for (const p of positions) { const targets = select(p); targetRecords += targets.length; ringIDs(targets, p); }
      timings.push((performance.now() - start) / positions.length);
    }
    const measuredReadyChecks = readyChecks;
    countBounds = true;
    for (let round = 0; round < rounds; round++) for (const p of positions) select(p);
    countBounds = false;
    modes.push({ mode: select.name, nodeEligibilityChecks: measuredReadyChecks, decorationBoundsChecks, targetRecords, medianMillisecondsPerPosition: timings.slice(1).sort((a, b) => a - b)[2] });
  }
  report.cases.push({ decorations: decorCount, sameNearestRingIDs: true, modes });
}
console.log(JSON.stringify(report, null, 2));
