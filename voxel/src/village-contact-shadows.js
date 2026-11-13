// A single small draw anchors the village's existing painted people to ground.
// Their artwork, animation, logical feet and hit boxes are never changed.
import * as THREE from "three";

export const VILLAGE_CONTACT_SHADOW_BUDGET = Object.freeze({ capacity: 32, drawCalls: 1, triangles: 64, lights: 0, textures: 0, maxHeight: 1.2, maxInset: .5 });
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
export function villageContactOpacity(height) {
  // Navigation stays on its continuous ramp while stone treads quantise that
  // slope by up to .42 world units. Keep contact on the visible tread top.
  if (!Number.isFinite(height) || height < -VILLAGE_CONTACT_SHADOW_BUDGET.maxInset || height >= VILLAGE_CONTACT_SHADOW_BUDGET.maxHeight) return 0;
  const t = Math.max(0, height) / VILLAGE_CONTACT_SHADOW_BUDGET.maxHeight;
  return .34 * (1 - t) * (1 - t);
}

// The existing hallShell boards top at .12 on the design grid. Rugs and their
// woven borders can stand higher. Record only low floor surfaces once from the
// actual built boxes, so a contact cannot disappear underneath a room's runner.
export function createVillageHallContactGround(boxes, { scale = 1.5, originX = 4000, originZ = 0 } = {}) {
  const surfaces = [];
  for (const b of boxes) {
    const low = b[1] - b[4] / 2, top = b[1] + b[4] / 2;
    if (low < -.001 || top > .25 || b[4] > .14) continue;
    surfaces.push([(b[0] - b[3] / 2) * scale + originX, (b[2] - b[5] / 2) * scale + originZ, (b[0] + b[3] / 2) * scale + originX, (b[2] + b[5] / 2) * scale + originZ, top * scale]);
  }
  return { heightAt(x, z) {
    let height = .12 * scale;
    for (const b of surfaces) if (x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3]) height = Math.max(height, b[4]);
    return height;
  } };
}

// Native gravel and Acre paths write depth above the terrain. Measure their
// existing low box tops only when a layer is built/replaced, then each contact
// reads one small spatial cell. This never changes a voxel or walking rule.
export function createVillageContactSurfaceIndex(groundAt) {
  const layers = new Map(), cells = new Map(), cellSize = 4, stats = { surfaces: 0, cells: 0 };
  const key = (x, z) => `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
  const unit = new THREE.Box3(new THREE.Vector3(-.5, -.5, -.5), new THREE.Vector3(.5, .5, .5)), bounds = new THREE.Box3(), instance = new THREE.Matrix4(), transform = new THREE.Matrix4(), centre = new THREE.Vector3();
  function rebuild() {
    cells.clear(); stats.surfaces = 0;
    for (const surfaces of layers.values()) for (const b of surfaces) {
      stats.surfaces++;
      for (let ix = Math.floor(b[0] / cellSize); ix <= Math.floor(b[2] / cellSize); ix++) for (let iz = Math.floor(b[1] / cellSize); iz <= Math.floor(b[3] / cellSize); iz++) {
        const cell = `${ix},${iz}`; if (!cells.has(cell)) cells.set(cell, []); cells.get(cell).push(b);
      }
    }
    stats.cells = cells.size;
  }
  return {
    replace(id, group) {
      const surfaces = []; group.updateWorldMatrix(true, true);
      group.traverse(mesh => {
        if (!mesh.isInstancedMesh || mesh.geometry.type !== "BoxGeometry" || !mesh.material.isMeshStandardMaterial) return;
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, instance); transform.multiplyMatrices(mesh.matrixWorld, instance);
          if (Math.hypot(transform.elements[4], transform.elements[5], transform.elements[6]) > .21) continue;
          bounds.copy(unit).applyMatrix4(transform); bounds.getCenter(centre);
          const ground = groundAt(centre.x, -centre.z), lift = bounds.max.y - ground;
          if (!Number.isFinite(ground) || lift <= .002 || lift > .35) continue;
          surfaces.push([bounds.min.x, bounds.min.z, bounds.max.x, bounds.max.z, bounds.max.y]);
        }
      });
      layers.set(id, surfaces); rebuild();
    },
    heightAt(x, realmZ) {
      let height = groundAt(x, realmZ); const z = -realmZ;
      for (const b of cells.get(key(x, z)) ?? []) if (x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3]) height = Math.max(height, b[4]);
      return height;
    },
    dispose() { layers.clear(); cells.clear(); stats.surfaces = stats.cells = 0; }, stats,
  };
}

// The game already owns these direct scene roots. Cache descriptors without
// changing actors or depending on the private layout of a sprite's children.
export function createVillageContactActorSource() {
  const entries = [], actors = new WeakMap();
  return { collect(scene, groundAt) {
    entries.length = 0;
    for (const actor of scene.children) {
      if (!actor.visible || !(actor.userData.kind === "person" || actor.userData.villageWanderer || actor.name.startsWith("resident-"))) continue;
      let entry = actors.get(actor);
      if (!entry) { entry = { position: actor.position, groundY: 0, width: actor.userData.villageWanderer ? .92 : 1.08, depth: .7 }; actors.set(actor, entry); }
      entry.groundY = groundAt(actor.position.x, -actor.position.z);
      entries.push(entry);
      if (entries.length >= VILLAGE_CONTACT_SHADOW_BUDGET.capacity) break;
    }
    return entries;
  } };
}

export function createVillageContactShadows({ capacity = VILLAGE_CONTACT_SHADOW_BUDGET.capacity } = {}) {
  const limit = Math.max(1, Math.min(VILLAGE_CONTACT_SHADOW_BUDGET.capacity, Math.floor(capacity) || 1)), geometry = new THREE.PlaneGeometry(1, 1);
  const opacity = new THREE.InstancedBufferAttribute(new Float32Array(limit), 1).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("contactOpacity", opacity);
  const material = new THREE.ShaderMaterial({ transparent: true, depthTest: true, depthWrite: false, fog: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    uniforms: THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    vertexShader: `attribute float contactOpacity; varying vec2 vContactUv; varying float vContactOpacity;
      #include <fog_pars_vertex>
      void main() { vContactUv = uv; vContactOpacity = contactOpacity;
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position.x, 0., -position.y, 1.);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `varying vec2 vContactUv; varying float vContactOpacity;
      #include <fog_pars_fragment>
      void main() { vec2 q = vContactUv * 2. - 1.; float radius = dot(q, q);
        if (radius >= 1.) discard;
        float alpha = (1. - radius) * (1. - radius) * vContactOpacity;
        gl_FragColor = vec4(.018, .012, .025, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }` });
  const mesh = new THREE.InstancedMesh(geometry, material, limit), group = new THREE.Group();
  group.name = "village-contact-shadows"; group.add(mesh); mesh.count = 0;
  mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false; mesh.renderOrder = 1;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Quaternion();
  const stats = { capacity: limit, count: 0, drawCalls: 1, triangles: 0, lights: 0, textures: 0, uploads: 0 };
  let disposed = false;
  function update(entries = []) {
    if (disposed) return;
    let count = 0, matrixChanged = false, alphaChanged = false;
    for (const entry of entries) {
      if (count >= limit) break;
      if (!entry || entry.visible === false || !finitePoint(entry.position) || !Number.isFinite(entry.groundY)) continue;
      const alpha = villageContactOpacity(entry.position.y - entry.groundY);
      if (!alpha) continue;
      const width = Number.isFinite(entry.width) ? Math.max(.15, Math.min(2.5, entry.width)) : 1.05, depth = Number.isFinite(entry.depth) ? Math.max(.15, Math.min(2, entry.depth)) : .72;
      position.set(entry.position.x, entry.groundY + .008, entry.position.z); scale.set(width, 1, depth); matrix.compose(position, rotation, scale);
      const offset = count * 16;
      for (let j = 0; j < 16; j++) if (mesh.instanceMatrix.array[offset + j] !== Math.fround(matrix.elements[j])) { mesh.setMatrixAt(count, matrix); matrixChanged = true; break; }
      if (opacity.array[count] !== Math.fround(alpha)) { opacity.array[count] = alpha; alphaChanged = true; }
      count++;
    }
    mesh.count = count; group.visible = count > 0; stats.count = count; stats.triangles = count * 2;
    if (matrixChanged) mesh.instanceMatrix.needsUpdate = true;
    if (alphaChanged) opacity.needsUpdate = true;
    if (matrixChanged || alphaChanged) stats.uploads++;
  }
  return { group, update, stats,
    hide() { group.visible = false; mesh.count = 0; stats.count = stats.triangles = 0; },
    dispose() { if (disposed) return; disposed = true; group.removeFromParent(); mesh.dispose(); geometry.dispose(); material.dispose(); group.clear(); },
  };
}
