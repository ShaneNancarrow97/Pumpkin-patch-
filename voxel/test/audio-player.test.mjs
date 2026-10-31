import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";

test("MIDI endings advance shuffle automatically; mute and repeat remain reliable", async () => {
  const bundle = await build({ entryPoints: [new URL("../src/ui/audio.js", import.meta.url).pathname], bundle: true, platform: "node", format: "cjs", loader: { ".mid": "binary" }, write: false });
  let time = 0, scheduled = null;
  const handlers = {}, param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const node = () => ({ connect() { return this; }, disconnect() {}, gain: param(), frequency: param() });
  class AudioContext {
    sampleRate = 16; state = "running"; destination = node();
    get currentTime() { return time; }
    createGain() { return node(); }
    createBiquadFilter() { return node(); }
    createDynamicsCompressor() { return { ...node(), threshold: param(), knee: param(), ratio: param() }; }
    createBuffer() { return { getChannelData: () => new Float32Array(16) }; }
    createOscillator() { const n = { ...node(), start() {}, stop() { this.onended?.(); } }; return n; }
    createBufferSource() { return { ...this.createOscillator(), buffer: null }; }
  }
  const sandbox = { module: { exports: {} }, Buffer, window: { AudioContext }, document: { hidden: false, addEventListener() {} },
    addEventListener: (event, fn) => { handlers[event] = fn; }, setInterval: (fn) => { scheduled = fn; return 1; }, clearInterval: () => { scheduled = null; } };
  vm.runInNewContext(bundle.outputFiles[0].text, sandbox);
  const prefs = { music: true, musicTrack: "parade", musicShuffle: true, musicVolume: .32, sound: false };
  const audio = sandbox.module.exports.createAudio(prefs);
  assert.equal(audio.status.playing, false, "waits for the first gesture");
  handlers.pointerdown(); assert.equal(audio.status.track, "parade"); assert.equal(audio.status.playing, true);
  const played = [];
  for (let i = 0; i < 9; i++) {
    const previous = audio.status.track; time += audio.status.duration + .5; scheduled();
    assert.notEqual(audio.status.track, previous, "the end of a song advances without a button press"); played.push(audio.status.track);
  }
  assert.equal(new Set(played).size, 9, "all songs appear in one shuffle round");
  audio.setShuffle(false); const repeated = audio.status.track;
  time += audio.status.duration + .5; scheduled(); assert.equal(audio.status.track, repeated);
  prefs.music = false; audio.sync(); assert.equal(audio.status.playing, false); assert.equal(scheduled, null);
  audio.nextTrack(); assert.equal(audio.status.playing, false, "Next song cannot turn muted music on");
  prefs.music = true; audio.sync(); assert.equal(audio.status.playing, true); assert.notEqual(audio.status.track, repeated);
});
