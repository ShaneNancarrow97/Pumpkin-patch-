// Carving a pumpkin at the garden's bench, in order: a pumpkin from the barn, in
// the shape picked (content/pumpkin-shapes.js);
// its lid cut round the stem and its pulp scooped out (the seeds go to the
// pantry); a stencil, or freehand; its pieces cut out and etched; the candle
// lit; then decorations. The finished lantern goes on the doorstep (eight at
// most; the oldest gives way) or sells at the village fair. Leaving before the
// lid is cut puts the pumpkin back in the barn.
import { STENCIL_BY_ID, CARVING_DECOR, CARVING_DEFAULTS, CARVING, pieceKind, freePieceOk } from "../content/carving.js";
import { PUMPKIN_VARIETIES, VARIETY_COUNT } from "../content/pumpkin-varieties.js";
import { INGREDIENT_BY_ID } from "../content/cooking.js";
import { shapeOk } from "../content/pumpkin-shapes.js";
import { available, addStock } from "./stock.js";
import { pantryCapacity, pantryCount } from "./cooking.js";

export const freshCarving = () => ({ lanterns: [], current: null, made: 0, sold: 0, nextId: 1 });
const decorOk = (group, id) => CARVING_DECOR[group]?.some((o) => o.id === id);
export const carvingBenches = (s) => (s?.estate?.placed ?? []).filter((p) => p.id === "carving-bench").length;
const fresh = (variety, shape = "ribbed") => ({ variety, shape, lid: false, scooped: false, stencil: null, cut: [], etched: [], free: [], lit: false, decor: { ...CARVING_DEFAULTS, extras: [] }, name: "" });
const begun = (cur) => cur.cut.length + cur.etched.length + cur.free.length > 0;
export const stencilOpen = (s, id) => !!STENCIL_BY_ID[id] && (STENCIL_BY_ID[id].unlock ?? 0) <= (s.carving?.made ?? 0);

export function startCarving(s, variety, shape = "ribbed") {
  const c = s.carving;
  if (!c || s.paused || c.current || !carvingBenches(s) || !Number.isInteger(variety) || variety < 0 || variety >= VARIETY_COUNT || !shapeOk(shape) || available(s, variety) < 1) return false;
  s.stock[variety]--;
  c.current = fresh(variety, shape);
  return c.current;
}
// The lid comes off first, round the stem.
export function cutLid(s) {
  const cur = s.carving?.current;
  if (!cur || s.paused || cur.lid) return false;
  cur.lid = true; return true;
}
// Once nearly all the pulp is out: the seeds go to the kitchen's pantry while
// it has room, and the rest sell at the market for their delivery price.
export function finishScoop(s) {
  const cur = s.carving?.current;
  if (!cur || s.paused || !cur.lid || cur.scooped) return false;
  cur.scooped = true;
  const amount = CARVING.seeds[cur.variety] ?? 4, k = s.kitchen;
  const room = k?.purchased && k.pantry && "seeds" in k.pantry ? Math.max(0, pantryCapacity(s) - pantryCount(s)) : 0;
  const pantry = Math.min(amount, room), sold = amount - pantry, coins = sold * (INGREDIENT_BY_ID.seeds?.price ?? 2);
  if (pantry) k.pantry.seeds += pantry;
  if (coins) { s.coins += coins; s.earned += coins; }
  return { amount, pantry, sold, coins };
}
// A stencil can be swapped until the first cut. The master stencils open as lanterns are made.
export function chooseStencil(s, id) {
  const cur = s.carving?.current;
  if (!cur || s.paused || !cur.scooped || !stencilOpen(s, id) || begun(cur)) return false;
  cur.stencil = id; return true;
}
function piece(cur, id, kind) {
  const st = STENCIL_BY_ID[cur?.stencil], p = st?.pieces.find((x) => x.id === id);
  return p && pieceKind(p) === kind ? p : null;
}
export function cutPiece(s, pieceId) {
  const cur = s.carving?.current;
  if (!cur || s.paused || cur.lit || cur.cut.includes(pieceId) || !piece(cur, pieceId, "cut")) return false;
  cur.cut.push(pieceId); return true;
}
export function etchPiece(s, pieceId) {
  const cur = s.carving?.current;
  if (!cur || s.paused || cur.lit || cur.etched.includes(pieceId) || !piece(cur, pieceId, "etch")) return false;
  cur.etched.push(pieceId); return true;
}
// Freehand: a closed shape drawn with the knife, kept to three decimals.
export function addFreePiece(s, poly) {
  const cur = s.carving?.current;
  if (!cur || s.paused || cur.lit || !STENCIL_BY_ID[cur.stencil]?.freehand || cur.free.length >= CARVING.freeMax || !freePieceOk(poly)) return false;
  cur.free.push(poly.map(([u, v]) => [Math.round(u * 1000) / 1000, Math.round(v * 1000) / 1000]));
  return cur.free.length;
}
export const carvingDone = (s) => {
  const cur = s.carving?.current, st = cur && STENCIL_BY_ID[cur.stencil];
  if (!st) return false;
  if (st.freehand) return cur.free.length > 0;
  return st.pieces.every((p) => (pieceKind(p) === "etch" ? cur.etched : cur.cut).includes(p.id));
};
export function lightCarving(s) {
  const cur = s.carving?.current;
  if (!cur || s.paused || cur.lit || !carvingDone(s)) return false;
  cur.lit = true; return true;
}
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
// A lantern's own name: plain text, trimmed, at most nameMax characters.
export const cleanLanternName = (name) => String(name ?? "").replace(/\s+/g, " ").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, CARVING.nameMax).trim();
export function nameCarving(s, name) {
  const cur = s.carving?.current;
  if (!cur || s.paused) return false;
  cur.name = cleanLanternName(name); return true;
}
export function lanternValue(l) {
  const stencil = STENCIL_BY_ID[l.stencil], d = l.decor ?? CARVING_DEFAULTS;
  const decorations = (d.paint !== "natural") + (d.hat !== "none") + (d.stand !== "plain") + (d.candle !== "warm") + (d.extras?.length ?? 0);
  return PUMPKIN_VARIETIES[l.variety].price * CARVING.priceTimes + (stencil?.difficulty ?? 1) * CARVING.perDifficulty + decorations * CARVING.perDecoration
    + (l.etched?.length ?? 0) * CARVING.perEtch + (l.free?.length ?? 0) * CARVING.perFree;
}
// Keep it on the doorstep, or sell it. A lantern not yet lit is lit as it's finished.
export function finishCarving(s, how = "keep") {
  const c = s.carving, cur = c?.current;
  if (!cur || s.paused || !carvingDone(s) || !["keep", "sell"].includes(how)) return false;
  const lantern = { id: c.nextId++, variety: cur.variety, shape: cur.shape, stencil: cur.stencil, etched: [...cur.etched], free: cur.free.map((p) => p.map((q) => [...q])), decor: { ...cur.decor, extras: [...cur.decor.extras] }, name: cur.name };
  lantern.value = lanternValue(lantern);
  c.current = null; c.made++;
  if (how === "sell") { s.coins += lantern.value; s.earned += lantern.value; c.sold++; }
  else { c.lanterns.push(lantern); while (c.lanterns.length > CARVING.lanternKeep) c.lanterns.shift(); }
  return lantern;
}
// Leaving before the lid is cut gives the pumpkin back; after, it waits on the bench.
export function cancelCarving(s) {
  const c = s.carving, cur = c?.current;
  if (!cur || s.paused) return false;
  if (!cur.lid) addStock(s, cur.variety, 1);
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
const restoreIds = (raw, stencil, kind) => stencil ? [...new Set((Array.isArray(raw) ? raw : []).filter((id) => stencil.pieces.some((p) => p.id === id && pieceKind(p) === kind)))] : [];
const restoreFree = (raw, stencil) => stencil?.freehand ? (Array.isArray(raw) ? raw : []).filter(freePieceOk).slice(0, CARVING.freeMax).map((p) => p.map(([u, v]) => [u, v])) : [];
const lanternOk = (l) => l && Number.isInteger(l.variety) && l.variety >= 0 && l.variety < VARIETY_COUNT && STENCIL_BY_ID[l.stencil];
export function restoreCarving(raw) {
  const c = freshCarving();
  if (!raw || typeof raw !== "object") return c;
  c.made = Number.isSafeInteger(raw.made) && raw.made > 0 ? raw.made : 0;
  c.sold = Number.isSafeInteger(raw.sold) && raw.sold > 0 ? raw.sold : 0;
  for (const l of (Array.isArray(raw.lanterns) ? raw.lanterns : []).slice(-CARVING.lanternKeep)) {
    if (!lanternOk(l)) continue;
    const st = STENCIL_BY_ID[l.stencil];
    // Lanterns from before etching was carved still show every etched piece.
    const lantern = { id: c.nextId++, variety: l.variety, shape: shapeOk(l.shape) ? l.shape : "ribbed", stencil: l.stencil, etched: Array.isArray(l.etched) ? restoreIds(l.etched, st, "etch") : st.pieces.filter((p) => pieceKind(p) === "etch").map((p) => p.id), free: restoreFree(l.free, st), decor: restoreDecor(l.decor), name: cleanLanternName(l.name) };
    if (st.freehand && !lantern.free.length) continue;
    lantern.value = lanternValue(lantern); c.lanterns.push(lantern);
  }
  const cur = raw.current;
  if (cur && Number.isInteger(cur.variety) && cur.variety >= 0 && cur.variety < VARIETY_COUNT) {
    const st = STENCIL_BY_ID[cur.stencil] ?? null, next = fresh(cur.variety, shapeOk(cur.shape) ? cur.shape : "ribbed");
    next.stencil = st ? cur.stencil : null;
    next.cut = restoreIds(cur.cut, st, "cut"); next.etched = restoreIds(cur.etched, st, "etch"); next.free = restoreFree(cur.free, st);
    // A session from before lids and scooping had already got past them.
    const before = typeof cur.lid !== "boolean";
    next.lid = cur.lid === true || (before && (!!st || next.cut.length > 0));
    next.scooped = next.lid && (cur.scooped === true || before);
    next.decor = restoreDecor(cur.decor); next.name = cleanLanternName(cur.name);
    c.current = next;
    next.lit = cur.lit === true && carvingDone({ carving: c });
  }
  return c;
}
