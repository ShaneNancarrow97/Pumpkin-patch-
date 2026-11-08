import * as THREE from 'three';
import { Voxels } from './voxels.js';
import { villageGateway, villageRoadDistance } from './content/village-gateway.js';
import { buildGround, grounds } from './ground.js';
import { COL } from './world.js';

// A small grounded waymark beside the existing road. The public exit stays open.
export function buildVillageGateway(signBoard,state={}) {
 const root=new THREE.Group(),marker=new THREE.Group(),v=new Voxels();root.name='Mothlight public road';root.add(marker);
 v.block(-.4,.02,1.55,.34,.12,.35,0x7a6f84);v.block(-.4,.14,1.55,.14,1.82,.16,0x392b32);
 v.block(-.4,1.95,1.55,.25,.075,.26,0xb18a59);
 v.block(-.4,2.025,1.55,.16,.19,.16,0xffc47a,true);v.block(-.4,2.21,1.55,.26,.06,.26,0x302631);
 marker.add(v.build({detailShadows:false}));
 const board=signBoard('Mothlight','village road →',1.45);board.position.set(-.4,1.62,1.55);board.rotation.y=-Math.PI/3;marker.add(board);
 const hit=new THREE.Mesh(new THREE.BoxGeometry(1.3,2.4,1.7),new THREE.MeshBasicMaterial({visible:false}));hit.userData={type:'village'};root.add(hit);
 let key='',extension=null;
 function sync(){
  const g=villageGateway(state),next=`${g.x}:${g.extension.x0}`;if(next===key)return;key=next;
  marker.position.set(g.x,0,g.z);hit.position.set(g.x-.25,1.2,g.z+1.15);
  if(extension){root.remove(extension);extension.traverse(o=>o.geometry?.dispose());extension.material.map?.dispose();extension.material.dispose();}
  extension=buildGround(g.extension,(x,z)=>villageRoadDistance(x,z)<.95?grounds.cobble(x,z,COL.stone,.42,1,0x2a2430):grounds.grass(x,z),{farmView:true});
  extension.name='Existing public road continuation';root.add(extension);
  root.userData.gateway={x:g.x,z:g.z,approach:{...g.approach},clearance:{...g.clearance},lane:g.lane.map(p=>[...p]),extension:{...g.extension}};
 }
 sync();return{root,hit,sync,get plan(){return villageGateway(state);}};
}
