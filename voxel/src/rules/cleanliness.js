// Litter is a small, reversible drag on appeal; a clean farm has no penalty.
import { patchLevel } from "./levels.js";

export const CLEANLINESS = Object.freeze({ everySales: 4, maximum: 24, grace: 3, floor: .65, janitorCost: 450, janitorLevel: 3, speed: 2.4, sweepSeconds: 1.4 });
// Keep rubbish on the guests' paved lane, never in the growing beds.
export const LITTER_SPOTS = Object.freeze([[31.8,10.8],[31.7,12],[31.5,14.8],[31.6,15.6],[30.5,18.5],[30.5,20.5],[30.8,22.1],[32.2,24.1],[32.9,26.4],[33,29],[33,31.8],[35.2,10.5]].map(([x,z])=>Object.freeze({x,z})));
export const freshCleanliness = () => ({ litter: [], nextId: 0, seenSales: 0, janitor: false, cleaned: 0, janitorPosition: {x:31.4,z:10.8}, sweep: 0 });
const finite = n => Number.isFinite(n), count = n => Number.isSafeInteger(n)&&n>=0?n:0;
export function restoreCleanliness(raw,s) {
  const c=freshCleanliness();c.seenSales=count(s?.sold);
  if (!raw || typeof raw!=="object") return c;
  c.janitor=raw.janitor===true;c.cleaned=count(raw.cleaned);c.nextId=count(raw.nextId);
  const ids=new Set();
  for(const p of Array.isArray(raw.litter)?raw.litter:[]) {
    if(c.litter.length>=CLEANLINESS.maximum)break;
    if(typeof p?.id!=="string"||!/^litter-\d+$/.test(p.id)||ids.has(p.id)||!finite(p.x)||!finite(p.z)||p.x<28||p.x>36||p.z<10||p.z>34)continue;
    ids.add(p.id);c.litter.push({id:p.id,x:p.x,z:p.z,kind:count(p.kind)%3});c.nextId=Math.max(c.nextId,Number(p.id.slice(7))+1);
  }
  if(finite(raw.janitorPosition?.x)&&finite(raw.janitorPosition?.z))c.janitorPosition={x:Math.max(28,Math.min(36,raw.janitorPosition.x)),z:Math.max(10,Math.min(34,raw.janitorPosition.z))};
  c.sweep=finite(raw.sweep)?Math.max(0,Math.min(CLEANLINESS.sweepSeconds,raw.sweep)):0;return c;
}
export const cleanlinessFootfall = s => Math.max(CLEANLINESS.floor,1-Math.max(0,(s.cleanliness?.litter.length??0)-CLEANLINESS.grace)*.025);
export function cleanlinessStatus(s) {
  const c=s.cleanliness??freshCleanliness(),footfall=cleanlinessFootfall(s),penalty=Math.round((1-footfall)*100),level=patchLevel(s).level;
  return {count:c.litter.length,score:Math.round(footfall*100),footfall,penalty,label:c.litter.length===0?"Spotless":!penalty?"A little untidy":penalty<20?"Needs a sweep":"Litter is putting guests off",janitor:c.janitor,hireCost:CLEANLINESS.janitorCost,hireLevel:CLEANLINESS.janitorLevel,canHire:!s.paused&&!c.janitor&&level>=CLEANLINESS.janitorLevel&&s.coins>=CLEANLINESS.janitorCost,cleaned:c.cleaned};
}
export function hireJanitor(s) {
  if(!cleanlinessStatus(s).canHire)return false;
  s.cleanliness??=freshCleanliness();s.coins-=CLEANLINESS.janitorCost;s.cleanliness.janitor=true;return true;
}
export const litterAt = (s,id) => s.cleanliness?.litter.find(p=>p.id===id)??null;
export function cleanLitter(s,id) {
  if(s.paused)return false;
  const c=s.cleanliness,i=c?.litter.findIndex(p=>p.id===id)??-1;
  if(i<0)return false;c.litter.splice(i,1);c.cleaned++;return true;
}
// Paid visits create rubbish deterministically. Old saves never receive a backlog.
export function updateCleanliness(s,dt,events=[]) {
  if(s.paused||!finite(dt)||dt<=0)return;
  const c=s.cleanliness??=(freshCleanliness()),sold=count(s.sold),previous=Math.min(sold,c.seenSales);
  const drops=Math.min(CLEANLINESS.maximum,Math.floor(sold/CLEANLINESS.everySales)-Math.floor(previous/CLEANLINESS.everySales));c.seenSales=sold;
  for(let i=0;i<drops&&c.litter.length<CLEANLINESS.maximum;i++) {
    const id=c.nextId++,p=LITTER_SPOTS[(id*7)%LITTER_SPOTS.length],j=(id%3-1)*.17;
    c.litter.push({id:"litter-"+id,x:p.x+j,z:p.z-j,kind:id%3});
  }
  if(!c.janitor)return;
  let left=Math.min(60,dt);
  // A large simulation step still visits each spot before sweeping it.
  while(left>0.0001) {
    const target=c.litter[0]??{x:31.4,z:10.8},p=c.janitorPosition,d=Math.hypot(target.x-p.x,target.z-p.z);
    if(d>.05) {
      const t=Math.min(left,d/CLEANLINESS.speed),step=Math.min(1,t*CLEANLINESS.speed/d);p.x+=(target.x-p.x)*step;p.z+=(target.z-p.z)*step;left-=t;c.sweep=0;
      if(d/CLEANLINESS.speed>t)break;
    } else if(c.litter.length) {
      const t=Math.min(left,CLEANLINESS.sweepSeconds-c.sweep);c.sweep+=t;left-=t;
      if(c.sweep>=CLEANLINESS.sweepSeconds-.0001){const id=target.id;cleanLitter(s,id);c.sweep=0;events.push({type:"litter-cleaned",id,janitor:true});}
    } else break;
  }
}
