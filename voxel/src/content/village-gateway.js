// Mothlight uses the existing public road past Maisie's truck, never a separate portal.
import { ROUTE_OUT } from './farm-layout.js';
import { MEADOW_EXIT, fieldWidth } from './festival-meadow.js';
import { COOKING_SITE } from './cooking-layout.js';
const frozenRoute=route=>Object.freeze(route.map(p=>Object.freeze([...p])));
function plan(kitchen,meadow){
 const expanded=kitchen||meadow,lane=frozenRoute(expanded?MEADOW_EXIT:ROUTE_OUT),[x,z]=lane.at(-1),[px,pz]=lane.at(-2),length=Math.hypot(x-px,z-pz),owned=Math.max(fieldWidth({festival:{meadow}}),kitchen?COOKING_SITE.pavingBounds.x1:0);
 return Object.freeze({x,z,expanded,halfWidth:.95,lane,
  approach:Object.freeze({x:x-(x-px)/length*1.25,z:z-(z-pz)/length*1.25}),zone:Object.freeze({x0:x-.35,x1:x+.3,z0:z-.65,z1:z+.65}),
  extension:Object.freeze({x0:owned,x1:x+.8,z0:z-1.1,z1:expanded?z+1.1:8.8}),
  corridor:Object.freeze({points:frozenRoute([...lane.slice(2),[x+.55,z]]),halfWidth:.95}),
  clearance:Object.freeze({x0:x-1.25,x1:x+.8,z0:z-1.1,z1:z+2.35}),
 });
}
const PLANS=[plan(false,false),plan(true,false),plan(false,true),plan(true,true)];
export const villageGateway=state=>PLANS[(state?.kitchen?.purchased?1:0)+(state?.festival?.meadow?2:0)];
// Compatibility alias for diagnostics that intentionally use the original farm.
export const VILLAGE_GATEWAY=PLANS[0];
export function atVillageGateway(p,state){const g=villageGateway(state).zone;return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=g.x0&&p.x<=g.x1&&p.z>=g.z0&&p.z<=g.z1;}
export function villageRoadDistance(x,z,points=MEADOW_EXIT){
 let best=Infinity;for(let i=1;i<points.length;i++){const [ax,az]=points[i-1],[bx,bz]=points[i],dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));best=Math.min(best,Math.hypot(x-ax-dx*t,z-az-dz*t));}return best;
}
export const villageGatewayPathDistance=(x,z,state)=>villageRoadDistance(x,z,villageGateway(state).lane);
export const onVillageGatewayPath=(x,z)=>villageRoadDistance(x,z)<.95;
export const onVillageExitCorridor=(x,z,corridor,radius=.25)=>!!corridor&&villageRoadDistance(x,z,corridor.points)<=Math.max(0,corridor.halfWidth-radius);
