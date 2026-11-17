// A finish for the village's voxels. Its models are built from boxes far bigger than the painted cast's detail,
// so a wall or a roof read as one flat slab. This shades every face as if it were laid from small blocks, a
// little under a hand's width each: each block its own tone, a hairline between them, some standing a little proud
// with lit lips and some sunk in shade, and weathering in broad patches. Side faces darken towards the foot of their own box, as if it stood in shade.
// Glowing faces (windows, lamp glass) become leaded panes, hot in the middle and amber at the frame.
//
// It is all in the fragment shader, in the mesh's own space, so it costs no boxes, follows a turning model
// (the wheel, the carousel) and lines up with the design grid. It fades out where a block would be smaller
// than a couple of pixels, and leaves alone any face too small to hold two blocks.
import * as THREE from "three";
import { dressVoxelAOMaterial } from "./rendering/voxel-ao-material.js";

export const VOXEL_FINISH = Object.freeze({
  pitch: .1875,   // one block, in world units: an eighth of the design grid, twelve to an owner's height
  tone: .085,     // how far one block's tone strays from the next
  patch: .105,    // weathering in broad patches
  joint: .05,     // how dark the hairline between blocks is
  relief: .105,   // the lit and shaded lips of blocks that sit proud of their neighbours, or sunk among them
  grain: .055,    // fine neutral-stone flecks, filtered away before they alias
  foot: .16,      // how much a wall darkens at the foot of its box
  pane: .5,       // the lead between panes of a glowing face
  frame: .42,     // how much a glowing face dims towards its frame
});

const pitch = { value: VOXEL_FINISH.pitch };
// A lamp close to a wall would bleach it, so within `near` world units a finished face takes a lamp's light as
// if it stood that far off. Outdoors the village sets it to a few units; halls leave it at nought.
const near = { value: 0 };
const FALLOFF = "float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );";
const SOFT_LIGHTS = "uniform float finNear;\n" + THREE.ShaderChunk.lights_pars_begin.replace(FALLOFF, "float distanceFalloff = 1.0 / max( pow( max( lightDistance, finNear ), decayExponent ), 0.01 );");
export const softLightsReady = THREE.ShaderChunk.lights_pars_begin.includes(FALLOFF);
export function setLampNear(units) { near.value = Math.max(0, units); }
const VARYINGS = "varying vec3 vFinO; varying vec3 vFinN; varying vec3 vFinL; varying vec3 vFinS; varying float vFinK;";
// Where a fragment is in its mesh, which way its face looks, where it is in its own box and how big that box is.
const VERTEX = `
  { vec3 finP = position, finN = normal, finS = vec3(1.0);
  #ifdef USE_INSTANCING
    finP = (instanceMatrix * vec4(position, 1.0)).xyz; finN = mat3(instanceMatrix) * normal;
    finS = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  #endif
    vFinK = finPitch / max(length(modelMatrix[0].xyz), .0001);
    vFinO = finP; vFinN = normalize(finN); vFinL = position; vFinS = finS; }`;
const SHARED = `
  float finHash(vec3 p) { p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
  float finLevel(vec3 c) { float h = finHash(c + 3.7); return h > .8 ? 1. : h < .16 ? -1. : 0.; }
  float finNoise(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(mix(finHash(i), finHash(i + vec3(1, 0, 0)), f.x), mix(finHash(i + vec3(0, 1, 0)), finHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(finHash(i + vec3(0, 0, 1)), finHash(i + vec3(1, 0, 1)), f.x), mix(finHash(i + vec3(0, 1, 1)), finHash(i + vec3(1, 1, 1)), f.x), f.y), f.z); }`;
// The block a fragment falls in, where it is on that block's face, and how much of the detail to show.
const MEASURE = `
    vec3 finN = vFinN, finA = abs(finN), finQ = vFinO / vFinK, finSize = vFinS / vFinK;
    vec3 finCell = floor(finQ - finN * .5), finEdge = (.5 - abs(vFinL)) * finSize;
    vec2 finF, finFace; float finUp = 0., finRim;
    if (finA.y > .5) { finF = fract(finQ.xz); finFace = finSize.xz; finRim = min(finEdge.x, finEdge.z); finUp = 1.; }
    else if (finA.x > .5) { finF = fract(finQ.zy); finFace = finSize.zy; finRim = min(finEdge.z, finEdge.y); }
    else { finF = fract(finQ.xy); finFace = finSize.xy; finRim = min(finEdge.x, finEdge.y); }
    float finPx = max(fwidth(finQ.x), max(fwidth(finQ.y), fwidth(finQ.z)));
    float finRoom = smoothstep(1.2, 2.4, min(finFace.x, finFace.y)), finFine = (1. - smoothstep(.2, .55, finPx)) * finRoom;
    float finH = finHash(finCell);
    vec2 finD = min(finF, 1. - finF); float finJoint = 1. - smoothstep(0., .045 + finPx, min(finD.x, finD.y));`;
// A block in three stands proud of the face or sits sunk in it; the light from above and the left picks out the
// lips of the proud ones and shades the sunk ones under their neighbours.
const LIT = `
  {${MEASURE}
    vec3 finU = finA.y > .5 || finA.z > .5 ? vec3(1., 0., 0.) : vec3(0., 0., 1.), finV = finA.y > .5 ? vec3(0., 0., 1.) : vec3(0., 1., 0.);
    float finHere = finLevel(finCell), finAbove = finLevel(finCell + finV), finBelow = finLevel(finCell - finV), finLeft = finLevel(finCell - finU), finRight = finLevel(finCell + finU);
    float finBand = .16 + finPx;
    float finTop = smoothstep(1. - finBand, 1., finF.y), finBottom = 1. - smoothstep(0., finBand, finF.y), finL = 1. - smoothstep(0., finBand, finF.x), finR = smoothstep(1. - finBand, 1., finF.x);
    float finShape = finTop * (finHere > finAbove ? 1. : finHere < finAbove ? -1.5 : 0.) - finBottom * (finHere > finBelow ? .7 : 0.)
      + finL * (finHere > finLeft ? .6 : finHere < finLeft ? -.5 : 0.) - finR * (finHere > finRight ? .5 : finHere < finRight ? .6 : 0.);
    float finWear = finNoise(finQ * .19) - .5 + sin(finQ.x * .21 + 1.3) * sin(finQ.y * .17 + .7) * sin(finQ.z * .19 + 2.1) * .4;
    float finTone = 1. + ((finH - .5) * ${VOXEL_FINISH.tone.toFixed(3)} - finJoint * ${VOXEL_FINISH.joint.toFixed(3)} * (.82 + finH * .36) + finShape * ${VOXEL_FINISH.relief.toFixed(3)} + finHere * .035) * finFine
      + finWear * ${VOXEL_FINISH.patch.toFixed(3)} * (1. - smoothstep(1., 3., finPx)) * finRoom;
    finTone *= 1. - (1. - finUp) * ${VOXEL_FINISH.foot.toFixed(3)} * (1. - smoothstep(0., 3.2, (vFinL.y + .5) * finSize.y)) * finRoom;
    float finHue = (finHash(finCell + 17.3) - .5) * .06 * finFine;
    float finBright = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
    float finNeutral = 1. - smoothstep(.12, .5, (finBright - min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b))) / max(.08, finBright));
    float finGrainShow = (1. - smoothstep(.14, .5, finPx * 4.)) * finRoom * finNeutral;
    if (finGrainShow > .001) finTone *= 1. + (finHash(floor(finQ * 4.) + 11.7) - .5) * ${VOXEL_FINISH.grain.toFixed(3)} * finGrainShow;
    diffuseColor.rgb *= finTone * vec3(1. + finHue, 1., 1. - finHue); }`;
// A band of glass too narrow for two panes still takes its leads if it is long (a striped window's courses).
const GLOWING = `
  {${MEASURE}
    float finLong = smoothstep(.45, .9, min(finFace.x, finFace.y)) * smoothstep(1.6, 3., max(finFace.x, finFace.y));
    float finGlass = max(finRoom, finLong), finShow = (1. - smoothstep(.2, .55, finPx)) * finGlass;
    float finLead = 1. - finJoint * ${VOXEL_FINISH.pane.toFixed(3)} * finShow;
    float finDeep = 1. - ${VOXEL_FINISH.frame.toFixed(3)} * (1. - smoothstep(0., 1.7, finRim)) * finRoom;
    diffuseColor.rgb *= mix(1., finLead * finDeep * (1. + (finH - .5) * .2 * finShow), finGlass); }`;

function patch(material, body, key) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.finPitch = pitch; shader.uniforms.finNear = near;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>\n${VARYINGS}\nuniform float finPitch;`).replace("#include <begin_vertex>", `#include <begin_vertex>\n${VERTEX}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\n${VARYINGS}\n${SHARED}`).replace("#include <color_fragment>", `#include <color_fragment>\n${body}`).replace("#include <lights_pars_begin>", SOFT_LIGHTS);
  };
  material.customProgramCacheKey = () => key;
  material.userData.voxelFinish = true; material.needsUpdate = true;
  if (material.userData.voxelAO) dressVoxelAOMaterial(material, { ...material.userData.voxelAO, refresh: true });
}

// Whether a mesh is one of `Voxels`' batches: unit boxes placed by their instance matrices.
export function isVoxelBatch(mesh) {
  const p = mesh?.geometry?.parameters;
  return !!mesh?.isInstancedMesh && mesh.geometry.type === "BoxGeometry" && p.width === 1 && p.height === 1 && p.depth === 1;
}

// Give every voxel batch under `root` the finish (once each). Returns how many materials it dressed.
export function finishVoxels(root) {
  let count = 0; const seen = new Set();
  root.traverse((mesh) => {
    if (!isVoxelBatch(mesh)) return;
    const material = mesh.material; if (!material || material.userData.voxelFinish || seen.has(material)) return; seen.add(material);
    if (material.isMeshStandardMaterial) patch(material, LIT, "voxel-finish-lit-fidelity-1");
    else if (material.isMeshBasicMaterial && !material.transparent) patch(material, GLOWING, "voxel-finish-glow");
    else return;
    count++;
  });
  return count;
}
