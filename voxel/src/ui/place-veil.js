// Walking through a doorway: the view blurs and dims, the next place is swapped
// in behind the blur, and it clears again. With reduced motion it only dims.
// The canvas carries the effect (play-controls.css, .place-veil), so the
// controls and the HUD stay sharp.
export const VEIL_IN_MS = 220;
export function createPlaceVeil(canvas) {
  let busy = false;
  return {
    get busy() { return busy; },
    // swap() changes the place; pass() refuses while a pass is still running.
    pass(swap) {
      if (busy) return false;
      busy = true; canvas.classList.add("place-veil");
      setTimeout(() => {
        try { swap(); }
        finally {
          // Two frames of the new place under the blur, then let it clear.
          requestAnimationFrame(() => requestAnimationFrame(() => { canvas.classList.remove("place-veil"); busy = false; }));
        }
      }, VEIL_IN_MS);
      return true;
    },
  };
}
