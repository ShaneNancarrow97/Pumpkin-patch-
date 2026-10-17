import { pumpkinVarieties } from "../content/products.js";

function freshPlotLevels() {
  return Array(12).fill(0);
}
function freshPlotCrops() {
  return Array(12).fill("pumpkin-orange");
}
function plotVariety(s, i) {
  return pumpkinVarieties[s.plotLevels[i] || 0];
}
function selectedPlotVariety(s, i) {
  return pumpkinVarieties.find((v) => "pumpkin-" + v.id === s.plotCrops[i]);
}
function choosePlotCrop(s, i, productId) {
  const available = 6 + s.upgrades.plots * 3;
  const level2 = pumpkinVarieties.findIndex((v) => "pumpkin-" + v.id === productId);
  if (s.paused || !Number.isInteger(i) || i < 0 || i >= available || level2 < 0 || level2 > s.plotLevels[i]) return false;
  s.plotCrops[i] = productId;
  if (s.plots[i].phase === "empty") s.plots[i].price = pumpkinVarieties[level2].price;
  return true;
}
function upgradePlot(s, i) {
  const available = 6 + s.upgrades.plots * 3;
  if (s.paused || !Number.isInteger(i) || i < 0 || i >= available) return false;
  const previous = plotVariety(s, i), next = pumpkinVarieties[s.plotLevels[i] + 1];
  if (!next || !Number.isFinite(s.coins) || s.coins < next.cost) return false;
  s.coins -= next.cost;
  s.plotLevels[i]++;
  if (s.plotCrops[i] === "pumpkin-" + previous.id) choosePlotCrop(s, i, "pumpkin-" + next.id);
  return true;
}
function restorePlotLevels(raw, plots) {
  if (Array.isArray(raw) && raw.length === 12)
    return raw.map((level2) => Number.isInteger(level2) ? Math.max(0, Math.min(3, level2)) : 0);
  return plots.map((p) => Math.max(0, pumpkinVarieties.findIndex((v) => v.price === p.price)));
}
function restorePlotCrops(raw, levels, version) {
  if (version < 5) return levels.map((level2) => "pumpkin-" + pumpkinVarieties[level2].id);
  if (!Array.isArray(raw) || raw.length !== 12) return null;
  if (raw.some((id, i) => {
    const level2 = pumpkinVarieties.findIndex((v) => "pumpkin-" + v.id === id);
    return level2 < 0 || level2 > levels[i];
  })) return null;
  return [...raw];
}

export { choosePlotCrop, freshPlotCrops, freshPlotLevels, plotVariety, restorePlotCrops, restorePlotLevels, selectedPlotVariety, upgradePlot };
