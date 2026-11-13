// The fishing lake's menu (handover 71). A hero photographed from the lake's
// own voxel model with what it has brought in, the four trap slots, then two
// tabs (bumpers on a pad): the catch log, every fish pictured from the model
// that jumps in the garden, and the gear. Before the lake is dug, the hero
// offers it, with what lives in it.
import * as M from "../model.js";
import { money, segmented } from "./kit.js";
import { fishingArt, fishPicture } from "./fishing-art.js";

const RARITY = { common: "Common", uncommon: "Uncommon", rare: "Rare", legendary: "Legendary", junk: "Junk" };
const kg = (n) => `${n < 1 ? Math.round(n * 1000) + " g" : n.toFixed(1) + " kg"}`;
const gives = (f) => f.junk ? "Nothing useful" : f.value ? `A collector pays ${money(f.value)}` : Object.entries(f.gives).map(([id, n]) => `${n} ${M.INGREDIENT_BY_ID[id].name.toLowerCase()}`).join(", ");

export function fishingSheet(ui) {
  let tab = "catches";
  const render = (url, cls, fallback = "") => (url ? `<img class="${cls}" src="${url}" alt="" draggable="false">` : fallback);
  const buy = (attr, id, step, s) => !step ? `<span class="fish-done">Best there is</span>`
    : step.locked ? `<span class="stand-lock"><i aria-hidden="true"></i>Level ${step.level}</span>`
    : `<button class="button purchase-button${step.afford && !s.paused ? " can-act" : ""}" data-${attr}="${id}" ${step.afford && !s.paused ? "" : "disabled"}>${money(step.cost)}</button>`;

  function hero(s) {
    const st = M.fishingStatus(s), lake = render(fishingArt.lake(), "fish-lake-render", `<span class="fish-lake-fallback" aria-hidden="true"></span>`);
    if (!st.lake) {
      const def = M.ESTATE_DECOR_BY_ID["fishing-lake"], owned = s.estate.ownedDecor["fishing-lake"] > 0, locked = s.house.level < def.houseLevel;
      const action = owned ? `<button class="button gold can-act" data-fish-place>Place it in the garden</button>`
        : locked ? `<span class="stand-lock"><i aria-hidden="true"></i>House level ${def.houseLevel}</span>`
        : `<button class="button purchase-button${s.coins >= def.cost ? " can-act" : ""}" data-fish-buy ${s.coins >= def.cost && !s.paused ? "" : "disabled"}>Dig it · ${money(def.cost)}</button>`;
      return `<section class="fish-hero is-preview"><div class="fish-hero-art">${lake}</div><div class="fish-hero-text">
        <p class="fish-kicker">${owned ? "Dug, waiting in garden storage" : "For the garden"}</p><h3>A fishing lake</h3>
        <p>Reeds, lily pads and a jetty to fish from. Cast a line, wait for the bob, and strike: perch, carp, eels and the odd golden koi. Set traps round its edge for crayfish while you farm.</p>
        <p class="fish-note">Fish go to Maisie's pantry for three new recipes, or sell at the market.</p><div class="fish-actions">${action}</div></div></section>`;
    }
    const held = st.waiting;
    return `<section class="fish-hero"><div class="fish-hero-art">${lake}</div><div class="fish-hero-text">
      <p class="fish-kicker">In the garden</p><h3>The fishing lake</h3>
      <div class="fish-chips"><span>${st.caught} caught</span><span>${st.species} of ${M.FISH.length} kinds</span><span>${money(st.earned)} from sales</span></div>
      <p class="fish-gear-line">${st.rod.name} · ${st.bait.name} · ${M.trapCount(s)} ${st.trapTier.name.toLowerCase()}</p>
      <div class="fish-actions"><button class="button gold can-act" data-fish-go data-pad-default>Fish from the jetty</button>
      ${M.trapCount(s) ? `<button class="button${held ? " can-act" : ""}" data-fish-empty ${held ? "" : "disabled"}>${held ? `Empty the traps · ${held}` : "Traps set"}</button>` : ""}</div></div></section>`;
  }

  function traps(s) {
    const st = M.fishingStatus(s); if (!st.lake) return "";
    const trapArt = render(fishingArt.trap(), "fish-trap-render"), next = M.nextTrap(s);
    const slots = M.TRAP_COSTS.map((cost, i) => {
      const t = st.traps[i];
      if (t) return `<article class="fish-trap${t.full ? " is-full" : ""}">${trapArt}<div><b>Trap ${i + 1}</b><span class="fish-bar"><i style="width:${Math.round(t.held / t.holds * 100)}%"></i></span><small>${t.full ? "Full" : `${t.held} of ${t.holds} · next in ${Math.ceil(t.next)}s`}</small></div></article>`;
      if (i === st.traps.length) return `<article class="fish-trap is-free">${trapArt}<div><b>Another trap</b><small>${st.trapTier.name}</small></div>${buy("fish-trap", "1", next && { ...next, level: 0 }, s)}</article>`;
      return `<article class="fish-trap is-locked"><span class="fish-trap-empty" aria-hidden="true"></span><div><b>Trap ${i + 1}</b><small>${money(cost)}</small></div></article>`;
    }).join("");
    return `<section class="fish-traps"><header><h3>Traps round the edge</h3><p>${st.trapTier.text}</p></header><div class="fish-trap-row">${slots}</div></section>`;
  }

  function catches(s) {
    const f = s.fishing;
    return `<div class="fish-log">${M.FISH.map((fish) => {
      const e = f.log[fish.id], from = [fish.rod > 0 && "rod", fish.trap > 0 && "traps"].filter(Boolean).join(" and ");
      return `<article class="fish-card rarity-${fish.rarity}${e ? "" : " is-unknown"}">${fishPicture(fish.id)}
        <div><span class="fish-rarity">${RARITY[fish.rarity]}</span><h4>${e ? fish.name : "Not caught yet"}</h4>
        <p>${e ? fish.text : `Bites on the ${from}.`}</p><small>${e ? `${e.n} caught · best ${kg(e.best)} · ${gives(fish)}` : gives(fish)}</small></div></article>`;
    }).join("")}</div>`;
  }

  function gear(s) {
    const rod = M.currentRod(s), bait = M.currentBait(s), traps = M.currentTraps(s);
    const card = (kind, title, now, line, next, attr) => `<article class="fish-gear-card"><span class="fish-kicker">${title}</span><h4>${now.name}</h4><p>${line}</p>
      <div class="fish-next">${next ? `<span>Next: <b>${next.name}</b> · ${next.text}</span>` : `<span>${now.text}</span>`}${buy(attr, kind, next, s)}</div></article>`;
    return `<div class="fish-gear">
      ${card("rod", "Rod", rod, `Strike window ${rod.window.toFixed(2)}s${rod.luck ? ` · luck +${rod.luck}` : ""}${rod.noJunk ? " · no boots" : ""}`, M.nextRod(s), "fish-gear")}
      ${card("bait", "Bait", bait, `Bites in ${bait.bite[0]}–${bait.bite[1]}s${bait.luck ? ` · luck +${bait.luck}` : ""}`, M.nextBait(s), "fish-gear")}
      ${card("traps", "Traps", traps, `A catch every ${traps.every}s · holds ${traps.holds}${traps.luck ? ` · luck +${traps.luck}` : ""}`, M.nextTrapTier(s), "fish-gear")}
      <p class="fish-note">Luck makes rare fish likelier and boots rarer. The rarest catches sell to collectors; the rest go to Maisie's pantry for her fish supper, crayfish boil and fish pie.</p></div>`;
  }

  return {
    eyebrow: "Garden",
    title: () => "The fishing lake",
    setTab(t) { if (["catches", "gear"].includes(t)) tab = t; },
    body() {
      const s = ui.state, built = !!M.fishingLake(s);
      const tabs = built ? `<div data-pad-tabs>${segmented("fishtab", "Lake sections", [["catches", "Catches"], ["gear", "Gear"]], tab)}</div>` : "";
      return `<div class="fish-sheet">${hero(s)}${traps(s)}${tabs}${built && tab === "gear" ? gear(s) : catches(s)}</div>`;
    },
    bind(body) {
      const s = ui.state, done = (ok, message) => { if (!ok) return; ui.save(); ui.draw(); if (message) ui.notice(message); };
      body.querySelectorAll("[data-fishtab]").forEach((b) => (b.onclick = () => { tab = b.dataset.fishtab; ui.draw(); }));
      body.querySelector("[data-fish-go]")?.addEventListener("click", () => ui.fishing.start());
      body.querySelector("[data-fish-empty]")?.addEventListener("click", () => ui.fishing.emptyTraps());
      body.querySelector("[data-fish-buy]")?.addEventListener("click", () => done(M.buyEstateDecor(s, "fishing-lake"), "Dug and waiting in garden storage. Choose where it goes."));
      body.querySelector("[data-fish-place]")?.addEventListener("click", () => ui.fishing.place());
      body.querySelectorAll("[data-fish-trap]").forEach((b) => (b.onclick = () => done(M.buyTrap(s), "A new trap, baited and set.")));
      body.querySelectorAll("[data-fish-gear]").forEach((b) => (b.onclick = () => {
        const kind = b.dataset.fishGear, ok = kind === "rod" ? M.buyRod(s) : kind === "bait" ? M.buyBait(s) : M.buyTrapTier(s);
        done(ok, ok && `${kind === "rod" ? M.currentRod(s).name : kind === "bait" ? M.currentBait(s).name : M.currentTraps(s).name}: yours.`);
      }));
    },
  };
}
