// Life in Mothlight (handover 73): everything that moves on Lantern Night.
// Water falling in the fountain, lamps and jack-o'-lanterns flickering, moths
// round the lamps, leaves drifting down, chimney smoke, crows that fly from
// perch to perch and land, an owl, squirrels that scamper, sit up and climb,
// the Lantern Spire's turning beam, the Moor's wheel of lights and fireflies.
// Built on the design grid (the view scales it with the rest of the village);
// a few shared geometries and instanced meshes, so it costs a handful of draws.
import * as THREE from "three";
import { Voxels, seeded } from "./voxels.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LAYOUT_DESIGN, LAMPS } from "./village-world.js";
import { spread, gather, pieceAt, spreadWith } from "./rules/village-spread.js";
import { DISTRICT_SHIFT, FIXTURES, PLAN_SCALE as K } from "./content/village.js";
import { C } from "./village-models.js";

// Everything here is worked out on the old design grid; W places it where that spot now stands (the village is
// spread apart, rules/village-spread.js), so a moth orbits its own lamp and a leaf falls under its own tree.
const W = (x, z, y = 0, target = new THREE.Vector3()) => { const [nx, nz] = spread(x, z); return target.set(nx, y, -nz); };
const placed = (o) => { const [x, z] = spread(o.x, o.z); return { ...o, x, z }; };
// A point that belongs to something (a leaf to its tree) moves with that thing, wherever it drifts.
const WBy = (x, z, y, [ax, az], target = new THREE.Vector3()) => { const [nx, nz] = spreadWith(x, z, ax, az); return target.set(nx, y, -nz); };
const dummy = new THREE.Object3D();
const noise = (t) => Math.sin(t) * .5 + Math.sin(t * 2.31 + 1.7) * .3 + Math.sin(t * 5.13 + .4) * .2;

// Where a crow may perch (design grid x, height, z): lamp tops, piers, the well's
// roof, the noticeboard, the wall and fences, the scarecrows' arms, and the ground.
const PERCHES_DESIGN = [
  [54.5, 4.1, 21.1], [61.5, 4.1, 21.1], [54.5, 4.1, 28.1], [61.5, 4.1, 28.1], [...(([x, z]) => [x, 3.1, z])(gather(FIXTURES.well.x / K, FIXTURES.well.z / K))], [...(([x, z]) => [x, 2.75, z])(gather(FIXTURES.noticeboard.x / K, FIXTURES.noticeboard.z / K))],
  [54.4, 1.62, 8], [54.4, 1.62, 15.6], [61.6, 1.62, 8], [61.6, 1.62, 15.6], [44, 1.32, .6], [72, 1.32, .6], [34, 1.32, .6],
  [80.6, 2.66, 5.4], [38, 2.66, 7.6], [30, .86, 11], [40, .86, 29], [70, .86, 9], [75, .86, 27],
];
// Where fireflies drift (design grid rects): the Copse, the moth-yard, the Green's west edge, the corn rows,
// the woods west and east of the Quarry, and the Marsh's banks.
const [cx, cz] = DISTRICT_SHIFT.copse;
// The Moor's carousel, in the Moor's own place (moved with it).
export const CAROUSEL = Object.freeze({ x: 102, z: 35 });
const FLY_ZONES = [[2 + cx, 40 + cz, 38 + cx, 92 + cz], [86, 2, 95, 10], [4, 28, 22, 35], [30, 5, 46, 10], [6, 40, 36, 100], [90, 40, 124, 104], [40, 104, 120, 109]];
const TREES = [[52.2, 4], [63.8, 4], [70.6, 25.4], [79, 21], [31, 25.5], [31.5, 14.5], [25.4, 9.6], [35.5, 20], [58, 24.6]];

// Boxes [x, y, z, w, h, d, colour?] merged into one geometry (bottom-centred on y), coloured if asked.
function mergeBoxes(list, coloured = false) {
  const geos = list.map(([x, y, z, w, h, d, c]) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y + h / 2, z); if (coloured) { const col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([col.r, col.g, col.b], i * 3); g.setAttribute("color", new THREE.BufferAttribute(a, 3)); } return g; });
  const merged = mergeGeometries(geos); geos.forEach((g) => g.dispose()); return merged;
}

// chimneyTops: noted as the village was built, where they now stand (design grid units: x, height, z north).
export function createVillageLife({ chimneyTops = [] } = {}) {
  const group = new THREE.Group(), r = seeded(907), D = LAYOUT_DESIGN;
  const lit = (c) => new THREE.MeshLambertMaterial({ color: c }), glow = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: o < 1, opacity: o, depthWrite: o >= 1 });

  // ---- The knot gardens' fountains: beads of water arcing from the bowl into the basin, and splashes.
  const FS = D.fountains, H = D.height, arcs = 12, beads = 6, water = new THREE.InstancedMesh(new THREE.BoxGeometry(.05, .12, .05), glow(new THREE.Color(.75, .95, 1.15), .85), FS.length * arcs * beads);
  water.frustumCulled = false; group.add(water);
  const splash = new THREE.InstancedMesh(new THREE.BoxGeometry(.16, .02, .16), glow(new THREE.Color(.7, .85, 1), .45), FS.length * arcs); splash.frustumCulled = false; group.add(splash);
  // ---- The waterfalls off the Quarry's island: water pouring down the cliff, white where it lands.
  const fallBeads = 90, falls = new THREE.InstancedMesh(new THREE.BoxGeometry(.16, .5, .16), glow(new THREE.Color(1.15, 1.45, 1.75), .85), D.falls.length * fallBeads); falls.frustumCulled = false; group.add(falls);
  const fallSpot = Array.from({ length: D.falls.length * fallBeads }, () => ({ z: (r() - .5) * 2.2, out: r() * .5, p: r(), s: .7 + r() * .5 }));

  // ---- Moths: pale wings fluttering round the lamps' heads.
  const mothCount = 34, moths = new THREE.InstancedMesh(new THREE.BoxGeometry(.11, .015, .07), lit(0xe8dcc4), mothCount); moths.frustumCulled = false; group.add(moths);
  const mothHome = Array.from({ length: mothCount }, (_, i) => { const l = LAMPS[i % 10]; return { x: l.x, y: l.y - .1, z: l.z, r: .4 + r() * .7, s: 1.6 + r() * 2.4, p: r() * 9 }; });

  // ---- Leaves: each falls from a canopy, flutters down, lies a while, then falls again.
  const leafCount = 70, leafColours = [0xb3352a, 0xd0532c, 0xe8873a, 0xa8172c, 0xe2a83a, 0xcf8f2c];
  const leaves = new THREE.InstancedMesh(new THREE.BoxGeometry(.2, .02, .14), new THREE.MeshLambertMaterial(), leafCount); leaves.frustumCulled = false; group.add(leaves);
  const leaf = Array.from({ length: leafCount }, (_, i) => ({ tree: TREES[i % TREES.length], born: -r() * 14, life: 9 + r() * 6, ox: (r() - .5) * 3.4, oz: (r() - .5) * 3.4, h: 4.5 + r() * 2.5, sway: .8 + r() * 1.2, spin: 1 + r() * 3, p: r() * 9 }));
  leaf.forEach((_, i) => leaves.setColorAt(i, new THREE.Color(leafColours[i % leafColours.length])));

  // ---- Chimney smoke: soft puffs rising, swelling and fading, all in one draw of points.
  const chimneys = [...chimneyTops, ...[{ x: 70.7, y: 7.9, z: 22.2, home: "rowan-workshop" }, { x: 43.3, y: 8, z: 18.1, home: "elowen-conservatory" }].map(placed)];
  const PUFFS = 7, smokeCount = chimneys.length * PUFFS, smokePos = new Float32Array(smokeCount * 3), smokeSize = new Float32Array(smokeCount), smokeAlpha = new Float32Array(smokeCount);
  const smokeGeo = new THREE.BufferGeometry(); smokeGeo.setAttribute("position", new THREE.BufferAttribute(smokePos, 3)); smokeGeo.setAttribute("size", new THREE.BufferAttribute(smokeSize, 1)); smokeGeo.setAttribute("alpha", new THREE.BufferAttribute(smokeAlpha, 1));
  const smoke = new THREE.Points(smokeGeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { tint: { value: new THREE.Color(0x9a90b8) } },
    vertexShader: "attribute float size; attribute float alpha; varying float vA; void main() { vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = size * 320. / -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform vec3 tint; varying float vA; void main() { float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(tint, vA * (1. - d * 2.) * (1. - d * 2.)); }" }));
  smoke.frustumCulled = false; group.add(smoke);

  // ---- Crows: they sit, look about, hop, then fly to another perch and land. Every crow's
  // body, head, eyes and wings are instances of shared meshes: five draws for the flock.
  const PERCHES = PERCHES_DESIGN.map(([x, y, z]) => [x, y + H(x, z), z]), CROWS = 8, black = lit(0x17141d);
  const bodyGeo = mergeBoxes([[0, .16, 0, .2, .2, .4], [0, .14, -.27, .14, .04, .2], [-.05, .02, 0, .03, .12, .03], [.05, .02, 0, .03, .12, .03]]);
  const headGeo = mergeBoxes([[0, -.075, 0, .16, .15, .16], [0, -.05, .12, .05, .05, .12]]), eyeGeo = mergeBoxes([[-.06, -.045, .07, .03, .03, .02], [.06, -.045, .07, .03, .03, .02]]);
  const crowWing = new THREE.BoxGeometry(.42, .03, .2); crowWing.translate(.2, 0, 0);
  const crowBody = new THREE.InstancedMesh(bodyGeo, black, CROWS), crowHead = new THREE.InstancedMesh(headGeo, black, CROWS), crowEyes = new THREE.InstancedMesh(eyeGeo, glow(0xffd060), CROWS), crowWings = new THREE.InstancedMesh(crowWing, black, CROWS * 2);
  for (const m of [crowBody, crowHead, crowEyes, crowWings]) { m.frustumCulled = false; group.add(m); }
  const crows = Array.from({ length: CROWS }, () => ({ at: PERCHES[(r() * PERCHES.length) | 0], from: null, to: null, t: 0, wait: 2 + r() * 8, fly: 0, yaw: r() * 6, pos: new THREE.Vector3(), rot: 0, headYaw: 0, headPitch: 0, flap: -.15 }));
  // An owl on the old oak, turning its head.
  const owl = (() => {
    const g = new THREE.Group(), brown = lit(0x6a5444), cream = lit(0xd8c8a8);
    const body = new THREE.Mesh(new THREE.BoxGeometry(.4, .5, .36), brown); body.position.y = .25; g.add(body); const chest = new THREE.Mesh(new THREE.BoxGeometry(.3, .36, .02), cream); chest.position.set(0, .24, .19); g.add(chest);
    const head = new THREE.Group(); head.position.y = .62; g.add(head); head.add(new THREE.Mesh(new THREE.BoxGeometry(.42, .32, .36), brown));
    const facePlate = new THREE.Mesh(new THREE.BoxGeometry(.34, .24, .02), cream); facePlate.position.z = .19; head.add(facePlate);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(.09, .09, .02), glow(0xffb020)); e.position.set(s * .09, .02, .205); head.add(e); const tuft = new THREE.Mesh(new THREE.BoxGeometry(.08, .12, .08), brown); tuft.position.set(s * .15, .2, 0); head.add(tuft); }
    g.position.copy(W(25.4 + 1.2, 9.6 + .4, 4.1)); group.add(g); return { g, head };
  })();

  // ---- Squirrels: scamper between trees across the lawns, sit up and flick their tails, now and then climb a trunk.
  const squirrel = (seed) => {
    const g = new THREE.Group(), rr = seeded(seed);
    const body = new THREE.Mesh(mergeBoxes([[0, .14, 0, .18, .18, .32, 0xa0562c], [0, .26, .17, .15, .14, .15, 0xa0562c], [-.05, .36, .15, .04, .07, .03, 0xa0562c], [.05, .36, .15, .04, .07, .03, 0xa0562c], [-.05, .28, .25, .03, .03, .02, 0x1a1010], [.05, .28, .25, .03, .03, .02, 0x1a1010], [0, .14, .17, .12, .12, .02, 0xe0b080]], true), new THREE.MeshLambertMaterial({ vertexColors: true }));
    const tail = new THREE.Mesh(mergeBoxes([0, 1, 2, 3].map((i) => [0, .06 + i * .1, -.04 - Math.sin(i / 3 * Math.PI) * .1, .16 - i * .01, .14, .14, 0xa0562c]), true), body.material);
    tail.position.set(0, .16, -.15); g.add(body, tail); g.scale.setScalar(1.25); group.add(g);
    return { g, tail, rr, x: TREES[seed % TREES.length][0] + 2, z: TREES[seed % TREES.length][1] + 2, tx: 0, tz: 0, state: "sit", t: 0, wait: 2, climb: 0 };
  };
  const squirrels = [squirrel(3), squirrel(6), squirrel(1)];

  // ---- The Lantern Spire's beam, turning slowly; the Moor's wheel of lights.
  const [qx, qz] = DISTRICT_SHIFT.quarry, [mx, mz] = DISTRICT_SHIFT.moor;
  const beam = new THREE.Group(); beam.position.copy(W(64 + qx, 66.5 + qz, H(64 + qx, 66.5 + qz) + 19.1)); group.add(beam);
  const beamGeo = new THREE.CylinderGeometry(.25, 1.6, 30, 16, 1, true); beamGeo.translate(0, 15, 0); beamGeo.rotateZ(-Math.PI / 2 + .06);
  for (const a of [0, Math.PI]) { const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffd48a, transparent: true, opacity: .018, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); m.rotation.y = a; beam.add(m); }
  // The Moor's Ferris wheel: A-frame legs, a boarding deck and a ticket booth stand still; the wheel
  // (two rims and sixteen spokes strung with bulbs) turns, and its gondolas hang upright as it does.
  const WR = 5.4, wheelAt = W(115.5 + mx, 50 + mz, H(115.5 + mx, 50 + mz) + 6.6);
  const wheel = new THREE.Group(); wheel.position.copy(wheelAt); wheel.rotation.y = -Math.PI / 2; group.add(wheel);
  const wheelFrame = new THREE.Group(); wheelFrame.position.copy(wheelAt); wheelFrame.rotation.y = -Math.PI / 2; group.add(wheelFrame);
  { const v = new Voxels(), iron = 0x27242d;
    for (const sz of [-1.05, 1.05]) for (const sx of [-1, 1]) for (let k = 0; k <= 16; k++) { const t = k / 16; v.block(sx * 3.5 * (1 - t), -6.6 + t * 6.6, sz, .26, .44, .26, iron); }
    for (const sz of [-1.05, 1.05]) { v.block(0, -3.4, sz, 3.7, .2, .2, iron); v.block(0, -5.6, sz, 5.6, .2, .2, iron); }
    v.block(0, -.2, 0, .36, .36, 2.4, iron); for (const sz of [-1.2, 1.2]) v.block(0, -.28, sz, .5, .5, .1, C.gold);
    v.block(0, -6.6, 0, 3.4, .3, 3.2, C.wood); for (let k = 0; k < 3; k++) v.block(2 + k * .3, -6.6, 0, .3, .3 - k * .1, 1.6, C.woodLight);
    for (const sx of [-1.6, 1.6]) for (const sz of [-1.5, 1.5]) { v.block(sx, -6.3, sz, .1, .9, .1, iron); } v.block(0, -5.45, 1.5, 3.2, .06, .06, C.gold); v.block(0, -5.45, -1.5, 3.2, .06, .06, C.gold);
    const bx = 3.9, bz = 2.4; v.block(bx, -6.6, bz, 1.4, 1.7, 1.2, 0x6a3a8a); v.block(bx, -5.2, bz + .61, .8, .5, .03, 0xffd08a, true); v.block(bx, -6.0, bz + .62, 1.2, .1, .1, C.gold);
    for (let i = 0; i < 5; i++) v.block(bx - .56 + i * .28, -4.9, bz, .28, .14, 1.5, i % 2 ? C.cream : 0xa8172c);
    const legs = v.build(); legs.position.copy(wheelAt); legs.rotation.y = wheel.rotation.y; group.add(legs); }
  { const v = new Voxels(), iron = 0x2e2a36;
    for (const sz of [-.45, .45]) for (let i = 0; i < 48; i++) { const t = i / 48 * Math.PI * 2; v.block(Math.cos(t) * WR, Math.sin(t) * WR - .08, sz, .2, .16, .16, iron); if (i % 2 === 0) v.block(Math.cos(t) * (WR + .12), Math.sin(t) * (WR + .12) - .07, sz, .14, .14, .14, i % 4 ? 0xe8b0ff : 0xffc06a, true); }
    for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; for (const sz of [-.45, .45]) for (let k = 1; k < 10; k++) { const d = WR * k / 10; v.block(Math.cos(t) * d, Math.sin(t) * d - .05, sz, .1, .1, .1, k % 3 === 0 ? 0xffd890 : iron, k % 3 === 0); } if (i % 2 === 0) v.block(Math.cos(t) * WR, Math.sin(t) * WR - .05, 0, .12, .12, 1.1, iron); }
    v.block(0, -.5, 0, 1, 1, 1.2, iron); v.block(0, -.2, .62, .5, .5, .04, 0xffc06a, true); v.block(0, -.2, -.62, .5, .5, .04, 0xffc06a, true);
    wheel.add(v.build({ glow: 1.95 })); }
  const GONDOLAS = 8, gondolaGeo = mergeBoxes([[0, -.95, 0, .9, .7, .8], [0, -.25, 0, 1, .12, .9], [0, -.13, 0, .7, .1, .6], [0, -.95, 0, 1, .08, .9], [0, -.25, 0, .06, .3, .06]]);
  const gondolas = new THREE.InstancedMesh(gondolaGeo, new THREE.MeshLambertMaterial(), GONDOLAS), gondolaLamps = new THREE.InstancedMesh(new THREE.BoxGeometry(.18, .14, .18), glow(new THREE.Color(1.9, 1.5, .8)), GONDOLAS);
  for (const m of [gondolas, gondolaLamps]) { m.frustumCulled = false; wheelFrame.add(m); }
  for (let i = 0; i < GONDOLAS; i++) gondolas.setColorAt(i, new THREE.Color([0xa8172c, 0x4b3a8a, 0xd9a441, 0x2a7a6a][i % 4]));

  // ---- The Moor's carousel: a striped canopy ringed with bulbs over a mirrored column, turning slowly,
  // its painted horses rising and falling on their gilt poles. (Its plinth is built with the Moor.)
  const carousel = new THREE.Group(); carousel.position.copy(W(CAROUSEL.x + mx, CAROUSEL.z + mz, H(CAROUSEL.x + mx, CAROUSEL.z + mz) + .32)); group.add(carousel);
  { const v = new Voxels();
    for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2; v.block(Math.cos(t) * 1.6, 0, Math.sin(t) * 1.6, 1.5, .14, .7, i % 2 ? C.woodLight : C.wood); v.block(Math.cos(t) * 2.38, .02, Math.sin(t) * 2.38, .7, .14, .3, C.gold); }
    v.block(0, 0, 0, 1.4, .15, 1.4, C.woodLight); v.block(0, .15, 0, .7, 3.2, .7, 0xc8c0e0); for (let k = 0; k < 6; k++) v.block(0, .4 + k * .5, 0, .74, .08, .74, C.gold);
    for (let k = 0; k < 5; k++) { const rr = 2.75 - k * .55; for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2; v.block(Math.cos(t) * rr * .82, 3.35 + k * .24, Math.sin(t) * rr * .82, rr * .42, .24, rr * .42, (i + k) % 2 ? 0xa8172c : C.cream); } }
    for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2; v.block(Math.cos(t) * 2.62, 3.12, Math.sin(t) * 2.62, .62, .24, .62, i % 2 ? 0xa8172c : C.cream); v.block(Math.cos(t) * 2.72, 3.0, Math.sin(t) * 2.72, .12, .12, .12, i % 3 ? 0xffc06a : 0xe8b0ff, true); }
    v.block(0, 4.55, 0, .3, .5, .3, C.gold); v.block(0, 5.05, 0, .06, .7, .06, 0x2a2430); v.block(.22, 5.5, 0, .4, .22, .03, 0x7d4fa3);
    carousel.add(v.build({ glow: 1.95 })); }
  const HORSES = 6, horseGeo = mergeBoxes([[0, 0, 0, .9, .38, .3, 0xf0e8dc], [.42, .3, 0, .22, .42, .22, 0xf0e8dc], [.58, .6, 0, .36, .2, .2, 0xf0e8dc], [.3, .44, 0, .28, .3, .06, 0xd8a83a], [-.05, .33, 0, .4, .1, .34, 0xa8172c],
    [-.5, .05, 0, .24, .1, .1, 0xd8a83a], [.35, -.42, .09, .08, .42, .08, 0xf0e8dc], [.35, -.42, -.09, .08, .42, .08, 0xf0e8dc], [-.32, -.36, .09, .08, .36, .08, 0xf0e8dc], [-.32, -.36, -.09, .08, .36, .08, 0xf0e8dc], [.05, -.9, 0, .06, 3.9, .06, C.gold]], true);
  const horses = new THREE.InstancedMesh(horseGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), HORSES); horses.frustumCulled = false; carousel.add(horses);
  [0xffffff, 0x8a7a9a, 0xffffff, 0xd8b090, 0xffffff, 0x9aa0c8].forEach((c, i) => horses.setColorAt(i, new THREE.Color(c)));

  // ---- Fireflies over the Copse, the moth-yard and the Green's edges.
  const flyCount = 160, flyPos = new Float32Array(flyCount * 3), fly = Array.from({ length: flyCount }, (_, i) => {
    const [x0, z0, x1, z1] = FLY_ZONES[i % FLY_ZONES.length], x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
    return placed({ x, z, y: H(x, z) + .4 + r() * 1.6, p: r() * 9, s: .3 + r() * .5 });
  });
  const flyGeo = new THREE.BufferGeometry(); flyGeo.setAttribute("position", new THREE.BufferAttribute(flyPos, 3));
  const fireflies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ color: new THREE.Color(1.6, 1.9, .9), size: .16, transparent: true, opacity: .9, depthWrite: false, toneMapped: false })); fireflies.frustumCulled = false; group.add(fireflies);

  let built = {};
  // Scratch transforms belong to this layer, never to an individual animal.
  const v3 = new THREE.Vector3(), crowEnd = new THREE.Vector3(), headOffset = new THREE.Vector3(0, .37, .2), unitScale = new THREE.Vector3(1, 1, 1), wingTurn = new THREE.Matrix4();
  const cm = new THREE.Matrix4(), cl = new THREE.Matrix4(), co = new THREE.Matrix4(), cq = new THREE.Quaternion(), ce = new THREE.Euler(), cs = new THREE.Vector3(1.1, 1.1, 1.1), flipY = new THREE.Matrix4().makeRotationY(Math.PI);
  function tickCrow(c, i, time, dt) {
    if (c.fly > 0) {
      c.t += dt / c.fly; const t = Math.min(1, c.t), a = c.from, b = c.to, lift = Math.sin(t * Math.PI) * (2.4 + Math.hypot(b[0] - a[0], b[2] - a[2]) * .12);
      const A = W(a[0], a[2], a[1], v3), B = W(b[0], b[2], b[1], crowEnd); c.pos.lerpVectors(A, B, t); c.pos.y += lift; c.rot = Math.atan2(B.x - A.x, B.z - A.z);
      c.flap = Math.sin(time * 18) * .9 * (t < .9 ? 1 : (1 - t) * 10); c.headYaw = 0; c.headPitch = 0;
      if (t >= 1) { c.fly = 0; c.at = b; c.wait = 3 + Math.random() * 9; c.flap = -.15; }
    } else {
      c.wait -= dt; const [x, y, z] = c.at;
      W(x, z, y, c.pos); c.rot = c.yaw + Math.sin(time * .5 + c.yaw) * .3; c.headYaw = Math.sin(time * 1.3 + c.yaw * 3) * .7; c.headPitch = 0; c.flap = -.15;
      if (c.wait <= 0) { let next; do next = PERCHES[(Math.random() * PERCHES.length) | 0]; while (next === c.at); c.from = c.at; c.to = next; c.t = 0; c.fly = 1.6 + Math.hypot(next[0] - x, next[2] - z) * .09; c.yaw = Math.random() * 6; }
    }
    cm.compose(c.pos, cq.setFromEuler(ce.set(0, c.rot, 0)), cs); crowBody.setMatrixAt(i, cm);
    co.multiplyMatrices(cm, cl.compose(headOffset, cq.setFromEuler(ce.set(c.headPitch, c.headYaw, 0)), unitScale)); crowHead.setMatrixAt(i, co); crowEyes.setMatrixAt(i, co);
    wingTurn.makeRotationZ(c.flap);
    cl.makeTranslation(0, .24, 0).multiply(wingTurn); crowWings.setMatrixAt(i * 2, co.multiplyMatrices(cm, cl));
    cl.makeTranslation(0, .24, 0).multiply(flipY).multiply(wingTurn); crowWings.setMatrixAt(i * 2 + 1, co.multiplyMatrices(cm, cl));
  }
  function tickSquirrel(q, time, dt) {
    q.t += dt; const rr = q.rr;
    if (q.state === "sit") {
      W(q.x, q.z, 0, q.g.position); q.g.rotation.x = -.5 * Math.min(1, q.t * 3); q.tail.rotation.x = Math.sin(time * 6) * .25;
      if (q.t > q.wait) { q.g.rotation.x = 0; const home = pieceAt(q.x, q.z), near = TREES.filter((t) => pieceAt(t[0], t[1]) === home), tree = (near.length ? near : TREES)[(rr() * (near.length || TREES.length)) | 0], a = rr() * 6.28, d = 1.4 + rr() * 2.4; q.tx = tree[0] + Math.cos(a) * d; q.tz = tree[1] + Math.sin(a) * d; q.state = rr() < .25 ? "toClimb" : "run"; q.tree = tree; q.t = 0; }
    } else if (q.state === "run" || q.state === "toClimb") {
      const tx = q.state === "toClimb" ? q.tree[0] + .35 : q.tx, tz = q.state === "toClimb" ? q.tree[1] : q.tz, dx = tx - q.x, dz = tz - q.z, d = Math.hypot(dx, dz), step = Math.min(d, dt * 4.2);
      q.x += dx / (d || 1) * step; q.z += dz / (d || 1) * step;
      W(q.x, q.z, Math.abs(Math.sin(time * 14)) * .14, q.g.position); q.g.rotation.y = Math.atan2(dx, -dz); q.tail.rotation.x = -.3 + Math.sin(time * 14) * .2;
      if (d < .05) { q.state = q.state === "toClimb" ? "climb" : "sit"; q.t = 0; q.wait = 1.5 + rr() * 4; }
    } else if (q.state === "climb") {
      const up = q.t < 2.4 ? q.t / 2.4 : q.t < 5 ? 1 : Math.max(0, 1 - (q.t - 5) / 2), y = up * 2.6;
      W(q.x, q.z, y, q.g.position); q.g.rotation.set(-Math.PI / 2 * (q.t < 5 ? 1 : -1), Math.PI / 2, 0); q.tail.rotation.x = Math.sin(time * 9) * .3;
      if (q.t > 7) { q.g.rotation.set(0, 0, 0); q.state = "sit"; q.t = 0; q.wait = 1 + rr() * 3; q.x -= .6; }
    }
  }
  // The surface remains in memory inside homes/caves. Its invisible particle
  // buffers need no posing/upload work, but the shared indoor lamps still flicker.
  let ticks = 0, hiddenTicks = 0, bufferUpdates = 0, matrixWrites = 0, pointWrites = 0, visible = true;
  const matricesPerTick = water.count + splash.count + falls.count + moths.count + leaves.count + CROWS * 5 + HORSES + GONDOLAS * 2;
  const animatedBuffers = [water.instanceMatrix, splash.instanceMatrix, falls.instanceMatrix, moths.instanceMatrix, leaves.instanceMatrix,
    smokeGeo.attributes.position, smokeGeo.attributes.size, smokeGeo.attributes.alpha, crowBody.instanceMatrix, crowHead.instanceMatrix,
    crowEyes.instanceMatrix, crowWings.instanceMatrix, horses.instanceMatrix, gondolas.instanceMatrix, gondolaLamps.instanceMatrix, flyGeo.attributes.position];
  return {
    group,
    // Which homes are built, so their chimneys smoke.
    setBuilt(b) { built = b ?? {}; },
    stats() { return { ticks, hiddenTicks, visible, bufferUpdates, matrixWrites, pointWrites, matricesPerTick, pointsPerTick: smokeCount + flyCount }; },
    tick(time, dt, camera, pool) {
      ticks++; visible = true;
      // Candlelight belongs to the current place, not to the hidden surface.
      pool?.forEach((l, i) => { l.intensity = (l.userData.base ?? 48) * (.86 + .14 * noise(time * 7.3 + i * 3.1)); });
      for (let parent = group; parent; parent = parent.parent) if (!parent.visible) { visible = false; hiddenTicks++; return; }
      matrixWrites += matricesPerTick; pointWrites += smokeCount + flyCount;
      // Water: beads along each arc, cycling; splashes where they land; a little jet over the moth.
      FS.forEach((F, fi) => {
        const k = F.r / 2.4, g = H(F.x, F.z);
        for (let a = 0; a < arcs; a++) {
          const ang = (a + .5) / arcs * Math.PI * 2;
          for (let b = 0; b < beads; b++) { const t = ((time * .9 + b / beads + a * .13) % 1), d = (1.08 + t * .82) * k, y = g + (1.5 + .2 * Math.sin(t * Math.PI * .6) - t * t * 1.08) * k; W(F.x + Math.cos(ang) * d, F.z + Math.sin(ang) * d, y, dummy.position); dummy.scale.set(1, 1 + t, 1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); water.setMatrixAt((fi * arcs + a) * beads + b, dummy.matrix); }
          const s = .6 + .4 * Math.sin(time * 7 + a); W(F.x + Math.cos(ang) * 1.92 * k, F.z + Math.sin(ang) * 1.92 * k, g + .45 * k, dummy.position); dummy.scale.set(s, 1, s); dummy.updateMatrix(); splash.setMatrixAt(fi * arcs + a, dummy.matrix);
        }
      });
      // Waterfalls: each bead pours over the lip, falls and quickens, then starts again at the top.
      D.falls.forEach((f, fi) => { for (let i = 0; i < fallBeads; i++) { const b = fallSpot[fi * fallBeads + i], t = (time * .55 * b.s + b.p) % 1, y = f.top + .1 - (f.top - f.foot) * t * t; const out = .25 + b.out + t * .5, k = f.w / 2.2; W(f.x + f.nx * out + (f.nx ? 0 : b.z * k), f.z + f.nz * out + (f.nx ? b.z * k : 0), y, dummy.position); dummy.rotation.set(0, 0, 0); const thin = f.w < 2 && i % 3 ? 0 : 1; dummy.scale.set(thin, (1 + t * 1.5) * thin, thin); dummy.updateMatrix(); falls.setMatrixAt(fi * fallBeads + i, dummy.matrix); } });
      // Moths.
      mothHome.forEach((m, i) => { const t = time * m.s + m.p; W(m.x + Math.cos(t) * m.r + noise(t * 2.3) * .15, m.z + Math.sin(t * 1.3) * m.r, m.y + Math.sin(t * 2.1) * .35, dummy.position); dummy.rotation.set(0, -t, Math.sin(time * 40 + i) * .9); dummy.scale.setScalar(1); dummy.updateMatrix(); moths.setMatrixAt(i, dummy.matrix); });
      // Leaves.
      leaf.forEach((L, i) => {
        let age = time - L.born; if (age > L.life) { L.born = time; age = 0; L.ox = (Math.random() - .5) * 3.4; L.oz = (Math.random() - .5) * 3.4; }
        const fall = Math.min(1, age / (L.h / .7)), y = Math.max(.03, L.h * (1 - fall)), drift = age * .35, sway = Math.sin(age * L.sway * 2 + L.p) * .5;
        WBy(L.tree[0] + L.ox + drift + sway, L.tree[1] + L.oz + sway * .4, y, L.tree, dummy.position);
        dummy.rotation.set(y > .05 ? Math.sin(age * L.spin) * 1.1 : 0, age * L.spin * .3, y > .05 ? Math.cos(age * L.spin * .7) * .8 : 0); dummy.scale.setScalar(1); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
      });
      // Smoke.
      chimneys.forEach((c, ci) => { const on = !c.home || built[c.home]; for (let k = 0; k < PUFFS; k++) { const i = ci * PUFFS + k, p = k / PUFFS, t = (time * .12 + p) % 1; const j = i * 3; smokePos[j] = c.x + t * 1.6 + Math.sin(time * .5 + p * 6) * .2; smokePos[j + 1] = c.y + .3 + t * 3.2; smokePos[j + 2] = -(c.z - t * .4); smokeSize[i] = .6 + t * 2.2; smokeAlpha[i] = on ? .34 * (1 - t) * Math.min(1, t * 6) : 0; } });
      // Birds and squirrels.
      crows.forEach((c, i) => tickCrow(c, i, time, dt));
      owl.head.rotation.y = Math.sin(time * .35) * 1.4 + (Math.sin(time * .9) > .97 ? .6 : 0);
      for (const q of squirrels) tickSquirrel(q, time, dt);
      // The spire turns its beam; the wheel turns.
      beam.rotation.y = time * .35; wheel.rotation.z = time * .12; carousel.rotation.y = time * .4;
      for (let i = 0; i < HORSES; i++) { const t = i / HORSES * Math.PI * 2; dummy.position.set(Math.cos(t) * 1.85, 1.05 + Math.sin(time * 2.2 + i * 1.7) * .18, Math.sin(t) * 1.85); dummy.rotation.set(0, Math.PI / 2 - t, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); horses.setMatrixAt(i, dummy.matrix); }
      for (let i = 0; i < GONDOLAS; i++) { const t = i / GONDOLAS * Math.PI * 2 + wheel.rotation.z; dummy.position.set(Math.cos(t) * WR, Math.sin(t) * WR, 0); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); gondolas.setMatrixAt(i, dummy.matrix); dummy.position.y -= .04; dummy.updateMatrix(); gondolaLamps.setMatrixAt(i, dummy.matrix); }
      // Fireflies.
      fly.forEach((f, i) => { const t = time * f.s + f.p; const j = i * 3; flyPos[j] = f.x + Math.sin(t) * .8; flyPos[j + 1] = f.y + Math.sin(t * 1.7) * .3; flyPos[j + 2] = -(f.z + Math.cos(t * .8) * .8); });
      fireflies.material.opacity = .6 + .3 * Math.sin(time * 2.2);
      for (const buffer of animatedBuffers) buffer.needsUpdate = true;
      bufferUpdates += animatedBuffers.length;
    },
  };
}
