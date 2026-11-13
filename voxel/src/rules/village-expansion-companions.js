// A companion follows one owner and helps on committed work, never on attempts.
export const EXPANSION_COMPANION_IDS=Object.freeze(['elowen','rowan','mabel','tansy','opal','cinder','corvus','baron','granny']);
const KNOWN=new Set(EXPANSION_COMPANION_IDS), SPECIALTIES=Object.freeze({rowan:['logs','hardwood','fibre'],tansy:['herbs','emberbloom'],opal:['stone','iron','clay']});
const finite=n=>Number.isFinite(n)?Math.max(0,n):0;
export function freshExpansionCompanions(){return{selected:null,jobs:[],gathered:{}};}
export function restoreExpansionCompanions(raw){
 const out=freshExpansionCompanions();if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
 out.selected=KNOWN.has(raw.selected)?raw.selected:null;
 out.jobs=[...new Set((Array.isArray(raw.jobs)?raw.jobs:[]).filter(x=>typeof x==='string'&&x.length>0&&x.length<=160))].slice(-128);
 for(const who of EXPANSION_COMPANION_IDS)if(Number.isSafeInteger(raw.gathered?.[who])&&raw.gathered[who]>=0)out.gathered[who]=Math.min(1e9,raw.gathered[who]);
 return out;
}
export function companionInfo(s,who,area='green',{areaOpen=id=>id==='green'}={}){
 const f=s?.village?.friends?.[who],selected=s?.village?.expansion?.companions?.selected===who;
 const known=KNOWN.has(who),met=!!f?.met,bond=Number.isFinite(f?.xp)&&f.xp>=100,open=!!areaOpen(area);
 const reason=!known?'Unknown neighbour':!met?'Meet this neighbour first':!bond?'Become Friendly · friendship rank 3':!open?'Open this area before exploring together':s.paused?'Resume the farm first':selected?'Exploring together':'Invite to explore';
 return{who,selected,met,unlocked:known&&met&&bond,canSelect:known&&met&&bond&&open&&!s.paused,reason,specialty:SPECIALTIES[who]??[],gathersUntilBonus:5-((s?.village?.expansion?.companions?.gathered?.[who]??0)%5)};
}
export function selectVillageCompanion(s,who,area='green',options={}){
 const data=s?.village?.expansion?.companions;if(!data||s.paused)return{ok:false,reason:s?.paused?'Resume the farm first':'The village journey is not ready'};
 if(who===null){const changed=data.selected!==null;data.selected=null;return{ok:true,changed,events:changed?[{type:'village-companion',who:null}]:[]};}
 const info=companionInfo(s,who,area,options);if(!info.canSelect)return{ok:false,reason:info.reason};
 const changed=data.selected!==who;data.selected=who;return{ok:true,changed,events:changed?[{type:'village-companion',who}]:[]};
}
// The caller supplies a stable node/cycle key and the real material capacity.
export function recordCompanionGather(s,{job,material,quantity,who,capacity=40}={}){
 const c=s?.village?.expansion?.companions;if(!c||s.paused||typeof job!=='string'||!job||job.length>160||!Number.isSafeInteger(quantity)||quantity<=0||!KNOWN.has(c.selected)||who&&who!==c.selected)return 0;
 if(c.jobs.includes(job))return 0;c.jobs.push(job);if(c.jobs.length>128)c.jobs.shift();
 const selected=c.selected;if(!SPECIALTIES[selected]?.includes(material))return 0;
 c.gathered[selected]=Math.min(1e9,(c.gathered[selected]??0)+1);
 if(c.gathered[selected]%5)return 0;
 const store=s.village.materials;if(!Object.hasOwn(store,material))return 0;
 const cap=Number.isFinite(capacity)?Math.max(0,Math.floor(capacity)):40,have=finite(store[material]);if(have>=cap)return 0;
 store[material]=have+1;return 1;
}
// Movement has no renderer dependency. A layer change resets at a safe post;
// a blocked follower can regroup only when the view explicitly hides it first.
export function advanceExpansionCompanion(previous,owner,dt,{area='green',heading={x:0,z:-1},free=()=>true,canRegroup=false}={}){
 if(!owner||![owner.x,owner.z,dt].every(Number.isFinite)||dt<0)return previous??null;
 const length=Math.hypot(heading.x,heading.z)||1,hx=heading.x/length,hz=heading.z/length,target={x:owner.x-hx*2,z:owner.z-hz*2};
 const safe=(x,z)=>!!free(x,z),spawn=[target,{x:owner.x-hz*1.7,z:owner.z+hx*1.7},{x:owner.x+hz*1.7,z:owner.z-hx*1.7}].find(p=>safe(p.x,p.z));
 if(!previous||previous.area!==area){return spawn?{...spawn,area,blockedFor:0,walking:false,distance:0,heading:{x:hx,z:hz},visible:true}:null;}
 const out={...previous,heading:{...previous.heading},walking:false},dx=target.x-out.x,dz=target.z-out.z,d=Math.hypot(dx,dz),speed=Math.min(d,3.6*Math.min(dt,.25));
 if(d>.35&&speed>0){const n=Math.max(1,Math.ceil(speed/.15));for(let i=0;i<n;i++){const x=out.x+dx/d*speed/n,z=out.z+dz/d*speed/n;if(safe(x,z)){out.x=x;out.z=z;}else if(safe(x,out.z))out.x=x;else if(safe(out.x,z))out.z=z;}}
 const travelled=Math.hypot(out.x-previous.x,out.z-previous.z);out.walking=travelled>.0005;out.distance=(previous.distance??0)+travelled;
 if(out.walking){out.heading={x:(out.x-previous.x)/travelled,z:(out.z-previous.z)/travelled};out.blockedFor=0;}else out.blockedFor=d>3?(previous.blockedFor??0)+Math.min(dt,.25):0;
 if(canRegroup&&out.blockedFor>=2&&spawn){out.x=spawn.x;out.z=spawn.z;out.blockedFor=0;out.walking=false;}
 out.visible=Math.hypot(out.x-owner.x,out.z-owner.z)<24;return out;
}
// Proximity belongs to the controller, just as for the existing greeting path.
export function markExpansionNeighbourMet(s,who){
 const friend=s?.village?.friends?.[who];if(!KNOWN.has(who)||!friend||s.paused)return{ok:false,reason:s?.paused?'Resume the farm first':'Unknown neighbour'};
 const changed=!friend.met;friend.met=true;return{ok:true,changed,events:changed?[{type:'village-neighbour-met',who}]:[]};
}
