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
// `farmView`: only ever seen by the farm's camera, which looks north and down
// and never turns, so the sides facing east, west and north are left out (two
// fifths of the cobbles' triangles).
export function buildGround(bounds, cell, { farmView = false } = {}) {
  const { x0, x1, z0, z1 } = bounds, nx = Math.round((x1 - x0) / G), nz = Math.round((z1 - z0) / G);
  const hgt = new Float32Array(nx * nz), col = new Uint32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const [h, c] = cell(x0 + (i + 0.5) * G, z0 + (j + 0.5) * G);
    hgt[j * nx + i] = Math.round(h * 200) / 200; col[j * nx + i] = c;
  }
  const pos = [], nor = [], rgb = [], idx = [], linear = new THREE.Color();
  const quad = (corners, normal, c) => {
    const n = pos.length / 3;
    linear.setHex(c, THREE.SRGBColorSpace);
    for (const p of corners) { pos.push(...p); nor.push(...normal); rgb.push(linear.r, linear.g, linear.b); }
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  };
  const at = (i, j) => (i < 0 || j < 0 || i >= nx || j >= nz ? -0.5 : hgt[j * nx + i]);
  for (let j = 0; j < nz; j++) {
    const za = z0 + j * G, zb = za + G;
    // Tops: runs of equal height and colour along the row merge into one quad.
    for (let i = 0; i < nx;) {
      const k = j * nx + i, h = hgt[k], c = col[k];
      let e = i + 1;
      while (e < nx && hgt[j * nx + e] === h && col[j * nx + e] === c) e++;
      const xa = x0 + i * G, xb = x0 + e * G;
      quad([[xa, h, za], [xa, h, zb], [xb, h, zb], [xb, h, za]], [0, 1, 0], c);
      i = e;
    }
    // Sides, where a column stands above its neighbour: a touch darker.
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i, h = hgt[k], c = shade(col[k], 0.22), xa = x0 + i * G, xb = xa + G;
      const east = at(i + 1, j), west = at(i - 1, j), south = at(i, j + 1), north = at(i, j - 1);
      if (farmView) { if (south < h) quad([[xa, south, zb], [xb, south, zb], [xb, h, zb], [xa, h, zb]], [0, 0, 1], shade(col[k], 0.1)); continue; }
      if (east < h) quad([[xb, east, za], [xb, h, za], [xb, h, zb], [xb, east, zb]], [1, 0, 0], c);
      if (west < h) quad([[xa, west, zb], [xa, h, zb], [xa, h, za], [xa, west, za]], [-1, 0, 0], c);
      if (south < h) quad([[xa, south, zb], [xb, south, zb], [xb, h, zb], [xa, h, zb]], [0, 0, 1], shade(col[k], 0.1));
      if (north < h) quad([[xb, north, za], [xa, north, za], [xa, h, za], [xb, h, za]], [0, 0, -1], c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(rgb, 3));
  geo.setIndex(idx.length > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
  mesh.receiveShadow = true;
  return mesh;
}

export const grounds = { cobble, grass, soil, bed };
