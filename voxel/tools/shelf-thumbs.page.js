// The blank shelves' catalogue icons: every shelf in every finish, rendered from
// the same models the rooms use, into one transparent sheet (a row per shelf in
// catalogue order, a column per finish). Bundled by render-shelf-thumbs.mjs.
import * as THREE from "three";
import { decorProp, modelStats } from "../src/decor.js";
import { SHELF_CATALOG } from "../src/content/shelf-catalog.js";

const CELL = +new URLSearchParams(location.search).get("cell") || 112, SCALE = 2;
try {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(CELL * SCALE, CELL * SCALE); renderer.setPixelRatio(1); renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  // The room's light, as the other furniture icons have it.
  scene.add(new THREE.HemisphereLight(0x8a7ac8, 0x3a2830, 1.9));
  const moon = new THREE.DirectionalLight(0xd2c6ff, 2.2); moon.position.set(6, 10, -7); scene.add(moon);
  const fill = new THREE.DirectionalLight(0xffcf9a, 1.3); fill.position.set(-1, 4, 10); scene.add(fill);
  const lamp = new THREE.PointLight(0xffd0a0, 9, 14, 1.4); lamp.position.set(-1.6, 3.6, 2.6); scene.add(lamp);
  const cols = Math.max(...SHELF_CATALOG.map((s) => s.finishes.length)), sheet = document.createElement("canvas"), g = sheet.getContext("2d");
  sheet.width = cols * CELL; sheet.height = SHELF_CATALOG.length * CELL;
  g.imageSmoothingQuality = "high";
  const stats = {};
  SHELF_CATALOG.forEach((item, row) => item.finishes.forEach((f, col) => {
    const prop = decorProp(item.id, { finish: f.id }); scene.add(prop);
    // A three-quarter view from the front and a little above; wall shelves from lower down.
    const box = new THREE.Box3().setFromObject(prop), centre = box.getCenter(new THREE.Vector3()), dims = box.getSize(new THREE.Vector3());
    const yaw = 0.5, pitch = item.wall ? 0.32 : 0.28, halfW = (Math.cos(yaw) * dims.x + Math.sin(yaw) * dims.z) / 2, halfD = (Math.sin(yaw) * dims.x + Math.cos(yaw) * dims.z) / 2;
    const halfH = (Math.cos(pitch) * dims.y + Math.sin(pitch) * halfD * 2) / 2;
    const dist = Math.max(halfW, halfH) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.08 + halfD;
    camera.position.copy(centre).add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist)); camera.lookAt(centre);
    renderer.render(scene, camera);
    g.drawImage(renderer.domElement, col * CELL, row * CELL, CELL, CELL);
    scene.remove(prop);
    const s = modelStats(item.id, f.id); stats[`${item.id}:${f.id}`] = { triangles: s.triangles, voxels: [s.nx, s.ny, s.nz] };
  }));
  window.shelfThumbResult = { sheet: sheet.toDataURL("image/webp", 0.88), png: sheet.toDataURL("image/png"), stats, layout: { cell: CELL, rows: SHELF_CATALOG.map((s) => s.id), cols: SHELF_CATALOG[0].finishes.map((f) => f.id) } };
} catch (error) { window.shelfThumbError = String(error.stack || error); }
