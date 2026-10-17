import { findRoom, houseRooms, roomStyles } from "../content/rooms.mjs";
import { houseLevels, roomCapacity, roomPieces, roomStyleOwned, roomUnlocked, selectedRoomStyle } from "../core/house-model.mjs";
import { escapeHtml } from "./html.js";
import { iconArt } from "./icons.js";

function initRoomUi(app2) {
  const { $, showModal, closeModal, gameAsset } = app2;
  let section = "rooms", previewRoom = "parlour";
  const picture = (style, cls) => '<img class="' + cls + '" src="' + gameAsset(style.path) + '" alt="' + escapeHtml(style.name) + ' room preview" draggable="false">';
  function open(tab = "rooms", id = app2.state.house.activeRoom) {
    section = tab;
    previewRoom = id;
    render();
  }
  function render() {
    const s = app2.state, room = findRoom(previewRoom);
    showModal('<section class="rooms-menu"><header class="rooms-heading"><div><div class="modal-subtitle">MAKE OUR HOUSE A HOME</div><h2>' + (section === "styles" ? room.name + " styles" : "Rooms & styles") + '</h2></div><strong id="room-menu-coins"></strong></header><nav class="room-menu-tabs"><button id="room-menu-rooms" class="' + (section === "rooms" ? "active" : "") + '">' + iconArt("home") + 'Rooms</button><button id="room-menu-styles" class="' + (section === "styles" ? "active" : "") + '">' + iconArt("journal") + 'Room styles</button></nav><div class="' + (section === "rooms" ? "room-picker-grid" : "room-style-grid") + '">' + (section === "rooms" ? roomCards(s) : styleCards(s, room)) + '</div><button class="secondary room-menu-return" id="room-menu-return">Back to our room</button></section>');
    $("room-menu-rooms").onclick = () => open("rooms");
    $("room-menu-styles").onclick = () => open("styles");
    $("room-menu-return").onclick = closeModal;
    for (const b of $("modal-content").querySelectorAll("[data-enter-room]")) b.onclick = () => {
      closeModal();
      app2.features.home.changeRoom(b.dataset.enterRoom);
    };
    for (const b of $("modal-content").querySelectorAll("[data-room-styles]")) b.onclick = () => open("styles", b.dataset.roomStyles);
    for (const b of $("modal-content").querySelectorAll("[data-expand-room]")) b.onclick = () => {
      if (app2.actions.upgradeHouse(s)) {
        app2.save();
        app2.features.home.render();
        render();
        app2.renderUI();
      }
    };
    for (const b of $("modal-content").querySelectorAll("[data-buy-room-style]")) b.onclick = () => {
      if (app2.actions.buyRoomStyle(b.dataset.buyRoomStyle)) {
        app2.save();
        render();
        app2.renderUI();
      }
    };
    for (const b of $("modal-content").querySelectorAll("[data-apply-room-style]")) b.onclick = () => {
      const id = b.dataset.applyRoomStyle;
      if (app2.actions.applyRoomStyle(id)) {
        closeModal();
        app2.features.home.changeRoom(previewRoom);
      }
    };
    refresh();
  }
  function roomCards(s) {
    return houseRooms.map((room) => {
      const unlocked2 = roomUnlocked(s, room.id), next = room.level === s.house.level + 1;
      const style = selectedRoomStyle(s, room.id), count3 = roomPieces(s, room.id).length;
      return '<article class="room-picker-card ' + (!unlocked2 ? "room-locked" : "") + '">' + picture(style, "room-preview") + "<h3>" + room.name + "</h3><p>" + escapeHtml(room.description) + "</p><small>" + (unlocked2 ? count3 + " / " + roomCapacity(s, room.id) + " pieces · " + (room.id === s.house.activeRoom ? "Current room" : "Ready to decorate") : "Opens with " + houseLevels[room.level].name) + '</small><div class="room-card-actions">' + (unlocked2 ? '<button class="primary" data-enter-room="' + room.id + '">Enter ' + room.name.toLowerCase() + '</button><button class="secondary" data-room-styles="' + room.id + '">Choose style</button>' : next ? '<button class="primary" data-expand-room="' + room.id + '">Expand house · £' + houseLevels[s.house.level].cost.toLocaleString("en-GB") + "</button>" : '<span class="room-unlock-note">Upgrade the house to stage ' + (room.level + 1) + "</span>") + "</div></article>";
    }).join("");
  }
  function styleCards(s, room) {
    const current = selectedRoomStyle(s, room.id).id;
    return roomStyles.filter((style) => style.roomId === room.id).map((style) => {
      const owned = roomStyleOwned(s, style.id), locked = style.level > s.house.level;
      return '<article class="room-style-card">' + picture(style, "room-style-preview") + "<h3>" + escapeHtml(style.name) + "</h3><small>" + (locked ? "Needs " + houseLevels[style.level].name : style.price ? owned ? "In our collection" : "Full illustrated room · £" + style.price.toLocaleString("en-GB") : "Included with our house") + "</small>" + (owned ? '<button class="primary" data-apply-room-style="' + style.id + '" ' + (current === style.id ? "disabled" : "") + ">" + (current === style.id ? "Selected" : "Use in " + room.name) + "</button>" : '<button class="primary" data-buy-room-style="' + style.id + '" ' + (locked ? "disabled" : "") + ">" + (locked ? "House upgrade needed" : "Buy style · £" + style.price.toLocaleString("en-GB")) + "</button>") + "</article>";
    }).join("");
  }
  function refresh() {
    if (!$("modal").open || !$("modal-content").querySelector(".rooms-menu")) return;
    const s = app2.state;
    $("room-menu-coins").textContent = "£" + Math.floor(s.coins).toLocaleString("en-GB");
    for (const b of $("modal-content").querySelectorAll("[data-expand-room]")) b.disabled = s.paused || s.coins < houseLevels[s.house.level].cost;
    for (const b of $("modal-content").querySelectorAll("[data-buy-room-style]")) {
      const style = roomStyles.find((x) => x.id === b.dataset.buyRoomStyle);
      b.disabled = s.paused || style.level > s.house.level || s.coins < style.price;
    }
    for (const b of $("modal-content").querySelectorAll("[data-apply-room-style]")) b.disabled = s.paused || selectedRoomStyle(s, previewRoom).id === b.dataset.applyRoomStyle;
  }
  $("rooms-nav").onclick = () => open();
  return { open, refresh };
}

export { initRoomUi };
