// Standalone reward candidates. Nothing here registers a live catalogue item.
import * as THREE from 'three';
import { Voxels, seeded, vary } from '../../../../src/voxels.js';

const PALETTE = Object.freeze({ oak: 0x261922, oakLight: 0x49302d, oakEdge: 0x654233,
  plum: 0x43213f, velvet: 0x6a355a, brass: 0xb18445, gold: 0xe1b965,
  iron: 0x262b32, silver: 0xb3bdcb, wax: 0xe5d5ae, amber: 0xffad35,
  leaf: 0x335344, leafLight: 0x60775b, violet: 0x9163b4, lilac: 0xc5a1da });

export const REWARD_PROPS = Object.freeze([
  { id: 'contract-trophy-banquet-candelabrum', name: 'Midnight Banquet Candelabrum',
    footprint: { w: 1.4, d: 1.08 }, height: 2.04,
    description: 'Five ivory candles above a crowned brass stem and a carved velvet-inset oak pedestal.' },
  { id: 'contract-trophy-moonlit-conservatory', name: 'Moonlit Wardian Conservatory',
    footprint: { w: 1.56, d: 1.18 }, height: 2.1,
    description: 'A clear iron-and-glass cabinet of moonflowers, trailing ivy and one visiting moth.' },
  { id: 'contract-trophy-clockwork-hayride-theatre', name: 'Clockwork Hayride Theatre',
    footprint: { w: 1.6, d: 1.2 }, height: 1.64,
    description: 'A miniature tractor and wagon circle a moonlit woodland stage above two oak drawers.' },
].map(item => Object.freeze({ ...item, footprint: Object.freeze(item.footprint),
  gridFootprint: Object.freeze({ w: 2, d: 2 }), palette: PALETTE })));

const circle = (count, fn) => { for (let i = 0; i < count; i++) fn(i / count * Math.PI * 2, i); };

// New boxes are measured positively; the shared kit's geometry is never owned.
function context(root) {
  const materials = new Set(), geometries = new Set(), instances = new Set();
  let solid = null, glow = null, boxCount = 0;
  function batch(build, parent = root) {
    const v = new Voxels();
    const add = (x,y,z,w,h,d,colour,light=false) => {
      if (![x,y,z,w,h,d].every(Number.isFinite) || Math.min(w,h,d) <= 0) throw Error('Invalid reward box');
      v.box(x,y,z,w,h,d,colour,light);
    };
    const b = (x,y,z,w,h,d,colour,light=false) => add(x-w/2,y,z-d/2,w,h,d,colour,light);
    build({ box:add, block:b });
    boxCount += v.solid.length + v.glow.length;
    const g = v.build();
    for (const m of g.children) {
      instances.add(m);
      const emissive = m.material.isMeshBasicMaterial;
      const old = m.material, shared = emissive ? glow : solid;
      if (shared) { m.material = shared; old.dispose(); }
      else { if (emissive) glow = old; else solid = old; materials.add(old); }
      m.computeBoundingBox();
    }
    parent.add(g);
    return g;
  }
  function glass(w,h,d) {
    boxCount++;
    const material = [...materials].find(m=>m.userData.rewardGlass) ?? (() => {
      const m = new THREE.MeshStandardMaterial({ color:0xc2c2df, transparent:true, opacity:.15,
        roughness:.16, metalness:.08, depthWrite:false, side:THREE.DoubleSide });
      m.userData.rewardGlass=true; materials.add(m); return m;
    })();
    const geometry = new THREE.BoxGeometry(w,h,d); geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry,material); mesh.renderOrder=2; root.add(mesh); return mesh;
  }
  let disposed=false;
  return { root, batch, glass, get boxCount(){return boxCount;}, get materialCount(){return materials.size;},
    dispose(){if(disposed)return;disposed=true;for(const mesh of instances)mesh.dispose();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();},
    get disposed(){return disposed;} };
}

// Small carved fields are built on all four sides, so an orbit never reveals a blank back.
function cabinet(v,{w=1.2,d=.9,top=.7,seed=9,drawers=false}={}) {
  const p=PALETTE,r=seeded(seed),{block:b}=v;
  b(0,0,0,w,.07,d,p.oak);
  b(0,.07,0,w-.06,.06,d-.06,p.oakEdge);
  for(const x of [-1,1])for(const z of [-1,1]){
    b(x*(w/2-.12),.13,z*(d/2-.12),.13,.13,.13,p.oak);
    b(x*(w/2-.12),.20,z*(d/2-.12),.16,.035,.16,p.brass);
  }
  const bottom=.25,body=top-bottom-.1;
  b(0,bottom,0,w-.14,body,d-.14,p.oak);
  for(const side of [-1,1]){
    for(let i=0;i<9;i++){
      const x=(i-4)*(w-.29)/9;
      b(x,bottom+.035,side*(d/2-.061),(w-.29)/9-.004,body-.07,.023,vary(p.oakLight,.12,r));
    }
    b(0,bottom+.08,side*(d/2-.043),w-.39,body-.16,.025,p.plum);
    for(const x of [-1,1])b(x*(w/2-.19),bottom+.045,side*(d/2-.03),.036,body-.09,.035,p.brass);
    for(const y of [bottom+.045,top-.17])b(0,y,side*(d/2-.03),w-.35,.025,.035,p.brass);
    if(drawers){
      b(0,bottom+body/2,side*(d/2-.016),w-.3,.026,.035,p.oakEdge);
      for(const y of [bottom+body*.3,bottom+body*.76]){
        b(0,y,side*(d/2+.005),.12,.025,.035,p.gold);
        b(0,y-.013,side*(d/2+.024),.06,.013,.025,p.iron);
      }
    }else{
      for(const direction of [-1,1])for(let i=0;i<5;i++)
        b(direction*(.035+i*.027),bottom+body*.35+i*.018,side*(d/2-.007),.04,.035,.025,p.brass);
      b(0,bottom+body*.49,side*(d/2+.003),.055,.08,.025,p.velvet);
    }
  }
  for(const side of [-1,1]){
    b(side*(w/2-.058),bottom+.06,0,.024,body-.12,d-.35,p.plum);
    for(let i=0;i<5;i++)b(side*(w/2-.041),bottom+.08,(i-2)*.08,.024,body-.16,.018,p.brass);
    for(const z of [-1,1])b(side*(w/2-.031),bottom+.045,z*(d/2-.18),.034,body-.09,.035,p.gold);
  }
  for(const x of [-1,1])for(const z of [-1,1]){
    b(x*(w/2-.105),bottom,z*(d/2-.105),.07,body,.07,p.oakEdge);
    for(let i=0;i<4;i++)b(x*(w/2-.063),bottom+.035+i*(body-.05)/4,z*(d/2-.063),.035,.025,.035,p.brass);
  }
  b(0,top-.1,0,w,.055,d,p.oakEdge);
  b(0,top-.045,0,w+.035,.025,d+.035,p.brass);
  b(0,top-.02,0,w-.04,.02,d-.04,p.oak);
}

function ring(v,x,y,z,rx,rz,thickness,colour,count=30) {
  circle(count,a=>v.block(x+Math.cos(a)*rx,y,z+Math.sin(a)*rz,thickness,.025,thickness,colour));
}

function pumpkin(v,x,y,z,s=.1) {
  const p=PALETTE;
  v.block(x,y,z,s*.9,s*.7,s*.8,0xa24e20);
  for(const a of [-1,0,1])v.block(x+a*s*.23,y+s*.04,z,s*.27,s*.62,s*.91,a===0?0xc26b28:0xb65b22);
  v.block(x,y+s*.69,z,.017,s*.21,.017,p.leaf);
}

function candelabrum(ctx) {
  const p=PALETTE,flames=[];
  ctx.batch(v=>{
    cabinet(v,{w:1.12,d:.84,top:.86,seed:31});
    v.block(0,.86,0,.56,.035,.42,p.velvet);
    for(let k=0;k<8;k++){
      const w=.35-Math.sin(k/7*Math.PI)*.13;
      v.block(0,.895+k*.035,0,w,.037,w*.8,k%3===0?p.gold:p.brass);
    }
    v.block(0,1.17,0,.075,.48,.075,p.brass);
    for(let k=0;k<7;k++)v.block(0,1.18+k*.063,0,.11,.022,.11,k%2?p.gold:p.oakEdge);
    ring(v,0,1.13,0,.21,.15,.044,p.gold);
    circle(10,(a,i)=>{v.block(Math.cos(a)*.20,1.15,Math.sin(a)*.15,.035,.06+(i%2)*.04,.035,p.brass);});
    for(let i=0;i<5;i++){
      const x=(i-2)*.27,z=i%2?-.09:.06,cup=1.44+(2-Math.abs(i-2))*.10;
      const steps=12;
      for(let k=0;k<=steps;k++){
        const u=k/steps,yy=1.22+Math.pow(u,1.7)*(cup-1.22);
        v.block(x*u,yy,z*u,.055,.055,.055,k%4===0?p.gold:p.brass);
        if(k%3===0)v.block(x*u,yy+.036,z*u,.022,.018,.022,p.gold);
      }
      ring(v,x,cup,z,.095,.075,.035,p.brass,18);
      v.block(x,cup+.012,z,.14,.024,.11,p.gold);
      for(let k=0;k<6;k++){
        const yy=cup+.035+k*.035,wide=k===0?.079:.071;
        v.block(x,yy,z,wide,.037,.065,k%3===0?0xc7b88e:p.wax);
      }
      for(const side of [-1,1])v.block(x+side*.032,cup+.14-(i%3)*.02,z+.027,.016,.06+(i%2)*.02,.016,0xf0e2c2);
      v.block(x,cup+.247,z,.014,.022,.014,p.oak);
      flames.push({x,y:cup+.26,z});
    }
    for(const x of [-1,1])for(const z of [-1,1])pumpkin(v,x*.43,.86,z*.30,.085);
    for(const side of [-1,1])for(let i=0;i<9;i++)
      v.block(side*(.10+i*.013),1.01+i*.012,Math.sin(i*.7)*.025,.033,.024,.03,i%2?p.gold:p.brass);
  });
  for(const [index,point]of flames.entries()){
    const flame=ctx.batch(v=>{
      v.block(0,0,0,.035,.05,.032,p.amber,true);
      v.block(.004,.024,0,.017,.035,.018,0xffe3a1,true);
      v.block(-.004,.053,0,.012,.022,.014,0xffd66c,true);
    });
    flame.position.set(point.x,point.y,point.z);
    flames[index]={group:flame,...point};
  }
  return time=>{for(let i=0;i<flames.length;i++){
    const f=flames[i];f.group.scale.y=1+Math.sin(time*7.1+i*1.9)*.08;
    f.group.position.x=f.x+Math.sin(time*4.7+i)*.006;
  }};
}

// A flower is a solid little sculpture, not a billboard inside the glass case.
function moonflower(v,x,y,z,height,angle) {
  const p=PALETTE;
  for(let i=0;i<10;i++){
    const u=i/9,xx=x+Math.sin(u*2.4+angle)*.035,zz=z+Math.cos(u*1.8+angle)*.025;
    v.block(xx,y+u*height,zz,.019,.06,.019,p.leaf);
    if(i===3||i===6){
      const sign=i===3?1:-1;
      for(let k=0;k<4;k++)v.block(xx+Math.cos(angle)*k*.024*sign,y+u*height+k*.012,zz+Math.sin(angle)*k*.024*sign,.045-k*.007,.018,.033,p.leafLight);
    }
  }
  const cx=x+Math.sin(2.4+angle)*.035,cy=y+height,cz=z+Math.cos(1.8+angle)*.025;
  circle(5,(a,index)=>{
    const horizontal=Math.cos(a)*.095,vertical=Math.sin(a)*.09;
    v.block(cx+Math.cos(angle)*horizontal,cy+vertical,cz+Math.sin(angle)*horizontal,.085,.073,.06,index%2?p.lilac:p.violet);
    v.block(cx+Math.cos(angle)*horizontal,cy+vertical+.025,cz+Math.sin(angle)*horizontal+.008,.055,.033,.035,0xd3b7e2);
  });
  v.block(cx,cy-.005,cz,.035,.037,.035,0xe6d6a5,true);
}

function conservatory(ctx) {
  const p=PALETTE;
  ctx.batch(v=>{
    cabinet(v,{w:1.34,d:1.0,top:.58,seed:43,drawers:true});
    v.block(0,.58,0,1.22,.055,.87,0x3e3629);
    for(let x=-5;x<=5;x++)for(let z=-3;z<=3;z++)
      v.block(x*.10,.632,z*.11,.094,.017,.10,(x+z)%3===0?0x574032:0x382d28);
    for(const x of [-1,1])for(const z of [-1,1]){
      v.block(x*.65,.59,z*.47,.04,.96,.04,p.iron);
      v.block(x*.659,.62,z*.479,.018,.87,.018,p.brass);
      v.block(x*.65,1.53,z*.47,.075,.045,.075,p.gold);
    }
    for(const z of [-1,1])for(const y of [.60,1.54])v.block(0,y,z*.47,1.35,.035,.036,p.iron);
    for(const x of [-1,1])for(const y of [.60,1.54])v.block(x*.65,y,0,.035,.035,.98,p.iron);
    for(const z of [-1,1]){
      v.block(0,.62,z*.47,.024,.91,.028,p.iron);
      for(let i=0;i<7;i++)for(const side of [-1,1])
        v.block(side*(.30-i*.04),1.32+i*.029,z*.47,.036,.034,.03,p.brass);
    }
    for(const x of [-1,1])v.block(x*.65,.64,0,.027,.86,.026,p.iron);
    // Curved roof ribs finish the front, rear and middle of the Wardian case.
    for(const z of [-.48,0,.48])for(const side of [-1,1])for(let i=0;i<=13;i++){
      const x=side*(.65-i*.05),y=1.55+.34*Math.sqrt(Math.max(0,1-(x/.65)**2));
      v.block(x,y,z,.06,.035,.035,p.iron);
      if(z!==0)v.block(x,y+.03,z,.027,.015,.04,p.brass);
    }
    v.block(0,1.88,0,.045,.04,1.01,p.brass);
    for(const z of [-.39,.39]){
      v.block(0,1.92,z,.025,.07,.025,p.brass);
      v.block(0,1.99,z,.065,.035,.04,p.gold);
      v.block(0,2.025,z,.025,.035,.025,p.brass);
    }
    moonflower(v,-.28,.65,.08,.49,.20);
    moonflower(v,.02,.65,-.08,.72,-.15);
    moonflower(v,.28,.65,.05,.43,-.45);
    for(const side of [-1,1])for(let i=0;i<11;i++){
      const x=side*(.55-Math.sin(i*.75)*.045),y=.69+i*.06,z=-.40+Math.sin(i*.5)*.018;
      v.block(x,y,z,.017,.066,.017,p.leaf);
      v.block(x-side*.03,y+.017,z+.013,.058,.02,.033,i%3?p.leafLight:p.leaf);
    }
    pumpkin(v,-.43,.65,.31,.10);pumpkin(v,.40,.65,.32,.085);
    v.block(0,.37,.526,.24,.085,.018,p.brass);
    v.block(0,.385,.538,.18,.05,.012,p.plum);
    for(let i=0;i<7;i++)v.block(Math.sin(i/6*Math.PI)*.035-.018,.394+i*.005,.548,.014,.013,.008,p.silver);
    for(const x of [-1,1])for(let i=0;i<3;i++)v.block(x*.40,.72+i*.25,-.492,.08,.065,.025,p.brass);
  });
  const panes=[ctx.glass(.625,.88,.006),ctx.glass(.625,.88,.006),ctx.glass(.625,.88,.006),ctx.glass(.625,.88,.006)];
  panes[0].position.set(-.325,1.09,.471);panes[1].position.set(.325,1.09,.471);
  panes[2].position.set(-.325,1.09,-.471);panes[3].position.set(.325,1.09,-.471);
  // The side panes and roof share one restrained transparent material.
  for(const side of [-1,1]){
    const pane=ctx.glass(.006,.88,.91);pane.position.set(side*.65,1.09,0);
    for(let i=0;i<4;i++){
      const x0=i/4*.65,x1=(i+1)/4*.65;
      const y0=1.55+.34*Math.sqrt(Math.max(0,1-(x0/.65)**2));
      const y1=1.55+.34*Math.sqrt(Math.max(0,1-(x1/.65)**2));
      const roof=ctx.glass(Math.hypot(x1-x0,y1-y0),.006,.94);
      roof.position.set(side*(x0+x1)/2,(y0+y1)/2,0);
      roof.rotation.z=side*Math.atan2(y1-y0,x1-x0);
    }
  }
  const moth=new THREE.Group(),left=new THREE.Group(),right=new THREE.Group();
  ctx.batch(v=>{
    v.block(0,0,0,.016,.055,.023,p.iron);
    v.block(-.012,.05,0,.009,.032,.009,p.brass);v.block(.012,.05,0,.009,.032,.009,p.brass);
  },moth);
  const wing=(parent,side)=>ctx.batch(v=>{
    for(let i=0;i<5;i++){
      v.block(side*(.018+i*.018),.012+Math.sin(i/4*Math.PI)*.012,0,.022,.043+i*.008,.014,i%2?p.gold:p.wax,true);
      v.block(side*(.018+i*.018),-.019,0,.02,.015,.018,p.gold,true);
    }
    v.block(side*.065,.03,.009,.022,.018,.008,p.amber,true);
  },parent);
  wing(left,-1);wing(right,1);moth.add(left,right);ctx.root.add(moth);
  return time=>{
    moth.position.set(Math.sin(time*.63)*.27,1.30+Math.sin(time*1.07)*.10,Math.cos(time*.63)*.18);
    moth.rotation.y=-time*.63;left.rotation.y=Math.sin(time*7)*.42;right.rotation.y=-Math.sin(time*7)*.42;
  };
}

function tree(v,x,y,z,height,side) {
  const p=PALETTE;
  for(let i=0;i<7;i++){
    const xx=x+side*i*.012;
    v.block(xx,y+i*height/7,z,.026,.055,.024,p.oakLight);
    if(i>2&&i%2===0)for(let k=0;k<4;k++)v.block(xx+side*k*.018,y+i*height/7+k*.013,z,.022,.024,.022,p.oakEdge);
  }
  for(let i=0;i<9;i++){
    const a=i*2.399;
    v.block(x+side*.05+Math.cos(a)*.067,y+height*.67+Math.sin(a*2)*.055,z+Math.sin(a)*.055,.065,.03,.05,i%2?p.plum:0x573750);
  }
}

function theatre(ctx) {
  const p=PALETTE;
  ctx.batch(v=>{
    cabinet(v,{w:1.44,d:1.02,top:.68,seed:71,drawers:true});
    v.block(0,.68,0,1.45,.025,1.03,p.plum);
    v.block(0,.705,0,1.37,.016,.95,0x2c3431);
    // Two continuous pixel rails follow the oval, with timber sleepers beneath.
    circle(38,(a,i)=>v.block(Math.cos(a)*.505,.726,Math.sin(a)*.29,.075,.016,.055,i%3?p.oakLight:p.oakEdge));
    for(const radius of [1,.87])ring(v,0,.742,0,.52*radius,.30*radius,.026,p.brass,76);
    // A silver crescent is a real stepped object with a finished reverse.
    v.block(.035,.74,-.36,.022,.66,.022,p.iron);
    for(let x=-8;x<=8;x++)for(let y=-8;y<=8;y++){
      const xx=x*.023,yy=y*.023;
      if(xx*xx+yy*yy<=.19*.19&&(xx-.085)**2+yy*yy>.165*.165)
        v.block(xx+.035,1.38+yy,-.36,.024,.024,.035,(x+y)%3===0?0xd3d2ce:p.silver);
    }
    for(const side of [-1,1]){
      tree(v,side*.58,.73,-.22,.40,side);
      tree(v,side*.35,.73,-.40,.62,-side);
      pumpkin(v,side*.60,.73,.37,.085);
      pumpkin(v,side*.66,.73,.30,.055);
      v.block(side*.54,.73,.41,.025,.22,.025,p.iron);
      v.block(side*.54,.95,.41,.07,.016,.065,p.brass);
      v.block(side*.54,.965,.41,.044,.075,.04,p.amber,true);
      v.block(side*.54,1.04,.41,.075,.018,.065,p.brass);
    }
    for(let i=0;i<15;i++)for(const z of [-1,1])v.block((i-7)*.09,.65,z*.51,.019,.019,.015,p.gold);
    for(let i=0;i<9;i++)for(const x of [-1,1])v.block(x*.72,.65,(i-4)*.10,.015,.019,.019,p.gold);
  });
  const tractor=ctx.batch(v=>{
    v.block(0,0,0,.105,.027,.15,p.iron);
    v.block(0,.025,.032,.089,.06,.095,0x285045);
    v.block(0,.083,.035,.075,.012,.079,0x41634e);
    v.block(0,.027,-.044,.075,.04,.04,p.oak);
    v.block(0,.067,-.044,.052,.055,.018,p.plum);
    v.block(-.034,.08,.035,.015,.085,.015,p.iron);
    v.block(-.034,.16,.035,.025,.012,.025,p.brass);
    for(const side of [-1,1])for(const z of [-.043,.066]){
      const back=z<0,r=back?.039:.027;
      v.block(side*.064,-.005,z,.025,r*2,r*2,p.iron);
      v.block(side*.078,.007,z,.009,(r-.012)*2,(r-.012)*2,p.brass);
    }
    for(const x of [-1,1])v.block(x*.028,.053,.086,.025,.023,.012,p.amber,true);
    v.block(0,.031,.084,.055,.05,.012,p.brass);
    pumpkin(v,0,.095,.025,.034);
  });
  const wagon=ctx.batch(v=>{
    v.block(0,.015,0,.12,.025,.145,p.oak);
    for(const side of [-1,1]){
      v.block(side*.056,.04,0,.016,.075,.15,p.oakEdge);
      v.block(0,.04,side*.066,.12,.075,.016,p.oakLight);
      for(const z of [-.048,.048]){
        v.block(side*.071,0,z,.019,.045,.045,p.iron);
        v.block(side*.081,.01,z,.007,.025,.025,p.brass);
      }
    }
    for(let i=0;i<5;i++)v.block((i-2)*.018,.042,0,.016,.05,.11,i%2?0xc19a56:0xa67d42);
  });
  const coupler=ctx.batch(v=>v.block(0,0,0,.014,.014,1,p.brass));
  const crank=ctx.batch(v=>{
    circle(16,a=>v.block(0,Math.cos(a)*.085,Math.sin(a)*.085,.021,.026,.026,p.brass));
    for(let i=-4;i<=4;i++){
      v.block(0,i*.02,0,.025,.026,.025,p.gold);
      v.block(0,0,i*.02,.025,.025,.026,p.gold);
    }
    v.block(.03,.075,0,.07,.03,.03,p.oakEdge);
  });crank.position.set(.728,.42,0);
  const at=(g,a)=>{g.position.set(Math.cos(a)*.51,.78,Math.sin(a)*.29);g.rotation.y=Math.atan2(-.51*Math.sin(a),.29*Math.cos(a));};
  return time=>{
    const a=time*.32;at(tractor,a);at(wagon,a-.40);
    const dx=tractor.position.x-wagon.position.x,dz=tractor.position.z-wagon.position.z;
    coupler.position.set((tractor.position.x+wagon.position.x)/2,.795,(tractor.position.z+wagon.position.z)/2);
    coupler.rotation.y=Math.atan2(dx,dz);coupler.scale.z=Math.hypot(dx,dz);
    crank.rotation.x=-time*.8;
  };
}

const builders={
  'contract-trophy-banquet-candelabrum':candelabrum,
  'contract-trophy-moonlit-conservatory':conservatory,
  'contract-trophy-clockwork-hayride-theatre':theatre,
};

export function buildRewardProp(id,{animate=true}={}) {
  const meta=REWARD_PROPS.find(p=>p.id===id);
  if(!meta)throw new RangeError('Unknown contractor reward prop: '+String(id));
  const root=new THREE.Group();root.name=meta.name;
  const ctx=context(root),pose=builders[id](ctx);
  const tick=time=>{if(ctx.disposed)return;pose(animate&&Number.isFinite(time)?Math.max(0,time):0);};
  tick(0);root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
  let meshCount=0;root.traverse(m=>{if(m.isMesh)meshCount++;});
  root.userData={ rewardId:id,status:'contractor-preview-not-registered',native:true,front:'+Z',up:'+Y',
    footprint:meta.footprint,gridFootprint:meta.gridFootprint,height:meta.height,width:meta.footprint.w,depth:meta.footprint.d,
    bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},measuredSize:size.toArray(),
    animationBounds:{min:[-meta.footprint.w/2,0,-meta.footprint.d/2],max:[meta.footprint.w/2,meta.height,meta.footprint.d/2]},
    stats:{boxCount:ctx.boxCount,meshCount,materialCount:ctx.materialCount},
    tick,dispose:()=>ctx.dispose(),animationEnabled:!!animate };
  return root;
}
