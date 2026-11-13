// Read-only receipts and level gates. Cards describe a purchase opportunity;
// the real rules still decide whether its other requirements have been met.
import * as M from "../model.js";

const cash = n => "£" + Math.round(n).toLocaleString("en-GB");
const tierLabel = n => `Tier ${n + 1}`;

export function levelGiftCard(reward, { preview = false, state, level } = {}) {
  const r = { ...reward };
  if (preview && state) {
    if (r.kind === "decor" && state.house.owned.includes(r.id) || r.kind === "costume" && state.wardrobe.owned.includes(r.id)) r.duplicate = true;
    if (r.kind === "upgrade" && (state.upgrades[r.id] >= r.max || M.unlockLevel("farm", r.id, state.upgrades[r.id]) > level)) r.duplicate = true;
  }
  const base = { kind: r.kind, id: r.id, origin: "gift", badge: preview ? "Level reward" : "Added to your patch", where: "Yours to keep" };
  if (r.duplicate) return { ...base, kind: "coins", title: cash(r.kind === "upgrade" ? 100 : 50) + " bonus coins", text: "This treasure is already yours, so its reward becomes extra coins.", where: preview ? "Added when you reach this level" : "Added to your purse", duplicate: true };
  if (r.kind === "coins") return { ...base, title: cash(r.amount) + " bonus coins", text: "A little extra to put towards your next spooky idea.", where: preview ? "Added when you reach this level" : "Added to your purse" };
  if (r.kind === "decor") return { ...base, title: M.decorById[r.id]?.name ?? r.id, text: "A free furnishing for your haunted home.", where: "Home · Decorate" };
  if (r.kind === "costume") return { ...base, title: M.costumeById[r.id]?.name ?? r.id, text: "A free outfit to keep in the wardrobe.", where: "Wardrobe · Choose an outfit" };
  return { ...base, kind: "upgrade", title: r.name ?? "A farm improvement", text: preview ? "One free upgrade tier, or bonus coins if that tier is already yours." : "Your free upgrade tier is already active.", where: "Farm upgrades", badge: preview ? "Level reward" : "Already active" };
}

export function levelUnlockCards(level, state) {
  const cards = [], add = (key, kind, title, text, where, price, note = "Other requirements still apply") => cards.push({ key, kind, title, text, where, price, note, origin: "unlock", badge: "Level gate opened" });
  const tables = { farm: M.UPGRADES, visitor: M.VISITOR_UPGRADES, shop: M.SHOP_UPGRADES };
  for (const [family, items] of Object.entries(tables)) for (const [id, gates] of Object.entries(M.UNLOCKS[family])) gates.forEach((at, tier) => {
    if (at !== level || at <= 1) return;
    const u = items.find(item => item.id === id); if (!u) return;
    const price = family === "farm" ? M.upgradeCost({ ...state, upgrades: { ...state.upgrades, [id]: tier } }, id) : family === "visitor" ? u.costs[tier] : M.shopUpgradeCost({ ...state, shop: { ...state.shop, [M.SHOP_LEVEL_KEYS[id]]: tier } }, id);
    add(`${family}:${id}:${tier}`, "upgrade", u.name, u.text, `${family === "farm" ? "Farm upgrades" : family === "visitor" ? "Visitor upgrades" : "Skyla’s shop"} · ${tierLabel(tier)}`, price, "Purchase after the earlier tiers");
  });
  M.UNLOCKS.house.forEach((at, tier) => { if (at === level) add(`house:${tier}`, "area", M.HOUSE_LEVELS[tier + 1].name, M.HOUSE_LEVELS[tier].text, "Home · House upgrade", M.HOUSE_LEVELS[tier].cost, "A paid upgrade to your existing house"); });
  for (const u of M.HELPER_UPGRADES) u.levels.forEach((at, tier) => { if (at === level && at > 1) add(`helper:${u.id}:${tier}`, "upgrade", u.name, u.text, `Helping hands · ${tierLabel(tier)}`, u.costs[tier], "Buy separately for Shane or Natalie"); });
  for (const u of M.BOOST_UPGRADES) u.levels.forEach((at, tier) => { if (at === level && at > 1) add(`boost:${u.id}:${tier}`, "upgrade", u.name, u.text, `Pumpkin boost · ${tierLabel(tier)}`, u.costs[tier], "Purchase after the earlier tiers"); });
  if (M.VILLAGE_LEVEL === level) add("village", "area", "Mothlight Village", "A new invitation leads to neighbours, materials and stories beyond the farm.", "Village · Follow the public road", undefined, "Follow Elowen’s invitation");
  if (M.MEADOW.level === level) add("meadow", "area", "Moonbrew Meadow", "Make room for Sandy’s cocoa and places for neighbours to linger.", "Sandy’s plot", M.MEADOW.price, "Purchase the meadow before its stall");
  for (const t of M.COCOA_TIERS) if (t.level === level) add(`cocoa:${t.level}`, "upgrade", t.name, `Capacity for ${t.capacity} cocoa drinks, with new room to improve service.`, "Sandy’s cocoa", t.price, "Requires the plot and previous stall tier");
  if (M.HOLLOW_PROPERTY.level === level) add("hollow", "area", M.HOLLOW_PROPERTY.name, "Purchase the derelict house, then restore it before selling maze tickets.", "Attractions · The Hollow House", M.HOLLOW_PROPERTY.price, `${cash(M.HOLLOW_PROPERTY.restorationCost)} restoration also required`);
  M.FOYER_TIERS.forEach((t, i) => { if (i && t.patchLevel === level) add(`foyer:${t.level}`, "upgrade", t.name, `A foyer for ${t.capacity} waiting guests and more room to decorate.`, "The Hollow House · Foyer", t.cost, "Requires the attraction and previous tier"); });
  if (M.HAYRIDE_PROPERTY.level === level) add("hayride", "area", M.HAYRIDE_PROPERTY.name, "A woodland attraction with paid boarding and an owner’s ride-along.", "Attractions · Hollow Hayride", M.HAYRIDE_PROPERTY.price, "Purchase and prepare the attraction");
  M.HAYRIDE_TIERS.forEach((t, i) => { if (i && t.patchLevel === level) add(`hayride:${t.level}`, "upgrade", t.name, `${t.seats} seats and a queue for ${t.queueCapacity} guests.`, "Hollow Hayride · Upgrade", t.cost, "Requires the attraction and previous tier"); });
  for (const u of M.HAYRIDE_OPERATIONS) if (u.level === level) add(`hayride-operation:${u.id}`, "upgrade", u.name, u.text, "Hollow Hayride · Operations", u.costs[0], "The attraction’s tier requirements still apply");
  for (const u of M.HAYRIDE_ROUTE_UPGRADES) if (u.patchLevel === level) add(`hayride-route:${u.level}`, "area", u.name, u.text, "Hollow Hayride · Route", u.cost, "The attraction’s tier requirements still apply");
  if (M.COOKING.level === level) add("kitchen", "area", "Maisie’s Midnight Kitchen", "Open the food truck, order ingredients and turn your harvest into meals.", "Maisie’s food truck", M.COOKING.price, "Purchase the truck before using its kitchen");
  for (const u of M.KITCHEN_UPGRADES) if (u.level === level) add(`kitchen:${u.id}`, "upgrade", u.name, u.text, "Maisie’s kitchen · Improvements", u.costs[0], "Requires the kitchen and any earlier tiers");
  for (const r of M.RECIPES) if (r.level === level) add(`recipe:${r.id}`, "recipe", r.name, r.text, "Kitchen · Recipe research", r.research, "Ingredients and cooking equipment still needed");
  for (const u of M.VISITOR_EVENT_UPGRADES) if (u.level === level) add(`event:${u.id}`, "upgrade", u.name, u.text, "Visitor upgrades · Occasions", u.costs[0], "A paid visitor upgrade");
  return cards;
}

export function levelReceiptCards(level, state, preview = false) {
  const rewards = preview ? level.rewards : state.progression.receipts[level.level] ?? level.rewards;
  return [...rewards.map((r, i) => ({ key: `gift:${i}`, ...levelGiftCard(r, { preview, state, level: level.level }) })), ...levelUnlockCards(level.level, state)];
}

export function levelRequirementView(state) {
  const current = M.patchLevel(state), next = current.next;
  return { current, next, earnings: { have: current.xp, need: next?.at ?? current.at, met: !next || current.xp >= next.at }, home: next ? M.homeRequirements(state, next.level) : [] };
}

export function createRewardCarousel(length) {
  let index = 0;
  return { select(value) { index = Math.max(0, Math.min(Math.max(0, length - 1), Math.trunc(value) || 0)); return index; }, get index() { return index; }, get length() { return length; } };
}
