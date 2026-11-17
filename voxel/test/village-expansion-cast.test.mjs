import test from 'node:test';
import assert from 'node:assert/strict';
import { CAST_CHAPTERS, CAST_CHAPTER_BY_ID, CAST_CHAPTER_COUNTS, EXPANSION_FOLK_DETAILS } from '../src/content/village-expansion-cast.js';
import { FOLK_BY_ID, FRIEND_XP } from '../src/content/village-folk.js';
import { freshExpansionCompanions, restoreExpansionCompanions, companionInfo, selectVillageCompanion, recordCompanionGather, advanceExpansionCompanion, markExpansionNeighbourMet } from '../src/rules/village-expansion-companions.js';
const farm=()=>({paused:false,village:{friends:Object.fromEntries(['elowen','rowan','mabel','tansy','opal','cinder','corvus','baron','granny'].map(id=>[id,{met:false,xp:0}])),materials:{logs:0,stone:0,herbs:0,fibre:0},expansion:{companions:freshExpansionCompanions()}}});

test('personal stories have distinct authored actions, stable dependencies and four actual puzzle families',()=>{
 assert.equal(CAST_CHAPTERS.length,41);const chapters=new Set(),activities=new Set(),mechanics=new Set();
 for(const c of CAST_CHAPTERS){assert.ok(FOLK_BY_ID[c.who]);assert.ok(!chapters.has(c.id));chapters.add(c.id);assert.ok(c.intro[0].text.length>25);assert.ok(c.done[0].text.length>25);assert.ok(c.activities.length>=3&&c.activities.length<=5);
  for(const a of c.activities){assert.ok(!activities.has(a.id));activities.add(a.id);assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.z));if(a.type==='puzzle'){mechanics.add(a.puzzleKind);assert.ok(a.solution.every(x=>a.choices.includes(x)));assert.ok(a.hint.length>20);}}
  if(c.needs.startsWith('cast-'))assert.ok(CAST_CHAPTER_BY_ID[c.needs]);
 }
 assert.deepEqual([...mechanics].sort(),['flavour-set','light-route','sequence','stage-slots']);
 assert.equal(CAST_CHAPTER_COUNTS.granny,5);assert.equal(CAST_CHAPTER_COUNTS.elowen,3);
});
test('new neighbours can reach every personal chapter through their story without repeated gift grinding',()=>{
 for(const who of ['mabel','tansy','opal','cinder','corvus','baron','granny']){
  let xp=0;const own=CAST_CHAPTERS.filter(c=>c.who===who);assert.deepEqual(own.map(c=>c.rank),[1,3,5,7,10]);
  for(const c of own){const rank=FRIEND_XP.filter(n=>n<=xp).length;assert.ok(rank>=c.rank,`${who} reaches ${c.title} without gifts`);xp=Math.min(FRIEND_XP.at(-1),xp+c.reward.friendship[who]);}
 }
});
test('new cast have real optional dialogue in each bond band and keep established residents intact',()=>{
 for(const who of Object.keys(EXPANSION_FOLK_DETAILS)){const f=FOLK_BY_ID[who];assert.equal(f.playable,true);assert.deepEqual(f.chats.map(c=>c.band),[1,2,3]);for(const c of f.chats){assert.equal(c.choices.length,3);assert.deepEqual(c.choices.map(x=>x.tone),['warm','curious','playful']);assert.ok(c.choices.every(x=>x.reply.length>12));}}
 assert.equal(FOLK_BY_ID.elowen.chats.length,18);assert.equal(FOLK_BY_ID.rowan.chats.length,18);assert.equal(FOLK_BY_ID.granny.district,'acre');
});
test('meeting and companion selection respect friendship, pause and the actual area gate',()=>{
 const s=farm();assert.equal(selectVillageCompanion(s,'mabel').ok,false);const meet=markExpansionNeighbourMet(s,'mabel');assert.equal(meet.changed,true);assert.equal(markExpansionNeighbourMet(s,'mabel').changed,false);assert.equal(companionInfo(s,'mabel').canSelect,false);
 s.village.friends.mabel.xp=100;assert.equal(selectVillageCompanion(s,'mabel','copse').ok,false);assert.equal(selectVillageCompanion(s,'mabel','copse',{areaOpen:id=>id==='copse'}).ok,true);assert.equal(s.village.expansion.companions.selected,'mabel');
 s.paused=true;assert.equal(selectVillageCompanion(s,null).ok,false);assert.equal(markExpansionNeighbourMet(s,'opal').ok,false);s.paused=false;assert.equal(selectVillageCompanion(s,null).ok,true);assert.equal(s.village.expansion.companions.selected,null);assert.equal(selectVillageCompanion(s,'vesper').ok,false);
});
test('companions award only the fifth committed matching gather, with a finite store and stable job receipt',()=>{
 const s=farm();s.village.friends.rowan={met:true,xp:100};selectVillageCompanion(s,'rowan');
 for(let i=1;i<=4;i++)assert.equal(recordCompanionGather(s,{job:`logs-01:${i}`,material:'logs',quantity:2}),0);assert.equal(s.village.materials.logs,0);
 assert.equal(recordCompanionGather(s,{job:'logs-01:5',material:'logs',quantity:2}),1);assert.equal(s.village.materials.logs,1);assert.equal(recordCompanionGather(s,{job:'logs-01:5',material:'logs',quantity:2}),0);
 assert.equal(recordCompanionGather(s,{job:'stone-01:1',material:'stone',quantity:2}),0);assert.equal(recordCompanionGather(s,{job:'logs-01:6',material:'logs',quantity:0}),0);assert.equal(recordCompanionGather(s,{job:'logs-01:6',material:'logs',quantity:'2'}),0);
 s.village.materials.logs=40;for(let i=6;i<=10;i++)assert.equal(recordCompanionGather(s,{job:`logs-01:${i}`,material:'logs',quantity:2}),0);assert.equal(s.village.materials.logs,40);
 s.paused=true;assert.equal(recordCompanionGather(s,{job:'logs-01:11',material:'logs',quantity:2}),0);
 const saved=JSON.parse(JSON.stringify(s.village.expansion.companions)),restored=restoreExpansionCompanions(saved);assert.deepEqual(restored,saved);assert.equal(restored.gathered.rowan,10);
});
test('malformed companion state is bounded and cannot retain an unknown follower',()=>{
 const c=restoreExpansionCompanions({selected:'monster',jobs:[null,...Array.from({length:200},(_,i)=>`j${i}`),'j199'],gathered:{rowan:Infinity,opal:7,unknown:99}});
 assert.equal(c.selected,null);assert.equal(c.jobs.length,128);assert.equal(c.jobs.at(-1),'j199');assert.deepEqual(c.gathered,{opal:7});
});
test('follower movement stays on the active layer, sweeps collisions and cannot regroup through a gate',()=>{
 const owner={x:0,z:4},free=(x,z)=>x<1&&z>=0;let p=advanceExpansionCompanion(null,owner,.1,{area:'green',heading:{x:0,z:1},free});assert.ok(p);assert.equal(p.z,2);
 const before={...p};p=advanceExpansionCompanion(p,{x:4,z:4},.2,{area:'green',heading:{x:1,z:0},free});assert.ok(p.x<1);assert.ok(p.z>=0);
 for(let i=0;i<15;i++)p=advanceExpansionCompanion(p,{x:9,z:4},.2,{area:'green',heading:{x:1,z:0},free});assert.ok(p.x<1,'no silent teleport through a locked boundary');
 assert.equal(advanceExpansionCompanion(p,{x:5,z:4},.1,{area:'cave-shallows',free:()=>false}),null);
 const next=advanceExpansionCompanion(p,owner,.1,{area:'cave-shallows',free});assert.equal(next.area,'cave-shallows');assert.equal(next.walking,false);assert.equal(next.distance,0);assert.notEqual(before.area,next.area);
});
