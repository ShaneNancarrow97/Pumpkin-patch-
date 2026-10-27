// Whole-sheet owner turnarounds for direct play. The original front art stays
// authoritative; side/back frames never borrow another outfit's silhouette.
import * as THREE from 'three';
import baseURL from '../assets/player-directions-base.webp';
import shaneA from '../assets/player-directions-shane-a.webp';
import shaneB from '../assets/player-directions-shane-b.webp';
import natalieA from '../assets/player-directions-natalie-a.webp';
import natalieB from '../assets/player-directions-natalie-b.webp';
import { PLAYER_DIRECTION_META } from './player-direction-meta.js';
import { crispTexture } from './crisp-sprites.js';
import { recolour } from './sprite-voxels.js';

const urls={base:baseURL,'shane-a':shaneA,'shane-b':shaneB,'natalie-a':natalieA,'natalie-b':natalieB};
const sheets={},frames={},tints=new Map();let loading;
const texture=image=>{const t=new THREE.Texture(image);t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return crispTexture(t);};
const geometry=(meta,f)=>{const u=2.3/meta.rows,g=new THREE.PlaneGeometry(f.w*u,f.h*u);g.translate((f.w/2-f.ax)*u,(f.ay-f.h/2)*u,0);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(f.x+uv.getX(i)*f.w)/meta.w,1-(f.y+(1-uv.getY(i))*f.h)/meta.h);return g;};

// Loading joins the existing sprite preload, so a first turn cannot flash.
export function loadPlayerDirections(){
  return loading??=Promise.all(Object.entries(urls).map(([id,url])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{sheets[id]={image,texture:texture(image)};resolve();};image.onerror=reject;image.src=url;}))).then(()=>{for(const[id,meta]of Object.entries(PLAYER_DIRECTION_META)){frames[id]={};for(const key of ['side','back','plant','water','harvest'])if(meta[key])frames[id][key]=meta[key].map(f=>geometry(meta,f));}});
}

// Base-knit and beanie recolours apply to the same owner in the new views too.
function playerTexture(meta,who,look){
  const sheet=sheets[meta.sheet];if(meta.sheet!=='base'||!look)return sheet.texture;
  const key=who+':'+JSON.stringify(look);if(tints.has(key))return tints.get(key);
  const canvas=document.createElement('canvas');canvas.width=sheet.image.width;canvas.height=sheet.image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(sheet.image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
  const first=who==='shane'?0:3*340,last=first+3*340;
  for(let y=first;y<last;y++)for(let x=0;x<canvas.width;x++){const i=(y*canvas.width+x)*4;if(!d[i+3])continue;const c=recolour(who,look,d[i],d[i+1],d[i+2],((y%340)-10)/320);if(c){d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];}}
  ctx.putImageData(pixels,0,0);const t=texture(canvas);tints.set(key,t);return t;
}

// Texture replacement keeps the already compiled material/alpha shadow variant.
function paint(group,map){
  const lean=group.children[0];if(!lean)return;
  for(const mesh of lean.children){if(!mesh.isMesh)continue;mesh.material.map=map;mesh.material.emissiveMap=map;if(mesh.customDepthMaterial)mesh.customDepthMaterial.map=map;}
}

export function applyPlayerDirection(group,{who,outfit,facing='front',walking=false,moving=walking,time=0,age=time,dx=0,action=null,actionProgress=0,look}={}){
  const d=group.userData,id=outfit||who+'-base',meta=PLAYER_DIRECTION_META[id],available=frames[id];
  if(!meta||!available||!d.show)return false;
  const kind=typeof action==='string'?action:action?.kind;
  const actionFrames=available[kind],direction=actionFrames?kind:facing;
  if(direction==='front'||!available[direction]){
    if(d.playerDirectionActive){paint(group,d.playerFrontTexture);group.scale.x=1;const list=moving?d.walk:d.idle;const f=list?.[Math.floor(age*(moving?5:1.4))%list.length];if(f){d.show(f);d.shown=f;}d.playerDirectionActive=false;}
    return false;
  }
  if(!d.playerFrontTexture)d.playerFrontTexture=group.children[0].children.find(m=>m.isMesh)?.material.map;
  const map=playerTexture(meta,who,look);if(d.playerDirectionTexture!==map||!d.playerDirectionActive){paint(group,map);d.playerDirectionTexture=map;}
  d.playerDirectionActive=true;const list=available[direction],index=actionFrames?Math.min(list.length-1,Math.floor(Math.max(0,actionProgress)*list.length)):moving?Math.floor(age*(list.length===2?5:6))%list.length:0,f=list[index];d.show(f);d.shown=f;
  if(direction==='side'){if(Math.abs(dx)>.1)d.playerSideSign=dx<0?-1:1;group.scale.x=d.playerSideSign??1;}else group.scale.x=1;
  return true;
}

export const playerDirectionCoverage=()=>Object.keys(PLAYER_DIRECTION_META);
