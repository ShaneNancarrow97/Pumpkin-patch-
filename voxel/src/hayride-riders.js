import * as THREE from "three";
import { shape, joint, createBrood } from "./hayride-spiders.js";

// Fellow passengers for the owner's ride-along: the farm's own visitors in
// costume, seated on the benches facing the aisle. They jog over the ruts,
// swing their feet, turn to watch each scene go by and, when a scare hits,
// throw up their arms, cover their eyes or grab their neighbour, then settle.
// Each is a jointed rig drawn with the rest as one brood (two draw calls).
// Benches within 1.6 of the rider's eye stay free, so the nearest heads sit
// low in the corners of the view rather than filling them.

// Rig frame: +z faces the aisle, y 0 is the seat's cushion, the floor is 0.2 below.
const LOOKS = [
  { id: "witch", skin: 0x9ccf7a, body: 0x4b2a5e, legs: 0x2a1a30, hair: 0x2a1a20, hat: "witch", trim: 0x7a3b8a },
  { id: "vampire", skin: 0xe6dccf, body: 0x17131a, legs: 0x17131a, hair: 0x0e0c10, cape: 0x8a1424, eyes: 0xff3a2a },
  { id: "ghost", skin: 0xeceaf2, body: 0xeceaf2, legs: 0xdcdae6, sheet: true },
  { id: "scarecrow", skin: 0xc9a86a, body: 0x8a3a2a, legs: 0x3d4a6a, hat: "straw", trim: 0xd8b862 },
  { id: "skeleton", skin: 0xe8e0cc, body: 0x1a1618, legs: 0x1a1618, ribs: 0xe8e0cc, eyes: 0xb6ff6a },
  { id: "mummy", skin: 0xd8ccb0, body: 0xc9bc9e, legs: 0xc9bc9e, wraps: 0xe8dcc0, eyes: 0xffd36a },
  { id: "werewolf", skin: 0x5a4636, body: 0x3a4a5a, legs: 0x2a2a34, ears: true, trim: 0x8a2a2a },
];

function rider(look, brood) {
  const root = new THREE.Object3D(), shapes = [], L = look;
  const hips = joint(root, 0, 0.02, -0.02);
  shape(hips, shapes, 0, 0.06, 0, 0.34, 0.14, 0.26, L.legs);
  const knees = [-1, 1].map((s) => {
    const thigh = joint(hips, s * 0.09, 0.06, 0.02);
    shape(thigh, shapes, 0, 0, 0.17, 0.14, 0.13, 0.36, L.legs);
    const knee = joint(thigh, 0, 0, 0.34);
    shape(knee, shapes, 0, -0.11, 0, 0.12, 0.24, 0.12, L.legs);
    shape(knee, shapes, 0, -0.24, 0.05, 0.13, 0.06, 0.2, L.sheet ? L.legs : 0x221a1e);
    return knee;
  });
  if (L.sheet) shape(hips, shapes, 0, -0.02, 0.06, 0.46, 0.2, 0.44, L.body);                        // the sheet's skirt
  const torso = joint(hips, 0, 0.12, -0.02);
  shape(torso, shapes, 0, 0.24, 0, 0.36, 0.46, 0.24, L.body);
  if (L.ribs) for (let k = 0; k < 3; k++) shape(torso, shapes, 0, 0.18 + k * 0.1, 0.122, 0.26, 0.035, 0.01, L.ribs);
  if (L.wraps) for (let k = 0; k < 4; k++) shape(torso, shapes, 0, 0.06 + k * 0.11, 0.122, 0.37, 0.04, 0.01, L.wraps);
  if (L.cape) { shape(torso, shapes, 0, 0.2, -0.135, 0.44, 0.56, 0.03, L.cape); for (const s of [-1, 1]) shape(torso, shapes, s * 0.15, 0.5, -0.05, 0.08, 0.16, 0.16, L.cape); }
  if (L.trim && !L.sheet) shape(torso, shapes, 0, 0.42, 0.122, 0.2, 0.06, 0.01, L.trim);
  const head = joint(torso, 0, 0.5, 0);
  shape(head, shapes, 0, 0.15, 0.01, 0.28, 0.3, 0.27, L.skin);
  const eye = L.eyes ?? 0x141014, glowing = !!L.eyes;
  for (const s of [-1, 1]) shape(head, shapes, s * 0.065, 0.18, 0.148, L.sheet ? 0.07 : 0.045, L.sheet ? 0.08 : 0.045, 0.01, eye, glowing);
  const mouth = shape(head, shapes, 0, 0.07, 0.148, 0.08, 0.025, 0.01, 0x2a1418);
  if (L.hair) shape(head, shapes, 0, 0.29, -0.02, 0.3, 0.06, 0.3, L.hair);
  if (L.ears) { for (const s of [-1, 1]) shape(head, shapes, s * 0.1, 0.33, -0.02, 0.07, 0.12, 0.06, L.skin); shape(head, shapes, 0, 0.09, 0.16, 0.12, 0.08, 0.08, 0x3e3028); }
  if (L.hat === "witch") { shape(head, shapes, 0, 0.31, 0, 0.48, 0.03, 0.46, 0x231a2a); for (let k = 0; k < 4; k++) shape(head, shapes, k > 1 ? (k - 1) * 0.03 : 0, 0.33 + k * 0.1, -(k > 1 ? (k - 1) * 0.03 : 0), 0.24 - k * 0.05, 0.11, 0.24 - k * 0.05, 0x231a2a); shape(head, shapes, 0, 0.34, 0, 0.25, 0.03, 0.25, L.trim); }
  if (L.hat === "straw") { shape(head, shapes, 0, 0.3, 0, 0.5, 0.025, 0.48, 0xc9a44f); shape(head, shapes, 0, 0.32, 0, 0.26, 0.1, 0.26, 0xb88f3c); }
  const arms = [-1, 1].map((s) => {
    const shoulder = joint(torso, s * 0.22, 0.42, 0);
    shape(shoulder, shapes, 0, -0.15, 0, 0.1, 0.3, 0.1, L.sheet ? L.body : L.body);
    const elbow = joint(shoulder, 0, -0.3, 0);
    shape(elbow, shapes, 0, -0.12, 0, 0.09, 0.24, 0.09, L.body);
    shape(elbow, shapes, 0, -0.27, 0, 0.1, 0.08, 0.1, L.sheet ? L.body : L.skin);
    if (L.hat === "straw") for (let k = 0; k < 3; k++) shape(elbow, shapes, (k - 1) * 0.03, -0.33, 0, 0.025, 0.07, 0.025, 0xd8b862);
    return { shoulder, elbow, s };
  });
  brood.push({ root, shapes });
  return { root, hips, torso, head, arms, knees, mouth, mouthY: mouth.scale.y, look };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// seats: the wagon's seat anchors ({ id, position, yaw }); wagon: the object
// they are measured in; eye: the rider's camera anchor in the same frame.
// Returns the passengers and their brood.
export function createRiders({ wagon, seats, scene, eye = [0, 0, Infinity] }) {
  const rigs = [], people = seats.filter((s) => s.position[2] < eye[2] - 1.6).map((seat, i) => {
    const p = rider(LOOKS[i % LOOKS.length], rigs);
    p.root.position.set(...seat.position); p.root.rotation.y = seat.yaw + Math.PI; p.base = p.root.position.clone();
    p.side = seat.position[0] < 0 ? -1 : 1; p.index = i; p.fright = -1e9; p.style = i % 3; wagon.add(p.root);
    return p;
  });
  const brood = createBrood(rigs); scene.add(brood.group);
  const local = new THREE.Vector3();
  return {
    people,
    // A scare: everyone jumps, each a moment after the last.
    fright(time) { for (const p of people) p.fright = time + p.index * 0.11 + ((p.index * 37) % 7) * 0.02; },
    // d: distance along the route; look: the world position of the nearest
    // scene and how near it is (0 to 1); jolt: the wheels' bump now (0 to 1).
    tick({ time, d, jolt = 0, look = null, weight = 0, gentle = false }) {
      wagon.updateWorldMatrix(true, false);
      for (const p of people) {
        const t = time - p.fright, f = gentle || t < 0 ? 0 : t < 0.12 ? t / 0.12 : Math.exp(-(t - 0.12) / 1.1), i = p.index;
        // The jog of the wagon, a little behind the camera's, and dangling feet.
        p.root.position.copy(p.base); if (!gentle) p.root.position.y += jolt * 0.05 + Math.sin(d * 2.3 + i * 0.7) * 0.012;
        p.root.updateWorldMatrix(false, false);                                                     // for worldToLocal below
        p.torso.rotation.set(0.05 - jolt * 0.12 - f * 0.32, 0, gentle ? 0 : Math.sin(d * 1.7 + i) * 0.03);
        for (const [k, knee] of p.knees.entries()) knee.rotation.x = gentle ? 0 : Math.sin(time * 1.6 + i * 1.3 + k * 2.1) * 0.18 * (1 - weight) - f * 0.5;
        // Heads turn to the scene as it comes level; the body follows a little.
        let yaw = 0;
        if (look && weight > 0) { local.copy(look); p.root.worldToLocal(local); yaw = clamp(Math.atan2(local.x, local.z), -1.35, 1.35) * ease(weight); }
        p.head.rotation.set(-f * 0.25 + (gentle ? 0 : jolt * 0.1), yaw * 0.8 - f * p.side * 0.4, f * Math.sin(time * 31 + i) * 0.06);
        p.torso.rotation.y = yaw * 0.25;
        p.mouth.scale.y = p.mouthY * (1 + f * 4);
        // Arms: at rest on the knees; in a fright, up to the face, flung high or
        // reaching for the neighbour, by temperament; one points at the scene.
        for (const a of p.arms) {
          const rest = { sx: -0.42, sz: a.s * 0.06, ex: -0.95 };
          const pose = p.style === 0 ? { sx: -2.9, sz: a.s * 0.35, ex: -0.3 } : p.style === 1 ? { sx: -2.1, sz: a.s * 0.1, ex: -1.9 } : { sx: -1.2, sz: a.s * (a.s === p.side ? 0.2 : -1.2), ex: -0.4 };
          const point = !gentle && weight > 0.6 && i % 3 === 1 && a.s === -p.side && f < 0.1 ? ease((weight - 0.6) / 0.3) : 0;
          a.shoulder.rotation.x = rest.sx + (pose.sx - rest.sx) * f + (-1.3 - rest.sx) * point;
          a.shoulder.rotation.z = rest.sz + (pose.sz - rest.sz) * f;
          a.shoulder.rotation.y = point * yaw * 0.8;
          a.elbow.rotation.x = rest.ex + (pose.ex - rest.ex) * f + (-0.15 - rest.ex) * point;
        }
      }
      brood.sync();
    },
    dispose() { for (const p of people) p.root.removeFromParent(); brood.group.removeFromParent(); brood.dispose(); },
  };
}
