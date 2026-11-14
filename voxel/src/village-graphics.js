// Presentation preferences stay separate from the farm's saved progression.
// Missing village overrides inherit the older glow/shadow choices once.
export const DEFAULT_VILLAGE_GRAPHICS = Object.freeze({ villageRenderer: "auto", villagePost: "balanced", villageShadows: true, villageDistance: "far", villageGrass: "high" });
const choices = rows => Object.freeze(rows.map(([id, name, detail]) => Object.freeze({ id, name, detail })));
export const VILLAGE_GRAPHICS_OPTIONS = Object.freeze({
  villageRenderer: choices([["auto", "Automatic", "Uses WebGPU when supported, with a safe WebGL fallback."], ["webgpu", "WebGPU", "Tries the newer renderer. Falls back safely if unavailable."], ["webgl", "WebGL", "The compatible renderer for older browsers and devices."]]),
  villagePost: choices([["off", "Off", "A clean picture without bloom or colour effects. Lowest graphics load."], ["low", "Subtle", "Gentler lantern glow and colour grading."], ["balanced", "Balanced", "The village’s original glow and colour."], ["high", "Rich", "Stronger lantern glow and deeper colour."]]),
  villageDistance: choices([["near", "Near", "Less distant scenery, blended into the mist."], ["balanced", "Balanced", "A middle distance with a gradual mist fade."], ["far", "Far", "The full village view and distant detail."]]),
  villageGrass: choices([["off", "Off", "Keep the ground texture without grass blades."], ["low", "Low", "Fewer blades for lighter rendering."], ["balanced", "Balanced", "A lighter lawn with detail nearby."], ["high", "High", "Full nearby grass with gradual distance fading."]]),
});
export const VILLAGE_GRAPHICS_KEYS = Object.freeze(Object.keys(DEFAULT_VILLAGE_GRAPHICS));
export function normaliseVillageGraphics(prefs = {}) {
  const p = prefs && typeof prefs === "object" && !Array.isArray(prefs) ? prefs : {};
  const out = { ...DEFAULT_VILLAGE_GRAPHICS, villagePost: p.glow === false ? "off" : "balanced", villageShadows: p.shadows !== false };
  for (const [key, options] of Object.entries(VILLAGE_GRAPHICS_OPTIONS)) if (options.some(option => option.id === p[key])) out[key] = p[key];
  if (typeof p.villageShadows === "boolean") out.villageShadows = p.villageShadows;
  return out;
}
const POST = Object.freeze({
  off: Object.freeze({ id: "off", enabled: false, bloom: 0, grade: 0 }),
  low: Object.freeze({ id: "low", enabled: true, bloom: .45, grade: .5 }),
  balanced: Object.freeze({ id: "balanced", enabled: true, bloom: 1, grade: 1 }),
  high: Object.freeze({ id: "high", enabled: true, bloom: 1.25, grade: 1.15 }),
});
export const villagePostProfile = value => typeof value === "string" && Object.hasOwn(POST, value) ? POST[value] : POST.balanced;

// Both renderers interpolate from neutral grading by the same amount.
// Reuse the destination so the native frame loop creates no temporary arrays.
export function scaleVillageGrade(source, amount, out) {
  const g = source ?? {};
  out.saturation = 1 + ((g.saturation ?? 1) - 1) * amount;
  out.contrast = 1 + ((g.contrast ?? 1) - 1) * amount;
  out.vignette = (g.vignette ?? 0) * amount;
  for (let i = 0; i < 3; i++) { out.shadows[i] = (g.shadows?.[i] ?? 0) * amount; out.lights[i] = (g.lights?.[i] ?? 0) * amount; }
  return out;
}
