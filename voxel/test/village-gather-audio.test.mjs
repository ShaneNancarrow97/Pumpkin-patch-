import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";
import { createVillageGatherAudio, gatherAudioKind, villageGatherScore, GATHER_AUDIO_LIMIT } from "../src/ui/village-gather-audio.js";

// Keep sources alive until their actual stop time, then exercise disconnection.
function webAudioHarness({ q = true } = {}) {
  let time = 0; const contexts = [], sources = [], filters = [], gains = [], compressors = [], buffers = [], handlers = new Map(), intervals = new Map(); let nextTimer = 0;
  const param = () => ({ value: 0, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime(value) { this.value = value; }, exponentialRampToValueAtTime(value) { this.value = value; }, setTargetAtTime(value) { this.value = value; }, cancelScheduledValues() {} });
  const node = () => ({ connections: [], disconnected: false, connect(target) { this.connections.push(target); return target; }, disconnect() { this.disconnected = true; }, gain: param(), frequency: param() });
  const source = () => {
    const value = { ...node(), ended: false, starts: [], stopAt: Infinity, start(at = time) { this.starts.push(at); }, stop(at = time) { this.stopAt = at; if (at <= time) this.finish(); }, finish() { if (!this.ended) { this.ended = true; this.onended?.(); } } };
    sources.push(value); return value;
  };
  class AudioContext {
    sampleRate = 64; state = "running"; destination = node();
    constructor() { contexts.push(this); }
    get currentTime() { return time; }
    createGain() { const value = node(); gains.push(value); return value; }
    createBiquadFilter() { const value = node(); if (q) value.Q = param(); filters.push(value); return value; }
    createDynamicsCompressor() { const value = { ...node(), threshold: param(), knee: param(), ratio: param() }; compressors.push(value); return value; }
    createBuffer(_channels, length) { const value = { getChannelData: () => new Float32Array(length) }; buffers.push(value); return value; }
    createOscillator() { return source(); }
    createBufferSource() { const value = source(); value.buffer = null; return value; }
    resume() { this.state = "running"; return Promise.resolve(); }
  }
  const listen = (type, callback) => { if (!handlers.has(type)) handlers.set(type, new Set()); handlers.get(type).add(callback); };
  const document = { hidden: false, addEventListener: listen };
  return {
    AudioContext, contexts, sources, filters, gains, compressors, buffers, document,
    sandbox: { module: { exports: {} }, Buffer, window: { AudioContext }, document, addEventListener: listen,
      setInterval(fn) { const id = ++nextTimer; intervals.set(id, fn); return id; }, clearInterval(id) { intervals.delete(id); } },
    fire(type) { for (const callback of handlers.get(type) ?? []) callback(); },
    advance(seconds) { time += seconds; for (const value of sources) if (value.stopAt <= time) value.finish(); for (const fn of intervals.values()) fn(); },
  };
}
const event = (phase, options = {}) => ({ id: "logs-01", material: "logs", job: 1, phase, ...options });
function gatherHarness(options) {
  const h = webAudioHarness(options), ctx = new h.AudioContext(), output = ctx.createDynamicsCompressor(), noise = ctx.createBuffer(1, 64, 64);
  h.audio = createVillageGatherAudio({ getAudio: () => ({ ctx, output, noise }) }); return h;
}
let bundle;
async function gameAudioHarness(options) {
  bundle ??= build({ entryPoints: [new URL("../src/ui/audio.js", import.meta.url).pathname], bundle: true, platform: "node", format: "cjs", loader: { ".mid": "binary" }, write: false });
  const h = webAudioHarness(options); vm.runInNewContext((await bundle).outputFiles[0].text, h.sandbox); return h;
}

test("wood, stone, plants and Blackroot have distinct deterministic short material scores", () => {
  const kinds = ["logs", "stone", "herbs", "cursed-spores"].map(gatherAudioKind); assert.deepEqual(kinds, ["wood", "stone", "plant", "blackroot"]);
  assert.equal(gatherAudioKind("hardwood"), "wood"); assert.equal(gatherAudioKind("moonstone"), "stone"); assert.equal(gatherAudioKind("moth-silk"), "plant"); assert.equal(gatherAudioKind("blight:green"), "blackroot");
  assert.equal(gatherAudioKind("constructor"), ""); assert.deepEqual(villageGatherScore("missing", "strike"), []); assert.deepEqual(villageGatherScore("logs", "cancel"), []);
  const scores = ["logs", "stone", "herbs", "cursed-spores"].map(material => villageGatherScore(material, "strike", "test-node"));
  assert.equal(new Set(scores.map(score => JSON.stringify(score))).size, 4);
  for (const material of ["logs", "stone", "herbs", "cursed-spores"]) for (const phase of ["start", "strike", "complete"]) {
    const score = villageGatherScore(material, phase, "test-node"); assert.deepEqual(score, villageGatherScore(material, phase, "test-node"));
    for (const note of score) { assert.ok(note.duration + note.offset < .3); assert.ok(note.amp > 0 && note.amp < .05); }
  }
});

test("gather jobs play accepted contact strikes and completion once, rejecting stale work", () => {
  const h = gatherHarness(), audio = h.audio;
  assert.equal(audio.event(event("strike")), false); assert.equal(h.sources.length, 0, "simulation contacts without accepted work stay silent");
  assert.equal(audio.event(event("start")), true); assert.equal(audio.event(event("start")), false);
  for (let i = 0; i < 3; i++) assert.equal(audio.event(event("strike")), true);
  assert.equal(audio.event(event("strike")), false, "one accepted gather has at most three contacts");
  assert.equal(audio.event(event("complete")), true); const finished = h.sources.length;
  assert.equal(audio.event(event("complete")), false); assert.equal(h.sources.length, finished);
  audio.event(event("start", { job: 2 }));
  audio.event(event("cancel", { job: 1 })); assert.equal(audio.status.job, "logs-01", "late cancellation cannot stop a later job at the same node");
  assert.equal(audio.event(event("strike", { job: 1 })), false); assert.equal(audio.event(event("strike", { job: 2 })), true);
  audio.event(event("cancel", { job: 2 })); assert.equal(audio.status.voices, 0); assert.equal(audio.status.job, null); assert.ok(h.sources.every(source => source.ended && source.disconnected));
});

test("gather voices are bounded to eight and sources, filters and gains disconnect naturally", () => {
  const h = gatherHarness(), audio = h.audio;
  for (let i = 0; i < 40; i++) { audio.event(event("start", { job: i })); for (let j = 0; j < 3; j++) audio.event(event("strike", { job: i })); assert.ok(audio.status.voices <= GATHER_AUDIO_LIMIT); assert.ok(h.sources.filter(source => !source.ended).length <= GATHER_AUDIO_LIMIT); }
  h.advance(1); assert.equal(audio.status.voices, 0); assert.ok(h.sources.every(source => source.ended && source.disconnected)); assert.ok(h.filters.every(filter => filter.disconnected));
  assert.ok(h.gains.every(gain => gain.disconnected)); audio.stop();
});

test("gather supports existing filter doubles without Q and never allocates on disabled or invalid input", () => {
  const h = gatherHarness({ q: false }); assert.equal(h.audio.event(event("start")), true); assert.equal(h.audio.event(event("strike")), true); h.audio.stop();
  let calls = 0; const muted = createVillageGatherAudio({ enabled: () => false, getAudio: () => { calls++; } });
  muted.event(event("start")); muted.event({ phase: "cancel" }); muted.event({ phase: "invalid" }); muted.event(event("start", { material: "missing" })); assert.equal(calls, 0);
});

test("gathering shares one context, limiter and noise after a gesture while music stays off", async () => {
  const h = await gameAudioHarness(), prefs = { sound: true, music: false, musicVolume: .5 }, audio = h.sandbox.module.exports.createAudio(prefs);
  assert.equal(audio.gather(event("start")), false); assert.equal(h.contexts.length, 0);
  h.fire("pointerdown"); assert.equal(h.contexts.length, 0, "an unused gesture with music off creates no context");
  assert.equal(audio.gather(event("start")), true); assert.equal(audio.gather(event("strike")), true);
  assert.equal(h.contexts.length, 1); assert.equal(h.compressors.length, 1); assert.equal(h.buffers.length, 1); assert.equal(audio.status.playing, false);
  assert.ok(h.gains.slice(1).every(gain => gain.connections[0] === h.compressors[0]), "effects use the existing limiter independently of the muted music gain");
  audio.tone(); assert.equal(h.contexts.length, 1); audio.gather(event("cancel")); assert.equal(audio.status.gathering.voices, 0);
});

test("sound mute, hidden page and scene attenuation immediately stop gather effects without replay", async () => {
  const h = await gameAudioHarness(), prefs = { sound: true, music: false }, audio = h.sandbox.module.exports.createAudio(prefs); h.fire("keydown");
  const start = job => { assert.equal(audio.gather(event("start", { job })), true); assert.equal(audio.gather(event("strike", { job })), true); };
  start(1); prefs.sound = false; audio.sync(); assert.equal(audio.status.gathering.voices, 0); assert.ok(h.sources.every(source => source.ended));
  prefs.sound = true; audio.sync(); assert.equal(audio.gather(event("strike")), false, "unmute does not replay interrupted work");
  start(2); h.document.hidden = true; h.fire("visibilitychange"); assert.equal(audio.status.gathering.voices, 0);
  assert.equal(audio.gather(event("start", { job: 3 })), false); h.document.hidden = false; h.fire("visibilitychange"); assert.equal(audio.gather(event("complete", { job: 2 })), false);
  start(4); audio.setSceneGain(.08); assert.equal(audio.status.gathering.voices, 0); assert.equal(audio.gather(event("start", { job: 5 })), false);
  audio.setSceneGain(1); assert.equal(audio.gather(event("strike", { job: 4 })), false); start(6); audio.setVillageActive(false); assert.equal(audio.status.gathering.voices, 0);
});

test("gathering does not change or restart music gains, shuffle, narration or the selected song", async () => {
  const h = await gameAudioHarness(), prefs = { sound: true, music: true, musicTrack: "parade", musicShuffle: false, musicVolume: .5 }, audio = h.sandbox.module.exports.createAudio(prefs);
  h.fire("pointerdown"); audio.setVillageActive(true); audio.setNarrationActive(true);
  const master = h.gains[0], level = master.gain.value, selected = audio.status.track;
  assert.equal(audio.gather(event("start")), true); assert.equal(audio.gather(event("strike")), true);
  assert.equal(master.gain.value, level); assert.equal(audio.status.track, selected); assert.equal(prefs.musicVolume, .5); assert.equal(audio.status.playing, true);
  prefs.music = false; audio.sync(); assert.equal(audio.status.playing, false); assert.ok(audio.status.gathering.voices > 0, "muting only music leaves enabled gathering sounds alive");
  audio.gather(event("cancel")); prefs.sound = false; audio.sync();
});
