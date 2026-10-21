import * as THREE from "three";
import { customerBag, disposeCustomerBag } from "./customer-bag.js";
import { applyPieceColour } from "./piece-colours.js";
import { GRID, footprint, pieceFootprint, roomStyle, roomPieces, roomLayout, available, displayCount, decorById } from "./model.js";
import { WALL_H, INTERIOR, buildRoom, buildShopInterior, SHOP_SPOTS } from "./interiors.js";
import { decorProp, shelfBooks, decorReady } from "./decor.js";

// The places you can step into: the cottage's rooms and the Honest Pumpkin.
// They are built away from the farm (ORIGIN), one at a time, from the save.
export const ORIGIN = { room: new THREE.Vector3(200, 0, 0), shop: new THREE.Vector3(260, 0, 0) };
// Indoors the camera looks into the room from the front, lower than outside, so
// figures and standing pieces lean back less (and stretch to keep the art true).
const LEAN = INTERIOR.lean, STRETCH = 1 / Math.cos(INTERIOR.pitch - LEAN);
function indoors(figure) {
  const lean = figure.children[0];
  if (figure.userData.kind === "visitor" && !figure.userData.sprite) return figure;   // the hand-built neighbours stand upright
  if (lean) { lean.rotation.x = -LEAN; lean.scale.y = STRETCH; }
  // A sprite is one plane, and shadows are drawn from back faces by default: the
  // key light is in front, so it would see only the side that isn't drawn.
  figure.traverse((m) => { if (m.isMesh && m.customDepthMaterial) m.material.shadowSide = THREE.DoubleSide; });
  return figure;
}
const LIGHTS = 7;                                                    // a fixed pool, so shaders never recompile
// The key light: a warm lamp hung high above the front left, so pieces and
// people throw soft shadows back and to the right across the floor and up the
// walls, where the camera can see them, and the light falls away into the
// corners as in the paintings.
const KEY = { at: { x: 1.2, y: 10, z: 7.5 }, aim: { x: 5.6, y: 0.5, z: 2.6 }, colour: 0xffd9ae, intensity: 2.8 };
// The farm's sky and moonlight reach the rooms too, unshadowed. Indoors they are
// turned down to a soft fill, so the lamp and the room's own lights carry it.
const FARM_INDOORS = { hemisphere: 0.26, directional: 0.1 };

export function createPlaces({ scene, state, character, visitorModel, pumpkinTemplate, animate }) {
  const root = new THREE.Group();
  scene.add(root);
  const pool = Array.from({ length: LIGHTS }, () => { const l = new THREE.PointLight(0xffb060, 0, 9, 1.4); scene.add(l); return l; });
  // Added once and kept: only its place, brightness and shadow updates change.
  const keyLight = new THREE.SpotLight(KEY.colour, 0, 0, 0.9, 0.5, 0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.focus = 0.85;                                       // the room, not the whole soft cone
  keyLight.shadow.bias = -0.0002; keyLight.shadow.normalBias = 0.012;
  keyLight.shadow.camera.near = 4; keyLight.shadow.camera.far = 24;
  keyLight.shadow.autoUpdate = false;
  scene.add(keyLight, keyLight.target);
  const guestHitGeometry = new THREE.BoxGeometry(1.1, 2.2, .8), guestHitMaterial = new THREE.MeshBasicMaterial({ visible: false }); guestHitGeometry.userData.shared = true;
  let farm = null;
  let place = null, built = null, pieces = new Map(), pickables = [], actors = [], customers = new Map(), tables = [], skyla = null;
  let selection = null, ghost = null, showGrid = false, gridLines = null, tableKey = "";

  // Light for inside (the key over this place, the farm turned down) or for the farm again.
  function lightIndoors(origin) {
    if (origin && !farm) farm = scene.children.filter((o) => (o.isHemisphereLight || o.isAmbientLight || o.isDirectionalLight) && o !== keyLight)
      .map((l) => ({ l, intensity: l.intensity, update: l.shadow?.autoUpdate }));
    if (!origin && farm) { for (const f of farm) { f.l.intensity = f.intensity; if (f.l.shadow) f.l.shadow.autoUpdate = f.update; } farm = null; }
    if (origin) for (const f of farm) {
      f.l.intensity = f.intensity * (f.l.isDirectionalLight ? FARM_INDOORS.directional : FARM_INDOORS.hemisphere);
      if (f.l.shadow) f.l.shadow.autoUpdate = false;                 // the farm's shadows can wait until we're back out
    }
    keyLight.intensity = origin ? KEY.intensity : 0;
    keyLight.shadow.autoUpdate = !!origin;
    if (!origin) return;
    keyLight.position.set(origin.x + KEY.at.x, KEY.at.y, origin.z + KEY.at.z);
    keyLight.target.position.set(origin.x + KEY.aim.x, KEY.aim.y, origin.z + KEY.aim.z);
    keyLight.target.updateMatrixWorld();
  }

  const clear = () => {
    for (const guide of [selection?.box, selection?.ring, ghost, gridLines]) if (guide) { root.remove(guide); guide.geometry.dispose(); guide.material.dispose(); }
    for (const o of [...root.children]) { root.remove(o); o.traverse?.((m) => { if (m.isMesh && m.geometry && !m.geometry.userData.shared) m.geometry.dispose?.(); for (const mat of Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) if(mat.userData.pieceColourOwned)mat.dispose(); }); }
    pool.forEach((l) => (l.intensity = 0));
    pieces = new Map(); pickables = []; actors = []; customers = new Map(); tables = []; skyla = null; selection = null; ghost = null; gridLines = null; tableKey = "";
  };
  const light = (spots, origin) => spots.slice(0, LIGHTS).forEach((s, i) => {
    pool[i].position.set(origin.x + s.x, s.y, origin.z + s.z);
    pool[i].color.setHex(s.color ?? 0xffb060);
    pool[i].intensity = s.intensity ?? 9;
  });
  const hitPlane = (w, h, type, at, rot, wall = "back") => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ visible: false }));
    m.position.copy(at); if (rot) m.rotation.x = rot;
    if (type === "wall" && wall !== "back") m.rotation.y = wall === "left" ? Math.PI / 2 : -Math.PI / 2;
    m.userData = { type, wall };
    root.add(m); pickables.push(m);
  };

  // A room of the cottage, with every piece placed in it.
  function buildRoomPlace(id) {
    clear();
    const layout = roomLayout(state, id) ?? GRID, { w, d } = layout;
    place = { kind: "room", id, w, d };
    const o = ORIGIN.room, wallpaper = decorById[state.house.wallpapers[id]];
    const shell = buildRoom(roomStyle(state, id).id, wallpaper, layout === GRID ? null : layout);
    shell.group.position.copy(o); root.add(shell.group);
    // Stairs, ladders and doorways: a tap takes you to the room they lead to.
    for (const l of shell.links ?? []) {
      const hit = new THREE.Mesh(new THREE.BoxGeometry(l.w, l.h, l.d), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(o.x + l.x + l.w / 2, l.y + l.h / 2, o.z + l.z + l.d / 2);
      hit.userData = { type: "go", to: l.to };
      root.add(hit); pickables.push(hit);
    }
    const lamps = [...shell.lights];
    if (decorReady()) for (const p of roomPieces(state, id)) lamps.push(...addPiece(p));
    light(lamps, o);
    lightIndoors(o);
    hitPlane(w, d, "floor", new THREE.Vector3(o.x + w / 2, 0.01, o.z + d / 2), -Math.PI / 2);
    hitPlane(w, WALL_H - 1.5, "wall", new THREE.Vector3(o.x + w / 2, 1.5 + (WALL_H - 1.5) / 2, o.z + 0.02));
    hitPlane(d, WALL_H - 1.5, "wall", new THREE.Vector3(o.x + 0.02, 1.5 + (WALL_H - 1.5) / 2, o.z + d / 2), 0, "left");
    hitPlane(d, WALL_H - 1.5, "wall", new THREE.Vector3(o.x + w - 0.02, 1.5 + (WALL_H - 1.5) / 2, o.z + d / 2), 0, "right");
    // Shane and Natalie are home too, at the front of the room.
    for (const [who, x] of [["natalie", 2.2], ["shane", w - 2.2]]) {
      const a = character(who);
      if (!a) continue;
      a.position.set(o.x + x, 0, o.z + d - 0.6);
      root.add(indoors(a));
      actors.push({ who, model: a, home: { x, z: d - 0.6 }, target: null, wait: 2 + Math.random() * 4 });
    }
    setGrid(showGrid);
  }

  // How high a wall piece hangs: the chandelier from the ceiling, the rest centred on the panel.
  const hangAt = (id, height) => (id === "d04" ? WALL_H - 0.45 - height : (decorById[id].hangHeight ?? 2.9) - height / 2);
  function addPiece(p) {
    const fp = pieceFootprint(p), o = ORIGIN.room, prop = decorProp(p.id), native = prop.userData.native === true;
    applyPieceColour(prop,p.tint,true);
    const g = new THREE.Group(), standing = fp.layer === "floor", lean = new THREE.Group(), height = prop.userData.height;
    lean.add(prop);
    if (p.books?.length) lean.add(shelfBooks(p.id, p.books, prop));
    // Modelled pieces are real 3D and stand as they are; the old standees lean back
    // and stretch like the sprites so their art keeps its proportions on screen.
    if (standing && !native) { lean.rotation.x = -LEAN; lean.scale.y = STRETCH; }
    g.add(lean);
    // Everything casts and takes shadows except rugs, which only take them, and what glows.
    prop.traverse((m) => { if (m.isMesh && !m.material.isMeshBasicMaterial) { m.castShadow = fp.layer !== "rug"; m.receiveShadow = true; } });
    const cx = p.x + fp.w / 2, cz = p.z + fp.d / 2, wall = fp.layer === "wall";
    // Wall pieces hang with their back against the wall; the rest sit centred on their cells.
    if (wall) {
      const offset = native ? 0.005 : 0.02;
      if (p.wall === "left") { g.position.set(o.x + offset, hangAt(p.id, height), o.z + cx); g.rotation.y = Math.PI / 2; }
      else if (p.wall === "right") { g.position.set(o.x + place.w - offset, hangAt(p.id, height), o.z + cx); g.rotation.y = -Math.PI / 2; }
      else g.position.set(o.x + cx, hangAt(p.id, height), o.z + offset);
    } else { g.position.set(o.x + cx, fp.layer === "rug" ? 0.005 : 0, o.z + cz); g.rotation.y = (p.rotation ?? 0) * Math.PI / 180; }
    if (p.flip) lean.scale.x = -1;
    root.add(g);
    const tall = Math.max(0.3, height), deep = wall ? Math.max(0.4, prop.userData.depth ?? 0) : fp.d * 0.95;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(fp.w * 0.95, tall, deep), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(g.position).add(new THREE.Vector3(0, tall / 2, wall ? deep / 2 : 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), wall ? g.rotation.y : 0));
    if (wall) hit.rotation.y = g.rotation.y;
    hit.userData = { type: "piece", instance: p.instance };
    root.add(hit); pickables.push(hit);
    pieces.set(p.instance, { group: g, hit, piece: p, bottom: g.position.y, height: tall });
    // Lamps, candles and glowing jars light the room around them.
    const lamp = prop.userData.glowing || ["lights"].includes(decorById[p.id].category);
    return lamp ? [{ x: g.position.x - o.x + (wall ? Math.sin(g.rotation.y) * 0.6 : 0), y: wall ? g.position.y + height * 0.6 : Math.max(0.8, height * 0.85), z: g.position.z - o.z + (wall ? Math.cos(g.rotation.y) * 0.6 : 0), intensity: 7 }] : [];
  }

  // The Honest Pumpkin's shop floor.
  function buildShopPlace() {
    clear();
    place = { kind: "shop", w: GRID.w, d: GRID.d };
    const o = ORIGIN.shop, shell = buildShopInterior();
    shell.group.position.copy(o); root.add(shell.group);
    light(shell.lights, o);
    lightIndoors(o);
    const c = SHOP_SPOTS.counter, cat = character("skyla");
    if (cat) { cat.position.set(o.x + c.x + 0.1, 1.27, o.z + c.z - 0.2); root.add(indoors(cat)); skyla = cat; }
    hitPlane(GRID.w, GRID.d, "shop-floor", new THREE.Vector3(o.x + GRID.w / 2, 0.01, o.z + GRID.d / 2), -Math.PI / 2);
  }

  // Up to three pumpkins of each displayed variety, from what's in stock.
  function refreshTables() {
    const shop = state.shop, key = shop.displays.slice(0, displayCount(shop)).map((v) => (v === null ? "-" : v + ":" + Math.min(3, available(state, v)))).join("|");
    if (key === tableKey) return;
    tableKey = key;
    tables.forEach((t) => root.remove(t)); tables = [];
    shop.displays.slice(0, displayCount(shop)).forEach((v, i) => {
      if (v === null) return;
      const t = SHOP_SPOTS.tables[i], n = Math.min(3, available(state, v)), g = new THREE.Group();
      for (let k = 0; k < n; k++) { const m = pumpkinTemplate(v).clone(); m.scale.setScalar(0.62); m.position.set(-0.5 + k * 0.5, 0.9, (k % 2) * 0.15); g.add(m); }
      g.traverse((m) => { if (m.isMesh && !m.material.isMeshBasicMaterial) m.castShadow = m.receiveShadow = true; });
      g.position.set(ORIGIN.shop.x + t.x, 0, ORIGIN.shop.z + t.z);
      root.add(g); tables.push(g);
    });
  }

  // Where a customer stands in each phase of their visit.
  function customerSpot(c, queueIndex) {
    if (c.phase === "entering" || c.phase === "leaving") return SHOP_SPOTS.door;
    if (c.phase === "browsing") { const t = SHOP_SPOTS.tables[c.slot % SHOP_SPOTS.tables.length]; return { x: t.x + (c.slot >= 4 ? 0.6 : 0), z: t.z + 0.9 }; }
    if (c.phase === "paying") return SHOP_SPOTS.pay;
    return SHOP_SPOTS.queue[Math.min(queueIndex, SHOP_SPOTS.queue.length - 1)];
  }

  function tickShop(dt, time) {
    refreshTables();
    const o = ORIGIN.shop, seen = new Set();
    const queue = state.shop.customers.filter((c) => c.phase === "queue");
    for (const c of state.shop.customers) {
      seen.add(c.id);
      let a = customers.get(c.id);
      if (!a) {
        a = { model: indoors(visitorModel(c.kind)), pos: { ...SHOP_SPOTS.door } };
        a.model.position.set(o.x + a.pos.x, 0, o.z + a.pos.z);
        a.hit = new THREE.Mesh(guestHitGeometry, guestHitMaterial); a.hit.position.y = 1.1; a.hit.userData = { type: "customer", id: c.id }; a.model.add(a.hit); pickables.push(a.hit);
        root.add(a.model); customers.set(c.id, a);
      }
      if (c.outcome === "bought" && c.quantity > 1 && state.customerCare.bags && !a.bag) { a.bag = customerBag(); a.bag.position.set(.38, .45, .3); a.model.add(a.bag); }
      // Entering, they walk in from the door; leaving, they walk back out.
      const target = c.phase === "entering" ? customerSpot({ ...c, phase: "browsing" }, 0) : customerSpot(c, queue.indexOf(c));
      const dx = target.x - a.pos.x, dz = target.z - a.pos.z, d = Math.hypot(dx, dz), step = Math.min(d, 2.4 * dt);
      if (d > 0.02) { a.pos.x += (dx / d) * step; a.pos.z += (dz / d) * step; }
      a.model.position.set(o.x + a.pos.x, 0, o.z + a.pos.z);
      animate(a.model, time + c.id, d > 0.05, c.id + time, d > 0.05 ? dx / d : 0);
    }
    for (const [id, a] of customers) if (!seen.has(id)) { root.remove(a.model); pickables = pickables.filter(p => p !== a.hit); disposeCustomerBag(a.bag); a.model.userData.dispose?.(); customers.delete(id); }
  }

  // Shane and Natalie potter about the room, between free spots near the front.
  function tickRoom(dt, time) {
    for (const a of actors) {
      const pos = a.model.position, o = ORIGIN.room;
      if (!a.target && (a.wait -= dt) <= 0) {
        // Short of the right wall, where the stairs come down.
        const x = 1 + Math.random() * (place.w - 3), z = place.d - 0.4 - Math.random() * 1.2;
        a.target = { x, z };
      }
      let moving = false, dx = 0;
      if (a.target) {
        const tx = o.x + a.target.x, tz = o.z + a.target.z, ddx = tx - pos.x, dz = tz - pos.z, d = Math.hypot(ddx, dz);
        if (d < 0.05) { a.target = null; a.wait = 3 + Math.random() * 5; }
        else { const step = Math.min(d, 1.4 * dt); pos.x += (ddx / d) * step; pos.z += (dz / d) * step; moving = true; dx = ddx; }
      }
      animate(a.model, time, moving, a.who === "shane" ? 1.7 : 0, dx);
    }
  }

  // Decorating: a gold outline round the chosen piece, and where it would go.
  // Floor pieces show their cells; wall pieces a frame as tall as the piece.
  function outline(fp, at, colour, height) {
    const wall = fp.layer === "wall";
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(fp.w, wall ? height : 0.12, wall ? 0.1 : fp.d)), new THREE.LineBasicMaterial({ color: colour, toneMapped: false }));
    box.position.copy(at);
    root.add(box);
    return box;
  }
  const outlineAt = (entry, fp, x, z) => {
    const o = ORIGIN.room, wall = fp.layer === "wall";
    if (wall && entry.piece.wall === "left") return new THREE.Vector3(o.x + 0.05, entry.bottom + entry.height / 2, o.z + x + fp.w / 2);
    if (wall && entry.piece.wall === "right") return new THREE.Vector3(o.x + place.w - 0.05, entry.bottom + entry.height / 2, o.z + x + fp.w / 2);
    return new THREE.Vector3(o.x + x + fp.w / 2, wall ? entry.bottom + entry.height / 2 : 0.06, o.z + (wall ? 0.05 : z + fp.d / 2));
  };
  function select(instance) {
    if (selection) { root.remove(selection.box); selection.box.geometry.dispose(); selection.box.material.dispose(); if (selection.ring) { root.remove(selection.ring); selection.ring.geometry.dispose(); selection.ring.material.dispose(); } selection = null; }
    if (ghost) { root.remove(ghost); ghost.geometry.dispose(); ghost.material.dispose(); ghost = null; }
    const entry = pieces.get(instance);
    if (!entry) return;
    const p = entry.piece, fp = pieceFootprint(p);
    selection = { instance, box: outline(fp, outlineAt(entry, fp, p.x, p.z), 0xffd36a, entry.height) };
    selection.box.rotation.y = fp.layer === "wall" ? entry.group.rotation.y : 0;
    if (fp.layer !== "wall") {
      const r = Math.max(fp.w, fp.d) * 0.55 + 0.15;
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.025, 64), new THREE.MeshBasicMaterial({ color: 0xe7b46e, transparent: true, opacity: 0.65, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(entry.group.position.x, 0.045, entry.group.position.z); root.add(ring); selection.ring = ring;
    }
  }
  function preview(instance, x, z, ok) {
    if (ghost) { root.remove(ghost); ghost.geometry.dispose(); ghost.material.dispose(); ghost = null; }
    const entry = pieces.get(instance);
    if (!entry || x === null) return;
    const fp = pieceFootprint(entry.piece);
    ghost = outline(fp, outlineAt(entry, fp, x, z), ok ? 0x8ae6a0 : 0xff6a5a, entry.height);
    ghost.rotation.y = fp.layer === "wall" ? entry.group.rotation.y : 0;
  }
  function setGrid(on) {
    showGrid = on;
    if (gridLines) { root.remove(gridLines); gridLines.geometry.dispose(); gridLines.material.dispose(); gridLines = null; }
    if (!on || place?.kind !== "room") return;
    const pts = [], o = ORIGIN.room;
    const { w, d } = place;
    for (let x = 0; x <= w; x++) pts.push(o.x + x, 0.02, o.z, o.x + x, 0.02, o.z + d);
    for (let z = 0; z <= d; z++) pts.push(o.x, 0.02, o.z + z, o.x + w, 0.02, o.z + z);
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    gridLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffe0a8, transparent: true, opacity: 0.18, toneMapped: false }));
    root.add(gridLines);
  }

  return {
    get place() { return place; },
    get pickables() { return pickables; },
    enterRoom(id) { buildRoomPlace(id); },
    enterShop() { buildShopPlace(); },
    leave() { clear(); place = null; lightIndoors(null); },
    refresh() { if (place?.kind === "room") { const sel = selection?.instance; buildRoomPlace(place.id); if (sel) select(sel); } },
    select, preview, setGrid,
    rotatePiece(instance) {
      const entry = pieces.get(instance); if (!entry) return;
      const p = entry.piece, fp = pieceFootprint(p);
      if (fp.layer === "wall") return;
      entry.group.position.x = ORIGIN.room.x + p.x + fp.w / 2; entry.group.position.z = ORIGIN.room.z + p.z + fp.d / 2;
      entry.group.rotation.y = (p.rotation ?? 0) * Math.PI / 180;
      entry.hit.geometry.dispose(); entry.hit.geometry = new THREE.BoxGeometry(fp.w * 0.95, entry.height, fp.d * 0.95);
      entry.hit.position.x = entry.group.position.x; entry.hit.position.z = entry.group.position.z;
      select(instance);
    },
    // Turns a tap on the floor or the wall into a grid cell.
    cellAt(point, type, wall = "back") {
      const o = ORIGIN.room;
      return type === "wall" ? { x: Math.floor(wall === "back" ? point.x - o.x : point.z - o.z), z: 0, wall } : { x: Math.floor(point.x - o.x), z: Math.floor(point.z - o.z) };
    },
    tick(dt, time, paying) {
      if (place?.kind === "shop") { tickShop(dt, time); if (skyla) animate(skyla, time, false, 0, 0, paying); }
      if (place?.kind === "room") tickRoom(dt, time);
    },
  };
}
