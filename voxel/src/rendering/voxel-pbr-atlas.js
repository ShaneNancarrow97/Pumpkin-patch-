// The atlas is shared by the finished village, never by every box or material.
// WebGL owns its sampler lease; the WebGPU presentation materials borrow it.
import * as THREE from "three";
import { VOXEL_PBR, VOXEL_PBR_CLASSIFY_GLSL, buildVoxelPbrAtlasData, voxelPbrAtlasBytes } from "./voxel-pbr-data.js";
export { VOXEL_PBR, classifyVoxelSurface, voxelPbrFace, voxelPbrUv } from "./voxel-pbr-data.js";

let shared = null;
const installs = new WeakMap();

export function acquireVoxelPbrAtlas() {
  if (!shared) {
    const data = buildVoxelPbrAtlasData({ mipmaps: false });
    const textures = Object.fromEntries(Object.entries(data).map(([key, levels]) => {
      const texture = new THREE.DataTexture(levels[0].data, VOXEL_PBR.size, VOXEL_PBR.size, THREE.RGBAFormat, THREE.UnsignedByteType);
      texture.name = `village-pbr-${key}`;
      texture.colorSpace = key === "albedo" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
      // r169's WebGPU DataTexture path uploads only level0; a supplied manual
      // mip list suppresses generation without uploading the rest. Use native
      // mip generation on both backends. Power-of-two quadrant boundaries keep
      // every 2×2 reduction within its own surface until the neutralised far LOD.
      texture.generateMipmaps = true;
      texture.flipY = false; texture.needsUpdate = true;
      return [key, texture];
    }));
    shared = { ...textures, refs: 0, disposed: false, bytes: voxelPbrAtlasBytes() };
  }
  const resource = shared; resource.refs++;
  let released = false;
  return {
    ...resource, get references() { return resource.refs; },
    release() {
      if (released) return; released = true;
      if (--resource.refs !== 0) return;
      resource.disposed = true;
      for (const key of ["albedo", "normal", "orm"]) resource[key].dispose();
      if (shared === resource) shared = null;
    },
  };
}

const DECLARE_VERTEX = `
varying vec3 vPbrPosition;
varying vec3 vPbrNormal;
varying vec2 vPbrSurface;
uniform vec3 pbrBaseColour;
${VOXEL_PBR_CLASSIFY_GLSL}`;
const POSITION = `
{
  vec3 pbrP = position, pbrN = normal;
  vec3 pbrColour = pbrBaseColour;
  #ifdef USE_INSTANCING
    pbrP = (instanceMatrix * vec4(position, 1.)).xyz;
    pbrN = mat3(instanceMatrix) * normal;
  #endif
  #ifdef USE_INSTANCING_COLOR
    pbrColour *= instanceColor;
  #endif
  vPbrPosition = pbrP * max(length(modelMatrix[0].xyz), .0001);
  vPbrNormal = normalize(pbrN);
  vPbrSurface = pbrClassify(pbrColour);
}`;
const DECLARE_FRAGMENT = `
varying vec3 vPbrPosition;
varying vec3 vPbrNormal;
varying vec2 vPbrSurface;
uniform sampler2D pbrAlbedo;
uniform sampler2D pbrNormal;
uniform sampler2D pbrOrm;
vec2 pbrFace(vec3 p, vec3 n) {
  vec3 a = abs(n);
  return a.y > .5 ? p.xz : a.x > .5 ? p.zy : p.xy;
}
vec3 pbrTangentNormal(vec3 mapN, vec2 face, vec3 N, vec3 eye) {
  vec3 q0 = dFdx(eye), q1 = dFdy(eye);
  vec2 st0 = dFdx(face), st1 = dFdy(face);
  vec3 q1perp = cross(q1, N), q0perp = cross(N, q0);
  vec3 T = q1perp * st0.x + q0perp * st1.x;
  vec3 B = q1perp * st0.y + q0perp * st1.y;
  float det = max(dot(T, T), dot(B, B));
  float scale = det > .00000001 ? inversesqrt(det) : 0.;
  #ifdef DOUBLE_SIDED
    scale *= gl_FrontFacing ? 1. : -1.;
  #endif
  return normalize(T * (mapN.x * scale) + B * (mapN.y * scale) + N * mapN.z);
}`;
const SAMPLE = `
  vec2 pbrUnwrapped = pbrFace(vPbrPosition, vPbrNormal) * ${VOXEL_PBR.repeat.toFixed(3)};
  vec2 pbrOffset = vec2(mod(vPbrSurface.x, 2.), floor(vPbrSurface.x / 2.)) * .5;
  vec2 pbrUV = pbrOffset + vec2(${(VOXEL_PBR.gutter / VOXEL_PBR.size).toFixed(7)}) + fract(pbrUnwrapped) * ${(VOXEL_PBR.body / VOXEL_PBR.size).toFixed(7)};
  vec2 pbrDx = dFdx(pbrUnwrapped) * ${(VOXEL_PBR.body / VOXEL_PBR.size).toFixed(7)}, pbrDy = dFdy(pbrUnwrapped) * ${(VOXEL_PBR.body / VOXEL_PBR.size).toFixed(7)};
  // Fade before one texel spans a whole micro-surface; the final 1px mip is neutral.
  float pbrPixel = max(length(dFdx(pbrUnwrapped)), length(dFdy(pbrUnwrapped)));
  float pbrWeight = vPbrSurface.y * (1. - smoothstep(.15, .5, pbrPixel));
  vec3 pbrORM = texture2DGradEXT(pbrOrm, pbrUV, pbrDx, pbrDy).rgb;
`;

export function getVoxelPbrDescriptor(material) { return material?.userData?.voxelPbr ?? null; }

// Install after finishVoxels. Existing finish, AO and visibility hooks continue
// to run, including their program cache identity. No global ShaderChunk changes.
export function applyVoxelPbrAtlas(material, lease) {
  if (!material?.isMeshStandardMaterial || !material.userData?.voxelFinish || getVoxelPbrDescriptor(material)) return false;
  const descriptor = Object.freeze({ ...VOXEL_PBR, albedo: lease.albedo, normal: lease.normal, orm: lease.orm, bytes: lease.bytes, owned: false });
  // Textures must not be serialized into material.userData by clone/toJSON.
  Object.defineProperty(material.userData, "voxelPbr", { value: descriptor, configurable: true, enumerable: false });
  const before = material.onBeforeCompile, key = material.customProgramCacheKey;
  material.onBeforeCompile = function(shader, renderer) {
    before.call(this, shader, renderer);
    shader.uniforms.pbrAlbedo = { value: descriptor.albedo };
    shader.uniforms.pbrNormal = { value: descriptor.normal };
    shader.uniforms.pbrOrm = { value: descriptor.orm };
    shader.uniforms.pbrBaseColour = { value: material.color };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>\n${DECLARE_VERTEX}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${POSITION}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\n${DECLARE_FRAGMENT}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${SAMPLE}\n diffuseColor.rgb *= mix(vec3(1.), texture2DGradEXT(pbrAlbedo, pbrUV, pbrDx, pbrDy).rgb, pbrWeight * ${VOXEL_PBR.strength.toFixed(3)});`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, pbrORM.g, pbrWeight * .65);`)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>\n metalnessFactor = mix(metalnessFactor, pbrORM.b, pbrWeight * .55);`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\n vec3 pbrMapN = texture2DGradEXT(pbrNormal, pbrUV, pbrDx, pbrDy).xyz * 2. - 1.;\n pbrMapN.xy *= ${VOXEL_PBR.normalStrength.toFixed(3)} * pbrWeight;\n normal = pbrTangentNormal(pbrMapN, pbrUnwrapped, normal, -vViewPosition);`)
      .replace("#include <aomap_fragment>", "#include <aomap_fragment>\n reflectedLight.indirectDiffuse *= mix(1., pbrORM.r, pbrWeight);");
  };
  material.customProgramCacheKey = function() { return `${key.call(this)}|village-pbr-atlas-1`; };
  material.needsUpdate = true;
  return true;
}

export function installVillagePbr(root) {
  if (!root) return null;
  if (installs.has(root)) { const api = installs.get(root); api.refresh(); return api; }
  let disposed = false, lease = null, materialCount = 0;
  const seen = new WeakSet();
  const refresh = (subtree = root) => {
    if (disposed) return;
    const materials = new Set();
    subtree.traverse(mesh => {
      if (!mesh.isInstancedMesh || mesh.geometry?.type !== "BoxGeometry") return;
      for (const material of [].concat(mesh.material)) if (material?.isMeshStandardMaterial && material.userData?.voxelFinish) materials.add(material);
    });
    const undressed = [...materials].filter(m => !getVoxelPbrDescriptor(m));
    if (undressed.length) lease ??= acquireVoxelPbrAtlas();
    for (const material of undressed) applyVoxelPbrAtlas(material, lease);
    for (const material of materials) if (!seen.has(material)) { seen.add(material); materialCount++; }
  };
  const api = {
    get stats() { return { textures: lease ? 3 : 0, size: VOXEL_PBR.size, surfaces: 4, bytes: lease?.bytes ?? 0, materialsSeen: materialCount, additionalDraws: 0 }; },
    refresh,
    dispose() { if (disposed) return; disposed = true; installs.delete(root); lease?.release(); },
  };
  const previous = root.userData.dispose;
  root.userData.dispose = () => { api.dispose(); previous?.(); };
  installs.set(root, api);
  refresh();
  return api;
}
