# Pumpkin Patch — Mothlight Couture

[Download full game ZIP](Pumpkin-Patch-Mothlight-Couture.zip?raw=1) · [Standalone HTML](Pumpkin-Patch-Mothlight-Couture.html?raw=1) · [Claude handover](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/248217094354059a35fd9379189e4940d79776b5/voxel/docs/contractor-patches/village-ui-couture/README.md)

A complete village UI pass: plum parchment and gilt frames, illustrated resident cards, clearer journal and dialogue, organised inventory/workshop/trading, polished map and decorating controls. Canonical stories, rewards, prices, requirements, purchases and save version 20 are preserved. Controller prompts name the focused action.

1,489 tests pass. Exact-HTML verification is separated into 7 native-render hero checks and 81 broad UI/controller checks with world draws explicitly held. The independent source rebuild is byte-identical. The ZIP includes the full offline game, Claude handover, verification, three native-render previews and one clearly labelled UI-only stall preview. Rendering is unchanged from e99cd6e: village WebGPU capability selection with WebGL fallback; farm, house, rides and map use WebGL. This UI release is checked with actual software WebGL, not a new WebGPU/device performance certification. No APK was rebuilt.

[Exact-byte receipt](Pumpkin-Patch-Mothlight-Couture-Receipt.json). Source `248217094354059a35fd9379189e4940d79776b5`; frozen runtime `6f6666a015666cdb15d3cde4dde2dadff0788ae9` on `contractor/village-ui-couture`. Export/import saves in Settings when changing browser/file origins.

---

# Pumpkin Patch — Mothlight WebGPU

[Download full game ZIP](Pumpkin-Patch-Mothlight-WebGPU.zip?raw=1) · [Standalone HTML](Pumpkin-Patch-Mothlight-WebGPU.html?raw=1) · [Claude handover](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/e99cd6e84d409e318392db2019d407487abba4ee/voxel/docs/contractor-patches/village-webgpu/README.md)

The village automatically uses genuine WebGPU where the browser and adapter support it, with a working WebGL fallback. Neighbour-based voxel ambient occlusion, shared albedo/normal/ORM atlases, custom node shaders and HDR post-processing preserve the instanced world. The detailed dusk gateway, plum-and-brass journal and dialogue interface remain HTML/CSS.

The farm, house, rides and canonical village map capture retain WebGL. Save version 20, quests, rewards and economy stay compatible. Export/import in Settings when moving between file/browser origins. Local file/content URLs may use WebGL when WebGPU is unavailable.

1,483 tests pass, along with 20 exact-final-HTML WebGPU checks, 11 WebGL checks and 54 compatibility checks. The source rebuild is byte-identical. The ZIP includes the full index.html, both Claude handovers, exact verification and labelled preview provenance. Software GPU and injected controller checks do not certify physical device performance. The three older fidelity-checkpoint dialogue previews are explicitly labelled; no APK was rebuilt.

[Exact-byte receipt](Pumpkin-Patch-Mothlight-WebGPU-Receipt.json). Source `e99cd6e84d409e318392db2019d407487abba4ee`; compiled runtime `b1915b64c111b4085a91997e7a35208bb3565813` on `contractor/village-webgpu`.

---

# Pumpkin Patch — Mothlight After Dark

[Download full game ZIP](Pumpkin-Patch-Mothlight-After-Dark.zip?raw=1) · [Standalone HTML](Pumpkin-Patch-Mothlight-After-Dark.html?raw=1) · [Claude handover](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/bebcb1910a1794db70d7c2c91c67550603119739/voxel/docs/contractor-patches/village-atmosphere/README.md)

The Quarry stairs are clear of terrain, and all seven expansion home entries align with the spread world. Granny and the Baron have bespoke interiors; Granny’s cottage has detailed windows and closed attic gables. District/time palettes, subtle ripple water and soft contact shadows make the village feel more alive.

A unified journal keeps the followed task above folded story details. HUD, map and live routes stay together, partial gathering retargets supplies, and ready parallel handovers are offered correctly. Both authoritative quest engines, all 77 story IDs, economy, district gates, all 676 resource positions and save version 20 remain compatible. The Stopped Hour spine/index are proposals for Claude’s review.

1,370 tests, 15 world checks on the rendering candidate, 17 UI/controller checks across scoped builds and 54 compatibility checks pass. The ZIP contains index.html, handover, exact verification and before/after previews. [Exact-byte receipt](Pumpkin-Patch-Mothlight-After-Dark-Receipt.json). The older APK below is not updated.

Source `bebcb1910a1794db70d7c2c91c67550603119739` on `contractor/village-atmosphere`, based on `4ac1572`. Export/import through Settings when moving a farm between browser/file origins.

---

## Previous release — Village Refined

[Download game ZIP](Pumpkin-Patch-Garden-Refinements.zip?raw=1) · [Standalone HTML](Pumpkin-Patch-Garden-Refinements.html?raw=1) · [Claude handover](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/4ac1572f05e0db7a5858316c5ecb7bb083595461/voxel/docs/contractor-patches/village-refinement/README.md) · [Review PR](https://github.com/ShaneNancarrow97/Pumpkin-patch-/pull/3)

Explore five named garden places through clear walking guides. Native tree crowns and the pavilion roof now fade individually when they block your character, and the short grass has finer proportions. Nearby Talk prompts avoid unnecessary distant clearance checks while retaining canonical interaction results.

Save version 20, all 676 resource positions and the existing economy/progression remain compatible. 1,305 tests, 20 normal-render checks and 54 compatibility checks pass. [Exact-byte receipt](Pumpkin-Patch-Garden-Refinements-Receipt.json). The ZIP includes index.html, the Claude handover, verification and actual game previews. The older APK below is not updated.

Source `4ac1572f05e0db7a5858316c5ecb7bb083595461` on `contractor/village-clarity`. Export/import through Settings when moving a farm between browser/file origins.

---

## Previous release — Living Mothlight

[Download game ZIP](Pumpkin-Patch-Living-Village.zip?raw=1) · [Standalone HTML](Pumpkin-Patch-Living-Village.html?raw=1) · [Claude handover](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/96b40832a0d29229820526d2761d27b170f3bf02/voxel/docs/contractor-patches/village-cohesion/README.md) · [Review PR](https://github.com/ShaneNancarrow97/Pumpkin-patch-/pull/3)

The village's open lawns are now connected orchard and garden neighbourhoods:28 fruit trees, pumpkin and herb beds, a roofed lantern pavilion, picnic areas, Elowen's reading court, Rowan's workyard and planted meadow edges. Walk the full eastern town park; quiet cosmetic visitors share the garden paths. The atlas captures this actual scenery.

22 clusters use three scenery meshes and no additional lights. All676 gathering positions, district gates and existing owned decoration remain compatible; save version20. Full suite1282 passes, final affected checks26 pass, and the exact HTML passes eight normal-render village checks plus54 compatibility checks. [Exact-byte receipt](Pumpkin-Patch-Living-Village-Receipt.json).

The ZIP includes index.html, handover, verification and actual world/ground-level previews. Source `96b40832a0d29229820526d2761d27b170f3bf02` on `contractor/village-clarity`. Export/import through Settings to move an old farm between browser/file origins. The older APK below predates this update.

---

## Previous release — voxel world atlas and village clarity

[Download HTML](Pumpkin-Patch-Village-Clarity.html?raw=1) · [Download ZIP](Pumpkin-Patch-Village-Clarity.zip?raw=1) · [Claude handover](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/ac16208b9dcdf4d0d22da67c8b0b2aab6c968487/voxel/docs/contractor-patches/village-clarity/README.md) · [Review PR](https://github.com/ShaneNancarrow97/Pumpkin-patch-/pull/3)

A snapshot of the actual saved voxel village, tilted gently away, with selectable markers and inline unlock requirements. Neighbour pins are optional. Includes clearer purple menus and button legends, consistent Talk/guidance anchors, truthful resident locations, shared completion notices and the puzzle-choice repair.

1,269 tests and54 exact-build compatibility checks pass, plus final DPR2 map checks and an eight-viewport UI review. The ZIP contains index.html, a Claude handover, verification receipts and actual map preview images. [Exact-byte receipt](Pumpkin-Patch-Village-Clarity-Receipt.json).

Source `ac16208b9dcdf4d0d22da67c8b0b2aab6c968487` on `contractor/village-clarity`, based on Claude's `8da66cb`. Save version20; export/import through Settings to move an existing farm between browser/file origins. The older APK below predates this update.

---

## Previous release — idle pause and quest pin fix

[Download latest HTML](Pumpkin-Patch-Idle-Pause.html?raw=1) · [Download latest ZIP](Pumpkin-Patch-Idle-Pause.zip?raw=1) · [Claude handover](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/2df1b9b0d6db593ed905f8a586df745b23ec8358/voxel/docs/contractor-patches/mothlight-full-expansion/IDLE-PAUSE.md) · [Quest pin fix](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/2df1b9b0d6db593ed905f8a586df745b23ec8358/voxel/docs/contractor-patches/mothlight-full-expansion/PINNED-QUEST-FIX.md)

Automatic tea break after3½ minutes without input, with a final30-second countdown. Touch, keyboard or controller activity keeps play active and resumes an automatic break; manual pauses stay manual. Both owner ride POVs and the village follow the same break.

Completed village chapters now unpin, their routes/details clear, and stale pins in older saves and UI preferences are repaired. Progress and rewards remain in the journal archive. Includes all earlier balanced progression and village additions. Save version remains20.

1,210 tests,54 standard browser checks,28 feature checks and four focused Rowan workshop checks pass. [Exact build receipt](Pumpkin-Patch-Idle-Pause-Receipt.json). Source: `2df1b9b0d6db593ed905f8a586df745b23ec8358` on `contractor/mothlight-full-expansion`. Extract the ZIP and open index.html, or use the standalone HTML. The older APK below predates these HTML follow-ups.

## Previous balanced progression release

[Download latest HTML](Pumpkin-Patch-Balanced-Progression.html?raw=1) · [Download latest ZIP](Pumpkin-Patch-Balanced-Progression.zip?raw=1) · [Claude balance handover](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/c5a65f610a5a0c03e2973831881bb6a3965cc6bf/voxel/docs/contractor-patches/mothlight-full-expansion/BALANCED-PROGRESSION.md)

All sales still pay full coins. From the village progression stretch, level progress banks the next rank plus a 25% head start on the one after; later ranks need fresh trade as well as the mainline village story. Existing money, lifetime earnings and already earned ranks are retained. Save version20.

This includes the full Mothlight expansion, grass/journal refinements, compact Skyla display chooser and mandatory village checkpoints for levels6–20. 1,197 tests,54 standard browser smoke checks and15 exact-build browser checks pass. Extract the ZIP and open index.html, or open the standalone HTML.

Source commit: `c5a65f610a5a0c03e2973831881bb6a3965cc6bf` on `contractor/mothlight-full-expansion`. Exact download hashes are in [the receipt](Pumpkin-Patch-Balanced-Progression-Receipt.json). The older APK below predates these HTML follow-ups.

## Original expansion and native release

[Download HTML](Pumpkin-Patch-Mothlight-Expansion.html?raw=1) · [Download game ZIP](Pumpkin-Patch-Mothlight-Expansion.zip?raw=1) · [Claude source patch kit](Pumpkin-Patch-Mothlight-Expansion-Claude-Patch.zip?raw=1) · [Android APK](Pumpkin-Patch-Mothlight-Expansion.apk?raw=1) · [Claude Android addendum](Pumpkin-Patch-Mothlight-Expansion-Android-Patch.zip?raw=1)

[Cave view](Mothlight-Cave-Fold.png) · [Granny’s cottage](Mothlight-Granny-Cottage.png) · [TV dialogue](Mothlight-Dialogue-TV.png)

A connected village restoration story through farm level20: Moonroot Copse, Lantern Quarry, Carnival Moor, Mirror Marsh, three descending cave layers, and Granny Brambletooth’s house inside the Crooked Acre scarecrow maze. Nine neighbours, personal stories, different puzzle types and companion gathering help bring useful rewards back to the farm.

Grow herbs, make preservation wax at a real cooker, install cold storage, cook two new dishes and deliver actual food commissions. Bring home six voxel keepsakes and save paired outfits. The final Lantern Night supper uses real pumpkins and cooked food. Existing farms, inventories and claimed levels are preserved through additive save19 migration.

Open the HTML directly, or extract the game ZIP and open index.html. All game assets,31 songs and164 existing voice recordings are embedded. New dialogue has complete captions;396 recording requests remain pending. No internet connection is needed for play.

To bring your existing farm across browser/file origins or into Android, export it in Settings, then import the saved file in the new game. Controller and touch modes use the normal game settings. The source patch kit contains ordered patches, an exact base and a dependency-aware Claude handover; it does not contain your save or any credentials.

[Claude handover](https://github.com/ShaneNancarrow97/Pumpkin-patch-/blob/contractor/mothlight-full-expansion/voxel/docs/contractor-patches/mothlight-full-expansion/README.md). The delivery manifest records exact hashes, tests and the checked release. Browser viewport and injected controller checks do not certify physical Fold7, Bluetooth or Android performance.

Earlier releases remain available under their original filenames and pinned commits.

Android version2026.11.09.2 was built last from this same HTML. It retains the previous signing identity and locally packages280 media assets, reducing HTML parsing by92.0888%. Signature/alignment/CRC/media checks and17 native/extraction tests pass. This is an offline WebView/WebGL2 host; physical hardware performance is not certified.
