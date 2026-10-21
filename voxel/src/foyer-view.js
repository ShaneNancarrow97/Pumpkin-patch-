import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildHollowFoyer, buildFoyerDecor, animateFoyerDecor, disposeHollowObject } from "./hollow-house-world.js";
import { Voxels } from "./voxels.js";
import { createMortimer } from "./mortimer.js";
import { foyerLayout, foyerGuests, foyerVisitorPosition, hollowReady } from "./rules/hollow-house.js";
import { FOYER_DECOR_BY_ID, FOYER_FINISH_BY_ID, MORTIMER_LINES } from "./content/hollow-house.js";
import { applyPieceColour } from "./piece-colours.js";

// One room and one guest list, with a camera-independent ticket simulation.
export function createFoyerView(canvas, state, hooks) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x100e18); scene.fog = new THREE.Fog(0x100e18, 40, 85);
  scene.add(new THREE.HemisphereLight(0xa4add6, 0x382735, 1.45));
  const fill = new THREE.DirectionalLight(0xf0cfb3, 1.05); fill.position.set(5, 12, 10); scene.add(fill);
  const moon = new THREE.DirectionalLight(0x9caee6, 1.65); moon.position.set(-7, 10, -4); scene.add(moon);
  const fire = new THREE.PointLight(0xff9e54, 7.5, 12, 1.4), deskLamp = new THREE.PointLight(0xffc476, 6, 10, 1.5); scene.add(fire, deskLamp);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 90), controls = new OrbitControls(camera, canvas);
  controls.enabled = false; controls.enableDamping = true; controls.dampingFactor = .12; controls.minDistance = 8; controls.maxDistance = 35; controls.minPolarAngle = .35; controls.maxPolarAngle = 1.35; controls.minAzimuthAngle = -.85; controls.maxAzimuthAngle = .85;
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN; controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE; controls.touches.ONE = THREE.TOUCH.PAN; controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  const mortimer = createMortimer(); scene.add(mortimer.group);
  const material = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }), hits = [], props = new Map(), guests = new Map();
  const hit = (geometry, type, extra = {}) => { const m = new THREE.Mesh(geometry, material); m.userData = { type, ...extra }; scene.add(m); hits.push(m); return m; };
  const floor = hit(new THREE.PlaneGeometry(1, 1), "foyer-ground"); floor.rotation.x = -Math.PI / 2; floor.position.y = .09;
  const exit = hit(new THREE.BoxGeometry(2, 2.8, .4), "foyer-exit"), hostHit = hit(new THREE.BoxGeometry(.85, 3.9, .9), "mortimer");
  const walls = ["back", "left", "right"].map(wall => hit(new THREE.PlaneGeometry(1, 1), "foyer-wall", { wall }));
  let active = false, built = false, room = null, signature = "", first = true, time = 0, nextSpeech = 0, speechUntil = 0, speechIndex = 0, lastEvent = "";
  const bubble = document.createElement("div"); bubble.className = "mortimer-bubble"; bubble.hidden = true; document.body.append(bubble);
  const selection = new THREE.Group(); selection.visible = false; scene.add(selection); let ring = null, ghost = null, previewKey = "";
  let atmosphere = new THREE.Group(), floating = [], watchingEyes = null; scene.add(atmosphere);
  const resize = () => { camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight); camera.updateProjectionMatrix(); };
  function reset() { resize(); const l = foyerLayout(state), distance = Math.max(16, l.w * .95 / Math.max(.65, camera.aspect)); controls.target.set(0, 1.8, .1); camera.position.set(distance * .23, distance * .56 + 1.8, distance * .86); controls.update(); }
  function sync() {
    const h = state.hollowHouse, l = foyerLayout(state), key = JSON.stringify([h.tier, h.foyer.finishes]);
    if (key !== signature) {
      if (room) { scene.remove(room); disposeHollowObject(room); } room = buildHollowFoyer(state); scene.add(room); signature = key;
      floor.scale.set(l.w, l.d, 1); exit.position.set(0, 1.4, l.z1); mortimer.group.position.set(l.attendant.x, .06, l.attendant.z); hostHit.position.set(l.attendant.x, 1.95, l.attendant.z);
      fire.position.set(0, 1, l.z0 + .9); deskLamp.position.set(l.counter.x, 2, l.counter.z + .5);
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
    const live = new Set(h.foyer.placed.map(p => p.instance));
    for (const [id, e] of props) if (!live.has(id)) { scene.remove(e.group, e.hit); disposeHollowObject(e.group); e.hit.geometry.dispose(); hits.splice(hits.indexOf(e.hit), 1); props.delete(id); }
    for (const p of h.foyer.placed) {
      let e = props.get(p.instance); const d = FOYER_DECOR_BY_ID[p.id];
      if (!e) { const group = buildFoyerDecor(p.id), pick = hit(new THREE.BoxGeometry(d.w, d.height, d.d), "foyer-decor", { instance: p.instance }); scene.add(group); e = { group, hit: pick }; props.set(p.instance, e); }
      e.group.position.set(p.x, p.y ?? .07, p.z); e.group.userData.mountY = p.y ?? .07; e.group.rotation.y = THREE.MathUtils.degToRad(p.rotation); e.hit.position.set(p.x, (p.y ?? .07) + d.height / 2, p.z); e.hit.rotation.y = e.group.rotation.y;
      if(e.tint!==p.tint){applyPieceColour(e.group,p.tint);e.tint=p.tint;}
    }
    built = true;
  }
  function preview(p) {
    const key = JSON.stringify(p); if (key === previewKey) return; previewKey = key; selection.visible = !!p;
    if (ring) { selection.remove(ring); ring.geometry.dispose(); ring.material.dispose(); ring = null; } if (ghost) { selection.remove(ghost); disposeHollowObject(ghost); ghost = null; }
    if (!p) return; const d = FOYER_DECOR_BY_ID[p.id]; if (!d) return;
    const points = d.layer === "wall" ? [-d.w/2,0,0,d.w/2,0,0,d.w/2,d.height,0,-d.w/2,d.height,0] : [-d.w/2,0,-d.d/2,d.w/2,0,-d.d/2,d.w/2,0,d.d/2,-d.w/2,0,d.d/2];
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3)); ring = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: p.valid === false ? 0xe9927e : 0xedc383, depthTest: false })); ring.renderOrder = 20; selection.add(ring);
    if (p.pending) { ghost = buildFoyerDecor(p.id); ghost.traverse(m => { if (m.material) { m.material.transparent = true; m.material.opacity = .45; m.material.depthWrite = false; } }); selection.add(ghost); }
    const l = foyerLayout(state), wall = d.layer === "wall", rotation = wall ? p.wall === "left" ? 90 : p.wall === "right" ? 270 : 0 : p.rotation;
    selection.position.set(wall && p.wall !== "back" ? p.wall === "left" ? l.x0 + .18 : l.x1 - .18 : p.x, p.y ?? .15, wall && p.wall === "back" ? l.z0 + .18 : p.z); selection.rotation.y = THREE.MathUtils.degToRad(rotation);
  }
  function speak(force = false) { if (!active || hooks.blocked?.() || hooks.decorating?.() || !hollowReady(state) || !state.hollowHouse.open || !force && time < nextSpeech) return; bubble.textContent = MORTIMER_LINES[speechIndex++ % MORTIMER_LINES.length]; speechUntil = time + 2; nextSpeech = time + 14; }
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
      time = now; controls.enabled = active && !hooks.blocked?.(); if (!active) return; sync(); controls.update();
      const list = foyerGuests(state), ids = new Set(list.map(v => v.id));
      for (const [id,e] of guests) if (!ids.has(id)) { scene.remove(e.model,e.hit); e.model.userData.dispose?.(); e.hit.geometry.dispose(); hits.splice(hits.indexOf(e.hit),1); guests.delete(id); }
      for (const v of list) { let e = guests.get(v.id); if (!e) { const model = hooks.visitorModel(v.kind), pick = hit(new THREE.BoxGeometry(.9,2.2,.8),"visitor",{id:v.id}); scene.add(model); e={model,hit:pick}; guests.set(v.id,e); } const p=foyerVisitorPosition(state,v); if (!p) continue; e.model.position.set(p.x,.08,p.z); e.hit.position.set(p.x,1.2,p.z); hooks.animate(e.model,now+v.id,["entering","to-maze","returning","exit"].includes(v.hollow.phase)||v.hollow.phase==="serving"&&v.hollow.elapsed<.8); }
      let activity = list.some(v=>v.hollow.phase==="serving") ? "selling" : "idle"; const event=state.hollowHouse.lastEvent;
      if (event && state.time-event.at<2) activity={ticket:"counting",welcome:"welcome",gesture:"gesture",survivor:"frightened"}[event.kind]??activity;
      fire.intensity = 7.1 + Math.sin(now * 2.1) * .35 + Math.sin(now * 5.3) * .12;
      if (watchingEyes) watchingEyes.visible = Math.sin(now * .19) > -.7;
      mortimer.tick(now,activity); for (const e of props.values()) animateFoyerDecor(e.group,now);
      floating.forEach(({object,y},i)=>{object.position.y=y+Math.sin(now*.8+i)*.13;object.rotation.y=Math.sin(now*.4+i)*.15;});atmosphere.rotation.y=Math.sin(now*.06)*.015;
      const eventKey=JSON.stringify(event); if(eventKey!==lastEvent){lastEvent=eventKey;if(event?.kind!=="ticket")speak();}
      if(now>nextSpeech+18)speak();
      bubble.hidden=now>speechUntil||hooks.blocked?.()||hooks.decorating?.();
      if(!bubble.hidden){const p=mortimer.group.position.clone().add(new THREE.Vector3(0,4.2,0)).project(camera);bubble.style.left=(p.x+1)*canvas.clientWidth/2+"px";bubble.style.top=(1-p.y)*canvas.clientHeight/2+"px";}
    },
    get status(){return{active,built,tier:state.hollowHouse.tier,decor:props.size,visitors:guests.size,guests:[...guests].map(([id,e])=>({id,x:e.model.position.x,z:e.model.position.z})),mortimer:mortimer.group.userData.activity};},
  };
}
