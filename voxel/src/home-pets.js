import * as THREE from "three";
import url from "../assets/home-pets.webp";
import { HOME_PETS_META as META } from "./home-pets-meta.js";
import { homePetRooms, petRoute } from "./rules/home-pets.js";
import { pieceFootprint, roomPieces } from "./rules/house.js";
import { INTERIOR } from "./interiors.js";

// A single shared atlas holds every pose, keeping later stretches upload-free.
const texture=new THREE.TextureLoader().load(url);texture.colorSpace=THREE.SRGBColorSpace;
export const homePetTextures=[texture];
const geometries={};
for(const [who,meta] of Object.entries(META.pets))geometries[who]=meta.frames.map(f=>{
  const u=meta.width/f.w,g=new THREE.PlaneGeometry(f.w*u,f.h*u);
  g.translate((f.w/2-f.ax)*u,(f.ay-f.h/2)*u,0);
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(f.x+uv.getX(i)*f.w)/META.w,1-(f.y+(1-uv.getY(i))*f.h)/META.h);
  g.userData.shared=true;return g;
});
function petFigure(who) {
  const group=new THREE.Group(),lean=new THREE.Group();group.add(lean);
  lean.rotation.x=-INTERIOR.lean;lean.scale.y=1/Math.cos(INTERIOR.pitch-INTERIOR.lean);
  const material=new THREE.MeshStandardMaterial({map:texture,alphaTest:.48,roughness:1,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:.06,color:0xe3d5c5,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geometries[who][0],material);mesh.castShadow=true;
  mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:texture,alphaTest:.48});
  lean.add(mesh);group.name=who+" at home";
  return {group,lean,mesh,dispose(){material.dispose();mesh.customDepthMaterial.dispose();}};
}
const centre=p=>{const f=pieceFootprint(p);return {x:p.x+f.w/2,z:p.z+f.d/2};};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// Pets live in their bed's room, otherwise Skyla/parlour, Sandy/bedroom,
// Maisie/kitchen as those rooms open. All schedules stay outside the save.
export function createHomePets({group,state,room,layout,origin}) {
  const root=new THREE.Group();root.name="Home companions";root.position.copy(origin);group.add(root);
  const pieces=roomPieces(state,room),dogBeds=state.house.placed.filter(p=>p.id==="harvest-dog-bed"),beds={skyla:state.house.placed.find(p=>p.id==="moon-cat-bed"),sandy:dogBeds[0],maisie:dogBeds[1]};
  const bowls=pieces.filter(p=>p.id==="midnight-pet-bowls");
  const obstacles=pieces.filter(p=>!p.on&&!p.id.includes("-bed")&&p.id!=="moon-cat-bed"&&p.id!=="midnight-pet-bowls").map(p=>{
    const f=pieceFootprint(p);return f.layer==="floor"?{x0:p.x,z0:p.z,x1:p.x+f.w,z1:p.z+f.d}:null;
  }).filter(Boolean);
  for(const p of layout.blocked??[])obstacles.push({x0:p.x,z0:p.z,x1:p.x+1,z1:p.z+1});
  const roster=[],rooms=homePetRooms(state);let clock=state.time??0;
  for(const [i,who] of ["skyla","sandy","maisie"].entries())if(rooms[who]===room){
    const figure=petFigure(who),bed=beds[who]?.room===room?beds[who]:null;
    const preferred=bed?centre(bed):{x:1.2+i*1.4,z:Math.max(.8,layout.d-1.4)};
    const start=petRoute(preferred,preferred,layout,obstacles)[0];if(!start){figure.dispose();continue;}
    figure.group.position.set(start.x,0,start.z);root.add(figure.group);
    roster.push({who,...figure,bed,position:{...start},home:{...start},phase:"wag",timer:2+i*1.8,cycle:i,path:[],after:null,face:1,frame:0});
  }
  function travel(p,to,after) {
    const path=petRoute(p.position,to,layout,obstacles,p.who==="skyla"?.18:.22);
    if(path.length>1){p.path=path.slice(1);p.phase="walk";p.after=after;}
    else {p.phase=after;p.timer=after==="sleep"?7:3;}
  }
  function choose(p) {
    const n=p.cycle++%5;
    if((n===0||n===3)&&bowls.length){
      const bowl=centre(bowls[p.cycle%bowls.length]);
      travel(p,{x:bowl.x-.35,z:bowl.z+.55},n===0?"drink":"eat");
    }else if(n===1){
      // A lying sprite sits just above its cushion, while the sleeping feet stay anchored.
      travel(p,p.bed?centre(p.bed):p.home,"sleep");
    }else if(n===2){p.phase="stretch";p.timer=2.8;}
    else {
      const angle=p.cycle*2.399+(p.who==="skyla"?0:1);
      travel(p,{x:Math.max(.4,Math.min(layout.w-.4,p.home.x+Math.cos(angle)*2)),z:Math.max(.4,Math.min(layout.d-.4,p.home.z+Math.sin(angle)*1.2))},"wag");
    }
  }
  function tick(dt,time) {
    clock+=Math.max(0,Math.min(.2,dt));
    for(const p of roster){
      if(dt>0){
        if(p.phase==="walk") {
          const at=p.path[0],speed=p.who==="skyla"?1.0:.8,travelled=speed*Math.min(.2,dt),d=distance(p.position,at);
          if(d<=travelled){p.position={...at};p.path.shift();if(!p.path.length){p.phase=p.after;p.timer=p.phase==="sleep"?8:p.phase==="wag"?3:4;if(["eat","drink"].includes(p.phase))p.face=1;}}
          else {const dx=(at.x-p.position.x)/d,dz=(at.z-p.position.z)/d;p.position.x+=dx*travelled;p.position.z+=dz*travelled;if(Math.abs(dx)>.15)p.face=dx<0?-1:1;}
        }else {p.timer-=dt;if(p.timer<=0)choose(p);}
      }
      const moving=p.phase==="walk",wag=p.phase==="wag";
      p.frame=moving?META.states.walk[Math.floor(clock*6)%2]:wag?META.states.wag[Math.floor(clock*3)%2]:p.phase==="sleep"?META.states.sleep:p.phase==="stretch"?META.states.stretch:["eat","drink"].includes(p.phase)?META.states.feed:META.states.idle;
      p.mesh.geometry=geometries[p.who][p.frame];p.lean.scale.x=p.face;
      const bedLift=p.phase==="sleep"&&p.bed?.room===room ? .13 : 0;
      p.group.position.set(p.position.x,bedLift+(moving?Math.sin(clock*12)*.016:0),p.position.z);
      p.lean.scale.y=(1/Math.cos(INTERIOR.pitch-INTERIOR.lean))*(1+Math.sin(clock*(p.phase==="sleep"?1.8:2.6))*(p.phase==="sleep"?.009:.003));
      p.lean.rotation.z=["eat","drink"].includes(p.phase)?Math.sin(clock*5)*.018:0;
    }
  }
  return {tick,clear(){for(const p of roster)p.dispose();roster.length=0;root.removeFromParent();},status(){return roster.map(p=>({who:p.who,phase:p.phase,frame:p.frame,position:{...p.position},hasBed:!!p.bed,bowls:bowls.length}));}};
}
