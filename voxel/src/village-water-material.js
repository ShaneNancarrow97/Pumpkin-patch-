// Water keeps the village's existing Phong lights and silhouettes. Two small
// world-space waves turn their reflections without moving a shoreline or mesh.
import * as THREE from "three";

export const VILLAGE_WATER = Object.freeze({
  broadFrequency: 2.1, fineFrequency: 3.7, broadSpeed: .72, fineSpeed: 1.06,
  broadSlope: .065, fineSlope: .033, sheen: Object.freeze([.028, .032, .031]),
});

// A view owns one clock for all its water. Freezing it preserves the current
// ripple pattern, so changing Reduced motion never jumps to a different surface.
export function createVillageWaterClock() {
  const uniform = { value: 0 };
  return { uniform, tick(dt = 0, { reducedMotion = false } = {}) {
    if (!reducedMotion && Number.isFinite(dt) && dt > 0) uniform.value += Math.min(.25, dt);
  } };
}

const WAVES = `
  varying vec3 vVillageWaterWorld;
  uniform float villageWaterTime;
  vec3 villageWaterNormal(vec2 world) {
    vec2 broadAxis = vec2(.8603, .5098), fineAxis = vec2(-.5704, .8214);
    float broadPhase = dot(world, broadAxis) * ${VILLAGE_WATER.broadFrequency} + villageWaterTime * ${VILLAGE_WATER.broadSpeed};
    float finePhase = dot(world, fineAxis) * ${VILLAGE_WATER.fineFrequency} - villageWaterTime * ${VILLAGE_WATER.fineSpeed};
    // Far ripples soften before they become smaller than a pixel.
    float broadDetail = 1. - smoothstep(.3, 1.3, fwidth(broadPhase));
    float fineDetail = 1. - smoothstep(.3, 1.3, fwidth(finePhase));
    vec2 slope = broadAxis * cos(broadPhase) * ${VILLAGE_WATER.broadSlope} * broadDetail
      + fineAxis * cos(finePhase) * ${VILLAGE_WATER.fineSlope} * fineDetail;
    return normalize(vec3(-slope.x, 1., -slope.y));
  }`;

export function createVillageWaterMaterial({ clock = createVillageWaterClock(), ...phongOptions } = {}) {
  const material = new THREE.MeshPhongMaterial({ color: 0x2f6f9c, emissive: 0x0b2236, specular: 0x596576, shininess: 100, transparent: true, opacity: .92, ...phongOptions });
  const before = material.onBeforeCompile.bind(material), key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before(shader, renderer);
    shader.uniforms.villageWaterTime = clock.uniform;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vVillageWaterWorld;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvVillageWaterWorld = (modelMatrix * vec4(transformed, 1.)).xyz;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\n${WAVES}`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        normal = normalize(mat3(viewMatrix) * villageWaterNormal(vVillageWaterWorld.xz));
        #ifdef DOUBLE_SIDED
          normal *= faceDirection;
        #endif`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float villageWaterGrazing = 1. - clamp(dot(normal, normalize(vViewPosition)), 0., 1.);
        totalEmissiveRadiance += vec3(${VILLAGE_WATER.sheen.join(", ")}) * pow(villageWaterGrazing, 3.);`);
  };
  material.customProgramCacheKey = () => `${key}|village-water-world-ripples-v1`;
  material.userData.waterClock = clock;
  material.userData.villageWater = { worldUnits: true, octaves: 2, textures: 0 };
  return material;
}
