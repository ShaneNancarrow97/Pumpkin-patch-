# Full-game expansion playtest

`tools/mothlight-expansion-qa.mjs` refuses to launch without the lead-reviewed standalone HTML SHA:

```sh
MOTHLIGHT_EXPECTED_SHA=<sha256> node tools/mothlight-expansion-qa.mjs \
  /workspace/Pumpkin-Patch-Mothlight-Expansion-Candidate.html \
  docs/contractor-patches/mothlight-full-expansion/verification/browser
```

The runner captures the supplied HTML bytes once and serves those unchanged bytes on loopback. It uses one Chromium with SwiftShader and the existing Playwright installation. Runtime code and the build are not changed by the runner.

Its initial fixture is a declared prepared level6 farm, house1, owned food truck and legacy Two Doorbells completion. The expansion starts fresh. It walks with the real Gamepad input, camera and collision code to complete the first two Copse chapters, then explicitly prepares level7 for the final restoration. Clues, four puzzle types, timed mining, chapter payments, recipe research, cooker output and garden rewards use real world/UI actions. Later prerequisite fixtures are itemised in the report; they are branch samples, not a claimed earned level1–20 campaign.

The JSON report includes the exact HTML SHA, every fixture override, controller routes, failures, external requests and normal screenshots. It deliberately retains failures. Screenshots restore normal renderer/composer calls and real village RAF ticks. Only deterministic logic bursts hold those two drawing calls. Two bounded normal-render samples collect up to60 RAF frames over20 seconds in the cave and Copse; these describe this software environment only.

Viewport and mocked Gamepad checks are useful integration evidence. They do not certify physical Fold7, Bluetooth PS5 or TV hardware performance.

For an isolated rendering investigation, `MOTHLIGHT_QA_MODE=cave-diagnostic` walks a declared level6 fixture to the shallow seam and parks there with normal drawing. The printed loopback-only `/qa/evaluate` endpoint accepts a bounded local JavaScript expression for temporary inspection; `/qa/finish` closes that browser. Diagnostic toggles and pictures belong in a separate folder and do not count as normal acceptance evidence. This endpoint is part of the Node test harness, never the shipped HTML.
