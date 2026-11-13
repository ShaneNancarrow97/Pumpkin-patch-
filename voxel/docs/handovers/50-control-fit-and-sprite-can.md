# 50 — Smaller house framing, right-thumb controls and an illustrated can

Branch: `contractor/life-play`. Incremental base: completed handover 49, `0d55eedb662cf14e988603547592c5c5f97e7c9a`.
Runtime: `ec54f5a36a93edb70eddc58fc87a06274e3c544a`.
HTML SHA-256: `51ba1b6676e8d9ec8540c7ef19b5c38a6c496b1e2a8a6b2b272c7ae01beebd8a`.

This follow-up addresses the player's screenshots and supersedes handover 49's voxel-can and release-to-cancel presentation. Claude remains the lead. No save migration, prices, yields, progression or root 2D code is changed.

## House proportions

The direct-room camera was only 11 units away on phones and 13 on wide screens. It now uses 15 to 16.5 units. A shared framing limit caps direct-room zoom at 1.15 regardless of wheel, pinch or controller input. Recentring returns zoom to 1.

The sprite's indoor lean/stretch now stays at the authored interior values. Tilting the camera previously nearly doubled sprite world height at steep angles while furniture stayed unchanged. Characters now foreshorten with the room instead. Root character scale and furniture sockets are preserved. The conservative projected frame takes about 22% of a phone's height and 20% on Fold/landscape in the reviewed default view.

Switching from a narrow screen to the unfolded view no longer resets the direct-play farm zoom. The normal management-view unfold behaviour remains intact.

## Right-thumb interface

The smaller MOVE/LOOK pads occupy 86–90 pixels. The primary action is a 120 × 68 amber button above LOOK on the right; Tools sits beside it and Centre alongside LOOK. All other touch targets remain at least 44 pixels. The middle of the playfield stays clear.

The large dark block in the screenshot was a real CSS bug: the fixed notification had both top and bottom offsets. It now has one vertical anchor and intrinsic height, capped at 66 pixels and 300 pixels wide. It still disappears after two seconds. Repeated crop notices no longer create a stretched panel.

Controls suppress native text selection, selection callouts and context menus. Short action labels and one outline icon replace duplicated text/floating target pills. The button has immediate pressed feedback, a progress ring and rail, a brief success border pulse, and a clear Finishing state.

## Forgiving hold behaviour

Tap for one use; hold to keep tending suitable nearby crops. Releasing finishes the current use and then stops. Releasing during a walk to the next crop stops that walk. Progress is not thrown away merely because a press lasted longer than the old 220 ms tap threshold. Movement, Back/Circle, menus, pause, character changes and explicit cancellation still cancel unfinished work without a crop transaction. The existing delayed, once-only completion and live crop/barn checks remain authoritative.

## Painted watering can

The brass can is a transparent sprite edited from the established art reference, not a voxel model. Its runtime image is 256 × 184 and 14,330 bytes; preparation source/notes are in [the art folder](../plans/life-play-fit/art/README.md). It is about .82 world units wide, follows the hand, mirrors with the owner and stays camera-facing. The particle socket is at the illustrated nozzle. Base empty-handed water poses and every selected costume keep their own artwork; no costume is exchanged for the base owner.

`createPlayerControl` receives `wateringTexture` from the scene, keeping native rules/control tests free of asset imports. Presentation diagnostics add `waterCanStyle: 'sprite'` and `waterCanWidth`; compatible visibility fields remain. The QA tools now assert the illustrated plane rather than the old 1.65-scale voxel prop.

## Claude integration

Main overlap: `scene.js`, `camera-layout.js`, `player-control.js`, `life-activity.js`, `ui/play-controls.js`/CSS and the home-life help text. Review those against unpublished lead work. The incremental patch is based only on completed handover 49; the source branch includes earlier increments. Do not merge the artifact-only download branch into source.

```sh
git apply --check /path/to/life-play-fit-from-0d55eed.patch
git apply /path/to/life-play-fit-from-0d55eed.patch
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/life-play-fit.html
```

## Verification

89 native test files pass, and final runtime CI is green for both root and voxel jobs, including their builds and smoke runs: [run 40775581716](https://github.com/ShaneNancarrow97/Pumpkin-patch-/actions/runs/40775581716). Eighteen browser checks cover the room projection, zoom/pitch, compact controls/notices, real held-button release, painted can, costume preservation and movement cancellation. Five isolated actual-DOM layouts also pass, including two independent captured touches. These initial browser checks precede only the final one-line unfold-zoom correction; their recorded hash is deliberately separate from the exact release report.

Five checks also pass on the exact final HTML, including phone-to-Fold zoom preservation and the final painted can/house screenshots. Final CI and exact-download verification are recorded in [verification](../contractor-patches/life-play-fit/verification/README.md). The artifact manifest pins the final source commit and HTML/ZIP/patch hashes and the clean-source/applied-patch rebuild results. Physical Fold 7/Bluetooth/controller pairing and device-local HTML opening remain hardware checks; the managed browser's direct file navigation was blocked in handover 49, and no policy bypass is attempted here.
