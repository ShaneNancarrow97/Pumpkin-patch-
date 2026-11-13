import test from "node:test";
import assert from "node:assert/strict";
import { createGuestCard } from "../src/ui/guest-card.js";

// Exercise the real controller without starting a WebGL scene.
function fixture() {
  const nodes = new Map(), host = { hidden: true, setAttribute() {}, querySelector(key) { if (!nodes.has(key)) nodes.set(key, {}); return nodes.get(key); } };
  const previous = globalThis.document;
  globalThis.document = { createElement: () => host, body: { append() {} } };
  const visitor = { id: 2, kind: 0, budget: 32, originalBudget: 40, needs: { thirst: 75, hunger: 30, happiness: 80 } };
  const s = { visitors: [visitor], shop: { customers: [{ ...visitor, id: 7, phase: "browsing", budget: 19 }] } };
  return { host, nodes, visitor, s, view: createGuestCard({ state: () => s, portrait: () => null }), cleanup() { globalThis.document = previous; } };
}

test("guest card follows live needs and cash, without reappearing after a location reset", () => {
  const f = fixture(); try {
    f.view.open(2); f.view.tick(false); assert.equal(f.host.hidden, false); assert.equal(f.nodes.get(".guest-money").textContent, "£32");
    f.visitor.budget = 20; f.visitor.needs.thirst = 15; f.view.tick(false);
    assert.equal(f.nodes.get(".guest-money").textContent, "£20"); assert.equal(f.nodes.get('[data-need="thirst"]').value, 15);
    f.view.tick(true); assert.equal(f.host.hidden, true); f.view.tick(false); assert.equal(f.host.hidden, false);
    f.view.clear(); f.view.tick(false); assert.equal(f.host.hidden, true);
    f.view.open(7, true); f.view.tick(false); assert.equal(f.nodes.get(".guest-money").textContent, "£19");
    f.nodes.get("button").onclick(); f.view.tick(false); assert.equal(f.host.hidden, true);
  } finally { f.cleanup(); }
});

test("departed visitors close their card permanently even when another visitor arrives", () => {
  const f = fixture(); try {
    f.view.open(2); f.view.tick(false); f.s.visitors = []; f.view.tick(false); assert.equal(f.host.hidden, true);
    f.s.visitors.push(f.visitor); f.view.tick(false); assert.equal(f.host.hidden, true);
  } finally { f.cleanup(); }
});
