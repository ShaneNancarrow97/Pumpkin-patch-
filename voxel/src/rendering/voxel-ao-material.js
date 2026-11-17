import * as THREE from "three";
import { VOXEL_AO, bakeVoxelAmbientOcclusion, remapVoxelAO } from "./voxel-ambient-occlusion.js";

const isBatch = mesh => mesh?.isInstancedMesh && mesh.geometry?.type === "BoxGeometry" && mesh.geometry.parameters?.width === 1 && mesh.geometry.parameters?.height === 1 && mesh.geometry.parameters?.depth === 1;
const clock = () => globalThis.performance?.now?.() ?? Date.now();
const IDENTITY_AXES = [{ axis: 0, sign: 1 }, { axis: 1, sign: 1 }, { axis: 2, sign: 1 }];
const dressedHooks = new WeakMap();

// Deliberately indirect-only: warm direct lamps, coloured paint and emissive
// windows keep their light. NodeMaterials consume this same descriptor/attribute
// through aoNode; onBeforeCompile is solely the retained WebGL implementation.
export function dressVoxelAOMaterial(material, { strength = VOXEL_AO.strength, refresh = false } = {}) {
  if (!material?.isMeshStandardMaterial || material.userData.voxelAO && (!refresh || dressedHooks.get(material) === material.onBeforeCompile)) return material;
  strength = Math.max(0, Math.min(.6, Number.isFinite(strength) ? strength : VOXEL_AO.strength));
  const before = material.onBeforeCompile.bind(material), key = material.customProgramCacheKey.bind(material);
  // A cloned/rotated batch can share this material while remaining outside the
  // static bake. Its absent attribute must read as unoccluded in legacy GL,
  // rather than inheriting an unrelated generic vertex-attribute value.
  material.defaultAttributeValues = { ...material.defaultAttributeValues, [VOXEL_AO.attribute]: [0, 0] };
  material.onBeforeCompile = (shader, renderer) => {
    before(shader, renderer);
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
      attribute vec2 voxelAO; varying float vVoxelAO;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
      float voxelAOFace = abs(normal.x) > .5 ? (normal.x > 0. ? 0. : 1.) : abs(normal.y) > .5 ? (normal.y > 0. ? 2. : 3.) : (normal.z > 0. ? 4. : 5.);
      vec2 voxelAOFacePoint = abs(normal.x) > .5 ? position.zy : abs(normal.y) > .5 ? position.xz : position.xy;
      float voxelAOCorner = (voxelAOFacePoint.x > 0. ? 1. : 0.) + (voxelAOFacePoint.y > 0. ? 2. : 0.);
      float voxelAOIndex = voxelAOFace * 4. + voxelAOCorner;
      float voxelAOWord = voxelAOIndex < 12. ? voxelAO.x : voxelAO.y;
      vVoxelAO = mod(floor(voxelAOWord / pow(4., mod(voxelAOIndex, 12.))), 4.) / 3.;`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vVoxelAO;")
      .replace("#include <aomap_fragment>", `#include <aomap_fragment>
      float voxelAOFactor = 1. - ${strength.toFixed(4)} * clamp(vVoxelAO, 0., 1.);
      reflectedLight.indirectDiffuse *= voxelAOFactor;
      reflectedLight.indirectSpecular *= voxelAOFactor;`);
  };
  material.customProgramCacheKey = () => `${key()}|voxel-neighbour-ao-v1:${strength}`;
  material.userData.voxelAO = { attribute: VOXEL_AO.attribute, strength, mode: "face-corner-indirect", bytesPerInstance: 8 };
  dressedHooks.set(material, material.onBeforeCompile);
  material.needsUpdate = true;
  return material;
}

export function attachVoxelAO(mesh, packed, options = {}) {
  if (packed.length !== mesh.count * 2) throw new RangeError("AO data must match the instance count");
  // BOX is shared throughout the game. Instance attributes must have an owned
  // geometry, never leak into a neighbour batch or dispose the shared cube.
  const geometry = mesh.geometry.clone();
  geometry.setAttribute(VOXEL_AO.attribute, new THREE.InstancedBufferAttribute(packed, 2));
  geometry.userData.voxelAOOwned = true;
  mesh.geometry = geometry;
  mesh.userData.voxelAO = { bytes: packed.byteLength, instances: mesh.count, attribute: VOXEL_AO.attribute };
  dressVoxelAOMaterial(mesh.material, options);
  return mesh;
}

function axisPermutation(matrix) {
  const a = matrix.elements, axes = [], used = new Set();
  if (a[0] > 0 && a[5] > 0 && a[10] > 0 && Math.max(Math.abs(a[1]), Math.abs(a[2]), Math.abs(a[4]), Math.abs(a[6]), Math.abs(a[8]), Math.abs(a[9])) < Math.min(a[0], a[5], a[10]) * 1e-6) return IDENTITY_AXES;
  for (let c = 0; c < 3; c++) {
    const col = [a[c * 4], a[c * 4 + 1], a[c * 4 + 2]], longest = Math.max(...col.map(Math.abs)), axis = col.findIndex(v => Math.abs(v) === longest);
    if (!(longest > 1e-9) || used.has(axis) || col.some((v, i) => i !== axis && Math.abs(v) > longest * 1e-6)) return null;
    used.add(axis); axes.push({ axis, sign: Math.sign(col[axis]) });
  }
  return axes;
}

// Call AFTER layout/spread matrix edits and AFTER finishVoxels' material hook.
// One index covers all chunks in this final static scope. Rebuilt furniture or
// rooms pass their own completed group; there is no per-frame or save mutation.
// Non-axis-aligned/animated/fading batches deliberately stay unbaked rather than
// casting wrong contact shadows from an enclosing AABB or an invisible crown.
export function installVoxelAmbientOcclusion(root, { radius = VOXEL_AO.radius, strength = VOXEL_AO.strength, eligible = () => true } = {}) {
  const started = clock(), rows = [], boxes = [], matrix = new THREE.Matrix4(), instance = new THREE.Matrix4();
  let skipped = 0;
  root.updateWorldMatrix(true, true);
  const visible = mesh => { for (let p = mesh; p; p = p.parent) if (!p.visible || p.userData.voxelAO === false || p.userData.voxelAOMovable) return false; return true; };
  root.traverse(mesh => {
    if (!isBatch(mesh) || mesh.geometry.getAttribute(VOXEL_AO.attribute) || !mesh.material?.isMeshStandardMaterial || mesh.material.transparent || mesh.material.alphaHash || !visible(mesh) || !eligible(mesh)) return;
    const row = { mesh, ids: [], axes: [] };
    for (let i = 0; i < mesh.count; i++) {
      // The native garden's IDs identify exactly the canopy/roof instances that
      // dissolve. They must not leave a permanent baked shadow when cleared.
      if (mesh.userData.neighbourhoodVisibilityIDs?.[i] > 0) { row.ids.push(-1); row.axes.push(null); skipped++; continue; }
      mesh.getMatrixAt(i, instance); matrix.multiplyMatrices(mesh.matrixWorld, instance);
      const axes = axisPermutation(matrix);
      if (!axes) { row.ids.push(-1); row.axes.push(null); skipped++; continue; }
      const a = matrix.elements;
      row.ids.push(boxes.length); row.axes.push(axes);
      boxes.push([a[12], a[13], a[14], Math.abs(a[0]) + Math.abs(a[4]) + Math.abs(a[8]), Math.abs(a[1]) + Math.abs(a[5]) + Math.abs(a[9]), Math.abs(a[2]) + Math.abs(a[6]) + Math.abs(a[10])]);
    }
    if (row.ids.some(id => id >= 0)) rows.push(row);
  });
  if (!boxes.length) return { mode: "face-corner-indirect", instances: 0, bytes: 0, meshes: 0, skipped, buildMs: clock() - started };
  const baked = bakeVoxelAmbientOcclusion(boxes, { radius });
  let bytes = 0;
  for (const row of rows) {
    const packed = new Float32Array(row.mesh.count * 2);
    for (let i = 0; i < row.ids.length; i++) {
      const id = row.ids[i]; if (id < 0) continue;
      const words = baked.packed.subarray(id * 2, id * 2 + 2);
      remapVoxelAO(words, row.axes[i], packed, i * 2);
    }
    attachVoxelAO(row.mesh, packed, { strength }); bytes += packed.byteLength;
  }
  const stats = { ...baked.stats, mode: "face-corner-indirect", meshes: rows.length, skipped, bytes, strength, totalBuildMs: clock() - started };
  root.userData.voxelAOStats = stats;
  return stats;
}
