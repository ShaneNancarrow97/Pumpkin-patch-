import * as THREE from "three";
import { Voxels } from "./voxels.js";
import decorUrl from "../assets/decor.png";
import { DECOR_ART } from "./decor-meta.js";
import { decorById, footprint } from "./model.js";

// Decor: each piece is voxelised from the main game's own art (decor.png), one
// voxel per pixel, scaled to its height in the room, with depth rounded
// towards the silhouette's edge. Bright warm or magical pixels glow.
const HEIGHTS = {
  f01: 1.5, f02: 1.4, f03: 1.7, f04: 0.8, f05: 1.6, f06: 2.6, f07: 0.7, f08: 1, f09: 1.7, f10: 1.05, f11: 2.6, f12: 2.7, f13: 1.3, f14: 2.1,
  d01: 1.1, d02: 2.1, d03: 0.9, d04: 1.2, d05: 0.8, d06: 0.8, d07: 1.4, d08: 1, d09: 1.4, d10: 1.15, d11: 1.1, d12: 0.8, d13: 1, d14: 2.5, d15: 1, d16: 1.3,
};
const BOX = new THREE.BoxGeometry(1, 1, 1);
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

function pixelsOf(art) {
  const { data, width } = decorPixels, out = [];
  for (let y = 0; y < art.h; y++) {
    const row = [];
    for (let x = 0; x < art.w; x++) {
      const o = ((art.y + y) * width + art.x + x) * 4;
      row.push(data[o + 3] > 128 ? [data[o], data[o + 1], data[o + 2]] : null);
    }
    out.push(row);
  }
  return out;
}
const glows = ([r, g, b]) => { const max = Math.max(r, g, b), min = Math.min(r, g, b); return max > 215 && (max - min) / max > 0.3 && !(b > r && b > g); };

// The voxel prop for one catalogue piece, standing on (0, 0, 0) and centred on
// its footprint. Rugs lie flat; wall pieces are thin and hang from the back wall.
export function decorProp(id) {
  const art = DECOR_ART[id], fp = footprint(id), px = pixelsOf(art), group = new THREE.Group();
  const flat = fp.layer === "rug", wall = fp.layer === "wall";
  const size = flat ? Math.min((fp.w * 0.96) / art.w, (fp.d * 0.96) / art.h) : Math.min((fp.w * 0.96) / art.w, (HEIGHTS[id] ?? 1) / art.h);
  // Pieces are thick voxel standees, like the characters: a little rounding at the
  // edges, otherwise an even depth, so the art reads as it was drawn.
  const maxDepth = flat ? 0.05 : wall ? 0.1 : ["furniture", "shelves"].includes(decorById[id].category) ? 0.42 : 0.3;
  const solid = [], lit = [];
  for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) {
    const c = px[y][x];
    if (!c) continue;
    let d = 0;
    while (x - d - 1 >= 0 && px[y][x - d - 1] && x + d + 1 < art.w && px[y][x + d + 1] && d < 40) d++;
    (glows(c) ? lit : solid).push([x, y, d, c]);
  }
  const make = (cells, material) => {
    if (!cells.length) return;
    const mesh = new THREE.InstancedMesh(BOX, material, cells.length), m = new THREE.Matrix4(), color = new THREE.Color();
    cells.forEach(([x, y, d, [r, g, b]], i) => {
      const depth = Math.min(maxDepth, size * 1.5 + d * size * 1.6), wx = (x + 0.5 - art.w / 2) * size;
      if (flat) m.makeScale(size, depth, size).setPosition(wx, depth / 2, (y + 0.5 - art.h / 2) * size);
      else m.makeScale(size, size, depth).setPosition(wx, (art.h - y - 0.5) * size, wall ? depth / 2 : 0);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace));
    });
    mesh.castShadow = !flat; mesh.receiveShadow = true;
    group.add(mesh);
  };
  make(solid, new THREE.MeshStandardMaterial({ roughness: 0.85 }));
  make(lit, new THREE.MeshBasicMaterial({ toneMapped: false }));
  group.userData = { size, height: flat ? 0.05 : art.h * size, width: art.w * size, depth: maxDepth, glowing: lit.length > 6 };
  return group;
}

// Books stand in the shelf's own sockets, in their spine colours.
const spineColour = (() => {
  const cache = {};
  return (id) => {
    if (cache[id]) return cache[id];
    const px = pixelsOf(DECOR_ART["spine-" + id]).flat().filter(Boolean);
    const avg = px.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]).map((n) => n / px.length / 255);
    return (cache[id] = new THREE.Color().setRGB(avg[0], avg[1], avg[2], THREE.SRGBColorSpace).getHex());
  };
})();
export function shelfBooks(shelfId, books, prop) {
  const art = DECOR_ART[shelfId], v = new Voxels(), { size, depth } = prop.userData;
  books.forEach((book, i) => {
    const k = art.sockets[i];
    if (!k) return;
    const x = (k.x + k.w / 2 - art.w / 2) * size, y = (art.h - k.y - k.h) * size, w = Math.max(0.06, k.w * size * 0.9), h = k.h * size * 0.95;
    v.box(x - w / 2, y, depth / 2 - 0.02, w, h, 0.05, spineColour(book));
    v.box(x - w / 2, y + h * 0.7, depth / 2 + 0.01, w, h * 0.08, 0.03, 0xd9b45a);       // a gilt band
  });
  return v.build({ shadows: false });
}
