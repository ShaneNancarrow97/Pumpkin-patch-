import * as THREE from "three";
import { Voxels, vary } from "./voxels.js";
import { gourd } from "./world.js";
import { shape, joint, createBrood, orbWeb, silkLines, strand } from "./hayride-spiders.js";

// The ride-along's roadside sets in detail: the scarecrow patch, the bride's
// manor, the spectral pursuit, the crashed prison bus, and on the longer
// routes the forgotten graveyard and the crooked thicket. Each is built in its
// own frame (x along the lane, +z towards it, the ground at y 0) and returns its
// static voxels plus actors. Actors are jointed rigs drawn as one brood per set;
// each has animate(ctx), called every frame of the ride with
// { time, near, wave, ramp, on, camera, forward, set }: ramp rises from 0 to 1 as
// the wagon reaches the set and falls as it leaves; on means the haunt is bought,
// switched on and gentle mode is off. Everything stays clear of the lane: the set's
// distance from it minus the wagon's corridor (z stays below about 1.6 for a set
// 4.1 from the lane, 3.0 for the bus and 3.6 for the manor, 2.4 for the
// graveyard and 2.1 for the thicket). The wagon travels towards +x.

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


// ---- The forgotten graveyard ----
const GRAVE = [0x6e6878, 0x77708a, 0x635d6c, 0x5a5462], LICHEN = [0x5a6a4a, 0x6a7a52, 0x4a5a3e], EARTH = [0x3a2a22, 0x2f2219, 0x45332a], IRONS = 0x17121a;
// A grave at x, z: a sunken mound towards the lane and a stone at its head,
// leaning by lean (its upper courses step sideways), lichen low on its face.
function grave(v, r, x, z, kind, lean = 0) {
  const c = vary(pick(GRAVE, r), 0.06, r), h = 0.62 + r() * 0.36, w = 0.48 + r() * 0.12, face = z - 0.43;
  v.box(x - 0.32, -0.02, z - 0.38, 0.64, 0.1, 1.1, vary(pick(EARTH, r), 0.1, r));
  if (kind === "cross") { block(v, x, 0, z - 0.5, 0.12, h + 0.35, 0.12, c); block(v, x + lean * 0.3, h * 0.7, z - 0.5, 0.5, 0.11, 0.12, c); }
  else if (kind === "broken") { block(v, x, 0, z - 0.5, w, h * 0.45, 0.14, c); block(v, x + 0.35, 0, z - 0.1, w * 0.9, 0.12, h * 0.5, c); }
  else {
    for (let k = 0; k < 4; k++) block(v, x + lean * k * 0.04, k * h / 4, z - 0.5 - k * 0.012, w, h / 4 + 0.01, 0.14, c);
    const steps = kind === "peak" ? [0.7, 0.4, 0.15] : [0.82, 0.55];
    steps.forEach((f, k) => block(v, x + lean * (0.16 + k * 0.04), h + k * 0.07, z - 0.55, w * f, 0.07, 0.14, c));
    block(v, x + lean * 0.06, h * 0.45, face, w * 0.55, h * 0.3, 0.01, 0x3f3a46);                                                    // a worn inscription
  }
  for (let k = 0; k < 3; k++) block(v, x + (r() - 0.5) * w * 0.8, 0.02 + r() * h * 0.3, face - 0.005, 0.1 + r() * 0.08, 0.06 + r() * 0.1, 0.02, pick(LICHEN, r));
}
// A hand clawing up out of a grave: a forearm and a hand of jointed fingers.
function graveHand(brood, skin) {
  const root = new THREE.Object3D(), shapes = [], arm = joint(root, 0, -0.75, 0);
  shape(arm, shapes, 0, 0.3, 0, 0.13, 0.6, 0.13, skin); shape(arm, shapes, 0, 0.12, 0, 0.17, 0.2, 0.17, 0x3a3440);                    // a rotted sleeve
  const hand = joint(arm, 0, 0.62, 0); shape(hand, shapes, 0, 0.06, 0, 0.17, 0.14, 0.07, skin);
  const fingers = [-1.5, -0.5, 0.5, 1.5].map((k) => { const f = joint(hand, k * 0.04, 0.13, 0); shape(f, shapes, 0, 0.06, 0, 0.032, 0.12, 0.04, skin); const tip = joint(f, 0, 0.12, 0); shape(tip, shapes, 0, 0.04, 0, 0.028, 0.09, 0.035, skin); shape(tip, shapes, 0, 0.085, 0.012, 0.03, 0.02, 0.02, 0x1a1418); return { f, tip }; });
  const thumb = joint(hand, 0.1, 0.05, 0.02); shape(thumb, shapes, 0.03, 0.04, 0, 0.04, 0.1, 0.04, skin);
  brood.push({ root, shapes });
  return { root, arm, hand, fingers, thumb };
}
// The shade of the open grave: a pale, ragged figure with hollow eyes.
function shadeActor(brood) {
  const root = new THREE.Object3D(), shapes = [], body = joint(root), PALE = [0xb8c8bc, 0xa8b8ae, 0xc8d6cc];
  for (let k = 0; k < 7; k++) shape(body, shapes, Math.sin(k * 1.1) * 0.06, k * 0.26, 0, 0.62 - Math.abs(k - 3.5) * 0.05, 0.27, 0.42 - Math.abs(k - 4) * 0.03, PALE[k % 3]);
  for (let k = 0; k < 6; k++) shape(body, shapes, -0.3 + k * 0.12, -0.12 - (k % 2) * 0.12, 0.05, 0.09, 0.24, 0.36, 0x93a69a);           // a torn shroud
  const head = joint(body, 0, 1.9, 0.02); shape(head, shapes, 0, 0.18, 0, 0.36, 0.42, 0.34, 0xc8d6cc); shape(head, shapes, 0, 0.42, -0.04, 0.4, 0.12, 0.38, 0x8a9a90);
  for (const s of [-1, 1]) { shape(head, shapes, s * 0.085, 0.24, 0.172, 0.1, 0.12, 0.01, 0x0c0e10); shape(head, shapes, s * 0.085, 0.23, 0.176, 0.04, 0.04, 0.01, 0xb6ffd8, true); }
  const jaw = joint(head, 0, 0.08, 0.17); shape(jaw, shapes, 0, -0.03, 0, 0.14, 0.1, 0.01, 0x0c0e10);
  const arms = [-1, 1].map((s) => { const sh = joint(body, s * 0.34, 1.62, 0); shape(sh, shapes, 0, -0.28, 0.02, 0.13, 0.58, 0.13, PALE[1]); const el = joint(sh, 0, -0.56, 0); shape(el, shapes, 0, -0.24, 0, 0.11, 0.5, 0.11, PALE[2]); for (let k = 0; k < 3; k++) shape(el, shapes, (k - 1) * 0.035, -0.56, 0, 0.025, 0.14, 0.03, 0xd8e4dc); return { sh, el, s }; });
  brood.push({ root, shapes });
  return { root, body, head, jaw, arms };
}
// A weeping angel on a plinth: wings folded, hands over its face. Its head and
// hands are jointed: as the wagon passes they come down and it watches.
function angelActor(brood) {
  const root = new THREE.Object3D(), shapes = [], STONE = [0x8a8794, 0x7d7a88, 0x94919e], body = joint(root, 0, 0.62, 0);
  for (let k = 0; k < 6; k++) shape(body, shapes, 0, 0.13 + k * 0.24, 0, 0.62 - k * 0.05 + (k === 0 ? 0.12 : 0), 0.25, 0.44 - k * 0.02, STONE[k % 3]);   // the robe
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) shape(body, shapes, s * (0.26 + k * 0.05), 0.55 + k * 0.28, -0.3 - k * 0.03, 0.14, 0.42, 0.08, STONE[(k + 1) % 3]);   // folded wings
  const head = joint(body, 0, 1.52, 0.02); shape(head, shapes, 0, 0.15, 0, 0.28, 0.32, 0.28, STONE[2]); shape(head, shapes, 0, 0.3, -0.03, 0.3, 0.08, 0.3, STONE[1]);
  const eyes = [-1, 1].map((s) => shape(head, shapes, s * 0.065, 0.17, 0.142, 0.05, 0.02, 0.01, 0xff3a2a, true));
  const hands = [-1, 1].map((s) => { const sh = joint(body, s * 0.28, 1.38, 0.02); shape(sh, shapes, 0, -0.18, 0.04, 0.12, 0.42, 0.12, STONE[0]); const fore = joint(sh, 0, -0.38, 0.04); shape(fore, shapes, 0, -0.17, 0, 0.1, 0.36, 0.1, STONE[1]); shape(fore, shapes, 0, -0.38, 0, 0.12, 0.12, 0.06, STONE[2]); return { sh, fore, s }; });
  brood.push({ root, shapes });
  return { root, head, eyes, hands };
}
// The crypt door: iron on a hinge, and two eyes that open in the dark behind it.
function cryptDoor(brood) {
  const root = new THREE.Object3D(), shapes = [], hinge = joint(root, -0.45, 0, 0);
  shape(hinge, shapes, 0.44, 0.85, 0, 0.86, 1.7, 0.08, 0x2a2630); for (const y of [0.4, 1.3]) shape(hinge, shapes, 0.44, y, 0.05, 0.8, 0.06, 0.02, 0x4a4450);
  for (let k = 0; k < 3; k++) shape(hinge, shapes, 0.2 + k * 0.24, 1.0, 0.05, 0.05, 0.5, 0.02, 0x4a4450); shape(hinge, shapes, 0.8, 0.85, 0.06, 0.06, 0.12, 0.03, 0x8a7a50);
  const eyes = joint(root, 0.05, 1.32, -0.7); for (const s of [-1, 1]) shape(eyes, shapes, s * 0.1, 0, 0, 0.08, 0.05, 0.02, 0xb6ff6a, true);
  brood.push({ root, shapes });
  return { root, hinge, eyes };
}
function graveyard(v, r) {
  // Rough grass and bare earth, a crumbling wall behind, an iron fence in front.
  for (let x = -4.5; x < 4.5; x += 0.5) for (let z = -3.6; z < 2.0; z += 0.5) v.box(x, -0.03, z, 0.5, 0.07 + r() * 0.03, 0.5, vary(r() < 0.6 ? pick([0x2f3a26, 0x34402a, 0x2a3322], r) : pick(EARTH, r), 0.1, r));
  for (let x = -4.4; x < 4.4; x += 0.45) { if (r() < 0.12) continue; const h = 0.5 + r() * 0.5; for (let y = 0; y < h; y += 0.3) block(v, x + 0.22, y, -3.75, 0.44, Math.min(0.3, h - y), 0.36, vary(pick([0x4f4855, 0x5a5260, 0x46404c], r), 0.08, r)); if (r() < 0.3) block(v, x + 0.22, h, -3.6, 0.3, 0.2, 0.06, pick(LICHEN, r)); }
  for (let x = -4.3; x <= 4.3; x += 0.25) { if (x > -1.0 && x < 0.1) continue; block(v, x, 0, 2.0, 0.05, 1.0, 0.05, IRONS); block(v, x, 1.0, 2.0, 0.09, 0.09, 0.09, IRONS); }
  for (const y of [0.25, 0.85]) { block(v, -2.65, y, 2.0, 3.3, 0.05, 0.05, IRONS); block(v, 2.2, y, 2.0, 4.2, 0.05, 0.05, IRONS); }
  for (const x of [-1.1, 0.2]) { block(v, x, 0, 2.0, 0.14, 1.3, 0.14, IRONS); block(v, x, 1.3, 2.0, 0.2, 0.2, 0.2, 0x2a2430); }
  for (let k = 0; k < 6; k++) block(v, -0.95 - k * 0.02, 0.12 + k * 0.17, 1.85 - k * 0.12, 0.04, 0.16, 0.04, IRONS);                // the gate, swung in
  // The graves, in rough rows; candles on a few, and ravens.
  [[-3.6, -1.9, "round", 0.6], [-2.4, -2.1, "cross", 0], [-1.2, -1.8, "peak", -0.5], [0.2, -2.0, "round", 0.3], [-3.0, -0.3, "broken", 0], [-1.8, 0.1, "round", -0.7], [1.0, -0.6, "peak", 0.4], [3.6, -0.4, "round", 0.8], [3.9, 1.3, "cross", -0.3]].forEach(([x, z, kind, lean]) => grave(v, r, x, z, kind, lean));
  for (const [x, z] of [[-1.85, -0.55], [0.15, -2.45], [3.55, -0.85]]) { block(v, x, 0.08, z, 0.06, 0.16, 0.06, 0xe8e0c8); block(v, x, 0.24, z, 0.035, 0.06, 0.035, pick(FLAME, r), true); }
  for (const [x, z] of [[-2.9, 0.0], [1.3, 0.3], [-1.0, -1.4]]) for (let k = 0; k < 3; k++) block(v, x + (k - 1) * 0.09, 0.04, z, 0.05, 0.22 + k * 0.04, 0.05, 0x3a2420), block(v, x + (k - 1) * 0.09, 0.26 + k * 0.04, z, 0.09, 0.07, 0.09, 0x5a1a22);   // dead flowers
  crow(v, -2.4, 1.2, -2.1, 1); crow(v, 3.6, 0.95, -0.95, -1);
  // The open grave, to one side of the centre where the painted reaper
  // (hayride-scares.js) lunges: a pit, the spoil heaped by it, a shovel.
  v.box(1.55, 0.0, 0.3, 0.8, 0.06, 1.35, 0x0b080d);
  for (let k = 0; k < 4; k++) block(v, 2.75 + k * 0.05, 0, 0.95, 0.7 - k * 0.15, 0.18 + k * 0.1 - k * k * 0.03, 1.2 - k * 0.2, vary(pick(EARTH, r), 0.08, r));
  block(v, 2.87, 0.35, 0.85, 0.05, 1.0, 0.05, 0x5a3e2a); block(v, 2.87, 1.32, 0.85, 0.22, 0.05, 0.05, 0x5a3e2a); block(v, 2.87, 0.12, 0.85, 0.2, 0.28, 0.04, 0x6a6470);
  // The family crypt at the back: steps, two columns, a pediment and an urn.
  const MX = 2.6, MZ = -2.75, CRYPT = [0x8a8794, 0x7d7a88, 0x74717f, 0x6a6876];
  for (let x = MX - 1.4; x < MX + 1.4; x += 0.35) for (let z = MZ - 1.0; z < MZ + 1.05; z += 0.35) v.box(x, 0, z, 0.35, 0.22, 0.35, vary(pick(CRYPT, r), 0.05, r));
  for (let k = 0; k < 2; k++) block(v, MX, 0, MZ + 1.2 + k * 0.28, 2.0 - k * 0.3, 0.16 - k * 0.07, 0.3, vary(pick(CRYPT, r), 0.05, r));
  for (let y = 0.22; y < 2.4; y += 0.32) for (let x = MX - 1.2; x < MX + 1.2; x += 0.4) {
    const door = Math.abs(x + 0.2 - MX) < 0.5 && y < 1.95;
    if (!door) v.box(x, y, MZ + 0.55, 0.4, 0.32, 0.22, vary(pick(CRYPT, r), 0.06, r));
    v.box(x, y, MZ - 0.9, 0.4, 0.32, 0.22, vary(pick(CRYPT, r), 0.06, r));
  }
  for (const s of [-1, 1]) for (let y = 0.22; y < 2.4; y += 0.32) v.box(MX + s * 1.2 - (s > 0 ? 0.22 : 0), y, MZ - 0.9, 0.22, 0.32, 1.45, vary(pick(CRYPT, r), 0.06, r));
  v.box(MX - 0.5, 0.22, MZ - 0.68, 1.0, 1.73, 1.2, 0x0b0a0e); block(v, MX, 0.5, MZ - 0.45, 0.3, 0.3, 0.3, 0x6aff9a, true);              // the dark inside, and a cold glow
  for (const s of [-1, 1]) { block(v, MX + s * 0.85, 0.22, MZ + 0.95, 0.26, 2.15, 0.26, CRYPT[0]); block(v, MX + s * 0.85, 2.3, MZ + 0.95, 0.36, 0.1, 0.36, CRYPT[2]); }
  block(v, MX, 2.38, MZ + 0.3, 2.7, 0.2, 1.6, CRYPT[1]); block(v, MX, 2.15, MZ + 0.67, 1.1, 0.16, 0.02, 0x3f3a46);
  for (let k = 0; k < 5; k++) block(v, MX, 2.58 + k * 0.13, MZ + 0.55, 2.5 - k * 0.5, 0.14, 0.5, vary(CRYPT[k % 4], 0.04, r));
  block(v, MX, 3.23, MZ + 0.55, 0.22, 0.22, 0.22, CRYPT[2]); block(v, MX, 3.45, MZ + 0.55, 0.06, 0.4, 0.06, CRYPT[1]); block(v, MX, 3.62, MZ + 0.55, 0.26, 0.06, 0.06, CRYPT[1]);
  for (const s of [-1, 1]) { block(v, MX + s * 1.15, 2.58, MZ + 0.65, 0.2, 0.3, 0.2, CRYPT[3]); block(v, MX + s * 1.15, 2.88, MZ + 0.65, 0.12, 0.08, 0.12, CRYPT[2]); }   // urns
  for (let k = 0; k < 6; k++) block(v, MX - 1.2 + r() * 2.4, 0.22 + r() * 2.0, MZ + 0.67, 0.12 + r() * 0.2, 0.08 + r() * 0.2, 0.02, pick(LICHEN, r));
  // A bare tree over the wall, and the angel's plinth.
  let tx = -4.1, ty = 0; for (let k = 0; k < 12; k++) { block(v, tx, ty, -3.1, 0.3 - k * 0.012, 0.36, 0.3 - k * 0.012, pick(BARK, r)); ty += 0.34; tx += Math.sin(k * 0.8) * 0.07; }
  for (let b = 0; b < 4; b++) { let bx = tx, by = ty - b * 0.55, bz = -3.1; const a = b * 1.9 + 0.3; for (let k = 0; k < 6; k++) { bx += Math.cos(a) * 0.17; bz += Math.sin(a) * 0.1; by += 0.1; block(v, bx, by, bz, 0.1, 0.1, 0.1, 0x2e221d); } }
  for (let k = 0; k < 3; k++) block(v, -3.3, k * 0.2, -2.45, 0.8 - k * 0.08, 0.2, 0.8 - k * 0.08, vary(pick(CRYPT, r), 0.05, r));
}

// ---- The crooked thicket ----
const THORN = [0x2e2228, 0x3a2a2e, 0x281e24, 0x43303a], TWIG = [0x4a3a2e, 0x5a4636, 0x3e3026];
// A bramble cane from a towards b, wandering, with thorns along it.
function cane(v, r, a, b, thick = 0.14) {
  const n = Math.max(2, Math.ceil(a.distanceTo(b) / 0.13)), p = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const t = i / n; p.lerpVectors(a, b, t); p.x += Math.sin(t * 7 + a.x) * 0.12; p.z += Math.cos(t * 5 + a.z) * 0.1;
    const s = thick * (1 - t * 0.45); block(v, p.x, p.y, p.z, s, s, s, pick(THORN, r));
    if (i % 3 === 1) { const side = r() < 0.5 ? -1 : 1; block(v, p.x + side * s * 0.6, p.y + s * 0.3, p.z + (r() - 0.5) * s, 0.05, 0.035, 0.035, 0x8a7a6a); }
  }
}
// A thorn arch over the lane, from z0 on this side to z1 beyond it, as high as top.
function thornArch(v, r, x, z0, z1, top) {
  const mid = (z0 + z1) / 2, half = (z1 - z0) / 2, at = (z) => new THREE.Vector3(x + Math.sin(z) * 0.15, top * (1 - ((z - mid) / half) ** 2), z);
  for (let z = z0; z < z1 - 0.01; z += 0.5) cane(v, r, at(z), at(Math.min(z1, z + 0.5)), 0.2);
  for (let k = 0; k < 2; k++) { const dz = (k ? 0.18 : -0.15); for (let z = z0 + 0.6; z < z1 - 0.6; z += 0.9) cane(v, r, at(z).add(new THREE.Vector3(0.12, 0.1, dz)), at(z + 0.9).add(new THREE.Vector3(-0.1, 0.18, dz)), 0.1); }
  // Thin tendrils hanging from the arch, never low enough to touch the wagon.
  for (let z = z0 + 0.8; z < z1 - 0.8; z += 0.55 + r() * 0.4) { const p = at(z), len = Math.min(0.9, Math.max(0, p.y - 4.2)) * (0.5 + r() * 0.5); for (let k = 0; k < len / 0.1; k++) block(v, p.x + Math.sin(k) * 0.03, p.y - 0.1 - k * 0.1, p.z, 0.035, 0.1, 0.035, pick(THORN, r)); }
}
// A twig figure bound with twine, a tiny skull for a head, hung on a cord.
function twigFigure(brood, r) {
  const root = new THREE.Object3D(), shapes = [], spin = joint(root);
  shape(spin, shapes, 0, -0.35, 0, 0.012, 0.7, 0.012, 0x8a7a5a);
  const fig = joint(spin, 0, -0.7, 0);
  shape(fig, shapes, 0, -0.3, 0, 0.05, 0.6, 0.05, pick(TWIG, r)); shape(fig, shapes, 0, -0.12, 0, 0.42, 0.045, 0.045, pick(TWIG, r));
  for (const s of [-1, 1]) shape(fig, shapes, s * 0.1, -0.68, 0, 0.04, 0.36, 0.04, pick(TWIG, r));
  shape(fig, shapes, 0, -0.14, 0, 0.09, 0.09, 0.07, 0xa83a2a); shape(fig, shapes, 0, 0.06, 0, 0.13, 0.13, 0.12, 0xd6cbb4);
  for (const s of [-1, 1]) shape(fig, shapes, s * 0.03, 0.07, 0.062, 0.03, 0.03, 0.01, 0x140e10);
  brood.push({ root, shapes });
  return { root, spin, fig };
}
// A gibbet cage on a chain: bars, a floor, and a skeleton reaching through.
function cageActor(brood) {
  const root = new THREE.Object3D(), shapes = [], IRON = 0x2a2428, BONE = 0xd8cfbe, swing = joint(root);
  shape(swing, shapes, 0, -0.6, 0, 0.05, 1.2, 0.05, 0x4a4450);
  const cage = joint(swing, 0, -1.2, 0);
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; shape(cage, shapes, Math.cos(a) * 0.42, -0.75, Math.sin(a) * 0.42, 0.04, 1.4, 0.04, IRON); }
  for (const y of [-0.05, -0.75, -1.45]) for (const [w, d] of [[0.9, 0.05], [0.05, 0.9]]) shape(cage, shapes, 0, y, 0, w, 0.05, d, IRON);
  shape(cage, shapes, 0, -1.45, 0, 0.8, 0.05, 0.8, IRON); shape(cage, shapes, 0, 0.02, 0, 0.3, 0.1, 0.3, IRON);
  const body = joint(cage, 0, -1.4, -0.05);
  shape(body, shapes, 0, 0.1, 0, 0.36, 0.14, 0.2, BONE); for (let k = 0; k < 4; k++) shape(body, shapes, 0, 0.36 + k * 0.1, 0, 0.32 - k * 0.03, 0.035, 0.2, BONE); shape(body, shapes, 0, 0.5, -0.06, 0.05, 0.6, 0.05, BONE);
  for (const s of [-1, 1]) shape(body, shapes, s * 0.12, 0.06, 0.2, 0.06, 0.06, 0.4, BONE);
  const head = joint(body, 0, 0.86, 0); shape(head, shapes, 0, 0.12, 0, 0.24, 0.26, 0.24, BONE); for (const s of [-1, 1]) shape(head, shapes, s * 0.055, 0.14, 0.122, 0.07, 0.07, 0.01, 0x140e10); shape(head, shapes, 0, 0.03, 0.122, 0.12, 0.04, 0.01, 0x140e10);
  const reach = joint(body, 0.17, 0.78, 0.04); shape(reach, shapes, 0, -0.22, 0, 0.05, 0.44, 0.05, BONE); const fore = joint(reach, 0, -0.44, 0); shape(fore, shapes, 0, -0.2, 0, 0.045, 0.4, 0.045, BONE); for (let k = 0; k < 3; k++) shape(fore, shapes, (k - 1) * 0.025, -0.45, 0, 0.018, 0.1, 0.018, BONE);
  shape(body, shapes, -0.17, 0.5, 0.02, 0.05, 0.44, 0.05, BONE);
  brood.push({ root, shapes });
  return { root, swing, cage, head, reach, fore };
}
// A thorny tendril rising from the briar: a chain of jointed segments.
function tendril(brood, r, length = 8) {
  const root = new THREE.Object3D(), shapes = [], links = [];
  let parent = root;
  for (let k = 0; k < length; k++) {
    const link = joint(parent, 0, k ? 0.26 : 0, 0), s = 0.13 - k * 0.011;
    shape(link, shapes, 0, 0.13, 0, s, 0.28, s, pick(THORN, r));
    if (k % 2) shape(link, shapes, (k % 4 === 1 ? 1 : -1) * s * 0.8, 0.14, 0.02, 0.07, 0.03, 0.03, 0x8a7a6a);
    links.push(link); parent = link;
  }
  brood.push({ root, shapes });
  return { root, links };
}
// Pairs of eyes deep in the briar that blink and narrow as the wagon passes.
function briarEyes(brood, spots) {
  const root = new THREE.Object3D(), shapes = [], pairs = spots.map(([x, y, z, colour]) => { const p = joint(root, x, y, z); for (const s of [-1, 1]) shape(p, shapes, s * 0.07, 0, 0, 0.07, 0.05, 0.02, colour, true); return p; });
  brood.push({ root, shapes });
  return { root, pairs };
}
function thicket(v, r, group) {
  // Leaf litter and roots underfoot.
  for (let x = -4.5; x < 4.5; x += 0.5) for (let z = -4.0; z < 1.8; z += 0.5) v.box(x, -0.03, z, 0.5, 0.06 + r() * 0.03, 0.5, vary(pick([0x2a2220, 0x332822, 0x2d2a22, 0x3a2a26], r), 0.1, r));
  // Bramble banks: a wall at the back, banks along the sides, low briars in front.
  for (let k = 0; k < 34; k++) { const x = -4.4 + r() * 8.8, z = -3.8 + r() * 1.4; cane(v, r, new THREE.Vector3(x, 0, z), new THREE.Vector3(x + (r() - 0.5) * 2, 1.4 + r() * 2.2, z + (r() - 0.5) * 0.8), 0.16); }
  for (const sx of [-1, 1]) for (let k = 0; k < 10; k++) { const x = sx * (3.6 + r() * 0.8), z = -2.5 + r() * 3.6; cane(v, r, new THREE.Vector3(x, 0, z), new THREE.Vector3(x - sx * r() * 0.8, 1.0 + r() * 1.6, z + (r() - 0.5)), 0.14); }
  for (let k = 0; k < 14; k++) { const x = -3.8 + r() * 7.6, z = 0.6 + r() * 1.1; cane(v, r, new THREE.Vector3(x, 0, z), new THREE.Vector3(x + (r() - 0.5) * 1.2, 0.4 + r() * 0.5, z + (r() - 0.5) * 0.6), 0.1); }
  // Three thorn arches over the lane, so the wagon runs under the briar.
  for (const [x, top] of [[-2.8, 5.8], [0.2, 6.3], [3.0, 5.7]]) thornArch(v, r, x, 0.9, 8.1, top);
  // Bones and a skull caught in the briar, and a ring of stones with a totem.
  for (const [x, y, z] of [[-2.1, 0.9, -2.6], [1.7, 1.4, -2.9], [-0.6, 0.05, 0.9], [2.6, 0.05, 1.1]]) { block(v, x, y, z, 0.24, 0.22, 0.22, 0xd6cbb4); for (const s of [-1, 1]) block(v, x + s * 0.055, y + 0.1, z + 0.11, 0.06, 0.06, 0.01, 0x140e10); block(v, x + 0.3, y, z, 0.4, 0.05, 0.05, 0xc8bea6); }
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; block(v, -2.6 + Math.cos(a) * 0.5, 0, 0.1 + Math.sin(a) * 0.4, 0.2, 0.14, 0.18, vary(0x5a5260, 0.1, r)); }
  for (let k = 0; k < 9; k++) block(v, -2.6, k * 0.2, 0.1, 0.1, 0.2, 0.1, pick(TWIG, r));
  block(v, -2.6, 1.0, 0.1, 0.8, 0.07, 0.07, pick(TWIG, r)); block(v, -2.6, 1.85, 0.1, 0.32, 0.3, 0.28, 0xd6cbb4); for (const s of [-1, 1]) block(v, -2.6 + s * 0.07, 1.95, 0.25, 0.07, 0.07, 0.01, 0xff3a2a, true);
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) block(v, -2.6 + s * (0.18 + k * 0.08), 2.1 + k * 0.1, 0.1, 0.05, 0.12, 0.05, pick(TWIG, r));   // antlers
  // A web strung across a gap in the back wall, for the thicket's spider.
  const centre = new THREE.Vector3(0.6, 2.4, -2.3), silk = { position: [], colour: [] };
  orbWeb(silk, centre, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), 1.5, r, 0.12);
  for (const [dx, dy] of [[-1.6, 1.0], [1.7, 0.9], [-1.4, -1.3], [1.5, -1.2], [0.2, 1.7]]) strand(silk, centre.clone().add(new THREE.Vector3(dx * 0.85, dy * 0.85, 0)), centre.clone().add(new THREE.Vector3(dx * 1.25, dy * 1.25, 0.1)));
  for (const s of [-1, 1]) cane(v, r, new THREE.Vector3(0.6 + s * 1.9, 0, -2.4), new THREE.Vector3(0.6 + s * 1.7, 4.0, -2.3), 0.2);
  group.add(silkLines(silk));
  return centre;
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
  } else if (id === "graveyard") {
    graveyard(v, r);
    // Hands claw up out of three graves, one after another.
    [[-1.8, 0.75, 0], [-3.2, 1.2, 0.5], [3.7, 1.95, 1.1]].forEach(([x, z, delay], i) => {
      const h = graveHand(rigs, pick([0x7a8a6a, 0x8a9478, 0x6f7f62], r)), base = new THREE.Vector3(x, 0, z); h.root.position.copy(base); group.add(h.root);
      v.box(x - 0.22, -0.02, z - 0.2, 0.44, 0.12, 0.4, vary(pick(EARTH, r), 0.1, r));
      actors.push({ id: "route-graveyard", object: h.root, base, animate({ time, on, near, ramp }) {
        const up = on && near ? Math.max(0, Math.min(1, ramp * 1.8 - delay * 0.5)) : 0, claw = up * (0.5 + 0.5 * Math.sin(time * 5 + i * 2));
        h.arm.position.y = -0.75 + up * 0.62; h.arm.rotation.set(0.25 * up + Math.sin(time * 1.3 + i) * 0.12 * up, 0, Math.sin(time * 0.9 + i) * 0.18 * up);
        for (const [k, f] of h.fingers.entries()) { f.f.rotation.x = 0.2 + claw * 0.9 + Math.sin(time * 7 + k) * 0.06 * up; f.tip.rotation.x = 0.2 + claw * 1.1; }
        h.thumb.rotation.z = -0.4 + claw * 0.5;
      } });
    });
    // The shade rises from the open grave and reaches for the wagon.
    const sh = shadeActor(rigs), sbase = new THREE.Vector3(1.95, -2.4, 0.95); sh.root.position.copy(sbase); group.add(sh.root);
    actors.push({ id: "route-graveyard", object: sh.root, base: sbase, animate({ time, on, near, ramp, camera, set }) {
      const rise = on && near ? Math.min(1, ramp * 1.6) : 0;
      sh.root.position.set(sbase.x, sbase.y + rise * 2.55 + Math.sin(time * 1.2) * 0.08 * rise, sbase.z + rise * 0.35);
      sh.body.rotation.set(-0.12 * rise, 0, Math.sin(time * 0.8) * 0.08);
      for (const a of sh.arms) { a.sh.rotation.set(-1.25 * rise - Math.sin(time * 2 + a.s) * 0.12 * rise, 0, a.s * (0.15 + 0.25 * rise)); a.el.rotation.x = -0.3 * rise; }
      sh.jaw.position.y = 0.08 - 0.06 * rise * (0.6 + 0.4 * Math.sin(time * 9));
      if (camera && rise > 0) { const look = set.group.worldToLocal(camera.clone()); sh.root.rotation.y = THREE.MathUtils.clamp(Math.atan2(look.x - sh.root.position.x, look.z - sh.root.position.z), -1.2, 1.2) * rise; } else sh.root.rotation.y = 0;
    } });
    // The angel lowers its hands and turns to watch the wagon go.
    const an = angelActor(rigs), abase = new THREE.Vector3(-3.3, 0, -2.45); an.root.position.copy(abase); group.add(an.root);
    actors.push({ id: "route-graveyard", object: an.root, base: abase, animate({ on, near, ramp, camera, set, time }) {
      const turn = on && near ? Math.min(1, Math.max(0, ramp * 2 - 0.4)) : 0;
      for (const hnd of an.hands) { hnd.sh.rotation.set(-2.5 * (1 - turn) - 0.2 * turn, 0, hnd.s * (0.35 * (1 - turn) + 0.1)); hnd.fore.rotation.x = -1.4 * (1 - turn) - 0.2 * turn; }
      let yaw = 0; if (camera && turn > 0) { const look = set.group.worldToLocal(camera.clone()); yaw = THREE.MathUtils.clamp(Math.atan2(look.x - abase.x, look.z - abase.z), -1.1, 1.1) * turn; }
      an.head.rotation.set(0.5 * (1 - turn), yaw, Math.sin(time * 0.4) * 0.03 * turn);
      for (const e of an.eyes) e.scale.x = 0.05 * turn + 1e-4;
    } });
    // The crypt door swings open; something looks out.
    const cd = cryptDoor(rigs), cbase = new THREE.Vector3(2.6, 0.22, -2.07); cd.root.position.copy(cbase); group.add(cd.root);
    actors.push({ id: "route-graveyard", object: cd.root, base: cbase, animate({ on, near, ramp, time }) {
      const open = on && near ? Math.min(1, ramp * 1.4) : 0;
      cd.hinge.rotation.y = -1.25 * open + Math.sin(time * 1.7) * 0.04 * open;
      cd.eyes.scale.set(1, Math.max(1e-3, open * (Math.sin(time * 0.9) > 0.92 ? 0.1 : 1)), 1);
    } });
  } else if (id === "thicket") {
    const centre = thicket(v, r, group);
    const web = new THREE.Object3D(); web.position.copy(centre); group.add(web); actors.push({ id: "route-thicket", web });   // buildRideLand hangs the spider here
    // The gibbet cage hangs from the middle arch at the lane's edge and swings.
    const cg = cageActor(rigs), gbase = new THREE.Vector3(0.2, 5.75, 2.35); cg.root.position.copy(gbase); group.add(cg.root);
    actors.push({ id: "route-thicket", object: cg.root, base: gbase, animate({ time, on, near, ramp }) {
      const go = on ? 0.35 + (near ? ramp * 0.65 : 0) : 0.15;
      cg.swing.rotation.set(Math.sin(time * 1.3) * 0.16 * go, 0, Math.sin(time * 1.3 + 1.2) * 0.1 * go);
      cg.cage.rotation.y = Math.sin(time * 0.5) * 0.4 * go;
      const grab = on && near ? ramp : 0; cg.reach.rotation.set(-1.0 * grab - 0.2, 0, -0.4 * grab); cg.fore.rotation.x = -0.6 * grab + Math.sin(time * 4) * 0.15 * grab;
      cg.head.rotation.set(0.2 - 0.3 * grab, Math.sin(time * 0.7) * 0.4, 0);
    } });
    // Twig figures twisting on their cords under the arches.
    [[-2.8, 4.75, 1.6], [-2.8, 4.55, 6.9], [3.0, 4.6, 1.8], [3.0, 4.5, 7.2], [0.2, 5.1, 6.6]].forEach(([x, y, z], i) => {
      const tw = twigFigure(rigs, r), base = new THREE.Vector3(x, y, z); tw.root.position.copy(base); group.add(tw.root);
      actors.push({ id: "route-thicket", object: tw.root, base, animate({ time, on }) { tw.spin.rotation.set(Math.sin(time * 0.9 + i) * 0.08, time * (on ? 0.7 : 0.15) + i, Math.sin(time * 1.1 + i) * 0.06); } });
    });
    // Tendrils rise from the low briars and reach for the wagon as it passes.
    [[-3.4, 0.9], [-1.2, 1.1], [1.4, 0.9], [3.6, 1.1]].forEach(([x, z], i) => {
      const td = tendril(rigs, r), base = new THREE.Vector3(x, 0, z); td.root.position.copy(base); group.add(td.root);
      actors.push({ id: "route-thicket", object: td.root, base, animate({ time, on, near, ramp }) {
        const reach = on && near ? Math.min(1, ramp * 1.5) : 0;
        td.links.forEach((link, k) => { link.rotation.x = (1 - reach) * (k ? -0.42 : -0.2) + reach * (0.16 + Math.sin(time * 2.2 + k * 0.6 + i) * 0.1); link.rotation.z = Math.sin(time * 1.1 + k * 0.4 + i * 2) * (0.05 + 0.08 * reach); });
      } });
    });
    // Eyes in the briar that blink, out of step with each other.
    const ey = briarEyes(rigs, [[-3.2, 1.3, -2.2, 0xffe25a], [-1.4, 0.8, -2.0, 0xff4a30], [2.4, 1.6, -2.4, 0xb6ff6a], [3.4, 0.7, -1.4, 0xffe25a], [-0.4, 2.9, -3.0, 0xff4a30]]);
    group.add(ey.root);
    actors.push({ id: "route-thicket", object: ey.root, base: ey.root.position.clone(), animate({ time, on, near }) {
      ey.pairs.forEach((p, i) => { const blink = ((time * 0.7 + i * 0.37) % 1) < 0.06, show = on && near ? 1 : 0.6; p.scale.set(1, blink ? 0.1 : show, 1); });
    } });
  } else return null;
  return { actors, brood: rigs.length ? createBrood(rigs) : null };
}
