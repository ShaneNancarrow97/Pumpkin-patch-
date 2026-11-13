# Required standard desktop/phone regression

**54/54 checks passed**, exit 0, no page errors. Exact standalone HTML SHA-256: `bc7d34a08760e36b9e1004a48dae2b63d74b576dcce6622de648c3d3b60cd79e` (58,258,944 bytes).

```sh
SMOKE_LITE=1 SMOKE_HOLD_DRAWS=1 CHROMIUM_PATH=/usr/bin/chromium \
node tools/village-journey-smoke.mjs /workspace/Pumpkin-Patch-Village-Play-Polish.html \
docs/contractor-patches/village-play-polish/verification/standard-smoke
```

The required stock `smoke.mjs` covers desktop 1280×800 and phone 390×844: new-game introduction and Skip, sprites/voxel style switching, plant/boost/harvest, menus, garden/house, furniture buying/flip/placement, indoor customers, wardrobe purchase, stock cap/storage expansion and five animated visitors. The full-barn case now asserts the legitimately disabled Harvest control and retained ripe crop rather than trying to click it. Buying storage then enables a real harvest again.

This run uses the explicit CPU-only regression profile: `SMOKE_LITE=1` disables glow/shadows/music, and `SMOKE_HOLD_DRAWS=1` holds only renderer/composer draw methods after the initial ready state. Real RAF, frame pacing, scene/model updates, UI handlers and sprite frame state continue. The exact served HTML is unchanged. This is functional regression evidence, not hardware-performance or rendering certification.

Normal-renderer screenshots and shader checks were independently completed in [the full gameplay evidence](../final-7514ee49/README.md) and [final CSS delta](../final-bc7d34a0/README.md). No extra standard-smoke screenshots were requested. The earlier slow normal-render attempt was intentionally stopped after ten passing checks and is preserved separately in `../standard-smoke-initial-normal/`.

See [smoke-report.json](smoke-report.json) and [smoke.log](smoke.log). Chromium was closed after completion.
