import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Voxels, seeded, vary } from "./voxels.js";
import { carvingPumpkin, carvingSurface } from "./pumpkins.js";
import { STENCIL_BY_ID, CARVING_DECOR, CARVING, inPiece, pieceOutline } from "./content/carving.js";
import { disposeEstateObject } from "./house-estate-world.js";

// The carving bench, up close: its own scene, where the pumpkin sits on the
// bench to be turned, stencilled, cut and dressed (rules/carving.js holds the
// session; this only draws it and reads the knife).
//
// The stencil is laid on the rind as dotted outlines. Dragging the knife along
// an outline cuts it; when nine tenths of a piece's outline is cut, hooks.onCut
// is told, the pumpkin is rebuilt with that piece gone and the piece pops out
// and tumbles off the bench. Holding the trace button (or E / A) runs the knife
// round the nearest uncut outline for keyboard, pad and anyone who'd rather.
const SIZE = 1.8, R = 22, KNIFE = .075, TRACE_SPEED = .75;

function benchModel() {
  const v = new Voxels(), r = seeded(733);
  for (let z = -1.4; z < 1.4; z += .32) v.box(-2.6, -.18, z, 5.2, .18, .3, vary(0x7a5640, .07, r));
  v.box(-2.6, -.5, -1.4, 5.2, .32, 2.8, 0x3b2a22);
  // Newspaper, the stencil sheet and pens, a bowl of seeds, scoops, a lantern.
  v.box(-1.15, 0, -.95, 2.3, .01, 1.7, 0xd6cfbc); for (let z = -.8; z < .6; z += .12) v.box(-1.05, .011, z, .9, .004, .03, 0x8d8779);
  v.box(-2.35, 0, .25, .9, .012, 1.1, 0xf1e6c8); for (const [x, z] of [[-2.1, .5], [-1.8, .55], [-1.95, .85]]) v.box(x, .013, z, .12, .004, .1, 0x2c2430);
  v.box(-1.95, 0, -.3, .08, .06, .5, 0x2c2430); v.box(-1.95, .06, -.3, .08, .02, .08, 0xcaa269);
  for (let i = 0; i < 9; i++) { const a = i * .7; v.box(1.75 + Math.cos(a) * .2, .02, -.5 + Math.sin(a) * .2, .07, .05, .05, 0xf2e3b5); }
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; v.box(1.75 + Math.cos(a) * .32 - .06, 0, -.5 + Math.sin(a) * .32 - .06, .12, .14, .12, 0xb46a3c); }
  v.box(1.4, 0, .45, .7, .03, .1, 0x9c9fa8); v.box(2.1, 0, .44, .28, .06, .12, 0x3d2c22);
  v.box(1.35, 0, .78, .1, .04, .5, 0x9c9fa8); v.box(1.3, 0, 1.2, .2, .05, .16, 0x9c9fa8);
  v.box(2.05, 0, -1.25, .36, .08, .36, 0x342c35); v.box(2.1, .08, -1.2, .26, .34, .26, 0xffbd65, true); v.box(2.05, .42, -1.25, .36, .07, .36, 0x342c35);
  return v.build();
}
// A garden at night behind the bench: dark trees, a fence and a moon.
function backdropModel() {
  const v = new Voxels(), r = seeded(519);
  for (let i = 0; i < 16; i++) {
    const x = -9 + i * 1.2 + r() * .5, z = -7 - r() * 3, h = 2.5 + r() * 3.5;
    v.box(x - .12, -2, z, .24, h, .24, 0x1d1620);
    for (let k = 0; k < 5; k++) v.box(x - .7 + r() * .6, h - 2 + k * .4, z - .3, .9 + r() * .4, .5, .6, vary(0x1f2a26, .1, r));
  }
  for (let x = -8; x < 8; x += .45) { v.box(x, -1.4, -5.2, .08, 1.4, .08, 0x2a2230); v.box(x, -.6, -5.2, .45, .05, .05, 0x2a2230); }
  v.box(4.6, 4.4, -11, 1.4, 1.4, .2, 0xe8e0c8, true);
  return v.build();
}
function knifeModel() {
  const v = new Voxels();
  v.box(-.012, 0, -.03, .024, .32, .06, 0xd7dbe4); v.box(-.012, .26, -.02, .024, .1, .04, 0xeef1f6);
  v.box(-.03, -.2, -.035, .06, .2, .07, 0x3d2c22); v.box(-.034, -.02, -.04, .068, .03, .08, 0xcaa269);
  const g = v.build(); return g;
}
// Hats, extras and stands, built round a pumpkin of the given surface.
function dressing(decor, surf, stemTop, r = seeded(91)) {
  // Hats sit on the crown, over the stem; the bow ties round the stem's foot.
  const v = new Voxels(), w = SIZE / 2, top = surf.height * .94;
  const disc = (y, rad, h, c, glow = false) => { for (let i = 0; i < 8; i++) { const a = i * Math.PI / 8; v.block(0, y, 0, rad * 2 * Math.abs(Math.cos(a)) + .02, h, rad * 2 * Math.abs(Math.sin(a)) + .02, c, glow); } };
  if (decor.hat === "witch") {
    disc(top - .02, .56, .05, 0x1e1a24); disc(top + .03, .28, .1, 0x5d3a7a);
    for (let i = 0; i < 9; i++) disc(top + .13 + i * .09, .27 - i * .028, .09, 0x221d29);
    v.block(.08, top + .95, .02, .07, .06, .07, 0x221d29); v.block(0, top + .05, .29, .1, .08, .02, 0xcaa269);
  } else if (decor.hat === "top") {
    disc(top - .02, .42, .045, 0x15121a); for (let i = 0; i < 6; i++) disc(top + .03 + i * .08, .25, .08, 0x1c1822); disc(top + .1, .255, .08, 0x9b2335); disc(top + .5, .26, .03, 0x221e28);
  } else if (decor.hat === "bow") {
    for (const s of [-1, 1]) { v.block(s * .14, top - .06, 0, .2, .16, .08, 0x7d2f8a); v.block(s * .24, top - .03, 0, .06, .1, .09, 0x5e2268); }
    v.block(0, top - .06, 0, .09, .13, .1, 0x5e2268);
  } else if (decor.hat === "crown") {
    disc(top - .03, .3, .11, 0xcaa269);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; v.block(Math.cos(a) * .27, top + .08, Math.sin(a) * .27, .07, .14, .07, 0xe0bd73); v.block(Math.cos(a) * .27, top + .02, Math.sin(a) * .27, .06, .05, .06, [0xb8344a, 0x3b6fc4, 0x3fa36a][i % 3], true); }
  }
  const ex = decor.extras ?? [];
  if (ex.includes("leaves")) for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 + r() * .2, d = w * 1.05 + r() * .25; v.block(Math.cos(a) * d, .002, Math.sin(a) * d, .16, .02, .11, [0xb8402e, 0xd8782e, 0xe7b23a, 0x8a3a2a][i % 4]); }
  if (ex.includes("candles")) for (let i = 0; i < 5; i++) { const a = -Math.PI * .1 - i * Math.PI * .2, d = w * 1.25; v.block(Math.cos(a) * d, 0, Math.sin(a) * d + .1, .1, .06, .1, 0xe8e2d4); v.block(Math.cos(a) * d, .06, Math.sin(a) * d + .1, .03, .05, .03, 0xffc463, true); }
  if (ex.includes("bolts")) for (const s of [-1, 1]) { v.block(s * (w * .98), surf.height * .45, 0, .1, .07, .07, 0x9aa0aa); v.block(s * (w * .98 + .06), surf.height * .45, 0, .04, .12, .12, 0x6e7480); }
  if (ex.includes("spider")) { const y = surf.height * .82, x = w * .55; v.block(x, y, .3, .1, .07, .12, 0x15121a); v.block(x, y + .03, .37, .06, .05, .06, 0x15121a); for (const s of [-1, 1]) for (let k = 0; k < 4; k++) v.block(x + s * .07, y + .01, .26 + k * .035, .06, .015, .015, 0x15121a); v.block(x, y + .07, .3, .006, top - y + .3, .006, 0xd8d8e0); for (const s of [-1, 1]) v.block(x + s * .02, y + .05, .4, .012, .012, .01, 0xff6a5a, true); }
  if (ex.includes("glitter")) for (let i = 0; i < 46; i++) { const u = (r() * 2 - 1) * .95, vv = (r() * 2 - 1) * .9, z = surf.frontZ(u, vv); if (z === null) continue; const side = r() < .5 ? 1 : -1, zz = side > 0 ? z + .008 : -z - .008; v.block(u * w, (vv + 1) * surf.height / 2, zz, .025, .025, .01, [0xffe9a8, 0xd6c2ff, 0xffffff][i % 3], true); }
  return v.build();
}
function standModel(stand) {
  const v = new Voxels(), r = seeded(17);
  if (stand === "hay") { v.block(0, 0, 0, 1.6, .3, 1.2, vary(0xc9a65a, .05, r)); for (const x of [-.4, .4]) v.block(x, -.005, 0, .05, .31, 1.21, 0x9c7a3b); for (let i = 0; i < 10; i++) v.block(-.7 + r() * 1.4, .29, -.5 + r() * 1, .2, .03, .04, 0xe2c27a); return { group: v.build(), height: .3 }; }
  if (stand === "plinth") { v.block(0, 0, 0, 1.3, .12, 1.3, 0x77727f); v.block(0, .12, 0, 1.05, .24, 1.05, 0x99919b); v.block(0, .36, 0, 1.2, .08, 1.2, 0x8a8492); return { group: v.build(), height: .44 }; }
  return { group: null, height: 0 };
}

export function createCarvingView(canvas, state, hooks = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x120d18); scene.fog = new THREE.Fog(0x120d18, 9, 22);
  scene.add(new THREE.HemisphereLight(0xb9a6e0, 0x2a1d1a, .85));
  const key = new THREE.SpotLight(0xffd9a8, 15, 14, .62, .55, 1.4); key.position.set(2.4, 4.6, 3.4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0004; scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x8fa2ff, .9); rim.position.set(-3, 2.5, -3); scene.add(rim);
  const lamp = new THREE.PointLight(0xffb45a, 6, 6, 1.6); lamp.position.set(2.1, .5, -1.1); scene.add(lamp);
  const candle = new THREE.PointLight(0xffb04a, 0, 3.2, 1.8); scene.add(candle);
  const bench = benchModel(); bench.traverse((m) => { if (m.isMesh) m.receiveShadow = true; }); scene.add(bench, backdropModel());
  const camera = new THREE.PerspectiveCamera(34, 1, .05, 60);
  const controls = new OrbitControls(camera, canvas); controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = .12; controls.enablePan = false;
  controls.minDistance = 2.4; controls.maxDistance = 6.2; controls.minPolarAngle = .3; controls.maxPolarAngle = Math.PI / 2 + .08; controls.rotateSpeed = .7;
  const holder = new THREE.Group(); scene.add(holder);                  // the stand, the pumpkin and its dressing ride together
  const knife = knifeModel(); knife.visible = false; scene.add(knife);
  const marks = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: .032, color: 0xf6e7c4, transparent: true, opacity: .95, depthWrite: false }));
  const cuts = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: .036, color: 0x3a0f08, transparent: true, opacity: .95, depthWrite: false }));
  const ember = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: .05, color: 0xffb35c, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending }));
  holder.add(marks, cuts, ember);
  // The front surface, as a mesh the pointer can hit: a height field of frontZ.
  let surf = null, proxy = null, pumpkin = null, dress = null, stand = null, key3 = "", lift = 0;
  let active = false, tool = "knife", cutting = null, knifeUV = null, tracing = false, outlines = new Map(), chunks = [], embers = [];
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), local = new THREE.Vector3();
  const session = () => state.carving?.current ?? null;

  function buildProxy() {
    if (proxy) { holder.remove(proxy); proxy.geometry.dispose(); }
    const n = 48, pos = [], index = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const u = -1 + 2 * i / n, v = -1 + 2 * j / n, z = surf.frontZ(u, v); pos.push(u * SIZE / 2, (v + 1) * surf.height / 2, z ?? -1); }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1, ok = (k) => pos[k * 3 + 2] > 0;
      if (ok(a) && ok(b) && ok(c) && ok(d)) index.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(index);
    proxy = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })); holder.add(proxy);
  }
  const toWorld = (u, v, out = local) => { const z = surf.frontZ(u, v); return z === null ? null : out.set(u * SIZE / 2, (v + 1) * surf.height / 2 + lift, z + .012); };
  // The cut mask: every piece already cut, plus whatever is popping.
  const cutTest = (cur) => { const st = STENCIL_BY_ID[cur?.stencil]; if (!st || !cur.cut.length) return null; const pieces = st.pieces.filter((p) => cur.cut.includes(p.id)); return (u, v) => pieces.some((p) => inPiece(p, u, v)); };
  const glowOf = (cur) => CARVING_DECOR.candle.find((c) => c.id === cur?.decor?.candle)?.colour ?? null;
  const paintOf = (cur) => CARVING_DECOR.paint.find((p) => p.id === cur?.decor?.paint)?.colour ?? null;

  // Rebuilds what changed: the pumpkin (variety, cuts, candle, paint), its
  // stand and dressing, and the stencil's outlines.
  function refresh() {
    const cur = session(); if (!cur) return;
    const k = JSON.stringify([cur.variety, cur.stencil, cur.cut, cur.decor]);
    if (k === key3) return; key3 = k;
    if (!surf || surf.variety !== cur.variety) { surf = carvingSurface(cur.variety, { R, size: SIZE }); surf.variety = cur.variety; }
    for (const g of [pumpkin, dress, stand]) if (g) { holder.remove(g); disposeEstateObject(g); }
    const st = standModel(cur.decor.stand); stand = st.group; lift = st.height; if (stand) holder.add(stand);
    pumpkin = carvingPumpkin(cur.variety, { R, size: SIZE, cut: cutTest(cur), glow: glowOf(cur), paint: paintOf(cur) });
    pumpkin.position.y = lift; pumpkin.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); holder.add(pumpkin);
    dress = dressing(cur.decor, surf, pumpkin.userData.carving.stemTop); dress.position.y = lift; holder.add(dress);
    buildProxy(); proxy.position.y = lift;
    const lit = cur.cut.length > 0, glow = glowOf(cur) ?? [0xffd86c, 0xffa23c];
    // The candle's light falls through the holes onto the bench in front, not on the rind.
    candle.color.setHex(glow[1]); candle.userData.base = lit ? Math.min(3, 1.1 + cur.cut.length * .3) : 0; candle.position.set(0, lift + .1, SIZE / 2 + 1.05);
    syncOutlines(); controls.target.set(0, lift + surf.height * .48, 0);
  }
  function syncOutlines() {
    const cur = session(), st = STENCIL_BY_ID[cur?.stencil];
    if (!st) { outlines = new Map(); drawMarks(); return; }
    if (outlines.stencil !== st.id) { outlines = new Map(st.pieces.map((p) => [p.id, { piece: p, samples: pieceOutline(p), visited: new Uint8Array(pieceOutline(p).length) }])); outlines.stencil = st.id; }
    for (const [id, o] of outlines) if (cur.cut.includes(id)) o.visited.fill(1);
    drawMarks();
  }
  function drawMarks() {
    const open = [], done = [];
    for (const [id, o] of outlines) {
      if (session()?.cut.includes(id)) continue;
      o.samples.forEach(([u, v], i) => { const p = toWorld(u, v); if (p) (o.visited[i] ? done : open).push(p.x, p.y, p.z); });
    }
    marks.geometry.setAttribute("position", new THREE.Float32BufferAttribute(open, 3)); cuts.geometry.setAttribute("position", new THREE.Float32BufferAttribute(done, 3));
    marks.geometry.computeBoundingSphere(); cuts.geometry.computeBoundingSphere();
  }
  const progressOf = (o) => o.visited.reduce((n, x) => n + x, 0) / o.visited.length;
  // Cuts along the knife's path from its last place to (u, v).
  function cutTo(u, v) {
    const from = knifeUV ?? { u, v }, steps = Math.max(1, Math.ceil(Math.hypot(u - from.u, v - from.v) / .02));
    let changed = false;
    for (let k = 1; k <= steps; k++) {
      const pu = from.u + (u - from.u) * k / steps, pv = from.v + (v - from.v) * k / steps;
      for (const [id, o] of outlines) {
        if (session()?.cut.includes(id)) continue;
        o.samples.forEach(([su, sv], i) => { if (!o.visited[i] && Math.hypot(su - pu, sv - pv) < KNIFE) { o.visited[i] = 1; changed = true; } });
      }
    }
    knifeUV = { u, v };
    if (changed) { drawMarks(); spark(u, v); for (const [id, o] of outlines) if (!session()?.cut.includes(id) && progressOf(o) >= CARVING.cutShare) pop(id); }
    hooks.onProgress?.(status());
    return changed;
  }
  // A cut piece: told to the rules, then rebuilt as a hole with the rind it
  // took tumbling off the bench.
  function pop(id) {
    const cur = session(), o = outlines.get(id); if (!cur || !o || !hooks.onCut?.(id)) return;
    const chunk = carvingPumpkin(cur.variety, { R, size: SIZE, chunk: (u, v) => inPiece(o.piece, u, v), paint: paintOf(cur) });
    chunk.position.y = lift; holder.add(chunk);
    // It lands where its own middle meets the bench.
    const vs = o.samples.map(([, v]) => v), mid = (Math.min(...vs) + Math.max(...vs)) / 2;
    chunks.push({ group: chunk, floor: -(mid + 1) * surf.height / 2 + .06, vel: new THREE.Vector3((Math.random() - .5) * .6, 1.1, 1.4), spin: new THREE.Vector3(Math.random() * 3, Math.random() * 3, Math.random() * 2), life: 0 });
    refresh();
  }
  function spark(u, v) {
    const p = toWorld(u, v, new THREE.Vector3()); if (!p) return;
    for (let i = 0; i < 3; i++) embers.push({ p: p.clone(), v: new THREE.Vector3((Math.random() - .5) * .5, Math.random() * .6, .4 + Math.random() * .4), life: 0 });
  }
  function aimKnife(u, v) {
    const p = toWorld(u, v, new THREE.Vector3()); if (!p) { knife.visible = false; return; }
    knife.visible = tool === "knife" && !!STENCIL_BY_ID[session()?.stencil];
    knife.position.copy(p); knife.lookAt(p.x, p.y - 1, p.z + 2.2); knife.rotateX(-.6);
  }
  function hitAt(e) {
    const b = canvas.getBoundingClientRect(); ndc.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1);
    ray.setFromCamera(ndc, camera); holder.updateMatrixWorld(true);
    const hit = proxy && ray.intersectObject(proxy, false)[0]; if (!hit) return null;
    const p = holder.worldToLocal(hit.point.clone()), u = p.x / (SIZE / 2), v = (p.y - lift) / (surf.height / 2) - 1;
    return Math.abs(u) <= 1 && Math.abs(v) <= 1 ? { u, v } : null;
  }
  // The knife takes a press on the pumpkin before the orbit sees it.
  canvas.addEventListener("pointerdown", (e) => {
    if (!active || e.button !== 0 || tool !== "knife" || !STENCIL_BY_ID[session()?.stencil] || hooks.blocked?.()) return;
    const h = hitAt(e); if (!h) return;
    controls.enabled = false; cutting = e.pointerId; knifeUV = null; canvas.setPointerCapture?.(e.pointerId); cutTo(h.u, h.v); aimKnife(h.u, h.v);
  }, { capture: true });
  canvas.addEventListener("pointermove", (e) => {
    if (!active) return;
    const h = hitAt(e);
    if (h) aimKnife(h.u, h.v); else if (cutting === null) knife.visible = false;
    if (cutting === e.pointerId && h) cutTo(h.u, h.v);
  });
  const release = (e) => { if (cutting !== e.pointerId) return; cutting = null; knifeUV = null; controls.enabled = active; };
  canvas.addEventListener("pointerup", release); canvas.addEventListener("pointercancel", release);

  // The trace helper: the knife runs on round the nearest uncut outline.
  function trace(dt) {
    const cur = session(); if (!cur || !STENCIL_BY_ID[cur.stencil]) return;
    let best = null;
    const at = knifeUV ?? { u: 0, v: 0 };
    for (const [id, o] of outlines) {
      if (cur.cut.includes(id)) continue;
      o.samples.forEach(([u, v], i) => { if (o.visited[i]) return; const d = Math.hypot(u - at.u, v - at.v); if (!best || d < best.d) best = { d, u, v }; });
    }
    if (!best) return;
    const step = Math.min(best.d, TRACE_SPEED * dt), k = best.d ? step / best.d : 1;
    const u = at.u + (best.u - at.u) * k, v = at.v + (best.v - at.v) * k;
    if (best.d > .2) { knifeUV = { u, v }; aimKnife(u, v); return; }              // gliding over to the next outline, not cutting
    cutTo(u, v); aimKnife(u, v);
  }
  function status() {
    const cur = session(), st = STENCIL_BY_ID[cur?.stencil];
    return { stencil: st?.id ?? null, pieces: st ? st.pieces.map((p) => ({ id: p.id, cut: cur.cut.includes(p.id), progress: cur.cut.includes(p.id) ? 1 : progressOf(outlines.get(p.id)) })) : [], tool, chunks: chunks.length };
  }

  let insetX = 0, insetY = 0;
  function resize(w = canvas.clientWidth, h = canvas.clientHeight) {
    camera.aspect = w / Math.max(1, h);
    if (insetX || insetY) camera.setViewOffset(w, h, insetX / 2, insetY / 2, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  // Far enough back that the pumpkin and its hat fit across a narrow phone as well.
  function frameView() {
    resize(); const y = lift + (surf?.height ?? 1.2) * .45, across = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const d = Math.max(5.5, 3 / across), k = d / 5.5; controls.maxDistance = Math.max(6.2, d * 1.2);
    controls.target.set(0, y, 0); camera.position.set(.45 * k, y + 1.35 * k, d); controls.update();
  }
  return {
    scene, camera,
    enter() { active = true; key3 = ""; refresh(); frameView(); controls.enabled = true; },
    leave() { active = false; controls.enabled = false; cutting = null; tracing = false; knife.visible = false; for (const c of chunks) { holder.remove(c.group); disposeEstateObject(c.group); } chunks = []; },
    refresh() { refresh(); },
    resize,
    // Room the controls take on the right or at the bottom, in pixels.
    setInset(right = 0, bottom = 0) { insetX = right; insetY = bottom; resize(); },
    setTool(t) { tool = t === "turn" ? "turn" : "knife"; knife.visible = false; controls.enabled = active; },
    setTracing(on) { tracing = !!on; },
    // Keyboard and pad: nudge the knife across the face, cutting as it goes.
    nudge(dx, dy, dt) { if (!STENCIL_BY_ID[session()?.stencil]) return; const at = knifeUV ?? { u: 0, v: 0 }, u = Math.max(-.95, Math.min(.95, at.u + dx * dt * .7)), v = Math.max(-.9, Math.min(.9, at.v + dy * dt * .7)); cutTo(u, v); aimKnife(u, v); },
    orbit(dx, dy, dt) { const o = camera.position.clone().sub(controls.target), sph = new THREE.Spherical().setFromVector3(o); sph.theta -= dx * dt * 1.6; sph.phi = THREE.MathUtils.clamp(sph.phi - dy * dt * .9, controls.minPolarAngle, controls.maxPolarAngle); camera.position.copy(controls.target).add(o.setFromSpherical(sph)); controls.update(); },
    zoom(direction) { const o = camera.position.clone().sub(controls.target); o.setLength(THREE.MathUtils.clamp(o.length() * Math.exp(-direction * .12), controls.minDistance, controls.maxDistance)); camera.position.copy(controls.target).add(o); controls.update(); },
    reset: frameView,
    // QA: cut along the whole of one piece's outline.
    traceAll(id) { const o = outlines.get(id); if (!o) return false; knifeUV = null; for (const [u, v] of o.samples) cutTo(u, v); return true; },
    tick(dt, time) {
      if (!active) return;
      if (tracing && !hooks.blocked?.()) trace(dt);
      candle.intensity = (candle.userData.base ?? 0) * (.86 + .1 * Math.sin(time * 11) + .06 * Math.sin(time * 23.7));
      for (let i = chunks.length - 1; i >= 0; i--) {
        const c = chunks[i]; c.life += dt; c.vel.y -= 4.2 * dt; c.group.position.addScaledVector(c.vel, dt);
        c.group.rotation.x += c.spin.x * dt; c.group.rotation.y += c.spin.y * dt;
        if (c.group.position.y < c.floor) { c.group.position.y = c.floor; c.vel.multiplyScalar(.35); c.vel.y = Math.abs(c.vel.y) * .3; }
        if (c.life > 2.4) { holder.remove(c.group); disposeEstateObject(c.group); chunks.splice(i, 1); }
      }
      embers = embers.filter((p) => (p.life += dt) < .6);
      for (const p of embers) { p.p.addScaledVector(p.v, dt); p.v.y -= 1.2 * dt; }
      ember.geometry.setAttribute("position", new THREE.Float32BufferAttribute(embers.flatMap((p) => [p.p.x, p.p.y, p.p.z]), 3));
      controls.update();
    },
    get status() { return status(); },
    get active() { return active; },
  };
}
