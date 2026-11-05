import * as THREE from "three";

// The yard's ground as one dense height field: a column per cell, 1/10 unit
// across, drawn as its top and whichever sides stand above a neighbour. That
// gives the farm real cobbles with grout between them, tufty grass, fallen
// leaves and the patch's tilled soil, at a fraction of the cost of a box per
// voxel: runs of the same height and colour along a row share one quad.
export const G = 1 / 10;

const hash = (i, j, k = 0) => {
  let h = (i * 374761393 + j * 668265263 + k * 1274126177) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
// Smooth value noise, for patches of grass and damp soil.
function noise(x, z) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash(i, j, 9), b = hash(i + 1, j, 9), c = hash(i, j + 1, 9), d = hash(i + 1, j + 1, 9);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}
const mix = (a, b, t) => {
  const ar = a >> 16, ag = (a >> 8) & 255, ab = a & 255;
  return (Math.round(ar + ((b >> 16) - ar) * t) << 16) | (Math.round(ag + (((b >> 8) & 255) - ag) * t) << 8) | Math.round(ab + ((b & 255) - ab) * t);
};
const shade = (c, t) => mix(c, 0x000000, t), tint = (c, t) => mix(c, 0xffffff, t);

// Stones on a jittered grid: each point belongs to its nearest stone, and
// where it is nearly as close to the next one, it's the grout between them.
function stoneAt(x, z, size, seed) {
  const gx = x / size, gz = z / size, ci = Math.floor(gx), cj = Math.floor(gz);
  let d1 = Infinity, d2 = Infinity, id = 0;
  for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
    const px = i + 0.15 + hash(i, j, seed) * 0.7, pz = j + 0.15 + hash(i, j, seed + 1) * 0.7, d = Math.hypot(gx - px, (gz - pz) * 1.15);
    if (d < d1) { d2 = d1; d1 = d; id = i * 7919 + j; } else if (d < d2) d2 = d;
  }
  return { id, gap: (d2 - d1) * size, edge: d1 * size };
}

// What a cell of ground is, by where it lies: [height, colour]. `at` gives the
// region and its palette (from world.js, which knows the layout).
function cobble(x, z, palette, size, seed, grout) {
  const s = stoneAt(x, z, size, seed);
  if (s.gap < 0.045) return [0.005, grout];
  const k = hash(s.id, seed, 3), base = palette[Math.floor(k * palette.length)], lift = 0.035 + Math.round(hash(s.id, seed, 4) * 3) * 0.012;
  // A rounded shoulder: the stone's rim a step lower and darker, its crown lit.
  const rim = s.gap < 0.08, colour = mix(base, k < 0.5 ? 0x000000 : 0xffffff, hash(s.id, seed, 5) * 0.12);
  return [lift, rim ? shade(colour, 0.16) : colour];
}

const GRASS = [0x2e3020, 0x36321f, 0x2a2a1e, 0x3a3222, 0x433a24];
const LEAVES = [0x8a2f1e, 0xc2552a, 0xe08a2e, 0x6a2a3a, 0xa8402a, 0x5a2a4a];
function grass(x, z) {
  const n = noise(x * 0.9, z * 0.9), i = Math.round(x / G), j = Math.round(z / G), h = hash(i, j, 21);
  // Fallen leaves in drifts, a cell or two each, lying on top of the grass.
  const leaf = hash(Math.floor(i / 2), Math.floor(j / 2), 22);
  if (leaf < 0.07 + n * 0.08) return [0.05 + h * 0.02, LEAVES[Math.floor(hash(Math.floor(i / 2), Math.floor(j / 2), 23) * LEAVES.length)]];
  const c = mix(GRASS[Math.floor(n * 4.99)], GRASS[Math.floor(h * 4.99)], 0.35);
  // Tufts stand up here and there; the rest is a little uneven.
  const block = hash(Math.floor(i / 3), Math.floor(j / 3), 24);
  return h < 0.06 ? [0.08, tint(c, 0.1)] : [0.015 + (block < 0.4 ? 0.015 : 0), shade(c, h * 0.12)];
}

// Tilled soil: ridges running across the patch with damp furrows between,
// crumbly clods, the odd pebble and wisps of straw.
const SOIL = { ridge: 0x6b4630, mid: 0x553623, furrow: 0x3a2318, clod: 0x7a5238, pebble: 0x8a7c84, straw: 0xc9a650 };
function soil(x, z) {
  // The rows wander a little, as if dug by hand.
  const zz = z + Math.sin(x * 1.3 + z) * 0.06 + (noise(x * 0.5, z * 0.5) - 0.5) * 0.18;
  const i = Math.round(x / G), j = Math.round(z / G), p = (Math.cos((zz / 0.5) * Math.PI * 2) + 1) / 2, h = hash(i, j, 31);
  const damp = noise(x * 0.7, z * 0.7), crumb = hash(Math.floor(i / 2), Math.floor(j / 2), 34);
  if (hash(Math.floor(i / 2), Math.floor(j / 2), 32) < 0.02) return [0.06 + p * 0.06, mix(SOIL.pebble, 0x5a5060, h)];
  if (p > 0.6 && hash(Math.floor(i / 3), j, 33) < 0.012) return [0.05 + p * 0.07, SOIL.straw];
  const clod = crumb < 0.2 + p * 0.15;
  const height = 0.01 + Math.round(p * 4) * 0.018 + (clod ? 0.02 + Math.round(crumb * 3) * 0.02 : 0);
  const c = clod ? mix(SOIL.clod, SOIL.ridge, crumb * 3) : mix(SOIL.furrow, SOIL.ridge, p * 0.85 + h * 0.15);
  return [height, shade(c, damp * 0.25 + h * 0.08)];
}

// A raised bed for each plot: a low mound of loose earth, darker where it's
// been watered, with a crumbly rim.
function bed(x, z, plot) {
  const dx = (x - plot.x) / 0.78, dz = (z - plot.z) / 0.62, d = dx * dx + dz * dz;
  if (d > 1) return null;
  const i = Math.round(x / G), j = Math.round(z / G), h = hash(i, j, 41), crumb = hash(Math.floor(i / 2), Math.floor(j / 2), 42);
  const top = 0.05 + Math.round(Math.sqrt(1 - d) * 6) * 0.03 + (crumb < 0.25 ? 0.02 : 0);
  // Dark, freshly watered earth on top; a lighter, crumbling rim round it.
  const c = d > 0.7 ? mix(SOIL.clod, SOIL.ridge, crumb) : mix(0x2e1c14, 0x45291b, h * 0.6 + crumb * 0.4);
  return [top, c];
}

// Builds the ground mesh over [x0, x1) x [z0, z1): cell(x, z) → [height, colour].
// Each cell's colour lives in a texture, one texel a cell, drawn sharp, so the
// geometry only has to follow the heights: rectangles of one height merge into
// a single top quad (cobbles, grass and soil come to a few hundred thousand
// triangles fewer), and the sides merge along their runs, sampling the cells
// they stand under. Vertex colours only shade the sides. `farmView`: the
// sides the management camera never sees (east, west, north) go in a child
// mesh, `far`, hidden until the play camera turns about (scene.js shows it).
export function buildGround(bounds, cell, { farmView = false } = {}) {
  const { x0, x1, z0, z1 } = bounds, nx = Math.round((x1 - x0) / G), nz = Math.round((z1 - z0) / G);
  const hgt = new Float32Array(nx * nz), texels = new Uint8Array(nx * nz * 4);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const [h, c] = cell(x0 + (i + 0.5) * G, z0 + (j + 0.5) * G), k = j * nx + i;
    hgt[k] = Math.round(h * 200) / 200;
    texels[k * 4] = (c >> 16) & 255; texels[k * 4 + 1] = (c >> 8) & 255; texels[k * 4 + 2] = c & 255; texels[k * 4 + 3] = 255;
  }
  const near = { pos: [], nor: [], uv: [], rgb: [], idx: [] }, far = farmView ? { pos: [], nor: [], uv: [], rgb: [], idx: [] } : near;
  let into = near;
  const U = (x) => (x - x0) / (x1 - x0), V = (z) => (z - z0) / (z1 - z0);
  // A quad's corners with their texture points and a shade (1 on top).
  const quad = (corners, uvs, normal, shade) => {
    const b = normal[2] === 1 || normal[1] === 1 ? near : into, n = b.pos.length / 3;
    corners.forEach((p, q) => { b.pos.push(...p); b.nor.push(...normal); b.uv.push(...uvs[q]); b.rgb.push(shade, shade, shade); });
    b.idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  };
  into = far;
  const at = (i, j) => (i < 0 || j < 0 || i >= nx || j >= nz ? -0.5 : hgt[j * nx + i]);
  // Tops: greedy rectangles of equal height.
  const done = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i; if (done[k]) continue;
    const h = hgt[k]; let w = 1, d = 1;
    while (i + w < nx && !done[k + w] && hgt[k + w] === h) w++;
    grow: while (j + d < nz) { for (let q = 0; q < w; q++) { const m = (j + d) * nx + i + q; if (done[m] || hgt[m] !== h) break grow; } d++; }
    for (let r = 0; r < d; r++) done.fill(1, (j + r) * nx + i, (j + r) * nx + i + w);
    const xa = x0 + i * G, xb = x0 + (i + w) * G, za = z0 + j * G, zb = z0 + (j + d) * G;
    quad([[xa, h, za], [xa, h, zb], [xb, h, zb], [xb, h, za]], [[U(xa), V(za)], [U(xa), V(zb)], [U(xb), V(zb)], [U(xb), V(za)]], [0, 1, 0], 1);
  }
  // Sides facing south and north: runs along a row with the same step down.
  // The texture point sits in the middle of the cell's row, so each stretch
  // shows the colour of the cell above it.
  for (let j = 0; j < nz; j++) {
    const vm = (j + 0.5) / nz;
    for (const [dj, zEdge, normal, shade] of [[1, z0 + (j + 1) * G, [0, 0, 1], 0.9], [-1, z0 + j * G, [0, 0, -1], 0.78]]) {
      for (let i = 0; i < nx;) {
        const h = hgt[j * nx + i], o = at(i, j + dj);
        if (o >= h) { i++; continue; }
        let e = i + 1;
        while (e < nx && hgt[j * nx + e] === h && at(e, j + dj) === o) e++;
        const xa = x0 + i * G, xb = x0 + e * G, ua = U(xa), ub = U(xb);
        if (dj > 0) quad([[xa, o, zEdge], [xb, o, zEdge], [xb, h, zEdge], [xa, h, zEdge]], [[ua, vm], [ub, vm], [ub, vm], [ua, vm]], normal, shade);
        else quad([[xb, o, zEdge], [xa, o, zEdge], [xa, h, zEdge], [xb, h, zEdge]], [[ub, vm], [ua, vm], [ua, vm], [ub, vm]], normal, shade);
        i = e;
      }
    }
  }
  // Sides facing east and west: runs down a column.
  for (let i = 0; i < nx; i++) {
    const um = (i + 0.5) / nx;
    for (const [di, xEdge, normal] of [[1, x0 + (i + 1) * G, [1, 0, 0]], [-1, x0 + i * G, [-1, 0, 0]]]) {
      for (let j = 0; j < nz;) {
        const h = hgt[j * nx + i], o = at(i + di, j);
        if (o >= h) { j++; continue; }
        let e = j + 1;
        while (e < nz && hgt[e * nx + i] === h && at(i + di, e) === o) e++;
        const za = z0 + j * G, zb = z0 + e * G, va = V(za), vb = V(zb);
        if (di > 0) quad([[xEdge, o, za], [xEdge, h, za], [xEdge, h, zb], [xEdge, o, zb]], [[um, va], [um, va], [um, vb], [um, vb]], normal, 0.78);
        else quad([[xEdge, o, zb], [xEdge, h, zb], [xEdge, h, za], [xEdge, o, za]], [[um, vb], [um, vb], [um, va], [um, va]], normal, 0.78);
        j = e;
      }
    }
  }
  const map = new THREE.DataTexture(texels, nx, nz);
  map.colorSpace = THREE.SRGBColorSpace; map.magFilter = THREE.NearestFilter; map.minFilter = THREE.LinearMipmapLinearFilter; map.generateMipmaps = true; map.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: 0.95, metalness: 0 });
  const build = (b) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(b.nor, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(b.uv, 2));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(b.rgb, 3));
    geo.setIndex(b.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(b.idx, 1) : new THREE.Uint16BufferAttribute(b.idx, 1));
    const mesh = new THREE.Mesh(geo, material); mesh.receiveShadow = true; return mesh;
  };
  const mesh = build(near);
  if (far !== near && far.pos.length) { const back = build(far); back.visible = false; back.userData.groundFar = true; mesh.add(back); }
  return mesh;
}

export const grounds = { cobble, grass, soil, bed };
