// The separate garden is a cosmetic collection, with shared-house progression.
// Coordinates, ownership and paid transactions live here, never in the scene.
import { ESTATE_EXPANSIONS, ESTATE_DECOR, ESTATE_DECOR_BY_ID, ESTATE_FINISHES, ESTATE_FINISH_BY_ID, ESTATE_DEFAULT_FINISHES, ESTATE_HOUSE_RESERVE, ESTATE_PATH_HALF_WIDTH, ESTATE_BORDER, ESTATE_HOUSE_SKINS, ESTATE_SKIN_BY_ID } from "../content/house-estate.js";
import { validPieceColour } from "./piece-colours.js";
import { restoreGardenCrop } from "./garden-crops.js";
export { ESTATE_EXPANSIONS, ESTATE_DECOR, ESTATE_DECOR_BY_ID, ESTATE_FINISHES, ESTATE_FINISH_BY_ID, ESTATE_DEFAULT_FINISHES, ESTATE_HOUSE_SKINS, ESTATE_SKIN_BY_ID } from "../content/house-estate.js";

const EPS = 1e-6, MAX_COPIES = 200, MAX_INSTANCE = 1000000;
const count = (n, cap = MAX_COPIES) => Number.isSafeInteger(n) ? Math.max(0, Math.min(cap, n)) : 0;
const angle = n => ((n % 360) + 360) % 360;
const baseFinishes = () => ({ ...ESTATE_DEFAULT_FINISHES });
const inventory = () => Object.fromEntries(ESTATE_DECOR.map(d => [d.id, 0]));
const freeFinishes = () => Object.values(ESTATE_DEFAULT_FINISHES);

// Five movable welcome pieces; storing one returns it to the garden inventory.
export function freshEstate() {
  return { expansion: 0, finishes: baseFinishes(), ownedFinishes: freeFinishes(), ownedDecor: inventory(), nextInstance: 5, invested: 0,
    placed: [
      { instance: "garden-0", id: "lantern-post", x: -3, z: 8, rotation: 0 },
      { instance: "garden-1", id: "lantern-post", x: 3, z: 8, rotation: 0 },
      { instance: "garden-2", id: "rose-bed", x: -10, z: -4, rotation: 0 },
      { instance: "garden-3", id: "garden-bench", x: 10, z: 2, rotation: 0 },
      { instance: "garden-4", id: "pumpkin-pile", x: 5.2, z: 9.3, rotation: 0 },
    ] };
}

export function estateBounds(s) {
  const tier = ESTATE_EXPANSIONS[count(s?.estate?.expansion, ESTATE_EXPANSIONS.length - 1)];
  return { ...tier, x0: -tier.width / 2, x1: tier.width / 2, z0: -tier.depth / 2, z1: tier.depth / 2 };
}
const nextExpansion = s => ESTATE_EXPANSIONS[count(s?.estate?.expansion, ESTATE_EXPANSIONS.length - 1) + 1];
const spendable = (s, cost) => s && !s.paused && s.estate && Number.isFinite(s.coins) && s.coins >= cost;
export function canExpandEstate(s) {
  const next = nextExpansion(s); return !!next && (s?.house?.level ?? 0) >= next.houseLevel && spendable(s, next.cost);
}
export function expandEstate(s) {
  if (!canExpandEstate(s)) return false;
  const next = nextExpansion(s); s.coins -= next.cost; s.estate.invested += next.cost; s.estate.expansion++; return true;
}

// Oriented rectangles keep 360-degree placement honest without enlarging every
// rotated piece to a square. Touching edges are legal; crossing them is not.
function rect(id, x, z, rotation) {
  const d = ESTATE_DECOR_BY_ID[id], a = angle(rotation) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
  return { x, z, hx: d.w / 2, hz: d.d / 2, ux: c, uz: -sn, vx: sn, vz: c };
}
const axisRect = r => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2, hx: (r.x1 - r.x0) / 2, hz: (r.z1 - r.z0) / 2, ux: 1, uz: 0, vx: 0, vz: 1 });
function overlaps(a, b) {
  for (const [x, z] of [[a.ux, a.uz], [a.vx, a.vz], [b.ux, b.uz], [b.vx, b.vz]]) {
    const distance = Math.abs((a.x - b.x) * x + (a.z - b.z) * z);
    const ra = a.hx * Math.abs(a.ux * x + a.uz * z) + a.hz * Math.abs(a.vx * x + a.vz * z);
    const rb = b.hx * Math.abs(b.ux * x + b.uz * z) + b.hz * Math.abs(b.vx * x + b.vz * z);
    if (distance >= ra + rb - EPS) return false;
  }
  return true;
}
export function estateFits(s, id, x, z, rotation = 0, ignoreInstance) {
  if (!s?.estate || typeof id !== "string" || !ESTATE_DECOR_BY_ID[id] || ![x, z, rotation].every(Number.isFinite)) return false;
  const b = estateBounds(s), r = rect(id, x, z, rotation), hw = Math.abs(r.ux) * r.hx + Math.abs(r.vx) * r.hz, hd = Math.abs(r.uz) * r.hx + Math.abs(r.vz) * r.hz;
  if (x - hw < b.x0 + ESTATE_BORDER - EPS || x + hw > b.x1 - ESTATE_BORDER + EPS || z - hd < b.z0 + ESTATE_BORDER - EPS || z + hd > b.z1 - ESTATE_BORDER + EPS) return false;
  if (overlaps(r, axisRect(ESTATE_HOUSE_RESERVE)) || overlaps(r, axisRect({ x0: -ESTATE_PATH_HALF_WIDTH, x1: ESTATE_PATH_HALF_WIDTH, z0: ESTATE_HOUSE_RESERVE.z1, z1: b.z1 }))) return false;
  return !s.estate.placed.some(p => p.instance !== ignoreInstance && overlaps(r, rect(p.id, p.x, p.z, p.rotation)));
}

export function buyEstateDecor(s, id) {
  const d = typeof id === "string" ? ESTATE_DECOR_BY_ID[id] : null;
  if (!d || (s?.house?.level ?? 0) < d.houseLevel || !spendable(s, d.cost)) return false;
  const owned = (s.estate.ownedDecor[id] ?? 0) + s.estate.placed.filter(p => p.id === id).length;
  if (owned >= MAX_COPIES) return false;
  s.coins -= d.cost; s.estate.invested += d.cost; s.estate.ownedDecor[id] = (s.estate.ownedDecor[id] ?? 0) + 1; return true;
}

function newInstance(e) {
  const used = new Set(e.placed.map(p => p.instance));
  let n = count(e.nextInstance, MAX_INSTANCE);
  while (used.has("garden-" + n)) n++;
  e.nextInstance = n + 1; return "garden-" + n;
}
export function placeEstateDecor(s, id, x, z, rotation = 0) {
  if (s?.paused || !s?.estate || typeof id !== "string" || !s.estate.ownedDecor[id] || s.estate.placed.length >= estateBounds(s).capacity || !estateFits(s, id, x, z, rotation)) return false;
  const p = { instance: newInstance(s.estate), id, x, z, rotation: angle(rotation) };
  s.estate.ownedDecor[id]--; s.estate.placed.push(p); return p;
}
export function moveEstateDecor(s, instance, x, z, rotation) {
  const p = s?.estate?.placed.find(p => p.instance === instance);
  if (!p || s.paused || !estateFits(s, p.id, x, z, rotation ?? p.rotation, instance)) return false;
  Object.assign(p, { x, z, rotation: angle(rotation ?? p.rotation) }); return p;
}
export function storeEstateDecor(s, instance) {
  const e = s?.estate, i = e?.placed.findIndex(p => p.instance === instance) ?? -1;
  if (s?.paused || i < 0) return false;
  const [p] = e.placed.splice(i, 1); e.ownedDecor[p.id] = (e.ownedDecor[p.id] ?? 0) + 1; return true;
}

export function buyEstateFinish(s, id) {
  const f = typeof id === "string" ? ESTATE_FINISH_BY_ID[id] : null;
  if (!f || f.skinOnly || (s?.house?.level ?? 0) < f.houseLevel || !spendable(s, f.cost) || s.estate.ownedFinishes.includes(id)) return false;
  s.coins -= f.cost; s.estate.invested += f.cost; s.estate.ownedFinishes.push(id); return true;
}
export function equipEstateFinish(s, id) {
  const f = typeof id === "string" ? ESTATE_FINISH_BY_ID[id] : null;
  if (s?.paused || !s?.estate || !f || !s.estate.ownedFinishes.includes(id)) return false;
  s.estate.finishes[f.category] = id; return true;
}
// A skin owns four ordinary finishes as one paid collection, never four charges.
export function ownsEstateSkin(s, id) {
  const skin = typeof id === "string" ? ESTATE_SKIN_BY_ID[id] : null;
  return !!skin && !!s?.estate && Object.values(skin.finishes).every(part => s.estate.ownedFinishes.includes(part));
}
export function activeEstateSkin(s) {
  return ESTATE_HOUSE_SKINS.find(skin => Object.entries(skin.finishes).every(([part, id]) => s?.estate?.finishes?.[part] === id)) ?? null;
}
export function buyEstateSkin(s, id) {
  const skin = typeof id === "string" ? ESTATE_SKIN_BY_ID[id] : null;
  if (!skin || (s?.house?.level ?? 0) < skin.houseLevel || !spendable(s, skin.cost) || ownsEstateSkin(s, id)) return false;
  s.coins -= skin.cost; s.estate.invested += skin.cost;
  for (const part of Object.values(skin.finishes)) if (!s.estate.ownedFinishes.includes(part)) s.estate.ownedFinishes.push(part);
  return true;
}
export function equipEstateSkin(s, id) {
  if (s?.paused || !ownsEstateSkin(s, id)) return false;
  Object.assign(s.estate.finishes, ESTATE_SKIN_BY_ID[id].finishes); return true;
}
// Reuse the free house palette without touching fencing or collected finishes.
export function equipClassicEstateLook(s) {
  const e = s?.estate;
  if (s?.paused || !e?.finishes || typeof e.finishes !== "object" || Array.isArray(e.finishes) || !Array.isArray(e.ownedFinishes)) return false;
  const parts = ["walls", "roof", "trim", "door"];
  if (!parts.every(part => e.ownedFinishes.includes(ESTATE_DEFAULT_FINISHES[part]))) return false;
  for (const part of parts) e.finishes[part] = ESTATE_DEFAULT_FINISHES[part];
  return true;
}
export const estateScore = s => (s?.estate?.placed ?? []).reduce((score, p) => score + (ESTATE_DECOR_BY_ID[p.id]?.score ?? 0), 0);

// Invalid old placements return to inventory rather than disappearing. New
// fields default to the free welcome garden without changing an existing house.
export function restoreEstate(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return freshEstate();
  const e = { expansion: count(raw.expansion, ESTATE_EXPANSIONS.length - 1), finishes: baseFinishes(), ownedFinishes: freeFinishes(), ownedDecor: inventory(), placed: [], nextInstance: count(raw.nextInstance, MAX_INSTANCE), invested: Number.isFinite(raw.invested) ? Math.max(0, Math.min(1e12, raw.invested)) : 0 };
  for (const id of Object.keys(e.ownedDecor)) e.ownedDecor[id] = count(raw.ownedDecor?.[id]);
  for (const id of Array.isArray(raw.ownedFinishes) ? raw.ownedFinishes : []) if (typeof id === "string" && ESTATE_FINISH_BY_ID[id] && !e.ownedFinishes.includes(id)) e.ownedFinishes.push(id);
  for (const [category, fallback] of Object.entries(ESTATE_DEFAULT_FINISHES)) {
    const id = raw.finishes?.[category]; e.finishes[category] = typeof id === "string" && ESTATE_FINISH_BY_ID[id]?.category === category && e.ownedFinishes.includes(id) ? id : fallback;
  }
  const used = new Set(), state = { estate: e };
  for (const p of (Array.isArray(raw.placed) ? raw.placed : []).slice(0, MAX_COPIES * ESTATE_DECOR.length)) {
    if (!p || typeof p.id !== "string" || !ESTATE_DECOR_BY_ID[p.id]) continue;
    const total = e.ownedDecor[p.id] + e.placed.filter(q => q.id === p.id).length;
    if (total >= MAX_COPIES) continue;
    if (e.placed.length >= estateBounds(state).capacity || !estateFits(state, p.id, p.x, p.z, p.rotation ?? 0)) { e.ownedDecor[p.id]++; continue; }
    let instance = typeof p.instance === "string" && /^garden-\d{1,7}$/.test(p.instance) && !used.has(p.instance) ? p.instance : null;
    if (!instance) instance = newInstance(e);
    used.add(instance);
    const crop = restoreGardenCrop(p.crop, p.id);
    e.placed.push({ instance, id: p.id, x: p.x, z: p.z, rotation: angle(p.rotation ?? 0), ...(validPieceColour(p.tint)?{tint:p.tint}:{}), ...(crop ? { crop } : {}) });
    e.nextInstance = Math.max(e.nextInstance, Number(instance.slice(7)) + 1);
  }
  return e;
}
