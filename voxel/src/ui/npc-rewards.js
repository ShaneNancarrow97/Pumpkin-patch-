// A single small favour card. Expiring the presentation never expires the reward.
import { claimable, claimFavour } from "../rules/progress.js";
const money = n => "£" + Math.floor(n).toLocaleString("en-GB");
export function createNpcRewards({ state, portrait, save, tone, notice, now = () => performance.now() }) {
  const host = document.createElement("aside"); host.className = "npc-reward"; host.hidden = true;
  host.setAttribute("aria-label", "Neighbour reward"); host.setAttribute("aria-live", "polite"); document.body.append(host);
  const seen = new Set(); let current = null, remaining = 12000, last = now(), fadeAt = null;
  function hide() {
    if (host.contains(document.activeElement)) document.getElementById("goal")?.focus({ preventScroll: true });
    host.hidden = true; host.classList.remove("fading"); current = null; fadeAt = null;
  }
  function show(f) {
    current = f; seen.add(f.id); remaining = 12000; fadeAt = null;
    const image = portrait(f.kind, f.id);
    host.innerHTML = `<div class="npc-reward-copy">${image ? `<span class="npc-reward-portrait" aria-hidden="true"><img src="${image}" alt=""></span>` : `<span class="npc-reward-symbol" aria-hidden="true">✦</span>`}<span><small>${f.guest}</small><b>${f.title}</b></span></div><button class="button gold" data-collect-favour="${f.id}">Collect ${money(f.reward)}</button><button class="npc-reward-close" aria-label="Dismiss reward until later">×</button><i class="npc-reward-time" aria-hidden="true"></i>`;
    host.style.setProperty("--remaining", "100%"); host.hidden = false;
    host.querySelector("[data-collect-favour]").onclick = () => {
      const amount = claimFavour(state(), f.id);
      if (amount) { save(); tone(880); notice(`${f.guest}: thank you! +${money(amount)}`); }
      hide();
    };
    host.querySelector(".npc-reward-close").onclick = hide;
  }
  return { tick(blocked) {
    const at = now(), dt = Math.max(0, Math.min(1000, at - last)); last = at;
    host.classList.toggle("suspended", blocked);
    if (current && !claimable(state()).some(f => f.id === current.id)) hide();
    if (blocked) return;
    if (!current) { const f = claimable(state()).find(f => !seen.has(f.id)); if (f) show(f); return; }
    // Give keyboard users and readers time while the card has their attention.
    if (host.matches(":hover") || host.contains(document.activeElement)) return;
    if (fadeAt !== null) { if (at - fadeAt >= 400) hide(); return; }
    remaining -= dt; host.style.setProperty("--remaining", `${Math.max(0, remaining / 120)}%`);
    if (remaining <= 0) { host.classList.add("fading"); fadeAt = at; }
  } };
}
