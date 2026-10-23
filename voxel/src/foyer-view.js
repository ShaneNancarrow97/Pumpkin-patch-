import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildHollowFoyer, buildFoyerDecor, animateFoyerDecor, disposeHollowObject } from "./hollow-house-world.js";
import { Voxels } from "./voxels.js";
import { createSpecialSprite, animateSpecialSprite } from "./special-sprites.js";
import { buildMazePrefab, animateMazePrefab } from "./maze-effects.js";
import { foyerLayout, foyerGuests, foyerVisitorPosition, hollowReady, mazeScareRating } from "./rules/hollow-house.js";
import { FOYER_DECOR_BY_ID, FOYER_FINISH_BY_ID, AXEL_LINES, MAZE_PREFABS } from "./content/hollow-house.js";
import { applyPieceColour } from "./piece-colours.js";
import { attachPieceGestures } from "./piece-gestures.js";

// One room and one guest list, with a camera-independent ticket simulation.
export function createFoyerView(canvas, state, hooks) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x100e18); scene.fog = new THREE.Fog(0x100e18, 40, 85);
  scene.add(new THREE.HemisphereLight(0xa4add6, 0x382735, 1.45));
  const fill = new THREE.DirectionalLight(0xf0cfb3, 1.05); fill.position.set(5, 12, 10); scene.add(fill);
  const moon = new THREE.DirectionalLight(0x9caee6, 1.65); moon.position.set(-7, 10, -4); scene.add(moon);
  const fire = new THREE.PointLight(0xff9e54, 7.5, 12, 1.4), deskLamp = new THREE.PointLight(0xffc476, 6, 10, 1.5); scene.add(fire, deskLamp);
  // The chandelier's pool over the medallion, and the corridor's violet light
  // spilling from behind the maze door's curtain.
  const chandelier = new THREE.PointLight(0xffb766, 5, 9, 1.5), portal = new THREE.PointLight(0x8c5ad6, 3, 5.5, 1.6); scene.add(chandelier, portal);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 90), controls = new OrbitControls(camera, canvas);
  controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = .12; controls.minDistance = 8; controls.maxDistance = 35; controls.minPolarAngle = .35; controls.maxPolarAngle = 1.35; controls.minAzimuthAngle = -.85; controls.maxAzimuthAngle = .85;
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN; controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE; controls.touches.ONE = THREE.TOUCH.PAN; controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // The selected piece follows a finger and turns with two, as in the house.
  // `override` is its live pose until the editor saves it.
  let override = null;
  const gestures = attachPieceGestures(canvas, {
    enabled: () => active && !hooks.blocked?.() && !!hooks.gesture?.pose(), camera: () => camera, controls, floorY: () => .07,
    grabs(e, at, ray) {
      const p = hooks.gesture.pose(), d = p && FOYER_DECOR_BY_ID[p.id]; if (!d || d.layer === "wall") return null;
      const own = p.instance && props.get(p.instance)?.hit; if (own) { scene.updateMatrixWorld(true); if (ray.intersectObject(own, false).length) return p; }
      const a = THREE.MathUtils.degToRad(p.rotation), dx = at.x - p.x, dz = at.z - p.z, u = dx * Math.cos(a) - dz * Math.sin(a), w = dx * Math.sin(a) + dz * Math.cos(a);
      return Math.abs(u) < d.w / 2 + .3 && Math.abs(w) < d.d / 2 + .3 ? p : null;
    },
    begin: () => hooks.gesture.begin(), drag: (x, z) => hooks.gesture.drag(x, z), turn: degrees => hooks.gesture.turn(degrees), end: cancelled => hooks.gesture.end(cancelled),
  });
  const host = createSpecialSprite("axel"); host.scale.setScalar(1.25); host.userData.activity = "idle"; scene.add(host);
  const hauntProps = new Map(); let hauntTier = 0;
  const material = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }), hits = [], props = new Map(), guests = new Map();
  const hit = (geometry, type, extra = {}) => { const m = new THREE.Mesh(geometry, material); m.userData = { type, ...extra }; scene.add(m); hits.push(m); return m; };
  const floor = hit(new THREE.PlaneGeometry(1, 1), "foyer-ground"); floor.rotation.x = -Math.PI / 2; floor.position.y = .09;
  const exit = hit(new THREE.BoxGeometry(2, 2.8, .4), "foyer-exit"), hostHit = hit(new THREE.BoxGeometry(1.2, 2.3, .9), "mortimer");
  const mazeEntrance = hit(new THREE.BoxGeometry(2.3, 2.9, .5), "maze-door");
  const mazeOutline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.35, 2.92, .06)), new THREE.LineBasicMaterial({ color: 0xc3a0e1, transparent: true, opacity: .3, toneMapped: false })); scene.add(mazeOutline);
  const walls = ["back", "left", "right"].map(wall => hit(new THREE.PlaneGeometry(1, 1), "foyer-wall", { wall }));
  let active = false, built = false, room = null, signature = "", first = true, time = 0, nextSpeech = 0, speechUntil = 0, speechIndex = 0, lastEvent = "";
  const bubble = document.createElement("div"); bubble.className = "mortimer-bubble"; bubble.hidden = true; document.body.append(bubble);
  const selection = new THREE.Group(); selection.visible = false; scene.add(selection); let ring = null, ghost = null, previewKey = "";
  let atmosphere = new THREE.Group(), floating = [], watchingEyes = null, doorMist = null; scene.add(atmosphere);
  const resize = () => { camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight); camera.updateProjectionMatrix(); };
  function reset() { resize(); const l = foyerLayout(state), distance = Math.max(16, l.w * .95 / Math.max(.65, camera.aspect)); controls.target.set(0, 1.8, .1); camera.position.set(distance * .23, distance * .56 + 1.8, distance * .86); controls.update(); }
  function sync() {
    const h = state.hollowHouse, l = foyerLayout(state), key = JSON.stringify([h.tier, h.foyer.finishes]);
    if (key !== signature) {
      if (room) { scene.remove(room); disposeHollowObject(room); } room = buildHollowFoyer(state); scene.add(room); signature = key;
      mazeEntrance.position.set(l.mazeDoor.x, 1.45, l.mazeDoor.z + .24); mazeOutline.position.copy(mazeEntrance.position);
      floor.scale.set(l.w, l.d, 1); exit.position.set(0, 1.4, l.z1); host.position.set(l.attendant.x, .06, l.attendant.z); hostHit.position.set(l.attendant.x, 1.2, l.attendant.z);
      fire.position.set(0, 1, l.z0 + .9); chandelier.position.set(room.userData.hub.x, room.userData.chandelierY - .35, room.userData.hub.z); chandelier.color.setHex(room.userData.lightTone); portal.position.set(l.mazeDoor.x, .9, l.mazeDoor.z + .75); deskLamp.position.set(l.counter.x, 2, l.counter.z + .5);
      deskLamp.color.setHex(FOYER_FINISH_BY_ID[h.foyer.finishes.lighting]?.color ?? 0xffc476);
      scene.remove(atmosphere); disposeHollowObject(atmosphere); atmosphere = new THREE.Group(); scene.add(atmosphere); floating = [];
      const effect = h.foyer.finishes.effects;
      // Soft, low ground haze leaves the desk and walking routes readable.
      // Quiet air has only a trace; the purchased mist finish is visibly denser.
      const count = effect === "purple-mist" ? 24 : 9;
      const coords = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) coords.set([Math.sin(i * 13) * l.w * .4, .15 + (i % 4) * .1, Math.cos(i * 7) * l.d * .4], i * 3);
      const pixels = new Uint8Array(32 * 32 * 4);
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const n = (y * 32 + x) * 4, fade = Math.max(0, 1 - Math.hypot(x - 15.5, y - 15.5) / 15.5);
        pixels.set([255, 255, 255, Math.round(fade * fade * 255)], n);
      }
      const map = new THREE.DataTexture(pixels, 32, 32); map.needsUpdate = true;
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(coords, 3));
      atmosphere.add(new THREE.Points(geo, new THREE.PointsMaterial({ map, color: effect === "purple-mist" ? 0x9970b8 : 0x8799b4, size: effect === "purple-mist" ? 1.7 : 1.25, transparent: true, opacity: effect === "purple-mist" ? .23 : .1, depthWrite: false, toneMapped: false })));
      // Mist curling out under the maze door's curtain.
      const wisps = new Float32Array(7 * 3);
      for (let i = 0; i < 7; i++) wisps.set([l.mazeDoor.x + Math.sin(i * 2.3) * .7, .12 + (i % 3) * .07, l.mazeDoor.z + .45 + (i % 4) * .22], i * 3);
      const wispGeo = new THREE.BufferGeometry(); wispGeo.setAttribute("position", new THREE.BufferAttribute(wisps, 3));
      doorMist = new THREE.Points(wispGeo, new THREE.PointsMaterial({ map, color: 0x9a74d4, size: 1.15, transparent: true, opacity: .2, depthWrite: false, toneMapped: false })); atmosphere.add(doorMist);
      // A presence on the unreachable landing, rather than a screen overlay.
      const eyes = new Voxels();
      for (const dx of [-.13, .13]) eyes.block(dx, 0, 0, .085, .055, .04, 0xcba3d5, true);
      watchingEyes = eyes.build(); watchingEyes.position.set(l.stairs.x, 3.3, l.z0 + .29); atmosphere.add(watchingEyes);
      if (["floating-candles","friendly-haunting"].includes(effect)) for(let i=0;i<4;i++) {
        const object=buildFoyerDecor(effect==="floating-candles"?"candle-cluster":"ghost-orb");object.scale.setScalar(effect==="floating-candles"?.5:.55);object.position.set(Math.sin(i*1.9)*l.w*.33,2.5+Math.cos(i)*.3,Math.cos(i*2.4)*l.d*.3);floating.push({object,y:object.position.y});atmosphere.add(object);
      }
      walls[0].position.set(0, 2.5, l.z0 + .16); walls[0].scale.set(l.w, 5, 1);
      for (let i = 1; i <= 2; i++) { walls[i].rotation.y = Math.PI / 2; walls[i].position.set(i === 1 ? l.x0 + .16 : l.x1 - .16, 2.5, 0); walls[i].scale.set(l.d, 5, 1); }
    }
    if(hauntTier!==h.tier){for(const object of hauntProps.values()){scene.remove(object);disposeHollowObject(object);}hauntProps.clear();hauntTier=h.tier;}
    const activeHaunts=new Set(h.haunts?.active??[]);
    for(const prefab of MAZE_PREFABS){let object=hauntProps.get(prefab.id);if(activeHaunts.has(prefab.id)&&!object){object=buildMazePrefab(prefab.id,l);hauntProps.set(prefab.id,object);scene.add(object);}if(object)object.visible=activeHaunts.has(prefab.id);}
    const live = new Set(h.foyer.placed.map(p => p.instance));
    for (const [id, e] of props) if (!live.has(id)) { scene.remove(e.group, e.hit); disposeHollowObject(e.group); e.hit.geometry.dispose(); hits.splice(hits.indexOf(e.hit), 1); props.delete(id); }
    for (const p of h.foyer.placed) {
      let e = props.get(p.instance); const d = FOYER_DECOR_BY_ID[p.id];
      if (!e) { const group = buildFoyerDecor(p.id), pick = hit(new THREE.BoxGeometry(d.w, d.height, d.d), "foyer-decor", { instance: p.instance }); scene.add(group); e = { group, hit: pick }; props.set(p.instance, e); }
      const q = override?.instance === p.instance ? override : p;
      e.group.position.set(q.x, q.y ?? .07, q.z); e.group.userData.mountY = q.y ?? .07; e.group.rotation.y = THREE.MathUtils.degToRad(q.rotation); e.hit.position.set(q.x, (q.y ?? .07) + d.height / 2, q.z); e.hit.rotation.y = e.group.rotation.y;
      if(e.tint!==p.tint){applyPieceColour(e.group,p.tint);e.tint=p.tint;}
    }
    built = true;
  }
  // When a piece is picked, the camera eases so it sits clear of the
  // placement card, as the house does with its piece bar.
  let framed = "", frameGoal = null;
  function keepInView() {
    if (!frameGoal || gestures.busy) return;
    const card = document.querySelector(".foyer-controls:not([hidden]) .estate-placement")?.getBoundingClientRect(), box = canvas.getBoundingClientRect();
    const bottom = Math.min(box.bottom, card?.top ?? box.bottom) - box.top, v = new THREE.Vector3(frameGoal.x, .6, frameGoal.z).project(camera);
    const sx = (v.x + 1) / 2 * box.width, sy = (1 - v.y) / 2 * box.height, wantX = box.width / 2, wantY = Math.min(bottom * .62, bottom - 70);
    if (Math.abs(sx - wantX) < 8 && Math.abs(sy - wantY) < 8 || ++frameGoal.steps > 90) { frameGoal = null; return; }
    const perPx = 2 * camera.position.distanceTo(controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / box.height;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize(), ahead = new THREE.Vector3().subVectors(controls.target, camera.position).setY(0).normalize();
    const pitch = Math.max(.35, Math.asin(Math.min(1, (camera.position.y - controls.target.y) / camera.position.distanceTo(controls.target))));
    const shift = right.multiplyScalar((sx - wantX) * perPx * .25).add(ahead.multiplyScalar(-(sy - wantY) * perPx * .25 / Math.sin(pitch)));
    controls.target.add(shift); camera.position.add(shift);
  }
  function preview(p) {
    override = p && !p.pending && p.instance ? p : null;
    const who = p ? p.instance ?? "pending:" + p.id : ""; if (who !== framed) { framed = who; frameGoal = p && FOYER_DECOR_BY_ID[p.id]?.layer !== "wall" ? { x: p.x, z: p.z, steps: 0 } : null; }
    const key = JSON.stringify(p); if (key === previewKey) return; previewKey = key; selection.visible = !!p;
    if (ring) { selection.remove(ring); ring.geometry.dispose(); ring.material.dispose(); ring = null; } if (ghost) { selection.remove(ghost); disposeHollowObject(ghost); ghost = null; }
    if (!p) return; const d = FOYER_DECOR_BY_ID[p.id]; if (!d) return;
    const points = d.layer === "wall" ? [-d.w/2,0,0,d.w/2,0,0,d.w/2,d.height,0,-d.w/2,d.height,0] : [-d.w/2,0,-d.d/2,d.w/2,0,-d.d/2,d.w/2,0,d.d/2,-d.w/2,0,d.d/2];
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3)); ring = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: p.valid === false ? 0xe9927e : 0xedc383, depthTest: false })); ring.renderOrder = 20; selection.add(ring);
    if (p.pending) { ghost = buildFoyerDecor(p.id); ghost.traverse(m => { if (m.material) { m.material.transparent = true; m.material.opacity = .45; m.material.depthWrite = false; } }); selection.add(ghost); }
    const l = foyerLayout(state), wall = d.layer === "wall", rotation = wall ? p.wall === "left" ? 90 : p.wall === "right" ? 270 : 0 : p.rotation;
    selection.position.set(wall && p.wall !== "back" ? p.wall === "left" ? l.x0 + .18 : l.x1 - .18 : p.x, p.y ?? .15, wall && p.wall === "back" ? l.z0 + .18 : p.z); selection.rotation.y = THREE.MathUtils.degToRad(rotation);
  }
  function speak(force = false) { if (!active || hooks.blocked?.() || hooks.decorating?.() || !hollowReady(state) || !state.hollowHouse.open || !force && time < nextSpeech) return; bubble.textContent = AXEL_LINES[speechIndex++ % AXEL_LINES.length]; speechUntil = time + 2; nextSpeech = time + 14; }
  const pointers = new Map(); let multi = false;
  canvas.addEventListener("pointerdown", e => { if (!active || hooks.blocked?.()) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: 0 }); if (pointers.size > 1) multi = true; });
  canvas.addEventListener("pointermove", e => { const p = pointers.get(e.pointerId); if (p) p.moved = Math.max(p.moved, Math.hypot(e.clientX-p.x,e.clientY-p.y)); });
  canvas.addEventListener("pointerup", e => {
    const p = pointers.get(e.pointerId), tap = active && p && p.moved < 7 && !multi && e.button === 0 && !hooks.blocked?.(); pointers.delete(e.pointerId); if (!pointers.size) multi = false; if (!tap) return;
    const box = canvas.getBoundingClientRect(), ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1),camera); scene.updateMatrixWorld(true);
    const found = ray.intersectObjects(hits, false), wallEditing = hooks.wallEditing?.(); const h = wallEditing ? found.find(h => h.object.userData.type === "foyer-wall") ?? found[0] : hooks.decorating?.() ? found.find(h=>h.object.userData.type==="foyer-ground") : found.find(h => h.object.userData.type === "visitor") ?? found[0];
    if (h) hooks.onPick({ ...h.object.userData, point: h.point });
  });
  canvas.addEventListener("pointercancel", e => { pointers.delete(e.pointerId); if (!pointers.size) multi = false; });
  return {
    scene, camera, sync, resize, preview, speak,
    cameraActions: { reset, rotate(delta) { const off = camera.position.clone().sub(controls.target); off.applyAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(delta)); camera.position.copy(controls.target).add(off); controls.update(); }, zoom(f) { camera.position.sub(controls.target).multiplyScalar(1/f).add(controls.target); controls.update(); } },
    enter() { active = true; sync(); resize(); if (first) { reset(); first = false; } controls.enabled = true; }, leave() { active = false; controls.enabled = false; bubble.hidden = true; pointers.clear(); multi = false; preview(null); },
    tick(dt, now) {
      time = now; controls.enabled = active && !hooks.blocked?.() && !gestures.busy; if (!active) return; sync(); keepInView(); controls.update();
      const list = foyerGuests(state), ids = new Set(list.map(v => v.id));
      for (const [id,e] of guests) if (!ids.has(id)) { scene.remove(e.model,e.hit); e.model.userData.dispose?.(); e.hit.geometry.dispose(); hits.splice(hits.indexOf(e.hit),1); guests.delete(id); }
      for (const v of list) { let e = guests.get(v.id); if (!e) { const model = hooks.visitorModel(v.kind), pick = hit(new THREE.BoxGeometry(.9,2.2,.8),"visitor",{id:v.id}); scene.add(model); e={model,hit:pick}; guests.set(v.id,e); } const p=foyerVisitorPosition(state,v); if (!p) continue; e.model.position.set(p.x,.08,p.z); e.hit.position.set(p.x,1.2,p.z); hooks.animate(e.model,now+v.id,["entering","to-maze","returning","requeue","exit"].includes(v.hollow.phase)||v.hollow.phase==="serving"&&v.hollow.elapsed<.8); }
      let activity = list.some(v=>v.hollow.phase==="serving") ? "selling" : "idle"; const event=state.hollowHouse.lastEvent;
      if (event && state.time-event.at<2) activity={ticket:"counting",welcome:"welcome",gesture:"gesture",survivor:"frightened"}[event.kind]??activity;
      mazeOutline.visible = !hooks.decorating?.(); mazeOutline.material.opacity = reducedMotion ? .3 : .28 + Math.sin(now * 1.4) * .05;
      const motionTime=reducedMotion?0:now;
      fire.intensity = 7.1 + Math.sin(motionTime * 2.1) * .35 + Math.sin(motionTime * 5.3) * .12;
      chandelier.intensity = 5 + Math.sin(motionTime * 3.7) * .18 + Math.sin(motionTime * 7.9) * .08; portal.intensity = 3 + Math.sin(motionTime * 1.3) * .6;
      if (doorMist) { doorMist.material.opacity = .19 + Math.sin(motionTime * .9) * .05; doorMist.position.set(Math.sin(motionTime * .35) * .12, Math.sin(motionTime * .6) * .04, Math.sin(motionTime * .25) * .1 + .05); }
      if (watchingEyes) watchingEyes.visible = Math.sin(motionTime * .19) > -.7;
      const l=foyerLayout(state),previousX=host.position.x,patrolling=activity==="idle"&&state.hollowHouse.open&&!state.paused&&!reducedMotion;
      host.position.x=l.attendant.x+(patrolling?Math.sin(now*.52)*.34:0);hostHit.position.x=host.position.x;host.userData.activity=activity;
      animateSpecialSprite(host,motionTime,patrolling&&Math.abs(host.position.x-previousX)>.0003,host.position.x-previousX);
      for(const object of hauntProps.values())if(object.visible)animateMazePrefab(object,now,reducedMotion);
      for (const e of props.values()) animateFoyerDecor(e.group,motionTime);
      floating.forEach(({object,y},i)=>{object.position.y=y+Math.sin(motionTime*.8+i)*.13;object.rotation.y=Math.sin(motionTime*.4+i)*.15;});atmosphere.rotation.y=Math.sin(motionTime*.06)*.015;
      const eventKey=JSON.stringify(event); if(eventKey!==lastEvent){lastEvent=eventKey;if(event?.kind!=="ticket")speak();}
      if(now>nextSpeech+18)speak();
      bubble.hidden=now>speechUntil||hooks.blocked?.()||hooks.decorating?.();
      if(!bubble.hidden){const p=host.position.clone().add(new THREE.Vector3(0,2.65,0)).project(camera);bubble.style.left=(p.x+1)*canvas.clientWidth/2+"px";bubble.style.top=(1-p.y)*canvas.clientHeight/2+"px";}
    },
    get status(){return{active,built,tier:state.hollowHouse.tier,decor:props.size,visitors:guests.size,guests:[...guests].map(([id,e])=>({id,x:e.model.position.x,z:e.model.position.z,terror:state.visitors.find(v=>v.id===id)?.hollow?.terror??0,phase:state.visitors.find(v=>v.id===id)?.hollow?.phase})),host:"Axel",hostSprite:host.userData.specialSprite,hostFrame:host.userData.frame??0,haunts:[...hauntProps].filter(([,object])=>object.visible).map(([id])=>id),scareRating:mazeScareRating(state),mortimer:host.userData.activity};},
  };
}
