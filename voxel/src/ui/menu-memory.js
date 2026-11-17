// Keep each catalogue's position and native input focus through live updates.
export function createMenuMemory(body) {
  // A list that scrolls inside the menu (the furniture catalogue's grid) keeps its place by its
  // data-keep-scroll name: through redraws, and when the menu opens again on the same list.
  const positions = new Map(), disclosures = new Map(), lists = new Map();
  const detailKey=(d,i)=>d.id||Object.entries(d.dataset).map(([k,v])=>k+'='+v).join('&')||i+':'+d.querySelector('summary')?.textContent.trim().replace(/\d+/g,'#'); let current = null, rangePointer = null, selectOpen = null;
  const remember = () => { if(current){positions.set(current,body.scrollTop);body.querySelectorAll('[data-keep-scroll]').forEach(el=>lists.set(el.dataset.keepScroll,{top:el.scrollTop,left:el.scrollLeft}));disclosures.set(current,new Map([...body.querySelectorAll('details')].map((d,i)=>[detailKey(d,i),d.open])));} };
  body.addEventListener('pointerdown',e=>{if(e.target.matches('input[type="range"]'))rangePointer=e.pointerId;selectOpen=e.target.matches('select')?e.target:null;},true);
  body.addEventListener('change',e=>{if(e.target===selectOpen)selectOpen=null;},true);
  body.addEventListener('focusout',e=>{if(e.target===selectOpen)selectOpen=null;},true);
  body.addEventListener('keydown',e=>{if(e.target.matches('select')&&['ArrowDown','ArrowUp',' '].includes(e.key))selectOpen=e.target;if(e.key==='Escape')selectOpen=null;},true);
  const release=e=>{if(e.pointerId===rangePointer)rangePointer=null;};
  document.addEventListener('pointerup',release,true);document.addEventListener('pointercancel',release,true);
  window.addEventListener('blur',()=>{rangePointer=null;});
  return {
    get dragging(){return rangePointer!==null||selectOpen!==null;},
    before(){remember();},
    after(section){
      const selection=[...body.querySelectorAll('.segmented button[aria-pressed="true"],.estate-finish-tabs button[aria-pressed="true"],.estate-skin-levels button[aria-pressed="true"]')].map(b=>Object.entries(b.dataset).map(([k,v])=>k+'='+v).join('&')).join('|');
      current=section+'|'+(body.querySelector('[data-menu-view]')?.dataset.menuView??'')+'|'+selection;const saved=disclosures.get(current);if(saved)body.querySelectorAll('details').forEach((d,i)=>{const key=detailKey(d,i);if(saved.has(key))d.open=saved.get(key);});body.scrollTop=positions.get(current)??0;
      body.querySelectorAll('[data-keep-scroll]').forEach(el=>{const point=lists.get(el.dataset.keepScroll);if(point){el.scrollTop=point.top;el.scrollLeft=point.left;}});
    },
    leave(){remember();current=null;rangePointer=null;selectOpen=null;},
    captureFocus(){
      const old=document.activeElement;if(!body.contains(old))return()=>{};
      const id=old.id,tag=old.tagName,data=[...old.attributes].filter(a=>a.name.startsWith('data-')&&!a.name.startsWith('data-pad-')).map(a=>[a.name,a.value]);
      const start=old.selectionStart,end=old.selectionEnd,direction=old.selectionDirection;
      return()=>{
        const next=id?document.getElementById(id):data.length?[...body.querySelectorAll(tag)].find(e=>data.every(([k,v])=>e.getAttribute(k)===v)):null;
        if(!next||!body.contains(next)||next.disabled)return;next.focus({preventScroll:true});
        if(Number.isInteger(start)&&Number.isInteger(end)&&next.setSelectionRange)try{next.setSelectionRange(start,end,direction);}catch{}
      };
    },
  };
}
