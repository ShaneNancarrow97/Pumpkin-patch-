// The receiving lane is independent of the public path at z=6.6. Dimensions
// include wheels, crates and the whole swept cart, rather than just its centre.
export const COOKING_SITE = Object.freeze({
  bounds: Object.freeze({ x0: 37.8, x1: 46.1, z0: .8, z1: 5.4 }),
  truck: Object.freeze({ x: 42.75, z: 2.8, w: 4.5, d: 2.6 }),
  marker: Object.freeze({ x: 42.3, z: 4.7 }),
  focus: Object.freeze({ x: 41.8, z: 3.2, zoom: 3.2 }),
  receiver: Object.freeze({ x: 39.65, z: 4.45 }),
  gate: Object.freeze({ x0: 37.8, x1: 39.8, z0: -.8, z1: .8 }),
});
export const COOKING_SERVICE_ROUTE = Object.freeze({
  x: 38.8, startZ: -6, endZ: 4.2, halfWidth: .72,
  travelSeconds: 12, unloadSeconds: 6,
  bounds: Object.freeze({ x0: 38.08, x1: 39.52, z0: -6.9, z1: 4.9 }),
});
const clamp = (v, a, b) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
export function cookingDeliveryPose(stateOrOrder) {
  const orders = stateOrOrder?.kitchen?.orders;
  const order = orders ? orders.find(o => o.phase === 'travelling' || o.phase === 'unloading') : stateOrOrder;
  const r = COOKING_SERVICE_ROUTE;
  const visible = !!order && ['travelling', 'unloading'].includes(order.phase);
  const progress = order?.phase === 'travelling' ? 1 - clamp(Number(order.remaining), 0, r.travelSeconds) / r.travelSeconds : order?.phase === 'unloading' ? 1 : 0;
  return { visible, x: r.x, z: r.startZ + (r.endZ - r.startZ) * progress,
    yaw: 0, progress, distance: (r.endZ - r.startZ) * progress,
    unloading: visible && order.phase === 'unloading',
    unloadProgress: order?.phase === 'unloading' ? 1 - clamp(Number(order.remaining), 0, r.unloadSeconds) / r.unloadSeconds : 0,
    orderId: visible ? order.id : null };
}
