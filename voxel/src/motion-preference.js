// Motion: follow the device's "reduce motion" setting, or choose here. Reduced
// keeps the village camera, water, mist and moths gentle wherever they ask.
export const MOTION_CHOICES = Object.freeze([["auto", "Match device"], ["reduced", "Reduced"], ["full", "Full"]]);
export const validMotion = value => MOTION_CHOICES.some(([id]) => id === value) ? value : "auto";
export function prefersReducedMotion(prefs = {}, deviceReduces = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const choice = validMotion(prefs?.reduceMotion);
  return choice === "reduced" ? true : choice === "full" ? false : !!deviceReduces();
}
