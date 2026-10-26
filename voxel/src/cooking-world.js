import * as THREE from 'three';
import { Voxels,seeded } from './voxels.js';
import { buildGround,grounds } from './ground.js';
import { COL } from './world.js';
import { buildFoodProp,disposeFoodProp } from './food-props.js';
import { COOKING_SITE as SITE,COOKING_SERVICE_ROUTE as ROUTE,cookingDeliveryPose } from './content/cooking-layout.js';
export { COOKING_SITE,COOKING_SERVICE_ROUTE,cookingDeliveryPose } from './content/cooking-layout.js';
const C={body:0x51334b,panel:0x684156,wood:0x6c4937,trim:0xc58e50,dark:0x241e29,cream:0xe8d2a5,metal:0x7b7775,amber:0xffb956,stone:0x736775};
const b=(v,x,y,z,w,h,d,c,glow=false)=>v.block(x,y,z,w,h,d,c,glow);
function pumpkin(v,x,y,z,s=.2){for(const [dx,dz]of [[0,0],[-.06,0],[.06,0],[0,-.05],[0,.05]])b(v,x+dx,y,z+dz,s,.19,s,0xc97431);b(v,x,y+.19,z,.045,.08,.04,0x79694a);}
function buildPad(){
  const root=new THREE.Group(),v=new Voxels(),r=seeded(447),land=SITE.pavingBounds;
  root.name='Midnight Kitchen continuous farm cobbles';
  // The original height-field ends at x40. Continue its exact palette, stone
  // scale and world-coordinate seed, without laying a second surface over it.
  const apron=buildGround(land,(x,z)=>{
    const right=land.x1-.48+Math.sin(z*3.7)*.13;
    const front=land.z1-.36+Math.sin(x*4.1)*.14;
    const back=land.z0+.23+Math.sin(x*3.3)*.12;
    const feather=x>right||z>front||z<back&&x>41;
    return feather?grounds.grass(x,z):grounds.cobble(x,z,COL.yard,.3,2,0x2a2430);
  },{farmView:true});
  apron.name='Kitchen apron · matching farm ground';root.add(apron);
  // Only the part outside the old yard needs a new receiving road. Its cobbles
  // use the same recipe as all public paths, with leaf-strewn soft shoulders.
  const lane=buildGround({x0:38.1,x1:39.5,z0:-7,z1:-1},(x,z)=>{
    const edge=Math.abs(x-ROUTE.x)>.59+Math.sin(z*3)*.04;
    return edge?grounds.grass(x,z):grounds.cobble(x,z,COL.stone,.42,1,0x2a2430);
  },{farmView:true});lane.name='Kitchen north receiving road';root.add(lane);
  // The walking apron reaches z7.5 and the existing public route at z6.6.
  // Keep all planting beside it; no kerbs or chunky platform edges.
  for(const x of [40.1,45.8]){b(v,x,.02,5.0,.5,.3,.55,0x453b35);b(v,x,.32,5.0,.58,.08,.6,C.trim);for(let j=0;j<4;j++)b(v,x+(r()-.5)*.4,.4+r()*.2,5+(r()-.5)*.3,.17,.14,.18,[0x85422d,0xb2702e,0x53445a][j%3]);}
  root.add(v.build());return root;
}
function wheel(v,x,y,z){b(v,x,y,z,.25,.56,.56,C.dark);b(v,x,y+.07,z,.28,.4,.4,0x49424a);b(v,x,y+.17,z,.3,.2,.2,C.metal);}
function buildTruck(signBoard){
  const v=new Voxels(),root=new THREE.Group(),t=SITE.truck;
  b(v,0,.48,0,4.5,.22,2.6,C.dark);b(v,0,.7,0,4.4,.2,2.5,C.wood);
  for(const x of [-2.1,2.1])for(const z of [-.82,.82])wheel(v,x,.08,z);
  // Rear and ends form a sealed shell; public serving window faces the camera.
  b(v,0,.9,-1.22,4.4,1.86,.14,C.body);
  for(const x of [-2.15,2.15])b(v,x,.9,0,.16,1.86,2.45,C.panel);
  b(v,0,.9,1.22,4.4,.82,.14,C.body);
  for(const x of [-2.06,2.06])b(v,x,1.72,1.22,.26,1.04,.15,C.panel);
  b(v,0,2.63,1.22,4.35,.14,.18,C.trim);
  b(v,0,1.68,1.37,4.45,.14,.6,C.wood);b(v,0,1.82,1.5,4.35,.055,.33,C.trim);
  for(const x of [-1.9,1.9])b(v,x,.89,1.31,.08,.75,.04,C.trim);
  for(let x=-1.8;x<1.85;x+=.18)b(v,x,1.01,1.31,.035,.46,.028,0x795667);
  // Shingled pitched canopy and alternating small scallops, below sign.
  for(let i=0;i<8;i++)b(v,0,2.78+(.8-Math.abs(-.7+i*.2))*.2,-.7+i*.2,4.65,.1,.23,i%2?0x412c45:0x493049);
  for(let x=-2.25;x<2.25;x+=.3){b(v,x+.15,2.73,1.43,.29,.1,.5,Math.round((x+2.25)/.3)%2?C.trim:C.body);b(v,x+.15,2.59,1.67,.28,.14,.09,Math.round((x+2.25)/.3)%2?C.trim:C.body);}
  // Service shelves, open oven, copper pans and ingredients are real geometry.
  b(v,0,1.7,-.98,3.85,.12,.4,C.wood);b(v,0,2.35,-1.06,3.85,.08,.3,C.trim);
  for(let i=0;i<8;i++){const x=-1.45+i*.4;b(v,x,1.83,-.95,.21,.31,.19,[0x9b5d38,0x727945,0x825976][i%3]);b(v,x,2.14,-.95,.23,.04,.2,C.trim);b(v,x,1.9,-.84,.11,.1,.02,C.cream);}
  b(v,-1.3,.88,-.25,1.04,.78,.78,C.metal);b(v,-1.3,1.0,.16,.73,.4,.04,C.dark);b(v,-1.3,1.05,.185,.58,.09,.025,0xb56030,true);b(v,-1.3,1.68,-.25,1.1,.07,.82,C.dark);
  for(const x of [-1.55,-1.08]){b(v,x,1.75,-.25,.3,.23,.31,0xb77941);b(v,x,1.98,-.25,.34,.04,.35,0xd5aa6d);b(v,x,2.02,-.25,.08,.04,.08,C.dark);}
  b(v,1.31,1.83,1.33,.55,.22,.32,0x574650);b(v,1.31,2.05,1.33,.45,.08,.3,C.metal);b(v,1.31,2.13,1.33,.36,.17,.16,0x344044);for(let i=0;i<4;i++)b(v,1.2+i*.075,2.15,1.42,.035,.04,.02,C.cream);
  pumpkin(v,-1.8,1.83,1.35,.2);b(v,1.8,2.15,1.29,.13,.3,.15,C.trim);b(v,1.8,2.45,1.29,.12,.13,.14,C.amber,true);
  // Chimney stays at the back, clear of the label and service window.
  b(v,-1.3,2.96,-.75,.32,.55,.34,C.metal);b(v,-1.3,3.51,-.75,.47,.08,.47,C.dark);
  root.add(v.build());root.position.set(t.x,0,t.z);root.name='The Midnight Kitchen · food truck';
  if(signBoard){const sign=signBoard('Midnight Kitchen','farm ingredients · freshly cooked',3.8);sign.position.set(0,3.22,1.1);sign.userData={type:'food-truck'};root.add(sign);}
  const f=buildFoodProp('wedges',{scale:.65});f.position.set(-.35,1.83,1.4);root.add(f);
  return root;
}
function buildCart(){
  const v=new Voxels(),root=new THREE.Group(),wheels=[];
  b(v,0,.43,0,1.03,.12,1.15,C.dark);b(v,0,.55,0,.95,.09,1.05,C.wood);
  for(const x of [-.48,.48])for(const z of [-.35,.35]){const w=new Voxels();b(w,0,0,0,.17,.38,.38,C.dark);b(w,0,.1,0,.19,.17,.17,C.trim);const g=w.build();g.position.set(x,.12,z);root.add(g);wheels.push(g);}
  for(const z of [-.5,.5])for(let y=.64;y<1.02;y+=.14)b(v,0,y,z,1.0,.1,.07,C.wood);
  for(const x of [-.46,.46])for(let y=.64;y<1.02;y+=.14)b(v,x,y,0,.07,.1,.95,C.wood);
  for(const x of [-.26,.24]){b(v,x,.67,0,.41,.43,.55,0xa98a55);for(const z of [-.2,.2])b(v,x,.7,z,.42,.04,.035,0x6d5138);b(v,x,1.1,0,.43,.04,.58,0xc2a36e);b(v,x,1.15,0,.26,.02,.26,C.cream);}
  // Small enchanted brass tiller, rather than a second human character.
  b(v,0,.5,-.66,.16,.12,.4,C.trim);b(v,0,.62,-.8,.12,.65,.12,C.trim);b(v,0,1.27,-.8,.55,.08,.1,C.dark);b(v,0,1.18,-.81,.14,.08,.08,0xd7b774,true);
  root.add(v.build());root.name='Timed ingredient delivery cart';return{root,wheels};
}
function buildChef(){
  const v=new Voxels();b(v,0,0,0,.55,.13,.32,0x93a9a1);for(let i=0;i<4;i++)b(v,0,.1+i*.18,0,.48-i*.04,.19,.31,0xc3d2c6);
  b(v,0,.82,0,.4,.42,.34,0xa9c9b7);b(v,0,.93,.19,.3,.13,.035,0x809b8b);
  for(const x of [-.09,.09])b(v,x,1.09,.19,.045,.055,.025,0xd2dd85,true);
  b(v,0,1.24,0,.47,.13,.4,0xe7e5d3);for(const x of [-.14,0,.14])b(v,x,1.37,0,.19,.18,.37,0xe7e5d3);
  for(const x of [-.33,.33])b(v,x,.54,.1,.18,.16,.4,0xa9c9b7);
  b(v,0,.45,.18,.28,.31,.04,0xf2dfbc);b(v,0,.76,.18,.25,.06,.045,0x71495b);
  return v.build();
}
function openReceivingGate(world){
  const root=world?.group??world;if(!root?.traverse)return 0;
  const matrix=new THREE.Matrix4(),color=new THREE.Color(),r=SITE.gate;let removed=0;
  // Exact source boxes remain identifiable after another purchased attraction
  // compacts this same instanced mesh. Original array offsets alone do not.
  const treeKeys=new Set((world?.serviceTrees??[]).flatMap(tree=>(tree.boxes??[]).map(a=>[a[0],a[1],a[2],a[3],a[4],a[5]].map(Math.fround).join('|'))));
  root.traverse(m=>{if(!m.isInstancedMesh)return;let j=0;for(let i=0;i<m.count;i++){
    m.getMatrixAt(i,matrix);const a=matrix.elements,x=a[12],z=a[14],top=a[13]+Math.abs(a[5])/2,w=Math.abs(a[0]),d=Math.abs(a[10]);
    const tree= m===world?.serviceTreeMesh&&treeKeys.has([a[12],a[13],a[14],Math.abs(a[0]),Math.abs(a[5]),Math.abs(a[10])].join('|'));
    if(tree||top>.3&&x+w/2>r.x0&&x-w/2<r.x1&&z+d/2>r.z0&&z-d/2<r.z1){removed++;continue;}
    m.setMatrixAt(j,matrix);if(m.instanceColor){m.getColorAt(i,color);m.setColorAt(j,color);}j++;
  }m.count=j;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingBox();m.computeBoundingSphere();});return removed;
}
function removeOwned(group){disposeFoodProp(group);}
export function createCookingWorld({scene,state,signBoard,lamps=[],world=null}){
  const root=new THREE.Group();root.name='Cooking service area';scene.add(root);
  const marker=signBoard?.('Midnight Kitchen','level 5 · food truck plot',3.6)??new THREE.Group();marker.position.set(SITE.marker.x,1.6,SITE.marker.z);marker.userData={type:'food-truck'};root.add(marker);
  const hit=new THREE.Mesh(new THREE.BoxGeometry(SITE.truck.w,3.5,3.3),new THREE.MeshBasicMaterial({visible:false}));hit.position.set(SITE.truck.x,1.75,SITE.truck.z+.25);hit.userData={type:'food-truck'};root.add(hit);
  const lamp={x:44.55,y:2.51,z:4.09,active:false};lamps.push(lamp);
  let built=false,pad=null,truck=null,cart=null,chef=null,steam=[],cleared=0;
  function sync(){
    const purchased=!!state.kitchen?.purchased;marker.visible=!purchased;hit.visible=purchased;lamp.active=purchased;
    if(!purchased){if(pad)pad.visible=false;if(truck)truck.visible=false;if(cart)cart.root.visible=false;if(chef)chef.visible=false;return;}
    if(!built){built=true;cleared=openReceivingGate(world);pad=buildPad();truck=buildTruck(signBoard);cart=buildCart();chef=buildChef();chef.position.set(43.5,1.12,2.95);root.add(pad,truck,cart.root,chef);for(let i=0;i<3;i++){const vapor=new Voxels();b(vapor,0,0,0,.12,.09,.1,0xa2a2ab);b(vapor,.07,.05,0,.1,.09,.09,0xa2a2ab);const cloud=vapor.build({shadows:false});root.add(cloud);steam.push(cloud);}}
    pad.visible=truck.visible=true;chef.visible=(state.kitchen?.upgrades?.chef??0)>0;
    const p=cookingDeliveryPose(state);cart.root.visible=p.visible;cart.root.position.set(p.x,.02,p.z);cart.root.rotation.y=p.yaw;
    for(const wheel of cart.wheels)wheel.rotation.x=p.distance/.19;
  }
  function tick(time=state.time??0){sync();if(!built)return;const t=Number.isFinite(time)?time:state.time??0;chef.position.y=1.12+Math.sin(t*1.6)*.045;chef.rotation.y=Math.sin(t*.7)*.09;for(let i=0;i<steam.length;i++){const p=((t*.33+i/3)%1+1)%1;steam[i].visible=!!state.kitchen?.purchased&&!!state.kitchen?.jobs?.truck;steam[i].position.set(41.45+Math.sin(p*3+i)*.06,3.58+p*.55,2.05);steam[i].scale.setScalar(.6+p*.7);}}
  sync();return{root,sync,tick,focus:SITE.focus,get pickables(){return state.kitchen?.purchased?[hit]:[marker];},
    get status(){const p=cookingDeliveryPose(state);let boxes=0;root.traverse(m=>{if(m.isInstancedMesh)boxes+=m.count;});return{purchased:!!state.kitchen?.purchased,built,bounds:SITE.bounds,route:ROUTE.bounds,receiverPoint:SITE.receiver,cart:p,chefVisible:!!chef?.visible,boxes,cleared,lights:0};},
    dispose(){lamp.active=false;const i=lamps.indexOf(lamp);if(i>=0)lamps.splice(i,1);removeOwned(root);}};
}
