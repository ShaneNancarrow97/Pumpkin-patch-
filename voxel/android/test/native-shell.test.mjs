import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../assets/android-shell.js',import.meta.url),'utf8');

function harness({existing=[],constructors={}}={}){
  const events=[],handlers=new Map(),elements=new Map(),exports=[],pickers=[],calls=[];
  const state={paused:false},audio={status:{sceneGain:.38},setSceneGain(v){this.status.sceneGain=v;calls.push(['gain',v]);},sync(){calls.push(['sync']);}};
  const controls={cameraMode:false,radial:false,hub:false,releaseInput(reason){calls.push(['release',reason]);this.cameraMode=this.radial=this.hub=false;},close(){calls.push(['closeWheel']);},menus:{leaveHub(){calls.push(['leaveHub']);}}};
  const game={state:()=>state,audio,save(){calls.push(['save']);},playControls:controls,notice(v){calls.push(['notice',v]);},narration:{stop(){calls.push(['stopVoice']);}},village:{active:false,back(){calls.push(['villageBack']);}},closeSheet(){calls.push(['closeSheet']);},scene:{place:null,player:{state:()=>({pose:null})}},leavePlace(){calls.push(['leavePlace']);}};
  const doc={documentElement:{},addEventListener(name,fn){handlers.set(name,fn);},getElementById:id=>elements.get(id)||null};
  const bridge={exportBackup:(...args)=>exports.push(args),pickSaveFile:id=>pickers.push(id),fullscreen(){calls.push(['fullscreen']);}};
  class SimpleEvent{constructor(type,init={}){this.type=type;Object.assign(this,init);}}
  const context={document:doc,navigator:{getGamepads:()=>existing},PumpkinAndroid:bridge,PumpkinVoxel:game,
    performance:{now:()=>123},Event:SimpleEvent,KeyboardEvent:SimpleEvent,Uint8Array,File,Promise,Map,JSON,
    atob:value=>Buffer.from(value,'base64').toString('binary'),fetch:async url=>({text:async()=>context.downloadText}),
    dispatchEvent(e){events.push(e);},downloadText:'{"format":"pumpkin-patch-save"}',...constructors};
  context.window=context;vm.runInNewContext(source,context);return{context,native:context.PumpkinNative,game,state,controls,audio,calls,events,handlers,elements,exports,pickers,bridge};
}

test('native pad is standard and bounded, retains browser devices and fully releases on disconnect',()=>{
  const browser={id:'Browser pad',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:[]};
  const h=harness({existing:[browser]});assert.equal(h.context.navigator.getGamepads()[0],browser);
  h.native.receivePad({id:'DualSense native',axes:[Infinity,2,-2,.4],buttons:[1,.2,{pressed:true,value:1}],timestamp:50});
  const pads=h.context.navigator.getGamepads();assert.equal(pads.length,2);assert.equal(pads[0].mapping,'standard');assert.equal(pads[0].index,0);
  assert.deepEqual(Array.from(pads[0].axes),[0,1,-1,.4]);assert.equal(pads[0].buttons.length,18);assert.equal(pads[0].buttons[0].pressed,true);assert.equal(pads[0].buttons[1].pressed,false);
  assert.equal(pads[1].id,'Browser pad');assert.equal(pads[1].index,1);
  assert.equal(h.events.filter(e=>e.type==='gamepadconnected').length,1);assert.equal(h.events.filter(e=>e.type==='keydown').length,1);
  h.native.receivePad({id:'DualSense native',axes:[0,0,0,0],buttons:[]});assert.equal(h.events.filter(e=>e.type==='keydown').length,1,'audio unlock does not spam key events');
  h.native.receivePad({connected:false});assert.equal(h.native.status.nativeGamepad,false);assert.equal(h.context.navigator.getGamepads()[0],browser);
  assert.equal(h.events.filter(e=>e.type==='gamepaddisconnected').length,1);assert.ok(h.calls.some(c=>c[0]==='release'));
});

test('background saves once, silences music, releases input and restores the previous pause state',()=>{
  const h=harness();h.native.receivePad({id:'Native',buttons:[1]});h.native.foreground(false);h.native.foreground(false);
  assert.equal(h.calls.filter(c=>c[0]==='save').length,1);assert.equal(h.state.paused,true);assert.equal(h.audio.status.sceneGain,0);assert.equal(h.native.status.nativeGamepad,false);
  h.native.foreground(true);assert.equal(h.state.paused,false);assert.equal(h.audio.status.sceneGain,.38);assert.equal(h.native.status.suspended,false);
  h.state.paused=true;h.native.foreground(false);h.native.foreground(true);assert.equal(h.state.paused,true,'a manually paused farm stays paused');
  assert.ok(h.events.some(e=>e.type==='blur'));assert.ok(h.events.some(e=>e.type==='focus'));
});

test('native back closes the current voxel surface without leaking a second action',()=>{
  const h=harness();h.controls.cameraMode=true;assert.equal(h.native.back(),true);assert.equal(h.controls.cameraMode,false);
  h.game.village.active=true;assert.equal(h.native.back(),true);assert.ok(h.calls.some(c=>c[0]==='villageBack'));h.game.village.active=false;
  h.elements.set('sheet',{hidden:false,getClientRects:()=>[{}]});assert.equal(h.native.back(),true);assert.ok(h.calls.some(c=>c[0]==='closeSheet'));h.elements.clear();
  h.game.scene.place={kind:'room'};assert.equal(h.native.back(),true);assert.ok(h.calls.some(c=>c[0]==='leavePlace'));h.game.scene.place=null;
  assert.equal(h.native.back(),false,'the host may offer its close confirmation only from the base farm');
});

test('native Back dismisses visible level rewards before leaving the current place or quitting',()=>{
  const h=harness();let closed=0;
  const level={hidden:false,getClientRects:()=>[{}],querySelector:selector=>selector==='.level-close'?{click(){closed++;level.hidden=true;}}:null};
  h.elements.set('level-celebration',level);h.game.village.active=true;
  assert.equal(h.native.back(),true);assert.equal(closed,1);assert.equal(h.calls.some(c=>c[0]==='villageBack'),false,'reward receipt keeps priority over the village');
  h.game.village.active=false;h.game.scene.place={kind:'room'};level.hidden=false;
  assert.equal(h.native.back(),true);assert.equal(closed,2);assert.equal(h.calls.some(c=>c[0]==='leavePlace'),false,'dismissing rewards keeps the player in their room');
  h.game.scene.place=null;
  assert.equal(h.native.back(),false);assert.equal(closed,2,'a hidden old receipt cannot consume Back on the farm');
  level.hidden=false;level.getClientRects=()=>[];
  assert.equal(h.native.back(),false);assert.equal(closed,2,'an unpainted receipt is not treated as an open overlay');
});

test('blob downloads export exact JSON and reject unsafe or invalid payloads',async()=>{
  const h=harness(),link={href:'blob:test',download:'farm-save.json'};let stopped=0;
  await h.handlers.get('click')({target:{closest:()=>link},preventDefault(){stopped++;}});
  assert.equal(stopped,1);assert.equal(h.exports.length,1);assert.equal(h.exports[0][0],h.context.downloadText);assert.equal(h.exports[0][1],'farm-save.json');
  link.download='../bad/file.json';await h.handlers.get('click')({target:{closest:()=>link},preventDefault(){}});assert.equal(h.exports[1][1],'pumpkin-patch-save.json');
  h.context.downloadText='not json';await h.handlers.get('click')({target:{closest:()=>link},preventDefault(){}});assert.equal(h.exports.length,2);assert.ok(h.calls.some(c=>c[0]==='notice'));
  link.href='https://example.invalid/save.json';await h.handlers.get('click')({target:{closest:()=>link},preventDefault(){throw new Error('ordinary link should not be intercepted');}});
});

test('optional native picker produces a real File and honours cancellation without bypassing validation',async()=>{
  const h=harness(),promise=h.context.showOpenFilePicker(),id=h.pickers[0];
  h.native.receiveFile(id,'farm.json',Buffer.from('{"ok":true}').toString('base64'),null);
  const [handle]=await promise;assert.equal(handle.name,'farm.json');assert.equal(await (await handle.getFile()).text(),'{"ok":true}');
  const second=h.native.pickSaveFile(),next=h.pickers[1];h.native.receiveFile(next,null,null,null);await assert.rejects(second,{name:'AbortError'});
  assert.equal(h.context.navigator.userActivation,undefined,'the native shell never fakes browser activation');
});

test('fullscreen remains an Android request and never rewrites game preferences',async()=>{
  const h=harness();await h.context.document.documentElement.requestFullscreen();assert.ok(h.calls.some(c=>c[0]==='fullscreen'));
  assert.equal(Object.hasOwn(h.context,'localStorage'),false);assert.equal(h.native.status.host,'android');
});

test('all music and ride contexts suspend together and only previously running contexts resume',async()=>{
  class Context{
    state='running';suspends=0;resumes=0;listeners=new Map();
    addEventListener(n,fn){this.listeners.set(n,fn);}
    suspend(){this.state='suspended';this.suspends++;return Promise.resolve();}
    resume(){this.state='running';this.resumes++;return Promise.resolve();}
    close(){this.state='closed';this.listeners.get('statechange')?.();}
  }
  const h=harness({constructors:{AudioContext:Context,webkitAudioContext:Context}}),music=new h.context.AudioContext(),ride=new h.context.webkitAudioContext(),stopped=new h.context.AudioContext();
  assert.ok(music instanceof Context);assert.ok(music instanceof h.context.AudioContext);
  await stopped.suspend();h.native.foreground(false);assert.equal(music.state,'suspended');assert.equal(ride.state,'suspended');
  assert.equal(h.native.status.audio.runningContexts,0);await stopped.resume();assert.equal(stopped.state,'suspended','a background resume request cannot start sound');
  h.native.foreground(true);await Promise.resolve();assert.equal(music.state,'running');assert.equal(ride.state,'running');assert.equal(stopped.state,'suspended');
  assert.equal(music.resumes,1);assert.equal(ride.resumes,1);assert.equal(stopped.resumes,0);ride.close();assert.equal(h.native.status.audio.contexts,2,'closed contexts leave the registry');
});

test('narration and delayed media play never leak into the background or replay automatically',async()=>{
  let finishPlay;
  class Media{
    paused=true;listeners=new Map();
    addEventListener(n,fn){this.listeners.set(n,fn);}
    play(){return new Promise(resolve=>{finishPlay=()=>{this.paused=false;resolve();};});}
    pause(){this.paused=true;this.listeners.get('pause')?.();}
  }
  class Audio extends Media{}
  const h=harness({constructors:{HTMLMediaElement:Media,Audio}}),voice=new h.context.Audio();
  const pending=voice.play();h.native.foreground(false);finishPlay();await assert.rejects(pending,{name:'AbortError'});assert.equal(voice.paused,true,'a late play Promise is silenced');
  await assert.rejects(voice.play(),{name:'AbortError'});h.native.foreground(true);assert.equal(voice.paused,true,'old narration is not replayed on return');
  const next=voice.play();finishPlay();await next;assert.equal(voice.paused,false);h.native.foreground(false);assert.equal(voice.paused,true);h.native.foreground(true);assert.equal(voice.paused,true);
  voice.listeners.get('emptied')?.();assert.equal(h.native.status.audio.media,0,'released media does not retain decoded speech');
});

test('repeated dialogue playback does not retain stopped, ended, errored or rejected media',async()=>{
  class Media{
    paused=true;listeners=new Map();
    addEventListener(n,fn){this.listeners.set(n,fn);}
    play(){this.paused=false;return this.fail?Promise.reject(new Error('Decode failed')):Promise.resolve();}
    pause(){this.paused=true;this.listeners.get('pause')?.();}
  }
  class Audio extends Media{}
  const h=harness({constructors:{HTMLMediaElement:Media,Audio}});
  for(let i=0;i<40;i++){
    const voice=new h.context.Audio();assert.equal(h.native.status.audio.media,0,'constructing silent media adds no strong registry entry');
    await voice.play();assert.equal(h.native.status.audio.media,1);
    if(i%3===0)voice.pause();else voice.listeners.get(i%3===1?'ended':'error')?.();
    assert.equal(h.native.status.audio.media,0);
  }
  const broken=new h.context.Audio();broken.fail=true;await assert.rejects(broken.play(),/Decode failed/);assert.equal(h.native.status.audio.media,0);
});

test('late context resumes and contexts constructed in the background stay silent',async()=>{
  let finishResume;
  class Context{
    state='suspended';
    suspend(){this.state='suspended';return Promise.resolve();}
    resume(){return new Promise(resolve=>{finishResume=()=>{this.state='running';resolve();};});}
  }
  const h=harness({constructors:{AudioContext:Context}}),ctx=new h.context.AudioContext(),pending=ctx.resume();
  h.native.foreground(false);finishResume();await pending;assert.equal(ctx.state,'suspended');
  const background=new h.context.AudioContext();await background.resume();assert.equal(background.state,'suspended');
  h.native.foreground(true);assert.equal(ctx.state,'suspended','an initially suspended context is not automatically resumed');assert.equal(background.state,'suspended');
});
