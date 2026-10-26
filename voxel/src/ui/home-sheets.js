// The Home menu (rooms, the decor catalogue, the house itself), the bookshelf
// sheet, and the toolbar for moving pieces around a room.
import { setPieceColour, nextPieceColour } from "../rules/piece-colours.js";
import { canRide, isShelf, nextFinish, intoHostFrame } from "../rules/surfaces.js";
import { SMALL_PIECES } from "../content/placement.js";
import * as M from "../model.js";
import { money, segmented, decorIcon, spooky, plural, $ } from "./kit.js";

const roomName = (id) => M.houseRooms.find((r) => r.id === id).name;
// Into [a, b], the range a piece's corner may take: it reaches the walls by its real size, not its cells.
const clampTo = (v, a, b) => +Math.max(a, Math.min(b, v)).toFixed(6);
// A characteristic piece of each room's furniture, as its icon.
const ROOM_ICONS = { parlour: "f01", bedroom: "f06", kitchen: "d13", attic: "d06" };
const houseIcon = `<span class="thumb"><span class="ico i-home"></span></span>`;
const size = (L) => `${L.w} × ${L.d}`;
// The ways between rooms, in words: from a room, and as the way a new room is reached.
const WAYS = { stair: { up: "Stairs up to the", down: "Stairs down to the" }, ladder: { up: "A ladder up to the", down: "A ladder down to the" }, door: { through: "A doorway to the" } };
const REACHED = { stair: (from) => `up new stairs from the ${roomName(from)}`, door: (from) => `through a new doorway from the ${roomName(from)}`, ladder: (from) => `up a ladder from the ${roomName(from)}` };
const BUILDS = { stair: "Stairs up from the", door: "A doorway from the", ladder: "A ladder up from the" };

// What the next level adds, one line each, in the game's voice.
function additions(next) {
  const lines = [];
  for (const r of next.rooms) {
    const room = `${r.to.w} × ${r.to.d}, with room for ${r.to.capacity} pieces`, link = next.links.find((l) => l.to === r.id);
    if (r.opens) lines.push(link ? `${BUILDS[link.kind]} ${roomName(link.from)} ${link.kind === "door" ? "into" : "to"} a new ${r.name}, ${room}.` : `A new ${r.name}, ${room}.`);
    else if (r.from.w !== r.to.w || r.from.d !== r.to.d) lines.push(`The ${r.name} grows from ${r.from.w} × ${r.from.d} to ${room}.`);
    else lines.push(`Room for ${r.to.capacity} pieces in the ${r.name}.`);
  }
  return lines.sort((a, b) => b.includes(" a new ") - a.includes(" a new "));
}

// The cottage in cross-section at a level, storey on storey, to a fixed scale
// so it visibly grows. Whatever that level adds is drawn in gold.
const PLAN = { w: 28, h: 13.2, storey: 3.2, ground: 12.4 };
function plan(s, level, label) {
  const rooms = M.houseRooms.map((r) => M.roomLayout(s, r.id, level)).filter(Boolean), was = (id) => M.roomLayout(s, id, level - 1);
  const left = Math.min(...rooms.map((L) => L.offset)), right = Math.max(...rooms.map((L) => L.offset + L.w));
  const X = (x) => +(PLAN.w / 2 + x - (left + right) / 2).toFixed(2), top = (L) => PLAN.ground - (L.storey + 1) * PLAN.storey;
  const tone = (fresh) => (fresh ? `style="fill:rgba(231,180,110,.3);stroke:var(--gold-bright)"` : `style="fill:#2b1f33;stroke:var(--brass)"`);
  let walls = "", parts = "", roofs = "", words = "";
  for (const L of rooms) {
    const a = X(L.offset), b = X(L.offset + L.w), y = top(L), old = was(L.id);
    walls += `<rect x="${a}" y="${y}" width="${L.w}" height="${PLAN.storey}" ${tone(!old)} />`;
    // The new floor a room grows by, with its old wall dashed.
    if (old) for (const [u, v] of [[L.offset, old.offset], [old.offset + old.w, L.offset + L.w]]) if (v > u) {
      walls += `<rect x="${X(u)}" y="${y}" width="${v - u}" height="${PLAN.storey}" ${tone(true)} /><line x1="${X(u === L.offset ? v : u)}" x2="${X(u === L.offset ? v : u)}" y1="${y}" y2="${y + PLAN.storey}" style="stroke:var(--gold-bright)" stroke-dasharray=".3 .25" />`;
    }
    // Stairs, a ladder and a doorway, where the layout puts them.
    const newLink = (to) => !old || !M.roomLayout(s, to, level - 1);
    for (const st of L.stairs.filter((st) => st.up)) {
      const fresh = newLink(st.up), x1 = b - 0.25;
      if (st.kind === "stair") {
        let pts = `${x1 - 2.5},${y + PLAN.storey}`;
        for (let i = 0; i < 5; i++) pts += ` ${x1 - 2.5 + i * 0.5},${y + PLAN.storey - (i + 1) * 0.64} ${x1 - 2 + i * 0.5},${y + PLAN.storey - (i + 1) * 0.64}`;
        parts += `<polygon points="${pts} ${x1},${y + PLAN.storey}" style="fill:${fresh ? "rgba(255,216,148,.55)" : "#6a4428"};stroke:${fresh ? "var(--gold-bright)" : "var(--brass)"}" />`;
      } else {
        let rungs = "";
        for (let k = y + 0.35; k < y + PLAN.storey; k += 0.45) rungs += `<line x1="${x1 - 0.7}" x2="${x1 - 0.1}" y1="${k.toFixed(2)}" y2="${k.toFixed(2)}" />`;
        parts += `<g style="stroke:${fresh ? "var(--gold-bright)" : "var(--ink-soft)"}"><line x1="${x1 - 0.7}" x2="${x1 - 0.7}" y1="${y}" y2="${y + PLAN.storey}" /><line x1="${x1 - 0.1}" x2="${x1 - 0.1}" y1="${y}" y2="${y + PLAN.storey}" />${rungs}</g>`;
      }
    }
    for (const dr of L.doors.filter((dr) => dr.wall === "left")) {
      const fresh = newLink(dr.to), g = PLAN.ground;
      parts += `<path d="M${a - 0.55} ${g}V${g - 1.6}A.55 .55 0 0 1 ${a + 0.55} ${g - 1.6}V${g}Z" style="fill:${fresh ? "var(--gold-bright)" : "rgba(255,216,148,.6)"};stroke:none" />`;
    }
    // A gable over the top of the house; a lean-to over anything sticking out below.
    const above = rooms.find((u) => u.storey === L.storey + 1);
    if (!above) roofs += `<polygon points="${a - 0.6},${y} ${(a + b) / 2},${y - 2.2} ${b + 0.6},${y}" />`;
    else {
      const ua = X(above.offset), ub = X(above.offset + above.w);
      if (a < ua) roofs += `<polygon points="${a - 0.5},${y} ${Math.min(ua, b)},${y - 1.1} ${Math.min(ua, b)},${y}" />`;
      if (b > ub) roofs += `<polygon points="${b + 0.5},${y} ${Math.max(ub, a)},${y - 1.1} ${Math.max(ub, a)},${y}" />`;
    }
    const room = M.houseRooms.find((r) => r.id === L.id), mid = (a + b - (L.stairs.some((st) => st.up) ? 2.6 : 0)) / 2;
    words += `<text x="${mid}" y="${y + 1.45}">${room.name}</text><text x="${mid}" y="${y + 2.65}" style="fill:var(--ink-soft)">${size(L)}</text>`;
  }
  const sky = [[2.2, 1.6], [5.5, 3.4], [23.4, 1.2], [26, 4], [20.5, 3]].map(([x, y]) => `<rect x="${x}" y="${y}" width=".18" height=".18" />`).join("");
  return `<svg viewBox="0 0 ${PLAN.w} ${PLAN.h}" role="img" aria-label="${label}" style="display:block;width:100%;height:auto">
    <rect width="${PLAN.w}" height="${PLAN.h}" rx=".8" style="fill:rgba(0,0,0,.22)" /><g style="fill:#fff2c8">${sky}</g><path d="M1.6 .7a1 1 0 1 0 .9 1.5a.8 .8 0 1 1 -.9 -1.5z" style="fill:var(--gold-bright)" />
    <g stroke-width=".12">${walls}${parts}</g><g stroke-width=".12" style="fill:#4a2b2f;stroke:var(--brass)">${roofs}</g>
    <line x1="1" x2="${PLAN.w - 1}" y1="${PLAN.ground + 0.06}" y2="${PLAN.ground + 0.06}" stroke-width=".12" style="stroke:var(--moss)" />
    <g text-anchor="middle" font-size="1.1" style="fill:var(--ink);font-family:var(--body);font-weight:600">${words}</g></svg>`;
}

export function homeSheets(ui) {
  let tab = "rooms", category = "all", search = "";
  const tabs = () => segmented("hometab", "Home sections", [["rooms", "Rooms"], ["decorate", "Furnish"], ["house", "Expand"]], tab);
  const here = () => ui.state.house.activeRoom;

  function rooms(s) {
    const cards = M.houseRooms.map((r) => {
      const open = M.roomUnlocked(s, r.id), current = here() === r.id && ui.scene.place?.kind === "room";
      const need = M.HOUSE_LEVELS[r.level].name, pieces = M.roomPieces(s, r.id).length, L = M.roomLayout(s, r.id, Math.max(r.level, s.house.level));
      const link = M.HOUSE_LINKS.find((l) => l.to === r.id), ways = M.connections(s, r.id).map((c) => `${WAYS[c.kind][c.way]} ${roomName(c.to)}`).join(" · ");
      const about = open ? `<p class="small">${size(L)} floor · ${pieces}/${L.capacity} pieces</p>${ways ? `<p class="small">${ways}</p>` : ""}` : `<p class="small">${size(L)} floor, ${REACHED[link.kind](link.from)}</p>`;
      return `<article class="card${current ? " current" : ""}">${decorIcon(ROOM_ICONS[r.id])}<div><h3>${r.name}</h3><p>${open ? r.description : `Opens with the ${need}.`}</p>${about}</div>
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

  // What small pieces can stand on: anything with a flat top in the catalogue.
  const HOSTS = new Set(M.decorCatalog.filter((it) => !SMALL_PIECES.includes(it.id) && M.hostSurfaces({ id: it.id }).length).map((it) => it.id));
  function decorate(s) {
    const q = search.trim().toLowerCase();
    const items = M.decorCatalog.filter((it) => (category === "all" || it.category === category) && (!q || (it.name + " " + it.description).toLowerCase().includes(q)));
    const chips = `<div class="chips" role="group" aria-label="Catalogue sections">${M.decorCategories.map(([id, name]) => `<button class="chip" data-cat="${id}" aria-pressed="${category === id}">${name}</button>`).join("")}</div>`;
    const find = `<label class="search"><span class="sr">Search the catalogue</span><input id="decor-search" type="search" placeholder="Search ${M.decorCatalog.length} treasures" value="${search.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")}"></label>`;
    return `<div class="catalogue-heading"><span>${M.roomPieces(s, here()).length}/${M.roomCapacity(s, here())} pieces in the ${roomName(here()).toLowerCase()}</span><span>Buy once · keep forever</span></div>${find}${chips}` + items.map((it) => {
      const owned = s.house.owned.includes(it.id);
      const icon = it.category === "wallpaper" ? `<span class="thumb"><span class="paper" style="background-color:${it.color}"></span></span>` : decorIcon(it.id);
      const holds = it.capacity ? `Holds ${it.capacity} books` : isShelf(it.id) ? `In ${it.finishes.length} finishes · lamps and curios stand on it` : HOSTS.has(it.id) ? "Lamps and curios can stand on it" : canRide(it.id) ? "Can stand on a table or shelf" : "";
      return `<article class="card decor${owned ? " owned" : ""}">${icon}<div><h3>${it.name}</h3><p>${it.description}</p>${spooky(it.spooky)}${holds ? `<p class="small">${holds}</p>` : ""}</div>${statusButton(s, it)}</article>`;
    }).join("") || `<p>Nothing matches “${search}”.</p>`;
  }

  // The house now, then what the next level adds, drawn and in words.
  function house(s) {
    const h = s.house, level = M.HOUSE_LEVELS[h.level], next = M.nextLevel(s), short = s.coins < level.cost;
    const byRoom = M.houseRooms.map((r) => M.roomLayout(s, r.id)).filter(Boolean).map((L) => `${roomName(L.id)} ${size(L)}`).join(" · ");
    const grow = next
      ? `<h3 class="section">Grow into the ${next.name}</h3>${plan(s, next.level, `The ${next.name}, with what it adds in gold`)}
        <article class="card hero">${houseIcon}<div><h3>What it adds</h3>${additions(next).map((line) => `<p>${line}</p>`).join("")}</div></article>
        <button class="button gold wide" data-house ${short ? "disabled" : ""}>Grow the house · ${money(level.cost)}${short ? `<small>need ${money(level.cost - s.coins)}</small>` : ""}</button>`
      : `${plan(s, h.level, `The ${level.name}`)}<p>${level.text}</p>`;
    return `<article class="card hero">${houseIcon}<div><p class="eyebrow">Level ${h.level + 1} of 4</p><h3>${level.name}</h3><p>${byRoom}</p></div></article>
      <div class="stats"><div><b>${M.spookyScore(s)}</b><span>haunting points</span></div><div><b>${h.owned.length}/${M.decorCatalog.length}</b><span>treasures collected</span></div><div><b>${M.shelvedBooks(s)}</b><span>books on shelves</span></div></div>
      ${grow}
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

  // Only the selected piece gets tools. Secondary actions stay behind More.
  let more = false, lastTools = "", editHistory = [], dragPose = null, rotationBefore = null;
  const remember = p => { editHistory.push(structuredClone(p)); if (editHistory.length > 30) editHistory.shift(); };
  const tools = {
    selected: null, moving: false, snap: M.DECOR_STEP,
    select(instance) {
      tools.endDrag(true); tools.finishRotation();
      editHistory = [];
      tools.selected = instance; tools.moving = false; more = false; lastTools = "";
      ui.scene.selectPiece(instance); ui.scene.showGrid(false);
      document.body.classList.toggle("placing-piece", !!instance);
      if (instance) ui.closeSheet();
      tools.render();
    },
    render() {
      const bar = $("piece-bar"), s = ui.state, p = s.house.placed.find((q) => q.instance === tools.selected);
      if (!p || ui.scene.place?.kind !== "room") { bar.hidden = true; ui.scene.keepInView(null); return; }
      const item = M.decorById[p.id], wall = M.footprint(p.id).layer === "wall", host = p.on && s.house.placed.find((q) => q.instance === p.on);
      const tops = canRide(p.id) && M.roomPieces(s, p.room).some((q) => !q.on && q.instance !== p.instance && M.hostSurfaces(q).length);
      const others = M.houseRooms.filter((r) => r.id !== p.room && M.roomUnlocked(s, r.id));
      const icon = (action, symbol, label) => `<button class="icon-button tool-icon" data-tool="${action}" aria-label="${label}" title="${label}">${symbol}</button>`;
      const angle = Math.round(M.decorAngle(p.rotation));
      const rotation = wall ? `<div class="wall-tools" role="group" aria-label="Hang on a wall">${["left", "back", "right"].map((side) => `<button class="button wall-tool" data-wall="${side}" aria-pressed="${(p.wall ?? "back") === side}">${side[0].toUpperCase() + side.slice(1)}</button>`).join("")}</div>`
        : `<div class="rotation-tools" role="group" aria-label="Rotate furniture">${icon("rotate-left", "↶", "Rotate anticlockwise 15 degrees")}<button class="rotation-dial" role="slider" tabindex="0" aria-label="Furniture rotation" aria-valuemin="0" aria-valuemax="359" aria-valuenow="${angle}" style="--angle:${angle}deg"><span>${angle}°</span></button>${icon("rotate-right", "↷", "Rotate clockwise 15 degrees")}</div>`;
      const html = `<div class="piece-heading"><div class="piece-name">${decorIcon(p.id, 40)}<span><b>${item.name}</b><small data-placement-hint>${host ? `On the ${M.decorById[host.id].name.toLowerCase()} · drag to slide it` : tools.moving ? (canRide(p.id) ? "Tap a spot, or a table or shelf · arrows move 0.1" : "Tap a spot · arrows move 0.1") : wall ? "Choose a wall or move along it" : "Drag furniture · two fingers turn"}</small></span></div><button class="button gold tool-done" data-tool="done">Done</button></div>
        <div class="piece-actions">${["copper-range", "kitchen-hob", "kitchen-oven"].includes(p.id) && p.room === "kitchen" && s.kitchen?.purchased ? `<button class="button gold" data-tool="cook">Cook</button>` : ""}<button class="button tool-move ${tools.moving ? "gold" : ""}" data-tool="move" aria-pressed="${tools.moving}">Move</button>${rotation}${host ? `<button class="button" data-tool="ontop">Next top</button>` : tops ? `<button class="button" data-tool="ontop">On a table</button>` : ""}<button class="button" data-tool="undo" ${editHistory.length ? "" : "disabled"}>Undo</button><button class="icon-button tool-icon" data-tool="more" aria-label="More furniture actions" aria-expanded="${more}">•••</button></div>
        ${tools.moving ? `<div class="nudge-tools" role="group" aria-label="Fine-tune position">${icon("left", "←", "Move left 0.1")}${icon("back", "↑", "Move towards back wall 0.1")}${icon("front", "↓", "Move towards front 0.1")}${icon("right", "→", "Move right 0.1")}<button class="button snap-choice" data-tool="snap" aria-pressed="${tools.snap > 0}" aria-label="${tools.snap > 0 ? "Fine grid on. Switch to free placement" : "Free placement on. Switch to fine grid"}">${tools.snap > 0 ? "Snap 0.1" : "Free"}</button></div>` : ""}
        ${more ? `<div class="piece-more" role="group" aria-label="More furniture actions">${host ? `<button class="button" data-tool="setdown">Set down on the floor</button>` : ""}${isShelf(p.id) ? `<button class="button" data-tool="finish">Finish · ${item.finishes.find((f) => f.id === p.finish)?.name ?? item.finishes[0].name}</button>` : ""}<button class="button" data-tool="colour">Colour</button><button class="button" data-tool="flip">Mirror</button>${M.shelfCapacity(p.id) ? `<button class="button" data-tool="books">Books · ${p.books.length}/${M.shelfCapacity(p.id)}</button>` : ""}${others.map((r) => `<button class="button" data-room="${r.id}">To ${r.name.toLowerCase()}</button>`).join("")}<button class="button" data-tool="store">Put in storage</button></div>` : ""}`;
      bar.hidden = false; ui.scene.keepInView(p.instance, bar);
      if (html === lastTools) return;
      bar.innerHTML = html; lastTools = html;
      bar.querySelectorAll("[data-tool]").forEach((b) => b.onclick = () => tools.act(b.dataset.tool));
      bar.querySelectorAll("[data-room]").forEach((b) => b.onclick = () => tools.act("room", b.dataset.room));
      bar.querySelectorAll("[data-wall]").forEach((b) => b.onclick = () => {
        const before = structuredClone(p);
        if (M.setDecorWall(s, p.instance, b.dataset.wall)) { remember(before); ui.scene.refreshRoom(); ui.save(); tools.render(); }
        else ui.notice("No clear space on that wall. Try moving another piece.");
      });
      const dial = bar.querySelector(".rotation-dial");
      if (dial) {
        let turning = null;
        const at = (e) => { const r = dial.getBoundingClientRect(); return Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI; };
        dial.onpointerdown = (e) => { e.preventDefault(); dial.setPointerCapture(e.pointerId); turning = at(e); };
        dial.onpointermove = (e) => {
          if (turning === null) return;
          const next = at(e), delta = ((next - turning + 540) % 360) - 180; turning = next;
          const ok = tools.rotate(delta, false); dial.classList.toggle("blocked", !ok);
          const value = Math.round(M.decorAngle(p.rotation)); dial.style.setProperty("--angle", value + "deg"); dial.setAttribute("aria-valuenow", value); dial.querySelector("span").textContent = value + "°";
        };
        dial.onpointerup = () => { turning = null; tools.finishRotation(); };
        dial.onpointercancel = () => { turning = null; tools.finishRotation(true); };
        dial.onkeydown = (e) => { if (["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp", "Home"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); tools.rotate(e.key === "Home" ? -M.decorAngle(p.rotation) : ["ArrowLeft", "ArrowDown"].includes(e.key) ? -15 : 15); bar.querySelector(".rotation-dial")?.focus(); } };
      }
    },
    rotate(delta, redraw = true) {
      const p = ui.state.house.placed.find((q) => q.instance === tools.selected);
      const before = p && structuredClone(p);
      if (!p || !M.rotateDecor(ui.state, p.instance, M.decorAngle(p.rotation) + delta)) return false;
      if (redraw) remember(before); else rotationBefore ??= before;
      ui.scene.rotatePiece(p.instance);
      if (redraw) { tools.render(); ui.save(); }
      return true;
    },
    finishRotation(cancelled = false) {
      if (!rotationBefore) return;
      const before = rotationBefore; rotationBefore = null;
      const p = ui.state.house.placed.find(q => q.instance === before.instance);
      if (p) { if (cancelled) { Object.assign(p, before); ui.scene.rotatePiece(p.instance); } else remember(before); }
      lastTools = ""; tools.render(); ui.save();
    },
    beginDrag(point) {
      const p = ui.state.house.placed.find(q => q.instance === tools.selected);
      if (!p || ui.state.paused || M.footprint(p.id).layer === "wall") return false;
      tools.finishRotation();
      const fp = M.pieceFootprint(p), q = p.on && ui.scene.hostPoint(p.on, point);
      if (p.on && !q) return false;
      // On a top the piece slides in its table's frame; on the floor, in the room's.
      dragPose = { before: structuredClone(p), pose: { ...p }, offset: q ? { x: q.x - p.x, z: q.z - p.z } : { x: point.x - p.x - fp.w / 2, z: point.z - p.z - fp.d / 2 }, valid: true };
      document.body.classList.add("dragging-piece"); return true;
    },
    dragTo(point) {
      if (!dragPose) return false;
      const p = dragPose.before, fp = M.pieceFootprint(p), q = p.on && ui.scene.hostPoint(p.on, point);
      const range = !q && M.placementRange(ui.state, p);
      const x = q ? M.snapDecorPosition(q.x - dragPose.offset.x, tools.snap) : clampTo(M.snapDecorPosition(point.x - dragPose.offset.x - fp.w / 2, tools.snap), range.x0, range.x1);
      const z = q ? M.snapDecorPosition(q.z - dragPose.offset.z, tools.snap) : clampTo(M.snapDecorPosition(point.z - dragPose.offset.z - fp.d / 2, tools.snap), range.z0, range.z1);
      dragPose.pose = { ...p, x, z };
      dragPose.valid = M.fits(ui.state, p.room, p.id, x, z, p.instance, p);
      ui.scene.movePiece(p.instance, dragPose.pose, dragPose.valid);
      const hint = $("piece-bar").querySelector("[data-placement-hint]"); if (hint) hint.textContent = dragPose.valid ? "Release to place" : p.on ? "Keep it on the top, clear of the rest" : "Space occupied";
      return dragPose.valid;
    },
    endDrag(cancelled = false) {
      if (!dragPose) return false;
      const drag = dragPose; dragPose = null;
      const p = ui.state.house.placed.find(q => q.instance === drag.before.instance), changed = p && (p.x !== drag.pose.x || p.z !== drag.pose.z);
      const placed = !cancelled && drag.valid && changed && M.moveDecor(ui.state, p.instance, drag.pose.x, drag.pose.z);
      if (placed) { remember(drag.before); ui.save(); }
      ui.scene.movePiece(drag.before.instance);
      document.body.classList.remove("dragging-piece"); lastTools = ""; tools.render(); return !!placed;
    },
    act(action, otherRoom) {
      const s = ui.state, id = tools.selected;
      if (action === "undo") {
        const previous = editHistory.pop(), p = s.house.placed.find(p => p.instance === id);
        const tinted = p?.tint;
        if (previous && p && M.restorePose(s, id, previous)) { if(tinted||previous.tint)p.tint=previous.tint??"original"; ui.scene.refreshRoom(); ui.save(); }
        tools.render(); return;
      }
      if (action === "cook" && ["copper-range", "kitchen-hob", "kitchen-oven"].includes(s.house.placed.find(q => q.instance === id)?.id) && M.homeCookingAvailable(s)) { tools.select(null); ui.openCookingSheet("recipes", "home"); return; }
      if (action === "move") { tools.moving = !tools.moving; more = false; ui.scene.showGrid(tools.moving); tools.render(); return; }
      if (action === "snap") { tools.snap = tools.snap > 0 ? 0 : M.DECOR_STEP; tools.render(); return; }
      if (action === "more") { more = !more; tools.render(); return; }
      const steps = { left: [-1, 0], right: [1, 0], back: [0, -1], front: [0, 1] };
      if (steps[action]) return tools.nudge(...steps[action]);
      if (action.startsWith("rotate-")) { if (!tools.rotate(action === "rotate-left" ? -15 : 15)) ui.notice("Leave a little more space to turn this piece."); return; }
      if (action === "ontop" || action === "setdown") {
        const p = s.house.placed.find(q => q.instance === id), before = p && structuredClone(p);
        const done = p && (action === "ontop" ? M.putOnTop(s, id) : M.setDown(s, id));
        if (done) { remember(before); ui.tone(600); ui.scene.refreshRoom(); ui.save(); lastTools = ""; tools.render(); }
        else ui.notice(action === "ontop" ? "No table or shelf in here has room for it." : "No room on the floor for it just now.");
        return;
      }
      if (action === "finish") { const p = s.house.placed.find(q => q.instance === id); if (p && !s.paused) { remember(p); p.finish = nextFinish(p.id, p.finish); ui.scene.refreshRoom(); ui.save(); lastTools = ""; } }
      if (action === "colour") { const p=s.house.placed.find(p=>p.instance===id); if(p&&!s.paused){remember(p);setPieceColour(s,"home",id,nextPieceColour(p.tint));ui.scene.refreshRoom();ui.save();} }
      if (action === "flip") { const p = s.house.placed.find(p => p.instance === id); if (p && !s.paused) { remember(p); M.flipDecor(s, id); ui.scene.refreshRoom(); ui.save(); } }
      if (action === "books") { shelfInstance = id; tools.select(null); ui.openSheet("shelf"); }
      if (action === "room" && otherRoom) {
        if (M.sendToRoom(s, id, otherRoom)) { ui.notice(`Carried to the ${roomName(otherRoom).toLowerCase()}.`); tools.select(null); ui.scene.refreshRoom(); ui.save(); }
        else ui.notice(`There’s no room for it in the ${roomName(otherRoom).toLowerCase()}.`);
        return;
      }
      if (action === "store" && M.removeDecor(s, id)) { ui.notice("In storage. Place it again from Decorate."); tools.select(null); ui.scene.refreshRoom(); ui.save(); return; }
      if (action === "done") { tools.select(null); ui.save(); return; }
      tools.render(); ui.draw();
    },
    tapCell(cell) {
      const s = ui.state, p = s.house.placed.find((q) => q.instance === tools.selected);
      if (!p) return;
      if (!tools.moving) { tools.select(null); return; }
      const room = M.roomLayout(s, p.room) ?? M.GRID, fp = M.pieceFootprint(p);
      if (p.on) {
        if (cell.wall) return;
        const pose = structuredClone(p);
        delete pose.on; delete pose.top;
        const range = M.placementRange(s, pose);
        Object.assign(pose, { x: clampTo(M.snapDecorPosition(cell.x - fp.w / 2, tools.snap), range.x0, range.x1), z: clampTo(M.snapDecorPosition(cell.z - fp.d / 2, tools.snap), range.z0, range.z1) });
        const before = structuredClone(p);
        if (!s.paused && M.restorePose(s, p.instance, pose)) { remember(before); ui.tone(600); tools.moving = false; ui.scene.showGrid(false); ui.scene.refreshRoom(); tools.render(); ui.save(); }
        else ui.notice("Keep this spot clear for furniture, stairs and doors.");
        return;
      }
      const wall = cell.wall ?? p.wall ?? "back";
      const limit = fp.layer === "wall" && wall !== "back" ? room.d : room.w;
      const range = fp.layer === "wall" ? null : M.placementRange(s, p);
      const x = range ? clampTo(M.snapDecorPosition(cell.x - fp.w / 2, tools.snap), range.x0, range.x1) : Math.max(0, Math.min(limit - fp.w, M.snapDecorPosition(cell.x - fp.w / 2, tools.snap))), z = range ? clampTo(M.snapDecorPosition(cell.z - fp.d / 2, tools.snap), range.z0, range.z1) : 0;
      if (!s.paused && M.fits(s, p.room, p.id, x, z, p.instance, { wall })) {
        remember(p);
        if (fp.layer === "wall") p.wall = wall;
        M.moveDecor(s, p.instance, x, z); ui.tone(600); tools.moving = false; ui.scene.showGrid(false); ui.scene.movePiece(p.instance); tools.render(); ui.save();
      }
      else { ui.scene.previewPiece(p.instance, x, z, false); ui.notice("Keep this spot clear for furniture, stairs and doors."); }
    },
    // While moving a small piece, a tap on a table or shelf puts it there, as near the tap as there's room.
    tapPiece(instance, point) {
      const s = ui.state, p = s.house.placed.find((q) => q.instance === tools.selected);
      if (!tools.moving || !p || instance === p.instance || !canRide(p.id) || s.paused) return false;
      const host = s.house.placed.find((q) => q.instance === instance);
      if (!host || host.on || !M.hostSurfaces(host).length) return false;
      const before = structuredClone(p);
      if (M.putOnTop(s, p.instance, instance, ui.scene.hostPoint(instance, point))) { remember(before); ui.tone(600); tools.moving = false; ui.scene.showGrid(false); ui.scene.refreshRoom(); tools.render(); ui.save(); }
      else ui.notice(`No room on the ${M.decorById[host.id].name.toLowerCase()} for it.`);
      return true;
    },
    nudge(dx, dz) {
      const s = ui.state, p = s.house.placed.find((q) => q.instance === tools.selected);
      const before = p && structuredClone(p);
      // On a top the arrows still point across the room, whichever way the table faces.
      if (p?.on) {
        const host = s.house.placed.find((q) => q.instance === p.on), v = host && intoHostFrame(dx * M.DECOR_STEP, dz * M.DECOR_STEP, M.hostYaw(host));
        if (v && M.moveDecor(s, p.instance, M.snapDecorPosition(p.x + v.x, 0), M.snapDecorPosition(p.z + v.z, 0))) { remember(before); ui.scene.movePiece(p.instance); tools.render(); ui.save(); }
        return;
      }
      if (p && M.moveDecor(s, p.instance, M.snapDecorPosition(p.x + dx * M.DECOR_STEP, 0), M.footprint(p.id).layer === "wall" ? 0 : M.snapDecorPosition(p.z + dz * M.DECOR_STEP, 0))) { remember(before); ui.scene.movePiece(p.instance); tools.render(); ui.save(); }
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
        body.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => { s.house.activeRoom = b.dataset.go; tools.select(null); ui.enterRoom(b.dataset.go); ui.closeSheet(); }));
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
          const grown = M.upgradeHouse(s);
          if (!grown) return;
          const lvl = M.HOUSE_LEVELS[s.house.level], names = (list) => list.map((p) => M.decorById[p.id].name).join(", ");
          ui.tone(880);
          ui.notice(`The house is now the ${lvl.name}.` + (grown.moved.length ? ` Moved out of the way: ${names(grown.moved)}.` : "") + (grown.stored.length ? ` Put away to make room: ${names(grown.stored)}.` : ""));
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
