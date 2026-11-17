import * as THREE from "three";

// A depth-tested amber arch: no extra lights and no glow through the house.
export function createEntranceGlow({ width = 1.8, bottom = .22, top = 2.87, reducedMotion = false } = {}) {
  const group = new THREE.Group(); group.name = "Enter house glow";
  const arch = (half, low, high) => {
    const p = new THREE.Shape();
    p.moveTo(-half, low); p.lineTo(half, low); p.lineTo(half, high - .3);
    p.quadraticCurveTo(half, high, 0, high + .06); p.quadraticCurveTo(-half, high, -half, high - .3); p.closePath(); return p;
  };
  const band = (spread, opacity) => {
    const shape = arch(width / 2 + spread, bottom - spread, top + spread);
    const hole = arch(width / 2 - .065, bottom + .065, top - .065); shape.holes.push(hole);
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb958).multiplyScalar(2), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), material); group.add(mesh); return mesh;
  };
  const halo = band(.18, .12), edge = band(0, .65); edge.position.z = .003;
  return { group, tick(time, visible = true) {
    group.visible = visible;
    const breath = reducedMotion ? 0 : Math.sin(time * 1.7);
    edge.material.opacity = .63 + breath * .1; halo.material.opacity = .13 + breath * .035;
  } };
}
