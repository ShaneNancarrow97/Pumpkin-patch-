// A home earns its place in the farm's story. Requirements read saved activity
// and useful furniture; the UI decides where to take the player next.
import { KITCHEN_CAPABILITIES } from "../content/kitchen-equipment.js";

export const HOME_ACTIVITY_KINDS = Object.freeze(["visit", "wardrobe", "cook", "decorate", "plant", "water", "harvest"]);
export const freshHomeActivities = () => Object.fromEntries(HOME_ACTIVITY_KINDS.map(id => [id, 0]));
const count = n => Number.isSafeInteger(n) && n >= 0 ? Math.min(n, 1000000) : 0;
export const restoreHomeActivities = raw => Object.fromEntries(HOME_ACTIVITY_KINDS.map(id => [id, count(raw?.[id])]));
export function recordHomeActivity(s, kind) {
  if (!s || s.paused || !HOME_ACTIVITY_KINDS.includes(kind)) return false;
  s.progression ??= {};
  s.progression.homeActivities ??= freshHomeActivities();
  s.progression.homeActivities[kind] = Math.min(1000000, count(s.progression.homeActivities[kind]) + 1);
  return true;
}
const pieces = s => Array.isArray(s.house?.placed) ? s.house.placed : [];
const activity = (s, kind) => count(s.progression?.homeActivities?.[kind]);
const tools = s => new Set(pieces(s).filter(p => p.room === "kitchen").flatMap(p => KITCHEN_CAPABILITIES[p.id] ?? []));
const rooms = s => new Set(pieces(s).map(p => p.room)).size;
const books = s => pieces(s).reduce((n, p) => n + (Array.isArray(p.books) ? p.books.length : 0), 0);
const requirement = (id, text, target, read, action, room = "parlour") => ({ id, text, target, read, action, room });
// House upgrades deliberately precede their new room's activity requirements.
export const HOME_MILESTONES = Object.freeze([
  { level: 3, title: "Make yourself at home", needs: [requirement("first-visit", "Step inside your home", 1, s => activity(s, "visit"), "home")] },
  { level: 5, title: "Room for two", needs: [requirement("bedroom", "Upgrade to the Crooked cottage", 1, s => s.house?.level ?? 0, "upgrade-house")] },
  { level: 6, title: "Dress for the occasion", needs: [requirement("wardrobe", "Use a costume rack or wardrobe at home", 1, s => activity(s, "wardrobe"), "wardrobe")] },
  { level: 7, title: "A home with character", needs: [requirement("four-pieces", "Place four pieces of furniture or decor", 4, s => pieces(s).length, "decorate")] },
  { level: 8, title: "Our own haunted walls", needs: [requirement("wallpaper", "Apply wallpaper in a room", 1, s => Object.keys(s.house?.wallpapers ?? {}).length, "wallpaper")] },
  { level: 10, title: "A proper midnight kitchen", needs: [requirement("kitchen-room", "Upgrade to the Midnight manor", 2, s => s.house?.level ?? 0, "upgrade-house")] },
  { level: 11, title: "Supper by candlelight", needs: [requirement("first-home-cook", "Finish a dish in your home kitchen", 1, s => activity(s, "cook"), "cook", "kitchen")] },
  { level: 12, title: "A shelf of stories", needs: [requirement("three-books", "Put three books on your bookshelves", 3, books, "library")] },
  { level: 13, title: "A growing recipe book", needs: [requirement("six-recipes", "Learn six recipes", 6, s => s.kitchen?.recipes?.length ?? 0, "recipes", "kitchen")] },
  { level: 14, title: "The warmest room", needs: [requirement("kitchen-oven", "Place an oven and baking tray in the kitchen", 2, s => ["oven", "tray"].filter(id => tools(s).has(id)).length, "equipment", "kitchen")] },
  { level: 15, title: "Our haunted haven", needs: [requirement("attic", "Upgrade to the Haunted haven", 3, s => s.house?.level ?? 0, "upgrade-house")] },
  { level: 16, title: "Life in every room", needs: [requirement("three-rooms", "Furnish three different rooms", 3, rooms, "decorate")] },
  { level: 17, title: "The family kitchen", needs: [requirement("kitchen-kit", "Place a hob, pan, oven, tray and spice station in the kitchen", 5, s => ["hob", "pan", "oven", "tray", "spice"].filter(id => tools(s).has(id)).length, "equipment", "kitchen")] },
  { level: 18, title: "A midnight feast", needs: [requirement("ten-home-dishes", "Finish ten dishes in your home kitchen", 10, s => activity(s, "cook"), "cook", "kitchen")] },
  { level: 19, title: "The little haunted library", needs: [requirement("six-books", "Put six books on your bookshelves", 6, books, "library")] },
  { level: 20, title: "Forever our home", needs: [requirement("four-rooms", "Furnish all four rooms", 4, rooms, "decorate"), requirement("twelve-pieces", "Place twelve pieces of furniture or decor", 12, s => pieces(s).length, "decorate")] },
].map(m => Object.freeze({ ...m, needs: Object.freeze(m.needs.map(Object.freeze)) })));

// A claimed milestone stays complete even if its furniture is stored later.
export function homeRequirements(s, level) {
  const m = HOME_MILESTONES.find(m => m.level === level);
  if (!m) return [];
  const honoured = (s.progression?.homeLegacyThrough ?? 1) >= level || s.progression?.claimed?.includes(level);
  return m.needs.map(({ read, ...r }) => ({ ...r, current: Math.min(r.target, Math.max(0, read(s))), met: honoured || read(s) >= r.target, honoured }));
}
export function homeGoal(s) {
  for (const m of HOME_MILESTONES) {
    const requirements = homeRequirements(s, m.level), missing = requirements.find(r => !r.met);
    if (missing) return { level: m.level, title: m.title, text: missing.text, action: missing.action, room: missing.room, requirements };
  }
  return null;
}
