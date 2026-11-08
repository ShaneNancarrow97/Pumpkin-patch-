import * as THREE from "three";
import { VILLAGE_SPRITES } from "./content/village-sprite-meta.js";
import { crispen, crispTexture } from "./crisp-sprites.js";
import { validVillageSprite, villageFrameShape, villageSpritePose, villagePortraitCrop, VILLAGE_PERSON_HEIGHT } from "./village-sprite-math.js";

// One shared texture per sheet, and one cached plane per authored frame.
// Actors own their transforms only, so changing cast style cannot free another
// neighbour's texture or a hall host's geometry.
const sheets = new Map(), cast = new Map(), portraits = new Map();
let ready = null;
function loadSheet(url) {
  if (sheets.has(url)) return sheets.get(url);
  const promise = new Promise(resolve => {
    if (typeof Image === "undefined") { resolve(null); return; }
    const image = new Image();
    image.onload = () => {
      const texture = crispTexture(new THREE.Texture(image));
      texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      resolve({ image, texture });
    };
    image.onerror = () => resolve(null); image.src = url;
  });
  sheets.set(url, promise); return promise;
}
function frameGeometry(meta, frame) {
  const shape = villageFrameShape(meta, frame), geometry = new THREE.PlaneGeometry(shape.width, shape.height);
  geometry.translate(shape.x, shape.y, 0);
  const uv = geometry.attributes.uv, pad = .5;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (frame.x + pad + uv.getX(i) * (frame.w - pad * 2)) / meta.w, 1 - (frame.y + pad + (1 - uv.getY(i)) * (frame.h - pad * 2)) / meta.h);
  geometry.userData.shared = true; return geometry;
}
export function readyVillageSprites() {
  ready ??= Promise.all(Object.entries(VILLAGE_SPRITES).map(async ([id, meta]) => {
    if (!validVillageSprite(meta)) return;
    const sheet = await loadSheet(meta.url); if (!sheet) return;
    const material = crispen(new THREE.MeshStandardMaterial({ map: sheet.texture, alphaTest: .42, roughness: 1, metalness: 0, emissive: 0xffffff, emissiveMap: sheet.texture, emissiveIntensity: id === "cinder" ? .22 : .16, side: THREE.DoubleSide }));
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: sheet.texture, alphaTest: .42, side: THREE.DoubleSide });
    cast.set(id, { meta, sheet, material, depth, frames: meta.frames.map(frame => frameGeometry(meta, frame)) });
  })).then(() => cast.size);
  return ready;
}
export const villageSpriteTextures = () => [...new Set([...cast.values()].map(p => p.sheet.texture))];
export function createVillageSprite(id) {
  const data = cast.get(id); if (!data) return null;
  const root = new THREE.Group(), facing = new THREE.Group(), lean = new THREE.Group(), mesh = new THREE.Mesh(data.frames[0], data.material);
  root.name = "resident-" + id; root.add(facing); facing.add(lean); lean.add(mesh);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.customDepthMaterial = data.depth;
  root.userData = { villageSprite: true, sprite: true, id, frame: 0, action: "idle", leadingLeg: null, height: data.meta.height ?? VILLAGE_PERSON_HEIGHT, ready: true, facing, lean, mesh, data };
  return root;
}
export function tickVillageSprite(root, options = {}) {
  const u = root.userData, pose = villageSpritePose(u.data.meta, options);
  if (u.frame !== pose.frame) u.mesh.geometry = u.data.frames[pose.frame];
  Object.assign(u, pose);
  const camera = options.camera;
  if (camera) {
    const dx = camera.position.x - root.position.x, dz = camera.position.z - root.position.z;
    const pitch = Math.atan2(Math.max(0, camera.position.y - root.position.y), Math.max(.001, Math.hypot(dx, dz))), lean = Math.min(.32, pitch * .4);
    // Turn only the artwork towards the camera. Logical facing and a hit box
    // remain on the root; the face is never mirrored while someone is idle.
    u.facing.rotation.y = Math.atan2(dx, dz) - root.rotation.y;
    u.lean.rotation.x = -lean; u.lean.scale.y = 1 / Math.max(.6, Math.cos(pitch - lean));
  }
}
export function villageSpritePortrait(id) {
  if (portraits.has(id)) return portraits.get(id);
  const item = cast.get(id); if (!item || typeof document === "undefined") return null;
  const crop = villagePortraitCrop(item.meta), canvas = document.createElement("canvas");
  canvas.width = crop.width; canvas.height = crop.height;
  canvas.getContext("2d").drawImage(item.sheet.image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  const data = canvas.toDataURL("image/webp", .9), bytes = Uint8Array.from(atob(data.split(",")[1]), c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "image/webp" })); portraits.set(id, url); return url;
}
