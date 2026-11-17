"""Offline safety and resume checks; never contact a voice provider."""

import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import urllib.error


SPEC = importlib.util.spec_from_file_location("voice_generator", Path(__file__).parents[1] / "tools/generate-voices.py")
recorder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(recorder)


class VoiceRecordingTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.folder = Path(self.temporary.name)
        self.script, self.cast, self.out = self.folder / "script.json", self.folder / "cast.json", self.folder / "clips"
        self.entry = {"id": "mabel-1234abcd", "speaker": "mabel", "text": "Hello. *smiles*", "spokenText": "Hello.",
                      "source": "test:hello", "availability": "playable"}
        self.script.write_text(json.dumps([self.entry]))
        self.cast.write_text(json.dumps({"model": recorder.MODEL, "settings": {"stability": 0.55},
                                        "speakers": {"mabel": {"voice_id": "stockVoice", "voice_name": "Stock"}}}))
        self.argv = ["--script", str(self.script), "--cast", str(self.cast), "--out", str(self.out)]

    def invoke(self, *extra):
        output = io.StringIO()
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            result = recorder.main(self.argv + list(extra))
        return result, output.getvalue()

    def wanted(self):
        return recorder.load_requests(self.script, self.cast)[0]

    def fake_complete_record(self):
        self.out.mkdir(exist_ok=True)
        path = self.out / f"{self.entry['id']}.mp3"
        path.write_bytes(b"offline fixture audio")
        record = {**self.wanted(), "duration": 1.25, "bytes": path.stat().st_size,
                  "sha256": recorder.sha256(path), "processing": recorder.PROCESSING}
        recorder.save_manifest(self.out, {record["id"]: record})
        return record

    def test_dry_run_needs_no_key_and_makes_no_files_or_requests(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(recorder, "download_audio") as download:
            code, output = self.invoke()
        self.assertEqual(code, 0, output)
        self.assertIn('"pending": 1', output)
        self.assertIn('"characters": 6', output)
        self.assertFalse(self.out.exists())
        download.assert_not_called()

    def test_character_bound_stops_before_credentials_or_network(self):
        with patch.object(recorder, "download_audio") as download:
            code, output = self.invoke("--generate", "--max-characters", "5")
        self.assertEqual(code, 1)
        self.assertIn("exceeds --max-characters", output)
        download.assert_not_called()

    def test_resume_requires_matching_request_and_audio_checksum(self):
        record = self.fake_complete_record()
        wanted = self.wanted()
        self.assertTrue(recorder.valid_record(record, wanted, self.out))
        for field, value in (("speaker", "other"), ("text", "Changed"), ("spokenText", "Changed"),
                             ("model", "other"), ("voice_id", "other"), ("settings", {}), ("seed", 9)):
            self.assertFalse(recorder.valid_record(record, {**wanted, field: value}, self.out), field)
        (self.out / f"{wanted['id']}.mp3").write_bytes(b"corrupted same length!")
        self.assertFalse(recorder.valid_record(record, wanted, self.out))

    def test_completed_resume_needs_no_key_and_can_publish_static_import(self):
        record = self.fake_complete_record()
        module = self.folder / "ui/voice-clips.js"
        with patch.dict(os.environ, {}, clear=True), patch.object(recorder, "download_audio") as download:
            code, output = self.invoke("--generate", "--publish-js", str(module))
        self.assertEqual(code, 0, output)
        download.assert_not_called()
        self.assertIn('"cached": 1', output)
        self.assertIn('import clip0 from "../clips/mabel-1234abcd.mp3";', module.read_text())
        self.assertIn('duration: 1.25', module.read_text())
        self.assertNotIn("stockVoice", module.read_text())
        self.assertEqual(recorder.load_manifest(self.out)[record["id"]], record)

    def test_priority_puts_current_quests_before_greetings_and_optional_dialogue(self):
        sources = [
            ("future", "src/content/village-quests.js:later.intro[0]", "authored"),
            ("preview", "src/content/village-folk.js:opal.greet[0]", "preview"),
            ("gift", "src/content/village-folk.js:mabel.gift.love[0]", "playable"),
            ("chat", "src/content/village-folk.js:mabel.chats.hello[0]", "playable"),
            ("greeting", "src/content/village-folk.js:mabel.greet[0]", "playable"),
            ("favour", "src/content/village-quests.js:FAVOURS.mabel.line", "authored"),
            ("quest", "src/content/village-quests.js:mabel-1.intro[0].text", "playable"),
            ("reply", "src/content/village-quests.js:mabel-1.intro[0].choices[0].reply", "playable"),
            ("talk", "src/content/village-quests.js:mabel-1.talk.mabel[0]", "playable"),
            ("tour", "src/content/village-tour.js:TOUR[0]", "playable"),
            ("intro", "src/content/intro.js:INTRO_NARRATION", "playable"),
        ]
        entries = [{"id": clip_id, "source": source, "availability": availability} for clip_id, source, availability in sources]
        ordered = sorted(entries, key=recorder.recording_priority)
        self.assertEqual([entry["id"] for entry in ordered],
                         ["intro", "tour", "quest", "reply", "talk", "greeting", "chat", "gift", "favour", "future", "preview"])

    def test_pending_order_applies_before_limit_and_preserves_cached_audio(self):
        record = self.fake_complete_record()
        cached_path = self.out / f"{record['id']}.mp3"
        original_audio = cached_path.read_bytes()
        entries = [self.entry,
                   {**self.entry, "id": "mabel-gift", "source": "src/content/village-folk.js:mabel.gift.love[0]"},
                   {**self.entry, "id": "mabel-greet", "source": "src/content/village-folk.js:mabel.greet[0]"},
                   {**self.entry, "id": "mabel-quest", "source": "src/content/village-quests.js:mabel-1.intro[0]"},
                   {**self.entry, "id": "mabel-reply", "source": "src/content/village-quests.js:mabel-1.intro[0].choices[0].reply"}]
        self.script.write_text(json.dumps(entries))
        with patch.object(recorder, "generate") as generate, patch.object(recorder, "download_audio") as download:
            code, output = self.invoke("--generate", "--limit", "2")
        self.assertEqual(code, 0, output)
        self.assertEqual([entry["id"] for entry in generate.call_args.args[0]], ["mabel-quest", "mabel-reply"])
        download.assert_not_called()
        self.assertEqual(cached_path.read_bytes(), original_audio)
        self.assertEqual(recorder.load_manifest(self.out)[record["id"]], record)

    def test_partial_manifest_publishes_only_verified_clips_without_requests(self):
        record = self.fake_complete_record()
        entries = [self.entry, {**self.entry, "id": "mabel-pending", "spokenText": "Pending."}]
        self.script.write_text(json.dumps(entries))
        module = self.folder / "ui/voice-clips.js"
        manifest_before = (self.out / "voice-manifest.json").read_bytes()
        with patch.dict(os.environ, {}, clear=True), patch.object(recorder, "download_audio") as download:
            code, output = self.invoke("--publish-js", str(module))
        self.assertEqual(code, 0, output)
        self.assertIn('"cached": 1', output)
        self.assertIn('"pending": 1', output)
        self.assertIn('"published": 1', output)
        self.assertIn(record["id"], module.read_text())
        self.assertNotIn("mabel-pending", module.read_text())
        self.assertEqual((self.out / "voice-manifest.json").read_bytes(), manifest_before)
        download.assert_not_called()

    def test_partial_publish_refreshes_status_from_verified_audio_and_keeps_blocker(self):
        self.fake_complete_record()
        entries = [self.entry,
                   {**self.entry, "id": "mabel-z-pending", "spokenText": "Pending."},
                   {**self.entry, "id": "mabel-a-pending", "spokenText": "Pending too."}]
        self.script.write_text(json.dumps(entries))
        status_path = self.out / "recording-status.json"
        recorder.atomic_json(status_path, {"version": 1, "expectedClips": 99, "recordedClips": 99,
                                           "pendingIDs": [], "blockedReason": "quota_exceeded",
                                           "accountDetail": "must not be copied"})
        with patch.object(recorder, "download_audio") as download:
            code, output = self.invoke("--publish-js", str(self.folder / "voice-clips.js"))
        self.assertEqual(code, 0, output)
        self.assertEqual(recorder.read_json(status_path), {"version": 1, "expectedClips": 3, "recordedClips": 1,
                                                         "pendingIDs": ["mabel-a-pending", "mabel-z-pending"],
                                                         "blockedReason": "quota_exceeded"})
        download.assert_not_called()

    def test_completed_publish_and_successful_resume_clear_status_blocker(self):
        self.fake_complete_record()
        status_path = self.out / "recording-status.json"
        for arguments in (("--publish-js", str(self.folder / "voice-clips.js")), ("--generate",)):
            with self.subTest(arguments=arguments):
                recorder.atomic_json(status_path, {"version": 1, "expectedClips": 1, "recordedClips": 0,
                                                   "pendingIDs": [self.entry["id"]], "blockedReason": "quota_exceeded"})
                with patch.dict(os.environ, {}, clear=True), patch.object(recorder, "download_audio") as download:
                    code, output = self.invoke(*arguments)
                self.assertEqual(code, 0, output)
                self.assertEqual(recorder.read_json(status_path), {"version": 1, "expectedClips": 1, "recordedClips": 1,
                                                                 "pendingIDs": [], "blockedReason": None})
                download.assert_not_called()

    def test_status_refresh_rejects_corrupt_recording_and_dry_run_is_read_only(self):
        self.fake_complete_record()
        (self.out / f"{self.entry['id']}.mp3").write_bytes(b"corrupt")
        status_path = self.out / "recording-status.json"
        recorder.atomic_json(status_path, {"version": 1, "expectedClips": 1, "recordedClips": 1,
                                           "pendingIDs": [], "blockedReason": "quota_exceeded"})
        original = status_path.read_bytes()
        code, output = self.invoke()
        self.assertEqual(code, 0, output)
        self.assertEqual(status_path.read_bytes(), original)
        with patch.object(recorder, "download_audio") as download:
            code, output = self.invoke("--publish-js", str(self.folder / "voice-clips.js"))
        self.assertEqual(code, 0, output)
        self.assertEqual(recorder.read_json(status_path), {"version": 1, "expectedClips": 1, "recordedClips": 0,
                                                         "pendingIDs": [self.entry["id"]], "blockedReason": "quota_exceeded"})
        download.assert_not_called()

    def test_timeout_is_not_retried_even_on_next_invocation(self):
        with patch.dict(os.environ, {"ELEVENLABS_API_KEY": "private-test-value"}), patch.object(
                recorder, "download_audio", side_effect=urllib.error.URLError("private-provider-body")) as download:
            code, first = self.invoke("--generate", "--workers", "1")
            second_code, second = self.invoke("--generate", "--workers", "1")
        self.assertEqual((code, second_code), (1, 1))
        download.assert_called_once()
        self.assertIn("Uncertain earlier request", second)
        self.assertNotIn("private-test-value", first + second)
        self.assertNotIn("private-provider-body", first + second)

    def test_quota_failure_stops_queue_and_hides_response_details(self):
        second_entry = {**self.entry, "id": "mabel-1234abce", "spokenText": "Another."}
        self.script.write_text(json.dumps([self.entry, second_entry]))
        with patch.dict(os.environ, {"ELEVENLABS_API_KEY": "private-test-value"}), patch.object(
                recorder, "download_audio", side_effect=urllib.error.HTTPError("private-url", 429, "private-body", {}, None)) as download:
            code, output = self.invoke("--generate", "--workers", "1")
        self.assertEqual(code, 1)
        download.assert_called_once()
        self.assertIn("HTTP 429", output)
        self.assertNotIn("private", output)

    def test_provider_diagnostic_keeps_reason_and_redacts_private_values(self):
        secret = "private-test-api-key"
        body = json.dumps({"detail": {"status": "payment_required", "message":
            f"This stock voice requires a paid plan. {secret} account@example.com https://private.example token=abc123"},
            "unrelated_private_field": "never show this"}).encode()
        error = urllib.error.HTTPError("private-url", 402, "private-body", {}, io.BytesIO(body))
        message = recorder.safe_provider_error(error, secret)
        self.assertIn("payment_required", message)
        self.assertIn("This stock voice requires a paid plan", message)
        for private in (secret, "account@example.com", "https://private.example", "abc123", "never show this"):
            self.assertNotIn(private, message)

    @unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "ffmpeg tools unavailable")
    def test_local_audio_is_normalised_measured_and_resumed_without_network(self):
        wanted = self.wanted()
        journal, raw = recorder.pending_paths(self.out, wanted["id"])
        recorder.atomic_json(journal, wanted)
        subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-f", "lavfi",
                        "-i", "sine=frequency=440:duration=0.6", "-ar", "44100", str(raw)], check=True, capture_output=True)
        with patch.dict(os.environ, {"ELEVENLABS_API_KEY": "unused-test-value"}), patch.object(recorder, "download_audio") as download:
            code, output = self.invoke("--generate")
        self.assertEqual(code, 0, output)
        download.assert_not_called()
        record = recorder.load_manifest(self.out)[wanted["id"]]
        self.assertTrue(recorder.valid_record(record, wanted, self.out))
        self.assertGreater(record["duration"], 0.5)
        probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=sample_rate,channels,bit_rate", "-of", "json",
                                str(self.out / f"{wanted['id']}.mp3")], check=True, capture_output=True, text=True)
        stream = json.loads(probe.stdout)["streams"][0]
        self.assertEqual(stream, {"sample_rate": "24000", "channels": 1, "bit_rate": "64000"})
        self.assertFalse(journal.exists())
        self.assertFalse(raw.exists())


if __name__ == "__main__":
    unittest.main()
