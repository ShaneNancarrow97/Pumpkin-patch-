import { createMaisie, maisieTextures } from "./maisie.js";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { renderSizing, validRenderQuality } from "./render-quality.js";
import { Voxels, seeded, vary } from "./voxels.js";
import { createSandy, sandyTextures } from "./sandy.js";
import { specialSpriteReady, specialSpriteTexture } from "./special-sprites.js";
import { cocoaProp, takeawayCup } from "./cocoa-props.js";
import { customerBag, disposeCustomerBag } from "./customer-bag.js";
import { pumpkinTemplate, sproutTemplate, bigPumpkin } from "./pumpkins.js";
import { plotShape } from "./content/pumpkin-shapes.js";
import { MAP, PLOTS, BIG_PUMPKIN, SHOP, HOMES, ROUTE_IN, ROUTE_OUT, PITCH, buildWorld, buildBackdrop, signBoard } from "./world.js";

import { buildVisitor, animateWalk } from "./characters.js";
import { loadSprites, spriteCharacter, animateSprite, animateSkyla } from "./sprite-voxels.js";
import { loadSpriteSheets, spriteActor, spriteVisitor, seatedVisitor, animateVisitor, portraitURL } from "./sprite-actors.js";
import { VARIETIES, VISIT, visitorLeaveSeconds, openPlots, activeLook, counterSide } from "./model.js";
import { createPlaces, ORIGIN } from "./places.js";
import { INTERIOR } from "./interiors.js";
import { loadDecor } from "./decor.js";
import { GRID } from "./model.js";
import { createFestivalWorld } from "./festival-meadow-world.js";
import { createHayrideWorld } from "./hayride-world.js";
import { createHayrideScares } from "./hayride-scares.js";
import { HAYRIDE_SITE, hayrideGuestPose } from "./content/hayride-layout.js";
import { fieldWidth, MEADOW, MEADOW_EXIT, CHAT_SPOTS } from "./content/festival-meadow.js";
import { cameraLayout, controlledRoomFraming, farmVerticalLimits } from "./camera-layout.js";
import { createHouseEstateView } from "./house-estate-view.js";
import { createGardenPlay } from "./garden-play.js";
import { createCarvingView } from "./carving-view.js";
import { HOLLOW_PROPERTY } from "./content/hollow-house.js";
import { createFarmExpansion } from "./farm-expansion-world.js";
import { createWilds } from "./wilds.js";
import { createCookingWorld } from "./cooking-world.js";
import { COOKING_SITE } from "./content/cooking-layout.js";
import { createActionFx } from "./action-fx.js";
import { fieldDepth, extendFarmRoute, DROP, patchShape, COUNTER_GAP } from "./content/farm-layout.js";
import { createHollowFarm } from "./hollow-house-farm.js";
import { createMazeRideView } from "./maze-ride-view.js";
import { createHayrideView } from "./hayride-view.js";
import { createFoyerView } from "./foyer-view.js";
import { createAmbience } from "./ambience.js";
import { mistClearings } from "./content/ambience.js";
import { playerOrbitStep, createPlayerControl } from "./player-control.js";
import { playerDirectionTextures } from "./player-sprite-directions.js";
import wateringCanURL from "../assets/sprite-watering-can.webp";
import { createCleanlinessView } from "./cleanliness-view.js";

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
  moon.shadow.autoUpdate = false;                                       // redrawn every other frame (tick)
  scene.add(moon, moon.target);
  // A soft warm fill from the viewer's side, like lantern light, so faces read.
  const fill = new THREE.DirectionalLight(0xffcf9a, 1.2);
  fill.position.set(18, 20, 44); fill.target.position.set(20, 0, 13);
  scene.add(fill, fill.target);

  const world = buildWorld();
  scene.add(world.group);
  // The farm's lamps light their surroundings through the same small pool of
  // lights the rooms use (places.js), given to the lamps nearest the view
  // each frame (lightLamps below). Every lamp still glows. Fewer lights in the
  // shader is the biggest saving on a phone.
  const lamps = world.lights.map((l) => ({ x: l.x, y: l.y, z: l.z }));
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
    // Each plot grows its own shape (content/pumpkin-shapes.js), so the patch isn't all one pumpkin.
    const pk = VARIETIES.map((_, v) => { const m = pumpkinTemplate(v, 0.62, plotShape(i)).clone(); m.position.y = 0.18; g.add(m); return m; });
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
  const farmExpansion = createFarmExpansion(state, world, lamps);
  // Hills, a treeline and the roads beyond, fading into the night (wilds.js).
  const wilds = createWilds(scene, state);
  const hollowFarm = createHollowFarm(scene, state, signBoard, lamps);
  const hayrideWorld = createHayrideWorld({ scene, state, world, signBoard, createScares: createHayrideScares });
  const cookingWorld = createCookingWorld({ scene, state, world, signBoard, lamps, createMaisie, visitorModel: kind => visitorModel(kind), seatedVisitor: kind => seatedVisitor(sheets,kind), animate: (...args) => animateFigure(...args) });
  const farmViewWidth = () => Math.max(fieldWidth(state), state.kitchen?.purchased ? COOKING_SITE.bounds.x1 : 0);
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
    if (!ready() || who === "natalie" && state.wardrobe.equipped.natalie === "natalie-wheelchair" && !sheets) return null;
    const look = who === "skyla" ? undefined : activeLook(state, who), outfit = who === "skyla" ? undefined : state.wardrobe.equipped[who];
    const m = voxelCharacters && outfit !== "natalie-wheelchair" ? spriteCharacter(pixels, who, look, outfit, sheets) : spriteActor(sheets, who, look, outfit);
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
    warm(...playerDirectionTextures([state.wardrobe.equipped.shane,state.wardrobe.equipped.natalie]));
    for (const entry of visitorModels.values()) { scene.remove(entry.m); disposeCustomerBag(entry.bag); disposeCustomerBag(entry.cup); disposeCustomerBag(entry.snack); entry.m.userData.dispose?.(); }
    visitorModels.clear();                                                            // rebuilt in the new style next frame
    const inside = places.place;
    if (inside?.kind === "room") places.enterRoom(inside.id);
    else if (inside?.kind === "shop") places.enterShop();
  }
  loadSprites().then((data) => { pixels = data; if (voxelCharacters) placeCharacters(); }).catch(() => hooks.onSpriteError?.());
  // The voxel figures are built from these sheets too, in more detail, once they arrive.
  loadSpriteSheets().then((data) => {
    sheets = data; if (!voxelCharacters || pixels) placeCharacters();
    warm(...["visitors", "horrorVisitors", "court", "seated", "natalie-wheelchair", "skyla", "natalie", "shane"].map((name) => data[name]?.texture)); warmShaders();
  }).catch(() => hooks.onSpriteError?.());
  specialSpriteReady.then(() => warm(specialSpriteTexture()));

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
    actors[who] = { model, hit, queue: old?.queue ?? [], delivery: old?.delivery ?? null, moving: false, work: 0, dx: 0 };
  }
  const nearestActor = (x, z) => Object.entries(actors).filter(([who,a]) => (!player.state().enabled || who !== player.state().who) && (!a.delivery || !a.queue.length)).map(([,a])=>a).sort((a, b) => (Math.hypot(a.model.position.x - x, a.model.position.z - z) + a.queue.length * 4) - (Math.hypot(b.model.position.x - x, b.model.position.z - z) + b.queue.length * 4))[0];

  // The existing Shane figure receives a parcel along the east path. Never
  // spawn a second copy or interrupt a crop task; Natalie keeps helping.
  const receivedOrders = new Set();
  function receiveDelivery() {
    if (state.paused) return;
    const order = state.kitchen?.orders?.[0], a = actors.shane;
    if (player.state().enabled && player.state().who === "shane") return;
    if (!order || !a || receivedOrders.has(order.id) || a.queue.length) return;
    if (!(order.phase === "travelling" || order.phase === "unloading" || order.phase === "ordered" && order.remaining <= 15)) return;
    if (Math.hypot(a.model.position.x - HOMES.shane.x, a.model.position.z - HOMES.shane.z) > 1) return;
    const way = [{ x: 28.7, z: 16.6 }, { x: 30.2, z: 15.6 }, { x: 31.6, z: 12.6 }, { x: 35, z: 10.6 }, { x: 38, z: 8.6 }, { x: 39.65, z: 6 }, { x: 39.65, z: 4.45, receive: order.id }];
    a.delivery = order.id;
    a.queue.push(...way, ...way.slice(0, -1).reverse(), { ...HOMES.shane });
    receivedOrders.add(order.id);
    if (receivedOrders.size > 64) receivedOrders.delete(receivedOrders.values().next().value);
  }

  // Visitors.
  const visitorModels = new Map(), outLen = routeLength(ROUTE_OUT), meadowOutLen = routeLength(MEADOW_EXIT);
  const guestHitGeometry = new THREE.BoxGeometry(1.15, 2.2, .9), guestHitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const carried = pumpkins.map((t) => { const m = t.clone(); m.scale.setScalar(0.5); return m; });

  // The cottage's rooms and the shop floor (places.js).
  const places = createPlaces({ scene, state, character, visitorModel, pumpkinTemplate, animate: animateFigure });
  // Out on the farm, the pool's lights go to the lamps nearest the middle of
  // the view. A lamp joining or leaving fades over a third of a second, and
  // each keeps its light while it stays among the nearest.
  const lampSlots = [];
  function lightLamps(dt) {
    const pool = places.lightPool;
    if (view.place) { lampSlots.length = 0; return; }
    const fresh = !lampSlots.length, want = new Set(lamps.flatMap((l, i) => l.active === false ? [] : [[i, (l.x - view.x) ** 2 + (l.z - view.z) ** 2]]).sort((a, b) => a[1] - b[1]).slice(0, pool.length).map(([i]) => i));
    for (let k = 0; k < pool.length; k++) lampSlots[k] ??= { lamp: -1, level: 0 };
    for (const slot of lampSlots) slot.target = want.has(slot.lamp) ? 1 : 0;
    for (const i of want) if (!lampSlots.some((slot) => slot.lamp === i)) { const free = lampSlots.find((slot) => slot.lamp < 0); if (free) Object.assign(free, { lamp: i, level: 0, target: 1 }); }
    lampSlots.forEach((slot, k) => {
      slot.level = fresh ? slot.target : THREE.MathUtils.clamp(slot.level + Math.sign(slot.target - slot.level) * dt * 3, 0, 1);
      if (!slot.level && !slot.target) slot.lamp = -1;
      const light = pool[k], lamp = lamps[slot.lamp];
      if (!lamp) { light.intensity = 0; return; }
      light.position.set(lamp.x, lamp.y, lamp.z); light.color.setHex(0xffa04a); light.distance = 7.5; light.decay = 1.5; light.intensity = 9 * slot.level;
    });
  }
  // A picture goes to the graphics card the first time it's drawn, and a shader
  // compiles the first time something needs it; either holds up that frame.
  // Sandy's blink and serving poses, the horror guests' sheet and the Baron's
  // were the worst, at 30 to 60 ms each. Each loaded picture is sent ahead
  // instead, one a frame, and the farm's shaders, with their indoor variants,
  // compile in the background once the characters are in.
  const warming = new Set();
  const warm = (...textures) => textures.forEach((t) => t?.isTexture && warming.add(t));
  function warmNext() { for (const t of warming) if (t.version > 0 && t.image) { renderer.initTexture(t); warming.delete(t); return; } }
  function warmShaders() {
    // Compiled for where the farm is drawn (the glow pass's buffer, or the
    // screen), or none of them would match.
    const compile = () => { const target = renderer.getRenderTarget(); renderer.setRenderTarget(bloomOn ? composer.readBuffer : null); const done = renderer.compileAsync(scene, camera); renderer.setRenderTarget(target); return done; };
    compile().then(() => places.withKeyLight(compile)).catch(() => {});
  }
  warm(...sandyTextures, ...maisieTextures);
  warm(...places.petTextures);
  const wateringTexture=new THREE.TextureLoader().load(wateringCanURL);wateringTexture.colorSpace=THREE.SRGBColorSpace;warm(wateringTexture);
  const cleanlinessView = createCleanlinessView({ scene, state, warm });
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
  const estateView = createHouseEstateView(canvas, state, { onPick: what => hooks.onPick(what), editing: () => hooks.estateEditing?.(), gesture: hooks.estateGesture, blocked: () => document.body.classList.contains("menu-open") || !document.getElementById("level-celebration").hidden });
  const gardenPlay = createGardenPlay({ view: estateView, state, character });
  // The bench's view reports to main.js through hooks.carving (cuts, the lid, seeds, sounds).
  const carve = (name) => (...args) => hooks.carving?.[name]?.(...args);
  const carvingView = createCarvingView(canvas, state, Object.assign(Object.fromEntries(["onCut", "onEtch", "onFree", "onFreeMiss", "onLid", "onScooped", "onRevealed", "onTool", "onProgress", "sound", "feel"].map((n) => [n, carve(n)])), { blocked: () => document.body.classList.contains("menu-open") }));
  const foyerView = createFoyerView(canvas, state, { onPick: what => hooks.onPick(what), visitorModel, animate: animateFigure, blocked: () => document.body.classList.contains("menu-open") || !document.getElementById("level-celebration").hidden, decorating: () => hooks.foyerEditing?.(), wallEditing: () => hooks.foyerWallEditing?.(), gesture: hooks.foyerGesture });
  const mazeView = createMazeRideView(canvas, state, { onCue: cue => hooks.onMazeCue?.(cue), onComplete: status => hooks.onMazeComplete?.(status), onState: status => hooks.onMazeState?.(status), blocked: () => document.body.classList.contains("menu-open") });
  const hayrideView = createHayrideView(canvas, state, { world: hayrideWorld, onCue: cue => hooks.onHayrideCue?.(cue), onComplete: status => hooks.onHayrideComplete?.(status), onState: status => hooks.onHayrideState?.(status), blocked: () => document.body.classList.contains("menu-open") });
  const active = () => view.place === "carving" ? carvingView.camera : view.place === "hayride" ? hayrideView.camera : view.place === "maze" ? mazeView.camera : view.place === "estate" ? estateView.camera : view.place === "foyer" ? foyerView.camera : view.place ? roomCam : camera;
  const activeScene = () => view.place === "carving" ? carvingView.scene : view.place === "hayride" ? hayrideWorld.rideScene : view.place === "maze" ? mazeView.scene : view.place === "estate" ? estateView.scene : view.place === "foyer" ? foyerView.scene : scene;
  const view = { x: (fieldWidth(state) + HOLLOW_PROPERTY.westEdge) / 2, z: 8.4, zoom: 1, place: null, reach: { x: 0, z: 0 } };
  // The optional orbit follows the owner; the management view stays canonical.
  const playerOrbit = { yaw: 0, pitch: PITCH }, playerLook = { x: 0, z: 0 };
  const orbitTarget = new THREE.Vector3(), orbitForward = new THREE.Vector3(), orbitUp = new THREE.Vector3();
  const orbitGround = new THREE.Mesh(new THREE.PlaneGeometry(260,260), new THREE.MeshStandardMaterial({color:0x25291d,roughness:1}));
  orbitGround.rotation.x=-Math.PI/2; orbitGround.position.set(20,-.55,15); orbitGround.visible=false; orbitGround.receiveShadow=true; scene.add(orbitGround);
  const orbitBackdrop = new THREE.Mesh(new THREE.PlaneGeometry(1,1), backdrop.material); orbitBackdrop.visible=false; orbitBackdrop.frustumCulled=false; scene.add(orbitBackdrop);
  const billboards = new Map(); let nextBillboardScan = -1, hadOrbit = false;
  function orbiting(){return player.state().enabled && (!view.place || view.place==='room');}
  // Register flat cast as they arrive, then rotate only that small set per frame.
  function faceCast(yaw,pitch,inside,now){
    if(now>=nextBillboardScan){nextBillboardScan=now+1;scene.traverse(o=>{const lean=o.children[0];if(o.isGroup&&lean?.isGroup&&lean.children.some(m=>m.isMesh&&m.geometry?.type==='PlaneGeometry'&&m.customDepthMaterial)&&!billboards.has(o))billboards.set(o,{yaw:o.rotation.y,lean:lean.rotation.x,stretch:lean.scale.y});});}
    for(const [o,base]of billboards){if(!o.parent){billboards.delete(o);continue;}const lean=o.children[0];if(!lean)continue;o.rotation.y=yaw;const angle=inside?INTERIOR.lean:Math.abs(base.lean);lean.rotation.x=-angle;lean.scale.y=1/Math.cos((inside?INTERIOR.pitch:pitch)-angle);}
    places.faceCamera?.(yaw,pitch);
  }
  function restoreCast(){for(const[o,base]of billboards){o.rotation.y=base.yaw;if(o.children[0]){o.children[0].rotation.x=base.lean;o.children[0].scale.y=base.stretch;}}places.faceCamera?.(0,INTERIOR.pitch);}
  const player = createPlayerControl({ scene, state, actors: () => actors, places, getPlace: () => view.place, getCamera: active, animate: animateSprite,
    wateringTexture, garden: gardenPlay, onWay: (way) => hooks.onWay?.(way) ?? false,
    cameraLook(x,y,dt){if(view.place==='estate'){estateView.play.look(x,y,dt);return;}Object.assign(playerOrbit,playerOrbitStep(playerOrbit,x,y,dt,view.place==='room'));playerLook.x=playerOrbit.yaw;playerLook.z=playerOrbit.pitch-PITCH;},
    cameraZoom(direction){if(view.place==='estate'){estateView.play.zoom(direction);return;}if(touches.size||kept||!direction)return;const l=cameraLayout(canvas.clientWidth),inside=view.place==='room';view.zoom=THREE.MathUtils.clamp(view.zoom*Math.exp(direction*.13),inside?l.roomMinZoom:l.minZoom,inside?1.9:l.maxZoom);frame();},
    cameraReset(pos,inside){if(view.place==='estate'){estateView.play.reset(pos);return;}playerOrbit.yaw=0;playerOrbit.pitch=inside?INTERIOR.pitch:PITCH;playerLook.x=playerLook.z=0;view.x=inside?pos.x-places.place.w/2:pos.x;view.z=inside?pos.z-places.place.d*.42:pos.z;view.zoom=inside?1:canvas.clientWidth>=740?2.3:1.35;frame();},
    follow(pos,dt,inside){if(view.place==='estate'){estateView.play.follow(pos,dt);return;}if(touches.size||kept)return;const k=1-Math.exp(-dt*9);const tx=inside?pos.x-ORIGIN.room.x-places.place.w/2:pos.x,tz=inside?pos.z-ORIGIN.room.z-places.place.d*.42:pos.z;view.x+=(tx-view.x)*k;view.z+=(tz-view.z)*k;frame();},
  });
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
    const controlled = orbiting() && view.place === "room";
    const o = ORIGIN[view.place], aspect = w / h, p = controlled ? playerOrbit.pitch : INTERIOR.pitch, layout = cameraLayout(w);
    const half = 3.5 + (rw / 2 + 0.4 - 3.5) * layout.overview;
    const corners = [[-half, 5.4, 0], [half, 5.4, 0], [-half, -0.1, rd + 0.3], [half, -0.1, rd + 0.3]];
    const yaw=controlled?playerOrbit.yaw:0;
    const target = new THREE.Vector3(o.x + rw / 2 + view.x, controlled ? 1.1 : 2, o.z + rd * 0.42 + view.z), dir = new THREE.Vector3(Math.sin(yaw)*Math.cos(p), Math.sin(p), Math.cos(yaw)*Math.cos(p));
    probe.fov = INTERIOR.fov; probe.aspect = aspect; probe.near = 0.1; probe.far = 200; probe.updateProjectionMatrix();
    const fits = (dist) => {
      probe.position.copy(target).addScaledVector(dir, dist); probe.lookAt(target); probe.updateMatrixWorld();
      for (const [x, y, z] of corners) {
        corner.set(o.x + rw / 2 + x, y, o.z + z).project(probe);
        if (Math.abs(corner.x) > 0.9 || Math.abs(corner.y) > 0.8) return false;
      }
      return true;
    };
    const controlFrame = controlledRoomFraming(w, view.zoom);
    if (controlled) view.zoom = controlFrame.zoom;
    let dist = controlled ? controlFrame.distance : 6;
    if(!controlled)while (dist < 80 && !fits(dist)) dist += 0.25;
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
    // The painted farm panorama has finite edges at the woodland's low camera.
    const control = orbiting();
    backdrop.visible = view.place !== "hayride" && !(control && !view.place);
    orbitGround.visible=orbitBackdrop.visible=control&&!view.place;
    renderPass.camera = active();
    renderPass.scene = activeScene();
    renderer.toneMappingExposure = view.place === "maze" ? 1.3 : view.place === "carving" ? 1.2 : 1.45;
    if (view.place === "maze") { mazeView.resize(); return; }
    if (view.place === "hayride") { hayrideView.resize(); return; }
    if (view.place === "estate") { estateView.resize(w, h); return; }
    if (view.place === "carving") { carvingView.resize(w, h); return; }
    if (view.place === "foyer") { foyerView.resize(); return; }
    if (view.place) { if(!control)clampView(); frameRoom(w, h); return; }
    // Ease from a phone crop to the whole yard, with room around the edges.
    view.zoom = THREE.MathUtils.clamp(view.zoom, cameraLayout(w).minZoom, cameraLayout(w).maxZoom);
    const span = (cameraLayout(w).farmSpan + (farmViewWidth() - MAP.w - HOLLOW_PROPERTY.westEdge + (fieldDepth(state) - MAP.d) * .8) * cameraLayout(w).overview) / view.zoom, halfW = span / 2, halfH = halfW / aspect;
    camera.left = -halfW; camera.right = halfW; camera.top = halfH; camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    if(!control)clampView();
    const target = new THREE.Vector3(view.x, control?1.05:0, view.z), dist = 60, pitch=control?playerOrbit.pitch:PITCH,yaw=control?playerOrbit.yaw:0;
    camera.position.set(target.x+Math.sin(yaw)*Math.cos(pitch)*dist, target.y+Math.sin(pitch)*dist, target.z+Math.cos(yaw)*Math.cos(pitch)*dist);
    camera.lookAt(target);camera.updateMatrixWorld();
    if(control){
      camera.getWorldDirection(orbitForward);orbitUp.set(0,1,0).applyQuaternion(camera.quaternion);
      orbitBackdrop.position.copy(target).addScaledVector(orbitForward,85).addScaledVector(orbitUp,halfH*.4);orbitBackdrop.quaternion.copy(camera.quaternion);orbitBackdrop.scale.set(halfW*2.8,halfH*2.5,1);
    }
  }
  let firstResize = true, lastOverview = false;
  function resize() {
    const sizing = renderSizing(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio, renderQuality, view.place === "carving"), w = sizing.width, h = sizing.height;
    if (renderer.getPixelRatio() !== sizing.pixelRatio) renderer.setPixelRatio(sizing.pixelRatio);
    renderer.setSize(w, h, false);
    if (postprocessRatio !== sizing.pixelRatio) { composer.setPixelRatio(sizing.pixelRatio); postprocessRatio = sizing.pixelRatio; }
    composer.setSize(w, h);
    antialias.uniforms.resolution.value.set(1 / sizing.bufferWidth, 1 / sizing.bufferHeight); antialias.enabled = sizing.pixelRatio < FXAA_BELOW;
    const overview = cameraLayout(w).overview >= 0.95;
    if (!firstResize && overview && !lastOverview && !player.state().enabled) {
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
    if (["estate", "foyer", "maze", "hayride", "carving"].includes(view.place) || e.pointerType === "mouse" && e.button !== 0) return;
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
    if (["estate", "foyer", "maze", "hayride", "carving"].includes(view.place)) return;
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
    if (["estate", "foyer", "maze", "hayride", "carving"].includes(view.place) || !touches.has(e.pointerId)) return;
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
      const hits = ray.intersectObjects(view.place ? places.pickables : [...pickables.filter(p => p.userData.type !== "plot" || plots[p.userData.index].g.visible), ...festivalWorld.pickables, ...hollowFarm.pickables, ...hayrideWorld.pickables, ...cookingWorld.pickables, ...[...visitorModels.values()].filter(e => e.m.visible).map(e => e.hit)], false);
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
  canvas.addEventListener("wheel", (e) => { if (["estate", "foyer", "maze", "hayride", "carving"].includes(view.place)) return; e.preventDefault(); glide = null; view.zoom = THREE.MathUtils.clamp(view.zoom * (e.deltaY < 0 ? 1.1 : 0.9), cameraLayout(canvas.clientWidth).minZoom, cameraLayout(canvas.clientWidth).maxZoom); clampView(); frame(); }, { passive: false });
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
    const west = state.hayride.purchased ? HAYRIDE_SITE.bounds.x0 : HOLLOW_PROPERTY.westEdge;
    const depth = state.hayride.purchased ? Math.max(fieldDepth(state), HAYRIDE_SITE.bounds.z1) : fieldDepth(state);
    const halfW = camera.right, vertical = farmVerticalLimits(camera.top, PITCH, depth);
    const maxX = farmViewWidth() + (state.kitchen?.purchased ? 8 : state.hayride.purchased ? 3 : 1) - halfW, minX = west + halfW - (state.hayride.purchased ? 3 : 1);
    view.z = THREE.MathUtils.clamp(view.z, vertical.min, vertical.max);
    view.x = minX > maxX ? (farmViewWidth() + west) / 2 : THREE.MathUtils.clamp(view.x, minX, maxX);
  }

  // Floating "+£12" and sparkle effects, as DOM labels projected from the world.
  const fx = [];
  const actionFx = createActionFx(scene);
  function floatText(text, x, y, z, cls = "") {
    const el = document.createElement("div");
    el.className = "float-text " + cls; el.textContent = text;
    document.getElementById("fx").append(el);
    fx.push({ el, scene: view.place, pos: new THREE.Vector3(x, y, z), t: 0, life: cls === "speech" ? 1.8 : 1.2 });
  }
  const project = (p) => { const v = p.clone().project(active()); return { x: (v.x + 1) / 2 * canvas.clientWidth, y: (1 - v.y) / 2 * canvas.clientHeight }; };

  // Chats in the meadow (rules/meadow-chat.js): a speech marker over each group
  // that's talking, which opens what they're saying, and, zoomed in, the
  // latest line in a bubble over whoever said it.
  const chatLayer = document.getElementById("chat-layer"), chatMarks = new Map(), chatPoint = new THREE.Vector3();
  function chatMark(spot) {
    let mark = chatMarks.get(spot.id);
    if (mark) return mark;
    const button = document.createElement("button"), bubble = document.createElement("p");
    button.className = "chat-marker"; button.type = "button"; button.hidden = true;
    button.setAttribute("aria-label", `Listen in on the chat ${spot.name}`); button.innerHTML = "<i></i><i></i><i></i>";
    button.onclick = () => hooks.onChat?.(spot.id);
    bubble.className = "chat-bubble"; bubble.hidden = true; bubble.setAttribute("aria-hidden", "true");
    chatLayer?.append(button, bubble);
    mark = { button, bubble, line: null, pulse: -9 }; chatMarks.set(spot.id, mark);
    return mark;
  }
  // Only the newest line shows, and none while the Overheard card already lists
  // them, so several chats never paper over the farm at once.
  let chatCard = null;
  function syncChats() {
    const farm = !view.place && !document.body.classList.contains("menu-open");
    chatCard ??= document.querySelector(".chat-card");
    const reading = chatCard && !chatCard.hidden;
    let newest = null;
    for (const m of chatMarks.values()) if (m.line && time < m.line.until && (!newest || m.pulse > newest.pulse)) newest = m;
    for (const spot of CHAT_SPOTS) {
      const mark = chatMark(spot), group = state.social?.groups?.[spot.id];
      const talking = farm && !!group && state.visitors.filter((v) => v.social?.spot === spot.id && v.social.phase === "chatting").length >= 2;
      mark.button.hidden = !talking;
      if (talking) {
        const p = project(chatPoint.set(spot.x, 3.3, spot.z));
        mark.button.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
        mark.button.classList.toggle("new", time - mark.pulse < 1.4);
      }
      const speaker = mark === newest && !reading && view.zoom >= 2.4 && farm ? visitorModels.get(mark.line.visitor) : null;
      // Just over the speaker's head, below the marker; not under the top bar.
      const at = speaker?.m.visible ? project(chatPoint.copy(speaker.m.position).setY(2.4)) : null;
      mark.bubble.hidden = !at || at.y < 96;
      if (!mark.bubble.hidden) mark.bubble.style.transform = `translate(${at.x}px, ${at.y}px) translate(-50%, -100%)`;
    }
  }

  let framedLand = "", tapPulse = 0, last = performance.now(), time = 0, nextSpeechAt = 0, shadowFrame = 0;
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

    receiveDelivery();
    // Shane and Natalie walk to their jobs, then drift home.
    for (const [who, a] of Object.entries(actors)) {
      if (player.state().enabled && player.state().who === who) { a.queue.length = 0; a.delivery = null; a.work = 0; continue; }
      const pos = a.model.position;
      let target = a.queue[0] ?? HOMES[who];
      const dx = target.x - pos.x, dz = target.z - pos.z, d = Math.hypot(dx, dz);
      // Wait beside the actual parcel until it is credited (or cancelled),
      // including a full-pantry hold. A fixed idle delay can end before arrival.
      const receiving = d <= .12 && target.receive && state.kitchen.orders.some(o => o.id === target.receive);
      a.moving = !receiving && d > 0.12 && a.work <= 0;
      if (receiving) a.work = 0;
      else if (a.work > 0) a.work -= dt;
      else if (d > 0.12) { const step = Math.min(d, WALK * dt); pos.x += dx / d * step; pos.z += dz / d * step; }
      else if (a.queue.length) { const stop = a.queue.shift(); a.work = stop.wait ?? (a.delivery ? 0 : 0.5); if (!a.queue.length) a.delivery = null; }
      // Like the sprites they come from, they always face the viewer (the voxel figures mirror to walk the other way).
      animateSprite(a.model, time, a.moving, dx, who === "shane" ? 1.7 : 0);
      a.hit.position.set(pos.x, 1.1, pos.z);
    }

    festivalWorld.tick(time);
    farmExpansion.sync(); wilds.sync();
    const land = `${farmViewWidth()}:${fieldDepth(state)}`;
    if (land !== framedLand) { framedLand = land; frame(); clearMist(); }
    hollowFarm.sync(); hollowFarm.tick(time);
    hayrideWorld.tick(time);
    cookingWorld.tick(time);

    // Both the ground and the incoming route end beyond the purchased gate.
    const routeIn = extendFarmRoute(ROUTE_IN, state), inLen = routeLength(routeIn);
    // Visitors along the stone path.
    for (const v of state.visitors) {
      let entry = visitorModels.get(v.id);
      if (!entry) { const m = visitorModel(v.kind), hit = new THREE.Mesh(guestHitGeometry, guestHitMaterial); hit.position.y = 1.1; hit.userData = { type: "visitor", id: v.id }; m.add(hit); scene.add(m); entry = { m, hit, sprite: m.userData.sprite, bag: null }; visitorModels.set(v.id, entry); }
      const hayrideJourney = v.hayride && !v.hayride.done, chat = v.social && !v.social.gone ? v.social : null;
      const hayridePose = hayrideJourney ? hayrideGuestPose(state, v) : null;
      const hollowJourney = !hayrideJourney && v.hollow && !v.hollow.done;
      entry.m.visible = view.place !== "hayride" && (!!chat || hayridePose?.visible !== false && (!hollowJourney || ["approach", "arriving-house", "door-wait", "to-border", "to-shop"].includes(v.hollow.phase)));
      if (!entry.m.visible) continue;
      const leaving = !chat && v.leaveAt !== null && v.age >= v.leaveAt;
      const t = leaving ? (v.age - v.leaveAt) / visitorLeaveSeconds(state) : Math.min(1, v.age / VISIT.arrive);
      const excursion = chat || hayrideJourney || hollowJourney || v.festival && !v.festival.done;
      const journey = chat ?? (hayrideJourney ? hayridePose : hollowJourney ? v.hollow : v.festival);
      const p = excursion ? journey : leaving ? along(state.festival.meadow ? MEADOW_EXIT : ROUTE_OUT, t * (state.festival.meadow ? meadowOutLen : outLen)) : along(routeIn, t * inLen);
      // Parties stand side by side along the counter: each fans out to its own
      // place over the last stretch of the path, and back in as it sets off home.
      const fan = excursion ? 0 : leaving ? Math.max(0, 1 - t * 4) : Math.max(0, (t - 0.8) / 0.2);
      entry.m.position.set(p.x + counterSide(v.spot ?? 0) * COUNTER_GAP * fan, p.y ?? .04, p.z);
      // The wagon rail masks the lower body; riders keep a quiet idle frame.
      entry.m.scale.y = hayridePose?.seated ? .66 : 1;
      const walking = excursion ? journey.walking : leaving || v.age < VISIT.arrive;
      if (entry.sprite) animateVisitor(entry.m, excursion ? time + v.id : v.age, walking, p.dx / (Math.hypot(p.dx, p.dz) || 1), walking || chat?.phase === "chatting");
      else {
        entry.m.rotation.y = walking ? Math.atan2(p.dx, p.dz) : Math.PI;              // at the counter they face Skyla
        animateWalk(entry.m, time + v.id, walking);
      }
      // A chatter speaking bobs as they talk.
      if (entry.sprite && chat && entry.speakUntil > time) entry.m.children[0].position.y += Math.abs(Math.sin(time * 13)) * .06;
      if (v.cocoaSpend && v.cocoaKind !== null && !entry.cup) {
        entry.cup = takeawayCup(v.cocoaKind); entry.cup.position.set(-.4, .9, .25); entry.m.add(entry.cup);
      }
      if (v.snack && !entry.snack) { entry.snack = cocoaProp(v.snackKind ?? "smores"); entry.snack.position.set(.4, .9, .25); entry.m.add(entry.snack); }
      if (v.bought !== null && !entry.bag) { entry.bag = state.customerCare.bags && v.quantity > 1 ? customerBag() : carried[v.bought].clone(); entry.bag.position.set(entry.sprite ? 0.36 : 0.45, entry.sprite ? 0.45 : 0.6, entry.sprite ? 0.3 : 0.2); entry.m.add(entry.bag); }
    }
    syncChats();
    lightLamps(dt);
    if (!view.place && (shadowFrame++ & 1) === 0) moon.shadow.needsUpdate = true;
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
    carvingView.tick(dt, time);
    foyerView.tick(dt, time);
    }
    mazeView.tick(dt, time);
    if (view.place === "hayride") hayrideView.tick(dt);
    player.update(dt, time);
    if (view.place === "estate") gardenPlay.tick();
    const orbit=orbiting();if(orbit){faceCast(playerOrbit.yaw,playerOrbit.pitch,!!view.place,time);hadOrbit=true;}else if(hadOrbit){restoreCast();hadOrbit=false;}
    cleanlinessView.update(state.paused ? 0 : dt, !view.place);

    actionFx.tick(dt);
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt; f.el.hidden = f.scene !== view.place;
      const s = project(f.pos.clone().setY(f.pos.y + f.t * (f.life > 2 ? 0.4 : 1.2)));
      f.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`;
      f.el.style.opacity = String(Math.max(0, 1 - f.t / f.life));
      if (f.t > f.life) { f.el.remove(); fx.splice(i, 1); }
    }

    if (bloomOn) composer.render(); else renderer.render(activeScene(), active());
    if (view.place === "carving") carvingView.afterRender(canvas);
    else if (view.place === "hayride") hayrideView.afterRender(canvas);
    if (warming.size) warmNext();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return {
    player: {
      ...player,
      // A spread copies a getter's value once; these must stay live.
      get enabled() { return player.enabled; },
      get passing() { return player.passing; },
      setEnabled(on,who){playerLook.x=playerLook.z=0;playerOrbit.yaw=0;playerOrbit.pitch=view.place==='room'?INTERIOR.pitch:PITCH;const result=player.setEnabled(on,who);if(on){const p=player.state().position;view.x=view.place==='room'?p.x-places.place.w/2:p.x;view.z=view.place==='room'?p.z-places.place.d*.42:p.z;}if(!view.place)view.zoom=on?Math.max(view.zoom,canvas.clientWidth>=740?2.3:1.35):1;if(!on)restoreCast();frame();return result;},
    },
    sendTo(plotIndex) { const p = PLOTS[plotIndex], a = nearestActor(p.x, p.z); a?.queue.push({ x: p.x - 0.9, z: p.z + 0.4 }); },
    tapPumpkin() { tapPulse = 1; floatText("✦", BIG_PUMPKIN.x, 3.6, BIG_PUMPKIN.z, "spark"); },
    // A sale: Skyla reacts, and the takings float up from whichever counter you can see.
    sale(amount, route) {
      paying = 1.2;
      if (route === "hollow-ticket") { if (view.place === "foyer") floatText("+£" + amount, -2, 2, 0, "coin"); else if (!view.place) floatText("+£" + amount, HOLLOW_PROPERTY.x, 2.8, HOLLOW_PROPERTY.door[1], "coin"); return; }
      if (route === "hayride-ticket") { if (!view.place) floatText("+£" + amount, HAYRIDE_SITE.rearEntry.x, 2.5, HAYRIDE_SITE.rearEntry.z, "coin"); return; }
      if (route === "festival-cocoa" && !view.place) { floatText("+£" + amount, MEADOW.counter[0], 2.2, MEADOW.counter[1], "coin"); return; }
      if (route === "takeaway") { if (!view.place) floatText("+£" + amount, COOKING_SITE.marker.x, 2.6, COOKING_SITE.marker.z, "coin"); return; }
      if ((route === "shop" || route === "food") && view.place === "shop") floatText("+£" + amount, ORIGIN.shop.x + 7.6, 2.6, ORIGIN.shop.z + 2.6, "coin");
      else if (!view.place) floatText("+£" + amount, SHOP.x - 0.2, 2.6, SHOP.counterZ + 0.6, "coin");
    },
    // A line said in a meadow chat: the marker pulses, and the speaker bobs.
    chatLine(e) {
      const spot = CHAT_SPOTS.find((p) => p.id === e.spot); if (!spot) return;
      const mark = chatMark(spot), entry = visitorModels.get(e.visitor);
      mark.pulse = time; mark.line = { visitor: e.visitor, until: time + 2.6 }; mark.bubble.textContent = e.text;
      if (entry) entry.speakUntil = time + 1.1;
    },
    get chatMarkers() { return [...chatMarks].filter(([, m]) => !m.button.hidden).map(([id, m]) => ({ id, rect: m.button.getBoundingClientRect().toJSON(), bubble: !m.bubble.hidden })); },
    // A finished hands-on job (play mode): a burst at the spot, and a word.
    actionBurst(kind, x, z) {
      if (view.place) return; actionFx.burst(kind, x, z);
      const word = { plant: "Planted", water: "+12% growth", clean: "Tidy!" }[kind];
      if (word) floatText(word, x, 1.25, z, kind === "water" ? "water" : "crop");
    },
    harvested(i, n = 1) { if (!view.place) { const p = PLOTS[i]; floatText("+" + n, p.x, 1.4, p.z, "crop"); } },
    // A visitor's remark at the stall, and other words floating up from the farm.
    say(text) { if (!view.place && time >= nextSpeechAt && !document.body.classList.contains("menu-open") && !fx.some(f => f.el.classList.contains("speech"))) { nextSpeechAt = time + 9; floatText(text, SHOP.x - 2.4, 3.6, SHOP.counterZ + 1.8, "speech"); } },
    float(text, at, cls = "") { if (!view.place) floatText(text, at.x, 2, at.z, cls); },
    // Floats a word over a point in whichever place is showing (the garden's beds).
    floatHere(text, x, y, z, cls = "") { floatText(text, x, y, z, cls); },
    portrait(id) { return sheets && id ? portraitURL(sheets, id) : null; },
    refreshLooks() { placeActor("natalie"); placeActor("shane"); places.refresh(); gardenPlay.release(); },
    // Stepping inside: a room of the cottage, or the shop floor. leavePlace() comes back out.
    enter(kind, id) {
      cancelGesture();
      if (view.place === "maze") mazeView.leave();
      if (view.place === "hayride") hayrideView.leave();
      if (!view.place) farmView = { x: view.x, z: view.z, zoom: view.zoom };
      if (view.place === "estate") estateView.leave();
      if (view.place === "foyer") foyerView.leave();
      if (view.place === "carving") carvingView.leave();
      view.place = kind; playerOrbit.yaw=0;playerOrbit.pitch=kind==="room"?INTERIOR.pitch:PITCH;
      if (kind === "estate") { places.leave(); estateView.enter(); }
      else if (kind === "carving") { places.leave(); carvingView.enter(); }
      else if (kind === "foyer") { places.leave(); foyerView.enter(); }
      else if (kind === "maze") { places.leave(); mazeView.enter(id.config, id.options); }
      else if (kind === "hayride") { places.leave(); hayrideWorld.sync(); hayrideView.enter(id ?? {}); }
      else if (kind === "room") places.enterRoom(id); else places.enterShop();
      Object.assign(view, { x: 0, z: 0, zoom: 1, reach: { x: 0, z: 0 } }); glide = null;
      // The bench draws at a sharper pixel ratio than the rest (renderSizing's `close`).
      if (kind === "carving" || renderer.getPixelRatio() !== renderSizing(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio, renderQuality).pixelRatio) resize(); else frame();
    },
    leavePlace() {
      if (!view.place) return;
      cancelGesture(); if (view.place === "maze") mazeView.leave();
      if (view.place === "hayride") hayrideView.leave();
      if (view.place === "estate") estateView.leave();
      if (view.place === "foyer") foyerView.leave();
      if (view.place === "carving") carvingView.leave();
      places.leave();
      view.place = null; glide = null; playerOrbit.yaw=0;playerOrbit.pitch=PITCH;
      Object.assign(view, farmView ?? { x: (fieldWidth(state) + HOLLOW_PROPERTY.westEdge) / 2, z: 8.4, zoom: 1 });
      if (renderer.getPixelRatio() !== renderSizing(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio, renderQuality).pixelRatio) resize(); else frame();
    },
    get place() { return view.place === "carving" ? { kind: "carving", id: "bench" } : view.place === "hayride" ? { kind: "hayride", id: "woodland" } : view.place === "maze" ? { kind: "maze", id: "hollow-ride" } : view.place === "estate" ? { kind: "estate", id: "garden" } : view.place === "foyer" ? { kind: "foyer", id: "hollow" } : places.place; },
    get lastPick() { return lastPick; },
    get visitorStatus() { return [...visitorModels].map(([id,e]) => ({ id, kind: state.visitors.find(v=>v.id===id)?.kind, visible: e.m.visible, sprite: e.sprite, leadingLeg: e.m.userData.leadingLeg, frames: e.m.userData.walk?.length ?? 0, frame: e.m.userData.walk?.indexOf(e.m.userData.shown) ?? -1, x: e.m.position.x, z: e.m.position.z })); },
    get farmExpansionStatus() { return farmExpansion.status; },
    get festivalStatus() { return festivalWorld.status; },
    get hollowExteriorStatus() { return hollowFarm.status; },
    get hayrideStatus() { return hayrideWorld.status; },
    get kitchenStatus() { return places.kitchenStatus; },
    get petsStatus() { return places.petsStatus; },
    get cookingStatus() { return { ...cookingWorld.status, displays: places.foodDisplayStatus, receiver: actors.shane?.delivery ?? null, receiverStatus: actors.shane?.delivery ? { order: actors.shane.delivery, x: actors.shane.model.position.x, z: actors.shane.model.position.z, waiting: !!actors.shane.queue[0]?.receive && Math.hypot(actors.shane.model.position.x - 39.65, actors.shane.model.position.z - 4.45) <= .12 } : null }; },
    get cameraFraming() { return { zoom: view.zoom, x: view.x, z: view.z, span: camera.right - camera.left, roomDistance: view.roomDist, overview: cameraLayout(canvas.clientWidth).overview, width: canvas.clientWidth, height: canvas.clientHeight, playerLook: { ...playerLook }, playerOrbit: {...playerOrbit,active:orbiting()} }; },
    fitView() {
      if (view.place === "maze") { mazeView.setLook(0, 0); mazeView.resize(); return; }
      if (view.place === "hayride") { hayrideView.setLook(0, 0); hayrideView.resize(); return; }
      if (view.place === "estate") { estateView.cameraActions.reset(); return; }
      if (view.place === "foyer") { foyerView.cameraActions.reset(); return; }
      Object.assign(view, { x: view.place ? 0 : cameraLayout(canvas.clientWidth).overview >= .95 ? (farmViewWidth() + HOLLOW_PROPERTY.westEdge) / 2 : 15.5, z: view.place ? 0 : 8.4, zoom: 1 });
      frame();
    },
    refreshRoom() { places.refresh(); },
    refreshEstate() { festivalWorld.sync(); farmExpansion.sync(); frame(); },
    refreshHouseEstate() { if (view.place === "estate") estateView.sync(); },
    // The carving bench's close-up (carving-view.js), for its controls and QA.
    get carving() { return carvingView; },
    previewEstateDecor(data) { estateView.preview(data); },
    get estateCamera() { return estateView.cameraActions; },
    get estateStatus() { return estateView.status; },
    refreshHollow() { hollowFarm.sync(); },
    refreshHayride() { hayrideWorld.sync(); frame(); },
    refreshCooking() { cookingWorld.sync(); places.refreshFood?.(); wilds.sync(); frame(); },
    focusCooking() { if (view.place) return; const p = COOKING_SITE.focus; view.x = p.x; view.z = p.z; view.zoom = canvas.clientWidth < 740 ? 2 : p.zoom ?? 3.2; frame(); },
    // For screenshots and QA: put the farm camera anywhere.
    setView(x, z, zoom = view.zoom) { view.x = x; view.z = z; view.zoom = zoom; frame(); },
    focusHayride() { const p = state.hayride.purchased ? HAYRIDE_SITE.focus : { x: -4, z: 13, zoom: 2 }; view.x = p.x; view.z = p.z; view.zoom = p.zoom; frame(); },
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
    get hayrideRideStatus() { return hayrideView.status; },
    pauseHayrideRide(on) { return hayrideView.setPaused(on); },
    restartHayrideRide(options) { return hayrideView.restart(options); },
    setHayrideOptions(options) { hayrideView.setOptions(options); },
    setHayrideLook(x, y) { hayrideView.setPadLook(x, y); },
    advanceHayrideRide(seconds) { return hayrideView.advanceForTest(seconds); },
    holdHayrideRide(on) { return hayrideView.holdForTest(on); },
    get foyerStatus() { return foyerView.status; },
    // For profiling tools: the farm's three.js objects (tools/perf).
    get debug() { return { scene, renderer, camera, composer, active, activeScene }; },
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
