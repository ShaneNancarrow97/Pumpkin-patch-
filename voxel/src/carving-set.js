import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";

// The carving bench's set (carving-view.js): a potting bench under a pergola
// in the garden at night. Festoon bulbs swag between the posts, an enamel lamp
// hangs over the bench, carving tools hang on a pegboard, and a bowl waits for
// the seeds. The bench top is y = 0, with the pumpkin at the middle.
export const SEED_BOWL = new THREE.Vector3(1.55, .16, .55);
export const LID_REST = new THREE.Vector3(-1.5, 0, .2);

function bench(v, r) {
  // A thick plank top, legs, a lower shelf of terracotta pots, and a backboard.
  for (let z = -1.3; z < 1.3; z += .26) v.box(-2.7, -.2, z, 5.4, .2, .25, vary(0x7a5640, .08, r));
  v.box(-2.7, -.24, 1.3, 5.4, .05, .08, 0x5c3f2e);
  for (const x of [-2.55, 2.35]) for (const z of [-1.2, 1.05]) v.box(x, -2.6, z, .2, 2.4, .2, 0x4a3326);
  for (let z = -1.1; z < 1.1; z += .3) v.box(-2.5, -1.9, z, 5, .1, .27, vary(0x6a4a36, .08, r));
  for (const [x, h] of [[-2.1, .34], [-1.55, .26], [1.4, .3], [1.9, .38]]) { v.block(x, -1.8, .1, .34, h, .34, vary(0xb4643a, .06, r)); v.block(x, -1.8 + h, .1, .4, .06, .4, 0xc97a4a); }
  // The pegboard behind, with its holes, two small shelves and the carving tools.
  v.box(-2.7, 0, -1.42, 5.4, 2.5, .08, 0x8a6a4c);
  for (let x = -2.5; x < 2.6; x += .2) for (let y = .15; y < 2.4; y += .2) v.box(x, y, -1.335, .04, .04, .01, 0x3c2a20);
  for (const [x, w] of [[-2.45, 1.5], [1.1, 1.4]]) {
    v.box(x, 1.55, -1.34, w, .05, .34, 0x6a4a36);
    for (let i = 0; i < Math.round(w / .24); i++) {
      const jx = x + .08 + i * .24, kind = i % 3;
      if (kind === 0) { v.box(jx, 1.6, -1.26, .16, .22, .16, vary(0x8fae9c, .1, r)); v.box(jx + .02, 1.82, -1.24, .12, .04, .12, 0x5c4a3a); }
      else if (kind === 1) { v.block(jx + .08, 1.6, -1.18, .18, .12, .18, vary(0xd8873a, .1, r)); v.block(jx + .08, 1.72, -1.18, .03, .05, .03, 0x6a7c44); }
      else { v.box(jx, 1.6, -1.25, .1, .26, .1, vary(0x5a3a6a, .1, r)); v.box(jx + .015, 1.86, -1.235, .07, .03, .07, 0xcaa269); }
    }
  }
  // Saws, scoops, a poker, a drill and a peeler, each on its peg.
  const tools = [[-1.5, 0xe0742e, "saw"], [-1.2, 0x3a8f9a, "saw"], [-.85, 0xcaa269, "scoop"], [-.5, 0xe0742e, "poker"], [.5, 0x3a8f9a, "peeler"], [.85, 0xe0742e, "scoop"], [1.25, 0x9a3a4a, "drill"]];
  for (const [x, colour, kind] of tools) {
    v.box(x - .02, 1.22, -1.32, .04, .04, .06, 0x2a2026);
    if (kind === "saw") { v.box(x - .04, .78, -1.31, .08, .3, .05, colour); v.box(x - .015, .38, -1.315, .03, .4, .02, 0xd7dbe4); for (let y = .4; y < .76; y += .05) v.box(x + .015, y, -1.315, .015, .02, .02, 0xb9bec8); }
    else if (kind === "scoop") { v.box(x - .03, .82, -1.31, .06, .3, .05, colour); v.box(x - .018, .6, -1.315, .036, .22, .03, 0xc9ccd4); v.box(x - .07, .42, -1.32, .14, .18, .04, 0xd7dbe4); v.box(x - .05, .45, -1.33, .1, .12, .02, 0xaeb3bc); }
    else if (kind === "poker") { v.box(x - .03, .84, -1.31, .06, .28, .05, colour); v.box(x - .006, .5, -1.315, .012, .34, .012, 0xd7dbe4); }
    else if (kind === "peeler") { v.box(x - .03, .84, -1.31, .06, .28, .05, colour); v.box(x - .06, .6, -1.315, .012, .24, .02, 0xd7dbe4); v.box(x + .048, .6, -1.315, .012, .24, .02, 0xd7dbe4); v.box(x - .06, .58, -1.315, .12, .02, .02, 0xd7dbe4); }
    else { v.box(x - .08, .7, -1.33, .16, .26, .1, colour); v.box(x - .03, .52, -1.33, .06, .2, .1, 0x2a2026); v.box(x + .06, .82, -1.33, .2, .08, .08, colour); v.box(x + .26, .84, -1.32, .14, .03, .03, 0xc9ccd4); }
  }
}
// The bench top's things: newspaper under the pumpkin, the stencil book, the
// seed bowl, a mug of cocoa, a pencil and a spare pumpkin.
function benchTop(v, r) {
  v.box(-1.2, 0, -.95, 2.4, .01, 1.85, 0xd6cfbc);
  for (let z = -.8; z < .8; z += .1) v.box(-1.08, .011, z, .95, .004, .025, 0x8d8779);
  for (let z = -.8; z < -.2; z += .1) v.box(.15, .011, z, .9, .004, .025, 0x8d8779);
  v.box(.2, .011, -.12, .6, .004, .36, 0x9a948a);
  // The stencil book, open, with a pattern on each page.
  v.box(-2.45, 0, .3, 1.1, .05, .78, 0x5a2a3a); v.box(-2.4, .05, .34, .5, .03, .7, 0xf1e6c8); v.box(-1.88, .05, .34, .5, .03, .7, 0xece0c0);
  for (const [x, z, w] of [[-2.28, .5, .26], [-2.2, .62, .1], [-2.0, .5, .1], [-1.76, .48, .3], [-1.7, .72, .18]]) v.box(x, .081, z, w, .004, .06, 0x2c2430);
  v.box(-1.95, .08, .9, .5, .02, .04, 0xcaa269); v.box(-1.45, .08, .9, .06, .02, .04, 0x2c2430);
  // The seed bowl: a wooden bowl, empty for now.
  const { x, z } = SEED_BOWL;
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; v.block(x + Math.cos(a) * .3, 0, z + Math.sin(a) * .3, .12, .16, .12, vary(0x8a5a36, .06, r)); }
  v.block(x, 0, z, .5, .03, .5, 0x6a4430);
  // A mug of cocoa, steam rising (carving-view.js animates it), and a spare pumpkin.
  v.block(2.25, 0, -.35, .2, .22, .2, 0xe8e0d0); v.block(2.25, .2, -.35, .16, .02, .16, 0x6a3a26); v.block(2.38, .06, -.35, .06, .1, .04, 0xe8e0d0);
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; v.block(2.1 + Math.cos(a) * .2, 0, -1.0 + Math.sin(a) * .2, .16, .26, .16, vary(0xd8873a, .08, r)); }
  v.block(2.1, .26, -1.0, .05, .1, .05, 0x6a7c44);
}
// The pergola over the bench: posts, a beam and rafters, with vines.
function pergola(v, r) {
  for (const x of [-3.1, 3.1]) {
    v.box(x - .12, -2.6, -1.9, .24, 6.4, .24, 0x4f3a2c);
    for (let y = -2.4; y < 3.6; y += .22) if (r() < .7) v.block(x + (r() - .5) * .3, y, -1.66 + r() * .1, .14, .1, .1, vary(0x3e5a2c, .15, r));
  }
  v.box(-3.4, 3.7, -2, 6.8, .22, .26, 0x5c4434);
  for (let x = -3; x <= 3; x += .75) v.box(x - .06, 3.92, -2.6, .12, .14, 2.6, 0x4f3a2c);
}
// The lamp over the back of the bench: an enamel shade with a glowing bulb under it.
function lamp(v) {
  const z = -.8;
  v.box(-.01, 3.3, z - .01, .02, .6, .02, 0x2a2026);
  v.block(0, 3.16, z, .64, .06, .64, 0x2f5a4a); v.block(0, 3.22, z, .46, .08, .46, 0x2f5a4a); v.block(0, 3.3, z, .2, .06, .2, 0x2f5a4a);
  v.block(0, 3.1, z, .14, .1, .14, 0xfff1c8, true);
}
// The garden at night beyond: dark trees, a fence and a moon.
function garden(v, r) {
  for (let i = 0; i < 18; i++) {
    const x = -11 + i * 1.3 + r() * .5, z = -8 - r() * 4, h = 3 + r() * 4;
    v.box(x - .14, -2.6, z, .28, h + 1, .28, 0x1d1620);
    for (let k = 0; k < 5; k++) v.box(x - .8 + r() * .6, h - 1.4 + k * .45, z - .3, 1 + r() * .5, .55, .7, vary(0x1f2a26, .12, r));
  }
  for (let x = -9; x < 9; x += .45) { v.box(x, -2.6, -6, .09, 1.6, .09, 0x2a2230); v.box(x, -1.6, -6, .45, .05, .05, 0x2a2230); }
  v.box(5.4, 5.2, -13, 1.6, 1.6, .2, 0xe8e0c8, true);
  v.box(-12, -2.62, -14, 24, .02, 16, 0x161219);
}
// Festoon bulbs on a wire swagging between the posts and the beam.
function festoons(r) {
  const v = new Voxels(), bulbs = [];
  const swag = (a, b, sag, n) => {
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * sag;
      if (i < n) { const tn = (i + 1) / n, nx = a.x + (b.x - a.x) * tn, ny = a.y + (b.y - a.y) * tn - Math.sin(tn * Math.PI) * sag; for (let k = 0; k < 6; k++) { const q = k / 6; v.block(x + (nx - x) * q, y + (ny - y) * q, z, .015, .015, .015, 0x1a161c); } }
      if (i > 0 && i < n) { v.block(x, y - .09, z, .05, .05, .05, 0x2a2026); bulbs.push(new THREE.Vector3(x, y - .16, z)); }
    }
  };
  swag(new THREE.Vector3(-3.1, 3.55, -1.75), new THREE.Vector3(3.1, 3.55, -1.75), .5, 13);
  swag(new THREE.Vector3(-3.1, 3.7, -1.9), new THREE.Vector3(-.4, 3.8, -2.4), .3, 6);
  swag(new THREE.Vector3(3.1, 3.7, -1.9), new THREE.Vector3(.4, 3.8, -2.4), .3, 6);
  const wire = v.build();
  const glow = new THREE.InstancedMesh(new THREE.BoxGeometry(.075, .1, .075), new THREE.MeshBasicMaterial({ toneMapped: false }), bulbs.length);
  const m = new THREE.Matrix4();
  bulbs.forEach((p, i) => { glow.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)); glow.setColorAt(i, new THREE.Color(vary(0xffd27a, .08, r))); });
  return { wire, glow, bulbs };
}

export function buildCarvingSet() {
  const r = seeded(733), solid = new Voxels(), back = new Voxels();
  bench(solid, r); benchTop(solid, r); pergola(solid, r); lamp(solid); garden(back, seeded(519));
  const group = new THREE.Group(), set = solid.build(), behind = back.build({ shadows: false });
  set.traverse((m) => { if (m.isMesh) m.receiveShadow = true; });
  const lights = festoons(r);
  group.add(set, behind, lights.wire, lights.glow);
  // Fireflies drifting in the garden behind, and steam off the cocoa.
  const flies = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: .07, color: 0xd9ff8a, transparent: true, opacity: .85, depthWrite: false, blending: THREE.AdditiveBlending }));
  const steam = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: .06, color: 0xf3ece2, transparent: true, opacity: .22, depthWrite: false }));
  group.add(flies, steam);
  const fireflies = Array.from({ length: 28 }, (_, i) => ({ x: -8 + r() * 16, y: -.5 + r() * 3.5, z: -4.5 - r() * 5, p: r() * 6.3, s: .3 + r() * .5, i }));
  return {
    group, bulbs: lights.glow,
    tick(time) {
      flies.geometry.setAttribute("position", new THREE.Float32BufferAttribute(fireflies.flatMap((f) => [f.x + Math.sin(time * f.s + f.p) * .6, f.y + Math.sin(time * f.s * 1.7 + f.p) * .3, f.z + Math.cos(time * f.s + f.p) * .4]), 3));
      flies.material.opacity = .55 + .3 * Math.sin(time * 2.1);
      const puffs = []; for (let i = 0; i < 6; i++) { const t = (time * .35 + i / 6) % 1; puffs.push(2.25 + Math.sin(t * 6 + i) * .05 * t, .25 + t * .55, -.35 + Math.cos(t * 5 + i) * .04); }
      steam.geometry.setAttribute("position", new THREE.Float32BufferAttribute(puffs, 3));
    },
    // Dims or brightens the festoons, 0 to 1.
    setGlow(k) { this.bulbs.material.color.setScalar(k); },
  };
}
