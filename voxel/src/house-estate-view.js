import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildEstateHouse, buildEstateGarden, buildEstateDecor, disposeEstateObject } from "./house-estate-world.js";
import { ESTATE_DECOR_BY_ID } from "./content/house-estate.js";
import { estateBounds } from "./rules/house-estate.js";
import { applyPieceColour } from "./piece-colours.js";

// A separate render scene: the farm keeps running while the camera explores
// a complete house, rather than exposing the backs of the farm's diorama.
export function createHouseEstateView(canvas, state, hooks) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x171322); scene.fog = new THREE.Fog(0x211a2b, 65, 125);
  scene.add(new THREE.HemisphereLight(0xbba5dc, 0x3b382d, 2.2));
  const moon = new THREE.DirectionalLight(0xe0d4ff, 2.6); moon.position.set(-18, 30, -12); moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 85 }); moon.shadow.normalBias = .035; moon.shadow.bias = -.0003;
  scene.add(moon, moon.target);
  const fill = new THREE.DirectionalLight(0xffd5a4, 1.4); fill.position.set(12, 20, 24); scene.add(fill);
  // Fixed lamps are present from the scene's creation; rebuilding a house
  // moves their positions and never changes the shader's light count.
  const porch = new THREE.PointLight(0xffb967, 22, 16, 1.7), gateLamp = new THREE.PointLight(0xffc578, 14, 13, 1.6);
  scene.add(porch, gateLamp);
  const camera = new THREE.PerspectiveCamera(43, 1, .15, 200);
  const controls = new OrbitControls(camera, canvas); controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = .12;
  controls.minDistance = 13; controls.maxDistance = 85; controls.minPolarAngle = .22; controls.maxPolarAngle = Math.PI / 2 - .12;
  controls.enablePan = true; controls.screenSpacePanning = false; controls.zoomSpeed = .75; controls.rotateSpeed = .65;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  let active = false, built = false, house = null, garden = null, houseKey = "", gardenKey = "", firstView = true;
  const props = new Map(), pickables = [], pickMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const groundHit = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pickMaterial); groundHit.rotation.x = -Math.PI / 2; groundHit.position.y = .025; groundHit.userData = { type: "estate-ground" };
  const houseHit = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pickMaterial); houseHit.userData = { type: "estate-house" };
  const gateHit = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3, 1), pickMaterial); gateHit.userData = { type: "estate-exit" };
  scene.add(groundHit, houseHit, gateHit); pickables.push(groundHit, houseHit, gateHit);
  const selection = new THREE.Group(); scene.add(selection); selection.visible = false;
  let outline = null, ghost = null, ghostId = null, previewData = null;

  function sync() {
    const e = state.estate, bounds = estateBounds(state), hk = JSON.stringify([state.house.level, e.finishes.walls, e.finishes.roof, e.finishes.trim, e.finishes.door]), gk = JSON.stringify([e.expansion, e.finishes.fence]);
    if (hk !== houseKey) {
      if (house) { scene.remove(house); disposeEstateObject(house); }
      house = buildEstateHouse(state.house.level, e.finishes); scene.add(house); houseKey = hk;
      house.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(house), size = box.getSize(new THREE.Vector3());
      houseHit.position.copy(box.getCenter(new THREE.Vector3())); houseHit.scale.copy(size);
      const door = house.userData.door ?? { x: 0, y: 1.4, z: 4 }; porch.position.set(door.x - 1, door.y + 1, door.z + 1.5);
    }
    if (gk !== gardenKey) {
      if (garden) { scene.remove(garden); disposeEstateObject(garden); }
      garden = buildEstateGarden(state); scene.add(garden); gardenKey = gk;
      groundHit.scale.set(bounds.width, bounds.depth, 1); gateHit.position.set(0, 1.5, bounds.z1 - .15); gateLamp.position.set(-2, 2.3, bounds.z1 - .4);
    }
    const existing = new Set(e.placed.map(p => p.instance));
    for (const [id, item] of props) if (!existing.has(id)) {
      scene.remove(item.group, item.hit); disposeEstateObject(item.group); item.hit.geometry.dispose(); pickables.splice(pickables.indexOf(item.hit), 1); props.delete(id);
    }
    for (const p of e.placed) {
      let item = props.get(p.instance);
      if (!item) {
        const def = ESTATE_DECOR_BY_ID[p.id], group = buildEstateDecor(p.id), hit = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.height, def.d), pickMaterial);
        hit.userData = { type: "estate-decor", instance: p.instance }; scene.add(group, hit); pickables.push(hit); item = { group, hit }; props.set(p.instance, item);
      }
      item.group.position.set(p.x, .04, p.z); item.group.rotation.y = THREE.MathUtils.degToRad(p.rotation);
      if(item.tint!==p.tint){applyPieceColour(item.group,p.tint);item.tint=p.tint;}
      item.hit.position.set(p.x, ESTATE_DECOR_BY_ID[p.id].height / 2 + .04, p.z); item.hit.rotation.y = item.group.rotation.y;
    }
    built = true;
  }
  function resize(w = canvas.clientWidth, h = canvas.clientHeight) { camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); }
  function reset() {
    resize(); const b = estateBounds(state), distance = Math.max(31, b.width * .58 / Math.max(.7, camera.aspect));
    controls.target.set(0, 2.3, .5); camera.position.set(distance * .54, distance * .55 + 2.3, distance * .72); controls.update();
  }
  const cameraActions = {
    rotate(delta) { const offset = camera.position.clone().sub(controls.target); offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(delta)); camera.position.copy(controls.target).add(offset); controls.update(); },
    zoom(factor) { const offset = camera.position.clone().sub(controls.target), distance = THREE.MathUtils.clamp(offset.length() / factor, controls.minDistance, controls.maxDistance); camera.position.copy(controls.target).add(offset.setLength(distance)); controls.update(); },
    pan(dx, dz) { camera.position.x += dx; camera.position.z += dz; controls.target.x += dx; controls.target.z += dz; controls.update(); },
    reset,
  };

  function preview(data) {
    previewData = data; selection.visible = !!data;
    if (!data) { if (ghost) { selection.remove(ghost); disposeEstateObject(ghost); ghost = null; ghostId = null; } return; }
    const def = ESTATE_DECOR_BY_ID[data.id]; if (!def) { selection.visible = false; return; }
    if (outline) { selection.remove(outline); outline.geometry.dispose(); outline.material.dispose(); }
    const vertices = new Float32Array([-def.w/2,0,-def.d/2,def.w/2,0,-def.d/2,def.w/2,0,def.d/2,-def.w/2,0,def.d/2]);
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    outline = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color: data.valid === false ? 0xf38e77 : 0xf6ce84, depthTest: false, transparent: true, opacity: .95 })); outline.renderOrder = 20; selection.add(outline);
    if (ghostId !== data.id || !data.pending) {
      if (ghost) { selection.remove(ghost); disposeEstateObject(ghost); ghost = null; }
      ghostId = data.pending ? data.id : null;
      if (data.pending) { ghost = buildEstateDecor(data.id); ghost.traverse(m => { if (m.material) { m.material.transparent = true; m.material.opacity = .45; m.material.depthWrite = false; } }); selection.add(ghost); }
    }
    selection.position.set(data.x, .12, data.z); selection.rotation.y = THREE.MathUtils.degToRad(data.rotation ?? 0);
  }

  // OrbitControls owns drag/pinch. A separate movement threshold recognises
  // taps without letting the end of a camera gesture enter the house.
  const pointers = new Map(); let gesture = false;
  canvas.addEventListener("pointerdown", e => {
    if (!active || hooks.blocked?.()) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: 0 }); if (pointers.size > 1) gesture = true;
  });
  canvas.addEventListener("pointermove", e => { const p = pointers.get(e.pointerId); if (p) p.moved = Math.max(p.moved, Math.hypot(e.clientX - p.x, e.clientY - p.y)); });
  canvas.addEventListener("pointerup", e => {
    const p = pointers.get(e.pointerId), tap = active && p && p.moved < 7 && !gesture && e.button === 0 && !hooks.blocked?.(); pointers.delete(e.pointerId);
    if (!pointers.size) gesture = false;
    if (!tap) return;
    const b = canvas.getBoundingClientRect(), ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((e.clientX-b.left)/b.width*2-1, -(e.clientY-b.top)/b.height*2+1), camera);
    scene.updateMatrixWorld(true); const found = ray.intersectObjects(pickables, false), hit = hooks.editing?.() ? found.find(h=>h.object.userData.type==="estate-ground") : found[0];
    if (hit) hooks.onPick({ ...hit.object.userData, point: hit.point });
  });
  canvas.addEventListener("pointercancel", e => { pointers.delete(e.pointerId); if (!pointers.size) gesture = false; });
  canvas.addEventListener("contextmenu", e => { if (active) e.preventDefault(); });
  return {
    scene, camera, cameraActions, sync, resize, preview,
    enter() { active = true; sync(); resize(); if (firstView) { reset(); firstView = false; } controls.enabled = true; },
    leave() { active = false; controls.enabled = false; pointers.clear(); gesture = false; preview(null); },
    tick() {
      controls.enabled = active && !hooks.blocked?.(); if (!active) return;
      sync(); const b = estateBounds(state), old = controls.target.clone();
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, b.x0 + 2, b.x1 - 2); controls.target.z = THREE.MathUtils.clamp(controls.target.z, b.z0 + 2, b.z1 - 2); controls.target.y = THREE.MathUtils.clamp(controls.target.y, .5, 9);
      camera.position.add(controls.target.clone().sub(old)); controls.update();
    },
    get status() { return { active, built, houseLevel: state.house.level, expansion: state.estate.expansion, placed: props.size, azimuth: controls.getAzimuthalAngle(), polar: controls.getPolarAngle(), distance: controls.getDistance(), target: controls.target.toArray(), preview: previewData ? { ...previewData } : null }; },
  };
}
