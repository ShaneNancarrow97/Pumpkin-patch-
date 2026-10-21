import * as THREE from "three";
import atlasUrl from "../assets/maze-cast.png";
import { LEAN, STRETCH } from "./world.js";
import { specialSpriteMetadata } from "./special-sprite-meta.js";

// The two generated animation rows share one atlas and cached frame geometry.
// A synchronous factory keeps the foyer/visitor simulation independent of load.
const pending = new Set(), portraits = new Map(), cube = new THREE.BoxGeometry(1, 1, 1);
let atlas = null;
function frameGeometry(meta, frame, part = null) {
  const u = frame.unit, hip = frame.ay - .74 / u;
  const top = part === "legs" ? hip : 0, bottom = part === "body" ? hip + .008 / u : frame.h, h = bottom - top;
  const geometry = new THREE.PlaneGeometry(frame.w * u, h * u);
  geometry.translate((frame.w / 2 - frame.ax) * u, (frame.ay - top - h / 2) * u, 0);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (frame.x + uv.getX(i) * frame.w) / meta.w, 1 - (frame.y + top + (1 - uv.getY(i)) * h) / meta.h);
  return geometry;
}
export const specialSpriteReady = new Promise(resolve => {
  if (typeof Image === "undefined") { resolve(false); return; }
  const image = new Image();
  image.onload = () => {
    try {
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(image, 0, 0);
      const meta = specialSpriteMetadata(image.width, image.height, ctx.getImageData(0, 0, image.width, image.height).data);
      const texture = new THREE.Texture(image); texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
      atlas = { image, meta, texture, frames: Object.fromEntries(Object.entries(meta.rows).map(([id, row]) => [id, row.frames.map(f => frameGeometry(meta, f))])) };
      atlas.baronWalk = meta.rows.baron.frames.map(f => ({ body: frameGeometry(meta, f, "body"), legs: frameGeometry(meta, f, "legs") }));
      for (const entry of pending) entry.attach(); pending.clear(); resolve(true);
    } catch (error) { console.warn("Special character art could not be prepared", error); resolve(false); }
  };
  image.onerror = () => resolve(false); image.src = atlasUrl;
});

// Only used before the embedded PNG is decoded (or if a damaged download
// cannot decode it); the generated art replaces this same model in place.
function waitingFigure(id) {
  const group = new THREE.Group(), body = new THREE.MeshStandardMaterial({ color: id === "axel" ? 0x79529c : 0x831d36, roughness: 1 }), skin = new THREE.MeshStandardMaterial({ color: id === "axel" ? 0xb78fd4 : 0x8b9c79, roughness: 1 });
  const box = (x, y, z, w, h, d, material) => { const mesh = new THREE.Mesh(cube, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); group.add(mesh); };
  box(0, .68, 0, .47, .82, .31, body); box(0, 1.27, 0, .66, .5, .43, skin);
  for (const side of [-1, 1]) { box(side * .13, .18, .03, .16, .36, .23, body); box(side * .3, .7, 0, .14, .56, .18, body); if (id === "axel") for (let i = 0; i < 3; i++) box(side * (.4 + i * .035), 1.14 + i * .12, 0, .16, .065, .1, body); }
  return { group, dispose() { body.dispose(); skin.dispose(); } };
}

export function createSpecialSprite(id = "axel") {
  id = id === "baron" ? "baron" : "axel";
  const group = new THREE.Group(), lean = new THREE.Group(); lean.rotation.x = -LEAN; lean.scale.y = STRETCH; group.add(lean);
  let gone = false, owned = [], fallback = null, front = null, layers = [], gait = null;
  const release = () => { fallback?.dispose(); fallback = null; for (const m of owned) m.dispose(); owned = []; lean.clear(); };
  const entry = { attach() {
    if (gone || !atlas) return; release();
    const frames = atlas.frames[id], material = new THREE.MeshStandardMaterial({ map: atlas.texture, alphaTest: .45, color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveMap: atlas.texture, emissiveIntensity: .26 });
    const edge = new THREE.MeshStandardMaterial({ map: atlas.texture, alphaTest: .45, color: 0x74606d, roughness: 1, emissive: 0xffffff, emissiveMap: atlas.texture, emissiveIntensity: .08 });
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: atlas.texture, alphaTest: .45 }); owned = [material, edge, depth];
    front = new THREE.Mesh(frames[0], material); front.castShadow = true; front.customDepthMaterial = depth; lean.add(front);
    if (id === "baron") {
      gait = { body: new THREE.Mesh(atlas.baronWalk[0].body, material), legs: new THREE.Mesh(atlas.baronWalk[0].legs, material) };
      for (const mesh of Object.values(gait)) { mesh.castShadow = true; mesh.customDepthMaterial = depth; mesh.visible = false; lean.add(mesh); }
    }
    layers = Array.from({ length: 2 }, (_, i) => { const mesh = new THREE.Mesh(frames[0], edge); mesh.position.z = -.008 * (i + 1); lean.add(mesh); return mesh; });
    Object.assign(group.userData, { idle: [frames[0]], walk: frames, shown: frames[0], ready: true, height: atlas.meta.rows[id].height, showGait(index, moving) {
      if (!gait) return;
      front.visible = !moving; for (const mesh of layers) mesh.visible = !moving;
      for (const mesh of Object.values(gait)) mesh.visible = moving;
      if (moving) { gait.body.geometry = atlas.baronWalk[index].body; gait.legs.geometry = atlas.baronWalk[index].legs; gait.legs.scale.x = index >= 2 ? -1 : 1; }
      group.userData.leadingLeg = moving ? index >= 2 ? "right" : "left" : null;
    }, show(geometry) { front.geometry = geometry; for (const mesh of layers) mesh.geometry = geometry; } });
  } };
  Object.assign(group.userData, { specialSprite: id, sprite: true, idle: [], walk: [], ready: false, shown: null, frame: 0, artFacesLeft: false,
    dispose() { if (gone) return; gone = true; pending.delete(entry); release(); },
  });
  if (atlas) entry.attach(); else { fallback = waitingFigure(id); lean.add(fallback.group); pending.add(entry); }
  return group;
}
export function animateSpecialSprite(group, time, moving = false, dx = 0) {
  const u = group.userData, lean = group.children[0]; if (!lean) return;
  // Mirror within the model so a caller's chosen height/scale remains intact.
  if (moving && Math.abs(dx) > .25) lean.scale.x = dx < 0 ? -1 : 1;
  const index = moving ? Math.floor(Math.max(0, time) * 5) % 4 : 0, frame = u.walk?.[index];
  if (frame && frame !== u.shown) { u.show(frame); u.shown = frame; } u.frame = index;
  // Keep the red coat and face facing the same way while the lower-body rig
  // swaps the leading leg for the second half stride. Generated frames alone
  // otherwise repeated the near leg; the hip joint makes the alternation real.
  u.showGait?.(index, moving);
  lean.position.y = Math.sin(time * (moving ? 5 : 2.2)) * (moving ? .012 : .014);
}
export function specialPortrait(id = "axel") {
  id = id === "baron" || id === "visitor-baron" ? "baron" : id === "axel" ? "axel" : null;
  if (!id || !atlas) return null; if (portraits.has(id)) return portraits.get(id);
  const frame = atlas.meta.rows[id].frames[0], b = frame.bounds, padding = 4, h = b.bottom - b.top + 1 + padding * 2, w = Math.max(b.right - b.left + 1 + padding * 2, h * .55);
  const canvas = document.createElement("canvas"); canvas.width = Math.ceil(w); canvas.height = h;
  canvas.getContext("2d").drawImage(atlas.image, frame.x + b.left, frame.y + b.top, b.right - b.left + 1, b.bottom - b.top + 1, (canvas.width - (b.right - b.left + 1)) / 2, padding, b.right - b.left + 1, b.bottom - b.top + 1);
  const url = canvas.toDataURL("image/png"); portraits.set(id, url); return url;
}
