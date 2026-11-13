// Persistent resource batches. Cooldowns and growth stay in the pure rules;
// cached local prototypes only change the matrices uploaded to these two meshes.
import * as THREE from 'three';
import { Voxels, seeded } from './voxels.js';
import { frame, node } from './village-models.js';
import { cursedFungusGrowth } from './village-blight.js';

export const RESOURCE_DETAIL_LIMIT = 8;
const hash=text=>{let n=307;for(const c of text)n=(Math.imul(n,31)+c.charCodeAt(0))>>>0;return n;};

export function createVillageResourceLayer({ nodes, positionOf, growthOf, groundAt=()=>0, scale=1.5 }={}) {
  const group=new THREE.Group();group.name='Village resource growth';
  const prototypes=new Map(),entries=nodes.map(n=>({node:n,id:n.id,x:n.x,z:n.z,stage:'bare',visible:false,cycle:0,scale:n.scale??1,detail:false,draw:false}));
  function prototype(entry,stage,detailed){
    const blighted=entry.node.kind==='blight',variant=blighted?hash(entry.id)%4:entry.id;
    const key=`${entry.node.material}:${stage}:${detailed?1:0}:${variant}`;
    if(prototypes.has(key))return prototypes.get(key);
    const v=new Voxels(),f=frame(v,0,0),random=seeded(blighted?51+Number(variant)*701:hash(entry.id));
    if(blighted)cursedFungusGrowth(f,stage,random,detailed);else if(stage==='mature')node(f,entry.node.material,true,random);
    const value={solid:v.solid,glow:v.glow};prototypes.set(key,value);return value;
  }
  let solids=0,glows=0;
  for(const e of entries){const p=prototype(e,'mature',true);solids+=p.solid.length;glows+=Math.max(3,p.glow.length);}
  const geometry=new THREE.BoxGeometry(1,1,1),lit=new THREE.MeshStandardMaterial({roughness:.92,metalness:0});
  const glow=new THREE.MeshBasicMaterial({toneMapped:false,color:new THREE.Color(1.6,1.6,1.6)});
  const solidMesh=new THREE.InstancedMesh(geometry,lit,Math.max(1,solids)),glowMesh=new THREE.InstancedMesh(geometry,glow,Math.max(1,glows));
  for(const mesh of [solidMesh,glowMesh]){mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(mesh);}
  solidMesh.castShadow=solidMesh.receiveShadow=true;
  const transform=new THREE.Object3D(),colour=new THREE.Color(),near=new Int16Array(RESOURCE_DETAIL_LIMIT),distances=new Float64Array(RESOURCE_DETAIL_LIMIT);
  const lastCamera=new THREE.Vector3(Infinity,Infinity,Infinity);
  let age=.25,dirty=true,disposed=false,uploads=0,detailCount=0,visibleCount=0;
  function sample(){
    for(const e of entries){
      const p=positionOf(e.node),g=growthOf(e.id);if(!p||!g)continue;
      const nodeScale=Number.isFinite(g.scale)&&g.scale>0?g.scale:1;
      const changed=e.x!==p.x||e.z!==p.z||e.stage!==g.stage||e.visible!==g.visible||e.scale!==nodeScale;
      e.x=p.x;e.z=p.z;e.stage=g.stage;e.visible=!!g.visible;e.cycle=g.cycle;e.scale=nodeScale;
      if(changed)dirty=true;
    }
  }
  function select(camera){
    near.fill(-1);distances.fill(24*24);
    for(let i=0;i<entries.length;i++){
      const e=entries[i];if(!e.visible||e.stage!=='mature'||e.node.kind!=='blight')continue;
      const d=(e.x-camera.x)**2+(-e.z-camera.z)**2;
      for(let n=0;n<near.length;n++)if(d<distances[n]){for(let j=near.length-1;j>n;j--){distances[j]=distances[j-1];near[j]=near[j-1];}distances[n]=d;near[n]=i;break;}
    }
    detailCount=0;
    for(let i=0;i<entries.length;i++){
      const e=entries[i],detail=e.node.kind!=='blight'||near.includes(i),draw=e.visible&&e.stage!=='bare'&&(e.x-camera.x)**2+(-e.z-camera.z)**2<90*90;
      if(e.detail!==detail||e.draw!==draw)dirty=true;e.detail=detail;e.draw=draw;
      if(draw&&detail&&e.node.kind==='blight'&&e.stage==='mature')detailCount++;
    }
  }
  function upload(){
    let solidAt=0,glowAt=0;visibleCount=0;
    for(const e of entries){
      if(!e.draw)continue;visibleCount++;
      const p=prototype(e,e.stage,e.detail),s=scale*e.scale,y=groundAt(e.x,e.z),turn=((Math.round((e.x+e.z)/scale)%4)+4)%4*Math.PI/2,c=Math.cos(turn),sn=Math.sin(turn);
      const write=(list,mesh,start)=>{
        let at=start;
        for(const [x,by,z,w,h,d,tone]of list){
          transform.position.set(e.x+(x*c+z*sn)*s,y+by*s,-e.z+(-x*sn+z*c)*s);transform.rotation.set(0,turn,0);transform.scale.set(w*s,h*s,d*s);transform.updateMatrix();
          mesh.setMatrixAt(at,transform.matrix);mesh.setColorAt(at,colour.setHex(tone));at++;
        }
        return at;
      };
      solidAt=write(p.solid,solidMesh,solidAt);glowAt=write(p.glow,glowMesh,glowAt);
    }
    solidMesh.count=solidAt;glowMesh.count=glowAt;
    for(const mesh of [solidMesh,glowMesh]){mesh.visible=mesh.count>0;if(mesh.count){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);mesh.instanceColor.needsUpdate=true;}}
    group.userData.resourceSites=entries.filter(e=>e.visible&&e.stage==='mature').map(e=>({id:e.id,x:e.x,z:e.z}));
    group.userData.blightSites=entries.filter(e=>e.visible&&e.stage!=='bare'&&e.node.kind==='blight').map(e=>({id:e.id,x:e.x,z:e.z,stage:e.stage,scale:e.scale}));
    uploads++;dirty=false;
  }
  return {
    group,
    sync(){if(!disposed)sample();},
    tick(dt,camera,visible=true){
      if(disposed)return;group.visible=!!visible;if(!visible||!camera)return;
      age+=Math.max(0,Number(dt)||0);
      if(age>=.25){age=0;sample();}
      if(dirty||lastCamera.distanceToSquared(camera)>4){select(camera);lastCamera.copy(camera);}
      if(dirty)upload();
    },
    dispose(){if(disposed)return;disposed=true;for(const mesh of [solidMesh,glowMesh]){group.remove(mesh);mesh.dispose();mesh.count=0;}geometry.dispose();lit.dispose();glow.dispose();prototypes.clear();group.visible=false;},
    get stats(){return{patches:visibleCount,detailed:detailCount,detailLimit:RESOURCE_DETAIL_LIMIT,solidBoxes:solidMesh.count,glowBoxes:glowMesh.count,prototypeCount:prototypes.size,uploads,meshCount:2,addedLights:0,disposed};},
  };
}
