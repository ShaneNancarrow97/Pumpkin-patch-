import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import * as M from "../src/model.js";
import { createWilds, wildsFootprint, wildsRoads, WILDS, REACH_BACK, CROWN } from "../src/wilds.js";
import { HAYRIDE_SITE } from "../src/content/hayride-layout.js";

const inside = (rects, x, z) => rects.some((r) => x > r.x0 + 1e-6 && x < r.x1 - 1e-6 && z > r.z0 + 1e-6 && z < r.z1 - 1e-6);
function contents(wilds) {
  const tops = [], boxes = [], m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (const mesh of wilds.group.children) {
    if (mesh.isInstancedMesh) for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, m); m.decompose(p, q, s); boxes.push({ x: p.x, y: p.y, z: p.z, w: s.x, h: s.y, d: s.z }); }
    else {
      const pos = mesh.geometry.getAttribute("position"), nor = mesh.geometry.getAttribute("normal");
      for (let i = 0; i < pos.count; i += 4) if (nor.getY(i) === 1) tops.push({ x0: Math.min(pos.getX(i), pos.getX(i + 2)), x1: Math.max(pos.getX(i), pos.getX(i + 2)), z0: Math.min(pos.getZ(i), pos.getZ(i + 1)), z1: Math.max(pos.getZ(i), pos.getZ(i + 1)), y: pos.getY(i) });
    }
  }
  return { tops, boxes };
}

test("the wilds lie outside the farm, grow back when it grows, and stay within budget", () => {
  const s = M.freshState(), scene = new THREE.Scene(), wilds = createWilds(scene, s);
  for (const stage of ["fresh", "grown"]) {
    if (stage === "grown") { s.festival.meadow = true; s.hayride.purchased = true; s.upgrades.plots = 4; wilds.sync(); }
    const rects = wildsFootprint(s), { tops, boxes } = contents(wilds);
    assert.ok(tops.length > 3000 && boxes.length > 1500, stage);
    for (const t of tops) for (const x of [t.x0 + .25, t.x1 - .25]) assert.equal(inside(rects, x, (t.z0 + t.z1) / 2), false, `${stage}: ground at ${x},${t.z0}`);
    // Trees stand outside; their leaves may overhang the edge by a crown's reach.
    const core = rects.map((r) => ({ x0: r.x0 + CROWN, x1: r.x1 - CROWN, z0: r.z0 + CROWN, z1: r.z1 - CROWN }));
    for (const b of boxes) assert.equal(inside(core, b.x, b.z), false, `${stage}: a tree in the farm at ${b.x},${b.z}`);
    assert.ok(boxes.length < 15000 && wilds.diagnostics.chunks < 60, `${stage}: ${boxes.length} boxes in ${wilds.diagnostics.chunks} squares`);
  }
  // The station's ground replaced the trees that stood there before the hayride.
  const b = HAYRIDE_SITE.bounds, { boxes } = contents(wilds);
  assert.equal(boxes.some((q) => q.x > b.x0 && q.x < b.x1 && q.z > b.z0 && q.z < b.z1), false);
  const before = wilds.group.children.length; wilds.sync(); assert.equal(wilds.group.children.length, before, "nothing rebuilds while the farm stays the same");
});

test("nothing in the wilds hides the farm from its camera, and the roads run level into them", () => {
  const s = M.freshState(), scene = new THREE.Scene(); Object.assign(s, {}); s.festival.meadow = true; s.hayride.purchased = true; s.upgrades.plots = 4;
  const wilds = createWilds(scene, s), rects = wildsFootprint(s), { tops, boxes } = contents(wilds);
  // A thing standing h tall covers the ground h * REACH_BACK north of it on screen.
  for (const t of tops) if (t.y > 0) assert.equal(inside(rects, (t.x0 + t.x1) / 2, t.z0 - t.y * REACH_BACK + .01), false, `a hill at ${t.x0},${t.z0} hides the farm`);
  for (const q of boxes) assert.equal(inside(rects, q.x, q.z - q.d / 2 - (q.y + q.h / 2) * REACH_BACK), false, `a tree at ${q.x.toFixed(1)},${q.z.toFixed(1)} hides the farm`);
  for (const road of wildsRoads(s)) for (let k = 0; k < 30; k++) {
    const x = road.axis === "z" ? road.x : 60 + k, z = road.axis === "z" ? (road.from ?? -1) + (road.from === undefined ? k * .3 : 3 + k) : road.z;
    const at = tops.find((t) => x >= t.x0 && x <= t.x1 && z >= t.z0 && z <= t.z1);
    if (at) assert.equal(at.y, 0, `the road at ${x},${z} runs level`);
    assert.equal(boxes.some((q) => Math.abs(q.x - x) < 1 && Math.abs(q.z - z) < 1 && q.y < 3), false, `no tree stands in the road at ${x},${z}`);
  }
  // Everything fades into the night by the far edge of the fade.
  const far = wilds.uniforms.uHazeFade.value.y; assert.equal(far, WILDS.fade[1]);
  assert.deepEqual(wilds.uniforms.uHazeColour.value.getHex(), new THREE.Color(WILDS.haze).getHex());
});
