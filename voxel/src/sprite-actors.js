import * as THREE from "three";
import { crispen, crispTexture } from "./crisp-sprites.js";
import { createSpecialSprite, animateSpecialSprite, specialPortrait, specialSpriteReady } from "./special-sprites.js";
import natalieUrl from "../assets/hd-natalie.webp";
import shaneUrl from "../assets/hd-shane.webp";
import skylaUrl from "../assets/hd-skyla.webp";
import horrorVisitorsUrl from "../assets/hd-horror-visitors.png";
import { horrorVisitorSheetMeta } from "./visitor-sprite-meta.js";
import { VISITOR_KINDS } from "./content/visitors.js";
export { VISITOR_KINDS } from "./content/visitors.js";
import visitorsUrl from "../assets/hd-visitors.webp";
import natalieWitch from "../assets/hd-natalie-witch.webp";
import natalieGhostbride from "../assets/hd-natalie-ghostbride.webp";
import natalieBatqueen from "../assets/hd-natalie-batqueen.webp";
import natalieVampire from "../assets/hd-natalie-vampire.webp";
import natalieFrankenstein from "../assets/hd-natalie-frankenstein.webp";
import natalieMummy from "../assets/hd-natalie-mummy.webp";
import natalieSlasher from "../assets/hd-natalie-slasher.webp";
import shaneVampire from "../assets/hd-shane-vampire.webp";
import shaneSkeleton from "../assets/hd-shane-skeleton.webp";
import shaneScarecrow from "../assets/hd-shane-scarecrow.webp";
import shaneFrankenstein from "../assets/hd-shane-frankenstein.webp";
import shaneMummy from "../assets/hd-shane-mummy.webp";
import shaneSlasher from "../assets/hd-shane-slasher.webp";
import { SHEETS } from "./sprite-meta-hd.js";
import { COSTUME_SHEETS } from "./costume-sprite-meta.js";
import { COSTUME_URLS } from "./costume-sprite-expansion.js";
import { LEAN, STRETCH } from "./world.js";
import { recolour } from "./sprite-voxels.js";

// Shane, Natalie, Skyla, the visitors and every costume drawn with the main
// game's own sprites: flat cut-outs standing in the voxel world, lit by the moon
// and the lanterns, and casting shadows the shape of the art. Sheets come from
// tools/bake_sprites.py; each records how many rows a person is, so the
// smaller costume sheets stand just as tall (2.3 units).
const unit = (meta) => 2.3 / meta.rows;
// They lean back towards the camera like the voxel figures, stretched so the art
// keeps its proportions on screen (LEAN and STRETCH in world.js).
const URLS = {
  natalie: natalieUrl, shane: shaneUrl, skyla: skylaUrl, visitors: visitorsUrl, horrorVisitors: horrorVisitorsUrl,
  "natalie-witch": natalieWitch, "natalie-ghostbride": natalieGhostbride, "natalie-batqueen": natalieBatqueen, "natalie-vampire": natalieVampire,
  "natalie-frankenstein": natalieFrankenstein, "natalie-mummy": natalieMummy, "natalie-slasher": natalieSlasher,
  "shane-vampire": shaneVampire, "shane-skeleton": shaneSkeleton, "shane-scarecrow": shaneScarecrow,
  "shane-frankenstein": shaneFrankenstein, "shane-mummy": shaneMummy, "shane-slasher": shaneSlasher,
  ...COSTUME_URLS,
};
const METADATA = { ...SHEETS, ...COSTUME_SHEETS };
// Visitor IDs come from the shared, stable voxel roster.

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

function sheetTexture(image) {
  const texture = image instanceof HTMLCanvasElement ? new THREE.CanvasTexture(image) : new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return crispTexture(texture);
}

// One plane per frame, its origin at the feet, its UVs on the frame's rectangle.
function frameGeometry(sheet, f) {
  const u = f.unit ?? unit(sheet), g = new THREE.PlaneGeometry(f.w * u, f.h * u);
  g.translate((f.w / 2 - f.ax) * u, (f.ay - f.h / 2) * u, 0);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (f.x + uv.getX(i) * f.w) / sheet.w, 1 - (f.y + (1 - uv.getY(i)) * f.h) / sheet.h);
  return g;
}

// Loads every sheet and builds its frame planes once; characters share them.
export async function loadSpriteSheets() {
  const sheets = {};
  await Promise.all(Object.entries(URLS).map(async ([name, url]) => {
    const image = await loadImage(url), meta = name === "horrorVisitors" ? horrorVisitorSheetMeta(image) : METADATA[name], frames = {};
    for (const [key, list] of Object.entries(meta)) if (Array.isArray(list)) frames[key] = list.map((f) => frameGeometry(meta, f));
    sheets[name] = { meta, image, texture: sheetTexture(image), frames };
  }));
  await specialSpriteReady;
  return sheets;
}

// The wardrobe's recolours, painted onto a copy of the sheet.
function recolouredTexture(sheet, who, look) {
  const canvas = document.createElement("canvas");
  canvas.width = sheet.meta.w; canvas.height = sheet.meta.h;
  const g = canvas.getContext("2d");
  g.drawImage(sheet.image, 0, 0);
  const pixels = g.getImageData(0, 0, canvas.width, canvas.height), data = pixels.data;
  for (const list of [sheet.meta.idle, sheet.meta.walk]) for (const f of list) {
    for (let y = 0; y < f.h; y++) {
      const row = (y - (f.ay - sheet.meta.rows)) / sheet.meta.rows;
      for (let x = 0; x < f.w; x++) {
        const o = ((f.y + y) * canvas.width + f.x + x) * 4;
        if (!data[o + 3]) continue;
        const c = recolour(who, look, data[o], data[o + 1], data[o + 2], row);
        if (c) { data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; }
      }
    }
  }
  g.putImageData(pixels, 0, 0);
  return sheetTexture(canvas);
}

// A sprite figure: one plane that swaps frames, inside a group the scene moves.
// glow is how much of its own art it lights, so it still reads at night; tone
// darkens the art's response to the lamps.
// depth is how many layers of the same frame stand behind it, a little darker,
// so the figure has a pixel or two of thickness at its edges rather than none.
const LAYER = 0.008;
function figure(sheet, frames, texture, glow = 0.3, tone = 0xffffff, depth = 0) {
  const group = new THREE.Group(), lean = new THREE.Group();
  lean.rotation.x = -LEAN;
  lean.scale.y = STRETCH;
  group.add(lean);
  const material = crispen(new THREE.MeshStandardMaterial({ map: texture, color: tone, alphaTest: 0.5, roughness: 1, metalness: 0, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: glow }));
  const first = frames.idle?.[0] ?? frames.walk[0], mesh = new THREE.Mesh(first, material);
  mesh.castShadow = true;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texture, alphaTest: 0.5 });
  lean.add(mesh);
  const edge = depth ? crispen(new THREE.MeshStandardMaterial({ map: texture, color: 0x5a4c4a, alphaTest: 0.5, roughness: 1, metalness: 0, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: glow * 0.25 })) : null;
  const layers = Array.from({ length: depth }, (_, k) => {
    const m = new THREE.Mesh(first, edge);
    m.position.z = -(k + 1) * LAYER;
    lean.add(m);
    return m;
  });
  const own = texture !== sheet.texture;
  group.userData = {
    idle: frames.idle ?? [], walk: frames.walk ?? [], facing: 0, shown: mesh.geometry,
    show: (geometry) => { mesh.geometry = geometry; for (const m of layers) m.geometry = geometry; },
    // Frame planes and the shared sheet stay; a recoloured copy goes with the figure.
    dispose: () => { material.dispose(); edge?.dispose(); mesh.customDepthMaterial.dispose(); if (own) texture.dispose(); },
  };
  return group;
}

// Shane, Natalie or Skyla, in an outfit. They always face the viewer, as in the
// main game, which never mirrors them. Recolours only apply to the originals.
export function spriteActor(sheets, who, look, outfit) {
  const costume = outfit && !outfit.endsWith("-base") && sheets[outfit];
  const sheet = costume || sheets[who], base = who === "natalie" ? 0x604625 : 0x1a1210;
  const tinted = !costume && look && (look.sweater ?? look.beanie) !== undefined && (look.sweater ?? look.beanie) !== base;
  // Skyla is cream and white: lit like the others she outshone the lanterns and
  // the bloom caught her, so she glows less and takes the light a shade darker.
  const [glow, tone] = who === "skyla" ? [0.06, 0xd6cdc2] : [0.3, 0xffffff];
  // Shane and Natalie stand four layers deep: a pixel or two of thickness.
  return figure(sheet, sheet.frames, tinted ? recolouredTexture(sheet, who, look) : sheet.texture, glow, tone, who === "skyla" ? 0 : 4);
}

// A visitor: its four frames are a walk cycle; standing shows the first.
export function spriteVisitor(sheets, kind) {
  if (VISITOR_KINDS[kind] === "baron") return createSpecialSprite("baron");
  const id = VISITOR_KINDS[kind] ?? VISITOR_KINDS[0], sheet = VISITOR_KINDS.indexOf(id) >= 5 ? sheets.horrorVisitors : sheets.visitors;
  const model = figure(sheet, { walk: sheet.frames[id] }, sheet.texture);
  model.userData.artFacesLeft = kind >= 5; return model;
}

// dx is which way they're heading across the screen (-1 to 1). The art faces
// right, so walking left mirrors them; mostly up or down keeps the last facing.
export function animateVisitor(group, age, walking, dx = 0) {
  if (group.userData.specialSprite) { animateSpecialSprite(group, age, walking, dx); return; }
  if (walking && Math.abs(dx) > 0.3) group.scale.x = (dx < 0 ? -1 : 1) * (group.userData.artFacesLeft ? -1 : 1);
  const { walk } = group.userData, next = walk[walking ? Math.floor(age * 5) % walk.length : 0];
  if (next !== group.userData.shown) { group.userData.show(next); group.userData.shown = next; }
  group.children[0].position.y = Math.sin(age * 2.4) * 0.03;                       // the main game's gentle sway
}

// A portrait for the menus: the first standing frame of an outfit, Skyla or a
// visitor ("visitor-ghost"), as an image URL. Cached; null until sheets load.
// Frames sit off-centre in their cells (a costume's torso can be well right of
// the middle) and sheets differ in height, so each portrait is cut to the
// figure: from just above the head to the feet, centred on the frame's anchor,
// and never narrower than half its height, so every menu frames them alike.
const portraits = new Map();
export function portraitURL(sheets, id) {
  if (id === "visitor-baron" || id === "axel") return specialPortrait(id);
  if (portraits.has(id)) return portraits.get(id);
  let sheet, f;
  if (id.startsWith("visitor-")) { sheet = VISITOR_KINDS.indexOf(id.slice(8)) >= 5 ? sheets.horrorVisitors : sheets.visitors; f = sheet?.meta[id.slice(8)]?.[0]; }
  else { sheet = sheets[id.replace(/-base$/, "")]; f = sheet?.meta.idle?.[0]; }
  if (!sheet || !f) return null;
  const src = document.createElement("canvas");
  src.width = f.w; src.height = f.h;
  const g = src.getContext("2d", { willReadFrequently: true });
  g.drawImage(sheet.image, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  const { data } = g.getImageData(0, 0, f.w, f.h);
  let left = f.w, right = -1, top = f.h;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (data[(y * f.w + x) * 4 + 3] > 24) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); }
  if (right < 0) return null;
  const ax = f.ax ?? f.w / 2, foot = Math.min(f.h, Math.ceil((f.ay ?? f.h) + 2)), y0 = Math.max(0, top - 3), h = foot - y0;
  const w = Math.ceil(Math.max(2 * Math.max(ax - left, right + 1 - ax) + 6, h * 0.5));
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(src, 0, y0, f.w, h, Math.round(w / 2 - ax), 0, f.w, h);
  const url = c.toDataURL("image/png");
  portraits.set(id, url);
  return url;
}
