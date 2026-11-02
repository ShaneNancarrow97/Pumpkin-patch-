# Evening desk refinement 2 · Claude pickup

Base: first host bridge `9f489f99e3a6035f73df2e95b06d022be7574637`.
Scope: only `festival-host-bridge/`; no engine, adapter, transaction, live UI, save
schema or production entry change. The two earlier packs remain intact.

## Problems found and corrected

| Observed issue | Resulting behavior |
| --- | --- |
| Phone branding and the expanded outbox buried goals/results | Hosting chrome contracts; progress and next step sit beside controls, all four actions and committed feedback fit 390×844 |
| Inspection was confused with ordinary service | Delivery/replay stays in a collapsed inspector; pending facts expose a clear direct Deliver action |
| A restored shelf could differ from the theme’s first dish | Active quotes follow the real shelf and ledger labels follow the committed receipt’s recipe |
| Generic action names hid what would be purchased | Cards name the dish, quote actual quantity/price/current stock, and show cocoa order/ride fare details |
| A quote function reserves food or allocates ride IDs | Offer helpers run on a detached copy; live wallets, holds, visitors, bindings and time stay unchanged |
| Finishing reset the visible summary to0/3 | Completed/claimed nights retain earned 3/3, with a keepsake card; old individual goals are hidden, never invented |
| Repeat hosting could be mistaken for another reward | Recorded ownership remains visible; repeat attempts use fresh goals and cannot duplicate the entitlement |
| Claiming/choosing the next night was below the phone fold | The keepsake card precedes transaction feedback; both claim and next-evening actions fit the first phone viewport |
| A 0:00 hosting clock implied continuous gameplay | Clock is labelled Simulated time and explains that growth/ride steps advance it; ended evenings hide the reset clock |

The premium materials/fonts/receipt motion remain. Additions use causal short
result/reward reveals, not perpetual particles. Native details, keyboard focus,
44px controls, hidden-page cancellation and reduced motion are preserved.

## Files and contracts

- `lab/offers.js`: current nominated private guest offers through actual rule
  quotes/planning on a clone. The caller still gates session phase and outbox
  capacity. Garden phase has no fabricated yield; ride circuit duration is not
  labelled as total trip duration. This is a private fixture preview, not demand.
- `preview/service-state.js`: pure view-derived hierarchy for pause, pending,
  finish, completion, entitlement and repeat states.
- `preview/app.js`, `index.html`, `style.css`: integrates those models without
  changing the lab's actual operations or the engine.
- `test/offers.test.mjs`, `test/service-state.test.mjs` and the added restored-shelf
  lab case: 16 additional native cases.
- `tools/qa-preview.mjs`: exact-HTML suite expanded to 92 browser assertions.
- `data/dependency-overlay.json`: revision 2026-11-02.2, 32 domains/108 links. Five
  new links explicitly cover quote and completion-view contracts.

## Lead integration caution

Use this as a reusable UI/quote pattern. Do not copy the prepared world or
nominated guest assumptions into live demand. Do not compute cloned quotes each
frame; this desk updates only on user operations/view changes. Live integration
still needs real producer callbacks, saved origin bindings and idempotent physical
reward registration as described in `INTEGRATION-NOTES.md`.

The kit supplies a small refinement patch after the declared base, a full bridge
patch after the session pack, and a combined three-folder patch on the inspected
live lead. Apply exactly one matching your tree; never reset unpublished work.
All 156 native cases and 92 browser checks pass. The kit separately verifies actual
patch applications and compares the production rebuild to the clean live lead.
