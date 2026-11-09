# Mothlight: The Village That Remembered — Claude handover

Contractor branch: `contractor/mothlight-full-expansion`. Review base: `8048fd32e5dbdf33b81d38c78c07b05ecef5be7f`, the completed Village Interaction Fixes delivery. Claude’s `voxel-reference` was checked read-only at `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`. This contractor checkout is isolated; no files in Claude’s working checkout were changed. Merge or replay deliberately alongside concurrent lead work.

## What the player can do

The village now has a 20-level restoration story across Hollow Green, Moonroot Copse, Lantern Quarry, Carnival Moor and Mirror Marsh, ending in Lantern Night. The Crooked Acre adds a scarecrow labyrinth surrounding Granny Brambletooth’s crooked house. The surface expands west with connected ground and authored paths. Nine residents have friendship; 41 optional personal chapters supplement 23 main/restoration chapters. Existing invitation, Two Doorbells and all old quest IDs remain intact.

Three separately rendered cave depths descend beneath the village: Lantern Steps, Drowned Workings and Root Cathedral. Each contains twelve renewable mineral seams. Amethyst, garnet and opal use saved deterministic rolls and a tenth-seam rare guarantee. Guaranteed story samples are protected from sale. Mining has a timed tool action, material audio, full-storage checks and cancellable input; it requires no combat, fuel or mandatory timer. Deeper portals, stairs and return landings share rule and world coordinates.

Activities are performed at their objects. The journal follows and explains a step rather than granting remote completion. Puzzles include remembered sequences, connected light conduits, unordered flavour deduction and assigned stage cues. Hint, Reset and accessible Solve give the same story rewards. The finale delivers twelve real pumpkins and four cooked portions. Completed chapters show a reward receipt, and restoration flags change cached visible village landmarks. Optional neighbour chapters stay behind a disclosure instead of filling the main story list.

The village earns a place in farm progression. Every level from6 through20 now has a mainline village checkpoint alongside the original home requirements; see MAINLINE-LEVEL-GATES.md for the complete schedule. Previously claimed levels remain honoured and blocked income remains banked. Farm-away earnings still run at the existing 2.5% to 10% upgrade rate; exploration, mineral regrowth and village actions use full village time. No new free income multiplier bypasses this tradeoff.

## Rewards with a use back home

- Two real garden herb-planters; explicit herb preparation; preservation wax made at an actual cooker; paid cold storage. Wax extends one existing harvest batch by 10%, cold storage by 20%, capped at 30%; spoiled stock cannot be revived.
- Cinder’s Lantern Stew and Granny’s Bramble Pudding are normal researched, ingredient-consuming, cookable and sellable dishes, with painted menu art and corresponding voxel food props. Commissions consume actual unreserved food and settle once.
- The Baron’s invitation replaces a normal party with a bounded, finite-wallet reservation. Corvus grants an existing authored scarecrow ride effect. Granny grants a new cottage/scarecrow ride vignette in which she steps out to greet the wagon.
- Six fine voxel house keepsakes: Mabel’s pattern table, amethyst lantern, stained glass, Granny’s patchwork rocker, Cinder’s serving board and a gently glowing Lantern Night diorama. They have measured footprints, baked catalogue thumbnails, story purchase gates and real home interactions where relevant.
- Mabel unlocks three paired outfit presets. Each saves and equips Shane and Natalie atomically, preserves Natalie’s wheelchair and accepts only owned costumes. Costume rewards use the existing approved costume catalogue; this delivery does not claim newly painted costume sheets.
- One companion can accompany the player after bond three. Gathering help is bounded and uses stable node/cycle receipts; selecting a companion is not an unbounded resource multiplier.

## Completed review parts

| Part | Handover | Main integration points |
| --- | --- | --- |
| Story, migration, rules and gates | [CORE.md](CORE.md) | `model`, legacy village, access helper, home requirements |
| Residents, personal stories, companions | [CAST-COMPANIONS.md](CAST-COMPANIONS.md) | content, core reward authority, world following, input |
| Farm trade, storage and cooking | [ECONOMY.md](ECONOMY.md) | stock age ledger, kitchen jobs, visitor wallets, farm clock |
| Granny and menu art | [ART.md](ART.md) | sprite loader, direction selector, food art, icon installer |
| Voice request inventory | [VOICE-INVENTORY.md](VOICE-INVENTORY.md) | Existing recordings preserved; new text explicitly pending |
| Surface, cave and interiors | [WORLD.md](WORLD.md) | view, terrain, collision, portals, fixed restoration groups |
| Journal, activities and controller | [RUNTIME.md](RUNTIME.md) | village game, expansion pages/CSS, input and scene lifecycle |
| Home keepsakes and ride | This README and tests | furnishing recipes/measurements/atlas, wardrobe, hayride actors |
| Release and evidence | [DELIVERY.md](DELIVERY.md) | exact source, test results, verified downloadable builds |

## Dependency matrix

| If changing… | Also check… | Invariant |
| --- | --- | --- |
| Chapter ID, giver, stage or area | save sanitiser, journal, map, next activity, NPC rewards, all-story tests | Old IDs and once-only receipts remain valid. |
| Region gate or level requirement | navigation, cave return portals, physical route tests, level screen | No level requires a chapter whose area requires that same level. Claimed levels never regress. |
| Activity coordinates | terrain, collision, object render, hit targets, guide, distance guards | World units are scaled once. Canvas and pad interactions must recheck actual proximity. |
| Core imports | access helper and navigation-first import test | Navigation and home requirements use dependency-light access, avoiding module-initialisation cycles. |
| New dish or preservation | ingredient supply, equipment, research, actual cooker, chef, food props, pricing, expiry | No remote cook button or free stock; farm-time attenuation is applied exactly once. |
| Mineral or gathering bonus | node cycle, saved seed/pity, capacity, event quantities, companion receipt | Reload cannot reroll; full storage cannot spend a vein or duplicate a bonus. |
| Home item catalogue | measured bounds, copies, unlock gate, placement, interaction, baked atlas and manifest | Rebuild the entire atlas when adding catalogue IDs; index order must match thumbnails. |
| Costume presets | ownership, actor refresh, wheelchair, restore | Validate both people before changing either outfit. |
| Ride effect | owned/active restore, scenery actor, proximity, disposal, appeal | Reward cannot charge twice or reactivate a scene the player switched off. |
| Village runtime/input | menus, conversation camera, gathering cancellation, cave Back, held inputs | Opening or closing a panel cannot execute another action or freeze fresh movement. |
| UI CSS or art | `build.mjs`, lazy sprite imports, Fold portrait/landscape, TV focus | All assets inline offline; 44px targets, 12px minimum copy and safe areas. |
| Native shell | HTML hash, extraction manifest, signing identity, version | Package the same checked HTML only after the game downloads are published. |

## Save and integration notes

Save format is **19**. Version 18 migrates additively into `village.expansion`. Restore expansion/economy before settling stock expiry, so purchased storage remains effective on load. Keep fresh-production baselines: earlier cooking cannot complete a new instruction. Granting rewards belongs in rules, never in presentation. New modules are plain JavaScript and use the existing Three.js/Voxels renderer and shared audio; there is no dependency or framework migration.

Seven additional resident interiors are scene-built and use saved home restoration gates. The surface and caves switch through the expansion view API rather than overloading the old hall state. Close/return must cancel gathering and restore the correct previous landing before the farm confirmation appears.

The first practical review path is a declared level-six farm with the legacy Two Doorbells complete: Mabel’s banner → Tansy’s marks → pattern → cave entrance → miners’ marks → protected crystal → ringing stones. Copse restoration then asks for level seven and returns useful home/garden rewards. The complete campaign still interleaves ordinary farm earning and home requirements. Rule fixtures proving reachability are not measurements of campaign duration.

## Review standard and limits

This is a full contractor implementation of the proposed story and mechanics, with authored voxel environments and generated sprite/icon assets. New dialogue uses clear text and existing voice fallbacks; no new narration recording is claimed. Browser viewport and injected standard-gamepad checks are distinct from physical Fold 7, Bluetooth controller, TV and Android hardware testing. Exact completed checks, screenshots, replay instructions and any remaining limitations are recorded in DELIVERY.md rather than inferred from test counts.

The checked [Android addendum](NATIVE.md) packages the same HTML after game publication; [DELIVERY.md](DELIVERY.md) holds the public download receipts.

Latest progression update: [mainline level checkpoints](MAINLINE-LEVEL-GATES.md).
