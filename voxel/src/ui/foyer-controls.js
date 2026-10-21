import { setPieceColour, nextPieceColour } from "../rules/piece-colours.js";
import * as H from "../rules/hollow-house.js";
import { FOYER_DECOR_BY_ID } from "../content/hollow-house.js";

// The editor owns only a reversible selection. Paid ownership and geometry
// validation stay in the shared foyer rules.
export function createFoyerControls(ui) {
  const host = document.createElement("aside"); host.className = "estate-controls foyer-controls"; host.hidden = true; host.setAttribute("aria-label", "Foyer decoration controls"); document.body.append(host);
  let selected = null, pending = null, original = null, newlyPlaced = false, history = [], last = "", blocked = false;
  const piece = () => ui.state.hollowHouse.foyer.placed.find(p => p.instance === selected);
  const pose = () => pending ?? piece();
  const save = () => { ui.scene.refreshFoyer(); ui.save(); };
  const preview = () => { const p = pose(); ui.scene.previewFoyerDecor(p ? { ...p, pending: !!pending, valid: H.foyerFits(ui.state, p.id, p.x, p.z, p.rotation, selected, p) } : null); };
  const clear = () => { selected = pending = original = null; history = []; newlyPlaced = false; ui.scene.previewFoyerDecor(null); last = ""; render(); };
  const fail = () => ui.notice(ui.state.paused ? "Resume before decorating." : "Keep the doors, stairs and ticket lanes clear. Wall pieces go on a wall.");
  const button = (id, label, disabled = false) => `<button class="estate-tool" data-foyer-control="${id}" ${disabled ? "disabled" : ""}>${label}</button>`;
  function render() {
    host.hidden = ui.scene.place?.kind !== "foyer" || blocked || !pose(); if (host.hidden) return;
    const p = pose(), def = FOYER_DECOR_BY_ID[p.id], disabled = ui.state.paused;
    const html = `<section class="estate-placement"><header><div><b>${def.name}</b><small>${def.layer === "wall" ? "Tap a wall to hang · " : "Tap the floor to move · "}${Math.round(p.rotation)}°</small></div></header><div class="foyer-piece-actions">${button("left", "↶ 15°", disabled || def.layer === "wall")}${button("right", "↷ 15°", disabled || def.layer === "wall")}${button("undo", "Undo", disabled || !history.length)}${!pending ? button("colour", "Colour", disabled) + button("store", "Store", disabled) : ""}</div><footer>${button("cancel", "Cancel")}${button("done", pending ? "Place here" : "Done", disabled)}</footer></section>`;
    if (html !== last) { host.innerHTML = html; last = html; }
  }
  function apply(x, z, rotation, options = {}) {
    const p = pose(); if (!p || ui.state.paused) return false;
    const candidate = { ...p, ...options, x: Math.round(x * 4) / 4, z: Math.round(z * 4) / 4, rotation: ((rotation % 360) + 360) % 360 };
    if (pending) { history.push({ ...pending }); pending = candidate; preview(); render(); return true; }
    const before = { ...p }, moved = H.moveFoyerDecor(ui.state, selected, candidate.x, candidate.z, candidate.rotation, candidate);
    if (!moved) { fail(); return false; } history.push(before); save(); preview(); render(); return true;
  }
  const tools = {
    get placement() { return pose(); },
    get selected() { return selected ?? (pending ? "pending:" + pending.id : null); }, get active() { return !!pose(); },
    select(instance) { tools.cancel(); const p = ui.state.hollowHouse.foyer.placed.find(p => p.instance === instance); if (!p || ui.state.paused) return false; selected = instance; original = { ...p }; preview(); render(); return true; },
    selectForPlacement(id) {
      tools.cancel(); const d = FOYER_DECOR_BY_ID[id]; if (!d || ui.state.paused || !ui.state.hollowHouse.foyer.ownedDecor[id]) return false;
      const l = H.foyerLayout(ui.state); pending = { id, x: 2.8, z: 2, rotation: 0, ...(d.layer === "wall" ? { wall: "right", x: l.x1 - .13, z: 1, y: 2.2 } : {}) };
      if (d.layer !== "wall") outer: for (let z = l.z1 - .8; z > l.z0 + .7; z -= .5) for (let x = l.x0 + .8; x < l.x1 - .7; x += .5) if (H.foyerFits(ui.state, id, x, z, 0)) { pending.x = x; pending.z = z; break outer; }
      preview(); render(); return true;
    },
    placeAt(x, z, wall, y) {
      const p = pose(); if (!p || ![x, z].every(Number.isFinite) || ui.state.paused) return false;
      if (FOYER_DECOR_BY_ID[p.id].layer === "wall" && !wall) { fail(); return false; }
      const options = wall ? { wall, y: Number.isFinite(y) ? y : p.y ?? 2.2 } : {};
      if (!pending) return apply(x, z, p.rotation, options);
      const placed = H.placeFoyerDecor(ui.state, p.id, Math.round(x * 4) / 4, Math.round(z * 4) / 4, p.rotation, { ...p, ...options });
      if (!placed) { fail(); return false; } selected = placed.instance; pending = null; newlyPlaced = true; history = []; save(); preview(); render(); return true;
    },
    rotate(delta) { const p = pose(); return p ? apply(p.x, p.z, p.rotation + delta, p) : false; },
    nudge(dx, dz) { const p = pose(); return p ? apply(p.x + dx, p.z + dz, p.rotation, p) : false; },
    undo() { if (!history.length || ui.state.paused) return false; const p = history.pop(); if (pending) pending = p; else { H.moveFoyerDecor(ui.state, selected, p.x, p.z, p.rotation, p); setPieceColour(ui.state,"foyer",selected,p.tint??"original"); } save(); preview(); render(); return true; },
    cancel() { if (selected && !ui.state.paused) { if (newlyPlaced) H.storeFoyerDecor(ui.state, selected); else if (original) { H.moveFoyerDecor(ui.state, selected, original.x, original.z, original.rotation, original); if(piece()?.tint||original.tint)setPieceColour(ui.state,"foyer",selected,original.tint??"original"); } save(); } clear(); },
    done() { if (pending && !tools.placeAt(pending.x, pending.z, pending.wall, pending.y)) return false; clear(); ui.save(); return true; },
    tick(suspended = false) { blocked = suspended; if (selected && !piece()) clear(); render(); },
  };
  host.addEventListener("click", e => {
    const a = e.target.closest("[data-foyer-control]")?.dataset.foyerControl;
    if (a === "left" || a === "right") tools.rotate(a === "left" ? -15 : 15);
    else if (a === "colour") { const p=piece(); if(p&&!ui.state.paused){history.push({...p});setPieceColour(ui.state,"foyer",selected,nextPieceColour(p.tint));save();render();} }
    else if (a === "undo") tools.undo(); else if (a === "cancel") tools.cancel(); else if (a === "done") tools.done();
    else if (a === "store" && H.storeFoyerDecor(ui.state, selected)) { clear(); save(); }
  });
  return tools;
}
