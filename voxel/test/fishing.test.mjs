import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { gardenGeometry, gardenTargets } from "../src/play-ways.js";
import { playerPointFree } from "../src/player-control.js";

// A farm with a house at level 1, the kitchen bought, and a lake placed.
function lakeFarm({ kitchen = true, coins = 100000 } = {}) {
  const s = M.freshState();
  s.coins = 100000; s.house.level = 1; s.introSeen = true;
  if (kitchen) s.kitchen.purchased = true;
  assert.ok(M.buyEstateDecor(s, "fishing-lake"));
  assert.ok(M.placeEstateDecor(s, "fishing-lake", -8, 8.8, 180), "the lake fits in the front of the first garden, its jetty towards the house");
  s.coins = coins;
  return s;
}
const run = (s, seconds, step = .25) => { for (let t = 0; t < seconds; t += step) M.update(s, step); };

test("one lake per garden, from house level 1", () => {
  const s = M.freshState(); s.coins = 100000;
  assert.equal(M.buyEstateDecor(s, "fishing-lake"), false, "the house must be level 1");
  s.house.level = 1;
  assert.ok(M.buyEstateDecor(s, "fishing-lake"));
  assert.equal(M.buyEstateDecor(s, "fishing-lake"), false, "a second lake can't be bought");
  assert.equal(M.placeEstateDecor(s, "fishing-lake", -8, 8.8, 0), false, "not with its jetty against the fence");
  assert.ok(M.placeEstateDecor(s, "fishing-lake", -8, 8.8, 180));
  assert.equal(M.buyEstateDecor(s, "fishing-lake"), false, "nor once the first is placed");
  assert.equal(M.fishingLake(s).id, "fishing-lake");
});

test("a cast waits for a bite, a strike in the window lands a fish into the pantry", () => {
  const s = lakeFarm();
  assert.equal(M.castLine(M.freshState()), false, "no lake, no fishing");
  const line = M.castLine(s); assert.equal(line.phase, "wait");
  const [lo, hi] = M.currentBait(s).bite; assert.ok(line.biteAt >= lo && line.biteAt <= hi);
  run(s, line.biteAt + .1, .05);
  assert.equal(s.fishing.line.phase, "bite");
  const before = M.pantryCount(s), got = M.strikeLine(s);
  assert.ok(got && got.id && M.FISH_BY_ID[got.id].rod > 0);
  assert.equal(s.fishing.line.phase, "caught"); assert.equal(s.fishing.caught, 1); assert.equal(s.fishing.log[got.id].n, 1);
  const f = M.FISH_BY_ID[got.id];
  if (f.gives) assert.equal(M.pantryCount(s), before + Object.values(f.gives).reduce((a, b) => a + b, 0));
  assert.ok(got.kg >= f.kg[0] && got.kg <= f.kg[1]);
});

test("too early scares it off, too late it gets away", () => {
  const s = lakeFarm();
  M.castLine(s); assert.deepEqual(M.strikeLine(s), { early: true }); assert.equal(s.fishing.line.phase, "early"); assert.equal(s.fishing.caught, 0);
  const line = M.castLine(s); run(s, line.biteAt + M.currentRod(s).window + .5, .05);
  assert.equal(s.fishing.line.phase, "gone"); assert.equal(M.strikeLine(s), false); assert.equal(s.fishing.caught, 0);
  M.reelIn(s); assert.equal(s.fishing.line, null);
});

test("better gear opens the window, speeds the bites and brings rarer fish", () => {
  const s = lakeFarm(), rare = (src) => M.fishOdds(s, src).filter((e) => ["rare", "legendary"].includes(e.fish.rarity)).reduce((n, e) => n + e.chance, 0);
  const base = rare("rod"), window = M.currentRod(s).window, bite = M.currentBait(s).bite[1];
  assert.ok(Math.abs(M.fishOdds(s, "rod").reduce((n, e) => n + e.chance, 0) - 1) < 1e-9);
  s.earned = M.LEVELS[13].at; s.progression.claimed = M.LEVELS.slice(0, 14).map((l) => l.level);
  for (let i = 0; i < 3; i++) { assert.ok(M.buyRod(s)); assert.ok(M.buyBait(s)); }
  assert.ok(rare("rod") > base * 2, "rare and legendary fish at least twice as likely");
  assert.ok(M.currentRod(s).window > window && M.currentBait(s).bite[1] < bite);
  assert.ok(!M.fishOdds(s, "rod").some((e) => e.fish.junk), "the enchanted rod never hooks a boot");
  assert.equal(M.buyRod(s), false); assert.equal(M.buyBait(s), false);
});

test("gear waits for its level and the lake, and costs its price", () => {
  const s = lakeFarm({ coins: 400 });
  assert.equal(M.nextRod(s).cost, 350); assert.ok(M.buyRod(s)); assert.equal(s.coins, 50);
  assert.equal(M.buyBait(s), false, "can't afford worms");
  s.coins = 100000; assert.ok(M.nextRod(s).locked, "the moonlight rod waits for level 8"); assert.equal(M.buyRod(s), false);
  const t = M.freshState(); t.coins = 100000; assert.equal(M.buyTrap(t), false, "no traps without a lake");
});

test("traps fill while the farm runs, stop when full, and empty into the pantry", () => {
  const s = lakeFarm();
  assert.equal(M.nextTrap(s).cost, 240);
  for (let i = 0; i < 4; i++) assert.ok(M.buyTrap(s));
  assert.equal(M.buyTrap(s), false, "four traps at most"); assert.equal(M.trapCount(s), 4);
  const tier = M.currentTraps(s);
  run(s, tier.every * 2 + 1, 1);
  assert.equal(M.trapCatches(s), 8, "each trap caught twice");
  run(s, tier.every * 10, 2);
  assert.equal(M.trapCatches(s), 4 * tier.holds, "full traps stop filling");
  const before = s.fishing.caught, got = M.emptyTraps(s);
  assert.equal(got.catches.length, 4 * tier.holds); assert.equal(M.trapCatches(s), 0); assert.equal(s.fishing.caught, before + 4 * tier.holds);
  assert.ok(got.catches.every((c) => M.FISH_BY_ID[c.id].trap > 0), "only trap catches");
  assert.ok((got.pantry.crayfish ?? 0) > 0, "crayfish go to the pantry");
});

test("without a kitchen the catch sells at the market; curiosities always sell", () => {
  const s = lakeFarm({ kitchen: false }), coins = s.coins;
  for (let i = 0; i < 2; i++) M.buyTrap(s);
  const spent = coins - s.coins; run(s, M.currentTraps(s).every * 4, 2);
  const got = M.emptyTraps(s);
  assert.deepEqual(got.pantry, {}); assert.ok(got.coins > 0); assert.equal(s.coins, coins - spent + got.coins);
  assert.equal(s.fishing.earned, got.coins);
});

test("traps only fill while the lake is in the garden", () => {
  const s = lakeFarm(); M.buyTrap(s);
  M.storeEstateDecor(s, M.fishingLake(s).instance);
  run(s, 600, 5); assert.equal(M.trapCatches(s), 0);
  assert.equal(M.castLine(s), false); assert.equal(M.emptyTraps(s), false);
});

test("the same farm always catches the same fish", () => {
  const catches = () => { const s = lakeFarm(); const out = []; for (let i = 0; i < 12; i++) { const l = M.castLine(s); run(s, l.biteAt + .05, .05); out.push(M.strikeLine(s).id); } return out; };
  assert.deepEqual(catches(), catches());
});

test("the lake survives a save, without a line in the water", () => {
  const s = lakeFarm(); M.buyTrap(s); M.buyRod(s);
  run(s, M.currentTraps(s).every + 1, 1);
  const l = M.castLine(s); run(s, l.biteAt + .05, .05); M.strikeLine(s); M.castLine(s);
  const back = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
  assert.equal(back.fishing.line, null); assert.equal(back.fishing.rod, 1);
  assert.deepEqual(back.fishing.traps.map((t) => t.catch), s.fishing.traps.map((t) => t.catch));
  assert.deepEqual(back.fishing.log, s.fishing.log); assert.equal(back.fishing.seed, s.fishing.seed);
  assert.ok(M.fishingLake(back));
  // Junk is turned away: unknown fish, rod-only fish in a trap, too many traps.
  const odd = M.restoreFishing({ rod: 99, traps: Array.from({ length: 9 }, () => ({ t: -5, catch: [{ id: "witch-pike", kg: 4 }, { id: "nope" }, { id: "crayfish", kg: 1e9 }] })), log: { "golden-koi": { n: 2, best: 3 }, nope: { n: 1 } }, seed: "x" });
  assert.equal(odd.rod, M.RODS.length - 1); assert.equal(odd.traps.length, 4);
  assert.deepEqual(odd.traps[0], { t: 0, catch: [{ id: "crayfish", kg: 50 }] });
  assert.deepEqual(odd.log, { "golden-koi": { n: 2, best: 3 } }); assert.equal(odd.seed, M.freshFishing().seed);
  assert.deepEqual(M.restoreFishing(null), M.freshFishing());
});

test("the lake's plan lies inside its footprint, with the stand just ashore", () => {
  const lake = M.ESTATE_DECOR_BY_ID["fishing-lake"];
  assert.equal(lake.w, M.LAKE.w); assert.equal(lake.d, M.LAKE.d);
  for (const p of [M.LAKE.bobber, ...M.LAKE.traps]) assert.ok(Math.abs(p.x) < lake.w / 2 && Math.abs(p.z) < lake.d / 2);
  const j = M.LAKE.jetty, st = M.LAKE.stand;
  assert.ok(Math.abs(st.x - j.x) < j.w / 2 - .25 && st.z > j.z0 && st.z < j.z1, "the owner stands on the jetty, feet clear of its edges");
  assert.ok(j.z1 >= lake.d / 2 - .01, "the jetty reaches the shore");
  const p = { x: 2, z: 3, rotation: 90 }, q = M.lakePoint(p, 1, 0);
  assert.ok(Math.abs(q.x - 2) < 1e-9 && Math.abs(q.z - 2) < 1e-9, "turned 90°, the lake's x runs towards -z");
});

test("fish recipes cook from the lake's ingredients", () => {
  for (const id of ["fish-supper", "crayfish-boil", "witchs-fish-pie"]) {
    const r = M.RECIPE_BY_ID[id]; assert.ok(r, id);
    assert.ok(Object.keys(r.ingredients).some((i) => i === "fish" || i === "crayfish"));
  }
  assert.ok(M.INGREDIENT_BY_ID.fish && M.INGREDIENT_BY_ID.crayfish);
  assert.ok("fish" in M.freshKitchen().pantry && "crayfish" in M.freshKitchen().pantry);
});

test("the owner walks out along the jetty to fish, never into the water, and its landing stays clear", () => {
  const s = lakeFarm(), lake = M.fishingLake(s), g = gardenGeometry(s), j = M.LAKE.jetty;
  for (let z = M.LAKE.d / 2 + .9; z >= M.LAKE.stand.z; z -= .1) { const p = M.lakePoint(lake, j.x, z); assert.ok(playerPointFree(p.x, p.z, g.bounds, g.obstacles), `free along the jetty at ${z.toFixed(1)}`); }
  for (const [x, z] of [[0, 0], [2, -1], [j.x, -1.2], [j.x + .9, 1.5]]) { const p = M.lakePoint(lake, x, z); assert.equal(playerPointFree(p.x, p.z, g.bounds, g.obstacles), false, `water at ${x}, ${z}`); }
  assert.ok(gardenTargets(s).some((t) => t.type === "fish")); assert.ok(!gardenTargets(s).some((t) => t.type === "traps"));
  M.buyTrap(s); assert.ok(gardenTargets(s).some((t) => t.type === "traps"));
  const land = M.lakePoint(lake, j.x, M.LAKE.d / 2 + .6);
  s.estate.ownedDecor["lantern-post"] = 1;
  assert.equal(M.placeEstateDecor(s, "lantern-post", land.x, land.z, 0), false, "nothing on the jetty's landing");
});
