// The Baron's existing home, furnished as a velvet drawing room. Local hall
// coordinates only: the view supplies the scale, finish, cast and pooled lights.
import { seeded, vary } from './voxels.js';
import { C, hallShell, lantern, bookRow } from './village-models.js';

const INK = 0x292334, WOOD = 0x382332, PLUM = 0x6d354e, VELVET = 0x782c47;
const MARBLE = [0xd4c8bd, 0xb7b1b4, 0xe8ddd0], GOLD = C.brass, CREAM = 0xeaddc6;
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const BARON_HALL = freeze({ w: 12, d: 10, host: [0, -5.6], spawn: [0, -1.4], light: .46, exposure: 1.08, ambient: .4,
  blocks: [
    [-2.5, -10, 2.5, -8.55], // Marble hearth, fender and log baskets.
    [-6, -9.5, -4.65, -6.5], // Gallery cabinets.
    [-6, -5.8, -4.45, -2], // Velvet window seat.
    [2.45, -9, 5.65, -6.45], // Piano case and turned legs.
    [3, -6.15, 4.8, -5.45], // Piano stool.
    [-3.8, -5.25, -2.4, -3.7], // Wing chair.
    [-3.7, -6.65, -2.5, -5.55], // Reading table.
    [4, -4.7, 5.7, -1.65], // Conversation settee.
    [3, -1.25, 5.7, -.4], // Visiting-card console.
  ] });

function candle(f, x, y, z, h = .3) {
  f.block(x, y, z, .13, .05, .13, GOLD); f.block(x, y + .05, z, .07, h, .07, CREAM);
  f.block(x, y + h + .05, z, .03, .045, .03, 0xffbb65, true); f.mark?.('candle', x, y + h + .06, z);
}
function giltFrame(f, x, y, z, w, h, side = false) {
  const block = (a, b, across, high, colour) => f.block(x + (side ? 0 : a), y + b, z + (side ? a : 0), side ? .11 : across, high, side ? across : .11, colour);
  for (const [inset, size, colour] of [[0, .12, 0x8a6038], [.09, .055, GOLD], [-.07, .055, C.gold]]) {
    for (const s of [-1, 1]) { block(s * (w / 2 - inset), 0, size, h, colour); block(0, s > 0 ? h - size : 0, w - inset * 2, size, colour); }
  }
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) block(s * (w / 2 - .15 - k * .09), h + .04 + k * .06, .15, .12, GOLD);
}
function upholstery(f, x, z, { side = false, width = 1.1, depth = 1.1, colour = VELVET } = {}) {
  // side turns the back towards the right wall, leaving the seat open to the room.
  const block = (dx, y, dz, w, h, d, c) => f.block(x + (side ? -dz : dx), y, z + (side ? dx : dz), side ? d : w, h, side ? w : d, c);
  for (const a of [-1, 1]) for (const b of [-1, 1]) block(a * (width / 2 - .12), .12, b * (depth / 2 - .12), .1, .42, .1, WOOD);
  block(0, .45, 0, width, .2, depth, WOOD); block(0, .65, 0, width - .15, .18, depth - .12, colour);
  block(0, .75, -depth / 2 + .12, width, .92, .24, colour);
  for (const s of [-1, 1]) { block(s * (width / 2 - .1), .63, 0, .2, .4, depth, WOOD); block(s * (width / 2 - .1), 1.03, 0, .2, .1, depth, colour); block(s * (width / 2 - .12), 1.67, -depth / 2 + .12, .12, .12, .15, GOLD); }
  for (let i = 0; i < Math.max(3, Math.round(width / .28)); i++) { const dx = -width / 2 + .18 + i * .27; for (const y of [1.05, 1.4]) block(dx, y, -depth / 2 + .255, .035, .035, .025, GOLD); }
}

export function baronManor(f, r = seeded(441)) {
  hallShell(f, r, { w: 12, d: 10, h: 5.1, boards: [0x413039, 0x4b343c, 0x382831], wall: 0x645060, beam: INK });
  // Walnut panelling and velvet wall panels. All tall work stays at the sides
  // and back of the cutaway, with a generous unbroken route to the host.
  for (const side of [-1, 1]) {
    for (let z = -9.3; z < -.4; z += 1.45) {
      f.block(side * 5.79, .2, z, .12, .95, 1.2, WOOD); f.block(side * 5.71, .31, z, .035, .72, 1, PLUM);
      f.block(side * 5.8, 1.15, z, .14, .075, 1.4, GOLD);
      f.block(side * 5.79, 3.65, z, .16, .12, 1.4, WOOD);
    }
    for (const y of [4.47, 4.64, 4.82]) f.block(side * 5.8, y, -5, .18, .09, 9.7, y === 4.64 ? GOLD : WOOD);
  }
  // A broad Persian-style runner is low enough to walk across freely.
  f.block(0, .125, -4.7, 4.1, .018, 6.3, 0x572940);
  for (const s of [-1, 1]) { f.block(s * 1.94, .146, -4.7, .09, .012, 6.1, GOLD); f.block(0, .146, -4.7 + s * 3.02, 3.9, .012, .09, GOLD); }
  for (let z = -7.25; z < -1.9; z += .65) for (const side of [-1, 1]) {
    f.block(side * 1.55, .15, z, .2, .012, .24, 0xc79d77); f.block(side * 1.55, .15, z, .35, .012, .07, 0x8f6574);
  }
  // The marble fireplace: contrasting courses, carved columns, a deep black
  // opening, iron grate and a moth crest above the old portrait.
  f.block(0, .12, -9.35, 4.5, .16, 1.15, MARBLE[1]);
  f.block(0, .28, -9.66, 4.1, 2.05, .34, MARBLE[0]); f.block(0, .3, -9.43, 2.36, 1.65, .07, 0x18131c);
  for (const s of [-1, 1]) {
    f.block(s * 1.52, .28, -9.22, .62, .2, .75, MARBLE[2]);
    for (let j = 0; j < 5; j++) f.block(s * 1.52, .48 + j * .3, -9.26, .46 + (j % 2) * .06, .3, .6, MARBLE[j % 3]);
    f.block(s * 1.52, 1.98, -9.22, .7, .2, .8, MARBLE[2]);
    f.block(s * 1.52, .55, -8.93, .055, 1.3, .04, GOLD);
    for (let k = 0; k < 4; k++) f.block(s * 2.04, .3 + k * .22, -9.56, .22, .18, .24, MARBLE[(k + 1) % 3]);
    f.block(s * 1.9, .16, -8.8, .6, .23, .4, 0x70503a);
    for (let k = 0; k < 5; k++) f.block(s * 1.9 + (k % 2) * .13 - .06, .4 + Math.floor(k / 2) * .13, -8.83, .3, .12, .3, vary(0x60442e, .1, r));
  }
  f.block(0, 2.18, -9.21, 4.25, .17, .88, MARBLE[1]); f.block(0, 2.35, -9.2, 4.5, .12, .96, MARBLE[2]);
  for (let x = -1.85; x < 1.9; x += .28) f.block(x, 2.04, -8.99, .12, .15, .16, GOLD);
  f.block(0, .29, -8.76, 2.9, .07, .09, C.iron);
  for (let x = -1.32; x < 1.4; x += .24) { f.block(x, .33, -8.76, .035, .3, .035, C.iron); f.block(x, .63, -8.76, .065, .065, .065, GOLD); }
  f.mark?.('fire', 0, .36, -9.04); f.mark?.('lamp', 0, 1.35, -8.35);
  // The Baron's portrait is painted in a handful of coloured voxel planes;
  // the neighbouring empty frame deliberately shows the wall through it.
  f.block(0, 2.7, -9.72, 1.85, 1.62, .04, 0x302c45); giltFrame(f, 0, 2.64, -9.61, 2.05, 1.82);
  f.block(.06, 2.76, -9.65, 1.12, .63, .04, 0x351d31); f.block(-.08, 3.31, -9.64, .49, .61, .04, 0xcdbba2);
  f.block(-.13, 3.82, -9.62, .65, .2, .04, 0x1e1b27); f.block(.27, 3.44, -9.61, .12, .4, .04, 0x1e1b27);
  f.block(-.35, 3.25, -9.61, .26, .38, .04, 0x801f42); f.block(.35, 3.25, -9.61, .26, .38, .04, 0x801f42);
  f.block(-.16, 3.63, -9.59, .04, .045, .03, 0x302537); f.block(.05, 3.63, -9.59, .04, .045, .03, 0x302537);
  for (let j = 0; j < 6; j++) f.block(-.16 + j * .08, 3.03 + Math.abs(j - 2.5) * .035, -9.59, .045, .045, .025, GOLD);
  for (const side of [-1, 1]) { f.block(side * .4, 4.6, -9.67, .48, .22, .06, GOLD); f.block(side * .62, 4.76, -9.67, .35, .15, .06, C.gold); }
  f.block(0, 4.55, -9.65, .15, .4, .08, INK);
  giltFrame(f, -5.68, 1.87, -7.75, 1.65, 1.85, true);
  // Low gallery cabinets under the frame: books, a moon globe and a small
  // collection of porcelain that stays decorative, with no reward interaction.
  f.block(-5.3, .12, -8, 1.15, .82, 2.9, WOOD); f.block(-5.26, .94, -8, 1.32, .1, 2.94, INK);
  for (let z = -9.1; z < -6.6; z += .49) { f.block(-4.71, .27, z, .04, .5, .4, PLUM); f.block(-4.68, .49, z, .035, .05, .08, GOLD); }
  for (const z of [-8.88, -8.48]) { f.block(-5.24, 1.04, z, .28, .3, .24, CREAM); f.block(-5.24, 1.34, z, .15, .06, .15, GOLD); }
  f.block(-5.25, 1.04, -6.95, .37, .09, .37, GOLD); f.block(-5.25, 1.13, -6.95, .3, .32, .3, 0x8194aa);
  f.mark?.('sparkle', -4.94, 1.4, -7);
  // A deep, curtained window and a comfortable velvet seat on the west wall.
  f.block(-5.84, 1.45, -3.9, .035, 1.83, 2.6, 0x51547e, true);
  for (const z of [-5.2, -3.9, -2.6]) f.block(-5.73, 1.4, z, .12, 2.05, .085, INK);
  for (const y of [1.45, 2.37, 3.3]) f.block(-5.71, y, -3.9, .15, .09, 2.85, GOLD);
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) f.block(-5.57 + (i % 2) * .04, 1.25, -3.9 + side * (1.22 + i * .105), .18, 2.3 - i * .11, .14, vary(VELVET, .07, r));
  f.block(-5.25, .12, -3.9, 1.3, .5, 3.4, WOOD); f.block(-5.18, .62, -3.9, 1.24, .21, 3.35, VELVET);
  for (const z of [-5.05, -4.27, -3.49, -2.71]) { f.block(-5.14, .84, z, .62, .28, .6, PLUM); f.block(-5.1, 1.1, z, .42, .025, .05, GOLD); }
  upholstery(f, -3.1, -4.5, { width: 1.24, depth: 1.25 });
  f.block(-3.1, .12, -6.1, .72, .11, .72, WOOD); f.block(-3.1, .23, -6.1, .16, .63, .16, WOOD); f.block(-3.1, .86, -6.1, 1.08, .1, .94, WOOD);
  f.block(-3.3, .96, -6.1, .47, .07, .54, CREAM); f.block(-3.3, 1.03, -6.1, .035, .025, .55, GOLD); candle(f, -2.83, .96, -6.2, .25);
  // The piano has a curved stepped tail, its own stool, an open score, ivory
  // keys and all three pedals. It faces into the right-hand conversation nook.
  for (const [x, z] of [[2.85, -8.4], [5.1, -8.4], [2.9, -6.8], [5.05, -6.8]]) {
    f.block(x, .12, z, .14, .88, .14, INK); f.block(x, .12, z, .25, .1, .25, GOLD);
  }
  f.block(3.9, .93, -7.67, 2.85, .32, 2.05, INK); f.block(3.9, 1.25, -7.9, 2.82, .12, 1.6, 0x221e2b);
  for (let i = 0; i < 7; i++) f.block(3.9, 1.37 + i * .055, -8.55 + i * .12, 2.8 - i * .12, .06, .2, WOOD);
  f.block(3.9, 1.14, -6.5, 2.78, .11, .36, WOOD);
  for (let i = 0; i < 24; i++) { const x = 2.62 + i * .112; f.block(x, 1.25, -6.5, .105, .035, .31, CREAM); if (![2, 6].includes(i % 7)) f.block(x + .05, 1.285, -6.58, .045, .055, .16, INK); }
  f.block(3.9, 1.42, -7.15, 1.45, .64, .055, WOOD); f.block(3.9, 1.5, -7.1, 1.2, .49, .025, CREAM);
  for (const dx of [-.31, .31]) for (let line = 0; line < 4; line++) f.block(3.9 + dx, 1.63 + line * .065, -7.08, .43, .012, .012, 0x75645f);
  for (const dx of [-.12, 0, .12]) f.block(3.9 + dx, .17, -6.61, .075, .07, .25, GOLD);
  for (const x of [3.2, 4.6]) for (const z of [-6.02, -5.6]) f.block(x, .12, z, .09, .45, .09, WOOD);
  f.block(3.9, .57, -5.81, 1.75, .12, .63, VELVET);
  candle(f, 5.08, 1.37, -7.9, .32); f.mark?.('lamp', 4.65, 2.2, -7.5);
  // A settee and visiting-card console give the front corner a domestic scale.
  upholstery(f, 4.8, -3.15, { side: true, width: 2.85, depth: 1.35 });
  for (const x of [3.2, 5.4]) for (const z of [-1.1, -.55]) f.block(x, .12, z, .1, .77, .1, WOOD);
  f.block(4.3, .89, -.82, 2.5, .11, .8, INK); f.block(4.3, 1, -.82, .8, .05, .46, GOLD);
  for (let i = 0; i < 5; i++) f.block(4.1 + i * .045, 1.05 + i * .018, -.8, .34, .018, .22, CREAM);
  f.block(5.1, 1, -.8, .16, .22, .16, 0x343240); candle(f, 3.35, 1, -.8, .34);
  // A restrained chandelier and standing lamp use marks in the existing pool.
  f.block(0, 4.48, -4.8, .04, .6, .04, C.iron);
  for (const [x, z] of [[-.72, -4.8], [.72, -4.8], [0, -4.12], [0, -5.48]]) {
    f.block(x / 2, 4.12, -4.8 + (z + 4.8) / 2, Math.abs(x) + .09, .07, Math.abs(z + 4.8) + .09, GOLD); candle(f, x, 4.16, z, .2);
  }
  f.mark?.('lamp', 0, 4.3, -4.8); f.mark?.('motes', .3, 2.5, -7.5);
  f.block(-4.45, .12, -2.1, .42, .08, .42, INK); f.block(-4.45, .2, -2.1, .065, 2.03, .065, GOLD); lantern(f, -4.45, 2.23, -2.1, .65);
  f.mark?.('lamp', -4.45, 2.5, -2.1);
  // Books lie on the wide mantel, away from the open host approach.
  bookRow(f, r, -.8, .3, 2.47, -9.18, .3); candle(f, -1.68, 2.47, -9.15, .32); candle(f, 1.68, 2.47, -9.15, .28);
}
