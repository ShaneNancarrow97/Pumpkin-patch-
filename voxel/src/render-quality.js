// Bound the full scene's pixel count, without lowering only the glow path.
export const RENDER_QUALITIES = [
  { id: "sharp", name: "Sharp", maxDpr: 2, maxPixels: 4000000 },
  { id: "balanced", name: "Balanced", maxDpr: 1.5, maxPixels: 2500000 },
  { id: "performance", name: "Performance", maxDpr: 1, maxPixels: 1250000 },
];
export const validRenderQuality = value => RENDER_QUALITIES.some(q => q.id === value) ? value : "sharp";
export function renderSizing(width, height, deviceRatio = 1, value = "sharp") {
  const quality = RENDER_QUALITIES.find(q => q.id === validRenderQuality(value));
  const safe = n => Number.isFinite(n) && n > 0 ? n : 1;
  const w = Math.max(1, Math.round(safe(width))), h = Math.max(1, Math.round(safe(height)));
  const pixelRatio = Math.min(safe(deviceRatio), quality.maxDpr, Math.sqrt(quality.maxPixels / w / h));
  return { quality: quality.id, pixelRatio, postprocessRatio: pixelRatio, width: w, height: h, bufferWidth: Math.max(1, Math.floor(w * pixelRatio)), bufferHeight: Math.max(1, Math.floor(h * pixelRatio)) };
}
