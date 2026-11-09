# Android addendum — package after the game

The new game HTML/ZIP and game contractor kit are published first. The Android build is a separate native addendum on the same contractor branch and does not alter game rules or artwork.

The existing offline host now dismisses a visible level receipt through its own `.level-close` handler before leaving a village/room or offering to quit. This retains the game's one-time reward handling. Package version is **26110802 / 2026.11.08.2**, using the previous persistent private signing identity. The builder reads package/version metadata from the manifest to prevent a stale report.

Rebuild from the exact final browser HTML:

```sh
python3 voxel/android/tools/build-apk.py \
  --html /workspace/Pumpkin-Patch-Village-Blackroot.html \
  --expected-sha256 e98d2ffc583051836aa21f33eccb04559ea413b4e4ebec31bd4cc8cd529abaaf \
  --output-dir /workspace/android-menu-refinement-build
```

The builder retains its previous internal APK filename; the public release copy is named `Pumpkin-Patch-Village-Blackroot.apk`. Checksums identify the bytes independently of the filename. See [the native source guide](../../../android/README.md) for SDK/ECJ paths and private signing recovery. No key or password is included in Git or either contractor kit.

Eleven native-shell VM tests and six extractor tests pass. The signed build checks every packaged media byte, ZIP CRC, alignment, signature and manifest. Final build metadata and public receipt are linked from `DELIVERY.md` when packaging completes. These checks do not constitute installation or physical-device testing. The earlier emulator's storage/framework and obsolete WebView prevented its installation; no new Fold 7/TV/PS5 Bluetooth certification is claimed.

Export your farm in Settings before moving from the browser to Android. Same-key updates preserve app storage; a replacement signing identity requires a save export before uninstalling the old app. The secure offline origin, local asset extraction, native pad fallback, foreground/audio lifecycle and document-picker save transfer remain as described in the original native guide.
