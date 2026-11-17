import test from "node:test";
import assert from "node:assert/strict";
import { villageActionPrompt, villageKeycap } from "../src/ui/village-action-prompt.js";

test("nearby resources name the same action and real tool on keyboard and pad", () => {
  const log = villageActionPrompt({ type: "village-node", material: "logs" });
  assert.equal(log.action, "Gather"); assert.equal(log.target, "Softwood logs"); assert.equal(log.tool, "Axe");
  assert.equal(log.ready, true); assert.equal(log.key, "e");
  const rock = villageActionPrompt({ type: "village-node", material: "stone", target: "Moonstone boulder" }, { source: "pad" });
  assert.equal(rock.key, "cross"); assert.equal(rock.target, "Moonstone boulder"); assert.equal(rock.hint, "Pickaxe");
  assert.equal(villageActionPrompt({ type: "village-page", target: "Elowen's letter" }).action, "Collect");
  assert.equal(villageActionPrompt({ type: "village-carriage" }).action, "Return");
});

test("no target, locked requirements and active gathering never offer a second tool action", () => {
  assert.equal(villageActionPrompt(null).present, false); assert.equal(villageActionPrompt(null).ready, false);
  const locked = villageActionPrompt({ type: "village-node", material: "herbs", available: false, reason: "Finish Elowen's invitation" });
  assert.equal(locked.ready, false); assert.equal(locked.hint, "Finish Elowen's invitation");
  for (const [progress, expected] of [[0, 0], [.43, .43], [-2, 0], [20, 1]]) {
    const gathering = villageActionPrompt({ type: "village-node", material: "logs", progress }, { source: "pad", locked: true });
    assert.equal(gathering.action, "Gathering"); assert.equal(gathering.busy, true);
    assert.equal(gathering.ready, false); assert.equal(gathering.menu, false); assert.equal(gathering.progress, expected);
  }
});

test("menu input takes priority over the previous world prompt and keeps confirmation available", () => {
  const prompt = villageActionPrompt({ type: "village-folk", label: "Talk", target: "Rowan" }, { source: "pad", locked: true });
  assert.equal(prompt.menu, true); assert.equal(prompt.action, "Select"); assert.equal(prompt.target, ""); assert.equal(prompt.ready, true);
  assert.equal(villageActionPrompt({ menu: true, available: false }).ready, true, "menu selection does not inherit a disabled world target");
});

test("prompt text remains plain data and keycaps only emit known silhouettes", () => {
  const prompt = villageActionPrompt({ type: "village-node", target: "  A  strange\n shelf  ", tool: "Axe", label: "Gather" });
  assert.equal(prompt.target, "A strange shelf"); assert.equal(prompt.accessible, "Gather · A strange shelf · Axe");
  assert.match(villageKeycap("cross"), /vg-key-cross/); assert.match(villageKeycap("cross"), /aria-hidden="true"/);
  assert.match(villageKeycap("dpad"), /vg-key-dpad/); assert.match(villageKeycap("dpad"), /data-ps5-icon="dpad"/, "menu navigation uses the full D-pad silhouette");
  assert.equal(villageKeycap('x" onclick="bad').includes("onclick"), false);
  assert.match(villageKeycap("e"), />E<\/span>/);
});
