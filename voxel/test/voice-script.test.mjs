import test from "node:test";
import assert from "node:assert/strict";
import { VOICE_SCRIPT, voiceScript, summaryVoiceScript, spokenVoiceText } from "../tools/voice-script.mjs";
import { normalizeVoiceText, voiceKey } from "../src/ui/voice-key.js";
import { FOLK, HOSTS } from "../src/content/village-folk.js";
import { QUESTS } from "../src/content/village-quests.js";
import { TOUR, tourVoiceText } from "../src/content/village-tour.js";
import { CAST_CHAPTERS } from "../src/content/village-expansion-cast.js";
import { EXPANSION_ACTIVITIES } from "../src/content/village-expansion.js";

test("recording IDs are stable across whitespace and Unicode composition, but preserve the speaker", () => {
  assert.equal(normalizeVoiceText("  Cafe\u0301\n moon  "), "Café moon");
  assert.equal(voiceKey("Rowan", "A\n warm  hello."), voiceKey("rowan", "A warm hello."));
  assert.notEqual(voiceKey("rowan", "Hello."), voiceKey("elowen", "Hello."));
  assert.notEqual(voiceKey("rowan", "Hello."), voiceKey("rowan", "Goodbye."));
  assert.deepEqual(voiceScript(), VOICE_SCRIPT);
  assert.equal(new Set(VOICE_SCRIPT.map(line => line.id)).size, VOICE_SCRIPT.length);
});

test("every active village identity and tour stop has a recording request without claiming recorded audio", () => {
  for (const folk of [...FOLK, ...HOSTS]) {
    for (const text of folk.greet) assert.ok(VOICE_SCRIPT.some(line => line.id === voiceKey(folk.id, text)), `${folk.id}: ${text}`);
  }
  for (const stop of TOUR) assert.ok(VOICE_SCRIPT.some(line => line.id === voiceKey("narrator", tourVoiceText(stop))));
  assert.ok(VOICE_SCRIPT.every(line => line.source && line.spokenText && line.text));
});

test("quest speaker changes carry through to answers, while player choices stay silent", () => {
  const supper = QUESTS.find(quest => quest.id === "two-doorbells").talk.rowan;
  const choices = supper.at(-1).choices;
  for (const choice of choices) {
    assert.ok(VOICE_SCRIPT.some(line => line.id === voiceKey("elowen", choice.reply)));
    assert.ok(!VOICE_SCRIPT.some(line => line.text === choice.text));
    assert.ok(!VOICE_SCRIPT.some(line => line.id === voiceKey("rowan", choice.reply)));
  }
  assert.ok(!VOICE_SCRIPT.some(line => line.text === "How will you answer?"));
});

test("stage directions remain in captions and keys, but are never spoken", () => {
  const line = VOICE_SCRIPT.find(line => line.text.includes("*clink of mismatched mugs*"));
  assert.equal(line.spokenText, "To knocking on doors!");
  assert.equal(line.id, voiceKey("elowen", line.text));
  assert.notEqual(line.id, voiceKey("elowen", line.spokenText));
  assert.equal(spokenVoiceText("*ding ding* The stall is open!"), "The stall is open!");
  assert.ok(VOICE_SCRIPT.every(line => !line.spokenText.includes("*")));
});

test("summary accounts for all characters and distinguishes later authored coverage", () => {
  const summary = summaryVoiceScript();
  assert.equal(summary.clips, VOICE_SCRIPT.length);
  assert.equal(summary.characters, VOICE_SCRIPT.reduce((sum, line) => sum + line.spokenText.length, 0));
  const previewSpeakers=new Set(FOLK.filter(folk=>!folk.playable).map(folk=>folk.id));
  const preview=VOICE_SCRIPT.filter(line=>line.availability==='preview');
  assert.ok(preview.every(line=>previewSpeakers.has(line.speaker)));
  assert.equal(summary.coverage.preview?.clips??0,preview.length);
  assert.ok(summary.coverage.authored.clips > 0);
  assert.deepEqual(Object.keys(summary.speakers).sort(),[...new Set([...FOLK,...HOSTS].map(folk=>folk.id).concat(['shane','natalie','narrator']))].sort());
  assert.equal(Object.values(summary.coverage).reduce((sum, group) => sum + group.clips, 0), summary.clips);
});
test('expansion friendship conversations and reveal lines are queued with their real speakers while puzzle choices stay silent',()=>{
  for(const chapter of CAST_CHAPTERS)for(const line of [...chapter.intro,...chapter.done])assert.ok(VOICE_SCRIPT.some(record=>record.id===voiceKey(line.who??chapter.who,line.text)),chapter.id);
  for(const activity of EXPANSION_ACTIVITIES)if(activity.type==='reveal'&&activity.text)assert.ok(VOICE_SCRIPT.some(record=>record.id===voiceKey(activity.who??'elowen',activity.text)),activity.id);
  const puzzle=EXPANSION_ACTIVITIES.find(activity=>activity.choices?.length);assert.ok(puzzle);for(const choice of puzzle.choices)assert.ok(!VOICE_SCRIPT.some(record=>record.text===choice));
});
