import test from "node:test";
import assert from "node:assert/strict";
import { createDeferredFarmNews } from "../src/ui/deferred-farm-news.js";

test("returning farm news is recent, bounded and coalesced without replay", () => {
  let clock = 0;
  const news = createDeferredFarmNews({ now: () => clock });
  news.add("Old ingredients delivered", "kitchen");
  clock = 10000; news.add("New contract", "coin");
  clock = 20000; news.add("Fresh batch ready", "kitchen");
  news.add("Rich guests arriving", "guest");
  news.add("Spoiled stock discarded", "warn");
  assert.deepEqual(news.take(), [
    { text: "Fresh batch ready", kind: "kitchen" },
    { text: "Rich guests arriving", kind: "guest" },
    { text: "Spoiled stock discarded", kind: "warn" },
  ]);
  assert.deepEqual(news.take(), []);
  news.add("Timed contract", "coin"); clock += 45001;
  assert.deepEqual(news.take(), [], "outdated timed news is never surfaced on return");
  news.add("Delivery", "kitchen"); news.clear(); assert.deepEqual(news.take(), []);
});
