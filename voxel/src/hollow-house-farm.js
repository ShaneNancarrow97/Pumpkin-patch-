import * as THREE from "three";
import { buildHollowExterior, disposeHollowObject } from "./hollow-house-world.js";
import { HOLLOW_PROPERTY } from "./content/hollow-house.js";

// The property appears derelict on purchased land; only the rules can restore it.
export function createHollowFarm(scene, state, signBoard) {
  const root = new THREE.Group(); scene.add(root); root.position.set(HOLLOW_PROPERTY.x, 0, HOLLOW_PROPERTY.z);
  let key = "", building = null, sign = null;
  const hit = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 5.8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 4; hit.userData = { type: "hollow-house" }; root.add(hit);
  return { get pickables() { return root.visible ? [hit, sign].filter(Boolean) : []; }, sync() {
    root.visible = !!state.festival.meadow; if (!root.visible) return;
    const h = state.hollowHouse, next = `${h.status}:${h.tier}`; if (next === key) return; key = next;
    if (building) { root.remove(building); disposeHollowObject(building); } if (sign) { root.remove(sign); sign.geometry.dispose(); for (const m of sign.material) { m.map?.dispose(); m.dispose(); } }
    building = buildHollowExterior(h.status, h.tier); root.add(building);
    sign = signBoard("The Hollow House", h.status === "ready" ? "Mortimer’s scare maze" : h.status === "restoring" ? "a haunting in the making" : "a forgotten property", 6.2); sign.position.set(0, 4.3, 2.7); sign.userData = { type: "hollow-house" }; root.add(sign);
  } };
}
