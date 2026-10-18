import * as THREE from "three";
import { Voxels, seeded, vary } from "./voxels.js";
import { GRID } from "./model.js";

// Inside the cottage and the shop: voxel dioramas seen from the front, like
// the main game's painted rooms, with the front wall lifted away. Rooms are
// built at four times the overworld's voxel density (V = 1/8 unit) so they can
// carry that detail: fluted columns, panelled wainscot, a cornice with
// dentils, arched windows onto the night, and wallpaper you can feel.
// A room's floor is GRID.w x GRID.d units from (0, 0) at the back-left corner;
// the back wall stands along z = 0, the side walls along x = 0 and x = GRID.w.
export const V = 0.125;
export const WALL_H = 5.2;
const T = 0.25;                                                     // wall thickness
// The camera indoors: in front, a little above, looking down into the room.
export const INTERIOR = { pitch: THREE.MathUtils.degToRad(26), fov: 40, lean: 0.12 };

// Each style's palette and features, after the main game's ten room paintings.
const STYLES = {
  "parlour-warm": { wall: 0xdcc39c, wall2: 0xd2b78f, wood: 0x6a4428, dark: 0x3e2716, trim: 0x8a5a36, floor: 0x7a4a2a, window: "round" },
  "parlour-crooked": { wall: 0x7d7c48, wall2: 0x737240, wood: 0x5a3a22, dark: 0x34221a, trim: 0x8a6a36, floor: 0x744628, window: "round", sconces: true },
  "parlour-manor": { wall: 0x5c2232, wall2: 0x521d2c, wood: 0x4a2418, dark: 0x2a1410, trim: 0xc9a050, floor: 0x6a3c22, window: "gothic", chandelier: true, sconces: true },
  "parlour-haunted": { wall: 0x4a2440, wall2: 0x42203a, wood: 0x5a3220, dark: 0x2a1610, trim: 0xb07a3a, floor: 0x5e3420, window: "gothic", cobwebs: true, candles: true, arches: true },
  "bedroom-base": { wall: 0xc08c7c, wall2: 0xb88474, wood: 0x6a4428, dark: 0x3e2716, trim: 0x8a5a36, floor: 0x7a4a2a, window: "round", curtains: 0x6e1f30 },
  "bedroom-celestial": { wall: 0x2f2b55, wall2: 0x2a264d, wood: 0x3a2a3a, dark: 0x22182a, trim: 0xc9a050, floor: 0x6e4226, window: "gothic", curtains: 0x4e2c72, stars: true, chandelier: true },
  "kitchen-base": { wall: 0xdcc8a6, wall2: 0xd2bd99, wood: 0x6a4428, dark: 0x3e2716, trim: 0x8a5a36, floor: 0x7a4a2a, window: "square", hearth: "stone", jars: true },
  "kitchen-apothecary": { wall: 0x3f5c40, wall2: 0x36523a, wood: 0x4a3020, dark: 0x2e2018, trim: 0xb0683a, floor: 0x6e4428, window: "square", hearth: "copper", jars: true, tiles: true, herbs: true },
  "attic-base": { wall: 0xd6c29e, wall2: 0xcbb690, wood: 0x6a4428, dark: 0x4a2e1c, trim: 0x7a5236, floor: 0x7a4a2a, window: "round", rafters: true, roundWindow: true, cobwebs: true },
  "attic-starlight": { wall: 0x36426e, wall2: 0x303b64, wood: 0x4a3020, dark: 0x2e1e14, trim: 0x8a6a3a, floor: 0x6e4428, window: "gothic", rafters: true, roundWindow: true, stars: true, fairyLights: true },
};
const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// A little four-pointed star, scattered: a gold centre and dimmer arms.
const STAR = 0.008, isStar = (i, j) => hash(i, j) < STAR && hash(i + 1, j) >= STAR && hash(i, j + 1) >= STAR;
function star(i, j, gold) {
  if (isStar(i, j)) return [gold, 0.04];
  if (isStar(i - 1, j) || isStar(i + 1, j) || isStar(i, j - 1) || isStar(i, j + 1)) return [mix(gold, 0x000000, 0.35), 0.02];
  return null;
}

// Wallpaper as physical voxels: each of the main game's eight patterns, its
// motif standing a little proud of the wall. Returns [colour, relief] or null.
const PAPERS = {
  w01(i, j, c) { const a = (i + j) % 12 === 0 || (i - j + 1200) % 12 === 0, ci = i % 12, cj = j % 12, fleur = Math.abs(ci - 6) + Math.abs(cj - 6) <= 1; return a || fleur ? [c.light, 0.03] : null; },
  w02(i, j, c) { const x = i % 10 - 5, y = j % 10 - 5, moth = (y === 0 && Math.abs(x) <= 2) || (y === 1 && Math.abs(x) >= 1 && Math.abs(x) <= 2) || (x === 0 && y === -1); return moth ? [c.light, 0.03] : hash(i, j) < 0.05 ? [c.dark, 0] : null; },
  w03(i, j, c) { const x = (i + (Math.floor(j / 10) % 2) * 5) % 10 - 5, y = j % 10 - 5; return (x * x) / 6 + (y * y) / 3 <= 1 ? [c.light, 0.03] : x === 0 && y === 2 ? [c.dark, 0.03] : null; },
  w04(i, j, c) { const x = i % 16, y = j % 16, st = star(i, j, mix(c.base, 0xffe6a8, 0.8)); if (st) return st; return (x === y && x > 2 && x < 12 && x % 2) ? [c.light, 0.02] : null; },
  w05(i, j, c) { const x = Math.abs((i % 16) - 8), y = Math.abs((j % 16) - 8); return (x + y) % 4 === 0 && x + y < 12 && x + y > 0 ? [c.light, 0.02] : x === 0 || y === 0 || x === y ? [c.light, 0.02] : null; },
  w06(i, j, c) { const row = Math.floor(j / 8); if (j % 8 === 0) return [c.dark, 0.06]; const book = Math.floor(i / 2) + row * 7, tone = [0x7a2a2a, 0x2e4a3a, 0x3a3a6a, 0x8a6a2a, 0x5a2a4a][book % 5]; return hash(book, row) < 0.12 ? null : [mix(tone, c.base, 0.35), 0.03]; },
  w07(i, j, c) { const vine = Math.round(Math.sin(j * 0.55) * 2) + 5, x = i % 10; return x === vine ? [c.dark, 0.03] : Math.abs(x - vine) === 1 && j % 4 === 0 ? [c.light, 0.03] : null; },
  w08(i, j, c) { const x = i % 12, y = j % 12, ghost = x >= 4 && x <= 6 && y >= 4 && y <= 7 && !(y === 4 && x !== 5), eye = y === 6 && (x === 4 || x === 6); if (eye) return [c.dark, 0.04]; if (ghost) return [0xe8e2f2, 0.04]; return (x === 10 && y === 1) || (x === 1 && y === 10) ? [0xd88ab8, 0.03] : null; },
};

// One wall: back (along x at z = 0), left (along z at x = 0) or right (x = GRID.w).
// put(u, y, w, h, relief, colour, glow) places a block whose face stands `relief` out.
function wall(v, side) {
  if (side === "back") return (u, y, w, h, relief, c, glow) => v.box(u, y, -T, w, h, T + relief, c, glow);
  if (side === "left") return (u, y, w, h, relief, c, glow) => v.box(-T, y, u, T + relief, h, w, c, glow);
  return (u, y, w, h, relief, c, glow) => v.box(GRID.w - relief, y, u, T + relief, h, w, c, glow);
}

// The arched openings in the back wall: where they are and their shape.
const WINDOWS = [{ cx: 1.7, moon: true }, { cx: 8.3 }];
const WIN = { w: 1.4, bottom: 1.65, spring: 3.25 };
function inOpening(kind, dx, y) {
  const half = WIN.w / 2;
  if (Math.abs(dx) > half || y < WIN.bottom) return false;
  if (y <= WIN.spring) return true;
  const h = y - WIN.spring;
  if (kind === "square") return y <= 3.95;
  if (kind === "round") return dx * dx + h * h <= half * half;
  const r = WIN.w * 0.8, off = r - half;                            // a pointed gothic arch
  return (Math.abs(dx) + off) ** 2 + h * h <= r * r;
}

// The night through the glass: violet sky, stars, a moon in one window, pines.
function nightGlass(put, cx, kind, moon, r) {
  for (let y = WIN.bottom; y < 4.4; y += V) for (let x = cx - WIN.w / 2; x < cx + WIN.w / 2; x += V) {
    const dx = x + V / 2 - cx, yy = y + V / 2;
    if (!inOpening(kind, dx, yy)) continue;
    const t = (yy - WIN.bottom) / 2.6, pine = yy < WIN.bottom + 0.55 - Math.abs(((dx * 4 + 10) % 1.6) - 0.8) * 0.5;
    let c = mix(0x6a4ab0, 0x23164e, t);
    if (pine) c = 0x161230;
    else if (moon && (dx - 0.2) ** 2 + (yy - 3.2) ** 2 < 0.05) c = (dx - 0.27) ** 2 + (yy - 3.25) ** 2 < 0.035 ? mix(0x6a4ab0, 0x23164e, t) : 0xffe6a8;
    else if (r() < 0.03) c = 0xfff2c8;
    put(x, y, V, V, -0.1, c, true);
  }
}

// Builds one wall face: wainscot, chair rail, the field (style or wallpaper),
// cornice with dentils and a frieze. `skip(u, y)` leaves holes for windows.
function wallFace(put, r, look, paper, length, skip = () => false) {
  // Wainscot: a frame of wood with sunk panels, a skirting board, a rail.
  put(0, 0, length, 0.15, 0.06, look.dark);
  for (let u = 0; u < length; u += 1.25) {
    const w = Math.min(1.25, length - u);
    put(u, 0.15, w, 1.15, 0.04, look.wood);
    if (w > 0.6) put(u + 0.18, 0.32, w - 0.36, 0.8, 0.0, mix(look.wood, look.dark, 0.35));
  }
  put(0, 1.3, length, 0.12, 0.1, look.trim);
  // The field: fine voxels, a little uneven, or the chosen wallpaper.
  const colours = paper && { base: paper.base, light: mix(paper.base, 0xffffff, 0.3), dark: mix(paper.base, 0x000000, 0.35) };
  for (let i = 0; i * V < length - 1e-6; i++) for (let j = 0; 1.42 + j * V < 4.4 - 1e-6; j++) {
    const u = i * V, y = 1.42 + j * V;
    if (skip(u + V / 2, y + V / 2)) continue;
    let c, relief = 0, glow = false;
    const sky = look.stars && !colours && star(i, j, mix(look.wall, 0xf2d27a, 0.8));
    if (colours) {
      const m = PAPERS[paper.id]?.(i, j, colours);
      if (m) [c, relief, glow] = m; else c = vary(colours.base, 0.03, r);
    } else if (look.tiles) c = vary((Math.floor(i / 2) + Math.floor(j / 2)) % 2 ? look.wall : look.wall2, 0.04, r), relief = (i % 2 && j % 2) ? 0.01 : 0;
    else if (sky) [c, relief] = sky;
    else c = vary(Math.floor(i / 3) % 2 ? look.wall : look.wall2, 0.025, r);
    put(u, y, V, V, relief, c, glow);
  }
  // Cornice, dentils and frieze up to the top of the wall.
  for (let u = 0; u < length - 1e-6; u += 0.25) put(u + 0.06, 4.28, 0.12, 0.12, 0.12, look.trim);
  put(0, 4.4, length, 0.25, 0.2, look.trim);
  put(0, 4.65, length, WALL_H - 4.65, 0.02, look.dark);
  if (look.arches) for (let u = 0.5; u < length - 0.4; u += 1) for (let a = 0; a <= Math.PI; a += Math.PI / 6) put(u + Math.cos(a) * 0.4, 4.72 + Math.sin(a) * 0.3, V, V, 0.05, look.trim);
  put(-0.05, WALL_H, length + 0.1, 0.15, 0.1, look.dark);                              // the cap: a doll's house's edge
}

// A pilaster: plinth, fluted shaft and capital, standing out of the wall.
function column(put, u, look) {
  put(u - 0.24, 0, 0.48, 0.5, 0.24, look.dark);
  for (let k = 0; k < 3; k++) put(u - 0.18 + k * 0.12, 0.5, 0.12, 3.8, k === 1 ? 0.2 : 0.17, k === 1 ? look.wood : mix(look.wood, look.dark, 0.3));
  put(u - 0.24, 4.2, 0.48, 0.25, 0.26, look.trim);
}

function backWall(v, r, look, paper, lights, feature) {
  const put = wall(v, "back");
  const skip = (u, y) => WINDOWS.some((w) => inOpening(look.window, u - w.cx, y)) || (feature === "round" && (u - 5) ** 2 + (y - 3) ** 2 < 0.8);
  wallFace(put, r, look, paper, GRID.w, skip);
  for (const w of WINDOWS) {
    nightGlass(put, w.cx, look.window, w.moon, r);
    // The frame: one voxel of trim around the opening, standing out.
    for (let y = WIN.bottom - V; y < 4.45; y += V) for (let x = w.cx - WIN.w / 2 - V; x < w.cx + WIN.w / 2 + V; x += V) {
      const dx = x + V / 2 - w.cx, yy = y + V / 2;
      if (inOpening(look.window, dx, yy)) continue;
      if ([[V, 0], [-V, 0], [0, V], [0, -V]].some(([ox, oy]) => inOpening(look.window, dx + ox, yy + oy))) put(x, y, V, V, 0.06, look.trim);
    }
    // Tracery: a mullion and transom, and in gothic windows a quatrefoil.
    put(w.cx - V / 2, WIN.bottom, V, WIN.spring - WIN.bottom, -0.04, look.dark);
    put(w.cx - WIN.w / 2, 2.45, WIN.w, V, -0.04, look.dark);
    if (look.window === "gothic") for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) put(w.cx + Math.cos(a) * 0.22 - V / 2, 3.72 + Math.sin(a) * 0.22, V, V, -0.04, look.dark);
    // The sill, with candles on the haunted and grand rooms' sills.
    put(w.cx - WIN.w / 2 - 0.2, WIN.bottom - 0.2, WIN.w + 0.4, 0.14, 0.3, look.trim);
    if (look.candles || look.chandelier) for (const dx of [-0.6, 0.6]) {
      v.box(w.cx + dx - 0.05, WIN.bottom - 0.06, 0.08, 0.1, 0.32, 0.1, 0xe8dcc8);
      v.box(w.cx + dx - 0.035, WIN.bottom + 0.26, 0.095, 0.07, 0.1, 0.07, 0xffd36a, true);
    }
    if (look.candles || look.chandelier) lights.push({ x: w.cx, y: WIN.bottom + 0.6, z: 0.6, intensity: 5 });
    if (look.curtains) for (const side of [-1, 1]) for (let k = 0; k < 4; k++) {
      const x = w.cx + side * (WIN.w / 2 + 0.08 + k * 0.08);
      put(x - 0.04, 1.4, 0.09, 3.1, 0.12 + (k % 2) * 0.06, mix(look.curtains, 0x000000, (k % 2) * 0.25));
    }
  }
  for (const u of [0.24, 3, 7, GRID.w - 0.24]) column(put, u, look);
  // The central panel: a moulded frame, a hearth, or the attic's round window.
  if (feature === "panel") for (const [x, y, w, h] of [[3.45, 1.62, 3.1, V], [3.45, 4.1, 3.1, V], [3.45, 1.62, V, 2.6], [6.55 - V, 1.62, V, 2.6]]) put(x, y, w, h, 0.05, look.trim);
  if (feature === "round") {
    for (let y = 2; y < 4; y += V) for (let x = 4; x < 6; x += V) {
      const d = (x + V / 2 - 5) ** 2 + (y + V / 2 - 3) ** 2;
      if (d < 0.8) put(x, y, V, V, -0.1, d < 0.6 && Math.abs(x + V / 2 - 5) > 0.08 && Math.abs(y + V / 2 - 3) > 0.08 ? mix(0x6a4ab0, 0x23164e, (y - 2) / 2) : look.dark, d < 0.6);
      else if (d < 1.05) put(x, y, V, V, 0.08, look.trim);
    }
    lights.push({ x: 5, y: 3, z: 1.2, color: 0xb8a8ff, intensity: 4 });
  }
  if (feature === "hearth") hearth(v, put, r, look, lights);
}

// A glass jar on a shelf: contents, the glass above them, a neck and a cork.
const JARS = [0xc8641e, 0x9d55e6, 0xd8b04a, 0x6aa04a, 0xe8dcc8];
function jar(v, x, y, z, h, colour, glow) {
  const glass = mix(colour, 0xf4ecff, 0.65);
  v.box(x, y, z, 0.2, h * 0.7, 0.2, colour, glow);
  v.box(x, y + h * 0.7, z, 0.2, h * 0.3, 0.2, glass);
  v.box(x + 0.04, y + h, z + 0.04, 0.12, 0.04, 0.12, glass);
  v.box(x + 0.03, y + h + 0.04, z + 0.03, 0.14, 0.05, 0.14, 0x9a6a3e);
}

// The kitchen hearth: a stone or copper-hooded fireplace with a fire inside,
// logs on the irons and jars along the mantel.
function hearth(v, put, r, look, lights) {
  const stone = look.hearth === "copper" ? 0x5a4a44 : 0x8a8090, open = { x0: 4.2, x1: 5.8, top: 1.6 };
  for (let y = 0, row = 0; y < 2.4; y += 0.25, row++) for (let x = 3.6 - (row % 2) * 0.2; x < 6.4; x += 0.4) {
    const a = Math.max(3.6, x), b = Math.min(6.4, x + 0.38), c = vary(stone, 0.12, r);
    if (y >= open.top) { put(a, y, b - a, 0.23, 0.5, c); continue; }
    if (a < open.x0) put(a, y, Math.min(b, open.x0) - a, 0.23, 0.5, c);
    if (b > open.x1) put(Math.max(a, open.x1), y, b - Math.max(a, open.x1), 0.23, 0.5, c);
  }
  put(open.x0, 0, open.x1 - open.x0, open.top, 0.02, 0x1a1214);                          // the sooty back
  v.box(3.4, 0, 0, 3.2, 0.08, 1.2, mix(stone, 0x000000, 0.25));                           // the hearthstone
  for (let x = open.x0; x < open.x1; x += V) {                                          // a blackened arch
    const dx = (x + V / 2 - 5) / 0.8;
    v.box(x, open.top - 0.25 + (1 - dx * dx) * 0.2, 0, V, 0.3, 0.5, 0x2a2024);
  }
  for (const [x, z] of [[4.35, 0.2], [4.45, 0.36]]) v.box(x, 0.08, z, 1.2, 0.14, 0.12, 0x4a2a18);
  // The fire: columns of flame, hottest at the root, licking up unevenly.
  for (let x = 4.45; x < 5.55; x += V) for (const z of [0.12, 0.24]) {
    const dx = Math.abs(x + V / 2 - 5) / 0.55, h = (1 - dx * dx) * (0.75 + r() * 0.35) * (z > 0.2 ? 0.75 : 1);
    for (let y = 0.2; y < 0.2 + h; y += V) {
      const t = (y - 0.2) / Math.max(h, 0.01);
      v.box(x, y, z, V, V, V, t < 0.3 ? 0xffe08a : t < 0.65 ? 0xffa030 : 0xff5a1a, true);
    }
  }
  put(3.4, 2.4, 3.2, 0.2, 0.7, look.wood);                                              // the mantel
  if (look.hearth === "copper") for (let k = 0; k < 6; k++) put(3.6 + k * 0.12, 2.6 + k * 0.3, 2.8 - k * 0.24, 0.3, 0.6 - k * 0.07, vary(look.trim, 0.06, r));
  else for (let i = 0; i < 6; i++) jar(v, 3.7 + i * 0.45, 2.6, 0.25, 0.26 + (i % 2) * 0.08, JARS[i % 4], i % 3 === 0);
  lights.push({ x: 5, y: 0.8, z: 1.2, color: 0xff8a3a, intensity: 12 });
}

function sideWall(v, r, look, paper, side, lights) {
  const put = wall(v, side);
  wallFace(put, r, look, paper, GRID.d);
  column(put, GRID.d - 0.24, look);
  if (look.sconces) {
    put(3 - 0.08, 2.9, 0.16, 0.4, 0.15, look.trim);
    const x = side === "left" ? 0.2 : GRID.w - 0.3;
    v.box(x, 3.3, 2.95, 0.1, 0.22, 0.1, 0xffd36a, true);
    lights.push({ x: side === "left" ? 0.6 : GRID.w - 0.6, y: 3.4, z: 3, intensity: 5 });
  }
  if (look.jars) for (let k = 0; k < 2; k++) {
    put(1, 2.6 + k * 0.8, 4, 0.08, 0.35, look.wood);
    for (let i = 0; i < 9; i++) jar(v, side === "left" ? 0.05 : GRID.w - 0.3, 2.68 + k * 0.8, 1.1 + i * 0.42, 0.24 + (i % 3) * 0.06, JARS[(i + k) % 5], i % 4 === 0);
  }
}

function floor(v, r, look) {
  v.box(0, -0.3, 0, GRID.w, 0.27, GRID.d, mix(look.floor, 0x000000, 0.55));                 // the dark gaps between boards
  for (let x = 0; x < GRID.w - 1e-6; x += 0.375) {
    let z = -r() * 1.5;
    while (z < GRID.d) {
      const len = [1.5, 2.25, 3][(r() * 3) | 0], z0 = Math.max(0, z), z1 = Math.min(GRID.d, z + len);
      if (z1 - z0 > 0.05) v.box(x + 0.012, -0.12, z0 + 0.012, 0.35, 0.12, z1 - z0 - 0.024, vary(look.floor, 0.14, r));
      z += len;
    }
  }
  v.box(-T, -0.6, GRID.d, GRID.w + 2 * T, 0.6, 0.2, look.dark);                              // the stage's front edge
}

function extras(v, r, look, lights) {
  if (look.chandelier) {
    const cx = GRID.w / 2, cz = 2.6, y = 4.1;
    v.box(cx - 0.03, y + 0.5, cz - 0.03, 0.06, WALL_H - y - 0.5, 0.06, 0x2a1a14);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, x = cx + Math.cos(a) * 0.55, z = cz + Math.sin(a) * 0.4;
      v.box(x - 0.04, y, z - 0.04, 0.08, 0.2, 0.08, 0xe8dcc8);
      v.box(x - 0.03, y + 0.2, z - 0.03, 0.06, 0.09, 0.06, 0xffd36a, true);
    }
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) v.box(cx + Math.cos(a) * 0.55 - 0.05, y - 0.05, cz + Math.sin(a) * 0.4 - 0.05, 0.1, 0.06, 0.1, look.trim);
    lights.push({ x: cx, y: y, z: cz, intensity: 10 });
  }
  if (look.cobwebs) for (const [x0, flip] of [[0.3, 1], [GRID.w - 0.3, -1]]) for (let i = 0; i < 10; i++) for (let k = 0; k <= i; k += 2) v.box(x0 + flip * (i - k) * 0.1, 4.2 - k * 0.1, 0.02, 0.05, 0.05, 0.03, 0xc8c0d0);
  if (look.herbs) for (let i = 0; i < 12; i++) v.box(0.8 + i * 0.75, 4.1 - (i % 3) * 0.12, 0.25, 0.14, 0.5, 0.14, vary(0x5a7a3a, 0.2, r));
  if (look.rafters) for (const z of [1.5, 3, 4.5]) {
    v.box(-T, WALL_H - 0.1, z, GRID.w + 2 * T, 0.3, 0.3, look.dark);
    for (const [x, d] of [[0, 1], [GRID.w, -1]]) for (let k = 0; k < 8; k++) v.box(x + d * k * 0.25 - (d < 0 ? 0.25 : 0), WALL_H - 0.9 + k * 0.1, z, 0.25, 0.25, 0.3, look.dark);
  }
  if (look.fairyLights) for (let x = 0.2; x < GRID.w; x += 0.3) v.box(x, WALL_H - 0.45 - Math.sin(x * 0.9) * 0.12, 0.4, 0.07, 0.07, 0.07, [0xffd894, 0xc89cff, 0xffc46a][Math.round(x * 4) % 3], true);
  lights.push({ x: GRID.w / 2, y: 3.4, z: GRID.d * 0.75, color: 0xffd0a0, intensity: 7 });   // the room's warm fill
}

// A room in a style, with the chosen wallpaper (a catalogue item) or none.
export function buildRoom(style, wallpaper) {
  const look = STYLES[style] ?? STYLES["parlour-warm"], v = new Voxels(), r = seeded(style.length * 31 + (wallpaper ? 7 : 0)), lights = [];
  const paper = wallpaper ? { id: wallpaper.id, base: parseInt(wallpaper.color.slice(1), 16) } : null;
  floor(v, r, look);
  backWall(v, r, look, paper, lights, look.hearth ? "hearth" : look.roundWindow ? "round" : "panel");
  sideWall(v, r, look, paper, "left", lights);
  sideWall(v, r, look, paper, "right", lights);
  extras(v, r, look, lights);
  return { group: v.build(), lights };
}

// The shop: shelves of glowing jars, the display tables, Skyla's counter and the door.
export const SHOP_SPOTS = {
  door: { x: 0.6, z: 5.4 },
  tables: [{ x: 2, z: 2.2 }, { x: 4.6, z: 2.2 }, { x: 2, z: 4 }, { x: 4.6, z: 4 }],
  counter: { x: 8, z: 2.4 },
  pay: { x: 6.7, z: 2.8 },
  queue: [{ x: 6.7, z: 4 }, { x: 6.7, z: 5.1 }, { x: 5.6, z: 5.4 }, { x: 4.5, z: 5.5 }, { x: 3.4, z: 5.5 }],
};
export function buildShopInterior() {
  const look = { wall: 0x5a3a26, wall2: 0x523420, wood: 0x6a4428, dark: 0x3a2214, trim: 0x8a5a36, floor: 0x7a4a2a, window: "round" }, v = new Voxels(), r = seeded(404), lights = [];
  floor(v, r, look);
  const put = wall(v, "back");
  wallFace(put, r, look, null, GRID.w);
  for (const u of [0.24, GRID.w - 0.24]) column(put, u, look);
  // Shelves of jars and little pumpkins along the back wall.
  for (const y of [1.9, 2.75, 3.6]) {
    put(0.5, y, GRID.w - 1, 0.1, 0.45, look.trim);
    for (let i = 0; i < 26; i++) jar(v, 0.6 + i * 0.34, y + 0.1, 0.1, 0.24 + (i % 3) * 0.06, [0xffb85a, 0xf0821e, 0xb774ff, 0xd9d2ff, 0xf5c84a][(i + y * 3) % 5 | 0], i % 3 === 0);
  }
  // The side walls: the door on the left, open onto the lantern-lit path.
  sideWall(v, r, look, null, "left", lights);
  sideWall(v, r, look, null, "right", lights);
  v.box(-T - 0.02, 0, 4.5, T + 0.08, 2.7, 1.6, 0x24160e);
  for (let y = 0.1; y < 2.5; y += V) for (let z = 4.6; z < 6; z += V) v.box(-0.06, y, z, 0.04, V, V, mix(0x6a4ab0, 0x23164e, y / 2.6), true);
  v.box(-T - 0.05, 2.6, 4.4, T + 0.15, 0.2, 1.8, look.trim);
  // Display tables.
  for (const t of SHOP_SPOTS.tables) {
    v.box(t.x - 0.8, 0, t.z - 0.5, 1.6, 0.8, 1, look.wood);
    v.box(t.x - 0.85, 0.8, t.z - 0.55, 1.7, 0.1, 1.1, 0x8a5a36);
    v.box(t.x - 0.7, 0.1, t.z + 0.5, 1.4, 0.6, 0.04, look.dark);
  }
  // Skyla's counter with the till, the bell and a lantern.
  const c = SHOP_SPOTS.counter;
  v.box(c.x - 0.5, 0, c.z - 1.6, 1.4, 1.15, 3.2, look.wood);
  v.box(c.x - 0.6, 1.15, c.z - 1.7, 1.6, 0.12, 3.4, 0x8a5a36);
  for (let z = -1.5; z < 1.6; z += 0.5) v.box(c.x - 0.52, 0.12, c.z + z, 0.04, 0.9, 0.06, look.dark);
  v.box(c.x, 1.27, c.z + 0.7, 0.6, 0.35, 0.4, 0xd9a35a);
  v.box(c.x + 0.1, 1.27, c.z - 1.2, 0.22, 0.22, 0.22, 0xd9a35a);
  v.box(c.x + 0.6, 1.27, c.z - 0.9, 0.3, 0.45, 0.3, 0xffc46a, true);
  lights.push({ x: c.x, y: 2.6, z: c.z }, { x: 3.2, y: 3.6, z: 2.6 }, { x: 3.2, y: 3.4, z: 5, color: 0xffc890, intensity: 6 }, { x: 0.4, y: 1.5, z: 5.2, color: 0xb8a8ff, intensity: 4 });
  return { group: v.build(), lights };
}
