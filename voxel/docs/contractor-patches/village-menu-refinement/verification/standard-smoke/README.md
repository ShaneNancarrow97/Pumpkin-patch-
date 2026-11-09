# Standard regression — software logic profile

`node smoke.mjs` completed **54/54 checks**, exit code 0, on the unchanged CF0E1290 HTML: SHA-256 `cf0e1290a90410387380717cee0fc64807932e03b1830de8a02c0c2afc56d636`. Desktop 1280×800 and phone 390×844 both passed, with no page errors. Chromium was closed.

Profile: `CHROMIUM_PATH=/usr/bin/chromium SMOKE_HOLD_DRAWS=1`. No `SMOKE_LITE` preferences were applied. Actual RAF, simulation, scene updates and DOM handlers continued; costly software renderer/composer draws were held after boot. This is a logic regression run, not a visual-performance measurement. Normal-renderer photos/shader checks are recorded independently in [the integrated candidate](../final-cf0e1290/README.md).

The environment's Chromium policy blocks `file://` navigation. The initial policy rejection is retained in `file-scheme-policy.log`; its browser closed automatically. A loopback server then served the exact unchanged dist bytes, read once before launch, using the supported `GAME_URL` override. The completed log records the source hash before both profiles. The server and browser were closed normally.

Covered introduction/Skip, original sprite mode, planting/boost/picking, shop/wardrobe/journal, settings character-style switching, private garden and parlour, actual furniture purchase/placement/flip/table support, shop customers and return, costume purchase/equip, full-stock harvest gate, one-tap storage purchase and harvest after expansion, and all five horror visitors advancing walking frames.
