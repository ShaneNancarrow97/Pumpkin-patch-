import * as THREE from "three";
import { Voxels } from "./voxels.js";

const BONE = 0xd5ced8, IRON = 0x302936, BRASS = 0xaa7950, PLUM = 0x765184, TEAL = 0x92cfc9;
const ID_LIST = ["cobweb-canopy", "whispering-portraits", "spectral-parade", "thunder-chamber", "phantom-finale"];

// All prefabs mount above the guest lanes. Fixed instances are batched; only
// a handful of whole props move, so toggling a haunt never adds point lights.
export function buildMazePrefab(id, layout) {
  const group = new THREE.Group(); group.name = id; group.userData.prefabId = id;
  const movers = [], W = layout.w / 2, D = layout.d / 2;
  const piece = (name, x, y, z, fill, motion = null) => {
    const voxels = new Voxels(); fill(voxels);
    const object = voxels.build({ shadows: false }); object.traverse(m=>{if(m.material?.isMeshBasicMaterial)m.material.color.multiplyScalar(1.35);}); object.name = name; object.position.set(x,y,z); group.add(object);
    if(motion)movers.push({ object, motion, x, y, z }); return object;
  };
  const eye = (v,x,y,z,size=.06) => v.block(x,y,z,size,size,.045,0xe0bcf2,true);
  function ghost(v, dark=false) {
    const c = dark ? 0x46324f : BONE;
    for(let row=0;row<7;row++) { const width=row===6?.34:row===5?.61:row===0?.63:.78; v.block(0,row*.11,0,width,.115,.25,c); }
    for(const side of [-1,1]) { v.block(side*.46,.34,0,.23,.13,.2,c); v.block(side*.27,-.16,0,.16,.2,.21,c); v.block(side*.19,.46,.15,.09,.12,.035,dark?0xf4c692:IRON,dark); }
    v.block(0,.27,.15,.1,.13,.035,IRON);
  }
  function web(v, size=1) {
    const step=.13*size;
    for(let r=1;r<=6;r++) {
      // A stepped triangular corner web with rings and spokes.
      for(let k=0;k<=r;k++) { const x=k*step, y=(r-k)*step; if(r%2===0||k===0||k===r)v.block(x,-y,0,.032*size,.035*size,.025,BONE); }
    }
    for(let k=0;k<7;k++) { v.block(k*step,-k*step,0,.04*size,.04*size,.026,BONE); v.block(k*step,0,0,.14*size,.028,.025,BONE); v.block(0,-k*step,0,.028,.14*size,.025,BONE); }
  }
  function spider(v) {
    v.block(0,0,0,.21,.13,.16,IRON);v.block(0,.04,.08,.13,.1,.1,PLUM);
    for(const side of [-1,1]) for(let i=0;i<3;i++) { v.block(side*.16,-.05+i*.045,0,.19,.028,.035,IRON);v.block(side*.25,-.1+i*.07,0,.035,.11,.035,IRON); }
    eye(v,-.035,.075,.14,.028);eye(v,.035,.075,.14,.028);
  }
  if(id === "cobweb-canopy") {
    for(const side of [-1,1]) {
      const corner=piece("Silver corner web",side*(W-.38),4.18,-D+.26,v=>web(v,1.4));if(side>0)corner.rotation.y=Math.PI;
      piece("Lower silk web",side*(W-1.28),3.9,-D+.28,v=>web(v,.8));
      piece("Dangling spider",side*(W-.95),3.28,-D+.38,v=>{v.block(0,.12,0,.018,.72,.018,BONE);spider(v);},"spider");
    }
  } else if(id === "whispering-portraits") {
    for(const side of [-1,1]) {
      const x=side*(W-.92);
      piece("Carved whispering frame",x,3.12,-D+.22,v=>{v.block(0,0,0,1.16,1.37,.12,BRASS);v.block(0,.08,.08,.98,1.2,.05,IRON);for(const edge of [-1,1]){v.block(edge*.52,.04,.12,.07,1.26,.07,0xd8b078);v.block(0,edge<0?.02:1.3,.12,1.08,.07,.07,0xd8b078);}});
      piece("Unsettled portrait",x,3.25,-D+.37,v=>{v.block(0,0,0,.83,1.05,.05,0x54394e);v.block(0,.12,.06,.55,.4,.035,0x302b3c);v.block(0,.48,.07,.35,.36,.045,0xaea791);eye(v,-.09,.67,.12,.055);eye(v,.09,.67,.12,.055);v.block(0,.48,.13,.1,.035,.025,IRON);},"portrait");
    }
  } else if(id === "spectral-parade") {
    for(let i=0;i<3;i++) piece("Parading spirit",(i-1)*W*.53,2.9+(i%2)*.38,-D+1.2,v=>ghost(v),"ghost");
  } else if(id === "thunder-chamber") {
    const centre=W*.32;
    for(const side of [-1,1]) piece("Storm coil",centre+side*.67,3.08,-D+.38,v=>{v.block(0,0,0,.24,1.08,.24,IRON);for(let y=.08;y<1.02;y+=.17){v.block(0,y,0,.46,.07,.35,BRASS);v.block(0,y+.075,.1,.34,.035,.18,TEAL,true);}v.block(0,1.12,0,.34,.17,.3,BRASS);v.block(0,1.29,0,.14,.13,.14,TEAL,true);});
    piece("Quiet lightning",centre,3.92,-D+.66,v=>{for(let i=0;i<10;i++){const x=-.63+i*.14,y=Math.sin(i*1.7)*.12;v.block(x,y,0,.16,.065,.045,TEAL,true);}},"electric");
  } else if(id === "phantom-finale") {
    const x=layout.mazeDoor?.x ?? W-2;
    piece("Finale arch",x,2.75,-D+.35,v=>{v.block(0,0,0,2.18,.18,.24,IRON);for(const side of [-1,1]){v.block(side*.94,-.08,0,.2,.5,.2,BRASS);v.block(side*.75,.18,0,.2,.2,.2,PLUM);}for(let i=-3;i<=3;i++)v.block(i*.2,.18+(.6-Math.abs(i)*.14),0,.19,.16,.16,PLUM);});
    piece("The final phantom",x,3.32,-D+.7,v=>{ghost(v,true);for(const side of [-1,1]){v.block(side*.52,.47,0,.3,.13,.23,PLUM);v.block(side*.64,.53,0,.11,.25,.16,PLUM);}},"finale");
  }
  group.userData.movers=movers;group.userData.knownPrefab=ID_LIST.includes(id);return group;
}

// Slow, continuous motion is deliberate: atmosphere rather than flashing effects.
export function animateMazePrefab(group, time, reducedMotion=false) {
  for(const [i,p] of (group.userData.movers??[]).entries()) {
    const t=reducedMotion?0:time;
    if(p.motion==="spider") {p.object.position.y=p.y-Math.sin(t*.62+i)*.16;p.object.rotation.z=Math.sin(t*.8+i)*.035;}
    if(p.motion==="portrait")p.object.rotation.z=Math.sin(t*.48+i*2)*.045;
    if(p.motion==="ghost") {p.object.position.set(p.x+Math.sin(t*.47+i*1.8)*.26,p.y+Math.sin(t*.78+i)*.16,p.z);p.object.rotation.y=Math.sin(t*.36+i)*.2;}
    if(p.motion==="electric") {p.object.scale.y=.78+Math.sin(t*.65)*.14;p.object.position.y=p.y+Math.sin(t*.45)*.04;}
    if(p.motion==="finale") {p.object.position.y=p.y+Math.sin(t*.46)*.28;p.object.rotation.y=Math.sin(t*.33)*.12;}
  }
}
