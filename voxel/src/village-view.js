// Mothlight Village's scene (handover 73): its own render scene, built the
// first time you go, with an orbiting camera (a following one in play mode),
// the parts that change rebuilt from their keys, decor pieces, the residents,
// pages to find, and the grand tour's camera director. Realm (x, z) → three (x, -z).
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildGround, buildPaving, buildWater, buildGreen, buildBeyond, buildHorizon, buildMist, buildStall, buildBench, buildHomes, buildNodes, buildTerrainWorks, grassAt, LAMPS, SKY } from "./village-world.js";
import { createGrass } from "./village-grass.js";
import { terrainHeight } from "./village-terrain.js";
import { createBats } from "./village-bats.js";
import { buildVillageDecor, letterPage } from "./village-models.js";
import { buildEstateDecor } from "./house-estate-world.js";
import { VILLAGE_DECOR_BY_ID } from "./content/village-decor.js";
import { FIXTURES, NODES, PLAN_SCALE } from "./content/village.js";
import { createVillageLife } from "./village-life.js";
import { storyObjectsHere, nodeReady } from "./rules/village.js";
import { attachPieceGestures, createFraming } from "./piece-gestures.js";
import { createVillageFolk } from "./village-folk.js";

const W = (x, z, y = 0) => new THREE.Vector3(x, y, -z), K = PLAN_SCALE;
// How high the ground is at a world point (the terrain is drawn on the design grid).
export const groundAt = (x, z) => terrainHeight(x / K, z / K) * K;
// The grand tour (realm coordinates, drawn up on the design grid and scaled into the world):
// the camera's place [x, height, z], where it looks, and the title that rises there.
export const TOUR = Object.freeze([
  { at: [58, 30, -16], look: [58, 2, 22], title: "Mothlight Village", sub: "Over the hill from your farm" },
  { at: [58, 10, 4], look: [57, 1, 24], title: "Hollow Green", sub: "The square, the well and the noticeboard" },
  { at: [49, 8, 14], look: [40, 2, 22], title: "Elowen's library", sub: "A conservatory, one day" },
  { at: [62, 7, 13], look: [72, 1.5, 19], title: "Rowan's workshop", sub: "More plans than walls" },
  { at: [56, 16, 26], look: [62, 2, 52], title: "Lantern Quarry", sub: "Beyond the broken bridge · opens at level 9" },
  { at: [40, 15, 40], look: [18, 2, 58], title: "Moonroot Copse", sub: "Mabel and Tansy, behind the brambles · level 6" },
  { at: [78, 16, 30], look: [100, 3, 40], title: "Carnival Moor", sub: "Corvus's tents and the Baron's manor · level 12" },
  { at: [84, 22, 62], look: [85, 4, 88], title: "Mirror Marsh", sub: "Where the observatory waits · level 15" },
  { at: [60, 64, -6], look: [82, 18, 150], title: "…and beyond", sub: "" },
  { at: [57, 6.5, 13], look: [56, 1.2, 24], title: "Welcome to Mothlight", sub: "" },
].map((p) => Object.freeze({ ...p, at: p.at.map((v) => v * K), look: p.look.map((v) => v * K) })));
const TOUR_SECONDS = 4.6;

export function createVillageView(canvas, state, hooks = {}) {
  // Lantern Night: a dark indigo sky, cool moonlight from over your shoulder, and
  // every lamp, window and jack-o'-lantern lit warm, with pooled lights round the nearest.
  // A plum haze thickens with distance, so far things melt into the night instead of popping in;
  // past its reach whole patches of the village aren't drawn at all (thicker and nearer in play mode).
  const scene = new THREE.Scene(); scene.background = new THREE.Color(SKY.top); scene.fog = new THREE.FogExp2(0x1d1430, .0045);
  const REACH = { look: { fog: .0042, far: 400 }, play: { fog: .0072, far: 250 } };
  // The village is built on its design grid and scaled into the world here; people, decor and pages stand in the world itself.
  const root = new THREE.Group(); root.scale.setScalar(K); scene.add(root);
  scene.userData.exposure = 1.15;
  scene.add(new THREE.HemisphereLight(0x5a68b8, 0x231b2c, .7));
  const SUN = new THREE.Vector3(.42, .78, .46).normalize();
  const sun = new THREE.DirectionalLight(0xb8c2ff, 1.25); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -44, right: 44, top: 44, bottom: -44, near: 1, far: 170 }); sun.shadow.normalBias = .04; sun.shadow.bias = -.0004;
  scene.add(sun, sun.target); sun.shadow.autoUpdate = false;
  let shadowTick = 0;
  const fill = new THREE.DirectionalLight(0x9a6ad8, .35); fill.position.set(-60, 30, 20); scene.add(fill);
  // A fixed pool of warm lights, moved each frame to the lamps nearest what you're looking at (never added or removed).
  const pool = Array.from({ length: 8 }, () => { const l = new THREE.PointLight(0xff9a40, 48, 17, 1.5); scene.add(l); return l; });
  const camera = new THREE.PerspectiveCamera(45, 1, .2, 900);
  const controls = new OrbitControls(camera, canvas); controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = .12;
  controls.minDistance = 6; controls.maxDistance = 150; controls.minPolarAngle = .2; controls.maxPolarAngle = Math.PI / 2 - .1;
  controls.enablePan = true; controls.screenSpacePanning = false; controls.zoomSpeed = .75; controls.rotateSpeed = .6;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  const patches = [];
  let active = false, built = false, firstView = true, keys = {}, parts = {}, tour = null, time = 0, horizon = null, sky = null, mist = null, bats = null, life = null, grass = null;
  const pickables = [], pickMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const hit = (w, h, d, data, x, z, y = h / 2) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pickMaterial); m.position.copy(W(x, z, y)); m.userData = data; scene.add(m); pickables.push(m); return m; };
  const folk = createVillageFolk({ scene, state, pickables, pickMaterial, ground: groundAt });
  const decor = new Map(), pages = new Map();
  const selection = new THREE.Group(); scene.add(selection); selection.visible = false;
  let outline = null, ghost = null, ghostId = null, override = null, framed = "";
  const framing = createFraming({ canvas, camera, controls, card: () => document.querySelector(".village-controls:not([hidden]) .estate-placement"), height: .4 });

  function buildOnce() {
    if (built) return; built = true;
    horizon = buildHorizon(); sky = horizon.userData.sky; horizon.remove(sky); scene.add(sky);
    mist = buildMist(); bats = createBats(); life = createVillageLife(); grass = createGrass({ x0: 0, z0: 0, x1: 122, z1: 98, density: 3, grow: grassAt, height: terrainHeight, scale: K });
    const works = buildTerrainWorks(), green = buildGreen(), beyond = buildBeyond();
    root.add(buildGround(), buildPaving(), buildWater(), works, green, beyond, horizon, mist, bats.group, life.group, grass.group);
    // Every patch of the built village, with where it is, so those beyond the haze can be skipped.
    root.updateMatrixWorld(true);
    for (const g of [works, green, beyond, horizon]) for (const chunk of g.children) { if (!chunk.isGroup) continue; const box = new THREE.Box3().setFromObject(chunk); if (box.isEmpty()) continue; const sphere = box.getBoundingSphere(new THREE.Sphere()); patches.push({ chunk, sphere }); }
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(122 * K, 38 * K), pickMaterial); ground.rotation.x = -Math.PI / 2; ground.position.copy(W(60 * K, 18 * K, .02)); ground.userData = { type: "village-ground" }; scene.add(ground); pickables.push(ground);
    const f = FIXTURES;
    hit(f.stall.d, 4, f.stall.w, { type: "village-stall" }, f.stall.x, f.stall.z);
    hit(f.noticeboard.w, 3.6, f.noticeboard.d, { type: "village-noticeboard" }, f.noticeboard.x, f.noticeboard.z);
    hit(f.well.r * 2, 4.4, f.well.r * 2, { type: "village-well" }, f.well.x, f.well.z);
    hit(f.carriage.w, 4.6, f.carriage.d, { type: "village-carriage" }, f.carriage.x, f.carriage.z);
    for (const n of NODES.filter((n) => n.district === "green")) hit(2, 1.8, 2, { type: "village-node", id: n.id }, n.x, n.z);
  }
  // Rebuilds a part when its key changes.
  function part(name, key, make) {
    if (keys[name] === key) return; keys[name] = key;
    if (parts[name]) { root.remove(parts[name]); dispose(parts[name]); }
    parts[name] = make(); root.add(parts[name]);
  }
  function sync() {
    buildOnce();
    const v = state.village;
    part("stall", String(v.unlocks.includes("stall")), () => buildStall(v.unlocks.includes("stall")));
    part("bench", String(v.effects.includes("bench")), () => buildBench(v.effects.includes("bench")));
    part("homes", JSON.stringify(v.built), () => buildHomes(v.built)); life?.setBuilt(v.built);
    const ready = (id) => nodeReady(state, id);
    part("nodes", NODES.filter((n) => n.district === "green").map((n) => (ready(n.id) ? 1 : 0)).join(""), () => buildNodes(ready));
    // Decor pieces: one group each, as they move.
    const live = new Set(v.decor.placed.map((p) => p.instance));
    for (const [id, item] of decor) if (!live.has(id)) { scene.remove(item.group, item.hit); dispose(item.group); pickables.splice(pickables.indexOf(item.hit), 1); decor.delete(id); }
    for (const p of v.decor.placed) {
      let item = decor.get(p.instance); const def = VILLAGE_DECOR_BY_ID[p.id];
      if (!item) {
        const group = def.estate ? buildEstateDecor(p.id) : buildVillageDecor(p.id), h = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.height, def.d), pickMaterial);
        h.userData = { type: "village-decor", instance: p.instance }; scene.add(group, h); pickables.push(h); item = { group, hit: h }; decor.set(p.instance, item);
      }
      const q = override?.instance === p.instance ? override : p;
      item.group.position.copy(W(q.x, q.z, .02)); item.group.rotation.y = THREE.MathUtils.degToRad(q.rotation);
      item.hit.position.copy(W(q.x, q.z, def.height / 2)); item.hit.rotation.y = item.group.rotation.y;
    }
    // Pages of Elowen's letter waiting to be found.
    const want = new Set(storyObjectsHere(state, "village").map((o) => o.id));
    for (const [id, item] of pages) if (!want.has(id)) { scene.remove(item.group, item.hit); pickables.splice(pickables.indexOf(item.hit), 1); pages.delete(id); }
    for (const o of storyObjectsHere(state, "village")) if (!pages.has(o.id)) {
      const group = letterPage(); group.position.copy(W(o.x, o.z, .02)); scene.add(group);
      pages.set(o.id, { group, hit: hit(1, 1, 1, { type: "village-page", id: o.id }, o.x, o.z), x: o.x, z: o.z });
    }
    folk.sync();
  }
  function dispose(object) { object.traverse((o) => { o.geometry?.dispose?.(); if (o.material && o.material !== pickMaterial) [].concat(o.material).forEach((m) => { m.map?.dispose?.(); m.dispose(); }); }); }

  function resize(w = canvas.clientWidth, h = canvas.clientHeight) { camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); }
  function reset() {
    resize(); const far = (camera.aspect < .9 ? 42 : 30) * K;
    controls.target.copy(W(58 * K, 21.5 * K, 1)); camera.position.copy(W(58 * K, 21.5 * K - far * .83, far * .56)); controls.update();
  }
  const cameraActions = {
    rotate(delta) { const o = camera.position.clone().sub(controls.target); o.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(delta)); camera.position.copy(controls.target).add(o); controls.update(); },
    zoom(factor) { const o = camera.position.clone().sub(controls.target), d = THREE.MathUtils.clamp(o.length() / factor, controls.minDistance, controls.maxDistance); camera.position.copy(controls.target).add(o.setLength(d)); controls.update(); },
    pan(dx, dz) { camera.position.x += dx; camera.position.z += dz; controls.target.x += dx; controls.target.z += dz; controls.update(); },
    reset,
    // Puts the camera at one realm point looking at another ([x, height, z] each).
    place(at, look) { controls.target.copy(W(look[0], look[2], look[1])); camera.position.copy(W(at[0], at[2], at[1])); camera.lookAt(controls.target); },
    // Looks at a realm point from a little closer (a resident, a page, a node).
    focus(x, z, distance = 22) { const o = camera.position.clone().sub(controls.target).setLength(distance); controls.target.copy(W(x, z, 1)); camera.position.copy(controls.target).add(o); controls.update(); },
  };

  // Play mode: the camera follows the owner, as in the garden.
  const PLAY_PITCH = THREE.MathUtils.degToRad(34), PLAY_DISTANCE = 14, sphere = new THREE.Spherical(), offset = new THREE.Vector3();
  let following = false;
  const play = {
    reset(pos) { following = true; resize(); controls.target.set(pos.x, 1.3, pos.z); sphere.set(PLAY_DISTANCE, Math.PI / 2 - PLAY_PITCH, 0); camera.position.copy(controls.target).add(offset.setFromSpherical(sphere)); controls.update(); },
    follow(pos, dt) {
      if (!following) { play.reset(pos); return; }
      const k = 1 - Math.exp(-Math.max(0, dt) * 7), dx = (pos.x - controls.target.x) * k, dz = (pos.z - controls.target.z) * k;
      controls.target.x += dx; controls.target.z += dz; camera.position.x += dx; camera.position.z += dz;
    },
    look(x, y, dt) {
      if (!x && !y) return; const t = Math.min(.25, Math.max(0, dt));
      sphere.setFromVector3(offset.copy(camera.position).sub(controls.target));
      sphere.theta += x * t * 1.65; sphere.phi = THREE.MathUtils.clamp(sphere.phi - y * t * .85, Math.PI / 2 - THREE.MathUtils.degToRad(66), Math.PI / 2 - THREE.MathUtils.degToRad(20));
      camera.position.copy(controls.target).add(offset.setFromSpherical(sphere)); controls.update();
    },
    zoom(direction) { if (direction) cameraActions.zoom(Math.exp(Math.sign(direction) * .13)); },
    get following() { return following; },
  };

  // The grand tour: a smooth flight through TOUR's points, a title rising at each.
  const curve = (key) => new THREE.CatmullRomCurve3(TOUR.map((p) => W(p[key][0], p[key][2], p[key][1])), false, "centripetal");
  const tourPath = { at: null, look: null }, focus = new THREE.Vector3();
  const director = {
    start(onTitle = () => {}, onDone = () => {}) {
      buildOnce(); tourPath.at ??= curve("at"); tourPath.look ??= curve("look");
      tour = { t: 0, shown: -1, onTitle, onDone, length: (TOUR.length - 1) * TOUR_SECONDS }; controls.enabled = false;
    },
    skip() { if (!tour) return; const done = tour.onDone; tour = null; reset(); done(); },
    get active() { return !!tour; },
  };
  function tickTour(dt) {
    if (!tour) return;
    tour.t = Math.min(tour.length, tour.t + dt);
    const raw = tour.t / tour.length, seg = raw * (TOUR.length - 1), i = Math.floor(seg), f = seg - i, eased = (i + (f < .5 ? 2 * f * f : 1 - 2 * (1 - f) ** 2)) / (TOUR.length - 1);
    camera.position.copy(tourPath.at.getPoint(Math.min(1, eased))); focus.copy(tourPath.look.getPoint(Math.min(1, eased))); camera.lookAt(focus);
    const near = Math.min(TOUR.length - 1, Math.round(seg));
    if (near !== tour.shown && Math.abs(seg - near) < .35) { tour.shown = near; tour.onTitle(TOUR[near], near); }
    if (tour.t >= tour.length) { const done = tour.onDone; tour = null; controls.target.copy(tourPath.look.getPoint(1)); controls.update(); done(); }
  }

  // Placing decor: an outline (gold, or red where it won't fit) and a ghost of a new piece.
  function preview(data) {
    override = data && !data.pending && data.instance ? data : null; selection.visible = !!data;
    const who = data ? data.instance ?? "pending:" + data.id : ""; if (who !== framed) { framed = who; if (data) framing.aim(data.x, -data.z); else framing.stop(); }
    if (!data) { if (ghost) { selection.remove(ghost); dispose(ghost); ghost = null; ghostId = null; } return; }
    const def = VILLAGE_DECOR_BY_ID[data.id]; if (!def) { selection.visible = false; return; }
    if (outline) { selection.remove(outline); outline.geometry.dispose(); outline.material.dispose(); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-def.w / 2, 0, -def.d / 2, def.w / 2, 0, -def.d / 2, def.w / 2, 0, def.d / 2, -def.w / 2, 0, def.d / 2]), 3));
    outline = new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: data.valid === false ? 0xf38e77 : 0xf6ce84, depthTest: false, transparent: true, opacity: .95 })); outline.renderOrder = 20; selection.add(outline);
    if (ghostId !== data.id || !data.pending) {
      if (ghost) { selection.remove(ghost); dispose(ghost); ghost = null; }
      ghostId = data.pending ? data.id : null;
      if (data.pending) { ghost = def.estate ? buildEstateDecor(data.id) : buildVillageDecor(data.id); ghost.traverse((m) => { if (m.material) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = .45; m.material.depthWrite = false; } }); selection.add(ghost); }
    }
    selection.position.copy(W(data.x, data.z, .1)); selection.rotation.y = THREE.MathUtils.degToRad(data.rotation ?? 0);
  }
  // A piece follows a finger and turns with two, as in the garden.
  attachPieceGestures(canvas, {
    enabled: () => active && !tour && !hooks.blocked?.() && !!hooks.gesture?.pose(), camera: () => camera, controls, floorY: () => .04,
    grabs(e, at) { const p = hooks.gesture.pose(), d = p && VILLAGE_DECOR_BY_ID[p.id]; if (!d) return null; const dx = at.x - p.x, dz = -at.z - p.z; return Math.hypot(dx, dz) < Math.max(d.w, d.d) / 2 + .6 ? p : null; },
    begin: () => hooks.gesture.begin(), drag: (x, z) => hooks.gesture.drag(x, -z), turn: (deg) => hooks.gesture.turn(deg), end: (c) => hooks.gesture.end(c),
  });

  // Taps: residents, gathering spots, the stall and noticeboard, pages, decor, or the ground.
  const pointers = new Map(); let multi = false;
  canvas.addEventListener("pointerdown", (e) => { if (!active || tour || hooks.blocked?.()) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: 0 }); if (pointers.size > 1) multi = true; });
  canvas.addEventListener("pointermove", (e) => { const p = pointers.get(e.pointerId); if (p) p.moved = Math.max(p.moved, Math.hypot(e.clientX - p.x, e.clientY - p.y)); });
  canvas.addEventListener("pointerup", (e) => {
    const p = pointers.get(e.pointerId), tap = active && !tour && p && p.moved < 7 && !multi && e.button === 0 && !hooks.blocked?.(); pointers.delete(e.pointerId); if (!pointers.size) multi = false;
    if (!tap) return;
    const b = canvas.getBoundingClientRect(), ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1), camera);
    scene.updateMatrixWorld(true); const found = ray.intersectObjects(pickables, false), editing = hooks.editing?.();
    const h = editing ? found.find((x) => x.object.userData.type === "village-ground") : found[0];
    if (h) hooks.onPick?.({ ...h.object.userData, point: { x: h.point.x, z: -h.point.z } });
  });
  canvas.addEventListener("pointercancel", (e) => { pointers.delete(e.pointerId); if (!pointers.size) multi = false; });

  function placeLights() {
    const t = tour ? focus : controls.target, near = [...LAMPS].sort((a, b) => Math.hypot(a.x * K - t.x, -a.z * K - t.z) - Math.hypot(b.x * K - t.x, -b.z * K - t.z));
    pool.forEach((l, i) => { const lamp = near[i]; l.position.copy(W(lamp.x * K, lamp.z * K, (lamp.y - .2) * K)); });
    sun.target.position.copy(t); sun.position.copy(t).addScaledVector(SUN, 100); sun.target.updateMatrixWorld();
    // The moonlight's shadows are redrawn every other frame, as on the farm (handover 40).
    if (++shadowTick % 2 === 0 || tour) sun.shadow.needsUpdate = true;
    if (sky) sky.position.copy(camera.position);
  }
  return {
    scene, camera, cameraActions, play, director, folk, sync, resize, preview, groundAt,
    enter() { active = true; sync(); resize(); if (firstView) { reset(); firstView = false; } controls.enabled = !tour; },
    leave() { active = false; controls.enabled = false; pointers.clear(); multi = false; preview(null); following = false; tour = null; },
    tick(dt = 0) {
      time += dt; if (!active) return;
      controls.enabled = !tour && !hooks.blocked?.() && !hooks.gesture?.busy?.();
      tickTour(dt); if (!tour) { if (!following) framing.step(); controls.update(); }
      const reach = following ? REACH.play : REACH.look; scene.fog.density += (reach.fog - scene.fog.density) * Math.min(1, dt * 2);
      for (const p of patches) p.chunk.visible = p.sphere.center.distanceTo(camera.position) - p.sphere.radius < reach.far;
      placeLights(); folk.tick(dt, time, camera); bats?.tick(time); life?.tick(time, dt, camera, pool); grass?.tick(time, camera);
      if (mist) for (const m of mist.children) { const u = m.userData; m.position.x = u.x + Math.sin(time * .07 + u.phase) * 2.5; m.position.z = -u.z + Math.cos(time * .05 + u.phase) * 1.5; }
      for (const p of pages.values()) { p.group.position.y = .05 + Math.sin(time * 2.3 + p.x) * .04; p.group.rotation.y = Math.sin(time * .9 + p.z) * .5; }
    },
    get active() { return active; },
  };
}
