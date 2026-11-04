// Voxel-only room choices. Keep the original game's catalogue untouched.
import { houseRooms as originalRooms, parlourInteriors, roomStyles as originalStyles } from "../../../src/content/rooms.mjs";

export { parlourInteriors };
export const ROOM_EXTENSIONS = Object.freeze({
  bathroom: Object.freeze({ id: "bathroom", name: "The bathroom wing", description: "A quiet six-by-six bathroom beside the kitchen, ready for a bath, basin and laundry corner.", cost: 4500, level: 8, houseLevel: 2, w: 6, d: 6, capacity: 48 }),
});
export const houseRooms = [...originalRooms, { id: "bathroom", name: "Bathroom", level: 2, capacity: 48, description: "A little sanctuary for steamy baths and midnight laundry.", baseStyle: "bathroom-plum", extension: "bathroom" }];

const painted = (id, roomId, name, level, price, wall, wall2, floor = 0x654330) => ({
  id, roomId, name, level, price, plainWalls: true, description: "Uninterrupted painted walls, simple skirting and room for your own decorations.",
  look: { plainWalls: true, wall, wall2, wood: 0x564034, dark: 0x332632, trim: 0x9d7952, floor },
});
export const PLAIN_ROOM_STYLES = [
  painted("parlour-plain-cream", "parlour", "Moonmilk plaster", 0, 0, 0xe4d8c7, 0xd8cbb8),
  painted("parlour-plain-ember", "parlour", "Ember clay", 0, 150, 0xa25e48, 0x93543f),
  painted("parlour-plain-ink", "parlour", "Blackberry ink", 0, 450, 0x4a3658, 0x422e50),
  painted("bedroom-plain-cream", "bedroom", "Linen moon", 1, 0, 0xe0d2c7, 0xd1c3b9),
  painted("bedroom-plain-rose", "bedroom", "Dried rose", 1, 250, 0xa97783, 0x9b6b77),
  painted("bedroom-plain-lilac", "bedroom", "Evening lilac", 1, 500, 0x84708f, 0x786482),
  painted("kitchen-plain-cream", "kitchen", "Buttermilk paint", 2, 0, 0xe4d6ba, 0xd7c8aa),
  painted("kitchen-plain-sage", "kitchen", "Kitchen garden", 2, 350, 0x83927a, 0x75856d),
  painted("kitchen-plain-charcoal", "kitchen", "Charcoal pantry", 2, 650, 0x41434b, 0x383a43),
  painted("attic-plain-ash", "attic", "Ash plaster", 3, 0, 0xc3bfbc, 0xb5b0ae),
  painted("attic-plain-plum", "attic", "Witching plum", 3, 450, 0x69506f, 0x5e4565),
  painted("attic-plain-midnight", "attic", "Midnight blue", 3, 900, 0x37465f, 0x2f3c54),
];
export const BATHROOM_STYLES = [
  { ...painted("bathroom-plum", "bathroom", "Classic plum", 2, 0, 0x766079, 0x69546e), description: "Soft plum plaster, a frosted clerestory and pale porcelain floor tiles.", look: { plainWalls: true, wall: 0x766079, wall2: 0x69546e, wood: 0x574134, dark: 0x352a38, trim: 0xb29a73, floor: 0xd9d0c5, floorTiles: true, frostedWindow: true } },
  { ...painted("bathroom-tile", "bathroom", "Charcoal & cream", 2, 600, 0xe2dbce, 0xd4ccbe), description: "Cream glazed walls and a charcoal chequerboard floor.", look: { plainWalls: true, wall: 0xe2dbce, wall2: 0xd4ccbe, wood: 0x4b4140, dark: 0x35343e, trim: 0x8c8074, floor: 0xe3ddd0, floorTiles: true, checkerFloor: true, wallTiles: true, frostedWindow: true } },
  { ...painted("bathroom-sage", "bathroom", "Sage steam", 2, 850, 0x8eaa98, 0x819e8b), description: "Calm sage plaster, cream stone tiles and a misted window.", look: { plainWalls: true, wall: 0x8eaa98, wall2: 0x819e8b, wood: 0x5c4939, dark: 0x3c423d, trim: 0xb3a57d, floor: 0xdcd6c7, floorTiles: true, frostedWindow: true } },
];
export const roomStyles = [...originalStyles, ...PLAIN_ROOM_STYLES, ...BATHROOM_STYLES];
export const HOME_ROOM_LOOKS = Object.fromEntries([...PLAIN_ROOM_STYLES, ...BATHROOM_STYLES].map(style => [style.id, style.look]));
const byRoom = Object.fromEntries(houseRooms.map(room => [room.id, room])), byStyle = Object.fromEntries(roomStyles.map(style => [style.id, style]));
export const findRoom = id => typeof id === "string" && Object.hasOwn(byRoom, id) ? byRoom[id] : null;
export const findRoomStyle = id => typeof id === "string" && Object.hasOwn(byStyle, id) ? byStyle[id] : null;
export const freshRoomStyles = () => Object.fromEntries(houseRooms.map(room => [room.id, room.baseStyle]));

// Projecting fixtures and openings in the rendered shell. Coordinates along
// the back wall run left-to-right, along a side wall back-to-front; y is up.
// Doors and stairs belong to the room layout and are reserved by house.js.
export function roomWallOpenings(styleId, w, d, wall, layout = {}) {
  if (!["back", "left", "right"].includes(wall) || !(w > 0 && d > 0)) return [];
  const style = findRoomStyle(styleId), look = style?.look;
  if (style?.plainWalls) return wall === "back" && look?.frostedWindow ? [{ kind: "window", x: w / 2 - 0.875, y: 3.425, w: 1.75, h: 1.25 }] : [];
  const areas = [];
  if (wall === "back") {
    for (const x of [1.625, w - 1.625]) areas.push({ kind: "window", x: x - 0.875, y: 1.4375, w: 1.75, h: 2.75 });
    for (const x of [0.25, 3, w - 3, w - 0.25]) areas.push({ kind: "column", x: x - 0.375, y: 0, w: 0.75, h: 5.2 });
    if (styleId?.startsWith("attic-")) areas.push({ kind: "window", x: w / 2 - 1.1, y: 1.9, w: 2.2, h: 2.2 });
    if (styleId?.startsWith("kitchen-")) areas.push({ kind: "hearth", x: w / 2 - 1.8, y: 0, w: 3.6, h: 5.2 });
  } else {
    areas.push({ kind: "column", x: d - 0.625, y: 0, w: 0.75, h: 5.2 });
    if (styleId?.startsWith("kitchen-") && !(layout.doors ?? []).some(door => door.wall === wall)) {
      const length = Math.min(4, d - 2);
      areas.push({ kind: "shelves", x: d / 2 - 0.25 - length / 2, y: 2.25, w: length, h: 1.7 });
    }
  }
  return areas;
}
