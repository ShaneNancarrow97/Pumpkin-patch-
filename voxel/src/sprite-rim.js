import * as THREE from 'three';

// A warm inner rim follows the painted alpha, without another mesh or light.
export function addSpriteRim(material, width, height) {
  const previous = material.onBeforeCompile.bind(material), key = material.customProgramCacheKey.bind(material);
  const texel = new THREE.Vector2(1.35 / Math.max(1, width), 1.35 / Math.max(1, height));
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    shader.uniforms.villageRimTexel = { value: texel };
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec2 villageRimTexel;')
      .replace('#include <lights_physical_fragment>', `
        #ifdef USE_MAP
          float rimNeighbour = min(min(texture2D(map,vMapUv+vec2(villageRimTexel.x,0.),-.85).a,
            texture2D(map,vMapUv-vec2(villageRimTexel.x,0.),-.85).a),
            min(texture2D(map,vMapUv+vec2(0.,villageRimTexel.y),-.85).a,
            texture2D(map,vMapUv-vec2(0.,villageRimTexel.y),-.85).a));
          float paintedRim = smoothstep(.05,.7,1.-rimNeighbour);
          totalEmissiveRadiance += vec3(.26,.18,.105)*paintedRim;
        #endif
        #include <lights_physical_fragment>`);
  };
  material.customProgramCacheKey = () => key() + '|village-soft-rim-v1';
  material.userData.villageRim = { texel: texel.toArray(), extraMeshes: 0, extraLights: 0 };
  return material;
}

// A rim of moonlight on a painted figure. The cast are flat cut-outs, so in a dark scene a dark-haired figure
// seen from behind melts into the night. This lights the edge of the art that faces the sky (and, more faintly,
// its sides), as the moon would catch a head and shoulders, and can lift how much of its own colour the art
// shows. It reads the art's own transparency: four more texture reads a figure, no extra pictures or lights.
export const MOON_RIM = Object.freeze({ colour: 0xb9c6ff, strength: .62, width: 3 });

// Patch every lit material under `actor` (once each). lift multiplies how much of its own art each already shows.
export function addMoonRim(actor, { colour = MOON_RIM.colour, strength = MOON_RIM.strength, width = MOON_RIM.width, lift = 1 } = {}) {
  const tint = new THREE.Color(colour); let count = 0;
  actor?.traverse?.((mesh) => {
    const material = mesh.material;
    if (!material?.isMeshStandardMaterial || !material.map) return;
    if (material.userData.moonRim) return;
    material.emissiveIntensity *= lift;
    material.userData.moonRim = { colour: { value: tint }, strength: { value: strength }, width: { value: width } };
    const before = material.onBeforeCompile, key = material.customProgramCacheKey?.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      before?.call(material, shader, renderer);
      const u = material.userData.moonRim; shader.uniforms.rimColour = u.colour; shader.uniforms.rimStrength = u.strength; shader.uniforms.rimWidth = u.width;
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 rimColour; uniform float rimStrength, rimWidth;")
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        #ifdef USE_MAP
        { vec2 rimStep = rimWidth / vec2(textureSize(map, 0));
          float rimUp = 1. - texture2D(map, vMapUv + vec2(0., rimStep.y)).a, rimSide = 2. - texture2D(map, vMapUv + vec2(rimStep.x, 0.)).a - texture2D(map, vMapUv - vec2(rimStep.x, 0.)).a;
          float rimHigh = 1. - texture2D(map, vMapUv + vec2(0., rimStep.y * 2.2)).a;
          totalEmissiveRadiance += rimColour * rimStrength * clamp(rimUp * .7 + rimHigh * .45 + rimSide * .3, 0., 1.); }
        #endif`);
    };
    material.customProgramCacheKey = () => (key?.() ?? "") + "|moon-rim-v1"; material.needsUpdate = true; count++;
  });
  return count;
}
