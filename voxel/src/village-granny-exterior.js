// Granny's cottage is drawn on the old Acre grid, then moved with the estate.
// All detail joins the existing house batches; it adds no lights or colliders.
import { PLAN_SCALE as K } from './content/village.js';
import { seeded, vary } from './voxels.js';

export function buildGrannyExterior(voxels, random = seeded(671229)) {
  const features = {}, bounds = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
  let feature = 'shell', boxes = 0, randomDraws = 0;
  const r = () => { randomDraws++; return random(); };
  const extend = (b, x, y, z, w, h, d) => {
    b.x0 = Math.min(b.x0, x - w / 2); b.x1 = Math.max(b.x1, x + w / 2);
    b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y + h);
    b.z0 = Math.min(b.z0, z - d / 2); b.z1 = Math.max(b.z1, z + d / 2);
  };
  const put = (x, y, z, w, h, d, colour, glow = false) => {
    voxels.block(x * K, y * K, -z * K, w * K, h * K, d * K, colour, glow); boxes++;
    const f = features[feature] ??= { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity, boxes: 0 };
    extend(bounds, x, y, z, w, h, d); extend(f, x, y, z, w, h, d); f.boxes++;
  };
  const wood = 0x49383c, edge = 0x8d7359, stone = 0x71636b;
  // One hidden floor slab leaves room in the old box budget for visible craft.
  put(-68, 3, 85.5, 10, .3, 7, 0x65505b);
  for (const x of [-72.5, -63.5]) for (let z = 82; z < 89; z += .5) for (let y = 3.3; y < 7; y += .45) put(x, y, z, .4, .44, .5, vary(0x67534d, .14, r));
  for (let x = -72.5; x < -63.4; x += .5) for (let y = 3.3; y < 7; y += .45) {
    put(x, y, 89, .5, .44, .4, vary(0x68554c, .12, r));
    if (Math.abs(x + 68) > 1.1) {
      // Keep the original colour draws, including the new openings, so the
      // estate's later pumpkin scatter retains its exact deterministic stream.
      const colour = vary(0x827465, .14, r), window = [-70.6, -65.4].some(cx => Math.abs(x - cx) < .9 && y > 4.1 && y < 6.2);
      if (!window) put(x, y, 82, .5, .44, .4, colour);
    }
  }
  feature = 'roof';
  for (let x = -73.5; x < -62.5; x += .35) for (let z = 81; z < 90; z += .45) {
    const sag = .13 * Math.sin((z - 81) / 9 * Math.PI), y = 8.8 - Math.abs(x + 68) * .35 - sag;
    put(x, y, z, .4, .15, .5, vary(0x413b4b, .14, r));
  }
  for (let z = 81.15; z < 89.9; z += .65) put(-68, 8.82 - .13 * Math.sin((z - 81) / 9 * Math.PI), z, .32, .13, .72, 0x64545c);
  for (const side of [-1, 1]) for (let i = 0; i < 13; i++) put(-68 + side * i * .42, 8.69 - i * .147, 80.98, .5, .18, .18, wood);
  for (const [x, z] of [[-72.8, 86.8], [-72.1, 87.4], [-71.8, 88], [-64, 84.8], [-63.6, 85.4]]) put(x, 8.96 - Math.abs(x + 68) * .35 - .13 * Math.sin((z - 81) / 9 * Math.PI), z, .42, .045, .52, 0x66664d);

  feature = 'beams';
  for (const x of [-72.35, -69.12, -66.88, -63.65]) for (let i = 0; i < 7; i++) put(x + Math.sin(i * .8) * .035, 3.35 + i * .54, 81.89, .17, .55, .16, wood);
  for (const [y, width] of [[3.72, 9.05], [6.48, 9.05], [7.05, 8.8]]) put(-68, y, 81.91, width, .16, .18, wood);
  for (const z of [83.3, 86.1, 88.65]) for (const x of [-72.48, -63.52]) put(x, 3.35, z, .3, 3.95, .18, wood);
  feature = 'stonework';
  for (let i = 0; i < 18; i++) {
    const x = -72.3 + i * .505;
    if (Math.abs(x + 68) > 1.17) put(x, 3.3, 81.83, .47, .32 + i % 3 * .025, .42, i % 2 ? stone : 0x86766d);
    put(x, 3.3, 88.98, .47, .34, .4, i % 2 ? 0x74616b : stone);
  }

  feature = 'windows';
  for (const [index, x] of [-70.6, -65.4].entries()) {
    put(x, 4.26, 82.17, 1.62, 1.94, .08, 0x332d39);
    for (let col = 0; col < 2; col++) for (let row = 0; row < 3; row++) put(x - .3 + col * .6, 4.45 + row * .48, 82.09, .55, .435, .035, row === 2 ? 0xc99a63 : 0xe6ad6d, true);
    // Folded curtains sit inside the reveal, ahead of the warm interior card.
    for (const side of [-1, 1]) for (let fold = 0; fold < 3; fold++) put(x + side * (.48 - fold * .075), 4.46 + fold * .045, 82.01 - fold % 2 * .018, .115, 1.44 - fold * .08, .045, fold % 2 ? 0x8f9482 : 0xb5af91);
    for (const side of [-1, 1]) {
      put(x + side * .79, 4.18, 81.71, .16, 2.08, .22, wood);
      put(x + side * .48, 4.86, 81.96, .2, .07, .06, 0x73595b);
    }
    for (const y of [4.23, 6.18]) put(x, y, 81.72, 1.83, .14, .24, edge);
    put(x, 4.4, 81.88, .075, 1.72, .09, wood);
    for (const y of [4.9, 5.4]) put(x, y, 81.88, 1.4, .055, .09, wood);
    put(x, 6.34, 81.94, 2.03, .15, .23, wood);
    feature = 'herb-boxes';
    put(x, 4.03, 81.71, 1.72, .2, .36, 0x694b40);
    put(x, 4.21, 81.71, 1.83, .06, .38, edge);
    for (const dx of [-.63, .63]) put(x + dx, 3.87, 81.79, .11, .22, .16, wood);
    for (const [j, dx] of [-.58, -.2, .2, .57].entries()) {
      put(x + dx, 4.24, 81.7, .07, .27 + j % 2 * .09, .07, 0x65734a);
      put(x + dx, 4.37, 81.69, .25, .12, .23, j % 2 ? 0x818866 : 0x5b7452);
      if ((j + index) % 2) put(x + dx, 4.58, 81.69, .09, .08, .09, 0xb49aaf);
    }
    feature = 'windows';
  }
  feature = 'door';
  put(-68, 3.3, 82.02, 2.17, 3.83, .16, wood);
  for (let i = 0; i < 5; i++) put(-68.57 + i * .285, 3.35, 81.88, .269, 2.46, .1, i % 2 ? 0x5c4050 : 0x674753);
  for (const dx of [-.78, .78]) put(-68 + dx, 3.31, 81.78, .17, 2.66, .18, edge);
  for (const y of [3.4, 4.48, 5.75]) put(-68, y, 81.79, 1.47, .12, .12, wood);
  for (const y of [3.83, 5.18]) { put(-68.48, y, 81.69, .45, .07, .06, 0x302d35); put(-68.65, y - .08, 81.7, .08, .23, .07, 0x302d35); }
  put(-67.52, 4.42, 81.69, .13, .18, .07, 0xb08b50);
  put(-67.52, 4.47, 81.62, .1, .1, .11, 0xd1ac67);
  put(-68, 5.99, 81.86, 2.35, .22, .26, wood);
  put(-68, 6.38, 81.87, .35, .38, .12, 0xb09b78);
  put(-67.91, 6.45, 81.78, .22, .26, .08, wood);
  for (let i = 0; i < 12; i++) { const angle = i / 12 * Math.PI * 2; put(-68 + Math.cos(angle) * .31, 5.13 + Math.sin(angle) * .31, 81.67, .17, .15, .095, i % 3 ? 0x667653 : 0x899367); }
  put(-68, 4.87, 81.6, .12, .25, .07, 0x9a5264);

  feature = 'chimney';
  put(-64.3, 7.7, 87.5, 1, 2.8, 1, 0x58454d);
  for (let row = 0; row < 7; row++) {
    put(-64.3, 7.75 + row * .34, 86.98, 1.04, .045, .06, 0x918075);
    put(-64.82, 7.75 + row * .34, 87.5, .06, .045, 1.04, 0x918075);
    put(-64.3 + (row % 2 ? -.24 : .24), 7.8 + row * .34, 86.975, .045, .27, .07, 0x918075);
  }
  put(-64.3, 10.29, 87.5, 1.2, .19, 1.2, 0x897369);
  put(-64.3, 10.48, 87.5, .72, .045, .72, 0x24232b);
  for (const dx of [-.43, .43]) put(-64.3 + dx, 10.5, 87.5, .075, .24, .075, 0x423943);
  put(-64.3, 10.74, 87.5, 1.12, .13, 1.12, 0x66525c);
  return { boxes, randomDraws, bounds, features, addedLights: 0 };
}
