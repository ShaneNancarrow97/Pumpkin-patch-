// Awards are committed by the rules before this receipt opens. Browsing cards,
// dismissing it or visiting home can never grant another copy of a reward.
import { LEVELS, dismissLevel, patchLevel } from "../rules/levels.js";
import { decorIcon, money } from "./kit.js";
import { levelGiftCard, levelReceiptCards, levelRequirementView, createRewardCarousel } from "./level-reward-cards.js";
import { levelRewardIcon, levelBadgeMarkup } from "./level-reward-icon-markup.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduceMotion = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

export function createLevelCelebration({ state, audio, save, openRewards, openHome, openVillage }) {
  const overlay = document.getElementById("level-celebration");
  let shown = null, previousFocus = null, inert = [], particlesTimer, carousel = null, cards = [], swipe = null, generation = 0;
  const artFor = (card, size = 96) => {
    if (card.kind === "decor" && card.origin === "gift") return decorIcon(card.id, size);
    if (card.kind === "costume" && card.origin === "gift") {
      const url = globalThis.window?.PumpkinVoxel?.scene?.portrait?.(card.id);
      if (url) return `<span class="level-costume-art"><img src="${esc(url)}" alt=""></span>`;
    }
    return levelRewardIcon(card.kind, size);
  };
  // Retained for any existing list-style receipts outside the celebration.
  const rewardRow = (reward, preview = false) => {
    const card = levelGiftCard(reward, { preview });
    return `<li class="level-reward">${artFor(card, 44)}<span><b>${esc(card.title)}</b><small>${esc(card.where)}</small></span>${preview ? "" : '<span class="reward-tick" aria-label="Granted">✓</span>'}</li>`;
  };
  function release() {
    clearTimeout(particlesTimer); overlay.hidden = true; overlay.innerHTML = "";
    for (const [el, was] of inert) el.inert = was;
    inert = []; shown = null; generation++; cards = []; carousel = null; swipe = null;
    if (previousFocus?.isConnected && !previousFocus.inert) previousFocus.focus({ preventScroll: true });
  }
  function finish(session = generation) {
    if (shown === null || session !== generation) return false;
    if (typeof shown === "number") dismissLevel(state(), shown);
    save(); release(); return true;
  }
  function selectCard(index, focus = false) {
    if (!carousel) return;
    const selected = carousel.select(index), tabs = [...overlay.querySelectorAll("[data-level-card-tab]")];
    overlay.querySelectorAll("[data-level-card-view]").forEach((card, i) => { card.hidden = i !== selected; });
    tabs.forEach((tab, i) => { tab.setAttribute("aria-selected", String(i === selected)); tab.setAttribute("aria-pressed", String(i === selected)); tab.tabIndex = i === selected ? 0 : -1; });
    const prev = overlay.querySelector("[data-level-prev]"), next = overlay.querySelector("[data-level-next]");
    prev.disabled = selected === 0; next.disabled = selected === cards.length - 1;
    overlay.querySelector("[data-level-card-count]").textContent = `Card ${selected + 1} of ${cards.length}`;
    if (focus || document.activeElement === prev && prev.disabled || document.activeElement === next && next.disabled) tabs[selected]?.focus({ preventScroll: true });
    // Reveal only the horizontal dot strip; scrollIntoView would also pull
    // the requirements above it underneath the fixed receipt header.
    const tab = tabs[selected], strip = tab?.parentElement;
    if (strip) {
      const item = tab.getBoundingClientRect(), frame = strip.getBoundingClientRect();
      if (item.left < frame.left) strip.scrollLeft += item.left - frame.left;
      else if (item.right > frame.right) strip.scrollLeft += item.right - frame.right;
    }
  }
  function requirementsMarkup(s) {
    const view = levelRequirementView(s), next = view.next;
    if (!next) return "";
    const earning = view.earnings, unmet = view.home.filter(row => !row.met), remaining = Math.max(0, earning.need - earning.have);
    const needsVillage = unmet[0]?.action === "village", canVisit = needsVillage ? openVillage : openHome;
    return `<section class="level-requirements" aria-labelledby="level-requirements-title"><div class="level-requirements-heading"><h3 id="level-requirements-title">To reach level ${next.level}</h3><span>Level ${view.current.level} → ${next.level}</span></div><div class="level-earning-goal"><span>Farm earnings</span><b>${money(earning.have)} <small>/ ${money(earning.need)}</small></b><span class="level-goal-status${earning.met ? " is-met" : ""}">${earning.met ? "Met" : `${money(remaining)} to go`}</span></div><div class="level-earnings-track" role="progressbar" aria-label="Earnings towards next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(view.current.progress * 100)}"><i style="width:${view.current.progress * 100}%"></i></div><p class="level-requirements-note">Farm earnings count here; bonus reward coins do not.</p>${view.home.length ? `<ul class="level-home-checklist">${view.home.map(row => `<li class="${row.met ? "is-met" : ""}"><span aria-hidden="true">${row.met ? "✓" : "◇"}</span><span>${esc(row.text)}</span><b>${row.met ? "Met" : "Still needed"}</b></li>`).join("")}</ul>` : '<p class="level-requirements-note">No home milestone is needed for this level.</p>'}${unmet.length ? `<div class="level-home-nudge"><p>${earning.met ? "Your earnings are ready. Finish the requirements above to level up." : "Earnings and the requirements above are both needed."}</p>${canVisit ? `<button class="button" ${needsVillage ? "data-level-village" : "data-level-home"}>Visit ${needsVillage ? "village" : "home"}</button>` : ""}</div>` : ""}</section>`;
  }
  function cardMarkup(card, i) {
    const price = card.price == null ? "" : `<span class="level-card-price">${card.price ? money(card.price) : "Starter recipe"}</span>`;
    return `<article class="level-trading-card level-trading-${card.kind}" id="level-reward-panel-${i}" role="tabpanel" aria-labelledby="level-reward-tab-${i}" data-level-card-view="${i}" data-level-origin="${card.origin}" data-level-key="${esc(card.key)}"${i ? " hidden" : ""}><div class="level-trading-top"><span class="level-trading-badge">${esc(card.badge)}</span>${price}</div><div class="level-trading-art" aria-hidden="true">${artFor(card)}</div><h3>${esc(card.title)}</h3><p>${esc(card.text)}</p><footer><b>${esc(card.where)}</b>${card.note ? `<small>${esc(card.note)}</small>` : ""}</footer></article>`;
  }
  function show(level, preview = false) {
    previousFocus = document.activeElement; shown = preview ? "preview" : level.level;
    const session = ++generation, current = () => shown !== null && session === generation;
    inert = [...document.body.children].filter(el => el !== overlay && el.tagName !== "SCRIPT").map(el => [el, el.inert]);
    for (const [el] of inert) el.inert = true;
    const s = state(), view = levelRequirementView(s); cards = levelReceiptCards(level, s, preview); carousel = createRewardCarousel(cards.length);
    const gifts = cards.filter(card => card.origin === "gift").length, opened = cards.length - gifts;
    const pieces = !preview && !reduceMotion() ? Array.from({ length: 28 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--delay:${(i % 7) * .07}s;--turn:${i % 2 ? "280deg" : "-230deg"};--drift:${(i % 5 - 2) * 32}px;--tone:${["#e7b46e", "#bfaae5", "#ea8b46", "#9db382"][i % 4]}">${["✦", "☾", "◆", "✧"][i % 4]}</i>`).join("") : "";
    overlay.dataset.levelMode = preview ? "requirements" : "celebration";
    overlay.innerHTML = `<div class="level-confetti" aria-hidden="true">${pieces}</div><article class="level-card level-receipt"><header class="level-receipt-heading"><button class="icon-button close level-close" aria-label="Close level rewards">×</button><span class="level-medal" aria-hidden="true">${levelBadgeMarkup(level.level, 86)}</span><p class="eyebrow">${preview ? `Your next level · ${view.current.level} → ${level.level}` : `Level ${level.level} reached`}</p><h2 id="level-celebration-title">${esc(level.name)}</h2><p class="level-subtitle">${preview ? "Your checklist, then a peek at what opens next." : "Your gifts are already safely added. Explore what this level opens."}</p></header><div class="level-receipt-body">${preview ? requirementsMarkup(s) : ""}<section class="level-carousel" aria-label="Level rewards and unlocks"><div class="level-carousel-heading"><h3>${preview ? "Coming with this level" : "Your level collection"}</h3><span>${gifts} ${gifts === 1 ? "gift" : "gifts"}${opened ? ` · ${opened} ${opened === 1 ? "unlock" : "unlocks"}` : ""}</span></div><div class="level-card-stage" data-level-card-stage>${cards.map(cardMarkup).join("")}</div><div class="level-carousel-controls"><button data-level-prev aria-label="Previous reward card">‹</button><div class="level-card-tabs" data-pad-tabs role="tablist" aria-label="Choose a reward card">${cards.map((card, i) => `<button role="tab" id="level-reward-tab-${i}" aria-controls="level-reward-panel-${i}" aria-selected="${!i}" aria-pressed="${!i}" aria-label="Card ${i + 1}: ${esc(card.title)}" data-level-card-tab="${i}" tabindex="${i ? -1 : 0}"><span aria-hidden="true"></span></button>`).join("")}</div><button data-level-next aria-label="Next reward card">›</button></div><p class="level-card-count" data-level-card-count aria-live="polite"></p><p class="level-carousel-hint">Swipe or use the arrows · L1 / R1 on a controller</p></section></div><footer class="level-receipt-footer"><button class="button gold wide level-continue" data-pad-default>${preview ? "Back to the patch" : "Keep growing"}</button><button class="level-details" data-level-details>All 20 levels</button></footer></article>`;
    overlay.hidden = false;
    overlay.querySelector(".level-continue").onclick = () => finish(session); overlay.querySelector(".level-close").onclick = () => finish(session);
    overlay.querySelector("[data-level-details]").onclick = () => { if (finish(session)) openRewards(); };
    overlay.querySelector("[data-level-home]")?.addEventListener("click", () => { if (finish(session)) openHome?.(); });
    overlay.querySelector("[data-level-village]")?.addEventListener("click", () => { if (finish(session)) openVillage?.(); });
    overlay.querySelector("[data-level-prev]").onclick = () => { if (current()) selectCard(carousel.index - 1); };
    overlay.querySelector("[data-level-next]").onclick = () => { if (current()) selectCard(carousel.index + 1); };
    overlay.querySelectorAll("[data-level-card-tab]").forEach((tab, i) => tab.onclick = () => { if (current()) selectCard(i); });
    const stage = overlay.querySelector("[data-level-card-stage]");
    stage.addEventListener("pointerdown", e => { if (current() && e.pointerType !== "mouse" && e.button === 0) { swipe = { id: e.pointerId, x: e.clientX, y: e.clientY }; stage.setPointerCapture?.(e.pointerId); } });
    stage.addEventListener("pointerup", e => { if (!current() || !swipe || swipe.id !== e.pointerId) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null; if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) selectCard(carousel.index + (dx < 0 ? 1 : -1)); });
    stage.addEventListener("pointercancel", () => { swipe = null; });
    selectCard(0);
    overlay.querySelector(".level-receipt-body").scrollTop = 0;
    overlay.querySelector(".level-continue").focus({ preventScroll: true });
    if (!preview) { audio.levelUp(); particlesTimer = setTimeout(() => overlay.querySelector(".level-confetti")?.remove(), 2800); }
  }
  const onKey = e => {
    if (shown === null) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(); return; }
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); selectCard(e.key === "Home" ? 0 : e.key === "End" ? cards.length - 1 : carousel.index + (e.key === "ArrowRight" ? 1 : -1), true); }
    if (e.key === "Tab") {
      const buttons = [...overlay.querySelectorAll("button")].filter(el => !el.disabled && !el.closest("[hidden]") && el.tabIndex !== -1), first = buttons[0], last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  overlay.addEventListener("keydown", onKey);
  return {
    get active() { return shown !== null; },
    get status() { return { mode: shown === "preview" ? "requirements" : shown === null ? null : "celebration", level: typeof shown === "number" ? shown : patchLevel(state()).next?.level, cardIndex: carousel?.index ?? 0, cardCount: cards.length }; },
    tick(blocked) { if (shown === null && !blocked && state().progression?.pending.length) show(LEVELS[state().progression.pending[0] - 1]); },
    preview() { const lvl = patchLevel(state()); if (shown !== null) return; if (lvl.next) show(lvl.next, true); else openRewards(); },
    rewardRow,
    dispose() { if (shown !== null) release(); clearTimeout(particlesTimer); overlay.removeEventListener("keydown", onKey); },
  };
}
