// Skyla's shop past level 12 (handover 67): room for twelve, a till that ends
// under a second and a half a basket, quicker browsing and gift wrapping, each
// tier gated by level, paid once and kept through a save.
import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";

const late = () => { const s = M.freshState(); s.coins = 1e7; s.earned = M.LEVELS[19].at; s.progression.claimed = M.LEVELS.map((l) => l.level); assert.ok(M.upgradeShop(s, "open")); return s; };

test("every shop upgrade can be bought to its top tier at level 20, and no further", () => {
  const s = late();
  for (const u of M.SHOP_UPGRADES.filter((u) => u.id !== "open")) {
    let bought = 0;
    while (M.upgradeShop(s, u.id)) bought++;
    assert.equal(bought, M.SHOP_MAX_LEVELS[u.id], u.id);
    assert.equal(M.shopUpgradeCost(s, u.id), undefined, `${u.id} is complete`);
  }
  assert.equal(M.SHOP_CAPACITY[s.shop.capacityLevel], 12);
  assert.ok(M.CHECKOUT_SECONDS[s.shop.checkoutLevel] < 1.5, "Skyla is fast late on");
  for (const list of [M.SHOP_CAPACITY, M.BROWSE_SECONDS.map((x) => -x), M.WRAP_SPEND]) list.forEach((v, i) => i && assert.ok(v > list[i - 1]));
  for (let i = 1; i < M.CHECKOUT_SECONDS.length; i++) assert.ok(M.CHECKOUT_SECONDS[i] < M.CHECKOUT_SECONDS[i - 1]);
  const back = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  for (const key of Object.values(M.SHOP_LEVEL_KEYS)) assert.equal(back.shop[key], s.shop[key], key);
});

test("the late tiers wait for their levels", () => {
  const s = M.freshState(); s.coins = 1e7; assert.ok(M.upgradeShop(s, "open"));
  assert.equal(M.upgradeShop(s, "wrap"), false, "gift wrapping opens at level 10");
  s.earned = M.LEVELS[9].at; s.progression.claimed = M.LEVELS.slice(0, 10).map((l) => l.level);
  assert.equal(M.upgradeShop(s, "wrap"), true);
});

test("gift wrapping raises a new shopper's purse, and quicker browsing shortens the choosing", () => {
  const s = late(), plain = M.freshState(); plain.shop.unlocked = true;
  s.shop.wrapLevel = 3; s.shop.browseLevel = 3; s.shop.arrivalTimer = 0; plain.shop.arrivalTimer = 0;
  M.updateShop(s, .01, []); M.updateShop(plain, .01, []);
  const a = s.shop.customers[0], b = plain.shop.customers[0];
  assert.ok(a && b); assert.ok(a.originalBudget >= Math.round(b.originalBudget * 1.15), `${a.originalBudget} vs ${b.originalBudget}`);
  a.remaining = 0; M.updateShop(s, .01, []); assert.equal(a.phase, "browsing"); assert.ok(a.remaining <= M.BROWSE_SECONDS[3] + 1e-9);
});
