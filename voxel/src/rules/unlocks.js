// The patch level each upgrade tier opens at, so the later tiers arrive with
// the later levels (up to 20) instead of all being bought in the first few
// hours. Each list is by tier, the first tier first; a tier not listed is open
// from the start. The Hollow House, the hayride, Sandy's stand, the food truck
// and the visitor events keep their own levels in their content files.
import { patchLevel } from "./levels.js";

export const UNLOCKS = Object.freeze({
  farm: { plots: [1, 1, 9, 13], storage: [1, 1, 1, 3, 12, 15], cart: [1, 6, 14], sign: [1, 1, 1, 5, 10] },
  visitor: { appetite: [1, 4, 7, 11, 14, 18], crowd: [1, 5, 8, 12, 15, 17, 19], party: [1, 5, 11, 14, 17], lights: [1, 3, 7, 13], loyalty: [1, 15] },
  shop: { capacity: [1, 6, 13], checkout: [1, 12] },
  // To move on from each house level: to the crooked cottage, the manor, the haven.
  house: [3, 8, 14],
});
export const unlockLevel = (kind, id, tier) => (kind === "house" ? UNLOCKS.house[tier] : UNLOCKS[kind]?.[id]?.[tier]) ?? 1;
// Whether the tier after `tier` bought ones is open yet.
export const tierOpen = (s, kind, id, tier) => patchLevel(s).level >= unlockLevel(kind, id, tier);
