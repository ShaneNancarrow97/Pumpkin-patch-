// Compatibility exports for older menu adapters. All purchases now activate
// with one ordinary tap/click/confirm; no listeners, timers or hold hints.
export const HOLD_TO_BUY_MS = 0;
export const buyButton = el => {
  const button=el?.closest?.(".purchase-button");
  return button?.textContent.includes("£") ? button : null;
};
export function createHoldToBuy() {
  return { press:()=>false, release(){}, cancel(){}, active:false, holding:null };
}
