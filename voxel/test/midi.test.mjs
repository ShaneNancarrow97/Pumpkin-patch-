import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { decodeMidi, loopClip } from "../src/ui/midi.js";
// The repeat counts music-tracks.js gives short riffs (it imports the files
// through the bundler, so the test keeps its own copy of the table).
const REPEATS = { "numb-tim-dawes-remix.mid": 9 };

test("every bundled original and supplied MIDI decodes into finite timed notes", () => {
  const dir = new URL("../assets/music/", import.meta.url), files = fs.readdirSync(dir).filter((f) => f.endsWith(".mid"));
  assert.equal(files.length, 21);
  for (const file of files) {
    const bytes = fs.readFileSync(new URL(file, dir)), clip = loopClip(decodeMidi(bytes), REPEATS[file]);
    assert.ok(clip.notes.length > 100, file); assert.ok(clip.duration > 30 && clip.duration < 600, file);
    assert.ok(clip.notes.every((n, i) => Number.isFinite(n.time) && n.time >= 0 && n.duration > 0 && n.duration <= 12 && n.pitch >= 0 && n.pitch <= 127 && n.velocity >= 0 && n.velocity <= 1 && (!i || n.time >= clip.notes[i - 1].time)), file);
    assert.deepEqual(loopClip(decodeMidi(bytes), REPEATS[file]), clip, "decoding is deterministic");
  }
});

test("running-status MIDI respects changing tempo instead of using a fixed BPM", () => {
  const midi = Buffer.from("4d546864000000060000000101e04d54726b0000002000ff510307a12000903c6483603c008360ff51030f4240009040648360400000ff2f00", "hex");
  const clip = decodeMidi(midi);
  assert.equal(clip.notes[0].duration, .5); assert.equal(clip.notes[1].duration, 1);
  assert.equal(clip.notes[1].time, 1);
});

test("a short riff loops on its own length into a track", () => {
  const bytes = fs.readFileSync(new URL("../assets/music/numb-tim-dawes-remix.mid", import.meta.url)), riff = decodeMidi(bytes), track = loopClip(riff, 9);
  assert.ok(riff.duration < 10 && riff.notes.length < 100, "the supplied file is one short riff");
  assert.equal(track.notes.length, riff.notes.length * 9);
  assert.ok(Math.abs(track.duration - riff.duration * 9) < 1e-9);
  // Each pass starts exactly a riff's length after the last, so the loop never drifts.
  assert.ok(Math.abs(track.notes[riff.notes.length].time - (riff.notes[0].time + riff.duration)) < 1e-9);
  assert.equal(loopClip(riff, 1), riff);
  assert.equal(loopClip(riff, undefined), riff);
});
