// Interaction sockets share the furniture's measured, rotated room coordinates.
import { pieceFootprint, footprint, decorAngle, decorById, roomPieces, roomLayout, hostYaw } from './house.js';
import { homeMedia, isHomeMediaPiece } from './home-media.js';
const SEATS = Object.freeze({f01:{front:.34},f02:{front:.28},f03:{front:.3},'midnight-reading-bench':{front:.26}});
export const readablePiece = p => Array.isArray(p?.books) && p.books.length > 0;
export const seatPiece = p => !!p && Object.hasOwn(SEATS,p.id) && !p.on;
const turn=(x,z,angle)=>({x:x*Math.cos(angle)+z*Math.sin(angle),z:-x*Math.sin(angle)+z*Math.cos(angle)});
// Use the same wall and host frame as places.js. A laptop standing on a desk
// remains usable after the desk turns, and a side-wall TV prompts by that wall.
export function homePiecePosition(s,p){
 const fp=pieceFootprint(p),L=roomLayout(s,p.room);
 if(p.on){
  const host=s.house.placed.find(q=>q.instance===p.on);if(!host)return null;
  const at=homePiecePosition(s,host),f=footprint(host.id);if(!at)return null;
  const local=turn(p.x-f.w/2,f.layer==='wall'?p.z:p.z-f.d/2,hostYaw(host)*Math.PI/180);
  return {x:at.x+local.x,z:at.z+local.z};
 }
 if(fp.layer==='wall')return p.wall==='left'?{x:0,z:p.x+fp.w/2}:p.wall==='right'?{x:L.w,z:p.x+fp.w/2}:{x:p.x+fp.w/2,z:0};
 return {x:p.x+fp.w/2,z:p.z+fp.d/2};
}
export function homePieceTargets(s,room){
 return roomPieces(s,room).flatMap(p=>{
  const fp=pieceFootprint(p),item=decorById[p.id];if(!item||fp.layer==='rug')return [];
  const at=homePiecePosition(s,p);if(!at)return [];
  const {x,z}=at,angle=decorAngle(p.rotation)*Math.PI/180;
  const common={instance:p.instance,item:p.id,name:item.name,objectLabel:item.name};
  if(isHomeMediaPiece(p)){const media=homeMedia(s,p.instance);return [{...common,type:'home-media',label:media.on?'Switch off':'Switch on',x,z,range:1.8}];}
  if(['guitar','piano'].includes(item.interaction))return [{...common,type:'instrument',label:item.interaction==='guitar'?'Play guitar':'Play piano',x,z,range:1.8}];
  if(p.on)return [];
  if(seatPiece(p)){
   const offset=turn(0,SEATS[p.id].front,angle),approach=turn(0,Math.max(.85,fp.d/2+.4),angle);
   return [{...common,type:'sit',label:'Sit down',x:x+approach.x,z:z+approach.z,range:1.25,pose:{x:x+offset.x,z:z+offset.z,y:0,rotation:decorAngle(p.rotation)}}];
  }
  if(readablePiece(p))return [{...common,type:'read',book:p.books[0],label:'Read a story',x,z,range:1.65}];
  const cooking=['kitchen-hob','kitchen-oven','copper-range'].includes(p.id),wardrobe=/wardrobe|costume.*rack|dressing/.test(p.id)||item.interaction==='wardrobe';
  return [{...common,type:cooking?'cooking':wardrobe?'wardrobe':'piece',station:cooking?'home':undefined,label:cooking?'Cook in the kitchen':wardrobe?'Change costume':item.name,x,z}];
 });
}

// Pet sockets follow the companions; names and interaction ids stay local.
export function petInteractionTargets(status){
 const names={skyla:'Skyla',sandy:'Sandy',maisie:'Maisie'};
 return (Array.isArray(status)?status:[]).filter(p=>names[p.who]&&Number.isFinite(p.position?.x)&&Number.isFinite(p.position?.z)).map(p=>({type:'pet',id:p.who,pet:p.who,name:names[p.who],objectLabel:names[p.who],label:'Pet '+names[p.who],x:p.position.x,z:p.position.z,range:1.35,priority:.2}));
}
