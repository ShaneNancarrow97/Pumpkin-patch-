// The guests' carving stand menu. A hero photographed from the stand's own
// voxel model (ui/stand-art.js) with its takings; the benches live, each guest
// with the lantern they're carving at its stage; then three tabs (bumpers on
// a pad): a chalkboard menu of designs, the extras shelf, and the upgrades.
// Every picture is the same voxel lantern or model the farm shows, so what
// you buy here is what appears beside the Hollow House.
import * as M from "../model.js";
import { money, segmented } from "./kit.js";
import { visitorIdentity } from "../content/visitors.js";
import { standArt } from "./stand-art.js";

// Drawn lanterns, for a device without WebGL to photograph the models with.
const CUTS = {
  classic: '<path d="M36 44l9-12 9 12z M66 44l9-12 9 12z M56 55l4-6 4 6z M34 64q26 22 52 0l-6 4-5-5-5 6-6-6-6 6-5-6-5 5z"/>',
  spooky: '<path d="M33 40q10-8 20 2-10 6-20-2z M67 42q10-10 20-2-10 8-20 2z M58 54l2-4 2 4z M38 70q22-16 44 0q-22 6-44 0z"/>',
  cat: '<path d="M44 74q-6-14 4-22l-2-10 6 6q8-3 16 0l6-6-2 10q10 8 4 22q-16 6-32 0z M76 72q14-2 12-16"/>',
  bat: '<path d="M60 52q-4-6-10-2-6-6-16-2 6 2 6 8 6-2 10 2 4-2 10 0 4-4 10-2 4-4 10-2 0-6 6-8-10-4-16 2-6-4-10 2z"/>',
  ghost: '<path d="M60 36q-14 0-14 18v24l5-5 5 5 4-5 4 5 5-5 5 5V54q0-18-14-18z"/>',
  castle: '<path d="M36 78V58h6v4h5v-4h6v-8l7-10 7 10v8h6v4h5v-4h6v20z"/><circle cx="82" cy="40" r="5"/>',
};
export function jackArt(design, size = 96) {
  return `<svg class="jack-art" viewBox="0 0 120 110" width="${size}" height="${size}" aria-hidden="true"><path d="M58 18q-1-8 6-12l3 3q-5 3-4 9z" fill="#5f7a33"/><ellipse cx="60" cy="60" rx="50" ry="40" fill="#e2721f"/><path d="M60 22q-14 38 0 77M60 22q14 38 0 77" stroke="#a94814" stroke-width="3" fill="none"/><g fill="#ffe08a">${CUTS[design] ?? CUTS.classic}</g></svg>`;
}
const pct = (x) => Math.round(x * 100);
const VALUE = { benches: (v) => `${v} bench${v > 1 ? "es" : ""}`, tools: (v) => `${v}s a lantern`, sign: (v) => `×${v} fees` };

export function carvingStandSheet(ui) {
  let tab = "designs";
  const level = (s) => M.patchLevel(s).level;
  const lantern = (id, lit = true) => { const url = standArt.design(id, lit); return url ? `<img class="stand-render" src="${url}" alt="" draggable="false">` : jackArt(id); };
  const render = (url, fallback = "") => (url ? `<img class="stand-render" src="${url}" alt="" draggable="false">` : fallback);
  // A price to pay, or the level it opens at.
  const price = (attr, id, cost, s, opensAt, label = money(cost)) => level(s) < opensAt
    ? `<span class="stand-lock"><i aria-hidden="true"></i>Level ${opensAt}</span>`
    : `<button class="button purchase-button${s.coins >= cost && !s.paused ? " can-act" : ""}" data-${attr}="${id}" ${s.coins < cost || s.paused ? "disabled" : ""}>${label}</button>`;
  // The chalkboard in the hero's photo, as the farm's own board lists it.
  const chalk = (designs, extras, sign) => [...designs.map((id) => [M.STAND_DESIGN_BY_ID[id].name, `£${Math.round(M.STAND_DESIGN_BY_ID[id].price * sign)}`]), ...extras.map((id) => [`+ ${M.STAND_EXTRA_BY_ID[id].name.toLowerCase()}`, `£${M.STAND_EXTRA_BY_ID[id].price}`, "#c8f0d8"])];

  function hero(s) {
    const c = s.carvingStand, built = c.built, benches = built ? M.standValue(s, "benches") : 2, designs = built ? c.designs : ["classic", "spooky", "cat"], extras = built ? c.extras : ["candle"];
    const photo = standArt.hero({ benches, designs, extras, lines: chalk(designs, extras, built ? M.standValue(s, "sign") : 1) });
    const pic = photo ? `<img class="stand-hero-art" src="${photo}" alt="The Carving Stand">` : `<div class="stand-hero-art drawn">${jackArt("classic", 120)}</div>`;
    if (!built) {
      const ready = level(s) >= M.CARVING_STAND.level, can = ready && s.coins >= M.CARVING_STAND.cost && !s.paused;
      return `<section class="stand-hero">${pic}<div class="stand-hero-copy"><p class="stand-kicker">A new business · beside the Hollow House</p><h3>The Carving Stand</h3><p>Guests passing the Hollow House stop to carve a lantern of their own from your designs, and pay for it, with extras if they fancy them.</p></div><div class="stand-hero-act">${ready ? `<button class="button purchase-button gold${can ? " can-act" : ""}" data-stand-build ${can ? "" : "disabled"} data-pad-default>Build the stand · ${money(M.CARVING_STAND.cost)}</button>` : `<span class="stand-lock"><i aria-hidden="true"></i>Opens at level ${M.CARVING_STAND.level}</span>`}</div></section>`;
    }
    const fav = Object.entries(c.tally).sort((a, b) => b[1] - a[1])[0];
    const chips = [[c.carved.toLocaleString("en-GB"), c.carved === 1 ? "lantern carved" : "lanterns carved"], [money(c.income), "taken"], [money(M.averageCarvingFee(s)), "a guest"], ...(fav ? [[M.STAND_DESIGN_BY_ID[fav[0]].name, "the favourite"]] : [])];
    return `<section class="stand-hero">${pic}<div class="stand-hero-copy"><p class="stand-kicker"><i class="stand-dot${c.open ? " on" : ""}" aria-hidden="true"></i>${c.open ? "Open" : "Closed"} · beside the Hollow House</p><h3>The Carving Stand</h3><div class="stand-chips">${chips.map(([b, t]) => `<span><b>${b}</b> ${t}</span>`).join("")}</div></div><div class="stand-hero-act"><button class="button" data-stand-visit>Visit the stand</button><button class="button${c.open ? "" : " gold can-act"}" data-stand-open>${c.open ? "Close for now" : "Open the stand"}</button></div></section>`;
  }

  // Who's carving at each bench, and how far they've got.
  function floor(s) {
    const c = s.carvingStand, benches = M.standValue(s, "benches"), next = M.standUpgrade(s, "benches");
    const seats = Array.from({ length: benches }, (_, i) => {
      const k = c.carvers.find((x) => x.bench === i);
      if (!k) return `<div class="stand-seat"><span class="seat-empty" aria-hidden="true"></span><small>Bench ${i + 1} · waiting for a guest</small></div>`;
      const who = visitorIdentity(k.kind ?? 0), face = ui.portrait("visitor-" + who.id), stage = M.carvingStage(k), p = Math.round(M.carverProgress(k) * 10) / 10, art = standArt.stage(k.design, stage.id);
      return `<div class="stand-seat busy"><span class="seat-face">${face ? `<img src="${face}" alt="">` : ""}</span>${art ? `<img class="seat-lantern" src="${art}" alt="">` : "<span></span>"}<div class="seat-copy"><b><span>${who.name}</span><em>${money(k.fee)}</em></b><small>${M.STAND_DESIGN_BY_ID[k.design].name}</small><i class="seat-bar" style="--p:${p}" aria-hidden="true"></i><small class="seat-stage">${stage.name}</small></div></div>`;
    }).join("");
    const add = next ? `<button class="stand-seat add" data-stand-more><span aria-hidden="true">+</span><small>Another bench · ${level(s) >= next.opensAt ? money(next.cost) : `level ${next.opensAt}`}</small></button>` : "";
    const rate = M.carversPerMinute(s, M.visitorsPerMinute(s));
    return `<section class="stand-floor"><header><h4>At the benches</h4><small>${c.carvers.length} of ${benches} carving · ${c.open ? `about ${rate.toFixed(1)} guests a minute stop` : "closed, so no one stops"}</small></header><div class="stand-seats">${seats}${add}</div></section>`;
  }

  // Tonight's menu: every design, its price and how keen guests are on it.
  function designs(s) {
    const c = s.carvingStand, shares = M.designShares(s), sign = M.standValue(s, "sign");
    return `<section class="stand-board"><header><b>Tonight’s menu</b><small>${c.designs.length} of ${M.CARVING_STAND.designs.length} designs · each draws its share of guests, and the dearer ones pay more</small></header><div class="stand-menu">${M.CARVING_STAND.designs.map((d) => {
      const on = c.designs.includes(d.id), locked = level(s) < d.level;
      const foot = on ? `<div class="menu-meta"><i style="--p:${shares[d.id].toFixed(2)}" aria-hidden="true"></i><small>${pct(shares[d.id])}% of guests · ${c.tally[d.id] ?? 0} carved</small></div><span class="stand-on">On the menu</span>` : `<p class="menu-note">${locked ? "Opens later" : "Teach the stand this design"}</p>${price("stand-design", d.id, d.cost, s, d.level, `Add · ${money(d.cost)}`)}`;
      return `<article class="menu-tile${on ? " on" : ""}${locked ? " locked" : ""}"><div class="menu-art">${lantern(d.id, !locked)}</div><b>${d.name}</b><span class="menu-price">${money(Math.round(d.price * sign))}<small> a lantern</small></span>${foot}</article>`;
    }).join("")}</div></section>`;
  }
  // The extras shelf: stocked once, added by some guests, each paid for.
  function extras(s) {
    const c = s.carvingStand;
    return `<section class="stand-shelf"><header><b>The extras shelf</b><small>Stock one once, and guests add it now and then and pay for each</small></header><div class="stand-menu">${M.CARVING_STAND.extras.map((e) => {
      const on = c.extras.includes(e.id), locked = level(s) < e.level;
      return `<article class="menu-tile${on ? " on" : ""}${locked ? " locked" : ""}"><div class="menu-art">${render(standArt.extra(e.id), jackArt("classic"))}</div><b>${e.name}</b><span class="menu-price">+${money(e.price)}<small> each</small></span><p class="menu-note">About ${pct(e.chance)}% of guests add one</p>${on ? `<span class="stand-on">Stocked</span>` : price("stand-extra", e.id, e.cost, s, e.level, `Stock · ${money(e.cost)}`)}</article>`;
    }).join("")}</div></section>`;
  }
  function upgrades(s) {
    return `<section class="stand-ups">${M.CARVING_STAND.upgrades.map((u) => {
      const at = s.carvingStand[u.id], next = M.standUpgrade(s, u.id);
      return `<article class="stand-up"><div class="up-art">${render(standArt.upgrade(u.id))}</div><div class="up-copy"><h3>${u.name}</h3><p>${u.text}</p><div class="up-values"><span>${VALUE[u.id](u.values[at])}</span>${next ? `<i aria-hidden="true">→</i><span class="next">${VALUE[u.id](next.value)}</span>` : ""}</div><div class="up-pips" aria-label="Tier ${at + 1} of ${u.values.length}">${u.values.map((_, i) => `<i class="${i <= at ? "on" : ""}"></i>`).join("")}</div></div>${next ? price("stand-up", u.id, next.cost, s, next.opensAt) : `<span class="stand-on">Every tier</span>`}</article>`;
    }).join("")}</section>`;
  }
  // Before it's built: what guests could carve, and how the stand works.
  function preview() {
    return `<section class="stand-board"><header><b>What your guests could carve</b><small>The Classic grin from the start; more designs as the farm grows</small></header><div class="stand-menu">${M.CARVING_STAND.designs.map((d) => `<article class="menu-tile${d.cost ? "" : " on"}"><div class="menu-art">${lantern(d.id)}</div><b>${d.name}</b><span class="menu-price">${money(d.price)}<small> a lantern</small></span><p class="menu-note">${d.cost ? `From level ${d.level}` : "Ready on the first night"}</p></article>`).join("")}</div></section>
      <ol class="stand-steps"><li><b>Guests stop</b><small>on their way past the Hollow House</small></li><li><b>They carve</b><small>a design from your menu, at one of your benches</small></li><li><b>They pay</b><small>for the design and any extras, and take it home</small></li></ol>`;
  }

  return {
    carvingStand: {
      eyebrow: "Your businesses", title: "The Carving Stand",
      setTab(t) { tab = ["designs", "extras", "stand"].includes(t) ? t : "designs"; },
      body() {
        const s = ui.state;
        if (!s.carvingStand.built) return `<div class="stand-sheet">${hero(s)}${preview()}</div>`;
        const tabs = segmented("standtab", "Carving stand sections", [["designs", "Designs"], ["extras", "Extras"], ["stand", "Upgrades"]], tab);
        return `<div class="stand-sheet">${hero(s)}${floor(s)}${tabs}${({ designs, extras, stand: upgrades })[tab](s)}</div>`;
      },
      bind(body) {
        const s = ui.state, done = (text) => { ui.tone(820); if (text) ui.notice(text); ui.save(); ui.draw(); };
        body.querySelectorAll("[data-standtab]").forEach((b) => (b.onclick = () => { tab = b.dataset.standtab; ui.draw(); }));
        body.querySelector("[data-stand-more]")?.addEventListener("click", () => { tab = "stand"; ui.draw(); });
        body.querySelector("[data-stand-build]")?.addEventListener("click", () => { if (M.buildCarvingStand(s)) done("The Carving Stand is open beside the Hollow House."); });
        body.querySelector("[data-stand-open]")?.addEventListener("click", () => { M.setStandOpen(s, !s.carvingStand.open); done(); });
        body.querySelector("[data-stand-visit]")?.addEventListener("click", () => { ui.closeSheet(); if (ui.scene.place) ui.leavePlace?.(); ui.scene.focusCarvingStand?.(); });
        body.querySelectorAll("[data-stand-up]").forEach((b) => (b.onclick = () => { if (M.buyStandUpgrade(s, b.dataset.standUp)) done(`${M.STAND_UPGRADE_BY_ID[b.dataset.standUp].name} improved.`); }));
        body.querySelectorAll("[data-stand-design]").forEach((b) => (b.onclick = () => { if (M.buyStandDesign(s, b.dataset.standDesign)) done(`${M.STAND_DESIGN_BY_ID[b.dataset.standDesign].name} is on the menu.`); }));
        body.querySelectorAll("[data-stand-extra]").forEach((b) => (b.onclick = () => { if (M.buyStandExtra(s, b.dataset.standExtra)) done(`${M.STAND_EXTRA_BY_ID[b.dataset.standExtra].name} stocked.`); }));
      },
    },
  };
}
