import { offerDiningSeat } from "./cooking-dining.js";
import { cleanlinessFootfall } from "./cleanliness.js";
// Selling: neighbours walking up the path to Skyla's stall, and, once it is
// open, customers browsing inside the Honest Pumpkin. Profiles, prices and
// timings are the main game's (src/core/stall.js, src/core/shop.js,
// src/content/stall.js, src/content/shop.js).
import { NORMAL_VISITOR_KINDS } from "../content/visitors.js";
import { tierOpen } from "./unlocks.js";
import { economy } from "../../../src/content/economy.js";
import { stallProfiles } from "../../../src/content/stall.js";
import { checkoutSeconds, customerProfiles, shopCapacity, shopUpgradeCosts } from "../../../src/content/shop.js";
import { UPGRADES, VARIETIES, tierFactor, visitorBonus } from "./farm.js";
import { freshGuestNeeds, tickGuestNeeds, enjoyPumpkin } from "./guest-needs.js";
import { settleCustomerCare } from "./customer-care.js";
import { quoteFoodForCustomer, commitFoodForCustomer, releaseFoodForCustomer, protectedFoodPurse } from "./cooking-sales.js";

// Maisie's hatch: an outdoor guest who's peckish spends their meal money on a
// takeaway as they leave the stall. Before, that money went home unspent.
function buyTakeaway(s, v) {
  if (!s.kitchen?.purchased || v.food?.status === "paid") return null;
  v.foodOwner = "visitor-" + v.id;
  if (!quoteFoodForCustomer(s, v, [])) return null;
  return commitFoodForCustomer(s, v, { protectedPurse: protectedFoodPurse(s, v, v.basket) });
}
import { cocoaAllowance, planFestivalVisit, tickFestivalVisit, meadowFootfallBonus } from "./festival-meadow.js";
import { planHollowVisit, tickHollowVisit, mazeFootfallBonus } from "./hollow-house.js";
import { planChat, tickChat, updateChats, chatting } from "./meadow-chat.js";
import { planHayrideVisit, tickHayrideVisit, hayrideFootfallBonus } from "./hayride.js";
import { hayrideJourneyTiming } from "../content/hayride-layout.js";
import { available, chooseBasket, commitHold, releaseHold } from "./stock.js";
import { wishFor } from "./market.js";
import { BIG_SPENDER_KIND, advanceBigSpender, bigSpenderBasket } from "./big-spender.js";
export { freshBigSpender, restoreBigSpender } from "./big-spender.js";
import { VARIETY_INDICES } from "../content/pumpkin-varieties.js";
import { VISITOR_EVENT_WORLD_CAP, VISITOR_EVENT_BURST } from "../content/visitor-events.js";
import { queueVisitorEventArrivals, finishVisitorEventArrival, visitorWorldCount, foodMealAllowance, starvingGuest, mealPurseReserve, pumpkinShoppingProfile } from "./visitor-events.js";

const variety = (productId) => VARIETIES.findIndex((v) => "pumpkin-" + v.id === productId);
const PRICES = VARIETIES.map((v) => v.price);
// The voxel neighbours, in model.js's order: 0 ghost, 1 witch, 2 vampire, 3 skeleton, 4 scarecrow.
const KINDS = NORMAL_VISITOR_KINDS;
export const STALL_PROFILES = stallProfiles.map((p) => ({ ...p, preferred: p.preferred.map(variety) }));

// The stall: how long the walk up the path takes, and how long they wait for stock.
export const VISIT = { arrive: 7, patience: 6, linger: 1, leave: 4 };
export const visitorLeaveSeconds = s => s.festival?.meadow ? 9 : VISIT.leave;
export const freshStall = () => ({ income: 0, itemsSold: 0, served: 0, missedBudget: 0, missedStock: 0, cocoa: 0, receipts: [] });

// Upgrades for the visitors, beside Spread the word (farm.js): bigger parties
// and more of them on the path, a reason to stay, and fuller baskets. The
// shop's door is never its limit (the till is), so nothing hurries customers
// inside; spending more per trip is what helps there. A shopper stops at the
// first favourite they can't buy all of, so a bigger budget alone changes
// little: a regular's loyalty card adds a pumpkin and the money for it together.
export const VISITOR_UPGRADES = [
  { id: "appetite", name: "Bigger baskets", text: "Word of the pumpkins gets round the village, and neighbours come with bigger baskets and a little more to spend.", costs: [400, 1500, 4500, 11000, 24000, 50000], needs: null },
  { id: "crowd", name: "Room for more neighbours", text: "Raise the outdoor visitor limit, with room for whole parties to enjoy the farm: benches, a wider gate, then the lane and the green.", costs: [300, 1200, 4000, 10000, 20000, 35000, 55000], needs: { id: "party", text: "Opens after Bring a friend." } },
  { id: "party", name: "Bring a friend", text: "Neighbours come together: friends, family, then parties of up to six or eight.", costs: [600, 1800, 6000, 12000, 24000], needs: null },
  { id: "lights", name: "Fairy lights down the path", text: "A string of lights by the gate, then lanterns all the way down. Parties set off for the stall more often.", costs: [150, 600, 2400, 9000], needs: { id: "sign", text: "Opens after Spread the word." } },
  { id: "cocoa", name: "Cocoa hospitality", text: "A warmer welcome: neighbours wait longer for pumpkins and Sandy serves cocoa more quickly.", costs: [250, 700, 1400], needs: { id: "party", text: "Opens after Bring a friend." } },
  { id: "loyalty", name: "A loyalty card", text: "Buy nine pumpkins, get a slightly larger pumpkin. Regulars take one more home, at the stall and in the shop.", costs: [6000, 12000], needs: { id: "open", text: "Opens with the shop." } },
];
export const freshVisitorUpgrades = () => ({ party: 0, lights: 0, cocoa: 0, loyalty: 0, crowd: 0, appetite: 0 });
// Fairy lights do most at first; old saves' four tiers are never slower than before.
export const LIGHTS = [0.85, 0.87, 0.89, 0.92], PATIENCE = [6, 12, 20, 30], MUG = [0, 2, 4, 7];
// However hot the streak, parties set off at least this far apart and shoppers
// come through the door no faster than this: the boost multiplies the upgrades,
// so the floor is what keeps a long late-game streak from running away.
// The quickest the path can get. Each frequency tier bought lowers it, so tiers
// keep paying off for a player whose streak already keeps the path full.
export const ARRIVAL_FLOOR = { stall: 5, shop: 1.5 };
const floorFor = (s, base, step, least) => Math.max(least, base - step * (lv(s, "sign") + lv(s, "lights")));
// At most this many neighbours on the path at once; the next party waits at the gate.
export const PATH_CAP = 16;
// Outdoor guests at once: 16, then up to 50 with every crowd tier.
export const CROWD = [16, 20, 24, 28, 32, 38, 44, 50];
export const visitorCapacity = s => Math.max(8,Math.floor(CROWD[Math.min(CROWD.length - 1, lv(s, "crowd"))]*cleanlinessFootfall(s)));
// Party members set off this far apart, so a party walks up the path in a line.
export const PARTY_GAP = 0.5;
// Places along Skyla's counter; beyond these, newcomers share a place.
export const COUNTER_SPOTS = 8;

// Spread the word lives with the farm's upgrades; the rest have their own record.
const lv = (s, id) => (id === "sign" ? s.upgrades.sign : s.visitorUpgrades?.[id]) || 0;
export const PARTY_SIZES = [1, 2, 3, 4, 6, 8];
export const partyMax = s => PARTY_SIZES[Math.min(PARTY_SIZES.length - 1, Math.max(0, lv(s, "party")))];
// Party sizes run through every size up to the most, so the average is (max + 1) / 2.
export const partySize = (s, party) => 1 + ((party * 5 + 2) % partyMax(s));
// The gaps the upgrades give, before any streak.
const SIGN = UPGRADES.find((u) => u.id === "sign").steps;
export const stallArrivalSeconds = (s) => (economy.outdoorArrivalSeconds - 3) * tierFactor(SIGN, lv(s, "sign")) * tierFactor(LIGHTS, lv(s, "lights"));
export const shopArrivalSeconds = (s) => economy.indoorArrivalSeconds * tierFactor(SIGN, lv(s, "sign"));
// How much faster than that the wait counts down with the streak's boost, held
// to the floor. Timers count down faster rather than being rescaled, so a
// boost that grows or fades changes the pace smoothly.
const pace = (seconds, floor, bonus) => Math.max(1, Math.min(1 + bonus, seconds / floor));
// Lasting attractions (the maze, the hayride, the meadow's comforts) add to the
// streak's boost, together capped at 75%.
export const attractionFootfallBonus = s => Math.min(.75, mazeFootfallBonus(s) + hayrideFootfallBonus(s) + meadowFootfallBonus(s));
export const stallPace = (s) => pace(stallArrivalSeconds(s), floorFor(s, ARRIVAL_FLOOR.stall, 0.3, 2.5), visitorBonus(s) + attractionFootfallBonus(s))*cleanlinessFootfall(s);
export const shopPace = (s) => pace(shopArrivalSeconds(s), floorFor(s, ARRIVAL_FLOOR.shop, 0.05, 1.1), visitorBonus(s) + attractionFootfallBonus(s))*cleanlinessFootfall(s);
// The gap between parties right now, and the boost that actually reaches the path.
export const stallGapSeconds = (s) => stallArrivalSeconds(s) / stallPace(s);
export const pathBoost = (s) => stallPace(s) - 1;
// Only the extra pace attributable to the temporary harvest streak, after the
// permanent attraction benefit and the same arrival floor have been applied.
export const streakPathBoost = (s) => stallPace(s) - pace(stallArrivalSeconds(s), floorFor(s, ARRIVAL_FLOOR.stall, 0.3, 2.5), attractionFootfallBonus(s));
// The HUD can distinguish guests actually on the path from indoor excursions.
export const onThePath = (s) => s.visitors.filter((v) => !chatting(v) && (!v.festival || v.festival.done) && (!v.hayride || v.hayride.done || ["approach", "return"].includes(v.hayride.phase)) && (!v.hollow || v.hollow.done || ["approach", "arriving-house", "door-wait", "to-border", "to-shop"].includes(v.hollow.phase))).length + s.arriving.length;
// Every outdoor trip keeps a return space, including guests in the foyer or at
// Sandy's stand. Otherwise simultaneous returns can overflow a full path.
// Guests chatting in the meadow have finished their visit and never come back
// to the path, so they leave room for new arrivals (meadow-chat.js caps them).
// Guests out on the hayride or in the Hollow House leave their place on the
// farm free while they're away, and the attractions' own guests (bonus) never
// take one: rides add visitors rather than borrowing them from the stall.
const awayOnRide = (v) => v.bonus || (v.hayride && !v.hayride.done) || (v.hollow && !v.hollow.done && !v.hollow.fledHome);
export const visitorReservations = (s) => s.visitors.filter((v) => !chatting(v) && !awayOnRide(v)).length + s.arriving.filter((a) => !a.bonus).length;
export const stallPatience = (s) => PATIENCE[lv(s, "cocoa")];
export const mugPrice = (s) => MUG[lv(s, "cocoa")];
// One shopper in four is a regular with a loyalty card, then one in two. The
// count skips along every six so each profile takes its turn.
export const REGULARS = [0, 4, 2];
export const isRegular = (s, id) => lv(s, "loyalty") > 0 && (id + Math.floor(id / 6)) % REGULARS[lv(s, "loyalty")] === 0;
// How many pumpkins a guest hopes to take home: three to begin with, ten once
// the whole village has heard. Each pumpkin past what their kind of visitor
// came for brings half an Orange's price more: with what's left of their purse
// they fill up on cheaper pumpkins, so bigger baskets sell more of the harvest
// without every purse turning into a Starlight purse.
export const APPETITE = [3, 4, 5, 6, 7, 8, 10];
export const EXTRA_PURSE = 3;
export const basketWant = (s) => APPETITE[Math.min(APPETITE.length - 1, lv(s, "appetite"))];
// A regular takes two more home, and brings the money for them. A guest who has
// heard what's wanted brings the money and room for one of those too (market.js).
const basketFor = (s, id, p) => {
  const regular = isRegular(s, id), want = Math.max(p.basketLimit, basketWant(s)) + (regular ? 2 : 0), wish = wishFor(s, id, (v) => PRICES[v]);
  return { budget: Math.round(p.budget + (want - p.basketLimit) * EXTRA_PURSE + (regular ? p.budget * 0.5 : 0)) + (wish?.purse ?? 0), basketLimit: want + (s.customerCare?.bags ?? 0) + (wish ? 1 : 0), regular, wish };
};
// Neighbours a minute on the path, with the streak's boost: the Visitors tab's headline number.
export const visitorsPerMinute = (s) => (60 / stallGapSeconds(s)) * (partyMax(s) + 1) / 2;

const visitorLevel = (s, id) => (id === "open" ? Number(s.shop.unlocked) : lv(s, id));
export const visitorUpgradeLevel = lv;
export const visitorUpgradeUnlocked = (s, id) => {
  const u = VISITOR_UPGRADES.find((x) => x.id === id);
  return !!u && (!u.needs || visitorLevel(s, u.needs.id) > 0);
};
export const visitorUpgradeCost = (s, id) => VISITOR_UPGRADES.find((x) => x.id === id)?.costs[lv(s, id)];

export function buyVisitorUpgrade(s, id) {
  const price = visitorUpgradeCost(s, id);
  if (price === undefined || !visitorUpgradeUnlocked(s, id) || !tierOpen(s, "visitor", id, lv(s, id)) || s.coins < price) return false;
  s.coins -= price;
  s.visitorUpgrades[id] = lv(s, id) + 1;
  return true;
}

// The nearest free place at the counter, among visitors still heading for it or standing there.
function counterSpot(s) {
  const used = new Set(s.visitors.filter((v) => v.leaveAt === null || v.age < v.leaveAt).map((v) => v.spot));
  for (let i = 0; i < COUNTER_SPOTS; i++) if (!used.has(i)) return i;
  return s.nextVisitor % COUNTER_SPOTS;
}

// A neighbour in their own right, with their own profile, budget and basket,
// even when they come with a party. The loyalty card counts from when they set off.
function createPasserby(s, id, party = id, place = 0, size = 1, vip = false, occasion = null) {
  const profile = id % STALL_PROFILES.length, p = STALL_PROFILES[profile];
  const v = { id, kind: vip ? BIG_SPENDER_KIND : id % KINDS.length, age: 0, profile, ...basketFor(s, id, p), preferred: [...p.preferred], ...(vip ? { ...bigSpenderBasket(s), wish: null } : {}), basket: [], amount: 0, quantity: 0, bought: null, outcome: "shopping", leaveAt: null, mug: 0, party, place, size, spot: counterSpot(s) };
  if (occasion?.courtier) Object.assign(v, occasion.offer, { courtier: true, vip: true, regular: false, wish: null });
  if (occasion?.eventType) { v.eventType = occasion.eventType; v.eventSerial = occasion.eventSerial; }
  v.cocoaAllowance = cocoaAllowance(s);
  v.needs = freshGuestNeeds(id); v.starving = !v.vip && starvingGuest(s, id);
  v.mealPurse = occasion?.courtier ? (s.kitchen?.purchased ? 40 : 0) : v.vip ? (s.kitchen?.purchased ? 40 : 0) : foodMealAllowance(s, id);
  if (!occasion?.courtier) v.budget += v.cocoaAllowance + v.mealPurse;
  if (v.starving) v.needs.hunger = 100;
  v.originalBudget = v.budget; v.festival = planFestivalVisit(s, v);
  return v;
}

// Hospitality keeps its patience benefit. A mug is a real optional purchase,
// from money remaining after the basket, never extra cash created per visitor.
// Guests who already bought at Sandy's stand do not buy a duplicate legacy mug.
function buyMug(s, v, reserved = 0) {
  const price = mugPrice(s);
  if (s.festival?.cocoa.level || v.treatReceipt || !price || v.budget - reserved < price) return 0;
  v.mug = price; v.budget -= price;
  s.coins += v.mug; s.earned += v.mug; s.stall.cocoa += v.mug;
  return v.mug;
}

function pay(s, receipt, ledger) {
  s.coins += receipt.amount; s.earned += receipt.amount; s.sold++;
  ledger.income += receipt.amount; ledger.itemsSold += receipt.quantity; ledger.served++;
}

export function updateStall(s, dt, events) {
  if (s.paused || !Number.isFinite(dt) || dt <= 0) return;
  if (advanceBigSpender(s, dt, visitorReservations(s) < visitorCapacity(s) && visitorWorldCount(s) < VISITOR_EVENT_WORLD_CAP)) {
    const v = createPasserby(s, s.nextVisitor++, s.nextParty++, 0, 1, true);
    s.visitors.push(v);
    events.push({ type: "arrival", visitor: v.id, party: v.party, place: 0, size: 1 }, { type: "vip-arrived", visitor: v.id });
  }
  // Occasions borrow at most twenty extra return spaces. Chatters still count
  // towards the absolute world limit even though they do not return to stall.
  const eventSlots = Math.max(0, Math.min(visitorCapacity(s) + VISITOR_EVENT_BURST - visitorReservations(s), VISITOR_EVENT_WORLD_CAP - visitorWorldCount(s)));
  s.arriving.push(...queueVisitorEventArrivals(s, eventSlots));
  s.visitorTimer -= dt * stallPace(s);
  if (s.visitorTimer <= 0) {
    const party = s.nextParty, size = partySize(s, party);
    // A full path holds the next party at the gate until there is room.
    if (visitorReservations(s) + size > visitorCapacity(s) || visitorWorldCount(s) + size > VISITOR_EVENT_WORLD_CAP) s.visitorTimer = 0;
    else {
      s.visitorTimer += stallArrivalSeconds(s);
      s.nextParty++;
      for (let place = 0; place < size; place++) s.arriving.push({ party, place, size, wait: place * PARTY_GAP });
    }
  }
  // Each member sets off when their beat comes round.
  for (const a of s.arriving) a.wait -= dt;
  s.arriving.sort((a, b) => a.wait - b.wait);
  while (s.arriving.length && s.arriving[0].wait <= 1e-8) {
    const a = s.arriving.shift(), v = createPasserby(s, s.nextVisitor++, a.party, a.place, a.size, false, a);
    if (a.eventType) finishVisitorEventArrival(s, a);
    if (a.forMaze) { v.forMaze = true; v.festival = null; }                     // sent by the maze opening: straight there
    if (a.forHayride) { v.forHayride = true; v.festival = null; }
    if (a.bonus) v.bonus = true;                                               // an attraction's own guest: never takes a farm place
    s.visitors.push(v);
    events.push({ type: "arrival", visitor: v.id, party: a.party, place: a.place, size: a.size });
  }
  for (const v of s.visitors) {
    tickGuestNeeds(v, dt, v.festival?.phase === "queue" || v.age > VISIT.arrive + 4 && v.leaveAt === null);
    if (v.social) { tickChat(s, v, dt, events); continue; }                      // chatting in the meadow, then home
    if (tickFestivalVisit(s, v, dt, events)) continue;
    if (v.festival?.justArrived) { v.age = VISIT.arrive; v.festival.justArrived = false; }
    // A woodland visit owns the same guest and wallet, suspending the stall
    // clock until their visible walk back reaches the counter.
    if (!v.hayrideConsidered && !v.forMaze) {
      v.hayrideConsidered = true;
      v.hayride = v.festival?.done ? null : planHayrideVisit(s, v, "arrival", hayrideJourneyTiming(v, "arrival", s));
      if (v.hayride) v.hollowConsidered = true;
    }
    if (tickHayrideVisit(s, v)) continue;
    if (v.hayride?.wentHome) continue;
    if (v.hayride?.justArrived) { v.age = VISIT.arrive; v.hayride.justArrived = false; }
    // The maze first (up the west lane), unless they've come round from Sandy's;
    // or, once they've shopped, over the lantern walk to it (below).
    if (!v.hollowConsidered) { v.hollowConsidered = true; v.hollow = v.festival?.done ? null : planHollowVisit(s, v, "arrival"); }
    if (tickHollowVisit(s, v, dt, events)) continue;
    // A frightened guest has already paid for their attraction visit and leaves
    // at its visible exit. They cannot teleport back to buy another pumpkin.
    if (v.hollow?.fledHome) continue;
    if (v.hollow?.justArrived) { v.age = VISIT.arrive; v.hollow.justArrived = false; }
    v.age += dt;
    if (v.leaveAt !== null && v.age >= v.leaveAt && !v.hayride && !v.hayrideAfterConsidered && !v.hollow) {
      v.hayrideAfterConsidered = true;
      v.hayride = planHayrideVisit(s, v, "after", hayrideJourneyTiming(v, "after", s));
      if (v.hayride) continue;
    }
    // Decided as their linger ends, so they set off from their place at the
    // counter without being drawn a step down the way home first.
    if (v.leaveAt !== null && v.age >= v.leaveAt && !v.hollow && !v.mazeAfterConsidered) {
      v.mazeAfterConsidered = true; v.hollow = planHollowVisit(s, v, "after");
      if (v.hollow) continue;
    }
    // Then perhaps a chat in the meadow, once everything else is settled.
    if (v.leaveAt !== null && v.age >= v.leaveAt && !v.socialConsidered && (!v.hollow || v.hollow.done && !v.hollow.wentHome) && (!v.hayride || v.hayride.done && !v.hayride.wentHome)) {
      v.socialConsidered = true; v.social = planChat(s, v);
      if (v.social) continue;
    }
    if (v.leaveAt !== null || v.age < VISIT.arrive) continue;
    const owner = "visitor-" + v.id, lines = chooseBasket(s, pumpkinShoppingProfile(s, v), VARIETY_INDICES, owner, PRICES);
    if (lines) {
      const receipt = commitHold(s, owner), mealReserve = mealPurseReserve(s, v), mug = buyMug(s, v, receipt.amount + mealReserve);
      pay(s, receipt, s.stall);
      if (v.kind === BIG_SPENDER_KIND) { s.bigSpender.spent += receipt.amount; s.bigSpender.pumpkins += receipt.quantity; }
      const care = settleCustomerCare(s, receipt, { ...v, budget: Math.max(0, v.budget - mealReserve) }, "stall", v.age - VISIT.arrive);
      v.tip = care.tip; v.quality = care.quality; v.budget -= receipt.amount + care.tip; enjoyPumpkin(v, care.quality, care.service);
      Object.assign(v, { basket: receipt.lines, amount: receipt.amount, quantity: receipt.quantity, bought: receipt.lines[0].variety, outcome: "bought", leaveAt: v.age + VISIT.linger });
      s.stall.receipts.unshift({ visitor: v.id, profile: v.profile, party: v.party, size: v.size, amount: receipt.amount, quantity: receipt.quantity, lines: receipt.lines, mug, tip: care.tip, quality: care.quality });
      s.stall.receipts.length = Math.min(20, s.stall.receipts.length);
      events.push({ type: "sale", route: "stall", amount: receipt.amount + mug + care.tip, tip: care.tip, quality: care.quality, quantity: receipt.quantity, mug, visitor: v.id });
      const food = buyTakeaway(s, v);
      if (food) events.push({ type: "sale", route: "takeaway", amount: food.amount, quantity: 0, recipe: food.recipe, visitor: v.id });
    } else if (v.age >= VISIT.arrive + stallPatience(s)) {
      v.outcome = available(s) > 0 ? "budget" : "soldout";
      s.stall[v.outcome === "budget" ? "missedBudget" : "missedStock"]++;
      v.leaveAt = v.age + VISIT.linger;
      events.push({ type: "missed", reason: v.outcome, visitor: v.id });
      if (buyMug(s, v, mealPurseReserve(s, v))) events.push({ type: "sale", route: "cocoa", amount: v.mug, quantity: 0, mug: v.mug, visitor: v.id });
      const food = buyTakeaway(s, v);
      if (food) events.push({ type: "sale", route: "takeaway", amount: food.amount, quantity: 0, recipe: food.recipe, visitor: v.id });
    }
  }
  updateChats(s, events);
  s.visitors = s.visitors.filter((v) => v.social ? !v.social.gone : !v.hayride?.wentHome && !v.hollow?.fledHome && !v.hollow?.wentHome && (v.hayride && !v.hayride.done || v.leaveAt === null || v.age < v.leaveAt + visitorLeaveSeconds(s)));
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
export const shopLevelOf = (s, id) => shopLevel(s.shop, id);
export const displayCount = (shop) => (shop.displayLevel ? 4 : 2);

export function upgradeShop(s, id) {
  const price = shopUpgradeCost(s, id);
  if (price === undefined || s.coins < price || (id !== "open" && !s.shop.unlocked) || !tierOpen(s, "shop", id, shopLevel(s.shop, id))) return false;
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
  const customer = { id, slot, kind: (id * 3 + Math.floor(id / 5)) % KINDS.length, ...basketFor(s, id, p), preferred: p.preferred.map(variety), phase: "entering", remaining: 3, checkoutDuration: 0, basket: [], spent: 0, quantity: 0, outcome: "shopping" };
  customer.needs = freshGuestNeeds(id, true); customer.starving = starvingGuest(s, id);
  customer.mealPurse = foodMealAllowance(s, id); customer.budget += customer.mealPurse;
  if (customer.starving) customer.needs.hunger = 100;
  if(s.visitorEvents?.vip?.level && id%7===0){customer.kind=11+id%4;customer.vip=true;customer.courtier=true;customer.budget=160+id%91;customer.basketLimit=10+id%5;customer.mealPurse=40;customer.needs.hunger=85;}
  customer.originalBudget = customer.budget; return customer;
}
const occupied = (shop) => shop.customers.filter((c) => c.phase !== "leaving").length;

export function updateShop(s, dt, events) {
  const shop = s.shop;
  if (s.paused || !Number.isFinite(dt) || dt <= 0 || !shop.unlocked) return;
  shop.arrivalTimer -= dt * shopPace(s);
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
    tickGuestNeeds(c, dt, c.phase === "queue");
    if (c.phase === "queue") continue;
    c.remaining = Math.max(0, c.remaining - dt);
    if (c.remaining > 1e-8) continue;
    if (c.phase === "entering") { c.phase = "browsing"; c.remaining = 4; }
    else if (c.phase === "browsing") {
      const lines = chooseBasket(s, pumpkinShoppingProfile(s, c), offered, "customer-" + c.id, PRICES);
      c.basket = lines ?? [];
      const food = quoteFoodForCustomer(s, c, c.basket);
      if (lines || food) { c.phase = "queue"; c.queueJoinedAt = s.time; }
      else { c.outcome = "unavailable"; c.phase = "leaving"; c.remaining = 3; events.push({ type: "missed", reason: "shop", customer: c.id }); }
    } else if (c.phase === "paying") {
      const receipt = commitHold(s, "customer-" + c.id);
      const pumpkinAmount = receipt?.amount ?? 0, protectedPurse = protectedFoodPurse(s, c, receipt?.lines ?? []);
      const food = commitFoodForCustomer(s, c, { reserved: pumpkinAmount, protectedPurse });
      if (!receipt && !food) { releaseFoodForCustomer(s, c); c.phase = "leaving"; c.remaining = 3; continue; }
      let tip = 0, quality;
      if (receipt) {
        pay(s, receipt, shop);
        // Food has already been paid from this wallet. The unspent wanted
        // purse stays protected when Skyla calculates a voluntary tip.
        const care = settleCustomerCare(s, receipt, { ...c, budget: Math.max(0, c.budget - protectedPurse) }, "shop", s.time - (c.queueJoinedAt ?? s.time - c.checkoutDuration));
        tip = care.tip; quality = care.quality; c.tip = tip; c.quality = quality;
        c.budget -= receipt.amount + tip; enjoyPumpkin(c, quality, care.service);
        events.push({ type: "sale", route: "shop", amount: receipt.amount + tip, tip, quality, quantity: receipt.quantity, customer: c.id });
      }
      Object.assign(c, { spent: pumpkinAmount + (food?.amount ?? 0), quantity: receipt?.quantity ?? 0, outcome: "bought", phase: "leaving", remaining: 3 });
      if (food) events.push({ type: "sale", route: "food", amount: food.amount, quantity: food.quantity, recipe: food.recipe, customer: c.id });
    }
  }
  for(const c of shop.customers)if(c.phase === "leaving" && c.remaining <= 1e-8)offerDiningSeat(s,c);
  shop.customers = shop.customers.filter((c) => c.phase !== "leaving" || c.remaining > 1e-8);
  if (!shop.customers.some((c) => c.phase === "paying")) {
    const next = shop.customers.find((c) => c.phase === "queue");
    if (next) { next.phase = "paying"; next.checkoutDuration = next.remaining = CHECKOUT_SECONDS[shop.checkoutLevel]; }
  }
}

// Customers and baskets are not saved: on load, everyone has gone home.
export function closeForTheNight(s) {
  for (const c of s.shop.customers) { releaseHold(s, "customer-" + c.id); releaseFoodForCustomer(s, c); }
  if (s.kitchen) { s.kitchen.foodHolds = []; s.kitchen.diners = []; }
  s.shop.customers = [];
  s.holds = [];
  s.visitors = [];
  s.arriving = [];
  if (s.social) s.social.groups = {};
}
