// The carving bench's controls over the close-up (carving-view.js): pick a
// pumpkin from the barn, choose a stencil, carve, decorate, then keep the
// lantern on the doorstep or sell it. The panel sits to the right on wide
// screens and as a sheet at the bottom on phones; the view is framed round it.
import { STENCILS, STENCIL_BY_ID, CARVING_DECOR, CARVING } from "../content/carving.js";
import { PUMPKIN_VARIETIES } from "../content/pumpkin-varieties.js";
import { money } from "./kit.js";

const STEPS = [["pumpkin", "Pumpkin"], ["stencil", "Stencil"], ["carve", "Carve"], ["decorate", "Decorate"], ["finish", "Finish"]];
const PIECE_NAMES = { "eye-l": "Left eye", "eye-r": "Right eye", nose: "Nose", mouth: "Mouth", "ear-l": "Left ear", "ear-r": "Right ear", bat: "Bat", moon: "Moon", ghost: "Ghost", heart: "Heart", "star-a": "Star", "star-b": "Star", "star-c": "Star", "spark-l": "Sparkle", "spark-r": "Sparkle" };
const pieceName = (id) => PIECE_NAMES[id] ?? (id.startsWith("tooth") ? "Tooth" : id);
const hex = (n) => "#" + n.toString(16).padStart(6, "0");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// A stencil drawn on a pumpkin, from the stencil's own polygons.
export function stencilArt(stencil, colour = 0xe8862e, glow = "#ffd27a") {
  const pt = ([u, v]) => `${(u * 40 + 50).toFixed(1)},${(52 - v * 34).toFixed(1)}`;
  const path = (poly) => "M" + poly.map(pt).join("L") + "Z";
  const pieces = stencil.pieces.map((p) => `<path d="${path(p.outer)}${(p.holes ?? []).map(path).join("")}" fill="${glow}" fill-rule="evenodd"/>`).join("");
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="94" rx="36" ry="4" fill="#0a070f88"/><path d="M50 14c-30 0-44 16-44 40s16 38 44 38 44-14 44-38S80 14 50 14z" fill="${hex(colour)}"/><path d="M28 20c-8 10-10 50 0 68M72 20c8 10 10 50 0 68M50 15v78" stroke="#00000022" stroke-width="3" fill="none"/><path d="M48 15c0-6 2-9 6-11" stroke="#5d6a33" stroke-width="5" fill="none" stroke-linecap="round"/>${pieces}</svg>`;
}
function pumpkinSwatch(v) {
  const variety = PUMPKIN_VARIETIES[v];
  return `<svg viewBox="0 0 64 56" aria-hidden="true"><path d="M32 10c-18 0-28 9-28 22s10 21 28 21 28-8 28-21S50 10 32 10z" fill="${hex(variety.color)}"/><path d="M18 13c-5 6-6 30 0 38M46 13c5 6 6 30 0 38M32 11v41" stroke="#00000026" stroke-width="2.4" fill="none"/><path d="M31 11c0-4 2-6 5-8" stroke="#5d6a33" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
}

export function createCarvingUI({ state, view, actions, feel = () => {} }) {
  const root = document.createElement("section"); root.id = "carving"; root.className = "carving"; root.hidden = true; root.setAttribute("aria-label", "Pumpkin carving");
  document.body.append(root);
  let open = false, step = "pumpkin", decorTab = "candle", last = null, keys = new Set(), tool = "knife";
  const s = () => state();
  const cur = () => s().carving?.current ?? null;
  function derive() {
    const c = cur();
    if (last && !c) return "finish";
    if (!c) return "pumpkin";
    if (!c.stencil) return "stencil";
    const st = STENCIL_BY_ID[c.stencil];
    if (!st.pieces.every((p) => c.cut.includes(p.id))) return step === "stencil" && !c.cut.length ? "stencil" : "carve";
    return step === "finish" ? "finish" : "decorate";
  }
  function header() {
    const at = STEPS.findIndex(([id]) => id === step), titles = { pumpkin: "Pick a pumpkin", stencil: "Choose a stencil", carve: "Carve along the lines", decorate: "Dress your lantern", finish: last ? "Lantern finished" : "Light it up" };
    return `<header class="carving-top">
      <button class="carving-close" data-carve-close aria-label="Leave the bench"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg></button>
      <div class="carving-title"><small>Carving bench</small><h2>${titles[step]}</h2></div>
      <ol class="carving-steps" aria-label="Steps">${STEPS.map(([id, name], i) => `<li class="${i < at ? "done" : i === at ? "now" : ""}" aria-current="${i === at ? "step" : "false"}"><span>${i + 1}</span><b>${name}</b></li>`).join("")}</ol>
    </header>`;
  }
  function pumpkinStep() {
    const stock = s().stock ?? [];
    return `<p class="carving-lead">Choose a pumpkin from the barn. A rarer pumpkin makes a dearer lantern.</p>
      <div class="carving-grid">${PUMPKIN_VARIETIES.map((v, i) => { const n = Math.max(0, stock[i] ?? 0); return `<button class="carving-card" data-carve-pumpkin="${i}" ${n ? "" : "disabled"}>${pumpkinSwatch(i)}<b>${esc(v.name)}</b><small>${n ? `${n} in the barn` : "None picked yet"}</small></button>`; }).join("")}</div>`;
  }
  function stencilStep() {
    const c = cur(), colour = PUMPKIN_VARIETIES[c.variety].color;
    return `<p class="carving-lead">Each stencil is cut piece by piece. More stars, more to carve, and a dearer lantern.</p>
      <div class="carving-grid stencils">${STENCILS.map((st) => `<button class="carving-card stencil ${c.stencil === st.id ? "picked" : ""}" data-carve-stencil="${st.id}" aria-pressed="${c.stencil === st.id}">${stencilArt(st, colour)}<b>${esc(st.name)}</b><small class="stars" aria-label="${st.difficulty} of 3">${"★".repeat(st.difficulty)}${"☆".repeat(3 - st.difficulty)}</small></button>`).join("")}</div>
      <button class="carving-go" data-carve-step="carve" ${c.stencil ? "" : "disabled"}>Start carving</button>`;
  }
  function pieceChips(status) {
    return `<ul class="carving-pieces">${status.pieces.map((p) => `<li class="${p.cut ? "cut" : ""}" style="--p:${Math.round(p.progress * 100)}"><i></i><span>${pieceName(p.id)}</span></li>`).join("")}</ul>`;
  }
  function carveStep() {
    const status = view.status;
    return `<p class="carving-lead">Drag the knife along each dotted line. When a piece's outline is cut it pops out, and the candle shows through.</p>
      ${pieceChips(status)}
      <div class="carving-tools" role="group" aria-label="Tool">
        <button data-carve-tool="knife" aria-pressed="${tool === "knife"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 15 9m-2-2 6-4 2 2-4 6"/></svg>Knife</button>
        <button data-carve-tool="turn" aria-pressed="${tool === "turn"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-3-6.2M20 4v5h-5"/></svg>Turn</button>
        <button class="carving-trace" data-carve-trace><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12c3-6 11-6 14 0-3 6-11 6-14 0z"/><circle cx="12" cy="12" r="2"/></svg>Hold to trace</button>
      </div>
      <p class="carving-keys">Keys: arrows move the knife · hold <kbd>E</kbd> to trace · <kbd>I J K L</kbd> turn · <kbd>[</kbd> <kbd>]</kbd> zoom</p>`;
  }
  function decorateStep() {
    const c = cur(), tabs = [["candle", "Candle"], ["paint", "Paint"], ["hat", "Hat"], ["stand", "Stand"], ["extras", "Extras"]];
    const opts = CARVING_DECOR[decorTab].map((o) => {
      const on = decorTab === "extras" ? c.decor.extras.includes(o.id) : c.decor[decorTab] === o.id;
      const dot = o.colour ? `<i style="--dot:${hex(Array.isArray(o.colour) ? o.colour[0] : o.colour)}"></i>` : "";
      return `<button class="carving-option" data-carve-decor="${decorTab}:${o.id}" aria-pressed="${on}">${dot}${esc(o.name)}</button>`;
    }).join("");
    const value = actions.value();
    return `<div class="carving-tabs" role="tablist">${tabs.map(([id, name]) => `<button role="tab" data-carve-tab="${id}" aria-selected="${decorTab === id}">${name}</button>`).join("")}</div>
      <div class="carving-options">${opts}</div>
      <div class="carving-value"><span>Fair price</span><b>${money(value)}</b></div>
      <button class="carving-go" data-carve-step="finish">Light it up</button>`;
  }
  function finishStep() {
    if (last) {
      return `<div class="carving-result"><b>${esc(PUMPKIN_VARIETIES[last.variety].name)} · ${esc(STENCIL_BY_ID[last.stencil].name)}</b><small>${last.kept ? "Glowing on the doorstep" : `Sold at the fair for ${money(last.value)}`}</small></div>
        <div class="carving-actions"><button class="carving-go" data-carve-again>Carve another</button><button class="carving-secondary" data-carve-close>Back to the garden</button></div>`;
    }
    const value = actions.value(), keep = s().carving.lanterns.length >= CARVING.lanternKeep;
    return `<p class="carving-lead">Set it on the doorstep to glow in the garden${keep ? " (the oldest lantern there makes way)" : ""}, or sell it at the village fair.</p>
      <div class="carving-value big"><span>Fair price</span><b>${money(value)}</b></div>
      <div class="carving-actions"><button class="carving-go" data-carve-finish="keep">Keep on the doorstep</button><button class="carving-secondary" data-carve-finish="sell">Sell for ${money(value)}</button></div>
      <button class="carving-link" data-carve-step="decorate">Back to decorating</button>`;
  }
  function render() {
    if (!open) return;
    step = derive();
    const body = { pumpkin: pumpkinStep, stencil: stencilStep, carve: carveStep, decorate: decorateStep, finish: finishStep }[step]();
    root.innerHTML = header() + `<div class="carving-panel" data-step="${step}">${body}</div>`;
    root.dataset.step = step;
    view.setTool(step === "carve" ? tool : "turn");
  }
  // Only the piece chips change while carving: patch them in place.
  function progress(status) {
    if (!open || step !== "carve") return;
    const list = root.querySelector(".carving-pieces"); if (!list) return;
    status.pieces.forEach((p, i) => { const li = list.children[i]; if (li) { li.style.setProperty("--p", Math.round(p.progress * 100)); li.classList.toggle("cut", p.cut); } });
  }
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    if (b.dataset.carvePumpkin !== undefined) { if (actions.start(+b.dataset.carvePumpkin)) { last = null; feel("select"); step = "stencil"; } }
    else if (b.dataset.carveStencil) { actions.stencil(b.dataset.carveStencil); feel("select"); }
    else if (b.dataset.carveStep) { step = b.dataset.carveStep; if (step === "finish" && !actions.done()) step = "carve"; }
    else if (b.dataset.carveTool) { tool = b.dataset.carveTool; view.setTool(tool); }
    else if (b.dataset.carveTab) decorTab = b.dataset.carveTab;
    else if (b.dataset.carveDecor) { const [g, id] = b.dataset.carveDecor.split(":"); actions.decor(g, id); feel("select"); }
    else if (b.dataset.carveFinish) { const l = actions.finish(b.dataset.carveFinish); if (l) { last = { ...l, kept: b.dataset.carveFinish === "keep" }; feel("done"); } }
    else if (b.dataset.carveAgain !== undefined) { last = null; step = "pumpkin"; }
    else if (b.dataset.carveClose !== undefined) { actions.close(); return; }
    render();
  });
  // Hold to trace: the knife runs round the nearest outline while it's held.
  const holdTrace = (on) => view.setTracing(on);
  root.addEventListener("pointerdown", (e) => { if (e.target.closest("[data-carve-trace]")) { e.preventDefault(); holdTrace(true); } });
  addEventListener("pointerup", () => holdTrace(false)); addEventListener("pointercancel", () => holdTrace(false));
  addEventListener("keydown", (e) => {
    if (!open || e.target.closest?.("input,textarea")) return;
    const k = e.key.toLowerCase();
    // Stopped here, or main.js would see the same Escape once the bench has shut and leave the garden too.
    if (k === "escape") { e.preventDefault(); e.stopPropagation(); actions.close(); return; }
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "i", "j", "k", "l", "e", " "].includes(k)) { e.preventDefault(); keys.add(k); if (k === "e" || k === " ") holdTrace(true); }
    if (k === "[" || k === "]") view.zoom(k === "]" ? 1 : -1);
  }, true);
  addEventListener("keyup", (e) => { const k = e.key.toLowerCase(); keys.delete(k); if (k === "e" || k === " ") holdTrace(false); }, true);
  let padTrace = false;
  function tick(dt) {
    if (!open) return;
    const has = (...k) => k.some((x) => keys.has(x));
    let mx = (has("arrowright", "d") ? 1 : 0) - (has("arrowleft", "a") ? 1 : 0), my = (has("arrowup", "w") ? 1 : 0) - (has("arrowdown", "s") ? 1 : 0);
    let ox = (has("l") ? 1 : 0) - (has("j") ? 1 : 0), oy = (has("i") ? 1 : 0) - (has("k") ? 1 : 0);
    const pad = Array.from(navigator.getGamepads?.() ?? []).find((g) => g?.connected);
    if (pad) {
      const dz = (n) => Math.abs(n) > .18 ? n : 0;
      mx += dz(pad.axes[0] ?? 0); my -= dz(pad.axes[1] ?? 0); ox += dz(pad.axes[2] ?? 0); oy -= dz(pad.axes[3] ?? 0);
      const a = !!pad.buttons[0]?.pressed; if (a !== padTrace) { padTrace = a; holdTrace(a); }
    }
    if ((mx || my) && step === "carve") view.nudge(mx, my, dt);
    if (ox || oy) view.orbit(ox, oy, dt);
  }
  // Frame the pumpkin clear of the panel: beside it on wide screens, above it on phones.
  const inset = () => { if (open) view.setInset(innerWidth >= 760 ? 392 : 0, innerWidth >= 760 ? 0 : Math.round(innerHeight * .44)); };
  addEventListener("resize", inset);
  return {
    open() { open = true; last = null; step = derive(); root.hidden = false; inset(); render(); },
    close() { open = false; root.hidden = true; keys.clear(); holdTrace(false); view.setInset(0, 0); },
    render, progress, tick,
    get isOpen() { return open; },
    get step() { return step; },
  };
}
