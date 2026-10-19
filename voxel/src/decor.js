import * as THREE from "three";
import { Voxels } from "./voxels.js";
import { VoxelGrid, meshGrid, voxelGroup } from "./voxel-mesh.js";
import decorUrl from "../assets/decor.png";
import { DECOR_ART } from "./decor-meta.js";
import { decorById, footprint } from "./model.js";
import { RECIPES } from "./decor-models/index.js";
import { buildModel, glows, mix, scale } from "./decor-models/kit.js";
import { PREMIUM_WALL_RECIPES, premiumWallProp, premiumWallStats } from "./premium-wall-props.js";
import { PREMIUM_FURNITURE_RECIPES, premiumFurnitureProp, premiumFurnitureStats } from "./premium-furniture-props.js";

// Decor. Pieces with a recipe in decor-models/ are modelled in voxels as real
// 3D objects, coloured from the main game's own art (decor.png); the rest are
// voxelised from the art as thick standees, one voxel per pixel, with depth
// rounded towards the silhouette's edge. Bright warm or magical pixels glow.
// Heights are of the art in room units; a model keeps the same scale.
export const HEIGHTS = {
  f01: 1.5, f02: 1.4, f03: 1.7, f04: 0.8, f05: 1.6, f06: 2.6, f07: 0.7, f08: 1, f09: 1.7, f10: 1.05, f11: 2.6, f12: 2.7, f13: 1.3, f14: 2.1,
  d01: 1.1, d02: 2.1, d03: 0.9, d04: 1.2, d05: 0.8, d06: 0.8, d07: 1.4, d08: 1, d09: 1.4, d10: 1.15, d11: 1.1, d12: 0.8, d13: 1, d14: 2.5, d15: 1, d16: 1.3,
};
const BOX = new THREE.BoxGeometry(1, 1, 1);
BOX.userData.shared = true;
let decorPixels = null;
export function loadDecor() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      resolve((decorPixels = g.getImageData(0, 0, img.width, img.height)));
    };
    img.onerror = reject;
    img.src = decorUrl;
  });
}
export const decorReady = () => !!decorPixels;
export const decorThumb = () => decorUrl;

// One piece of art as rows (top down) of 0xrrggbb, or -1 where it is clear.
function artPixels(art) {
  const { data, width } = decorPixels, out = [];
  for (let y = 0; y < art.h; y++) {
    const row = new Int32Array(art.w);
    for (let x = 0; x < art.w; x++) {
      const o = ((art.y + y) * width + art.x + x) * 4;
      row[x] = data[o + 3] > 128 ? (data[o] << 16) | (data[o + 1] << 8) | data[o + 2] : -1;
    }
    out.push(row);
  }
  return out;
}

// A modelled piece: built and meshed once, then shared by every copy in the house.
const models = new Map();
function model(id) {
  if (models.has(id)) return models.get(id);
  const recipe = RECIPES[id], art = DECOR_ART[id], fp = footprint(id), flat = fp.layer === "rug", wall = fp.layer === "wall";
  const { grid, sockets, size: [W, H, D] } = buildModel(recipe, art, artPixels(art));
  // Units per art pixel: the standee's scale, kept inside the footprint with a margin.
  let size = recipe.size ?? (flat ? Math.min((fp.w * 0.96) / W, (fp.d * 0.96) / D) : Math.min((fp.w * 0.94) / W, (HEIGHTS[id] ?? 1) / art.h));
  if (!wall && !recipe.size) size = Math.min(size, (fp.d * 0.94) / D);
  const res = recipe.res ?? 1, offset = [(-W / 2) * size, 0, wall ? 0 : (-D / 2) * size];
  let top = 0, glowing = 0;
  for (let i = 0; i < grid.kind.length; i++) if (grid.kind[i]) { top = Math.max(top, Math.floor(i / grid.nx) % grid.ny); glowing += grid.kind[i] === 2; }
  const entry = {
    geometry: meshGrid(grid, { scale: size / res, offset }), grid: { nx: grid.nx, ny: grid.ny, nz: grid.nz, res, offset, size },
    data: { native: true, size, width: W * size, height: ((top + 1) / res) * size, depth: D * size, glowing: glowing > 6,
      sockets: sockets.map((s) => ({ x: offset[0] + s.x * size, y: s.y * size, z: offset[2] + s.z * size, w: s.w * size, h: s.h * size, d: s.d * size })) },
  };
  models.set(id, entry);
  return entry;
}
// For the bench: how many faces a modelled piece has.
export const modelStats = (id) => { if (PREMIUM_WALL_RECIPES[id]) return premiumWallStats(id); if (PREMIUM_FURNITURE_RECIPES[id]) return premiumFurnitureStats(id); const m = RECIPES[id] && decorPixels ? model(id) : null; return m && { triangles: m.geometry.reduce((n, g) => n + (g ? g.index.count / 3 : 0), 0), ...m.grid }; };

// The voxel prop for one catalogue piece, standing on (0, 0, 0) and centred on
// its footprint. Rugs lie flat; wall pieces hang with their back at z = 0.
export function decorProp(id) {
  if (PREMIUM_WALL_RECIPES[id]) return premiumWallProp(id);
  if (PREMIUM_FURNITURE_RECIPES[id]) return premiumFurnitureProp(id);
  if (RECIPES[id]) {
    try {
      const m = model(id), group = voxelGroup(m.geometry, { shared: true });
      group.userData = { ...m.data, sockets: m.data.sockets.map((s) => ({ ...s })) };
      return group;
    } catch (e) {
      console.error(`decor model ${id}:`, e);                       // a broken recipe falls back to the standee
      RECIPES[id] = null;
    }
  }
  return standee(id);
}

function standee(id) {
  const art = DECOR_ART[id], fp = footprint(id), px = artPixels(art), group = new THREE.Group();
  const flat = fp.layer === "rug", wall = fp.layer === "wall";
  const size = flat ? Math.min((fp.w * 0.96) / art.w, (fp.d * 0.96) / art.h) : Math.min((fp.w * 0.96) / art.w, (HEIGHTS[id] ?? 1) / art.h);
  // Pieces are thick voxel standees, like the characters: a little rounding at the
  // edges, otherwise an even depth, so the art reads as it was drawn.
  const maxDepth = flat ? 0.05 : wall ? 0.1 : ["furniture", "shelves"].includes(decorById[id].category) ? 0.42 : 0.3;
  const solid = [], lit = [];
  for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) {
    const c = px[y][x];
    if (c < 0) continue;
    let d = 0;
    while (x - d - 1 >= 0 && px[y][x - d - 1] >= 0 && x + d + 1 < art.w && px[y][x + d + 1] >= 0 && d < 40) d++;
    (glows(c) ? lit : solid).push([x, y, d, c]);
  }
  const make = (cells, material) => {
    if (!cells.length) return;
    const mesh = new THREE.InstancedMesh(BOX, material, cells.length), m = new THREE.Matrix4(), color = new THREE.Color();
    cells.forEach(([x, y, d, c], i) => {
      const depth = Math.min(maxDepth, size * 1.5 + d * size * 1.6), wx = (x + 0.5 - art.w / 2) * size;
      if (flat) m.makeScale(size, depth, size).setPosition(wx, depth / 2, (y + 0.5 - art.h / 2) * size);
      else m.makeScale(size, size, depth).setPosition(wx, (art.h - y - 0.5) * size, wall ? depth / 2 : 0);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.setHex(c, THREE.SRGBColorSpace));
    });
    mesh.castShadow = !flat; mesh.receiveShadow = true;
    group.add(mesh);
  };
  make(solid, new THREE.MeshStandardMaterial({ roughness: 0.85 }));
  make(lit, new THREE.MeshBasicMaterial({ toneMapped: false }));
  group.userData = { size, height: flat ? 0.05 : art.h * size, width: art.w * size, depth: maxDepth, glowing: lit.length > 6 };
  return group;
}

// A book's spine art: rows of colours, and its average.
const spines = new Map();
function spine(id) {
  if (!spines.has(id)) {
    const art = DECOR_ART["spine-" + id], px = artPixels(art), all = px.flatMap((r) => [...r]).filter((c) => c >= 0);
    const avg = all.reduce((a, c) => [a[0] + (c >> 16), a[1] + ((c >> 8) & 255), a[2] + (c & 255)], [0, 0, 0]).map((n) => n / all.length);
    spines.set(id, { art, px, avg: (Math.round(avg[0]) << 16) | (Math.round(avg[1]) << 8) | Math.round(avg[2]) });
  }
  return spines.get(id);
}

// Books stand in the shelf's sockets, spines out, in their spine art's colours.
// A modelled shelf has real slots; a standee shelf keeps the art's own sockets.
export function shelfBooks(shelfId, books, prop) {
  if (prop.userData.native) return modelBooks(shelfId, books);
  const art = DECOR_ART[shelfId], v = new Voxels(), { size, depth } = prop.userData;
  books.forEach((book, i) => {
    const k = art.sockets[i];
    if (!k) return;
    const x = (k.x + k.w / 2 - art.w / 2) * size, y = (art.h - k.y - k.h) * size, w = Math.max(0.06, k.w * size * 0.9), h = k.h * size * 0.95;
    v.box(x - w / 2, y, depth / 2 - 0.02, w, h, 0.05, spine(book).avg);
    v.box(x - w / 2, y + h * 0.7, depth / 2 + 0.01, w, h * 0.08, 0.03, 0xd9b45a);       // a gilt band
  });
  return v.build({ shadows: false });
}

// Voxel books on the shelf's own voxel grid, so they line up with its boards.
function modelBooks(shelfId, books) {
  const m = model(shelfId), { nx, ny, nz, res, offset, size } = m.grid, grid = new VoxelGrid(nx, ny, nz), slots = m.data.sockets;
  books.forEach((book, n) => {
    const s = slots[n];
    if (!s) return;
    const { px, art, avg } = spine(book), vs = size / res;
    // Socket corners in voxels. Heights vary a little from book to book.
    const i0 = Math.round((s.x - offset[0]) / vs), i1 = Math.max(i0 + 1, Math.round((s.x + s.w - offset[0]) / vs));
    const j0 = Math.round(s.y / vs), j1 = j0 + Math.max(2, Math.round((s.h / vs) * (0.86 + ((n * 7 + book.length) % 4) * 0.045)));
    const k0 = Math.round((s.z - offset[2]) / vs), k1 = Math.max(k0 + 1, Math.round((s.z + s.d - offset[2]) / vs));
    for (let k = k0; k < k1; k++) for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
      // The spine faces out, drawn from the art; the covers and top are its colour, a little darker.
      const u = Math.min(art.w - 1, Math.floor(((i - i0 + 0.5) / (i1 - i0)) * art.w)), v = Math.min(art.h - 1, Math.floor(((j1 - j - 0.5) / (j1 - j0)) * art.h));
      const c = k === k1 - 1 ? (px[v][u] >= 0 ? px[v][u] : avg) : j === j1 - 1 && i > i0 && i < i1 - 1 && k > k0 ? mix(0xe8dcc0, avg, 0.2) : scale(avg, 0.8);
      grid.set(i, j, k, c);
    }
  });
  const group = voxelGroup(meshGrid(grid, { scale: size / res, offset }));
  group.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return group;
}
