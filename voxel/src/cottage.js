import { Voxels, seeded, vary } from "./voxels.js";
import { Face } from "./face.js";
import { COTTAGE, B, hash, noise, shade, tint, ring, facing, without, shingles, wallLantern, pixelArt } from "./world.js";

// The house through its four levels, after the main game's exteriors: the
// little cottage, the crooked cottage (taller and lilac, under a leaning slate
// roof), the midnight manor (a stone ground floor, a balcony and a turret) and
// the haunted haven (a second spire, violet windows, cobwebs, ghost lights and
// bats). It is built at the ground's grain, B: the front is painted cell by
// cell as the rooms' walls are and merged into few boxes, under a roof of
// staggered shingles with moss, dormers and a brick chimney with pots.
const LOOKS = [
  { wall: 0xe2d2b4, timber: 0x4a2e1c, door: 0x6e4628, curtain: 0x8a2a2a, roof: [0x5a3624, 0x664028, 0x4e2e20, 0x704a30], moss: [0x5a6430, 0x4a5428], window: "arch" },
  { wall: 0xcdb6b0, timber: 0x3e2618, door: 0x5e3c24, curtain: 0x6a2a5a, shutter: 0x5a2e52, roof: [0x3c3448, 0x463c54, 0x332c3e, 0x4e4460], moss: [0x4e5a38, 0x3e4a30], window: "gothic", lean: 0.05 },
  { wall: 0xb8a4b0, timber: 0x34201a, door: 0x523222, curtain: 0x5a2448, roof: [0x2e2a3c, 0x383248, 0x26222f, 0x403a52], moss: [0x3e4a38], window: "gothic", stone: true },
  { wall: 0xa492a8, timber: 0x2e1c18, door: 0x4a2c20, curtain: 0x3a2050, roof: [0x2a2036, 0x342840, 0x221a2c, 0x3c3050], moss: [0x3a4636], window: "gothic", stone: true, lean: 0.02, haunted: true },
];
// Each level's front, from the door (COTTAGE.x): its width and left edge, wall
// height, and windows as [x, sill, straight height, shutters] in units.
const PLANS = [
  { w: 7, left: -3.5, wallH: 3.3, windows: [[-1.95, 1.4, 0.7], [1.95, 1.4, 0.7]], dormers: [0], chimney: 4.4 },
  { w: 7, left: -3.5, wallH: 4.3, windows: [[-1.95, 1.4, 0.6], [1.95, 1.4, 0.6], [-1.95, 3.3, 0.5, true], [0, 3.4, 0.4], [1.95, 3.3, 0.5, true]], dormers: [-1.45, 1.45], chimney: 5.2 },
  { w: 8.5, left: -5, wallH: 5.8, windows: [[-2.05, 1.2, 0.6], [2.05, 1.2, 0.6], [-2.05, 3.6, 0.6], [0, 3.6, 0.6], [1.75, 3.6, 0.6]], dormers: [-1.3, 1.45], chimney: 5.5 },
  { w: 8.5, left: -5, wallH: 5.8, windows: [[-2.05, 1.2, 0.6], [2.05, 1.2, 0.6], [-2.05, 3.6, 0.6], [0, 3.6, 0.6], [1.75, 3.6, 0.6]], dormers: [-1.3, 1.45], chimney: 5.8 },
];
const GLOW = 0xffb85a, VIOLET = 0x9a62e0, IRON = 0x1c1418, LEAD = 0x2a1e1c;
const STONE = [0x6e6470, 0x5e5662, 0x7c7180, 0x665c6c], MORTAR = 0x3e3644, DRESSED = 0x8c8294;
const IVY = [0x3d5a2a, 0x2e4a22, 0x557a32, 0x46682c], CREEPER = [0x8a2422, 0xb8361e, 0xdc5a22, 0x5a1820];
const cells = (u) => Math.round(u / B);

// Inks for the front, [colour, relief, glows]: limewashed plaster in soft
// blotches, coursed stone with its mortar, and timber grained along its length.
const plaster = (look, i, j) => {
  const n = noise(i * 0.08, j * 0.1, 3);
  return [n > 0.66 ? tint(look.wall, 0.05) : n < 0.3 ? shade(look.wall, 0.07) : look.wall, 0];
};
function masonry(i, j, seed = 1) {
  const c = Math.floor(j / 3);
  if (j % 3 === 2) return [MORTAR, 0];
  const len = 5 + ((hash(c, seed, 1) * 3) | 0), at = i + ((hash(c, seed, 2) * len) | 0), s = Math.floor(at / len);
  if (at % len === 0) return [MORTAR, 0.01];
  const k = hash(s, c, seed);
  return [STONE[(s + c + ((k * 2) | 0)) % 4], 0.02 + ((k * 3) | 0) * 0.012];
}
const grain = (look, i, j, across) => {
  const g = across ? hash(Math.floor((i + hash(j, 5) * 7) / 6), j, 11) : hash(i, Math.floor((j + hash(i, 6) * 7) / 6), 12);
  return [g < 0.22 ? tint(look.timber, 0.13) : g > 0.86 ? shade(look.timber, 0.25) : look.timber, 0.05];
};

// A window: glass that glows, set back behind its leading (a cross of glazing
// bars in the cottage, diamonds in gothic lights), curtains tied back with a
// gold cord, a frame of timber or dressed stone, and on the crooked cottage,
// painted shutters with a crescent moon cut through. (cx, y0) is its bottom
// middle in cells, w its width, h its straight height.
function windowFace(f, s, look) {
  const half = s.w / 2, r = s.kind === "gothic" ? s.w * 0.62 : half, off = r - half;
  const open = (i, j) => {
    const dx = Math.abs(i + 0.5 - s.cx), dy = j + 0.5 - s.y0;
    return dx <= half && dy >= 0 && (dy <= s.h || (dx + off) ** 2 + (dy - s.h) ** 2 <= r * r);
  };
  const apex = s.y0 + s.h + Math.ceil(Math.sqrt(r * r - off * off)), tie = s.h * 0.45, bright = tint(s.glow, 0.35);
  f.paint(Math.floor(s.cx - half) - 3, s.y0 - 1, Math.ceil(s.cx + half) + 3, apex + 3, (i, j) => {
    const dx = i + 0.5 - s.cx, dy = j + 0.5 - s.y0;
    if (open(i, j)) {
      const edge = half - Math.abs(dx), drape = dy > s.h ? 2 : dy > tie ? 1 + (dy > (s.h + tie) / 2) : 1 + (dy < tie / 2);
      if (s.curtains !== false && edge < drape) return Math.abs(dy - tie) < 0.6 ? [0xc9a050, -0.05] : [edge < 1 ? shade(look.curtain, 0.25) : look.curtain, -0.06];
      const lead = s.kind === "gothic" ? (i + j) % 6 === 0 || (((i - j) % 6) + 6) % 6 === 0 : Math.abs(dx) < 0.6 || Math.abs(dy - Math.round(s.h * 0.6)) < 0.5;
      if (lead) return [LEAD, -0.04];
      return [Math.hypot(dx / half, (dy - s.h * 0.4) / s.h) < 0.55 ? bright : s.glow, -0.07, true];
    }
    const d = ring(open, i, j, 2);
    if (s.stone) return d === 1 ? [DRESSED, 0.07] : d === 2 ? [shade(DRESSED, 0.15), 0.05] : null;
    return d === 1 ? [look.timber, 0.06] : null;
  });
  if (s.stone) f.rect(Math.round(s.cx) - 1, apex + 1, Math.round(s.cx) + 1, apex + 3, [tint(DRESSED, 0.1), 0.09]);   // keystone
  if (!s.shutters) return;
  const MOON = [".##", "#..", "#..", ".##"];
  for (const side of [-1, 1]) {
    const i0 = side < 0 ? Math.floor(s.cx - half) - 5 : Math.ceil(s.cx + half) + 1, H = s.h + 4;
    f.paint(i0, s.y0, i0 + 4, s.y0 + H, (i, j) => {
      const k = i - i0, y = j - s.y0, m = MOON[H - 3 - y]?.[side < 0 ? k - 1 : 3 - k];
      if (m === "#") return [0x1a1218, 0.02];
      const brace = y === 1 || y === H - 2 || (y > 1 && y < H - 2 && Math.round(((y - 1) / (H - 3)) * 3) === (side < 0 ? 3 - k : k));
      return [brace ? tint(look.shutter, 0.14) : k % 2 ? shade(look.shutter, 0.14) : look.shutter, 0.06];
    });
  }
}

// The front door: planks under a round (or, at the manor, pointed) stone
// arch, with iron strap hinges ending in spear points and a ring to knock with.
function doorFace(f, cx, y0, w, h, pointed, look) {
  const half = w / 2, r = pointed ? w * 0.62 : half, off = r - half;
  const open = (i, j) => {
    const dx = Math.abs(i + 0.5 - cx), dy = j + 0.5 - y0;
    return dx <= half && dy >= 0 && (dy <= h || (dx + off) ** 2 + (dy - h) ** 2 <= r * r);
  };
  const top = y0 + h + Math.ceil(Math.sqrt(r * r - off * off));
  f.paint(cx - half - 3, y0, cx + half + 3, top + 4, (i, j) => {
    const dx = i + 0.5 - cx, dy = j + 0.5 - y0, u = i - (cx - half);
    if (open(i, j)) {
      for (const hy of [Math.round(h * 0.2), Math.round(h * 0.78)]) {
        const along = dx + half, tip = half * 1.15;
        if ((j - y0 === hy && along < tip) || (Math.abs(j - y0 - hy) === 1 && Math.abs(along - tip + 0.5) < 1)) return [IRON, -0.05];
      }
      if (Math.abs(Math.hypot(dx - half * 0.55, dy - h * 0.5) - 1.1) < 0.55) return [IRON, -0.04];
      const plank = Math.floor(u / 3), seam = u % 3 === 0 && u > 0, streak = hash(i, Math.floor((j + plank * 3) / 5), 4) < 0.18;
      const c = [look.door, tint(look.door, 0.07), shade(look.door, 0.08)][plank % 3];
      return [seam ? shade(look.door, 0.35) : streak ? shade(c, 0.12) : c, -0.09];
    }
    const d = ring(open, i, j, 2);
    if (!d) return null;
    // Voussoirs round the head with a keystone; quoins down the jambs, long and short in turn.
    if (dy > h) {
      const seg = Math.floor(Math.atan2(dy - h, dx) / (Math.PI / 7)), key = Math.abs(dx) < 1.5 && dy > h + r - off - 1;
      return [key ? tint(DRESSED, 0.1) : seg % 2 ? DRESSED : shade(DRESSED, 0.12), key ? 0.1 : 0.07];
    }
    const block = Math.floor(dy / 3);
    if (d === 2 && block % 2) return null;
    return [block % 2 ? shade(DRESSED, 0.08) : DRESSED, 0.07];
  });
}

// Ivy (or red creeper) climbing from the ground: a few wandering stems with
// leaves in twos and threes, spreading along under the eaves at the top.
function climber(f, i0, dir, j0, j1, tones, seed) {
  for (let strand = 0; strand < 3; strand++) {
    let i = i0 + dir * strand * 2;
    for (let j = j0; j < j1 - (strand === 2 ? 8 : 0); j++) {
      const h = hash(j, strand, seed);
      i += h < 0.22 ? dir : h > 0.9 ? -dir : 0;
      f.set(i, j, [shade(tones[1], 0.3), 0.1]);
      if (hash(j, strand, seed + 1) < 0.6) for (const [a, b] of [[-1, 0], [1, 0], [-1, 1], [1, 1], [0, 1]]) if (hash(j + b, a + strand, seed + 2) < 0.55) f.set(i + a, j + b, [tones[(hash(i + a, j + b, seed) * tones.length) | 0], 0.13]);
    }
  }
  for (let k = 0; k < 14; k++) for (let b = 0; b < 3; b++) if (hash(k, b, seed + 3) < 0.7 - b * 0.2) f.set(i0 + dir * (4 + k), j1 - 1 - b - (k % 3 === 0), [tones[(hash(k, b, seed + 4) * tones.length) | 0], 0.13]);
}
// Cobwebs in a top corner: spokes and sagging threads of grey silk.
function cobweb(f, i0, j0, dir, size) {
  f.paint(Math.min(i0, i0 + dir * size), j0 - size, Math.max(i0, i0 + dir * size) + 1, j0 + 1, (i, j) => {
    const x = (i - i0) * dir, y = j0 - j, d = Math.hypot(x, y), a = Math.atan2(y, x);
    if (x < 0 || y < 0 || d > size) return null;
    const spoke = [0.2, 0.75, 1.3].some((s) => Math.abs(Math.sin(a - s)) * d < 0.5), thread = [size * 0.35, size * 0.7].some((s) => Math.abs(d - s * (0.88 + 0.12 * Math.cos((a - 0.75) * 4))) < 0.5);
    return spoke || thread ? [0xb8b0c4, 0.16] : null;
  });
}

// The whole front of the house, painted cell by cell: stone, plaster, timber
// framing, windows, the door, climbers, and soft shade under the eaves, at
// the foot of the wall and in streaks below each sill.
function frontFace(level, look, plan, top, windows) {
  const cols = cells(plan.w), rows = cells(top), f = new Face(cols, rows, B), door = cells(-plan.left);
  const stoneTop = look.stone ? 28 : 7, tilt = level === 1 ? 0.13 : 0;
  f.paint(0, 0, cols, rows, (i, j) => (j < stoneTop ? masonry(i, j) : plaster(look, i, j)));
  // Timber: sole plate, rails and top plate across; posts at the corners, by the door and between windows.
  const across = (j0, j1) => f.paint(0, j0, cols, j1, (i, j) => grain(look, i, j, true));
  const post = (c, j0, j1, lean = 0) => f.paint(0, j0, cols, j1, (i, j) => { const at = c + Math.round((j - j0) * lean); return i >= at && i < at + 3 ? grain(look, i, j) : null; });
  const brace = (a, b, c, d) => { for (let t = 0; t <= 1; t += 0.02) { const i = Math.round(a + (c - a) * t), j = Math.round(b + (d - b) * t); f.set(i, j, grain(look, i, j)); f.set(i + 1, j, grain(look, i + 1, j)); } };
  if (look.stone) {
    f.rect(0, 28, cols, 30, [tint(DRESSED, 0.06), 0.08]); f.rect(0, 30, cols, 31, [shade(DRESSED, 0.2), 0.06]);   // string course
    across(31, 33); across(rows - 3, rows);
    for (const c of [14, 39, 58, cols - 3]) post(c, 33, rows - 3);
    for (const [a, b] of [[17, 39], [42, 58], [61, cols - 3]]) if (b - a > 8) { brace(a, 52, (a + b) / 2 - 1, rows - 4); brace(b - 2, 52, (a + b) / 2, rows - 4); }
  } else {
    across(7, 9); across(level ? 30 : 29, level ? 32 : 31); across(rows - 3, rows);
    for (const c of [0, cols - 3]) post(c, 9, rows - 3);
    for (const c of [door - 10, door + 7]) post(c, 9, level ? 30 : 29);
    if (level) {
      for (const c of [door - 9, door + 6]) post(c, 32, rows - 3, tilt * (c < door ? 1 : -1));
      brace(3, 33, 8, rows - 4); brace(cols - 5, 33, cols - 10, rows - 4);
    }
  }
  // A patch where the plaster has come away from the bricks beneath.
  const bx = level >= 2 ? 17 : 4, by = level >= 2 ? 36 : 18;
  f.paint(bx, by, bx + 6, by + 5, (i, j) => (Math.hypot((i - bx - 2.5) / 3, (j - by - 2) / 2.2) < 1 ? (j % 2 === 1 || (i + (j % 4 < 2 ? 0 : 1)) % 3 === 0 ? [0x6a4a44, -0.02] : [0x9a5a44, -0.01]) : null));
  for (const s of windows) windowFace(f, s, look);
  doorFace(f, door, 7, 12, look.stone ? 11 : 13, look.stone, look);
  climber(f, look.stone ? 15 : 1, 1, 7, rows - 2, IVY, 10 + level);
  climber(f, cols - 2, -1, 7, rows - (level === 3 ? 30 : 2), CREEPER, 20 + level);
  if (look.haunted) { cobweb(f, 15, rows - 4, 1, 10); cobweb(f, cols - 1, rows - 4, -1, 9); cobweb(f, door + 6, 28, 1, 5); }
  // Shade: under the eaves, damp at the foot of the wall, darker corners, and weathering streaks below each sill.
  const streak = (i, j) => {
    for (const s of windows) {
      const below = s.y0 - 2 - j, len = 4 + Math.floor(hash(i, 9) * 9);
      if (Math.abs(i + 0.5 - s.cx) < s.w / 2 + 1 && below >= 0 && below < len && hash(i, 4) < 0.5) return below < len / 2 ? 0.16 : 0.08;
    }
    return 0;
  };
  f.shade((i, j) => {
    const eave = rows - j <= 3 ? 0.3 : rows - j <= 7 ? 0.15 : 0, damp = j < stoneTop + 4 ? 0.08 : 0, corner = Math.min(i, cols - 1 - i) < 2 ? 0.08 : 0;
    return 1 - (1 - eave) * (1 - damp) * (1 - corner) * (1 - streak(i, j));
  });
  return f;
}

// A sill under each window, and under the ground floor's a flower box with
// flowers on top and ivy trailing over its front.
function sills(v, r, s, x0, front, box) {
  const x = x0 + s.cx * B, w = s.w * B, y = s.y0 * B;
  v.box(x - w / 2 - 0.12, y - 0.1, front - 0.05, w + 0.24, 0.1, 0.2, DRESSED);
  v.box(x - w / 2 - 0.12, y - 0.02, front + 0.14, w + 0.24, 0.02, 0.02, tint(DRESSED, 0.2));
  if (!box) return;
  v.box(x - w / 2 - 0.1, y - 0.42, front, w + 0.2, 0.3, 0.3, 0x5a3a26);
  v.box(x - w / 2 - 0.1, y - 0.32, front + 0.3, w + 0.2, 0.04, 0.01, 0x3b2618);
  const FLOWERS = [0x9d55e6, 0xe8862e, 0xc2552a, 0xc89cff, 0xf0c050];
  for (let k = 0, fx = x - w / 2 - 0.05; fx < x + w / 2 + 0.05; k++, fx += 0.13) {
    v.box(fx, y - 0.12, front + 0.06, 0.1, 0.1 + (k % 2) * 0.06, 0.16, IVY[k % 4]);
    if (r() < 0.75) v.box(fx - 0.01, y - 0.04 + (k % 2) * 0.06, front + 0.08 + r() * 0.08, 0.1, 0.08, 0.1, FLOWERS[(r() * 5) | 0]);
    if (r() < 0.35) v.box(fx, y - 0.42 - r() * 0.3, front + 0.3, 0.08, 0.32, 0.04, IVY[(r() * 4) | 0]);
  }
}

// A hood over the door: three courses of shingles on carved brackets.
function hood(v, r, x, y, front, look) {
  shingles(v, r, { x0: x - 1, x1: x + 1, y, z: front + 0.62, n: 3, rise: 0.14, run: 0.2, tones: look.roof });
  v.box(x - 1.04, y - 0.06, front + 0.6, 2.08, 0.08, 0.06, look.timber);
  for (const dx of [-0.9, 0.82]) for (let k = 0; k < 4; k++) v.box(x + dx, y - 0.4 + k * 0.1, front, 0.08, 0.1, 0.12 + k * 0.12, look.timber);
}
// The manor's balcony over the door: a stone slab on corbels, an iron railing.
function balcony(v, x, y, front) {
  v.box(x - 1.3, y, front - 0.05, 2.6, 0.18, 0.75, DRESSED);
  v.box(x - 1.3, y + 0.16, front + 0.68, 2.6, 0.03, 0.02, tint(DRESSED, 0.2));
  for (const dx of [-1, 0.9]) for (let k = 0; k < 3; k++) v.box(x + dx, y - 0.3 + k * 0.1, front, 0.12, 0.1, 0.2 + k * 0.18, shade(DRESSED, 0.1));
  for (const [ry, h] of [[y + 0.2, 0.04], [y + 0.62, 0.05]]) v.box(x - 1.25, ry, front + 0.6, 2.5, h, 0.05, IRON);
  for (let bx = x - 1.22; bx < x + 1.25; bx += 0.15) v.box(bx, y + 0.18, front + 0.61, 0.03, 0.46, 0.03, IRON);
  for (const dx of [-1.25, 1.2]) { v.box(x + dx, y + 0.18, front + 0.58, 0.06, 0.58, 0.06, IRON); v.box(x + dx - 0.01, y + 0.76, front + 0.57, 0.08, 0.08, 0.08, IRON); }
}

// A dormer standing out of the roof: a little gable of plaster with carved
// bargeboards, its own window, a finial, and a stepped roof running back.
function dormer(v, r, cx, top, front, look, s) {
  const W = 15, H = 22, eave = 13, z = front - 0.25, x0 = cx - (W * B) / 2, y0 = top + 0.4, f = new Face(W, H, B);
  const span = (j) => (j < eave ? W / 2 : ((H - j) * W) / 2 / (H - eave));
  const inside = (i, j) => j >= 0 && Math.abs(i + 0.5 - W / 2) <= span(j);
  f.paint(0, 0, W, H, (i, j) => (!inside(i, j) ? null : j >= eave - 1 && (!inside(i - 2, j) || !inside(i + 2, j) || !inside(i, j + 2)) ? [shade(look.timber, (i + j) % 3 === 0 ? 0.3 : 0), 0.16] : plaster(look, i, j + 40)));
  windowFace(f, { ...s, cx: W / 2, y0: 6, w: 7, h: 4, curtains: false }, look);
  f.shade((i, j) => (j < 7 ? 0.15 : 0));
  f.build(facing(v, x0, y0, z, 1.6));
  for (let k = 0; span(eave + k) + 1.5 > 1; k++) {
    const hw = (span(eave + k) + 1.5) * B;
    v.box(cx - hw, y0 + (eave + k) * B, z - 1.6, hw * 2, B, 1.72, vary(look.roof[k % look.roof.length], 0.05, r));
  }
  v.box(cx - 0.03, y0 + H * B, z + 0.04, 0.06, 0.32, 0.06, IRON); v.box(cx - 0.06, y0 + H * B + 0.22, z + 0.01, 0.12, 0.08, 0.12, IRON);
}

// The brick chimney behind the ridge: courses of bricks on a mortar core, a
// corbelled cap and two clay pots blackened with soot.
function chimney(v, r, cx, z, y0, y1, from) {
  const w = 0.9, BRICK = [0x8a4a3a, 0x7a3e32, 0x9a5a44, 0x6e3a30];
  v.box(cx - w / 2, y0, z, w, y1 - y0, w, 0x4a3a3a);
  for (let y = from, row = 0; y < y1 - 0.05; y += 0.1, row++) for (let x = cx - w / 2 - (row % 2) * 0.12; x < cx + w / 2 - 0.02; x += 0.24) {
    const a = Math.max(x, cx - w / 2) + 0.012, b = Math.min(x + 0.24, cx + w / 2) - 0.012;
    if (b - a > 0.04) v.box(a, y + 0.012, z + w - 0.01, b - a, 0.076, 0.03, BRICK[(r() * 4) | 0]);
  }
  v.box(cx - w / 2 - 0.08, y1, z - 0.08, w + 0.16, 0.12, w + 0.16, 0x7a4636); v.box(cx - w / 2 - 0.04, y1 + 0.12, z - 0.04, w + 0.08, 0.08, w + 0.08, 0x5e3a30);
  for (const dx of [-0.2, 0.2]) {
    v.box(cx + dx - 0.1, y1 + 0.2, z + w / 2 - 0.1, 0.2, 0.34, 0.2, 0xb0603a);
    v.box(cx + dx - 0.13, y1 + 0.5, z + w / 2 - 0.13, 0.26, 0.06, 0.26, 0xc0704a);
    v.box(cx + dx - 0.07, y1 + 0.52, z + w / 2 - 0.07, 0.14, 0.05, 0.14, 0x1e1418);
  }
}

// A round tower as upright strips stepping back round its front, each painted
// by ink(x, y), across from its middle and up from the ground, and darker as it
// turns away.
function drum(v, cx, cz, R, y0, h, ink) {
  for (let x = -R; x < R - 0.01; x += 2 * B) {
    const m = Math.min(x + B, R), depth = Math.sqrt(Math.max(0.01, R * R - m * m)), turn = Math.abs(m) / R, f = new Face(2, cells(h), B);
    f.paint(0, 0, 2, f.rows, (i, j) => ink(x + (i + 0.5) * B, y0 + (j + 0.5) * B, turn));
    f.shade(() => turn * turn * 0.4);
    f.build(facing(v, cx + x, y0, cz + depth, depth));
  }
}
// A conical spire of slates in rings, flared at the eaves, with an iron finial.
function spire(v, r, cx, cz, R, y, h, look, vane) {
  const n = Math.round(h / 0.14);
  for (let k = 0; k < n; k++) {
    const rr = k === 0 ? R + 0.12 : R * (1 - k / n) ** 1.1 + 0.04, c = vary(look.roof[k % 3 === 2 ? 2 : k % 2], 0.06, r);
    v.block(cx, y + k * 0.14, cz, rr * 2, 0.14, rr * 1.3, c);
    v.block(cx, y + k * 0.14, cz, rr * 1.3, 0.14, rr * 2, c);
  }
  v.block(cx, y + h, cz, 0.05, 0.6, 0.05, IRON); v.block(cx, y + h + 0.24, cz, 0.12, 0.12, 0.12, IRON);
  if (vane) for (const [dx, dy, w] of [[0, 0.5, 0.06], [-0.12, 0.54, 0.16], [0.12, 0.54, 0.16], [-0.24, 0.5, 0.1], [0.24, 0.5, 0.1]]) v.block(cx + dx, y + h + dy, cz, w, 0.06, 0.03, IRON);   // a bat
}
const towerInk = (look, glow, wins, stoneTo) => (x, y, turn) => {
  const i = Math.round(x / B) + 40, j = Math.floor(y / B), w = wins.find(([a, b]) => y >= a - 0.1 && y < b + 0.1);
  if (w) {
    const [a, b] = w, half = 0.22 - Math.max(0, y - (b - 0.2)) * 0.8;
    if (Math.abs(x) < half && y >= a && y < b) return Math.abs(x) < 0.05 || Math.abs(y - (a + b) / 2) < 0.04 ? [LEAD, -0.04] : [glow, -0.06, true];
    if (Math.abs(x) < half + 0.12) return [DRESSED, 0.05];
  }
  if (y < stoneTo) return masonry(i, j, 3);
  if (Math.abs(y - stoneTo - 0.05) < 0.1) return [tint(DRESSED, 0.06), 0.06];
  const [c, out] = plaster(look, i, j);
  return [shade(c, 0.22), out];   // darker than the front, so the tower stands back in the moonlight
};

const GHOST = [".###.", "#####", "#o#o#", "#####", "##o##", "#####", "#####", "#.#.#"];
const BAT = ["#....#.#....#", "##..#####..##", "#####o#o#####", ".###.###.###.", "..#.......#.."];
const CAT = ["#.#....", "###....", "###....", ".###..#", ".####.#", ".#####."];

export function buildCottage(level) {
  const v = new Voxels(), r = seeded(77 + level), look = LOOKS[level], plan = PLANS[level];
  const { x } = COTTAGE, front = COTTAGE.z + 2.5, d = 5, z0 = front - d, x0 = x + plan.left, w = plan.w, top = 0.7 + plan.wallH;
  const windows = plan.windows.map(([wx, sill, h, shutters]) => {
    const cx = Math.round(((wx - plan.left) / B) * 2) / 2, glow = level === 3 && sill > 2 && wx >= 0 ? VIOLET : GLOW;
    return { cx, y0: cells(sill), w: Number.isInteger(cx) ? 10 : 11, h: cells(h), kind: look.window, glow, shutters: shutters && look.shutter, stone: look.stone };
  });
  // The house's body, its front painted cell by cell, and what stands out of it.
  v.box(x0, 0, z0, w, top, d - 0.1, look.wall);
  frontFace(level, look, plan, top, windows).build(facing(v, x0, 0, front));
  for (const s of windows) sills(v, r, s, x0, front, s.y0 < 20);
  if (look.stone) balcony(v, x, 2.9, front); else hood(v, r, x, 2.86, front, look);
  wallLantern(v, x - 0.95, 1.6, front); wallLantern(v, x + 0.95, 1.6, front);
  // Towers: the manor's turret at the left end, and the haven's corbelled spire at the right corner.
  const towers = [];
  if (level >= 2) {
    const t = { cx: x - 4.7, cz: front - 0.55, R: 1.1, top: 10 };
    drum(v, t.cx, t.cz, t.R, 0, 10, towerInk(look, level === 3 ? VIOLET : GLOW, [[1.3, 2.3], [3.9, 5], [7.4, 8.5]], 2.9));
    for (let k = 0; k < 3; k++) v.block(t.cx, 9.55 + k * 0.15, t.cz, (t.R + 0.04 + k * 0.05) * 2, 0.15, (t.R + 0.04 + k * 0.05) * 1.35, k === 2 ? tint(DRESSED, 0.05) : DRESSED);
    spire(v, r, t.cx, t.cz, t.R + 0.1, 10, 2.6, look, level === 3);
    towers.push(t);
  }
  if (level === 3) {
    const t = { cx: x + 3.05, cz: front - 0.05, R: 0.7, top: 7.5 };
    for (let k = 0; k < 5; k++) v.block(t.cx, 2.2 + k * 0.14, t.cz - t.R * 0.3, (0.25 + k * 0.1) * 2, 0.14, 0.25 + k * 0.12 + t.R * 0.6, shade(DRESSED, 0.1 - k * 0.02));
    drum(v, t.cx, t.cz, t.R, 2.9, 4.6, towerInk(look, VIOLET, [[4.1, 4.9], [5.9, 6.7]], 3.3));
    spire(v, r, t.cx, t.cz, t.R + 0.08, 7.5, 2.5, look, false);
    towers.push(t);
  }
  // Where a tower rises through the roof, the shingles stop at it: its full
  // width in front of its middle, the chord of its round behind.
  const gaps = (z, y = 0) => towers.filter((t) => z > t.cz - t.R && y < t.top).map((t) => { const c = Math.sqrt(Math.max(0, t.R * t.R - Math.min(0, z - t.cz) ** 2)) + 0.05; return [t.cx - c, t.cx + c]; });
  // The roof: shingles from the eaves up to the ridge over the front, plain
  // courses behind, a fascia along the eaves, and a ridge of tiles (or, at the
  // manor, iron cresting).
  const n = 19, rise = 3.8 / n, run = 3 / n, lean = look.lean ?? 0, eaveZ = front + 0.5;
  const ridge = shingles(v, r, { x0: x0 - 0.6, x1: x0 + w + 0.6, y: top, z: eaveZ, n, rise, run, tones: look.roof, moss: look.moss, lean, gaps });
  for (let k = 0; k < n; k++) v.box(x0 - 0.6 + lean * k, top + k * rise, z0 - 0.5 + k * run, w + 1.2, rise, ridge - (z0 - 0.5 + k * run), shade(look.roof[0], 0.1));
  for (const [a, b] of without(x0 - 0.62, x0 + w + 0.62, gaps(eaveZ))) {
    v.box(a, top - 0.1, eaveZ - 0.02, b - a, 0.14, 0.08, look.timber);
    for (let dx = a + 0.1; dx < b - 0.1; dx += 0.3) v.box(dx, top - 0.18, eaveZ, 0.08, 0.08, 0.05, look.timber);   // a fringe of carved drops
  }
  const ridgeY = top + n * rise, rx0 = x0 - 0.6 + lean * n, rx1 = x0 + w + 0.6 + lean * n;
  for (let rx = rx0; rx < rx1 - 0.05; rx += 0.32) v.box(rx, ridgeY, ridge - 0.14, Math.min(0.3, rx1 - rx), 0.12, 0.28, vary(shade(look.roof[1], 0.15), 0.08, r));
  if (look.stone) for (let rx = rx0 + 0.2; rx < rx1 - 0.2; rx += 0.26) { v.box(rx, ridgeY + 0.12, ridge - 0.015, 0.03, 0.2, 0.03, IRON); v.box(rx - 0.025, ridgeY + 0.28, ridge - 0.04, 0.08, 0.08, 0.08, IRON); }
  else pixelArt(v, CAT, { "#": [IRON, 0.02] }, x - 2.6 + lean * n, ridgeY + 0.5, ridge + 0.02, B, 0.04);   // a weathervane: Skyla
  if (!look.stone) v.box(x - 2.29 + lean * n, ridgeY + 0.1, ridge - 0.02, 0.04, 0.42, 0.04, IRON);
  for (const dx of plan.dormers) dormer(v, r, x + dx + lean * 4, top, front, look, { kind: look.window, glow: level === 3 ? VIOLET : GLOW, stone: false });
  chimney(v, r, x + 2.15 + lean * 15, z0 + 1, top + 0.5, top + 0.5 + plan.chimney, ridgeY - 0.6);
  // The haven's ghost lights and bats.
  if (look.haunted) {
    for (const [gx, gy, gz] of [[x0 - 1.4, 3.4, front + 0.4], [x0 + w + 0.5, 4.8, front - 0.6], [x0 + 3.2, top + 4.4, front - 2.4]]) pixelArt(v, GHOST, { "#": [0xd8c4ff, 0, true], o: [0x2a1a3a, 0.01] }, gx, gy, gz);
    for (const [bx, by, bz] of [[x0 + 1.2, top + 4.8, front - 2], [x0 + 4.4, top + 5.6, front - 2.2], [x0 + 6.6, top + 4.9, front - 1.8], [x0 + w + 0.2, top + 2.6, front]]) pixelArt(v, BAT, { "#": [0x120c14, 0], o: [0xff9a3a, 0.01, true] }, bx, by, bz);
  }
  return v.build();
}
