// Faint lantern insects and a few moonlit ribbons under the tree and clock.
// World-space quads belong to the playable scene, with no light or post pass.
import * as THREE from "three";
import { FIXTURES, PLAN_SCALE as K } from "./content/village.js";
import { TOWN } from "./content/village-town-square.js";

export const VILLAGE_DUSK_LIGHTING = Object.freeze({ moon: .84, sky: .9 });
export const VILLAGE_LIGHT_AIR_BUDGET = Object.freeze({ shafts: 6, fireflies: 32, tvShafts: 3, tvFireflies: 16, drawCalls: 2, triangles: 76, lights: 0, textures: 0 });
const finite = p => Number.isFinite(p?.x) && Number.isFinite(p?.y) && Number.isFinite(p?.z);
const common = { transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false };

export function createVillageLightAir({ lamps = [] } = {}) {
  const B = VILLAGE_LIGHT_AIR_BUDGET, group = new THREE.Group(); group.name = "village-light-air";
  const time = { value: 0 }, haze = { value: .0072 }, tree = { value: 1 };
  const shaftGeometry = new THREE.PlaneGeometry(1, 1), flyGeometry = new THREE.PlaneGeometry(1, 1);
  const seeds = count => new THREE.InstancedBufferAttribute(Float32Array.from({ length: count }, (_, i) => (i * .61803398875 + .17) % 1), 1);
  shaftGeometry.setAttribute("airSeed", seeds(B.shafts));
  shaftGeometry.setAttribute("airTree", new THREE.InstancedBufferAttribute(new Float32Array([1, 0, 1, 0, 1, 1]), 1));
  flyGeometry.setAttribute("airSeed", seeds(B.fireflies));
  const shaftMaterial = new THREE.ShaderMaterial({ ...common, uniforms: { airTime: time, airHaze: haze, airTreeVisibility: tree },
    vertexShader: `attribute float airSeed, airTree; uniform float airTime, airHaze, airTreeVisibility;
      varying vec2 vAirUv; varying float vAirFade;
      void main() { vec3 centre = (modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
        vec3 right = normalize(vec3(viewMatrix[0][0], 0., viewMatrix[2][0]));
        vec2 size = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
        vec3 p = centre + right * position.x * size.x * (1. - position.y * .45) + vec3(.16, 1., .06) * position.y * size.y;
        vec4 mv = viewMatrix * vec4(p, 1.); float distance = length(mv.xyz);
        vAirFade = exp(-airHaze * airHaze * distance * distance) * smoothstep(3., 8., distance) * (1. - smoothstep(35., 62., distance));
        vAirFade *= mix(1., airTreeVisibility, airTree) * (.94 + .06 * sin(airTime * .19 + airSeed * 8.));
        vAirUv = uv; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vAirUv; varying float vAirFade;
      void main() { float edge = abs(vAirUv.x - .5) * 2.; float ribbon = 1. - smoothstep(.08, 1., edge);
        float end = smoothstep(0., .2, vAirUv.y) * (1. - smoothstep(.72, 1., vAirUv.y));
        float strength = ribbon * ribbon * end * vAirFade * .027;
        gl_FragColor = vec4(vec3(.59, .53, .40) * strength, 1.); }` });
  const flyMaterial = new THREE.ShaderMaterial({ ...common, uniforms: { airTime: time, airHaze: haze },
    vertexShader: `attribute float airSeed; uniform float airTime, airHaze;
      varying vec2 vAirUv; varying float vAirFade; varying vec3 vAirColour;
      void main() { vec3 centre = (modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
        float phase = airSeed * 24. + airTime * (.31 + airSeed * .12);
        centre += vec3(sin(phase) * .64, sin(phase * 1.37) * .33, cos(phase * .83) * .57);
        vec4 mv = viewMatrix * vec4(centre, 1.); float size = length(instanceMatrix[0].xyz); mv.xy += position.xy * size;
        float distance = length(mv.xyz); vAirFade = exp(-airHaze * airHaze * distance * distance) * smoothstep(1.5, 4., distance) * (1. - smoothstep(28., 52., distance));
        vAirFade *= .50 + .12 * sin(phase * 1.7); vAirColour = mix(vec3(1., .57, .18), vec3(1., .83, .44), airSeed);
        vAirUv = uv; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vAirUv; varying float vAirFade; varying vec3 vAirColour;
      void main() { vec2 p = (vAirUv - .5) * 2.; float radius = dot(p, p); if (radius > 1.) discard;
        float point = (1. - radius) * (1. - radius); gl_FragColor = vec4(vAirColour * point * vAirFade, 1.); }` });
  const shafts = new THREE.InstancedMesh(shaftGeometry, shaftMaterial, B.shafts), fireflies = new THREE.InstancedMesh(flyGeometry, flyMaterial, B.fireflies);
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Quaternion();
  const write = (mesh, i, x, y, z, width, height = width) => { matrix.compose(position.set(x, y, z), rotation, scale.set(width, height, 1)); mesh.setMatrixAt(i, matrix); };
  const tx = FIXTURES.tree.x, tz = -FIXTURES.tree.z, ax = TOWN.gate.x * K, az = -TOWN.gate.z * K;
  const ribbons = [[tx - 2.5, 4.7, tz + .6, 1.9, 6.2], [ax - 1.8, 5.7, az + .4, 1.4, 8.1], [tx + 2.1, 4.4, tz - 1.2, 1.5, 6.5], [ax + 1.7, 5.1, az - .5, 1.1, 7.1], [tx - .5, 5.2, tz - 3.1, 1.2, 6.8], [tx + 3.2, 4.7, tz + 1.6, 1.35, 5.8]];
  ribbons.forEach((p, i) => write(shafts, i, ...p));
  const sources = lamps.filter(finite), pairs = B.fireflies / 2;
  for (let i = 0; i < B.fireflies; i++) {
    // Interleave the lamp field so TV's first half still reaches the Square.
    const pair = Math.floor(i / 2), slot = (pair & 1) << 3 | (pair & 2) << 1 | (pair & 4) >> 1 | (pair & 8) >> 3;
    const lamp = sources[Math.floor(slot / pairs * sources.length)];
    if (lamp) write(fireflies, i, lamp.x + (i % 2 ? .42 : -.38), lamp.y - .7 + (i % 2) * .35, lamp.z + (i % 3 - 1) * .26, .065 + (i % 4) * .008);
    else write(fireflies, i, 0, -10000, 0, 0);
  }
  for (const mesh of [shafts, fireflies]) { mesh.castShadow = mesh.receiveShadow = false; mesh.renderOrder = 3; mesh.computeBoundingSphere(); mesh.boundingSphere.radius += 2; group.add(mesh); }
  let budget = null, disposed = false;
  function tick(dt = 0, { paused = false, reducedMotion = false, budget: requested = "full", density = .0072, treeVisibility = 1 } = {}) {
    if (disposed) return;
    if (!paused && !reducedMotion && Number.isFinite(dt) && dt > 0) time.value += Math.min(.1, dt);
    haze.value = Number.isFinite(density) ? Math.max(0, density) : .0072;
    tree.value = Number.isFinite(treeVisibility) ? Math.max(0, Math.min(1, treeVisibility)) : 1;
    const next = requested === "tv" ? "tv" : "full";
    if (budget !== next) { budget = next; shafts.count = next === "tv" ? B.tvShafts : B.shafts; fireflies.count = sources.length ? next === "tv" ? B.tvFireflies : B.fireflies : 0; }
  }
  tick(0);
  const stats = () => ({ budget, shafts: shafts.count, fireflies: fireflies.count, instances: shafts.count + fireflies.count, triangles: (shafts.count + fireflies.count) * 2, drawCalls: B.drawCalls, lights: 0, textures: 0, time: time.value, worldUnits: true, gpuMotion: true });
  return { group, tick, stats,
    dispose() { if (disposed) return; disposed = true; group.removeFromParent(); for (const mesh of [shafts, fireflies]) { mesh.dispose(); mesh.geometry.dispose(); mesh.material.dispose(); } group.clear(); },
  };
}
