// Two separate dining islands share one plan with their models and guests.
// The wider aisle stays north of the public road, clear of the serving queue.
export const DINING_TABLES=Object.freeze([
  {id:'a',x:49.2,z:3.2,w:1.6,d:.85,seatZ:2.3,approachX:47.9},
  {id:'b',x:52.2,z:3.2,w:1.6,d:.85,seatZ:2.3,approachX:50.9},
].map(Object.freeze));
export const DINING_SEATS=Object.freeze(DINING_TABLES.flatMap(t=>[-1,1].map(side=>Object.freeze({id:t.id+(side<0?'-left':'-right'),table:t.id,x:t.x+side*.5,z:t.seatZ}))));
const seatPlan=id=>DINING_SEATS.find(s=>s.id===id)??DINING_SEATS[0];
const tablePlan=seat=>DINING_TABLES.find(t=>t.id===seat.table);
export function diningRoute(id){const s=seatPlan(id),t=tablePlan(s);return [[31.8,10.2],[35,10.6],[38,8.6],[42.5,6.6],[t.approachX,6.6],[t.approachX,s.z],[s.x,s.z]];}
// Finished diners use the same eastbound public exit, without doubling back
// towards Skyla's counter through people still arriving for their meals.
export function diningExitRoute(id){const s=seatPlan(id),t=tablePlan(s);return [[s.x,s.z],[t.approachX,s.z],[t.approachX,6.6],[57,6.6]];}
export const routeLength=r=>r.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-r[i][0],p[1]-r[i][1]),0);
export function diningGuestPose(d){const r=d.phase==='leaving'?diningExitRoute(d.seat):diningRoute(d.seat);let k=d.phase==='eating'?routeLength(r):Math.max(0,d.distance);for(let i=1;i<r.length;i++){const a=r[i-1],b=r[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(k<=len||i===r.length-1){const t=Math.min(1,k/Math.max(.001,len));return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,dx:b[0]-a[0],seated:d.phase==='eating'};}k-=len;}return {x:0,z:0,dx:0,seated:false};}
