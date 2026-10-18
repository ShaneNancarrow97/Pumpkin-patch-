// The cottage and its rooms. The catalogue, room styles, house levels,
// capacities and haunting points are the main game's (src/content/catalog.mjs,
// src/content/rooms.mjs, src/core/house-model.mjs). Placement is new: each room
// is a voxel diorama with a floor grid and a row of hooks on the back wall,
// instead of a painted backdrop.
import { decorById, decorCatalog, decorCategories } from "../../../src/content/catalog.mjs";
import { findRoom, findRoomStyle, freshRoomStyles, houseRooms, parlourInteriors, roomStyles } from "../../../src/content/rooms.mjs";
import { libraryStories } from "../../../src/content/library.mjs";

export { decorById, decorCatalog, decorCategories, houseRooms, roomStyles, libraryStories };

// What each level of the house costs to move on from, and how many pieces its parlour holds.
export const HOUSE_LEVELS = [
  { name: "Little cottage", capacity: 6, cost: 650, text: "Open a bedroom and make room for 10 pieces in the parlour." },
  { name: "Crooked cottage", capacity: 10, cost: 2600, text: "Open a kitchen and make room for 16 pieces in the parlour." },
  { name: "Midnight manor", capacity: 16, cost: 9000, text: "Open the attic and make room for 24 pieces in the parlour." },
  { name: "Haunted haven", capacity: 24, cost: 0, text: "Four rooms for our perfectly spooky forever home." },
];

// The floor is GRID.w cells across and GRID.d deep (z 0 against the back wall).
// Pictures, mirrors and the chandelier hang from hooks on the back wall's
// central panel, between the two windows: cells HOOKS.from to HOOKS.to.
export const GRID = { w: 10, d: 6 };
export const HOOKS = { from: 3, to: 7 };
const SIZES = {
  f01: [2, 2], f02: [3, 2], f03: [2, 2], f04: [1, 1], f05: [3, 3], f06: [3, 3], f07: [2, 1], f08: [1, 1],
  f09: [2, 1], f10: [3, 2], f11: [2, 1], f12: [2, 1], f13: [2, 1], f14: [3, 1], f15: [3, 2], f16: [2, 2],
  d04: [2, 1], d11: [2, 1],
};
// Where a piece goes: on the floor, under the furniture (rugs) or on the back wall.
export function footprint(id) {
  const item = decorById[id], [w, d] = SIZES[id] ?? [1, 1];
  return { w, d: item.wall ? 1 : d, layer: item.wall ? "wall" : item.rug ? "rug" : "floor" };
}
export const shelfCapacity = (id) => decorById[id]?.capacity || 0;

const placedPiece = (instance, id, room, x, z, books = []) => ({ instance, id, room, x, z, flip: false, books: [...books] });
export function freshHouse() {
  return {
    level: 0, activeRoom: "parlour", roomStyles: freshRoomStyles(), ownedRoomStyles: [],
    owned: ["f01", "f11", "b01"], wallpapers: {}, nextInstance: 2, reading: {},
    placed: [placedPiece("piece-0", "f01", "parlour", 2, 3), placedPiece("piece-1", "f11", "parlour", 6, 0, ["b01"])],
  };
}

export const roomUnlocked = (s, id) => !!findRoom(id) && s.house.level >= findRoom(id).level;
export const roomCapacity = (s, id) => (id === "parlour" ? HOUSE_LEVELS[s.house.level].capacity : findRoom(id)?.capacity ?? 0);
export const roomPieces = (s, id = s.house.activeRoom) => s.house.placed.filter((p) => p.room === id);
// The parlour's look follows the house level; other rooms have a free and a paid style.
export function roomStyle(s, id) {
  const chosen = s.house.roomStyles[id];
  return id === "parlour" && (!chosen || chosen === "house-default") ? parlourInteriors[s.house.level] : findRoomStyle(chosen) ?? findRoomStyle(findRoom(id).baseStyle);
}

function overlaps(a, b) {
  const fa = footprint(a.id), fb = footprint(b.id);
  if (fa.layer !== fb.layer) return false;
  return a.x < b.x + fb.w && b.x < a.x + fa.w && (fa.layer === "wall" || (a.z < b.z + fb.d && b.z < a.z + fa.d));
}
export function fits(s, room, id, x, z, ignore) {
  const f = footprint(id);
  if (!Number.isInteger(x) || !Number.isInteger(z) || x < 0 || x + f.w > GRID.w) return false;
  if (f.layer === "wall" ? z !== 0 || x < HOOKS.from || x + f.w > HOOKS.to : z < 0 || z + f.d > GRID.d) return false;
  return !roomPieces(s, room).some((p) => p.instance !== ignore && overlaps({ id, x, z }, p));
}
// The first free spot, scanning from the back wall forwards.
function findSpot(s, room, id) {
  for (let z = 0; z < GRID.d; z++) for (let x = 0; x < GRID.w; x++) if (fits(s, room, id, x, z)) return { x, z };
  return null;
}

export function buyDecor(s, id) {
  const item = decorById[id];
  if (!item || s.house.owned.includes(id) || s.coins < item.price) return false;
  s.coins -= item.price;
  s.house.owned.push(id);
  return true;
}

export function upgradeHouse(s) {
  const h = s.house;
  if (h.level >= 3 || s.coins < HOUSE_LEVELS[h.level].cost) return false;
  s.coins -= HOUSE_LEVELS[h.level].cost;
  h.level++;
  return true;
}

// Puts an owned piece into a room at the first free spot. Returns its instance id.
export function placeDecor(s, id, room = s.house.activeRoom) {
  const item = decorById[id], h = s.house;
  if (!item || !h.owned.includes(id) || ["books", "wallpaper"].includes(item.category) || h.placed.some((p) => p.id === id)) return null;
  if (!roomUnlocked(s, room) || roomPieces(s, room).length >= roomCapacity(s, room)) return null;
  const spot = findSpot(s, room, id);
  if (!spot) return null;
  const instance = "piece-" + h.nextInstance++;
  h.placed.push(placedPiece(instance, id, room, spot.x, spot.z));
  return instance;
}

export function moveDecor(s, instance, x, z) {
  const p = s.house.placed.find((q) => q.instance === instance);
  if (!p || !fits(s, p.room, p.id, x, z, instance)) return false;
  p.x = x; p.z = z;
  return true;
}
// Carries a piece to another room, to its first free spot there.
export function sendToRoom(s, instance, room) {
  const p = s.house.placed.find((q) => q.instance === instance);
  if (!p || p.room === room || !roomUnlocked(s, room) || roomPieces(s, room).length >= roomCapacity(s, room)) return false;
  const spot = findSpot(s, room, p.id);
  if (!spot) return false;
  Object.assign(p, { room, x: spot.x, z: spot.z });
  return true;
}
export function flipDecor(s, instance) {
  const p = s.house.placed.find((q) => q.instance === instance);
  if (!p) return false;
  p.flip = !p.flip;
  return true;
}
// Back into storage; any books on it go back on the pile.
export function removeDecor(s, instance) {
  const i = s.house.placed.findIndex((p) => p.instance === instance);
  if (i < 0) return false;
  s.house.placed.splice(i, 1);
  return true;
}

export const availableBook = (s, id) => s.house.owned.includes(id) && decorById[id]?.category === "books" && !s.house.placed.some((p) => p.books.includes(id));
export function shelfBook(s, instance, id) {
  const p = s.house.placed.find((q) => q.instance === instance);
  if (!p || p.books.length >= shelfCapacity(p.id) || !availableBook(s, id)) return false;
  p.books.push(id);
  return true;
}
export function unshelfBook(s, instance, id) {
  const p = s.house.placed.find((q) => q.instance === instance);
  if (!p || !p.books.includes(id)) return false;
  p.books.splice(p.books.indexOf(id), 1);
  return true;
}
export const shelvedBooks = (s) => s.house.placed.reduce((n, p) => n + p.books.length, 0);

// Wallpaper covers a room's back wall. Bought once, it can go in any room.
export function applyWallpaper(s, room, id) {
  if (!roomUnlocked(s, room) || (id !== null && (decorById[id]?.category !== "wallpaper" || !s.house.owned.includes(id)))) return false;
  if (id === null) delete s.house.wallpapers[room];
  else s.house.wallpapers[room] = id;
  return true;
}

export function buyRoomStyle(s, styleId) {
  const style = findRoomStyle(styleId);
  if (!style || !style.price || s.house.ownedRoomStyles.includes(styleId) || s.coins < style.price || !roomUnlocked(s, style.roomId)) return false;
  s.coins -= style.price;
  s.house.ownedRoomStyles.push(styleId);
  s.house.roomStyles[style.roomId] = styleId;
  return true;
}
export function setRoomStyle(s, styleId) {
  const style = findRoomStyle(styleId);
  if (!style || style.roomId === "parlour" || !roomUnlocked(s, style.roomId) || (style.price && !s.house.ownedRoomStyles.includes(styleId))) return false;
  s.house.roomStyles[style.roomId] = styleId;
  return true;
}

export function rememberBookPage(s, id, page) {
  const pages = libraryStories[id]?.pages;
  if (!pages || !s.house.owned.includes(id) || !Number.isInteger(page) || page < 0 || page >= pages.length) return false;
  s.house.reading[id] = page;
  return true;
}

// How haunted the house feels: its level, wallpaper, every piece and every shelved book.
export function spookyScore(s) {
  const h = s.house;
  return h.level * 4 + Object.values(h.wallpapers).reduce((n, id) => n + (decorById[id]?.spooky || 0), 0) + h.placed.reduce((n, p) => n + decorById[p.id].spooky + p.books.length, 0);
}

// Keeps what makes sense from a saved house; anything unknown or out of place is dropped.
export function restoreHouse(raw) {
  const h = freshHouse();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return h;
  const level = Number.isInteger(raw.level) ? Math.max(0, Math.min(3, raw.level)) : 0;
  const s = { house: { ...h, level, placed: [], owned: Array.isArray(raw.owned) ? [...new Set(raw.owned.filter((id) => decorById[id]))] : h.owned } };
  const known = (room) => findRoom(room) && findRoom(room).level <= level;
  for (const [room, id] of Object.entries(raw.roomStyles ?? {})) if (known(room) && (id === "house-default" || findRoomStyle(id)?.roomId === room)) s.house.roomStyles[room] = id;
  s.house.ownedRoomStyles = (raw.ownedRoomStyles ?? []).filter((id) => findRoomStyle(id)?.price > 0);
  for (const [room, id] of Object.entries(raw.wallpapers ?? {})) if (known(room) && s.house.owned.includes(id) && decorById[id]?.category === "wallpaper") s.house.wallpapers[room] = id;
  s.house.activeRoom = known(raw.activeRoom) ? raw.activeRoom : "parlour";
  const used = new Set(), booked = new Set();
  for (const p of Array.isArray(raw.placed) ? raw.placed : []) {
    const item = decorById[p?.id];
    if (!item || !s.house.owned.includes(p.id) || used.has(p.id) || !known(p.room) || ["books", "wallpaper"].includes(item.category)) continue;
    if (roomPieces(s, p.room).length >= roomCapacity(s, p.room) || !fits(s, p.room, p.id, p.x, p.z)) continue;
    used.add(p.id);
    const books = (Array.isArray(p.books) ? p.books : []).filter((b) => s.house.owned.includes(b) && decorById[b]?.category === "books" && !booked.has(b)).slice(0, shelfCapacity(p.id));
    books.forEach((b) => booked.add(b));
    s.house.placed.push({ ...placedPiece(typeof p.instance === "string" ? p.instance : "piece-r" + s.house.placed.length, p.id, p.room, p.x, p.z, books), flip: !!p.flip });
  }
  s.house.nextInstance = Number.isSafeInteger(raw.nextInstance) ? Math.max(raw.nextInstance, s.house.placed.length) : s.house.placed.length + 1;
  while (s.house.placed.some((p) => p.instance === "piece-" + s.house.nextInstance)) s.house.nextInstance++;
  for (const id of s.house.owned) {
    const pages = libraryStories[id]?.pages;
    if (pages && Number.isInteger(raw.reading?.[id])) s.house.reading[id] = Math.max(0, Math.min(pages.length - 1, raw.reading[id]));
  }
  return s.house;
}
