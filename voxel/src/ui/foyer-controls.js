import { setPieceColour, nextPieceColour } from "../rules/piece-colours.js";
import * as H from "../rules/hollow-house.js";
import { FOYER_DECOR_BY_ID } from "../content/hollow-house.js";

// The editor owns only a reversible selection. Paid ownership and geometry
// validation stay in the shared foyer rules.
export function createFoyerControls(ui) {
  const host = document.createElement("aside"); host.className = "estate-controls foyer-controls"; host.hidden = true; host.setAttribute("aria-label", "Foyer decoration controls"); document.body.append(host);
  let selected = null, pending = null, original = null, newlyPlaced = false, history = [], last = "", blocked = false, live = null;
  const piece = () => ui.state.hollowHouse.foyer.placed.find(p => p.instance === selected);
  // `live` is a pose under a finger or the dial: shown at once, saved on release.
  const pose = () => live ?? pending ?? piece();
  const round = n => Math.round(n * 10) / 10, turnTo = n => ((n % 360) + 360) % 360;
  const fits = p => H.foyerFits(ui.state, p.id, p.x, p.z, p.rotation, selected, p);
  const save = () => { ui.scene.refreshFoyer(); ui.save(); };
  const preview = () => { const p = pose(); ui.scene.previewFoyerDecor(p ? { ...p, pending: !!pending, valid: H.foyerFits(ui.state, p.id, p.x, p.z, p.rotation, selected, p) } : null); };
  const clear = () => { selected = pending = original = live = null; history = []; newlyPlaced = false; ui.scene.previewFoyerDecor(null); last = ""; render(); };
  const fail = () => ui.notice(ui.state.paused ? "Resume before decorating." : "Keep the doors, stairs and ticket lanes clear. Wall pieces go on a wall.");
  const button = (id, label, disabled = false) => `<button class="estate-tool" data-foyer-control="${id}" ${disabled ? "disabled" : ""}>${label}</button>`;
  function render() {
    host.hidden = ui.scene.place?.kind !== "foyer" || blocked || !pose(); if (host.hidden) return;
    const p = pose(), def = FOYER_DECOR_BY_ID[p.id], disabled = ui.state.paused;
    // Mid-gesture, only the dial changes; rebuilding would drop its pointer.
    const dial = live && host.querySelector?.(".rotation-dial");
    if (dial) { const value = Math.round(p.rotation); dial.style.setProperty("--angle", value + "deg"); dial.setAttribute("aria-valuenow", value); dial.querySelector("span").textContent = value + "°"; return; }
    const wall = def.layer === "wall", angle = Math.round(p.rotation), tool = (id, symbol, label, off = disabled) => `<button class="icon-button tool-icon" data-foyer-control="${id}" aria-label="${label}" title="${label}" ${off ? "disabled" : ""}>${symbol}</button>`;
    const turning = wall ? "" : `<div class="rotation-tools" role="group" aria-label="Rotate decoration">${tool("left", "↶", "Rotate anticlockwise 15 degrees")}<button class="rotation-dial" role="slider" tabindex="0" aria-label="Decoration rotation" aria-valuemin="0" aria-valuemax="359" aria-valuenow="${angle}" style="--angle:${angle}deg" ${disabled ? "disabled" : ""}><span>${angle}°</span></button>${tool("right", "↷", "Rotate clockwise 15 degrees")}</div>`;
    const nudges = wall ? "" : `<div class="nudge-tools" role="group" aria-label="Fine-tune position">${tool("west", "←", "Move left 0.1")}${tool("north", "↑", "Move towards the back wall 0.1")}${tool("south", "↓", "Move towards the front 0.1")}${tool("east", "→", "Move right 0.1")}</div>`;
    const html = `<section class="estate-placement"><header><div><b>${def.name}</b><small>${wall ? "Tap a wall to hang it" : pending ? "Drag it, or tap the floor · two fingers turn" : "Drag to move · two fingers turn"}</small></div></header><div class="foyer-piece-actions">${turning}${nudges}${button("undo", "Undo", disabled || !history.length)}${!pending ? button("colour", "Colour", disabled) + button("store", "Store", disabled) : ""}</div><footer>${button("cancel", "Cancel")}${button("done", pending ? "Place here" : "Done", disabled)}</footer></section>`;
    if (html !== last) {
      const focus = document.activeElement?.closest?.("[data-foyer-control], .rotation-dial");
      host.innerHTML = html; last = html; bindDial();
      if (focus && host.contains?.(document.activeElement) === false) host.querySelector?.(focus.classList.contains("rotation-dial") ? ".rotation-dial" : `[data-foyer-control="${focus.dataset.foyerControl}"]`)?.focus({ preventScroll: true });
    }
  }
  // The dial turns the piece to any angle, as in the house.
  function bindDial() {
    const dial = host.querySelector?.(".rotation-dial"); if (!dial) return;
    let turning = null;
    const at = e => { const r = dial.getBoundingClientRect(); return Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI; };
    dial.onpointerdown = e => { if (!tools.beginGesture()) return; e.preventDefault(); dial.setPointerCapture(e.pointerId); turning = at(e); };
    dial.onpointermove = e => { if (turning === null) return; const next = at(e), delta = ((next - turning + 540) % 360) - 180; turning = next; dial.classList.toggle("blocked", !tools.turn(delta)); };
    dial.onpointerup = () => { if (turning === null) return; turning = null; tools.endGesture(); };
    dial.onpointercancel = () => { if (turning === null) return; turning = null; tools.endGesture(true); };
    dial.onkeydown = e => { if (["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); tools.rotate(["ArrowLeft", "ArrowDown"].includes(e.key) ? -15 : 15); } };
  }
  function apply(x, z, rotation, options = {}) {
    const p = pose(); if (!p || ui.state.paused) return false;
    const candidate = { ...p, ...options, x: round(x), z: round(z), rotation: turnTo(rotation) };
    if (pending) { history.push({ ...pending }); pending = candidate; preview(); render(); return true; }
    const before = { ...p }, moved = H.moveFoyerDecor(ui.state, selected, candidate.x, candidate.z, candidate.rotation, candidate);
    if (!moved) { fail(); return false; } history.push(before); save(); preview(); render(); return true;
  }
  const tools = {
    get placement() { return pose(); },
    get selected() { return selected ?? (pending ? "pending:" + pending.id : null); }, get active() { return !!pose(); },
    select(instance) { if (instance && instance === selected && !pending) return true; tools.cancel(); const p = ui.state.hollowHouse.foyer.placed.find(p => p.instance === instance); if (!p || ui.state.paused) return false; selected = instance; original = { ...p }; preview(); render(); return true; },
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
      const placed = H.placeFoyerDecor(ui.state, p.id, round(x), round(z), p.rotation, { ...p, ...options });
      if (!placed) { fail(); return false; } selected = placed.instance; pending = null; newlyPlaced = true; history = []; save(); preview(); render(); return true;
    },
    rotate(delta) { const p = pose(); return p ? apply(p.x, p.z, p.rotation + delta, p) : false; },
    // Dragging and turning: begin, then drag/turn as often as the pointer
    // moves (each step only if the piece still fits), then end to save.
    beginGesture() { const p = pending ?? piece(); if (!p || ui.state.paused || FOYER_DECOR_BY_ID[p.id].layer === "wall") return false; live = { ...p }; return true; },
    dragTo(x, z) { if (!live) return false; const next = { ...live, x: round(x), z: round(z) }; if (!fits(next)) return false; live = next; preview(); render(); return true; },
    turn(delta) { if (!live || !Number.isFinite(delta)) return false; const next = { ...live, rotation: turnTo(live.rotation + delta) }; if (!fits(next)) return false; live = next; preview(); render(); return true; },
    endGesture(cancelled = false) { const p = live; live = null; if (!p || cancelled) { preview(); render(); return false; } const before = pending ?? piece(); if (before && p.x === before.x && p.z === before.z && p.rotation === before.rotation) { preview(); render(); return true; } return apply(p.x, p.z, p.rotation, p); },
    nudge(dx, dz) { const p = pose(); return p ? apply(p.x + dx, p.z + dz, p.rotation, p) : false; },
    undo() { if (!history.length || ui.state.paused) return false; const p = history.pop(); if (pending) pending = p; else { H.moveFoyerDecor(ui.state, selected, p.x, p.z, p.rotation, p); setPieceColour(ui.state,"foyer",selected,p.tint??"original"); } save(); preview(); render(); return true; },
    cancel() { if (selected && !ui.state.paused) { if (newlyPlaced) H.storeFoyerDecor(ui.state, selected); else if (original) { H.moveFoyerDecor(ui.state, selected, original.x, original.z, original.rotation, original); if(piece()?.tint||original.tint)setPieceColour(ui.state,"foyer",selected,original.tint??"original"); } save(); } clear(); },
    done() { if (pending && !tools.placeAt(pending.x, pending.z, pending.wall, pending.y)) return false; clear(); ui.save(); return true; },
    tick(suspended = false) { blocked = suspended; if (selected && !piece()) clear(); render(); },
  };
  host.addEventListener("click", e => {
    const a = e.target.closest("[data-foyer-control]")?.dataset.foyerControl;
    if (a === "left" || a === "right") tools.rotate(a === "left" ? -15 : 15);
    else if (["west", "east", "north", "south"].includes(a)) tools.nudge(...{ west: [-.1, 0], east: [.1, 0], north: [0, -.1], south: [0, .1] }[a]);
    else if (a === "colour") { const p=piece(); if(p&&!ui.state.paused){history.push({...p});setPieceColour(ui.state,"foyer",selected,nextPieceColour(p.tint));save();render();} }
    else if (a === "undo") tools.undo(); else if (a === "cancel") tools.cancel(); else if (a === "done") tools.done();
    else if (a === "store" && H.storeFoyerDecor(ui.state, selected)) { clear(); save(); }
  });
  return tools;
}
