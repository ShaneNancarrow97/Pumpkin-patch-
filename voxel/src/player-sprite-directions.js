// Coherent owner turnarounds: independent feet/limb phases, stable body stature.
import * as THREE from 'three';
import baseURL from '../assets/player-directions-base.webp';
import shaneA from '../assets/player-directions-shane-a.webp';
import shaneB from '../assets/player-directions-shane-b.webp';
import natalieA from '../assets/player-directions-natalie-a.webp';
import natalieB from '../assets/player-directions-natalie-b.webp';
import walkBase from '../assets/player-walk-base.webp';
import walkShaneA from '../assets/player-walk-shane-a.webp';
import walkShaneB from '../assets/player-walk-shane-b.webp';
import walkNatalieA from '../assets/player-walk-natalie-a.webp';
import walkNatalieB from '../assets/player-walk-natalie-b.webp';
import walkWheelchair from '../assets/player-walk-wheelchair.webp';
import waterEmpty from '../assets/player-water-empty.webp';
import { PLAYER_DIRECTION_META } from './player-direction-meta.js';
import { PLAYER_SIDE_WALK_META, PLAYER_EMPTY_WATER_META } from './player-side-walk-meta.js';
import { crispTexture } from './crisp-sprites.js';
import { recolour } from './sprite-voxels.js';

const urls={base:baseURL,'shane-a':shaneA,'shane-b':shaneB,'natalie-a':natalieA,'natalie-b':natalieB};
const walkUrls={base:walkBase,'shane-a':walkShaneA,'shane-b':walkShaneB,'natalie-a':walkNatalieA,'natalie-b':walkNatalieB,wheelchair:walkWheelchair,water:waterEmpty};
const sheets={},walkSheets={},frames={},tints=new Map();let loading;
const texture=image=>{const t=new THREE.Texture(image);t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return crispTexture(t);};
const geometry=(meta,f)=>{const u=2.3/meta.rows,g=new THREE.PlaneGeometry(f.w*u,f.h*u);g.translate((f.w/2-f.ax)*u,(f.ay-f.h/2)*u,0);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(f.x+uv.getX(i)*f.w)/meta.w,1-(f.y+(1-uv.getY(i))*f.h)/meta.h);return g;};
const loadSet=(source,into)=>Promise.all(Object.entries(source).map(([id,url])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{into[id]={image,texture:texture(image)};resolve();};image.onerror=reject;image.src=url;})));

// Preload joins the original sprite load, before a turn or tool gesture occurs.
export function loadPlayerDirections(){
 return loading??=Promise.all([loadSet(urls,sheets),loadSet(walkUrls,walkSheets)]).then(()=>{
  for(const[id,meta]of Object.entries(PLAYER_DIRECTION_META)){
   frames[id]={};for(const key of ['back','plant','harvest'])if(meta[key])frames[id][key]=meta[key].map(f=>geometry(meta,f));
   const side=PLAYER_SIDE_WALK_META[id];frames[id].side=side.side.map(f=>geometry(side,f));
   if(PLAYER_EMPTY_WATER_META[id])frames[id].water=[geometry({rows:320,w:896,h:400},PLAYER_EMPTY_WATER_META[id])];
  }
 });
}

// Recolour only the requested owner's base row, retaining their approved knit/beanie look.
function tinted(sheet,who,look,region,key){
 if(!look)return sheet.texture;
 const id=key+':'+who+':'+JSON.stringify(look);if(tints.has(id))return tints.get(id);
 const canvas=document.createElement('canvas');canvas.width=sheet.image.width;canvas.height=sheet.image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(sheet.image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
 const {x=0,y=0,w=canvas.width,h=canvas.height,cellHeight=h}=region;
 for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=(yy*canvas.width+xx)*4;if(!d[i+3])continue;const c=recolour(who,look,d[i],d[i+1],d[i+2],((yy-y)%cellHeight-(cellHeight-330))/320);if(c){d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];}}
 ctx.putImageData(pixels,0,0);const t=texture(canvas);tints.set(id,t);return t;
}
function mapFor(id,direction,who,look){
 const m=PLAYER_SIDE_WALK_META[id],old=PLAYER_DIRECTION_META[id];
 if(direction==='side'){const sheet=walkSheets[m.sheet];return id.endsWith('-base')?tinted(sheet,who,look,{y:who==='shane'?0:400,h:400},'side'):sheet.texture;}
 if(direction==='water'){const sheet=walkSheets.water;return tinted(sheet,who,look,{x:who==='shane'?0:448,w:448,h:400},'empty-water');}
 const sheet=sheets[old.sheet];return old.sheet==='base'?tinted(sheet,who,look,{y:who==='shane'?0:1020,h:1020,cellHeight:340},'old'):sheet.texture;
}
// All layered alpha and depth planes receive the same atlas together.
function paint(group,map){for(const mesh of group.children[0]?.children??[]){if(!mesh.isMesh)continue;mesh.material.map=map;mesh.material.emissiveMap=map;if(mesh.customDepthMaterial)mesh.customDepthMaterial.map=map;}}
function setScale(group,amount,sign=1){group.scale.set(amount*sign,amount,amount);}

export function applyPlayerDirection(group,{who,outfit,facing='front',walking=false,moving=walking,time=0,age=time,dx=0,action=null,actionProgress=0,look,release=false}={}){
 const d=group.userData,id=outfit||who+'-base',m=PLAYER_SIDE_WALK_META[id],available=frames[id];
 if(!m||!available||!d.show)return false;
 const kind=typeof action==='string'?action:action?.kind;
 // Empty-handed art lets the one real voxel watering can remain the only can.
 const actionFrames=available[kind],direction=actionFrames?kind:facing;
 if(release||direction==='front'||!available[direction]){
  if(d.playerDirectionActive){paint(group,d.playerFrontTexture);const list=moving?d.walk:d.idle;const f=list?.[Math.floor(age*(moving?5:1.4))%list.length];if(f){d.show(f);d.shown=f;}d.playerDirectionActive=false;}
  setScale(group,release?1:m.frontScale[moving?'walk':'idle']);
  d.playerDirection='front';d.playerDirectionFrame=Math.floor(age*(moving?5:1.4))%(moving?d.walk:d.idle).length;d.playerSideFrameCount=4;d.playerStature=release?null:m.targetHeight*2.3/320;
  return false;
 }
 if(!d.playerFrontTexture)d.playerFrontTexture=group.children[0].children.find(n=>n.isMesh)?.material.map;
 const map=mapFor(id,direction,who,look);if(d.playerDirectionTexture!==map||!d.playerDirectionActive){paint(group,map);d.playerDirectionTexture=map;}
 d.playerDirectionActive=true;const list=available[direction],index=actionFrames?Math.min(list.length-1,Math.floor(Math.max(0,actionProgress)*list.length)):moving?Math.floor(age*6)%list.length:0,f=list[index];d.show(f);d.shown=f;
 let sign=1;if(direction==='side'||direction==='water'){if(Math.abs(dx)>.1)d.playerSideSign=dx<0?-1:1;sign=d.playerSideSign??1;}
 const amount=direction==='back'?m.backScale:['plant','harvest'].includes(direction)?m.targetHeight/320:1;setScale(group,amount,sign);
 d.playerDirection=direction;d.playerDirectionFrame=index;d.playerSideFrameCount=4;d.playerStature=m.targetHeight*2.3/320;
 return true;
}
export const playerDirectionCoverage=()=>Object.keys(PLAYER_SIDE_WALK_META);
// Warm only the equipped atlases, rather than uploading every costume on phones.
export function playerDirectionTextures(ids){
 return [...new Set((ids??[]).flatMap(id=>[sheets[PLAYER_DIRECTION_META[id]?.sheet]?.texture,walkSheets[PLAYER_SIDE_WALK_META[id]?.sheet]?.texture,PLAYER_EMPTY_WATER_META[id]?walkSheets.water?.texture:null]).filter(Boolean))];
}
