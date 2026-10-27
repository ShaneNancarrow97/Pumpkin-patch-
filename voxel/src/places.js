import * as THREE from "three";
import { customerBag, disposeCustomerBag } from "./customer-bag.js";
import { buildFoodWallDisplay, buildFoodProp, disposeFoodProp } from "./food-props.js";
import { availableFood } from "./rules/cooking-sales.js";
import { kitchenEquipment } from "./rules/kitchen-equipment.js";
import { RECIPE_BY_ID } from "./content/cooking.js";
import { applyPieceColour } from "./piece-colours.js";
import { GRID, footprint, pieceFootprint, pieceBody, roomStyle, roomPieces, roomLayout, available, displayCount, decorById, hostSurfaces } from "./model.js";
import { riderSize } from "./rules/surfaces.js";
import { WALL_H, INTERIOR, buildRoom, buildShopInterior, SHOP_SPOTS } from "./interiors.js";
import { decorProp, shelfBooks, decorReady } from "./decor.js";
import { createHomePets, homePetTextures } from "./home-pets.js";

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
  keyLight.castShadow = true; keyLight.visible = false;              // switched on indoors only, so the farm never pays for it
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.focus = 0.85;                                       // the room, not the whole soft cone
  keyLight.shadow.bias = -0.0002; keyLight.shadow.normalBias = 0.012;
  keyLight.shadow.camera.near = 4; keyLight.shadow.camera.far = 24;
  keyLight.shadow.autoUpdate = false;
  scene.add(keyLight, keyLight.target);
  const guestHitGeometry = new THREE.BoxGeometry(1.1, 2.2, .8), guestHitMaterial = new THREE.MeshBasicMaterial({ visible: false }); guestHitGeometry.userData.shared = true;
  let farm = null;
  let place = null, built = null, pieces = new Map(), pickables = [], actors = [], customers = new Map(), tables = [], skyla = null;
  let controlled = null;
  let pets = null;
  let selection = null, ghost = null, showGrid = false, gridLines = null, tableKey = "";
  let foodDisplays = [], foodDisplayKey = "";
  // A tiny reused steam rig follows the physical appliance, including turning
  // or moving it. No lights or inventory mutations are added by the effect.
  const cookingFX = new THREE.Group(); cookingFX.name = "Working kitchen appliance"; cookingFX.visible = false; scene.add(cookingFX);
  const puffGeo = new THREE.SphereGeometry(.065, 6, 4), steam = [];
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(puffGeo, new THREE.MeshBasicMaterial({ color: 0xeee0cd, transparent: true, opacity: .16, depthWrite: false })); cookingFX.add(m); steam.push(m); }
  const warmth = new THREE.Mesh(new THREE.PlaneGeometry(.36, .12), new THREE.MeshBasicMaterial({ color: 0xffac51, transparent: true, opacity: .35, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); cookingFX.add(warmth);
  let kitchenFXStatus = { active: false, recipe: null, method: null, steam: 0 };
  function tickKitchen(time) {
    const job = place?.kind === "room" && place.id === "kitchen" && state.kitchen?.jobs.home, recipe = RECIPE_BY_ID[job?.recipe];
    const appliance = recipe && [...pieces.values()].find(e => e.piece.room === "kitchen" && (recipe.method === "bake" ? ["kitchen-oven", "copper-range"] : ["kitchen-hob", "copper-range"]).includes(e.piece.id));
    cookingFX.visible = !!appliance;
    kitchenFXStatus = { active: !!appliance, recipe: job?.recipe ?? null, method: recipe?.method ?? null, steam: appliance ? 4 : 0 };
    if (!appliance) return;
    const socket = appliance.piece.id === "copper-range" ? 1.235 : recipe.method === "bake" ? 1.56 : 1.19;
    appliance.group.updateWorldMatrix(true, false);
    cookingFX.position.copy(appliance.group.localToWorld(new THREE.Vector3(0, socket, .04)));
    cookingFX.rotation.y = appliance.group.rotation.y;
    for (let i = 0; i < steam.length; i++) { const t = ((state.time * .65 + i / 4) % 1); steam[i].position.set(Math.sin(t * 6 + i) * .055, .08 + t * .46, 0); steam[i].scale.setScalar(.55 + t); steam[i].material.opacity = .19 * (1 - t); }
    warmth.position.set(0, recipe.method === "bake" ? -.72 : -.04, recipe.method === "bake" ? .42 : .05); warmth.rotation.x = recipe.method === "bake" ? 0 : -Math.PI / 2;
    warmth.material.opacity = .24 + Math.sin(state.time * 5) * .05;
  }

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
    keyLight.visible = !!origin;                                       // each shader variant compiles once, then switches
    keyLight.shadow.autoUpdate = !!origin;
    if (!origin) return;
    keyLight.position.set(origin.x + KEY.at.x, KEY.at.y, origin.z + KEY.at.z);
    keyLight.target.position.set(origin.x + KEY.aim.x, KEY.aim.y, origin.z + KEY.aim.z);
    keyLight.target.updateMatrixWorld();
  }

  const clear = () => {
    pets?.clear(); pets = null;
    cookingFX.visible = false; kitchenFXStatus = { active: false, recipe: null, method: null, steam: 0 };
    for (const f of foodDisplays) disposeFoodProp(f); foodDisplays = []; foodDisplayKey = "";
    for (const a of customers.values()) if (a.food) { disposeFoodProp(a.food); a.food = null; }
    for (const guide of [selection?.box, selection?.ring, ghost, gridLines]) if (guide) { guide.removeFromParent(); guide.geometry.dispose(); guide.material.dispose(); }
    for (const o of [...root.children]) { root.remove(o); o.traverse?.((m) => { if (m.isMesh && m.geometry && !m.geometry.userData.shared) m.geometry.dispose?.(); for (const mat of Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) if(mat.userData.pieceColourOwned)mat.dispose(); }); }
    pool.forEach((l) => (l.intensity = 0));
    pieces = new Map(); pickables = []; actors = []; customers = new Map(); tables = []; skyla = null; selection = null; ghost = null; gridLines = null; tableKey = "";
  };
  const light = (spots, origin) => spots.slice(0, LIGHTS).forEach((s, i) => {
    pool[i].position.set(origin.x + s.x, s.y, origin.z + s.z);
    pool[i].color.setHex(s.color ?? 0xffb060);
    pool[i].intensity = s.intensity ?? 9; pool[i].distance = 9; pool[i].decay = 1.4;
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
    // Tables and shelves before what stands on them.
    const list = roomPieces(state, id);
    if (decorReady()) for (const p of [...list.filter((q) => !q.on), ...list.filter((q) => q.on)]) lamps.push(...addPiece(p));
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
    pets = createHomePets({ group: root, state, room: id, layout, origin: o });
    setGrid(showGrid);
  }

  // How high a wall piece hangs: the chandelier from the ceiling, the rest centred on the panel.
  const hangAt = (id, height) => (id === "d04" ? WALL_H - 0.45 - height : (decorById[id].hangHeight ?? 2.9) - height / 2);
  // Where a piece standing on another sits in its host's group: its centre on the
  // top, measured in the host's unturned frame (rules/surfaces.js).
  function riderAt(host, p) {
    const fp = footprint(host.piece.id), t = hostSurfaces(host.piece)[p.top];
    if (!t) return null;
    return new THREE.Vector3(p.x - fp.w / 2, t.y, fp.layer === "wall" ? p.z : p.z - fp.d / 2);
  }
  // A small piece on a table or a shelf: it rides in its host's group, so it
  // moves, turns and mirrors with it; its hit box rides along too.
  function addRider(p, prop) {
    const host = pieces.get(p.on), at = host && riderAt(host, p);
    if (!at) return [];
    applyPieceColour(prop, p.tint, true);
    prop.traverse((m) => { if (m.isMesh && !m.material.isMeshBasicMaterial) { m.castShadow = true; m.receiveShadow = true; } });
    const g = new THREE.Group(), lean = new THREE.Group(), height = prop.userData.height, size = riderSize(p.id);
    lean.add(prop); g.add(lean);
    if (p.flip) lean.scale.x = -1;
    g.position.copy(at); g.rotation.y = ((p.rotation ?? 0) * Math.PI) / 180;
    host.group.add(g);
    const tall = Math.max(0.3, height), hit = new THREE.Mesh(new THREE.BoxGeometry(size.w * 0.95, tall, size.d * 0.95), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(at).add(new THREE.Vector3(0, tall / 2, 0)); hit.rotation.y = g.rotation.y;
    hit.userData = { type: "piece", instance: p.instance, host: p.on };
    host.group.add(hit); pickables.push(hit);
    pieces.set(p.instance, { group: g, hit, piece: p, bottom: at.y, height: tall, rider: true, host: p.on, tick: prop.userData.tick });
    const lamp = prop.userData.glowing || ["lights"].includes(decorById[p.id].category);
    if (!lamp) return [];
    host.group.updateMatrixWorld(true);
    const w = g.localToWorld(new THREE.Vector3(0, height * 0.85, 0)), o = ORIGIN.room;
    return [{ x: w.x - o.x, y: w.y, z: w.z - o.z, intensity: 7 }];
  }
  function addPiece(p) {
    const prop = decorProp(p.id, { finish: p.finish });
    if (p.on) return addRider(p, prop);
    const fp = pieceFootprint(p), o = ORIGIN.room, native = prop.userData.native === true;
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
    const natural = footprint(p.id), tall = Math.max(0.3, height), deep = wall ? Math.max(0.4, prop.userData.depth ?? 0) : natural.d * 0.95;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(natural.w * 0.95, tall, deep), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(g.position).add(new THREE.Vector3(0, tall / 2, wall ? deep / 2 : 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), wall ? g.rotation.y : 0));
    hit.rotation.y = g.rotation.y;
    hit.userData = { type: "piece", instance: p.instance };
    root.add(hit); pickables.push(hit);
    pieces.set(p.instance, { group: g, hit, piece: p, bottom: g.position.y, height: tall, wallOffset: native ? .005 : .02, hitDepth: deep, tick: prop.userData.tick });
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

  // Dedicated shallow side-wall cabinets, clear of the door, till and floor
  // tables. Only their stock changes; rebuilding them never rebuilds the room.
  function refreshFood() {
    if (place?.kind !== "shop") return;
    const k = state.kitchen;
    const key = k?.purchased ? k.displays.map(id => `${id ?? "-"}:${id ? Math.min(3, availableFood(state, id)) : 0}`).join("|") : "off";
    if (key === foodDisplayKey) return;
    foodDisplayKey = key;
    for (const f of foodDisplays) disposeFoodProp(f); foodDisplays = [];
    pickables = pickables.filter(p => p.userData.type !== "food-display");
    if (!k?.purchased) return;
    const spots = [{ x: .08, z: 1.45, y: 1.55, yaw: Math.PI / 2 }, { x: GRID.w - .08, z: 4.7, y: 1.75, yaw: -Math.PI / 2 }];
    spots.forEach((p, slot) => {
      const id = k.displays[slot], g = buildFoodWallDisplay({ recipeId: id, count: id ? availableFood(state, id) : 0, slot });
      g.position.set(ORIGIN.shop.x + p.x, p.y, ORIGIN.shop.z + p.z); g.rotation.y = p.yaw;
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, .4), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(0, .65, .17); hit.userData = { type: "food-display", slot }; g.add(hit);
      root.add(g); foodDisplays.push(g); pickables.push(hit);
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
    refreshTables(); refreshFood();
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
      if (c.outcome === "bought" && (c.quantity > 1 || c.food?.quantity > 1) && state.customerCare.bags && !a.bag) { a.bag = customerBag(); a.bag.position.set(.38, .45, .3); a.model.add(a.bag); }
      if (c.food?.status === "paid" && !a.food) { a.food = buildFoodProp(c.food.recipe, { scale: .45 }); a.food.position.set(-.37, .82, .28); a.model.add(a.food); }
      // Entering, they walk in from the door; leaving, they walk back out.
      const target = c.phase === "entering" ? customerSpot({ ...c, phase: "browsing" }, 0) : customerSpot(c, queue.indexOf(c));
      const dx = target.x - a.pos.x, dz = target.z - a.pos.z, d = Math.hypot(dx, dz), step = Math.min(d, 2.4 * dt);
      if (d > 0.02) { a.pos.x += (dx / d) * step; a.pos.z += (dz / d) * step; }
      a.model.position.set(o.x + a.pos.x, 0, o.z + a.pos.z);
      animate(a.model, time + c.id, d > 0.05, c.id + time, d > 0.05 ? dx / d : 0);
    }
    for (const [id, a] of customers) if (!seen.has(id)) { root.remove(a.model); pickables = pickables.filter(p => p !== a.hit); disposeCustomerBag(a.bag); if (a.food) disposeFoodProp(a.food); a.model.userData.dispose?.(); customers.delete(id); }
  }

  // Shane and Natalie potter about the room, between free spots near the front.
  function tickRoom(dt, time) {
    pets?.tick(state.paused ? 0 : dt, time);
    tickKitchen(time);
    for (const e of pieces.values()) e.tick?.(time);                  // the cauldron's brew
    for (const a of actors) {
      if (a.who === controlled) { a.target = null; continue; }
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
    if (selection) { selection.box.removeFromParent(); selection.box.geometry.dispose(); selection.box.material.dispose(); if (selection.ring) { selection.ring.removeFromParent(); selection.ring.geometry.dispose(); selection.ring.material.dispose(); } selection = null; }
    if (ghost) { root.remove(ghost); ghost.geometry.dispose(); ghost.material.dispose(); ghost = null; }
    const entry = pieces.get(instance);
    if (!entry) return;
    if (entry.rider) { selectRider(entry); return; }
    const p = entry.pose ?? entry.piece, fp = pieceFootprint(p), natural = footprint(p.id), body = natural.layer === "wall" ? natural : { ...natural, ...pieceBody(p.id) };
    selection = { instance, box: outline(body, outlineAt(entry, fp, p.x, p.z), 0xffd36a, entry.height) };
    selection.box.rotation.y = entry.group.rotation.y;
    if (fp.layer !== "wall") {
      const r = Math.max(body.w, body.d) * 0.55 + 0.15;
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.025, 64), new THREE.MeshBasicMaterial({ color: 0xe7b46e, transparent: true, opacity: 0.65, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(entry.group.position.x, 0.045, entry.group.position.z); root.add(ring); selection.ring = ring;
    }
  }
  // A piece on a top: a frame round its base and a ring on the top, both in its
  // host's group so they follow it, and drawn over it, as it is small and the
  // tops are the same warm tone as the ring.
  function selectRider(entry) {
    const size = riderSize(entry.piece.id), host = pieces.get(entry.host);
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(size.w, 0.12, size.d)), new THREE.LineBasicMaterial({ color: 0xffd36a, toneMapped: false, depthTest: false, transparent: true }));
    const r = Math.max(size.w, size.d) * 0.55 + 0.1;
    const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.045, 48), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false, depthWrite: false, depthTest: false }));
    ring.rotation.x = -Math.PI / 2; box.renderOrder = ring.renderOrder = 10;
    host.group.add(box, ring);
    selection = { instance: entry.piece.instance, box, ring, rider: host.group };
    placeRiderGuides(entry);
  }
  function placeRiderGuides(entry, ok = true) {
    const g = entry.group;
    selection.box.position.set(g.position.x, g.position.y + 0.04, g.position.z); selection.box.rotation.y = g.rotation.y;
    selection.ring.position.set(g.position.x, g.position.y + 0.015, g.position.z);
    selection.box.material.color.setHex(ok ? 0xffd36a : 0xff6a5a); selection.ring.material.color.setHex(ok ? 0xffe2a0 : 0xff6a5a);
  }
  function preview(instance, x, z, ok) {
    if (ghost) { root.remove(ghost); ghost.geometry.dispose(); ghost.material.dispose(); ghost = null; }
    const entry = pieces.get(instance);
    if (!entry || x === null || entry.rider) return;
    const p = entry.pose ?? entry.piece, fp = pieceFootprint(p);
    ghost = outline(fp.layer === "wall" ? footprint(p.id) : { ...footprint(p.id), ...pieceBody(p.id) }, outlineAt(entry, fp, x, z), ok ? 0x8ae6a0 : 0xff6a5a, entry.height);
    ghost.rotation.y = entry.group.rotation.y;
  }
  // Dragging changes only a handful of transforms. Rebuilding the diorama on
  // every touch move discarded geometry, lights and the visitor animation.
  function movePiece(instance, pose = null, ok = true) {
    const entry = pieces.get(instance); if (!entry) return;
    if (entry.rider) {
      const p = { ...entry.piece, ...pose }, at = riderAt(pieces.get(entry.host), p);
      entry.pose = pose ? p : null;
      if (!at) return;
      entry.group.position.copy(at); entry.group.rotation.y = ((p.rotation ?? 0) * Math.PI) / 180;
      entry.hit.position.copy(at).add(new THREE.Vector3(0, entry.height / 2, 0)); entry.hit.rotation.y = entry.group.rotation.y;
      if (selection?.instance === instance) placeRiderGuides(entry, ok);
      return;
    }
    const p = { ...entry.piece, ...pose }, fp = pieceFootprint(p), wall = fp.layer === "wall", o = ORIGIN.room;
    entry.pose = pose ? p : null;
    const cx = p.x + fp.w / 2, cz = p.z + fp.d / 2;
    if (wall) {
      const side = p.wall ?? "back";
      entry.group.position.set(o.x + (side === "left" ? entry.wallOffset : side === "right" ? place.w - entry.wallOffset : cx), entry.bottom, o.z + (side === "back" ? entry.wallOffset : cx));
      entry.group.rotation.y = side === "left" ? Math.PI / 2 : side === "right" ? -Math.PI / 2 : 0;
    } else { entry.group.position.set(o.x + cx, fp.layer === "rug" ? .005 : 0, o.z + cz); entry.group.rotation.y = (p.rotation ?? 0) * Math.PI / 180; }
    entry.hit.position.copy(entry.group.position).add(new THREE.Vector3(0, entry.height / 2, wall ? entry.hitDepth / 2 : 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), wall ? entry.group.rotation.y : 0));
    entry.hit.rotation.y = entry.group.rotation.y;
    if (selection?.instance === instance) {
      selection.box.position.copy(outlineAt(entry, fp, p.x, p.z)); selection.box.rotation.y = entry.group.rotation.y;
      selection.box.material.color.setHex(ok ? 0xffd36a : 0xff6a5a);
      if (selection.ring) { selection.ring.position.x = entry.group.position.x; selection.ring.position.z = entry.group.position.z; selection.ring.material.color.setHex(ok ? 0xe7b46e : 0xff6a5a); }
    }
    if (ghost) { root.remove(ghost); ghost.geometry.dispose(); ghost.material.dispose(); ghost = null; }
  }
  function setGrid(on) {
    showGrid = on;
    if (gridLines) { root.remove(gridLines); gridLines.geometry.dispose(); gridLines.material.dispose(); gridLines = null; }
    if (!on || place?.kind !== "room") return;
    const pts = [], o = ORIGIN.room;
    const { w, d } = place;
    for (let x = 0; x <= w; x += .5) pts.push(o.x + x, 0.02, o.z, o.x + x, 0.02, o.z + d);
    for (let z = 0; z <= d; z += .5) pts.push(o.x, 0.02, o.z + z, o.x + w, 0.02, o.z + z);
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    gridLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffe0a8, transparent: true, opacity: 0.18, toneMapped: false }));
    root.add(gridLines);
  }

  return {
    get petTextures() { return homePetTextures; },
    get petsStatus() { return pets?.status() ?? []; },
    get place() { return place; },
    // The optional direct-control adapter uses the same cast and measured furniture as this room.
    setControlled(who) { controlled = who; },
    playerActor(who) { return actors.find(a => a.who === who)?.model ?? null; },
    playerGeometry() {
      if (place?.kind !== "room") return { bounds: { x0: 0, x1: 10, z0: 0, z1: 6 }, obstacles: [] };
      const layout = roomLayout(state, place.id), obstacles = [];
      for (const p of roomPieces(state, place.id)) {
        const fp = pieceFootprint(p); if (p.on || fp.layer !== "floor") continue;
        const body = pieceBody(p.id);
        obstacles.push({ x: p.x + fp.w / 2, z: p.z + fp.d / 2, w: body.w, d: body.d, angle: (p.rotation ?? 0) * Math.PI / 180 });
      }
      for (const st of layout?.stairs ?? []) obstacles.push({ x: st.x + st.w / 2, z: st.z + st.d / 2, w: st.w, d: st.d });
      return { bounds: { x0: 0, x1: place.w, z0: 0, z1: place.d }, obstacles };
    },
    playerTargets() {
      if (place?.kind !== "room") return [];
      const layout = roomLayout(state, place.id), list = [{ type: "exit", label: "Leave the house", x: place.w / 2, z: place.d - .25 }];
      for (const p of roomPieces(state, place.id)) {
        const fp = pieceFootprint(p), item = decorById[p.id]; if (!item || p.on || fp.layer === "rug") continue;
        const cooking = ["kitchen-hob", "kitchen-oven", "copper-range"].includes(p.id), wardrobe = /wardrobe|costume.*rack|dressing/.test(p.id) || item.interaction === "wardrobe";
        list.push({ type: cooking ? "cooking" : wardrobe ? "wardrobe" : "piece", instance: p.instance, item: p.id, station: cooking ? "home" : undefined, label: cooking ? "Cook in the kitchen" : wardrobe ? "Change costume" : item.name, x: p.x + fp.w / 2, z: p.z + fp.d / 2 });
      }
      for (const st of layout?.stairs ?? []) { const to = st.up ?? st.down; if (to) list.push({ type: "go", to, label: "Go to " + to, x: st.exit.x + .5, z: st.exit.z + .5 }); }
      for (const dr of layout?.doors ?? []) list.push({ type: "go", to: dr.to, label: "Go to " + dr.to, x: dr.wall === "left" ? .35 : place.w - .35, z: dr.at + dr.width / 2 });
      return list;
    },
    // Out on the farm the lamps borrow this pool (scene.js lightLamps).
    get lightPool() { return pool; },
    // Runs fn with the indoor key light on, so the indoor shader variants can
    // be compiled ahead while the farm is showing (scene.js warmShaders).
    withKeyLight(fn) { const was = keyLight.visible; keyLight.visible = true; try { return fn(); } finally { keyLight.visible = was; } },
    get pickables() { return pickables; },
    enterRoom(id) { buildRoomPlace(id); },
    enterShop() { buildShopPlace(); },
    leave() { clear(); place = null; lightIndoors(null); },
    refresh() { if (place?.kind === "room") { const sel = selection?.instance; buildRoomPlace(place.id); if (sel) select(sel); } },
    select, preview, setGrid, movePiece, refreshFood,
    get kitchenStatus() { return { ...kitchenFXStatus, pieces: state.house.placed.filter(p => p.room === "kitchen" && ["kitchen-hob", "kitchen-oven", "kitchen-pot-rail", "kitchen-pan-rail", "kitchen-baking-rack", "kitchen-spice-shelf", "copper-range", "copper-pan-rail", "iron-utensil-rack", "gothic-spice-cabinet"].includes(p.id)).map(p => p.id), capabilities: kitchenEquipment(state) }; },
    get foodDisplayStatus() { return foodDisplays.map(g => ({ slot: g.userData.foodDisplay, x: g.position.x - ORIGIN.shop.x, y: g.position.y, z: g.position.z - ORIGIN.shop.z, yaw: g.rotation.y })); },
    // A room point (x, z, and y above the floor), or a point in the world, in a host's own frame: x from its
    // left edge, z from its back (a wall piece: out from the wall), y above its base.
    hostPoint(instance, point) {
      const entry = pieces.get(instance);
      if (!entry) return null;
      const o = ORIGIN.room, fp = footprint(entry.piece.id);
      entry.group.updateMatrixWorld(true);
      const l = entry.group.worldToLocal(point.isVector3 ? point.clone() : new THREE.Vector3(o.x + point.x, point.y ?? 0, o.z + point.z));
      return { x: l.x + fp.w / 2, y: l.y, z: fp.layer === "wall" ? l.z : l.z + fp.d / 2 };
    },
    // How high above the floor a piece stands: the top it is on, else 0.
    standHeight(instance) {
      const entry = pieces.get(instance);
      if (!entry?.rider) return 0;
      entry.group.updateMatrixWorld(true);
      return entry.group.getWorldPosition(new THREE.Vector3()).y;
    },
    rotatePiece(instance) { movePiece(instance); },
    // A piece's box in the world (its hit box), for the camera to keep in view.
    pieceBox(instance) {
      const hit = pieces.get(instance)?.hit;
      if (!hit) return null;
      hit.updateWorldMatrix(true, false);
      return new THREE.Box3().setFromObject(hit);
    },
    // Turns a tap on the floor or the wall into a grid cell.
    cellAt(point, type, wall = "back", snap = .1) {
      const o = ORIGIN.room;
      const at = n => +(snap > 0 ? Math.round(n / snap) * snap : n).toFixed(6);
      return type === "wall" ? { x: at(wall === "back" ? point.x - o.x : point.z - o.z), z: 0, wall } : { x: at(point.x - o.x), z: at(point.z - o.z) };
    },
    tick(dt, time, paying) {
      if (place?.kind === "shop") { tickShop(dt, time); if (skyla) animate(skyla, time, false, 0, 0, paying); }
      if (place?.kind === "room") tickRoom(dt, time);
    },
  };
}
