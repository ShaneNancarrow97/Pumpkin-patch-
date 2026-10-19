// Settings: sound, a tea break, backups, graphics and starting over.
import * as M from "../model.js";
import { MUSIC_TRACKS } from "./audio.js";

export function settingsSheet(ui) {
  let confirmReset = false, restoreText = "", restoreError = "";
  const toggle = (id, label, help, on) => `<div class="setting"><span>${label}<small>${help}</small></span><button class="button" id="${id}" aria-pressed="${on}">${on ? "On" : "Off"}</button></div>`;
  return {
    settings: {
      eyebrow: "Make yourself at home", title: "Settings",
      opened() { confirmReset = false; restoreError = ""; },
      body() {
        const p = ui.prefs, s = ui.state;
        return toggle("toggle-music", "Music", "Eight offline MIDI tracks · four you supplied, four original", p.music) +
          `<div class="setting"><span>Music volume</span><input id="music-volume" type="range" min="0" max="1" step="0.05" value="${p.musicVolume}" aria-label="Music volume"></div>` +
          `<label class="setting"><span>Now playing<small>${(MUSIC_TRACKS.find((t) => t.id === p.musicTrack) ?? MUSIC_TRACKS[0]).credit}</small></span><select id="music-track" aria-label="Music track">${MUSIC_TRACKS.map((t) => `<option value="${t.id}" ${t.id === (p.musicTrack ?? "lantern") ? "selected" : ""}>${t.name}</option>`).join("")}</select></label>` +
          toggle("toggle-sound", "Sound effects", "Soft tones for planting, picking and sales", p.sound) +
          toggle("toggle-pause", "Tea break", "Pause the farm. Nothing grows and nobody visits.", !!s.paused) +
          toggle("toggle-glow", "Glow", "Bloom on lanterns, windows and ripe pumpkins", p.glow) +
          toggle("toggle-shadows", "Moonlit shadows", "Turn off on slower phones", p.shadows) +
          toggle("toggle-voxel-characters", "Voxel characters", "Build Shane, Natalie, Skyla and the visitors from voxels instead of the original sprites", p.voxelCharacters) +
          `<h3 class="section">Backups</h3><p class="small">Your farm saves itself on this device. Copy a backup to keep it safe, or paste one to restore it.</p>
          <div class="backup"><button class="button" id="copy-backup">Copy a backup</button></div>
          <label class="restore"><span class="sr">Paste a backup</span><textarea id="restore-text" rows="3" placeholder="Paste a backup here"></textarea></label>
          <div class="backup"><button class="button" id="restore-backup" disabled>Restore this backup</button></div>${restoreError ? `<p class="error">${restoreError}</p>` : ""}
          <div class="setting"><span>Start a new patch<small>Clears this build’s save only</small></span><button class="button danger" id="reset">${confirmReset ? "Tap again to reset" : "Reset"}</button></div>
          <p class="about">Voxel build of Shane &amp; Natalie’s Pumpkin Patch. Drag to look around, pinch or scroll to zoom. Tap plots, the big pumpkin, the shop, the cottage, or Shane and Natalie. Keys: P plant, H harvest, Space boost, Esc close.</p>`;
      },
      bind(body) {
        const p = ui.prefs, s = ui.state, flip = (key, after) => () => { p[key] = !p[key]; after?.(p[key]); ui.savePrefs(); ui.draw(); };
        body.querySelector("#toggle-music").onclick = flip("music", () => ui.audio.sync());
        body.querySelector("#music-track").onchange = (e) => { ui.audio.setTrack(e.target.value); ui.savePrefs(); ui.draw(); };
        body.querySelector("#music-volume").oninput = (e) => { ui.audio.setVolume(+e.target.value); ui.savePrefs(); };
        body.querySelector("#toggle-sound").onclick = flip("sound");
        body.querySelector("#toggle-pause").onclick = () => { s.paused = !s.paused; ui.notice(s.paused ? "Tea break. The farm will wait for you." : "Back to work!"); ui.draw(); };
        body.querySelector("#toggle-glow").onclick = flip("glow", (on) => ui.scene.setBloom(on));
        body.querySelector("#toggle-shadows").onclick = flip("shadows", (on) => ui.scene.setShadows(on));
        body.querySelector("#toggle-voxel-characters").onclick = flip("voxelCharacters", (on) => ui.scene.setVoxelCharacters(on));
        body.querySelector("#copy-backup").onclick = async () => {
          const text = JSON.stringify(M.saveData(s));
          try { await navigator.clipboard.writeText(text); ui.notice("Backup copied. Keep it somewhere safe."); }
          catch { restoreText = text; ui.draw(); body.querySelector("#restore-text")?.select(); ui.notice("Copy the backup from the box below."); }
        };
        // The pasted text lives outside the sheet's HTML, so typing never redraws it.
        const area = body.querySelector("#restore-text"), restoreButton = body.querySelector("#restore-backup");
        area.value = restoreText; restoreButton.disabled = !restoreText.trim();
        area.oninput = () => { restoreText = area.value; restoreButton.disabled = !restoreText.trim(); };
        body.querySelector("#restore-backup").onclick = () => {
          try {
            const raw = JSON.parse(restoreText);
            if (!raw || !Array.isArray(raw.plots)) throw new Error("not a save");
            ui.replaceState(M.restoreState(raw));
          } catch { restoreError = "That doesn’t look like a backup from this game."; ui.draw(); }
        };
        body.querySelector("#reset").onclick = () => { if (!confirmReset) { confirmReset = true; ui.draw(); return; } ui.replaceState(M.freshState()); };
      },
    },
  };
}
