# Claude pickup: Festival Night module and dependency impact planning

## Contract boundary

The user asked Codex to continue independently of Claude's active gameplay work,
then explicitly asked for a dependency matrix to assess what changes affect.
This increment supplies a usable isolated module, a review demo and an impact
workflow. No live game file, economy, renderer, save migration, input system or
existing asset has changed.

Source branch: `contractor/festival-session-module`.
Incremental base: `855f29cc7969883268c6313b13eee06e4339a6f8` (previous support pack).
Combined patch base: `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc` (current pushed lead,
with the timed ride camera in handover 63). Preserve any newer/private lead work.

## Completed: deterministic session rules

`src/engine.js` exports `createFestivalEngine(definitions)`. Bind the existing
three-theme JSON from `../late-game-support/data/festival-themes.json` once, then
use `createState`, `reduce`, `view`, `stamp`, `readiness`, `save`, `restore` and
`entitlements`. See [the exact API](API.md).

The session runs through preparation, service, manual pause/resume and explicit
end. Any three of four goals succeeds; all four progress without locking a
choice up front. Preparation is untimed. Operational time advances only from
accepted simulation dt, never a wall clock, countdown or offline catch-up.
Global pause also blocks progress and clock updates. An incomplete evening ends
without a penalty or farm reset.

Only normalized confirmed outcomes count: actual food/cocoa payment, a paid
attraction completion, a genuine final departure or a successful garden harvest.
A ticket payment can serve a Court guest but cannot complete an attraction goal.
The regular monocled big spender is not automatically a Midnight Court guest.
Owner ride-alongs and guests merely vanishing never count.

Each interaction carries its original session/window stamp into completion.
Guest IDs distinguish `visitor:0` from `customer:0`. Contributing receipt keys
are retained per goal, with distinct guests additionally deduplicated. One first
outcome may advance several goals; replay cannot retag that counted receipt into
a different goal. Counters cap at their target, bounding contributing records by
the sum of targets (at most 50 rows for the current themes) without a rolling
dedupe eviction hole. Recent history is capped at 12 summaries; permanent
completion and ownership are kept separately.

Hayride outcomes use route level captured at departure and queue wait captured
before boarding. Buying an extension during a trip does not change its goal
credit. The actual route's service/economy tradeoff remains a lead-owned balancing
decision; this module does not apply the previous audit's suggested options.

## Persistence and claims

This module has its own version-1 serializable state, separate from the game's
save version. Saving running service produces a paused snapshot. Reloading
retains progress, receipt keys and session identity; no elapsed offline time is
added. Unknown future schemas or unsafe permanent ownership return
`compatible:false, state:null`: preserve the original host field rather than
silently saving an empty replacement. Corrupt active progress is dropped with a
warning while valid earned/claimed cosmetics remain intact.

A goal-configuration marker protects active ledgers when targets, metric kinds,
windows or conditions change. Label/ordering edits preserve progress. This is a
revision check, not anti-cheat authentication of player-edited files.

Finishing at least three goals and ending the evening earns a claim. Claiming
records one entitlement and emits a stable `festival-reward` grant key. Repeats
never create another entitlement or any coins. **There is no imperative
`addItem` call into the real house inventory.** Persist ownership and the claim
in one host transaction, or resolve ownership through an idempotent set keyed by
`grantKey`; two independent writes are not made atomic by a pure reducer.

Use a stable per-save namespace when creating the feature state, stored alongside
it. A host may generate that namespace once when initializing the optional
field. Keep original stamps on delayed outcomes; never mint a new session token
for an old callback or re-create unique transaction IDs during replay.

## Completed: read-only readiness and real-rule integration tests

`adapters/readiness.js` exposes `worldFestivalContext(s)` for a valid fresh or
restored game state. It uses actual claimed/home-gated patch level, placed kitchen
capabilities, learned recipes, purchased guest-event upgrades, cocoa tier and
restored/open attraction facts. It does not infer a level from earnings or count
equipment in storage/another room. Premium equipment can satisfy several needs.

Selecting a theme needs its patch level. Starting service checks the full current
preparation, including attractions open for guests. Food stock is a preparation
decision, not an invented currency or readiness grant. No readiness query buys,
restores or unlocks anything.

Three private-fixture tests also use actual food payment, garden harvesting with
overflow and paid extended-hayride rules. They demonstrate the receipt/quantity
and route/wait contracts without changing real-world state in the reducer. These
tests prepare developer state explicitly; they are not player-time/economy
forecasts. Read [HOOK-SEAMS.md](HOOK-SEAMS.md) before connecting live events:
the current generic sale/return stream is insufficient for all metrics, receipt
histories are bounded, and there is no universal final-departure event.

## Completed: dependency matrix and impact workflow

The [versioned dependency matrix](DEPENDENCY-MATRIX.md) records reviewed semantic
links alongside real path/check evidence. It covers progression, money and
stock, visitors/needs/pathing, kitchen equipment/recipes, house placement,
attractions and ride timing, saves, controls, art/UI/performance and this module.

The read-only impact planner identifies directly changed domains, follows
downstream links through cycles, lists the invariants at risk and suggests
concrete checks. Conditional future integration is distinguished from active
runtime consumers. Unknown/unmapped paths require review; an empty match is not
evidence of safety. This curated map does not claim to discover every dynamic or
cross-system dependency automatically.

`tools/dependency-scan.mjs` adds a second layer using esbuild's real import parser,
including literal dynamic imports and asset edges. It follows reverse consumers
through cycles and checks whether changed contractor files enter the parsed live
entry's import closure. `--base <pinnedSHA>` uses committed Git changes and
`--contractor-only` fails on a scope leak. It compiles for metadata without
executing game modules or writing a game artifact. Templates, assembled CSS,
runtime-computed names and semantic/economic links remain explicitly outside the
import proof. Unrepresented paths are reported for review, not marked safe.

Use the same workflow for future contractor work: enumerate changed paths, run
the planner, inspect downstream consequences, select checks for the actual scope
and record both completed checks and integration work left to the lead. The
[current assessment](CHANGE-IMPACT.md) applies that process to this increment.

## Completed: offline module demo

`Pumpkin-Patch-Festival-Nights.html` is a small self-contained DOM review demo.
It uses the existing generated theme/reward icons and actual module transitions.
It exercises all three themes, four progress rows, pause/resume, JSON snapshots,
duplicate/old receipt rejection, end/claim and the cosmetic cabinet. Test controls
are explicitly synthetic. No real game save, guest wallet, store stock, visitor
spawn, physical furniture grant or live event is touched.

Phone/fold/landscape layouts, keyboard focus, touch targets and reduced motion
are checked. Those browser emulations do not validate a physical Fold 7, Bluetooth
controller or OS file handler. The future live menu must join the current
`pad-menu` selectors and input ownership rules; the separate demo is not a claim
of native PS5 integration.

## Still lead-owned before shipping

- Add an optional host save field/migration, handling incompatible payloads
  without overwriting them; persist claims atomically with actual decor ownership.
- Add explicit authoritative payment/completion/final-departure/harvest hooks,
  stable transaction serials and namespaced guest identity. Preserve stamps and
  route/queue snapshots, and queue valid outcomes across pause boundaries.
- Add the in-game board/menu, controller navigation, invitations and visitor
  pacing within existing caps and wallets. A themed night does not spawn a
  second purse or bypass affordability.
- Register the previous pack's real voxel props with measured placement bounds.
- Tune the proposed level 13/15/18 goals through whole-farm playtests. This engine
  verifies counting/lifecycle semantics, not difficulty or completion time.

## Apply and verify

Use `festival-session-incremental.patch` only after the previous support pack.
Use `festival-session-combined-from-lead.patch` on the declared clean lead when
that pack is absent. Run `git apply --check` before applying; choose one patch.
The combined patch adds only the two contractor folders. Do not merge the
artifact/download branch, reset Claude's worktree or overwrite private changes.

Commands are in [README.md](../README.md). Recorded scope and results are in
[verification](../verification/README.md); delivery manifests pin source, patch,
offline HTML, clean/applied rebuild and ZIP hashes. The current game build remains
byte-identical to the declared live lead.
