import * as THREE from 'three';

// Every ground material shares one small repeat tile; the old map's alpha holds coverage.
const fallback = new THREE.DataTexture(new Uint8Array([48,67,42,255]),1,1);
fallback.colorSpace=THREE.SRGBColorSpace;fallback.needsUpdate=true;
const tileUniform={value:fallback},strengthUniform={value:0};
let requested=null;
export function installGrassDetailTexture(url){
  if(!url||requested)return requested;
  requested=new THREE.TextureLoader().load(url,texture=>{
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
    texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true;
    tileUniform.value=texture;strengthUniform.value=.67;fallback.dispose();
  },undefined,()=>{strengthUniform.value=0;});
  return requested;
}

// Opaque colour maps carry a grass mask in alpha. Restore opacity before any output pass.
export function applyGrassDetail(material,{worldUnits=2.2}={}){
  const previous=material.onBeforeCompile.bind(material),oldKey=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
    previous(shader,renderer);
    shader.uniforms.grassDetailMap=tileUniform;
    shader.uniforms.grassDetailStrength=strengthUniform;
    shader.uniforms.grassDetailScale={value:worldUnits};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      varying vec2 vGrassDetailUv;
      varying float vGrassDetailUp;
      uniform float grassDetailScale;`)
      .replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vGrassDetailUv=(modelMatrix*vec4(transformed,1.0)).xz/grassDetailScale;
      vGrassDetailUp=normal.y;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec2 vGrassDetailUv;
      varying float vGrassDetailUp;
      uniform sampler2D grassDetailMap;
      uniform float grassDetailStrength;`)
      .replace('#include <map_fragment>',`#include <map_fragment>
      #ifdef USE_MAP
        float grassCoverage=sampledDiffuseColor.a*step(0.75,vGrassDetailUp);
        diffuseColor.a=opacity;
        if(grassCoverage>0.001&&grassDetailStrength>0.0){
          vec3 grassPaint=texture2D(grassDetailMap,vGrassDetailUv).rgb;
          diffuseColor.rgb=mix(diffuseColor.rgb,grassPaint,grassCoverage*grassDetailStrength);
        }
      #endif`);
  };
  material.customProgramCacheKey=()=>oldKey()+'|grass-detail-v2';
  material.userData.grassDetail={worldUnits,coverage:'base-map-alpha',sharedTexture:true};
  return material;
}
