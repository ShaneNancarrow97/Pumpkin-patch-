// Stable plot IDs and shared purchased-land bounds; no renderer dependencies.
export const MAX_PLOTS = 24;
export const PLOT_COUNTS = [6, 9, 12, 18, 24];
export const PLOT_POSITIONS = [11.2, 13.8, 16.4, 19, 21.6, 24.2, 26.8, 29.4].flatMap(z => [16.5, 20, 23.5].map(x => ({ x, z })));
export const farmExpansionTier = s => (s?.upgrades?.plots ?? 0) >= 4 ? 2 : (s?.upgrades?.plots ?? 0) >= 3 ? 1 : 0;
export const fieldDepth = s => [26, 31, 36][farmExpansionTier(s)];
export const farmPathEnd = s => [30, 34, 39][farmExpansionTier(s)];
// Only the outer leg moves; counter positions and established path bends stay put.
export const extendFarmRoute = (route, s) => {
  const offset = farmPathEnd(s) - 30;
  return route.map(([x,z]) => [x, z >= 28.5 ? z + offset : z]);
};
// The patch is an oval drawn out towards the front as the field grows: its
// ends' centres run from back to front, and every point within rx, rz of that
// line is in it. The mist thins over the same shape (content/ambience.js).
export const PATCH = Object.freeze({ x: 20, rx: 7.6, rz: 5.6, back: 15.1, fronts: Object.freeze([15.1, 19.8, 25]) });
export const patchShape = (plotsTier = 0) => ({ ...PATCH, front: PATCH.fronts[plotsTier >= 4 ? 2 : plotsTier >= 3 ? 1 : 0] });
export function inFarmPatch(x, z, plotsTier = 0) {
  const p = patchShape(plotsTier), nearest = Math.max(p.back, Math.min(p.front, z));
  return ((x - p.x) / p.rx) ** 2 + ((z - nearest) / p.rz) ** 2 < 1;
}
