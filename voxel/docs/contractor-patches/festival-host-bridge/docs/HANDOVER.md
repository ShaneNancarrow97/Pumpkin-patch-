# Claude pickup · Festival Host Bridge

## Current scope and pickup

- **Current full-game UI work:** [`contractor/mothlight-game-ui`](https://github.com/ShaneNancarrow97/Pumpkin-patch-/tree/contractor/mothlight-game-ui).
- **This optional lab:** `contractor/festival-host-bridge`, Mothlight UI commit
  `7f8b15f` plus the current documentation/evidence follow-up.
- **Previous lab refinement:** `b71a3f75a45926ec6c0a89a808a24fb496b2a17e`.
- **Reviewed live producer contracts:** `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`.

This source increment remains inside
`voxel/docs/contractor-patches/festival-host-bridge/`. The prerequisite
`festival-session` and `late-game-support` packs, production entry, live economy
and original save schema are unchanged by this lab. The full-game Mothlight UI
is a separate branch and must not be confused with this private service venue.

Review the source diff after the previous lab refinement. Preserve unpublished
Claude work and recheck newer receipt/save contracts before applying anything.
The older `contractor/festival-host-download` artifacts and their patch/rebuild
proofs cover earlier lab versions; they are not a fresh Mothlight release. No new
artifact kit is published by this documentation pass.

Read [VISUAL-REVIEW.md](VISUAL-REVIEW.md) for the open-book material direction,
font licensing and current checks. [REFINEMENT.md](REFINEMENT.md) records the
previous goal/quote/keepsake refinement. The actual latest lab HTML SHA-256 is:
`e8e824aaddb0ea65843098f1e62a463bc2275eb45c17714de580aeeeb2fb6b85`.

## Completed parts

| Part | Delivered behavior | Review entry |
| --- | --- | --- |
| Receipt adapters | Confirmed food, cocoa, garden, ticket, paid maze/hayride completion and explicit departure normalization; detached original identities | `adapters/outcomes.js` |
| Durable bridge | Monotonic bindings, original session stamps, bounded outbox, conflict detection, pause/reload and once-only delivery | `src/bridge.js` |
| Real-rule service lab | Finite wallets and stock, actual debits/revenue, actual garden growth and paid return trip, detached JSON checkpoints | `lab/scenario.js` |
| Read-only offers | Exact detached-copy food/cocoa quotes, stock and paid ride fare/route previews; no live holds or visit allocation | `lab/offers.js` |
| Service presentation | Goal-first hierarchy, explicit next step, retained completion 3/3 and fresh repeat-attempt progress | `preview/service-state.js` |
| Mothlight ledger | Parchment open-book spread, illustrated service choices, original moth/botanical margins, licensed handwritten flourishes, paper receipts and causal motion | `preview/`, `docs/VISUAL-REVIEW.md` |
| Dependency review | Pinned prior matrix plus 5 domains/27 links; physical import graph and current/conditional consumer separation | `data/dependency-overlay.json`, `tools/review-impact.mjs` |
| Verification | 163 direct native cases across 22 files, 145 exact-HTML browser assertions, current source hashes and viewport screenshots | `verification/` |

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

## Mothlight visual refinement

The desk is now an opened seasonal ledger with warm bone parchment, a mulberry
cover, a shaded centre binding and ink-plum functional text. Desktop pages share
a book spread; mobile uses a single continuous page flow rather than shrinking
two pages. Original moth and pressed fern/lavender SVGs sit in clipped outer
margins, are hidden from assistive technology and cannot intercept input.

DM Sans and Fraunces remain the functional fonts for actions, prices, stock and
goals. The added Caveat Latin WOFF2 is embedded, unmodified, with its SIL Open Font
License 1.1 and attribution retained in the standalone HTML. Handwritten margin,
flavour and keepsake lettering is nonessential to operating the lab. Source and
hashes are recorded in `preview/assets/SOURCES.json`.

Reviewed food/cocoa/ingredient/hospitality artwork replaces generic service icon
boxes. Exact food art follows the actual recipe ID; unknown dishes use an
illustrative place-setting fallback. Cocoa, garden and ride art is category art,
not a promise of a paid order's contents. Existing receipt, queue and goal motion
continues only after actual state changes. Reduced motion and hidden-page
cancellation remain intact; decoration never advances simulation or currency.

The reviewed HTML is 1,544,786 bytes, below the browser-checked 2 MiB lab budget.
This budget applies to the optional lab, not the separate full-game build.

## Validation and limits

The captured direct runner passes **163 native cases across 22 files**: 82 bridge
cases plus 81 prerequisite cases. It requires real assertion summaries and rejects
empty output, process errors, failures and skips. The exact HTML passes **145
browser assertions**, with no page errors, external requests or player storage.

Coverage includes actual financial conservation, pause/replay/save recovery,
restored shelves, all themes, once-only entitlements, illustrated asset decoding,
licensed-font embedding, functional typography, 44px targets, pointer-safe margins,
side-by-side/single-flow page layout and reduced motion. Functional ink is checked
against the declared solid paper base at 4.5:1; decorative gradients are not sampled
pixel by pixel. That narrower result is not a full contrast certification of all
rendered art or the separate live game.

The private fixture is not a demand/profit/pacing forecast. Physical Fold 7 GPU,
Android file-provider and PS5 Bluetooth verification are not supplied. Fresh native,
browser and impact evidence for this source iteration lives in `verification/`;
the previous downloadable kit's clean patch/prod-build proof remains historical.

## Suggested next lead-owned work

Install one real producer at a time, beginning with exact food receipts, then
cocoa/garden, then paid attraction transitions. Add live transaction/save tests
at each seam using the matrix's conditional checks. Only after those are verified
should optional Festival Night UI and physical reward claims enter the live game.
Keep optional goals separate from ordinary level progression and ordinary income.
