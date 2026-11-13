// Cached cave layers and the western maize estate share authored navigation.
import * as THREE from 'three';
import { Voxels, ChunkedVoxels, seeded, vary } from './voxels.js';
import { PLAN_SCALE as K } from './content/village.js';
import { EXPANSION_AREAS, EXPANSION_ACTIVITIES, EXPANSION_VEINS, EXPANSION_AREA_BY_ID, EXPANSION_CHAPTER_BY_ID } from './content/village-expansion.js';
import { expansionAreaInfo, expansionActivityInfo } from './rules/village-expansion.js';
import { CAVE_IDS,CAVE_ROOMS,CAVE_ENTRY,ACRE_PATHS,ACRE_SHORTCUT,onAcreShortcut,isCaveArea,caveGroundAt,caveCellFree,stepExpansionWalker } from './village-expansion-spatial.js';
// The surface pieces were placed on the village's design grid; each is drawn where it now stands (rules/village-spread.js).
import { spread, PIECES, pieceAt } from './rules/village-spread.js';
const ALL_ACTIVITIES=[...EXPANSION_ACTIVITIES,...EXPANSION_VEINS];
const ACTIVITY_BY_ID=new Map(ALL_ACTIVITIES.map(a=>[a.id,a]));
const W=(x,z,y=0)=>new THREE.Vector3(x,y,-z), palettes=[{rock:0x746778,gem:0xb882e7,light:0xf2b875},{rock:0x566675,gem:0xe76a55,light:0x80c9d5},{rock:0x6b5876,gem:0x94d9d7,light:0xc9b0f0}];
const put=(v,x,y,z,w,h,d,c,g=false)=>v.block(x*K,y*K,-z*K,w*K,h*K,d*K,c,g);
const free=(x,z)=>CAVE_ROOMS.some(b=>x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1);
export function buildExpansionOre(v,area,seed=1){
 const pal=palettes[CAVE_IDS.indexOf(area)]??palettes[0],r=seeded(seed);
 for(let x=-2;x<=2;x++)for(let z=-1;z<=1;z++)for(let y=0;y<3;y++){
  const xx=x*.18,zz=z*.22,yy=y*.19;
  if((xx/.47)**2+(zz/.35)**2+((yy-.08)/.55)**2>1.25)continue;
  put(v,xx+(r()-.5)*.025,yy,zz,.19,.19+r()*.035,.235,vary(pal.rock,.25,r));
  if(y>0&&(x===-2||x===2||z!==0)&&r()<.35){const side=z<0?-1:1;put(v,xx,yy+.045,zz+side*.125,.08,.1,.025,pal.gem,true);}
 }
 for(const[x,z,h]of[[-.17,.04,.21],[.08,-.05,.32],[.24,.05,.17]]){put(v,x,.45,z,.1,h,.09,pal.gem,true);put(v,x,.45+h,z,.055,.07,.05,pal.gem,true);}
}
function crystal(v,x,z,y,colour,r){for(let j=0;j<5;j++){const a=j*2.4,dx=Math.cos(a)*.3,dz=Math.sin(a)*.3,h=.35+r()*.65;put(v,x+dx,y,z+dz,.2,h,.2,colour,true);put(v,x+dx,y+h,z+dz,.12,.16,.12,colour,true);}}
function lantern(v,x,z,y,colour){put(v,x,y,z,.5,.1,.5,0x3a2535);put(v,x,y+.1,z,.32,.5,.32,colour,true);for(const a of [-1,1])for(const b of [-1,1])put(v,x+a*.21,y+.08,z+b*.21,.055,.56,.055,0x392b35);put(v,x,y+.66,z,.54,.1,.54,0x3a2535);}
function seatedGuest(v,x,z,y,coat){
 put(v,x,y,z,.75,.7,.65,0x594238);put(v,x,y+.7,z,.5,.75,.36,coat);put(v,x,y+1.45,z,.4,.43,.38,0xc4b6a1);
 for(const side of[-1,1]){put(v,x+side*.16,y+.3,z-.3,.18,.4,.18,0x3c3444);put(v,x+side*.3,y+.85,z-.1,.15,.45,.18,coat);}
 put(v,x,y+1.85,z,.48,.14,.44,0x493347);
}
// What a story step looks like in the world, chosen from what its name says it is. All stand on a small
// flagged base so they read as placed there, and every one is under a metre and a half so it never hides a door.
const PROP_KINDS=[[/bell/i,'bell'],[/banner|curtain|pattern|thread|coat|keepsake/i,'banner'],[/table|supper|seat|guest|card|cook|basket|flavour|menu/i,'table'],[/frame|window|collection|object|constellation|inscription/i,'frame'],[/scarecrow|watcher|rhyme/i,'scarecrow'],[/gate|door|knock|invit|walk/i,'gate'],[/stone|brace|bridge|anchor|stepping|route/i,'cairn'],[/lantern|light|programme|stage|cue|sequence|performance|night|promise/i,'lanterns'],[/page|read|mark|recipe|leaf|study|listen|examine|find/i,'lectern']];
function questProp(v,a){
 const r=seeded(911+a.id.length*37+a.order*101+a.x*7+a.z*13),kind=PROP_KINDS.find(([re])=>re.test(a.name))?.[1]??(a.type==='puzzle'?'lanterns':a.type==='restore'?'cairn':'lectern');
 const wood=0x6a4a3a,dark=0x3e2a30,brass=0xd8a850,stone=0x8a8494,gold=0xf2c060;
 for(let i=0;i<10;i++){const t=i/10*Math.PI*2;put(v,Math.cos(t)*.62,0,Math.sin(t)*.62,.34,.07,.34,vary(stone,.12,r));}put(v,0,0,0,.9,.05,.9,vary(0x5a5262,.08,r));
 if(kind==='bell'){for(const s of[-1,1]){put(v,s*.42,.05,0,.12,1.25,.12,wood);put(v,s*.42,.05,0,.26,.1,.3,dark);}put(v,0,1.24,0,1.02,.12,.16,wood);put(v,0,1.02,0,.06,.24,.06,dark);put(v,0,.74,0,.34,.3,.34,brass);put(v,0,.62,0,.46,.14,.46,brass);put(v,0,.52,0,.1,.12,.1,dark);put(v,0,1.04,0,.2,.06,.2,gold,true);}
 else if(kind==='banner'){for(const s of[-1,1])put(v,s*.5,.05,0,.09,1.4,.09,dark);put(v,0,1.36,0,1.12,.08,.08,dark);for(let i=0;i<5;i++)for(let j=0;j<5;j++)put(v,-.36+i*.18,.5+j*.17,0,.18,.17,.05,vary([0x7a2a52,0x8e3460,0x6a2448][(i+j)%3],.06,r));put(v,0,1.02,.03,.22,.22,.03,0xf0e2c0,true);put(v,0,.78,.03,.3,.1,.03,gold,true);put(v,0,.58,.03,.16,.18,.03,0xb99be0,true);}
 else if(kind==='table'){for(const[x,z]of[[-.38,-.24],[.38,-.24],[-.38,.24],[.38,.24]])put(v,x,.05,z,.09,.6,.09,dark);put(v,0,.65,0,1,.08,.68,wood);put(v,0,.73,0,.86,.02,.24,0x8e3460);for(const x of[-.28,0,.28]){put(v,x,.74,.2,.2,.03,.2,0xe8dcc4);put(v,x,.77,.2,.1,.06,.02,0xfaf2de);}put(v,0,.74,-.14,.1,.2,.1,brass);put(v,0,.94,-.14,.06,.1,.06,gold,true);}
 else if(kind==='frame'){for(const s of[-1,1]){put(v,s*.3,.05,.12,.07,1.25,.07,wood);}put(v,0,.05,-.2,.07,1.1,.07,wood);put(v,0,.5,.1,.76,.06,.1,wood);for(const s of[-1,1]){put(v,s*.33,.56,.14,.08,.72,.07,gold);}put(v,0,.56,.14,.74,.08,.07,gold);put(v,0,1.2,.14,.74,.08,.07,gold);put(v,0,.64,.12,.58,.56,.03,0x2c2038);put(v,0,.86,.14,.14,.14,.03,0xb99be0,true);}
 else if(kind==='scarecrow'){put(v,0,.05,0,.1,1.3,.1,wood);put(v,0,.86,0,1,.09,.09,wood);put(v,0,.58,0,.42,.5,.26,0x7a5a3a);put(v,0,1.08,0,.34,.32,.3,0xc8a26a);put(v,0,1.4,0,.5,.06,.46,dark);put(v,0,1.44,0,.28,.2,.26,dark);for(const s of[-1,1]){put(v,s*.08,1.2,.16,.06,.06,.03,gold,true);put(v,s*.5,.8,0,.14,.2,.12,0xd8c078);}put(v,0,.3,.14,.3,.36,.04,0xe8dcc4);}
 else if(kind==='gate'){for(const s of[-1,1]){put(v,s*.5,.05,0,.16,1.2,.16,stone);put(v,s*.5,1.25,0,.22,.08,.22,vary(stone,.1,r));put(v,s*.5,1.33,0,.1,.14,.1,gold,true);}for(let i=0;i<5;i++)put(v,-.3+i*.15,.12,0,.06,.86-Math.abs(i-2)*.07,.05,dark);put(v,0,.3,0,.84,.06,.06,dark);put(v,0,.74,0,.84,.06,.06,dark);}
 else if(kind==='cairn'){for(const[x,z,w,h]of[[0,0,.6,.3],[-.1,.04,.46,.26],[.06,-.02,.36,.24],[0,0,.26,.2]]){const y=h===.3?.05:h===.26?.35:h===.24?.61:.85;put(v,x,y,z,w,h,w*.9,vary(stone,.14,r));}put(v,0,1.05,0,.12,.16,.12,0xb99be0,true);for(const s of[-1,1])put(v,s*.46,.05,.3,.2,.14,.2,vary(stone,.14,r));}
 else if(kind==='lanterns'){for(const[x,z,h,c]of[[-.3,.1,.5,0xf2c060],[.02,-.14,.76,0xb99be0],[.32,.14,.38,0xe8946a]]){put(v,x,.05,z,.22,.06,.22,dark);for(const a2 of[-1,1])for(const b of[-1,1])put(v,x+a2*.09,.1,z+b*.09,.03,h,.03,dark);put(v,x,.12,z,.15,h-.06,.15,c,true);put(v,x,.1+h,z,.26,.06,.26,dark);put(v,x,.16+h,z,.1,.08,.1,dark);}}
 else{put(v,0,.05,0,.14,.86,.14,wood);put(v,0,.05,0,.4,.08,.4,dark);for(let i=0;i<4;i++)put(v,0,.86+i*.04,-.14+i*.09,.62,.05,.12,wood);put(v,-.15,.99,.02,.28,.03,.36,0xf3ead2);put(v,.15,.99,.02,.28,.03,.36,0xe9dfc6);put(v,0,1.0,.02,.03,.03,.36,0x7a2a52);for(let i=0;i<3;i++)put(v,-.15,1.02,-.08+i*.1,.2,.008,.03,0x4a3a52);put(v,.15,1.02,.06,.1,.01,.1,0x7a2a52,true);}
}
function cave(id){const idx=CAVE_IDS.indexOf(id),pal=palettes[idx],v=new Voxels(),r=seeded(7391+idx*983),floor=z=>caveGroundAt(id,0,-z*K)/K,lamps=[];
 for(let x=-18;x<=18;x++)for(let z=-4;z<=55;z++)if(free(x,z)){
  const y=floor(z);put(v,x,y-.35,-z,1.02,.35,1.02,vary(pal.rock,.16,r));
  // Fine seams and low chips break up the broad stair treads without changing
  // the walking floor. They are authored once with the cave's static batch.
  if(r()<.18)put(v,x+(r()-.5)*.5,y+.005,-z+(r()-.5)*.5,.18+r()*.25,.012,.025,0x403a4c);
  if((Math.abs(x)>5||z>14)&&r()<.12)for(let chip=0;chip<2;chip++)put(v,x+(r()-.5)*.75,y+.012,-z+(r()-.5)*.75,.09+r()*.1,.025+r()*.04,.08+r()*.12,vary(pal.rock,.28,r));
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])if(!free(x+dx,z+dz)&&!(z===-4&&Math.abs(x)<2))for(let h=0;h<7;h++)put(v,x+dx*.48,y+h*.8,-z-dz*.48,dx?.6:1.05,.84,dx?1.05:.6,vary(pal.rock,.17,r));
  // A vaulted roof keeps the cave closed while staying above the following camera.
  if(z%2===0&&x%2===0)put(v,x,y+6.1+Math.max(0,1-Math.abs(x)/18)*1.2,-z,2.05,.5,2.05,vary(pal.rock,.08,r));
 }
 for(let z=1;z<55;z+=8)for(const side of[-1,1]){const x=side*(z<13?2.8:4.2),y=floor(z);lantern(v,x,-z,y+.2,pal.light);lamps.push(W(x*K,-z*K,(y+1.2)*K));}
 for(let i=0;i<28;i++){const x=(r()-.5)*28,z=15+r()*39;if(!free(x,z))continue;crystal(v,x,-z,floor(z),pal.gem,r);}
 // Weathered supports, rope handrail and a clear tactile stair down from daylight.
 for(let z=3;z<14;z+=4){const y=floor(z);for(const x of [-3.2,3.2])put(v,x,y,-z,.26,4.4,.3,0x705046);put(v,0,y+4.3,-z,6.6,.25,.3,0x80604c);}
 // The same physical door positions are used by the portal hit targets below.
 for(const [x,z]of [[0,1.8],...(idx<2?[[10,-24]]:[])]){
  const y=caveGroundAt(id,x*K,z*K)/K;
  for(const side of[-1,1]){put(v,x+side*1.3,y,z,.45,3.2,.55,0x7b6579);lantern(v,x+side*1.8,z,y+.6,pal.light);}
  // Keep the arch open: an opaque portal backing would sit between the
  // entrance follow camera and its owner, masking the entire first chamber.
  put(v,x,y+3,z,3.1,.45,.65,0x918098);
  if(z<0)for(let j=0;j<5;j++)put(v,x,y-j*.16,z+.4+j*.26,2.1,.18,.32,0x655b6c);
 }
 if(idx===1){put(v,-10,floor(20)+.05,-20,6,.035,5,0x447287,true);for(let j=0;j<5;j++)put(v,-10+j*.6,floor(20)+.1,-19.5,.12,.02,4.4,0x6d9aa9);}
 if(idx===2){for(let a=0;a<10;a++){const t=a/10*Math.PI*2;put(v,Math.cos(t)*9,floor(46),-46+Math.sin(t)*7,.6,3.2,.6,0x3b223d);}}
 const group=v.build({glow:1.25,detailShadows:false});group.traverse(o=>{if(o.material?.isMeshStandardMaterial){o.material.emissive.setHex(pal.rock);o.material.emissiveIntensity=.1;}});group.name=id;group.userData.visualBudget={boxes:v.solid.length+v.glow.length,addedLights:0};return{group,lamps};}
function buildAcre(){const v=new ChunkedVoxels(8),shortcutVoxels=new ChunkedVoxels(8),r=seeded(671229),floor=new Voxels(),house=new Voxels(),lamps=[];
 // Existing terrain supplies the meadow continuously; only worn paths overlay it.

 const paths=ACRE_PATHS.map(([a,b])=>[{x:a.x/K,z:a.z/K},{x:b.x/K,z:b.z/K}]);
 const onPath=(x,z)=>paths.some(([a,b])=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<1.4;})||(x>-76&&x<-60&&z>74&&z<92);
 for(let x=-94;x<-40;x+=1.3)for(let z=50;z<112;z+=1.3)if(!onPath(x,z)){const target=onAcreShortcut(x*K,z*K)?shortcutVoxels:v,h=2.2+r()*.9;put(target,x,3,z,.09,h,.09,0x62713e);for(let j=0;j<3;j++){put(target,x-.18,3.7+j*.45,z,.5,.08,.17,0x6c7940);put(target,x+.16,3.8+j*.45,z,.45,.08,.17,0x809047);}put(target,x,3+h-.4,z,.18,.35,.18,0xc39a48);}
 for(const[a,b]of paths){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)));for(let i=0;i<n;i++){const t=i/n;put(floor,a.x+(b.x-a.x)*t,3.005,a.z+(b.z-a.z)*t,2.7,.025,2.7,vary(0x8a7150,.1,r));}}
 for(let x=-73;x<-63;x+=.5)for(let z=82;z<89;z+=.5)put(house,x+.25,3,z+.25,.5,.3,.5,0x65505b);
 for(const x of [-72.5,-63.5])for(let z=82;z<89;z+=.5)for(let y=3.3;y<7;y+=.45)put(house,x,y,z,.4,.44,.5,vary(0x67534d,.14,r));
 for(let x=-72.5;x<-63.4;x+=.5)for(let y=3.3;y<7;y+=.45){put(house,x,y,89,.5,.44,.4,vary(0x68554c,.12,r));if(Math.abs(x+68)>1.1)put(house,x,y,82,.5,.44,.4,vary(0x827465,.14,r));}
 for(let x=-73.5;x<-62.5;x+=.35){const h=8.8-Math.abs(x+68)*.35;for(let z=81;z<90;z+=.45)put(house,x,h,z,.4,.15,.5,vary(0x413b4b,.14,r));}
 for(const x of [-70.6,-65.4]){put(house,x,4.5,81.75,1.2,1.5,.1,0xe9aa64,true);for(const dx of [-.65,.65])put(house,x+dx,4.35,81.6,.13,1.8,.2,0x3e2636);put(house,x,5.1,81.55,1.4,.08,.2,0x3e2636);}
 put(house,-68,3.3,82,.85,2.4,.13,0x4c293d);put(house,-67.7,4.4,81.8,.08,.08,.1,0xe9c183,true);
 for(let i=0;i<5;i++)put(house,-68,3-i*.12,81.5-i*.35,2.2,.18,.42,0x9b8163);
 put(house,-64.3,7.7,87.5,1,2.8,1,0x58454d);
 for(let i=0;i<22;i++){const x=-74+r()*12,z=76+r()*5;put(house,x,3,z,.5,.6,.5,0xc77535);put(house,x,3.6,z,.08,.18,.08,0x645b36);}
 for(const [x,z]of [[-44,82],[-60,74],[-77,82],[-68,96]]){lantern(house,x,z,3,0xe9b16d);lamps.push(W(x*K,z*K,4.2*K));}
 // Three unmistakable watchers are the maze's landmarks, not intrusive text signs.
 for(const [x,z,colour]of [[-88,62,0xb38a57],[-48,102,0x9572b7],[-84,102,0x6e9b83]]){put(house,x,3,z,.18,2.8,.18,0x65493d);put(house,x,4.5,z,2.2,.16,.16,0x65493d);put(house,x,4.2,z,.9,1.3,.5,colour);put(house,x,5.6,z,.7,.7,.6,0xbd9c66);put(house,x,6.3,z,1,.13,.8,0x38293b);put(house,x,6.4,z,.6,.4,.5,0x38293b);}
 const group=new THREE.Group(),corn=v.build({glow:1.1,detailShadows:false});corn.name='Acre corn';const shortcutCorn=shortcutVoxels.build({detailShadows:false});group.add(floor.build({detailShadows:false}),corn,shortcutCorn,house.build({glow:1.2,detailShadows:false}));
 // Drawn where the Acre was laid out, then moved whole to where it now stands, its lamps with it.
 const [dx,dz]=PIECES[pieceAt(-68,82)];group.position.set(dx*K,0,-dz*K);group.updateMatrixWorld(true);for(const l of lamps){l.x+=dx*K;l.z-=dz*K;}
 const fades=[];corn.updateMatrixWorld(true);corn.traverse(o=>{if(o.isMesh){o.material.alphaHash=true;const centre=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());fades.push({mesh:o,centre});}});group.name='The Crooked Acre';return{group,corn,shortcutCorn,fades,lamps};}
// Voxel instances share the global unit-box geometry with the rest of the game.
// Releasing an expansion must never dispose that shared geometry or pick material.
const dispose=group=>group.traverse(o=>{o.dispose?.();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose?.();});
export function createVillageExpansionWorld({scene,state,groundAt,pickMaterial}){
 const cache=new Map(),gates=new Map(),restorations=new Map(),unrestored=new Map(),hits=[],props=new THREE.Group();props.name='Mothlight activity landmarks';scene.add(props);let active=null,built=false,clock=0,targetCache=[],refreshAt=0,beacon=null,beaconAt=null;
 const pointOf=a=>({x:a.x,z:a.z,y:isCaveArea(a.area)?caveGroundAt(a.area,a.x,a.z):groundAt(a.x,a.z)});
 function build(){if(built)return;built=true;
  const entrance=new Voxels(),mouthX=CAVE_ENTRY.x/K,mouthZ=CAVE_ENTRY.z/K;for(const side of [-1,1])for(let h=0;h<6;h++)put(entrance,mouthX+side*2.3,3+h*.6,mouthZ,.7,.62,1.4,0x6d6370);for(let j=0;j<9;j++){const a=j/8*Math.PI;put(entrance,mouthX+Math.cos(a)*2.3,6.2+Math.sin(a)*1.6,mouthZ,.7,.7,1.4,0x887b87);}put(entrance,mouthX,3,mouthZ,3.9,4,.08,0x100e1b);for(const x of [mouthX-3,mouthX+3])lantern(entrance,x,mouthZ-2,3,0xf0b777);const gate=entrance.build({glow:1.2,detailShadows:false});scene.add(gate);cache.set('entrance',{group:gate,lamps:[]});
  const portal=new THREE.Mesh(new THREE.BoxGeometry(4*K,4*K,.5*K),pickMaterial);portal.position.copy(W(CAVE_ENTRY.x,CAVE_ENTRY.z,5*K));portal.userData={type:'expansion-portal',id:'cave-shallows',area:'copse'};scene.add(portal);hits.push(portal);
for(const[id,ox,oz,turned]of [['copse',0,52,false],['quarry',58,62,false],['moor',124,34,true],['marsh',58,106,false],['acre',-40,82,true]]){const [x,z]=spread(ox,oz),v=new Voxels(),y=groundAt(x*K,z*K)/K;for(let i=-6;i<=6;i++){const a=i*.4;put(v,x+(turned?0:a),y,z+(turned?a:0),.09,2.7,.09,0x4c3a51);}for(const side of [-1,1]){put(v,x+(turned?0:side*2.8),y,z+(turned?side*2.8:0),.65,3.3,.65,0x766378);lantern(v,x+(turned?0:side*2.8),z+(turned?side*2.8:0),y+3.3,0xe7bc7f);}const g=v.build({glow:1.1,detailShadows:false});scene.add(g);gates.set(id,g);}
  for(const[id,where]of [['copse-restored',[-8,96]],['restaurant-opening',[64,74]],['moor-restored',[159,48]],['marsh-restored',[85,122]],['lantern-night',[52,34]]]){const v=new Voxels(),[x,z]=spread(...where),y=groundAt(x*K,z*K)/K;
    if(id==='copse-restored'){for(let j=0;j<12;j++){const a=j*Math.PI/6;put(v,x+Math.cos(a)*2.8,y,z+Math.sin(a)*2.8,.45,.3,.45,0xa19472);put(v,x+Math.cos(a)*2.8,y+.3,z+Math.sin(a)*2.8,.25,.7,.25,j%2?0xb6ca9b:0xb99be0,true);}for(const side of[-1,1])lantern(v,x+side*3,z,y,0xf3d7a0);}
    if(id==='restaurant-opening'||id==='lantern-night'){for(const[dx,dz,coat]of[[-1,-1.7,0x78537f],[1,1.7,0x62806c]])seatedGuest(v,x+dx,z+dz,y,coat);put(v,x,y,z,3,.85,1.5,0x604338);put(v,x,y+.85,z,3.3,.1,1.7,0xa88769);for(let i=0;i<4;i++){put(v,x-1.1+i*.7,y+.98,z,.5,.04,.5,0xe6d2ae);put(v,x-1.1+i*.7,y+1.03,z,.28,.12,.28,0xc88c54);put(v,x-1.1+i*.7,y+1.2,z+.45,.14,.25,.14,0xbc8e73);}for(const side of[-1,1])lantern(v,x+side*2,z,y,0xf3c77f);}
    if(id==='moor-restored'){seatedGuest(v,x,z-1,y+.45,0x70436e);for(const dx of[-2,0,2])seatedGuest(v,x+dx,z+3.1,y,0x6e657d);put(v,x,y,z,6,.45,4,0x745345);for(const side of[-1,1]){put(v,x+side*3,y,z,.2,4,.2,0x654555);for(let j=0;j<6;j++)put(v,x+side*(2.8-j*.12),y+.5+j*.5,z-1.5,.8,.6,.2,0x8f3054);}for(let i=0;i<7;i++)put(v,x-2.7+i*.9,y+3.8,z,.2,.3,.15,[0xf3b875,0xb6a1e2][i%2],true);}
    if(id==='marsh-restored'){for(let i=0;i<12;i++){const a=i*Math.PI/6;put(v,x+Math.cos(a)*4.9,y+5,z+Math.sin(a)*4.9,.18,.25,.18,[0xb2d9dd,0xcdb2eb,0xeac994][i%3],true);}put(v,x,y+6,z,.35,1,.35,0xd5b98f);put(v,x,y+7,z,.45,.3,.45,0xcbb0e9,true);}
    if(id==='lantern-night'){for(let j=0;j<15;j++)put(v,x-3+j*1.1,y+4.8+Math.sin(j/14*Math.PI)*-.4,z-3,.25,.32,.12,[0xf2ba6d,0xbb8bd3,0x9cb5ae][j%3],true);}
    const g=v.build({glow:1.25,detailShadows:false});g.name='Restored '+id;scene.add(g);restorations.set(id,g);
  }
  {const v=new Voxels();for(let i=0;i<18;i++){const [x,z]=spread(-17+i*.45,92+Math.sin(i)*1.2);put(v,x,3,z,.12,1.1+(i%3)*.25,.12,0x3d3540);put(v,x,3.4,z,.75,.1,.13,0x443543);}const g=v.build({detailShadows:false});g.name='Unrestored Copse brambles';scene.add(g);unrestored.set('copse-restored',g);}
  for(const area of CAVE_IDS)for(const[id,x,z]of [['cave-exit',0,1.8*K],...(CAVE_IDS.indexOf(area)<2?[[CAVE_IDS[CAVE_IDS.indexOf(area)+1],10*K,-24*K]]:[])]){const h=new THREE.Mesh(new THREE.BoxGeometry(2,3,.4),pickMaterial);h.position.copy(W(x,z,caveGroundAt(area,x,z)+1.5));h.userData={type:'expansion-portal',id,targetArea:id==='cave-exit'?'surface':id,area};scene.add(h);hits.push(h);}
  {const v=new Voxels();for(const[w,y]of[[.1,0],[.24,.12],[.38,.26],[.24,.5],[.1,.64]])v.block(0,y,0,w,y===.26?.24:.14,w,0xffd98a,true);for(let i=0;i<9;i++)v.block(0,-1.1-i*.42,0,.05,.3,.05,0xffe6b0,true);beacon=v.build({glow:1.6,detailShadows:false,shadows:false});beacon.name='Followed step beacon';beacon.visible=false;scene.add(beacon);}
  const acre=buildAcre();cache.set('acre',acre);acre.group.visible=true;scene.add(acre.group);
  for(const a of ALL_ACTIVITIES){const p=pointOf(a),mesh=new THREE.Mesh(new THREE.BoxGeometry(1.4,2,1.4),pickMaterial);mesh.position.copy(W(p.x,p.z,p.y+1));mesh.userData={type:'expansion-activity',id:a.id,area:a.area};scene.add(mesh);hits.push(mesh);const v=new Voxels();if(a.type==='vein'){buildExpansionOre(v,a.area,301+ALL_ACTIVITIES.indexOf(a)*193);}else if(a.type==='story-vein')crystal(v,0,0,0,palettes[CAVE_IDS.indexOf(a.area)]?.gem??0xb882e7,seeded(a.order+51));else questProp(v,a);const g=v.build({glow:1.1,detailShadows:false});g.position.copy(W(p.x,p.z,p.y+.03));g.userData.activity=a;props.add(g);}
 }
 function refreshTargets(){const list=ALL_ACTIVITIES.filter(a=>{const info=expansionActivityInfo(state,a.id);return(isCaveArea(a.area)?a.area===active:!active)&&info?.visible!==false&&info?.available&&!info?.done&&!(info?.remaining>0);}).map(a=>({type:'expansion-activity',id:a.id,area:a.area,x:a.x,z:a.z}));
  if(active){list.push({type:'expansion-portal',id:'cave-exit',targetArea:'surface',area:active,x:0,z:1.8*K});const next=CAVE_IDS[CAVE_IDS.indexOf(active)+1];if(next)list.push({type:'expansion-portal',id:next,targetArea:next,area:active,x:10*K,z:-24*K});}
  else list.push({type:'expansion-portal',id:'cave-shallows',targetArea:'cave-shallows',area:'copse',...CAVE_ENTRY});targetCache=list;}
 function sync(){build();const acre=cache.get('acre');if(acre)acre.shortcutCorn.visible=!state.village?.expansion?.effects?.includes('acre-shortcut');for(const[id,g]of unrestored)g.visible=!active&&!state.village?.expansion?.effects?.includes(id);for(const[id,g]of restorations)g.visible=!active&&!!state.village?.expansion?.effects?.includes(id);for(const[id,g]of gates)g.visible=!active&&!expansionAreaInfo(state,id)?.open;for(const h of hits){if(h.userData.type==='expansion-portal'){h.visible=h.userData.area?.startsWith('cave-')?h.userData.area===active:!active;continue;}const a=ACTIVITY_BY_ID.get(h.userData.id),info=expansionActivityInfo(state,a.id);h.visible=(active?a.area===active:!isCaveArea(a.area))&&info?.visible!==false&&!!info?.available&&!info?.done&&!(info?.remaining>0);}for(const p of props.children){const a=p.userData.activity;const info=expansionActivityInfo(state,a.id);p.visible=(active?a.area===active:!isCaveArea(a.area))&&info?.visible!==false&&(info?.available||info?.done&&a.type==='restore')&&!(info?.remaining>0);if(p.userData.completed!==info?.done){p.userData.completed=info?.done;p.scale.setScalar(a.type==='restore'&&info?.done?1.2:1);}}for(const[id,c]of cache)c.group.visible=active?id===active:['acre','entrance'].includes(id);{const e=state.village?.expansion,chapter=e?.tracked&&EXPANSION_CHAPTER_BY_ID[e.tracked],step=chapter&&ACTIVITY_BY_ID.get(chapter.activities.find(id=>!e.completed?.[id])),info=step&&expansionActivityInfo(state,step.id);beaconAt=info?.available&&!info.done&&(active?step.area===active:!isCaveArea(step.area))?pointOf(step):null;if(beacon)beacon.visible=!!beaconAt;}refreshTargets();refreshAt=clock+1;}
 // The map photographs the surface even from a cave; it never changes the active area or its clock.
 function withMapSurface(fn){
  const visible=[],opacity=new Map();const keep=g=>{if(g)visible.push([g,g.visible]);};
  for(const c of cache.values())keep(c.group);for(const g of [...gates.values(),...restorations.values(),...unrestored.values()])keep(g);for(const p of props.children)keep(p);keep(props);keep(beacon);
  const acre=cache.get('acre');if(acre)for(const {mesh}of acre.fades){if(!opacity.has(mesh.material))opacity.set(mesh.material,mesh.material.opacity);mesh.material.opacity=1;}
  try{
   for(const[id,c]of cache)c.group.visible=['acre','entrance'].includes(id);
   for(const[id,g]of gates)g.visible=!expansionAreaInfo(state,id)?.open;
   for(const[id,g]of restorations)g.visible=!!state.village?.expansion?.effects?.includes(id);
   for(const[id,g]of unrestored)g.visible=!state.village?.expansion?.effects?.includes(id);
   props.visible=true;for(const p of props.children){const a=p.userData.activity,i=expansionActivityInfo(state,a.id);p.visible=!isCaveArea(a.area)&&i?.visible!==false&&(i?.available||i?.done&&a.type==='restore')&&!(i?.remaining>0);}
   if(beacon)beacon.visible=false;return fn();
  }finally{for(const[g,v]of visible)g.visible=v;for(const[m,o]of opacity)m.opacity=o;}
 }
 return{pickables:hits,build,sync,withMapSurface,enter(id){if(!isCaveArea(id))return false;if(!expansionAreaInfo(state,id)?.open)return false;if(!cache.has(id)){const c=cave(id);cache.set(id,c);scene.add(c.group);}active=id;sync();return{id,spawn:{...EXPANSION_AREA_BY_ID[id].spawn}};},leave(){const previous=active;active=null;sync();return{spawn:{...CAVE_ENTRY},previous};},get active(){return active;},get targets(){return targetCache;},ground(x,z){return active?caveGroundAt(active,x,z):groundAt(x,z);},move(from,dx,dz){return stepExpansionWalker(from,dx,dz,(x,z)=>caveCellFree(x,z));},get lamps(){return cache.get(active??'acre')?.lamps??[];},tick(dt,camera,subject){clock+=dt;if(clock>=refreshAt)sync();if(beacon&&beaconAt){beacon.position.copy(W(beaconAt.x,beaconAt.z,beaconAt.y+3.6+Math.sin(clock*2.2)*.22));beacon.rotation.y=clock*1.4;}const acre=cache.get('acre');if(acre&&!active){const t=subject??camera;for(const {mesh,centre} of acre.fades){const opacity=Math.hypot(t.x-centre.x,t.z-centre.z)<8?.35:1;if(mesh.material.opacity!==opacity)mesh.material.opacity=opacity;}}},dispose(){for(const c of cache.values()){scene.remove(c.group);dispose(c.group);}for(const g of [...gates.values(),...restorations.values(),...unrestored.values()]){scene.remove(g);dispose(g);}gates.clear();restorations.clear();unrestored.clear();scene.remove(props);dispose(props);if(beacon){scene.remove(beacon);dispose(beacon);}for(const h of hits){scene.remove(h);h.geometry.dispose();}cache.clear();hits.length=0;targetCache=[];},get stats(){return{cachedAreas:cache.size,active,activities:hits.length,restored:[...restorations].filter(([,g])=>g.visible).map(([id])=>id),addedLights:0};}};
}
