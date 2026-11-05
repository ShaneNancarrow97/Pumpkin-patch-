// The guests' carving stand: a covered stall by the big pumpkin where
// visitors pay to carve a jack-o'-lantern of their own from one of the
// stand's preset designs, with paid extras (a candle, paint, a hat, a
// stand). Benches set how many carve at once, better tools how fast, and a
// fair sign what each pays. Pure rules: the farm's own numbers drive a hash,
// so the same state always plays out the same way.
import { patchLevel } from "./levels.js";
import { NORMAL_VISITOR_KINDS } from "../content/visitors.js";

export const CARVING_STAND = Object.freeze({
  level: 8, cost: 4000,
  // How many of the farm's arrivals stop to carve, as a share of guests a minute.
  appeal: .16,
  upgrades: Object.freeze([
    Object.freeze({ id: "benches", name: "Carving benches", text: "More guests carve at once.", values: Object.freeze([1, 2, 3, 4, 6]), costs: Object.freeze([2500, 7000, 16000, 34000]), levels: Object.freeze([8, 10, 13, 16]) }),
    Object.freeze({ id: "tools", name: "Carving tools", text: "Sharper saws and scoops: each carving is quicker.", values: Object.freeze([45, 36, 28, 21, 15]), costs: Object.freeze([1800, 5500, 13000, 28000]), levels: Object.freeze([8, 11, 14, 17]) }),
    Object.freeze({ id: "sign", name: "Craft fair sign", text: "Word spreads: more guests stop, and each pays a little more.", values: Object.freeze([1, 1.15, 1.3, 1.5]), costs: Object.freeze([3000, 9000, 22000]), levels: Object.freeze([9, 12, 15]) }),
  ]),
  // The preset designs guests carve: each a price, and how keen guests are on it.
  designs: Object.freeze([
    Object.freeze({ id: "classic", name: "Classic grin", price: 24, keen: 3, cost: 0, level: 8 }),
    Object.freeze({ id: "spooky", name: "Spooky eyes", price: 32, keen: 3, cost: 900, level: 8 }),
    Object.freeze({ id: "cat", name: "Black cat", price: 44, keen: 2, cost: 2400, level: 10 }),
    Object.freeze({ id: "bat", name: "Bat flight", price: 52, keen: 2, cost: 4200, level: 11 }),
    Object.freeze({ id: "ghost", name: "Little ghost", price: 60, keen: 2, cost: 6800, level: 13 }),
    Object.freeze({ id: "castle", name: "Moonlit castle", price: 90, keen: 1, cost: 14000, level: 15 }),
  ]),
  // Extras a guest may add, each with how often they're chosen once stocked.
  extras: Object.freeze([
    Object.freeze({ id: "candle", name: "Real candle", price: 6, chance: .55, cost: 1200, level: 8 }),
    Object.freeze({ id: "paint", name: "Glow paint", price: 9, chance: .35, cost: 2600, level: 10 }),
    Object.freeze({ id: "hat", name: "Witch's hat", price: 12, chance: .25, cost: 5000, level: 12 }),
    Object.freeze({ id: "stand", name: "Wrought stand", price: 18, chance: .18, cost: 9000, level: 14 }),
  ]),
});
export const STAND_UPGRADE_BY_ID = Object.freeze(Object.fromEntries(CARVING_STAND.upgrades.map((u) => [u.id, u])));
export const STAND_DESIGN_BY_ID = Object.freeze(Object.fromEntries(CARVING_STAND.designs.map((d) => [d.id, d])));
export const STAND_EXTRA_BY_ID = Object.freeze(Object.fromEntries(CARVING_STAND.extras.map((e) => [e.id, e])));

export const freshCarvingStand = () => ({ built: false, open: true, benches: 0, tools: 0, sign: 0, designs: ["classic"], extras: [], carvers: [], next: 0, serial: 0, carved: 0, income: 0, tally: {}, last: null });
export function restoreCarvingStand(raw) {
  const c = freshCarvingStand();
  if (!raw || typeof raw !== "object") return c;
  const whole = (n) => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
  c.built = raw.built === true; c.open = raw.open !== false;
  for (const u of CARVING_STAND.upgrades) c[u.id] = Math.min(u.values.length - 1, whole(raw[u.id]));
  c.designs = ["classic", ...new Set((Array.isArray(raw.designs) ? raw.designs : []).filter((id) => STAND_DESIGN_BY_ID[id] && id !== "classic"))];
  c.extras = [...new Set((Array.isArray(raw.extras) ? raw.extras : []).filter((id) => STAND_EXTRA_BY_ID[id]))];
  c.serial = whole(raw.serial); c.carved = whole(raw.carved); c.income = whole(raw.income);
  for (const d of CARVING_STAND.designs) if (whole(raw.tally?.[d.id])) c.tally[d.id] = whole(raw.tally[d.id]);
  return c;   // Carvers at the benches aren't saved: like the shop's customers, they've gone home.
}

const level = (s) => patchLevel(s).level;
export const standValue = (s, id) => STAND_UPGRADE_BY_ID[id].values[s.carvingStand?.[id] ?? 0];
export const standOpensAt = () => CARVING_STAND.level;
// How far a guest has got with their lantern, by the share of their time at the bench:
// choosing a pumpkin, scooping it out, carving the face, then lighting the candle.
export const CARVING_STAGES = Object.freeze([
  Object.freeze({ id: "whole", until: .25, name: "Choosing a pumpkin" }),
  Object.freeze({ id: "open", until: .5, name: "Scooping it out" }),
  Object.freeze({ id: "carved", until: .85, name: "Carving the face" }),
  Object.freeze({ id: "lit", until: Infinity, name: "Lighting the candle" }),
]);
export const carverProgress = (k) => Math.max(0, Math.min(1, 1 - k.left / Math.max(1e-6, k.length)));
export const carvingStage = (k) => CARVING_STAGES.find((st) => carverProgress(k) < st.until);
// How guests split between the designs on the menu (what carvingOrder weighs them by).
export function designShares(s) {
  const designs = s.carvingStand.designs.map((id) => STAND_DESIGN_BY_ID[id]), weights = designs.map((d) => d.keen + d.price / 40), total = weights.reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(designs.map((d, i) => [d.id, weights[i] / total]));
}
export const averageCarvingFee = (s) => (s.carvingStand.carved ? Math.round(s.carvingStand.income / s.carvingStand.carved) : 0);
export const canBuildStand = (s) => !s.carvingStand.built && level(s) >= CARVING_STAND.level && s.coins >= CARVING_STAND.cost && !s.paused;
export function buildCarvingStand(s) {
  if (!canBuildStand(s)) return false;
  s.coins -= CARVING_STAND.cost; s.carvingStand.built = true; s.carvingStand.next = s.time + 8;
  return true;
}
// The next tier of an upgrade: its price and level, or null when complete.
export function standUpgrade(s, id) {
  const u = STAND_UPGRADE_BY_ID[id], at = s.carvingStand[id];
  return !u || at >= u.costs.length ? null : { tier: at + 1, cost: u.costs[at], opensAt: u.levels[at], value: u.values[at + 1] };
}
export function buyStandUpgrade(s, id) {
  const next = standUpgrade(s, id);
  if (!s.carvingStand.built || !next || s.paused || s.coins < next.cost || level(s) < next.opensAt) return false;
  s.coins -= next.cost; s.carvingStand[id]++;
  return true;
}
// Designs and extras are bought once each.
export function buyStandDesign(s, id) {
  const d = STAND_DESIGN_BY_ID[id], c = s.carvingStand;
  if (!c.built || !d || c.designs.includes(id) || s.paused || s.coins < d.cost || level(s) < d.level) return false;
  s.coins -= d.cost; c.designs.push(id); return true;
}
export function buyStandExtra(s, id) {
  const e = STAND_EXTRA_BY_ID[id], c = s.carvingStand;
  if (!c.built || !e || c.extras.includes(id) || s.paused || s.coins < e.cost || level(s) < e.level) return false;
  s.coins -= e.cost; c.extras.push(id); return true;
}
export function setStandOpen(s, open) { if (!s.carvingStand.built) return false; s.carvingStand.open = !!open; return true; }

// A number in [0, 1) from the stand's own count.
function roll(...parts) {
  let h = 0x2545f491;
  for (const n of parts) { h = Math.imul(h ^ (Math.floor(n) >>> 0), 0x9e3779b1); h ^= h >>> 15; h = Math.imul(h, 0x85ebca77); h ^= h >>> 13; }
  return (h >>> 0) / 4294967296;
}
// What the next guest carves and adds, and what they pay.
export function carvingOrder(s, serial) {
  const c = s.carvingStand, designs = c.designs.map((id) => STAND_DESIGN_BY_ID[id]);
  // Keen on the fancier designs as well as the favourites: weight by keenness and price.
  const weights = designs.map((d) => d.keen + d.price / 40), total = weights.reduce((a, b) => a + b, 0);
  let pick = roll(serial, 3) * total, design = designs[0];
  for (let i = 0; i < designs.length; i++) { pick -= weights[i]; if (pick < 0) { design = designs[i]; break; } }
  const extras = c.extras.filter((id, i) => roll(serial, 11 + i) < STAND_EXTRA_BY_ID[id].chance);
  const fee = Math.round((design.price + extras.reduce((n, id) => n + STAND_EXTRA_BY_ID[id].price, 0)) * standValue(s, "sign"));
  return { design: design.id, extras, fee, kind: Math.floor(roll(serial, 5) * NORMAL_VISITOR_KINDS.length) };
}
// Guests a minute who'd stop to carve, from how busy the farm is.
export const carversPerMinute = (s, perMinute) => s.carvingStand.built && s.carvingStand.open ? Math.max(1, perMinute * CARVING_STAND.appeal * (1 + (standValue(s, "sign") - 1) * 1.2)) : 0;

// One step: carvers finish and pay; a new one sits at a free bench when due.
export function updateCarvingStand(s, dt, perMinute, events = []) {
  const c = s.carvingStand;
  if (!c?.built) return events;
  for (const k of c.carvers) k.left -= dt;
  for (const k of c.carvers.filter((x) => x.left <= 0)) {
    s.coins += k.fee; s.earned += k.fee; c.income += k.fee; c.carved++; c.tally[k.design] = (c.tally[k.design] ?? 0) + 1;
    c.last = { design: k.design, extras: k.extras, fee: k.fee, bench: k.bench, at: s.time, serial: k.serial };
    events.push({ type: "carving-sold", ...c.last });
  }
  c.carvers = c.carvers.filter((x) => x.left > 0);
  const rate = carversPerMinute(s, perMinute);
  if (!rate || s.time < c.next) return events;
  const benches = standValue(s, "benches"), taken = new Set(c.carvers.map((k) => k.bench));
  const bench = Array.from({ length: benches }, (_, i) => i).find((i) => !taken.has(i));
  // The gap is drawn either way, so a full stand turns the guest away rather than queueing.
  c.next = s.time + (60 / rate) * (.6 + roll(c.serial, 7) * .8);
  if (bench === undefined) return events;
  c.serial++;
  const order = carvingOrder(s, c.serial);
  c.carvers.push({ serial: c.serial, bench, ...order, left: standValue(s, "tools"), length: standValue(s, "tools") });
  events.push({ type: "carving-started", bench, design: order.design });
  return events;
}
