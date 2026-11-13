/* APK-only host adapter. Browser HTML, game rules and saved preferences stay unchanged. */
(() => {
  'use strict';
  const win = window, doc = document, bridge = win.PumpkinAndroid;
  const originalPads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads.bind(navigator) : () => [];
  const finite = (n, fallback = 0) => Number.isFinite(Number(n)) ? Number(n) : fallback;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, finite(n)));
  let nativePad = null, gamepadInstalled = false, suspended = false, pausedBefore = null, musicBefore = 1, hasMusicBefore = false;
  let audioUnlocked = false, exportsRequested = 0, lastExport = null, fileSerial = 0;
  const fileRequests = new Map();
  const contexts = new Map(), media = new Set(), watchedMedia = new WeakSet(), resumeAfterForeground = new Set();
  const game = () => win.PumpkinVoxel;

  // Ride, maze and music each own a context. Track the native interfaces before
  // the game loads, so an Android pause silences all of them, not just music.
  const abortAudio = () => {const error=new Error('Audio is paused while the app is in the background.');error.name='AbortError';return error;};
  function trackContext(ctx) {
    if(contexts.has(ctx))return ctx;
    const resume=ctx.resume.bind(ctx),suspend=ctx.suspend.bind(ctx),entry={resume,suspend};contexts.set(ctx,entry);
    ctx.addEventListener?.('statechange',()=>{if(ctx.state==='closed'){contexts.delete(ctx);resumeAfterForeground.delete(ctx);}});
    const safeResume=(...args)=>{
      if(suspended)return Promise.resolve();
      let result;try{result=resume(...args);}catch(error){return Promise.reject(error);}
      return Promise.resolve(result).then(value=>{if(suspended&&ctx.state!=='closed')return Promise.resolve(suspend()).then(()=>value);return value;});
    };
    try{ctx.resume=safeResume;}catch{/* Native pause still tracks contexts whose methods cannot be shadowed. */}
    if(suspended&&ctx.state==='running')Promise.resolve(suspend()).catch(()=>{});
    return ctx;
  }
  function wrapConstructor(name,track) {
    const Original=win[name];if(typeof Original!=='function')return;
    try{win[name]=new Proxy(Original,{construct(target,args,next){return track(Reflect.construct(target,args,next));},apply(target,receiver,args){return track(Reflect.apply(target,receiver,args));}});}catch{/* Standard constructors remain available if a platform marks them read-only. */}
  }
  wrapConstructor('AudioContext',trackContext);wrapConstructor('webkitAudioContext',trackContext);
  const Media=win.HTMLMediaElement,originalPlay=Media?.prototype?.play,originalPause=Media?.prototype?.pause;
  const trackMedia=element=>{
    if(element.paused===false)media.add(element);
    if(!watchedMedia.has(element)){
      watchedMedia.add(element);const forget=()=>media.delete(element);
      for(const name of ['ended','emptied','error','pause'])element.addEventListener?.(name,forget);
      element.addEventListener?.('play',()=>{if(suspended){try{originalPause?.call(element);}catch{}forget();}else media.add(element);});
    }
    if(suspended)try{originalPause?.call(element);}catch{}return element;
  };
  if(originalPlay&&originalPause)try{
    Media.prototype.play=function(...args){
      trackMedia(this);if(suspended){media.delete(this);return Promise.reject(abortAudio());}media.add(this);
      let result;try{result=originalPlay.apply(this,args);}catch(error){media.delete(this);return Promise.reject(error);}
      return Promise.resolve(result).then(value=>{if(suspended){originalPause.call(this);media.delete(this);throw abortAudio();}return value;},error=>{media.delete(this);throw error;});
    };
  }catch{/* All known Audio instances are still paused by the constructor registry. */}
  wrapConstructor('Audio',trackMedia);
  function pauseAudio(){
    for(const[ctx,entry]of contexts)if(ctx.state==='running'){resumeAfterForeground.add(ctx);try{Promise.resolve(entry.suspend()).catch(()=>{});}catch{}}
    for(const element of [...media])try{originalPause?.call(element);}catch{}
  }
  function resumeAudio(){
    const restore=[...resumeAfterForeground];resumeAfterForeground.clear();
    for(const ctx of restore)if(ctx.state!=='closed')try{Promise.resolve(ctx.resume()).catch(()=>{});}catch{}
    // Narration is deliberately stopped on backgrounding. Media never replays
    // automatically; its next explicit Play/Replay action owns that decision.
  }

  function event(name, detail) {
    try { const e = new Event(name); if (detail) Object.defineProperty(e, 'gamepad', {value: detail}); win.dispatchEvent(e); } catch { /* Older WebViews may reject synthetic GamepadEvent constructors. */ }
  }
  function browserPads() { try { return Array.from(originalPads() || []); } catch { return []; } }
  function pads() {
    const existing = browserPads();
    if (!nativePad?.connected) return existing;
    // The native event path is authoritative once used. Original devices remain
    // available after it, rather than an empty WebView list disabling the pad.
    return [nativePad, ...existing.filter(p => p?.connected && p.id !== nativePad.id).slice(0, 3).map((p, i) => ({
      id: p.id, index: i + 1, connected: p.connected, mapping: p.mapping,
      axes: p.axes, buttons: p.buttons, timestamp: p.timestamp,
      vibrationActuator: p.vibrationActuator,
    }))];
  }
  try { Object.defineProperty(navigator, 'getGamepads', {configurable: true, value: pads}); gamepadInstalled = true; } catch { /* The platform's implementation remains usable. */ }

  function release(reason) {
    try { game()?.playControls?.releaseInput?.(reason); } catch { /* A controller may be released during initial loading. */ }
    const previous = nativePad; nativePad = null;
    if (previous) event('gamepaddisconnected', {...previous, connected: false, axes: [0,0,0,0], buttons: previous.buttons.map(() => ({pressed: false, touched: false, value: 0}))});
  }
  function unlockAudio() {
    if(audioUnlocked)return;audioUnlocked=true;
    try {
      win.dispatchEvent(new KeyboardEvent('keydown', {key: 'Unidentified', code: 'Gamepad', bubbles: true}));
      win.dispatchEvent(new KeyboardEvent('keyup', {key: 'Unidentified', code: 'Gamepad', bubbles: true}));
    } catch { /* Touch input still unlocks audio on very old WebViews. */ }
  }
  function receivePad(input) {
    if (!input || input.connected === false) { release('native-disconnect'); return; }
    const id = String(input.id || 'Android controller').slice(0, 180), changed = !nativePad || nativePad.id !== id;
    nativePad = {
      id, index: 0, connected: true, mapping: 'standard',
      axes: Array.from({length: 4}, (_, i) => clamp(input.axes?.[i], -1, 1)),
      buttons: Array.from({length: 18}, (_, i) => {
        const raw = input.buttons?.[i], value = clamp(typeof raw === 'object' ? raw?.value ?? (raw?.pressed ? 1 : 0) : raw, 0, 1);
        return {value, pressed: value > .5, touched: value > 0};
      }),
      timestamp: Math.max(0, finite(input.timestamp, performance.now())),
    };
    if (changed) event('gamepadconnected', nativePad);
    // Java allows the audio context only after this genuine physical pad input.
    // The spare key is not a game action and cannot click a menu a second time.
    if (!audioUnlocked && (nativePad.buttons.some(b => b.pressed) || nativePad.axes.some(a => Math.abs(a) > .2))) {
      unlockAudio();
    }
  }
  function foreground(active) {
    const p = game();
    if (!active) {
      if (!suspended) {
        suspended = true;
        const state = p?.state?.(); pausedBefore = state ? !!state.paused : null;
        try { p?.save?.(); } catch { /* The game reports its own storage errors. */ }
        if (state) state.paused = true;
        const gain = p?.audio?.status?.sceneGain;
        hasMusicBefore = Number.isFinite(gain); musicBefore = hasMusicBefore ? gain : 1;
        p?.audio?.setSceneGain?.(0); p?.narration?.stop?.(); pauseAudio();
      }
      release('native-background'); event('blur');
    } else {
      if (suspended) {
        suspended = false;
        const state = p?.state?.(); if (state && pausedBefore !== null) state.paused = pausedBefore;
        if (hasMusicBefore) p?.audio?.setSceneGain?.(musicBefore);
        pausedBefore = null; hasMusicBefore = false;resumeAudio();
      }
      event('focus'); p?.audio?.sync?.();
    }
  }
  function visible(id) { const el = doc.getElementById(id); return el && !el.hidden && el.getClientRects().length ? el : null; }
  function back() {
    const p = game(); if (!p) return false;
    const cameraMode=!!p.playControls?.cameraMode, radial=!!p.playControls?.radial, hub=!!p.playControls?.hub;
    release('native-back');
    // Dismiss the top reward receipt through the game's own handler before
    // leaving a village/room or letting Android offer to close the app.
    const levelClose=visible('level-celebration')?.querySelector('.level-close');
    if(levelClose&&!levelClose.disabled){levelClose.click();return true;}
    if (p.village?.active) { p.village.back(); return true; }
    if (cameraMode) return true;
    if (p.intro?.active) { p.intro.skip(); return true; }
    if (visible('sheet')) { p.closeSheet?.(); return true; }
    if (radial) return true;
    if (p.fishingUI?.isOpen) { p.fishingUI.close(); return true; }
    if (p.carvingUI?.isOpen) { p.closeCarving?.(); return true; }
    if (p.tools?.selected) { p.tools.act?.('done'); return true; }
    if (p.estateTools?.active) { p.estateTools.cancel(); return true; }
    if (p.foyerTools?.active) { p.foyerTools.cancel(); return true; }
    if (p.scene?.place) { p.leavePlace?.(); return true; }
    if (hub) return true;
    if (p.scene?.player?.state?.().pose) { p.scene.player.stand(); return true; }
    return false;
  }

  function pickSaveFile() {
    if(!bridge?.pickSaveFile)return Promise.reject(new Error('The native file picker is unavailable.'));
    const id='native-file-'+(++fileSerial);
    return new Promise((resolve,reject)=>{fileRequests.set(id,{resolve,reject});try{bridge.pickSaveFile(id);}catch(e){fileRequests.delete(id);reject(e);}});
  }
  function receiveFile(id,name,base64,error) {
    const pending=fileRequests.get(id);if(!pending)return;fileRequests.delete(id);
    if(error||!base64){const e=new Error(error||'No file was chosen.');if(!base64)e.name='AbortError';pending.reject(e);return;}
    try {const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));pending.resolve(new File([bytes],String(name||'pumpkin-patch-save.json'),{type:'application/json'}));}
    catch(e){pending.reject(e);}
  }
  if(bridge?.pickSaveFile&&!win.showOpenFilePicker)win.showOpenFilePicker=async()=>{const file=await pickSaveFile();return[{kind:'file',name:file.name,getFile:async()=>file}];};

  // A native Save document dialog receives the same validated JSON file that
  // the browser download would contain. Import stays on the game's file input
  // and preview/checksum/Undo flow through WebChromeClient's system picker.
  doc.addEventListener('click', async e => {
    const link = e.target?.closest?.('a[download]');
    if (!link || !bridge?.exportBackup || !String(link.href).startsWith('blob:')) return;
    e.preventDefault();
    try {
      const text = await (await fetch(link.href)).text();
      if (text.length > 8000000) throw new Error('Backup is too large');
      const parsed = JSON.parse(text); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid backup');
      const name = /^[a-zA-Z0-9_.-]+\.json$/.test(String(link.download)) ? link.download : 'pumpkin-patch-save.json';
      bridge.exportBackup(text, name); exportsRequested++; lastExport = name;
    } catch { game()?.notice?.('The save file could not be prepared. Try Backup as text.'); }
  }, true);

  // The host is already immersive; the game's existing fullscreen button can
  // ask Android to hide transient system bars without creating a second view.
  if (bridge?.fullscreen) {
    try { doc.documentElement.requestFullscreen = () => { bridge.fullscreen(); return Promise.resolve(); }; } catch { /* The regular browser fullscreen path remains. */ }
  }
  win.PumpkinNative = {
    receivePad, foreground, back, release, unlockAudio, pickSaveFile, receiveFile,
    get status() { return {host: 'android', gamepadInstalled, nativeGamepad: !!nativePad, controller: nativePad?.id || null, suspended, exportsRequested, lastExport,
      audio:{contexts:contexts.size,runningContexts:[...contexts.keys()].filter(c=>c.state==='running').length,media:media.size,playingMedia:[...media].filter(m=>!m.paused).length}}; },
  };
  win.pumpkinNativeForeground = foreground;
})();
