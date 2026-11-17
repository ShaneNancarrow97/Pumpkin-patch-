// Native garden crowns and the pavilion roof clear only the owner's sightline.
// This is view state: planted solids, geometry and full physical shadows stay put.
import * as THREE from "three";

const AXES = ["x", "y", "z"];
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y ?? 0) && Number.isFinite(p.z);
const rigs = new WeakMap();
const MAX_BLOCKERS = 64;
export const NEIGHBOURHOOD_VISIBILITY = Object.freeze({ enterMargin: .22, leaveMargin: .5, clearRate: 12, restoreRate: 7 });

// Slab clipping uses only the finite camera→owner segment. Scenery behind the
// lens, beyond the owner or above their sightline cannot clear a distant crown.
function intersectsSightline(player, camera, bounds, height, margin) {
  let near = 0, far = 1;
  for (const axis of AXES) {
    const start = camera[axis] ?? 0, end = (player[axis] ?? 0) + (axis === "y" ? height : 0), direction = end - start;
    const low = bounds.min[axis] - margin, high = bounds.max[axis] + margin;
    if (Math.abs(direction) < 1e-9) { if (start < low || start > high) return false; continue; }
    let a = (low - start) / direction, b = (high - start) / direction;
    if (a > b) { const previous = a; a = b; b = previous; }
    near = Math.max(near, a); far = Math.min(far, b);
    if (near > far) return false;
  }
  return true;
}

// Inputs and bounds are Three world coordinates, including the root's scale
// and terrain height. Two rays protect the owner's face and torso, not the lawn.
export function villageNeighbourhoodVisibility(player, camera, bounds, margin = NEIGHBOURHOOD_VISIBILITY.enterMargin) {
  if (!finitePoint(player) || !finitePoint(camera) || !bounds?.min || !bounds?.max || !Number.isFinite(margin) || margin < 0) return 1;
  for (const axis of AXES) if (!Number.isFinite(bounds.min[axis]) || !Number.isFinite(bounds.max[axis]) || bounds.min[axis] > bounds.max[axis]) return 1;
  return intersectsSightline(player, camera, bounds, 1.7, margin) || intersectsSightline(player, camera, bounds, .85, margin) ? 0 : 1;
}

function dress(material, rig) {
  const before = material.onBeforeCompile.bind(material), key = material.customProgramCacheKey.bind(material), capacity = rig.opacities.value.length;
  // Alpha hashing remains in the opaque pass, so no tree sorting or extra draw
  // is needed. Shadow materials deliberately retain their ordinary full shape.
  material.alphaHash = true;
  material.onBeforeCompile = (shader, renderer) => {
    before(shader, renderer);
    shader.uniforms.neighbourhoodVisibility = rig.opacities;
    shader.uniforms.neighbourhoodFadeEnabled = rig.enabled;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
      attribute float neighbourhoodBlocker;
      uniform float neighbourhoodVisibility[${capacity}];
      uniform float neighbourhoodFadeEnabled;
      varying float vNeighbourhoodVisibility;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
      vNeighbourhoodVisibility = mix(1., neighbourhoodVisibility[int(neighbourhoodBlocker + .5)], neighbourhoodFadeEnabled);`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vNeighbourhoodVisibility;")
      .replace("#include <alphahash_fragment>", "diffuseColor.a *= vNeighbourhoodVisibility;\n#include <alphahash_fragment>");
  };
  material.customProgramCacheKey = () => `${key()}|native-neighbourhood-visibility-${capacity}`;
  material.needsUpdate = true;
}

// Install AFTER finishVoxels so both shader hooks and program keys compose.
// Only owned cube clones receive the instance attribute; the global BOX shared
// by every other Voxels build is never changed or disposed.
export function installVillageNeighbourhoodVisibility(group) {
  if (!group || rigs.has(group)) return group;
  const blockers = group.userData.viewBlockers ?? [];
  if (blockers.length > MAX_BLOCKERS) throw new RangeError(`Native neighbourhood visibility supports at most ${MAX_BLOCKERS} blockers.`);
  const rig = {
    enabled: { value: 1 }, opacities: { value: new Float32Array(blockers.length + 1).fill(1) },
    blockers: blockers.map(b => ({ id: b.id, target: 1, local: new THREE.Box3(new THREE.Vector3(...b.bounds.min), new THREE.Vector3(...b.bounds.max)), world: new THREE.Box3() })),
    matrix: new THREE.Matrix4(), measured: false,
  };
  const geometries = new Set(), materials = new Set();
  group.traverse(mesh => {
    const ids = mesh.userData.neighbourhoodVisibilityIDs;
    if (!mesh.isInstancedMesh || !ids?.some(id => id > 0)) return;
    const geometry = mesh.geometry.clone();
    geometry.setAttribute("neighbourhoodBlocker", new THREE.InstancedBufferAttribute(Float32Array.from(ids), 1));
    mesh.geometry = geometry; geometries.add(geometry);
    for (const material of [].concat(mesh.material)) materials.add(material);
  });
  for (const material of materials) dress(material, rig);
  // Solid and fine-detail batches share their finish material. Give a batch
  // with no tagged boxes the permanent ID too if that material was dressed.
  group.traverse(mesh => {
    if (!mesh.isInstancedMesh || !materials.has(mesh.material) || geometries.has(mesh.geometry)) return;
    mesh.geometry = mesh.geometry.clone(); geometries.add(mesh.geometry);
    mesh.geometry.setAttribute("neighbourhoodBlocker", new THREE.InstancedBufferAttribute(new Float32Array(mesh.count), 1));
  });
  rigs.set(group, rig);
  group.userData.neighbourhoodVisibility = { mode: "per-instance-alpha-hash", blockers: blockers.length, faded: 0, fullShadows: true, worldUnits: true };
  const dispose = group.userData.dispose;
  let disposed = false;
  group.userData.dispose = () => {
    if (disposed) return;
    disposed = true; rigs.delete(group);
    for (const geometry of geometries) geometry.dispose();
    dispose?.();
  };
  return group;
}

// Called once after the active village camera has settled for this frame.
export function tickVillageNeighbourhoodVisibility(group, player, camera, dt = 0, { reducedMotion = false } = {}) {
  const rig = rigs.get(group);
  if (!rig) return;
  group.updateWorldMatrix(true, false);
  if (!rig.measured || !rig.matrix.equals(group.matrixWorld)) {
    rig.matrix.copy(group.matrixWorld); rig.measured = true;
    for (const b of rig.blockers) b.world.copy(b.local).applyMatrix4(rig.matrix);
  }
  const reset = !finitePoint(player) || !finitePoint(camera?.position), step = Number.isFinite(dt) ? Math.min(.25, Math.max(0, dt)) : 0;
  let faded = 0;
  for (const b of rig.blockers) {
    const margin = b.target === 0 ? NEIGHBOURHOOD_VISIBILITY.leaveMargin : NEIGHBOURHOOD_VISIBILITY.enterMargin;
    b.target = reset ? 1 : villageNeighbourhoodVisibility(player, camera.position, b.world, margin);
    const prior = rig.opacities.value[b.id], rate = b.target === 0 ? NEIGHBOURHOOD_VISIBILITY.clearRate : NEIGHBOURHOOD_VISIBILITY.restoreRate;
    const next = reset || reducedMotion ? b.target : prior + (b.target - prior) * (1 - Math.exp(-step * rate));
    rig.opacities.value[b.id] = Math.abs(next - b.target) < .005 ? b.target : next;
    if (rig.opacities.value[b.id] < .995) faded++;
  }
  group.userData.neighbourhoodVisibility.faded = faded;
}

// The actual-world atlas photographs complete foliage even during an active
// play fade. Nested captures and failed renders restore the exact live uniform.
export function withVillageNeighbourhoodVisibilityRestored(group, render) {
  const rig = rigs.get(group);
  if (!rig) return render();
  const previous = rig.enabled.value;
  try { rig.enabled.value = 0; return render(); }
  finally { rig.enabled.value = previous; }
}
