import { VARIETY_COUNT } from "../content/pumpkin-varieties.js";
// Exact ingredient combinations can teach recipes, without charging for an
// invalid experiment or consuming a reserved customer's pumpkin.
import { INGREDIENT_BY_ID, RECIPES } from "../content/cooking.js";
import { experimentReadiness, startCookingExperiment, maxCookingBatches } from "./cooking.js";

const METHODS = ["pan", "simmer", "bake"];
const equal = (a, b) => Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([id, n]) => b[id] === n);
function ingredientsOf(raw, valid) {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const result = {};
  for (const [id, n] of Object.entries(raw)) {
    if (!valid(id) || !Number.isInteger(n) || n < 0 || n > 9) return null;
    if (n) result[id] = n;
  }
  return result;
}
function resolve(selection) {
  if (!selection || typeof selection !== "object" || !METHODS.includes(selection.method)) return { reason: "Choose frying, simmering or baking." };
  const ingredients = ingredientsOf(selection.ingredients, id => !!INGREDIENT_BY_ID[id]);
  const pumpkins = ingredientsOf(selection.pumpkins, id => /^[0-9]+$/.test(id) && Number(id)<VARIETY_COUNT);
  if (!ingredients || !pumpkins) return { reason: "Use whole ingredient quantities from zero to nine." };
  const types = Object.keys(ingredients).length + Object.keys(pumpkins).length;
  if (!types) return { reason: "Choose ingredients for the pot." };
  if (types > 5) return { reason: "Choose at most five ingredient types." };
  const recipe = RECIPES.find(r => r.method === selection.method && equal(ingredients, r.ingredients) && equal(pumpkins, r.pumpkins));
  return recipe ? { recipe } : { reason: "No recipe yet. Try a different combination or cooking method." };
}
export function previewCookingMix(s, selection) {
  const match = resolve(selection);
  if (!match.recipe) return { ok: false, recipe: null, known: false, level: null, reason: match.reason, missingEquipment: [] };
  const r = match.recipe, station = selection.station ?? "home", batches = selection.batches ?? 1;
  return { ...experimentReadiness(s, r.id, station, batches), recipe: r.id, known: s.kitchen?.recipes.includes(r.id) === true, level: r.level, name: r.name };
}
export function maxCookingMixBatches(s, selection) {
  const match = resolve(selection);
  return match.recipe ? maxCookingBatches(s, match.recipe.id, selection.station ?? "home", true) : 0;
}
export function startCookingMix(s, selection) {
  const preview = previewCookingMix(s, selection);
  return preview.ok ? startCookingExperiment(s, preview.recipe, selection.station ?? "home", selection.batches ?? 1) : false;
}
