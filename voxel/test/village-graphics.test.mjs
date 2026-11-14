import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_VILLAGE_GRAPHICS, normaliseVillageGraphics, villagePostProfile, scaleVillageGrade } from "../src/village-graphics.js";
import { buildSaveFile, readSaveFile } from "../src/save-file.js";
import { freshState } from "../src/model.js";

test("older device settings keep disabled glow and shadows without changing farm preferences", () => {
  const old = { glow: false, shadows: false, music: false };
  assert.deepEqual(normaliseVillageGraphics(old), { ...DEFAULT_VILLAGE_GRAPHICS, villagePost: "off", villageShadows: false });
  assert.deepEqual(old, { glow: false, shadows: false, music: false });
  assert.equal(normaliseVillageGraphics({ ...old, villagePost: "high", villageShadows: true }).villagePost, "high");
  assert.equal(normaliseVillageGraphics({ ...old, villageShadows: true }).villageShadows, true);
});

test("invalid village graphics cannot select an unknown backend or disable detail accidentally", () => {
  for (const bad of [null, undefined, [], "low", 0]) assert.deepEqual(normaliseVillageGraphics(bad), DEFAULT_VILLAGE_GRAPHICS);
  assert.deepEqual(normaliseVillageGraphics({ villageRenderer: "constructor", villagePost: "__proto__", villageDistance: -10, villageGrass: null, villageShadows: "off" }), DEFAULT_VILLAGE_GRAPHICS);
});

test("all village overrides survive preferences serialization and save-file recording", () => {
  const prefs = { villageRenderer: "webgl", villagePost: "low", villageDistance: "near", villageGrass: "off", villageShadows: false };
  assert.deepEqual(normaliseVillageGraphics(JSON.parse(JSON.stringify(prefs))), prefs);
  const farm = freshState(), file = buildSaveFile(farm, { prefs }), read = readSaveFile(JSON.stringify(file));
  assert.equal(read.ok, true); assert.equal(file.stateVersion, 20);
  assert.deepEqual(normaliseVillageGraphics(read.prefs), prefs);
  assert.equal(read.state.coins, farm.coins); assert.equal(read.state.version, farm.version);
});

test("post quality scales actual grading and preserves the authored balanced finish", () => {
  const source = { saturation: 1.1, contrast: 1.05, vignette: .24, shadows: [.004, .006, .03], lights: [.02, .008, -.014] };
  const out = { shadows: [0, 0, 0], lights: [0, 0, 0] }, shadows = out.shadows, lights = out.lights;
  assert.equal(scaleVillageGrade(source, 1, out), out); assert.deepEqual(out, source);
  scaleVillageGrade(source, 0, out); assert.deepEqual(out, { saturation: 1, contrast: 1, vignette: 0, shadows: [0, 0, 0], lights: [0, 0, -0] });
  assert.equal(out.shadows, shadows); assert.equal(out.lights, lights);
  assert.equal(villagePostProfile("off").enabled, false);
  assert.ok(villagePostProfile("low").bloom < villagePostProfile("balanced").bloom);
  assert.ok(villagePostProfile("high").grade > villagePostProfile("balanced").grade);
  assert.equal(villagePostProfile("__proto__").id, "balanced");
});
