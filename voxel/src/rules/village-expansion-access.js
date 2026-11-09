// Gates are dependency-light: navigation and level checks never load reward rules.
import {EXPANSION_AREA_BY_ID,EXPANSION_CHAPTER_BY_ID,EXPANSION_LEVEL_GATES} from '../content/village-expansion.js';
import {patchLevel} from './levels.js';
export const EXPANSION_SEAL_FLAGS=Object.freeze(['green-seal','copse-seal','quarry-seal','moor-seal']);
export function hasExpansionReward(s,id){const e=s?.village?.expansion;if(!e)return false;if(id==='four-seals')return EXPANSION_SEAL_FLAGS.every(flag=>e.effects?.includes(flag));return !!(e.effects?.includes(id)||e.chapters?.[id]===true);}
export function requirementMet(s,id){if(!id)return true;if(Array.isArray(id))return id.every(k=>requirementMet(s,k));return id.startsWith('legacy:')?!!s?.village?.quests?.[id.slice(7)]?.done:hasExpansionReward(s,id);}
// This function only reads flags and honoured levels; it must not call patchLevel.
export function expansionLevelRequirement(s,level){
 const id=EXPANSION_LEVEL_GATES[level];if(!id)return null;
 const honour=(s?.progression?.claimed??[]).includes(level)||(s?.progression?.homeLegacyThrough??1)>=level;
 const title=({'copse-restored':'Restore Moonroot Copse','restaurant-opening':'Open Cinder’s restaurant','four-seals':'Restore the carnival and four village seals','marsh-restored':'Complete the Mirror Marsh investigation'})[id];
 const met=honour||hasExpansionReward(s,id);return{id:'village:'+id,text:title,current:met?1:0,target:1,met,action:'village',room:'parlour'};
}
export function expansionAreaInfo(s,id){
 const a=EXPANSION_AREA_BY_ID[id];if(!a)return null;
 const invited=!!s?.village?.invited,level=s?.progression?patchLevel(s).level:1,ready=requirementMet(s,a.needs),open=invited&&(id==='green'||level>=a.level&&ready);
 const reason=!invited?'Follow Elowen’s invitation.':id!=='green'&&level<a.level?`Opens at farm level ${a.level}.`:!ready?`Finish ${a.needs?.startsWith('legacy:')?a.needs.slice(7).replaceAll('-',' '):EXPANSION_CHAPTER_BY_ID[a.needs]?.title??a.needs?.replaceAll('-',' ')} first.`:'Ready to explore.';
 return{...a,open,unlocked:open,available:open,reason};
}
