# Impact assessment for this contractor increment

Reference live lead: `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`.
Incremental source base: `855f29cc7969883268c6313b13eee06e4339a6f8`.
Only the new `festival-session/` contractor folder changes in this increment.
The combined delivery includes the earlier isolated `late-game-support/` folder.

Use the [dependency matrix](DEPENDENCY-MATRIX.md) and its read-only planner before
editing these areas. The generated impact report in `verification/` records
direct matches, downstream possibilities and suggested checks for current paths.
This assessment distinguishes current module checks from future live integration.

The recorded assessment covers all **24 source/documentation paths** in this
increment: six directly affected domains, six current check groups and 24
additional check groups conditional on live integration. The semantic map has
no unmapped current paths. The parsed view covers 350 modules; 21 tooling,
template, style or documentation paths are outside that import graph and are
therefore reviewed through the semantic map. The contractor import/scope check
passes; this is not a general safety approval.

| Current change | What it can affect | Invariant / selected verification |
| --- | --- | --- |
| Session lifecycle and simulation clock | Pause, preparation, delayed outcomes, save reload | Time/outcomes freeze on manual/global pause; no preparation timer, offline catch-up or hidden deadline; end without penalty. |
| Receipt/guest counting | Goal progress, repeat visits, multiple purchases, finite-wallet interpretation | One first receipt can advance several goals, replay cannot add again; guests are namespaced and distinct; no new purse, money or sales generated. |
| Route/queue conditions | Late-game route goals and service scoring | Count only actual paid completions from captured departure route/boarding wait; ticket payment and free ride do not complete a goal. |
| Snapshot and goal configuration | Active progress, once-only ownership, future tuning | Keep dedupe across reload; return service paused; preserve permanent ownership on corrupt active data; reject unsafe future payloads without replacement; changed metric/target conditions invalidate active ledger. |
| Cosmetic entitlement | House ownership and placement on adoption | One stable grant key per theme, no cash/stat bonus. Actual inventory/claim must be atomic or idempotent in the host; not implemented in live house. |
| Readiness adapter | Home-level gates, placed equipment, recipe research and purchased attractions | Use real patch level and kitchen capabilities; stored/wrong-room gear is excluded; open/restored/tier/route facts are separate; no purchases or unlocks are performed. |
| Review UI and reused icons | Readability, keyboard/touch interaction, responsive layouts | Test real demo controls and all three themes, save/error/replay states, phone/fold/landscape geometry and offline requests; no live camera/input or art change. |
| Matrix and impact tool | Future change review and test selection | Verify evidence/check paths, direct and transitive edges, cycle handling, conditional dependencies and unknown-path warnings; output commands only, never execute them. |
| Parsed import scanner and scope check | Real source/asset consumers and contractor isolation | Verify reverse direction, cycles, path containment, unknown paths and detection of a literal live import; pair the actual graph with semantic links rather than claiming an exhaustive safety proof. |

The native files cover basic lifecycle/readiness, adversarial persistence and
replay cases, three actual-rule payment/harvest/ride fixtures, isolated preview
building and the matrix planner. Browser checks cover the exact final offline
demo. Final counts and hashes belong in `verification/README.md` and the delivery
manifest, rather than being inferred from this list.

For the present scope, existing-game source and assets are unchanged. Clean
production builds of the declared lead and final source are compared byte for
byte. That establishes no added live runtime, economy, input, save or rendering
behaviour; it is not a substitute for live playtests once Claude wires the module.

Before that future integration, re-run impact planning for every actual hook,
save field, inventory change, menu and invitation path. Then verify whole-farm
wallet/stock conservation, genuine final departures, attraction capacities,
state restoration, controller menus, physical prop placement and frame/resource
budgets. The pure module demo does not validate those installed behaviours.
