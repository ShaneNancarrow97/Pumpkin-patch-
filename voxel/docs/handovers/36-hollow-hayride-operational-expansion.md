# 36 — The Hollow Hayride: playable operational expansion

For **Claude, the lead developer**. Branch: `contractor/hollow-hayride`, based on published `voxel-reference` **`d98db5989091975391a20ce3e4d56aa58fbc3ccb`**, following [handover 35](35-claude-controls-phantom-music-and-split.md). This implements the first operational release of [the hayride plan](32-haunted-hayride-roadmap.md). The user explicitly asked to build the expansion after your latest update.

The rebuilt Hollow House, your decorating gestures, crisp sprites, camera zoom and sixteen-track music selection remain in this baseline. No root 2D files, new runtime dependencies or full-size concept sheets are added to the bundle.

## What the player can do

- At patch **level 8**, after restoring The Hollow House, **purchase** the clearing and complete starter ride for **£7,500**. The unlock grants permission to buy; it does not spend money automatically.
- Walk through the new western boardwalk to a woodland station, fenced queue, rear-loading wagon and separate unloading apron. Tap the station or use **Attractions → The Hollow Hayride**.
- Open/close admissions, change ticket price, watch guests queue and climb into the wagon, and watch the coupled tractor depart, complete its loop and return.
- Buy capacity tiers and additional scare effects. More scare increases appeal, guest willingness to visit and terror; nervous riders can head home after unloading.
- Take a **free owner ride-along**: a rear-boarding introduction, seated wagon camera, drag to look, five scene cues, sound/gentle controls, pause/resume, replay and immediate Exit. This preview has no guest, seat hold, ticket or reward in the live simulation.

Every base scenic set is present: pumpkin scarecrows, a spider tunnel, a ruined mansion and bride, investigators repelling a purple gas ghost, and a zombie prison bus. These are native voxel first-pass sets with recognisable silhouettes. Purchased effects turn heads, lower the spider, move the bride, swell the ghost and lurch a bus zombie. Further authored scare sprites, set dressing and cinematic polish remain worthwhile follow-on work.

## Site ownership and your reserved layout work

**Read [handover 37](37-off-map-hayride-takeover.md) for the final off-map presentation.** Only the station is on the farm. The forest circuit now belongs to a dedicated POV scene; the older full-clearing captures are historical.

Handover 35 reserved the woodland site for you; no site handover had been published when this contractor work began. The user's new instruction authorised building the expansion now. To keep that overlap explicit, the provisional site is isolated in **`content/hayride-layout.js` and `hayride-world.js`**. Your `world.js`, Hollow House exterior, foyer and rebuilt maze modules are unchanged.

The final farm station occupies **X −23.5…−8, Z 11…44**, west of the existing public farm. The **X −51…−8, Z 1…40** woodland route exists in a separate off-map scene. A raised boardwalk joins the existing west pedestrian lane at **(−3,17)** through a bounded gate near **(−7.6,17)**. Only fence/tree boxes above 0.3 in that gate strip are removed from the existing static mesh; terrain is retained. The new controller never replaces `world.ground`, avoiding the meadow/farm expansion identity conflict. Camera pan limits extend west when the clearing is owned; default farm framing stays familiar and View station focuses the new area.

The shared layout owns station/queue/unload positions, clockwise route samples, encounter distances, pedestrian routes, poses and clearance data. Counter walks use each guest's `counterPlace(spot)` and the visible lantern walk. Only actual farm-gate waypoints move with farm expansion; the woodland platform and apron stay fixed. If your next site uses different coordinates, reconcile this one module and its gate attachment rather than layering two ground controllers. Preserve the operations and saved route-version repair contract.

## Economy, upgrades and timing

| Tier | Patch gate | Purchase/upgrade | Seats / queue | Ticket band | Boarding |
| --- | ---: | ---: | --- | --- | --- |
| First fearful circuit | 8 + restored Hollow House | £7,500 | 4 / 8 | £4–£12, default £8 | 1.5s per guest |
| Lantern convoy | 10 | £6,500 | 6 / 12 | £4–£16 | 1.25s per guest |
| Midnight procession | 12 | £14,000 | 8 / 16 | £4–£20 | 1s per guest |

The tractor/wagon gain visible brass detailing, plum trim and extra pumpkin lanterns at higher tiers. The footprint remains bounded; extra places are arranged along the benches. Queue capacity and boarding speed improve alongside seats.

Scare purchases: Watching scarecrows **£900/+12**, Spider descent **£1,400/+14**, Bride's procession **£2,200/+17** (tier 2), Spectral pursuit **£3,200/+18** (tier 2), Prison bus breakout **£4,500/+20** (tier 3). Owned effects can be toggled. Base scare is 20/28/36 by tier, capped at 100. Open hayride footfall is scare × 0.3%; combined permanent Hollow House/hayride appeal caps at **75%**. Existing harvest boosts and arrival floors remain in place.

One convoy has a **90-second circuit**, plus departure, arrival and unload phases. It departs full or 15 seconds after the first boarding, never empty. Closing turns back unpaid guests but finishes paid rides. Opening invites two guests within the existing global visitor limit, with a saved 120-second cooldown; reopening cannot mint an unlimited arrival stream. Queue patience allows a full trip to return.

**Payment happens once, at a real free seat.** Queueing records the quoted price but earns no money. Boarding atomically changes the same guest's purse, seat manifest and ticket receipt; repeat calls cannot charge again. Unspent wanted-pumpkin money and existing payment/stock holds are protected. Ticket income and admissions have their own ledger; pumpkin item counts and separate tip statistics are unchanged. More expensive tickets deter guests rather than creating richer wallets.

Guest phases are `approach → queue → boarding → riding → unloading → return`. The same guests continue shopping or visibly walk home. Riders occupy their existing global capacity reservation. Closures and rejected admissions begin the exit from the guest's actual pedestrian position. Unloaded guests continue from the apron, and saved return paths preserve their place after reload.

## Runtime and integration hooks

| Files | Responsibility |
| --- | --- |
| `content/hayride.js`, `rules/hayride.js` | Purchase, tiers/scares, willingness, FIFO queue, boarding receipts, authoritative convoy clock, outcomes and restore validation. |
| `content/hayride-layout.js` | Pure site, route, pedestrian poses/return plans, stable queue places and convoy articulation samples. |
| `hayride-world.js`, `hayride-vehicle.js`, `hayride-forest.js`, `hayride-scares.js` | Compact farm station and separate off-map scene, two independent visual convoys, dense forest, original detailed scare art and fixed local lights. No renderer callback spends money. |
| `hayride-view.js`, `ui/hayride-ride-ui.js/css` | Transient owner clock/camera, bounded look, shallow fog, briefing, pause, completion and Exit. Uses the existing renderer/canvas and audio lifecycle. |
| `ui/hayride-sheet.js/css` | Compact context card, one management page, price controls, upgrade path, collapsed scares/accounts. |
| `model.js`, `rules/selling.js` | Fresh/restore/save version 11, once-per-update attraction clocks, same-guest shopping suspension, opening-party flags and combined footfall. |
| `scene.js`, `main.js`, `build.mjs` | World picking, rider rendering, farm pan extension, owner camera/input/audio ownership, menus and inline CSS. |
| `ui/guest-card.js`, `rules/guest-needs.js`, `ui/farm-sheets.js`, `ui/hollow-sheet.js` | Intent/terror inspection, visitor/appeal text and the second attraction in the existing list. |

The owner clock caps a long visual frame so a whole encounter cannot vanish in a jump. Autonomous rules advance separately and continue in other rooms under the existing tea-break policy. Owner view uses its own visual convoy and scene, hides ordinary guest models, then restores the live farm view, fog, camera/input and music gain on Exit. Gentle motion suppresses the new optional scene motions. No second WebGL context or external asset fetch is introduced. Widely spaced lightning flashes and delayed thunder are owner-only; gentle mode disables flashes and lunging.

## Saves and migration

State version **11** adds `hayride` and `hayrideVisitors`. Older saves start with the attraction unowned and their existing farm/house progress retained. Persistent state contains ownership/tier, price/scares, opening cooldown, convoy phase/progress, paid seat manifest, receipts and active visits/return paths. Restoring rejects invalid/duplicate guest, visit and seat records, reconciles the manifest and resumes paid riders without another debit. Ordinary transient shoppers keep their existing save contract.

Preserve the existing freshness, wanted, neighbour orders, introduction, house/rider placement, Hollow House visits and all earned level rewards. The version-9 placement migration test now checks `STATE_VERSION` rather than an obsolete hard-coded 10. No level thresholds or previously granted rewards move.

## Review and verification

```sh
git fetch origin contractor/hollow-hayride
git worktree add ../pumpkin-hayride-review -b review/hollow-hayride origin/contractor/hollow-hayride
cd ../pumpkin-hayride-review
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-hayride.html
CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hayride.mjs /tmp/pumpkin-hayride.html /tmp/hayride-qa
```

Use a clean worktree and preserve unpublished lead changes. Review source against `d98db59`; do not reapply previous contractor deliveries on top of this branch. Downloads are published separately and their artifact branch must not be merged into source.

**Current validation:** all **59 Node test files pass**, including transactions, closure, quotes/wish money, capacity, large/small time steps, save corruption/repair, return continuity on expanded farms, finite voxel geometry, articulation and owner-ledger isolation. The offline HTML builds at roughly **28 MB**, keeping Claude's compressed art and music. The earlier browser run covers operational flows but predates the final off-map split. Final handover smoke status and exact scope are in [handover 37](37-off-map-hayride-takeover.md) and [verification](../contractor-patches/haunted-hayride/verification/README.md); do not infer a full final-browser replay from the earlier captures.
