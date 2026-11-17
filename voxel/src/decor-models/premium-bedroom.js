// Walnut, plum velvet and warm brass carry the premium furniture art into 3D.
// All dimensions are local voxel units: y = 0 is the floor and +z is the front.
const C = { wood:0x58301f, edge:0x8d542d, dark:0x2e1a21, brass:0xb68a42, gold:0xd6ab59,
  plum:0x643146, velvet:0x79394d, fold:0x492736, cream:0xdccba6, linen:0xf0dfbd,
  glass:0x958baf, lavender:0x77768f, candle:0xe8c991 };

export const BEDROOM_ITEMS = Object.freeze([
  { id:"moon-canopy-bed", name:"Moonlit velvet canopy bed", width:96, height:110, depth:96, worldWidth:2.6, footprint:[3,3], room:"bedroom" },
  { id:"moon-wardrobe", name:"Crescent carved wardrobe", width:80, height:128, depth:36, worldWidth:1.8, footprint:[2,1], room:"bedroom" },
  { id:"moon-vanity", name:"Midnight looking-glass vanity", width:96, height:110, depth:80, worldWidth:1.8, footprint:[2,2], room:"bedroom" },
].map(item=>Object.freeze({ ...item, footprint:Object.freeze(item.footprint) })));

// Thin sculpted rings, crescents and carved stems read from every camera angle.
function ring(k,x,y,z0,z1,rx,ry,thick,paint) {
  k.shape(x-rx,y-ry,z0,x+rx,y+ry,z1,(a,b)=>{
    const u=a-x,v=b-y;
    return u*u/(rx*rx)+v*v/(ry*ry)<=1 && u*u/((rx-thick)**2)+v*v/((ry-thick)**2)>=1;
  },paint);
}
function crescent(k,x,y,z0,z1,r,paint=C.gold) {
  k.shape(x-r,y-r,z0,x+r,y+r,z1,(a,b)=>
    (a-x)**2+(b-y)**2<=r*r && (a-x-r*.42)**2+(b-y-r*.12)**2>(r*.86)**2,paint);
}
function star(k,x,y,z,r=3) {
  k.shape(x-r,y-r,z,x+r,y+r,z+1.2,(a,b)=>
    Math.abs((a-x)/r)**.65+Math.abs((b-y)/r)**.65<=1.15,C.gold);
}
function stem(k,x,y,z,h=20,flip=1) {
  k.cyl([x,y,z],[x+flip*2,y+h,z],.65,C.brass);
  for(let i=0;i<3;i++) {
    const yy=y+5+i*5,side=(i%2?1:-1)*flip;
    k.cyl([x+flip,y+5+i*5,z],[x+flip+side*4,yy+3,z],.8,C.brass);
    k.ball(x+flip+side*4,yy+3,z,1.6,1,.7,C.gold);
  }
}
function foot(k,x,z,top=10) {
  k.lathe(x,z,0,top,[[0,2.7],[.2,4],[.5,4],[.75,2.4],[1,2.5]],C.wood);
  k.lathe(x,z,top-2,top,3.2,C.edge);
}
function turnedPost(k,x,z,y0,y1,paint) {
  k.lathe(x,z,y0,y1,[[0,3.5],[.08,4],[.15,2.8],[.4,2.1],[.64,3.2],[.8,2],[1,2.8]],paint);
  for(const y of [y0+1,y1-2]) k.lathe(x,z,y,y+1.5,3.7,C.edge);
}
function finial(k,x,z,y) {
  k.lathe(x,z,y,y+10,[[0,2.9],[.15,2.1],[.42,3],[.66,1.4],[1,0]],C.brass);
}
function trimPanel(k,x0,y0,x1,y1,z,colour=C.brass) {
  k.box(x0,y0,z,x1,y0+1.3,z+1,colour);
  k.box(x0,y1-1.3,z,x1,y1,z+1,colour);
  for(const x of [x0,x1-1.3]) k.box(x,y0,z,x+1.3,y1,z+1,colour);
}
function bottle(k,x,z,y,r,h,colour) {
  k.lathe(x,z,y,y+h,[[0,r*.8],[.2,r],[.65,r],[.83,r*.43],[1,r*.43]],colour);
  k.lathe(x,z,y+h,y+h+2,r*.55,C.brass);
  k.box(x-r*.6,y+h*.25,z+r-.5,x+r*.6,y+h*.5,z+r+.5,C.cream);
}

const recipes = {
  // A slightly coarser grid keeps the folded cloth within the phone budget.
  "moon-canopy-bed": { res:.8, build(k) {
    // Four carved posts hold a shallow swagged canopy, leaving the bed open.
    const wood=k.vary(C.wood,.035,12), velvet=k.vary(C.plum,.035,12);
    for(const x of [8,88]) for(const z of [8,88]) {
      foot(k,x,z,9);
      k.post(x,z,7,9,25,wood);
      trimPanel(k,x-2,12,x+2,23,z+3.5,C.edge);
      turnedPost(k,x,z,25,89,wood);
      k.post(x,z,8,89,94,C.edge);
      finial(k,x,z,94);
    }
    for(const x of [8,85]) k.box(x,14,11,x+3,25,86,wood);
    k.box(10,13,84,86,27,89,wood);
    trimPanel(k,15,16,81,25,89,C.edge);
    for(const z of [9,84]) k.box(11,23,z,85,27,z+3,C.edge);
    k.box(12,26,12,84,35,84,C.cream,{round:3});
    k.box(11,32,11,85,37,85,C.linen,{round:2});
    // The cream sheet peeks out from a plum quilt and a turned-down top edge.
    k.box(11,34,39,85,40,85,velvet,{round:2});
    k.box(10,27,43,14,37,84,velvet);
    k.box(82,27,43,86,37,84,velvet);
    k.box(12,28,82,84,38,86,velvet);
    k.box(11,38,37,85,41,43,C.cream,{round:1});
    for(const z of [49,62,75]) for(const x of [24,40,56,72]) {
      // Small stitched diamonds sit on the cloth, rather than on a flat decal.
      k.shape(x-2,39,z-2,x+2,41,z+2,(a,b,c)=>Math.abs(a-x)+Math.abs(c-z)<2.2,C.brass);
    }
    crescent(k,48,33,86,87,5);
    for(const x of [29,67]) k.box(x-15,36,16,x+15,44,30,C.linen,{round:3});
    k.ball(48,43,32,11,6,6,C.velvet);
    k.cyl([48,43,37],[48,43,38],1.5,C.gold);
    // An arched walnut headboard with a gold moon, visible below the drapery.
    k.shape(12,24,7,84,64,12,(x,y)=>y<49+12*Math.cos((x-48)/72*Math.PI)**2,wood);
    k.cyl([14,50,12],[48,63,12],1.4,C.edge);
    k.cyl([48,63,12],[82,50,12],1.4,C.edge);
    crescent(k,48,51,12,14,7);
    for(const x of [25,71]) { stem(k,x,35,13,15,x<48?1:-1); star(k,x,54,13,2.5); }
    for(const z of [7,87]) k.box(8,88,z,88,94,z+3,wood);
    for(const x of [7,87]) k.box(x,88,8,x+3,94,88,wood);
    // A sagging cloth roof and gold fringe keep the canopy light and legible.
    k.shape(10,91,10,86,96,86,(x,y,z)=>{
      const top=95-2*Math.sin((x-10)/76*Math.PI)*Math.sin((z-10)/76*Math.PI);
      return y>=top-1.5&&y<=top;
    },velvet);
    for(const z of [8,87]) {
      k.shape(10,84,z,86,94,z+2,(x,y)=>y>=86+2*Math.cos((x-10)/76*Math.PI*2),velvet);
      for(let x=13;x<85;x+=6) k.lathe(x,z+1,82+2*Math.cos((x-10)/76*Math.PI*2),86,1,C.gold);
    }
    for(const x of [8,87]) k.box(x,88,10,x+2,94,86,velvet);
    // Tied curtains leave a clear centre at the foot and reveal the mattress.
    for(const right of [false,true]) {
      const x=right?88:8,dir=right?-1:1;
      k.drape([x,86],[x+dir*19,86],88,6,velvet,{folds:6,amp:1,thick:1.5,tie:{at:0,y:46,gather:.27},flare:1.7});
      k.drape([x,11],[x,31],88,7,velvet,{folds:6,amp:1,thick:1.5,tie:{at:0,y:46,gather:.3},flare:1.7});
      k.cyl([x-dir*2,47,85],[x+dir*5,47,88],1,C.gold);
      k.lathe(x+dir*5,88,35,46,[[0,2],[.4,1.3],[.6,.7],[1,1.4]],C.gold);
    }
    crescent(k,8,105,6,9,4); crescent(k,88,105,86,89,4);
  } },
  "moon-wardrobe": { build(k) {
    const wood=k.vary(C.wood,.035,12), velvet=k.vary(C.plum,.025,12);
    for(const x of [9,71]) for(const z of [7,29]) foot(k,x,z,10);
    k.box(5,10,3,75,17,33,wood);
    k.box(3,15,2,77,18,34,C.edge);
    k.box(8,18,4,72,108,8,wood);
    for(const x of [7,68]) k.box(x,18,6,x+5,109,31,wood);
    k.box(9,18,8,71,31,30,wood);
    k.box(8,30,8,72,34,32,C.edge);
    // A wide lower drawer sits below two independently framed panel doors.
    k.box(12,20,30,68,29,33,wood);
    trimPanel(k,14,21,66,28,33,C.edge);
    for(const x of [23,57]) { ring(k,x,24.5,33,35,2.5,2.5,1,C.brass); k.ball(x,27,34,1,1,1,C.gold); }
    for(const [x0,x1] of [[12,39],[41,68]]) {
      k.box(x0,35,28,x1,105,32,wood);
      k.box(x0+3,39,32,x1-3,100,33,velvet);
      trimPanel(k,x0+2,38,x1-2,102,33,C.brass);
      // Pointed arched tracery is physical gold trim, not a painted facade.
      k.cyl([x0+3,94,34],[(x0+x1)/2,103,34],.9,C.gold);
      k.cyl([(x0+x1)/2,103,34],[x1-3,94,34],.9,C.gold);
      const cx=(x0+x1)/2;
      crescent(k,cx,72,33,35,6);
      stem(k,cx-2,44,34,16,1); stem(k,cx+1,82,34,12,-1);
      for(const y of [44,98]) star(k,cx,y,34,2);
    }
    for(const x of [36,44]) {
      k.ball(x,67,34,1.5,2,1,C.brass);
      ring(k,x,63,33,36,1.8,3.5,.9,C.gold);
      k.lathe(x,34,52,59,[[0,1.5],[.6,1],[1,.5]],C.gold);
    }
    for(const x of [8,72]) {
      k.post(x,30,4,33,109,C.edge);
      for(const y of [37,103]) k.box(x-3,y,27,x+3,y+3,34,C.brass);
      finial(k,x,29,109);
    }
    // The crown is a low gable, with a raised crescent at its central crest.
    k.box(5,107,3,75,112,34,C.edge);
    k.shape(10,111,5,70,127,31,(x,y)=>y<127-Math.abs(x-40)*.48,wood);
    k.cyl([10,112,31],[40,126,31],1.3,C.edge);
    k.cyl([40,126,31],[70,112,31],1.3,C.edge);
    crescent(k,40,117,31,34,6);
    for(const x of [22,58]) star(k,x,114,32,2);
  } },
  "moon-vanity": { build(k) {
    const wood=k.vary(C.wood,.035,12), velvet=k.vary(C.plum,.035,10);
    for(const x of [12,84]) for(const z of [11,42]) {
      foot(k,x,z,8); turnedPost(k,x,z,8,43,wood);
      k.post(x,z,6,38,44,C.edge);
    }
    k.box(7,35,8,89,44,44,wood);
    k.box(4,44,5,92,49,47,wood,{round:1.5});
    k.box(3,47,4,93,50,48,C.edge,{round:1});
    // Three drawers and recessed knee space below the centre of the desk.
    for(const [x0,x1] of [[9,29],[31,65],[67,87]]) {
      k.box(x0,36,43,x1,43,46,wood);
      trimPanel(k,x0+1,37,x1-1,42,46,C.edge);
      const x=(x0+x1)/2;
      ring(k,x,39.5,46,48,2,2,1,C.brass);
    }
    k.box(9,29,8,25,35,43,wood); k.box(71,29,8,87,35,43,wood);
    // Static, tinted glass avoids another render pass on phones.
    k.shape(22,51,7,74,109,13,(x,y)=>((x-48)/26)**2+((y-80)/29)**2<=1,C.dark);
    k.shape(26,55,13,70,105,14,(x,y)=>((x-48)/22)**2+((y-80)/25)**2<=1,(x,y)=>
      [C.lavender,C.glass,0xa19caf,C.glass][Math.floor((x+y*.45)/12)%4]);
    ring(k,48,80,13,17,26,29,2.5,C.brass);
    ring(k,48,80,16,18,23.5,26.5,1,C.gold);
    for(const x of [19,77]) {
      k.post(x,11,4,50,95,wood); finial(k,x,11,95);
      k.cyl([x,58,13],[x<48?25:71,61,14],1.5,C.edge);
    }
    crescent(k,48,105,17,19,4);
    // Bottles, a jewellery box and a little comb sit on the usable desktop.
    bottle(k,17,33,50,3,9,0x82516e);
    bottle(k,28,29,50,2.5,7,0x9b6245);
    bottle(k,77,32,50,3,10,0x77648b);
    bottle(k,86,23,50,2.5,8,0x6c6251);
    k.box(35,50,28,48,56,39,C.plum,{round:1});
    trimPanel(k,36,51,47,55,39,C.brass);
    k.box(34,56,27,49,58,40,C.brass,{round:1});
    k.box(54,50,34,68,52,38,C.cream);
    for(let x=55;x<68;x+=2) k.box(x,51,37,x+1,53,39,C.gold);
    // A separate padded stool fits completely within the vanity footprint.
    for(const x of [39,57]) for(const z of [57,73]) {
      foot(k,x,z,5); turnedPost(k,x,z,5,24,wood);
    }
    k.lathe(48,65,22,26,15,C.wood,{depth:.72});
    k.ball(48,28,65,16,5,12,velvet);
    k.lathe(48,65,25,27,16,C.brass,{depth:.72});
    k.ball(48,32,65,1.5,.8,1.5,C.gold);
    for(let i=0;i<16;i++) {
      const a=Math.PI*2*i/16;
      k.lathe(48+Math.cos(a)*15,65+Math.sin(a)*10.5,20,25,1,C.gold);
    }
  } },
};

// The adapter supplies the common floor-centre anchor and catalogue placement.
export const BEDROOM_RECIPES = Object.fromEntries(BEDROOM_ITEMS.map(item=>[
  item.id,Object.freeze({ width:item.width,height:item.height,depth:item.depth,view:0,size:item.worldWidth/item.width,...recipes[item.id] }),
]));
