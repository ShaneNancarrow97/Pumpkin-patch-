// Close, readable life around the Moth Tree and its approach. All coordinates
// are on the village's design grid; add group beneath the existing scaled root.
// Two opaque instanced draws, no lights, images, shadow pass or per-frame heap.
import * as THREE from "three";
import { seeded } from "./voxels.js";
import { FIXTURES, PLAN_SCALE } from "./content/village.js";

export const VILLAGE_ATMOSPHERE_BUDGET = Object.freeze({
  moths: 6, particles: 16, tvMoths: 3, tvParticles: 8,
  boxesPerMoth: 5, drawCalls: 2, lights: 0, maxEmissiveChannel: 1.35,
});

export function createVillageAtmosphere() {
  const B = VILLAGE_ATMOSPHERE_BUDGET, group = new THREE.Group(), random = seeded(1947);
  group.name = "atmosphere";
  const origin = { x: FIXTURES.tree.x / PLAN_SCALE, z: FIXTURES.tree.z / PLAN_SCALE };
  const box = new THREE.BoxGeometry(1, 1, 1);
  const ivory = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const ember = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.35, 1.23, .86), toneMapped: false });
  const moths = new THREE.InstancedMesh(box, ivory, B.moths * B.boxesPerMoth);
  const particles = new THREE.InstancedMesh(box, ember, B.particles);
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Quaternion(), euler = new THREE.Euler();
  const colour = new THREE.Color();
  for (const mesh of [moths, particles]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = false; mesh.receiveShadow = false;
    group.add(mesh);
  }
  // Fixed conservative bounds allow the existing camera/frustum to cull these
  // batches, without recalculating a sphere from instances every frame.
  moths.boundingSphere = new THREE.Sphere(new THREE.Vector3(origin.x, 4.4, -origin.z), 6.4);
  particles.boundingSphere = new THREE.Sphere(new THREE.Vector3(origin.x, 3, -18), 17);
  const flight = Array.from({ length: B.moths }, (_, i) => ({
    phase: random() * Math.PI * 2, radius: 2.1 + random() * 1.4,
    height: 2.7 + random() * 2.6, speed: .16 + random() * .12, size: .78 + random() * .32,
  }));
  const dust = Array.from({ length: B.particles }, (_, i) => {
    const nearTree = i % 3 !== 0, a = random() * Math.PI * 2, radius = 2.7 + random() * 4;
    return {
      x: nearTree ? origin.x + Math.cos(a) * radius : (i % 2 ? 52 : 64) + (random() - .5) * 2,
      z: nearTree ? origin.z + Math.sin(a) * radius : 9 + random() * 5,
      y: .7 + random() * (nearTree ? 4.5 : 1.8), phase: random() * Math.PI * 2,
      speed: .15 + random() * .2, size: .035 + random() * .032,
    };
  });
  for (let i = 0; i < B.moths; i++) for (let part = 0; part < B.boxesPerMoth; part++) {
    moths.setColorAt(i * B.boxesPerMoth + part, colour.set(part === 0 ? 0x8c6243 : part < 3 ? 0xf0ddbc : 0xc49b72));
  }
  for (let i = 0; i < B.particles; i++) particles.setColorAt(i, colour.set(i % 7 ? 0xffd198 : 0xa5d2c3));
  let time = 0, currentBudget = null, posed = false, updates = 0;
  const write = (mesh, index, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) => {
    rotation.setFromEuler(euler.set(rx, ry, rz));
    matrix.compose(position.set(x, y, -z), rotation, scale.set(w, h, d));
    mesh.setMatrixAt(index, matrix);
  };
  function pose() {
    for (let i = 0; i < moths.count / B.boxesPerMoth; i++) {
      const f = flight[i], a = f.phase + time * f.speed;
      const x = origin.x + Math.cos(a) * f.radius, z = origin.z + Math.sin(a) * f.radius;
      const y = f.height + Math.sin(time * .55 + f.phase) * .32, yaw = a - Math.PI / 2;
      const flap = Math.sin(time * 7 + f.phase) * .65, spread = (.12 + Math.cos(flap) * .08) * f.size;
      const at = i * B.boxesPerMoth;
      write(moths, at, x, y, z, .07 * f.size, .07 * f.size, .3 * f.size, 0, yaw);
      for (const side of [-1, 1]) {
        const dx = Math.cos(yaw) * side * spread, dz = -Math.sin(yaw) * side * spread;
        write(moths, at + (side < 0 ? 1 : 2), x + dx, y + Math.sin(flap) * spread, z - dz, .32 * f.size, .025, .22 * f.size, 0, yaw, side * flap);
        write(moths, at + (side < 0 ? 3 : 4), x + dx * .7 - Math.sin(yaw) * .12, y - .018, z - dz * .7 - Math.cos(yaw) * .12, .22 * f.size, .025, .18 * f.size, 0, yaw, side * flap * .7);
      }
    }
    for (let i = 0; i < particles.count; i++) {
      const p = dust[i], a = p.phase + time * p.speed;
      const size = p.size * (.7 + Math.sin(a * 1.6) * .3);
      write(particles, i, p.x + Math.sin(a) * .28, p.y + Math.sin(a * .7) * .24, p.z + Math.cos(a) * .28, size, size, size);
    }
    moths.instanceMatrix.needsUpdate = true; particles.instanceMatrix.needsUpdate = true;
    posed = true; updates++;
  }
  function tick(dt = 0, { reducedMotion = false, budget = "full" } = {}) {
    const nextBudget = budget === "tv" ? "tv" : "full", changed = currentBudget !== nextBudget;
    if (changed) {
      currentBudget = nextBudget;
      moths.count = (nextBudget === "tv" ? B.tvMoths : B.moths) * B.boxesPerMoth;
      particles.count = nextBudget === "tv" ? B.tvParticles : B.particles;
    }
    // Pausing decorative motion freezes its clock as well as buffer uploads.
    // A slow/background frame cannot jump a whole orbit on resuming.
    const delta = Number.isFinite(dt) ? Math.min(.1, Math.max(0, dt)) : 0;
    if (!reducedMotion && delta > 0) time += delta;
    if (!posed || changed || !reducedMotion && delta > 0) pose();
  }
  function stats() {
    return { budget: currentBudget, moths: moths.count / B.boxesPerMoth, particles: particles.count,
      instances: moths.count + particles.count, drawCalls: B.drawCalls,
      triangles: (moths.count + particles.count) * 12, lights: 0, textures: 0,
      maxEmissiveChannel: B.maxEmissiveChannel, time, bufferUpdates: updates };
  }
  tick(0);
  group.userData.visualBudget = { boxes: B.moths * B.boxesPerMoth + B.particles, drawCalls: B.drawCalls, addedLights: 0 };
  return { group, tick, stats };
}
