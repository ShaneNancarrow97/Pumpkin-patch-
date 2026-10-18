// The decor bench's page (bundled by decor-bench.mjs): each piece alone on a
// floor, lit like a room, beside its art. One row per piece: the art with the
// recipe grid (x right, y up from the base), the room camera, a 3/4 view from
// each side, from behind and above, and flipped. The sheet comes back as a PNG.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { loadDecor, decorProp, shelfBooks, decorThumb, modelStats } from "../src/decor.js";
import { DECOR_ART } from "../src/decor-meta.js";
import { INTERIOR } from "../src/interiors.js";
import { decorById, footprint, shelfCapacity, GRID } from "../src/model.js";

const q = new URLSearchParams(location.search), ids = q.get("ids").split(","), CELL = +q.get("cell") || 300;

// Where the game's room camera sits on a desktop screen (as scene.js frames it:
// the back wall's top and the floor's front in view), room origin at (0, 0, 0).
function roomCamera(aspect = 1.5) {
  const p = INTERIOR.pitch, half = GRID.w / 2 + 0.4, corners = [[-half, 5.4, 0], [half, 5.4, 0], [-half, -0.1, GRID.d + 0.3], [half, -0.1, GRID.d + 0.3]];
  const target = new THREE.Vector3(GRID.w / 2, 2, GRID.d * 0.42), dir = new THREE.Vector3(0, Math.sin(p), Math.cos(p)), cam = new THREE.PerspectiveCamera(INTERIOR.fov, aspect, 0.1, 200), c = new THREE.Vector3();
  for (let dist = 6; dist < 80; dist += 0.25) {
    cam.position.copy(target).addScaledVector(dir, dist); cam.lookAt(target); cam.updateMatrixWorld();
    if (corners.every(([x, y, z]) => { c.set(GRID.w / 2 + x, y, z).project(cam); return Math.abs(c.x) <= 1 && Math.abs(c.y) <= 1; })) return cam.position.clone();
  }
  return target.addScaledVector(dir, 20);
}
// How steeply the room camera sees a piece: from the middle of the room, a floor
// piece a cell out from the back wall, a wall piece at the height it hangs.
const ROOM_CAM = roomCamera();
function roomPitch(fp, height) {
  if (q.get("pitch")) return +q.get("pitch");
  const at = new THREE.Vector3(GRID.w / 2, fp.layer === "wall" ? 2.9 : height / 2, fp.layer === "wall" ? 0 : fp.d / 2 + 1);
  return THREE.MathUtils.radToDeg(Math.atan2(ROOM_CAM.y - at.y, ROOM_CAM.z - at.z));
}
const VIEWS = { room: { label: "room camera", yaw: 0, room: true }, left: { label: "3/4 left", yaw: -42, pitch: 24 }, right: { label: "3/4 right", yaw: 42, pitch: 24 },
  back: { label: "behind, above", yaw: 155, pitch: 38 }, top: { label: "above", yaw: 0, pitch: 75 }, side: { label: "side", yaw: 90, pitch: 8 }, flip: { label: "flipped", yaw: 0, room: true, flip: true } };
const views = (q.get("views") || "room,left,right,back,flip").split(",").filter((v) => VIEWS[v]);
const LABEL = 22, HEAD = 26;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(CELL, CELL);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
scene.background = new THREE.Color(0x241a2e);
// The room's light: the plum sky fill, lilac moonlight from behind, warm lamplight in front.
scene.add(new THREE.HemisphereLight(0x8a7ac8, 0x3a2830, 1.9));
const moon = new THREE.DirectionalLight(0xd2c6ff, 2.2); moon.position.set(6, 10, -7); scene.add(moon);
const fill = new THREE.DirectionalLight(0xffcf9a, 1.2); fill.position.set(-1, 4, 10); scene.add(fill);
const lamp = new THREE.PointLight(0xffd0a0, 9, 14, 1.4); lamp.position.set(-1.6, 3.6, 2.6); lamp.castShadow = true;
lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0005; lamp.shadow.normalBias = 0.02; scene.add(lamp);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ color: 0x6a4028, roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshStandardMaterial({ color: 0x4a3048, roughness: 0.95 }));
wall.position.y = 4; wall.receiveShadow = true; scene.add(wall);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(CELL, CELL), 0.5, 0.45, 0.86));
composer.addPass(new OutputPass());

const sheet = document.createElement("canvas"), g = sheet.getContext("2d");
sheet.width = CELL * (views.length + 1); sheet.height = ids.length * (CELL + HEAD);
g.fillStyle = "#140f1c"; g.fillRect(0, 0, sheet.width, sheet.height);
g.imageSmoothingEnabled = false;
document.body.append(sheet);

// The art, as large as fits, with the recipe grid every 4 pixels (labelled every 8).
function drawArt(atlas, id, x0, y0) {
  const a = DECOR_ART[id], k = Math.floor(Math.min((CELL - 34) / a.w, (CELL - LABEL - 18) / a.h)), ox = x0 + 26, oy = y0 + LABEL;
  g.fillStyle = "#2a2234"; g.fillRect(ox, oy, a.w * k, a.h * k);
  g.drawImage(atlas, a.x, a.y, a.w, a.h, ox, oy, a.w * k, a.h * k);
  g.font = "10px monospace"; g.textBaseline = "middle";
  for (let x = 0; x <= a.w; x += 4) {
    g.fillStyle = x % 8 ? "rgba(255,255,255,.12)" : "rgba(120,255,255,.35)"; g.fillRect(ox + x * k, oy, 1, a.h * k);
    if (x % 8 === 0) { g.fillStyle = "#ffd896"; g.fillText(String(x), ox + x * k - 4, oy + a.h * k + 8); }
  }
  for (let y = 0; y <= a.h; y += 4) {
    const yy = oy + (a.h - y) * k;
    g.fillStyle = y % 8 ? "rgba(255,255,255,.12)" : "rgba(120,255,255,.35)"; g.fillRect(ox, yy, a.w * k, 1);
    if (y % 8 === 0) { g.fillStyle = "#ffd896"; g.fillText(String(y), x0 + 2, yy); }
  }
}

function piece(id) {
  const fp = footprint(id), prop = decorProp(id), group = new THREE.Group(), lean = new THREE.Group();
  lean.add(prop);
  if (decorById[id]?.category === "shelves") lean.add(shelfBooks(id, Array.from({ length: shelfCapacity(id) }, (_, i) => "b" + String((i % 10) + 1).padStart(2, "0")), prop));
  group.add(lean);
  // As in a room: floor pieces on the floor, wall pieces at eye height on the wall behind.
  if (fp.layer === "wall") { group.position.y = 2.9 - prop.userData.height / 2; wall.position.z = 0; }
  else wall.position.z = -fp.d / 2 - 0.01;
  return { group, lean, prop, fp };
}

async function run() {
  const atlas = await new Promise((resolve) => { const i = new Image(); i.onload = () => resolve(i); i.src = decorThumb(); });
  await loadDecor();
  const stats = {};
  ids.forEach((id, row) => {
    const y0 = row * (CELL + HEAD), { group, lean, prop, fp } = piece(id), s = modelStats(id);
    stats[id] = s ? { triangles: s.triangles, voxels: [s.nx, s.ny, s.nz], unitsPerPixel: +s.size.toFixed(4) } : { standee: true };
    g.fillStyle = "#ffe0a8"; g.font = "bold 15px sans-serif"; g.textBaseline = "middle";
    const ud = prop.userData;
    g.fillText(`${id}  ${decorById[id]?.name ?? ""}  ·  ${s ? `${s.triangles.toLocaleString("en-GB")} triangles, ${s.nx}×${s.ny}×${s.nz} voxels` : "standee (no recipe)"}  ·  ${ud.width.toFixed(2)} × ${ud.height.toFixed(2)} × ${ud.depth.toFixed(2)} units in a ${fp.w}×${fp.d} ${fp.layer} footprint`, 8, y0 + HEAD / 2);
    drawArt(atlas, id, 0, y0 + HEAD);
    g.fillStyle = "#cbb8e0"; g.font = "12px sans-serif"; g.fillText("art (x →, y ↑)", 6, y0 + HEAD + 10);
    scene.add(group);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group), centre = box.getCenter(new THREE.Vector3()), radius = box.getSize(new THREE.Vector3()).length() / 2;
    views.forEach((name, col) => {
      const v = VIEWS[name], dist = 13, deg = v.room ? roomPitch(fp, prop.userData.height) : v.pitch, yaw = THREE.MathUtils.degToRad(v.yaw), pitch = THREE.MathUtils.degToRad(deg);
      lean.scale.x = v.flip ? -1 : 1;
      wall.visible = Math.abs(v.yaw) < 100;
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan((radius * 1.08) / dist)); camera.updateProjectionMatrix();
      camera.position.set(centre.x + Math.sin(yaw) * Math.cos(pitch) * dist, centre.y + Math.sin(pitch) * dist, centre.z + Math.cos(yaw) * Math.cos(pitch) * dist);
      camera.lookAt(centre);
      composer.render();
      const x0 = CELL * (col + 1);
      g.drawImage(renderer.domElement, x0, y0 + HEAD);
      g.fillStyle = "rgba(20,15,28,.7)"; g.fillRect(x0, y0 + HEAD, CELL, LABEL);
      g.fillStyle = "#cbb8e0"; g.font = "12px sans-serif"; g.fillText(v.room ? `${v.label} (${deg.toFixed(0)}°)` : v.label, x0 + 6, y0 + HEAD + 10);
    });
    scene.remove(group);
  });
  window.benchStats = stats;
  window.benchResult = sheet.toDataURL("image/png");
}
run().catch((e) => { window.benchError = String(e?.stack ?? e); });
