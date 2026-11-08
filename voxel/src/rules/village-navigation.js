// The first playable district: measured building bodies, water and furniture,
// rather than the larger garden/decoration reserves round the houses.
import { PLAN_SCALE as K, DISTRICT_BY_ID, ARRIVAL, FIXTURES, SCENERY } from "../content/village.js";
import { VILLAGE_DECOR_BY_ID } from "../content/village-decor.js";
import { isWater } from "../village-terrain.js";

export const VILLAGE_WALK_RADIUS = .32;
const rect = (x0,z0,x1,z1) => ({x0:x0*K,z0:z0*K,x1:x1*K,z1:z1*K});
const body = (f, w=f.w, d=f.d) => ({x0:f.x-w/2,z0:f.z-d/2,x1:f.x+w/2,z1:f.z+d/2});
// A model's local +z faces out. Keep its rotated footprint in realm (north +z)
// coordinates; the view alone changes north to Three's negative z.
function modelRect(x,z,facing,x0,z0,x1,z1) {
  const [c,s] = {south:[1,0],east:[0,1],north:[-1,0],west:[0,-1]}[facing];
  const corners=[[x0,z0],[x0,z1],[x1,z0],[x1,z1]].map(([a,b])=>[x+a*c+b*s,z+a*s-b*c]);
  return rect(Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1])),Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[1])));
}
const scenery=SCENERY.filter(p=>p.id!=="velvet-bat");
const buildings=[
  modelRect(47.4,20,"east",-3.91,-7.41,3.91,.41), // Library cottage, including its stone footing.
  modelRect(47.4,20,"east",2.8,-6.9,9.6,-.1), // The adjoining glasshouse.
  modelRect(66.6,20,"west",-4.41,-7.41,4.41,.41),
  modelRect(66.6,20,"west",3.7,-5.6,6.1,-.4), // Rowan's timber and lean-to.
  modelRect(66.6,20,"west",-3.8,1.15,-1.4,2.4),
  modelRect(66.6,20,"west",1.35,1.5,2.25,1.9),
  modelRect(102,24.4,"north",-7.41,-12.41,7.41,.25), // Tavern body, not its open terrace.
  modelRect(102,24.4,"north",6.65,-3.95,10.15,-.45), // Belfry tower.
  modelRect(102,24.4,"north",-9.5,-8.9,-7.3,-6.2), // Gated crypt stair.
];
// Solid fences and the tavern's furniture leave each actual doorway and gate
// clear. Thin walls matter here: movement is stepped so a jog cannot skip one.
const walls=[
  [0,.29,53.3,.91],[62.7,.29,120,.91],[.29,0,.91,30],[119.09,0,119.71,30],
  [4,7.87,22,8.13],[4,25.87,22,26.13],[3.87,8,4.13,26],[21.87,8,22.13,15.6],[21.87,18.4,22.13,26],
  [28.5,10.87,46.5,11.13],[28.5,28.87,46.5,29.13],[28.37,11,28.63,29],
  [67,8.87,81.5,9.13],[67,26.87,81.5,27.13],[81.37,9,81.63,27],
].map(p=>rect(...p));
const tavern=[];
for(const side of [-1,1]) {
  const a=side<0?-7.3:1.3,b=side<0?-1.3:7.3;
  tavern.push(modelRect(102,24.4,"north",a,5.05,b,5.35));
  for(const z of [2.2,4]) tavern.push(modelRect(102,24.4,"north",side*4.6-1.1,z-.55,side*4.6+1.1,z+.55));
}
tavern.push(modelRect(102,24.4,"north",-3.55,3.82,-1.65,4.58));
const green=DISTRICT_BY_ID.green.polygon,limits={x0:Math.min(...green.map(p=>p[0])),x1:Math.max(...green.map(p=>p[0])),z0:Math.min(...green.map(p=>p[1])),z1:Math.max(...green.map(p=>p[1]))};
export function villageWalkObstacles(s) {
  const boxes=[...scenery,...buildings,...walls,...tavern];
  boxes.push(body(FIXTURES.stall),body(FIXTURES.noticeboard),body(FIXTURES.bench),body(FIXTURES.pond),{x:FIXTURES.tree.x,z:FIXTURES.tree.z,r:3.4*K},{x:FIXTURES.well.x,z:FIXTURES.well.z,r:FIXTURES.well.r});
  for(const p of s?.village?.decor?.placed??[]){const d=VILLAGE_DECOR_BY_ID[p.id];if(!d)continue;const a=(p.rotation??0)*Math.PI/180,w=Math.abs(Math.cos(a))*d.w+Math.abs(Math.sin(a))*d.d,h=Math.abs(Math.sin(a))*d.w+Math.abs(Math.cos(a))*d.d;boxes.push({x0:p.x-w/2,z0:p.z-h/2,x1:p.x+w/2,z1:p.z+h/2});}
  return boxes;
}
export function villageCellFree(s,x,z,r=VILLAGE_WALK_RADIUS,boxes=villageWalkObstacles(s)) {
  if(![x,z,r].every(Number.isFinite)||r<0)return false;
  // Only the Green is playable; later district scenery never grants passage.
  // The narrow southern exception reaches the carriage through the moth gate.
  const onGreen=x>=limits.x0+r&&x<=limits.x1-r&&z>=limits.z0+r&&z<=limits.z1-r;
  const atCarriage=Math.abs(x-ARRIVAL.spawn[0])<=3*K-r&&z>=ARRIVAL.back[1]-r&&z<=limits.z0+r;
  if(!onGreen&&!atCarriage)return false;
  if(isWater(x/K,z/K))return false;
  return !boxes.some(b=>b.r!==undefined?Math.hypot(x-b.x,z-b.z)<b.r+r:x>b.x0-r&&x<b.x1+r&&z>b.z0-r&&z<b.z1+r);
}
// Short axis-sliding steps prevent a jog or a slow device's frame crossing a
// wall. The closed district gates stay closed even when the scenery is visible.
function stepWalker(from,dx,dz,free,step) {
  if(!from||![from.x,from.z,dx,dz].every(Number.isFinite))return from;
  const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/step));
  let {x,z}=from;for(let i=0;i<n;i++){const nx=x+dx/n,nz=z+dz/n;if(free(nx,nz)){x=nx;z=nz;}else if(free(nx,z))x=nx;else if(free(x,nz))z=nz;}
  return {x,z};
}
export function moveVillageWalker(s,from,dx,dz) {
  const boxes=villageWalkObstacles(s);
  return stepWalker(from,dx,dz,(x,z)=>villageCellFree(s,x,z,VILLAGE_WALK_RADIUS,boxes),.18);
}
// Hall positions and deltas use the hall's design grid, before PLAN_SCALE.
export function villageHallFree(plan,x,z) {
  if(!plan?.hall||![x,z].every(Number.isFinite))return false;const h=plan.hall,r=VILLAGE_WALK_RADIUS/K;
  return x>=-h.w/2+r+.2&&x<=h.w/2-r-.2&&z>=-h.d+r+.2&&z<=.6&&(z<=-.25-r||Math.abs(x)<=1.05-r)&&!h.blocks.some(([x0,z0,x1,z1])=>x>x0-r&&x<x1+r&&z>z0-r&&z<z1+r);
}
export function moveVillageHallWalker(plan,from,dx,dz) {
  return stepWalker(from,dx,dz,(x,z)=>villageHallFree(plan,x,z),.18/K);
}
