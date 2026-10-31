import * as THREE from "three";
import { Voxels } from "./voxels.js";
import { VoxelGrid, meshGrid, voxelGroup } from "./voxel-mesh.js";
import decorUrl from "../assets/decor.png";
import { DECOR_ART } from "./decor-meta.js";
import { decorById, footprint } from "./model.js";
import { RECIPES, shelfRecipe, SHELF_PX } from "./decor-models/index.js";
import { SHELF_CATALOG } from "./content/shelf-catalog.js";
import { buildModel, glows, mix, scale } from "./decor-models/kit.js";
import { PREMIUM_WALL_RECIPES, premiumWallProp, premiumWallStats } from "./premium-wall-props.js";
import { PREMIUM_FURNITURE_RECIPES, premiumFurnitureProp, premiumFurnitureStats } from "./premium-furniture-props.js";
import { KITCHEN_EQUIPMENT_BY_ID } from "./content/kitchen-equipment.js";
import { kitchenProp, kitchenPropStats } from "./kitchen-props.js";
import { HOME_FURNISHINGS_BY_ID } from "./content/home-furnishings.js";
import { homeFurnishingProp, homeFurnishingStats } from "./home-furnishings.js";
import { buildPetFurnishing, petFurnishingStats } from "./pet-furnishings.js";

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
  // A brew (the cauldron's) is built on its own and moved in its shaders.
  const brew = recipe.brew && buildModel({ ...recipe, build: recipe.brew.build }, art, artPixels(art)).grid;
  if (brew) for (let i = 0; i < brew.kind.length; i++) glowing += brew.kind[i] === 2;
  const entry = {
    geometry: meshGrid(grid, { scale: size / res, offset }), grid: { nx: grid.nx, ny: grid.ny, nz: grid.nz, res, offset, size },
    data: { native: true, size, width: W * size, height: ((top + 1) / res) * size, depth: D * size, glowing: glowing > 6,
      sockets: sockets.map((s) => ({ x: offset[0] + s.x * size, y: s.y * size, z: offset[2] + s.z * size, w: s.w * size, h: s.h * size, d: s.d * size })) },
  };
  if (brew) entry.brew = brewFx(meshGrid(brew, { scale: size / res, offset })[1], recipe.brew, offset, size, size / res);
  models.set(id, entry);
  return entry;
}
// A blank shelf in one finish: built from the catalogue's own surfaces, meshed
// once per finish and shared by every copy. Unknown finishes take the first.
const SHELVES = Object.fromEntries(SHELF_CATALOG.map((item) => [item.id, item]));
const shelfModels = new Map();
function shelfModel(id, finish) {
  const item = SHELVES[id], f = item.finishes.find((x) => x.id === finish) ?? item.finishes[0], key = id + ":" + f.id;
  if (shelfModels.has(key)) return shelfModels.get(key);
  const recipe = shelfRecipe(item, f), art = { w: recipe.width, h: recipe.height }, size = 1 / SHELF_PX;
  const { grid } = buildModel(recipe, art, Array.from({ length: art.h }, () => new Int32Array(art.w).fill(-1)));
  const offset = [(-recipe.width * size) / 2, 0, item.wall ? 0 : (-recipe.depth * size) / 2], geometry = meshGrid(grid, { scale: size / recipe.res, offset });
  let top = 0;
  for (let i = 0; i < grid.kind.length; i++) if (grid.kind[i]) top = Math.max(top, Math.floor(i / grid.nx) % grid.ny + 1);
  const entry = { geometry, data: { native: true, mount: item.wall ? "wall" : "floor", finish: f.id, width: recipe.width * size, height: (top * size) / recipe.res,
    depth: recipe.depth * size, glowing: false, surfaces: item.surfaces, triangles: geometry.reduce((n, g) => n + (g ? g.index.count / 3 : 0), 0), nx: grid.nx, ny: grid.ny, nz: grid.nz, size } };
  shelfModels.set(key, entry);
  return entry;
}

// For the bench: how many faces a modelled piece has.
export const modelStats = (id, finish) => { const pet=petFurnishingStats(id);if(pet)return pet; if (HOME_FURNISHINGS_BY_ID[id]) return homeFurnishingStats(id); if (KITCHEN_EQUIPMENT_BY_ID[id]) return kitchenPropStats(id); if (SHELVES[id]) return shelfModel(id, finish).data; if (PREMIUM_WALL_RECIPES[id]) return premiumWallStats(id); if (PREMIUM_FURNITURE_RECIPES[id]) return premiumFurnitureStats(id); const m = RECIPES[id] && decorPixels ? model(id) : null; return m && { triangles: m.geometry.reduce((n, g) => n + (g ? g.index.count / 3 : 0), 0), ...m.grid }; };

// The voxel prop for one catalogue piece, standing on (0, 0, 0) and centred on
// its footprint. Rugs lie flat; wall pieces hang with their back at z = 0.
// finish: one of the piece's finishes (blank shelves), else ignored.
export function decorProp(id, { finish } = {}) {
  const pet=buildPetFurnishing(id);if(pet)return pet;
  if (HOME_FURNISHINGS_BY_ID[id]) return homeFurnishingProp(id);
  if (KITCHEN_EQUIPMENT_BY_ID[id]) return kitchenProp(id);
  if (SHELVES[id]) {
    const m = shelfModel(id, finish), group = voxelGroup(m.geometry, { shared: true });
    group.name = id; group.userData = { ...m.data, sockets: [] };
    return group;
  }
  if (PREMIUM_WALL_RECIPES[id]) return premiumWallProp(id);
  if (PREMIUM_FURNITURE_RECIPES[id]) return premiumFurnitureProp(id);
  if (RECIPES[id]) {
    try {
      const m = model(id), group = voxelGroup(m.geometry, { shared: true });
      group.userData = { ...m.data, sockets: m.data.sockets.map((s) => ({ ...s })) };
      if (m.brew) { for (const mesh of m.brew.meshes()) group.add(mesh); group.userData.tick = m.brew.tick; }
      return group;
    } catch (e) {
      console.error(`decor model ${id}:`, e);                       // a broken recipe falls back to the standee
      RECIPES[id] = null;
    }
  }
  return standee(id);
}

// ── The cauldron's brew, alive ──
// The surface swirls, bubbles swell in voxel steps and burst (flinging a drop),
// and a few faint wisps of steam rise and fade. All of it runs in the shaders off
// one shared clock, so tick() only sets a number and nothing is made per frame;
// each cauldron takes its phase from where it stands, so no two keep in step.
const BREW_TIME = { value: 0 };
const BREW_GLSL = `uniform float uBrewTime, uVoxel, uRadius, uTop; uniform vec2 uCentre;
float brewHash(float n) { return fract(sin(n) * 43758.5453); }
float brewPhase() { return fract(dot(modelMatrix[3].xz, vec2(0.137, 0.291))) * 50.0; }`;
// A basic (unlit, so places.js leaves its shadows off) material with shader edits:
// vertex code after the vertex is placed, fragment code after its colour is set.
function brewMaterial(key, uniforms, opts, { head = "", vertex = "", fragHead = "", fragment = "" }) {
  const m = new THREE.MeshBasicMaterial(opts);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms, { uBrewTime: BREW_TIME });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${BREW_GLSL}\n${head}`).replace("#include <begin_vertex>", `#include <begin_vertex>\n${vertex}`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\n${fragHead}`).replace("#include <color_fragment>", `#include <color_fragment>\n${fragment}`);
  };
  m.customProgramCacheKey = () => key;
  return m;
}
// Copies of geometries merged into one: [[geometry, tags], ...], each copy's
// vertices carrying its tag (a vec4) for the shader.
function copies(sets) {
  const pos = [], col = [], tag = [], idx = [];
  for (const [geo, tags] of sets) {
    const p = geo.attributes.position, c = geo.attributes.color, n = p.count;
    for (const t of tags) {
      const base = pos.length / 3;
      for (let i = 0; i < n; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); col.push(c ? c.getX(i) : 1, c ? c.getY(i) : 1, c ? c.getZ(i) : 1); tag.push(...t); }
      for (const i of geo.index.array) idx.push(i + base);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  out.setAttribute("aTag", new THREE.Float32BufferAttribute(tag, 4));
  out.setIndex(idx);
  return out;
}
function brewFx(surface, spec, offset, size, voxel) {
  const centre = new THREE.Vector2(offset[0] + spec.centre[0] * size, offset[2] + spec.centre[1] * size), radius = spec.radius * size, top = spec.top * size, rise = 0.55;
  const uniforms = { uCentre: { value: centre }, uRadius: { value: radius }, uTop: { value: top }, uVoxel: { value: voxel } };
  // The surface: two slow spiral currents, sampled per voxel so it stays blocky,
  // lighten and darken the lime, with foam on the crests and a soft breathing glow.
  const surf = brewMaterial("brew-surface", uniforms, { vertexColors: true, toneMapped: false }, {
    head: "varying vec3 vBrew; varying float vPhase;", vertex: "vBrew = position; vPhase = brewPhase();",
    fragHead: "uniform float uBrewTime, uVoxel, uRadius; uniform vec2 uCentre; varying vec3 vBrew; varying float vPhase;",
    fragment: `vec2 p = (floor(vBrew.xz / uVoxel) + 0.5) * uVoxel - uCentre; float r = length(p) / uRadius, a = atan(p.y, p.x), t = uBrewTime + vPhase;
      float s = 0.6 * (0.5 + 0.5 * sin(a * 3.0 - r * 7.0 + t * 1.2)) + 0.4 * (0.5 + 0.5 * sin(a * 2.0 + r * 4.5 - t * 0.7 + 1.7));
      diffuseColor.rgb *= mix(0.62, 1.12, s) * (0.92 + 0.08 * sin(t * 1.1) + 0.03 * sin(t * 2.7));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.8, 0.2), smoothstep(0.86, 0.98, s) * (1.0 - r) * 0.5);` });
  // Bubbles: a little voxel dome, six copies, each swelling in three steps at a new
  // spot each time round and bursting. A darker ripple rings it and spreads from
  // the burst, and a single voxel drop leaps out.
  const dome = new VoxelGrid(7, 4, 7), ripple = new VoxelGrid(11, 1, 11), single = new VoxelGrid(1, 1, 1);
  for (let x = 0; x < 7; x++) for (let y = 0; y < 4; y++) for (let z = 0; z < 7; z++) {
    const d = (x - 3) ** 2 + (z - 3) ** 2;
    if (d + (y * 1.25) ** 2 <= 10.5) dome.set(x, y, z, y >= 2 && d < 3 ? 0xf0f6a8 : y >= 1 && d < 6 ? 0xc2e466 : 0x9acc48, true);
  }
  for (let x = 0; x < 11; x++) for (let z = 0; z < 11; z++) { const d = Math.hypot(x - 5, z - 5); if (d > 3.6 && d < 5.2) ripple.set(x, 0, z, 0x46701c, true); }
  single.set(0, 0, 0, 0xd8f080, true);
  const bubbles = [0, 1, 2, 3, 4, 5].map((i) => [i * 3.71 + 0.3, 0.32 + ((i * 0.37) % 0.3), 0.6 + ((i * 0.53) % 0.5), 0]);
  const mesh1 = (g, c) => meshGrid(g, { offset: [-c, 0, -c], ao: false })[1];
  const bubbleGeo = copies([[mesh1(dome, 3.5), bubbles], [mesh1(ripple, 5.5), bubbles.map((b) => [b[0], b[1], b[2], 2])], [mesh1(single, 0.5), bubbles.map((b) => [b[0], b[1], 1, 1])]]);
  const bub = brewMaterial("brew-bubbles", uniforms, { vertexColors: true, toneMapped: false }, {
    head: "attribute vec4 aTag; varying float vLife;",
    vertex: `float t = uBrewTime * aTag.y + aTag.x + brewPhase(), n = floor(t), k = fract(t), burst = clamp((k - 0.84) / 0.16, 0.0, 1.0);
      float ang = aTag.x * 2.4 + brewHash(n * 1.7 + aTag.x * 13.1) * 2.2, rad = sqrt(brewHash(n * 3.1 + aTag.x * 7.3)) * uRadius * 0.68;
      vec2 at = (floor((uCentre + vec2(cos(ang), sin(ang)) * rad) / uVoxel) + 0.5) * uVoxel;
      float grow = (floor(min(k / 0.78, 0.999) * 3.0) + 1.0) / 3.0;
      if (aTag.w > 1.5) transformed = position * uVoxel * aTag.z * (k < 0.84 ? grow : 1.0 + burst * 0.8) * step(burst, 0.95) + vec3(at.x, uTop - 0.85 * uVoxel, at.y);
      else if (aTag.w > 0.5) transformed = position * uVoxel * step(0.84, k) * step(burst, 0.95) + vec3(at.x + burst * 3.0 * uVoxel, uTop + sin(burst * 3.1416) * 7.0 * uVoxel, at.y);
      else transformed = position * uVoxel * aTag.z * grow * step(k, 0.84) + vec3(at.x, uTop - 0.6 * uVoxel, at.y);
      vLife = k;`,
    fragHead: "varying float vLife;", fragment: "diffuseColor.rgb *= 0.85 + 0.35 * vLife;" });
  // Steam: six faint wisps of three soft cubes each, rising from spots spread round
  // the pot (each wisp keeps to its own side, by the golden angle),
  // swaying, swelling and fading out: tinted by the brew low down, moonlit higher.
  const puffs = [];
  for (let i = 0; i < 6; i++) for (const w of [0, 1, 2]) puffs.push([i * 2.13 + 0.7, 0.15 + ((i * 0.23) % 0.1), 3.2 + ((i * 0.61) % 1.6), w]);
  const steamGeo = copies([[new THREE.BoxGeometry(1, 1, 1), puffs]]);
  const steam = brewMaterial("brew-steam", { ...uniforms, uRise: { value: rise } }, { transparent: true, depthWrite: false, opacity: 0.11 }, {
    head: "attribute vec4 aTag; uniform float uRise; varying float vLife;",
    vertex: `float t = uBrewTime * aTag.y + aTag.x + brewPhase(), n = floor(t), k = fract(t);
      float ang = aTag.x * 2.4 + brewHash(n * 2.3 + aTag.x * 5.1) * 1.2, rad = sqrt(brewHash(n * 4.7 + aTag.x * 3.9)) * uRadius * 0.62, sway = sin(k * 4.0 + aTag.x * 9.0) * 0.09 * k;
      vec2 at = uCentre + vec2(cos(ang), sin(ang)) * rad; float grow = (0.8 + 1.6 * k) * aTag.z * uVoxel;
      vec3 off = aTag.w > 1.5 ? vec3(-0.6, 0.5, 0.3) : aTag.w > 0.5 ? vec3(0.55, 0.3, -0.45) : vec3(0.0);
      transformed = position * grow * (aTag.w > 0.5 ? 0.7 : 1.0) + vec3(at.x + sway, uTop + 2.0 * uVoxel + k * uRise, at.y + sway * 0.5) + off * grow;
      vLife = k;`,
    fragHead: "varying float vLife;",
    fragment: "diffuseColor.rgb = mix(vec3(0.7, 0.88, 0.52), vec3(0.68, 0.64, 0.8), smoothstep(0.1, 0.7, vLife)); diffuseColor.a *= smoothstep(0.0, 0.18, vLife) * (1.0 - smoothstep(0.4, 1.0, vLife));" });
  // The shaders move the bubbles and steam about the brew: bound them there, so
  // they are neither culled nor counted at the size they are drawn in the buffers.
  const box = new THREE.Box3(new THREE.Vector3(centre.x - radius, top - 0.05, centre.y - radius), new THREE.Vector3(centre.x + radius, top + rise + 0.15, centre.y + radius));
  for (const g of [bubbleGeo, steamGeo]) { g.boundingBox = box; g.boundingSphere = box.getBoundingSphere(new THREE.Sphere()); }
  for (const g of [surface, bubbleGeo, steamGeo]) g.userData.shared = true;
  const parts = [[surface, surf], [bubbleGeo, bub], [steamGeo, steam]];
  return {
    meshes: () => parts.map(([g, m]) => { const mesh = new THREE.Mesh(g, m); mesh.castShadow = false; mesh.renderOrder = m.transparent ? 1 : 0; return mesh; }),
    tick: (time) => { BREW_TIME.value = time % 600; },
  };
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
