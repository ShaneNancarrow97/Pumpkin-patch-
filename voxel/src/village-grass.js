// Grass on Mothlight's lawns (handover 73): tufts of five blades, dark at the root
// and lit at the tip, grown in clumps (taller where the ground runs wild), with the
// odd flower among them, and a breeze that rolls across the lawn in waves, worked
// out on the GPU. No textures and no transparency: a few triangles a tuft, one
// instanced mesh per patch of ground, patches far from the camera hidden, and no
// shadows cast. Drawn on the design grid like the rest of the village.
import * as THREE from "three";
import { seeded } from "./voxels.js";

const PATCH = 20;
// One tuft: five blades fanned round a point, each a two-part blade that bends; base at y 0, tip at y 1.
function tuftGeometry() {
  const pos = [], tip = [];
  for (let b = 0; b < 3; b++) {
    const a = b / 3 * Math.PI * 2 + (b % 2) * .4, cx = Math.cos(a), cz = Math.sin(a), w = .11 + (b % 3) * .025, px = -cz * w, pz = cx * w, lean = .1 + (b % 2) * .08;
    const mx = cx * lean, mz = cz * lean, kx = cx * lean * 2.6, kz = cz * lean * 2.6, mh = .55 + (b % 3) * .05, th = .85 + (b % 2) * .15;
    // Lower part: a quad from the root to the bend; upper part: a triangle to the tip.
    pos.push(-px, 0, -pz, px, 0, pz, mx + px * .6, mh, mz + pz * .6, -px, 0, -pz, mx + px * .6, mh, mz + pz * .6, mx - px * .6, mh, mz - pz * .6);
    tip.push(0, 0, mh, 0, mh, mh);
    pos.push(mx - px * .6, mh, mz - pz * .6, mx + px * .6, mh, mz + pz * .6, kx, th, kz);
    tip.push(mh, mh, 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("tip", new THREE.Float32BufferAttribute(tip, 1));
  g.computeVertexNormals(); return g;
}
// A tiny flower head on a stalk, for the odd bloom among the grass.
function flowerGeometry() {
  const g = new THREE.BoxGeometry(.12, .1, .12); g.translate(0, 1.02, 0); const t = new Float32Array(g.attributes.position.count).fill(1.2); g.setAttribute("tip", new THREE.BufferAttribute(t, 1)); return g;
}
const noise = (x, z) => Math.sin(x * .23 + Math.sin(z * .17) * 1.7) * .5 + Math.sin(z * .31 + x * .07) * .5;

// grow(x, z) says whether grass grows there (and what kind), height(x, z) how high the ground is.
export function createGrass({ x0, z0, x1, z1, density = 3.2, grow, height, scale = 1.5 }) {
  const group = new THREE.Group(), r = seeded(1213), uniforms = { uTime: { value: 0 } };
  const material = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime; attribute float tip; varying float vTip;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vTip = tip;
        vec4 root = instanceMatrix * vec4(0., 0., 0., 1.);
        float wave = sin(uTime * 1.3 - (root.x * .9 + root.z * .5) * .35) * .5 + .5;
        float sway = (sin(uTime * 2.1 + root.x * .7 + root.z * .4) * .35 + wave * .9) * tip * tip;
        transformed.x += sway * .22; transformed.z -= sway * .12;`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vTip;")
      .replace("vec4 diffuseColor = vec4( diffuse, opacity );", "vec4 diffuseColor = vec4( diffuse * (.38 + .82 * min(vTip, 1.)) * (vTip > 1.1 ? 1.25 : 1.), opacity );");
  };
  const geo = tuftGeometry(), bloom = flowerGeometry(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  const patches = [], petals = [0xf6f0f5, 0xf5d04a, 0xf28fb5, 0x9a6ae0, 0xf08a3a];
  for (let px = x0; px < x1; px += PATCH) for (let pz = z0; pz < z1; pz += PATCH) {
    const spots = [], blooms = [], n = Math.round(PATCH * PATCH * density);
    for (let i = 0; i < n; i++) {
      // Clumps: a seed point and a few tufts close round it.
      const x = px + r() * PATCH, z = pz + r() * PATCH, wild = noise(x, z), kind = grow(x, z);
      if (!kind || r() > .72 + wild * .28) continue;
      spots.push([x, z, kind, wild]);
      for (let k = 0; k < 1; k++) { const a = r() * 6.283, d = .12 + r() * .25, cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d, k2 = grow(cx, cz); if (k2) spots.push([cx, cz, k2, wild]); }
      if (kind.flowers && r() < .07) blooms.push([x + .05, z, kind]);
    }
    if (!spots.length) continue;
    const mesh = new THREE.InstancedMesh(geo, material, spots.length);
    spots.forEach(([x, z, kind, wild], i) => {
      const h = kind.h * (.65 + r() * .5) * (1 + Math.max(0, wild) * .7), w = .85 + r() * .5;
      m.compose(p.set(x, height(x, z) + .01, -z), q.setFromAxisAngle(up, r() * 6.283), s.set(w, h, w)); mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(kind.colours[(r() * kind.colours.length) | 0]).multiplyScalar(.92 + r() * .16));
    });
    mesh.castShadow = false; mesh.receiveShadow = true; mesh.computeBoundingSphere(); group.add(mesh);
    let flowers = null;
    if (blooms.length) {
      flowers = new THREE.InstancedMesh(bloom, material, blooms.length);
      blooms.forEach(([x, z, kind], i) => { m.compose(p.set(x, height(x, z) + .01, -z), q.identity(), s.set(1, kind.h * 1.3, 1)); flowers.setMatrixAt(i, m); flowers.setColorAt(i, c.set(petals[(r() * petals.length) | 0])); });
      flowers.castShadow = false; flowers.computeBoundingSphere(); group.add(flowers);
    }
    patches.push({ mesh, flowers, x: px + PATCH / 2, z: pz + PATCH / 2 });
  }
  return {
    group,
    // The breeze, and patches beyond the view's reach hidden (the camera in world units).
    tick(time, camera) {
      uniforms.uTime.value = time;
      if (!camera) return;
      const cx = camera.position.x / scale, cz = -camera.position.z / scale, far = 30;
      for (const pt of patches) { const on = Math.hypot(pt.x - cx, pt.z - cz) < far; pt.mesh.visible = on; if (pt.flowers) pt.flowers.visible = on; }
    },
  };
}
