// Kitchen heirlooms follow the premium wall pieces: walnut, plum and warm copper.
// All surfaces are modelled in the shared kit; x right, y up and +z forwards.
const C = { wood:0x58301f, edge:0x8d542d, dark:0x2e1a21, brass:0xb68a42, gold:0xd6ab59,
  copper:0xba683e, copperLight:0xe0a066, copperDark:0x6b3827, iron:0x34313d,
  plum:0x643146, cream:0xdccba6, leaf:0x506742, crock:0xaca59b, ink:0x292432 };

export const KITCHEN_ITEMS = Object.freeze([
  {id:"copper-range",name:"Moonfire copper range",width:96,height:100,depth:60,worldWidth:2.7,footprint:[3,2],room:"kitchen"},
  {id:"preserves-dresser",name:"Harvest preserves dresser",width:80,height:120,depth:36,worldWidth:1.8,footprint:[2,1],room:"kitchen"},
  {id:"copper-sink-island",name:"Copper pumpkin kitchen island",width:100,height:72,depth:60,worldWidth:2.7,footprint:[3,2],room:"kitchen"},
].map(item=>Object.freeze({...item,footprint:Object.freeze(item.footprint),mount:"floor",anchor:"bottom-centre"})));

// Metalwork is hollow so handles and rolled rims remain readable from the side.
function ring(k,x,y,z,rx,ry,thick,colour,depth=2) {
  k.shape(x-rx,y-ry,z,x+rx,y+ry,z+depth,(a,b)=>
    ((a-x)/rx)**2+((b-y)/ry)**2<=1 && ((a-x)/(rx-thick))**2+((b-y)/(ry-thick))**2>=1,colour);
}
function rim(k,x,z,y,r,thick,colour) {
  k.shape(x-r,y,z-r,x+r,y+2,z+r,(a,b,c)=>
    (a-x)**2+(c-z)**2<=r*r && (a-x)**2+(c-z)**2>=(r-thick)**2,colour);
}
function moon(k,x,y,z,r=5) {
  k.shape(x-r,y-r,z,x+r,y+r,z+1.5,(a,b)=>
    (a-x)**2+(b-y)**2<r*r && (a-x-r*.43)**2+(b-y-r*.22)**2>(r*.83)**2,C.gold);
}
function finial(k,x,z,y) {
  k.lathe(x,z,y,y+10,[[0,2],[.25,3],[.45,1.3],[.63,2],[1,0]],C.brass);
}
function foot(k,x,z,paint) {
  k.lathe(x,z,0,12,[[0,2.7],[.13,3.4],[.32,2.7],[.6,1.8],[.83,3.5],[1,3]],paint);
}
function panel(k,x0,x1,y0,y1,z,paint) {
  k.box(x0,y0,z,x1,y1,z+2,paint);
  for(const x of [x0,x1-2]) k.box(x,y0,z+2,x+2,y1,z+3,C.edge);
  for(const y of [y0,y1-2]) k.box(x0,y,z+2,x1,y+2,z+3,C.edge);
  // Raised pointed arch is real trim rather than an image on the door.
  const cx=(x0+x1)/2,half=(x1-x0)/2-3,peak=y1-4,spring=y1-13;
  for(const sx of [-1,1]) {
    k.cyl([cx+sx*half,y0+4,z+3],[cx+sx*half,spring,z+3],.8,C.brass);
    k.cyl([cx+sx*half,spring,z+3],[cx,peak,z+3],.9,C.brass);
  }
  moon(k,cx,(y0+y1)/2,z+3.5,Math.min(4.5,half*.6));
}
function jar(k,x,y,z,r,h,colour) {
  k.lathe(x,z,y,y+h,[[0,r*.8],[.12,r],[.78,r],[.9,r*.74],[1,r*.74]],colour);
  k.lathe(x,z,y+h,y+h+2,r*.82,C.brass);
  k.box(x-r*.6,y+h*.28,z+r-.5,x+r*.6,y+h*.62,z+r+.5,C.cream);
  k.box(x-.6,y+h*.37,z+r+.5,x+.6,y+h*.51,z+r+1,colour);
  k.box(x-r*.48,y+h*.58,z+r*.7,x-r*.2,y+h*.83,z+r*.9,0xc7bca5);
}
function crock(k,x,y,z,r,h) {
  k.lathe(x,z,y,y+h,[[0,r*.68],[.12,r],[.72,r],[.95,r*.7],[1,r*.76]],C.crock);
  k.carve(x-r,y+h-3,z-r,x+r,y+h+1,z+r,(a,b,c)=>(a-x)**2+(c-z)**2<(r*.48)**2);
  ring(k,x+r*.95,y+h*.55,z-1,r*.55,h*.26,1.3,C.crock);
}
function pot(k,x,y,z,r,h,lid=true) {
  k.lathe(x,z,y,y+h,[[0,r*.8],[.12,r],[.9,r],[1,r*1.05]],C.copper);
  k.carve(x-r,y+2,z-r,x+r,y+h+2,z+r,(a,b,c)=>(a-x)**2+(c-z)**2<(r-2)**2);
  rim(k,x,z,y+h-1,r+1,1.6,C.copperLight);
  for(const sx of [-1,1]) ring(k,x+sx*(r+2),y+h*.7,z-1,3.5,2.5,1.3,C.brass);
  if(lid) {
    k.lathe(x,z,y+h+1,y+h+4,[[0,r+1],[.5,r*.78],[1,r*.18]],C.copperLight);
    k.ball(x,y+h+5,z,2,1.8,2,C.iron);
  }
}
function pan(k,x,y,z,r,handleTop) {
  k.cyl([x,y,z],[x,y,z+4],r,C.copper);
  k.carve(x-r,y-r,z+2,x+r,y+r,z+6,(a,b)=>(a-x)**2+(b-y)**2<(r-1.5)**2);
  ring(k,x,y,z+4,r,r,1.5,C.copperLight);
  k.box(x-1,y+r-1,z+1,x+1,handleTop,z+3,C.brass);
  ring(k,x,handleTop+1,z+1,2,2.5,1,C.brass);
}
function cloth(k,x,y,z,w,h) {
  k.drape([x,z],[x+w,z],y,y-h,C.plum,{folds:7,amp:.9,thick:1.3});
  k.box(x,y-h+3,z+.5,x+w,y-h+4,z+2,C.brass);
  moon(k,x+w/2,y-h*.57,z+2,3);
}

// Lower work surfaces to a comfortable height beside the 2.3-unit cast.
function counterHeight(k,f=.85) {
  const point=p=>[p[0],p[1]*f,p[2]],test=t=>t&&((x,y,z)=>t(x,y/f,z));
  return {...k,
    box:(a,b,c,d,e,g,p,o)=>k.box(a,b*f,c,d,e*f,g,p,o),
    post:(x,z,w,a,b,p,o)=>k.post(x,z,w,a*f,b*f,p,o),
    cyl:(a,b,r,p,o)=>k.cyl(point(a),point(b),r,p,o),
    lathe:(x,z,a,b,r,p,o)=>k.lathe(x,z,a*f,b*f,r,p,o),
    ball:(x,y,z,a,b,c,p,o)=>k.ball(x,y*f,z,a,b*f,c,p,o),
    shape:(a,b,c,d,e,g,t,p,o)=>k.shape(a,b*f,c,d,e*f,g,test(t),p,o),
    carve:(a,b,c,d,e,g,t)=>k.carve(a,b*f,c,d,e*f,g,test(t)),
    drape:(a,b,top,bottom,p,o)=>k.drape(a,b,top*f,bottom*f,p,o),
  };
}

const models = {
  "copper-range": {build(k) {
    k=counterHeight(k);
    const wood=k.vary(C.iron,.045,6);
    for(const x of [10,86]) for(const z of [11,48]) foot(k,x,z,wood);
    // A hollow iron case, front-opening firebox and moulded brass plinth.
    k.box(7,10,8,89,14,52,wood);
    k.box(7,14,8,11,49,52,wood); k.box(85,14,8,89,49,52,wood);
    k.box(11,14,8,85,49,11,wood); k.box(11,46,11,85,49,52,wood);
    k.box(5,12,6,91,15,54,C.brass);
    k.box(10,15,47,86,46,51,C.ink);
    for(const [a,b] of [[13,45],[49,82]]) {
      panel(k,a,b,20,44,50,wood);
      k.cyl([a+8,32,55],[b-6,32,55],1.5,C.brass,{caps:true});
      k.cyl([a+8,32,53],[a+8,32,55],1.5,C.gold);
      k.cyl([b-6,32,53],[b-6,32,55],1.5,C.gold);
    }
    // Small furnace windows expose the ember bed, backed by an actual recess.
    k.carve(17,19,48,40,25,54);
    k.box(17,19,48,40,25,49,0xe99740,{glow:true});
    for(const x of [18,23,28,33,38]) k.box(x,19,49,x+2,25,52,C.iron);
    for(const x of [16,43,50,80]) k.ball(x,40,54,1.5,1.5,1.5,C.gold);
    // Thick hob, four individual burner rings and the serving rail at the front.
    k.box(3,48,4,93,52,56,C.iron,{round:1});
    k.box(3,48,54,93,51,57,C.brass);
    for(const x of [26,68]) for(const z of [21,41]) {
      rim(k,x,z,52,10,2,C.ink);
      k.box(x-11,53,z-1,x+11,54,z+1,C.iron);
      k.box(x-1,53,z-11,x+1,54,z+11,C.iron);
    }
    k.cyl([9,44,57],[87,44,57],1.5,C.brass,{caps:true});
    cloth(k,64,45,55,18,27);
    // The deep, freestanding splashback carries a shelf and utensil rail.
    k.box(8,52,5,88,89,8,wood);
    for(const x of [7,87]) {
      k.post(x,6,4,52,90,C.brass); finial(k,x,6,89);
    }
    k.cyl([11,89,6],[48,96,6],2,C.brass);
    k.cyl([48,96,6],[85,89,6],2,C.brass);
    moon(k,48,84,8,5);
    k.box(10,86,4,86,89,19,C.iron);
    k.box(9,87,17,87,90,20,C.brass);
    k.cyl([16,80,13],[80,80,13],1.2,C.brass,{caps:true});
    pan(k,56,67,11,6,77); pan(k,73,66,11,5,77);
    k.box(23,60,9,40,77,11,C.dark);
    moon(k,31,69,11,5);
    // Copper pans sit above the hob, with an open saucepan and a kettle spout.
    pot(k,26,54,39,10,11,true); pot(k,68,54,40,8,9,false);
    k.box(76,62,39,88,64,41,C.wood);
    pot(k,68,54,20,8,9,true);
    k.cyl([61,59,19],[54,65,19],[2.5,1.7],C.copper);
    k.cyl([54,65,19],[53,68,19],1.7,C.copperLight);
    ring(k,68,69,19,6,5,1.5,C.brass);
    jar(k,28,90,12,3.3,5,0x984334); jar(k,39,90,12,3.3,5,C.leaf);
    crock(k,61,90,12,3.5,5);
  }},
  "preserves-dresser": {build(k) {
    const wood=k.vary(C.wood,.055,6),edge=k.vary(C.edge,.035,6);
    for(const x of [10,70]) for(const z of [7,28]) foot(k,x,z,wood);
    k.box(6,10,3,74,14,32,edge);
    k.box(8,14,4,12,50,31,wood); k.box(68,14,4,72,50,31,wood);
    k.box(12,14,4,68,50,7,wood);
    k.box(11,15,28,69,47,31,wood);
    panel(k,13,39,16,40,30,wood); panel(k,41,67,16,40,30,wood);
    for(const x of [35,45]) {
      k.ball(x,29,34,1.5,1.5,1.2,C.gold);
      k.cyl([x,22,34],[x,27,34],.8,C.brass);
    }
    for(const [a,b] of [[12,30],[31,49],[50,68]]) {
      k.box(a,42,30,b,49,32,edge);
      ring(k,(a+b)/2,45,32,2,2,1,C.brass);
    }
    k.box(4,49,2,76,53,34,edge,{round:1});
    k.box(5,52,2,75,54,33,C.brass);
    // An open hutch: separate back, posts and shelves leave visible depth.
    k.box(9,54,3,71,104,6,wood);
    for(const x of [8,68]) k.box(x,54,3,x+4,106,28,wood);
    for(const y of [54,77,101]) {
      k.box(7,y,4,73,y+3,30,wood);
      k.box(6,y+1,28,74,y+4,32,edge);
    }
    for(const x of [10,70]) {
      k.post(x,6,5,99,108,edge); finial(k,x,6,107);
    }
    k.shape(9,104,4,71,119,8,(x,y)=>y<105+(1-Math.abs(x-40)/31)*14,wood);
    k.cyl([11,105,8],[40,118,8],1.5,C.brass);
    k.cyl([40,118,8],[69,105,8],1.5,C.brass);
    moon(k,40,110,8,4.5);
    // Gothic brackets run above the top shelf, not across the stored jars.
    for(const x of [24,56]) {
      k.cyl([x-10,101,25],[x,108,25],1.2,edge);
      k.cyl([x,108,25],[x+10,101,25],1.2,edge);
    }
    [0x984334,0x944f4d,0x998045,C.leaf,0x834363].forEach((c,i)=>jar(k,18+i*11,81,18,4,12+(i%2)*3,c));
    // Stacked crockery is a set of separate discs with a rolled top rim.
    for(const [x,r] of [[28,8],[46,6]]) {
      for(let j=0;j<5;j++) k.lathe(x,19,58+j*2,59+j*2,r,C.cream);
      rim(k,x,19,68,r,1,C.crock);
    }
    crock(k,16,58,18,4.5,11); crock(k,60,58,18,4.5,11);
    k.lathe(60,18,69,71,4,C.brass);
    // A pumpkin preserve crock adds the same harvest accent as the source art.
    k.ball(61,94,18,4,4,4,C.copper,{ribs:[7,.12]});
    k.cyl([61,97,18],[62,100,18],1,C.wood);
  }},
  "copper-sink-island": {build(k) {
    k=counterHeight(k);
    const wood=k.vary(C.wood,.05,6),edge=k.vary(C.edge,.04,6);
    for(const x of [10,90]) for(const z of [9,48]) {
      k.post(x,z,9,0,5,edge); k.post(x,z,7,5,11,wood);
      k.lathe(x,z,11,39,[[0,3.5],[.1,4.5],[.2,2.5],[.62,3.5],[.78,2.6],[1,4]],wood);
      k.post(x,z,8,39,47,edge);
    }
    // The underside remains open around a thick lower storage shelf.
    k.box(7,8,6,93,11,52,wood);
    k.box(7,9,51,93,12,54,edge);
    for(const x of [7,89]) k.box(x,39,6,x+4,47,52,wood);
    for(const z of [6,48]) k.box(8,40,z,92,47,z+4,wood);
    k.box(2,46,2,98,51,58,edge,{round:1});
    // Plank worktop and a copper-lined hollow sink with a separate drain.
    k.box(3,50,3,97,53,57,(x,y,z)=>
      Math.abs((z-3)%9)<.7?k.scale(C.edge,.77):C.edge);
    k.box(11,48,12,48,54,43,C.copper);
    k.carve(14,49,15,45,57,40);
    k.box(15,49,16,44,50,39,C.copperDark);
    k.cyl([29,49,27],[29,50,27],2,C.iron);
    for(const z of [12,41]) k.box(11,53,z,48,55,z+2,C.copperLight);
    for(const x of [11,46]) k.box(x,53,12,x+2,55,43,C.copperLight);
    // A bent brass faucet and two turned taps stand behind the basin.
    k.lathe(29,8,53,57,3,C.brass);
    const pts=[[29,55,8],[29,67,8],[29,70,12],[29,70,19],[29,67,23]];
    for(let i=1;i<pts.length;i++) k.cyl(pts[i-1],pts[i],1.3,C.brass,{caps:true});
    for(const x of [18,40]) {
      k.lathe(x,8,53,59,[[0,2.5],[.4,1.5],[1,2]],C.brass);
      k.cyl([x-3,59,8],[x+3,59,8],1,C.gold,{caps:true});
      k.cyl([x,59,5],[x,59,11],1,C.gold,{caps:true});
    }
    // Cutting board, a ribbed pumpkin and mortar keep the counter purposeful.
    k.box(57,53,27,88,55,49,C.wood,{round:1});
    k.box(88,53,34,94,55,41,C.wood,{round:1});
    k.ball(67,61,36,7,6,6,C.copper,{ribs:[8,.13]});
    k.cyl([67,65,36],[68,69,36],1.3,C.leaf);
    k.lathe(86,15,53,59,[[0,3],[.15,5],[1,6]],C.iron);
    k.carve(81,57,10,91,62,20,(a,b,c)=>(a-86)**2+(c-15)**2<3.8**2);
    k.cyl([85,56,15],[90,64,13],1.5,C.iron,{caps:true});
    // Storage crockery, a produce basket and a rack of recessed copper pans.
    for(const x of [23,36]) crock(k,x,12,25,5,12);
    k.lathe(68,29,12,23,[[0,10],[1,13]],C.edge,{depth:.65});
    k.carve(55,15,19,81,25,39,(a,b,c)=>((a-68)/10.5)**2+((c-29)/6)**2<1);
    for(const [x,z] of [[63,26],[70,25],[74,31]]) {
      k.ball(x,23,z,4,4,3.5,C.copper,{ribs:[7,.13]});
      k.cyl([x,26,z],[x+1,28,z],.8,C.leaf);
    }
    k.cyl([12,42,55],[88,42,55],1.2,C.brass,{caps:true});
    cloth(k,13,42,55,19,25);
    pan(k,47,27,53,6,39); pan(k,64,26,53,8,39); pan(k,81,29,53,5,39);
    for(const x of [39,84]) k.cyl([x,40,51],[x,42,55],1,C.brass);
  }},
};

export const KITCHEN_RECIPES = Object.fromEntries(KITCHEN_ITEMS.map(item=>[
  item.id,Object.freeze({width:item.width,height:item.height,depth:item.depth,view:0,size:item.worldWidth/item.width,...models[item.id]}),
]));
