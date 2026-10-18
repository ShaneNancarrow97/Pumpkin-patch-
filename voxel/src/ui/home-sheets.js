// The Home menu (rooms, the decor catalogue, the house itself), the bookshelf
// sheet, and the toolbar for moving pieces around a room.
import * as M from "../model.js";
import { money, segmented, decorIcon, spooky, plural, $ } from "./kit.js";

const roomName = (id) => M.houseRooms.find((r) => r.id === id).name;
// A characteristic piece of each room's furniture, as its icon.
const ROOM_ICONS = { parlour: "f01", bedroom: "f06", kitchen: "d13", attic: "d06" };
const houseIcon = `<span class="thumb"><span class="ico i-home"></span></span>`;

export function homeSheets(ui) {
  let tab = "rooms", category = "all", search = "";
  const tabs = () => segmented("hometab", "Home sections", [["rooms", "Rooms"], ["decorate", "Decorate"], ["house", "House"]], tab);
  const here = () => ui.state.house.activeRoom;

  function rooms(s) {
    const cards = M.houseRooms.map((r) => {
      const open = M.roomUnlocked(s, r.id), current = here() === r.id && ui.scene.place?.kind === "room";
      const need = M.HOUSE_LEVELS[r.level].name, pieces = M.roomPieces(s, r.id).length;
      return `<article class="card${current ? " current" : ""}">${decorIcon(ROOM_ICONS[r.id])}<div><h3>${r.name}</h3><p>${open ? r.description : `Opens with the ${need}.`}</p>${open ? `<p class="small">${pieces}/${M.roomCapacity(s, r.id)} pieces</p>` : ""}</div>
        ${open ? `<button class="button ${current ? "" : "gold"}" data-go="${r.id}" ${current ? "disabled" : ""}>${current ? "You’re here" : "Go in"}</button>` : `<button class="button" disabled>Locked</button>`}</article>`;
    }).join("");
    const room = here(), styles = M.roomStyles.filter((st) => st.roomId === room);
    const style = M.roomStyle(s, room);
    const styleCards = room === "parlour"
      ? `<p class="small">The parlour’s look changes as the house grows: now ${style.name}.</p>`
      : styles.map((st) => {
        const owned = !st.price || s.house.ownedRoomStyles.includes(st.id), using = style.id === st.id;
        return `<article class="card"><span class="thumb"><span class="style-swatch ${st.id}"></span></span><div><h3>${st.name}</h3><p>${st.price ? (owned ? "Yours to use any time" : "A premium look for this room") : "The room’s own look"}</p></div>
          ${using ? `<button class="button" disabled>In use</button>` : owned ? `<button class="button" data-style="${st.id}">Use</button>` : `<button class="button gold" data-buystyle="${st.id}" ${s.coins < st.price ? "disabled" : ""}>${money(st.price)}</button>`}</article>`;
      }).join("");
    const papers = s.house.owned.filter((id) => M.decorById[id].category === "wallpaper"), on = s.house.wallpapers[room] ?? null;
    const paper = papers.length
      ? `<div class="chips" role="group" aria-label="Wallpaper for the ${roomName(room)}"><button class="chip" data-paper="none" aria-pressed="${on === null}">Bare walls</button>${papers.map((id) => `<button class="chip" data-paper="${id}" aria-pressed="${on === id}"><i class="dot" style="background:${M.decorById[id].color}"></i>${M.decorById[id].name}</button>`).join("")}</div>`
      : `<p class="small">Buy wallpaper in Decorate to dress these walls.</p>`;
    return `<h3 class="section">Rooms</h3>${cards}<h3 class="section">The ${roomName(room)}’s look</h3>${styleCards}<h3 class="section">Wallpaper</h3>${paper}`;
  }

  function statusButton(s, item) {
    const id = item.id, owned = s.house.owned.includes(id);
    if (!owned) return `<button class="button gold" data-decor="${id}" ${s.coins < item.price ? "disabled" : ""}>${money(item.price)}</button>`;
    if (item.category === "wallpaper") return s.house.wallpapers[here()] === id ? `<button class="button" disabled>On these walls</button>` : `<button class="button" data-paper="${id}">Hang here</button>`;
    if (item.category === "books") {
      if (!M.availableBook(s, id)) return `<button class="button" data-read="${id}">Read</button>`;
      const shelf = M.roomPieces(s, here()).find((p) => M.shelfCapacity(p.id) > p.books.length);
      return `<button class="button" data-shelve="${id}" ${shelf ? "" : "disabled"}>${shelf ? "Shelve here" : "No shelf space here"}</button>`;
    }
    const placed = s.house.placed.find((p) => p.id === id);
    if (placed) return `<button class="button" data-show="${placed.instance}">${placed.room === here() ? "Show me" : "In the " + roomName(placed.room)}</button>`;
    const full = M.roomPieces(s, here()).length >= M.roomCapacity(s, here());
    return `<button class="button" data-place="${id}" ${full ? "disabled" : ""}>${full ? "Room is full" : "Place here"}</button>`;
  }

  function decorate(s) {
    const q = search.trim().toLowerCase();
    const items = M.decorCatalog.filter((it) => (category === "all" || it.category === category) && (!q || (it.name + " " + it.description).toLowerCase().includes(q)));
    const chips = `<div class="chips" role="group" aria-label="Catalogue sections">${M.decorCategories.map(([id, name]) => `<button class="chip" data-cat="${id}" aria-pressed="${category === id}">${name}</button>`).join("")}</div>`;
    const find = `<label class="search"><span class="sr">Search the catalogue</span><input id="decor-search" type="search" placeholder="Search 50 treasures" value="${search.replace(/"/g, "&quot;")}"></label>`;
    return `<p>Everything here is one of a kind. Buy it once, then place it in any room. Spooky pieces make the house more haunted.</p>${find}${chips}` + items.map((it) => {
      const owned = s.house.owned.includes(it.id);
      const icon = it.category === "wallpaper" ? `<span class="thumb"><span class="paper" style="background-color:${it.color}"></span></span>` : decorIcon(it.id);
      return `<article class="card decor${owned ? " owned" : ""}">${icon}<div><h3>${it.name}</h3><p>${it.description}</p>${spooky(it.spooky)}${it.capacity ? `<p class="small">Holds ${it.capacity} books</p>` : ""}</div>${statusButton(s, it)}</article>`;
    }).join("") || `<p>Nothing matches “${search}”.</p>`;
  }

  function house(s) {
    const h = s.house, level = M.HOUSE_LEVELS[h.level], next = M.HOUSE_LEVELS[h.level + 1];
    const byRoom = M.houseRooms.filter((r) => M.roomUnlocked(s, r.id)).map((r) => `${r.name} ${M.roomPieces(s, r.id).length}/${M.roomCapacity(s, r.id)}`).join(" · ");
    return `<article class="card hero">${houseIcon}<div><p class="eyebrow">Level ${h.level + 1} of 4</p><h3>${level.name}</h3><p>${byRoom}</p></div></article>
      <div class="stats"><div><b>${M.spookyScore(s)}</b><span>haunting points</span></div><div><b>${h.owned.length}/50</b><span>treasures collected</span></div><div><b>${M.shelvedBooks(s)}</b><span>books on shelves</span></div></div>
      ${next ? `<article class="card">${houseIcon}<div><h3>Grow into the ${next.name}</h3><p>${level.text}</p></div><button class="button gold" data-house ${s.coins < level.cost ? "disabled" : ""}>${money(level.cost)}${s.coins < level.cost ? `<small>need ${money(level.cost - s.coins)}</small>` : ""}</button></article>` : `<p>${level.text}</p>`}
      <p class="small">Haunting points: 4 for each level of the house, plus every spooky piece, wallpaper and shelved book.</p>`;
  }

  // The bookshelf you're looking at: books on it, and books waiting in the pile.
  let shelfInstance = null;
  function shelf(s) {
    const p = s.house.placed.find((q) => q.instance === shelfInstance);
    if (!p) return `<p>That shelf has been put away.</p>`;
    const cap = M.shelfCapacity(p.id), pile = s.house.owned.filter((id) => M.availableBook(s, id));
    const row = (id, action, label) => `<article class="card">${decorIcon(id)}<div><h3>${M.decorById[id].name}</h3><p>${M.libraryStories[id]?.subtitle ?? M.decorById[id].description}</p></div><div class="stack"><button class="button" data-${action}="${id}">${label}</button><button class="button" data-read="${id}">Read</button></div></article>`;
    return `<p>${plural(p.books.length, "book")} of ${cap} on the ${M.decorById[p.id].name}.</p>${pile.length && p.books.length < cap ? `<button class="button gold wide" data-fill>Fill with my books</button>` : ""}
      <h3 class="section">On the shelf</h3>${p.books.map((id) => row(id, "unshelf", "Take down")).join("") || `<p>Empty for now.</p>`}
      <h3 class="section">Waiting in the pile</h3>${pile.map((id) => row(id, "shelfbook", "Put up")).join("") || `<p>Every book you own is on a shelf. Buy more in Home › Decorate.</p>`}`;
  }

  // Selecting and moving pieces inside a room.
  const tools = {
    selected: null, moving: false,
    select(instance) {
      tools.selected = instance; tools.moving = false;
      ui.scene.selectPiece(instance); ui.scene.showGrid(!!instance);
      tools.render();
    },
    render() {
      const bar = $("piece-bar"), s = ui.state, p = s.house.placed.find((q) => q.instance === tools.selected);
      if (!p || ui.scene.place?.kind !== "room") { bar.hidden = true; return; }
      const item = M.decorById[p.id], others = M.houseRooms.filter((r) => r.id !== p.room && M.roomUnlocked(s, r.id));
      bar.hidden = false;
      bar.innerHTML = `<div class="piece-name">${decorIcon(p.id, 40)}<span><b>${item.name}</b><small>${tools.moving ? "Tap where it should go" : "Arrow keys nudge it"}</small></span></div>
        <div class="piece-actions"><button class="button ${tools.moving ? "gold" : ""}" data-tool="move" aria-pressed="${tools.moving}">Move</button><button class="button" data-tool="flip">Flip</button>
        ${M.shelfCapacity(p.id) ? `<button class="button" data-tool="books">Books ${p.books.length}/${M.shelfCapacity(p.id)}</button>` : ""}
        ${others.length ? `<button class="button" data-tool="room">To the ${roomName(others[0].id)}</button>` : ""}
        <button class="button" data-tool="store">Put away</button><button class="icon-button close" data-tool="done" aria-label="Done">×</button></div>`;
      bar.querySelectorAll("[data-tool]").forEach((b) => (b.onclick = () => tools.act(b.dataset.tool, others[0]?.id)));
    },
    act(action, otherRoom) {
      const s = ui.state, id = tools.selected;
      if (action === "move") { tools.moving = !tools.moving; tools.render(); return; }
      if (action === "flip" && M.flipDecor(s, id)) ui.scene.refreshRoom();
      if (action === "books") { shelfInstance = id; ui.openSheet("shelf"); }
      if (action === "room" && otherRoom) {
        if (M.sendToRoom(s, id, otherRoom)) { ui.notice(`Carried to the ${roomName(otherRoom)}.`); tools.select(null); ui.scene.refreshRoom(); }
        else ui.notice(`There’s no room for it in the ${roomName(otherRoom)}.`);
        return;
      }
      if (action === "store" && M.removeDecor(s, id)) { ui.notice("Put away. Place it again from Home › Decorate."); tools.select(null); ui.scene.refreshRoom(); ui.draw(); return; }
      if (action === "done") { tools.select(null); return; }
      tools.render(); ui.draw();
    },
    // A tap on the floor or a wall hook while a piece is chosen.
    tapCell(cell) {
      const s = ui.state, p = s.house.placed.find((q) => q.instance === tools.selected);
      if (!p) return;
      if (!tools.moving) { tools.select(null); return; }
      const fp = M.footprint(p.id), x = Math.max(0, Math.min(M.GRID.w - fp.w, cell.x - Math.floor((fp.w - 1) / 2))), z = fp.layer === "wall" ? 0 : Math.max(0, Math.min(M.GRID.d - fp.d, cell.z - Math.floor((fp.d - 1) / 2)));
      if (M.moveDecor(s, p.instance, x, z)) { ui.tone(600); tools.moving = false; ui.scene.refreshRoom(); tools.render(); }
      else { ui.scene.previewPiece(p.instance, x, z, false); ui.notice("It doesn’t fit there."); }
    },
    nudge(dx, dz) {
      const s = ui.state, p = s.house.placed.find((q) => q.instance === tools.selected);
      if (p && M.moveDecor(s, p.instance, p.x + dx, p.z + dz)) ui.scene.refreshRoom();
    },
  };

  return {
    tools,
    home: {
      eyebrow: "Our crooked cottage", title: () => (ui.scene.place?.kind === "room" ? "The " + roomName(here()) : "Home"),
      setTab(t) { tab = t; },
      body() { const s = ui.state; return tabs() + ({ rooms, decorate, house })[tab](s); },
      bind(body) {
        const s = ui.state, refresh = () => { ui.scene.refreshRoom(); ui.draw(); };
        body.querySelectorAll("[data-hometab]").forEach((b) => (b.onclick = () => { tab = b.dataset.hometab; ui.draw(); }));
        body.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => { s.house.activeRoom = b.dataset.go; tools.select(null); ui.enterRoom(b.dataset.go); ui.draw(); }));
        body.querySelectorAll("[data-style]").forEach((b) => (b.onclick = () => { if (M.setRoomStyle(s, b.dataset.style)) refresh(); }));
        body.querySelectorAll("[data-buystyle]").forEach((b) => (b.onclick = () => { if (M.buyRoomStyle(s, b.dataset.buystyle)) { ui.tone(820); ui.notice("A new look for the " + roomName(here()) + "."); refresh(); } }));
        body.querySelectorAll("[data-paper]").forEach((b) => (b.onclick = () => { const id = b.dataset.paper === "none" ? null : b.dataset.paper; if (M.applyWallpaper(s, here(), id)) { ui.tone(600); refresh(); } }));
        body.querySelectorAll("[data-cat]").forEach((b) => (b.onclick = () => { category = b.dataset.cat; ui.draw(); }));
        const input = body.querySelector("#decor-search");
        if (input) input.oninput = () => { search = input.value; ui.draw(); body.querySelector("#decor-search")?.focus(); };
        body.querySelectorAll("[data-decor]").forEach((b) => (b.onclick = () => {
          const id = b.dataset.decor;
          if (!M.buyDecor(s, id)) return;
          ui.tone(820); ui.notice(M.decorById[id].name + " is yours.");
          const item = M.decorById[id];
          if (!["books", "wallpaper"].includes(item.category)) { const inst = M.placeDecor(s, id, here()); if (inst) { ui.scene.refreshRoom(); tools.select(inst); } }
          else if (item.category === "books") { const shelfP = M.roomPieces(s, here()).find((p) => M.shelfCapacity(p.id) > p.books.length); if (shelfP && M.shelfBook(s, shelfP.instance, id)) ui.scene.refreshRoom(); }
          ui.draw();
        }));
        body.querySelectorAll("[data-place]").forEach((b) => (b.onclick = () => { const inst = M.placeDecor(s, b.dataset.place, here()); if (inst) { ui.tone(600); ui.scene.refreshRoom(); tools.select(inst); ui.draw(); } else ui.notice("No free spot for it in here."); }));
        body.querySelectorAll("[data-show]").forEach((b) => (b.onclick = () => { const p = s.house.placed.find((q) => q.instance === b.dataset.show); if (!p) return; s.house.activeRoom = p.room; ui.enterRoom(p.room); tools.select(p.instance); ui.draw(); }));
        body.querySelectorAll("[data-shelve]").forEach((b) => (b.onclick = () => { const shelfP = M.roomPieces(s, here()).find((p) => M.shelfCapacity(p.id) > p.books.length); if (shelfP && M.shelfBook(s, shelfP.instance, b.dataset.shelve)) { ui.tone(600); refresh(); } }));
        body.querySelectorAll("[data-read]").forEach((b) => (b.onclick = () => ui.read(b.dataset.read)));
        body.querySelectorAll("[data-house]").forEach((b) => (b.onclick = () => {
          if (!M.upgradeHouse(s)) return;
          const lvl = M.HOUSE_LEVELS[s.house.level];
          ui.tone(880); ui.notice(`The house is now the ${lvl.name}.`);
          ui.say(s.house.level % 2 ? "natalie" : "shane", ["", "A whole new room! I’ve already chosen where the bookcase goes.", "A kitchen. Finally, somewhere to keep the pumpkin pies.", "An attic full of rafters and moonlight. It’s perfectly haunted."][s.house.level]);
          refresh();
        }));
      },
    },
    shelf: {
      eyebrow: "Stories after dark", title: "The bookshelf",
      body() { return shelf(ui.state); },
      bind(body) {
        const s = ui.state, after = () => { ui.scene.refreshRoom(); tools.render(); ui.draw(); };
        body.querySelectorAll("[data-shelfbook]").forEach((b) => (b.onclick = () => { if (M.shelfBook(s, shelfInstance, b.dataset.shelfbook)) { ui.tone(600); after(); } }));
        body.querySelectorAll("[data-unshelf]").forEach((b) => (b.onclick = () => { if (M.unshelfBook(s, shelfInstance, b.dataset.unshelf)) after(); }));
        body.querySelectorAll("[data-fill]").forEach((b) => (b.onclick = () => { for (const id of s.house.owned) if (M.availableBook(s, id)) M.shelfBook(s, shelfInstance, id); ui.tone(600); after(); }));
        body.querySelectorAll("[data-read]").forEach((b) => (b.onclick = () => ui.read(b.dataset.read)));
      },
    },
  };
}
