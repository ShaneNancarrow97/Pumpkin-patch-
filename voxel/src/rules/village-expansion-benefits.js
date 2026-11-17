// Read-only benefits are safe to use from stock and arrival rules.
export const expansionRewardOwned = (s, id) => !!s?.village?.expansion && (s.village.expansion.effects?.includes(id) || s.village.expansion.unlocks?.includes(id) || s.village.expansion.rewards?.includes?.(id));
export const expansionEconomy = s => s?.village?.expansion?.economy;
export const stockBatchKey = (variety, born) => `${variety}:${born}`;
export function pumpkinStockLife(s, variety, born, base = 300) {
  const e = expansionEconomy(s), cold = e?.upgrades?.includes('cold-store') ? .2 : 0, wax = e?.treated?.[stockBatchKey(variety, born)] ? .1 : 0;
  return base * (1 + Math.min(.3, cold + wax));
}
