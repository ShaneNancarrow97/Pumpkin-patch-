// Visibility is presentation only: it never changes the tree's planted base or collision.
const smooth = (a,b,value) => { const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t); };
const point = p => p&&Number.isFinite(p.x)&&Number.isFinite(p.z);

// The great tree, measured from its model in world units: the trunk's half-width, where the crown starts and
// centres above its roots, and how wide and deep the crown is.
export const HERO_TREE = Object.freeze({ trunk: 2.2, crownFrom: 6.4, crownAt: 10.8, crownWide: 9.6, crownDeep: 4.8 });

// Inputs are Three world positions. The tree centre is its ground point, after realm scaling.
// From the street the crown hangs overhead and the tree stays whole. It clears only when it would hide the
// owner: its trunk across the line of sight, the lens inside it, or its crown between a raised lens and them.
export function villageTreeVisibility(player,camera,tree) {
  if(!point(player)||!point(tree)||!point(camera))return 1;
  const base=tree.y??0,ay=(player.y??base)+1.45,cy=camera.y??ay,T=HERO_TREE;
  const dx=player.x-camera.x,dy=ay-cy,dz=player.z-camera.z,flat=dx*dx+dz*dz;
  // The trunk: the nearest the sight line passes to it on the ground plan, while still below the crown.
  const t=flat?Math.max(0,Math.min(1,((tree.x-camera.x)*dx+(tree.z-camera.z)*dz)/flat)):0;
  let visible=cy+dy*t<base+T.crownFrom+1?smooth(T.trunk,T.trunk+1.8,Math.hypot(camera.x+dx*t-tree.x,camera.z+dz*t-tree.z)):1;
  // The crown: a wide, shallow ball of leaves. Depth is stretched so one radius measures both ways.
  const k=T.crownWide/T.crownDeep,ey=dy*k,oy=(cy-base-T.crownAt)*k,all=flat+ey*ey;
  const u=all?Math.max(0,Math.min(1,-((camera.x-tree.x)*dx+oy*ey+(camera.z-tree.z)*dz)/all)):0;
  visible=Math.min(visible,smooth(T.crownWide*.82,T.crownWide*1.08,Math.hypot(camera.x+dx*u-tree.x,oy+ey*u,camera.z+dz*u-tree.z)));
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
