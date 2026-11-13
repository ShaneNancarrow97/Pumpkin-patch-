// A resident has two anchors: a clear approach for interaction and their feet
// for the camera. Resolve both live so prompts, menus and actions agree.
import { PLAN_SCALE } from "./content/village.js";
import { EXPANSION_AREAS, EXPANSION_AREA_BY_ID } from "./content/village-expansion.js";
import { FOLK_BY_ID, HOST_BY_ID } from "./content/village-folk.js";
import { expansionAreaInfo } from "./rules/village-expansion-access.js";
import { inTownSquare } from "./rules/village-spread.js";
import { villageHallFree } from "./rules/village-navigation.js";

export const RESIDENT_TALK_REACH = 3;
export const RESIDENT_HALL_TALK_REACH = 3.3;
export const RESIDENT_REACH_EPSILON = 1e-6;
const finitePoint = point => Number.isFinite(point?.x) && Number.isFinite(point?.z);
export const withinResidentReach = (distance, reach) => Number.isFinite(distance) && distance <= reach + RESIDENT_REACH_EPSILON;

// Spread district rectangles can overlap the Green. Prefer the smallest
// containing district; the added Square has its own name on the spread grid.
export function villageResidentLocation(point) {
  if (!finitePoint(point)) return null;
  if (inTownSquare(point.x / PLAN_SCALE, point.z / PLAN_SCALE)) return { area: "square", name: "Moonclock Square" };
  const area = EXPANSION_AREAS.filter(a => a.layer !== "cave" && point.x >= a.bounds[0] && point.x <= a.bounds[2] && point.z >= a.bounds[1] && point.z <= a.bounds[3])
    .sort((a, b) => (a.bounds[2] - a.bounds[0]) * (a.bounds[3] - a.bounds[1]) - (b.bounds[2] - b.bounds[0]) * (b.bounds[3] - b.bounds[1]))[0];
  return area ? { area: area.id, name: area.name } : { area: null, name: "Village paths" };
}

function hallApproach(plan) {
  const [x, z] = plan.hall.host;
  if (villageHallFree(plan, x, z)) return { x, z };
  // A counter may contain the host's feet. Find the nearest clear standing
  // position, favouring the side towards the entrance.
  for (let distance = .25; distance <= 4.5; distance += .25) {
    for (const turn of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI]) {
      const point = { x: x + Math.sin(turn) * distance / PLAN_SCALE, z: z + Math.cos(turn) * distance / PLAN_SCALE };
      if (villageHallFree(plan, point.x, point.z)) return point;
    }
  }
  return null;
}

export function resolveVillageResidentInteraction({ id, state, view, position, insides, doorNormal, targets = view.expansionTargets ?? [] }) {
  const person = FOLK_BY_ID[id] ?? HOST_BY_ID[id], entry = Object.entries(insides).find(([, plan]) => plan.host === id);
  const [homeId, homePlan] = entry ?? [], homeArea = homePlan?.area ?? person?.district ?? "green";
  const gate = expansionAreaInfo(state, homeArea), home = homePlan ? { id: homeId, name: homePlan.name, area: homeArea } : null;
  const currentHall = insides[view.inside], here = currentHall?.host === id;
  let point = null, feet = null, inside = null, realm = "surface", live = false, area = homeArea, location = null;

  if (here) {
    const approach = hallApproach(currentHall), foot = view.hallPoint(...currentHall.hall.host, .12);
    if (approach) { const p = view.hallPoint(approach.x, approach.z); point = { x: p.x, z: -p.z }; }
    feet = { x: foot.x, y: foot.y, z: -foot.z, inside: view.inside, folkId: id };
    inside = view.inside; realm = `hall:${inside}`; live = !!point; area = currentHall.area ?? homeArea; location = currentHall.name;
  } else {
    // spotOf also returns authored fallback positions for unloaded residents;
    // only rendered presence proves these coordinates describe someone now.
    const rendered = view.folk.people?.get?.(id);
    const target = targets.find(t => t.type === "village-folk" && t.id === id && !t.inside && !t.hallId && !t.area?.startsWith("cave"));
    const present = view.folk.people ? !!rendered?.root?.visible : !!target;
    if (present) {
      const actual = view.folk.spotOf?.(id) ?? target, approach = view.folk.talkSpot?.(id);
      if (finitePoint(actual) && finitePoint(approach)) {
        point = { x: approach.x, z: approach.z };
        feet = { ...actual, y: Number.isFinite(actual.y) ? actual.y : view.groundAt?.(actual.x, actual.z) ?? 0, folkId: id };
        const place = villageResidentLocation(actual); area = place.area ?? homeArea; location = place.name; live = true;
      }
    }
  }

  const liveGate = expansionAreaInfo(state, area === "square" ? "green" : area), accessGate = !gate?.open ? gate : liveGate;
  const available = live && !!gate?.open && !!liveGate?.open;
  const samePlace = available && (inside ? view.inside === inside : !view.inside && !view.activeExpansionArea);
  const distance = samePlace && finitePoint(position) ? Math.hypot(point.x - position.x, point.z - position.z) : null;
  const reach = inside ? RESIDENT_HALL_TALK_REACH : RESIDENT_TALK_REACH;
  let destination = point ? { ...point, inside, realm, area, folkId: id } : null;
  if (!live && homePlan) {
    const [nx, nz] = doorNormal[homePlan.door.facing];
    destination = { x: (homePlan.door.x + nx * 3.2) * PLAN_SCALE, z: (homePlan.door.z + nz * 3.2) * PLAN_SCALE, hallId: homeId, area: homeArea, realm: "surface", folkId: id };
  }
  const reason = !accessGate?.open ? accessGate?.reason ?? "This neighbour's district is not open yet." : !live ? view.canEnterInside?.(homeId) === false ? "Their home is not open yet; current whereabouts unconfirmed." : "Whereabouts unconfirmed; visit their known home." : null;
  if (!live) location = home ? `Known home · ${home.name} · ${EXPANSION_AREA_BY_ID[homeArea]?.name ?? homeArea}` : "Whereabouts unconfirmed";
  return { id, name: person?.name ?? id, short: person?.short ?? person?.name ?? id, point, feet, destination, inside, realm, area, home, live, available, samePlace, distance, reach, nearby: samePlace && withinResidentReach(distance, reach), location, reason,
    target: point ? { ...point, type: "village-folk", id, folkId: id, inside, realm, area, reach } : null };
}
