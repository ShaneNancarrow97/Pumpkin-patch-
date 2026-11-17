// A small room-lit viewer. Controls live outside the canvas drag surface.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PREMIUM_WALL_ITEMS } from "../src/decor-models/premium-walls.js";
import { premiumWallProp, premiumWallStats } from "../src/premium-wall-props.js";

function start() {
  const container = document.querySelector("#scene"), renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
  container.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x211927);
  scene.fog = new THREE.Fog(0x211927, 22, 55);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .13; controls.enablePan = false;
  controls.minPolarAngle = .24; controls.maxPolarAngle = Math.PI * .78;
  scene.add(new THREE.HemisphereLight(0x8a7ac8, 0x3a2830, 1.9));
  const moon = new THREE.DirectionalLight(0xd2c6ff, 2.2); moon.position.set(6, 10, -7); scene.add(moon);
  const fill = new THREE.DirectionalLight(0xffcf9a, 1.2); fill.position.set(-1, 4, 10); scene.add(fill);
  const lamp = new THREE.PointLight(0xffd0a0, 14, 22, 1.4); lamp.position.set(-3.5, 5.5, 4.5); lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -.0005; lamp.shadow.normalBias = .02; scene.add(lamp);
  const room = new THREE.Group(), models = new THREE.Group(); scene.add(room, models);
  const wood = new THREE.MeshStandardMaterial({ color: 0x56372e, roughness: .9 });
  const plaster = new THREE.MeshStandardMaterial({ color: 0x4b374e, roughness: .95 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x3b272a, roughness: .9 });
  function block(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.receiveShadow = true; room.add(mesh); return mesh;
  }
  block(19, .16, 18, 0, -.12, 4, wood);
  const wall = block(18, 8, .12, 0, 4, -.1, plaster);
  const wallTrim = [block(18, .15, .15, 0, .15, 0, trim), block(18, .15, .15, 0, 6.2, 0, trim)];
  for (let x = -8; x <= 8; x += 2) wallTrim.push(block(.06, 6, .025, x, 3.15, -.02, trim));
  // Floor seams give the models a scale reference without adding visual clutter.
  for (let x = -9; x <= 9; x += .6) block(.012, .008, 18, x, -.032, 4, trim);
  let selected = 0, whole = innerWidth > 760 && innerHeight > 500, radius = 1.5, desiredView = "front";
  const props = new Map();
  for (const item of PREMIUM_WALL_ITEMS) props.set(item.id, premiumWallProp(item.id));
  const stats = () => Object.fromEntries(PREMIUM_WALL_ITEMS.map((item) => [item.id, premiumWallStats(item.id)]));
  const buttons = PREMIUM_WALL_ITEMS.map((item, i) => {
    const button = document.createElement("button"); button.textContent = item.name; button.dataset.id = item.id;
    button.setAttribute("aria-pressed", "false"); button.addEventListener("click", () => select(i));
    document.querySelector("#items").append(button); return button;
  });
  const views = { front: [0, .12], left: [-.72, .23], right: [.72, .23], back: [Math.PI, .2] };
  function fit(view = desiredView) {
    desiredView = view; const [yaw, pitch] = views[view] || views.front;
    const dockTop = document.querySelector("#dock").getBoundingClientRect().top;
    const labelBottom = document.querySelector("#label").getBoundingClientRect().bottom;
    const usable = Math.max(.3, Math.min(.9, (dockTop - labelBottom - 25) / innerHeight));
    const bounds = new THREE.Box3().setFromObject(models), dims = bounds.isEmpty() ? new THREE.Vector3(radius * 2, radius * 2, radius) : bounds.getSize(new THREE.Vector3());
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2), horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    const halfW = (Math.abs(Math.cos(yaw)) * dims.x + Math.abs(Math.sin(yaw)) * dims.z) / 2;
    const halfD = (Math.abs(Math.sin(yaw)) * dims.x + Math.abs(Math.cos(yaw)) * dims.z) / 2;
    const halfH = (dims.y * Math.cos(pitch) + halfD * 2 * Math.sin(pitch)) / 2;
    const dist = Math.max(halfH / Math.tan(vertical) / usable, halfW / Math.tan(horizontal) / .84) * 1.08 + halfD;
    controls.minDistance = radius * 1.25; controls.maxDistance = Math.max(20, dist * 2);
    camera.position.copy(controls.target).add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist));
    controls.update();
  }
  function updateScene() {
    models.clear();
    const item = PREMIUM_WALL_ITEMS[selected];
    if (whole) {
      PREMIUM_WALL_ITEMS.forEach((entry, i) => {
        const prop = props.get(entry.id), h = prop.userData.height || entry.height * .03;
        prop.position.set((i % 3 - 1) * 3.6, 4.7 - Math.floor(i / 3) * 2.6 - h / 2, .005); models.add(prop);
      });
      controls.target.set(0, 3.4, .2); radius = 5.5;
      document.querySelector("#name").textContent = "The midnight wall collection";
      document.querySelector("#detail").textContent = "Six native 3D models · Kitchen & manor wall pieces";
    } else {
      const prop = props.get(item.id), h = prop.userData.height || item.height * .03;
      prop.position.set(0, 2.9 - h / 2, .005); models.add(prop);
      const box = new THREE.Box3().setFromObject(prop), centre = box.getCenter(new THREE.Vector3()), dimensions = box.getSize(new THREE.Vector3());
      controls.target.copy(centre); radius = dimensions.length() / 2;
      document.querySelector("#name").textContent = item.name;
      document.querySelector("#detail").textContent = "Native voxel model · Wall mounted · Rotate to inspect the depth";
    }
    buttons.forEach((button, i) => button.setAttribute("aria-pressed", String(!whole && i === selected)));
    document.querySelector("#mode").textContent = whole ? "Single item" : "Whole wall";
    document.querySelector("#mode").setAttribute("aria-pressed", String(whole)); fit();
  }
  function select(index) {
    selected = typeof index === "string" ? PREMIUM_WALL_ITEMS.findIndex((item) => item.id === index) : index;
    selected = (selected + PREMIUM_WALL_ITEMS.length) % PREMIUM_WALL_ITEMS.length; whole = false; updateScene();
    buttons[selected].scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  function setMode(value) { whole = value === "wall" || value === true; updateScene(); }
  function zoom(direction) {
    const delta = camera.position.clone().sub(controls.target), distance = THREE.MathUtils.clamp(delta.length() * (direction > 0 ? .8 : 1.25), controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(delta.normalize().multiplyScalar(distance)); controls.update();
  }
  document.querySelector("#mode").addEventListener("click", () => setMode(!whole));
  document.querySelectorAll("[data-step]").forEach((button) => button.addEventListener("click", () => select(selected + +button.dataset.step)));
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => fit(button.dataset.view)));
  document.querySelectorAll("[data-zoom]").forEach((button) => button.addEventListener("click", () => zoom(+button.dataset.zoom)));
  addEventListener("keydown", (event) => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); select(selected - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); select(selected + 1); }
    if (event.key.toLowerCase() === "f") fit("front");
    if (event.key.toLowerCase() === "a") setMode(!whole);
    if (event.key === "+" || event.key === "=") zoom(1);
    if (event.key === "-") zoom(-1);
  });
  function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); fit(); }
  addEventListener("resize", resize);
  controls.addEventListener("change", () => { const front = camera.position.z >= .1; wall.visible = front; wallTrim.forEach((mesh) => { mesh.visible = front; }); });
  resize(); updateScene();
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
  document.querySelector("#loading").remove();
  window.WallShowroom = { select, setMode, setView: fit, zoom, stats, scene, camera, renderer, items: PREMIUM_WALL_ITEMS };
  window.wallShowroomReady = true;
}
try { start(); } catch (error) {
  window.wallShowroomError = String(error.stack || error); console.error(error);
  document.querySelector("#loading").style.display = "none";
  document.querySelector("#error").style.display = "grid";
  document.querySelector("#error-text").textContent = error.message || "Open this file in a browser with WebGL enabled.";
}
