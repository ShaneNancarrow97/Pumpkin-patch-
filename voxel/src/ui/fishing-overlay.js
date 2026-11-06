// Fishing at the lake (handover 71): a panel low on the screen, over the
// garden, while a line is out. ✕ (Space, Enter, a tap) casts, strikes when
// the float goes under, and casts again; ○ (Escape) reels in and closes. The
// rules (rules/fishing.js) time the wait and the strike window; this shows
// them, plays the bite and the catch, and reads the pad's ✕ itself while play
// mode's controls stand aside, as the carving bench does.
import * as M from "../model.js";
import { money } from "./kit.js";
import { fishPicture } from "./fishing-art.js";

const RARITY = { common: "Common", uncommon: "Uncommon", rare: "Rare", legendary: "Legendary", junk: "Junk" };
const weight = (n) => (n < 1 ? `${Math.round(n * 1000)} g` : `${n.toFixed(2)} kg`);
const padNow = () => Array.from(navigator.getGamepads?.() ?? []).find((g) => g?.connected) ?? null;

export function createFishingOverlay({ state, save, tone, onOpen = () => {}, onClose = () => {} }) {
  const el = document.createElement("div");
  el.id = "fishing"; el.className = "fishing-panel"; el.hidden = true; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Fishing at the lake");
  document.body.append(el);
  let open = false, shown = null, result = null, crossWas = false, biteAt = 0;

  const glyph = (k) => `<span class="fish-glyph" data-k="${k}" aria-hidden="true">${k === "x" ? "✕" : "○"}</span>`;
  // Where the catch went: the pantry, a collector, or back in the lake.
  function went(r) {
    if (r.junk) return "Back in the lake it goes.";
    const parts = Object.entries(r.pantry ?? {}).map(([id, n]) => `${n} ${M.INGREDIENT_BY_ID[id].name.toLowerCase()} to the pantry`);
    if (r.coins) parts.push(r.sold ? `${r.sold} sold at the market for ${money(r.coins)}` : `sold to a collector for ${money(r.coins)}`);
    return parts.length ? parts.join(", ") + "." : "";
  }
  function view(phase) {
    const s = state(), bait = M.currentBait(s), rod = M.currentRod(s);
    const actions = (main, label, also = "Done") => `<div class="fishing-actions"><button class="button gold can-act" data-fish-act="main">${glyph("x")}${label}</button><button class="button" data-fish-act="close">${glyph("o")}${also}</button></div>`;
    if (phase === "wait") return `<div class="fishing-state is-waiting"><span class="fishing-float" aria-hidden="true"></span><div><h3>Waiting for a bite…</h3><p>Strike when the float goes under. ${bait.name} on the hook.</p></div></div>${actions("strike", "Strike", "Reel in")}`;
    if (phase === "bite") return `<div class="fishing-state is-bite"><span class="fishing-ring" aria-hidden="true"></span><div><h3>Bite! Strike now!</h3><p>The float's under: you've ${rod.window.toFixed(1)}s.</p></div></div>${actions("strike", "Strike!", "Reel in")}`;
    if (phase === "gone") return `<div class="fishing-state"><span class="fishing-float is-still" aria-hidden="true"></span><div><h3>It got away</h3><p>Strike as soon as the float dips${rod.window < 1.2 ? ": a better rod gives you longer" : ""}.</p></div></div>${actions("cast", "Cast again")}`;
    if (phase === "early") return `<div class="fishing-state"><span class="fishing-float is-still" aria-hidden="true"></span><div><h3>Too soon</h3><p>That was a nibble, and you scared it off. Wait for the float to go right under.</p></div></div>${actions("cast", "Cast again")}`;
    if (phase === "caught" && result) {
      const f = M.FISH_BY_ID[result.id], badge = result.first ? `<span class="fishing-badge">New!</span>` : result.record ? `<span class="fishing-badge">Personal best</span>` : "";
      return `<div class="fishing-catch rarity-${f.rarity}">${fishPicture(f.id, "fishing-catch-render")}<div><span class="fish-rarity">${RARITY[f.rarity]}</span>${badge}<h3>${f.name}</h3><p class="fishing-weight">${weight(result.kg)}</p><p>${went(result)}</p></div></div>${actions("cast", "Cast again")}`;
    }
    const st = M.fishingStatus(s);
    return `<div class="fishing-state"><span class="fishing-float is-still" aria-hidden="true"></span><div><h3>On the jetty</h3><p>${rod.name}, ${bait.name.toLowerCase()}.${st.waiting ? ` ${st.waiting} in the traps.` : ""}</p></div></div>${actions("cast", "Cast a line")}`;
  }
  function draw(phase) {
    el.innerHTML = view(phase); shown = phase;
    el.querySelector('[data-fish-act="main"]').onclick = main;
    el.querySelector('[data-fish-act="close"]').onclick = close;
  }

  // ✕: cast when the line is in, strike while it's out.
  function main() {
    const s = state(), phase = s.fishing.line?.phase ?? null;
    if (phase === "wait" || phase === "bite") {
      const r = M.strikeLine(s);
      if (r && !r.early) { result = r; tone(523); setTimeout(() => tone(784), 120); if (M.FISH_BY_ID[r.id].rarity === "legendary") setTimeout(() => tone(1047), 260); save(); }
      else if (r?.early) tone(220);
    } else if (M.castLine(s)) { result = null; tone(392); }
  }
  function close() {
    if (!open) return; const s = state();
    M.reelIn(s); open = false; el.hidden = true; document.body.classList.remove("fishing-open"); save(); onClose();
  }
  return {
    get isOpen() { return open; },
    open() {
      const s = state(); if (!M.fishingLake(s) || s.paused) return false;
      open = true; el.hidden = false; document.body.classList.add("fishing-open"); result = null; shown = undefined; crossWas = !!padNow()?.buttons?.[0]?.pressed;
      onOpen(); this.update(); return true;
    },
    close,
    // Keys while the panel is open: Space or Enter for ✕, Escape for ○.
    key(e) {
      if (!open) return false;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); main(); return true; }
      if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); close(); return true; }
      return true;
    },
    // Every frame: redraw when the line changes, run the bite's ring, read ✕.
    update() {
      if (!open) return;
      const s = state(), line = s.fishing.line, phase = line?.phase ?? null;
      if (phase !== shown) {
        if (phase === "bite") { biteAt = performance.now(); tone(988); padNow()?.vibrationActuator?.playEffect?.("dual-rumble", { duration: 220, strongMagnitude: .7, weakMagnitude: .5 }).catch?.(() => {}); }
        if (phase === "gone") tone(196);
        draw(phase);
      }
      if (phase === "bite") el.style.setProperty("--left", String(Math.max(0, 1 - line.t / line.window)));
      const cross = !!padNow()?.buttons?.[0]?.pressed;
      if (cross && !crossWas) main();
      crossWas = cross;
    },
    get biteAt() { return biteAt; },
  };
}
