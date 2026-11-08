// All ownership stays in village.effects: older villages need no new saved shape.
import { STORE_BASE, MATERIAL_BY_ID } from "../content/village.js";
import { VILLAGE_UPGRADES, VILLAGE_UPGRADE_BY_ID } from "../content/village-upgrades.js";
import { decorById, ownedCopies } from "./house.js";
import { QUEST_BY_ID } from "../content/village-quests.js";

export { VILLAGE_UPGRADES };
// The same rate scales production, visitors, sales and perishable farm clocks.
export const VILLAGE_FARM_BASE_RATE = .025;
export function villageFarmRate(s) {
  return VILLAGE_UPGRADES.reduce((rate, u) => u.farmRate && villageUpgradeOwned(s, u.id) ? Math.max(rate, u.farmRate) : rate, VILLAGE_FARM_BASE_RATE);
}
const definition = id => typeof id === "string" && Object.hasOwn(VILLAGE_UPGRADE_BY_ID, id) ? VILLAGE_UPGRADE_BY_ID[id] : null;
export const villageUpgradeOwned = (s, id) => !!definition(id) && !!s.village?.effects?.includes(definition(id).effect);
// Capacity also accepts a village record while restoreVillage is assembling it.
export function villageMaterialCapacity(s) {
  const v = s.village ?? s;
  return VILLAGE_UPGRADES.reduce((n, u) => u.capacity && v.effects?.includes(u.effect) ? Math.max(n, u.capacity) : n, STORE_BASE);
}
export function villageGatheringYield(s, material) {
  const m = MATERIAL_BY_ID[material];
  return m ? m.yield + (["logs", "stone"].includes(material) && villageUpgradeOwned(s, "gathering-straps") ? 1 : 0) : 0;
}
export function villageGatheringWait(s, material) {
  const m = MATERIAL_BY_ID[material];
  return m ? Math.round(m.respawn * (m.district === "green" && villageUpgradeOwned(s, "gathering-kit") ? .85 : 1)) : 0;
}
// The displayed quote and transaction use the same requirements, including a
// previous purchase and completed restoration, so stale buttons cannot skip them.
export function villageUpgradeInfo(s, id) {
  const u = definition(id); if (!u) return null;
  const owned = villageUpgradeOwned(s, id), open = !!s.village?.invited && !!s.village.unlocks?.includes("stall");
  const storyReady = !!s.village?.quests?.[u.needs]?.done, previousReady = !u.previous || villageUpgradeOwned(s, u.previous);
  const materials = Object.entries(u.materials).map(([id, need]) => ({ id, name: MATERIAL_BY_ID[id].name, have: s.village?.materials?.[id] ?? 0, need }));
  const affordable = s.coins >= u.coins && materials.every((m) => m.have >= m.need), unlocked = open && storyReady && previousReady;
  const reason = owned ? "Made for you" : !open ? "Reopen Rowan's stall" : !storyReady ? `Finish ${QUEST_BY_ID[u.needs].title}` : !previousReady ? `Buy ${VILLAGE_UPGRADE_BY_ID[u.previous].name.toLowerCase()} first` : !affordable ? "Gather the materials and coins below" : "Ready to make";
  return { ...u, materials, owned, unlocked, affordable, canBuy: !s.paused && !owned && unlocked && affordable, reason };
}
export const villageUpgradeStock = (s) => VILLAGE_UPGRADES.map((u) => villageUpgradeInfo(s, u.id));
export function buyVillageUpgrade(s, id) {
  const info = villageUpgradeInfo(s, id); if (!info?.canBuy) return false;
  s.coins -= info.coins;
  for (const m of info.materials) s.village.materials[m.id] -= m.need;
  s.village.effects.push(info.effect);
  // Bundle pieces are ordinary inventory copies: placement and saving use the existing house rules.
  for (const id of info.homeItems ?? []) {
    if (!decorById[id]) continue;
    const copies = ownedCopies(s, id);
    if (!s.house.owned.includes(id)) s.house.owned.push(id);
    s.house.copies ??= {}; s.house.copies[id] = copies + 1;
  }
  return true;
}
