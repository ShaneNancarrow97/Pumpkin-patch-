# Moonbrew Meadow — contractor delivery for Claude

Branch: **`contractor/festival-meadow`**. Start with [the gameplay handover](../../handovers/07-festival-meadow-and-customer-care.md), then [Sandy/menu/guests/exit](../../handovers/08-sandy-menu-guests-and-exit.md). The [20-level cooking roadmap](../../handovers/09-cooking-and-twenty-level-roadmap.md) is designed for a later implementation, not shipped as gameplay.

Completed parts:

1. Buyable farm extension with a physical, three-tier cocoa stand, paid supplies, a moth courier and budget-aware visitor queues.
2. Carrier bag and tip-jar upgrades, random pumpkin quality, service-sensitive tips and separate tip statistics.
3. Small NPC favour cards with a Collect button, timed fade and safe collection later in the Journal.
4. Sandy as the detailed long-bodied cocoa cashier; plain, flake, ghost-marshmallow and sauce cocoa, plus s’mores, with editable prices, real voxel props and needs/value-based purchases.
5. Tap outdoor or indoor guests to inspect needs, happiness, cash and destination.
6. A real village exit route, and clearer lettering on the actual voxel signboards. No floating map labels.
7. Cohesive expansion art: the original farm ground generator, pickets, lanterns and autumn trees continue into the new land. A single ground mesh replaces the former overlaid extension tiles.

This is a source delivery, not an instruction to replace your checkout. It includes the previous `contractor/house-levels-midi` work and merges your published `8176e32` lights/curios commit. Your unpublished shop, fixtures, portraits, visitor rush and placement work is not available here. Preserve it when reconciling hooks.

## Review or export a patch

```sh
git fetch origin contractor/festival-meadow
git diff 5b07855..FETCH_HEAD -- voxel
# Only this delivery, excluding the previous contractor pack:
git format-patch --stdout 5b07855..FETCH_HEAD > festival-meadow.patch
```

Review in a separate branch/worktree. If you have already integrated the previous pack, apply only the new feature commit(s), resolving the integration hunks listed in the handover. If your branch predates that pack, review its own handovers first; this feature expects its 12-level progression API. No changes are made to the root 2D game or its content.

## Build and check

From the repository root, with dependencies installed in `voxel/`:

```sh
npm --prefix voxel test
node voxel/build.mjs --out /path/to/Pumpkin-Patch-Moonbrew-Meadow.html
CHROMIUM_PATH=/path/to/chromium node voxel/tools/qa-festival-meadow.mjs --html /path/to/Pumpkin-Patch-Moonbrew-Meadow.html --shots /path/to/meadow-qa
CHROMIUM_PATH=/path/to/chromium node voxel/tools/qa-sandy-cocoa.mjs --html /path/to/Pumpkin-Patch-Moonbrew-Meadow.html --shots /path/to/sandy-qa
CHROMIUM_PATH=/path/to/chromium node voxel/tools/qa-customer-care.mjs --html /path/to/Pumpkin-Patch-Moonbrew-Meadow.html --shots /path/to/care-qa
```

The downloadable HTML is fully self-contained; generated builds remain outside Git. The runtime remains plain Three.js and JavaScript, with pure, independently testable rules. See [QA status](QA.md) for what was verified.

For the existing full-game regression smoke against a standalone file (default lighting), run:

```sh
CHROMIUM_PATH=/path/to/chromium node voxel/tools/smoke-offline-html.mjs --html /path/to/Pumpkin-Patch-Moonbrew-Meadow.html --shots /path/to/smoke-qa
```
