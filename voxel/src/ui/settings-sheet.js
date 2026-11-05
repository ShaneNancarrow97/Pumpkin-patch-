// Settings: TV mode and casting, sound, a tea break, backups, graphics and
// starting over. Cast to TV is its own sheet: it readies the phone for
// mirroring (ui/tv-mode.js) and says how this device reaches a TV.
import * as M from "../model.js";
import { MUSIC_TRACKS } from "./audio.js";
import { RENDER_QUALITIES, validRenderQuality } from "../render-quality.js";
import { FRAME_RATES, validFrameRate } from "../frame-pacing.js";
import { TV_SIZES, CAST_STEPS } from "./tv-mode.js";
import { readSaveFile, saveSummary } from "../save-file.js";
import { money } from "./kit.js";
import { padFamily } from "./glyphs.js";

const TV_ART = `<svg viewBox="0 0 64 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="6" width="54" height="32" rx="4"/><path d="M24 44h16M32 38v6"/><path d="M27 27c0-4 2.5-7 5-7s5 3 5 7-2.5 5-5 5-5-1-5-5Z" fill="#e8964a" stroke="#f6c27d"/><path d="M32 20v-3l2-1" stroke="#9ccf7a"/><path d="M45 13a7 7 0 0 1 5 5M45 9a11 11 0 0 1 9 9" stroke="#f2cf99"/></svg>`;
// A farm in a line, and when, for the save cards.
const farmLine = (f) => `Level ${f.level} · ${f.levelName} · ${money(f.coins)} · ${f.plots} plots${f.houseLevel ? ` · house level ${f.houseLevel}` : ""}`;
const when = (iso) => { const t = Date.parse(iso ?? ""); return Number.isNaN(t) ? "" : new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
const ago = (iso) => { const t = Date.parse(iso ?? ""); if (Number.isNaN(t)) return "never"; const days = Math.floor((Date.now() - t) / 864e5); return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`; };
const connectedPad = () => { const g = [...(navigator.getGamepads?.() ?? [])].find((x) => x?.connected); return g ? (padFamily(g) === "DualSense" ? "DualSense" : "A controller") : ""; };

export function settingsSheet(ui) {
  // What the frame rate setting is doing now, in a line.
  const frameNote = (p) => {
    const mode = validFrameRate(p.frameRate), cap = ui.scene.pacing?.cap;
    if (mode === "auto") return p.tvMode ? `Drawing ${cap || 60} a second. When casting it settles on a steady 30 if 60 can't be held, and tries 60 again now and then` : "Up to 60 a second, which spares the battery on a 120 Hz screen";
    if (mode === "30") return "A steady 30 a second: the easiest on the phone, and even on a cast";
    if (mode === "60") return "Up to 60 a second";
    return "Every screen refresh: smoothest on a fast screen, hardest on the battery";
  };
  let confirmReset = false, restoreText = "", restoreError = "", castResult = null, pending = null, fileError = "", here = null;
  const toggle = (id, label, help, on) => `<div class="setting"><span>${label}<small>${help}</small></span><button class="button" id="${id}" aria-pressed="${on}">${on ? "On" : "Off"}</button></div>`;
  const sizeSelect = (p) => `<label class="setting"><span>TV menu size<small>How big menus and buttons look on the TV</small></span><select id="tv-size" aria-label="TV menu size">${TV_SIZES.map(([id, name]) => `<option value="${id}" ${id === (p.tvSize ?? "standard") ? "selected" : ""}>${name}</option>`).join("")}</select></label>`;
  const tvToggle = (p) => toggle("toggle-tv", "TV mode", "For a phone mirrored to a TV: smaller menus, bigger close buttons, and no touch sticks while a controller is connected", !!p.tvMode);
  const bindTv = (body) => {
    body.querySelector("#toggle-tv").onclick = () => { ui.tv.set(!ui.prefs.tvMode); ui.draw(); };
    body.querySelector("#tv-size").onchange = (e) => { ui.prefs.tvSize = e.target.value; ui.savePrefs(); ui.tv.apply(); ui.draw(); };
  };
  const check = (ok, label, otherwise) => `<li class="${ok ? "is-done" : "is-todo"}"><i aria-hidden="true">${ok ? "✓" : "·"}</i><span>${label}${ok || !otherwise ? "" : `<small>${otherwise}</small>`}</span></li>`;
  return {
    // Cast to TV: everything a page may do, then this device's way to the TV.
    cast: {
      eyebrow: "Play on the big screen", title: "Cast to TV",
      opened() { castResult = null; },
      body() {
        const p = ui.prefs, route = ui.tv.route(), pad = connectedPad(), screenWord = ["chrome", "mac", "other"].includes(route) ? "screen" : "phone";
        return `<div class="cast-sheet"><article class="cast-hero"><span class="cast-art">${TV_ART}</span><div><h3>Your patch on the TV</h3><p>Mirror this ${screenWord} to your TV and play with a controller. TV mode makes the menus smaller and puts the controller's buttons on screen in place of the touch sticks.</p></div></article>` +
          `<button class="button gold wide cast-ready" id="cast-ready" data-pad-default>${castResult ? "Get ready again" : "Get ready to cast"}</button>` +
          (castResult ? `<ul class="cast-checks">${check(castResult.tv, "TV mode on")}${check(castResult.fullscreen, "Fullscreen", "Press the game's fullscreen button, or tap the screen and try again")}${check(castResult.landscape, "Held in landscape", "Turn the phone on its side")}${check(castResult.awake, "Screen kept awake", "Set a longer screen timeout in the phone's settings")}</ul>` : "") +
          `<h3 class="section">Then mirror to your TV</h3><ol class="cast-steps">${CAST_STEPS[route].map((step) => `<li>${step}</li>`).join("")}</ol>` +
          (route === "android" ? `<p class="small">On a Samsung, Smart View's <b>⋮</b> menu, then Settings, then <b>Phone aspect ratio</b>: <b>Full screen on connected device</b> fills a 16:9 TV.</p>` : "") +
          `<h3 class="section">Controller</h3><p class="cast-pad${pad ? " is-on" : ""}">${pad ? `<b>${pad} connected.</b> Options opens the menu, ✕ chooses and ○ goes back. The touchpad moves a pointer on most phones.` : `No controller yet. On a DualSense, hold <b>PS</b> and <b>Create</b> until the light bar flashes, then pair it in the ${screenWord}'s Bluetooth settings.`}</p>` +
          tvToggle(p) + sizeSelect(p) + `<button class="button wide" id="cast-done">Done</button></div>`;
      },
      bind(body) {
        body.querySelector("#cast-ready").onclick = async () => { castResult = await ui.tv.ready(); ui.draw(); };
        body.querySelector("#cast-done").onclick = () => ui.closeSheet();
        bindTv(body);
      },
    },
    settings: {
      eyebrow: "Make yourself at home", title: "Settings",
      opened() { confirmReset = false; restoreError = ""; pending = null; fileError = ""; here = saveSummary(ui.state); },
      body() {
        const p = ui.prefs, s = ui.state, kept = ui.files.previous();
        here ??= saveSummary(s);
        // A file chosen and read, waiting for the player to say load it.
        const preview = pending ? `<article class="save-preview" aria-label="Save file to load"><p class="save-kicker">Ready to load</p><h4>${farmLine(pending.summary)}</h4><p>${pending.savedAt ? `Saved ${when(pending.savedAt)}` : "A text backup"}${pending.version ? ` · save version ${pending.version}` : ""}</p>${pending.newer ? '<p class="save-warning">Saved by a newer version of the game. It loads, but anything this version doesn’t have yet is left out.</p>' : ""}${pending.edited ? '<p class="save-warning">This file has been changed since it was saved.</p>' : ""}<p class="small">This replaces the farm here (level ${here.level}, ${money(here.coins)}). You can go back to it afterwards with Undo the last load.</p><div class="save-actions"><button class="button gold can-act" id="confirm-load" data-pad-default>Load this farm</button><button class="button" id="cancel-load">Cancel</button></div></article>` : "";
        return `<h3 class="section">TV and controller</h3>` + tvToggle(p) + sizeSelect(p) +
          `<div class="setting"><span>Cast to TV<small>Get this phone ready, then mirror it to your TV</small></span><button class="button gold" id="open-cast">Cast to TV</button></div>` +
          `<h3 class="section">Sound and look</h3>` + toggle("toggle-music", "Music", `${MUSIC_TRACKS.length} offline MIDI tracks · originals and your supplied songs`, p.music) +
          `<div class="setting"><span>Music volume</span><input id="music-volume" type="range" min="0" max="1" step="0.05" value="${p.musicVolume}" aria-label="Music volume"></div>` +
          `<label class="setting"><span>Now playing<small>${(MUSIC_TRACKS.find((t) => t.id === p.musicTrack) ?? MUSIC_TRACKS[0]).credit}</small></span><select id="music-track" aria-label="Music track">${MUSIC_TRACKS.map((t) => `<option value="${t.id}" ${t.id === (p.musicTrack ?? "lantern") ? "selected" : ""}>${t.name}</option>`).join("")}</select></label>` +
          toggle("toggle-shuffle", "Shuffle", "Play the soundtrack in a fresh order without back-to-back repeats", p.musicShuffle !== false) +
          `<div class="setting"><span>Try another tune</span><button class="button" id="next-song">Next song</button></div>` +
          toggle("toggle-sound", "Sound effects", "Soft tones for planting, picking and sales", p.sound) +
          toggle("toggle-pause", "Tea break", "Pause the farm. Nothing grows and nobody visits.", !!s.paused) +
          `<label class="setting"><span>Render detail<small>Sharp keeps fine edges. Lower settings save battery and reduce graphics load.</small></span><select id="render-quality" aria-label="Render detail">${RENDER_QUALITIES.map(q=>`<option value="${q.id}" ${q.id===validRenderQuality(p.renderQuality)?"selected":""}>${q.name}</option>`).join("")}</select></label>` +
          `<label class="setting"><span>Frame rate<small>${frameNote(p)}</small></span><select id="frame-rate" aria-label="Frame rate">${FRAME_RATES.map(([id, name]) => `<option value="${id}" ${id === validFrameRate(p.frameRate) ? "selected" : ""}>${name}</option>`).join("")}</select></label>` +
          toggle("toggle-glow", "Glow", "Bloom on lanterns, windows and ripe pumpkins", p.glow) +
          toggle("toggle-mist", "Drifting mist", "A thin mist that rolls across the farm, clears and comes back", p.mist) +
          toggle("toggle-lake", "Lake and twinkling lights", "Ripples on the far lake, flickering village lamps and twinkling stars", p.lakeLights) +
          `<div class="setting"><span>Introduction<small>Shane and Natalie explain the patch again</small></span><button class="button" id="watch-intro">Watch again</button></div>` +
          `<div class="setting"><span>Camera framing<small>See more of the scene. Pinch or scroll to inspect.</small></span><button class="button" id="fit-view">Fit view</button></div>` +
          toggle("toggle-shadows", "Moonlit shadows", "Turn off on slower phones", p.shadows) +
          toggle("toggle-voxel-characters", "Voxel characters", "Build Shane, Natalie, Skyla and the visitors from voxels instead of the original sprites", p.voxelCharacters) +
          `<h3 class="section" id="save-section">Your farm’s save</h3><p class="small">The farm saves itself on this device as you play. To take it to a new version of the game or another device, save it to a file, then load that file there. Files from older versions always load.</p>
          <article class="save-card"><p class="save-kicker">This farm</p><h4>${farmLine(here)}</h4><p>Last saved to a file: <b>${ago(p.lastExport)}</b></p><div class="save-actions"><button class="button gold" id="save-file">Save to a file</button>${ui.files.canShare() ? '<button class="button" id="share-save">Share…</button>' : ""}<button class="button" id="load-file">Load a save file</button></div></article>` +
          preview + (fileError ? `<p class="error">${fileError}</p>` : "") +
          (kept ? `<div class="setting"><span>Undo the last load<small>Go back to the farm you had before it: ${farmLine(kept.summary)}${kept.at ? `, replaced ${when(kept.at)}` : ""}</small></span><button class="button" id="undo-load">Go back</button></div>` : "") +
          `<details class="text-backup"><summary>Backup as text</summary><p class="small">Copy the save as text to keep in a note, or paste one (or a whole save file’s text) to load it.</p>
          <div class="backup"><button class="button" id="copy-backup">Copy a backup</button></div>
          <label class="restore"><span class="sr">Paste a backup</span><textarea id="restore-text" rows="3" placeholder="Paste a backup here"></textarea></label>
          <div class="backup"><button class="button" id="restore-backup" disabled>Check this backup</button></div>${restoreError ? `<p class="error">${restoreError}</p>` : ""}</details>
          <div class="setting"><span>Start a new patch<small>Starts again from the beginning. The farm you have now is kept, so Undo the last load can bring it back.</small></span><button class="button danger" id="reset">${confirmReset ? "Tap again to reset" : "Reset"}</button></div>
          <p class="about">Voxel build of Shane &amp; Natalie’s Pumpkin Patch. Drag to look around, pinch or scroll to zoom. Tap plots, the big pumpkin, the shop, the cottage, or Shane and Natalie. Keys: P plant, H harvest, Space boost, Esc close. On a controller: Options for the menu, ✕ to choose, ○ to go back, L1 and R1 for tabs, and the right stick to scroll.</p>`;
      },
      bind(body) {
        const p = ui.prefs, s = ui.state, flip = (key, after) => () => { p[key] = !p[key]; after?.(p[key]); ui.savePrefs(); ui.draw(); };
        bindTv(body);
        body.querySelector("#open-cast").onclick = () => ui.openSheet("cast");
        body.querySelector("#toggle-music").onclick = flip("music", () => ui.audio.sync());
        body.querySelector("#toggle-shuffle").onclick = () => { ui.audio.setShuffle(p.musicShuffle === false); ui.savePrefs(); ui.draw(); };
        body.querySelector("#next-song").onclick = () => { ui.audio.nextTrack(); ui.savePrefs(); ui.draw(); };
        body.querySelector("#music-track").onchange = (e) => { ui.audio.setTrack(e.target.value); ui.savePrefs(); ui.draw(); };
        body.querySelector("#music-volume").oninput = (e) => { ui.audio.setVolume(+e.target.value); ui.savePrefs(); };
        body.querySelector("#toggle-sound").onclick = flip("sound");
        body.querySelector("#toggle-pause").onclick = () => { s.paused = !s.paused; ui.notice(s.paused ? "Tea break. The farm will wait for you." : "Back to work!"); ui.draw(); };
        body.querySelector("#render-quality").onchange = e => { p.renderQuality = ui.scene.setRenderQuality(e.target.value); ui.savePrefs(); ui.draw(); };
        body.querySelector("#frame-rate").onchange = e => { p.frameRate = validFrameRate(e.target.value); ui.scene.setFramePacing({ mode: p.frameRate, tv: !!p.tvMode }); ui.savePrefs(); ui.draw(); };
        body.querySelector("#toggle-glow").onclick = flip("glow", (on) => ui.scene.setBloom(on));
        const ambience = () => ui.scene.setAmbience({ mist: p.mist, lake: p.lakeLights });
        body.querySelector("#toggle-mist").onclick = flip("mist", ambience);
        body.querySelector("#toggle-lake").onclick = flip("lakeLights", ambience);
        body.querySelector("#fit-view").onclick = () => { ui.scene.fitView(); ui.closeSheet(); };
        body.querySelector("#watch-intro").onclick = () => { ui.closeSheet(); ui.intro.play(); };
        body.querySelector("#toggle-shadows").onclick = flip("shadows", (on) => ui.scene.setShadows(on));
        body.querySelector("#toggle-voxel-characters").onclick = flip("voxelCharacters", (on) => ui.scene.setVoxelCharacters(on));
        // Save files (ui/save-files.js).
        const said = { saved: "Saved. Load that file into any version of the game, on any device.", downloaded: "Saved to your downloads. Load that file into any version of the game, on any device.", shared: "Save file shared." };
        body.querySelector("#save-file").onclick = async () => { const how = await ui.files.saveToFile(); if (said[how]) ui.notice(said[how]); else if (how === "failed") ui.notice("The file couldn't be saved here. Try Share, or Backup as text."); ui.draw(); };
        body.querySelector("#share-save")?.addEventListener("click", async () => { const how = await ui.files.share(); if (said[how]) ui.notice(said[how]); else if (how === "failed") ui.notice("Sharing didn't work here. Try Save to a file."); ui.draw(); });
        body.querySelector("#load-file").onclick = async () => { const got = await ui.files.pick(); if (!got) return; if (got.ok) { pending = got; fileError = ""; } else { pending = null; fileError = got.reason; } ui.draw(); body.querySelector("#confirm-load")?.focus({ preventScroll: true }); };
        body.querySelector("#confirm-load")?.addEventListener("click", () => { if (!ui.files.load(pending)) { fileError = "There wasn’t room on this device to load that farm."; pending = null; ui.draw(); } });
        body.querySelector("#cancel-load")?.addEventListener("click", () => { pending = null; ui.draw(); });
        body.querySelector("#undo-load")?.addEventListener("click", () => { if (!ui.files.undo()) ui.notice("That farm couldn't be brought back."); });
        body.querySelector("#copy-backup").onclick = async () => {
          const text = ui.files.text();
          try { await navigator.clipboard.writeText(text); ui.notice("Backup copied. Keep it somewhere safe."); }
          catch { restoreText = text; ui.draw(); body.querySelector("#restore-text")?.select(); ui.notice("Copy the backup from the box below."); }
        };
        // The pasted text lives outside the sheet's HTML, so typing never redraws it.
        const area = body.querySelector("#restore-text"), restoreButton = body.querySelector("#restore-backup");
        area.value = restoreText; restoreButton.disabled = !restoreText.trim();
        area.oninput = () => { restoreText = area.value; restoreButton.disabled = !restoreText.trim(); };
        // A pasted backup shows the same card as a file before it loads.
        body.querySelector("#restore-backup").onclick = () => {
          const got = readSaveFile(restoreText);
          if (got.ok) { pending = got; restoreError = ""; } else { pending = null; restoreError = "That doesn’t look like a backup from this game."; }
          ui.draw(); body.querySelector("#save-section")?.scrollIntoView({ block: "start", behavior: "smooth" });
        };
        body.querySelector("#reset").onclick = () => { if (!confirmReset) { confirmReset = true; ui.draw(); return; } ui.files.load({ ok: true, state: M.freshState() }); };
      },
    },
  };
}
