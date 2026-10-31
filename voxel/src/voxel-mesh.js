import * as THREE from "three";

// A dense voxel grid and a mesher for it. Unlike voxels.js (one instanced box
// per voxel), this emits only the faces that show, with vertex colours and
// baked ambient occlusion, so creases, undersides and contact points darken by
// themselves. Glowing voxels go into a second, unlit mesh so they bloom.
// x runs right, y up, z from the back (0) towards the viewer.
export class VoxelGrid {
  constructor(nx, ny, nz) {
    Object.assign(this, { nx, ny, nz });
    this.kind = new Uint8Array(nx * ny * nz);                     // 0 empty, 1 solid, 2 glowing
    this.rgb = new Uint32Array(nx * ny * nz);                      // 0xrrggbb, sRGB
  }
  index(x, y, z) { return (z * this.ny + y) * this.nx + x; }
  inside(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.nx && y < this.ny && z < this.nz; }
  filled(x, y, z) { return this.inside(x, y, z) && this.kind[this.index(x, y, z)] !== 0; }
  set(x, y, z, colour, glow = false) {
    if (!this.inside(x, y, z)) return;
    const i = this.index(x, y, z);
    this.kind[i] = glow ? 2 : 1; this.rgb[i] = colour;
  }
  clear(x, y, z) { if (this.inside(x, y, z)) this.kind[this.index(x, y, z)] = 0; }
  get count() { let n = 0; for (const k of this.kind) n += k !== 0; return n; }
}

// sRGB byte to linear, once.
const LINEAR = Float32Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
// Light reaching a corner with 0 to 3 of its neighbours filled: soft, never black.
const AO = [0.52, 0.68, 0.84, 1];
// Each face: the axis it faces along, its sign, and two edge axes whose cross
// product points out of the face, so the corners wind counter-clockwise.
const FACES = [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]].map(([a, s]) => ({ a, s, u: (a + 1) % 3, v: (a + 2) % 3 }));

// Meshes the grid: one BufferGeometry for the lit voxels and one for the
// glowing ones (either may be null). Each voxel is `scale` units, and voxel
// (0, 0, 0)'s corner sits at `offset`. Neighbouring faces of one colour and
// even shading merge into one quad (greedy meshing), so flat colour is cheap.
export function meshGrid(grid, { scale = 1, offset = [0, 0, 0], ao = true } = {}) {
  const { nx, ny, nz, kind, rgb } = grid, dims = [nx, ny, nz];
  const out = [1, 2].map(() => ({ pos: [], col: [], nor: [], idx: [], n: 0 }));
  const solid = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < nx && y < ny && z < nz && kind[(z * ny + y) * nx + x] !== 0;
  const c = [0, 0, 0], q = [0, 0, 0], occ = [0, 0, 0, 0];
  for (const f of FACES) {
    const nu = dims[f.u], nv = dims[f.v];
    // Per slice: each face's colour, and a key of its kind and four corner shades (0 = no face).
    const colour = new Uint32Array(nu * nv), key = new Uint16Array(nu * nv);
    for (let w = 0; w < dims[f.a]; w++) {
      key.fill(0);
      for (let v = 0; v < nv; v++) for (let u = 0; u < nu; u++) {
        c[f.a] = w; c[f.u] = u; c[f.v] = v;
        const at = (c[2] * ny + c[1]) * nx + c[0], k = kind[at];
        if (!k) continue;
        q[0] = c[0]; q[1] = c[1]; q[2] = c[2]; q[f.a] += f.s;
        if (solid(q[0], q[1], q[2])) continue;
        // How shut in each corner is: the classic three-neighbour test.
        for (let i = 0; i < 4; i++) {
          if (!ao || k === 2) { occ[i] = 3; continue; }
          const du = i === 1 || i === 2 ? 1 : -1, dv = i >= 2 ? 1 : -1;
          q[f.u] += du; const s1 = solid(q[0], q[1], q[2]);
          q[f.u] -= du; q[f.v] += dv; const s2 = solid(q[0], q[1], q[2]);
          q[f.u] += du; const corner = solid(q[0], q[1], q[2]);
          q[f.u] -= du; q[f.v] -= dv;
          occ[i] = s1 && s2 ? 0 : 3 - s1 - s2 - corner;
        }
        colour[v * nu + u] = rgb[at];
        key[v * nu + u] = 1 + (k - 1) * 256 + occ[0] + occ[1] * 4 + occ[2] * 16 + occ[3] * 64;
      }
      // Grow rectangles of matching faces; only evenly shaded faces merge, so the shading stays put.
      for (let v = 0; v < nv; v++) for (let u = 0; u < nu; u++) {
        const kk = key[v * nu + u];
        if (!kk) continue;
        const cc = colour[v * nu + u], even = ((kk - 1) & 255) % 85 === 0;
        let du = 1, dv = 1;
        if (even) {
          while (u + du < nu && key[v * nu + u + du] === kk && colour[v * nu + u + du] === cc) du++;
          grow: while (v + dv < nv) {
            for (let i = 0; i < du; i++) if (key[(v + dv) * nu + u + i] !== kk || colour[(v + dv) * nu + u + i] !== cc) break grow;
            dv++;
          }
        }
        for (let j = 0; j < dv; j++) key.fill(0, (v + j) * nu + u, (v + j) * nu + u + du);
        quad(out[kk > 256 ? 1 : 0], f, w, u, v, du, dv, cc, kk - 1);
      }
    }
  }
  function quad(m, f, w, u, v, du, dv, cc, shades) {
    const r = LINEAR[cc >> 16], g = LINEAR[(cc >> 8) & 255], b = LINEAR[cc & 255], base = m.n, plane = f.s > 0 ? w + 1 : w;
    const corners = f.s > 0 ? [0, 1, 2, 3] : [0, 3, 2, 1], o = corners.map((i) => (shades >> (i * 2)) & 3), p = [0, 0, 0];
    for (const i of corners) {
      p[f.a] = plane; p[f.u] = u + (i === 1 || i === 2 ? du : 0); p[f.v] = v + (i >= 2 ? dv : 0);
      m.pos.push(offset[0] + p[0] * scale, offset[1] + p[1] * scale, offset[2] + p[2] * scale);
      const light = AO[(shades >> (i * 2)) & 3];
      m.col.push(r * light, g * light, b * light);
      m.nor.push(f.a === 0 ? f.s : 0, f.a === 1 ? f.s : 0, f.a === 2 ? f.s : 0);
    }
    m.n += 4;
    // Split the quad along the brighter diagonal, so a dark corner stays in its corner.
    if (o[0] + o[2] < o[1] + o[3]) m.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    else m.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return out.map((m) => {
    if (!m.n) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(m.pos, 3));
    geo.setAttribute("normal", new THREE.Int8BufferAttribute(m.nor, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(m.col, 3));
    geo.setIndex(m.n > 65535 ? new THREE.Uint32BufferAttribute(m.idx, 1) : new THREE.Uint16BufferAttribute(m.idx, 1));
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    return geo;
  });
}

// Shared materials: lit voxels are matte and take shadows; glowing ones are
// unlit and skip tone mapping, so the bloom picks them up like every other light.
export const VOXEL_LIT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
export const VOXEL_GLOW = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });

// The two geometries as one group of meshes. Geometry built once can be shared:
// mark it, and places.js leaves it alone when a room is cleared.
export function voxelGroup([lit, glow], { shared = false, shadows = true } = {}) {
  const group = new THREE.Group();
  if (lit) {
    const mesh = new THREE.Mesh(lit, VOXEL_LIT);
    mesh.castShadow = mesh.receiveShadow = shadows;
    group.add(mesh);
  }
  if (glow) group.add(new THREE.Mesh(glow, VOXEL_GLOW));
  for (const g of [lit, glow]) if (g && shared) g.userData.shared = true;
  return group;
}
