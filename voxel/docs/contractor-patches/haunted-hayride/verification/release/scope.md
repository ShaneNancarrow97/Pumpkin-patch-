# Pre-integration functional replay — resource warm-up assertion

HTML SHA-256: `155314864110115f42a8249ebddece25c4a6220bad0cb80e03686f1c349d7452`.

This replay passed purchase gates, ticket controls, queue/boarding, once-only payment, paid off-map departure, physical station picking, owner look and input isolation, pause/visibility/explicit Resume, all five cue IDs, completion/replay, phone/landscape controls, Exit and byte-identical farm save/paid ledgers.

It stopped at a resource assertion: renderer geometries changed from 51 to 52 after the first replay/return, with textures unchanged at14. The first tour jumped across scenes, so it had not necessarily uploaded every shared sprite pose. This is unresolved evidence rather than a proven allocation leak. The harness was changed to render both lurking and reveal intervals for every stop and compare a second full warmed cycle against that plateau, still rejecting increasing counts.

The save/reload and paid upgrade tail and post-core visual pass were not reached. `checks.json` remains `passed:false`; no page/console error or external runtime request was observed. A further run on the lead-integrated candidate supersedes this report.
