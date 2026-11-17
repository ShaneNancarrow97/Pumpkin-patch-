// Widely spaced single flashes: deterministic owner-only atmosphere, never a
// random simulation event or repeated strobe. Gentle mode suppresses them.
export const HAYRIDE_LIGHTNING_TIMES = Object.freeze([13.2, 40.4, 69.1]);
export function hayrideLightning(elapsed, { gentle = false, lightning = true, paused = false } = {}) {
  if (gentle || !lightning || paused || !Number.isFinite(elapsed)) return 0;
  let light = 0;
  for (const at of HAYRIDE_LIGHTNING_TIMES) {
    const age = elapsed - at;
    if (age >= 0 && age < .72) light = Math.max(light, Math.exp(-age * 7) * (1 - age / .72));
  }
  return light;
}
