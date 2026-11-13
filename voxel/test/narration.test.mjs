import test from "node:test";
import assert from "node:assert/strict";
import { createNarration } from "../src/ui/narration.js";
import { voiceKey } from "../src/ui/voice-key.js";

const first = { speaker: "natalie", text: "Welcome to the patch." };
const second = { speaker: "shane", text: "Look at our pumpkins!" };

// Deferred media promises reproduce browsers that settle play() after a line
// has already been replaced, muted or dismissed.
function fixture(prefs = {}, extraClips = {}, timers = globalThis) {
  const made = [], ducks = [], page = new EventTarget(); page.hidden = false;
  const clips = Object.fromEntries([first, second].map((line, i) => [voiceKey(line.speaker, line.text), { ...line, url: `voice-${i}.mp3` }]));
  const narration = createNarration({ prefs, clips: { ...clips, ...extraClips }, document: page, timers, duck: (on) => ducks.push(on), audioFactory(url) {
    const media = { src: url, paused: true, stops: 0, volume: 1, load() {}, removeAttribute() { this.src = ""; },
      play() { this.paused = false; return new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; }); },
      pause() { this.paused = true; this.stops++; this.onpause?.(); },
    };
    made.push(media); return media;
  } });
  const play = (line = first) => narration.play(line.speaker, line.text);
  const start = async (line = first) => { const result = play(line); made.at(-1).resolve(); assert.equal(await result, true); return made.at(-1); };
  return { narration, prefs, made, ducks, page, play, start };
}

test("older preferences get independent voice defaults and normalized clip lookup", async () => {
  const f = fixture({ music: false, musicVolume: .2, sound: false });
  assert.equal(f.narration.enabled, true); assert.equal(f.prefs.voiceVolume, .85);
  const playing = f.narration.play(first.speaker, "  Welcome  to the patch.\n"); f.made[0].resolve();
  assert.equal(await playing, true); assert.equal(f.made[0].volume, .85);
  assert.equal(f.prefs.music, false); assert.equal(f.prefs.sound, false); assert.equal(f.prefs.musicVolume, .2);
  f.narration.dispose();
});

test("rapid Next retires stale playback without stopping or unducking the new voice", async () => {
  const f = fixture(), old = f.play(), a = f.made[0], oldEnded = a.onended;
  const current = await f.start(second), currentKey = f.narration.current.key;
  assert.equal(a.paused, true); assert.equal(a.src, ""); assert.equal(current.paused, false);
  a.resolve(); assert.equal(await old, false); oldEnded();
  assert.equal(f.narration.current.key, currentKey); assert.equal(f.narration.playing, true);
  assert.deepEqual(f.ducks, [true]);
  current.onended(); assert.equal(f.narration.playing, false); assert.equal(f.narration.current.status, "ended");
  assert.deepEqual(f.ducks, [true, false]); f.narration.dispose();
});

test("mute stops immediately, including an unresolved play, and enabling waits for replay", async () => {
  const f = fixture(), result = f.play(), media = f.made[0];
  media.onplaying(); assert.equal(f.narration.playing, true);
  f.narration.setEnabled(false); assert.equal(media.paused, true); assert.equal(f.narration.playing, false);
  media.resolve(); assert.equal(await result, false); assert.deepEqual(f.ducks, [true, false]);
  f.narration.setEnabled(true); assert.equal(f.made.length, 1);
  const replay = f.narration.replay(); f.made[1].resolve(); assert.equal(await replay, true);
  f.narration.setVolume(.4); assert.equal(f.made[1].volume, .4);
  f.narration.setVolume(0); assert.equal(f.made[1].paused, true); assert.equal(f.narration.playing, false);
  assert.equal(f.narration.enabled, true); f.narration.dispose();
});

test("hidden pages stop and never resume a line automatically", async () => {
  const f = fixture(), media = await f.start();
  f.page.hidden = true; f.page.dispatchEvent(new Event("visibilitychange"));
  assert.equal(media.paused, true); assert.deepEqual(f.ducks, [true, false]);
  assert.equal(await f.play(second), false); assert.equal(f.made.length, 1);
  f.page.hidden = false; f.page.dispatchEvent(new Event("visibilitychange"));
  assert.equal(f.made.length, 1); assert.equal(f.narration.playing, false);
  f.narration.dispose();
});

test("autoplay denial stays quiet and a deliberate replay can succeed", async () => {
  const f = fixture(), result = f.play();
  f.made[0].reject(Object.assign(new Error("A gesture is needed"), { name: "NotAllowedError" }));
  assert.equal(await result, false); assert.equal(f.narration.current.status, "blocked");
  assert.equal(f.narration.current.text, first.text); assert.equal(f.narration.current.available, true);
  assert.deepEqual(f.ducks, []);
  const replay = f.narration.replay(); f.made[1].resolve(); assert.equal(await replay, true);
  f.made[1].onerror(); assert.equal(f.narration.current.status, "error"); assert.deepEqual(f.ducks, [true, false]);
  f.narration.dispose();
});

test("missing or remote clips keep text usable without creating media or leaving a duck", async () => {
  const f = fixture({}, { [voiceKey("mora", "Remote")]: { url: "https://example.test/voice.mp3" } });
  await f.start();
  assert.equal(await f.narration.play("mora", "Unrecorded dialogue"), false);
  assert.equal(f.narration.current.text, "Unrecorded dialogue"); assert.equal(f.narration.current.available, false);
  assert.deepEqual(f.ducks, [true, false]); assert.equal(f.made.length, 1);
  assert.equal(await f.narration.play("mora", "Remote"), false); assert.equal(f.made.length, 1);
  f.narration.dispose();
});

test("failed construction settles safely and preferences clamp without touching music", async () => {
  const prefs = { voiceEnabled: "bad", voiceVolume: "bad", musicVolume: .32 };
  const narration = createNarration({ prefs, clips: { [voiceKey(first.speaker, first.text)]: { url: "data:audio/mpeg;base64,AAAA" } }, audioFactory() { throw new Error("Audio unavailable"); } });
  assert.equal(narration.enabled, true); assert.equal(narration.volume, .85);
  assert.equal(await narration.play(first.speaker, first.text), false); assert.equal(narration.current.status, "error");
  narration.setVolume(2); assert.equal(narration.volume, 1); narration.setVolume(-1); assert.equal(narration.volume, 0);
  assert.equal(prefs.musicVolume, .32); narration.dispose();
});

test("a stuck decoder times out both startup and playback and releases a waiting tour", async () => {
  const pending = new Map(); let id = 0;
  const timers = { setTimeout(fn, ms) { pending.set(++id, { fn, ms }); return id; }, clearTimeout(key) { pending.delete(key); } };
  const f = fixture({}, {}, timers), result = f.play();
  assert.equal([...pending.values()][0].ms, 12000);
  [...pending.values()][0].fn();
  assert.equal(await result, false); assert.equal(f.narration.current.status, "error"); assert.equal(f.made[0].paused, true);
  await f.start(second); assert.equal(f.narration.playing, true);
  [...pending.values()][0].fn();
  assert.equal(f.narration.playing, false); assert.equal(f.narration.current.status, "error");
  assert.deepEqual(f.ducks, [true, false]); assert.equal(pending.size, 0); f.narration.dispose();
});

test("mismatched manifest metadata never plays another speaker or another line", async () => {
  const key = voiceKey(first.speaker, first.text);
  for (const clip of [{ url: "wrong.mp3", speaker: "shane", text: first.text }, { url: "wrong.mp3", speaker: first.speaker, text: second.text }]) {
    const f = fixture({}, { [key]: clip });
    assert.equal(await f.play(), false); assert.equal(f.narration.current.status, "missing"); assert.equal(f.made.length, 0); f.narration.dispose();
  }
});

test("subscriptions update playback controls; disposal clears media and listeners", async () => {
  const f = fixture(), seen = [], unsubscribe = f.narration.subscribe((state) => seen.push(state));
  const media = await f.start(); assert.equal(seen[0].current, null); assert.equal(seen.at(-1).playing, true);
  unsubscribe(); const count = seen.length;
  f.narration.dispose(); assert.equal(media.paused, true); assert.equal(f.narration.current, null);
  f.page.hidden = true; f.page.dispatchEvent(new Event("visibilitychange"));
  assert.equal(seen.length, count); assert.equal(await f.play(), false); assert.equal(f.made.length, 1);
});
