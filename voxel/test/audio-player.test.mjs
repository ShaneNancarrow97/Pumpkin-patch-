import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import { build } from "esbuild";

const ADDED_TRACKS = ["dancing-in-the-moonlight", "bitter-sweet-symphony", "duality", "paint-it-black", "fireflies"];

test("MIDI endings advance shuffle automatically; mute and repeat remain reliable", async () => {
  const bundle = await build({ entryPoints: [new URL("../src/ui/audio.js", import.meta.url).pathname], bundle: true, platform: "node", format: "cjs", loader: { ".mid": "binary" }, write: false });
  let time = 0, scheduled = null;
  const gains = [];
  const handlers = {}, param = () => ({ value: 0, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime(v) { this.value = v; }, cancelScheduledValues() {} });
  const node = () => ({ connect() { return this; }, disconnect() {}, gain: param(), frequency: param() });
  class AudioContext {
    sampleRate = 16; state = "running"; destination = node();
    get currentTime() { return time; }
    createGain() { const gain = node(); gains.push(gain); return gain; }
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
  const musicGain = () => gains[0].gain.value;
  audio.setSceneGain(.08); audio.setNarrationActive(true);
  assert.equal(musicGain(), .32 * .22 * .08 * .25, "narration composes with scene attenuation");
  assert.equal(prefs.musicVolume, .32, "ducking never changes the saved music level");
  audio.setVolume(.5); assert.equal(musicGain(), .5 * .22 * .08 * .25);
  audio.setSceneGain(1); assert.equal(musicGain(), .5 * .22 * .25);
  audio.setNarrationActive(false); assert.equal(musicGain(), .5 * .22);
  assert.equal(audio.status.track, "parade", "ducking does not restart or advance music");
  audio.setVillageActive(true); assert.equal(musicGain(), .5 * .22 * .38, "village music is quieter without changing preferences");
  audio.setNarrationActive(true); assert.equal(musicGain(), .5 * .22 * .38 * .25, "speech still ducks the quieter village bed");
  audio.setNarrationActive(false); audio.setVillageActive(false); assert.equal(musicGain(), .5 * .22, "farm restores the previous music level");
  assert.equal(audio.status.track, "parade", "location mix never restarts the song");
  audio.setVolume(.32);
  const played = [];
  for (let i = 0; i < sandbox.module.exports.MUSIC_TRACKS.length; i++) {
    const previous = audio.status.track; time += audio.status.duration + .5; scheduled();
    assert.notEqual(audio.status.track, previous, "the end of a song advances without a button press"); played.push(audio.status.track);
  }
  assert.deepEqual(new Set(played), new Set(sandbox.module.exports.MUSIC_TRACKS.map(t => t.id)), "every catalogued song appears exactly once in a shuffle round");
  for (const id of ADDED_TRACKS) {
    assert.equal(played.filter(track => track === id).length, 1, id + " joins automatic shuffle");
    const entry = sandbox.module.exports.MUSIC_TRACKS.find(t => t.id === id);
    assert.ok(entry, id + " has a catalogue entry");
    assert.deepEqual(Buffer.from(entry.bytes), fs.readFileSync(new URL("../assets/music/" + id + ".mid", import.meta.url)), id + " uses its actual supplied MIDI bytes");
  }
  for (const [id, upper] of [["crossing-field",90],["billie-jean",300],["africa",270],["still-dre",100],["bohemian-rhapsody",360],...ADDED_TRACKS.map(id => [id, 300])]) {
    audio.setTrack(id);
    assert.equal(audio.status.track, id, "each supplied song is selectable");
    assert.equal(audio.status.playing, true, id + " starts the real MIDI scheduling path");
    assert.ok(audio.status.duration > 30 && audio.status.duration < upper, id + " ends at its playable duration");
    assert.equal(prefs.musicVolume, .32, "song selection preserves volume");
  }
  audio.setShuffle(false); const repeated = audio.status.track;
  time += audio.status.duration + .5; scheduled(); assert.equal(audio.status.track, repeated);
  prefs.music = false; audio.sync(); assert.equal(audio.status.playing, false); assert.equal(scheduled, null);
  audio.nextTrack(); assert.equal(audio.status.playing, false, "Next song cannot turn muted music on");
  prefs.music = true; audio.sync(); assert.equal(audio.status.playing, true); assert.notEqual(audio.status.track, repeated);
});
