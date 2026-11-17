import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { decodeMidi, loopClip, trimMidiTail } from "../src/ui/midi.js";
// The repeat counts music-tracks.js gives short riffs (it imports the files
// through the bundler, so the test keeps its own copy of the table).
const REPEATS = { "numb-tim-dawes-remix.mid": 9 };
// Note-on ticks and tempo events inspected directly in the five supplied files.
// Fireflies uses a much finer PPQ clock; it must not inherit another song's BPM.
const ADDITIONS = [
  { file: "dancing-in-the-moonlight.mid", ppq: 384, tempo: 444440, tick: 3084, pitch: 72, ch: 0 },
  { file: "bitter-sweet-symphony.mid", ppq: 480, tempo: 705882, tick: 480, pitch: 83, ch: 7 },
  { file: "duality.mid", ppq: 480, tempo: 428571, tick: 1920, pitch: 35, ch: 0 },
  { file: "paint-it-black.mid", ppq: 384, tempo: 397350, tick: 3466, pitch: 76, ch: 4 },
  { file: "fireflies.mid", ppq: 15360, tempo: 666674, tick: 61440, pitch: 42, ch: 0 },
];

test("every bundled original and supplied MIDI decodes into finite timed notes", () => {
  const dir = new URL("../assets/music/", import.meta.url), files = fs.readdirSync(dir).filter((f) => f.endsWith(".mid"));
  assert.equal(files.length, 31);
  for (const { file } of ADDITIONS) assert.ok(files.includes(file), file + " is bundled");
  for (const file of files) {
    const bytes = fs.readFileSync(new URL(file, dir)), decoded = decodeMidi(bytes);
    const prepared = ["billie-jean.mid", "bohemian-rhapsody.mid"].includes(file) ? trimMidiTail(decoded) : decoded;
    const clip = loopClip(prepared, REPEATS[file]);
    assert.ok(clip.notes.length > 100, file); assert.ok(clip.duration > 30 && clip.duration < 600, file);
    assert.ok(clip.notes.every((n, i) => Number.isFinite(n.time) && n.time >= 0 && n.duration > 0 && n.duration <= 12 && n.pitch >= 0 && n.pitch <= 127 && n.velocity >= 0 && n.velocity <= 1 && (!i || n.time >= clip.notes[i - 1].time)), file);
    assert.deepEqual(loopClip(prepared, REPEATS[file]), clip, "decoding is deterministic");
  }
});

test("five new supplied songs retain their own source tempo and PPQ note timing", () => {
  for (const { file, ppq, tempo, tick, pitch, ch } of ADDITIONS) {
    const bytes = fs.readFileSync(new URL("../assets/music/" + file, import.meta.url));
    assert.equal(bytes.toString("ascii", 0, 4), "MThd", file);
    assert.equal(bytes.readUInt16BE(8), 1, file + " retains its multitrack source");
    assert.equal(bytes.readUInt16BE(12), ppq, file + " retains its source tick resolution");
    const tempoAt = bytes.indexOf(Buffer.from([0xff, 0x51, 0x03]));
    assert.ok(tempoAt >= 0, file + " has an explicit tempo event");
    assert.equal(bytes.readUIntBE(tempoAt + 3, 3), tempo, file + " retains its source tempo");
    const clip = decodeMidi(bytes), expectedTime = tick * tempo / ppq / 1e6;
    assert.ok(clip.notes.some(n => n.pitch === pitch && n.ch === ch && Math.abs(n.time - expectedTime) < 1e-9), file + " plays the source note at its tempo-derived time");
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

test("supplied songs with long end markers finish after their notes, preserving source timing", () => {
  for (const file of ["billie-jean.mid", "bohemian-rhapsody.mid"]) {
    const clip = decodeMidi(fs.readFileSync(new URL("../assets/music/" + file, import.meta.url)));
    const end = Math.max(...clip.notes.map(n => n.time + n.duration)), trimmed = trimMidiTail(clip);
    assert.ok(clip.duration - end > 300, file + " retains the source end marker");
    assert.equal(trimmed.notes, clip.notes, "no note is rewritten or dropped");
    assert.equal(trimmed.duration, end + .35);
    assert.ok(trimmed.duration > 250 && trimmed.duration < 360);
    assert.equal(trimMidiTail(trimmed), trimmed, "trimming is idempotent");
  }
});
