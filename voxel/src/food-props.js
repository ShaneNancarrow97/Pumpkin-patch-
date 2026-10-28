import * as THREE from 'three';
import { Voxels } from './voxels.js';

const C={plate:0xd7c8b2,edge:0x8d6944,cream:0xf0ddbc,brown:0x593026,orange:0xdc8833,green:0x6e8850,purple:0x794a8d};
const b=(v,x,y,z,w,h,d,c,glow=false)=>v.block(x,y,z,w,h,d,c,glow);
function plate(v){b(v,0,0,0,.82,.045,.62,C.edge);b(v,0,.045,0,.75,.025,.55,C.plate);}
function jar(v,c){b(v,0,.04,0,.45,.56,.4,c);b(v,0,.6,0,.49,.055,.44,C.edge);b(v,0,.25,.212,.28,.19,.012,C.cream);b(v,0,.29,.224,.08,.08,.012,C.orange);b(v,-.13,.12,.215,.04,.37,.015,0xcba66c);}
function vegetables(v,y=.17){
  for(const [x,z,c]of [[-.2,-.09,0xc87535],[.17,.09,0x70924e],[-.12,.13,0xc3ac5f],[.2,-.12,0xbd6c31],[.02,-.02,0x6d8548]]){
    b(v,x,y,z,.12,.07,.1,c);b(v,x-.025,y+.07,z,.055,.02,.04,0x829b52);b(v,x+.035,y+.075,z+.02,.025,.02,.055,0x547341);
  }
}
function food(v,id){
  if(id==='pumpkin-jam'){jar(v,0x9e4b29);return;}
  plate(v);
  if(id==='wedges'){
    for(let i=0;i<5;i++){const x=-.24+i*.12;b(v,x,.075,Math.sin(i*2)*.13,.1,.12+(i%2)*.04,.31,C.orange);b(v,x,.08,Math.sin(i*2)*.13-.12,.1,.1,.055,0x9e5728);for(let j=0;j<2;j++)b(v,x+(j-.5)*.035,.2,Math.sin(i*2)*.13+j*.05,.025,.018,.03,C.green);}
  }else if(id==='soup'){
    b(v,0,.07,0,.55,.29,.43,0x514331);b(v,0,.36,0,.61,.05,.49,C.cream);b(v,0,.39,0,.48,.015,.36,0xc76c2d);for(const x of [-.1,.08])b(v,x,.405,.02,.07,.018,.055,C.cream);b(v,.28,.12,0,.13,.17,.17,C.edge);
  }else if(id==='toffee-apples'){
    for(const x of [-.19,.19]){b(v,x,.08,0,.3,.26,.32,0xa83b2c);b(v,x,.14,0,.35,.15,.27,0xa83b2c);b(v,x,.34,0,.03,.35,.03,C.edge);b(v,x-.07,.22,.15,.055,.09,.022,0xe19858);}
  }else if(id==='ghost-cookies'){
    for(const x of [-.2,.2]){b(v,x,.08,0,.27,.055,.34,0xb5834e);b(v,x,.135,-.035,.22,.025,.27,C.cream);for(const dx of [-.05,.05])b(v,x+dx,.16,-.065,.03,.008,.035,C.brown);for(const dx of [-.08,0,.08])b(v,x+dx,.135,.12,.06,.025,.08,C.cream);}
  }else if(id==='cocoa-brownies'){
    for(const x of [-.2,.2]){b(v,x,.08,0,.32,.19,.37,C.brown);b(v,x,.27,0,.32,.025,.37,0x351e25);for(const z of [-.1,.08])b(v,x-.045,.295,z,.065,.025,.055,0xd3a77a);}
  }else if(id==='moonlight-tart'){
    b(v,0,.08,0,.62,.15,.44,0xb48452);b(v,0,.23,0,.54,.05,.36,C.purple);for(let i=0;i<5;i++)b(v,-.21+i*.105,.28,Math.sin(i*1.8)*.1,.08,.035,.08,0xa1b6d7);b(v,.12,.315,-.06,.09,.02,.1,C.cream);
  }else if(id==='garden-skillet'){
    b(v,0,.07,0,.61,.07,.43,0x3f3e3d);b(v,0,.14,0,.56,.035,.38,0x57452e);
    b(v,.38,.11,0,.25,.045,.09,0x3f3e3d);b(v,.52,.11,0,.07,.055,.12,C.edge);vegetables(v,.175);
  }else if(id==='harvest-broth'){
    b(v,0,.07,0,.55,.27,.43,0x72675b);b(v,0,.34,0,.6,.055,.48,C.cream);
    b(v,0,.395,0,.48,.012,.35,0x9b6e3d);vegetables(v,.408);
    for(const x of [-.31,.31])b(v,x,.17,0,.1,.09,.17,C.edge);
  }else if(id==='spiced-roast'){
    b(v,0,.07,-.03,.47,.11,.3,0x6b382a);b(v,0,.18,-.03,.39,.045,.25,0x9f5730);
    for(const x of [-.13,0,.13]){b(v,x,.225,-.03,.03,.012,.23,0xc89253);b(v,x+.035,.23,-.06,.018,.012,.035,0x645236);}
    for(const x of [-.27,.27])for(const z of [-.13,.12])b(v,x,.08,z,.1,.09,.11,[0xb66c2e,0x72834b][z>0?1:0]);
    for(let i=0;i<6;i++)b(v,-.15+i*.06,.243,(i%2-.5)*.13,.018,.012,.025,0x664f32);
  }else if(id==='moonfire-chicken'){
    for(const x of [-.16,.16]){b(v,x,.08,-.015,.21,.1,.31,0xb9874d);b(v,x,.18,-.015,.17,.055,.27,0xdbb66e);b(v,x,.235,.08,.09,.025,.07,C.cream);}
    for(const x of [-.27,0,.27]){b(v,x,.08,.2,.09,.06,.08,C.green);b(v,x-.025,.14,.2,.035,.025,.04,0x8ca15c);}
    for(const x of [-.15,.12])b(v,x,.245,-.075,.035,.012,.035,0x587248);
    for(let i=0;i<6;i++)b(v,-.21+i*.08,.25,(i%2-.5)*.12,.035,.012,.03,0xb7a16c);
  }else if(id==='haunted-pie'){
    b(v,0,.08,0,.62,.14,.45,0x9b6b3a);b(v,0,.22,0,.55,.035,.38,0x6b422e);
    for(const x of [-.23,-.115,0,.115,.23])b(v,x,.255,0,.045,.035,.41,0xddb76f);
    for(const z of [-.14,0,.14])b(v,0,.29,z,.58,.025,.035,0xd6a960);
    for(const x of [-.28,.28])b(v,x,.23,0,.04,.055,.42,0xe5bf7e);
    for(const z of [-.2,.2])for(let i=0;i<6;i++)b(v,-.24+i*.096,.245,z,.055,.045,.055,0xe5bf7e);
  }else if(id==='pumpkin-spice-biscuits'){
    for(let i=0;i<6;i++){
      const x=-.24+(i%3)*.24,z=-.13+Math.floor(i/3)*.25;
      b(v,x,.08,z,.19,.045,.2,0x9c6939);b(v,x,.125,z,.16,.02,.17,0xd6a95f);
      b(v,x,.145,z-.06,.025,.016,.025,C.green);
      for(const dx of [-.035,.035])b(v,x+dx,.15,z-.01,.02,.008,.022,C.brown);
      b(v,x,.15,z+.04,.055,.008,.017,C.brown);
    }
  }else{
    b(v,0,.08,0,.62,.15,.46,0x98633b);b(v,0,.23,0,.54,.04,.38,0xc97a32);for(const x of [-.18,.18])b(v,x,.27,0,.045,.025,.4,0xe0b477);for(const z of [-.12,.12])b(v,0,.27,z,.52,.025,.04,0xe0b477);b(v,0,.3,0,.1,.05,.11,C.cream);
  }
}
export function buildFoodProp(recipeId,{scale=.45}={}){
  const v=new Voxels();food(v,recipeId);const group=v.build();group.scale.setScalar(scale);group.userData.foodRecipe=recipeId;group.userData.nativeFood=true;return group;
}
// Local front is +z; mounting plane is z=0. The cabinet can be rotated onto
// either side wall without changing food orientation or pushing through it.
export function buildFoodWallDisplay({recipeId=null,count=0,slot=0}={}){
  const v=new Voxels();b(v,0,0,.04,1.4,1.12,.08,0x38262d);
  for(const x of [-.68,.68])b(v,x,0,.08,.075,1.16,.17,0x9a7047);
  for(const y of [0,.57,1.1])b(v,0,y,.16,1.43,.07,.35,0x78513b);
  b(v,0,1.16,.11,1.43,.14,.16,0x4b3240);
  for(const x of [-.42,0,.42])b(v,x,1.2,.204,.055,.055,.012,0xe4b46c,true);
  const group=v.build();group.userData.foodDisplay=slot;group.userData.dimensions={w:1.5,h:1.3,d:.36};group.userData.hitCenter=[0,.65,.16];
  if(recipeId)for(let i=0;i<Math.min(3,Math.max(0,Math.floor(count)));i++){
    const f=buildFoodProp(recipeId,{scale:.52});f.position.set(-.43+i*.43,.08,.17);group.add(f);
  }
  return group;
}
export function disposeFoodProp(group){
  group.traverse(m=>{if(m.isInstancedMesh)m.dispose();else if(m.geometry&&!m.geometry.userData?.shared)m.geometry.dispose();for(const mat of Array.isArray(m.material)?m.material:m.material?[m.material]:[]){mat.map?.dispose();mat.dispose();}});group.removeFromParent();
}
