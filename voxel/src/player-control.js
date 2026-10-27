import * as THREE from "three";
import { Voxels } from "./voxels.js";
import { PLOTS, BIG_PUMPKIN, SHOP, HOMES } from "./world.js";
import { fieldDepth } from "./content/farm-layout.js";
import { COOKING_SITE } from "./content/cooking-layout.js";
import { HOLLOW_PROPERTY } from "./content/hollow-house.js";
import { openPlots } from "./model.js";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
// A circular foot collider slides along a turned piece rather than snagging on its cells.
export function playerPointFree(x, z, bounds, obstacles, radius = .25) {
  if (x < bounds.x0 + radius || x > bounds.x1 - radius || z < bounds.z0 + radius || z > bounds.z1 - radius) return false;
  for (const o of obstacles) {
    const a = o.angle ?? 0, c = Math.cos(a), s = Math.sin(a), dx = x - o.x, dz = z - o.z;
    const px = dx * c - dz * s, pz = dx * s + dz * c;
    const qx = Math.max(Math.abs(px) - o.w / 2, 0), qz = Math.max(Math.abs(pz) - o.d / 2, 0);
    if (qx * qx + qz * qz < radius * radius - 1e-7) return false;
  }
  return true;
}
// Substeps stop a slow frame tunnelling through a narrow chair or wall.
export function slidePlayer(position, dx, dz, bounds, obstacles, radius = .25) {
  let { x, z } = position;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .1));
  for (let i = 0; i < steps; i++) {
    const sx = dx / steps, sz = dz / steps;
    if (playerPointFree(x + sx, z + sz, bounds, obstacles, radius)) { x += sx; z += sz; }
    else {
      if (playerPointFree(x + sx, z, bounds, obstacles, radius)) x += sx;
      if (playerPointFree(x, z + sz, bounds, obstacles, radius)) z += sz;
    }
  }
  return { x, z };
}

// This adapter owns only movement and presentation. Purchases and farming stay in the rules.
export function createPlayerControl({ scene, state, actors, places, getPlace, getCamera, animate, follow }) {
  let enabled = false, who = "natalie", blocked = false, moving = false, facing = "front", key = null, action = null, target = null, lastModel = null;
  const input = { x: 0, y: 0 }, positions = new Map(), right = new THREE.Vector3(), forward = new THREE.Vector3();
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd18a, transparent: true, opacity: .75, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.42, .465, 40), ringMat); ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
  const targetMat = ringMat.clone(); targetMat.color.setHex(0xf7bb64); targetMat.opacity = .6;
  const marker = new THREE.Mesh(new THREE.RingGeometry(.55, .60, 40), targetMat); marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
  const tool = new THREE.Group(); tool.visible = false; scene.add(tool);
  const v = new Voxels();
  v.box(-.18, -.13, -.18, .36, .28, .36, 0x5c8c7a); v.box(-.12, .15, -.12, .24, .04, .24, 0xc0c99c);
  v.box(.15, -.03, -.06, .32, .09, .12, 0x638f7c); v.box(.39, .01, -.10, .08, .08, .2, 0xa9bda0);
  v.box(-.30, -.02, -.13, .06, .25, .06, 0x385e59); v.box(-.3, .18, -.13, .18, .05, .06, 0x385e59);
  const can = v.build(); tool.add(can);
  const dropGeo = new THREE.BoxGeometry(.035, .07, .035), dropMat = new THREE.MeshBasicMaterial({ color: 0xb9e6ed, transparent: true, opacity: .75, toneMapped: false });
  const drops = new THREE.InstancedMesh(dropGeo, dropMat, 12); drops.visible = false; scene.add(drops);
  const dropMatrix = new THREE.Matrix4();
  const available = () => !getPlace() || getPlace() === "room";
  const room = () => getPlace() === "room";
  const model = () => room() ? places.playerActor(who) : actors()[who]?.model;
  const origin = () => room() ? { x: 200, z: 0 } : { x: 0, z: 0 };
  const localPosition = () => { const a = model(), o = origin(); return a ? { x: a.position.x - o.x, z: a.position.z - o.z } : { ...(positions.get(key) ?? HOMES[who]) }; };
  function geometry() {
    if (room()) return places.playerGeometry();
    const maxX = state.kitchen?.purchased ? COOKING_SITE.bounds.x1 : 39;
    const obstacles = [
      { x: SHOP.x, z: 5.6, w: 9.7, d: 6.7 },
      { x: HOLLOW_PROPERTY.x, z: 5.2, w: 8.8, d: 7.3 },
      { x: BIG_PUMPKIN.x, z: BIG_PUMPKIN.z, w: 3.4, d: 3.2 },
      ...(state.kitchen?.purchased ? [{ x: COOKING_SITE.truck.x, z: COOKING_SITE.truck.z, w: COOKING_SITE.truck.w, d: COOKING_SITE.truck.d }] : []),
    ];
    return { bounds: { x0: -5, x1: maxX, z0: 3.9, z1: fieldDepth(state) - .4 }, obstacles };
  }
  function safeSpot(wanted) {
    const { bounds, obstacles } = geometry();
    const p = { x: clamp(wanted.x, bounds.x0 + .3, bounds.x1 - .3), z: clamp(wanted.z, bounds.z0 + .3, bounds.z1 - .3) };
    if (playerPointFree(p.x, p.z, bounds, obstacles)) return p;
    for (let r = .3; r < 20; r += .3) for (let i = 0; i < 16; i++) {
      const x = p.x + Math.cos(i * Math.PI / 8) * r, z = p.z + Math.sin(i * Math.PI / 8) * r;
      if (playerPointFree(x, z, bounds, obstacles)) return { x, z };
    }
    return p;
  }
  function targets() {
    if (!available()) return [];
    if (room()) return places.playerTargets();
    return [
      ...PLOTS.slice(0, openPlots(state)).map((p, index) => ({ type: "plot", index, x: p.x, z: p.z, label: state.plots[index].phase === "ready" ? "Pick pumpkin" : state.plots[index].phase === "growing" ? "Water pumpkin" : "Plant pumpkin" })),
      { type: "pumpkin", label: "Encourage the patch", x: BIG_PUMPKIN.x + 2, z: BIG_PUMPKIN.z },
      { type: "shop", label: "Visit Skyla’s shop", x: SHOP.x, z: SHOP.counterZ + 1.2 },
      { type: "home", label: "Go home", x: 20, z: 4.6 },
      ...(state.kitchen?.purchased ? [{ type: "cooking", label: "Cook at Maisie’s truck", x: COOKING_SITE.truck.x, z: COOKING_SITE.truck.z + 2.1 }] : []),
      ...(state.cleanliness?.litter ?? []).map((p, index) => ({ type: "litter", id: p.id, index, label: "Clean up", x: p.x, z: p.z })),
    ];
  }
  function nearest() {
    const p = localPosition();
    const list = targets().map(t => ({ ...t, distance: Math.hypot(t.x - p.x, t.z - p.z) }));
    list.sort((a, b) => a.distance - b.distance);
    return list[0]?.distance <= 1.9 ? list[0] : null;
  }
  function sync() {
    places.setControlled(enabled && room() ? who : null);
    if (!enabled || !available() || !model()) { ring.visible = marker.visible = tool.visible = drops.visible = false; target = null; return false; }
    const nextKey = (room() ? "room:" + places.place.id : "farm") + ":" + who;
    if (nextKey !== key || model() !== lastModel) {
      key = nextKey; action = null; moving = false;
      const a = model(), o = origin(), p = safeSpot(positions.get(key) ?? localPosition());
      a.position.set(o.x + p.x, room() ? 0 : .04, o.z + p.z);
      lastModel = a;
    }
    return true;
  }
  function update(dt, time) {
    if (!sync()) return;
    const a = model(), pos = localPosition(), o = origin(), asleep = blocked || state.paused || document.body.classList.contains("menu-open");
    const old = { ...pos };
    if (!asleep && !action) {
      const camera = getCamera(); right.set(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();
      camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
      let dx = right.x * input.x - forward.x * input.y, dz = right.z * input.x - forward.z * input.y;
      const size = Math.hypot(dx, dz); if (size > 1) { dx /= size; dz /= size; }
      const speed = room() ? 2.3 : 3.3, g = geometry(), next = slidePlayer(pos, dx * speed * dt, dz * speed * dt, g.bounds, g.obstacles);
      pos.x = next.x; pos.z = next.z;
      if (size > .08) facing = Math.abs(dx) > Math.abs(dz) * .75 ? "side" : dz < 0 ? "back" : "front";
    }
    moving = Math.hypot(pos.x - old.x, pos.z - old.z) > .0001;
    a.position.x = o.x + pos.x; a.position.z = o.z + pos.z; positions.set(key, { ...pos });
    const delta = Math.hypot(pos.x - old.x, pos.z - old.z), dx = delta > .00001 ? (pos.x - old.x) / delta : 0;
    animate(a, time, moving, dx, who === "shane" ? 1.7 : 0);
    if (a.userData.playerAnimate) a.userData.playerAnimate({ who, outfit: state.wardrobe.equipped[who], facing, walking: moving, time, age: time, dx, action: action?.kind, actionElapsed: action?.elapsed ?? 0, actionProgress: action ? action.elapsed / action.duration : 0 });
    const hit = !room() && actors()[who]?.hit; if (hit) hit.position.set(a.position.x, 1.1, a.position.z);
    target = nearest();
    ring.visible = !asleep; ring.position.set(a.position.x, .075, a.position.z); ringMat.opacity = .6 + Math.sin(time * 2) * .1;
    marker.visible = !!target && !asleep;
    if (target) { marker.position.set(o.x + target.x, .09, o.z + target.z); marker.scale.setScalar(target.type === "plot" ? 1.25 : .8); }
    tool.visible = drops.visible = !!action && action.kind === "water" && !asleep;
    const lean = a.children[0];
    if (lean) lean.position.y = 0;
    if (action && !asleep) {
      action.elapsed += dt;
      const t = Math.min(1, action.elapsed / action.duration), bend = Math.sin(t * Math.PI);
      if (lean) { lean.rotation.z = (action.kind === "water" ? -.08 : .16) * bend; lean.position.y -= (action.kind === "water" ? .03 : .14) * bend; }
      if (action.kind === "water") {
        const tpos = target ?? { x: pos.x + 1, z: pos.z + .3 }, ox = tpos.x - pos.x, oz = tpos.z - pos.z, angle = Math.atan2(-oz, ox);
        tool.position.set(a.position.x + Math.cos(angle) * .38, .9 - bend * .1, a.position.z - Math.sin(angle) * .38); tool.rotation.y = angle; tool.rotation.z = -.22 * bend;
        for (let i = 0; i < 12; i++) { const d = (time * 1.7 + i / 12) % 1; dropMatrix.makeTranslation(tool.position.x + Math.cos(angle) * (.48 + d * .28), tool.position.y - d * .8, tool.position.z - Math.sin(angle) * (.48 + d * .28) + Math.sin(i * 3) * .04); drops.setMatrixAt(i, dropMatrix); }
        drops.instanceMatrix.needsUpdate = true;
      }
      if (t >= 1) { if (lean) lean.rotation.z = 0; action = null; }
    } else if (lean) lean.rotation.z = 0;
    if (moving && !asleep) follow?.(a.position, dt, room());
  }
  // Generated side/back textures must give way to the original autonomous sheet on release.
  function releaseFigure(person) {
    for (const a of [actors()[person]?.model, places.playerActor(person)]) if (a) {
      if (a.children[0]) { a.children[0].rotation.z = 0; a.children[0].position.y = 0; }
      a.userData.playerAnimate?.({ who: person, outfit: state.wardrobe.equipped[person], facing: "front", walking: false, time: 0, dx: 0, action: null });
    }
  }
  const api = {
    setEnabled(on, next = who) { releaseFigure(who); enabled = !!on; who = next === "shane" ? "shane" : "natalie"; input.x = input.y = 0; key = null; action = null; sync(); return api.state(); },
    select(next) { releaseFigure(who); who = next === "shane" ? "shane" : "natalie"; input.x = input.y = 0; key = null; action = null; sync(); return api.state(); },
    input(x, y) { input.x = clamp(Number(x) || 0, -1, 1); input.y = clamp(Number(y) || 0, -1, 1); },
    setBlocked(on) { blocked = !!on; if (blocked) input.x = input.y = 0; },
    act(kind, seconds = 1.1) { if (!enabled || !available() || blocked || state.paused || action) return false; action = { kind, duration: Math.max(.3, Number(seconds) || 1.1), elapsed: 0 }; return true; },
    targets,
    teleport(x, z) { if (!sync()) return false; const a = model(), o = origin(), p = safeSpot({ x, z }); a.position.set(o.x + p.x, room() ? 0 : .04, o.z + p.z); positions.set(key, p); target = nearest(); return true; },
    state() { return { enabled, who, available: available(), place: getPlace() ?? "farm", room: room() ? places.place?.id : null, position: localPosition(), facing, moving, blocked: blocked || !!state.paused, action: action?.kind ?? null, target: enabled && available() ? nearest() : null }; },
    update,
  };
  return api;
}
