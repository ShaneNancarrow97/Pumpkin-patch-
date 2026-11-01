# Contractor module contract

This new folder implements a standalone Festival Night rule module. It imports
no live game state, browser, storage or clock. It does not install the feature in
the playable game. Existing theme counts remain draft/unbalanced.

```js
import { createFestivalEngine } from '../src/engine.js';
// Supply data/festival-themes.json from the previous late-game-support pack.
const engine = createFestivalEngine(definitions);
let state = engine.createState({ namespace: 'contractor-demo' });
const result = engine.reduce(state, { type: 'prepare', themeId }, context);
state = result.state;
```

All methods are pure. `reduce` returns
`{ state, accepted, changed, reason, effects }`; it never mutates its inputs.
`state` must come from `createState` or a successful `restore`. The module's
state/version is independent of the game's existing save version.

The active save also stores a goal-configuration revision marker. Changes to
targets, metrics, counting windows or conditions invalidate that active ledger
with a warning on restore; valid permanent ownership remains intact. Label or
row-order edits do not discard progress. This marker is not an anti-cheat
signature. The host remains responsible for immutable authoritative outcomes.

## Public methods

- `createState({ namespace = 'festival' } = {})`: new serializable version-1 state.
- `readiness(themeId, context)`: `{ unlocked, ready, missing:[{id,label}] }`.
  Selecting an evening only needs its patch level; starting needs all listed
  requirements and prepared attractions open for service.
- `reduce(state, command, context = {})`: the command transition described below.
- `stamp(state, context = {})`: `{ sessionId, window:'preparation'|'service' }` for an active,
  unpaused session, or null. Capture this when an interaction begins and carry it
  into its eventual confirmed outcome. Global `context.paused` also returns
  null. Never retag a late completion on receipt.
- `view(state, context = {})`: read model for the preview/integration.
- `save(state)`: plain snapshot, with running sessions saved as paused. No wall time.
- `restore(raw)`: `{ state, compatible, warnings }`. Absent data starts fresh;
  unsupported or unsafe permanent data returns `state:null, compatible:false`.
  Preserve the original host field in that case. Corrupt active progress may be
  dropped while keeping valid permanent ownership, with explicit warnings.
- `entitlements(state)`: unique claimed `{themeId,rewardId,grantKey}` records.

The world `context` is an allowlisted read-only snapshot:

```js
{
 level: 18, houseLevel: 3, kitchenPurchased: true,
 kitchenCapabilities: ['hob','pot','oven','tray','spice'],
 knownRecipes: [], visitorEventIds: ['vip','rush'], cocoaTier: 3,
 gardenDecorIds: [],
 attractions: {
  'hollow-house': { ready: true, tier: 5, open: true },
  hayride: { ready: true, tier: 3, routeLevel: 2, open: true }
 },
 paused: false
}
```

`adapters/readiness.js` will export `worldFestivalContext(gameState)` using real
current level/equipment/readiness functions, without changing the game.

## Commands

| Type | Fields | Meaning |
| --- | --- | --- |
| `prepare` | `themeId` | Allocate a monotonic session token; begin untimed preparation. Requires no other active evening and the theme's patch level. |
| `start` | — | Begin service after current requirements pass. |
| `pause` | — | Pause service; preparation already has no clock. |
| `resume` | — | Resume manual/restored service, unless globally paused. |
| `tick` | `seconds` | Add accepted simulation dt only while running. Finite 0–60 seconds per call; no offline catch-up. |
| `outcome` | `event` | Count an authoritative normalized outcome, never a renderer notification. |
| `end` | — | Finish at any time. Any 3 of 4 goals completes the evening; otherwise end without penalty. Archive up to 12 summaries and release the active session. |
| `claim` | `themeId` | Record the earned cosmetic entitlement once. Repeats never produce another copy. |

All four goals progress automatically. There is no mandatory up-front goal choice
or deadline. A suggested duration never ends or fails the session. Global pause
blocks `tick`, `outcome`, `start` and `resume`; claiming/ending remains possible.
Manual pause also blocks outcomes and time. A paused producer must retry a valid
queued outcome after resuming; the engine does not retain rejected outcomes.

## Normalized outcomes

Every event includes a stable nonempty string `id`, plus the captured `sessionId`
and `window` returned by `stamp`. Service outcomes require `window:'service'`;
only garden harvest can count during preparation. All guest IDs are namespaced
strings such as `visitor:0` or `customer:0` so the two number spaces never collide.
No random ID may be minted when replaying an outcome.

| `kind` | Additional fields |
| --- | --- |
| `food-sale` | `source:'food'`, `guestId`, `recipeId`, positive integer `quantity`, positive finite `amount`, optional `cohort:'midnight-court'` |
| `cocoa-sale` | `source:'cocoa'`, `guestId`, `lines:[{productId,quantity}]` (max 32), positive finite `amount`, optional `cohort` |
| `ticket-sale` | `source:'hollow-house'|'hayride'`, `guestId`, positive finite `amount`, optional `cohort` |
| `attraction-completed` | `source:'hollow-house'|'hayride'`, `guestId`, `paid:true`, positive finite `paidAmount`, `queueSecondsAtBoarding` (finite ≥0), and for hayride `routeLevelAtDeparture` (0–2) |
| `final-departure` | `source:'farm-visit'`, `guestId`, `final:true`, `happiness` (0–100), `outcome:'normal'|'frightened'` |
| `garden-harvest` | `source:'garden'`, `bedId`, positive integer `quantity` |

Amounts/quantities must be finite; integer quantities are bounded at 1,000,000.
Guest/event/product identifiers are bounded strings. Unknown or malformed
outcomes never alter progress. A paid ticket can advance a VIP serving goal but
is not a completed attraction visit. A completed guest counts once per applicable
distinct-guest goal even across repeat visits and different attractions.

Counters cap at each goal's target. Each goal retains only contributing event
keys and, for distinct-guest goals, contributing guest IDs. Each record advances
at least one integer unit, so the state is naturally bounded by target counts,
without a rolling dedupe window that would let old receipts count again.

## View data

`view` returns:

```js
{
 active: null /* or {
   id, themeId, phase:'preparing'|'running'|'paused', elapsedSeconds,
   goals:[{ id,label,unit,value,target,done }],
   completedGoals, requiredGoals:3, canFinish
 } */,
 themes: [/* {id,name,level,rewardId,completed,claimed,readiness} */],
 pendingRewards: [/* {themeId,rewardId,grantKey} */],
 ownedRewards: [/* {themeId,rewardId,grantKey} */],
 history: []
}
```

## Cosmetic persistence boundary

`claim` adds one entitlement and emits one `festival-reward` effect with a stable
`grantKey`. It does not imperatively add live furniture or spend/award coins.
The host must persist entitlement and physical ownership atomically, or resolve
ownership from an idempotent set keyed by `grantKey`. Replaying `addItem()` after
a crash is unsafe. Repeated commands and save/restore preserve one entitlement;
this module alone cannot make two independent host storage writes atomic.
