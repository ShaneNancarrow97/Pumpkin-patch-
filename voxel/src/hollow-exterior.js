import { Voxels, seeded, vary } from "./voxels.js";

const C = { iron:0x282631, stone:0x6b626e, edge:0x9d8e9a, dark:0x38323e,
  timber:0x473132, oak:0x76543c, plum:0x503447, wine:0x6c3048,
  roof:0x34283f, slate:0x4b3b54, gold:0xba9463, cream:0xd7c4a0,
  moss:0x3d4636, leaf:0x563b46, amber:0xffb663, flame:0xffd596 };
const RESTORED = new Set(["ready", "open", "closed", "restored"]);

// Only the silhouette grows. All seven appearances keep the existing pitch,
// doorway and pedestrian lanes, so an upgrade cannot bury a waiting guest.
export function hollowExteriorSpec(status = "derelict", tier = 1) {
  if (status && typeof status === "object") { tier = status.tier ?? tier; status = status.status ?? "derelict"; }
  tier = Math.max(1, Math.min(5, Math.trunc(Number(tier)) || 1));
  status = RESTORED.has(status) || status === "restoring" ? status : "derelict";
  const restored = RESTORED.has(status), working = status === "restoring";
  return { status, tier, restored, working, wallHeight: restored ? [3.95,4.10,4.20,4.30,4.45][tier-1] : 3.95,
    appearance: restored ? `tier-${tier}` : status, footprint:{ w:8, d:5 } };
}

function line(v, a, b, width, colour) {
  const n = Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2])/.055);
  for(let i=0;i<=n;i++){const t=n?i/n:0;v.block(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t,width,width,width,colour);}
}
function lantern(v,x,y,z,s=1) {
  v.block(x,y,z,.32*s,.07*s,.28*s,C.iron);v.block(x,y+.08*s,z,.21*s,.30*s,.19*s,C.amber,true);
  for(const dx of[-.13,.13])for(const dz of[-.11,.11])v.block(x+dx*s,y+.05*s,z+dz*s,.035*s,.37*s,.035*s,C.iron);
  v.block(x,y+.39*s,z,.37*s,.07*s,.32*s,C.iron);v.block(x,y+.46*s,z,.14*s,.09*s,.14*s,C.gold);
}
function pumpkin(v,x,z,r=.30) {
  const u=r/2;
  for(let y=0;y<5;y++)for(let xx=-2;xx<=2;xx++)for(let zz=-2;zz<=2;zz++)if((xx/2.5)**2+((y-2)/2.6)**2+(zz/2.5)**2<1)v.block(x+xx*u,.10+y*u*.78,z+zz*u,u*.99,u*.79,u*.99,xx%2?0xd96b25:0xb24b24);
  v.block(x,.1+r*1.67,z,r*.22,r*.33,r*.19,C.moss);
  for(const dx of[-.24,.24])v.block(x+dx*r,.1+r*.9,z+r*.94,r*.18,r*.18,.035,C.flame,true);
  v.block(x,.1+r*.47,z+r*.97,r*.50,.045,.035,C.amber,true);
}
function cobweb(v,x,y,z,size,side=1) {
  const corner=[x,y,z],ends=[];
  for(let i=0;i<5;i++){const a=i*Math.PI/8;const end=[x+side*Math.cos(a)*size,y-Math.sin(a)*size,z];ends.push(end);line(v,corner,end,.017,0x9a909d);}
  for(const f of[.38,.69,.96])for(let i=1;i<ends.length;i++)line(v,[x+(ends[i-1][0]-x)*f,y+(ends[i-1][1]-y)*f,z],[x+(ends[i][0]-x)*f,y+(ends[i][1]-y)*f,z],.015,0x807687);
}
function skull(v,x,y,z,s=.45) {
  v.block(x,y,z,.42*s,.37*s,.29*s,C.cream);v.block(x,y+.31*s,z,.34*s,.10*s,.25*s,C.edge);
  for(const dx of[-.11,.11])v.block(x+dx*s,y+.18*s,z+.16*s,.10*s,.10*s,.025,C.iron);
  v.block(x,y+.09*s,z+.17*s,.05*s,.07*s,.025,C.iron);
  for(const dx of[-.09,0,.09])v.block(x+dx*s,y-.06*s,z+.04*s,.055*s,.10*s,.16*s,C.cream);
}
// A closed pane lies in front of the sealed wall. The arch's fine stonework
// and separate iron tracery give depth without exposing the building's inside.
function windowFrame(v,put,x,y,restored,tier,boarded,socket,face) {
  put(x,y-.12,.07,1.30,1.70,.16,C.dark);put(x,y,.17,.92,1.35,.08,restored?C.amber:0x282633,restored);
  for(const dx of[-.56,.56])put(x+dx,y-.06,.27,.12,1.52,.16,C.edge);
  put(x,y-.15,.22,1.38,.13,.35,C.stone);put(x,y-.05,.31,.055,1.48,.06,C.iron);
  put(x,y+.57,.31,1.0,.06,.06,C.iron);
  for(const side of[-1,1])for(let i=0;i<6;i++){
    const u=.60*(1-i/6),yy=y+1.35+.45*(1-(u/.60)**1.5);
    put(x+side*u,yy,.20,.16,.13,.20,restored&&tier>=2?C.gold:C.stone);
  }
  if(boarded)for(let i=0;i<3;i++)put(x,y+.12+i*.43,.38,1.28,.17,.11,C.oak);
  else if(face==="front")socket.push({x,y,z:2.15,width:.92,height:1.35,face});
  if(restored&&tier>=4)for(const side of[-1,1])put(x+side*.34,y+.99,.33,.035,.34,.04,C.gold);
}
function roof(v,r,h,restored,tier) {
  const colour=restored?C.roof:0x332c38;
  // Continuous overlapping under-slates close every joint, including broken
  // derelict tiles. Gables are solid stepped bands, never two-sided planes.
  for(let z=-2.28;z<=2.28;z+=.19){const y=h+(2.32-Math.abs(z))*.67;
    v.block(0,y-.20,z,7.60,.27,.22,colour);
    for(let x=-3.66;x<=3.67;x+=.27){
      const broken=!restored&&((Math.round(x*100)+Math.round(z*100))%17===0||x<-2.4&&z<-.8);
      if(!broken)v.block(x,y+.06,z,.262,.10,.205,vary(restored?C.slate:colour,.13,r));
    }
  }
  for(const side of[-1,1])for(let y=h-.03;y<h+1.58;y+=.13){const d=Math.max(.13,4.65-(y-h)*2/.67);v.block(side*3.35,y,0,.25,.15,Math.min(4.65,d),colour);}
  for(let x=-3.65;x<=3.65;x+=.23)v.block(x,h+1.61,0,.225,.10,.25,restored&&tier>=2?C.gold:C.timber);
  for(const z of[-2.30,2.30]){v.block(0,h-.06,z,7.75,.14,.16,C.timber);v.block(0,h+.09,z,7.72,.055,.20,restored?C.gold:C.dark);}
  return h+1.71;
}
function pointedCap(v,x,y,z,width,height,colour,finial=true) {
  const n=Math.ceil(height/.13);
  for(let i=0;i<n;i++){const s=width*(1-i/n);v.block(x,y+i*.13,z,s,.15,s,colour);}
  if(finial){v.block(x,y+height,z,.055,.24,.055,C.gold);v.block(x,y+height+.1,z,.19,.04,.04,C.gold);}
}
function tower(v,r,x,z,wallTop,top,tier) {
  const width=tier>=4?1.18:1.44,base=wallTop-.8,shaft=top-1.55;
  v.block(x,base,z,width,shaft-base,width,C.dark);
  for(let y=base;y<shaft;y+=.25){v.block(x,y,z,width+.04,.08,width+.04,C.stone);for(const side of[-1,1])v.block(x+side*(width/2-.06),y,z,.15,.26,width+.07,vary(C.stone,.08,r));}
  v.block(x,shaft-.12,z,width+.20,.16,width+.20,C.edge);
  pointedCap(v,x,shaft,z,width+.35,top-shaft-.25,tier>=4?0x422b4f:C.roof);
  v.block(x,base+.35,z+width/2+.03,.44,.62,.035,C.amber,true);
  for(const dx of[-.25,.25])v.block(x+dx,base+.27,z+width/2+.06,.055,.78,.045,C.gold);
}
function dormer(v,x,y,z,tier) {
  v.block(x,y,z,.93,.85,.65,C.plum);v.block(x,y+.11,z+.35,.55,.56,.045,C.amber,true);
  for(const dx of[-.33,.33])v.block(x+dx,y+.04,z+.39,.08,.72,.09,C.edge);
  v.block(x,y+.11,z+.40,.05,.58,.04,C.iron);v.block(x,y+.37,z+.40,.60,.05,.04,C.iron);
  for(let i=0;i<5;i++)v.block(x,y+.78+i*.10,z,1.18-i*.22,.12,.81,tier>=5?C.gold:C.roof);
}

export function buildHollowExterior(status="derelict",tier=1) {
  const spec=hollowExteriorSpec(status,tier);({status,tier}=spec);
  const {restored,working,wallHeight:h}=spec,v=new Voxels(),r=seeded(918+tier),windows=[];
  v.block(0,-.04,0,7.8,.18,4.90,C.dark);v.block(0,.10,0,7.48,.14,4.62,C.stone);
  // Shell panels overlap at the corners. The door and the glass are overlays,
  // so changing a camera angle cannot reveal a crack or the far-side windows.
  v.block(0,.16,1.77,6.90,h-.12,.30,restored?C.plum:0x40383f);
  v.block(0,.16,-1.77,6.90,h-.12,.30,restored?C.plum:0x40383f);
  for(const x of[-3.30,3.30])v.block(x,.16,0,.30,h-.12,3.84,restored?C.plum:0x40383f);
  v.block(0,h-.10,0,6.90,.18,3.84,C.timber);
  for(const face of["front","back","left","right"]){
    const side=face==="left"||face==="right",length=side?3.70:6.70;
    const put=(u,y,out,w,hh,d,c,g=false)=>side?v.block((face==="left"?-1:1)*(3.45+out),y,u,d,hh,w,c,g):v.block(u,y,(face==="front"?1:-1)*(1.92+out),w,hh,d,c,g);
    for(let y=.30,row=0;y<h-.18;y+=.235,row++)for(let x=-length/2+.15+(row%2)*.19;x<length/2-.1;x+=.39){
      if(face==="front"&&Math.abs(x)<.76&&y<2.8)continue;
      put(x,y,0,.365,.215,.10,vary(restored?[C.plum,0x604155,0x4c394b][row%3]:[0x51434c,0x5f5055,0x423a43][row%3],.08,r));
    }
    for(const y of[.38,3.10,h-.13])put(0,y,.05,length+.15,.11,.17,restored&&tier>=2?C.gold:C.stone);
    for(const x of[-length/2+.08,length/2-.08])for(let y=.20;y<h;y+=.28)put(x,y,.09,.22,.26,.22,vary(C.stone,.06,r));
    for(const x of(side?[0]:[-2.18,2.18]))windowFrame(v,put,x,1.27,restored,tier,!restored,windows,face);
  }
  // Recessed oak doors, small brass hardware and a pointed stone surround.
  v.block(0,.15,2.12,1.66,2.61,.20,C.iron);v.block(0,.20,2.24,1.34,2.39,.12,restored?C.wine:C.timber);
  for(let x=-.55;x<=.55;x+=.22)v.block(x,.25,2.31,.025,2.26,.025,restored?0x4c2639:C.oak);
  for(const y of[.58,1.72])v.block(0,y,2.34,1.18,.06,.035,C.iron);
  v.block(.43,1.24,2.37,.085,.15,.05,C.gold);v.block(.43,1.43,2.38,.16,.035,.035,C.gold);
  for(const x of[-.85,.85])v.block(x,.13,2.18,.15,2.68,.31,C.edge);
  for(const side of[-1,1])for(let i=0;i<7;i++){const u=.86*(1-i/7);v.block(side*u,2.67+.48*(1-(u/.86)**1.4),2.17,.18,.14,.32,restored&&tier>=2?C.gold:C.stone);}
  for(let i=0;i<3;i++)v.block(0,.12+i*.075,2.21+(2-i)*.075,1.92-i*.13,.08,.28,C.edge);
  if(!restored)for(let i=0;i<4;i++)v.block(0,.52+i*.48,2.42,1.52,.17,.08,C.oak);
  const roofPeak=roof(v,r,h,restored,tier);
  // A broken chimney defines the abandoned cottage; the restored flue gains a
  // proper pot and stepped flashing instead of merely changing its colour.
  const chimneyX=-2.48,chimneyTop=h+1.18;
  for(let y=h-.2;y<chimneyTop;y+=.19)v.block(chimneyX+(restored?0:Math.floor(y*5)%2*.06),y,-1.05,.55,.18,.62,vary(C.stone,.09,r));
  v.block(chimneyX,chimneyTop,-1.05,.68,.11,.75,C.edge);
  if(restored){v.block(chimneyX,chimneyTop+.11,-1.05,.27,.32,.31,C.timber);v.block(chimneyX,chimneyTop+.43,-1.05,.36,.07,.40,C.iron);}
  if(working){
    // Scaffold remains inside the pitch and leaves the centre entrance clear.
    for(const x of[-3.74,-1.18,1.18,3.74])v.block(x,.14,2.31,.08,4.25,.08,C.oak);
    for(const y of[1.25,2.75,4.05])for(const side of[-1,1]){v.block(side*2.43,y,2.30,2.63,.10,.11,C.oak);for(let x=1.22;x<3.70;x+=.25)v.block(side*x,y+.10,2.20,.24,.06,.36,C.timber);}
    for(let i=0;i<10;i++){v.block(3.58,.30+i*.30,1.70,.06,.25,.07,C.oak);v.block(3.28,.30+i*.30,1.70,.06,.25,.07,C.oak);v.block(3.43,.29+i*.30,1.70,.35,.06,.08,C.edge);}
  }
  if(restored){
    for(const side of[-1,1]){
      lantern(v,side*1.08,1.93,2.25,.75);pumpkin(v,side*2.52,2.07,.27+tier*.012);
      v.block(side*3.42,.16,1.98,.42,.56,.22,C.stone);v.block(side*3.42,.72,1.98,.29,.13,.23,C.edge);
      v.block(side*3.42,.34,2.11,.035,.23,.02,C.dark);v.block(side*3.42,.49,2.11,.17,.035,.02,C.dark);
      for(let i=0;i<9;i++){const x=side*(3.46+Math.sin(i)*.09),y=.3+i*.35;v.block(x,y,2.10,.055,.37,.055,C.moss);if(i%2)v.block(x-side*.12,y+.12,2.12,.19,.08,.07,C.leaf);}
    }
    if(tier>=2){
      // The second reception gains a covered portico and pendant lantern.
      for(const x of[-1.13,1.13]){v.block(x,.25,2.25,.15,2.78,.16,C.stone);v.block(x,.25,2.25,.29,.16,.28,C.edge);v.block(x,2.83,2.25,.29,.14,.28,C.gold);}
      v.block(0,2.99,2.12,2.62,.13,.65,C.timber);for(let i=0;i<6;i++)v.block(0,3.11+i*.09,2.12,2.70-i*.40,.11,.65,tier>=4?C.gold:C.roof);
      lantern(v,0,2.55,2.29,.52);
    }
    if(tier===3){
      tower(v,r,0,-.44,h,7.55,tier);
      v.block(0,5.68,.34,1.09,1.09,.09,C.gold);v.block(0,5.76,.40,.92,.92,.06,C.iron);
      for(let i=0;i<12;i++){const a=i*Math.PI/6;v.block(Math.sin(a)*.36,6.19+Math.cos(a)*.36,.45,.055,.055,.035,C.cream);}
      v.block(0,6.01,.47,.045,.28,.025,C.gold);v.block(.10,6.18,.47,.25,.045,.025,C.gold);
    }
    if(tier>=4){
      for(const side of[-1,1]){
        tower(v,r,side*2.75,-.70,h,tier===5?7.78:7.50,tier);
        // A stone gargoyle and ledge below each tower, small enough to read.
        v.block(side*3.36,3.32,2.07,.52,.15,.41,C.stone);v.block(side*3.36,3.47,2.07,.29,.31,.29,C.edge);
        v.block(side*3.36,3.75,2.13,.34,.23,.33,C.stone);for(const dx of[-.08,.08])v.block(side*3.36+dx,3.86,2.31,.04,.045,.025,C.amber,true);
        v.block(side*3.36,3.58,2.07,.64,.08,.18,C.dark);
      }
      const dormerY=h+(2.32-1.03)*.67+.02;
      dormer(v,-1.52,dormerY,1.03,tier);dormer(v,1.52,dormerY,1.03,tier);
      skull(v,0,3.67,2.30,.60);
    }
    if(tier>=5){
      dormer(v,0,h+(2.32-.10)*.67+.02,.10,tier);
      for(const side of[-1,1]){
        const x=side*2.18;v.block(x,3.18,2.17,1.50,.13,.46,C.stone);
        for(let u=-.65;u<=.66;u+=.18)v.block(x+u,3.31,2.37,.035,.52,.035,C.gold);
        v.block(x,3.83,2.37,1.50,.06,.055,C.gold);
        for(let y=.35;y<3.10;y+=.29)v.block(side*3.70,y,1.56,.22,.16,.44,C.gold);
      }
      // A crowned ridge and broad pierced ironwork make the last tier a
      // different roofline, rather than just adding more window brightness.
      for(let x=-2.0;x<=2.01;x+=.25){v.block(x,roofPeak+.04,0,.035,.31,.045,C.iron);v.block(x,roofPeak+.34,0,.13,.05,.07,C.gold);}
      v.block(0,roofPeak+.36,0,.07,.35,.07,C.gold);v.block(0,roofPeak+.63,0,.31,.05,.05,C.gold);
    }
  }
  cobweb(v,-3.34,h-.22,2.20,.64,1);cobweb(v,3.34,h-.22,2.20,.53,-1);
  if(!restored){cobweb(v,-.73,2.55,2.43,.42,1);v.block(-3.45,.15,2.05,.55,.08,.29,C.moss);}
  const group=v.build();group.name="The Hollow House · "+spec.appearance;
  const shutters=restored?windows.flatMap(p=>[-1,1].map(side=>({x:p.x+side*.67,y:p.y-.08,z:p.z+.16,width:.46,height:1.55,side}))):[];
  group.userData={status,tier,appearance:spec.appearance,door:{x:0,y:1.3,z:2.4},sign:{x:0,y:4.25,z:2.33},footprint:{w:8,d:5},
    exteriorSockets:{windows,shutters,ghost:{x:2.18,y:1.65,z:2.17},door:{x:0,y:1.3,z:2.4},roof:{x:0,y:roofPeak,z:0}},
    exteriorBudget:{solid:v.solid.length,glow:v.glow.length,boxes:v.solid.length+v.glow.length}};
  return group;
}
