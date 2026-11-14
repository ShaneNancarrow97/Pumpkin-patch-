import test from "node:test";
import assert from "node:assert/strict";
import { villageSettingsMarkup, bindVillageSettings, updateVillageSettingsStatus, villageRendererCopy } from "../src/ui/village-settings.js";

test("village graphics controls reflect inherited settings without changing preferences", () => {
  const prefs = { glow: false, shadows: false, villageRenderer: "webgl", villageDistance: "near", villageGrass: "low", coins: 1 };
  const before = JSON.stringify(prefs), html = villageSettingsMarkup({ prefs, status: { requested: "webgl", backend: "webgl", stage: "disabled" } });
  for (const [key, value] of Object.entries({ villageRenderer: "webgl", villagePost: "off", villageShadows: "off", villageDistance: "near", villageGrass: "low" })) {
    const select = html.match(new RegExp(`<select[^>]*data-village-setting="${key}"[^>]*>(.*?)</select>`))?.[1];
    assert.ok(select, `${key} is directly accessible`);
    assert.match(select, new RegExp(`<option value="${value}" selected>`));
  }
  assert.equal(JSON.stringify(prefs), before);
  assert.match(html, /data-pad-default/);
  assert.match(html, /data-village-settings-reset/);
  assert.match(html, /apply only in the village/);
});

test("the renderer status reports the actual fallback and never exposes device errors as markup", () => {
  const reason = '<img src=x onerror="alert(1)">', prefs = { villageRenderer: "webgpu" };
  assert.match(villageRendererCopy({ stage: "initializing", backend: "webgl" }, prefs).title, /Preparing WebGPU/);
  assert.equal(villageRendererCopy({ stage: "ready", backend: "webgpu" }, prefs).title, "Using WebGPU");
  assert.equal(villageRendererCopy({ stage: "fallback", backend: "webgl", reason }, prefs).title, "Using WebGL");
  const html = villageSettingsMarkup({ prefs: { ...prefs, villageGrass: reason }, status: { stage: "fallback", reason } });
  assert.ok(!html.includes(reason));
  assert.match(html, /Compatibility rendering is active/);
  assert.match(html, /<option value="high" selected>/);
});

test("each explicit graphics change emits one validated value and reset stays explicit", () => {
  const changes = [], rows = ["villageRenderer", "villagePost", "villageShadows", "villageDistance", "villageGrass", "__proto__"].map(key => ({ dataset: { villageSetting: key }, value: "invalid" }));
  const reset = {}, body = { querySelectorAll: () => rows, querySelector: () => reset }; let resets = 0;
  bindVillageSettings(body, { onChange: (...args) => changes.push(args), onReset: () => resets++ });
  assert.deepEqual(changes, []);
  assert.equal(resets, 0);
  for (const row of rows) row.onchange();
  assert.deepEqual(changes, []);
  for (const [index, value] of [[0, "webgl"], [1, "high"], [2, "off"], [3, "near"], [4, "low"]]) { rows[index].value = value; rows[index].onchange(); }
  assert.deepEqual(changes, [["villageRenderer", "webgl"], ["villagePost", "high"], ["villageShadows", false], ["villageDistance", "near"], ["villageGrass", "low"]]);
  rows[2].value = "on"; rows[2].onchange();
  assert.deepEqual(changes.at(-1), ["villageShadows", true]);
  reset.onclick(); assert.equal(resets, 1);
  assert.ok(rows.every(row => !row.oninput), "controller input + change does not apply a choice twice");
});

test("asynchronous renderer status changes preserve the settings controls", () => {
  const title = { textContent: "Preparing WebGPU" }, detail = { textContent: "Still loading" }, select = { value: "webgpu", focused: true };
  const status = { dataset: { rendererState: "loading" }, querySelector: name => name === "strong" ? title : detail };
  const body = { querySelector: name => name === ".vg-renderer-status" ? status : select, set innerHTML(_) { assert.fail("must not rebuild the active settings control"); } };
  updateVillageSettingsStatus(body, { backend: "webgl", stage: "fallback" }, { villageRenderer: "webgpu" });
  assert.equal(title.textContent, "Using WebGL");
  assert.equal(status.dataset.rendererState, "fallback");
  assert.deepEqual(select, { value: "webgpu", focused: true });
  updateVillageSettingsStatus({ querySelector: () => null }, { backend: "webgpu" });
});
