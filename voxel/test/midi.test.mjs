import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { decodeMidi } from "../src/ui/midi.js";

test("every bundled original and supplied MIDI decodes into finite timed notes", () => {
  const dir = new URL("../assets/music/", import.meta.url), files = fs.readdirSync(dir).filter((f) => f.endsWith(".mid"));
  assert.equal(files.length, 12);
  for (const file of files) {
    const bytes = fs.readFileSync(new URL(file, dir)), clip = decodeMidi(bytes);
    assert.ok(clip.notes.length > 100, file); assert.ok(clip.duration > 30 && clip.duration < 600, file);
    assert.ok(clip.notes.every((n, i) => Number.isFinite(n.time) && n.time >= 0 && n.duration > 0 && n.duration <= 12 && n.pitch >= 0 && n.pitch <= 127 && n.velocity >= 0 && n.velocity <= 1 && (!i || n.time >= clip.notes[i - 1].time)), file);
    assert.deepEqual(decodeMidi(bytes), clip, "decoding is deterministic");
  }
});

test("running-status MIDI respects changing tempo instead of using a fixed BPM", () => {
  const midi = Buffer.from("4d546864000000060000000101e04d54726b0000002000ff510307a12000903c6483603c008360ff51030f4240009040648360400000ff2f00", "hex");
  const clip = decodeMidi(midi);
  assert.equal(clip.notes[0].duration, .5); assert.equal(clip.notes[1].duration, 1);
  assert.equal(clip.notes[1].time, 1);
});
