// What the village wants: fresh pumpkins, and one variety at a time. Pure rules.
//   Fresh: pumpkins picked in the last FRESH.seconds. Shoppers take them first
//   and pay up to FRESH.bonus more for each (stock.js quoteBasket).
//   Wanted: every WANTED.seconds the village wants one variety the plots can
//   grow (never the same twice running). It fetches up to WANTED.bonus more,
//   and about WANTED.keen of new guests come with the money and room for one
//   on top of their usual basket. Without one in stock, that money stays in
//   their pocket: the wish rewards stocking it, and never changes what else
//   they buy.
// The extra for fresh and wanted pumpkins only comes from what a shopper has
// left once their basket is full, so it never costs a sale.
import { PLOT_COUNTS } from "../content/farm-layout.js";
import { MAX_VARIETY_INDEX } from "../content/pumpkin-varieties.js";

export const FRESH = Object.freeze({ seconds: 90, bonus: 0.2 });
export const WANTED = Object.freeze({ seconds: 300, bonus: 0.25, keen: 0.15 });

export const freshWanted = () => ({ variety: null, until: 0, serial: 0 });
const draw = (n) => ((Math.imul(n + 0x9e37, 2654435761) >>> 8) % 1000) / 1000;
// The best variety any open plot can grow.
export const bestGrowable = (s) => Math.min(MAX_VARIETY_INDEX, Math.max(0, ...s.plotLevels.slice(0, PLOT_COUNTS[Math.max(0, Math.min(PLOT_COUNTS.length - 1, Math.trunc(s.upgrades.plots || 0)))])));
export const wantedVariety = (s) => (s.wanted && s.time < s.wanted.until ? s.wanted.variety : null);
export const wantedSecondsLeft = (s) => (wantedVariety(s) === null ? 0 : Math.max(0, Math.min(WANTED.seconds, s.wanted.until - s.time)));

// A new wanted variety when the last runs out. With only Orange to grow there is
// nothing to choose between, so nothing is wanted until a second variety is.
export function updateWanted(s, events) {
  const w = s.wanted;
  if (s.time < w.until) return;
  const top = bestGrowable(s), was = w.variety;
  if (top < 1) { w.variety = null; w.until = s.time + 30; return; }
  const options = Array.from({ length: top + 1 }, (_, v) => v).filter((v) => v !== was);
  w.serial++; w.variety = options[Math.floor(draw(w.serial) * options.length)]; w.until = s.time + WANTED.seconds;
  events.push({ type: "wanted", variety: w.variety });
}

// The most a pumpkin of variety v fetches, fresh or not, at base price `price`.
export const dearPrice = (s, v, price, fresh) => Math.round(price * (wantedVariety(s) === v ? 1 + WANTED.bonus : 1) * (fresh ? 1 + FRESH.bonus : 1));

// What a keen guest brings for one wanted pumpkin (null for the rest): the
// variety, and its wanted price.
export function wishFor(s, id, price) {
  const v = wantedVariety(s);
  return v !== null && draw(id * 31 + s.wanted.serial) < WANTED.keen ? { variety: v, purse: dearPrice(s, v, price(v), false) } : null;
}

export function restoreWanted(raw, s) {
  const w = freshWanted();
  if (!raw || typeof raw !== "object") return w;
  w.serial = Number.isSafeInteger(raw.serial) && raw.serial >= 0 ? raw.serial : 0;
  if (Number.isInteger(raw.variety) && raw.variety >= 0 && raw.variety <= bestGrowable(s) && Number.isFinite(raw.until)) {
    w.variety = raw.variety; w.until = Math.max(0, Math.min(s.time + WANTED.seconds, raw.until));
  }
  return w;
}
