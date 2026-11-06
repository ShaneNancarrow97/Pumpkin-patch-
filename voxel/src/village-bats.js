// Bats over Mothlight on Lantern Night (handover 73): small flocks wheeling round
// the Lantern Spire, the old moth-yard, the Baron's manor and the Moth Tree, wings
// beating. Every bat's body, wings and eyes are instances of three shared meshes,
// so the whole colony is three draws.
import * as THREE from "three";

const FLOCKS = [
  { x: 64, z: 66.5, y: 30, r: 6, n: 7, speed: .55 },
  { x: 90, z: 6, y: 7, r: 4, n: 4, speed: .8 },
  { x: 96, z: 64, y: 22, r: 7, n: 6, speed: .5 },
  { x: 58, z: 25, y: 12.5, r: 9, n: 4, speed: .35 },
];
export function createBats() {
  const group = new THREE.Group(), dark = new THREE.MeshLambertMaterial({ color: 0x15121c }), eyesMat = new THREE.MeshBasicMaterial({ color: 0xffd060, toneMapped: false });
  const bodyGeo = new THREE.BoxGeometry(.16, .14, .3), wingGeo = new THREE.BoxGeometry(.5, .03, .26), eyeGeo = new THREE.BoxGeometry(.11, .03, .02);
  wingGeo.translate(.25, 0, 0); eyeGeo.translate(0, .03, .15);
  const bats = []; FLOCKS.forEach((f, fi) => { for (let i = 0; i < f.n; i++) bats.push({ f, phase: i / f.n * Math.PI * 2 + fi, wobble: .6 + (i % 3) * .3 }); });
  const n = bats.length, bodies = new THREE.InstancedMesh(bodyGeo, dark, n), wings = new THREE.InstancedMesh(wingGeo, dark, n * 2), eyes = new THREE.InstancedMesh(eyeGeo, eyesMat, n);
  for (const m of [bodies, wings, eyes]) { m.frustumCulled = false; group.add(m); }
  const base = new THREE.Matrix4(), local = new THREE.Matrix4(), out = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0), flip = new THREE.Matrix4().makeRotationY(Math.PI);
  return {
    group,
    tick(time) {
      bats.forEach((b, i) => {
        const { f, phase, wobble } = b, a = time * f.speed + phase, R = f.r * (1 + Math.sin(time * .3 + phase) * .2);
        base.compose(p.set(f.x + Math.cos(a) * R, f.y + Math.sin(time * wobble + phase) * 1.2, -(f.z + Math.sin(a) * R)), q.setFromAxisAngle(up, -a), one);
        bodies.setMatrixAt(i, base); eyes.setMatrixAt(i, base);
        const flap = Math.sin(time * 14 + phase * 3) * .8;
        wings.setMatrixAt(i * 2, out.multiplyMatrices(base, local.makeRotationZ(flap)));
        wings.setMatrixAt(i * 2 + 1, out.multiplyMatrices(base, local.copy(flip).multiply(new THREE.Matrix4().makeRotationZ(flap))));
      });
      bodies.instanceMatrix.needsUpdate = wings.instanceMatrix.needsUpdate = eyes.instanceMatrix.needsUpdate = true;
    },
  };
}
