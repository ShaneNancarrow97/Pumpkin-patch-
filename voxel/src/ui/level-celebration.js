// A finite celebration above the playfield. Awards are already committed by
// the pure rules; closing, reloading or skipping the animation cannot lose one.
import { LEVELS, dismissLevel, patchLevel, homeRequirements } from "../rules/levels.js";
import { decorById, costumeById } from "../model.js";
import { decorIcon, money } from "./kit.js";

export function createLevelCelebration({ state, audio, save, openRewards }) {
  const overlay = document.getElementById("level-celebration");
  let shown = null, previousFocus = null, inert = [], particlesTimer;
  const rewardRow = (r, preview = false) => {
    let art = `<span class="reward-symbol" aria-hidden="true">✦</span>`, title, caption;
    if (r.duplicate) { title = money(r.kind === "upgrade" ? 100 : 50) + " bonus coins"; caption = "Already yours · a little extra instead"; }
    else if (r.kind === "coins") { art = `<span class="thumb"><span class="coin-icon"></span></span>`; title = money(r.amount) + " bonus coins"; caption = preview ? "Added when you reach this level" : "Added to your purse"; }
    else if (r.kind === "decor") { art = decorIcon(r.id); title = decorById[r.id].name; caption = preview ? "Free decor · no purchase needed" : "Free decor · Home → Decorate"; }
    else if (r.kind === "costume") { const url = window.PumpkinVoxel?.scene.portrait(r.id); art = `<span class="thumb tall">${url ? `<img src="${url}" alt="">` : "☾"}</span>`; title = costumeById[r.id].name; caption = preview ? "Free costume · yours to keep" : "Free costume · Wardrobe"; }
    else { title = r.name; caption = preview ? "One free upgrade tier" : "Upgraded by one tier · already active"; }
    return `<li class="level-reward">${art}<span><b>${title}</b><small>${caption}</small></span>${preview ? "" : `<span class="reward-tick" aria-label="Granted">✓</span>`}</li>`;
  };
  function release() {
    clearTimeout(particlesTimer); overlay.hidden = true; overlay.innerHTML = "";
    for (const [el, was] of inert) el.inert = was;
    inert = []; shown = null;
    if (previousFocus?.isConnected && !previousFocus.inert) previousFocus.focus({ preventScroll: true });
  }
  function finish() {
    if (typeof shown === "number") dismissLevel(state(), shown);
    save(); release();
  }
  function show(level, preview = false) {
    previousFocus = document.activeElement;
    shown = preview ? "preview" : level.level;
    inert = [...document.body.children].filter((el) => el !== overlay && el.tagName !== "SCRIPT").map((el) => [el, el.inert]);
    for (const [el] of inert) el.inert = true;
    const s = state(), current = patchLevel(s), rewards = preview ? level.rewards : s.progression.receipts[level.level] ?? level.rewards;
    const pieces = !preview && !matchMedia("(prefers-reduced-motion: reduce)").matches ? Array.from({ length: 28 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--delay:${(i % 7) * 0.07}s;--turn:${i % 2 ? "280deg" : "-230deg"};--drift:${(i % 5 - 2) * 32}px;--tone:${["#e7b46e", "#bfaae5", "#ea8b46", "#9db382"][i % 4]}">${["✦", "☾", "◆", "✧"][i % 4]}</i>`).join("") : "";
    overlay.innerHTML = `<div class="level-confetti" aria-hidden="true">${pieces}</div><article class="level-card">
      <button class="icon-button close level-close" aria-label="Close level rewards">×</button>
      <span class="level-medal" aria-hidden="true"><small>LEVEL</small><b>${level.level}</b></span>
      <p class="eyebrow">${preview ? "Your next chapter" : "A little more spooktacular"}</p>
      <h2 id="level-celebration-title">${level.name}</h2>
      <p class="level-subtitle">${preview ? `${money(Math.max(0, level.at - current.xp))} more earned to reach level ${level.level}.` : "Your patch has levelled up. These treats are yours!"}</p>
      ${preview ? `<div class="bar"><i style="width:${current.progress * 100}%"></i></div><ul class="home-goals">${homeRequirements(s,level.level).map(r=>`<li><span>${r.met?"✓":"◇"}</span><span>${r.text}</span></li>`).join("")}</ul>` : ""}
      <ul class="level-rewards">${rewards.map((r) => rewardRow(r, preview)).join("")}</ul>
      <button class="button gold wide level-continue">${preview ? "Back to the patch" : "Lovely! Keep growing"}</button>
      ${!preview ? `<button class="level-details" data-level-details>View all level rewards</button>` : ""}
    </article>`;
    overlay.hidden = false;
    overlay.querySelector(".level-continue").onclick = finish;
    overlay.querySelector(".level-close").onclick = finish;
    overlay.querySelector("[data-level-details]")?.addEventListener("click", () => { finish(); openRewards(); });
    overlay.querySelector(".level-continue").focus({ preventScroll: true });
    if (!preview) { audio.levelUp(); particlesTimer = setTimeout(() => overlay.querySelector(".level-confetti")?.remove(), 2800); }
  }
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(); }
    if (e.key === "Tab") {
      const buttons = [...overlay.querySelectorAll("button")], first = buttons[0], last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  return {
    get active() { return shown !== null; },
    tick(blocked) { if (shown === null && !blocked && state().progression?.pending.length) show(LEVELS[state().progression.pending[0] - 1]); },
    preview() { const lvl = patchLevel(state()); if (shown !== null) return; if (lvl.next) show(lvl.next, true); else openRewards(); },
    rewardRow,
  };
}
