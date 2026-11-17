// Shared authored paths: the picture, collider and cave floor use this data.
import { PLAN_SCALE as K, DISTRICT_BY_ID, ROADS } from './content/village.js';
import { spreadWorld } from './rules/village-spread.js';
export const CAVE_IDS=Object.freeze(['cave-shallows','cave-workings','cave-cathedral']);
export const isCaveArea=id=>CAVE_IDS.includes(id);
export const CAVE_ROOMS=Object.freeze([{x0:-4,z0:-4,x1:4,z1:15},{x0:-14,z0:3,x1:14,z1:17},{x0:-15,z0:13,x1:15,z1:27},{x0:-5,z0:25,x1:5,z1:42},{x0:-15,z0:27,x1:15,z1:39},{x0:-17,z0:39,x1:17,z1:55}].map(Object.freeze));
export const CAVE_CAMERA_PRESET=Object.freeze({yaw:Math.PI,pitch:34*Math.PI/180,distance:7.2,minDistance:4.8,maxDistance:10,maxPitch:55*Math.PI/180});
export const CAVE_VEINS=Object.freeze([[-11,17],[-7,22],[9,17],[12,23],[-3,30],[3,36],[-13,44],[-8,50],[0,46],[7,43],[12,50],[2,52]].map(([x,z],i)=>Object.freeze({index:i,x:x*K,z:-z*K})));
// The cave's mouth in the Copse as drawn, and where it now stands (the village is spread apart:
// rules/village-spread.js). The Acre's paths and predicates below stay on the drawn grid: the walking rules
// gather a point on the ground back to it first, and its picture is drawn there and moved whole.
const MOUTH=Object.freeze({x:-30*K,z:106*K});
export const CAVE_ENTRY=Object.freeze((([x,z])=>({x,z}))(spreadWorld(MOUTH.x,MOUTH.z)));
export const CAVE_SPAWN=Object.freeze({x:0,z:0});
const inside=(b,x,z,r=0)=>x>=b.x0+r&&x<=b.x1-r&&z>=b.z0+r&&z<=b.z1-r;
export function caveGroundAt(id,x,z){const floor=Math.max(0,CAVE_IDS.indexOf(id))*12;return(-floor-Math.min(1,Math.max(0,-z/(12*K)))*6)*K;}
export function caveCeilingAt(id,x,z){return caveGroundAt(id,x,z)+(6.1+Math.max(0,1-Math.abs(x/K)/18)*1.2)*K;}
export function caveCellFree(x,z,r=.32){return CAVE_ROOMS.some(b=>inside(b,x/K,-z/K,r/K));}
// A walking camera belongs inside the cave too. Pull it towards the subject
// before it crosses rock or the solid vault, rather than drawing the back of
// an unlit wall over the depth-independent character sprite.
export function constrainCaveCamera(id,target,desired){
 const valid=p=>caveCellFree(p.x,-p.z,.16)&&p.y>caveGroundAt(id,p.x,-p.z)+.35&&p.y<caveCeilingAt(id,p.x,-p.z)-.65;
 const start={x:target.x,y:target.y,z:target.z},distance=Math.hypot(desired.x-start.x,desired.y-start.y,desired.z-start.z),steps=Math.max(1,Math.ceil(distance/.12));
 let result=start;
 for(let i=1;i<=steps;i++){const t=i/steps,p={x:start.x+(desired.x-start.x)*t,y:start.y+(desired.y-start.y)*t,z:start.z+(desired.z-start.z)*t};if(!valid(p))break;result=p;}
 // A short spring arm must not turn the owner into a full-screen sprite.
 // Lift within the same safe column to retain a useful viewing distance.
 const horizontal=Math.hypot(result.x-start.x,result.z-start.z),minimum=Math.min(6.8,distance);
 if(Math.hypot(horizontal,result.y-start.y)<minimum){
  const raised={...result,y:Math.min(caveCeilingAt(id,result.x,-result.z)-.7,start.y+Math.sqrt(Math.max(0,minimum*minimum-horizontal*horizontal)))};
  const count=Math.max(1,Math.ceil(Math.hypot(horizontal,raised.y-start.y)/.12));
  let clear=true;for(let i=1;i<=count;i++){const t=i/count;if(!valid({x:start.x+(raised.x-start.x)*t,y:start.y+(raised.y-start.y)*t,z:start.z+(raised.z-start.z)*t})){clear=false;break;}}
  if(clear)result=raised;
 }
 return result;
}
export function stepExpansionWalker(from,dx,dz,free){if(!from||![from.x,from.z,dx,dz].every(Number.isFinite))return from;let{x,z}=from;const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.16));for(let i=0;i<n;i++){const a=x+dx/n,b=z+dz/n;if(free(a,b)){x=a;z=b;}else if(free(a,z))x=a;else if(free(x,b))z=b;}return{x,z};}
const cols=13,rows=15,edges=[],seen=new Set(['0,0']);let seed=81731;const random=()=>{seed=Math.imul(seed,1664525)+1013904223|0;return(seed>>>0)/4294967296;};
const key=(x,z)=>x+','+z, stack=[[0,0]];
while(stack.length){const [x,z]=stack.at(-1),next=[[x+1,z],[x-1,z],[x,z+1],[x,z-1]].filter(([a,b])=>a>=0&&a<cols&&b>=0&&b<rows&&!seen.has(key(a,b)));if(!next.length){stack.pop();continue;}const p=next[Math.floor(random()*next.length)];seen.add(key(...p));edges.push([[x,z],p]);stack.push(p);}
for(let x=5;x<=7;x++)for(let z=6;z<=8;z++){if(x<7)edges.push([[x,z],[x+1,z]]);if(z<8)edges.push([[x,z],[x,z+1]]);}
const point=([x,z])=>({x:(-92+x*4)*K,z:(54+z*4)*K});
export const ACRE_PATHS=Object.freeze(edges.map(([a,b])=>Object.freeze([point(a),point(b)])));
// Points to walk to, where they now stand; the shapes below stay as drawn.
const placed=(x,z)=>(([a,b])=>Object.freeze({x:a,z:b}))(spreadWorld(x*K,z*K));
export const ACRE_ENTRY=placed(-40,82);
export const GRANNY_DOOR=placed(-68,79.5);
export const ACRE_SHORTCUT=Object.freeze([[-44,82],[-59,82],[-61,79],[-68,79]].map(([x,z])=>Object.freeze({x:x*K,z:z*K})));
export const ACRE_APPROACH=Object.freeze([[0,92],[0,98],[-36,98],[-36,82],[-40,82],[-44,82]].map(([x,z])=>Object.freeze({x:x*K,z:z*K})));
const dist=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);};
export function onExpansionApproach(x,z,r=.32){const p={x,z};return ACRE_APPROACH.slice(1).some((b,i)=>dist(p,ACRE_APPROACH[i],b)<2.3*K-r)||dist(p,{x:-30*K,z:98*K},MOUTH)<2.3*K-r;}
export function onAcreShortcut(x,z,r=0){return ACRE_SHORTCUT.slice(1).some((b,i)=>dist({x,z},ACRE_SHORTCUT[i],b)<=1.5*K-r);}
export function acreCellFree(x,z,r=.32,shortcut=false){const p={x,z};if(x>-72.5*K-r&&x<-63.5*K+r&&z>81.5*K-r&&z<89*K+r)return false;return ACRE_PATHS.some(([a,b])=>dist(p,a,b)<=1.5*K-r)||shortcut&&onAcreShortcut(x,z,r)||onExpansionApproach(x,z,r)||inside({x0:-75*K,z0:75*K,x1:-61*K,z1:91*K},x,z,r)&&!(x>-72.5*K-r&&x<-63.5*K+r&&z>81.5*K-r&&z<89*K+r);}
export function expansionRoadFree(x,z,r=.32){const p={x,z};return ROADS.some(road=>road.points.slice(1).some(([bx,bz],i)=>{const[ax,az]=road.points[i];return dist(p,{x:ax,z:az},{x:bx,z:bz})<road.width/2-r;}));}
export const polygonBounds=id=>{const p=DISTRICT_BY_ID[id]?.polygon;return p?{x0:Math.min(...p.map(q=>q[0])),x1:Math.max(...p.map(q=>q[0])),z0:Math.min(...p.map(q=>q[1])),z1:Math.max(...p.map(q=>q[1]))}:null;};
