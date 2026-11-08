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
import { playerViewScale, playerStandFrame } from './player-view-size.js';
import { crispTexture } from './crisp-sprites.js';
import { recolour } from './sprite-voxels.js';
import { DIRECTIONAL_SPRITES } from './content/directional-sprite-meta.js';
import { directionalSpritePose, validDirectionalSprite } from './directional-sprite-math.js';

const urls={base:baseURL,'shane-a':shaneA,'shane-b':shaneB,'natalie-a':natalieA,'natalie-b':natalieB};
const walkUrls={base:walkBase,'shane-a':walkShaneA,'shane-b':walkShaneB,'natalie-a':walkNatalieA,'natalie-b':walkNatalieB,wheelchair:walkWheelchair,water:waterEmpty};
const sheets={},walkSheets={},frames={},tints=new Map();let loading;
const authoredSheets=new Map(),authoredLoads=new Map();
const authoredMeta=Object.fromEntries(Object.entries(DIRECTIONAL_SPRITES).filter(([id,meta])=>PLAYER_SIDE_WALK_META[id]&&validDirectionalSprite(meta)));
const texture=image=>{const t=new THREE.Texture(image);t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return crispTexture(t);};
const geometry=(meta,f)=>{const u=(meta.height??2.3)/meta.rows,g=new THREE.PlaneGeometry(f.w*u,f.h*u);g.translate((f.w/2-f.ax)*u,(f.ay-f.h/2)*u,0);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(f.x+uv.getX(i)*f.w)/meta.w,1-(f.y+(1-uv.getY(i))*f.h)/meta.h);g.userData.shared=true;return g;};
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

// Decode only an equipped look, not every future costume on a phone. The old
// sheet remains usable while this loads or if its optional artwork is absent.
export function loadAuthoredPlayerDirection(id){
 const meta=authoredMeta[id];
 if(!meta)return Promise.resolve(null);
 if(!authoredLoads.has(id))authoredLoads.set(id,new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>{if(image.width!==meta.w||image.height!==meta.h){resolve(null);return;}const sheet={image,texture:texture(image),frames:meta.frames.map(f=>geometry(meta,f))};authoredSheets.set(id,sheet);resolve(sheet);};
  image.onerror=()=>resolve(null);image.src=meta.url;
 }));
 return authoredLoads.get(id);
}

// Recolour only the requested owner's base row, retaining their approved knit/beanie look.
function tinted(sheet,who,look,region,key){
 const changed=who==='natalie'&&look?.sweater!==undefined&&look.sweater!==0x604625||who==='shane'&&look?.beanie!==undefined&&look.beanie!==0x1a1210;
 // Match recolour's gates before touching pixels: the everyday looks can use
 // the shared atlas directly, without another canvas and GPU texture.
 if(!changed)return sheet.texture;
 const id=key+':'+who+':'+JSON.stringify(look);if(tints.has(id))return tints.get(id);
 const canvas=document.createElement('canvas');canvas.width=sheet.image.width;canvas.height=sheet.image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(sheet.image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
 const {x=0,y=0,w=canvas.width,h=canvas.height,cellHeight=h,bodyRows=320,bodyTop=cellHeight-330}=region;
 for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=(yy*canvas.width+xx)*4;if(!d[i+3])continue;const c=recolour(who,look,d[i],d[i+1],d[i+2],((yy-y)%cellHeight-bodyTop)/bodyRows);if(c){d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];}}
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

// A direction change keeps the same footfall. Every view is painted, so neither
// the atlas nor asymmetrical clothes/tools are reflected to invent a side.
function applyAuthoredWalk(group,{id,who,look,angle,phase,age,moving,action,release}){
 const meta=authoredMeta[id];
 if(release||action||!moving||!Number.isFinite(angle)||!meta)return false;
 loadAuthoredPlayerDirection(id);
 const sheet=authoredSheets.get(id);if(!sheet)return false;
 const pose=directionalSpritePose(meta,{angle,phase:Number.isFinite(phase)?phase:age*1.5,walking:true});
 if(!pose)return false;
 const d=group.userData,m=PLAYER_SIDE_WALK_META[id];
 if(!d.playerFrontTexture)d.playerFrontTexture=group.children[0]?.children.find(n=>n.isMesh)?.material.map;
 const map=id.endsWith('-base')?tinted(sheet,who,look,{cellHeight:meta.cell.h,bodyRows:meta.rows,bodyTop:meta.cell.ay-meta.rows},'authored:'+id):sheet.texture;
 if(d.playerDirectionTexture!==map||!d.playerDirectionActive){paint(group,map);d.playerDirectionTexture=map;}
 const f=sheet.frames[pose.frame];d.show(f);d.shown=f;d.playerDirectionActive=true;
 const stature=m.targetHeight*2.3/320/(m.frontScale?.idle??1);setScale(group,stature/(meta.height??2.3));
 d.playerDirection=pose.direction;d.playerDirectionFrame=pose.phaseIndex;d.playerSideFrameCount=meta.walk[pose.directionIndex].length;d.playerStature=stature;
 d.playerAuthoredDirection=true;d.playerGaitPhase=pose.phase;d.playerLeadingLeg=pose.leadingLeg;
 return true;
}

export function applyPlayerDirection(group,{who,outfit,facing='front',walking=false,moving=walking,time=0,age=time,dx=0,angle,phase,action=null,actionProgress=0,look,release=false}={}){
 const d=group.userData,id=outfit||who+'-base',m=PLAYER_SIDE_WALK_META[id],available=frames[id];
 if(!m||!available||!d.show)return false;
 const kind=typeof action==='string'?action:action?.kind;
 if(applyAuthoredWalk(group,{id,who,look,angle,phase,age,moving,action:kind,release}))return true;
 d.playerAuthoredDirection=false;d.playerGaitPhase=null;d.playerLeadingLeg=null;
 // Empty-handed art lets the one real voxel watering can remain the only can.
 const actionFrames=available[kind],direction=actionFrames?kind:!moving&&authoredSheets.has(id)&&Number.isFinite(angle)?'front':facing;
 if(release||direction==='front'||!available[direction]){
  if(d.playerDirectionActive){paint(group,d.playerFrontTexture);const list=moving?d.walk:d.idle;const f=list?.[Math.floor(age*(moving?5:1.4))%list.length];if(f){d.show(f);d.shown=f;}d.playerDirectionActive=false;}
  setScale(group,playerViewScale(id,'front'));
  d.playerDirection='front';d.playerDirectionFrame=Math.floor(age*(moving?5:1.4))%(moving?d.walk:d.idle).length;d.playerSideFrameCount=4;d.playerStature=release?null:m.targetHeight*2.3/320/(m.frontScale?.idle??1);
  return false;
 }
 if(!d.playerFrontTexture)d.playerFrontTexture=group.children[0].children.find(n=>n.isMesh)?.material.map;
 const map=mapFor(id,direction,who,look);if(d.playerDirectionTexture!==map||!d.playerDirectionActive){paint(group,map);d.playerDirectionTexture=map;}
 // Standing still side-on or from behind shows the walk's most compact frame.
 const stand=playerStandFrame(id,direction);
 d.playerDirectionActive=true;const list=available[direction],index=actionFrames?Math.min(list.length-1,Math.floor(Math.max(0,actionProgress)*list.length)):moving?Math.floor(age*6)%list.length:Math.min(stand,list.length-1),f=list[index];d.show(f);d.shown=f;
 let sign=1;if(direction==='side'||direction==='water'){if(Math.abs(dx)>.1)d.playerSideSign=dx<0?-1:1;sign=d.playerSideSign??1;}
 setScale(group,playerViewScale(id,direction),sign);
 d.playerDirection=direction;d.playerDirectionFrame=index;d.playerSideFrameCount=4;d.playerStature=m.targetHeight*2.3/320/(m.frontScale?.idle??1);
 return true;
}
export const playerDirectionCoverage=()=>Object.keys(PLAYER_SIDE_WALK_META);

// Warm only the equipped atlases, rather than uploading every costume on phones.
export function playerDirectionTextures(ids){
 for(const id of ids??[])loadAuthoredPlayerDirection(id);
 return [...new Set((ids??[]).flatMap(id=>[sheets[PLAYER_DIRECTION_META[id]?.sheet]?.texture,walkSheets[PLAYER_SIDE_WALK_META[id]?.sheet]?.texture,PLAYER_EMPTY_WATER_META[id]?walkSheets.water?.texture:null,authoredSheets.get(id)?.texture]).filter(Boolean))];
}
