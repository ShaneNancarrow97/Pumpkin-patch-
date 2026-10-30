// Carving a pumpkin at the garden's bench: one from the barn, a stencil, its
// pieces cut out one by one, then decorations. The finished lantern goes on the
// doorstep (eight at most; the oldest gives way) or sells at the village fair.
// Leaving before the first cut puts the pumpkin back in the barn.
import { STENCIL_BY_ID, CARVING_DECOR, CARVING_DEFAULTS, CARVING } from "../content/carving.js";
import { PUMPKIN_VARIETIES, VARIETY_COUNT } from "../content/pumpkin-varieties.js";
import { available, addStock } from "./stock.js";

export const freshCarving = () => ({ lanterns: [], current: null, made: 0, sold: 0, nextId: 1 });
const decorOk = (group, id) => CARVING_DECOR[group]?.some((o) => o.id === id);
export const carvingBenches = (s) => (s?.estate?.placed ?? []).filter((p) => p.id === "carving-bench").length;

export function startCarving(s, variety) {
  const c = s.carving;
  if (!c || s.paused || c.current || !carvingBenches(s) || !Number.isInteger(variety) || variety < 0 || variety >= VARIETY_COUNT || available(s, variety) < 1) return false;
  s.stock[variety]--;
  c.current = { variety, stencil: null, cut: [], decor: { ...CARVING_DEFAULTS, extras: [] } };
  return c.current;
}
// A stencil can be swapped until the first cut.
export function chooseStencil(s, id) {
  const cur = s.carving?.current;
  if (!cur || s.paused || !STENCIL_BY_ID[id] || cur.cut.length) return false;
  cur.stencil = id; return true;
}
export function cutPiece(s, pieceId) {
  const cur = s.carving?.current, stencil = cur && STENCIL_BY_ID[cur.stencil];
  if (!stencil || s.paused || cur.cut.includes(pieceId) || !stencil.pieces.some((p) => p.id === pieceId)) return false;
  cur.cut.push(pieceId); return true;
}
export const carvingDone = (s) => { const cur = s.carving?.current, st = cur && STENCIL_BY_ID[cur.stencil]; return !!st && st.pieces.every((p) => cur.cut.includes(p.id)); };
export function setCarvingDecor(s, group, id) {
  const cur = s.carving?.current;
  if (!cur || s.paused) return false;
  if (group === "extras") {
    if (!decorOk("extras", id)) return false;
    cur.decor.extras = cur.decor.extras.includes(id) ? cur.decor.extras.filter((e) => e !== id) : [...cur.decor.extras, id];
    return true;
  }
  if (!decorOk(group, id)) return false;
  cur.decor[group] = id; return true;
}
export function lanternValue(l) {
  const stencil = STENCIL_BY_ID[l.stencil], d = l.decor ?? CARVING_DEFAULTS;
  const decorations = (d.paint !== "natural") + (d.hat !== "none") + (d.stand !== "plain") + (d.candle !== "warm") + (d.extras?.length ?? 0);
  return PUMPKIN_VARIETIES[l.variety].price * CARVING.priceTimes + (stencil?.difficulty ?? 1) * CARVING.perDifficulty + decorations * CARVING.perDecoration;
}
// Keep it on the doorstep, or sell it. Returns the finished lantern.
export function finishCarving(s, how = "keep") {
  const c = s.carving, cur = c?.current;
  if (!cur || s.paused || !carvingDone(s) || !["keep", "sell"].includes(how)) return false;
  const lantern = { id: c.nextId++, variety: cur.variety, stencil: cur.stencil, decor: { ...cur.decor, extras: [...cur.decor.extras] } };
  lantern.value = lanternValue(lantern);
  c.current = null; c.made++;
  if (how === "sell") { s.coins += lantern.value; s.earned += lantern.value; c.sold++; }
  else { c.lanterns.push(lantern); while (c.lanterns.length > CARVING.lanternKeep) c.lanterns.shift(); }
  return lantern;
}
export function cancelCarving(s) {
  const c = s.carving, cur = c?.current;
  if (!cur || s.paused) return false;
  if (!cur.cut.length) addStock(s, cur.variety, 1);
  c.current = null; return true;
}
// A doorstep lantern can still be sold later.
export function sellLantern(s, id) {
  const c = s.carving, i = c?.lanterns.findIndex((l) => l.id === id) ?? -1;
  if (s.paused || i < 0) return false;
  const [l] = c.lanterns.splice(i, 1); s.coins += l.value; s.earned += l.value; c.sold++; return l.value;
}

function restoreDecor(raw) {
  const d = { ...CARVING_DEFAULTS, extras: [] };
  for (const g of ["candle", "paint", "hat", "stand"]) if (decorOk(g, raw?.[g])) d[g] = raw[g];
  d.extras = [...new Set((Array.isArray(raw?.extras) ? raw.extras : []).filter((e) => decorOk("extras", e)))];
  return d;
}
const lanternOk = (l) => l && Number.isInteger(l.variety) && l.variety >= 0 && l.variety < VARIETY_COUNT && STENCIL_BY_ID[l.stencil];
export function restoreCarving(raw) {
  const c = freshCarving();
  if (!raw || typeof raw !== "object") return c;
  c.made = Number.isSafeInteger(raw.made) && raw.made > 0 ? raw.made : 0;
  c.sold = Number.isSafeInteger(raw.sold) && raw.sold > 0 ? raw.sold : 0;
  for (const l of (Array.isArray(raw.lanterns) ? raw.lanterns : []).slice(-CARVING.lanternKeep)) {
    if (!lanternOk(l)) continue;
    const lantern = { id: c.nextId++, variety: l.variety, stencil: l.stencil, decor: restoreDecor(l.decor) };
    lantern.value = lanternValue(lantern); c.lanterns.push(lantern);
  }
  const cur = raw.current;
  if (cur && Number.isInteger(cur.variety) && cur.variety >= 0 && cur.variety < VARIETY_COUNT) {
    const stencil = STENCIL_BY_ID[cur.stencil] ? cur.stencil : null;
    c.current = { variety: cur.variety, stencil, cut: stencil ? [...new Set((Array.isArray(cur.cut) ? cur.cut : []).filter((id) => STENCIL_BY_ID[stencil].pieces.some((p) => p.id === id)))] : [], decor: restoreDecor(cur.decor) };
  }
  return c;
}
