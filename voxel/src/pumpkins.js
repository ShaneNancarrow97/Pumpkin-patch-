// Pumpkins: the plots' pumpkins (one template per variety, cloned per plot),
// the sprouts, the giant jack-o'-lantern and the little ones dotted round the yard.
import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { VARIETIES } from "./model.js";

const tone = (hex, h, s, l) => new THREE.Color(hex).offsetHSL(h, s, l).getHex();
const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
const scale = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();

// A squat pumpkin of rounded lobes, on a grid of R voxels either side of the
// middle and H high. The radius dips between lobes, so the grooves are real,
// and they run on over the shoulders as creases into a dimple round the stem.
// Only voxels open to the side or the sky are kept: nothing ever sees the
// inside or the underside. `carve(x, y)` cuts a face, in -1..1 across and up,
// two voxels deep onto a candlelit back.
// Whether the voxel at (x, y, z) is inside a lobed pumpkin's shape.
function lobeShape({ R, H, lobes, groove, crease = 0.2, squash = 2.3, dimple = 0.3 }) {
  const lobe = (x, z) => { const u = Math.atan2(x, z) * lobes / (2 * Math.PI), i = Math.round(u); return [Math.cos(Math.PI * (u - i)) ** 0.5, (i + lobes) % lobes]; };
  const inside = (x, y, z) => {
    const px = x + 0.5, pz = z + 0.5, rho = Math.hypot(px, pz), bulge = lobe(px, pz)[0];
    let t = (y + 0.5 - H / 2) / (H / 2);
    if (t > 0) t += dimple * Math.exp(-((rho / (R * 0.3)) ** 2)) + crease * (1 - bulge) * Math.min(1, rho / (R * 0.45));
    return !(Math.abs(t) >= 1 || rho > R * (1 - groove * (1 - bulge)) * (1 - Math.abs(t) ** squash) ** (1 / squash));
  };
  return { lobe, inside };
}
// `glow` recolours the candlelit flesh ([bright, deep]); `chunk(x, y)` builds
// only the rind a cut piece takes with it, for the carving bench.
function lobed(v, { R, H, s, lobes, groove, crease = 0.2, squash = 2.3, dimple = 0.3, color, r, markings = false, carve = null, glow = null, chunk = null, x0 = 0, y0 = 0, z0 = 0 }) {
  const N = 2 * R + 2, id = (x, y, z) => ((y + 1) * N + x + R + 1) * N + z + R + 1, at = (x, y, z) => solid[id(x, y, z)] === 1;
  const solid = new Uint8Array(N * N * (H + 2)), top = new Int8Array(N * N);
  const { lobe, inside } = lobeShape({ R, H, lobes, groove, crease, squash, dimple });
  for (let y = 0; y < H; y++) for (let x = -R; x < R; x++) for (let z = -R; z < R; z++) {
    if (!inside(x, y, z)) continue;
    solid[id(x, y, z)] = 1; top[(x + R + 1) * N + z + R + 1] = y + 1;
  }
  const depth = (x, y, z) => { let d = 1; while (at(x, y, z + d)) d++; return d; };     // voxels to the front surface
  const face = (x, y) => carve && carve((x + 0.5) / R, (y + 0.5 - H / 2) / (H / 2));
  const hole = (x, y, z) => at(x, y, z) && z > 0 && face(x, y) && depth(x, y, z) <= 2;
  const groovy = tone(scale(color, 0.55), -0.02, 0.12, 0), light = tone(color, 0.012, 0, 0.08);
  const tint = Array.from({ length: lobes }, () => 1 + (r() - 0.5) * 0.09);
  const put = (x, y, z, c, glow) => v.box(x0 + x * s, y0 + y * s, z0 + z * s, s, s, s, c, glow);
  const [bright, deep] = glow ?? [0xffd86c, 0xffa23c];
  const lit = glow ? { floor: mix(bright, deep, .25), roof: scale(deep, .55), side: mix(bright, deep, .6) } : { floor: 0xffc458, roof: 0x9a4416, side: 0xe08a30 };
  if (chunk) {
    // Only the shell a piece takes away: rind outside, pale flesh behind.
    for (let y = 0; y < H; y++) for (let x = -R; x < R; x++) for (let z = 1; z < R; z++) {
      if (!at(x, y, z) || !chunk((x + 0.5) / R, (y + 0.5 - H / 2) / (H / 2))) continue;
      const d = depth(x, y, z); if (d > 2) continue;
      put(x, y, z, d === 1 ? vary(color, 0.04, r) : vary(0xf3c06a, 0.05, r), false);
    }
    return { base: 0, top: () => 0 };
  }
  for (let y = 0; y < H; y++) for (let x = -R; x < R; x++) for (let z = -R; z < R; z++) {
    if (!at(x, y, z) || hole(x, y, z)) continue;
    const open = !at(x + 1, y, z) || !at(x - 1, y, z) || !at(x, y, z + 1) || !at(x, y, z - 1) || !at(x, y + 1, z);
    if (z > 0 && face(x, y) && depth(x, y, z) === 3) { put(x, y, z, mix(bright, deep, r() * 0.6), true); continue; }
    const below = hole(x, y + 1, z), above = hole(x, y - 1, z), cut = below || above || hole(x + 1, y, z) || hole(x - 1, y, z);
    if (!open && !cut) continue;
    // The cut is drawn unlit, so the lantern on the stage can't wash it out: a
    // dark rim round each shape, then candlelit flesh, brightest on the floor.
    if (cut) { put(x, y, z, vary(open ? 0x5c2410 : below ? lit.floor : above ? lit.roof : lit.side, 0.05, r), true); continue; }
    const px = x + 0.5, pz = z + 0.5, [bulge, i] = lobe(px, pz), up = (y + 0.5) / H;
    // Dark in the grooves, lightest on the crown of each lobe, darker underneath
    // and round the stem; each lobe a shade apart, with the odd pale fleck.
    let c = mix(groovy, color, THREE.MathUtils.smoothstep(bulge, 0.35, 0.85));
    if (bulge > 0.85) c = mix(c, light, (bulge - 0.85) * 4 * (0.4 + up));
    if (up > 0.6 && Math.hypot(px, pz) < R * 0.3) c = mix(c, groovy, 0.3);
    if (r() < 0.015) c = mix(c, light, 0.5);
    // Paint follows the curved rind rather than a floating front-facing card.
    const a = Math.atan2(px, pz), my = up;
    const moon = markings && Math.hypot((a + .33) / .23, (my - .6) / .23) < 1 && Math.hypot((a + .23) / .23, (my - .66) / .23) > .9;
    const star = markings && [[.35,.68,.11],[-.77,.4,.085],[.7,.38,.09],[2.5,.65,.1],[-2,.53,.09]].some(([sx,sy,sz]) => Math.abs(a-sx)/sz + Math.abs(my-sy)/(sz*.6) < 1);
    put(x, y, z, moon || star ? 0xffd875 : vary(scale(c, tint[i] * (0.84 + 0.18 * up)), 0.02, r), moon || star);
  }
  // Where the stem goes: the bottom of the dimple, and the surface height anywhere.
  return { base: top[(R + 1) * N + R + 1], top: (x, z) => (Math.abs(x) <= R && Math.abs(z) <= R ? top[(x + R + 1) * N + z + R + 1] : 0) };
}

// A woody stem rising from (x, y, z) in grid voxels: w wide (3 or 5), flared at
// the foot, ridged (furrowed corners, light ridges), bending as `bend` says,
// with a pale cut end.
function stem(v, { s, x0 = 0, y0 = 0, z0 = 0, r }, x, y, z, w, bend, wood) {
  const half = (w - 1) / 2, dark = scale(wood, 0.7), pale = tone(wood, 0.02, -0.1, 0.12), cut = tone(wood, 0.04, -0.15, 0.3);
  const put = (px, py, pz, c, h = 1) => v.box(x0 + px * s, y0 + py * s, z0 + pz * s, s, s * h, s, c);
  for (let i = -half - 1; i <= half + 1; i++) for (let k = -half - 1; k <= half + 1; k++)
    if (Math.abs(i) + Math.abs(k) <= half + 1 && (Math.abs(i) > half || Math.abs(k) > half)) put(x + i, y - 1, z + k, vary(dark, 0.06, r));
  bend.forEach(([bx, bz], j) => {
    for (let i = -half; i <= half; i++) for (let k = -half; k <= half; k++) {
      const edge = Math.abs(i) === half || Math.abs(k) === half, corner = Math.abs(i) === half && Math.abs(k) === half;
      if (w > 3 && corner) continue;                                                    // a thick stem is round
      if (!edge && j < bend.length - 1) continue;
      const furrow = w > 3 ? (i + k + 8) % 2 === 1 : corner;
      put(x + bx + i, y + j, z + bz + k, vary(!edge ? wood : furrow ? dark : j % 3 === 2 ? pale : wood, 0.05, r));
    }
  });
  const [bx, bz] = bend[bend.length - 1];
  for (let i = -half; i <= half; i++) for (let k = -half; k <= half; k++)
    if (!(w > 3 && Math.abs(i) === half && Math.abs(k) === half)) put(x + bx + i, y + bend.length, z + bz + k, Math.abs(i) < half && Math.abs(k) < half ? cut : pale, 0.35);
}

// A leaf draped over the pumpkin from the stem, and a curly tendril beside it.
function leafAndTendril(v, { s, x0 = 0, y0 = 0, z0 = 0, r }, form, rows, angle, curl) {
  const put = (px, py, pz, c, k = 1) => v.box(x0 + px * s - (k - 1) * s / 2, y0 + py * s, z0 + pz * s - (k - 1) * s / 2, s * k, s * k, s * k, c);
  const ca = Math.cos(angle), sa = Math.sin(angle), seen = new Set(), green = 0x5a7f2e;
  rows.forEach((row, w) => [...row].forEach((ch, u) => {
    if (ch === ".") return;
    const across = w - (rows.length - 1) / 2, x = Math.round((u + 1.5) * ca - across * sa), z = Math.round((u + 1.5) * sa + across * ca), key = x + "," + z;
    if (seen.has(key)) return;
    seen.add(key);
    put(x, Math.max(form.top(x, z), form.base + 1 - u * 0.4), z, vary(ch === "v" ? 0x3f5c22 : u > row.length * 0.7 ? 0x6d8f34 : green, 0.06, r));
  }));
  // The tendril runs out over the shoulder, then curls up into a spiral facing the viewer.
  const { dir, turns, radius, length } = curl, dx = Math.cos(dir), dz = Math.sin(dir), ex = length * dx, ez = length * dz;
  const lift = form.top(Math.round(ex), Math.round(ez)), side = dx < 0 ? -1 : 1, vine = 0x8d9b3c;
  for (let d = 1.5; d < length; d += 0.5) put(d * dx, form.top(Math.round(d * dx), Math.round(d * dz)), d * dz, vine, 0.6);
  for (let t = 0; t <= 1; t += 0.35 / (turns * radius * 6.3)) {
    const phi = -Math.PI / 2 + t * turns * Math.PI * 2, rad = radius * (1 - t * 0.7);
    put(ex + side * Math.cos(phi) * rad, lift + radius + Math.sin(phi) * rad, ez, vine, 0.6);
  }
}

// Each variety has its own shape: the classic orange, flat pale Moonlight,
// tall purple Witchfire and round golden Starlight.
const FORMS = [
  { lobes: 10, tall: 0.68, groove: 0.16, squash: 2.3, wood: 0x9a8e3e, bend: [[0, 0], [0, 0], [0, 0], [1, 0], [1, 0], [2, 0]] },
  { lobes: 8, tall: 0.59, groove: 0.17, squash: 2.7, wood: 0xa8b07c, bend: [[0, 0], [0, 0], [0, 0], [-1, 0], [-1, 0]] },
  { lobes: 10, tall: 0.73, groove: 0.15, squash: 2.1, wood: 0x6a7c44, bend: [[0, 0], [0, 0], [0, 0], [1, 0], [1, 0], [2, 0], [3, 0]] },
  { lobes: 8, tall: 0.68, groove: 0.14, squash: 2.1, wood: 0xa4803c, bend: [[0, 0], [0, 0], [0, 0], [0, -1], [-1, -1], [-1, -1]] },
];
FORMS.push({ lobes: 10, tall: .71, groove: .15, squash: 2.3, wood: 0x8b954e, bend: [[0,0],[0,0],[1,0],[1,0],[2,0],[2,0]] });
const LEAF = ["...##....", "..####...", ".######..", "vvvvvvvv.", ".#######.", "..#####..", "...##...."];

// Pumpkins for the plots, one template per variety: `size` is the half-width,
// standing on y = 0. Each is built once; the plots, the shop's tables and the
// menu thumbnails all clone it.
const templates = new Map();
export function pumpkinTemplate(variety, size = 0.62) {
  const key = variety + ":" + size;
  if (!templates.has(key)) templates.set(key, buildPumpkin(variety, size));
  return templates.get(key);
}
function buildPumpkin(variety, size) {
  const v = new Voxels(), r = seeded(variety + 3), f = FORMS[variety], R = 13, at = { s: size / R, r };
  const form = lobed(v, { ...at, R, H: Math.round(f.tall * 2 * R), lobes: f.lobes, groove: f.groove, squash: f.squash, color: VARIETIES[variety].color, markings: variety === 4 });
  stem(v, at, 0, form.base, 0, 3, f.bend, f.wood);
  leafAndTendril(v, at, form, LEAF, [-0.5, -2.4, -0.9, -2.0, -.6][variety], { dir: [0.5, -0.4, 2.6, 0.9, .7][variety], turns: 1.6, radius: 1.6, length: 6 });
  return v.build();
}
// The carving bench's pumpkin: the variety's own shape at carving density,
// standing on y = 0 and `size` across, cut wherever `cut(u, v)` says (u across
// and v up the front, -1 to 1). `glow` lights the flesh, `paint` recolours the
// rind, and `chunk(u, v)` builds only the rind a piece takes when it pops out.
export function carvingPumpkin(variety, { R = 22, size = 1.8, cut = null, chunk = null, glow = null, paint = null, stem: withStem = true } = {}) {
  const f = FORMS[variety] ?? FORMS[0], v = new Voxels(), r = seeded(variety * 7 + 11), at = { s: size / (2 * R), r };
  const H = Math.round(f.tall * 2 * R);
  const form = lobed(v, { ...at, R, H, lobes: f.lobes, groove: f.groove, squash: f.squash, color: paint ?? VARIETIES[variety].color, markings: variety === 4 && !paint, carve: cut, glow, chunk });
  if (!chunk && withStem) {
    stem(v, at, 0, form.base, 0, R >= 16 ? 5 : 3, f.bend.map(([x, z]) => [x * (R >= 16 ? 2 : 1), z]), f.wood);
    leafAndTendril(v, at, form, LEAF, [-0.5, -2.4, -0.9, -2.0, -.6][variety] ?? -.5, { dir: [0.5, -0.4, 2.6, 0.9, .7][variety] ?? .5, turns: 1.6, radius: R / 8, length: R / 2.2 });
  }
  const group = v.build(); group.userData.carving = { R, H, s: at.s, stemTop: (form.base + f.bend.length + 1) * at.s };
  return group;
}
// Where the carving pumpkin's front surface is, for laying the stencil and the
// knife on it: frontZ(u, v) in world units (null off the pumpkin), and the
// world point for (u, v).
export function carvingSurface(variety, { R = 22, size = 1.8 } = {}) {
  const f = FORMS[variety] ?? FORMS[0], H = Math.round(f.tall * 2 * R), s = size / (2 * R);
  const { inside } = lobeShape({ R, H, lobes: f.lobes, groove: f.groove, squash: f.squash });
  const frontZ = (u, v) => {
    const x = Math.floor(u * R), y = Math.floor(v * H / 2 + H / 2);
    if (x < -R || x >= R || y < 0 || y >= H) return null;
    for (let z = R - 1; z >= 0; z--) if (inside(x, y, z)) return (z + 1) * s;
    return null;
  };
  return { R, H, s, height: H * s, frontZ, point: (u, v) => { const z = frontZ(u, v); return z === null ? null : [u * R * s, (v * H / 2 + H / 2) * s, z]; } };
}
export function sproutTemplate() {
  const v = new Voxels();
  v.box(-0.04, 0, -0.04, 0.08, 0.32, 0.08, 0x5c8a3a);
  v.box(-0.2, 0.26, -0.06, 0.18, 0.06, 0.12, 0x6fa046); v.box(0.02, 0.32, -0.06, 0.18, 0.06, 0.12, 0x6fa046);
  return v.build();
}

// The giant jack-o'-lantern: the same lobed pumpkin at twice the density, with a
// face cut through the rind onto the candlelit inside.
export function bigPumpkin() {
  const v = new Voxels(), r = seeded(99), R = 24, at = { s: 1.71 / R, r };
  // The face from the main game's big pumpkin: two triangular eyes and a smile.
  const carve = (x, y) => {
    const eye = y > 0.04 && y < 0.54 && Math.abs(Math.abs(x) - 0.38) < 0.21 * (0.54 - y) / 0.5;
    const smile = Math.abs(x) < 0.36 && y < -0.18 + 0.9 * x * x && y > -0.44 + 1.6 * x * x;
    return eye || smile;
  };
  const form = lobed(v, { ...at, R, H: 37, lobes: 12, groove: 0.13, crease: 0.2, dimple: 0.26, color: 0xe8701a, carve });
  stem(v, at, 0, form.base, 0, 7, [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [-1, 0], [-1, 0], [-2, 0], [-3, 0], [-4, 0], [-4, 0], [-3, 0]], 0x8e8a3c);
  leafAndTendril(v, at, form, ["....###.....", "...#####....", "..#######...", ".#########..", "vvvvvvvvvvv.", ".##########.", "..########..", "...######...", "....###....."], -0.35, { dir: 0.45, turns: 1.8, radius: 3.4, length: 15 });
  return v.build();
}

// A small pumpkin for the world's big batches, in 28 boxes: eight lobes round a
// darker core, so grooves show between them, each rounded off by a smaller box
// above and below, then a stem and a leaf. It centres on (x + 0.11s, z + 0.11s)
// with its front at z + 0.66s, where the jack-o'-lanterns put their faces.
export function pumpkinBlock(v, x, y, z, s, color, r) {
  const cx = x + s * 0.11, cz = z + s * 0.11, groove = tone(scale(color, 0.62), -0.015, 0.1, 0), light = tone(color, 0.01, 0, 0.04);
  v.block(cx, y, cz, s * 0.6, s * 0.66, s * 0.6, groove);
  for (let k = 0; k < 8; k++) {
    // Lobes on the axes reach the full radius; the diagonal ones sit a little in, so the outline is round.
    const a = k * Math.PI / 4, diag = k % 2, d = diag ? 0.27 : 0.36, w = diag ? 0.26 : 0.36, h = diag ? 0.5 : 0.56, lift = diag ? 0.08 : 0.06;
    const lx = cx + Math.round(Math.sin(a) * 100) / 100 * (diag ? Math.SQRT2 : 1) * d * s, lz = cz + Math.round(Math.cos(a) * 100) / 100 * (diag ? Math.SQRT2 : 1) * d * s;
    const c = vary(diag ? scale(color, 0.9) : color, 0.05, r);
    v.block(lx, y + lift * s, lz, w * s, h * s, w * s, c);
    v.block(lx - Math.sign(lx - cx) * 0.05 * s, y + (lift + h) * s, lz - Math.sign(lz - cz) * 0.05 * s, (w - 0.1) * s, 0.1 * s, (w - 0.1) * s, vary(light, 0.04, r));
    v.block(lx - Math.sign(lx - cx) * 0.05 * s, y, lz - Math.sign(lz - cz) * 0.05 * s, (w - 0.1) * s, lift * s, (w - 0.1) * s, scale(c, 0.85));
  }
  v.block(cx, y + s * 0.62, cz, s * 0.1, s * 0.22, s * 0.1, 0x6a6428);                   // stem, leaning over at the tip
  v.block(cx + s * 0.05, y + s * 0.8, cz, s * 0.1, s * 0.08, s * 0.08, 0x8a843a);
  v.block(cx + s * 0.16, y + s * 0.66, cz - s * 0.12, s * 0.22, s * 0.04, s * 0.14, 0x557a2e);   // leaf
}
