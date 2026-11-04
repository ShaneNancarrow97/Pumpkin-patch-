import * as THREE from "three";
import { buildModel } from "./decor-models/kit.js";
import { meshGrid, voxelGroup } from "./voxel-mesh.js";
import { HOUSEHOLD_BY_ID } from "./content/household-catalog.js";
import { HOUSEHOLD_SIZES } from "./content/household-sizes.js";

// Forty voxels to a world unit: the same fine, exposed-face construction as the
// existing furniture. Every object has a solid back, sides and underside.
const PX = 40, S = 1 / PX;
const C = { cream:0xe5d6bb, light:0xf1e7d5, plum:0x69425f, velvet:0x916581,
  dark:0x29232e, black:0x191b25, brass:0xb99255, gold:0xdec080, copper:0xad7048,
  wood:0x684630, edge:0x946743, walnut:0x432f29, silver:0x8997a4, glass:0x526580,
  glint:0xb0c8d7, lavender:0xac98ba, green:0x6d8757, orange:0xc9793a, cocoa:0x53392d };
function kit(k) {
  const p = a => a.map(v => v * PX);
  return {
    box:(a,b,c,d,e,f,col,o)=>k.box(a*PX,b*PX,c*PX,d*PX,e*PX,f*PX,col,o),
    ball:(a,b,c,d,e,f,col,o)=>k.ball(a*PX,b*PX,c*PX,d*PX,e*PX,f*PX,col,o),
    cyl:(a,b,r,col,o)=>k.cyl(p(a),p(b),Array.isArray(r)?p(r):r*PX,col,o),
    lathe:(x,z,y0,y1,r,col,o)=>k.lathe(x*PX,z*PX,y0*PX,y1*PX,Array.isArray(r)?r.map(([t,v])=>[t,v*PX]):r*PX,col,o),
    shape:(a,b,c,d,e,f,fn,col,o)=>k.shape(a*PX,b*PX,c*PX,d*PX,e*PX,f*PX,(x,y,z)=>fn(x/PX,y/PX,z/PX),col,o),
    carve:(a,b,c,d,e,f,fn=()=>true)=>k.carve(a*PX,b*PX,c*PX,d*PX,e*PX,f*PX,(x,y,z)=>fn(x/PX,y/PX,z/PX)),
    grain:col=>k.vary(col,.045,4),
  };
}
function ring(k,x,y,z,rx,ry,depth,col,thick=.04) {
  k.shape(x-rx,y-ry,z,x+rx,y+ry,z+depth,(a,b)=>((a-x)/rx)**2+((b-y)/ry)**2<=1&&((a-x)/(rx-thick))**2+((b-y)/(ry-thick))**2>=1,col);
}
function moon(k,x,y,z,r,col=C.gold) {
  k.shape(x-r,y-r,z,x+r,y+r,z+.025,(a,b)=>(a-x)**2+(b-y)**2<r*r&&(a-x-r*.4)**2+(b-y-r*.15)**2>(r*.85)**2,col);
}
function star(k,x,y,z,r,col=C.gold) {
  k.box(x-r,y-.0125,z,x+r,y+.0125,z+.025,col);k.box(x-.0125,y-r,z,x+.0125,y+r,z+.025,col);
}
function feet(k,w,d,h=.1,col=C.walnut) {
  for(const x of [.1,w-.1])for(const z of [.1,d-.1])k.box(x-.04,0,z-.04,x+.04,h,z+.04,col);
}
// These are modelled profiles, not image decals: rolled rims, mouldings and
// turned hardware remain readable when the furniture is viewed from behind.
function ovalRim(k,x,z,y,rx,rz,t,col,height=.025) {
  k.shape(x-rx,y,z-rz,x+rx,y+height,z+rz,(a,b,c)=>
    ((a-x)/rx)**2+((c-z)/rz)**2<=1&&((a-x)/(rx-t))**2+((c-z)/(rz-t))**2>=1,col);
}
function turnedFoot(k,x,z,y,h,r,col=C.walnut) {
  k.lathe(x,z,y,y+h,[[0,r*.8],[.12,r],[.3,r*.72],[.52,r*.48],[.72,r*.75],[1,r*.9]],col);
}
function frontPanel(k,x0,x1,y0,y1,z,col=C.walnut) {
  k.box(x0,y0,z,x1,y1,z+.025,col);
  for(const x of [x0,x1-.025])k.box(x,y0,z+.025,x+.025,y1,z+.05,C.edge);
  for(const y of [y0,y1-.025])k.box(x0,y,z+.025,x1,y+.025,z+.05,C.edge);
}
function tapCross(k,x,y,z) {
  k.lathe(x,z,y-.025,y,.04,C.brass);k.ball(x,y+.015,z,.025,.025,.025,C.light);
  k.cyl([x-.06,y,z],[x+.06,y,z],.015,C.brass);
  k.cyl([x,y,z-.06],[x,y,z+.06],.015,C.brass);
}
function cup(k,w,h,d,col,ghost=false) {
  const x=w*.43,z=d*.5,r=Math.min(w*.34,d*.46);
  k.lathe(x,z,.025,h-.04,[[0,r*.83],[.15,r],[1,r]],col);
  k.lathe(x,z,h-.06,h-.025,r*.8,C.cocoa);
  ring(k,w*.81,h*.53,z-.035,.065,.1,.07,col,.025);
  k.lathe(x,z,0,.03,r*.8,C.brass);
  ovalRim(k,x,z,h-.05,r,r,.025,C.light);
  k.box(x-r*.5,.075,z+r-.025,x-r*.25,h*.65,z+r,C.light);
  if(ghost){for(const dx of [-.05,.045]){k.ball(x+dx,h-.04,z,.035,.05,.035,C.light);k.box(x+dx-.015,h-.03,z+.025,x+dx+.015,h-.005,z+.05,C.dark);}}
  else moon(k,x,h*.51,d*.5+r-.005,.06,col===C.plum?C.cream:C.plum);
}
function machine(k,w,h,d,dryer=false) {
  const enamel=dryer?C.cream:C.plum;
  feet(k,w,d,.075);k.box(.025,.075,.025,w-.025,h,d-.025,enamel,{round:2});
  // Pressed side panels, top seam and plinth make a convincing freestanding
  // appliance from every room angle, while retaining its flat usable top.
  for(const x of [.025,w-.05]){
    k.box(x,.2,.15,x+.025,h-.225,d-.15,dryer?0xd2c3aa:0x57354f);
    for(const z of [.18,d-.2])k.box(x,.25,z,x+.025,h-.275,z+.025,dryer?C.light:C.velvet);
  }
  k.box(.025,.075,.025,w-.025,.125,d-.025,C.dark);
  k.box(.05,.125,d-.05,w-.05,.175,d-.025,C.brass);
  k.box(.025,h-.19,d-.045,w-.025,h-.025,d,C.cream);
  k.box(.065,h-.15,d-.015,.33,h-.065,d,C.dark);
  k.box(.09,h-.12,d-.01,.25,h-.095,d,C.lavender);
  k.box(.09,h-.18,d-.025,.3,h-.16,d,C.brass);
  ring(k,.49,h-.105,d-.025,.06,.06,.025,C.brass,.025);
  k.ball(.49,h-.105,d-.01,.035,.035,.025,C.cream);
  k.box(.48,h-.14,d-.01,.505,h-.105,d,C.dark);
  for(const x of [.67,.76])k.ball(x,h-.1,d-.01,.025,.025,.025,x===.67?C.green:C.brass);
  k.box(.04,h-.025,.025,w-.04,h,d-.025,C.light);
  k.shape(.1,.14,d-.04,w-.1,h-.22,d,(x,y)=>((x-w/2)/.31)**2+((y-.46)/.31)**2<1,C.dark);
  ring(k,w/2,.46,d-.025,.315,.315,.025,C.silver,.065);
  ring(k,w/2,.46,d-.005,.255,.255,.015,C.brass,.025);
  // Offset curved highlights suggest smoked glass without transparent panes.
  k.shape(.15,.16,d-.025,w-.15,.76,d,(x,y)=>((x-w/2)/.29)**2+((y-.46)/.29)**2<1&&Math.abs(x-(.26+(y-.25)*.2))<.02,C.glint);
  k.box(w-.16,.43,d-.01,w-.08,.55,d+.001,C.cream);
  for(const x of [.1,.16,.22])k.box(x,.09,d-.015,x+.025,.14,d,C.dark);
}
function tv(k,w,h,d,wall=false) {
  const bottom=wall?.025:.125;
  if(!wall){for(const x of [.15,w-.15]){k.box(x-.04,0,.15,x+.04,.15,d-.1,C.walnut);k.box(x-.1,0,.1,x+.1,.025,d-.05,C.dark);}}
  k.box(.025,bottom,wall?0:.075,w-.025,h-.075,d-.025,k.grain(C.wood),{round:2});
  // Real walnut cabinet cap, joints, back cover and cooling slots.
  k.box(.025,h-.125,wall?0:.075,w-.025,h-.075,d-.025,C.edge);
  k.box(.05,bottom+.025,wall?0:.075,w-.05,bottom+.075,d-.05,C.walnut);
  if(!wall){
    k.box(.1,bottom+.08,.05,w-.1,h-.15,.075,C.walnut);
    for(let x=.2;x<w-.15;x+=.1)k.carve(x,bottom+.18,.04,x+.025,h-.23,.09);
    for(const x of [.1,w-.125])for(const y of [bottom+.1,h-.175])k.box(x,y,.05,x+.025,y+.025,.075,C.brass);
  }
  k.box(.05,bottom+.025,d-.05,w-.05,h-.1,d,C.brass);
  k.box(.075,bottom+.05,d-.025,w-.075,h-.125,d,C.dark);
  const x1=w-.25;
  k.box(.1,bottom+.075,d-.025,x1,h-.15,d,C.black);
  for(const y of [bottom+.2,bottom+.4])k.ball(w-.15,y,d-.005,.045,.045,.025,C.brass);
  for(const y of [bottom+.2,bottom+.4])k.box(w-.16,y-.025,d-.005,w-.135,y+.015,d,C.dark);
  for(let i=0;i<5;i++)k.box(w-.21,bottom+.52+i*.025,d-.005,w-.09,bottom+.532+i*.025,d,C.walnut);
  if(!wall){k.cyl([w*.4,h-.075,d*.4],[w*.35,h,d*.4],.0125,C.brass);k.cyl([w*.6,h-.075,d*.4],[w*.65,h,d*.4],.0125,C.brass);}
}

const draws = {
  "rotary-phone"(k,w,h,d){
    k.box(.025,0,.025,w-.025,.15,d-.025,C.plum,{round:2});
    k.box(.05,.025,.025,w-.05,.05,d-.025,C.brass);
    k.box(.05,.05,d-.05,w-.05,.1,d-.025,C.velvet);
    k.lathe(w/2,d*.64,.13,.175,.13,C.brass);k.lathe(w/2,d*.64,.175,.2,.095,C.dark);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;k.lathe(w/2+Math.cos(a)*.09,d*.64+Math.sin(a)*.09,.19,.215,.018,C.cream);}
    for(const x of [.1,w-.1])k.box(x-.035,.12,.06,x+.035,.3,.16,C.brass);
    k.cyl([.1,.31,.1],[w-.1,.31,.1],.055,C.dark);
    for(const x of [.1,w-.1])k.ball(x,.29,.1,.075,.075,.085,C.plum);
    for(let y=.07;y<.29;y+=.04)ring(k,w-.04,y,d*.57,.035,.022,.025,C.dark,.015);
    // Shaped receiver caps and the small ivory number card below the dial.
    for(const x of [.1,w-.1])k.lathe(x,.1,.3,.35,.055,C.brass);
    k.box(w/2-.085,.12,d-.05,w/2+.085,.145,d-.025,C.cream);
    k.box(w/2-.045,.145,d-.05,w/2+.045,.16,d-.025,C.walnut);
  },
  "knife-block"(k,w,h,d){
    k.box(.025,0,.05,w-.025,.35,d-.025,k.grain(C.wood));k.box(.025,.3,.05,w-.025,.375,d-.025,C.edge);
    for(let i=0;i<5;i++){const x=.07+i*.06,top=h-.03-(i%2)*.08;k.box(x,.33,.17,x+.025,top-.14,.25,C.silver);k.box(x-.015,top-.16,.15,x+.04,top,.27,C.dark);k.box(x-.015,top-.035,.15,x+.04,top-.01,.27,C.brass);}
    k.box(.07,.06,d-.025,w-.07,.11,d,C.copper);
    for(const x of [.095,.275])k.box(x,.075,d-.025,x+.025,.1,d,C.gold);
    for(const z of [.09,.3])k.box(.025,.05,z,.05,.28,z+.025,C.edge);
  },
  "cat-figure"(k,w,h,d){
    k.ball(w/2,.15,d/2,.08,.14,.075,C.dark);k.ball(w/2,.3,d/2,.105,.09,.085,C.dark);
    for(const x of [w*.29,w*.71])k.cyl([x,.33,d/2],[x,.415,d/2], [.045,.005],C.dark);
    for(const x of [w*.36,w*.64])k.box(x-.0125,.3,d*.8,x+.0125,.325,d*.89,C.gold);
    k.cyl([w*.67,.08,d*.37],[w*.87,.2,d*.35],.025,C.dark);k.cyl([w*.87,.2,d*.35],[w*.75,.29,d*.35],.025,C.dark);
    k.box(w*.34,0,.12,w*.66,.035,.24,C.brass);
  },
  "ghost-figure"(k,w,h,d){
    k.ball(w/2,.24,d/2,.12,.17,.12,C.cream);k.box(.04,.035,.04,w-.04,.19,d-.04,C.cream);
    for(const x of [.07,.15,.23])k.ball(x,.055,d*.55,.045,.045,.07,C.light);
    for(const x of [.105,.195])k.box(x-.015,.24,d-.04,x+.015,.3,d-.015,C.dark);
    k.box(.135,.18,d-.035,.165,.205,d-.01,C.dark);
  },
  "witch-hat"(k,w,h,d){
    k.lathe(w/2,d/2,0,.05,.19,C.plum);
    k.lathe(w/2,d/2,.05,h-.04,[[0,.14],[.6,.06],[1,.025]],C.plum);
    k.cyl([w/2,h-.1,d/2],[w*.7,h-.025,d/2],.035,C.plum);
    k.lathe(w/2,d/2,.09,.14,.12,C.copper);k.box(.155,.09,d*.8,.245,.16,d*.9,C.brass);k.box(.18,.11,d*.84,.22,.14,d*.94,C.dark);
  },
  "jack-o-lantern"(k,w,h,d){
    k.ball(w/2,.18,d/2,.185,.17,.185,C.orange,{ribs:[10,.07]});
    k.lathe(w/2,d/2,.33,.41,[[0,.04],[1,.025]],C.green);
    for(const x of [.13,.27])k.shape(x-.035,.2,d-.06,x+.035,.27,d-.01,(a,b)=>Math.abs(a-x)<(b-.195)*.6,C.gold,{glow:true});
    k.shape(.1,.09,d-.06,.3,.17,d-.01,(a,b)=>b>.1+Math.abs(a-.2)*.35,C.gold,{glow:true});
  },
  "folded-towels"(k,w,h,d){
    for(let i=0;i<3;i++){const col=[C.plum,C.cream,C.lavender][i],y=i*.085;k.box(.025,y,.025,w-.025,y+.075,d-.025,col,{round:1});k.box(.05,y+.045,d-.04,w-.05,y+.065,d-.015,i===1?C.brass:C.cream);}
    for(const x of [.1,w-.125])k.box(x,.25,.05,x+.025,h,d-.05,C.cream);
    for(let x=.1;x<w-.1;x+=.1)k.box(x,.16,d-.025,x+.025,.175,d,C.velvet);
  },
  "laptop"(k,w,h,d){
    k.box(.025,0,.025,w-.025,.055,d-.025,C.silver);k.box(.05,.055,.12,w-.05,.07,d-.15,C.dark);
    for(let r=0;r<4;r++)for(let c=0;c<9;c++)k.box(.08+c*.075,.065,.15+r*.055,.13+c*.075,.08,.185+r*.055,C.lavender);
    k.box(w*.36,.055,d-.14,w*.64,.075,d-.04,C.plum);
    k.box(.025,.05,.025,w-.025,h-.025,.085,C.plum);k.box(.075,.12,.075,w-.075,h-.075,.1,C.dark);
    moon(k,w/2,h*.63,.1,.12,C.gold);star(k,w*.7,h*.7,.1,.04,C.cream);
    // Separate display hinge, camera dot, port cut-outs and a bevelled palm
    // rest keep this an object rather than a flat screen stuck on a box.
    for(const x of [.14,w-.2])k.cyl([x,.08,.09],[x+.06,.08,.09],.025,C.brass);
    k.box(w/2-.0125,h-.065,.075,w/2+.0125,h-.04,.1,C.glint);
    k.box(.05,.025,d-.05,w-.05,.05,d-.025,C.light);
    for(const z of [.2,.32,.44])k.carve(0,.025,z,.05,.05,z+.05);
    k.box(w*.4,.07,d-.13,w*.6,.08,d-.06,C.silver);
    for(const x of [.08,w-.1])for(let z=.15;z<d-.15;z+=.05)k.box(x,.065,z,x+.025,.08,z+.025,C.brass);
  },
  "pedal-bin"(k,w,h,d){
    k.lathe(w/2,d/2,.025,h-.1,[[0,.23],[1,.25]],C.plum);
    k.lathe(w/2,d/2,h-.1,h-.05,.26,C.copper);k.ball(w/2,h-.06,d/2,.25,.06,.25,C.copper);
    k.box(w*.35,0,d-.1,w*.65,.075,d,C.dark);k.box(.08,h-.12,.08,.16,h-.045,.16,C.brass);
    for(const a of [0,1,2,3,4,5]){const theta=a*Math.PI/3;k.cyl([w/2+Math.cos(theta)*.23,.08,d/2+Math.sin(theta)*.23],[w/2+Math.cos(theta)*.245,h-.15,d/2+Math.sin(theta)*.245],.0125,C.copper);}
  },
  "toaster"(k,w,h,d){
    k.box(.025,.025,.025,w-.025,h-.05,d-.025,C.plum,{round:3});k.box(.025,0,.025,w-.025,.05,d-.025,C.brass);
    for(const z of [.13,.28]){k.box(.1,h-.065,z-.035,w-.13,h-.025,z+.035,C.brass);k.box(.13,h-.055,z-.02,w-.16,h-.02,z+.02,C.dark);}
    k.box(w-.075,.1,d*.3,w-.025,h-.11,d*.7,C.dark);k.box(w-.065,.24,d*.25,w,.29,d*.75,C.copper);
    k.ball(.17,.13,d-.025,.04,.04,.025,C.brass);k.box(.28,.09,d-.025,.5,.12,d,C.walnut);
    // Raised enamel end cheeks, removable crumb drawer and marked browning
    // dial use the same copper hardware as the larger premium cooker.
    k.box(.025,.075,.05,.05,h-.1,d-.05,C.velvet);
    k.box(w-.05,.075,.05,w-.025,h-.1,d-.05,C.velvet);
    k.box(.08,.05,d-.025,w-.15,.075,d,C.silver);
    k.box(.27,.05,d-.025,.39,.1,d,C.brass);
    for(const x of [.105,.23])k.box(x,.12,d-.025,x+.025,.145,d,C.gold);
  },
  "kettle"(k,w,h,d){
    k.lathe(w*.45,d/2,.025,.38,[[0,.13],[.12,.16],[.3,.18],[.65,.18],[.9,.15],[1,.125]],C.copper);
    k.lathe(w*.45,d/2,.375,.4,.13,C.brass);k.ball(w*.45,.425,d/2,.035,.035,.035,C.dark);
    k.cyl([.1,.24,d/2],[.025,.38,d/2],[.06,.035],C.copper);
    k.cyl([.31,.3,d/2],[.45,.3,d/2],.035,C.dark);k.cyl([.45,.3,d/2],[.45,.54,d/2],.035,C.dark);k.cyl([.45,.54,d/2],[.2,.54,d/2],.035,C.dark);k.cyl([.2,.54,d/2],[.15,.39,d/2],.025,C.dark);
    k.lathe(w*.45,d/2,0,.03,.14,C.dark);
    ovalRim(k,w*.45,d/2,.075,.155,.155,.025,C.brass);
    ovalRim(k,w*.45,d/2,.35,.145,.145,.025,0xd49868);
    k.lathe(w*.45,d/2,.395,.4125,.1,C.light);
    k.ball(w*.45,.44,d/2,.04,.025,.04,C.walnut);
    for(const x of [.25,.425])k.ball(x,.38,d/2,.025,.025,.04,C.brass);
  },
  "cream-mug":(k,w,h,d)=>cup(k,w,h,d,C.cream),
  "plum-mug":(k,w,h,d)=>cup(k,w,h,d,C.plum),
  "ghost-mug":(k,w,h,d)=>cup(k,w,h,d,C.plum,true),
  "towel-rail"(k,w,h,d){
    for(const x of [.1,w-.1]){k.box(x-.05,.55,0,x+.05,.65,.05,C.brass);k.cyl([x,.6,.025],[x,.6,d-.025],.025,C.brass);}
    k.cyl([.1,.6,d-.025],[w-.1,.6,d-.025],.025,C.brass);
    k.box(.3,.1,d-.1,w-.3,.65,d-.05,C.plum);k.box(.3,.575,d-.1,w-.3,.675,d,C.velvet);
    for(const x of [.325,w-.35])k.box(x,.13,d-.075,x+.025,.575,d-.025,C.brass);
    k.box(.3,.1,d-.075,w-.3,.15,d-.025,C.cream);
    // Alternating raised folds and a stitched hem read as soft cloth rather
    // than a rigid rectangular placard hanging from the bar.
    for(let x=.35;x<w-.325;x+=.1)k.box(x,.15,d-.05,x+.025,.55,d-.025,C.velvet);
    for(let x=.325;x<w-.3;x+=.075)k.box(x,.125,d-.025,x+.025,.15,d,C.brass);
    for(const x of [.1,w-.1])k.ball(x,.6,.075,.05,.05,.025,C.gold);
  },
  "toilet"(k,w,h,d){
    k.lathe(w/2,d*.6,0,.2,[[0,.26],[.18,.29],[.4,.25],[1,.2]],C.cream,{depth:1.4});
    k.lathe(w/2,d*.64,.12,.5,[[0,.2],[.35,.17],[.65,.23],[1,.31]],C.cream,{depth:1.3});
    k.box(.1,.48,.32,w-.1,.65,d-.06,C.cream,{round:4});
    k.shape(.12,.64,.38,w-.12,.7,d-.075,(x,y,z)=>((x-w/2)/.28)**2+((z-d*.65)/.37)**2<1,C.wood);
    k.shape(.21,.66,.48,w-.21,.72,d-.17,(x,y,z)=>((x-w/2)/.18)**2+((z-d*.65)/.25)**2<1,C.dark);
    k.carve(.215,.49,.49,w-.215,.75,d-.18,(x,y,z)=>((x-w/2)/.175)**2+((z-d*.65)/.245)**2<1);
    k.shape(.23,.475,.52,w-.23,.5,d-.2,(x,y,z)=>((x-w/2)/.16)**2+((z-d*.65)/.22)**2<1,C.glass);
    ovalRim(k,w/2,d*.65,.65,.28,.37,.045,C.edge);
    k.box(.1,.6,.025,w-.1,h-.05,.34,C.cream,{round:3});
    k.box(.075,h-.075,.025,w-.075,h,.35,C.light,{round:2});
    k.box(.125,h-.125,.025,w-.125,h-.1,.325,0xcbbb9e);
    k.box(.12,h-.22,.34,.25,h-.16,.365,C.brass);
    for(const x of [.22,w-.22])k.cyl([x,.67,.32],[x,.715,.32],.025,C.brass);
    for(const x of [.15,w-.15])k.ball(x,.075,d*.58,.025,.025,.025,C.brass);
  },
  "shower"(k,w,h,d){
    k.box(0,0,0,w,.1,d,C.cream,{round:2});k.box(.075,.1,.075,w-.075,.125,d-.075,C.light);
    // Opaque, softly tinted inset panes avoid transparency sorting artefacts.
    for(const x of [.025,w-.075])k.box(x,.1,.025,x+.05,h,d-.025,C.brass);
    for(const z of [.025,d-.075])k.box(.025,h-.05,z,w-.025,h,z+.05,C.brass);
    k.box(.075,.15,.025,w-.075,h-.075,.05,C.glass);
    k.box(.025,.15,.075,.05,h-.075,d-.075,C.glass);
    // A half-open sliding door reveals the mixer, tray and rain rose. Frosted
    // opaque panes avoid the sorting artefacts of transparent voxel walls.
    k.box(.075,.15,d-.05,w*.49,h-.075,d-.025,C.glass);
    k.box(w*.49,.125,d-.05,w*.515,h-.05,d,C.brass);
    for(const y of [.15,h-.1])k.box(.025,y,d-.075,w-.025,y+.025,d,C.brass);
    k.box(.125,.25,d-.025,.15,h-.3,d,C.glint);
    for(let y=.4;y<h-.3;y+=.225)k.box(.175,y,d-.025,w*.47,y+.025,d,0x66788c);
    k.cyl([w-.18,1,.18],[w-.18,h-.25,.18],.025,C.brass);k.cyl([w-.18,h-.25,.18],[w-.18,h-.25,d*.5],.025,C.brass);
    k.lathe(w-.18,d*.5,h-.3,h-.25,.13,C.brass);
    k.box(w-.28,.95,.12,w-.08,1.05,.22,C.brass);k.cyl([w-.15,1.03,.2],[w-.15,1.2,.4],.025,C.silver);
    k.cyl([w-.15,1.2,.4],[w-.15,1.55,.25],.025,C.brass);
    k.box(w*.42,.95,d-.025,w*.47,1.25,d+.001,C.brass);
    k.lathe(w*.65,d*.65,.125,.15,.09,C.silver);
    for(const dx of [-.045,.025])for(const dz of [-.045,.025])k.box(w*.65+dx,.1375,d*.65+dz,w*.65+dx+.025,.15,d*.65+dz+.025,C.dark);
    for(const y of [.55,1.35])k.box(w-.4,y,.06,w-.125,y+.05,.3,C.brass);
    k.box(w-.375,1.4,.075,w-.3,1.65,.15,C.plum);k.box(w-.25,1.4,.075,w-.175,1.575,.15,C.cream);
    for(const x of [.075,w-.1])k.box(x,.15,.075,x+.025,h-.1,.1,C.glint);
  },
  "clawfoot-bath"(k,w,h,d){
    for(const x of [.3,w-.3])for(const z of [.2,d-.2]){
      turnedFoot(k,x,z,.025,.3,.075,C.brass);
      for(const dx of [-.05,0,.05])k.ball(x+dx,.05,z+.05,.035,.04,.055,C.brass);
      k.ball(x,.225,z,.08,.07,.075,C.gold);
    }
    k.shape(.05,.25,.05,w-.05,.9,d-.05,(x,y,z)=>((x-w/2)/(.98-(.9-y)*.25))**2+((z-d/2)/(.5-(.9-y)*.2))**2<1,C.copper);
    k.shape(.1,.4,.1,w-.1,.95,d-.1,(x,y,z)=>((x-w/2)/.9)**2+((z-d/2)/.42)**2<1,C.cream);
    k.shape(.2,.55,.17,w-.2,1,d-.17,(x,y,z)=>((x-w/2)/.8)**2+((z-d/2)/.33)**2<1,C.glass);
    k.carve(.2,.65,.17,w-.2,1,d-.17,(x,y,z)=>((x-w/2)/.8)**2+((z-d/2)/.33)**2<1);
    ovalRim(k,w/2,d/2,.85,.975,.475,.075,C.light,.05);
    ovalRim(k,w/2,d/2,.825,.965,.465,.035,C.brass);
    ovalRim(k,w/2,d/2,.9,.94,.44,.045,C.cream,.025);
    k.cyl([w-.3,.7,.15],[w-.3,.97,.15],.03,C.brass);k.cyl([w-.3,.97,.15],[w-.3,.97,.35],.03,C.brass);
    for(const x of [w-.45,w-.15])tapCross(k,x,.925,.15);
    k.lathe(w*.4,d/2,.55,.575,.045,C.silver);
    // A slim wooden bath bridge and folded towel make the silhouette feel
    // lived in without filling the tub or extending its collision envelope.
    for(const x of [.55,.675])k.box(x,.925,.11,x+.075,.95,d-.11,k.grain(C.wood));
    k.box(.525,.95,.2,.775,.975,.45,C.plum);k.box(.55,.95,.45,.75,.975,.5,C.cream);
    moon(k,w/2,.55,d-.125,.09,C.gold);
  },
  "basin"(k,w,h,d){
    k.lathe(w/2,d/2,0,.8,[[0,.2],[.08,.23],[.18,.19],[.4,.12],[.72,.14],[1,.21]],C.cream,{depth:.8});
    k.lathe(w/2,d/2,.75,.95,[[0,.28],[.7,.41],[1,.425]],C.cream,{depth:.72});
    ovalRim(k,w/2,d/2,.925,.425,.3,.05,C.light,.05);
    k.shape(.13,.88,.12,w-.13,1.03,d-.1,(x,y,z)=>((x-w/2)/.3)**2+((z-d/2)/.22)**2<1,C.glass);
    k.carve(.13,.94,.12,w-.13,1.1,d-.1,(x,y,z)=>((x-w/2)/.3)**2+((z-d/2)/.22)**2<1);
    k.cyl([w/2,.95,.08],[w/2,1.075,.08],.025,C.brass);k.cyl([w/2,1.075,.08],[w/2,1.075,.25],.025,C.brass);
    for(const x of [.22,w-.22])tapCross(k,x,1,.09);
    k.lathe(w/2,d/2,.88,.9,.04,C.silver);
    k.box(w/2-.025,.925,.1,w/2+.025,.95,.125,C.dark);
    ovalRim(k,w/2,d/2,.05,.2,.16,.025,C.light);
  },
  "bath-mat"(k,w,h,d){
    k.box(.025,0,.025,w-.025,.025,d-.025,C.plum);k.box(.05,.025,.05,w-.05,h,d-.05,C.velvet);
    k.shape(w/2-.17,.025,d/2-.17,w/2+.17,h,d/2+.17,(x,y,z)=>(x-w/2)**2+(z-d/2)**2<.17**2&&(x-w/2-.07)**2+(z-d/2+.04)**2>.145**2,C.cream);
    for(let x=.05;x<w-.05;x+=.1)for(const z of [.025,d-.05])k.box(x,0,z,x+.05,.025,z+.025,C.cream);
    for(const z of [.1,d-.125])for(let x=.1;x<w-.1;x+=.1)k.box(x,.025,z,x+.05,h,z+.025,C.brass);
  },
  "moth-rug"(k,w,h,d){
    k.lathe(w/2,d/2,0,h,.98,C.plum);k.lathe(w/2,d/2,.025,h,.9,C.brass);k.lathe(w/2,d/2,.025,h,.85,C.dark);
    for(const s of [-1,1])k.shape(.35,.025,.5,w-.35,h,d-.5,(x,y,z)=>{const a=(x-w/2)*s;return a>.04&&a<.57&&Math.abs(z-d/2)<.4-a*.3;},C.velvet);
    k.box(w/2-.04,.025,.6,w/2+.04,h,1.4,C.cream);
    for(const x of [.6,1.4])k.lathe(x,1,.025,h,.1,C.gold);
    for(let i=0;i<16;i++){const a=i*Math.PI/8;k.lathe(w/2+Math.cos(a)*.94,d/2+Math.sin(a)*.94,.025,h,.025,C.cream);}
  },
  "hall-runner"(k,w,h,d){
    k.box(0,0,0,w,.025,d,C.plum);k.box(.075,.025,.075,w-.075,h,d-.075,C.brass);k.box(.1,.025,.1,w-.1,h,d-.1,C.dark);
    for(let z=.4;z<d;z+=.55){k.box(w/2-.1,.025,z-.025,w/2+.1,h,z+.025,C.cream);k.box(w/2-.025,.025,z-.1,w/2+.025,h,z+.1,C.cream);}
    for(let x=.075;x<w-.05;x+=.075)for(const z of [0,d-.05])k.box(x,0,z,x+.025,h,z+.05,C.cream);
  },
  "pumpkin-rug"(k,w,h,d){
    k.box(.025,0,.025,w-.025,.025,d-.025,C.cream);k.box(.1,.025,.1,w-.1,h,d-.1,C.plum);
    for(const dx of [-.16,0,.16])k.shape(w/2-.4,.025,d/2-.3,w/2+.4,h,d/2+.3,(x,y,z)=>((x-w/2-dx)/.24)**2+((z-d/2)/.3)**2<1,dx===0?C.orange:C.copper);
    k.box(w/2-.04,.025,d/2-.4,w/2+.04,h,d/2-.25,C.green);
  },
  "television":(k,w,h,d)=>tv(k,w,h,d),
  "wall-television":(k,w,h,d)=>tv(k,w,h,d,true),
  "guitar"(k,w,h,d){
    k.box(.08,0,.05,w-.08,.05,d-.05,C.dark);k.cyl([w/2,0,.1],[w/2,.5,.25],.025,C.brass);
    k.ball(w/2,.44,.27,.25,.3,.1,C.wood);k.ball(w/2,.68,.27,.19,.22,.09,C.edge);
    k.box(w/2-.045,.65,.225,w/2+.045,1.45,.3,C.walnut);k.box(w/2-.075,1.4,.225,w/2+.075,h-.025,.325,C.wood);
    ring(k,w/2,.64,.36,.095,.095,.025,C.brass,.025);k.ball(w/2,.64,.37,.065,.065,.0125,C.dark);
    k.box(w/2-.1,.3,.37,w/2+.1,.35,.4,C.walnut);
    for(let i=0;i<4;i++)k.box(w/2-.04+i*.025,.33,.375,w/2-.03+i*.025,h-.12,.4,i%2?C.brass:C.silver);
    for(let y=.85;y<1.4;y+=.075)k.box(w/2-.05,y,.3,w/2+.05,y+.015,.325,C.silver);
    for(const x of [w/2-.1,w/2+.1])for(const y of [1.45,1.55])k.ball(x,y,.275,.025,.025,.025,C.brass);
    // Layered binding follows the real waisted body; the rosette, scratchplate,
    // strings and fret markers are inlaid voxels rather than front-facing art.
    k.shape(.08,.14,.345,w-.08,.87,.37,(x,y)=>
      (((x-w/2)/.235)**2+((y-.44)/.285)**2<1||((x-w/2)/.175)**2+((y-.68)/.2)**2<1),C.brass);
    k.shape(.1,.16,.37,w-.1,.85,.385,(x,y)=>
      (((x-w/2)/.21)**2+((y-.44)/.26)**2<1||((x-w/2)/.15)**2+((y-.68)/.175)**2<1),C.edge);
    ring(k,w/2,.64,.38,.11,.11,.025,C.cream,.025);
    k.ball(w/2,.64,.4,.065,.065,.0125,C.dark);
    k.shape(w/2+.035,.39,.385,w/2+.15,.65,.41,(x,y)=>(x-w/2-.055)**2+(y-.57)**2<.13**2,C.walnut);
    for(const x of [w/2-.0375,w/2+.0125])k.box(x,.34,.4,x+.025,h-.13,.425,C.silver);
    for(const y of [.93,1.08,1.23])k.box(w/2-.0125,y,.3,w/2+.0125,y+.025,.325,C.cream);
    for(const x of [w/2-.06,w/2+.06])for(const y of [1.44,1.5,1.56])k.ball(x,y,.325,.02,.02,.02,C.gold);
  },
  "piano"(k,w,h,d){
    for(const x of [.15,w-.15])for(const z of [.13,.75])turnedFoot(k,x,z,0,.2,.065,C.walnut);
    k.box(.05,.15,.025,w-.05,h-.05,.55,k.grain(C.walnut));k.box(.025,h-.075,.025,w-.025,h,.6,C.edge);
    k.box(.1,.75,.5,w-.1,.85,.85,C.wood);k.box(.1,.83,.52,w-.1,.87,.85,C.cream);
    for(let i=0;i<29;i++){const x=.13+i*.06;k.box(x,.865,.55,x+.015,.875,.84,C.walnut);if(![2,6].includes(i%7))k.box(x+.025,.875,.55,x+.06,.91,.72,C.dark);}
    for(const x of [.15,w-.15])k.box(x-.05,.15,.65,x+.05,.84,.85,C.walnut);
    k.box(.12,.93,.55,w-.12,h-.14,.6,C.wood);k.box(.18,1.02,.6,w-.18,h-.2,.625,C.plum);moon(k,w/2,1.24,.625,.1);
    for(const x of [.8,1,1.2])k.box(x,.1,.5,x+.05,.14,.8,C.brass);
    k.box(.65,.4,.78,1.35,.475,.9,C.plum);for(const x of [.7,1.3])k.box(x-.035,0,.8,x+.035,.4,.87,C.walnut);
    // Recessed lower cabinet panels, moulded cap and carved pointed arches
    // visually connect the instrument to the earlier premium manor furniture.
    for(const [a,b] of [[.16,.91],[1.09,w-.16]]){
      frontPanel(k,a,b,.24,.69,.525,C.wood);
      const mid=(a+b)/2;
      k.cyl([a+.075,.32,.575],[a+.075,.55,.575],.0125,C.brass);
      k.cyl([a+.075,.55,.575],[mid,.65,.575],.0125,C.brass);
      k.cyl([mid,.65,.575],[b-.075,.55,.575],.0125,C.brass);
      k.cyl([b-.075,.55,.575],[b-.075,.32,.575],.0125,C.brass);
    }
    k.box(.025,h-.125,.025,w-.025,h-.1,.6,C.brass);
    k.box(.075,h-.05,.05,w-.075,h-.025,.55,C.walnut);
    for(const x of [.1,w-.15]){
      k.lathe(x,.575,.93,1.4,[[0,.04],[.2,.05],[.4,.025],[.8,.03],[1,.045]],C.brass);
      k.ball(x,1.425,.575,.045,.04,.035,C.gold);
    }
    // Two tiny open pages on the actual music ledge.
    k.box(.69,1.04,.635,.99,1.325,.66,C.cream);k.box(1.015,1.04,.635,1.315,1.325,.66,C.light);
    for(const [a,b] of [[.735,.95],[1.06,1.275]])for(let y=1.1;y<1.3;y+=.05)k.box(a,y,.66,b,y+.0125,.685,C.walnut);
    for(const x of [.8,1.125])k.box(x,1.14,.66,x+.025,1.225,.685,C.dark);
    k.box(.675,.425,.875,1.325,.45,.9,C.velvet);
    for(const x of [.7,1.3])k.lathe(x,.835,0,.4,[[0,.035],[.15,.045],[.5,.025],[1,.035]],C.walnut);
  },
  "laundry-hamper"(k,w,h,d){
    k.box(.025,0,.025,w-.025,h-.075,d-.025,C.edge,{round:2});
    for(let y=.05;y<h-.1;y+=.075)for(const z of [.025,d-.05])k.box(.025,y,z,w-.025,y+.025,z+.025,C.brass);
    for(let x=.05;x<w;x+=.075)for(const z of [.02,d-.04])k.box(x,0,z,x+.025,h-.1,z+.025,C.wood);
    for(let z=.05;z<d;z+=.075)for(const x of [.025,w-.05])k.box(x,0,z,x+.025,h-.1,z+.025,C.brass);
    k.box(.025,h-.1,.025,w-.025,h-.025,d-.025,C.cream);k.box(.05,h-.025,.05,w-.05,h,d-.05,C.edge);
    k.box(w/2-.075,h-.01,d/2-.025,w/2+.075,h,d/2+.025,C.walnut);
    for(const x of [.025,w-.05])k.box(x,h-.3,d*.35,x+.025,h-.2,d*.65,C.walnut);
    k.box(.075,h-.1,d-.05,w-.075,h-.075,d-.025,C.lavender);
  },
  "washing-machine":(k,w,h,d)=>machine(k,w,h,d),
  "dryer":(k,w,h,d)=>machine(k,w,h,d,true),
  "detergent"(k,w,h,d){
    k.box(.025,0,.025,w-.025,.375,d-.025,C.plum,{round:2});k.lathe(w/2,d/2,.35,.43,.065,C.plum);k.lathe(w/2,d/2,.425,.5,.075,C.brass);
    k.box(.05,.1,d-.04,w-.05,.29,d-.015,C.cream);moon(k,w/2,.2,d-.01,.055,C.plum);
  },
  "bath-mirror"(k,w,h,d){
    k.shape(0,0,0,w,h,d-.025,(x,y)=>((x-w/2)/(.45))**2+((y-h/2)/(.575))**2<=1,C.brass);
    k.shape(.06,.06,d-.05,w-.06,h-.06,d,(x,y)=>((x-w/2)/(.38))**2+((y-h/2)/(.5))**2<=1,C.glass);
    k.shape(.13,.15,d-.025,w-.13,h-.15,d,(x,y)=>Math.abs(x-.25-y*.1)<.025,C.glint);
    moon(k,w/2,h-.13,d-.01,.08,C.gold);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;k.ball(w/2+Math.cos(a)*.415,h/2+Math.sin(a)*.54,.075,.025,.025,.025,C.gold);}
    k.box(w/2-.025,.04,d-.025,w/2+.025,.13,d,C.gold);
  },
  "floating-shelf"(k,w,h,d){
    // A full, empty top with two carved brackets: all surface area is usable.
    k.box(.025,.45,.025,w-.025,.5,d-.025,C.wood);k.box(.025,.475,d-.05,w-.025,.5,d,C.edge);
    for(const x of [.15,w-.15]){k.box(x-.025,0,0,x+.025,.475,.05,C.walnut);k.cyl([x,.075,.05],[x,.45,d-.075],.025,C.brass);}
    k.box(.025,.5,0,w-.025,.55,.025,C.walnut);
    for(const x of [.15,w-.15]){
      k.ball(x,.1,.075,.04,.04,.04,C.gold);
      k.cyl([x,.1,.075],[x,.25,.075],.04,C.walnut);
      k.cyl([x,.25,.075],[x,.4,.3],[.04,.025],C.walnut);
    }
    for(let x=.25;x<w-.2;x+=.15)k.box(x,.45,d-.025,x+.05,.475,d,C.brass);
  },
  "coat-hooks"(k,w,h,d){
    k.box(.025,.1,0,w-.025,.45,.05,k.grain(C.wood));
    for(const x of [.2,.6,1]){k.ball(x,.3,.07,.05,.05,.025,C.brass);k.cyl([x,.3,.075],[x,.25,.2],.025,C.brass);k.cyl([x,.25,.2],[x,.4,.225],.025,C.brass);k.ball(x,.4,.225,.035,.035,.025,C.brass);}
    moon(k,w/2,.3,.05,.09,C.gold);
  },
  "records"(k,w,h,d){
    for(let i=0;i<3;i++){k.box(.025+i*.015,i*.035,.025,w-.025,i*.035+.025,d-.025,[C.plum,C.cream,C.lavender][i]);}
    k.lathe(w*.6,d*.5,.105,.125,.175,C.dark);k.lathe(w*.6,d*.5,.125,.15,.055,C.copper);
  },
  "bookend"(k,w,h,d){
    k.box(.025,0,.025,w-.025,.05,d-.025,C.brass);k.box(.025,.05,.025,.075,h-.025,d-.025,C.brass);
    moon(k,w*.52,h*.55,d-.08,.16,C.copper);k.box(.07,.05,d-.1,w-.025,.1,d-.025,C.copper);
  },
};

const cache = new Map();
function model(id) {
  if(cache.has(id))return cache.get(id);
  const item=HOUSEHOLD_BY_ID[id],draw=draws[id.replace(/^household-/,"")];
  if(!item||!draw)throw new RangeError("Unknown household prop: "+id);
  const recipe={width:Math.round(item.width*PX),height:Math.round(item.height*PX),depth:Math.round(item.depth*PX),
    build:k=>draw(kit(k),item.width,item.height,item.depth)};
  const pixels=Array.from({length:recipe.height},()=>new Int32Array(recipe.width).fill(-1));
  const {grid}=buildModel(recipe,{w:recipe.width,h:recipe.height},pixels);
  const geometry=meshGrid(grid,{scale:S,offset:[-item.width/2,0,item.wall?0:-item.depth/2]});
  const data={id,native:true,mount:item.wall?"wall":"floor",anchor:item.wall?"wall-bottom-centre":"floor-centre",
    width:item.width,height:item.height,depth:item.depth,voxels:grid.count,
    triangles:geometry.reduce((n,g)=>n+(g?g.index.count/3:0),0),
    interaction:item.interaction??null,sockets:[],surfaceCount:HOUSEHOLD_SIZES[id].tops.length};
  const m={geometry,data};cache.set(id,m);return m;
}

const pixelGeometry=new THREE.BoxGeometry(1,1,.008);
pixelGeometry.userData.shared=true;
const pixelMaterial=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
pixelMaterial.userData.shared=true;
const tempMatrix=new THREE.Matrix4(),tempColour=new THREE.Color();

// A tiny real screen, not a static thumbnail. One instanced draw, updated only
// at six frames per second; no canvas, video, external media or per-frame mesh.
function addScreen(group,item,piece) {
  const laptop=item.interaction==="laptop",nx=16,ny=10;
  const bottom=item.wall?.025:.125;
  const bounds=laptop?{x:-item.width/2+.08,y:.13,w:item.width-.16,h:item.height-.22,z:-item.depth/2+.105}:
    {x:-item.width/2+.11,y:bottom+.09,w:item.width-.37,h:item.height-bottom-.26,z:(item.wall?item.depth:item.depth/2)+.008};
  const screen=new THREE.InstancedMesh(pixelGeometry,pixelMaterial,nx*ny);screen.name="household-animated-screen";
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    tempMatrix.makeScale(bounds.w/nx*.99,bounds.h/ny*.99,1);
    tempMatrix.setPosition(bounds.x+(x+.5)*bounds.w/nx,bounds.y+(y+.5)*bounds.h/ny,bounds.z);
    screen.setMatrixAt(y*nx+x,tempMatrix);screen.setColorAt(y*nx+x,tempColour.setHex(C.black));
  }
  screen.instanceMatrix.needsUpdate=true;screen.computeBoundingSphere();group.add(screen);
  let last="";
  group.userData.tick=time=>{
    const on=piece?.media?.on===true,channel=((piece?.media?.channel??0)%3+3)%3,frame=Math.floor(time*6),key=`${on}:${channel}:${on?frame:0}`;
    if(key===last)return;last=key;screen.userData.frame=on?frame:-1;screen.userData.channel=channel;screen.userData.on=on;
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
      let col=on?0x201e37:0x151720;
      if(on){
        if(channel===0){
          const gx=7+Math.round(Math.sin(frame*.3)*2),gy=5+Math.round(Math.sin(frame*.2));
          if(((x-gx)/3)**2+((y-gy)/3.5)**2<1||(y<gy&&y>1&&Math.abs(x-gx)<3))col=0xc4c1df;
          if(y===gy+1&&(x===gx-1||x===gx+1))col=0x282337;
          if(y===1&&(x+frame)%4<2)col=0x665b91;
        }else if(channel===1){
          if(((x-8)/5)**2+((y-4)/3.5)**2<1)col=((x+frame)%4===0)?0xa25939:0xd48742;
          if(y===8&&x>=7&&x<=8)col=0x82965e;
          if(y===5&&(x===6||x===10)||(y===3&&x>=6&&x<=10))col=frame%6<3?0xf2cf7d:0xd9ab60;
        }else{
          if(y<3)col=y===2?0x675a84:0x373346;
          for(const [sx,sy] of [[3,7],[11,5],[7,8],[14,8],[5,4]])if(Math.abs(x-sx)+Math.abs(y-sy)<(frame%8===0?2:1))col=0xc7c0d8;
          if((x-12)**2+(y-7)**2<5&&(x-13)**2+(y-8)**2>3)col=0xe2d5a6;
        }
      }
      screen.setColorAt(y*nx+x,tempColour.setHex(col));
    }
    screen.instanceColor.needsUpdate=true;
  };
  group.userData.tick(0);
}
const drumCache=new Map();
function addDrum(group,item,piece) {
  let geometry=drumCache.get(item.id);
  if(!geometry){
    const recipe={width:24,height:24,depth:2,build(k){
      for(let i=0;i<3;i++){const a=i*Math.PI*2/3;k.cyl([12+Math.cos(a)*2,12+Math.sin(a)*2,1],[12+Math.cos(a)*9,12+Math.sin(a)*9,1],2,[C.cream,C.lavender,C.plum][i]);}
    }};
    const pixels=Array.from({length:24},()=>new Int32Array(24).fill(-1));
    const {grid}=buildModel(recipe,{w:24,h:24},pixels);
    geometry=meshGrid(grid,{scale:.02,offset:[-.24,-.24,-.02]});drumCache.set(item.id,geometry);
  }
  const drum=voxelGroup(geometry,{shared:true});drum.name="household-laundry-drum";drum.position.set(0,.46,item.depth/2+.002);group.add(drum);
  group.userData.tick=time=>{drum.rotation.z=piece?.media?.on===true?time*.7:0;drum.userData.on=piece?.media?.on===true;};
}

export function householdProp(id,{piece}={}) {
  const m=model(id),item=HOUSEHOLD_BY_ID[id],group=voxelGroup(m.geometry,{shared:true});
  group.name=id;group.userData={...m.data,sockets:[],media:piece?.media??{on:false,channel:0}};
  if(item.interaction==="television"||item.interaction==="laptop")addScreen(group,item,piece);
  if(item.interaction==="washing-machine")addDrum(group,item,piece);
  return group;
}
export const householdPropStats=id=>({...model(id).data});
