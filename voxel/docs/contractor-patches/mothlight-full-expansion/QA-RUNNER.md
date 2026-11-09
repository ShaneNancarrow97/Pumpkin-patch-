# Full-game expansion playtest

The canonical standalone is `/workspace/Pumpkin-Patch-Mothlight-Expansion.html`, 60,328,415 bytes, SHA256 `ab6ac3af9f1a2024693952d6fd987a7ad2473fad622785473022271f1c7ad1a6`.

The [full integration report](verification/final-acceptance/mothlight-expansion-report.json) passes **103 checks with no runtime errors** against those exact bytes, with 20 fresh normal-render photographs. The [focused TV dialogue report](verification/final-acceptance/tv-dialogue/mothlight-expansion-report.json) passes another **4 checks**, including a genuinely open nearby Corvus conversation and fresh controller menu input afterwards. Its [normal dialogue photograph](verification/final-acceptance/tv-dialogue/21-tv-corvus-dialogue-controller.png) shows the actual PS5 prompts. Full-run photo13 is honestly labelled a carnival approach.

Run the full journey with the reviewed artifact hash:

```sh
MOTHLIGHT_EXPECTED_SHA=ab6ac3af9f1a2024693952d6fd987a7ad2473fad622785473022271f1c7ad1a6 \
  node tools/mothlight-expansion-qa.mjs \
  /workspace/Pumpkin-Patch-Mothlight-Expansion.html \
  docs/contractor-patches/mothlight-full-expansion/verification/final-acceptance
```

The runner validates the hash before launching and serves the captured HTML buffer unchanged over loopback. It uses one Chromium with SwiftShader and the existing Playwright installation. Runtime code and the build are not changed. The process needs permission to bind its loopback listener.

The initial fixture is a declared prepared level 6 farm, house 1, owned food truck, four butter and legacy Two Doorbells completion. Its expansion starts fresh. Real Gamepad walking, camera and collision code complete both level 6 Copse chapters, including the guaranteed quest crystal. Level 7 is explicitly prepared for final restoration. Rewards are used in the actual wardrobe, home catalogue, garden controls and cooker. The save19 reload preserves rewards, puzzle choices, receipts and mining cooldowns. Later level/prerequisite fixtures are itemised; this is not a claimed earned level 1–20 campaign.

Coverage includes all four live puzzle widgets, the level 8 Granny house, three cave layers and locked routes, actual festival consumption of twelve unreserved pumpkins and four cooked portions, final Lantern Night, completed quest tracking, both painted dish menus and actual three-portion cooking outputs. Return checks use held Circle, fresh Circle cancellation and a real walking crossing before Cross confirms the farm transition.

Branch reloads use a one-shot `window.name` bootstrap before the next game module. Writing localStorage before reload is insufficient: the outgoing pagehide autosave can overwrite it. Every declared branch now asserts its actual loaded level and discovery flags. Door/resident checks derive their real interaction positions.

Screenshots restore normal renderer/composer calls and real village RAF ticks. Only deterministic logic bursts hold those two drawing calls. Each photo records camera, actor ground, area, cave mesh bounds and lights. Two bounded normal-render samples collect up to 60 RAF frames over 20 seconds in cave/Copse. Their software timings are retained and do not establish device FPS. Renderer counters describe the final fullscreen composer pass, rather than total world geometry.

Viewports are 864×756, 390×844 and 1920×1080 with the actual TV profile. A mocked standard Gamepad exercises real controls. These checks do not certify physical Fold7, Bluetooth PS5 or TV hardware performance.

`MOTHLIGHT_QA_MODE=tv-dialogue` runs the focused level12 Corvus branch. For isolated rendering investigations, `MOTHLIGHT_QA_MODE=cave-diagnostic` walks a declared level6 fixture to the shallow seam and parks with normal drawing. Its loopback `/qa/evaluate` endpoint accepts bounded local expressions; `/qa/finish` closes that browser. This endpoint belongs to the Node harness, never the shipped HTML. Diagnostic toggles remain separate. Earlier failed/interrupted candidate evidence is retained locally under `/workspace/mothlight-expansion-diagnostics/`, outside the release kit.

The requested direct-file standard smoke is retained in [standard-smoke-file-url-blocked.txt](verification/final-acceptance/standard-smoke-file-url-blocked.txt): managed Chromium rejects `file://` with `ERR_BLOCKED_BY_ADMINISTRATOR`. `tools/mothlight-standard-smoke.mjs` validates the same SHA and runs the unmodified `smoke.mjs` against identical loopback bytes, with drawing held for logic compatibility. All **54 desktop/phone checks pass**, with no page errors. Its [receipt](verification/final-acceptance/standard-smoke-logic.txt) remains separate from normal visual evidence. The canonical file hash was rechecked unchanged after all browsers closed.
