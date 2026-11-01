# Claude pickup: late-game support, isolated from the live game

## Contract boundary

The user asked Codex to continue useful work without interfering with Claude's
active gameplay work. This delivery adds only
`voxel/docs/contractor-patches/late-game-support/`. It leaves all live systems,
assets, menus, progression, prices and saved-player data intact. No live import
points at this folder. There is no event runtime or reward grant to merge.

Source and patch base: `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`, the pushed
`voxel-reference` lead with handover 63 and the timed ride-camera work. The
pack was refreshed onto that lead before publication; it does not bring the
previous unmerged character branch with it. This is a reference commit, not an
instruction to reset the lead. Preserve unpublished work and check the latest
pushed lead first.

## Completed part 1: three real voxel rewards

`models/reward-props.js` builds genuine three-dimensional props using the existing
Three.js 0.169 and `Voxels` kit. Front, side and back are finished. The designs
interpret the matching painted artwork rather than billboarding it.

| ID | World footprint | Height | Model meshes |
| --- | --- | ---: | ---: |
| `contract-trophy-banquet-candelabrum` | 1.4 × 1.08 | 2.04 | 6 |
| `contract-trophy-moonlit-conservatory` | 1.56 × 1.18 | 2.10 | 19 |
| `contract-trophy-clockwork-hayride-theatre` | 1.60 × 1.20 | 1.64 | 7 |

The candelabrum flickers, a moth circles inside the conservatory, and a miniature
tractor and wagon travel the theatre's oval track. Animation uses absolute time
through `group.userData.tick(seconds)`, with no private frame loop. Build with
`{ animate: false }` for a resting pose. There are no added textures or lights;
the conservatory's glass uses a restrained single colour pass.

`buildRewardProp(id)` returns a `THREE.Group`. `REWARD_PROPS` supplies frozen
metadata. Native `width`, `depth`, `height`, measured resting bounds and
conservative animation bounds are available under `userData`. The origin is the
floor centre, +Y up and +Z front. Suggested grid occupancy is 2 × 2; integrate
through actual rotated placement bounds rather than blindly copying that grid.

Remove the instance from its scene, then call `userData.dispose()`. It releases
owned instance buffers, materials and glass geometries once. **Do not dispose
the shared cube geometry from the existing voxel kit.** The actual GL buffer
counts are checked across repeated model swaps in the preview.

If adopting the models first, register explicit decor catalogue IDs and an
adapter in the lead-owned furniture workflow; feed the bounds into placement,
rendering and selection, and tick only visible animated instances. Decide
whether these are cosmetic unlocks or purchasable furnishings. This pack has
made neither choice operational. See [model notes](../models/README.md).

## Completed part 2: six generated icons

`art/menu-icons.webp` is a transparent 576 × 384 atlas: three columns, two rows,
192-pixel cells. It is about 101 KiB. Row one contains the three Festival Night
emblems; row two contains the three corresponding reward illustrations.
`art/manifest.json` maps exact IDs, indices, crop bounds and SHA-256 values.
`art/source.png` preserves the generated source, and `art/review.jpg` is a visual
contact sheet. `tools/bake-menu-art.py` reproduces packing with Pillow, NumPy and
SciPy as preparation-only dependencies; it does not generate replacement artwork
or modify live assets. Those Python packages are not needed to open the preview
or use the finished models/icons.

These icons belong to this pack only. Crop the declared cells if incorporating
them into a future menu; do not replace unrelated existing menu atlases.

## Completed part 3: actual attraction evidence

`tools/audit-attractions.mjs` imports the real state, hayride, layout, progression
and attraction-footfall rules. It performs an 18-case study of route 0/1/2,
one/two tractors and £8/£12/£20 tickets. Every fixture starts fresh with the same
prepared tier 3, haunts, station crew, four offers per 30 seconds and £60 wallet.
Every ride purchase uses real purchase functions. House/restoration are prepared
fixtures, excluded from the reported ride capital.

`findings/attraction-audit.json` is a capacity comparison: it forces only the
willingness/value roll, preserving affordability, queues, boarding, ticket
payment, trips and return. `attraction-walk-in-audit.json` keeps actual walk-in
willingness/value choices. Neither models the complete farm economy. No natural
needs drift, production, food/cocoa/retail transactions, tips or automatic
invitation demand is simulated. The actual unload effects still apply.

Key conditional finding: tier 3 plus all eligible haunts is already 137 raw
scare, clamped at 100 before routes. In that configuration, routes extend the
paid circuit from 90 to 130 seconds without improving scare, the £20 ceiling or
standalone 30% footfall. At £12, one tractor completes 124 guests on the original
circuit and 92 on both detours during 30 simulated minutes; two tractors complete
224 and 180. All 12 paired detour comparisons have fewer completions in the
capacity fixture. This does not price the creative enjoyment of the longer POV
ride or predict real player progression time.

The current shared attraction-footfall cap also limits a fully fitted ride's
marginal permanent contribution to 10 percentage points after a fully dressed
maze and meadow already provide 65%. Its own invitations remain a separate
mechanism. Tickets spend the same guest purse used at later businesses.

Each result reconciles real guest debits, unique visit IDs, ticket sale events,
ride income, coin increase after capital and earned increase. Tickets sold,
completed trips and physically returned guests are separate at the exact time
horizon. A test crosses the live receipt-history limit of 256 without losing
income. Frightened flags are not treated as proof the guest actually left the
whole farm. Read [the complete method and limits](../findings/AUDIT.md).

Source provenance follows 67 actual static dependencies, including shared root
data, instead of hashing unrelated contractor sprite/UI files. The report also
hashes the auditor itself. The preview refuses stale evidence. If the lead's
rules change, rerun both audits and inspect the findings; do not restore old rules
to satisfy a hash.

Possible follow-up for the lead: give extended routes a meaningful benefit
beyond saturated scare, or reduce their service penalty. This needs walk-in and
whole-farm comparisons with wallets, queue frustration and downstream spending.
No such rebalance is included here.

## Proposed part 4: Festival Nights

`data/festival-themes.json` and [the content brief](FESTIVAL-CONTENT.md) propose
optional linked activities at levels 13, 15 and 18:

- Midnight Court Banquet: VIP hosting, existing high-value recipes and attractions.
- Lanterns in the Mist: cocoa, a warm welcome and optional kitchen-garden harvests.
- The Last Wagon: returned riders, takeaway snacks and efficient late-game service.

Each offers a choice of three goals from four and one permanent cosmetic prop.
The recipes, capability requirements and unlock references point at real content.
Preparation is untimed, operation is player-ended, offline play creates no
penalty, and no new currency is proposed. Twenty minutes and the goal counts are
unbalanced planning references, not completion promises or deadlines. Premium
equipment can satisfy the same kitchen capabilities as starter items.

**The event engine, invitation scheduling, counters, persistence, menu links,
reward ownership and actual grants are not implemented.** Keep that status clear
if copying the content into the main roadmap.

An eventual bridge should count authoritative completed transactions and visits,
deduplicate receipts and guest IDs, snapshot the route when a wagon departs,
sample happiness at final departure and award a theme's cosmetic once. Do not
count service animations, price quotes or an NPC vanishing offscreen as sales.
Use the existing finite purse, caps and invitation mechanisms. Add explicit save
migration and replay/load checks before making the content playable.

## Offline review and tests

The built workshop is self-contained HTML, separate from the game. It includes
real model orbit, pinch/zoom, front/side/back views, opt-in auto-turn, reduced
motion, safe-area layouts, the night briefs and the actual emitted comparisons.
It uses a 30 fps moving preview with DPR capped at 1.5, no bloom and one model at
a time. It pauses off-tab and supplies painted references if WebGL is absent.
Context restoration waits until Three.js finishes restoring its renderer before
rebuilding the model; a microtask alone is too early between DOM listeners.

Run commands are in [the pack README](../README.md). Evidence and its limits are
recorded in [verification](../verification/README.md). The workshop's browser
checks are not a new whole-game playtest or a real Z Fold 7 GPU benchmark.

## Selective application

Prefer the folder-only `late-game-support.patch` in the kit:

```sh
git apply --check /path/to/late-game-support.patch
git apply /path/to/late-game-support.patch
```

Or obtain the folder without merging the branch's earlier contractor history:

```sh
git fetch origin contractor/late-game-support-pack
git diff --binary f2f96f8351dea4cf6072862b1e3e0b14d6a318dc origin/contractor/late-game-support-pack -- voxel/docs/contractor-patches/late-game-support/ > /tmp/late-game-support.patch
git apply --check /tmp/late-game-support.patch
git apply /tmp/late-game-support.patch
```

The delivery manifest records actual patch application on that lead and a clean
committed-source rebuild.
Do not reset, stash, overwrite or merge Claude's working files to adopt this
folder. Review and integrate each live feature deliberately in lead-owned files.

The previous character contractor scope is still separate: broad costume/action
coverage and full 24-direction walking were not completed by this support pack.
