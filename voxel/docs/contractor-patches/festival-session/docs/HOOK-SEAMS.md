# Authoritative hook seams for Claude

This module does not install hooks in the live game. The following findings
describe the reviewed lead `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`. Preserve the
lead's current ownership of these files and recheck the seams when integrating.

## Readiness snapshot

`adapters/readiness.js` exports `worldFestivalContext(gameState)`. Pass an actual
fresh or restored game state, never an unvalidated raw save. It copies only the
fields in `docs/API.md`, calls the real `patchLevel`, `kitchenEquipment`,
`hollowReady` and `hayrideReady` functions, and mutates nothing. Returned arrays
and attraction objects are detached from the game state.

The session engine decides which facts satisfy an evening. Purchased visitor
event IDs mean owned upgrade levels, even if their invitation timer is disabled.
Kitchen capabilities require equipment placed in the unlocked kitchen; items
in storage or another room do nothing. Premium gear can supply the same
capabilities as several starter items. An empty pantry does not remove physical
capabilities: a player may already have cooked all needed food before starting.
Ingredient availability is therefore not a separate readiness requirement here.

## Paid food

`src/rules/cooking-sales.js`, `commitFoodForCustomer`: emit after its non-null
receipt return. The receipt has `{id, recipe, quantity, amount, at}` and follows
the real stock and finite-wallet debit. Its retained history is only 32 rows;
do not reconstruct session counters by polling the current receipt array.

Outdoor and indoor guests share the same payment function. Namespaces matter:
outdoor `visitor.id` and indoor `customer.id` are separate number spaces. Use
`visitor:12` versus `customer:12`. The outdoor wrapper sets `foodOwner` to make
the same distinction for holds. The current outdoor `takeaway` sale events use
`quantity:0`, so they cannot supply the true serving quantity by themselves.

For Midnight Court guests, outdoor courtiers carry `eventType:'vip'`, `courtier`
and `vip`, while indoor courtiers have explicit `courtier`/`vip` flags. The
separate red-suited big spender is not automatically the Midnight Court cohort.
The existing `vip-arrived` event alone is insufficient cohort evidence.

## Paid cocoa

`src/rules/cocoa-menu.js`, `payStandOrder`: emit only after a positive returned
payment, using the actual purchased order lines. Each line is one item. Orders
may contain a snack as well as a drink, so `order.length` is not the number of
qualifying cocoas. Filter by the theme's allowed product IDs.

`festival-cocoa` events already include `items`, including meadow refills. They
still need a stable transaction identity. A random identity assigned while
replaying an event defeats deduplication. Legacy stall mugs are a different
mechanism, disabled once Sandy's cocoa stand is present.

## Paid attraction completions

For the hayride, use the actual unloading completion in `src/rules/hayride.js`
before `replaceConvoy` replaces the run. Emit one outcome per paid manifest
member. The current `hayride-returned` event has an aggregate count and `runId`,
not all per-guest completion evidence. Payment at boarding is not a completed
ride. Snapshot route level from `c.routeLevel` at departure, with `runId`, the
manifest and queue time. Looking at current `s.hayride.routeLevel` at unloading
would incorrectly credit an upgrade bought while a wagon was already travelling.

`v.hayride.waited` is actual queue-phase time; it excludes approach and boarding.
Define the 45-second queue goal accordingly. Retained ticket history is capped
at 256, so use the confirmed transaction/completion seam rather than receipt
array length. A fright flag or `hayride.runHome` is not proof of final departure:
arrival-side riders can be frightened and still return to shop.

For the maze, use `maze → returning` in `src/rules/hollow-house.js`. Require
`m.charged`, capture its current `visitId`, and do so before a repeat visit can
assign a new ID. A repeat pays for a distinct visit, but the same guest still
counts once for a distinct-guest goal. Retained maze receipts are capped at 80.

## Final departures and garden harvests

The current game has no universal final-departure event. It has several real
departure paths: normal stall, maze-border, hayride-after-stall and meadow chat.
Indoor shop removal can hand a customer to dining rather than end the whole
visit. Add explicit authoritative final-departure hooks only when those
lifecycles are resolved. Never infer a happy finish from disappearance,
`leaveAt`, a renderer animation, an attraction return, saving or loading.

For gardens, wrap `pickGardenBed` in `src/rules/garden-crops.js`: capture the
bed decor ID/instance first, then count its returned `amount` only on a successful
non-false result. That amount includes crop overflow sold at the market. It
counts a genuine harvest, not proof that subsequently cooked food used those
ingredients. The pantry does not preserve ingredient origin. The current
harvest result has no permanent transaction serial; a future hook must allocate
and persist one after success.

## Pause, save and claim boundaries

`src/model.js`, `update`, returns before advancing `s.time` when paused. Advance
a session clock only using accepted simulation `dt`, never wall time or offline
elapsed time. Producers should attach the engine's session/window stamp when
the originating interaction begins and preserve it through delayed outcomes.

`saveData` strips ordinary visitors, shop customers, holds and diners. Restoration
clears those lifecycles and restores only selected attraction guests. Session
counters/deduplication therefore need their own serializable field; neither
surviving NPCs nor short receipt histories are a complete ledger.

New cocoa, harvest and departure hooks require stable transaction serials that
survive host save/restore. Claiming a cosmetic entitlement and committing its
physical ownership must be one host-owned persistence transaction, or the host
must resolve ownership from an idempotent set keyed by `grantKey`. This optional
module cannot make two unrelated host storage writes atomic.
