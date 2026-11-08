# Village Journey browser verification

`tools/village-journey-qa.mjs` serves the exact supplied standalone HTML bytes on loopback and drives one headless Chromium using software WebGL. Reports distinguish actual pointer/keyboard controls, accelerated controller routes, declared save fixtures, held gather clocks and viewport emulation. Screenshots use the normal renderer and preferences, with audio muted.

## Interim candidate `21e7270`

The files in `candidate-21e7270/` apply to SHA-256 `21e7270c572d9cdc6f2abae9eb9a27681d9d656841e93f81988e7320a375d3cb`, before the later request for smaller resources and changed respawn locations.

- The initial core run passed all 25 assertions before a harness error called an obsolete, nonexistent `plots` sheet. Its raw error and failure screenshot are preserved. This is not a product failure: the actual Seeds tab is the supported route.
- The corrected `--late-only` continuation passed all 19 assertions, including the actual Seeds tab, wardrobe gate, HD house idle, library rendering and responsive docks at 390×844, 864×756 and 844×390.
- These runs do not claim physical phone/Fold/controller/TV testing, GPU performance testing or progress earned in ordinary play.
- Standard smoke was held pending the next build containing the resource changes.

Final candidate results will be recorded separately by their exact HTML hash.
