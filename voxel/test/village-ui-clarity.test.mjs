import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { villageActionPrompt } from "../src/ui/village-action-prompt.js";
import { glyphHTML } from "../src/ui/glyphs.js";

const css = fs.readFileSync(new URL("../src/ui/village-tokens.css", import.meta.url), "utf8");
const colours = Object.fromEntries([...css.matchAll(/--village-([\w-]+):\s*(#[\da-f]{6}(?:[\da-f]{2})?)\s*;/gi)].map(([, name, hex]) => [name, hex]));
const rgb = hex => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16) / 255);
function luminance(channels) { return channels.map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0); }
function contrast(ink, surface, world) {
  const alpha = surface.length === 9 ? parseInt(surface.slice(7), 16) / 255 : 1;
  const bg = luminance(rgb(surface).map(c => c * alpha + world * (1 - alpha))), fg = luminance(rgb(ink));
  return (Math.max(bg, fg) + .05) / (Math.min(bg, fg) + .05);
}

test("village semantic text pairs meet 4.5:1, including translucent panels over the brightest world", () => {
  const pairs = [
    ...["surface", "surface-raised", "surface-deep"].flatMap(surface => ["ink", "muted", "gold", "success", "danger"].map(ink => [ink, surface])),
    ["action-ink", "amber"], ["action-muted", "amber"], ["action-ink", "amber-hover"], ["action-muted", "amber-hover"],
    ["keycap-ink", "keycap"],
  ];
  for (const [ink, surface] of pairs) {
    assert.ok(colours[ink] && colours[surface], `both tokens exist for ${ink}/${surface}`);
    for (const world of [0, 1]) assert.ok(contrast(colours[ink], colours[surface], world) >= 4.5, `${ink}/${surface} must remain readable over ${world ? "white" : "black"}`);
  }
});

test("long story object names remain complete in visible and accessible prompts for every input", () => {
  const target = "The Lamplighter’s original moth-marked notebook from the old Moonclock keeper’s forgotten observatory";
  for (const source of ["keyboard", "pad", "touch"]) {
    const prompt = villageActionPrompt({ type: "expansion-activity", label: `Read ${target}`, target }, { source });
    assert.equal(prompt.action, "Read");
    assert.equal(prompt.target, target);
    assert.equal(prompt.accessible, `Read · ${target}`);
  }
  const older = villageActionPrompt({ label: `Read ${target}` });
  assert.equal(older.action, "Read"); assert.equal(older.target, target);
  const letter = villageActionPrompt({ type:"village-page", label:`Collect ${target}` });
  assert.equal(letter.action,"Collect");assert.equal(letter.target,target,"a type's generic fallback never replaces a supplied object name");
  const branch = villageActionPrompt({ type:"village-node", material:"logs", label:`Gather ${target}` });
  assert.equal(branch.action,"Gather");assert.equal(branch.target,target,"a resource fallback never replaces a supplied object name");
});

test("unfamiliar action words and locked reasons retain their whole meaning", () => {
  const label = "Compare the two constellations carefully before choosing";
  const reason = "Return after you have repaired the Quarry lantern and shown Rowan the newly restored moth-marked bridge across the ravine";
  const prompt = villageActionPrompt({ label, available: false, reason });
  assert.equal(prompt.action, label); assert.equal(prompt.hint, reason);
  assert.equal(prompt.accessible, `${label} · ${reason}`);
  assert.match(glyphHTML("start", "keyboard"), /class="glyph glyph-keyboard"[^>]*>Enter<\/i>/, "the real Enter legend contains text, not an empty icon");
});

test("the noticeboard and stall describe the action and object separately", () => {
  const board = villageActionPrompt({ type:"village-noticeboard" });
  assert.equal(board.action,"Read");assert.equal(board.target,"Noticeboard");
  const stall = villageActionPrompt({ type:"village-stall" });
  assert.equal(stall.action,"Shop");assert.equal(stall.target,"Village stall");
});
