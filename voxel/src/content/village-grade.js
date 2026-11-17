// Display-only Lantern Night palettes, in the already-spread WORLD grid.
// The clock is existing saved active village time; no wall-clock or save field.
import { PLAN_SCALE as K } from "./village.js";
import { EXPANSION_AREA_BY_ID } from "./village-expansion.js";
import { TOWN_SQUARE } from "../rules/village-spread.js";

export const VILLAGE_GRADE_BLEND_WIDTH = 6;
export const VILLAGE_ATMOSPHERE_CYCLE_SECONDS = 2700;
const linear = value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
const colour = hex => Object.freeze([linear((hex >> 16 & 255) / 255), linear((hex >> 8 & 255) / 255), linear((hex & 255) / 255)]);
const palette = (id, fog, sky, ground, moon, lamp, shadows, lights, saturation = 1.06) => Object.freeze({
  id, fog: colour(fog), sky: colour(sky), ground: colour(ground), moon: colour(moon), lamp: colour(lamp),
  shadows: Object.freeze(shadows), lights: Object.freeze(lights), saturation, contrast: 1.04, vignette: .21,
});
export const VILLAGE_DISTRICT_GRADES = Object.freeze({
  green: palette("green", 0x292334, 0x8792b0, 0x3a303b, 0xd8d8e8, 0xffac64, [.006, .004, .012], [.018, .009, -.005]),
  square: palette("square", 0x332538, 0x9691b2, 0x402d3a, 0xe6d8dd, 0xffbb76, [.010, .002, .012], [.025, .012, -.007], 1.08),
  copse: palette("copse", 0x1e302f, 0x839f9b, 0x263d2e, 0xd1e0d8, 0xf5be7d, [.001, .010, .007], [.011, .016, .002]),
  quarry: palette("quarry", 0x24333d, 0x8a9fb2, 0x2d3940, 0xd2e1e5, 0xffb77c, [.001, .007, .012], [.008, .013, .010], 1.02),
  moor: palette("moor", 0x342e3d, 0x9b95ab, 0x3e3340, 0xded7e3, 0xffb078, [.009, .002, .012], [.014, .008, .003], .98),
  marsh: palette("marsh", 0x243b3b, 0x88a4ae, 0x263c39, 0xd0e1e6, 0xf5c288, [.001, .010, .013], [.008, .015, .011], 1.01),
  acre: palette("acre", 0x332d2d, 0xa09b92, 0x40382c, 0xe0ddcc, 0xffbc70, [.008, .007, .001], [.022, .014, -.004], 1.03),
});
const square = [TOWN_SQUARE.x0 * K, TOWN_SQUARE.z0 * K, TOWN_SQUARE.x1 * K, TOWN_SQUARE.z1 * K];
export const VILLAGE_GRADE_ZONES = Object.freeze(["square", "copse", "quarry", "moor", "marsh", "acre"].map(id => Object.freeze({ id, bounds: Object.freeze(id === "square" ? square : [...EXPANSION_AREA_BY_ID[id].bounds]) })));
const COLOURS = ["fog", "sky", "ground", "moon", "lamp", "shadows", "lights"], SCALARS = ["saturation", "contrast", "vignette"];
const TIME_SCALARS = ["exposure", "hemi", "sun", "fogScale"];
const TIME_STATES = Object.freeze([
  { name: "night", warmth: 0, exposure: 1.15, hemi: .98, sun: 1.32, fogScale: 1 },
  { name: "dawn", warmth: .012, exposure: 1.18, hemi: 1.02, sun: 1.38, fogScale: .94 },
  { name: "dusk", warmth: .020, exposure: 1.13, hemi: .94, sun: 1.26, fogScale: 1.06 },
]);
const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

export function createVillageGradeSample() {
  return { ...Object.fromEntries(COLOURS.map(key => [key, [0, 0, 0]])), saturation: 1, contrast: 1, vignette: 0, exposure: 1.15, hemi: .98, sun: 1.32, fogScale: 1, district: "green", phase: "night" };
}

// Continuous over rectangle edges and corners; only six fixed zones are read.
// Explicit priority handles the Green/Square overlap without a nearest-id jump.
export function villageAtmosphereAt(point, seconds = 0, out = createVillageGradeSample()) {
  const base = VILLAGE_DISTRICT_GRADES.green;
  for (const key of COLOURS) for (let i = 0; i < 3; i++) out[key][i] = base[key][i];
  for (const key of SCALARS) out[key] = base[key];
  out.district = "green";
  if (Number.isFinite(point?.x) && Number.isFinite(point?.z)) for (const zone of VILLAGE_GRADE_ZONES) {
    const [x0, z0, x1, z1] = zone.bounds;
    const edge = Math.min(point.x - x0, x1 - point.x, point.z - z0, z1 - point.z), weight = smooth(.5 + edge / VILLAGE_GRADE_BLEND_WIDTH), target = VILLAGE_DISTRICT_GRADES[zone.id];
    if (!weight) continue;
    for (const key of COLOURS) for (let i = 0; i < 3; i++) out[key][i] += (target[key][i] - out[key][i]) * weight;
    for (const key of SCALARS) out[key] += (target[key] - out[key]) * weight;
    if (weight >= .5) out.district = zone.id;
  }
  // A long, gentle night→dawn→dusk cycle keeps the village moonlit. Starting
  // saves begin at night; pausing or reloading never resets or jumps the phase.
  const clock = Number.isFinite(seconds) ? Math.max(0, seconds) : 0, phase = clock % VILLAGE_ATMOSPHERE_CYCLE_SECONDS / VILLAGE_ATMOSPHERE_CYCLE_SECONDS * 3;
  const part = Math.floor(phase), blend = smooth(phase - part);
  const a = TIME_STATES[part], b = TIME_STATES[(part + 1) % TIME_STATES.length], warmth = a.warmth + (b.warmth - a.warmth) * blend;
  for (const key of TIME_SCALARS) out[key] = a[key] + (b[key] - a[key]) * blend;
  out.phase = blend < .5 ? a.name : b.name;
  out.lights[0] += warmth; out.lights[1] += warmth * .32;
  return out;
}
