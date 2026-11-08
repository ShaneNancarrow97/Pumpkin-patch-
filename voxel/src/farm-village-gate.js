import * as THREE from 'three';
import { Voxels } from './voxels.js';
import { VILLAGE_GATEWAY as G } from './content/village-gateway.js';

// A single dressed timber arch reads as a doorway, with the board fixed to its lintel.
// The continuous approach is part of yardGround, so there are no raised stepping slabs.
export function buildVillageGateway(signBoard) {
  const root=new THREE.Group(),v=new Voxels();root.name='Mothlight village road';
  const oak=0x533c37,dark=0x302631,trim=0xb18a59,stone=0x8c8094;
  for(const side of [-1,1]){
    const x=G.x+side*1.18;
    v.block(x,.04,G.z,.46,.2,.55,stone);v.block(x,.24,G.z,.35,.15,.42,0x6c6276);
    v.block(x,.39,G.z,.25,3.13,.29,dark);
    v.block(x-side*.055,.48,G.z+.15,.065,2.92,.03,oak);
    for(const y of [.62,2.95,3.43])v.block(x,y,G.z,.34,.09,.38,trim);
    // Small iron lanterns hang outwards, away from the walking opening.
    const lx=x+side*.23;
    v.block(x+side*.12,2.68,G.z+.13,.3,.055,.07,dark);
    v.block(lx,2.28,G.z+.15,.28,.06,.27,dark);
    v.block(lx,2.34,G.z+.15,.2,.28,.2,0xffc47a,true);
    v.block(lx,2.62,G.z+.15,.3,.07,.29,dark);
    for(const dx of [-.1,.1])v.block(lx+dx,2.34,G.z+.255,.027,.28,.027,dark);
    // A low clipped hedge frames each outer foot; nothing fills the centre.
    for(let i=0;i<3;i++){
      const hx=x+side*(.25+i*.11),hz=G.z-.44-i*.16;
      v.block(hx,.1,hz,.33,.57,.36,0x354331);v.block(hx,.67,hz,.36,.13,.38,0x586445);
    }
  }
  v.block(G.x,3.5,G.z,2.78,.2,.39,oak);
  v.block(G.x,3.69,G.z,2.93,.085,.43,dark);
  for(const side of [-1,1])for(let i=0;i<4;i++)v.block(G.x+side*(1.03-i*.12),3.09+i*.1,G.z,.16,.16,.24,oak);
  // A little brass moth at the crown, matching the village's own emblem.
  v.block(G.x,3.85,G.z,.055,.25,.1,trim);
  for(const side of [-1,1]){v.block(G.x+side*.12,3.92,G.z,.2,.13,.09,trim);v.block(G.x+side*.085,3.82,G.z,.13,.11,.09,0xd8bd83);}
  root.add(v.build({detailShadows:false}));
  const board=signBoard('Mothlight Village','follow the lanterns',2.55);board.position.set(G.x,3.35,G.z+.24);root.add(board);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(2.6,3.8,1.05),new THREE.MeshBasicMaterial({visible:false}));
  hit.position.set(G.x,1.9,G.z);hit.userData={type:'village'};root.add(hit);
  root.userData.gateway={x:G.x,z:G.z,approach:{...G.approach},clearance:{...G.clearance},lane:G.lane.map(p=>[...p])};
  return {root,hit};
}
