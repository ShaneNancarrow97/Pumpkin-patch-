# Full standalone village play polish verification

2026-11-08: **57/57 browser checks passed**, with **zero browser/shader errors** and **zero external asset requests**. Chromium was closed after completion.

- HTML: `/workspace/Pumpkin-Patch-Village-Play-Polish.html` at test time, 58,258,926 bytes.
- SHA-256: `7514ee4994efecc707b13510e9273cd6e5ab53984774126bf041544b6386351a`.
- Source commit: `07c3eb8caf36de2eee27d81820de066ce8ce8732`, with declared working-tree state and individual source hashes in the JSON.
- Runner: `tools/village-play-polish-qa.mjs`.
- Detailed result: [village-play-polish-report.json](village-play-polish-report.json).

## Coverage

The actual mocked standard Gamepad API drives closer third-person follow, independent orbit and R3 recentering; the six illustrated hotbar actions and Options hub; five-district spatial map and visible lock requirements; tree visibility, footlight, restrained NPC rim and quest/resource rings; actual gathering and page collection; walk-to-neighbour conversation and quest journal; phone, unfolded, landscape and TV/controller layout.

Travel checks include actual Cross at the carriage, Farm click, Circle, walking through the return threshold, continued farm rendering, normal farm simulation/music restoration and working farm planting. Farm R3 pan/zoom keeps the owner stationary. Actual management Village hotbar, Farm Options hub and traversal through the authored physical gateway all pass. The home catalogue exposes 18 illustrated categories, five room tabs and four owned filters. House and village Build legends fit and display clear PS5 glyphs. Cosmetic village roamers remain bounded to three.

## Visual review

All three normal-renderer screenshots were inspected:

- [Closer village](01-closer-village.png): camera stays behind the owner at rest, warm subtle footlight, compact legend separated from the illustrated hotbar, clear central world. The base idle direction uses the existing frozen contact frame; this is not new neutral idle artwork.
- [House Build](04-build-house.png): clear plum surface and amber Done. More wraps onto a second row at this exact hash. A subsequent CSS-only candidate addresses that width; see the separate delta evidence.
- [Village Build](04-build-village.png): compact lower-right placement card, readable cream text, clear amber Place, deliberate hint wrapping inside the card.

Earlier candidate `963871c2` map/dialogue screenshots were also inspected and show the same UI before the final idle-facing flag. They are not relabelled as this exact final hash. That earlier run had two fixture failures (frame pacing expectation and stale gateway coordinates), corrected in this run; its result is not claimed as a pass.

## Method and limits

The standalone HTML bytes were served unchanged over loopback. A declared level-20, 30k-coin, finished-tour, gathering-enabled fixture avoids earning the entire progression. Initial diagnostic entry is isolated from separately verified real hotbar and physical-gateway entry. Functional phases hold only renderer/composer draw calls while real controller/model/view code advances in 0.05-second steps; normal draws are restored for photos and shader checks. This is headless Chromium with software WebGL.

Viewport emulation is not physical Z Fold testing. Gamepad API mocking is not certification of PS5 Bluetooth pairing, TV mirroring or hardware performance. TV geometry uses the production TV mode with declared zoom. Audio mix state is checked; sound quality is not auditioned. A CSS-only rebuilt deliverable has its own exact-hash delta report; this report remains specific to the bytes above.
