// Tables sit north of the meadow, clear of both the receiving cart and public path.
export const DINING_SEATS=[{id:'a-left',x:48.4,z:2.3},{id:'a-right',x:49.4,z:2.3},{id:'b-left',x:51,z:2.3},{id:'b-right',x:52,z:2.3}];
export function diningRoute(seat){const s=DINING_SEATS.find(s=>s.id===seat)??DINING_SEATS[0],x=s.x<50?47.6:50.2;return [[31.8,10.2],[35,10.6],[38,8.6],[42.5,6.6],[x,6.6],[x,2.3],[s.x,s.z]];}
export const diningExitRoute=seat=>[...diningRoute(seat)].reverse().slice(0,-1).concat([[57,6.6]]);
export const routeLength=r=>r.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-r[i][0],p[1]-r[i][1]),0);
export function diningGuestPose(d){const r=d.phase==='leaving'?diningExitRoute(d.seat):diningRoute(d.seat);let k=d.phase==='eating'?routeLength(r):Math.max(0,d.distance);for(let i=1;i<r.length;i++){const a=r[i-1],b=r[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(k<=len||i===r.length-1){const t=Math.min(1,k/Math.max(.001,len));return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,dx:b[0]-a[0],seated:d.phase==='eating'};}k-=len;}return {x:0,z:0,dx:0,seated:false};}
