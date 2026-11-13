// The first playable district: measured building bodies, water and furniture,
// rather than the larger garden/decoration reserves round the houses.
import { PLAN_SCALE as K, DISTRICT_BY_ID, ARRIVAL, FIXTURES, SCENERY, ROADS, PLOTS } from "../content/village.js";
import { VILLAGE_DECOR_BY_ID } from "../content/village-decor.js";
import { villageDecorBounds, villageDecorContains } from "./village-decor-geometry.js";
import { groundIsWater as isWater } from "../village-terrain.js";

import { expansionAreaInfo } from './village-expansion-access.js';
import { EXPANSION_AREAS } from '../content/village-expansion.js';
import { acreCellFree, onExpansionApproach } from '../village-expansion-spatial.js';
import { spreadRect, gatherWorld } from './village-spread.js';
import { townSquareObstacles, townSquareBlockers } from '../content/village-town-square.js';
import { villageNeighbourhoodObstacles } from '../content/village-neighbourhoods.js';

export const VILLAGE_WALK_RADIUS = .32;
// Measured on the design grid as drawn, and kept where it now stands: the village was spread apart after it was
// laid out (village-spread.js), so a drawn rectangle moves with its piece, or stretches if it is long (a fence).
const scaled = (r) => ({x0:r.x0*K,z0:r.z0*K,x1:r.x1*K,z1:r.z1*K});
const rect = (x0,z0,x1,z1) => scaled(spreadRect({x0,z0,x1,z1}));
const body = (f, w=f.w, d=f.d) => ({x0:f.x-w/2,z0:f.z-d/2,x1:f.x+w/2,z1:f.z+d/2});
// A model's local +z faces out. Keep its rotated footprint in realm (north +z)
// coordinates; the view alone changes north to Three's negative z.
function footprint(x,z,facing,x0,z0,x1,z1) {
  const [c,s] = {south:[1,0],east:[0,1],north:[-1,0],west:[0,-1]}[facing];
  const corners=[[x0,z0],[x0,z1],[x1,z0],[x1,z1]].map(([a,b])=>[x+a*c+b*s,z+a*s-b*c]);
  return {x0:Math.min(...corners.map(p=>p[0])),z0:Math.min(...corners.map(p=>p[1])),x1:Math.max(...corners.map(p=>p[0])),z1:Math.max(...corners.map(p=>p[1]))};
}
const modelRect = (...a) => { const f = footprint(...a); return rect(f.x0,f.z0,f.x1,f.z1); };
// A home on a plot the content already keeps where it stands.
const homeRect = (p) => scaled(footprint(p.door[0]/K,p.door[1]/K,p.facing,-4.2,-8,4.2,.15));
const homes = () => PLOTS.filter(p=>p.district!=='green'&&p.kind==='resident').map(homeRect);
// The Crooked Acre's farmhouse.
const GRANNY = rect(-72.5,81.5,-63.5,89);
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
  [0,.29,53.3,.91],[62.7,.29,120,.91],[.29,-22,.91,30],[119.09,-22,119.71,30],
  [0,-22.21,53.3,-21.89],[62.7,-22.21,120,-21.89],
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
// The Green as drawn (its corners gathered back from where they stand): a point is on it if it reads as a point
// of the drawn Green, which takes in the ground let in between the pieces.
const green=DISTRICT_BY_ID.green.polygon.map(([x,z])=>gatherWorld(x,z)),limits={x0:Math.min(...green.map(p=>p[0])),x1:Math.max(...green.map(p=>p[0])),z0:Math.min(...green.map(p=>p[1])),z1:Math.max(...green.map(p=>p[1]))};
export function villageWalkObstacles(s) {
  const boxes=[...scenery,...buildings,...walls,...tavern,
    ...homes(), GRANNY, ...townSquareObstacles(), ...villageNeighbourhoodObstacles(s)
  ];
  boxes.push(body(FIXTURES.stall),body(FIXTURES.noticeboard),body(FIXTURES.bench),body(FIXTURES.pond),{x:FIXTURES.tree.x,z:FIXTURES.tree.z,r:3.4*K},{x:FIXTURES.well.x,z:FIXTURES.well.z,r:FIXTURES.well.r});
  for(const[flag,x,z]of[['restaurant-opening',64,74],['lantern-night',52,34]])if(s?.village?.expansion?.effects?.includes(flag)){
    boxes.push(rect(x-1.7,z-.85,x+1.7,z+.85));for(const[dx,dz]of[[-1,-1.7],[1,1.7]])boxes.push(rect(x+dx-.42,z+dz-.4,x+dx+.42,z+dz+.4));
  }
  if(s?.village?.expansion?.effects?.includes('moor-restored'))boxes.push(rect(156,46,162,50));
  for(const p of s?.village?.decor?.placed??[]){const bounds=villageDecorBounds(p.id,p.x,p.z,p.rotation??0);if(bounds)boxes.push({...bounds,decor:p});}
  return boxes;
}
// What the play camera can't see through: building bodies only. Railings, hedges, stalls and furniture are
// low enough to look over, and the great tree clears itself (village-visibility.js).
export function villageCameraBlockers() {
  return [...buildings, ...homes(), GRANNY, ...townSquareBlockers()];
}
// How far along the arm from the owner to the camera stays clear of those bodies, as a fraction of the arm (1 is
// all of it). Both points are realm points ({x, z}); pad keeps the lens off the wall. A blocker the owner already
// stands against is measured from its real wall, so the arm never collapses onto them.
export function villageCameraReach(from, to, blockers = villageCameraBlockers(), pad = .55) {
  const dx = to.x - from.x, dz = to.z - from.z; let reach = 1;
  for (const b of blockers) {
    let grow = pad;
    if (from.x > b.x0 - grow && from.x < b.x1 + grow && from.z > b.z0 - grow && from.z < b.z1 + grow) grow = 0;
    const x0 = b.x0 - grow, x1 = b.x1 + grow, z0 = b.z0 - grow, z1 = b.z1 + grow;
    if (from.x > x0 && from.x < x1 && from.z > z0 && from.z < z1) continue;
    let enter = 0, exit = 1, hit = true;
    for (const [o, d, lo, hi] of [[from.x, dx, x0, x1], [from.z, dz, z0, z1]]) {
      if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { hit = false; break; } continue; }
      const a = (lo - o) / d, c = (hi - o) / d; enter = Math.max(enter, Math.min(a, c)); exit = Math.min(exit, Math.max(a, c));
      if (enter > exit) { hit = false; break; }
    }
    if (hit && enter < reach) reach = enter;
  }
  return Math.max(0, reach);
}
// Placement shares the actual building, fence and water exclusions with walking.
// A conservative enclosing box keeps every rotated corner off fixed scenery.
export function villageDecorGroundClear(id,x,z,rotation=0,state=null) {
  const bounds=villageDecorBounds(id,x,z,rotation),def=VILLAGE_DECOR_BY_ID[id];if(!bounds||!def)return false;
  const {x0,z0,x1,z1}=bounds;
  if(villageWalkObstacles(state).some(b=>!b.decor&&(b.r!==undefined?Math.hypot(Math.max(x0,Math.min(x1,b.x))-b.x,Math.max(z0,Math.min(z1,b.z))-b.z)<b.r:x0<b.x1&&x1>b.x0&&z0<b.z1&&z1>b.z0)))return false;
  const a=rotation*Math.PI/180,c=Math.cos(a),sn=Math.sin(a),nx=Math.max(1,Math.ceil(def.w/.4)),nz=Math.max(1,Math.ceil(def.d/.4));
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){const u=(i/nx-.5)*def.w,w=(j/nz-.5)*def.d;if(isWater((x+u*c+w*sn)/K,(z-u*sn+w*c)/K))return false;}
  return true;
}
// The owner stays put during arranging; furniture may never be committed over them.
export function villageDecorWalkClear(s,piece,actor) {
  if(!piece)return false;
  const radius=Number.isFinite(actor?.radius)?Math.max(0,actor.radius):VILLAGE_WALK_RADIUS+.08;
  return !actor||!villageDecorContains(piece.id,piece.x,piece.z,piece.rotation??0,actor.x,actor.z,radius);
}
export function villageCellFree(s,x,z,r=VILLAGE_WALK_RADIUS,boxes=villageWalkObstacles(s)) {
  if(![x,z,r].every(Number.isFinite)||r<0)return false;
  // Only the Green is playable; later district scenery never grants passage.
  // The narrow southern exception reaches the carriage through the moth gate.
  const [gx,gz]=gatherWorld(x,z);
  const onGreen=gx>=limits.x0+r&&gx<=limits.x1-r&&gz>=limits.z0+r&&gz<=limits.z1-r;
  const atCarriage=Math.abs(x-ARRIVAL.spawn[0])<=3*K-r&&z>=ARRIVAL.back[1]-r&&z<=limits.z0+r;
  const hasArea=id=>!!s?.village&&!!expansionAreaInfo(s,id)?.open;
  const onLater=EXPANSION_AREAS.some(a=>!['green','acre'].includes(a.id)&&a.layer!=='cave'&&hasArea(a.id)&&x>=a.bounds[0]+r&&x<=a.bounds[2]-r&&z>=a.bounds[1]+r&&z<=a.bounds[3]-r);
  // The Acre's paths are kept as drawn: ask them of the gathered point.
  const onAcre=hasArea('acre')&&acreCellFree(gx,gz,r,!!s?.village?.expansion?.effects?.includes('acre-shortcut')),approach=hasArea('copse')&&onExpansionApproach(gx,gz,r);
  const onRoad=ROADS.some(road=>{const id=road.id.startsWith('door-')?PLOTS.find(p=>p.id===road.plot)?.district:road.id;if(!['copse','quarry','moor','marsh'].includes(id)||!hasArea(id))return false;return road.points.slice(1).some(([bx,bz],i)=>{const[ax,az]=road.points[i],dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-ax-dx*t,z-az-dz*t)<=road.width/2-r;});});
  if(!onGreen&&!atCarriage&&!onLater&&!onAcre&&!approach&&!onRoad)return false;
  // The field is a maze: its unused land never becomes a shortcut through corn.
  if(gx<-34*K&&gz>46*K&&gz<114*K&&!onAcre&&!approach)return false;
  if(isWater(x/K,z/K))return false;
  return !boxes.some(b=>b.decor?villageDecorContains(b.decor.id,b.decor.x,b.decor.z,b.decor.rotation??0,x,z,r):b.r!==undefined?Math.hypot(x-b.x,z-b.z)<b.r+r:x>b.x0-r&&x<b.x1+r&&z>b.z0-r&&z<b.z1+r);
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
