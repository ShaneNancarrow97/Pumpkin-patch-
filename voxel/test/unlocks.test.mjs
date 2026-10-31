import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

const atLevel = (level) => { const s = M.freshState(); s.coins = 1e7; s.earned = M.LEVELS[level - 1].at; s.progression.claimed = M.LEVELS.slice(0, level).map((l) => l.level); return s; };

test("twenty levels, each further than the last, with real rewards", () => {
  assert.equal(M.LEVELS.length, 20);
  M.LEVELS.forEach((l, i) => { assert.equal(l.level, i + 1); if (i) { assert.ok(l.at > M.LEVELS[i - 1].at); assert.ok(l.rewards.length); } });
  // The tail grows: each step past 12 is longer than the one before it.
  for (let i = 13; i < 20; i++) assert.ok(M.LEVELS[i].at - M.LEVELS[i - 1].at > M.LEVELS[i - 1].at - M.LEVELS[i - 2].at);
  for (const l of M.LEVELS) for (const r of l.rewards) {
    if (r.kind === "decor") assert.ok(M.decorById[r.id], r.id);
    if (r.kind === "costume") assert.ok(M.costumeById[r.id], r.id);
  }
  const gifts = M.LEVELS.flatMap((l) => l.rewards.filter((r) => r.kind !== "coins" && r.kind !== "upgrade").map((r) => r.id));
  assert.equal(new Set(gifts).size, gifts.length, "no level gives the same gift twice");
  const top = atLevel(20); assert.equal(M.patchLevel(top).level, 20); assert.equal(M.patchLevel(top).next, null);
});

test("every gate fits its upgrade's tiers, opens in order, and within the twenty levels", () => {
  const tiers = { farm: (id) => M.UPGRADES.find((u) => u.id === id).max, visitor: (id) => M.VISITOR_UPGRADES.find((u) => u.id === id).costs.length, shop: (id) => M.SHOP_UPGRADES.find((u) => u.id === id) && { capacity: 3, displays: 1, checkout: 2 }[id] };
  for (const [kind, table] of Object.entries(M.UNLOCKS)) {
    const lists = kind === "house" ? { house: table } : table;
    for (const [id, gates] of Object.entries(lists)) {
      if (kind !== "house") assert.equal(gates.length, tiers[kind](id), `${kind} ${id}`);
      else assert.equal(gates.length, M.HOUSE_LEVELS.length - 1);
      gates.forEach((at, i) => { assert.ok(at >= 1 && at <= 20); if (i) assert.ok(at >= gates[i - 1], `${kind} ${id} opens in order`); });
    }
  }
  for (const list of [M.FOYER_TIERS.map((t) => t.patchLevel), M.HAYRIDE_TIERS.map((t) => t.patchLevel), M.COCOA_TIERS.map((t) => t.level)])
    list.forEach((at, i) => { assert.ok(at <= 20); if (i) assert.ok(at > list[i - 1], "each attraction tier opens at a later level"); });
});

test("a tier can't be bought before its level, and can at it", () => {
  const cases = [
    ["farm", "plots", (s) => M.buyUpgrade(s, "plots"), (s, n) => { s.upgrades.plots = n; }],
    ["farm", "storage", (s) => M.buyUpgrade(s, "storage"), (s, n) => { s.upgrades.storage = n; }],
    ["visitor", "crowd", (s) => M.buyVisitorUpgrade(s, "crowd"), (s, n) => { s.visitorUpgrades.crowd = n; s.visitorUpgrades.party = 1; }],
    ["visitor", "appetite", (s) => M.buyVisitorUpgrade(s, "appetite"), (s, n) => { s.visitorUpgrades.appetite = n; }],
    ["shop", "capacity", (s) => M.upgradeShop(s, "capacity"), (s, n) => { s.shop.unlocked = true; s.shop.capacityLevel = n; }],
  ];
  for (const [kind, id, buy, set] of cases) M.UNLOCKS[kind][id].forEach((at, tier) => {
    if (at <= 1) return;
    const early = atLevel(at - 1); set(early, tier); assert.equal(buy(early), false, `${id} tier ${tier + 1} before level ${at}`);
    const ready = atLevel(at); set(ready, tier); assert.ok(buy(ready), `${id} tier ${tier + 1} at level ${at}`);
  });
  M.UNLOCKS.house.forEach((at, level) => {
    const early = atLevel(at - 1); early.house.level = level; assert.equal(M.upgradeHouse(early), false, `house ${level + 1} before level ${at}`);
    const ready = atLevel(at); ready.house.level = level; assert.ok(M.upgradeHouse(ready), `house ${level + 1} at level ${at}`);
  });
});

test("a save that already owns a later tier keeps it", () => {
  const s = M.freshState(); Object.assign(s.upgrades, { plots: 4, storage: 6 }); s.visitorUpgrades.crowd = 7; s.house.level = 3;
  const loaded = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.equal(loaded.upgrades.plots, 4); assert.equal(loaded.upgrades.storage, 6); assert.equal(loaded.visitorUpgrades.crowd, 7); assert.equal(loaded.house.level, 3);
});
