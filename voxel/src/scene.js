import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Voxels, seeded, vary } from "./voxels.js";
import { MAP, PLOTS, BIG_PUMPKIN, SHOP, HOMES, ROUTE_IN, ROUTE_OUT, buildWorld, signBoard } from "./world.js";
import { V, buildNatalie, buildShane, buildSkyla, buildVisitor, animateWalk } from "./characters.js";
import { VARIETIES, VISIT, LOOKS, openPlots } from "./model.js";

const PITCH = THREE.MathUtils.degToRad(40), WALK = 2.4;

function routeLength(route) { let n = 0; for (let i = 1; i < route.length; i++) n += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]); return n; }
function along(route, d) {
  for (let i = 1; i < route.length; i++) {
    const [ax, az] = route[i - 1], [bx, bz] = route[i], step = Math.hypot(bx - ax, bz - az);
    if (d <= step) { const t = step ? d / step : 0; return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx: bx - ax, dz: bz - az }; }
    d -= step;
  }
  const [x, z] = route[route.length - 1]; return { x, z, dx: 0, dz: 1 };
}

// Pumpkins for the plots, one template per variety, cloned per plot.
export function pumpkinTemplate(variety, size = 0.62) {
  const v = new Voxels(), r = seeded(variety + 3), n = 5, s = size / n;
  const color = VARIETIES[variety].color, rib = new THREE.Color(color).multiplyScalar(0.78).getHex();
  for (let x = -n; x < n; x++) for (let y = 0; y < n * 1.5; y++) for (let z = -n; z < n; z++) {
    const nx = (x + 0.5) / n, ny = (y + 0.5 - n * 0.75) / (n * 0.75), nz = (z + 0.5) / n;
    if (nx * nx + ny * ny + nz * nz > 1) continue;
    const ribbed = Math.abs(Math.sin(Math.atan2(nz, nx) * 4)) < 0.3;
    v.box(x * s, y * s, z * s, s, s, s, vary(ribbed ? rib : color, 0.05, r));
  }
  v.box(-s / 2, n * 1.5 * s, -s / 2, s, s * 2.2, s, 0x5a4a1e);
  v.box(0, n * 1.5 * s + s, -s / 2, s * 2.2, s * 0.4, s * 1.4, 0x4d6a2a);           // leaf
  return v.build();
}
function sproutTemplate() {
  const v = new Voxels();
  v.box(-0.04, 0, -0.04, 0.08, 0.32, 0.08, 0x5c8a3a);
  v.box(-0.2, 0.26, -0.06, 0.18, 0.06, 0.12, 0x6fa046); v.box(0.02, 0.32, -0.06, 0.18, 0.06, 0.12, 0x6fa046);
  return v.build();
}

// The giant jack-o'-lantern: a ribbed voxel sphere with a glowing carved face.
function bigPumpkin() {
  const v = new Voxels(), r = seeded(99), n = 9, s = 0.19;
  for (let x = -n; x < n; x++) for (let y = 0; y < n * 1.7; y++) for (let z = -n; z < n; z++) {
    const nx = (x + 0.5) / n, ny = (y + 0.5 - n * 0.85) / (n * 0.85), nz = (z + 0.5) / n;
    const d = nx * nx + ny * ny + nz * nz;
    if (d > 1 || d < 0.72) continue;                                                  // hollow shell
    const front = nz > 0.6, eye = front && ny > 0.05 && ny < 0.42 && Math.abs(Math.abs(nx) - 0.38) < 0.2 - (ny - 0.05) * 0.4;
    const mouth = front && ny < -0.12 && ny > -0.48 && Math.abs(nx) < 0.62 && !(ny > -0.24 && Math.abs(Math.abs(nx) - 0.25) < 0.08);
    if (eye || mouth) { v.box(x * s, y * s, z * s, s, s, s, 0xff9a2a, true); continue; }
    const ribbed = Math.abs(Math.sin(Math.atan2(nz, nx) * 5)) < 0.28;
    v.box(x * s, y * s, z * s, s, s, s, vary(ribbed ? 0xc0561a : 0xf0821e, 0.05, r));
  }
  v.box(-0.12, n * 1.7 * s - 0.05, -0.12, 0.26, 0.6, 0.26, 0x4a3a1a);
  v.box(0.1, n * 1.7 * s + 0.2, -0.3, 0.7, 0.08, 0.5, 0x4d6a2a);
  const g = v.build();
  return g;
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
    const lamp = new THREE.PointLight(0xffa858, 9, 7, 1.6);
    lamp.position.set(l.x, l.y, l.z);
    scene.add(lamp);
  }
  // The moon and its halo, high over the hills.
  const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: 0xf2eaff, toneMapped: false }));
  moonDisc.position.set(34, 14, -16); scene.add(moonDisc);
  const bite = new THREE.Mesh(new THREE.CircleGeometry(2.0, 32), new THREE.MeshBasicMaterial({ color: 0x150f24 }));
  bite.position.set(34.8, 14.6, -15.9); scene.add(bite);

  // Signs.
  const patchSign = signBoard("The Pumpkin Patch", "grown with love", 3.6);
  patchSign.position.set(13.4, 3.2, 8.4); scene.add(patchSign);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x1c1418 }));
  post.position.set(11.4, 2.1, 8.4); post.castShadow = true; scene.add(post);
  const shopSign = signBoard("The Honest Pumpkin", "farm shop", 4.2);
  shopSign.position.set(SHOP.x, 5.6, SHOP.z - 0.6); scene.add(shopSign);

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
  const homeHit = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  homeHit.position.set(7, 4, 6.4); homeHit.userData = { type: "home" }; scene.add(homeHit); pickables.push(homeHit);

  // Skyla on the counter.
  const skyla = buildSkyla(); skyla.position.set(SHOP.x + 1.1, 1.3, SHOP.counterZ - 0.5); skyla.rotation.y = -0.25; scene.add(skyla);
  skyla.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });

  // Shane and Natalie.
  const actors = {};
  function placeActor(who) {
    const old = actors[who];
    const look = who === "natalie" ? LOOKS.natalie.find((l) => l.id === state.looks.natalie) : LOOKS.shane.find((l) => l.id === state.looks.shane);
    const model = who === "natalie" ? buildNatalie(look) : buildShane(look);
    model.position.set(old?.model.position.x ?? HOMES[who].x, 0.04, old?.model.position.z ?? HOMES[who].z);
    model.rotation.y = old?.model.rotation.y ?? 0;
    if (old) scene.remove(old.model);
    const hit = old?.hit ?? new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 1.1), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData = { type: "talk", who };
    if (!old) { scene.add(hit); pickables.push(hit); }
    scene.add(model);
    actors[who] = { model, hit, queue: old?.queue ?? [], moving: false, work: 0 };
  }
  placeActor("natalie"); placeActor("shane");
  const nearestActor = (x, z) => Object.values(actors).sort((a, b) => (Math.hypot(a.model.position.x - x, a.model.position.z - z) + a.queue.length * 4) - (Math.hypot(b.model.position.x - x, b.model.position.z - z) + b.queue.length * 4))[0];

  // Visitors.
  const visitorModels = new Map(), inLen = routeLength(ROUTE_IN), outLen = routeLength(ROUTE_OUT);
  const carried = pumpkins.map((t) => { const m = t.clone(); m.scale.setScalar(0.5); return m; });

  // Fireflies drifting over the field.
  const flyCount = 70, flyGeo = new THREE.BufferGeometry(), flySeed = seeded(5), flyBase = new Float32Array(flyCount * 3);
  for (let i = 0; i < flyCount; i++) flyBase.set([2 + flySeed() * 36, 0.6 + flySeed() * 2.6, 3 + flySeed() * 21], i * 3);
  flyGeo.setAttribute("position", new THREE.BufferAttribute(flyBase.slice(), 3));
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ color: 0xffe08a, size: 0.12, transparent: true, opacity: 0.9, toneMapped: false }));
  scene.add(flies);

  // Camera: orthographic, looking down at a gentle angle, pannable and zoomable.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  const view = { x: 20, z: 13.5, zoom: 1 };
  let bloomOn = true;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function frame() {
    const w = canvas.clientWidth, h = canvas.clientHeight, aspect = w / h;
    // Show the whole patch: about 26 units across on wide screens, 15 on a portrait phone.
    const span = (aspect >= 1 ? 32 : 17) / view.zoom, halfW = span / 2, halfH = halfW / aspect;
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
    view.x = drag.vx - dx * k; view.z = drag.vz - dy * k / Math.sin(PITCH);
    clampView(); frame();
  });
  const end = (e) => {
    const wasTap = drag && drag.moved < 8 && touches.size === 1;
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
    if (wasTap) {
      const box = canvas.getBoundingClientRect();
      pointer.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      if (hit) hooks.onPick(hit.object.userData);
    }
    drag = null;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", (e) => { touches.delete(e.pointerId); drag = null; pinch = null; });
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); view.zoom = THREE.MathUtils.clamp(view.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.7, 2.6); clampView(); frame(); }, { passive: false });
  // Keep the fence at or below the bottom edge (a tall phone shows the sky and
  // hills above instead of empty ground below), and the map's sides in view.
  function clampView() {
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
    fx.push({ el, pos: new THREE.Vector3(x, y, z), t: 0 });
  }
  const project = (p) => { const v = p.clone().project(camera); return { x: (v.x + 1) / 2 * canvas.clientWidth, y: (1 - v.y) / 2 * canvas.clientHeight }; };

  let tapPulse = 0, last = performance.now(), time = 0;
  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now; time += dt;
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
      else if (d > 0.12) { const step = Math.min(d, WALK * dt); pos.x += dx / d * step; pos.z += dz / d * step; a.model.rotation.y = Math.atan2(dx, dz); }
      else if (a.queue.length) { a.queue.shift(); a.work = 0.5; }
      else a.model.rotation.y += (0 - a.model.rotation.y) * Math.min(1, dt * 3);
      animateWalk(a.model, time, a.moving);
      a.hit.position.set(pos.x, 1.1, pos.z);
    }

    // Visitors along the stone path.
    for (const v of state.visitors) {
      let entry = visitorModels.get(v.id);
      if (!entry) { const m = buildVisitor(v.kind); m.traverse((o) => o.isMesh && (o.castShadow = true)); scene.add(m); entry = { m, bag: null }; visitorModels.set(v.id, entry); }
      const leaving = v.leaveAt !== null && v.age >= v.leaveAt;
      const p = leaving ? along(ROUTE_OUT, (v.age - v.leaveAt) / VISIT.leave * outLen) : along(ROUTE_IN, Math.min(1, v.age / VISIT.arrive) * inLen);
      entry.m.position.set(p.x, 0.04, p.z);
      const walking = leaving || v.age < VISIT.arrive;
      entry.m.rotation.y = walking ? Math.atan2(p.dx, p.dz) : Math.PI;                // at the counter they face Skyla
      animateWalk(entry.m, time + v.id, walking);
      if (v.bought !== null && !entry.bag) { entry.bag = carried[v.bought].clone(); entry.bag.position.set(0.45, 0.6, 0.2); entry.m.add(entry.bag); }
    }
    for (const [id, entry] of visitorModels) if (!state.visitors.some((v) => v.id === id)) { scene.remove(entry.m); visitorModels.delete(id); }

    // Fireflies.
    const fp = flies.geometry.attributes.position;
    for (let i = 0; i < flyCount; i++) {
      fp.array[i * 3] = flyBase[i * 3] + Math.sin(time * 0.6 + i) * 0.6;
      fp.array[i * 3 + 1] = flyBase[i * 3 + 1] + Math.sin(time * 1.3 + i * 2) * 0.25;
      fp.array[i * 3 + 2] = flyBase[i * 3 + 2] + Math.cos(time * 0.5 + i) * 0.6;
    }
    fp.needsUpdate = true;
    flies.material.opacity = 0.6 + Math.sin(time * 4) * 0.3;
    skyla.rotation.y = -0.25 + Math.sin(time * 0.7) * 0.15;

    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt;
      const s = project(f.pos.clone().setY(f.pos.y + f.t * 1.2));
      f.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`;
      f.el.style.opacity = String(Math.max(0, 1 - f.t / 1.4));
      if (f.t > 1.4) { f.el.remove(); fx.splice(i, 1); }
    }

    if (bloomOn) composer.render(); else renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return {
    sendTo(plotIndex) { const p = PLOTS[plotIndex], a = nearestActor(p.x, p.z); a.queue.push({ x: p.x - 0.9, z: p.z + 0.4 }); },
    tapPumpkin() { tapPulse = 1; floatText("✦", BIG_PUMPKIN.x, 3.6, BIG_PUMPKIN.z, "spark"); },
    sale(amount) { floatText("+£" + amount, SHOP.x - 0.2, 2.6, SHOP.counterZ + 0.6, "coin"); },
    harvested(i) { const p = PLOTS[i]; floatText("+1", p.x, 1.4, p.z, "crop"); },
    refreshLooks() { placeActor("natalie"); placeActor("shane"); },
    screenPoint(x, y, z) { return project(new THREE.Vector3(x, y, z)); },
    actorPosition(who) { const p = actors[who].model.position; return project(new THREE.Vector3(p.x, 2.4, p.z)); },
    focus(x, z, zoom = view.zoom) { view.x = x; view.z = z; view.zoom = zoom; clampView(); frame(); },
    setBloom(on) { bloomOn = on; },
    setShadows(on) { renderer.shadowMap.enabled = on; scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); },
    renderer,
  };
}
