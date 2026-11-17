import * as THREE from "three";
import { createEntranceGlow } from "./entrance-glow.js";
import { createHollowExteriorEffects } from "./hollow-exterior-effects.js";
import { buildHollowExterior, disposeHollowObject } from "./hollow-house-world.js";
import { HOLLOW_PROPERTY } from "./content/hollow-house.js";

// The same property and door survive every appearance; only rules restore it.
export function createHollowFarm(scene, state, signBoard, lamps = []) {
  const root = new THREE.Group(); scene.add(root); root.position.set(HOLLOW_PROPERTY.x, 0, HOLLOW_PROPERTY.z);
  let key = "", building = null, sign = null, effects = null, rebuilds = 0, disposed = false;
  const media = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)") ?? globalThis.window?.matchMedia?.("(prefers-reduced-motion: reduce)");
  let reduced = !!media?.matches;
  const entrance = createEntranceGlow({ width: 1.66, top: 2.83, reducedMotion: true });
  entrance.group.position.z = 2.62; entrance.group.visible = false; root.add(entrance.group);
  const material = new THREE.MeshBasicMaterial({ visible: false });
  const hit = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 5), material); hit.position.y = 4; hit.userData = { type: "hollow-house" }; root.add(hit);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.7, .12), material); door.position.set(0, 1.48, 2.64); door.userData = { type: "hollow-door" }; root.add(door);
  const positions = [-1, 1].map(side => ({ x: HOLLOW_PROPERTY.x + side * .98, y: 2.2, z: HOLLOW_PROPERTY.z + 2.3, active: false }));
  lamps.push(...positions);
  const releaseSign = () => { if (!sign) return; sign.removeFromParent(); sign.geometry.dispose(); for (const m of Array.isArray(sign.material) ? sign.material : [sign.material]) { m.map?.dispose(); m.dispose(); } sign = null; };
  const change = event => { reduced = !!event.matches; effects?.tick(0, { ready: state.hollowHouse.status === "ready", reducedMotion: reduced }); };
  media?.addEventListener?.("change", change);
  const api = {
    root,
    tick(time) {
      if (disposed) return; time = Number.isFinite(time) ? time : 0; const ready = state.hollowHouse.status === "ready";
      entrance.tick(reduced ? 0 : time, ready);
      if (!reduced && ready) entrance.group.children[0].material.opacity = .12 + Math.sin(time * 1.7) * .025;
      effects?.tick(time, { ready, reducedMotion: reduced });
    },
    get pickables() { return disposed ? [] : [hit, sign, ...(state.hollowHouse.status === "ready" ? [door] : [])].filter(Boolean); },
    get status() { let boxes = 0; building?.traverse(o => { if (o.isInstancedMesh) boxes += o.count; }); return { status: state.hollowHouse.status, tier: state.hollowHouse.tier, rebuilds, boxes, reducedMotion: reduced, doorReady: state.hollowHouse.status === "ready", pooledLamps: positions.length, effects: effects?.status ?? null, footprint: building?.userData.footprint ?? { w: 8, d: 5 } }; },
    sync() {
      if (disposed) return;
      const h = state.hollowHouse, next = `${h.status}:${h.tier}`; positions.forEach(p => { p.active = h.status === "ready"; });
      if (next === key) return; key = next; rebuilds++;
      effects?.dispose(); effects = null;
      if (building) { building.removeFromParent(); disposeHollowObject(building); }
      releaseSign(); building = buildHollowExterior(h.status, h.tier); root.add(building);
      effects = createHollowExteriorEffects(building.userData.exteriorSockets, h.tier); root.add(effects.group);
      const subtitle = h.status === "ready" ? `Foyer ${h.tier} · Axel’s scare maze` : h.status === "restoring" ? "a haunting in the making" : "a forgotten property";
      sign = signBoard("The Hollow House", subtitle, 4.1); sign.position.set(0, 4.3, 2.7); sign.userData = { type: "hollow-house" }; root.add(sign);
      api.tick(0);
    },
    dispose() {
      if (disposed) return; disposed = true; media?.removeEventListener?.("change", change);
      effects?.dispose(); if (building) disposeHollowObject(building); releaseSign();
      entrance.group.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
      hit.geometry.dispose(); door.geometry.dispose(); material.dispose(); root.removeFromParent();
      for (const p of positions) { const i = lamps.indexOf(p); if (i >= 0) lamps.splice(i, 1); }
    },
  };
  return api;
}
