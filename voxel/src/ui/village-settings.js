// Settings inside Mothlight: graphics (with the renderer), game, sound and
// controls, on four tabs of the village drawer. L1 and R1 turn the tabs on a
// pad. Graphics choices apply only in the village; game and sound choices are
// the same ones the farm's Settings uses. Every control has a stable id, so a
// redraw keeps the focus where it was.
import { VILLAGE_GRAPHICS_OPTIONS, normaliseVillageGraphics, DEFAULT_VILLAGE_GRAPHICS } from "../village-graphics.js";
import { RENDER_QUALITIES, validRenderQuality } from "../render-quality.js";
import { FRAME_RATES, validFrameRate } from "../frame-pacing.js";
import { MOTION_CHOICES, validMotion } from "../motion-preference.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const VILLAGE_SETTINGS_TABS = Object.freeze(["graphics", "game", "sound", "controls"]);
const TAB_NAMES = { graphics: "Graphics", game: "Game", sound: "Sound", controls: "Controls" };
const SHADOW_OPTIONS = Object.freeze([{ id: "on", name: "On" }, { id: "off", name: "Off" }]);
const FIELDS = Object.freeze([
  { key: "villagePost", name: "Post effects", detail: "Adjust lantern glow and the final colour finish." },
  { key: "villageShadows", name: "Shadows", detail: "Turn off cast shadows to reduce graphics work." },
  { key: "villageShadowDetail", name: "Shadow detail", detail: "Soft draws a quarter of the shadow pixels. Automatic picks Soft on phones and tablets." },
  { key: "villageDistance", name: "Render distance", detail: "How far the outdoor world draws around you." },
  { key: "villageGrass", name: "Grass quality", detail: "Lower levels draw fewer blades. The lawn stays." },
  { key: "villageAtmosphere", name: "Atmosphere", detail: "Moths, drifting motes, fireflies and moonbeams in the night air." },
]);
const choices = key => key === "villageShadows" ? SHADOW_OPTIONS : VILLAGE_GRAPHICS_OPTIONS[key];
const RENDERERS = Object.freeze([
  { id: "auto", name: "Automatic", note: "Best available" },
  { id: "webgpu", name: "WebGPU", note: "Newer, faster" },
  { id: "webgl", name: "WebGL", note: "Most compatible" },
]);
// One press sets everything below to a sensible whole; any later change makes it Custom.
export const VILLAGE_PRESETS = Object.freeze([
  { id: "smooth", name: "Smooth", note: "Fastest and coolest", values: { renderQuality: "auto", villagePost: "low", villageShadows: true, villageShadowDetail: "soft", villageDistance: "balanced", villageGrass: "low", villageAtmosphere: "light" } },
  { id: "balanced", name: "Balanced", note: "The village as made", values: { renderQuality: "auto", villagePost: "balanced", villageShadows: true, villageShadowDetail: "auto", villageDistance: "far", villageGrass: "high", villageAtmosphere: "full" } },
  { id: "beautiful", name: "Beautiful", note: "Every detail, sharpest", values: { renderQuality: "sharp", villagePost: "high", villageShadows: true, villageShadowDetail: "sharp", villageDistance: "far", villageGrass: "high", villageAtmosphere: "full" } },
].map(p => Object.freeze({ ...p, values: Object.freeze(p.values) })));
const RESOLUTION_NOTES = { auto: "Lowers detail only while frames fall behind, and raises it again.", sharp: "Fine edges at up to twice the screen's density.", balanced: "A little softer, for less graphics work.", performance: "One pixel a point: the lightest." };
const RATE_NOTES = { auto: "Up to 60 a second. In TV mode it settles on a steady 30 if 60 can't be held.", "30": "A steady 30: easiest on the battery and even on a cast.", "60": "Up to 60 a second.", max: "Every screen refresh: smoothest on a fast screen, hardest on the battery." };

// Reuse the farm's familiar gear, with a viewBox so the HUD can size it cleanly.
export const villageSettingsIcon = () => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m9 3-.6 2.1-2 .9-2-.5-2 3.5 1.5 1.6-.2 2.2L2 14l2 3.5 2.1-.5 1.8 1.3.6 2.1h4l.6-2.1 2-1 2 .5 2-3.5-1.5-1.6.2-2.2 1.2-1.8-2-3.5-2.1.5-1.8-1.3L13 3Z"/><circle cx="10.5" cy="12" r="3"/></svg>`;

// Name the renderer actually on screen, without exposing a technical error log.
export function villageRendererCopy(status = {}, prefs = {}) {
  const requested = status.requested ?? normaliseVillageGraphics(prefs).villageRenderer;
  if (status.stage === "initializing") return { state: "loading", title: "Preparing WebGPU", detail: "WebGL keeps the village visible while it gets ready." };
  if (status.stage === "fallback") return { state: "fallback", title: "Using WebGL", detail: "WebGPU is unavailable here. Compatibility rendering is active." };
  if (status.backend === "webgpu") return { state: "ready", title: "Using WebGPU", detail: "Your village graphics choices are active." };
  if (requested === "webgl" || status.stage === "disabled") return { state: "ready", title: "Using WebGL", detail: "Compatibility rendering is active." };
  return { state: "loading", title: "Using WebGL · preparing WebGPU", detail: "Your village stays visible during the change." };
}

// What the picture is doing now, in a line: frames a second, the drawn size and the graphics chip.
export function villageLiveLine(info = {}) {
  const parts = [];
  if (Number.isFinite(info.fps)) parts.push(`About ${Math.round(info.fps)} frames a second`);
  if (info.bufferWidth && info.bufferHeight) parts.push(`drawn ${info.bufferWidth} × ${info.bufferHeight}${Number.isFinite(info.scale) && info.scale < .995 ? ` (${Math.round(info.scale * 100)}%)` : ""}`);
  if (info.gpu) parts.push(String(info.gpu).slice(0, 60));
  return parts.join(" · ") || "Measuring…";
}
export const villagePresetFor = (prefs = {}) => {
  const p = { ...normaliseVillageGraphics(prefs), renderQuality: validRenderQuality(prefs.renderQuality) };
  return VILLAGE_PRESETS.find(preset => Object.entries(preset.values).every(([key, value]) => p[key] === value))?.id ?? null;
};

const selectRow = ({ id, name, detail, attr, options, value, disabled = false, padDefault = false }) => {
  const hint = `${id}-hint`;
  return `<div class="vg-settings-row"><label for="${id}">${name}</label><span class="vg-setting-choice"><select id="${id}" ${attr} data-pad-label="Change ${escape(name.toLowerCase())}"${padDefault ? " data-pad-default" : ""}${disabled ? " disabled" : ""} aria-describedby="${hint}">${options.map(option => `<option value="${escape(option.id)}"${option.id === value ? " selected" : ""}>${escape(option.name)}</option>`).join("")}</select><span aria-hidden="true">⌄</span></span><small id="${hint}">${detail}</small></div>`;
};
const toggleRow = ({ key, name, detail, on, disabled = false }) => `<div class="vg-settings-row vg-settings-toggle"><span class="vg-settings-label" id="vg-toggle-${key}-label">${name}</span><button type="button" id="vg-toggle-${key}" class="vg-switch" role="switch" aria-checked="${on}" aria-labelledby="vg-toggle-${key}-label" data-village-toggle="${key}" data-pad-label="${on ? "Turn off" : "Turn on"} ${escape(name.toLowerCase())}"${disabled ? " disabled" : ""}><i aria-hidden="true"></i><span>${on ? "On" : "Off"}</span></button><small>${detail}</small></div>`;
const rangeRow = ({ key, name, value, disabled = false }) => { const v = Math.max(0, Math.min(1, Number(value) || 0)); return `<div class="vg-settings-row vg-settings-range"><label for="vg-range-${key}">${name}</label><span class="vg-range"><input id="vg-range-${key}" type="range" min="0" max="1" step="0.05" value="${v}" data-village-range="${key}" data-pad-label="Adjust ${escape(name.toLowerCase())}"${disabled ? " disabled" : ""} style="--fill:${Math.round(v * 100)}%"><output for="vg-range-${key}">${Math.round(v * 100)}%</output></span></div>`; };
const actionRow = ({ id, name, detail, label, disabled = false, gold = false }) => `<div class="vg-settings-row vg-settings-action"><span class="vg-settings-label">${name}</span><button type="button" id="vg-action-${id}" class="vg-settings-button${gold ? " is-gold" : ""}" data-village-action="${id}"${disabled ? " disabled" : ""}>${label}</button>${detail ? `<small>${detail}</small>` : ""}</div>`;
const heading = text => `<h3 class="vg-settings-heading">${text}</h3>`;

function graphicsPage(p, prefs, status, info) {
  const renderer = villageRendererCopy(status, p), preset = villagePresetFor(prefs), quality = validRenderQuality(prefs.renderQuality);
  const rendererButtons = RENDERERS.map(r => `<button type="button" id="vg-renderer-${r.id}" data-village-renderer="${r.id}" aria-pressed="${p.villageRenderer === r.id}"${p.villageRenderer === r.id ? " data-pad-default" : ""}><b>${r.name}</b><small>${r.note}</small></button>`).join("");
  const presets = VILLAGE_PRESETS.map(x => `<button type="button" id="vg-preset-${x.id}" data-village-preset="${x.id}" aria-pressed="${preset === x.id}"><b>${x.name}</b><small>${x.note}</small></button>`).join("");
  const rows = [
    selectRow({ id: "vg-pref-renderQuality", name: "Resolution", detail: RESOLUTION_NOTES[quality] ?? "", attr: 'data-village-pref="renderQuality"', options: RENDER_QUALITIES.map(q => ({ id: q.id, name: q.name })), value: quality }),
    selectRow({ id: "vg-pref-frameRate", name: "Frame rate", detail: RATE_NOTES[validFrameRate(prefs.frameRate)] ?? "", attr: 'data-village-pref="frameRate"', options: FRAME_RATES.map(([id, name]) => ({ id, name })), value: validFrameRate(prefs.frameRate) }),
    ...FIELDS.map(({ key, name, detail }) => selectRow({ id: `vg-setting-${key}`, name, detail, attr: `data-village-setting="${key}"`, options: choices(key), value: key === "villageShadows" ? p[key] ? "on" : "off" : p[key], disabled: key === "villageShadowDetail" && !p.villageShadows })),
  ].join("");
  return `<p class="vg-settings-intro">Tune the view for your device. Changes save automatically and apply only in the village; resolution and frame rate are shared with the farm.</p>`
    + `<section class="vg-renderer-card" aria-labelledby="vg-renderer-heading"><header><h3 id="vg-renderer-heading">Renderer</h3><div class="vg-renderer-status" data-renderer-state="${renderer.state}" role="status" aria-live="polite"><i aria-hidden="true"></i><div><strong>${renderer.title}</strong><span>${renderer.detail}</span></div></div></header>`
    + `<div class="vg-segmented vg-renderer-choice" role="group" aria-label="Renderer">${rendererButtons}</div><p class="vg-live" data-vg-live>${escape(villageLiveLine(info))}</p></section>`
    + `${heading("Quick setup")}<div class="vg-segmented vg-presets" role="group" aria-label="Quick setup">${presets}</div><p class="vg-preset-note">${preset ? "Change any choice below to make your own." : "Your own mix. Pick one above to start again from a set."}</p>`
    + `<div class="vg-settings-choices">${rows}</div>`
    + `<footer class="vg-settings-footer"><button type="button" data-village-settings-reset id="vg-settings-reset" data-pad-label="Restore village defaults">Restore defaults</button><small>The Balanced set: automatic renderer and resolution, the village's own glow and full scenery.</small></footer>`;
}

function gamePage(prefs, info) {
  const sizes = info.tvSizes ?? [];
  return heading("Play") + toggleRow({ key: "paused", name: "Tea break", detail: "Pause the farm and the village. Nothing grows and nobody visits until you come back.", on: !!info.paused })
    + selectRow({ id: "vg-pref-reduceMotion", name: "Motion", detail: "Reduced keeps the camera, water, mist and moths gentler.", attr: 'data-village-pref="reduceMotion"', options: MOTION_CHOICES.map(([id, name]) => ({ id, name })), value: validMotion(prefs.reduceMotion) })
    + heading("TV and controller") + toggleRow({ key: "tvMode", name: "TV mode", detail: "For a phone on a TV: menus sized for the sofa, and the picture drawn at the size a cast shows.", on: !!prefs.tvMode })
    + (sizes.length ? selectRow({ id: "vg-pref-tvSize", name: "TV menu size", detail: "How big menus and buttons look on the TV.", attr: 'data-village-pref="tvSize"', options: sizes.map(([id, name]) => ({ id, name })), value: prefs.tvSize ?? "standard", disabled: !prefs.tvMode }) : "")
    + heading("Your farm’s save") + `<p class="vg-settings-intro">The farm and the village save themselves as you play. A file keeps a copy you can load on another device or a newer version, from the farm’s Settings.</p>`
    + actionRow({ id: "save-file", name: "Save to a file", detail: info.lastExport ? `Last saved to a file ${escape(info.lastExport)}.` : "Not saved to a file yet.", label: "Save to a file", disabled: !info.canSave, gold: true });
}

function soundPage(prefs, info) {
  const tracks = info.tracks ?? [], track = tracks.find(t => t.id === prefs.musicTrack) ?? tracks[0];
  return heading("Music") + toggleRow({ key: "music", name: "Music", detail: `${tracks.length} offline tracks: originals and your supplied songs.`, on: !!prefs.music })
    + rangeRow({ key: "musicVolume", name: "Music volume", value: prefs.musicVolume, disabled: !prefs.music })
    + (tracks.length ? selectRow({ id: "vg-pref-musicTrack", name: "Now playing", detail: escape(track?.credit ?? ""), attr: 'data-village-pref="musicTrack"', options: tracks.map(t => ({ id: t.id, name: t.name })), value: track?.id, disabled: !prefs.music }) : "")
    + toggleRow({ key: "musicShuffle", name: "Shuffle", detail: "A fresh order without back-to-back repeats.", on: prefs.musicShuffle !== false, disabled: !prefs.music })
    + actionRow({ id: "next-song", name: "Try another tune", label: "Next song", disabled: !prefs.music })
    + heading("Sounds and voices") + toggleRow({ key: "sound", name: "Sound effects", detail: "Gathering, footsteps and soft tones as you play.", on: !!prefs.sound })
    + toggleRow({ key: "voiceEnabled", name: "Voice narration", detail: "Read aloud in Mothlight. Dialogue always stays on screen.", on: !!prefs.voiceEnabled })
    + rangeRow({ key: "voiceVolume", name: "Voice volume", value: prefs.voiceVolume, disabled: !prefs.voiceEnabled })
    + actionRow({ id: "preview-voice", name: "Listen to a voice", label: info.voicePlaying ? "Stop voice" : "Preview voice", disabled: !prefs.voiceEnabled || !Number(prefs.voiceVolume) });
}

const KEYS = {
  controller: [["Left stick", "Walk"], ["R2", "Jog"], ["Right stick", "Look around"], ["R3", "Centre the camera"], ["✕", "Talk, gather or open"], ["○", "Back"], ["□", "Map"], ["△", "People"], ["Options", "Village menus"], ["D-pad up", "Show or hide your followed quest"], ["L1 / R1", "Zoom; in menus, change tab"], ["L2 / R2", "In menus, scroll a page"]],
  keyboard: [["W A S D or arrows", "Walk"], ["Shift", "Run"], ["E, F, X, Space or Enter", "Talk, gather or open"], ["C", "Centre the camera"], ["T", "Show or hide your followed quest"], ["Esc", "Back"], ["Drag / scroll", "Look around / zoom"]],
  touch: [["Left stick", "Walk"], ["Jog button", "Run"], ["Drag the view", "Look around"], ["Pinch", "Zoom"], ["Tap", "Talk to a neighbour, gather or open"]],
};
function controlsPage() {
  const table = (id, title, rows) => `<section class="vg-keys" aria-labelledby="vg-keys-${id}"><h3 class="vg-settings-heading" id="vg-keys-${id}">${title}</h3><dl>${rows.map(([key, does]) => `<div><dt><kbd>${escape(key)}</kbd></dt><dd>${escape(does)}</dd></div>`).join("")}</dl></section>`;
  return `<p class="vg-settings-intro">The same in every part of Mothlight. A controller takes over as soon as you press a button.</p>` + table("controller", "Controller", KEYS.controller) + table("keyboard", "Keyboard and mouse", KEYS.keyboard) + table("touch", "Touch", KEYS.touch);
}

// The page for a tab. `info` carries what only the game knows: tracks, the tea break, frames a second, the GPU.
export function villageSettingsMarkup({ prefs = {}, status = {}, tab = "graphics", info = {} } = {}) {
  const p = normaliseVillageGraphics(prefs), current = VILLAGE_SETTINGS_TABS.includes(tab) ? tab : "graphics";
  const tabs = VILLAGE_SETTINGS_TABS.map(id => `<button type="button" id="vg-settings-tab-${id}" role="tab" aria-selected="${id === current}" aria-controls="vg-settings-page" tabindex="${id === current ? 0 : -1}" data-vg-settings-tab="${id}"><span>${TAB_NAMES[id]}</span></button>`).join("");
  const page = current === "game" ? gamePage(prefs, info) : current === "sound" ? soundPage(prefs, info) : current === "controls" ? controlsPage() : graphicsPage(p, prefs, status, info);
  return `<section class="vg-settings" aria-label="Village settings" data-vg-settings-tab-current="${current}"><div class="vf-journal-tabs vg-settings-tabs" role="tablist" aria-label="Settings sections">${tabs}</div><div id="vg-settings-page" class="vg-settings-page" role="tabpanel" aria-labelledby="vg-settings-tab-${current}">${page}</div></section>`;
}

// Refresh only the live lines so an async renderer change or a frame count cannot steal focus.
export function updateVillageSettingsStatus(body, status = {}, prefs = {}, info = null) {
  const el = body.querySelector(".vg-renderer-status");
  if (el) {
    const copy = villageRendererCopy(status, prefs), title = el.querySelector("strong"), detail = el.querySelector("span");
    if (el.dataset.rendererState !== copy.state) el.dataset.rendererState = copy.state;
    if (title && title.textContent !== copy.title) title.textContent = copy.title;
    if (detail && detail.textContent !== copy.detail) detail.textContent = copy.detail;
  }
  if (info) { const live = body.querySelector("[data-vg-live]"), line = villageLiveLine(info); if (live && live.textContent !== line) live.textContent = line; }
}

// Use change rather than input for selects: the controller sends both for one selection.
// Each control is bound only when it carries its own data attribute.
export function bindVillageSettings(body, { onChange, onReset, onTab, onPref, onToggle, onRange, onAction, onPreset } = {}) {
  for (const select of body.querySelectorAll("[data-village-setting]")) {
    select.onchange = () => {
      const key = select.dataset.villageSetting, options = choices(key);
      if (!FIELDS.some(field => field.key === key) || !options?.some(option => option.id === select.value)) return;
      onChange?.(key, key === "villageShadows" ? select.value === "on" : select.value);
    };
  }
  const reset = body.querySelector("[data-village-settings-reset]");
  if (reset) reset.onclick = () => onReset?.();
  for (const el of body.querySelectorAll("[data-village-renderer]")) if (el.dataset?.villageRenderer) el.onclick = () => { if (RENDERERS.some(r => r.id === el.dataset.villageRenderer)) onChange?.("villageRenderer", el.dataset.villageRenderer); };
  for (const el of body.querySelectorAll("[data-village-preset]")) if (el.dataset?.villagePreset) el.onclick = () => { const preset = VILLAGE_PRESETS.find(x => x.id === el.dataset.villagePreset); if (preset) onPreset?.(preset); };
  for (const el of body.querySelectorAll("[data-vg-settings-tab]")) if (el.dataset?.vgSettingsTab) {
    el.onclick = () => { if (VILLAGE_SETTINGS_TABS.includes(el.dataset.vgSettingsTab)) onTab?.(el.dataset.vgSettingsTab); };
    el.onkeydown = e => {
      const at = VILLAGE_SETTINGS_TABS.indexOf(el.dataset.vgSettingsTab), step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!step) return; e.preventDefault(); e.stopPropagation(); onTab?.(VILLAGE_SETTINGS_TABS[(at + step + VILLAGE_SETTINGS_TABS.length) % VILLAGE_SETTINGS_TABS.length]);
    };
  }
  for (const el of body.querySelectorAll("[data-village-pref]")) if (el.dataset?.villagePref) el.onchange = () => onPref?.(el.dataset.villagePref, el.value);
  for (const el of body.querySelectorAll("[data-village-toggle]")) if (el.dataset?.villageToggle) el.onclick = () => onToggle?.(el.dataset.villageToggle);
  for (const el of body.querySelectorAll("[data-village-range]")) if (el.dataset?.villageRange) el.oninput = () => {
    const v = Math.max(0, Math.min(1, Number(el.value) || 0)); el.style.setProperty("--fill", `${Math.round(v * 100)}%`);
    const out = el.parentElement?.querySelector("output"); if (out) out.textContent = `${Math.round(v * 100)}%`;
    onRange?.(el.dataset.villageRange, v);
  };
  for (const el of body.querySelectorAll("[data-village-action]")) if (el.dataset?.villageAction) el.onclick = () => onAction?.(el.dataset.villageAction);
}
export const VILLAGE_SETTINGS_DEFAULTS = Object.freeze({ ...DEFAULT_VILLAGE_GRAPHICS, renderQuality: "auto" });
