# Claude pickup — directional characters and lean Sandy

Start with [handover59](../../handovers/59-reviewed-owner-directions-and-lean-sandy.md).

Source branch: **`contractor/directional-character-atlases`**, based on lead
**`b387c85`**. This branch is deliberately unmerged while Claude continues the
main game. Inspect/apply on a clean review branch and reconcile shared files with
newer lead work; preserve the lead's uncommitted files.

There are independent commits for the pure direction contract, art review bench,
Sandy correction, owner art, working-action art, production inventory, integration
and verification. Sandy's correction can be reviewed independently of the owner
runtime. Do not cherry-pick just the runtime adapter without its manifest, page
registry, accepted WebPs and contract module.

The game remains a single offline HTML. The separate Canvas2D HTML is a sprite
review bench. Download-only branches contain packaged builds and patches and
must not be merged into source. The delivery manifest identifies the exact source
commit, base, game hash, native/browser checks and clean rebuild results.

The new batch covers everyday bodies first. **It does not complete every costume,
24 directions of every action, or a full pet gait.** Use the generated coverage
report and [production matrix](../../plans/directional-cast/PRODUCTION.md) for
remaining work. Rejected repeated-leg candidates must stay out of runtime.

`verification/` contains the reproducible coverage and browser reports. Large
generation PNGs remain under `docs/plans/directional-cast/` on the source branch;
the small patch omits rejected/source PNGs except the approved seed references
required by native asset tests. Fetch the full art folder before rebaking.

No economy/progression/save schema changes are part of this contract. State
version14 and all20 wardrobe IDs remain compatible. The root 2D game is untouched.
