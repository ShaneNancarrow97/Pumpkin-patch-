import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { renderSizing, validRenderQuality } from "./render-quality.js";
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
import { HOLLOW_PROPERTY } from "./content/hollow-house.js";
import { createFarmExpansion } from "./farm-expansion-world.js";
import { fieldDepth, extendFarmRoute, DROP, patchShape, COUNTER_GAP } from "./content/farm-layout.js";
import { createHollowFarm } from "./hollow-house-farm.js";
import { createMazeRideView } from "./maze-ride-view.js";
import { createFoyerView } from "./foyer-view.js";
import { createAmbience } from "./ambience.js";
import { mistClearings } from "./content/ambience.js";

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
  // Foldables get the same detail as other high-density displays. A pixel
  // budget protects large viewports; a lower quality is an explicit choice.
  const touchDevice = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  let renderQuality = "sharp";
  renderer.setPixelRatio(renderSizing(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio, renderQuality).pixelRatio);
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
  moon.shadow.mapSize.set(touchDevice ? 1024 : 2048, touchDevice ? 1024 : 2048);
  Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 27, bottom: -27, near: 1, far: 90 });
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
  // The far shore: sky, moon, castle, village and lake, with the mist drifting
  // over the farm and the lake and its lights alive (ambience.js).
  const backdrop = buildBackdrop(PITCH), ambience = createAmbience(scene, backdrop);
  // The mist thins over the pumpkins and clears round the buildings, wherever the field has grown to.
  const clearMist = () => ambience.setClearings(mistClearings({ patch: patchShape(state.upgrades.plots), shop: SHOP, bigPumpkin: BIG_PUMPKIN, hollow: HOLLOW_PROPERTY, meadow: state.festival?.meadow ? MEADOW : null }));
  clearMist();
  scene.add(backdrop);

  // Signs.
  const patchSign = signBoard("Pumpkin Patch", "grown with love", 5);
  patchSign.position.set(13.4, 3.2, 8.4); patchSign.userData = { type: "seeds" }; scene.add(patchSign);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x1c1418 }));
  post.position.set(11.4, 2.1, 8.4); post.castShadow = true; scene.add(post);
  const shopSign = signBoard("Skyla’s Shop", "the honest pumpkin", 4.4);   // between the gable's moon windows
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
  const farmExpansion = createFarmExpansion(scene, state, world);
  const hollowFarm = createHollowFarm(scene, state, signBoard);
  const bigHit = new THREE.Mesh(new THREE.BoxGeometry(4, 3.6, 4), new THREE.MeshBasicMaterial({ visible: false }));
  bigHit.position.set(BIG_PUMPKIN.x, 1.8, BIG_PUMPKIN.z); bigHit.userData = { type: "pumpkin" }; scene.add(bigHit); pickables.push(bigHit);
  const shopHit = new THREE.Mesh(new THREE.BoxGeometry(9, 5, 5.5), new THREE.MeshBasicMaterial({ visible: false }));
  shopHit.position.set(SHOP.x, 2.5, SHOP.z + 0.4); shopHit.userData = { type: "shop" }; scene.add(shopHit); pickables.push(shopHit);
  const homesteadArch = new THREE.Mesh(new THREE.BoxGeometry(3.4, 5, 1), new THREE.MeshBasicMaterial({ visible: false })); homesteadArch.position.set(20, 2.5, 3); homesteadArch.userData = { type: "home" }; scene.add(homesteadArch); pickables.push(homesteadArch);
  const estateSign = signBoard("Shane & Natalie", "home through the hedge arch", 4.8); estateSign.position.set(20, 4.7, 3.4); estateSign.userData = { type: "home" }; scene.add(estateSign); pickables.push(estateSign);


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
    const sprite = sheets !== null && (!voxelCharacters || kind >= 5), m = sprite ? spriteVisitor(sheets, kind) : buildVisitor(kind % 5);
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
  const visitorModels = new Map(), outLen = routeLength(ROUTE_OUT), meadowOutLen = routeLength(MEADOW_EXIT);
  const guestHitGeometry = new THREE.BoxGeometry(1.15, 2.2, .9), guestHitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const carriedCup = cocoaProp("cocoa");
  const carried = pumpkins.map((t) => { const m = t.clone(); m.scale.setScalar(0.5); return m; });

  // The cottage's rooms and the shop floor (places.js).
  const places = createPlaces({ scene, state, character, visitorModel, pumpkinTemplate, animate: animateFigure });
  loadDecor().then(() => places.refresh()).catch(() => hooks.onSpriteError?.());

  // Fireflies drifting over the field.
  const flyCount = 70, flyGeo = new THREE.BufferGeometry(), flySeed = seeded(5), flyBase = new Float32Array(flyCount * 3);
  for (let i = 0; i < flyCount; i++) flyBase.set([2 + flySeed() * 36, 0.6 + flySeed() * 2.6, 3 + flySeed() * (21 + DROP)], i * 3);
  flyGeo.setAttribute("position", new THREE.BufferAttribute(flyBase.slice(), 3));
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ color: 0xffe08a, size: 0.12, transparent: true, opacity: 0.9, toneMapped: false }));
  scene.add(flies);

  // Camera: orthographic, looking down at a gentle angle, pannable and zoomable.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  // Indoors: a perspective camera in front of the room, like the main game's room view.
  const roomCam = new THREE.PerspectiveCamera(INTERIOR.fov, 1, 0.1, 200);
  const estateView = createHouseEstateView(canvas, state, { onPick: what => hooks.onPick(what), editing: () => hooks.estateEditing?.(), blocked: () => document.body.classList.contains("menu-open") || !document.getElementById("level-celebration").hidden });
  const foyerView = createFoyerView(canvas, state, { onPick: what => hooks.onPick(what), visitorModel, animate: animateFigure, blocked: () => document.body.classList.contains("menu-open") || !document.getElementById("level-celebration").hidden, decorating: () => hooks.foyerEditing?.(), wallEditing: () => hooks.foyerWallEditing?.(), gesture: hooks.foyerGesture });
  const mazeView = createMazeRideView(canvas, state, { onCue: cue => hooks.onMazeCue?.(cue), onComplete: status => hooks.onMazeComplete?.(status), onState: status => hooks.onMazeState?.(status), blocked: () => document.body.classList.contains("menu-open") });
  const active = () => view.place === "maze" ? mazeView.camera : view.place === "estate" ? estateView.camera : view.place === "foyer" ? foyerView.camera : view.place ? roomCam : camera;
  const activeScene = () => view.place === "maze" ? mazeView.scene : view.place === "estate" ? estateView.scene : view.place === "foyer" ? foyerView.scene : scene;
  const view = { x: (fieldWidth(state) + HOLLOW_PROPERTY.westEdge) / 2, z: 8.4, zoom: 1, place: null, reach: { x: 0, z: 0 } };
  let farmView = null;
  let bloomOn = true;
  const composer = new EffectComposer(renderer);
  // The scene buffer must match the canvas. Bloom already downsamples its
  // own blur chain; shrinking the composer makes every object look soft.
  let postprocessRatio = renderer.getPixelRatio();
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  // Canvas MSAA does not apply to offscreen composer targets. FXAA smooths
  // their edges after tone mapping without allocating multisample HDR buffers,
  // but it also softens the sprites' painted detail. At FXAA_BELOW device
  // pixels per CSS pixel and above, the buffer is dense enough without it.
  const antialias = new ShaderPass(FXAAShader), FXAA_BELOW = 1.75; composer.addPass(antialias);

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

  // The selected piece stays clear of the piece bar (home-sheets.js). When the bar or
  // the canvas's edge hides it, the room camera eases along and in or out just far
  // enough to show it, once nothing is pressing on the canvas. A piece already in
  // view leaves the camera where the player put it.
  let kept = null, aimNext = false, glide = null;
  // How far the room camera may slide along the room either way: a phone drags along the wall.
  const roomAlong = () => cameraLayout(canvas.clientWidth).overview < .95 ? (places.place?.w ?? GRID.w) / 2 - 2.8 : 1.5;
  const seen = new THREE.Vector3();
  // Where a box lands on the canvas, in pixels, with the room camera at (x, z).
  function boxOnCanvas(box, x, z) {
    view.x = x; view.z = z; frameRoom(canvas.clientWidth, canvas.clientHeight); roomCam.updateMatrixWorld();
    const r = { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity };
    for (let i = 0; i < 8; i++) {
      seen.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(roomCam);
      const sx = (seen.x + 1) / 2 * canvas.clientWidth, sy = (1 - seen.y) / 2 * canvas.clientHeight;
      r.l = Math.min(r.l, sx); r.r = Math.max(r.r, sx); r.t = Math.min(r.t, sy); r.b = Math.max(r.b, sy);
    }
    return r;
  }
  // Where the camera should go to show the kept piece, or null when it already shows.
  function aimAtPiece() {
    const box = places.pieceBox(kept.instance), c = canvas.getBoundingClientRect(), u = kept.bar.getBoundingClientRect();
    if (!box || !u.height) return null;
    const W = c.width, H = c.height, x0 = view.x, z0 = view.z, along = roomAlong(), GAP = 32;
    // The bar on the canvas. The room clears it upwards when the most free canvas is
    // above it (a phone, the Fold), or sideways when that is beside it (a landscape phone).
    const bar = { l: u.left - c.left, r: u.right - c.left, t: u.top - c.top, b: u.bottom - c.top }, low = bar.t * W >= bar.l * H;
    const under = (r, m) => r.r > bar.l - m && r.l < bar.r + m && r.b > bar.t - m && r.t < bar.b + m;
    let r = boxOnCanvas(box, x0, z0), x = x0, z = z0;
    // Clear by a little already (its ring reaches past its box): leave the camera be.
    if (!under(r, 8) && r.l >= 8 && r.r <= W - 8 && r.t >= 8 && r.b <= H - 8) { boxOnCanvas(box, x0, z0); return null; }
    // Each edge rises or slides left as the camera moves out or along: find where it meets its line.
    const meet = (at, edge, line, a, b) => { for (let i = 0; i < 12; i++) { const v = (a + b) / 2; if (at(v)[edge] > line) a = v; else b = v; } return (a + b) / 2; };
    const atZ = v => boxOnCanvas(box, x0, v), atX = v => boxOnCanvas(box, v, z);
    // Up clear of a low bar, backing out past the usual limit (by up to the room's depth)
    // so the front row can; or down from the top, keeping the base in view.
    const bottom = (low && r.r > bar.l && r.l < bar.r ? bar.t : H) - GAP;
    if (r.b > bottom) z = meet(atZ, "b", bottom, z0, Math.max(z0, low ? 1.2 + places.place.d : 1.2));
    else if (r.t < GAP) z = Math.max(meet(atZ, "t", GAP, -1.2, z0), meet(atZ, "b", bottom, -1.2, z0));
    // Then along, clear of the canvas's sides and a bar down the side (sliding past
    // the usual limit, by up to half the room, so the far side can).
    r = boxOnCanvas(box, x0, z);
    const right = (low ? W : bar.l) - GAP, far = low ? along : along + places.place.w / 2;
    if (r.l < GAP) x = meet(atX, "l", GAP, Math.min(x0, -far), x0);
    else if (r.r > right) x = meet(atX, "r", right, x0, Math.max(x0, far));
    boxOnCanvas(box, x0, z0);
    return Math.abs(x - x0) + Math.abs(z - z0) > 0.01 ? { x, z } : null;
  }
  function frame() {
    const w = canvas.clientWidth, h = canvas.clientHeight, aspect = w / h;
    renderPass.camera = active();
    renderPass.scene = activeScene();
    renderer.toneMappingExposure = view.place === "maze" ? 1.3 : 1.45;
    if (view.place === "maze") { mazeView.resize(); return; }
    if (view.place === "estate") { estateView.resize(w, h); return; }
    if (view.place === "foyer") { foyerView.resize(); return; }
    if (view.place) { clampView(); frameRoom(w, h); return; }
    // Ease from a phone crop to the whole yard, with room around the edges.
    view.zoom = THREE.MathUtils.clamp(view.zoom, cameraLayout(w).minZoom, cameraLayout(w).maxZoom);
    const span = (cameraLayout(w).farmSpan + (fieldWidth(state) - MAP.w - HOLLOW_PROPERTY.westEdge + (fieldDepth(state) - MAP.d) * .8) * cameraLayout(w).overview) / view.zoom, halfW = span / 2, halfH = halfW / aspect;
    camera.left = -halfW; camera.right = halfW; camera.top = halfH; camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    clampView();
    const target = new THREE.Vector3(view.x, 0, view.z), dist = 60;
    camera.position.set(target.x, target.y + Math.sin(PITCH) * dist, target.z + Math.cos(PITCH) * dist);
    camera.lookAt(target);
  }
  let firstResize = true, lastOverview = false;
  function resize() {
    const sizing = renderSizing(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio, renderQuality), w = sizing.width, h = sizing.height;
    if (renderer.getPixelRatio() !== sizing.pixelRatio) renderer.setPixelRatio(sizing.pixelRatio);
    renderer.setSize(w, h, false);
    if (postprocessRatio !== sizing.pixelRatio) { composer.setPixelRatio(sizing.pixelRatio); postprocessRatio = sizing.pixelRatio; }
    composer.setSize(w, h);
    antialias.uniforms.resolution.value.set(1 / sizing.bufferWidth, 1 / sizing.bufferHeight); antialias.enabled = sizing.pixelRatio < FXAA_BELOW;
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
  let drag = null, pinch = null, pieceDrag = null;
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), floorPoint = new THREE.Vector3();
  function inputRay(e) {
    const box = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
    ray.setFromCamera(pointer, active());
  }
  // Where the pointer meets the plane the selected piece stands on: the floor, or the top of a table.
  const piecePoint = e => { inputRay(e); floorPlane.constant = -places.standHeight(hooks.selectedPiece?.()); return ray.ray.intersectPlane(floorPlane, floorPoint) ? { x: floorPoint.x - ORIGIN.room.x, y: floorPoint.y, z: floorPoint.z - ORIGIN.room.z } : null; };
  const worldPerPixel = () => (camera.right - camera.left) / canvas.clientWidth;
  canvas.addEventListener("pointerdown", (e) => {
    if (["estate", "foyer", "maze"].includes(view.place) || e.pointerType === "mouse" && e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId); glide = null;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 1) {
      drag = { x: e.clientX, y: e.clientY, vx: view.x, vz: view.z, moved: 0 };
      if (view.place === "room" && hooks.canDragPiece?.()) {
        inputRay(e); scene.updateMatrixWorld(true);
        const selected = hooks.selectedPiece?.(), hit = ray.intersectObjects(places.pickables, false).find(h => h.object.userData.type === "piece" && h.object.userData.instance === selected);
        const point = hit && piecePoint(e);
        if (point && hooks.onPieceDragStart?.(point)) pieceDrag = e.pointerId;
      }
    }
    if (touches.size === 2) {
      // A second finger turns the selected object; it never turns its release
      // into another pick, and one-finger dragging never moves the camera.
      if (pieceDrag !== null) { hooks.onPieceDragEnd?.(false); pieceDrag = null; }
      const [a, b] = [...touches.values()]; pinch = { d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: view.zoom, angle: Math.atan2(a.y - b.y, a.x - b.x), rotate: !!view.place && !!hooks.canRotatePiece?.() }; drag = null;
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (["estate", "foyer", "maze"].includes(view.place)) return;
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size === 2) { const [a, b] = [...touches.values()];
      if (pinch.rotate) { const angle = Math.atan2(a.y - b.y, a.x - b.x), delta = Math.atan2(Math.sin(angle - pinch.angle), Math.cos(angle - pinch.angle)); pinch.angle = angle; hooks.onRotatePiece?.(delta * 180 / Math.PI); return; }
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < 1) return; // Coincident touch starts are not a meaningful zoom.
      view.zoom = THREE.MathUtils.clamp(pinch.zoom * distance / pinch.d, cameraLayout(canvas.clientWidth).minZoom, cameraLayout(canvas.clientWidth).maxZoom); clampView(); frame(); return; }
    if (!drag) return;
    const k = worldPerPixel(), dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (pieceDrag === e.pointerId) { if (drag.moved >= 4) { const point = piecePoint(e); if (point) hooks.onPieceDragMove?.(point); } return; }
    if (view.place) {
      // Indoors, dragging slides along the room and in and out a little.
      const kr = (2 * view.roomDist * Math.tan(THREE.MathUtils.degToRad(INTERIOR.fov) / 2)) / canvas.clientHeight;
      view.x = drag.vx - dx * kr; view.z = drag.vz - dy * kr;
    } else { view.x = drag.vx - dx * k; view.z = drag.vz - dy * k / Math.sin(PITCH); }
    clampView(); frame();
  });
  let lastPick = null;
  const end = (e) => {
    if (["estate", "foyer", "maze"].includes(view.place) || !touches.has(e.pointerId)) return;
    const wasPieceDrag = pieceDrag === e.pointerId;
    const wasTap = !wasPieceDrag && drag && drag.moved < 8 && touches.size === 1 && (e.pointerType !== "mouse" || e.button === 0);
    if (wasPieceDrag) { hooks.onPieceDragEnd?.(false); pieceDrag = null; }
    touches.delete(e.pointerId);
    if (touches.size < 2) { if (pinch?.rotate) hooks.onRotateEnd?.(); pinch = null; }
    if (wasTap) {
      const box = canvas.getBoundingClientRect();
      pointer.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
      ray.setFromCamera(pointer, active());
      scene.updateMatrixWorld(true);
      const hits = ray.intersectObjects(view.place ? places.pickables : [...pickables.filter(p => p.userData.type !== "plot" || plots[p.userData.index].g.visible), ...festivalWorld.pickables, ...hollowFarm.pickables, ...[...visitorModels.values()].filter(e => e.m.visible).map(e => e.hit)], false);
      // A visible guest at a counter takes priority over its large building hit box.
      const hit = hits.find(h => ["visitor", "customer"].includes(h.object.userData.type)) ?? hits.find(h => h.object.userData.host && h.object.userData.host === hits[0].object.userData.instance) ?? hits[0];
      lastPick = hit ? { ...hit.object.userData } : null;
      if (hit) hooks.onPick({ ...hit.object.userData, point: hit.point });
    }
    drag = null;
  };
  canvas.addEventListener("pointerup", end);
  // Browser interruptions finish a rotation once, never turn its release into a tap.
  const cancelGesture = (id) => {
    if (id !== undefined && !touches.has(id)) return;
    if (pieceDrag !== null) { hooks.onPieceDragEnd?.(true); pieceDrag = null; }
    if (id === undefined) touches.clear(); else touches.delete(id);
    drag = null; if (pinch?.rotate) hooks.onRotateEnd?.(true); pinch = null;
  };
  canvas.addEventListener("pointercancel", e => cancelGesture(e.pointerId));
  canvas.addEventListener("lostpointercapture", e => cancelGesture(e.pointerId));
  canvas.addEventListener("contextmenu", e => { e.preventDefault(); cancelGesture(); });
  window.addEventListener("blur", () => cancelGesture());
  document.addEventListener("visibilitychange", () => { if (document.hidden) cancelGesture(); });
  canvas.addEventListener("wheel", (e) => { if (["estate", "foyer", "maze"].includes(view.place)) return; e.preventDefault(); glide = null; view.zoom = THREE.MathUtils.clamp(view.zoom * (e.deltaY < 0 ? 1.1 : 0.9), cameraLayout(canvas.clientWidth).minZoom, cameraLayout(canvas.clientWidth).maxZoom); clampView(); frame(); }, { passive: false });
  // Keep the fence at or below the bottom edge (a tall phone shows the sky and
  // hills above instead of empty ground below), and the map's sides in view.
  function clampView() {
    if (view.place) {
      // Offsets from the room's centre: a little way along it, and in or out. Past
      // that only as far as the piece bar needed, and once it closes, no further
      // than the camera already is.
      const along = roomAlong(), reach = view.reach;
      if (!kept) { reach.x = Math.min(reach.x, Math.max(0, Math.abs(view.x) - along)); reach.z = Math.min(reach.z, Math.max(0, view.z - 1.2)); }
      view.x = THREE.MathUtils.clamp(view.x, -along - reach.x, along + reach.x);
      view.z = THREE.MathUtils.clamp(view.z, -1.2, 1.2 + reach.z);
      view.zoom = THREE.MathUtils.clamp(view.zoom, cameraLayout(canvas.clientWidth).roomMinZoom, 1.9);
      return;
    }
    const halfW = camera.right, vertical = farmVerticalLimits(camera.top, PITCH, fieldDepth(state));
    const maxX = fieldWidth(state) + 1 - halfW, minX = HOLLOW_PROPERTY.westEdge + halfW - 1;
    view.z = THREE.MathUtils.clamp(view.z, vertical.min, vertical.max);
    view.x = minX > maxX ? (fieldWidth(state) + HOLLOW_PROPERTY.westEdge) / 2 : THREE.MathUtils.clamp(view.x, minX, maxX);
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

  let framedLand = "", tapPulse = 0, last = performance.now(), time = 0, nextSpeechAt = 0;
  function tick(now) {
    // The first frame's timestamp can come before the scene finished building, and
    // a negative time would pick a walk frame that doesn't exist.
    const dt = THREE.MathUtils.clamp((now - last) / 1000, 0, 0.1); last = now; time += dt;
    hooks.onTick(dt);
    ambience.tick(time);
    // The camera shows the kept piece after any press on the canvas is over; a short
    // ease, or a cut for anyone who has asked for less motion.
    if (aimNext && !touches.size && view.place === "room") {
      aimNext = false;
      const to = aimAtPiece();
      if (to) {
        view.reach.x = Math.max(view.reach.x, Math.abs(to.x) - roomAlong()); view.reach.z = Math.max(view.reach.z, to.z - 1.2);
        glide = { x: view.x, z: view.z, to, t: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 0 };
      }
    }
    if (glide) {
      glide.t = Math.min(1, glide.t + dt / 0.35);
      const k = 1 - (1 - glide.t) ** 3;
      view.x = glide.x + (glide.to.x - glide.x) * k; view.z = glide.z + (glide.to.z - glide.z) * k; frame();
      if (glide.t === 1) glide = null;
    }

    // Hidden farm rendering rests during the ride; the pure simulation still runs.
    if (view.place !== "maze") {
    // Plots.
    plots.forEach((p, i) => {
      const plot = state.plots[i], open = i < openPlots(state);
      p.g.visible = i < (state.upgrades.plots >= 4 ? 24 : state.upgrades.plots >= 3 ? 18 : 12);
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
    farmExpansion.sync();
    const land = `${fieldWidth(state)}:${fieldDepth(state)}`;
    if (land !== framedLand) { framedLand = land; frame(); clearMist(); }
    hollowFarm.sync(); hollowFarm.tick(time);

    // Both the ground and the incoming route end beyond the purchased gate.
    const routeIn = extendFarmRoute(ROUTE_IN, state), inLen = routeLength(routeIn);
    // Visitors along the stone path.
    for (const v of state.visitors) {
      let entry = visitorModels.get(v.id);
      if (!entry) { const m = visitorModel(v.kind), hit = new THREE.Mesh(guestHitGeometry, guestHitMaterial); hit.position.y = 1.1; hit.userData = { type: "visitor", id: v.id }; m.add(hit); scene.add(m); entry = { m, hit, sprite: m.userData.sprite, bag: null }; visitorModels.set(v.id, entry); }
      const hollowJourney = v.hollow && !v.hollow.done;
      entry.m.visible = !hollowJourney || ["approach", "arriving-house", "door-wait", "to-border", "to-shop"].includes(v.hollow.phase);
      if (!entry.m.visible) continue;
      const leaving = v.leaveAt !== null && v.age >= v.leaveAt;
      const t = leaving ? (v.age - v.leaveAt) / visitorLeaveSeconds(state) : Math.min(1, v.age / VISIT.arrive);
      const excursion = hollowJourney || v.festival && !v.festival.done;
      const journey = hollowJourney ? v.hollow : v.festival;
      const p = excursion ? journey : leaving ? along(state.festival.meadow ? MEADOW_EXIT : ROUTE_OUT, t * (state.festival.meadow ? meadowOutLen : outLen)) : along(routeIn, t * inLen);
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
    estateView.tick(time);
    foyerView.tick(dt, time);
    }
    mazeView.tick(dt, time);

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
      if (route === "hollow-ticket") { if (view.place === "foyer") floatText("+£" + amount, -2, 2, 0, "coin"); else if (!view.place) floatText("+£" + amount, HOLLOW_PROPERTY.x, 2.8, HOLLOW_PROPERTY.door[1], "coin"); return; }
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
      cancelGesture();
      if (view.place === "maze") mazeView.leave();
      if (!view.place) farmView = { x: view.x, z: view.z, zoom: view.zoom };
      if (view.place === "estate") estateView.leave();
      if (view.place === "foyer") foyerView.leave();
      view.place = kind;
      if (kind === "estate") { places.leave(); estateView.enter(); }
      else if (kind === "foyer") { places.leave(); foyerView.enter(); }
      else if (kind === "maze") { places.leave(); mazeView.enter(id.config, id.options); }
      else if (kind === "room") places.enterRoom(id); else places.enterShop();
      Object.assign(view, { x: 0, z: 0, zoom: 1, reach: { x: 0, z: 0 } }); glide = null;
      frame();
    },
    leavePlace() {
      if (!view.place) return;
      cancelGesture(); if (view.place === "maze") mazeView.leave();
      if (view.place === "estate") estateView.leave();
      if (view.place === "foyer") foyerView.leave();
      places.leave();
      view.place = null; glide = null;
      Object.assign(view, farmView ?? { x: (fieldWidth(state) + HOLLOW_PROPERTY.westEdge) / 2, z: 8.4, zoom: 1 });
      frame();
    },
    get place() { return view.place === "maze" ? { kind: "maze", id: "hollow-ride" } : view.place === "estate" ? { kind: "estate", id: "garden" } : view.place === "foyer" ? { kind: "foyer", id: "hollow" } : places.place; },
    get lastPick() { return lastPick; },
    get visitorStatus() { return [...visitorModels].map(([id,e]) => ({ id, kind: state.visitors.find(v=>v.id===id)?.kind, visible: e.m.visible, sprite: e.sprite, leadingLeg: e.m.userData.leadingLeg, frames: e.m.userData.walk?.length ?? 0, frame: e.m.userData.walk?.indexOf(e.m.userData.shown) ?? -1, x: e.m.position.x, z: e.m.position.z })); },
    get farmExpansionStatus() { return farmExpansion.status; },
    get festivalStatus() { return festivalWorld.status; },
    get cameraFraming() { return { zoom: view.zoom, x: view.x, z: view.z, span: camera.right - camera.left, roomDistance: view.roomDist, overview: cameraLayout(canvas.clientWidth).overview, width: canvas.clientWidth, height: canvas.clientHeight }; },
    fitView() {
      if (view.place === "maze") { mazeView.setLook(0, 0); mazeView.resize(); return; }
      if (view.place === "estate") { estateView.cameraActions.reset(); return; }
      if (view.place === "foyer") { foyerView.cameraActions.reset(); return; }
      Object.assign(view, { x: view.place ? 0 : cameraLayout(canvas.clientWidth).overview >= .95 ? (fieldWidth(state) + HOLLOW_PROPERTY.westEdge) / 2 : 15.5, z: view.place ? 0 : 8.4, zoom: 1 });
      frame();
    },
    refreshRoom() { places.refresh(); },
    refreshEstate() { festivalWorld.sync(); farmExpansion.sync(); frame(); },
    refreshHouseEstate() { if (view.place === "estate") estateView.sync(); },
    previewEstateDecor(data) { estateView.preview(data); },
    get estateCamera() { return estateView.cameraActions; },
    get estateStatus() { return estateView.status; },
    refreshHollow() { hollowFarm.sync(); },
    refreshFoyer() { if (view.place === "foyer") foyerView.sync(); },
    previewFoyerDecor(data) { foyerView.preview(data); },
    // For tests: where a world point lands on the canvas, in CSS pixels.
    project(x, y, z) { const v = new THREE.Vector3(x, y, z).project(active()), box = canvas.getBoundingClientRect(); return { x: box.left + (v.x + 1) / 2 * box.width, y: box.top + (1 - v.y) / 2 * box.height }; },
    speakMortimer() { foyerView.speak(true); },
    get foyerCamera() { return foyerView.cameraActions; },
    get mazeStatus() { return mazeView.status; },
    get mazeConfig() { return mazeView.config; },
    pauseMazeRide(on) { return mazeView.setPaused(on); },
    restartMazeRide(options) { return mazeView.restart(options); },
    setMazeOptions(options) { mazeView.setOptions(options); },
    advanceMazeRide(seconds) { return mazeView.advanceForTest(seconds); },
    get foyerStatus() { return foyerView.status; },
    get renderStatus() { return { quality: renderQuality, pixelRatio: renderer.getPixelRatio(), postprocessRatio, bufferWidth: canvas.width, bufferHeight: canvas.height, postprocessWidth: Math.floor(composer.renderTarget1.width), postprocessHeight: Math.floor(composer.renderTarget1.height), antialias: bloomOn ? antialias.enabled ? "FXAA" : "density" : "canvas", antialiasResolution: antialias.uniforms.resolution.value.toArray(), touchDevice, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }; },
    setRenderQuality(value) { renderQuality = validRenderQuality(value); resize(); return renderQuality; },
    selectPiece(instance) { places.select(instance); },
    previewPiece(instance, x, z, ok) { places.preview(instance, x, z, ok); },
    showGrid(on) { places.setGrid(on); },
    cellAt(point, type, wall, snap = .1) { return places.cellAt(point, type, wall, snap); },
    movePiece(instance, pose, ok) { places.movePiece(instance, pose, ok); },
    hostPoint(instance, point) { return places.hostPoint(instance, point); },
    rotatePiece(instance) { places.rotatePiece(instance); },
    // Keeps a selected piece clear of its toolbar (an element), or stops, leaving the camera be.
    keepInView(instance, bar) { kept = instance ? { instance, bar } : null; aimNext = !!instance; if (!instance) glide = null; },
    screenPoint(x, y, z) { return project(new THREE.Vector3(x, y, z)); },
    // Just above their heads: they lean back so they stand 2.3 tall on screen, which a point straight up from the feet reaches at 2.3 / cos(PITCH).
    actorPosition(who) { const p = actors[who]?.model.position ?? new THREE.Vector3(HOMES[who].x, 0, HOMES[who].z); return project(new THREE.Vector3(p.x, 2.5 / Math.cos(PITCH), p.z)); },
    focus(x, z, zoom = view.zoom) { view.x = x; view.z = z; view.zoom = zoom; frame(); },          // frame() clamps once the new zoom is in
    setBloom(on) { bloomOn = on; },
    setAmbience(on) { ambience.set(on); },
    ambience,
    setVoxelCharacters(on) { if (on !== voxelCharacters) { voxelCharacters = on; placeCharacters(); } },
    get characterStyle() { return skyla ? (voxelCharacters ? "voxels" : "sprites") : "loading"; },
    setShadows(on) { renderer.shadowMap.enabled = on; for (const viewScene of [scene, estateView.scene, foyerView.scene, mazeView.scene]) viewScene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); },
    renderer,
  };
}
