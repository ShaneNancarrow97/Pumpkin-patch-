import { buildModel } from "./decor-models/kit.js";
import { meshGrid, voxelGroup } from "./voxel-mesh.js";
import { KITCHEN_EQUIPMENT_BY_ID } from "./content/kitchen-equipment.js";

// Starter tools use the furniture kit's fine exposed-face voxels, walnut,
// warm copper and plum enamel. Front is +z; wall backs start at z zero.
const C = { wood: 0x593824, edge: 0x8b5c36, dark: 0x29212b, iron: 0x38333d,
  plum: 0x5e354b, cream: 0xe0cfaa, copper: 0xb56b42, light: 0xdba470,
  brass: 0xc39750, glass: 0x352632, ember: 0xe4a155, green: 0x617452 };
function moon(k, x, y, z, r) {
  k.shape(x-r, y-r, z, x+r, y+r, z+1.5, (a,b) =>
    (a-x)**2+(b-y)**2<r*r && (a-x-r*.4)**2+(b-y-r*.2)**2>(r*.82)**2, C.brass);
}
function ring(k, x, y, z, r, paint, thick=1.4) {
  k.shape(x-r,y-r,z,x+r,y+r,z+2,(a,b) =>
    (a-x)**2+(b-y)**2<=r*r && (a-x)**2+(b-y)**2>=(r-thick)**2,paint);
}
function rim(k, x, z, y, r, paint) {
  k.shape(x-r,y,z-r,x+r,y+1.5,z+r,(a,b,c) =>
    (a-x)**2+(c-z)**2<r*r && (a-x)**2+(c-z)**2>(r-1.5)**2,paint);
}
function foot(k,x,z) {
  k.lathe(x,z,0,7,[[0,2.1],[.2,2.8],[.55,1.4],[1,2.6]],C.iron);
}
function body(k) {
  for (const x of [7,73]) for (const z of [7,33]) foot(k,x,z);
  k.box(3,7,3,77,10,37,C.brass);
  k.box(4,10,4,7,44,36,C.plum); k.box(73,10,4,76,44,36,C.plum);
  k.box(7,10,4,73,44,7,C.dark); k.box(7,41,7,73,44,36,C.plum);
  for (const x of [7,73]) k.box(x-1,10,33,x+1,42,37,C.brass);
  for (const y of [11,41]) k.box(7,y,34,73,y+1,37,C.edge);
  k.box(1,44,1,79,47,39,C.iron);
  k.box(1,46,1,79,47.5,3,C.brass); k.box(1,46,37,79,47.5,39,C.brass);
}
function rail(k) {
  k.box(2,42,0,42,46,3,C.wood);
  k.box(2,45,1,42,47,3,C.edge);
  for (const x of [5,39]) {
    k.box(x-1,39,2,x+1,45,6,C.brass);
    k.cyl([x,44,5],[x,44,8],1.2,C.brass);
  }
  k.cyl([4,43,7],[40,43,7],1.3,C.brass);
  for (const x of [13,32]) {
    k.cyl([x,43,7],[x,37,9],.9,C.iron);
    k.box(x-1,36,8,x+2,38,11,C.brass);
  }
}
function pot(k,x,y,z,r,h) {
  k.lathe(x,z,y,y+h,[[0,r*.75],[.1,r],[.88,r],[1,r*.95]],C.copper);
  k.carve(x-r,y+2,z-r,x+r,y+h+2,z+r,(a,b,c)=>(a-x)**2+(c-z)**2<(r-1.8)**2);
  rim(k,x,z,y+h-1,r+1,C.light);
  for (const side of [-1,1]) {
    k.cyl([x+side*r,y+h*.63,z],[x+side*(r+3),y+h*.63,z],1.1,C.brass);
    ring(k,x+side*(r+3),y+h*.63,z-1,2.2,C.brass,1);
  }
  k.box(x-r*.66,y+2,z+r*.8,x-r*.4,y+h-3,z+r+.3,C.light);
}
function fryingPan(k,x,y,z,r,handle) {
  k.cyl([x,y,z],[x,y,z+3],r,C.iron);
  k.carve(x-r,y-r,z+1,x+r,y+r,z+5,(a,b)=>(a-x)**2+(b-y)**2<(r-1.7)**2);
  ring(k,x,y,z+3,r,C.copper);
  k.box(x-1,y+r-1,z+1,x+1,handle,z+3,C.iron);
  ring(k,x,handle+1,z+1,2,C.brass,1);
  k.box(x-r*.58,y-r*.36,z+3.1,x-r*.34,y+r*.32,z+4,C.light);
}
function jar(k,x,y,z,colour) {
  k.lathe(x,z,y,y+8,[[0,2.4],[.15,3],[.75,3],[1,2.3]],colour);
  k.lathe(x,z,y+8,y+10,2.8,C.brass);
  k.box(x-2,y+2,z+2.7,x+2,y+6,z+3.7,C.cream);
  k.box(x-.5,y+3,z+3.7,x+.5,y+5,z+4.2,colour);
}

const recipes = {
  "kitchen-hob": { width:80,height:68,depth:40,size:.0225,build(k) {
    body(k);
    // Hollow cupboards, inset door panels and handles.
    for (const [a,b] of [[9,38],[42,71]]) {
      k.box(a,13,34,b,40,36,C.wood); k.box(a+2,15,36,b-2,38,37,C.plum);
      for (const x of [a+1,b-2]) k.box(x,14,36,x+1,39,38,C.edge);
      for (const y of [14,38]) k.box(a+1,y,36,b-1,y+1,38,C.edge);
      k.cyl([b-6,26,38],[b-6,33,38],1,C.brass);
      moon(k,(a+b)/2,24,38,3.2);
    }
    k.box(5,48,3,75,62,6,C.plum); k.box(4,61,2,76,64,7,C.brass);
    moon(k,40,56,6,4);
    for (const x of [22,58]) {
      k.lathe(x,22,47.5,49,10,C.dark);
      for (const r of [5,8]) rim(k,x,22,49,r,C.iron);
      for (const dx of [-10,10]) k.box(x+dx-1,49,13,x+dx+1,51,31,C.iron);
      for (const z of [12,32]) k.box(x-9,49,z-1,x+9,51,z+1,C.iron);
      k.ball(x,42,39,1.8,1.8,1.2,C.brass);
    }
  }},
  "kitchen-oven": { width:80,height:72,depth:40,size:.0225,build(k) {
    body(k);
    // Sealed oven lining with a recessed ember window, rails and brass hinges.
    k.box(9,12,9,71,42,11,C.iron);
    for (const x of [9,68]) k.box(x,12,10,x+3,42,34,C.iron);
    k.box(12,12,10,68,15,34,C.iron); k.box(12,39,10,68,42,34,C.iron);
    k.box(11,14,33,69,40,35,C.plum);
    k.box(17,18,35,63,35,36,C.brass);
    k.box(19,20,35,61,33,36,C.glass);
    k.box(24,21,36,56,25,37,C.ember,{glow:true});
    for (let x=22;x<60;x+=7) k.box(x,20,36,x+2,33,38,C.iron);
    for (const y of [21,31]) k.box(20,y,36,60,y+1,38,C.dark);
    k.cyl([18,38,38],[62,38,38],1.4,C.brass);
    for (const x of [12,67]) for (const y of [17,34]) k.box(x,y,35,x+2,y+3,38,C.brass);
    for (const x of [17,40,63]) k.ball(x,43,39,1.4,1.4,1.1,C.brass);
    // The arched splashback reads as a small gothic appliance from any side.
    k.box(7,48,3,73,61,6,C.plum);
    k.shape(7,60,3,73,70,6,(x,y)=>y<=70-Math.abs(x-40)*.27,C.plum);
    for (const side of [-1,1]) k.cyl([40,69,6],[40+side*32,60,6],1,C.brass);
    moon(k,40,59,6,4);
  }},
  "kitchen-pot-rail": { width:44,height:50,depth:26,size:.0225,build(k) {
    rail(k);
    pot(k,13,6,14,8,20); pot(k,33,15,14,5.5,11);
    k.cyl([13,28,11],[13,37,9],1,C.iron);
    k.cyl([33,28,11],[32,37,9],1,C.iron);
    // Separate sloping lids and dark knobs hang behind the cookware.
    k.lathe(13,14,27,31,[[0,8],[.65,4],[1,1.2]],C.light);
    k.ball(13,32,14,1.6,1.2,1.6,C.iron);
  }},
  "kitchen-pan-rail": { width:44,height:50,depth:16,size:.0225,build(k) {
    rail(k);
    fryingPan(k,13,17,10,9,34); fryingPan(k,33,22,10,6.5,36);
  }},
  "kitchen-baking-rack": { width:44,height:50,depth:15,size:.0225,build(k) {
    rail(k);
    for (const [a,b,y,z] of [[4,23,6,8],[25,41,14,10]]) {
      k.box(a,y,z,b,y+25,z+2,C.iron);
      k.box(a+2,y+2,z+2,b-2,y+23,z+3,C.dark);
      for (const x of [a,b-1]) k.box(x,y,z+2,x+1,y+25,z+4,C.copper);
      for (const yy of [y,y+24]) k.box(a,yy,z+2,b,yy+1,z+4,C.copper);
      k.cyl([(a+b)/2,y+25,z],[(a+b)/2,39,8],.8,C.brass);
      // A warm patina makes each metal tray distinct without painted textures.
      k.box(a+3,y+3,z+3,b-4,y+4,z+3.8,C.edge);
    }
  }},
  "kitchen-spice-shelf": { width:44,height:50,depth:24,size:.0225,build(k) {
    k.box(2,1,0,42,47,3,C.wood);
    for (const x of [2,40]) k.box(x,1,2,x+2,48,18,C.edge);
    for (const y of [1,22,43]) {
      k.box(2,y,2,42,y+2,22,C.wood); k.box(2,y+1,20,42,y+3,22,C.brass);
    }
    for (const [j,y] of [5,26].entries()) for (let i=0;i<3;i++) jar(k,9+i*13,y,12,[C.green,0xa46038,0x715479,0xc39652,0x5d7b70,0x9b534b][j*3+i]);
    for (const x of [5,39]) k.cyl([x,2,2],[x,46,2],1,C.brass);
    k.shape(2,46,0,42,50,4,(x,y)=>y<50-Math.abs(x-22)*.16,C.wood);
    moon(k,22,45,4,3);
  }},
};

const cache = new Map();
function model(id) {
  if (cache.has(id)) return cache.get(id);
  const recipe=recipes[id],item=KITCHEN_EQUIPMENT_BY_ID[id];
  if (!recipe || !item) throw new RangeError("Unknown kitchen equipment: "+id);
  const art={w:recipe.width,h:recipe.height},pixels=Array.from({length:art.h},()=>new Int32Array(art.w).fill(-1));
  const {grid}=buildModel(recipe,art,pixels),size=recipe.size;
  const geometry=meshGrid(grid,{scale:size,offset:[-recipe.width*size/2,0,item.wall?0:-recipe.depth*size/2]});
  let top=0;
  for(let i=0;i<grid.kind.length;i++)if(grid.kind[i])top=Math.max(top,Math.floor(i/grid.nx)%grid.ny+1);
  const data={id,native:true,mount:item.wall?"wall":"floor",anchor:item.wall?"wall-bottom-centre":"floor-centre",
    width:recipe.width*size,height:top*size,depth:recipe.depth*size,glowing:!!geometry[1],
    voxels:grid.count,triangles:geometry.reduce((n,g)=>n+(g?g.index.count/3:0),0),sockets:[]};
  const entry={geometry,data};cache.set(id,entry);return entry;
}
export function kitchenProp(id) {
  const m=model(id),group=voxelGroup(m.geometry,{shared:true});group.name=id;
  group.userData={...m.data,sockets:[]};return group;
}
export const kitchenPropStats=id=>({...model(id).data});
