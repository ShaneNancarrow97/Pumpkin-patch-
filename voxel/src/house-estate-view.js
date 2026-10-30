import * as THREE from "three";
import { createEntranceGlow } from "./entrance-glow.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildEstateHouse, buildEstateGarden, buildEstateDecor, disposeEstateObject } from "./house-estate-world.js";
import { ESTATE_DECOR_BY_ID } from "./content/house-estate.js";
import { estateBounds } from "./rules/house-estate.js";
import { gardenBedStage, gardenCropOf } from "./rules/garden-crops.js";
import { applyPieceColour } from "./piece-colours.js";
import { buildCarving, LANTERN_R } from "./carving-pumpkin.js";
import { STENCIL_BY_ID, CARVING_DECOR, inPiece, pieceKind } from "./content/carving.js";
import { lanternSpots } from "./play-ways.js";
import { attachPieceGestures, createFraming } from "./piece-gestures.js";

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
  const entrance = createEntranceGlow({ reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches }); scene.add(entrance.group);
  const camera = new THREE.PerspectiveCamera(43, 1, .15, 200);
  const controls = new OrbitControls(camera, canvas); controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = .12;
  controls.minDistance = 13; controls.maxDistance = 85; controls.minPolarAngle = .22; controls.maxPolarAngle = Math.PI / 2 - .12;
  controls.enablePan = true; controls.screenSpacePanning = false; controls.zoomSpeed = .75; controls.rotateSpeed = .65;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  let active = false, built = false, house = null, garden = null, houseKey = "", gardenKey = "", firstView = true, lanterns = null, lanternKey = "";
  const props = new Map(), pickables = [], pickMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const groundHit = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pickMaterial); groundHit.rotation.x = -Math.PI / 2; groundHit.position.y = .025; groundHit.userData = { type: "estate-ground" };
  const houseHit = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pickMaterial); houseHit.userData = { type: "estate-house" };
  const gateHit = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3, 1), pickMaterial); gateHit.userData = { type: "estate-exit" };
  scene.add(groundHit, houseHit, gateHit); pickables.push(groundHit, houseHit, gateHit);
  const selection = new THREE.Group(); scene.add(selection); selection.visible = false;
  let outline = null, ghost = null, ghostId = null, previewData = null, override = null, framed = "";
  const framing = createFraming({ canvas, camera, controls, card: () => document.querySelector(".estate-controls:not([hidden]) .estate-placement"), height: .4 });
  // The selected piece follows a finger and turns with two, as in the house.
  // `override` is its live pose until the editor saves it.
  const gestures = attachPieceGestures(canvas, {
    enabled: () => active && !hooks.blocked?.() && !!hooks.gesture?.pose(), camera: () => camera, controls, floorY: () => .04,
    grabs(e, at, ray) {
      const p = hooks.gesture.pose(), d = p && ESTATE_DECOR_BY_ID[p.id]; if (!d) return null;
      const own = p.instance && props.get(p.instance)?.hit; if (own) { scene.updateMatrixWorld(true); if (ray.intersectObject(own, false).length) return p; }
      const a = THREE.MathUtils.degToRad(p.rotation), dx = at.x - p.x, dz = at.z - p.z, u = dx * Math.cos(a) - dz * Math.sin(a), w = dx * Math.sin(a) + dz * Math.cos(a);
      return Math.abs(u) < d.w / 2 + .4 && Math.abs(w) < d.d / 2 + .4 ? p : null;
    },
    begin: () => hooks.gesture.begin(), drag: (x, z) => hooks.gesture.drag(x, z), turn: degrees => hooks.gesture.turn(degrees), end: cancelled => hooks.gesture.end(cancelled),
  });

  function sync() {
    const e = state.estate, bounds = estateBounds(state), hk = JSON.stringify([state.house.level, e.finishes.walls, e.finishes.roof, e.finishes.trim, e.finishes.door]), gk = JSON.stringify([e.expansion, e.finishes.fence]);
    if (hk !== houseKey) {
      if (house) { scene.remove(house); disposeEstateObject(house); }
      house = buildEstateHouse(state.house.level, e.finishes); scene.add(house); houseKey = hk;
      house.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(house), size = box.getSize(new THREE.Vector3());
      houseHit.position.copy(box.getCenter(new THREE.Vector3())); houseHit.scale.copy(size);
      const door = house.userData.door ?? { x: 0, y: 1.4, z: 4 }; porch.position.set(door.x - 1, door.y + 1, door.z + 1.5);
      entrance.group.position.set(door.x, 0, door.z + .1);
    }
    if (gk !== gardenKey) {
      if (garden) { scene.remove(garden); disposeEstateObject(garden); }
      garden = buildEstateGarden(state); scene.add(garden); gardenKey = gk;
      groundHit.scale.set(bounds.width, bounds.depth, 1); gateHit.position.set(0, 1.5, bounds.z1 - .15); gateLamp.position.set(-2, 2.3, bounds.z1 - .4);
    }
    // Carved lanterns kept from the carving bench glow on the doorstep.
    const lk = JSON.stringify(state.carving?.lanterns ?? []) + "@" + state.house.level;
    if (lk !== lanternKey) {
      if (lanterns) { scene.remove(lanterns); disposeEstateObject(lanterns); }
      lanterns = new THREE.Group(); lanterns.name = "Doorstep lanterns"; lanternKey = lk;
      const spots = lanternSpots(state);
      (state.carving?.lanterns ?? []).forEach((l, i) => {
        const st = STENCIL_BY_ID[l.stencil]; if (!st) return;
        const glow = CARVING_DECOR.candle.find(c => c.id === l.decor?.candle)?.colour, paint = CARVING_DECOR.paint.find(c => c.id === l.decor?.paint)?.colour;
        const cuts = st.pieces.filter(p => pieceKind(p) === "cut"), etched = st.pieces.filter(p => (l.etched ?? []).includes(p.id)), free = (l.free ?? []).map(outer => ({ outer }));
        const g = buildCarving(l.variety, { R: LANTERN_R, size: .62, shape: l.shape, cut: (u, v) => cuts.some(p => inPiece(p, u, v)) || free.some(p => inPiece(p, u, v)), etch: etched.length ? (u, v) => etched.some(p => inPiece(p, u, v)) : null, lid: "on", lit: true, glow, paint });
        g.position.set(spots[i].x, .06, spots[i].z); lanterns.add(g);
      });
      scene.add(lanterns);
    }
    const existing = new Set(e.placed.map(p => p.instance));
    for (const [id, item] of props) if (!existing.has(id)) {
      scene.remove(item.group, item.hit); disposeEstateObject(item.group); item.hit.geometry.dispose(); pickables.splice(pickables.indexOf(item.hit), 1); props.delete(id);
    }
    for (const p of e.placed) {
      let item = props.get(p.instance);
      // A crop bed is redrawn as it sprouts, grows, ripens and is picked.
      const stage = gardenCropOf(p.id) ? gardenBedStage(p) : "ready";
      if (item && item.stage !== stage) { scene.remove(item.group); disposeEstateObject(item.group); item.group = buildEstateDecor(p.id, stage); item.stage = stage; item.tint = undefined; scene.add(item.group); }
      if (!item) {
        const def = ESTATE_DECOR_BY_ID[p.id], group = buildEstateDecor(p.id, stage), hit = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.height, def.d), pickMaterial);
        hit.userData = { type: "estate-decor", instance: p.instance }; scene.add(group, hit); pickables.push(hit); item = { group, hit, stage }; props.set(p.instance, item);
      }
      const q = override?.instance === p.instance ? override : p;
      item.group.position.set(q.x, .04, q.z); item.group.rotation.y = THREE.MathUtils.degToRad(q.rotation);
      if(item.tint!==p.tint){applyPieceColour(item.group,p.tint);item.tint=p.tint;}
      item.hit.position.set(q.x, ESTATE_DECOR_BY_ID[p.id].height / 2 + .04, q.z); item.hit.rotation.y = item.group.rotation.y;
    }
    built = true;
  }
  function resize(w = canvas.clientWidth, h = canvas.clientHeight) { camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); }
  function reset() {
    resize(); const b = estateBounds(state), distance = Math.max(31, (house?.userData.bounds.height ?? 0) * 2.75, b.width * .58 / Math.max(.7, camera.aspect));
    controls.target.set(0, 2.3, .5); camera.position.set(distance * .54, distance * .55 + 2.3, distance * .72); controls.update();
  }
  const cameraActions = {
    rotate(delta) { const offset = camera.position.clone().sub(controls.target); offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(delta)); camera.position.copy(controls.target).add(offset); controls.update(); },
    zoom(factor) { const offset = camera.position.clone().sub(controls.target), distance = THREE.MathUtils.clamp(offset.length() / factor, controls.minDistance, controls.maxDistance); camera.position.copy(controls.target).add(offset.setLength(distance)); controls.update(); },
    pan(dx, dz) { camera.position.x += dx; camera.position.z += dz; controls.target.x += dx; controls.target.z += dz; controls.update(); },
    reset,
  };

  // Play mode: the camera follows the owner about the garden, keeping whatever
  // angle the stick or a drag has turned it to. It starts behind them at the
  // farm's own pitch, close enough to see them, and may come in closer.
  const PLAY_PITCH = THREE.MathUtils.degToRad(36), PLAY_DISTANCE = 15, sphere = new THREE.Spherical(), offset = new THREE.Vector3();
  let following = false;
  const play = {
    reset(pos) {
      following = true; controls.minDistance = 8; resize();
      controls.target.set(pos.x, 1.3, pos.z); sphere.set(PLAY_DISTANCE, Math.PI / 2 - PLAY_PITCH, 0);
      camera.position.copy(controls.target).add(offset.setFromSpherical(sphere)); controls.update();
    },
    follow(pos, dt) {
      if (!following) { play.reset(pos); return; }
      const k = 1 - Math.exp(-Math.max(0, dt) * 7), dx = (pos.x - controls.target.x) * k, dz = (pos.z - controls.target.z) * k;
      controls.target.x += dx; controls.target.z += dz; camera.position.x += dx; camera.position.z += dz;
    },
    // The right stick turns round the owner and tilts, as on the farm.
    look(x, y, dt) {
      if (!x && !y) return;
      const t = Math.min(.25, Math.max(0, dt));
      sphere.setFromVector3(offset.copy(camera.position).sub(controls.target));
      sphere.theta += x * t * 1.65; sphere.phi = THREE.MathUtils.clamp(sphere.phi - y * t * .85, Math.PI / 2 - THREE.MathUtils.degToRad(66), Math.PI / 2 - THREE.MathUtils.degToRad(22));
      camera.position.copy(controls.target).add(offset.setFromSpherical(sphere)); controls.update();
    },
    zoom(direction) { if (direction) cameraActions.zoom(Math.exp(Math.sign(direction) * .13)); },
    get following() { return following; },
  };
  function preview(data) {
    previewData = data; selection.visible = !!data; override = data && !data.pending && data.instance ? data : null;
    const who = data ? data.instance ?? "pending:" + data.id : ""; if (who !== framed) { framed = who; if (data) framing.aim(data.x, data.z); else framing.stop(); }
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
    scene, camera, cameraActions, sync, resize, preview, play,
    enter() { active = true; sync(); resize(); if (firstView) { reset(); firstView = false; } controls.enabled = true; },
    leave() { active = false; controls.enabled = false; pointers.clear(); gesture = false; preview(null); following = false; controls.minDistance = 13; },
    tick(time = 0) {
      controls.enabled = active && !hooks.blocked?.() && !gestures.busy; if (!active) return;
      sync(); entrance.tick(time, !hooks.editing?.() && !hooks.blocked?.()); const b = estateBounds(state), old = controls.target.clone();
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, b.x0 + 2, b.x1 - 2); controls.target.z = THREE.MathUtils.clamp(controls.target.z, b.z0 + 2, b.z1 - 2); controls.target.y = THREE.MathUtils.clamp(controls.target.y, .5, 9);
      camera.position.add(controls.target.clone().sub(old)); if (!gestures.busy) framing.step(); controls.update();
    },
    get status() { return { active, built, houseLevel: state.house.level, skin: house?.userData.skin ?? null, skinDetailCount: house?.userData.skinDetailCount ?? 0, expansion: state.estate.expansion, placed: props.size, entrance: { visible: entrance.group.visible, position: entrance.group.position.toArray() }, azimuth: controls.getAzimuthalAngle(), polar: controls.getPolarAngle(), distance: controls.getDistance(), target: controls.target.toArray(), preview: previewData ? { ...previewData } : null }; },
  };
}
