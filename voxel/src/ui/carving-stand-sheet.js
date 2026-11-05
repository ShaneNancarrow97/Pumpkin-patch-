// The guests' carving stand menu: a hero card with the stand's state, then
// three tabs (bumpers on a pad): the stand's upgrades, the designs guests can
// carve, and the extras they can add. Every design and extra is drawn, glowing,
// so the menu reads at a glance on a phone or across the room on a TV.
import * as M from "../model.js";
import { money, segmented } from "./kit.js";

// A carved pumpkin in SVG, lit from inside, with each design's cut-outs.
const CUTS = {
  classic: '<path d="M36 44l9-12 9 12z M66 44l9-12 9 12z M56 55l4-6 4 6z M34 64q26 22 52 0l-6 4-5-5-5 6-6-6-6 6-5-6-5 5z"/>',
  spooky: '<path d="M33 40q10-8 20 2-10 6-20-2z M67 42q10-10 20-2-10 8-20 2z M58 54l2-4 2 4z M38 70q22-16 44 0q-22 6-44 0z"/>',
  cat: '<path d="M44 74q-6-14 4-22l-2-10 6 6q8-3 16 0l6-6-2 10q10 8 4 22q-16 6-32 0z M76 72q14-2 12-16"/>',
  bat: '<path d="M60 52q-4-6-10-2-6-6-16-2 6 2 6 8 6-2 10 2 4-2 10 0 4-4 10-2 4-4 10-2 0-6 6-8-10-4-16 2-6-4-10 2z M42 70q-3-3-6-1-3-3-8-1 3 1 3 4 3-1 5 1 2-1 6 0z M84 68q3-3 6-1 3-3 8-1-3 1-3 4-3-1-5 1-2-1-6 0z"/>',
  ghost: '<path d="M60 36q-14 0-14 18v24l5-5 5 5 4-5 4 5 5-5 5 5V54q0-18-14-18z" /><circle cx="55" cy="52" r="2.6" fill="#7a3a10"/><circle cx="65" cy="52" r="2.6" fill="#7a3a10"/>',
  castle: '<path d="M36 78V58h6v4h5v-4h6v-8l7-10 7 10v8h6v4h5v-4h6v20z"/><circle cx="82" cy="40" r="5"/>',
};
export function jackArt(design, size = 72) {
  const cut = CUTS[design] ?? CUTS.classic;
  return `<svg class="jack-art" viewBox="0 0 120 110" width="${size}" height="${size}" aria-hidden="true"><defs><radialGradient id="jg-${design}" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="#ffb04a"/><stop offset=".7" stop-color="#e2721f"/><stop offset="1" stop-color="#9a3f12"/></radialGradient><filter id="jf-${design}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="M58 18q-1-8 6-12l3 3q-5 3-4 9z" fill="#5f7a33"/><ellipse cx="60" cy="60" rx="50" ry="40" fill="url(#jg-${design})"/><path d="M60 22q-14 38 0 77M60 22q14 38 0 77M38 26q-22 34-2 70M82 26q22 34 2 70" stroke="#a9481433" stroke-width="3" fill="none"/><g fill="#ffe08a" filter="url(#jf-${design})">${cut}</g></svg>`;
}
const EXTRA_ART = {
  candle: '<path d="M27 16q-4 6 0 10 4-4 0-10z" fill="#ffd36b"/><rect x="22" y="26" width="10" height="20" rx="2" fill="#f3e3c4"/>',
  paint: '<path d="M14 40l14-22 8 5-14 22z" fill="#7a5a3a"/><path d="M28 18l8 5 4-7-8-5z" fill="#b8ffcf"/><circle cx="16" cy="44" r="4" fill="#b8ffcf"/>',
  hat: '<path d="M10 42h34l-8-4-9-24-7 24z" fill="#3a2a4a"/><rect x="18" y="35" width="18" height="4" fill="#b884ff"/>',
  stand: '<path d="M14 46h26M18 46l6-18M36 46l-6-18M20 28h14" stroke="#8a8a9a" stroke-width="3" fill="none"/><circle cx="27" cy="22" r="7" fill="#e2721f"/>',
};
// The upgrades' own pictures: a bench, a carving saw, a fair sign.
const UPGRADE_ART = {
  benches: '<svg viewBox="0 0 48 48" width="34" height="34"><rect x="8" y="20" width="32" height="6" rx="2" fill="#c98a45"/><path d="M12 26v14M36 26v14M18 26v10M30 26v10" stroke="#7a4a24" stroke-width="3"/><circle cx="24" cy="14" r="6" fill="#e2721f"/><path d="M22 13h4" stroke="#ffe08a" stroke-width="2"/></svg>',
  tools: '<svg viewBox="0 0 48 48" width="34" height="34"><path d="M10 38l18-18 4 4-18 18z" fill="#cfd3dc"/><path d="M28 20l8-8 4 4-8 8z" fill="#7a4a24"/><path d="M12 36l2-2M15 33l2-2M18 30l2-2M21 27l2-2" stroke="#8a8f9a" stroke-width="1.5"/></svg>',
  sign: '<svg viewBox="0 0 48 48" width="34" height="34"><path d="M14 44V18M34 44V18" stroke="#5a3a24" stroke-width="3"/><rect x="8" y="10" width="32" height="16" rx="3" fill="#3a2618" stroke="#c98a45" stroke-width="2"/><path d="M15 18h18" stroke="#ffd36b" stroke-width="2.5"/><circle cx="24" cy="6" r="3" fill="#ffd36b"/></svg>',
};
const extraArt = (id) => `<svg class="extra-art" viewBox="0 0 54 54" width="46" height="46" aria-hidden="true">${EXTRA_ART[id] ?? ""}</svg>`;

export function carvingStandSheet(ui) {
  let tab = "stand";
  const level = (s) => M.patchLevel(s).level;
  const buy = (attr, id, price, s, opensAt, label = money(price)) => level(s) < opensAt ? `<span class="seed-gate">Level ${opensAt}</span>` : `<button class="button purchase-button${s.coins >= price ? " can-act" : ""}" data-${attr}="${id}" ${s.coins < price || s.paused ? "disabled" : ""}>${label}</button>`;

  function hero(s) {
    const c = s.carvingStand, benches = M.standValue(s, "benches");
    if (!c.built) {
      const ready = level(s) >= M.CARVING_STAND.level;
      return `<article class="stand-hero"><div class="stand-hero-art">${jackArt("classic", 96)}</div><div><p class="seed-kicker">A new business</p><h3>The Carving Stand</h3><p>A covered stall by the big pumpkin where guests pay to carve a lantern of their own, from your designs, with extras if they fancy them.</p></div>${ready ? `<button class="button purchase-button gold${s.coins >= M.CARVING_STAND.cost ? " can-act" : ""}" data-stand-build ${s.coins < M.CARVING_STAND.cost ? "disabled" : ""} data-pad-default>Build · ${money(M.CARVING_STAND.cost)}</button>` : `<span class="seed-gate">Level ${M.CARVING_STAND.level}</span>`}</article>`;
    }
    const now = c.carvers.map((k) => `<span class="stand-bench busy" title="${M.STAND_DESIGN_BY_ID[k.design].name}">${jackArt(k.design, 30)}<i style="--p:${Math.round((1 - k.left / k.length) * 5) / 5}"></i></span>`).join("") + Array.from({ length: Math.max(0, benches - c.carvers.length) }, () => `<span class="stand-bench"></span>`).join("");
    return `<article class="stand-hero built"><div class="stand-hero-art">${jackArt(c.last?.design ?? "classic", 96)}</div><div><p class="seed-kicker">${c.open ? "Open · guests stop as they pass" : "Closed for now"}</p><h3>The Carving Stand</h3><div class="stand-benches" aria-label="${c.carvers.length} of ${benches} benches carving">${now}</div><p class="stand-stats"><b>${c.carved}</b> carved · <b>${money(c.income)}</b> taken${c.last ? ` · last: ${M.STAND_DESIGN_BY_ID[c.last.design].name} for ${money(c.last.fee)}` : ""}</p></div><button class="button" data-stand-open>${c.open ? "Close stand" : "Open stand"}</button></article>`;
  }
  function upgrades(s) {
    return M.CARVING_STAND.upgrades.map((u) => {
      const at = s.carvingStand[u.id], next = M.standUpgrade(s, u.id), now = u.id === "benches" ? `${u.values[at]} bench${u.values[at] > 1 ? "es" : ""}` : u.id === "tools" ? `${u.values[at]}s a carving` : `×${u.values[at]} fees`;
      const then = next && (u.id === "benches" ? `${next.value} benches` : u.id === "tools" ? `${next.value}s` : `×${next.value}`);
      return `<article class="card stand-upgrade"><span class="thumb stand-icon" aria-hidden="true">${UPGRADE_ART[u.id]}</span><div><h3>${u.name}</h3><p>${u.text}</p><p class="effect">Now ${now}${then ? ` → ${then}` : ""}</p><div class="tiers">${u.values.map((_, i) => `<i class="${i <= at ? "on" : ""}"></i>`).join("")}</div></div>${next ? buy("stand-up", u.id, next.cost, s, next.opensAt) : `<span class="seed-gate done">Every tier</span>`}</article>`;
    }).join("");
  }
  function designs(s) {
    const c = s.carvingStand;
    return `<p class="small">Guests choose from what's on your menu, the fancier the better. Each pays the design's price${M.standValue(s, "sign") > 1 ? `, ×${M.standValue(s, "sign")} with the fair sign` : ""}.</p><div class="stand-grid">${M.CARVING_STAND.designs.map((d) => {
      const owned = c.designs.includes(d.id);
      return `<article class="stand-tile${owned ? " owned" : ""}">${jackArt(d.id, 84)}<b>${d.name}</b><small>${money(Math.round(d.price * M.standValue(s, "sign")))} a carving</small>${owned ? `<span class="stand-on">On the menu</span>` : buy("stand-design", d.id, d.cost, s, d.level)}</article>`;
    }).join("")}</div>`;
  }
  function extras(s) {
    const c = s.carvingStand;
    return `<p class="small">Once stocked, guests add these to their lantern now and then, and pay for each.</p><div class="stand-grid">${M.CARVING_STAND.extras.map((e) => {
      const owned = c.extras.includes(e.id);
      return `<article class="stand-tile${owned ? " owned" : ""}">${extraArt(e.id)}<b>${e.name}</b><small>+${money(e.price)} · ${Math.round(e.chance * 100)}% of guests</small>${owned ? `<span class="stand-on">Stocked</span>` : buy("stand-extra", e.id, e.cost, s, e.level)}</article>`;
    }).join("")}</div>`;
  }

  return {
    carvingStand: {
      eyebrow: "Your businesses", title: "The Carving Stand",
      setTab(t) { tab = ["stand", "designs", "extras"].includes(t) ? t : "stand"; },
      body() {
        const s = ui.state;
        if (!s.carvingStand.built) return `<div class="stand-sheet">${hero(s)}<h3 class="section">What you'll be able to offer</h3><div class="stand-grid">${M.CARVING_STAND.designs.map((d) => `<article class="stand-tile">${jackArt(d.id, 72)}<b>${d.name}</b><small>${money(d.price)} a carving</small></article>`).join("")}</div></div>`;
        const tabs = segmented("standtab", "Carving stand sections", [["stand", "Stand"], ["designs", "Designs"], ["extras", "Extras"]], tab);
        return `<div class="stand-sheet">${hero(s)}${tabs}${({ stand: upgrades, designs, extras })[tab](s)}</div>`;
      },
      bind(body) {
        const s = ui.state, done = (text) => { ui.tone(820); if (text) ui.notice(text); ui.save(); ui.draw(); };
        body.querySelectorAll("[data-standtab]").forEach((b) => (b.onclick = () => { tab = b.dataset.standtab; ui.draw(); }));
        body.querySelector("[data-stand-build]")?.addEventListener("click", () => { if (M.buildCarvingStand(s)) done("The Carving Stand is open by the big pumpkin."); });
        body.querySelector("[data-stand-open]")?.addEventListener("click", () => { M.setStandOpen(s, !s.carvingStand.open); done(); });
        body.querySelectorAll("[data-stand-up]").forEach((b) => (b.onclick = () => { if (M.buyStandUpgrade(s, b.dataset.standUp)) done(`${M.STAND_UPGRADE_BY_ID[b.dataset.standUp].name} improved.`); }));
        body.querySelectorAll("[data-stand-design]").forEach((b) => (b.onclick = () => { if (M.buyStandDesign(s, b.dataset.standDesign)) done(`${M.STAND_DESIGN_BY_ID[b.dataset.standDesign].name} is on the menu.`); }));
        body.querySelectorAll("[data-stand-extra]").forEach((b) => (b.onclick = () => { if (M.buyStandExtra(s, b.dataset.standExtra)) done(`${M.STAND_EXTRA_BY_ID[b.dataset.standExtra].name} stocked.`); }));
      },
    },
  };
}
