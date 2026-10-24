// Stable indices: existing saved guests and favour portraits keep their identities.
export const VISITOR_ROSTER = [
  {id:"ghost",name:"Pip"}, {id:"witch",name:"Mabel"}, {id:"vampire",name:"Bram"},
  {id:"skeleton",name:"Bones"}, {id:"scarecrow",name:"Patch"},
  {id:"mummy",name:"Linen"}, {id:"zombie",name:"Moss"}, {id:"werewolf",name:"Luna"},
  {id:"dead-pirate",name:"Captain Wraith"}, {id:"clown",name:"Jinx"},
  {id:"baron",name:"Baron Brassbolt",vip:true},
];
export const VISITOR_KINDS = VISITOR_ROSTER.map(v=>v.id);
// Rare visitors have stable sprite/save indices, but never join the normal cycle.
export const NORMAL_VISITOR_KINDS = VISITOR_ROSTER.filter(v=>!v.vip).map(v=>v.id);
export const visitorIdentity = kind => VISITOR_ROSTER[((Number.isInteger(kind)?kind:0)%VISITOR_ROSTER.length+VISITOR_ROSTER.length)%VISITOR_ROSTER.length];
