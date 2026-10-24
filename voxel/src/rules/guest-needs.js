// Needs belong to each visitor, not the UI. Seeded traits keep choices repeatable.
import { CHAT_SPOTS } from "../content/festival-meadow.js";
const clamp = n => Math.max(0, Math.min(100, n));
const random = seed => { let n = Math.imul(seed + 37, 1597334677); n = Math.imul(n ^ n >>> 15, 3812015801); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
export const freshGuestNeeds = (id, indoors = false) => ({ thirst: 35 + random(id * 11 + (indoors ? 7 : 0)) * 60, hunger: 25 + random(id * 13 + 3) * 65, happiness: 60 + random(id * 17 + 5) * 30, value: .9 + random(id * 19 + 9) * .2 });
export function tickGuestNeeds(guest, dt, waiting = false) {
  if (!guest.needs) guest.needs = freshGuestNeeds(guest.id);
  guest.needs.thirst = clamp(guest.needs.thirst + dt * .08); guest.needs.hunger = clamp(guest.needs.hunger + dt * .06);
  if (waiting) guest.needs.happiness = clamp(guest.needs.happiness - dt * .15);
}
export function enjoyTreat(guest, snack, satisfaction = 1) {
  if (!guest.needs) guest.needs = freshGuestNeeds(guest.id);
  const need = snack ? "hunger" : "thirst"; guest.needs[need] = clamp(guest.needs[need] - (snack ? 60 : 70)); guest.needs.happiness = clamp(guest.needs.happiness + 5 * satisfaction);
}
export function enjoyPumpkin(guest, quality, service) {
  if (!guest.needs) guest.needs = freshGuestNeeds(guest.id);
  guest.needs.happiness = clamp(guest.needs.happiness + quality * 1.5 - Math.max(0, service - 8) * .2);
}
export function guestHeading(guest, indoor = false) {
  if (guest.hayride && !guest.hayride.done) return { approach: "Walking to the hayride", queue: "Queuing at the woodland station", boarding: "Boarding the hay wagon", riding: "On the haunted hayride", unloading: "Leaving the hay wagon", return: guest.hayride.fromStall || guest.hayride.fleeing ? "Heading home from the woods" : "Back to the pumpkin stall" }[guest.hayride.phase] ?? "Visiting the hayride";
  if (guest.hollow?.fleeing || guest.hollow?.fledHome) return "Running home after a fright";
  if (guest.hollow && !guest.hollow.done) return { approach: guest.hollow.fromStall ? "Walking over to the Hollow House" : "The Hollow House", "arriving-house": "The Hollow House", "to-border": "Heading home down the west lane", "door-wait": "Waiting outside reception", entering: "Entering the foyer", queue: "Queuing for Axel", serving: "Buying a maze ticket", admission: "Waiting for maze admission", "to-maze": "Entering the Scare Maze", maze: "Exploring the Scare Maze", requeue: "Braving the maze again", returning: "A delighted survivor", exit: "Leaving reception", "to-shop": "Back to the pumpkin stall" }[guest.hollow.phase] ?? "Visiting The Hollow House";
  if (indoor) return { entering: "Entering Skyla’s shop", browsing: "Browsing pumpkin displays", queue: "Queuing at Skyla’s till", paying: "Paying Skyla", leaving: "Leaving the shop" }[guest.phase] ?? "Exploring";
  if (guest.social && !guest.social.gone) return { "to-spot": "Off for a chat", chatting: "Chatting " + (CHAT_SPOTS.find(p => p.id === guest.social.spot)?.name ?? "in the meadow"), "cocoa-run": "Fetching a cocoa", "cocoa-queue": "Waiting for Sandy", "cocoa-serving": "Ordering cocoa", "cocoa-back": "Back to the chat", trolley: "Served from Sandy’s trolley", leaving: "Heading through the village gate" }[guest.social.phase];
  if (guest.leaveAt !== null) return "Heading through the village gate";
  if (guest.festival && !guest.festival.done) return { "to-cocoa": "Sandy’s cocoa stand", queue: "Waiting for Sandy", serving: "Ordering cocoa & treats", "to-shop": "Skyla’s pumpkin stall" }[guest.festival.phase];
  return guest.age < 7 ? "Skyla’s pumpkin stall" : "Choosing a pumpkin";
}
