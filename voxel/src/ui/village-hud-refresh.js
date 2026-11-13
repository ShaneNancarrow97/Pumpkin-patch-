// Coins, quest copy and location labels need ten updates a second, while input,
// gathering and the animated world keep their own per-frame cadence. Explicit
// actions call rendered() so the next heartbeat does not repeat their DOM work.
export const VILLAGE_HUD_INTERVAL_MS = 100;
export function createVillageHudRefresh() {
  let last = -Infinity;
  return {
    due(now) { return now < last || now - last >= VILLAGE_HUD_INTERVAL_MS; },
    rendered(now) { last = now; },
  };
}
