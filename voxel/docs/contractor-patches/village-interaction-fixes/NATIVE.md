# Optional Android delivery — Interaction Fixes

Prepared only after the checked HTML, ZIP and game kit were published and their complete public downloads verified. This is the existing offline Android host with a version increment; no gameplay fork or new native engine.

- Application: `com.shanenatalie.pumpkinpatch.voxel`.
- Version: **26110901 / 2026.11.09.1**, minSDK26, target35.
- Final release: `Pumpkin-Patch-Village-Interaction-Fixes.apk`, **42,429,422bytes**.
- APK SHA256: `d0d91bfab180dd32c6aada8fc048b7b792585cd07d93390a69550a4379210ceb`.
- Input HTML SHA256: `c08029b91f19cb4363b39b0fbb0bbf376dd43656eb46fbaba21b33382198d8f7` — the exact published game.

## Packaging and checks

The existing extractor moves276 unique media assets to local Android assets without recompressing them. Parsed HTML falls from59,031,827 to4,621,874bytes, a **92.1705% reduction**; the packaged document also carries the existing native bootstrap. Media hashes and ZIP CRC match, zero target base64 media URIs remain, and all assets stay offline. MIDI and game scripts remain in the page. This reduces parsing work; it is not a measured device FPS claim.

The APK passes v2/v3 signature verification, alignment, package/SDK checks and archive CRC. The signing certificate matches the previous Blackroot APK, so normal Android app-update identity is retained. **11 native-shell tests and six extractor tests pass**. Reports are in `voxel/android/verification/interaction-fixes/`; the build report retains the builder’s internal output filename, which was renamed to the release filename above after checks.

Physical installation, Fold7 GPU performance, real TV hardware and Bluetooth pairing were not exercised. The earlier unsuitable cached emulator was not reused as installation proof. The runtime remains Android System WebView/WebGL2. Existing fullscreen, controller, save-file picker, native Back and background-audio handling are retained; the village Back method now opens/cancels the checked return confirmation.

## Rebuild and integration

The actual native source change is the version in `android/AndroidManifest.xml`. The host/extractor/build scripts are unchanged from the base. Use the reviewed HTML and the existing SDK/compiler:

```sh
python3 voxel/android/tools/build-apk.py \
  --html /path/to/Pumpkin-Patch-Village-Interaction-Fixes.html \
  --expected-sha256 c08029b91f19cb4363b39b0fbb0bbf376dd43656eb46fbaba21b33382198d8f7 \
  --output-dir /path/to/owned-build-directory
```

The persistent signing key and password stay outside source and all kits. Do not create replacement signing material when an installed app needs an in-place update. Claude can integrate the game-only kit without Android packaging. The separate Android kit contains the intervening publication receipt and this additive native patch, with their exact apply order and clean replay proof; the final publication receipt supplies immutable downloads.
