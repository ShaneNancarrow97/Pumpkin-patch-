import { findRoom, houseRooms } from "../content/rooms.mjs";
import { decorAtlases, decorById, decorCatalog, decorCategories, houseExteriorRects } from "../content/catalog.mjs";
import { bookSpineAtlas } from "../content/book-spine-meta.mjs";
import { shelfLayouts } from "../content/shelf-layouts.mjs";
import { attachmentPoint, cameraDelta, scenePercent, spriteSize } from "../scene/room-geometry.js";
import { availableBook, houseLevels, roomCapacity, roomPieces, roomUnlocked, selectedRoomStyle, spookyScore } from "../core/house-model.mjs";
import { asset } from "../platform/assets.js";
import { houseMapStages } from "../content/house-map-meta.mjs";
import { itemFrames } from "../content/item-frame-meta.mjs";

function initHouseUi(app2) {
  const { buyDecor: buyDecor2, upgradeHouse: upgradeHouse2, placeDecor: placeDecor2, moveDecor: moveDecor2, removeDecor: removeDecor2, shelfBook: shelfBook2, unshelfBook: unshelfBook2 } = app2.actions;
  const { $, save, tone, toast, closeModal, renderUI, say, fitMap, viewMap, scrollToSection, scrollAcross, setPlotUpgradeMode } = app2;
  let homeSelection = null, homeCategory = "all", homeFilter = "all", homeQuery = "", homeMode = false, homePanel = "room", homeSort = "featured", roomZoom = false;
  const homeScroll = { room: 0, shop: 0 };
  const houseRoom = $("house-room"), houseViewport = $("house-viewport");
  function escapeHome(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function artStyle(item) {
    if (item.category === "wallpaper")
      return 'background-image:url("' + asset("assets/house/" + item.id + ".svg") + '");background-size:120px 120px;--ar:1;';
    const a = decorAtlases[item.atlas], r = a.rects[item.slot], frame = itemFrames[item.id];
    return 'background-image:url("' + asset(frame.path) + '");background-size:100% 100%;background-position:0 0;--ar:' + r[2] / r[3] + ";";
  }
  function spriteArt(item, extra = "") {
    return '<span class="art-sprite ' + extra + '" style="' + escapeHome(artStyle(item)) + '" role="img" aria-label="' + escapeHome(item.name) + '"></span>';
  }
  function homeNotice(text) {
    toast(text);
    tone(530);
  }
  function setHomeMode(on) {
    if ($("modal").open)
      closeModal();
    if (on && app2.plotUpgradeMode)
      setPlotUpgradeMode(false);
    homeMode = on;
    document.body.classList.toggle("at-home", on);
    $("house-section").hidden = !on;
    $("farm-layout").hidden = on;
    $("house-nav").classList.toggle("active", on);
    $("patch-nav").classList.toggle("active", !on);
    $("house-nav").setAttribute("aria-pressed", String(on));
    $("patch-nav").setAttribute("aria-pressed", String(!on));
    if (on) {
      renderHome();
      setHomePanel("room");
      requestAnimationFrame(fitHouseRoom);
      say(0, "A reading corner, candlelight, and just enough cobwebs. Let’s make this house ours.");
    } else {
      requestAnimationFrame(() => {
        fitMap();
        viewMap(false, false);
      });
      scrollToSection($("farm-layout"));
    }
  }
  $("house-nav").onclick = () => setHomeMode(true);
  $("enter-house").onclick = () => setHomeMode(true);
  $("patch-nav").onclick = () => setHomeMode(false);
  $("back-to-patch").onclick = () => setHomeMode(false);
  houseRoom.style.backgroundImage = 'url("' + asset("assets/house/room.webp") + '")';
  function refreshHomeBalance() {
    if (!homeMode)
      return;
    refreshStoreAffordability();
    $("home-coins").textContent = "£" + Math.floor(app2.state.coins).toLocaleString("en-GB");
    const l = houseLevels[app2.state.house.level];
    $("house-upgrade").disabled = app2.state.paused || app2.state.house.level === 3 || app2.state.coins < l.cost;
    for (const b of document.querySelectorAll("[data-buy-decor]")) {
      const item = decorById[b.dataset.buyDecor];
      b.disabled = app2.state.paused || app2.state.house.owned.includes(item.id) || app2.state.coins < item.price;
    }
    for (const b of document.querySelectorAll("[data-place-decor],[data-move],#flip-piece,#pack-piece,#remove-wallpaper,#piece-room,#transfer-piece"))
      b.disabled = app2.state.paused;
    const transfer = $("transfer-piece");
    if (transfer) transfer.disabled = app2.state.paused || !$("piece-room").value;
    const selected = app2.state.house.placed.find((p) => p.instance === homeSelection);
    const fill = $("fill-bookshelf");
    if (fill && selected)
      fill.disabled = app2.state.paused || selected.books.length >= decorById[selected.id].capacity || !app2.state.house.owned.some((id) => availableBook(app2.state, id));
    for (const b of document.querySelectorAll("[data-shelf-book]"))
      b.disabled = app2.state.paused || !selected?.books.includes(b.dataset.shelfBook) && !availableBook(app2.state, b.dataset.shelfBook);
  }
  function resetHomeUI() {
    homeSelection = null;
    homeCategory = "all";
    homeFilter = "all";
    homeQuery = "";
    homeSort = "featured";
    homeScroll.room = homeScroll.shop = 0;
    $("decor-search").value = "";
    $("decor-sort").value = "featured";
    syncStoreFilters();
    if (homeMode) {
      renderHome();
      setHomePanel("room");
    }
  }
  ;
  function renderHome() {
    refreshMapHouse();
    const h = app2.state.house, l = houseLevels[h.level], interior = selectedRoomStyle(app2.state), preview = Math.min(3, h.level + 1);
    const active = findRoom(h.activeRoom), pieces = roomPieces(app2.state);
    if (homeSelection && !pieces.some((p) => p.instance === homeSelection)) homeSelection = null;
    $("rooms-nav").textContent = active.name + " · Rooms & styles";
    houseRoom.dataset.roomId = active.id;
    houseRoom.style.backgroundImage = 'url("' + asset(interior.path) + '")';
    houseRoom.dataset.houseLevel = h.level;
    $("room-style").textContent = interior.name + " interior";
    $("house-title").textContent = l.name;
    $("house-level").textContent = h.level === 3 ? "FULLY UPGRADED" : "NEXT: STAGE " + (preview + 1) + " OF 4";
    $("home-owned").textContent = h.owned.length + " / 50 treasures";
    $("house-capacity").textContent = pieces.length + " / " + roomCapacity(app2.state, active.id) + " pieces placed";
    $("house-spooky").textContent = spookyScore(app2.state) + " haunting points";
    $("house-upgrade-name").textContent = h.level === 3 ? "Our forever haunted home" : "Upgrade to " + houseLevels[Math.min(3, h.level + 1)].name;
    $("house-upgrade-description").textContent = l.description;
    $("house-upgrade").textContent = h.level === 3 ? "Fully upgraded" : "Upgrade house · £" + l.cost;
    const exteriorRect = houseExteriorRects[preview];
    $("home-level-art").setAttribute("aria-label", "Preview of " + houseLevels[preview].name);
    $("home-level-art").style.backgroundSize = 1536 / exteriorRect[2] * 100 + "% " + 1024 / exteriorRect[3] * 100 + "%";
    $("home-level-art").style.backgroundPosition = exteriorRect[0] / (1536 - exteriorRect[2]) * 100 + "% " + exteriorRect[1] / (1024 - exteriorRect[3]) * 100 + "%";
    $("room-finish-label").textContent = active.id === "parlour" ? "Wallpaper" : "Room style";
    $("wallpaper-layer").style.backgroundImage = active.id === "parlour" && h.wallpaper ? 'url("' + asset("assets/house/" + h.wallpaper + ".svg") + '")' : "none";
    $("wallpaper-label").textContent = active.id === "parlour" && h.wallpaper ? decorById[h.wallpaper].name : interior.name;
    $("remove-wallpaper").hidden = active.id !== "parlour" || !h.wallpaper;
    renderRoom();
    renderInspector();
    renderStore();
    refreshHomeBalance();
  }
  function renderRoom() {
    const layer = $("room-pieces");
    layer.replaceChildren();
    for (const p of [...roomPieces(app2.state)].sort((a, b) => {
      const ar = decorById[a.id].slot >= 14 && decorById[a.id].atlas === "furniture", br = decorById[b.id].slot >= 14 && decorById[b.id].atlas === "furniture";
      return ar !== br ? ar ? -1 : 1 : a.y - b.y;
    })) {
      const item = decorById[p.id], el = document.createElement("button");
      el.className = "room-piece" + (homeSelection === p.instance ? " selected" : "") + (item.category === "lights" ? " luminous" : "");
      el.dataset.instance = p.instance;
      el.dataset.scene = p.sceneId;
      el.dataset.flipped = String(p.flip);
      const position = scenePercent(p);
      el.style.cssText = "left:" + position.x + "%;top:" + position.y + "%;width:" + item.width + "%;" + artStyle(item) + "transform:translate(-50%,-100%)" + (p.flip ? " scaleX(-1)" : "") + (item.rug ? " scaleY(.45)" : "") + ";z-index:" + (item.rug ? 0 : p.y) + ";";
      el.setAttribute("aria-label", "Select " + item.name + (item.capacity ? ", " + p.books.length + " of " + item.capacity + " books" : ""));
      el.title = item.name;
      el.innerHTML = '<span class="piece-name">' + escapeHome(item.name) + "</span>";
      if (item.capacity) {
        renderShelfBooks(el, p, item);
      }
      let suppressClick = false;
      const toggleSelection = () => {
        if (homeSelection === p.instance) clearSelection();
        else selectPiece(p.instance);
      };
      el.addEventListener("click", (e) => {
        if (suppressClick && e.detail !== 0) {
          suppressClick = false;
          e.preventDefault();
          return;
        }
        toggleSelection();
      });
      el.addEventListener("keydown", (e) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) || app2.state.paused)
          return;
        e.preventDefault();
        selectPiece(p.instance, false);
        moveDecor2(app2.state, p.instance, p.x + (e.key === "ArrowLeft" ? -15 : e.key === "ArrowRight" ? 15 : 0), p.y + (e.key === "ArrowUp" ? -15 : e.key === "ArrowDown" ? 15 : 0));
        const pos = scenePercent(p);
        el.style.left = pos.x + "%";
        el.style.top = pos.y + "%";
        el.style.zIndex = item.rug ? 0 : p.y;
        save();
      });
      let drag = null;
      el.addEventListener("pointerdown", (e) => {
        if (app2.state.paused || e.button > 0)
          return;
        drag = { x: e.clientX, y: e.clientY, px: p.x, py: p.y, moved: false };
        el.setPointerCapture(e.pointerId);
        el.classList.add("dragging");
      });
      el.addEventListener("pointermove", (e) => {
        if (!drag)
          return;
        const r = houseRoom.getBoundingClientRect(), delta = cameraDelta(e.clientX - drag.x, e.clientY - drag.y, r), dx = delta.x, dy = delta.y;
        if (Math.abs(dx) + Math.abs(dy) > 8)
          drag.moved = true;
        if (drag.moved && moveDecor2(app2.state, p.instance, drag.px + dx, drag.py + dy)) {
          const pos = scenePercent(p);
          el.style.left = pos.x + "%";
          el.style.top = pos.y + "%";
          el.style.zIndex = item.rug ? 0 : p.y;
        }
      });
      const end = (event, cancelled = false) => {
        if (!drag)
          return;
        const previous = drag, moved = drag.moved;
        drag = null;
        el.classList.remove("dragging");
        if (!moved && !cancelled && event?.type === "pointerup") {
          suppressClick = true;
          toggleSelection();
        }
        if (moved) {
          suppressClick = true;
          if (cancelled) moveDecor2(app2.state, p.instance, previous.px, previous.py);
          homeSelection = null;
          save();
          renderRoom();
          renderInspector();
          houseViewport.focus?.({ preventScroll: true });
        }
      };
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", (event) => end(event, true));
      el.addEventListener("lostpointercapture", (event) => end(event, true));
      layer.append(el);
    }
  }
  function renderShelfBooks(el, p, item) {
    const layout2 = shelfLayouts[item.id], layer = document.createElement("span");
    const size = spriteSize({ ...item, rect: decorAtlases[item.atlas].rects[item.slot] });
    layer.className = "shelf-books";
    layer.setAttribute("aria-hidden", "true");
    for (const slot of layout2.sockets) {
      const id = p.bookSockets[slot.id];
      if (!id) continue;
      const b = document.createElement("span"), a = bookSpineAtlas, r = a.rects[decorById[id].slot];
      const contact = attachmentPoint(p, size, slot, false);
      const local = { x: (contact.x - p.x + size.width / 2) / size.width, y: (contact.y - p.y + size.height) / size.height };
      b.className = "shelf-book";
      b.dataset.socket = slot.id;
      b.dataset.book = id;
      b.style.cssText = `left:${local.x * 100}%;top:${local.y * 100}%;width:${slot.width * 100}%;height:${slot.height * 100}%;background-image:url("${asset(a.path)}");background-size:${a.width / r[2] * 100}% ${a.height / r[3] * 100}%;background-position:${r[0] / (a.width - r[2]) * 100}% ${r[1] / (a.height - r[3]) * 100}%;transform:translateY(-100%)${p.flip ? " scaleX(-1)" : ""};`;
      b.title = decorById[id].name;
      layer.append(b);
    }
    for (const row of layout2.lips) {
      const lip = document.createElement("span");
      lip.className = "shelf-lip";
      const polygon = `${row.left * 100}% ${row.y * 100}%,${row.right * 100}% ${row.endY * 100}%,${row.right * 100}% ${(row.endY + row.thickness) * 100}%,${row.left * 100}% ${(row.y + row.thickness) * 100}%`;
      lip.style.cssText = artStyle(item) + `clip-path:polygon(${polygon});`;
      layer.append(lip);
    }
    el.append(layer);
  }
  function selectPiece(instance, redraw = true) {
    homeSelection = instance;
    for (const b of document.querySelectorAll(".room-piece"))
      b.classList.toggle("selected", b.dataset.instance === instance);
    if (redraw)
      renderInspector();
  }
  function clearSelection() {
    selectPiece(null);
    houseViewport.focus?.({ preventScroll: true });
  }
  houseRoom.addEventListener("click", (event) => {
    if (event.target === houseRoom || event.target === $("room-pieces") || event.target === $("wallpaper-layer")) clearSelection();
  });
  houseViewport.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && homeSelection) {
      event.preventDefault();
      event.stopPropagation?.();
      clearSelection();
    }
  });
  function changeRoom(id) {
    if (!app2.actions.selectHouseRoom(id)) return false;
    homeSelection = null;
    renderHome();
    setHomePanel("room");
    houseViewport.scrollLeft = 0;
    save();
    return true;
  }
  function renderInspector() {
    const panel = $("piece-inspector"), p = app2.state.house.placed.find((p2) => p2.instance === homeSelection);
    if (!p) {
      panel.innerHTML = '<div class="inspector-empty"><span class="tiny-badge">MAKE YOURSELF AT HOME</span><h3>A little spooky.<br>A lot of ours.</h3><p>Tap a piece to select it. Drag it into place, or use the move buttons. Tap a bookshelf to fill it with your books.</p><div class="home-portraits"><span class="portrait natalie"></span><span class="portrait shane"></span></div></div>';
      return;
    }
    const item = decorById[p.id];
    panel.innerHTML = '<button class="secondary" id="done-editing">✓ Done</button><div class="inspector-art">' + spriteArt(item) + "</div><h3>" + escapeHome(item.name) + "</h3><p>" + escapeHome(item.description) + '</p><div class="move-pad" aria-label="Move selected piece"><button data-move="up" aria-label="Move up">↑</button><button data-move="left" aria-label="Move left">←</button><button data-move="down" aria-label="Move down">↓</button><button data-move="right" aria-label="Move right">→</button></div><div class="piece-actions"><button class="secondary" id="flip-piece">Flip</button><button class="secondary" id="pack-piece">Put away</button></div>' + (item.capacity ? '<div class="shelf-manage"><h4>' + p.books.length + " / " + item.capacity + ' books on the shelf</h4><button class="primary" id="fill-bookshelf">Fill with my books</button><div id="shelf-collection"></div></div>' : "");
    $("done-editing").onclick = clearSelection;
    const destinations = houseRooms.filter((room) => room.id !== p.sceneId && roomUnlocked(app2.state, room.id));
    if (destinations.length) {
      const row = document.createElement("div");
      row.className = "piece-transfer";
      row.innerHTML = '<label for="piece-room">Move to another room</label><select id="piece-room"><option value="">Choose a room…</option>' + destinations.map((room) => '<option value="' + room.id + '"' + (roomPieces(app2.state, room.id).length >= roomCapacity(app2.state, room.id) ? " disabled" : "") + ">" + room.name + " · " + roomPieces(app2.state, room.id).length + "/" + roomCapacity(app2.state, room.id) + "</option>").join("") + '</select><button class="secondary" id="transfer-piece" disabled>Move piece</button>';
      panel.append(row);
      $("piece-room").onchange = () => {
        $("transfer-piece").disabled = app2.state.paused || !$("piece-room").value;
      };
      $("transfer-piece").onclick = () => {
        const target = $("piece-room").value;
        if (app2.actions.transferDecor(p.instance, target)) {
          changeRoom(target);
          homeNotice("Moved to " + findRoom(target).name + ". Books stay on their shelf.");
        }
      };
    }
    for (const b of panel.querySelectorAll("[data-move]"))
      b.onclick = () => {
        const dir = b.dataset.move;
        if (moveDecor2(app2.state, p.instance, p.x + (dir === "left" ? -25 : dir === "right" ? 25 : 0), p.y + (dir === "up" ? -20 : dir === "down" ? 20 : 0))) {
          renderRoom();
          save();
        }
      };
    $("flip-piece").onclick = () => {
      if (app2.state.paused)
        return;
      if (app2.actions.flipDecor(p.instance)) {
        renderRoom();
        save();
      }
    };
    $("pack-piece").onclick = () => {
      if (removeDecor2(app2.state, p.instance)) {
        homeSelection = null;
        save();
        renderHome();
        homeNotice("Packed away. You can place it again from your collection.");
      }
    };
    if (item.capacity) {
      $("fill-bookshelf").disabled = app2.state.paused || p.books.length >= item.capacity || !app2.state.house.owned.some((id) => availableBook(app2.state, id));
      $("fill-bookshelf").onclick = () => {
        let n = 0;
        for (const id of app2.state.house.owned)
          if (shelfBook2(app2.state, p.instance, id))
            n++;
        if (n) {
          save();
          renderHome();
          homeNotice(n + " books found a home.");
        }
      };
      const books2 = app2.state.house.owned.filter((id) => decorById[id].category === "books");
      $("shelf-collection").innerHTML = books2.length ? books2.map((id) => {
        const on = p.books.includes(id), available = availableBook(app2.state, id);
        return '<div class="shelf-book-row"><button class="book-choice" data-shelf-book="' + id + '" ' + (!on && !available ? "disabled" : "") + ">" + spriteArt(decorById[id]) + "<span>" + escapeHome(decorById[id].name) + "<small>" + (on ? "On this shelf · tap to remove" : available ? "Tap to shelve" : "On another shelf") + '</small></span></button><button class="secondary book-read" data-read-book="' + id + '" aria-label="Read ' + escapeHome(decorById[id].name) + '">Read</button></div>';
      }).join("") : "<p>Your collection is waiting. Find books in the decor shop.</p>";
      for (const b of $("shelf-collection").querySelectorAll("[data-read-book]"))
        b.onclick = () => app2.features.library.open(b.dataset.readBook);
      for (const b of $("shelf-collection").querySelectorAll("[data-shelf-book]"))
        b.onclick = () => {
          const id = b.dataset.shelfBook;
          const changed = p.books.includes(id) ? unshelfBook2(app2.state, p.instance, id) : shelfBook2(app2.state, p.instance, id);
          if (changed) {
            save();
            renderHome();
          }
        };
    }
  }
  function visibleDecor() {
    const query = homeQuery.trim().toLowerCase();
    const list = decorCatalog.filter((item) => (homeCategory === "all" || item.category === homeCategory) && (homeFilter !== "owned" || app2.state.house.owned.includes(item.id)) && (homeFilter !== "affordable" || !app2.state.house.owned.includes(item.id) && item.price <= app2.state.coins) && (!query || (item.name + " " + item.description).toLowerCase().includes(query)));
    if (homeSort === "price")
      list.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
    if (homeSort === "spooky")
      list.sort((a, b) => b.spooky - a.spooky || a.price - b.price);
    return list;
  }
  let storeSignature = "";
  function syncStoreFilters() {
    $("collection-filter").textContent = homeFilter === "owned" ? "Show the full shop" : "My collection";
    $("collection-filter").setAttribute("aria-pressed", String(homeFilter === "owned"));
    $("affordable-filter").setAttribute("aria-pressed", String(homeFilter === "affordable"));
    for (const button of $("decor-categories").querySelectorAll("button")) {
      button.classList.toggle("active", button.dataset.category === homeCategory);
      button.setAttribute("aria-pressed", String(button.dataset.category === homeCategory));
    }
  }
  function revealRoom(instance) {
    const piece = app2.state.house.placed.find((p) => p.instance === instance);
    if (piece && piece.sceneId !== app2.state.house.activeRoom) changeRoom(piece.sceneId);
    if (instance)
      homeSelection = instance;
    setHomePanel("room");
    renderRoom();
    renderInspector();
    requestAnimationFrame(() => {
      const piece2 = instance ? app2.state.house.placed.find((p) => p.instance === instance) : null;
      if (piece2 && roomZoom)
        scrollAcross(houseViewport, Math.max(0, piece2.x / 1e3 * houseRoom.clientWidth - houseViewport.clientWidth / 2));
      const button = instance ? $("room-pieces").querySelector('[data-instance="' + instance + '"]') : null;
      button?.focus?.({ preventScroll: true });
    });
  }
  function renderStore() {
    const list = visibleDecor();
    storeSignature = list.map((item) => item.id).join(",");
    $("catalog-count").textContent = list.length + " " + (homeFilter === "owned" ? "collected" : homeFilter === "affordable" ? "affordable" : "illustrated") + " " + (list.length === 1 ? "treasure" : "treasures");
    $("decor-grid").innerHTML = list.map((item) => {
      const owned = app2.state.house.owned.includes(item.id), placed = app2.state.house.placed.some((p) => p.id === item.id), active = app2.state.house.wallpaper === item.id;
      const book = item.category === "books", shelved = app2.state.house.placed.some((p) => p.books.includes(item.id));
      const location = app2.state.house.placed.find((p) => p.id === item.id || p.books.includes(item.id));
      const label = book ? shelved ? "View shelf in " + findRoom(location.sceneId).name : "Shelve in " + findRoom(app2.state.house.activeRoom).name : item.category === "wallpaper" ? active ? "Applied to parlour" : "Apply to parlour" : placed ? "View in " + findRoom(location.sceneId).name : "Place in " + findRoom(app2.state.house.activeRoom).name;
      return '<article class="decor-card" data-item="' + item.id + '"><div class="item-art ' + (item.category === "wallpaper" ? "wallpaper-sample" : "") + '">' + spriteArt(item) + (owned ? '<span class="item-owned">' + (placed || active || shelved ? "In our home" : "In collection") + "</span>" : "") + '</div><div class="decor-card-copy"><small>' + escapeHome(item.category === "shelves" ? "BOOKSHELF · " + item.capacity + " BOOKS" : item.category.toUpperCase()) + "</small><h3>" + escapeHome(item.name) + "</h3><p>" + escapeHome(item.description) + '</p><span class="item-haunting">✦ ' + item.spooky + " haunting " + (item.spooky === 1 ? "point" : "points") + '</span></div><div class="decor-card-bottom">' + (!owned ? '<button class="buy-decor" data-buy-decor="' + item.id + '" ' + (app2.state.paused || app2.state.coins < item.price ? "disabled" : "") + ">Buy · £" + item.price + '</button><small class="item-shortfall" data-shortfall="' + item.id + '"></small>' : '<button class="place-decor" data-place-decor="' + item.id + '">' + label + "</button>" + (book ? '<button class="secondary book-read" data-read-book="' + item.id + '">Read story</button>' : "")) + "</div></article>";
    }).join("") || '<div class="catalog-empty"><span>✧</span><h3>' + (homeFilter === "affordable" ? "A little more harvesting…" : "No treasures found") + "</h3><p>" + (homeFilter === "affordable" ? "Your coins are growing. Browse the full cupboard while the shop makes sales." : "Try another search, or browse every treasure in the cupboard.") + '</p><button class="secondary" id="clear-decor-filters">Browse all 50 treasures</button></div>';
    if ($("clear-decor-filters"))
      $("clear-decor-filters").onclick = () => {
        homeCategory = "all";
        homeFilter = "all";
        homeQuery = "";
        $("decor-search").value = "";
        syncStoreFilters();
        renderStore();
      };
    for (const button of $("decor-grid").querySelectorAll("[data-read-book]"))
      button.onclick = () => app2.features.library.open(button.dataset.readBook);
    for (const button of $("decor-grid").querySelectorAll("[data-buy-decor]"))
      button.onclick = () => {
        const item = decorById[button.dataset.buyDecor];
        if (buyDecor2(app2.state, item.id)) {
          save();
          renderHome();
          renderUI();
          homeNotice(item.name + " is yours. Choose " + (item.category === "books" ? "Shelve in room." : item.category === "wallpaper" ? "Apply to room." : "Place in room."));
          $("decor-grid").querySelector('[data-place-decor="' + item.id + '"]')?.focus?.({ preventScroll: true });
        }
      };
    for (const button of $("decor-grid").querySelectorAll("[data-place-decor]"))
      button.onclick = () => {
        if (app2.state.paused)
          return;
        const item = decorById[button.dataset.placeDecor];
        if (item.category === "books") {
          const existing2 = app2.state.house.placed.find((p) => p.books.includes(item.id));
          if (existing2) {
            revealRoom(existing2.instance);
            return;
          }
          const current = app2.state.house.placed.find((p) => p.instance === homeSelection && decorById[p.id].capacity && p.books.length < decorById[p.id].capacity);
          const shelf = current || roomPieces(app2.state).find((p) => decorById[p.id].capacity && p.books.length < decorById[p.id].capacity);
          if (shelf && shelfBook2(app2.state, shelf.instance, item.id)) {
            save();
            renderHome();
            revealRoom(shelf.instance);
            homeNotice(item.name + " found a home.");
          } else
            homeNotice("Place a bookshelf with a free slot first.");
          return;
        }
        const existing = app2.state.house.placed.find((p) => p.id === item.id);
        if (existing) {
          revealRoom(existing.instance);
          return;
        }
        if (placeDecor2(app2.state, item.id)) {
          save();
          renderHome();
          revealRoom(app2.state.house.placed.find((p) => p.id === item.id)?.instance);
          homeNotice(item.category === "wallpaper" ? "A fresh mood for our little home." : "Placed! Drag it or use the arrows to find its home.");
        } else
          homeNotice("Our room is full. Put something away or upgrade the house.");
      };
    refreshStoreAffordability();
  }
  function refreshStoreAffordability() {
    if (homeMode && homePanel === "shop" && homeFilter === "affordable" && visibleDecor().map((item) => item.id).join(",") !== storeSignature) {
      renderStore();
      return;
    }
    for (const label of $("decor-grid").querySelectorAll("[data-shortfall]")) {
      const item = decorById[label.dataset.shortfall], short = Math.max(0, Math.ceil(item.price - app2.state.coins));
      label.textContent = app2.state.paused ? "Paused" : short ? "£" + short + " more needed" : "Ready to bring home";
      label.classList.toggle("can-afford", !short && !app2.state.paused);
    }
  }
  function setHomePanel(panel) {
    if (panel !== homePanel) {
      homeScroll[homePanel] = $("house-section").scrollTop;
      homePanel = panel;
    }
    $("home-room-panel").hidden = panel !== "room";
    $("home-shop-panel").hidden = panel !== "shop";
    $("room-zoom").hidden = panel !== "room";
    for (const [id, value] of [["room-tab", "room"], ["decor-tab", "shop"]]) {
      $(id).classList.toggle("active", panel === value);
      $(id).setAttribute("aria-pressed", String(panel === value));
    }
    $("house-section").scrollTop = homeScroll[panel];
    if (panel === "room")
      requestAnimationFrame(fitHouseRoom);
    else
      renderStore();
  }
  function fitHouseRoom() {
    houseRoom.style.width = roomZoom ? Math.max(720, Math.round(houseViewport.clientWidth * 1.4)) + "px" : "100%";
    $("room-zoom").textContent = roomZoom ? "Fit whole room" : "Closer view";
    $("room-zoom").setAttribute("aria-pressed", String(roomZoom));
  }
  $("room-tab").onclick = () => setHomePanel("room");
  $("decor-tab").onclick = () => setHomePanel("shop");
  $("room-zoom").onclick = () => {
    roomZoom = !roomZoom;
    fitHouseRoom();
    requestAnimationFrame(() => scrollAcross(houseViewport, Math.max(0, (houseViewport.scrollWidth - houseViewport.clientWidth) / 2)));
  };
  window.addEventListener("resize", () => {
    if (homeMode)
      fitHouseRoom();
  });
  $("decor-categories").innerHTML = decorCategories.map(([id, name]) => '<button data-category="' + id + '" aria-pressed="' + (id === "all") + '" class="' + (id === "all" ? "active" : "") + '">' + name + "</button>").join("");
  for (const button of $("decor-categories").querySelectorAll("[data-category]"))
    button.onclick = () => {
      homeCategory = button.dataset.category;
      syncStoreFilters();
      renderStore();
    };
  $("decor-search").addEventListener("input", (event) => {
    homeQuery = event.target.value;
    renderStore();
  });
  $("decor-sort").onchange = (event) => {
    homeSort = event.target.value;
    renderStore();
  };
  $("collection-filter").onclick = () => {
    homeFilter = homeFilter === "owned" ? "all" : "owned";
    syncStoreFilters();
    renderStore();
  };
  $("affordable-filter").onclick = () => {
    homeFilter = homeFilter === "affordable" ? "all" : "affordable";
    syncStoreFilters();
    renderStore();
  };
  $("house-upgrade").onclick = () => {
    if (upgradeHouse2(app2.state)) {
      save();
      renderHome();
      homeNotice("Welcome to our " + houseLevels[app2.state.house.level].name.toLowerCase() + "!");
      say(app2.state.house.level % 2, "More space, more stories, and a few more corners for friendly ghosts.");
    }
  };
  $("remove-wallpaper").onclick = () => {
    if (app2.state.paused)
      return;
    if (app2.actions.clearWallpaper()) {
      save();
      renderHome();
    }
  };
  $("home-level-art").style.backgroundImage = 'url("' + asset("assets/house/exteriors.webp") + '")';
  let lastMapHouseLevel = -1;
  function refreshMapHouse() {
    if (lastMapHouseLevel === app2.state.house.level)
      return;
    lastMapHouseLevel = app2.state.house.level;
    const stage = houseMapStages[app2.state.house.level], r = stage.rect, art = $("map-house-art"), hit = $("enter-house");
    for (const el of [art, hit]) {
      el.style.left = stage.x / 10 + "%";
      el.style.top = stage.y / 6.1 + "%";
      el.style.width = stage.width / 10 + "%";
      el.style.height = stage.height / 6.1 + "%";
    }
    art.style.backgroundImage = 'url("' + asset("assets/house/exteriors.webp") + '")';
    art.style.backgroundSize = 1536 / r[2] * 100 + "% " + 1024 / r[3] * 100 + "%";
    art.style.backgroundPosition = r[0] / (1536 - r[2]) * 100 + "% " + r[1] / (1024 - r[3]) * 100 + "%";
    hit.style.clipPath = "polygon(" + stage.outline.map((p) => p[0] + "% " + p[1] + "%").join(",") + ")";
    $("house-outline-points").setAttribute("points", stage.outline.map((p) => p.join(",")).join(" "));
    hit.setAttribute("aria-label", "Enter our " + houseLevels[app2.state.house.level].name.toLowerCase());
    hit.title = "Enter our " + houseLevels[app2.state.house.level].name.toLowerCase();
    hit.dataset.houseLevel = app2.state.house.level;
  }
  return { changeRoom, get active() {
    return homeMode;
  }, get panel() {
    return homePanel;
  }, get selection() {
    return homeSelection;
  }, set selection(value) {
    homeSelection = value;
  }, render: renderHome, setMode: setHomeMode, reset: resetHomeUI, refreshBalance: refreshHomeBalance, refreshMapHouse, fit: fitHouseRoom };
}

export { initHouseUi };
