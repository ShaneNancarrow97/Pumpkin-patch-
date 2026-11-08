// Visibility is presentation only: it never changes the tree's planted base or collision.
const smooth = (a,b,value) => { const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t); };
const point = p => p&&Number.isFinite(p.x)&&Number.isFinite(p.z);

// Inputs are Three world positions. The tree centre is its ground point, after realm scaling.
export function villageTreeVisibility(player,camera,tree) {
  if(!point(player)||!point(tree))return 1;
  let visible=smooth(10.5,17.5,Math.hypot(player.x-tree.x,player.z-tree.z));
  if(!point(camera))return visible;
  visible=Math.min(visible,smooth(6,12,Math.hypot(camera.x-tree.x,camera.z-tree.z)));
  // A canopy between the camera and the owner must clear even from beyond the plaza.
  const ay=(player.y??tree.y??0)+1.45,cy=camera.y??ay,ty=(tree.y??0)+9.5;
  const dx=camera.x-player.x,dy=cy-ay,dz=camera.z-player.z,length=dx*dx+dy*dy+dz*dz;
  const t=length?((tree.x-player.x)*dx+(ty-ay)*dy+(tree.z-player.z)*dz)/length:0;
  if(t>.05&&t<.98){
    const d=Math.hypot(player.x+dx*t-tree.x,ay+dy*t-ty,player.z+dz*t-tree.z);
    visible=Math.min(visible,smooth(5.5,9,d));
  }
  return visible;
}

// The same world-unit radii drive the grass shader and its regression checks.
export const VILLAGE_GRASS_FADE=Object.freeze({playerNear:1.2,playerFar:2.8,cameraNear:1.25,cameraFar:3});
export function villageGrassVisibility(at,player,camera) {
  if(!point(at))return 1;
  const a=point(player)?smooth(VILLAGE_GRASS_FADE.playerNear,VILLAGE_GRASS_FADE.playerFar,Math.hypot(at.x-player.x,at.z-player.z)):1;
  const b=point(camera)?smooth(VILLAGE_GRASS_FADE.cameraNear,VILLAGE_GRASS_FADE.cameraFar,Math.hypot(at.x-camera.x,at.z-camera.z)):1;
  return a*b;
}
