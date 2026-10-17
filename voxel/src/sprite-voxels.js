import * as THREE from "three";
import atlasUrl from "../assets/sprites.png";
import { SPRITES } from "./sprite-meta.js";

// Shane, Natalie and Skyla are voxelised from the main game's own sprites: one
// voxel per pixel of a 120-row frame (tools/bake_sprites.py), given rounded
// depth so they read as 3D, with the original walk and blink frames.
export const PIXEL = 2.3 / 120;                     // world units per sprite pixel: 2.3 tall
const BOX = new THREE.BoxGeometry(1, 1, 1);

export function loadSprites() {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      resolve(g.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = reject;
    img.src = atlasUrl;
  });
}

const hsv = (r, g, b) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, max ? d / max : 0, max / 255];
};
const isSkin = (r, g, b) => r > 140 && r > g + 18 && g > b && b < 200;

// What the back of each character looks like, since a sprite only has a front.
const BACK = {
  natalie: (r, g, b, row) => (row < 0.3 && isSkin(r, g, b) ? [27, 19, 15] : null),
  shane: (r, g, b, row) => (row < 0.18 && isSkin(r, g, b) ? [26, 18, 16] : row < 0.3 && isSkin(r, g, b) ? [107, 58, 30] : null),
  skyla: () => null,
};

// Wardrobe recolours: retint Natalie's olive knit or Shane's black beanie,
// keeping the art's shading by scaling the new colour by each pixel's value.
// row runs from 0 at the top of the head to 1 at the feet.
export function recolour(who, look, r, g, b, row) {
  if (!look) return null;
  const [h, s, v] = hsv(r, g, b);
  if (who === "natalie" && look.sweater !== undefined && look.sweater !== 0x604625 && row > 0.26 && row < 0.64 && h > 22 && h < 70 && s > 0.22 && v > 0.1 && v < 0.62) {
    const k = v / 0.376, t = new THREE.Color(look.sweater);
    return [t.r * 255 * k, t.g * 255 * k, t.b * 255 * k];
  }
  if (who === "shane" && look.beanie !== undefined && look.beanie !== 0x1a1210 && row < 0.17 && v < 0.24) {
    const k = Math.max(0.35, v / 0.1), t = new THREE.Color(look.beanie);
    return [Math.min(255, t.r * 255 * k), Math.min(255, t.g * 255 * k), Math.min(255, t.b * 255 * k)];
  }
  return null;
}

// One frame as an instanced mesh: each opaque pixel is a front half-voxel in
// its own colour and a back half-voxel in the back colour.
function frameMesh(pixels, f, who, look) {
  const { data, width } = pixels, cells = [];
  for (let y = 0; y < f.h; y++) {
    const row = [];
    for (let x = 0; x < f.w; x++) row.push(data[((f.y + y) * width + f.x + x) * 4 + 3] > 128);
    for (let x = 0; x < f.w; x++) {
      if (!row[x]) continue;
      let d = 0;
      while (x - d - 1 >= 0 && row[x - d - 1] && x + d + 1 < f.w && row[x + d + 1] && d < 12) d++;   // distance to the silhouette edge
      cells.push([x, y, d]);
    }
  }
  const mesh = new THREE.InstancedMesh(BOX, new THREE.MeshStandardMaterial({ roughness: 0.85 }), cells.length * 2);
  const m = new THREE.Matrix4(), color = new THREE.Color(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scale = new THREE.Vector3();
  let i = 0;
  for (const [x, y, d] of cells) {
    const o = ((f.y + y) * width + f.x + x) * 4, row = (y - (f.ay - 120)) / 120;
    let [r, g, b] = [data[o], data[o + 1], data[o + 2]];
    [r, g, b] = recolour(who, look, r, g, b, row) ?? [r, g, b];
    const depth = Math.min(16, 3 + d * 1.15) * PIXEL, px = (x + 0.5 - f.ax) * PIXEL, py = (f.ay - y - 0.5) * PIXEL;
    mesh.setMatrixAt(i, m.compose(pos.set(px, py, depth / 4), q, scale.set(PIXEL, PIXEL, depth / 2)));
    mesh.setColorAt(i++, color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace));
    const back = BACK[who](r, g, b, row) ?? [r * 0.72, g * 0.72, b * 0.72];
    mesh.setMatrixAt(i, m.compose(pos.set(px, py, -depth / 4), q, scale.set(PIXEL, PIXEL, depth / 2)));
    mesh.setColorAt(i++, color.setRGB(back[0] / 255, back[1] / 255, back[2] / 255, THREE.SRGBColorSpace));
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// A character: all idle and walk frames built once, one shown at a time.
export function spriteCharacter(pixels, who, look) {
  const group = new THREE.Group(), lean = new THREE.Group(), sheet = SPRITES[who];
  // Lean back towards the camera so the top-down view doesn't squash them,
  // the way sprite games tilt their characters.
  lean.rotation.x = -0.36;
  group.add(lean);
  const idle = sheet.idle.map((f) => frameMesh(pixels, f, who, look));
  const walk = (sheet.walk ?? []).map((f) => frameMesh(pixels, f, who, look));
  for (const mesh of [...idle, ...walk]) { mesh.visible = false; lean.add(mesh); }
  idle[0].visible = true;
  // The sprites face front three-quarter: Natalie towards the viewer's left, Shane the
  // right, so these mirror to walk the other way.
  group.userData = { idle, walk, facing: who === "natalie" ? -1 : 1, shown: idle[0], show: (mesh) => { group.userData.shown.visible = false; mesh.visible = true; } };
  return group;
}

// Animation for both kinds of character (voxel figures and flat sprites), which
// keep their frames in userData and show one with userData.show(frame).
function showFrame(group, next) {
  if (next !== group.userData.shown) { group.userData.show(next); group.userData.shown = next; }
}

// Shane and Natalie: walking cycles the six walk frames; standing blinks now and then.
export function animateSprite(group, time, moving, dx = 0, phaseOffset = 0) {
  const { idle, walk, facing } = group.userData;
  if (moving && walk.length) showFrame(group, walk[Math.floor(time * 9) % walk.length]);
  else {
    const phase = (time + phaseOffset) % 5;
    showFrame(group, idle[phase < 2.7 ? 0 : phase < 3.35 ? 1 : phase < 3.48 ? 2 : phase < 4.05 ? 3 : 0]);
  }
  if (facing && moving && Math.abs(dx) > 0.01) group.scale.x = Math.sign(dx) === facing ? 1 : -1;
}

// Skyla, as in the main game: she looks round, blinks, and reacts when someone
// pays. The voxel Skyla has one frame, so she just sits.
export function animateSkyla(group, time, paying) {
  const { idle } = group.userData, phase = time % 5;
  showFrame(group, idle[Math.min(idle.length - 1, paying ? 3 : phase < 3 ? 0 : phase < 3.8 ? 1 : phase < 4 ? 2 : 0)]);
}
