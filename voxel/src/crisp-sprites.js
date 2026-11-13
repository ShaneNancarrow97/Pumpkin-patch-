import * as THREE from "three";

// Painted sprite art is drawn several times smaller than it was made, and the
// GPU's usual mip choice then blurs it. Sampling a level finer keeps the art
// crisp without the shimmer of switching mipmaps off.
const BIAS = "-0.85";
const map = THREE.ShaderChunk.map_fragment.replace("texture2D( map, vMapUv )", `texture2D( map, vMapUv, ${BIAS} )`);
const emissive = THREE.ShaderChunk.emissivemap_fragment.replace("texture2D( emissiveMap, vEmissiveMapUv )", `texture2D( emissiveMap, vEmissiveMapUv, ${BIAS} )`);
export function crispen(material) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", map).replace("#include <emissivemap_fragment>", emissive);
  };
  material.customProgramCacheKey = () => "crisp-sprite";
  return material;
}
export const crispTexture = (texture) => { texture.anisotropy = 4; return texture; };
