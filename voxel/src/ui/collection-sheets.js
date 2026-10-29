// The wardrobe, the journal (favours, the scrapbook and the library) and the book reader.
import * as M from "../model.js";
import { money, segmented, decorIcon } from "./kit.js";

const MEMORY_ICONS = { seed: "plant", heart: "visitors", moon: "moonlight", hands: "auto", crown: "coins", spark: "boost", house: "home", cup: "shop", chef: "stock", ride: "sign", broom: "tools", court: "visitors", book: "journal", outfit: "outfits", star: "upgrades" };

export function collectionSheets(ui) {
  let who = "natalie", collection = "all", journalTab = "favours", reading = null;

  const portrait = (id) => {
    const url = ui.portrait(id);
    return `<span class="thumb tall">${url ? `<img src="${url}" alt="">` : `<span class="ghost-icon"></span>`}</span>`;
  };

  function wardrobe(s) {
    const people = segmented("who", "Whose wardrobe", [["natalie", "Natalie"], ["shane", "Shane"]], who);
    const sets = segmented("set", "Collections", [["all", "Everything"], ["classic", "Classic"], ["90s-horror", "90s Halloween"]], collection);
    const outfits = M.costumeCatalog.filter((c) => c.character === who && (collection === "all" || (collection === "classic" ? c.collection !== "90s-horror" : c.collection === collection)));
    const worn = s.wardrobe.equipped[who];
    const cards = outfits.map((c) => {
      const owned = s.wardrobe.owned.includes(c.id), wearing = worn === c.id;
      return `<article class="card outfit${wearing ? " current" : ""}">${portrait(c.id)}<div><h3>${c.name}</h3><p>${c.description}</p>${c.collection === "90s-horror" ? `<p class="small">90s Halloween</p>` : ""}</div>
        ${wearing ? `<button class="button" disabled>Wearing</button>` : owned ? `<button class="button" data-wear="${c.id}">Wear</button>` : `<button class="button gold" data-costume="${c.id}" ${s.coins < c.price ? "disabled" : ""}>${money(c.price)}${s.coins < c.price ? `<small>need ${money(c.price - s.coins)}</small>` : ""}</button>`}</article>`;
    }).join("");
    const key = who === "natalie" ? "sweater" : "beanie";
    const colours = worn === who + "-base" ? `<h3 class="section">${who === "natalie" ? "Natalie’s knit" : "Shane’s beanie"}</h3>` + M.LOOKS[who].map((l) => {
      const owned = s.looks.owned.includes(l.id), wearing = s.looks[who] === l.id;
      return `<article class="card"><span class="thumb"><span class="swatch" style="background:#${l[key].toString(16).padStart(6, "0")}"></span></span><div><h3>${l.name}</h3><p>${wearing ? "Wearing now" : owned ? "In the wardrobe" : "A new colour for the original outfit"}</p></div>
        <button class="button ${wearing ? "" : owned ? "" : "gold"}" data-look="${who}:${l.id}" ${wearing || (!owned && s.coins < l.price) ? "disabled" : ""}>${wearing ? "Worn" : owned ? "Wear" : money(l.price)}</button></article>`;
    }).join("") : `<p class="small">Colours for the knit and beanie show with the original outfit.</p>`;
    return people + sets + cards + colours;
  }

  function favours(s) {
    return M.FAVOURS.map((f) => {
      const done = s.claimed.includes(f.id), have = M.favourProgress(s, f), can = !done && have >= f.target;
      return `<article class="card${done ? " done" : ""}">${portrait(M.favourFace(f))}<div><p class="eyebrow small-eyebrow">${f.guest}</p><h3>${f.title}</h3><p>${f.text}</p><div class="bar"><i style="width:${(have / f.target) * 100}%"></i></div></div>
        <button class="button ${can ? "gold" : ""}" data-claim="${f.id}" ${can ? "" : "disabled"}>${done ? "Thanked" : can ? "Claim " + money(f.reward) : `${f.money ? money(have) : have.toLocaleString("en-GB")}/${f.money ? money(f.target) : f.target.toLocaleString("en-GB")}`}</button></article>`;
    }).join("");
  }

  function scrapbook(s) {
    const lvl = M.patchLevel(s);
    return `<article class="card hero"><span class="thumb"><span class="ico i-coins"></span></span><div><p class="eyebrow">Level ${lvl.level}</p><h3>${lvl.name}</h3><p>${lvl.tagline}</p><div class="bar"><i style="width:${lvl.progress * 100}%"></i></div></div></article>
      <p>${s.memories.length} of ${M.MEMORIES.length} memories made. There’s plenty of autumn ahead.</p>` +
      M.MEMORIES.map((m) => {
        const made = s.memories.includes(m.id);
        return `<article class="card memory${made ? "" : " waiting"}"><span class="thumb"><span class="ico i-${MEMORY_ICONS[m.icon]}"></span></span><div><h3>${m.title}</h3><p>${m.text}</p><p class="small">${made ? "✓ " + m.memory : "A memory waiting to be made"}</p></div></article>`;
      }).join("") +
      `<div class="stats"><div><b>${s.harvested}</b><span>pumpkins picked</span></div><div><b>${s.sold}</b><span>happy visitors</span></div><div><b>${money(s.earned)}</b><span>earned in total</span></div><div><b>${s.streak.best}</b><span>best harvest streak</span></div></div>`;
  }

  // What a level opens: the later upgrade tiers (rules/unlocks.js), the
  // attractions and their tiers, and the house's next storeys.
  const ORDINAL = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"];
  const UPGRADE_NAMES = { farm: M.UPGRADES, visitor: M.VISITOR_UPGRADES, shop: M.SHOP_UPGRADES };
  function opens(level) {
    const out = [];
    for (const [kind, table] of Object.entries(UPGRADE_NAMES)) for (const [id, gates] of Object.entries(M.UNLOCKS[kind])) gates.forEach((at, tier) => {
      if (at === level && at > 1) out.push(`${table.find((u) => u.id === id)?.name ?? id}, ${ORDINAL[tier] ?? tier + 1 + "th"} tier`);
    });
    M.UNLOCKS.house.forEach((at, i) => { if (at === level) out.push(`Grow the house into the ${M.HOUSE_LEVELS[i + 1].name}`); });
    if (M.MEADOW.level === level) out.push("Moonbrew Meadow");
    M.COCOA_TIERS.forEach((t) => { if (t.level === level) out.push(`Sandy’s ${t.name}`); });
    if (M.HOLLOW_PROPERTY.level === level) out.push("The Hollow House");
    M.FOYER_TIERS.forEach((t, i) => { if (i && t.patchLevel === level) out.push(`The Hollow House’s ${t.name}`); });
    if (M.HAYRIDE_PROPERTY.level === level) out.push("The Hollow Hayride");
    M.HAYRIDE_TIERS.forEach((t, i) => { if (i && t.patchLevel === level) out.push(`The hayride’s ${t.name}`); });
    M.HAYRIDE_OPERATIONS.forEach((u) => { if (u.level === level && u.level > M.HAYRIDE_PROPERTY.level) out.push(`The hayride’s ${u.name.toLowerCase()}`); });
    M.HAYRIDE_ROUTE_UPGRADES.forEach((r) => { if (r.patchLevel === level) out.push(`The hayride through ${r.name.replace(/^The /, "the ")}`); });
    if (M.COOKING.level === level) out.push("Maisie’s Midnight Kitchen");
    M.KITCHEN_UPGRADES.forEach((u) => { if (u.level === level && u.level > M.COOKING.level) out.push(u.name); });
    M.VISITOR_EVENT_UPGRADES.forEach((u) => { if (u.level === level) out.push(u.name); });
    if (M.CLEANLINESS.janitorLevel === level) out.push("Hettie the caretaker");
    return out;
  }
  function levels(s) {
    const current = M.patchLevel(s);
    return `<p>Grow your reputation through 20 levels. Earnings and home milestones work together: expand rooms, cook and make the house your own. Bonus coins do not count towards another level. Rewards are granted automatically; already-owned treasures become bonus coins.</p>` + M.LEVELS.map((l) => {
      const reached = l.level <= current.level, active = l.level === current.level;
      const rewards = l.rewards.map((r) => r.kind === "coins" ? money(r.amount) + " coins" : r.kind === "decor" ? M.decorById[r.id].name : r.kind === "costume" ? M.costumeById[r.id].name : r.name + " · one tier");
      return `<article class="level-roadmap ${active ? "current" : ""}"><h3>${reached ? "✓ " : ""}Level ${l.level} · ${l.name}</h3><p class="small">${l.at ? money(l.at) + " earned" : "Where our story begins"}${active ? " · You’re here" : ""}</p>${M.homeRequirements(s,l.level).length ? `<p class="small">Home: ${M.homeRequirements(s,l.level).map(r=>(r.met?"✓ ":"◇ ")+r.text).join(" · ")}</p>` : ""}${rewards.length ? `<p>${rewards.join(" · ")}</p>` : ""}${opens(l.level).length ? `<p class="small">Opens: ${opens(l.level).join(" · ")}</p>` : ""}${active && current.next ? `<div class="bar"><i style="width:${current.progress * 100}%"></i></div><p class="small">${current.blocked ? "Earnings ready · finish the home milestone above" : money(Math.max(0,current.next.at - current.xp)) + " to the next level"}</p>` : ""}</article>`;
    }).join("");
  }

  function library(s) {
    const books = M.decorCatalog.filter((it) => it.category === "books");
    return `<p>Every book you buy can be read here. We remember the page you got to.</p>` + books.map((b) => {
      const owned = s.house.owned.includes(b.id), story = M.libraryStories[b.id], page = s.house.reading[b.id] ?? 0;
      return `<article class="card${owned ? "" : " waiting"}">${decorIcon(b.id)}<div><h3>${b.name}</h3><p>${story.subtitle}</p><p class="small">${owned ? `Page ${page + 1} of ${story.pages.length}` : `${money(b.price)} in Home › Decorate`}</p></div>
        <button class="button ${owned ? "gold" : ""}" data-read="${b.id}" ${owned ? "" : "disabled"}>${owned ? (page ? "Carry on" : "Read") : "Not yet"}</button></article>`;
    }).join("");
  }

  function reader(s) {
    const book = M.decorById[reading], story = M.libraryStories[reading];
    if (!book || !story) return `<p>That book has wandered off.</p>`;
    const page = s.house.reading[reading] ?? 0, p = story.pages[page];
    return `<div class="reader-head">${decorIcon(reading, 64)}<div><h3>${book.name}</h3><p>${story.subtitle}</p></div></div>
      <article class="page"><h4>${p.heading}</h4>${p.paragraphs.map((t) => `<p>${t}</p>`).join("")}</article>
      <div class="pager"><button class="button" data-page="${page - 1}" ${page ? "" : "disabled"}>Previous</button><span>${page + 1} / ${story.pages.length}</span><button class="button gold" data-page="${page + 1}" ${page < story.pages.length - 1 ? "" : "disabled"}>Next</button></div>`;
  }

  return {
    read(id) { reading = id; ui.openSheet("reader"); },
    wardrobe: {
      eyebrow: "Dress for the witching hour", title: "Wardrobe",
      body() { return wardrobe(ui.state); },
      bind(body) {
        const s = ui.state;
        body.querySelectorAll("[data-who]").forEach((b) => (b.onclick = () => { who = b.dataset.who; ui.draw(); }));
        body.querySelectorAll("[data-set]").forEach((b) => (b.onclick = () => { collection = b.dataset.set; ui.draw(); }));
        body.querySelectorAll("[data-costume]").forEach((b) => (b.onclick = () => {
          const id = b.dataset.costume;
          if (!M.buyCostume(s, id)) return;
          M.wearCostume(s, id);
          ui.tone(820); ui.notice(M.costumeById[id].name + " is in the wardrobe.");
          ui.scene.refreshLooks(); ui.draw();
        }));
        body.querySelectorAll("[data-wear]").forEach((b) => (b.onclick = () => { if (M.wearCostume(s, b.dataset.wear)) { ui.tone(600); ui.scene.refreshLooks(); ui.draw(); } }));
        body.querySelectorAll("[data-look]").forEach((b) => (b.onclick = () => { const [w, id] = b.dataset.look.split(":"); if (M.buyLook(s, w, id)) { ui.tone(600); ui.scene.refreshLooks(); ui.draw(); } }));
      },
    },
    journal: {
      eyebrow: "The neighbourhood after dark", title: () => ({ favours: "Midnight favours", scrapbook: "Our little scrapbook", library: "Our haunted library", levels: "Level rewards" })[journalTab],
      setTab(t) { journalTab = t; },
      body() {
        const s = ui.state, ready = M.claimable(s).length;
        return segmented("jtab", "Journal sections", [["favours", "Favours" + (ready ? ` · ${ready}` : "")], ["scrapbook", "Scrapbook"], ["library", "Library"], ["levels", "Levels"]], journalTab) + ({ favours, scrapbook, library, levels })[journalTab](s);
      },
      bind(body) {
        const s = ui.state;
        body.querySelectorAll("[data-jtab]").forEach((b) => (b.onclick = () => { journalTab = b.dataset.jtab; ui.draw(true); }));
        body.querySelectorAll("[data-claim]").forEach((b) => (b.onclick = () => {
          const f = M.FAVOURS.find((x) => x.id === b.dataset.claim), paid = M.claimFavour(s, f.id);
          if (paid) { ui.tone(880); ui.notice(`${f.guest} says thank you: +${money(paid)}`); ui.draw(); }
        }));
        body.querySelectorAll("[data-read]").forEach((b) => (b.onclick = () => ui.read(b.dataset.read)));
      },
    },
    reader: {
      eyebrow: "Our haunted library", title: () => M.decorById[reading]?.name ?? "A book",
      body() { return reader(ui.state); },
      bind(body) {
        body.querySelectorAll("[data-page]").forEach((b) => (b.onclick = () => { if (M.rememberBookPage(ui.state, reading, +b.dataset.page)) { ui.tone(520); ui.draw(); body.scrollTop = 0; } }));
      },
    },
  };
}
