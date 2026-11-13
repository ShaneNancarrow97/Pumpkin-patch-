#!/usr/bin/env python3
"""Record authored dialogue once, then package its audio for an offline build.

Dry run is the default. Credentials come only from ELEVENLABS_API_KEY or a file.
Official API: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
Audio filter: https://ffmpeg.org/ffmpeg-filters.html#loudnorm
"""

import argparse
import concurrent.futures
import contextlib
import fcntl
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import urllib.error
import urllib.request


MODEL = "eleven_multilingual_v2"
PROCESSING = {"filter": "loudnorm=I=-18:TP=-2:LRA=9", "channels": 1,
              "sample_rate": 24000, "bit_rate": "64k"}
IDENTITY_FIELDS = ("id", "speaker", "text", "spokenText", "voice_id", "model", "settings", "seed")
ID_PATTERN = re.compile(r"[a-z0-9][a-z0-9_-]{0,127}\Z")
SETTING_NAMES = {"stability", "similarity_boost", "style", "use_speaker_boost", "speed"}


class RecordingError(Exception):
    """An actionable error which never includes credentials or service bodies."""


def read_json(path):
    with Path(path).open(encoding="utf-8") as handle:
        return json.load(handle)


def atomic_write(path, contents):
    """Keep the previous complete receipt/module until its replacement is ready."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(contents)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def atomic_json(path, value):
    atomic_write(path, json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def seed_for(clip_id):
    """Keep the same voice-key seed across machines and interrupted runs."""
    suffix = clip_id.rsplit("-", 1)[-1]
    return int(suffix, 16) if re.fullmatch(r"[0-9a-f]{8}", suffix) else int.from_bytes(hashlib.sha256(clip_id.encode()).digest()[:4], "big")


def load_requests(script_path, cast_path):
    """Reject malformed scripts before any billable request can start."""
    script, cast = read_json(script_path), read_json(cast_path)
    entries = script.get("entries") if isinstance(script, dict) else script
    if not isinstance(entries, list) or not isinstance(cast, dict) or not isinstance(cast.get("speakers"), dict):
        raise RecordingError("Expected a script array and a cast with a speakers object.")
    model = cast.get("model", MODEL)
    if model != MODEL:
        raise RecordingError(f"This recorder requires model {MODEL}.")
    requests, ids = [], set()
    for entry in entries:
        if not isinstance(entry, dict) or not all(isinstance(entry.get(key), str) and entry[key].strip() for key in ("id", "speaker", "text", "spokenText", "source", "availability")):
            raise RecordingError("Every script entry needs id, speaker, text, spokenText, source and availability strings.")
        clip_id = entry["id"]
        if not ID_PATTERN.fullmatch(clip_id) or clip_id in ids:
            raise RecordingError("Script IDs must be unique safe filenames.")
        ids.add(clip_id)
        actor = cast["speakers"].get(entry["speaker"])
        if not isinstance(actor, dict) or not re.fullmatch(r"[a-zA-Z0-9]{1,100}", str(actor.get("voice_id", ""))):
            raise RecordingError(f"Missing valid casting for {clip_id}.")
        settings = {**cast.get("settings", cast.get("voice_settings", {})),
                    **actor.get("settings", actor.get("voice_settings", {}))}
        if set(settings) - SETTING_NAMES:
            raise RecordingError(f"Unknown voice settings for {clip_id}.")
        for name, value in settings.items():
            if name == "use_speaker_boost":
                valid = isinstance(value, bool)
            else:
                minimum, maximum = (0.7, 1.2) if name == "speed" else (0, 1)
                valid = isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and minimum <= value <= maximum
            if not valid:
                raise RecordingError(f"Invalid voice settings for {clip_id}.")
        requests.append({**{key: entry[key] for key in ("id", "speaker", "text", "spokenText", "source", "availability")},
                         "voice_id": actor["voice_id"], "voice_name": actor.get("voice_name", actor.get("name", entry["speaker"])),
                         "model": model, "settings": settings, "seed": seed_for(clip_id)})
    return requests


def load_manifest(out):
    path = out / "voice-manifest.json"
    if not path.exists():
        return {}
    manifest = read_json(path)
    if not isinstance(manifest, dict) or manifest.get("version") != 1 or not isinstance(manifest.get("clips"), list):
        raise RecordingError("Unsupported voice manifest; keep it and choose another output directory.")
    records = {}
    for record in manifest["clips"]:
        if not isinstance(record, dict) or not ID_PATTERN.fullmatch(str(record.get("id", ""))) or record["id"] in records:
            raise RecordingError("Invalid or duplicate voice manifest entry.")
        records[record["id"]] = record
    return records


def same_request(record, wanted):
    return isinstance(record, dict) and all(record.get(key) == wanted[key] for key in IDENTITY_FIELDS)


def recording_priority(wanted):
    """Spend limited credits on the current story before optional/future lines."""
    source = wanted["source"]
    if source.startswith("src/content/intro.js:"):
        return 0
    if source.startswith("src/content/village-tour.js:"):
        return 1
    if wanted["availability"] == "playable":
        if source.startswith("src/content/village-quests.js:") and (".intro[" in source or ".talk." in source):
            return 2
        if source.startswith("src/content/village-folk.js:"):
            if ".greet[" in source:
                return 3
            if ".chats." in source:
                return 4
            if ".gift." in source:
                return 5
    if source.startswith("src/content/village-quests.js:FAVOURS."):
        return 6
    return 7


def valid_record(record, wanted, out):
    """A filename alone cannot make a stale or truncated recording reusable."""
    if not same_request(record, wanted) or record.get("processing") != PROCESSING:
        return False
    path = out / f"{wanted['id']}.mp3"
    duration = record.get("duration")
    return (path.is_file() and path.stat().st_size == record.get("bytes") and
            isinstance(duration, (int, float)) and math.isfinite(duration) and duration > 0 and
            sha256(path) == record.get("sha256"))


def save_manifest(out, records):
    atomic_json(out / "voice-manifest.json", {
        "version": 1, "provider": "ElevenLabs", "clips": [records[key] for key in sorted(records)]})


def pending_paths(out, clip_id):
    folder = out / ".recording-state"
    return folder / f"{clip_id}.json", folder / f"{clip_id}.mp3"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Never forward the API key to a redirected host."""
    def redirect_request(self, request, fp, code, message, headers, newurl):
        return None


def safe_provider_error(error, key):
    """Expose only a short diagnostic, never provider bodies or account tokens."""
    try:
        body = json.loads(error.read(16384))
        detail = body.get("detail", {}) if isinstance(body, dict) else {}
        if not isinstance(detail, dict):
            return ""
        status = str(detail.get("status", detail.get("code", "")))
        if not re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", status):
            status = ""
        if key:
            status = status.replace(key, "[redacted]")
        message = str(detail.get("message", ""))
        message = message.replace(key, "[redacted]") if key else message
        message = re.sub(r"https?://\S+|[\w.+-]+@[\w.-]+|\b(?:sk_|xi_)[\w-]+|\b[a-zA-Z0-9_-]{20,}\b", "[redacted]", message)
        message = re.sub(r"(?i)(?:api.?key|token|authorization|secret)\s*[:=]\s*[^\s,;]+", "[redacted]", message)
        message = " ".join(message.split())[:300]
        return ": " + " — ".join(value for value in (status, message) if value) if status or message else ""
    except (ValueError, OSError, AttributeError):
        return ""


def download_audio(wanted, key, path, timeout):
    """Make exactly one request; errors and timeouts never trigger retries."""
    payload = {"text": wanted["spokenText"], "model_id": wanted["model"],
               "voice_settings": wanted["settings"], "seed": wanted["seed"]}
    request = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{wanted['voice_id']}?output_format=mp3_44100_128",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"), method="POST",
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    temporary = path.with_suffix(".part")
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=timeout) as response, temporary.open("wb") as handle:
            if response.headers.get_content_type() not in ("audio/mpeg", "application/octet-stream"):
                raise RecordingError(f"Unexpected audio response for {wanted['id']}; no retry was made.")
            size = 0
            while chunk := response.read(65536):
                size += len(chunk)
                if size > 32 * 1024 * 1024:
                    raise RecordingError(f"Audio response exceeded size limit for {wanted['id']}.")
                handle.write(chunk)
            if not size:
                raise RecordingError(f"Empty audio response for {wanted['id']}.")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def normalise_audio(raw, destination):
    """Make compact, consistent speech and measure the exact packaged MP3."""
    fd, temporary = tempfile.mkstemp(prefix=f".{destination.stem}.", suffix=".mp3", dir=destination.parent)
    os.close(fd)
    try:
        subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", str(raw),
                        "-map_metadata", "-1", "-vn", "-af", PROCESSING["filter"], "-ac", "1", "-ar", "24000",
                        "-codec:a", "libmp3lame", "-b:a", "64k", temporary], check=True, capture_output=True, timeout=120)
        result = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", temporary],
                                check=True, capture_output=True, text=True, timeout=30)
        duration = float(json.loads(result.stdout)["format"]["duration"])
        if not math.isfinite(duration) or duration <= 0:
            raise RecordingError("Audio processing returned an invalid duration.")
        os.replace(temporary, destination)
        return {"duration": round(duration, 4), "bytes": destination.stat().st_size,
                "sha256": sha256(destination), "processing": PROCESSING}
    except (subprocess.SubprocessError, ValueError, KeyError) as error:
        raise RecordingError(f"Audio processing failed ({type(error).__name__}); downloaded audio was kept for resume.") from None
    finally:
        Path(temporary).unlink(missing_ok=True)


def record_one(wanted, out, key, stop, timeout, retry_uncertain):
    """Journal requests so an interrupted, possibly billed call is never hidden."""
    if stop.is_set():
        return None
    journal, raw = pending_paths(out, wanted["id"])
    prior = read_json(journal) if journal.exists() else None
    if prior and not same_request(prior, wanted):
        raise RecordingError(f"A different unfinished request exists for {wanted['id']}; inspect its recording state first.")
    if prior and not raw.exists() and not retry_uncertain:
        raise RecordingError(f"Uncertain earlier request for {wanted['id']}; inspect billing before explicitly using --retry-uncertain.")
    try:
        if not raw.exists():
            if stop.is_set():
                return None
            atomic_json(journal, wanted)
            try:
                download_audio(wanted, key, raw, timeout)
            except urllib.error.HTTPError as error:
                if error.code in (400, 401, 402, 403, 404, 422, 429):
                    journal.unlink(missing_ok=True)
                reason = safe_provider_error(error, key)
                raise RecordingError(f"HTTP {error.code} for {wanted['id']}{reason}; stopped without retry.") from None
            except (urllib.error.URLError, TimeoutError, OSError) as error:
                raise RecordingError(f"Request incomplete for {wanted['id']} ({type(error).__name__}); no retry was made.") from None
        return {**wanted, **normalise_audio(raw, out / f"{wanted['id']}.mp3")}
    except Exception:
        stop.set()
        raise


@contextlib.contextmanager
def recording_lock(out):
    """Only one local batch may spend credits for a given recording directory."""
    out.mkdir(parents=True, exist_ok=True)
    with (out / ".generate-voices.lock").open("a") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RecordingError("Another recorder is already using this output directory.") from None
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def generate(requests, records, out, args):
    """Keep at most two requests in flight, saving each completed clip at once."""
    if not requests:
        return
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RecordingError("ffmpeg and ffprobe are required before recording.")
    key = Path(args.key_file).read_text(encoding="utf-8").strip() if args.key_file else os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not key or "\n" in key or "\r" in key:
        raise RecordingError("Set ELEVENLABS_API_KEY or provide a private --key-file.")
    stop, errors = threading.Event(), []
    remaining = iter(requests)
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        running = {}
        def submit_next():
            wanted = next(remaining, None)
            if wanted is not None and not stop.is_set():
                running[pool.submit(record_one, wanted, out, key, stop, args.timeout, args.retry_uncertain)] = wanted
        for _ in range(args.workers):
            submit_next()
        while running:
            complete, _ = concurrent.futures.wait(running, return_when=concurrent.futures.FIRST_COMPLETED)
            for future in complete:
                wanted = running.pop(future)
                try:
                    record = future.result()
                    if record:
                        records[record["id"]] = record
                        save_manifest(out, records)
                        for path in pending_paths(out, record["id"]):
                            path.unlink(missing_ok=True)
                        print(json.dumps({"recorded": record["id"], "completed": len(records)}), flush=True)
                except Exception as error:
                    stop.set()
                    errors.append(str(error) if isinstance(error, RecordingError) else f"Recording failed for {wanted['id']} ({type(error).__name__}).")
            for _ in complete:
                submit_next()
    if errors:
        raise RecordingError(" ".join(errors))


def refresh_recording_status(requests, records, out, verified=None):
    """Keep an existing recording inventory accurate after resume or publish."""
    path = out / "recording-status.json"
    if not path.exists():
        return
    previous = read_json(path)
    if not isinstance(previous, dict) or not isinstance(previous.get("version"), int):
        raise RecordingError("Invalid recording status; expected a versioned object.")
    if verified is None:
        verified = [wanted for wanted in requests if valid_record(records.get(wanted["id"]), wanted, out)]
    recorded_ids = {wanted["id"] for wanted in verified}
    pending_ids = sorted(wanted["id"] for wanted in requests if wanted["id"] not in recorded_ids)
    # Rebuild only public inventory fields; do not copy incidental account data.
    atomic_json(path, {"version": previous["version"], "expectedClips": len(requests),
                       "recordedClips": len(recorded_ids), "pendingIDs": pending_ids,
                       "blockedReason": previous.get("blockedReason") if pending_ids else None})


def publish_js(path, requests, records, out):
    """Static imports let the existing build inline MP3s for offline playback."""
    path = Path(path).resolve()
    current = [wanted for wanted in requests if valid_record(records.get(wanted["id"]), wanted, out)]
    lines = ["// Generated by tools/generate-voices.py; only verified packaged recordings."]
    for index, wanted in enumerate(current):
        relative = Path(os.path.relpath(out / f"{wanted['id']}.mp3", path.parent)).as_posix()
        if not relative.startswith("."):
            relative = "./" + relative
        lines.append(f"import clip{index} from {json.dumps(relative)};")
    lines.append("\nexport const VOICE_CLIPS = Object.freeze({")
    for index, wanted in enumerate(current):
        record = records[wanted["id"]]
        values = ", ".join(f"{key}: {json.dumps(record[key], ensure_ascii=False)}" for key in ("speaker", "text", "duration"))
        lines.append(f"  {json.dumps(wanted['id'])}: {{ url: clip{index}, {values} }},")
    lines.append("});\n")
    atomic_write(path, "\n".join(lines))
    refresh_recording_status(requests, records, out, verified=current)
    print(json.dumps({"published": len(current)}), flush=True)


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--script", required=True, type=Path)
    parser.add_argument("--cast", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--generate", action="store_true", help="Explicitly make billable requests; otherwise only report counts.")
    parser.add_argument("--key-file", type=Path, help="Private credential file; never put its contents on the command line.")
    parser.add_argument("--max-characters", type=int, default=35000, help="Maximum pending synthesis characters for this invocation.")
    parser.add_argument("--speaker", action="append", default=[], help="Include a speaker; repeatable.")
    parser.add_argument("--exclude-speaker", action="append", default=[], help="Exclude a speaker; repeatable.")
    parser.add_argument("--id", action="append", default=[], help="Include a clip ID; repeatable.")
    parser.add_argument("--limit", type=int, help="Limit pending clips, useful for a single-clip audition.")
    parser.add_argument("--workers", type=int, choices=(1, 2), default=2)
    parser.add_argument("--timeout", type=float, default=120, help="Network timeout in seconds; no automatic retry.")
    parser.add_argument("--retry-uncertain", action="store_true", help="Explicitly repeat interrupted requests; earlier attempts may have been billed.")
    parser.add_argument("--publish-js", type=Path, help="Write static imports for verified clips, even in a dry run.")
    args = parser.parse_args(argv)
    if args.max_characters < 0 or (args.limit is not None and args.limit < 1) or args.timeout <= 0:
        parser.error("Limits must be positive (max-characters may be zero).")
    return args


def run(args):
    out = args.out.resolve()
    requests = load_requests(args.script, args.cast)
    known_speakers = {wanted["speaker"] for wanted in requests}
    known_ids = {wanted["id"] for wanted in requests}
    if (set(args.speaker) | set(args.exclude_speaker)) - known_speakers or set(args.id) - known_ids:
        raise RecordingError("Unknown speaker or clip ID filter.")
    with recording_lock(out) if args.generate else contextlib.nullcontext():
        records = load_manifest(out)
        selected = [wanted for wanted in requests if (not args.speaker or wanted["speaker"] in args.speaker)
                    and wanted["speaker"] not in args.exclude_speaker and (not args.id or wanted["id"] in args.id)]
        cached = [wanted for wanted in selected if valid_record(records.get(wanted["id"]), wanted, out)]
        cached_ids = {wanted["id"] for wanted in cached}
        # Stable sorting keeps dialogue/replies in authored order within each tier.
        pending = sorted((wanted for wanted in selected if wanted["id"] not in cached_ids), key=recording_priority)
        if args.limit is not None:
            pending = pending[:args.limit]
        characters = sum(len(wanted["spokenText"]) for wanted in pending)
        print(json.dumps({"mode": "generate" if args.generate else "dry-run", "selected": len(selected),
                          "cached": len(cached), "pending": len(pending), "characters": characters,
                          "max_characters": args.max_characters, "next_ids": [wanted["id"] for wanted in pending[:3]]}), flush=True)
        if characters > args.max_characters:
            raise RecordingError("Pending synthesis exceeds --max-characters; no requests were made.")
        if args.generate:
            # Source/coverage labels may change without changing the performance.
            changed = False
            for wanted in cached:
                record = records[wanted["id"]]
                updated = {**record, **wanted}
                if updated != record:
                    records[wanted["id"]] = updated
                    changed = True
            if changed:
                save_manifest(out, records)
            generate(pending, records, out, args)
        if args.publish_js:
            publish_js(args.publish_js, requests, records, out)
        elif args.generate:
            refresh_recording_status(requests, records, out)


def main(argv=None):
    try:
        run(parse_args(argv))
        return 0
    except (RecordingError, OSError, ValueError, TypeError) as error:
        # Provider bodies, credentials, and exception URLs never enter build logs.
        message = str(error) if isinstance(error, RecordingError) else f"Local input/output failed ({type(error).__name__})."
        print(f"Recorder stopped: {message}", file=sys.stderr, flush=True)
        return 1
    except KeyboardInterrupt:
        print("Recorder interrupted; completed clips are kept. Inspect uncertain requests before retrying.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
