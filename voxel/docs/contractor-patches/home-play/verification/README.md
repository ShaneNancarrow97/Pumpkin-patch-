# Home and hands-on play verification

- Runtime: `6a6fe2bf1bb226489eebb882c2d535614b8165cd`.
- HTML: `e21570c0f1ce2741d960c5cc0aa608d62622053ba2e1fd751f3c7d68823ff97a`.
- `ci.json`: both jobs pass, including all 84 test files, build and desktop/phone smoke. The local Node log predates the final two litter-boundary regression cases; CI includes those cases as well.
- `browser`: successful 44-check flow on its own immutable build, before the final viewport-sized radial wrapper adjustment. Actual keys, thumbstick pointers, crop transactions, physical rack, pet rendering, litter/Hettie purchase, furniture, responsive layouts and emulated DualSense are exercised.
- `release`: 18-check final targeted input/layout/Skyla pass on the exact downloadable HTML. Its report identifies its own hash and individual assertions.
- Reports describe different builds deliberately. Do not treat all assertions as runs on one hash.
- The download manifest records the independent clean committed-source and applied-patch rebuild checks and artifact checksums.

Fixtures are injected into QA browser storage only. The game file retains normal starting conditions. Managed Chromium serves the identical offline HTML over loopback. No physical PS5 controller, Bluetooth pairing, Fold 7 hardware or native OS fullscreen claim is made by these tests.
