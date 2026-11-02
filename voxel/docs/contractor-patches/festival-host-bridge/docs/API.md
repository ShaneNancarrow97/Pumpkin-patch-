# Confirmed-outcome host bridge

Optional contractor code; no live hooks or existing save key are changed.
This increment connects the existing engine to confirmed rule results and a
durable, bounded outbox. Actual furniture registration/grants remain lead-owned.

## Factory and state

`src/bridge.js` exports `createFestivalBridge(definitions, { capacity=256 }={})`.
The instance exposes the existing `engine` plus pure methods below. State is
`{ version:1, nextSerial:1, festival:engineState, pending:[] }`.

- `createState({namespace='festival-host'}={})` creates a fresh bridge.
- `bind(state, context={})` allocates one monotonic outcome identity and captures
  the engine's current `{sessionId,window}` stamp. Returns
  `{state,binding,accepted,reason}`. No active/unpaused session => binding:null.
  Binding is `{id,sessionId,window}`; retain it when an interaction begins.
- `enqueue(state, outcome)` stores a detached normalized outcome. Returns
  `{state,accepted,changed,reason,retryOutcome}`. Queue full never silently drops
  or invents a payment: it returns the original fact for retry. A synchronous
  producer must preflight/flush available capacity before performing its rule
  operation, and handle rejection without recharging the guest.
- `flush(state, context={})` feeds queued outcomes into the existing engine.
  Manual/global pause retains the queue. Stale-session or malformed facts are
  explicitly rejected in the returned report; valid duplicate/no-progress facts
  are consumed without extra credit. Returns `{state,delivered,rejected,held}`.
- `dispatch(state, command, context={})` forwards lifecycle/tick/claim commands
  to the engine. `end` with pending facts requires flushing first, or explicit
  `discardPending:true` to abandon them. Returns the engine-style transition.
- `view(state, context={})` returns the normal engine view plus
  `outbox:{pending,capacity,free}`.
- `save(state)` produces a snapshot with the engine saved paused.
- `restore(raw)` returns `{state,compatible,warnings}`. Unknown future data is
  preserved by the caller; corrupt pending data is never turned into rewards.

Only the engine's official normalized outcome fields are retained. Outcomes and
bindings are values, not live references to visitors or receipts. Capture a
binding at the originating interaction; never generate a fresh stamp while
replaying an old transaction. Fresh game/profile initialization needs a stable
per-save namespace. IDs and queues survive explicit save/restore.

## Confirmed-outcome adapters

`adapters/outcomes.js` exports pure helpers. Each returns an engine-normalized
outcome or null for invalid/non-confirmed input. `binding` is from `bind()`.
Guest identity is `{namespace:'visitor'|'customer', guest}`; a real Court guest
uses `guest.courtier===true` (ordinary big spenders do not count as Court).

- `foodOutcome(binding, receipt, identity)`: real non-null
  `commitFoodForCustomer` return `{id,recipe,quantity,amount,at}`.
- `cocoaOutcome(binding, {amount,items}, identity)`: positive actual
  `payStandOrder` return and the committed order lines `{id,price}`. Every order
  line is one item; snacks stay identifiable for the engine to filter.
- `gardenOutcome(binding, {bedId,result})`: successful `pickGardenBed` return
  with positive `result.amount`. Deliveries and failed picks are not harvests.
- `ticketOutcome(binding, {source,receipt}, identity)`: confirmed paid receipt
  from `hollow-house` or `hayride`, never a quoted/admission amount.
- `captureHayrideDeparture({convoy,visitors})`: immutable snapshot of actual
  departing `convoy.runId`, `routeLevel`, paid manifest and each matching visitor's
  queue wait. Missing or inconsistent evidence returns null. No current route
  upgrade is read later.
- `hayrideCompletionOutcome(binding, departure, {visitId,completed}, identity)`:
  one paid passenger only after actual completed unloading, using captured route,
  receipt amount and waiting time. A ticket alone is not completion.
- `mazeCompletionOutcome(binding, {visitId,charged,amount,completed,queueSecondsAtBoarding}, identity)`:
  explicit paid maze completion, before a repeat visit reassigns its ID.
- `departureOutcome(binding, {final,outcome,happiness}, identity)`: explicit
  authoritative final departure. Disappearance, saving/loading and ride return
  are not such evidence. No universal departure detector is supplied.

Food/ticket facts use their existing stable receipt/visit identity in the outcome
ID in addition to the original session stamp. Cocoa/harvest/final-departure facts
use the allocated binding ID, since the current game has no durable receipt
serial for those operations. Reuse the same binding on retry.

## Real-rule lab

`lab/scenario.js` exposes a small private fixture runner using actual game
rules. This is a developer service lab, not a new game release. It prepares
developer state explicitly and never reads a player save or claims balanced
session timing. Prices, stock, payments, guest wallets and queue/ride outcomes
come from the real rule functions.

Lab API:

- `createLab()` returns a mutable lab controller owning private `world`, `bridge`
  state and an engine bridge instance; no global state or storage.
- `prepare(themeId)` / `start()` / `pause()` / `resume()` / `end()` / `flush()`.
- `serveFood()` / `serveCocoa()` / `harvest()` / `runRide()` perform real private
  rule operations, normalize outcomes and enqueue them. Food serves the current
  theme's first recipe. `runRide` completes one real paid visitor trip with its
  actual time steps and departure snapshot. No fabricated final departures.
- `setDeferred(boolean)` controls whether a successful operation automatically
  flushes its outbox, for pause/save/replay tests. `replayLast()` reuses exact data.
- `snapshot()` / `restore(snapshot)` persist only this lab's private game/bridge
  envelope, using the real game serializer/restorer where appropriate.
- `view()` includes engine view, ledger rows, balances, recent operation result
  and a concise disclosure of developer fixtures and simulation scope.

The browser exposes documented diagnostics through `window.FestivalBridgeLab`,
including the private controller, actions, current view and motion bookkeeping.
All UI should label real-rule/private-fixture operations clearly and distinguish
payment from delivered Festival Night progress.

## Read-only action offers and presentation (refinement 2)

`lab/offers.js` exports `serviceOffers(world, theme, {previewSelection=false}={})`. It returns
`{food,cocoa,garden,ride}`, each with `available`, `label`, `reason`, `amount`
(current quote or null), and `quantity`. Food includes `recipeId`/`stock`, cocoa
includes detached `items`, garden includes only `phase` without a promised yield,
and ride includes `routeLevel`/`circuitSeconds` (not a total trip-time promise).
Active offers follow the actual displayed recipe, including restored checkpoints.
Only idle selection previews explicitly override the copied display. The food
quote and ride planner mutate only a structured clone. Calling this
helper does not reserve real food, allocate a real visit, pay, bind or tick.
Lifecycle and outbox capacity are separately gated by the UI. Quotes can change
with stock and the next guest ID; payment still comes from the later real rule.

`preview/service-state.js` exports
`serviceState(labView, selectedThemeId, {worldPaused=false}={})`. It derives stage,
status, title, next step, objective summary, primary action and optional completion
presentation. A completed inactive theme retains its earned3/3 summary, while
individual old goal rows are hidden rather than fabricated. A repeat attempt
uses fresh actual goal progress. It executes no rules and mutates no state.

Delivery inspection is a collapsed native details element. Pending facts expose
a direct service-level Deliver action; it invokes the existing flush, never a
payment. Goal progress and committed receipt feedback stay near the touch actions.
A successful completed evening alone triggers a short keepsake reveal. Reduced
motion suppresses it. The lab remains optional and separate from the live game.
