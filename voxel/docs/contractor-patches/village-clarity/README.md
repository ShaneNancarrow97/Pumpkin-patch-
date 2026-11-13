# Village clarity contractor handover

Based on Claude's `voxel-reference` at **8da66cb93893047d56bad874583f509ba0209d7a**. Work is isolated on `contractor/village-clarity`; inspect/merge that branch without replacing the lead checkout. It includes the lead's Moonclock Square, spread world, bespoke interiors, story scenes, automatic next-chapter following and premium rendering.

This is the approved village interface and interaction pass from handover 75, plus the urgent puzzle repair. It does not implement handover 75's whole future story migration, shape library or secret places.

## What changed

- All 63 authored puzzle controls retain their complete, deterministic choice list. The final hash in the shuffle must be unsigned before modulo: a signed index previously put required choices into negative array properties that the UI could never display. Tests solve every puzzle through its offered controls, including a partial save/reload.
- A resident has one live interaction approach point and a separate camera feet point. The world prompt, activation, People actions and walking guidance resolve the same approach, with inclusive outdoor 3 / indoor 3.3 unit reach and a 0.000001 tolerance. Presence, district access and hall/cave identity remain live transaction checks. People reports the actual district/interior, or honestly identifies a known home when whereabouts are unconfirmed.
- The Map page uses a snapshot of the actual saved voxel world, seen through a slightly tilted orthographic camera. Selectable markers are projected through that same camera, including Moonclock Square, the Crooked Acre, the cave entrance and the followed objective. A Neighbours toggle adds resident markers without crowding the default view. Selecting a destination keeps the village image visible and explains gates and walking guidance inline. Routes guide a walk; they do not teleport or unlock land.
- Village surfaces share scoped plum, cream and amber tokens. Keyboard caps keep explicit contrasting ink through amber focus/hover. Titles and full contextual action names wrap instead of silently losing their identifying text. Touch actions remain on the right; phone, landscape, Fold-sized and TV layouts retain accessible control sizes and reduced motion.
- Quest, chapter and village news share one receipt presenter. Quests keep five seconds, chapters nine seconds of visible reading time; dialogue, menus, gathering, decoration and pause suspend display. Completion cards take priority over routine friendship news. Receipts only describe already awarded events. The farm reminder yields to them. Ordinary farm news coalesces while exploring and only recent news appears on return; one-time restoration, recipe and scrapbook announcements use the shared milestone queue instead of that expiring buffer. Manual action replies and collectible rewards keep their own existing behaviour.

## Dependency matrix

| Change | Shared dependency / affected consumers | Checks and constraints |
|---|---|---|
| Puzzle shuffle | `rules/village-expansion.js`; activity option IDs and authored indices; partial saved puzzle state | Full authored multiset and normal solving for all 63 puzzles; deterministic output; no new IDs or save migration |
| Resident resolver | `village-resident-interaction.js`; rendered folk, `talkSpot`, `spotOf`, spread bounds, hall clearance, gates | Prompt/People/activation/waypoint agree; exact reach; invisible/unknown/gated/other-room residents cannot transact; camera uses feet |
| World snapshot and map | `village-map-snapshot.js`, scene/view surface adapter, `ui/village-map.js`; actual surface models, ground height, Square/Acre, access and resident descriptors | One cached bounded render using the existing renderer; restore visibility/fog/lights/targets in `finally`; markers use the capture projection; no cave-local points plotted on the surface; stale/hidden residents excluded; no per-frame readback |
| Tokens and prompt | `ui/village-tokens.css`, village styles, `village-action-prompt.js`, both CSS build entry points | Scoped to village surfaces; correct real input-family glyphs; readable amber selection; long names; touch/TV/landscape/reduced motion |
| Receipt queue | `ui/village-quest-receipt.js`; `village-game.js` event adapter and busy state | One visible receipt; immutable awarded rows; completion priority; full visible lifetime; no reward transaction or replay on opening |
| Farm news | `main.js`, `ui/deferred-farm-news.js`; village enter/leave, ordinary farm event presentation | At most three recent ambient messages, coalesced by kind, 45-second expiry; unlock messages go to milestone queue; no saved-state or income changes |
| Performance baseline | `tools/village-clarity-perf.mjs`; exact captured HTML, save fixture, route, picture settings, DPR | Same Green → Square → Quarry route on both builds, first and warmed pass, normal renderer. SwiftShader measurements do not certify physical phone/TV performance |

Save version remains **20**. Coins, lifetime earnings, capped banked rank progress, farm stock, progression gates, chapter receipts, quest completion and owned rewards remain under the existing rules. Level 6–20 village checkpoints and the real-time 3½-minute idle break are retained. No world geometry, sprites, lighting pools, runtime dependencies or remote services are added. The map uses a bounded temporary capture target and caches only the resulting image/projection in memory, never in the player's save.

## Verification and delivery

Verification receipts are in [`verification/`](verification/). The final HTML is **60,512,598 bytes**, SHA-256 **4583bcc6840f2e4e721327bdb9c09f94dedae07c1e2d29f0596852ff9ff2fd40**.

- **1,269 tests pass**, including all 63 puzzles through ordinary controls, 49 village controller tests, snapshot projection/cache/restoration and existing save fixtures. No failures or skips.
- **54 compatibility browser checks pass on the exact HTML**. This is the unchanged smoke with draws held for logic checks, not a performance measurement.
- **15 normal-render village browser checks pass** on the immediately preceding runtime: image map, neighbour toggle, gates, People, inclusive Talk boundary, dialogue, workshop, shared receipt/no re-award, and confirmed farm return. The final code only removes the snapshot helper's direct `sync()` call so opening a cave map cannot unhide/move residents; that fix has its own regression.
- **Six normal-render final map checks pass on the exact HTML at DPR 2**, including the full snapshot, markers, neighbour toggle, selected cave detail, cache identity and unchanged save/play camera/render target.
- The **eight-viewport UI fixture** checks phone, small landscape, Fold and TV layouts, all six 44-pixel navigation targets, long action names and 15 actual keyboard-glyph states. Enter contrast is **12.77:1** and the amber action target is **5.92:1**.

Screenshots were inspected under `/tmp/village-clarity-qa` and the UI fixture's temp output, not added as game assets. The snapshot is a structural photograph: transient actors, gathering batches, fine grass and particles are omitted so the play camera's visibility cutouts do not appear in the atlas. The structural geometry and saved restoration/decor state are real; it is not generated concept art.

The performance harness records the exact HTML hash, fixture, preferences, software renderer and measurement limits. Final same-route results are in its verification receipts; compare like-for-like rather than treating them as device FPS. Warm re-entry retains scene animation clocks and may render unrecorded polling frames, so the repeatability claim is the fixture, owner route and picture contract, not bit-for-bit animations or GPU timing. The build retains the lead's existing missing-export warnings for bespoke Baron/Granny home interiors and their existing fallback.

The final route has the same draw-call/triangle quantiles and identical sampled owner positions. Software wall intervals were lower, while the accelerated 18-step RAF callback's CPU time was higher; this is a mixed result, **not a speedup claim**. A next performance pass should profile resident approach clearance and other per-tick work on a normal unaccelerated run before attributing that CPU difference or adding caches that could weaken live interaction checks.

Build with `node build.mjs --out /tmp/Pumpkin-Patch-Village-Clarity.html`. `tools/village-clarity-qa.mjs` reproduces the normal-render feature check; `VILLAGE_QA_DPR=2 VILLAGE_QA_CAPTURE_ONLY=1` limits it to the high-density atlas check. `tools/village-ui-clarity-qa.mjs` runs the lightweight real-view UI fixture. The performance tool accepts its baseline JSON through `--fixture`.

The delivery branch `contractor/village-clarity-html` contains the standalone HTML, a ZIP with `index.html`, README and exact-byte receipt, and links back to this source handover. The older APK is not a build of this pass.

## Next work for Claude

1. Review this branch's UI/interaction foundation against handover 75 before expanding the same surfaces further.
2. Keep the lead's automatic next-chapter follow behaviour; use the shared receipt for completion rather than pinning a finished objective again.
3. Treat B1's single quest-system migration and B2's new story spine as a separate reviewed contract. This pass deliberately preserves current IDs, authored gates and transactions.
4. Reuse these scoped tokens, live resident descriptors, spatial-map inputs and measured route for later story, lighting or geometry work. Add actual device measurements before claiming performance gains on Fold or LG TV hardware.
