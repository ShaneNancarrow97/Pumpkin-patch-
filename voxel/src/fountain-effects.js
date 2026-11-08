import * as THREE from 'three';

// One shared five-point solid star, with no extra lights or per-frame geometry.
const shape=new THREE.Shape();
for(let i=0;i<10;i++){const a=i*Math.PI/5,r=i%2?.075:.17,x=Math.sin(a)*r,y=Math.cos(a)*r;if(!i)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath();
const geometry=new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:false});
const material=new THREE.MeshBasicMaterial({color:0xffd776,toneMapped:false});
export function fountainStar(){const m=new THREE.Mesh(geometry,material);m.visible=false;m.name='Fountain pumpkin star';return m;}

// Three bounded bursts can overlap; ten small pumpkins arc from each picked crop.
export function createFountainBursts(scene,template){
  const slots=Array.from({length:3},()=>({age:2,parts:[],variety:null,x:0,z:0}));
  return {
    burst(x,z,variety){const slot=slots.find(s=>s.age>=1.15)??slots.reduce((a,b)=>a.age>b.age?a:b);if(slot.variety!==variety){for(const p of slot.parts){scene.remove(p);p.traverse(o=>{if(o.isInstancedMesh)o.dispose?.();});}slot.parts=Array.from({length:10},()=>{const m=template(variety,.15).clone();m.visible=false;scene.add(m);return m;});slot.variety=variety;}slot.x=x;slot.z=z;slot.age=0;},
    tick(dt){for(const s of slots){s.age+=dt;for(let i=0;i<s.parts.length;i++){const m=s.parts[i];m.visible=s.age<1.15;if(!m.visible)continue;const t=s.age/1.15,a=i*Math.PI*2/10,r=.2+t*(.65+(i%3)*.15);m.position.set(s.x+Math.cos(a)*r,.3+Math.sin(t*Math.PI)*(1+(i%3)*.18),s.z+Math.sin(a)*r);m.scale.setScalar(1-t*.7);m.rotation.y=a+t*2;}}},
    get active(){return slots.filter(s=>s.age<1.15).length;}
  };
}
