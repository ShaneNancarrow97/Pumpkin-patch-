import * as THREE from 'three';
import { Voxels } from './voxels.js';
import { VILLAGE_GATEWAY as G } from './content/village-gateway.js';

// A grounded timber gateway, illuminated moth lintel and inset paving show the route.
export function buildVillageGateway(signBoard) {
  const root=new THREE.Group(),v=new Voxels();root.name='Mothlight village road';
  for(const dx of [-1.2,1.2]){
    v.box(G.x+dx-.13,0,G.z-.16,.26,3.3,.32,0x392b32);
    v.box(G.x+dx-.21,3.25,G.z-.24,.42,.14,.48,0x966245);
    v.box(G.x+dx-.12,2.9,G.z+.19,.24,.32,.22,0xffc47a,true);
  }
  v.box(G.x-1.45,3.3,G.z-.2,2.9,.24,.4,0x553545);
  // A stone ribbon joins the existing shop lane, with small inset amber waymarks.
  for(let i=0;i<12;i++){
    const t=i/11,x=34+4*t,z=15-4.6*t;
    v.box(x-.46,.06,z-.46,.92,.08,.92,i%2?0x9a8b9e:0x83718d);
    if(i%3===1)v.box(x-.09,.15,z-.09,.18,.025,.18,0xe2bd7d);
  }
  root.add(v.build({detailShadows:false}));
  const board=signBoard('Mothlight Village','the lantern road',2.55);board.position.set(G.x,3.05,G.z+.06);root.add(board);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(2.6,3.5,1.2),new THREE.MeshBasicMaterial({visible:false}));hit.position.set(G.x,1.75,G.z);hit.userData={type:'village'};root.add(hit);
  return {root,hit};
}
