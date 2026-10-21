# Verification record

Game-source head: `fa6056a`, contractor branch. User artifact: `Pumpkin-Patch-Shocktober-Premium.html`, SHA-256 `22df952009e152667d9a5c9aa6d30ef3ec3593b115e1adee8921a6a2ab0c2f55`.

## Automated rules and art

`unit-tests.txt`: all **29 Node test files passed**. The suite includes Claude's published shelf/visitor-balance checks and the new estate, foyer, controllers, colours, capacity and visitor-roster cases. `hollow-rules-direct.txt` records all 11 named attraction-rule cases passing, including saved paid visits, expansion mounting and the timed west-to-shop transfer. `storage-and-visitors-direct.txt` records the four new storage/crowd/roster cases passing. There are no added runtime dependencies.

## Browser checks and build coverage

- **Estate: 35/35**, no page/console errors. `estate-checks.json` ran against `Pumpkin-Patch-Haunted-Homestead-Latest.html` (SHA-256 `48b21a41020a098cd1891ec2537dcdc8e91117f86b7a510cd1f618bbc57bec98`). This includes the corrected central arch, Claude's published shop/fixture work, orbit/pan, paid house/grounds/finishes, reversible placement, inventory and save/load. It predates the added barn/visitor content, final farm framing and management menu titles; the estate implementation itself is unchanged.
- **Foyer: 26/26**, no page/console errors. `hollow-checks.json` ran against `Pumpkin-Patch-Haunted-Homestead-Final.html` (SHA-256 `b0b5ee5b3c524477b0b33a3cb10857dbd9e6667a6cf4149163ad9c4d4159107a`). This includes the corrected old-house maze site, west routes, new visitor sheet and barn/crowd rules, restoration, one-charge ticket ledgers, paid decor, Undo/Done, side-wall hanging, all five tiers, surfaces, responsive layouts and exact saved foyer/accounting. Subsequent product changes are a defensive unknown-visitor fallback, wider farm overview framing and clearer management titles/occupancy; foyer gameplay is unchanged.
- **Desktop core smoke: 20/20**, no page errors, on the pre-icon polished artifact (`31f0960444dd494957c6e8116e97b85686ceb56ecf64bdacf496c12bb1703258`). `desktop-core-smoke.txt` includes planting/boosting/harvest, menus, sprite/voxel switch, the new garden→existing parlour journey, furniture buy/flip/Done, indoor shoppers, outfits, full-barn recovery through a real storage purchase and all five new walking visitors. The run was stopped after the complete desktop pass to test the final icon build directly. Its full phone regression sequence was not completed and is not counted as a pass.
- **Final premium UI / visitor smoke: 13/13**, no page or console errors. `premium-ui-checks.json` and `premium-ui-smoke.txt` verify the exact delivered premium artifact: thirty generated icons, navigation, management titles, all five new walking actors and phone/Fold/landscape layouts.

The browser is Chromium with SwiftShader software WebGL. Functional estate/foyer checks use bloom/shadows off, followed by Fold screenshots with both on. Core smoke can use `SMOKE_LITE=1` to avoid expensive software postprocessing; this does not change the delivered game's default graphics. The earlier full-graphics development smoke was stopped to run the final polished file instead. No interrupted run is counted as a pass.

The money and level staging in these scripts is only for reaching expensive content quickly. These are not natural-play progression measurements. Viewports: desktop 1280×800, phone 390×844, unfolded Fold-sized 874×787 and landscape 844×390. No physical Z Fold 7 or iOS certification is claimed. Real device GPU/audio/fullscreen policies still apply.

## Historical balance review

`gameplay-baseline.json` and `review-baseline.mjs` correspond only to `ede512b`. Claude's newer `dd97819` balance was subsequently merged, then the user specifically requested a hard stock gate and dedicated capacity progression. Do not cite the old numbers as measurements of the final game. Reproduction commands and conclusions are in handover 11.
