// The carving bench's pumpkin at high density (carving-view.js), and the
// lanterns kept on the doorstep (house-estate-view.js).
//
// Each variety's shape is worked out once per density and kept: a hollow shell
// T voxels thick round a cavity, the front surface a stencil lies on, and a lid
// round the stem. A build meshes only the faces that show, with baked shade in
// every crease (voxel-mesh.js), so rebuilding after each cut stays quick.
//
// Cuts go through the front shell where `cut(u, v)` says (u across and v up the
// front, -1 to 1); etching peels the skin where `etch(u, v)` says, leaving the
// flesh. Unlit, the cut walls and the inside are pale flesh; lit, they glow in
// the candle's colours, brightest nearest the candle.
import * as THREE from "three";
import { VoxelGrid, meshGrid } from "./voxel-mesh.js";
import { VARIETIES } from "./model.js";
import { lobeShape, shapedForm, LEAF, tone, scale } from "./pumpkins.js";

export const CARVE_R = 40, LANTERN_R = 16;
const FLESH = 0xf0c06a, FLESH_DEEP = 0xc98c42, FLESH_SHADE = 0x8c5a2a, RIM = 0x5c2410, SEAM = 0x2e140a, WAX = 0xf3e9d2;

// Shared by every build, so a rebuild never disposes them (disposeEstateObject skips these).
const RIND = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .64, metalness: 0 });
const GLOW = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
const PULP = new THREE.MeshStandardMaterial({ roughness: .8, metalness: 0 });
for (const m of [RIND, GLOW, PULP]) m.userData.sharedEstate = true;
const BOX = new THREE.BoxGeometry(1, 1, 1);

// Colour sums on 0xrrggbb, and a stable random number per voxel, so a rebuild
// after a cut keeps every fleck where it was.
const hash = (x, y, z, k = 0) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(k + 7, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const clamp8 = (n) => Math.max(0, Math.min(255, Math.round(n)));
const mixHex = (a, b, t) => (clamp8(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t) << 16) | (clamp8(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t) << 8) | clamp8((a & 255) + ((b & 255) - (a & 255)) * t);
const mulHex = (a, k) => (clamp8(((a >> 16) & 255) * k) << 16) | (clamp8(((a >> 8) & 255) * k) << 8) | clamp8((a & 255) * k);
const jitter = (a, amount, h) => mulHex(a, 1 + (h - .5) * 2 * amount);
const smooth = (t, a, b) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };

// One variety's shape at one density, kept. D holds each voxel's depth into the
// shell (1 is the skin, T the inner wall, 255 the cavity, 0 outside), and shell
// lists the shell's voxels. For each front column (x, y): fz is the front voxel,
// fi the deepest one a cut takes. For each top column (x, z): top is the
// highest voxel; cavTop and cavFloor are the cavity's roof and floor. `shape` is
// one of content/pumpkin-shapes.js's: ribbed, round, tall, squat or warty.
const shapes = new Map();
export function carvingShape(variety, R = CARVE_R, shape = "ribbed") {
  const key = variety + ":" + R + ":" + shape; let sh = shapes.get(key); if (sh) return sh;
  const f = shapedForm(variety, shape), H = Math.round(f.tall * 2 * R), N = 2 * R, NN = N * N, T = Math.max(2, Math.round(R * .075));
  const { lobe, inside, bump } = lobeShape({ R, H, lobes: f.lobes, groove: f.groove, crease: f.crease, squash: f.squash, dimple: f.dimple, warts: f.warts ?? 0, seed: variety + 1 });
  const at = (x, y, z) => (y * N + x + R) * N + z + R, D = new Uint8Array(NN * H);
  // With an even number of lobes (and no warts) each quarter is the same, so one is worked out and mirrored.
  const even = f.lobes % 2 === 0 && !f.warts;
  for (let y = 0; y < H; y++) for (let x = even ? 0 : -R; x < R; x++) for (let z = even ? 0 : -R; z < R; z++) {
    if (!inside(x, y, z)) continue;
    D[at(x, y, z)] = 255;
    if (even) D[at(-x - 1, y, z)] = D[at(x, y, -z - 1)] = D[at(-x - 1, y, -z - 1)] = 255;
  }
  const d = (x, y, z) => x < -R || x >= R || z < -R || z >= R || y < 0 || y >= H ? 0 : D[at(x, y, z)];
  // Peel the shell from the outside in, a layer at a time; what's left is the cavity.
  let layer = [];
  for (let i = 0; i < D.length; i++) {
    if (D[i] !== 255) continue;
    const y = i / NN | 0, gx = (i / N | 0) % N, gz = i % N;
    if (!gx || gx === N - 1 || !gz || gz === N - 1 || !y || y === H - 1 || !D[i - N] || !D[i + N] || !D[i - 1] || !D[i + 1] || !D[i - NN] || !D[i + NN]) { D[i] = 1; layer.push(i); }
  }
  const shell = [...layer];
  for (let k = 2; k <= T; k++) {
    const next = [];
    for (const i of layer) {
      const y = i / NN | 0, gx = (i / N | 0) % N, gz = i % N;
      for (const j of [gx > 0 ? i - N : -1, gx < N - 1 ? i + N : -1, gz > 0 ? i - 1 : -1, gz < N - 1 ? i + 1 : -1, y > 0 ? i - NN : -1, y < H - 1 ? i + NN : -1]) if (j >= 0 && D[j] === 255) { D[j] = k; next.push(j); }
    }
    for (const j of next) shell.push(j);
    layer = next;
  }
  const fz = new Int16Array(N * H).fill(-1), fi = new Int16Array(N * H);
  for (let x = -R; x < R; x++) for (let y = 0; y < H; y++) {
    const c = (x + R) * H + y; let z = R - 1;
    while (z >= 0 && !D[at(x, y, z)]) z--;
    if (z < 0) continue;
    fz[c] = z; let b = z;
    while (b - 1 >= 0 && D[at(x, y, b - 1)] >= 1 && D[at(x, y, b - 1)] <= T && z - (b - 1) < 2 * T) b--;
    fi[c] = b;
  }
  const top = new Int16Array(NN).fill(-1), cavTop = new Int16Array(NN).fill(-1), cavFloor = new Int16Array(NN).fill(-1);
  for (let x = -R; x < R; x++) for (let z = -R; z < R; z++) {
    const c = (x + R) * N + z + R;
    for (let y = H - 1; y >= 0; y--) { const v = D[at(x, y, z)]; if (v && top[c] < 0) top[c] = y; if (v === 255) { if (cavTop[c] < 0) cavTop[c] = y; cavFloor[c] = y; } }
  }
  const rl = Math.round(R * .4), base = top[R * N + R] + 1;
  sh = { variety, shape, f, R, H, N, T, D, at, d, lobe, bump, shell: Int32Array.from(shell), fz, fi, top, cavTop, cavFloor, rl, base };
  shapes.set(key, sh); return sh;
}

// The stem, leaf and tendril on top, in grid voxels: `put(x, y, z, colour)`.
// At carving density the stem is thicker and each bend step is k voxels tall.
function crown(sh, put) {
  const { f, R, base } = sh, k = Math.max(1, Math.round(R / 20)), w = R >= 32 ? 7 : R >= 16 ? 5 : 3, half = (w - 1) / 2;
  const wood = f.wood, dark = scale(wood, .7), pale = tone(wood, .02, -.1, .12), cutEnd = tone(wood, .04, -.15, .3);
  const bend = f.bend.flatMap(([bx, bz]) => Array.from({ length: k }, () => [bx * k, bz * k]));
  for (let i = -half - 1; i <= half + 1; i++) for (let j = -half - 1; j <= half + 1; j++)
    if (Math.abs(i) + Math.abs(j) <= half + 1 && (Math.abs(i) > half || Math.abs(j) > half)) put(i, base - 1, j, jitter(dark, .06, hash(i, base, j)));
  bend.forEach(([bx, bz], row) => {
    for (let i = -half; i <= half; i++) for (let j = -half; j <= half; j++) {
      const edge = Math.abs(i) === half || Math.abs(j) === half, corner = edge && Math.abs(i) === half && Math.abs(j) === half;
      if (w > 3 && corner) continue;
      const furrow = w > 3 ? (i + j + 8) % 2 === 1 : corner;
      put(bx + i, base + row, bz + j, jitter(!edge ? wood : furrow ? dark : Math.floor(row / k) % 3 === 2 ? pale : wood, .05, hash(i, row, j, 1)));
    }
  });
  const [ex, ez] = bend[bend.length - 1];
  for (let i = -half; i <= half; i++) for (let j = -half; j <= half; j++) if (!(w > 3 && Math.abs(i) === half && Math.abs(j) === half)) put(ex + i, base + bend.length, ez + j, Math.abs(i) < half && Math.abs(j) < half ? cutEnd : pale);
  // The leaf lies over the shoulder from the stem's foot; the tendril curls up beside it.
  const angle = [-0.5, -2.4, -0.9, -2.0, -.6][sh.variety] ?? -.5, ca = Math.cos(angle), sa = Math.sin(angle), seen = new Set();
  const rows = LEAF.flatMap((row) => Array.from({ length: k }, () => [...row].flatMap((ch) => Array(k).fill(ch))));
  const surface = (x, z) => x < -R || x >= R || z < -R || z >= R ? 0 : sh.top[(x + R) * sh.N + z + R] + 1;
  rows.forEach((row, w2) => row.forEach((ch, u) => {
    if (ch === ".") return;
    const across = w2 - (rows.length - 1) / 2, x = Math.round((u + 1.5 * k) * ca - across * sa), z = Math.round((u + 1.5 * k) * sa + across * ca), key = x + "," + z;
    if (seen.has(key)) return; seen.add(key);
    put(x, Math.max(surface(x, z), base + 1 - Math.round(u * .4)), z, jitter(ch === "v" ? 0x3f5c22 : u > row.length * .7 ? 0x6d8f34 : 0x5a7f2e, .06, hash(x, 0, z, 2)));
  }));
  const dir = [0.5, -0.4, 2.6, 0.9, .7][sh.variety] ?? .5, dx = Math.cos(dir), dz = Math.sin(dir), length = R / 2.2, radius = R / 8, turns = 1.6;
  const tx = length * dx, tz = length * dz, lift = surface(Math.round(tx), Math.round(tz)), side = dx < 0 ? -1 : 1;
  for (let t = 1.5; t < length; t += .5) put(Math.round(t * dx), surface(Math.round(t * dx), Math.round(t * dz)), Math.round(t * dz), 0x8d9b3c);
  for (let t = 0; t <= 1; t += .3 / (turns * radius * 6.3)) {
    const phi = -Math.PI / 2 + t * turns * Math.PI * 2, rad = radius * (1 - t * .7);
    put(Math.round(tx + side * Math.cos(phi) * rad), Math.round(lift + radius + Math.sin(phi) * rad), Math.round(tz), 0x8d9b3c);
  }
  return { height: base + bend.length + 1 };
}

// Meshes voxels collected as [x, y, z, colour, glow] in pumpkin grid units,
// with the pumpkin's own origin, into lit and glowing meshes.
function meshVoxels(list, s, R) {
  if (!list.length) return new THREE.Group();
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const [x, y, z] of list) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z); x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z); }
  const grid = new VoxelGrid(x1 - x0 + 1, y1 - y0 + 1, z1 - z0 + 1);
  for (const [x, y, z, c, g] of list) grid.set(x - x0, y - y0, z - z0, c, g);
  return group(meshGrid(grid, { scale: s, offset: [x0 * s, y0 * s, z0 * s] }));
}
function group([lit, glow]) {
  const g = new THREE.Group();
  if (lit) { const m = new THREE.Mesh(lit, RIND); m.castShadow = m.receiveShadow = true; g.add(m); }
  if (glow) g.add(new THREE.Mesh(glow, GLOW));
  return g;
}
const rindOf = (sh, colour) => {
  const groovy = tone(scale(colour, .55), -.02, .12, 0), light = tone(colour, .012, 0, .08);
  const tint = Array.from({ length: sh.f.lobes }, (_, i) => 1 + (hash(i, 3, sh.variety) - .5) * .09), stripe = Math.min(1, sh.f.groove / .15);
  return (x, y, z) => {
    const px = x + .5, pz = z + .5, [bulge, i] = sh.lobe(px, pz), up = (y + .5) / sh.H;
    // Dark in the grooves, lightest on the crown of each lobe, darker underneath
    // and round the stem; each lobe a shade apart, with the odd pale fleck.
    // The grooves darken as deep as they run: a round pumpkin is barely striped.
    let c = mixHex(groovy, colour, 1 - stripe * (1 - smooth(bulge, .35, .85)));
    if (bulge > .85) c = mixHex(c, light, Math.min(1, (bulge - .85) * 4 * (.4 + up)));
    if (up > .6 && Math.hypot(px, pz) < sh.R * .3) c = mixHex(c, groovy, .3);
    if (hash(x, y, z, 4) < .015) c = mixHex(c, light, .5);
    // Warts are paler on top.
    if (sh.f.warts) { const b = sh.bump(px, pz, (y + .5 - sh.H / 2) / (sh.H / 2)); if (b > .25) c = mixHex(c, light, Math.min(.55, b * .6)); }
    return jitter(mulHex(c, tint[i] * (.84 + .18 * up)), .02, hash(x, y, z, 5));
  };
};
// Midnight Moon's painted moon and stars, on the rind.
function marked(sh, x, y, z) {
  const a = Math.atan2(x + .5, z + .5), my = (y + .5) / sh.H;
  return Math.hypot((a + .33) / .23, (my - .6) / .23) < 1 && Math.hypot((a + .23) / .23, (my - .66) / .23) > .9
    || [[.35, .68, .11], [-.77, .4, .085], [.7, .38, .09], [2.5, .65, .1], [-2, .53, .09]].some(([sx, sy, sz]) => Math.abs(a - sx) / sz + Math.abs(my - sy) / (sz * .6) < 1);
}

// Meshes the listed voxels of a build: a face wherever the next cell isn't
// solid, shaded at each corner by its neighbours, as voxel-mesh.js does for the
// rooms, but visiting only the shell instead of the whole block. Cells index
// as (y * N + x) * N + z.
const LINEAR = Float32Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
const AO = [.52, .68, .84, 1];
const FACES = [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]].map(([a, s]) => ({ a, s, u: (a + 1) % 3, v: (a + 2) % 3 }));
const ORDER = FACES.map((f) => f.s > 0 ? [0, 1, 2, 3] : [0, 3, 2, 1]);
function meshCells(cells, kind, rgb, N, ny, solid, s, R) {
  const NN = N * N, STEP = [N, NN, 1], DIM = [N, ny, N], mask = new Uint8Array(cells.length), count = [0, 0];
  // First count the faces that show, so each mesh is written straight into its arrays.
  for (let ci = 0; ci < cells.length; ci++) {
    const i = cells[ci], k = kind[i]; if (!k) continue;
    const y = i / NN | 0, x = (i / N | 0) % N, z = i % N; let m = 0;
    if (x === N - 1 || !solid(i + N)) m |= 1; if (x === 0 || !solid(i - N)) m |= 2;
    if (y === ny - 1 || !solid(i + NN)) m |= 4; if (y === 0 || !solid(i - NN)) m |= 8;
    if (z === N - 1 || !solid(i + 1)) m |= 16; if (z === 0 || !solid(i - 1)) m |= 32;
    mask[ci] = m; count[k - 1] += (m & 1) + (m >> 1 & 1) + (m >> 2 & 1) + (m >> 3 & 1) + (m >> 4 & 1) + (m >> 5 & 1);
  }
  const out = count.map((faces) => faces ? { pos: new Float32Array(faces * 12), col: new Float32Array(faces * 12), nor: new Int8Array(faces * 12), idx: faces * 4 > 65535 ? new Uint32Array(faces * 6) : new Uint16Array(faces * 6), n: 0, t: 0 } : null);
  const c = [0, 0, 0], q = [0, 0, 0], px = [0, 0, 0], occ = [3, 3, 3, 3];
  const at = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < N && y < ny && z < N && solid((y * N + x) * N + z) ? 1 : 0;
  for (let ci = 0; ci < cells.length; ci++) {
    const m = mask[ci]; if (!m) continue;
    const i = cells[ci], k = kind[i], o = out[k - 1], cc = rgb[i], r = LINEAR[cc >> 16], g = LINEAR[(cc >> 8) & 255], b = LINEAR[cc & 255];
    c[1] = i / NN | 0; c[0] = (i / N | 0) % N; c[2] = i % N;
    for (let fi = 0; fi < 6; fi++) {
      if (!(m & (1 << fi))) continue;
      const f = FACES[fi], qa = c[f.a] + f.s;
      for (let n = 0; n < 4; n++) {
        if (k === 2) { occ[n] = 3; continue; }
        const du = n === 1 || n === 2 ? 1 : -1, dv = n >= 2 ? 1 : -1; q[0] = c[0]; q[1] = c[1]; q[2] = c[2]; q[f.a] = qa;
        q[f.u] += du; const s1 = at(q[0], q[1], q[2]);
        q[f.u] -= du; q[f.v] += dv; const s2 = at(q[0], q[1], q[2]);
        q[f.u] += du; const corner = at(q[0], q[1], q[2]);
        occ[n] = s1 && s2 ? 0 : 3 - s1 - s2 - corner;
      }
      const base = o.n, plane = f.s > 0 ? c[f.a] + 1 : c[f.a], order = ORDER[fi];
      for (let j = 0; j < 4; j++) {
        const n = order[j], v = (base + j) * 3;
        px[f.a] = plane; px[f.u] = c[f.u] + (n === 1 || n === 2 ? 1 : 0); px[f.v] = c[f.v] + (n >= 2 ? 1 : 0);
        o.pos[v] = (px[0] - R) * s; o.pos[v + 1] = px[1] * s; o.pos[v + 2] = (px[2] - R) * s;
        const light = AO[occ[n]]; o.col[v] = r * light; o.col[v + 1] = g * light; o.col[v + 2] = b * light;
        o.nor[v + f.a] = f.s;
      }
      o.n += 4;
      // Split along the brighter diagonal, so a dark corner stays in its corner.
      const t = o.t; o.t += 6;
      if (occ[order[0]] + occ[order[2]] < occ[order[1]] + occ[order[3]]) { o.idx[t] = base + 1; o.idx[t + 1] = base + 2; o.idx[t + 2] = base + 3; o.idx[t + 3] = base + 1; o.idx[t + 4] = base + 3; o.idx[t + 5] = base; }
      else { o.idx[t] = base; o.idx[t + 1] = base + 1; o.idx[t + 2] = base + 2; o.idx[t + 3] = base; o.idx[t + 4] = base + 2; o.idx[t + 5] = base + 3; }
    }
  }
  const half = R * s, sphere = new THREE.Sphere(new THREE.Vector3(0, ny * s / 2, 0), Math.hypot(half * Math.SQRT2, ny * s / 2));
  return out.map((o) => {
    if (!o) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(o.pos, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(o.nor, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(o.col, 3));
    geo.setIndex(new THREE.BufferAttribute(o.idx, 1));
    geo.boundingSphere = sphere.clone(); geo.boundingBox = new THREE.Box3(new THREE.Vector3(-half, 0, -half), new THREE.Vector3(half, ny * s, half));
    return geo;
  });
}

// The pumpkin on the bench or the doorstep.
//   lid: "none" (uncut), "off" (cut and lifted: no stem, the inside open) or
//   "on" (cut and set back, with its seam). lit: a candle burns inside.
export function buildCarving(variety, { R = CARVE_R, size = 1.8, shape = "ribbed", cut = null, etch = null, lid = "none", lit = false, glow = null, paint = null } = {}) {
  const sh = carvingShape(variety, R, shape), { H, N, T, D, fz, fi, top, cavTop, cavFloor, rl, shell } = sh, NN = N * N, s = size / N;
  const colour = paint ?? VARIETIES[variety].color, rind = rindOf(sh, colour), [bright, deep] = glow ?? [0xffd86c, 0xffa23c];
  const k = Math.max(1, Math.round(R / 20)), ny = Math.max(H + Math.ceil(R / 4), sh.base + sh.f.bend.length * k + 2) + 2, vol = NN * H;
  const kind = new Uint8Array(NN * ny), rgb = new Uint32Array(NN * ny), mark = new Uint8Array(vol), idx = (x, y, z) => (y * N + x + R) * N + z + R;
  // What's gone: 1 cut through, 2 the skin etched away, 3 lifted with the lid.
  let anyCut = false;
  if (cut || etch) for (let x = -R; x < R; x++) for (let y = 0; y < H; y++) {
    const c = (x + R) * H + y; if (fz[c] < 0) continue;
    const u = (x + .5) / R, v = (y + .5 - H / 2) / (H / 2);
    if (cut?.(u, v)) { anyCut = true; for (let z = fi[c]; z <= fz[c]; z++) mark[idx(x, y, z)] = 1; }
    else if (etch?.(u, v)) mark[idx(x, y, fz[c])] = 2;
  }
  const lidOff = lid === "off", open = lidOff || anyCut, rl2 = rl * rl, seam2 = (rl - 1.4) ** 2, rho2 = (x, z) => (x + .5) ** 2 + (z + .5) ** 2;
  if (lidOff) for (let x = -rl; x < rl; x++) for (let z = -rl; z < rl; z++) {
    if (rho2(x, z) >= rl2) continue;
    const c = (x + R) * N + z + R; for (let y = cavTop[c] + 1; y <= top[c]; y++) if (D[idx(x, y, z)]) mark[idx(x, y, z)] = 3;
  }
  for (const i of shell) if (!mark[i]) kind[i] = 1;
  // Shut, the cavity counts as solid, so its walls make no faces.
  const solid = open ? (j) => kind[j] !== 0 : (j) => kind[j] !== 0 || (j < vol && D[j] === 255);
  const cy = (cavFloor[R * N + R] >= 0 ? cavFloor[R * N + R] : T) + Math.max(3, Math.round(R * .2));
  const inner = (x, y, z) => { const t = Math.min(1, Math.hypot(x + .5, (y - cy) * 1.3, z + .5) / (R * 1.05)); return mulHex(mixHex(bright, deep, t), 1.02 - .5 * t); };
  const put = (i, c, g) => { rgb[i] = c; kind[i] = g ? 2 : 1; };
  for (const i of shell) {
    if (mark[i]) continue;
    const y = i / NN | 0, gx = (i / N | 0) % N, gz = i % N, x = gx - R, z = gz - R, h = hash(x, y, z);
    let out = false, cav = false, cutDir = -1, etched = false, lidRim = false;
    const look = (j, dir) => {
      if (j < 0) { out = true; return; }
      const nd = D[j];
      if (!nd) out = true;
      else if (nd === 255) { if (open) cav = true; }
      else { const m = mark[j]; if (m === 1) { if (cutDir < 0 || dir === 2 || dir === 3) cutDir = dir; } else if (m === 2) { if (dir === 4) etched = true; else out = true; } else if (m === 3) lidRim = true; }
    };
    look(gx < N - 1 ? i + N : -1, 0); look(gx > 0 ? i - N : -1, 1); look(y < H - 1 ? i + NN : -1, 2); look(y > 0 ? i - NN : -1, 3); look(gz < N - 1 ? i + 1 : -1, 4); look(gz > 0 ? i - 1 : -1, 5);
    if (etched) { put(i, lit ? jitter(mulHex(mixHex(bright, deep, .45), .74), .05, h) : jitter(FLESH, .05, h), lit); continue; }
    if (cutDir >= 0) {
      // A cut's wall: unlit, pale flesh; lit, candlelit, brightest on the floor
      // of each hole. Its outer edge is a dark rim once the candle burns.
      if (out) { put(i, lit ? jitter(RIM, .05, h) : rind(x, y, z), lit); continue; }
      const floor = cutDir === 2, roof = cutDir === 3;
      put(i, lit ? jitter(floor ? mixHex(bright, deep, .2) : roof ? mulHex(deep, .58) : mixHex(bright, deep, .6), .05, h) : jitter(floor ? FLESH : roof ? FLESH_DEEP : mixHex(FLESH, FLESH_DEEP, .45), .05, h), lit);
      continue;
    }
    if (lidRim) { put(i, lit ? jitter(mixHex(bright, deep, .5), .05, h) : jitter(out ? mixHex(FLESH, FLESH_DEEP, .3) : FLESH, .05, h), lit); continue; }
    if (cav && !out) { put(i, lit ? jitter(inner(x, y, z), .04, h) : jitter(mixHex(FLESH_DEEP, FLESH_SHADE, Math.max(0, .55 - (y / H) * .5)), .05, h), lit); continue; }
    if (out) {
      // The lid's seam, where the knife went round the stem.
      if (lid === "on" && D[i] === 1 && (y === H - 1 || !D[i + NN]) && rho2(x, z) < rl2 && rho2(x, z) >= seam2) { put(i, lit ? jitter(mixHex(bright, deep, .3), .04, h) : SEAM, lit); continue; }
      const glowMark = variety === 4 && !paint && marked(sh, x, y, z);
      put(i, glowMark ? 0xffd875 : rind(x, y, z), glowMark); continue;
    }
    put(i, FLESH, false);
  }
  // Extras on top of the shell: the stem, leaf and tendril, and once lit, the candle.
  const extra = [];
  const add = (x, y, z, c, g = false) => { if (x < -R || x >= R || z < -R || z >= R || y < 0 || y >= ny) return; const i = idx(x, y, z); if (!kind[i]) extra.push(i); put(i, c, g); };
  if (lit) {
    const rc = Math.max(1, Math.round(R * .06)), hc = Math.max(2, Math.round(R * .14)), y0 = cavFloor[R * N + R] >= 0 ? cavFloor[R * N + R] : T, fl = k;
    for (let x = -rc; x < rc; x++) for (let z = -rc; z < rc; z++) if ((x + .5) ** 2 + (z + .5) ** 2 <= rc * rc + .5) for (let y = y0; y < y0 + hc; y++) add(x, y, z, jitter(WAX, .03, hash(x, y, z, 6)));
    for (let y = 0; y < fl * 3; y++) for (let x = -1; x < Math.max(1, fl); x++) for (let z = -1; z < Math.max(1, fl); z++) add(x, y0 + hc + y, z, y < fl ? 0xffe9a0 : y < 2 * fl ? 0xffc04a : 0xff9a3a, true);
  }
  crown(sh, (x, y, z, c) => { if (!lidOff || rho2(x, z) >= rl2) add(x, y, z, c); });
  const cells = new Int32Array(shell.length + extra.length); cells.set(shell); cells.set(extra, shell.length);
  const g = group(meshCells(cells, kind, rgb, N, ny, solid, s, R));
  g.userData.carving = { R, H, s, size, T, stemTop: (sh.base + sh.f.bend.length * k + 1) * s };
  return g;
}

// The lid as its own piece: the shell round the stem above the cavity, with
// the stem and the leaf's root. It sits where it was cut, so placing it at the
// pumpkin's own position puts it back.
export function buildLid(variety, { R = CARVE_R, size = 1.8, shape = "ribbed", paint = null } = {}) {
  const sh = carvingShape(variety, R, shape), { H, N, D, at, d, cavTop, rl } = sh, s = size / N, rind = rindOf(sh, paint ?? VARIETIES[variety].color), list = [];
  const rl2 = rl * rl, inLid = (x, y, z) => (x + .5) ** 2 + (z + .5) ** 2 < rl2 && y > cavTop[(x + R) * N + z + R] && y < H && d(x, y, z) > 0;
  for (let x = -rl; x < rl; x++) for (let z = -rl; z < rl; z++) for (let y = 0; y < H; y++) {
    if (!inLid(x, y, z)) continue;
    const skin = D[at(x, y, z)] === 1 && !d(x, y + 1, z);
    list.push([x, y, z, skin ? rind(x, y, z) : jitter(FLESH, .05, hash(x, y, z)), false]);
  }
  crown(sh, (x, y, z, c) => { if ((x + .5) ** 2 + (z + .5) ** 2 < rl2) list.push([x, y, z, c, false]); });
  const g = meshVoxels(list, s, R); g.userData.lid = { bottom: Math.min(...list.map((v) => v[1])) * s };
  return g;
}

// The rind a cut piece takes with it, where `mask(u, v)` says: skin outside,
// pale flesh behind. It sits where it was, ready to fall.
export function buildChunk(variety, { R = CARVE_R, size = 1.8, shape = "ribbed", mask, paint = null } = {}) {
  const sh = carvingShape(variety, R, shape), { H, fz, fi } = sh, s = size / sh.N, rind = rindOf(sh, paint ?? VARIETIES[variety].color), list = [];
  for (let x = -R; x < R; x++) for (let y = 0; y < H; y++) {
    const c = (x + R) * H + y; if (fz[c] < 0 || !mask((x + .5) / R, (y + .5 - H / 2) / (H / 2))) continue;
    for (let z = fi[c]; z <= fz[c]; z++) list.push([x, y, z, z === fz[c] ? rind(x, y, z) : jitter(z === fi[c] ? FLESH_DEEP : FLESH, .05, hash(x, y, z)), false]);
  }
  return meshVoxels(list, s, R);
}

// Where things are on the pumpkin, in its own units (standing on y = 0):
// frontZ(u, v) on the face (null off it), topY(cx, cz) over the crown (cx and
// cz -1 to 1 across), the lid's radius, and the cavity's floor and roof.
export function carvingSurface(variety, { R = CARVE_R, size = 1.8, shape = "ribbed" } = {}) {
  const sh = carvingShape(variety, R, shape), { H, N, T } = sh, s = size / N;
  const frontZ = (u, v) => {
    const x = Math.floor(u * R), y = Math.floor(v * H / 2 + H / 2);
    if (x < -R || x >= R || y < 0 || y >= H) return null;
    const z = sh.fz[(x + R) * H + y]; return z < 0 ? null : (z + 1) * s;
  };
  const topY = (cx, cz) => {
    const x = Math.floor(cx * R), z = Math.floor(cz * R);
    if (x < -R || x >= R || z < -R || z >= R) return null;
    const y = sh.top[(x + R) * N + z + R]; return y < 0 ? null : (y + 1) * s;
  };
  const mid = R * N + R;
  return {
    R, H, s, size, height: H * s, frontZ, topY, lidRadius: sh.rl / R,
    point: (u, v) => { const z = frontZ(u, v); return z === null ? null : [u * R * s, (v * H / 2 + H / 2) * s, z]; },
    // The middle of the front face of the voxel under (u, v), for marks that sit on the grid.
    cell: (u, v) => { const x = Math.floor(u * R), y = Math.floor(v * H / 2 + H / 2), z = frontZ(u, v); return z === null ? null : [(x + .5) * s, (y + .5) * s, z]; },
    cavity: { floor: (sh.cavFloor[mid] >= 0 ? sh.cavFloor[mid] : T) * s, roof: (sh.cavTop[mid] + 1) * s, radius: (R - T) * s },
  };
}

// The pulp and seeds inside, for scooping out: one column of pulp per cavity
// column, lowest in the middle and clinging up the walls, with seeds in it.
// scoop(cx, cz, radius, amount) lowers the pulp round (cx, cz) (in pumpkin
// units) by up to `amount` of its first height, less towards the scoop's edge,
// and returns the seeds it freed, as world positions.
export function buildPulp(variety, { R = CARVE_R, size = 1.8, shape = "ribbed" } = {}) {
  const sh = carvingShape(variety, R, shape), { N, T, cavTop, cavFloor } = sh, s = size / N, cols = [];
  for (let x = -R; x < R; x++) for (let z = -R; z < R; z++) {
    const c = (x + R) * N + z + R; if (cavFloor[c] < 0) continue;
    const room = cavTop[c] - cavFloor[c] + 1, w = Math.hypot(x + .5, z + .5) / (R - T);
    const h = Math.max(1, Math.min(room - 1, Math.round(room * (.16 + .3 * w ** 4) + hash(x, 9, z) * 3 + (w > .85 ? hash(x, 8, z) * room * .2 : 0))));
    cols.push({ x, z, floor: cavFloor[c], h, h0: h });
  }
  const mesh = new THREE.InstancedMesh(BOX, PULP, cols.length), m = new THREE.Matrix4(), colour = new THREE.Color();
  const place = (i) => { const p = cols[i]; m.makeScale(s, Math.max(.0001, p.h * s), s).setPosition((p.x + .5) * s, (p.floor + p.h / 2) * s, (p.z + .5) * s); mesh.setMatrixAt(i, m); };
  cols.forEach((p, i) => { place(i); mesh.setColorAt(i, colour.setHex(jitter(hash(p.x, 2, p.z) < .2 ? 0xd98a2e : hash(p.x, 3, p.z) < .5 ? 0xf0a640 : 0xe8b45a, .08, hash(p.x, 4, p.z)))); });
  mesh.castShadow = false; mesh.receiveShadow = true;
  const seedCount = [42, 34, 46, 38, 50][variety] ?? 40, seeds = [], seedMesh = new THREE.InstancedMesh(BOX, PULP, seedCount);
  for (let i = 0; i < seedCount; i++) {
    const p = cols[Math.floor(hash(i, 11, variety) * cols.length)], y = p.floor + Math.max(1, Math.floor(hash(i, 12, variety) * p.h0));
    seeds.push({ col: p, y, out: false });
    m.compose(new THREE.Vector3((p.x + .5) * s, (y + .5) * s, (p.z + .5) * s), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hash(i, 13, 0) * Math.PI, (hash(i, 14, 0) - .5) * .6)), new THREE.Vector3(s * 1.9, s * .7, s * 1.2));
    seedMesh.setMatrixAt(i, m); seedMesh.setColorAt(i, colour.setHex(jitter(0xf2e3bd, .05, hash(i, 15, 0))));
  }
  const g = new THREE.Group(); g.add(mesh, seedMesh);
  const total = cols.reduce((n, p) => n + p.h0, 0);
  return {
    group: g, seedCount,
    scoop(cx, cz, radius, amount) {
      const r = radius / s, x0 = cx / s - .5, z0 = cz / s - .5, freed = [];
      let touched = false;
      cols.forEach((p, i) => {
        const dist = Math.hypot(p.x - x0, p.z - z0); if (dist > r || !p.h) return;
        const cutBy = Math.min(p.h, amount * p.h0 * (1 - dist / r)); if (cutBy <= 0) return;
        p.h = p.h - cutBy < .15 ? 0 : p.h - cutBy; place(i); touched = true;
      });
      if (touched) mesh.instanceMatrix.needsUpdate = true;
      seeds.forEach((sd, i) => { if (!sd.out && sd.col.h <= sd.y - sd.col.floor) { sd.out = true; m.makeScale(0, 0, 0); seedMesh.setMatrixAt(i, m); freed.push(new THREE.Vector3((sd.col.x + .5) * s, (sd.y + .5) * s, (sd.col.z + .5) * s)); } });
      if (freed.length) seedMesh.instanceMatrix.needsUpdate = true;
      return freed;
    },
    // How much is left, 0 to 1.
    get left() { return cols.reduce((n, p) => n + p.h, 0) / total; },
    get seedsOut() { return seeds.filter((sd) => sd.out).length; },
    dispose() { mesh.dispose(); seedMesh.dispose(); },
  };
}
