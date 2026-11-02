# Bridge dependencies and impact review

Reviewed overlay **2026-11-02.3**; 32 domains and 108 semantic links after extending the prior matrix.

The original matrix is pinned by revision and SHA-256. A changed base fails validation until the overlay is reviewed. No previous contractor or live game file is overwritten.

| Changed bridge domain | Active consumers | Conditional live consumers | Required check groups |
| --- | --- | --- | --- |
| Confirmed rule-result adapters | `bridge-queue`, `bridge-lab` | `retail-wallet` | `bridge-evidence-tests`, `bridge-lab-tests` |
| Durable bounded host outbox | `bridge-lab`, `bridge-desk` | `save-lifecycle`, `house-placement` | `bridge-queue-tests`, `bridge-lab-tests` |
| Private real-rule service venue | `bridge-desk` | — | `bridge-lab-tests`, `bridge-ui-build` |
| Premium receipt desk and causal motion | — | `controls-ui` | `bridge-ui-build`, `bridge-ui-browser` |
| Bridge impact review and contractor handover | `bridge-evidence`, `bridge-queue`, `bridge-desk` | — | `bridge-impact-tests` |

## Review commands

```sh
node voxel/docs/contractor-patches/festival-host-bridge/tools/review-impact.mjs --changed voxel/docs/contractor-patches/festival-host-bridge/src/bridge.js --changed voxel/docs/contractor-patches/festival-host-bridge/adapters/outcomes.js --strict --out /tmp/bridge-impact.json
```

Repeat `--changed` for other files. With `--out`, the read-only reviewer writes semantic and parsed-import reports in that explicit directory. It does not run suggested commands or execute the parsed game. Unknown paths, stale matrix evidence and a live-import/scope leak fail strict review.

The parsed graph includes the real game entry and the private lab. Physical JSON paths are normalized from esbuild import-attribute metadata. The lab imports real rule/model modules but cannot boot main, scene or storage; its standalone build checks that separate boundary.

Unrepresented template/style/tool/document paths still need semantic review. Literal import tracing cannot discover every computed asset, save field, money allocation, queue/route timing or source-side callback. A green scope boundary is not a general safety approval.

## Consequences to check

- **kitchen → bridge-evidence** (active): Food receipt identity, quantity and paid amount are an adapter contract.
- **cocoa-meadow → bridge-evidence** (active): Only actually paid order lines count; snacks and drinks remain distinct.
- **garden-carving → bridge-evidence** (active): A successful pick supplies real yield/overflow; delivery or pantry stock is not harvest proof.
- **hayride-service → bridge-evidence** (active): Paid manifests, run identity, source phase, route and waiting evidence determine completion facts.
- **maze-service → bridge-evidence** (active): Paid maze completion must be captured before repeat visit IDs change.
- **visitors → bridge-evidence** (active): Court cohort flags and visitor/customer namespaces affect distinct guest credit.
- **festival-state → bridge-queue** (active): Engine transitions and normalized reason/schema contracts drive queue delivery.
- **festival-readiness → bridge-lab** (active): The private venue uses actual current level/equipment/service readiness.
- **bridge-evidence → bridge-queue** (active): Clean, detached facts are the only accepted outbox payload.
- **bridge-evidence → bridge-lab** (active): Private source operations must normalize actual results, not fabricate service outcomes.
- **bridge-queue → bridge-lab** (active): Deferred delivery, replay and snapshot behavior determine whether paid facts remain durable.
- **save-lifecycle → bridge-lab** (active): The lab uses real saveData/restoreState and must deep-copy shallow serializer results.
- **bridge-lab → bridge-desk** (active): Committed ledger, wallets, stock and operation results drive the receipt view and motion.
- **bridge-queue → bridge-desk** (active): Queue and progress are separate UI states; held facts cannot look delivered.
- **render-assets → bridge-desk** (active): Existing event/service atlases, the licensed embedded Caveat font and original moth/botanical SVG margins affect book identity, typography, pointer safety and the below-2-MiB offline lab budget. Preserve OFL attribution. Exact dish order follows kitchen-food-art metadata; category art does not promise order contents.
- **bridge-review → bridge-evidence** (active): A stale dependency assessment may miss a producer contract change.
- **bridge-review → bridge-queue** (active): A stale dependency assessment may miss persistence/identity consequences.
- **bridge-review → bridge-desk** (active): Viewport, motion, fonts and offline build checks are selected before release.
- **bridge-evidence → retail-wallet** (integration-conditional): Only when wiring live hooks: insert after confirmed debits, never pay twice or consume short receipt history as a full ledger.
- **bridge-queue → save-lifecycle** (integration-conditional): Only when adopted: add explicit host state/migration and persist origins on ongoing saved attraction visits.
- **bridge-queue → house-placement** (integration-conditional): Only when physical rewards are registered: commit ownership and the stable claim key atomically or idempotently.
- **bridge-desk → controls-ui** (integration-conditional): Only when adopting UI in-game: connect focus/controller/menu selectors and preserve the playfield.
- **kitchen → bridge-lab** (active): Read-only dish previews must reproduce the real nominated guest quantity/price/stock without reserving real holds.
- **cocoa-meadow → bridge-lab** (active): Cocoa previews must follow actual stock, changing guest IDs and current paid order pricing; quotes are not receipts.
- **garden-carving → bridge-lab** (active): The garden action describes current crop phase without promising a fabricated yield or income.
- **hayride-service → bridge-lab** (active): Ride fare/route previews use detached planning and must not allocate real visit IDs or promise a simulated trip duration.
- **festival-state → bridge-desk** (active): Derived completion/claimed/repeat states follow the real view. An inactive completed evening must not display a false0/3 reset.

The current change assessment and test decisions are recorded in `verification/`. See the prior [full matrix](../../festival-session/docs/DEPENDENCY-MATRIX.md) for the reviewed base and [integration notes](INTEGRATION-NOTES.md) before wiring live hooks.
