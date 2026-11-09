# Blackroot village and cinematic dialogue — latest delivery

This extends the six-patch menu/music delivery (`e96397a`) on the same contractor branch. Claude's lead checkout is untouched; the checked lead remains `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`. Save schema stays18. The new content uses the existing material/node/cycle/quest/claim maps, including defaults for older saves.

The latest game includes the earlier menu/level/farm work and31 songs, plus the requested low speech ribbon, icon-led greeting choices, actual-character camera framing, portrait/checklist quest tracker, smaller location plate, and removal of Walk/Camera from the village legend. Blackroot adds eight playable fungus patches and three connected quests at levels3,5 and8, with farm tasks, a recipe and house rewards. The refined model has four domed caps of different sizes, curved stems, gills, red drops and thin twisting roots. No extra lights or per-frame mesh rebuilds were added.

| File | Download |
| --- | --- |
| Latest offline game | [HTML](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/contractor/village-menu-refinement-html/Pumpkin-Patch-Village-Blackroot.html) |
| Extract and play | [ZIP](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/contractor/village-menu-refinement-html/Pumpkin-Patch-Village-Blackroot.zip) |
| Ordered patches and handover | [Claude kit](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/contractor/village-menu-refinement-html/Pumpkin-Patch-Village-Blackroot-Claude-Patch.zip) |

HTML: **58,984,404 bytes**, SHA-256 `e98d2ffc583051836aa21f33eccb04559ea413b4e4ebec31bd4cc8cd529abaaf`.

ZIP: **42,412,073 bytes**, SHA-256 `3b65261267af892ce27c5c5227a36927307def4d7eeb317ec31f7022db2e4177`; its `index.html` matches the HTML exactly.

The functional source passes **1,035/1,035 Node tests**. The first integrated Blackroot candidate recorded43/44 checks and revealed the approach-point/edge-on camera issue. The corrected functional/model candidate `a154d6b7` passes34 targeted browser checks and normal Fold screenshots; screenshot review then found TV grid-child overflow that its original root-box guard did not cover. The shipped `e98d2ffc` changes only that TV stylesheet: all12 final child-bounds, long-text, camera, controller-scroll and normal-render checks pass. No page/shader errors or external requests were observed. All attempts retain their actual hashes and findings under `verification/`; nothing is relabelled as a final pass.

Read [dialogue](DIALOGUE.md), [camera](DIALOGUE-CAMERA.md), [quest tracker](QUEST-TRACKER.md), [story/rules](BLIGHT.md), [voxel model](BLIGHT-WORLD.md) and [painted icon](BLIGHT-ART.md). `BLACKROOT-PATCHKIT.json` records ordered patches, exact source tree and clean replay. Resolve shared `village-game.js`, `village-view.js`, resource catalogues and stylesheet-list conflicts deliberately when merging Claude's newer work.

Important integration details:

- Camera targets actual NPC feet, independently of approach waypoints. Owner billboards update while dialogue/return owns the camera; held movement is released at the handover. Replacement conversations retain the original exploration pose.
- Clearing works with full sample storage and counts fresh work from each quest step's start. Existing furniture at new fungus sockets keeps its saved pose and hides that patch until uncovered; move/Undo preserves both item and patch state.
- Later Copse/Quarry fungus data remains behind the game's existing closed district gates. Current quests are all finishable on the Green; they do not promise access to unfinished districts.
- Existing164 voice recordings remain packaged. New lines are readable dialogue using the existing narration fallback; the exact pending-recording inventory is refreshed (360 script clips,196 pending). No new provider requests were made.
- Phone/Fold/TV sizes and mocked native pad input are software tests, not physical Fold7/TV/Bluetooth or frame-rate certification. Normal screenshots use real rendering. The technical model preview is explicitly an actual-box geometry proof.

The final immutable public receipts are added after publication. Android is packaged last from this exact checked HTML; its native patch and build report stay separate from the browser game.

## Published game receipt

All six public files were retrieved in full and SHA-256/byte-verified at immutable artifact commit `5b4a79e1df6ff68e8cdf20ac136facd987db829d`: [receipt](verification/blackroot-public-game-downloads.json). [Pinned HTML](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/5b4a79e1df6ff68e8cdf20ac136facd987db829d/Pumpkin-Patch-Village-Blackroot.html), [ZIP](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/5b4a79e1df6ff68e8cdf20ac136facd987db829d/Pumpkin-Patch-Village-Blackroot.zip) and [game kit](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/5b4a79e1df6ff68e8cdf20ac136facd987db829d/Pumpkin-Patch-Village-Blackroot-Claude-Patch.zip).

The subsequent native package uses exactly this browser HTML and retains the same media bytes: [Android addendum](ANDROID.md), [native evidence](../../../android/verification/blackroot/release.json). Signature/alignment/CRC and all276 extracted media hashes pass. APK SHA-256 is `6865cf90dcc0cea68213f6ab45cc6c5d5e312dbead38dd1c2188cec84e963b0a` (42,413,038 bytes). Physical hardware remains unverified. Final immutable APK links follow its publication.
