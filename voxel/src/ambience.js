import * as THREE from "three";
import { seeded } from "./voxels.js";
import { MIST, mistBank, MAX_CLEARINGS } from "./content/ambience.js";

// The overworld's ambience, each part switchable in Settings:
//   mist: a thin bank that drifts across the farm, clears and returns (content/ambience.js)
//   lake: the backdrop's lake ripples, its village lamps flicker, reflections
//     glint and stars twinkle. world.js buildBackdrop marks which texels do what.
// Both are shader work on a handful of uniforms: nothing is rebuilt per frame,
// and switched off they draw exactly as before (the mist not at all).
export function createAmbience(scene, backdrop) {
  const time = { value: 0 }, lake = { value: 1 };
  let ahead = 0;
  hookBackdrop(backdrop, time, lake);
  const mist = mistLayers(time);
  for (const m of mist.meshes) scene.add(m);
  return {
    tick(t) { t += ahead; time.value = t % 3600; mist.tick(t); },
    // Jumps the clock on, for checking the mist without waiting for it.
    skip(seconds) { ahead += seconds; },
    set({ mist: mistOn = true, lake: lakeOn = true } = {}) {
      for (const m of mist.meshes) m.visible = mistOn;
      lake.value = lakeOn ? 1 : 0;
    },
    // Where the mist thins and clears (content/ambience.js mistClearings), when the farm's layout changes.
    setClearings(c) { mist.clear(c); },
  };
}

// The backdrop's map, sampled with the lake's rows shifted by whole texels (so
// it stays pixel art), then lamps, glints and stars brightened and dimmed.
function hookBackdrop(plane, time, on) {
  const { marks, size, lake } = plane.userData, material = plane.material;
  if (!marks) return;
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime: time, uLakeOn: on, uMarks: { value: marks }, uSize: { value: new THREE.Vector2(...size) }, uLake: { value: new THREE.Vector2(...lake) } });
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
uniform float uTime, uLakeOn; uniform sampler2D uMarks; uniform vec2 uSize, uLake;
float ambHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`)
      .replace("#include <map_fragment>", `#ifdef USE_MAP
  vec2 auv = vMapUv;
  float row = floor((1.0 - auv.y) * uSize.y);
  if (uLakeOn > 0.5 && row > uLake.x && row < uLake.y - 1.0) {
    // Nearer rows (lower down) ripple further and a little faster.
    float near = (row - uLake.x) / (uLake.y - uLake.x);
    float wave = sin(row * 1.7 + uTime * (0.9 + near * 0.7)) + 0.6 * sin(row * 0.53 - uTime * 0.5);
    auv.x += floor(wave * (0.5 + near * 1.6) + 0.5) / uSize.x;
  }
  vec4 sampledDiffuseColor = texture2D(map, auv);
  float mark = texture2D(uMarks, auv).r;
  if (uLakeOn > 0.5 && mark > 0.1) {
    vec2 cell = floor(auv * uSize);
    float h = ambHash(cell), k;
    if (mark > 0.8) k = 0.8 + 0.2 * (0.5 + 0.5 * sin(uTime * (1.5 + h * 2.5) + h * 40.0)) * (0.75 + 0.25 * sin(uTime * 6.1 + h * 13.0));
    else if (mark > 0.5) k = 0.7 + 0.3 * (0.5 + 0.5 * sin(uTime * 1.8 + h * 30.0 + row * 0.6));
    else k = h < 0.4 ? 0.3 + 0.7 * smoothstep(-0.3, 1.0, sin(uTime * (0.5 + h * 2.0) + h * 50.0)) : 0.85 + 0.15 * sin(uTime * 1.2 + h * 20.0);
    sampledDiffuseColor.rgb *= k;
  }
  diffuseColor *= sampledDiffuseColor;
#endif`);
  };
  material.customProgramCacheKey = () => "backdrop-ambience";
  material.needsUpdate = true;
}

// A small tiling noise, two octaves of smoothed lattice values, for the mist.
function noiseTexture(n = 128) {
  const r = seeded(4417), data = new Uint8Array(n * n * 4);
  const octave = (cells) => { const v = Array.from({ length: cells * cells }, r); return (x, y) => {
    const fx = (x / n) * cells, fy = (y / n) * cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const at = (i, j) => v[((j % cells) + cells) % cells * cells + ((i % cells) + cells) % cells], s = (t) => t * t * (3 - 2 * t);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * s(tx), b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * s(tx);
    return a + (b - a) * s(ty);
  }; };
  const big = octave(8), small = octave(16);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const o = (y * n + x) * 4, v = Math.round((big(x, y) * 0.65 + small(x, y) * 0.35) * 255); data[o] = data[o + 1] = data[o + 2] = v; data[o + 3] = 255; }
  const t = new THREE.DataTexture(data, n, n);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

// Two thin sheets of mist low over the ground, the upper one fainter, each
// drifting its own way through the noise inside the moving bank.
function mistLayers(time) {
  const noise = noiseTexture(), bank = { centre: { value: 0 }, half: { value: MIST.halfWidth }, strength: { value: 0 } };
  const clearing = {
    uPatch: { value: new THREE.Vector4(0, 0, 0, 1) }, uPatchR: { value: new THREE.Vector2(1, 1) },
    uSpots: { value: Array.from({ length: MAX_CLEARINGS }, () => new THREE.Vector4(0, 0, 1, 1)) }, uSpotKeep: { value: new Array(MAX_CLEARINGS).fill(1) }, uSpotCount: { value: 0 },
  };
  const sheet = (y, alpha, scale, drift) => {
    const material = new THREE.MeshBasicMaterial({ color: MIST.colour, transparent: true, opacity: alpha, depthWrite: false, fog: false, toneMapped: false });
    material.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, clearing, { uTime: time, uNoise: { value: noise }, uCentre: bank.centre, uHalf: bank.half, uStrength: bank.strength, uScale: { value: scale }, uDrift: { value: new THREE.Vector2(...drift) } });
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vMist;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvMist = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vMist; uniform float uTime, uCentre, uHalf, uStrength, uScale; uniform sampler2D uNoise; uniform vec2 uDrift;
uniform vec4 uPatch; uniform vec2 uPatchR; uniform vec4 uSpots[${MAX_CLEARINGS}]; uniform float uSpotKeep[${MAX_CLEARINGS}]; uniform int uSpotCount;`)
        .replace("#include <alphatest_fragment>", `{
  float d = abs(vMist.x - uCentre) / uHalf, cover = d >= 1.0 ? 0.0 : uStrength * pow(1.0 - d * d, 2.0);
  vec2 p = vMist.xz * uScale;
  float n = texture2D(uNoise, p + uDrift * uTime).r * 0.65 + texture2D(uNoise, p * 2.3 - uDrift.yx * uTime * 1.4).r * 0.35;
  // Thinner over the pumpkins, gone round the buildings (content/ambience.js mistLeft does the same sum).
  vec2 q = vec2((vMist.x - uPatch.x) / uPatchR.x, (vMist.z - clamp(vMist.z, uPatch.y, uPatch.z)) / uPatchR.y);
  float left = mix(uPatch.w, 1.0, smoothstep(0.75, 1.25, dot(q, q)));
  for (int i = 0; i < ${MAX_CLEARINGS}; i++) {
    if (i >= uSpotCount) break;
    vec4 s = uSpots[i];
    left *= mix(uSpotKeep[i], 1.0, smoothstep(0.85, 1.7, length((vMist.xz - s.xy) / s.zw)));
  }
  diffuseColor.a *= cover * left * smoothstep(0.3, 0.8, n);
}
#include <alphatest_fragment>`);
    };
    material.customProgramCacheKey = () => "overworld-mist";
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(200, 42), material);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(25, y, 19.5);
    mesh.renderOrder = 2; mesh.name = "Overworld mist";
    mesh.raycast = () => {};                                                       // never in the way of a tap
    return mesh;
  };
  const meshes = [sheet(0.35, MIST.peak, 0.03, [0.011, 0.004]), sheet(1.0, MIST.peak * 0.55, 0.022, [0.008, -0.003])];
  return {
    meshes,
    tick(t) { const b = mistBank(t); bank.centre.value = b.centre; bank.strength.value = b.strength; },
    clear({ patch, spots }) {
      clearing.uPatch.value.set(patch.x, patch.back, patch.front, patch.keep); clearing.uPatchR.value.set(patch.rx, patch.rz);
      spots.forEach((s, i) => { clearing.uSpots.value[i].set(s.x, s.z, s.rx, s.rz); clearing.uSpotKeep.value[i] = s.keep; });
      clearing.uSpotCount.value = spots.length;
    },
  };
}
