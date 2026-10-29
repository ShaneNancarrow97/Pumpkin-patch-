import * as THREE from "three";
import { Voxels, vary } from "./voxels.js";
import { gourd } from "./world.js";
import { shape, joint, createBrood } from "./hayride-spiders.js";

// The ride-along's roadside sets in detail: the scarecrow patch, the bride's
// manor, the spectral pursuit and the crashed prison bus. Each is built in its
// own frame (x along the lane, +z towards it, the ground at y 0) and returns its
// static voxels plus actors. Actors are jointed rigs drawn as one brood per set;
// each has animate(ctx), called every frame of the ride with
// { time, near, wave, ramp, on, camera, forward, set }: ramp rises from 0 to 1 as
// the wagon reaches the set and falls as it leaves; on means the haunt is bought,
// switched on and gentle mode is off. Everything stays clear of the lane: the set's
// distance from it minus the wagon's corridor (z stays below about 1.6 for a set
// 4.1 from the lane, 3.0 for the bus and 3.6 for the manor).

const block = (v, x, y, z, w, h, d, c, glow = false) => v.block(x, y, z, w, h, d, c, glow);
const pick = (list, r) => list[Math.floor(r() * list.length)];
const STRAW = [0xc9a44f, 0xb88f3c, 0xd8b862], SOIL = [0x3a2a22, 0x33251e, 0x40302a], BARK = [0x3b2b26, 0x33251f, 0x45332b];
const FLAME = [0xffd36a, 0xffa13a, 0xff6a2a];

// A carved jack-o'-lantern head, face to +z, its eyes and grin glowing.
function jackHead(v, s, colour = 0xd8701e, glow = 0xffb24a) {
  gourd(v, 0, 0, 0, s, colour);
  const f = s * 0.5 + 0.004;
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) block(v, side * s * 0.18, s * (0.32 + k * 0.05), f, s * (0.2 - k * 0.06), s * 0.05, 0.02, glow, true);
  for (let k = -3; k <= 3; k++) block(v, k * s * 0.07, s * (0.16 + (Math.abs(k) === 3 ? 0.04 : k % 2 ? 0.02 : 0)), f, s * 0.06, s * (k % 2 ? 0.05 : 0.08), 0.02, glow, true);
  block(v, 0, s * 0.27, f, s * 0.06, s * 0.05, 0.02, glow, true);
}
// A battered witch's hat: brim, a cone of shrinking layers and a bent tip.
function hat(v, y, s, colour = 0x241a22, band = 0x5a2a3a) {
  block(v, 0, y, 0, s * 1.25, s * 0.06, s * 1.15, colour);
  for (let k = 0; k < 6; k++) block(v, (k > 3 ? (k - 3) * s * 0.07 : 0), y + s * 0.06 + k * s * 0.13, (k > 3 ? -(k - 3) * s * 0.05 : 0), s * (0.62 - k * 0.09), s * 0.14, s * (0.6 - k * 0.09), colour);
  block(v, 0, y + s * 0.06, 0, s * 0.64, s * 0.07, s * 0.62, band);
}

// ---- The scarecrow patch ----
function scarecrowBody(v, r, x, z, coat) {
  block(v, x, 0, z, 0.14, 2.05, 0.14, 0x5a3a26);
  block(v, x, 1.78, z, 1.7, 0.12, 0.12, 0x5a3a26);
  block(v, x, 1.05, z, 0.72, 0.82, 0.4, coat);
  for (let k = -3; k <= 3; k++) block(v, x + k * 0.1, 0.92 - (k % 2 ? 0.12 : 0.04) - r() * 0.08, z, 0.09, 0.16, 0.38, coat);         // a ragged hem
  block(v, x, 1.18, z + 0.01, 0.74, 0.07, 0.42, 0x6b5a32);                                                                         // a rope belt
  for (const side of [-1, 1]) {
    block(v, x + side * 0.55, 1.62, z, 0.46, 0.3, 0.32, coat);
    for (let k = 0; k < 4; k++) block(v, x + side * (0.86 + k * 0.03), 1.56 + (k - 1.5) * 0.06, z + (k - 1.5) * 0.04, 0.2, 0.04, 0.04, pick(STRAW, r));   // straw hands
    block(v, x + side * 0.13, 0.25, z, 0.2, 0.68, 0.24, 0x3d3a44);                                                               // trouser legs
    for (let k = 0; k < 3; k++) block(v, x + side * 0.13 + (k - 1) * 0.06, 0.12, z, 0.04, 0.16, 0.04, pick(STRAW, r));
  }
  block(v, x + 0.16, 1.3, z + 0.205, 0.16, 0.14, 0.02, 0x8a6a3a);                                                                 // a patch
  for (let k = 0; k < 5; k++) block(v, x - 0.18 + k * 0.09, 1.88, z + 0.05, 0.05, 0.12 + r() * 0.06, 0.05, pick(STRAW, r));      // straw at the collar
}
function crow(v, x, y, z, turn = 1) {
  block(v, x, y, z, 0.16, 0.13, 0.28, 0x121014); block(v, x, y + 0.1, z + turn * 0.12, 0.11, 0.1, 0.11, 0x121014);
  block(v, x, y + 0.13, z + turn * 0.2, 0.04, 0.03, 0.06, 0xc9a44f); block(v, x, y + 0.02, z - turn * 0.18, 0.1, 0.05, 0.12, 0x121014);
  block(v, x + 0.04, y + 0.15, z + turn * 0.17, 0.02, 0.02, 0.02, 0xff3a2a, true);
}
function scarecrowPatch(v, r) {
  const actors = [], brood = [];
  for (let x = -4; x < 4; x += 0.5) for (let z = -3.4; z < 1.2; z += 0.5) { const furrow = Math.floor((z + 3.4) / 0.5) % 2; v.box(x, -0.04, z, 0.5, furrow ? 0.12 : 0.07, 0.5, vary(pick(SOIL, r), 0.1, r)); }
  // Dry corn behind, rattling in two ragged rows.
  for (const zr of [-3.0, -3.55]) for (let x = -4.1; x < 4.1; x += 0.42 + r() * 0.1) {
    const h = 1.7 + r() * 0.9, lean = (r() - 0.5) * 0.2, broken = r() < 0.12;
    const zs = zr + (r() - 0.5) * 0.3;
    for (let k = 0; k < 9; k++) { const t = k / 9; if (broken && t > 0.55) break; block(v, x + lean * t + Math.sin(t * 3 + x) * 0.04, t * h, zs, 0.045, h / 9 + 0.01, 0.045, vary(t > 0.7 ? 0x7a6a44 : 0x5e5236, 0.12, r)); }
    for (let k = 0; k < 4; k++) { const y = 0.5 + k * 0.38 + r() * 0.2, side = k % 2 ? 1 : -1; for (let j = 0; j < 4; j++) block(v, x + side * (0.06 + j * 0.09), y - j * j * 0.03, zs + (r() - 0.5) * 0.06, 0.1, 0.025, 0.05, vary(j > 1 ? 0x6e603e : 0x857348, 0.14, r)); }
    if (!broken) for (let j = 0; j < 3; j++) block(v, x + lean + (j - 1) * 0.04, h + j * 0.04, zs, 0.03, 0.14, 0.03, 0x9a8a5a);
  }
  // A split-rail fence between the patch and the lane, one rail down.
  for (let x = -4; x <= 4; x += 1.4) { block(v, x, 0, 1.3, 0.14, 1.0, 0.14, vary(0x4a3424, 0.1, r)); if (x < 3.9) { const broken = Math.abs(x + 1.2) < 0.1; block(v, x + 0.7, 0.72, 1.3, 1.4, 0.08, 0.08, 0x5a3e2a); if (!broken) block(v, x + 0.7, 0.4, 1.3, 1.4, 0.08, 0.08, 0x5a3e2a); else for (let k = 0; k < 6; k++) block(v, x + 0.2 + k * 0.2, 0.4 - k * 0.07, 1.3, 0.21, 0.08, 0.08, 0x5a3e2a); } }
  crow(v, -2.6, 1.0, 1.3, 1); crow(v, 1.6, 1.0, 1.3, -1); crow(v, 0.9, 1.9, -0.65, 1);
  // Pumpkins among the vines; a few carved and lit.
  for (let i = 0; i < 12; i++) { const x = -3.6 + i * 0.66 + (r() - 0.5) * 0.3, z = 0.2 + (r() - 0.5) * 0.9, s = 0.32 + r() * 0.24; if (i % 4 === 1) { const h = new Voxels(); jackHead(h, s); h.solid.forEach((b) => v.solid.push([b[0] + x, b[1] + 0.03, b[2] + z, b[3], b[4], b[5], b[6]])); h.glow.forEach((b) => v.glow.push([b[0] + x, b[1] + 0.03, b[2] + z, b[3], b[4], b[5], b[6]])); } else gourd(v, x, 0.03, z, s, pick([0xc86a20, 0xd8701e, 0xe08a2e, 0x9d5520], r)); for (let k = 0; k < 4; k++) block(v, x + 0.3 + k * 0.12, 0.05, z + Math.sin(k + i) * 0.15, 0.13, 0.04, 0.05, 0x3f5a2a); }
  // A bonfire in a ring of stones at the back.
  const fx = 3.3, fz = -2.2;
  for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; block(v, fx + Math.cos(a) * 0.55, 0, fz + Math.sin(a) * 0.45, 0.24, 0.16, 0.2, vary(0x5a5260, 0.1, r)); }
  for (const a of [0.4, 1.6, 2.7]) for (let k = 0; k < 4; k++) block(v, fx + Math.cos(a) * (0.32 - k * 0.08), 0.06 + k * 0.08, fz + Math.sin(a) * (0.26 - k * 0.06), 0.12, 0.1, 0.12, 0x2e1f17);
  for (let k = 0; k < 9; k++) block(v, fx + (r() - 0.5) * 0.4, 0.05 + r() * 0.1, fz + (r() - 0.5) * 0.3, 0.07, 0.05, 0.07, pick([0xff4a1a, 0xff8a2a], r), true);
  for (let k = 0; k < 6; k++) block(v, fx + (r() - 0.5) * 0.25, 0.16 + k * 0.12, fz + (r() - 0.5) * 0.18, 0.16 - k * 0.022, 0.13, 0.12 - k * 0.016, FLAME[Math.min(2, Math.floor(k / 2))], true);
  for (const [dx, dz, t] of [[-3.6, -1.6, false], [-3.0, -2.3, true]]) { block(v, dx, 0.02, dz, t ? 0.62 : 1.05, 0.5, t ? 1.05 : 0.62, vary(0xc9a24a, 0.06, r)); block(v, dx, 0.52, dz, t ? 0.56 : 1.0, 0.04, t ? 1.0 : 0.56, vary(0xddbd68, 0.05, r)); }
  // Four scarecrows; their heads are the actors, watching the wagon go by.
  [[-2.5, -0.8, 0x5a3146, 0xd8701e], [-0.85, -1.0, 0x3f4a32, null], [0.85, -0.7, 0x6a3a26, 0xe08a2e], [2.35, -1.1, 0x3a3046, 0xc86a20]].forEach(([x, z, coat, pumpkin], i) => {
    scarecrowBody(v, r, x, z, coat);
    const h = new Voxels();
    if (pumpkin) { jackHead(h, 0.72, pumpkin); hat(h, 0.62, 0.62); }
    else { for (let k = 0; k < 5; k++) block(h, 0, k * 0.13, 0, 0.56 - Math.abs(k - 2) * 0.06, 0.14, 0.5 - Math.abs(k - 2) * 0.05, vary(0xb49a6a, 0.06, r));   // a stitched sack head
      for (const side of [-1, 1]) { block(h, side * 0.13, 0.36, 0.25, 0.1, 0.03, 0.02, 0x2a1a14); block(h, side * 0.13, 0.36, 0.25, 0.03, 0.1, 0.02, 0x2a1a14); block(h, side * 0.13, 0.37, 0.26, 0.04, 0.04, 0.01, 0xff3a2a, true); }
      for (let k = -2; k <= 2; k++) block(h, k * 0.06, 0.16, 0.25, 0.04, 0.03 + (k % 2 ? 0.04 : 0), 0.02, 0x2a1a14);
      block(h, 0, 0.62, 0, 0.3, 0.06, 0.3, 0x6b5a32); hat(h, 0.66, 0.5, 0x3a2e24, 0x7a3b22); }
    const head = h.build(); head.position.set(x, 1.9, z);
    const base = head.position.clone();
    actors.push({ id: "turning-scarecrows", object: head, base, animate({ time, near, ramp, on, camera, set }) {
      head.position.copy(base); head.rotation.set(0, 0, i === 1 ? 0.15 : 0);
      if (!on || !near) return;
      // Turn to face the rider, a little late, and tilt the head as if curious.
      const local = set.group.worldToLocal(camera.clone()), want = Math.atan2(local.x - base.x, local.z - base.z);
      head.rotation.y = THREE.MathUtils.clamp(want, -1.4, 1.4) * Math.min(1, ramp * 2);
      head.rotation.z = Math.sin(time * 0.8 + i) * 0.12 + (i === 1 ? 0.15 : 0);
      if (i === 2) head.position.y += Math.max(0, Math.sin(time * 3)) * 0.06 * ramp;                                               // one twitches
    } });
  });
  return { actors, brood };
}

// ---- The bride's manor ----
function arch(v, x, y, z, w, h, frame, glass, glow) {
  block(v, x, y - 0.08, z, w + 0.24, 0.1, 0.18, frame);
  for (const side of [-1, 1]) block(v, x + side * (w / 2 + 0.06), y, z, 0.12, h, 0.18, frame);
  for (let k = 0; k < 4; k++) block(v, x, y + h + k * 0.08, z, w + 0.24 - k * w * 0.26, 0.09, 0.18, frame);
  block(v, x, y, z + 0.02, w, h + 0.1, 0.08, glass, glow);
  block(v, x, y, z + 0.08, 0.05, h + 0.12, 0.05, frame); block(v, x, y + h * 0.55, z + 0.08, w, 0.05, 0.05, frame);
}
function manor(v, r) {
  const WALL = [0x3b3242, 0x433a4a, 0x362e3d], TRIM = 0xb9ab9a, ROOF = [0x241c26, 0x2b2230, 0x1f1822], STONE = [0x4f4855, 0x5a5260, 0x46404c];
  for (let x = -3.6; x < 3.6; x += 0.45) for (let y = 0; y < 0.5; y += 0.25) v.box(x, y, -1.6, 0.45, 0.25, 2.4, vary(pick(STONE, r), 0.08, r));
  for (let x = -3.2; x < 3.2; x += 0.2) v.box(x, 0.5, -1.4, 0.2, 4.6, 0.25, vary(pick(WALL, r), 0.05, r));                          // board siding
  for (const y of [0.5, 2.7, 5.0]) block(v, 0, y, -1.12, 6.6, 0.12, 0.08, TRIM);
  for (const x of [-3.25, 3.25]) block(v, x, 0.5, -1.27, 0.24, 4.6, 0.3, TRIM);
  // Windows: dim violet below, one candlelit above, and a shutter hanging loose.
  for (const x of [-2.1, 2.1]) arch(v, x, 1.0, -1.1, 0.9, 1.2, TRIM, 0x4a4280, true);
  for (const x of [-2.1, 0, 2.1]) arch(v, x, 3.15, -1.1, 0.75, 1.0, TRIM, x === 2.1 ? 0xffd08a : 0x2a2440, x === 2.1);
  block(v, -2.75, 1.05, -1.0, 0.36, 1.1, 0.06, 0x2a3a2e); for (let k = 0; k < 5; k++) block(v, -1.45 + k * 0.03, 1.7 - k * 0.22, -0.98 + k * 0.02, 0.36, 0.24, 0.06, 0x2a3a2e);
  // The door stands ajar, cold light in the gap.
  block(v, 0, 0.5, -1.12, 1.3, 2.0, 0.08, 0x1d1418); block(v, -0.32, 0.5, -1.06, 0.6, 1.95, 0.06, 0x3a2622); block(v, 0.18, 0.5, -1.1, 0.08, 1.95, 0.06, 0xa9bcff, true);
  block(v, 0, 2.55, -1.08, 1.5, 0.14, 0.14, TRIM);
  // A porch on four columns, and steps down to the path.
  for (const x of [-1.3, -0.55, 0.55, 1.3]) block(v, x, 0.5, 0.15, 0.16, 2.1, 0.16, TRIM);
  for (let k = 0; k < 4; k++) block(v, 0, 2.6 + k * 0.12, -0.45 + k * 0.03, 3.2 - k * 0.5, 0.13, 1.5 - k * 0.12, pick(ROOF, r));
  for (let k = 0; k < 3; k++) block(v, 0, 0.5 - (k + 1) * 0.16, 0.45 + k * 0.32, 1.9, 0.16, 0.36, vary(pick(STONE, r), 0.06, r));
  // A steep roof, a tower with a spire and a round window, and a crooked chimney.
  for (let k = 0; k < 12; k++) block(v, 0, 5.12 + k * 0.17, -0.3 - k * 0.02, 7.0 - k * 0.56, 0.18, 2.6 - k * 0.04, vary(pick(ROOF, r), 0.06, r));
  for (let y = 5.1; y < 6.9; y += 0.3) block(v, 2.5, y, -0.9, 1.5, 0.3, 1.5, vary(pick(WALL, r), 0.05, r));
  block(v, 2.5, 5.75, -0.13, 0.5, 0.5, 0.06, 0xa9bcff, true); block(v, 2.5, 5.7, -0.12, 0.6, 0.6, 0.04, TRIM);
  for (let k = 0; k < 9; k++) block(v, 2.5, 6.9 + k * 0.2, -0.9, 1.7 - k * 0.19, 0.21, 1.7 - k * 0.19, pick(ROOF, r));
  block(v, 2.5, 8.7, -0.9, 0.05, 0.5, 0.05, 0x1c1418); block(v, 2.5, 9.0, -0.9, 0.3, 0.05, 0.05, 0x1c1418);
  for (let y = 5.0; y < 7.6; y += 0.3) block(v, -2.3 + (y > 6.8 ? 0.1 : 0), y, -1.0, 0.55, 0.3, 0.55, vary(0x5a3a36, 0.1, r));
  // Iron railings with spear tips, a gate left open, dead roses and a bare tree.
  for (let x = -3.5; x <= 3.5; x += 0.25) { if (Math.abs(x) < 0.75) continue; block(v, x, 0, 2.7, 0.05, 1.15, 0.05, 0x17121a); block(v, x, 1.15, 2.7, 0.09, 0.1, 0.09, 0x17121a); }
  for (const y of [0.3, 1.0]) for (const s of [-1, 1]) block(v, s * 2.15, y, 2.7, 2.8, 0.05, 0.05, 0x17121a);
  for (const s of [-1, 1]) { block(v, s * 0.8, 0, 2.7, 0.14, 1.45, 0.14, 0x17121a); block(v, s * 0.8, 1.45, 2.7, 0.2, 0.2, 0.2, 0x2a2430); for (let k = 0; k < 6; k++) block(v, s * (1.0 + k * 0.05), 0.15 + k * 0.17, 2.85 + k * 0.1, 0.04, 0.17, 0.04, 0x17121a); }
  for (const x of [-3.0, 3.0]) for (let k = 0; k < 10; k++) { const a = r() * Math.PI * 2, len = 0.3 + r() * 0.5; for (let j = 0; j < 4; j++) block(v, x + Math.cos(a) * len * j / 4, 0.1 + j * 0.14 + r() * 0.1, 2.25 + Math.sin(a) * len * j / 4 * 0.6, 0.05, 0.05, 0.05, 0x2a1a1a); if (k % 3 === 0) block(v, x + Math.cos(a) * len, 0.62, 2.25 + Math.sin(a) * len * 0.6, 0.11, 0.1, 0.11, 0x8a1424); }
  let tx = -3.9, ty = 0; for (let k = 0; k < 14; k++) { block(v, tx, ty, 0.6, 0.32 - k * 0.012, 0.36, 0.32 - k * 0.012, pick(BARK, r)); ty += 0.34; tx += Math.sin(k * 0.7) * 0.06; }
  for (let b = 0; b < 4; b++) { let bx = tx, by = ty - b * 0.6, bz = 0.6; const a = b * 1.7 + 0.4; for (let k = 0; k < 6; k++) { bx += Math.cos(a) * 0.18; bz += Math.sin(a) * 0.1; by += 0.1; block(v, bx, by, bz, 0.1, 0.1, 0.1, 0x2e221d); } }
  // A graveyard cross and two headstones in the front yard.
  for (const [x, z, h] of [[-2.3, 1.7, 0.8], [2.2, 1.9, 0.65]]) { block(v, x, 0, z, 0.5, h, 0.14, vary(0x6e6878, 0.08, r)); block(v, x, h, z, 0.36, 0.12, 0.14, 0x77708a); }
  block(v, 1.5, 0, 1.4, 0.08, 1.0, 0.08, 0x3a2e28); block(v, 1.5, 0.7, 1.4, 0.45, 0.08, 0.08, 0x3a2e28);
}
// The groom: a skeleton in a tailcoat and top hat, lantern in hand. While the
// bride waits in the doorway he walks out through the gate to meet the wagon.
function groomActor(brood) {
  const root = new THREE.Object3D(), shapes = [], COAT = 0x1c1820, BONE = 0xd8cfbe, body = joint(root, 0, 0.92, 0);
  const legs = [-1, 1].map((s) => { const hip = joint(body, s * 0.13, 0, 0); shape(hip, shapes, 0, -0.44, 0, 0.18, 0.86, 0.2, COAT); shape(hip, shapes, 0, -0.9, 0.06, 0.2, 0.07, 0.32, 0x0e0c10); return hip; });
  shape(body, shapes, 0, 0.36, 0, 0.56, 0.74, 0.32, COAT); shape(body, shapes, 0, 0.42, 0.165, 0.2, 0.6, 0.01, 0xe8e2d8);           // the coat, a white shirt front
  shape(body, shapes, 0, 0.66, 0.17, 0.16, 0.06, 0.02, 0x8a1424);                                                                // a red bow tie
  for (const s of [-1, 1]) shape(body, shapes, s * 0.14, -0.08, -0.17, 0.16, 0.5, 0.06, COAT);                                     // tails
  shape(body, shapes, 0.18, 0.62, 0.17, 0.08, 0.1, 0.02, 0x6a1a2a);                                                              // a dead rose in the buttonhole
  const head = joint(body, 0, 0.78, 0); shape(head, shapes, 0, 0.18, 0, 0.3, 0.32, 0.3, BONE); shape(head, shapes, 0, 0.04, 0.04, 0.22, 0.08, 0.24, BONE);
  for (const s of [-1, 1]) { shape(head, shapes, s * 0.07, 0.2, 0.152, 0.08, 0.08, 0.01, 0x0e0a0c); shape(head, shapes, s * 0.07, 0.2, 0.156, 0.025, 0.025, 0.01, 0xb6ff6a, true); }
  for (let k = -2; k <= 2; k++) shape(head, shapes, k * 0.04, 0.05, 0.155, 0.025, 0.05, 0.01, 0x0e0a0c);
  shape(head, shapes, 0, 0.36, 0, 0.44, 0.04, 0.4, COAT); shape(head, shapes, 0, 0.52, 0, 0.28, 0.3, 0.26, COAT); shape(head, shapes, 0, 0.42, 0, 0.29, 0.05, 0.27, 0x6a1a2a);
  const arms = [-1, 1].map((s) => { const a = joint(body, s * 0.32, 0.64, 0); shape(a, shapes, 0, -0.3, 0, 0.13, 0.6, 0.13, COAT); shape(a, shapes, 0, -0.64, 0, 0.09, 0.1, 0.09, BONE); return a; });
  const lantern = joint(arms[1], 0, -0.72, 0.02); shape(lantern, shapes, 0, -0.06, 0, 0.03, 0.12, 0.03, 0x17121a); shape(lantern, shapes, 0, -0.22, 0, 0.18, 0.04, 0.18, 0x17121a); shape(lantern, shapes, 0, -0.34, 0, 0.14, 0.2, 0.14, 0xb6ff6a, true); shape(lantern, shapes, 0, -0.46, 0, 0.18, 0.04, 0.18, 0x17121a);
  brood.push({ root, shapes });
  return { root, body, head, arms, legs, lantern };
}

// ---- The spectral pursuit ----
// The wraith: a hooded head, burning eyes, a body that thins to a tail, and two
// long arms. When its haunt is on it leaves the clearing and races the wagon.
function wraithActor(brood) {
  const root = new THREE.Object3D(), shapes = [], body = joint(root), PURPLE = [0x7950a1, 0x6a4590, 0x8a5fb4];
  for (let k = 0; k < 8; k++) shape(body, shapes, Math.sin(k * 0.9) * 0.08, 0.2 + k * 0.26, -k * 0.05 + 0.2, 1.1 - Math.abs(k - 4) * 0.12, 0.28, 0.85 - Math.abs(k - 4) * 0.08, PURPLE[k % 3]);
  const tail = joint(body, 0, 0.2, 0.2); for (let k = 0; k < 6; k++) shape(tail, shapes, Math.sin(k) * 0.12, -k * 0.16, -k * 0.22, 0.6 - k * 0.09, 0.14, 0.4 - k * 0.05, PURPLE[k % 3]);
  const head = joint(body, 0, 2.3, 0.15);
  shape(head, shapes, 0, 0.25, 0, 0.7, 0.62, 0.66, 0x553478); shape(head, shapes, 0, 0.22, 0.2, 0.46, 0.44, 0.34, 0x1a0f24);           // the hood and the hollow inside it
  for (let k = 0; k < 3; k++) shape(head, shapes, 0, 0.6 + k * 0.12, -0.12 - k * 0.1, 0.5 - k * 0.15, 0.14, 0.5 - k * 0.14, 0x553478);   // its peak, falling back
  for (let k = 0; k < 7; k++) shape(body, shapes, -0.45 + k * 0.15, 0.02 - (k % 2) * 0.16, 0.25, 0.1, 0.22 + (k % 3) * 0.08, 0.5, 0x5a3a80);   // a tattered hem
  for (const s of [-1, 1]) shape(head, shapes, s * 0.11, 0.3, 0.38, 0.1, 0.08, 0.02, 0xe8b8ff, true);
  shape(head, shapes, 0, 0.12, 0.38, 0.2, 0.06, 0.02, 0xc070ff, true);
  const arms = [-1, 1].map((s) => { const shoulder = joint(body, s * 0.5, 1.95, 0.2); shape(shoulder, shapes, s * 0.35, 0, 0.12, 0.7, 0.16, 0.16, 0x6a4590); const elbow = joint(shoulder, s * 0.7, 0, 0.1); shape(elbow, shapes, s * 0.32, 0, 0.12, 0.64, 0.12, 0.12, 0x7950a1); for (let k = 0; k < 4; k++) shape(elbow, shapes, s * 0.66, 0, 0.1 + (k - 1.5) * 0.06, 0.24, 0.035, 0.035, 0xd8b8ff); return { shoulder, elbow, s }; });
  brood.push({ root, shapes });
  return { root, body, head, tail, arms };
}
function investigator(v, x, z, aim) {
  const SUIT = 0xa58f6a;
  for (const s of [-1, 1]) block(v, x + s * 0.12, 0, z, 0.2, 0.8, 0.24, SUIT);
  block(v, x, 0.8, z, 0.56, 0.7, 0.34, SUIT); block(v, x, 1.5, z, 0.36, 0.38, 0.34, 0xc9a07a); block(v, x, 1.85, z, 0.4, 0.1, 0.38, 0x2a2420);
  block(v, x, 0.75, z - 0.32, 0.5, 0.8, 0.3, 0x3a3a40); for (let k = 0; k < 3; k++) block(v, x - 0.12 + k * 0.12, 1.2, z - 0.48, 0.06, 0.06, 0.02, [0xff3a2a, 0xffc04a, 0x6aff7a][k], true);   // a pack with lights
  block(v, x + 0.3, 1.05, z + 0.1, 0.12, 0.12, 0.5, 0x2a2a30);
  const from = new THREE.Vector3(x + 0.3, 1.1, z + 0.4), n = 22;
  for (let i = 0; i <= n; i++) { const t = i / n, p = from.clone().lerp(aim, t); block(v, p.x + Math.sin(t * 19) * 0.08, p.y + Math.cos(t * 23) * 0.08, p.z, 0.07, 0.07, 0.07, i % 3 ? 0x7fc4ff : 0xd8f0ff, true); }
}
function pursuitClearing(v, r) {
  for (let i = 0; i < 6; i++) { const x = -3.4 + i * 1.3 + (r() - 0.5) * 0.3, z = -2.6 + (i % 2) * 0.7, h = 0.9 + r() * 0.5, tilt = (r() - 0.5) * 0.3; block(v, x, 0, z, 0.1, h, 0.1, 0x3a2e28); block(v, x + tilt, h * 0.7, z, 0.5, 0.09, 0.09, 0x3a2e28); }
  for (let y = 0; y < 2.8; y += 0.35) for (const s of [-1, 1]) block(v, -0.4 + s * 1.1, y, -2.9, 0.4, 0.35, 0.4, vary(0x5a5260, 0.1, r));   // a ruined archway
  for (let k = 0; k < 5; k++) block(v, -0.4 - 0.9 + k * 0.45, 2.8 + Math.sin(k / 4 * Math.PI) * 0.35, -2.9, 0.45, 0.3, 0.4, vary(0x5a5260, 0.1, r));
  for (let k = 0; k < 14; k++) block(v, (r() - 0.5) * 6, 0.01, -1.6 + r() * 2.6, 0.2 + r() * 0.3, 0.02, 0.2 + r() * 0.3, 0x6a3a8a, true);   // ectoplasm puddles
  const aim = new THREE.Vector3(1.4, 1.6, -0.2);
  investigator(v, -2.5, 0.9, aim); investigator(v, -0.9, 1.15, aim);
  block(v, 3.2, 0, 0.6, 1.1, 0.6, 0.7, 0x3a3a40); for (const s of [-1, 1]) block(v, 3.2 + s * 0.4, 0, 0.6, 0.25, 0.25, 0.75, 0x17121a);   // a toppled equipment cart
  for (let k = 0; k < 4; k++) block(v, 2.7 + k * 0.08, 0.6 + k * 0.05, 0.5, 0.1, 0.1, 0.1, [0xff3a2a, 0x6aff7a][k % 2], true);
}

// ---- The prison bus ----
function prisonBus(v, r) {
  const BODY = [0x8e8c84, 0x9a978e, 0x7f7d76, 0x86847c], RUST = [0x7a4a2a, 0x6a3a22], DARK = 0x221c22, slope = (x) => Math.max(0, x - 0.5) * -0.12;
  for (let x = -3.6; x < 3.6; x += 0.3) {
    const y0 = 0.55 + slope(x);
    v.box(x, y0, -1.3, 0.3, 0.26, 2.6, DARK);
    v.box(x, y0 + 0.26, -1.32, 0.3, 1.05, 2.64, vary(r() < 0.12 ? pick(RUST, r) : pick(BODY, r), 0.04, r));
    v.box(x, y0 + 0.6, 1.315, 0.3, 0.12, 0.02, Math.floor((x + 3.6) / 0.6) % 2 ? 0x111014 : 0xe0a02a);                               // hazard stripes
    v.box(x, y0 + 1.31, -1.3, 0.3, 0.95, 2.6, 0x4d3c28);
    v.box(x, y0 + 2.26, -1.25, 0.3, 0.16, 2.5, vary(pick(BODY, r), 0.04, r)); v.box(x, y0 + 2.42, -1.05, 0.3, 0.1, 2.1, vary(pick(BODY, r), 0.04, r));
  }
  // Barred windows down the lane side, with grasping arms between the bars.
  for (let i = 0; i < 7; i++) {
    const x = -3.15 + i * 0.9, y0 = 0.55 + slope(x) + 1.38;
    block(v, x, y0, 1.33, 0.72, 0.78, 0.04, 0x15131a);
    for (const dx of [-0.24, 0, 0.24]) block(v, x + dx, y0 - 0.02, 1.38, 0.045, 0.82, 0.045, 0x6a6470);
    if (i % 2 === 0) { const ax = x + (i % 4 ? 0.12 : -0.12); block(v, ax, y0 + 0.25, 1.62, 0.1, 0.1, 0.55, 0x6f7f62); for (let k = 0; k < 4; k++) block(v, ax + (k - 1.5) * 0.04, y0 + 0.25, 1.92, 0.03, 0.03 + (k % 2) * 0.02, 0.12, 0x6f7f62); }
    if (i % 3 === 1) for (const s of [-1, 1]) block(v, x + s * 0.08, y0 + 0.45, 1.35, 0.05, 0.04, 0.02, 0xd8ff6a, true);
  }
  // Wheels, one fallen off; a flickering beacon; one headlight still burning.
  for (const [x, z, lost] of [[-2.5, 1.35, false], [2.3, 1.35, true], [-2.5, -1.35, false], [2.3, -1.35, false]]) { const y = lost ? 0 : 0.05 + slope(x); block(v, x + (lost ? 0.9 : 0), y, z + (lost ? 0.5 : 0), 0.95, 0.95, 0.32, 0x141216); block(v, x + (lost ? 0.9 : 0), y + 0.32, z + (lost ? 0.5 : 0) + 0.17, 0.32, 0.32, 0.04, 0x8a8490); }
  block(v, 3.65, 0.65 + slope(3.6), 0.85, 0.06, 0.24, 0.3, 0xfff2b0, true); block(v, 3.65, 0.65 + slope(3.6), -0.85, 0.06, 0.24, 0.3, 0x2a2a2a);
  block(v, 0, 0.55 + 2.52, 0, 0.3, 0.22, 0.3, 0xff3a2a, true);
  // The nose in a tree, the door burst open with its chain snapped, glass everywhere.
  let ty = 0; for (let k = 0; k < 16; k++) { block(v, 4.25, ty, 0, 0.6 - k * 0.015, 0.4, 0.6 - k * 0.015, pick(BARK, r)); ty += 0.4; }
  for (let b = 0; b < 3; b++) { let bx = 4.25, by = 4 + b * 0.8, bz = 0; for (let k = 0; k < 7; k++) { bx += (b % 2 ? 0.16 : -0.2); bz += 0.08; by += 0.08; block(v, bx, by, bz, 0.12, 0.12, 0.12, 0x2e221d); } }
  block(v, 2.75, 0.55, 1.6, 0.06, 1.7, 0.7, 0x8a6a2a); for (let k = 0; k < 6; k++) block(v, 3.0, 1.3 - k * 0.1, 1.9 + k * 0.08, 0.07, 0.07, 0.07, 0x8a8490);
  for (let k = 0; k < 3; k++) block(v, 2.9, 0.4 - k * 0.15, 1.75 + k * 0.25, 0.7, 0.08, 0.25, 0x3a3440);
  for (let k = 0; k < 18; k++) block(v, (r() - 0.5) * 6.5, 0.02, 1.7 + r() * 1.0, 0.07, 0.02, 0.05, pick([0x9ab8d8, 0xc8e0f0, 0x6a8aa8], r));
}
// A zombie in a prison jumpsuit: it shambles with arms out and its head lolling.
function zombieActor(brood, r) {
  const root = new THREE.Object3D(), shapes = [], skin = pick([0x6f7f62, 0x7a8a6a, 0x5f7058], r), suit = 0xe8681e, hips = joint(root, 0, 0.82, 0);
  const legs = [-1, 1].map((s) => { const hip = joint(hips, s * 0.13, 0, 0); shape(hip, shapes, 0, -0.38, 0, 0.2, 0.78, 0.22, suit); shape(hip, shapes, 0, -0.79, 0.05, 0.22, 0.08, 0.3, 0x2a2420); return hip; });
  const torso = joint(hips, 0, 0, 0);
  shape(torso, shapes, 0, 0.35, 0, 0.56, 0.7, 0.32, suit); shape(torso, shapes, 0.12, 0.5, 0.165, 0.18, 0.1, 0.01, 0x111014);                // a number patch
  shape(torso, shapes, -0.15, 0.2, 0.165, 0.14, 0.14, 0.01, 0x7a2a22);
  const head = joint(torso, 0, 0.78, 0); shape(head, shapes, 0, 0.16, 0, 0.32, 0.34, 0.3, skin); shape(head, shapes, 0, 0.34, -0.02, 0.34, 0.06, 0.3, 0x2a2420);
  for (const s of [-1, 1]) shape(head, shapes, s * 0.08, 0.2, 0.155, 0.06, 0.04, 0.01, 0xd8ff6a, true);
  shape(head, shapes, 0, 0.06, 0.155, 0.14, 0.05, 0.01, 0x2a1414);
  const arms = [-1, 1].map((s) => { const sh = joint(torso, s * 0.34, 0.62, 0); sh.rotation.x = -1.35; shape(sh, shapes, 0, -0.3, 0, 0.14, 0.6, 0.14, suit); shape(sh, shapes, 0, -0.68, 0, 0.12, 0.2, 0.12, skin); return sh; });
  brood.push({ root, shapes });
  return { root, hips, torso, head, legs, arms };
}

// Builds a set by id into v (static voxels) and group (actors). Returns the
// actors and a brood to sync each frame (or null when the set has no rigs).
export function buildRoadsideSet(id, v, group, r) {
  const actors = [], rigs = [];
  if (id === "scarecrows") {
    const s = scarecrowPatch(v, r); for (const a of s.actors) { group.add(a.object); actors.push(a); }
  } else if (id === "bride") {
    manor(v, r);
    const g = groomActor(rigs), base = new THREE.Vector3(-0.6, 0.5, 0.3); g.root.position.copy(base); group.add(g.root);
    actors.push({ id: "bride-procession", object: g.root, base, animate({ time, ramp, on, near }) {
      const walk = on && near ? Math.min(1, ramp * 1.5) : 0, t = time * 2.4;
      // From the porch, down the steps and out through the open gate.
      g.root.position.set(base.x + walk * 0.6, base.y - Math.min(1, walk * 2) * 0.5, base.z + walk * 2.9);
      for (const [k, leg] of g.legs.entries()) leg.rotation.x = Math.sin(t + k * Math.PI) * 0.4 * (walk > 0 && walk < 1 ? 1 : walk * 0.2);
      g.body.position.y = 0.92 + Math.abs(Math.sin(t)) * 0.03 * walk; g.head.rotation.y = Math.sin(time * 0.6) * 0.5 * walk; g.head.rotation.z = Math.sin(time * 0.9) * 0.08;
      g.arms[1].rotation.x = -0.9 * walk - Math.sin(time * 1.5) * 0.06; g.arms[0].rotation.x = Math.sin(t) * 0.3 * walk; g.lantern.rotation.x = 0.9 * walk + Math.sin(time * 2) * 0.15;
    } });
  } else if (id === "pursuit") {
    pursuitClearing(v, r);
    const w = wraithActor(rigs), base = new THREE.Vector3(1.4, 0.3, -0.6); w.root.position.copy(base); group.add(w.root);
    const at = new THREE.Vector3(), seen = new THREE.Vector3();
    actors.push({ id: "spectral-burst", object: w.root, base, animate({ time, on, near, camera, forward, set }) {
      const hover = Math.sin(time * 1.4) * 0.15;
      for (const a of w.arms) { a.shoulder.rotation.z = a.s * (0.2 + Math.sin(time * 2 + a.s) * 0.15); a.elbow.rotation.z = a.s * 0.3; a.shoulder.rotation.y = 0; }
      w.tail.rotation.x = Math.sin(time * 3) * 0.25; w.tail.rotation.z = Math.sin(time * 2.3) * 0.2;
      if (!on || !near || !camera) { at.copy(base).setY(base.y + hover); w.root.position.lerp(at, 0.08); w.root.rotation.set(0, 0, 0); return; }
      // Race the wagon: out of the clearing to the wagon's side, swooping
      // ahead and falling back, arms reaching for the rail.
      const lateral = seen.set(forward.z, 0, -forward.x), side = Math.sign(set.group.position.clone().sub(camera).dot(lateral)) || 1;
      at.copy(camera).addScaledVector(lateral, side * 2.8).addScaledVector(forward, 3.2 + Math.sin(time * 0.9) * 1.4).setY(camera.y - 1.1 + Math.sin(time * 2.1) * 0.35);
      set.group.worldToLocal(at); w.root.position.lerp(at, 0.12);
      const look = set.group.worldToLocal(camera.clone()); w.root.rotation.set(0.15, Math.atan2(look.x - w.root.position.x, look.z - w.root.position.z), Math.sin(time * 1.7) * 0.15);
      for (const a of w.arms) { a.shoulder.rotation.y = -a.s * 0.9; a.shoulder.rotation.z = a.s * (0.1 + Math.sin(time * 6 + a.s) * 0.2); a.elbow.rotation.z = a.s * (0.1 + Math.sin(time * 7) * 0.15); }
    } });
  } else if (id === "bus") {
    prisonBus(v, r);
    [[2.4, 1.9, 0], [1.2, 1.6, 1.3], [3.3, 2.2, 2.6]].forEach(([x, z, phase], i) => {
      const zb = zombieActor(rigs, r), base = new THREE.Vector3(x, 0, z); zb.root.position.copy(base); zb.root.rotation.y = 0.3 - i * 0.3; group.add(zb.root);
      actors.push({ id: "bus-breakout", object: zb.root, base, animate({ time, on, near, ramp }) {
        const go = on && near ? Math.min(1, ramp * 1.7) : 0, t = time * 2.2 + phase;
        zb.root.position.set(base.x - go * 0.4 * (i - 1), 0, Math.min(2.95, base.z + go * (0.9 - i * 0.15)));
        for (const [k, leg] of zb.legs.entries()) leg.rotation.x = Math.sin(t + k * Math.PI) * 0.45 * go;
        zb.hips.position.y = 0.82 + Math.abs(Math.sin(t)) * 0.04 * go; zb.torso.rotation.z = Math.sin(t) * 0.12 * (go + 0.2); zb.torso.rotation.x = 0.15 + go * 0.1;
        zb.head.rotation.z = 0.35 + Math.sin(time * 1.3 + phase) * 0.2; zb.head.rotation.x = Math.sin(time * 0.9) * 0.15;
        for (const [k, arm] of zb.arms.entries()) { arm.rotation.x = -1.35 - Math.sin(t * 0.7 + k) * 0.2 * (go + 0.3); arm.rotation.z = (k ? -1 : 1) * 0.1; }
      } });
    });
  } else return null;
  return { actors, brood: rigs.length ? createBrood(rigs) : null };
}
