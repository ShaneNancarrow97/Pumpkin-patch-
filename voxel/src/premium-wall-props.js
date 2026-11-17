import { buildModel } from "./decor-models/kit.js";
import { meshGrid, voxelGroup } from "./voxel-mesh.js";
import { PREMIUM_WALL_ITEMS, PREMIUM_WALL_RECIPES } from "./decor-models/premium-walls.js";

export { PREMIUM_WALL_ITEMS, PREMIUM_WALL_RECIPES };
const cache = new Map();

// Pure-colour recipes need no texture load. Keep one shared mesh per model.
function model(id) {
  if(cache.has(id)) return cache.get(id);
  const item=PREMIUM_WALL_ITEMS.find(p=>p.id===id),recipe=PREMIUM_WALL_RECIPES[id];
  if(!item||!recipe) throw new RangeError(`Unknown premium wall piece: ${id}`);
  const art={w:item.width,h:item.height},pixels=Array.from({length:art.h},()=>new Int32Array(art.w).fill(-1));
  const {grid}=buildModel(recipe,art,pixels),size=recipe.size;
  const geometry=meshGrid(grid,{scale:size,offset:[-item.width*size/2,0,0]});
  let top=0;
  for(let i=0;i<grid.kind.length;i++) if(grid.kind[i]) top=Math.max(top,Math.floor(i/grid.nx)%grid.ny+1);
  const stats={id,voxels:grid.count,triangles:geometry.reduce((n,g)=>n+(g?g.index.count/3:0),0),nx:grid.nx,ny:grid.ny,nz:grid.nz};
  const data={native:true,mount:"wall",width:item.width*size,height:top*size,depth:item.depth*size,glowing:geometry[1]!==null,
    anchor:"back-bottom-centre",sockets:[],...stats};
  const result={geometry,data};cache.set(id,result);return result;
}

// Compatible with decorProp: centre x, base y=0, back z=0, face towards +z.
export function premiumWallProp(id) {
  const m=model(id),group=voxelGroup(m.geometry,{shared:true});
  group.name=id;group.userData={...m.data,sockets:[]};return group;
}
export const premiumWallStats=id=>({...model(id).data});
