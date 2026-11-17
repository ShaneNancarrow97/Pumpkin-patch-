import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayControls } from '../src/ui/play-controls.js';

// Exercise the real play/menu/cursor/boundary stack with layout and native
// element activation ports, so filtering a confirm edge cannot hide in a mock.
function harness(t, { playing = false } = {}) {
  const globals = new Map(), events = new Map(); let doc, clock = 1000, pointerTarget;
  const install = (key, value) => { globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value }); };
  const dataKey = name => name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  class Element {
    constructor(tag) {
      this.tagName=tag.toUpperCase();this.children=[];this.parentElement=null;this.dataset={};this.attrs=new Map();this.hidden=false;this.disabled=false;this.rect=[0,0,44,44];this.clicks=0;this.text='';
      this.style={visibility:'visible',overflowY:'visible',overflowX:'visible',position:'static',setProperty(k,v){this[k]=v;}};this.scrollTop=0;this.scrollHeight=this.clientHeight=this.offsetHeight=500;
      const values=new Set();this.classList={contains:v=>values.has(v),add:(...vs)=>vs.forEach(v=>values.add(v)),remove:(...vs)=>vs.forEach(v=>values.delete(v)),toggle:(v,on=!values.has(v))=>{on?values.add(v):values.delete(v);return on;}};
      Object.defineProperty(this,'className',{get:()=>[...values].join(' '),set:value=>{values.clear();String(value).split(/\s+/).filter(Boolean).forEach(v=>values.add(v));}});
    }
    get attributes(){return [...this.attrs].map(([name,value])=>({name,value}));}
    get isConnected(){return doc.body.contains(this);}
    get textContent(){return this.text+this.children.map(c=>c.textContent).join('');}
    set textContent(value){this.text=String(value);this.children=[];}
    setAttribute(k,v){this.attrs.set(k,String(v));if(k==='id')this.id=String(v);if(k==='class')this.className=v;if(k==='hidden')this.hidden=true;if(k==='disabled')this.disabled=true;if(k.startsWith('data-'))this.dataset[dataKey(k)]=String(v);}
    getAttribute(k){return this.attrs.get(k)??null;}
    hasAttribute(k){return this.attrs.has(k);}
    removeAttribute(k){this.attrs.delete(k);if(k==='hidden')this.hidden=false;if(k.startsWith('data-'))delete this.dataset[dataKey(k)];}
    append(...nodes){for(const n of nodes){n.remove();n.parentElement=this;this.children.push(n);}}
    remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);this.parentElement=null;}
    set innerHTML(html){
      this.html=html;this.children=[];this.text='';const stack=[this];
      for(const m of html.matchAll(/<\/?[^>]+>|[^<]+/g)){
        const token=m[0];if(!token.startsWith('<')){stack.at(-1).text+=token;continue;}
        if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}
        const tag=/^<([\w-]+)/.exec(token)?.[1];if(!tag)continue;const e=new Element(tag);
        for(const a of token.slice(tag.length+1,-1).matchAll(/([\w-]+)(?:="([^"]*)"|'([^']*)'|=([^\s>]+))?/g))e.setAttribute(a[1],a[2]??a[3]??a[4]??'');
        stack.at(-1).append(e);if(!['img','input','br','hr','meta','link'].includes(tag)&&!token.endsWith('/>'))stack.push(e);
      }
    }
    get innerHTML(){return this.html??'';}
    matches(selector){
      if(selector.includes(','))return selector.split(',').some(s=>this.matches(s));selector=selector.trim();
      const not=selector.match(/:not\(([^)]*)\)/);if(not)return !this.matches(not[1])&&this.matches(selector.replace(not[0],''));
      const parts=selector.match(/(?:[^\s"\[]|"[^"]*"|\[[^\]]*\])+/g)??[];
      if(parts.length>1){const end=parts.pop();return this.matches(end)&&!!this.parentElement?.closest(parts.join(' '));}
      if(selector===':disabled')return this.disabled;
      const attributes=[...selector.matchAll(/\[([^\]=^]+)(\^?=)?(?:"([^"]*)"|([^\]]*))?\]/g)];
      for(const a of attributes){const value=a[1]==='hidden'?(this.hidden?'':null):this.getAttribute(a[1]);if(value==null||a[2]&&(a[2]==='^='?!value.startsWith(a[3]??a[4]):value!==(a[3]??a[4])))return false;}
      const plain=selector.replace(/\[[^\]]*\]/g,''),id=plain.match(/#([\w-]+)/)?.[1],classes=[...plain.matchAll(/\.([\w-]+)/g)].map(m=>m[1]),tag=plain.match(/^[\w-]+/)?.[0];
      return (!id||this.id===id)&&classes.every(c=>this.classList.contains(c))&&(!tag||this.tagName===tag.toUpperCase());
    }
    closest(s){for(let n=this;n;n=n.parentElement)if(n.matches(s))return n;return null;}
    contains(e){return this===e||this.children.some(c=>c.contains(e));}
    querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
    querySelector(s){return this.querySelectorAll(s)[0]??null;}
    getBoundingClientRect(){const [left,top,width,height]=this.rect;return{left,top,width,height,right:left+width,bottom:top+height};}
    getClientRects(){return this.isConnected&&!this.closest('[hidden]')?[this.getBoundingClientRect()]:[];}
    focus(){if(!this.disabled&&this.getClientRects().length)doc.activeElement=this;}
    blur(){doc.activeElement=doc.body;}
    click(){if(!this.disabled){this.clicks++;this.onclick?.({detail:0,target:this,preventDefault(){},stopPropagation(){}});}}
    dispatchEvent(e){return this['on'+e.type]?.(e)!==false;}
    addEventListener(type,fn){this['on'+type]=fn;}
    setPointerCapture(){}
    scrollBy(arg,y){this.scrollTop+=typeof arg==='object'?arg.top??0:y??0;}
    scrollTo({top}){this.scrollTop=top;}
  }
  doc={createElement:tag=>new Element(tag),querySelector:s=>doc.body.querySelector(s),querySelectorAll:s=>doc.body.querySelectorAll(s),getElementById:id=>doc.body.querySelector('#'+id),elementFromPoint:()=>pointerTarget};
  doc.body=new Element('body');doc.activeElement=doc.body;doc.documentElement=doc.body;
  const raw={id:'DualSense Wireless Controller',index:0,connected:true,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
  for(const [key,value] of Object.entries({document:doc,navigator:{getGamepads:()=>[raw]},performance:{now:()=>clock},innerWidth:864,innerHeight:756,matchMedia:()=>({matches:false}),getComputedStyle:e=>e.style,addEventListener(type,fn){if(!events.has(type))events.set(type,[]);events.get(type).push(fn);},setTimeout:()=>0,clearTimeout:()=>{},CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}}}))install(key,value);
  const make=(tag,id,parent=doc.body,rect)=>{const e=new Element(tag);e.id=id;if(rect)e.rect=rect;parent.append(e);return e;};
  const world=make('canvas','world');pointerTarget=world;
  const hud=make('div','hud'),level=make('button','open-levels',hud,[220,20,64,44]);
  const actions=make('div','actions');make('button','plant-all',actions,[160,620,80,44]);
  const dock=make('nav','dock'),patch=make('button','patch',dock,[100,700,70,50]),wardrobe=make('button','wardrobe',dock,[185,700,70,50]);patch.className='tab active';wardrobe.className='tab';wardrobe.dataset.tab='wardrobe';
  const sheet=make('section','sheet');sheet.hidden=true;const body=make('div','sheet-body',sheet);body.style.overflowY='auto';body.scrollHeight=1200;const close=make('button','sheet-close',sheet);close.className='close';const buy=make('button','buy',body,[300,300,100,44]);buy.textContent='Buy costume';
  const upgrade=make('section','upgrade-menu');upgrade.hidden=true;const upgradeBuy=make('button','upgrade-buy',upgrade,[300,300,100,44]);
  const celebration=make('section','level-celebration');celebration.hidden=true;const levelClaim=make('button','level-claim',celebration,[300,300,100,44]);
  const s={house:{placed:[]}},owner={enabled:playing,place:'farm',available:true,who:'natalie',gait:'walk',target:null},worldRequests=[];let worldTaps=0,worldActions=0,backs=0;
  const scene={place:null,player:{state:()=>({...owner}),input(x,y){this.move=[x,y];},cameraInput(x,y){this.look=[x,y];},setBlocked(on){this.blocked=on;}},tapAt(){worldTaps++;},setFarmCameraMode:on=>on};
  const controls=createPlayControls({scene,state:()=>s,tools:{selected:null},action(tool,request){worldActions++;worldRequests.push(request);},portrait:()=>null,notice(){},back(){backs++;if(!celebration.hidden)celebration.hidden=true;else if(!upgrade.hidden)upgrade.hidden=true;else sheet.hidden=true;},farmAction(){worldActions++;return true;}});
  const openSheet=section=>{sheet.dataset.section=section;sheet.hidden=false;close.focus();};wardrobe.onclick=()=>openSheet('wardrobe');level.onclick=()=>{celebration.hidden=false;};
  const frame=()=>{clock+=16;controls.tick(!sheet.hidden||!upgrade.hidden||!celebration.hidden);};
  const set=(keys=[])=>{raw.buttons=raw.buttons.map((_,i)=>({pressed:keys.includes(i),value:keys.includes(i)?1:0}));};
  const press=(...keys)=>{set(keys);frame();set();frame();};frame();
  t.after(()=>{controls.releaseInput();for(const [key,desc]of globals)desc?Object.defineProperty(globalThis,key,desc):delete globalThis[key];});
  return {controls,scene,raw,doc,patch,wardrobe,level,sheet,buy,upgrade,upgradeBuy,celebration,levelClaim,openSheet,frame,set,press,worldRequests,get worldTaps(){return worldTaps;},get worldActions(){return worldActions;},get backs(){return backs;},advance(ms){clock+=ms;},pointAt(el){pointerTarget=el;},touch(){for(const fn of events.get('pointerdown')??[])fn({isTrusted:true,pointerType:'touch'});}};
}

test('Options takes ownership from an active world cursor and Cross opens and uses the selected menu',t=>{
  const h=harness(t);h.press(10);assert.equal(h.controls.cursor.on,true);
  h.press(9);assert.equal(h.controls.hub,true);h.press(15);assert.equal(h.doc.activeElement,h.wardrobe);
  h.press(0);assert.equal(h.sheet.hidden,false);assert.equal(h.sheet.dataset.section,'wardrobe');h.press(0);assert.equal(h.buy.clicks,1);
  assert.equal(h.controls.cursor.on,false);assert.equal(h.worldTaps,0);assert.equal(h.worldActions,0);h.press(1);assert.equal(h.sheet.hidden,true);assert.equal(h.backs,1);
});

test('L2 replaces a world cursor, then Cross selects the level card and its reward',t=>{
  const h=harness(t);h.press(10);h.press(6);assert.equal(h.controls.menus.farmBars,true);assert.equal(h.doc.activeElement,h.level);h.press(0);assert.equal(h.celebration.hidden,false);h.advance(500);h.press(0);assert.equal(h.levelClaim.clicks,1);assert.equal(h.worldTaps,0);assert.equal(h.worldActions,0);
});

test('an open home, wardrobe or upgrade panel owns Cross even when the cursor was active',t=>{
  const h=harness(t);
  for(const section of ['home','wardrobe','levels']){
    h.press(10);assert.equal(h.controls.cursor.on,true);h.openSheet(section);h.press(0);assert.equal(h.buy.clicks,['home','wardrobe','levels'].indexOf(section)+1,section);h.press(1);
  }
  h.press(10);h.upgrade.hidden=false;h.press(0);assert.equal(h.upgradeBuy.clicks,1);assert.equal(h.controls.cursor.on,false);assert.equal(h.worldTaps,0);assert.equal(h.worldActions,0);
});

test('menu entry and exit consume held controls until neutral without losing a later fresh confirm',t=>{
  const h=harness(t,{playing:true});h.raw.axes=[.8,0,.7,0];h.set([6,0]);h.frame();assert.equal(h.controls.menus.farmBars,true);assert.equal(h.worldActions,0);
  h.frame();assert.equal(h.level.clicks,0,'held Cross on entry is not a selection');h.set();h.raw.axes.fill(0);h.frame();h.press(0);assert.equal(h.celebration.hidden,false);h.advance(500);
  h.set([1,0]);h.raw.axes=[.8,0,.7,0];h.frame();assert.equal(h.celebration.hidden,true);h.frame();assert.equal(h.worldActions,0);assert.deepEqual(h.scene.player.move,[0,0]);
  h.set();h.raw.axes.fill(0);h.frame();h.press(1);h.press(0);assert.deepEqual(h.worldRequests.map(r=>r.phase),['start','release'],'one fresh gesture returns after backing out and releasing controls');
});

test('a cursor click opening a panel cannot also activate the first purchase in that panel',t=>{
  const h=harness(t);h.pointAt(h.wardrobe);h.press(10);h.press(0);assert.equal(h.sheet.hidden,false);assert.equal(h.buy.clicks,0);assert.equal(h.controls.cursor.on,false);
  h.press(0);assert.equal(h.buy.clicks,1);assert.equal(h.worldTaps,0);assert.equal(h.worldActions,0);
});

test('Options reaches usable dock buttons in play mode and skips a disabled active tab',t=>{
  const h=harness(t,{playing:true});h.patch.disabled=true;h.press(9);assert.equal(h.controls.hub,true);assert.equal(h.doc.activeElement,h.wardrobe);
  h.press(0);assert.equal(h.sheet.hidden,false);h.press(0);assert.equal(h.buy.clicks,1);assert.equal(h.worldActions,0);
});

test('the idle R3 camera legend stays hidden while R3 inspection and its Done controls still work',t=>{
  const h=harness(t),card=h.doc.getElementById('farm-camera-mode');assert.equal(card.hidden,true);h.press(11);assert.equal(h.controls.cameraMode,true);assert.equal(card.hidden,false);
  h.press(1);assert.equal(h.controls.cameraMode,false);assert.equal(card.hidden,true);assert.equal(h.worldActions,0);
});

test('a fresh Cross after touch selects once, and thumbstick clicks cannot steal an open menu',t=>{
  const h=harness(t);h.touch();h.openSheet('home');h.press(0);assert.equal(h.buy.clicks,1);h.press(10);h.press(11);assert.equal(h.controls.cursor.on,false);h.press(0);assert.equal(h.buy.clicks,2);assert.equal(h.worldTaps,0);
});

test('closing a menu suppresses sticks held inside it until each stick returns to neutral',t=>{
  const h=harness(t,{playing:true});h.openSheet('home');h.frame();h.raw.axes=[.8,0,.7,0];h.frame();h.press(1);assert.equal(h.sheet.hidden,true);assert.deepEqual(h.scene.player.move,[0,0]);assert.deepEqual(h.scene.player.look,[0,0]);
  h.raw.axes.fill(0);h.frame();h.raw.axes=[.8,0,.7,0];h.frame();assert.ok(h.scene.player.move[0]>.7);assert.ok(h.scene.player.look[0]>.6);
});

test('the Play mode chip draws the actual PS5 Create silhouette without text and keeps its accessible assignment',t=>{
  const h=harness(t),chip=h.doc.getElementById('play-toggle'),hint=chip.querySelector('.play-chip-glyph');
  assert.equal(chip.getAttribute('aria-label'),'Play mode · choose Shane or Natalie · Create · small button left of the touchpad');assert.equal(chip.querySelector('span').textContent,'Play mode');assert.match(hint.innerHTML,/data-ps5-icon="create"/);assert.equal(hint.querySelectorAll('text').length,0);assert.equal(hint.querySelectorAll('path').length,3);assert.equal(hint.querySelectorAll('rect').length,1);assert.equal(hint.querySelector('rect').getAttribute('stroke'),'none');assert.match(hint.querySelector('rect').getAttribute('transform'),/rotate/);
  h.raw.id='Xbox Wireless Controller';h.frame();assert.match(hint.innerHTML,/VIEW/);assert.match(chip.getAttribute('aria-label'),/View button/);h.raw.connected=false;h.frame();assert.equal(hint.innerHTML,'');assert.equal(chip.getAttribute('aria-label'),'Play mode · choose Shane or Natalie');
});
