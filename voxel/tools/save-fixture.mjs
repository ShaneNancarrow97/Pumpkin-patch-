// Writes a save file from a staged mid-game farm, for test/save-file.test.mjs
// to load in every later build. Run it only when SAVE_FILE_VERSION or
// STATE_VERSION changes, to add the new version's file: never rewrite an old
// one, as the old files are the point (handover 66).
//   node tools/save-fixture.mjs
import fs from "node:fs";
import * as M from "../src/model.js";
import { buildSaveFile, SAVE_FILE_VERSION } from "../src/save-file.js";

const s = M.freshState();
s.coins = 48250; s.earned = M.LEVELS[7].at + 500; s.time = 5400;
s.progression.claimed = M.LEVELS.slice(0, 8).map((l) => l.level);
Object.assign(s.upgrades, { tools: 2, plots: 1, storage: 1 });
s.stock = s.stock.map((_, i) => [12, 6, 3, 0, 0][i] ?? 0);
s.house.level = 2;
for (const id of ["household-piano", "household-moth-rug", "household-wall-television"]) { M.buyDecor(s, id); M.placeDecor(s, id, "parlour"); }
s.kitchen.purchased = true; s.kitchen.recipes = M.RECIPES.slice(0, 2).map((r) => r.id); s.kitchen.pantry.butter = 5;
s.plots[0] = { phase: "growing", progress: .4, variety: 0 }; s.plots[1] = { phase: "ready", progress: 1, variety: 1, ripe: 5300 };
const farm = M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));
const file = buildSaveFile(farm, { prefs: { music: true, tvMode: true, tvSize: "standard" }, savedAt: "2026-11-04T17:30:00.000Z", build: "voxel-reference" });
const out = `test/fixtures/save-file-v${SAVE_FILE_VERSION}-state${M.STATE_VERSION}.json`;
if (fs.existsSync(out)) { console.log(out, "already exists: old save files are never rewritten"); process.exit(0); }
fs.writeFileSync(out, JSON.stringify(file, null, 1) + "\n");
console.log("wrote", out, JSON.stringify(file.summary));
