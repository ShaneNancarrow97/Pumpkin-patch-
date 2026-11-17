import { HOME_BONDS } from "../content/homecoming.js";

const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const count = value => Number.isFinite(value) && value > 0 ? Math.min(1e9, Math.floor(value)) : 0;
const has = (values, id) => Array.isArray(values) && values.includes(id);
const claimed = (s, id) => record(s?.village?.claims) && Object.hasOwn(s.village.claims, `homecoming:${id}`) && s.village.claims[`homecoming:${id}`] === true;

// Accept the expansion's previous reward lists as well as its current effect
// ledger. Older eligible saves receive the same keepsake without replaying work.
function villageReward(s, id) {
  const expansion = s?.village?.expansion;
  return [expansion?.effects, expansion?.unlocks, expansion?.rewards].some(values => has(values, id));
}
function chapterDone(s, id) {
  return s?.village?.expansion?.chapters?.[id] === true || villageReward(s, id);
}
function progress(s, id) {
  const economy = s?.village?.expansion?.economy;
  switch (id) {
    case "herb-beds": return Number(villageReward(s, "herb-beds"));
    case "herbs-prepared": return count(economy?.herbsProcessed);
    case "stock-treated": return count(economy?.treatments);
    case "restaurant-opening": return Number(chapterDone(s, id));
    case "home-suppers": return count(s?.progression?.homeActivities?.cook);
    case "cinder-commissions": return count(economy?.commissions?.["cinder-first-supper"]?.done);
    case "moor-stage": return Number(chapterDone(s, id));
    case "turning-scarecrows": return Number(has(s?.hayride?.haunts?.owned, id));
    case "hayride-guests": return count(s?.hayride?.completed);
    default: return 0;
  }
}

// A read model shared by the village and farm wardrobe. Reading must not settle
// a reward or mutate a save; only the authoritative model update awards looks.
export function homecomingInfo(s) {
  return HOME_BONDS.map(bond => {
    const steps = bond.steps.map(step => {
      const have = Math.min(step.need, progress(s, step.id));
      return { label: step.label, have, need: step.need, complete: have >= step.need, world: step.world };
    });
    const owned = claimed(s, bond.id) || bond.lookIds.every(id => has(s?.looks?.owned, id));
    return { id: bond.id, name: bond.name, clue: bond.clue, icon: bond.icon, benefit: bond.benefit,
      owned, ready: !owned && steps.every(step => step.complete), steps, lookIds: [...bond.lookIds] };
  });
}

// Both owners receive their colours together. Existing selections, costumes,
// coins, earned income and progression remain untouched. Reconcile partially
// restored ownership silently, so a recorded keepsake never pays out twice.
export function awardHomecomingLooks(s, events = []) {
  if (!record(s) || s.paused || !record(s.village) || !record(s.looks) || !Array.isArray(s.looks.owned)) return [];
  // Model updates happen every frame. Settled pairs need only three claim and
  // six ownership checks; do not build UI progress rows or copy settled ledgers.
  const incoming = [];
  for (const bond of HOME_BONDS) {
    const recorded = claimed(s, bond.id), paired = bond.lookIds.every(id => s.looks.owned.includes(id));
    if (recorded && paired) continue;
    if (recorded || paired || bond.steps.every(step => progress(s, step.id) >= step.need)) incoming.push({ bond, ready: !recorded && !paired });
  }
  if (!incoming.length) return [];
  const claims = record(s.village.claims) ? { ...s.village.claims } : {};
  const owned = [...s.looks.owned], awarded = [];
  let changed = false;
  for (const { bond, ready } of incoming) {
    const key = `homecoming:${bond.id}`;
    if (claims[key] !== true) { claims[key] = true; changed = true; }
    for (const id of bond.lookIds) if (!owned.includes(id)) { owned.push(id); changed = true; }
    if (ready) awarded.push(bond.id);
  }
  if (changed) {
    s.village.claims = claims;
    s.looks.owned = owned;
  }
  if (Array.isArray(events)) for (const id of awarded) events.push({ type: "homecoming-unlocked", id });
  return awarded;
}
