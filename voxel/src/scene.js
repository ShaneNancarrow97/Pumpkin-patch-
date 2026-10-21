import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Voxels, seeded, vary } from "./voxels.js";
import { createSandy } from "./sandy.js";
import { cocoaProp } from "./cocoa-props.js";
import { customerBag, disposeCustomerBag } from "./customer-bag.js";
import { pumpkinTemplate, sproutTemplate, bigPumpkin } from "./pumpkins.js";
import { MAP, PLOTS, BIG_PUMPKIN, SHOP, HOMES, ROUTE_IN, ROUTE_OUT, PITCH, buildWorld, buildBackdrop, signBoard } from "./world.js";
import { buildVisitor, animateWalk } from "./characters.js";
import { loadSprites, spriteCharacter, animateSprite, animateSkyla } from "./sprite-voxels.js";
import { loadSpriteSheets, spriteActor, spriteVisitor, animateVisitor, portraitURL } from "./sprite-actors.js";
import { VARIETIES, VISIT, visitorLeaveSeconds, openPlots, activeLook, counterSide } from "./model.js";
import { createPlaces, ORIGIN } from "./places.js";
import { INTERIOR } from "./interiors.js";
import { loadDecor } from "./decor.js";
import { GRID } from "./model.js";
import { createFestivalWorld } from "./festival-meadow-world.js";
import { fieldWidth, MEADOW, MEADOW_EXIT } from "./content/festival-meadow.js";
import { cameraLayout, farmVerticalLimits } from "./camera-layout.js";
import { createHouseEstateView } from "./house-estate-view.js";
import { buildFarmEstateGate } from "./house-estate-world.js";
import { createHollowFarm } from "./hollow-house-farm.js";
import { createFoyerView } from "./foyer-view.js";

const WALK = 2.4;

function routeLength(route) { let n = 0; for (let i = 1; i < route.length; i++) n += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]); return n; }
function along(route, d) {
  for (let i = 1; i < route.length; i++) {
    const [ax, az] = route[i - 1], [bx, bz] = route[i], step = Math.hypot(bx - ax, bz - az);
    if (d <= step) { const t = step ? d / step : 0; return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx: bx - ax, dz: bz - az }; }
    d -= step;
  }
  const [x, z] = route[route.length - 1]; return { x, z, dx: 0, dz: 1 };
}

export function createScene(canvas, state, hooks) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x150f24);
  scene.fog = new THREE.Fog(0x1a1330, 60, 110);

  // Moonlight from the north-east, lilac and soft; a plum sky fill; warm lamps.
  scene.add(new THREE.HemisphereLight(0x8a7ac8, 0x3a2830, 1.9));
  const moon = new THREE.DirectionalLight(0xd2c6ff, 2.6);
  moon.position.set(34, 32, -14); moon.target.position.set(20, 0, 13);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 24, bottom: -24, near: 1, far: 90 });
  moon.shadow.bias = -0.0008; moon.shadow.normalBias = 0.03;
  scene.add(moon, moon.target);
  // A soft warm fill from the viewer's side, like lantern light, so faces read.
  const fill = new THREE.DirectionalLight(0xffcf9a, 1.2);
  fill.position.set(18, 20, 44); fill.target.position.set(20, 0, 13);
  scene.add(fill, fill.target);

  const world = buildWorld();
  scene.add(world.group);
  for (const l of world.lights) {
    const lamp = new THREE.PointLight(0xffa04a, 9, 7.5, 1.5);
    lamp.position.set(l.x, l.y, l.z);
    scene.add(lamp);
  }
  // The far shore: sky, moon, castle, village and lake.
  scene.add(buildBackdrop(PITCH));

  // Signs.
  const patchSign = signBoard("Pumpkin Patch", "grown with love", 5);
  patchSign.position.set(13.4, 3.2, 8.4); patchSign.userData = { type: "seeds" }; scene.add(patchSign);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x1c1418 }));
  post.position.set(11.4, 2.1, 8.4); post.castShadow = true; scene.add(post);
  const shopSign = signBoard("Skyla’s Shop", "the honest pumpkin", 6);
  shopSign.position.set(SHOP.x, 6.1, SHOP.z - 2.0); shopSign.userData = { type: "shop" }; scene.add(shopSign);

  // The big pumpkin.
  const big = new THREE.Group(), pumpkinTilt = new THREE.Group(), pumpkinArt = bigPumpkin();
  pumpkinArt.position.y = -1.3; pumpkinTilt.position.y = 1.3; pumpkinTilt.rotation.x = -0.24;
  pumpkinTilt.add(pumpkinArt); big.add(pumpkinTilt);
  big.position.set(BIG_PUMPKIN.x, 0.5, BIG_PUMPKIN.z);
  scene.add(big);
  const bigLight = new THREE.PointLight(0xffb36c, 2.2, 7, 1.6);
  bigLight.position.set(BIG_PUMPKIN.x - 1, 3.6, BIG_PUMPKIN.z + 2.6);
  scene.add(bigLight);

  // Plots: mound, sprout, a pumpkin per variety, a glow when ripe, a hit box.
  const pumpkins = VARIETIES.map((_, i) => pumpkinTemplate(i)), sprout = sproutTemplate(), pickables = [patchSign, shopSign];
  // Soft round glow for ripe pumpkins, drawn once.
  const glowCanvas = document.createElement("canvas"); glowCanvas.width = glowCanvas.height = 64;
  const gc = glowCanvas.getContext("2d"), grad = gc.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(1, "rgba(255,255,255,0)");
  gc.fillStyle = grad; gc.fillRect(0, 0, 64, 64);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  const tapHalo = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), new THREE.MeshBasicMaterial({ color: 0xffac59, map: glowTexture, transparent: true, opacity: .13, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  tapHalo.rotation.x = -Math.PI / 2; tapHalo.position.set(BIG_PUMPKIN.x, .51, BIG_PUMPKIN.z); scene.add(tapHalo);
  const plots = PLOTS.map((p, i) => {
    const g = new THREE.Group(); g.position.set(p.x, 0.04, p.z);
    // The bed itself is part of the ground (ground.js); the plot holds what grows in it.
    const sp = sprout.clone(); sp.position.y = 0.18; g.add(sp);
    const pk = pumpkins.map((t) => { const m = t.clone(); m.position.y = 0.18; g.add(m); return m; });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0xffffff, map: glowTexture, transparent: true, opacity: 0.0, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = 0.2; g.add(halo);
    const locked = new Voxels(); for (let k = 0; k < 5; k++) locked.box(-0.6 + k * 0.28, 0.18, -0.1 + (k % 2) * 0.2, 0.18, 0.12, 0.18, 0x3d5a2a);
    const lockedVines = locked.build(); g.add(lockedVines);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.6; hit.userData = { type: "plot", index: i }; g.add(hit); pickables.push(hit);
    scene.add(g);
    return { g, sp, pk, halo, lockedVines };
  });
  const festivalWorld = createFestivalWorld({ scene, state, world, signBoard, createCashier: createSandy });
  const hollowFarm = createHollowFarm(scene, state, signBoard);
  const bigHit = new THREE.Mesh(new THREE.BoxGeometry(4, 3.6, 4), new THREE.MeshBasicMaterial({ visible: false }));
  bigHit.position.set(BIG_PUMPKIN.x, 1.8, BIG_PUMPKIN.z); bigHit.userData = { type: "pumpkin" }; scene.add(bigHit); pickables.push(bigHit);
  const shopHit = new THREE.Mesh(new THREE.BoxGeometry(9, 5, 5.5), new THREE.MeshBasicMaterial({ visible: false }));
  shopHit.position.set(SHOP.x, 2.5, SHOP.z + 0.4); shopHit.userData = { type: "shop" }; scene.add(shopHit); pickables.push(shopHit);
  const homeHit = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 3), new THREE.MeshBasicMaterial({ visible: false }));
  homeHit.position.set(6.5, 2, 7.2); homeHit.userData = { type: "home" }; scene.add(homeHit); pickables.push(homeHit);
  const homesteadArch = new THREE.Mesh(new THREE.BoxGeometry(3.4, 5, 1), new THREE.MeshBasicMaterial({ visible: false })); homesteadArch.position.set(20, 2.5, 3); homesteadArch.userData = { type: "home" }; scene.add(homesteadArch); pickables.push(homesteadArch);
  // The farm now shows the gate. The complete house lives on its own estate.
  const estateGate = buildFarmEstateGate(); estateGate.position.set(6.5, 0, 6.4); scene.add(estateGate);
  const estateSign = signBoard("Home & Garden", "through the lantern gate", 5); estateSign.position.set(6.5, 3.9, 7); estateSign.userData = { type: "home" }; scene.add(estateSign); pickables.push(estateSign);

  // Shane, Natalie, Skyla and the visitors are drawn with the main game's
  // sprites (sprite-actors.js), or, with "Voxel characters" on in Settings,
  // built from voxels (sprite-voxels.js, and the hand-built neighbours in
  // characters.js). Both load in the background.
  let voxelCharacters = false, pixels = null, sheets = null, skyla = null, paying = 0;
  const ready = () => (voxelCharacters ? pixels : sheets);
  // Shane and Natalie wear whatever is on in the wardrobe.
  const character = (who) => {
    if (!ready()) return null;
    const look = who === "skyla" ? undefined : activeLook(state, who), outfit = who === "skyla" ? undefined : state.wardrobe.equipped[who];
    const m = voxelCharacters ? spriteCharacter(pixels, who, look, outfit, sheets) : spriteActor(sheets, who, look, outfit);
    m.userData.kind = who === "skyla" ? "skyla" : "person";
    return m;
  };
  const visitorModel = (kind) => {
    const sprite = !voxelCharacters && sheets !== null, m = sprite ? spriteVisitor(sheets, kind) : buildVisitor(kind);
    if (!sprite) m.traverse((o) => o.isMesh && (o.castShadow = true));
    m.userData.kind = "visitor"; m.userData.sprite = sprite;
    return m;
  };
  // One animation call for any figure, voxel or sprite.
  const animateFigure = (m, t, moving, offset = 0, dx = 0, isPaying = false) => {
    const u = m.userData;
    if (u.kind === "skyla") animateSkyla(m, t, isPaying);
    else if (u.kind === "visitor") (u.sprite ? animateVisitor(m, t, moving, dx) : animateWalk(m, t, moving));
    else animateSprite(m, t, moving, dx, offset);
  };
  function placeSkyla() {
    if (!ready()) return;
    if (skyla) { scene.remove(skyla); skyla.userData.dispose?.(); }
    skyla = character("skyla");
    skyla.position.set(SHOP.x + 1.1, 1.3, SHOP.counterZ - 0.2);
    scene.add(skyla);
  }
  function placeCharacters() {
    placeSkyla(); placeActor("natalie"); placeActor("shane");
    for (const entry of visitorModels.values()) { scene.remove(entry.m); disposeCustomerBag(entry.bag); disposeCustomerBag(entry.cup); disposeCustomerBag(entry.snack); entry.m.userData.dispose?.(); }
    visitorModels.clear();                                                            // rebuilt in the new style next frame
    const inside = places.place;
    if (inside?.kind === "room") places.enterRoom(inside.id);
    else if (inside?.kind === "shop") places.enterShop();
  }
  loadSprites().then((data) => { pixels = data; if (voxelCharacters) placeCharacters(); }).catch(() => hooks.onSpriteError?.());
  // The voxel figures are built from these sheets too, in more detail, once they arrive.
  loadSpriteSheets().then((data) => { sheets = data; if (!voxelCharacters || pixels) placeCharacters(); }).catch(() => hooks.onSpriteError?.());

  // Shane and Natalie.
  const actors = {};
  function placeActor(who) {
    const old = actors[who];
    if (!ready()) return;
    const model = character(who);
    model.position.set(old?.model.position.x ?? HOMES[who].x, 0.04, old?.model.position.z ?? HOMES[who].z);
    if (model.userData.facing) model.scale.x = old?.model.scale.x ?? 1;
    if (old) { scene.remove(old.model); old.model.userData.dispose?.(); }
    const hit = old?.hit ?? new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 1.1), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData = { type: "talk", who };
    if (!old) { scene.add(hit); pickables.push(hit); }
    scene.add(model);
    actors[who] = { model, hit, queue: old?.queue ?? [], moving: false, work: 0, dx: 0 };
  }
  const nearestActor = (x, z) => Object.values(actors).sort((a, b) => (Math.hypot(a.model.position.x - x, a.model.position.z - z) + a.queue.length * 4) - (Math.hypot(b.model.position.x - x, b.model.position.z - z) + b.queue.length * 4))[0];

  // Visitors.
  const visitorModels = new Map(), inLen = routeLength(ROUTE_IN), outLen = routeLength(ROUTE_OUT), meadowOutLen = routeLength(MEADOW_EXIT), COUNTER_GAP = 1;
  const guestHitGeometry = new THREE.BoxGeometry(1.15, 2.2, .9), guestHitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const carriedCup = cocoaProp("cocoa");
  const carried = pumpkins.map((t) => { const m = t.clone(); m.scale.setScalar(0.5); return m; });

  // The cottage's rooms and the shop floor (places.js).
  const places = createPlaces({ scene, state, character, visitorModel, pumpkinTemplate, animate: animateFigure });
  loadDecor().then(() => places.refresh()).catch(() => hooks.onSpriteError?.());

  // Fireflies drifting over the field.
  const flyCount = 70, flyGeo = new THREE.BufferGeometry(), flySeed = seeded(5), flyBase = new Float32Array(flyCount * 3);
  for (let i = 0; i < flyCount; i++) flyBase.set([2 + flySeed() * 36, 0.6 + flySeed() * 2.6, 3 + flySeed() * 21], i * 3);
  flyGeo.setAttribute("position", new THREE.BufferAttribute(flyBase.slice(), 3));
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ color: 0xffe08a, size: 0.12, transparent: true, opacity: 0.9, toneMapped: false }));
  scene.add(flies);

  // Camera: orthographic, looking down at a gentle angle, pannable and zoomable.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  // Indoors: a perspective camera in front of the room, like the main game's room view.
  const roomCam = new THREE.PerspectiveCamera(INTERIOR.fov, 1, 0.1, 200);
  const estateView = createHouseEstateView(canvas, state, { onPick: what => hooks.onPick(what), editing: () => hooks.estateEditing?.(), blocked: () => document.body.classList.contains("menu-open") || !document.getElementById("level-celebration").hidden });
  const foyerView = createFoyerView(canvas, state, { onPick: what => hooks.onPick(what), visitorModel, animate: animateFigure, blocked: () => document.body.classList.contains("menu-open") || !document.getElementById("level-celebration").hidden, decorating: () => hooks.foyerEditing?.(), wallEditing: () => hooks.foyerWallEditing?.() });
  const active = () => view.place === "estate" ? estateView.camera : view.place === "foyer" ? foyerView.camera : view.place ? roomCam : camera;
  const activeScene = () => view.place === "estate" ? estateView.scene : view.place === "foyer" ? foyerView.scene : scene;
  const view = { x: 20, z: 8.4, zoom: 1, place: null };
  let farmView = null;
  let bloomOn = true;
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // The room camera: the nearest distance that shows the top of the back wall and
  // the front of the floor, and the room's width (most of it on a narrow phone).
  const probe = new THREE.PerspectiveCamera(), corner = new THREE.Vector3();
  function frameRoom(w, h) {
    // Wide screens show the whole room; a portrait phone shows the back wall's
    // middle, floor to cornice, and drags along to see the rest.
    // Rooms grow with the house, so the room's own size comes from the place.
    const { w: rw, d: rd } = places.place ?? GRID;
    const o = ORIGIN[view.place], aspect = w / h, p = INTERIOR.pitch, layout = cameraLayout(w);
    const half = 3.5 + (rw / 2 + 0.4 - 3.5) * layout.overview;
    const corners = [[-half, 5.4, 0], [half, 5.4, 0], [-half, -0.1, rd + 0.3], [half, -0.1, rd + 0.3]];
    const target = new THREE.Vector3(o.x + rw / 2 + view.x, 2, o.z + rd * 0.42 + view.z), dir = new THREE.Vector3(0, Math.sin(p), Math.cos(p));
    probe.fov = INTERIOR.fov; probe.aspect = aspect; probe.near = 0.1; probe.far = 200; probe.updateProjectionMatrix();
    const fits = (dist) => {
      probe.position.copy(target).addScaledVector(dir, dist); probe.lookAt(target); probe.updateMatrixWorld();
      for (const [x, y, z] of corners) {
        corner.set(o.x + rw / 2 + x, y, o.z + z).project(probe);
        if (Math.abs(corner.x) > 0.9 || Math.abs(corner.y) > 0.8) return false;
      }
      return true;
    };
    let dist = 6;
    while (dist < 80 && !fits(dist)) dist += 0.25;
    roomCam.fov = INTERIOR.fov; roomCam.aspect = aspect; roomCam.updateProjectionMatrix();
    roomCam.position.copy(target).addScaledVector(dir, dist / view.zoom);
    roomCam.lookAt(target);
    view.roomDist = dist / view.zoom;
  }
  function frame() {
    const w = canvas.clientWidth, h = canvas.clientHeight, aspect = w / h;
    renderPass.camera = active();
    renderPass.scene = activeScene();
    if (view.place === "estate") { estateView.resize(w, h); return; }
    if (view.place === "foyer") { foyerView.resize(); return; }
    if (view.place) { clampView(); frameRoom(w, h); return; }
    // Ease from a phone crop to the whole yard, with room around the edges.
    view.zoom = THREE.MathUtils.clamp(view.zoom, cameraLayout(w).minZoom, 2.6);
    const span = (cameraLayout(w).farmSpan + (fieldWidth(state) - MAP.w) * cameraLayout(w).overview) / view.zoom, halfW = span / 2, halfH = halfW / aspect;
    camera.left = -halfW; camera.right = halfW; camera.top = halfH; camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    clampView();
    const target = new THREE.Vector3(view.x, 0, view.z), dist = 60;
    camera.position.set(target.x, target.y + Math.sin(PITCH) * dist, target.z + Math.cos(PITCH) * dist);
    camera.lookAt(target);
  }
  let firstResize = true, lastOverview = false;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    const overview = cameraLayout(w).overview >= 0.95;
    if (!firstResize && overview && !lastOverview) {
      view.zoom = Math.min(view.zoom, 1);
      if (farmView) farmView.zoom = Math.min(farmView.zoom, 1);
    }
    if (firstResize && w < 600 && !view.place) view.x = 15.5;
    firstResize = false; lastOverview = overview;                                                      // portrait: frame the pumpkin and the patch
    frame();
  }
  window.addEventListener("resize", resize);
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(resize).observe(canvas);
  resize();

  // Input: drag to pan, wheel or pinch to zoom, tap to act.
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(), touches = new Map();
  let drag = null, pinch = null;
  const worldPerPixel = () => (camera.right - camera.left) / canvas.clientWidth;
  canvas.addEventListener("pointerdown", (e) => {
    if (["estate", "foyer"].includes(view.place)) return;
    canvas.setPointerCapture(e.pointerId);
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 1) drag = { x: e.clientX, y: e.clientY, vx: view.x, vz: view.z, moved: 0 };
    if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom, angle: Math.atan2(a.y - b.y, a.x - b.x), rotate: !!view.place && !!hooks.canRotatePiece?.() }; drag = null; }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (["estate", "foyer"].includes(view.place)) return;
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size === 2) { const [a, b] = [...touches.values()];
      if (pinch.rotate) { const angle = Math.atan2(a.y - b.y, a.x - b.x), delta = Math.atan2(Math.sin(angle - pinch.angle), Math.cos(angle - pinch.angle)); pinch.angle = angle; hooks.onRotatePiece?.(delta * 180 / Math.PI); return; }
      view.zoom = THREE.MathUtils.clamp(pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, cameraLayout(canvas.clientWidth).minZoom, 2.6); clampView(); frame(); return; }
    if (!drag) return;
    const k = worldPerPixel(), dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (view.place) {
      // Indoors, dragging slides along the room and in and out a little.
      const kr = (2 * view.roomDist * Math.tan(THREE.MathUtils.degToRad(INTERIOR.fov) / 2)) / canvas.clientHeight;
      view.x = drag.vx - dx * kr; view.z = drag.vz - dy * kr;
    } else { view.x = drag.vx - dx * k; view.z = drag.vz - dy * k / Math.sin(PITCH); }
    clampView(); frame();
  });
  let lastPick = null;
  const end = (e) => {
    if (["estate", "foyer"].includes(view.place)) return;
    const wasTap = drag && drag.moved < 8 && touches.size === 1;
    touches.delete(e.pointerId);
    if (touches.size < 2) { if (pinch?.rotate) hooks.onRotateEnd?.(); pinch = null; }
    if (wasTap) {
      const box = canvas.getBoundingClientRect();
      pointer.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
      ray.setFromCamera(pointer, active());
      scene.updateMatrixWorld(true);
      const hits = ray.intersectObjects(view.place ? places.pickables : [...pickables, ...festivalWorld.pickables, ...hollowFarm.pickables, ...[...visitorModels.values()].filter(e => e.m.visible).map(e => e.hit)], false);
      // A visible guest at a counter takes priority over its large building hit box.
      const hit = hits.find(h => ["visitor", "customer"].includes(h.object.userData.type)) ?? hits[0];
      lastPick = hit ? { ...hit.object.userData } : null;
      if (hit) hooks.onPick({ ...hit.object.userData, point: hit.point });
    }
    drag = null;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", (e) => { touches.delete(e.pointerId); drag = null; if (pinch?.rotate) hooks.onRotateEnd?.(); pinch = null; });
  canvas.addEventListener("wheel", (e) => { if (["estate", "foyer"].includes(view.place)) return; e.preventDefault(); view.zoom = THREE.MathUtils.clamp(view.zoom * (e.deltaY < 0 ? 1.1 : 0.9), cameraLayout(canvas.clientWidth).minZoom, 2.6); clampView(); frame(); }, { passive: false });
  // Keep the fence at or below the bottom edge (a tall phone shows the sky and
  // hills above instead of empty ground below), and the map's sides in view.
  function clampView() {
    if (view.place) {
      // Offsets from the room's centre: a little way along it, and in or out.
      const rw = places.place?.w ?? GRID.w, along = cameraLayout(canvas.clientWidth).overview < .95 ? rw / 2 - 2.8 : 1.5;
      view.x = THREE.MathUtils.clamp(view.x, -along, along);
      view.z = THREE.MathUtils.clamp(view.z, -1.2, 1.2);
      view.zoom = THREE.MathUtils.clamp(view.zoom, cameraLayout(canvas.clientWidth).roomMinZoom, 1.9);
      return;
    }
    const halfW = camera.right, vertical = farmVerticalLimits(camera.top, PITCH, MAP.d);
    const maxX = fieldWidth(state) + 1 - halfW, minX = halfW - 1;
    view.z = THREE.MathUtils.clamp(view.z, vertical.min, vertical.max);
    view.x = minX > maxX ? fieldWidth(state) / 2 : THREE.MathUtils.clamp(view.x, minX, maxX);
  }

  // Floating "+£12" and sparkle effects, as DOM labels projected from the world.
  const fx = [];
  function floatText(text, x, y, z, cls = "") {
    const el = document.createElement("div");
    el.className = "float-text " + cls; el.textContent = text;
    document.getElementById("fx").append(el);
    fx.push({ el, scene: view.place, pos: new THREE.Vector3(x, y, z), t: 0, life: cls === "speech" ? 1.8 : 1.2 });
  }
  const project = (p) => { const v = p.clone().project(active()); return { x: (v.x + 1) / 2 * canvas.clientWidth, y: (1 - v.y) / 2 * canvas.clientHeight }; };

  let tapPulse = 0, last = performance.now(), time = 0, nextSpeechAt = 0;
  function tick(now) {
    // The first frame's timestamp can come before the scene finished building, and
    // a negative time would pick a walk frame that doesn't exist.
    const dt = THREE.MathUtils.clamp((now - last) / 1000, 0, 0.1); last = now; time += dt;
    hooks.onTick(dt);

    // Plots.
    plots.forEach((p, i) => {
      const plot = state.plots[i], open = i < openPlots(state);
      p.lockedVines.visible = !open; p.sp.visible = false; p.pk.forEach((m) => (m.visible = false)); p.halo.material.opacity = 0;
      if (!open || plot.phase === "empty") return;
      if (plot.phase === "growing" && plot.progress < 0.3) { p.sp.visible = true; p.sp.scale.setScalar(0.6 + plot.progress * 2); return; }
      const m = p.pk[plot.variety]; m.visible = true;
      const s = plot.phase === "ready" ? 1 : 0.35 + plot.progress * 0.6;
      m.scale.setScalar(s);
      if (plot.phase === "ready") {
        m.position.y = 0.18 + Math.abs(Math.sin(time * 2 + i)) * 0.05;
        p.halo.material.color.setHex(VARIETIES[plot.variety].glow);
        p.halo.material.opacity = 0.35 + Math.sin(time * 3 + i) * 0.12;
      }
    });

    // Big pumpkin: breathing glow, squash on tap.
    tapPulse = Math.max(0, tapPulse - dt * 4);
    big.scale.set(1 + tapPulse * 0.08, 1 - tapPulse * 0.1, 1 + tapPulse * 0.08);
    bigLight.intensity = 2.2 + Math.sin(time * 1.8) * .2 + tapPulse * 1.6;
    tapHalo.material.opacity = .13 + Math.sin(time * 1.8) * .025 + tapPulse * .12;
    pumpkinTilt.rotation.x = -0.24 - tapPulse * .06;

    // Shane and Natalie walk to their jobs, then drift home.
    for (const [who, a] of Object.entries(actors)) {
      const pos = a.model.position;
      let target = a.queue[0] ?? HOMES[who];
      const dx = target.x - pos.x, dz = target.z - pos.z, d = Math.hypot(dx, dz);
      a.moving = d > 0.12 && a.work <= 0;
      if (a.work > 0) a.work -= dt;
      else if (d > 0.12) { const step = Math.min(d, WALK * dt); pos.x += dx / d * step; pos.z += dz / d * step; }
      else if (a.queue.length) { a.queue.shift(); a.work = 0.5; }
      // Like the sprites they come from, they always face the viewer (the voxel figures mirror to walk the other way).
      animateSprite(a.model, time, a.moving, dx, who === "shane" ? 1.7 : 0);
      a.hit.position.set(pos.x, 1.1, pos.z);
    }

    festivalWorld.tick(time);
    hollowFarm.sync();

    // Visitors along the stone path.
    for (const v of state.visitors) {
      let entry = visitorModels.get(v.id);
      if (!entry) { const m = visitorModel(v.kind), hit = new THREE.Mesh(guestHitGeometry, guestHitMaterial); hit.position.y = 1.1; hit.userData = { type: "visitor", id: v.id }; m.add(hit); scene.add(m); entry = { m, hit, sprite: m.userData.sprite, bag: null }; visitorModels.set(v.id, entry); }
      const hollowJourney = v.hollow && !v.hollow.done;
      entry.m.visible = !hollowJourney || ["approach", "door-wait", "to-shop"].includes(v.hollow.phase);
      if (!entry.m.visible) continue;
      const leaving = v.leaveAt !== null && v.age >= v.leaveAt;
      const t = leaving ? (v.age - v.leaveAt) / visitorLeaveSeconds(state) : Math.min(1, v.age / VISIT.arrive);
      const excursion = hollowJourney || v.festival && !v.festival.done;
      const journey = hollowJourney ? v.hollow : v.festival;
      const p = excursion ? journey : leaving ? along(state.festival.meadow ? MEADOW_EXIT : ROUTE_OUT, t * (state.festival.meadow ? meadowOutLen : outLen)) : along(ROUTE_IN, t * inLen);
      // Parties stand side by side along the counter: each fans out to its own
      // place over the last stretch of the path, and back in as it sets off home.
      const fan = excursion ? 0 : leaving ? Math.max(0, 1 - t * 4) : Math.max(0, (t - 0.8) / 0.2);
      entry.m.position.set(p.x + counterSide(v.spot ?? 0) * COUNTER_GAP * fan, 0.04, p.z);
      const walking = excursion ? journey.walking : leaving || v.age < VISIT.arrive;
      if (entry.sprite) animateVisitor(entry.m, excursion ? time + v.id : v.age, walking, p.dx / (Math.hypot(p.dx, p.dz) || 1));
      else {
        entry.m.rotation.y = walking ? Math.atan2(p.dx, p.dz) : Math.PI;              // at the counter they face Skyla
        animateWalk(entry.m, time + v.id, walking);
      }
      if (v.cocoaSpend && v.cocoaKind !== null && !entry.cup) {
        entry.cup = v.cocoaKind === "deluxe" ? cocoaProp("deluxe") : carriedCup.clone(); entry.cup.position.set(-.4, .9, .25); entry.m.add(entry.cup);
      }
      if (v.snack && !entry.snack) { entry.snack = cocoaProp("smores"); entry.snack.position.set(.4, .9, .25); entry.m.add(entry.snack); }
      if (v.bought !== null && !entry.bag) { entry.bag = state.customerCare.bags && v.quantity > 1 ? customerBag() : carried[v.bought].clone(); entry.bag.position.set(entry.sprite ? 0.36 : 0.45, entry.sprite ? 0.45 : 0.6, entry.sprite ? 0.3 : 0.2); entry.m.add(entry.bag); }
    }
    for (const [id, entry] of visitorModels) if (!state.visitors.some((v) => v.id === id)) { scene.remove(entry.m); disposeCustomerBag(entry.bag); disposeCustomerBag(entry.cup); disposeCustomerBag(entry.snack); entry.m.userData.dispose?.(); visitorModels.delete(id); }

    // Fireflies.
    const fp = flies.geometry.attributes.position;
    for (let i = 0; i < flyCount; i++) {
      fp.array[i * 3] = flyBase[i * 3] + Math.sin(time * 0.6 + i) * 0.6;
      fp.array[i * 3 + 1] = flyBase[i * 3 + 1] + Math.sin(time * 1.3 + i * 2) * 0.25;
      fp.array[i * 3 + 2] = flyBase[i * 3 + 2] + Math.cos(time * 0.5 + i) * 0.6;
    }
    fp.needsUpdate = true;
    flies.material.opacity = 0.6 + Math.sin(time * 4) * 0.3;
    paying = Math.max(0, paying - dt);
    if (skyla) animateSkyla(skyla, time, paying > 0);
    places.tick(dt, time, paying > 0);
    estateView.tick();
    foyerView.tick(dt, time);

    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt; f.el.hidden = f.scene !== view.place;
      const s = project(f.pos.clone().setY(f.pos.y + f.t * (f.life > 2 ? 0.4 : 1.2)));
      f.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`;
      f.el.style.opacity = String(Math.max(0, 1 - f.t / f.life));
      if (f.t > f.life) { f.el.remove(); fx.splice(i, 1); }
    }

    if (bloomOn) composer.render(); else renderer.render(activeScene(), active());
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return {
    sendTo(plotIndex) { const p = PLOTS[plotIndex], a = nearestActor(p.x, p.z); a?.queue.push({ x: p.x - 0.9, z: p.z + 0.4 }); },
    tapPumpkin() { tapPulse = 1; floatText("✦", BIG_PUMPKIN.x, 3.6, BIG_PUMPKIN.z, "spark"); },
    // A sale: Skyla reacts, and the takings float up from whichever counter you can see.
    sale(amount, route) {
      paying = 1.2;
      if (route === "hollow-ticket") { if (view.place === "foyer") floatText("+£" + amount, -2, 2, 0, "coin"); else if (!view.place) floatText("+£" + amount, 47, 2.8, 14.6, "coin"); return; }
      if (route === "festival-cocoa" && !view.place) { floatText("+£" + amount, MEADOW.counter[0], 2.2, MEADOW.counter[1], "coin"); return; }
      if (route === "shop" && view.place === "shop") floatText("+£" + amount, ORIGIN.shop.x + 7.6, 2.6, ORIGIN.shop.z + 2.6, "coin");
      else if (!view.place) floatText("+£" + amount, SHOP.x - 0.2, 2.6, SHOP.counterZ + 0.6, "coin");
    },
    harvested(i, n = 1) { if (!view.place) { const p = PLOTS[i]; floatText("+" + n, p.x, 1.4, p.z, "crop"); } },
    // A visitor's remark at the stall, and other words floating up from the farm.
    say(text) { if (!view.place && time >= nextSpeechAt && !document.body.classList.contains("menu-open") && !fx.some(f => f.el.classList.contains("speech"))) { nextSpeechAt = time + 9; floatText(text, SHOP.x - 2.4, 3.6, SHOP.counterZ + 1.8, "speech"); } },
    float(text, at, cls = "") { if (!view.place) floatText(text, at.x, 2, at.z, cls); },
    portrait(id) { return sheets && id ? portraitURL(sheets, id) : null; },
    refreshLooks() { placeActor("natalie"); placeActor("shane"); places.refresh(); },
    // Stepping inside: a room of the cottage, or the shop floor. leavePlace() comes back out.
    enter(kind, id) {
      if (!view.place) farmView = { x: view.x, z: view.z, zoom: view.zoom };
      if (view.place === "estate") estateView.leave();
      if (view.place === "foyer") foyerView.leave();
      view.place = kind;
      if (kind === "estate") { places.leave(); estateView.enter(); }
      else if (kind === "foyer") { places.leave(); foyerView.enter(); }
      else if (kind === "room") places.enterRoom(id); else places.enterShop();
      Object.assign(view, { x: 0, z: 0, zoom: 1 });
      frame();
    },
    leavePlace() {
      if (!view.place) return;
      if (view.place === "estate") estateView.leave();
      if (view.place === "foyer") foyerView.leave();
      places.leave();
      view.place = null;
      Object.assign(view, farmView ?? { x: 20, z: 8.4, zoom: 1 });
      frame();
    },
    get place() { return view.place === "estate" ? { kind: "estate", id: "garden" } : view.place === "foyer" ? { kind: "foyer", id: "hollow" } : places.place; },
    get lastPick() { return lastPick; },
    get festivalStatus() { return festivalWorld.status; },
    get cameraFraming() { return { zoom: view.zoom, x: view.x, z: view.z, span: camera.right - camera.left, roomDistance: view.roomDist, overview: cameraLayout(canvas.clientWidth).overview, width: canvas.clientWidth, height: canvas.clientHeight }; },
    fitView() {
      if (view.place === "estate") { estateView.cameraActions.reset(); return; }
      if (view.place === "foyer") { foyerView.cameraActions.reset(); return; }
      Object.assign(view, { x: view.place ? 0 : cameraLayout(canvas.clientWidth).overview >= .95 ? fieldWidth(state) / 2 : 15.5, z: view.place ? 0 : 8.4, zoom: 1 });
      frame();
    },
    refreshRoom() { places.refresh(); },
    refreshEstate() { festivalWorld.sync(); frame(); },
    refreshHouseEstate() { if (view.place === "estate") estateView.sync(); },
    previewEstateDecor(data) { estateView.preview(data); },
    get estateCamera() { return estateView.cameraActions; },
    get estateStatus() { return estateView.status; },
    refreshHollow() { hollowFarm.sync(); },
    refreshFoyer() { if (view.place === "foyer") foyerView.sync(); },
    previewFoyerDecor(data) { foyerView.preview(data); },
    speakMortimer() { foyerView.speak(true); },
    get foyerCamera() { return foyerView.cameraActions; },
    get foyerStatus() { return foyerView.status; },
    selectPiece(instance) { places.select(instance); },
    previewPiece(instance, x, z, ok) { places.preview(instance, x, z, ok); },
    showGrid(on) { places.setGrid(on); },
    cellAt(point, type, wall) { return places.cellAt(point, type, wall); },
    rotatePiece(instance) { places.rotatePiece(instance); },
    screenPoint(x, y, z) { return project(new THREE.Vector3(x, y, z)); },
    // Just above their heads: they lean back so they stand 2.3 tall on screen, which a point straight up from the feet reaches at 2.3 / cos(PITCH).
    actorPosition(who) { const p = actors[who]?.model.position ?? new THREE.Vector3(HOMES[who].x, 0, HOMES[who].z); return project(new THREE.Vector3(p.x, 2.5 / Math.cos(PITCH), p.z)); },
    focus(x, z, zoom = view.zoom) { view.x = x; view.z = z; view.zoom = zoom; frame(); },          // frame() clamps once the new zoom is in
    setBloom(on) { bloomOn = on; },
    setVoxelCharacters(on) { if (on !== voxelCharacters) { voxelCharacters = on; placeCharacters(); } },
    get characterStyle() { return skyla ? (voxelCharacters ? "voxels" : "sprites") : "loading"; },
    setShadows(on) { renderer.shadowMap.enabled = on; for (const viewScene of [scene, estateView.scene, foyerView.scene]) viewScene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); },
    renderer,
  };
}
