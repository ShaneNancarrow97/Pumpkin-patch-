# Claude pickup · Festival Host Bridge

## Scope and bases

Source branch: `contractor/festival-host-bridge`.
Incremental base: `fd58d75c1ac27ecf4f912acdf78bde07a176526c` (Festival session pack).
Live lead inspected: `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc` (`voxel-reference`).
The source diff adds only `voxel/docs/contractor-patches/festival-host-bridge/`.
It does not overwrite previous packs, production source, dependencies or saves.

The artifact branch `contractor/festival-host-download` carries the HTML, ZIP,
Claude kit, manifests and rebuild proof independently of game history. The kit
includes `festival-host-incremental.patch` and
`festival-host-combined-from-lead.patch`. The latter adds the three isolated
folders `late-game-support`, `festival-session`, and `festival-host-bridge` on
the inspected live lead. Do not merge unrelated earlier sprite branches.

Choose the patch matching your tree and first run `git apply --check <patch>`.
Apply only after reviewing against current source, particularly if your live lead
advanced. Do not reset or overwrite uncommitted Claude work. A newer matrix base
requires an explicit overlay review, not blindly updating its hash.

## Completed parts

| Part | Delivered behavior | Review entry |
| --- | --- | --- |
| Receipt adapters | Confirmed food, cocoa, garden, ticket, paid maze/hayride completion and explicit departure normalization; detached original identities | `adapters/outcomes.js` |
| Durable bridge | Monotonic bindings, original session stamps, bounded outbox, conflict detection, pause/reload and once-only delivery | `src/bridge.js` |
| Real-rule service lab | Finite wallets and stock, actual debits/revenue, actual garden growth and paid return trip, detached JSON checkpoints | `lab/scenario.js` |
| Premium desk | Existing embedded fonts/art, paper receipt, clear action hierarchy, causal micro-animation, reduced motion and responsive layouts | `preview/` |
| Dependency review | Pinned prior matrix plus 5 domains/22 links; physical import graph and current/conditional consumer separation | `data/dependency-overlay.json`, `tools/review-impact.mjs` |
| Verification | 140 direct native cases, 59 exact-HTML browser checks, viewport screenshots; separate clean patch/rebuild proof in download kit | `verification/` |

The lab's real operations can complete three of four goals for all three themes.
It does not invent happy final departures. Court guests are deliberately
nominated fixture inputs, not inferred from generic wealthy sprites. A paid
cocoa drink plus a snack is one qualifying drink, even though both items debit
stock. A paid ticket is not a finished ride. Departure route and queue wait come
from the original paid manifest, not current upgrades after the trip.

## How to integrate later

Read `API.md` and `INTEGRATION-NOTES.md` before inserting callbacks.

1. Keep the bridge behind the existing optional feature boundary. Derive real
   readiness from the existing adapter, not the lab's prepared venue.
2. Capture and retain bindings at the originating interaction. Persist them
   explicitly on any in-flight saved visit using a versioned allowlist/migration.
   The bridge preserves its own pending facts, not arbitrary NPC fields.
3. Hook immediately after actual payment/harvest, and inside the real attraction
   departure/unloading transitions. An event-array poll cannot recover a replaced
   convoy or both transitions in one large update. Normalize exact receipts and
   preserve namespaced guest/visit identity, including numeric ID zero.
4. Preflight/drain queue capacity before synchronous commerce. If enqueue rejects
   a confirmed fact, retain `retryOutcome` and retry that fact only. Never repeat
   a debit, consume stock again or mint a new replay ID.
5. Manual/global pause retains already-confirmed facts. End with pending facts
   requires a drain or literal `discardPending: true`; malformed truthy values
   cannot abandon paid evidence. Inactive tracking must not shut down ordinary
   game commerce.
6. Persist world and bridge in one host-owned transaction. Unsupported future
   payloads stay opaque and preserved. A missing inner festival object is an
   incompatible payload, not permission to reset permanent claims.
7. Install authoritative final-exit hooks if happy departures should count.
   Vanishing, dining handoffs, load/removal and ride return are not final exits.
8. Register the prior reward models/catalogue/bounds and commit entitlement plus
   physical ownership atomically/idempotently before offering live claims. This
   pack grants module entitlements only; it never writes `house.owned`.
9. Adopt desk components selectively in your live UI, preserving playfield,
   controller/focus routing, HUD selectors and safe areas. This page is not a
   replacement for the live farm interface.

## Visual refinement

Fraunces headings and DM Sans body are embedded from the game's own font assets.
Warm primary actions, custom inline operation icons and quieter secondary controls
make the important step legible. The parchment receipt displays the actual most
recent committed operation. A new operation animates the receipt and Paid stamp;
queue delivery/replay cannot fake another payment animation. Progress fills
transition without rebuilding their DOM. The running service dot has one faint
5-second breath; pausing stops it. Reduced motion and hidden pages cancel motion.
There is no UI timer or animation-driven simulation/currency change.

## Validation and limits

Run the commands in the root README. The direct runner requires actual assertion
summaries and rejects empty child output/process errors. All 59 new cases plus 81
prerequisite cases pass. The exact HTML passes 59 browser assertions with no page
errors, external requests or player storage access, including reduced motion,
replay/recovery, all themes, finite-wallet conservation and 44px touch layouts.

The private fixture deliberately supplies funding, prepared equipment/stock and
nominated demand; it is not evidence of live economy balance. The ride completes
actual game simulation steps; its accelerated lab operation is not real-time play.
Phone/unfolded/landscape emulations are not physical Fold 7 or PS5 verification.

The download kit's `REBUILD-VERIFICATION.json` records actual application to both
bases and the clean committed source, native reruns, exact HTML rebuilds, parsed
scope checks and a production build comparison against the inspected live lead.
The source verification folder records the reviewed HTML hash and source hashes.

## Suggested next lead-owned work

Install one real producer at a time, beginning with exact food receipts, then
cocoa/garden, then paid attraction transitions. Add live transaction/save tests
at each seam using the matrix's conditional checks. Only after those are verified
should optional Festival Night UI and physical reward claims enter the live game.
Keep optional goals separate from ordinary level progression and ordinary income.
