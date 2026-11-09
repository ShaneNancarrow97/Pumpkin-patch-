// Real elapsed time, separate from the farm's slowed or frame-clamped clock.
export const IDLE_PAUSE_SECONDS = 210;
export const IDLE_WARNING_SECONDS = 30;

export function idlePadInUse(pads = []) {
  return Array.from(pads).some(g => g && g.connected !== false && (
    Array.from(g.buttons ?? []).some(b => b?.pressed) ||
    g.mapping === 'standard' && [0, 2].some(i => Math.hypot(g.axes?.[i] ?? 0, g.axes?.[i + 1] ?? 0) > .18)
  ));
}

// Only a pause owned by this clock can be resumed by ordinary activity.
export function createIdleBreakClock(now = () => performance.now() / 1000) {
  let lastInput = now(), phase = 'active', remaining = IDLE_PAUSE_SECONDS;
  function activity(paused = false) {
    const resume = phase === 'paused' && paused;
    lastInput = now(); phase = 'active'; remaining = IDLE_PAUSE_SECONDS;
    return resume;
  }
  return {
    activity,
    tick(paused = false, active = false) {
      const resume = active && activity(paused);
      if (paused && phase !== 'paused' || !paused && phase === 'paused') activity();
      let pause = false;
      if (!paused) {
        remaining = Math.max(0, Math.ceil(IDLE_PAUSE_SECONDS - Math.max(0, now() - lastInput)));
        phase = remaining === 0 ? 'paused' : remaining <= IDLE_WARNING_SECONDS ? 'warning' : 'active';
        pause = phase === 'paused';
      }
      return { phase, remaining, pause, resume };
    },
    get status() { return { phase, remaining }; },
  };
}
