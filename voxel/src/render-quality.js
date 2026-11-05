// Bound the full scene's pixel count, without lowering only the glow path.
export const RENDER_QUALITIES = [
  { id: "sharp", name: "Sharp", maxDpr: 2, maxPixels: 4000000 },
  { id: "balanced", name: "Balanced", maxDpr: 1.5, maxPixels: 2500000 },
  { id: "performance", name: "Performance", maxDpr: 1, maxPixels: 1250000 },
];
export const validRenderQuality = value => RENDER_QUALITIES.some(q => q.id === value) ? value : "sharp";
// A phone mirrored to a TV sends the picture as compressed 720p or 1080p
// video while it draws, so fine pixels never reach the screen: TV mode caps
// the density and the pixel count below any quality's own limits.
export const TV_RENDER = Object.freeze({ maxDpr: 1.5, maxPixels: 1600000 });
// `close`: a small scene seen up close (the carving bench) can afford sharper pixels.
// `tv`: the TV caps above, after the rest.
export function renderSizing(width, height, deviceRatio = 1, value = "sharp", close = false, tv = false) {
  const base = RENDER_QUALITIES.find(q => q.id === validRenderQuality(value)), near = close ? { ...base, maxDpr: Math.min(3, base.maxDpr * 1.5), maxPixels: base.maxPixels * 1.6 } : base;
  const quality = tv ? { ...near, maxDpr: Math.min(near.maxDpr, TV_RENDER.maxDpr), maxPixels: Math.min(near.maxPixels, TV_RENDER.maxPixels) } : near;
  const safe = n => Number.isFinite(n) && n > 0 ? n : 1;
  const w = Math.max(1, Math.round(safe(width))), h = Math.max(1, Math.round(safe(height)));
  const pixelRatio = Math.min(safe(deviceRatio), quality.maxDpr, Math.sqrt(quality.maxPixels / w / h));
  return { quality: quality.id, pixelRatio, postprocessRatio: pixelRatio, width: w, height: h, bufferWidth: Math.max(1, Math.floor(w * pixelRatio)), bufferHeight: Math.max(1, Math.floor(h * pixelRatio)) };
}
