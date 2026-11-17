import * as THREE from 'three';
import { Voxels } from './voxels.js';
// Granny brings her cottage and its final welcoming light into the scarecrow stop.
export function buildGrannyRideSet(group){
 const root=new THREE.Group();root.name='Granny’s last light';group.add(root);root.visible=false;
 const v=new Voxels(),wood=0x48342d,plum=0x49374c,roof=0x28212e;
 v.box(0,.18,-6,4.6,.36,3.6,wood);v.box(0,1.55,-6,4.1,2.5,3.1,plum);
 for(const x of [-1.9,1.9])v.box(x,1.5,-4.38,.18,2.7,.15,wood);
 for(let i=0;i<9;i++)v.box(0,2.84+i*.12,-6,4.6-i*.4,.15,3.7,roof);
 v.box(.85,1.7,-4.38,.9,1.05,.06,0xf4c180,true);v.box(.85,1.7,-4.32,.06,1.1,.05,wood);v.box(.85,1.7,-4.32,1,.06,.05,wood);
 v.box(-.65,1.1,-4.38,.9,1.9,.08,0x211c27);v.box(-.65,2.1,-4.3,1.1,.1,.12,0xb89a64);
 for(let i=0;i<3;i++)v.box(-.65,.12+i*.1,-3.9-i*.16,1.4,.2,.4,wood);
 for(const x of [-1.8,1.8]){v.box(x,.55,-3.75,.12,1.1,.12,wood);v.box(x,1.23,-3.75,.28,.4,.28,0xf5be79,true);}
 for(const x of [-2.6,2.6]){v.box(x,1,-5,.12,2,.12,wood);v.box(x,1.5,-5,.8,.1,.1,wood);v.box(x,1.85,-5,.42,.45,.35,0xa37b41);v.box(x,2.12,-5,.65,.1,.5,roof);}
 const house=v.build();root.add(house);let granny=null,disposed=false;
 let tickSprite=()=>{};
 if(typeof Image!=='undefined')import('./village-sprite-actors.js').then(async api=>{await api.readyVillageSprites();if(disposed)return;tickSprite=api.tickVillageSprite;granny=api.createVillageSprite('granny');if(granny){granny.position.set(-.65,.38,-4.05);root.add(granny);}}).catch(()=>{});
 const localCamera={position:new THREE.Vector3()};
 const actor={id:'grannys-last-light',object:root,base:new THREE.Vector3(),animate({time=0,on=false,near=false,ramp=0,camera,set}){
  root.visible=!!on;if(!granny||!on)return;
  const step=near?Math.min(1,ramp*1.6):0;granny.position.set(-.65,.38-step*.28,-4.05+step*.9);
  if(camera?.position){localCamera.position.copy(camera.position);set?.group?.worldToLocal(localCamera.position);}
  tickSprite(granny,{time,moving:near&&step<.9,phase:time*.65,heading:{x:0,z:1},camera:camera?localCamera:null});
 }};
 root.userData.dispose=()=>{disposed=true;};
 return actor;
}
