// Soft light round every lamp in the village: a halo about its head, and a warm pool on the ground beneath the
// far ones. Only the eight lamps nearest the view cast real light, so without these the rest are bright boxes
// in the dark; with them the whole village glows into the distance. Two instanced draws, additive, no lights.
import * as THREE from "three";

export const LAMP_GLOW = Object.freeze({ halo: 2.6, haloStrength: .2, pool: 7.5, poolStrength: .18, near: 12, far: 26 });

const quad = new THREE.PlaneGeometry(1, 1);
const common = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false };

// lamps: [{ head: Vector3, ground: Vector3, colour?: hex, scale?: number }] in world space.
export function createLampGlow(lamps, { colour = 0xffa552 } = {}) {
  const group = new THREE.Group(); group.name = "lamp-glow";
  const time = { value: 0 }, haze = { value: .007 }, n = Math.max(1, lamps.length), dummy = new THREE.Object3D(), tint = new THREE.Color();
  const seeds = new THREE.InstancedBufferAttribute(new Float32Array(n).map((_, i) => (i * .6180339) % 1), 1);
  // Halos face the camera whichever way it turns, and breathe a little, each on its own beat.
  const haloMaterial = new THREE.ShaderMaterial({ ...common, uniforms: { time, haze, size: { value: LAMP_GLOW.halo }, strength: { value: LAMP_GLOW.haloStrength } },
    vertexShader: `attribute float seed; uniform float time, size, haze; varying vec2 vUv; varying vec3 vTint; varying float vFade;
      void main() { vec4 c = modelViewMatrix * instanceMatrix * vec4(0., 0., 0., 1.); float grow = length(instanceMatrix[0].xyz);
        c.xy += position.xy * size * grow * (1. + .05 * sin(time * 2.7 + seed * 40.)); vUv = uv; vTint = instanceColor;
        float d = -c.z; vFade = exp(-haze * haze * d * d) * smoothstep(.6, 2.4, d); gl_Position = projectionMatrix * c; }`,
    fragmentShader: `uniform float strength; varying vec2 vUv; varying vec3 vTint; varying float vFade;
      void main() { float r = length(vUv - .5) * 2.; float a = pow(max(0., 1. - r), 2.4) + .35 * pow(max(0., 1. - r * 2.6), 2.);
        gl_FragColor = vec4(vTint * a * strength * vFade, 1.); }` });
  const halos = new THREE.InstancedMesh(quad, haloMaterial, n); halos.geometry = quad.clone(); halos.geometry.setAttribute("seed", seeds);
  // Pools lie on the ground and fade in with distance, where the real lights stop.
  const poolMaterial = new THREE.ShaderMaterial({ ...common, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: { haze, size: { value: LAMP_GLOW.pool }, strength: { value: LAMP_GLOW.poolStrength }, reach: { value: new THREE.Vector2(LAMP_GLOW.near, LAMP_GLOW.far) } },
    vertexShader: `uniform float size, haze; uniform vec2 reach; varying vec2 vUv; varying vec3 vTint; varying float vFade;
      void main() { vec4 w = modelMatrix * instanceMatrix * vec4(position.x * size, 0., -position.y * size, 1.); vec4 c = viewMatrix * w; vUv = uv; vTint = instanceColor;
        float d = length((modelViewMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xyz); vFade = exp(-haze * haze * d * d) * smoothstep(reach.x, reach.y, d); gl_Position = projectionMatrix * c; }`,
    fragmentShader: `uniform float strength; varying vec2 vUv; varying vec3 vTint; varying float vFade;
      void main() { float r = length(vUv - .5) * 2.; float a = pow(max(0., 1. - r), 1.8); gl_FragColor = vec4(vTint * a * strength * vFade, 1.); }` });
  const pools = new THREE.InstancedMesh(quad, poolMaterial, n);
  lamps.forEach((lamp, i) => {
    tint.set(lamp.colour ?? colour);
    dummy.position.copy(lamp.head); dummy.scale.setScalar(lamp.scale ?? 1); dummy.updateMatrix(); halos.setMatrixAt(i, dummy.matrix); halos.setColorAt(i, tint);
    dummy.position.copy(lamp.ground); dummy.position.y += .04; dummy.updateMatrix(); pools.setMatrixAt(i, dummy.matrix); pools.setColorAt(i, tint);
  });
  for (const mesh of [halos, pools]) { mesh.count = lamps.length; mesh.frustumCulled = false; mesh.castShadow = mesh.receiveShadow = false; mesh.renderOrder = 4; group.add(mesh); }
  return { group, count: lamps.length,
    tick(seconds, { density = .007, still = false } = {}) { if (!still) time.value = seconds; haze.value = density; },
    dispose() { halos.geometry.dispose(); haloMaterial.dispose(); poolMaterial.dispose(); } };
}
