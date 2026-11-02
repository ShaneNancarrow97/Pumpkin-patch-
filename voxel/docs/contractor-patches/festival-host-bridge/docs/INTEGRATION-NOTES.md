# Integration seams and remaining host responsibilities

Reviewed live lead: `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`.
This pack installs no live hook, save field, visitor producer or house item. It
adds reusable confirmed-outcome adapters and a durable queue for the existing
Festival Night engine. Keep Claude's unpublished core work intact.

## One transaction is not two payments

Keep three operations distinct: the game commits a real payment, an adapter
copies that confirmed receipt into a normalized fact, and the bridge delivers
that fact into Festival Night progress. `enqueue`, `flush` and replay must never
call a commerce function. They do not debit a purse, remove stock or add income.

The future producer must check/drain outbox capacity before its synchronous rule
operation. If enqueue nevertheless rejects a confirmed fact, retain its returned
`retryOutcome` and retry only that fact after draining. Do not pay again, replace
the outcome with a current quote or mint another ID. A full queue is an explicit
backpressure result, not evidence that the guest's original payment failed.

When the feature is inactive or manually paused, `bind` has no current stamp.
The ordinary game may continue its normal business outside Festival Night
tracking; do not turn an unavailable stamp into a global business shutdown.
Already-confirmed, previously bound outcomes wait safely in the outbox across
manual/global pause. They are delivered only after resume and explicit flush.

For the lab, all world state is a disclosed developer fixture. Its operation
controls are not a replacement for the live simulation's normal service rules.

## Capture identity at the original interaction

Retain the binding's original session/window stamp through delayed completion.
Normalizers never retag an old event to the newest evening. Use `visitor:0` and
`customer:0` as different people; numeric IDs alone overlap between those pools.
The real Court cohort needs `courtier:true`, not merely the separate red-suited
big spender's high budget or a generic `vip-arrived` notice.

Food and ticket/completion facts use actual stable receipt/visit identity. Cocoa,
garden and final-departure facts use the bridge's monotonic binding ID because
their current game operations have no durable receipt serial. Save `nextSerial`;
reuse the original binding on retry. A new random ID at replay defeats dedupe.

Bindings not yet represented by confirmed pending facts must be retained with
the originating host lifecycle. `bridge.save` preserves its own queue and serial,
not arbitrary live NPC fields. The current game deliberately strips ordinary
visitors, holds, customers and diners. Selected attraction visitors are saved,
but their nested visit data is restored through an allowlist. Add explicit
versioned migration/validation for any origin binding and departure evidence;
do not rely on incidental object spreading to preserve a new field.

## Concrete source seams

| Source | Capture point | Evidence to retain |
| --- | --- | --- |
| `rules/cooking-sales.js` | Immediately after a non-null `commitFoodForCustomer` return | Exact `{id,recipe,quantity,amount,at}`, original binding, namespaced guest and Court flag. The outward takeaway event's `quantity:0` is not a serving count. |
| `rules/cocoa-menu.js` | After positive `payStandOrder` return | Actual committed order lines and total; do not reconstruct them from current prices. Snacks remain identifiable and are filtered by the theme. |
| `rules/garden-crops.js` | Successful `pickGardenBed` return | Original bed decor ID/instance, returned quantity and original binding. Overflow market sales still count one genuine harvest, not another guest payment. |
| `rules/hayride.js` | Ticket charge plus the exact internal departure transition | Paid visit/guest identity, queue wait before boarding, actual `c.runId`/`c.routeLevel` and paid manifest. |
| `rules/hayride.js` | Exact completed unloading transition before `replaceConvoy` | One completion per matched paid passenger using the detached departure snapshot. |
| `rules/hollow-house.js` | Ticket debit and `maze → returning` transition | Current charged visit ID and paid amount before a repeat reassigns the visit, plus actual completion/wait evidence. |
| Final departure paths | Explicit final normal/frightened exit transition | Finality, namespaced guest, actual happiness and outcome sampled before removal. |

The current generic `hayride-returned` event contains only an aggregate count.
An external consumer cannot safely recover each paid guest by inspecting the
new convoy after replacement. Similarly, a large update step may contain both
departure and return; polling the final state loses the original departure
snapshot. Install direct producer hooks at the reviewed internal transitions,
not a post-frame guess based on event array length or a rendered animation.

The snapshot is detached. Buying a route while riders are away cannot change
their `routeLevelAtDeparture`. Moving a boarding bay cannot reset the captured
queue wait. A ticket is payment, not completion; a free owner ride counts as
neither. Missing or inconsistent paid-manifest evidence produces no credit.

## No universal happy-departure detector

The game has normal stall, maze-border, hayride-after-stall and meadow-chat
departures. Indoor shop removal can hand a customer into dining rather than end
the whole visit. Saving/loading or closing for the night also removes NPCs.
None of these disappearances alone proves a happy final exit. The explicit
departure normalizer requires authoritative finality/happiness/outcome; this
pack supplies no automatic detector and the lab fabricates no such departures.

## Save, claims and feature boundaries

Persist game state and the bridge snapshot within one host-owned transaction.
An isolated lab envelope/JSON file is not an installed change to the original
save key. If adding live state, follow the game's version bump and migration
requirements. Unsupported future bridge/engine payloads must remain opaque and
preserved rather than being replaced with a fresh empty feature state.

The engine owns one cosmetic entitlement per completed theme. This pack does not
register the previous reward models in the live catalogue or push duplicates
into `house.owned`. Before actual claims ship, catalogue registration, placement
bounds and idempotent/atomic physical ownership still need lead integration.
Persist the entitlement and its item grant together, or resolve ownership from
the stable grant key. Two independent storage writes are not made atomic by
queueing facts.

Ending with pending outcomes requires an explicit drain or explicit discard.
Discarding is an abandonment decision, not a refund or extra payment. Old queued
outcomes retain their original session token and cannot advance the next night.

Use the dependency matrix for changes to receipts, prices, wallets, visitor IDs,
save allowlists, queue/route timing, kitchen readiness and menu/control routing.
The new module is still outside the live entry; installing hooks makes those
previously conditional checks actual integration requirements.
