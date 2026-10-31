# Pumpkin Patch — reviewed character art and tractor upgrade icons

## Play
Extract Pumpkin-Patch-HTML.zip and open Pumpkin-Patch-Directional-Cast.html in Chrome or Safari.
The game is one offline file with its runtime artwork, fonts and music embedded.
The normal starting balance, purchases and existing save compatibility remain;
QA money and unlocks existed only in browser test storage.

Use Play to choose Shane or Natalie. MOVE walks, LOOK turns the camera, Centre
recentres it, and the right-side context button uses a nearby item. The ordinary
management interface and the full existing wardrobe remain available.

Pumpkin-Patch-Directional-Art-Review.html is a separate offline sprite review bench, not the game.
It exposes real frame counts, 24 nominal bearings, onion skin and missing-art
coverage. Strict authored selection is the default; nearest fallback is explicit.

## Scope and remaining art
The current batch includes 140 reviewed owner frames
across 16 pages. Everyday bodies have 24 neutral views,
six accepted walking bearings and front planting/right watering gestures. Sandy
is leaner and smaller in the house and at cocoa service. Tractor ride upgrades
have matching generated menu icons without changing their prices or rules.

This does not complete every costume/action at every bearing. The other 18 looks,
remaining action views and full pet gait remain documented production work. Some
walks use four genuine phases and are marked reduced; neutral poses are not
breathing cycles. Painted angle assignments are approximate, not measured 3D
15-degree camera renders. All 20 existing looks remain playable through the
existing bank where new art is unavailable.

## Claude pickup
Source branch: contractor/directional-character-atlases at 3b92fa5f4b66439c817a24b932c4f9784cd4fe5b.
Review base: b387c85da592ed310dad5838ea7668c45fc0899a. Apply directional-cast-from-b387c85.patch to a clean copy of that base, or inspect
the source branch on a separate review branch. Reconcile newer lead changes;
do not reset or overwrite Claude's private work. Read the included handover(s):
- 59-reviewed-owner-directions-and-lean-sandy.md
- 60-hollow-hayride-upgrade-icons.md

The separate hayride-icons-only-from-b387c85.patch takes only the tractor menu
art and its helpers/tests. It also applies to the declared review base, and
does not require the owner atlas runtime. Reconcile newer lead menu edits first.

The small binary patch contains runtime assets, code, tests, documentation and
the approved reference seeds required by native asset checks. Larger generation
PNGs, rejected candidates, GIFs and screenshot evidence stay on the source branch.
Fetch those art folders before rerunning the preparation bakers. The patch's
approved seed references and Sandy audit JSON are included; its omitted source
images are listed in omitted-preparation-images.txt.

Artifact-only branch: contractor/directional-cast-download. Do not merge a
download branch into game source. No economy/progression/save-schema change is
part of this contract; state version14 and the root 2D game remain unchanged.

## Verification
The exact final game passed 44 browser
checks; the standalone art bench passed 235 checks.
Actual-menu harness checks: 111
(real menu modules/rules/CSS, without the 3D world; recorded separately).
Native summary: 105/105 passing, no failures/skips. The standard
desktop/phone smoke run passed 52 checks. Both clean committed-source
and actually applied-patch rebuilds match the game and review HTML byte for byte;
the packaged native asset checks pass in both archives.

GitHub CI passed for the runtime-equivalent snapshot.
CI URL: https://github.com/ShaneNancarrow97/Pumpkin-patch-/actions/runs/41208388922

Browser viewport emulation/software WebGL does not verify physical Fold7 GPU,
Bluetooth or OS fullscreen behaviour. Managed Chromium blocked file URLs during
QA, so exact unchanged offline bytes were served locally with external requests
blocked/reported. The final HTML still embeds its assets for downloaded use.

Game SHA-256: 7909eb960ab10ed9aa6b2cc7cac35a081f8a02e5817ab918b9e62ebfd66e652a
Art bench SHA-256: 9815079452c219b25a3ec1cc4b59c66479800226a0086ddff9ba66f066b33422
