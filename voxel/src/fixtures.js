import { meshGrid, voxelGroup } from "./voxel-mesh.js";
import { buildModel, mix, scale } from "./decor-models/kit.js";
import { seeded } from "./voxels.js";

// The rooms' own fixtures as true 3D voxel objects, at the decor's density or
// finer: the hearth and its fire, shelves of jars, hanging herbs, cobwebs,
// rafters, fairy lights, the chandelier, the window sills and curtains, the
// stairs and ladder, the arched doorways, and the Honest Pumpkin's counter,
// tables, shelving and door. Each is built with the decor kit
// (decor-models/kit.js) in room units, then meshed like the decor
// (voxel-mesh.js): only the faces that show, vertex colours, baked AO, and
// flames and bulbs in the unlit mesh so they bloom.
//
// Every builder takes (options, look), where look is the room's STYLES entry
// ({ wall, wood, dark, trim, floor, curtains, ... }), and returns a THREE.Group
// in room units: base at y = 0, centred on x = 0, back at z = 0 facing +z,
// unless its note says otherwise. Its userData is { width, height, depth,
// triangles, lights: [{ x, y, z, color, intensity }] } plus anything noted,
// with every point in the group's own space (turn it with the group). Small
// things (jars, candles, spindles, the till) sit in finer grids of their own,
// as child groups, so traverse() to reach every mesh. Geometry is built once
// per set of arguments and shared (geometry.userData.shared), so calling a
// builder again is cheap and clearing a room leaves the cache alone.
//
//   hearth({ style: "stone" | "copper", width = 3.4, top = 4.75 })    back wall; the copper hood rises to `top`.
//       userData.mantel: the mantel shelf's top
//   jarShelf({ length = 4, rows = 2, seed, gap = 0.8 })                 its length along x; userData.boards: each board's top
//   hangingHerbs({ length = 9, seed })                                  a drying pole; its top (y = height) meets the ceiling
//   cobweb({ size = 1.1, flip })                                        anchored at its corner (0, size, 0), spanning +x (-x flipped)
//   fairyLights({ length = 9.6, seed, sag = 0.22 })                     swags along +x, pinned at y = height
//   rafter({ span = 10, drop = 1 })                                     a tie beam over x = ±span / 2 (and into the walls),
//       knee braces down to y = 0 at the walls; userData.beam: { bottom, top }
//   chandelier({ style: "manor" | "celestial", chain = 0.55 })          hangs from y = 0 down; centred on x = z = 0
//   windowDressing({ width = 1.375, kind, candles, curtains, bottom = 1.625, top = 3.875 })
//       y = 0 is the floor: the sill sits under `bottom`; curtains: a colour or null
//   staircase({ rise = 5.05, run = 4, width = 1, kind: "stairs" | "ladder", rail: "right" | "left" | "both" | "none",
//       steps, landing = 0, runner = null, clip = Infinity })            climbs along +x from (0, 0) to (run, rise), across z
//       0 to width; going up, left is z = 0 and right z = width (the room's side for a stair along the back wall);
//       the banister, cut string and panelling go on the railed sides; a landing carries on at `rise` to
//       x = run + landing (userData.landing); runner: a carpet colour; clip cuts off everything above it,
//       base everything below it (a stairwell shows only its top)
//   balustrade({ length = 3, height = 0.9, newels: "both" | "start" | "end" | "none" })   a straight run along x,
//       for a stairwell's edge; newels: which ends have a post (two runs meeting at a corner share one)
//   hatch({ width = 1, depth = 1, angle = 90 })                         a trapdoor in the floor: x centred, z = 0 to
//       depth out from the back wall, y = 0 the floor's top (it reaches userData.below under it); hinged at z = 0
//   place(group, x, y, z, turn = 0)   stands a fixture in its parent's space, turned about y, and returns
//       its userData.lights moved with it, for the room's list
//   doorway({ width = 1.625, height = 3.2, depth = 0.25, style: "arch" | "door", hinge: "left" | "right", angle = 95 })
//       for an opening in a wall: z = 0 is the wall's far face, z = depth its room face; height is the arch's crown;
//       the door swings away from the room by `angle` degrees (userData.door: its hinge and angle)
//   shopCounter({ length = 3.2 })  back (Skyla's side) at z = 0, customers at +z; userData.top, userData.seat
//   displayTable()                 centred on x = z = 0; userData.top: where the pumpkins stand
//   jarShelving({ length = 9, rows = 3, seed })   a dresser for the back wall; userData.boards
//   shopDoor({ width = 1.5, height = 2.56, depth = 0.25 })   like doorway, square-headed, hinged right and open into
//       the room at 150 degrees, OPEN on it; a hood, a bell on a spring and a doormat
const RES = 32;                                                      // voxels a unit: the decor runs about 23
const LOOK = { wall: 0xdcc39c, wood: 0x6a4428, dark: 0x3e2716, trim: 0x8a5a36, floor: 0x7a4a2a };
const SHOP = { wall: 0x5a3a26, wood: 0x6a4428, dark: 0x3a2214, trim: 0x8a5a36, floor: 0x7a4a2a };
const IRON = 0x2a2226, BRASS = 0xc9a050, WAX = 0xe8dcc8, CORK = 0x9a6a3e, PAPER = 0xe8dcc0, INK = 0x4a3020, TWINE = 0xb89a68, SOOT = 0x1a1214;
const FLAME = [0xfff4c8, 0xffd468, 0xffa030, 0xff5a1a], EMBER = [0xff7020, 0xd8401a, 0xffb040];
const CONTENTS = [[0xc8641e, "liquid"], [0x7a3a8a, "berries"], [0xd8a83a, "liquid"], [0x6a9a4a, "pickles"], [0xe8dcc8, "powder"], [0xa8302a, "liquid"], [0x8a5a2a, "beans"], [0x9d55e6, "liquid"], [0x5a7a3a, "herbs"]];
const tint = (c, t) => mix(c, 0xffffff, t), shade = (c, t) => mix(c, 0x000000, t);
const OPEN = ["111 111 111 1001", "101 101 100 1101", "101 111 111 1011", "101 100 100 1001", "111 100 111 1001"];      // a five-row font
const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const lerp = (pts, t) => { for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, a] = pts[i - 1], [t1, b] = pts[i]; return a + (b - a) * ((t - t0) / (t1 - t0 || 1)); } return pts[pts.length - 1][1]; };

// The model being built: its voxels a unit, so shapes can be sized in voxels.
let vpu = RES;
const u = (n) => n / vpu, vox = (v) => Math.floor(v * vpu + 1e-6), snap = (v) => (Math.floor(v * vpu) + 0.5) / vpu;
// Wood: streaks of grain along an axis (0 x, 1 y, 2 z), two voxels wide and a few long, darker
// or lighter on a plain ground, so most faces still merge into wide strips.
const grain = (c, axis = 0, amount = 0.08, len = 7) => (x, y, z) => {
  const p = [vox(x), vox(y), vox(z)], b = p[(axis + 1) % 3] >> 1, d = p[(axis + 2) % 3] >> 1, n = hash(b, d, Math.floor((p[axis] + hash(b, d, 3) * len) / len));
  return n < 0.3 ? scale(c, 1 - amount) : n > 0.86 ? scale(c, 1 + amount) : c;
};
// Stone, wax, cloth: blocks of `size` voxels a shade apart.
const fleck = (c, amount = 0.08, size = 2) => (x, y, z) => scale(c, 1 + (hash(Math.floor(vox(x) / size), Math.floor(vox(y) / size), Math.floor(vox(z) / size)) - 0.5) * 2 * amount);

// The kit measured in room units. The kit itself runs in voxels here (res 1),
// because its shape tests allow a hundredth of a unit squared of slack, which is
// nothing in art pixels but would fatten a thread in room units to a tenth of one.
function roomKit(k, s, W) {
  const p = (f) => (typeof f === "function" ? (x, y, z, b) => f(x / s, y / s, z / s, b) : f), t = (f) => f && ((x, y, z) => f(x / s, y / s, z / s));
  const o = (opts = {}) => ({ ...opts, ...(opts.round && { round: opts.round * s }), ...(opts.max && { max: opts.max * s }), ...(opts.d && { d: opts.d * s }) });
  const v = (a) => a.map((n) => n * s), r = (n) => (Array.isArray(n) ? v(n) : n * s);
  return {
    box: (x0, y0, z0, x1, y1, z1, paint, opts) => k.box(x0 * s, y0 * s, z0 * s, x1 * s, y1 * s, z1 * s, p(paint), o(opts)),
    post: (x, z, w, y0, y1, paint, opts) => k.post(x * s, z * s, w * s, y0 * s, y1 * s, p(paint), o(opts)),
    cyl: (a, b, rad, paint, opts) => k.cyl(v(a), v(b), r(rad), p(paint), opts),
    lathe: (x, z, y0, y1, prof, paint, opts) => k.lathe(x * s, z * s, y0 * s, y1 * s, typeof prof === "function" ? (q) => prof(q) * s : typeof prof === "number" ? prof * s : prof.map(([q, n]) => [q, n * s]), p(paint), o(opts)),
    ball: (x, y, z, rx, ry, rz, paint, opts) => k.ball(x * s, y * s, z * s, rx * s, ry * s, rz * s, p(paint), opts),
    shape: (x0, y0, z0, x1, y1, z1, test, paint, opts) => k.shape(x0 * s, y0 * s, z0 * s, x1 * s, y1 * s, z1 * s, t(test), p(paint), opts),
    carve: (x0, y0, z0, x1, y1, z1, test) => k.carve(x0 * s, y0 * s, z0 * s, x1 * s, y1 * s, z1 * s, t(test) ?? (() => true)),
    drape: (a, b, top, bottom, paint, { folds, amp, thick, tie, ...rest } = {}) => k.drape(v(a), v(b), top * s, bottom * s, p(paint), { ...rest, folds: folds * s, amp: amp * s, thick: thick * s, tie: tie && { ...tie, y: tie.y * s } }),
    sym: (fn) => { fn((x) => x); fn((x) => W - x); },
  };
}

// Builds a fixture once per set of arguments: a grid w x h x d units at r voxels
// a unit, filled by build(k) in the grid's own units (x right, y up, z out from
// the back), meshed with the grid point `at` on the group's origin.
const cache = new Map(), NO_ART = { w: 0, h: 0 };
function fixture(name, args, { w, h, d, r = RES, at = [w / 2, 0, 0] }, build) {
  const key = name + JSON.stringify(args);
  let m = cache.get(key);
  if (!m) {
    vpu = r;
    let info = {};
    const { grid } = buildModel({ width: Math.ceil(w * r), height: Math.ceil(h * r), depth: Math.ceil(d * r), res: 1, build: (k) => { info = build(roomKit(k, r, w)) ?? {}; } }, NO_ART, []);
    const geometry = meshGrid(grid, { scale: 1 / r, offset: at.map((a) => -a) }), move = (p) => ({ ...p, x: p.x - at[0], y: p.y - at[1], z: p.z - at[2] });
    m = { geometry, data: { width: w, height: h, depth: d, ...info, triangles: geometry.reduce((n, g) => n + (g ? g.index.count / 3 : 0), 0), lights: (info.lights ?? []).map(move) } };
    cache.set(key, m);
  }
  const group = voxelGroup(m.geometry, { shared: true });
  group.userData = structuredClone(m.data);
  group.name = name;
  return group;
}
// A fixture with its small things (jars, candles, spindles, the till) in finer
// grids of their own, so they turn round without paying for fine voxels
// everywhere: each part is [group, x, y, z], placed in the main group's space.
function assemble(main, ...parts) {
  const ud = main.userData;
  for (const [g, x, y, z] of parts) {
    g.position.set(x, y, z);
    main.add(g);
    ud.triangles += g.userData.triangles;
    ud.lights.push(...g.userData.lights.map((l) => ({ ...l, x: l.x + x, y: l.y + y, z: l.z + z })));
  }
  return main;
}
// Stands a fixture at (x, y, z) in its parent's space, turned `turn` radians
// about y, and returns its lights moved with it, ready for the room's list.
export function place(group, x, y, z, turn = 0) {
  const c = Math.cos(turn), s = Math.sin(turn);
  group.position.set(x, y, z); group.rotation.y = turn;
  return group.userData.lights.map((l) => ({ ...l, x: x + l.x * c + l.z * s, y: y + l.y, z: z - l.x * s + l.z * c }));
}

// ── Small things the fixtures share ──

// A flame: a teardrop of glowing voxels, white-gold at the heart, orange at the tip.
function flame(k, x, y, z, h, r) {
  k.shape(x - r, y, z - r, x + r, y + h, z + r, (px, py, pz) => {
    const t = (py - y) / h, w = r * (t < 0.35 ? 0.6 + 0.4 * Math.sin((t / 0.35) * (Math.PI / 2)) : Math.cos(((t - 0.35) / 0.65) * (Math.PI / 2)));
    return Math.hypot(px - x, pz - z) <= Math.max(w, 0.6 / vpu);
  }, (px, py, pz) => { const t = (py - y) / h; return t > 0.75 ? FLAME[2] : t < 0.15 || Math.hypot(px - x, pz - z) > r * 0.6 ? FLAME[1] : FLAME[0]; }, { glow: true });
}
// A candle standing on (x, y, z): wax, a drip run down one side, a melted lip, a wick and a flame.
function candle(k, x, y, z, h, r = 0.035) {
  x = snap(x); z = snap(z);
  k.lathe(x, z, y, y + h, r, fleck(WAX, 0.03, 2));
  k.lathe(x, z, y + h - u(1), y + h, r + u(0.6), tint(WAX, 0.2));
  k.box(x + r - u(0.5), y + h * 0.4, z, x + r + u(0.9), y + h, z + u(1.4), tint(WAX, 0.25));
  k.post(x, z, u(0.9), y + h, y + h + u(1.5), 0x2a2018);
  flame(k, x, y + h + u(1), z, Math.max(u(4), r * 2.2), Math.max(u(1.6), r * 0.8));
}
// A jar standing on (x, y, z): its contents seen through the glass up to `level`,
// pale glass above with a glint, a shoulder and neck, and a cork, a cloth cap
// tied with twine, or a glass stopper; sometimes a paper label on the front.
function jar(k, x, y, z, { kind = "jar", h = 0.26, r = 0.08, fill = 0xc8641e, stuff = "liquid", level = 0.62, glow = false, label = false, cap = 0xa83a2a }) {
  x = snap(x); z = snap(z);
  const squat = kind === "squat", R = squat ? r * 1.25 : r, H = squat ? h * 0.7 : h, top = y + H, lvl = y + H * (kind === "bottle" ? Math.min(level, 0.5) : level);
  const prof = kind === "bottle" ? [[0, 0.88], [0.06, 1], [0.48, 1], [0.6, 0.6], [0.68, 0.38], [1, 0.38]] : squat ? [[0, 0.88], [0.08, 1], [0.78, 1], [0.9, 0.84], [1, 0.84]]
    : kind === "stopper" ? [[0, 0.88], [0.06, 1], [0.7, 1], [0.84, 0.6], [1, 0.58]] : [[0, 0.88], [0.06, 1], [0.8, 1], [0.9, 0.72], [1, 0.76]];
  const rad = (py) => R * lerp(prof, (py - y) / H), glass = mix(fill, 0xeef0ff, 0.66), seen = mix(fill, 0xeef0ff, 0.12), other = mix(fill, 0xffffff, 0.45);
  const stuffPaint = (px, py, pz) => {
    const n = hash(vox(px) >> 1, vox(py) >> 1, vox(pz) >> 1);
    if (stuff === "powder") return scale(seen, 0.92 + n * 0.16);
    if (stuff === "herbs") return n < 0.4 ? scale(seen, 0.8) : n < 0.7 ? tint(seen, 0.15) : seen;
    if (stuff !== "liquid") return hash(vox(px) >> 2, vox(py) >> 1, vox(pz) >> 2) < (stuff === "beans" ? 0.5 : 0.3) ? (stuff === "pickles" ? 0xd8d8a0 : stuff === "beans" ? 0xd8c8a0 : scale(seen, 0.55)) : seen;
    return py > lvl - u(1.5) ? tint(seen, 0.15) : seen;
  };
  k.lathe(x, z, y, lvl, (t) => rad(y + t * (lvl - y)), stuffPaint, { max: R, glow });
  // The glass: pale, with a glint up its front-left where the room's lamp catches it.
  k.lathe(x, z, lvl, top, (t) => rad(lvl + t * (top - lvl)), (px, py, pz) => (px < x - R * 0.2 && pz > z + R * 0.45 ? tint(glass, 0.5) : glass), { max: R });
  const neck = R * prof[prof.length - 1][1];
  if (kind === "stopper") {
    k.lathe(x, z, top, top + u(1), neck * 1.1, tint(glass, 0.2));
    k.ball(x, top + u(1) + R * 0.4, z, R * 0.5, R * 0.42, R * 0.5, (px, py, pz) => (px < x && py > top + R * 0.5 ? tint(glass, 0.6) : tint(glass, 0.2)));
  } else if (squat) {
    // A gingham cloth over the mouth, hanging over the neck, tied with twine.
    k.lathe(x, z, top - u(2), top + u(1), neck + u(1), (px, py, pz) => ((vox(px) + vox(pz) + vox(py)) % 2 ? cap : tint(cap, 0.65)));
    k.lathe(x, z, top - u(1.5), top - u(0.5), neck + u(1.4), TWINE);
  } else {
    k.lathe(x, z, top, top + Math.max(u(2), H * 0.12), [[0, neck * 0.92], [1, neck * 1.05]], (px, py) => (py > top + H * 0.08 ? tint(CORK, 0.18) : CORK));
  }
  if (label) {
    const y0 = y + H * 0.24, y1 = y + H * (squat ? 0.62 : 0.52), mid = vox((y0 + y1) / 2);
    k.shape(x - R - u(1), y0, z, x + R + u(1), y1, z + R + u(1), (px, py, pz) => pz > z + R * 0.15 && Math.hypot(px - x, pz - z) <= rad(py) + u(0.6),
      (px, py) => (vox(py) === mid && Math.abs(px - x) < R * 0.55 ? INK : PAPER));
  }
}
// A little pumpkin: ribbed, darker in the grooves, with a curling stem.
function pumpkin(k, x, y, z, r, colour) {
  const h = r * 0.72, cy = y + h;
  k.ball(x, cy, z, r, h, r, (px, py, pz) => {
    const lobe = Math.abs(Math.cos(Math.atan2(pz - z, px - x) * 4)), up = (py - y) / (2 * h);
    return scale(colour, (lobe > 0.62 ? 1.04 : lobe > 0.3 ? 0.94 : 0.74) * (up > 0.55 ? 1 : 0.88));
  }, { ribs: [8, 0.12] });
  k.cyl([x, cy + h * 0.75, z], [x + r * 0.18, cy + h * 1.3, z + r * 0.05], Math.max(r * 0.14, u(0.8)), 0x5a6a2a);
}
// A log lying from a to b: bark in streaks, pale cut ends with rings.
function log(k, a, b, r, ends = true) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(...d), bark = 0x4a2e1c;
  k.cyl(a, b, r, (x, y, z) => {
    const t = ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / (len * len), along = t * len;
    if (ends && (along < u(1) || along > len - u(1))) {
      const px = a[0] + d[0] * t, py = a[1] + d[1] * t, pz = a[2] + d[2] * t, rr = Math.hypot(x - px, y - py, z - pz) / r;
      return rr > 0.82 ? bark : Math.floor(rr * 4) % 2 ? 0xb88a58 : 0xd0a46c;
    }
    return scale(bark, [0.8, 1, 1.12][Math.floor(hash((vox(x) + vox(z)) >> 1, vox(y) >> 1, Math.floor((along * vpu) / 6)) * 3)]);
  }, { caps: false });
}
// A turned spindle from y0 to y1: square blocks at each end, a vase and rings between.
function spindle(k, x, z, y0, y1, r, paint) {
  const sq = Math.min(u(4), (y1 - y0) * 0.15);
  k.post(x, z, r * 2, y0, y0 + sq, paint);
  k.post(x, z, r * 2, y1 - sq, y1, paint);
  k.lathe(x, z, y0 + sq, y1 - sq, [[0, r * 0.85], [0.06, r * 1.25], [0.12, r * 0.7], [0.38, r * 1.3], [0.6, r * 0.62], [0.82, r * 0.7], [0.88, r * 1.15], [0.94, r * 0.7], [1, r * 0.85]], paint);
}
// A newel post: a square shaft with sunk panels, a moulded cap and a turned ball finial.
function newel(k, x, z, y0, y1, w, paint, cap) {
  const hw = w / 2;
  k.box(x - hw, y0, z - hw, x + hw, y1, z + hw, paint, { round: u(2), axis: "y" });
  if (y1 - y0 > 0.5) for (const [ax, s] of [[0, -1], [0, 1], [2, -1], [2, 1]]) {
    const a = ax === 0 ? x + s * hw : z + s * hw, lo = Math.min(a, a - s * u(1)), hi = Math.max(a, a - s * u(1)), y2 = y0 + 0.16, y3 = y1 - 0.1;
    if (ax === 0) k.carve(lo, y2, z - hw + u(2.5), hi, y3, z + hw - u(2.5)); else k.carve(x - hw + u(2.5), y2, lo, x + hw - u(2.5), y3, hi);
  }
  k.box(x - hw - u(1.5), y1, z - hw - u(1.5), x + hw + u(1.5), y1 + u(3), z + hw + u(1.5), cap, { round: u(2) });
  k.lathe(x, z, y1 + u(3), y1 + u(3) + w * 1.05, [[0, w * 0.22], [0.12, w * 0.16], [0.24, w * 0.3], [0.55, w * 0.42], [0.85, w * 0.28], [1, w * 0.06]], cap);
}
// A handrail along a line: rounded on top, y = top(x) its top, centred on z.
function handrail(k, x0, x1, top, z, paint, lo = 0, hi = 99) {
  const y0 = Math.min(top(x0), top(x1)) - u(4), y1 = Math.max(top(x0), top(x1));
  k.shape(x0, Math.max(lo, y0), z - u(2.5), x1, Math.min(hi, y1), z + u(2.5), (x, y, pz) => {
    const dy = top(x) - y, dz = Math.abs(pz - z);
    return dy >= 0 && dy <= u(3.2) && dz <= (dy < u(1) ? u(1.2) : u(2));
  }, (x, y) => (top(x) - y < u(1) ? tint(paint, 0.12) : paint));
}

// ── The kitchen's hearth ──

export function hearth({ style = "stone", width = 3.4, top = 4.75 } = {}, look = LOOK) {
  const copper = style === "copper", W = width, D = 1.25, H = copper ? top : 2.95, P = 19 / RES, Mt = 79 / RES;
  const main = fixture("hearth", [style, W, top, look], { w: W, h: H, d: D }, (k) => {
    const r = seeded(17 + Math.round(W * 31) + (copper ? 5 : 0)), Hs = u(74), c = W / 2, xb = u(4), Wv = Math.round(W * vpu);
    const fw = Math.min(0.95, Math.max(0.62, W * 0.24)), fs = 1.3, rise = 0.3, floor = u(3);
    const stone = copper ? 0x5a4a44 : 0x8a8090, mortar = copper ? shade(stone, 0.35) : mix(stone, 0xe0d8c8, 0.3);
    // The firebox's opening at half-width f: upright cheeks, then a segmental arch.
    const arch = (f) => { const a = (rise * f) / fw, rho = (f * f + a * a) / (2 * a); return { rho, cy: fs + a - rho }; };
    const inOpen = (x, y, f = fw) => { const dx = Math.abs(x - c); if (dx >= f || y < floor) return false; if (y < fs) return true; const a = arch(f); return dx * dx + (y - a.cy) ** 2 < a.rho * a.rho; };
    const { rho, cy } = arch(fw);

    // The chimney breast: mortar behind, then coursed stones (or brick) a voxel proud of it.
    k.box(xb, floor, 0, W - xb, Hs, P - u(1), mortar);
    if (copper) {
      for (let j = 3, row = 0; j < 74; j += 4, row++) for (let i = 4 - (row % 2) * 4; i < Wv - 4; i += 8) {
        const i0 = Math.max(4, i), i1 = Math.min(Wv - 4, i + 8), c0 = mix(stone, r() < 0.5 ? 0x7a4636 : 0x2e2622, r() * 0.35);
        if (i1 - i0 > 1) k.box(u(i0), u(j), 0, u(i1 - (i1 === Wv - 4 ? 0 : 1)), u(Math.min(j + 3, 74)), P, c0);
      }
    } else {
      for (let j = 3; j < 74;) {
        const hgt = Math.min(74 - j, 6 + Math.floor(r() * 3));
        for (let i = 4 - Math.floor(r() * 9); i < Wv - 4;) {
          const len = 8 + Math.floor(r() * 9), i0 = Math.max(4, i), i1 = Math.min(Wv - 4, i + len);
          const c0 = mix(mix(stone, 0xa89480, r() * 0.5), r() < 0.5 ? 0x000000 : 0xffffff, r() * 0.14);
          if (i1 - i0 > 2) k.box(u(i0), u(j), 0, u(i1 - (i1 === Wv - 4 ? 0 : 1)), u(j + hgt - (j + hgt >= 74 ? 0 : 1)), P + (r() < 0.3 ? u(1) : 0), fleck(c0, 0.04, 3), { round: u(2) });
          i += len;
        }
        j += hgt;
      }
    }
    // The arch: a ring of wedge stones (or a soldier course of brick) round the
    // opening, its keystone proud; then the firebox hollowed out behind.
    const depth = copper ? u(8) : 0.26, step = (copper ? u(4) : 0.17) / rho;
    const ring = (x, y) => { const d = Math.hypot(x - c, y - cy); return y > fs - u(2) && d >= rho && d < rho + depth + (Math.abs(x - c) < u(4) ? u(3) : 0); };
    k.carve(c - fw - depth - 0.1, fs - u(2), 0, c + fw + depth + 0.1, fs + rise + depth + 0.2, P + u(3), ring);
    k.shape(c - fw - depth - 0.1, fs - u(2), 0, c + fw + depth + 0.1, fs + rise + depth + 0.2, P - u(1), ring, mortar);
    k.shape(c - fw - depth - 0.1, fs - u(2), 0, c + fw + depth + 0.1, fs + rise + depth + 0.2, P + u(copper ? 0 : 2), (x, y, z) => {
      if (!ring(x, y)) return false;
      const d = Math.hypot(x - c, y - cy), s = (Math.atan2(y - cy, x - c) - Math.PI / 2) / step, n = Math.round(s);
      return Math.abs(s - n) < 0.5 - 0.5 / (vpu * d * step) && (n === 0 || z <= P + (copper ? 0 : u(1)));
    }, (x, y) => { const n = Math.round((Math.atan2(y - cy, x - c) - Math.PI / 2) / step); return fleck(mix(stone, n === 0 ? 0xffffff : hash(n, 3, 1) < 0.5 ? 0 : 0xc0b0a0, n === 0 ? 0.25 : hash(n, 5, 2) * 0.16), 0.04, 2)(x, y, 0); }, { part: 1 });
    k.carve(c - fw, floor, u(3), c + fw, fs + rise, P + u(3), (x, y) => inOpen(x, y));
    // Inside: sooty brick, the cheeks splayed in towards the back, an iron fireback with a moon on it.
    const soot = (x, y) => { const i = vox(x), j = vox(y), course = Math.floor(j / 3), joint = j % 3 === 2 || (i + (course % 2) * 3) % 6 === 5; return mix(joint ? 0x1a1214 : mix(0x3a2420, 0x2a1c1c, hash(Math.floor((i + (course % 2) * 3) / 6), course, 4) > 0.5 ? 1 : 0), SOOT, Math.min(0.85, Math.floor(4 * (y / (fs + rise)) ** 1.5) / 4)); };
    k.shape(c - fw, floor, u(3), c + fw, fs + rise, u(5), (x, y) => inOpen(x, y), soot);
    k.shape(c - fw, floor, u(5), c + fw, fs + rise, P, (x, y, z) => inOpen(x, y) && !inOpen(x, y, fw * (0.78 + (0.22 * (z - u(5))) / (P - u(5)))), soot);
    k.shape(c - fw * 0.5, floor, u(5), c + fw * 0.5, 1.1, u(6), (x, y) => y < 0.8 + 0.2 * Math.cos(((x - c) / (fw * 0.5)) * (Math.PI / 2)), fleck(IRON, 0.06, 2));
    k.shape(c - 0.14, 0.5, u(6), c + 0.14, 0.8, u(7), (x, y) => Math.hypot(x - c, y - 0.64) < 0.12 && Math.hypot(x - c - 0.05, y - 0.67) > 0.1, 0x3e3438);
    // Hearthstones: three flags, worn pale in front of the fire, sooty inside it.
    const slabs = [0, 0.3, 0.7, 1].map((t) => u(2) + t * (W - u(4)));
    for (let s = 0; s < 3; s++) {
      const c0 = mix(shade(stone, 0.18), 0xa09080, r() * 0.25);
      k.box(slabs[s] + (s ? u(1) : 0), 0, 0, slabs[s + 1], floor, D, (x, y, z) => (z < P && Math.abs(x - c) < fw ? 0x2a2224 : Math.abs(x - c) < fw * 1.1 && z < P + 0.3 ? tint(c0, 0.1) : fleck(c0, 0.05, 3)(x, y, z)), { round: u(2) });
    }
    // The mantel: an oak beam on carved corbels, a bead under its front edge.
    k.box(0, Hs, 0, W, Mt, P + u(4), grain(look.wood, 0, 0.1), { round: u(2), axis: "x" });
    k.box(xb + u(2), Hs - u(2), P - u(1), W - xb - u(2), Hs, P + u(2), shade(look.wood, 0.3));
    for (const x0 of [xb + u(3), W - xb - u(12)]) k.shape(x0, Hs - 0.34, P - u(1), x0 + u(9), Hs - u(2), P + u(4), (x, y, z) => z <= P - u(1) + u(5) * ((y - (Hs - 0.34)) / 0.32) ** 1.3, fleck(tint(stone, 0.12), 0.04, 2));
    // Firedogs, a bed of ash and embers, three logs charred and glowing underneath,
    // and the flames in tongues, hottest at the heart.
    for (const s of [-1, 1]) {
      const x = snap(c + s * fw * 0.62);
      k.post(x, P - u(3), u(2), floor, 0.36, IRON);
      k.ball(x, 0.38, P - u(3), u(2), u(2.4), u(2), copper ? 0xb87040 : BRASS);
      k.box(x - u(1), 0.12, u(6), x + u(1), 0.12 + u(2), P - u(3), IRON);
      k.box(x - u(3), floor, P - u(5), x + u(3), floor + u(1), P - u(1), IRON);
    }
    const bed = (x, z, s = 1) => ((x - c) / (fw * 0.78 * s)) ** 2 + ((z - 0.34) / (0.2 * s)) ** 2 < 1;
    k.shape(c - fw, floor, u(6), c + fw, floor + u(1), P, (x, y, z) => bed(x, z), fleck(0x6a6064, 0.12, 1));
    k.shape(c - fw, floor, u(6), c + fw, floor + u(2), P, (x, y, z) => bed(x, z, 0.8) && hash(vox(x), vox(y), vox(z)) < 0.6, (x, y, z) => EMBER[Math.floor(hash(vox(x), vox(z), 9) * 3)], { glow: true });
    const logs = [[[c - fw * 0.8, 0.2, 0.26], [c + fw * 0.76, 0.19, 0.29], 0.075], [[c - fw * 0.72, 0.19, 0.46], [c + fw * 0.82, 0.2, 0.43], 0.07], [[c - fw * 0.42, 0.33, 0.33], [c + fw * 0.46, 0.35, 0.38], 0.06]];
    for (const [a, b, rr] of logs) {
      log(k, a, b, rr);
      k.shape(Math.min(a[0], b[0]), Math.min(a[1], b[1]) - rr, Math.min(a[2], b[2]) - rr, Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2]) + rr, (x, y, z) => {
        const t = (x - a[0]) / (b[0] - a[0]), py = a[1] + (b[1] - a[1]) * t, pz = a[2] + (b[2] - a[2]) * t;
        return t > 0.08 && t < 0.92 && (y - py) ** 2 + (z - pz) ** 2 <= rr * rr && y < py - rr * 0.35 && hash(vox(x), vox(y), vox(z)) < 0.75;
      }, (x, y, z) => EMBER[Math.floor(hash(vox(x), vox(y), 2) * 3)], { glow: true });
    }
    const tall = copper ? 1 : 0.9, tongues = [[-0.5, 0.3, 0.42, 0.1, 1], [0.48, 0.32, 0.4, 0.09, 2], [-0.22, 0.32, 0.64, 0.13, 3], [0.22, 0.31, 0.58, 0.12, 4], [0.02, 0.3, 0.78, 0.15, 5], [-0.34, 0.44, 0.32, 0.075, 6], [0.3, 0.45, 0.36, 0.08, 7], [0, 0.47, 0.42, 0.09, 8]];
    for (const [dx, z0, h0, r0, ph] of tongues) {
      const x0 = c + dx * fw, y0 = 0.22, h = h0 * tall, rz = 0.72;
      k.shape(x0 - r0 - 0.08, y0, z0 - r0, x0 + r0 + 0.08, y0 + h, z0 + r0, (x, y, z) => {
        const t = (y - y0) / h, cx = x0 + 0.05 * Math.sin(t * 4.2 + ph) * t, w = r0 * (1 - t) ** 0.8 * (0.86 + 0.14 * Math.sin(t * 13 + ph * 2)) * (t < 0.15 ? 0.75 + t * 1.6 : 1);
        return ((x - cx) / w) ** 2 + ((z - z0) / (w * rz)) ** 2 <= 1;
      }, (x, y, z) => {
        const t = (y - y0) / h, cx = x0 + 0.05 * Math.sin(t * 4.2 + ph) * t, d = Math.abs(x - cx) / Math.max(u(1), r0 * (1 - t) ** 0.8);
        return t > 0.78 ? FLAME[3] : d > 0.7 || t > 0.6 ? FLAME[2] : d > 0.38 || t > 0.38 ? FLAME[1] : FLAME[0];
      }, { glow: true });
    }
    for (let i = 0; i < 6; i++) { const x = c + (r() - 0.5) * fw * 1.2, y = 0.6 + r() * 0.5 * tall, z = 0.3 + r() * 0.15; k.box(x, y, z, x + u(1), y + u(1), z + u(1), FLAME[1], { glow: true }); }
    // Logs stacked on the hearth, cut ends to the room.
    const lx = W - xb - 0.62;
    [[0.07, 0], [0.2, 0], [0.33, 0], [0.46, 0], [0.135, 1], [0.265, 1], [0.395, 1], [0.2, 2], [0.33, 2]].forEach(([dx, row]) => log(k, [lx + dx, floor + 0.065 + row * 0.113, P + u(2)], [lx + dx, floor + 0.065 + row * 0.113, P + 0.5 + hash(row, dx * 100, 1) * 0.06], 0.065));
    const lights = [{ x: c, y: 0.7, z: 1.1, color: 0xff8a3a, intensity: 12 }];
    if (copper) copperHood(k, { W, H, c, P, Hs, Mt, xb, look });
    else {
      // An iron crane swung out over the fire, a cauldron of stew on its hook,
      // hung high enough that the flames lick round its belly.
      const px = snap(c - fw * 0.8), arm = 1.34, pot = [snap(c + 0.04), snap(0.36)], y0 = 0.72, y1 = 1, bail = y1 + 0.04;
      k.post(px, u(9), u(2), floor, arm + u(2), IRON);
      k.cyl([px, arm, u(9)], [pot[0], arm, pot[1]], u(1.2), IRON);
      k.cyl([px, arm - 0.4, u(9)], [px + (pot[0] - px) * 0.55, arm, u(9) + (pot[1] - u(9)) * 0.55], u(1), IRON);
      for (const y of [0.3, 0.9]) k.box(px - u(2), y, u(7), px + u(2), y + u(2), u(11), IRON);
      k.post(pot[0], pot[1], u(1), bail + 0.1, arm, IRON);
      k.lathe(pot[0], pot[1], y0, y1, [[0, 0.1], [0.15, 0.18], [0.45, 0.23], [0.8, 0.21], [0.9, 0.18], [1, 0.2]], (x, y, z) => (x < pot[0] - 0.08 && z > pot[1] + 0.08 && y > y0 + 0.08 ? 0x3a3438 : y > y1 - u(2) ? 0x2e2a30 : 0x1e1a1e));
      k.carve(pot[0] - 0.2, y1 - u(2), pot[1] - 0.2, pot[0] + 0.2, y1 + u(1), pot[1] + 0.2, (x, y, z) => Math.hypot(x - pot[0], z - pot[1]) < 0.17);
      k.lathe(pot[0], pot[1], y1 - u(3), y1 - u(2), 0.18, (x, y, z) => (hash(vox(x), 1, vox(z)) < 0.12 ? 0xe8a050 : 0xc87838), { glow: true });
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI, b = ((i + 1) / 10) * Math.PI; k.cyl([pot[0] - 0.22 * Math.cos(a), bail + 0.08 * Math.sin(a), pot[1]], [pot[0] - 0.22 * Math.cos(b), bail + 0.08 * Math.sin(b), pot[1]], u(0.8), IRON); }
      for (const s of [-1, 1]) k.box(pot[0] + s * 0.22 - u(1), y1 - 0.06, pot[1] - u(1), pot[0] + s * 0.22 + u(1), bail, pot[1] + u(1), IRON);
      for (const s of [-1, 0, 1]) k.post(snap(pot[0] + s * 0.07), snap(pot[1] + (s ? -0.04 : 0.07)), u(2), y0 - 0.04, y0 + u(1), 0x1e1a1e);
      // Hung under the mantel's left end, a ladle and a toasting fork; bellows on a nail to the right.
      for (const [x, len, fork] of [[xb + 0.22, 0.42, false], [xb + 0.36, 0.5, true]]) {
        k.post(snap(x), snap(P + u(2)), u(1), Hs - u(4), Hs, IRON);
        k.post(snap(x), snap(P + u(2)), u(1.2), Hs - u(4) - len, Hs - u(4), fork ? IRON : 0xb87040);
        if (fork) for (const s of [-1, 1]) k.box(snap(x) + s * u(1.5) - u(0.5), Hs - u(4) - len - 0.08, snap(P + u(2)) - u(0.5), snap(x) + s * u(1.5) + u(0.5), Hs - u(4) - len, snap(P + u(2)) + u(0.5), IRON);
        else k.ball(snap(x), Hs - u(4) - len, snap(P + u(2)) + u(1), 0.06, 0.04, 0.05, 0xb87040);
      }
      const bx = c + fw + (W / 2 - fw - xb) / 2 + 0.02, bel = (x, y) => { const dy = y - 0.92; return dy > 0 ? (x - bx) ** 2 / 0.0169 + dy * dy / 0.0256 < 1 : Math.abs(x - bx) < 0.13 * (1 + dy / 0.24) && dy > -0.24; };
      k.shape(bx - 0.14, 0.66, P, bx + 0.14, 1.1, P + u(4), (x, y) => bel(x, y), (x, y, z) => (z < P + u(1) || z > P + u(3) ? grain(look.wood, 1, 0.1)(x, y, z) : 0x4a2a1c));
      k.carve(bx - 0.14, 0.66, P + u(1), bx + 0.14, 1.1, P + u(3), (x, y) => !bel((x - bx) * 1.12 + bx, (y - 0.92) * 1.06 + 0.92));
      k.cyl([bx, 0.7, P + u(2)], [bx, 0.56, P + u(2)], [u(1.6), u(0.9)], BRASS);
      k.box(bx - u(1), 1.07, P + u(1), bx + u(1), 1.2, P + u(3), grain(look.wood, 1));
      k.post(bx, P + u(2), u(1), 1.2, 1.24, IRON);
    }
    return { mantel: Mt, lights };
  });
  return assemble(main, [mantelpiece(W, P, copper), -W / 2, Mt, 0]);
}
// What stands on the mantel, finer than the hearth: jars, a pumpkin and candles
// in brass sticks on the stone one; bottles and a brass mortar and pestle in
// front of the copper hood. y = 0 is the mantel's top.
function mantelpiece(W, P, copper) {
  return fixture("mantel", [W, P, copper], { w: W, h: 0.56, d: P + 0.14, r: 64, at: [0, 0, 0] }, (k) => {
    const c = W / 2, f = W / 3.4;
    if (copper) {
      const z = P + 0.08;
      [[-1.2, 0x5a9a6a, "bottle"], [-0.9, 0x9d55e6, "stopper"], [0.95, 0xd8a83a, "bottle"], [1.25, 0xa8302a, "jar"]].forEach(([dx, fill, kind], i) => {
        if (Math.abs(dx) * 2 < W - 0.3) jar(k, c + dx * f, 0, z, { kind, h: 0.2 + (i % 2) * 0.05, r: 0.055, fill, glow: i === 1, label: i % 2 === 0 });
      });
      const mx = snap(c - 0.55 * f), mz = snap(P + 0.07);
      k.lathe(mx, mz, 0, 0.09, [[0, 0.045], [0.15, 0.04], [0.3, 0.062], [0.85, 0.07], [1, 0.072]], (x, y, z) => (x < mx - 0.02 && z > mz + 0.02 ? tint(BRASS, 0.3) : BRASS));
      k.carve(mx - 0.07, 0.05, mz - 0.07, mx + 0.07, 0.1, mz + 0.07, (x, y, z) => Math.hypot(x - mx, z - mz) < 0.055);
      k.cyl([mx, 0.04, mz], [mx + 0.05, 0.17, mz - 0.02], [u(1.5), u(2.2)], 0xd8c8a8);
      return {};
    }
    const jz = P / 2 + 0.06;
    [-1.2, -0.8, -0.42, 0.42, 0.8, 1.2].forEach((dx, i) => {
      const [fill, stuff] = CONTENTS[(i * 3 + 1) % CONTENTS.length];
      if (Math.abs(dx) * 2 < W - 0.4) jar(k, c + dx * f, 0, jz + (i % 2 ? 0.03 : -0.02), { kind: ["jar", "squat", "stopper", "jar", "bottle", "squat"][i], h: 0.24 + (i % 3) * 0.04, r: 0.075, fill, stuff, label: i % 2 === 1, cap: [0xa83a2a, 0x3a5a8a][i % 2] });
    });
    pumpkin(k, c, 0, jz, 0.13, 0xe0761e);
    pumpkin(k, c + 0.2, 0, jz + 0.08, 0.07, 0xe8e0d0);
    for (const x of [0.2, W - 0.2]) { k.lathe(snap(x), snap(jz), 0, 0.1, [[0, 0.06], [0.12, 0.055], [0.2, 0.02], [0.55, 0.016], [0.65, 0.028], [0.75, 0.016], [0.88, 0.022], [1, 0.045]], BRASS); candle(k, x, 0.1, jz, 0.2, 0.032); }
    return {};
  });
}
// The apothecary's copper hood: flared up to the ceiling in hammered sheets
// between standing seams, riveted straps and a little verdigris; pans and a
// ladle hung beside the fire, and a kettle on the hearth.
function copperHood(k, { W, H, c, P, Hs, Mt, xb, look }) {
  const cu = look.trim, y0 = Mt, span = H - y0, ease = (t) => 1 - (1 - t) ** 1.7;
  const half = (y) => { const t = Math.max(0, (y - y0) / span); return W / 2 - u(4) + (W * 0.17 - (W / 2 - u(4))) * ease(t); };
  const deep = (y) => { const t = Math.max(0, (y - y0) / span); return P - u(3) + (0.27 - (P - u(3))) * ease(t); };
  k.shape(c - W / 2, y0, 0, c + W / 2, H, P, (x, y, z) => Math.abs(x - c) <= half(y) && z <= deep(y), (x, y, z) => {
    const i = vox(x), j = vox(y) - vox(y0), row = Math.floor(j / 18), strap = j % 18 < 2, sheet = Math.floor((x - c) / 0.28), seam = (((x - c) % 0.28) + 0.28) % 0.28 < u(1);
    if (strap) return (i + j) % 4 === 0 ? tint(cu, 0.35) : shade(cu, 0.25);
    if (seam) return tint(cu, 0.2);
    if (hash(i >> 1, j >> 1, 7) < 0.035 && row < 2) return mix(cu, 0x5a9a80, 0.55);
    if (hash(i >> 1, j >> 1, 9) < 0.07) return tint(cu, 0.14);
    return scale(cu, 0.92 + 0.035 * row + [-0.04, 0, 0.04][Math.floor(hash(sheet, row, 5) * 3)]);
  });
  k.cyl([c - half(y0), y0 + u(2), deep(y0)], [c + half(y0), y0 + u(2), deep(y0)], u(2.5), tint(cu, 0.15));
  // Hung from hooks under the mantel either side of the opening: a frying pan, a saucepan and a ladle.
  const hang = (x, len) => { k.post(snap(x), snap(P + u(3)), u(1), Hs - u(5), Hs, IRON); k.post(snap(x), snap(P + u(3)), u(1.4), Hs - u(5) - len, Hs - u(5), shade(cu, 0.2)); return Hs - u(5) - len; };
  const pan = (x, rr, len) => {
    const y = hang(x, len) - rr;
    k.cyl([snap(x), y, P + u(2)], [snap(x), y, P + u(4)], rr, (px, py) => (Math.hypot(px - snap(x), py - y) > rr - u(1.5) ? tint(cu, 0.15) : shade(cu, 0.12)));
    k.cyl([snap(x), y, P + u(4)], [snap(x), y, P + u(5)], rr - u(1.5), shade(cu, 0.3));
  };
  pan(xb + 0.3, 0.16, 0.18);
  pan(W - xb - 0.24, 0.12, 0.14);
  const ly = hang(W - xb - 0.5, 0.4);
  k.ball(snap(W - xb - 0.5), ly, snap(P + u(3)) + u(1), 0.06, 0.045, 0.05, tint(cu, 0.1));
  // A kettle on the hearth.
  const kx = snap(xb + 0.36), kz = snap(P + 0.3), ky = u(3);
  k.lathe(kx, kz, ky, ky + 0.17, [[0, 0.1], [0.25, 0.14], [0.6, 0.14], [0.85, 0.1], [1, 0.07]], (x, y, z) => (x < kx - 0.04 && z > kz ? tint(cu, 0.3) : cu));
  k.lathe(kx, kz, ky + 0.17, ky + 0.2, [[0, 0.07], [1, 0.03]], shade(cu, 0.15));
  k.ball(kx, ky + 0.215, kz, u(1.5), u(1.5), u(1.5), IRON);
  k.cyl([kx + 0.11, ky + 0.07, kz], [kx + 0.22, ky + 0.17, kz], [u(2), u(1)], cu);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI, b = ((i + 1) / 8) * Math.PI; k.cyl([kx - 0.09 * Math.cos(a), ky + 0.2 + 0.1 * Math.sin(a), kz], [kx - 0.09 * Math.cos(b), ky + 0.2 + 0.1 * Math.sin(b), kz], u(1), IRON); }
}

// ── Shelves of jars, herbs, cobwebs, rafters and fairy lights ──

// The jars on a shelf: a run of kinds, sizes and contents from a seed, with the odd glowing one.
function jarRow(k, r, x0, x1, y, z, spacing, glowing = 0.12) {
  for (let x = x0 + spacing / 2; x < x1 - spacing * 0.4; x += spacing * (0.85 + r() * 0.3)) {
    const [fill, stuff] = CONTENTS[Math.floor(r() * CONTENTS.length)], kind = ["jar", "jar", "squat", "bottle", "stopper"][Math.floor(r() * 5)];
    jar(k, x, y, z, { kind, h: 0.2 + r() * 0.12, r: 0.07 + r() * 0.02, fill, stuff, level: 0.45 + r() * 0.35, glow: r() < glowing, label: r() < 0.45, cap: [0xa83a2a, 0x3a5a8a, 0x5a7a3a][Math.floor(r() * 3)] });
  }
}
export function jarShelf({ length = 4, rows = 2, seed = 1, gap = 0.8 } = {}, look = LOOK) {
  const L = length, br = 0.22, D = 0.4, H = br + (rows - 1) * gap + 0.5, top = 2 / RES, ys = Array.from({ length: rows }, (_, i) => br + i * gap);
  const main = fixture("jarShelf", [L, rows, gap, look], { w: L, h: H, d: D }, (k) => {
    const n = Math.max(2, Math.ceil(L / 1.6) + 1);
    for (const y of ys) {
      // The board, a moulded front edge, and brackets: an upright on the wall and a curved arm, pierced.
      k.box(0, y, 0, L, y + u(2), 0.34, grain(look.wood, 0, 0.1));
      k.box(0, y - u(1), 0.33, L, y + u(2), 0.36, shade(look.wood, 0.15), { round: u(1.5), axis: "x" });
      for (let i = 0; i < n; i++) {
        const x = snap(u(3) + (i * (L - u(6))) / (n - 1));
        k.shape(x - u(1), y - br, 0, x + u(1), y, 0.32, (px, py, pz) => pz <= u(2) + 0.28 * ((py - (y - br)) / br) ** 1.6 && Math.hypot(pz - 0.12, py - (y - 0.07)) > 0.035, grain(shade(look.wood, 0.1), 1));
      }
    }
    return { boards: ys.map((y) => y + u(2)) };
  });
  // The jars, and paper lace pinned along each board's edge, scalloped and pricked.
  const jars = fixture("shelfJars", [L, rows, seed, gap], { w: L, h: H, d: D, r: 48, at: [0, 0, 0] }, (k) => {
    const r = seeded(seed * 53 + rows);
    for (const y of ys) {
      k.shape(0, y - 0.11, 0.36, L, y, 0.36 + u(1), (x, py) => {
        const f = ((x % 0.1) + 0.1) % 0.1 - 0.05, edge = y - 0.06 - 0.045 * Math.sqrt(Math.max(0, 1 - (f / 0.05) ** 2));
        return py > edge && Math.hypot(f, py - (y - 0.06)) > u(1.2);
      }, (x, py) => (py > y - u(2) ? 0xd8ccb4 : 0xf0e8d8));
      jarRow(k, r, u(4), L - u(4), y + top, 0.17, 0.3);
    }
  });
  return assemble(main, [jars, -L / 2, 0, 0]);
}

// Bunches of herbs drying upside down on a pole hung from the ceiling: rosemary,
// sage, lavender, tansy and thyme bound with twine, a string of chillies and a garlic braid.
const HERBS = [[0x4a6a3a, 0x5a7a44, 0.1, 0.52], [0x7a8a68, 0x8a9a78, 0.13, 0.42], [0x6a7a5a, 0x7a5aa0, 0.1, 0.5], [0x5a7a3a, 0xd8b040, 0.13, 0.44], [0x5a7a4a, 0x6a8a5a, 0.11, 0.36]], HEMP = 0x8a6a44;
export function hangingHerbs({ length = 9, seed = 1 } = {}, look = LOOK) {
  const L = length, H = 1.05, D = 0.5;
  return fixture("herbs", [L, seed, look.wood], { w: L, h: H, d: D, r: 48 }, (k) => {
    const r = seeded(seed * 97 + 13), py = H - 0.2, pz = 0.25, n = Math.max(2, Math.round(L / 3) + 1);
    k.cyl([u(2), py, pz], [L - u(2), py, pz], 0.035, grain(look.wood, 0, 0.12));
    for (const x of [u(2), L - u(2)]) k.cyl([x, py, pz], [x + (x < 1 ? -u(1) : u(1)), py, pz], 0.035, tint(look.wood, 0.2));
    for (let i = 0; i < n; i++) {
      const x = snap(0.12 + (i * (L - 0.24)) / (n - 1));
      k.box(x - u(3), H - u(1.5), pz - u(3), x + u(3), H, pz + u(3), IRON, { round: u(1) });
      k.post(x, pz, u(1.6), py + 0.04, H, IRON);
      k.shape(x - u(1), py - 0.07, pz - 0.07, x + u(1), py + 0.05, pz + 0.07, (px, y, z) => Math.abs(Math.hypot(y - py, z - pz) - 0.05) < u(0.8) && y < py + u(1), IRON);
    }
    for (let x = 0.24, b = 0; x < L - 0.2; x += 0.4 + r() * 0.18, b++) {
      const bx = snap(x), tie = py - 0.1, type = Math.floor(r() * 7);
      k.shape(bx - u(1), py - 0.07, pz - 0.07, bx + u(1), py + 0.07, pz + 0.07, (px, y, z) => Math.abs(Math.hypot(y - py, z - pz) - 0.042) < u(0.7), HEMP);
      if (type === 5) {
        // Chillies on a string, pointing every way.
        const len = 0.5 + r() * 0.12;
        k.post(bx, pz, u(1), tie - len, py - 0.04, HEMP);
        for (let j = 0; j < 9; j++) {
          const y = tie - 0.04 - j * (len / 9), a = j * 2.4 + b, dx = Math.cos(a) * 0.07, dz = Math.sin(a) * 0.05;
          k.cyl([bx, y, pz], [bx + dx, y - 0.07, pz + dz], [u(1.4), u(0.6)], j % 3 ? 0xb83a20 : 0xd04a28);
          k.box(bx - u(0.5), y - u(0.5), pz - u(0.5), bx + u(0.5), y + u(0.5), pz + u(0.5), 0x4a6a2a);
        }
        continue;
      }
      if (type === 6) {
        // A garlic braid: plaited stalks, bulbs in pairs down it.
        const len = 0.45;
        k.cyl([bx, py - 0.04, pz], [bx, tie - len, pz], u(1.6), (px, y) => ((vox(y) >> 1) % 2 ? 0xc8b888 : 0xa89868));
        for (let j = 0; j < 6; j++) {
          const y = tie - 0.06 - j * 0.07, s = j % 2 ? 1 : -1;
          k.ball(bx + s * 0.035, y, pz + 0.02, 0.042, 0.04, 0.042, (px, yy, z) => (hash(Math.floor(Math.atan2(z - pz, px - bx) * 4), j, 3) < 0.25 ? 0xb898a8 : yy > y + 0.025 ? 0xd8d0b8 : 0xece4d0));
        }
        continue;
      }
      // A bunch: sprigs fanning down from where the twine binds them, leaves
      // drooping along each, flower heads at the tips of lavender and tansy.
      const [leaf, head, rmax, len0] = HERBS[type], len = len0 * (0.85 + r() * 0.3), top = tie - 0.03, sprigs = 7;
      k.post(bx, pz, u(1), tie, py - 0.04, HEMP);
      k.lathe(bx, pz, tie - 0.06, tie + u(2), [[0, 0.026], [1, 0.02]], (px, y) => (vox(y) % 3 ? 0x6a5a34 : 0x7a6a3c));
      k.lathe(bx, pz, tie - 0.045, tie - 0.015, 0.03, (px, y) => (vox(y) % 2 ? HEMP : shade(HEMP, 0.2)));
      for (let i = 0; i < sprigs; i++) {
        const a = (i / sprigs) * Math.PI * 2 + r() * 0.6, spread = rmax * (0.45 + 0.55 * r()), end = [bx + Math.cos(a) * spread, top - len * (0.75 + r() * 0.25), pz + Math.sin(a) * spread * 0.7];
        const at = (t) => [bx + (end[0] - bx) * t ** 0.7, top + (end[1] - top) * t, pz + (end[2] - pz) * t ** 0.7];
        k.cyl(at(0), at(1), u(0.7), 0x5a6a3a);
        const leaves = type === 3 ? 3 : 5;
        for (let j = 1; j <= leaves; j++) {
          const t = 0.2 + (0.8 * j) / leaves, [x, y, z] = at(t), c = hash(i, j, b) < 0.3 ? shade(leaf, 0.15) : hash(i, j, b + 1) < 0.3 ? tint(leaf, 0.12) : leaf;
          if (type === 2 && t > 0.55) k.ball(x, y, z, u(1.6), u(3), u(1.6), hash(i, j, 4) < 0.5 ? head : tint(head, 0.18));
          else k.ball(x, y, z, u(type === 1 ? 2.4 : 1.7), u(type === 1 ? 3.2 : 2.6), u(type === 1 ? 1.6 : 1.4), c);
        }
        if (type === 3) k.ball(end[0], end[1] - u(1), end[2], u(2.4), u(1.6), u(2.4), hash(i, 2, b) < 0.5 ? head : tint(head, 0.2));
      }
    }
  });
}

// A cobweb strung across a top corner: spokes from the corner and sagging
// threads, bellying out from the wall, a few broken, a spider dangling from one.
export function cobweb({ size = 1.1, flip = false } = {}, look = LOOK) {
  const S = size, D = S * 0.32 + 0.05;
  return fixture("cobweb", [S, flip, look.wall], { w: S + 0.04, h: S + 0.02, d: D, r: 48, at: [flip ? S + 0.04 : 0, 0, 0] }, (k) => {
    const r = seeded(Math.round(S * 100) + (flip ? 7 : 0)), silk = mix(0xe0dcea, look.wall ?? 0x808080, 0.18), X = (x) => (flip ? S + 0.04 - x : x);
    const at = (a, d) => [X(u(1) + d * Math.cos(a)), S - d * Math.sin(a), u(1) + S * 0.28 * Math.sin((Math.PI * d) / (S * 1.05)) * (0.35 + 0.65 * Math.sin(2 * a))];
    const thread = (p, q) => k.cyl(p, q, u(0.55), silk);
    const spokes = [0.05, 0.36, 0.68, 0.98, 1.27, 1.52].map((a) => [a, S * (0.8 + r() * 0.2)]);
    for (const [a, len] of spokes) for (let i = 0; i < 10; i++) thread(at(a, (len * i) / 10), at(a, (len * (i + 1)) / 10));
    for (const ring of [0.2, 0.36, 0.52, 0.68, 0.82]) for (let s = 0; s + 1 < spokes.length; s++) {
      if (r() < 0.12) continue;
      const [a0] = spokes[s], [a1] = spokes[s + 1], d = ring * S;
      for (let i = 0; i < 4; i++) { const t0 = i / 4, t1 = (i + 1) / 4, sag = (t) => d * (1 - 0.14 * Math.sin(Math.PI * t)); thread(at(a0 + (a1 - a0) * t0, sag(t0)), at(a0 + (a1 - a0) * t1, sag(t1))); }
    }
    // A torn strand hanging loose, and the spider on a thread of its own.
    const tear = at(0.52, S * 0.84);
    thread(tear, [tear[0] + (flip ? -1 : 1) * 0.05, tear[1] - 0.16, tear[2]]);
    const p = at(0.82, S * 0.58), end = [p[0], p[1] - S * 0.22, p[2]];
    thread(p, end);
    k.ball(end[0], end[1] - u(2), end[2], u(2.2), u(2.6), u(2.2), 0x2a1a2a);
    k.ball(end[0], end[1] - u(5.5), end[2], u(3.2), u(3.6), u(3), 0x3a2236);
    for (const s of [-1, 1]) for (let j = 0; j < 4; j++) {
      const y = end[1] - u(2.5) - (j - 1.5) * u(1.5), kx = end[0] + s * u(5), ky = y + u(2.5) - j * u(1.2);
      k.cyl([end[0], y, end[2]], [kx, ky, end[2] + u(1)], u(0.55), 0x2a1a2a);
      k.cyl([kx, ky, end[2] + u(1)], [kx + s * u(2), ky - u(4), end[2] + u(1)], u(0.55), 0x2a1a2a);
    }
  });
}

// String lights in swags pinned along a wall: a dark twisted wire and bulbs
// that glow, gold, lilac and amber in turn.
export function fairyLights({ length = 9.6, seed = 1, sag = 0.22 } = {}) {
  const L = length, n = Math.max(1, Math.round(L / 1.2)), s = L / n, H = sag + 0.17, D = 0.12;
  return fixture("fairyLights", [L, seed, sag], { w: L, h: H, d: D, r: 48 }, (k) => {
    const top = H - u(2), wz = snap(0.05), bulbs = [0xffd894, 0xc89cff, 0xffc46a, 0xffe8b0], first = Math.floor(seeded(seed)() * 4);
    for (let i = 0; i <= n; i++) k.box(i * s - u(1.5), top - u(1.5), 0, i * s + u(1.5), top + u(1.5), wz + u(1.5), BRASS);
    for (let i = 0; i < n; i++) {
      const y = (t) => top - sag * Math.sin(Math.PI * t);
      for (let j = 0; j < 14; j++) k.cyl([i * s + (j / 14) * s, y(j / 14), wz], [i * s + ((j + 1) / 14) * s, y((j + 1) / 14), wz], u(0.6), 0x2a3a24);
      [0.17, 0.39, 0.61, 0.83].forEach((t, b) => {
        const x = snap(i * s + t * s), yy = y(t);
        k.box(x - u(1), yy - u(3), wz - u(1), x + u(1), yy, wz + u(1), 0x2a3a24);
        k.ball(x, yy - u(6), wz, u(2.6), u(3.6), u(2.6), bulbs[(first + i * 4 + b) % 4], { glow: true });
      });
    }
    // One light for the whole string: the room's pool of lights is small, and the bulbs glow by themselves.
    return { lights: [{ x: L / 2, y: top - sag, z: 0.4, color: 0xffd8a0, intensity: 4 }] };
  });
}

// A tie beam across the room, hewn square with chamfered arrises, checks in
// its face and pegged knee braces down to posts on the walls.
export function rafter({ span = 10, drop = 1 } = {}, look = LOOK) {
  const W = span + 0.5, H = drop + 0.3, D = 0.34;
  return fixture("rafter", [span, drop, look.dark], { w: W, h: H, d: D }, (k) => {
    const r = seeded(Math.round(span * 10) + 3), wood = grain(look.dark, 0, 0.14, 11), light = tint(look.dark, 0.1);
    k.box(0, drop, 0, W, H, 0.3, wood, { round: u(2.5), axis: "x" });
    for (let i = 0; i < span * 1.2; i++) { const x = 0.3 + r() * (W - 1), y = drop + u(2) + Math.floor(r() * 5) * u(1.5); k.carve(x, y, 0.3 - u(1), x + 0.3 + r() * 0.8, y + u(1), 0.3); }
    k.sym((X) => {
      k.box(X(0.25), 0, 0.03, X(0.45), drop, 0.27, grain(look.dark, 1, 0.14, 11), { round: u(1.5), axis: "y" });
      k.shape(Math.min(X(0.4), X(1.5)), 0.3, 0.05, Math.max(X(0.4), X(1.5)), drop + u(1), 0.25, (x, y) => {
        const ax = Math.abs(x - X(0)), dy = drop - 0.3, t = ((ax - 0.42) * 1.05 + (y - 0.32) * dy) / (1.05 * 1.05 + dy * dy), px = 0.42 + t * 1.05, py = 0.32 + t * dy;
        return t >= 0 && Math.hypot(ax - px, y - py) < 0.065;
      }, grain(shade(look.dark, 0.08), 1, 0.12));
      for (const [x, y] of [[0.35, 0.42], [0.35, drop - 0.1], [1.3, drop + 0.15]]) k.cyl([X(x), y, 0.3 - u(1)], [X(x), y, 0.3 + u(1)], u(1.6), light);
    });
    k.post(snap(W / 2), snap(0.15), u(1.5), drop - 0.12, drop, IRON);
    k.shape(W / 2 - 0.05, drop - 0.2, 0.13, W / 2 + 0.05, drop - 0.1, 0.17, (x, y) => Math.abs(Math.hypot(x - W / 2 - 0.025, y - (drop - 0.15)) - 0.03) < u(0.8) && !(x > W / 2 + 0.03 && y > drop - 0.15), IRON);
    return { beam: { bottom: drop, top: H } };
  });
}

// ── The chandelier and the windows ──

// A chandelier: a ceiling rose, a chain, a turned stem with a dish and a drop
// finial, and S-scrolled arms out to candles. The manor's is iron and gold with
// a crown of spikes; the celestial bedroom's is brass, with a crescent moon at
// its heart and stars hung from the arms.
export function chandelier({ style = "manor", chain = 0.55 } = {}, look = LOOK) {
  const celestial = style === "celestial", R0 = 0.52, W = 2 * R0 + 0.2, H = chain + 1.02;
  return fixture("chandelier", [style, chain, look.trim], { w: W, h: H, d: W, r: 48, at: [W / 2, H, W / 2] }, (k) => {
    const c = W / 2, gold = look.trim ?? BRASS, metal = celestial ? gold : IRON, yb = H - chain, ya = yb - 0.34, arms = 8;
    k.lathe(c, c, H - u(3), H, [[0, 0.05], [0.5, 0.1], [1, 0.12]], gold);
    for (let i = 0, y = H - u(3); y - 0.05 > yb - 0.02; i++, y -= 0.042) {
      const m = y - 0.028;
      k.shape(c - 0.03, y - 0.058, c - 0.03, c + 0.03, y, c + 0.03, (x, yy, z) => {
        const a = i % 2 ? x - c : z - c, b = i % 2 ? z - c : x - c, e = (a / 0.021) ** 2 + ((yy - m) / 0.03) ** 2;
        return Math.abs(b) < u(0.6) && e <= 1.3 && e >= 0.2;
      }, metal);
    }
    k.lathe(c, c, ya + 0.02, yb, [[0, 0.05], [0.12, 0.08], [0.25, 0.05], [0.45, 0.035], [0.62, 0.06], [0.78, 0.035], [0.9, 0.05], [1, 0.03]], metal);
    k.lathe(c, c, ya - 0.06, ya + 0.04, [[0, 0.06], [0.5, 0.15], [0.8, 0.17], [1, 0.12]], gold);
    k.lathe(c, c, ya - 0.34, ya - 0.06, [[0, 0], [0.25, 0.035], [0.55, 0.06], [0.8, 0.04], [1, 0.07]], celestial ? gold : metal);
    k.ball(c, ya - 0.36, c, u(1.6), u(1.6), u(1.6), gold);
    const lights = [{ x: c, y: ya + 0.25, z: c, color: 0xffd090, intensity: 10 }];
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2 + Math.PI / arms, dx = Math.cos(a), dz = Math.sin(a), pts = [];
      // An S-scroll: out and down from the dish, then up to the candle cup.
      for (let s = 0; s <= 8; s++) {
        const t = s / 8, q = 1 - t, rr = q ** 3 * 0.08 + 3 * q * q * t * 0.22 + 3 * q * t * t * 0.4 + t ** 3 * R0, yy = q ** 3 * ya + 3 * q * q * t * (ya - 0.13) + 3 * q * t * t * (ya - 0.1) + t ** 3 * (ya + 0.06);
        pts.push([c + dx * rr, yy, c + dz * rr]);
      }
      for (let s = 0; s < 8; s++) k.cyl(pts[s], pts[s + 1], u(1.2), metal);
      const x = c + dx * R0, z = c + dz * R0, cup = ya + 0.06;
      k.lathe(snap(x), snap(z), cup, cup + u(1.5), 0.05, gold);
      k.lathe(snap(x), snap(z), cup + u(1.5), cup + 0.05, [[0, 0.02], [1, 0.03]], gold);
      candle(k, x, cup + 0.05, z, 0.15 + (i % 3) * 0.02, 0.024);
      if (celestial) {
        // A star on a thread from the arm's lowest point.
        const p = pts[3], sy = p[1] - 0.16;
        k.post(snap(p[0]), snap(p[2]), u(0.8), sy, p[1], 0xb8a8d8);
        for (const [ax, ay, az] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) k.box(snap(p[0]) - (ax ? 0.035 : u(0.6)), sy - (ay ? 0.035 : u(0.6)), snap(p[2]) - (az ? 0.035 : u(0.6)), snap(p[0]) + (ax ? 0.035 : u(0.6)), sy + (ay ? 0.035 : u(0.6)), snap(p[2]) + (az ? 0.035 : u(0.6)), 0xe8dcff, { glow: true });
      } else {
        // The crown: a ring between the arms, with gilt spikes standing on it.
        const sp = [c + Math.cos(a + Math.PI / arms) * R0 * 0.72, c + Math.sin(a + Math.PI / arms) * R0 * 0.72];
        k.cyl([snap(sp[0]), ya - 0.02, snap(sp[1])], [snap(sp[0]), ya + 0.1, snap(sp[1])], [u(1.4), u(0.5)], gold);
      }
    }
    if (celestial) {
      // A crescent moon hung under the finial, lit from within.
      const my = ya - 0.52;
      k.post(c, c, u(1), my + 0.1, ya - 0.36, gold);
      k.shape(c - 0.13, my - 0.13, c - u(1.5), c + 0.13, my + 0.13, c + u(1.5), (x, y) => Math.hypot(x - c, y - my) < 0.12 && Math.hypot(x - c - 0.055, y - my - 0.035) > 0.095, (x, y) => (Math.hypot(x - c, y - my) > 0.105 ? 0xf8e8b0 : 0xf0d890), { glow: true });
      k.shape(c - 0.4, ya - 0.05, c - 0.4, c + 0.4, ya + 0.01, c + 0.4, (x, y, z) => Math.abs(Math.hypot(x - c, z - c) - R0 * 0.72) < u(0.8), gold);
    } else k.shape(c - 0.4, ya - 0.04, c - 0.4, c + 0.4, ya + 0.02, c + 0.4, (x, y, z) => Math.abs(Math.hypot(x - c, z - c) - R0 * 0.72) < u(1.2), metal);
    return { lights };
  });
}

// A curtain hung from xo (its outer edge) to xi along the rail: a solid fall of
// cloth, flat behind (where nobody sees it, so it meshes cheaply), its front in folds, gathered towards xo at the tie (to `gather` of
// its width, the folds bunching deeper) and flaring loose below it.
function curtain(k, xo, xi, top, bottom, z0, colour, tieY, gather) {
  const s = Math.sign(xi - xo), full = Math.abs(xi - xo), folds = Math.max(3, Math.round(full / 0.11));
  const width = (y) => full * (y >= tieY ? gather + (1 - gather) * ((y - tieY) / (top - tieY)) ** 1.6 : Math.min(0.8, gather * (1 + (1.3 * (tieY - y)) / (tieY - bottom))));
  // Evaluated in bands six voxels tall, so the folds run straight within a band and its faces merge.
  const fold = (x, y) => { const w = width((Math.floor(vox(y) / 6) + 0.5) * u(6)), t = ((x - xo) * s) / w; return t < 0 || t > 1 ? null : { f: (1 - Math.cos(t * folds * 2 * Math.PI)) / 2, deep: Math.min(2.4, full / w), t }; };
  k.shape(Math.min(xo, xi), bottom, z0 - 0.02, Math.max(xo, xi), top, z0 + 0.22, (x, y, z) => {
    const p = fold(x, y);
    return !!p && y > bottom + 0.03 * p.f && z - z0 <= 0.03 + 0.04 * p.deep * p.f;
  }, (x, y) => { const p = fold(x, y); return scale(colour, p ? [0.6, 0.74, 0.88, 1.02][Math.min(3, Math.floor(p.f * 4))] : 0.6); });
}
// The dressing for a window opening of `width` in the back wall: a moulded sill
// on corbels, candles in brass sticks on it, and curtains hung from a pole,
// tied back with a gold cord and tassel under a valance shaped to the window.
export function windowDressing({ width = 1.375, kind = "round", candles = false, curtains = null, bottom = 1.625, top = 3.875 } = {}, look = LOOK) {
  const hw = width / 2, reach = hw + (curtains ? 0.5 : 0.24), W = 2 * reach, H = top + 0.48, D = 0.42;
  return fixture("window", [width, kind, !!candles, curtains, bottom, top, look.trim, look.dark], { w: W, h: H, d: D, r: 48 }, (k) => {
    const c = W / 2, trim = look.trim, yS = bottom - u(2), lights = [];
    k.box(c - hw - 0.19, yS - u(4), 0, c + hw + 0.19, yS, 0.3, grain(trim, 0, 0.08), { round: u(2), axis: "x" });
    k.box(c - hw - 0.12, yS - u(6), 0, c + hw + 0.12, yS - u(4), 0.22, shade(trim, 0.2), { round: u(1.5), axis: "x" });
    k.box(c - hw - 0.04, yS - u(12), 0, c + hw + 0.04, yS - u(6), u(3), mix(trim, look.dark, 0.3));
    k.sym((X) => {
      const x0 = Math.min(X(c - hw - 0.15), X(c - hw - 0.05)), x1 = Math.max(X(c - hw - 0.15), X(c - hw - 0.05)), xm = (x0 + x1) / 2;
      k.shape(x0, yS - 0.34, 0, x1, yS - u(4), 0.26, (x, y, z) => {
        const t = (y - (yS - 0.34)) / 0.3;
        if (kind === "square") return z <= 0.18;
        if (kind === "gothic") return z <= 0.04 + 0.2 * t && Math.abs(x - xm) <= 0.05 * Math.min(1, t * 2.5);
        return z <= 0.03 + 0.21 * t ** 1.4 && Math.hypot(z - 0.1, y - (yS - 0.14)) > 0.035;
      }, grain(tint(trim, 0.08), 1));
    });
    if (candles) {
      for (const [dx, h] of [[-(hw - 0.15), 0.2], [hw - 0.15, 0.26]]) {
        const x = snap(c + dx), z = snap(0.15);
        k.lathe(x, z, yS, yS + 0.13, [[0, 0.055], [0.12, 0.048], [0.22, 0.018], [0.5, 0.016], [0.6, 0.03], [0.7, 0.016], [0.88, 0.02], [1, 0.045]], BRASS);
        candle(k, x, yS + 0.13, z, h, 0.032);
      }
      candle(k, c - hw * 0.35, yS, 0.2, 0.09, 0.05);
      k.shape(c - hw * 0.35 - 0.1, yS, 0.12, c - hw * 0.35 + 0.1, yS + u(1), 0.3, (x, y, z) => Math.hypot(x - (c - hw * 0.35), (z - 0.2) * 1.3) < 0.08, tint(WAX, 0.15));
      k.box(c - hw * 0.35 + 0.02, yS - 0.09, 0.29, c - hw * 0.35 + 0.02 + u(1.5), yS, 0.3 + u(1), tint(WAX, 0.15));
      lights.push({ x: c, y: yS + 0.55, z: 0.55, color: 0xffc070, intensity: 5 });
    }
    if (curtains) {
      const yP = top + 0.24, zP = 0.2, velvet = (x, y, z) => { const t = Math.min(1, Math.max(0, (z - 0.11) / 0.16)); return scale(curtains, [0.62, 0.78, 0.92, 1.06][Math.min(3, Math.floor(t * 4))]); };
      k.cyl([u(1), yP, zP], [W - u(1), yP, zP], u(1.6), look.dark);
      k.sym((X) => {
        k.ball(X(u(3)), yP, zP, u(3), u(3), u(3), BRASS);
        k.box(X(0.14) - u(1), yP - u(1), 0, X(0.14) + u(1), yP + u(1), zP, IRON);
        const ty = (bottom + top) / 2 - 0.3, xo = X(0.05), full = c - hw + 0.08 - 0.05, gx = full * 0.34;
        curtain(k, xo, X(c - hw + 0.08), yP - u(2), yS - 0.2, zP - 0.04, curtains, ty, 0.34);
        // The tie-back: a gold cord round the gathered cloth to a hook on the wall, and its tassel.
        k.shape(Math.min(X(0.01), X(gx + 0.1)), ty - u(1.5), 0, Math.max(X(0.01), X(gx + 0.1)), ty + u(1.5), zP + 0.16, (x, y, z) => {
          const d = Math.abs(x - xo);
          return d <= gx + 0.04 && z >= zP - 0.06 && z <= zP - 0.04 + 0.03 + 0.1 * Math.sqrt(Math.max(0, 1 - ((d - gx / 2) / (gx / 2 + 0.04)) ** 2)) + u(1.5) && z >= zP + 0.06 * Math.sqrt(Math.max(0, 1 - ((d - gx / 2) / (gx / 2 + 0.04)) ** 2)) - 0.02;
        }, (x, y) => (vox(x) % 3 ? BRASS : tint(BRASS, 0.25)));
        const tx = snap(X(gx * 0.55)), tz = snap(zP + 0.12);
        k.cyl([tx, ty, tz], [tx, ty - 0.06, tz], u(0.8), BRASS);
        k.lathe(tx, tz, ty - 0.2, ty - 0.05, [[0, 0.03], [0.55, 0.024], [0.75, 0.013], [0.85, 0.013], [0.92, 0.022], [1, 0.016]], (x, y) => (vox(y) % 2 ? BRASS : tint(BRASS, 0.2)));
      });
      if (kind !== "square") {
        const nS = kind === "gothic" ? 5 : 3, sw = (W - 0.1) / nS, hem = (x) => { const f = ((x - 0.05) % sw) / sw; return kind === "gothic" ? yP - 0.14 - 0.14 * (1 - Math.abs(f * 2 - 1)) : yP - 0.1 - 0.17 * Math.sin(Math.PI * f); };
        k.shape(0.05, yP - 0.34, 0.24, W - 0.05, yP + 0.08, 0.32, (x, y, z) => y >= hem(x) && Math.abs(z - (0.28 + 0.012 * Math.sin((x / 0.07) * Math.PI))) <= u(1), (x, y) => (y < hem(x) + u(2) ? BRASS : velvet(x, y, 0.2 + 0.1 * Math.sin((x / 0.07) * Math.PI))));
        k.shape(0.05, yP - 0.38, 0.27, W - 0.05, yP - 0.08, 0.3, (x, y) => y < hem(x) && y > hem(x) - (vox(x) % 2 ? u(2) : u(1)), tint(BRASS, 0.1));
      } else for (let x = 0.12; x < W - 0.1; x += 0.1) k.shape(x - 0.03, yP - 0.04, zP - 0.04, x + 0.03, yP + 0.04, zP + 0.04, (px, y, z) => Math.abs(px - x) < u(0.8) && Math.abs(Math.hypot(y - yP, z - zP) - u(2.6)) < u(0.9), BRASS);
    }
    return { lights };
  });
}

// ── Stairs, ladders, balustrades and doorways ──

// Stairs climbing along +x. Walking up them, left is the z = 0 side and right
// the z = width side, so a stair along the back wall has its banister, cut
// string and panelled spandrel on the right (the room's side).
export function staircase({ rise = 5.05, run = 4, width = 1, kind = "stairs", rail = "right", steps, landing = 0, runner = null, clip = Infinity, base = 0 } = {}, look = LOOK) {
  const ladder = kind === "ladder", n = steps ?? Math.max(3, Math.round(rise / 0.3)), pre = ladder ? 0.06 : 0.16;
  const W = pre + run + landing + (ladder ? 0.12 : 0.05), H = Math.min(clip, rise + (ladder ? 0.95 : rise / n + 1.2)), D = width;
  const rails = { left: [0.1], right: [D - 0.1], both: [0.1, D - 0.1] }[rail] ?? [];
  const main = fixture("staircase", [rise, run, width, kind, rail, n, landing, runner, clip, base, look], { w: W, h: H, d: D, at: [pre, 0, 0] }, (k) => {
    const tread = tint(look.floor, 0.12), riser = mix(look.wood, look.floor, 0.35), body = mix(look.wood, look.dark, 0.35), string = mix(look.wood, look.dark, 0.2);
    if (ladder) ladderBuild(k, { rise, run, D, n, pre, W, sides: rails.map((z) => (z < D / 2 ? u(3) : D - u(3))), look, tread });
    else {
      const g = run / n, h = rise / n, X0 = (s) => pre + (s - 1) * g, top = (x) => Math.min(n, Math.floor((x - pre) / g) + 1) * h, nose = (x) => h * ((x - pre) / g + 1);
      // The open sides: a cut string and panelling on each side with a rail (the room's side if none).
      const faces = rail === "both" ? [0, D] : rail === "left" ? [0] : [D], zb = faces.includes(0) ? u(2) : 0, zf = faces.includes(D) ? D - u(2) : D;
      for (let s = 1; s <= n; s++) {
        const x0 = X0(s), x1 = x0 + g, y = s * h;
        k.box(x0 + u(1), 0, zb, x1, y - u(3), zf, body);
        k.box(x0, (s - 1) * h, zb, x0 + u(1), y - u(3), zf, grain(riser, 2, 0.06));
        // The tread: a nosing over the riser, worn pale and hollow down the middle where feet go.
        k.box(x0 - u(1.5), y - u(3), 0, x1, y, D, (x, py, z) => (!runner && Math.abs(z - D / 2) < D * 0.28 && x - x0 < g * 0.7 ? tint(tread, 0.1) : grain(tread, 2, 0.1)(x, py, z)), { round: u(2), axis: "z" });
        if (!runner) k.carve(x0 + u(1), y - u(1), D * 0.3, x0 + g * 0.55, y, D * 0.7, (x, py, z) => ((x - x0 - g * 0.28) / (g * 0.26)) ** 2 + ((z - D / 2) / (D * 0.2)) ** 2 < 1);
        else {
          // A runner down the middle, held at each riser by a brass rod.
          const r0 = D * 0.2, r1 = D * 0.8, edge = (z) => (z - r0 < u(1.5) || r1 - z < u(1.5) ? tint(BRASS, 0.05) : runner);
          k.box(x0 - u(1.5), y, r0, x1, y + u(1), r1, (x, py, z) => edge(z));
          k.box(x0 - u(2.5), (s - 1) * h, r0, x0, y + u(1), r1, (x, py, z) => edge(z));
          k.cyl([x0 - u(3), (s - 1) * h + u(1.5), r0 - u(2)], [x0 - u(3), (s - 1) * h + u(1.5), r1 + u(2)], u(1), BRASS);
        }
      }
      const low = (x) => nose(x) - h - 0.36, xr = landing > 0 ? W - 0.05 : pre + run;
      for (const f of faces) {
        const z0 = f ? D - u(2) : 0, z1 = f ? D : u(2), sunk = (z) => (f ? z < D - u(1) : z >= u(1)), lowAt = (x) => (x > pre + run ? rise - 0.36 : low(x));
        k.shape(pre - u(1), 0, z0, pre + run, rise, z1, (x, y) => y < top(x) - u(3) && y >= low(x), (x, y) => (y - low(x) < u(1) ? tint(string, 0.15) : grain(string, 0, 0.08)(x, y, 0)));
        // The spandrel under the string: rails, stiles and fielded panels down to a skirting.
        k.shape(pre, 0, z0, xr, rise, z1, (x, y, z) => {
          if (y >= lowAt(x) - (x > pre + run ? 0 : 0)) return false;
          const fx = (x - pre) % 0.62, fy = y % 0.62, frame = fx < 0.07 || fy < 0.07 || y < 0.12 || lowAt(x) - y < 0.08;
          return frame || sunk(z) || (fx > 0.16 && fx < 0.53 && fy > 0.16 && fy < 0.53);
        }, (x, y) => (y < 0.12 ? shade(look.dark, 0.1) : mix(look.wood, look.dark, y % 0.62 < 0.07 ? 0.1 : 0.3)));
      }
      if (landing > 0) {
        const xl = pre + run;
        k.box(xl, 0, zb, xr, rise - u(3), zf, body);
        k.box(xl - u(1.5), rise - u(3), 0, xr, rise, D, grain(tread, 0, 0.1), { round: u(2), axis: "z" });
        k.box(xl, rise - 0.36, faces.includes(0) ? 0 : zf, xr, rise - u(3), faces.includes(D) ? D : zb, grain(string, 0, 0.08));
        // The cupboard under the landing, in the room's side: a plank door with strap hinges and a latch.
        const f = faces.includes(D) ? D : 0, z0 = f ? D - u(1) : 0, z1 = f ? D : u(1), dz = f ? -1 : 1, dh = Math.min(2.1, rise - 0.6), d0 = xl + 0.14, d1 = xr - 0.14;
        k.carve(d0, 0.12, Math.min(z0, z0 + dz * u(1)), d1, dh, Math.max(z1, z1 + dz * u(1)));
        k.box(d0 + u(1), 0.12, f ? D - u(3) : u(1), d1 - u(1), dh, f ? D - u(1) : u(3), (x, y) => (Math.abs(((x - d0) % 0.2) - 0.1) > 0.1 - u(1) ? shade(look.wood, 0.3) : grain(look.wood, 1, 0.1)(x, y, 0)));
        for (const y of [0.4, dh - 0.35]) k.box(d0 + u(1), y, z0, d1 - 0.2, y + u(2), z1, IRON);
        k.box(d1 - 0.14, 1.05, z0, d1 - 0.06, 1.08, z1, IRON);
        k.ball(d1 - 0.1, 1.0, f ? D - u(0.5) : u(0.5), u(1.5), u(1.5), u(1), IRON);
      }
    }
    if (clip < H + 1) k.carve(0, clip, 0, W, H + 1, D);
    if (base > 0) k.carve(0, 0, 0, W, base, D);
    return { landing: landing > 0 ? { x0: run, x1: run + landing, y: rise } : null };
  });
  if (ladder || !rails.length) return main;
  // The banister, finer: turned spindles two to a tread, a moulded handrail, and newel posts with caps.
  const bar = () => fixture("banister", [rise, run, n, landing, clip, base, look], { w: W, h: H, d: 0.24, r: 48, at: [pre, 0, 0.12] }, (k) => {
    const g = run / n, h = rise / n, z = snap(0.12), railY = (x) => h * ((x - pre) / g + 1) + 0.82;
    for (let s = 1; s <= n; s++) for (const f of [0.28, 0.76]) { const x = snap(pre + (s - 1) * g + g * f); spindle(k, x, z, s * h, railY(x) - u(3), u(1.3), look.dark); }
    handrail(k, pre - 0.02, pre + run, railY, z, look.trim);
    newel(k, snap(pre - 0.075), z, 0, railY(pre - 0.075) + 0.06, 0.15, look.wood, look.trim);
    const tx = snap(pre + run + (landing > 0 ? 0.075 : -0.075));
    newel(k, tx, z, rise - 0.5, railY(pre + run) + 0.06, 0.15, look.wood, look.trim);
    k.lathe(tx, z, rise - 0.68, rise - 0.5, [[0, 0.01], [0.4, 0.05], [0.8, 0.06], [1, 0.04]], look.trim);
    if (landing > 0) {
      for (let x = pre + run + 0.25; x < W - 0.1; x += 0.2) spindle(k, snap(x), z, rise, rise + 0.82 - u(3), u(1.3), look.dark);
      handrail(k, tx, W - 0.05, () => rise + 0.82, z, look.trim);
    }
    if (clip < H + 1) k.carve(0, clip, 0, W, H + 1, 0.24);
    if (base > 0) k.carve(0, 0, 0, W, base, 0.24);
  });
  return assemble(main, ...rails.map((z) => [bar(), 0, 0, z]));
}
// A steep stair-ladder: two strings, flat treads housed between them, worn in
// the middle, handrails on iron brackets and hooks at the top.
function ladderBuild(k, { rise, run, D, n, pre, W, sides, look, tread }) {
  const slope = run / rise, along = (y) => pre + y * slope, wood = shade(look.wood, 0.05), top = rise + 0.35;
  for (const z of [0, D - u(2)]) k.shape(0, 0, z, W, top, z + u(2), (x, y) => Math.abs(x - along(y) - 0.04) * Math.cos(Math.atan(slope)) < 0.06 && y < top, grain(wood, 1, 0.1));
  for (let s = 1; s <= n; s++) {
    const y = (s * rise) / (n + 0.6), x = along(y) + 0.04;
    k.box(x - 0.08, y - u(2), u(1), x + 0.08, y + u(1), D - u(1), (px, py, pz) => (Math.abs(pz - D / 2) < D * 0.25 && py > y ? tint(tread, 0.12) : grain(tread, 2, 0.08)(px, py, pz)), { round: u(1.5), axis: "z" });
  }
  for (const z of sides.map(snap)) {
    const rz = z < D / 2 ? z - u(2) : z + u(2);
    for (let y = 0.6; y < rise; y += 1.3) k.cyl([along(y) + 0.04, y, rz], [along(y + 0.7) + 0.02, y + 0.7, rz], u(0.9), IRON);
    k.cyl([along(0.7) + 0.02, 0.7, rz], [along(rise + 0.7) + 0.02, rise + 0.7, rz], u(1.6), grain(look.trim, 1, 0.1));
  }
  for (const z of [u(1), D - u(1)]) k.shape(along(top) - 0.08, top - 0.12, z - u(1), along(top) + 0.12, top + 0.02, z + u(1), (x, y) => Math.abs(Math.hypot(x - along(top) - 0.04, y - top + 0.05) - 0.05) < u(0.8) && x > along(top), IRON);
}

// A straight balustrade: spindles on a base rail between two capped newels, a moulded rail on top.
export function balustrade({ length = 3, height = 0.9, newels = "both" } = {}, look = LOOK) {
  const L = length, D = 0.16;
  return fixture("balustrade", [L, height, newels, look], { w: L, h: height + 0.25, d: D, r: 48 }, (k) => {
    const z = snap(D / 2);
    k.box(0, 0, z - u(2), L, u(3), z + u(2), grain(look.wood, 0, 0.08), { round: u(1), axis: "x" });
    for (let x = 0.24; x < L - 0.17; x += 0.18) spindle(k, snap(x), z, u(3), height - u(3), u(1.3), look.dark);
    handrail(k, 0.07, L - 0.07, () => height, z, look.trim);
    for (const x of { both: [0.075, L - 0.075], start: [0.075], end: [L - 0.075] }[newels] ?? []) newel(k, snap(x), z, 0, height + 0.06, 0.15, look.wood, look.trim);
  });
}

// A hatch in the floor for a ladder up from below: a frame round the opening on
// three sides (x centred, z = 0 to depth out from the back wall, y = 0 the
// floor's top), the floor's boards and joist cut through at its edges, and a
// plank trapdoor hinged on the back edge, propped open `angle` degrees (90 stands
// it against the wall) with its ledges, brace and pull ring to the room.
export function hatch({ width = 1, depth = 1, angle = 90 } = {}, look = LOOK) {
  const F = 0.32, hw = width / 2, W = width + 0.2, a = (angle * Math.PI) / 180, t = 0.06, len = depth - 0.03, H = F + len * Math.sin(a) + 0.12, D = depth + 0.1;
  return fixture("hatch", [width, depth, angle, look], { w: W, h: H, d: D, at: [W / 2, F, 0] }, (k) => {
    const c = W / 2, sa = Math.sin(a), ca = Math.cos(a), dark = look.dark;
    // Where a point sits on the door: q along it from the hinge, v through it from its top face.
    const door = (y, z) => [(y - F) * sa + z * ca, -(y - F) * ca + z * sa];
    // The frame, mitred at the front corners, and the cut floor under it: boards over a dark joist.
    for (const s of [-1, 1]) k.box(c + s * hw, F - u(4), 0, c + s * (hw + 0.1), F + u(1), depth + 0.1, grain(shade(look.wood, 0.1), 2, 0.08));
    k.box(c - hw - 0.1, F - u(4), depth, c + hw + 0.1, F + u(1), depth + 0.1, (x, y, z) => (Math.abs(x - c) > hw + depth + 0.1 - z ? shade(look.wood, 0.1) : grain(shade(look.wood, 0.04), 0, 0.08)(x, y, z)));
    for (const s of [-1, 1]) k.box(c + s * hw, 0, 0, c + s * (hw - u(2)), F - u(4), depth, (x, y) => (y > F - u(8) ? shade(look.floor, 0.2) : grain(shade(dark, 0.2), 2, 0.1)(x, y, 0)));
    k.box(c - hw, 0, depth, c + hw, F - u(4), depth - u(2), (x, y) => (y > F - u(8) ? shade(look.floor, 0.2) : grain(shade(dark, 0.2), 0, 0.1)(x, y, 0)));
    // The trapdoor: four planks with V-joints; on its underside two ledges and a brace between them.
    const plank = (width - 0.08) / 4, x0 = c - hw + 0.04, x1 = c + hw - 0.04;
    k.shape(x0, F - t, 0, x1, H, D, (x, y, z) => { const [q, v] = door(y, z); return q >= 0 && q <= len && v >= 0 && v <= t; }, (x, y, z) => {
      const p = Math.floor((x - x0) / plank), f = (x - x0) % plank;
      return f < u(1) ? shade(look.wood, 0.4) : grain(scale(look.wood, 0.94 + hash(p, 3, 7) * 0.12), 1, 0.08)(x, door(y, z)[0], z);
    });
    const ledge = (q) => q > 0.12 && q < 0.22 ? 1 : q > len - 0.22 && q < len - 0.12 ? 1 : 0, bx = (q) => x0 + 0.06 + ((q - 0.22) / (len - 0.44)) * (x1 - x0 - 0.12);
    k.shape(x0, F - t - u(3), 0, x1, H, D, (x, y, z) => {
      const [q, v] = door(y, z);
      if (v <= t || v > t + u(2.5) || q < 0 || q > len || x < x0 + 0.05 || x > x1 - 0.05) return false;
      return ledge(q) || (q > 0.2 && q < len - 0.2 && Math.abs(x - bx(q)) < 0.045);
    }, (x, y, z) => grain(shade(look.wood, 0.12), 1, 0.08)(x, y, z));
    // Hinge knuckles on the back edge, and a ring on a staple near the free end, hanging flat.
    for (const s of [-1, 1]) k.cyl([c + s * 0.18, F + u(0.5), u(1.5)], [c + s * 0.32, F + u(0.5), u(1.5)], u(1.6), IRON);
    k.shape(c - 0.07, F - t, 0, c + 0.07, H, D, (x, y, z) => {
      const [q, v] = door(y, z);
      return v > t + u(0.5) && v <= t + u(1.8) && (Math.abs(Math.hypot(x - c, q - (len - 0.2)) - 0.045) < u(0.9) || (Math.abs(x - c) < u(1.5) && Math.abs(q - (len - 0.14)) < u(1)));
    }, IRON);
    return { height: H - F, below: F };
  });
}

// An arched door frame for an opening in a wall (the shell cuts the opening):
// panelled linings through the wall, a moulded architrave on the room face
// standing on plinth blocks, imposts and a keystone, and a worn stone
// threshold. With style "door" a plank door hangs on one jamb, swung open
// away from the room; the shop's ("shop") is square-headed, opens into the
// room, and has a hood on brackets, a bell on a spring and a doormat.
export function doorway({ width = 1.625, height = 3.2, depth = 0.25, style = "arch", hinge = "left", angle } = {}, look = LOOK) {
  const shop = style === "shop", door = shop || style === "door", hw = width / 2, band = 0.2, t = 0.07, dw = width - 0.1;
  const side = hinge === "left" ? -1 : 1, swing = shop ? 1 : -1, theta = ((angle ?? (shop ? 150 : 95)) * Math.PI) / 180;
  const eu = [-side * Math.cos(theta), swing * Math.sin(theta)], hx = side * (hw - u(2)), hz = shop ? depth - t / 2 - u(1) : t / 2 + u(1);
  const far = [hx + eu[0] * dw, hz + eu[1] * dw], x0 = Math.min(-hw - band - 0.08, door ? far[0] - 0.1 : 0), x1 = Math.max(hw + band + 0.08, door ? far[0] + 0.1 : 0);
  const z0 = Math.min(-0.06, door ? far[1] - 0.1 : 0), z1 = Math.max(depth + (shop ? 0.7 : 0.16), door ? far[1] + 0.1 : 0), H = height + (shop ? 0.5 : 0.32);
  return fixture("doorway", [width, height, depth, style, hinge, theta, look], { w: x1 - x0, h: H, d: z1 - z0, r: shop ? RES : 40, at: [-x0, 0, -z0] }, (k) => {
    const cx = -x0, zb = -z0, zf = zb + depth, spring = shop ? height : height - hw, trim = look.trim, dark = look.dark;
    // How far a point on the wall is outside the opening's outline (negative inside).
    const out = (x, y) => (shop ? Math.max(Math.abs(x - cx) - hw, y - height) : y <= spring ? Math.abs(x - cx) - hw : Math.hypot(x - cx, y - spring) - hw);
    // The architrave: a stepped profile, a bead standing proudest.
    const prof = (d) => (d < 0.03 ? u(2) : d < 0.06 ? u(3) : d < 0.15 ? u(2) : u(4)), tone = (d) => (d < 0.03 ? mix(trim, dark, 0.3) : d < 0.06 ? tint(trim, 0.15) : d < 0.15 ? trim : tint(trim, 0.06));
    k.shape(cx - hw - band, 0, zf - u(1), cx + hw + band, height + band, zf + u(4), (x, y, z) => { const d = out(x, y); return d >= 0 && d < band && z <= zf + prof(d); }, (x, y) => tone(out(x, y)));
    // Linings through the wall, sunk panels on the jambs, and the threshold.
    k.shape(cx - hw, 0, zb, cx + hw, height, zf, (x, y, z) => {
      const d = out(x, y), panel = y > 0.3 && y < spring - 0.12 && z > zb + 0.05 && z < zf - 0.05;
      return d <= 0 && d > -(panel ? u(1) : u(2));
    }, (x, y, z) => (out(x, y) < -u(1) ? grain(mix(trim, dark, 0.15), 1, 0.08)(x, y, z) : mix(trim, dark, 0.45)));
    // A slate threshold, worn paler down the middle where feet go (the doorway's light falls on it, so it is kept dark).
    k.box(cx - hw - 0.04, 0, zb - 0.04, cx + hw + 0.04, u(2), zf + 0.1, (x, y, z) => (Math.abs(x - cx) < hw * 0.55 ? fleck(0x7a7078, 0.04, 3)(x, y, z) : fleck(0x5e5660, 0.06, 3)(x, y, z)), { round: u(1.5) });
    for (const s of [-1, 1]) {
      const a = cx + s * (hw - u(1)), b = cx + s * (hw + band + u(1)), e = b + s * u(1.5);
      k.box(Math.min(a, b), 0, zf - u(1), Math.max(a, b), 0.38, zf + u(5), mix(trim, dark, 0.35), { round: u(1.5) });
      if (!shop) k.box(Math.min(a, e), spring - u(3), zf - u(1), Math.max(a, e), spring + u(1), zf + u(5), tint(trim, 0.1), { round: u(1) });
    }
    if (!shop) {
      // The keystone, a diamond sunk in its face.
      k.shape(cx - 0.16, height - 0.04, zf - u(1), cx + 0.16, height + 0.27, zf + u(6), (x, y) => Math.abs(x - cx) < 0.08 + (y - height) * 0.22, fleck(tint(trim, 0.18), 0.04, 2));
      k.carve(cx - 0.05, height + 0.06, zf + u(5), cx + 0.05, height + 0.2, zf + u(6), (x, y) => Math.abs(x - cx) / 0.045 + Math.abs(y - height - 0.13) / 0.065 < 1);
    } else {
      // A hood over the door on two scrolled brackets.
      const hy = height + band;
      k.box(cx - hw - band - 0.1, hy, zf - u(1), cx + hw + band + 0.1, hy + u(3), zf + 0.14, grain(trim, 0, 0.08), { round: u(1.5), axis: "x" });
      k.box(cx - hw - band - 0.06, hy + u(3), zf - u(1), cx + hw + band + 0.06, hy + u(6), zf + 0.2, grain(tint(trim, 0.08), 0, 0.08), { round: u(1.5), axis: "x" });
      for (const s of [-1, 1]) k.shape(cx + s * (hw + band * 0.6) - u(1.5), hy - 0.3, zf - u(1), cx + s * (hw + band * 0.6) + u(1.5), hy, zf + 0.14, (x, y, z) => z <= zf + 0.13 * ((y - hy + 0.3) / 0.3) ** 1.5 && Math.hypot(z - zf - 0.06, y - hy + 0.1) > 0.03, grain(trim, 1));
      // The shop bell on a coiled spring, and a doormat.
      const bx = snap(cx - hw * 0.4), by = height - 0.06;
      k.box(bx - u(1), by - u(1), zf - u(1), bx + u(1), by + u(1), zf + 0.22, IRON);
      for (let i = 0; i < 6; i++) k.shape(bx - u(2), by - 0.03 - i * u(1.6), zf + 0.2, bx + u(2), by - u(1) - i * u(1.6), zf + 0.24, (x, y, z) => Math.abs(Math.hypot(x - bx, z - zf - 0.22) - u(1.5)) < u(0.6), IRON);
      k.lathe(bx, snap(zf + 0.22), by - 0.22, by - 0.1, [[0, 0.06], [0.2, 0.055], [0.6, 0.04], [1, 0.015]], (x, y, z) => (x < bx && z > zf + 0.22 ? tint(BRASS, 0.3) : BRASS));
      k.box(cx - hw + 0.08, 0, zf + 0.14, cx + hw - 0.08, u(1), zf + 0.66, (x, y, z) => (Math.abs(x - cx) > hw - 0.14 || z < zf + 0.2 || z > zf + 0.6 ? 0x5a3a24 : fleck(0xa08050, 0.08, 1)(x, y, z)));
    }
    if (!door) return {};
    // The door: planks with V-grooves, strap hinges and a ring pull (a knob and an OPEN sign on the shop's).
    const local = (x, z) => { const dx = x - cx - hx, dz = z - zb - hz; return [dx * eu[0] + dz * eu[1], -dx * eu[1] + dz * eu[0]]; };
    const topAt = (q) => (shop ? height - u(2) : spring + Math.sqrt(Math.max(0, (hw - u(3)) ** 2 - (q - dw / 2) ** 2)));
    const face = side * swing, wood = shop ? look.door ?? 0x3a5a48 : look.wood;
    const bx0 = cx + Math.min(hx, far[0]) - 0.1, bx1 = cx + Math.max(hx, far[0]) + 0.1, bz0 = zb + Math.min(hz, far[1]) - 0.1, bz1 = zb + Math.max(hz, far[1]) + 0.1;
    k.shape(bx0, u(1), bz0, bx1, height, bz1, (x, y, z) => { const [q, v] = local(x, z); return q >= 0 && q <= dw && Math.abs(v) <= t / 2 && y <= topAt(q); }, (x, y, z) => {
      const [q] = local(x, z), p = Math.floor(q / 0.16);
      return (q % 0.16) < u(1) ? shade(wood, 0.35) : grain(scale(wood, 0.92 + hash(p, 1, 4) * 0.16), 1, 0.08)(x, y, z);
    });
    // Ironwork and fittings on the face that shows: a test on (q along the door, y) and the depth proud of it.
    const onFace = (y0, y1, test, paint, proud = u(1.2)) => k.shape(bx0, y0, bz0, bx1, y1, bz1, (x, y, z) => { const [q, v] = local(x, z); return v * face > t / 2 - u(0.5) && v * face <= t / 2 + proud && test(q, y); }, paint);
    for (const y of shop ? [0.35, height - 0.6] : [0.4, spring - 0.35]) onFace(y - 0.04, y + 0.05, (q, yy) => q >= 0 && q <= dw * 0.62 + 0.07 * (1 - Math.abs(yy - y) / 0.04) && Math.abs(yy - y) < (q > dw * 0.62 ? 0.04 : 0.025), IRON);
    if (shop) {
      onFace(0.98, 1.08, (q) => q > dw - 0.14 && q < dw - 0.08, BRASS, u(2));
      // A board hung on the door that says OPEN, in cream letters on plum inside a gold edge;
      // its cells a little over a voxel, since the open door's voxels lie at a slant to it.
      const cs = u(1.3), q0 = dw / 2 - cs * 10, y0 = 1.42, cell = (x, y, z) => [Math.floor((local(x, z)[0] - q0) / cs), 8 - Math.floor((y - y0) / cs)];
      onFace(y0, y0 + cs * 9, (q) => q >= q0 && q < q0 + cs * 20, (x, y, z) => {
        const [i, j] = cell(x, y, z), c = i - 2, row = OPEN[j - 2];
        return i <= 0 || i >= 19 || j <= 0 || j >= 8 ? BRASS : row && c >= 0 && c < 16 && row[c] === "1" ? 0xf0e4c8 : 0x4a2438;
      }, u(1.5));
      onFace(y0 + cs * 9, y0 + cs * 9 + u(5), (q, y) => Math.abs(Math.abs(q - dw / 2) - (y0 + cs * 9 + u(5) - y) * 2.4) < u(0.8), TWINE, u(1));
    } else onFace(0.95, 1.13, (q, y) => Math.abs(Math.hypot(q - dw + 0.13, y - 1.04) - 0.045) < u(1), IRON, u(1.5));
    return { door: { x: hx, z: hz, angle: theta } };
  });
}

// ── The Honest Pumpkin ──

// Skyla's counter: a panelled front of raised fields between stiles, a moulded
// top with a rounded nosing, the brass till with its keys and marquee, the
// bell, the open ledger with an inkwell and quill, and an iron lantern.
// Its length runs along x; customers stand at +z, Skyla sits at userData.seat.
export function shopCounter({ length = 3.2 } = {}, look = SHOP) {
  const L = length, W = L + 0.2, D = 1.55, H = 2, T = 41 / RES;
  const main = fixture("shopCounter", [L, look], { w: W, h: H, d: D }, (k) => {
    const c = W / 2, base = look.wood, frame = shade(base, 0.12), field = tint(base, 0.05), dark = look.dark;
    k.box(0.1, 0, 0.1, W - 0.1, T - u(4), D - 0.1, grain(base, 1, 0.06));
    k.box(0.1 + u(2), 0, 0.1 + u(2), W - 0.1 - u(2), 0.12, D - 0.1 - u(2), dark);
    // Raised and fielded panels on the front and both ends.
    const panels = (span0, span1, along, at, outward) => {
      const n = Math.max(1, Math.round((span1 - span0) / 0.72)), w = (span1 - span0) / n;
      for (let i = 0; i < n; i++) {
        const a = span0 + i * w + 0.07, b = span0 + (i + 1) * w - 0.07, y0 = 0.24, y1 = T - u(4) - 0.16;
        const box = (lo, hi, y2, y3, d, paint) => (along === "x" ? k.box(lo, y2, at, hi, y3, at + outward * d, paint) : k.box(at, y2, lo, at + outward * d, y3, hi, paint));
        box(span0 + i * w, span0 + (i + 1) * w, 0.12, T - u(6), u(2), grain(frame, 1, 0.06));
        if (along === "x") k.carve(a, y0, at, b, y1, at + u(2.5)); else k.carve(Math.min(at, at + outward * u(2.5)), y0, a, Math.max(at, at + outward * u(2.5)), y1, b);
        box(a + 0.04, b - 0.04, y0 + 0.04, y1 - 0.04, u(1), mix(base, dark, 0.15));
        box(a + 0.08, b - 0.08, y0 + 0.08, y1 - 0.08, u(2), grain(field, 1, 0.06));
      }
    };
    panels(0.1, W - 0.1, "x", D - 0.1, 1);
    panels(0.1, D - 0.1, "z", W - 0.1, 1);
    panels(0.1, D - 0.1, "z", 0.1, -1);
    k.box(0.08, T - u(6), 0.08, W - 0.08, T - u(4), D - 0.08, tint(base, 0.1), { round: u(1) });
    k.box(0, T - u(4), 0, W, T, D, grain(tint(look.trim, 0.04), 0, 0.08), { round: u(2) });
    // Skyla's side: open cubbies with paper bags and a ball of twine.
    k.carve(0.2, 0.16, 0.09, W - 0.2, T - u(6) - 0.04, 0.55);
    for (let x = 0.2 + 0.8; x < W - 0.3; x += 0.8) k.box(x - u(1.5), 0.16, 0.1, x + u(1.5), T - u(6), 0.55, grain(base, 1));
    k.box(0.2, 0.58, 0.1, W - 0.2, 0.58 + u(2), 0.55, grain(base, 0));
    for (let x = 0.3; x < W - 0.5; x += 0.8) for (let i = 0; i < 4; i++) k.box(x, 0.6 + i * u(1.2), 0.16, x + 0.3, 0.6 + (i + 1) * u(1.2), 0.4, i % 2 ? 0xc8a878 : 0xd8b888);
    k.ball(snap(W - 0.6), 0.24, snap(0.3), 0.07, 0.07, 0.07, (x, y) => ((vox(y) + vox(x)) % 3 ? TWINE : shade(TWINE, 0.2)));
    return { top: T, seat: { x: -0.2, y: T, z: 0.8 } };
  });
  return assemble(main, [counterTop(W), -W / 2, T, 0]);
}
// What stands on the counter, finer than the counter: the brass till, the
// bell, the ledger with its inkwell and quill, a jar of lollies and the lantern.
function counterTop(W) {
  return fixture("counterTop", [W], { w: W, h: 0.72, d: 1.55, r: 64, at: [0, 0, 0] }, (k) => {
    const c = W / 2, brass = 0xb8862e, lite = 0xe8c068, deep = 0x7a5420;
    // The till: a cash drawer on a moulded plinth, keys on a slope towards Skyla, a tall case
    // embossed with scrolls, the amount in a little window, and an arched crest to the customers.
    const tx = snap(c + 0.9), b0 = 0.3, b1 = 0.86, hw = 0.25, slope = (z) => 0.14 + 0.17 * Math.min(1, Math.max(0, (z - b0) / 0.3));
    const emboss = (cx, cy) => (x, y) => { const d = Math.hypot(x - cx, (y - cy) * 1.4), a = Math.atan2(y - cy, x - cx); return Math.abs(Math.sin(d * 90 - a * 2)) < 0.4 && d < 0.1; };
    k.box(tx - hw - u(2), 0, b0 - u(2), tx + hw + u(2), u(2), b1 + u(2), deep, { round: u(1) });
    k.box(tx - hw, u(2), b0, tx + hw, 0.14, b1, brass);
    k.box(tx - hw + u(3), 0.03, b0 - u(1), tx + hw - u(3), 0.12, b0, (x, y) => (Math.abs(y - 0.075) < u(1) ? deep : lite));
    k.ball(tx, 0.075, b0 - u(1.5), u(2.5), u(2.5), u(1.5), deep);
    k.shape(tx - hw, 0.14, b0, tx + hw, 0.31, b0 + 0.3, (x, y, z) => y < slope(z), brass);
    k.box(tx - hw, 0.14, b0 + 0.3, tx + hw, 0.44, b1, brass);
    k.box(tx - hw - u(1), 0.44, b0 + 0.28, tx + hw + u(1), 0.44 + u(2), b1 + u(1), deep, { round: u(1) });
    // Raised scrolls on both ends and the back; a ridge of moulding round the case.
    for (const s of [-1, 1]) k.shape(Math.min(tx + s * hw, tx + s * (hw + u(1))), 0.03, b0 + 0.04, Math.max(tx + s * hw, tx + s * (hw + u(1))), 0.42, b1 - 0.03, (x, y, z) => emboss(b0 + 0.42, 0.27)(z, y) || emboss(b0 + 0.18, 0.08)(z, y * 1.6) || Math.abs(y - 0.14) < u(1), lite);
    k.shape(tx - hw + 0.02, 0.03, b1, tx + hw - 0.02, 0.42, b1 + u(1), (x, y) => emboss(tx - 0.11, 0.26)(x, y) || emboss(tx + 0.11, 0.26)(x, y) || emboss(tx, 0.08)(x, y * 1.4) || Math.abs(y - 0.14) < u(1), lite);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
      const kx = snap(tx - 0.18 + col * 0.09), kz = snap(b0 + 0.06 + row * 0.085), ky = slope(kz);
      k.post(kx, kz, u(1), ky, ky + u(3), deep);
      k.lathe(kx, kz, ky + u(3), ky + u(4.5), u(2.6), (x, y, z) => (Math.hypot(x - kx, z - kz) < u(1) ? 0x2a2020 : row === 2 ? 0xa8302a : 0xf0e4c8));
      k.lathe(kx, kz, ky + u(2.5), ky + u(3), u(2.8), lite);
    }
    // The amount in its window (cream flags, black figures), and the arched crest over it.
    k.box(tx - 0.16, 0.46, b0 + 0.36, tx + 0.16, 0.56, b1 - 0.06, brass);
    k.box(tx - 0.12, 0.475, b1 - 0.06, tx + 0.12, 0.545, b1 - 0.06 + u(1), (x, y) => (Math.abs(((x - tx + 0.12) % 0.06) - 0.03) > 0.028 ? deep : Math.abs(y - 0.51) < u(1.5) && vox(x) % 3 ? 0x1a1414 : 0xf0e8d0));
    k.shape(tx - 0.2, 0.56, b1 - 0.1, tx + 0.2, 0.7, b1 - 0.06, (x, y) => y < 0.6 + 0.09 * Math.sqrt(Math.max(0, 1 - ((x - tx) / 0.2) ** 2)), (x, y) => {
      const e = Math.hypot((x - tx) / 0.11, (y - 0.625) / 0.04);
      return e < 1 ? (Math.abs(y - 0.625) < u(1) && vox(x) % 2 ? deep : 0xf0e0b0) : e < 1.25 ? lite : brass;
    });
    k.ball(tx, 0.7, b1 - 0.08, u(2.5), u(2.5), u(2.5), lite);
    // The crank on the right.
    k.cyl([tx + hw, 0.22, b0 + 0.4], [tx + hw + 0.05, 0.22, b0 + 0.4], u(2), deep);
    k.cyl([tx + hw + 0.05, 0.22, b0 + 0.4], [tx + hw + 0.05, 0.36, b0 + 0.46], u(1.5), brass);
    k.lathe(snap(tx + hw + 0.05), snap(b0 + 0.46), 0.35, 0.42, [[0, 0.012], [0.5, 0.02], [1, 0.012]], 0x2a1a14);
    // The service bell: a brass dome on a turned base, its plunger on top.
    const bx = snap(c - 1.12), bz = snap(0.68);
    k.lathe(bx, bz, 0, 0.03, [[0, 0.08], [0.6, 0.08], [1, 0.07]], (x, y) => (y > u(1.5) ? 0x5a3424 : 0x3a2014));
    k.lathe(bx, bz, 0.03, 0.1, (t) => 0.068 * Math.sqrt(Math.max(0, 1 - t * t)) + 0.004, (x, y, z) => (x < bx - 0.02 && z > bz + 0.02 && y > 0.05 ? tint(lite, 0.3) : lite), { max: 0.072 });
    k.post(bx, bz, u(1.5), 0.1, 0.13, deep);
    k.lathe(bx, bz, 0.13, 0.14, u(3), lite);
    // The open ledger, ruled, an inkwell and a quill.
    const lx = c - 0.75, lz = 1.02;
    k.box(lx - 0.18, 0, lz - 0.13, lx + 0.18, u(1.5), lz + 0.13, 0x6a1f2a);
    for (const s of [-1, 1]) k.shape(Math.min(lx, lx + s * 0.17), u(1.5), lz - 0.12, Math.max(lx, lx + s * 0.17), u(5), lz + 0.12, (x, y) => y - u(1.5) < u(1.5) + Math.abs(x - lx) * 0.16 - (Math.abs(x - lx) > 0.15 ? u(1) : 0),
      (x, y, z) => (Math.abs(x - lx) < u(1.5) ? 0xc8b898 : vox(z) % 4 === 0 && Math.abs(x - lx) > 0.03 && Math.abs(x - lx) < 0.15 ? 0xa8b8c8 : 0xf0e4c8));
    const ix = snap(lx + 0.29), iz = snap(lz - 0.03);
    k.lathe(ix, iz, 0, 0.06, [[0, 0.035], [0.6, 0.035], [0.75, 0.02], [0.85, 0.015], [1, 0.018]], (x, y, z) => (x < ix - 0.01 && z > iz ? 0x4a4a6a : 0x2a2a3a));
    k.cyl([ix, 0.05, iz], [ix + 0.06, 0.26, iz - 0.07], u(0.8), 0xf0ece0);
    k.shape(ix - 0.02, 0.1, iz - 0.12, ix + 0.1, 0.28, iz + 0.02, (x, y, z) => {
      const t = (y - 0.05) / 0.21, px = ix + t * 0.06, pz = iz - t * 0.07;
      return t > 0.3 && Math.abs(z - pz) < u(1) && Math.abs(x - px) < 0.026 * Math.sin((Math.PI * (t - 0.3)) / 0.7) + u(0.5);
    }, (x, y) => (vox(y) % 3 ? 0xf8f4ea : 0xe0dcd0));
    // A jar of lollipops for the customers.
    const jx = c + 1.42, jz = 1.15;
    jar(k, jx, 0, jz, { kind: "squat", h: 0.24, r: 0.1, fill: 0xf0a0c0, stuff: "berries", label: true, cap: 0xa83a2a });
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1, ex = jx + Math.cos(a) * 0.05, ez = jz + Math.sin(a) * 0.04;
      k.cyl([jx, 0.17, jz], [ex, 0.33, ez], u(0.8), 0xf0ece0);
      k.ball(ex, 0.35, ez, u(3), u(3), u(1.8), (x, y) => (Math.abs(Math.atan2(y - 0.35, x - ex)) % 1.2 < 0.5 ? 0xf8f0f0 : [0xe84a6a, 0xf0c040, 0x9a5ae8][i]));
    }
    // The lantern, at the far end from Skyla so its light falls on the counter rather than on her:
    // an iron frame on a plate, warm glass round a candle, a pyramid roof and a ring.
    const nx = snap(c - 1.45), nz = snap(0.2), s = 0.13;
    k.box(nx - s - u(1), 0, nz - s - u(1), nx + s + u(1), u(2), nz + s + u(1), IRON, { round: u(1) });
    for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.post(nx + ax * (s - u(1)), nz + az * (s - u(1)), u(2), u(2), 0.32, IRON);
    k.box(nx - s + u(2), u(2), nz - s + u(2), nx + s - u(2), 0.32, nz + s - u(2), (x, y, z) => (Math.abs(y - 0.18) < u(1) ? IRON : Math.hypot(x - nx, z - nz) < 0.045 && y < 0.2 ? 0xfff0c0 : y < 0.07 ? 0xffb050 : 0xffcf7a), { glow: true });
    for (const [ax, az] of [[1, 0], [0, 1]]) k.box(nx - (ax ? s : u(0.6)), u(2), nz - (az ? s : u(0.6)), nx + (ax ? s : u(0.6)), 0.32, nz + (az ? s : u(0.6)), IRON);
    k.shape(nx - s - u(2), 0.32, nz - s - u(2), nx + s + u(2), 0.46, nz + s + u(2), (x, y, z) => Math.max(Math.abs(x - nx), Math.abs(z - nz)) < (s + u(2)) * (1 - (y - 0.32) / 0.15), (x, y) => (vox(y) % 3 ? IRON : 0x3a3036));
    k.shape(nx - 0.05, 0.44, nz - u(1), nx + 0.05, 0.54, nz + u(1), (x, y) => Math.abs(Math.hypot(x - nx, y - 0.49) - 0.035) < u(1), IRON);
    return { lights: [{ x: nx, y: 0.3, z: nz + 0.25, color: 0xffc46a, intensity: 2.5 }] };
  });
}

// A display table: a planked top with a moulded edge and a runner over it,
// a scalloped apron on turned legs, and a shelf below with a crate of gourds.
export function displayTable(_ = {}, look = SHOP) {
  const W = 1.8, D = 1.2, H = 0.98;
  return fixture("displayTable", [look], { w: W, h: H, d: D, at: [W / 2, 0, D / 2] }, (k) => {
    const top = u(29), wood = 0x8a5a36, leg = look.dark;
    k.box(0.05, top - u(3), 0.05, W - 0.05, top, D - 0.05, (x, y, z) => (Math.abs(((z - 0.05) % 0.28) - 0.14) > 0.14 - u(1) ? shade(wood, 0.3) : grain(wood, 0, 0.09)(x, y, z)), { round: u(1.5) });
    k.box(0.06, top - u(4), 0.06, W - 0.06, top - u(3), D - 0.06, shade(wood, 0.15));
    k.box(W / 2 - 0.3, top, 0.03, W / 2 + 0.3, top + u(1), D - 0.03, (x) => (Math.abs(x - W / 2) > 0.3 - u(2) ? 0xc9a050 : 0x7a2a3a));
    for (const z of [0.03, D - 0.03 - u(1)]) k.box(W / 2 - 0.3, top - 0.16, z, W / 2 + 0.3, top, z + u(1), (x, y) => (Math.abs(x - W / 2) > 0.3 - u(2) || y < top - 0.13 ? 0xc9a050 : 0x7a2a3a));
    for (const z of [0.03, D - 0.03 - u(1)]) k.shape(W / 2 - 0.3, top - 0.22, z, W / 2 + 0.3, top - 0.16, z + u(1), (x) => vox(x) % 2 === 0, 0xd8b060);
    // The apron, scalloped along its lower edge, and the legs.
    const scal = (x) => top - u(4) - 0.1 - 0.04 * Math.abs(Math.sin((x / 0.18) * Math.PI));
    k.shape(0.12, top - 0.22, 0.12, W - 0.12, top - u(4), D - 0.12, (x, y, z) => (z < 0.12 + u(2) || z > D - 0.12 - u(2) ? y > scal(x) : x < 0.12 + u(2) || x > W - 0.12 - u(2) ? y > scal(z) : false), grain(look.wood, 0, 0.08));
    for (const [x, z] of [[0.16, 0.16], [W - 0.16, 0.16], [0.16, D - 0.16], [W - 0.16, D - 0.16]]) {
      k.post(snap(x), snap(z), 0.1, top - 0.24, top - u(4), leg);
      k.lathe(snap(x), snap(z), 0.06, top - 0.24, [[0, 0.04], [0.08, 0.055], [0.14, 0.035], [0.45, 0.045], [0.62, 0.028], [0.82, 0.04], [0.9, 0.05], [1, 0.045]], leg);
      k.lathe(snap(x), snap(z), 0, 0.06, [[0, 0.03], [0.5, 0.05], [1, 0.04]], shade(leg, 0.2));
    }
    // The shelf, its slats, and a crate on it with gourds in straw.
    for (let i = 0; i < 4; i++) k.box(0.12, 0.16, 0.14 + i * 0.235, W - 0.12, 0.16 + u(2), 0.14 + i * 0.235 + 0.2, grain(look.wood, 0, 0.1));
    const cx0 = 0.32, cx1 = 0.92, cz0 = 0.3, cz1 = 0.86, cy = 0.16 + u(2);
    for (let j = 0; j < 3; j++) {
      const y = cy + j * 0.085;
      k.box(cx0, y, cz0, cx1, y + 0.06, cz0 + u(2), grain(0x9a6a3e, 0, 0.1));
      k.box(cx0, y, cz1 - u(2), cx1, y + 0.06, cz1, grain(0x9a6a3e, 0, 0.1));
      k.box(cx0, y, cz0, cx0 + u(2), y + 0.06, cz1, grain(0x9a6a3e, 2, 0.1));
      k.box(cx1 - u(2), y, cz0, cx1, y + 0.06, cz1, grain(0x9a6a3e, 2, 0.1));
    }
    k.box(cx0, cy, cz0, cx1, cy + u(1), cz1, 0x7a4e2c);
    k.box(cx0 + u(2), cy + 0.12, cz0 + u(2), cx1 - u(2), cy + 0.18, cz1 - u(2), fleck(0xd8b860, 0.12, 1));
    pumpkin(k, cx0 + 0.16, cy + 0.14, cz0 + 0.2, 0.1, 0xe8761e);
    pumpkin(k, cx0 + 0.4, cy + 0.14, cz0 + 0.32, 0.09, 0xe8e0d0);
    pumpkin(k, cx0 + 0.22, cy + 0.14, cz0 + 0.42, 0.08, 0x6a8a3a);
    // A slate price tag hung on the apron.
    k.box(W - 0.42, top - 0.2, D - 0.12 + u(2), W - 0.22, top - 0.08, D - 0.12 + u(3), (x, y) => (Math.abs(x - W + 0.32) > 0.1 - u(1) || Math.abs(y - top + 0.14) > 0.06 - u(1) ? 0x9a6a3e : vox(y) === vox(top - 0.14) && vox(x) % 2 ? 0xe8e8e0 : 0x2a2a30));
    return { top };
  });
}

// The shop's dresser along the back wall: a panelled base with cupboard doors
// and a worktop, then open shelves of glowing jars and little pumpkins on a
// planked back, divided into bays, under a cornice with a scalloped valance.
export function jarShelving({ length = 9, rows = 3, seed = 1 } = {}, look = SHOP) {
  const L = length, D = 0.6, ys = Array.from({ length: rows }, (_, i) => 1.9 + i * 0.85), H = ys[rows - 1] + 0.62;
  const main = fixture("jarShelving", [L, rows, look], { w: L, h: H, d: D }, (k) => {
    const wood = look.wood, dark = look.dark, trim = look.trim, bays = Math.max(1, Math.round(L / 1.5)), bw = L / bays, top = 1.02, crown = H - 0.2;
    k.box(u(2), 0, u(2), L - u(2), 0.1, 0.52, dark);
    k.box(0, 0.1, 0, L, top, 0.55, shade(wood, 0.06));
    for (let b = 0; b < bays; b++) for (let d = 0; d < 2; d++) {
      const a = b * bw + 0.08 + d * (bw / 2 - 0.04), e = a + bw / 2 - 0.12;
      k.box(a, 0.18, 0.55, e, top - 0.1, 0.55 + u(1), shade(wood, 0.12));
      k.box(a + 0.06, 0.24, 0.55, e - 0.06, top - 0.16, 0.55 + u(2), tint(wood, 0.05), { round: u(1) });
      k.ball(snap(d ? a + 0.07 : e - 0.07), 0.62, 0.55 + u(2.5), u(1.6), u(1.6), u(1.4), BRASS);
    }
    k.box(0, top, 0, L, top + u(3), 0.6, grain(tint(trim, 0.05), 0, 0.08), { round: u(1.5), axis: "x" });
    // The upper part: planked back, uprights, shelves with a lip.
    k.box(0, top + u(3), 0, L, crown, u(2), (x) => (Math.abs((x % 0.2) - 0.1) > 0.1 - u(1) ? shade(wood, 0.35) : scale(shade(wood, 0.08), [0.92, 1, 1.06][Math.floor(hash(Math.floor(x / 0.2), 7, 1) * 3)])));
    for (let b = 0; b <= bays; b++) { const x = Math.min(L - u(3), b * bw); k.box(x, top + u(3), 0, x + u(3), crown, 0.42, grain(wood, 1, 0.08)); }
    ys.forEach((y) => {
      k.box(0, y, 0, L, y + u(2), 0.42, grain(trim, 0, 0.08));
      k.box(0, y - u(1), 0.39, L, y + u(3), 0.43, shade(trim, 0.2), { round: u(1), axis: "x" });
    });
    k.box(0, crown, 0, L, crown + u(3), 0.46, grain(trim, 0, 0.08));
    k.box(0, crown + u(3), 0, L, crown + u(5), 0.5, tint(trim, 0.1), { round: u(1), axis: "x" });
    k.box(0, crown + u(5), 0, L, H, 0.54, grain(shade(trim, 0.1), 0, 0.08), { round: u(1.5), axis: "x" });
    k.shape(0, crown - 0.14, 0.4, L, crown, 0.42, (x, y) => y > crown - 0.06 - 0.08 * Math.abs(Math.sin(((x % bw) / bw) * Math.PI * 3)), grain(wood, 0, 0.08));
    const lights = ys.length > 1 ? [0.25, 0.75].map((t) => ({ x: L * t, y: ys[1] + 0.3, z: 0.7, color: 0xffb85a, intensity: 3 })) : [];
    return { boards: ys.map((y) => y + u(2)), worktop: top + u(3), lights };
  });
  // The wares, finer, a shelf to a grid: jars and little pumpkins on the shelves, big things on the worktop.
  const bays = Math.max(1, Math.round(L / 1.5)), bw = L / bays, wares = (row) => fixture("shopWares", [L, seed, row], { w: L, h: 0.5, d: 0.45, r: 48, at: [0, 0, 0] }, (k) => {
    const r = seeded(seed * 71 + 9 + row * 13);
    for (let b = 0; b < bays; b++) {
      if (row >= 0) {
        for (let x = b * bw + 0.22; x < (b + 1) * bw - 0.12; x += 0.3 + r() * 0.08) {
          if (r() < 0.16) { pumpkin(k, snap(x + 0.02), 0, 0.2, 0.1, [0xe8761e, 0xf0821e, 0xd8a83a][Math.floor(r() * 3)]); continue; }
          const fill = [0xffb85a, 0xf0821e, 0xb774ff, 0xd9d2ff, 0xf5c84a][Math.floor(r() * 5)];
          jar(k, x, 0, 0.19, { kind: ["jar", "jar", "stopper", "bottle", "squat"][Math.floor(r() * 5)], h: 0.22 + r() * 0.1, r: 0.075, fill, stuff: "liquid", level: 0.5 + r() * 0.35, glow: r() < 0.4, label: r() < 0.4 });
        }
        continue;
      }
      const x = b * bw + bw / 2;
      if (b % 3 === 0) { pumpkin(k, x - 0.2, 0, 0.26, 0.2, 0xe8761e); pumpkin(k, x + 0.2, 0, 0.28, 0.15, 0xe8e0d0); }
      else if (b % 3 === 1) {
        // A sack of seed, its neck rolled down, a scoop stuck in it.
        k.lathe(snap(x), snap(0.24), 0, 0.32, [[0, 0.16], [0.3, 0.2], [0.75, 0.17], [0.85, 0.11], [1, 0.13]], fleck(0xc8b088, 0.08, 2));
        k.lathe(snap(x), snap(0.24), 0.27, 0.31, 0.11, fleck(0xe0c070, 0.12, 1));
        k.lathe(snap(x), snap(0.24), 0.29, 0.33, [[0, 0.12], [1, 0.14]], fleck(0xd8c8a0, 0.06, 2));
        k.cyl([x + 0.03, 0.3, 0.24], [x + 0.1, 0.42, 0.28], u(1.5), 0x9a6a3e);
      } else for (const dx of [-0.22, 0.05, 0.3]) jar(k, x + dx, 0, 0.24, { kind: "squat", h: 0.3, r: 0.1, fill: [0xf0821e, 0xd8a83a, 0xa8302a][Math.floor(r() * 3)], stuff: "liquid", label: true, cap: 0xa83a2a });
    }
  });
  return assemble(main, [wares(-1), -L / 2, 1.02 + 3 / RES, 0], ...ys.map((y, row) => [wares(row), -L / 2, y + 2 / RES, 0]));
}

export function shopDoor({ width = 1.5, height = 2.56, depth = 0.25 } = {}, look = SHOP) {
  return doorway({ width, height, depth, style: "shop", hinge: "right" }, look);
}
