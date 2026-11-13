// Transparent menu art rendered from the same furniture meshes as the rooms.
import * as THREE from "three";
import { HOME_FURNISHINGS } from "../src/content/home-furnishings.js";
import { homeFurnishingProp, homeFurnishingStats } from "../src/home-furnishings.js";
import { PET_FURNISHINGS } from "../src/content/pet-furnishings.js";
import { buildPetFurnishing, petFurnishingStats } from "../src/pet-furnishings.js";
const CELL=128,SCALE=2;
const catalogue=[...HOME_FURNISHINGS,...PET_FURNISHINGS];
try{
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(CELL*SCALE,CELL*SCALE);renderer.setPixelRatio(1);renderer.setClearColor(0,0);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.01,50);
  scene.add(new THREE.HemisphereLight(0x8a7ac8,0x3a2830,1.9));
  const key=new THREE.DirectionalLight(0xd2c6ff,2.2);key.position.set(6,10,-7);scene.add(key);
  const fill=new THREE.DirectionalLight(0xffcf9a,1.3);fill.position.set(-1,4,10);scene.add(fill);
  const cols=4,rows=Math.ceil(catalogue.length/cols),sheet=document.createElement("canvas"),g=sheet.getContext("2d");
  sheet.width=cols*CELL;sheet.height=rows*CELL;g.imageSmoothingQuality="high";
  const stats={};
  catalogue.forEach((item,i)=>{
    const prop=buildPetFurnishing(item.id)??homeFurnishingProp(item.id);scene.add(prop);
    const box=new THREE.Box3().setFromObject(prop),centre=box.getCenter(new THREE.Vector3()),dims=box.getSize(new THREE.Vector3());
    const yaw=.42,pitch=item.rug?.8:item.wall?.23:.24,halfW=(Math.cos(yaw)*dims.x+Math.sin(yaw)*dims.z)/2,halfD=(Math.sin(yaw)*dims.x+Math.cos(yaw)*dims.z)/2;
    const halfH=(Math.cos(pitch)*dims.y+Math.sin(pitch)*halfD*2)/2;
    const dist=Math.max(halfW,halfH)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*1.14+halfD;
    camera.position.copy(centre).add(new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(dist));camera.lookAt(centre);
    renderer.render(scene,camera);g.drawImage(renderer.domElement,(i%cols)*CELL,Math.floor(i/cols)*CELL,CELL,CELL);scene.remove(prop);
    stats[item.id]=petFurnishingStats(item.id)??homeFurnishingStats(item.id);
  });
  window.homeThumbResult={sheet:sheet.toDataURL("image/webp",.9),png:sheet.toDataURL("image/png"),stats,layout:{cell:CELL,cols,rows,ids:catalogue.map(i=>i.id)}};
  renderer.dispose();
}catch(e){window.homeThumbError=String(e.stack||e);}
