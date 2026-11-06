import {DINING_SEATS,diningRoute,diningExitRoute,routeLength} from '../content/cooking-dining.js';
export function offerDiningSeat(s,c){
 const diners=s.kitchen?.diners;if(!diners||c.food?.status!=='paid'||c.diningOffered)return false;c.diningOffered=true;
 const seat=DINING_SEATS.find(seat=>!diners.some(d=>d.seat===seat.id));if(!seat)return false;
 diners.push({id:'food-'+c.id,customerId:c.id,kind:c.kind,recipe:c.food.recipe,quantity:c.food.quantity,seat:seat.id,phase:'approach',distance:0,remaining:15+c.food.quantity*3});return true;
}
export function updateDining(s,dt){if(s.paused||!s.kitchen?.diners||!Number.isFinite(dt)||dt<=0)return;for(const d of s.kitchen.diners){if(d.phase==='eating'){d.remaining-=dt;if(d.remaining<=0){d.phase='leaving';d.distance=0;}}else{d.distance+=dt*2.4;if(d.distance>=routeLength(d.phase==='leaving'?diningExitRoute(d.seat):diningRoute(d.seat))){if(d.phase==='approach'){d.phase='eating';d.distance=0;}else d.done=true;}}}s.kitchen.diners=s.kitchen.diners.filter(d=>!d.done);}
