import * as THREE from "three";
import { seeded } from "./voxels.js";
import { shape, joint, createBrood } from "./hayride-spiders.js";

// The air of the ride-along woods, all of it kept round the camera: autumn
// leaves drifting down through the headlamp, low mist pooling on the ground,
// will-o'-wisps bobbing among the trees, and bats looping over the lane.
// Everything is anchored in the world and wraps round the rider, so it streams
// past as the wagon moves. Four draw calls in all.

const LEAF = { count: 150, box: 13, top: 7.5 }, MIST = { count: 64, box: 19 }, WISPS = 12, BATS = 5;
const LEAF_COLOURS = [0x8a2f1e, 0xc2552a, 0xe08a2e, 0xa8402a, 0x6a2a3a, 0xd9a03a];
const wrapTo = (v, c, half) => c + ((((v - c + half) % (half * 2)) + half * 2) % (half * 2)) - half;

// A soft round puff for the mist and the lamps' halos, drawn once per use.
export function puff() {
  if (typeof document === "undefined") return null;                                 // headless tests
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,0.9)"); grad.addColorStop(0.45, "rgba(255,255,255,0.35)"); grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// A bat: a body, pointed ears, red eyes and two wings of two hinged parts.
function bat(s = 0.32) {
  const root = new THREE.Object3D(), shapes = [], body = joint(root);
  shape(body, shapes, 0, 0, 0, 0.3 * s, 0.26 * s, 0.5 * s, 0x1a1418);
  shape(body, shapes, 0, 0.06 * s, 0.32 * s, 0.24 * s, 0.22 * s, 0.2 * s, 0x221a20);
  for (const side of [-1, 1]) { shape(body, shapes, side * 0.07 * s, 0.2 * s, 0.32 * s, 0.06 * s, 0.14 * s, 0.05 * s, 0x221a20); shape(body, shapes, side * 0.06 * s, 0.09 * s, 0.43 * s, 0.04 * s, 0.04 * s, 0.02 * s, 0xff3a2a, true); }
  const wings = [-1, 1].map((side) => {
    const shoulder = joint(body, side * 0.14 * s, 0.04 * s, 0.05 * s);
    shape(shoulder, shapes, side * 0.4 * s, 0, -0.05 * s, 0.8 * s, 0.03 * s, 0.5 * s, 0x2a2026);
    const elbow = joint(shoulder, side * 0.8 * s, 0, 0);
    shape(elbow, shapes, side * 0.35 * s, 0, -0.12 * s, 0.7 * s, 0.025 * s, 0.42 * s, 0x2a2026);
    shape(elbow, shapes, side * 0.6 * s, 0, -0.32 * s, 0.25 * s, 0.025 * s, 0.25 * s, 0x2a2026);
    return { shoulder, elbow, side };
  });
  return { root, shapes, body, wings };
}

export function createRideAtmosphere(scene) {
  const r = seeded(4471), group = new THREE.Group(); group.name = "Hollow Hayride air"; scene.add(group);
  // Leaves: tumbling flakes that catch the lamps.
  const leafGeo = new THREE.BoxGeometry(0.13, 0.016, 0.09), leafMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, LEAF.count), colour = new THREE.Color(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(0, 0, 0), p = new THREE.Vector3();
  leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage); leaves.frustumCulled = false;
  const leaf = Array.from({ length: LEAF.count }, (_, i) => { leaves.setColorAt(i, colour.setHex(LEAF_COLOURS[i % LEAF_COLOURS.length])); return { x: (r() - 0.5) * 2 * LEAF.box, y: r() * LEAF.top, z: (r() - 0.5) * 2 * LEAF.box, fall: 0.35 + r() * 0.5, sway: 0.6 + r() * 1.2, phase: r() * 6.3, spin: 1 + r() * 3 }; });
  // Mist: big soft puffs low on the ground, drifting slowly.
  const mistPos = new Float32Array(MIST.count * 3), mist = Array.from({ length: MIST.count }, () => ({ x: (r() - 0.5) * 2 * MIST.box, y: 0.25 + r() * 0.7, z: (r() - 0.5) * 2 * MIST.box, drift: 0.1 + r() * 0.2, phase: r() * 6.3 }));
  const mistGeo = new THREE.BufferGeometry(); mistGeo.setAttribute("position", new THREE.BufferAttribute(mistPos, 3));
  const mistMat = new THREE.PointsMaterial({ map: puff(), size: 6.5, sizeAttenuation: true, transparent: true, opacity: 0.16, depthWrite: false, color: 0x8b98bd, fog: true });
  const mistPoints = new THREE.Points(mistGeo, mistMat); mistPoints.frustumCulled = false; mistPoints.renderOrder = 2;
  // Will-o'-wisps: cold lights bobbing off the lane, never on it.
  const wispPos = new Float32Array(WISPS * 3), wispCol = new Float32Array(WISPS * 3), wisp = Array.from({ length: WISPS }, (_, i) => ({ x: (r() - 0.5) * 36, y: 0.8 + r() * 1.6, z: (r() - 0.5) * 36, phase: r() * 6.3, hue: i % 3 }));
  const wispGeo = new THREE.BufferGeometry(); wispGeo.setAttribute("position", new THREE.BufferAttribute(wispPos, 3)); wispGeo.setAttribute("color", new THREE.BufferAttribute(wispCol, 3));
  const wispMat = new THREE.PointsMaterial({ map: mistMat.map, size: 0.9, sizeAttenuation: true, transparent: true, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
  const wisps = new THREE.Points(wispGeo, wispMat); wisps.frustumCulled = false;
  // Bats over the lane.
  const bats = Array.from({ length: BATS }, () => bat(0.3 + r() * 0.12)), brood = createBrood(bats);
  for (const b of bats) group.add(b.root);
  const batPath = bats.map((_, i) => ({ radius: 3 + r() * 4, height: 4.2 + r() * 2.2, speed: (0.5 + r() * 0.5) * (i % 2 ? 1 : -1), phase: r() * 6.3, ahead: 5 + r() * 9 }));
  group.add(leaves, mistPoints, wisps, brood.group);
  const ahead = new THREE.Vector3();
  return {
    group,
    // camera: the rider's eye; forward: the lane's heading (x, z); clear(x, z)
    // says whether a point is off the lane, for the wisps; covered(x, z) says
    // whether it is under a roof, where no leaves fall; dim (0 to 1) fades the
    // mist and the wisps, which light themselves, in the breakdown's dark.
    tick(time, dt, camera, forward, { gentle = false, clear = () => true, covered = () => false, dim = 1 } = {}) {
      if (!camera) { group.visible = false; return; }
      mistMat.opacity = 0.16 * dim;
      group.visible = true; const step = Math.min(0.1, Math.max(0, dt)), slow = gentle ? 0.4 : 1;
      leaf.forEach((l, i) => {
        l.y -= l.fall * step * slow; if (l.y < 0) { l.y += LEAF.top; l.x += (r() - 0.5) * 4; }
        l.x = wrapTo(l.x, camera.x, LEAF.box); l.z = wrapTo(l.z, camera.z, LEAF.box);
        const s = Math.sin(time * l.sway + l.phase);
        p.set(l.x + s * 0.35, l.y, l.z + Math.cos(time * l.sway * 0.7 + l.phase) * 0.25);
        q.setFromEuler(e.set(s * 1.2, time * l.spin * slow + l.phase, Math.cos(time * l.spin + l.phase) * 0.9));
        leaves.setMatrixAt(i, m.compose(p, q, covered(l.x, l.z) ? zero : one));
      });
      leaves.instanceMatrix.needsUpdate = true;
      mist.forEach((n, i) => {
        n.x = wrapTo(n.x + Math.sin(time * 0.05 + n.phase) * n.drift * step, camera.x, MIST.box); n.z = wrapTo(n.z + n.drift * step * 0.6, camera.z, MIST.box);
        mistPos.set([n.x, n.y + Math.sin(time * 0.3 + n.phase) * 0.12, n.z], i * 3);
      });
      mistGeo.attributes.position.needsUpdate = true;
      wisp.forEach((w, i) => {
        w.x = wrapTo(w.x, camera.x, 18); w.z = wrapTo(w.z, camera.z, 18);
        const on = clear(w.x, w.z), glow = on ? dim * Math.max(0, 0.55 + 0.45 * Math.sin(time * (1.3 + w.hue * 0.4) + w.phase)) : 0;
        wispPos.set([w.x + Math.sin(time * 0.4 + w.phase) * 0.6, w.y + Math.sin(time * 0.9 + w.phase) * 0.35, w.z + Math.cos(time * 0.33 + w.phase) * 0.6], i * 3);
        wispCol.set(w.hue === 0 ? [0.35 * glow, 0.9 * glow, 0.8 * glow] : w.hue === 1 ? [0.5 * glow, 0.75 * glow, 1 * glow] : [0.7 * glow, 1 * glow, 0.45 * glow], i * 3);
      });
      wispGeo.attributes.position.needsUpdate = true; wispGeo.attributes.color.needsUpdate = true;
      // Bats loop over the lane ahead, wings beating; gentle mode sends them off.
      bats.forEach((b, i) => {
        const path = batPath[i]; b.root.visible = !gentle;
        if (gentle) { b.root.position.set(camera.x, -50, camera.z); return; }
        const a = time * path.speed + path.phase;
        ahead.set(camera.x + forward.x * path.ahead, 0, camera.z + forward.z * path.ahead);
        b.root.position.set(ahead.x + Math.cos(a) * path.radius, path.height + Math.sin(a * 2.3) * 0.5, ahead.z + Math.sin(a) * path.radius);
        b.root.rotation.set(Math.sin(a * 2.3) * 0.2, -a + (path.speed > 0 ? Math.PI : 0), Math.sin(a) * 0.3);
        const flap = Math.sin(time * 16 + i * 1.3);
        for (const w of b.wings) { w.shoulder.rotation.z = w.side * flap * 0.7; w.elbow.rotation.z = w.side * Math.max(0, -flap) * 0.6; }
      });
      brood.sync();
    },
    dispose() { scene.remove(group); leafGeo.dispose(); leafMat.dispose(); leaves.dispose(); mistGeo.dispose(); mistMat.map?.dispose(); mistMat.dispose(); wispGeo.dispose(); wispMat.dispose(); brood.dispose(); },
  };
}
