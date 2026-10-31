import test from "node:test";
import assert from "node:assert/strict";
import * as M from "../src/model.js";
import { INTRO_LINES, INTRO_TITLE } from "../src/content/intro.js";

const roundTrip = (s) => M.restoreState(JSON.parse(JSON.stringify(M.saveData(s))));

test("a new patch shows the introduction, and a reload before it ends still does", () => {
  const s = M.freshState();
  assert.equal(s.introSeen, false);
  assert.ok(M.shouldShowIntro(s));
  assert.ok(M.shouldShowIntro(roundTrip(s)));
  assert.ok(M.shouldShowIntro(M.restoreState(null)), "junk starts a new patch");
});

test("once watched or skipped, the introduction stays seen through a save", () => {
  const s = M.freshState();
  s.introSeen = true;
  assert.ok(!M.shouldShowIntro(s));
  const back = roundTrip(s);
  assert.equal(back.introSeen, true);
  assert.ok(!M.shouldShowIntro(back));
});

test("saves already under way never show it, flag or no flag", () => {
  const played = [
    (s) => { s.harvested = 3; }, (s) => { s.sold = 1; }, (s) => { s.taps = 2; }, (s) => { s.earned = 12; },
    (s) => { s.plots[0] = { phase: "growing", progress: 0.2, variety: 0 }; }, (s) => { s.memories = ["first"]; },
    (s) => { s.claimed = ["basket"]; s.harvested = 6; },
  ];
  for (const play of played) {
    const s = M.freshState(); play(s);
    assert.ok(M.hasPlayed(s));
    assert.ok(!M.shouldShowIntro(s), "a live state under way");
    // An older save, from before the introduction, has no flag at all.
    const old = JSON.parse(JSON.stringify(M.saveData(s))); delete old.introSeen;
    assert.equal(M.restoreState(old).introSeen, true);
    assert.equal(M.restoreState({ ...old, introSeen: false }).introSeen, true, "progress wins over a stale flag");
  }
  // An untouched old save is a new patch in all but name.
  const untouched = JSON.parse(JSON.stringify(M.saveData(M.freshState()))); delete untouched.introSeen;
  assert.ok(M.shouldShowIntro(M.restoreState(untouched)));
  assert.ok(M.shouldShowIntro(M.restoreState({ ...untouched, introSeen: "yes" })), "only true counts");
});

test("the introduction is short, and Shane and Natalie take turns", () => {
  assert.equal(`${INTRO_TITLE.owners} ${INTRO_TITLE.name}`, "Shane & Natalie’s Pumpkin Patch");
  assert.equal(INTRO_TITLE.tagline, "A little darkness, a lot of heart.");
  assert.ok(INTRO_LINES.length >= 5 && INTRO_LINES.length <= 7);
  INTRO_LINES.forEach((line, i) => {
    assert.ok(["shane", "natalie"].includes(line.who));
    if (i) assert.notEqual(line.who, INTRO_LINES[i - 1].who, "they alternate");
    assert.ok(line.text.length <= 130, `line ${i + 1} is short`);
  });
  // It covers how to play and the goal, naming the things players will look for.
  const all = INTRO_LINES.map((l) => l.text).join(" ");
  for (const word of ["Boost", "big pumpkin", "Harvest", "Skyla", "Honest Pumpkin", "upgrades", "haunted home", "journal", "attractions", "most loved"]) assert.ok(all.includes(word), word);
});
