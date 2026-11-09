// Audit the published recordings without decoding audio or contacting a provider.
// Run after generation: node tools/audit-voice-assets.mjs > voice-audit.json
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { VOICE_SCRIPT, summaryVoiceScript } from "./voice-script.mjs";

const ROOT = new URL("../", import.meta.url);
const ASSETS = "assets/voices/mothlight-v1/";
const PROCESSING = { filter: "loudnorm=I=-18:TP=-2:LRA=9", channels: 1, sample_rate: 24000, bit_rate: "64k" };
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sortedKeys = object => Object.keys(object ?? {}).sort();
const secretPatterns = [/\b(?:sk_|sk-)[A-Za-z0-9_-]{20,}\b/, /ELEVENLABS_API_KEY|xi-api-key|api\.elevenlabs\.io/i, /["'](?:api[_-]?key|authorization|access[_-]?token|secret)["']\s*:/i];

// Only parse the generator's import/record shape; never load an MP3 as a module.
export function readPublishedVoiceModule(source) {
  const imports = new Map(), clips = new Map(), errors = [];
  for (const line of source.split("\n")) {
    if (line.startsWith("import ")) {
      const match = /^import (clip\d+) from ("(?:[^"\\]|\\.)*");$/.exec(line);
      if (!match) { errors.push("Unsupported voice module import"); continue; }
      if (imports.has(match[1])) errors.push("Duplicate voice module import");
      imports.set(match[1], JSON.parse(match[2]));
    }
    if (line.startsWith('  "')) {
      const match = /^  ("(?:[^"\\]|\\.)*"): \{ url: (clip\d+), speaker: ("(?:[^"\\]|\\.)*"), text: ("(?:[^"\\]|\\.)*"), duration: (\d+(?:\.\d+)?) \},$/.exec(line);
      if (!match) { errors.push("Unsupported voice module record"); continue; }
      const id = JSON.parse(match[1]);
      if (clips.has(id)) errors.push("Duplicate voice module recording");
      clips.set(id, { imported: match[2], speaker: JSON.parse(match[3]), text: JSON.parse(match[4]), duration: Number(match[5]) });
    }
  }
  if (!source.includes("export const VOICE_CLIPS = Object.freeze({")) errors.push("Missing published VOICE_CLIPS export");
  return { imports, clips, errors };
}

// Errors name the affected clip or file, never a credential or matched source text.
export function auditVoiceAssets(root = ROOT) {
  const errors = [], check = (condition, message) => { if (!condition) errors.push(message); };
  const read = path => readFileSync(new URL(path, root));
  const manifestBytes = read(`${ASSETS}voice-manifest.json`), castBytes = read(`${ASSETS}cast.json`), moduleBytes = read("src/ui/voice-clips.js"), statusBytes = read(`${ASSETS}recording-status.json`);
  const manifest = JSON.parse(manifestBytes), cast = JSON.parse(castBytes), published = readPublishedVoiceModule(moduleBytes.toString("utf8"));
  const status = JSON.parse(statusBytes);
  errors.push(...published.errors);
  check(manifest.version === 1 && manifest.provider === "ElevenLabs" && Array.isArray(manifest.clips), "Voice manifest schema/provider mismatch");
  check(cast.version === 1 && cast.provider === "ElevenLabs" && cast.model === "eleven_multilingual_v2", "Voice cast schema/model mismatch");
  const expected = new Map(VOICE_SCRIPT.map(line => [line.id, line]));
  const records = new Map((manifest.clips ?? []).map(clip => [clip.id, clip]));
  const pending = VOICE_SCRIPT.filter(line => !records.has(line.id)), pendingIDs = pending.map(line => line.id).sort();
  check(records.size === manifest.clips?.length, "Duplicate recordings in voice manifest");
  check(status.version === 1 && status.expectedClips === expected.size && status.recordedClips === records.size, "Recording status counts differ from the current script and manifest");
  check(equal(status.pendingIDs, pendingIDs), "Recording status must list every missing script ID exactly, in sorted order");
  if(status.pendingReasons){
    check(equal(sortedKeys(status.pendingReasons),pendingIDs),"Pending reason inventory must match every missing clip exactly");
    check(Object.values(status.pendingReasons).every(reason=>['prior_quota_exceeded','not_recorded_in_this_contract'].includes(reason)),"Pending reason inventory has an unsupported recording claim");
  }
  check(pending.length ? status.blockedReason === "quota_exceeded" : status.blockedReason === null, "Recording status must disclose the quota block while clips remain pending");
  check(equal([...published.clips.keys()].sort(), [...records.keys()].sort()), `Published voice module is incomplete or stale: ${published.clips.size}/${records.size} recorded clips`);
  check(published.imports.size === records.size, `Published voice import count differs from the ${records.size} recorded clips`);
  check(equal(readdirSync(new URL(ASSETS, root)).filter(name => name.endsWith(".mp3")).sort(), [...records.keys()].map(id => `${id}.mp3`).sort()), "Packaged MP3 files differ from the recording manifest");
  check(equal(sortedKeys(cast.speakers), [...new Set(VOICE_SCRIPT.map(line => line.speaker))].sort()), "Voice cast does not match all script speakers");

  const speakerTotals = {}, coverage = {};
  let bytes = 0, duration = 0, characters = 0;
  for (const [id, clip] of records) {
    const line = expected.get(id), actor = cast.speakers?.[clip.speaker];
    if (!line) { check(false, `Unscripted recording: ${id}`); continue; }
    for (const field of ["speaker", "text", "spokenText", "source", "availability"]) check(clip[field] === line[field], `${id}: stale ${field}`);
    const settings = { ...(cast.settings ?? cast.voice_settings), ...(actor?.settings ?? actor?.voice_settings) };
    check(actor && /^[A-Za-z0-9]{1,100}$/.test(actor.voice_id) && clip.voice_id === actor.voice_id, `${id}: voice ID differs from cast`);
    check(clip.voice_name === (actor?.voice_name ?? actor?.name), `${id}: voice name differs from cast`);
    check(clip.model === cast.model, `${id}: model differs from cast`);
    check(equal(sortedKeys(clip.settings), sortedKeys(settings)) && Object.entries(settings).every(([key, value]) => clip.settings[key] === value), `${id}: voice settings differ from cast`);
    for (const [name, value] of Object.entries(settings)) {
      const valid = name === "use_speaker_boost" ? typeof value === "boolean" : ["stability", "similarity_boost", "style", "speed"].includes(name) && Number.isFinite(value) && value >= (name === "speed" ? .7 : 0) && value <= (name === "speed" ? 1.2 : 1);
      check(valid, `${id}: invalid voice setting ${name}`);
    }
    check(clip.seed === Number.parseInt(id.slice(-8), 16), `${id}: unstable generation seed`);
    check(equal(clip.processing, PROCESSING), `${id}: audio processing metadata differs`);
    check(Number.isFinite(clip.duration) && clip.duration > 0 && clip.duration < 300, `${id}: invalid measured duration`);
    check(Number.isInteger(clip.bytes) && clip.bytes > 0 && /^[a-f0-9]{64}$/.test(clip.sha256), `${id}: invalid file metadata`);
    let audio;
    try { audio = read(`${ASSETS}${id}.mp3`); } catch { check(false, `${id}: packaged MP3 is missing`); continue; }
    check(audio.length === clip.bytes, `${id}: packaged byte count differs`);
    check(hash(audio) === clip.sha256, `${id}: packaged SHA256 differs`);
    check(audio.toString("ascii", 0, 3) === "ID3" || (audio[0] === 255 && (audio[1] & 224) === 224), `${id}: packaged file has no MP3 header`);
    const packaged = published.clips.get(id);
    if (packaged) {
      const imported = published.imports.get(packaged.imported);
      check(typeof imported === "string" && new URL(imported, new URL("src/ui/voice-clips.js", root)).href === new URL(`${ASSETS}${id}.mp3`, root).href, `${id}: module points to the wrong packaged file`);
      for (const field of ["speaker", "text", "duration"]) check(packaged[field] === clip[field], `${id}: module ${field} differs from manifest`);
    }
    bytes += audio.length; duration += clip.duration; characters += line.spokenText.length;
    for (const group of [speakerTotals[clip.speaker] ??= { clips: 0, characters: 0, bytes: 0, seconds: 0 }, coverage[line.availability] ??= { clips: 0, characters: 0, bytes: 0, seconds: 0 }]) {
      group.clips++; group.characters += line.spokenText.length; group.bytes += audio.length; group.seconds += clip.duration;
    }
  }
  const sources = [["voice-manifest.json", manifestBytes], ["recording-status.json", statusBytes], ["cast.json", castBytes], ["voice-clips.js", moduleBytes], ["build.mjs", read("build.mjs")]];
  for (const [name, source] of sources) check(!secretPatterns.some(pattern => pattern.test(source.toString("utf8"))), `${name}: credential or live API configuration found`);
  for (const group of [...Object.values(speakerTotals), ...Object.values(coverage)]) group.seconds = Number(group.seconds.toFixed(4));
  const summary = summaryVoiceScript();
  const pendingSummary = summaryVoiceScript(pending), pendingSources = {};
  for (const line of pending) {
    const source = line.source.includes(".chats.") ? "Village chats" : line.source.includes(".gift.") ? "Gift replies" : line.source.includes(".greet[") ? "Greetings" : line.source.includes(":FAVOURS.") ? "Favour requests" : line.source.includes("village-expansion") ? "Expansion story dialogue" : line.source.includes("village-quests.js") ? "Quest dialogue" : line.source.includes("village-tour.js") ? "Village tour" : "Farm introduction";
    const group = pendingSources[source] ??= { clips: 0, characters: 0 };
    group.clips++; group.characters += line.spokenText.length;
  }
  return { errors, receipt: {
    version: 1, verified: errors.length === 0, complete: !pending.length && errors.length === 0, provider: manifest.provider, model: cast.model,
    expectedClips: expected.size, clips: records.size, expectedCharacters: summary.characters, characters,
    pendingClips: pending.length, pendingCharacters: pendingSummary.characters, blockedReason: status.blockedReason,
    pending: { speakers: pendingSummary.speakers, sources: pendingSources, coverage: pendingSummary.coverage, ids: pendingIDs },
    bytes, seconds: Number(duration.toFixed(4)), minutes: Number((duration / 60).toFixed(2)),
    speakers: speakerTotals, coverage, coverageNotes: summary.coverageNotes,
    sha256: Object.fromEntries(sources.map(([name, source]) => [name, hash(source)])),
  } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { errors, receipt } = auditVoiceAssets();
  if (errors.length) { console.error(errors.slice(0, 20).join("\n")); process.exitCode = 1; }
  else console.log(JSON.stringify(receipt, null, 2));
}
