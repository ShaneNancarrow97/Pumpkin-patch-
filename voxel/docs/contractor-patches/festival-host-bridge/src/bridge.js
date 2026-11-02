// Optional, deterministic host boundary. It never charges a guest, edits the
// world, reads storage or registers furniture. The host owns confirmed outcomes.
import { createFestivalEngine } from '../../festival-session/src/engine.js';
import { cleanOutcome } from '../adapters/outcomes.js';

const clone=value=>structuredClone(value);
const serialOK=n=>Number.isSafeInteger(n)&&n>=1&&n<Number.MAX_SAFE_INTEGER;
const key=e=>JSON.stringify([e.sessionId,e.kind,e.source,e.id]);

export function createFestivalBridge(definitions,{capacity=256}={}){
 if(!Number.isInteger(capacity)||capacity<1||capacity>2048)throw new RangeError('Bridge capacity must be1–2048');
 const engine=createFestivalEngine(definitions);
 function createState({namespace='festival-host'}={}){return {version:1,nextSerial:1,festival:engine.createState({namespace}),pending:[]};}
 const validState=s=>s?.version===1&&s.festival?.version===1&&Array.isArray(s.pending)&&serialOK(s.nextSerial);
 function bind(state,context={}){
  const no=reason=>({state,binding:null,accepted:false,reason});
  if(!validState(state))return no('unsupported-state');
  const stamp=engine.stamp(state.festival,context);
  if(!stamp)return no(context.paused?'game-paused':'not-capturing');
  if(state.nextSerial>=Number.MAX_SAFE_INTEGER-1)return no('serial-limit');
  const binding={id:`${state.festival.namespace}-event-${state.nextSerial}`,...stamp};
  return {state:{...state,nextSerial:state.nextSerial+1},binding,accepted:true,reason:'ok'};
 }
 function enqueue(state,input){
  const no=(reason,retryOutcome=null)=>({state,accepted:false,changed:false,reason,retryOutcome});
  if(!validState(state))return no('unsupported-state');
  const outcome=cleanOutcome(input);
  if(!outcome)return no('invalid-outcome');
  if(!outcome.sessionId.startsWith(state.festival.namespace+':'))return no('foreign-profile',clone(outcome));
  const existing=state.pending.find(e=>key(e)===key(outcome));
  if(existing){
   if(JSON.stringify(existing)!==JSON.stringify(outcome))return no('conflicting-outcome',clone(outcome));
   return {state,accepted:true,changed:false,reason:'already-queued',retryOutcome:null};
  }
  if(state.pending.length>=capacity)return no('queue-full',clone(outcome));
  return {state:{...state,pending:[...state.pending,outcome]},accepted:true,changed:true,reason:'ok',retryOutcome:null};
 }
 function flush(state,context={}){
  if(!validState(state))return {state,delivered:[],rejected:[{reason:'unsupported-state'}],held:state?.pending?.length??0};
  if(context.paused||state.festival.active?.phase==='paused')return {state,delivered:[],rejected:[],held:state.pending.length};
  if(!state.pending.length)return {state,delivered:[],rejected:[],held:0};
  let festival=state.festival;const delivered=[],rejected=[];
  for(const outcome of state.pending){
   const result=engine.reduce(festival,{type:'outcome',event:outcome},context);
   if(result.accepted){festival=result.state;delivered.push({key:key(outcome),kind:outcome.kind,reason:result.reason,changed:result.changed,effects:clone(result.effects)});}
   else rejected.push({key:key(outcome),reason:result.reason,outcome:clone(outcome)});
  }
  return {state:{...state,festival,pending:[]},delivered,rejected,held:0};
 }
 function dispatch(state,command,context={}){
  const no=reason=>({state,accepted:false,changed:false,reason,effects:[]});
  if(!validState(state))return no('unsupported-state');
  if(command?.type==='outcome')return no('use-enqueue');
  if(command?.type==='end'&&state.pending.length&&command.discardPending!==true)return no('pending-outcomes');
  const result=engine.reduce(state.festival,command,context);
  if(!result.accepted||!result.changed)return {...result,state};
  const next={...state,festival:result.state};
  const effects=[...result.effects];
  if(command.type==='end'&&command.discardPending===true&&state.pending.length){next.pending=[];effects.push({type:'festival-outcomes-discarded',count:state.pending.length});}
  return {...result,state:next,effects};
 }
 function view(state,context={}){return {...engine.view(state.festival,context),outbox:{pending:state.pending.length,capacity,free:Math.max(0,capacity-state.pending.length)}};}
 function save(state){return {version:1,nextSerial:state.nextSerial,festival:engine.save(state.festival),pending:clone(state.pending)};}
 function restore(raw){
  const bad=reason=>({state:null,compatible:false,warnings:[reason+' Preserve the original bridge payload.']});
  if(raw===undefined||raw===null)return {state:createState(),compatible:true,warnings:[]};
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1)return bad('Unsupported bridge version.');
  if(!serialOK(raw.nextSerial)||!Array.isArray(raw.pending))return bad('Invalid bridge identity or outbox.');
  if(!raw.festival||typeof raw.festival!=='object'||Array.isArray(raw.festival))return bad('Missing Festival Night state.');
  if(raw.pending.length>capacity)return bad('Outbox exceeds configured capacity; increase it or migrate explicitly.');
  const restored=engine.restore(raw.festival);
  if(!restored.compatible||!restored.state)return bad('Unsupported or unsafe Festival Night state.');
  const warnings=[...restored.warnings],pending=[],seen=new Map();
  const state={version:1,nextSerial:raw.nextSerial,festival:restored.state,pending};
  const prefix=state.festival.namespace+'-event-';
  function noteSerial(id){
   if(typeof id!=='string'||!id.startsWith(prefix))return;
   const tail=id.slice(prefix.length);if(!/^[1-9]\d*$/.test(tail))return;
   const n=Number(tail);if(serialOK(n)&&n<Number.MAX_SAFE_INTEGER-1&&n>=state.nextSerial){state.nextSerial=n+1;}
  }
  for(const input of raw.pending){
   const outcome=cleanOutcome(input);
   if(!outcome||!outcome.sessionId.startsWith(state.festival.namespace+':'))return bad('Malformed or foreign queued outcome.');
   const id=key(outcome),prior=seen.get(id);
   if(prior){if(JSON.stringify(prior)!==JSON.stringify(outcome))return bad('Conflicting saved outcomes share an identity.');warnings.push('Coalesced an exact duplicate queued outcome.');continue;}
   seen.set(id,outcome);pending.push(outcome);noteSerial(outcome.id);
  }
  for(const records of Object.values(state.festival.active?.progress??{}))for(const record of records){try{noteSerial(JSON.parse(record.key)[2]);}catch{/* The engine already validates its own ledger. */}}
  if(state.nextSerial!==raw.nextSerial)warnings.push('Advanced outcome serial beyond preserved evidence to prevent identity reuse.');
  return {state,compatible:true,warnings};
 }
 return Object.freeze({engine,capacity,createState,bind,enqueue,flush,dispatch,view,save,restore});
}
