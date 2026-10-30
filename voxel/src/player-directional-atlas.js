// Reviewed pages are separate from the legacy bank and decoded only on demand.
import * as THREE from 'three';
import data from '../assets/directional/manifest.json';
import { directionalPageURLs } from './directional-pages.js';
import { compileDirectionalManifest, directionFromView } from './content/directional-atlas.js';
import { crispTexture } from './crisp-sprites.js';
import { recolour } from './sprite-voxels.js';

const banks=new Map(Object.entries(data.looks).map(([id,m])=>[id,compileDirectionalManifest(m)]));
const pages=new Map(),pending=new Map(),geometries=new Map(),errors=[],leases=new Map();
const MAX_PAGES=4;let wanted='',onTexture=()=>{};
export function setDirectionalTextureWarm(fn){onTexture=typeof fn==='function'?fn:()=>{};}
function trim(){const used=new Set(leases.values());for(const [key,p]of pages){if(pages.size<=MAX_PAGES)break;if(used.has(key)||key===wanted)continue;p.texture.dispose();pages.delete(key);}}
function releasePage(group){leases.delete(group);}
function leasePage(group,key){
 leases.set(group,key);
 if(!group.userData.directionalDisposal){
  const dispose=group.userData.dispose;
  group.userData.dispose=()=>{releasePage(group);dispose?.();trim();};
  group.userData.directionalDisposal=true;
 }
}
function pageTexture(manifest,page,look){
 const custom=look&&!['olive','black'].includes(look.id)?look:null,key=page.url+':'+(custom?JSON.stringify(custom):'original');wanted=key;
 if(!directionalPageURLs[page.url]){if(!errors.includes(page.url))errors.push(page.url);return null;}
 if(pages.has(key)){const p=pages.get(key);pages.delete(key);pages.set(key,p);return {key,...p};}
 if(pending.has(key))return null;
 const job=new Promise(resolve=>{
  const image=new Image();image.onload=()=>{
   let source=image;
   if(custom){
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
    const frames=Object.values(manifest.actions).flatMap(a=>Object.values(a.directions).flatMap(c=>c.frames)).filter(f=>f.page===page.id);
    for(const f of frames)for(let y=0;y<f.rect.h;y++)for(let x=0;x<f.rect.w;x++){
     const at=((f.rect.y+y)*canvas.width+f.rect.x+x)*4;if(!d[at+3])continue;
     const row=(y-f.anchor.y+manifest.pixelsPerUnit*2.3)/(manifest.pixelsPerUnit*2.3),c=recolour(manifest.owner,custom,d[at],d[at+1],d[at+2],row);
     if(c){d[at]=c[0];d[at+1]=c[1];d[at+2]=c[2];}
    }
    ctx.putImageData(pixels,0,0);source=canvas;
   }
   const texture=crispTexture(new THREE.Texture(source));texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
   pages.set(key,{texture});pending.delete(key);onTexture(texture);trim();resolve(texture);
  };
  image.onerror=()=>{pending.delete(key);if(!errors.includes(page.url))errors.push(page.url);resolve(null);};image.src=directionalPageURLs[page.url];
 });pending.set(key,job);return null;
}
function geometry(page,f){
 const key=page.url+':'+[f.rect.x,f.rect.y,f.rect.w,f.rect.h,f.pixelsPerUnit].join(':');if(geometries.has(key))return geometries.get(key);
 const {rect:r,anchor:a}=f,u=1/f.pixelsPerUnit,g=new THREE.PlaneGeometry(r.w*u,r.h*u);g.translate((r.w/2-a.x)*u,(a.y-r.h/2)*u,0);
 const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(r.x+uv.getX(i)*r.w)/page.width,1-(r.y+(1-uv.getY(i))*r.h)/page.height);
 g.userData.shared=true;geometries.set(key,g);return g;
}

// A missing action keeps its original costume/gesture. No flat sprite rotation
// or mirroring is counted as another authored direction.
export function applyReviewedDirection(group,{who,outfit,viewAngle=0,walking=false,age=0,action=null,actionProgress=0,look,release=false}={}){
 const d=group.userData,id=outfit||who+'-base',bank=banks.get(id),kind=(typeof action==='string'?action:action?.kind)||(walking?'walk':'idle');
 const previous=d.playerAtlas,previousPage=leases.get(group);
 d.playerAtlas=null;d.playerHandLocal=null;releasePage(group);if(release||!bank?.validation.ok){trim();return false;}
 const selected=bank.select({action:kind,yaw:viewAngle,progress:action?actionProgress:age,allowNearest:true});
 d.playerAtlas={look:id,action:kind,requestedDegree:selected.requestedDegree,direction:selected.direction,coverage:selected.coverage,mode:selected.mode??null};
 if(!selected.frame)return false;
 const gap=Math.abs(((selected.direction-selected.requestedDegree+540)%360)-180);
 if(gap>45||(kind==='water'&&!selected.frame.sockets?.hand)){d.playerAtlas.coverage='legacy';return false;}
 const page=bank.pageMap[selected.frame.page],ready=pageTexture(bank,page,look);
 if(!ready){
  d.playerAtlas.coverage='loading';
  // Keep the last valid body while another movement page decodes. Swapping a
  // legacy body in for one frame would make the head and stance flash on turns.
  if(['idle','walk'].includes(kind)&&previous?.look===id&&previousPage&&pages.has(previousPage)){leasePage(group,previousPage);return true;}
  return false;
 }
 leasePage(group,ready.key);
 const mesh=group.children[0]?.children.find(m=>m.isMesh);if(!d.playerFrontTexture)d.playerFrontTexture=mesh?.material.map;
 for(const m of group.children[0]?.children??[]){if(!m.isMesh)continue;m.material.map=ready.texture;m.material.emissiveMap=ready.texture;if(m.customDepthMaterial)m.customDepthMaterial.map=ready.texture;}
 const frame=geometry(page,selected.frame);d.show(frame);d.shown=frame;group.scale.set(1,1,1);
 const hand=selected.frame.sockets?.hand;if(hand)d.playerHandLocal={x:(hand.x-selected.frame.anchor.x)/selected.frame.pixelsPerUnit,y:(selected.frame.anchor.y-hand.y)/selected.frame.pixelsPerUnit,z:0};
 d.playerDirectionActive=true;d.playerDirectionTexture=ready.texture;d.playerDirection=selected.direction===0?'front':selected.direction===180?'back':'side';
 d.playerDirectionFrame=selected.index;d.playerSideFrameCount=selected.frameCount;d.playerStature=2.3;trim();return true;
}
// Autonomous owners use the same art as direct play. Their distance phase and
// last world heading survive a pause; the camera only changes the viewed angle.
const cameraRight=new THREE.Vector3(),cameraForward=new THREE.Vector3();
export function animateReviewedOwner(group,{who,camera,dx=0,dz=0,travel=0,moving=false,time=0,visible=true}={}){
 const d=group.userData;if(!d.playerAnimate)return;
 if(!visible){if(d.playerDirectionActive||leases.has(group))d.playerAnimate({who,release:true});return;}
 const motion=d.reviewedMotion??={x:0,z:0,stride:0};
 if(moving&&Math.hypot(dx,dz)>.001){const length=Math.hypot(dx,dz);motion.x=dx/length;motion.z=dz/length;}
 motion.stride+=Math.max(0,travel)/2.3;
 let degree=0;
 if(camera&&Math.hypot(motion.x,motion.z)>.001){
  cameraRight.set(1,0,0).applyQuaternion(camera.quaternion);cameraRight.y=0;cameraRight.normalize();
  camera.getWorldDirection(cameraForward);cameraForward.y=0;cameraForward.normalize();
  degree=directionFromView(motion.x*cameraRight.x+motion.z*cameraRight.z,motion.x*cameraForward.x+motion.z*cameraForward.z)??0;
 }
 // Front is the original autonomous fallback for unproduced costume sheets.
 d.playerAnimate({who,facing:'front',viewAngle:degree,walking:moving,age:moving?motion.stride:time,dx:0});
}
export function directionalRuntimeStatus(){return {looks:[...banks.keys()],residentPages:pages.size,pageLimit:MAX_PAGES,leasedActors:leases.size,leasedPages:new Set(leases.values()).size,rgbaBytes:[...pages.values()].reduce((n,p)=>n+(p.texture.image?.width??0)*(p.texture.image?.height??0)*4,0),pendingPages:pending.size,errors:[...errors],coverage:Object.fromEntries([...banks].map(([id,b])=>[id,b.coverage]))};}
