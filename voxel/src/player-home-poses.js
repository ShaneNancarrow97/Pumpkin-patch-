// The original owners have drawn home poses. Costume knees articulate from
// their own front artwork, so sitting never silently changes a selected look.
import * as THREE from 'three';
import url from '../assets/owner-home-poses.webp';
import { HOME_POSE_META as META } from './owner-home-pose-meta.js';
import { crispTexture } from './crisp-sprites.js';
import { recolour } from './sprite-voxels.js';
import { Voxels } from './voxels.js';
const texture=crispTexture(new THREE.TextureLoader().load(url));texture.colorSpace=THREE.SRGBColorSpace;
export const ownerHomeTextures=[texture];
const poses={},seated=new WeakMap(),originals=new WeakMap(),tints=new Map();
for(const [who,frames] of Object.entries(META.owners)){
 poses[who]={};for(const [kind,f]of Object.entries(frames)){
  const u=2.3/META.rows,g=new THREE.PlaneGeometry(f.w*u,f.h*u);g.translate((f.w/2-f.ax)*u,(f.ay-f.h/2)*u,0);
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(f.x+uv.getX(i)*f.w)/META.w,1-(f.y+(1-uv.getY(i))*f.h)/META.h);g.userData.shared=true;poses[who][kind]=g;
 }
}
function paint(actor,map){const lean=actor.children[0];for(const mesh of lean?.children??[]){if(!mesh.isMesh)continue;mesh.material.map=map;mesh.material.emissiveMap=map;if(mesh.customDepthMaterial)mesh.customDepthMaterial.map=map;}}
function tint(who,look){
 if(!look||!texture.image)return texture;const key=who+JSON.stringify(look);if(tints.has(key))return tints.get(key);
 const c=document.createElement('canvas');c.width=META.w;c.height=META.h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(texture.image,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height),data=pixels.data,row=who==='shane'?0:320;
 for(let y=row;y<row+320;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(!data[i+3])continue;const col=recolour(who,look,data[i],data[i+1],data[i+2],(y-row)/320);if(col){data[i]=col[0];data[i+1]=col[1];data[i+2]=col[2];}}
 ctx.putImageData(pixels,0,0);const t=crispTexture(new THREE.CanvasTexture(c));t.colorSpace=THREE.SRGBColorSpace;tints.set(key,t);return t;
}
function bentLegs(g){
 if(seated.has(g))return seated.get(g);g.computeBoundingBox();const box=g.boundingBox,w=box.max.x-box.min.x,h=box.max.y-box.min.y;
 const out=new THREE.PlaneGeometry(w,h,1,16),p=out.attributes.position,uv=out.attributes.uv,srcUV=g.attributes.uv;
 const u0=Math.min(...Array.from({length:srcUV.count},(_,i)=>srcUV.getX(i))),u1=Math.max(...Array.from({length:srcUV.count},(_,i)=>srcUV.getX(i))),v0=Math.min(...Array.from({length:srcUV.count},(_,i)=>srcUV.getY(i))),v1=Math.max(...Array.from({length:srcUV.count},(_,i)=>srcUV.getY(i)));
 for(let i=0;i<p.count;i++){
  const x=p.getX(i)+(box.min.x+box.max.x)/2,y=p.getY(i)+h/2+box.min.y,t=(y-box.min.y)/h;
  let sy=y,dx=0;
  if(t>.42)sy=y-h*.16;else if(t>.19){const a=(t-.19)/.23;sy=box.min.y+h*(.23+.03*a);dx=h*.17*(1-a);}else{sy=box.min.y+(t/.19)*h*.23;dx=h*.17;}
  p.setXYZ(i,x+dx,sy,0);uv.setXY(i,u0+uv.getX(i)*(u1-u0),v0+uv.getY(i)*(v1-v0));
 }
 out.computeVertexNormals();out.userData.shared=true;seated.set(g,out);return out;
}
function disposeBook(group){group?.traverse(m=>{if(m.isMesh){m.material?.dispose();m.dispose?.();}});group?.removeFromParent();}
function book(){const v=new Voxels();v.box(-.18,-.02,-.02,.18,.035,.25,0x652d43);v.box(.01,-.02,-.02,.18,.035,.25,0x652d43);v.box(-.16,.017,0,.15,.012,.21,0xe7d8b5);v.box(.025,.017,0,.15,.012,.21,0xe7d8b5);for(let i=0;i<4;i++){v.box(-.14,.031,.035+i*.04,.10,.004,.005,0xb29b7c);v.box(.04,.031,.035+i*.04,.10,.004,.005,0xb29b7c);}const g=v.build();g.name='A story in hand';return g;}
export function clearHomePose(actor){
 const old=originals.get(actor);if(!old)return;paint(actor,old.texture);actor.userData.show?.(old.geometry);actor.userData.shown=old.geometry;actor.userData.playerDirectionActive=false;actor.scale.set(1,1,1);
 if(actor.children[0]){actor.children[0].rotation.z=0;actor.children[0].position.y=0;}disposeBook(old.book);originals.delete(actor);
}
export function applyHomePose(actor,{who,outfit,look,kind,target,time=0}){
 const d=actor?.userData;if(!d?.show||!d.idle?.[0])return false;
 let old=originals.get(actor);if(!old){const mesh=actor.children[0].children.find(m=>m.isMesh);old={texture:d.playerFrontTexture??mesh?.material.map,geometry:d.idle[0],book:null};originals.set(actor,old);}
 const base=!outfit||outfit.endsWith('-base'),petting=base&&kind==='pet'&&!!d.playerAnimate,drawn=base&&kind!=='pet'&&texture.image&&poses[who]?.[kind]&&(kind!=='read'||target?.pose);
 if(petting){d.playerAnimate({who,outfit,look,action:'plant',facing:'front',walking:false,time,controlled:true});}
 else if(drawn){paint(actor,tint(who,look));d.show(poses[who][kind]);d.shown=poses[who][kind];}
 else {paint(actor,old.texture);const geometry=kind==='sit'&&!outfit?.includes('wheelchair')?bentLegs(old.geometry):old.geometry;d.show(geometry);d.shown=geometry;}
 // A wheelchair remains seated in its own chair; it is never folded into a second seat.
 const lean=actor.children[0];lean.rotation.z=kind==='pet'&&!drawn?-.10+Math.sin(time*2)*.015:Math.sin(time*1.6)*.006;
 if(kind==='read'&&!drawn){if(!old.book){old.book=book();actor.add(old.book);}old.book.visible=true;old.book.position.set(.12,1.1,.28);old.book.rotation.x=.5;}else if(old.book)old.book.visible=false;
 // Set the whole scale: a turnaround drawn a moment before leaves its own size
 // behind. The pose art is drawn at the front sprite's size; a pet's crouch
 // keeps the size its turnaround gave it, only facing the pet.
 const sign=target?.pose?(Math.sin(target.pose.rotation*Math.PI/180)<-.2?-1:1):kind==='pet'?(actor.userData.playerSideSign??1):1,size=petting?Math.abs(actor.scale.y)||1:1;
 actor.scale.set(sign*size,size,size);return true;
}
