import { buildModel } from "./decor-models/kit.js";
import { meshGrid, voxelGroup } from "./voxel-mesh.js";
import { HOME_FURNISHINGS_BY_ID } from "./content/home-furnishings.js";

// Front is +z. Walnut, muted plum and aged brass match the room furniture;
// even the little props are real exposed-face voxels, with no sprite standees.
const C = { wood:0x593a29, edge:0x8a5d3e, dark:0x2c2330, iron:0x3b3540,
  brass:0xb78b4c, gold:0xd6b573, plum:0x623f61, velvet:0x805579,
  cream:0xd9cdb5, glass:0x53677e, glint:0xabc5d7, green:0x52684c,
  leaf:0x799263, lavender:0x9780ac, orange:0xb96e38, ember:0xe9b16a };
const wood = k => k.vary(C.wood,.06,4);
function crescent(k,x,y,z,r,colour=C.gold) {
  k.shape(x-r,y-r,z,x+r,y+r,z+1.5,(a,b)=>(a-x)**2+(b-y)**2<r*r&&(a-x-r*.4)**2+(b-y-r*.15)**2>(r*.84)**2,colour);
}
function foot(k,x,z,y=0) { k.lathe(x,z,y,y+8,[[0,2.8],[.2,2.4],[.6,1.5],[1,2.4]],C.wood); }
function flame(k,x,y,z) {
  k.lathe(x,z,y,y+10,[[0,2.2],[.2,2.6],[.8,.8],[1,.1]],C.cream);
  k.ball(x,y+11.5,z,1.4,2.5,1.4,C.ember,{glow:true});
  k.box(x-.5,y+9,z-.5,x+.5,y+10.5,z+.5,C.dark);
}
function drawer(k,x0,x1,y,z) {
  k.box(x0,y,z,x1,y+14,z+2,C.edge);
  k.box(x0+2,y+2,z+2,x1-2,y+12,z+3,C.wood);
  k.ball((x0+x1)/2,y+7,z+4,1.4,1.4,1,C.brass);
}
function bat(k,x,y,z,w) {
  for(const side of [-1,1])k.shape(x-w,y-3,z,x+w,y+5,z+2,(a,b)=>{
    const t=(a-x)*side;return t>=0&&t<w&&b<y+4-t*.35&&b>y-3+Math.abs(Math.sin(t*.52))*2.6;
  },C.dark);
  k.ball(x,y,z+1,2.1,4,1.4,C.dark);
  for(const side of [-1,1])k.cyl([x+side,y+2,z],[x+side*2,y+5,z],.8,C.dark);
}
function pot(k,x,y,z,r=5) {
  k.lathe(x,z,y,y+8,[[0,r*.67],[.95,r],[1,r+1]],C.orange);
  k.lathe(x,z,y+6,y+8,r+1,C.edge);k.lathe(x,z,y+8,y+9,r-.8,C.dark);
}
function leaf(k,x,y,z,dx,dy,dz,colour=C.leaf) {
  k.cyl([x,y,z],[x+dx,y+dy,z+dz],.8,C.green);
  k.ball(x+dx*.75,y+dy*.75,z+dz*.75,2.2,3.2,1.3,colour);
}
function lantern(k,x,y,z) {
  k.box(x-5,y,z-4,x+5,y+2,z+4,C.dark);k.box(x-4,y+2,z-3,x+4,y+15,z+3,C.ember,{glow:true});
  for(const xx of [-4,4])for(const zz of [-3,3])k.box(x+xx-.5,y+2,z+zz-.5,x+xx+.5,y+16,z+zz+.5,C.iron);
  k.lathe(x,z,y+15,y+20,[[0,6],[.4,4],[1,1]],C.iron,{depth:.8});
  k.cyl([x-3,y+20,z],[x-3,y+23,z],.8,C.brass);k.cyl([x+3,y+20,z],[x+3,y+23,z],.8,C.brass);
  k.cyl([x-3,y+23,z],[x+3,y+23,z],.8,C.brass);
}

const recipes = {
  "costume-rack": {width:84,height:102,depth:42,size:.0225,build(k){
    for(const x of [7,77]){
      k.box(x-5,2,3,x+5,6,39,C.wood);k.cyl([x,5,21],[x,91,21],1.7,C.iron);
      k.lathe(x,21,90,97,[[0,2.6],[.6,1.8],[1,3]],C.brass);
      crescent(k,x,98,20,3);
    }
    k.cyl([7,89,21],[77,89,21],1.6,C.brass);
    k.box(5,9,3,79,12,39,C.edge);k.box(8,12,5,76,13,37,C.wood);
    const outfits=[{x:23,c:C.plum,bottom:32},{x:43,c:C.orange,bottom:42},{x:63,c:C.dark,bottom:28}];
    for(const {x,c,bottom} of outfits){
      k.cyl([x,89,21],[x,83,21],.8,C.brass);
      k.cyl([x,83,21],[x-9,77,21],.8,C.wood);k.cyl([x,83,21],[x+9,77,21],.8,C.wood);
      k.cyl([x-9,77,21],[x+9,77,21],.8,C.wood);
      // Broad shoulders and small empty sleeves give each hanging costume volume.
      k.box(x-8,63,17,x+8,77,25,c);
      for(const side of [-1,1])k.cyl([x+side*7,73,21],[x+side*11,60,22],2.8,c);
      k.drape([x-8,20],[x+8,20],66,bottom,c,{folds:6,amp:1.4,thick:2});
      k.box(x-1,63,24,x+1,76,26,C.brass);
      if(c===C.orange){crescent(k,x,65,26,4,C.dark);k.box(x-3,76,22,x+3,79,25,C.green);}
    }
    for(const x of [28,36,57,65]){
      k.box(x-3,13,13,x+3,24,23,C.dark);k.box(x-3,13,20,x+3,17,30,C.iron);
      k.box(x-2,21,23,x+2,22,25,C.brass);
    }
  }},
  "moon-dressing-mirror": {width:44,height:106,depth:40,size:.022,build(k){
    for(const x of [6,38]){
      k.box(x-3,0,3,x+3,4,37,C.wood);k.lathe(x,20,4,72,[[0,2.3],[.15,1.5],[.4,2],[.85,1.5],[1,3]],C.edge);
      k.ball(x,72,20,2.6,2.6,2.6,C.brass);
    }
    // The opaque silvered glass stays readable without expensive reflections.
    k.shape(8,17,17,36,99,22,(x,y)=>((x-22)/14)**2+((y-58)/41)**2<=1,C.wood);
    k.shape(10,20,22,34,96,24,(x,y)=>((x-22)/12)**2+((y-58)/38)**2<=1,C.brass);
    k.shape(12,23,24,32,93,25,(x,y)=>((x-22)/10)**2+((y-58)/35)**2<=1,C.glass);
    k.shape(14,28,25,30,87,26,(x,y)=>((x-22)/8)**2+((y-58)/30)**2<1&&Math.abs(x-17-(y-30)*.1)<1.2,C.glint);
    crescent(k,22,89,26,5);bat(k,22,100,20,10);
  }},
  "lantern-entry-console": {width:82,height:70,depth:36,size:.0225,build(k){
    for(const x of [7,75])for(const z of [6,30])foot(k,x,z);
    k.box(4,8,3,78,11,33,C.edge);k.box(6,11,5,76,34,31,wood(k));
    for(const x of [8,74])k.box(x-1,9,4,x+1,40,32,C.edge);
    drawer(k,10,39,18,31);drawer(k,43,72,18,31);
    k.box(2,35,1,80,39,35,C.wood);k.box(2,38,1,80,40,35,C.edge);
    lantern(k,18,40,18);
    k.lathe(58,20,40,42,8,C.brass,{depth:.65});k.lathe(58,20,42,43,6,C.dark,{depth:.65});
    k.cyl([54,43,20],[62,43,20],.8,C.gold);k.box(61,42.5,19,64,44,22,C.gold);
    k.box(37,40,12,47,41,25,C.cream);k.box(38,41,13,46,42,24,C.plum);
    for(const y of [6,32])k.box(9,y,5,73,y+1,7,C.brass);
  }},
  "hanging-herb-shelf": {width:44,height:50,depth:28,size:.0225,build(k){
    k.box(2,2,0,42,5,25,C.wood);k.box(1,4,23,43,6,26,C.edge);
    for(const x of [5,39]){
      k.box(x-1,2,1,x+1,29,4,C.iron);k.cyl([x,3,21],[x,22,3],1.3,C.brass);
    }
    pot(k,11,6,13,5);pot(k,32,6,12,6);
    for(const side of [-1,1])for(let i=0;i<4;i++)leaf(k,11,14,13,side*(3+i),9+i*3,(i%2?1:-1)*3);
    for(let i=0;i<6;i++)leaf(k,32,14,12,Math.cos(i)*8,8+Math.sin(i)*4,Math.sin(i)*5);
    // A trailing vine folds over the front edge, entirely in front of the wall.
    for(let i=0;i<5;i++){k.cyl([34-i,15-i*2,16+i*2],[33-i,13-i*2,18+i*2],.8,C.green);k.ball(31-i,13-i*2,17+i*2,2.4,1.6,1.3,C.leaf);}
    k.box(20,6,11,24,19,16,C.plum);k.box(19,17,10,25,19,17,C.brass);
    for(let i=0;i<3;i++)leaf(k,22,19,13,i*2-2,11+i*2,0,C.lavender);
  }},
  "moonweave-rug": {width:88,height:3,depth:56,size:.028,build(k){
    k.box(2,0,2,86,1,54,C.dark);k.box(3,1,3,85,2,53,C.plum);
    for(const x of [5,81])k.box(x,2,5,x+2,3,51,C.brass);
    for(const z of [5,49])k.box(5,2,z,83,3,z+2,C.brass);
    k.shape(29,2,11,59,3,45,(x,y,z)=>(x-44)**2+(z-28)**2<15**2&&(x-49)**2+(z-25)**2>13**2,C.gold);
    for(const [x,z] of [[18,16],[68,17],[22,39],[69,39]]){
      k.box(x-2,2,z-.5,x+2,3,z+.5,C.cream);k.box(x-.5,2,z-2,x+.5,3,z+2,C.cream);
    }
    for(let x=6;x<84;x+=4)for(const z of [0,54])k.box(x,0,z,x+2,1,z+2,C.cream);
  }},
  "midnight-reading-bench": {width:80,height:60,depth:38,size:.024,build(k){
    for(const x of [7,73])for(const z of [7,31])foot(k,x,z);
    k.box(3,8,3,77,12,35,C.wood);k.box(5,12,5,75,19,34,C.plum,{round:3});
    k.box(7,18,7,73,21,33,C.velvet,{round:2});
    for(const x of [17,32,48,63])k.ball(x,20,20,1.1,.8,1.1,C.plum);
    for(const x of [5,75]){
      k.lathe(x,6,10,50,[[0,2.2],[.5,1.6],[1,2.5]],C.wood);
      k.cyl([x,29,6],[x,29,33],1.8,C.edge);
      k.lathe(x,32,12,29,1.4,C.wood);
    }
    k.box(6,29,3,74,48,6,C.wood);k.box(8,32,6,72,45,9,C.plum);
    k.shape(6,47,3,74,59,7,(x,y)=>y<58-Math.abs(x-40)*.23,C.edge);
    bat(k,40,48,9,16);crescent(k,40,36,10,4);
  }},
  "bedside-candle-cabinet": {width:42,height:65,depth:34,size:.024,build(k){
    for(const x of [6,36])for(const z of [6,28])foot(k,x,z);
    k.box(3,8,3,39,11,31,C.edge);k.box(4,11,4,38,39,30,wood(k));
    k.box(8,13,30,34,35,32,C.edge);k.box(10,15,32,32,33,33,C.plum);
    crescent(k,20,24,33,5);k.ball(31,25,34,1.3,1.3,1,C.brass);
    k.box(1,38,1,41,42,33,C.wood);k.box(1,41,1,41,43,33,C.edge);
    k.lathe(17,17,43,45,10,C.brass,{depth:.7});
    flame(k,12,45,16);flame(k,20,49,15);flame(k,21,44,23);
    k.box(29,43,9,35,45,23,C.cream);k.box(29,44,9,35,45,10,C.plum);
  }},
};

const cache = new Map();
function model(id) {
  if(cache.has(id))return cache.get(id);
  const recipe=recipes[id],item=HOME_FURNISHINGS_BY_ID[id];
  if(!recipe||!item)throw new RangeError("Unknown home furnishing: "+id);
  const art={w:recipe.width,h:recipe.height},pixels=Array.from({length:art.h},()=>new Int32Array(art.w).fill(-1));
  const {grid}=buildModel(recipe,art,pixels),size=recipe.size;
  const geometry=meshGrid(grid,{scale:size,offset:[-recipe.width*size/2,0,item.wall?0:-recipe.depth*size/2]});
  let top=0;for(let i=0;i<grid.kind.length;i++)if(grid.kind[i])top=Math.max(top,Math.floor(i/grid.nx)%grid.ny+1);
  const data={id,native:true,mount:item.wall?"wall":"floor",anchor:item.wall?"wall-bottom-centre":"floor-centre",
    width:recipe.width*size,height:top*size,depth:recipe.depth*size,glowing:!!geometry[1],
    voxels:grid.count,triangles:geometry.reduce((n,g)=>n+(g?g.index.count/3:0),0),interaction:item.interaction??null,sockets:[]};
  const entry={geometry,data};cache.set(id,entry);return entry;
}
export function homeFurnishingProp(id) {
  const m=model(id),group=voxelGroup(m.geometry,{shared:true});group.name=id;group.userData={...m.data,sockets:[]};return group;
}
export const homeFurnishingStats=id=>({...model(id).data});
