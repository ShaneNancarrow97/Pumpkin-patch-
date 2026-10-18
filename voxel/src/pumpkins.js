// Pumpkins: the plots' pumpkins (one template per variety, cloned per plot),
// the sprouts, the giant jack-o'-lantern and the little ones dotted round the yard.
import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { VARIETIES } from "./model.js";

// Pumpkins for the plots, one template per variety, cloned per plot.
export function pumpkinTemplate(variety, size = 0.62) {
  const v = new Voxels(), r = seeded(variety + 3), n = 5, s = size / n;
  const color = VARIETIES[variety].color, rib = new THREE.Color(color).multiplyScalar(0.78).getHex();
  for (let x = -n; x < n; x++) for (let y = 0; y < n * 1.5; y++) for (let z = -n; z < n; z++) {
    const nx = (x + 0.5) / n, ny = (y + 0.5 - n * 0.75) / (n * 0.75), nz = (z + 0.5) / n;
    if (nx * nx + ny * ny + nz * nz > 1) continue;
    const ribbed = Math.abs(Math.sin(Math.atan2(nz, nx) * 4)) < 0.3;
    v.box(x * s, y * s, z * s, s, s, s, vary(ribbed ? rib : color, 0.05, r));
  }
  v.box(-s / 2, n * 1.5 * s, -s / 2, s, s * 2.2, s, 0x5a4a1e);
  v.box(0, n * 1.5 * s + s, -s / 2, s * 2.2, s * 0.4, s * 1.4, 0x4d6a2a);           // leaf
  return v.build();
}
export function sproutTemplate() {
  const v = new Voxels();
  v.box(-0.04, 0, -0.04, 0.08, 0.32, 0.08, 0x5c8a3a);
  v.box(-0.2, 0.26, -0.06, 0.18, 0.06, 0.12, 0x6fa046); v.box(0.02, 0.32, -0.06, 0.18, 0.06, 0.12, 0x6fa046);
  return v.build();
}

// The giant jack-o'-lantern: a ribbed voxel sphere with a glowing carved face.
export function bigPumpkin() {
  const v = new Voxels(), r = seeded(99), n = 9, s = 0.19;
  for (let x = -n; x < n; x++) for (let y = 0; y < n * 1.7; y++) for (let z = -n; z < n; z++) {
    const nx = (x + 0.5) / n, ny = (y + 0.5 - n * 0.85) / (n * 0.85), nz = (z + 0.5) / n;
    const d = nx * nx + ny * ny + nz * nz;
    if (d > 1 || d < 0.72) continue;                                                  // hollow shell
    const front = nz > 0.6, eye = front && ny > 0.05 && ny < 0.42 && Math.abs(Math.abs(nx) - 0.38) < 0.2 - (ny - 0.05) * 0.4;
    const mouth = front && ny < -0.12 && ny > -0.48 && Math.abs(nx) < 0.62 && !(ny > -0.24 && Math.abs(Math.abs(nx) - 0.25) < 0.08);
    if (eye || mouth) { v.box(x * s, y * s, z * s, s, s, s, 0xff9a2a, true); continue; }
    const ribbed = Math.abs(Math.sin(Math.atan2(nz, nx) * 5)) < 0.28;
    v.box(x * s, y * s, z * s, s, s, s, vary(ribbed ? 0xc0561a : 0xf0821e, 0.05, r));
  }
  v.box(-0.12, n * 1.7 * s - 0.05, -0.12, 0.26, 0.6, 0.26, 0x4a3a1a);
  v.box(0.1, n * 1.7 * s + 0.2, -0.3, 0.7, 0.08, 0.5, 0x4d6a2a);
  const g = v.build();
  return g;
}

const darker = (hex) => new THREE.Color(hex).multiplyScalar(0.82).getHex();

export function pumpkinBlock(v, x, y, z, s, color, r) {
  for (let i = -2; i <= 2; i++) for (let j = 0; j < 4; j++) for (let k = -2; k <= 2; k++) {
    if (i * i + (j - 1.5) ** 2 * 1.4 + k * k > 5.2) continue;
    // Every other column a shade darker reads as the pumpkin's ribs.
    v.box(x + i * s * 0.22, y + j * s * 0.2, z + k * s * 0.22, s * 0.22, s * 0.2, s * 0.22, vary(Math.abs(i + k) % 2 ? color : darker(color), 0.05, r));
  }
  v.box(x - s * 0.05, y + s * 0.8, z - s * 0.05, s * 0.1, s * 0.22, s * 0.1, 0x5a4a1e);
}
