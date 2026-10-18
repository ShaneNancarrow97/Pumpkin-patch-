// The cottage and its rooms. The catalogue, room styles, house levels,
// capacities and haunting points are the main game's (src/content/catalog.mjs,
// src/content/rooms.mjs, src/core/house-model.mjs). Placement is new: each room
// is a voxel diorama with a floor grid and a row of hooks on the back wall,
// instead of a painted backdrop.
//
// ── The growing cottage: the API for the renderer and menus ──
// Rooms grow with the house level and join up with stairs and doorways:
//
//   storey 2          [ attic 12x6  ]         ladder up from the bedroom's back-right corner
//   storey 1          [ bedroom     ]         stairs come up along its right-hand wall
//   storey 0 [kitchen][ parlour     ]         stairs up along its right wall; doorway in its left wall
//
// A room's floor is w x d cells. x runs from the left wall, z from the back
// wall (0) to the open front (d). Rooms only grow to the right and towards
// the front, so a placed piece always keeps its coordinates. Sizes by level
// are in ROOM_SIZES.
//
//   roomLayout(s, room, level = s.house.level) → null while the room is shut, else (frozen, cached)
//     { id, level, w, d, storey, offset, capacity, hooks: { from, to }, doors, stairs, blocked }
//     offset: house x of the room's left wall, in cells from the parlour's left wall,
//       so rooms can be stacked into one cottage (the bedroom's stairs sit right over the parlour's).
//     hooks: wall pieces hang on the back wall between x = from and x = to; windows go outside that span.
//     doors: [{ wall: "left" | "right", at, width, to }], an opening in a side wall over z = at
//       to at + width; the cells just inside it (the threshold) are blocked.
//     stairs: [{ kind: "stair" | "ladder", wall, x, z, w, d, rise, up, down, exit }]
//       the cells x..x+w, z..z+d it takes up. A stair runs along a side wall and climbs
//       towards the back (rise "back"): its back cell (z) is the landing, the rest are
//       steps. In the room below that back cell is the cupboard under the landing; in
//       the room above, the steps are an open stairwell. A ladder leans on the back
//       wall (rise "up"), standing on the bedroom's landing and rising through a hatch
//       into the attic. up / down name the room it leads to (the other is null);
//       exit is the cell kept clear to step on or off.
//     blocked: [{ x, z }], every cell no piece, rug included, may cover.
//   connections(s, room) → [{ kind: "stair" | "ladder" | "door", to, way: "up" | "down" | "through" }]
//   nextLevel(s) → null at the top, else what the next level adds:
//     { level, name, cost, rooms: [{ id, name, opens, from: { w, d, capacity } | null, to }], links: [{ kind, from, to }] }
//   HOUSE_LINKS: every link, in the order the levels build them.
//   upgradeHouse(s) → false, or { level, moved: [{ instance, id, room, x, z }], stored: [{ instance, id, room }] }
//     for the pieces it had to shift out of the way of new stairs and doorways.
//   fits, findSpot, placeDecor, moveDecor and sendToRoom all use the room's layout.
// GRID and HOOKS are the little cottage's parlour (10 x 6), kept until the renderer reads roomLayout.
import { decorById, decorCatalog, decorCategories } from "../../../src/content/catalog.mjs";
import { findRoom, findRoomStyle, freshRoomStyles, houseRooms, parlourInteriors, roomStyles } from "../../../src/content/rooms.mjs";
import { libraryStories } from "../../../src/content/library.mjs";

export { decorById, decorCatalog, decorCategories, houseRooms, roomStyles, libraryStories };

// What each level of the house costs to move on from, and how many pieces its parlour holds.
export const HOUSE_LEVELS = [
  { name: "Little cottage", capacity: 6, cost: 650, text: "Stairs up to a new bedroom, and a wider parlour with room for 10 pieces." },
  { name: "Crooked cottage", capacity: 10, cost: 2600, text: "A doorway through to a new kitchen, and bigger rooms all round." },
  { name: "Midnight manor", capacity: 16, cost: 9000, text: "A ladder up to the attic, and room for 24 pieces in the parlour." },
  { name: "Haunted haven", capacity: 24, cost: 0, text: "Four rooms for our perfectly spooky forever home." },
];

// The little cottage's parlour. Pictures, mirrors and the chandelier hang from
// hooks on the back wall's central panel, between the two windows.
export const GRID = { w: 10, d: 6 };
export const HOOKS = { from: 3, to: 7 };

// Each room's floor [w, d] by house level, from the level it opens. Kept modest:
// the rooms are drawn at high voxel density.
export const ROOM_SIZES = {
  parlour: [[10, 6], [12, 6], [13, 7], [14, 7]],
  bedroom: [, [10, 6], [11, 6], [12, 7]],
  kitchen: [, , [10, 6], [11, 7]],
  attic: [, , , [12, 6]],
};
const STOREY = { parlour: 0, kitchen: 0, bedroom: 1, attic: 2 };
export const HOUSE_LINKS = [
  { kind: "stair", from: "parlour", to: "bedroom" },
  { kind: "door", from: "parlour", to: "kitchen" },
  { kind: "ladder", from: "bedroom", to: "attic" },
];

// The stairs run up the right-hand wall of the parlour and the bedroom. That
// wall moves out as the rooms grow, but always onto new floor, so the stairs
// never land on a placed piece; the bedroom's ladder stands on the landing.
const flight = (rw, up, down, exit) => ({ kind: "stair", wall: "right", x: rw - 1, z: 0, w: 1, d: 5, rise: "back", up, down, exit });
const ladder = (rw, up, down, exit) => ({ kind: "ladder", wall: "back", x: rw - 1, z: 0, w: 1, d: 1, rise: "up", up, down, exit });
const doorway = (wall, to) => ({ wall, at: 2, width: 2, to });
function fixtures(room, rw, open) {
  if (room === "parlour") return { stairs: open("bedroom") ? [flight(rw, "bedroom", null, { x: rw - 1, z: 5 })] : [], doors: open("kitchen") ? [doorway("left", "kitchen")] : [] };
  if (room === "bedroom") return { stairs: [flight(rw, null, "parlour", { x: rw - 2, z: 0 }), ...(open("attic") ? [ladder(rw, "attic", null, { x: rw - 2, z: 0 })] : [])], doors: [] };
  if (room === "kitchen") return { stairs: [], doors: [doorway("right", "parlour")] };
  return { stairs: [ladder(rw, null, "bedroom", { x: rw - 1, z: 1 })], doors: [] };
}

const freeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === "object") freeze(v); return Object.freeze(o); };
function buildLayout(id, level) {
  const room = findRoom(id), size = ROOM_SIZES[id]?.[level];
  if (!room || !size || level < room.level) return null;
  const [w, d] = size, open = (other) => findRoom(other).level <= level;
  const { stairs, doors } = fixtures(id, w, open);
  const cells = new Map(), block = (x, z) => x >= 0 && x < w && z >= 0 && z < d && cells.set(x + "," + z, { x, z });
  for (const st of stairs) {
    for (let x = st.x; x < st.x + st.w; x++) for (let z = st.z; z < st.z + st.d; z++) block(x, z);
    block(st.exit.x, st.exit.z);
  }
  for (const dr of doors) for (let z = dr.at; z < dr.at + dr.width; z++) block(dr.wall === "left" ? 0 : w - 1, z);
  const parlourW = ROOM_SIZES.parlour[level][0];
  return freeze({
    id, level, w, d, storey: STOREY[id], offset: id === "kitchen" ? -w : parlourW - (id === "parlour" ? parlourW : w),
    capacity: id === "parlour" ? HOUSE_LEVELS[level].capacity : room.capacity + 2 * (level - room.level),
    hooks: { from: HOOKS.from, to: w - 3 }, doors, stairs,
    blocked: [...cells.values()].sort((a, b) => a.z - b.z || a.x - b.x),
  });
}
const layouts = new Map();
export function roomLayout(s, room, level = s.house.level) {
  const key = room + "@" + level;
  if (!layouts.has(key)) layouts.set(key, buildLayout(room, level));
  return layouts.get(key);
}
// The ways out of a room: up or down the stairs, or through a doorway.
export function connections(s, room) {
  const L = roomLayout(s, room);
  if (!L) return [];
  return [...L.stairs.map((st) => ({ kind: st.kind, to: st.up ?? st.down, way: st.up ? "up" : "down" })), ...L.doors.map((dr) => ({ kind: "door", to: dr.to, way: "through" }))];
}
const linkLevel = (link) => Math.max(findRoom(link.from).level, findRoom(link.to).level);
// What growing into the next level brings: rooms that open or get bigger, and new stairs and doorways.
export function nextLevel(s) {
  const level = s.house.level + 1;
  if (!HOUSE_LEVELS[level]) return null;
  const rooms = houseRooms.map((r) => {
    const a = roomLayout(s, r.id, level - 1), b = roomLayout(s, r.id, level);
    if (!b || (a && a.w === b.w && a.d === b.d && a.capacity === b.capacity)) return null;
    return { id: r.id, name: r.name, opens: !a, from: a && { w: a.w, d: a.d, capacity: a.capacity }, to: { w: b.w, d: b.d, capacity: b.capacity } };
  }).filter(Boolean);
  return { level, name: HOUSE_LEVELS[level].name, cost: HOUSE_LEVELS[level - 1].cost, rooms, links: HOUSE_LINKS.filter((l) => linkLevel(l) === level) };
}
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
// Bigger rooms hold more: the parlour by the house level, the others two more pieces a level after they open.
export const roomCapacity = (s, id) => roomLayout(s, id)?.capacity ?? 0;
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
// Whether a piece fits at x, z in an open room: on its floor and off the stairs
// and thresholds, or on the back wall's hooks, without overlapping another piece.
export function fits(s, room, id, x, z, ignore) {
  const L = roomLayout(s, room), f = footprint(id);
  if (!L || !Number.isInteger(x) || !Number.isInteger(z) || x < 0 || x + f.w > L.w) return false;
  if (f.layer === "wall" ? z !== 0 || x < L.hooks.from || x + f.w > L.hooks.to : z < 0 || z + f.d > L.d || L.blocked.some((c) => c.x >= x && c.x < x + f.w && c.z >= z && c.z < z + f.d)) return false;
  return !roomPieces(s, room).some((p) => p.instance !== ignore && overlaps({ id, x, z }, p));
}
// The first free spot, scanning from the back wall forwards.
export function findSpot(s, room, id, ignore) {
  const L = roomLayout(s, room);
  if (L) for (let z = 0; z < L.d; z++) for (let x = 0; x < L.w; x++) if (fits(s, room, id, x, z, ignore)) return { x, z };
  return null;
}

export function buyDecor(s, id) {
  const item = decorById[id];
  if (!item || s.house.owned.includes(id) || s.coins < item.price) return false;
  s.coins -= item.price;
  s.house.owned.push(id);
  return true;
}

// Grows the house a level. Rooms only get bigger, but new stairs and doorways
// take up floor: a piece in their way moves to a free spot in its room, or
// into storage if there's none. Returns what moved, for the notice.
export function upgradeHouse(s) {
  const h = s.house;
  if (h.level >= 3 || s.coins < HOUSE_LEVELS[h.level].cost) return false;
  s.coins -= HOUSE_LEVELS[h.level].cost;
  h.level++;
  const moved = [], stored = [];
  for (const p of [...h.placed]) {
    if (fits(s, p.room, p.id, p.x, p.z, p.instance)) continue;
    const spot = findSpot(s, p.room, p.id, p.instance);
    if (spot) { Object.assign(p, spot); moved.push({ instance: p.instance, id: p.id, room: p.room, ...spot }); }
    else { removeDecor(s, p.instance); stored.push({ instance: p.instance, id: p.id, room: p.room }); }
  }
  return { level: h.level, moved, stored };
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

// Keeps what makes sense from a saved house; anything unknown is dropped. A
// piece out of place (on stairs a save from before the house grew never had,
// say) moves to the first free spot in its room, or into storage.
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
  const used = new Set(), booked = new Set(), later = [];
  const keep = (p, x, z) => {
    used.add(p.id);
    const books = (Array.isArray(p.books) ? p.books : []).filter((b) => s.house.owned.includes(b) && decorById[b]?.category === "books" && !booked.has(b)).slice(0, shelfCapacity(p.id));
    books.forEach((b) => booked.add(b));
    s.house.placed.push({ ...placedPiece(typeof p.instance === "string" ? p.instance : "piece-r" + s.house.placed.length, p.id, p.room, x, z, books), flip: !!p.flip });
  };
  const roomFor = (p) => roomPieces(s, p.room).length < roomCapacity(s, p.room);
  for (const p of Array.isArray(raw.placed) ? raw.placed : []) {
    const item = decorById[p?.id];
    if (!item || !s.house.owned.includes(p.id) || used.has(p.id) || !known(p.room) || ["books", "wallpaper"].includes(item.category) || !roomFor(p)) continue;
    if (fits(s, p.room, p.id, p.x, p.z)) keep(p, p.x, p.z);
    else later.push(p);
  }
  // Out-of-place pieces go after the rest, so they never take a spot a well-placed piece holds.
  for (const p of later) {
    const spot = !used.has(p.id) && roomFor(p) && findSpot(s, p.room, p.id);
    if (spot) keep(p, spot.x, spot.z);
  }
  s.house.nextInstance = Number.isSafeInteger(raw.nextInstance) ? Math.max(raw.nextInstance, s.house.placed.length) : s.house.placed.length + 1;
  while (s.house.placed.some((p) => p.instance === "piece-" + s.house.nextInstance)) s.house.nextInstance++;
  for (const id of s.house.owned) {
    const pages = libraryStories[id]?.pages;
    if (pages && Number.isInteger(raw.reading?.[id])) s.house.reading[id] = Math.max(0, Math.min(pages.length - 1, raw.reading[id]));
  }
  return s.house;
}
