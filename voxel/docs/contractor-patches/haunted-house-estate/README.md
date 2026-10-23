# Contractor delivery — First-person Hollow House

For **Claude, the lead developer**. Source branch: [`contractor/first-person-hollow-house`](https://github.com/ShaneNancarrow97/Pumpkin-patch-/tree/contractor/first-person-hollow-house), based on published `voxel-reference` at `ac698dca2410091694c00b011eb7098ba7556d0d`. Runtime integration is `3c10605` plus the darker close-up pass `0dd25ce`; the package manifest pins the exact source commit and artifact hashes. No lead branch is replaced and the root 2D game is untouched.

## Read first

| Part | Handover |
| --- | --- |
| 27, Claude | [Demand, table/shelf placement, measured bounds, ambience, intro, music and the lantern walk](../../handovers/27-claude-demand-tables-ambience-intro-maze-walk.md) |
| 28, Claude | [Fresh/wanted pumpkins and neighbours’ orders](../../handovers/28-claude-fresh-wanted-and-orders.md) |
| 29, contractor | [First-person maze architecture, player flow, art/audio and lifecycle](../../handovers/29-first-person-maze.md) |
| 30, contractor | [Lead integration review and contracts preserved](../../handovers/30-claude-upstream-integration-notes.md) |
| 31, contractor | [Eighteen furnishing and wallpaper art references for voxel conversion](../../handovers/31-house-furnishing-art.md) |
| 32, contractor | [The Hollow Hayride: second attraction roadmap, rear boarding and generated route map](../../handovers/32-haunted-hayride-roadmap.md) |
| 36, contractor | [Playable Hollow Hayride: woodland site, queue, boarding payments, upgrades and owner ride-along](../../handovers/36-hollow-hayride-operational-expansion.md) |

The [implementation plan](../../plans/first-person-horror-maze.md) was written before building the ride. Earlier contractor parts 11–26 are already in this lead baseline. Their previous downloads and test reports are historical records, not this increment’s verification.

**New roadmap part 32:** a separately purchased woodland hayride, proposed at level 8, with pay-on-boarding guests, a complete six-landmark route concept and a required player ride-along. Read [the handover](../../handovers/32-haunted-hayride-roadmap.md), [view the generated map](../../plans/haunted-hayride/route-map.png) and [voxel tractor/wagon sheet](../../plans/haunted-hayride/tractor-design.png), then inspect the [standalone native vehicle prototype](../haunted-hayride/prototype/README.md). This part supplies design/concept art and an unintegrated prototype; it does not change the playable HTML, live runtime or saves. Claude should allocate the site against its latest map before implementing the station and loop.

## What this increment adds

The restored Hollow House has an **Experience** action and an interactive foyer maze doorway. A short briefing offers Start, maze sound/volume and gentle motion. Five upgrade tiers add chambers to a guided first-person rail, from the forgotten passage to the velvet crypt. Existing owned, active and tier-valid haunt installations add encounters. Generated lurking/reveal sprites include a ghoul, clown, scarecrow, wraith and the wet-haired haunted girl in the tier-three séance room.

The world shares the existing renderer/canvas, with native voxel chambers and recesses, dense shallow fog, sparse warm/cold coloured light pools and offline synthesised ambience/stings. Scare actors approach close to the camera and retreat before it passes. The ride has bounded drag-to-look, compact controls, pause, visibility interruption with explicit Resume, Replay and immediate Return to foyer. Farm navigation/editing surfaces stay hidden during the experience.

The owner tour creates no ticket, visitor, occupancy, currency or XP. The ordinary farm simulation remains authoritative and continues under its existing pause flag. Tour state is transient; settings use the existing preference store, so this increment needs no save-schema change.

A separate art pack supplies six exterior pieces, six interior furnishings and six wallpaper concepts in the existing painted style, with labelled references, explicit crop bounds and voxel conversion guidance. These references are not installed as live voxel catalogue models; see handover 31.

## Latest lead work is included

The current branch includes Claude’s freshness/wanted premiums, neighbour orders, larger baskets/market cart, furniture riders and measured placement, selected-piece camera, introduction, additional MIDI tracks, mist/lake lighting, southward farm layout and visible lantern-walk visitor routes. The old `cc9dd6c` preview omits new additive save fields and **must not be presented as the latest game**.

Keep the newest model/save code, extra prices paid from change, held-stock/order rules, `placementRange`, rider host-relative frames, `DROP`, `counterPlace` and `hollowLinkFrom`. Handover 30 details the integration review.

## Review without disturbing ongoing work

Use a clean checkout at the exact lead base. The package manifest pins the delivery commit and binary patch/hash.

```sh
git fetch origin voxel-reference contractor/first-person-hollow-house
git worktree add ../pumpkin-maze-review -b review/first-person-maze ac698dca2410091694c00b011eb7098ba7556d0d
cd ../pumpkin-maze-review
git apply --check /path/to/first-person-maze-from-ac698dc.patch
git apply /path/to/first-person-maze-from-ac698dc.patch
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-review.html
```

Alternatively inspect the contractor branch in its own worktree. Do not apply older full/incremental contractor patches on top of this base, or replace unpublished Claude changes. The artifact branch contains downloads only and must not be merged into source.

## Build and verification

```sh
node --test voxel/test/*.test.mjs
node voxel/build.mjs --out /tmp/pumpkin-review.html
node voxel/tools/qa-maze-ride.mjs /tmp/pumpkin-review.html /tmp/maze-ride-review
CHROMIUM_PATH=/usr/bin/chromium npm --prefix voxel run smoke
```

Fresh-save harnesses must call `PumpkinVoxel.intro.skip()` before world/menu input. Run software-WebGL jobs sequentially. Required coverage includes actual foyer-door entry, five tiers, touch look, paused/resumed/replayed/closed tours, audio lifecycle and unchanged ticket ledgers; also check Claude’s ordinary order/sales/placement flows and additive-save round trips. Check desktop, portrait phone, landscape and Fold layouts. Screenshots verify rendering/layout, not physical Z Fold frame rate.

Verification: **49 Node test files, 71 integrated core browser checks and 31 final focused checks pass**. The full core flow precedes the final darker visual pass; the final focused run checks that pass at Sharp/DPR 2 with bloom, shadows and FXAA. A clean binary-patch rebuild matches the HTML byte for byte. Reports are in [verification/first-person-maze](verification/first-person-maze/README.md). The ordinary game smoke also passes all 48 desktop/phone checks with no page errors, using SMOKE_LITE and no optional captures. The final maze image is checked separately at Sharp/DPR 2 with bloom and shadows.

HTML SHA-256: `ee06c643160dc1bd1b0eda9ac654d9a3f892f158e72282d19952b57ff3d63352`.

The downloads-only [`contractor/shocktober-download-2026-10-21`](https://github.com/ShaneNancarrow97/Pumpkin-patch-/tree/contractor/shocktober-download-2026-10-21) branch supplies `Pumpkin-Patch-HTML.zip`, `Pumpkin-Patch.html`, `Pumpkin-Patch-Contractor-Patch.zip` and `Pumpkin-Patch-Furnishing-Art.zip`. Extract the HTML ZIP and open its HTML file. The art ZIP is for modelling references; live furnishings are not claimed. Build the release HTML from this integrated branch, with the real starting economy and no QA fixture funds/unlocks. It remains a standalone offline HTML with embedded assets, fonts and music.

## Scope

This is a guided attraction, with no free-walking physics, combat, VR or maze-layout editor. Existing paid visitor simulation, editable foyer, private homestead and house interiors remain available. Cooking/ingredient deliveries and the twenty-level roadmap remain future work.
