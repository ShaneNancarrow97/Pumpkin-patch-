// Save files: the whole farm in one file that this build and every later one
// can load. The file wraps saveData in a fixed envelope: its format name, the
// file's own version, the game's save version, when it was saved, a summary
// to show before loading, the player's settings and a checksum. Reading goes
// through restoreState, which migrates any older save, so a file saved today
// loads in every future build (test/save-file.test.mjs keeps one from each
// file version and fails if a build stops loading it).
//
// The envelope is a contract. Never rename or drop its fields; if it must
// change, raise SAVE_FILE_VERSION and keep reading the older shape. A text
// backup (the bare saveData from Copy a backup) loads too.
// Pure: no DOM, so the tests read real files.
import * as M from "./model.js";
import { patchLevel } from "./rules/levels.js";
import { MAX_PLOTS } from "./content/farm-layout.js";

export const SAVE_FILE_FORMAT = "pumpkin-patch-voxel-save";
export const SAVE_FILE_VERSION = 1;

// FNV-1a over the text, as eight hex digits: enough to notice a file that was cut short or edited.
export function checksum(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

// What a farm is, at a glance, for the file's card before loading it.
export function saveSummary(s) {
  const level = patchLevel(s);
  return { level: level.level, levelName: level.name, coins: Math.floor(s.coins), earned: Math.floor(s.earned), plots: M.openPlots(s), houseLevel: s.house?.level ?? 1, playSeconds: Math.floor(s.time) };
}

// The file for a farm. `savedAt` is an ISO date; `build` names the game build that wrote it.
export function buildSaveFile(s, { prefs = null, savedAt = new Date().toISOString(), build = "" } = {}) {
  const state = JSON.parse(JSON.stringify(M.saveData(s)));
  return { format: SAVE_FILE_FORMAT, fileVersion: SAVE_FILE_VERSION, stateVersion: M.STATE_VERSION, savedAt, build, summary: saveSummary(s), prefs: prefs && typeof prefs === "object" ? { ...prefs } : null, checksum: checksum(JSON.stringify(state)), state };
}

// A name that sorts by date and says how far the farm had got.
export function saveFileName(s, date = new Date()) {
  const d = date instanceof Date && !Number.isNaN(+date) ? date : new Date(0), pad = (n) => String(n).padStart(2, "0");
  return `pumpkin-patch-level-${patchLevel(s).level}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}

const isFarm = (data) => !!data && typeof data === "object" && Array.isArray(data.plots) && [12, MAX_PLOTS].includes(data.plots.length);

// Reads a save file's text (or a text backup). Returns { ok: false, reason }
// or { ok: true, state, prefs, summary, savedAt, version, newer, edited, legacy }:
// `newer` when a later build wrote it (it still loads, as far as this one
// understands it), `edited` when its checksum no longer matches, and
// `legacy` for a bare text backup.
export function readSaveFile(text) {
  let raw;
  try { raw = JSON.parse(String(text ?? "").replace(/^﻿/, "").trim()); }
  catch { return { ok: false, reason: "That file can't be read as a save. Choose a .json file saved from this game." }; }
  if (!raw || typeof raw !== "object") return { ok: false, reason: "That file isn't a save from this game." };
  const wrapped = raw.format === SAVE_FILE_FORMAT, data = wrapped ? raw.state : raw;
  if (wrapped && (!data || typeof data !== "object")) return { ok: false, reason: "That save file has no farm in it. It may have been cut short." };
  if (!isFarm(data)) return { ok: false, reason: "That file isn't a save from this game." };
  const state = M.restoreState(data), version = Math.max(1, Math.trunc(Number(data.version)) || 1);
  const savedAt = wrapped && typeof raw.savedAt === "string" && !Number.isNaN(Date.parse(raw.savedAt)) ? raw.savedAt : null;
  return {
    ok: true, state, prefs: wrapped && raw.prefs && typeof raw.prefs === "object" && !Array.isArray(raw.prefs) ? raw.prefs : null,
    summary: saveSummary(state), savedAt, version,
    newer: version > M.STATE_VERSION || (wrapped && Number(raw.fileVersion) > SAVE_FILE_VERSION),
    edited: wrapped && typeof raw.checksum === "string" && checksum(JSON.stringify(data)) !== raw.checksum,
    legacy: !wrapped,
  };
}
