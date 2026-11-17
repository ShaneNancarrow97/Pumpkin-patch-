// The carving stand menu's pictures, photographed from the same voxel models
// the farm draws (carving-stand-models.js): each design's lantern, each extra,
// each upgrade, and the whole stand as it stands now. One small renderer of its
// own, made the first time a picture is wanted; pictures are kept as short
// blob URLs, so the menu's HTML stays small and the sheet's redraw check cheap.
// Without WebGL, every picture is "" and the menu falls back to drawn art.
import * as THREE from "three";
import { lanternModel, extraModel, upgradeModel, buildStandBody, chalkboard } from "../carving-stand-models.js";
import { signBoard } from "../world.js";

let studio, failed = false;
const cache = new Map();

function open() {
  if (studio || failed) return studio;
  try {
    const canvas = document.createElement("canvas");
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xc2b4ff, 0x2a1c22, 1.5));
    const key = new THREE.DirectionalLight(0xffe2c0, 2.2); key.position.set(-3, 5, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9d8cff, 1.1); rim.position.set(4, 3, -4); scene.add(rim);
    const warm = new THREE.PointLight(0xffa04a, 0, 14, 1.4); scene.add(warm);
    studio = { renderer, scene, canvas, warm, camera: new THREE.PerspectiveCamera(30, 1, .05, 200) };
  } catch { failed = true; }
  return studio;
}
// The canvas as a blob URL, made synchronously from its PNG.
function blobURL(canvas) {
  const data = canvas.toDataURL("image/png"), bin = atob(data.slice(data.indexOf(",") + 1)), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
}
// Throws away what a shot built, but never the voxels' shared cube.
function release(object) {
  object.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) { m.map?.dispose(); m.dispose(); }
    if (!o.isInstancedMesh) o.geometry.dispose();
  });
}
// Frames an object from a direction and photographs it on a clear background.
// The drawn part of a render (alpha above a whisper), fitted into a w × h canvas.
function crop(source, w, h, margin) {
  const scratch = document.createElement("canvas"); scratch.width = source.width; scratch.height = source.height;
  const sx = scratch.getContext("2d", { willReadFrequently: true }); sx.drawImage(source, 0, 0);
  const { data } = sx.getImageData(0, 0, scratch.width, scratch.height);
  let x0 = scratch.width, y0 = scratch.height, x1 = -1, y1 = -1;
  for (let y = 0; y < scratch.height; y++) for (let x = 0; x < scratch.width; x++) if (data[(y * scratch.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const out = document.createElement("canvas"); out.width = w; out.height = h;
  if (x1 < 0) return out;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, scale = Math.min(w * (1 - 2 * margin) / cw, h * (1 - 2 * margin) / ch);
  out.getContext("2d").drawImage(scratch, x0, y0, cw, ch, (w - cw * scale) / 2, (h - ch * scale) / 2, cw * scale, ch * scale);
  return out;
}
function shoot(key, make, { w = 192, h = 192, from = [.35, .5, 1], fov = 30, pad = 1.08, margin = .04, warm = 0, warmAt = [0, 1.5, 1.5] } = {}) {
  if (cache.has(key)) return cache.get(key);
  const s = open();
  if (!s) { cache.set(key, ""); return ""; }
  let url = "", object = null;
  try {
    object = make(); s.scene.add(object); object.updateMatrixWorld(true);
    // Back off just far enough that every corner of its box is in the frame.
    const box = new THREE.Box3().setFromObject(object), centre = box.getCenter(new THREE.Vector3());
    const cam = s.camera; cam.fov = fov; cam.aspect = w / h; cam.updateProjectionMatrix();
    const tv = Math.tan(THREE.MathUtils.degToRad(fov) / 2), th = tv * cam.aspect;
    const dir = new THREE.Vector3(...from).normalize(), right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize(), up = new THREE.Vector3().crossVectors(dir, right);
    let dist = 0; const corner = new THREE.Vector3();
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      corner.set(x, y, z).sub(centre); const depth = corner.dot(dir);
      dist = Math.max(dist, depth + Math.abs(corner.dot(right)) / th, depth + Math.abs(corner.dot(up)) / tv);
    }
    cam.position.copy(centre).addScaledVector(dir, dist * pad); cam.lookAt(centre);
    s.warm.intensity = warm; s.warm.position.set(...warmAt);
    // Render larger than needed, then crop to what was drawn and fit that to
    // the picture's size, so every model fills its frame the same way.
    const k = 1.6, rw = Math.round(w * k), rh = Math.round(h * k);
    s.renderer.setPixelRatio(1); s.renderer.setSize(rw, rh, false); s.renderer.setClearColor(0x000000, 0); s.renderer.clear();
    s.renderer.render(s.scene, cam);
    url = blobURL(crop(s.canvas, w, h, margin));
  } catch { url = ""; }
  if (object) { s.scene.remove(object); release(object); }
  cache.set(key, url);
  return url;
}

export const standArt = {
  // A design's lantern, lit; or uncut, for one not on sale yet.
  design: (id, lit = true) => shoot(`design:${id}:${lit}`, () => lanternModel(id, lit ? "lit" : "whole"), { from: [.12, .26, 1], pad: 1.06 }),
  // A lantern at one stage of a guest's carving, for the benches.
  stage: (id, stage) => shoot(`stage:${id}:${stage}`, () => lanternModel(id, stage), { w: 128, h: 128, from: [.18, .4, 1], pad: 1.05 }),
  extra: (id) => shoot(`extra:${id}`, () => extraModel(id), { from: [.22, .34, 1], pad: 1.06 }),
  upgrade: (id) => shoot(`upgrade:${id}`, () => upgradeModel(id), { from: [.45, .55, 1], pad: 1.06 }),
  // The whole stand as it is: its benches, its menu, its extras.
  hero({ benches = 1, designs = ["classic"], extras = [], lines = [] } = {}) {
    const key = `hero:${benches}:${designs.join(",")}:${extras.join(",")}`;
    // Only the latest photo of the stand is kept: an older one is let go.
    for (const [k, url] of cache) if (k.startsWith("hero:") && k !== key) { if (url) URL.revokeObjectURL(url); cache.delete(k); }
    return shoot(key, () => {
      const body = buildStandBody({ benches, designs, extras }), group = body.voxels.build({ detailShadows: false });
      const sign = signBoard("The Carving Stand", "carve your own lantern", body.sign.width); sign.position.set(body.sign.x, body.sign.y, body.sign.z); group.add(sign);
      const board = chalkboard(lines); board.position.set(body.chalk.x, body.chalk.y, body.chalk.z); group.add(board);
      return group;
    }, { w: 720, h: 360, from: [-.36, .42, 1], fov: 26, pad: 1.02, margin: .03, warm: 10, warmAt: [0, 2.4, 2.2] });
  },
};

// The same studio for other menus' pictures (ui/fishing-art.js): a model,
// photographed once and kept as a short blob URL under its key.
export const voxelPhoto = (key, make, options) => shoot(key, make, options);
