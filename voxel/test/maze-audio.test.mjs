import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";

// A clocked Web Audio double keeps scheduled voices alive until their stop time.
async function audioHarness(moduleName) {
  const bundle = await build({ entryPoints: [new URL(`../src/ui/${moduleName}.js`, import.meta.url).pathname], bundle: true, platform: "node", format: "cjs", loader: { ".mid": "binary" }, write: false });
  let time = 0, nextTimer = 1;
  const contexts = [], sources = [], gains = [], handlers = new Map(), intervals = new Map(), timeouts = new Map();
  const param = () => ({ value: 0, changes: [], scheduled: [], setValueAtTime(value, at) { this.value = value; this.changes.push({ value, at }); this.scheduled.push({ value, at }); }, linearRampToValueAtTime(value, at) { this.setValueAtTime(value, at); }, exponentialRampToValueAtTime(value, at) { this.setValueAtTime(value, at); }, setTargetAtTime(value, at) { this.setValueAtTime(value, at); }, cancelScheduledValues(at) { this.scheduled = this.scheduled.filter(change => change.at < at); }, cancelAndHoldAtTime(at) { this.cancelScheduledValues(at); } });
  const node = () => ({ connect() { return this; }, disconnect() {}, gain: param(), frequency: param(), detune: param(), Q: param(), pan: param() });
  const listen = (type, fn) => { if (!handlers.has(type)) handlers.set(type, new Set()); handlers.get(type).add(fn); };
  const source = () => {
    const item = { ...node(), started: false, ended: false, stopAt: Infinity, start() { this.started = true; }, stop(at = time) { this.stopAt = at; if (at <= time) this.finish(); }, finish() { if (!this.ended) { this.ended = true; this.onended?.(); } } };
    sources.push(item); return item;
  };
  class AudioContext {
    sampleRate = 64; state = "running"; destination = node();
    constructor() { contexts.push(this); }
    get currentTime() { return time; }
    createGain() { const gain = node(); gains.push(gain); return gain; }
    createBiquadFilter() { return node(); }
    createStereoPanner() { return node(); }
    createDynamicsCompressor() { return { ...node(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }; }
    createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length), duration: length / this.sampleRate }; }
    createOscillator() { return source(); }
    createBufferSource() { const item = source(); item.buffer = null; return item; }
    resume() { this.state = "running"; return Promise.resolve(); }
    suspend() { this.state = "suspended"; return Promise.resolve(); }
    close() { this.state = "closed"; return Promise.resolve(); }
  }
  const document = { hidden: false, addEventListener: listen, removeEventListener(type, fn) { handlers.get(type)?.delete(fn); } };
  const sandbox = { module: { exports: {} }, Buffer, window: { AudioContext }, document, addEventListener: listen, removeEventListener: document.removeEventListener,
    setInterval(fn) { const id = nextTimer++; intervals.set(id, fn); return id; }, clearInterval(id) { intervals.delete(id); },
    setTimeout(fn, delay = 0) { const id = nextTimer++; timeouts.set(id, { fn, at: time + delay / 1000 }); return id; }, clearTimeout(id) { timeouts.delete(id); } };
  vm.runInNewContext(bundle.outputFiles[0].text, sandbox);
  return { exports: sandbox.module.exports, contexts, sources, gains, document,
    fire(type) { for (const fn of handlers.get(type) ?? []) fn(); },
    advance(seconds) { time += seconds; for (const item of sources) if (item.stopAt <= time) item.finish(); for (const [id, timer] of timeouts) if (timer.at <= time) { timeouts.delete(id); timer.fn(); } for (const fn of intervals.values()) fn(); },
  };
}

test("maze audio waits for Start, emits each cue once, and resets only on a new run", async () => {
  const h = await audioHarness("maze-audio"), audio = h.exports.createMazeAudio({});
  audio.cue({ id: "before-start", cue: "knock" }); audio.setVolume(.4);
  assert.equal(h.contexts.length, 0, "briefing and preferences cannot unlock audio");
  audio.start({ sound: true, volume: .4 });
  assert.equal(h.contexts.length, 1); assert.equal(audio.status.active, true);
  const before = h.sources.length;
  audio.cue({ id: "door-reveal", cue: "knock", intensity: .7 });
  assert.ok(h.sources.length > before, "a live encounter creates a sound");
  const played = h.sources.length;
  audio.cue({ id: "door-reveal", cue: "knock", intensity: .7 });
  assert.equal(h.sources.length, played, "the same encounter cannot sound twice");
  audio.pause(true); assert.equal(audio.status.paused, true); assert.equal(audio.status.voices, 0);
  h.advance(.05); assert.ok(h.sources.every(source => source.ended), "pause stops the actual sources after their short fade");
  audio.pause(false);
  const resumed = h.sources.length;
  audio.cue({ id: "door-reveal", cue: "knock" });
  assert.equal(h.sources.length, resumed, "resuming restores ambience without replaying a sting");
  audio.stop(); assert.equal(audio.status.active, false); assert.equal(audio.status.voices, 0);
  audio.start({ sound: true, volume: .4 });
  const replay = h.sources.length; audio.cue({ id: "door-reveal", cue: "knock" });
  assert.ok(h.sources.length > replay, "a new run can play the encounter again");
  audio.stop();
});

test("visibility loss stops maze voices and returning requires explicit Resume", async () => {
  const h = await audioHarness("maze-audio"), audio = h.exports.createMazeAudio({});
  audio.start({ sound: true }); audio.cue({ id: "cellar", cue: "sting" });
  h.document.hidden = true; h.fire("visibilitychange");
  assert.equal(audio.status.paused, true); assert.equal(audio.status.voices, 0);
  h.advance(1); assert.ok(h.sources.every(source => source.ended)); const hidden = h.sources.length;
  h.document.hidden = false; h.fire("visibilitychange"); h.advance(1);
  assert.equal(audio.status.paused, true); assert.equal(h.sources.length, hidden, "visibility alone cannot restart audio");
  audio.pause(false); assert.equal(audio.status.paused, false);
  audio.stop();
});

test("maze mute drops old cues and simultaneous voices stay bounded", async () => {
  const h = await audioHarness("maze-audio"), audio = h.exports.createMazeAudio({});
  audio.start({ sound: true }); audio.setMuted(true);
  assert.equal(audio.status.voices, 0);
  audio.cue({ id: "muted-reveal", cue: "sting" });
  audio.setMuted(false); const unmuted = h.sources.length;
  audio.cue({ id: "muted-reveal", cue: "sting" });
  assert.equal(h.sources.length, unmuted, "unmuting cannot release a missed encounter");
  for (let i = 0; i < 100; i++) audio.cue({ id: `storm-${i}`, cue: "storm", intensity: 1 });
  assert.ok(audio.status.voices > 0 && audio.status.voices <= 14, "overlapping encounters have a fixed voice ceiling");
  audio.setVolume(9); assert.equal(audio.status.volume, 1);
  audio.setVolume(-1); assert.equal(audio.status.volume, 0);
  audio.stop(); assert.equal(audio.status.voices, 0);
  h.advance(.05); assert.ok(h.sources.every(source => source.ended), "Exit stops ambience and delayed encounter sources");
});

test("hayride ambience keeps wheel sounds separate from the maze and stops on pause", async () => {
  const h = await audioHarness("maze-audio"), audio = h.exports.createMazeAudio({});
  audio.start({ sound: true, profile: "hayride" });
  assert.equal(audio.status.profile, "hayride");
  assert.equal(h.sources[0].frequency.value, 39);
  h.advance(1); const rolling = h.sources.length;
  assert.ok(rolling > 2);
  audio.pause(true); h.advance(1);
  assert.equal(h.sources.length, rolling); assert.equal(audio.status.voices, 0);
  audio.pause(false); assert.equal(audio.status.profile, "hayride");
  audio.stop(); h.advance(1); assert.ok(h.sources.every(source => source.ended));
  audio.start({ sound: true }); assert.equal(audio.status.profile, "maze");
  assert.equal(h.sources.at(-2).frequency.value, 48);
  audio.stop();
});

test("farm music keeps the ride mix across volume, sync and level-up ducking", async () => {
  const h = await audioHarness("audio"), prefs = { music: true, musicTrack: "parade", musicShuffle: false, musicVolume: .5, sound: true }, audio = h.exports.createAudio(prefs);
  audio.setSceneGain(.08); assert.equal(h.contexts.length, 0);
  h.fire("pointerdown"); assert.equal(audio.status.playing, true);
  const master = h.gains[0].gain, expected = volume => volume * .22 * .08;
  assert.ok(Math.abs(master.value - expected(.5)) < 1e-10);
  const track = audio.status.track;
  audio.setVolume(.8); assert.ok(Math.abs(master.value - expected(.8)) < 1e-10);
  audio.sync(); assert.ok(Math.abs(master.value - expected(.8)) < 1e-10);
  const suppressed = h.sources.length; audio.tone(); audio.levelUp();
  assert.equal(h.sources.length, suppressed, "farm effects and celebrations stay silent during the ride");
  audio.setSceneGain(1);
  assert.ok(Math.abs(master.value - .8 * .22) < 1e-10);
  const before = master.changes.length, celebrated = h.sources.length; audio.levelUp();
  assert.equal(h.sources.length, celebrated + 6, "the normal farm celebration still plays");
  const duck = master.changes.slice(before), normal = .8 * .22;
  assert.ok(duck.some(change => Math.abs(change.value - normal * .22) < 1e-10), "the celebration ducks the music");
  assert.ok(duck.some(change => Math.abs(change.value - normal) < 1e-10 && change.at > 0), "the celebration schedules the normal music level afterwards");
  audio.setSceneGain(.08);
  assert.ok(master.scheduled.length > 0 && master.scheduled.every(change => change.value <= expected(.8) + 1e-10), "entering during a pending duck replaces its scheduled restoration with the ride mix");
  h.advance(2); audio.sync(); assert.ok(Math.abs(master.value - expected(.8)) < 1e-10);
  audio.setSceneGain(1); assert.ok(Math.abs(master.value - normal) < 1e-10);
  assert.equal(audio.status.track, track, "mix changes do not restart or advance the music queue");
  prefs.music = false; audio.sync();
});
