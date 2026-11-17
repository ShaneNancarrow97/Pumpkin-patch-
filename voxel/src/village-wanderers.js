import * as THREE from "three";
import { animateVisitor } from "./sprite-actors.js";
import { addSpriteRim } from "./sprite-rim.js";
import { LEAN } from "./world.js";
import { VISITOR_KINDS } from "./content/visitors.js";
import { villageWalkObstacles } from "./rules/village-navigation.js";
import { VILLAGE_WANDERER_LIMIT, villageWandererPlans, createVillageWandererRoutine, advanceVillageWanderer } from "./rules/village-wanderers.js";

// Three existing painted visitor planes at most; no new atlas, light, shadow
// pass, hitbox or saved customer is created for the village's quiet foot traffic.
export function createVillageWanderers({ scene, state, createVisitor, groundAt = () => 0 }) {
  const readState = typeof state === "function" ? state : () => state;
  const right = new THREE.Vector3();
  let plans = null, entries = [], retry = 0;
  function ensure() {
    plans ??= villageWandererPlans(readState());
    for (const plan of plans) {
      if (entries.some(entry => entry.plan.id === plan.id) || entries.length >= VILLAGE_WANDERER_LIMIT) continue;
      const sprite = createVisitor(plan.kind); if (!sprite?.isObject3D) continue;
      const root = new THREE.Group(); root.name = plan.id; root.userData = { villageWanderer: true, cosmetic: true, kind: VISITOR_KINDS[plan.kind] };
      root.add(sprite); scene.add(root);
      sprite.traverse(mesh => {
        if (!mesh.isMesh) return;
        mesh.castShadow = false; mesh.receiveShadow = true;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          const image = material?.map?.image, width = image?.naturalWidth || image?.width, height = image?.naturalHeight || image?.height;
          if (material?.isMeshStandardMaterial && width && height && !material.userData.villageRim) addSpriteRim(material, width, height);
        }
      });
      entries.push({ plan, root, sprite, routine: createVillageWandererRoutine(plan) });
    }
    retry = .5;
  }
  return {
    tick(dt, camera, { paused = false, hidden = false } = {}) {
      const elapsed = Number.isFinite(dt) && dt > 0 ? Math.min(.25, dt) : 0;
      if (!hidden) { retry -= elapsed; if (!plans || retry <= 0 && entries.length < plans.length) ensure(); }
      if (hidden) { for (const entry of entries) { entry.root.visible = false; entry.routine.walking = false; } return; }
      const current = readState(), obstacles = villageWalkObstacles(current);
      if (camera) { right.set(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize(); }
      for (const entry of entries) {
        const { root, sprite, routine, plan } = entry;
        root.visible = !hidden;
        advanceVillageWanderer(current, plan, routine, elapsed, { paused, hidden, obstacles });
        root.position.set(routine.x, groundAt(routine.x, routine.z), -routine.z);
        if (camera) {
          const dx = camera.position.x - root.position.x, dz = camera.position.z - root.position.z;
          root.rotation.y = Math.atan2(dx, dz);
          const lean = sprite.children[0];
          if (lean) { const pitch = Math.atan2(camera.position.y - root.position.y - .9, Math.hypot(dx, dz)); lean.rotation.x = -LEAN; lean.scale.y = Math.min(1.5, 1 / Math.cos(Math.max(0, pitch - LEAN))); }
        }
        const across = routine.heading.x * right.x - routine.heading.z * right.z;
        if (!paused) animateVisitor(sprite, routine.walking ? routine.walkAge : routine.age, routine.walking, across);
      }
    },
    clear() {
      for (const entry of entries) { scene.remove(entry.root); entry.sprite.userData.dispose?.(); }
      entries = []; plans = null; retry = 0;
    },
    get status() {
      return { count: entries.length, maximum: VILLAGE_WANDERER_LIMIT, people: entries.map(({ plan, root, routine }) => ({
        id: plan.id, kind: VISITOR_KINDS[plan.kind], lane: plan.lane, x: routine.x, z: routine.z,
        walking: routine.walking, wait: routine.wait, distance: routine.distance, visible: root.visible,
      })) };
    },
  };
}
