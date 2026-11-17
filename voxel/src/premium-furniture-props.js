import { buildModel } from "./decor-models/kit.js";
import { meshGrid, voxelGroup } from "./voxel-mesh.js";
import { KITCHEN_ITEMS, KITCHEN_RECIPES } from "./decor-models/premium-kitchen.js";
import { BEDROOM_ITEMS, BEDROOM_RECIPES } from "./decor-models/premium-bedroom.js";

export const PREMIUM_FURNITURE_ITEMS = [...KITCHEN_ITEMS,...BEDROOM_ITEMS];
export const PREMIUM_FURNITURE_RECIPES = {...KITCHEN_RECIPES,...BEDROOM_RECIPES};
const cache=new Map();

// The same kit and mesher as the original furniture, with one shared cached model.
function model(id) {
  if(cache.has(id)) return cache.get(id);
  const item=PREMIUM_FURNITURE_ITEMS.find(p=>p.id===id),recipe=PREMIUM_FURNITURE_RECIPES[id];
  if(!item||!recipe) throw new RangeError(`Unknown premium furniture: ${id}`);
  const art={w:item.width,h:item.height},pixels=Array.from({length:art.h},()=>new Int32Array(art.w).fill(-1));
  const {grid}=buildModel(recipe,art,pixels),size=recipe.size??item.worldWidth/item.width,res=recipe.res??1;
  const geometry=meshGrid(grid,{scale:size/res,offset:[-item.width*size/2,0,-item.depth*size/2]});
  let top=0;
  for(let i=0;i<grid.kind.length;i++) if(grid.kind[i]) top=Math.max(top,Math.floor(i/grid.nx)%grid.ny+1);
  const stats={id,voxels:grid.count,triangles:geometry.reduce((n,g)=>n+(g?g.index.count/3:0),0),nx:grid.nx,ny:grid.ny,nz:grid.nz,res};
  const data={native:true,mount:"floor",width:item.width*size,height:top*size/res,depth:item.depth*size,glowing:geometry[1]!==null,
    anchor:"floor-centre",sockets:[],...stats};
  const result={geometry,data};cache.set(id,result);return result;
}

// The footprint centre is x/z zero, the floor y zero, and the front faces +z.
export function premiumFurnitureProp(id) {
  const m=model(id),group=voxelGroup(m.geometry,{shared:true});
  group.name=id;group.userData={...m.data,sockets:[]};return group;
}
export const premiumFurnitureStats=id=>({...model(id).data});
