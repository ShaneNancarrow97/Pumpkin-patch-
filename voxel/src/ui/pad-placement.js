// Moving furniture on a pad, wherever it is: the house's rooms, the garden and
// the Hollow House foyer. The left stick glides the piece the way the camera
// sees it (in the house it slides to the clear spot nearest, as a drag does;
// in the garden and foyer it stops at the last spot it fits). The D-pad steps
// it, L1 and R1 turn it (a house wall piece goes round to the next wall), ✕ or
// ○ finishes, and □ undoes. Wall pieces and pieces on a table step rather
// than glide, so they keep to their wall or top.
import * as M from "../model.js";

const GLIDE = 3.4, DEAD = .22, STEP_MS = 140, FIRST_STEP_MS = 320, LEASH = .7;

export function createPadPlacement({ scene, state, house, estate, foyer, feel = () => {}, placed = () => {} }) {
  let glide = null, stepDir = "", stepAt = 0, then = performance.now();
  const housePiece = () => state().house.placed.find((q) => q.instance === house.selected);
  // Which tool has a piece in hand: the house's, the garden's or the foyer's.
  function kind() {
    if (house.selected && scene.place?.kind === "room" && housePiece()) return "house";
    if (estate()?.active) return "estate";
    if (foyer()?.active) return "foyer";
    return null;
  }
  const tool = (k) => (k === "estate" ? estate() : foyer());
  // A stick or D-pad push on screen, as a direction on the ground.
  function onGround(sx, sy) {
    const a = scene.groundAxes?.() ?? { right: { x: 1, z: 0 }, down: { x: 0, z: 1 } };
    return { x: a.right.x * sx + a.down.x * sy, z: a.right.z * sx + a.down.z * sy };
  }
  function start(k) {
    if (k === "house") {
      const s = state(), p = housePiece();
      if (!p || p.on || M.footprint(p.id).layer === "wall") return null;
      const fp = M.pieceFootprint(p), at = { x: p.x + fp.w / 2, z: p.z + fp.d / 2 };
      if (!house.beginDrag({ ...at })) return null;
      const r = M.placementRange(s, p);
      return { k, x: at.x, z: at.z, box: { x0: r.x0 + fp.w / 2 - .3, x1: r.x1 + fp.w / 2 + .3, z0: r.z0 + fp.d / 2 - .3, z1: r.z1 + fp.d / 2 + .3 } };
    }
    const t = tool(k), p = t?.placement ?? t?.pose?.();
    if (!t?.beginGesture?.()) return null;
    const at = p ?? { x: 0, z: 0 };
    return { k, x: at.x, z: at.z, okX: at.x, okZ: at.z };
  }
  function move(g, dx, dz) {
    g.x += dx; g.z += dz;
    if (g.k === "house") {
      g.x = Math.max(g.box.x0, Math.min(g.box.x1, g.x)); g.z = Math.max(g.box.z0, Math.min(g.box.z1, g.z));
      house.dragTo({ x: g.x, z: g.z }); return;
    }
    // The garden and foyer stop a piece where it last fit; the target stays on a short leash so it comes back at once.
    const d = Math.hypot(g.x - g.okX, g.z - g.okZ);
    if (d > LEASH) { g.x = g.okX + (g.x - g.okX) * LEASH / d; g.z = g.okZ + (g.z - g.okZ) * LEASH / d; }
    if (tool(g.k).dragTo(g.x, g.z)) { g.okX = g.x; g.okZ = g.z; }
  }
  function stop() {
    if (!glide) return;
    const g = glide; glide = null;
    if (g.k === "house") house.endDrag(); else tool(g.k)?.endGesture?.();
  }
  // One step on the D-pad (or the stick, for pieces that step): the house's
  // own steps hop what's in the way; the garden's and foyer's move a fixed amount.
  function step(k, sx, sy) {
    if (k === "house") { house.nudge(sx, sy); return; }
    const w = onGround(sx, sy), size = k === "estate" ? .25 : .1;
    const [dx, dz] = Math.abs(w.x) >= Math.abs(w.z) ? [Math.sign(w.x) * size, 0] : [0, Math.sign(w.z) * size];
    tool(k).nudge(dx, dz);
  }
  return {
    get kind() { return kind(); },
    // Every frame a pad is connected and nothing else holds it. Returns the tool it drove, or null.
    tick({ pad, down, pressed }) {
      const now = performance.now(), dt = Math.min(.1, (now - then) / 1000); then = now;
      const k = kind();
      if (!k) { stop(); return null; }
      if (glide && glide.k !== k) stop();
      const lx = pad.axes[0] ?? 0, ly = pad.axes[1] ?? 0, push = Math.hypot(lx, ly);
      // The stick: a smooth glide where the piece can glide, otherwise steps that quicken as it's held.
      let dir = "";
      if (push > DEAD) {
        if (!glide) glide = start(k);
        if (glide) {
          const speed = GLIDE * Math.pow(Math.min(1, (push - DEAD) / (1 - DEAD)), 1.6) * dt, w = onGround(lx / push, ly / push);
          move(glide, w.x * speed, w.z * speed);
        } else dir = Math.abs(lx) > Math.abs(ly) ? (lx > 0 ? "r" : "l") : (ly > 0 ? "d" : "u");
      } else stop();
      if (down[12]) dir = "u"; else if (down[13]) dir = "d"; else if (down[14]) dir = "l"; else if (down[15]) dir = "r";
      if (dir && (dir !== stepDir || now >= stepAt)) {
        stepAt = now + (dir !== stepDir ? FIRST_STEP_MS : STEP_MS); stepDir = dir;
        stop(); step(k, dir === "l" ? -1 : dir === "r" ? 1 : 0, dir === "u" ? -1 : dir === "d" ? 1 : 0);
      } else if (!dir) stepDir = "";
      // The right stick looks about while placing: the room's camera slides along, the garden's and the foyer's turn.
      const rx = pad.axes[2] ?? 0;
      if (Math.abs(rx) > .2) { if (k === "house") scene.panRoom?.(rx * dt * 4.5); else (k === "estate" ? scene.estateCamera : scene.foyerCamera)?.rotate?.(-rx * dt * 110); }
      // L1 / R1 turn it; ✕ or ○ finish (and the arrange outline comes back on it, ui/pad-arrange.js); □ undoes.
      if (pressed(4) || pressed(5)) { stop(); const by = pressed(5) ? 15 : -15; if (k === "house") house.rotate(by); else tool(k).rotate(by); feel("tick"); }
      if (pressed(0) || pressed(1)) {
        stop();
        const before = k === "house" ? house.selected : tool(k)?.selected;
        if (k === "house") house.act("done"); else tool(k).done(); feel("select");
        // A new garden or foyer piece gets its instance as it's put down: the newest one.
        const id = typeof before === "string" && before.startsWith("pending:") ? (k === "estate" ? state().estate.placed : state().hollowHouse.foyer.placed).at(-1)?.instance : before;
        if (id) placed(id);
      }
      if (pressed(2)) { stop(); if (k === "house") house.act("undo"); else tool(k).undo(); feel("tick"); }
      return k;
    },
    stop,
  };
}
