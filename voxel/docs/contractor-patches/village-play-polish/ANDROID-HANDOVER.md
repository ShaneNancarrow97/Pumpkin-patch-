# Android contractor addendum

All game/UI/world jobs, source push, five-patch clean replay, HTML/ZIP publication and public hash verification finished before the final APK build. The APK uses the checked shared-exit HTML `9314af490ecceb32d030b6ac57772927a15013790f910146ff27ccaf0d54ce17`; the browser file was not modified.

APK: `Pumpkin-Patch-Village-Play-Polish.apk`, 42,068,590 bytes, SHA-256 `bd2876295b40747880a287ff13db558154c06a80c999827372297b237b1c323c`. Application ID `com.shanenatalie.pumpkinpatch.voxel`, separate from the older 2D app.

Read [Android source/rebuild/signing instructions](../../../android/README.md), [final build receipt](../../../android/verification/final-release.json), [binary build report](../../../android/verification/build-report.json), and [emulator limitation](../../../android/verification/emulator-report.json). Six extraction and ten native-shell tests pass; APK v2/v3 signatures, alignment, CRC, source hash and all 273 media hashes were checked independently. Android-only asset extraction reduces HTML parse bytes by 92.8352%, preserving original media. This remains System WebView/WebGL2, not a native3D rewrite or an FPS claim.

The emulator could not establish installation: its PackageInstaller storage service failed and current WebView provider was null. No install, launch, physical Fold, TV GPU or PS5 Bluetooth pass is claimed. Use a current Android System WebView. Hardware validation remains the next QA task; the signed package is provided for that test.

## Keep together

| Addition | Dependency / boundary |
| --- | --- |
| APK asset extraction | Root-relative local paths preserve the existing narration guard; manifest retains every source/binary hash. Standalone HTML is untouched. |
| Secure host | Local HTTPS asset whitelist, correct MIME/cache headers, no network or broad storage permission. |
| Controller fallback | Current PumpkinVoxel API, standard indices, native physical activation and full input release. Preserve browser pads. |
| Background audio | Music/ride/maze contexts and detached narration media all suspend; no old voice auto-replay or retained media objects. |
| Save transfer | Android document pickers and existing preview/validation/Undo; app storage is separate from browser origins. |
| Signing | Persistent private workspace key/password stay outside Git and artifacts. Obtain privately for in-place updates; otherwise export save before reinstalling. |

The Android addendum is one separate source commit after game head `8bf4d53b530fd835c20f4515e76913b376b295c9`. It adds `voxel/android` plus receipts/links, without changing game runtime files. The separate Android patch ZIP is applied after the five game patches. Claude may instead inspect the isolated contractor source branch in a fresh worktree. His working checkout/lead branch remain untouched.
