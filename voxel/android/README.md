# Pumpkin Patch Voxel — offline Android host

This packages the checked Village Play Polish game as a fullscreen Android application. It is a small Java WebView host, **not a native 3D engine rewrite**. The browser HTML and game rules remain unchanged. A recent Android System WebView and WebGL2/OpenGL ES3 support are required. Minimum Android API 26; target 35. Physical Z Fold 7, TV and Bluetooth PS5 behaviour must still be checked on those devices.

## What is different from opening the HTML

- The APK serves the game and 273 content-hashed media files from its own secure local origin. It needs no network permission or runtime download. Static image/audio/font base64 is extracted from the APK's copy only; this reduces the HTML document parsed by WebView by about 92.84% before the small host script. Media bytes, artwork quality, music and all 164 recorded voice clips are retained.
- Hash-addressed media has immutable cache headers and is stored without ZIP recompression. The page/shell use normal revalidation. Cache is disposable; farm saves use persistent DOM storage and are never cleared by the host. Renderer speed still depends on the device/System WebView; no FPS improvement is claimed from packaging alone.
- Fullscreen, rotation, window size, density and fold configuration changes retain the current WebView. Existing game resizing, TV mode, graphics settings and frame pacing remain available; no low-resolution profile is forced.
- Backgrounding saves the farm, releases input, pauses the game, suspends every active WebAudio context and pauses HTML media. Resume restores the previous pause state and formerly-running contexts, without replaying old spoken dialogue.
- Native key/joystick events provide a bounded standard Gamepad fallback if WebView's controller API is missing or stale. PS5 face buttons, shoulders, triggers, sticks, Options/Create and D-pad use standard indices. Disconnect, focus loss and pause release every input. The first physical controller gesture unlocks app audio; preferences/mutes remain authoritative. Real Bluetooth pairing is not simulated by the VM tests.
- Backup export uses Android's Save document picker; importing uses the system file chooser and the game's existing preview/validation. No broad file-storage permission is requested. A trusted otherwise-unused F12 event is forwarded on physical gamepad button presses to grant WebView transient activation, rather than faking `navigator.userActivation`.
- Android Back closes the active voxel menu, village, placement, ride or room before offering Save & close. The host permits only its packaged origin and never exposes the backup bridge to remote pages.

## Saves and signing

The package is `com.shanenatalie.pumpkinpatch.voxel`, deliberately separate from the older 2D APK. Browser/file origins and Android app storage are separate: export your farm from the HTML game's Settings → Save to a file, then load it in the APK. Export again before uninstalling the app.

The APK uses a **persistent workspace-local test signing key**, kept outside Git and download artifacts. The key and its random password must be obtained privately from the original build workspace for an in-place update; Claude on another machine cannot recreate that identity from this repository. Retain the signing directory securely. With a different key, export the farm, uninstall the older app, install the new build and import the farm. This is not Play Store signing or publication.

## Rebuild

Requires Python 3, Java 17+, Android SDK platform 35/build-tools 35.0.0, and the Eclipse Java compiler (`ecj.jar`) for this dependency-free build. No Gradle or AndroidX runtime is needed. Supply the reviewed HTML and its exact SHA-256:

```sh
python3 voxel/android/tools/build-apk.py \
  --html /absolute/path/Pumpkin-Patch-Village-Play-Polish.html \
  --expected-sha256 THE_REVIEWED_HTML_SHA256 \
  --sdk /absolute/path/android-sdk \
  --compiler /absolute/path/ecj.jar \
  --output-dir /absolute/path/android-build \
  --signing-dir /private/path/pumpkin-voxel-signing
```

The output contains the signed universal APK, extraction manifest, source/packaged HTML hashes, per-media hashes, package badging, signature certificate receipt and ZIP-alignment checks. Build outputs, signing files and generated assets stay outside the source tree. The build refuses an HTML hash mismatch. It checks every packaged media hash and confirms compressed media is `ZIP_STORED`.

Extraction uses root-relative `/assets/media/SHA.ext` paths: the existing narration local-clip guard rejects arbitrary HTTPS URLs. Java resolves those paths only under `https://appassets.androidplatform.net/`. CSS/JS source references and generated canvas data URLs otherwise remain intact.

## Checks

```sh
python3 -m unittest discover -s voxel/android/test -p '*_test.py' -v
node --test voxel/android/test/native-shell.test.mjs
```

The six extraction tests cover deduplication, exact binary checksums, escaped CSS/JS strings, malformed inputs, guarded stale cleanup and relative narration-compatible URLs. Eleven VM checks cover pad ordering/bounds/release, current game Back actions (including visible level-reward receipts), backup I/O, all audio contexts, delayed audio completions and repeated dialogue-media cleanup. Signature/ZIP/package checks are performed on the real built APK. Emulator and hardware results are recorded separately; these unit tests are not an install/launch claim.

## Source update — 26110802

The next Android update uses version code **26110802**, name **2026.11.08.2**. `AndroidManifest.xml` is authoritative; the build report now reads package/version metadata from that manifest instead of keeping a duplicate version literal in the build script.

Native Back dismisses a visible level-reward or next-level receipt through its existing `.level-close` handler before returning from a village/room or offering to quit. Hidden receipts do not consume Back. Eleven shell VM checks and six extraction checks pass. This source-only follow-up does not build an APK: final packaging must wait until the updated game HTML/ZIP have been checked and published.

## Previous packaged game — 26110801

The release is built from game commit `8bf4d53b530fd835c20f4515e76913b376b295c9`, after the shared farm/village exit refinement. Browser HTML SHA-256: `9314af490ecceb32d030b6ac57772927a15013790f910146ff27ccaf0d54ce17`; it remains byte-identical before/after packaging.

Signed APK: **42,068,590 bytes**, SHA-256 `bd2876295b40747880a287ff13db558154c06a80c999827372297b237b1c323c`. The APK's extracted document is 4,174,189 bytes before the 85-byte shell reference, a 92.8352% parse-byte reduction. The 273 media assets retain their exact 40,531,747 decoded bytes.

`verification/final-release.json`, `build-report.json`, `asset-manifest.json`, `package-check.txt` and `signature-check.txt` record the exact inputs, outputs and checks. Six extraction tests and ten native-shell VM tests pass.

**Native runtime verification is limited:** the cached emulator was tried with software CPU emulation because no KVM is available. Android 30 booted, but its package installer failed because the framework's StorageManager was null; the current WebView provider was null, with an old 83.0.4103.120 preferred package. The game did not run there. Installation, fold/orientation retention, native save-picker interaction and physical Bluetooth/controller/TV performance therefore remain hardware checks, not claimed passes. The emulator has been stopped. Its raw failure and environment receipt are retained in `verification/emulator-report.json` and the accompanying text logs.

## Latest Blackroot package

Version26110802 /2026.11.08.2 is built last from the verified Blackroot HTML (`e98d2ffc…baaf`). [Latest native evidence](verification/blackroot/release.json) records signature/alignment/CRC and all276 media hashes, plus11 shell and6 extractor checks. Local media retains its original bytes; the HTML document is92.2446% smaller to parse. This remains Android WebView/WebGL2, with physical hardware/Bluetooth/performance unverified. Public release filename is Pumpkin-Patch-Village-Blackroot.apk; the builder’s internal historical filename is unchanged.
