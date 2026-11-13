// Visit-local time avoids an immediate nudge when loading an old village save.
export function createVillageFarmReminder({interval=600,duration=2.6}={}) {
  let elapsed=0,next=interval,until=0,pending=false;
  return {
    reset(){elapsed=0;next=interval;until=0;pending=false;},
    tick(dt,{paused=false,blocked=false}={}) {
      if(!paused&&Number.isFinite(dt)&&dt>0)elapsed+=dt;
      if(elapsed>=next){pending=true;next=(Math.floor(elapsed/interval)+1)*interval;}
      if(pending&&!paused&&!blocked){pending=false;until=elapsed+duration;}
      return !blocked&&!paused&&elapsed<until;
    },
    get state(){return{elapsed,next,pending};}
  };
}
