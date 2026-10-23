// Provisional contractor site: isolated from Claude's pending woodland layout.
// One continuous vehicle circuit and distinct pedestrian approaches.
import { COUNTER_FRONT, counterPlace, GATE_Z, extendFarmRoute } from "./farm-layout.js";
import { hollowLinkFrom } from "./hollow-house.js";

export const HAYRIDE_SITE = Object.freeze({
  version: 1, bounds: { x0: -51, x1: -8, z0: 1, z1: 40 },
  focus: { x: -28, z: 21, zoom: 1.3 }, station: { x: -17, z: 26.5, yaw: 0 },
  hit: { x: -15.5, y: 1.5, z: 30, w: 7, h: 3, d: 10 },
  marker: { x: -4.8, z: 17 }, gate: { x: -7.6, z: 17 },
  rearEntry: { x: -17, z: 33.5 }, unload: { x: -19, z: 35.6 },
  queueEntry: { x: -11.1, z: 25.2 }, speed: 3, laneWidth: 4.4,
});
const points = [[-17,26.5],[-17,17],[-19,8],[-26,5],[-39,6],[-46,11],[-47,22],[-44,30],[-37,34],[-28,35],[-21,35],[-17,34],[-17,31]];
export const HAYRIDE_ROUTE = Object.freeze(points.map(p => Object.freeze(p)));
const curve = (a,b,c,d,t) => .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
// Dense deterministic arc samples keep speed independent of curve parameter.
const derivative=(a,b,c,d,t)=>.5*((-a+c)+2*(2*a-5*b+4*c-d)*t+3*(-a+3*b-3*c+d)*t*t);
const samples = []; let length = 0;
for (let i=0;i<points.length;i++) for(let j=0;j<24;j++) {
  const a=points[(i+points.length-1)%points.length],b=points[i],c=points[(i+1)%points.length],d=points[(i+2)%points.length],t=j/24;
  const p={x:curve(a[0],b[0],c[0],d[0],t),z:curve(a[1],b[1],c[1],d[1],t),tx:derivative(a[0],b[0],c[0],d[0],t),tz:derivative(a[1],b[1],c[1],d[1],t)};
  if(samples.length)length+=Math.hypot(p.x-samples.at(-1).x,p.z-samples.at(-1).z);
  samples.push({...p,distance:length});
}
length+=Math.hypot(samples[0].x-samples.at(-1).x,samples[0].z-samples.at(-1).z);
samples.push({...samples[0],distance:length});
export const HAYRIDE_ROUTE_LENGTH = length;
export const HAYRIDE_STOPS = Object.freeze([
  {id:"scarecrows",name:"Scarecrow patch",at:.18}, {id:"spiders",name:"Spider tunnel",at:.36},
  {id:"bride",name:"The bride’s manor",at:.54}, {id:"pursuit",name:"Spectral pursuit",at:.71},
  {id:"bus",name:"Zombie prison bus",at:.87},
]);
export function hayrideRouteSample(distance=0) {
  const d=((Number.isFinite(distance)?distance:0)%length+length)%length;
  let i=1;while(i<samples.length-1&&samples[i].distance<d)i++;
  const a=samples[i-1],b=samples[i],span=b.distance-a.distance,t=span?(d-a.distance)/span:0,dx=a.tx+(b.tx-a.tx)*t,dz=a.tz+(b.tz-a.tz)*t,n=Math.hypot(dx,dz)||1;
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,dx:dx/n,dz:dz/n,yaw:Math.atan2(-dx,-dz)};
}
export function hayridePathLength(route) { return route.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-route[i][0],p[1]-route[i][1]),0); }
export function hayrideAlong(route,fraction) {
  let distance=Math.max(0,Math.min(1,Number.isFinite(fraction)?fraction:0))*hayridePathLength(route);
  for(let i=1;i<route.length;i++) { const a=route[i-1],b=route[i],n=Math.hypot(b[0]-a[0],b[1]-a[1]);if(distance<=n){const t=n?distance/n:0;return{x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,dx:b[0]-a[0],dz:b[1]-a[1]};}distance-=n; }
  const p=route.at(-1);return{x:p[0],z:p[1],dx:0,dz:1};
}
const gateWalk=[[-3,17],[-9.1,17],[-9.1,25.2],[-11.1,25.2]];
export const HAYRIDE_FRONT_APPROACH = [[-3,GATE_Z],...gateWalk];
// A shopper starts at their own till position, then joins the lantern walk.
export function hayrideApproach(place=COUNTER_FRONT) {
  const link=hollowLinkFrom(place);return [...link.slice(0,-1),[-3,10.5],...gateWalk];
}
export const HAYRIDE_UNLOAD_PATH = [[-17,33.5],[-19,35.6],[-19,38],[-9.1,38],[-9.1,17],[-3,17]];
export const HAYRIDE_HOME_RETURN = [...HAYRIDE_UNLOAD_PATH,[-3,GATE_Z]];
export function hayrideReturn(place=COUNTER_FRONT) { return [...HAYRIDE_UNLOAD_PATH,[-3,10.5],...hayrideApproach(place).slice(0,-gateWalk.length-1).reverse()]; }
// Only the farm gate moves with new plots; woodland platforms stay where built.
const farmRoute=(route,s)=>route.map(p=>p[0]===-3&&p[1]===GATE_Z?extendFarmRoute([p],s)[0]:[...p]);
const returnRoute=(s,v)=>farmRoute(v.hayride.fromStall||v.hayride.fleeing?HAYRIDE_HOME_RETURN:hayrideReturn(counterPlace(v.spot)),s);
const compactRoute=route=>route.filter((p,i)=>!i||p[0]!==route[i-1][0]||p[1]!==route[i-1][1]);
// Interrupted approaches retrace their own lane to the junction, rather than
// jumping to the wagon. Queued guests leave through the queue's eastern gate.
export function hayrideReturnPlan(s,v,position=rawGuestPose(s,v)) {
  const m=v.hayride,origin=[position.x,position.z],out=returnRoute(s,v),junction=out.findIndex(p=>p[0]===-3&&p[1]===17);
  let route;
  if(m.phase==="approach") {
    const approach=farmRoute(m.fromStall?hayrideApproach(counterPlace(v.spot)):HAYRIDE_FRONT_APPROACH,s),join=approach.findIndex(p=>p[0]===-3&&p[1]===17);
    let distance=Math.max(0,Math.min(1,m.elapsed/m.approachSeconds))*hayridePathLength(approach),segment=1;
    for(;segment<approach.length;segment++){const a=approach[segment-1],b=approach[segment],span=Math.hypot(b[0]-a[0],b[1]-a[1]);if(distance<=span)break;distance-=span;}
    route=[origin,...(segment<=join?approach.slice(segment,join+1):approach.slice(join,segment).reverse()),...out.slice(junction+1)];
  } else if(m.phase==="queue") route=[origin,[-12,origin[1]],[-12,25.2],[-9.1,25.2],[-9.1,17],...out.slice(junction)];
  else if(m.phase==="unloading") route=[origin,...out.slice(2)];
  else route=[origin,...out];
  const returnPath=compactRoute(route);return{returnPath,returnSeconds:Math.max(.1,hayridePathLength(returnPath)/HAYRIDE_SITE.speed)};
}
export function hayrideJourneyTiming(v,when="arrival",s=null) {
  const after=when==="after"||when==="after-stall"||v?.hayride?.fromStall,place=counterPlace(v?.spot);
  return {approachSeconds:hayridePathLength(farmRoute(after?hayrideApproach(place):HAYRIDE_FRONT_APPROACH,s))/HAYRIDE_SITE.speed,returnSeconds:hayridePathLength(farmRoute((after?HAYRIDE_HOME_RETURN:hayrideReturn(place)).slice(1),s))/HAYRIDE_SITE.speed};
}
export function hayrideQueueSlot(index=0) {
  const i=Math.max(0,Math.min(15,Math.floor(index))),row=Math.floor(i/2),side=i%4<2?i%2:1-i%2;
  return{x:side?-11.1:-13,z:32.6-row*1.04,dx:0,dz:1};
}
// Gate opening and route dressing consume this same bounded clearance strip.
export const HAYRIDE_GATE_CLEAR = Object.freeze({x0:-10.6,x1:-6.4,z0:14.5,z1:19.5});
export function hayrideRouteDistance(x,z) {
  let best=Infinity;
  for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i],dx=b.x-a.x,dz=b.z-a.z,n=dx*dx+dz*dz,t=n?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/n)):0;best=Math.min(best,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));}
  return best;
}

// Convoy transforms use independent arc positions and a physically joined hitch.
export function hayrideConvoyPose(s,preview=null) {
  const c=s?.hayride?.convoy??{},phase=c.phase??"loading",elapsed=c.elapsed??0;
  const progress=preview!==null?Math.max(0,Math.min(1,preview)):phase==="departing"?Math.min(.03,elapsed/3*.03):phase==="circuit"?.03+.94*Math.max(0,Math.min(1,c.progress??0)):phase==="arriving"?.97+.03*Math.min(1,elapsed/3):0;
  const distance=progress*length,tractor=hayrideRouteSample(distance),trail=hayrideRouteSample(distance-3.8);
  const hitch={x:tractor.x+Math.sin(tractor.yaw)*.88,z:tractor.z+Math.cos(tractor.yaw)*.88};
  const wagon={x:hitch.x+Math.sin(trail.yaw)*2.92,z:hitch.z+Math.cos(trail.yaw)*2.92,yaw:trail.yaw};
  return{tractor:{...tractor,y:0},wagon:{...wagon,y:0},distance,progress};
}
const seatAnchor=(capacity,index)=>{const zs=capacity>=8?[-1.17,-.39,.39,1.17]:capacity>=6?[-1.08,0,1.08]:[-.75,.75],i=Math.max(0,Math.min(capacity-1,index??0));return{x:i%2?.87:-.87,y:1.2,z:zs[Math.floor(i/2)],yaw:i%2?Math.PI/2:-Math.PI/2};};
const transform=(p,root)=>({x:root.x+p.x*Math.cos(root.yaw)+p.z*Math.sin(root.yaw),y:p.y??0,z:root.z-p.x*Math.sin(root.yaw)+p.z*Math.cos(root.yaw),dx:-Math.sin(root.yaw+(p.yaw??0)),dz:-Math.cos(root.yaw+(p.yaw??0))});
function rawGuestPose(s,v) {
  const m=v?.hayride;if(!m||m.done)return null;
  const after=!!m.fromStall,place=counterPlace(v.spot),f=m.elapsed??0;
  if(m.phase==="approach")return{...hayrideAlong(farmRoute(after?hayrideApproach(place):HAYRIDE_FRONT_APPROACH,s),f/(m.approachSeconds||12)),moving:true,walking:true,visible:true};
  if(m.phase==="return")return{...hayrideAlong(m.returnPath??returnRoute(s,v),f/(m.returnSeconds||10)),moving:true,walking:true,visible:true};
  const waiting=(s.visitors??[]).filter(q=>q.hayride&&!q.hayride.done&&["queue","boarding"].includes(q.hayride.phase)).sort((a,b)=>(a.hayride.order??0)-(b.hayride.order??0)||a.id-b.id),slot=hayrideQueueSlot(Math.max(0,waiting.findIndex(q=>q.id===v.id)));
  if(m.phase==="queue")return{...slot,moving:false,walking:false,visible:true};
  if(m.phase==="boarding")return{...hayrideAlong([[slot.x,slot.z],[-14.6,33.5],[-17,33.5]],Math.min(1,f/1.5)),moving:true,walking:true,visible:true};
  const capacity=[4,6,8][Math.max(0,Math.min(2,(s.hayride?.tier??1)-1))],pose=hayrideConvoyPose(s),anchor=seatAnchor(capacity,m.seat),seat=transform(anchor,pose.wagon);
  if(m.phase==="riding")return{...seat,seated:true,moving:false,walking:false,visible:true};
  if(m.phase==="unloading")return{...hayrideAlong([[seat.x,seat.z],[-17,33.5],[-19,35.6]],f/6),moving:true,walking:true,visible:true};
  return{...slot,moving:false,walking:false,visible:true};
}

// Feet follow the deliberate boardwalk/platform heights instead of sinking.
export function hayrideGuestPose(s,v) {
  const p=rawGuestPose(s,v);if(!p)return null;
  if(!p.seated)p.y=p.x>=-9.25&&p.x<=-2.8&&p.z>=15.95&&p.z<=18.05?.24:p.x>=-19&&p.x<=-13.7&&p.z>=31.9&&p.z<=35.55?.2:p.x>=-13.7&&p.x<=-10.05&&p.z>=25&&p.z<=33.8?.12:.08;
  return p;
}
