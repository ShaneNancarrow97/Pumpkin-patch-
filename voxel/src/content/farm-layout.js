// Stable plot IDs and shared purchased-land bounds; no renderer dependencies.
export const MAX_PLOTS = 24;
export const PLOT_COUNTS = [6, 9, 12, 18, 24];
// The lower yard (the patch and everything in front of it, down to the gates)
// sits DROP further forward than the first farm, leaving room for the lantern
// walk between the buildings and the patch (content/hollow-house.js HOLLOW_LINK).
// Every lower-yard position below, in world.js and in the routes adds it.
export const DROP = 3;
export const PLOT_POSITIONS = [11.2, 13.8, 16.4, 19, 21.6, 24.2, 26.8, 29.4].flatMap(z => [16.5, 20, 23.5].map(x => ({ x, z: z + DROP })));
export const farmExpansionTier = s => (s?.upgrades?.plots ?? 0) >= 4 ? 2 : (s?.upgrades?.plots ?? 0) >= 3 ? 1 : 0;
export const fieldDepth = s => [26, 31, 36][farmExpansionTier(s)] + DROP;
// Where the gates at the bottom of the lanes are, and the bend above them.
export const GATE_Z = 30 + DROP, LANE_BEND_Z = 28.5 + DROP;
// The hedge arch in the back fence: the way home to Shane and Natalie's garden.
export const HEDGE_ARCH = Object.freeze({ x: 20, z: 3 });
export const farmPathEnd = s => [30, 34, 39][farmExpansionTier(s)] + DROP;
// The guests' path from the lane's gate up to Skyla's counter, and from the
// counter out to the road (world.js lays them; rules/cleanliness.js walks them).
export const ROUTE_IN = [[33, 28.5], [33, 24], [32.4, 21.6], [30.4, 18.6], [30.2, 15.6], [31.6, 12.6]].map(([x, z]) => [x, z + DROP]).concat([[31.8, 10.2]]);
export const ROUTE_OUT = [[31.8, 10.2], [31.6, 12.6], [35, 10.6], [38, 8.6], [42.5, 6.6]];
// Only the outer leg moves; counter positions and established path bends stay put.
export const extendFarmRoute = (route, s) => {
  const offset = farmPathEnd(s) - GATE_Z;
  return route.map(([x,z]) => [x, z >= LANE_BEND_Z ? z + offset : z]);
};
// Skyla's counter, where the path ends. Guests stand along it a place apart, the
// first in the middle, then one either side in turn (0, 1, -1, 2, -2 ...). The
// scene draws a guest at the counter at their place, so every walk to or from
// the counter starts or ends there too, never at the middle.
export const COUNTER_FRONT = [31.8, 10.2], COUNTER_GAP = 1;
export const counterSide = (spot) => (spot % 2 ? 1 : -1) * Math.ceil(spot / 2);
export const counterPlace = (spot) => [COUNTER_FRONT[0] + counterSide(Number.isSafeInteger(spot) && spot > 0 ? spot : 0) * COUNTER_GAP, COUNTER_FRONT[1]];
// The patch is an oval drawn out towards the front as the field grows: its
// ends' centres run from back to front, and every point within rx, rz of that
// line is in it. The mist thins over the same shape (content/ambience.js).
export const PATCH = Object.freeze({ x: 20, rx: 7.6, rz: 5.6, back: 15.1 + DROP, fronts: Object.freeze([15.1, 19.8, 25].map((z) => z + DROP)) });
export const patchShape = (plotsTier = 0) => ({ ...PATCH, front: PATCH.fronts[plotsTier >= 4 ? 2 : plotsTier >= 3 ? 1 : 0] });
export function inFarmPatch(x, z, plotsTier = 0) {
  const p = patchShape(plotsTier), nearest = Math.max(p.back, Math.min(p.front, z));
  return ((x - p.x) / p.rx) ** 2 + ((z - nearest) / p.rz) ** 2 < 1;
}
