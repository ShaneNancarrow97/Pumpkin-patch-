# Verified game delivery — Village Play Polish

Game source is frozen at `a1965f00630a78366e555c8c9066921bdde9e0db`, tree `51ce02e81431662807faea1c3ceef1b4d0e3ffb8`. The following verification-only commit does not change the generated game.

## Downloads

Published artifact commit: `abea66665f18f04e221d6880ed6af9440735aaa7`.

- [Full offline HTML](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/abea66665f18f04e221d6880ed6af9440735aaa7/Pumpkin-Patch-Village-Play-Polish.html)
- [Game ZIP](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/abea66665f18f04e221d6880ed6af9440735aaa7/Pumpkin-Patch-Village-Play-Polish.zip)
- [Claude game patch kit](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/abea66665f18f04e221d6880ed6af9440735aaa7/Pumpkin-Patch-Village-Play-Polish-Claude-Patch.zip)

All three public downloads were retrieved in full and SHA-256 checked. See [download receipt](verification/download-receipt.json). HTML is 58,258,944 bytes, SHA-256 `bc7d34a08760e36b9e1004a48dae2b63d74b576dcce6622de648c3d3b60cd79e`.

The kit contains three ordered binary patches from `ff6b5803686c449b902d405037f8958d03e3e2d8` through the game code commit. A clean replay recreated the code tree and rebuilt byte-identical HTML. Verification tools/evidence remain on the source branch and are not necessary runtime patches. Review changes against Claude's concurrent code rather than overwriting his checkout. No lead-branch changes were made.

## Evidence and scope

- [961 passing Node tests](verification/release-node-tests.log), zero failures.
- [57 passing gameplay browser checks](verification/final-7514ee49/README.md), zero page/shader errors or external asset requests. Exact intermediate hash is documented; final delta is CSS only.
- [17 passing final CSS/layout checks](verification/final-bc7d34a0/README.md) on the released HTML, including phone, unfolded, desktop and TV layouts.
- [54 passing standard desktop/phone smoke checks](verification/standard-smoke/README.md) on released bytes. This explicit held-draw functional profile keeps simulation/UI real. It is not an FPS benchmark; independent normal-renderer photographs and shader checks cover rendering.
- [Cursor/catalogue DOM checks](verification/cursor-catalogue/), 16/16.
- [Normal-render farm gateway photo](verification/gateway-visual/README.md) on released bytes.
- Eighty farm expansion/service combinations plus gateway cases covered by geometry tests.

Physical Fold 7, TV GPU and Bluetooth controller behaviour require hardware testing; software viewport and mocked Gamepad checks are described honestly. The game remains the same WebGL runtime on Android. APK packaging starts only after the other jobs and this HTML/ZIP delivery are complete, as requested.

## Reproduction

From `voxel/`, run `npm test` and `node build.mjs --out /absolute/path/game.html`. Exact-HTML browser scripts are under `tools/village-play-polish-*.mjs` and `tools/pad-cursor-dom-qa.mjs`; report READMEs give their profiles. The opt-in `SMOKE_HOLD_DRAWS=1` path in `smoke.mjs` leaves normal CI defaults unchanged. The full-barn smoke assertion now checks the intentional disabled Harvest state, then purchases capacity and harvests.

Save format remains version 18. Export/import your save when switching browser origins or to the separate Android app. Existing progression, earned coins, inventory and resource IDs are preserved.
