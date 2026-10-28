// Interaction sockets share the furniture's measured, rotated room coordinates.
import { pieceFootprint, decorAngle, decorById, roomPieces } from './house.js';
const SEATS = Object.freeze({f01:{front:.34},f02:{front:.28},f03:{front:.3},'midnight-reading-bench':{front:.26}});
export const readablePiece = p => Array.isArray(p?.books) && p.books.length > 0;
export const seatPiece = p => !!p && Object.hasOwn(SEATS,p.id) && !p.on;
const turn=(x,z,angle)=>({x:x*Math.cos(angle)+z*Math.sin(angle),z:-x*Math.sin(angle)+z*Math.cos(angle)});
export function homePieceTargets(s,room){
 return roomPieces(s,room).flatMap(p=>{
  const fp=pieceFootprint(p),item=decorById[p.id];if(!item||p.on||fp.layer==='rug')return [];
  const x=p.x+fp.w/2,z=p.z+fp.d/2,angle=decorAngle(p.rotation)*Math.PI/180;
  const common={instance:p.instance,item:p.id,name:item.name,objectLabel:item.name};
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
