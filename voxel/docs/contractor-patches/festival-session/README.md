# Festival Night session module and dependency matrix

This contractor increment turns the previous Festival Night briefs into a tested,
standalone rules module. It also adds a versioned dependency matrix and an impact
planner for assessing future game changes. **Neither installs a feature in the
live game or changes an existing player save.**

Open `Pumpkin-Patch-Festival-Nights.html` from the delivery ZIP to exercise the
module. Its clearly labelled fixture controls send synthetic outcomes, not live
purchases. Goal targets remain proposals that need whole-game balancing.

| Part | Location |
| --- | --- |
| Pure session rules, persistence and reward entitlements | [src/engine.js](src/engine.js), [API](docs/API.md) |
| Actual world readiness snapshot | [adapters/readiness.js](adapters/readiness.js) |
| Confirmed payment/completion hook locations | [Integration seams](docs/HOOK-SEAMS.md) |
| Game-wide semantic dependencies and review guidance | [Dependency matrix](docs/DEPENDENCY-MATRIX.md) |
| Current change's risks and selected checks | [Change assessment](docs/CHANGE-IMPACT.md) |
| Claude pickup | [Handover](docs/HANDOVER.md) |
| Recorded tests and browser evidence | [Verification](verification/README.md) |

The engine implements untimed preparation, service, manual/global pause,
three-of-four goals, bounded replay protection, ending without penalty, JSON
restoration and one cosmetic entitlement per theme. It never spawns visitors,
mints money, changes their purse or imperatively adds live furniture.

## Run from the repository root

Use the existing locked `voxel` dependencies (`npm ci --prefix voxel` if missing).

```sh
node voxel/docs/contractor-patches/festival-session/tools/run-native.mjs --out /tmp/festival-native.json
node voxel/docs/contractor-patches/festival-session/tools/build-preview.mjs --out /tmp/Pumpkin-Patch-Festival-Nights.html
node voxel/docs/contractor-patches/festival-session/tools/qa-preview.mjs /tmp/Pumpkin-Patch-Festival-Nights.html /tmp/festival-browser-checks
```

The impact planner prints suggested checks; it never runs commands or edits game
files. Consult the matrix before implementing or tuning a change. Its reviewed
gameplay links supplement code imports and deliberately distinguish conditional
future integration from dependencies active today.

The additional `tools/dependency-scan.mjs` uses the existing esbuild parser to
trace actual source imports and their reverse consumers. It can check a pinned
Git diff and flag a contractor module imported by the live entry. A path outside
that parsed graph still requires semantic/manual review; it is never called safe.

```sh
node voxel/docs/contractor-patches/festival-session/tools/dependency-scan.mjs --changed voxel/docs/contractor-patches/festival-session/src/engine.js --contractor-only --out /tmp/festival-import-impact.json
```

## Pickup

Source branch: `contractor/festival-session-module`, based on the previous
`contractor/late-game-support-pack` at `855f29c`. The live lead remains
`f2f96f8351dea4cf6072862b1e3e0b14d6a318dc` for this delivery.

The kit supplies an incremental patch for the previous pack and a combined patch
from that lead. Choose the correct patch; do not apply both, merge a download
branch, reset Claude's checkout or overwrite unpublished lead work. Everything
new in this increment stays in this folder. The combined patch adds the previous
isolated support folder too; it still makes no live imports or save changes.
