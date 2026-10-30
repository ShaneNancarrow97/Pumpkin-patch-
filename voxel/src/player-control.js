import * as THREE from "three";
import { PLOTS, BIG_PUMPKIN, SHOP, HOMES, PITCH } from "./world.js";
import { fieldDepth } from "./content/farm-layout.js";
import { COOKING_SITE } from "./content/cooking-layout.js";
import { HOLLOW_PROPERTY } from "./content/hollow-house.js";
import { MEADOW, cocoaKioskWidth } from "./content/festival-meadow.js";
import { openPlots } from "./model.js";
import { playWays, wayThrough, inZone, gardenGeometry, gardenTargets } from "./play-ways.js";
import { directionFromView } from "./content/directional-atlas.js";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const SETTLE_SECONDS = 0.8;
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
// Where the owner can walk on the farm: the yard inside its fences and, once
// bought, the food truck's paving and the meadow. The edges sit a quarter inside
// each fence, so the feet (radius .25) stop half a unit short of the pickets.
// The truck's paving and the meadow's east fence end together, at x 53.2.
const FRONT_FENCE = 1.4, MEADOW_FRONT = 27.6, EAST_FENCE = 39;
export function farmPlayerGeometry(state) {
  const front = fieldDepth(state) - FRONT_FENCE - .25, kitchen = !!state.kitchen?.purchased, meadow = !!state.festival?.meadow;
  const obstacles = [
    { x: SHOP.x, z: 5.6, w: 9.7, d: 6.7 },
    { x: HOLLOW_PROPERTY.x, z: 5.2, w: 8.8, d: 7.3 },
    { x: BIG_PUMPKIN.x, z: BIG_PUMPKIN.z, w: 3.4, d: 3.2 },
  ];
  if (kitchen) obstacles.push({ x: COOKING_SITE.truck.x, z: COOKING_SITE.truck.z, w: COOKING_SITE.truck.w, d: COOKING_SITE.truck.d });
  const level = meadow ? state.festival.cocoa?.level ?? 0 : 0;
  if (level) obstacles.push({ x: MEADOW.stand[0], z: MEADOW.stand[1] + .2, w: cocoaKioskWidth(level) + .4, d: 3.4 });
  // East of the yard's fence line only the paving or the meadow is open: the
  // rest is one block, from where they end to past the deepest front fence.
  const open = meadow ? MEADOW_FRONT - .25 : kitchen ? COOKING_SITE.pavingBounds.z1 : null;
  if (open !== null && open < front) obstacles.push({ x: EAST_FENCE + 10, z: (open + front + 2) / 2, w: 20, d: front + 2 - open });
  // The meadow's front fence starts at the lane (x 35.6); a grown field runs on past it.
  if (meadow && open < front) obstacles.push({ x: (35.6 + EAST_FENCE) / 2, z: MEADOW_FRONT, w: EAST_FENCE - 35.6, d: .5 });
  return { bounds: { x0: -5, x1: meadow || kitchen ? COOKING_SITE.bounds.x1 : EAST_FENCE, z0: 3.9, z1: front }, obstacles };
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

// Exact exponential integration gives the same stride at 30, 60 or 120 Hz.
export function playerVelocityStep(current, desired, dt) {
  const seconds = clamp(Number(dt) || 0, 0, .25), rate = Math.hypot(desired.x, desired.z) < .001 ? 23 : 16;
  const fade = Math.exp(-rate * seconds), integral = (1 - fade) / rate;
  return { x: desired.x + (current.x - desired.x) * fade, z: desired.z + (current.z - desired.z) * fade,
    dx: desired.x * seconds + (current.x - desired.x) * integral, dz: desired.z * seconds + (current.z - desired.z) * integral };
}
// Angles are bounded by the cutaway indoors, and wrap smoothly outdoors.
export function playerOrbitStep(current, x, y, dt, inside = false) {
  const t = clamp(Number(dt) || 0, 0, .25), yaw = (Number(current.yaw) || 0) + clamp(Number(x) || 0, -1, 1) * t * 1.65;
  return { yaw: inside ? clamp(yaw, -.9, .9) : Math.atan2(Math.sin(yaw), Math.cos(yaw)), pitch: clamp((Number(current.pitch) || PITCH) + clamp(Number(y) || 0, -1, 1) * t * .85, Math.PI * 22 / 180, Math.PI * 66 / 180) };
}
export const playerTargetKey = t => t ? [t.type, t.id ?? t.instance ?? t.index ?? t.to ?? t.pet ?? ""].join(":") : null;
// Aim matters, but a target underfoot still wins. A small latch prevents flicker between beds.
export function choosePlayerTarget(list, position, heading, previous, reach = 2.05) {
  const candidates = list.map(t => {
    const dx = t.x - position.x, dz = t.z - position.z, distance = Math.hypot(dx, dz), dot = distance > .001 ? (dx * heading.x + dz * heading.z) / distance : 1;
    return { ...t, distance, score: distance + (1 - dot) * .22 - (Number(t.priority) || 0) * .1 };
  }).filter(t => Number.isFinite(t.distance) && t.distance <= (Number.isFinite(t.range)?Math.min(reach,Math.max(0,t.range)):Number.isFinite(t.reach)?Math.max(reach,t.reach):reach)).sort((a, b) => a.score - b.score);
  const best = candidates[0], held = candidates.find(t => playerTargetKey(t) === playerTargetKey(previous));
  return held && best && held.score <= best.score + .24 ? held : best ?? null;
}

// This adapter owns only movement and presentation. Purchases and farming stay in the rules.
// garden: the garden's own scene and the figure the owner walks it as.
// onWay(way): the owner has walked into a way through (play-ways.js); return
// false to refuse it. Whoever takes it calls arrive() once the place has changed.
export function createPlayerControl({ scene, state, actors, places, getPlace, getCamera, animate, follow, cameraLook, cameraZoom, cameraReset, wateringTexture, garden = null, onWay = null }) {
  let enabled = false, who = "natalie", blocked = false, moving = false, facing = "front", key = null, action = null, target = null, lastModel = null, renderedTime = 0, strideAge = 0, gait = "walk", pose = null, walkTarget = null, stuck = 0, still = 0, passing = null, ways = null, waysKey = "";
  // Ways the owner arrived inside stay shut until they step out of them.
  const shut = new Set();
  let viewAngle=0;
  const input = { x: 0, y: 0 }, lookInput = { x: 0, y: 0 }, velocity = { x: 0, z: 0 }, heading = { x: 0, z: 1 }, positions = new Map(), right = new THREE.Vector3(), forward = new THREE.Vector3();
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd18a, transparent: true, opacity: .75, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.42, .465, 40), ringMat); ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
  const targetMat = ringMat.clone(); targetMat.color.setHex(0xf7bb64); targetMat.opacity = .6;
  const marker = new THREE.Mesh(new THREE.RingGeometry(.55, .60, 40), targetMat); marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
  const tool = new THREE.Group(); tool.visible = false; scene.add(tool);
  // The painted handle stays in the hand; its nozzle is the particle socket.
  const canWidth=.82,canHeight=canWidth*184/256,grip={x:215/256,y:52/184};
  const canGeometry=new THREE.PlaneGeometry(canWidth,canHeight);
  canGeometry.translate((.5-grip.x)*canWidth,(grip.y-.5)*canHeight,0);
  const can=new THREE.Mesh(canGeometry,new THREE.MeshBasicMaterial({map:wateringTexture??null,transparent:true,alphaTest:.04,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));
  can.name='Illustrated watering can';tool.add(can);
  const spout=new THREE.Object3D(),nozzle=new THREE.Vector3();spout.position.set((32/256-grip.x)*canWidth,(grip.y-116/184)*canHeight,0);can.add(spout);
  const dropGeo = new THREE.BoxGeometry(.035, .07, .035), dropMat = new THREE.MeshBasicMaterial({ color: 0xb9e6ed, transparent: true, opacity: .75, toneMapped: false });
  const drops = new THREE.InstancedMesh(dropGeo, dropMat, 12); drops.visible = false; scene.add(drops);
  const dropMatrix = new THREE.Matrix4();
  const available = () => !getPlace() || getPlace() === "room" || getPlace() === "estate" && !!garden;
  const room = () => getPlace() === "room";
  const inGarden = () => getPlace() === "estate";
  const model = () => room() ? places.playerActor(who) : inGarden() ? (enabled && garden ? garden.actor(who) : null) : actors()[who]?.model;
  const placeId = () => room() ? "room:" + places.place?.id : inGarden() ? "estate" : "farm";
  const origin = () => room() ? { x: 200, z: 0 } : { x: 0, z: 0 };
  const localPosition = () => { const a = model(), o = origin(); return a ? { x: a.position.x - o.x, z: a.position.z - o.z } : { ...(positions.get(key) ?? HOMES[who]) }; };
  function geometry() {
    return room() ? places.playerGeometry() : inGarden() ? gardenGeometry(state) : farmPlayerGeometry(state);
  }
  function currentWays() {
    const k = placeId() + "@" + state.house?.level + "/" + state.estate?.expansion;
    if (k !== waysKey) { waysKey = k; ways = playWays(state, placeId()); }
    return ways;
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
    if (inGarden()) return gardenTargets(state);
    return [
      ...PLOTS.slice(0, openPlots(state)).map((p, index) => ({ type: "plot", index, x: p.x, z: p.z, label: state.plots[index].phase === "ready" ? "Pick pumpkin" : state.plots[index].phase === "growing" ? "Water pumpkin" : "Plant pumpkin" })),
      { type: "pumpkin", label: "Encourage the patch", x: BIG_PUMPKIN.x + 2, z: BIG_PUMPKIN.z },
      { type: "shop", label: "Visit Skyla’s shop", x: SHOP.x, z: SHOP.counterZ + 1.2 },
      { type: "home", label: "Go home", x: 20, z: 4.6 },
      ...(state.kitchen?.purchased ? [{ type: "cooking", label: "Cook at Maisie’s truck", x: COOKING_SITE.truck.x, z: COOKING_SITE.truck.z + 2.1 }] : []),
      ...(state.cleanliness?.litter ?? []).map((p, index) => ({ type: "litter", id: p.id, index, label: "Clean up", x: p.x, z: p.z })),
    ];
  }
  function nearest() { return choosePlayerTarget(targets(), localPosition(), heading, target); }
  function viewFacing() {
    const camera = getCamera(); right.set(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();
    camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
    const sx = heading.x * right.x + heading.z * right.z, away = heading.x * forward.x + heading.z * forward.z;
    viewAngle=directionFromView(sx,away)??viewAngle;
    facing = Math.abs(sx) > Math.abs(away) * .75 ? "side" : away > 0 ? "back" : "front";
    return sx;
  }
  function face(t) {
    if (!t || !Number.isFinite(t.x) || !Number.isFinite(t.z)) return false;
    const p = localPosition(), dx = t.x - p.x, dz = t.z - p.z, n = Math.hypot(dx, dz);
    if (n > .02) { heading.x = dx / n; heading.z = dz / n; viewFacing(); }
    return true;
  }
  function stand() {
    if (!pose) return false;
    const former = pose; pose = null; places.clearPlayerRest?.(who);
    if (model()) { const p = safeSpot(former.standing), o = origin(); model().position.set(o.x + p.x, room() ? 0 : .04, o.z + p.z); positions.set(key, p); }
    velocity.x = velocity.z = 0; return true;
  }
  function sync() {
    places.setControlled(enabled && room() ? who : null);
    if (!enabled || !available() || !model()) {
      if(lastModel?.parent)lastModel.userData.playerAnimate?.({release:true});
      lastModel=null;
      ring.visible = marker.visible = tool.visible = drops.visible = false; target = null; return false;
    }
    // The ring, target marker and can live in whichever scene the owner is in.
    const host = inGarden() ? garden.scene : scene;
    if (ring.parent !== host) host.add(ring, marker, tool, drops);
    const nextKey = placeId() + ":" + who;
    if (nextKey !== key || model() !== lastModel) {
      // A garden figure remains in its separate scene when the owner steps
      // inside. Its hidden page must not pin an atlas in the mobile cache.
      if(lastModel?.parent&&lastModel!==model())lastModel.userData.playerAnimate?.({release:true});
      places.clearPlayerRest?.(who); pose = null; walkTarget = null; velocity.x = velocity.z = 0;
      key = nextKey; action = null; moving = false; strideAge = 0;
      const a = model(), o = origin(), p = safeSpot(positions.get(key) ?? localPosition());
      a.position.set(o.x + p.x, room() ? 0 : .04, o.z + p.z);
      lastModel = a;
      shut.clear(); for (const w of currentWays()) if (inZone(w.zone, p)) shut.add(w.id);
    }
    return true;
  }
  function update(dt, time) {
    renderedTime = time;
    if (!sync()) return;
    const a = model(), pos = localPosition(), o = origin(), asleep = blocked || !!passing || state.paused || document.body.classList.contains("menu-open");
    const old = { ...pos };
    let intent = { x: 0, z: 0 };
    if (!asleep && !action) {
      const camera = getCamera(); right.set(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();
      camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
      intent = { x: right.x * input.x - forward.x * input.y, z: right.z * input.x - forward.z * input.y };
      let magnitude = Math.hypot(intent.x, intent.z);
      if (magnitude < .08) intent.x = intent.z = 0;
      else if (magnitude > 1) { intent.x /= magnitude; intent.z /= magnitude; }
      if (magnitude > .15) { walkTarget = null; if (pose) { stand(); Object.assign(pos, localPosition()); } }
      if (walkTarget) {
        const dx = walkTarget.x - pos.x, dz = walkTarget.z - pos.z, distance = Math.hypot(dx, dz);
        // Arrived (within `near`, 1.1 by default): face it, then do what the
        // walk was for (a tap on something far off).
        if (distance <= (walkTarget.near ?? 1.1)) { face(walkTarget); const then = walkTarget.then; walkTarget = null; intent.x = intent.z = 0; if (then) queueMicrotask(then); }
        else { intent.x = dx / distance; intent.z = dz / distance; }
      }
      if (!pose) {
        const speed = (room() ? 2.3 : 3.3) * (gait === "jog" ? 1.55 : 1), step = playerVelocityStep(velocity, { x: intent.x * speed, z: intent.z * speed }, dt), g = geometry();
        velocity.x = step.x; velocity.z = step.z;
        const next = slidePlayer(pos, step.dx, step.dz, g.bounds, g.obstacles);
        pos.x = next.x; pos.z = next.z;
        if (Math.hypot(intent.x, intent.z) > .08) { const n = Math.hypot(intent.x, intent.z); heading.x = intent.x / n; heading.z = intent.z / n; viewFacing(); }
        // Held up against the thing itself, close enough to reach it, counts as arriving.
        if (walkTarget) { stuck = Math.hypot(pos.x - old.x, pos.z - old.z) < .002 ? stuck + dt : 0; const reach = Math.hypot(walkTarget.x - pos.x, walkTarget.z - pos.z) <= (walkTarget.reach ?? 2); if (stuck > (reach ? .25 : 1.5)) { const then = reach ? walkTarget.then : null; if (reach) face(walkTarget); walkTarget = null; if (then) queueMicrotask(then); } }
      }

    } else velocity.x = velocity.z = 0;
    if (!asleep) cameraLook?.(lookInput.x, lookInput.y, dt);
    const screenHeading = viewFacing();
    moving = !pose && Math.hypot(pos.x - old.x, pos.z - old.z) > .0005;
    a.position.x = o.x + pos.x; a.position.z = o.z + pos.z;
    if (!pose) positions.set(key, { ...pos });
    // Walking into a doorway, a gate, the stairs or a ladder takes the owner through.
    if (!asleep && !action && !pose && onWay) {
      const list = currentWays();
      for (const id of shut) if (!inZone(list.find((w) => w.id === id)?.zone, pos)) shut.delete(id);
      const way = wayThrough(list, pos, intent, (w) => !shut.has(w.id));
      if (way && onWay(way) !== false) { passing = way; walkTarget = null; velocity.x = velocity.z = 0; }
    }
    const delta = Math.hypot(pos.x - old.x, pos.z - old.z), dx = delta > .00001 || action || pose ? screenHeading : 0;
    strideAge += delta / 2.3;
    const motionAge = moving ? strideAge : time;
    // The side and back turnarounds are walks with no standing frame: after a
    // moment standing still, the owner settles back to the front sprite's idle.
    // Pushing against a fence is not standing still: they keep facing it.
    if (moving || action || pose || intent.x || intent.z) still = 0; else if (!asleep) still += Math.max(0, Number(dt) || 0);
    const shown = still > SETTLE_SECONDS ? "front" : facing;
    animate(a, motionAge, moving, dx, who === "shane" ? 1.7 : 0);
    if (a.userData.playerAnimate) a.userData.playerAnimate({ who, outfit: state.wardrobe.equipped[who], facing: shown, viewAngle, walking: moving, time, age: motionAge, dx, action: action?.kind, actionElapsed: action?.elapsed ?? 0, actionProgress: action ? action.elapsed / action.duration : 0, controlled: true });
    const hit = !room() && !inGarden() && actors()[who]?.hit; if (hit) hit.position.set(a.position.x, 1.1, a.position.z);
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
        const tpos = action.target ?? target ?? { x: pos.x + 1, z: pos.z + .3 }, ox = tpos.x - pos.x, oz = tpos.z - pos.z, angle = Math.atan2(-oz, ox);
        const side=Math.abs(screenHeading)>.1?(screenHeading<0?-1:1):(a.userData.playerSideSign??1),camera=getCamera();
        tool.quaternion.copy(camera.quaternion);can.scale.x=-side;
        tool.position.set(a.position.x+right.x*.38*side-forward.x*.14,1.1-bend*.06,a.position.z+right.z*.38*side-forward.z*.14);
        const hand=a.userData.playerHandLocal;
        if(hand&&[hand.x,hand.y,hand.z].every(Number.isFinite)){a.updateWorldMatrix(true,true);tool.position.copy(a.children[0].localToWorld(new THREE.Vector3(hand.x,hand.y,hand.z)));}
        can.rotation.z=side*.10*bend;
        tool.updateMatrixWorld(true); spout.getWorldPosition(nozzle);
        for (let i = 0; i < 12; i++) { const d = (time * 1.7 + i / 12) % 1; dropMatrix.makeTranslation(nozzle.x + Math.cos(angle) * d * .35, nozzle.y - Math.pow(d,1.35) * Math.max(.1,nozzle.y-.12), nozzle.z - Math.sin(angle) * d * .35 + Math.sin(i * 3) * .035); drops.setMatrixAt(i, dropMatrix); }
        drops.instanceMatrix.needsUpdate = true;
      }
      if (t >= 1) { if (lean) lean.rotation.z = 0; action = null; }
    } else if (lean) lean.rotation.z = 0;
    if (pose) {
      const anchor = pose.target.pose;
      if (anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.z)) a.position.set(o.x + anchor.x, Number(anchor.y) || 0, o.z + anchor.z);
      places.playerRest?.(who, pose.kind, pose.target, time);
    }
    if (!asleep) follow?.(a.position, dt, room(), { x: velocity.x, z: velocity.z, moving });
  }
  // Generated side/back textures must give way to the original autonomous sheet on release.
  function releaseFigure(person) {
    garden?.release(person);
    for (const a of [actors()[person]?.model, places.playerActor(person)]) if (a) {
      if (a.children[0]) { a.children[0].rotation.z = 0; a.children[0].position.y = 0; }
      a.userData.playerAnimate?.({ who: person, outfit: state.wardrobe.equipped[person], facing: "front", walking: false, time: 0, dx: 0, action: null, release: true });
    }
  }
  const api = {
    get enabled() { return enabled; },
    setEnabled(on, next = who) { stand(); releaseFigure(who); velocity.x = velocity.z = 0; walkTarget = null; passing = null; enabled = !!on; who = next === "shane" ? "shane" : "natalie"; input.x = input.y = 0; key = null; action = null; sync(); return api.state(); },
    select(next) { stand(); const swap = inGarden() ? garden?.figure?.() : null; releaseFigure(who); velocity.x = velocity.z = 0; walkTarget = null; passing = null; if (swap) positions.set("estate:" + (next === "shane" ? "shane" : "natalie"), { x: swap.position.x, z: swap.position.z }); who = next === "shane" ? "shane" : "natalie"; input.x = input.y = 0; key = null; action = null; sync(); return api.state(); },
    input(x, y) { input.x = clamp(Number(x) || 0, -1, 1); input.y = clamp(Number(y) || 0, -1, 1); },
    setBlocked(on) { blocked = !!on; if (blocked) { input.x = input.y = lookInput.x = lookInput.y = 0; velocity.x = velocity.z = 0; walkTarget = null; } },
    act(kind, seconds = 1.1, selected = null) { if (!enabled || !available() || blocked || state.paused || action) return false; stand(); walkTarget = null; velocity.x = velocity.z = 0; const chosen = selected ?? nearest(); face(chosen); action = { kind, target: chosen ? {...chosen} : null, duration: Math.max(.3, Number(seconds) || 1.1), elapsed: 0 }; return true; },
    setGait(next) { gait = next === "jog" ? "jog" : "walk"; return gait; },
    cameraInput(x, y) { lookInput.x = clamp(Number(x) || 0, -1, 1); lookInput.y = clamp(Number(y) || 0, -1, 1); },
    lookBy(x, y) { if (enabled && !blocked && available()) cameraLook?.(clamp(Number(x) || 0, -1, 1), clamp(Number(y) || 0, -1, 1), .16); },
    zoom(direction) { if (enabled && !blocked && available()) cameraZoom?.(Math.sign(Number(direction) || 0)); },
    recenter() { lookInput.x = lookInput.y = 0; cameraReset?.(localPosition(), room()); },
    faceTarget: face,
    rest(kind, t) {
      if (!enabled || blocked || state.paused || !available() || action || !["sit", "read", "pet"].includes(kind) || !t) return false;
      if (Math.hypot(t.x - localPosition().x, t.z - localPosition().z) > 2.15) return false;
      stand(); face(t); walkTarget = null; velocity.x = velocity.z = 0;
      pose = { kind, target: { ...t }, standing: localPosition() }; return true;
    },
    stand,
    cancelAction() { action = null; if (model()?.children[0]) { model().children[0].rotation.z = 0; model().children[0].position.y = 0; } tool.visible = drops.visible = false; },
    walkTo(t) {
      if (!enabled || blocked || state.paused || !available() || action || !t || !Number.isFinite(t.x) || !Number.isFinite(t.z)) return false;
      stand(); walkTarget = { ...t }; stuck = 0; return true;
    },
    cancelWalk() { walkTarget = null; velocity.x = velocity.z = 0; },
    targets,
    // After a way through: the place has changed, so stand the owner where the
    // way comes out, heading on, with the camera on them. Called with no spot,
    // it only ends the passing (the way was refused after all).
    arrive(spot) {
      const way = passing; passing = null;
      if (!spot || !enabled) return api.state();
      if (spot.place !== placeId()) return api.state();
      positions.set(spot.place + ":" + who, { x: spot.x, z: spot.z }); key = null; walkTarget = null; velocity.x = velocity.z = 0;
      if (spot.face) { heading.x = spot.face.x; heading.z = spot.face.z; }
      if (!sync()) return api.state();
      viewFacing(); still = 0; target = nearest(); cameraReset?.(localPosition(), room());
      return { ...api.state(), from: way?.id ?? null };
    },
    // A way taken by the button rather than on foot: hold still until arrive().
    hold(way) { if (!enabled || !way) return false; stand(); passing = way; walkTarget = null; velocity.x = velocity.z = 0; return true; },
    get passing() { return passing; },
    // QA: the ways through from where the owner is.
    ways: () => (enabled && available() ? currentWays() : []),
    // QA: the figure being controlled (its group), for measuring how it is drawn.
    figure: () => (enabled && available() ? model() ?? null : null),
    teleport(x, z) { if (!sync()) return false; const a = model(), o = origin(), p = safeSpot({ x, z }); a.position.set(o.x + p.x, room() ? 0 : .04, o.z + p.z); positions.set(key, p); target = nearest(); return true; },
    // Where the action target is in the world (rooms sit off at their origin), for the prompt over it.
    targetAt() { const t = enabled && available() ? nearest() : null, o = origin(); return t ? { x: o.x + t.x, y: room() ? 1.9 : 1.7, z: o.z + t.z } : null; },
    state() { return { enabled, who, available: available(), place: getPlace() ?? "farm", passing: passing?.id ?? null, room: room() ? places.place?.id : null, position: localPosition(), facing, viewAngle, atlas:model()?.userData.playerAtlas??null, moving, gait, speed: Math.hypot(velocity.x, velocity.z), pose: pose ? {kind: pose.kind, target: pose.target} : null, travelling: !!walkTarget, actionProgress: action ? Math.min(1, action.elapsed / action.duration) : 0, blocked: blocked || !!state.paused, action: action?.kind ?? null, actionTarget: action?.target ?? null, waterCanVisible: tool.visible, wateringVisible: tool.visible, canVisible: tool.visible, waterCanStyle:'sprite', waterCanWidth:canWidth, streamVisible: drops.visible, dropsVisible: drops.visible, canScale: Math.abs(can.scale.x), waterNozzle: {x:nozzle.x,y:nozzle.y,z:nozzle.z}, visualYaw: model()?.rotation.y ?? 0, spriteFrame: model()?.userData.playerDirectionFrame ?? null, spriteDirection: model()?.userData.playerDirection ?? null, spriteStature: model()?.userData.playerStature ?? null, sideFrameCount: model()?.userData.playerSideFrameCount ?? null, target: enabled && available() ? nearest() : null }; },
    // QA can finish a presentation without advancing harvests, deliveries or any other rule.
    advance(seconds) {
      input.x = input.y = 0;
      const duration = clamp(Number(seconds) || 0, 0, 30), start = renderedTime, travel = walkTarget; walkTarget = null;
      for (let t = 0; t < duration && action; t += .05) update(Math.min(.05, duration - t), start + Math.min(duration, t + .05));
      update(0, renderedTime); walkTarget = travel;
      return api.state();
    },
    update,
  };
  return api;
}
