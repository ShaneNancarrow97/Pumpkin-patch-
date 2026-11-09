// A reproducible recording script from authored dialogue, without player choices.
// Run `node tools/voice-script.mjs` for JSON, or add --summary for character totals.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { INTRO_LINES, INTRO_NARRATION } from "../src/content/intro.js";
import { TOUR, tourVoiceText } from "../src/content/village-tour.js";
import { FOLK, HOSTS } from "../src/content/village-folk.js";
import { QUESTS, FAVOURS } from "../src/content/village-quests.js";
import { CAST_CHAPTERS } from "../src/content/village-expansion-cast.js";
import { EXPANSION_ACTIVITIES } from "../src/content/village-expansion.js";
import { normalizeVoiceText, voiceKey } from "../src/ui/voice-key.js";

// Keep captions verbatim, while omitting authored sound/stage directions in speech.
export const spokenVoiceText = text => normalizeVoiceText(String(text).replace(/\*[^*]*\*/gu, " ")).replace(/\s+([,.!?;:])/gu, "$1");

// Preserve existing recording buckets for these gated restoration chapters.
const LATER_QUESTS = new Set(["rowan-2", "rowan-pumpkins", "elowen-2", "two-doorbells"]);
export const VOICE_COVERAGE = Object.freeze({
  playable: "Farm introduction, tour and active residents' greetings, chats, gifts and early quest conversations. District and friendship gates still apply; a script entry does not imply that audio is recorded.",
  authored: "Gated restoration/friendship chapters, completion dialogue, expansion reveals and favour requests authored in the current game. Missing clips use the complete text fallback.",
  preview: "Greetings and dialogue belonging to any residents explicitly marked as preview-only. This bucket is empty when all authored residents have saved-game routes.",
});

// Source order is stable; repeated speaker/text pairs share one recording.
export function voiceScript() {
  const records = new Map();
  const add = (speaker, text, source, availability = "playable") => {
    if (typeof text !== "string" || !normalizeVoiceText(text)) return;
    const id = voiceKey(speaker, text), spokenText = spokenVoiceText(text), prior = records.get(id);
    if (!spokenText) return;
    if (prior && (prior.speaker !== speaker || normalizeVoiceText(prior.text) !== normalizeVoiceText(text))) throw new Error(`Voice key collision: ${id}`);
    if (!prior) records.set(id, Object.freeze({ id, speaker, text, spokenText, source, availability }));
  };
  // A character switch also owns the next choice's answer, as in Two Doorbells.
  const sequence = (lines, speaker, source, availability) => {
    for (const [i, line] of (lines ?? []).entries()) {
      if (typeof line === "string") { add(speaker, line, `${source}[${i}]`, availability); continue; }
      if (!line || typeof line !== "object") continue;
      speaker = line.who ?? speaker;
      add(speaker, line.text, `${source}[${i}].text`, availability);
      for (const [j, choice] of (line.choices ?? []).entries()) add(choice.who ?? speaker, choice.reply, `${source}[${i}].choices[${j}].reply`, availability);
    }
  };

  add("natalie", INTRO_NARRATION, "src/content/intro.js:INTRO_NARRATION");
  sequence(INTRO_LINES, "natalie", "src/content/intro.js:INTRO_LINES", "playable");
  TOUR.forEach((stop, i) => add("narrator", tourVoiceText(stop), `src/content/village-tour.js:TOUR[${i}]`));

  for (const folk of [...FOLK, ...HOSTS]) {
    const availability = folk.playable || HOSTS.includes(folk) ? "playable" : "preview";
    const source = `src/content/village-folk.js:${folk.id}`;
    sequence(folk.greet, folk.id, `${source}.greet`, availability);
    for (const [taste, lines] of Object.entries(folk.gift ?? {})) sequence(lines, folk.id, `${source}.gift.${taste}`, availability);
    for (const chat of folk.chats ?? []) sequence([...chat.lines, { choices: chat.choices }], folk.id, `${source}.chats.${chat.id}`, availability);
  }
  for (const quest of QUESTS) {
    const source = `src/content/village-quests.js:${quest.id}`, availability = LATER_QUESTS.has(quest.id) ? "authored" : "playable";
    sequence(quest.intro, quest.giver, `${source}.intro`, availability);
    for (const [speaker, lines] of Object.entries(quest.talk)) sequence(lines, speaker, `${source}.talk.${speaker}`, availability);
    sequence(quest.done, quest.giver, `${source}.done`, "authored");
  }
  for (const favour of FAVOURS) add(favour.who, favour.line, `src/content/village-quests.js:FAVOURS.${favour.id}.line`, "authored");
  for (const chapter of CAST_CHAPTERS) {
    const source=`src/content/village-expansion-cast.js:${chapter.id}`;
    sequence(chapter.intro,chapter.who,`${source}.intro`,"authored");
    sequence(chapter.done,chapter.who,`${source}.done`,"authored");
  }
  // These are the actual fallback cinematic lines spoken by the runtime.
  // Puzzle options, clues and player replies remain silent interface text.
  for(const activity of EXPANSION_ACTIVITIES)if(activity.type==='reveal'&&activity.text)add(activity.who??'elowen',activity.text,`src/content/village-expansion.js:${activity.id}.text`,"authored");
  return Object.freeze([...records.values()]);
}

export const VOICE_SCRIPT = voiceScript();

// Character totals use synthesis text, the string sent to the voice provider.
export function summaryVoiceScript(entries = VOICE_SCRIPT) {
  const total = { clips: 0, characters: 0 }, speakers = {}, coverage = {};
  for (const entry of entries) {
    for (const bucket of [total, speakers[entry.speaker] ??= { clips: 0, characters: 0 }, coverage[entry.availability] ??= { clips: 0, characters: 0 }]) {
      bucket.clips++; bucket.characters += entry.spokenText.length;
    }
  }
  return { ...total, speakers, coverage, coverageNotes: VOICE_COVERAGE };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(process.argv.includes("--summary") ? summaryVoiceScript() : VOICE_SCRIPT, null, 2));
}
