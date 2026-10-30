// Play mode's ways through: the doorways, gates, stairs and ladders Shane and
// Natalie walk through, with no button, to the next place. A way is a strip just
// inside its doorway, where the owner's feet stop; the way they must be heading
// to go through; and where they come out on the other side, facing on.
// Places are "farm", "estate" (the garden) and "room:<id>". No renderer here,
// so the tests can check every way (test/play-ways.test.mjs).
import { roomLayout } from "./rules/house.js";
import { estateBounds } from "./rules/house-estate.js";
import { ESTATE_DECOR_BY_ID, ESTATE_HOUSE_SIZES, ESTATE_KITCHEN_WING } from "./content/house-estate.js";
import { HEDGE_ARCH } from "./content/farm-layout.js";
import { gardenBedAction } from "./rules/garden-crops.js";

// The feet are a circle of FEET; a strip runs REACH past where they stop.
const FEET = .25, REACH = .3, PLINTH = .2, GARDEN_EDGE = .45;
const strip = FEET + REACH;
export const inZone = (zone, p) => !!zone && p.x >= zone.x0 && p.x <= zone.x1 && p.z >= zone.z0 && p.z <= zone.z1;

const houseLevel = (s) => Math.max(0, Math.min(ESTATE_HOUSE_SIZES.length - 1, Math.trunc(s?.house?.level) || 0));
const house = (s) => ESTATE_HOUSE_SIZES[houseLevel(s)];
// Where the owner stands in the garden, just out of the front door, facing the gate.
export const gardenDoorstep = (s) => ({ place: "estate", x: 0, z: house(s).d / 2 + PLINTH + 1.6, face: { x: 0, z: 1 } });
const gardenGate = (s) => ({ place: "estate", x: 0, z: estateBounds(s).z1 - 1.8, face: { x: 0, z: -1 } });
const farmArch = { place: "farm", x: HEDGE_ARCH.x, z: 5.2, face: { x: 0, z: 1 } };

// Where carved lanterns stand on the terrace in front of the house, either
// side of the steps, nearest first (rules/carving.js keeps eight): beyond the
// porch's own pumpkins and clear of the window boxes.
export function lanternSpots(s) {
  const front = house(s).d / 2 + PLINTH + .75;
  return (s?.carving?.lanterns ?? []).map((_, i) => ({ x: (i % 2 ? 1 : -1) * (2.45 + Math.floor(i / 2) * .66), z: front }));
}
// The garden the owner walks: inside the fence, round the house, the porch
// posts, the open gate's leaves and every piece of garden decor. The rose
// arch is two posts, so they can walk through it.
export function gardenGeometry(s) {
  const b = estateBounds(s), { w, d } = house(s), obstacles = [{ x: 0, z: 0, w: w + 2 * PLINTH, d: d + 2 * PLINTH }];
  if (houseLevel(s) >= ESTATE_KITCHEN_WING.level) obstacles.push({ x: -w / 2 - ESTATE_KITCHEN_WING.out, z: ESTATE_KITCHEN_WING.z, w: ESTATE_KITCHEN_WING.w + .2, d: ESTATE_KITCHEN_WING.d + .2 });
  for (const side of [-1, 1]) {
    obstacles.push({ x: side * 1.23, z: d / 2 + 1.03, w: .3, d: .3 });
    obstacles.push({ x: side * 2, z: b.z1 - .55, w: .6, d: 1.15 });
  }
  for (const spot of lanternSpots(s)) obstacles.push({ x: spot.x, z: spot.z, w: .5, d: .5 });
  for (const p of s?.estate?.placed ?? []) {
    const def = ESTATE_DECOR_BY_ID[p.id]; if (!def || ![p.x, p.z].every(Number.isFinite)) continue;
    const angle = (Number(p.rotation) || 0) * Math.PI / 180;
    if (p.id === "rose-arch") for (const u of [-1.13, 1.13]) obstacles.push({ x: p.x + u * Math.cos(angle), z: p.z - u * Math.sin(angle), w: .4, d: .8, angle });
    else obstacles.push({ x: p.x, z: p.z, w: def.w, d: def.d, angle });
  }
  return { bounds: { x0: b.x0 + GARDEN_EDGE, x1: b.x1 - GARDEN_EDGE, z0: b.z0 + GARDEN_EDGE, z1: b.z1 - GARDEN_EDGE }, obstacles };
}

// Which side of a stair or ladder its exit cell touches, and the strip along it.
function stairSide(st) {
  const box = { x0: st.x, x1: st.x + st.w, z0: st.z, z1: st.z + st.d }, ex = st.exit.x + .5, ez = st.exit.z + .5;
  if (ez > box.z1) return { dir: { x: 0, z: -1 }, zone: { x0: box.x0, x1: box.x1, z0: box.z1, z1: box.z1 + strip }, exit: { x: ex, z: ez } };
  if (ez < box.z0) return { dir: { x: 0, z: 1 }, zone: { x0: box.x0, x1: box.x1, z0: box.z0 - strip, z1: box.z0 }, exit: { x: ex, z: ez } };
  if (ex < box.x0) return { dir: { x: 1, z: 0 }, zone: { x0: box.x0 - strip, x1: box.x0, z0: box.z0, z1: box.z1 }, exit: { x: ex, z: ez } };
  return { dir: { x: -1, z: 0 }, zone: { x0: box.x1, x1: box.x1 + strip, z0: box.z0, z1: box.z1 }, exit: { x: ex, z: ez } };
}
// Coming up or down into a room: off the foot of its own stair or ladder, a
// little further than the strip, facing away from it.
function stairArrival(s, room, from) {
  const L = roomLayout(s, room), st = L?.stairs.find((t) => (t.up ?? t.down) === from);
  if (!st) return roomMiddle(s, room);
  const { dir, exit } = stairSide(st);
  return { place: "room:" + room, x: exit.x - dir.x * .2, z: exit.z - dir.z * .2, face: { x: -dir.x, z: -dir.z } };
}
function doorArrival(s, room, from) {
  const L = roomLayout(s, room), dr = L?.doors.find((d) => d.to === from);
  if (!dr) return roomMiddle(s, room);
  const left = dr.wall === "left";
  return { place: "room:" + room, x: left ? 1 : L.w - 1, z: dr.at + dr.width / 2, face: { x: left ? 1 : -1, z: 0 } };
}
function roomMiddle(s, room) {
  const L = roomLayout(s, room) ?? { w: 10, d: 6 };
  return { place: "room:" + room, x: L.w / 2, z: L.d - 1, face: { x: 0, z: -1 } };
}
// In through the front door: the front of the parlour, heading in.
export const houseFront = (s) => ({ ...roomMiddle(s, "parlour"), z: (roomLayout(s, "parlour")?.d ?? 6) - 1.05 });
// Out of any room by its button: the garden, on the doorstep.
export const leaveHouse = (s) => ({ id: "out", kind: "front", to: "estate", zone: null, dir: { x: 0, z: 1 }, arrive: gardenDoorstep(s) });

function roomWays(s, id) {
  const L = roomLayout(s, id); if (!L) return [];
  const ways = [];
  // Ladders first: in the bedroom the ladder up stands on the stairs' landing,
  // so its strip wins there and the stairwell's side takes the rest.
  for (const st of [...L.stairs].sort((a, b) => (a.kind === "ladder" ? 0 : 1) - (b.kind === "ladder" ? 0 : 1))) {
    const to = st.up ?? st.down; if (!to) continue;
    const { dir, zone } = stairSide(st);
    ways.push({ id: (st.up ? "up:" : "down:") + to, kind: st.kind, to: "room:" + to, zone, dir, arrive: stairArrival(s, to, id) });
  }
  for (const dr of L.doors) {
    const left = dr.wall === "left";
    ways.push({ id: "door:" + dr.to, kind: "door", to: "room:" + dr.to, dir: { x: left ? -1 : 1, z: 0 }, arrive: doorArrival(s, dr.to, id),
      zone: { x0: left ? 0 : L.w - strip, x1: left ? strip : L.w, z0: dr.at + .3, z1: dr.at + dr.width - .3 } });
  }
  // The ground floor's open front is the way out to the garden.
  if (L.storey === 0) ways.push({ ...leaveHouse(s), zone: { x0: L.w / 2 - 1.2, x1: L.w / 2 + 1.2, z0: L.d - strip, z1: L.d } });
  return ways;
}

export function playWays(s, place) {
  if (!place || place === "farm") return [{ id: "arch", kind: "arch", to: "estate", zone: { x0: HEDGE_ARCH.x - 1.1, x1: HEDGE_ARCH.x + 1.1, z0: 3.5, z1: 4.5 }, dir: { x: 0, z: -1 }, arrive: gardenGate(s) }];
  if (place === "estate") {
    const b = estateBounds(s), front = house(s).d / 2 + PLINTH;
    return [
      { id: "front-door", kind: "door", to: "room:parlour", zone: { x0: -.75, x1: .75, z0: front, z1: front + strip }, dir: { x: 0, z: -1 }, arrive: houseFront(s) },
      { id: "gate", kind: "gate", to: "farm", zone: { x0: -1.5, x1: 1.5, z0: b.z1 - GARDEN_EDGE - strip, z1: b.z1 }, dir: { x: 0, z: 1 }, arrive: farmArch },
    ];
  }
  return place.startsWith("room:") ? roomWays(s, place.slice(5)) : [];
}

// The garden's prompts for the action button, as the rooms have for their
// doorways: in at the front door, out at the gate, and at each crop bed and
// carving bench.
export function gardenTargets(s) {
  const front = house(s).d / 2 + PLINTH, b = estateBounds(s), list = [
    { type: "go", way: "front-door", to: "parlour", label: "Go inside", x: 0, z: front + .5 },
    { type: "go", way: "gate", to: "farm", label: "Back to the farm", x: 0, z: b.z1 - .9 },
  ];
  for (const p of s?.estate?.placed ?? []) {
    const def = ESTATE_DECOR_BY_ID[p.id];
    // A big piece is reached from anywhere round it, corners included.
    const reach = def ? Math.hypot(def.w, def.d) / 2 + .7 : 2;
    if (def?.crop) { const act = gardenBedAction(s, p.instance); list.push({ type: "bed", instance: p.instance, kind: act.kind, label: act.label, x: p.x, z: p.z, reach }); }
    if (def?.carving) list.push({ type: "carve", instance: p.instance, label: "Carve a pumpkin", x: p.x, z: p.z, reach });
  }
  return list;
}

// The way the owner is walking through, if any: feet in its strip, heading
// into it, and the way armed (they have been out of its strip since arriving).
export function wayThrough(ways, at, heading, armed = () => true) {
  const n = Math.hypot(heading?.x ?? 0, heading?.z ?? 0); if (n < .3) return null;
  return ways.find((w) => inZone(w.zone, at) && armed(w) && (heading.x * w.dir.x + heading.z * w.dir.z) / n > .5) ?? null;
}
