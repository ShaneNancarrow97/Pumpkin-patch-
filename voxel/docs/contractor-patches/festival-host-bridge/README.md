# Festival Host Bridge · The evening desk

Optional contractor increment, refinement 2, 2 November 2026. **This is a private real-rule lab,
not a playable-game update.** Nothing imports it from the production entry, reads
a player save, installs live hooks or changes the original save schema.

The evening desk adds a premium, gently animated review surface for the Festival
Night module. Real food, cocoa, garden and paid hayride rules feed confirmed facts
through a durable bounded queue. Paper receipts show actual committed payments;
delivering or replaying a fact does not charge again. Embedded game fonts, muted
velvet surfaces, warm brass actions and restrained receipt/stamp motion work
offline. Reduced-motion mode removes both one-shots and the faint service light.

The second pass puts objective progress and next steps beside the actions, brings
committed results into the phone viewport and folds technical delivery controls
away. Cards show actual read-only quotes and stock; completed evenings retain
3/3 with a keepsake card instead of falsely restarting their summary. See the
[refinement notes](docs/REFINEMENT.md).

## Review and pickup

Start with [Claude handover](docs/HANDOVER.md), then [API](docs/API.md),
[integration seams](docs/INTEGRATION-NOTES.md), and [dependencies](docs/DEPENDENCIES.md).
The [change assessment](docs/CHANGE-IMPACT.md) distinguishes checks for this pack
from the live integration tests Claude will need later.

Source branch: `contractor/festival-host-bridge`.
Refinement patch base: `9f489f99e3a6035f73df2e95b06d022be7574637`.
Full bridge patch base: `fd58d75c1ac27ecf4f912acdf78bde07a176526c`.
Reviewed live lead: `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`.
Prerequisites: the isolated `festival-session` and `late-game-support` folders.
The download kit supplies a small refinement patch after the first bridge pack,
a full bridge patch after the session pack, or all three folders as a combined
patch against that lead. Choose exactly one matching your tree. Preserve
Claude's unpublished work and review against any newer receipt/save contracts.

## Build and verify

From the repository root, with the existing voxel dependencies installed:

```sh
node voxel/docs/contractor-patches/festival-host-bridge/tools/build-preview.mjs --out /tmp/Pumpkin-Patch-Receipt-Lab.html
node voxel/docs/contractor-patches/festival-host-bridge/tools/run-native.mjs --include-prerequisites --out /tmp/festival-native.json
node voxel/docs/contractor-patches/festival-host-bridge/tools/qa-preview.mjs /tmp/Pumpkin-Patch-Receipt-Lab.html /tmp/festival-browser
```

Open the built single HTML locally, prepare an evening and start service. Serve a
dish or cocoa order, harvest a real bed, or simulate one actual paid ride. Expand
Delivery controls to defer and drain facts; use Private checkpoint to test
save/reload or export JSON. These controls touch only this page's private state.

Prepared funding, learned recipes, finished stock, nominated Court guests and
forced nominated-rider willingness are explicit developer inputs. Prices, finite
wallet debits, stock losses, growth, queue timing, payments and completion are
real game rules. This is not a demand, profit, progression or player-time forecast.
The lab never fabricates final happy departures to finish the fourth goal.

Verification: **156 native cases across 21 files**, including the prior two packs;
**92 browser checks** against the exact offline HTML, with phone, unfolded and
landscape layouts. See [evidence and limits](verification/README.md). Physical
Fold 7 GPU, browser file-provider and Bluetooth-controller testing remain outside
this lab's scope. Physical house rewards and live Festival Night hooks remain
Claude's integration work.
