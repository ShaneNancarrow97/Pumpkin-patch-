import * as THREE from "three";
import { Voxels, seeded } from "./voxels.js";

// Sandy's moth courier: a real moth, a little larger than life so it reads
// from the farm. A furry thorax, a tapering banded abdomen, dark eyes and
// feathery antennae in fine voxels; fore- and hindwings painted as pixel art
// (fawn and umber, a wavy line, an eyespot, dusty cream fringes) on thin planes
// that hinge along the body and beat up and down. It flutters about the booth,
// glides now and then, banks into its turns and every so often settles on
// Sandy's counter with its wings spread, before taking off again.
//
// createMoth({ home, perch }) → { group, tick(time), dispose() }
//   home: [x, y, z] it wanders round; perch: [x, y, z] where it lands. One moth, no per-frame rebuilds.

const W = 32, H = 24;                                               // one wing's art: root at the left edge
const SPAN = 0.36, CHORD = SPAN * H / W;                            // a wing's size in room units

// The right wing pair's pixels. Forewing at the top (towards the head), hindwing below.
function wingArt() {
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const g = canvas.getContext("2d"), img = g.createImageData(W, H), r = seeded(1717);
  const inside = (x, y) => {
    // Forewing: a long rounded triangle from the root to the apex, back to the tornus.
    const fore = x >= 0 && (() => { const t = x / 30, top = 9 - 7.2 * t + 1.6 * t * t, bottom = 9.5 + 4.5 * t - 2 * t * t * t; return x <= 30.5 - Math.max(0, (y - 4) * 0.55) && y >= top && y <= bottom; })();
    // Hindwing: a softer, rounder lobe tucked under it.
    const hind = ((x - 9) / 11.5) ** 2 + ((y - 15.5) / 7) ** 2 < 1 && x >= 0;
    return fore ? 1 : hind ? 2 : 0;
  };
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const part = inside(x + 0.5, y + 0.5);
    if (!part) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(x + 0.5 + dx, y + 0.5 + dy) !== part);
    let c;
    if (part === 1) {
      const t = x / 30;
      c = mix([118, 86, 64], [204, 168, 122], Math.min(1, t * 1.6));                            // dark furred root to fawn
      if (Math.abs(x - (12 + Math.sin(y * 1.1) * 1.2)) < 0.8) c = [92, 64, 48];                   // two wavy cross-lines
      if (Math.abs(x - (21 + Math.sin(y * 0.9 + 1) * 1.3)) < 0.8) c = [96, 66, 50];
      if (x > 24) c = mix(c, [226, 200, 160], 0.35);                                            // the pale submargin
      const ex = 16, ey = 8.5, d = Math.hypot(x + 0.5 - ex, (y + 0.5 - ey) * 1.2);              // the eyespot
      if (d < 2.6) c = d < 1 ? [24, 16, 14] : d < 1.8 ? [236, 214, 170] : [70, 46, 36];
    } else {
      const d = Math.hypot((x - 2) / 16, (y - 13) / 10);
      c = mix([112, 74, 58], [186, 124, 92], Math.min(1, d * 1.2));                             // warm umber hindwing with a rosy flush
      if (Math.hypot(x - 10, y - 16) < 1.4) c = [80, 48, 44];
    }
    if (edge) c = mix(c, [226, 204, 166], 0.6);                                                 // a dusty cream fringe
    const dust = 0.92 + r() * 0.14, o = (y * W + x) * 4;
    img.data[o] = Math.min(255, c[0] * dust); img.data[o + 1] = Math.min(255, c[1] * dust); img.data[o + 2] = Math.min(255, c[2] * dust); img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.magFilter = texture.minFilter = THREE.NearestFilter; texture.generateMipmaps = false;
  return texture;
}

// The body, pointing towards -z, in fine voxels.
function body() {
  const v = new Voxels(), fur = 0x8a6a50, collar = 0xc4a382, dark = 0x2a1c16;
  v.block(0, -0.035, 0, 0.075, 0.07, 0.1, fur);                                // thorax
  v.block(0, -0.03, -0.045, 0.08, 0.06, 0.03, collar);                         // its furry collar
  v.block(0, -0.028, -0.072, 0.05, 0.048, 0.04, 0x5a4232);                     // head
  for (const s of [-1, 1]) v.block(s * 0.025, -0.02, -0.08, 0.016, 0.022, 0.02, 0x140c0a);       // eyes
  [[0.064, 0x7a5a44], [0.058, 0x5e4434], [0.05, 0x7a5a44], [0.04, 0x5e4434], [0.028, 0x6a4c3a]].forEach(([w, c], i) =>
    v.block(0, -0.032 - i * 0.004, 0.06 + i * 0.034, w, w * 0.9, 0.036, c));  // the abdomen, tapering and banded
  // Feathery antennae: a spine sweeping up and forward, combed both sides.
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) {
    const t = k / 6, x = s * (0.014 + 0.04 * t), y = 0.01 + 0.06 * t, z = -0.09 - 0.07 * t;
    v.block(x, y, z, 0.006, 0.008, 0.012, dark);
    if (k > 0 && k < 6) for (const b of [-1, 1]) v.block(x + s * 0.004, y + 0.002, z + b * 0.009, 0.02 * (1 - t * 0.5), 0.003, 0.004, 0x4a3426);
  }
  for (const s of [-1, 1]) for (const z of [-0.03, 0.005, 0.035]) v.block(s * 0.05, -0.075, z, 0.05, 0.006, 0.006, dark);   // legs
  return v.build({ shadows: false });
}

export function createMoth({ home, perch }) {
  const group = new THREE.Group(), tilt = new THREE.Group(); group.add(tilt); group.name = "Moth courier";
  tilt.add(body());
  const map = wingArt(), material = new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1, metalness: 0, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.07 });
  const geometry = new THREE.PlaneGeometry(SPAN, CHORD); geometry.translate(SPAN / 2, 0, 0); geometry.rotateX(-Math.PI / 2);
  const wings = [1, -1].map((side) => {
    const hinge = new THREE.Group(), wing = new THREE.Mesh(geometry, material);
    wing.scale.x = side; hinge.position.set(side * 0.03, 0, -0.01); hinge.add(wing); tilt.add(hinge);
    wing.castShadow = true;
    return { hinge, side };
  });
  group.scale.setScalar(1.35);
  const at = new THREE.Vector3(...home), aim = new THREE.Vector3(), last = new THREE.Vector3(...home), rest = new THREE.Vector3(...perch);
  let prev = null, beat = 0, yaw = 0, roll = 0;

  // Where the wandering flight is at time t: slow loops round home, with smaller wobbles.
  const flight = (t, out) => out.set(home[0] + 1.6 * Math.sin(t * 0.53) + 0.45 * Math.sin(t * 1.31 + 1), home[1] + 0.32 * Math.sin(t * 0.77) + 0.14 * Math.sin(t * 2.3), home[2] + 0.7 * Math.cos(t * 0.41) + 0.28 * Math.sin(t * 1.7));
  // A 26 s cycle: 18 s flying, then it lands on the perch for 6 s with a second either side to come and go.
  const CYCLE = 26, LAND = 18;
  return {
    group,
    tick(time) {
      const dt = prev === null ? 0 : Math.min(0.1, Math.max(0, time - prev)); prev = time;
      const k = time % CYCLE, settle = k < LAND ? 0 : k < LAND + 1.2 ? (k - LAND) / 1.2 : k < CYCLE - 1.2 ? 1 : (CYCLE - k) / 1.2, s = settle * settle * (3 - 2 * settle);
      flight(time, aim); aim.lerp(rest, s);
      last.copy(at); at.copy(aim); group.position.copy(at);
      // Face where it's going, banking into turns; at rest, face out over the counter.
      const vx = at.x - last.x, vz = at.z - last.z, speed = Math.hypot(vx, vz) / Math.max(dt, 1e-3);
      const want = s > 0.95 ? Math.PI : speed > 0.05 ? Math.atan2(-vx, -vz) : yaw, turn = Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw));
      yaw += turn * Math.min(1, dt * 5); roll += (THREE.MathUtils.clamp(turn * 1.2, -0.5, 0.5) * (1 - s) - roll) * Math.min(1, dt * 4);
      group.rotation.set(0, yaw, 0); tilt.rotation.set(0.1 * Math.min(1, speed) * (1 - s), 0, roll);   // nose a little up in flight, banked into turns
      // Quick beats with short glides; settled, the wings lie open and twitch now and then.
      const glide = (time % 3.1) > 2.5 ? 1 : 0, rate = 9 + 2 * Math.sin(time * 0.7);
      beat += dt * rate * Math.PI * 2 * (1 - 0.85 * glide);
      const flap = (1 - s) * (glide ? 0.35 + 0.1 * Math.sin(beat) : 0.3 + 0.85 * Math.sin(beat)), still = s * (0.08 + (Math.sin(time * 1.9) > 0.97 ? 0.5 : 0));
      for (const w of wings) w.hinge.rotation.z = w.side * (flap + still);
      group.position.y += (1 - s) * 0.025 * Math.sin(beat);                       // the body bobs with each beat
    },
    // The body's voxels share one box geometry with the whole game: free only their own buffers and materials.
    dispose() { geometry.dispose(); material.dispose(); map.dispose(); group.traverse((o) => { if (o.isInstancedMesh) { o.material.dispose(); o.dispose(); } }); },
  };
}
