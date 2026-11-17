import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Voxels, seeded, vary } from "./voxels.js";
import { buildCarving, buildChunk, buildLid, buildPulp, carvingSurface, CARVE_R } from "./carving-pumpkin.js";
import { STENCIL_BY_ID, CARVING_DECOR, CARVING, inPiece, pieceOutline, pieceKind, simplifyPath, freePieceOk } from "./content/carving.js";
import { buildCarvingSet, SEED_BOWL, LID_REST } from "./carving-set.js";
import { disposeEstateObject } from "./house-estate-world.js";

// The carving bench, up close: its own scene, where the pumpkin sits on the
// bench to be opened, scooped, stencilled, cut, etched, lit and dressed
// (rules/carving.js holds the session; this draws it and reads the tools).
//
// The pumpkin is built at high density (carving-pumpkin.js). The stencil's
// marks, the knife's grooves, the peeled skin and freehand ink are thin tiles
// laid on the rind's own voxels, so they change as the tools move without a
// rebuild; the pumpkin is rebuilt only as a piece comes out, the lid comes off
// or the candle is lit.
//
//   Open: the knife runs round the stem; the lid lifts off onto the bench, and
//     the scoop clears the pulp, flicking seeds into the bowl.
//   Carve: the knife cuts along a piece's dotted outline until it pops out;
//     the peeler scrubs an etched piece's area until its skin is off; in
//     freehand, any shape the knife closes is cut.
//   Light: the lamp dims, a match goes in, the candle catches and the lid
//     goes back on.
// Holding the trace button (or E / A) does the current job for keyboard, pad
// and anyone who'd rather: it runs round the nearest outline, scrubs the
// nearest etched area, or sweeps the scoop round.
const SIZE = 1.8, R = CARVE_R, KNIFE = .07, PEEL = .08, TRACE_SPEED = .75, LID_KNIFE = .07;
const VIEWS = {
  front: { theta: .16, phi: 1.3, dist: 4.9, y: .5 },
  top: { theta: .12, phi: .62, dist: 4.4, y: .9 },
  inside: { theta: .08, phi: .34, dist: 3.5, y: .75 },
  hero: { theta: .55, phi: 1.3, dist: 5.2, y: .5 },
};
const ease = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

// The carving saw: a thin serrated blade and an orange grip. Its tip is the
// origin and the blade runs up the y axis, so it can be stood on any surface.
function toolModel(kind) {
  const v = new Voxels();
  if (kind === "knife") {
    v.box(-.008, 0, -.022, .016, .3, .044, 0xd9dde6); v.box(-.006, .02, .022, .012, .26, .012, 0xb9bec8);
    for (let y = .02; y < .28; y += .03) v.box(-.009, y, -.03, .018, .014, .01, 0xc3c8d1);
    v.box(-.028, .3, -.034, .056, .2, .068, 0xe0742e); v.box(-.03, .34, -.036, .06, .02, .072, 0xb65a22); v.box(-.03, .44, -.036, .06, .02, .072, 0xb65a22);
  } else if (kind === "peeler") {
    v.box(-.04, 0, -.006, .08, .012, .012, 0xd9dde6); for (const x of [-.04, .028]) v.box(x, 0, -.006, .012, .12, .012, 0xd9dde6);
    v.box(-.022, .12, -.022, .044, .24, .044, 0x3a8f9a); v.box(-.024, .3, -.024, .048, .02, .048, 0x2a6a72);
  } else if (kind === "scoop") {
    v.box(-.07, 0, -.05, .14, .03, .1, 0xd7dbe4); v.box(-.06, .03, -.04, .12, .02, .08, 0xaeb3bc); v.box(-.075, 0, -.055, .15, .05, .012, 0xc9ccd4);
    v.box(-.012, .03, -.012, .024, .22, .024, 0xc9ccd4); v.box(-.025, .25, -.025, .05, .2, .05, 0xcaa269);
  } else {
    v.box(-.008, 0, -.008, .016, .26, .016, 0xe8d7a8); v.box(-.014, .25, -.014, .028, .04, .028, 0xb8342a);
  }
  return v.build({ shadows: false });
}
// Hats, extras and stands, built round a pumpkin of the given surface.
function dressing(decor, surf, r = seeded(91)) {
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
  if (ex.includes("glitter")) for (let i = 0; i < 60; i++) { const u = (r() * 2 - 1) * .95, vv = (r() * 2 - 1) * .9, z = surf.frontZ(u, vv); if (z === null) continue; const side = r() < .5 ? 1 : -1, zz = side > 0 ? z + .006 : -z - .006; v.block(u * w, (vv + 1) * surf.height / 2, zz, .02, .02, .008, [0xffe9a8, 0xd6c2ff, 0xffffff][i % 3], true); }
  return v.build();
}
function standModel(stand) {
  const v = new Voxels(), r = seeded(17);
  if (stand === "hay") { v.block(0, 0, 0, 1.6, .3, 1.2, vary(0xc9a65a, .05, r)); for (const x of [-.4, .4]) v.block(x, -.005, 0, .05, .31, 1.21, 0x9c7a3b); for (let i = 0; i < 10; i++) v.block(-.7 + r() * 1.4, .29, -.5 + r() * 1, .2, .03, .04, 0xe2c27a); return { group: v.build(), height: .3 }; }
  if (stand === "plinth") { v.block(0, 0, 0, 1.3, .12, 1.3, 0x77727f); v.block(0, .12, 0, 1.05, .24, 1.05, 0x99919b); v.block(0, .36, 0, 1.2, .08, 1.2, 0x8a8492); return { group: v.build(), height: .44 }; }
  return { group: null, height: 0 };
}

export function createCarvingView(canvas, state, hooks = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x100b16); scene.fog = new THREE.Fog(0x100b16, 10, 26);
  const hemi = new THREE.HemisphereLight(0xb9a6e0, 0x2a1d1a, .8); scene.add(hemi);
  // A work light from the front three-quarters models the pumpkin; the enamel
  // lamp behind it and the festoons warm it from above and behind; moonlight rims it.
  const key = new THREE.SpotLight(0xffe2b8, 11, 12, .5, .65, 1.3); key.position.set(1.9, 3, 2.8); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0003; key.shadow.normalBias = .01;
  key.target.position.set(0, .55, 0); scene.add(key, key.target);
  const lampLight = new THREE.PointLight(0xffd9a0, 2.2, 4.5, 1.6); lampLight.position.set(0, 3.1, -.8); scene.add(lampLight);
  const fill = new THREE.PointLight(0xffc77a, 2.4, 9, 1.6); fill.position.set(0, 3.2, -1.6); scene.add(fill);
  const soft = new THREE.DirectionalLight(0xffe8d6, .35); soft.position.set(-3, 1.6, 4); scene.add(soft);
  const rim = new THREE.DirectionalLight(0x8fa2ff, .75); rim.position.set(-3, 2.5, -3); scene.add(rim);
  // The candle's own light, inside the pumpkin: it warms the inside and pools on the bench, never the rind.
  const candle = new THREE.PointLight(0xffb04a, 0, 3.2, 1.7); scene.add(candle);
  const flash = new THREE.PointLight(0xffd59a, 0, 2.6, 2); scene.add(flash);
  const set = buildCarvingSet(); scene.add(set.group);
  const camera = new THREE.PerspectiveCamera(34, 1, .05, 60);
  const controls = new OrbitControls(camera, canvas); controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = .12; controls.enablePan = false;
  controls.minDistance = 2.2; controls.maxDistance = 7; controls.minPolarAngle = .22; controls.maxPolarAngle = Math.PI / 2 + .08; controls.rotateSpeed = .7;
  const holder = new THREE.Group(); scene.add(holder);                  // the stand, the pumpkin and its dressing ride together
  const tools = { knife: toolModel("knife"), peeler: toolModel("peeler"), scoop: toolModel("scoop") };
  for (const t of Object.values(tools)) { t.visible = false; scene.add(t); }
  const match = toolModel("match"); match.visible = false; scene.add(match);
  // Marks on the rind: one tile per voxel, coloured and sized per use.
  const TILE_MAX = 7000, tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: .78, metalness: 0 }), TILE_MAX);
  tiles.count = 0; tiles.receiveShadow = true; tiles.frustumCulled = false; holder.add(tiles);
  // Little flying things: chips of rind and flesh, seeds and pulp to the bowl, embers.
  const BITS = 260, bits = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: .8 }), BITS);
  bits.count = 0; bits.frustumCulled = false; scene.add(bits);
  const ember = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: .05, color: 0xffb35c, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(ember);

  let surf = null, frontProxy = null, topProxy = null, pumpkin = null, dress = null, stand = null, lidPiece = null, pulp = null, built = "", lift = 0;
  let active = false, step = "pumpkin", mode = "idle", tool = "knife", tracing = false, pointer = null, toolAt = null, lastAt = null, speed = 0;
  let outlines = new Map(), lidRing = null, stroke = null, chunks = [], flying = [], embers = [], marksDirty = true, tween = null, reveal = null, lidAnim = null;
  let photoWanted = null, insetX = 0, insetY = 0, clumpAt = 0, sawPhase = 0, lidBack = false, buzzAt = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), v3 = new THREE.Vector3(), m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), col = new THREE.Color();
  const session = () => state.carving?.current ?? null;
  const stencil = () => STENCIL_BY_ID[session()?.stencil] ?? null;
  const glowOf = (cur) => CARVING_DECOR.candle.find((c) => c.id === cur?.decor?.candle)?.colour ?? null;
  const paintOf = (cur) => CARVING_DECOR.paint.find((p) => p.id === cur?.decor?.paint)?.colour ?? null;
  // Light rinds take a dark marker, dark ones chalk.
  const rindIsDark = () => { const c = new THREE.Color(paintOf(session()) ?? [0xf0821e, 0xd9d2ff, 0x9d55e6, 0xf5c84a, 0x172243][session()?.variety ?? 0]); return c.r * .2126 + c.g * .7152 + c.b * .0722 < .2; };

  // What's cut: the stencil's cut pieces done so far, and every freehand shape.
  const cutMask = (cur) => {
    const st = STENCIL_BY_ID[cur?.stencil]; if (!st) return null;
    const pieces = st.pieces.filter((p) => pieceKind(p) === "cut" && cur.cut.includes(p.id)), free = cur.free ?? [];
    if (!pieces.length && !free.length) return null;
    return (u, v) => pieces.some((p) => inPiece(p, u, v)) || free.some((poly) => inPiece({ outer: poly }, u, v));
  };
  const etchMask = (cur) => {
    const st = STENCIL_BY_ID[cur?.stencil], pieces = st ? st.pieces.filter((p) => pieceKind(p) === "etch" && cur.etched.includes(p.id)) : [];
    return pieces.length ? (u, v) => pieces.some((p) => inPiece(p, u, v)) : null;
  };
  // Lit as the rules have it, but shown lit only once the match is in.
  const shownLit = (cur) => !!cur?.lit && (!reveal || reveal.lit);
  const lidMode = (cur) => !cur?.lid ? "none" : shownLit(cur) && lidBack ? "on" : "off";

  // A height field over the face and over the crown, for the pointer to hit.
  function buildProxies() {
    for (const p of [frontProxy, topProxy]) if (p) { holder.remove(p); p.geometry.dispose(); }
    const grid = (n, fn) => {
      const pos = [], index = [];
      for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const p = fn(-1 + 2 * i / n, -1 + 2 * j / n); pos.push(...(p ?? [0, -9, 0])); }
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1, ok = (k) => pos[k * 3 + 1] > -8;
        if (ok(a) && ok(b) && ok(c) && ok(d)) index.push(a, c, b, b, c, d);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(index);
      const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })); holder.add(mesh); return mesh;
    };
    frontProxy = grid(64, (u, v) => { const z = surf.frontZ(u, v); return z === null ? null : [u * SIZE / 2, (v + 1) * surf.height / 2, z]; });
    topProxy = grid(48, (a, b) => { const cx = a * .62, cz = b * .62, y = surf.topY(cx, cz); return y === null ? null : [cx * SIZE / 2, y, cz * SIZE / 2]; });
  }

  // Rebuilds what changed: the pumpkin (variety, cuts, etching, lid, candle,
  // paint), its stand and dressing, the lid on the bench, the pulp inside.
  function refresh() {
    const cur = session();
    if (!cur) { clearPumpkin(); return; }
    if (!surf || surf.variety !== cur.variety || surf.shape !== cur.shape) { surf = carvingSurface(cur.variety, { R, size: SIZE, shape: cur.shape }); surf.variety = cur.variety; surf.shape = cur.shape; buildProxies(); outlines = new Map(); lidRing = null; }
    const lit = shownLit(cur), k = JSON.stringify([cur.variety, cur.shape, cur.stencil, cur.cut, cur.etched, cur.free, cur.lid, lidMode(cur), lit, cur.decor]);
    if (k !== built) {
      built = k;
      for (const g of [pumpkin, dress, stand]) if (g) { holder.remove(g); disposeEstateObject(g); }
      const st = standModel(cur.decor.stand); stand = st.group; lift = st.height; if (stand) holder.add(stand);
      pumpkin = buildCarving(cur.variety, { R, size: SIZE, shape: cur.shape, cut: cutMask(cur), etch: etchMask(cur), lid: lidMode(cur), lit, glow: glowOf(cur), paint: paintOf(cur) });
      pumpkin.position.y = lift; holder.add(pumpkin);
      dress = lit ? dressing(cur.decor, surf) : new THREE.Group(); dress.position.y = lift; holder.add(dress);
      for (const p of [frontProxy, topProxy, tiles]) p.position.y = lift;
      const glow = glowOf(cur) ?? [0xffd86c, 0xffa23c];
      candle.color.setHex(glow[1]); candle.position.set(0, lift + surf.cavity.floor + .3, 0);
    }
    // The lid rests on the bench while it's off; the pulp sits inside until it's scooped.
    const wantLid = cur.lid && lidMode(cur) === "off";
    if (wantLid && !lidPiece) { lidPiece = buildLid(cur.variety, { R, size: SIZE, shape: cur.shape, paint: paintOf(cur) }); holder.add(lidPiece); if (!lidAnim) restLid(); }
    if (!wantLid && lidPiece && !lidAnim) { holder.remove(lidPiece); disposeEstateObject(lidPiece); lidPiece = null; }
    const wantPulp = cur.lid && !cur.scooped;
    if (wantPulp && !pulp) { pulp = buildPulp(cur.variety, { R, size: SIZE, shape: cur.shape }); pulp.group.position.y = lift; holder.add(pulp.group); }
    if (!wantPulp && pulp) { holder.remove(pulp.group); pulp.dispose(); pulp = null; }
    syncOutlines(); marksDirty = true;
  }
  function clearPumpkin() {
    for (const g of [pumpkin, dress, stand, lidPiece]) if (g) { holder.remove(g); disposeEstateObject(g); }
    if (pulp) { holder.remove(pulp.group); pulp.dispose(); }
    pumpkin = dress = stand = lidPiece = pulp = null; built = ""; outlines = new Map(); lidRing = null; stroke = null; lift = 0; marksDirty = true;
  }
  const restLid = () => { lidPiece.position.copy(LID_REST).setY(LID_REST.y - lidPiece.userData.lid.bottom + .01); lidPiece.rotation.set(0, .5, 0); };

  // The stencil's pieces, each with its outline (cut) or its area (etched),
  // and what of them the tools have visited.
  function syncOutlines() {
    const cur = session(), st = stencil();
    if (cur && !cur.lid && !lidRing) {
      const r0 = surf.lidRadius * .97, n = 72;
      lidRing = { samples: Array.from({ length: n }, (_, i) => [Math.cos(i / n * Math.PI * 2) * r0, Math.sin(i / n * Math.PI * 2) * r0]), visited: new Uint8Array(n) };
    }
    if (!st || st.freehand) { outlines = new Map(); return; }
    if (outlines.stencil !== st.id) {
      outlines = new Map(st.pieces.map((p) => {
        const kind = pieceKind(p), samples = pieceOutline(p);
        const area = [];
        if (kind === "etch") for (let u = -.8; u <= .8; u += .028) for (let v = -.75; v <= .7; v += .028) if (inPiece(p, u, v)) area.push([u, v]);
        return [p.id, { piece: p, kind, samples, visited: new Uint8Array(samples.length), area, peeled: new Uint8Array(area.length) }];
      }));
      outlines.stencil = st.id;
    }
    for (const [id, o] of outlines) if ((o.kind === "etch" ? cur.etched : cur.cut).includes(id)) { o.visited.fill(1); o.peeled.fill(1); }
  }
  const progressOf = (o) => { const list = o.kind === "etch" ? o.peeled : o.visited; let n = 0; for (const x of list) n += x; return list.length ? n / list.length : 0; };
  const done = (id, o) => (o.kind === "etch" ? session()?.etched : session()?.cut)?.includes(id);

  // Lays the marks: dots on what's still to cut, grooves where the knife has
  // been, peeled skin, the lid's ring, and the freehand stroke.
  function paintMarks() {
    marksDirty = false; let n = 0;
    if (!surf || !session()) { tiles.count = 0; return; }
    const s = surf.s, dark = rindIsDark(), dot = dark ? 0xefe2c0 : 0x24150e, groove = dark ? 0xf0c06a : 0x3a160a, chalk = 0x9fd3ff, flesh = 0xf0c06a, ink = dark ? 0xf3ead8 : 0x1d1a2a;
    const front = (u, v, colour, k = .9, depth = .3) => {
      if (n >= TILE_MAX) return; const c = surf.cell(u, v); if (!c) return;
      m4.makeScale(s * k, s * k, s * depth).setPosition(c[0], c[1], c[2] + s * depth * .3); tiles.setMatrixAt(n, m4); tiles.setColorAt(n, col.setHex(colour)); n++;
    };
    const cur = session();
    if (lidRing && !cur.lid) lidRing.samples.forEach(([cx, cz], i) => {
      if (n >= TILE_MAX || (!lidRing.visited[i] && i % 2)) return;
      const y = surf.topY(cx, cz); if (y === null) return;
      const x = (Math.floor(cx * R) + .5) * s, z = (Math.floor(cz * R) + .5) * s;
      m4.makeScale(s * .9, s * .3, s * .9).setPosition(x, y + s * .08, z); tiles.setMatrixAt(n, m4); tiles.setColorAt(n, col.setHex(lidRing.visited[i] ? groove : dot)); n++;
    });
    for (const [id, o] of outlines) {
      if (done(id, o)) continue;
      if (o.kind === "cut") o.samples.forEach(([u, v], i) => { if (o.visited[i]) front(u, v, groove); else if (i % 2 === 0) front(u, v, dot); });
      else {
        o.samples.forEach(([u, v], i) => { if (i % 2 === 0) front(u, v, chalk, .8); });
        o.area.forEach(([u, v], i) => { if (o.peeled[i]) front(u, v, flesh, 1.25, .2); else if (i % 9 === 0) front(u, v, chalk, .55, .2); });
      }
    }
    if (stroke) for (const [u, v] of stroke.points) front(u, v, ink, 1.1);
    tiles.count = n; tiles.instanceMatrix.needsUpdate = true; if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  }

  // Each tool's jobs. All take face or crown coordinates and return whether anything changed.
  function cutTo(u, v) {
    const from = lastAt ?? { u, v }, steps = Math.max(1, Math.ceil(Math.hypot(u - from.u, v - from.v) / .02));
    let changed = false;
    for (let k = 1; k <= steps; k++) {
      const pu = from.u + (u - from.u) * k / steps, pv = from.v + (v - from.v) * k / steps;
      for (const [id, o] of outlines) {
        if (o.kind !== "cut" || done(id, o)) continue;
        o.samples.forEach(([su, sv], i) => { if (!o.visited[i] && Math.hypot(su - pu, sv - pv) < KNIFE) { o.visited[i] = 1; changed = true; } });
      }
    }
    lastAt = { u, v };
    if (changed) { marksDirty = true; chips(u, v, 2); for (const [id, o] of outlines) if (o.kind === "cut" && !done(id, o) && progressOf(o) >= CARVING.cutShare) pop(id); }
    hooks.onProgress?.(status());
    return changed;
  }
  function peelTo(u, v) {
    const from = lastAt ?? { u, v }, steps = Math.max(1, Math.ceil(Math.hypot(u - from.u, v - from.v) / .02));
    let changed = false;
    for (let k = 1; k <= steps; k++) {
      const pu = from.u + (u - from.u) * k / steps, pv = from.v + (v - from.v) * k / steps;
      for (const [id, o] of outlines) {
        if (o.kind !== "etch" || done(id, o)) continue;
        o.area.forEach(([su, sv], i) => { if (!o.peeled[i] && Math.hypot(su - pu, sv - pv) < PEEL) { o.peeled[i] = 1; changed = true; } });
      }
    }
    lastAt = { u, v };
    if (changed) {
      marksDirty = true; if (Math.random() < .5) chips(u, v, 1, true);
      for (const [id, o] of outlines) if (o.kind === "etch" && !done(id, o) && progressOf(o) >= CARVING.etchShare && hooks.onEtch?.(id)) { hooks.sound?.("sparkle"); refresh(); }
    }
    hooks.onProgress?.(status());
    return changed;
  }
  function lidTo(cx, cz) {
    if (!lidRing) return false;
    const from = lastAt ?? { u: cx, v: cz }, steps = Math.max(1, Math.ceil(Math.hypot(cx - from.u, cz - from.v) / .02));
    let changed = false;
    for (let k = 1; k <= steps; k++) {
      const pu = from.u + (cx - from.u) * k / steps, pv = from.v + (cz - from.v) * k / steps;
      lidRing.samples.forEach(([a, b], i) => { if (!lidRing.visited[i] && Math.hypot(a - pu, b - pv) < LID_KNIFE) { lidRing.visited[i] = 1; changed = true; } });
    }
    lastAt = { u: cx, v: cz };
    if (changed) {
      marksDirty = true;
      const y = surf.topY(cx, cz); if (y !== null) spray(new THREE.Vector3(cx * SIZE / 2, y + lift, cz * SIZE / 2), 2, false);
      if (lidRing.visited.reduce((n, x) => n + x, 0) / lidRing.visited.length >= CARVING.cutShare && hooks.onLid?.()) liftLid();
    }
    hooks.onProgress?.(status());
    return changed;
  }
  // The scoop works inside: a spot on the rim's plane reaches the whole cavity.
  function scoopAt(x, z, amount) {
    if (!pulp) return;
    const reach = surf.cavity.radius / (surf.lidRadius * SIZE / 2), rr = Math.hypot(x, z) * reach, lim = surf.cavity.radius * .95, k = rr > lim ? lim / rr : 1;
    const freed = pulp.scoop(x * reach * k, z * reach * k, surf.cavity.radius * .42, amount);
    for (const p of freed) { flyTo(p.clone().setY(p.y + lift), SEED_BOWL, 0xf2e3bd, .03); hooks.sound?.("seed"); }
    if (performance.now() > clumpAt && amount > .02) { clumpAt = performance.now() + 260; hooks.sound?.("squelch"); for (let i = 0; i < 3; i++) flyTo(new THREE.Vector3(x * reach * k, lift + surf.cavity.floor + .2, z * reach * k), SEED_BOWL, [0xf0a640, 0xe8b45a, 0xd98a2e][i], .04); }
    if (pulp.left <= 1 - CARVING.scoopDone) { const result = hooks.onScooped?.(); if (result) { hooks.sound?.("sparkle"); refresh(); } }
    hooks.onProgress?.(status());
  }
  // Freehand: the knife inks a path; when it comes back to its start, the shape is cut.
  function drawTo(u, v) {
    if (!stroke) stroke = { points: [[u, v]], length: 0 };
    const [lu, lv] = stroke.points[stroke.points.length - 1], d = Math.hypot(u - lu, v - lv);
    if (d < .012) return;
    for (let k = 1, n = Math.ceil(d / .02); k <= n; k++) stroke.points.push([lu + (u - lu) * k / n, lv + (v - lv) * k / n]);
    stroke.length += d; marksDirty = true; chips(u, v, 1);
    const [su, sv] = stroke.points[0];
    if (stroke.length > .3 && Math.hypot(u - su, v - sv) < .06) closeStroke();
  }
  function closeStroke() {
    if (!stroke) return;
    const [su, sv] = stroke.points[0], [eu, ev] = stroke.points[stroke.points.length - 1];
    const closed = stroke.length > .3 && Math.hypot(eu - su, ev - sv) < .09;
    let poly = null;
    if (closed) for (let tol = .006; tol < .08; tol *= 1.6) { poly = simplifyPath(stroke.points.slice(0, -1), tol); if (poly.length <= CARVING.freePoints) break; }
    stroke = null; marksDirty = true;
    if (!poly || !freePieceOk(poly)) { hooks.onFreeMiss?.(closed ? "small" : "open"); return; }
    if (hooks.onFree?.(poly)) chunkFall((u, v) => inPiece({ outer: poly }, u, v), poly.map(([, v]) => v));
  }

  // A cut piece: told to the rules, then rebuilt as a hole with the rind it took tumbling out.
  function pop(id) {
    const o = outlines.get(id); if (!session() || !o || !hooks.onCut?.(id)) return;
    chunkFall((u, v) => inPiece(o.piece, u, v), o.samples.map(([, v]) => v));
  }
  function chunkFall(mask, vs) {
    const cur = session(), chunk = buildChunk(cur.variety, { R, size: SIZE, shape: cur.shape, mask, paint: paintOf(cur) });
    chunk.position.y = lift; holder.add(chunk);
    // It lands where its own middle meets the bench.
    const mid = (Math.min(...vs) + Math.max(...vs)) / 2;
    chunks.push({ group: chunk, floor: -(mid + 1) * surf.height / 2 - lift + .04, vel: new THREE.Vector3((Math.random() - .5) * .6, 1.1, 1.4), spin: new THREE.Vector3(Math.random() * 3, Math.random() * 3, Math.random() * 2), life: 0, landed: false });
    hooks.sound?.("pop"); hooks.feel?.("done");
    refresh();
  }
  function liftLid() {
    hooks.sound?.("lid"); hooks.feel?.("done");
    refresh();
    if (lidPiece) { lidAnim = { t: 0, from: new THREE.Vector3(0, 0, 0), fromRot: 0, to: LID_REST.clone().setY(LID_REST.y - lidPiece.userData.lid.bottom + .01), toRot: .5, back: false }; lidPiece.position.set(0, lift, 0); lidPiece.rotation.set(0, 0, 0); }
    if (step === "open") goTo("inside");
  }

  // Bits: chips off the knife, seeds and pulp arcing into the bowl.
  function chips(u, v, n, peel = false) {
    const p = surf.point(u, v); if (!p) return;
    spray(new THREE.Vector3(p[0], p[1] + lift, p[2] + .01), n, peel);
  }
  function spray(at, n, peel) {
    const cur = session(), rind = paintOf(cur) ?? [0xf0821e, 0xd9d2ff, 0x9d55e6, 0xf5c84a, 0x172243][cur?.variety ?? 0];
    for (let i = 0; i < n; i++) {
      flying.push({ p: at.clone(), v: new THREE.Vector3((Math.random() - .5) * .9, .5 + Math.random() * .8, .3 + Math.random() * .7), c: peel ? rind : Math.random() < .6 ? 0xf0c06a : rind, size: surf.s * (peel ? .9 : 1.2), life: 0, spin: Math.random() * 6, to: null });
      embers.length < 40 && Math.random() < .3 && embers.push({ p: at.clone(), v: new THREE.Vector3((Math.random() - .5) * .4, Math.random() * .5, .3 + Math.random() * .3), life: 0 });
    }
  }
  function flyTo(from, to, colour, size) {
    flying.push({ p: from.clone(), v: null, from: from.clone(), to: to.clone().add(new THREE.Vector3((Math.random() - .5) * .3, .02, (Math.random() - .5) * .3)), c: colour, size, life: 0, spin: Math.random() * 6, dur: .55 + Math.random() * .2 });
  }
  function drawBits(dt) {
    let n = 0;
    for (let i = flying.length - 1; i >= 0; i--) {
      const b = flying[i]; b.life += dt;
      if (b.to) {
        const t = Math.min(1, b.life / b.dur); b.p.lerpVectors(b.from, b.to, t); b.p.y += Math.sin(t * Math.PI) * .55;
        if (t >= 1 && b.life > b.dur + 1.6) { flying.splice(i, 1); continue; }
      } else {
        b.v.y -= 4.5 * dt; b.p.addScaledVector(b.v, dt);
        if (b.p.y < .01) { b.p.y = .01; b.v.multiplyScalar(.3); b.v.y = Math.abs(b.v.y) * .2; }
        if (b.life > 1.6) { flying.splice(i, 1); continue; }
      }
      if (n >= BITS) continue;
      const k = b.to ? 1 : Math.min(1, (1.6 - b.life) * 2);
      m4.compose(b.p, q4.setFromAxisAngle(v3.set(.3, 1, .2).normalize(), b.spin + b.life * 4), v3.set(b.size * k, b.size * k * .7, b.size * k)); bits.setMatrixAt(n, m4); bits.setColorAt(n, col.setHex(b.c)); n++;
    }
    bits.count = n; bits.instanceMatrix.needsUpdate = true; if (bits.instanceColor) bits.instanceColor.needsUpdate = true;
  }

  // Where the pointer is on the face (u, v), the crown (cx, cz) or the rim's plane (x, z).
  function hit(e, what) {
    const b = canvas.getBoundingClientRect(); ndc.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1);
    ray.setFromCamera(ndc, camera); holder.updateMatrixWorld(true);
    if (what === "rim") {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(lift + surf.cavity.roof)), p = ray.ray.intersectPlane(plane, v3); if (!p) return null;
      const local = holder.worldToLocal(p.clone()), r = surf.lidRadius * SIZE / 2;
      return Math.hypot(local.x, local.z) <= r * 1.25 ? { x: local.x, z: local.z } : null;
    }
    const mesh = what === "top" ? topProxy : frontProxy, h = mesh && ray.intersectObject(mesh, false)[0]; if (!h) return null;
    const p = holder.worldToLocal(h.point.clone());
    if (what === "top") return { u: p.x / (SIZE / 2), v: p.z / (SIZE / 2) };
    const u = p.x / (SIZE / 2), v = (p.y - lift) / (surf.height / 2) - 1;
    return Math.abs(u) <= 1 && Math.abs(v) <= 1 ? { u, v } : null;
  }
  const target = () => mode === "lid" ? "top" : mode === "scoop" ? "rim" : "front";
  // Stands the tool on the surface it works on, leaning back towards the viewer.
  function aim(at) {
    for (const [name, t] of Object.entries(tools)) t.visible = false;
    toolAt = at; if (!at || !surf || mode === "idle" || tool === "turn") return;
    const t = mode === "scoop" ? tools.scoop : mode === "carve" && tool === "peeler" ? tools.peeler : tools.knife;
    t.visible = true;
    if (mode === "scoop") {
      const reach = surf.cavity.radius / (surf.lidRadius * SIZE / 2);
      t.position.set(at.x * Math.min(reach, 1.6), lift + surf.cavity.floor + .12 + (pulp ? .18 * pulp.left : 0), at.z * Math.min(reach, 1.6)); t.rotation.set(-.5, 0, 0);
      return;
    }
    if (mode === "lid") {
      const y = surf.topY(at.u, at.v) ?? surf.height; t.position.set(at.u * SIZE / 2, y + lift - .02, at.v * SIZE / 2); t.rotation.set(-.25, Math.atan2(at.u, at.v), 0);
    } else {
      const p = surf.point(at.u, at.v); if (!p) { t.visible = false; return; }
      t.position.set(p[0], p[1] + lift, p[2] - (tool === "peeler" ? -.005 : .03)); t.rotation.set(Math.PI / 2 - .55, 0, -at.u * .5);
    }
    // The saw strokes in and out as it moves.
    if (t === tools.knife && speed > .05) { const k = Math.sin(sawPhase) * .035 * Math.min(1, speed); t.translateY(k); }
  }
  function work(at, dt = 0) {
    if (!at) return;
    const was = lastAt;
    // The scoop takes about a quarter of the pulp under it for every 5 cm it moves.
    const changed = mode === "lid" ? lidTo(at.u, at.v) : mode === "scoop" ? (scoopAt(at.x, at.z, Math.min(.7, (was ? Math.hypot(at.x - was.u, at.z - was.v) : 0) * 5 + dt * .8)), lastAt = { u: at.x, v: at.z }, true)
      : tool === "peeler" ? peelTo(at.u, at.v) : stencil()?.freehand ? (drawTo(at.u, at.v), lastAt = at, true) : cutTo(at.u, at.v);
    const d = was ? Math.hypot((at.u ?? at.x) - was.u, (at.v ?? at.z) - was.v) : 0;
    speed = Math.min(1.5, speed * .6 + (dt ? d / dt : d * 40) * .4);
    if (changed || d > .002) hooks.sound?.("scrape", speed, mode === "scoop" ? "scoop" : tool === "peeler" ? "peel" : "knife");
    // A light buzz in the hands while the tool bites.
    if (changed && performance.now() > buzzAt) { buzzAt = performance.now() + 120; hooks.feel?.("tick"); }
  }
  const working = () => mode !== "idle" && tool !== "turn" && !reveal && (mode !== "carve" || !!stencil());
  canvas.addEventListener("pointerdown", (e) => {
    if (!active || e.button !== 0 || !working() || hooks.blocked?.()) return;
    const at = hit(e, target()); if (!at) return;
    controls.enabled = false; pointer = e.pointerId; lastAt = null; canvas.setPointerCapture?.(e.pointerId);
    if (stencil()?.freehand && mode === "carve") stroke = null;
    work(at); aim(at);
  }, { capture: true });
  canvas.addEventListener("pointermove", (e) => {
    if (!active || !working()) return;
    const at = hit(e, target());
    if (at) aim(at); else if (pointer === null) aim(null);
    if (pointer === e.pointerId && at) work(at, 1 / 60);
  });
  const release = (e) => {
    if (pointer !== e.pointerId) return;
    pointer = null; lastAt = null; speed = 0; hooks.sound?.("rest"); controls.enabled = active && !tween && !reveal;
    if (stroke) closeStroke();
  };
  canvas.addEventListener("pointerup", release); canvas.addEventListener("pointercancel", release);

  // The helper for holding E / A / the trace button: the current job, done for you.
  let sweep = 0;
  function trace(dt) {
    const cur = session(); if (!cur || !surf) return;
    const at = lastAt ?? (mode === "lid" ? { u: lidRing?.samples[0][0] ?? 0, v: lidRing?.samples[0][1] ?? 0 } : { u: 0, v: 0 });
    if (mode === "scoop") {
      sweep += dt * 2.8; const r = surf.lidRadius * SIZE / 2 * (.25 + .85 * Math.abs(Math.sin(sweep * .6)));
      const p = { x: Math.cos(sweep) * r, z: Math.sin(sweep) * r }; aim(p); work(p, dt); return;
    }
    let best = null;
    const consider = (u, v) => { const d = Math.hypot(u - at.u, v - at.v); if (!best || d < best.d) best = { d, u, v }; };
    if (mode === "lid" && lidRing) lidRing.samples.forEach(([u, v], i) => { if (!lidRing.visited[i]) consider(u, v); });
    else if (mode === "carve") for (const [id, o] of outlines) {
      if (done(id, o)) continue;
      if (tool === "peeler" ? o.kind !== "etch" : o.kind !== "cut") continue;
      (o.kind === "etch" ? o.area : o.samples).forEach(([u, v], i) => { if (!(o.kind === "etch" ? o.peeled : o.visited)[i]) consider(u, v); });
    }
    if (!best) {
      // Nothing left for this tool: switch to the other one if it has work.
      if (mode === "carve" && [...outlines].some(([id, o]) => !done(id, o))) { tool = tool === "peeler" ? "knife" : "peeler"; hooks.onTool?.(tool); }
      return;
    }
    const step = Math.min(best.d, TRACE_SPEED * dt), k = best.d ? step / best.d : 1, u = at.u + (best.u - at.u) * k, v = at.v + (best.v - at.v) * k;
    if (best.d > .2) { lastAt = { u, v }; aim({ u, v }); return; }              // gliding over to the next one, not cutting
    work({ u, v }, dt); aim({ u, v });
  }
  function status() {
    const cur = session(), st = stencil();
    const pieces = st && !st.freehand ? st.pieces.map((p) => { const o = outlines.get(p.id), kind = pieceKind(p); return { id: p.id, kind, cut: (kind === "etch" ? cur.etched : cur.cut).includes(p.id), progress: o ? (done(p.id, o) ? 1 : progressOf(o)) : 0 }; }) : [];
    return { stencil: st?.id ?? null, mode, tool, pieces, lid: lidRing ? lidRing.visited.reduce((n, x) => n + x, 0) / lidRing.visited.length : cur?.lid ? 1 : 0, pulp: pulp ? pulp.left : cur?.scooped ? 0 : 1, seeds: pulp?.seedsOut ?? 0, seedCount: pulp?.seedCount ?? 0, free: cur?.free?.length ?? 0, chunks: chunks.length, revealing: !!reveal };
  }

  // The view: framed clear of the panel, eased between the steps' angles.
  function resize(w = canvas.clientWidth, h = canvas.clientHeight) {
    camera.aspect = w / Math.max(1, h);
    if (insetX || insetY) camera.setViewOffset(w, h, insetX / 2, insetY / 2, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  // Far enough back that the pumpkin and its hat fit the space beside or above the panel.
  function fit(view) {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1, t = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const across = (w - insetX) / h * t, up = (h - insetY) / h * t;
    return Math.max(view.dist, 2.7 / Math.max(.1, across) * view.dist / 5.4, 2.5 / Math.max(.1, up) * view.dist / 5.4);
  }
  function placeFor(name) {
    const view = VIEWS[name], d = fit(view), y = lift + (surf?.height ?? 1.2) * view.y;
    return { target: new THREE.Vector3(0, y, 0), pos: new THREE.Vector3().setFromSphericalCoords(d, view.phi, view.theta).add(new THREE.Vector3(0, y, 0)), d };
  }
  function goTo(name, seconds = .9) {
    resize(); const to = placeFor(name);
    controls.maxDistance = Math.max(7, to.d * 1.25);
    tween = { t: 0, seconds, fromPos: camera.position.clone(), fromTarget: controls.target.clone(), to };
    controls.enabled = false;
  }
  const viewFor = (s) => s === "open" ? (session()?.lid ? "inside" : "top") : s === "dress" || s === "finish" ? "hero" : "front";

  // Lighting the candle: the lamp dims, a match goes in through the top, the
  // candle catches, the lid goes back on, and the view swings round.
  function light() {
    const cur = session(); if (!cur?.lit || reveal) return;
    reveal = { t: 0, lit: false, lidDone: false }; lidBack = false; refresh(); goTo("top", 1);
    match.visible = true; match.position.set(.5, lift + surf.height + .8, .3); match.rotation.set(0, 0, -.4);
    hooks.sound?.("match");
  }
  function revealTick(dt) {
    const r = reveal; r.t += dt; const t = r.t, top = lift + surf.height;
    mood(Math.min(1, t / .7));
    // The match: struck above the opening, then lowered in to the wick.
    if (t < 1.3) { const k = ease((t - .35) / .8); match.position.set(.5 - .5 * k, top + .8 - (.8 + surf.height * .55) * k, .3 - .3 * k); match.rotation.set(0, 0, -.4 * (1 - k)); flash.position.copy(match.position).y += .28; flash.intensity = t > .1 ? 3.5 * (1 - Math.max(0, t - .2) * .4) * (.85 + .15 * Math.sin(t * 40)) : 0; }
    if (t >= 1.25 && !r.lit) { r.lit = true; match.visible = false; flash.intensity = 0; hooks.sound?.("catch"); refresh(); for (let i = 0; i < 18; i++) embers.push({ p: new THREE.Vector3(0, top, 0), v: new THREE.Vector3((Math.random() - .5) * .6, .6 + Math.random() * .8, (Math.random() - .5) * .6), life: 0 }); }
    // The lid lifts off the bench and settles back on top.
    if (t >= 1.6 && !lidAnim && !r.lidDone && lidPiece) { r.lidDone = true; lidAnim = { t: 0, from: lidPiece.position.clone(), fromRot: lidPiece.rotation.y, to: new THREE.Vector3(0, lift, 0), toRot: 0, back: true }; }
    if (t >= 1.6 && !lidPiece && !r.lidDone) { r.lidDone = true; lidBack = true; refresh(); }
    if (t >= 2.3 && !tween && !r.swung) { r.swung = true; goTo("hero", 1.2); }
    if (t > 3.6 && !lidAnim && !tween) { reveal = null; hooks.sound?.("sparkle"); hooks.onRevealed?.(); controls.enabled = active; }
  }
  // 0 is the lamp on for work, 1 the bench at night with the lantern lit.
  let moodNow = 0;
  function mood(k) {
    moodNow = k;
    key.intensity = 11 + (1.6 - 11) * k; lampLight.intensity = 2.2 + (.8 - 2.2) * k; hemi.intensity = .8 + (.28 - .8) * k; fill.intensity = 2.4 + (1.3 - 2.4) * k; soft.intensity = .35 + (.1 - .35) * k; set.setGlow(1 - .25 * k);
  }

  return {
    scene, camera,
    enter() { active = true; built = ""; lidBack = !!session()?.lit; refresh(); mood(session()?.lit ? 1 : 0); goTo(viewFor(step), .01); hooks.sound?.("garden", true); },
    leave() {
      active = false; controls.enabled = false; pointer = null; tracing = false; tween = null; reveal = null; lidAnim = null; stroke = null; match.visible = false; flash.intensity = 0;
      for (const t of Object.values(tools)) t.visible = false;
      for (const c of chunks) { holder.remove(c.group); disposeEstateObject(c.group); } chunks = []; flying = []; embers = [];
      clearPumpkin(); hooks.sound?.("garden", false); hooks.sound?.("rest");
    },
    refresh() { refresh(); },
    resize,
    // Room the controls take on the right or at the bottom, in pixels.
    setInset(right = 0, bottom = 0) { insetX = right; insetY = bottom; resize(); },
    // The panel's step decides what the pointer does and where the view looks.
    setStep(next) {
      const cur = session(), m = next === "open" ? (cur?.lid ? (cur.scooped ? "idle" : "scoop") : "lid") : next === "carve" && !cur?.lit ? "carve" : "idle";
      const moved = next !== step || m !== mode;
      step = next; mode = m; if (m === "carve" && tool === "turn") tool = "knife";
      if (m === "carve" && !stencil()?.pieces.some((p) => pieceKind(p) === "etch") && tool === "peeler") tool = "knife";
      if (moved && active && !reveal) goTo(viewFor(next));
      if (moved) { aim(null); lastAt = null; }
      refresh();
    },
    setTool(t) { tool = ["knife", "peeler", "turn"].includes(t) ? t : "knife"; aim(null); controls.enabled = active && !tween && !reveal; },
    get tool() { return tool; },
    setTracing(on) { tracing = !!on; if (!on) { lastAt = null; speed = 0; hooks.sound?.("rest"); if (stroke) closeStroke(); } },
    // Keyboard and pad: move the tool across what it works on.
    nudge(dx, dy, dt) {
      if (!working()) return;
      const at = toolAt ?? (mode === "scoop" ? { x: 0, z: 0 } : mode === "lid" ? { u: 0, v: .3 } : { u: 0, v: 0 });
      if (mode === "scoop") { const r = surf.lidRadius * SIZE / 2, x = THREE.MathUtils.clamp(at.x + dx * dt * .6, -r, r), z = THREE.MathUtils.clamp(at.z - dy * dt * .6, -r, r); aim({ x, z }); work({ x, z }, dt); return; }
      const lim = mode === "lid" ? .6 : .95, u = THREE.MathUtils.clamp(at.u + dx * dt * .7, -lim, lim), v = THREE.MathUtils.clamp(at.v + (mode === "lid" ? -dy : dy) * dt * .7, -lim, lim);
      if (stencil()?.freehand && mode === "carve" && !tracing) { lastAt = null; aim({ u, v }); return; }
      work({ u, v }, dt); aim({ u, v });
    },
    orbit(dx, dy, dt) { const o = camera.position.clone().sub(controls.target), sph = new THREE.Spherical().setFromVector3(o); sph.theta -= dx * dt * 1.6; sph.phi = THREE.MathUtils.clamp(sph.phi - dy * dt * .9, controls.minPolarAngle, controls.maxPolarAngle); camera.position.copy(controls.target).add(o.setFromSpherical(sph)); controls.update(); },
    zoom(direction) { const o = camera.position.clone().sub(controls.target); o.setLength(THREE.MathUtils.clamp(o.length() * Math.exp(-direction * .12), controls.minDistance, controls.maxDistance)); camera.position.copy(controls.target).add(o); controls.update(); },
    reset() { goTo(viewFor(step)); },
    light,
    // A photo of the lantern for the finish card, taken from the next frame.
    photo() { return new Promise((resolve) => { photoWanted = resolve; }); },
    afterRender(drawn) {
      if (!photoWanted || tween || reveal) return;
      const done = photoWanted; photoWanted = null;
      try {
        const p = new THREE.Vector3(0, lift + (surf?.height ?? 1) * .5, 0).project(camera), w = drawn.width, h = drawn.height;
        const side = Math.min(w - insetX * (w / canvas.clientWidth), h - insetY * (h / canvas.clientHeight)) * .82, cx = (p.x + 1) / 2 * w, cy = (1 - p.y) / 2 * h;
        const out = document.createElement("canvas"); out.width = out.height = 360;
        out.getContext("2d").drawImage(drawn, Math.max(0, cx - side / 2), Math.max(0, cy - side / 2), side, side, 0, 0, 360, 360);
        done(out.toDataURL("image/jpeg", .86));
      } catch { done(null); }
    },
    // QA: finish a job in one go.
    traceAll(id) { const o = outlines.get(id); if (!o) return false; lastAt = null; if (o.kind === "etch") { const was = tool; tool = "peeler"; for (const [u, v] of o.area) peelTo(u, v); tool = was; } else for (const [u, v] of o.samples) cutTo(u, v); lastAt = null; return true; },
    lidAll() { if (!lidRing) return false; lastAt = null; for (const [u, v] of lidRing.samples) lidTo(u, v); lastAt = null; return true; },
    scoopAll() { let n = 0; while (pulp && n++ < 400) { const a = n * .7, r = surf.lidRadius * SIZE / 2 * (.2 + (n % 5) * .2); scoopAt(Math.cos(a) * r, Math.sin(a) * r, .45); } return !pulp; },
    drawFree(poly) { stroke = null; lastAt = null; for (const [u, v] of [...poly, poly[0]]) drawTo(u, v); if (stroke) closeStroke(); return session()?.free?.length ?? 0; },
    tick(dt, time) {
      if (!active) return;
      set.tick(time); sawPhase += dt * 26;
      if (tracing && !hooks.blocked?.() && !reveal && working()) trace(dt);
      if (tween) {
        tween.t += dt / tween.seconds; const k = ease(tween.t);
        // The camera keeps looking at the moving target, so no frame of the move looks away.
        camera.position.lerpVectors(tween.fromPos, tween.to.pos, k); controls.target.lerpVectors(tween.fromTarget, tween.to.target, k); camera.lookAt(controls.target);
        if (tween.t >= 1) { tween = null; controls.enabled = active && !reveal; }
      }
      if (reveal) revealTick(dt);
      if (lidAnim && lidPiece) {
        lidAnim.t += dt / .8; const k = ease(lidAnim.t);
        lidPiece.position.lerpVectors(lidAnim.from, lidAnim.to, k); lidPiece.position.y += Math.sin(k * Math.PI) * .5;
        lidPiece.rotation.y = lidAnim.fromRot + (lidAnim.toRot - lidAnim.fromRot) * k; lidPiece.rotation.z = Math.sin(k * Math.PI) * .35;
        if (lidAnim.t >= 1) { const back = lidAnim.back; lidAnim = null; if (back) { lidBack = true; holder.remove(lidPiece); disposeEstateObject(lidPiece); lidPiece = null; refresh(); hooks.sound?.("thud"); } else hooks.sound?.("thud"); }
      }
      const cur = session(), glow = shownLit(cur);
      candle.intensity = glow ? 2.6 * (.86 + .1 * Math.sin(time * 11) + .06 * Math.sin(time * 23.7)) : 0;
      for (let i = chunks.length - 1; i >= 0; i--) {
        const c = chunks[i]; c.life += dt; c.vel.y -= 4.2 * dt; c.group.position.addScaledVector(c.vel, dt);
        c.group.rotation.x += c.spin.x * dt; c.group.rotation.y += c.spin.y * dt;
        if (c.group.position.y < c.floor) { c.group.position.y = c.floor; c.vel.multiplyScalar(.35); c.vel.y = Math.abs(c.vel.y) * .3; if (!c.landed) { c.landed = true; hooks.sound?.("thud"); } }
        if (c.life > 2.6) { holder.remove(c.group); disposeEstateObject(c.group); chunks.splice(i, 1); }
      }
      embers = embers.filter((p) => (p.life += dt) < .9);
      for (const p of embers) { p.p.addScaledVector(p.v, dt); p.v.y -= .8 * dt; }
      ember.geometry.setAttribute("position", new THREE.Float32BufferAttribute(embers.flatMap((p) => [p.p.x, p.p.y, p.p.z]), 3));
      drawBits(dt);
      if (marksDirty) paintMarks();
      if (pointer === null && !tracing) { speed *= .8; if (speed < .02) hooks.sound?.("rest"); }
      if (toolAt && tools.knife.visible) aim(toolAt);
      if (!tween) controls.update();
    },
    get status() { return status(); },
    get active() { return active; },
    get mood() { return moodNow; },
  };
}
