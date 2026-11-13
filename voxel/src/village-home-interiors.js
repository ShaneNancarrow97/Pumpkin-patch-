// The neighbours' homes, inside: seven front-open halls like the Velvet Bat's, each built for the one who lives
// there. Front +z is the door, x runs across and z back into the room; every hall leaves the way from its door to
// its host clear, and says where a walker can't go in its own `blocks` (x0, z0, x1, z1).
//
// Things that move are left as marks for village-hall-life.js to draw: fire, candle, steam, motes, sparkle and
// pendulum. A `lamp` mark is where one of the shared lights may stand.
import { seeded, vary } from "./voxels.js";
import { C, lantern, hallShell, bookRow, pumpkin, jackOLantern, crow, shade } from "./village-models.js";

const pick = (list, r) => list[(r() * list.length) | 0];
const TAU = Math.PI * 2;

// ---- Furniture every room shares -----------------------------------------------------------------------------
// A candle with a live flame; lamp makes it one of the room's lights.
const candle = (f, x, y, z, h = .22, lamp = false) => { f.block(x, y, z, .08, h, .08, 0xf0e6d8); f.block(x, y + h, z, .03, .04, .03, 0xffc060, true); f.mark?.("candle", x, y + h + .01, z); if (lamp) f.mark?.("lamp", x, y + h + .35, z); };
// A table on four legs with a rail under the top; returns the height of its surface.
const table = (f, x, z, w, d, h = .78, top = 0x6a4a2e, leg = 0x3a2418) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.block(x + sx * (w / 2 - .09), 0, z + sz * (d / 2 - .09), .1, h, .1, leg); f.block(x, h - .1, z, w - .14, .07, d - .14, leg); f.block(x, h, z, w, .08, d, top); return h + .08; };
// A round table on a pedestal, with a cloth if one is named.
const roundTable = (f, x, z, R = .8, h = .76, top = 0x6a4a2e, cloth = null) => { f.block(x, 0, z, .5, .06, .5, 0x2a1810); f.block(x, .06, z, .14, h - .06, .14, 0x2a1810); for (let i = -4; i <= 4; i++) { const half = Math.sqrt(Math.max(0, 1 - (i / 4.4) ** 2)) * R; f.block(x + i * R / 4.4, h, z, R / 4.4 + .01, .07, half * 2, top); if (cloth != null) { f.block(x + i * R / 4.4, h + .07, z, R / 4.4 + .01, .015, half * 2 + .06, cloth); for (const s of [-1, 1]) f.block(x + i * R / 4.4, h - .22, z + s * (half + .03), R / 4.4 + .01, .3, .02, cloth); } } return h + (cloth != null ? .085 : .07); };
// A chair whose back stands on the side named: n is the back wall's side, s the door's.
const chair = (f, x, z, back = "n", wood = 0x5a3a24, seat = null) => { const [bx, bz] = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[back]; for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.block(x + sx * .19, 0, z + sz * .19, .06, .46, .06, wood); f.block(x, .46, z, .48, .06, .48, wood); if (seat != null) f.block(x, .52, z, .42, .05, .42, seat); for (const s of [-1, 1]) f.block(x + bx * .21 + bz * s * .2, .52, z + bz * .21 + bx * s * .2, .06, .62, .06, wood); f.block(x + bx * .21, .8, z + bz * .21, bx ? .05 : .4, .1, bz ? .05 : .4, wood); f.block(x + bx * .21, 1.06, z + bz * .21, bx ? .07 : .5, .12, bz ? .07 : .5, wood); };
// A rug with a border, and one with an inner border too.
const rug = (f, x, z, w, d, base, trim = C.gold, inner = null) => { f.block(x, .12, z, w, .02, d, base); for (const s of [-1, 1]) { f.block(x, .13, z + s * (d / 2 - .1), w - .12, .015, .07, trim); f.block(x + s * (w / 2 - .1), .13, z, .07, .015, d - .12, trim); if (inner != null) { f.block(x, .13, z + s * (d / 2 - .34), w - .6, .015, .05, inner); f.block(x + s * (w / 2 - .34), .13, z, .05, .015, d - .6, inner); } } };
// A round rug in rings of colour, outermost first: each ring is a solid disc laid a hair above the last.
const roundRug = (f, x, z, R, rings, r) => { rings.forEach((colour, i) => { const rad = R * (1 - i / rings.length), n = Math.max(3, Math.round(rad / .16)); for (let k = -n; k <= n; k++) { const half = Math.sqrt(Math.max(0, 1 - (k / (n + .5)) ** 2)) * rad; if (half > .02) f.block(x + k * rad / (n + .5), .12, z, rad / (n + .5) + .005, .02 + i * .004, half * 2, vary(colour, .03, r)); } }); };
// A window in the back wall: lit panes in a frame with mullions and a sill; arch rounds its top.
function backWindow(f, x, y, w, h, D, { glass = [0x4a4a9a, 0x5a5ab0], frame = C.beam, cols = 2, rows = 3, arch = false, sill = true } = {}) {
  const z = -D + .15, pw = w / cols, ph = h / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { if (arch && j === rows - 1 && (i === 0 || i === cols - 1) && cols > 2) continue; f.block(x - w / 2 + pw * (i + .5), y + ph * j, z, pw - .05, ph - .05, .04, glass[(i + j) % glass.length], true); }
  for (let i = 0; i <= cols; i++) f.block(x - w / 2 + pw * i, y, z + .03, .07, h, .07, frame); for (let j = 0; j <= rows; j++) f.block(x, y + ph * j - .03, z + .03, w + .07, .07, .07, frame);
  if (arch) for (let k = 0; k < 9; k++) { const a = Math.PI * k / 8; f.block(x + Math.cos(a) * w / 2, y + h + Math.sin(a) * w * .28, z + .03, .16, .16, .09, frame); }
  if (sill) f.block(x, y - .12, z + .12, w + .3, .09, .26, frame);
}
// A window in a side wall (sx is -1 for the left wall, 1 for the right).
function sideWindow(f, sx, hw, z, y, w, h, { glass = [0x4a4a9a, 0x5a5ab0], frame = C.beam, cols = 2, rows = 3, curtain = null } = {}) {
  const x = sx * (hw - .15), pw = w / cols, ph = h / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) f.block(x, y + ph * j, z - w / 2 + pw * (i + .5), .04, ph - .05, pw - .05, glass[(i + j) % glass.length], true);
  for (let i = 0; i <= cols; i++) f.block(x - sx * .03, y, z - w / 2 + pw * i, .07, h, .07, frame); for (let j = 0; j <= rows; j++) f.block(x - sx * .03, y + ph * j - .03, z, .07, .07, w + .07, frame);
  f.block(x - sx * .12, y - .12, z, .26, .09, w + .3, frame);
  if (curtain != null) { f.block(x - sx * .2, y + h + .12, z, .1, .1, w + .9, C.brass); for (const s of [-1, 1]) for (let k = 0; k < 3; k++) f.block(x - sx * (.16 + (k % 2) * .05), y - .5, z + s * (w / 2 + .1 + k * .13), .08, h + .6, .13, vary(curtain, .08 + k * .02, () => .5)); }
}
// A shelf on the back wall with two brackets.
const wallShelf = (f, x, y, z, w, depth = .32, wood = 0x3a2418) => { f.block(x, y, z + depth / 2, w, .06, depth, wood); for (const s of [-1, 1]) f.block(x + s * (w / 2 - .15), y - .2, z + .06, .06, .2, .12, wood); };
// A row of jars along a shelf: stoppered, in mixed colours, a few of them glowing.
const jars = (f, r, x0, x1, y, z, colours, glowing = .25) => { for (let x = x0; x < x1; x += .2 + r() * .06) { if (r() < .12) continue; const h = .16 + r() * .16, c = pick(colours, r); f.block(x, y, z, .13, h, .13, c, r() < glowing); f.block(x, y + h, z, .09, .04, .09, 0x8a6a46); } };
// Something hung from the ceiling on a cord: a bundle of herbs, an onion string, a ham.
const hang = (f, x, z, H, len, colour, w = .16) => { f.block(x, H - len, z, .02, len, .02, 0x5a4a3a); f.block(x, H - len - .3, z, w, .3, w * .8, colour); f.block(x, H - len - .06, z, w * .5, .06, w * .5, 0x8a7a4a); };
// A hanging lantern on a chain, lit, and one of the room's lights.
const hangLantern = (f, x, z, H, drop = 1.1, size = .8) => { f.block(x, H - drop, z, .03, drop, .03, C.iron); lantern(f, x, H - drop - .62 * size, z, size); f.mark?.("lamp", x, H - drop - .3, z); };
// A plant in a pot: fern fronds, a flowering spray or a trailing vine.
function potPlant(f, x, y, z, r, kind = "fern", size = 1, pot = 0xa05a3a) {
  const k = size; f.block(x, y, z, .3 * k, .26 * k, .3 * k, pot); f.block(x, y + .26 * k, z, .36 * k, .05 * k, .36 * k, vary(pot, .1, r)); const top = y + .31 * k;
  if (kind === "fern") for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + r() * .3; for (let s = 1; s <= 3; s++) f.block(x + Math.cos(a) * s * .1 * k, top + s * .09 * k - (s === 3 ? .06 : 0), z + Math.sin(a) * s * .1 * k, .1 * k, .05 * k, .1 * k, vary(0x4a7a3a, .14, r)); }
  else if (kind === "flower") { for (let i = 0; i < 6; i++) { const dx = (r() - .5) * .22 * k, dz = (r() - .5) * .22 * k, h = (.2 + r() * .26) * k; f.block(x + dx, top, z + dz, .03, h, .03, 0x4a7a3a); f.block(x + dx, top + h, z + dz, .1 * k, .08 * k, .1 * k, pick([0xd6407a, 0xf5d04a, 0x9a6ae0, 0xf6f0f5, 0xf08a3a], r)); } }
  else if (kind === "shroom") { for (let i = 0; i < 4; i++) { const dx = (r() - .5) * .2 * k, dz = (r() - .5) * .2 * k, h = (.1 + r() * .14) * k; f.block(x + dx, top, z + dz, .04, h, .04, 0xe8e0d0); f.block(x + dx, top + h, z + dz, .13 * k, .06 * k, .13 * k, pick([0x7fe8d0, 0xb99be0, 0xe86a8a], r), true); } }
  else { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; let px = x + Math.cos(a) * .14 * k, pz = z + Math.sin(a) * .14 * k; for (let s = 0; s < 5; s++) { f.block(px, top - s * .13 * k, pz, .08 * k, .12 * k, .08 * k, vary(0x3f7a44, .14, r)); if (s === 2 && r() < .5) f.block(px, top - s * .13 * k, pz + .05, .06, .06, .06, 0xd6407a); px += Math.cos(a) * .03; pz += Math.sin(a) * .03; } } }
}
// A stone or iron stove with a glowing mouth facing the room (dir: 1 faces +x, -1 faces -x, 0 faces the door).
function stove(f, x, z, H, dir = 0, kettle = true) {
  f.block(x, 0, z, .7, .28, .7, C.iron); f.block(x, .28, z, .9, .78, .9, C.iron); f.block(x, 1.06, z, .74, .1, .74, 0x1a1a22); f.block(x + (dir ? -dir * .18 : .2), 1.16, z - (dir ? 0 : .18), .16, H - 1.16, .16, C.iron);
  const mx = x + dir * .46, mz = z + (dir ? 0 : .46); f.block(mx, .42, mz, dir ? .02 : .4, .34, dir ? .4 : .02, 0xff7a2a, true); f.mark?.("fire", x + dir * .5, .44, z + (dir ? 0 : .5)); f.mark?.("lamp", x + dir * .9, .8, z + (dir ? 0 : .9));
  if (kettle) { f.block(x - .12, 1.16, z + .1, .3, .22, .3, 0x7a6a5a); f.block(x - .12, 1.38, z + .1, .12, .06, .12, 0x5a4a3a); f.block(x + .08, 1.26, z + .1, .12, .05, .05, 0x7a6a5a); f.mark?.("steam", x + .14, 1.34, z + .1); }
}

// ---- Mabel's haberdashery --------------------------------------------------------------------------------------
// Bolts of cloth to the ceiling either side of a moonlit window, her cutting counter with a treadle sewing
// machine, three dress forms in half-made coats, a wall of thread and a cabinet of a hundred little drawers,
// the great coat she stitches her journeys into, and a doll's tea table laid for two.
export const MABEL_HALL = Object.freeze({ w: 12, d: 10, host: [0, -6.3], spawn: [0, -1.4], light: .5, exposure: 1.08,
  blocks: Object.freeze([[-6, -10, 6, -7.5], [-6, -7.5, -3.9, -2], [4.9, -5.5, 6, -1.1], [4.1, -7.5, 5.1, -6.6], [2.1, -7.5, 3.9, -6.1], [-3.1, -3.3, -1.7, -1.9]]) });
export function mabelHaberdashery(f, r = seeded(431)) {
  const W = 12, D = 10, hw = W / 2, H = 4.8, plum = 0x473452, dark = 0x33243c, rose = 0x9d718c, cream = 0xf0e4d4;
  const cloths = [0x6d4c89, 0x884659, 0x87916b, 0xb3a082, 0x3f6a8a, 0xc8a03a, 0x7a2a52, 0x2f5a4a, 0xd88a9a, 0xe8dcc4, 0x5a3a6a, 0xa85a2a];
  hallShell(f, r, { w: W, d: D, h: H, boards: [0x5a3a44, 0x64424c, 0x4e323c], wall: rose, beam: plum });
  rug(f, 0, -4.4, 3.6, 4.4, 0x7a2a52, C.gold, 0xd88a9a);
  // The window: a pointed arch of moonlit panes behind lace, with the counter beneath it.
  backWindow(f, 0, 1.55, 2.2, 2.2, D, { cols: 3, rows: 3, arch: true, frame: plum });
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) f.block(s * (1.2 + k * .1), 1.3, -D + .26 + (k % 2) * .03, .1, 2.7 - k * .2, .04, k % 2 ? cream : 0xe4d6c2);
  f.block(0, 4.05, -D + .3, 3.2, .09, .09, C.brass);
  // Bolts of cloth on deep shelves to the ceiling, either side of the window.
  for (const s of [-1, 1]) {
    for (const x of [1.55, 3.55, 5.65]) f.block(s * x, 0, -D + .45, .09, H - .3, .62, dark);
    for (const y of [.06, .9, 1.74, 2.58, 3.42]) { f.block(s * 3.6, y, -D + .45, 4.1, .07, .62, dark); for (let x = 1.78; x < 5.5; x += .34) { if (r() < .08) continue; const c = pick(cloths, r), t = .26 + r() * .06; f.block(s * x, y + .07, -D + .46, t, t, .56, c); f.block(s * x, y + .07 + t * .25, -D + .76, t * .5, t * .5, .03, vary(c, .25, r)); if (r() < .3) f.block(s * x, y + .07, -D + .78, t, t * .4, .02, vary(c, .15, r)); } }
  }
  // The cutting counter: a length of plum cloth half unrolled, shears, a tape, a pincushion, chalk and a teapot.
  { const z = -8.15; f.block(0, 0, z, 5, .86, 1.05, dark); f.block(0, .86, z, 5.2, .09, 1.15, 0x7a5a48); for (let i = 0; i < 6; i++) { f.block(-2.1 + i * .84, .14, z + .53, .7, .58, .02, plum); f.block(-2.1 + i * .84, .4, z + .55, .08, .06, .03, C.brass); }
    f.block(-.6, .95, z, 1.9, .03, .8, 0x6d4c89); f.block(-1.7, .95, z, .32, .3, .8, 0x6d4c89); f.block(-1.7, 1.04, z + .41, .16, .16, .02, 0x8a66a8);
    f.block(.1, .98, z + .2, .5, .02, .05, 0xb8bcc8); f.block(.3, .98, z + .28, .16, .02, .12, 0x2a2a34); f.block(.2, .98, z + .14, .4, .02, .04, 0xb8bcc8);
    f.block(-.3, .98, z - .2, .9, .015, .04, 0xf2e2a0); for (let k = 0; k < 9; k++) f.block(-.7 + k * .1, .995, z - .2, .01, .01, .04, 0x3a2a2a);
    f.block(.9, .95, z - .15, .2, .13, .2, 0xc8302a); for (let k = 0; k < 6; k++) f.block(.84 + (k % 3) * .06, 1.08, z - .2 + (k > 2 ? .1 : 0), .015, .09, .015, k % 2 ? 0xe8e8f0 : 0xf5d04a);
    f.block(-2.25, .95, z + .2, .26, .2, .22, 0xe4d6c2); f.block(-2.25, 1.15, z + .2, .12, .05, .12, 0xe4d6c2); f.block(-2.05, 1.03, z + .2, .14, .04, .04, 0xe4d6c2); f.mark?.("steam", -1.98, 1.1, z + .2);
    for (const dx of [-.4, -.15]) { f.block(-2.25 + dx - .2, .95, z - .25, .12, .1, .12, 0xf0e4d4); f.block(-2.25 + dx - .2, .95, z - .25, .18, .02, .18, 0xd88a9a); }
    // The treadle sewing machine at the counter's end: black and gold on its own iron stand.
    const sx = 1.95; f.block(sx, .95, z, .9, .05, .42, 0x4a3020); f.block(sx - .28, 1, z, .22, .42, .22, 0x15121a); f.block(sx, 1.34, z, .82, .14, .2, 0x15121a); f.block(sx + .34, 1, z, .14, .34, .16, 0x15121a); f.block(sx + .34, .98, z, .03, .08, .03, 0xd8dce8);
    f.block(sx - .28, 1.2, z + .12, .16, .16, .03, C.gold); f.block(sx + .05, 1.39, z + .11, .4, .03, .02, C.gold); f.block(sx - .28, 1.5, z, .05, .12, .05, C.brass); f.block(sx - .28, 1.62, z, .1, .12, .1, 0xc8302a);
    candle(f, 1.2, .95, z + .32, .24, true); }
  // Three dress forms along the left wall: a coat with gold buttons, a cream gown in lace, a red travelling cape.
  const form = (x, z, body, trim, kind) => {
    for (const [a, b] of [[-.2, -.14], [.2, -.14], [0, .22]]) f.block(x + a, 0, z + b, .05, .1, .05, C.iron); f.block(x, .06, z, .06, 1.02, .06, C.iron);
    f.block(x, 1.08, z, .5, .32, .36, body); f.block(x, 1.4, z, .42, .26, .32, body); f.block(x, 1.66, z, .52, .3, .36, body); f.block(x, 1.96, z, .2, .1, .2, 0xe4d6c2); f.block(x, 2.06, z, .09, .1, .09, C.brass);
    if (kind === "coat") { f.block(x, .5, z, .62, .6, .44, body); for (let k = 0; k < 4; k++) f.block(x + .27, .7 + k * .28, z + .02, .03, .06, .06, C.gold); f.block(x + .27, 1.72, z, .03, .2, .3, trim); for (const s of [-1, 1]) f.block(x, 1.3, z + s * .26, .2, .58, .14, body); }
    else if (kind === "gown") { for (let k = 0; k < 5; k++) f.block(x, .1 + k * .2, z, .9 - k * .09, .2, .8 - k * .09, k % 2 ? body : trim); f.block(x + .26, 1.74, z, .03, .08, .3, trim); for (const s of [-1, 1]) f.block(x, 1.62, z + s * .24, .16, .2, .1, trim); }
    else { f.block(x - .08, .6, z, .66, 1.3, .62, body); f.block(x + .26, 1.84, z, .05, .1, .44, trim); f.block(x + .28, 1.86, z, .04, .08, .1, C.gold); for (let k = 0; k < 3; k++) f.block(x - .08, .6, z - .26 + k * .26, .68, .05, .08, trim); }
  };
  form(-4.7, -2.7, 0x5a3a6a, 0xc8a03a, "coat"); form(-4.7, -4.5, cream, 0xd88a9a, "gown"); form(-4.7, -6.3, 0x8e1e30, 0x2a1820, "cape");
  // A cheval glass in a gilt frame beside them, tilted to catch the room.
  { const x = -5.3, z = -7.15; for (const s of [-1, 1]) { f.block(x, 0, z + s * .42, .1, 1.9, .08, C.gold); f.block(x + .1, 0, z + s * .42, .4, .06, .08, C.gold); } f.block(x, .34, z, .05, 1.5, .76, 0x9aa6c8); f.block(x, 1.84, z, .08, .12, .9, C.gold); f.block(x, .26, z, .08, .08, .9, C.gold); f.block(x + .03, 1.2, z + .15, .02, .4, .04, 0xc8d2ec); }
  // The wall of thread: spools on pegs in every colour, and the haberdasher's cabinet of little brass-knobbed drawers.
  { const x = hw - .16; f.block(x, 1.3, -3.3, .05, 2.3, 4.1, 0x6a4a52); for (let z = -5.2; z <= -1.4; z += .27) for (let y = 1.45; y < 3.5; y += .3) { if (r() < .07) continue; const c = pick(cloths, r); f.block(x - .09, y, z, .14, .18, .13, c, r() < .12); f.block(x - .09, y - .02, z, .16, .02, .16, 0xd8c8a8); } f.mark?.("sparkle", x - .2, 2.5, -3.3); f.mark?.("sparkle", x - .2, 2.2, -4.6);
    const cx = hw - .62; f.block(cx, 0, -3.3, .9, 1.08, 4.2, dark); f.block(cx, 1.08, -3.3, 1, .07, 4.3, 0x7a5a48);
    for (let z = -5.2; z <= -1.4; z += .42) for (let y = .12; y < 1; y += .3) { f.block(cx - .46, y, z, .02, .24, .36, 0x5a4250); f.block(cx - .48, y + .1, z, .03, .05, .07, C.brass); }
    for (let k = 0; k < 5; k++) { const z = -4.9 + k * .8; f.block(cx - .05, 1.15, z, .2, .26, .2, 0xb8c8d8); for (let j = 0; j < 5; j++) f.block(cx - .05 + (r() - .5) * .1, 1.17 + j * .045, z + (r() - .5) * .1, .05, .03, .05, pick(cloths, r)); f.block(cx - .05, 1.41, z, .16, .04, .16, C.brass); }
    for (const [z, c] of [[-4.5, 0xd88a9a], [-3.7, 0xc8a03a], [-2.1, 0x6d4c89]]) { f.block(cx + .1, 1.15, z, .22, .2, .22, c); f.block(cx + .1, 1.2, z, .08, .1, .26, cream); } }
  // Two hat stands with hats in the corner beyond it.
  for (const [z, c, band] of [[-7.25, 0x33243c, 0xc8a03a], [-6.85, 0x8e1e30, 0xf0e4d4]]) { const x = z < -7 ? 4.75 : 4.4; f.block(x, 0, z, .3, .05, .3, dark); f.block(x, .05, z, .06, 1.3 + (z < -7 ? .3 : 0), .06, dark); const y = 1.35 + (z < -7 ? .3 : 0); f.block(x, y, z, .6, .05, .6, c); f.block(x, y + .05, z, .34, .28, .34, c); f.block(x, y + .05, z, .36, .08, .36, band); }
  // The great coat on its dais: every place she was too nervous to visit, stitched on in bright patches.
  { const x = 3, z = -6.8; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; f.block(x + Math.cos(a) * .72, 0, z + Math.sin(a) * .72, .34, .2, .34, vary(0x5a3a44, .08, r)); } f.block(x, 0, z, 1.2, .2, 1.2, 0x64424c); f.block(x, .2, z, 1.3, .02, 1.3, 0x7a2a52);
    f.block(x, .2, z, .07, 1.5, .07, C.brass); f.block(x, 1.66, z, .9, .07, .07, C.brass);
    f.block(x, .36, z, .96, 1.3, .5, 0x4a2f5a); f.block(x, 1.5, z, 1.1, .22, .44, 0x4a2f5a); for (const s of [-1, 1]) f.block(x + s * .62, .7, z, .22, .96, .3, 0x4a2f5a); f.block(x, 1.72, z, .5, .2, .4, 0x3a2448);
    for (let k = 0; k < 16; k++) { const px = x - .4 + (k % 4) * .27 + (r() - .5) * .06, py = .46 + Math.floor(k / 4) * .28 + (r() - .5) * .05; f.block(px, py, z + .26, .15, .15, .02, pick([0xf2c060, 0xd6407a, 0x7fe8d0, 0xf6f0f5, 0xe86a3a, 0x9a6ae0, 0x8fd06a], r), k % 3 === 0); }
    for (let k = 0; k < 5; k++) f.block(x, .5 + k * .24, z + .27, .03, .05, .02, C.gold); f.mark?.("sparkle", x, 1, z + .3); }
  // A doll's tea table laid for two.
  { const x = -2.4, z = -2.6, y = roundTable(f, x, z, .5, .44, 0xe8dcc4, 0xd88a9a); chair(f, x - .62, z, "w", 0xe8dcc4, 0xd88a9a); chair(f, x + .62, z, "e", 0xe8dcc4, 0xd88a9a);
    f.block(x, y, z, .14, .12, .12, 0xf0e4d4); f.block(x + .09, y + .05, z, .06, .03, .03, 0xf0e4d4); for (const s of [-1, 1]) { f.block(x + s * .26, y, z + s * .1, .09, .06, .09, 0xf0e4d4); f.block(x + s * .26, y, z + s * .1, .13, .012, .13, 0xc8a03a); } f.block(x, y, z - .24, .16, .03, .12, 0xc8a03a); for (const dx of [-.04, .04]) f.block(x + dx, y + .03, z - .24, .05, .04, .05, 0xf2c8d0); }
  // Baskets of wool by the counter, ribbons from the beams, bunting across the room and two lanterns over it.
  for (const [x, z] of [[-3.1, -7.2], [-2.5, -6.9]]) { f.block(x, 0, z, .46, .3, .46, 0xa8885e); for (let k = 0; k < 5; k++) f.block(x + (r() - .5) * .24, .28 + (k % 2) * .1, z + (r() - .5) * .24, .18, .16, .18, pick(cloths, r)); }
  for (let i = 0; i < 12; i++) { const x = -5 + i * .9 + (r() - .5) * .2, len = .5 + r() * .9; f.block(x, H - len, -5.72, .05, len, .02, pick(cloths, r)); }
  for (let i = 0; i < 19; i++) { const t = i / 18, x = -5.4 + t * 10.8, y = 4.25 - Math.sin(t * Math.PI) * .42; f.block(x, y, -3.5, .6, .02, .02, 0x5a4a3a); f.block(x, y - .26, -3.5, .26, .26, .02, pick([0xd88a9a, 0xc8a03a, 0x6d4c89, 0xf0e4d4, 0x87916b], r)); f.block(x, y - .36, -3.5, .12, .1, .02, pick([0xd88a9a, 0xc8a03a, 0x6d4c89], r)); }
  hangLantern(f, -2.6, -5, H, 1); hangLantern(f, 2.6, -4.6, H, 1.2);
  // A cuckoo clock by the door and a pattern pinned up beside it.
  { const x = -hw + .18, z = -1.25; f.block(x, 2.5, z, .16, .6, .5, 0x5a3a24); f.block(x + .02, 3.1, z, .22, .14, .66, 0x3a2418); f.block(x + .03, 3.22, z, .18, .1, .4, 0x3a2418); f.block(x + .09, 2.72, z, .02, .26, .26, cream); f.block(x + .1, 2.84, z, .02, .03, .1, 0x2a1810); f.mark?.("pendulum", x + .12, 2.5, z); }
  f.mark?.("motes", 0, 2.7, -8.6);
}

// ---- Tansy's potting room ------------------------------------------------------------------------------------
// A greenhouse window across the back with the potting bench under it, tiers of plants up the left wall, baskets
// trailing from the beams, a rack of drying herbs, a seed cabinet, tinctures glowing on the shelves, a stove with
// a remedy simmering, and vines that have taken the rafters for their own.
export const TANSY_HALL = Object.freeze({ w: 12, d: 10, host: [0, -5.9], spawn: [0, -1.4], light: .5, exposure: 1.08,
  blocks: Object.freeze([[-6, -10, 6, -7.6], [-6, -7.6, -4.1, -1.5], [4.9, -7.6, 6, -5.5], [4, -5.3, 5.7, -3.9], [3.3, -3.2, 5.3, -1.5], [-3.6, -1.9, -2.6, -.9]]) });
export function tansyPottingRoom(f, r = seeded(433)) {
  const W = 12, D = 10, hw = W / 2, H = 4.8, moss = 0x3e513b, dark = 0x2f3d2c, sage = 0x7b8968, terracotta = 0xa05a3a, leaf = [0x3f7a44, 0x4a8a4a, 0x356a3c, 0x5a9a52];
  hallShell(f, r, { w: W, d: D, h: H, boards: [0x7a5a48, 0x846250, 0x6e5040], wall: sage, beam: moss });
  roundRug(f, 0, -4.5, 1.9, [0xb89a5a, 0x8a7a44, 0xc8aa6a, 0x7a8a4a], r);
  // The greenhouse window: a wall of small green-lit panes, pots along its sill.
  backWindow(f, 0, 1.25, 6.2, 2.9, D, { cols: 8, rows: 4, glass: [0x4a9a82, 0x5aae92, 0x428a76], frame: dark });
  for (let i = 0; i < 9; i++) potPlant(f, -2.8 + i * .7, 1.22, -D + .34, r, pick(["fern", "flower", "flower", "shroom"], r), .62);
  // The potting bench: terracotta in stacks, a heap of soil, seed trays, a copper can, twine and a trowel.
  { const z = -8.4; f.block(0, 0, z, 6.2, .84, 1.1, dark); f.block(0, .84, z, 6.4, .09, 1.2, 0x8a6a46); f.block(0, .34, z, 6, .06, 1, 0x6a5038); for (const x of [-3, -1, 1, 3]) f.block(x, 0, z + .5, .1, .84, .1, 0x3a2a1a);
    for (let k = 0; k < 4; k++) f.block(-2.6, .93 + k * .11, z - .1, .3 - k * .02, .12, .3 - k * .02, vary(terracotta, .08, r)); for (let k = 0; k < 3; k++) f.block(-2.2, .93 + k * .1, z + .1, .24, .11, .24, vary(terracotta, .1, r));
    for (let k = 0; k < 14; k++) f.block(-1.1 + (r() - .5) * .7, .93 + r() * .1, z + (r() - .5) * .5, .2, .1, .2, vary(0x3a2a20, .12, r));
    f.block(-1.5, .93, z + .34, .04, .03, .34, 0x8a8a96); f.block(-1.5, .93, z + .56, .08, .04, .12, 0x6a4a2e);
    for (const x of [.2, 1.1]) { f.block(x, .93, z, .8, .08, .56, 0x5a4030); for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { f.block(x - .32 + i * .16, 1.01, z - .18 + j * .18, .1, .03, .1, 0x3a2a20); if (r() < .8) f.block(x - .32 + i * .16, 1.04, z - .18 + j * .18, .04, .06 + r() * .1, .04, pick(leaf, r)); } }
    f.block(2.3, .93, z, .34, .36, .34, 0xb87a48); f.block(2.56, 1.1, z, .3, .05, .05, 0xb87a48); f.block(2.72, 1.1, z, .1, .1, .1, 0xb87a48); f.block(2.08, 1.02, z, .1, .2, .04, 0xb87a48);
    f.block(2.9, .93, z + .3, .2, .18, .2, 0xd8c48a); f.block(2.9, 1.11, z + .3, .06, .05, .06, 0x8a7a4a); lantern(f, -3, .93, z + .3, .7); f.mark?.("lamp", -3, 1.6, z + .5);
    for (const [x, c] of [[-2.4, 0x5a4030], [-.4, 0x4a3a2a], [1.4, 0x5a4030]]) { f.block(x, .4, z, .7, .34, .7, c); f.block(x, .74, z, .5, .08, .5, 0x3a2a20); } }
  // Tiers of plants up the left wall, a mushroom log on the floor before them.
  for (let step = 0; step < 3; step++) { const x = -hw + .5 + step * .5, y = 1.26 - step * .42; f.block(x, 0, -4.1, .5, y, 5, dark); f.block(x, y, -4.1, .54, .06, 5.1, 0x8a6a46); for (let z = -6.3; z <= -1.9; z += .62) potPlant(f, x, y + .06, z + (r() - .5) * .1, r, pick(["fern", "flower", "flower", "vine", "shroom"], r), .7 + r() * .3, pick([terracotta, 0x8a4a34, 0x6a7a8a, 0xb87a48], r)); }
  { const x = -4, z = -7.15; f.block(x, 0, z, .5, .36, .9, 0x4a3524); for (let k = 0; k < 7; k++) { const h = .1 + r() * .16; f.block(x + (r() - .5) * .3, .36, z - .36 + k * .12, .04, h, .04, 0xe8e0d0); f.block(x + (r() - .5) * .3, .36 + h, z - .36 + k * .12, .14, .06, .14, pick([0x7fe8d0, 0xb99be0], r), true); } }
  // Baskets hung from the beams, trailing.
  for (const [x, z] of [[-3.4, -3.1], [-3.4, -5.7], [3.2, -6.4]]) { f.block(x, 3.5, z, .02, H - 3.5, .02, 0x5a4a3a); f.block(x, 3.2, z, .5, .3, .5, 0xa8885e); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; let px = x + Math.cos(a) * .26, pz = z + Math.sin(a) * .26; const n = 3 + Math.floor(r() * 5); for (let s = 0; s < n; s++) { f.block(px, 3.3 - s * .16, pz, .09, .15, .09, vary(pick(leaf, r), .1, r)); if (s === n - 1 && r() < .5) f.block(px, 3.3 - s * .16 - .08, pz, .1, .08, .1, pick([0xd6407a, 0xf5d04a, 0x9a6ae0], r)); } } for (let i = 0; i < 5; i++) f.block(x + (r() - .5) * .3, 3.5, z + (r() - .5) * .3, .12, .14 + r() * .2, .12, pick(leaf, r)); }
  // A ladder of drying herbs slung under the beams.
  { const y = 3.92, z = -4.6; for (const s of [-1, 1]) f.block(0, y, z + s * .32, 4.6, .06, .06, 0x6a5038); for (let x = -2.2; x <= 2.2; x += .44) { f.block(x, y, z, .05, .05, .7, 0x6a5038); const len = .3 + r() * .4; f.block(x, y - len, z + (r() - .5) * .4, .02, len, .02, 0x8a7a4a); f.block(x, y - len - .34, z + (r() - .5) * .1, .18, .34, .14, pick([0x5a7a3a, 0x8a6a9a, 0xb89a4a, 0x7a3a4a, 0x6a8a5a], r)); } for (const s of [-1, 1]) f.block(s * 2.3, y, z, .02, H - y, .02, 0x5a4a3a); }
  // The seed cabinet, the shelves of tinctures over it, sacks of soil, and a barrow of the day's cuttings.
  { const x = hw - .6, z = -6.55; f.block(x, 0, z, .9, 1.3, 2, dark); f.block(x, 1.3, z, 1, .07, 2.1, 0x8a6a46); for (let k = 0; k < 5; k++) for (let j = 0; j < 4; j++) { f.block(x - .46, .12 + j * .3, z - .8 + k * .4, .02, .24, .34, 0x4a5a40); f.block(x - .48, .22 + j * .3, z - .8 + k * .4, .03, .05, .1, C.brass); }
    for (const y of [1.9, 2.6, 3.3]) { f.block(hw - .32, y, z, .4, .06, 2.1, dark); for (let zz = z - .9; zz < z + .95; zz += .22) { if (r() < .14) continue; const h = .16 + r() * .2, c = pick([0x7fe8d0, 0xb99be0, 0xf2c060, 0x8fd06a, 0xe86a8a, 0x6a8ad8], r); f.block(hw - .34, y + .06, zz, .13, h, .13, c, r() < .55); f.block(hw - .34, y + .06 + h, zz, .08, .04, .08, 0x8a6a46); } } f.mark?.("sparkle", hw - .5, 2.7, z); f.mark?.("sparkle", hw - .5, 2, z);
    for (const [sx, sz, lean] of [[4.6, -4.9, 0], [5.1, -4.4, .1], [4.5, -4.2, 0]]) { f.block(sx, 0, sz, .7, .42 + lean, .5, vary(0xb8a078, .08, r)); f.block(sx, .42 + lean, sz, .5, .14, .36, vary(0xa89068, .08, r)); f.block(sx, .56 + lean, sz, .12, .08, .12, 0x8a7a4a); }
    const bx = 4.3, bz = -2.35; f.block(bx, .3, bz, 1.3, .1, .8, 0x6a5038); for (const s of [-1, 1]) { f.block(bx, .4, bz + s * .38, 1.3, .32, .06, 0x7a5a40); } f.block(bx - .64, .4, bz, .06, .32, .8, 0x7a5a40); f.block(bx + .64, .4, bz, .06, .32, .8, 0x7a5a40);
    f.block(bx - .8, 0, bz, .1, .46, .46, 0x2a2a30); f.block(bx - .8, .2, bz, .14, .08, .08, C.iron); for (const s of [-1, 1]) { f.block(bx + 1, .46, bz + s * .3, .8, .06, .06, 0x6a5038); f.block(bx + .5, 0, bz + s * .3, .06, .34, .06, 0x6a5038); }
    pumpkin(f, bx - .2, bz - .1, .44, r, "orange", .4); pumpkin(f, bx + .3, bz + .1, .34, r, "green", .4); for (let k = 0; k < 5; k++) f.block(bx + (r() - .5) * .9, .72, bz + (r() - .5) * .5, .14, .2, .14, pick(leaf, r)); }
  // Tools on pegs by the door.
  { const x = hw - .18; f.block(x, 2.5, -2.4, .05, .1, 2.2, dark); for (const [z, kind] of [[-3.2, 0], [-2.7, 1], [-2.2, 2], [-1.7, 3]]) { f.block(x - .05, .9, z, .04, 1.6, .04, 0x8a6a46); if (kind === 0) for (let k = -2; k <= 2; k++) f.block(x - .05, .76, z + k * .07, .04, .16, .02, 0x8a8a96); else if (kind === 1) f.block(x - .05, .72, z, .04, .2, .3, 0x8a8a96); else if (kind === 2) f.block(x - .05, .66, z, .04, .28, .22, 0x8a8a96); else { f.block(x - .05, .8, z - .06, .04, .14, .04, 0x8a8a96); f.block(x - .05, .8, z + .06, .04, .14, .04, 0x8a8a96); } } }
  // The stove in the back corner with a remedy on the simmer.
  stove(f, -hw + .85, -8.75, H, 1, false); { const x = -hw + .85, z = -8.75; f.block(x, 1.16, z, .44, .3, .44, 0x3a3a44); f.block(x, 1.46, z, .5, .04, .5, 0x4a4a54); f.block(x, 1.42, z, .36, .03, .36, 0x7fe8d0, true); f.mark?.("steam", x, 1.5, z); }
  // Vines over the back beam and down the posts, in flower; a toad on the rug; a bee skep and cut flowers by the door.
  for (let i = 0; i < 60; i++) { const x = -hw + .3 + r() * (W - .6), y = H - .5 - r() * .7 * Math.abs(Math.sin(x * 1.3)); f.block(x, y, -D + .34, .16, .12, .1, vary(pick(leaf, r), .1, r)); if (r() < .18) f.block(x, y - .02, -D + .4, .09, .09, .05, pick([0xd6407a, 0xf6f0f5, 0x9a6ae0], r)); }
  for (const sx of [-1, 1]) for (let i = 0; i < 44; i++) { const z = -.6 - r() * (D - 1), y = H - .3 - r() * 1.1 * Math.abs(Math.sin(z * 1.7)); f.block(sx * (hw - .22), y, z, .1, .12, .16, vary(pick(leaf, r), .1, r)); if (r() < .15) f.block(sx * (hw - .28), y, z, .05, .09, .09, pick([0xd6407a, 0xf5d04a], r)); }
  for (let z = -1.3; z > -D; z -= 2.2) for (let i = 0; i < 14; i++) { const x = (r() - .5) * (W - 1), d = .1 + r() * .5; f.block(x, H - d, z + (r() - .5) * .2, .1, d, .08, vary(pick(leaf, r), .1, r)); }
  { const x = 1.1, z = -3.3; f.block(x, .14, z, .2, .1, .26, 0x6a8a3a); f.block(x, .22, z + .08, .16, .08, .12, 0x6a8a3a); for (const s of [-1, 1]) { f.block(x + s * .06, .3, z + .1, .04, .04, .04, 0xf5d04a, true); f.block(x + s * .12, .14, z - .08, .08, .05, .12, 0x5a7a34); } }
  { const x = -3.1, z = -1.4; f.block(x, 0, z, .5, .4, .5, 0x6a5038); for (let k = 0; k < 5; k++) f.block(x, .4 + k * .11, z, .5 - k * .08, .11, .5 - k * .08, vary(0xd8b85a, .06, r)); f.block(x, .5, z + .26, .1, .08, .02, 0x2a1810); }
  { const x = 3.1, z = -1.1; f.block(x, 0, z, .44, .3, .34, 0xa8885e); for (let k = 0; k < 9; k++) { f.block(x + (r() - .5) * .3, .3, z + (r() - .5) * .2, .03, .26, .03, 0x4a7a3a); f.block(x + (r() - .5) * .3, .5 + r() * .12, z + (r() - .5) * .2, .11, .09, .11, pick([0xd6407a, 0xf5d04a, 0x9a6ae0, 0xf6f0f5], r)); } }
  hangLantern(f, 2.2, -2.6, H, 1); hangLantern(f, -1.4, -6.9, H, .9);
  f.mark?.("motes", 0, 2.6, -8.2); f.mark?.("motes", -3.6, 2.2, -4.2);
}

// ---- Opal's stone studio -------------------------------------------------------------------------------------
// A tall window of her own stained glass, a winged figure half out of its block under a hoist, headstones
// waiting for their names, a cutting table lit from beneath, glass in racks, a kiln, gems on a shelf, and a
// velvet chaise by a candelabrum for the hours when the stone will not be hurried.
export const OPAL_HALL = Object.freeze({ w: 12, d: 10, host: [.6, -5.6], spawn: [0, -1.4], light: .56, exposure: 1.1,
  blocks: Object.freeze([[-6, -10, 6, -8.9], [-6, -8.9, -3.8, -7.5], [2.4, -8.9, 6, -7.5], [-3.9, -7.3, -1.9, -5.2], [-6, -5.5, -4.3, -1.5], [4.6, -5.9, 6, -1.7]]) });
export function opalStudio(f, r = seeded(435)) {
  const W = 12, D = 10, hw = W / 2, H = 5.2, slate = 0x434451, stone = [0x8a8898, 0x94929f, 0x807e8e, 0x9c9aa8], pale = 0xd8d4e0, velvet = 0x5a2f6a;
  hallShell(f, r, { w: W, d: D, h: H, boards: [0x5c5a68, 0x666472, 0x52505e], wall: 0x8a8898, beam: slate });
  // Stone dust and chips where she has been working.
  for (let i = 0; i < 46; i++) { const a = r() * TAU, d = .9 + r() * 1.6; f.block(-2.9 + Math.cos(a) * d, .12, -6.2 + Math.sin(a) * d * .8, .08 + r() * .14, .03 + r() * .05, .08 + r() * .12, vary(pick(stone, r), .08, r)); }
  // The window: a lancet of her own glass, a pale moth rising through amethyst, teal and amber.
  { const x = 0, z = -D + .15, glassy = [0x8a5ad0, 0x4aa6b0, 0xe0a040, 0xc85a8a, 0x5a7ad8]; for (let j = 0; j < 17; j++) { const t = j / 16, half = t < .68 ? .9 : .9 * Math.cos((t - .68) / .32 * Math.PI / 2); if (half < .06) break; const n = Math.max(1, Math.round(half * 2 / .3)); for (let i = 0; i < n; i++) { const px = x - half + (i + .5) * (half * 2 / n), moth = Math.abs(px) < .5 && j > 5 && j < 12 && Math.abs(px) < (j < 9 ? (j - 5) * .16 : (12 - j) * .16) + .08; f.block(px, 1.2 + j * .2, z, half * 2 / n - .03, .18, .04, moth ? 0xf4ecd8 : glassy[(i * 2 + j) % glassy.length], true); } f.block(x - half - .09, 1.2 + j * .2, z + .03, .16, .2, .12, pale); f.block(x + half + .09, 1.2 + j * .2, z + .03, .16, .2, .12, pale); }
    f.block(x, 1.02, z + .1, 2.3, .16, .3, pale); f.block(x, 1.2, z + .02, .05, 3.3, .05, slate); for (const y of [1.9, 2.7, 3.4]) f.block(x, y, z + .02, 1.8, .04, .05, slate); f.mark?.("motes", 0, 2.8, -8.7); f.mark?.("lamp", 0, 2.6, -8.9); }
  // Headstones leaning in a rack to its left, a stack of squared blocks to its right.
  for (const [x, kind, h] of [[-3.3, 0, 1.5], [-2.6, 1, 1.3], [-1.95, 2, 1.6]]) { const z = -9.45; f.block(x, 0, z, .56, h * .7, .16, vary(pick(stone, r), .05, r)); if (kind === 0) { f.block(x, h * .7, z, .46, .14, .16, stone[1]); f.block(x, h * .7 + .14, z, .3, .12, .16, stone[1]); } else if (kind === 1) { f.block(x, h * .7, z, .56, .1, .16, stone[2]); f.block(x, h * .7 + .1, z, .14, .44, .16, stone[2]); f.block(x, h * .7 + .22, z, .42, .12, .16, stone[2]); } else { for (let k = 0; k < 4; k++) f.block(x, h * .7 + k * .09, z, .56 - k * .13, .09, .16, stone[3]); } for (let k = 0; k < 3; k++) f.block(x, .5 + k * .16, z + .09, .32 - k * .05, .03, .01, 0x52505e); }
  f.block(-2.6, 0, -9.2, 2.3, .14, .5, 0x5a4a40); for (const x of [-3.7, -1.5]) f.block(x, 0, -9.2, .08, 1.1, .5, 0x5a4a40);
  for (const [x, y, w] of [[1.75, 0, .7], [2.05, 0, .5], [1.8, .5, .6], [1.9, .96, .44]]) f.block(x, y, -9.4, w, y ? .44 : .5, .56, vary(pick(stone, r), .06, r));
  // The figure: a robed moth-winged woman, carved to the waist, the rest still the block; trestles, a plank and a hoist.
  { const x = -2.9, z = -6.25; f.block(x, 0, z, 1.4, .34, 1.4, stone[2]); f.block(x, .34, z, 1.1, .1, 1.1, stone[3]); f.block(x, .44, z, .9, 1.05, .8, vary(stone[1], .04, r));
    for (let k = 0; k < 9; k++) f.block(x + (r() - .5) * .8, .5 + r() * .9, z + .41, .12 + r() * .16, .03, .01, 0x6e6c7c);
    f.block(x, 1.49, z, .62, .5, .44, pale); f.block(x, 1.99, z, .7, .34, .46, pale); f.block(x, 2.33, z, .2, .12, .2, pale); f.block(x, 2.45, z, .34, .36, .34, pale); f.block(x, 2.74, z - .04, .4, .14, .36, 0xc8c4d2);
    for (const s of [-1, 1]) { f.block(x + s * .42, 1.9, z + .06, .16, .46, .18, pale); f.block(x + s * .3, 1.6, z + .22, .2, .16, .16, pale); for (let k = 0; k < 4; k++) f.block(x + s * (.5 + k * .17), 1.7 + k * .2, z - .2, .2, .5 - k * .06, .06, k % 2 ? pale : 0xc8c4d2); f.block(x + s * .66, 1.5, z - .2, .3, .26, .06, 0xc8c4d2); }
    f.block(x, 2.5, z + .18, .04, .04, .02, slate);
    for (const s of [-1, 1]) { for (const dz of [-.3, .3]) f.block(x + s * 1.05, 0, z + .95 + dz, .07, .9, .07, 0x6a5038); f.block(x + s * 1.05, .9, z + .95, .1, .07, .76, 0x6a5038); } f.block(x, .97, z + .95, 2.5, .07, .4, 0x8a6a46);
    f.block(x - .6, 1.04, z + .95, .3, .12, .16, 0x6a4a2e); f.block(x - .6, 1.08, z + .95, .06, .06, .44, 0x6a4a2e); for (let k = 0; k < 4; k++) f.block(x + .1 + k * .16, 1.04, z + .95, .04, .03, .3, 0x9aa0b0);
    f.block(x, H - .1, z, .5, .1, .24, C.iron); for (let k = 0; k < 9; k++) f.block(x + (k % 2) * .03, H - .1 - (k + 1) * .2, z, .05, .19, .05, C.iron); f.block(x, H - 2.14, z, .2, .16, .12, C.iron); f.block(x, H - 2.3, z, .05, .14, .05, C.iron); f.block(x + .05, H - 2.36, z, .14, .05, .05, C.iron); }
  // The cutting table on the left wall: a lit glass bed, pieces laid out in a moth's wing, and sheets racked beyond it.
  { const x = -hw + .85, z = -2.9; f.block(x, 0, z, 1.2, .86, 2.4, slate); f.block(x, .86, z, 1.3, .06, 2.5, 0x2c2c38); f.block(x, .92, z, 1, .03, 2.1, 0xe8ecf4, true);
    for (let k = 0; k < 18; k++) { const u = k % 6, v = Math.floor(k / 6); f.block(x - .3 + v * .3 + (r() - .5) * .05, .95, z - .8 + u * .32 + (r() - .5) * .05, .2 + r() * .08, .02, .22 + r() * .08, pick([0x8a5ad0, 0x4aa6b0, 0xe0a040, 0xc85a8a, 0x5a7ad8, 0x6ac08a], r), true); }
    f.block(x + .4, .95, z + .95, .04, .03, .36, 0x9aa0b0); f.block(x + .4, .95, z + 1.14, .1, .05, .1, 0x6a4a2e); f.mark?.("sparkle", x, 1.1, z); f.mark?.("lamp", x + .3, 1.5, z);
    const rz = -4.85; f.block(x, 0, rz, 1.1, .12, 1, 0x5a4a40); for (const dz of [-.46, .46]) f.block(x, 0, rz + dz, 1.1, 1.5, .07, 0x5a4a40); for (let k = 0; k < 7; k++) f.block(x - .4 + k * .13, .12, rz, .04, 1.1 + r() * .3, .8, pick([0x8a5ad0, 0x4aa6b0, 0xe0a040, 0xc85a8a, 0x5a7ad8, 0x6ac08a], r), k % 2 === 0); }
  // The workbench on the right wall: chisels in a rack, a mallet, a drawing under a lantern and a small bust.
  { const x = hw - .78, z = -3.8; f.block(x, 0, z, 1.1, .9, 3.8, 0x4a3a34); f.block(x, .9, z, 1.2, .1, 4, 0x6a5038); for (const dz of [-1.7, 0, 1.7]) f.block(x - .5, 0, z + dz, .1, .9, .1, 0x2a1e1a);
    f.block(hw - .2, 1.6, z, .06, .5, 3.2, 0x6a5038); for (let k = 0; k < 12; k++) { const zz = z - 1.4 + k * .25; f.block(hw - .26, 1.3, zz, .04, .5 + (k % 3) * .08, .04, 0x9aa0b0); f.block(hw - .26, 1.8 + (k % 3) * .08, zz, .06, .16, .06, 0x6a4a2e); }
    f.block(x, 1, z - 1.2, .7, .015, .9, 0xe8e0cc); for (let k = 0; k < 5; k++) f.block(x - .2 + k * .1, 1.015, z - 1.2, .01, .01, .6, 0x4a4a5a); f.block(x, 1.015, z - 1.2, .4, .01, .01, 0x4a4a5a);
    f.block(x + .1, 1, z + .2, .34, .16, .22, 0x6a4a2e); f.block(x + .1, 1.06, z + .2, .08, .08, .5, 0x6a4a2e); f.block(x - .1, 1, z + 1.2, .3, .1, .3, stone[2]); f.block(x - .1, 1.1, z + 1.2, .22, .26, .2, pale); f.block(x - .1, 1.36, z + 1.2, .18, .2, .18, pale);
    lantern(f, x + .2, 1, z - .2, .7); f.mark?.("lamp", x - .2, 1.7, z - .2); for (let k = 0; k < 3; k++) f.block(x - .2 + k * .15, 1, z + .8, .14, .1 + k * .04, .14, vary(pick(stone, r), .06, r)); }
  // The kiln in the back corner, its mouth alight.
  { const x = -hw + 1, z = -8.2; for (let k = 0; k < 6; k++) f.block(x, k * .3, z, 1.5 - k * .12, .3, 1.3 - k * .1, vary(0x8a4a3a, .08, r)); f.block(x + .1, 1.8, z - .2, .3, H - 1.8, .3, 0x6a3a30); f.block(x + .76, .3, z, .04, .6, .5, 0x1a0e0c); f.block(x + .78, .34, z, .02, .2, .4, 0xff7a2a, true); f.mark?.("fire", x + .8, .36, z); f.mark?.("lamp", x + 1.3, .9, z); for (let k = 0; k < 4; k++) f.block(x + 1.2, k * .12, z + .5 - k * .04, .5, .12, .16, 0x6a4a2e); }
  // Gems from the caves on a lit shelf, and the chaise with its candelabrum.
  wallShelf(f, 4.2, 2.3, -D + .14, 2.6, .34, slate); wallShelf(f, 4.2, 3.1, -D + .14, 2.6, .34, slate);
  for (const y of [2.36, 3.16]) for (let x = 3.1; x < 5.4; x += .3) { const c = pick([0xb882e7, 0xe76a55, 0x94d9d7, 0xf2c060], r), h = .14 + r() * .22; f.block(x, y, -D + .3, .12, h, .12, c, true); f.block(x + .07, y, -D + .34, .07, h * .6, .07, c, true); f.block(x, y, -D + .3, .2, .03, .2, stone[0]); } f.mark?.("sparkle", 4.2, 2.6, -D + .4); f.mark?.("sparkle", 4.2, 3.3, -D + .4);
  { const x = 4.1, z = -8.25; for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.block(x + sx * 1.3, 0, z + sz * .3, .09, .26, .09, C.gold); f.block(x, .26, z, 2.9, .16, .8, 0x3a2448); f.block(x, .42, z, 2.8, .14, .72, velvet); f.block(x, .42, z - .34, 2.8, .7, .12, velvet); f.block(x + 1.3, .56, z, .3, .5, .7, velvet); f.block(x + 1.3, 1.06, z, .34, .14, .7, 0x6a3a7a); f.block(x - .6, .56, z + .05, .5, .12, .4, 0xc8a03a);
    const cx = 2.5, cz = -7.85; f.block(cx, 0, cz, .34, .05, .34, C.brass); f.block(cx, .05, cz, .06, 1.3, .06, C.brass); f.block(cx, 1.3, cz, .7, .05, .05, C.brass); for (const dx of [-.33, 0, .33]) { f.block(cx + dx, 1.3, cz, .12, .05, .12, C.brass); candle(f, cx + dx, 1.35 + (dx ? 0 : .12), cz, .24, !dx); } }
  hangLantern(f, 1.6, -3.4, H, 1.4);
}

// ---- Cinder's restaurant -------------------------------------------------------------------------------------
// A chequered floor, four cloth-covered tables with a candle on each, a cushioned banquette, and behind the
// pass an open kitchen: a brick oven, a black range under a copper hood with pots on the boil, pans on a rail,
// the menu in chalk, and a pie cooling where everybody can smell it.
export const CINDER_HALL = Object.freeze({ w: 14, d: 11, host: [0, -7], spawn: [0, -1.4], light: .52, exposure: 1.08,
  blocks: Object.freeze([[-7, -11, 7, -7.75], [-4.7, -6.3, -2.5, -4.1], [2.5, -6.3, 4.7, -4.1], [-4.7, -3.7, -2.5, -1.5], [2.5, -3.7, 4.7, -1.5], [-7, -6.7, -6, -1.1], [5.95, -7.6, 7, -2.1], [2.5, -1.4, 3.5, -.6]]) });
export function cinderRestaurant(f, r = seeded(437)) {
  const W = 14, D = 11, hw = W / 2, H = 5, wine = 0x6d403d, dark = 0x3a2420, cream = 0xc7a88d, linen = 0xf2ece0, copper = 0xc87a48, brick = [0x9a4a3a, 0xa8553f, 0x8c4234];
  hallShell(f, r, { w: W, d: D, h: H, boards: [0x4a3028, 0x54372e, 0x402822], wall: cream, beam: wine });
  // The dining floor in cream and wine tiles, with a runner from the door to the pass.
  for (let i = 0; i < 20; i++) for (let j = 0; j < 11; j++) f.block(-hw + .5 + i * .68, .12, -.5 - j * .68, .66, .018, .66, vary((i + j) % 2 ? 0xe8dcc8 : 0x7a3a3a, .04, r));
  f.block(0, .14, -4.1, 1.5, .012, 7.2, 0x4a1f24); for (const s of [-1, 1]) f.block(s * .72, .15, -4.1, .06, .012, 7.2, C.gold);
  // The kitchen wall: white tiles to the rail, the chalked menu, shelves of spice jars.
  for (let x = -hw + .4; x < hw - .2; x += .44) for (let y = 1.1; y < 2.5; y += .44) f.block(x, y, -D + .15, .42, .42, .03, vary(0xe6e0d4, .04, r));
  { const x = 4.3, z = -D + .17; f.block(x, 2.75, z, 2.5, 1.5, .05, 0x1c2420); f.block(x, 2.7, z, 2.7, .07, .08, wine); f.block(x, 4.25, z, 2.7, .07, .08, wine); for (const s of [-1, 1]) f.block(x + s * 1.32, 2.75, z, .07, 1.5, .08, wine); f.block(x, 3.95, z + .03, 1.4, .1, .01, 0xf4f0e4); for (let k = 0; k < 5; k++) { f.block(x - .3, 3.65 - k * .2, z + .03, 1.3 - (k % 2) * .3, .05, .01, 0xe8e4d8); f.block(x + .95, 3.65 - k * .2, z + .03, .3, .05, .01, 0xf2c060); } }
  wallShelf(f, -4.4, 2.75, -D + .14, 2.6, .3, wine); jars(f, r, -5.5, -3.3, 2.81, -D + .3, [0xb8442a, 0xd8b03a, 0x5a7a3a, 0x8a5a2a, 0xe8dcc0, 0x7a2a4a], .05); wallShelf(f, -4.4, 3.5, -D + .14, 2.6, .3, wine); jars(f, r, -5.5, -3.3, 3.56, -D + .3, [0xb8442a, 0xd8b03a, 0x5a7a3a, 0x8a5a2a], .05);
  // The brick oven in the left corner, its arch full of fire, loaves on a peel beside it.
  { const x = -5.3, z = -9.85; for (let k = 0; k < 9; k++) for (let i = 0; i < 5; i++) f.block(x - .8 + i * .42 + (k % 2) * .1, k * .26, z, .4, .24, 1.6, vary(pick(brick, r), .06, r)); for (let k = 0; k < 4; k++) f.block(x, 2.34 + k * .2, z, 1.9 - k * .36, .2, 1.5 - k * .2, vary(pick(brick, r), .06, r)); f.block(x, 3.14, z - .2, .5, H - 3.14, .5, brick[2]);
    f.block(x, .8, z + .81, .96, .56, .04, 0x140a08); for (let k = 0; k < 7; k++) { const a = Math.PI * k / 6; f.block(x + Math.cos(a) * .52, 1.34 + Math.sin(a) * .3, z + .82, .2, .16, .06, brick[1]); } f.block(x, .74, z + .9, 1.3, .08, .26, 0x8a8494); f.mark?.("fire", x - .2, .82, z + .7); f.mark?.("fire", x + .22, .82, z + .7); f.mark?.("lamp", x, 1.3, z + 1.5);
    f.block(x + 1.4, 0, z + .5, .06, 2.2, .06, 0x8a6a46); f.block(x + 1.4, 2.2, z + .5, .5, .04, .44, 0x8a6a46); for (const dx of [-.12, .12]) f.block(x + 1.4 + dx, 2.24, z + .5, .2, .12, .3, 0xc89a5a); for (let k = 0; k < 5; k++) f.block(x + 1.2, k * .14, z - .2 + (k % 2) * .1, .5, .14, .2, 0x6a4a2e); }
  // The range: black iron with brass rails, three pots on the boil, a copper hood above and pans along its rail.
  { const x = -.9, z = -10.15; f.block(x, 0, z, 3.6, .96, 1.2, 0x1c1c24); f.block(x, .96, z, 3.7, .08, 1.3, 0x2a2a34); f.block(x, .5, z + .62, 3.4, .04, .04, C.brass); for (const dx of [-1.1, 0, 1.1]) { f.block(x + dx, .14, z + .61, .8, .6, .03, 0x26262e); f.block(x + dx, .56, z + .64, .3, .04, .04, C.brass); } f.block(x + 1.1, .2, z + .63, .5, .26, .02, 0xff7a2a, true); f.mark?.("fire", x + 1.1, .22, z + .56); f.mark?.("lamp", x + .2, 1.2, z + 1.3);
    for (const [dx, w, h, c, lid] of [[-1.2, .56, .44, copper, true], [-.2, .7, .56, 0x3a3a44, false], [.9, .5, .36, copper, true]]) { f.block(x + dx, 1.04, z, w, h, w, c); for (const s of [-1, 1]) f.block(x + dx + s * (w / 2 + .05), 1.04 + h * .6, z, .1, .05, .1, c); if (lid) { f.block(x + dx, 1.04 + h, z, w + .04, .04, w + .04, c); f.block(x + dx, 1.08 + h, z, .1, .06, .1, C.brass); } else f.block(x + dx, 1.04 + h - .04, z, w - .1, .03, w - .1, 0xd88a3a, true); f.mark?.("steam", x + dx, 1.1 + h, z); }
    f.block(x + .3, 1.04, z + .3, .06, .5, .06, 0x8a6a46); f.block(x + .3, 1.04, z + .3, .1, .08, .14, 0x8a6a46);
    for (let k = 0; k < 5; k++) f.block(x, 3 + k * .2, z - .1, 3.9 - k * .5, .2, 1.3 - k * .14, vary(copper, .05 + k * .01, r)); f.block(x, 4, z - .3, .6, H - 4, .5, copper); f.block(x, 2.96, z + .56, 3.9, .06, .06, C.brass);
    for (let k = 0; k < 7; k++) { const px = x - 1.6 + k * .54, d = .28 + (k % 3) * .08; f.block(px, 2.5, z + .56, .03, .46, .03, C.iron); f.block(px, 2.5 - d * .3, z + .56, d, d, .05, k % 2 ? copper : 0x3a3a44); } }
  // The prep counter on the right: a board of chopped pumpkin, carrots, stacked plates and a bowl of eggs.
  { const x = 3.9, z = -10.2; f.block(x, 0, z, 5.2, .92, 1.1, dark); f.block(x, .92, z, 5.4, .08, 1.2, 0xd8d0c0); for (let k = 0; k < 6; k++) f.block(x - 2.1 + k * .84, .14, z + .56, .74, .66, .02, wine);
    f.block(x - 1.6, 1, z, .9, .05, .6, 0x8a6a46); for (let k = 0; k < 7; k++) f.block(x - 1.9 + k * .1, 1.05, z + (r() - .5) * .3, .09, .09, .12, 0xe8771f); pumpkin(f, x - .7, z - .1, .42, r, "orange", 1); f.block(x - 1.3, 1.05, z - .2, .5, .02, .06, 0xb8bcc8);
    for (let k = 0; k < 4; k++) f.block(x + .1 + k * .14, 1, z + .2, .1, .08, .4, 0xe8862a); for (let k = 0; k < 8; k++) f.block(x + 1.1, 1 + k * .035, z, .5, .03, .5, linen); f.block(x + 2, 1, z, .46, .18, .46, 0x6a8ab0); for (let k = 0; k < 5; k++) f.block(x + 2 + (r() - .5) * .2, 1.14, z + (r() - .5) * .2, .13, .11, .13, 0xf0e4d0); }
  // The pass: plates up under two warming lamps, a brass bell, and a pie cooling.
  { const z = -8.15; f.block(0, 0, z, 8.8, 1.02, .7, dark); f.block(0, 1.02, z, 9, .08, .84, 0x7a4a3a); for (let k = 0; k < 10; k++) { f.block(-3.9 + k * .87, .16, z + .36, .76, .7, .02, wine); f.block(-3.9 + k * .87, .8, z + .37, .5, .03, .02, C.gold); } f.block(0, .2, z + .44, 8.6, .05, .05, C.brass);
    for (const [x, c] of [[-3, 0xd88a3a], [-2.1, 0xb8442a], [2.2, 0xe8c070], [3.1, 0x8a5a2a]]) { f.block(x, 1.1, z, .5, .03, .5, linen); f.block(x, 1.13, z, .32, .1, .32, c); f.block(x + .1, 1.23, z, .08, .05, .08, 0x5a7a3a); }
    f.block(-.5, 1.1, z, .22, .05, .22, C.brass); f.block(-.5, 1.15, z, .18, .12, .18, C.gold); f.block(-.5, 1.27, z, .04, .06, .04, C.gold);
    f.block(.9, 1.1, z, .62, .05, .62, 0x8a6a46); f.block(.9, 1.15, z, .54, .12, .54, 0xd8a85a); f.block(.9, 1.27, z, .5, .03, .5, 0xc8873a); for (const [a, b] of [[-.1, 0], [.1, .08], [0, -.12]]) f.block(.9 + a, 1.3, z + b, .12, .01, .03, 0x7a2a4a); f.mark?.("steam", .9, 1.32, z);
    for (const x of [-2.5, 2.6]) { f.block(x, 2.5, z, .04, H - 2.5, .04, C.iron); f.block(x, 2.3, z, .5, .2, .5, copper); f.block(x, 2.24, z, .3, .06, .3, 0xffd890, true); f.mark?.("lamp", x, 2, z + .3); } }
  // Four tables in linen with a candle each, their chairs, and places laid.
  const setTable = (x, z, seats) => { const y = roundTable(f, x, z, .82, .76, 0x5a3a2a, linen); f.block(x, y, z, .14, .03, .14, C.brass); candle(f, x, y + .03, z, .22); for (const [dx, dz, back] of seats) { chair(f, x + dx, z + dz, back, dark, 0x8e2f3a); f.block(x + dx * .52, y, z + dz * .52, .3, .02, .3, 0xfaf6ee); f.block(x + dx * .52, y + .02, z + dz * .52, .16, .02, .16, 0xe8dcc8); f.block(x + dx * .52 + (dz ? .22 : 0), y, z + dz * .52 + (dx ? .22 : 0), dz ? .03 : .14, .015, dx ? .03 : .14, 0xc8ccd8); } f.block(x + .2, y, z - .22, .09, .16, .09, 0x8a1a2a); };
  setTable(-3.6, -5.2, [[-1.02, 0, "w"], [1.02, 0, "e"], [0, -1.02, "n"]]); setTable(3.6, -5.2, [[-1.02, 0, "w"], [1.02, 0, "e"], [0, -1.02, "n"]]);
  setTable(-3.6, -2.6, [[-1.02, 0, "w"], [0, 1.02, "s"]]); setTable(3.6, -2.6, [[1.02, 0, "e"], [0, 1.02, "s"]]);
  // The banquette down the left wall, buttoned in wine velvet, and a dresser of crockery on the right.
  { const x = -hw + .52; f.block(x, 0, -3.9, .8, .44, 5.4, dark); f.block(x, .44, -3.9, .76, .14, 5.3, 0x8e2f3a); f.block(x - .28, .58, -3.9, .2, 1.1, 5.4, 0x8e2f3a); f.block(x - .28, 1.68, -3.9, .26, .1, 5.5, dark); for (let z = -6.3; z <= -1.5; z += .6) { f.block(x - .17, 1.1, z, .02, .06, .06, C.gold); f.block(x, .58, z + .3, .7, .01, .02, 0x6e2430); } for (const [z, c] of [[-5.6, 0xc8a03a], [-3.6, 0xe8dcc8], [-2, 0xc8a03a]]) f.block(x + .1, .58, z, .36, .3, .4, c); }
  { const x = hw - .5, z = -4.85; f.block(x, 0, z, .9, 1, 5.3, dark); f.block(x, 1, z, 1, .08, 5.4, 0x7a4a3a); f.block(hw - .2, 1.08, z, .3, 2.6, 5.3, dark); for (const y of [1.7, 2.4, 3.1]) { f.block(hw - .4, y, z, .5, .06, 5.2, 0x7a4a3a); for (let zz = z - 2.4; zz < z + 2.4; zz += .34) { if (r() < .12) continue; if (y === 2.4) { f.block(hw - .38, y + .06, zz, .2, .16, .2, pick([0xe8dcc8, 0x6a8ab0, 0xf2ece0], r)); f.block(hw - .28, y + .1, zz, .06, .08, .04, 0xe8dcc8); } else { f.block(hw - .32, y + .06, zz, .04, .3, .3, pick([0xe8dcc8, 0xd8e0f0, 0xf2ece0], r)); f.block(hw - .34, y + .14, zz, .02, .14, .14, pick([0x6a8ab0, 0x8e2f3a, 0xc8a03a], r)); } } }
    for (let k = 0; k < 9; k++) for (let j = 0; j < 3; j++) { f.block(x - .46, .14 + j * .28, z - 2.3 + k * .58, .02, .22, .5, wine); f.block(x - .48, .22 + j * .28, z - 2.3 + k * .58, .03, .04, .12, C.brass); }
    for (const [zz, c] of [[-6.6, 0x2a5a3a], [-6.2, 0x7a1424], [-3.4, 0x2a5a3a], [-3, 0xb07a2a]]) { f.block(x - .1, 1.08, zz, .14, .36, .14, c); f.block(x - .1, 1.44, zz, .07, .14, .07, c); } f.block(x - .1, 1.08, -4.9, .5, .1, .7, C.brass); for (const dz of [-.2, .2]) candle(f, x - .1, 1.18, -4.9 + dz, .26); }
  // The chandelier: an iron wheel of eight candles over the middle of the room.
  { const y = 3.7, z = -4.3; for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; f.block(Math.cos(a) * 1.25, y, z + Math.sin(a) * 1.25, .3, .08, .3, C.iron); } for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; candle(f, Math.cos(a) * 1.25, y + .08, z + Math.sin(a) * 1.25, .2); } for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .4; f.block(Math.cos(a) * .62, y, z + Math.sin(a) * .62, Math.abs(Math.cos(a)) * 1.2 + .06, .05, Math.abs(Math.sin(a)) * 1.2 + .06, C.iron); for (let k = 0; k < 5; k++) { const u = k / 5; f.block(Math.cos(a) * 1.25 * (1 - u), y + .1 + u * 1.1, z + Math.sin(a) * 1.25 * (1 - u), .04, .24, .04, C.iron); } } f.block(0, y + 1.2, z, .06, H - y - 1.2, .06, C.iron); f.mark?.("lamp", 0, y - .4, z); f.mark?.("lamp", 0, y - .4, z + 2.2); }
  // Garlic, onions and herbs over the pass; a chalked easel and bay trees by the door.
  for (let i = 0; i < 12; i++) hang(f, -3.6 + i * .66, -7.5, H, .3 + r() * .4, pick([0xe8e0cc, 0xc8873a, 0x5a7a3a, 0x8a2a3a, 0xd8b85a], r), .15);
  { const x = 3, z = -1; for (const s of [-1, 1]) { f.block(x + s * .3, 0, z + .1, .05, 1.2, .05, 0x8a6a46); f.block(x + s * .3, 0, z - .26, .05, 1, .05, 0x8a6a46); } f.block(x, .3, z + .14, .7, .86, .04, 0x1c2420); f.block(x, 1, z + .17, .44, .07, .01, 0xf4f0e4); for (let k = 0; k < 3; k++) f.block(x, .8 - k * .16, z + .17, .5 - k * .08, .04, .01, 0xe8e4d8); }
  for (const s of [-1, 1]) { const x = s * 2.2, z = -.75; f.block(x, 0, z, .46, .44, .46, 0x7a3a3a); f.block(x, .44, z, .08, .7, .08, 0x5a4030); for (let k = 0; k < 3; k++) f.block(x, 1.1 + k * .22, z, .56 - k * .14, .24, .56 - k * .14, vary(0x3f6a3a, .1, r)); }
  for (const [x, z] of [[-6.3, -.8], [-5.6, -.75]]) { f.block(x, 0, z, .6, .76, .6, 0x6a4a2e); for (const y of [.14, .58]) f.block(x, y, z, .64, .05, .64, C.iron); }
}

// ---- Corvus's big top -----------------------------------------------------------------------------------------
// Bigger inside than out: a sawdust ring under a striped roof that climbs out of sight, a horseshoe of seven
// tiers with a crowd in them, four king poles hung with lights, a high wire and trapezes, and a curtained stage
// door under a board of bulbs. A carpet runs from the door between a ticket booth and a popcorn cart to the ring.
// `view` lifts the camera's gaze and widens it, so the height shows; `reach` and `ambient` light so large a room.
export const CORVUS_HALL = Object.freeze({ w: 30, d: 28, host: [0, -11.6], spawn: [0, -1.4], light: .6, exposure: 1.1, reach: 34, ambient: .8, view: Object.freeze({ lift: 3.2, fov: 56 }),
  blocks: Object.freeze([[-15, -28, 15, -21.9], [-15, -21.9, -8.1, -6.6], [8.1, -21.9, 15, -6.6], [-8.1, -21.9, -5.7, -19.7], [5.7, -21.9, 8.1, -19.7],
    [-6.6, -5.3, -3.8, -2.9], [3.8, -5.4, 6.6, -3], [-3.3, -17.4, -2.1, -16.2], [2.1, -17.4, 3.3, -16.2], [-.9, -18.1, .9, -17.2], [2.5, -12.9, 4, -11.6],
    [-4.75, -9.85, -4.15, -9.25], [4.15, -9.85, 4.75, -9.25], [-4.75, -18.75, -4.15, -18.15], [4.15, -18.75, 4.75, -18.15]]) });
export function corvusTent(f, r = seeded(439)) {
  const W = 30, D = 28, cz = -14, RW = 14.3, wallH = 6, peak = 17, ringR = 5.2, deg = Math.PI / 180;
  const plum = 0x5c3a7c, deep = 0x3c2552, gold = C.gold, cream = 0xe9d3a0, ochre = 0xcfa64a, red = 0xa8172c, wood = [0x7a5a3c, 0x6c4e34, 0x866646];
  // A point `rad` from the ring's middle, `th` round from the door's side.
  const polar = (th, rad) => [Math.sin(th) * rad, cz + Math.cos(th) * rad];
  const stripe = (th) => Math.floor(th / (TAU / 36)) % 2;
  const bulbs = (ax, ay, az, bx, by, bz, n, sag, colours = [0xffc06a, 0xff8a5a, 0xe8b0ff]) => { for (let i = 1; i < n; i++) { const t = i / n; f.block(ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * Math.PI) * sag, az + (bz - az) * t, .12, .14, .12, colours[i % colours.length], true); } };
  // ---- The ground: trodden earth, a carpet from the door, and the ring's sawdust with a star at its heart.
  f.block(0, -.15, -D / 2, W + .6, .2, D + .8, 0x2c211e);
  for (let x = -15; x < 15; x += 2) for (let z = -28; z < 0; z += 2) f.block(x + 1, 0, z + 1, 1.97, .12, 1.97, vary(pick([0x4a3a30, 0x54423a, 0x43342c], r), .05, r));
  for (let dz = -ringR + .25; dz < ringR; dz += .5) f.block(0, .12, cz + dz, Math.sqrt(ringR * ringR - dz * dz) * 2, .05, .5, vary(pick([0xd8b878, 0xcfae6c, 0xe0c286], r), .04, r));
  f.block(0, .12, -4.6, 2.4, .03, 8.2, red); for (const s of [-1, 1]) f.block(s * 1.1, .13, -4.6, .1, .03, 8.2, gold);
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; f.block(Math.sin(a) * .8, .17, cz + Math.cos(a) * .8, .5, .02, .5, red); } f.block(0, .17, cz, 1.1, .025, 1.1, gold); f.block(0, .18, cz, .5, .025, .5, red);
  // The ring's kerb: red and cream blocks under a gilt rail with bulbs, open at the front and the back.
  for (let i = 0; i < 44; i++) { const th = (i + .5) / 44 * TAU, [x, z] = polar(th, ringR + .2); if (Math.abs(x) < 1.35) continue; f.block(x, .12, z, .78, .34, .78, i % 2 ? red : cream); f.block(x, .46, z, .84, .07, .84, gold); if (i % 2) f.block(x, .53, z, .1, .1, .1, 0xffc06a, true); }
  // ---- The seats: seven tiers in a horseshoe, stair aisles in red, and the crowd.
  const coats = [0x6d4c89, 0x884659, 0x4a6a8a, 0x87916b, 0xb3a082, 0x3d3550, 0xa8553f, 0x4f6a5a], heads = [0xe8b890, 0xd9a078, 0xc98a62, 0xf0c8a4, 0xe8771f, 0xe8e4dc, 0x8fb07a];
  for (let t = 0; t < 7; t++) {
    const rad = 8.3 + t * .82, h = .42 * (t + 1), n = Math.round(250 * deg * rad / .92);
    for (let j = 0; j < n; j++) {
      const th = (55 + (j + .5) / n * 250) * deg, [x, z] = polar(th, rad), a = th / deg;
      if (Math.abs(a - 180) < 9.5 && t < 4) continue;                       // the way in from backstage
      const aisle = Math.abs(a - 118) < 2.6 || Math.abs(a - 242) < 2.6;
      f.block(x, .12, z, .98, h, .9, vary(t % 2 ? 0x5a2c40 : 0x34406a, .04, r)); f.block(x, .12 + h, z, 1.0, .07, .94, aisle ? red : vary(pick(wood, r), .05, r));
      if (aisle || r() > .58) continue;
      const coat = pick(coats, r), y = .19 + h;
      f.block(x, y, z, .46, .5, .4, coat); f.block(x, y + .5, z, .3, .3, .3, pick(heads, r));
      const whim = r(); if (whim < .22) { f.block(x, y + .8, z, .36, .08, .36, 0x241c2c); f.block(x, y + .88, z, .22, .2, .22, 0x241c2c); } else if (whim < .4) for (const s of [-1, 1]) f.block(x + s * .3, y + .42, z, .1, .52, .1, coat);
    }
  }
  // ---- The canvas: striped walls open towards the door, a gilt band with bulbs, and the roof climbing to its crown.
  for (let i = 0; i < 72; i++) { const th = (i + .5) / 72 * TAU, a = th / deg; if (a < 50 || a > 310) continue; const [x, z] = polar(th, RW); f.block(x, 0, z, 1.34, wallH, 1.34, vary(stripe(th) ? plum : ochre, .03, r)); f.block(x, wallH, z, 1.4, .3, 1.4, gold); if (i % 2) { const [bx, bz] = polar(th, RW - .78); f.block(bx, wallH - .2, bz, .14, .14, .14, i % 4 === 1 ? 0xffc06a : 0xe8b0ff, true); } }
  for (let k = 0; k < 13; k++) {
    const t = k / 13, t1 = (k + 1) / 13, rad = 1.8 + (RW - 1.8) * (1 - t) ** 1.5, y = wallH + .3 + (peak - wallH - .3) * (1 - (1 - t) ** 1.3), y1 = wallH + .3 + (peak - wallH - .3) * (1 - (1 - t1) ** 1.3);
    const m = Math.max(10, Math.round(220 * deg * rad / 1.25)), s = 220 * deg * rad / m * 1.14;
    for (let j = 0; j < m; j++) { const th = (70 + (j + .5) / m * 220) * deg, [x, z] = polar(th, rad); f.block(x, y, z, s, y1 - y + .06, s, shade(stripe(th) ? plum : ochre, .62 + t * .3)); }
  }
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; f.block(Math.sin(a) * 1.5, peak - .5, cz + Math.cos(a) * 1.5, .5, .3, .5, gold); f.block(Math.sin(a) * 1.25, peak - .9, cz + Math.cos(a) * 1.25, .16, .2, .16, 0xffd28a, true); }
  f.block(0, peak - 2.4, cz, .06, 2, .06, C.iron); lantern(f, 0, peak - 3.3, cz, 1.6); f.mark?.("sparkle", 0, peak - 2.6, cz);
  // ---- The king poles: banded masts with a lamp each, lights strung between them and out to the walls.
  const poles = [[-4.45, -9.55], [4.45, -9.55], [-4.45, -18.45], [4.45, -18.45]];
  for (const [x, z] of poles) {
    f.block(x, .12, z, .7, .4, .7, deep); f.block(x, .52, z, .34, peak - 4, .34, 0x6a4a34);
    for (let y = 2; y < peak - 4; y += 2.2) { f.block(x, y, z, .42, .22, .42, gold); f.block(x, y + .22, z, .4, .5, .4, red); }
    const inx = -Math.sign(x) * .5, inz = Math.sign(cz - z) * .5;
    f.block(x + inx, 7.5, z + inz, .5, .5, .5, C.iron); f.block(x + inx * 1.5, 7.56, z + inz * 1.5, .36, .38, .36, 0xffe2a8, true); f.mark?.("lamp", x + inx * 2, 7.4, z + inz * 2);
    const [wx, wz] = polar(Math.atan2(x, z - cz), RW - .9); bulbs(x, 11.6, z, wx, wallH + .4, wz, 12, 1.1);
  }
  bulbs(-4.45, 11.6, -9.55, 4.45, 11.6, -9.55, 12, .9); bulbs(-4.45, 11.6, -18.45, 4.45, 11.6, -18.45, 12, .9); for (const s of [-1, 1]) bulbs(s * 4.45, 11.6, -9.55, s * 4.45, 11.6, -18.45, 12, .9);
  // The high wire between the back poles' platforms, a walker on it with a pole; two trapezes over the ring.
  for (const s of [-1, 1]) { f.block(s * 4.45, 8.9, -18.45, 1.3, .1, 1.3, wood[0]); for (const e of [-1, 1]) f.block(s * 4.45 + e * .6, 9, -18.45 - .6, .06, .6, .06, gold); f.block(s * 4.45, 9.56, -19.05, 1.3, .05, .05, gold); for (let k = 0; k < 16; k++) f.block(s * 5.0, .6 + k * .52, -18.45, .34, .04, .05, cream); }
  f.block(0, 9.02, -18.45, 7.7, .04, .04, 0x1e1a24);
  f.block(1.1, 9.06, -18.45, .2, .5, .16, deep); f.block(1.1, 9.56, -18.45, .34, .44, .22, 0xd6407a); f.block(1.1, 10.0, -18.45, .24, .24, .22, heads[0]); f.block(1.1, 9.8, -18.45, 2.6, .04, .04, gold);
  for (const s of [-1, 1]) { const x = s * 2.1; for (const e of [-1, 1]) f.block(x + e * .5, 8.4, cz, .03, 6.4, .03, cream); f.block(x, 8.36, cz, 1.08, .07, .07, gold); }
  f.block(-2.1, 7.5, cz, .2, .86, .16, 0x4a8ad8); f.block(-2.1, 7.2, cz, .22, .24, .2, heads[3]); for (const e of [-1, 1]) f.block(-2.1 + e * .14, 6.5, cz, .1, .74, .1, 0x4a8ad8);
  // ---- The stage door: gilt pillars and an arch, velvet drawn back on backstage light, and the board above.
  const sz = -22.3;
  for (const s of [-1, 1]) { f.block(s * 2.7, .12, sz, .7, .3, .7, deep); f.block(s * 2.7, .42, sz, .5, 5.6, .5, gold); for (let y = 1.2; y < 5.8; y += 1.3) f.block(s * 2.7, y, sz, .58, .14, .58, red); f.block(s * 2.7, 6.02, sz, .8, .2, .8, cream); f.block(s * 2.7, 6.22, sz, .36, .4, .36, gold); f.block(s * 2.7, 6.62, sz, .24, .24, .24, 0xffd28a, true); }
  for (let i = 0; i < 11; i++) { const a = i / 10 * Math.PI; f.block(-Math.cos(a) * 2.5, 5.0 + Math.sin(a) * 1.1, sz, .56, .44, .46, i % 2 ? gold : red); }
  f.block(0, .12, sz - .9, 1.5, 3.4, .1, 0xa8487a, true); f.block(0, .12, sz - 1.4, 5, 6.2, .3, 0x1c1220);
  for (let i = 0; i < 10; i++) { if (i > 3 && i < 6) continue; f.block(-2.25 + i * .5, .12, sz - .5 + (i % 2) * .12, .5, 5.1, .3, shade(red, .74 + (i % 2) * .22)); }
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) f.block(s * (.3 + k * .12), 3.2 + k * .42, sz - .46, .56 - k * .06, .44, .3, shade(red, .8 + (k % 2) * .16));
  f.block(0, 4.86, sz - .3, 5.0, .46, .4, shade(red, .9)); for (let i = 0; i < 12; i++) f.block(-2.3 + i * .42, 4.7, sz - .12, .14, .2, .06, gold);
  f.block(0, 6.9, sz, 6.4, 1.7, .34, deep); f.block(0, 6.82, sz + .04, 6.7, .1, .4, gold); f.block(0, 8.6, sz + .04, 6.7, .1, .4, gold);
  for (let i = 0; i < 16; i++) { f.block(-3 + i * .4, 8.42, sz + .2, .12, .12, .1, i % 2 ? 0xffc06a : 0xff8a5a, true); f.block(-3 + i * .4, 6.98, sz + .2, .12, .12, .1, i % 2 ? 0xff8a5a : 0xffc06a, true); }
  // A moth in gilt on the board: wings, body and feelers.
  for (const s of [-1, 1]) { f.block(s * .7, 7.65, sz + .2, 1.0, .5, .06, gold); f.block(s * 1.1, 7.95, sz + .2, .7, .3, .06, cream); f.block(s * .6, 7.3, sz + .2, .7, .34, .06, ochre); f.block(s * .16, 8.1, sz + .2, .05, .26, .05, gold); }
  f.block(0, 7.3, sz + .22, .2, .86, .08, 0x241c2c); f.mark?.("sparkle", 0, 7.7, sz + .4);
  for (const s of [-1, 1]) { const x = s * 3.9, z = sz + 1; f.block(x, .12, z, .16, 1.3, .16, C.iron); f.block(x, 1.42, z, .6, .14, .6, C.iron); f.block(x, 1.56, z, .44, .1, .44, 0x5a2a1c); f.mark?.("fire", x, 1.66, z); f.mark?.("lamp", x, 2.3, z + .3); }
  // Long banners hanging before the seats.
  for (const a of [96, 134, 226, 264]) { const [x, z] = polar(a * deg, 12.6), side = Math.abs(Math.sin(a * deg)) > .8; f.block(x, 12.6, z, side ? .08 : 1.5, .1, side ? 1.5 : .08, gold); f.block(x, 8.2, z, side ? .06 : 1.3, 4.4, side ? 1.3 : .06, a % 4 ? plum : red); f.block(x, 8.0, z, side ? .08 : .7, .26, side ? .7 : .08, gold); f.block(x, 10.2, z, side ? .08 : .6, .6, side ? .6 : .08, cream); }
  // ---- In the ring: two painted tubs, a hoop of fire on its stand, a star ball and a cannon.
  for (const s of [-1, 1]) { const x = s * 2.7, z = -16.8; f.block(x, .16, z, 1.0, .56, 1.0, s > 0 ? 0x34406a : red); for (const y of [.16, .64]) f.block(x, y, z, 1.06, .08, 1.06, gold); f.block(x, .72, z, .9, .05, .9, cream); f.block(x, .77, z, .4, .02, .4, gold); }
  f.block(0, .16, -17.65, 1.5, .12, .5, deep); for (const s of [-1, 1]) f.block(s * 1.02, .28, -17.65, .1, 1.8, .1, C.iron);
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; f.block(Math.sin(a) * .95, 2.0 + Math.cos(a) * .95, -17.65, .2, .2, .16, C.iron); if (i % 2) f.block(Math.sin(a) * 1.08, 2.0 + Math.cos(a) * 1.08, -17.65, .14, .16, .12, 0xff9a3a, true); }
  f.mark?.("fire", 0, 2.95, -17.65); f.mark?.("fire", 0, 1.0, -17.65);
  f.block(-2.4, .2, -12.3, .74, .44, .74, 0x4a8ad8); f.block(-2.4, .12, -12.3, .5, .62, .5, 0x4a8ad8); f.block(-2.4, .26, -12.3, .82, .3, .5, 0x4a8ad8); f.block(-2.4, .26, -12.3, .5, .3, .82, 0x4a8ad8); f.block(-2.4, .3, -12.3, .76, .2, .2, gold); f.block(-2.4, .3, -12.3, .2, .2, .76, gold);
  { const x = 3.2, z = -12.25; for (const e of [-1, 1]) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; f.block(x + e * .5, .56 + Math.sin(a) * .4, z + Math.cos(a) * .4, .1, .16, .16, gold); } f.block(x, .5, z, .9, .12, .12, C.iron);
    for (let k = 0; k < 6; k++) f.block(x, .5 + k * .2, z - .3 + k * .26, .56 - k * .03, .34, .4, k % 2 ? deep : plum); f.block(x, 1.66, z + 1.16, .66, .2, .16, gold); }
  // ---- By the door: the canvas kick-wall and its posts, a ticket booth, a popcorn cart and roped posts.
  for (const s of [-1, 1]) { const len = W / 2 - 1.15; f.block(s * (1.15 + len / 2), 0, 0, len, .7, .3, plum); f.block(s * (1.15 + len / 2), .7, 0, len + .1, .08, .36, gold); f.block(s * 1.2, 0, 0, .34, 1.4, .34, deep); f.block(s * 1.2, 1.4, 0, .44, .1, .44, gold); lantern(f, s * 1.2, 1.5, 0, .6); f.mark?.("lamp", s * 1.2, 2.1, .3); }
  f.block(0, 0, .3, 2.2, .1, .6, C.stone[1]);
  { const x = -5.2, z = -4.1; for (let i = 0; i < 6; i++) f.block(x - 1 + i * .4, .12, z, .4, 2.3, 2.0, i % 2 ? red : cream); f.block(x, 1.0, z + 1.06, 1.5, .1, .3, wood[0]); f.block(x, 1.14, z + 1.02, 1.3, .9, .06, 0xffd9a0, true); f.block(x, 1.14, z + 1.05, .05, .9, .04, deep); f.block(x, 2.42, z, 2.9, .12, 2.5, deep);
    for (let i = 0; i < 7; i++) f.block(x - 1.2 + i * .4, 2.2 - (i % 2) * .08, z + 1.26, .4, .22 + (i % 2) * .08, .08, i % 2 ? gold : red); f.block(x, 2.54, z + .9, 2.2, .6, .12, deep); f.block(x, 2.62, z + .98, 1.9, .44, .04, cream); for (let i = 0; i < 8; i++) f.block(x - .98 + i * .28, 3.16, z + .98, .1, .1, .1, i % 2 ? 0xffc06a : 0xff8a5a, true); }
  { const x = 5.2, z = -4.2; f.block(x, .5, z, 2.2, .9, 1.5, red); for (const y of [.5, 1.32]) f.block(x, y, z, 2.28, .08, 1.58, gold); f.block(x, 1.4, z, 2.0, 1.0, 1.3, 0xffe2a8, true); for (let i = 0; i < 9; i++) f.block(x - .8 + (i % 3) * .8, 1.4, z + .67, .5, .16 + (i % 2) * .2, .04, 0xfff4d8);
    for (const sx of [-1, 1]) for (const sz2 of [-1, 1]) f.block(x + sx * 1.04, 1.4, z + sz2 * .7, .08, 1.5, .08, gold); for (let i = 0; i < 6; i++) f.block(x - 1 + i * .4, 2.9, z, .4, .14, 1.8, i % 2 ? cream : red); f.block(x, 2.84, z, 2.5, .07, 1.9, gold);
    for (const sx of [-1, 1]) { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; f.block(x + sx * .7, .5 + Math.sin(a) * .38, z + .8 + Math.cos(a) * .38 * 0, .14, .14, .1, C.iron); } f.block(x + sx * .7, .12, z + .8, .5, .76, .1, 0x3a2a24); }
    f.mark?.("steam", x, 3.1, z); }
  for (const s of [-1, 1]) for (const z of [-1.6, -3.6, -5.6, -7.6]) { f.block(s * 1.7, .12, z, .3, .06, .3, C.brass); f.block(s * 1.7, .18, z, .1, .8, .1, C.brass); f.block(s * 1.7, .98, z, .18, .16, .18, C.brass); if (z < -1.7) f.block(s * 1.7, .82, z + 1, .07, .07, 1.9, red); }
  for (const [x, y, z] of [[-3, 4.5, -11], [3.5, 5, -16], [0, 6.5, -20]]) f.mark?.("motes", x, y, z);
}
