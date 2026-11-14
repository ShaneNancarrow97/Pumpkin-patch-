import { VILLAGE_GRAPHICS_OPTIONS, normaliseVillageGraphics } from "../village-graphics.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SHADOW_OPTIONS = Object.freeze([{ id: "on", name: "On" }, { id: "off", name: "Off" }]);
const FIELDS = Object.freeze([
  { key: "villageRenderer", name: "Renderer", detail: "Auto chooses the supported renderer for this browser." },
  { key: "villagePost", name: "Post effects", detail: "Adjust lantern glow and the final colour finish." },
  { key: "villageShadows", name: "Shadows", detail: "Turn off cast shadows to reduce graphics work." },
  { key: "villageDistance", name: "Render distance", detail: "How far the outdoor world draws around you." },
  { key: "villageGrass", name: "Grass quality", detail: "Lower levels draw fewer blades. The lawn stays." },
]);
const choices = key => key === "villageShadows" ? SHADOW_OPTIONS : VILLAGE_GRAPHICS_OPTIONS[key];

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

// All five choices stay on one page; a changed value is saved by its caller.
export function villageSettingsMarkup({ prefs = {}, status = {} } = {}) {
  const p = normaliseVillageGraphics(prefs), renderer = villageRendererCopy(status, p);
  const rows = FIELDS.map(({ key, name, detail }, index) => {
    const value = key === "villageShadows" ? p[key] ? "on" : "off" : p[key], id = `vg-setting-${key}`, hint = `${id}-hint`;
    return `<div class="vg-settings-row"><label for="${id}">${name}</label><span class="vg-setting-choice"><select id="${id}" data-village-setting="${key}" data-pad-label="Change ${name.toLowerCase()}"${index === 0 ? " data-pad-default" : ""} aria-describedby="${hint}">${choices(key).map(option => `<option value="${escape(option.id)}"${option.id === value ? " selected" : ""}>${escape(option.name)}</option>`).join("")}</select><span aria-hidden="true">⌄</span></span><small id="${hint}">${detail}</small></div>`;
  }).join("");
  return `<section class="vg-settings" aria-label="Village graphics"><p class="vg-settings-intro">Tune the view for your device. Changes save automatically and apply only in the village.</p><div class="vg-renderer-status" data-renderer-state="${renderer.state}" role="status" aria-live="polite"><i aria-hidden="true"></i><div><strong>${renderer.title}</strong><span>${renderer.detail}</span></div></div><div class="vg-settings-choices">${rows}</div><footer class="vg-settings-footer"><button type="button" data-village-settings-reset data-pad-label="Restore village defaults">Restore defaults</button><small>Detailed scenery, balanced effects and automatic renderer selection.</small></footer></section>`;
}

// Refresh only the status text so an async renderer change cannot steal focus.
export function updateVillageSettingsStatus(body, status = {}, prefs = {}) {
  const el = body.querySelector(".vg-renderer-status");
  if (!el) return;
  const copy = villageRendererCopy(status, prefs), title = el.querySelector("strong"), detail = el.querySelector("span");
  if (el.dataset.rendererState !== copy.state) el.dataset.rendererState = copy.state;
  if (title && title.textContent !== copy.title) title.textContent = copy.title;
  if (detail && detail.textContent !== copy.detail) detail.textContent = copy.detail;
}

// Use change rather than input: the controller sends both for one selection.
export function bindVillageSettings(body, { onChange, onReset } = {}) {
  for (const select of body.querySelectorAll("[data-village-setting]")) {
    select.onchange = () => {
      const key = select.dataset.villageSetting, options = choices(key);
      if (!FIELDS.some(field => field.key === key) || !options?.some(option => option.id === select.value)) return;
      onChange?.(key, key === "villageShadows" ? select.value === "on" : select.value);
    };
  }
  const reset = body.querySelector("[data-village-settings-reset]");
  if (reset) reset.onclick = () => onReset?.();
}
