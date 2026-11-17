# Blackroot Blight — village story and root-out rules

Blackroot adds a recurring environmental hazard to Mothlight's existing gathering loop. Purple fungal caps ooze red sap; the player roots out the whole patch, seals a sample and helps Elowen and Rowan investigate. It is a village mystery with useful rewards for the farmhouse and kitchen.

## Three playable chapters

Every current objective is on Hollow Green or at the farm. The chain is parallel to the existing village story: old chapters, gates, home milestones and claimed rewards remain valid.

| Chapter | Opens | Work | Reward |
| --- | --- | --- | --- |
| A Bruise Beneath the Green | Level 3, after The Moving Address | Root out 3 fresh patches; deliver 3 sealed samples to Elowen; ask Rowan about the roots | £60 bonus, friendship, toadstool lamp |
| Roots, Remedies and Supper | Level 5, after chapter 1 | Talk to Rowan; deliver 3 herbs and 4 fibre; root out 3 more patches; harvest 12 pumpkins at the farm; report to Elowen | Garden ghost skillet recipe, coffin planter, friendship |
| A Light the Roots Remember | Level 8, after chapter 2 | Root out 2 fresh patches; deliver 2 samples, 6 logs and 4 stone; harvest 18 pumpkins; report to Elowen | Apothecary spice cabinet for the house, moth lamp, £120 bonus, friendship |

The recipe is an existing kitchen recipe, with its normal equipment and ingredient requirements. Cursed spores are sealed research samples, never food or pantry ingredients. The cabinet is the existing detailed `gothic-spice-cabinet` furnishing. Unique rewards use the existing duplicate-compensation and once-only quest claim rules; no new repeated cash source is added.

The dialogue establishes that the fungus returns from buried roots and foreshadows its source in Moonroot Copse and Lantern Quarry. Four future sockets are authored for those districts. Existing district locks keep them unpickable, and no current objective asks the player to reach an unfinished area. Later expansions can continue the mystery without changing these completed chapters.

## Content and API contract

- `content/village-blight.js` holds the material, design-grid sockets and three quest definitions (`arc: "blight"`, chapters 1–3).
- `content/village.js` appends `cursed-spores` to `MATERIALS` and twelve sockets to `NODES`, including eight on the Green. Exported `BLIGHT_NODES` uses the same scaled world coordinates as every other resource.
- A fungus node carries `kind: "blight"`, `action: "Root out"`, `material: "cursed-spores"`, district and stable ID. Its rendering and picking use the ordinary resource lifecycle.
- `gatherNode(state, id)` clears a ready fungus patch through the existing rule. A successful result includes `cleared: true`, `overflow: false` and one sample. If the sample store is full, it still clears and returns `cleared: true, overflow: true, amount: 0`; no sample or currency is invented. Ordinary full resource stores still leave their nodes untouched.
- `blightClearCount(state, district)` sums the existing saved gather cycles for that district's fungus nodes. It is independent of sample inventory and deliveries.
- A quest step `{ kind: "root-out", district: "green", n: 3 }` snapshots that total into the existing numeric quest `base`. Only clears after the step begins count. Existing `stepProgress`, requirement rows, step text and hints expose its real progress. The requirement key is `blight:green`.
- `quest.reward.recipes` is granted through the existing recipe reward helper. The journal and dialogue presenters must show these recipe gifts along with the existing furnishing and friendship rewards.

There are eight Green patches for the chain's 3 + 3 + 2 clears, so progressing normally does not require waiting through a respawn. A patch regrows after 600 seconds on the existing village clock; the careful gathering kit retains its normal 15% timer reduction. Players who clear patches before accepting a fresh-clear objective can revisit a regrown patch later. Pause, tool/invitation, district and cooldown guards still apply.

## Saved games and placement

Save version stays **18**. No new persistent field is introduced: sample counts, node cooldowns, gather cycles, quest state, effects and claims already live in extensible saved maps/lists. Old version-18 saves initialise the new known IDs to zero; new saves round-trip them using the existing restore/save functions. No old quest is rewritten, reopened or made dependent on Blackroot.

Existing village furniture keeps its position if a new infection socket overlaps it. Save restore and decorating Undo ignore only the new fungus reservation for those old poses; all ordinary collision, building and road checks remain. A covered infection socket stays dormant and unpickable until that piece is moved, with no cooldown, cycle or reward consumed. New decorating still keeps clear of the reserved fungus sockets. This prevents an expansion from moving the player's furniture or spawning fungus through it.

## Dependency matrix

| Area | Coupling | Integration rule |
| --- | --- | --- |
| Content and rules | `village.js`, `village-quests.js`, `village-blight.js`, `rules/village.js` | Keep canonical node IDs, material ID and quest IDs stable; use `gatherNode` for the transaction |
| World and relocation | `village-models.js`, village node rendering, `village-node-sites.js` | Fixed fungus sockets skip ordinary relocation groups; clearing feedback follows readiness/cycle changes |
| Gameplay interaction | `village-game.js` | Root-out is a hand action; bypass only the fungus full-sample precheck, then use the rule result for feedback |
| Quest UI | `village-chapters.js`, tracker and guidance | Group `arc: "blight"`; route root-out steps to ready `cursed-spores` nodes; display recipe gifts and real fresh-clear counts |
| Saves and economy | Existing version-18 maps, recipe/decor grant helpers, bonus coin accounting | Preserve old quests/claims/placed decor; do not turn samples into saleable produce or repeat rewards |

## Verification

```sh
node --test --test-isolation=none test/village-blight.test.mjs test/village.test.mjs test/village-resource-cycles.test.mjs test/village-map.test.mjs
```

Focused tests cover actual root-outs and quest transactions, full-satchel clearing, fresh-clear baselines, pause/cooldown/district gates, all chapter rewards, once-only claims, level-earnings exclusions and version-18 save compatibility. World, interface, exact HTML and Android checks are recorded by the integration pass; this handover does not claim those checks on its own.
