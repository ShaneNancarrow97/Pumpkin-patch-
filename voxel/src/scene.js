import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Voxels, seeded, vary } from "./voxels.js";
import { pumpkinTemplate, sproutTemplate, bigPumpkin } from "./pumpkins.js";
import { MAP, PLOTS, BIG_PUMPKIN, SHOP, HOMES, ROUTE_IN, ROUTE_OUT, PITCH, buildWorld, buildBackdrop, buildCottage, signBoard } from "./world.js";
import { buildVisitor, animateWalk } from "./characters.js";
import { loadSprites, spriteCharacter, animateSprite, animateSkyla } from "./sprite-voxels.js";
import { loadSpriteSheets, spriteActor, spriteVisitor, animateVisitor, portraitURL } from "./sprite-actors.js";
import { VARIETIES, VISIT, openPlots, activeLook } from "./model.js";
import { createPlaces, ORIGIN } from "./places.js";
import { INTERIOR } from "./interiors.js";
import { loadDecor } from "./decor.js";
import { GRID } from "./model.js";

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
  const patchSign = signBoard("The Pumpkin Patch", "grown with love", 3.6);
  patchSign.position.set(13.4, 3.2, 8.4); scene.add(patchSign);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x1c1418 }));
  post.position.set(11.4, 2.1, 8.4); post.castShadow = true; scene.add(post);
  const shopSign = signBoard("The Honest Pumpkin", "farm shop", 4.2);
  shopSign.position.set(SHOP.x, 6.1, SHOP.z - 2.0); scene.add(shopSign);

  // The big pumpkin.
  const big = bigPumpkin();
  big.position.set(BIG_PUMPKIN.x, 0.5, BIG_PUMPKIN.z);
  scene.add(big);
  const bigLight = new THREE.PointLight(0xffa040, 8, 8, 1.4);
  bigLight.position.set(BIG_PUMPKIN.x, 1.8, BIG_PUMPKIN.z + 2);
  scene.add(bigLight);

  // Plots: mound, sprout, a pumpkin per variety, a glow when ripe, a hit box.
  const pumpkins = VARIETIES.map((_, i) => pumpkinTemplate(i)), sprout = sproutTemplate(), pickables = [];
  // Soft round glow for ripe pumpkins, drawn once.
  const glowCanvas = document.createElement("canvas"); glowCanvas.width = glowCanvas.height = 64;
  const gc = glowCanvas.getContext("2d"), grad = gc.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(1, "rgba(255,255,255,0)");
  gc.fillStyle = grad; gc.fillRect(0, 0, 64, 64);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  const plots = PLOTS.map((p, i) => {
    const g = new THREE.Group(); g.position.set(p.x, 0.04, p.z);
    const mound = new Voxels(); mound.box(-0.7, 0, -0.55, 1.4, 0.12, 1.1, 0x4a2c1c); mound.box(-0.55, 0.12, -0.45, 1.1, 0.06, 0.9, 0x553422);
    g.add(mound.build());
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
  const bigHit = new THREE.Mesh(new THREE.BoxGeometry(4, 3.6, 4), new THREE.MeshBasicMaterial({ visible: false }));
  bigHit.position.set(BIG_PUMPKIN.x, 1.8, BIG_PUMPKIN.z); bigHit.userData = { type: "pumpkin" }; scene.add(bigHit); pickables.push(bigHit);
  const shopHit = new THREE.Mesh(new THREE.BoxGeometry(9, 5, 5.5), new THREE.MeshBasicMaterial({ visible: false }));
  shopHit.position.set(SHOP.x, 2.5, SHOP.z + 0.4); shopHit.userData = { type: "shop" }; scene.add(shopHit); pickables.push(shopHit);
  const homeHit = new THREE.Mesh(new THREE.BoxGeometry(10, 9, 6), new THREE.MeshBasicMaterial({ visible: false }));
  homeHit.position.set(6.5, 4.5, 6.4); homeHit.userData = { type: "home" }; scene.add(homeHit); pickables.push(homeHit);
  // The cottage, rebuilt whenever the house moves up a level.
  let cottage = buildCottage(state.house.level), cottageLevel = state.house.level;
  scene.add(cottage);

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
    const m = voxelCharacters ? spriteCharacter(pixels, who, look, outfit) : spriteActor(sheets, who, look, outfit);
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
    else if (u.kind === "visitor") (u.sprite ? animateVisitor(m, t, moving) : animateWalk(m, t, moving));
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
    for (const entry of visitorModels.values()) { scene.remove(entry.m); entry.m.userData.dispose?.(); }
    visitorModels.clear();                                                            // rebuilt in the new style next frame
    const inside = places.place;
    if (inside?.kind === "room") places.enterRoom(inside.id);
    else if (inside?.kind === "shop") places.enterShop();
  }
  loadSprites().then((data) => { pixels = data; if (voxelCharacters) placeCharacters(); }).catch(() => hooks.onSpriteError?.());
  loadSpriteSheets().then((data) => { sheets = data; if (!voxelCharacters) placeCharacters(); }).catch(() => hooks.onSpriteError?.());

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
  const visitorModels = new Map(), inLen = routeLength(ROUTE_IN), outLen = routeLength(ROUTE_OUT);
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
  const active = () => (view.place ? roomCam : camera);
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
    const o = ORIGIN[view.place], aspect = w / h, p = INTERIOR.pitch, tall = aspect < 1, half = tall ? 3.5 : GRID.w / 2 + 0.4;
    const corners = tall ? [[-half, 5.4, 0], [half, 5.4, 0], [0, -0.1, GRID.d + 0.3]] : [[-half, 5.4, 0], [half, 5.4, 0], [-half, -0.1, GRID.d + 0.3], [half, -0.1, GRID.d + 0.3]];
    const target = new THREE.Vector3(o.x + GRID.w / 2 + view.x, 2, o.z + GRID.d * 0.42 + view.z), dir = new THREE.Vector3(0, Math.sin(p), Math.cos(p));
    probe.fov = INTERIOR.fov; probe.aspect = aspect; probe.near = 0.1; probe.far = 200; probe.updateProjectionMatrix();
    const fits = (dist) => {
      probe.position.copy(target).addScaledVector(dir, dist); probe.lookAt(target); probe.updateMatrixWorld();
      for (const [x, y, z] of corners) {
        corner.set(o.x + GRID.w / 2 + x, y, o.z + z).project(probe);
        if (Math.abs(corner.x) > 1 || Math.abs(corner.y) > 1) return false;
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
    if (view.place) { clampView(); frameRoom(w, h); return; }
    // Show the whole yard, 42 units across, on wide screens; the patch on a portrait phone.
    const span = (aspect >= 1 ? 42 : 17) / view.zoom, halfW = span / 2, halfH = halfW / aspect;
    camera.left = -halfW; camera.right = halfW; camera.top = halfH; camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    clampView();
    const target = new THREE.Vector3(view.x, 0, view.z), dist = 60;
    camera.position.set(target.x, target.y + Math.sin(PITCH) * dist, target.z + Math.cos(PITCH) * dist);
    camera.lookAt(target);
  }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    if (w < 700) view.x = 15.5;                                                      // portrait: frame the pumpkin and the patch
    frame();
  }
  window.addEventListener("resize", resize);
  resize();

  // Input: drag to pan, wheel or pinch to zoom, tap to act.
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(), touches = new Map();
  let drag = null, pinch = null;
  const worldPerPixel = () => (camera.right - camera.left) / canvas.clientWidth;
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 1) drag = { x: e.clientX, y: e.clientY, vx: view.x, vz: view.z, moved: 0 };
    if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom }; drag = null; }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size === 2) { const [a, b] = [...touches.values()]; view.zoom = THREE.MathUtils.clamp(pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, 0.7, 2.6); clampView(); frame(); return; }
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
  const end = (e) => {
    const wasTap = drag && drag.moved < 8 && touches.size === 1;
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
    if (wasTap) {
      const box = canvas.getBoundingClientRect();
      pointer.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
      ray.setFromCamera(pointer, active());
      const hit = ray.intersectObjects(view.place ? places.pickables : pickables, false)[0];
      if (hit) hooks.onPick({ ...hit.object.userData, point: hit.point });
    }
    drag = null;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", (e) => { touches.delete(e.pointerId); drag = null; pinch = null; });
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); view.zoom = THREE.MathUtils.clamp(view.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.7, 2.6); clampView(); frame(); }, { passive: false });
  // Keep the fence at or below the bottom edge (a tall phone shows the sky and
  // hills above instead of empty ground below), and the map's sides in view.
  function clampView() {
    if (view.place) {
      // Offsets from the room's centre: a little way along it, and in or out.
      const along = canvas.clientWidth < canvas.clientHeight ? 2.2 : 1.5;
      view.x = THREE.MathUtils.clamp(view.x, -along, along);
      view.z = THREE.MathUtils.clamp(view.z, -1.2, 1.2);
      view.zoom = THREE.MathUtils.clamp(view.zoom, 0.85, 1.9);
      return;
    }
    const halfW = camera.right, depthHalf = camera.top / Math.sin(PITCH);
    const maxZ = MAP.d + 1 - depthHalf, maxX = MAP.w + 1 - halfW, minX = halfW - 1;
    view.z = Math.min(maxZ, Math.max(view.z, Math.min(maxZ, 6)));
    view.x = minX > maxX ? MAP.w / 2 : THREE.MathUtils.clamp(view.x, minX, maxX);
  }

  // Floating "+£12" and sparkle effects, as DOM labels projected from the world.
  const fx = [];
  function floatText(text, x, y, z, cls = "") {
    const el = document.createElement("div");
    el.className = "float-text " + cls; el.textContent = text;
    document.getElementById("fx").append(el);
    fx.push({ el, pos: new THREE.Vector3(x, y, z), t: 0, life: cls === "speech" ? 2.8 : 1.4 });
  }
  const project = (p) => { const v = p.clone().project(active()); return { x: (v.x + 1) / 2 * canvas.clientWidth, y: (1 - v.y) / 2 * canvas.clientHeight }; };

  let tapPulse = 0, last = performance.now(), time = 0;
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
    bigLight.intensity = 7 + Math.sin(time * 2.2) * 1.5 + tapPulse * 8;

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

    // Visitors along the stone path.
    for (const v of state.visitors) {
      let entry = visitorModels.get(v.id);
      if (!entry) { const m = visitorModel(v.kind); scene.add(m); entry = { m, sprite: m.userData.sprite, bag: null }; visitorModels.set(v.id, entry); }
      const leaving = v.leaveAt !== null && v.age >= v.leaveAt;
      const p = leaving ? along(ROUTE_OUT, (v.age - v.leaveAt) / VISIT.leave * outLen) : along(ROUTE_IN, Math.min(1, v.age / VISIT.arrive) * inLen);
      entry.m.position.set(p.x, 0.04, p.z);
      const walking = leaving || v.age < VISIT.arrive;
      if (entry.sprite) animateVisitor(entry.m, v.age, walking);
      else {
        entry.m.rotation.y = walking ? Math.atan2(p.dx, p.dz) : Math.PI;              // at the counter they face Skyla
        animateWalk(entry.m, time + v.id, walking);
      }
      if (v.bought !== null && !entry.bag) { entry.bag = carried[v.bought].clone(); entry.bag.position.set(entry.sprite ? 0.36 : 0.45, entry.sprite ? 0.45 : 0.6, entry.sprite ? 0.3 : 0.2); entry.m.add(entry.bag); }
    }
    for (const [id, entry] of visitorModels) if (!state.visitors.some((v) => v.id === id)) { scene.remove(entry.m); entry.m.userData.dispose?.(); visitorModels.delete(id); }

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
    if (state.house.level !== cottageLevel) {
      scene.remove(cottage);
      cottage.traverse((o) => o.geometry?.dispose?.());
      cottage = buildCottage((cottageLevel = state.house.level));
      scene.add(cottage);
    }

    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt;
      const s = project(f.pos.clone().setY(f.pos.y + f.t * (f.life > 2 ? 0.4 : 1.2)));
      f.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`;
      f.el.style.opacity = String(Math.max(0, 1 - f.t / f.life));
      if (f.t > f.life) { f.el.remove(); fx.splice(i, 1); }
    }

    if (bloomOn) composer.render(); else renderer.render(scene, active());
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return {
    sendTo(plotIndex) { const p = PLOTS[plotIndex], a = nearestActor(p.x, p.z); a?.queue.push({ x: p.x - 0.9, z: p.z + 0.4 }); },
    tapPumpkin() { tapPulse = 1; floatText("✦", BIG_PUMPKIN.x, 3.6, BIG_PUMPKIN.z, "spark"); },
    // A sale: Skyla reacts, and the takings float up from whichever counter you can see.
    sale(amount, route) {
      paying = 1.2;
      if (route === "shop" && view.place === "shop") floatText("+£" + amount, ORIGIN.shop.x + 7.6, 2.6, ORIGIN.shop.z + 2.6, "coin");
      else if (!view.place) floatText("+£" + amount, SHOP.x - 0.2, 2.6, SHOP.counterZ + 0.6, "coin");
    },
    harvested(i, n = 1) { const p = PLOTS[i]; floatText("+" + n, p.x, 1.4, p.z, "crop"); },
    // A visitor's remark at the stall, and other words floating up from the farm.
    say(text) { if (!view.place) floatText(text, SHOP.x - 2.4, 3.6, SHOP.counterZ + 1.8, "speech"); },
    float(text, at, cls = "") { if (!view.place) floatText(text, at.x, 2, at.z, cls); },
    portrait(id) { return sheets && id ? portraitURL(sheets, id) : null; },
    refreshLooks() { placeActor("natalie"); placeActor("shane"); places.refresh(); },
    // Stepping inside: a room of the cottage, or the shop floor. leavePlace() comes back out.
    enter(kind, id) {
      if (!view.place) farmView = { x: view.x, z: view.z, zoom: view.zoom };
      view.place = kind;
      if (kind === "room") places.enterRoom(id); else places.enterShop();
      Object.assign(view, { x: 0, z: 0, zoom: 1 });
      frame();
    },
    leavePlace() {
      if (!view.place) return;
      places.leave();
      view.place = null;
      Object.assign(view, farmView ?? { x: 20, z: 8.4, zoom: 1 });
      frame();
    },
    get place() { return places.place; },
    refreshRoom() { places.refresh(); },
    selectPiece(instance) { places.select(instance); },
    previewPiece(instance, x, z, ok) { places.preview(instance, x, z, ok); },
    showGrid(on) { places.setGrid(on); },
    cellAt(point, type) { return places.cellAt(point, type); },
    screenPoint(x, y, z) { return project(new THREE.Vector3(x, y, z)); },
    // Just above their heads: they lean back so they stand 2.3 tall on screen, which a point straight up from the feet reaches at 2.3 / cos(PITCH).
    actorPosition(who) { const p = actors[who]?.model.position ?? new THREE.Vector3(HOMES[who].x, 0, HOMES[who].z); return project(new THREE.Vector3(p.x, 2.5 / Math.cos(PITCH), p.z)); },
    focus(x, z, zoom = view.zoom) { view.x = x; view.z = z; view.zoom = zoom; frame(); },          // frame() clamps once the new zoom is in
    setBloom(on) { bloomOn = on; },
    setVoxelCharacters(on) { if (on !== voxelCharacters) { voxelCharacters = on; placeCharacters(); } },
    get characterStyle() { return skyla ? (voxelCharacters ? "voxels" : "sprites") : "loading"; },
    setShadows(on) { renderer.shadowMap.enabled = on; scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); },
    renderer,
  };
}
