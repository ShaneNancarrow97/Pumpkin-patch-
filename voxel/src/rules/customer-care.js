// Customer care owns bag capacity, pumpkin grading and a separate tips ledger.
// Grades are drawn once at payment, so waiting or re-rendering cannot reroll them.
export const CARE_UPGRADES = [
  { id: "bags", name: "Pumpkin carrier bags", costs: [180, 650, 2200], text: "One extra pumpkin space per tier, at both counters. Each guest still shops within their own budget." },
  { id: "tipJar", name: "Skyla’s thank-you jar", costs: [250, 1000, 3800], text: "Guests with spare change may tip for lovely pumpkins and quick service. Each tier improves their generosity." },
];
export const freshCustomerCare = () => ({ bags: 0, tipJar: 0, serial: 0, invested: 0, tips: { stall: 0, shop: 0 }, tipped: { stall: 0, shop: 0 }, qualityTotal: 0, graded: 0, receipts: [] });
const count = (n, cap = 1e12) => Number.isSafeInteger(n) ? Math.max(0, Math.min(cap, n)) : 0;
export function restoreCustomerCare(raw) {
  const c = freshCustomerCare();
  if (!raw || typeof raw !== "object") return c;
  for (const key of ["bags", "tipJar"]) c[key] = count(raw[key], 3);
  for (const key of ["serial", "invested", "graded"]) c[key] = count(raw[key]);
  c.qualityTotal = Number.isFinite(raw.qualityTotal) ? Math.max(0, Math.min(c.graded * 5, raw.qualityTotal)) : 0;
  for (const route of ["stall", "shop"]) { c.tips[route] = count(raw.tips?.[route]); c.tipped[route] = count(raw.tipped?.[route]); }
  c.receipts = (Array.isArray(raw.receipts) ? raw.receipts : []).filter(r => r && ["stall", "shop"].includes(r.route)).slice(0, 12).map(r => ({ route: r.route, visitor: count(r.visitor), amount: count(r.amount), quantity: count(r.quantity, 100), tip: count(r.tip, 25), quality: Number.isFinite(r.quality) ? Math.max(1, Math.min(5, r.quality)) : 1, service: Number.isFinite(r.service) ? Math.max(0, Math.min(3600, r.service)) : 0 }));
  return c;
}
export const careUpgradeCost = (s, id) => CARE_UPGRADES.find(u => u.id === id)?.costs[s.customerCare[id]];
export function buyCareUpgrade(s, id) {
  const price = careUpgradeCost(s, id);
  if (s.paused || !s.shop.unlocked || price === undefined || s.coins < price) return false;
  s.coins -= price; s.customerCare[id]++; s.customerCare.invested += price; return true;
}
// A stable random draw independent of frame rate, with a saved sale serial.
function draw(seed) {
  let x = (seed + 0x9e3779b9) | 0; x = Math.imul(x ^ x >>> 16, 0x21f0aaad); x = Math.imul(x ^ x >>> 15, 0x735a2d97);
  return ((x ^ x >>> 15) >>> 0) / 4294967296;
}
export const qualityName = stars => ["Rustic", "Fresh", "Lovely", "Prize", "Showstopper"][Math.max(0, Math.min(4, Math.round(stars) - 1))];
// Pure quote: service means waiting at the stall, or queuing plus checkout indoors.
export function quoteCustomerCare(s, receipt, visitor, route, serviceSeconds) {
  const seed = (s.customerCare.serial + 1) * 104729 + visitor.id * 7919 + (route === "shop" ? 31337 : 0);
  let grades = 0, n = 0;
  for (const line of receipt.lines) for (let i = 0; i < line.quantity; i++) {
    const minimum = ([1, 2, 2, 3, 4][line.variety] ?? 1);
    grades += minimum + Math.floor(draw(seed + n * 43) * (6 - minimum)); n++;
  }
  const quality = n ? grades / n : 1, service = Number.isFinite(serviceSeconds) ? Math.max(0, serviceSeconds) : 0, target = route === "shop" ? 8 : 4;
  const speed = service <= target ? 1 : service <= target * 2 ? .7 : .35;
  const level = s.customerCare.tipJar, chance = [0, .25, .38, .5][level] * (.45 + .11 * quality) * speed;
  const spare = Math.max(0, Math.floor(visitor.budget - receipt.amount));
  const desired = Math.max(1, Math.floor(receipt.amount * [0, .04, .065, .09][level] * quality / 5 * (speed === 1 ? 1.25 : speed)));
  const tip = n && level && draw(seed + 9749) < chance ? Math.min(25, spare, desired) : 0;
  return { quality, service, tip, grades, graded: n };
}
// Called only after stock is committed. Product takings never include tips.
export function settleCustomerCare(s, receipt, visitor, route, serviceSeconds) {
  if (receipt.care) return receipt.care;
  if (!receipt.quantity || !["stall", "shop"].includes(route)) return null;
  const c = s.customerCare, result = quoteCustomerCare(s, receipt, visitor, route, serviceSeconds);
  receipt.care = result; c.serial++; c.qualityTotal += result.grades; c.graded += result.graded;
  if (result.tip) { c.tips[route] += result.tip; c.tipped[route]++; s.coins += result.tip; s.earned += result.tip; }
  c.receipts.unshift({ route, visitor: visitor.id, amount: receipt.amount, quantity: receipt.quantity, tip: result.tip, quality: result.quality, service: result.service });
  c.receipts.length = Math.min(c.receipts.length, 12);
  return result;
}
export const totalTips = s => s.customerCare.tips.stall + s.customerCare.tips.shop;
