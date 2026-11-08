# Village Journey browser verification

`tools/village-journey-qa.mjs` serves the exact supplied standalone HTML bytes on loopback and drives one headless Chromium using software WebGL. Reports distinguish actual pointer/keyboard controls, accelerated controller routes, declared save fixtures, held gather clocks and viewport emulation. Screenshots use the normal renderer and preferences, with audio muted.

## Interim candidate `21e7270`

The files in `candidate-21e7270/` apply to SHA-256 `21e7270c572d9cdc6f2abae9eb9a27681d9d656841e93f81988e7320a375d3cb`, before the later request for smaller resources and changed respawn locations.

- The initial core run passed all 25 assertions before a harness error called an obsolete, nonexistent `plots` sheet. Its raw error and failure screenshot are preserved. This is not a product failure: the actual Seeds tab is the supported route.
- The corrected `--late-only` continuation passed all 19 assertions, including the actual Seeds tab, wardrobe gate, HD house idle, library rendering and responsive docks at 390×844, 864×756 and 844×390.
- These runs do not claim physical phone/Fold/controller/TV testing, GPU performance testing or progress earned in ordinary play.
- Standard smoke was held pending the next build containing the resource changes.

Final candidate results will be recorded separately by their exact HTML hash.

## Functional revision candidate `018ca02d`

`candidate-018ca02d/village-journey-report.json` records **66/66 passing browser assertions**, no browser errors and no external asset requests for SHA-256 `018ca02d3056ec58e2219173970992f9e101f9762fdb2ac3fc9734a8f0e7a62c`.

This revision verifies small individual resources, matching rendered/hitbox positions, exactly-once gathering and saved cycles, automatic relocation after actual `advance(241)` cooldown progression without an explicit QA scene sync, stable positions through an actual page reload, and another successful gather at a relocated resource. It also checks actual Farm-button return at the physical gateway, staying on the farm across live frames, rearming by walking outside and reentering.

Actual touch and T-key quest toggles pass; a mocked standard gamepad confirms one D-pad-Up toggle per press and menu priority. Expanded quest/rate/dock rectangles do not overlap at phone, unfolded and landscape sizes. At unfolded/landscape sizes the expanded quest also stays clear of the actual open Map panel; phone panels hide the quest card. The phone and unfolded expanded-HUD screenshots and both tool/resource screenshots were visually inspected.

This is the functional revision candidate. Final walking-art verification and the standard smoke run remain separate pending the final rebuilt artifact.
