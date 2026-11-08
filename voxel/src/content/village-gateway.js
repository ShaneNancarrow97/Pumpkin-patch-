// A permanent junction in the original east yard, outside every purchased footprint.
// South-field rows and the cocoa meadow grow round it without moving the route.
const x=37.8,z=15.1;
const lane=[[31.6,15.6],[34.4,17.2],[x,17.2],[x,13.65]].map(p=>Object.freeze(p));
export const VILLAGE_GATEWAY = Object.freeze({x,z,halfWidth:1,
  approach:Object.freeze({x,z:16.7}),
  zone:Object.freeze({x0:x-.74,x1:x+.74,z0:z-.35,z1:z+.35}),
  lane:Object.freeze(lane),
  clearance:Object.freeze({x0:35.7,x1:39.75,z0:13.2,z1:18.3}),
});
export function atVillageGateway(p){const g=VILLAGE_GATEWAY.zone;return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=g.x0&&p.x<=g.x1&&p.z>=g.z0&&p.z<=g.z1;}
// The renderer uses the farm's own cobble recipe for this entire continuous spur.
export function villageGatewayPathDistance(x,z){
  let best=Infinity;
  for(let i=1;i<lane.length;i++){const [ax,az]=lane[i-1],[bx,bz]=lane[i],dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
    best=Math.min(best,Math.hypot(x-ax-dx*t,z-az-dz*t));}
  return best;
}
export const onVillageGatewayPath=(x,z)=>villageGatewayPathDistance(x,z)<VILLAGE_GATEWAY.halfWidth;
