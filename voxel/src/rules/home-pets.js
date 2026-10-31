// Pet schedules are presentation-only; beds follow normal saved furniture poses.
export const HOME_PET_NAMES = Object.freeze({ skyla: "Skyla", maisie: "Maisie", sandy: "Sandy" });
export const HOME_PET_ACTIONS = Object.freeze(["idle", "walk", "wag", "sleep", "stretch", "eat", "drink"]);
export function homePetRooms(s) {
  const placed=s.house?.placed??[],cats=placed.filter(p=>p.id==="moon-cat-bed"),dogs=placed.filter(p=>p.id==="harvest-dog-bed");
  const open=room=>room==="parlour"||room==="bedroom"&&s.house.level>=1||room==="kitchen"&&s.house.level>=2||room==="attic"&&s.house.level>=3;
  return {
    skyla:open(cats[0]?.room)?cats[0].room:"parlour",
    sandy:open(dogs[0]?.room)?dogs[0].room:s.house.level>=1?"bedroom":"parlour",
    maisie:open(dogs[1]?.room)?dogs[1].room:s.house.level>=2?"kitchen":"parlour",
  };
}
export function petCellFree(point,layout,obstacles=[],radius=.2) {
  const {x,z}=point;
  return Number.isFinite(x)&&Number.isFinite(z)&&x>=radius&&z>=radius&&x<=layout.w-radius&&z<=layout.d-radius&&
    !obstacles.some(b=>x>b.x0-radius&&x<b.x1+radius&&z>b.z0-radius&&z<b.z1+radius);
}
// A small breadth-first half-cell grid walks around furniture instead of through it.
// The closest reachable cell is used when a bed/bowl is backed against a wall.
export function petRoute(from,to,layout,obstacles=[],radius=.2) {
  if(!from||!to||!layout||![from.x,from.z,to.x,to.z,layout.w,layout.d].every(Number.isFinite)||layout.w<=0||layout.d<=0)return [];
  const step=.5,cols=Math.max(1,Math.floor(layout.w/step)),rows=Math.max(1,Math.floor(layout.d/step));
  const point=i=>({x:(i%cols+.5)*step,z:(Math.floor(i/cols)+.5)*step});
  const distance=(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2;
  const free=Array.from({length:cols*rows},(_,i)=>petCellFree(point(i),layout,obstacles,radius));
  let start=-1,best=Infinity;
  for(let i=0;i<free.length;i++)if(free[i]){const d=distance(from,point(i));if(d<best){best=d;start=i;}}
  if(start<0)return [];
  const queue=[start],prev=new Int32Array(free.length).fill(-2);prev[start]=-1;
  let end=start,nearest=distance(point(start),to);
  for(let at=0;at<queue.length;at++) {
    const i=queue[at],x=i%cols,z=Math.floor(i/cols),d=distance(point(i),to);
    if(d<nearest){nearest=d;end=i;}
    for(const [a,b] of [[x-1,z],[x+1,z],[x,z-1],[x,z+1]]){
      if(a<0||a>=cols||b<0||b>=rows)continue;
      const next=b*cols+a;if(free[next]&&prev[next]===-2){prev[next]=i;queue.push(next);}
    }
  }
  const path=[];for(let i=end;i>=0;i=prev[i])path.push(point(i));return path.reverse();
}
