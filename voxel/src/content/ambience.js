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
