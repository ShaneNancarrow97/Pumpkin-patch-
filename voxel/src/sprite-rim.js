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
