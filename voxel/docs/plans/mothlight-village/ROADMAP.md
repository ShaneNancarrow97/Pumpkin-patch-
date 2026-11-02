# Mothlight Village — exploration, friendship and a living village

**Status: design roadmap only. No village gameplay is implemented by this document.** The current Mothlight full-game HTML applies the ledger visual treatment to the existing game. It does not contain the realm, residents, gathering nodes or quests described below.

Grounding: reviewed lead `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`, especially `rules/levels.js`, `rules/home-goals.js`, `rules/unlocks.js` and the cooking/attraction content. A future village save namespace needs its own reviewed migration; this plan does not change the current version-14 schema or depend on the unmerged Festival pack.

This is an original Halloween life-sim expansion inspired by the breadth of friendship, exploration and decorating in games such as Dreamlight Valley. It should develop Pumpkin Patch’s own characters, spooky identity and farm economy rather than reproduce another game’s characters, dialogue or stories. Names, costs, rates and targets below are proposed starting values for prototyping and simulation.

## 1. The expansion’s purpose

The farm pays for a life; the village gives that life somewhere to go. Pumpkin growing remains the dependable business, while exploring, cooking, restoring homes and helping residents become necessary routes to the new premium recipes, specialist farm equipment, attraction scenes, costumes and furnishing collections.

The repeatable loop is:

**Tend and sell on the farm → travel to Mothlight → gather and investigate → help a resident → build or improve their home/venue → earn a blueprint, recipe or collection piece → bring it home and use it → supply the next village occasion.**

Every major quest should end with something useful or visibly beautiful. A costume should be a complete, well-animated set; furniture should have correct placement and interaction points; a recipe should enter the real cooking/sales system. Avoid a long errand ending with only a small coin tip.

The new specialist branches require exploration. Existing earned levels and purchased upgrades do not. A returning player must not find their chef, house, maze or tractor locked again because a new resident has arrived.

## 2. A separate realm with an intelligible layout

Mothlight is reached from a new, clearly signed carriage gate adjoining an authored farm road. It must not replace Shane and Natalie’s central homestead arch, The Hollow House entrance, or an NPC exit. Locate its final footprint using the farm layout/navigation data before modelling it.

The first crossing opens at farm level 6 through a short invitation quest. The crossing is free: asking for village materials before the player can reach them would create a circular gate. Travel has a short fade and an arrival point outside the return trigger. Unlock fast travel after the introductory walk.

The completed realm should be roughly 120×96 world units, about ten times the current 40×29 farm footprint, delivered as authored districts rather than one dense scene. Start with a smaller populated Green; stream district art and pool foliage/lights so the larger realm is viable on an unfolded phone.

The village has five connected districts:

| District | Proposed gate | Purpose and landmarks |
| --- | --- | --- |
| **Hollow Green** | Level 6 | Arrival carriage, village noticeboard, first home plots, Rowan’s workshop and Elowen’s conservatory |
| **Moonroot Copse** | Level 9 + first village chapter | Twisting woodland, herbs, Mabel’s haberdashery and Tansy’s garden cottage |
| **Lantern Quarry** | Level 12 + repaired footbridge | Stone terraces, Opal’s studio, restaurant square and a quiet pond |
| **Carnival Moor** | Level 15 + restaurant opening | Corvus’s tent home, a small midway, performance spaces and Baron Brassbolt’s manor plot |
| **Mirror Marsh** | Level 18 + four district stories | Moth-lit reeds, late materials, an observatory ruin and the final festival setting |

Keep the carriage, noticeboard and main square connected by readable paths. Give each district a recognisable silhouette, lighting palette and soundscape. Exploration should reveal small shortcuts, story objects and collectible picture-book pages; it should not be a large empty field between resource icons.

Load only the active environment’s detailed graphics. Farm business and village state can advance through lightweight rules without rendering both worlds. A traveller keeps the same identity and purse across locations. Changing scenes must not create another paying guest or refill their money.

## 3. Progression across the current twenty levels

The current game already combines earnings with home milestones. Preserve those rules: level 5 asks for the Crooked cottage; level 10 for the Midnight manor; later levels require learned recipes, placed kitchen equipment, the attic, home cooking, books and furnished rooms. Cooking opens at 5, The Hollow House at 9, the Midnight Court at 10 and the hayride at 11. The expansion must respect those facts.

| Farm levels | Village progression | Farm/home connection |
| --- | --- | --- |
| **1–5** | A moving-ink invitation foreshadows the realm; no compulsory gathering | Establish pumpkins, house and cooking first |
| **6–8** | Enter Hollow Green, meet Elowen/Rowan, build two starter homes and complete the first shared chapter | Useful material storage, a first furnishing set and a new recipe |
| **9–11** | Open the Copse, meet Tansy/Mabel, begin a restaurant and character costume work | Garden ingredients, seasonal clothes and a specialist kitchen branch |
| **12–14** | Restore the quarry and restaurant square; meet Opal/Cinder | Blueprint choices support the existing six-recipe and equipped-kitchen home goals |
| **15–17** | Open the Moor; settle Corvus and the Baron; stage a village gathering | New attraction scenes, supplied automation and larger furnishing collections |
| **18–20** | Explore the Marsh; complete personal finales and the Mothlight Festival | New farm capstones, complete room aesthetics and paired signature costumes |

Village chapter badges gate **new** masterwork branches, not already shipped tiers. For example, Corvus’s final chapter may unlock a new hayride scene blueprint; it must not revoke the existing level-11 attraction or a bought second tractor. Old claimed levels and ownership remain honoured. Players already at level 20 can begin the village introduction immediately without repeating their earnings grind.

The best new farm builds should ask for several specialist relationships, but no single decorating preference should block basic play. Give a choice between equivalent approved furnishing pieces when a quest needs seating, light or a work surface.

The shared story is **The Unfinished Almanac**: a peculiar village ledger can record only occasions that its neighbours have genuinely shared. The final invitation remains blank until the player has restored places worth visiting. Its eight story beats are the moving address, the first two doorbells, the woodland supper, the repaired bridge, the stories beneath the floorboards, the empty carnival show, the invitations written together and the night the village makes for itself. The final festival needs every resident settled and their middle chapters understood; bond-10 personal finales remain valuable pursuits beyond that first celebration.

## 4. Eight residents, ten bond ranks and five personal chapters

Each resident has ten bond ranks and five authored chapters, opening at ranks **1, 3, 5, 7 and 10**. Intermediate ranks grant a small useful item, recipe variation, clothing separate or dialogue scene. Their friendship bar is not another cash currency.

Chapter completion supplies enough bond progress to reach the next content step when its farm/district gate is met. Shared activities and optional gifts help, but gifting hundreds of identical items is not the intended route. There are no real-calendar appointment windows required for story progress. The journal can arrange a quest meeting even when the resident’s ordinary schedule would put them elsewhere.

A resident should feel present between chapters: home routines, a few favourite places, optional meals, a short conversation and a companion outing. Schedules add life but cannot make a required character unavailable for a real-world day. Bond rewards should emphasise two signature costume sets, several individual clothing/accessory pieces and a coherent furniture collection, rather than ten disconnected trinkets.

### Elowen Mothwick — moth witch, archivist and bookbinder

Her home is a glass-roofed conservatory around a tiny library. Her story concerns an invitation written by her younger self that she cannot bring herself to finish.

1. **A Letter That Will Not Stay Still:** follow moth marks to three pages; earn the Mothlight journal and a lantern pattern.
2. **A Room for Quiet Wings:** build her home and arrange a reading corner using light, seating and books; earn a moth lamp and library shelving blueprint.
3. **The Constellation Between Pages:** align mirrors using moon/symbol clues; unlock a moonflower ingredient and its cultivation notes.
4. **The Page She Kept:** recover a picture-book memory and choose how to display it; earn a complete witchy study furniture collection.
5. **An Invitation Accepted:** host her at the farm and finish the conservatory’s star mechanism; earn paired Shane/Natalie mothlight costumes and an enchanted crop-care blueprint.

### Rowan Rattlewood — scarecrow carpenter

His crooked workshop cottage is full of beautiful unfinished repairs. He is good at helping everyone except himself.

1. **Loose Boards:** gather starter materials and repair a village bench; earn the material-store blueprint and four starter logs.
2. **A Door of His Own:** build the first workshop home; earn usable wall shelves and a timber garden gate.
3. **The Bridge With Too Many Pieces:** assemble a mechanism from visible measurements and shape clues; open the quarry route and earn a workshop table.
4. **Made to Last:** supply a shared restoration project while maintaining the farm; unlock specialist storage and delivery equipment.
5. **The Housewarming He Forgot:** decorate and host his workshop opening; earn a premium carpenter costume set, animated workshop décor and a new structural home-extension blueprint.

### Chef Cinder — ghost restaurateur

His candlelit restaurant includes an upstairs apartment. He wants to serve a supper worth remembering, but keeps trying to do every job himself.

1. **A Table for Nobody:** solve a simple flavour/ingredient problem; earn a starter supper recipe.
2. **Open at Last:** build a small restaurant, kitchen and reachable seating; earn a real cooking station and restaurant furniture.
3. **The Missing Course:** infer three dishes from guests’ descriptions; unlock a premium recipe family using discovered ingredients.
4. **Too Many Pans:** organise a supplied service and train an assistant; unlock an advanced batch-cooking/chef contract, without removing an existing farm chef.
5. **Supper After Midnight:** supply a village feast from the home kitchen; earn a complete restaurant set, signature chef costumes and a masterwork kitchen improvement.

### Mabel Moonstitch — haunted doll tailor

Her haberdashery cottage is also a tiny costume showroom. Her treasured carnival coat is a record of places she was too nervous to visit.

1. **A Loose Thread:** trace fabric marks through the Copse; earn a sewing basket and first clothing separate.
2. **Somewhere to Hang a Coat:** build her home and display rail; earn functional costume racks and a mirror.
3. **Pattern of a Promise:** assemble a pattern from symbol and seam clues; unlock premium accessories and fabric dye recipes.
4. **Dressed for the Midway:** gather opinions, make an outfit and attend a performance; earn a matching room aesthetic and wardrobe exterior finish.
5. **Every Stitch a Story:** restore the ceremonial coat; earn high-quality paired full costumes plus matching wheelchair colours/decals and plait-compatible headwear for Natalie.

### Ringmaster Corvus — raven showman

His home is a richly detailed carnival tent, with a private living wagon behind it. He has forgotten how to stage a show that is welcoming as well as frightening.

1. **A Silent Midway:** reactivate a small fairground mechanism; earn a lantern/banner collection.
2. **A Tent Worth Coming Home To:** build his tent and living area; earn carnival furnishings and a practical stage platform.
3. **The Mirror’s Favourite Lie:** solve a reversed-symbol puzzle with clear environmental clues; unlock a scare-actor blueprint.
4. **A Full House:** supply food, lights and a rehearsed show; earn a controlled group-visit invitation upgrade.
5. **The Last Bow:** stage his finale across the village and farm attraction; earn ringmaster costumes, a premium hayride/maze scene and an animated carnival room set.

### Opal Graves — vampire stonemason

Her quarry studio has elegant gothic windows and a garden of imperfect statues. She must finish a monument without erasing the marks that give it character.

1. **The Stone That Rang:** identify marked stones by a visible-and-audible sequence; earn a stoneworking bench.
2. **Light Through Old Windows:** restore her studio; earn stained-glass and wall-panel blueprints.
3. **Weight of a Name:** solve a counterweight puzzle; unlock moonstone processing and a house façade family.
4. **Beautifully Unfinished:** build a shared memorial garden using accepted material/decor tags; earn statues, paths and water features.
5. **A Window for the Moon:** complete the observatory restoration; earn a gothic master bedroom set and a new exterior/room-expansion branch.

### Tansy Thistledown — hedge gardener

Her overgrown cottage has an edible garden and a sheltered potting room. Her story turns a defensive tangle into a place people can visit.

1. **The Useful Weeds:** identify plants from shape and written clues; earn a herb planter and foraging journal entries.
2. **A Path Through the Brambles:** build her cottage and accessible garden route; earn garden utility furniture.
3. **What the Moths Remember:** investigate plant and moth relationships; unlock staple village ingredient cultivation at home.
4. **A Basket for Everyone:** make preserves and growing plans for residents; earn new sellable recipes and decorative plant collections.
5. **The Garden Party:** host the restored garden; earn hedge-witch costumes, premium garden structures and a specialist ingredient-production improvement.

### Baron Brassbolt — wealthy monster and collector

Use the existing wealthy-monster identity as the basis for a consistent resident, rather than adding an unrelated rich sprite. His velvet manor is filled with impressive objects and almost no personal memories.

1. **An Expensive Mistake:** discover a forged antique through clues; earn a display cabinet and a story-bearing object.
2. **Rooms Worth Living In:** rebuild his manor and create a useful room, not merely an expensive one; earn a luxury furniture starter set.
3. **The Catalogue of Impossible Things:** compare records, objects and resident testimony; unlock limited specialist commissions.
4. **A Guest, Not a Customer:** host him without an expensive shopping objective; earn paired formal Halloween clothing and meaningful dialogue.
5. **Something Money Cannot Buy:** finish a collaborative exhibition; earn a premium manor collection and a bounded VIP invitation/commission capstone.

## 5. Gathering, spawn rates and material sinks

Use authored, clearly reachable node sockets rather than random objects appearing through furniture. Fallen timber and renewable branches preserve the forest’s appearance. Nodes should have distinct silhouettes, a short gathering animation and a readable tool prompt. The first unlocked set is prefilled.

The following timers use **active game seconds**. A timer may advance while the farm is being played offscreen, but generates at most one live pile per node. No accumulated offline piles or reload rerolls are allowed. All gathering and business systems share one simulation clock; paused or hidden simulation cannot be ticked twice by separate scene loops.

| Resource | District/level | Nodes × yield | Respawn/node | Maximum ground units |
| --- | --- | ---: | ---: | ---: |
| Softwood logs | Green / 6 | 8 × 2 | 180 sec | 16 |
| Stone | Green / 6 | 6 × 2 | 240 sec | 12 |
| Fibre | Green / 6 | 6 × 1 | 180 sec | 6 |
| Herbs | Green / 6 | 4 × 1 | 180 sec | 4 |
| Hardwood | Copse / 9 | 4 × 2 | 480 sec | 8 |
| Moth silk | Copse / 9 | 2 × 1 | 300 sec | 2 |
| Iron | Quarry / 12 | 3 × 1 | 360 sec | 3 |
| Clay | Quarry / 12 | 3 × 2 | 300 sec | 6 |
| Moonstone | Moor / 15 | 2 × 1 | 600 sec | 2 |
| Emberbloom | Moor / 15 | 3 × 1 | 420 sec | 3 |
| Star amber | Marsh / 18 | 1 × 1 | 900 sec | 1 |

This is 42 small node sockets across the completed realm. Node counts, yields and timers require playtesting; the table is not a measured demand model. A full inventory must leave the node and its cooldown untouched. Required quest keys are deterministic and recoverable. Star amber is for optional cosmetic projects, never a main-story key with a random drop chance.

The first home costs **20 logs, 12 stone and 4 fibre**. Rowan’s once-only starter gift supplies four logs, so the prefilled 16-log ground cap covers the remaining wood without a forced wait. A later large home may cost **32 hardwood, 32 stone, 6 iron and 2 moonstone** as a multi-session restoration project. Do not disguise that as an eight-minute errand or demand 120 hardwood in a quick quest.

Materials use a shared material store, separate from pumpkin capacity and the kitchen pantry. Quest objects have protected storage. Later storage furniture and deliveries provide convenience. Cultivation and limited trade should eventually reduce repetitive foraging for staple ingredients; discovery still matters.

## 6. Homes, public venues and decorating

Each resident gets an authored plot with room for a garden and a valid doorway. Preview footprint, orientation, material cost and the first furnished room before confirmation. Reserve the main roads, gathering sockets and accessible approaches. Store or reposition invalid decor during an upgrade with a clear receipt; never silently delete it.

Homes progress from a modest interior to personalised additional rooms. The restaurant and carnival have public operations as well as private living quarters. Decorating uses the game’s universal placement rules: consistent voxel scale, wall anchors, rotated footprints, shelves with correctly oriented books and reachable interaction points.

Use functional categories for quest checks—seating, light, table, cooking, books—rather than forcing one exact costly catalogue purchase. Accept already-owned suitable pieces. Add original booktok/witchy study, restaurant, carnival, woodland and gothic manor collections in manageable groups. A crafted oven, costume rack, workbench, material chest or garden structure should be usable, not only a texture.

## 7. Economy and why the player returns

Keep coins as the single cash currency. Materials are consumed objects; bond XP and village badges are progress, not extra wallets. Quest coin gifts must use the existing `progression.bonusEarned` treatment so they do not count as ordinary level earnings. Existing level and ownership migration remains honoured.

Construction materials initially serve building/crafting rather than a high-price bulk-resale business. Any later material trader needs its own throughput/income simulation. Wild ingredients use the existing pantry and finite food demand; travelling must not duplicate them into a second pantry.

The village supplies unique utility and variety, not a flat multiplier that makes pumpkins obsolete. Recipes should serve new tastes, commissions and efficient production. Farm businesses supply restaurant occasions and carnival events. Public venues consume real supplies; a delivery, retail sale and owner commission cannot each credit the same item as another full sale.

Guest budgets remain finite. Travel does not reset them. Keep visitor/customer identity namespaces and stable visit IDs. Tip, ticket, food, commission and quest-gift statistics remain distinct. New footfall bonuses must join one capped calculation with existing rushes, VIPs, appeal and harvest streaks; do not multiply every bonus indefinitely.

Aim for ordinary character quests to take roughly 8–15 minutes of varied activity, and finales 20–30 minutes. Long home restorations are visible projects spread across sessions. No single short quest should demand more than two normal gathering routes. This is a target to simulate and test, not a reason to add waiting screens.

## 8. Cinematics, dialogue and puzzle accessibility

The journal follows the game's purple-parchment ledger direction: clear cream functional text, restrained sparkling edges, decorative moths and short handwritten marginal notes. Track one main goal and at most two optional goals; offer a resident map, next-step shortcut and recipe/material provenance instead of large permanent quest boxes. Gathering has no mandatory stamina-refill wait or paid energy shortcut.

Residents and owners need consistent sprite anchors, scale, alternating walking legs, readable facing and visible action tools. Sitting and serving poses must fit real furniture; Natalie’s wheelchair must have valid approaches to every required activity. Avoid jumping or narrow-path precision as mandatory quest gates.

Routine scenes should last 10–35 seconds; major openings may reach 60. Use controlled cameras, short sprite gestures, portrait dialogue, subtitles and an explicit next-line prompt. Business patience/needs timers should pause during a story cinematic, so reading dialogue does not quietly punish the farm. The director uses its own presentation clock, then restores the exact character, camera and input mode. A skipped scene reaches the same quest checkpoint.

First press completes typewriter text; the next advances. Provide skip, instant text and journal replay. Reduced motion uses steady framing rather than forced camera sweeps.

Example: at Elowen’s mirror table, moon symbols on three damaged pages explain which beams belong together. The player rotates three mirrors, observes moths gathering at the correct lantern, then selects a final constellation. A close shot shows a moth landing on the restored page; Elowen says, “I thought keeping it unfinished would keep it safe.” The reward is shown only after the actual quest transaction completes.

Puzzles need progressive hints, reset and equivalent symbol/text cues for colours or sounds. A companion-assisted solution should preserve the normal reward. Decoration puzzles must explain which useful tags are missing. No external research, precise reaction-time challenge or real-calendar appointment is required for a main chapter.

## 9. Save and reward contracts

Village state needs a versioned namespace: district flags, node remaining timers, construction jobs, resident bonds/chapters, quest evidence, scene checkpoints, claimed reward keys and venue supplies. Preserve unknown future data rather than replacing it with an empty village. Persist origin bindings on in-flight deliveries and visits explicitly.

A quest reward uses a stable claim key. Commit step completion, material consumption, coins and ownership together, or recover idempotently from that key. A skipped cinematic, reload during a reveal, full inventory, duplicate callback or scene transition must not lose or duplicate a recipe, costume or item. Presentation completion is not proof of gameplay completion. Gift/contract repeat limits use saved IDs and active time, not a fresh random roll on every load.

## 10. Dependency matrix and delivery phases

| System | Main dependency/risk | Required evidence before adoption |
| --- | --- | --- |
| Realm travel | Scene lifecycle, navigation, current character/camera and private home gate | Both-way arrivals, saved location, no recursive transitions or blocked exits |
| Gathering | Deterministic sockets, placement footprints, shared clock and material capacity | Caps/timers through pause, travel, reload and full inventory |
| Quests/bonds | Real action receipts and stable resident/step IDs | No inferred completion from disappearing NPCs; repeat/skip/recovery tests |
| Construction | Material reservations, coins, footprints and doors | Atomic purchase, cancellation policy, upgrade collision and no silent loss |
| Cooking/venues | Actual ingredients, equipment, stock, wallets and income ledger | Conservation across delivery/restaurant/farm and no double payment |
| Rewards | Wardrobe, decor/recipe registries, grants and save migration | Valid art/bounds, once-only ownership, duplicates and old-save compatibility |
| Cinematics | Input ownership, text/pad prompts, camera restoration | Skip/replay/pause, accessible mode and exact return to player control |
| UI/performance | Ledger menus, 44px controls, pooled voxel assets and sprite anchors | Phone/fold/landscape screenshots, no obstructive quest boxes or load spikes |

**Phase 1: vertical slice.** Hollow Green, Elowen/Rowan, two homes, initial gathering/crafting, eight quests, one environmental puzzle and one cinematic. Prove the complete farm → realm → reward → useful farm action loop.

**Phase 2: domestic life and services.** Add Tansy/Mabel, the Copse, costume crafting, ingredient cultivation and restaurant foundations. Extend the house collections and physical furniture interactions.

**Phase 3: public village.** Add Opal/Cinder, quarry restoration, supplied restaurant service and larger home projects. Test the economy and all twenty levels together.

**Phase 4: attractions and society.** Add Corvus/Baron, carnival/manor construction, performances and bounded attraction/VIP benefits.

**Phase 5: finales.** Mirror Marsh, resident finales and a shared Mothlight Festival that uses farm produce, home cooking, the decorated village and both attractions. Follow with art, save, controller and pacing refinement before declaring the expansion complete.

High-level inspiration references: [Friendship](https://dreamlightvalleywiki.com/Friendship), [Quests](https://dreamlightvalleywiki.com/Quests) and [Foraging](https://dreamlightvalleywiki.com/Foraging). Use those as examples of connected life-sim systems; Mothlight’s content, names, puzzle solutions, dialogue and economy remain original.
