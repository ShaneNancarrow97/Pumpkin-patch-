# Contractor delivery — Axel’s Haunts, farm growth and touch placement

For **Claude, the lead developer**. Source branch: [`contractor/haunted-house-estate`](https://github.com/ShaneNancarrow97/Pumpkin-patch-/tree/contractor/haunted-house-estate). This is a reviewable contractor addition. No lead branch has been reset, pushed over or merged by this delivery; the root 2D game is untouched.

## Latest completed parts

| Part | Delivery | Handover |
| --- | --- | --- |
| 24 | Axel axolotl sprite host, five native animated haunt installations with generated menu art, guest terror, physical fleeing exits, one optional paid repeat visit, capped scare-driven footfall | [Axel and the maze](../../handovers/24-axel-haunts-and-visitor-terror.md) |
| 25 | 18/24-plot south-field purchases, continuous ground and relocated gates, much larger affordable barns, rare velvet-suited Baron with alternating walking legs, real shared-wallet purchases, reserved guest-return capacity | [Farm, stock and economy](../../handovers/25-farm-growth-stock-and-baron.md) |
| 26 | Fine 0.1/free interior placement, true rotated collision bounds, edge-safe turning, touch drag/two-finger rotation/Undo, polished contextual tools; direct Cocoa and carrier-bag/tip management | [Touch controls and commerce](../../handovers/26-touch-placement-and-direct-commerce.md) |

All previous contractor features remain: private homestead through the **central hedge arch**, detailed 360° exterior, four house stages and gardens; the derelict **old left-hand house site** is The Hollow House; customisable foyer, premium navigation icons, Halloween visitors, Sandy’s cocoa/snack art, eight exterior skins, stock inspector, music shuffle, sharp rendering and input/menu refinements.

Earlier handovers 12–23 describe those features. Handover 11 is a historical isolated baseline, not the current economy. Handover 09 remains the cooking/20-level roadmap.

## Review without disturbing ongoing work

Claude’s published lead base remains `dd9781957e4f452f1469a442d03eee142a21136c`. The previous contractor preview was `8e339537d81bdcfd20be69ff422631120d976c20`.

```sh
git fetch origin contractor/haunted-house-estate
git worktree add ../pumpkin-contractor-review -b review/axel-haunts origin/contractor/haunted-house-estate
cd ../pumpkin-contractor-review
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-review.html
```

The deliveryZIP includes a full binary patch against `dd97819` and an **incremental Axel update against 8e33953**. Choose the matching base; do not apply both. Use `git apply --check` in a clean review checkout before applying. Keep unpublished Claude changes in their original checkout. The manifest pins commits and hashes.

A single simulation owns each guest, purse, ticket receipt and occupancy count across outdoor/indoor scenes. Do not run a second ticket ledger if integrating with unpublished attraction work. `mortimer` remains an internal picking/speech compatibility alias; Axel is the visible host.

## Downloaded game

The isolated [`contractor/shocktober-download-2026-10-21`](https://github.com/ShaneNancarrow97/Pumpkin-patch-/tree/contractor/shocktober-download-2026-10-21) branch contains `Pumpkin-Patch.html`, an HTML-onlyZIP and the contractorZIP. It is an **artifact branch: do not merge it into source**.

Extract `Pumpkin-Patch-HTML.zip` and open `Pumpkin-Patch.html`. Everything is embedded, including sprites, fonts and music; no server or CDN is required by the game. Fullscreen controls and mobile safe areas remain. The normal download has the real starting economy and existing save data; QA-only staged funds/levels are not in the shipped file.

HTML SHA-256:

```text
ddd885c83df1925e707b7f83fb2a410fe78544af32b179c2e39ce10174b14308
```

Schema 10 accepts legacy 12-plot saves and pads new slots to 24 while preserving coins, crops, furniture, outfits, storage tiers and purchases. Missing new fields receive additive defaults. No offline income or save reset is introduced. The Hollow House still requires level 6 property purchase (£1,750), restoration (£2,500/90active seconds), then explicit opening. Sandy’s stand still unlocks for purchase at level 5.

## Validation and reproduction

```sh
node --test voxel/test/*.test.mjs
node voxel/build.mjs --out /tmp/pumpkin-review.html
node voxel/tools/qa-axel-maze.mjs /tmp/pumpkin-review.html /tmp/axel-flow
node voxel/tools/qa-axel-final.mjs /tmp/pumpkin-review.html /tmp/axel-sharp
node voxel/tools/simulate-maze-demand.mjs
```

Latest run: **195 Node rule/art tests and23 browser checks passed, with no runtime exceptions**. Run software-WebGL browser tests sequentially. Flow checks use actual CDP touch input at Fold, phone and landscape sizes; the final visual check uses Sharp+bloom+shadows and DPR 2. Screenshots and machine-readable reports are under `verification/axel-haunts/`. They verify functionality and rendering, not physical Z Fold 7 frame-rate certification.

The demand report stages upgrades and unlimited stock for 30active minutes, without production or level gifts. It demonstrates stock/wallet reconciliation, capped occupancy and meaningful demand limits; it is not a new-player progression timing forecast.

## Scope and next integration work

The homestead supports an orbitable exterior, not first-person walking. The attraction has a timed maze visit and genuinely editable foyer, not a walk-through maze editor. The desk remains fixed to its protected service lane. Cooking/ingredient deliveries,20live levels and recipe trading are still roadmap work. A good next contract is one complete ingredient delivery → cooker → recipe → shelf sale loop, then expansion into the remaining recipes/levels.
