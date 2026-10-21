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
export function inFarmPatch(x, z, plotsTier = 0) {
  const tier = plotsTier >= 4 ? 2 : plotsTier >= 3 ? 1 : 0;
  const back = 15.1, front = [15.1, 19.8, 25][tier], nearest = Math.max(back, Math.min(front, z));
  return ((x - 20) / 7.6) ** 2 + ((z - nearest) / 5.6) ** 2 < 1;
}
