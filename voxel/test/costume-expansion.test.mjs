import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { costumeCatalog as originalCatalogue, costumeById as originalById } from "../../src/core/costume-model.mjs";
import { EXTRA_COSTUMES } from "../src/costume-expansion.js";
import { COSTUME_SHEETS } from "../src/costume-sprite-meta.js";

const ids = ["shane-chucky", "natalie-tiffany", "natalie-freddy", "shane-jason"];

test("four voxel costumes extend the wardrobe without mutating the main game", () => {
  assert.deepEqual(EXTRA_COSTUMES.map((item) => item.id), ids);
  assert.equal(M.costumeCatalog.length, originalCatalogue.length + 5);
  assert.notEqual(M.costumeCatalog, originalCatalogue);
  for (const id of ids) {
    assert.ok(!originalCatalogue.some((item) => item.id === id));
    assert.ok(!Object.hasOwn(originalById, id));
    assert.equal(M.costumeById[id].collection, "90s-horror");
  }
  const s = M.freshState(); s.coins = 500;
  assert.ok(M.buyCostume(s, "natalie-witch"));
  assert.equal(s.coins, 420);
  assert.ok(M.wearCostume(s, "natalie-witch"));
  assert.equal(s.wardrobe.equipped.natalie, "natalie-witch");
});

for (const item of EXTRA_COSTUMES) {
  test(`${item.id}: purchase, wear and restore use the existing wardrobe rules`, () => {
    const s = M.freshState(); s.coins = 10000;
    assert.equal(M.wearCostume(s, item.id), false, "unowned costume cannot be worn");
    assert.ok(M.buyCostume(s, item.id));
    assert.equal(s.coins, 10000 - item.price);
    assert.equal(s.wardrobe.equipped[item.character], `${item.character}-base`, "purchase alone does not change clothes");
    assert.equal(M.buyCostume(s, item.id), false, "no duplicate purchase");
    assert.ok(M.wearCostume(s, item.id));
    assert.equal(M.wearCostume(s, item.id), false, "already worn");
    assert.equal(M.activeLook(s, item.character), undefined, "no recolour over costume");
    const loaded = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
    assert.equal(loaded.wardrobe.equipped[item.character], item.id);
    assert.equal(loaded.wardrobe.owned.filter((id) => id === item.id).length, 1);
    assert.equal(loaded.coins, s.coins);
    assert.ok(M.wearCostume(loaded, `${item.character}-base`), "original clothes still work");
  });
}

test("extra costumes respect poor balances and tea breaks", () => {
  for (const item of EXTRA_COSTUMES) {
    for (const coins of [0, item.price - 1, NaN, Infinity, -1]) {
      const s = M.freshState(); s.coins = coins;
      assert.equal(M.buyCostume(s, item.id), false);
      assert.ok(!s.wardrobe.owned.includes(item.id));
      assert.ok(Object.is(s.coins, coins), "rejected purchase leaves balance alone");
    }
    const s = M.freshState(); s.coins = item.price; s.paused = true;
    assert.equal(M.buyCostume(s, item.id), false);
    s.paused = false;
    assert.ok(M.buyCostume(s, item.id));
    assert.equal(s.coins, 0, "exact balance is accepted");
    s.paused = true;
    assert.equal(M.wearCostume(s, item.id), false);
    assert.equal(s.wardrobe.equipped[item.character], `${item.character}-base`);
  }
});

test("wardrobe restoration removes unknown IDs, duplicates and invalid equipment", () => {
  for (const raw of [null, [], 42, "wardrobe", {}, { owned: "shane-jason", equipped: null }]) {
    assert.deepEqual(M.restoreWardrobe(raw), M.freshWardrobe());
  }
  const wardrobe = M.restoreWardrobe({
    owned: ["shane-jason", "shane-jason", "natalie-tiffany", "natalie-witch", "unknown", "__proto__", null],
    equipped: { natalie: "shane-jason", shane: "natalie-tiffany" },
  });
  assert.equal(wardrobe.owned.length, new Set(wardrobe.owned).size);
  assert.ok(wardrobe.owned.includes("natalie-witch"));
  assert.ok(wardrobe.owned.includes("shane-jason"));
  assert.ok(!wardrobe.owned.includes("unknown"));
  assert.ok(!wardrobe.owned.includes("__proto__"));
  assert.deepEqual(wardrobe.equipped, M.freshWardrobe().equipped, "one person's costume cannot equip on the other");
  assert.deepEqual(M.restoreWardrobe({ owned: [], equipped: { natalie: "natalie-freddy", shane: "shane-chucky" } }).equipped, M.freshWardrobe().equipped, "unowned equipment is discarded");
  const valid = M.restoreWardrobe({ owned: ids, equipped: { natalie: "natalie-tiffany", shane: "shane-chucky" } });
  assert.deepEqual(valid.equipped, { natalie: "natalie-tiffany", shane: "shane-chucky" });
});

test("each offered costume has a complete anchored idle and walk atlas", () => {
  assert.deepEqual(Object.keys(COSTUME_SHEETS), ids);
  for (const meta of Object.values(COSTUME_SHEETS)) {
    assert.equal(meta.rows, 320, "same world scale as original figures");
    assert.equal(meta.idle.length, 3);
    assert.equal(meta.walk.length, 6);
    for (const f of [...meta.idle, ...meta.walk]) {
      assert.ok(f.w > 40 && f.h > 200);
      assert.ok(f.x >= 0 && f.y >= 0 && f.x + f.w <= meta.w && f.y + f.h <= meta.h);
      assert.ok(f.ax > 0 && f.ax < f.w);
      assert.equal(f.ay, f.h - 4, "feet share a floor with four pixels of clear padding");
    }
  }
});
