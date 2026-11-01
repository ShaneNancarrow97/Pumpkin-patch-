# Recorded verification

**81 individual native cases pass across 13 files**, including 57 new module,
readiness, integration, preview-build and dependency-tool cases and 24 previous
support-pack cases. `native-tests.json` records each file's actual case counts,
exit status and source/log hashes; `native-tests.txt` retains the assertions.
There are no failures, skips, cancellations or missing summaries.

`tools/run-native.mjs` executes each test file directly and requires both its
assertion summary and successful process status. Missing captured output or a
subprocess error fails validation rather than treating a file-only result as
complete evidence. Run it with `--include-support` to reproduce the combined set.

The exact final self-contained demo passes **80 browser assertions** with no page
errors, external requests or game-storage writes. `browser/checks.json` pins the
HTML hash and nine exact exercised input files. Thirteen screenshots accompany
the run. Root visually inspected the phone and landscape hosting views after
moving the book/actions above the invitation on small screens.

Browser coverage includes all three actual module lifecycles and claims,
readiness gates, keyboard activation, manual/global pause and retry, persisted
replay protection, old-session rejection, route/wait snapshots, cocoa snack
filtering, corrupt/future JSON recovery, exported snapshot equality and
phone/unfolded-style/landscape layouts. Touch targets, overlap/overflow and
phone/fold first-action visibility are checked. It is a synthetic-outcome module
demo, not a live-game playtest or physical Fold/PS5 benchmark.

`current-impact.json` is the actual semantic assessment for current source paths:
six domains directly affected, six current check groups, 24 future integration
check groups, no unmapped paths. All current groups are covered by these native
and browser runs. Future groups remain adoption work because the module has no
live consumer. The planner never executes its suggested commands.

`import-impact.json` uses esbuild's actual parser over 350 modules. It records
reverse consumers, source hashes, scanner/lock hashes and the contractor boundary.
Twenty-one changed tooling/template/style/document paths are unrepresented in
the import graph and are reviewed through the semantic matrix. Unrepresented is
not a safe classification. The reviewed matrix contains 27 domains and 81 links;
its evidence paths, cycles, conditional edges, unknown-path handling and rendered
Markdown consistency are checked by native tests.

The delivery manifest adds actual incremental/combined patch application,
individual-case native reruns, exact demo rebuilds, parsed isolation checks and
production-build equality with the declared live lead. These final records live
alongside the download artifacts to avoid self-referential source-commit hashes.

No paid transactions, guest lifecycles, visit accounting, inventory grants,
invitation pacing, save migration or controller integration is installed by this
module. Those require the explicit hooks, idempotent/atomic ownership and
whole-game checks listed in the handover and dependency assessment.
