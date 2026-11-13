// Inspect the native furniture in room lighting, with no wall hiding the back.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PREMIUM_FURNITURE_ITEMS, premiumFurnitureProp, premiumFurnitureStats } from "../src/premium-furniture-props.js";

function start() {
  const container = document.querySelector("#scene"), renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
  container.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x211927);
  scene.fog = new THREE.Fog(0x211927, 25, 65);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 120);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .16; controls.enablePan = false;
  controls.minPolarAngle = .12; controls.maxPolarAngle = Math.PI * .49;
  scene.add(new THREE.HemisphereLight(0x8a7ac8, 0x3a2830, 1.9));
  const moon = new THREE.DirectionalLight(0xd2c6ff, 2.2); moon.position.set(6, 10, -7); scene.add(moon);
  const fill = new THREE.DirectionalLight(0xffcf9a, 1.2); fill.position.set(-1, 4, 10); scene.add(fill);
  const lamp = new THREE.PointLight(0xffd0a0, 14, 25, 1.4); lamp.position.set(-3.5, 6.5, 4.5); lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -.0005; lamp.shadow.normalBias = .02; scene.add(lamp);
  const room = new THREE.Group(), models = new THREE.Group(); scene.add(room, models);
  const wood = new THREE.MeshStandardMaterial({ color: 0x56372e, roughness: .9 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x3b272a, roughness: .9 });
  function block(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.receiveShadow = true; room.add(mesh); return mesh;
  }
  block(18, .16, 16, 0, -.12, 0, wood);
  for (let x = -9; x <= 9; x += .6) block(.012, .008, 16, x, -.032, 0, trim);
  // Only draw when the view changes. A static art preview need not run a game loop.
  let pending = false;
  function render() {
    pending = false;
    const changed = controls.update(); renderer.render(scene, camera);
    if (changed) invalidate();
  }
  function invalidate() { if (!pending) { pending = true; requestAnimationFrame(render); } }
  controls.addEventListener("change", invalidate);
  let selected = 0, whole = innerWidth > 760 && innerHeight > 500, radius = 1.5, desiredView = "front";
  const props = new Map(PREMIUM_FURNITURE_ITEMS.map((item) => [item.id, premiumFurnitureProp(item.id)]));
  const stats = () => Object.fromEntries(PREMIUM_FURNITURE_ITEMS.map((item) => [item.id, premiumFurnitureStats(item.id)]));
  const buttons = PREMIUM_FURNITURE_ITEMS.map((item, i) => {
    const button = document.createElement("button"); button.textContent = item.name; button.dataset.id = item.id;
    button.setAttribute("aria-pressed", "false"); button.addEventListener("click", () => select(i));
    document.querySelector("#items").append(button); return button;
  });
  const views = { front: [0, .40], left: [-.84, .40], right: [.84, .40], back: [Math.PI, .40], top: [0, 1.38] };
  function fit(view = desiredView) {
    desiredView = view; const [yaw, nominalPitch] = views[view] || views.front;
    const pitch = whole && view !== "top" ? .76 : nominalPitch;
    const dockTop = document.querySelector("#dock").getBoundingClientRect().top;
    const labelBottom = document.querySelector("#label").getBoundingClientRect().bottom;
    const usable = Math.max(.30, Math.min(.85, (dockTop - labelBottom - 25) / innerHeight));
    const bounds = new THREE.Box3().setFromObject(models), dims = bounds.isEmpty() ? new THREE.Vector3(3, 3, 3) : bounds.getSize(new THREE.Vector3());
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2), horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    const halfW = (Math.abs(Math.cos(yaw)) * dims.x + Math.abs(Math.sin(yaw)) * dims.z) / 2;
    const halfD = (Math.abs(Math.sin(yaw)) * dims.x + Math.abs(Math.cos(yaw)) * dims.z) / 2;
    const halfH = (dims.y * Math.cos(pitch) + halfD * 2 * Math.sin(pitch)) / 2;
    const dist = Math.max(halfH / Math.tan(vertical) / usable, halfW / Math.tan(horizontal) / .84) * 1.08 + halfD;
    controls.minDistance = radius * 1.15; controls.maxDistance = Math.max(22, dist * 2);
    camera.position.copy(controls.target).add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist));
    controls.update(); invalidate();
  }
  function updateScene() {
    models.clear();
    const item = PREMIUM_FURNITURE_ITEMS[selected];
    if (whole) {
      PREMIUM_FURNITURE_ITEMS.forEach((entry, i) => {
        const prop = props.get(entry.id);
        prop.position.set((i % 3 - 1) * 3.7, 0, (Math.floor(i / 3) - .5) * 4.2); models.add(prop);
      });
      document.querySelector("#name").textContent = "The midnight furniture collection";
      document.querySelector("#detail").textContent = "Six native 3D models · Kitchen heirlooms & bedroom treasures";
    } else {
      const prop = props.get(item.id); prop.position.set(0, 0, 0); models.add(prop);
      document.querySelector("#name").textContent = item.name;
      document.querySelector("#detail").textContent = `${item.room === "kitchen" ? "Kitchen" : "Bedroom"} · Native voxel model · Drag to inspect every side`;
    }
    const box = new THREE.Box3().setFromObject(models), dims = box.getSize(new THREE.Vector3());
    controls.target.copy(box.getCenter(new THREE.Vector3())); radius = dims.length() / 2;
    buttons.forEach((button, i) => button.setAttribute("aria-pressed", String(!whole && i === selected)));
    document.querySelector("#mode").textContent = whole ? "Single item" : "Collection";
    document.querySelector("#mode").setAttribute("aria-pressed", String(whole)); fit();
  }
  function select(index) {
    const found = typeof index === "string" ? PREMIUM_FURNITURE_ITEMS.findIndex((item) => item.id === index) : index;
    if (!Number.isInteger(found) || found < 0) return false;
    selected = found % PREMIUM_FURNITURE_ITEMS.length; whole = false; updateScene();
    buttons[selected].scrollIntoView({ block: "nearest", inline: "nearest" }); return true;
  }
  function setMode(value) { whole = value === "collection" || value === true; updateScene(); }
  function zoom(direction) {
    const delta = camera.position.clone().sub(controls.target), distance = THREE.MathUtils.clamp(delta.length() * (direction > 0 ? .8 : 1.25), controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(delta.normalize().multiplyScalar(distance)); controls.update(); invalidate();
  }
  document.querySelector("#mode").addEventListener("click", () => setMode(!whole));
  document.querySelectorAll("[data-step]").forEach((button) => button.addEventListener("click", () => select((selected + +button.dataset.step + PREMIUM_FURNITURE_ITEMS.length) % PREMIUM_FURNITURE_ITEMS.length)));
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => fit(button.dataset.view)));
  document.querySelectorAll("[data-zoom]").forEach((button) => button.addEventListener("click", () => zoom(+button.dataset.zoom)));
  addEventListener("keydown", (event) => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); select((selected - 1 + PREMIUM_FURNITURE_ITEMS.length) % PREMIUM_FURNITURE_ITEMS.length); }
    if (event.key === "ArrowRight") { event.preventDefault(); select((selected + 1) % PREMIUM_FURNITURE_ITEMS.length); }
    if (event.key.toLowerCase() === "f") fit("front");
    if (event.key.toLowerCase() === "a") setMode(!whole);
    if (event.key === "+" || event.key === "=") zoom(1);
    if (event.key === "-") zoom(-1);
  });
  function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); fit(); }
  addEventListener("resize", resize); updateScene(); resize();
  document.querySelector("#loading").remove();
  window.FurnitureShowroom = { select, setMode, setView: fit, zoom, stats, scene, camera, renderer, items: PREMIUM_FURNITURE_ITEMS, render: () => renderer.render(scene, camera) };
  window.furnitureShowroomReady = true;
}
try { start(); } catch (error) {
  window.furnitureShowroomError = String(error.stack || error); console.error(error);
  document.querySelector("#loading").style.display = "none";
  document.querySelector("#error").style.display = "grid";
  document.querySelector("#error-text").textContent = error.message || "Open this file in a browser with WebGL enabled.";
}
