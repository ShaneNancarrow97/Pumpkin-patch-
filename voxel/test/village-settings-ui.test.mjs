import test from "node:test";
import assert from "node:assert/strict";
import { villageSettingsMarkup, bindVillageSettings, updateVillageSettingsStatus, villageRendererCopy } from "../src/ui/village-settings.js";

test("village graphics controls reflect inherited settings without changing preferences", () => {
  const prefs = { glow: false, shadows: false, villageRenderer: "webgl", villageDistance: "near", villageGrass: "low", coins: 1 };
  const before = JSON.stringify(prefs), html = villageSettingsMarkup({ prefs, status: { requested: "webgl", backend: "webgl", stage: "disabled" } });
  assert.match(html, /id="vg-renderer-webgl" data-village-renderer="webgl" aria-pressed="true"/, "the renderer selector shows the inherited choice");
  assert.equal((html.match(/aria-pressed="true"[^>]*data-pad-default|data-village-renderer="[^"]*" aria-pressed="true"/g) ?? []).length >= 1, true);
  for (const [key, value] of Object.entries({ villagePost: "off", villageShadows: "off", villageDistance: "near", villageGrass: "low", villageShadowDetail: "auto", villageAtmosphere: "full" })) {
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
  // villageRenderer is a set of buttons now, so its select row is refused like any unknown key.
  const reset = {}, body = { querySelectorAll: () => rows, querySelector: () => reset }; let resets = 0;
  bindVillageSettings(body, { onChange: (...args) => changes.push(args), onReset: () => resets++ });
  assert.deepEqual(changes, []);
  assert.equal(resets, 0);
  for (const row of rows) row.onchange();
  assert.deepEqual(changes, []);
  for (const [index, value] of [[0, "webgl"], [1, "high"], [2, "off"], [3, "near"], [4, "low"]]) { rows[index].value = value; rows[index].onchange(); }
  assert.deepEqual(changes, [["villagePost", "high"], ["villageShadows", false], ["villageDistance", "near"], ["villageGrass", "low"]]);
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

test("the renderer selector, quick setup, tabs and game controls each report one validated choice", async () => {
  const { VILLAGE_PRESETS, villagePresetFor, villageLiveLine, VILLAGE_SETTINGS_TABS } = await import("../src/ui/village-settings.js");
  const make = dataset => ({ dataset, value: "", parentElement: null, style: { setProperty() {} } });
  const els = { "[data-village-renderer]": ["auto", "webgpu", "webgl", "metal"].map(v => make({ villageRenderer: v })),
    "[data-village-preset]": ["smooth", "beautiful", "ultra"].map(v => make({ villagePreset: v })),
    "[data-vg-settings-tab]": ["graphics", "sound", "secret"].map(v => make({ vgSettingsTab: v })),
    "[data-village-pref]": [make({ villagePref: "renderQuality" })], "[data-village-toggle]": [make({ villageToggle: "music" })],
    "[data-village-range]": [make({ villageRange: "musicVolume" })], "[data-village-action]": [make({ villageAction: "next-song" })] };
  const body = { querySelectorAll: sel => els[sel] ?? [], querySelector: () => null }, got = [];
  bindVillageSettings(body, { onChange: (...a) => got.push(["change", ...a]), onPreset: p => got.push(["preset", p.id]), onTab: t => got.push(["tab", t]), onPref: (...a) => got.push(["pref", ...a]), onToggle: k => got.push(["toggle", k]), onRange: (...a) => got.push(["range", ...a]), onAction: a => got.push(["action", a]) });
  for (const list of Object.values(els)) for (const el of list) { el.value = "0.4"; el.onclick?.(); el.onchange?.(); el.oninput?.(); }
  assert.deepEqual(got, [["change", "villageRenderer", "auto"], ["change", "villageRenderer", "webgpu"], ["change", "villageRenderer", "webgl"], ["preset", "smooth"], ["preset", "beautiful"], ["tab", "graphics"], ["tab", "sound"], ["pref", "renderQuality", "0.4"], ["toggle", "music"], ["range", "musicVolume", .4], ["action", "next-song"]]);
  // A preset is recognised from the values it sets, and anything else is the player's own mix.
  assert.equal(villagePresetFor({ ...VILLAGE_PRESETS[0].values }), "smooth");
  assert.equal(villagePresetFor({ ...VILLAGE_PRESETS[0].values, villageGrass: "high" }), null);
  assert.match(villageLiveLine({ fps: 58.4, bufferWidth: 1500, bufferHeight: 1350, scale: .77, gpu: "Adreno (TM) 830" }), /About 58 frames a second · drawn 1500 × 1350 \(77%\) · Adreno/);
  for (const tab of VILLAGE_SETTINGS_TABS) {
    const html = villageSettingsMarkup({ prefs: { music: true, musicVolume: .3, voiceEnabled: true, voiceVolume: .8 }, tab, info: { tracks: [{ id: "lantern", name: "Lantern", credit: "Original" }], tvSizes: [["standard", "Standard"]], canSave: true } });
    assert.match(html, new RegExp(`id="vg-settings-tab-${tab}" role="tab" aria-selected="true"`));
    assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
    assert.ok(!/undefined|NaN/.test(html), `${tab} renders cleanly`);
  }
  const sound = villageSettingsMarkup({ prefs: { music: false }, tab: "sound", info: { tracks: [{ id: "lantern", name: "Lantern" }] } });
  assert.match(sound, /id="vg-range-musicVolume"[^>]* disabled/, "music volume rests while music is off");
});
