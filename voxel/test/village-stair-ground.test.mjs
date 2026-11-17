import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHash } from "node:crypto";
import * as M from "../src/model.js";
import { PLAN_SCALE as K } from "../src/content/village.js";
import { RAMPS, groundHeight } from "../src/village-terrain.js";
import { GROUND_SPREAD, buildGroundGeometry, buildTerrainWorks, spreadVillage } from "../src/village-world.js";
import { spreadRect } from "../src/rules/village-spread.js";
import { moveVillageWalker, villageCellFree } from "../src/rules/village-navigation.js";
import { createVillageContactSurfaceIndex, createVillageContactShadows } from "../src/village-contact-shadows.js";

const stairs = RAMPS.filter(r => !r.bridge && r.id !== "moor-ramp").map(r => ({ ...r, ...spreadRect(r) }));
// Independent positive-area triangle/rectangle test using separating axes.
// A touching cut edge is allowed; a triangle may not enter an exposed tread.
function overlapsTread(points, rect) {
  const cx = (rect.x0 + rect.x1) / 2, cz = (rect.z0 + rect.z1) / 2, hx = (rect.x1 - rect.x0) / 2, hz = (rect.z1 - rect.z0) / 2;
  const axes = [[1, 0], [0, 1]];
  for (let j = 0; j < 3; j++) { const a = points[j], b = points[(j + 1) % 3]; axes.push([a.z - b.z, b.x - a.x]); }
  for (const [ax, az] of axes) {
    const values = points.map(p => p.x * ax + p.z * az), centre = cx * ax + cz * az, radius = hx * Math.abs(ax) + hz * Math.abs(az);
    if (Math.min(Math.max(...values), centre + radius) - Math.max(Math.min(...values), centre - radius) <= Math.hypot(ax, az) * 1e-6) return false;
  }
  return true;
}
const envelope = s => s.axis === "z" ? { x0: s.x0 + .05, x1: s.x1 - .05, z0: s.z0 - .01, z1: s.z1 + .01 } : { x0: s.x0 - .01, x1: s.x1 + .01, z0: s.z0 + .05, z1: s.z1 - .05 };

test("actual terrain triangles leave every stone tread clear, with preserved winding and exact bounded area", () => {
  const geo = buildGroundGeometry(), p = geo.attributes.position, index = geo.index, cuts = stairs.map(envelope); let area = 0;
  for (let i = 0; i < index.count; i += 3) {
    const points = [0, 1, 2].map(j => { const k = index.getX(i + j); return { x: p.getX(k), z: -p.getZ(k) }; });
    const [a, b, c] = points, twiceArea = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
    assert.ok(twiceArea > 0, "each surviving triangle remains non-degenerate and faces up"); area += twiceArea / 2;
    const x0 = Math.min(a.x, b.x, c.x), x1 = Math.max(a.x, b.x, c.x), z0 = Math.min(a.z, b.z, c.z), z1 = Math.max(a.z, b.z, c.z);
    for (const cut of cuts) if (x0 < cut.x1 && x1 > cut.x0 && z0 < cut.z1 && z1 > cut.z0) assert.equal(overlapsTread(points, cut), false, "no ground triangle crosses a physical tread envelope");
  }
  assert.ok(Math.abs(area - 97851.7760643964) < .003, "only the nine measured tread envelopes are removed");
  assert.equal(geo.userData.stairCutouts.count, 9); assert.equal(geo.index.array.constructor, Uint16Array);
  assert.ok(p.count <= 44800); assert.ok(index.count / 3 <= 87400, "clipping adds under0.25% triangles to the existing single ground mesh");
  geo.dispose();
});

test("cutting treads retains every original ground vertex, UV and smooth normal", () => {
  const geo = buildGroundGeometry(), count = geo.userData.stairCutouts.originalVertices, hash = createHash("sha256");
  for (const key of ["position", "uv", "normal"]) { const attribute = geo.getAttribute(key); hash.update(Buffer.from(attribute.array.buffer, 0, count * attribute.itemSize * 4)); }
  assert.equal(hash.digest("hex"), "249c6e3c31c5a5de5f7e6cb5042428f7bd5c122727fd25315fbbc34fbdbfd278");
  const g = GROUND_SPREAD, nx = Math.round((g.x1 - g.x0) / g.step), nz = Math.round((g.z1 - g.z0) / g.step);
  assert.equal(count, (nx + 1) * (nz + 1)); assert.equal(geo.attributes.position.getX(count - 1), 234.5); assert.equal(-geo.attributes.position.getZ(count - 1), 216.5);
  assert.equal(geo.attributes.uv.getX(count - 1), 1); assert.equal(geo.attributes.uv.getY(count - 1), 1); geo.dispose();
});

test("real Quarry treads are visible above the cut and their contact shadows sit on stone", () => {
  const groundGeo = buildGroundGeometry(), ground = new THREE.Mesh(groundGeo, new THREE.MeshBasicMaterial()), works = buildTerrainWorks({ gates: false });
  spreadVillage(works); ground.scale.setScalar(K); works.scale.setScalar(K); ground.updateMatrixWorld(true); works.updateMatrixWorld(true);
  const index = createVillageContactSurfaceIndex((x, z) => groundHeight(x / K, z / K) * K); index.replace("terrain-works", works);
  const contacts = createVillageContactShadows(), ray = new THREE.Raycaster(), origin = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
  for (const [x, z] of [[58, 103.001], [58, 103.2], [55.8, 103.541], [60.2, 104.2], [58, 107.99]]) {
    origin.set(x * K, 30, -z * K); ray.set(origin, down); const terrain = ray.intersectObject(ground), stone = ray.intersectObject(works, true)[0]?.point.y;
    assert.equal(terrain.length, 0, "the coarse earth is physically absent beneath the exposed stairs"); assert.ok(Number.isFinite(stone));
    const floor = index.heightAt(x * K, z * K); assert.ok(Math.abs(floor - stone) < 2e-5, "measured contact top agrees with independent real-model raycast");
    contacts.update([{ position: new THREE.Vector3(x * K, groundHeight(x, z) * K + .04, -z * K), groundY: floor }]);
    assert.equal(contacts.stats.count, 1); const matrix = new THREE.Matrix4(); contacts.group.children[0].getMatrixAt(0, matrix); assert.ok(matrix.elements[13] > stone);
  }
  index.dispose(); contacts.dispose(); groundGeo.dispose(); ground.material.dispose(); const materials = new Set(); works.traverse(mesh => { if (mesh.isInstancedMesh) { mesh.dispose(); materials.add(mesh.material); } }); for (const material of materials) material.dispose();
});

test("Quarry walking remains continuous both ways across each side and both stair landings", () => {
  const state = M.freshState(); state.earned = M.LEVELS.at(-1).at; state.progression.claimed = M.LEVELS.map(l => l.level); state.progression.homeLegacyThrough = 20; state.village.invited = true;
  state.village.quests.invitation = { done: true }; state.village.quests["two-doorbells"] = { done: true }; state.village.expansion.effects = M.EXPANSION_CHAPTERS.flatMap(c => [c.id, ...(c.reward?.effects ?? [])]);
  const ramp = stairs.find(s => s.id === "quarry-stairs");
  for (const x of [ramp.x0 + .8, (ramp.x0 + ramp.x1) / 2, ramp.x1 - .8]) {
    const start = { x: x * K, z: (ramp.z0 - .3) * K }, end = { x: x * K, z: (ramp.z1 + .3) * K };
    assert.equal(villageCellFree(state, start.x, start.z), true); assert.equal(villageCellFree(state, end.x, end.z), true);
    const up = moveVillageWalker(state, start, 0, end.z - start.z), down = moveVillageWalker(state, up, 0, start.z - up.z);
    assert.ok(Math.hypot(up.x - end.x, up.z - end.z) < 1e-7); assert.ok(Math.hypot(down.x - start.x, down.z - start.z) < 1e-7);
    let prior = groundHeight(x, ramp.z0 - .3);
    for (let z = ramp.z0 - .29; z <= ramp.z1 + .3; z += .01) { const y = groundHeight(x, z); assert.ok(Number.isFinite(y)); assert.ok(Math.abs(y - prior) <= .010001, "logical walking slope stays continuous at steps and landings"); prior = y; }
  }
});
