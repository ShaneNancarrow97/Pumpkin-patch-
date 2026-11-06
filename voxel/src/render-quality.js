// Bound the full scene's pixel count, without lowering only the glow path.
export const RENDER_QUALITIES = [
  { id: "sharp", name: "Sharp", maxDpr: 2, maxPixels: 4000000 },
  { id: "balanced", name: "Balanced", maxDpr: 1.5, maxPixels: 2500000 },
  { id: "performance", name: "Performance", maxDpr: 1, maxPixels: 1250000 },
];
export const validRenderQuality = value => RENDER_QUALITIES.some(q => q.id === value) ? value : "sharp";
// A phone mirrored to a TV sends its screen as 720p or 1080p video, fitted
// inside 1920 × 1080. TV mode draws no more pixels than that shows (an
// unfolded phone would draw twice as many), and no fewer, or the TV
// stretches the picture and faces go soft (a folded phone's wide screen).
export const TV_CAST = Object.freeze({ width: 1920, height: 1080 });
export const tvPixelRatio = (width, height) => Math.max(1, Math.min(TV_CAST.width / width, TV_CAST.height / height));
// `close`: a small scene seen up close (the carving bench) can afford sharper pixels.
// `tv`: no denser than the cast, after the rest.
export function renderSizing(width, height, deviceRatio = 1, value = "sharp", close = false, tv = false) {
  const base = RENDER_QUALITIES.find(q => q.id === validRenderQuality(value)), near = close ? { ...base, maxDpr: Math.min(3, base.maxDpr * 1.5), maxPixels: base.maxPixels * 1.6 } : base;
  const safe = n => Number.isFinite(n) && n > 0 ? n : 1;
  const w = Math.max(1, Math.round(safe(width))), h = Math.max(1, Math.round(safe(height)));
  const quality = tv ? { ...near, maxDpr: Math.min(near.maxDpr, tvPixelRatio(w, h)) } : near;
  const pixelRatio = Math.min(safe(deviceRatio), quality.maxDpr, Math.sqrt(quality.maxPixels / w / h));
  return { quality: quality.id, pixelRatio, postprocessRatio: pixelRatio, width: w, height: h, bufferWidth: Math.max(1, Math.floor(w * pixelRatio)), bufferHeight: Math.max(1, Math.floor(h * pixelRatio)) };
}
