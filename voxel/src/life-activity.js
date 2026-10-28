// A gesture owns one job. Rules change only on its once-only completion.
import { beginAction, tickAction, cancelAction, actionProgress, selectNextPlot, ACTION_REACH, actionAvailable } from './rules/life-actions.js';
import { PLOTS } from './world.js';

export function createLifeActivity({state,player,commit,blocked,notice}){
  let job=null,pending=null,holding=false,assisted=false,serial=0,last=null;
  const snapshot=()=>({active:!!job||!!pending,progress:actionProgress(job),kind:job?.kind??pending?.kind??null,label:job?.label??(pending?'Walking to the next crop':''),holding,assisted,travelling:!!pending,target:job?.target??pending?.target??null,serial,last});
  function cancel(){const had=!!job||!!pending;cancelAction(job);job=null;pending=null;holding=false;assisted=false;player.cancelWalk?.();player.cancelAction?.();return had;}
  function start(target,tool,hold=false){
    const s=state(),p=player.state();if(!p.enabled||p.available===false||s.paused||blocked())return false;
    const distance=target&&Math.hypot(target.x-p.position.x,target.z-p.position.z);
    const next=beginAction(s,{...target,distance},tool);if(!next)return false;
    job=next;pending=null;holding=hold;assisted=!hold;serial++;
    player.act(next.kind,next.duration+.05,target);player.faceTarget?.(target);return true;
  }
  function handle(tool='hand',options={}){
    const phase=options.phase??'tap';
    if(phase==='cancel')return cancel();
    if(phase==='release'){
      holding=false;
      if(pending){pending=null;player.cancelWalk?.();return true;}
      if(job){if(options.assist){assisted=true;return true;}return cancel();}
      return false;
    }
    if(job){if(phase==='start'){holding=true;assisted=false;}return true;}
    const target=player.state().target;
    return target&&['plot','litter'].includes(target.type)?start(target,tool,phase==='start'):false;
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
      const target=selectNextPlot(s,event.target,event.kind,PLOTS,4.5);
      if(target){
        const distance=Math.hypot(p.position.x-target.x,p.position.z-target.z);
        if(distance<=ACTION_REACH-.1)start(target,event.kind,true);
        else if(player.walkTo?.(target)){pending={kind:event.kind,target};}
      }
    }
  }
  return {handle,cancel,tick,state:snapshot,
    // Deterministic browser QA advances the same job, never the whole economy.
    advance(seconds){for(let t=0;t<Math.min(10,Math.max(0,Number(seconds)||0));t+=.05)tick(.05);return snapshot();},
  };
}
