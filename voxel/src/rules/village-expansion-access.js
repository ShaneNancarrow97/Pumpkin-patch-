// Gates are dependency-light: navigation and level checks never load reward rules.
import {EXPANSION_AREA_BY_ID,EXPANSION_CHAPTER_BY_ID,EXPANSION_LEVEL_GATES} from '../content/village-expansion.js';
import {patchLevel} from './levels.js';
export const EXPANSION_SEAL_FLAGS=Object.freeze(['green-seal','copse-seal','quarry-seal','moor-seal']);
export function hasExpansionReward(s,id){const e=s?.village?.expansion;if(!e)return false;if(id==='four-seals')return EXPANSION_SEAL_FLAGS.every(flag=>e.effects?.includes(flag));return !!(e.effects?.includes(id)||e.chapters?.[id]===true);}
export function requirementMet(s,id){if(!id)return true;if(Array.isArray(id))return id.every(k=>requirementMet(s,k));return id.startsWith('legacy:')?!!s?.village?.quests?.[id.slice(7)]?.done:hasExpansionReward(s,id);}
// This function only reads flags and honoured levels; it must not call patchLevel.
export function expansionLevelRequirement(s,level){
 const gate=EXPANSION_LEVEL_GATES[level];if(!gate)return null;
 const ids=Array.isArray(gate)?gate:[gate],honour=(s?.progression?.claimed??[]).includes(level)||(s?.progression?.homeLegacyThrough??1)>=level;
 const checks=ids.flatMap(id=>id==='four-seals'?EXPANSION_SEAL_FLAGS:[id]);
 const current=checks.filter(id=>hasExpansionReward(s,id)).length,met=honour||current===checks.length;
 const sealNames={'green-seal':'Hollow Green','copse-seal':'Moonroot Copse','quarry-seal':'Lantern Quarry','moor-seal':'Carnival Moor'};
 const label=id=>sealNames[id]?`Restore the ${sealNames[id]} seal`:`Complete “${EXPANSION_CHAPTER_BY_ID[id]?.title??id.replaceAll('-',' ')}”`;
 const missing=checks.filter(id=>!hasExpansionReward(s,id));
 const text=gate==='four-seals'?`Restore all four village seals (${honour?4:current}/4)${!met?' · Still needed: '+missing.map(id=>sealNames[id]).join(', '):''}`:(met?checks:missing).map(label).join(' · ');
 return{id:'village:'+ids.join('+'),text,current:honour?checks.length:current,target:checks.length,met,action:'village',room:'parlour'};
}
export function expansionAreaInfo(s,id){
 const a=EXPANSION_AREA_BY_ID[id];if(!a)return null;
 const invited=!!s?.village?.invited,level=s?.progression?patchLevel(s).level:1,ready=requirementMet(s,a.needs),open=invited&&(id==='green'||level>=a.level&&ready);
 const reason=!invited?'Follow Elowen’s invitation.':id!=='green'&&level<a.level?`Opens at farm level ${a.level}.`:!ready?`Finish ${a.needs?.startsWith('legacy:')?a.needs.slice(7).replaceAll('-',' '):EXPANSION_CHAPTER_BY_ID[a.needs]?.title??a.needs?.replaceAll('-',' ')} first.`:'Ready to explore.';
 return{...a,open,unlocked:open,available:open,reason};
}
