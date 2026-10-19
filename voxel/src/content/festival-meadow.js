// Shared world coordinates: rules, terrain and visitor animation use one plan.
export const MEADOW = { price: 1200, level: 4, width: 54, bounds: { x0: 40, x1: 54, z0: 5, z1: 29 }, counter: [47, 20.6], stand: [47, 17.9], speed: 3, queue: 4 };
export const COCOA_TIERS = [
  { name: "Moonbrew cocoa cart", price: 650, level: 5, capacity: 30, maxPrice: 4 },
  { name: "Lantern cocoa kiosk", price: 1800, level: 6, capacity: 60, maxPrice: 5 },
  { name: "Midnight cocoa pavilion", price: 4800, level: 8, capacity: 100, maxPrice: 6 },
];
export const COCOA_SUPPLY = { unit: 2, batch: 10, courier: 1200, reserve: 100 };
export const MEADOW_EXIT = [[31.8, 10.2], [31.6, 12.6], [35, 10.6], [38, 8.6], [42.5, 6.6], [49, 6.6], [53.6, 6.6], [57, 6.6]];
export const MEADOW_PATHS = [
  MEADOW_EXIT,
  [[33, 24], [49, 24]], [[47, 24], MEADOW.counter], [MEADOW.counter, [49, 20.6], [49, 24]],
];
export const COCOA_APPROACH = [[33, 28.5], [33, 24], [47, 24]];
export const PUMPKIN_APPROACH = [[49, 24], [33, 24], [32.4, 21.6], [30.4, 18.6], [30.2, 15.6], [31.6, 12.6], [31.8, 10.2]];
export const fieldWidth = (s) => s.festival?.meadow ? MEADOW.width : 40;
export function pathDistance(x, z) {
  let best = Infinity;
  for (const points of MEADOW_PATHS) for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz));
  }
  return best;
}
