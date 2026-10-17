import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";

// World units: 1 = one ground tile. x runs west to east (0-40), z north to
// south (0-26, the camera sits to the south), y is up. Layout follows
// docs/GAME-BIBLE.md §3: cottage top left, big pumpkin left, the patch in the
// centre, Skyla's shop top right, the stone path up the right, fence along the
// bottom.
export const MAP = { w: 40, d: 26 };
// Twelve plots, three across and four rows deep; the first six are open at the start.
export const PLOTS = [11.2, 13.8, 16.4, 19.0].flatMap((z) => [16.5, 20, 23.5].map((x) => ({ x, z })));
export const BIG_PUMPKIN = { x: 7, z: 15.5 };
export const COTTAGE = { x: 7, z: 6.4 };
export const SHOP = { x: 32, z: 5.6, counterZ: 8.6 };
export const HOMES = { natalie: { x: 13.2, z: 13.6 }, shane: { x: 27, z: 13.6 } };
// Visitors walk in from the south edge, up the path to the fork, along the
// spur to Skyla's counter, then back to the fork and out to the north-east.
export const ROUTE_IN = [[33, 28.5], [33, 24], [32.4, 21.6], [30.4, 18.6], [30.2, 15.6], [31.6, 12.6], [31.8, 10.2]];
export const ROUTE_OUT = [[31.8, 10.2], [31.6, 12.6], [35, 10.6], [38, 8.6], [42.5, 6.6]];
const PATH = [[33, 27], ...ROUTE_IN.slice(1, 6), [35, 10.6], [38, 8.6], [41, 7]];

const COL = {
  grass: [0x3d3a26, 0x463d26, 0x38382a, 0x4a3e2a],
  soil: 0x4e3020, furrow: 0x3a2216,
  stone: [0x8c8094, 0x7a6f84, 0x9a8d9e, 0x6c6276],
  wood: 0x5a3a26, woodDark: 0x3b2618, woodLight: 0x7a5236,
  plaster: 0xe2d2b4, timber: 0x3b2618, roof: [0x4a2e2a, 0x553430, 0x3f2724],
  stoneWall: [0x6e6470, 0x5e5662, 0x7c7180],
  leaves: [0x8a2f1e, 0xc2552a, 0xe08a2e, 0x6a2a3a, 0xa8402a, 0x5a2a4a],
  trunk: 0x2e1f1a, fence: 0x1c1418, lantern: 0xffc46a, window: 0xffb85a,
  awning: [0xc76a2a, 0x5b2a4a], flowers: [0x9d55e6, 0xe8862e, 0xc2552a, 0x7a3fb0],
};

const nearPath = (x, z, width) => {
  let best = Infinity;
  for (let i = 1; i < PATH.length; i++) {
    const [ax, az] = PATH[i - 1], [bx, bz] = PATH[i], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return best < width;
};
const inPatch = (x, z) => ((x - 20) / 7.6) ** 2 + ((z - 15.1) / 5.6) ** 2 < 1;

function ground(v, r) {
  const T = 0.5;
  for (let x = 0; x < MAP.w; x += T) for (let z = -2; z < MAP.d + 2; z += T) {
    const cx = x + T / 2, cz = z + T / 2;
    if (nearPath(cx, cz, 0.95) || (cx > 31 && cx < 32.6 && cz > 8.6 && cz < 10.6)) {
      v.box(x, -0.5, z, T, 0.5, T, 0x2e2834);                                              // grout
      for (const [ox, oz] of [[0, 0], [0.25, 0], [0, 0.25], [0.25, 0.25]])                  // four cobbles per tile
        v.box(x + ox + 0.02, 0, z + oz + 0.02, 0.21, 0.05 + r() * 0.04, 0.21, vary(COL.stone[(r() * 4) | 0], 0.1, r));
    } else if (inPatch(cx, cz)) {
      const row = Math.round(cz * 2) % 2;
      v.box(x, -0.5, z, T, 0.5 + (row ? 0.05 : 0), T, row ? COL.soil : COL.furrow);        // tilled rows
    } else {
      v.box(x, -0.5, z, T, 0.5 + r() * 0.06, T, vary(COL.grass[(r() * 4) | 0], 0.08, r));
      if (r() < 0.06) v.box(x + r() * 0.3, 0.06, z + r() * 0.3, 0.14, 0.03, 0.14, COL.leaves[(r() * 6) | 0]); // fallen leaves
      else if (r() < 0.025) v.box(x + 0.2, 0.05, z + 0.2, 0.1, 0.22, 0.1, COL.flowers[(r() * 4) | 0]);
    }
  }
}

function hills(v, r) {
  // Distant ridges and a castle on the far hill: flat, cool and dark so they sit back.
  for (let x = -6; x < MAP.w + 6; x += 1) {
    const h1 = 4 + Math.sin(x / 5) * 1.6 + Math.sin(x / 2.3) * 0.5, h2 = 2.4 + Math.sin(x / 3.4 + 2) * 1.2;
    v.box(x, 0, -12, 1, h1, 3, 0x251b38);
    v.box(x, 0, -8, 1, h2, 3, 0x2d2142);
  }
  const cx = 33, cz = -11.5, base = 5.8;
  v.box(cx - 2, base - 1, cz - 1, 4, 2.2, 2, 0x1c1528);
  for (const [dx, h] of [[-2.2, 3.2], [1.6, 2.6], [-0.3, 4.2]]) {
    v.box(cx + dx, base, cz - 0.4, 0.8, h, 0.8, 0x1c1528);
    v.box(cx + dx + 0.25, base + h * 0.6, cz + 0.42, 0.3, 0.3, 0.05, 0xffc46a, true);  // lit castle windows
  }
}

function tree(v, r, x, z, size) {
  v.block(x, 0, z, 0.6 * size, 2.4 * size, 0.6 * size, COL.trunk);
  const top = 2.2 * size;
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = r() * 1.5 * size, y = top + r() * 2 * size, s = (0.6 + r() * 0.6) * size;
    v.block(x + Math.cos(a) * d, y, z + Math.sin(a) * d * 0.8, s, s * 0.8, s, vary(COL.leaves[(r() * 6) | 0], 0.12, r));
  }
}

function lanternPost(v, x, z, lights, warm = true) {
  v.block(x, 0, z, 0.18, 1.7, 0.18, COL.fence);
  v.block(x, 1.7, z, 0.5, 0.08, 0.5, COL.fence);
  v.block(x, 1.78, z, 0.34, 0.42, 0.34, warm ? COL.lantern : 0xd9c8ff, true);
  v.block(x, 2.2, z, 0.44, 0.1, 0.44, COL.fence);
  lights.push({ x, y: 2.1, z });
}

function cottage(v, r) {
  const { x, z } = COTTAGE, w = 7, d = 5, x0 = x - w / 2, z0 = z - d / 2;
  for (let i = 0; i < w; i += 0.5) for (const zz of [z0, z0 + d - 0.5]) v.box(x0 + i, 0, zz, 0.5, 0.7, 0.5, vary(COL.stoneWall[(r() * 3) | 0], 0.06, r)); // stone footing
  v.box(x0, 0, z0, 0.5, 0.7, d, COL.stoneWall[1]); v.box(x0 + w - 0.5, 0, z0, 0.5, 0.7, d, COL.stoneWall[1]);
  v.box(x0 + 0.05, 0.7, z0 + 0.05, w - 0.1, 3.3, d - 0.1, COL.plaster);               // plaster walls
  for (const tx of [x0, x0 + 2.2, x0 + 4.8, x0 + w - 0.25]) v.box(tx, 0.7, z0 + d - 0.1, 0.25, 3.3, 0.15, COL.timber); // timber frame
  v.box(x0, 2.4, z0 + d - 0.1, w, 0.22, 0.15, COL.timber);
  v.box(x0, 3.9, z0 + d - 0.1, w, 0.22, 0.15, COL.timber);
  // Round-topped door with steps and pumpkins.
  v.box(x - 0.6, 0.7, z0 + d - 0.12, 1.2, 1.9, 0.2, COL.woodLight);
  v.box(x - 0.45, 2.6, z0 + d - 0.12, 0.9, 0.2, 0.2, COL.woodLight);
  v.box(x + 0.35, 1.5, z0 + d + 0.06, 0.12, 0.12, 0.08, 0xd9a35a);
  v.box(x - 1, 0, z0 + d, 2, 0.35, 0.6, COL.stoneWall[2]); v.box(x - 0.8, 0, z0 + d + 0.6, 1.6, 0.18, 0.5, COL.stoneWall[0]);
  // Glowing windows with mullions.
  for (const wx of [x0 + 1.1, x0 + w - 2.1]) {
    v.box(wx, 1.6, z0 + d - 0.08, 1, 1.1, 0.12, COL.window, true);
    v.box(wx + 0.45, 1.6, z0 + d + 0.02, 0.1, 1.1, 0.06, COL.timber);
    v.box(wx, 2.1, z0 + d + 0.02, 1, 0.1, 0.06, COL.timber);
    v.box(wx - 0.1, 1.5, z0 + d - 0.05, 1.2, 0.12, 0.3, COL.woodDark);              // sill
  }
  v.box(x0 + 3, 3.1, z0 + d - 0.08, 0.9, 0.7, 0.12, COL.window, true);                // dormer light
  // Steep stepped shingle roof, overhanging.
  for (let i = 0; i < 9; i++) {
    const inset = i * 0.38, y = 4 + i * 0.42;
    for (let k = 0; k < w + 1.2; k += 0.6) v.box(x0 - 0.6 + k, y, z0 - 0.5 + inset, 0.6, 0.42, d + 1 - inset * 2, vary(COL.roof[(r() * 3) | 0], 0.08, r));
  }
  v.box(x0 + 5.2, 4.2, z0 + 1, 0.9, 4.4, 0.9, COL.stoneWall[1]);                       // chimney
  v.box(x0 + 5.1, 8.6, z0 + 0.9, 1.1, 0.25, 1.1, COL.stoneWall[2]);
  for (let i = 0; i < 18; i++) v.box(x0 + r() * 0.5, 0.6 + r() * 3, z0 + d - 0.05, 0.25, 0.25, 0.12, vary(0x3d5a2a, 0.2, r)); // ivy
  for (const [px, s] of [[x - 1.5, 0.5], [x + 1.4, 0.4], [x0 + 0.6, 0.45]]) pumpkinBlock(v, px, 0, z0 + d + 0.6, s, 0xf0821e, r);
  return { door: { x, z: z0 + d + 1.2 }, glow: [{ x: x0 + 1.6, y: 2, z: z0 + d + 0.5 }, { x: x0 + w - 1.6, y: 2, z: z0 + d + 0.5 }] };
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

function bigPumpkinStage(v, r) {
  const { x, z } = BIG_PUMPKIN;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) for (let rr = 0; rr < 2.6; rr += 0.5)
    v.block(x + Math.cos(a) * rr, 0, z + Math.sin(a) * rr * 0.9, 0.55, 0.5, 0.55, rr > 2.2 ? COL.woodDark : vary(COL.wood, 0.1, r)); // round wooden dais
  for (let a = 0.3; a < Math.PI * 2; a += Math.PI / 4) {
    const cx = x + Math.cos(a) * 2.9, cz = z + Math.sin(a) * 2.6;
    v.block(cx, 0, cz, 0.16, 0.32, 0.16, 0xe8dcc8);                                     // candles
    v.block(cx, 0.32, cz, 0.08, 0.14, 0.08, 0xffd36a, true);
  }
}

function patchBorder(v, r) {
  for (let a = 0; a < Math.PI * 2; a += 0.09) {
    const x = 20 + Math.cos(a) * 7.9, z = 15.1 + Math.sin(a) * 5.9;
    if (nearPath(x, z, 1.2)) continue;
    v.block(x, 0, z, 0.36, 0.22 + r() * 0.12, 0.36, vary(COL.stone[(r() * 4) | 0], 0.1, r)); // stone edging
  }
}

function shop(v, r) {
  const { x, z, counterZ } = SHOP, w = 9, d = 5, x0 = x - w / 2, z0 = z - d / 2;
  for (let i = 0; i < d; i += 0.5) { v.box(x0, 0, z0 + i, 0.4, 3.6, 0.5, vary(COL.wood, 0.1, r)); v.box(x0 + w - 0.4, 0, z0 + i, 0.4, 3.6, 0.5, vary(COL.wood, 0.1, r)); }
  for (let i = 0; i < w; i += 0.5) v.box(x0 + i, 0, z0, 0.5, 4.4, 0.4, vary(COL.woodDark, 0.12, r)); // back wall planks
  v.box(x0 + 0.4, 0, z0 + 0.4, w - 0.8, 0.12, d - 0.4, COL.woodDark);
  // Shelves of glowing jars along the back wall.
  for (const y of [1.3, 2.4, 3.4]) {
    v.box(x0 + 0.6, y, z0 + 0.4, w - 1.2, 0.12, 0.6, COL.woodLight);
    for (let i = 0; i < 12; i++) v.box(x0 + 0.9 + i * 0.62, y + 0.12, z0 + 0.55, 0.3, 0.4, 0.3, [0xffb85a, 0xb774ff, 0xd9d2ff, 0xf5c84a][(i + y * 3) % 4 | 0], i % 3 === 0);
  }
  // Counter across the front.
  v.box(x0 + 0.6, 0, counterZ - 0.9, w - 1.2, 1.15, 0.9, COL.wood);
  v.box(x0 + 0.5, 1.15, counterZ - 1.0, w - 1, 0.15, 1.1, COL.woodLight);
  for (let i = 0; i < w - 1.2; i += 0.6) v.box(x0 + 0.6 + i, 0.1, counterZ - 0.02, 0.06, 0.95, 0.04, COL.woodDark);
  v.box(x - 2.6, 1.3, counterZ - 0.7, 0.6, 0.35, 0.4, 0xd9a35a);                        // brass till
  v.box(x + 2.2, 1.3, counterZ - 0.6, 0.25, 0.25, 0.25, 0xd9a35a);                       // the bell Skyla rings
  // Corner posts and the striped awning sloping forward.
  for (const px of [x0, x0 + w - 0.35]) v.box(px, 0, counterZ - 0.35, 0.35, 4.3, 0.35, COL.woodDark);
  for (let i = 0; i < w + 0.8; i += 0.9) for (let k = 0; k < 4; k++)
    v.box(x0 - 0.4 + i, 4.5 - k * 0.32, z0 + 1.6 + k * 0.8, 0.9, 0.18, 0.8, COL.awning[Math.round(i / 0.9) % 2]);
  for (let i = 0; i < w + 0.8; i += 0.45) v.box(x0 - 0.4 + i, 3.25 - (Math.round(i / 0.45) % 2) * 0.12, counterZ + 1.05, 0.45, 0.22, 0.1, COL.awning[Math.round(i / 0.9) % 2]); // scalloped edge
  // Crates of pumpkins and a hay bale out front.
  for (const [cx, cz] of [[x0 - 1.2, counterZ + 0.4], [x0 + w + 0.6, counterZ - 0.4]]) {
    v.block(cx, 0, cz, 1.3, 0.8, 1, COL.woodLight);
    for (let i = 0; i < 3; i++) pumpkinBlock(v, cx - 0.4 + i * 0.4, 0.8, cz, 0.32, [0xf0821e, 0xd9d2ff, 0x9d55e6][i], r);
  }
  v.block(x0 + w + 0.4, 0, counterZ + 1.2, 1.4, 0.7, 0.9, 0xc9a65a);
  return { lights: [{ x: x - 2, y: 3, z: counterZ - 1.5 }, { x: x + 2.4, y: 3, z: counterZ - 1.5 }] };
}

function fence(v, lights) {
  const post = (x, z) => { v.block(x, 0, z, 0.2, 1.1, 0.2, COL.fence); v.block(x, 1.1, z, 0.12, 0.16, 0.12, COL.fence); };
  for (let x = 0.4; x < MAP.w; x += 0.8) {
    if (x > 31.4 && x < 34.6) continue;
    post(x, 24.6);
    v.box(x, 0.45, 24.55, 0.8, 0.1, 0.1, COL.fence); v.box(x, 0.85, 24.55, 0.8, 0.1, 0.1, COL.fence);
  }
  for (let z = 10; z < 24.6; z += 0.8) { post(0.4, z); v.box(0.35, 0.45, z, 0.1, 0.1, 0.8, COL.fence); }
  for (let z = 12.4; z < 24.6; z += 0.8) { if (nearPath(39.6, z, 1.2)) continue; post(39.6, z); v.box(39.55, 0.45, z, 0.1, 0.1, 0.8, COL.fence); }
  for (const x of [4, 12, 22, 30.6, 35.4]) lanternPost(v, x, 25.1, lights);
}

function stringLights(v) {
  const poles = [[11.6, 9.6], [20, 8.8], [28.4, 9.6]];
  for (const [x, z] of poles) { v.block(x, 0, z, 0.22, 4, 0.22, COL.fence); v.block(x, 4, z, 0.4, 0.12, 0.12, COL.fence); }
  for (let p = 1; p < poles.length; p++) {
    const [ax, az] = poles[p - 1], [bx, bz] = poles[p];
    for (let t = 0.04; t < 1; t += 0.06) {
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = 3.9 - Math.sin(t * Math.PI) * 0.9;
      v.block(x, y, z, 0.05, 0.05, 0.05, COL.fence);
      v.block(x, y - 0.18, z, 0.14, 0.18, 0.14, [0xffc46a, 0xffd894, 0xff9a4a][Math.round(t * 50) % 3], true);
    }
  }
}

// Builds every static voxel and returns the scene group plus the light points
// the renderer turns into warm lamps.
export function buildWorld() {
  const r = seeded(20261017), v = new Voxels(), lights = [];
  ground(v, r); hills(v, r);
  for (const [x, z, s] of [[1.5, 1.5, 1.1], [5, 0.6, 0.9], [11, 1.2, 1.2], [15.5, 0.4, 0.9], [19, 1.6, 1], [23.5, 0.8, 1.2], [27, 1.4, 0.8], [38.5, 1.2, 1], [38.8, 13, 0.9], [1, 22, 0.8], [1.2, 11.5, 0.9], [37.8, 20.5, 0.8], [8.5, 0.2, 1], [30.5, 0.4, 1.1], [35, 0.2, 0.9], [-0.5, 6, 1]]) tree(v, r, x, z, s);
  const home = cottage(v, r);
  bigPumpkinStage(v, r);
  patchBorder(v, r);
  const stall = shop(v, r);
  fence(v, lights);
  stringLights(v);
  for (const [x, z] of [[29.2, 18.2], [33.4, 13.2], [36.6, 11.6], [10.8, 9.4]]) lanternPost(v, x, z, lights);
  for (const [x, z, c] of [[2.6, 17, 0xf0821e], [3.4, 18.2, 0xd9d2ff], [11.5, 21.5, 0xf0821e], [27.8, 22.5, 0x9d55e6], [36.5, 22.4, 0xf0821e], [26.8, 5.5, 0xf0821e]]) pumpkinBlock(v, x, 0, z, 0.55, c, r);
  const group = v.build();
  return { group, lights: [...lights, ...stall.lights, ...home.glow], door: home.door };
}

// Signs carry their lettering on a canvas texture, in the game's display font.
export function signBoard(text, sub, width) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 160;
  const c = canvas.getContext("2d");
  c.fillStyle = "#4a3020"; c.fillRect(0, 0, 512, 160);
  c.strokeStyle = "#2a1a12"; c.lineWidth = 10; c.strokeRect(5, 5, 502, 150);
  for (let y = 40; y < 160; y += 40) { c.fillStyle = "rgba(0,0,0,0.18)"; c.fillRect(0, y, 512, 3); }
  c.fillStyle = "#ffe0a8"; c.textAlign = "center";
  c.font = "600 54px Fraunces, Georgia, serif"; c.fillText(text, 256, 78);
  c.fillStyle = "#e7b46e"; c.font = "600 26px 'DM Sans', sans-serif"; c.fillText(sub.toUpperCase(), 256, 122);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.BoxGeometry(width, width * 160 / 512, 0.12), [
    new THREE.MeshStandardMaterial({ color: 0x3b2618 }), new THREE.MeshStandardMaterial({ color: 0x3b2618 }),
    new THREE.MeshStandardMaterial({ color: 0x3b2618 }), new THREE.MeshStandardMaterial({ color: 0x3b2618 }),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: 0x3b2618 }),
  ]);
  board.castShadow = true;
  return board;
}
