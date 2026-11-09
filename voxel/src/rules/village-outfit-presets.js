import { costumeById, wearCostume } from './wardrobe.js';
export const OUTFIT_PRESET_NAMES=Object.freeze(['A moonlit walk','Working the patch','Lantern night']);
export const freshOutfitPresets=()=>({});
export function restoreOutfitPresets(raw){
 const out={};if(!raw||typeof raw!=='object')return out;
 for(let i=0;i<3;i++){
  const row=raw[i];if(!row||!['shane','natalie'].every(w=>costumeById[row[w]]?.character===w))continue;
  out[i]={shane:row.shane,natalie:row.natalie};
 }
 return out;
}
export const outfitPresetsOpen=s=>s.village?.expansion?.effects?.includes('tailoring')===true;
export function saveOutfitPreset(s,slot){
 if(s.paused||!outfitPresetsOpen(s)||!Number.isInteger(slot)||slot<0||slot>2)return false;
 const pair=s.wardrobe.equipped;
 if(!['shane','natalie'].every(w=>costumeById[pair[w]]?.character===w&&s.wardrobe.owned.includes(pair[w])))return false;
 s.village.expansion.outfits??={};s.village.expansion.outfits[slot]={shane:pair.shane,natalie:pair.natalie};return true;
}
export function wearOutfitPreset(s,slot){
 const pair=s.village?.expansion?.outfits?.[slot];
 if(s.paused||!outfitPresetsOpen(s)||!pair||!['shane','natalie'].every(w=>costumeById[pair[w]]?.character===w&&s.wardrobe.owned.includes(pair[w])))return false;
 for(const w of ['shane','natalie'])wearCostume(s,pair[w]);return true;
}
