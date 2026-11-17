// Water rewards attention without replacing growth upgrades or yielding coins.
import { openPlots } from './farm.js';
export const WATER = Object.freeze({ cooldown: 12, progress: .12 });
export function wateringStatus(s, index) {
  const p=s.plots[index], last=p?.wateredAt;
  const seconds=Number.isFinite(last)?Math.max(0,last+WATER.cooldown-s.time):0;
  return { available:!s.paused && Number.isInteger(index) && index>=0 && index<openPlots(s) && p?.phase==='growing' && seconds===0, seconds };
}
export function waterPlot(s,index) {
  if(!wateringStatus(s,index).available)return false;
  const p=s.plots[index];p.wateredAt=s.time;p.progress=Math.min(1,p.progress+WATER.progress);
  if(p.progress>=1){p.phase='ready';p.ripe=s.time;}
  return true;
}
