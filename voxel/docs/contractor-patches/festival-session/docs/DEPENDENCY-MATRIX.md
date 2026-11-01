# Dependency matrix and change review

Revision: **2026-11-01.2**. Reviewed live base: `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`.

Voxel game domains and shared/root-game boundaries, plus the currently uninstalled Festival Night contractor module. Potential change impact, not an import graph or proof of safety.

**Two complementary views:** this matrix records reviewed gameplay contracts; `dependency-scan.mjs` uses esbuild to trace actual imports. Neither alone is a safety proof. Use both before changing a feature.

## Change review workflow

1. List changed paths. Run the semantic planner and, for source/asset changes, the import scanner.
2. Review directly matched domains, active downstream consumers, invariants and unknown paths.
3. Run checks for the actual scope. Keep future-integration checks separate when a contractor module is still uninstalled.
4. Record outcomes, remaining risks and patch boundaries in the handover. Refresh this map when adding systems, IDs, build paths or semantic contracts.

```sh
node voxel/docs/contractor-patches/festival-session/tools/check-impact.mjs --changed voxel/src/content/hayride.js --strict --out /tmp/hayride-impact.json
node voxel/docs/contractor-patches/festival-session/tools/check-impact.mjs --changed voxel/docs/contractor-patches/festival-session/src/engine.js --strict --out /tmp/festival-impact.json
node voxel/docs/contractor-patches/festival-session/tools/dependency-scan.mjs --base 855f29cc7969883268c6313b13eee06e4339a6f8 --contractor-only --out /tmp/import-impact.json
```

`--changed` can be repeated. `--base` accepts a pinned commit SHA. `--strict` returns a nonzero status for unmapped paths, invalid evidence or an empty change list. The planner only prints commands; it never runs tests, alters the world or writes without an explicit `--out` path.

## Domain matrix

Arrows go from a changed producer/contract to a consumer that may need review. Active links apply now. Dashed/conditional links describe adoption work; they do not mean the uninstalled festival module affects current gameplay.

| Changed domain | Scope | Active direct consumers | Conditional consumers | Check groups |
| --- | --- | --- | --- | --- |
| **Shared catalogue and root-game data** (`shared-catalogue`) | shared | `root-2d`, `house-placement`, `sprites-pets`, `crop-stock` | — | `root-checks`, `render-tests`, `progression-tests` |
| **Separate root 2D runtime** (`root-2d`) | legacy-live | — | — | `root-checks` |
| **State, restoration, pause and initialization** (`save-lifecycle`) | live | `progression`, `retail-wallet`, `house-placement`, `visitors`, `festival-readiness` | — | `save-tests`, `progression-tests` |
| **Levels, home gates, unlocks and milestones** (`progression`) | live | `kitchen`, `visitors`, `house-placement`, `maze-service`, `hayride-service`, `cocoa-meadow`, `festival-readiness` | — | `progression-tests`, `economy-study` |
| **Pumpkin production, stock, freshness and streaks** (`crop-stock`) | live | `retail-wallet`, `visitors` | — | `crop-tests`, `wallet-tests`, `economy-study` |
| **Finite-wallet retail, food sales and service** (`retail-wallet`) | live | `progression`, `visitors` | — | `wallet-tests`, `crop-tests`, `economy-study` |
| **Arrivals, groups, caps, VIPs, rushes and needs** (`visitors`) | live | `retail-wallet`, `maze-service`, `hayride-service`, `cocoa-meadow`, `cleanliness`, `festival-readiness` | — | `visitor-tests`, `wallet-tests`, `cleanliness-tests` |
| **Farm expansion, paths, exits and scene gateways** (`navigation`) | live | `visitors`, `cleanliness`, `hayride-service`, `controls-ui` | — | `navigation-tests`, `control-tests` |
| **Litter, caretakers and cleanliness appeal** (`cleanliness`) | live | `visitors` | — | `cleanliness-tests`, `navigation-tests`, `visitor-tests` |
| **Ingredients, recipes, equipment, batches and chef** (`kitchen`) | live | `retail-wallet`, `garden-carving`, `festival-readiness` | — | `kitchen-tests`, `wallet-tests`, `garden-carving-tests` |
| **Garden harvest, carving seeds and pumpkin shapes** (`garden-carving`) | live | `kitchen`, `controls-ui` | — | `garden-carving-tests`, `kitchen-tests`, `control-tests` |
| **Sandy cocoa service and meadow comfort** (`cocoa-meadow`) | live | `retail-wallet`, `visitors`, `festival-readiness` | — | `cocoa-tests`, `wallet-tests`, `visitor-tests` |
| **Hollow House restoration, foyer and paid visits** (`maze-service`) | live | `retail-wallet`, `visitors`, `ride-pov`, `festival-readiness` | — | `maze-tests`, `pov-tests`, `visitor-tests` |
| **Hayride fleet, tickets, queue and paid circuit timing** (`hayride-service`) | live | `retail-wallet`, `visitors`, `ride-pov`, `festival-readiness` | — | `hayride-tests`, `navigation-tests`, `wallet-tests`, `economy-study` |
| **Off-map geometry, scares, cameras and breakdown** (`ride-pov`) | live | `audio`, `render-assets` | — | `pov-tests`, `ride-camera-study`, `render-profile` |
| **Music, MIDI, scare cues and tractor sound** (`audio`) | live | `ride-pov` | — | `audio-tests`, `pov-tests` |
| **Home, estate, furniture, walls and physical bounds** (`house-placement`) | live | `kitchen`, `navigation`, `progression`, `controls-ui` | — | `placement-tests`, `progression-tests`, `render-tests`, `kitchen-tests` |
| **Costumes, walking, scale and companions** (`sprites-pets`) | live | `controls-ui`, `render-assets` | — | `sprite-tests`, `control-tests`, `render-tests` |
| **Inputs, cameras, menus and feedback** (`controls-ui`) | live | `house-placement`, `crop-stock` | — | `control-tests`, `navigation-tests`, `sprite-tests`, `game-smoke` |
| **Voxel kit, atlases, textures and render quality** (`render-assets`) | live | `sprites-pets`, `house-placement`, `ride-pov`, `build-runtime` | — | `render-tests`, `sprite-tests`, `placement-tests`, `render-profile`, `game-build` |
| **Orchestration, offline build, dependencies and CI** (`build-runtime`) | live-tooling | `save-lifecycle`, `controls-ui`, `render-assets` | — | `save-tests`, `game-build`, `game-smoke`, `root-checks` |
| **Uninstalled night definitions and goals** (`festival-content`) | isolated | `festival-state`, `festival-readiness`, `festival-claims`, `festival-preview` | `progression` | `festival-content`, `festival-engine`, `festival-bridge` |
| **Uninstalled session, dedupe, pause and restoration** (`festival-state`) | isolated | `festival-claims`, `festival-readiness`, `festival-preview` | `save-lifecycle`, `retail-wallet`, `visitors` | `festival-engine`, `festival-bridge`, `festival-preview` |
| **Uninstalled read-only context and future hooks** (`festival-readiness`) | isolated | `festival-state` | `build-runtime` | `festival-bridge`, `festival-engine` |
| **Uninstalled cosmetic entitlement boundary** (`festival-claims`) | isolated | `festival-preview` | `house-placement` | `festival-engine`, `festival-bridge` |
| **Offline contractor fixture demo** (`festival-preview`) | isolated | — | `controls-ui` | `festival-preview`, `festival-browser` |
| **Semantic map and read-only impact planner** (`impact-planning`) | tooling | — | — | `impact-tests` |

The JSON retains path patterns, real evidence files, every link’s consequence, invariants and concrete commands. The planner follows transitive consumers through cycles and deduplicates check groups.

## Important consequences

- **kitchen → retail-wallet** (active): Recipes, yields, displayed stock and batches feed confirmed finite-wallet food sales.
- **kitchen → garden-carving** (active): Ingredient IDs and pantry caps affect garden/carving seed destinations and overflow.
- **kitchen → festival-readiness** (active): The adapter reads purchased recipes and actual placed home capabilities.
- **hayride-service → retail-wallet** (active): Boarding receipts debit the shared purse and contribute real earnings.
- **hayride-service → visitors** (active): Queue time, circuits, return needs and invitations change farm flow.
- **hayride-service → ride-pov** (active): Tier, route and shared layout data feed POV scenery; paid timing is a separate contract.
- **hayride-service → festival-readiness** (active): Actual open/tier/route facts determine isolated evening readiness.
- **house-placement → kitchen** (active): Only correctly placed kitchen gear supplies required home capabilities.
- **house-placement → navigation** (active): Furniture bounds and garden pieces affect physical walk/transition clearance.
- **house-placement → progression** (active): Home upgrades and room access satisfy level milestones.
- **house-placement → controls-ui** (active): Selection, free drag, wall/support rotation and interactions use actual item bounds.
- **festival-state → festival-claims** (active): Only an ended successful evening creates a claimable entitlement.
- **festival-state → festival-readiness** (active): Engine readiness fields and adapter snapshots must keep the same API contract.
- **festival-state → festival-preview** (active): The fixture UI dispatches real reducer commands and displays its actual view.
- **festival-claims → festival-preview** (active): The demo must present pending/owned cosmetic states without implying live grants.
- **festival-state → save-lifecycle** (integration-conditional): Only if adopted: persist session token, paused progress, dedupe and claims without altering existing migrations.
- **festival-state → retail-wallet** (integration-conditional): Only if adopted: consume confirmed receipts after payment; never charge the guest again.
- **festival-state → visitors** (integration-conditional): Only if adopted: theme invitations must reuse existing guest caps and purses.
- **festival-claims → house-placement** (integration-conditional): Only if adopted: map grantKey to actual catalogue ownership atomically/idempotently before placement.

## Limits and maintenance

- Domain paths overlap intentionally. Conditional consequences need human review of what actually changed; no file-name match proves a defect or proves safety.
- This is a reviewed semantic scope, not an exhaustive file-level graph. Unmapped files, new systems, generated outputs and deleted/renamed paths require manual review.
- Root 2D behavior is mapped at its shared-data/runtime boundary; individual root assets, external platform behavior and private/unpublished lead work are not exhaustively modeled.
- Current checks cover direct and active-transitive potential impacts. Future integration suggestions are separate and do not install or imply live Festival Night behavior.
- Printed commands are recommendations only. The planner never executes tests, alters saves, runs builds, updates Git or writes reports.
- Existing economy fixtures and software WebGL checks have limits; whole-venue balance, physical Fold 7 GPU/controller behavior and atomic host persistence still need focused validation.
- Validation checks referenced files and commands’ working directories, not the correctness of every command. Changes in function semantics can invalidate an edge even while its filename still exists.
- Reports fingerprint the reviewed evidence. Compare source changes and refresh the matrix; a reviewed-base label is not automatic approval of newer code.
- The import scanner covers literal modules/assets, not computed loading, generated CSS/templates, save data, purse allocation, physical geometry or gameplay timing.
- Keep current test evidence separate from future integration requirements. Physical Fold/PS5/performance checks cannot be replaced by path matching.
- This file is generated from `data/dependency-matrix.json` by `renderMatrixMarkdown`. The native integrity test detects a stale rendered table. Update the JSON revision and regenerate this document together.
