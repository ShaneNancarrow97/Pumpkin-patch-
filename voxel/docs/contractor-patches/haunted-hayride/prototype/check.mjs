import assert from "node:assert/strict";
import { convoyGeometry, CONVOY } from "./convoy.js";
const parts = convoyGeometry(), names = new Set();
let boxes = 0, glowing = 0;
for (const p of parts) {
  assert(!names.has(p.name), "unique part name"); if (p.parent) assert(names.has(p.parent), "parent created before child"); names.add(p.name);
  assert(p.origin.length === 3 && p.origin.every(Number.isFinite));
  for (const b of p.boxes) { assert(b.slice(0, 7).every(Number.isFinite), p.name); assert(b.slice(3, 6).every(v => v > 0), p.name); boxes++; if (b[7]) glowing++; }
}
assert.equal(parts.filter(p => p.radius).length, 8); assert.equal(CONVOY.seats.length, 4);
assert(Math.abs(CONVOY.tractorRearHitch[2] - CONVOY.straightWagonOffset - CONVOY.wagonFrontHitch[2]) < 1e-8);
const byName = new Map(parts.map(p => [p.name, p]));
const assembled = (body, gateOpen) => {
  const bounds = { x: [Infinity, -Infinity], y: [Infinity, -Infinity], z: [Infinity, -Infinity] };
  for (const p of parts) {
    let node = p, belongs = false, origin = [0, 0, 0];
    while (node) { if (node.name === body) { belongs = true; break; } origin = origin.map((v, i) => v + node.origin[i]); node = byName.get(node.parent); }
    if (!belongs) continue;
    for (const b of p.boxes) for (const dx of [0, b[3]]) for (const dy of [0, b[4]]) for (const dz of [0, b[5]]) {
      let [x, y, z] = [b[0] + dx, b[1] + dy, b[2] + dz];
      if (gateOpen && p.name === "rear-gate") [x, z] = [-z, x];
      [x, y, z].forEach((v, i) => { const key = ["x", "y", "z"][i], value = v + origin[i]; bounds[key][0] = Math.min(bounds[key][0], value); bounds[key][1] = Math.max(bounds[key][1], value); });
    }
  }
  return bounds;
};
const bounds = { tractor: assembled("tractor-body", false), wagon: assembled("wagon-body", true) };
for (const key of ["tractor", "wagon"]) for (const axis of ["x", "y", "z"]) {
  const envelope = CONVOY[`${key}Envelope`][axis];
  assert(bounds[key][axis][0] >= envelope[0] - 1e-8, `${key} ${axis} minimum`);
  assert(bounds[key][axis][1] <= envelope[1] + 1e-8, `${key} ${axis} maximum`);
}
console.log(JSON.stringify({ status: "pass", parts: parts.length, boxes, glowing, wheels: 8, seats: 4, assembledBounds: bounds }));
