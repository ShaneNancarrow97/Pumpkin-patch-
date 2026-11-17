import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Voxels } from "../../../../src/voxels.js";
import { buildHayrideConvoy, CONVOY } from "./convoy.js";

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x181220); renderer.outputColorSpace = THREE.SRGBColorSpace;
document.querySelector("main").append(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, .05, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 1.8); controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .48;
controls.minDistance = 4; controls.maxDistance = 40;
scene.add(new THREE.HemisphereLight(0xe1d9fa, 0x694838, 2.1));
const moon = new THREE.DirectionalLight(0xaca9ff, 3.4); moon.position.set(5, 12, -4); scene.add(moon);
const warm = new THREE.DirectionalLight(0xffcf90, 2); warm.position.set(-6, 7, 8); scene.add(warm);
const pad = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, .15, 64), new THREE.MeshStandardMaterial({ color: 0x312734, roughness: 1 }));
pad.position.set(0, -.09, 1.4); scene.add(pad);
const convoy = buildHayrideConvoy(THREE, Voxels, { shadows: false }); scene.add(convoy.root);
convoy.setBoarding(true);
let boarding = true, rolling = false, rollDistance = 0, rideView = false, currentView = "rear";
const views = { rear: [8, 6, 12], front: [8, 5, -10], side: [12, 5, 2] };
let lastFrameBounds = null;
function fitAssembly() {
  convoy.root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(convoy.root), corners = [];
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z));
  for (let i = 0; i < 25; i++) {
    camera.lookAt(controls.target); camera.updateMatrixWorld(true);
    const points = corners.map(c => c.clone().project(camera));
    lastFrameBounds = { x0: Math.min(...points.map(p => p.x)), x1: Math.max(...points.map(p => p.x)), y0: Math.min(...points.map(p => p.y)), y1: Math.max(...points.map(p => p.y)) };
    if (lastFrameBounds.x0 >= -.9 && lastFrameBounds.x1 <= .9 && lastFrameBounds.y0 >= -.62 && lastFrameBounds.y1 <= .72) break;
    camera.position.sub(controls.target).multiplyScalar(1.08).add(controls.target);
  }
}
function frame(name) {
  currentView = name;
  rideView = name === "ride"; controls.enabled = !rideView;
  if (rideView) { convoy.root.updateMatrixWorld(true); camera.position.fromArray(CONVOY.rearCamera).applyMatrix4(convoy.wagon.matrixWorld); camera.lookAt(new THREE.Vector3(0, CONVOY.rearCamera[1], -8).applyMatrix4(convoy.wagon.matrixWorld)); }
  else { controls.target.set(0, 1, 1.8); camera.position.set(...views[name]).sub(controls.target).multiplyScalar(Math.max(1, .9 / camera.aspect)).add(controls.target); fitAssembly(); controls.update(); }
}
frame("rear");
for (const button of document.querySelectorAll("[data-view]")) button.addEventListener("click", () => frame(button.dataset.view));
document.querySelector("#gate").addEventListener("click", e => { boarding = !boarding; convoy.setBoarding(boarding); e.currentTarget.textContent = boarding ? "Close gate" : "Boarding gate"; });
document.querySelector("#roll").addEventListener("click", e => { rolling = !rolling; e.currentTarget.textContent = rolling ? "Stop wheels" : "Roll wheels"; });
function resize() { const r = document.querySelector("main").getBoundingClientRect(); renderer.setSize(r.width, r.height); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); frame(currentView); }
addEventListener("resize", resize); resize();
let last = performance.now();
function render(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; if (rolling) { rollDistance += dt * .8; convoy.setRollDistance(rollDistance); } if (!rideView) controls.update(); renderer.render(scene, camera); requestAnimationFrame(render); }
requestAnimationFrame(render);
window.HayridePrototype = { convoy, frame, scene, renderer, camera, info: CONVOY, frameBounds: () => lastFrameBounds };
