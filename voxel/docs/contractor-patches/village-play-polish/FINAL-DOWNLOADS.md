# Complete contractor delivery

All game jobs, the latest natural shared exit, HTML/ZIP checks and public publication finished before the final Android rebuild. Claude's working checkout and lead branch remain untouched.

| File | Download |
| --- | --- |
| Full offline game | [HTML](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/62b0f60c9e89f2576fb3560b1bab97d30337b689/Pumpkin-Patch-Village-Play-Polish.html) |
| Extract-and-play game | [ZIP](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/62b0f60c9e89f2576fb3560b1bab97d30337b689/Pumpkin-Patch-Village-Play-Polish.zip) |
| Offline Android test build | [APK](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/62b0f60c9e89f2576fb3560b1bab97d30337b689/Pumpkin-Patch-Village-Play-Polish.apk) |
| Five game patches, handover and evidence | [Game contractor kit](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/62b0f60c9e89f2576fb3560b1bab97d30337b689/Pumpkin-Patch-Village-Play-Polish-Claude-Patch.zip) |
| Separate Android source/addendum | [Android contractor kit](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/62b0f60c9e89f2576fb3560b1bab97d30337b689/Pumpkin-Patch-Android-Claude-Patch.zip) |

All five pinned public files were retrieved in full and verified against exact SHA-256/byte counts: [complete receipt](verification/download-receipt-complete.json). HTML SHA-256 is `9314af490ecceb32d030b6ac57772927a15013790f910146ff27ccaf0d54ce17`; APK SHA-256 is `bd2876295b40747880a287ff13db558154c06a80c999827372297b237b1c323c`.

Game source `8bf4d53b530fd835c20f4515e76913b376b295c9` replays from the previous handover with five patches and rebuilds identical HTML. The one Android addendum patch follows it to `3b42a9a1f7ff6b0a1fe51f6e33f1fdca13988d72`; its clean replay matches that source tree and changes no game runtime files. Later documentation-only receipts are on the same contractor source branch.

Read [the current game verification](SHARED-EXIT-DELIVERY.md), [shared-exit dependencies](FARM-ENTRANCE.md), [Android handover](ANDROID-HANDOVER.md) and [native build/signing guide](../../../android/README.md). Browser/extracted artwork bytes are preserved. Android uses WebView/WebGL2, a secure offline asset origin and a document about 92.84% smaller to parse. Six extractor and ten shell tests plus signature/alignment/CRC/all-media checks pass. Emulator installation was environment-blocked, so physical Fold 7/TV/PS5 testing remains unverified.

Export your browser farm through Settings before transferring to the app; import there. Android signing material remains private and is not in either kit. Obtain it privately for in-place app updates, or export your save before uninstalling/reinstalling with a different key. No Play Store publication was performed.
