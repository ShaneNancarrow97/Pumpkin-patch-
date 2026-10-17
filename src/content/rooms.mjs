var houseRooms = [
  { id: "parlour", name: "Parlour", level: 0, capacity: null, description: "Our reading corner and the heart of the house.", baseStyle: "house-default" },
  { id: "bedroom", name: "Bedroom", level: 1, capacity: 8, description: "A moonlit retreat for beds, books and quiet nights.", baseStyle: "bedroom-base" },
  { id: "kitchen", name: "Kitchen", level: 2, capacity: 8, description: "Copper pots, autumn preserves and room for a table.", baseStyle: "kitchen-base" },
  { id: "attic", name: "Attic", level: 3, capacity: 10, description: "A little more room beneath the haunted rafters.", baseStyle: "attic-base" }
];
var roomById = Object.fromEntries(houseRooms.map((room) => [room.id, room]));
var parlourInteriors = [
  { id: "parlour-warm", roomId: "parlour", name: "Warm cottage", path: "assets/house/room.webp", level: 0, price: 0 },
  { id: "parlour-crooked", roomId: "parlour", name: "Crooked cottage", path: "assets/house/room-crooked.webp", level: 1, price: 0 },
  { id: "parlour-manor", roomId: "parlour", name: "Midnight manor", path: "assets/house/room-manor.webp", level: 2, price: 0 },
  { id: "parlour-haunted", roomId: "parlour", name: "Haunted haven", path: "assets/house/room-haunted.webp", level: 3, price: 0 }
];
var roomStyles = [
  ...parlourInteriors,
  { id: "bedroom-base", roomId: "bedroom", name: "Rosewood night", path: "assets/house/bedroom-base.webp", level: 1, price: 0 },
  { id: "bedroom-celestial", roomId: "bedroom", name: "Celestial velvet", path: "assets/house/bedroom-celestial.webp", level: 1, price: 900 },
  { id: "kitchen-base", roomId: "kitchen", name: "Copper hearth", path: "assets/house/kitchen-base.webp", level: 2, price: 0 },
  { id: "kitchen-apothecary", roomId: "kitchen", name: "Witch’s apothecary", path: "assets/house/kitchen-apothecary.webp", level: 2, price: 1800 },
  { id: "attic-base", roomId: "attic", name: "Haunted rafters", path: "assets/house/attic-base.webp", level: 3, price: 0 },
  { id: "attic-starlight", roomId: "attic", name: "Starlight attic", path: "assets/house/attic-starlight.webp", level: 3, price: 3600 }
];
var roomStyleById = Object.fromEntries(roomStyles.map((style) => [style.id, style]));
var freshRoomStyles = () => Object.fromEntries(houseRooms.map((room) => [room.id, room.baseStyle]));
var findRoom = (id) => typeof id === "string" && Object.hasOwn(roomById, id) ? roomById[id] : null;
var findRoomStyle = (id) => typeof id === "string" && Object.hasOwn(roomStyleById, id) ? roomStyleById[id] : null;

export { findRoom, findRoomStyle, freshRoomStyles, houseRooms, parlourInteriors, roomStyles };
