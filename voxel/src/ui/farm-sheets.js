// The Shop menu: farm upgrades, seeds per plot, Skyla's indoor shop, the stall
// and the visitors.
import * as M from "../model.js";
import { customerCareUpgrades, customerCareSummary, bindCustomerCareUpgrades } from "./customer-care-sheet.js";
import { festivalMeadowSheet } from "./festival-meadow-sheet.js";
import { money, segmented, plural } from "./kit.js";

// Each upgrade's own icon from the main game.
const ICONS = { storage: "stock", crowd: "visitors", tools: "tools", yield: "yield", auto: "auto", plots: "plots", sign: "sign", open: "shop", capacity: "visitors", displays: "stock", checkout: "coins", party: "visitors", lights: "boost", cocoa: "talk", loyalty: "coins" };
const icon = (id) => `<span class="thumb"><span class="ico i-${ICONS[id]}"></span></span>`;
const SHOP_LEVELS = { capacity: "capacityLevel", displays: "displayLevel", checkout: "checkoutLevel" };
const SHOP_MAX = { capacity: 3, displays: 1, checkout: 2 };

// The visitor upgrades, Spread the word first. Each says what it does now and at the next level.
const VISITOR_IDS = ["sign", ...M.VISITOR_UPGRADES.map((u) => u.id)];
const secs = (n) => `${Math.round(n * 10) / 10}s`;
// The frequency upgrades give the wait now and what the next tier makes it.
const FREQUENCY = {
  sign: (s) => [["Parties every", M.stallArrivalSeconds(s)], ["shoppers every", M.shopArrivalSeconds(s)]],
  lights: (s) => [["Parties every", M.stallArrivalSeconds(s)]],
};
const EFFECTS = {
  crowd: s => `up to ${M.visitorCapacity(s)} outdoor neighbours`,
  appetite: (s) => `baskets of up to ${M.basketWant(s)} pumpkins`,
  party: (s) => (M.partyMax(s) > 1 ? `parties of up to ${M.partyMax(s)}` : "everyone comes on their own"),
  cocoa: (s) => `they wait ${secs(M.stallPatience(s))} for stock${s.festival.cocoa.level ? `, cocoa service ${secs(M.cocoaServiceSeconds(s))}` : ""}`,
  loyalty: (s) => ["no regulars yet", "one in four is a regular", "one in two is a regular"][M.visitorUpgradeLevel(s, "loyalty")],
};
// The market cart now and at its next tier, in plain numbers.
const cartLine = (s) => {
  const now = M.cartTier(s), next = M.CART[(s.upgrades.cart || 0) + 1], say = (c) => `${c.perMinute} a minute at ${Math.round(c.share * 100)}% of the price`;
  return `${now.share ? `Now: ${say(now)}.` : "Now: no cart; a full barn leaves ripe crops on the patch."}${next ? ` Next: ${say(next)}.` : ""}`;
};
// The same farm one level on, to describe what buying it would do.
function nextLevel(s, id) {
  const t = { ...s, upgrades: { ...s.upgrades }, visitorUpgrades: { ...s.visitorUpgrades } };
  (id === "sign" ? t.upgrades : t.visitorUpgrades)[id]++;
  return t;
}
function effectLine(s, id, done) {
  const next = !done && nextLevel(s, id);
  if (FREQUENCY[id]) return FREQUENCY[id](s).map(([what, now], i) => `${what} ${secs(now)}${next ? `, next ${secs(FREQUENCY[id](next)[i][1])}` : ""}`).join("; ") + ".";
  return `Now: ${EFFECTS[id](s)}.${next ? ` Next: ${EFFECTS[id](next)}.` : ""}`;
}
// Tiers as pips and a count, so eight of them stay tidy on a phone.
const tiers = (level, most) => `<div class="tiers" role="img" aria-label="Tier ${level} of ${most}"><div class="pips">${Array.from({ length: most }, (_, i) => `<i class="${i < level ? "on" : ""}"></i>`).join("")}</div>${most > 1 ? `<span>${level} of ${most}</span>` : ""}</div>`;
// What Shane and Natalie say when a bigger visitor upgrade arrives, by level.
const VISITOR_TALK = {
  party: { 2: ["shane", "They’re bringing their friends now. Word travels fast when the pumpkins are good."], 3: ["natalie", "Whole families coming up the path. Skyla’s going to need a longer counter."] },
  lights: { 1: ["natalie", "Fairy lights all the way down the path. I told you it would look magical."], 3: ["shane", "You can see our path from the castle now. The bats have started complaining."], 8: ["natalie", "Every lantern in the village is on our path now. The bats have filed a formal complaint."] },
  cocoa: { 1: ["shane", "A little warmth and a little patience. Sandy says that’s the secret to happy customers."], 3: ["natalie", "Marshmallows, cinnamon and a pinch of moonlight. Nobody’s in a hurry to leave."] },
  loyalty: { 1: ["shane", "My loyalty card, at last. Buy nine pumpkins, receive a slightly larger pumpkin. Genius."], 2: ["natalie", "Half the village has a loyalty card now. The other half is thinking about it."] },
};

function priceButton(attr, value, price, coins, owned) {
  if (owned) return `<button class="button" disabled>${owned}</button>`;
  return `<button class="button gold" data-${attr}="${value}" ${coins < price ? "disabled" : ""}>${money(price)}${coins < price ? `<small>need ${money(price - coins)}</small>` : ""}</button>`;
}

// A receipt's basket, one entry per variety: "3 Orange (2 fresh) + 1 Moonlight".
function basketText(lines) {
  const by = new Map();
  for (const l of lines) { const b = by.get(l.variety) ?? { n: 0, fresh: 0 }; b.n += l.quantity; if (l.fresh) b.fresh += l.quantity; by.set(l.variety, b); }
  return [...by].map(([v, b]) => `${b.n} ${M.VARIETIES[v].name}${b.fresh ? ` (${b.fresh === b.n ? "fresh" : `${b.fresh} fresh`})` : ""}`).join(" + ");
}

// Skyla's advice, for whatever would help most right now.
function skylaTip(s) {
  if (M.barnBlocked(s)) return `The barn is full (${M.stockCount(s)}/${M.barnCapacity(s)}). Sell pumpkins, buy A bigger pumpkin barn, or a market cart to take the extra to the village; ripe crops will wait safely.`;
  if (!M.stockCount(s)) return "Nothing on the shelves. Harvest a few pumpkins and I’ll ring the bell.";
  if (!s.shop.unlocked && s.coins >= 600) return "We could open the shop now. Customers would come inside to browse.";
  const shown = s.shop.displays.slice(0, M.displayCount(s.shop)), best = [3, 2, 1, 0].find((v) => M.available(s, v) > 0);
  if (s.shop.unlocked && best !== undefined && !shown.includes(best)) return `Put the ${M.VARIETIES[best].name} pumpkins on a table. They sell for ${money(M.VARIETIES[best].price)}.`;
  const ready = s.orders.list.find((o) => M.canFillOrder(s, o));
  if (ready) return `${M.orderFrom(ready)}’s order is ready to go: tap the crate at the top and send it. It pays better than the stall.`;
  const wanted = M.wantedVariety(s);
  if (wanted !== null && !M.available(s, wanted)) return `Everyone’s asking for ${M.VARIETIES[wanted].name} and we’ve none left. Plant some: they’ll pay up to ${Math.round(M.WANTED.bonus * 100)}% more.`;
  if (s.stall.missedBudget > s.stall.served / 3) return "Some neighbours can’t afford what’s left. A few Orange pumpkins keep everyone happy.";
  return "Pick little and often: fresh pumpkins sell first, and guests pay a bit more for them from their change.";
}

export function farmSheets(ui) {
  let tab = "farm";
  const cocoaMenu = festivalMeadowSheet(ui).festival; cocoaMenu.setTab("cocoa");
  const tabs = () => segmented("shoptab", "Shop sections", [["farm", "Farm"], ["seeds", "Seeds"], ["shop", "Shop"], ["cocoa", "Cocoa"], ["stall", "Stock"], ["visitors", "Visitors"]], tab).replace('class="segmented"', 'class="segmented build-sections"');

  // Spread the word lives in the Visitors tab with the rest of its kind.
  function farm(s) {
    return M.UPGRADES.filter((u) => u.id !== "sign").map((u) => {
      const level = s.upgrades[u.id], max = level >= u.max, price = M.upgradeCost(s, u.id);
      return `<article class="card${max ? " done" : ""}">${icon(u.id)}<div><h3>${u.name}</h3><p>${u.id === "storage" ? `${M.stockCount(s)}/${M.barnCapacity(s)} stored. ${s.upgrades.storage >= u.max ? "Barn fully expanded." : `Next tier adds ${M.STORAGE_BONUS[(s.upgrades.storage||0)+1]-M.STORAGE_BONUS[s.upgrades.storage||0]} spaces.`}` : u.id === "cart" ? `${u.text} ${cartLine(s)}` : u.text}</p>${tiers(level, u.max)}</div>
        ${priceButton("buy", u.id, price, s.coins, max && "Owned")}</article>`;
    }).join("");
  }

  function seeds(s) {
    const open = M.openPlots(s), remaining = s.plots.length - open, wanted = M.wantedVariety(s);
    return `<p>Better seeds unlock per plot. Rarer pumpkins sell for more and grow more slowly.${wanted !== null ? ` <b>${M.VARIETIES[wanted].name}</b> is wanted now (★): up to ${Math.round(M.WANTED.bonus * 100)}% more.` : ""}</p><div class="plot-grid">` + s.plots.slice(0, open).map((p, i) => {
      const level = s.plotLevels[i], next = M.VARIETIES[level + 1], crop = s.plotCrops[i];
      const chips = level ? `<div class="chips" role="group" aria-label="What plot ${i + 1} grows">${M.VARIETIES.slice(0, level + 1).map((v, k) => `<button class="chip${wanted === k ? " wanted" : ""}" data-crop="${i}:${k}" aria-pressed="${crop === k}"${wanted === k ? ` aria-label="${v.name}, wanted now"` : ""}>${v.name}${wanted === k ? ` <span class="wanted-mark" aria-hidden="true">★</span>` : ""}</button>`).join("")}</div>` : "";
      return `<div class="plot-card">${ui.thumb(crop)}<h3>Plot ${i + 1} · ${M.VARIETIES[crop].name}</h3><p>${money(M.VARIETIES[crop].price)} each</p>${chips}
        ${next ? `<button class="button" data-plot="${i}" ${s.coins < next.cost ? "disabled" : ""}>${next.name} seeds · ${money(next.cost)}</button>` : `<p class="small">Every seed unlocked</p>`}</div>`;
    }).join("") + (remaining > 0 ? `<div class="plot-card locked"><span class="thumb"><span class="ico i-plots"></span></span><h3>${remaining} more plots to discover</h3><p>Expand the farm to plant a bigger patch.</p><button class="button" data-shoptab="farm">Farm expansion</button></div>` : "") + `</div>`;
  }

  function shop(s) {
    const cat = ui.portrait("skyla"), sh = s.shop, tip = `<aside class="tip"><span class="tip-cat" aria-hidden="true">${cat ? `<img src="${cat}" alt="">` : ""}</span><p><b>Skyla</b>${skylaTip(s)}</p></aside>`;
    const comforts = `<h3 class="section">Carrier bags & tips</h3>` + customerCareSummary(s) + customerCareUpgrades(s);
    if (!sh.unlocked) {
      const price = M.shopUpgradeCost(s, "open");
      return tip + `<article class="card">${icon("open")}<div><h3>Open the shop</h3><p>Customers come inside the Honest Pumpkin, browse the display tables and queue at Skyla’s till.</p></div>${priceButton("shopup", "open", price, s.coins)}</article>` + comforts;
    }
    const inside = ui.scene.place?.kind === "shop";
    const visit = `<button class="button gold wide" data-visit="${inside ? "leave" : "shop"}">${inside ? "Back to the patch" : "Step inside the shop"}</button>`;
    const stats = `<div class="stats"><div><b>${sh.served}</b><span>served inside</span></div><div><b>${money(sh.income)}</b><span>pumpkin takings</span></div><div><b>${money(s.customerCare.tips.shop)}</b><span>tips at the till</span></div><div><b>${sh.customers.filter((c) => c.phase !== "leaving").length}/${M.SHOP_CAPACITY[sh.capacityLevel]}</b><span>browsing now</span></div></div>`;
    const tables = Array.from({ length: M.displayCount(sh) }, (_, i) => {
      const on = sh.displays[i];
      return `<div class="table-row"><h4>Table ${i + 1}</h4><div class="chips" role="group" aria-label="What table ${i + 1} shows">${[null, 0, 1, 2, 3].map((v) => {
        const taken = v !== null && sh.displays.some((d, k) => k !== i && k < M.displayCount(sh) && d === v);
        return `<button class="chip" data-display="${i}:${v}" aria-pressed="${on === v}" ${taken ? "disabled" : ""}>${v === null ? "Empty" : M.VARIETIES[v].name}${v !== null ? ` <small>${M.available(s, v)}</small>` : ""}</button>`;
      }).join("")}</div></div>`;
    }).join("");
    const upgrades = M.SHOP_UPGRADES.filter((u) => u.id !== "open").map((u) => {
      const level = sh[SHOP_LEVELS[u.id]], price = M.shopUpgradeCost(s, u.id), max = price === undefined;
      const now = u.id === "capacity" ? `${M.SHOP_CAPACITY[level]} browsing` : u.id === "displays" ? `${M.displayCount(sh)} tables` : `${M.CHECKOUT_SECONDS[level]}s at the till`;
      return `<article class="card${max ? " done" : ""}">${icon(u.id)}<div><h3>${u.name}</h3><p>${u.id === "storage" ? `${M.stockCount(s)}/${M.barnCapacity(s)} stored. ${s.upgrades.storage >= u.max ? "Barn fully expanded." : `Next tier adds ${M.STORAGE_BONUS[(s.upgrades.storage||0)+1]-M.STORAGE_BONUS[s.upgrades.storage||0]} spaces.`}` : u.text} Now: ${now}.</p>${tiers(level, SHOP_MAX[u.id])}</div>${priceButton("shopup", u.id, price, s.coins, max && "Done")}</article>`;
    }).join("");
    return tip + visit + stats + `<h3 class="section">Display tables</h3>` + tables + `<h3 class="section">Improve the shop</h3>` + upgrades + comforts;
  }

  // Who is on the path now, a party at a time.
  function guest(v) {
    const doing = v.hollow && !v.hollow.done ? (v.hollow.fleeing ? "running home from the maze" : `at the maze · ${Math.round(v.hollow.terror ?? 0)}% terror`) : v.outcome === "bought" ? `bought ${plural(v.quantity, "pumpkin")} for ${money(v.amount)}` : v.outcome === "shopping" ? "on the way" : v.outcome === "budget" ? "couldn’t afford what’s left" : "found the shelves empty";
    return `<p class="guest${v.place ? " member" : ""}"><b>${v.kind === 10 ? "Baron Brassbolt" : M.STALL_PROFILES[v.profile]?.name ?? "Neighbour"}</b>${v.regular ? ` <span class="tag">regular</span>` : ""} · ${money(v.budget)} budget${v.cocoaAllowance ? ` (includes ${money(v.cocoaAllowance)} cocoa money)` : ""} · ${doing}${v.mug ? " · a cup of hot chocolate" : ""}</p>`;
  }
  const partyLabel = (v) => (v.size > 1 ? `<p class="party-label">${["", "", "Two friends", "A party of three", "A family of four"][v.size]}</p>` : "");

  function stall(s) {
    const st = s.stall, held = (v) => M.held(s, v);
    return `<div class="stats"><div><b>${st.served}</b><span>neighbours served</span></div><div><b>${money(st.income)}</b><span>pumpkin takings</span></div><div><b>${money(s.customerCare.tips.stall)}</b><span>stall tips</span></div><div><b>${st.itemsSold}</b><span>pumpkins sold</span></div><div><b>${st.missedBudget + st.missedStock}</b><span>left empty-handed</span></div>${st.cocoa ? `<div><b>${money(st.cocoa)}</b><span>in cocoa & treats</span></div>` : ""}</div>
      <h3 class="section">In stock</h3><div class="stock-row">${M.VARIETIES.map((v, i) => `<div class="stock">${ui.thumb(i)}<b>${M.available(s, i)}</b><span>${v.name}${held(i) ? ` · ${held(i)} in baskets` : ""}</span></div>`).join("")}</div>
      <h3 class="section">At the stall now</h3>${s.visitors.length ? s.visitors.map((v, i) => (v.place === 0 || i === 0 ? partyLabel(v) : "") + guest(v)).join("") : `<p>No one on the path just now.</p>`}
      <h3 class="section">Who comes by</h3>${M.STALL_PROFILES.map((p) => `<p class="guest"><b>${p.name}</b> · ${money(p.budget)} to spend · up to ${plural(p.basketLimit, "pumpkin")} · likes ${p.preferred.map((v) => M.VARIETIES[v].name).join(", ")}</p>`).join("")}
      ${st.receipts.length ? `<h3 class="section">Recent sales</h3>` + st.receipts.slice(0, 6).map((r) => `<p class="guest">${M.STALL_PROFILES[r.profile].name}: ${basketText(r.lines)}${r.mug ? " + a hot chocolate" : ""} · ${money(r.amount + (r.mug ?? 0))}${r.tip ? ` + ${money(r.tip)} tip` : ""}</p>`).join("") : ""}
      <p class="small">Missed: ${st.missedBudget} over budget, ${st.missedStock} sold out.</p>`;
  }

  // The visitor upgrades: how busy the path is, then a card for each.
  function visitors(s) {
    const max = M.partyMax(s);
    const boost = Math.round((M.streakPathBoost?.(s) ?? M.pathBoost(s)) * 100), busiest = M.visitorBonus(s) - M.pathBoost(s) > 0.005;
    const now = busiest ? " (as busy as the path gets)" : boost ? ` (streak +${boost}%)` : "";
    const stats = `<div class="stats"><div><b>${Math.round(M.visitorsPerMinute(s) * 10) / 10}</b><span>neighbours a minute</span></div><div><b>${max > 1 ? `1–${max}` : "1"}</b><span>in each party</span></div><div><b>${secs(M.stallGapSeconds(s))}</b><span>between parties${now}</span></div><div><b>${M.onThePath(s)}/${M.visitorCapacity(s)}</b><span>outdoor visitors</span></div></div>`;
    const maze = M.mazeFootfallBonus?.(s) ?? 0;
    const attraction = maze ? `<p class="commerce-inline-note">The Hollow House brings +${Math.round(maze * 100)}% footfall while open. Frightened visitors may leave early.</p>` : "";
    const streak = `<p class="small streak-note">Quick picking builds a streak, and a streak gets talked about: visitors come 10% more often for each pick up to ×6, then 5% more a pick, to +${Math.round(M.STREAK.cap * 100)}%. It fades over ${M.STREAK.fade}s once you stop. Helping hands don’t count; they’re not showing off.</p>`;
    const cards = VISITOR_IDS.map((id) => {
      const sign = id === "sign", u = sign ? M.UPGRADES.find((x) => x.id === id) : M.VISITOR_UPGRADES.find((x) => x.id === id);
      const level = M.visitorUpgradeLevel(s, id), most = sign ? u.max : u.costs.length, done = level >= most;
      const open = sign || M.visitorUpgradeUnlocked(s, id), price = sign ? M.upgradeCost(s, id) : M.visitorUpgradeCost(s, id);
      const effect = open ? effectLine(s, id, done) : u.needs.text;
      const button = !open ? `<button class="button" disabled>Locked</button>` : priceButton(sign ? "buy" : "visitup", id, price, s.coins, done && "Done");
      return `<article class="card${done ? " done" : ""}${open ? "" : " waiting"}">${icon(id)}<div><h3>${id === "cocoa" ? "Cocoa hospitality" : u.name}</h3><p>${id === "cocoa" ? "Longer pumpkin patience; quicker service at Sandy’s stand." : u.text}</p><p class="effect">${effect}</p>${tiers(level, most)}</div>${button}</article>`;
    }).join("");
    return stats + attraction + streak + cards;
  }

  return {
    shop: {
      eyebrow: "Your pumpkin patch", title: () => ({ farm: "Farm upgrades", seeds: "Crops & seeds", shop: "Skyla’s shop", stall: "Stall & stock", visitors: "Visitors & crowds", cocoa: "Sandy’s cocoa" })[tab] ?? "Build & grow",
      setTab(t) { tab = ["farm", "seeds", "shop", "cocoa", "stall", "visitors"].includes(t) ? t : "farm"; },
      body() {
        const s = ui.state;
        return tabs() + (tab === "cocoa" ? cocoaMenu.body({ embedded: true }) : ({ farm, seeds, shop, stall, visitors })[tab](s));
      },
      bind(body) {
        const s = ui.state;
        if (tab === "cocoa") cocoaMenu.bind(body, { embedded: true });
        if (tab === "shop") bindCustomerCareUpgrades(body, ui);
        body.querySelector("[data-care]")?.addEventListener("click", () => ui.openSheet("care"));
        body.querySelector("[data-festival]")?.addEventListener("click", () => ui.openSheet("festival"));
        body.querySelectorAll("[data-shoptab]").forEach((b) => (b.onclick = () => { tab = b.dataset.shoptab; ui.draw(); }));
        body.querySelectorAll("[data-buy]").forEach((b) => (b.onclick = () => {
          const id = b.dataset.buy;
          if (!M.buyUpgrade(s, id)) return;
          ui.tone(820); ui.notice(M.UPGRADES.find((u) => u.id === id).name + " bought.");
          if (id === "auto") ui.say("shane", "You mind the shop. We’ll plant and pick. Teamwork makes the pumpkin dream work.");
          if (id === "plots") ui.say("natalie", "More room for our little empire. I might be getting carried away.");
          ui.draw();
        }));
        body.querySelectorAll("[data-visitup]").forEach((b) => (b.onclick = () => {
          const id = b.dataset.visitup;
          if (!M.buyVisitorUpgrade(s, id)) return;
          ui.tone(820); ui.notice(M.VISITOR_UPGRADES.find((u) => u.id === id).name + " bought.");
          const talk = VISITOR_TALK[id]?.[M.visitorUpgradeLevel(s, id)];
          if (talk) ui.say(...talk);
          ui.draw();
        }));
        body.querySelectorAll("[data-plot]").forEach((b) => (b.onclick = () => { const i = +b.dataset.plot; if (M.upgradePlot(s, i)) { ui.tone(820); ui.notice(`Plot ${i + 1} can now grow ${M.VARIETIES[s.plotLevels[i]].name}.`); ui.draw(); } }));
        body.querySelectorAll("[data-crop]").forEach((b) => (b.onclick = () => { const [i, v] = b.dataset.crop.split(":").map(Number); if (M.choosePlotCrop(s, i, v)) ui.draw(); }));
        body.querySelectorAll("[data-shopup]").forEach((b) => (b.onclick = () => {
          const id = b.dataset.shopup;
          if (!M.upgradeShop(s, id)) return;
          ui.tone(820);
          if (id === "open") { ui.notice("The Honest Pumpkin is open. Customers will start coming inside."); ui.say("natalie", "We have a real shop! Skyla’s already sitting on the till like she owns it."); }
          else ui.notice(M.SHOP_UPGRADES.find((u) => u.id === id).name + " done.");
          ui.draw();
        }));
        body.querySelectorAll("[data-display]").forEach((b) => (b.onclick = () => { const [i, v] = b.dataset.display.split(":"); if (M.assignDisplay(s, +i, v === "null" ? null : +v)) ui.draw(); }));
        body.querySelectorAll("[data-visit]").forEach((b) => (b.onclick = () => { if (b.dataset.visit === "shop") ui.enterShop(); else ui.leavePlace(); ui.draw(); }));
      },
    },
  };
}
