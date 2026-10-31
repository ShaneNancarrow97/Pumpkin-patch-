// Water rewards attention without replacing growth upgrades or yielding coins.
import { openPlots } from './farm.js';
const lastWater = new WeakMap();
export const WATER = Object.freeze({ cooldown: 12, progress: .12 });
export function wateringStatus(s, index) {
  const p=s.plots[index], last=lastWater.get(p);
  const seconds=last===undefined?0:Math.max(0,last+WATER.cooldown-s.time);
  return { available:!s.paused && Number.isInteger(index) && index>=0 && index<openPlots(s) && p?.phase==='growing' && seconds===0, seconds };
}
export function waterPlot(s,index) {
  if(!wateringStatus(s,index).available)return false;
  const p=s.plots[index];lastWater.set(p,s.time);p.progress=Math.min(1,p.progress+WATER.progress);
  if(p.progress>=1){p.phase='ready';p.ripe=s.time;}
  return true;
}
