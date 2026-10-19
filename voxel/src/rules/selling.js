// Selling: neighbours walking up the path to Skyla's stall, and, once it is
// open, customers browsing inside the Honest Pumpkin. Profiles, prices and
// timings are the main game's (src/core/stall.js, src/core/shop.js,
// src/content/stall.js, src/content/shop.js).
import { economy } from "../../../src/content/economy.js";
import { stallProfiles } from "../../../src/content/stall.js";
import { checkoutSeconds, customerModels, customerProfiles, shopCapacity, shopUpgradeCosts } from "../../../src/content/shop.js";
import { VARIETIES, visitorRushFactor } from "./farm.js";
import { available, chooseBasket, commitHold, releaseHold } from "./stock.js";

const variety = (productId) => VARIETIES.findIndex((v) => "pumpkin-" + v.id === productId);
const PRICES = VARIETIES.map((v) => v.price);
// The voxel neighbours, in model.js's order: 0 ghost, 1 witch, 2 vampire, 3 skeleton, 4 scarecrow.
const KINDS = customerModels;
export const STALL_PROFILES = stallProfiles.map((p) => ({ ...p, preferred: p.preferred.map(variety) }));

// The stall: how long the walk up the path takes, and how long they wait for stock.
export const VISIT = { arrive: 7, patience: 6, linger: 1, leave: 4 };
export const freshStall = () => ({ income: 0, itemsSold: 0, served: 0, missedBudget: 0, missedStock: 0, cocoa: 0, receipts: [] });

// Upgrades for the visitors, beside Spread the word (farm.js): bigger parties
// and more of them on the path, a reason to stay, and fuller baskets. The
// shop's door is never its limit (the till is), so nothing hurries customers
// inside; spending more per trip is what helps there. A shopper stops at the
// first favourite they can't buy all of, so a bigger budget alone changes
// little: a regular's loyalty card adds a pumpkin and the money for it together.
export const VISITOR_UPGRADES = [
  { id: "party", name: "Bring a friend", text: "Neighbours come up the path together: a friend, then a couple, then the whole family.", costs: [600, 1800, 6000], needs: null },
  { id: "lights", name: "Fairy lights down the path", text: "Lanterns all the way to the gate. Parties set off for the stall more often.", costs: [600, 2000, 4800, 10500], needs: { id: "sign", text: "Opens after Spread the word." } },
  { id: "cocoa", name: "A hot chocolate stand", text: "A bench and a warm mug. Neighbours wait longer for fresh pumpkins, and everyone buys a cup.", costs: [250, 700, 1400], needs: { id: "party", text: "Opens after Bring a friend." } },
  { id: "loyalty", name: "A loyalty card", text: "Buy nine pumpkins, get a slightly larger pumpkin. Regulars take one more home, at the stall and in the shop.", costs: [6000, 12000], needs: { id: "open", text: "Opens with the shop." } },
];
export const freshVisitorUpgrades = () => ({ party: 0, lights: 0, cocoa: 0, loyalty: 0 });
export const LIGHTS = 0.88, PATIENCE = [6, 12, 20, 30], MUG = [0, 2, 4, 7];
// Party members set off this far apart, so a party walks up the path in a line.
export const PARTY_GAP = 0.5;
// Places along Skyla's counter; beyond these, newcomers share a place.
export const COUNTER_SPOTS = 8;

// Spread the word lives with the farm's upgrades; the rest have their own record.
const lv = (s, id) => (id === "sign" ? s.upgrades.sign : s.visitorUpgrades?.[id]) || 0;
export const partyMax = (s) => 1 + lv(s, "party");
// Party sizes run through every size up to the most, so the average is (max + 1) / 2.
export const partySize = (s, party) => 1 + ((party * 5 + 2) % partyMax(s));
export const stallArrivalSeconds = (s) => (economy.outdoorArrivalSeconds - 3) * Math.pow(economy.advertisingFactor, lv(s, "sign")) * Math.pow(LIGHTS, lv(s, "lights")) * visitorRushFactor(s);
export const shopArrivalSeconds = (s) => economy.indoorArrivalSeconds * Math.pow(economy.advertisingFactor, lv(s, "sign")) * visitorRushFactor(s);
export const stallPatience = (s) => PATIENCE[lv(s, "cocoa")];
export const mugPrice = (s) => MUG[lv(s, "cocoa")];
// One shopper in four is a regular with a loyalty card, then one in two. The
// count skips along every six so each profile takes its turn.
export const REGULARS = [0, 4, 2];
export const isRegular = (s, id) => lv(s, "loyalty") > 0 && (id + Math.floor(id / 6)) % REGULARS[lv(s, "loyalty")] === 0;
// A regular takes one more pumpkin home, and brings the money for it.
const basketFor = (s, id, p) => {
  const extra = isRegular(s, id) ? 1 : 0;
  return { budget: Math.round(p.budget * (1 + extra / p.basketLimit)), basketLimit: p.basketLimit + extra, regular: extra > 0 };
};
// Neighbours a minute on the path: the Visitors tab's headline number.
export const visitorsPerMinute = (s) => (60 / stallArrivalSeconds(s)) * (partyMax(s) + 1) / 2;

const visitorLevel = (s, id) => (id === "open" ? Number(s.shop.unlocked) : lv(s, id));
export const visitorUpgradeLevel = lv;
export const visitorUpgradeUnlocked = (s, id) => {
  const u = VISITOR_UPGRADES.find((x) => x.id === id);
  return !!u && (!u.needs || visitorLevel(s, u.needs.id) > 0);
};
export const visitorUpgradeCost = (s, id) => VISITOR_UPGRADES.find((x) => x.id === id)?.costs[lv(s, id)];

export function buyVisitorUpgrade(s, id) {
  const price = visitorUpgradeCost(s, id);
  if (price === undefined || !visitorUpgradeUnlocked(s, id) || s.coins < price) return false;
  s.coins -= price;
  s.visitorUpgrades[id] = lv(s, id) + 1;
  return true;
}

// Which side of the centre a counter place stands: 0, then 1, -1, 2, -2 ...
export const counterSide = (spot) => (spot % 2 ? 1 : -1) * Math.ceil(spot / 2);
// The nearest free place at the counter, among visitors still heading for it or standing there.
function counterSpot(s) {
  const used = new Set(s.visitors.filter((v) => v.leaveAt === null || v.age < v.leaveAt).map((v) => v.spot));
  for (let i = 0; i < COUNTER_SPOTS; i++) if (!used.has(i)) return i;
  return s.nextVisitor % COUNTER_SPOTS;
}

// A neighbour in their own right, with their own profile, budget and basket,
// even when they come with a party. The loyalty card counts from when they set off.
function createPasserby(s, id, party = id, place = 0, size = 1) {
  const profile = id % STALL_PROFILES.length, p = STALL_PROFILES[profile];
  return { id, kind: id % KINDS.length, age: 0, profile, ...basketFor(s, id, p), preferred: [...p.preferred], basket: [], amount: 0, quantity: 0, bought: null, outcome: "shopping", leaveAt: null, mug: 0, party, place, size, spot: counterSpot(s) };
}

// A cup from the hot chocolate stand on the way out, whether or not they found a pumpkin.
function buyMug(s, v) {
  v.mug = mugPrice(s);
  s.coins += v.mug; s.earned += v.mug; s.stall.cocoa += v.mug;
  return v.mug;
}

function pay(s, receipt, ledger) {
  s.coins += receipt.amount; s.earned += receipt.amount; s.sold++;
  ledger.income += receipt.amount; ledger.itemsSold += receipt.quantity; ledger.served++;
}

export function updateStall(s, dt, events) {
  s.visitorTimer -= dt;
  if (s.visitorTimer <= 0) {
    s.visitorTimer += stallArrivalSeconds(s);
    const party = s.nextParty++, size = partySize(s, party);
    for (let place = 0; place < size; place++) s.arriving.push({ party, place, size, wait: place * PARTY_GAP });
  }
  // Each member sets off when their beat comes round.
  for (const a of s.arriving) a.wait -= dt;
  while (s.arriving.length && s.arriving[0].wait <= 1e-8) {
    const a = s.arriving.shift(), v = createPasserby(s, s.nextVisitor++, a.party, a.place, a.size);
    s.visitors.push(v);
    events.push({ type: "arrival", visitor: v.id, party: a.party, place: a.place, size: a.size });
  }
  for (const v of s.visitors) {
    v.age += dt;
    if (v.leaveAt !== null || v.age < VISIT.arrive) continue;
    const owner = "visitor-" + v.id, lines = chooseBasket(s, v, [0, 1, 2, 3], owner, PRICES);
    if (lines) {
      const receipt = commitHold(s, owner), mug = buyMug(s, v);
      pay(s, receipt, s.stall);
      Object.assign(v, { basket: receipt.lines, amount: receipt.amount, quantity: receipt.quantity, bought: receipt.lines[0].variety, outcome: "bought", leaveAt: v.age + VISIT.linger });
      s.stall.receipts.unshift({ visitor: v.id, profile: v.profile, party: v.party, size: v.size, amount: receipt.amount, quantity: receipt.quantity, lines: receipt.lines, mug });
      s.stall.receipts.length = Math.min(20, s.stall.receipts.length);
      events.push({ type: "sale", route: "stall", amount: receipt.amount + mug, quantity: receipt.quantity, mug, visitor: v.id });
    } else if (v.age >= VISIT.arrive + stallPatience(s)) {
      v.outcome = available(s) > 0 ? "budget" : "soldout";
      s.stall[v.outcome === "budget" ? "missedBudget" : "missedStock"]++;
      v.leaveAt = v.age + VISIT.linger;
      events.push({ type: "missed", reason: v.outcome, visitor: v.id });
      if (buyMug(s, v)) events.push({ type: "sale", route: "cocoa", amount: v.mug, quantity: 0, mug: v.mug, visitor: v.id });
    }
  }
  s.visitors = s.visitors.filter((v) => v.leaveAt === null || v.age < v.leaveAt + VISIT.leave);
}

// The indoor shop: open it, then add room, display tables and a faster till.
export const SHOP_UPGRADES = [
  { id: "open", name: "Open the shop", text: "Customers come inside to browse the display tables." },
  { id: "capacity", name: "More room to browse", text: "More customers can shop at once." },
  { id: "displays", name: "Two more display tables", text: "Show four varieties instead of two." },
  { id: "checkout", name: "A faster till", text: "Skyla rings up each basket more quickly." },
];
export const SHOP_CAPACITY = shopCapacity;
export const CHECKOUT_SECONDS = checkoutSeconds;
export const freshShop = () => ({ unlocked: false, capacityLevel: 0, displayLevel: 0, checkoutLevel: 0, displays: [0, 1, null, null], customers: [], nextCustomer: 0, arrivalTimer: 2, income: 0, itemsSold: 0, served: 0, invested: 0 });

const shopLevel = (shop, id) => (id === "open" ? Number(shop.unlocked) : id === "capacity" ? shop.capacityLevel : id === "displays" ? shop.displayLevel : shop.checkoutLevel);
export const shopUpgradeCost = (s, id) => shopUpgradeCosts[id]?.[shopLevel(s.shop, id)];
export const displayCount = (shop) => (shop.displayLevel ? 4 : 2);

export function upgradeShop(s, id) {
  const price = shopUpgradeCost(s, id);
  if (price === undefined || s.coins < price || (id !== "open" && !s.shop.unlocked)) return false;
  s.coins -= price; s.shop.invested += price;
  if (id === "open") s.shop.unlocked = true;
  else s.shop[id === "capacity" ? "capacityLevel" : id === "displays" ? "displayLevel" : "checkoutLevel"]++;
  return true;
}

// Puts a variety on a display table (null clears it). Each variety shows once.
export function assignDisplay(s, slot, v) {
  const shop = s.shop;
  if (!shop.unlocked || !Number.isInteger(slot) || slot < 0 || slot >= displayCount(shop)) return false;
  if (v !== null && (!Number.isInteger(v) || !VARIETIES[v] || shop.displays.some((d, i) => i !== slot && d === v))) return false;
  shop.displays[slot] = v;
  return true;
}

function createCustomer(s, id, slot) {
  const p = customerProfiles[(id * 7) % customerProfiles.length];
  return { id, slot, kind: (id * 3 + Math.floor(id / 5)) % KINDS.length, ...basketFor(s, id, p), preferred: p.preferred.map(variety), phase: "entering", remaining: 3, checkoutDuration: 0, basket: [], spent: 0, quantity: 0, outcome: "shopping" };
}
const occupied = (shop) => shop.customers.filter((c) => c.phase !== "leaving").length;

export function updateShop(s, dt, events) {
  const shop = s.shop;
  if (!shop.unlocked) return;
  shop.arrivalTimer -= dt;
  if (shop.arrivalTimer <= 0) {
    if (occupied(shop) < SHOP_CAPACITY[shop.capacityLevel]) {
      const used = new Set(shop.customers.filter((c) => c.phase !== "leaving").map((c) => c.slot));
      let slot = 0;
      while (used.has(slot)) slot++;
      shop.customers.push(createCustomer(s, shop.nextCustomer++, slot));
      shop.arrivalTimer += shopArrivalSeconds(s);
    } else shop.arrivalTimer = 0.5;
  }
  const offered = shop.displays.slice(0, displayCount(shop)).filter((v) => v !== null);
  for (const c of shop.customers) {
    if (c.phase === "queue") continue;
    c.remaining = Math.max(0, c.remaining - dt);
    if (c.remaining > 1e-8) continue;
    if (c.phase === "entering") { c.phase = "browsing"; c.remaining = 4; }
    else if (c.phase === "browsing") {
      const lines = chooseBasket(s, c, offered, "customer-" + c.id, PRICES);
      if (lines) { c.basket = lines; c.phase = "queue"; }
      else { c.outcome = "unavailable"; c.phase = "leaving"; c.remaining = 3; events.push({ type: "missed", reason: "shop", customer: c.id }); }
    } else if (c.phase === "paying") {
      const receipt = commitHold(s, "customer-" + c.id);
      if (!receipt) { c.phase = "leaving"; c.remaining = 3; continue; }
      pay(s, receipt, shop);
      Object.assign(c, { spent: receipt.amount, quantity: receipt.quantity, outcome: "bought", phase: "leaving", remaining: 3 });
      events.push({ type: "sale", route: "shop", amount: receipt.amount, quantity: receipt.quantity, customer: c.id });
    }
  }
  shop.customers = shop.customers.filter((c) => c.phase !== "leaving" || c.remaining > 1e-8);
  if (!shop.customers.some((c) => c.phase === "paying")) {
    const next = shop.customers.find((c) => c.phase === "queue");
    if (next) { next.phase = "paying"; next.checkoutDuration = next.remaining = CHECKOUT_SECONDS[shop.checkoutLevel]; }
  }
}

// Customers and baskets are not saved: on load, everyone has gone home.
export function closeForTheNight(s) {
  for (const c of s.shop.customers) releaseHold(s, "customer-" + c.id);
  s.shop.customers = [];
  s.holds = [];
  s.visitors = [];
  s.arriving = [];
}
