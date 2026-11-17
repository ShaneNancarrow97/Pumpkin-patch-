// Granny's listening cottage, on the hall's local design grid. The room is
// front-open; the view supplies its one world scale and the shared lamp pool.
import { seeded, vary } from './voxels.js';
import { C, hallShell, lantern } from './village-models.js';

const pick = (items, r) => items[Math.floor(r() * items.length)];
const WOOD = 0x49372c, EDGE = 0x755741, CREAM = 0xe5dbc4, CLOTH = 0x80546b;
const freezeBlocks = blocks => Object.freeze(blocks.map(Object.freeze));

export const GRANNY_HALL = Object.freeze({
  w: 12, d: 10, host: Object.freeze([0, -5.6]), spawn: Object.freeze([0, -1.4]), light: .49, exposure: 1.08,
  blocks: freezeBlocks([
    [-6, -10, -2.9, -7.15], // Inglenook, hearthstone, cauldron and stacked logs.
    [-2.2, -10, 2.4, -8.65], // Plate dresser against the back wall.
    [3.05, -10, 6, -6.05], // Enclosed bed alcove and its carved posts.
    [-4.5, -5.5, -2.5, -3.7], // The small supper table.
    [-5.3, -5.05, -4.4, -4.15], // Granny's chair at the table.
    [-2.4, -5.05, -1.5, -4.15], // The second chair, already set for company.
    [4.05, -5.95, 6, -3.55], // Kettle counter and its crockery cupboard.
    [-5.25, -2.9, -3.55, -1.2], // Rocking chair, shawl and low footstool.
    [3.95, -2.3, 5.4, -1.05], // Basket of wool and Granny's walking boots.
  ]),
});

function candle(f, x, y, z, height = .24) {
  f.block(x, y, z, .2, .035, .2, C.brass);
  f.block(x, y + .035, z, .085, height, .085, CREAM);
  f.block(x, y + height + .035, z, .026, .045, .026, C.glowSoft, true);
  f.mark?.('candle', x, y + height + .065, z);
}
function cup(f, x, y, z, colour = CREAM) {
  f.block(x, y, z, .2, .025, .2, colour);
  f.block(x, y + .025, z, .14, .14, .14, colour);
  f.block(x, y + .155, z, .1, .014, .1, 0x533829);
  f.block(x + .105, y + .065, z, .07, .065, .035, colour);
}
function chair(f, x, z, facing, r) {
  const sign = facing === 'west' ? -1 : 1;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.block(x + sx * .28, .12, z + sz * .27, .075, .49, .075, WOOD);
  f.block(x, .61, z, .7, .09, .69, EDGE);
  f.block(x, .7, z, .62, .055, .61, CLOTH);
  for (const sz of [-1, 1]) f.block(x + sign * .3, .7, z + sz * .27, .07, .9, .07, WOOD);
  for (let k = 0; k < 5; k++) f.block(x + sign * .3, 1.04, z - .24 + k * .12, .075, .5, .04, vary(EDGE, .08, r));
  f.block(x + sign * .3, 1.56, z, .11, .11, .78, WOOD);
}
function herbBundle(f, x, y, z, r) {
  f.block(x, y, z, .025, .4, .025, 0x98876c);
  for (let k = 0; k < 7; k++) {
    const a = k * Math.PI * 2 / 7, reach = .07 + r() * .09;
    f.block(x + Math.cos(a) * reach, y - .3 - r() * .1, z + Math.sin(a) * reach, .085, .38, .085, pick([0x64704a, 0x8a8757, 0x597454], r));
  }
  f.block(x, y - .09, z, .18, .05, .18, 0x998366);
}

export function grannyCottage(f, r = seeded(447)) {
  const W = 12, D = 10, H = 4.8, plaster = 0xaeb29a;
  hallShell(f, r, { w: W, d: D, h: H, boards: [0x685140, 0x735844, 0x5d493b], wall: plaster, beam: WOOD });

  // The house has settled around its owner: patched plaster, a crooked wall
  // rail and hand-woven strips of rug, with a broad clear way to her post.
  for (let k = 0; k < 18; k++) {
    const x = -5.7 + k * .65, y = 3.55 + Math.sin(k * .9) * .08;
    f.block(x, y, -9.79, .68, .14, .12, vary(EDGE, .07, r));
    if (k % 3 === 1) for (let j = 0; j < 3; j++) f.block(x + (j - 1) * .08, 1.4 + j * .12, -9.85, .22, .11, .03, vary(0xd0c6a6, .03, r));
  }
  f.block(0, .125, -3.2, 2.55, .018, 5.4, 0x695b52);
  for (const sx of [-1, 1]) f.block(sx * 1.19, .146, -3.2, .085, .012, 5.25, 0xb99b73);
  for (let z = -5.6; z < -.5; z += .3) for (const sx of [-1, 1]) f.block(sx * 1.03, .148, z, .15, .01, .085, pick([0x8c6374, 0xb0a581, 0x8c8769], r));
  for (const x of [-2.9, 2.9]) for (let k = 0; k < 7; k++) f.block(x + (k - 3) * .018, 1 + k * .47, -9.73, .12, .51, .13, WOOD);

  // The inglenook is built of soot-stained stone with a broad lintel, an iron
  // pot hanging over the embers and a kettle warming on the hearth's edge.
  { const x = -4.5, z = -8.9, stone = [0x827b6b, 0x918777, 0xa19680];
    f.block(x, .12, -8.5, 2.9, .16, 2.5, 0x6f685c);
    f.block(x, .28, z, 2.7, 2.6, 1.3, 0x28251f);
    for (const sx of [-1, 1]) for (let row = 0; row < 9; row++) for (let j = 0; j < 2; j++) f.block(x + sx * (1.05 + (row % 2) * .04), .28 + row * .27, z + .28 + j * .48, .55, .25, .46, vary(pick(stone, r), .05, r));
    for (let i = 0; i < 7; i++) f.block(x - 1.2 + i * .4, 2.63 + Math.abs(i - 3) * .025, z + .61, .39, .36, .55, vary(stone[i % 3], .04, r));
    f.block(x, 3, z + .28, 3.05, .21, 1.04, WOOD);
    for (let row = 0; row < 6; row++) f.block(x + Math.sin(row * .65) * .07, 3.21 + row * .28, z - .1, 1.62 - row * .12, .28, .84, vary(pick(stone, r), .05, r));
    f.block(x, .32, z + .67, 1.5, .05, .6, C.iron);
    for (const sx of [-1, 1]) f.block(x + sx * .43, .35, z + .65, .65, .13, .2, 0x483126);
    f.mark?.('fire', x - .3, .45, z + .69); f.mark?.('fire', x + .3, .45, z + .69);
    f.mark?.('lamp', x, 1.55, -7.1);
    f.block(x, 1.44, z + .55, .04, 1.14, .04, C.iron);
    for (const sx of [-1, 1]) f.block(x + sx * .35, .92, z + .55, .035, .5, .035, C.iron);
    f.block(x, 1.39, z + .55, .73, .035, .035, C.iron);
    for (const [y, size] of [[.63, .55], [.78, .75], [1.03, .68]]) f.block(x, y, z + .55, size, .25, size, 0x2e3430);
    f.block(x, 1.28, z + .55, .77, .07, .77, C.iron);
    f.block(x, 1.3, z + .55, .59, .035, .59, 0x9c9a52);
    for (const [dx, dz] of [[-.14, .08], [.12, -.1], [.08, .16]]) f.block(x + dx, 1.335, z + .55 + dz, .08, .016, .08, 0xc2bc76);
    f.mark?.('steam', x, 1.38, z + .55);
    candle(f, x - 1.05, 3.21, z + .35, .3);
    for (let i = 0; i < 6; i++) { const px = -3.3 + (i % 2) * .13, pz = -7.65 - Math.floor(i / 2) * .27; f.block(px, .28 + (i % 2) * .13, pz, .42, .14, .23, vary(EDGE, .1, r)); }
    for (const dx of [-.8, -.35, .25, .8]) herbBundle(f, x + dx, 3.76, z + .7, r);
  }

  // The plate dresser: mismatched willow-pattern dishes, drawers polished by
  // generations of hands, a button tin kept well away from the biscuit tin.
  { const x = .1, z = -9.35, width = 4.3;
    f.block(x, .12, z, width, .84, 1.04, WOOD); f.block(x, .96, z, width + .12, .12, 1.18, EDGE);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) {
      const px = x - 1.72 + i * .86, y = .19 + j * .23;
      f.block(px, y, z + .54, .77, .19, .05, vary(EDGE, .04, r)); f.block(px, y + .09, z + .585, .19, .035, .04, C.brass);
    }
    f.block(x, 1.08, z - .37, width, 2.22, .16, 0x4f5140);
    for (const px of [x - 2.08, x, x + 2.08]) f.block(px, 1.08, z - .09, .1, 2.22, .72, WOOD);
    for (const y of [1.12, 1.83, 2.54, 3.25]) f.block(x, y, z, width + .08, .09, .76, EDGE);
    for (const y of [1.22, 1.93, 2.64]) for (let i = 0; i < 7; i++) {
      const px = x - 1.78 + i * .59, colour = i % 3 ? CREAM : 0xbccbc0;
      f.block(px, y, z - .07, .46, .47, .055, colour); f.block(px, y + .08, z - .032, .3, .3, .02, 0x718c88);
      f.block(px, y + .13, z - .015, .2, .2, .012, colour);
    }
    for (const px of [-1.55, .65, 1.4]) cup(f, px, 1.08, z + .24, CREAM);
    f.block(-.45, 1.08, z + .08, .48, .31, .38, 0x8b7763); f.block(-.45, 1.39, z + .08, .5, .045, .4, C.brass);
    f.block(-.45, 1.24, z + .28, .12, .075, .014, CREAM);
    candle(f, 1.72, 3.34, z, .22); f.mark?.('lamp', .4, 3.1, -8.45);
  }

  // A warm bed in the far corner: tucked patchwork, a shelf for spectacles
  // and a curtain drawn back instead of a wall across the room.
  { const x = 4.55, z = -8.12;
    f.block(x, .12, z, 2.25, .45, 3.05, WOOD); f.block(x, .57, z, 2.13, .25, 2.94, CREAM);
    f.block(x, .82, z + .36, 2.18, .11, 2.2, CLOTH);
    for (let i = 0; i < 7; i++) for (let j = 0; j < 8; j++) f.block(x - .94 + i * .31, .94 + (i % 2) * .008, z - .58 + j * .27, .29, .025, .25, vary(pick([0x80546b, 0x9a806b, 0xb5a485, 0x687b70], r), .045, r));
    f.block(x, .82, z - 1.04, 1.55, .18, .62, 0xd8d0b8); f.block(x, 1, z - 1.04, 1.6, .035, .65, CREAM);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      f.block(x + sx * 1.19, .12, z + sz * 1.55, .15, 3.55, .15, WOOD);
      f.block(x + sx * 1.19, 3.67, z + sz * 1.55, .23, .16, .23, EDGE);
    }
    f.block(x, 3.83, z - 1.55, 2.7, .16, .26, WOOD);
    for (let i = 0; i < 12; i++) f.block(x - 1.17 + i * .215, 3.87, z - 1.55, .19, .13 + Math.sin(i / 11 * Math.PI) * .5, .27, EDGE);
    for (let j = 0; j < 8; j++) for (const sx of [-1, 1]) f.block(x + sx * (1.13 - j * .012), .95 + j * .33, z + 1.5 - (j % 2) * .035, .2, .35, .15, vary(CLOTH, .06, r));
    f.block(x, .93, z + 1.55, 2.6, .2, .18, WOOD);
    f.block(x, 2.35, -9.72, 1.15, .08, .34, EDGE);
    f.block(x - .2, 2.43, -9.56, .18, .035, .16, C.brass); f.block(x + .08, 2.43, -9.56, .18, .035, .16, C.brass); f.block(x - .055, 2.44, -9.55, .1, .025, .03, C.brass);
    candle(f, x + .4, 2.43, -9.55, .18);
  }

  // A small supper has two places. Both chairs stay at the side of the broad
  // centre aisle; Granny's welcome is already part of the existing story.
  { const x = -3.5, z = -4.6;
    f.block(x, .125, z, 2.75, .015, 2.85, 0x5c6351);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.block(x + sx * .77, .14, z + sz * .62, .105, .73, .105, WOOD);
    f.block(x, .87, z, 1.94, .12, 1.7, EDGE);
    for (let j = 0; j < 9; j++) f.block(x - .84 + j * .21, 1, z, .19, .018, 1.62, vary(0x8a6a4f, .05, r));
    f.block(x, 1.02, z, .7, .012, 1.62, 0xbab091);
    for (const sx of [-1, 1]) { f.block(x + sx * .62, 1.03, z, .42, .025, .42, CREAM); f.block(x + sx * .62, 1.06, z, .27, .014, .27, 0x8a9d83); cup(f, x + sx * .63, 1.03, z - .48); }
    f.block(x, 1.04, z + .1, .38, .06, .38, 0x7e644a);
    for (const [dx, dz] of [[-.08, .05], [.07, .06], [0, -.07]]) f.block(x + dx, 1.1, z + .1 + dz, .12, .07, .12, 0xc59a58);
    candle(f, x, 1.04, z - .42, .19);
    chair(f, -4.85, z, 'west', r); chair(f, -1.95, z, 'east', r);
  }

  // The kitchen counter has a copper kettle, a spoon rack, a cooling pie and
  // a well-used recipe book. Nothing here is an extra cooking transaction.
  { const x = 5.05, z = -4.75;
    f.block(x, .12, z, 1.55, .83, 2.3, WOOD); f.block(x, .95, z, 1.7, .1, 2.35, 0x9d9278);
    for (let k = 0; k < 5; k++) { f.block(x - .79, .22, z - .92 + k * .46, .055, .63, .4, EDGE); f.block(x - .83, .57, z - .92 + k * .46, .04, .05, .12, C.brass); }
    f.block(x, 1.05, z - .63, .58, .07, .58, C.iron);
    for (const [y, w] of [[1.12, .43], [1.27, .54], [1.48, .4]]) f.block(x, y, z - .63, w, .2, w, 0xb37647);
    f.block(x, 1.68, z - .63, .45, .04, .45, C.brass); f.block(x, 1.72, z - .63, .1, .08, .1, WOOD);
    f.block(x - .36, 1.44, z - .63, .28, .08, .1, 0xb37647); f.block(x - .45, 1.5, z - .63, .1, .11, .1, 0xb37647);
    for (const sx of [-1, 1]) f.block(x + sx * .23, 1.65, z - .63, .06, .4, .07, C.iron);
    f.block(x, 2.01, z - .63, .48, .06, .07, C.iron); f.mark?.('steam', x - .47, 1.66, z - .63);
    f.block(x, 1.05, z + .42, .64, .055, .67, 0x6a4a31); f.block(x, 1.105, z + .42, .54, .13, .54, 0xb8894d);
    for (let i = 0; i < 5; i++) f.block(x - .2 + i * .1, 1.235, z + .42, .045, .02, .5, CREAM);
    f.block(x, 1.05, z + .94, .7, .05, .4, 0x744a52); f.block(x, 1.1, z + .94, .61, .02, .35, CREAM); f.block(x, 1.12, z + .94, .025, .025, .37, WOOD);
    for (const sx of [-1, 1]) for (let j = 0; j < 3; j++) f.block(x + sx * .17, 1.125, z + .85 + j * .08, .19, .007, .015, 0x796f56);
    f.block(5.72, 2.8, z, .09, .1, 2.1, WOOD);
    for (let i = 0; i < 6; i++) { const pz = z - .86 + i * .34; f.block(5.62, 2.26, pz, .055, .55, .055, EDGE); f.block(5.62, 2.12, pz, .12, .16, .17, EDGE); }
    f.mark?.('lamp', 4.7, 2.7, -4.8);
  }

  // By the hearth's quiet end: a broad rocking chair with Granny's shawl over
  // its back, a low stool, and a basket full of wool that does not quite match.
  { const x = -4.45, z = -2.15;
    for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) f.block(x + sx * .42, .15 + Math.abs(k - 3) * .035, z - .61 + k * .18, .09, .09, .2, WOOD);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.block(x + sx * .35, .24, z + sz * .32, .08, .4, .08, WOOD);
    f.block(x, .64, z, .9, .1, .84, EDGE); f.block(x, .74, z, .78, .13, .74, CLOTH);
    for (const sx of [-1, 1]) { f.block(x + sx * .36, .75, z - .33, .08, 1.22, .08, WOOD); f.block(x + sx * .45, 1, z, .09, .09, .9, EDGE); }
    for (let k = 0; k < 7; k++) f.block(x - .3 + k * .1, .89, z - .33, .045, .97, .06, WOOD);
    f.block(x, 1.88, z - .33, .95, .12, .12, EDGE);
    for (let k = 0; k < 5; k++) f.block(x - .22 + k * .1, 1.04, z - .24, .095, .94 - k * .05, .055, pick([0xa17b82, 0xc3ae91, 0x897566], r));
    f.block(x + .16, .14, z + .6, .95, .27, .55, WOOD); f.block(x + .16, .41, z + .6, 1.01, .09, .6, 0x9f8b74);
  }
  { const x = 4.65, z = -1.72;
    f.block(x, .12, z, 1.02, .48, .84, 0x8b6d49);
    for (let row = 0; row < 6; row++) { f.block(x, .15 + row * .075, z + .435, 1.07, .04, .035, 0xb39464); for (const sx of [-1, 1]) f.block(x + sx * .52, .15 + row * .075, z, .035, .04, .87, 0xb39464); }
    for (let i = 0; i < 11; i++) { const px = x - .42 + (i % 4) * .27, pz = z - .26 + Math.floor(i / 4) * .25; f.block(px, .6 + (i % 3) * .03, pz, .25, .2, .25, pick([0x876c88, 0xb1a181, 0x83917c, 0xb78c73], r)); }
    for (const dx of [-.27, .27]) { f.block(x + dx, .12, z + .44, .27, .23, .38, WOOD); f.block(x + dx, .35, z + .32, .25, .35, .2, 0x3e3530); }
  }

  // A leaded side window glows through drawn-back curtains. Tiny ceramic
  // birds and dried herbs make the wall feel inhabited without another actor.
  { const x = -5.8, z = -5.9;
    for (let j = 0; j < 4; j++) for (let k = 0; k < 5; k++) f.block(x, 1.72 + j * .37, z - .78 + k * .39, .045, .35, .37, (j + k) % 2 ? 0xc1a574 : 0x8b9c9a, true);
    for (let k = 0; k <= 5; k++) f.block(x + .04, 1.65, z - .975 + k * .39, .08, 1.6, .05, WOOD);
    for (let j = 0; j <= 4; j++) f.block(x + .04, 1.65 + j * .39, z, .08, .055, 2.04, WOOD);
    f.block(x + .14, 1.52, z, .38, .1, 2.28, EDGE);
    for (const sz of [-1, 1]) for (let k = 0; k < 4; k++) f.block(x + .13 + (k % 2) * .025, 1.58, z + sz * (1.02 + k * .095), .09, 1.86 - k * .1, .11, vary(CLOTH, .06, r));
    for (const sz of [-1, 1]) { f.block(x + .12, 1.62, z + sz * .56, .14, .15, .22, CREAM); f.block(x + .12, 1.74, z + sz * .5, .1, .1, .1, CREAM); }
  }
  for (const [x, z] of [[-2.2, -8.8], [2.5, -8.8], [3.3, -5.9]]) herbBundle(f, x, 4.35, z, r);
  f.block(1.9, 3.36, -3.1, .035, 1.3, .035, C.iron); lantern(f, 1.9, 2.74, -3.1, .9);
  f.mark?.('lamp', 1.9, 3.05, -3.1);
  f.mark?.('motes', -.5, 2.7, -7.05); f.mark?.('motes', -4.7, 2.5, -4.9);
}
