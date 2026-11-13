// Mothlight Village's scene (handover 73): its own render scene, built the
// first time you go, with an orbiting camera (a following one in play mode),
// the parts that change rebuilt from their keys, decor pieces, the residents,
// pages to find, and the grand tour's camera director. Realm (x, z) → three (x, -z).
import * as THREE from "three";
import { createFollowCameraRig, followCameraPose } from "./follow-camera.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildGround, buildPaving, buildWater, buildGreen, buildBeyond, buildHorizon, buildMist, buildStall, buildBench, buildHomes, buildTerrainWorks, buildWoods, spreadVillage, spreadWhole, grassAt, tickVillageVisibility, resetVillageVisibility, LAMPS, SKY } from "./village-world.js";
import { createGrass } from "./village-grass.js";
import { groundHeight as terrainHeight, GROUND_REALM as REALM } from "./village-terrain.js";
import { createBats } from "./village-bats.js";
import { buildVillageDecor, letterPage, frame, velvetBatHall, VELVET_HALL, elowenLibrary, ELOWEN_HALL, rowanWorkshop, ROWAN_HALL } from "./village-models.js";
import { Voxels } from "./voxels.js";
import { buildEstateDecor } from "./house-estate-world.js";
import { VILLAGE_DECOR_BY_ID } from "./content/village-decor.js";
import { villageNodePosition } from "./content/village-node-sites.js";
import { FIXTURES, NODES, PLAN_SCALE } from "./content/village.js";
import { TOUR } from "./content/village-tour.js";
export { TOUR } from "./content/village-tour.js";
import { createVillageLife } from "./village-life.js";
import { createHallLife } from "./village-hall-life.js";
import { finishVoxels, setLampNear } from "./voxel-finish.js";
import { spread, gather } from "./rules/village-spread.js";
import { buildTownSquare } from "./village-town-square.js";
import { TOWN_LAMPS } from "./content/village-town-square.js";
import { VILLAGE_GRADE } from "./picture-grade.js";
import { createLampGlow } from "./village-glow.js";
import { createVillageAtmosphere } from "./village-atmosphere.js";
import { createCursedSporeField } from "./village-blight.js";
import { createVillageResourceLayer } from "./village-resource-layer.js";
import { createVillageShopMarkers } from "./village-shop-markers.js";
import { villageNodeHitBox } from "./village-node-hit.js";
import { createVillageDialogueCamera } from "./village-dialogue-camera.js";
import { storyObjectsHere, nodeReady, nodeGrowthInfo } from "./rules/village.js";
import { attachPieceGestures, createFraming } from "./piece-gestures.js";
import { createVillageFolk, makeResident } from "./village-folk.js";
import { readyVillageSprites, villageSpriteTextures } from "./village-sprite-actors.js";
import { createVillageExpansionWorld } from './village-expansion-world.js';
import { EXPANSION_INSIDES, expansionHomeOpen } from './village-expansion-interiors.js';
import { expansionAreaInfo } from './rules/village-expansion.js';
import { moveVillageWalker, villageCellFree, villageCameraBlockers, villageCameraReach } from './rules/village-navigation.js';
import { advanceExpansionCompanion } from './rules/village-expansion-companions.js';
import { isCaveArea, caveCellFree, constrainCaveCamera, CAVE_CAMERA_PRESET } from './village-expansion-spatial.js';
import { OUTSIDE_VIEW, HALL_VIEW, outsideLookLift } from './village-camera.js';
import { visibleVillagePick } from "./village-sprite-math.js";

const W = (x, z, y = 0) => new THREE.Vector3(x, y, -z), K = PLAN_SCALE;
const NODE_BY_ID = new Map(NODES.map(n => [n.id, n]));
const BLIGHT_NODES = NODES.filter(n => n.kind === "blight");
// How high the ground is at a world point (the terrain is drawn on the design grid).
export const groundAt = (x, z) => terrainHeight(x / K, z / K) * K;
const TOUR_SECONDS = 4.6;
// Buildings you can go inside: their hall, its plan (size, spawn, host's post, where a walker can't go), the host
// who keeps it, and the front door on the design grid.
// A door's facing is the way out of it; DOOR_NORMAL says which way that is on the grid (x east, z north).
// A door drawn on the old grid, where it now stands (the village is spread apart: rules/village-spread.js).
function spreadDoor(x, z, facing) { const [nx, nz] = spread(x, z); return Object.freeze({ x: nx, z: nz, facing }); }
export const INSIDES = Object.freeze({
  ...EXPANSION_INSIDES,
  "velvet-bat": Object.freeze({ name: "The Velvet Bat", build: velvetBatHall, hall: VELVET_HALL, host: "vesper", door: spreadDoor(102, 24.4, "north") }),
  "elowen-library": Object.freeze({ name: "Elowen's library", build: elowenLibrary, hall: ELOWEN_HALL, host: "elowen", door: spreadDoor(47.6, 18.6, "east") }),
  "rowan-workshop": Object.freeze({ name: "Rowan's workshop", build: rowanWorkshop, hall: ROWAN_HALL, host: "rowan", door: spreadDoor(66.4, 20, "west") }),
});
export const DOOR_NORMAL = Object.freeze({ north: [0, 1], south: [0, -1], east: [1, 0], west: [-1, 0] });

export function createVillageView(canvas, state, hooks = {}) {
  // Lantern Night: a dark indigo sky, cool moonlight from over your shoulder, and
  // every lamp, window and jack-o'-lantern lit warm, with pooled lights round the nearest.
  // A plum haze thickens with distance, so far things melt into the night instead of popping in;
  // past its reach whole patches of the village aren't drawn at all (thicker and nearer in play mode).
  const scene = new THREE.Scene(); scene.background = new THREE.Color(SKY.top); scene.fog = new THREE.FogExp2(0x1d1430, .0045);
  const REACH = { look: { fog: .0042, far: 400 }, play: { fog: .0072, far: 250 }, inside: { fog: .0015, far: 0 } };
  // The village is built on its design grid and scaled into the world here; people, decor and pages stand in the world itself.
  const root = new THREE.Group(); root.scale.setScalar(K); scene.add(root);
  scene.userData.exposure = 1.15;
  // The village's own glow (tighter than the farm's, so windows and lamps keep their colour) and its final grade.
  scene.userData.bloom = { strength: .36, radius: .55, threshold: .9 }; scene.userData.grade = VILLAGE_GRADE;
  // The night's own light: enough moon and sky that an unlit lane reads as moonlit blue, never black.
  const NIGHT = { hemi: .98, sun: 1.32, sky: 0x6474c8, ground: 0x2e243c };
  const hemi = new THREE.HemisphereLight(NIGHT.sky, NIGHT.ground, NIGHT.hemi); scene.add(hemi);
  const SUN = new THREE.Vector3(.42, .78, .46).normalize();
  const sun = new THREE.DirectionalLight(0xb8c2ff, NIGHT.sun); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -44, right: 44, top: 44, bottom: -44, near: 1, far: 170 }); sun.shadow.normalBias = .04; sun.shadow.bias = -.0004;
  scene.add(sun, sun.target); sun.shadow.autoUpdate = false;
  let shadowTick = 0;
  const fill = new THREE.DirectionalLight(0x9a6ad8, .35); fill.position.set(-60, 30, 20); scene.add(fill);
  // A fixed pool of warm lights, moved each frame to the lamps nearest what you're looking at (never added or removed).
  // Out of doors a wall takes a lamp's light as if it stood `near` units off, so a lamp by a door warms it instead of bleaching it.
  const LAMP = { power: 48, reach: 17, decay: 1.5, near: 4 };
  // Halls and caves take a lamp's light at its true distance: their lamps hang clear of the walls.
  const HALL_LAMP = { ...LAMP, near: 0 };
  const lampAs = (spec, scale = 1) => { setLampNear(spec.near); pool.forEach((l) => { l.userData.base = spec.power * scale; l.distance = spec.reach; l.decay = spec.decay; }); };
  const pool = Array.from({ length: 8 }, () => { const l = new THREE.PointLight(0xff9a40, LAMP.power, LAMP.reach, LAMP.decay); scene.add(l); return l; });
  setLampNear(LAMP.near);
  const camera = new THREE.PerspectiveCamera(45, 1, .2, 900);
  const controls = new OrbitControls(camera, canvas); controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = .12;
  controls.minDistance = 6; controls.maxDistance = 150; controls.minPolarAngle = .2; controls.maxPolarAngle = Math.PI / 2 - .1;
  controls.enablePan = true; controls.screenSpacePanning = false; controls.zoomSpeed = .75; controls.rotateSpeed = .6;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  const patches = [];
  // The lamps where they now stand, and the parts rebuilt as the village changes, moved into place as they are made.
  const LAMPS_AT = [...LAMPS.map((l) => { const [x, z] = spread(l.x, l.z); return { ...l, x, z }; }), ...TOWN_LAMPS];
  const oldSpot = (f) => gather(f.x / K, f.z / K);
  function spreadPart(name, g) { if (name === "stall") spreadWhole(g, ...oldSpot(FIXTURES.stall)); else if (name === "bench") spreadWhole(g, ...oldSpot(FIXTURES.bench)); else spreadVillage(g); }
  let active = false, built = false, firstView = true, keys = {}, parts = {}, tour = null, time = 0, horizon = null, sky = null, mist = null, bats = null, life = null, grass = null, lampGlow = null, town = null;
  const pickables = [], pickMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const expansionWorld=createVillageExpansionWorld({scene,state,groundAt,pickMaterial});
  let companion=null,companionId=null,companionPose=null,ownerHeading={x:0,z:1};
  function setExpansionCompanion(id){if(id===companionId)return;companion?.root.removeFromParent();companion?.root.userData.dispose?.();companion=null;companionId=id;companionPose=null;if(id){companion=makeResident(id,{style:folk.style});scene.add(companion.root);}}

  const hit = (w, h, d, data, x, z, y = h / 2) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pickMaterial); m.position.copy(W(x, z, y)); m.userData = data; scene.add(m); pickables.push(m); return m; };
  const reducedMotion = () => hooks.reducedMotion?.() ?? (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const blight = createCursedSporeField({ groundAt }); scene.add(blight.group);
  const resources = createVillageResourceLayer({nodes:NODES,positionOf:n=>villageNodePosition(state,n),growthOf:id=>nodeGrowthInfo(state,id),groundAt,scale:K});scene.add(resources.group);
  const shopMarkers = createVillageShopMarkers({groundAt});scene.add(shopMarkers.group);pickables.push(...shopMarkers.pickables);
  const blightRows = BLIGHT_NODES.map(n => ({ id: n.id, x: n.x, z: n.z, ready: false, cycle: 0 }));
  const dialogueFocus = createVillageDialogueCamera({ camera, controls, reducedMotion, groundAt: (x, z) => inside ? 0 : groundAt(x, z) });
  const dialoguePlayer = new THREE.Vector3(), dialogueNeighbour = new THREE.Vector3();
  // Callers use village realm coordinates; the helper owns only the view pose.
  const dialogueCamera = {
    begin(player, neighbour) {
      if (!player || !neighbour) return false;
      const floor = p => Number.isFinite(p.y) ? p.y : inside ? .12 * K : groundAt(p.x, p.z);
      dialoguePlayer.set(player.x, floor(player), -player.z); dialogueNeighbour.set(neighbour.x, floor(neighbour), -neighbour.z);
      return dialogueFocus.begin(dialoguePlayer, dialogueNeighbour);
    },
    end(options) { return dialogueFocus.end(options); },
    get active() { return dialogueFocus.active; },
    get status() { return dialogueFocus.status; },
  };
  const folk = createVillageFolk({ scene, state, getState: () => state, reducedMotion, pickables, pickMaterial, ground: groundAt, everyone: () => !!hooks.everyone?.(), style: hooks.castStyle?.() ?? "sprite" });
  let atmosphere = null, villageGreen = null, followSubject = null;
  const decor = new Map(), pages = new Map();
  const selection = new THREE.Group(); scene.add(selection); selection.visible = false;
  let outline = null, ghost = null, ghostId = null, override = null, framed = "";
  const framing = createFraming({ canvas, camera, controls, card: () => document.querySelector(".village-controls:not([hidden]) .estate-placement"), height: .4 });

  function buildOnce() {
    if (built) return; built = true;
    expansionWorld.build();pickables.push(...expansionWorld.pickables);
    horizon = buildHorizon(); sky = horizon.userData.sky; horizon.remove(sky); scene.add(sky);
    const works = buildTerrainWorks({gates:false}), green = buildGreen(), beyond = buildBeyond({closedGates:false}), woods = buildWoods(); villageGreen = green;
    const earth = buildGround(), paving = buildPaving(), water = buildWater();
    // Everything drawn on the old grid moves apart into the spread village; the rest was drawn there already.
    for (const g of [water, works, green, beyond]) spreadVillage(g);
    // The chimneys the village noted as it was built smoke where they now stand.
    const smoke = [green, beyond].flatMap((g) => g.userData.marks?.smoke ?? []).map(([x, y, z]) => ({ x, y, z: -z }));
    mist = buildMist(); bats = createBats(); life = createVillageLife({ chimneyTops: smoke }); grass = createGrass({ x0: REALM.x0, z0: REALM.z0, x1: REALM.x1, z1: REALM.z1, density: 3, grow: grassAt, height: terrainHeight, scale: K });
    // The town square in the ground the spread opened north of the Green, drawn there whole.
    town = buildTownSquare();
    root.add(earth, paving, water, works, green, beyond, woods, horizon, mist, bats.group, life.group, grass.group, town);
    atmosphere = createVillageAtmosphere(); root.add(atmosphere.group);
    // Every built voxel gets the village's finish: finer blocks, joints and weathering shaded onto its faces.
    finishVoxels(scene);
    // A halo round every lamp's head and a pool of light under the far ones.
    lampGlow = createLampGlow(LAMPS_AT.map((l) => ({ head: W(l.x * K, l.z * K, (l.y - .2) * K), ground: W(l.x * K, l.z * K, groundAt(l.x * K, l.z * K)) }))); scene.add(lampGlow.group);
    Object.entries({ ground: earth, paving, water, works, green, beyond, woods, horizon, mist, bats: bats.group, life: life.group, grass: grass.group }).forEach(([n, g]) => { g.name = n; });
    // Every patch of the built village, with where it is, so those beyond the haze can be skipped.
    root.updateMatrixWorld(true);
    for (const g of [works, green, beyond, woods, horizon, town]) for (const chunk of g.children) { if (!chunk.isGroup) continue; const box = new THREE.Box3().setFromObject(chunk); if (box.isEmpty()) continue; const sphere = box.getBoundingSphere(new THREE.Sphere()); patches.push({ chunk, sphere }); }
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(172 * K, 104 * K), pickMaterial); ground.rotation.x = -Math.PI / 2; ground.position.copy(W(60 * K, 29 * K, .02)); ground.userData = { type: "village-ground" }; scene.add(ground); pickables.push(ground);
    const f = FIXTURES;
    hit(f.stall.d, 4, f.stall.w, { type: "village-stall" }, f.stall.x, f.stall.z);
    hit(f.noticeboard.w, 3.6, f.noticeboard.d, { type: "village-noticeboard" }, f.noticeboard.x, f.noticeboard.z);
    hit(f.well.r * 2, 4.4, f.well.r * 2, { type: "village-well" }, f.well.x, f.well.z);
    hit(f.carriage.w, 4.6, f.carriage.d, { type: "village-carriage" }, f.carriage.x, f.carriage.z);
    for (const n of NODES) { const p=villageNodePosition(state,n),box=villageNodeHitBox(n,p,groundAt);hit(box.w,box.h,box.d,{type:"village-node",id:n.id},p.x,p.z,box.y); }
    for (const [id, p] of Object.entries(INSIDES)) { const [nx, nz] = DOOR_NORMAL[p.door.facing]; hit(nx ? 1.2 : 3.4, 5.8, nx ? 3.4 : 1.2, { type: "village-door", id }, (p.door.x + nx * .5) * K, (p.door.z + nz * .5) * K); }
  }
  // Rebuilds a part when its key changes.
  function part(name, key, make) {
    if (keys[name] === key) return; keys[name] = key;
    if (parts[name]) { root.remove(parts[name]); dispose(parts[name]); }
    parts[name] = make(); spreadPart(name, parts[name]); finishVoxels(parts[name]); root.add(parts[name]);
  }
  function sync() {
    buildOnce();
    const v = state.village;
    part("stall", String(v.unlocks.includes("stall")), () => buildStall(v.unlocks.includes("stall")));
    part("bench", String(v.effects.includes("bench")), () => buildBench(v.effects.includes("bench")));
    part("homes", JSON.stringify(v.built), () => buildHomes(v.built)); life?.setBuilt(v.built);
    const ready = (id) => nodeReady(state, id);
    for(const h of pickables)if(h.userData.type==="village-door"){const p=INSIDES[h.userData.id];h.visible=!expansionWorld.active&&canEnterInside(h.userData.id);}
    for(const h of pickables)if(h.userData.type==="village-node"){h.visible=!expansionWorld.active&&ready(h.userData.id);const p=villageNodePosition(state,h.userData.id),box=villageNodeHitBox(NODE_BY_ID.get(h.userData.id),p,groundAt);h.position.set(box.x,box.y,box.z);}
    resources.sync();shopMarkers.sync(state);expansionWorld.sync();
    for (let i=0;i<blightRows.length;i++) { const row=blightRows[i],p=villageNodePosition(state,row.id);row.x=p.x;row.z=p.z;row.ready=ready(row.id);row.cycle=state.village.gatherCycles?.[row.id]??0; }
    blight.sync(blightRows);
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

  function resize(w = canvas.clientWidth, h = canvas.clientHeight) { camera.aspect = w / Math.max(1, h); camera.fov = following && !inside ? (camera.aspect < .9 ? 58 : 48) : inside?.plan.hall.view?.fov ?? 45; camera.updateProjectionMatrix(); dialogueFocus.resize(); }
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
    focus(x, z, distance = 22, height = 1) { following = false; const o = camera.position.clone().sub(controls.target).setLength(distance); controls.target.copy(W(x, z, height)); camera.position.copy(controls.target).add(o); controls.update(); },
  };

  // Inside places: a building's own hall, built on first entry far from the village (on the design grid, scaled
  // like it), lit by its own marked lamps, with its host at their post. While inside, the village isn't drawn,
  // the moon is dimmed and the haze thins. door is where its front door stands (design grid); spawn and host are
  // in the hall's own frame (x across, z from the door back into the hall).
  const INSIDE = new THREE.Vector3(4000, 0, 0), insides = new Map();
  let inside = null;
  const hallPoint = (x, z, y = 0) => new THREE.Vector3(x, y, z).multiplyScalar(K).add(INSIDE);
  function buildInside(id) {
    if (insides.has(id)) return insides.get(id);
    const plan = INSIDES[id]; if(!plan)return null;const v = new Voxels(); plan.build(frame(v, 0, 0, "south", 0));
    const built = v.build({ glow: 1.6 }), group = new THREE.Group(); finishVoxels(built); group.add(built); group.scale.setScalar(K); group.position.copy(INSIDE); group.visible = false; scene.add(group);
    const lamps = (built.userData.marks.lamp ?? []).map(([x, y, z]) => hallPoint(x, z, y));
    // Fires, candle flames, steam and drifting motes, wherever the hall's builder marked them.
    const stir = createHallLife(built.userData.marks); group.add(stir.group);
    let host = null;
    if (plan.host) host = hallHost(plan);
    const entry = { id, plan, group, lamps, host, stir }; insides.set(id, entry); return entry;
  }
  function hallHost(plan) {
    const host = makeResident(plan.host, { style: folk.style });
    host.root.position.copy(hallPoint(plan.hall.host[0], plan.hall.host[1], .12)); host.root.visible = false; scene.add(host.root);
    const h = new THREE.Mesh(new THREE.BoxGeometry(.9, 2.4, .9), pickMaterial); h.userData = { type: "village-folk", id: plan.host }; h.position.y = 1.2; host.root.add(h); pickables.push(h); host.hit = h;
    return host;
  }
  function refreshHallCast() {
    for (const entry of insides.values()) {
      const old = entry.host; if (!old) continue;
      scene.remove(old.root); const index = pickables.indexOf(old.hit); if (index >= 0) pickables.splice(index, 1);
      old.hit.geometry.dispose(); if (!old.sprite) old.root.traverse(o => { if (o !== old.hit) o.geometry?.dispose?.(); });
      entry.host = hallHost(entry.plan); entry.host.root.visible = entry === inside;
    }
  }
  function setCastStyle(style) { folk.setStyle(style); refreshHallCast(); return folk.style; }
  const spriteReady = readyVillageSprites().then(() => {
    if (folk.style === "sprite") refreshHallCast();
    for (const texture of villageSpriteTextures()) hooks.warmTexture?.(texture);
  });
  function canEnterInside(id){return expansionHomeOpen(state,INSIDES[id]);}
  function goInside(id) {
    if(!canEnterInside(id))return false;
    dialogueFocus.end({ immediate: true });
    resources.group.visible=false;shopMarkers.hide();
    gatherTool();
    if (inside?.id === id) return inside;
    if (inside) goOutside();
    inside = buildInside(id); inside.group.visible = true; if (inside.host) inside.host.root.visible = true;
    root.visible = false; if (sky) sky.visible = false; scene.background.set(0x0a070d); scene.fog.color.set(0x0a070d); scene.fog.density = REACH.inside.fog;
    const hall = inside.plan.hall, glow = hall.light ?? 1; lampAs({ ...HALL_LAMP, reach: hall.reach ?? HALL_LAMP.reach }, glow); sun.intensity = .08; hemi.intensity = hall.ambient ?? .32; scene.userData.exposure = hall.exposure ?? 1.3; following = false; resize();
    return inside;
  }
  function goOutside() {
    dialogueFocus.end({ immediate: true });
    if (!inside) return; inside.group.visible = false; if (inside.host) inside.host.root.visible = false; inside = null;
    root.visible = true; if (sky) sky.visible = true; scene.background.set(SKY.top); scene.fog.color.set(0x1d1430); sun.intensity = NIGHT.sun; hemi.intensity = NIGHT.hemi; scene.userData.exposure = 1.15; following = false; lampAs(LAMP); pool.forEach((l) => { l.color.set(0xff9a40); }); resize();
  }

  // A closer third-person orbit stays on the owner, rather than panning away
  // under OrbitControls. Interiors keep their wider cutaway-friendly distance.
  // Outside, the arm sits low behind the owner and the lens looks over their head, so the street ahead, the
  // roofs and the sky fill the top of the frame; the look stick tilts it from just under the horizon to
  // well above the rooftops. The arm shortens rather than pass through a building.
  const outsideRig = createFollowCameraRig({ pitch: OUTSIDE_VIEW.pitch, distance: OUTSIDE_VIEW.distance, minDistance: 4.8, maxDistance: 14, minPitch: OUTSIDE_VIEW.minPitch, maxPitch: OUTSIDE_VIEW.maxPitch });
  const blockers = villageCameraBlockers(); let arm = 1;
  const hallRig = createFollowCameraRig({ pitch: HALL_VIEW.pitch, distance: HALL_VIEW.distance, minDistance: 9, maxDistance: 17, yawLimit: .8, minPitch: HALL_VIEW.minPitch, maxPitch: HALL_VIEW.maxPitch });
  const caveRig = createFollowCameraRig(CAVE_CAMERA_PRESET);
  const activeRig = () => inside ? hallRig : expansionWorld.active ? caveRig : outsideRig;
  let following = false;
  function clearOrbitMomentum() {
    const damped = controls.enableDamping; controls.enableDamping = false; controls.update(); controls.enableDamping = damped;
  }
  function applyFollowPose(dt = 0) {
    if (dialogueFocus.active) return;
    const rig = activeRig().state, pose = followCameraPose(rig);
    controls.target.set(pose.target.x, pose.target.y, pose.target.z);
    camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    if(expansionWorld.active){const bounded=constrainCaveCamera(expansionWorld.active,pose.target,pose.position);camera.position.set(bounded.x,bounded.y,bounded.z);}
    if (inside) { camera.lookAt(pose.target.x, pose.target.y + (inside.plan.hall.view?.lift ?? HALL_VIEW.lift), pose.target.z); camera.updateMatrixWorld(); return; }
    if (expansionWorld.active) { camera.lookAt(controls.target); camera.updateMatrixWorld(); return; }
    // The clear length of the arm: in at once, out gently, so a corner never pops the picture.
    const clear = Math.max(OUTSIDE_VIEW.nearest / rig.distance, villageCameraReach({ x: pose.target.x, z: -pose.target.z }, { x: pose.position.x, z: -pose.position.z }, blockers));
    arm = clear < arm || !dt ? clear : Math.min(clear, arm + (clear - arm) * (1 - Math.exp(-dt * 5)));
    if (arm < .999) { camera.position.lerpVectors(controls.target, camera.position, arm); camera.position.y += (1 - arm) * OUTSIDE_VIEW.tuck; }
    camera.position.y = Math.max(camera.position.y, groundAt(camera.position.x, -camera.position.z) + .65);
    camera.lookAt(pose.target.x, pose.target.y + outsideLookLift(rig.pitch), pose.target.z); camera.updateMatrixWorld();
  }
  const play = {
    pause() { following = false; if (!dialogueFocus.active) clearOrbitMomentum(); resize(); },
    // Old numeric theta callers remain valid; new entries may name their heading.
    reset(pos, options = {}) {
      if (dialogueFocus.active) return;
      clearOrbitMomentum(); following = true; controls.enabled = false; resize();
      const setup = typeof options === "number" ? { yaw: options } : options;
      followSubject = { x: pos.x, y: pos.y ?? 0, z: pos.z };
      activeRig().reset(pos, inside ? { ...setup, yaw: 0 } : expansionWorld.active ? {yaw:CAVE_CAMERA_PRESET.yaw,...setup} : setup); applyFollowPose();
    },
    recenter(pos, heading) {
      if (!following) { play.reset(pos, { heading }); return; }
      activeRig().recenter(inside ? { x: 0, z: -1 } : heading);
    },
    follow(pos, dt, motion = {}) {
      if(motion.heading)ownerHeading={x:motion.heading.x,z:-motion.heading.z};
      if (dialogueFocus.active) return;
      if (!following) { play.reset(pos, { heading: motion.heading }); return; }
      followSubject = { x: pos.x, y: pos.y ?? 0, z: pos.z };
      activeRig().step(pos, dt, inside ? { ...motion, worldDirected: false } : motion); applyFollowPose(dt);
    },
    look(x, y, dt) { activeRig().look(x, y, dt); },
    orbit(dx, dy) { activeRig().orbit(dx, dy); },
    zoom(direction) { if (direction) activeRig().zoom(Math.exp(Math.sign(direction) * .13)); },
    get following() { return following; },
    get state() { return { ...activeRig().state, following, subject: followSubject && { ...followSubject }, inside: inside?.id ?? null }; },
  };

  // Reusable hand tools sit in world space beside the painted owner's hand. No lights are added.
  const handTools = new Map(), toolPoint = new THREE.Vector3(), toolSide = new THREE.Vector3();
  function gatherTool({ actor, material, progress = 0, active: on = false, target } = {}) {
    for (const tool of handTools.values()) tool.visible = false;
    blight.rooting();
    const owner = actor?.root ?? actor;
    if (!on || !owner?.getWorldPosition) return;
    if (material === "cursed-spores" && target) { owner.getWorldPosition(toolPoint);blight.rooting(target.x,target.z,toolPoint.x,toolPoint.y+1.05,toolPoint.z,progress);return; }
    const kind = ["logs", "hardwood"].includes(material) ? "axe" : ["stone", "iron", "moonstone", "clay", "star-amber"].includes(material) ? "pickaxe" : null;
    if (!kind) return;
    let tool = handTools.get(kind);
    if (!tool) {
      const v = new Voxels();
      v.block(0, -.46, 0, .075, .92, .075, 0x795034); v.block(0, -.46, 0, .09, .15, .09, 0x462b24);
      if (kind === "axe") { v.block(.14, .3, 0, .36, .28, .09, 0xa5b0c2); v.block(.31, .26, 0, .08, .36, .045, 0xd6dfeb); }
      else { v.block(0, .35, 0, .62, .11, .1, 0x9caabd); for (const s of [-1, 1]) v.block(s*.32,.27,0,.12,.12,.08,0xd6dfeb); }
      tool = v.build({ shadows: false }); tool.name = "village-" + kind; scene.add(tool); handTools.set(kind, tool);
    }
    owner.getWorldPosition(toolPoint);
    if(target&&Number.isFinite(target.x)&&Number.isFinite(target.z))toolSide.set(target.x-toolPoint.x,0,-target.z-toolPoint.z);else camera.getWorldDirection(toolSide);
    toolSide.y=0;if(toolSide.lengthSq()<.0001)camera.getWorldDirection(toolSide);toolSide.normalize();
    const x = -toolSide.z, z = toolSide.x;
    tool.position.copy(toolPoint).add(new THREE.Vector3(x*.43, 1.18, z*.43));
    tool.rotation.set(0, Math.atan2(toolSide.x, toolSide.z), -.35 + Math.sin(Math.min(1, Math.max(0, progress))*Math.PI*4)*.95);
    tool.visible = true;
  }

  // The grand tour: a smooth flight through TOUR's points, a title rising at each.
  const curve = (key) => new THREE.CatmullRomCurve3(TOUR.map((p) => W(p[key][0], p[key][2], p[key][1])), false, "centripetal");
  const tourPath = { at: null, look: null }, focus = new THREE.Vector3();
  const director = {
    start(onTitle = () => {}, onDone = () => {}, { hold = () => false } = {}) {
      dialogueFocus.end({ immediate: true });
      buildOnce(); tourPath.at ??= curve("at"); tourPath.look ??= curve("look");
      tour = { t: 0, shown: -1, onTitle, onDone, hold, cueAt: 0, length: (TOUR.length - 1) * TOUR_SECONDS }; controls.enabled = false;
    },
    skip() { if (!tour) return; const done = tour.onDone; tour = null; reset(); done(); },
    get active() { return !!tour; },
  };
  function tickTour(dt) {
    if (!tour) return;
    // Let each recorded caption finish at its view. Muted, missing or blocked
    // speech keeps the original pacing; a broken player cannot trap the tour.
    const holding = () => tour.shown >= 0 && performance.now() - tour.cueAt < 40000 && tour.hold();
    if (holding()) return;
    tour.t = Math.min(tour.length, tour.t + dt);
    const raw = tour.t / tour.length, seg = raw * (TOUR.length - 1), i = Math.floor(seg), f = seg - i, eased = (i + f * f * f * (f * (f * 6 - 15) + 10)) / (TOUR.length - 1);
    camera.position.copy(tourPath.at.getPoint(Math.min(1, eased))); focus.copy(tourPath.look.getPoint(Math.min(1, eased))); camera.lookAt(focus);
    const near = Math.min(TOUR.length - 1, Math.round(seg));
    if (near !== tour.shown && Math.abs(seg - near) < .35) { tour.shown = near; tour.cueAt = performance.now(); tour.onTitle(TOUR[near], near); }
    if (tour.t >= tour.length && !holding()) { const done = tour.onDone; tour = null; controls.target.copy(tourPath.look.getPoint(1)); controls.update(); done(); }
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
  const pointers = new Map(); let multi = false, pinch = 0;
  const pinchDistance = () => { const [a, b] = [...pointers.values()]; return b ? Math.hypot(a.lastX - b.lastX, a.lastY - b.lastY) : 0; };
  canvas.addEventListener("pointerdown", (e) => {
    if (!active || tour || hooks.blocked?.()) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: 0 });
    if (pointers.size > 1) { multi = true; pinch = pinchDistance(); }
    if (following) try { canvas.setPointerCapture(e.pointerId); } catch { /* Synthetic pointers have no browser capture. */ }
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.lastX, dy = e.clientY - p.lastY;
    p.lastX = e.clientX; p.lastY = e.clientY; p.moved = Math.max(p.moved, Math.hypot(e.clientX - p.x, e.clientY - p.y));
    if (!following || tour || hooks.blocked?.()) return;
    if (pointers.size > 1) { const next = pinchDistance(); if (next > 3 && pinch > 3) activeRig().zoom(next / pinch); pinch = next; }
    else if (!multi && p.moved >= 7) { const factor = Math.PI * 2 / Math.max(500, canvas.clientWidth); play.orbit(-dx * factor, dy * factor); }
  });
  canvas.addEventListener("wheel", e => {
    if (!active || !following || tour || hooks.blocked?.()) return;
    e.preventDefault(); play.zoom(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });
  function tapAt(clientX, clientY) {
    if (!active || tour || hooks.blocked?.()) return false;
    const b = canvas.getBoundingClientRect(), ray = new THREE.Raycaster(); ray.near = camera.near; ray.far = camera.far;
    ray.setFromCamera(new THREE.Vector2((clientX - b.left) / b.width * 2 - 1, -(clientY - b.top) / b.height * 2 + 1), camera);
    scene.updateMatrixWorld(true); const found = ray.intersectObjects(pickables, false).filter(h => visibleVillagePick(h.object)), editing = hooks.editing?.();
    const h = editing ? found.find(x => ["village-decor", "village-ground"].includes(x.object.userData.type)) : found[0];
    if (!h) return false;
    hooks.onPick?.({ ...h.object.userData, point: { x: h.point.x, z: -h.point.z } }); return true;
  }
  canvas.addEventListener("pointerup", (e) => {
    const p = pointers.get(e.pointerId), tap = active && !tour && p && p.moved < 7 && !multi && e.button === 0 && !hooks.blocked?.(); pointers.delete(e.pointerId); if (!pointers.size) { multi = false; pinch = 0; }
    if (!tap) return;
    tapAt(e.clientX, e.clientY);
  });
  canvas.addEventListener("pointercancel", (e) => { pointers.delete(e.pointerId); if (!pointers.size) { multi = false; pinch = 0; } });

  function placeLights() {
    const t = tour ? focus : controls.target;
    if(expansionWorld.active){const near=[...expansionWorld.lamps].sort((a,b)=>a.distanceToSquared(t)-b.distanceToSquared(t));pool.forEach((l,i)=>{if(near.length){l.position.copy(near[i%near.length]);l.visible=true;l.userData.base=64;l.color.set(i%2?0x8ebacc:0xe7b77f);}else l.visible=false;});}
    else if (inside) { const near = [...inside.lamps].sort((a, b) => a.distanceToSquared(t) - b.distanceToSquared(t)); pool.forEach((l, i) => { const p = near[i % near.length]; l.position.copy(p); l.visible = true; }); }
    else { const near = [...LAMPS_AT].sort((a, b) => Math.hypot(a.x * K - t.x, -a.z * K - t.z) - Math.hypot(b.x * K - t.x, -b.z * K - t.z)); pool.forEach((l, i) => { const lamp = near[i]; l.visible=true; l.position.copy(W(lamp.x * K, lamp.z * K, (lamp.y - .2) * K)); }); }
    sun.target.position.copy(t); sun.position.copy(t).addScaledVector(SUN, 100); sun.target.updateMatrixWorld();
    // Walking, the moon's shadows only matter round the walker: a tighter box draws fewer casters, and sharper.
    const reachShadow = following ? 28 : 44, sc = sun.shadow.camera;
    if (sc.right !== reachShadow) { Object.assign(sc, { left: -reachShadow, right: reachShadow, top: reachShadow, bottom: -reachShadow }); sc.updateProjectionMatrix(); }
    // The moonlight's shadows are redrawn every other frame, as on the farm (handover 40).
    if (++shadowTick % 2 === 0 || tour) sun.shadow.needsUpdate = true;
    if (sky) sky.position.copy(camera.position);
  }
  // Surface visibility and moonlight are borrowed only for a single off-screen map photograph.
  function withMapSurface(fn) {
    const visibility = [], opacity = new Map();
    scene.traverse(o => { visibility.push([o, o.visible]); });
    const background = scene.background, fog = scene.fog, exposure = scene.userData.exposure;
    const lights = [hemi, sun, ...pool].map(l => ({ light: l, intensity: l.intensity, colour: l.color.clone(), ground: l.groundColor?.clone(), position: l.position.clone() }));
    const target = sun.target.position.clone();
    try {
      root.visible = true; root.traverse(o => { if (o.isGroup) o.visible = true; });
      for (const p of patches) p.chunk.visible = true;
      const upper = root.getObjectByName('moth-tree-upper');
      upper?.traverse(o => { o.visible = true; for (const m of [].concat(o.material ?? [])) { if (!opacity.has(m)) opacity.set(m, m.opacity); m.opacity = 1; } });
      for (const g of [sky, horizon, mist, bats?.group, life?.group, grass?.group, atmosphere?.group, blight.group, shopMarkers.group, lampGlow?.group, selection, companion?.root, ...handTools.values()]) if (g) g.visible = false;
      for (const person of folk.people.values()) person.root.visible = false;
      for (const entry of insides.values()) { entry.group.visible = false; if (entry.host) entry.host.root.visible = false; }
      for (const d of decor.values()) d.group.visible = true;
      for (const p of pages.values()) p.group.visible = false;
      // Resources use the current play camera's bounded batch; omit that moving batch from this structural image.
      resources.group.visible = false;
      scene.background = new THREE.Color(0x100c1c); scene.fog = null; scene.userData.exposure = 1.2;
      hemi.intensity = NIGHT.hemi; hemi.color.set(NIGHT.sky); hemi.groundColor.set(NIGHT.ground); sun.intensity = NIGHT.sun;
      sun.target.position.set((REALM.x0 + REALM.x1) * K / 2, 0, -(REALM.z0 + REALM.z1) * K / 2); sun.position.copy(sun.target.position).addScaledVector(SUN, 100);
      for (const l of pool) { l.intensity = 0; l.visible = true; }
      scene.updateMatrixWorld(true);
      return expansionWorld.withMapSurface(fn);
    } finally {
      for (const [o, visible] of visibility) o.visible = visible;
      for (const [m, value] of opacity) m.opacity = value;
      scene.background = background; scene.fog = fog; scene.userData.exposure = exposure;
      for (const s of lights) { s.light.intensity = s.intensity; s.light.color.copy(s.colour); if (s.ground) s.light.groundColor.copy(s.ground); s.light.position.copy(s.position); }
      sun.target.position.copy(target); scene.updateMatrixWorld(true);
    }
  }
  return {
    scene, camera, cameraActions, play, director, folk, sync, resize, preview, groundAt, gatherTool, dialogueCamera, withMapSurface,
    enterExpansionArea(id){dialogueFocus.end({immediate:true});if(inside)goOutside();const entry=expansionWorld.enter(id);if(!entry)return false;setLampNear(0);root.visible=false;for(const p of folk.people.values())p.root.visible=false;resources.group.visible=false;shopMarkers.hide();for(const h of pickables)if(!['expansion-activity','expansion-portal'].includes(h.userData.type))h.visible=false;if(sky)sky.visible=false;sun.intensity=.12;hemi.intensity=1.3;hemi.color.set(0xc6c3dd);hemi.groundColor.set(0x817185);scene.background.set(0x100d19);scene.fog.color.set(0x100d19);scene.userData.exposure=1.2;following=false;return entry;},
    leaveExpansionArea(){const entry=expansionWorld.leave();root.visible=true;if(sky)sky.visible=true;sun.intensity = NIGHT.sun;hemi.intensity = NIGHT.hemi;hemi.color.set(NIGHT.sky);hemi.groundColor.set(NIGHT.ground);scene.background.set(SKY.top);scene.fog.color.set(0x1d1430);scene.userData.exposure=1.15;following=false;lampAs(LAMP);pool.forEach(l=>{l.visible=true;l.color.set(0xff9a40);});sync();return entry;},
    get activeExpansionArea(){return expansionWorld.active;},get expansionTargets(){return [...expansionWorld.targets,...(!expansionWorld.active?[...folk.people].filter(([,p])=>p.root.visible).map(([id])=>({type:'village-folk',id,...folk.spotOf(id)})):[])];},expansionGroundAt:(x,z)=>expansionWorld.ground(x,z),moveExpansionWalker:(from,dx,dz)=>expansionWorld.active?expansionWorld.move(from,dx,dz):moveVillageWalker(state,from,dx,dz),setExpansionCompanion,
    get expansionStats(){return expansionWorld.stats;},
    setCastStyle, get castStyle() { return folk.style; }, spriteReady, spritesReady: spriteReady, spriteTextures: villageSpriteTextures, tapAt,
    goInside, goOutside, canEnterInside, get inside() { return inside?.id ?? null; }, hallPoint, insidePlan: (id) => INSIDES[id],
    enter() { active = true; sync(); resize(); if (firstView) { reset(); firstView = false; } controls.enabled = !tour; },
    leave() { if(expansionWorld.active){expansionWorld.leave();root.visible=true;if(sky)sky.visible=true;sun.intensity = NIGHT.sun;hemi.intensity = NIGHT.hemi;hemi.color.set(NIGHT.sky);hemi.groundColor.set(NIGHT.ground);scene.background.set(SKY.top);scene.fog.color.set(0x1d1430);scene.userData.exposure=1.15;lampAs(LAMP);pool.forEach(l=>{l.visible=true;l.color.set(0xff9a40);});}setExpansionCompanion(null);dialogueFocus.end({ immediate: true }); blight.hide();resources.group.visible=false;shopMarkers.hide(); gatherTool(); active = false; controls.enabled = false; for (const id of pointers.keys()) try { if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id); } catch { /* A finished pointer may already be gone. */ } pointers.clear(); multi = false; pinch = 0; preview(null); following = false; followSubject = null; resetVillageVisibility(villageGreen); tour = null; },
    tick(dt = 0) {
      time += dt; if (!active) return;
      controls.enabled = !following && !tour && !dialogueFocus.active && !hooks.blocked?.() && !hooks.gesture?.busy?.();
      if(companion&&inside)companion.root.visible=false;
      expansionWorld.tick(dt,camera,followSubject);
      for(const d of decor.values())d.group.visible=!expansionWorld.active&&!inside;for(const p of pages.values())p.group.visible=!expansionWorld.active&&!inside;
      if(expansionWorld.active){root.visible=false;for(const p of folk.people.values())p.root.visible=false;}
      tickTour(dt); if (!tour) dialogueFocus.tick(dt);
      if (!tour && !following && !dialogueFocus.active) { framing.step(); controls.update(); }
      const reach = inside||expansionWorld.active ? REACH.inside : following ? REACH.play : REACH.look; scene.fog.density += (reach.fog - scene.fog.density) * Math.min(1, dt * 2);
      for (const p of patches) p.chunk.visible = p.sphere.center.distanceTo(camera.position) - p.sphere.radius < reach.far;
      placeLights(); folk.tick(dt, time, camera, { paused: !!inside || !!tour || !!hooks.residentsPaused?.() || !!state.paused, reducedMotion: reducedMotion() });
      if (lampGlow) { lampGlow.group.visible = !inside && !expansionWorld.active; lampGlow.tick(time, { density: scene.fog.density, still: reducedMotion() }); }
      if (!inside&&!expansionWorld.active) { atmosphere?.tick(dt, { reducedMotion: reducedMotion(), budget: hooks.atmosphereBudget?.() ?? "full" }); tickVillageVisibility(villageGreen, following ? followSubject : null, camera, dt); }
      else resetVillageVisibility(villageGreen);
      inside?.stir?.tick(time, { still: reducedMotion() });
      if (inside?.host?.root.visible) folk.animate(inside.host, dt, time, camera); bats?.tick(time); life?.tick(time, dt, camera, pool); grass?.tick(time, camera, following && !inside&&!expansionWorld.active ? followSubject : null);
      blight.tick(dt, camera.position, !inside&&!expansionWorld.active, reducedMotion(), !!state.paused);
      resources.tick(dt,camera.position,!inside&&!expansionWorld.active);shopMarkers.tick(state.paused?0:dt,camera,!inside&&!expansionWorld.active,reducedMotion());
      town?.userData.tick?.();
      if (mist) for (const m of mist.children) { const u = m.userData; m.position.x = u.x + Math.sin(time * .07 + u.phase) * 2.5; m.position.z = -u.z + Math.cos(time * .05 + u.phase) * 1.5; }
      if(companion&&followSubject&&!inside){const owner={x:followSubject.x,z:-followSubject.z};companionPose=advanceExpansionCompanion(companionPose,owner,dt,{area:expansionWorld.active??'surface',heading:ownerHeading,canRegroup:!companion.root.visible,free:(x,z)=>expansionWorld.active?expansionWorld.move({x,z},0,0)&&caveCellFree(x,z):villageCellFree(state,x,z)});if(companionPose){companion.root.visible=companionPose.visible&&!inside;companion.root.position.copy(W(companionPose.x,companionPose.z,expansionWorld.ground(companionPose.x,companionPose.z)));companion.walking=companionPose.walking;companion.heading={x:companionPose.heading.x,z:-companionPose.heading.z};companion.walkDistance=companionPose.distance;folk.animate(companion,dt,time,camera);}}
      for (const p of pages.values()) { p.group.position.y = .05 + Math.sin(time * 2.3 + p.x) * .04; p.group.rotation.y = Math.sin(time * .9 + p.z) * .5; }
    },
    get active() { return active; },
    get atmosphereStats() { return atmosphere?.stats() ?? null; },
    get blightStats() { return blight.stats; },
    get resourceStats() { return resources.stats; },
    get shopMarkerStats() { return shopMarkers.stats; },
  };
}
