// Arranging furniture on a pad (handover 72). In a room, the garden or the foyer, off
// play mode, with nothing in hand and no menu open, the stick or D-pad shows a
// gold outline on the piece nearest the middle of the screen, then hops it to
// the piece that way; L1 / R1 step through them in reading order. ✕ picks the
// piece up (ui/pad-placement.js moves it from there, and puts the outline back
// on it when it's put down). △ opens the catalogue, ○ puts the outline away,
// and the right stick slides the room's camera along, or turns the garden's and the foyer's.
// The choosing is pure (pad-arrange.js); this reads the pad and the scene.
import { pieceInDirection, nearestSpot, cycleSpot } from "../pad-arrange.js";

const PUSH = .5, FIRST_MS = 340, REPEAT_MS = 210;

export function createPadArrange({ scene, house, estate, foyer = () => null, catalogue, feel = () => {} }) {
  let on = false, hovered = null, place = null, stepKey = "", stepAt = 0, then = performance.now();
  const where = () => (["room", "estate", "foyer"].includes(scene.place?.kind) ? scene.place.kind : null);
  function show(id) { hovered = id; scene.hoverPiece(id); }
  // Puts the outline away; with `clear` false it leaves the scene's outline, which is then a real selection's (a tap picked a piece up).
  function hide(clear = true) { if (hovered && clear) scene.hoverPiece(null); on = false; hovered = null; }
  const middle = () => ({ x: innerWidth / 2, y: innerHeight * .45 });
  return {
    get on() { return on; },
    get hovered() { return hovered; },
    get place() { return where(); },
    hide,
    // A piece put down: the outline goes back on it, ready for the next.
    focus(id) { if (!where() || !id) return; on = true; show(id); },
    // Every frame a pad is connected, off play mode, with nothing in hand and
    // no menu open. True when it used the pad (or holds the outline).
    tick({ pad, down, pressed }) {
      const w = where();
      if (w !== place) { hide(); place = w; }
      if (!w) return false;
      const now = performance.now(), dt = Math.min(.1, (now - then) / 1000); then = now;
      // The right stick: the room's camera slides along; the garden's and the foyer's turn.
      const rx = pad.axes[2] ?? 0;
      if (Math.abs(rx) > .2) { if (w === "room") scene.panRoom(rx * dt * 4.5); else (w === "estate" ? scene.estateCamera : scene.foyerCamera)?.rotate?.(-rx * dt * 110); }
      const lx = pad.axes[0] ?? 0, ly = pad.axes[1] ?? 0;
      const dir = Math.hypot(lx, ly) > PUSH ? [lx, ly] : down[12] ? [0, -1] : down[13] ? [0, 1] : down[14] ? [-1, 0] : down[15] ? [1, 0] : null;
      const key = dir ? (Math.abs(dir[0]) > Math.abs(dir[1]) ? (dir[0] > 0 ? "r" : "l") : (dir[1] > 0 ? "d" : "u")) : "";
      let used = false;
      if (dir && (key !== stepKey || now >= stepAt)) {
        stepAt = now + (key !== stepKey ? FIRST_MS : REPEAT_MS); stepKey = key; used = true;
        const spots = scene.pieceSpots(), at = spots.find((s) => s.id === hovered);
        const next = on && at ? pieceInDirection(spots, at, dir[0], dir[1]) : nearestSpot(spots, middle().x, middle().y);
        if (next) { on = true; show(next.id); feel("tick"); }
      } else if (!dir) stepKey = "";
      if (pressed(4) || pressed(5)) {
        const next = cycleSpot(scene.pieceSpots(), hovered, pressed(5) ? 1 : -1);
        if (next) { on = true; show(next.id); feel("tick"); } used = true;
      }
      // ✕ picks up the piece the outline is on.
      if (on && hovered && pressed(0)) {
        const id = hovered; hide();
        if (w === "room") house.select(id); else if (w === "estate") estate()?.select?.(id); else foyer()?.select?.(id);
        feel("select"); return true;
      }
      if (pressed(3)) { hide(); catalogue(w); feel("select"); return true; }
      if (on && pressed(1)) { hide(); feel("tick"); return true; }
      return used || on;
    },
  };
}
