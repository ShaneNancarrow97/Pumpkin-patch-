// The carving bench's controls over the close-up (carving-view.js), step by
// step: pick a pumpkin from the barn; open it (cut the lid, scoop the seeds);
// choose a stencil from the book, or go freehand; carve and etch; light the
// candle and dress the lantern; then name it and keep it on the doorstep or
// sell it. The panel sits to the right on wide screens and as a sheet at the
// bottom on phones; the view is framed round it.
//
// A controller plays it all: the left stick or D-pad moves a highlight round
// the panel and A selects; while opening and carving, the left stick moves the
// tool and A or X held does the job (the D-pad goes back to the panel). LB and
// RB change tool or tab, LT and RT zoom, the right stick turns the view, Y or
// R3 resets it, Start takes the next step and B leaves. The keyboard matches:
// arrows or WASD, E or Space, Q and R, [ and ], IJKL, C, Enter and Esc.
import { STENCILS, STENCIL_BY_ID, STENCIL_GROUPS, CARVING_DECOR, CARVING, pieceKind } from "../content/carving.js";
import { PUMPKIN_VARIETIES } from "../content/pumpkin-varieties.js";
import { PUMPKIN_SHAPES } from "../content/pumpkin-shapes.js";
import { money } from "./kit.js";
import { glyphHTML } from "./play-controls.js";

const STEPS = [["pumpkin", "Pumpkin"], ["open", "Open"], ["stencil", "Stencil"], ["carve", "Carve"], ["dress", "Dress"], ["finish", "Finish"]];
const PIECE_NAMES = { "eye-l": "Left eye", "eye-r": "Right eye", nose: "Nose", mouth: "Mouth", "ear-l": "Left ear", "ear-r": "Right ear", bat: "Bat", moon: "Moon", ghost: "Ghost", heart: "Heart", "star-a": "Star", "star-b": "Star", "star-c": "Star", "spark-l": "Sparkle", "spark-r": "Sparkle", beak: "Beak", "tuft-l": "Left tuft", "tuft-r": "Right tuft", chest: "Feathers", "brow-l": "Left brow", "brow-r": "Right brow", "cheek-l": "Left cheek", "cheek-r": "Right cheek", roof: "Roof", attic: "Attic window", door: "Door", web: "Web", spider: "Spider" };
const pieceName = (id) => PIECE_NAMES[id] ?? (id.startsWith("tooth") ? "Tooth" : id.startsWith("win") ? "Window" : id);
const hex = (n) => "#" + n.toString(16).padStart(6, "0");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ICONS = {
  knife: '<path d="M4 20 15 9m-2-2 6-4 2 2-4 6"/>',
  peeler: '<path d="M5 19 13 11"/><path d="M12 6c2-2 5-2 6 0s1 4-1 6l-3-3"/>',
  turn: '<path d="M20 12a8 8 0 1 1-3-6.2M20 4v5h-5"/>',
  trace: '<path d="M5 12c3-6 11-6 14 0-3 6-11 6-14 0z"/><circle cx="12" cy="12" r="2"/>',
  flame: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 2 4 1-2 1-5 1-8z"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

// A stencil drawn on a pumpkin, from the stencil's own polygons: cut pieces
// glow, etched ones glow softly.
export function stencilArt(stencil, colour = 0xe8862e, glow = "#ffd27a") {
  const pt = ([u, v]) => `${(u * 40 + 50).toFixed(1)},${(52 - v * 34).toFixed(1)}`;
  const path = (poly) => "M" + poly.map(pt).join("L") + "Z";
  const pieces = stencil.freehand
    ? `<path d="M30 40c6-8 14-8 18 0s-8 16-16 10M58 34l12 6-10 8z" fill="none" stroke="${glow}" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="1 5"/><path d="M66 70l14-26 4 2-12 27z" fill="#e0742e"/><path d="M66 70l-3 8 6-5z" fill="#d9dde6"/>`
    : stencil.pieces.map((p) => `<path d="${path(p.outer)}${(p.holes ?? []).map(path).join("")}" fill="${pieceKind(p) === "etch" ? "#f3c46c" : glow}" fill-opacity="${pieceKind(p) === "etch" ? .72 : 1}" fill-rule="evenodd"/>`).join("");
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="94" rx="36" ry="4" fill="#0a070f88"/><path d="M50 14c-30 0-44 16-44 40s16 38 44 38 44-14 44-38S80 14 50 14z" fill="${hex(colour)}"/><path d="M28 20c-8 10-10 50 0 68M72 20c8 10 10 50 0 68M50 15v78" stroke="#00000022" stroke-width="3" fill="none"/><path d="M48 15c0-6 2-9 6-11" stroke="#5d6a33" stroke-width="5" fill="none" stroke-linecap="round"/>${pieces}</svg>`;
}
// Each shape's outline, ribs and stem, for the cards and the shape buttons.
const SHAPE_ART = {
  ribbed: { body: "M32 10c-18 0-28 9-28 22s10 21 28 21 28-8 28-21S50 10 32 10z", ribs: "M18 13c-5 6-6 30 0 38M46 13c5 6 6 30 0 38M32 11v41", rib: 2.4, stem: 11 },
  round: { body: "M32 5c-15 0-25 11-25 25s10 25 25 25 25-11 25-25S47 5 32 5z", ribs: "M23 7c-4 8-4 38 0 46M41 7c4 8 4 38 0 46", rib: 1, stem: 6 },
  tall: { body: "M32 3c-13 0-20 12-20 27s7 26 20 26 20-11 20-26S45 3 32 3z", ribs: "M23 5c-4 10-4 41 0 49M41 5c4 10 4 41 0 49M32 4v51", rib: 1.8, stem: 4 },
  squat: { body: "M32 21c-21 0-30 6-30 15s9 16 30 16 30-7 30-16-9-15-30-15z", ribs: "M13 23c-5 5-5 21 0 27M23 22c-3 5-3 25 0 30M41 22c3 5 3 25 0 30M51 23c5 5 5 21 0 27", rib: 2.6, stem: 22 },
  warty: { body: "M32 7c-16 0-26 10-26 24s10 24 26 24 26-10 26-24S48 7 32 7z", ribs: "M20 10c-4 8-5 36 0 43M44 10c4 8 5 36 0 43", rib: 1.6, stem: 8, warts: [[17, 24], [45, 19], [25, 41], [48, 37], [36, 28], [12, 36], [31, 15], [40, 47]] },
};
function pumpkinSwatch(v, shape = "ribbed") {
  const variety = PUMPKIN_VARIETIES[v], a = SHAPE_ART[shape] ?? SHAPE_ART.ribbed, colour = hex(variety.color);
  const warts = (a.warts ?? []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${colour}" stroke="#ffffff40" stroke-width="1"/>`).join("");
  return `<svg viewBox="0 0 64 58" aria-hidden="true"><path d="${a.body}" fill="${colour}"/><path d="${a.ribs}" stroke="#00000026" stroke-width="${a.rib}" fill="none"/>${warts}<path d="M31 ${a.stem}c0-4 2-6 5-8" stroke="#5d6a33" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
}
// A ring that fills as a job gets done.
const gauge = (value, label, detail = "") => `<div class="carving-gauge" style="--p:${Math.round(Math.min(1, value) * 100)}" data-carve-gauge><i></i><div><b>${label}</b><small data-carve-detail>${detail}</small></div></div>`;

export function createCarvingUI({ state, view, actions, feel = () => {} }) {
  const root = document.createElement("section"); root.id = "carving"; root.className = "carving"; root.hidden = true; root.setAttribute("aria-label", "Pumpkin carving");
  document.body.append(root);
  let open = false, step = "pumpkin", shownStep = null, shapePick = "ribbed", decorTab = "candle", bookTab = null, last = null, seeds = null, photo = null, keys = new Set(), lastLook = "";
  const s = () => state();
  const cur = () => s().carving?.current ?? null;
  const made = () => s().carving?.made ?? 0;
  function derive() {
    const c = cur();
    if (last && !c) return "finish";
    if (!c) return "pumpkin";
    if (!c.lid || !c.scooped) return "open";
    const st = STENCIL_BY_ID[c.stencil], begun = c.cut.length + c.etched.length + c.free.length > 0;
    if (!st || (step === "stencil" && !begun)) return "stencil";
    if (!c.lit) return "carve";
    return step === "finish" ? "finish" : "dress";
  }
  const defaultName = (c) => { const st = STENCIL_BY_ID[c.stencil]; return `${PUMPKIN_VARIETIES[c.variety].name} ${st?.freehand ? "original" : st?.name.toLowerCase() ?? "lantern"}`; };
  function header() {
    const at = STEPS.findIndex(([id]) => id === step), c = cur();
    const titles = { pumpkin: "Pick a pumpkin", open: c?.lid ? "Scoop it out" : "Cut the lid", stencil: "Choose a design", carve: STENCIL_BY_ID[c?.stencil]?.freehand ? "Carve your own" : allDone() ? "Ready to light" : "Carve along the lines", dress: "Dress your lantern", finish: last ? "Lantern finished" : "Name it and keep it" };
    return `<header class="carving-top">
      <button class="carving-close" data-carve-close aria-label="Leave the bench"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg></button>
      <div class="carving-title"><small>Carving bench</small><h2>${titles[step]}</h2></div>
      <ol class="carving-steps" aria-label="Steps">${STEPS.map(([id, name], i) => `<li class="${i < at ? "done" : i === at ? "now" : ""}" aria-current="${i === at ? "step" : "false"}"><span>${i < at ? "✓" : i + 1}</span><b>${name}</b></li>`).join("")}</ol>
    </header>`;
  }
  const allDone = () => { const c = cur(), st = STENCIL_BY_ID[c?.stencil]; if (!st) return false; return st.freehand ? c.free.length > 0 : st.pieces.every((p) => (pieceKind(p) === "etch" ? c.etched : c.cut).includes(p.id)); };
  const traceLabel = () => { const m = view.status.mode; return m === "lid" ? "Hold to cut round" : m === "scoop" ? "Hold to scoop" : view.tool === "peeler" ? "Hold to peel" : "Hold to trace"; };
  const traceButton = () => `<button class="carving-trace" data-carve-trace>${icon("trace")}<span>${traceLabel()}</span></button>`;
  // The controls for this step, as the buttons of whatever is being used.
  let inputMode = globalThis.matchMedia?.("(pointer: coarse)")?.matches ? "touch" : "keyboard", padKind = "xbox", navigated = false;
  const menuStep = () => ["pumpkin", "stencil", "dress", "finish"].includes(step);
  function hints() {
    if (inputMode === "touch") return "";
    const pad = inputMode === "pad", G = (id) => glyphHTML(id, pad ? padKind : "keyboard"), m = view.status.mode, items = [];
    if (menuStep()) {
      items.push([pad ? G("lstick") + G("dpad") : G("lstick"), "Choose"], [G("confirm"), "Select"]);
      if (step === "pumpkin") items.push([G("lb") + G("rb"), "Shape"]);
      if (step === "stencil" || step === "dress") items.push([G("lb") + G("rb"), "Tabs"]);
    } else {
      const free = STENCIL_BY_ID[cur()?.stencil]?.freehand && m === "carve";
      items.push([G("lstick"), m === "scoop" ? "Move the scoop" : view.tool === "peeler" ? "Move the peeler" : "Move the knife"], [G("action"), m === "lid" ? "Hold to cut round" : m === "scoop" ? "Hold to scoop" : free ? "Hold to draw" : "Hold to trace"]);
      if (step === "carve") items.push([G("lb") + G("rb"), "Tool"]);
      if (pad) items.push([G("dpad"), "Panel"]);
    }
    items.push([G("rstick"), "Turn"], [G("lt") + G("rt"), "Zoom"]);
    if (pad || !menuStep()) items.push([G("start"), "Next"]);
    items.push([G("back"), "Leave"]);
    return items.map(([g, t]) => `<span>${g}<b>${t}</b></span>`).join("");
  }
  function pumpkinStep() {
    const stock = s().stock ?? [];
    return `<p class="carving-lead">Choose a shape, then a pumpkin from the barn. A rarer pumpkin makes a dearer lantern.</p>
      <div class="carving-shapes" role="group" aria-label="Shape">${PUMPKIN_SHAPES.map((sh) => `<button class="carving-shape" data-carve-shape="${sh.id}" aria-pressed="${shapePick === sh.id}">${pumpkinSwatch(0, sh.id)}<span>${sh.name}</span></button>`).join("")}</div>
      <div class="carving-grid">${PUMPKIN_VARIETIES.map((v, i) => { const n = Math.max(0, stock[i] ?? 0); return `<button class="carving-card" data-carve-pumpkin="${i}" ${n ? "" : "disabled"}>${pumpkinSwatch(i, shapePick)}<b>${esc(v.name)}</b><small>${n ? `${n} in the barn` : "None picked yet"}</small></button>`; }).join("")}</div>`;
  }
  function openStep() {
    const c = cur(), st = view.status;
    if (!c.lid) return `<p class="carving-lead">Run the knife round the stem, along the dotted ring, to cut the lid. Angle it in so the lid sits back on later.</p>
      ${gauge(st.lid, "The lid", `${Math.round(st.lid * 100)}% cut`)}
      <div class="carving-tools">${traceButton()}</div>`;
    const out = Math.min(1, (1 - st.pulp) / CARVING.scoopDone);
    return `<p class="carving-lead">Scoop out the pulp and the seeds. The seeds go in the bowl for the kitchen.</p>
      ${gauge(out, "Scooped", `<span data-carve-seeds>${st.seeds}</span> seeds in the bowl`)}
      <div class="carving-tools">${traceButton()}</div>`;
  }
  function stencilStep() {
    const c = cur(), colour = PUMPKIN_VARIETIES[c.variety].color, group = bookTab ?? STENCIL_BY_ID[c.stencil]?.group ?? "faces";
    const seedNote = seeds ? `<p class="carving-note">${seeds.pantry ? `${seeds.pantry} seeds to the pantry` : ""}${seeds.pantry && seeds.sold ? ", " : ""}${seeds.sold ? `${seeds.sold} sold for ${money(seeds.coins)}` : ""}.</p>` : "";
    const cards = STENCILS.filter((st) => st.group === group).map((st) => {
      const locked = (st.unlock ?? 0) > made(), picked = c.stencil === st.id;
      const etched = st.pieces.some((p) => pieceKind(p) === "etch");
      return `<button class="carving-card stencil ${picked ? "picked" : ""} ${locked ? "locked" : ""}" data-carve-stencil="${st.id}" aria-pressed="${picked}" ${locked ? "disabled" : ""}>${stencilArt(st, colour)}<b>${esc(st.name)}</b><small class="stars" aria-label="${st.difficulty} of 3">${"★".repeat(st.difficulty)}${"☆".repeat(3 - st.difficulty)}</small>${locked ? `<em class="carving-lock">Make ${st.unlock} lantern${st.unlock > 1 ? "s" : ""}</em>` : etched ? `<em class="carving-tag">Etched</em>` : ""}</button>`;
    }).join("");
    return `${seedNote}<div class="carving-tabs book" role="tablist">${STENCIL_GROUPS.map(([id, name]) => `<button role="tab" data-carve-book="${id}" aria-selected="${group === id}">${name}</button>`).join("")}</div>
      <div class="carving-grid stencils">${cards}</div>
      <button class="carving-go" data-carve-step="carve" ${c.stencil ? "" : "disabled"}>Start carving</button>`;
  }
  function pieceChips(status) {
    return `<ul class="carving-pieces">${status.pieces.map((p) => `<li class="${p.cut ? "cut" : ""} ${p.kind}" style="--p:${Math.round(p.progress * 100)}"><i></i><span>${pieceName(p.id)}</span></li>`).join("")}</ul>`;
  }
  function carveStep() {
    const c = cur(), st = STENCIL_BY_ID[c.stencil], status = view.status, etch = st.pieces.some((p) => pieceKind(p) === "etch"), tool = view.tool;
    const light = `<button class="carving-go glow" data-carve-light>${icon("flame")}Light the candle</button>`;
    const toolButtons = (list) => `<div class="carving-tools" role="group" aria-label="Tool">${list.map(([id, name]) => `<button data-carve-tool="${id}" aria-pressed="${tool === id}">${icon(id)}${name}</button>`).join("")}${st.freehand ? "" : traceButton()}</div>`;
    if (st.freehand) return `<p class="carving-lead">Draw any closed shape with the knife. When its ends meet, it cuts out. Eyes, a grin, a cat, your initials: up to ${CARVING.freeMax} shapes.</p>
      ${gauge(c.free.length / CARVING.freeMax, "Shapes cut", `<span data-carve-free>${c.free.length}</span> of ${CARVING.freeMax}`)}
      ${toolButtons([["knife", "Knife"], ["turn", "Turn"]])}
      ${c.free.length ? light : ""}`;
    if (allDone()) return `<p class="carving-lead">Every piece is out${etch ? " and every etching peeled" : ""}. Time to light it.</p>${pieceChips(status)}${light}`;
    return `<p class="carving-lead">${etch ? "Cut along the dotted lines with the knife. Scrub the blue-chalked areas with the peeler: the skin comes off and the flesh will glow softly." : "Drag the knife along each dotted line. When a piece's outline is cut, it pops out."}</p>
      ${pieceChips(status)}
      ${toolButtons(etch ? [["knife", "Knife"], ["peeler", "Peeler"], ["turn", "Turn"]] : [["knife", "Knife"], ["turn", "Turn"]])}`;
  }
  function dressStep() {
    const c = cur(), tabs = [["candle", "Candle"], ["paint", "Paint"], ["hat", "Hat"], ["stand", "Stand"], ["extras", "Extras"]];
    const opts = CARVING_DECOR[decorTab].map((o) => {
      const on = decorTab === "extras" ? c.decor.extras.includes(o.id) : c.decor[decorTab] === o.id;
      const dot = o.colour ? `<i style="--dot:${hex(Array.isArray(o.colour) ? o.colour[0] : o.colour)}"></i>` : "";
      return `<button class="carving-option" data-carve-decor="${decorTab}:${o.id}" aria-pressed="${on}">${dot}${esc(o.name)}</button>`;
    }).join("");
    return `<div class="carving-tabs" role="tablist">${tabs.map(([id, name]) => `<button role="tab" data-carve-tab="${id}" aria-selected="${decorTab === id}">${name}</button>`).join("")}</div>
      <div class="carving-options">${opts}</div>
      <div class="carving-value"><span>Fair price</span><b data-carve-value>${money(actions.value())}</b></div>
      <button class="carving-go" data-carve-step="finish">Finish</button>`;
  }
  function finishStep() {
    if (last) {
      return `<figure class="carving-photo">${photo ? `<img src="${photo}" alt="">` : `<div class="carving-photo-wait"></div>`}<figcaption><b>${esc(last.name || last.defaultName)}</b><small>${last.kept ? "Glowing on the doorstep" : `Sold at the fair for ${money(last.value)}`}</small></figcaption></figure>
        <div class="carving-actions"><button class="carving-go" data-carve-again>Carve another</button><button class="carving-secondary" data-carve-close>Back to the garden</button></div>`;
    }
    const c = cur(), value = actions.value(), full = s().carving.lanterns.length >= CARVING.lanternKeep;
    return `<figure class="carving-photo">${photo ? `<img src="${photo}" alt="Your lantern">` : `<div class="carving-photo-wait"></div>`}<figcaption><label class="carving-name"><small>Its name</small><input data-carve-name maxlength="${CARVING.nameMax}" value="${esc(c.name)}" placeholder="${esc(defaultName(c))}" autocomplete="off" spellcheck="false"></label></figcaption></figure>
      <div class="carving-value big"><span>Fair price</span><b>${money(value)}</b></div>
      <div class="carving-actions"><button class="carving-go" data-carve-finish="keep">Keep on the doorstep</button><button class="carving-secondary" data-carve-finish="sell">Sell for ${money(value)}</button></div>
      ${full ? `<p class="carving-note">The doorstep holds ${CARVING.lanternKeep}: the oldest lantern there makes way.</p>` : ""}
      <button class="carving-link" data-carve-step="dress">Back to dressing</button>`;
  }
  function render() {
    if (!open) return;
    const was = shownStep; step = derive(); shownStep = step;
    // A new step starts with the pad on the pumpkin where there's work to do, and on the panel's choices where there isn't.
    if (was !== step) { focusKey = null; padZone = menuStep() ? "panel" : "bench"; }
    if (step === "finish" && !last && was !== "finish") { photo = null; view.photo().then((url) => { photo = url; if (open && step === "finish") render(); }); }
    view.setStep(step);
    const body = { pumpkin: pumpkinStep, open: openStep, stencil: stencilStep, carve: carveStep, dress: dressStep, finish: finishStep }[step]();
    // Keep the name box's focus and caret across a render.
    const typing = document.activeElement?.matches?.("[data-carve-name]") ? document.activeElement.selectionStart : null;
    root.innerHTML = header() + `<div class="carving-panel" data-step="${step}">${body}<div class="carving-keys" data-carve-hints>${hints()}</div></div>`;
    root.dataset.step = step; root.dataset.input = inputMode; lastLook = look(); applyFocus();
    if (typing !== null) { const input = root.querySelector("[data-carve-name]"); input?.focus(); input?.setSelectionRange(typing, typing); }
  }
  // What the panel shows that changes as the tools work, so it's re-rendered only when that changes.
  const look = () => { const st = view.status; return [step, shapePick, st.mode, st.tool, st.pieces.map((p) => p.cut).join(), st.free, allDone(), cur()?.lid, cur()?.scooped].join("|"); };
  // Live progress patched in place: piece rings, the lid and scoop gauges, seeds and shapes.
  function progress(status) {
    if (!open) return;
    if (look() !== lastLook) { render(); return; }
    const list = root.querySelector(".carving-pieces");
    if (list) status.pieces.forEach((p, i) => { const li = list.children[i]; if (li) { li.style.setProperty("--p", Math.round(p.progress * 100)); li.classList.toggle("cut", p.cut); } });
    const g = root.querySelector("[data-carve-gauge]");
    if (g && step === "open") {
      const value = status.mode === "lid" ? status.lid : Math.min(1, (1 - status.pulp) / CARVING.scoopDone); g.style.setProperty("--p", Math.round(value * 100));
      if (status.mode === "lid") root.querySelector("[data-carve-detail]").textContent = `${Math.round(status.lid * 100)}% cut`;
      const seedsEl = root.querySelector("[data-carve-seeds]"); if (seedsEl) seedsEl.textContent = status.seeds;
    }
  }
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    if (b.dataset.carveShape) { shapePick = b.dataset.carveShape; feel("tick"); }
    else if (b.dataset.carvePumpkin !== undefined) { if (actions.start(+b.dataset.carvePumpkin, shapePick)) { last = null; seeds = null; bookTab = null; feel("select"); step = "open"; } }
    else if (b.dataset.carveBook) { bookTab = b.dataset.carveBook; feel("tick"); }
    else if (b.dataset.carveStencil) { actions.stencil(b.dataset.carveStencil); feel("select"); }
    else if (b.dataset.carveStep) { step = b.dataset.carveStep; }
    else if (b.dataset.carveTool) { view.setTool(b.dataset.carveTool); feel("tick"); }
    else if (b.dataset.carveLight !== undefined) { if (actions.light()) { feel("done"); step = "dress"; } }
    else if (b.dataset.carveTab) decorTab = b.dataset.carveTab;
    else if (b.dataset.carveDecor) { const [g, id] = b.dataset.carveDecor.split(":"); actions.decor(g, id); feel("select"); }
    else if (b.dataset.carveFinish) { const c = cur(), name = c ? defaultName(c) : ""; const l = actions.finish(b.dataset.carveFinish); if (l) { last = { ...l, defaultName: name, kept: b.dataset.carveFinish === "keep" }; feel("done"); } }
    else if (b.dataset.carveAgain !== undefined) { last = null; seeds = null; photo = null; step = "pumpkin"; }
    else if (b.dataset.carveClose !== undefined) { actions.close(); return; }
    render();
  });
  root.addEventListener("input", (e) => { if (e.target.matches("[data-carve-name]")) actions.name(e.target.value); });
  // Hold to trace: the current job runs on while it's held.
  const holdTrace = (on) => view.setTracing(on);
  root.addEventListener("pointerdown", (e) => { setInput(e.pointerType === "touch" ? "touch" : "keyboard"); if (e.pointerType !== "touch" && navigated) { navigated = false; applyFocus(); } if (e.target.closest("[data-carve-trace]")) { e.preventDefault(); holdTrace(true); } });
  addEventListener("pointerup", () => holdTrace(false)); addEventListener("pointercancel", () => holdTrace(false));
  // What the controls point at changes the prompts; the pad's highlight shows only for the pad.
  function setInput(mode, pad = null) {
    if (pad) padKind = /dualsense|wireless controller|054c|playstation|ps5/i.test(pad.id) ? "dualsense" : "xbox";
    if (mode === "touch") navigated = false;
    if (mode === inputMode) return;
    inputMode = mode; if (!open) return;
    root.dataset.input = mode; const h = root.querySelector("[data-carve-hints]"); if (h) h.innerHTML = hints(); applyFocus();
  }
  // The pad's highlight in the panel, kept by what it points at across renders.
  let focusKey = null, padZone = "bench";
  const keyOf = (el) => { const a = [...el.attributes].find((x) => x.name.startsWith("data-carve-")); return a ? `[${a.name}${a.value ? `="${a.value}"` : ""}]` : null; };
  const focusables = () => [...root.querySelectorAll("button:not(:disabled), input")].filter((el) => el.getClientRects().length);
  const primary = () => root.querySelector(".carving-go:not(:disabled), [data-carve-light]");
  function applyFocus() {
    root.querySelectorAll("[data-pad-focus]").forEach((el) => el.removeAttribute("data-pad-focus"));
    if (inputMode === "touch" || !(inputMode === "pad" || navigated) || (padZone !== "panel" && !menuStep())) return;
    let el = focusKey && root.querySelector(focusKey);
    // By default: what's picked, else the first card to pick, else what's chosen, else the
    // next step's button, else the first choice (never the way out).
    if (!el || el.disabled) { el = root.querySelector(".carving-card.picked:not(:disabled)") ?? root.querySelector(".carving-card:not(:disabled)") ?? root.querySelector(".carving-option[aria-pressed='true']") ?? primary() ?? root.querySelector(".carving-panel [aria-pressed='true']:not(:disabled), .carving-panel [aria-selected='true']") ?? focusables().find((x) => !x.matches("[data-carve-close]")); focusKey = el && keyOf(el); }
    if (!el) return;
    el.setAttribute("data-pad-focus", ""); el.scrollIntoView?.({ block: "nearest" });
  }
  // Moves the highlight to the nearest button that way.
  function moveFocus(dx, dy) {
    padZone = "panel"; navigated = true;
    const now = focusKey && root.querySelector(focusKey), list = focusables();
    if (!now) { applyFocus(); return; }
    const a = now.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, score = Infinity;
    for (const el of list) {
      if (el === now) continue;
      const b = el.getBoundingClientRect(), bx = b.left + b.width / 2, by = b.top + b.height / 2, along = dx ? (bx - ax) * dx : (by - ay) * dy, across = dx ? Math.abs(by - ay) : Math.abs(bx - ax);
      if (along < 4) continue;
      const k = along + across * 2.4; if (k < score) { score = k; best = el; }
    }
    if (best) { focusKey = keyOf(best); feel("tick"); }
    applyFocus();
    // Real focus too, so Enter presses it from the keyboard.
    if (inputMode === "keyboard") root.querySelector(focusKey)?.focus({ preventScroll: true });
  }
  // LB / RB (Q / R): the next tool, or the next tab of the book or the dressing.
  function cycle(dir) {
    // The highlight goes to the new tab's first choice.
    const groups = (list, now, set) => { const i = list.indexOf(now); set(list[(i + dir + list.length) % list.length]); if (step !== "carve") focusKey = null; feel("tick"); render(); };
    if (step === "pumpkin") groups(PUMPKIN_SHAPES.map((sh) => sh.id), shapePick, (id) => { shapePick = id; });
    else if (step === "stencil") groups(STENCIL_GROUPS.map(([id]) => id), bookTab ?? STENCIL_BY_ID[cur()?.stencil]?.group ?? "faces", (id) => { bookTab = id; });
    else if (step === "dress") groups(["candle", "paint", "hat", "stand", "extras"], decorTab, (id) => { decorTab = id; });
    else if (step === "carve") {
      const st = STENCIL_BY_ID[cur()?.stencil], list = st?.freehand || !st?.pieces.some((p) => pieceKind(p) === "etch") ? ["knife", "turn"] : ["knife", "peeler", "turn"];
      groups(list, view.tool, (t) => view.setTool(t));
    }
  }
  const press = (el) => { if (!el || el.disabled) return; if (el.matches("input")) { el.focus(); return; } el.click(); };
  addEventListener("keydown", (e) => {
    if (!open) return;
    setInput("keyboard");
    const k = e.key.toLowerCase();
    // Stopped here, or main.js would see the same Escape once the bench has shut and leave the garden too.
    if (k === "escape") { e.preventDefault(); e.stopPropagation(); if (e.target.closest?.("input")) e.target.blur(); else actions.close(); return; }
    if (e.target.closest?.("input,textarea")) return;
    if (k === "enter" && !e.target.closest?.("button")) { e.preventDefault(); press(primary()); return; }
    // E or Space presses what the arrows picked in the panel's menus, and does the job on the pumpkin.
    if ((k === "e" || k === " ") && menuStep()) { e.preventDefault(); if (!e.repeat) press(navigated && focusKey ? root.querySelector(focusKey) : primary()); return; }
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "i", "j", "k", "l", "e", " "].includes(k)) { e.preventDefault(); keys.add(k); if (k === "e" || k === " ") holdTrace(true); }
    if (k === "[" || k === "]") view.zoom(k === "]" ? 1 : -1);
    if ((k === "q" || k === "r") && !e.repeat) { e.preventDefault(); cycle(k === "q" ? -1 : 1); }
    if (k === "c") view.reset();
  }, true);
  addEventListener("keyup", (e) => { const k = e.key.toLowerCase(); keys.delete(k); if (k === "e" || k === " ") holdTrace(false); }, true);
  let padTrace = false, padPrev = null, navAt = 0, navHeld = false, zoomAt = 0;
  function tick(dt) {
    if (!open) return;
    const has = (...k) => k.some((x) => keys.has(x)), menu = menuStep();
    let mx = (has("arrowright", "d") ? 1 : 0) - (has("arrowleft", "a") ? 1 : 0), my = (has("arrowup", "w") ? 1 : 0) - (has("arrowdown", "s") ? 1 : 0);
    let ox = (has("l") ? 1 : 0) - (has("j") ? 1 : 0), oy = (has("i") ? 1 : 0) - (has("k") ? 1 : 0);
    const pad = Array.from(navigator.getGamepads?.() ?? []).find((g) => g?.connected);
    // In the menus the arrow keys move the highlight, as the D-pad does.
    const now = performance.now();
    let nav = menu && (mx || my) ? (mx ? [mx, 0] : [0, -my]) : [0, 0];
    if (menu) mx = my = 0;
    if (pad) {
      const down = pad.buttons.map((b) => !!b?.pressed), dz = (n) => Math.abs(n) > .18 ? n : 0;
      // Buttons already held as the bench opened (the A that opened it) wait to be let go.
      if (!padPrev) padPrev = down.slice();
      const pressed = (i) => down[i] && !padPrev[i], lx = dz(pad.axes[0] ?? 0), ly = dz(pad.axes[1] ?? 0);
      if (down.some(Boolean) || pad.axes.some((a) => Math.abs(a) > .4)) setInput("pad", pad);
      // The highlight: the D-pad always, and the left stick where there's no tool to move.
      if (down[12] || down[13] || down[14] || down[15]) nav = down[12] ? [0, -1] : down[13] ? [0, 1] : down[14] ? [-1, 0] : [1, 0];
      else if (menu && Math.hypot(lx, ly) > .55) nav = Math.abs(lx) > Math.abs(ly) ? [Math.sign(lx), 0] : [0, Math.sign(ly)];
      if (!menu) {
        if (Math.hypot(lx, ly) > .3 && padZone !== "bench") { padZone = "bench"; applyFocus(); }
        mx += lx; my -= ly;
      }
      ox += dz(pad.axes[2] ?? 0); oy -= dz(pad.axes[3] ?? 0);
      // A selects in the panel; on the pumpkin, A or X held does the job.
      if (pressed(0) && (menu || padZone === "panel")) press(focusKey && root.querySelector(focusKey));
      const work = !menu && ((down[0] && padZone === "bench") || down[2]);
      if (work !== padTrace) { padTrace = work; holdTrace(work); }
      if (pressed(4)) cycle(-1); if (pressed(5)) cycle(1);
      if ((down[6] || down[7]) && now >= zoomAt) { view.zoom(down[7] ? 1 : -1); zoomAt = now + 110; }
      if (pressed(3) || pressed(11)) { view.reset(); feel("tick"); }
      if (pressed(9)) press(primary());
      padPrev = down;
    }
    if (nav[0] || nav[1]) { if (now >= navAt) { moveFocus(nav[0], nav[1]); navAt = now + (navHeld ? 150 : 360); navHeld = true; } }
    else { navHeld = false; navAt = 0; }
    if ((mx || my) && !menu) view.nudge(mx, my, dt);
    if (ox || oy) view.orbit(ox, oy, dt);
  }
  // Frame the pumpkin clear of the panel: beside it on wide screens, above it on phones.
  const inset = () => { if (open) view.setInset(innerWidth >= 760 ? 392 : 0, innerWidth >= 760 ? 0 : Math.round(innerHeight * .44)); };
  addEventListener("resize", inset);
  return {
    open() { open = true; last = null; photo = null; padPrev = null; padZone = "bench"; focusKey = null; shownStep = null; step = derive(); root.hidden = false; inset(); render(); },
    close() { open = false; root.hidden = true; keys.clear(); padTrace = false; holdTrace(false); view.setInset(0, 0); },
    render, progress, tick,
    // The seeds just scooped, for the note above the stencil book.
    scooped(result) { seeds = result; },
    // The tool the view switched to by itself.
    tool() { if (open) render(); },
    revealed() { if (open) render(); },
    get isOpen() { return open; },
    get step() { return step; },
  };
}
