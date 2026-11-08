import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Matrix4 } from 'three';
import { VILLAGE_GATEWAY as G, atVillageGateway, villageGatewayPathDistance } from '../src/content/village-gateway.js';
import { buildVillageGateway } from '../src/farm-village-gate.js';
import { farmPlayerGeometry, playerPointFree, slidePlayer } from '../src/player-control.js';
import { inFarmPatch, fieldDepth, farmPathEnd } from '../src/content/farm-layout.js';
import { COOKING_SITE } from '../src/content/cooking-layout.js';
import { MEADOW, cocoaKioskWidth } from '../src/content/festival-meadow.js';
import { yardGround, buildWorld, COL } from '../src/world.js';
import { grounds, G as CELL } from '../src/ground.js';

const state=(plots=0,kitchen=false,meadow=false,cocoa=0)=>({upgrades:{plots},kitchen:{purchased:kitchen},festival:{meadow,cocoa:{level:cocoa}}});
function samples(){const list=[];for(let i=1;i<G.lane.length;i++){const [ax,az]=G.lane[i-1],[bx,bz]=G.lane[i],count=Math.ceil(Math.hypot(bx-ax,bz-az)/.15);for(let j=0;j<=count;j++)list.push({x:ax+(bx-ax)*j/count,z:az+(bz-az)*j/count});}return list;}

test('the permanent lantern-road spur stays walkable through every farm expansion and service purchase',()=>{
 for(const plots of [0,1,2,3,4])for(const kitchen of [false,true])for(const meadow of [false,true])for(const cocoa of [0,1,3,5]){
  const s=state(plots,kitchen,meadow,cocoa),geometry=farmPlayerGeometry(s),label=JSON.stringify({plots,kitchen,meadow,cocoa});
  for(const p of samples()){
   assert.equal(playerPointFree(p.x,p.z,geometry.bounds,geometry.obstacles),true,label+' approach');
   assert.equal(inFarmPatch(p.x,p.z,plots),false,label+' off the pumpkin beds');
   assert.ok(villageGatewayPathDistance(p.x,p.z)<1e-8);
  }
  assert.equal(playerPointFree(G.x,G.z,geometry.bounds,geometry.obstacles),true,label+' trigger');
  const walked=slidePlayer(G.approach,0,G.z-G.approach.z,geometry.bounds,geometry.obstacles);
  assert.equal(atVillageGateway(walked),true,label+' actual northward crossing');
 }
 const c=G.clearance;
 assert.ok(c.z0>COOKING_SITE.bounds.z1+6,'entry separated from Maisie’s receiving lane');
 assert.ok(c.x1<MEADOW.stand[0]-cocoaKioskWidth(5)/2,'premium cocoa frontage cannot swallow the entry');
});

test('gateway geometry, sign, picking target and travel trigger share one plan',()=>{
 let sign;
 const build=buildVillageGateway((title,sub,width)=>{sign=new Group();sign.userData={title,sub,width};return sign;});
 assert.equal(sign.userData.title,'Mothlight Village');assert.equal(sign.position.x,G.x);assert.equal(sign.position.z,G.z+.24);
 assert.equal(build.hit.position.x,G.x);assert.equal(build.hit.position.z,G.z);assert.equal(build.hit.userData.type,'village');
 assert.deepEqual(build.root.userData.gateway.approach,G.approach);
 assert.equal(atVillageGateway({x:G.x,z:G.z}),true);assert.equal(atVillageGateway(G.approach),false);
 assert.equal(atVillageGateway({x:NaN,z:G.z}),false);assert.equal(atVillageGateway({x:G.x,z:Infinity}),false);
 let boxes=0,lights=0;const matrix=new Matrix4();
 build.root.traverse(o=>{if(o.isLight)lights++;if(o.isInstancedMesh){boxes+=o.count;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));assert.ok(matrix.determinant()>0);const e=matrix.elements,y0=e[13]-e[5]/2,y1=e[13]+e[5]/2;
   if(y0<2.3&&y1>.1){const dx=Math.max(Math.abs(G.x-e[12])-e[0]/2,0),dz=Math.max(Math.abs(G.z-e[14])-e[10]/2,0);assert.ok(Math.hypot(dx,dz)>.25,'walking opening remains clear');}
  }}});
 assert.ok(boxes<=80);assert.equal(lights,0);
});

test('the spur is part of the existing farm cobbles on both original and fully purchased ground',()=>{
 for(const [plots,width,meadow] of [[0,40,false],[4,54,true]]){
  const s=state(plots,true,meadow,5),depth=fieldDepth(s),ground=yardGround({width,depth,plotsTier:plots,pathEnd:farmPathEnd(s)}),map=ground.material.map.image;
  for(const p of samples()){
   const i=Math.floor((p.x+8)/CELL),j=Math.floor((p.z+1)/CELL),x=-8+(i+.5)*CELL,z=-1+(j+.5)*CELL,k=(j*map.width+i)*4;
   const [,colour]=grounds.cobble(x,z,COL.stone,.42,1,0x2a2430);
   assert.deepEqual(Array.from(map.data.slice(k,k+4)),[(colour>>16)&255,(colour>>8)&255,colour&255,0],'same stones/grout and zero grass mask');
  }
  ground.geometry.dispose();ground.material.map.dispose();ground.material.dispose();
 }
});


test('the actual farm voxel dressing leaves the lantern-road forecourt empty',()=>{
 const world=buildWorld(),matrix=new Matrix4();let checked=0;
 world.group.traverse(o=>{if(!o.isInstancedMesh)return;for(let i=0;i<o.count;i++){
  o.getMatrixAt(i,matrix);const e=matrix.elements,x=e[12],y=e[13],z=e[14],hx=Math.abs(e[0])/2,hy=Math.abs(e[5])/2,hz=Math.abs(e[10])/2;
  if(y+hy>.2){assert.equal(x+hx>36.85&&x-hx<38.7&&z+hz>13.4&&z-hz<18,false,'no lantern, pumpkin, trunk or leaf box blocks the entry');checked++;}
 }});assert.ok(checked>1000,'audits the real whole-farm voxel batches');
});
