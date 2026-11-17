// Frame pacing: a cap that skips frames a 120 Hz screen would draw for
// nothing, a steady 30 in TV mode when 60 can't be held (and 60 tried again
// later), and fewer frames behind a centred menu.
import test from "node:test";
import assert from "node:assert/strict";
import { createPacer, validFrameRate } from "../src/frame-pacing.js";

// Plays a stream of frames `gap` ms apart (or gaps from a function) and counts what's drawn.
function play(p, { from = 0, frames, gap }) {
  let now = from, drawn = 0, gaps = [], last = null;
  for (let i = 0; i < frames; i++) { now += typeof gap === "function" ? gap(i) : gap; if (p.draw(now)) { drawn++; if (last !== null) gaps.push(now - last); last = now; } }
  return { drawn, now, gaps };
}

test("a 120 Hz screen draws 60 frames a second, and 'every refresh' draws them all", () => {
  assert.equal(play(createPacer({ mode: "60" }), { frames: 240, gap: 1000 / 120 }).drawn, 120);
  assert.equal(play(createPacer({ mode: "auto" }), { frames: 240, gap: 1000 / 120 }).drawn, 120);
  assert.equal(play(createPacer({ mode: "max" }), { frames: 240, gap: 1000 / 120 }).drawn, 240);
});

test("a steady 30 draws every other frame of a 60 Hz screen, evenly", () => {
  const r = play(createPacer({ mode: "30" }), { frames: 120, gap: 1000 / 60 });
  assert.equal(r.drawn, 60); assert.ok(r.gaps.every((g) => Math.abs(g - 1000 / 30) < .5));
});

test("auto in TV mode settles on 30 when 60 can't be held, tries 60 again, and backs off", () => {
  const p = createPacer({ mode: "auto", tv: true });
  // A phone that alternates 16.7 and 33.3 ms frames: uneven, about 40 a second.
  let r = play(p, { frames: 200, gap: (i) => (i % 2 ? 1000 / 30 : 1000 / 60) });
  assert.equal(p.settled, 30); assert.equal(p.cap, 30);
  // Once settled, frames come evenly.
  r = play(p, { from: r.now, frames: 120, gap: (i) => (i % 2 ? 1000 / 30 : 1000 / 60) });
  assert.ok(r.gaps.every((g) => g >= 1000 / 30 - 1.5), r.gaps.slice(0, 6).join());
  // Thirty seconds on it tries 60 again; still too slow, it goes back to 30.
  r = play(p, { from: r.now, frames: 1300, gap: 1000 / 30 });
  assert.equal(p.settled, 30);
  // A phone that can hold 60 stays there.
  const quick = createPacer({ mode: "auto", tv: true }); play(quick, { frames: 400, gap: 1000 / 60 });
  assert.equal(quick.settled, 60); assert.equal(quick.cap, 60);
  // Off TV, auto never settles on 30.
  const phone = createPacer({ mode: "auto" }); play(phone, { frames: 400, gap: (i) => (i % 2 ? 1000 / 30 : 1000 / 60) });
  assert.equal(phone.cap, 60);
});

test("a centred menu holds the farm behind it to 24 frames a second, and a hidden tab doesn't count", () => {
  const p = createPacer({ mode: "60" }); p.setMenu(true);
  assert.equal(p.cap, 24);
  const drawn = play(p, { frames: 120, gap: 1000 / 60 }).drawn;          // two seconds of a 60 Hz screen
  assert.ok(drawn >= 30 && drawn <= 48, `${drawn} frames`);
  p.setMenu(false); assert.equal(p.cap, 60);
  const tv = createPacer({ mode: "auto", tv: true }); play(tv, { frames: 60, gap: 1000 / 60 }); tv.draw(1e6);   // a long pause
  play(tv, { from: 1e6, frames: 200, gap: 1000 / 60 }); assert.equal(tv.settled, 60);
  assert.equal(validFrameRate("120"), "auto"); assert.equal(validFrameRate("30"), "30");
});
