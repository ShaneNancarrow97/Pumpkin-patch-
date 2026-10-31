// Premium wall pieces use the same voxel kit as the original furniture.
// x points right, y up and z out of the wall; every back sits at z = 0.
const C = { wood: 0x58301f, edge: 0x8d542d, dark: 0x2e1a21, brass: 0xb68a42, gold: 0xd6ab59,
  copper: 0xba683e, copperLight: 0xe0a066, copperDark: 0x6b3827, iron: 0x34313d,
  plum: 0x643146, cream: 0xdccba6, leaf: 0x506742, glass: 0x958baf, candle: 0xe8c991 };

export const PREMIUM_WALL_ITEMS = Object.freeze([
  { id: "copper-pan-rail", name: "Harvest copper pan rail", width: 80, height: 72, depth: 20, worldWidth: 2.25, room: "kitchen" },
  { id: "gothic-spice-cabinet", name: "Apothecary spice cabinet", width: 80, height: 92, depth: 25, worldWidth: 1.65, room: "kitchen" },
  { id: "iron-utensil-rack", name: "Midnight utensil rack", width: 80, height: 74, depth: 20, worldWidth: 1.85, room: "kitchen" },
  { id: "recipe-teapot-shelf", name: "Pumpkin tea & recipe shelf", width: 88, height: 70, depth: 32, worldWidth: 2.05, room: "kitchen" },
  { id: "crescent-mirror", name: "Crescent looking glass", width: 80, height: 96, depth: 14, worldWidth: 1.6, room: "bedroom" },
  { id: "haunted-manor-painting", name: "The manor after midnight", width: 100, height: 82, depth: 24, worldWidth: 2.3, room: "bedroom" },
].map((item) => Object.freeze({ ...item, mount: "wall", anchor: "back-bottom-centre", wallNormal: "+z" })));

// Rings and hooks stay hollow, so the side view reads as metalwork.
function ring(k, x, y, z0, z1, rx, ry, thick, paint) {
  k.shape(x-rx, y-ry, z0, x+rx, y+ry, z1, (a,b) => {
    const u=a-x,v=b-y;
    return u*u/(rx*rx)+v*v/(ry*ry)<=1 && u*u/((rx-thick)**2)+v*v/((ry-thick)**2)>=1;
  }, paint);
}
function arc(k, x, y, z, r, from, to, paint, thickness=1) {
  for(let i=0;i<10;i++) {
    const a=from+(to-from)*i/10,b=from+(to-from)*(i+1)/10;
    k.cyl([x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(b)*r,y+Math.sin(b)*r,z],thickness,paint,{caps:true});
  }
}
function mount(k,x,y) {
  k.box(x-3,y-5,0,x+3,y+5,3,C.iron,{round:1});
  for(const dy of [-3,3]) k.cyl([x,y+dy,3],[x,y+dy,4],1,C.brass);
}
function rail(k,y) {
  mount(k,8,y); mount(k,k.W-8,y);
  for(const x of [8,k.W-8]) k.cyl([x,y,2],[x,y,8],2,C.brass);
  k.cyl([6,y,8],[k.W-6,y,8],2,C.brass,{caps:true});
  for(const x of [5,k.W-5]) k.ball(x,y,8,3,3,3,C.gold);
}
function hook(k,x,y) {
  arc(k,x,y+1,8,2.5,0,Math.PI*1.65,C.brass);
  arc(k,x,y-3,10,2.5,Math.PI,Math.PI*2.65,C.brass);
}
function pan(k,x,y,r,top,metal=C.copper) {
  // A back, a rolled lip and a recessed, darker bowl; no flat image extrusion.
  const surface=k.vary(metal,0.06,3);
  k.cyl([x,y,5],[x,y,14],r,surface);
  k.carve(x-r,y-r,8,x+r,y+r,16,(a,b)=> (a-x)**2+(b-y)**2<(r-2)**2);
  k.cyl([x,y,7],[x,y,8.5],r-2,C.copperDark);
  ring(k,x,y,13,15,r,r,1.5,C.copperLight);
  k.box(x-1.7,y+r-1,8,x+1.7,top,11,C.brass,{round:1});
  ring(k,x,top+2,8,11,3,4,1.2,C.brass);
  k.cyl([x,y+r-2,14],[x,y+r-2,15],1,C.gold);
}
function jar(k,x,y,r,h,colour) {
  k.lathe(x,13,y,y+h,[[0,r*.8],[.12,r],[.78,r],[.9,r*.72],[1,r*.72]],k.vary(colour,.08,3));
  k.lathe(x,13,y+h,y+h+3,r*.84,C.brass);
  k.box(x-r*.65,y+h*.32,13+r-.5,x+r*.65,y+h*.64,13+r+.5,C.cream);
  k.box(x-1,y+h*.41,13+r+.5,x+1,y+h*.54,13+r+1,colour);
}
function star(k,x,y,z,r=4) {
  k.shape(x-r,y-r,z,x+r,y+r,z+1.5,(a,b)=>
    Math.abs((a-x)/r)**.67+Math.abs((b-y)/r)**.67<=1.15,C.gold);
}
function flame(k,x,y,z) {
  k.ball(x,y,z,1.7,3,1.7,0xffbb54,{glow:true});
  k.ball(x,y-.6,z+.5,.8,1.5,.8,0xffe3a0,{glow:true});
}

const recipes = {
  "copper-pan-rail": { build(k) {
    rail(k,65);
    [[15,30,9,54],[33,23,7,52],[51,27,10,54],[68,31,7,54]].forEach(([x,y,r,t])=>{ hook(k,x,61); pan(k,x,y,r,t); });
  } },
  "gothic-spice-cabinet": { build(k) {
    const wood=k.vary(C.wood,.07,4);
    k.box(8,8,0,72,79,3,wood);
    for(const x of [8,68]) k.box(x,7,1,x+4,79,22,wood);
    for(const y of [8,38,69]) {
      k.box(6,y,1,74,y+4,24,wood);
      k.box(5,y+2,22,75,y+5,25,C.edge);
    }
    k.cyl([7,78,5],[40,91,5],2.5,C.edge);
    k.cyl([40,91,5],[73,78,5],2.5,C.edge);
    for(const x of [11,69]) k.lathe(x,5,74,87,[[0,2],[.4,1.5],[.65,3],[1,0]],C.brass);
    star(k,40,80,7,4);
    const colours=[0x984334,0x998045,0x6e824b,0x9d6235,0x834363];
    for(let row=0;row<2;row++) for(let j=0;j<5;j++) jar(k,17+j*11,row?42:12,4,15+(j%2)*4,colours[(j+row)%5]);
    // Side corbels support the shelf, while the front stays open.
    for(const x of [10,70]) k.cyl([x,2,3],[x,9,20],2,wood);
  } },
  "iron-utensil-rack": { build(k) {
    rail(k,67);
    [15,33,51,68].forEach(x=>{
      hook(k,x,63); k.box(x-1.5,28,9,x+1.5,56,12,C.iron);
      k.box(x-2,40,9,x+2,54,13,C.plum);
      for(const y of [42,52]) k.box(x-2,y,12,x+2,y+1,14,C.brass);
    });
    // Ladle bowl is hollow and angled proud of its handle.
    k.ball(15,22,11,7,9,6,C.brass);
    k.carve(7,12,12,23,32,20,(x,y,z)=>((x-15)/5.5)**2+((y-22)/7.5)**2+((z-12)/5)**2<1);
    k.box(27,15,9,39,29,12,C.iron,{round:2});
    for(const x of [30,33,36]) k.carve(x-.7,18,8,x+.7,26,14);
    // Whisk wires leave the wall visible between the individual loops.
    ring(k,51,22,9,11,6,10,1.5,C.brass);
    ring(k,51,22,13,15,3,10,1.2,C.brass);
    pan(k,68,22,8,40,C.iron);
  } },
  "recipe-teapot-shelf": { build(k) {
    const wood=k.vary(C.wood,.06,4);
    k.box(5,5,0,83,12,29,wood);
    k.box(3,10,0,85,14,31,C.edge);
    for(const x of [12,76]) {
      mount(k,x,8);
      k.cyl([x,0,2],[x,10,27],2,wood);
      k.box(x-3,0,0,x+3,9,4,C.edge);
    }
    // Bound volumes share a shelf surface and face their spines outwards.
    [0,1,2,3].forEach((n)=>{
      const x=9+n*8,h=30+(n%3)*5,c=[C.plum,0x384b46,0x47314e,C.copperDark][n];
      k.box(x,14,7,x+7,14+h,23,k.vary(c,.04,4));
      for(const y of [19,14+h-5]) k.box(x,y,23,x+7,y+1.5,24,C.gold);
      star(k,x+3.5,27,24,2);
      k.box(x+1,14+h,8,x+6,15+h,22,C.cream);
    });
    k.box(12,14,23,44,18,29,C.plum);
    k.box(15,18,24,42,20,28,C.gold);
    k.box(14,20,24,43,21,28,C.cream);
    // Pumpkin teapot, hollow handle and bent spout.
    k.ball(62,27,17,12,11,11,k.vary(C.copper,.05,3),{ribs:[8,.1]});
    k.lathe(62,17,36,39,[[0,7],[.7,6],[1,2]],C.brass);
    k.lathe(62,17,39,43,2,C.wood);
    ring(k,76,29,14,18,7,8,2,C.brass);
    k.cyl([53,26,19],[48,30,20],[3,2],C.copper);
    k.cyl([48,30,20],[47,35,20],[2,1.5],C.copperLight);
  } },
  "crescent-mirror": { build(k) {
    // A tinted looking glass, not a dynamic reflection pass on mobile.
    k.shape(8,10,0,72,88,4,(x,y)=>((x-40)/32)**2+((y-49)/39)**2<=1,C.dark);
    k.shape(14,16,4,66,82,6,(x,y)=>((x-40)/26)**2+((y-49)/33)**2<=1,(x,y)=>{
      const band=Math.floor((x+y*.45)/9)%4;
      return [0x77768f,0x8f8b9f,0xa19caf,0x858396][band];
    });
    ring(k,40,49,4,9,32,39,3,C.brass);
    ring(k,40,49,8,10,29,36,1.5,C.gold);
    // A sculpted crescent wraps the left edge of the glass.
    k.shape(8,16,8,39,83,13,(x,y)=>{
      return ((x-37)/29)**2+((y-49)/34)**2<1 && ((x-46)/28)**2+((y-49)/30)**2>1;
    },C.gold);
    for(const y of [7,91]) { star(k,40,y,7,4); k.ball(40,y,6,3,3,2,C.plum); }
    star(k,70,52,8,6); star(k,17,22,10,4);
    k.cyl([69,68,7],[70,58,7],.8,C.brass);
    // Carved beading stays dimensional round the frame.
    for(let i=0;i<16;i++) {
      const a=Math.PI*2*i/16;
      k.ball(40+Math.cos(a)*32,49+Math.sin(a)*39,8,1.5,1.5,2,C.gold);
    }
  } },
  "haunted-manor-painting": { build(k) {
    k.box(11,8,0,89,74,3,C.wood);
    // The canvas is a voxel mosaic, recessed behind a sculpted frame.
    k.box(16,13,3,84,69,4,0x33304b);
    k.ball(63,54,4,11,11,1,0xcdb885);
    k.box(16,13,4,84,30,5,0x383447);
    for(let i=0;i<5;i++) {
      const x=30+i*9,h=[22,30,26,37,24][i];
      k.box(x,24,5,x+8,24+h,6,[0x342634,0x45303a][i%2]);
      k.shape(x-2,24+h,5,x+10,31+h,6,(a,b)=>Math.abs(a-(x+4))<(31+h-b)*.85,0x241f31);
      for(const y of [31,40]) if(y<24+h) k.box(x+3,y,6,x+5,y+3,7,0xb57c45);
    }
    k.box(50,18,6,56,31,7,0x1e1b28);
    for(const x of [17,79]) {
      k.box(x,8,4,x+4,74,9,C.brass);
      k.box(x+1,10,9,x+3,72,11,C.gold);
    }
    for(const y of [8,70]) {
      k.box(11,y,4,89,y+4,9,C.brass);
      k.box(13,y+1,9,87,y+3,11,C.gold);
    }
    for(const x of [15,85]) for(const y of [11,73]) k.ball(x,y,8,5,4,3,C.gold);
    star(k,50,78,6,4);
    // Two real candle sconces project out from the picture frame.
    for(const x of [6,94]) {
      mount(k,x,30);
      k.cyl([x,29,3],[x,25,17],1.5,C.brass);
      k.lathe(x,17,24,27,[[0,2],[1,4]],C.brass);
      k.lathe(x,17,27,40,2.3,C.candle);
      flame(k,x,43,17);
    }
  } },
};

// Dimensions are explicit, so these recipes also work in Claude's model bench.
export const PREMIUM_WALL_RECIPES = Object.fromEntries(PREMIUM_WALL_ITEMS.map(item=>[
  item.id, Object.freeze({ width:item.width, height:item.height, depth:item.depth, view:0, size:item.worldWidth/item.width, ...recipes[item.id] }),
]));
