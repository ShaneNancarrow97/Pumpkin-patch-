import test from "node:test";
import assert from "node:assert/strict";
import { nearestInDirection, nearestTo, choiceKey } from "../src/ui/pad-menu.js";
import { buyButton, HOLD_TO_BUY_MS } from "../src/ui/hold-to-buy.js";
import { glyphHTML, padFamily } from "../src/ui/glyphs.js";

const box = (left, top, width, height) => ({ left, top, right: left + width, bottom: top + height });

test("the ring moves to the nearest choice that way, in line before off to the side", () => {
  // A sheet: a row of three tabs, then cards with a price on the right.
  const tabs = [box(0, 0, 100, 40), box(110, 0, 100, 40), box(220, 0, 100, 40)];
  const prices = [box(240, 60, 80, 40), box(240, 120, 80, 40), box(240, 180, 80, 40)];
  const all = [...tabs, ...prices];
  assert.equal(nearestInDirection(tabs[0], all, 1, 0), 1, "right along the tabs");
  assert.equal(nearestInDirection(tabs[1], all, -1, 0), 0, "and back left");
  assert.equal(nearestInDirection(tabs[0], all, 0, 1), 3, "down from the first tab to the first price");
  assert.equal(nearestInDirection(prices[0], all, 0, 1), 4, "down the prices in order");
  assert.equal(nearestInDirection(prices[0], all, 0, -1), 2, "up to the tab above it, in line");
  assert.equal(nearestInDirection(prices[2], all, 0, 1), -1, "nothing below the last price");
  assert.equal(nearestInDirection(tabs[0], all, -1, 0), -1, "nothing left of the first tab");
});

test("a grid moves cell by cell, and a wide button below takes the move from either column", () => {
  const grid = [box(0, 0, 100, 50), box(110, 0, 100, 50), box(0, 60, 100, 50), box(110, 60, 100, 50), box(0, 120, 210, 44)];
  assert.equal(nearestInDirection(grid[0], grid, 0, 1), 2);
  assert.equal(nearestInDirection(grid[1], grid, 0, 1), 3);
  assert.equal(nearestInDirection(grid[2], grid, 1, 0), 3);
  assert.equal(nearestInDirection(grid[3], grid, 0, 1), 4);
  assert.equal(nearestInDirection(grid[2], grid, 0, 1), 4);
});

test("a lost choice is found again by its data, its id or its words, and else by where it was", () => {
  const el = (attrs, text = "") => ({ id: attrs.id ?? "", tagName: "BUTTON", textContent: text, attributes: Object.entries(attrs).filter(([k]) => k !== "id").map(([name, value]) => ({ name, value })) });
  assert.deepEqual(choiceKey(el({ "data-buy": "tools", "data-pad-focus": "", class: "button" })), { tag: "BUTTON", data: [["data-buy", "tools"]], text: "" });
  assert.deepEqual(choiceKey(el({ id: "sheet-close" })), { id: "sheet-close" });
  assert.deepEqual(choiceKey(el({ class: "button" }, "  Watch again ")), { tag: "BUTTON", data: [], text: "Watch again" });
  assert.equal(choiceKey(null), null);
  assert.equal(nearestTo({ x: 280, y: 140 }, [box(0, 0, 100, 40), box(240, 120, 80, 40), box(240, 180, 80, 40)]), 1);
});

test("hold to buy: only a marked button with a price on it waits for the hold", () => {
  const button = (text, marked = true) => ({ textContent: text, closest: (s) => (s === ".purchase-button" && marked ? button.self : null) });
  const priced = button("£120"); button.self = priced; assert.equal(buyButton(priced), priced);
  const cook = button("Cook"); button.self = cook; assert.equal(buyButton(cook), null, "the kitchen's Cook stays a tap");
  const plain = button("£40", false); assert.equal(buyButton(plain), null, "an unmarked button stays a tap");
  assert.equal(buyButton(null), null);
  assert.ok(HOLD_TO_BUY_MS >= 300 && HOLD_TO_BUY_MS <= 700, "the hold is short");
});

test("menu prompts draw each pad's own buttons", () => {
  assert.match(glyphHTML("confirm", "dualsense"), /glyph-cross/);
  assert.match(glyphHTML("back", "dualsense"), /glyph-circle/);
  assert.match(glyphHTML("start", "dualsense"), /glyph-options/);
  assert.match(glyphHTML("lb", "dualsense"), />L1</);
  assert.match(glyphHTML("confirm", "xbox"), />A</);
  assert.equal(padFamily({ id: "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)" }), "DualSense");
  assert.equal(padFamily({ id: "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)" }), "Controller");
  assert.equal(padFamily(null), "");
});
