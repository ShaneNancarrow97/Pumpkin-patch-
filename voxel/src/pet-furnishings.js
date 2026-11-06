import { buildModel } from "./decor-models/kit.js";
import { meshGrid, voxelGroup } from "./voxel-mesh.js";
import { PET_FURNISHINGS } from "./content/pet-furnishings.js";

// Fine, exposed-face voxels match the cottage’s walnut, brass and plum fabrics.
const C = { wood: 0x65402b, light: 0x98683d, dark: 0x432c25, plum: 0x70435f, seam: 0xa77b88, cream: 0xe9d6ad, gold: 0xbc9658, water: 0x627e9b, waterLight: 0x9ab0c0, food: 0x8c5630 };
const recipes = {
  "moon-cat-bed": { width: 46, height: 22, depth: 40, size: .02, build(k) {
    k.lathe(23,20,0,5,[[0,18],[.5,21],[1,21]],C.dark);
    k.shape(1,3,0,45,22,40,(x,y,z) => {
      const r=((x-23)/22)**2+((z-20)/20)**2;
      return r<1 && (r>.72 || y<6) && y<14+(20-z)*.35;
    },(x,y,z) => (Math.floor(y/2)+Math.floor((x+z)/4))%2 ? C.wood : C.light);
    k.lathe(23,20,5,10,[[0,17],[.5,18],[1,17]],C.plum);
    k.shape(10,9,10,36,10,30,(x,y,z)=>((x-23)/13)**2+((z-20)/10)**2<1,C.seam);
    // A tiny brass crescent is stitched to the taller back of the basket.
    k.shape(18,13,1,28,21,3,(x,y)=>(x-23)**2+(y-17)**2<16&&(x-25)**2+(y-18)**2>11,C.gold);
  }},
  "harvest-dog-bed": { width: 92, height: 16, depth: 42, size: .02, build(k) {
    k.box(1,0,1,91,4,41,C.dark); k.box(2,3,2,90,6,40,C.wood);
    // Raised upholstered bolsters leave the front low for little legs.
    for(const [a,b] of [[2,10],[82,90]])k.box(a,5,3,b,15,39,C.plum);
    k.box(8,5,3,84,15,10,C.plum); k.box(8,5,34,84,9,39,C.plum);
    k.box(11,5,11,81,9,33,C.plum);
    for(const x of [17,29,41,53,65,77])k.box(x,9,11,x+1,10,33,C.seam);
    for(const z of [15,25])k.box(11,9,z,81,10,z+1,C.seam);
    for(const x of [4,84])k.box(x,7,39,x+4,11,41,C.gold);
    k.box(39,8,39,53,13,41,C.cream);k.box(43,9,41,49,12,42,C.gold);
  }},
  "midnight-pet-bowls": { width: 45, height: 10, depth: 33, size: .02, build(k) {
    k.box(0,0,0,45,2,33,C.dark);k.box(1,2,1,44,3,32,C.wood);
    for(const x of [2,42])k.box(x,2,2,x+1,4,31,C.gold);
    for(const [x,paint] of [[12,C.food],[33,C.water]]) {
      k.lathe(x,17,3,9,[[0,7],[.2,8],[1,9]],C.cream);
      k.carve(x-8,6,9,x+8,11,25,(a,b,c)=>(a-x)**2+(c-17)**2<49);
      k.lathe(x,17,5,6,6.8,paint);
      if(paint===C.food) for(const [a,z] of [[-3,16],[1,13],[3,19],[-1,20]])k.ball(x+a,6, z,1.5,1.3,1.5,C.food);
      else {k.box(x-4,6,15,x-1,7,16,C.waterLight); k.box(x+1,6,19,x+4,7,20,C.waterLight);}
      k.shape(x-9,8,8,x+9,9,26,(a,b,c)=>(a-x)**2+(c-17)**2<82&&(a-x)**2+(c-17)**2>65,C.gold);
    }
  }},
};
const cache=new Map();
function model(id) {
  if(cache.has(id))return cache.get(id);
  const recipe=recipes[id];if(!recipe)return null;
  const pixels=Array.from({length:recipe.height},()=>new Int32Array(recipe.width).fill(-1));
  const {grid}=buildModel(recipe,{w:recipe.width,h:recipe.height},pixels);
  const geometry=meshGrid(grid,{scale:recipe.size,offset:[-recipe.width*recipe.size/2,0,-recipe.depth*recipe.size/2]});
  const data={id,native:true,mount:"floor",anchor:"floor-centre",width:recipe.width*recipe.size,height:recipe.height*recipe.size,depth:recipe.depth*recipe.size,voxels:grid.count,triangles:geometry.reduce((n,g)=>n+(g?g.index.count/3:0),0),sockets:[],petUse:PET_FURNISHINGS.find(p=>p.id===id).petUse};
  const entry={geometry,data};cache.set(id,entry);return entry;
}
export function buildPetFurnishing(id) {const m=model(id);if(!m)return null;const group=voxelGroup(m.geometry,{shared:true});group.name=id;group.userData={...m.data,sockets:[]};return group;}
export const petFurnishingStats=id=>{const m=model(id);return m?{...m.data}:null;};
