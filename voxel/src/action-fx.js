import * as THREE from "three";
// Little bursts when a hands-on job finishes: soil kicked up by a planted seed,
// droplets from the can, flecks of orange and gold off a picked pumpkin, and
// sparkles off a swept path. One pooled mesh; nothing is built per burst.
const KINDS = {
  plant: { count: 12, colours: [0x5a3a26, 0x6e4a30, 0x3e2a1c, 0x9be06a], up: [1.6, 2.6], out: 1.1, size: 0.09, life: 0.7, y: 0.15 },
  water: { count: 16, colours: [0x7fc4ff, 0xbfe6ff, 0x9bd2ff], up: [0.6, 1.4], out: 1.3, size: 0.07, life: 0.6, y: 1.05, falls: true },
  harvest: { count: 14, colours: [0xf0821e, 0xffb04a, 0xffe28a, 0xffd36b], up: [2.2, 3.4], out: 1.2, size: 0.1, life: 0.8, y: 0.4 },
  clean: { count: 12, colours: [0xffffff, 0xe7dcff, 0xffe9b8], up: [0.9, 1.8], out: 0.8, size: 0.07, life: 0.75, y: 0.3, rises: true },
};
export function createActionFx(scene, max = 96) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.count = 0; mesh.name = "Hands-on bursts"; scene.add(mesh);
  const parts = [], m = new THREE.Matrix4(), colour = new THREE.Color(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function burst(kind, x, z) {
    const k = KINDS[kind]; if (!k || !Number.isFinite(x) || !Number.isFinite(z)) return;
    for (let i = 0; i < k.count; i++) {
      if (parts.length >= max) parts.shift();
      const a = rnd() * Math.PI * 2, out = k.out * (0.4 + rnd() * 0.6), up = k.up[0] + rnd() * (k.up[1] - k.up[0]);
      parts.push({ x: x + (rnd() - 0.5) * 0.3, y: k.y + rnd() * 0.2, z: z + (rnd() - 0.5) * 0.3, vx: Math.cos(a) * out, vz: Math.sin(a) * out, vy: k.falls ? -up : up,
        t: 0, life: k.life * (0.7 + rnd() * 0.5), size: k.size * (0.7 + rnd() * 0.6), colour: k.colours[i % k.colours.length], spin: 2 + rnd() * 6, rises: !!k.rises });
    }
  }
  function tick(dt) {
    if (!parts.length) { mesh.count = 0; return; }
    for (let i = parts.length - 1; i >= 0; i--) {
      const b = parts[i]; b.t += dt;
      if (b.t >= b.life) { parts.splice(i, 1); continue; }
      b.vy += (b.rises ? 0.8 : -9.5) * dt; b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt;
      if (b.y <= 0.03) { b.y = 0.03; b.vx *= 0.55; b.vz *= 0.55; b.vy = 0; }
    }
    let n = 0;
    for (const b of parts) {
      const fade = 1 - b.t / b.life;
      e.set(b.t * b.spin, b.t * b.spin * 0.7, 0); q.setFromEuler(e); s.setScalar(b.size * (0.35 + 0.65 * fade)); p.set(b.x, b.y, b.z);
      m.compose(p, q, s); mesh.setMatrixAt(n, m); mesh.setColorAt(n, colour.setHex(b.colour)); n++;
    }
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  return { burst, tick, get active() { return parts.length; }, dispose() { mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose(); } };
}
