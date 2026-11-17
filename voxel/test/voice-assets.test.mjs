import test from "node:test";
import assert from "node:assert/strict";
import { auditVoiceAssets, readPublishedVoiceModule } from "../tools/audit-voice-assets.mjs";
import { VOICE_SCRIPT } from "../tools/voice-script.mjs";

test("published voices match the script, cast and hashes; every missing clip is declared", () => {
  const { errors, receipt } = auditVoiceAssets();
  assert.deepEqual(errors, [], "Publish every recorded voice and keep the pending recording inventory exact");
  assert.equal(receipt.verified, true);
  assert.equal(receipt.complete, receipt.pendingClips === 0);
  assert.equal(receipt.clips + receipt.pendingClips, VOICE_SCRIPT.length);
  assert.equal(receipt.characters + receipt.pendingCharacters, receipt.expectedCharacters);
  assert.equal(receipt.pending.ids.length, receipt.pendingClips);
  assert.ok(receipt.seconds > 0 && receipt.bytes > 0);
});

test("published clip inspection rejects duplicate and unsupported imports without loading audio", () => {
  const parsed = readPublishedVoiceModule('import clip0 from "https://example.com/test.mp3";\nimport clip0 from "./test.mp3";\nimport extra from "./external.js";\nexport const VOICE_CLIPS = Object.freeze({\n});');
  assert.ok(parsed.errors.includes("Duplicate voice module import"));
  assert.ok(parsed.errors.includes("Unsupported voice module import"));
  assert.equal(parsed.clips.size, 0);
});
