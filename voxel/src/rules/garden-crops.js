// The garden's beds: a bramble patch, an herb planter, a vegetable bed and an
// apple tree grow while the farm runs, as the patch does. Plant one, water it
// once to hurry it along, and pick it when it is ripe. The crop goes into the
// kitchen's pantry while there is room, and the rest sells at the village
// market for its delivery price. A bed's crop lives on its placed piece, so
// storing the bed clears it and moving the bed keeps it.
import { ESTATE_DECOR_BY_ID } from "../content/house-estate.js";
import { INGREDIENT_BY_ID } from "../content/cooking.js";
import { pantryCapacity, pantryCount } from "./cooking.js";

export const GARDEN_WATERING = .6;                       // watering leaves 60% of the growing still to do
const PHASES = ["empty", "growing", "ready"];

export const gardenCropOf = (id) => ESTATE_DECOR_BY_ID[id]?.crop ?? null;
export function gardenBed(s, instance) {
  const piece = s?.estate?.placed?.find((p) => p.instance === instance), crop = piece && gardenCropOf(piece.id);
  return crop ? { piece, crop, state: piece.crop ?? { phase: "empty" } } : null;
}
// How far along a bed is, for drawing it: empty, sprouting, growing or ripe.
export function gardenBedStage(piece) {
  const crop = gardenCropOf(piece?.id), state = piece?.crop;
  if (!crop || !state || state.phase === "empty") return "empty";
  if (state.phase === "ready") return "ready";
  return state.remaining > crop.seconds * .55 ? "sprout" : "growing";
}
// What the action button would do at this bed now.
export function gardenBedAction(s, instance) {
  const bed = gardenBed(s, instance); if (!bed) return null;
  const { phase, watered } = bed.state;
  if (phase === "empty") return { kind: "plant", label: `Plant ${bed.crop.name}` };
  if (phase === "ready") return { kind: "harvest", label: `Pick ${bed.crop.amount} ${bed.crop.name}` };
  return watered ? { kind: "wait", label: `${bed.crop.name[0].toUpperCase() + bed.crop.name.slice(1)} growing` } : { kind: "water", label: `Water the ${bed.crop.name}` };
}

export function plantGardenBed(s, instance) {
  const bed = gardenBed(s, instance);
  if (!bed || s.paused || bed.state.phase !== "empty") return false;
  bed.piece.crop = { phase: "growing", remaining: bed.crop.seconds, watered: false }; return true;
}
export function waterGardenBed(s, instance) {
  const bed = gardenBed(s, instance);
  if (!bed || s.paused || bed.state.phase !== "growing" || bed.state.watered) return false;
  bed.piece.crop = { ...bed.state, remaining: bed.state.remaining * GARDEN_WATERING, watered: true }; return true;
}
// Picks a ripe bed. Returns what happened to the crop, or false.
export function pickGardenBed(s, instance) {
  const bed = gardenBed(s, instance);
  if (!bed || s.paused || bed.state.phase !== "ready") return false;
  const { yields, amount } = bed.crop, k = s.kitchen;
  const room = k?.purchased && k.pantry && yields in k.pantry ? Math.max(0, pantryCapacity(s) - pantryCount(s)) : 0;
  const pantry = Math.min(amount, room), sold = amount - pantry, coins = sold * (INGREDIENT_BY_ID[yields]?.price ?? 2);
  if (pantry) k.pantry[yields] += pantry;
  if (coins) { s.coins += coins; s.earned += coins; }
  bed.piece.crop = { phase: "empty" };
  return { yields, amount, pantry, sold, coins };
}
export function updateGardenCrops(s, dt) {
  if (s.paused || !(dt > 0)) return;
  for (const p of s.estate?.placed ?? []) {
    if (p.crop?.phase !== "growing") continue;
    p.crop.remaining -= dt;
    if (p.crop.remaining <= 0) p.crop = { phase: "ready", remaining: 0, watered: p.crop.watered };
  }
}
// A saved crop, checked: an unknown phase or a bad timer starts the bed afresh.
export function restoreGardenCrop(raw, id) {
  const crop = gardenCropOf(id);
  if (!crop || !raw || typeof raw !== "object" || !PHASES.includes(raw.phase) || raw.phase === "empty") return null;
  if (raw.phase === "ready") return { phase: "ready", remaining: 0, watered: raw.watered === true };
  const remaining = Number(raw.remaining);
  return Number.isFinite(remaining) ? { phase: "growing", remaining: Math.max(0, Math.min(crop.seconds, remaining)), watered: raw.watered === true } : null;
}
