// The garden's fishing lake in voxels (handover 71): the lake piece itself
// (a stone bank, reeds, lily pads and a jetty with a lantern) with a rippling
// water surface, and the life on it the garden view animates: traps that
// glow when full, the rod, line and bobber while a line is out, splashes, and
// a fish that jumps now and then. Also each catch as a little voxel model,
// for the jumps and the lake menu's pictures. Plans: content/fishing.js LAKE.
import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { LAKE, FISH_BY_ID } from "./content/fishing.js";

const STONE = [0x6f6a7a, 0x8f8794, 0x575363, 0x7b7486], MOSS = [0x3f5a3d, 0x52704a, 0x2f4733], EARTH = 0x3a2b26;
const PLANK = [0x6b4a37, 0x7a563f, 0x5e4131], POST = 0x3b2b26, WATER_Y = .13;
const hex = (c) => new THREE.Color(c).getHex();

// A point on the water's edge: t from 0 to 1 round the oval, k its scale.
export function lakeEdge(t, k = 1) {
  const a = t * Math.PI * 2, w = 1 + .055 * Math.sin(3 * a + 1.1) + .035 * Math.sin(5 * a + 2.3);
  return { x: Math.cos(a) * LAKE.rx * w * k, z: Math.sin(a) * LAKE.rz * w * k };
}
const nearJetty = (x, z, pad = .7) => Math.abs(x - LAKE.jetty.x) < LAKE.jetty.w / 2 + pad && z > LAKE.jetty.z0 - .2;
const clampX = (x, half) => Math.max(-LAKE.w / 2 + half, Math.min(LAKE.w / 2 - half, x));
const clampZ = (z, half) => Math.max(-LAKE.d / 2 + half, Math.min(LAKE.d / 2 - half, z));

// The lake's still parts, into a Voxels batch (two batches with the lantern's glow).
export function addLakeModel(v, r = seeded(71)) {
  // The bed, in strips under the water.
  for (let z = -LAKE.rz * 1.06; z < LAKE.rz * 1.06; z += .28) {
    const half = LAKE.rx * Math.sqrt(Math.max(0, 1 - (z / (LAKE.rz * 1.06)) ** 2)) * 1.02;
    if (half > .2) v.block(0, .02, clampZ(z + .14, .15), half * 2, .06, .3, vary(0x182334, .05, r));
  }
  // The bank: two rings of stones with moss, open where the jetty meets the shore.
  for (const [k, step, size] of [[1.0, .29, .3], [1.07, .36, .26]]) {
    const n = Math.round(2 * Math.PI * Math.hypot(LAKE.rx, LAKE.rz) / Math.SQRT2 * k / step);
    for (let i = 0; i < n; i++) {
      const p = lakeEdge((i + (k > 1 ? .5 : 0)) / n, k), s = size * (.85 + r() * .35), h = .12 + r() * .14;
      if (nearJetty(p.x, p.z, .55) && p.z > 1) continue;
      const x = clampX(p.x, s / 2), z = clampZ(p.z, s / 2);
      v.block(x, 0, z, s, h, s * (.8 + r() * .3), vary(STONE[(r() * STONE.length) | 0], .06, r));
      if (r() < .45) v.block(x + (r() - .5) * .08, h, z + (r() - .5) * .08, s * .7, .05, s * .6, vary(MOSS[(r() * MOSS.length) | 0], .06, r));
    }
  }
  // Earth under the jetty's landing, so it meets the shore.
  v.block(LAKE.jetty.x, 0, LAKE.d / 2 - .26, LAKE.jetty.w + .5, .2, .5, EARTH);
  // Reeds and bulrushes in clumps round the edge.
  for (const t of [.11, .2, .57, .74, .9]) {
    for (let i = 0; i < 7; i++) {
      const p = lakeEdge(t + (r() - .5) * .035, .9 + r() * .06);
      if (nearJetty(p.x, p.z, .5)) continue;
      const x = clampX(p.x + (r() - .5) * .3, .05), z = clampZ(p.z + (r() - .5) * .25, .05), h = .45 + r() * .55;
      v.block(x, .05, z, .04, h, .04, vary(MOSS[(r() * MOSS.length) | 0], .1, r));
      if (r() < .45) v.block(x, .05 + h * .72, z, .07, .17, .07, 0x5a3825);
      if (r() < .5) v.block(x + .05, .05 + h * .35, z, .1, .025, .03, 0x5b7a45);
    }
  }
  // Lily pads, one in flower.
  for (const [x, z, s] of [[.35, .85, .42], [2.05, -.45, .36], [-2.2, -.5, .34], [.25, -1.35, .3], [1.55, 1.3, .32]]) {
    v.block(x, WATER_Y + .005, z, s, .02, s * .92, vary(0x4f7f42, .08, r));
    v.block(x + s * .26, WATER_Y + .006, z + s * .26, s * .3, .021, s * .3, 0x1b2a3c);
  }
  v.block(.35, WATER_Y + .025, .85, .11, .07, .11, 0xf2b5cf); v.block(.35, WATER_Y + .09, .85, .05, .03, .05, 0xffe6a0);
  // The jetty: planks across, posts down into the water, and a lantern at its end.
  const j = LAKE.jetty;
  for (const side of [-1, 1]) v.block(j.x + side * (j.w / 2 - .08), j.deck - .07, (j.z0 + j.z1) / 2, .1, .07, j.z1 - j.z0, POST);
  for (let z = j.z0 + .09; z <= j.z1 - .085; z += .19) v.block(j.x + (r() - .5) * .03, j.deck, z, j.w, .07, .17, vary(PLANK[(r() * PLANK.length) | 0], .05, r));
  for (const side of [-1, 1]) for (const z of [j.z0 + .08, (j.z0 + j.z1) / 2, j.z1 - .12]) v.block(j.x + side * (j.w / 2 - .06), 0, z, .11, j.deck, .11, POST);
  const lx = j.x + j.w / 2 - .1, lz = j.z0 + .1;
  v.block(lx, j.deck + .07, lz, .08, 1.05, .08, POST); v.block(lx - .12, j.deck + 1.08, lz, .3, .05, .06, POST);
  v.block(lx - .24, j.deck + .9, lz, .14, .04, .14, 0x2b2228); v.block(lx - .24, j.deck + .94, lz, .11, .16, .11, 0xffc46e, true);
  v.block(lx - .24, j.deck + 1.1, lz, .15, .04, .15, 0x2b2228);
}

// The water: a flat oval with ripples worked out in the shader, lit by the
// moon and the garden's lamps so they glint on it. Its clock is uTime.
export function lakeWater() {
  const shape = new THREE.Shape(), n = 64;
  for (let i = 0; i <= n; i++) { const p = lakeEdge(i / n, 1.0); if (i) shape.lineTo(p.x, -p.z); else shape.moveTo(p.x, -p.z); }
  const geometry = new THREE.ShapeGeometry(shape, 2); geometry.rotateX(-Math.PI / 2);
  // Dark, with thin moonlit glints: a bright specular blooms the whole surface white.
  const material = new THREE.MeshPhongMaterial({ color: 0x15263f, specular: 0x34304f, shininess: 140, transparent: true, opacity: .92 });
  const uTime = { value: 0 }; material.userData.uTime = uTime;
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vLake;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvLake = position.xz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vLake;\nuniform float uTime;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        float edge = length(vLake / vec2(${LAKE.rx.toFixed(2)}, ${LAKE.rz.toFixed(2)}));
        diffuseColor.rgb = mix(diffuseColor.rgb * .72, diffuseColor.rgb * 1.25 + vec3(.02, .05, .06), smoothstep(.55, 1.0, edge));`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        vec2 q = vLake * 2.4; float t = uTime;
        float w1 = sin(q.x * 1.7 + t * 1.1) * cos(q.y * 1.3 - t * .8), w2 = sin((q.x + q.y) * 2.9 - t * 1.6) * .5;
        vec3 ripple = normalize(vec3(w1 * .07 + w2 * .04, 1.0, cos(q.y * 2.1 + t * 1.3) * .05 + w2 * .03));
        normal = normalize(mat3(viewMatrix) * ripple);`);
  };
  material.customProgramCacheKey = () => "fishing-lake-water";
  const mesh = new THREE.Mesh(geometry, material); mesh.position.y = WATER_Y; mesh.name = "lake-water"; mesh.userData.water = true; mesh.renderOrder = 1;
  return mesh;
}

// Each catch as a small voxel model about a unit long, nose towards +x.
export function fishModel(id, scale = 1) {
  const f = FISH_BY_ID[id] ?? FISH_BY_ID["lantern-perch"], v = new Voxels(), [back, belly, fin, eye] = f.colours.map(hex), r = seeded(id.length * 31 + 7);
  if (f.crayfish) crayfish(v, back, belly, fin);
  else if (f.mussel) mussel(v, back, belly, eye);
  else if (f.junk) boot(v, back, belly, fin, eye);
  else if (f.eel) eel(v, back, belly, fin, eye);
  else fish(v, f, back, belly, fin, eye, r);
  const g = v.build(); g.scale.setScalar(scale); g.userData.fish = f.id; return g;
}
function fish(v, f, back, belly, fin, eye, r) {
  const L = .9, s = .045, cols = Math.round(L / s), big = f.id === "bog-carp" || f.id === "witch-pike";
  const H = f.id === "witch-pike" ? .24 : f.id === "pumpkinseed" ? .44 : big ? .36 : f.id === "moon-minnow" ? .2 : .32;
  const stripes = f.stripes ? hex(f.stripes) : null, spots = f.spots ? hex(f.spots) : null;
  for (let i = 0; i < cols; i++) {
    const t = i / (cols - 1), x = -L / 2 + i * s + s / 2;
    const h = Math.max(.05, H * Math.pow(Math.sin(Math.PI * (t * .86 + .07)), .75) * (t > .8 ? 1 - (t - .8) * 1.6 : 1)), d = h * .48;
    const stripe = stripes && t > .2 && t < .75 && i % 4 === 0;
    v.block(x, 0, 0, s, h / 2, d, stripe ? stripes : back);
    v.block(x, -h / 2, 0, s, h / 2, d * .94, belly);
    if (spots && t > .15 && t < .8 && r() < .3) for (const side of [-1, 1]) v.block(x, h * (r() * .3 - .05), side * (d / 2 + .006), s * .8, .035, .012, spots);
    if (t > .3 && t < .68) v.block(x, h / 2, 0, s, .05 + Math.sin((t - .3) / .38 * Math.PI) * (big ? .09 : .07), .025, fin);
    if (t > .62 && t < .72) for (const side of [-1, 1]) v.block(x, -h * .15, side * (d / 2 + .01), s, .05, .02, fin);
    if (t > .83 && t < .9) for (const side of [-1, 1]) { v.block(x, h * .12, side * (d / 2 + .004), .05, .05, .012, eye); v.block(x + .01, h * .17, side * (d / 2 + .01), .018, .018, .01, 0xffffff); }
  }
  for (let k = 0; k < 4; k++) v.block(-L / 2 - .02 - k * .04, -(.05 + k * .04), 0, .04, .1 + k * .08, .025, fin);
  v.block(L / 2, -.02, 0, .03, .03, .06, 0x1d1a24);
}
function eel(v, back, belly, fin, eye) {
  const L = 1.25, s = .05, cols = Math.round(L / s);
  for (let i = 0; i < cols; i++) {
    const t = i / (cols - 1), x = -L / 2 + i * s + s / 2, h = .1 * (t < .15 ? .5 + t / .3 : t > .92 ? 1 - (t - .92) * 5 : 1), wave = Math.sin(t * 7) * .04;
    v.block(x, wave, 0, s, h / 2, h * .8, back); v.block(x, wave - h / 2, 0, s, h / 2, h * .76, belly);
    if (t < .85) { v.block(x, wave + h / 2, 0, s, .03, .02, fin); v.block(x, wave - h / 2 - .03, 0, s, .03, .02, fin); }
    if (t > .9 && t < .96) for (const side of [-1, 1]) v.block(x, wave + .01, side * h * .41, .035, .035, .01, eye);
  }
}
function crayfish(v, back, belly, fin) {
  for (let i = 0; i < 6; i++) { const x = -.4 + i * .08, h = .07 + i * .012; v.block(x, 0, 0, .075, h, .18 + i * .01, i % 2 ? back : fin); }
  for (const z of [-.08, 0, .08]) v.block(-.47, 0, z, .05, .04, .07, fin);
  v.block(.13, 0, 0, .26, .14, .24, back); v.block(.3, .02, 0, .1, .08, .14, belly);
  for (const side of [-1, 1]) {
    v.block(.38, .03, side * .1, .16, .04, .04, back); v.block(.5, .03, side * .14, .16, .07, .09, back); v.block(.6, .04, side * .19, .1, .04, .04, fin); v.block(.6, .04, side * .12, .08, .035, .035, fin);
    for (let k = 0; k < 3; k++) v.block(.05 + k * .08, -.06, side * .16, .03, .06, .1, belly);
    v.block(.55, .08, side * .04, .3, .015, .015, belly);
  }
}
function mussel(v, back, belly, pearl) {
  for (let i = 0; i < 7; i++) { const x = -.24 + i * .08, w = .1 + Math.sin(i / 6 * Math.PI) * .14; v.block(x, 0, 0, .08, .06, w, back); v.block(x, .07 + i * .02, -.02, .08, .05, w * .9, back); }
  v.block(0, .06, 0, .4, .02, .18, belly); v.block(.04, .085, 0, .07, .07, .07, pearl, true);
}
function boot(v, sole, upper, toe, lace) {
  v.block(-.05, 0, 0, .62, .05, .2, sole); v.block(.08, .05, 0, .36, .12, .19, upper); v.block(.24, .05, 0, .12, .1, .2, toe);
  v.block(-.2, .05, 0, .2, .42, .18, upper); v.block(-.2, .47, 0, .22, .04, .2, toe);
  for (let y = .18; y < .45; y += .07) v.block(-.09, y, 0, .02, .02, .14, lace);
}

// A trap: a willow pot half in the water, its rope to a stake on the bank,
// and a cork float that glows when it's full.
export function trapModel() {
  const v = new Voxels(), r = seeded(404);
  for (let i = 0; i < 5; i++) v.block(0, WATER_Y - .1 + i * .045, 0, .42 - Math.abs(i - 2) * .05, .045, .32 - Math.abs(i - 2) * .04, vary(i % 2 ? 0x8a6a44 : 0x6f5233, .05, r));
  v.block(.25, WATER_Y - .02, 0, .06, .1, .2, 0x4a3828);
  v.block(-.45, 0, 0, .06, .5, .06, POST); v.block(-.3, .32, 0, .3, .015, .015, 0xd8c9a8);
  v.block(CORK.x, WATER_Y + .015, CORK.z, .11, .07, .11, 0xd9692f);
  return v.build();
}
const CORK = { x: -.1, z: .18 };
function rodModel() {
  const v = new Voxels();
  v.block(0, 0, -.05, .07, .07, .32, 0x6b4a37); v.block(.05, 0, -.12, .06, .08, .08, 0x9fa3ad);
  v.block(0, .012, -1.15, .035, .035, 1.7, 0x3d2c2a); v.block(0, .015, -2.05, .022, .022, .2, 0xcaa269);
  return v.build();
}
function bobberModel() {
  const v = new Voxels();
  v.block(0, 0, 0, .09, .05, .09, 0xf4efe6); v.block(0, .05, 0, .09, .05, .09, 0xd8402f); v.block(0, .1, 0, .02, .06, .02, 0x2b2228);
  return v.build();
}
function splash() {
  const m = new THREE.Mesh(new THREE.RingGeometry(.06, .1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0, depthWrite: false }));
  m.position.y = WATER_Y + .01; m.visible = false; return m;
}

// The lake's moving parts, added to its placed model. update() takes the
// garden's clock and the fishing state (rules/fishing.js).
export function createLakeLife() {
  const group = new THREE.Group(); group.name = "lake-life";
  // Each trap is one batch, cork and all, bobbing as a piece; the full traps'
  // glowing floats are one instanced mesh between them, so four traps cost
  // five draws at most.
  const traps = LAKE.traps.map((p, i) => {
    const g = trapModel(), a = Math.atan2(p.x, p.z) + Math.PI / 2; g.position.set(p.x, 0, p.z); g.rotation.y = a; g.visible = false; group.add(g);
    return { g, phase: i * 1.7, glowAt: new THREE.Vector3(CORK.x, 0, CORK.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), a).add(new THREE.Vector3(p.x, 0, p.z)) };
  });
  const floats = new THREE.InstancedMesh(new THREE.BoxGeometry(.06, .06, .06), new THREE.MeshBasicMaterial({ color: 0xffd27a, toneMapped: false }), traps.length);
  floats.count = 0; floats.frustumCulled = false; group.add(floats); const at = new THREE.Matrix4();
  const j = LAKE.jetty, hand = new THREE.Vector3(LAKE.stand.x + .22, j.deck + .95, LAKE.stand.z - .05), bob = new THREE.Vector3(LAKE.bobber.x, WATER_Y, LAKE.bobber.z);
  const rod = rodModel(); rod.position.copy(hand); rod.lookAt(bob.x, hand.y + 1.2, bob.z); rod.rotateY(Math.PI); rod.visible = false; group.add(rod);
  const tip = new THREE.Vector3(0, .02, -2.15);
  const bobber = bobberModel(); bobber.position.copy(bob); bobber.visible = false; group.add(bobber);
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: 0xece4d4, transparent: true, opacity: .75 })); line.visible = false; line.frustumCulled = false; group.add(line);
  const rings = [splash(), splash(), splash()]; rings.forEach((m) => group.add(m)); let ringIndex = 0;
  const ripple = (x, z, time) => { const m = rings[ringIndex++ % rings.length]; m.position.x = x; m.position.z = z; m.userData.start = time; m.visible = true; };
  const jumper = fishModel("lantern-perch", .38); jumper.visible = false; group.add(jumper);
  const caughtFish = new Map();
  let jump = null, nextJump = 7, lastPhase = null, phaseAt = 0, landed = null;
  const tipWorld = new THREE.Vector3();
  return {
    group,
    update(time, fishing, trapsHeld) {
      const holds = trapsHeld?.holds ?? 3;
      let lit = 0;
      traps.forEach((t, i) => {
        const trap = fishing?.traps?.[i]; t.g.visible = !!trap; if (!trap) return;
        const full = trap.catch.length >= holds, bob = Math.sin(time * (full ? 3.2 : 1.6) + t.phase) * (full ? .02 : .01);
        t.g.position.y = bob;
        if (full) { at.makeTranslation(t.glowAt.x, WATER_Y + .16 + bob, t.glowAt.z); floats.setMatrixAt(lit++, at); }
      });
      floats.count = lit; if (lit) floats.instanceMatrix.needsUpdate = true;
      // The line: out while casting, waiting, biting, landing or lost.
      const line$ = fishing?.line ?? null, phase = line$?.phase ?? null;
      if (phase !== lastPhase) {
        phaseAt = time;
        if (phase === "wait") ripple(bob.x, bob.z, time);
        if (phase === "bite") ripple(bob.x, bob.z, time);
        if (phase === "caught") { landed = line$.catch?.id ?? null; ripple(bob.x, bob.z, time); }
        lastPhase = phase;
      }
      const out = !!phase && (phase !== "caught" || time - phaseAt < 1.3);
      rod.visible = line.visible = !!phase; bobber.visible = out && phase !== "caught";
      if (phase) {
        const since = time - phaseAt;
        let y = WATER_Y + Math.sin(time * 2.3) * .012;
        if (phase === "wait" && Math.sin(time * 7.3) * Math.sin(time * 2.9) > .93) y -= .025;
        if (phase === "bite") { y = WATER_Y - .06 - Math.abs(Math.sin(time * 16)) * .04; if (since % .6 < .02) ripple(bob.x, bob.z, time); }
        bobber.position.set(bob.x, y, bob.z);
        rod.updateMatrixWorld(); tipWorld.copy(tip).applyMatrix4(rod.matrix);
        let end = bobber.position;
        if (phase === "caught") {
          // The catch comes up out of the water to the rod's tip.
          if (!caughtFish.has(landed)) { const m = fishModel(landed, .32); m.visible = false; group.add(m); caughtFish.set(landed, m); }
          const m = caughtFish.get(landed), u = Math.min(1, since / .9);
          caughtFish.forEach((o) => { o.visible = o === m && since < 1.3; });
          m.position.set(bob.x + (tipWorld.x - bob.x) * u * .8, WATER_Y + .1 + (tipWorld.y - .45 - WATER_Y) * Math.sin(u * Math.PI / 2), bob.z + (tipWorld.z - bob.z) * u * .8);
          m.rotation.set(0, 0, Math.PI / 2 + Math.sin(time * 14) * .35); end = m.position;
        } else caughtFish.forEach((o) => { o.visible = false; });
        const pos = lineGeometry.attributes.position; pos.setXYZ(0, tipWorld.x, tipWorld.y, tipWorld.z); pos.setXYZ(1, end.x, end.y + .1, end.z); pos.needsUpdate = true;
      } else caughtFish.forEach((o) => { o.visible = false; });
      // Now and then a fish jumps clear of the water.
      if (!jump && time > nextJump) {
        const a = (Math.sin(time * 12.9898) * 43758.5453) % 1, p = lakeEdge(Math.abs(a), .45 + Math.abs(a) * .2);
        if (!nearJetty(p.x, p.z, .4)) { jump = { x: p.x, z: p.z, dir: a * Math.PI * 2, t0: time }; ripple(p.x, p.z, time); }
        nextJump = time + 9 + Math.abs(a) * 9;
      }
      if (jump) {
        const u = (time - jump.t0) / .75, dx = Math.cos(jump.dir) * .7, dz = Math.sin(jump.dir) * .7;
        jumper.visible = u < 1; jumper.position.set(jump.x + dx * u, WATER_Y + Math.sin(u * Math.PI) * .45, jump.z + dz * u);
        jumper.rotation.set(0, -jump.dir, Math.cos(u * Math.PI) * .9);
        if (u >= 1) { ripple(jump.x + dx, jump.z + dz, time); jump = null; }
      }
      for (const m of rings) {
        if (!m.visible) continue;
        const u = (time - m.userData.start) / 1.4; if (u >= 1) { m.visible = false; continue; }
        m.scale.setScalar(1 + u * 4.5); m.material.opacity = .55 * (1 - u);
      }
    },
  };
}
