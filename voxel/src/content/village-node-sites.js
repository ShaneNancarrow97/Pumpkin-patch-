// Fixed world seed plus saved per-node cycles: chats and shop rolls never move visible resources.
import { NODES, NODE_BY_ID, FORAGE_AREAS, ROADS } from './village.js';
import { villageCellFree } from '../rules/village-navigation.js';

const hash = text => { let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0; };
const jitter = (key,axis) => (hash(key+axis)%10001/10000-.5)*.28;
const distanceToRoad = (x,z,road) => road.points.some(([bx,bz],i)=>{if(!i)return false;const [ax,az]=road.points[i-1],dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-ax-dx*t,z-az-dz*t)<road.width/2+.6;});
const clear = (x,z) => villageCellFree(null,x,z,.65)&&!ROADS.some(r=>distanceToRoad(x,z,r));
const sites=new Map(),used=NODES.filter(n=>n.district==='green').map(n=>({x:n.x,z:n.z}));
const groups=new Map();
for(const n of NODES){
  sites.set(n.id,[Object.freeze({x:n.x,z:n.z})]);
  if(n.district!=='green')continue;
  const a=FORAGE_AREAS.find(a=>n.x>=a.x0&&n.x<=a.x1&&n.z>=a.z0&&n.z<=a.z1);
  const area=a??{id:'near-'+n.id,x0:n.x-5,z0:n.z-5,x1:n.x+5,z1:n.z+5};
  if(!groups.has(area.id))groups.set(area.id,{area,nodes:[]});groups.get(area.id).nodes.push(n);
}
// Candidate pools are disjoint, so independently respawning small props cannot pile up.
for(const {area,nodes} of groups.values()){
  const pool=[];
  for(let x=area.x0+1;x<area.x1-1;x+=2.2)for(let z=area.z0+1;z<area.z1-1;z+=2.2){
    const key=area.id+':'+x.toFixed(2)+':'+z.toFixed(2),p={x:Math.round((x+jitter(key,'x'))*100)/100,z:Math.round((z+jitter(key,'z'))*100)/100};
    if(clear(p.x,p.z))pool.push({...p,rank:hash('mothlight-sites-v1:'+key)});
  }
  pool.sort((a,b)=>a.rank-b.rank);
  for(let round=0;round<11;round++)for(const n of nodes){
    const at=pool.findIndex(p=>used.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>=1.65));if(at<0)continue;
    const p=pool.splice(at,1)[0],point=Object.freeze({x:p.x,z:p.z});sites.get(n.id).push(point);used.push(point);
  }
}
for(const [id,list] of sites)sites.set(id,Object.freeze(list));

const EMPTY = Object.freeze([]);
const resolveNode = value => {const id=typeof value==='string'?value:value?.id;return Object.hasOwn(NODE_BY_ID,id)?NODE_BY_ID[id]:null;};
export function villageNodeCandidates(nodeOrId){const n=resolveNode(nodeOrId);return n?sites.get(n.id):EMPTY;}
export function villageNodePosition(state,nodeOrId){
  const n=resolveNode(nodeOrId);if(!n)return null;
  const choices=villageNodeCandidates(n),raw=state?.village?.gatherCycles?.[n.id],cycle=Number.isSafeInteger(raw)&&raw>=0?raw:0;
  return choices[choices.length===1?0:cycle===0?0:1+(cycle-1)%(choices.length-1)];
}
