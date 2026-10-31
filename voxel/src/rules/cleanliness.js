// Litter is a small, reversible drag on appeal; a clean farm has no penalty.
// Guests drop it wherever they happen to be on the farm, and the caretakers
// (Visitors & VIPs: "A caretaker", up to two) walk the guests' own paths to
// sweep it up (content/farm-walks.js).
import { fieldDepth, inFarmPatch, extendFarmRoute, ROUTE_IN, ROUTE_OUT, counterSide, COUNTER_GAP } from "../content/farm-layout.js";
import { MEADOW_EXIT } from "../content/festival-meadow.js";
import { hayrideGuestPose } from "../content/hayride-layout.js";
import { walkRoute } from "../content/farm-walks.js";
import { VISIT, visitorLeaveSeconds } from "./selling.js";

export const CLEANLINESS = Object.freeze({ everySales: 4, maximum: 24, grace: 3, floor: .65, janitors: 2, speed: 2.4, sweepSeconds: 1.4 });
// Where each caretaker waits when the farm is clean, by the top of the lane.
export const JANITOR_REST = Object.freeze([Object.freeze({ x: 31.4, z: 10.8 }), Object.freeze({ x: 33, z: 11.6 })]);
// Where rubbish lands when no guest is out on the farm to drop it: the guests' paved lane, never the growing beds.
export const LITTER_SPOTS = Object.freeze([[31.8,10.8],[31.7,12],[31.5,14.8],[31.6,15.6],[30.5,18.5],[30.5,20.5],[30.8,22.1],[32.2,24.1],[32.9,26.4],[33,29],[33,31.8],[35.2,10.5]].map(([x,z])=>Object.freeze({x,z})));
// Anywhere on the farm, the meadow and the hayride's station.
const BOUNDS = { x0: -40, x1: 80, z0: -30, z1: 70 };
export const freshCleanliness = () => ({ litter: [], nextId: 0, seenSales: 0, cleaned: 0, janitors: [] });
const finite = n => Number.isFinite(n), count = n => Number.isSafeInteger(n)&&n>=0?n:0;
const inside = (x, z) => finite(x) && finite(z) && x >= BOUNDS.x0 && x <= BOUNDS.x1 && z >= BOUNDS.z0 && z <= BOUNDS.z1;
// The caretakers hired, from the visitor upgrades.
export const janitorCount = s => Math.min(CLEANLINESS.janitors, count(s?.visitorUpgrades?.janitor));
// The lane's lower part exists only after buying the larger field; rubbish on it beyond the field's end comes back up.
const litterEnd = s => fieldDepth(s)-1.2;
const onLane = (x, z) => x >= 28 && x <= 36 && z >= 10;
const keep = (s, x, z) => onLane(x, z) && z > litterEnd(s) ? { x: Math.max(31, Math.min(33, x)), z: litterEnd(s) } : { x, z };
export function restoreCleanliness(raw,s) {
  const c=freshCleanliness();c.seenSales=count(s?.sold);
  if (!raw || typeof raw!=="object") return c;
  c.cleaned=count(raw.cleaned);c.nextId=count(raw.nextId);
  // Saves from before caretakers were a visitor upgrade: Hettie, hired, is its first tier.
  if(raw.janitor===true&&s?.visitorUpgrades&&count(s.visitorUpgrades.janitor)<1)s.visitorUpgrades.janitor=1;
  const ids=new Set();
  for(const p of Array.isArray(raw.litter)?raw.litter:[]) {
    if(c.litter.length>=CLEANLINESS.maximum)break;
    if(typeof p?.id!=="string"||!/^litter-\d+$/.test(p.id)||ids.has(p.id)||!inside(p.x,p.z))continue;
    ids.add(p.id);const at=keep(s,p.x,p.z),piece={id:p.id,x:at.x,z:at.z,kind:count(p.kind)%3};
    if(finite(p.y)&&p.y>0)piece.y=Math.min(1,p.y);
    c.litter.push(piece);c.nextId=Math.max(c.nextId,Number(p.id.slice(7))+1);
  }
  const saved=Array.isArray(raw.janitors)?raw.janitors:raw.janitorPosition?[{...raw.janitorPosition,sweep:raw.sweep}]:[];
  for(let i=0;i<janitorCount(s);i++){
    const j=saved[i],rest=JANITOR_REST[i],at=j&&inside(j.x,j.z)?keep(s,j.x,j.z):rest;
    c.janitors.push({x:at.x,z:at.z,sweep:finite(j?.sweep)?Math.max(0,Math.min(CLEANLINESS.sweepSeconds,j.sweep)):0,target:typeof j?.target==="string"&&ids.has(j.target)?j.target:null});
  }
  return c;
}
export const cleanlinessFootfall = s => Math.max(CLEANLINESS.floor,1-Math.max(0,(s.cleanliness?.litter.length??0)-CLEANLINESS.grace)*.025);
export function cleanlinessStatus(s) {
  const c=s.cleanliness??freshCleanliness(),footfall=cleanlinessFootfall(s),penalty=Math.round((1-footfall)*100),janitors=janitorCount(s);
  return {count:c.litter.length,score:Math.round(footfall*100),footfall,penalty,label:c.litter.length===0?"Spotless":!penalty?"A little untidy":penalty<20?"Needs a sweep":"Litter is putting guests off",janitor:janitors>0,janitors,dropped:c.nextId>0,cleaned:c.cleaned};
}
export const litterAt = (s,id) => s.cleanliness?.litter.find(p=>p.id===id)??null;
export function cleanLitter(s,id) {
  if(s.paused)return false;
  const c=s.cleanliness,i=c?.litter.findIndex(p=>p.id===id)??-1;
  if(i<0)return false;c.litter.splice(i,1);c.cleaned++;return true;
}

// Where a guest is standing on the farm, as the scene draws them, or null
// when they're indoors, in the Hollow House, aboard the wagon or off the farm.
const OUTDOOR_HOLLOW = ["approach", "arriving-house", "door-wait", "to-border", "to-shop"];
const pathLength = r => r.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - r[i][0], p[1] - r[i][1]), 0);
function along(route, distance) {
  let left = Math.max(0, distance);
  for (let i = 1; i < route.length; i++) {
    const [ax, az] = route[i - 1], [bx, bz] = route[i], n = Math.hypot(bx - ax, bz - az);
    if (left <= n) { const t = n ? left / n : 0; return { x: ax + (bx - ax) * t, z: az + (bz - az) * t }; }
    left -= n;
  }
  const [x, z] = route.at(-1); return { x, z };
}
export function visitorGround(s, v) {
  if (v.social && !v.social.gone) return v.social;
  if (v.hayride && !v.hayride.done) { const p = hayrideGuestPose(s, v); return p && p.visible !== false && !p.seated ? p : null; }
  if (v.hollow && !v.hollow.done) return OUTDOOR_HOLLOW.includes(v.hollow.phase) ? v.hollow : null;
  if (v.festival && !v.festival.done) return v.festival;
  const leaving = v.leaveAt !== null && v.age >= v.leaveAt, t = leaving ? (v.age - v.leaveAt) / visitorLeaveSeconds(s) : Math.min(1, v.age / VISIT.arrive);
  if (leaving && t > .95) return null;
  const route = leaving ? (s.festival?.meadow ? MEADOW_EXIT : ROUTE_OUT) : extendFarmRoute(ROUTE_IN, s), p = along(route, t * pathLength(route));
  const fan = leaving ? Math.max(0, 1 - t * 4) : Math.max(0, (t - .8) / .2);
  return { x: p.x + counterSide(v.spot ?? 0) * COUNTER_GAP * fan, z: p.z };
}
// The next piece: dropped by one of the guests out on the farm, a step from
// where they stand, and what it is from what they carry. Without a guest
// outside, on the lane.
function dropPlace(s, id) {
  const plots = s.upgrades?.plots ?? 0, out = [];
  for (const v of s.visitors ?? []) {
    const p = visitorGround(s, v);
    if (p && inside(p.x, p.z) && !inFarmPatch(p.x, p.z, plots)) out.push({ v, p });
  }
  if (!out.length) { const end = litterEnd(s), spots = LITTER_SPOTS.filter((p) => p.z <= end), p = spots[(id * 7) % spots.length], j = (id % 3 - 1) * .17; return { x: p.x + j, z: Math.min(end, p.z - j), kind: id % 3 }; }
  const { v, p } = out[(id * 7 + 3) % out.length], a = id * 2.39996, x = p.x + Math.cos(a) * .28, z = p.z + Math.sin(a) * .28, step = !inFarmPatch(x, z, plots);
  const place = { x: step ? x : p.x, z: step ? z : p.z, kind: v.cocoaSpend && v.cocoaKind != null ? 0 : v.snack ? 2 : id % 3 };
  if (finite(p.y) && p.y > .05) place.y = Math.min(1, p.y);
  return place;
}

// Each caretaker's way to where they're going; worked out again after a load.
const ways = new WeakMap();
// The nearest piece no other caretaker is already after.
function nextPiece(c, j) {
  const taken = new Set(c.janitors.filter((o) => o !== j && o.target).map((o) => o.target));
  let best = null, bestD = Infinity;
  for (const p of c.litter) { if (taken.has(p.id)) continue; const d = Math.hypot(p.x - j.x, p.z - j.z); if (d < bestD) { best = p; bestD = d; } }
  return best?.id ?? null;
}
function sweepUp(s, c, dt, events) {
  const n = janitorCount(s);
  if (c.janitors.length > n) c.janitors.length = n;
  while (c.janitors.length < n) { const r = JANITOR_REST[c.janitors.length]; c.janitors.push({ x: r.x, z: r.z, sweep: 0, target: null }); }
  c.janitors.forEach((j, i) => {
    // A large simulation step still walks each way and visits each piece before sweeping it.
    let left = Math.min(60, dt);
    while (left > .0001) {
      if (j.target && !litterAt(s, j.target)) { j.target = null; j.sweep = 0; }
      if (!j.target) j.target = nextPiece(c, j);
      const goal = j.target ? litterAt(s, j.target) : JANITOR_REST[i], key = j.target ?? "rest";
      let way = ways.get(j);
      if (!way || way.key !== key) { way = { key, points: walkRoute(s, j, goal) }; ways.set(j, way); }
      while (way.points.length && left > .0001) {
        const [x, z] = way.points[0], d = Math.hypot(x - j.x, z - j.z);
        if (d < .02) { way.points.shift(); continue; }
        const t = Math.min(left, d / CLEANLINESS.speed), k = t * CLEANLINESS.speed / d;
        j.x += (x - j.x) * k; j.z += (z - j.z) * k; left -= t; j.sweep = 0;
      }
      if (way.points.length || !j.target) break;
      const t = Math.min(left, CLEANLINESS.sweepSeconds - j.sweep); j.sweep += t; left -= t;
      if (j.sweep < CLEANLINESS.sweepSeconds - .0001) break;
      const id = j.target; cleanLitter(s, id); j.sweep = 0; j.target = null; events.push({ type: "litter-cleaned", id, janitor: true, by: i });
    }
  });
}
// Paid visits create rubbish deterministically. Old saves never receive a backlog.
export function updateCleanliness(s,dt,events=[]) {
  if(s.paused||!finite(dt)||dt<=0)return;
  const c=s.cleanliness??=(freshCleanliness()),sold=count(s.sold),previous=Math.min(sold,c.seenSales);
  const drops=Math.min(CLEANLINESS.maximum,Math.floor(sold/CLEANLINESS.everySales)-Math.floor(previous/CLEANLINESS.everySales));c.seenSales=sold;
  for(let i=0;i<drops&&c.litter.length<CLEANLINESS.maximum;i++) {
    const id=c.nextId++,place=dropPlace(s,id);
    c.litter.push({id:"litter-"+id,...place});
  }
  c.janitors??=[];
  sweepUp(s,c,dt,events);
}
