// Saving the farm to a file and loading one (save-file.js holds the format).
// A file goes through the system's save dialog where there is one (desktop
// Chrome and Edge), or downloads (phones), or is shared to Drive, Files or a
// chat where the device offers that. Loading keeps the farm it replaces, so a
// wrong file can be undone. Settings stay with the device: a file carries them
// for the record, but loading one leaves this device's own.
import * as M from "../model.js";
import { buildSaveFile, saveFileName, readSaveFile, saveSummary } from "../save-file.js";

export function createSaveFiles({ key, getState, replace, prefs, savePrefs }) {
  const BEFORE = key + "-before-load";
  let before;
  const fileFor = () => { const s = getState(); return { name: saveFileName(s), text: JSON.stringify(buildSaveFile(s, { prefs, build: "voxel-reference" })) }; };
  const marked = () => { prefs.lastExport = new Date().toISOString(); savePrefs(); };
  // A tap or a click, not a controller's press: file dialogs open only from one.
  const tapped = () => (navigator.userActivation ? navigator.userActivation.isActive : true);

  async function saveToFile() {
    const { name, text } = fileFor();
    if (window.showSaveFilePicker && tapped()) {
      try {
        const handle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: "Pumpkin Patch save", accept: { "application/json": [".json"] } }] });
        const out = await handle.createWritable(); await out.write(text); await out.close();
        marked(); return "saved";
      } catch (e) { if (e?.name === "AbortError") return "cancelled"; }
    }
    try {
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" })), a = document.createElement("a");
      a.href = url; a.download = name; a.hidden = true; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      marked(); return "downloaded";
    } catch { return "failed"; }
  }
  const canShare = () => { try { return !!navigator.canShare?.({ files: [new File(["{}"], "save.json", { type: "application/json" })] }); } catch { return false; } };
  async function share() {
    const { name, text } = fileFor();
    try { await navigator.share({ files: [new File([text], name, { type: "application/json" })], title: "Pumpkin Patch save" }); marked(); return "shared"; }
    catch (e) { return e?.name === "AbortError" ? "cancelled" : "failed"; }
  }
  // Choose a file and read it: null if nothing was chosen, else readSaveFile's answer.
  function pick() {
    if (!tapped()) return Promise.resolve({ ok: false, reason: "Tap Load a save file to choose one: the file picker opens from a tap or a click, not the controller." });
    return new Promise((resolve) => {
      const input = document.createElement("input"); input.type = "file"; input.hidden = true;
      const done = (value) => { input.remove(); resolve(value); };
      input.addEventListener("cancel", () => done(null));
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return done(null);
        if (file.size > 25e6) return done({ ok: false, reason: "That file is too big to be a save." });
        try { done(readSaveFile(await file.text())); } catch { done({ ok: false, reason: "That file couldn't be read." }); }
      };
      document.body.append(input); input.click();
    });
  }
  // The farm a load replaced, if there is one, read once and kept.
  function previous() {
    if (before !== undefined) return before;
    try {
      const kept = JSON.parse(localStorage.getItem(BEFORE) || "null");
      const s = kept?.save ? M.restoreState(JSON.parse(kept.save)) : null;
      before = s ? { at: kept.at, summary: saveSummary(s), state: s } : null;
    } catch { before = null; }
    return before;
  }
  // Load a farm read from a file: the farm here, as it is now, is kept first;
  // then the page reloads on the new one. False if the device had no room.
  function load(result) {
    if (!result?.ok) return false;
    try { localStorage.setItem(BEFORE, JSON.stringify({ at: new Date().toISOString(), save: JSON.stringify(M.saveData(getState())) })); }
    catch { try { localStorage.removeItem(BEFORE); } catch {} }
    before = undefined;
    try { replace(result.state); return true; } catch { return false; }
  }
  function undo() {
    const kept = previous(); if (!kept) return false;
    before = undefined;
    try { replace(kept.state); localStorage.removeItem(BEFORE); return true; } catch { return false; }
  }
  return { saveToFile, share, canShare, pick, load, undo, previous, text: () => fileFor().text };
}
