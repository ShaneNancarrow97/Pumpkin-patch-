// Automatic render detail: draw fewer pixels while the picture falls behind its
// frame cap, and more again once there is room. It watches frames actually
// shown (WebGL's drawn frames, WebGPU's completed ones), a second at a time, so
// it works the same whichever renderer is on screen. Pure: it sees only times
// and counts, so tests can play it any pattern.
//
// It lowers detail only when the main thread is not the cause: fewer pixels
// can't help a frame that is late because of the game's own work.
export const RESOLUTION_STEPS = Object.freeze([1, .88, .77, .67, .58]);
const WINDOW = 1000, SLOW = .82, ROOMY = .96, COOLDOWN = 3000, MAX_PATIENCE = 32;

export function createResolutionGovernor({ steps = RESOLUTION_STEPS } = {}) {
  let step = 0, start = null, shownAt = 0, cpu = 0, ticks = 0, slow = 0, roomy = 0, patience = 3, changedAt = -Infinity, raisedAt = -Infinity;
  const reset = () => { start = null; cpu = 0; ticks = 0; };
  function change(to, now) {
    if (to === step) return null;
    if (to > step && now - raisedAt < 8000) patience = Math.min(MAX_PATIENCE, patience * 2); // it was raised and fell straight back: wait longer next time
    if (to < step) raisedAt = now;
    step = to; changedAt = now; slow = roomy = 0; reset();
    return steps[step];
  }
  return {
    get scale() { return steps[step]; },
    get step() { return step; },
    get patience() { return patience; },
    // A frame came round: `shown` counts frames that reached the screen so far, `capFps` is the pacer's cap
    // (0 for every refresh), `cpuMs` the game's own work this frame. Returns a new scale when it changes.
    sample(now, shown, { capFps = 60, cpuMs = 0, ignore = false } = {}) {
      if (ignore || !Number.isFinite(now) || !Number.isFinite(shown)) { reset(); return null; }
      if (start === null) { start = now; shownAt = shown; return null; }
      cpu += Math.max(0, cpuMs || 0); ticks++;
      const span = now - start;
      if (span > WINDOW * 4) { reset(); return null; }          // a hidden tab or a long stall, not the pace
      if (span < WINDOW) return null;
      const fps = (shown - shownAt) * 1000 / span, target = capFps > 0 ? capFps : 60, budget = 1000 / target, busy = ticks ? cpu / ticks : 0;
      reset(); start = now; shownAt = shown;
      if (now - changedAt < COOLDOWN) return null;
      if (fps < target * SLOW && busy < budget * .7) { roomy = 0; if (++slow >= 2 && step < steps.length - 1) return change(step + 1, now); return null; }
      slow = 0;
      if (fps >= target * ROOMY && step > 0) { if (++roomy >= patience) return change(step - 1, now); }
      else roomy = 0;
      return null;
    },
    // A new quality choice, size or renderer starts from full detail again.
    restart() { step = 0; slow = roomy = 0; patience = 3; changedAt = -Infinity; raisedAt = -Infinity; reset(); },
  };
}
