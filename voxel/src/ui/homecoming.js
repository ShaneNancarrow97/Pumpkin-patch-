// The same keepsake page in both worlds: discovery first, its earned colours
// only after the rules have awarded them. Rendering never claims a reward.
import { SECRET_LOOKS } from "../content/homecoming.js";
import { homecomingInfo } from "../rules/homecoming.js";
import { fidelityIcon } from "./village-fidelity-icon-markup.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hex = colour => Number(colour).toString(16).padStart(6, "0");
const family = { botanist: "The herb garden", "midnight-host": "A table for neighbours", ghostlight: "Lanterns on the midway" };

export function renderHomecoming(state, { village = false } = {}) {
  const bonds = homecomingInfo(state), owned = bonds.filter(bond => bond.owned).length;
  const cards = bonds.map(bond => {
    const completed = bond.steps.filter(step => step.complete).length;
    const colours = bond.owned ? `<div class="homecoming-colours">${SECRET_LOOKS.filter(look => look.bond === bond.id).map(look => `<span><i style="--keepsake-colour:#${hex(look.sweater ?? look.beanie)}" aria-hidden="true"></i>${esc(look.name)}</span>`).join("")}</div>` : "";
    const steps = bond.owned ? "" : `<ul class="homecoming-steps" aria-label="Discovery progress">${bond.steps.map(step => `<li class="${step.complete ? "is-complete" : ""}"><span class="homecoming-step-mark" aria-hidden="true">${step.complete ? "✓" : "◇"}</span><span>${esc(step.label)}<small>${step.world === "village" ? "Village" : "Farm"}</small></span><b>${step.have} / ${step.need}</b><span class="sr">${step.complete ? "Complete" : "Still needed"}</span></li>`).join("")}</ul>`;
    return `<article class="homecoming-card${bond.owned ? " is-earned" : ""}" data-homecoming="${esc(bond.id)}"><header>${fidelityIcon(bond.icon)}<div><small>${bond.owned ? "Keepsake discovered" : "A secret to bring home"}</small><h3>${esc(bond.owned ? bond.name : family[bond.id])}</h3></div><span class="homecoming-count">${bond.owned ? "✓" : `${completed} / ${bond.steps.length}`}<span class="sr">${bond.owned ? " Earned" : " steps completed"}</span></span></header><p>${esc(bond.owned ? bond.benefit : bond.clue)}</p>${colours}${steps}</article>`;
  }).join("");
  return `<details class="homecoming-discoveries" data-vg-details-key="homecoming:discoveries" data-keep-details="homecoming:discoveries"><summary><span>${fidelityIcon("bond")}<b>Farm &amp; village discoveries</b></span><small>${owned} / ${bonds.length}<span class="sr"> keepsakes earned</span></small><i aria-hidden="true">⌄</i></summary><div class="homecoming-body"><p class="homecoming-intro">Bring village discoveries into life on the farm to earn matching colours for Natalie’s knit and Shane’s beanie. These keepsakes cannot be bought.</p>${cards}<p class="homecoming-footnote">${village ? "Your earned colours are in Farm → Outfits." : "Choose an original outfit to wear its earned colours."} Both worlds share the same wardrobe.</p></div></details>`;
}

// Secret shades stay out of the purchase catalogue until earned. The existing
// data-look action equips owned colours; it never buys a hidden keepsake.
export function renderWardrobeColours(state, who, looks = []) {
  const key = who === "natalie" ? "sweater" : "beanie", ownedIds = state?.looks?.owned ?? [];
  if (state?.wardrobe?.equipped?.[who] !== who + "-base") return '<p class="small">Colours for the knit and beanie show with the original outfit.</p>';
  return `<h3 class="section">${who === "natalie" ? "Natalie’s knit" : "Shane’s beanie"}</h3>` + looks.filter(look => !look.secret || ownedIds.includes(look.id)).map(look => {
    const owned = ownedIds.includes(look.id), wearing = state.looks[who] === look.id;
    const disabled = state.paused || wearing || !owned && (!Number.isFinite(look.price) || state.coins < look.price);
    const label = wearing ? "Worn" : owned ? "Wear" : `£${Math.floor(look.price).toLocaleString("en-GB")}`;
    return `<article class="card${look.secret ? " homecoming-look" : ""}"><span class="thumb"><span class="swatch" style="background:#${hex(look[key])}"></span></span><div><h3>${esc(look.name)}</h3><p>${wearing ? "Wearing now" : look.secret ? "Earned together · farm & village" : owned ? "In the wardrobe" : "A new colour for the original outfit"}</p></div><button class="button ${owned || wearing ? "" : "gold"}" data-look="${esc(who)}:${esc(look.id)}"${disabled ? " disabled" : ""}>${label}</button></article>`;
  }).join("");
}
