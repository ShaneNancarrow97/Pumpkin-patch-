import * as THREE from "three";
import { seeded, vary } from "./voxels.js";

// The hayride's spiders and their cave. Each spider is a jointed rig of plain
// Object3Ds (body, abdomen, fangs, palps and eight three-jointed legs); every
// frame the rig is posed and its boxes are written into one InstancedMesh for
// the whole brood, plus one for the glowing eyes, so a dozen spiders cost two
// draw calls. The cave is static voxels that follow the curve of the lane.

const UNIT = new THREE.BoxGeometry(1, 1, 1);
// Legs radiate from the body: front pair reaching forward, back pair behind.
const LEG_ANGLES = [0.95, 0.35, -0.2, -0.75], LEG_PHASE = [0, Math.PI, 0, Math.PI];

// One shape: a box of the given size at an offset inside a joint.
function shape(parent, list, x, y, z, w, h, d, colour, glow = false) {
  const o = new THREE.Object3D(); o.position.set(x, y, z); o.scale.set(w, h, d); parent.add(o);
  list.push({ o, colour, glow }); return o;
}
const joint = (parent, x = 0, y = 0, z = 0) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };

// A spider of size s (a giant is about 1.4, a house spider about 0.35).
// look: { body, leg, band, mark, eye } colours.
export function createSpider(s = 0.5, look = {}) {
  const body = look.body ?? 0x241b26, leg = look.leg ?? 0x30242f, band = look.band ?? 0x5a3a4a, mark = look.mark ?? 0x9a2a2a, eye = look.eye ?? 0xff4a3a;
  const root = new THREE.Object3D(), shapes = [], rig = joint(root, 0, 0.32 * s, 0);
  // Cephalothorax, the head with its eyes and fangs, and a swollen abdomen.
  shape(rig, shapes, 0, 0, 0.12 * s, 0.62 * s, 0.32 * s, 0.6 * s, body);
  shape(rig, shapes, 0, 0.08 * s, 0.42 * s, 0.44 * s, 0.26 * s, 0.26 * s, body);
  const abdomen = joint(rig, 0, 0.12 * s, -0.2 * s);
  shape(abdomen, shapes, 0, 0.1 * s, -0.5 * s, 0.84 * s, 0.66 * s, 0.9 * s, body);
  shape(abdomen, shapes, 0, 0.12 * s, -0.5 * s, 0.94 * s, 0.5 * s, 0.7 * s, body);
  shape(abdomen, shapes, 0, 0.42 * s, -0.48 * s, 0.6 * s, 0.12 * s, 0.6 * s, band);
  shape(abdomen, shapes, 0, 0.46 * s, -0.45 * s, 0.2 * s, 0.06 * s, 0.4 * s, mark);         // the hourglass on its back
  shape(abdomen, shapes, 0, 0.46 * s, -0.66 * s, 0.32 * s, 0.06 * s, 0.12 * s, mark);
  shape(abdomen, shapes, 0, 0.0 * s, -0.98 * s, 0.16 * s, 0.14 * s, 0.1 * s, band);         // spinnerets
  for (const [x, y, sz] of [[-0.1, 0.2, 0.08], [0.1, 0.2, 0.08], [-0.18, 0.16, 0.05], [0.18, 0.16, 0.05], [-0.06, 0.26, 0.045], [0.06, 0.26, 0.045], [-0.15, 0.1, 0.04], [0.15, 0.1, 0.04]])
    shape(rig, shapes, x * s, y * s, 0.56 * s, sz * s, sz * s, 0.03 * s, eye, true);
  // Fangs (chelicerae) and palps, which twitch.
  const fangs = [-1, 1].map((side) => { const j = joint(rig, side * 0.1 * s, -0.04 * s, 0.56 * s); shape(j, shapes, 0, -0.1 * s, 0.03 * s, 0.11 * s, 0.24 * s, 0.11 * s, body); shape(j, shapes, side * -0.02 * s, -0.25 * s, 0.07 * s, 0.05 * s, 0.1 * s, 0.05 * s, 0xc9c0b0); return j; });
  const palps = [-1, 1].map((side) => { const j = joint(rig, side * 0.2 * s, 0, 0.55 * s); j.rotation.y = side * -0.3; shape(j, shapes, 0, 0, 0.12 * s, 0.07 * s, 0.07 * s, 0.24 * s, leg); return j; });
  // Eight legs: yaw at the hip, then femur, tibia and tarsus, each a hinge.
  const legs = [];
  for (const side of [1, -1]) for (let i = 0; i < 4; i++) {
    const a = LEG_ANGLES[i], hip = joint(rig, side * 0.28 * s, -0.02 * s, (0.3 - i * 0.14) * s);
    hip.rotation.y = side > 0 ? -a : Math.PI + a;
    const lift = joint(hip), L = [0.62, 0.72, 0.46].map((n) => n * s * (i === 0 || i === 3 ? 1.08 : 1));
    shape(lift, shapes, L[0] / 2, 0, 0, L[0], 0.09 * s, 0.09 * s, leg);
    shape(lift, shapes, L[0], 0, 0, 0.12 * s, 0.11 * s, 0.11 * s, band);                    // a knobbly knee
    const knee = joint(lift, L[0]);
    shape(knee, shapes, L[1] / 2, 0, 0, L[1], 0.075 * s, 0.075 * s, leg);
    const ankle = joint(knee, L[1]);
    shape(ankle, shapes, L[2] / 2, 0, 0, L[2], 0.055 * s, 0.055 * s, i % 2 ? leg : band);
    legs.push({ hip, lift, knee, ankle, side, index: i, yaw: hip.rotation.y });
  }
  return { root, rig, abdomen, fangs, palps, legs, shapes, size: s, phase: 0 };
}

// Poses a spider. gait is how fast it walks (0 for still); rear lifts the front
// of the body and raises the front legs to strike; flail is the legs thrashing
// (a spider on a falling thread); fangs is how far the fangs open.
export function poseSpider(sp, t, { gait = 0, rear = 0, flail = 0, fangs = 0.2 } = {}) {
  const s = sp.size;
  sp.phase += gait * 0.016;
  sp.rig.position.y = 0.32 * s + Math.abs(Math.sin(sp.phase * 2)) * 0.03 * s * (gait > 0) + rear * 0.25 * s;
  sp.rig.rotation.x = -rear * 0.7;
  sp.abdomen.rotation.x = rear * 0.45 + Math.sin(t * 1.7 + s) * 0.04;
  sp.abdomen.scale.setScalar(1 + Math.sin(t * 2.3 + s * 3) * 0.035);                       // it breathes
  for (const [k, f] of sp.fangs.entries()) f.rotation.x = -0.2 - fangs * 0.7 - Math.max(0, Math.sin(t * 9 + k)) * 0.15 * fangs;
  for (const [k, p] of sp.palps.entries()) p.rotation.x = Math.sin(t * 4 + k * 2) * 0.25 - rear * 0.8;
  for (const l of sp.legs) {
    const ph = sp.phase * 6 + LEG_PHASE[l.index] + (l.side < 0 ? Math.PI : 0), swing = gait > 0 ? Math.sin(ph) : 0, up = gait > 0 ? Math.max(0, Math.cos(ph)) : 0;
    const strike = l.index < 2 ? rear : 0, thrash = flail * Math.sin(t * 13 + l.index * 1.7 + l.side);
    l.hip.rotation.y = l.yaw + swing * 0.26 * l.side + thrash * 0.3;
    l.lift.rotation.z = 0.62 + up * 0.32 + strike * (1.3 + Math.sin(t * 6 + l.index) * 0.25) + thrash * 0.35 + flail * 0.4;
    l.knee.rotation.z = -1.45 + strike * 0.6 + flail * 0.5 - thrash * 0.3;
    l.ankle.rotation.z = -0.55 + strike * 0.2 + flail * 0.3;
  }
}

// A brood: every spider's boxes in two instanced meshes, re-posed each frame.
export function createBrood(spiders) {
  const solid = [], glow = [];
  for (const sp of spiders) for (const sh of sp.shapes) (sh.glow ? glow : solid).push(sh);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 }), shine = new THREE.MeshBasicMaterial({ toneMapped: false });
  const bodies = new THREE.InstancedMesh(UNIT, material, solid.length), eyes = new THREE.InstancedMesh(UNIT, shine, glow.length), colour = new THREE.Color();
  solid.forEach((sh, i) => bodies.setColorAt(i, colour.setHex(sh.colour)));
  glow.forEach((sh, i) => eyes.setColorAt(i, colour.setHex(sh.colour)));
  for (const m of [bodies, eyes]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = false; }
  const group = new THREE.Group(); group.name = "Hollow Hayride spiders"; group.add(bodies, eyes);
  const write = (mesh, list) => { list.forEach((sh, i) => mesh.setMatrixAt(i, sh.o.matrixWorld)); mesh.instanceMatrix.needsUpdate = true; };
  return {
    group, spiders,
    // Call after posing: refresh the rigs' world matrices and copy them out.
    sync() { for (const sp of spiders) sp.root.updateMatrixWorld(true); write(bodies, solid); write(eyes, glow); },
    dispose() { bodies.dispose(); eyes.dispose(); material.dispose(); shine.dispose(); },
  };
}

// A mount on a surface: its local +Y points away from the surface (normal),
// +Z along forward, so a spider placed on it crawls across that surface.
export function mount(position, normal, forward) {
  const n = normal.clone().normalize(), f = forward.clone().sub(n.clone().multiplyScalar(forward.dot(n))).normalize(), x = new THREE.Vector3().crossVectors(n, f);
  const m = new THREE.Object3D(); m.position.copy(position); m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, n, f)); return m;
}

// ---- The cave ----
const ROCK = [0x2c2730, 0x352d38, 0x3f3540, 0x262129, 0x31303a], SLIME = [0x3c4a34, 0x46553a, 0x2f3d2c];
const SILK = 0xb8b3c2, SILK_OLD = 0x8f8a98, SAC = 0xd8d2c0, BONE = 0xd2c8b4;
// Silk is drawn as fine lines, all in one LineSegments: voxels this thin read
// as dotted chains. silk collects positions and colours until the cave is done.
const silkColour = new THREE.Color();
export function strand(silk, a, b, colour = SILK) {
  silk.position.push(a.x, a.y, a.z, b.x, b.y, b.z);
  silkColour.setHex(colour); silk.colour.push(silkColour.r, silkColour.g, silkColour.b, silkColour.r, silkColour.g, silkColour.b);
}
function silkLines(silk) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(silk.position, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(silk.colour, 3));
  const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75 })); lines.name = "Spider silk"; return lines;
}
// An orb web in the plane spanned by u and v (unit vectors), centred at c.
function orbWeb(silk, c, u, v, radius, r, torn = 0) {
  const p = (ang, rad) => c.clone().addScaledVector(u, Math.cos(ang) * rad).addScaledVector(v, Math.sin(ang) * rad);
  const spokes = 10;
  for (let k = 0; k < spokes; k++) if (r() > torn) strand(silk, c, p((k / spokes) * Math.PI * 2, radius * (0.85 + r() * 0.15)), SILK);
  for (let ring = 1; ring <= 4; ring++) for (let k = 0; k < spokes; k++) {
    if (r() < torn) continue;
    const rad = radius * ring / 4.6;
    strand(silk, p((k / spokes) * Math.PI * 2, rad), p(((k + 1) / spokes) * Math.PI * 2, rad), ring % 2 ? SILK : SILK_OLD);
  }
}

// Builds the cave into chunked voxels round the lane. sample(d) gives the lane's
// frame {x, z, dx, dz} at distance d; centre is the set's distance. Returns the
// cave's anchor points for spiders and its light.
export function buildSpiderCave(chunks, sample, centre, half = 6.4) {
  const r = seeded(7717), at = (x, z) => chunks.at(x, z), silk = { position: [], colour: [] };
  const frame = (d) => { const f = sample(d); return { c: new THREE.Vector3(f.x, 0, f.z), F: new THREE.Vector3(f.dx, 0, f.dz).normalize(), L: new THREE.Vector3(f.dz, 0, -f.dx).normalize() }; };
  const W = (s) => 3.0 + Math.sin(s * 1.3) * 0.2, H = (s) => 4.3 + Math.sin(s * 0.9 + 1) * 0.3;
  for (let s = -half; s <= half; s += 0.36) {
    const { c, L } = frame(centre + s), w = W(s), h = H(s), rim = Math.abs(s) > half - 1.2 ? 0.6 : 0;
    // Walls up to 1.6, then a rough arch to the crown; two layers thick.
    for (let y = 0; y < 1.7; y += 0.42) for (const side of [-1, 1]) for (const out of [0, 0.5]) {
      const p = c.clone().addScaledVector(L, side * (w + out + rim + (r() - 0.5) * 0.18));
      at(p.x, p.z).block(p.x, y, p.z, 0.56, 0.48, 0.56, vary(ROCK[Math.floor(r() * ROCK.length)], 0.1, r));
    }
    for (let th = 0; th <= Math.PI + 1e-6; th += 0.16) for (const out of [0, 0.5]) {
      const t = Math.cos(th) * (w + out + rim), y = 1.7 + Math.sin(th) * (h - 1.7 + out), p = c.clone().addScaledVector(L, t);
      const wet = y > 3.4 && r() < 0.18;
      at(p.x, p.z).block(p.x, y + (r() - 0.5) * 0.08, p.z, 0.58, 0.52, 0.58, vary(wet ? SLIME[Math.floor(r() * 3)] : ROCK[Math.floor(r() * ROCK.length)], 0.1, r));
    }
    // A floor of grit, bones and old silk.
    for (let t = -w + 0.3; t < w - 0.2; t += 0.5) {
      const p = c.clone().addScaledVector(L, t), lane = Math.abs(t) < 1.3;
      at(p.x, p.z).block(p.x, 0.01, p.z, 0.52, 0.03 + r() * 0.02, 0.52, vary(lane ? 0x2a2224 : 0x221c20, 0.12, r));
      if (!lane && r() < 0.1) at(p.x, p.z).block(p.x + (r() - 0.5) * 0.2, 0.04, p.z, 0.32, 0.06, 0.08, BONE);
    }
    // Stalactites from the crown, clear of the lane's headroom.
    if (r() < 0.35) { const t = (r() - 0.5) * 2 * (w - 0.6), p = c.clone().addScaledVector(L, t), top = 1.7 + Math.sqrt(Math.max(0, 1 - (t / w) ** 2)) * (h - 1.7), len = 0.3 + r() * (Math.abs(t) < 1.5 ? 0.4 : 0.9);
      for (let k = 0; k < 3; k++) at(p.x, p.z).block(p.x, top - len * (k + 1) / 3, p.z, 0.2 - k * 0.05, len / 3 + 0.02, 0.2 - k * 0.05, vary(ROCK[2], 0.1, r)); }
  }
  // Orb webs on the walls and slung across the upper corners.
  const up = new THREE.Vector3(0, 1, 0), anchors = { ceiling: [], walls: [], floor: [], lamp: null };
  for (const [s, side, y, rad, torn] of [[-4.6, 1, 2.0, 1.0, 0.1], [-1.8, -1, 2.2, 1.1, 0.2], [1.2, 1, 2.2, 1.15, 0.25], [3.8, -1, 1.9, 0.95, 0.1]]) {
    const { c, F, L } = frame(centre + s), w = W(s), wall = c.clone().addScaledVector(L, side * (w - 0.55)).setY(y);
    orbWeb(silk, wall, F, up, rad, r, torn);
    anchors.walls.push({ position: wall.clone().addScaledVector(L, -side * 0.05), normal: L.clone().multiplyScalar(-side), forward: F.clone() });
  }
  for (const s of [-5.2, -2.6, 0.2, 2.8, 5.4]) for (const side of [-1, 1]) {      // sheet webs in the corners of the vault
    const { c, L } = frame(centre + s), w = W(s), h = H(s), corner = c.clone().addScaledVector(L, side * (w - 0.2)).setY(2.4), crown = c.clone().addScaledVector(L, side * 1.6).setY(h - 0.15);
    for (let k = 0; k < 7; k++) strand(silk, corner.clone().setY(2.3 + k * 0.16), crown.clone().addScaledVector(L, side * k * 0.18), k % 2 ? SILK_OLD : SILK);
  }
  // Torn web curtains across both mouths, open where the wagon breaks through.
  for (const end of [-1, 1]) {
    const { c, L } = frame(centre + end * (half - 0.4)), h = H(end * half);
    for (let k = -6; k <= 6; k++) {
      const t = k * 0.45, top = c.clone().addScaledVector(L, t).setY(1.7 + Math.sqrt(Math.max(0, 1 - (t / 3.1) ** 2)) * (h - 1.9));
      const low = Math.abs(t) < 1.5 ? Math.max(3.1, top.y - 0.6 - r() * 0.5) : 0.4 + r() * 1.2;
      if (top.y > low) strand(silk, top, top.clone().setY(low), r() < 0.5 ? SILK : SILK_OLD);
    }
  }
  // Egg sacs clustered high on the walls, faintly lit from inside.
  for (const [s, side] of [[-3.2, -1], [-0.4, 1], [2.2, -1], [4.6, 1]]) {
    const { c, L } = frame(centre + s), w = W(s), base = c.clone().addScaledVector(L, side * (w - 0.55)).setY(3.0);
    for (let k = 0; k < 4; k++) { const p = base.clone().addScaledVector(L, -side * (r() * 0.4)).add(new THREE.Vector3((r() - 0.5) * 0.5, (r() - 0.5) * 0.4, (r() - 0.5) * 0.5));
      at(p.x, p.z).block(p.x, p.y, p.z, 0.32, 0.4, 0.32, SAC); at(p.x, p.z).block(p.x, p.y + 0.1, p.z, 0.2, 0.22, 0.34, 0x8fb070, true); }
  }
  // Cocooned victims hanging at the sides, one with a hand still free.
  for (const [s, side] of [[-2.4, 1], [1.6, -1], [4.4, 1]]) {
    const { c, L } = frame(centre + s), w = W(s), h = H(s), p = c.clone().addScaledVector(L, side * (w - 1.0)), top = 1.7 + Math.sqrt(Math.max(0, 1 - ((w - 1) / w) ** 2)) * (h - 1.7);
    strand(silk, p.clone().setY(top), p.clone().setY(2.75), SILK);
    for (let k = 0; k < 7; k++) { const y = 1.15 + k * 0.22, wd = 0.3 + Math.sin(k / 6 * Math.PI) * 0.18; at(p.x, p.z).block(p.x, y, p.z, wd, 0.24, wd, k % 2 ? SILK : 0xa59fae); }
    if (s > 4) { at(p.x, p.z).block(p.x + 0.25, 1.8, p.z, 0.08, 0.3, 0.08, 0x8a9a7a); for (let f = 0; f < 3; f++) at(p.x, p.z).block(p.x + 0.25 + (f - 1) * 0.04, 1.7, p.z, 0.025, 0.1, 0.025, 0x8a9a7a); }
    else at(p.x, p.z).block(p.x, 2.55, p.z, 0.22, 0.18, 0.04 + 0.22, BONE);
    anchors.floor.push({ position: c.clone().addScaledVector(L, side * (w - 0.9)), normal: up.clone(), forward: L.clone().multiplyScalar(-side) });
  }
  // Pairs of eyes in the dark crevices.
  for (let k = 0; k < 9; k++) {
    const s = -half + 0.8 + r() * (half * 2 - 1.6), side = r() < 0.5 ? -1 : 1, { c, L, F } = frame(centre + s), p = c.clone().addScaledVector(L, side * (W(s) - 0.02)), y = 0.5 + r() * 2.6;
    for (const e of [-0.06, 0.06]) { const q = p.clone().addScaledVector(F, e); at(q.x, q.z).block(q.x, y, q.z, 0.05, 0.04, 0.05, r() < 0.5 ? 0xff3a2a : 0xb6ff6a, true); }
  }
  const mid = frame(centre);
  anchors.ceiling.push({ position: mid.c.clone().addScaledVector(mid.F, 1.6).setY(H(1.6) - 0.15), normal: up.clone().negate(), forward: mid.F.clone().negate() });
  anchors.drop = { position: mid.c.clone().addScaledVector(mid.F, -2.2).addScaledVector(mid.L, 0.7), top: H(-2.2) - 0.2 };
  anchors.lamp = mid.c.clone().setY(2.6);
  anchors.silk = silkLines(silk);
  return anchors;
}
