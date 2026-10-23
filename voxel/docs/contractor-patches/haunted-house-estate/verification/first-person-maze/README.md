# First-person maze verification

Integrated on Claude’s ac698dc. Runtime 3c10605 followed by darker atmosphere and close-camera staging 0dd25ce. The root 2D game and upstream model/rules/placement/pathing files are unchanged.

- node-tests.log: all 49 Node test files pass on the final darker runtime (including all lead freshness/orders/riders tests).
- full-flow-before-atmosphere/:71 browser checks pass on integrated build SHA-256 76434de1a4dac6223deb7018a73676e1ed5c8769ede20d6fc25766f35d86ad70, before the later visual atmosphere/approach refinement. Covers all five tiers, ownership, door picking, touch, audio, pause, visibility, replay and return, one canvas and bounded resources and unchanged farm JSON with an actual charged guest.
- final-focused-sharp/: final-build UI/input and close-reveal checks at Sharp, DPR 2, bloom, shadows, FXAA; includes live farm independence, modal focus and 44px targets in phone/landscape/Fold sizes. Snapshot freezes at cue +1.35 seconds and hides only the pause shade for deterministic art inspection; metadata records that intervention. Scare distance is checked against the camera, not inferred from art.
- patch-rebuild.json: binary patch application and byte-identical rebuild from clean lead base; final HTML hash ee06c643160dc1bd1b0eda9ac654d9a3f892f158e72282d19952b57ff3d63352.

The earlier visual attempt used DPR 1 while its assertion expected2; the corrected final run explicitly emulates DPR 2. This was a harness setup correction. Only the passing final run is included. Browser reports record no external runtime requests and no page/console errors.

Software Chromium WebGL establishes rendering, logic and layout. It is not a physical Fold 7 FPS measurement. Normal game smoke results are recorded in the release handover after that run completes.
