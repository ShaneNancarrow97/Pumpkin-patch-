// Keep each catalogue's position and native input focus through live updates.
export function createMenuMemory(body) {
  const positions = new Map(); let current = null, rangePointer = null;
  const remember = () => { if(current)positions.set(current,body.scrollTop); };
  body.addEventListener('pointerdown',e=>{if(e.target.matches('input[type="range"]'))rangePointer=e.pointerId;},true);
  const release=e=>{if(e.pointerId===rangePointer)rangePointer=null;};
  document.addEventListener('pointerup',release,true);document.addEventListener('pointercancel',release,true);
  window.addEventListener('blur',()=>{rangePointer=null;});
  return {
    get dragging(){return rangePointer!==null;},
    before(){remember();},
    after(section){
      const selection=[...body.querySelectorAll('.segmented button[aria-pressed="true"],.estate-finish-tabs button[aria-pressed="true"],.estate-skin-levels button[aria-pressed="true"]')].map(b=>Object.entries(b.dataset).map(([k,v])=>k+'='+v).join('&')).join('|');
      current=section+'|'+selection;body.scrollTop=positions.get(current)??0;
    },
    leave(){remember();current=null;rangePointer=null;},
    captureFocus(){
      const old=document.activeElement;if(!body.contains(old))return()=>{};
      const id=old.id,tag=old.tagName,data=[...old.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]);
      const start=old.selectionStart,end=old.selectionEnd,direction=old.selectionDirection;
      return()=>{
        const next=id?document.getElementById(id):data.length?[...body.querySelectorAll(tag)].find(e=>data.every(([k,v])=>e.getAttribute(k)===v)):null;
        if(!next||!body.contains(next)||next.disabled)return;next.focus({preventScroll:true});
        if(Number.isInteger(start)&&Number.isInteger(end)&&next.setSelectionRange)try{next.setSelectionRange(start,end,direction);}catch{}
      };
    },
  };
}
