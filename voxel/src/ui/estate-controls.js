import { premiumIcon } from "./premium-icon-markup.js";
import { setPieceColour, nextPieceColour } from "../rules/piece-colours.js";
import * as E from "../rules/house-estate.js";
import { ESTATE_DECOR_BY_ID } from "../content/house-estate.js";

const round = n => Math.round(n * 10) / 10;
const normalAngle = n => ((n % 360) + 360) % 360;
const icon = (name) => {
  const art={garden:"garden",exterior:"exterior",inside:"enter",reset:"fullscreen",left:"rotate",right:"rotate"}[name];
  if(art)return premiumIcon(art);
  const paths = {
    left: '<path d="M8 7H3V2M3 7a9 9 0 1 1 0 10"/>',
    right: '<path d="M16 7h5V2m0 5a9 9 0 1 0 0 10"/>',
    reset: '<path d="m12 3 8 5v8l-8 5-8-5V8zm0 0v9m8-4-8 4-8-4m8 4v9"/>',
    garden: '<path d="M12 21v-9C4 14 2 8 3 4c6-1 10 2 9 8 1-8 5-11 10-10 1 6-3 11-10 10"/>',
    exterior: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7m-8-9h1m8 0h1"/>',
    inside: '<path d="M5 21V3h13v18M9 21V6l9-3m-5 10h1m-8 8h15"/>',
    up: '<path d="m5 12 7-7 7 7M12 5v15"/>',
    down: '<path d="m5 12 7 7 7-7M12 19V4"/>',
    west: '<path d="m12 5-7 7 7 7M5 12h15"/>',
    east: '<path d="m12 5 7 7-7 7M19 12H4"/>',
  };
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.reset}</svg>`;
};
const control = (action, label, content, disabled = false, extra = "") => `<button type="button" class="estate-tool ${extra}" data-estate-control="${action}" aria-label="${label}" title="${label}" ${disabled ? "disabled" : ""}>${content}</button>`;

// Camera controls stay on the edge of the scene; placement uses its own small card.
export function createEstateControls(ui) {
  const host = document.createElement("aside"); host.className = "estate-controls"; host.hidden = true; host.setAttribute("aria-label", "House estate controls"); document.body.append(host);
  let selected = null, pending = null, original = null, newlyPlaced = false, preview = null, lastHTML = "", blocked = false, history = [], live = null;
  const piece = () => ui.state.estate.placed.find(p => p.instance === selected);
  // `live` is a pose under a finger or the dial: shown at once, saved on release.
  const pose = () => live ?? preview ?? pending ?? piece();
  const fits = p => E.estateFits(ui.state, p.id, p.x, p.z, p.rotation, selected);
  const active = () => !!selected || !!pending;
  const refresh = () => { ui.scene.refreshHouseEstate(); ui.save(); };
  const displayPreview = () => {
    const p = pose();
    ui.scene.previewEstateDecor(p ? { ...p, pending: !!pending, valid: E.estateFits(ui.state, p.id, p.x, p.z, p.rotation, selected) && (!pending || ui.state.estate.placed.length < E.estateBounds(ui.state).capacity) } : null);
  };
  const clear = () => { history = []; selected = pending = original = preview = live = null; newlyPlaced = false; ui.scene.previewEstateDecor(null); lastHTML = ""; render(); };
  const failure = () => ui.notice(ui.state.paused ? "Tea break. Resume before moving garden pieces." : "Leave space for the house, front path and other garden pieces.");
  const move = (x, z, rotation) => {
    if (ui.state.paused || !active()) { failure(); return false; }
    const p = pose(), candidate = { ...p, x: round(x), z: round(z), rotation: normalAngle(rotation) };
    if (pending) { history.push({ ...pending }); pending = candidate; preview = null; displayPreview(); render(); return E.estateFits(ui.state, p.id, candidate.x, candidate.z, candidate.rotation); }
    const before = { ...piece() };
    const moved = E.moveEstateDecor(ui.state, selected, candidate.x, candidate.z, candidate.rotation);
    preview = moved ? null : candidate;
    if (moved) { history.push(before); if (history.length > 30) history.shift(); refresh(); }
    displayPreview(); render(); return !!moved;
  };
  function finish() {
    if (pending) {
      if (!tools.placeAt(pending.x, pending.z)) return;
    }
    clear(); ui.save();
  }
  function render() {
    const inside = ui.scene.place?.kind === "estate";
    host.hidden = !inside || blocked;
    if (!inside) return;
    const disabled = !!ui.state.paused, p = pose(), d = p && ESTATE_DECOR_BY_ID[p.id];
    // Mid-gesture, only the dial changes; rebuilding would drop its pointer.
    const liveDial = live && host.querySelector?.(".rotation-dial");
    if (liveDial) { const value = Math.round(p.rotation); liveDial.style.setProperty("--angle", value + "deg"); liveDial.setAttribute("aria-valuenow", value); liveDial.querySelector("span").textContent = value + "°"; return; }
    const orbit = `<div class="estate-camera-tools" role="group" aria-label="Orbit the house">${control("orbit-left", "Orbit house left", icon("left"))}${control("view-reset", "Reset estate view", icon("reset"))}${control("orbit-right", "Orbit house right", icon("right"))}</div>`;
    const invalid = p && (!E.estateFits(ui.state, p.id, p.x, p.z, p.rotation, selected) || pending && ui.state.estate.placed.length >= E.estateBounds(ui.state).capacity);
    const placement = p ? `<section class="estate-placement" aria-label="Selected garden piece"><header><div><b>${d.name}</b><small>${invalid ? "Blocked spot · last valid position is kept" : pending ? "Drag it, or tap a spot · two fingers turn" : "Drag to move · two fingers turn"}</small></div><span class="estate-placement-state ${invalid ? "invalid" : ""}">${invalid ? "No space" : "✓"}</span></header><div class="estate-placement-tools"><div class="estate-turn-tools rotation-tools" role="group" aria-label="Rotate garden piece">${control("turn-left", "Rotate garden piece 15 degrees left", icon("left"), disabled)}<button type="button" class="rotation-dial" role="slider" tabindex="0" aria-label="Garden piece rotation" aria-valuemin="0" aria-valuemax="359" aria-valuenow="${Math.round(p.rotation)}" style="--angle:${Math.round(p.rotation)}deg" ${disabled ? "disabled" : ""}><span>${Math.round(p.rotation)}°</span></button>${control("turn-right", "Rotate garden piece 15 degrees right", icon("right"), disabled)}</div><div class="estate-nudge-tools" role="group" aria-label="Move garden piece">${control("north", "Move garden piece towards the back", icon("up"), disabled)}${control("west", "Move garden piece left", icon("west"), disabled)}${control("east", "Move garden piece right", icon("east"), disabled)}${control("south", "Move garden piece towards the gate", icon("down"), disabled)}</div></div><footer>${!pending ? control("store", "Store garden piece", "Store", disabled) : ""}${control("undo", "Undo garden placement", "Undo", disabled || !history.length)}${!pending ? control("colour", "Recolour garden piece", "Colour", disabled) : ""}${control("cancel", "Cancel garden placement", "Cancel")}${control("done", pending ? "Place garden piece here" : "Finish moving garden piece", pending ? "Place here" : invalid ? "Keep last spot" : "Done", disabled || !!pending && !!invalid, "estate-primary")}</footer></section>` : "";
    const navigation = !p ? `<div class="estate-place-tools" role="group" aria-label="Customise your estate">${control("garden", "Open garden catalogue", icon("garden") + "<span>Garden</span>")}${control("exterior", "Customise house exterior", icon("exterior") + "<span>Exterior</span>")}${control("inside", "Enter the house", icon("inside") + "<span>Enter house</span>", false, "estate-primary")}</div>` : "";
    const html = `${placement}<div class="estate-bottom-tools">${orbit}${navigation}</div>`;
    if (html === lastHTML) return;
    const focus = document.activeElement?.dataset?.estateControl;
    host.innerHTML = html; lastHTML = html; bindDial();
    if (focus) host.querySelector(`[data-estate-control="${focus}"]`)?.focus({ preventScroll: true });
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
  }
  const tools = {
    get selected() { return selected ?? (pending ? "pending:" + pending.id : null); },
    get placement() { return pose(); },
    get active() { return active(); },
    select(instance) {
      if (!instance) { clear(); return; }
      if (instance === selected && !pending) return true;
      tools.cancel();
      const p = ui.state.estate.placed.find(q => q.instance === instance); if (!p || ui.state.paused) return false;
      selected = instance; original = { ...p }; preview = null; newlyPlaced = false;
      displayPreview(); render(); return true;
    },
    selectForPlacement(id) {
      tools.cancel();
      if (ui.state.paused || !ui.state.estate.ownedDecor[id] || !ESTATE_DECOR_BY_ID[id]) return false;
      const b = E.estateBounds(ui.state), candidates = [[-5, 8], [6, 9], [10, -2], [-10, 2]];
      for (let z = b.z1 - 2; z > b.z0 + 1; z -= 2) for (let x = b.x0 + 2; x < b.x1 - 1; x += 2) candidates.push([x, z]);
      const [x, z] = candidates.find(([x, z]) => E.estateFits(ui.state, id, x, z, 0)) ?? [0, 8];
      pending = { id, x, z, rotation: 0 }; displayPreview(); render(); return true;
    },
    placeAt(x, z) {
      if (!active() || ![x, z].every(Number.isFinite)) return false;
      if (ui.state.paused) { failure(); return false; }
      if (pending) {
        pending.x = round(x); pending.z = round(z);
        const placed = E.placeEstateDecor(ui.state, pending.id, pending.x, pending.z, pending.rotation);
        if (!placed) { displayPreview(); render(); failure(); return false; }
        selected = placed.instance; pending = preview = original = null; newlyPlaced = true;
        refresh(); displayPreview(); render(); ui.tone(620); return true;
      }
      const p = pose(), moved = move(x, z, p.rotation); if (!moved) failure(); return moved;
    },
    // Dragging and turning: begin, then drag/turn as often as the pointer
    // moves (each step only if the piece still fits), then end to save.
    beginGesture() { const p = pending ?? piece(); if (!p || ui.state.paused) return false; live = { ...p }; preview = null; return true; },
    dragTo(x, z) { if (!live) return false; const next = { ...live, x: round(x), z: round(z) }; if (!fits(next)) return false; live = next; displayPreview(); render(); return true; },
    turn(delta) { if (!live || !Number.isFinite(delta)) return false; const next = { ...live, rotation: normalAngle(live.rotation + delta) }; if (!fits(next)) return false; live = next; displayPreview(); render(); return true; },
    endGesture(cancelled = false) {
      const p = live; live = null; if (!p || cancelled) { displayPreview(); render(); return false; }
      const before = pending ?? piece(); if (before && p.x === before.x && p.z === before.z && p.rotation === before.rotation) { displayPreview(); render(); return true; }
      return move(p.x, p.z, p.rotation);
    },
    rotate(degrees) { const p = pose(); if (!p || !Number.isFinite(degrees)) return false; const moved = move(p.x, p.z, p.rotation + degrees); if (!moved) failure(); return moved; },
    nudge(dx, dz) { const p = pose(); if (!p) return false; const moved = move(p.x + dx, p.z + dz, p.rotation); if (!moved) failure(); return moved; },
    cancel() {
      if (selected && !ui.state.paused) {
        if (newlyPlaced) E.storeEstateDecor(ui.state, selected);
        else if (original) { E.moveEstateDecor(ui.state, selected, original.x, original.z, original.rotation); if (piece()?.tint || original.tint) setPieceColour(ui.state,"garden",selected,original.tint??"original"); }
        refresh();
      }
      clear();
    },
    undo() { if (!history.length || ui.state.paused) return false; const p = history.pop(); if (pending) pending = p; else { E.moveEstateDecor(ui.state, selected, p.x, p.z, p.rotation); setPieceColour(ui.state,"garden",selected,p.tint??"original"); } refresh(); displayPreview(); render(); return true; },
    done: finish,
    tick(suspended = false) {
      blocked = suspended || document.body.classList.contains("menu-open");
      if (selected && !piece()) clear();
      render();
    },
  };
  host.addEventListener("click", e => {
    const action = e.target.closest("[data-estate-control]")?.dataset.estateControl; if (!action) return;
    if (action === "orbit-left" || action === "orbit-right") { ui.scene.estateCamera?.rotate(action === "orbit-left" ? -45 : 45); return; }
    if (action === "view-reset") { ui.scene.estateCamera?.reset(); return; }
    if (action === "garden" || action === "exterior") { clear(); ui.openEstateSheet ? ui.openEstateSheet(action) : ui.openSheet("estate"); return; }
    if (action === "inside") { clear(); ui.enterRoom(ui.state.house.activeRoom); return; }
    if (action === "colour") { const p = piece(); if (p && !ui.state.paused) { history.push({ ...p }); setPieceColour(ui.state, "garden", selected, nextPieceColour(p.tint)); refresh(); render(); } return; }
    if (action === "undo") { tools.undo(); return; }
    if (action === "done") { finish(); return; }
    if (action === "cancel") { tools.cancel(); return; }
    if (action === "store") { if (E.storeEstateDecor(ui.state, selected)) { clear(); refresh(); ui.notice("Back in garden storage."); } return; }
    if (action === "turn-left" || action === "turn-right") { tools.rotate(action === "turn-left" ? -15 : 15); return; }
    const deltas = { north: [0, -.25], south: [0, .25], west: [-.25, 0], east: [.25, 0] };
    if (deltas[action]) tools.nudge(...deltas[action]);
  });
  host.addEventListener("keydown", e => {
    if (!active()) return;
    const steps = { ArrowUp: [0, -.25], ArrowDown: [0, .25], ArrowLeft: [-.25, 0], ArrowRight: [.25, 0] };
    if (steps[e.key]) { e.preventDefault(); e.stopPropagation(); tools.nudge(...steps[e.key]); }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); tools.cancel(); }
    if (e.key.toLowerCase() === "r") { e.preventDefault(); e.stopPropagation(); tools.rotate(e.shiftKey ? -15 : 15); }
  });
  return tools;
}
