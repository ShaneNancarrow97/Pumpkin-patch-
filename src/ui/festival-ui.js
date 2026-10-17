import { escapeHtml } from "./html.js";
import { favourProgress, midnightFavours } from "../core/festival-model.mjs";
import { visitorArtMeta } from "../content/animation-meta.mjs";

function initFestivalUi(app2) {
  const { claimFavour: claimFavour2 } = app2.actions;
  const { $, gameAsset, showModal, save, renderUI, toast, tone } = app2;
  function favourArt(type) {
    const meta = visitorArtMeta[type], [x, y, w, h] = meta.rects[0];
    return 'background-image:url("' + gameAsset("assets/house/visitor-" + type + ".webp") + '");background-size:' + meta.width / w * 100 + "% " + meta.imageHeight / h * 100 + "%;background-position:" + x / (meta.width - w) * 100 + "% " + y / (meta.imageHeight - h) * 100 + "%;--guest-ar:" + w / h + ";";
  }
  function openFavours() {
    showModal('<section class="favour-menu"><div class="modal-subtitle">THE NEIGHBOURHOOD AFTER DARK</div><h2>Midnight favours.</h2><p>A little harvest, a little kindness. Our spooky neighbours have coins to spare.</p><div class="favour-summary"><strong id="favour-total"></strong><span id="favour-best"></span></div><div class="favour-grid">' + midnightFavours.map((f) => '<article class="favour-card" data-favour="' + f.id + '"><div class="favour-heading"><span class="favour-guest" aria-hidden="true" style="' + escapeHtml(favourArt(f.type)) + '"></span><div><small>' + f.guest + "</small><h3>" + f.title + "</h3></div></div><p>" + f.description + '</p><div class="favour-progress"><i id="favour-bar-' + f.id + '"></i></div><span class="favour-count" id="favour-count-' + f.id + '"></span><button class="primary" data-claim-favour="' + f.id + '">Claim · £' + f.reward + "</button></article>").join("") + '</div><p class="favour-note">Harvest streaks: pick 6 plots within 5 seconds for £5, available once per minute. Harvest all counts too. Helping hands keeps growing while you decorate; automatic harvests do not earn streak bonuses.</p></section>');
    for (const button of $("modal-content").querySelectorAll("[data-claim-favour]"))
      button.onclick = () => {
        const reward = claimFavour2(app2.state, button.dataset.claimFavour);
        if (reward) {
          save();
          renderUI();
          toast("A favour fulfilled. +£" + reward + " for our little empire.");
          tone(880);
        }
      };
    refreshFestivals();
  }
  function refreshFestivals() {
    const unclaimed = midnightFavours.filter((f) => !app2.state.festival.claimed.includes(f.id));
    const ready = unclaimed.filter((f) => favourProgress(app2.state, f) >= f.target), next = ready[0] || unclaimed[0];
    $("goal").textContent = ready.length ? ready.length + " favour" + (ready.length === 1 ? "" : "s") + " ready · collect coins" : next ? next.title + " · " + Math.floor(favourProgress(app2.state, next)) + "/" + next.target + " · £" + next.reward : "Every favour fulfilled. Happy haunting!";
    $("favours-nav").classList.toggle("reward-ready", ready.length > 0);
    $("scrapbook-nav").querySelector(".new-dot").hidden = ready.length === 0;
    $("scrapbook-nav").setAttribute("aria-label", "Journal" + (ready.length ? ", " + ready.length + " rewards ready" : ""));
    $("favours-nav").setAttribute("aria-label", "Open Midnight favours. " + $("goal").textContent);
    const streak = app2.state.festival.comboCount > 1 && app2.state.elapsed <= app2.state.festival.comboUntil;
    $("streak-pill").hidden = !streak;
    $("streak-pill").textContent = "Harvest streak ×" + app2.state.festival.comboCount;
    if (!$("modal").open || !$("modal-content").querySelector(".favour-menu"))
      return;
    $("favour-total").textContent = app2.state.festival.claimed.length + " / " + midnightFavours.length + " favours fulfilled";
    $("favour-best").textContent = "Best harvest streak: " + app2.state.festival.bestStreak;
    for (const f of midnightFavours) {
      const progress = favourProgress(app2.state, f), claimed = app2.state.festival.claimed.includes(f.id), button = $("modal-content").querySelector('[data-claim-favour="' + f.id + '"]');
      $("favour-bar-" + f.id).style.width = progress / f.target * 100 + "%";
      $("favour-count-" + f.id).textContent = claimed ? "A kindness remembered" : Math.floor(progress) + " / " + f.target;
      button.disabled = app2.state.paused || claimed || progress < f.target;
      button.textContent = claimed ? "✓ Fulfilled" : progress >= f.target ? "Claim · £" + f.reward : "Reward · £" + f.reward;
      button.setAttribute("aria-label", claimed ? f.title + " fulfilled" : "Claim " + f.title + " reward, £" + f.reward);
      button.classList.toggle("claim-ready", !claimed && progress >= f.target);
    }
  }
  $("favours-nav").onclick = openFavours;
  return { refresh: refreshFestivals, open: openFavours };
}

export { initFestivalUi };
