import { findRoom, findRoomStyle, freshRoomStyles, houseRooms, parlourInteriors } from "../content/rooms.mjs";
import { decorAtlases, decorById } from "../content/catalog.mjs";
import { shelfLayouts } from "../content/shelf-layouts.mjs";
import { constrainPlacement } from "../scene/room-geometry.js";
import { libraryStories } from "../content/library.mjs";

var houseLevels = [{ name: "Little cottage", capacity: 6, cost: 650, description: "Open a bedroom and expand the parlour to 10 pieces." }, { name: "Crooked cottage", capacity: 10, cost: 2600, description: "Open a kitchen and expand the parlour to 16 pieces." }, { name: "Midnight manor", capacity: 16, cost: 9e3, description: "Open the attic and expand the parlour to 24 pieces." }, { name: "Haunted haven", capacity: 24, cost: 0, description: "Four rooms for our perfectly spooky forever home." }];
function houseItem(id) {
  return typeof id === "string" && Object.hasOwn(decorById, id) ? decorById[id] : null;
}
function placedPiece(instance, id, x, y, books2 = [], sceneId = "parlour") {
  const sockets = shelfLayouts[id]?.sockets || [];
  return {
    instance,
    id,
    sceneId,
    x,
    y,
    flip: false,
    books: [...books2],
    bookSockets: Object.fromEntries(books2.map((book, i) => [sockets[i].id, book]))
  };
}
function freshHouse() {
  return {
    activeRoom: "parlour",
    roomStyles: freshRoomStyles(),
    ownedRoomStyles: [],
    level: 0,
    owned: ["f01", "f11", "b01"],
    wallpaper: null,
    nextInstance: 2,
    reading: {},
    placed: [placedPiece("piece-0", "f01", 370, 535), placedPiece("piece-1", "f11", 630, 475, ["b01"])]
  };
}
function allocateHouseInstance(h) {
  const instances = new Set(h.placed.map((p) => p.instance));
  let n = Number.isSafeInteger(h.nextInstance) && h.nextInstance >= 0 && h.nextInstance < Number.MAX_SAFE_INTEGER ? h.nextInstance : 0;
  while (instances.has("piece-" + n)) n = n < Number.MAX_SAFE_INTEGER - 1 ? n + 1 : 0;
  h.nextInstance = n + 1;
  return "piece-" + n;
}
function availableBook(s, id) {
  return s.house.owned.includes(id) && houseItem(id)?.category === "books" && !s.house.placed.some((p) => p.books.includes(id));
}
function buyDecor(s, id) {
  const item = houseItem(id);
  if (!item || s.paused || s.house.owned.includes(id) || s.coins < item.price) return false;
  s.coins -= item.price;
  s.house.owned.push(id);
  return true;
}
function upgradeHouse(s) {
  const h = s.house;
  if (s.paused || h.level >= 3 || s.coins < houseLevels[h.level].cost) return false;
  s.coins -= houseLevels[h.level].cost;
  h.level++;
  return true;
}
function placeDecor(s, id) {
  const item = houseItem(id), h = s.house;
  if (!item || s.paused || !h.owned.includes(id) || item.category === "books" || h.placed.some((p) => p.id === id)) return false;
  if (item.category === "wallpaper") {
    h.wallpaper = id;
    h.activeRoom = "parlour";
    return true;
  }
  const n = roomPieces(s, h.activeRoom).length;
  if (n >= roomCapacity(s, h.activeRoom)) return false;
  const pos = decorPosition(
    item,
    item.wall ? 350 + n % 3 * 150 : [370, 630, 500, 780, 240, 430, 630, 800][n % 8],
    item.wall ? 310 : item.rug ? 580 : [535, 475, 600, 600, 605, 515, 525, 530][n % 8],
    h.activeRoom
  );
  h.placed.push(placedPiece(allocateHouseInstance(h), id, pos.x, pos.y, [], h.activeRoom));
  return true;
}
function decorPosition(item, x, y, sceneId = "parlour") {
  return constrainPlacement({ ...item, rect: decorAtlases[item.atlas]?.rects[item.slot] }, { x, y }, sceneId);
}
function moveDecor(s, instance, x, y) {
  const p = s.house.placed.find((p2) => p2.instance === instance);
  if (!p || s.paused || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  Object.assign(p, decorPosition(decorById[p.id], x, y, p.sceneId));
  return true;
}
function removeDecor(s, instance) {
  if (s.paused) return false;
  const i = s.house.placed.findIndex((p) => p.instance === instance);
  if (i < 0) return false;
  s.house.placed.splice(i, 1);
  return true;
}
function shelfBook(s, instance, id) {
  const p = s.house.placed.find((p2) => p2.instance === instance);
  const socket = p && shelfLayouts[p.id]?.sockets.find((slot) => !p.bookSockets[slot.id]);
  if (s.paused || !socket || !availableBook(s, id)) return false;
  p.bookSockets[socket.id] = id;
  p.books.push(id);
  return true;
}
function unshelfBook(s, instance, id) {
  const p = s.house.placed.find((p2) => p2.instance === instance);
  if (s.paused || !p || !p.books.includes(id)) return false;
  for (const [socket, book] of Object.entries(p.bookSockets)) if (book === id) delete p.bookSockets[socket];
  p.books.splice(p.books.indexOf(id), 1);
  return true;
}
function rememberBookPage(s, id, page) {
  if (!houseItem(id) || !s.house.owned.includes(id) || !libraryStories[id] || !Number.isInteger(page) || page < 0 || page >= libraryStories[id].pages.length) return false;
  s.house.reading[id] = page;
  return true;
}
function spookyScore(s) {
  return s.house.level * 4 + (decorById[s.house.wallpaper]?.spooky || 0) + s.house.placed.reduce((n, p) => n + decorById[p.id].spooky + p.books.length, 0);
}
function restoreHouse(raw, version = raw?.roomStyles ? 7 : 6) {
  const h = freshHouse();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return h;
  const owned = Array.isArray(raw.owned) ? [...new Set(raw.owned.filter((id) => houseItem(id)))] : h.owned;
  const level2 = Number.isInteger(raw.level) ? Math.max(0, Math.min(3, raw.level)) : 0;
  const activeRoom = version >= 7 && findRoom(raw.activeRoom)?.level <= level2 ? raw.activeRoom : "parlour";
  const roomStyles2 = freshRoomStyles(), ownedRoomStyles = version >= 7 && Array.isArray(raw.ownedRoomStyles) ? [...new Set(raw.ownedRoomStyles.filter((id) => findRoomStyle(id)?.price > 0))] : [];
  if (version >= 7) for (const room of houseRooms) {
    const id = raw.roomStyles?.[room.id];
    if (id === "house-default" && room.id === "parlour") roomStyles2[room.id] = id;
    else if (findRoomStyle(id)?.roomId === room.id) roomStyles2[room.id] = id;
  }
  const used = /* @__PURE__ */ new Set(), booked = /* @__PURE__ */ new Set(), instances = /* @__PURE__ */ new Set(), placed = [], perRoom = {};
  for (const p of Array.isArray(raw.placed) ? raw.placed : []) {
    const item = houseItem(p?.id);
    const sceneId = version >= 7 && findRoom(p?.sceneId)?.level <= level2 ? p.sceneId : "parlour";
    const capacity = sceneId === "parlour" ? houseLevels[level2].capacity : findRoom(sceneId).capacity;
    if (!item || !owned.includes(p.id) || ["books", "wallpaper"].includes(item.category) || used.has(p.id) || (perRoom[sceneId] || 0) >= capacity) continue;
    perRoom[sceneId] = (perRoom[sceneId] || 0) + 1;
    used.add(p.id);
    let instance = typeof p.instance === "string" && p.instance.length && !instances.has(p.instance) ? p.instance : "restored-" + placed.length;
    while (instances.has(instance)) instance += "-restored";
    instances.add(instance);
    const sockets = shelfLayouts[p.id]?.sockets || [], bookSockets = {}, books2 = [];
    const fitted = p.bookSockets && typeof p.bookSockets === "object" && !Array.isArray(p.bookSockets);
    const legacy = Array.isArray(p.books) ? p.books : [];
    const validLegacy = [...new Set(legacy.filter((id) => owned.includes(id) && houseItem(id)?.category === "books" && !booked.has(id)))];
    const candidates = fitted ? sockets.map((slot) => [slot.id, p.bookSockets[slot.id]]) : validLegacy.map((id, i) => [sockets[i]?.id, id]);
    for (const [socket, id] of candidates) {
      if (!socket || !owned.includes(id) || houseItem(id)?.category !== "books" || booked.has(id)) continue;
      bookSockets[socket] = id;
      books2.push(id);
      booked.add(id);
    }
    if (fitted) books2.sort((a, b) => legacy.indexOf(a) - legacy.indexOf(b));
    const pos = decorPosition(item, Number.isFinite(p.x) ? p.x : 500, Number.isFinite(p.y) ? p.y : 500, sceneId);
    placed.push({ instance, id: p.id, sceneId, ...pos, flip: !!p.flip, books: books2, bookSockets });
  }
  const reading = {};
  for (const id of owned) {
    const pages = libraryStories[id]?.pages;
    if (pages && Number.isInteger(raw.reading?.[id])) reading[id] = Math.max(0, Math.min(pages.length - 1, raw.reading[id]));
  }
  return {
    activeRoom,
    roomStyles: roomStyles2,
    ownedRoomStyles,
    level: level2,
    owned,
    wallpaper: owned.includes(raw.wallpaper) && houseItem(raw.wallpaper)?.category === "wallpaper" ? raw.wallpaper : null,
    nextInstance: Number.isSafeInteger(raw.nextInstance) && raw.nextInstance >= 0 && raw.nextInstance < Number.MAX_SAFE_INTEGER ? raw.nextInstance : placed.length,
    reading,
    placed
  };
}
function roomUnlocked(s, id) {
  const room = findRoom(id);
  return !!room && s.house.level >= room.level;
}
function roomCapacity(s, id) {
  const room = findRoom(id);
  return !room ? 0 : id === "parlour" ? houseLevels[s.house.level].capacity : room.capacity;
}
function roomPieces(s, id = s.house.activeRoom) {
  return s.house.placed.filter((p) => p.sceneId === id);
}
function selectHouseRoom(s, id) {
  if (!roomUnlocked(s, id)) return false;
  s.house.activeRoom = id;
  return true;
}
function selectedRoomStyle(s, id = s.house.activeRoom) {
  const key = s.house.roomStyles[id];
  return key === "house-default" ? parlourInteriors[s.house.level] : findRoomStyle(key);
}
function roomStyleOwned(s, id) {
  const style = findRoomStyle(id);
  return !!style && s.house.level >= style.level && (!style.price || s.house.ownedRoomStyles.includes(id));
}
function buyRoomStyle(s, id) {
  const style = findRoomStyle(id);
  if (!style || !style.price || !roomUnlocked(s, style.roomId) || s.paused || roomStyleOwned(s, id) || s.coins < style.price) return false;
  s.coins -= style.price;
  s.house.ownedRoomStyles.push(id);
  return true;
}
function applyRoomStyle(s, id) {
  const style = findRoomStyle(id);
  if (!style || s.paused || !roomUnlocked(s, style.roomId) || !roomStyleOwned(s, id)) return false;
  s.house.roomStyles[style.roomId] = id;
  return true;
}
function transferDecor(s, instance, target) {
  const p = s.house.placed.find((p2) => p2.instance === instance);
  if (!p || s.paused || p.sceneId === target || !roomUnlocked(s, target) || roomPieces(s, target).length >= roomCapacity(s, target)) return false;
  const n = roomPieces(s, target).length, item = decorById[p.id];
  const point = decorPosition(item, item.wall ? 500 : [370, 630, 500, 780, 240, 430, 630, 800][n % 8], item.wall ? 310 : item.rug ? 580 : [535, 475, 600, 600, 605, 515, 525, 530][n % 8], target);
  Object.assign(p, point, { sceneId: target });
  return true;
}
function validHouseRooms(raw) {
  if (!raw || !Number.isInteger(raw.level) || raw.level < 0 || raw.level > 3 || !findRoom(raw.activeRoom) || findRoom(raw.activeRoom).level > raw.level || !raw.roomStyles || Array.isArray(raw.roomStyles) || Object.keys(raw.roomStyles).length !== houseRooms.length || !Array.isArray(raw.ownedRoomStyles) || !Array.isArray(raw.placed)) return false;
  if (new Set(raw.ownedRoomStyles).size !== raw.ownedRoomStyles.length || raw.ownedRoomStyles.some((id) => !findRoomStyle(id)?.price || findRoomStyle(id).level > raw.level)) return false;
  for (const room of houseRooms) {
    const id = raw.roomStyles[room.id];
    if (id === "house-default" && room.id === "parlour") continue;
    const style = findRoomStyle(id);
    if (!style || style.roomId !== room.id || (room.level > raw.level ? id !== room.baseStyle : style.level > raw.level || style.price && !raw.ownedRoomStyles.includes(id))) return false;
  }
  const counts = {};
  for (const p of raw.placed) {
    const room = findRoom(p?.sceneId);
    if (!room || room.level > raw.level) return false;
    counts[room.id] = (counts[room.id] || 0) + 1;
    if (counts[room.id] > (room.id === "parlour" ? houseLevels[raw.level].capacity : room.capacity)) return false;
  }
  return true;
}

export { applyRoomStyle, availableBook, buyDecor, buyRoomStyle, freshHouse, houseLevels, moveDecor, placeDecor, rememberBookPage, removeDecor, restoreHouse, roomCapacity, roomPieces, roomStyleOwned, roomUnlocked, selectHouseRoom, selectedRoomStyle, shelfBook, spookyScore, transferDecor, unshelfBook, upgradeHouse, validHouseRooms };
