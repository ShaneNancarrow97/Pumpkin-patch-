// The painted caretakers (Hettie, then her twin Hattie) and a bounded pool of
// small voxel litter props, wherever on the farm the guests dropped them.
import * as THREE from "three";
import { Voxels } from "./voxels.js";
import { LEAN, STRETCH } from "./world.js";
import { crispen, crispTexture } from "./crisp-sprites.js";
import { JANITOR_META } from "./janitor-meta.js";
import janitorURL from "../assets/hettie-janitor.webp";
import twinURL from "../assets/hattie-janitor.webp";
import iconURL from "../assets/hettie-janitor-icon.webp";
export const janitorIconURL=iconURL;

function litterModel(kind) {
  const v=new Voxels();
  if(kind===0) { // A discarded cocoa cup, in Sandy's plum and cream.
    v.box(-.11,0,-.10,.22,.19,.2,0x6f3f58);v.box(-.125,.19,-.115,.25,.04,.23,0xe8d6b0);v.box(-.075,.04,-.103,.15,.07,.01,0xdba85e);
  } else if(kind===1) { // A folded paper napkin and its crumpled corners.
    v.box(-.16,0,-.12,.32,.025,.24,0xd2c1a0);v.box(-.12,.025,-.05,.15,.035,.12,0xe9d9bc);v.box(.06,.025,.02,.09,.055,.07,0xbba682);
  } else { // A striped snack wrapper, rather than an unrecognisable cube.
    v.box(-.2,0,-.09,.4,.035,.18,0xa85531);v.box(-.12,.035,-.08,.06,.025,.16,0xe3bc73);v.box(.02,.035,-.08,.06,.025,.16,0xe3bc73);v.box(-.23,0,-.06,.07,.05,.12,0x74402d);v.box(.17,0,-.06,.07,.05,.12,0x74402d);
  }
  return v.build();
}
// Hettie stands as tall as the guests she tidies up after (about 1.6 units).
function frameGeometry(f) {
  const u=1.6/JANITOR_META.height,g=new THREE.PlaneGeometry(f.w*u,f.h*u);g.translate((f.w/2-f.ax)*u,(f.ay-f.h/2)*u,0);
  const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(f.x+uv.getX(i)*f.w)/JANITOR_META.w,1-(f.y+(1-uv.getY(i))*f.h)/JANITOR_META.h);return g;
}
export function createCleanlinessView({scene,state,warm=()=>{}}) {
  const group=new THREE.Group();group.name="Farm cleanliness";scene.add(group);
  const templates=[0,1,2].map(litterModel),pieces=new Map(),frames={walk:JANITOR_META.walk.map(frameGeometry),sweep:JANITOR_META.sweep.map(frameGeometry)};
  // One sprite for each caretaker the farm can hire; the second is Hettie's twin, in her own colours.
  const caretakers=[janitorURL,twinURL].map((url,i)=>{
    const texture=crispTexture(new THREE.TextureLoader().load(url,t=>warm(t)));texture.colorSpace=THREE.SRGBColorSpace;
    const material=crispen(new THREE.MeshStandardMaterial({map:texture,alphaTest:.5,roughness:1,metalness:0,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:.22}));
    const root=new THREE.Group(),lean=new THREE.Group(),mesh=new THREE.Mesh(frames.walk[0],material);lean.rotation.x=-LEAN;lean.scale.y=STRETCH;lean.add(mesh);root.add(lean);root.visible=false;group.add(root);
    mesh.castShadow=true;mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:texture,alphaTest:.5});
    return {root,mesh,texture,material,last:null,facing:i?-1:1,phase:i*.37};
  });
  let age=0;
  function update(dt,visible=true) {
    group.visible=visible;if(!visible)return;age+=Math.max(0,dt);const c=state.cleanliness,litter=c?.litter??[],ids=new Set(litter.map(p=>p.id));
    for(const [id,m]of pieces)if(!ids.has(id)){group.remove(m);pieces.delete(id);}
    for(const p of litter){let m=pieces.get(p.id);if(!m){m=templates[p.kind%3].clone(true);m.userData.litterId=p.id;m.rotation.y=Number(p.id.slice(7))*1.7;pieces.set(p.id,m);group.add(m);}m.position.set(p.x,.085+(p.y??0),p.z);}
    caretakers.forEach((k,i)=>{
      const j=c?.janitors?.[i];k.root.visible=!!j;if(!j){k.last=null;return;}
      const last=k.last??j,dx=j.x-last.x,dz=j.z-last.z,moving=Math.hypot(dx,dz)>.0001;
      if(Math.abs(dx)>.0001)k.facing=dx<0?-1:1;
      k.root.position.set(j.x,.08,j.z);k.root.scale.x=k.facing;
      const sweeping=j.sweep>0,list=sweeping?frames.sweep:frames.walk;k.mesh.geometry=list[sweeping||moving?Math.floor((age+k.phase)*(sweeping?5:6))%list.length:1];k.last={x:j.x,z:j.z};
    });
  }
  function dispose(){scene.remove(group);const geometries=new Set(),materials=new Set();for(const t of templates)t.traverse(n=>{if(n.isMesh){geometries.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const list of Object.values(frames))for(const g of list)g.dispose();for(const k of caretakers){k.material.dispose();k.mesh.customDepthMaterial.dispose();k.texture.dispose();}}
  return {group,update,dispose};
}
