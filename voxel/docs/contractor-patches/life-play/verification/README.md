# Verification scopes

`browser/checks.json` records 31 successful full-flow checks against HTML SHA-256 `67718dcf305aa723d53444cc0a614dee128322c372ed72031abb181c67cc03a2`. It exercises delayed planting, cancellation, watering, harvesting, movement/camera controls, emulated DualSense input, home interactions and desktop/phone/landscape/Fold layout. This flow preceded the final sprite packing/stature correction and equipped-atlas warming. Its recorded hash intentionally differs from the downloadable release.

`release/checks.json` is the focused exact-download check, including simultaneous CDP touch pointers, every equipped walking look, the final water/pet presentation, the fourth orbit side and compact radial layouts. Both reports leave the offline HTML unmodified; money/unlocks are staged in browser storage only. Screenshots are reviewed visually in addition to their diagnostic assertions.

`node-tests.txt` contains the 89-file native test run. The subsequent equipped-atlas warming change also passes the three relevant direction/side-walk/control test files. CI identifies the final runtime commit and runs the complete test/build/smoke workflows.

Physical PS5 Bluetooth pairing, hardware Fold 7 fullscreen/rotation behaviour and mobile GPU frame times are not verified by browser automation.

A direct `file://` launch was also attempted in fresh browser storage. The managed Chromium policy returned `ERR_BLOCKED_BY_ADMINISTRATOR` before navigation, so no successful local-file or hardware run is claimed; see `offline/checks.json`. The exact standalone HTML passed the HTTP release flow with zero external runtime asset requests. Do not bypass browser policy to turn this into a passing test.
