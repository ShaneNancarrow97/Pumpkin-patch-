// A gesture owns one job. Rules change only on its once-only completion.
import { beginAction, tickAction, cancelAction, actionProgress, selectNextPlot, selectNearestPlot, HOLD_ORDER, ACTION_REACH, actionAvailable } from './rules/life-actions.js';
import { PLOTS } from './world.js';

export function createLifeActivity({state,player,commit,blocked,notice}){
  let job=null,pending=null,holding=false,assisted=false,serial=0,last=null,heldTool='hand';
  // Holding the action keeps working across the whole patch: the same job first, then (with bare hands) whatever's next.
  const kindsFor=(tool,kind)=>tool==='hand'?[kind,...HOLD_ORDER.filter(k=>k!==kind)].filter(Boolean):[kind];
  function walkToWork(target,kind){const p=player.state(),d=Math.hypot(p.position.x-target.x,p.position.z-target.z);if(d<=ACTION_REACH-.1)return start(target,kind,true);if(player.walkTo?.(target)){pending={kind,target};serial++;return true;}return false;}
  const snapshot=()=>({active:!!job||!!pending,progress:actionProgress(job),kind:job?.kind??pending?.kind??null,label:job?.label??(pending?'Walking to the next crop':''),holding,assisted,travelling:!!pending,target:job?.target??pending?.target??null,serial,last});
  function cancel(){const had=!!job||!!pending;cancelAction(job);job=null;pending=null;holding=false;assisted=false;player.cancelWalk?.();player.cancelAction?.();return had;}
  function start(target,tool,hold=false){
    const s=state(),p=player.state();if(!p.enabled||p.available===false||s.paused||blocked())return false;
    const distance=target&&Math.hypot(target.x-p.position.x,target.z-p.position.z);
    const next=beginAction(s,{...target,distance},tool,p.who);if(!next)return false;
    job=next;pending=null;holding=hold;assisted=!hold;serial++;if(tool)heldTool=tool;
    player.act(next.kind,next.duration+.05,target);player.faceTarget?.(target);return true;
  }
  function handle(tool='hand',options={}){
    const phase=options.phase??'tap';
    if(phase==='cancel')return cancel();
    if(phase==='release'){
      holding=false;
      if(pending){pending=null;player.cancelWalk?.();return true;}
      // Let go to finish this use; only continued holding starts another crop.
      if(job){assisted=true;return true;}
      return false;
    }
    if(job){if(phase==='start'){holding=true;assisted=false;}return true;}
    const p=player.state(),target=p.target;
    if(target&&['plot','litter'].includes(target.type))return start(target,tool,phase==='start');
    // Held with nothing in reach on the farm: walk to the nearest plot that needs this tool (or anything, with bare hands).
    if(phase!=='start'||!p.enabled||p.available===false||p.place&&p.place!=='farm'||state().paused||blocked())return false;
    const kinds=tool==='hand'?HOLD_ORDER:[{harvest:'harvest',water:'water',plant:'plant'}[tool]].filter(Boolean),near=selectNearestPlot(state(),p.position,kinds,PLOTS);
    if(!near)return false;holding=true;heldTool=tool;return walkToWork(near,near.kind);
  }
  function tick(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    const s=state(),p=player.state();
    if(!p.enabled||p.available===false||s.paused||blocked()){cancel();return;}
    if(pending){
      if(!holding||!actionAvailable(s,pending.target,pending.kind)){cancel();return;}
      const distance=Math.hypot(p.position.x-pending.target.x,p.position.z-pending.target.z);
      if(distance<=ACTION_REACH-.1){const next=pending;player.cancelWalk?.();start(next.target,next.kind,true);}
      else if(!p.travelling){cancel();}
      return;
    }
    if(!job)return;
    const event=tickAction(s,job,dt);
    if(job.status==='invalid'){cancel();return;}
    if(!event)return;
    job=null;player.cancelAction?.();
    const success=commit(event.kind,event.target);last={...event,success:!!success};
    if(!success){holding=false;return;}
    if(holding&&event.target.type==='plot'){
      // Close by first (a short step along the row), then anywhere on the patch.
      const from=PLOTS[event.target.index],near=selectNextPlot(s,event.target,event.kind,PLOTS,4.5)??(from&&selectNearestPlot(s,{x:from.x,z:from.z,skip:event.target.index},kindsFor(heldTool,event.kind),PLOTS));
      if(near)walkToWork(near,near.kind??event.kind);
    }
  }
  return {handle,cancel,tick,state:snapshot,
    // Deterministic browser QA advances the same job, never the whole economy.
    advance(seconds){for(let t=0;t<Math.min(10,Math.max(0,Number(seconds)||0));t+=.05)tick(.05);return snapshot();},
  };
}
