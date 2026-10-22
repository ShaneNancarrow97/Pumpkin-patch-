// The overworld's mist, as numbers: a thin, low bank rolls in from the west,
// drifts across the farm (x from -8 to 54), thins away to the east and, after a
// clear spell, comes round again, a little thicker or thinner each time.
export const MIST = Object.freeze({ cycle: 210, from: -70, to: 120, halfWidth: 24, peak: 0.14, colour: 0x8f86b8 });

const fract = (n) => n - Math.floor(n);
// Where the bank is at time t (seconds): its centre along x, and how thick it is this time round (0.6 to 1).
export function mistBank(t) {
  const n = Math.floor(t / MIST.cycle), k = t / MIST.cycle - n;
  return { centre: MIST.from + (MIST.to - MIST.from) * k, halfWidth: MIST.halfWidth, strength: 0.6 + 0.4 * fract(Math.sin((n + 1) * 12.9898) * 43758.5453) };
}
// How much of the bank lies over x at time t, 0 to 1, soft at both edges. The shader does the same sum.
export function mistCover(x, t) {
  const b = mistBank(t), d = Math.abs(x - b.centre) / b.halfWidth;
  return d >= 1 ? 0 : b.strength * (1 - d * d) ** 2;
}

// Where the mist gives way: it thins to a third over the pumpkins (the patch
// and the big jack-o'-lantern) and fades out round the buildings, so they read
// clearly while the paths and the open yard keep it. Built from the layout's
// own numbers, so it follows the patch as the field grows or moves.
//   patch: patchShape() from content/farm-layout.js; shop, bigPumpkin: world.js SHOP and BIG_PUMPKIN;
//   hollow: HOLLOW_PROPERTY; meadow: MEADOW when the festival meadow is bought.
// Each spot is { x, z, rx, rz, keep }: keep is how much mist is left at its heart.
export const MIST_THIN = 0.33, MAX_CLEARINGS = 6;
export function mistClearings({ patch, shop, bigPumpkin, hollow, meadow }) {
  const spots = [
    { x: bigPumpkin.x, z: bigPumpkin.z, rx: 3.4, rz: 3.1, keep: MIST_THIN },                        // the dais and its candles
    { x: hollow.x, z: hollow.z, rx: 5.2, rz: 4.2, keep: 0 },                                         // the Hollow House (8 x 5.8)
    { x: shop.x, z: shop.z, rx: 5.8, rz: 3.8, keep: 0 },                                             // the shop (9 x 5)
    ...(meadow ? [{ x: meadow.stand[0], z: meadow.stand[1], rx: 3.6, rz: 3, keep: 0 }] : []),        // Sandy's cocoa booth
  ];
  return { patch: { x: patch.x, back: patch.back, front: patch.front, rx: patch.rx, rz: patch.rz, keep: MIST_THIN }, spots: spots.slice(0, MAX_CLEARINGS) };
}
const ease = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
// How much of the mist is left at (x, z), 0 to 1. The shader does the same sum.
export function mistLeft(x, z, { patch, spots }) {
  const nearest = Math.max(patch.back, Math.min(patch.front, z));
  let left = patch.keep + (1 - patch.keep) * ease(0.75, 1.25, ((x - patch.x) / patch.rx) ** 2 + ((z - nearest) / patch.rz) ** 2);
  for (const s of spots) left *= s.keep + (1 - s.keep) * ease(0.85, 1.7, Math.hypot((x - s.x) / s.rx, (z - s.z) / s.rz));
  return left;
}
