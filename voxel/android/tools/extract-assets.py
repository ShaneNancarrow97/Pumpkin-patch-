#!/usr/bin/env python3
"""Externalise packaged media only; the downloadable browser HTML stays intact."""
import argparse
import base64
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

ORIGIN = "https://appassets.androidplatform.net"
URI = re.compile(
    rb"data:(?P<mime>[A-Za-z0-9!#$&^_.+\-]+(?:/|\\/)[A-Za-z0-9!#$&^_.+\-]+)"
    rb"(?P<parameters>(?:;[A-Za-z0-9!#$&^_.+%=/:\-]+)*);base64,"
    rb"(?P<payload>(?:[A-Za-z0-9+/=]|\\/)*)", re.IGNORECASE)
MIME_ALIASES = {"image/jpg": "image/jpeg", "audio/mp3": "audio/mpeg", "audio/x-wav": "audio/wav",
                "audio/wave": "audio/wav", "audio/x-midi": "audio/midi", "application/font-woff": "font/woff",
                "application/font-woff2": "font/woff2", "application/x-font-woff": "font/woff",
                "application/x-font-ttf": "font/ttf", "application/x-font-opentype": "font/otf"}
EXTENSIONS = {"image/webp": "webp", "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif",
              "image/avif": "avif", "image/svg+xml": "svg", "image/x-icon": "ico", "image/bmp": "bmp",
              "image/tiff": "tiff", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/ogg": "ogg",
              "audio/mp4": "m4a", "audio/aac": "aac", "audio/webm": "webm", "audio/flac": "flac",
              "audio/midi": "mid", "font/woff2": "woff2", "font/woff": "woff", "font/ttf": "ttf",
              "font/otf": "otf", "application/vnd.ms-fontobject": "eot"}
FONT_APPLICATIONS = set(MIME_ALIASES) | {"application/vnd.ms-fontobject"}
TERMINATORS = b"\"'` \t\r\n)<]};,"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def target_mime(mime):
    return mime.startswith(("image/", "audio/", "font/")) or mime in FONT_APPLICATIONS


def atomic_write(path, data):
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_bytes(data)
    temporary.replace(path)


def extract_assets(input_file, output_dir, origin=ORIGIN):
    input_file, output_dir = Path(input_file), Path(output_dir)
    if input_file.resolve() == (output_dir / "index.html").resolve():
        raise ValueError("Input HTML and packaged index.html must be different files")
    parsed = urlsplit(origin)
    if parsed.scheme != "https" or not parsed.netloc or parsed.path or parsed.query or parsed.fragment or re.search(r"[\s\"'<>\\]", origin):
        raise ValueError("The asset origin must be an HTTPS origin without a path or credentials")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("The asset origin cannot contain credentials")
    source = input_file.read_bytes()
    media, references, chunks = {}, [], []
    counts = Counter()
    cursor = 0
    for match in URI.finditer(source):
        declared = match["mime"].replace(b"\\/", b"/").decode("ascii").lower()
        if not target_mime(declared):
            continue
        if match.end() < len(source) and source[match.end()] not in TERMINATORS:
            raise ValueError("Invalid base64 URI terminator at offset %d (%s)" % (match.end(), declared))
        payload = match["payload"].replace(b"\\/", b"/")
        if len(payload) % 4 == 1:
            raise ValueError("Invalid base64 URI length at offset %d (%s)" % (match.start(), declared))
        try:
            decoded = base64.b64decode(payload + b"=" * (-len(payload) % 4), validate=True)
        except Exception as error:
            raise ValueError("Invalid base64 URI at offset %d (%s)" % (match.start(), declared)) from error
        mime = MIME_ALIASES.get(declared, declared)
        extension = EXTENSIONS.get(mime, re.sub(r"[^a-z0-9]+", "-", mime))
        checksum = digest(decoded)
        relative = "media/%s.%s" % (checksum, extension)
        # Narration deliberately rejects URL schemes; keep a secure same-origin local path.
        url = "/assets/" + relative
        if relative not in media:
            media[relative] = {"path": relative, "url": url, "absoluteUrl": origin + url, "mimeType": mime, "sha256": checksum,
                               "bytes": len(decoded), "referenceCount": 0, "declaredMimeTypes": set(), "data": decoded}
        asset = media[relative]
        asset["referenceCount"] += 1
        asset["declaredMimeTypes"].add(declared)
        counts[declared] += 1
        replacement = url.encode("ascii")
        references.append({"sourceOffset": match.start(), "sourceBytes": match.end() - match.start(),
                           "replacementBytes": len(replacement), "path": relative, "declaredMimeType": declared})
        chunks.extend((source[cursor:match.start()], replacement))
        cursor = match.end()
    chunks.append(source[cursor:])
    processed = b"".join(chunks)
    remaining = [m for m in URI.finditer(processed) if target_mime(m["mime"].replace(b"\\/", b"/").decode("ascii").lower())]
    if remaining:
        raise ValueError("Packaged HTML still contains target base64 URIs")

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "media").mkdir(exist_ok=True)
    old_manifest = output_dir / "asset-manifest.json"
    old_paths = set()
    if old_manifest.exists():
        try:
            old_paths = {a["path"] for a in json.loads(old_manifest.read_text())["assets"]}
        except (OSError, ValueError, KeyError, TypeError):
            pass
    assets = []
    for relative, item in sorted(media.items()):
        data = item.pop("data")
        item["declaredMimeTypes"] = sorted(item["declaredMimeTypes"])
        atomic_write(output_dir / relative, data)
        assets.append(item)
    atomic_write(output_dir / "index.html", processed)
    manifest = {
        "schemaVersion": 1, "origin": origin,
        "source": {"filename": input_file.name, "bytes": len(source), "sha256": digest(source)},
        "processedHtml": {"path": "index.html", "bytes": len(processed), "sha256": digest(processed)},
        "statistics": {"dataUriReferences": len(references), "uniqueMediaAssets": len(assets),
                       "mimeReferenceCounts": dict(sorted(counts.items())),
                       "uniqueDecodedMediaBytes": sum(a["bytes"] for a in assets),
                       "parseByteReduction": len(source) - len(processed),
                       "parseByteReductionPercent": round((len(source) - len(processed)) / max(1, len(source)) * 100, 4),
                       "remainingTargetBase64Uris": 0},
        "assets": assets, "references": references}
    atomic_write(old_manifest, (json.dumps(manifest, indent=2) + "\n").encode("utf8"))
    for relative in old_paths - set(media):
        if re.fullmatch(r"media/[a-f0-9]{64}\.[a-z0-9-]+", relative):
            (output_dir / relative).unlink(missing_ok=True)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--origin", default=ORIGIN)
    args = parser.parse_args()
    manifest = extract_assets(args.input, args.output_dir, args.origin)
    print(json.dumps({"source": manifest["source"], "processedHtml": manifest["processedHtml"],
                      "statistics": manifest["statistics"]}, indent=2))


if __name__ == "__main__":
    main()
