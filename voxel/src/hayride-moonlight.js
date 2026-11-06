import * as THREE from "three";

// Moonlight falling through gaps in the canopy: pale shafts beside the lane,
// leaning away from the moon, each with a pool of light where it lands. They
// are drawn additively, two draws for them all, and shimmer slowly as the high
// branches move. They stand clear of the lane, so the wagon passes beside them
// and never through one, and clear of the scenes, which have their own light.
const SHAFT = { top: 0.55, bottom: 1.15, height: 11, lean: 0.3 }, MOON = new THREE.Vector2(-60, -14).normalize();

function shaftGeometry() {
  const g = new THREE.CylinderGeometry(SHAFT.top, SHAFT.bottom, SHAFT.height, 12, 6, true); g.translate(0, SHAFT.height / 2, 0);
  // Brightest a little above the ground, fading into the canopy.
  const pos = g.attributes.position, colour = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const t = pos.getY(i) / SHAFT.height, b = t < 0.01 ? 0.45 : (1 - t) ** 1.4; colour.set([b, b, b], i * 3); }
  g.setAttribute("color", new THREE.BufferAttribute(colour, 3)); return g;
}
function poolGeometry() {
  const g = new THREE.CircleGeometry(1.7, 20); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, colour = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const b = Math.max(0, 1 - Math.hypot(pos.getX(i), pos.getZ(i)) / 1.7); colour.set([b, b, b], i * 3); }
  g.setAttribute("color", new THREE.BufferAttribute(colour, 3)); return g;
}

// Additive light that fades where its surface turns edge-on to the eye (edge
// sets how sharply), so a shaft has soft sides, and fades into the fog rather
// than towards its colour, which would brighten it.
function glowMaterial(edge) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { edge: { value: edge } }]),
    vertexShader: `#include <common>
      #include <fog_pars_vertex>
      varying vec3 vColour; varying float vFacing;
      void main() {
        vec4 local = vec4(position, 1.0); vec3 n = normal;
        #ifdef USE_INSTANCING
          local = instanceMatrix * local; n = mat3(instanceMatrix) * n;
        #endif
        vec4 mvPosition = modelViewMatrix * local;
        vFacing = abs(dot(normalize(normalMatrix * n), normalize(-mvPosition.xyz)));
        vColour = color;
        #ifdef USE_INSTANCING_COLOR
          vColour *= instanceColor;
        #endif
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `#include <common>
      #include <fog_pars_fragment>
      uniform float edge; varying vec3 vColour; varying float vFacing;
      void main() {
        vec3 light = vColour * pow(vFacing, edge);
        #ifdef USE_FOG
          #ifdef FOG_EXP2
            light *= exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          #else
            light *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
          #endif
        #endif
        gl_FragColor = vec4(light, 1.0);
      }`,
    vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true,
  });
}

// sample(d): the route frame at distance d; lane(x, z): how far a point is
// from the lane anywhere along it (the route can pass near itself); clear(x,
// z): whether a spot is free of scenes and buildings; r: the seeded random.
export function createMoonShafts({ sample, length, lane, clear = () => true, r }) {
  const spots = [];
  for (let along = 12 + r() * 6, side = r() < 0.5 ? -1 : 1; along < length - 8; along += 14 + r() * 7, side = r() < 0.7 ? -side : side) {
    const p = sample(along), off = 3.6 + r() * 3.2, x = p.x + p.dz * off * side, z = p.z - p.dx * off * side;
    if (lane(x, z) > 3.4 && clear(x, z)) spots.push({ x, z, strength: 0.13 + r() * 0.08, phase: r() * 6.3, along });
  }
  const shafts = new THREE.InstancedMesh(shaftGeometry(), glowMaterial(1.6), Math.max(1, spots.length)), pools = new THREE.InstancedMesh(poolGeometry(), glowMaterial(0), Math.max(1, spots.length));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), at = new THREE.Vector3(), tint = new THREE.Color(0x9fb2e6), c = new THREE.Color();
  // Lean each shaft's top towards the moon, low in the west-north-west.
  const axis = new THREE.Vector3(-MOON.y, 0, MOON.x).normalize();
  spots.forEach((s, i) => {
    q.setFromAxisAngle(axis, -SHAFT.lean); shafts.setMatrixAt(i, m.compose(at.set(s.x, 0, s.z), q, one));
    pools.setMatrixAt(i, m.compose(at.set(s.x, 0.09, s.z), q.identity(), one));
  });
  shafts.count = pools.count = spots.length;
  for (const mesh of [shafts, pools]) { mesh.frustumCulled = false; mesh.renderOrder = 3; }
  const group = new THREE.Group(); group.name = "Hollow Hayride moonlight"; group.add(shafts, pools);
  // light dims them all (the breakdown's dark, hayride-stall.js).
  const tick = (time, light = 1) => {
    spots.forEach((s, i) => {
      const f = s.strength * light * (0.8 + 0.2 * Math.sin(time * 0.6 + s.phase) * Math.sin(time * 0.23 + s.phase * 2));
      shafts.setColorAt(i, c.copy(tint).multiplyScalar(f)); pools.setColorAt(i, c.copy(tint).multiplyScalar(f * 1.6));
    });
    if (shafts.instanceColor) shafts.instanceColor.needsUpdate = true; if (pools.instanceColor) pools.instanceColor.needsUpdate = true;
  };
  tick(0);
  return { group, spots, tick, dispose() { for (const mesh of [shafts, pools]) { mesh.geometry.dispose(); mesh.material.dispose(); mesh.dispose(); } } };
}
