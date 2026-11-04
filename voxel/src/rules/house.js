// The cottage and its rooms. The catalogue, room styles, house levels,
// haunting points and base catalogue come from the main game. Voxel-only home
// content adds collections of small objects and an optional bathroom wing.
// Every room is a voxel diorama with floor placement and free 2D wall mounting.
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
import { decorCatalog as baseDecorCatalog, decorCategories as baseDecorCategories } from "../../../src/content/catalog.mjs";
import { tierOpen } from "./unlocks.js";
import { PREMIUM_WALL_CATALOG } from "../content/premium-wall-catalog.js";
import { PREMIUM_FURNITURE_CATALOG } from "../content/premium-furniture-catalog.js";
import { KITCHEN_EQUIPMENT } from "../content/kitchen-equipment.js";
import { HOME_FURNISHINGS } from "../content/home-furnishings.js";
import { HOUSEHOLD_CATALOG } from "../content/household-catalog.js";
import { HOUSEHOLD_SIZES } from "../content/household-sizes.js";
import { PET_FURNISHINGS, PET_FURNISHING_SIZES } from "../content/pet-furnishings.js";
import { findRoom, findRoomStyle, freshRoomStyles, houseRooms, parlourInteriors, roomStyles, roomWallOpenings } from "../content/home-rooms.js";
import { freshRoomExtensions, restoreRoomExtensions } from "./room-extensions.js";
import { restoreHomeMedia } from "./home-media.js";
import { WALL_HEIGHT, wallBounds, wallRectanglesOverlap } from "./wall-placement.js";
import { libraryStories } from "../../../src/content/library.mjs";
import { validPieceColour } from "./piece-colours.js";
import { SHELF_CATALOG } from "../content/shelf-catalog.js";
import { canRide, isShelf, validFinish, surfacesOf, standsOn, ridersClash } from "./surfaces.js";
import { DECOR_SIZES as BASE_DECOR_SIZES } from "../content/decor-sizes.js";
import { KITCHEN_EQUIPMENT_SIZES } from "../content/kitchen-equipment-sizes.js";
import { HOME_FURNISHING_SIZES } from "../content/home-furnishing-sizes.js";

const DECOR_SIZES = { ...BASE_DECOR_SIZES, ...KITCHEN_EQUIPMENT_SIZES, ...HOME_FURNISHING_SIZES, ...PET_FURNISHING_SIZES, ...HOUSEHOLD_SIZES };

const decorCatalog = [...baseDecorCatalog, ...PREMIUM_WALL_CATALOG, ...PREMIUM_FURNITURE_CATALOG, ...SHELF_CATALOG, ...KITCHEN_EQUIPMENT, ...HOME_FURNISHINGS, ...PET_FURNISHINGS, ...HOUSEHOLD_CATALOG];
const decorById = Object.fromEntries(decorCatalog.map(item=>[item.id,item]));
const decorCategories = baseDecorCategories.map(([id,name])=>[id,id === "all" ? `All ${decorCatalog.length}` : id === "shelves" ? "Shelves" : name]);
export { decorById, decorCatalog, decorCategories, houseRooms, roomStyles, libraryStories };

// What each level of the house costs to move on from, and how many pieces its parlour holds.
export const HOUSE_LEVELS = [
  { name: "Little cottage", capacity: 48, cost: 650, text: "Stairs up to a new bedroom, and a wider parlour for a collection of little treasures." },
  { name: "Crooked cottage", capacity: 64, cost: 2600, text: "A doorway through to a new kitchen, and bigger rooms all round." },
  { name: "Midnight manor", capacity: 80, cost: 9000, text: "A ladder up to the attic, and more space for our perfectly spooky home." },
  { name: "Haunted haven", capacity: 96, cost: 0, text: "Four rooms and an optional bathroom for our perfectly spooky forever home." },
];

// The little cottage's parlour. HOOKS remains the legacy central-panel guide;
// actual wall placement now follows its full surface and authored apertures.
export const GRID = { w: 10, d: 6 };
export const HOOKS = { from: 3, to: 7 };

// Each room's floor [w, d] by house level, from the level it opens. Kept modest:
// the rooms are drawn at high voxel density.
export const ROOM_SIZES = {
  parlour: [[10, 6], [12, 6], [13, 7], [14, 7]],
  bedroom: [, [10, 6], [11, 6], [12, 7]],
  kitchen: [, , [10, 6], [11, 7]],
  attic: [, , , [12, 6]],
  bathroom: [, , [6, 6], [6, 6]],
};
const STOREY = { parlour: 0, kitchen: 0, bathroom: 0, bedroom: 1, attic: 2 };
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
  if (room === "kitchen") return { stairs: [], doors: [doorway("right", "parlour"), ...(open("bathroom") ? [doorway("left", "bathroom")] : [])] };
  if (room === "bathroom") return { stairs: [], doors: [doorway("right", "kitchen")] };
  if (room === "attic") return { stairs: [ladder(rw, null, "bedroom", { x: rw - 1, z: 1 })], doors: [] };
  return { stairs: [], doors: [] };
}

const freeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === "object") freeze(v); return Object.freeze(o); };
function buildLayout(id, level, bathroom = false) {
  const room = findRoom(id), size = ROOM_SIZES[id]?.[level];
  if (!room || !size || level < room.level || (id === "bathroom" && !bathroom)) return null;
  const [w, d] = size, open = (other) => !!findRoom(other) && findRoom(other).level <= level && (other !== "bathroom" || bathroom);
  const { stairs, doors } = fixtures(id, w, open);
  const cells = new Map(), block = (x, z) => x >= 0 && x < w && z >= 0 && z < d && cells.set(x + "," + z, { x, z });
  for (const st of stairs) {
    for (let x = st.x; x < st.x + st.w; x++) for (let z = st.z; z < st.z + st.d; z++) block(x, z);
    block(st.exit.x, st.exit.z);
  }
  for (const dr of doors) for (let z = dr.at; z < dr.at + dr.width; z++) block(dr.wall === "left" ? 0 : w - 1, z);
  const parlourW = ROOM_SIZES.parlour[level][0];
  return freeze({
    id, level, w, d, storey: STOREY[id], offset: id === "bathroom" ? -ROOM_SIZES.kitchen[level][0] - w : id === "kitchen" ? -w : parlourW - (id === "parlour" ? parlourW : w),
    capacity: id === "parlour" ? HOUSE_LEVELS[level].capacity : 48 + 8 * (level - room.level),
    hooks: { from: HOOKS.from, to: w - 3 }, doors, stairs,
    blocked: [...cells.values()].sort((a, b) => a.z - b.z || a.x - b.x),
  });
}
const layouts = new Map();
export function roomLayout(s, room, level = s.house.level) {
  const bathroom = s.house.extensions?.bathroom === true, key = room + "@" + level + "@" + Number(bathroom);
  if (!layouts.has(key)) layouts.set(key, buildLayout(room, level, bathroom));
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
  const item = decorById[id], [w, d] = SIZES[id] ?? item.footprint ?? [item.wallWidth ?? 1, 1];
  return { w, d: item.wall ? 1 : d, layer: item.wall ? "wall" : item.rug ? "rug" : "floor" };
}
export const shelfCapacity = (id) => decorById[id]?.capacity || 0;

const placedPiece = (instance, id, room, x, z, books = []) => ({ instance, id, room, x, z, flip: false, books: [...books] });
export function freshHouse() {
  return {
    level: 0, activeRoom: "parlour", roomStyles: freshRoomStyles(), ownedRoomStyles: [],
    owned: ["f01", "f11", "b01"], copies: { f01: 1, f11: 1, b01: 1 }, extensions: freshRoomExtensions(), wallpapers: {}, nextInstance: 2, reading: {},
    placed: [placedPiece("piece-0", "f01", "parlour", 2, 3), placedPiece("piece-1", "f11", "parlour", 6, 0, ["b01"])],
  };
}

export const roomUnlocked = (s, id) => !!findRoom(id) && s.house.level >= findRoom(id).level && (id !== "bathroom" || s.house.extensions?.bathroom === true);
// Room budgets leave room for small collections; collision still prevents a
// crowded floor from accepting another large piece.
export const roomCapacity = (s, id) => roomLayout(s, id)?.capacity ?? 0;
export const roomPieces = (s, id = s.house.activeRoom) => s.house.placed.filter((p) => p.room === id);
// The parlour's look follows the house level; other rooms have a free and a paid style.
export function roomStyle(s, id) {
  const chosen = s.house.roomStyles[id];
  return id === "parlour" && (!chosen || chosen === "house-default") ? parlourInteriors[s.house.level] : findRoomStyle(chosen) ?? findRoomStyle(findRoom(id).baseStyle);
}

// Rotated floor pieces use their enclosing footprint; side-wall coordinates run
// along that wall, so existing back-wall saves retain exactly their positions.
export const decorAngle = (n) => Number.isFinite(n) ? ((n % 360) + 360) % 360 : 0;
export const DECOR_STEP = 0.1;
export const snapDecorPosition = (n, step = DECOR_STEP) => +(step > 0 ? Math.round(n / step) * step : n).toFixed(6);
export function pieceFootprint(p) {
  const fp = footprint(p.id);
  if (fp.layer === "wall") return fp;
  const a = decorAngle(p.rotation) * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  return { ...fp, w: +(fp.w * c + fp.d * s).toFixed(6), d: +(fp.w * s + fp.d * c).toFixed(6) };
}
const surface = (p) => ["left", "right"].includes(p.wall) ? p.wall : "back";
// Heights are measured from the very same native props used by the renderer.
// Blank shelf recipes are authored at 40 voxels per room unit; their native
// envelopes are deliberately kept here rather than importing Three.js models.
const SHELF_WALL_HEIGHTS = { "shelf-floating": 0.15, "shelf-bracket": 0.55, "shelf-two-tier": 1.975 };
export function wallPieceHeight(piece) {
  const id = typeof piece === "string" ? piece : piece?.id, item = decorById[id];
  const measured = item?.wallHeight ?? DECOR_SIZES[id]?.box?.[4] ?? SHELF_WALL_HEIGHTS[id] ?? item?.height;
  return Number.isFinite(measured) && measured > 0 ? measured : 1;
}
// Legacy saves have no y: keep the old centred panel mount (or chandelier
// ceiling drop) exactly until the player moves that piece vertically.
export function wallMountHeight(s, p) {
  if (Number.isFinite(p?.y)) return p.y;
  const height = wallPieceHeight(p);
  return p?.id === "d04" ? WALL_HEIGHT - 0.45 - height : (decorById[p?.id]?.hangHeight ?? 2.9) - height / 2;
}
export function wallPlacementRange(s, p) {
  const L = roomLayout(s, p.room) ?? GRID;
  return wallBounds(surface(p) === "back" ? L.w : L.d, footprint(p.id).w, wallPieceHeight(p));
}
// The shell and placement rules share authored apertures. Windows, built-in
// shelves and trim occupy only their real rectangles, leaving wall space above
// and below usable. Openings and stairs come from the room's current layout.
export function wallZones(s, room, wall = "back") {
  const L = roomLayout(s, room);
  if (!L || !["back", "left", "right"].includes(wall)) return [];
  const zones = roomWallOpenings(roomStyle(s, room).id, L.w, L.d, wall, L).map((z) => ({ ...z }));
  for (const dr of L.doors) if (dr.wall === wall) zones.push({ kind: "door", x: dr.at - 0.05, y: 0, w: dr.width + 0.1, h: 3.6 });
  for (const st of L.stairs) {
    if (st.wall === wall) zones.push({ kind: st.kind, x: wall === "back" ? st.x : st.z, y: 0, w: wall === "back" ? st.w : st.d, h: WALL_HEIGHT });
    else if (wall === "back" && st.z === 0) zones.push({ kind: st.kind, x: st.x, y: 0, w: st.w, h: WALL_HEIGHT });
  }
  return zones;
}
// What a floor piece really takes up: its measured size (content/decor-sizes.js,
// from the models), never more than its cells, and where its art sits in them.
// Pieces without a measurement fill their cells.
export function pieceBody(id) {
  const f = footprint(id), b = DECOR_SIZES[id]?.box;
  if (!b || f.layer === "wall") return { w: f.w, d: f.d, ox: 0, oz: 0 };
  return { w: Math.min(f.w, Math.max(0.3, b[1] - b[0])), d: Math.min(f.d, Math.max(0.3, b[3] - b[2])), ox: (b[0] + b[1]) / 2, oz: (b[2] + b[3]) / 2 };
}
// Saved x/z remain the corner of the turned cells' enclosing box, as before.
// Collision uses the piece's measured rectangle, turned, so pieces stand as
// close as they look and reach into corners and against walls.
function floorRectangle(p) {
  const fp = pieceFootprint(p), m = pieceBody(p.id), a = decorAngle(p.rotation) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return { x: p.x + fp.w / 2 + m.ox * c + m.oz * s, z: p.z + fp.d / 2 - m.ox * s + m.oz * c, w: m.w / 2, d: m.d / 2, axes: [{ x: c, z: -s }, { x: s, z: c }] };
}
// Half the turned rectangle's width along the room's x and z.
const reach = (r) => ({ x: r.w * Math.abs(r.axes[0].x) + r.d * Math.abs(r.axes[1].x), z: r.w * Math.abs(r.axes[0].z) + r.d * Math.abs(r.axes[1].z) });
// The x and z a floor piece's corner may take in its room, at its turn: for
// clamping drags, taps and turns to the walls.
export function placementRange(s, p) {
  if (footprint(p.id).layer === "wall") return wallPlacementRange(s, p);
  const L = roomLayout(s, p.room) ?? GRID, r = floorRectangle({ ...p, x: 0, z: 0 }), h = reach(r);
  return { x0: h.x - r.x, x1: L.w - h.x - r.x, z0: h.z - r.z, z1: L.d - h.z - r.z };
}
function rectanglesOverlap(a, b) {
  for (const axis of [...a.axes, ...b.axes]) {
    const radius = r => r.w * Math.abs(axis.x * r.axes[0].x + axis.z * r.axes[0].z) + r.d * Math.abs(axis.x * r.axes[1].x + axis.z * r.axes[1].z);
    if (Math.abs((b.x - a.x) * axis.x + (b.z - a.z) * axis.z) >= radius(a) + radius(b) - 1e-6) return false;
  }
  return true;
}
function overlaps(a, b) {
  if (a.on || b.on) return false;                                    // riders keep to their tops
  const fa = pieceFootprint(a), fb = pieceFootprint(b);
  if (fa.layer !== fb.layer || (fa.layer === "wall" && surface(a) !== surface(b))) return false;
  if (fa.layer === "wall") return wallRectanglesOverlap({ x: a.x, y: wallMountHeight(null, a), w: fa.w, h: wallPieceHeight(a) }, { x: b.x, y: wallMountHeight(null, b), w: fb.w, h: wallPieceHeight(b) });
  return rectanglesOverlap(floorRectangle(a), floorRectangle(b));
}
export function fits(s, room, id, x, z, ignore, options) {
  if (!decorById[id]) return false;
  const existing = s.house.placed.find((p) => p.instance === ignore), candidate = { ...existing, ...options, id, room, x, z };
  if (candidate.on) return riderFits(s, room, candidate, ignore);
  const L = roomLayout(s, room), f = pieceFootprint(candidate), wall = surface(candidate);
  if (!L || !Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (f.layer === "wall") {
    const y = wallMountHeight(s, candidate), bounds = wallPlacementRange(s, candidate);
    if (z !== 0 || !Number.isFinite(y) || (Object.hasOwn(candidate, "y") && !Number.isFinite(candidate.y)) || x < bounds.x0 - 1e-6 || x > bounds.x1 + 1e-6 || y < bounds.y0 - 1e-6 || y > bounds.y1 + 1e-6) return false;
    if (wallZones(s, room, wall).some((zone) => wallRectanglesOverlap({ x, y, w: f.w, h: wallPieceHeight(candidate) }, zone))) return false;
  } else {
    const rect = floorRectangle(candidate), h = reach(rect);
    if (rect.x - h.x < -1e-6 || rect.x + h.x > L.w + 1e-6 || rect.z - h.z < -1e-6 || rect.z + h.z > L.d + 1e-6) return false;
    if (L.blocked.some(c => rectanglesOverlap(rect, { x: c.x + .5, z: c.z + .5, w: .5, d: .5, axes: [{ x: 1, z: 0 }, { x: 0, z: 1 }] }))) return false;
  }
  return !roomPieces(s, room).some((p) => p.instance !== ignore && overlaps(candidate, p));
}
export function findSpot(s, room, id, ignore, options) {
  const L = roomLayout(s, room), existing = s.house.placed.find((p) => p.instance === ignore), wall = surface({ ...existing, ...options });
  if (L && footprint(id).layer === "wall") {
    // A player's explicit destination stays on that wall. Ordinary placement
    // can use any wall, important in a kitchen with a large built-in hearth.
    const walls = ["back", "left", "right"].includes(options?.wall) ? [wall] : [wall, ...["back", "left", "right"].filter((w) => w !== wall)];
    for (const target of walls) {
      const p = { ...existing, ...options, id, room, wall: target }, bounds = wallPlacementRange(s, p), mounted = wallMountHeight(s, p);
      if (bounds.x1 < bounds.x0 || bounds.y1 < bounds.y0) continue;
      // Keep a chosen/legacy height first. Only search up and down if that row
      // has no room, instead of shifting an existing arrangement unnecessarily.
      const heights = [mounted];
      for (let y = bounds.y0; y <= bounds.y1 + 1e-6; y = snapDecorPosition(y + DECOR_STEP, 0.05)) if (Math.abs(y - mounted) > 1e-6) heights.push(y);
      for (const y of heights) for (let x = bounds.x0; x <= bounds.x1 + 1e-6; x = snapDecorPosition(x + DECOR_STEP, 0.05)) if (fits(s, room, id, x, 0, ignore, { ...options, wall: target, y })) return { x, z: 0, ...(target !== "back" || existing?.wall || options?.wall ? { wall: target } : {}), ...(Number.isFinite(p.y) || Math.abs(y - mounted) > 1e-6 ? { y } : {}) };
    }
    return null;
  }
  const limit = L?.w;
  const step = DECOR_STEP;
  if (L) for (let z = 0; z < L.d; z = snapDecorPosition(z + step)) for (let x = 0; x < limit; x = snapDecorPosition(x + step)) if (fits(s, room, id, x, z, ignore, options)) return { x, z };
  return null;
}
// Rotation keeps the centre fixed, and never commits a collision or clips stairs.
export function rotateDecor(s, instance, degrees) {
  const p = s.house.placed.find((q) => q.instance === instance);
  if (!p || s.paused || !Number.isFinite(degrees) || footprint(p.id).layer === "wall") return false;
  if (p.on) { const rotation = decorAngle(degrees); if (!fits(s, p.room, p.id, p.x, p.z, instance, { rotation })) return false; p.rotation = rotation; return true; }
  const before = pieceFootprint(p), rotation = decorAngle(degrees), after = pieceFootprint({ ...p, rotation });
  const L = roomLayout(s, p.room), range = placementRange(s, { ...p, rotation });
  if (!L || range.x0 > range.x1 + 1e-6 || range.z0 > range.z1 + 1e-6) return false;
  const x = +Math.max(range.x0, Math.min(range.x1, p.x + (before.w - after.w) / 2)).toFixed(6), z = +Math.max(range.z0, Math.min(range.z1, p.z + (before.d - after.d) / 2)).toFixed(6);
  if (!fits(s, p.room, p.id, x, z, instance, { rotation })) return false;
  Object.assign(p, { x, z, rotation }); return true;
}
export function setDecorWall(s, instance, wall) {
  const p = s.house.placed.find((q) => q.instance === instance);
  if (!p || s.paused || footprint(p.id).layer !== "wall" || !["back", "left", "right"].includes(wall)) return false;
  const spot = fits(s, p.room, p.id, p.x, 0, instance, { wall }) ? { x: p.x, z: 0 } : findSpot(s, p.room, p.id, instance, { wall });
  if (!spot) return false;
  Object.assign(p, spot, { wall }); return true;
}
export function moveWallDecor(s, instance, wall, x, y) {
  const p = s.house.placed.find((q) => q.instance === instance);
  if (!p || s.paused || footprint(p.id).layer !== "wall" || !["back", "left", "right"].includes(wall) || !Number.isFinite(y) || !fits(s, p.room, p.id, x, 0, instance, { wall, y })) return false;
  Object.assign(p, { wall, x, y, z: 0 });
  return true;
}

const copyable = (id) => !!decorById[id] && !["books", "wallpaper"].includes(decorById[id].category);
const validCopyCount = (n) => Number.isSafeInteger(n) && n >= 0 ? Math.min(n, 999) : 0;
// owned remains the unique catalogue/library list used by existing saves. copies
// counts all paid instances, including pieces currently standing in a room.
export function ownedCopies(s, id) {
  if (!decorById[id] || !s.house.owned.includes(id)) return 0;
  return copyable(id) ? Math.max(1, validCopyCount(s.house.copies?.[id])) : 1;
}
export const placedCopies = (s, id) => s.house.placed.filter((p) => p.id === id).length;
export function availableCopies(s, id) {
  if (decorById[id]?.category === "books") return availableBook(s, id) ? 1 : 0;
  if (decorById[id]?.category === "wallpaper") return ownedCopies(s, id);
  return Math.max(0, ownedCopies(s, id) - placedCopies(s, id));
}
export function buyDecor(s, id) {
  const item = decorById[id];
  const owned = ownedCopies(s, id);
  if (!item || (!copyable(id) && owned) || owned >= 999 || s.coins < item.price) return false;
  s.coins -= item.price;
  if (!s.house.owned.includes(id)) s.house.owned.push(id);
  s.house.copies ??= {};
  s.house.copies[id] = owned + 1;
  return true;
}

// Shell changes (a new doorway, a different wall finish) must not leave objects
// inside their fixtures. Rehome only affected pieces; storage retains all paid
// copies if a very full room has no safe position left.
export function reconcileRoomPlacement(s, room) {
  const moved = [], stored = [];
  for (const p of [...roomPieces(s, room)]) {
    if (!s.house.placed.includes(p) || fits(s, p.room, p.id, p.x, p.z, p.instance)) continue;
    const spot = p.on ? null : findSpot(s, p.room, p.id, p.instance);
    if (spot) { Object.assign(p, spot); moved.push({ instance: p.instance, id: p.id, room: p.room, ...spot }); }
    else { for (const q of [p, ...ridersOf(s, p.instance)]) stored.push({ instance: q.instance, id: q.id, room: q.room }); removeDecor(s, p.instance); }
  }
  return { moved, stored };
}

// Grows the house a level. Rooms only get bigger, but new stairs and doorways
// take up floor: a piece in their way moves to a free spot in its room, or
// into storage if there's none. Returns what moved, for the notice.
export function upgradeHouse(s) {
  const h = s.house;
  if (h.level >= 3 || s.coins < HOUSE_LEVELS[h.level].cost || !tierOpen(s, "house", null, h.level)) return false;
  s.coins -= HOUSE_LEVELS[h.level].cost;
  h.level++;
  const results = houseRooms.map((r) => reconcileRoomPlacement(s, r.id)), moved = results.flatMap((r) => r.moved), stored = results.flatMap((r) => r.stored);
  return { level: h.level, moved, stored };
}

// Puts an owned piece into a room at the first free spot. Returns its instance id.
export function placeDecor(s, id, room = s.house.activeRoom) {
  const item = decorById[id], h = s.house;
  if (!item || ["books", "wallpaper"].includes(item.category) || availableCopies(s, id) <= 0) return null;
  if (!roomUnlocked(s, room) || roomPieces(s, room).length >= roomCapacity(s, room)) return null;
  const spot = findSpot(s, room, id);
  if (!spot) return null;
  h.nextInstance = Number.isSafeInteger(h.nextInstance) && h.nextInstance >= 0 ? h.nextInstance : 0;
  while (h.placed.some((p) => p.instance === "piece-" + h.nextInstance)) h.nextInstance++;
  const instance = "piece-" + h.nextInstance++;
  h.placed.push({ ...placedPiece(instance, id, room, spot.x, spot.z), ...(spot.wall ? { wall: spot.wall } : {}), ...(Number.isFinite(spot.y) ? { y: spot.y } : {}), ...(isShelf(id) ? { finish: item.finishes[0].id } : {}) });
  return instance;
}

export function moveDecor(s, instance, x, z) {
  const p = s.house.placed.find((q) => q.instance === instance);
  if (!p || s.paused || !fits(s, p.room, p.id, x, z, instance)) return false;
  p.x = x; p.z = z;
  return true;
}
// Carries a piece to another room, to its first free spot there.
export function sendToRoom(s, instance, room) {
  const p = s.house.placed.find((q) => q.instance === instance), riders = p ? ridersOf(s, instance) : [];
  if (!p || p.room === room || !roomUnlocked(s, room) || roomPieces(s, room).length + 1 + riders.length > roomCapacity(s, room)) return false;
  const spot = findSpot(s, room, p.id, undefined, { rotation: p.rotation, wall: p.wall, ...(Number.isFinite(p.y) ? { y: p.y } : {}) });
  if (!spot) return false;
  offTop(p);
  Object.assign(p, { room, ...spot });
  for (const r of riders) r.room = room;
  return true;
}
export function flipDecor(s, instance) {
  const p = s.house.placed.find((q) => q.instance === instance);
  if (!p) return false;
  p.flip = !p.flip;
  mirrorRiders(s, p);
  return true;
}
// What stands on a piece mirrors with it, as its tops do.
function mirrorRiders(s, p) {
  const w = footprint(p.id).w;
  for (const r of ridersOf(s, p.instance)) { r.x = +(w - r.x).toFixed(6); if (r.rotation) r.rotation = decorAngle(-r.rotation); }
}
// Back into storage, with whatever stands on it; any books on it go back on the pile.
export function removeDecor(s, instance) {
  const i = s.house.placed.findIndex((p) => p.instance === instance);
  if (i < 0) return false;
  s.house.placed.splice(i, 1);
  for (let j = s.house.placed.length - 1; j >= 0; j--) if (s.house.placed[j].on === instance) s.house.placed.splice(j, 1);
  return true;
}

// ── Small pieces on tables and shelves (rules/surfaces.js has the shapes) ──
//   hostSurfaces(p) → its flat tops, [{ x, z, w, d, y, h? }] in its own frame
//   ridersOf(s, instance) → the pieces standing on it
//   putOnTop(s, instance, host?, near?) → the host it now stands on, or false. With no
//     host, the next top with room: the nearest from the floor, then round the room.
//   setDown(s, instance) → back on the floor, as near its host as there is room
//   hostYaw(p) → which way a host faces, in degrees, for nudging what stands on it
export const hostSurfaces = (p) => { const f = footprint(p.id); return surfacesOf(p.id, f.w, f.d, f.layer === "wall", p.flip); };
export const ridersOf = (s, instance) => s.house.placed.filter((p) => p.on === instance);
export const hostYaw = (p) => footprint(p.id).layer === "wall" ? { left: 90, right: -90 }[p.wall] ?? 0 : decorAngle(p.rotation);
const offTop = (p) => { delete p.on; delete p.top; };
function riderFits(s, room, c, ignore) {
  const host = s.house.placed.find((p) => p.instance === c.on);
  if (!host || host.on || host.instance === ignore || host.room !== room || !canRide(c.id)) return false;
  const t = hostSurfaces(host)[c.top];
  if (!t || !Number.isFinite(c.x) || !Number.isFinite(c.z) || !standsOn(t, c.id, c.x, c.z, c.rotation)) return false;
  return !s.house.placed.some((p) => p.instance !== ignore && p.on === c.on && p.top === c.top && ridersClash(c, p));
}
// The free place on a host's tops nearest a point in its frame (a top's middle
// if none), on the 0.1 grid; one top only when given.
function findTopSpot(s, id, host, ignore, rotation = 0, near, only) {
  let best = null;
  hostSurfaces(host).forEach((t, top) => {
    if (only !== undefined && top !== only) return;
    const aim = near ?? { x: t.x + t.w / 2, z: t.z + t.d / 2 };
    for (let x = snapDecorPosition(t.x); x <= t.x + t.w + 1e-6; x = snapDecorPosition(x + DECOR_STEP)) for (let z = snapDecorPosition(t.z); z <= t.z + t.d + 1e-6; z = snapDecorPosition(z + DECOR_STEP)) {
      const far = (x - aim.x) ** 2 + (z - aim.z) ** 2 + (near?.y !== undefined ? (t.y - near.y) ** 2 : 0);
      if ((!best || far < best.far - 1e-9) && riderFits(s, host.room, { id, on: host.instance, top, x, z, rotation }, ignore)) best = { top, x, z, far };
    }
  });
  return best && { top: best.top, x: best.x, z: best.z };
}
// Where a piece is in its room, roughly, for "nearest".
function roomSpot(s, p) {
  if (p.on) { const host = s.house.placed.find((q) => q.instance === p.on); return host ? roomSpot(s, host) : { x: 0, z: 0 }; }
  const f = pieceFootprint(p), mid = p.x + f.w / 2;
  if (f.layer !== "wall") return { x: mid, z: p.z + f.d / 2 };
  return p.wall === "left" ? { x: 0, z: mid } : p.wall === "right" ? { x: roomLayout(s, p.room)?.w ?? 0, z: mid } : { x: mid, z: 0 };
}
export function putOnTop(s, instance, hostInstance, near) {
  const p = s.house.placed.find((q) => q.instance === instance);
  if (!p || s.paused || !canRide(p.id)) return false;
  const hosts = roomPieces(s, p.room).filter((h) => !h.on && h.instance !== instance && hostSurfaces(h).length);
  let tops;
  if (hostInstance) tops = hosts.filter((h) => h.instance === hostInstance).map((h) => [h, undefined]);
  else {
    const all = hosts.flatMap((h) => hostSurfaces(h).map((_, top) => [h, top]));
    const at = roomSpot(s, p), far = ([h]) => { const q = roomSpot(s, h); return (q.x - at.x) ** 2 + (q.z - at.z) ** 2; };
    const i = all.findIndex(([h, top]) => h.instance === p.on && top === p.top);
    tops = p.on ? [...all.slice(i + 1), ...all.slice(0, i)] : all.sort((a, b) => far(a) - far(b));
  }
  for (const [h, top] of tops) {
    const spot = findTopSpot(s, p.id, h, instance, p.rotation ?? 0, near, top);
    if (spot) { Object.assign(p, { on: h.instance }, spot); return h.instance; }
  }
  return false;
}
// The free floor spot nearest (x, z) on a coarse grid, or null.
function findSpotNear(s, room, id, ignore, options, x0, z0) {
  const L = roomLayout(s, room), f = pieceFootprint({ id, ...options });
  let best = null;
  if (L) for (let z = 0; z + f.d <= L.d + 1e-6; z = snapDecorPosition(z + 0.25)) for (let x = 0; x + f.w <= L.w + 1e-6; x = snapDecorPosition(x + 0.25)) {
    const far = (x + f.w / 2 - x0) ** 2 + (z + f.d / 2 - z0) ** 2;
    if ((!best || far < best.far) && fits(s, room, id, x, z, ignore, options)) best = { x, z, far };
  }
  return best && { x: best.x, z: best.z };
}
export function setDown(s, instance) {
  const p = s.house.placed.find((q) => q.instance === instance);
  if (!p?.on || s.paused) return false;
  const at = roomSpot(s, p), spot = findSpotNear(s, p.room, p.id, instance, { on: undefined, rotation: p.rotation }, at.x, at.z);
  if (!spot) return false;
  offTop(p); Object.assign(p, spot);
  return true;
}
// Undo: back to an earlier pose, on a top or not, if it still fits.
export function restorePose(s, instance, pose) {
  const p = s.house.placed.find((q) => q.instance === instance);
  if (!p || !fits(s, pose.room, pose.id, pose.x, pose.z, instance, { on: undefined, top: undefined, ...pose })) return false;
  const flipped = !!p.flip !== !!pose.flip;
  offTop(p); Object.assign(p, pose);
  if (flipped) mirrorRiders(s, p);
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
  if (!style || style.level > s.house.level || !style.price || s.house.ownedRoomStyles.includes(styleId) || s.coins < style.price || !roomUnlocked(s, style.roomId)) return false;
  s.coins -= style.price;
  s.house.ownedRoomStyles.push(styleId);
  s.house.roomStyles[style.roomId] = styleId;
  reconcileRoomPlacement(s, style.roomId);
  return true;
}
export function setRoomStyle(s, styleId) {
  if (styleId === "house-default") {
    s.house.roomStyles.parlour = styleId;
    reconcileRoomPlacement(s, "parlour");
    return true;
  }
  const style = findRoomStyle(styleId);
  if (!style || style.level > s.house.level || !roomUnlocked(s, style.roomId) || (style.price && !s.house.ownedRoomStyles.includes(styleId))) return false;
  s.house.roomStyles[style.roomId] = styleId;
  reconcileRoomPlacement(s, style.roomId);
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
  const knownItem = (id) => typeof id === "string" && Object.hasOwn(decorById, id);
  const owned = Array.isArray(raw.owned) ? [...new Set(raw.owned.filter(knownItem))] : [...h.owned];
  const copies = Object.fromEntries(owned.map((id) => [id, 1]));
  if (raw.copies && typeof raw.copies === "object" && !Array.isArray(raw.copies)) for (const [id, n] of Object.entries(raw.copies)) {
    if (!knownItem(id) || !validCopyCount(n)) continue;
    if (!owned.includes(id)) owned.push(id);
    copies[id] = copyable(id) ? validCopyCount(n) : 1;
  }
  const s = { house: { ...h, level, placed: [], owned, copies, extensions: restoreRoomExtensions(raw.extensions) } };
  const known = (room) => roomUnlocked(s, room);
  for (const [room, id] of Object.entries(raw.roomStyles ?? {})) if (known(room) && ((id === "house-default" && room === "parlour") || (findRoomStyle(id)?.roomId === room && findRoomStyle(id).level <= level))) s.house.roomStyles[room] = id;
  s.house.ownedRoomStyles = [...new Set((Array.isArray(raw.ownedRoomStyles) ? raw.ownedRoomStyles : []).filter((id) => findRoomStyle(id)?.price > 0))];
  for (const [room, id] of Object.entries(raw.wallpapers ?? {})) if (known(room) && owned.includes(id) && decorById[id]?.category === "wallpaper") s.house.wallpapers[room] = id;
  s.house.activeRoom = known(raw.activeRoom) ? raw.activeRoom : "parlour";
  const booked = new Set(), instances = new Set(), aliases = new Map();
  // Repair duplicate instance keys independently of catalogue IDs. Riders retain
  // their original host's first instance, and every copy gets its own identity.
  const list = (Array.isArray(raw.placed) ? raw.placed : []).filter((p) => p && typeof p === "object" && !Array.isArray(p) && knownItem(p.id)).map((p, index) => {
    const original = typeof p.instance === "string" && p.instance.length > 0 && p.instance.length <= 128 ? p.instance : null;
    let instance = original ?? "piece-r" + index;
    let repair = 0;
    while (instances.has(instance)) instance = "piece-r" + index + "-" + repair++;
    instances.add(instance);
    if (original && !aliases.has(original)) aliases.set(original, instance);
    const q = { ...p, instance };
    if (footprint(p.id).layer === "wall") {
      delete q.y;
      if (Number.isFinite(p.y)) {
        const bounds = wallPlacementRange(s, q);
        q.y = Math.max(bounds.y0, Math.min(bounds.y1, p.y));
      }
    }
    return q;
  });
  for (const p of list) if (typeof p.on === "string") p.on = aliases.get(p.on) ?? p.on;
  const roomFor = (p) => roomPieces(s, p.room).length < roomCapacity(s, p.room) && availableCopies(s, p.id) > 0;
  const keep = (p, spot, on) => {
    const books = (Array.isArray(p.books) ? p.books : []).filter((b) => owned.includes(b) && decorById[b]?.category === "books" && !booked.has(b));
    const uniqueBooks = [...new Set(books)].slice(0, shelfCapacity(p.id));
    uniqueBooks.forEach((b) => booked.add(b));
    s.house.placed.push({ ...placedPiece(p.instance, p.id, p.room, spot.x, spot.z, uniqueBooks), flip: !!p.flip,
      ...(validPieceColour(p.tint) ? { tint: p.tint } : {}),
      ...(Number.isFinite(p.rotation) ? { rotation: decorAngle(p.rotation) } : {}),
      ...(["back", "left", "right"].includes(spot.wall ?? p.wall) ? { wall: spot.wall ?? p.wall } : {}),
      ...(footprint(p.id).layer === "wall" && Number.isFinite(spot.y ?? p.y) ? { y: spot.y ?? p.y } : {}),
      ...(isShelf(p.id) ? { finish: validFinish(p.id, p.finish) ? p.finish : decorById[p.id].finishes[0].id } : {}),
      ...(restoreHomeMedia(p.media) ? { media: restoreHomeMedia(p.media) } : {}),
      ...(on ? { on, top: p.top } : {}) });
  };
  const eligible = (p) => owned.includes(p.id) && known(p.room) && copyable(p.id) && roomFor(p);
  const pose = (p) => ({ rotation: p.rotation, wall: p.wall, ...(Number.isFinite(p.y) ? { y: p.y } : {}) });
  const riding = (p) => typeof p.on === "string";
  // Hosts/floor pieces first, preserving valid positions before repairing old
  // positions. Then their riders, so a relocated shelf still keeps its objects.
  for (const group of [list.filter((p) => !riding(p)), list.filter(riding)]) {
    const later = [];
    for (const p of group) {
      if (!eligible(p)) continue;
      const on = riding(p) && Number.isInteger(p.top) ? p.on : undefined;
      const options = { ...pose(p), ...(on ? { on, top: p.top } : {}) };
      if (fits(s, p.room, p.id, p.x, p.z, undefined, options)) keep(p, { x: p.x, z: p.z }, on);
      else later.push(p);
    }
    for (const p of later) {
      const spot = eligible(p) && findSpot(s, p.room, p.id, undefined, pose(p));
      if (spot) keep(p, spot);
    }
  }
  s.house.nextInstance = Number.isSafeInteger(raw.nextInstance) && raw.nextInstance >= 0 ? Math.max(Math.min(raw.nextInstance, 1e9), s.house.placed.length) : s.house.placed.length + 1;
  while (s.house.placed.some((p) => p.instance === "piece-" + s.house.nextInstance)) s.house.nextInstance++;
  for (const id of owned) {
    const pages = libraryStories[id]?.pages;
    if (pages && Number.isInteger(raw.reading?.[id])) s.house.reading[id] = Math.max(0, Math.min(pages.length - 1, raw.reading[id]));
  }
  return s.house;
}
