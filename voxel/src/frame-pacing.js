// How often the game draws. A phone with a 120 Hz screen would otherwise draw
// twice what anyone sees, and a phone mirrored to a TV encodes the picture as
// video at 30 or 60 frames a second while it draws, so a cap saves heat and
// keeps frames even. Modes:
//   "auto": 60 a second; in TV mode, if 60 can't be held it settles on a
//           steady 30 (even frames look smoother on a cast than uneven ones),
//           and now and then tries 60 again;
//   "30", "60": a fixed cap;  "max": every refresh, as before.
// Behind a centred menu the dimmed farm needs less, so it draws at most 24.
// Pure: it only sees timestamps, so tests can play it any frame pattern.
export const FRAME_RATES = Object.freeze([["auto", "Auto"], ["30", "Steady 30"], ["60", "Smooth 60"], ["max", "Every refresh"]]);
export const validFrameRate = (mode) => (FRAME_RATES.some(([id]) => id === mode) ? mode : "auto");
const SAMPLE = 90, SLOW = 1000 / 48, RETRY = 30000, MENU_CAP = 24;

export function createPacer({ mode = "auto", tv = false } = {}) {
  let settings = { mode: validFrameRate(mode), tv: !!tv }, menu = false;
  let settled = 60, lastDrawn = -Infinity, samples = [], retryAt = Infinity, probing = false, backoff = RETRY;
  const base = () => settings.mode === "max" ? 0 : settings.mode === "30" ? 30 : settings.mode === "60" ? 60 : settings.tv ? settled : 60;
  const cap = () => { const b = base(); return menu ? (b ? Math.min(b, MENU_CAP) : MENU_CAP) : b; };
  // Auto in TV mode: watch the gaps between drawn frames and settle on 30 or 60.
  function adapt(now, gap) {
    if (settings.mode !== "auto" || !settings.tv || menu) return;
    if (gap > 250) { samples = []; return; }                       // a hidden tab or a hitch, not the pace
    samples.push(gap); if (samples.length < SAMPLE) return;
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length; samples = [];
    if (settled === 60 && mean > SLOW) { settled = 30; retryAt = now + backoff; if (probing) backoff = Math.min(backoff * 2, 240000); probing = false; }
    else if (settled === 60 && probing) { probing = false; backoff = RETRY; }
  }
  return {
    get cap() { return cap(); },
    get settled() { return settled; },
    set({ mode, tv } = {}) {
      const next = { mode: validFrameRate(mode ?? settings.mode), tv: tv ?? settings.tv };
      if (next.mode !== settings.mode || next.tv !== settings.tv) { settled = 60; samples = []; retryAt = Infinity; probing = false; backoff = RETRY; }
      settings = next;
    },
    setMenu(on) { menu = !!on; samples = []; },
    // Whether to draw the frame arriving at `now` (ms, as requestAnimationFrame gives it).
    draw(now) {
      if (settled === 30 && now >= retryAt && settings.mode === "auto" && settings.tv && !menu) { settled = 60; probing = true; samples = []; retryAt = Infinity; }
      const c = cap();
      if (c && now - lastDrawn < 1000 / c - 1.5) return false;
      const gap = now - lastDrawn; lastDrawn = now;
      if (Number.isFinite(gap)) adapt(now, gap);
      return true;
    },
  };
}
